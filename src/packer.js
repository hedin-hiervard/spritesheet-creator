// @flow

import binpacking from 'binpacking'

import type { Files, Options } from 'types'

type AlgorithmFunc = (Files, Options) => void;

type Data = Array<{
    w: number,
    h: number,
    fit?: {
        x: number,
        y: number,
    }
}>;

const AlgorithmFuncs: { [string]: AlgorithmFunc } = {
    'binpacking': binpackingStrict,
    'growing-binpacking': growingBinpacking,
    'horizontal': horizontal,
    'vertical': vertical,
}

export type PackAlgorithm = $Keys<typeof AlgorithmFuncs>;

export default function pack({
    algorithm, files, options,
}: {
    algorithm: PackAlgorithm,
    files: Files,
    options: Options
}): void {
    if(!AlgorithmFuncs[algorithm]) {
        throw new Error(`packing algorithm '${algorithm}' not supported, supported algorithms: ${Object.keys(AlgorithmFuncs).join(',')}`)
    }
    AlgorithmFuncs[algorithm](files, options)
}

function prepareData(files: Files): Data {
    return files.map(file => ({
        w: file.padded.width,
        h: file.padded.height,
    }))
}

function injectData(data: Data, files: Files): void {
    let idx = 0
    for(const item of data) {
        if(!item.fit) {
            throw new Error(`${files[idx].name} doesn't fit to texture`)
        }
        files[idx].padded.x = item.fit.x
        files[idx].padded.y = item.fit.y
        idx++
    }
}

function growingBinpacking(files: Files, options: Options): void {
    const packer = new binpacking.GrowingPacker()
    const data = prepareData(files)
    packer.fit(data)
    injectData(data, files)

    options.width = packer.root.w
    options.height = packer.root.h
}

function binpackingStrict(files: Files, options: Options): void {
    if(!options.width || !options.height) {
        throw new Error(`must specify texture size for binpacking`)
    }
    const packer = new binpacking.Packer(options.width, options.height)
    const data = prepareData(files)
    packer.fit(data)
    injectData(data, files)

    options.width = packer.root.w
    options.height = packer.root.h
}

function vertical(files: Files, options: Options): void {
    let y = 0
    let maxWidth = 0
    for(const item of files) {
        item.padded.x = 0
        item.padded.y = y
        maxWidth = Math.max(maxWidth, item.padded.width)
        y += item.padded.height
    }

    options.width = maxWidth
    options.height = y
}

function horizontal(files: Files, options: Options): void {
    let x = 0
    let maxHeight = 0
    for(const item of files) {
        item.padded.x = x
        item.padded.y = 0
        maxHeight = Math.max(maxHeight, item.padded.height)
        x += item.padded.width
    }

    options.width = x
    options.height = maxHeight
}
