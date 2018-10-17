// based on: http://codeincomplete.com/posts/2011/5/7/bin_packing/example/
// @flow
import type { Files, File} from 'types'

type Padded = {
    width: number,
    height: number,
    area: number,
}

type Sorter = (a: Padded, b: Padded) => number;

const Sorters: { [string]: Sorter } = {
    width: function (a, b) {
        return b.width - a.width
    },
    height: function (a, b) {
        return b.height - a.height
    },
    area: function (a, b) {
        return b.area - a.area
    },
    max: function (a, b) {
        return Math.max(b.width, b.height) - Math.max(a.width, a.height)
    },
    min: function (a, b) {
        return Math.min(b.width, b.height) - Math.min(a.width, a.height)
    },
}

const MultiSorters: { [string]: Sorter } = {
    height: function (a, b) {
        return msort(a, b, ['height', 'width'])
    },
    width: function (a, b) {
        return msort(a, b, ['width', 'height'])
    },
    area: function (a, b) {
        return msort(a, b, ['area', 'height', 'width'])
    },
    maxside: function (a, b) {
        return msort(a, b, ['max', 'min', 'height', 'width'])
    },
}

export type SortMethod = $Keys<typeof MultiSorters>;

export default function sort(method: SortMethod, files: Files) {
    const sorter = MultiSorters[method]
    if (!sorter) {
        throw new Error(`unsupported sort method ${method}, supported methods: ${Object.keys(MultiSorters).join(',')}`)
    }
    files.sort((file_a: File, file_b: File) => {
        return sorter(file_a.padded, file_b.padded)
    })
}

/* sort by multiple criteria */
function msort(a: Padded, b: Padded, criteria: Array<$Keys<typeof Sorters>>) {
    for (const c of criteria) {
        const diff = Sorters[c](a, b)
        if (diff !== 0) {
            return diff
        }
    }

    return 0
}
