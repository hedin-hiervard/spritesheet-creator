// @flow

import type { Files } from 'types'
import type { Logger } from 'ual'

export default async function generateNullTextureData({
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
    log.info(`generating null texture data`)
}
