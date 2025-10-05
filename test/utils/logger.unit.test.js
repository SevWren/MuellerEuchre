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
 */

import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { DEBUG_LEVELS } from "../../src/config/constants.js";
import { createLoggerModule } from "../__mocks__/utils/logger.js";

/**
 * Main test suite for the Logger utility.
 * @namespace LoggerUtilityTests
 */
describe("Logger Utility", () => {
  /**
   * Tests for pure functions that don't require module mocks.
   * @namespace PureFunctionTests
   */
  describe("Pure Function Tests (No Mocks)", async () => {
    const { getLogLevelFromEnv, createLogger } = await import(
      "../../src/utils/logger.js"
    );

    /**
     * Tests for the getLogLevelFromEnv function which determines log level from environment variables.
     * @namespace GetLogLevelFromEnvTests
     */
    describe("getLogLevelFromEnv", () => {
      it("should prioritize LOG_LEVEL over DEBUG_LEVEL", () => {
        const env = { LOG_LEVEL: "error", DEBUG_LEVEL: DEBUG_LEVELS.DEBUG };
        const { level } = getLogLevelFromEnv(env);
        assert.strictEqual(level, "error");
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

      it('should correctly map DEBUG_LEVELS.INFO to "info"', () => {
        const env = { DEBUG_LEVEL: DEBUG_LEVELS.INFO };
        const { level } = getLogLevelFromEnv(env);
        assert.strictEqual(level, "info");
      });
    });

    /**
     * Tests for the createLogger factory function.
     * @namespace CreateLoggerTests
     */
    describe("createLogger (Factory Test)", () => {
      it("should create a logger with redaction paths", (t, done) => {
        const logObject = { hand: ["AS", "KS"], other: "data" };
        const stream = new Writable({
          write(chunk, encoding, callback) {
            try {
              const log = JSON.parse(chunk.toString());
              assert.strictEqual(log.hand, "[Redacted]");
              assert.strictEqual(log.other, "data");
              done();
            } catch (err) {
              done(err);
            }
            callback();
          },
        });
        const testLogger = createLogger(
          { level: "info", redact: ["hand"] },
          stream
        );
        testLogger.info(logObject);
      });

      it("should configure pino-pretty transport when prettyPrint is true", () => {
        assert.doesNotThrow(() => createLogger({ prettyPrint: true }));
      });

      it("should create a logger that writes to stdout by default", () => {
        assert.doesNotThrow(() => createLogger());
      });
    });
  });

  /**
   * Tests for module initialization and runtime behavior using mocks.
   * @namespace ModuleBehaviorTests
   */
  describe("Module Initialization and Runtime Behavior", () => {
    /** @type {Object} Mock Pino logger instance */
    let mockPinoInstance;

    /** @type {import('sinon').SinonStub} Mock Pino constructor */
    let mockPino;

    /** @type {Object} Mock process.env object */
    let mockProcess;

    /** @type {Object} Mock console object */
    let mockConsole;

    beforeEach(() => {
      mockPinoInstance = {
        error: mock.fn(),
        warn: mock.fn(),
        info: mock.fn(),
        debug: mock.fn(),
        trace: mock.fn(),
        level: "info",
      };
      mockPino = mock.fn(() => mockPinoInstance);
      mockProcess = { env: {} };
      mockConsole = { warn: mock.fn() };
    });

    afterEach(() => {
      mock.restoreAll();
    });

    it("should log a startup warning if DEBUG_LEVEL is invalid", () => {
      mockProcess.env.DEBUG_LEVEL = "INVALID_LEVEL";
      createLoggerModule({
        pino: mockPino,
        process: mockProcess,
        console: mockConsole,
      });
      assert.strictEqual(mockConsole.warn.mock.callCount(), 1);
      const [warningMessage] = mockConsole.warn.mock.calls[0].arguments;
      assert.match(warningMessage, /Invalid DEBUG_LEVEL: INVALID_LEVEL/);
    });

    /**
     * Tests for the log() function's behavior with different log levels.
     * @namespace LogFunctionTests
     */
    describe("log() Function", () => {
      it("should call the appropriate logger method for each level", () => {
        const { log } = createLoggerModule({
          pino: mockPino,
          process: mockProcess,
          console: mockConsole,
        });
        const testObj = { data: "test" };

        log(DEBUG_LEVELS.ERROR, "error message", testObj);
        assert.strictEqual(mockPinoInstance.error.mock.callCount(), 1);
        assert.deepStrictEqual(mockPinoInstance.error.mock.calls[0].arguments, [
          testObj,
          "error message",
        ]);

        log(DEBUG_LEVELS.WARN, "warn message", testObj);
        assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 1);

        log(DEBUG_LEVELS.DEBUG, "debug message", testObj);
        assert.strictEqual(mockPinoInstance.debug.mock.callCount(), 1);
        assert.deepStrictEqual(mockPinoInstance.debug.mock.calls[0].arguments, [
          testObj,
          "debug message",
        ]);

        log(DEBUG_LEVELS.LOG_LEVEL_TRACE, "trace message", testObj);
        assert.strictEqual(mockPinoInstance.trace.mock.callCount(), 1);
        assert.deepStrictEqual(mockPinoInstance.trace.mock.calls[0].arguments, [
          testObj,
          "trace message",
        ]);

        // Reset mocks before testing silent
        mockPinoInstance.error.mock.resetCalls();
        mockPinoInstance.warn.mock.resetCalls();
        mockPinoInstance.info.mock.resetCalls();
        mockPinoInstance.debug.mock.resetCalls();
        mockPinoInstance.trace.mock.resetCalls();

        log(DEBUG_LEVELS.LOG_LEVEL_SILENT, "silent message", testObj);
        assert.strictEqual(mockPinoInstance.error.mock.callCount(), 0);
        assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 0);
        assert.strictEqual(mockPinoInstance.info.mock.callCount(), 0);
        assert.strictEqual(mockPinoInstance.debug.mock.callCount(), 0);
        assert.strictEqual(mockPinoInstance.trace.mock.callCount(), 0);
      });

      it("should handle context argument correctly", () => {
        const { log } = createLoggerModule({
          pino: mockPino,
          process: mockProcess,
          console: mockConsole,
        });
        const testObj = { data: "payload" };
        const context = "game-logic";
        log(DEBUG_LEVELS.INFO, "message with context", testObj, context);
        assert.strictEqual(mockPinoInstance.info.mock.callCount(), 1);
        const [loggedObj] = mockPinoInstance.info.mock.calls[0].arguments;
        assert.deepStrictEqual(loggedObj, { ...testObj, context });
      });

      it("should fall back to info for an unknown log level", () => {
        const { log } = createLoggerModule({
          pino: mockPino,
          process: mockProcess,
          console: mockConsole,
        });
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
        const { log } = createLoggerModule({
          pino: mockPino,
          process: mockProcess,
          console: mockConsole,
        });
        log(DEBUG_LEVELS.INFO, "message without object");
        assert.strictEqual(mockPinoInstance.info.mock.callCount(), 1);
        const [loggedObj, message] =
          mockPinoInstance.info.mock.calls[0].arguments;
        assert.deepStrictEqual(loggedObj, {});
        assert.strictEqual(message, "message without object");
      });
    });

    /**
     * Tests for the setDebugLevel() function's ability to change log levels at runtime.
     * @namespace SetDebugLevelTests
     */
    describe("setDebugLevel() Function", () => {
      it("should log a warning and change the logger level property", () => {
        const { logger, setDebugLevel } = createLoggerModule({
          pino: mockPino,
          process: mockProcess,
          console: mockConsole,
        });
        setDebugLevel(DEBUG_LEVELS.LOG_LEVEL_DEBUG);
        assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 1);
        assert.strictEqual(logger.level, "debug");
      });

      it("should handle unknown log levels gracefully", () => {
        const { logger, setDebugLevel } = createLoggerModule({
          pino: mockPino,
          process: mockProcess,
          console: mockConsole,
        });
        setDebugLevel("UNKNOWN_LEVEL");
        assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 1);
        assert.strictEqual(logger.level, "info");
      });
    });
  });

  it("should have a default export that is the same as the named logger export", async () => {
    const { logger, default: defaultLogger } = await import(
      "../../src/utils/logger.js"
    );
    assert.strictEqual(defaultLogger, logger);
  });
});
