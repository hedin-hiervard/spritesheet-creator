// @flow

import fs from 'fs-extra'
import Mustache from 'mustache'
import Jimp from 'jimp'
import glob from 'glob-promise'
import path from 'path'

import { pack } from 'packing/packing'
import sorter from 'sorter/sorter'

import type { File, Files, Options } from 'types'
import type { Logger } from 'Logger'

const DefaultOptions = {
    trim: true,
    padding: 1,
    divisibleByTwo: true,
    square: false,
    sortMethod: 'width',
    packAlgorithm: 'growing-binpacking',
    powerOfTwo: true,
}

export default class SpritesheetGenerator {
    log: Logger;
    exportFormat: string;
    inputFolder: string;
    outputTexturePath: string;
    outputDataPath: string;
    files: Files;
    options: Options;
    totalPixels: number;
    totalBytes: number;
    texture: *;

    constructor({
        log,
        exportFormat,
        inputFolder,
        outputTexturePath,
        outputDataPath,
        options,
    }: {
        log: Logger,
        exportFormat: string,
        inputFolder: string,
        outputTexturePath: string,
        outputDataPath: string,
        options?: Options,
    }) {
        this.log = log
        this.exportFormat = exportFormat
        this.inputFolder = inputFolder
        this.outputTexturePath = outputTexturePath
        this.outputDataPath = outputDataPath
        this.options = options || {}

        for(const key in DefaultOptions) {
            if(this.options[key] === undefined) {
                this.options[key] = DefaultOptions[key]
            }
        }
        this.log.info(this.options)
    }

    async getFileList() {
        this.log.info(`getting file list from ${this.inputFolder}`)
        this.files = (await glob(`${this.inputFolder}/**/*.png`))
            .map(name => ({ name }))
        this.log.info(`got ${this.files.length} files`)
    }

    async readImages() {
        this.log.info(`reading files into memory`)
        this.totalPixels = 0
        this.totalBytes = 0
        await Promise.all(this.files.map(file =>
            Jimp.read(file.name)
                .then(image => {
                    file.image = image
                    this.totalBytes += image.bitmap.data.length
                    this.totalPixels += image.bitmap.width * image.bitmap.height
                })
        )
        )
        this.log.info(`${this.totalBytes} bytes read`)
        this.log.info(`${this.totalPixels} pixels read`)
    }

    async generate() {
        await this.getFileList()
        await this.readImages()
        if(this.options.trim) {
            this.trimImages()
        }
        this.identify()
        this.sort()
        this.pack()
        this.determineCanvasSize()
        await this.generateTexture()

        this.log.info(`saving texture to ${this.outputTexturePath}`)
        await this.texture.write(this.outputTexturePath)
        await this.generateTextureData()
    }

    trimImages() {
        this.log.info(`trimming images`)
        let newPixels = 0
        let newBytes = 0
        for(const file of this.files) {
            const image = file.image
            if(!image) continue
            image.autocrop({
                cropOnlyFrames: false,
                tolerance: 0,
            })
            newPixels += image.bitmap.width * image.bitmap.height
            newBytes += image.bitmap.data.length
        }
        const percentPx = 100 - newPixels / this.totalPixels * 100
        const percentBt = 100 - newBytes / this.totalBytes * 100
        this.log.info(`${newPixels} pixels after trim (${percentPx.toFixed(2)}% trimmed)`)
        this.log.info(`${newBytes} bytes after trim (${percentBt.toFixed(2)}% trimmed)`)
        this.totalBytes = newBytes
        this.totalPixels = newPixels
    }

    identify() {
        this.log.info(`identifying files`)
        const padding = this.options.padding ? this.options.padding : 0
        for(const file of this.files) {
            const image = file.image
            if(!image) continue
            file.width = image.bitmap.width + padding * 2
            file.height = image.bitmap.height + padding * 2

            // let forceTrimmed = false
            if (this.options.divisibleByTwo) {
                if (file.width & 1) {
                    file.width += 1
                    // forceTrimmed = true
                }
                if (file.height & 1) {
                    file.height += 1
                    // forceTrimmed = true
                }
            }

            file.area = file.width * file.height
            file.trimmed = false
            file.margin = {
                x: 0,
                y: 0,
                width: 0,
                height: 0,
            }
            // if (this.options.trim) {
            //     file.trim = {
            //         file.x = parseInt(rect[3], 10) - 1
            //         file.y = parseInt(rect[4], 10) - 1
            //         file.width = parseInt(rect[1], 10) - 2
            //         file.height = parseInt(rect[2], 10) - 2

            //     file.trimmed = forceTrimmed || (file.trim.width !== file.width - options.padding * 2 || file.trim.height !== file.height - options.padding * 2)
            // }
        }
    }

    roundToPowerOfTwo(value: number): number {
        let powers = 2
        while (value > powers) {
            powers *= 2
        }
        return powers
    }

    sort() {
        const sortMethod = this.options.sortMethod
        if(!sortMethod) {
            throw new Error(`failed to sort`)
        }
        this.log.info(`sorting files using '${sortMethod}' method`)
        sorter(sortMethod, this.files)
    }

    pack() {
        const algorithm = this.options.packAlgorithm
        if(!algorithm) {
            throw new Error(`failed to pack`)
        }
        this.log.info(`packing using '${algorithm}' algorithm`)
        pack({
            algorithm,
            files: this.files,
            options: this.options,
        })
    }

    determineCanvasSize() {
        this.log.info(`detemining minimum canvas size`)
        let { width, height } = this.options
        if(!width || !height) {
            throw new Error(`couldn't detemine the minimum canvas size`)
        }
        this.log.info(`minimum canvas size required: ${width}x${height}`)

        if (this.options.square) {
            width = height = Math.max(width, height)
            this.log.info(`square texture required: ${width}x${height}`)
        }

        if (this.options.powerOfTwo) {
            width = this.roundToPowerOfTwo(width)
            height = this.roundToPowerOfTwo(height)
            this.log.info(`power of two required: ${width}x${height}`)
        }

        if(this.options.maxTextureSize) {
            if(
                width > this.options.maxTextureSize ||
                height > this.options.maxTextureSize
            ) {
                throw new Error(`texture size too large (> ${this.options.maxTextureSize})`)
            }
        }
        this.log.info(`determined final texture size: ${width}x${height}`)
        this.options = {
            ...this.options,
            width,
            height,
        }
    }

    async generateTexture() {
        this.log.info(`generating texture file`)
        this.texture = await new Promise((resolve, reject) => {
            new Jimp(this.options.width, this.options.height, (err, image) => {
                if(err) { reject(err); return }
                resolve(image)
            })
        })
        for(const file of this.files) {
            this.texture.composite(file.image, file.x, file.y)
        }
        this.log.info(`${this.texture.bitmap.data.length} bytes`)
    }

    async generateGodot3TextureData(projectRoot: string) {
        if(!fs.existsSync(this.outputDataPath)) {
            fs.mkdirpSync(this.outputDataPath)
        }
        const stat = fs.statSync(this.outputDataPath)
        if(!stat || !stat.isDirectory()) {
            throw new Error(`output data path must be directory`)
        }
        const template = fs.readFileSync('templates/godot3.template', 'utf-8')
        const godotTexturePath = `res://${path.relative(projectRoot, this.outputTexturePath)}`
        let wroteFiles = 0
        for(const file of this.files) {
            const parsed = path.parse(file.name)
            const tresContent = Mustache.render(template, {
                godotTexturePath,
                ...file,
            })
            fs.writeFileSync(path.join(this.outputDataPath, parsed.base) + '.tres', tresContent)
            wroteFiles++
        }
        this.log.info(`wrote ${wroteFiles} files`)
    }

    async generateTextureData() {
        this.log.info(`will try to save texture data to '${this.outputDataPath}' with '${this.exportFormat}' export format`)
        if(this.exportFormat === 'godot3') {
            if(!this.options.projectRoot) {
                throw new Error(`you must specify project root`)
            }
            await this.generateGodot3TextureData(this.options.projectRoot)
        } else {
            throw new Error(`unsupport texture export format: ${this.exportFormat}`)
        }
    }
}
