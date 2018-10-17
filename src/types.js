// @flow
//
import type { SortMethod } from 'sorter'
import type { PackAlgorithm } from 'packer'

export type File = {
    name: string,
    padded: {
        x: number,
        y: number,
        width: number,
        height: number,
        area: number,
    },
    real: {
        x: number,
        y: number,
        width: number,
        height: number,
        area: number,
    },
    margin: {
        left: number,
        right: number,
        up: number,
        down: number,
    },
    padding: {
        left: number,
        right: number,
        up: number,
        down: number,
    },
    image?: any,
};

export type Files = Array<File>;

export type Options = {
    width?: number,
    height?: number,
    trim?: boolean,
    padding?: number,
    divisibleByTwo?: boolean,
    square?: boolean,
    sortMethod?: SortMethod,
    packAlgorithm?: PackAlgorithm,
    powerOfTwo?: boolean,
    maxTextureSize?: number,
    projectRoot?: string,
};
