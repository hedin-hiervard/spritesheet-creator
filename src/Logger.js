// @flow

import prettyFormat from 'pretty-format'
import moment from 'moment'
import Colors from 'colors/safe'

export interface Logger {
    info(data: any): void,
    debug(data: any): void,
    error(data: any): void,
    warn(data: any): void,
}

type LogLevel = 'INFO' | 'WARN' | 'ERR' | 'DEBUG';
type Serializer = (Date, LogLevel, any, boolean) => string;

function formatTime(date: Date): string {
    return moment(date).format(`YYYY-DD-MM HH:mm:ss`)
}

const defaultPrettyFormatOptions = {
    plugins: [{
        test: obj => obj instanceof Error,
        serialize: err => err.stack,
    }],
}

function defaultSerializer(date: Date, logLevel: LogLevel, data: any, colors: boolean): string {
    let timeString = `${formatTime(date)}`
    if(colors) {
        timeString = Colors.gray(timeString)
    }
    let logLevelString = `[${logLevel.padEnd(5, ' ')}]`
    if(colors) {
        switch(logLevel) {
        case 'INFO': logLevelString = Colors.gray(logLevelString); break
        case 'WARN': logLevelString = Colors.yellow(logLevelString); break
        case 'ERR': logLevelString = Colors.red(logLevelString); break
        case 'DEBUG': logLevelString = Colors.cyan(logLevelString); break
        }
    }
    let dataString = `${prettyFormat(data, defaultPrettyFormatOptions)}`
    return `${timeString} ${logLevelString}: ${dataString}\n`
}

export class StreamLogger implements Logger {
    stream: stream$Writable;
    serializer: Serializer;
    colors: boolean;

    constructor({ stream, colors = false, serializer }: {
            stream: stream$Writable,
            colors?: boolean,
            serializer?: Serializer
        }) {
        this.stream = stream
        this.colors = colors
        if(serializer) {
            this.serializer = serializer
        } else {
            this.serializer = defaultSerializer
        }
    }

    log(logLevel: LogLevel, data: any): void {
        this.stream.write(this.serializer(new Date(), logLevel, data, this.colors))
    }

    info(data: any): void {
        this.log('INFO', data)
    }

    debug(data: any): void {
        this.log('DEBUG', data)
    }

    warn(data: any): void {
        this.log('WARN', data)
    }

    error(data: any): void {
        this.log('ERR', data)
    }
}
