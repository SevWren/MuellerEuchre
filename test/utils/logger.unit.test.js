/**
 * @file Unit tests for the logger utility in the Euchre Multiplayer game.
 * @module test/utils/logger.unit.test
 * @description
 *   Comprehensive test suite for the logging system including:
 *   - Logger initialization and configuration
 *   - Log level setting from environment variables
 *   - Log message formatting and routing
 *   - Debug level mapping functionality
 *   - Environment-specific configurations
 *   - Edge cases and error conditions
 *   - 100% Coverage
 * @see {@link module:src/utils/logger} for the implementation being tested
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { DEBUG_LEVELS } from '../../src/config/constants.js';
// Import the new testable functions from the refactored logger
import { logger, log, setDebugLevel, getLogLevelFromEnv, createLogger } from '../../src/utils/logger.js';

describe('Logger Utility', () => {
  // Store original console.warn to mock it in specific tests
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    // Clear any existing mocks
    mock.restoreAll();
    // Restore console.warn in case a test mocked it
    console.warn = originalConsoleWarn;
  });

  afterEach(() => {
    // Restore all mocks
    mock.restoreAll();
    console.warn = originalConsoleWarn;
  });

  describe('Exports', () => {
    it('should export the expected functions', () => {
      assert.strictEqual(typeof logger, 'object', 'logger should be an object');
      assert.strictEqual(typeof log, 'function', 'log should be a function');
      assert.strictEqual(typeof setDebugLevel, 'function', 'setDebugLevel should be a function');
      assert.strictEqual(typeof createLogger, 'function', 'createLogger should be a function');
      assert.strictEqual(typeof getLogLevelFromEnv, 'function', 'getLogLevelFromEnv should be a function');
    });
  });

  describe('getLogLevelFromEnv (Pure Function Test)', () => {
    it('should prioritize LOG_LEVEL over DEBUG_LEVEL', () => {
      const env = { LOG_LEVEL: 'error', DEBUG_LEVEL: DEBUG_LEVELS.DEBUG };
      const { level } = getLogLevelFromEnv(env);
      assert.strictEqual(level, 'error');
    });

    it('should use default "info" level when no variables are set', () => {
      const { level } = getLogLevelFromEnv({});
      assert.strictEqual(level, 'info');
    });

    it('should return a warning for an invalid DEBUG_LEVEL', () => {
      const { level, warning } = getLogLevelFromEnv({ DEBUG_LEVEL: 'INVALID' });
      assert.strictEqual(level, 'info');
      assert.strictEqual(warning, "Invalid DEBUG_LEVEL: INVALID, defaulting to 'info'");
    });

    const pinoLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];
    for (const pinoLevel of pinoLevels) {
      it(`should correctly use LOG_LEVEL=${pinoLevel}`, () => {
        const { level } = getLogLevelFromEnv({ LOG_LEVEL: pinoLevel });
        assert.strictEqual(level, pinoLevel);
      });
    }

    const debugLevelMappings = [
      { debugLevel: DEBUG_LEVELS.ERROR, expected: 'error' },
      { debugLevel: DEBUG_LEVELS.LOG_LEVEL_WARN, expected: 'warn' },
      { debugLevel: DEBUG_LEVELS.LOG_LEVEL_INFO, expected: 'info' },
      { debugLevel: DEBUG_LEVELS.LOG_LEVEL_DEBUG, expected: 'debug' },
      { debugLevel: DEBUG_LEVELS.LOG_LEVEL_TRACE, expected: 'trace' },
      { debugLevel: DEBUG_LEVELS.LOG_LEVEL_SILENT, expected: 'silent' },
    ];

    for (const { debugLevel, expected } of debugLevelMappings) {
      it(`should map DEBUG_LEVEL=${debugLevel} to Pino level '${expected}'`, () => {
        const { level } = getLogLevelFromEnv({ DEBUG_LEVEL: debugLevel });
        assert.strictEqual(level, expected);
      });
    }
  });

  describe('log() Function', () => {
    it('should call the appropriate logger method based on log level', () => {
      // Mock the methods on the singleton logger instance for this test suite
      const errorSpy = mock.method(logger, 'error', () => {});
      const warnSpy = mock.method(logger, 'warn', () => {});
      const infoSpy = mock.method(logger, 'info', () => {});
      const debugSpy = mock.method(logger, 'debug', () => {});
      const traceSpy = mock.method(logger, 'trace', () => {});

      log(DEBUG_LEVELS.LOG_LEVEL_ERROR, 'error message');
      assert.strictEqual(errorSpy.mock.callCount(), 1);

      log(DEBUG_LEVELS.LOG_LEVEL_WARN, 'warn message');
      assert.strictEqual(warnSpy.mock.callCount(), 1);

      log(DEBUG_LEVELS.LOG_LEVEL_INFO, 'info message');
      assert.strictEqual(infoSpy.mock.callCount(), 1);

      log(DEBUG_LEVELS.LOG_LEVEL_DEBUG, 'debug message');
      assert.strictEqual(debugSpy.mock.callCount(), 1);

      log(DEBUG_LEVELS.LOG_LEVEL_TRACE, 'trace message');
      assert.strictEqual(traceSpy.mock.callCount(), 1);
    });

    it('should pass message and object correctly to the underlying logger method', () => {
      const infoSpy = mock.method(logger, 'info', () => {});
      const testObj = { gameId: '123' };
      const testMsg = 'Player connected';

      log(DEBUG_LEVELS.INFO, testMsg, testObj);

      assert.strictEqual(infoSpy.mock.callCount(), 1);
      const [loggedObj, loggedMsg] = infoSpy.mock.calls[0].arguments;
      assert.deepStrictEqual(loggedObj, testObj);
      assert.strictEqual(loggedMsg, testMsg);
    });

    it('should handle unknown log levels by defaulting to info (no object)', () => {
      const infoSpy = mock.method(logger, 'info', () => {});
      const testMsg = 'Some message';

      log(999, testMsg); // Use a number to guarantee it hits the default case

      assert.strictEqual(infoSpy.mock.callCount(), 1);
      const [loggedMsg] = infoSpy.mock.calls[0].arguments;
      assert.match(loggedMsg, /Unknown log level \(999\)/);
    });

    it('should handle unknown log levels by defaulting to info (with object)', () => {
      const infoSpy = mock.method(logger, 'info', () => {});
      const testMsg = 'Some message with object';
      const testObj = { data: 'payload' };

      log(999, testMsg, testObj); // Use a number to guarantee it hits the default case

      assert.strictEqual(infoSpy.mock.callCount(), 1);
      const [loggedObj, loggedMsg] = infoSpy.mock.calls[0].arguments;
      assert.deepStrictEqual(loggedObj, testObj);
      assert.match(loggedMsg, /Unknown log level \(999\)/);
    });

    it('should do nothing for LOG_LEVEL_SILENT or NONE', () => {
      const errorSpy = mock.method(logger, 'error', () => {});
      const infoSpy = mock.method(logger, 'info', () => {});
      const warnSpy = mock.method(logger, 'warn', () => {});
      const debugSpy = mock.method(logger, 'debug', () => {});
      const traceSpy = mock.method(logger, 'trace', () => {});

      log(DEBUG_LEVELS.LOG_LEVEL_SILENT, 'This should not appear');
      log(DEBUG_LEVELS.NONE, 'This should also not appear');

      assert.strictEqual(errorSpy.mock.callCount(), 0);
      assert.strictEqual(infoSpy.mock.callCount(), 0);
      assert.strictEqual(warnSpy.mock.callCount(), 0);
      assert.strictEqual(debugSpy.mock.callCount(), 0);
      assert.strictEqual(traceSpy.mock.callCount(), 0);
    });
  });

  describe('setDebugLevel() Function', () => {
    it('should log a warning when called', () => {
      const warnSpy = mock.method(logger, 'warn', () => {});

      setDebugLevel(DEBUG_LEVELS.LOG_LEVEL_DEBUG);

      assert.strictEqual(warnSpy.mock.callCount(), 1);
      const [warningMessage] = warnSpy.mock.calls[0].arguments;
      assert.match(warningMessage, /Attempted to set debug level to LOG_LEVEL_DEBUG \(debug\) dynamically/);
      assert.match(warningMessage, /Pino logger level .* is set at initialization/);
    });

    it('should handle unknown log levels gracefully in the warning message', () => {
      const warnSpy = mock.method(logger, 'warn', () => {});

      setDebugLevel('UNKNOWN_LEVEL');

      assert.strictEqual(warnSpy.mock.callCount(), 1);
      const [warningMessage] = warnSpy.mock.calls[0].arguments;
      assert.match(warningMessage, /Attempted to set debug level to UNKNOWN_LEVEL \(info\)/);
    });
  });

  describe('createLogger (Factory Test)', () => {
    it('should create a logger with the specified level', () => {
      const testLogger = createLogger({ level: 'debug' });
      assert.strictEqual(testLogger.level, 'debug');
    });

    it('should create a logger with pretty print transport if specified', () => {
      // This test is conceptual as we can't easily inspect the transport.
      // We just ensure it doesn't throw.
      assert.doesNotThrow(() => {
        createLogger({ level: 'info', prettyPrint: true });
      });
    });
  });
});