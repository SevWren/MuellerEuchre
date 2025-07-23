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
 *   - Near 100% Coverage
 * @see {@link module:src/utils/logger} for the implementation being tested
 * @see {@link module:test/utils/logger.unit.test} for the test implementation
 * @since 1.0.0
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { describe, it, before, after, afterEach, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

// Import the constants directly
import { DEBUG_LEVELS as ACTUAL_DEBUG_LEVELS } from '../../src/config/constants.js';

// Create a function to get a fresh instance of the logger module
async function getFreshLoggerModule() {
  // Use a unique query parameter to bust module cache for ES Modules
  // This ensures we get a freshly initialized logger for each test that needs it.
  const freshLogger = await import(`../../src/utils/logger.js?update=${Date.now()}`);
  return freshLogger;
}

// Local test constants - use the actual DEBUG_LEVELS
const TEST_DEBUG_LEVELS = {
  NONE: ACTUAL_DEBUG_LEVELS.NONE,
  ERROR: ACTUAL_DEBUG_LEVELS.ERROR,
  WARNING: ACTUAL_DEBUG_LEVELS.WARN, // Note: Using WARN instead of WARNING
  INFO: ACTUAL_DEBUG_LEVELS.INFO,
  VERBOSE: ACTUAL_DEBUG_LEVELS.DEBUG // Using DEBUG for VERBOSE level
};

// Define debugLevelToPino mapping locally for testing purposes to reflect the internal logic of src/utils/logger.js
// Ensure all keys are explicitly defined or handled to avoid 'undefined' keys.
const debugLevelToPino = {
  [ACTUAL_DEBUG_LEVELS.NONE]: 'silent',
  [ACTUAL_DEBUG_LEVELS.ERROR]: 'error',
  [ACTUAL_DEBUG_LEVELS.WARN]: 'warn',
  [ACTUAL_DEBUG_LEVELS.INFO]: 'info',
  [ACTUAL_DEBUG_LEVELS.DEBUG]: 'debug', // This maps to VERBOSE in logger.js
  [ACTUAL_DEBUG_LEVELS.TRACE]: 'trace',
  'LOG_LEVEL_ERROR': 'error',
  'LOG_LEVEL_WARN': 'warn',
  'LOG_LEVEL_INFO': 'info',
  'LOG_LEVEL_DEBUG': 'debug',
  'LOG_LEVEL_TRACE': 'trace',
  'LOG_LEVEL_SILENT': 'silent'
};

// Log the actual DEBUG_LEVELS for debugging
console.log('ACTUAL DEBUG_LEVELS from constants:', JSON.stringify(ACTUAL_DEBUG_LEVELS, null, 2));
console.log('MAPPED TEST_DEBUG_LEVELS:', JSON.stringify(TEST_DEBUG_LEVELS, null, 2));

describe('Logger Utility', () => {
  // Keep track of the original process.env
  let originalEnv;

  before(() => {
    // Save the original process.env
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    // Clear any existing mocks
    mock.restoreAll();

    // Set up clean environment for each test
    // This ensures tests start with a predictable environment
    process.env = {
      ...originalEnv, // Preserve other env vars not related to logger
      NODE_ENV: 'test',
      LOG_LEVEL: 'info', // Default for tests that don't override
      DEBUG_LEVEL: '0'   // Default for tests that don't override
    };
  });

  afterEach(() => {
    // Restore all mocks
    mock.restoreAll();
  });

  after(() => {
    // Restore original environment variables after all tests are done
    Object.keys(process.env).forEach(key => {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    });
    Object.entries(originalEnv).forEach(([key, value]) => {
      process.env[key] = value;
    });
  });

  describe('Exports', () => {
    it('should export the expected functions', async () => {
      const { logger, log, setDebugLevel } = await getFreshLoggerModule();
      assert.strictEqual(typeof logger, 'object', 'logger should be an object');
      assert.strictEqual(typeof log, 'function', 'log should be a function');
      assert.strictEqual(typeof setDebugLevel, 'function', 'setDebugLevel should be a function');
    });
  });

  describe('Basic Logging', () => {
    it('should log info messages', async () => {
      const { logger } = await getFreshLoggerModule();
      // Just verify the function exists and can be called without errors
      assert.doesNotThrow(() => {
        logger.info('Test info message');
      });
    });

    it('should log error messages', async () => {
      const { logger } = await getFreshLoggerModule();
      const error = new Error('Test error');
      // Just verify the function exists and can be called without errors
      assert.doesNotThrow(() => {
        logger.error('Error occurred', error);
      });
    });

    it('should handle all log levels', async () => {
      const { logger } = await getFreshLoggerModule();
      const levels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

      levels.forEach(level => {
        assert.doesNotThrow(() => {
          if (logger[level]) {
            logger[level](`Test ${level} message`);
          }
        }, `Should not throw when calling logger.${level}`);
      });
    });
  });

  describe('Logging Functions', () => {
    it('should call the appropriate logger method based on log level', async () => {
      const { logger, log } = await getFreshLoggerModule();
      // Log the test constants for debugging
      console.log('TEST_DEBUG_LEVELS:', JSON.stringify(TEST_DEBUG_LEVELS, null, 2));

      // Save original logger methods
      const originalMethods = {
        error: logger.error,
        warn: logger.warn,
        info: logger.info,
        debug: logger.debug,
        trace: logger.trace
      };

      try {
        // Mock logger methods
        const calls = [];

        // Helper to create a mock logger method
        const createMockMethod = (level) => {
          return (...args) => {
            console.log(`Logger.${level} called with:`, args);
            calls.push({ level, args });
          };
        };

        // Replace logger methods with mocks
        logger.error = createMockMethod('error');
        logger.warn = createMockMethod('warn');
        logger.info = createMockMethod('info');
        logger.debug = createMockMethod('debug');

        // Log the current logger level for debugging
        console.log('Current logger level:', logger.level);

        // Test ERROR level
        console.log('Testing ERROR level with value:', TEST_DEBUG_LEVELS.ERROR);
        log(TEST_DEBUG_LEVELS.ERROR, 'Test error');

        // Verify the call was made with the correct level and message
        assert.strictEqual(calls.length, 1, `Expected 1 call, got ${calls.length}`);
        assert.strictEqual(calls[0].level, 'error', `Expected 'error' level, got '${calls[0].level}'`);
        assert.strictEqual(calls[0].args[0], 'Test error', `Unexpected message: ${calls[0].args[0]}`);

        // Clear calls for next test
        calls.length = 0;

        // Test WARNING level (mapped to 'warn' in the logger)
        log(TEST_DEBUG_LEVELS.WARNING, 'Test warning');
        assert.strictEqual(calls.length, 1, 'Expected 1 call for WARNING level');
        assert.strictEqual(calls[0].level, 'warn', 'Expected WARNING level to map to warn');
        assert.strictEqual(calls[0].args[0], 'Test warning', 'Unexpected warning message');

        // Clear calls for next test
        calls.length = 0;

        // Test INFO level with additional data
        const testData = { key: 'value' };
        log(TEST_DEBUG_LEVELS.INFO, 'Test info', testData);
        assert.strictEqual(calls.length, 1, 'Expected 1 call for INFO level');
        assert.strictEqual(calls[0].level, 'info', 'Expected INFO level to map to info');
        assert.deepStrictEqual(calls[0].args[0], testData, 'Expected test data to be passed as first arg');
        assert.strictEqual(calls[0].args[1], 'Test info', 'Expected message to be second arg');

        // Clear calls for next test
        calls.length = 0;

        // Test VERBOSE level (mapped to 'debug' in the logger)
        log(TEST_DEBUG_LEVELS.VERBOSE, 'Test debug');
        assert.strictEqual(calls.length, 1, 'Expected 1 call for VERBOSE level');
        assert.strictEqual(calls[0].level, 'debug', 'Expected VERBOSE level to map to debug');
        assert.strictEqual(calls[0].args[0], 'Test debug', 'Unexpected debug message');
      } finally {
        // Restore original methods
        Object.assign(logger, originalMethods);
      }
    });

    it('should handle unknown log levels', async () => {
      const { logger, log } = await getFreshLoggerModule();
      // Save original logger methods
      const originalInfo = logger.info;
      let infoCalled = false;

      try {
        // Mock info method
        logger.info = () => { infoCalled = true; };

        // Call with unknown level (should default to info)
        log(999, 'Unknown level message');

        // Should have called info method
        assert.strictEqual(infoCalled, true);
      } finally {
        // Restore original method
        logger.info = originalInfo;
      }
    });
  });

  describe('Environment Variable Handling', () => {
    it('should use LOG_LEVEL from environment when valid', async () => {
      // Test with each valid log level
      const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];

      for (const level of validLevels) {
        process.env.LOG_LEVEL = level;
        // Get a fresh logger instance to ensure environment variable is read
        const { logger: testLogger } = await getFreshLoggerModule();

        assert.strictEqual(testLogger.level, level, `Logger level should be ${level} when LOG_LEVEL is ${level}`);
      }
    });

    it('should handle DEBUG_LEVEL to Pino level mapping', async () => {
      // Clear LOG_LEVEL to ensure DEBUG_LEVEL is used
      delete process.env.LOG_LEVEL;

      // Test each DEBUG_LEVEL to Pino level mapping
      const testCases = [
        { debugLevel: ACTUAL_DEBUG_LEVELS.ERROR, expectedLevel: 'error' },
        { debugLevel: ACTUAL_DEBUG_LEVELS.WARN, expectedLevel: 'warn' },
        { debugLevel: ACTUAL_DEBUG_LEVELS.INFO, expectedLevel: 'info' },
        { debugLevel: ACTUAL_DEBUG_LEVELS.DEBUG, expectedLevel: 'debug' }, // VERBOSE maps to DEBUG
        { debugLevel: ACTUAL_DEBUG_LEVELS.TRACE, expectedLevel: 'trace' },
        // Ensure ACTUAL_DEBUG_LEVELS.NONE is defined in constants.js for this test to pass
        { debugLevel: ACTUAL_DEBUG_LEVELS.NONE, expectedLevel: 'silent' },
        { debugLevel: 'LOG_LEVEL_ERROR', expectedLevel: 'error' },
        { debugLevel: 'LOG_LEVEL_WARN', expectedLevel: 'warn' },
        { debugLevel: 'LOG_LEVEL_INFO', expectedLevel: 'info' },
        { debugLevel: 'LOG_LEVEL_DEBUG', expectedLevel: 'debug' },
        { debugLevel: 'LOG_LEVEL_TRACE', expectedLevel: 'trace' },
        // Ensure ACTUAL_DEBUG_LEVELS.LOG_LEVEL_SILENT is defined in constants.js for this test to pass
        { debugLevel: 'LOG_LEVEL_SILENT', expectedLevel: 'silent' }
      ];

      // Test each debug level mapping
      for (const { debugLevel, expectedLevel } of testCases) {
        // Ensure debugLevel is a string for process.env
        process.env.DEBUG_LEVEL = String(debugLevel);
        const { logger: testLogger } = await getFreshLoggerModule();
        assert.strictEqual(
          testLogger.level,
          expectedLevel,
          `DEBUG_LEVEL=${debugLevel} should map to Pino level ${expectedLevel}`
        );
      }
    });

    it('should handle invalid DEBUG_LEVEL with a warning', async () => {
      // Clear LOG_LEVEL and set an invalid DEBUG_LEVEL
      delete process.env.LOG_LEVEL;
      process.env.DEBUG_LEVEL = 'INVALID_DEBUG_LEVEL';

      // Mock console.warn to capture the warning
      let warningMessage = '';
      const originalConsoleWarn = console.warn;
      console.warn = (msg) => { warningMessage = msg; };

      try {
        // Import the logger to trigger the initialization
        const { logger: testLogger } = await getFreshLoggerModule();

        // Verify the warning was logged
        assert.ok(
          warningMessage.includes('Invalid DEBUG_LEVEL: INVALID_DEBUG_LEVEL, defaulting to \'info\''),
          'Expected warning about invalid DEBUG_LEVEL'
        );

        // Verify the logger uses the default 'info' level
        assert.strictEqual(testLogger.level, 'info');
      } finally {
        console.warn = originalConsoleWarn; // Restore original console.warn
      }
    });

    it('should use default log level when no valid environment variables are set', async () => {
      delete process.env.LOG_LEVEL;
      delete process.env.DEBUG_LEVEL;

      const { logger: testLogger } = await getFreshLoggerModule();
      assert.strictEqual(testLogger.level, 'info');
    });

    it('should prioritize LOG_LEVEL over DEBUG_LEVEL', async () => {
      process.env.LOG_LEVEL = 'error';
      process.env.DEBUG_LEVEL = ACTUAL_DEBUG_LEVELS.DEBUG.toString(); // Should be ignored

      const { logger: testLogger } = await getFreshLoggerModule();
      assert.strictEqual(testLogger.level, 'error', 'LOG_LEVEL should take precedence over DEBUG_LEVEL');
    });
  });

  describe('Logging with Special Cases', () => {
    it('should handle LOG_LEVEL_SILENT by not calling logger methods', async () => {
      const { logger, log } = await getFreshLoggerModule();
      // Mock the logger methods with a spy
      const originalMethods = {};
      const spies = {};

      // Create spies for all logger methods
      ['info', 'error', 'warn', 'debug', 'fatal', 'trace'].forEach(level => {
        originalMethods[level] = logger[level];
        spies[level] = mock.fn();
        logger[level] = spies[level];
      });

      try {
        // Set logger's level to silent for this test to ensure it's truly silent
        logger.level = 'silent';

        // Try to log with SILENT level
        log(ACTUAL_DEBUG_LEVELS.LOG_LEVEL_SILENT, 'This should not be logged');

        // Verify no logger methods were called
        Object.values(spies).forEach((spy, index) => {
          assert.strictEqual(
            spy.mock.calls.length,
            0,
            `Logger method ${Object.keys(spies)[index]} should not be called for LOG_LEVEL_SILENT`
          );
        });
      } finally {
        // Restore original methods
        Object.assign(logger, originalMethods);
      }
    });

    it('should handle NONE log level by not calling logger methods', async () => {
      const { logger, log } = await getFreshLoggerModule();
      // Mock the logger methods with a spy
      const originalMethods = {};
      const spies = {};

      // Create spies for all logger methods
      ['info', 'error', 'warn', 'debug', 'fatal', 'trace'].forEach(level => {
        originalMethods[level] = logger[level];
        spies[level] = mock.fn();
        logger[level] = spies[level];
      });

      try {
        // Set logger's level to silent (NONE maps to silent)
        logger.level = 'silent';

        // Try to log with NONE level
        log(ACTUAL_DEBUG_LEVELS.NONE, 'This should not be logged');

        // Verify no logger methods were called
        Object.values(spies).forEach((spy, index) => {
          assert.strictEqual(
            spy.mock.calls.length,
            0,
            `Logger method ${Object.keys(spies)[index]} should not be called for NONE level`
          );
        });
      } finally {
        // Restore original methods
        Object.assign(logger, originalMethods);
      }
    });
  });

  describe('Logging with Objects', () => {
    it('should log objects as first argument and message as second', async () => {
      const { logger, log } = await getFreshLoggerModule();
      const testObj = { key: 'value', num: 42 };
      const testMessage = 'Test message with object';
      let loggedObj, loggedMsg;

      // Mock logger.info
      const originalInfo = logger.info;
      logger.info = (obj, msg) => {
        loggedObj = obj;
        loggedMsg = msg;
      };

      try {
        log(ACTUAL_DEBUG_LEVELS.INFO, testMessage, testObj);
        assert.deepStrictEqual(loggedObj, testObj);
        assert.strictEqual(loggedMsg, testMessage);
      } finally {
        // Restore original method
        logger.info = originalInfo;
      }
    });

    it('should handle missing message when only object is provided', async () => {
      const { logger, log } = await getFreshLoggerModule();
      const testObj = { key: 'value' };
      let loggedObj, loggedMsg;

      // Mock logger.info
      const originalInfo = logger.info;
      logger.info = (obj, msg) => {
        loggedObj = obj;
        loggedMsg = msg;
      };

      try {
        log(ACTUAL_DEBUG_LEVELS.INFO, testObj);
        assert.strictEqual(loggedObj, testObj);
        assert.strictEqual(loggedMsg, undefined);
      } finally {
        // Restore original method
        logger.info = originalInfo;
      }
    });
  });

  describe('setDebugLevel', () => {
    // These tests will get a fresh logger module for each test to ensure isolation
    // and then mock its warn method directly.

    it('should log a warning when called', async () => {
      const { logger, setDebugLevel } = await getFreshLoggerModule();
      // Mock logger.warn to capture the warning
      let warningMessage = '';
      const originalWarn = logger.warn;
      logger.warn = (msg) => { warningMessage = msg; };

      try {
        // Call setDebugLevel with INFO level
        console.log('Calling setDebugLevel with:', TEST_DEBUG_LEVELS.INFO);
        setDebugLevel(TEST_DEBUG_LEVELS.INFO);

        // Verify the warning was logged
        assert.ok(
          warningMessage.includes('Attempted to set debug level to'),
          'Should log a warning when setDebugLevel is called'
        );
        assert.ok(
          warningMessage.includes(`(${debugLevelToPino[TEST_DEBUG_LEVELS.INFO]})`),
          'Warning should include the mapped log level'
        );
      } finally {
        logger.warn = originalWarn; // Restore original method
      }
    });

    it('should handle all valid log levels correctly', async () => {
      const testCases = [
        { level: ACTUAL_DEBUG_LEVELS.ERROR, expected: 'error' },
        { level: ACTUAL_DEBUG_LEVELS.WARN, expected: 'warn' },
        { level: ACTUAL_DEBUG_LEVELS.INFO, expected: 'info' },
        { level: ACTUAL_DEBUG_LEVELS.DEBUG, expected: 'debug' }, // VERBOSE maps to DEBUG
        { level: ACTUAL_DEBUG_LEVELS.NONE, expected: 'silent' },
        { level: 'LOG_LEVEL_TRACE', expected: 'trace' },
        { level: 'LOG_LEVEL_SILENT', expected: 'silent' },
        { level: 'LOG_LEVEL_DEBUG', expected: 'debug' },
        { level: 'LOG_LEVEL_INFO', expected: 'info' },
        { level: 'LOG_LEVEL_WARN', expected: 'warn' },
        { level: 'LOG_LEVEL_ERROR', expected: 'error' }
      ];

      for (const { level, expected } of testCases) {
        const { logger, setDebugLevel } = await getFreshLoggerModule();
        let warningMessage = '';
        const originalWarn = logger.warn;
        logger.warn = (msg) => { warningMessage = msg; };

        try {
          setDebugLevel(level);

          // Verify the warning message contains the expected level or the level itself
          const warningContainsExpected = warningMessage.includes(expected) ||
                                        warningMessage.includes(level);

          assert.ok(
            warningContainsExpected,
            `Warning message for level ${level} should include '${expected}' or the level itself. Got: ${warningMessage}`
          );
        } finally {
          logger.warn = originalWarn; // Restore original method
        }
      }
    });

    it('should handle unknown log levels gracefully', async () => {
      const { logger, setDebugLevel } = await getFreshLoggerModule();
      let warningMessage = '';
      const originalWarn = logger.warn;
      logger.warn = (msg) => { warningMessage = msg; };

      try {
        // Call with an unknown level
        setDebugLevel('UNKNOWN_LEVEL');

        // Should still log a warning with default level 'info'
        assert.ok(
          warningMessage.includes('info'),
          `Should default to info level for unknown levels. Got: ${warningMessage}`
        );
      } finally {
        // Restore original method
        logger.warn = originalWarn;
      }
    });

    it('should not throw when called with invalid level', async () => {
      const { setDebugLevel } = await getFreshLoggerModule();
      // Should handle invalid level gracefully
      assert.doesNotThrow(() => {
        setDebugLevel('INVALID_LEVEL');
      });
    });
  });
});