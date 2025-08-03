/**
 * src/utils/logger.js
 * @file logger.js
 * @description Logger utility for the Euchre game server.
 * Provides a centralized logging solution using Pino for high-performance,
 * structured JSON logging with pretty-printing in development.
 *
 * This module exports a singleton `logger` for application-wide use. It also
 * exports factory functions (`createLogger`, `getLogLevelFromEnv`) to facilitate
 * fast, isolated unit testing without reloading the module.
 *
 * Log levels can be configured via environment variables:
 * - LOG_LEVEL: Directly set Pino log level (fatal, error, warn, info, debug, trace, silent)
 * - DEBUG_LEVEL: Numeric log level using DEBUG_LEVELS constants
 * @see {@link module:src/config/constants.DEBUG_LEVELS} for available log levels
 */

import pino from "pino";
import { DEBUG_LEVELS } from "../config/constants.js";

// --- Pure Functions for Configuration and Instantiation ---

const debugLevelToPino = {
  [DEBUG_LEVELS.ERROR]: "error",
  [DEBUG_LEVELS.LOG_LEVEL_ERROR]: "error",
  [DEBUG_LEVELS.WARN]: "warn",
  [DEBUG_LEVELS.LOG_LEVEL_WARN]: "warn",
  [DEBUG_LEVELS.INFO]: "info",
  [DEBUG_LEVELS.LOG_LEVEL_INFO]: "info",
  [DEBUG_LEVELS.DEBUG]: "debug",
  [DEBUG_LEVELS.LOG_LEVEL_DEBUG]: "debug",
  [DEBUG_LEVELS.LOG_LEVEL_TRACE]: "trace",
  [DEBUG_LEVELS.NONE]: "silent",
  [DEBUG_LEVELS.LOG_LEVEL_SILENT]: "silent"
};

/**
 * Creates a Pino logger instance with a specific configuration.
 * This factory is exported for easy testing.
 *
 * @param {object} [options={}] - Configuration options.
 * @param {string} [options.level='info'] - A valid Pino log level.
 * @param {boolean} [options.prettyPrint=false] - Whether to enable pretty printing.
 * @returns {import('pino').Logger} A Pino logger instance.
 */
function createLogger({ level = 'info', prettyPrint = false } = {}) {
  /** @type {import('pino').LoggerOptions} */
  const loggerOptions = { level };

  if (prettyPrint) {
    loggerOptions.transport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
        ignore: "pid,hostname",
      },
    };
  }
  return pino(loggerOptions);
}

/**
 * Determines the log level from environment variables.
 * This pure function is exported for easy testing.
 *
 * @param {object} env - The environment object (e.g., process.env).
 * @returns {{level: string, warning: string|null}} The determined Pino log level name and a potential warning.
 */
function getLogLevelFromEnv(env) {
  const envLogLevel = env.LOG_LEVEL?.toLowerCase();
  const pinoLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];

  if (envLogLevel && pinoLevels.includes(envLogLevel)) {
    return { level: envLogLevel, warning: null };
  }

  if (env.DEBUG_LEVEL) {
    const mappedLevel = debugLevelToPino[env.DEBUG_LEVEL];
    if (mappedLevel) {
      return { level: mappedLevel, warning: null };
    }
    return {
      level: 'info',
      warning: `Invalid DEBUG_LEVEL: ${env.DEBUG_LEVEL}, defaulting to 'info'`
    };
  }

  return { level: 'info', warning: null }; // Default
}


// --- Singleton Instance Creation for Application Use ---

const { level: currentLogLevelName, warning: startupWarning } = getLogLevelFromEnv(process.env);
const isProduction = process.env.NODE_ENV === 'production';

if (startupWarning) {
  // Use console.warn here as the logger is not yet initialized.
  // This is an acceptable side-effect during application startup.
  console.warn(startupWarning);
}

/**
 * The main Pino logger instance for the application.
 * This instance is used for structured logging throughout the server.
 * @type {import('pino').Logger}
 */
const logger = createLogger({
  level: currentLogLevelName,
  prettyPrint: !isProduction,
});


// --- Legacy API Functions for Backward Compatibility ---

/**
 * Centralized logging function that maps between DEBUG_LEVELS and Pino's logging methods.
 *
 * @param {string} level - Log level from DEBUG_LEVELS (e.g., 'LOG_LEVEL_ERROR')
 * @param {string} message - The log message
 * @param {Object} [obj] - Optional object to be logged as JSON
 */
function log(level, message, obj) {
  switch (level) {
    case DEBUG_LEVELS.ERROR:
    case DEBUG_LEVELS.LOG_LEVEL_ERROR:
      if (obj) logger.error(obj, message);
      else logger.error(message);
      break;
    case DEBUG_LEVELS.INFO:
    case DEBUG_LEVELS.LOG_LEVEL_INFO:
      if (obj) logger.info(obj, message);
      else logger.info(message);
      break;
    case DEBUG_LEVELS.WARN:
    case DEBUG_LEVELS.LOG_LEVEL_WARN:
      if (obj) logger.warn(obj, message);
      else logger.warn(message);
      break;
    case DEBUG_LEVELS.DEBUG:
    case DEBUG_LEVELS.LOG_LEVEL_DEBUG:
      if (obj) logger.debug(obj, message);
      else logger.debug(message);
      break;
    case DEBUG_LEVELS.LOG_LEVEL_TRACE:
      if (obj) logger.trace(obj, message);
      else logger.trace(message);
      break;
    case DEBUG_LEVELS.NONE:
    case DEBUG_LEVELS.LOG_LEVEL_SILENT:
      // If LOG_LEVEL_SILENT is explicitly passed to log(), do nothing
      break;
    default:
      // Fallback for unknown log levels
      const unknownLevelMessage = `Unknown log level (${level}): ${message}`;
      if (obj) logger.info(obj, unknownLevelMessage);
      else logger.info(unknownLevelMessage);
  }
}

/**
 * Attempts to set the debug level dynamically.
 * Note: Pino's log level can only be set at initialization.
 * This logs a warning and informs the user to restart with the correct env var.
 *
 * @param {string} newLevel - The new debug level from DEBUG_LEVELS (e.g., 'LOG_LEVEL_ERROR')
 */
function setDebugLevel(newLevel) {
  const levelMap = {
    [DEBUG_LEVELS.ERROR]: 'error',
    [DEBUG_LEVELS.LOG_LEVEL_ERROR]: 'error',
    [DEBUG_LEVELS.WARN]: 'warn',
    [DEBUG_LEVELS.LOG_LEVEL_WARN]: 'warn',
    [DEBUG_LEVELS.INFO]: 'info',
    [DEBUG_LEVELS.LOG_LEVEL_INFO]: 'info',
    [DEBUG_LEVELS.DEBUG]: 'debug',
    [DEBUG_LEVELS.LOG_LEVEL_DEBUG]: 'debug',
    [DEBUG_LEVELS.LOG_LEVEL_TRACE]: 'trace',
    [DEBUG_LEVELS.NONE]: 'silent',
    [DEBUG_LEVELS.LOG_LEVEL_SILENT]: 'silent'
  };

  const levelName = levelMap[newLevel] || 'info';

  logger.warn(
    `Attempted to set debug level to ${newLevel} (${levelName}) dynamically. ` +
    `Pino logger level ('${logger.level}') is set at initialization. ` +
    'Restart with new LOG_LEVEL or DEBUG_LEVEL env var to change.'
  );
}


// --- Exports ---

/**
 * Exports the main logger instance, utility functions, and testable factories.
 * @type {{
 *   logger: import('pino').Logger,
 *   log: function(string, string, Object): void,
 *   setDebugLevel: function(string): void,
 *   createLogger: function(object): import('pino').Logger,
 *   getLogLevelFromEnv: function(object): {level: string, warning: string|null}
 * }}
 */
export {
  logger,
  log,
  setDebugLevel,
  createLogger,
  getLogLevelFromEnv
};

// Default export for backward compatibility
export default logger;