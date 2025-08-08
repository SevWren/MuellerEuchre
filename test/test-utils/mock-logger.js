/**
 * @file Mock logger implementation for testing purposes.
 * @module test/test-utils/mock-logger
 * @description
 *   Provides a mock logger that can be used to verify logging behavior in tests.
 *   Tracks all log calls and provides assertion utilities to verify logging behavior.
 *
 * @see {@link module:node:test} for the mocking functionality used
 * @see {@link module:node:assert} for assertion utilities
 *
 * @example
 * // Basic usage in tests
 * import { createMockLogger } from './test-utils/mock-logger';
 *
 * describe('Some Test', () => {
 *   let mockLogger;
 *
 *   beforeEach(() => {
 *     mockLogger = createMockLogger();
 *   });
 *
 *   it('should log an error', () => {
 *     // Test code that should log an error
 *     mockLogger.error('Something went wrong');
 *
 *     // Verify the log was called
 *     mockLogger.assertLogged('error', 'Something went wrong');
 *   });
 * });
 */

import { mock } from 'node:test';
import assert from 'node:assert';

/**
 * Creates a mock logger instance for testing.
 * @returns {MockLogger} A mock logger object with tracking and assertion methods.
 * @property {Function} info - Mock function for info level logs
 * @property {Function} warn - Mock function for warning level logs
 * @property {Function} error - Mock function for error level logs
 * @property {Function} debug - Mock function for debug level logs
 * @property {Function} reset - Resets all mock functions
 * @property {Function} assertLogged - Asserts that a log message was called
 *
 * @typedef {Object} MockLogger
 * @property {Function} info - Mock function for info level logs
 * @property {Function} warn - Mock function for warning level logs
 * @property {Function} error - Mock function for error level logs
 * @property {Function} debug - Mock function for debug level logs
 * @property {Function} reset - Resets all mock functions
 * @property {function(string, (string|RegExp), number=): void} assertLogged - Asserts log was called
 *   @param {string} level - The log level to check (info, warn, error, debug)
 *   @param {string|RegExp} message - The message or pattern to match
 *   @param {number} [times=1] - Expected number of calls
 * @see {@link module:test/test-utils/mock-logger} for usage examples
 */
export function createMockLogger() {
  const mockLogger = {
    info: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
    debug: mock.fn(),
    
    /**
     * Resets all mock functions to their initial state.
     * This clears all call history and resets call counts.
     * @memberof MockLogger
     * @returns {void}
     */
    reset() {
      mock.reset();
      // Recreate mocks after reset
      mockLogger.info = mock.fn();
      mockLogger.warn = mock.fn();
      mockLogger.error = mock.fn();
      mockLogger.debug = mock.fn();
    },
    
    /**
     * Asserts that a log message was called with the expected level and message.
     * @param {string} level - The log level to check (info, warn, error, debug)
     * @param {string|RegExp} message - The message or pattern to match. Can be a string (for exact match)
     *                                 or a RegExp (for pattern matching).
     * @param {number} [times=1] - Expected number of calls. If not provided, defaults to 1.
     * @throws {Error} If the log level is invalid
     * @throws {AssertionError} If the expected log message was not found or call count doesn't match
     * @memberof MockLogger
     * @example
     * // Assert an exact message match
     * mockLogger.assertLogged('error', 'Connection failed');
     *
     * // Assert a message using regex
     * mockLogger.assertLogged('warn', /invalid.*input/i);
     *
     * // Assert multiple calls
     * mockLogger.assertLogged('info', 'Processing', 3);
     */
    assertLogged(level, message, times = 1) {
      const mockFn = this[level];
      if (!mockFn) {
        throw new Error(`Invalid log level: ${level}. Must be one of: ${Object.keys(this).filter(k => k !== 'reset' && k !== 'assertLogged').join(', ')}`);
      }
      
      // Flatten and filter out undefined/empty calls
      /** @type {Array<*>} */
      const calls = mockFn.mock.calls.flat().filter(Boolean);
      let found = false;
      
      // Check each call's arguments for the message
      for (const args of calls) {
        const argsArray = Array.isArray(args) ? args : [args];
        for (const arg of argsArray) {
          if (arg === undefined || arg === null) continue;
          
          let strArg;
          try {
            // Try to convert to string, handle objects that can't be stringified
            strArg = typeof arg === 'object' 
              ? JSON.stringify(arg) 
              : String(arg);
          } catch (e) {
            // If string conversion fails, use a placeholder
            strArg = '[Object]';
          }
          
          const isMatch = typeof message === 'string' 
            ? strArg.includes(message)
            : message.test(strArg);
            
          if (isMatch) {
            found = true;
            break;
          }
        }
        if (found) break;
      }
      
/**
       * Safely formats call arguments for error messages
       * @param {Array<*>} calls - Array of call arguments to format
       * @returns {string} Formatted string representation of the calls
       * @private
       */
      const formatCalls = (calls) => {
        return calls.map(call => {
          try {
            return JSON.stringify(call);
          } catch (e) {
            try {
              return String(call);
            } catch (e2) {
              return '[Circular or non-stringifiable]';
            }
          }
        }).join(' | ');
      };
      
      assert.ok(
        found,
        `Expected ${level} log with message matching "${message}", but got: ${formatCalls(calls)}`
      );
      
      if (times !== undefined) {
        assert.strictEqual(
          mockFn.mock.calls.length,
          times,
          `Expected ${level} to be called ${times} time(s), but was called ${mockFn.mock.calls.length} time(s)`
        );
      }
    }
  };
  
  return mockLogger;
}
