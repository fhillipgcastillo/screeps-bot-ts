/**
 * Centralized logging system for Screeps bot
 * Provides debug-controlled console output separate from UI Visual system
 */

export interface LoggerConfig {
  debug: boolean;
  prefix?: string;
}

export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;

  private constructor(config: LoggerConfig = { debug: false }) {
    this.config = config;
  }

  /**
   * Get the singleton Logger instance
   */
  public static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Set debug mode on/off
   */
  public setDebug(enabled: boolean): void {
    this.config.debug = enabled;
    this.info(`Debug logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get current debug state
   */
  public isDebugEnabled(): boolean {
    return this.config.debug;
  }

  /**
   * Set optional prefix for all log messages
   */
  public setPrefix(prefix: string): void {
    this.config.prefix = prefix;
  }

  /**
   * Format message with optional prefix and timestamp
   */
  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = `[${Game.time}]`;
    const prefix = this.config.prefix ? `[${this.config.prefix}]` : '';
    const levelTag = `[${level.toUpperCase()}]`;
    
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : '';
    
    return `${timestamp}${prefix}${levelTag} ${message}${formattedArgs}`;
  }

  /**
   * Log debug messages (only when debug mode is enabled)
   */
  public debug(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(this.formatMessage('debug', message, ...args));
    }
  }

  /**
   * Log info messages (only when debug mode is enabled)
   */
  public info(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(this.formatMessage('info', message, ...args));
    }
  }

  /**
   * Log warning messages (only when debug mode is enabled)
   */
  public warn(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(this.formatMessage('warn', message, ...args));
    }
  }

  /**
   * Log error messages (always shown, regardless of debug mode)
   */
  public error(message: string, ...args: any[]): void {
    console.log(this.formatMessage('error', message, ...args));
  }

  /**
   * Log general messages (only when debug mode is enabled)
   */
  public log(message: string, ...args: any[]): void {
    if (this.config.debug) {
      console.log(this.formatMessage('log', message, ...args));
    }
  }

  /**
   * Force log a message regardless of debug mode (for critical information)
   */
  public force(message: string, ...args: any[]): void {
    console.log(this.formatMessage('force', message, ...args));
  }
}

/**
 * Create and export a default logger instance
 */
export const logger = Logger.getInstance();

/**
 * Convenience functions for global access
 */
export const debugLog = {
  debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  error: (message: string, ...args: any[]) => logger.error(message, ...args),
  log: (message: string, ...args: any[]) => logger.log(message, ...args),
  force: (message: string, ...args: any[]) => logger.force(message, ...args),
  setDebug: (enabled: boolean) => logger.setDebug(enabled),
  isDebugEnabled: () => logger.isDebugEnabled(),
  setPrefix: (prefix: string) => logger.setPrefix(prefix)
};
