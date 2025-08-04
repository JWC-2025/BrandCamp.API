
export interface Logger {
  info(message: string): void;
  error(message: string, error?: Error): void;
  warn(message: string): void;
  debug(message: string): void;
}

class ConsoleLogger implements Logger {
  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
  }

  info(message: string): void {
    console.log(this.formatMessage('info', message));
  }

  error(message: string, error?: Error): void {
    console.error(this.formatMessage('error', message));
    if (error) {
      console.error(error.stack);
    }
  }

  warn(message: string): void {
    console.warn(this.formatMessage('warn', message));
  }

  debug(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message));
    }
  }
}

export const logger: Logger = new ConsoleLogger();