"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
class ConsoleLogger {
    formatMessage(level, message) {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    }
    info(message) {
        console.log(this.formatMessage('info', message));
    }
    error(message, error) {
        console.error(this.formatMessage('error', message));
        if (error) {
            console.error(error.stack);
        }
    }
    warn(message) {
        console.warn(this.formatMessage('warn', message));
    }
    debug(message) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(this.formatMessage('debug', message));
        }
    }
}
exports.logger = new ConsoleLogger();
//# sourceMappingURL=logger.js.map