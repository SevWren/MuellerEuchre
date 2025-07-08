/**
 * src/utils/logger.js
 * @file logger.js
 * @description Logger utility for the Euchre game server.
 * Provides a centralized logging solution using Pino for high-performance,
 * structured JSON logging with pretty-printing in development.
 *
 * Log levels can be configured via environment variables:
 * - LOG_LEVEL: Directly set Pino log level (fatal, error, warn, info, debug, trace)
 * - DEBUG_LEVEL: Numeric log level using DEBUG_LEVELS constants
 *
 * @module logger
 * @see {@link module:constants.DEBUG_LEVELS} for available log levels
 */

import pino from "pino";
import { DEBUG_LEVELS } from "../config/constants.js";

// Initialize default log level from environment variables
let currentLogLevelName = "info";
const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
const pinoLevels = ["fatal", "error", "warn", "info", "debug", "trace"];

// Determine log level from environment variables
// Priority: LOG_LEVEL > DEBUG_LEVEL > default 'info'
if (envLogLevel && pinoLevels.includes(envLogLevel)) {
  // Use LOG_LEVEL if it's a valid Pino level
  currentLogLevelName = envLogLevel;
} else {
  // Fall back to DEBUG_LEVEL if provided
  const debugLevelNum = parseInt(process.env.DEBUG_LEVEL, 10);
  if (!isNaN(debugLevelNum)) {
    // Map numeric debug levels to Pino log levels
    switch (debugLevelNum) {
      case DEBUG_LEVELS.ERROR:
        currentLogLevelName = "error";
        break;
      case DEBUG_LEVELS.INFO:
        currentLogLevelName = "info";
        break;
      case DEBUG_LEVELS.WARNING:
        currentLogLevelName = "warn";
        break;
      case DEBUG_LEVELS.VERBOSE:
        currentLogLevelName = "debug";
        break;
      // Default case handled by initial value
    }
  }
}

/**
 * Pino logger configuration
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

// Create the Pino logger instance
const logger = pino(loggerOptions);

/**
 * Centralized logging function that provides a compatibility layer
 * between numeric debug levels and Pino's logging methods.
 *
 * @param {number} level - Numeric log level from DEBUG_LEVELS
 * @param {string} message - The log message
 * @param {Object} [obj] - Optional object to be logged as JSON
 *
 * @example
 * log(DEBUG_LEVELS.ERROR, 'Connection failed', { error: err });
 * log(DEBUG_LEVELS.INFO, 'Server started');
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
 * @param {number} newLevel - The new debug level from DEBUG_LEVELS
 *
 * @example
 * setDebugLevel(DEBUG_LEVELS.VERBOSE); // Will log a warning
 */
function setDebugLevel(newLevel) {
  // Convert numeric level to level name for the warning message
  let levelName = "info";
  for (const key in DEBUG_LEVELS) {
    if (DEBUG_LEVELS[key] === newLevel) {
      levelName = key.toLowerCase();
      // Map 'verbose' to 'debug' as Pino doesn't have a 'verbose' level
      if (levelName === "verbose") levelName = "debug";
      break;
    }
  }

  // Log a helpful warning message
  logger.warn(
    `Attempted to set debug level to ${newLevel} (${levelName}) dynamically. ` +
      `Pino logger level ('${logger.level}') is set at initialization. ` +
      `Restart with new LOG_LEVEL or DEBUG_LEVEL env var to change.`,
  );
}

// Export both the logger instance and utility functions
export { logger, log, setDebugLevel };
// Default export for backward compatibility
export default logger;
