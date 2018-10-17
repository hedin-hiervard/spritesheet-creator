// @flow
import fs from 'fs-extra'
import path from 'path'
import Mustache from 'mustache'

import type { Files } from 'types'
import type { Logger } from 'Logger'
import type { InputPatterns } from 'SpriteSheetGenerator'

function buildGodotResourcePath(projectRoot: string, relativePath: string) {
    const split = relativePath.split(path.sep)
    if(split[0].match(/^\./)) {
        throw new Error('texture output path is outside project dir')
    }
    return `res://${split.join('/')}`
}

function smartCreateTResName(pattern: string, filename: string): {
    relPath: string,
    base: string,
} {
    const parsed = path.parse(filename)
    // find the non-wildcarded part of the pattern
    const patternPrefix = pattern.split('*')[0]
    const relPath = path.relative(patternPrefix, parsed.dir)
    return {
        relPath,
        base: parsed.name,
    }
}

export default async function generateGodot3TextureData({
    projectRoot,
    files,
    outputDataPath,
    outputTexturePath,
    log,
}: {
    projectRoot: string,
    files: Files,
    outputDataPath: string,
    outputTexturePath: string,
    log: Logger,
}) {
    log.info(`exporting godot3 data files to ${outputDataPath}`)
    if(!fs.existsSync(outputDataPath)) {
        fs.mkdirpSync(outputDataPath)
    }
    const stat = fs.statSync(outputDataPath)
    if(!stat || !stat.isDirectory()) {
        throw new Error(`output data path must be directory`)
    }
    const template = fs.readFileSync('templates/godot3.template', 'utf-8')
    const godotTexturePath = buildGodotResourcePath(projectRoot, path.relative(projectRoot, outputTexturePath))
    let wroteFiles = 0
    for(const file of files) {
        const tresContent = Mustache.render(template, {
            godotTexturePath,
            x: file.real.x,
            y: file.real.y,
            width: file.real.width,
            height: file.real.height,
            margin: {
                x: file.margin.left,
                y: file.margin.up,
                width: file.margin.left + file.margin.right,
                height: file.margin.up + file.margin.down,
            },
        })
        const { relPath, base } = smartCreateTResName(file.pattern, file.name)
        const dirPath = path.join(outputDataPath, relPath)
        fs.mkdirpSync(dirPath)
        fs.writeFileSync(path.join(dirPath, base) + '.tres', tresContent)
        wroteFiles++
    }
    log.info(`wrote ${wroteFiles} files`)
}
