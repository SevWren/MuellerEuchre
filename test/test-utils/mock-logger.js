import { mock } from 'node:test';
import assert from 'node:assert';

/**
 * Creates a mock logger for testing
 * @returns {Object} Mock logger object with tracking methods
 */
export function createMockLogger() {
  const mockLogger = {
    info: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
    debug: mock.fn(),
    
    /**
     * Resets all mock functions
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
     * Asserts that a log message was called with the expected level and message
     * @param {string} level - The log level to check (info, warn, error, debug)
     * @param {string|RegExp} message - The message or pattern to match
     * @param {number} [times=1] - Expected number of calls
     */
    assertLogged(level, message, times = 1) {
      const mockFn = this[level];
      if (!mockFn) {
        throw new Error(`Invalid log level: ${level}. Must be one of: ${Object.keys(this).filter(k => k !== 'reset' && k !== 'assertLogged').join(', ')}`);
      }
      
      // Flatten and filter out undefined/empty calls
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
      
// Safely format call arguments for error message
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
