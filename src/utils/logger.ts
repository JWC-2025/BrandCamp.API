
export interface Logger {
  info(message: string, meta?: any): void;
  error(message: string, error?: Error, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

class ConsoleLogger implements Logger {
  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const baseMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (meta) {
      return `${baseMessage} ${JSON.stringify(meta)}`;
    }
    
    return baseMessage;
  }

  info(message: string, meta?: any): void {
    console.log(this.formatMessage('info', message, meta));
  }

  error(message: string, error?: Error, meta?: any): void {
    console.error(this.formatMessage('error', message, meta));
    if (error) {
      console.error(error.stack);
    }
  }

  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  debug(message: string, meta?: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger: Logger = new ConsoleLogger();