// @flow

/**
 * crops the fully transparent pixels from all borders of the image
 * @param  {Jimp} options.image Jimp image
 * @return {Object} cropped.left, .right, .up, .down - amount of pixels cropped
 */
export default function smartCrop({
    image,
}: {
    image: *,
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

    let leftPixelsToCrop = 0
    let upPixelsToCrop = 0
    let downPixelsToCrop = 0
    let rightPixelsToCrop = 0

    // up side
    let b = false
    for (let y = 0; y < h - minPixelsPerSide; y++) {
        for (let x = 0; x < w; x++) {
            const colorXY = image.getPixelColor(x, y)
            const rgba = image.constructor.intToRGBA(colorXY)
            if (rgba.a > 0) {
                b = true
                upPixelsToCrop = y
                break
            }
        }
        if(b) break
    }

    // left side
    b = false
    for (let x = 0; x < w - minPixelsPerSide; x++) {
        for (let y = upPixelsToCrop; y < h; y++) {
            const colorXY = image.getPixelColor(x, y)
            const rgba = image.constructor.intToRGBA(colorXY)

            if (rgba.a > 0) {
                b = true
                leftPixelsToCrop = x
                break
            }
        }
        if(b) break
    }

    // down side
    b = false
    for (
        let y = h - 1;
        y >= upPixelsToCrop + minPixelsPerSide;
        y--
    ) {
        for (let x = w - 1; x > leftPixelsToCrop; x--) {
            const colorXY = image.getPixelColor(x, y)
            const rgba = image.constructor.intToRGBA(colorXY)

            if (rgba.a > 0) {
                b = true
                downPixelsToCrop = h - y - 1
                break
            }
        }
        if(b) break
    }

    // right side
    b = false
    for (
        let x = w - 1;
        x >= 0 + leftPixelsToCrop + minPixelsPerSide;
        x--
    ) {
        for (let y = h - downPixelsToCrop; y > upPixelsToCrop; y--) {
            const colorXY = image.getPixelColor(x, y)
            const rgba = image.constructor.intToRGBA(colorXY)

            if (rgba.a > 0) {
                b = true
                rightPixelsToCrop = w - x - 1
                break
            }
        }
        if(b) break
    }

    const widthOfRemainingPixels =
        w - (leftPixelsToCrop + rightPixelsToCrop)
    const heightOfRemainingPixels =
        h - (upPixelsToCrop + downPixelsToCrop)

    // do the real crop
    image.crop(
        leftPixelsToCrop,
        upPixelsToCrop,
        widthOfRemainingPixels,
        heightOfRemainingPixels
    )

    return {
        cropped: {
            up: upPixelsToCrop,
            down: downPixelsToCrop,
            right: rightPixelsToCrop,
            left: leftPixelsToCrop,
        },
    }
}
