/**
 * src/utils/logger.js
 * @file logger.js
 * @description Logger utility for the Euchre game server.
 * Provides a centralized logging solution using Pino for high-performance,
 * structured JSON logging with pretty-printing in development.
 *
 * Log levels can be configured via environment variables:
 * - LOG_LEVEL: Directly set Pino log level (fatal, error, warn, info, debug, trace, silent)
 * - DEBUG_LEVEL: Numeric log level using DEBUG_LEVELS constants
 * @see {@link module:src/config/constants.DEBUG_LEVELS} for available log levels
 */

import pino from "pino";
import { DEBUG_LEVELS } from "../config/constants.js";

// Initialize default log level from environment variables
let currentLogLevelName = "info";
const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
const pinoLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"];

// Debug level to Pino level mapping
const debugLevelToPino = {
  [DEBUG_LEVELS.ERROR]: "error",
  [DEBUG_LEVELS.LOG_LEVEL_ERROR]: "error",
  [DEBUG_LEVELS.WARNING]: "warn",
  [DEBUG_LEVELS.LOG_LEVEL_WARN]: "warn",
  [DEBUG_LEVELS.INFO]: "info",
  [DEBUG_LEVELS.LOG_LEVEL_INFO]: "info",
  [DEBUG_LEVELS.VERBOSE]: "debug",
  [DEBUG_LEVELS.LOG_LEVEL_DEBUG]: "debug",
  [DEBUG_LEVELS.LOG_LEVEL_TRACE]: "trace",
  [DEBUG_LEVELS.NONE]: "silent",
  [DEBUG_LEVELS.LOG_LEVEL_SILENT]: "silent"
};

// Determine log level from environment variables
// Priority: LOG_LEVEL > DEBUG_LEVEL > default 'info'
if (envLogLevel && pinoLevels.includes(envLogLevel)) {
  // Use LOG_LEVEL if it's a valid Pino level
  currentLogLevelName = envLogLevel;
} else if (process.env.DEBUG_LEVEL) {
  // Try to map DEBUG_LEVEL to a Pino level
  const mappedLevel = debugLevelToPino[process.env.DEBUG_LEVEL];
  if (mappedLevel) {
    currentLogLevelName = mappedLevel;
  } else {
    // Fallback to info level with a warning if DEBUG_LEVEL is invalid
    console.warn(`Invalid DEBUG_LEVEL: ${process.env.DEBUG_LEVEL}, defaulting to 'info'`);
  }
}

/**
 * Pino logger configuration options.
 * @type {import('pino').LoggerOptions}
 */
const loggerOptions = {
  level: currentLogLevelName, // Set the minimum log level
  // Add additional Pino options here as needed
};

// Enable pretty printing in non-production environments
if (process.env.NODE_ENV !== "production") {
  loggerOptions.transport = {
    target: "pino-pretty", // Use pino-pretty for human-readable logs
    options: {
      colorize: true, // Add colors to log output
      translateTime: "SYS:yyyy-mm-dd HH:MM:ss", // Format timestamps
      ignore: "pid,hostname", // Remove unnecessary fields
    },
  };
}

/**
 * The main Pino logger instance for the application.
 * This instance is used for structured logging throughout the server.
 * @type {import('pino').Logger}
 * @see {@link module:src/server}
 * @see {@link module:src/db/gameRepository}
 * @see {@link module:src/game/logic/validation-core}
 * @see {@link module:src/game/phases/biddingPhase}
 * @see {@link module:src/game/phases/goAlonePhase}
 * @see {@link module:src/game/phases/lobbyPhase}
 * @see {@link module:src/game/phases/scoringPhase}
 * @see {@link module:src/game/phases/startNewHandPhase}
 * @see {@link module:src/socket/index}
 * @see {@link module:src/socket/handlers/biddingHandlers}
 * @see {@link module:src/socket/handlers/gameOverHandlers}
 * @see {@link module:src/socket/handlers/goAloneHandlers}
 * @see {@link module:src/socket/handlers/lobbyHandlers}
 * @see {@link module:src/socket/handlers/playerConnectionHandlers}
 * @see {@link module:src/socket/handlers/playingHandlers}
 * @see {@link module:src/utils/cardUtils}
 * @see {@link module:src/utils/deck}
 * @see {@link module:src/utils/historyUtils}
 * @see {@link module:src/utils/i18n}
 * @see {@link module:src/utils/lobbyUtils}
 * @see {@link module:src/utils/players}
 * @see {@link module:src/utils/statsUtils}
 */
const logger = pino(loggerOptions);

/**
 * Centralized logging function that maps between DEBUG_LEVELS and Pino's logging methods.
 *
 * @param {string} level - Log level from DEBUG_LEVELS (e.g., 'LOG_LEVEL_ERROR')
 * @param {string} message - The log message
 * @param {Object} [obj] - Optional object to be logged as JSON
 *
 * @example
 * log(DEBUG_LEVELS.ERROR, 'Connection failed', { error: err });
 * log(DEBUG_LEVELS.INFO, 'Server started');
 * @see {@link module:src/game/phases/endGame}
 */
function log(level, message, obj) {
  // If the logger's level is 'silent', no messages will be output regardless of the call
  // The 'log' function itself doesn't need to explicitly handle LOG_LEVEL_SILENT
  // because the underlying 'logger' instance's level is already set
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
    case DEBUG_LEVELS.WARNING:
    case DEBUG_LEVELS.LOG_LEVEL_WARN:
      if (obj) logger.warn(obj, message);
      else logger.warn(message);
      break;
    case DEBUG_LEVELS.VERBOSE:
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
 * 
 * @example
 * setDebugLevel(DEBUG_LEVELS.VERBOSE); // Will log a warning
 */
function setDebugLevel(newLevel) {
  // Map the debug level to a human-readable name for the warning message
  const levelMap = {
    [DEBUG_LEVELS.ERROR]: 'error',
    [DEBUG_LEVELS.LOG_LEVEL_ERROR]: 'error',
    [DEBUG_LEVELS.WARNING]: 'warn',
    [DEBUG_LEVELS.LOG_LEVEL_WARN]: 'warn',
    [DEBUG_LEVELS.INFO]: 'info',
    [DEBUG_LEVELS.LOG_LEVEL_INFO]: 'info',
    [DEBUG_LEVELS.VERBOSE]: 'debug',
    [DEBUG_LEVELS.LOG_LEVEL_DEBUG]: 'debug',
    [DEBUG_LEVELS.LOG_LEVEL_TRACE]: 'trace',
    [DEBUG_LEVELS.NONE]: 'silent',
    [DEBUG_LEVELS.LOG_LEVEL_SILENT]: 'silent'
  };
  
  const levelName = levelMap[newLevel] || 'info';
  
  // Log a warning that the level can only be set at initialization
  logger.warn(
    `Attempted to set debug level to ${newLevel} (${levelName}) dynamically. ` +
    `Pino logger level ('${logger.level}') is set at initialization. ` +
    'Restart with new LOG_LEVEL or DEBUG_LEVEL env var to change.'
  );
}

/**
 * Exports the main logger instance and utility functions.
 * @type {{
 *   logger: import('pino').Logger,
 *   log: function(string, string, Object): void,
 *   setDebugLevel: function(string): void
 * }}
 */
export { logger, log, setDebugLevel };
// Default export for backward compatibility
export default logger;