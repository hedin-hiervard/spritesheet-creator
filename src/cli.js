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
    .command('generate-spritesheet <export format> <input folder> <output texture path> <output data path>')
    .option('--project <projectRoot>', 'project root')
    .description('reads the folder of files and generates the spritesheet')
    .action(async (exportFormat, inputFolder, outputTexturePath, outputDataPath, _, projectRoot) => {
        log.debug(projectRoot)
        const generator = new SpritesheetGenerator({
            log,
            exportFormat,
            inputFolder,
            outputTexturePath,
            outputDataPath,
            options: {
                projectRoot: projectRoot,
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
