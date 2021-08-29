import * as logz from 'log4js';

// Log level that applies across the whole library
const LOG_LEVEL: string = process.env.MSG_BUS_LOG_LEVEL !== undefined ? process.env.MSG_BUS_LOG_LEVEL : 'info';

class LogUtil {
    private log4js: logz.Log4js;
    constructor() {
        this.log4js = logz.configure({
            appenders: { out: { type: 'stdout', layout: { type: 'basic' } } },
            categories: { default: { appenders: ['out'], level: 'info' } }
        });
    }
    public getLogger(category?: string): logz.Logger {
        const logger: logz.Logger = this.log4js.getLogger(category);
        logger.level = LOG_LEVEL;
        return logger;
    }
}

const logUtil: LogUtil = new LogUtil();
export { logUtil };
