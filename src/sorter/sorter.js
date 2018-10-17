// based on: http://codeincomplete.com/posts/2011/5/7/bin_packing/example/
// @flow
import type { Files, File } from 'types'

type Sorter = (a: File, b: File) => number;

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
        return msort(a, b, ['height', 'weight'])
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

export default function run(method: SortMethod, files: Files) {
    const filter = MultiSorters[method]
    if (filter) {
        files.sort(filter)
    }
}

/* sort by multiple criteria */
function msort(a: File, b: File, criteria: Array<$Keys<typeof Sorters>>) {
    var diff, n

    for (n = 0; n < criteria.length; n++) {
        diff = Sorters[criteria[n]](a, b)

        if (diff !== 0) {
            return diff
        }
    }

    return 0
}
