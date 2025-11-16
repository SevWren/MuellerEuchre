/**
 * Unit tests for the logger utility in the Euchre Multiplayer game.
 * @module test/utils/logger.unit.test
 * @description
 *   Comprehensive test suite for the logging functionality including:
 *   - Log level determination from environment variables
 *   - Logger creation with redaction support
 *   - Logging at different severity levels
 *   - Dynamic log level changes
 *
 * @see {@link module:src/utils/logger} for the implementation being tested
 * @see {@link module:src/config/constants} for DEBUG_LEVELS constant
 *
 * @llm-instruction
 *   **CRITICAL-DO-NOT-VIOLATE:** Under NO circumstances should you attempt to mock the `pino`
 *   library directly (e.g., `import * as pino from "pino"`). This is a
 *   fundamentally flawed and failed approach within this project's testing
 *   architecture. The correct and only approved pattern for testing this module is to
 *   use the `createLoggerModule` factory from `test/__mocks__/utils/logger.js` to
 *   inject mocked dependencies, as demonstrated in this file.
 *   Directly mocking `pino` will break the tests.
 */

import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import pino from "pino"; // Import real pino for the integration-style test
import { DEBUG_LEVELS } from "../../src/config/constants.js";
import { createLoggerModule } from "../__mocks__/utils/logger.js";

describe("Logger Utility (Unit Tests with Mock Factory)", () => {
  let mockPinoInstance;
  let mockPino;
  let mockProcess;
  let mockConsole;

  // Suite-level variables for the module's exports, created fresh for each test
  let log, setDebugLevel, logger, getLogLevelFromEnv, createLogger;

  beforeEach(() => {
    mockPinoInstance = {
      error: mock.fn(),
      warn: mock.fn(),
      info: mock.fn(),
      debug: mock.fn(),
      trace: mock.fn(),
      level: "info",
    };
    // pino itself is a factory function
    mockPino = mock.fn(() => mockPinoInstance);
    mockProcess = {
      env: {},
    };
    mockConsole = {
      warn: mock.fn(),
    };

    // Create a testable instance of the logger module by injecting mocks
    const loggerModuleInstance = createLoggerModule({
      pino: mockPino,
      process: mockProcess,
      console: mockConsole,
    });

    // Assign the exports to our suite-level variables
    log = loggerModuleInstance.log;
    setDebugLevel = loggerModuleInstance.setDebugLevel;
    logger = loggerModuleInstance.logger;
    getLogLevelFromEnv = loggerModuleInstance.getLogLevelFromEnv;
    createLogger = loggerModuleInstance.createLogger;
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe("getLogLevelFromEnv()", () => {
    it("should prioritize LOG_LEVEL over DEBUG_LEVEL", () => {
      const env = { LOG_LEVEL: "error", DEBUG_LEVEL: DEBUG_LEVELS.DEBUG };
      const { level } = getLogLevelFromEnv(env);
      assert.strictEqual(level, "error");
    });

    it("should use LOG_LEVEL when it is a valid pino level", () => {
      const env = { LOG_LEVEL: "warn" };
      const { level, warning } = getLogLevelFromEnv(env);
      assert.strictEqual(level, "warn");
      assert.strictEqual(warning, null);
    });

    it('should use default "info" level when no variables are set', () => {
      const { level } = getLogLevelFromEnv({});
      assert.strictEqual(level, "info");
    });

    it("should return a warning for an invalid DEBUG_LEVEL", () => {
      const { level, warning } = getLogLevelFromEnv({
        DEBUG_LEVEL: "INVALID",
      });
      assert.strictEqual(level, "info");
      assert.strictEqual(
        warning,
        "Invalid DEBUG_LEVEL: INVALID, defaulting to 'info'"
      );
    });

    it("should correctly map DEBUG_LEVELS.DEBUG to 'debug'", () => {
      const env = { DEBUG_LEVEL: DEBUG_LEVELS.DEBUG };
      const { level, warning } = getLogLevelFromEnv(env);
      assert.strictEqual(level, "debug");
      assert.strictEqual(warning, null);
    });

    it('should correctly map DEBUG_LEVELS.INFO to "info"', () => {
      const env = { DEBUG_LEVEL: DEBUG_LEVELS.INFO };
      const { level } = getLogLevelFromEnv(env);
      assert.strictEqual(level, "info");
    });
  });

  describe("createLogger()", () => {
    it("should create a logger with redaction paths", () => {
      return new Promise((resolve, reject) => {
        const logObject = { hand: ["AS", "KS"], other: "data" };
        const stream = new Writable({
          write(chunk, encoding, callback) {
            try {
              const log = JSON.parse(chunk.toString());
              assert.strictEqual(log.hand, "[Redacted]");
              assert.strictEqual(log.other, "data");
              resolve();
            } catch (err) {
              reject(err);
            }
            callback();
          },
        });
        // We use the *real* pino for this integration-style test of createLogger
        const realPinoLogger = createLoggerModule({
          pino, // native pino
          process: mockProcess,
          console: mockConsole,
        }).createLogger({ level: "info", redact: ["hand"] }, stream);

        realPinoLogger.info(logObject);
      });
    });

    it("should configure pino-pretty transport when prettyPrint is true", () => {
      // Reset calls from beforeEach setup to isolate this test's action
      mockPino.mock.resetCalls();

      createLogger({ prettyPrint: true });
      assert.strictEqual(mockPino.mock.callCount(), 1);
      const [options] = mockPino.mock.calls[0].arguments;
      assert.deepStrictEqual(options.transport, {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:yyyy-mm-dd HH:MM:ss",
          ignore: "pid,hostname",
        },
      });
    });

    it("should create a logger that writes to stdout by default", () => {
      // Reset calls from beforeEach setup to isolate this test's action
      mockPino.mock.resetCalls();

      assert.doesNotThrow(() => createLogger());
      assert.strictEqual(mockPino.mock.callCount(), 1);
      const [, destination] = mockPino.mock.calls[0].arguments;
      assert.strictEqual(destination, undefined);
    });
  });

  describe("Module Initialization", () => {
    it("should log a startup warning if DEBUG_LEVEL is invalid", () => {
      mockProcess.env = { DEBUG_LEVEL: "INVALID_LEVEL" };
      createLoggerModule({
        pino: mockPino,
        process: mockProcess,
        console: mockConsole,
      });

      assert.strictEqual(mockConsole.warn.mock.callCount(), 1);
      const [warningMessage] = mockConsole.warn.mock.calls[0].arguments;
      assert.match(warningMessage, /Invalid DEBUG_LEVEL: INVALID_LEVEL/);
    });

    it("should not log a startup warning if log levels are valid", () => {
      mockProcess.env = { LOG_LEVEL: "info" };
      createLoggerModule({
        pino: mockPino,
        process: mockProcess,
        console: mockConsole,
      });
      assert.strictEqual(mockConsole.warn.mock.callCount(), 0);
    });
  });

  describe("log() Function", () => {
    const testObj = { data: "test" };

    it("should call logger.error for ERROR level", () => {
      log(DEBUG_LEVELS.ERROR, "error message", testObj);
      assert.strictEqual(mockPinoInstance.error.mock.callCount(), 1);
      assert.deepStrictEqual(mockPinoInstance.error.mock.calls[0].arguments, [
        testObj,
        "error message",
      ]);
    });

    it("should call logger.error for LOG_LEVEL_ERROR level", () => {
      log(DEBUG_LEVELS.LOG_LEVEL_ERROR, "error message alt");
      assert.strictEqual(mockPinoInstance.error.mock.callCount(), 1);
    });

    it("should call logger.warn for WARN level", () => {
      log(DEBUG_LEVELS.WARN, "warn message", testObj);
      assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 1);
    });

    it("should call logger.warn for LOG_LEVEL_WARN level", () => {
      log(DEBUG_LEVELS.LOG_LEVEL_WARN, "warn message alt");
      assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 1);
    });

    it("should call logger.info for INFO level", () => {
      log(DEBUG_LEVELS.INFO, "info message", testObj);
      assert.strictEqual(mockPinoInstance.info.mock.callCount(), 1);
    });

    it("should call logger.info for LOG_LEVEL_INFO level", () => {
      log(DEBUG_LEVELS.LOG_LEVEL_INFO, "info message alt");
      assert.strictEqual(mockPinoInstance.info.mock.callCount(), 1);
    });

    it("should call logger.debug for DEBUG level", () => {
      log(DEBUG_LEVELS.DEBUG, "debug message", testObj);
      assert.strictEqual(mockPinoInstance.debug.mock.callCount(), 1);
      assert.deepStrictEqual(mockPinoInstance.debug.mock.calls[0].arguments, [
        testObj,
        "debug message",
      ]);
    });

    it("should call logger.debug for LOG_LEVEL_DEBUG level", () => {
      log(DEBUG_LEVELS.LOG_LEVEL_DEBUG, "debug message alt");
      assert.strictEqual(mockPinoInstance.debug.mock.callCount(), 1);
    });

    it("should call logger.trace for TRACE level", () => {
      log(DEBUG_LEVELS.LOG_LEVEL_TRACE, "trace message", testObj);
      assert.strictEqual(mockPinoInstance.trace.mock.callCount(), 1);
      assert.deepStrictEqual(mockPinoInstance.trace.mock.calls[0].arguments, [
        testObj,
        "trace message",
      ]);
    });

    it("should call no logger method for SILENT level", () => {
      log(DEBUG_LEVELS.LOG_LEVEL_SILENT, "silent message", testObj);
      assert.strictEqual(mockPinoInstance.error.mock.callCount(), 0);
      assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 0);
      assert.strictEqual(mockPinoInstance.info.mock.callCount(), 0);
      assert.strictEqual(mockPinoInstance.debug.mock.callCount(), 0);
      assert.strictEqual(mockPinoInstance.trace.mock.callCount(), 0);
    });

    it("should call no logger method for NONE level", () => {
      log(DEBUG_LEVELS.NONE, "none message", testObj);
      assert.strictEqual(mockPinoInstance.error.mock.callCount(), 0);
      assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 0);
      assert.strictEqual(mockPinoInstance.info.mock.callCount(), 0);
      assert.strictEqual(mockPinoInstance.debug.mock.callCount(), 0);
      assert.strictEqual(mockPinoInstance.trace.mock.callCount(), 0);
    });

    it("should handle context argument correctly", () => {
      const context = "game-logic";
      log(DEBUG_LEVELS.INFO, "message with context", testObj, context);
      assert.strictEqual(mockPinoInstance.info.mock.callCount(), 1);
      const [loggedObj] = mockPinoInstance.info.mock.calls[0].arguments;
      assert.deepStrictEqual(loggedObj, { ...testObj, context });
    });

    it("should fall back to info for an unknown log level", () => {
      log("UNKNOWN_LEVEL", "unknown level message");
      assert.strictEqual(mockPinoInstance.info.mock.callCount(), 1);
      const [loggedObj, message] =
        mockPinoInstance.info.mock.calls[0].arguments;
      assert.deepStrictEqual(loggedObj, {});
      assert.strictEqual(
        message,
        "Unknown log level (UNKNOWN_LEVEL): unknown level message"
      );
    });

    it("should handle logging without an object", () => {
      log(DEBUG_LEVELS.INFO, "message without object");
      assert.strictEqual(mockPinoInstance.info.mock.callCount(), 1);
      const [loggedObj, message] =
        mockPinoInstance.info.mock.calls[0].arguments;
      assert.deepStrictEqual(loggedObj, {});
      assert.strictEqual(message, "message without object");
    });
  });

  describe("setDebugLevel() Function", () => {
    const levelMappings = [
      { key: DEBUG_LEVELS.ERROR, pinoLevel: "error" },
      { key: DEBUG_LEVELS.LOG_LEVEL_ERROR, pinoLevel: "error" },
      { key: DEBUG_LEVELS.WARN, pinoLevel: "warn" },
      { key: DEBUG_LEVELS.LOG_LEVEL_WARN, pinoLevel: "warn" },
      { key: DEBUG_LEVELS.INFO, pinoLevel: "info" },
      { key: DEBUG_LEVELS.LOG_LEVEL_INFO, pinoLevel: "info" },
      { key: DEBUG_LEVELS.DEBUG, pinoLevel: "debug" },
      { key: DEBUG_LEVELS.LOG_LEVEL_DEBUG, pinoLevel: "debug" },
      { key: DEBUG_LEVELS.TRACE, pinoLevel: "trace" },
      { key: DEBUG_LEVELS.LOG_LEVEL_TRACE, pinoLevel: "trace" },
      { key: DEBUG_LEVELS.NONE, pinoLevel: "silent" },
      { key: DEBUG_LEVELS.LOG_LEVEL_SILENT, pinoLevel: "silent" },
    ];

    for (const { key, pinoLevel } of levelMappings) {
      it(`should set logger level to '${pinoLevel}' for key '${key}'`, () => {
        setDebugLevel(key);
        assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 1);
        assert.strictEqual(logger.level, pinoLevel);
      });
    }

    it("should handle unknown log levels gracefully by defaulting to info", () => {
      setDebugLevel("UNKNOWN_LEVEL");
      assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 1);
      assert.strictEqual(logger.level, "info");
    });
  });
});
