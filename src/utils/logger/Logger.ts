/**
 * Centralized logging system for Screeps bot
 * Provides debug-controlled console output separate from UI Visual system
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'log' | 'force';

export interface LoggerConfig {
  debug: boolean;
  prefix?: string;
  enabledLevels?: LogLevel[];
}

export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;

  public constructor(config: LoggerConfig = { debug: true }) {
    this.config = {
      ...config,
      enabledLevels: config.enabledLevels || ['debug']
    };
    console.log("[LOGGER] Logger initialized with config:");
  }

  /**
   * Get the singleton Logger instance
   */
  public static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      console.log("[LOGGER] Creating new Logger instance");
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
   * Log debug messages (only when debug mode is enabled and 'debug' level is enabled)
   */
  public debug(message: string, ...args: any[]): void {
    if (this.config.debug && this.config.enabledLevels!.includes('debug')) {
      console.log(this.formatMessage('debug', message, ...args));
    }
  }

  /**
   * Log info messages (only when debug mode is enabled and 'info' level is enabled)
   */
  public info(message: string, ...args: any[]): void {
    if (this.config.debug && this.config.enabledLevels!.includes('info')) {
      console.log(this.formatMessage('info', message, ...args));
    }
  }

  /**
   * Log warning messages (only when debug mode is enabled and 'warn' level is enabled)
   */
  public warn(message: string, ...args: any[]): void {
    if (this.config.debug && this.config.enabledLevels!.includes('warn')) {
      console.log(this.formatMessage('warn', message, ...args));
    }
  }

  /**
   * Log error messages (only when debug mode is enabled and 'error' level is enabled)
   */
  public error(message: string, ...args: any[]): void {
    if (this.config.debug && this.config.enabledLevels!.includes('error')) {
      console.log(this.formatMessage('error', message, ...args));
    }
  }

  /**
   * Log general messages (only when debug mode is enabled and 'log' level is enabled)
   */
  public log(message: string, ...args: any[]): void {
    if (this.config.debug && this.config.enabledLevels!.includes('log')) {
      console.log(this.formatMessage('log', message, ...args));
    }
  }

  /**
   * Force log a message (only when debug mode is enabled and 'force' level is enabled)
   */
  public force(message: string, ...args: any[]): void {
    if (this.config.debug && this.config.enabledLevels!.includes('force')) {
      console.log(this.formatMessage('force', message, ...args));
    }
  }

  /**
   * Set which log levels are enabled
   * @param levels - Single level string, array of levels, or 'all' to enable all levels
   * @example
   * setLogLevels('info')           // Only info messages
   * setLogLevels(['info', 'error']) // Info and error messages
   * setLogLevels('all')            // All log levels
   */
  public setLogLevels(levels: string | string[]): void {
    const allLevels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'log', 'force'];

    // Normalize input to array
    const levelsArray = Array.isArray(levels) ? levels : [levels];

    // Handle 'all' keyword
    if (levelsArray.includes('all')) {
      this.config.enabledLevels = [...allLevels];
      console.log('✅ All log levels enabled: debug, info, warn, error, log, force');
      return;
    }

    // Validate each level
    const validLevels: LogLevel[] = [];
    const invalidLevels: string[] = [];

    for (const level of levelsArray) {
      if (allLevels.includes(level as LogLevel)) {
        validLevels.push(level as LogLevel);
      } else {
        invalidLevels.push(level);
      }
    }

    // Report invalid levels
    if (invalidLevels.length > 0) {
      console.log(`⚠️ Invalid log levels: ${invalidLevels.join(', ')}`);
      console.log(`Valid levels are: ${allLevels.join(', ')}, or 'all'`);
    }

    // Set valid levels
    if (validLevels.length > 0) {
      this.config.enabledLevels = validLevels;
      console.log(`✅ Log levels set to: ${validLevels.join(', ')}`);
    } else {
      console.log('❌ No valid log levels provided. Enabled levels unchanged.');
    }
  }

  /**
   * Get currently enabled log levels
   */
  public getEnabledLevels(): LogLevel[] {
    return [...(this.config.enabledLevels || ['info'])];
  }
}

/**
 * Create and export a default logger instance
 */
// export const logger = Logger.getInstance();
// export const logger = new Logger();
// console.log("logger imported")
/**
 * Convenience functions for global access
 */
// export const debugLog = {
//   debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
//   info: (message: string, ...args: any[]) => logger.info(message, ...args),
//   warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
//   error: (message: string, ...args: any[]) => logger.error(message, ...args),
//   log: (message: string, ...args: any[]) => logger.log(message, ...args),
//   force: (message: string, ...args: any[]) => logger.force(message, ...args),
//   setDebug: (enabled: boolean) => logger.setDebug(enabled),
//   isDebugEnabled: () => logger.isDebugEnabled(),
//   setPrefix: (prefix: string) => logger.setPrefix(prefix),
//   setLogLevels: (levels: string | string[]) => logger.setLogLevels(levels),
//   getEnabledLevels: () => logger.getEnabledLevels()
// };
