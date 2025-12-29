import { Logger } from "./Logger";
const logger = Logger.getInstance();

export const debugLog = {
  debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  error: (message: string, ...args: any[]) => logger.error(message, ...args),
  log: (message: string, ...args: any[]) => logger.log(message, ...args),
  force: (message: string, ...args: any[]) => logger.force(message, ...args),
  setDebug: (enabled: boolean) => logger.setDebug(enabled),
  isDebugEnabled: () => logger.isDebugEnabled(),
  setPrefix: (prefix: string) => logger.setPrefix(prefix),
  setLogLevels: (levels: string | string[]) => logger.setLogLevels(levels),
  getEnabledLevels: () => logger.getEnabledLevels()
};
