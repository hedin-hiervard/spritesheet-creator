// @flow

import Jimp from 'jimp'
import glob from 'glob-promise'
import _ from 'lodash'
import path from 'path'

import packer from 'packer'
import sorter from 'sorter'
import smartCrop from 'smart_crop'

import type { Files, Options } from 'types'
import type { Logger } from 'ual'

export type InputPatterns = Array<string>;

const DefaultOptions = {
    trim: true,
    padding: 1,
    divisibleByTwo: true,
    square: false,
    sortMethod: 'width',
    packAlgorithm: 'growing-binpacking',
    powerOfTwo: true,
}

type Stats = {
    totalPixels: number;
    totalBytes: number;
};

export default class SpritesheetGenerator {
    log: Logger;
    exportFormat: string;
    inputPatterns: InputPatterns;
    outputTexturePath: string;
    outputDataPath: string;
    files: Files;
    options: Options;
    texture: *;
    stats: Stats;

    constructor({
        log,
        exportFormat,
        inputPatterns,
        outputTexturePath,
        outputDataPath,
        options,
    }: {
        log: Logger,
        exportFormat: string,
        inputPatterns: InputPatterns,
        outputTexturePath: string,
        outputDataPath: string,
        options?: Options,
    }) {
        this.log = log
        this.exportFormat = exportFormat
        this.inputPatterns = inputPatterns
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

    async generate() {
        await this.getFileList()
        if(this.files.length === 0) {
            this.log.warn('no files were found, finishing')
            return
        }
        await this.readImages()
        this.printStats()
        if(this.options.trim) {
            this.trimImages()
            this.printStats()
        }
        this.pad()
        this.pack()
        this.determineCanvasSize()
        this.calcRealPositions()
        await Promise.all([
            this.generateTexture()
                .then(() => this.saveTexture()),
            this.generateTextureData(),
        ])
    }

    formatPercentChange(oldValue: number, newValue: number): string {
        const percentChange = newValue / oldValue * 100 - 100
        return `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(2)}%`
    }

    printStats() {
        let stats = {
            totalBytes: 0,
            totalPixels: 0,
        }
        for(const file of this.files) {
            const image = file.image
            if(!image) continue
            stats.totalBytes += image.bitmap.data.length
            stats.totalPixels += image.bitmap.width * image.bitmap.height
        }
        let btChangeString = ''
        let pxChangeString = ''
        if(this.stats) {
            btChangeString = ` (${this.formatPercentChange(this.stats.totalBytes, stats.totalBytes)})`
            pxChangeString = ` (${this.formatPercentChange(this.stats.totalPixels, stats.totalPixels)})`
        }
        this.log.info(`${stats.totalBytes} total bytes${btChangeString}`)
        this.log.info(`${stats.totalPixels} total pixels${pxChangeString}`)
        this.stats = stats
    }

    async saveTexture() {
        this.log.info(`saving texture to ${this.outputTexturePath}`)
        await this.texture.write(this.outputTexturePath)
        this.log.info(`done saving texture`)
    }

    async getFileList() {
        this.log.info(`getting file list from ${this.inputPatterns.join(',')}`)

        this.files = _.flatten(await Promise.all(
            this.inputPatterns.map(pattern =>
                glob(pattern)
                    .then(files => files.map(name => ({
                        pattern,
                        name,
                        padding: {
                            left: 0,
                            right: 0,
                            up: 0,
                            down: 0,
                        },
                        margin: {
                            left: 0,
                            right: 0,
                            up: 0,
                            down: 0,
                        },
                        padded: {
                            x: 0,
                            y: 0,
                            width: 0,
                            height: 0,
                            area: 0,
                        },
                        real: {
                            x: 0,
                            y: 0,
                            width: 0,
                            height: 0,
                            area: 0,
                        },
                    }))))
        ))
        this.log.info(`got ${this.files.length} files`)
    }

    async readImages() {
        this.log.info(`reading files into memory`)
        await Promise.all(this.files.map(file =>
            Jimp.read(file.name)
                .then(image => {
                    file.image = image
                    file.real = {
                        width: image.bitmap.width,
                        height: image.bitmap.height,
                        x: 0,
                        y: 0,
                        area: image.bitmap.width * image.bitmap.height,
                    }
                })
                .catch(err => {
                    throw new Error(`couldn't read ${file.name}: ${err}`)
                })
        )
        )
    }

    trimImages() {
        this.log.info(`trimming images`)
        for(const file of this.files) {
            const image = file.image
            if(!image) continue
            const { cropped: margin } = smartCrop({
                image,
            })
            file.real.width = image.bitmap.width
            file.real.height = image.bitmap.height
            file.margin = margin
        }
    }

    pad() {
        this.log.info(`padding files`)
        const padding = this.options.padding ? this.options.padding : 0
        for(const file of this.files) {
            const image = file.image
            if(!image) continue

            file.padding = {
                up: padding,
                right: padding,
                down: padding,
                left: padding,
            }

            file.padded.width = file.real.width + padding * 2
            file.padded.height = file.real.height + padding * 2

            if (this.options.divisibleByTwo) {
                if (file.padded.width & 1) {
                    file.padded.width += 1
                    file.padding.left++
                }
                if (file.padded.height & 1) {
                    file.padded.height += 1
                    file.padding.up++
                }
            }
            file.padded.area = file.padded.width * file.padded.height
        }
    }

    roundToPowerOfTwo(value: number): number {
        let powers = 2
        while (value > powers) {
            powers *= 2
        }
        return powers
    }

    pack() {
        const sortMethod = this.options.sortMethod
        if(!sortMethod) {
            throw new Error(`sorting algorithm not found`)
        }

        this.log.info(`sorting files using '${sortMethod}' method`)
        sorter(sortMethod, this.files)

        const algorithm = this.options.packAlgorithm
        if(!algorithm) {
            throw new Error(`packing algorithm not found`)
        }
        this.log.info(`packing using '${algorithm}' algorithm`)
        packer({
            algorithm,
            files: this.files,
            options: this.options,
        })
    }

    calcRealPositions() {
        for(const file of this.files) {
            file.real.x = file.padded.x + file.padding.left
            file.real.y = file.padded.y + file.padding.up
        }
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
        this.log.info(`generating texture`)
        this.texture = await new Promise((resolve, reject) => {
            new Jimp(this.options.width, this.options.height, (err, image) => { // eslint-disable-line no-new
                if(err) { reject(err); return }
                resolve(image)
            })
        })
        for(const file of this.files) {
            this.texture.composite(file.image, file.real.x, file.real.y)
        }
        this.log.info(`generated texture of ${this.texture.bitmap.data.length} bytes`)
    }

    async generateTextureData() {
        this.log.info(`save data to '${this.outputDataPath}' with '${this.exportFormat}' export format`)
        this.log.info(`loading export plugin`)
        let exportPlugin
        try {
            // $FlowFixMe
            exportPlugin = require(path.join(__dirname, `data_output_plugins/${this.exportFormat}.js`)).default
        } catch(err) {
            throw new Error(`unsupport texture export format: ${this.exportFormat}`)
        }
        await exportPlugin({
            projectRoot: this.options.projectRoot,
            files: this.files,
            outputDataPath: this.outputDataPath,
            outputTexturePath: this.outputTexturePath,
            log: this.log,
        })
    }
}
