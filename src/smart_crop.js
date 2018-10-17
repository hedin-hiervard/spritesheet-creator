// @flow
export default function smartCrop({
    image,
    tolerance = 0.0002, // percent of color difference tolerance (default value)
}: {
    image: *,
    tolerance?: number
}): {
    cropped: {
        left: number,
        right: number,
        up: number,
        down: number,
    }
} {
    const w = image.bitmap.width
    const h = image.bitmap.height
    const minPixelsPerSide = 1 // to avoid cropping completely the image, resulting in an invalid 0 sized image

    let leaveBorder = 0 // Amount of pixels in border to leave

    /**
     * All borders must be of the same color as the top left pixel, to be cropped.
     * It should be possible to crop borders each with a different color,
     * but since there are many ways for corners to intersect, it would
     * introduce unnecessary complexity to the algorithm.
     */

    // scan each side for same color borders
    let colorTarget = image.getPixelColor(0, 0) // top left pixel color is the target color
    const rgba1 = image.constructor.intToRGBA(colorTarget)

    // for north and east sides
    let northPixelsToCrop = 0
    let eastPixelsToCrop = 0
    let southPixelsToCrop = 0
    let westPixelsToCrop = 0

    // north side (scan rows from north to south)
    colorTarget = image.getPixelColor(0, 0)
    north: for (let y = 0; y < h - minPixelsPerSide; y++) {
        for (let x = 0; x < w; x++) {
            const colorXY = image.getPixelColor(x, y)
            const rgba2 = image.constructor.intToRGBA(colorXY)

            if (image.constructor.colorDiff(rgba1, rgba2) > tolerance) {
                // this pixel is too distant from the first one: abort this side scan
                northPixelsToCrop -= leaveBorder
                break north
            }
        }
        // this row contains all pixels with the same color: increment this side pixels to crop
        northPixelsToCrop++
    }

    // east side (scan columns from east to west)
    colorTarget = image.getPixelColor(w, 0)
    east: for (let x = 0; x < w - minPixelsPerSide; x++) {
        for (let y = 0 + northPixelsToCrop; y < h; y++) {
            const colorXY = image.getPixelColor(x, y)
            const rgba2 = image.constructor.intToRGBA(colorXY)

            if (image.constructor.colorDiff(rgba1, rgba2) > tolerance) {
                // this pixel is too distant from the first one: abort this side scan
                eastPixelsToCrop -= leaveBorder
                break east
            }
        }
        // this column contains all pixels with the same color: increment this side pixels to crop
        eastPixelsToCrop++
    }

    // south side (scan rows from south to north)
    colorTarget = image.getPixelColor(0, h)
    south: for (
        let y = h - 1;
        y >= northPixelsToCrop + minPixelsPerSide;
        y--
    ) {
        for (let x = w - eastPixelsToCrop - 1; x >= 0; x--) {
            const colorXY = image.getPixelColor(x, y)
            const rgba2 = image.constructor.intToRGBA(colorXY)

            if (image.constructor.colorDiff(rgba1, rgba2) > tolerance) {
                // this pixel is too distant from the first one: abort this side scan
                southPixelsToCrop -= leaveBorder
                break south
            }
        }
        // this row contains all pixels with the same color: increment this side pixels to crop
        southPixelsToCrop++
    }

    // west side (scan columns from west to east)
    colorTarget = image.getPixelColor(w, h)
    west: for (
        let x = w - 1;
        x >= 0 + eastPixelsToCrop + minPixelsPerSide;
        x--
    ) {
        for (let y = h - 1; y >= 0 + northPixelsToCrop; y--) {
            const colorXY = image.getPixelColor(x, y)
            const rgba2 = image.constructor.intToRGBA(colorXY)

            if (image.constructor.colorDiff(rgba1, rgba2) > tolerance) {
                // this pixel is too distant from the first one: abort this side scan
                westPixelsToCrop -= leaveBorder
                break west
            }
        }
        // this column contains all pixels with the same color: increment this side pixels to crop
        westPixelsToCrop++
    }

    const widthOfRemainingPixels =
        w - (westPixelsToCrop + eastPixelsToCrop)
    const heightOfRemainingPixels =
        h - (southPixelsToCrop + northPixelsToCrop)

    // do the real crop
    image.crop(
        eastPixelsToCrop,
        northPixelsToCrop,
        widthOfRemainingPixels,
        heightOfRemainingPixels
    )

    return {
        cropped: {
            up: northPixelsToCrop,
            down: southPixelsToCrop,
            right: westPixelsToCrop,
            left: eastPixelsToCrop,
        },
    }
}
