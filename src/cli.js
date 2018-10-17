// @flow

import Youch from 'youch'
import forTerminal from 'youch-terminal'
import log from 'log.js'
import program from 'commander'
import SpritesheetGenerator from 'SpritesheetGenerator'

process.on('unhandledRejection', err => {
    throw err
})

process.on('uncaughtException', err => {
    new Youch(err, {})
        .toJSON()
        .then((output) => {
            log.error(forTerminal(output))
        })
})

program
    .command('generate-spritesheet <exportFormat> <outputTexturePath> <outputDataPath> <inputPatterns...>')
    .option('--project-root <projectRoot>')
    .option('--sort-method <sortMethod>')
    .option('--pack-algorithm <packAlgorithm>')
    .option('--width <width>')
    .option('--height <height>')
    .description('reads the folder (or several folder) of files and generates the spritesheet')
    .action(async (exportFormat, outputTexturePath, outputDataPath, inputPatterns, options) => {
        const generator = new SpritesheetGenerator({
            log,
            exportFormat,
            inputPatterns,
            outputTexturePath,
            outputDataPath,
            options: {
                projectRoot: options.projectRoot,
                sortMethod: options.sortMethod,
                packAlgorithm: options.packAlgorithm,
                width: options.width,
                height: options.height,
            },
        })
        await generator.generate()
    })

program.on('command:*', function () {
    program.help()
})

program.parse(process.argv)

if (!process.argv.slice(2).length) {
    program.outputHelp()
}
