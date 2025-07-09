import { mock } from 'node:test';

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
      const calls = mockFn.mock.calls.flat();
      const found = calls.some(args => 
        typeof message === 'string' 
          ? args.includes(message)
          : message.test(args)
      );
      
      assert.ok(
        found,
        `Expected ${level} log with message matching ${message}, but got ${calls.join(', ')}`
      );
      
      if (times !== undefined) {
        assert.strictEqual(
          mockFn.mock.calls.length,
          times,
          `Expected ${level} to be called ${times} times, but was called ${mockFn.mock.calls.length} times`
        );
      }
    }
  };
}
