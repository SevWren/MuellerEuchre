/**
 * @file test/__mocks__/utils/logger.js
 * @description Mock factory for the logger utility, enabling dependency injection for testing.
 * This file re-implements the logic of `src/utils/logger.js` in a factory pattern
 * to allow `pino`, `process`, and `console` to be mocked during tests. This is the
 * sanctioned method for testing modules with top-level dependencies.
 */
import { DEBUG_LEVELS } from "../../../src/config/constants.js";

// This factory creates a testable instance of the entire logger module.
export function createLoggerModule({ pino, process, console }) {
  // --- Re-implementation of logger.js logic using injected dependencies ---

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
    [DEBUG_LEVELS.LOG_LEVEL_SILENT]: "silent",
  };

  function createLogger(
    { level = "info", prettyPrint = false, redact = [] } = {},
    destination
  ) {
    const loggerOptions = { level, redact };
    if (prettyPrint) {
      // CORRECTED: This now matches the real implementation in src/utils/logger.js
      loggerOptions.transport = {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      };
    }
    return pino(loggerOptions, destination);
  }

  function getLogLevelFromEnv(env) {
    const envLogLevel = env.LOG_LEVEL?.toLowerCase();
    const pinoLevels = [
      "fatal",
      "error",
      "warn",
      "info",
      "debug",
      "trace",
      "silent",
    ];
    if (envLogLevel && pinoLevels.includes(envLogLevel)) {
      return { level: envLogLevel, warning: null };
    }
    if (env.DEBUG_LEVEL) {
      const mappedLevel = debugLevelToPino[env.DEBUG_LEVEL];
      if (mappedLevel) {
        return { level: mappedLevel, warning: null };
      }
      return {
        level: "info",
        warning: `Invalid DEBUG_LEVEL: ${env.DEBUG_LEVEL}, defaulting to 'info'`,
      };
    }
    return { level: "info", warning: null };
  }

  const { level: currentLogLevelName, warning: startupWarning } =
    getLogLevelFromEnv(process.env);
  const isProduction = process.env.NODE_ENV === "production";

  if (startupWarning) {
    console.warn(startupWarning);
  }

  const logger = createLogger({
    level: currentLogLevelName,
    prettyPrint: !isProduction,
    redact: ["hand"],
  });

  function log(level, message, obj, context) {
    const logObject = obj ? { ...obj } : {};
    if (context) {
      logObject.context = context;
    }
    switch (level) {
      case DEBUG_LEVELS.ERROR:
      case DEBUG_LEVELS.LOG_LEVEL_ERROR:
        logger.error(logObject, message);
        break;
      case DEBUG_LEVELS.INFO:
      case DEBUG_LEVELS.LOG_LEVEL_INFO:
        logger.info(logObject, message);
        break;
      case DEBUG_LEVELS.WARN:
      case DEBUG_LEVELS.LOG_LEVEL_WARN:
        logger.warn(logObject, message);
        break;
      case DEBUG_LEVELS.DEBUG:
      case DEBUG_LEVELS.LOG_LEVEL_DEBUG:
        logger.debug(logObject, message);
        break;
      case DEBUG_LEVELS.LOG_LEVEL_TRACE:
        logger.trace(logObject, message);
        break;
      case DEBUG_LEVELS.NONE:
      case DEBUG_LEVELS.LOG_LEVEL_SILENT:
        break;
      default:
        const unknownLevelMessage = `Unknown log level (${level}): ${message}`;
        logger.info(logObject, unknownLevelMessage);
    }
  }

  function setDebugLevel(newLevel) {
    const levelMap = {
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
      [DEBUG_LEVELS.LOG_LEVEL_SILENT]: "silent",
    };
    const levelName = levelMap[newLevel] || "info";
    logger.warn(
      `Attempted to set debug level to ${newLevel} (${levelName}) dynamically. Pino logger level ('${logger.level}') is set at initialization. Restart with new LOG_LEVEL or DEBUG_LEVEL env var to change.`
    );
    logger.level = levelName;
  }

  return { logger, log, setDebugLevel, createLogger, getLogLevelFromEnv };
}
