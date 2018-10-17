import { StreamLogger } from 'Logger'

const log = new StreamLogger({
    stream: process.stdout,
    colors: true,
})
export default log
