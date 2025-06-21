/**
 * Logger utility for the Euchre game server.
 * Uses Pino for asynchronous and structured logging.
 * @module logger
 */
import pino from 'pino';
import { DEBUG_LEVELS } from '../config/constants.js';

let currentLogLevelName = 'info';
const envLogLevel = process.env.LOG_LEVEL?.toLowerCase();
const pinoLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

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
        currentLogLevelName = 'debug';
        break;
    }
  }
}

const loggerOptions = {
  level: currentLogLevelName,
};

if (process.env.NODE_ENV !== 'production') {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
      ignore: 'pid,hostname',
    },
  };
}

const logger = pino(loggerOptions);

/**
 * Centralized logging function (compatibility wrapper).
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
 * Sets the debug level for the logger. (Logs a warning - level set at init)
 */
function setDebugLevel(newLevel) {
  let levelName = 'info';
  for (const key in DEBUG_LEVELS) {
    if (DEBUG_LEVELS[key] === newLevel) {
      levelName = key.toLowerCase();
      if (levelName === 'verbose') levelName = 'debug';
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
export default logger;
