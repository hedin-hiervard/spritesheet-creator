// @flow
//
import type { SortMethod } from 'sorter/sorter'
import type { PackAlgorithm } from 'packing/packing'

export type File = {
    name: string,
    x: number,
    y: number,
    width: number,
    height: number,
    area: number,
    fit?: {
        x: number,
        y: number,
    },
    image?: any,
    trimmed?: boolean,
};

export type Files = Array<File>;

export type Options = {
    width?: number,
    height?: number,
    validate?: boolean,
    trim?: boolean,
    padding?: number,
    divisibleByTwo?: boolean,
    square?: boolean,
    sortMethod?: SortMethod,
    packAlgorithm?: PackAlgorithm,
    powerOfTwo?: boolean,
    maxTextureSize?: number
};
