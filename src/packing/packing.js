// @flow

import binpacking from 'binpacking'

import type { Files, Options } from 'types'

type AlgorithmFunc = (Files, Options) => void;

const AlgorithmFuncs: { [string]: AlgorithmFunc } = {
    'binpacking': binpackingStrict,
    'growing-binpacking': growingBinpacking,
    'horizontal': horizontal,
    'vertical': vertical,
}

export type PackAlgorithm = $Keys<typeof AlgorithmFuncs>;

export function pack({
    algorithm, files, options,
}: {
    algorithm: PackAlgorithm,
    files: Files,
    options: Options
}): void {
    algorithm = algorithm || 'growing-binpacking'
    AlgorithmFuncs[algorithm](files, options)

    if (options.validate) {
        validate(files, options)
    }
}

function validate(files: Files, options: Options): void {
    for(const item of files) {
        if (item.x + item.width > options.width ||
            item.y + item.height > options.height) {
            throw new Error('Can\'t fit all textures in given spritesheet size')
        }
    }

    const intersects = function(x_1, y_1, width_1, height_1, x_2, y_2, width_2, height_2) {
        return !(x_1 >= x_2 + width_2 || x_1 + width_1 <= x_2 || y_1 >= y_2 + height_2 || y_1 + height_1 <= y_2)
    }

    for(const a of files) {
        for(const b of files) {
            if (a !== b && intersects(a.x, a.y, a.width, a.height, b.x, b.y, b.width, b.height)) {
                throw new Error(`Files intersect: ${a.name}, ${b.name}`)
            }
        }
    }
}

function growingBinpacking(files: Files, options: Options): void {
    const packer = new binpacking.GrowingPacker()
    const input = files.map(file => ({
        w: file.width,
        h: file.height,
    }))
    packer.fit(input)

    let idx = 0
    for(const item of input) {
        if(!item.fit) {
            throw new Error(`${files[idx].name} doesn't fit to texture`)
        }
        files[idx].x = item.fit.x
        files[idx].y = item.fit.y
        idx++
    }

    options.width = packer.root.w
    options.height = packer.root.h
}

function binpackingStrict(files: Files, options: Options): void {
    const packer = new binpacking.Packer(options.width, options.height)
    packer.fit(files)

    for(const item of files) {
        item.x = item.fit ? item.fit.x : 0
        item.y = item.fit ? item.fit.y : 0
    }

    options.width = packer.root.w
    options.height = packer.root.h
}

function vertical(files: Files, options: Options): void {
    let y = 0
    let maxWidth = 0
    for(const item of files) {
        item.x = 0
        item.y = y
        maxWidth = Math.max(maxWidth, item.width)
        y += item.height
    }

    options.width = maxWidth
    options.height = y
}

function horizontal(files: Files, options: Options): void {
    let x = 0
    let maxHeight = 0
    for(const item of files) {
        item.x = x
        item.y = 0
        maxHeight = Math.max(maxHeight, item.height)
        x += item.width
    }

    options.width = x
    options.height = maxHeight
}
