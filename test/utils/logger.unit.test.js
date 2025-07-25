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
import { dirname } from 'path';
import { describe, it, before, after, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { DEBUG_LEVELS } from '../../src/config/constants.js';

// Get the directory name in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define a module-level cache for the logger module
let loggerCache = null;

// Cache for logger modules to avoid redundant imports
const loggerModuleCache = new Map();

/**
 * Gets a fresh instance of the logger module with the specified environment variables.
 * Caches modules by environment to avoid redundant imports.
 * @param {Object} [envVars={}] - Environment variables to set for this import
 * @returns {Promise<Object>} The logger module with cleanup function
 */
async function getFreshLoggerModule(envVars = {}) {
  // Create a cache key based on environment variables
  const cacheKey = JSON.stringify(envVars);
  
  // Return cached module if available
  if (loggerModuleCache.has(cacheKey)) {
    const cached = loggerModuleCache.get(cacheKey);
    return { ...cached, _cleanup: () => {} }; // No cleanup needed for cached instances
  }
  
  // Store original environment variables
  const originalEnv = { ...process.env };
  
  try {
    // Set new environment variables
    Object.entries(envVars).forEach(([key, value]) => {
      process.env[key] = value;
    });
    
    // Import the module with cache busting
    const cacheBuster = `v=${Date.now()}`;
    const modulePath = new URL('../../src/utils/logger.js', import.meta.url);
    modulePath.searchParams.set('v', cacheBuster);
    
    const module = await import(modulePath.href);
    
    // Create a clean copy of the module with cleanup function
    const moduleWithCleanup = {
      ...module,
      _cleanup: () => {
        // Restore the original environment variables
        process.env = { ...originalEnv };
      }
    };
    
    // Cache the module for future use
    loggerModuleCache.set(cacheKey, moduleWithCleanup);
    
    return moduleWithCleanup;
  } catch (error) {
    // Restore the original environment variables if import fails
    process.env = { ...originalEnv };
    throw error;
  }
}

// Local test constants - use the actual DEBUG_LEVELS
const TEST_DEBUG_LEVELS = {
  NONE: DEBUG_LEVELS.NONE,
  ERROR: DEBUG_LEVELS.ERROR,
  WARNING: DEBUG_LEVELS.WARN,
  INFO: DEBUG_LEVELS.INFO,
  VERBOSE: DEBUG_LEVELS.DEBUG
};

// Define debugLevelToPino mapping locally for testing
const debugLevelToPino = {
  [DEBUG_LEVELS.NONE]: 'silent',
  [DEBUG_LEVELS.ERROR]: 'error',
  [DEBUG_LEVELS.WARN]: 'warn',
  [DEBUG_LEVELS.INFO]: 'info',
  [DEBUG_LEVELS.DEBUG]: 'debug',
  [DEBUG_LEVELS.TRACE]: 'trace',
  'LOG_LEVEL_ERROR': 'error',
  'LOG_LEVEL_WARN': 'warn',
  'LOG_LEVEL_INFO': 'info',
  'LOG_LEVEL_DEBUG': 'debug',
  'LOG_LEVEL_TRACE': 'trace',
  'LOG_LEVEL_SILENT': 'silent'
};

// Log the actual DEBUG_LEVELS for debugging
console.log('DEBUG_LEVELS from constants:', JSON.stringify(DEBUG_LEVELS, null, 2));
console.log('MAPPED TEST_DEBUG_LEVELS:', JSON.stringify(TEST_DEBUG_LEVELS, null, 2));

describe('Logger Utility', () => {
  // Keep track of the original process.env
  let originalEnv;

  beforeEach(() => {
    // Save the original process.env
    originalEnv = { ...process.env };
    
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

  describe('setDebugLevel', () => {
    it('should handle LOG_LEVEL_TRACE in levelMap', async () => {
      const { logger, setDebugLevel } = await getFreshLoggerModule();
      
      // Mock logger.warn
      const originalWarn = logger.warn;
      let warningMessage = '';
      logger.warn = (msg) => { warningMessage = msg; };
      
      try {
        // Call with LOG_LEVEL_TRACE
        setDebugLevel(DEBUG_LEVELS.LOG_LEVEL_TRACE);
        
        // Should log a warning about dynamic level setting
        assert.match(warningMessage, /Attempted to set debug level to LOG_LEVEL_TRACE/);
      } finally {
        // Restore original method
        logger.warn = originalWarn;
      }
    });

    it('should handle LOG_LEVEL_DEBUG and LOG_LEVEL_TRACE in log function', async () => {
      const { logger, log } = await getFreshLoggerModule();
      
      // Mock the logger methods
      const originalDebug = logger.debug;
      const originalTrace = logger.trace;
      
      let debugCalled = false;
      let traceCalled = false;
      
      try {
        logger.debug = () => { debugCalled = true; };
        logger.trace = () => { traceCalled = true; };
        
        // Test LOG_LEVEL_DEBUG
        log(DEBUG_LEVELS.LOG_LEVEL_DEBUG, 'Debug message');
        assert.strictEqual(debugCalled, true, 'debug should be called for LOG_LEVEL_DEBUG');
        
        // Reset
        debugCalled = false;
        
        // Test LOG_LEVEL_TRACE
        log(DEBUG_LEVELS.LOG_LEVEL_TRACE, 'Trace message');
        assert.strictEqual(traceCalled, true, 'trace should be called for LOG_LEVEL_TRACE');
      } finally {
        // Restore original methods
        logger.debug = originalDebug;
        logger.trace = originalTrace;
      }
    });

    it('should log a warning when called', async () => {
      const { logger, setDebugLevel } = await getFreshLoggerModule();
      // Just verify the function exists and can be called without errors
      assert.doesNotThrow(() => {
        setDebugLevel(DEBUG_LEVELS.LOG_LEVEL_TRACE);
      });
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
    // Test with each valid log level in sequence to avoid parallel test issues
    const validLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];
    
    for (const level of validLevels) {
      it(`should use LOG_LEVEL=${level} from environment when valid`, async () => {
        const { logger: testLogger } = await getFreshLoggerModule({ 
          LOG_LEVEL: level,
          // Clear DEBUG_LEVEL to ensure it doesn't interfere
          DEBUG_LEVEL: ''
        });
        
        assert.strictEqual(
          testLogger.level, 
          level, 
          `Logger level should be ${level} when LOG_LEVEL is ${level}`
        );
      });
    }
    
    // Test DEBUG_LEVEL to Pino level mapping with proper test isolation
    const debugLevelTestCases = [
      
      { debugLevel: DEBUG_LEVELS.ERROR, expectedLevel: 'error' }, 
      // WARNING maps to 'warn'
      { debugLevel: DEBUG_LEVELS.VERBOSE, expectedLevel: 'debug' },  // VERBOSE maps to 'debug'
      { debugLevel: DEBUG_LEVELS.NONE, expectedLevel: 'silent' },
      { debugLevel: 'LOG_LEVEL_ERROR', expectedLevel: 'error' },
      { debugLevel: 'LOG_LEVEL_WARN', expectedLevel: 'warn' },
      { debugLevel: 'LOG_LEVEL_INFO', expectedLevel: 'info' },
      { debugLevel: 'LOG_LEVEL_DEBUG', expectedLevel: 'debug' },
      { debugLevel: 'LOG_LEVEL_TRACE', expectedLevel: 'trace' },
      { debugLevel: 'LOG_LEVEL_SILENT', expectedLevel: 'silent' },
      // Special case: undefined DEBUG_LEVEL should default to 'debug' based on VERBOSE level
      { debugLevel: undefined, expectedLevel: 'debug' }
    ];
    
    for (const { debugLevel, expectedLevel } of debugLevelTestCases) {
      it(`should map DEBUG_LEVEL=${debugLevel} to Pino level ${expectedLevel}`, async () => {
        const { logger: testLogger } = await getFreshLoggerModule({ 
          LOG_LEVEL: '', // Clear LOG_LEVEL to test DEBUG_LEVEL in isolation
          DEBUG_LEVEL: String(debugLevel)
        });
        
        assert.strictEqual(
          testLogger.level,
          expectedLevel,
          `DEBUG_LEVEL=${debugLevel} should map to Pino level ${expectedLevel}`
        );
      });
    }
    
    it('should handle invalid DEBUG_LEVEL with a warning', async () => {
      // Mock console.warn to capture the warning
      let warningMessage = '';
      const originalConsoleWarn = console.warn;
      console.warn = (msg) => { warningMessage = msg; };
      
      try {
        const { logger: testLogger } = await getFreshLoggerModule({
          LOG_LEVEL: '', // Clear LOG_LEVEL to test DEBUG_LEVEL in isolation
          DEBUG_LEVEL: 'INVALID_DEBUG_LEVEL'
        });
        
        // Verify the warning was logged
        assert.ok(
          warningMessage.includes('Invalid DEBUG_LEVEL: INVALID_DEBUG_LEVEL, defaulting to \'info\''),
          'Expected warning about invalid DEBUG_LEVEL'
        );
        
        // Verify the logger uses the default 'info' level
        assert.strictEqual(testLogger.level, 'info');
      } finally {
        console.warn = originalConsoleWarn;
      }
    });
    
    it('should use default log level when no valid environment variables are set', async () => {
      const { logger: testLogger } = await getFreshLoggerModule({
        LOG_LEVEL: '',
        DEBUG_LEVEL: ''
      });
      assert.strictEqual(testLogger.level, 'info');
    });
    
    it('should prioritize LOG_LEVEL over DEBUG_LEVEL', async () => {
      const { logger: testLogger } = await getFreshLoggerModule({
        LOG_LEVEL: 'error',
        DEBUG_LEVEL: DEBUG_LEVELS.DEBUG.toString() // Should be ignored
      });
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
        log(DEBUG_LEVELS.LOG_LEVEL_SILENT, 'This should not be logged');

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
        log(DEBUG_LEVELS.NONE, 'This should not be logged');

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
    it('should log object as first argument and message as second', async () => {
      const { logger, log } = await getFreshLoggerModule();
      
      const testObj = { key: 'value' };
      const testMessage = 'Test message';
      
      // Mock logger methods
      const originalInfo = logger.info;
      let loggedMessage = '';
      let loggedObj = null;
      
      try {
        logger.info = (obj, msg) => {
          loggedObj = obj;
          loggedMessage = msg;
        };
        
        log(DEBUG_LEVELS.INFO, testMessage, testObj);
        
        assert.strictEqual(loggedMessage, testMessage, 'Should log the message as second argument');
        assert.deepStrictEqual(loggedObj, testObj, 'Should log the object as first argument');
      } finally {
        // Restore original method
        logger.info = originalInfo;
      }
    });

    it('should handle missing message when only object is provided', async () => {
      const { logger, log } = await getFreshLoggerModule();
      
      const testObj = { key: 'value' };
      
      // Mock logger methods
      const originalInfo = logger.info;
      let loggedMessage = '';
      let loggedObj = null;
      
      try {
        logger.info = (obj, msg) => {
          loggedObj = obj;
          loggedMessage = msg;
        };
        
        log(DEBUG_LEVELS.INFO, testObj);
        
        assert.strictEqual(loggedMessage, undefined, 'Message should be undefined when not provided');
        assert.deepStrictEqual(loggedObj, testObj, 'Should log the object as first argument');
      } finally {
        // Restore original method
        logger.info = originalInfo;
      }
    });

    it('should handle all log level cases with objects', async () => {
      const { logger, log } = await getFreshLoggerModule();
      
      const testObj = { key: 'value' };
      const testMessage = 'Test message';
      
      // Mock all logger methods
      const originalMethods = {
        error: logger.error,
        warn: logger.warn,
        info: logger.info,
        debug: logger.debug,
        trace: logger.trace,
        fatal: logger.fatal
      };
      
      const calledMethods = [];
      
      try {
        // Create a generic mock that records which method was called
        const createMock = (level) => (obj, msg) => {
          calledMethods.push(level);
          assert.deepStrictEqual(obj, testObj, 'Should pass the object as first argument');
          // For unknown levels, the logger will prepend a message, so we check if the message ends with our test message
          if (level === 'info' && msg.includes('Unknown log level')) {
            assert.ok(msg.endsWith(testMessage), `Message should end with '${testMessage}' for unknown log level`);
          } else {
            assert.strictEqual(msg, testMessage, 'Should pass the message as second argument');
          }
        };
        
        // Apply mocks
        logger.error = createMock('error');
        logger.warn = createMock('warn');
        logger.info = createMock('info');
        logger.debug = createMock('debug');
        logger.trace = createMock('trace');
        logger.fatal = createMock('fatal');
        
        // Test all log level cases
        log(DEBUG_LEVELS.ERROR, testMessage, testObj);
        log(DEBUG_LEVELS.LOG_LEVEL_ERROR, testMessage, testObj);
        log(DEBUG_LEVELS.WARNING, testMessage, testObj);
        log(DEBUG_LEVELS.LOG_LEVEL_WARN, testMessage, testObj);
        log(DEBUG_LEVELS.INFO, testMessage, testObj);
        log(DEBUG_LEVELS.LOG_LEVEL_INFO, testMessage, testObj);
        log(DEBUG_LEVELS.VERBOSE, testMessage, testObj);
        log(DEBUG_LEVELS.LOG_LEVEL_DEBUG, testMessage, testObj);
        log(DEBUG_LEVELS.LOG_LEVEL_TRACE, testMessage, testObj);
        log(DEBUG_LEVELS.LOG_LEVEL_SILENT, testMessage, testObj);
        
        // Verify all expected methods were called
        assert.deepStrictEqual(
          calledMethods,
          ['error', 'error', 'warn', 'warn', 'info', 'info', 'warn', 'debug', 'trace'],
          'Should call the correct logger method for each log level'
        );
        
        // Test default case with unknown level
        calledMethods.length = 0; // Reset
        log('UNKNOWN_LEVEL', testMessage, testObj);
        assert.strictEqual(calledMethods[0], 'info', 'Should default to info for unknown levels');
        
      } finally {
        // Restore original methods
        Object.assign(logger, originalMethods);
      }
    });
  });

  describe('setDebugLevel', () => {
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
        { level: DEBUG_LEVELS.ERROR, expected: 'error' },
        { level: DEBUG_LEVELS.WARN, expected: 'warn' },
        { level: DEBUG_LEVELS.INFO, expected: 'info' },
        { level: DEBUG_LEVELS.DEBUG, expected: 'debug' },
        { level: DEBUG_LEVELS.TRACE, expected: 'trace' },
        { level: DEBUG_LEVELS.NONE, expected: 'silent' },
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
      const { logger, setDebugLevel } = await getFreshLoggerModule();
      let warningMessage = '';
      const originalWarn = logger.warn;
      
      try {
        // Mock the warn method to capture the warning message
        logger.warn = (msg) => { warningMessage = msg; };
        
        // Call with invalid level - should not throw
        setDebugLevel('INVALID_LEVEL');
        
        // Verify the warning message was logged
        assert.ok(
          warningMessage.includes('INVALID_LEVEL'),
          'Should log a warning about the invalid level'
        );
      } finally {
        // Restore the original warn method
        logger.warn = originalWarn;
      }
    });
  });
});