/**
 * Logger utility for the Euchre game server.
 * Uses Pino for asynchronous and structured logging.
 * @module logger
 */
import pino from 'pino';
import { DEBUG_LEVELS } from '../config/constants.js';

/**
 * @private
 * @type {string}
 * @description Holds the determined log level name (e.g., 'info', 'debug') for Pino initialization.
 * Defaults to 'info'.
 */
let currentLogLevelName = 'info';
const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
const pinoLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

/**
 * @private
 * @description Determines the initial log level for the Pino logger.
 * It prioritizes the `LOG_LEVEL` environment variable if it's a valid Pino level.
 * Otherwise, it attempts to use the `DEBUG_LEVEL` environment variable (numeric)
 * and maps it to a Pino level name. If neither is set or valid, defaults to 'info'.
 */
if (envLogLevel && pinoLevels.includes(envLogLevel)) {
  currentLogLevelName = envLogLevel;
} else {
  const debugLevelNum = parseInt(process.env.DEBUG_LEVEL, 10);
  if (!isNaN(debugLevelNum)) {
    switch (debugLevelNum) {
      case DEBUG_LEVELS.ERROR:
        currentLogLevelName = 'error';
        break;
      case DEBUG_LEVELS.INFO:
        currentLogLevelName = 'info';
        break;
      case DEBUG_LEVELS.WARNING:
        currentLogLevelName = 'warn';
        break;
      case DEBUG_LEVELS.VERBOSE:
        currentLogLevelName = 'debug'; // Pino's 'debug' is suitable for verbose/detailed logs
        break;
    }
  }
}

/**
 * @private
 * @type {pino.LoggerOptions}
 * @description Configuration options for the Pino logger.
 * Sets the logging level and, for non-production environments, configures
 * `pino-pretty` for human-readable, colorized console output.
 */
const loggerOptions = {
  level: currentLogLevelName,
};

if (process.env.NODE_ENV !== 'production') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss', // More standard timestamp format
      ignore: 'pid,hostname', // Properties to exclude from pretty print
    },
  };
}

/**
 * @type {pino.Logger}
 * @description The main Pino logger instance used throughout the application.
 * It is configured with the determined log level and transport options.
 * Provides standard logging methods like `logger.info()`, `logger.error()`, etc.
 */
const logger = pino(loggerOptions);

/**
 * Centralized logging function that acts as a compatibility wrapper around the Pino logger.
 * It maps numeric debug levels (from `DEBUG_LEVELS`) to corresponding Pino logger methods.
 *
 * @param {number} level - The numeric debug level (e.g., `DEBUG_LEVELS.INFO`, `DEBUG_LEVELS.ERROR`).
 * @param {string} message - The main log message.
 * @param {object} [obj] - Optional. An object containing additional data to be logged in a structured way.
 */
function log(level, message, obj) {
  switch (level) {
    case DEBUG_LEVELS.ERROR:
      if (obj) logger.error(obj, message);
      else logger.error(message);
      break;
    case DEBUG_LEVELS.INFO:
      if (obj) logger.info(obj, message);
      else logger.info(message);
      break;
    case DEBUG_LEVELS.WARNING:
      if (obj) logger.warn(obj, message);
      else logger.warn(message);
      break;
    case DEBUG_LEVELS.VERBOSE:
      if (obj) logger.debug(obj, message);
      else logger.debug(message);
      break;
    default:
      const unknownLevelMessage = `Unknown log level (${level}): ${message}`;
      if (obj) logger.info(obj, unknownLevelMessage);
      else logger.info(unknownLevelMessage);
  }
}

/**
 * Sets the debug level for the logger.
 * **Note:** This function currently only logs a warning indicating that the Pino logger's
 * level is set at initialization and cannot be changed dynamically through this method.
 * To change the log level, the application needs to be restarted with the appropriate
 * `LOG_LEVEL` or `DEBUG_LEVEL` environment variable.
 *
 * @param {number} newLevel - The desired new debug level (numeric, from `DEBUG_LEVELS`).
 */
function setDebugLevel(newLevel) {
  let levelName = 'info'; // Default for finding corresponding name
  for (const key in DEBUG_LEVELS) {
    if (DEBUG_LEVELS[key] === newLevel) {
      levelName = key.toLowerCase();
      if (levelName === 'verbose') levelName = 'debug'; // Map verbose to pino's debug
      break;
    }
  }
  logger.warn(
    `Attempted to set debug level to ${newLevel} (${levelName}) dynamically. ` +
    `Pino logger level ('${logger.level}') is set at initialization. ` +
    `Restart with new LOG_LEVEL or DEBUG_LEVEL env var to change.`
  );
}

export { logger, log, setDebugLevel };
/**
 * @description Default export is the main Pino logger instance.
 * @type {pino.Logger}
 */
export default logger;
