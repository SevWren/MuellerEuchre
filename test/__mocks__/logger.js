/**
 * @file test/__mocks__/logger.js
 * @description Mock logger for testing purposes
 */

import { mock } from 'node:test';

// Create mock functions for each logger method
const mockLogger = {
  log: mock.fn(),
  error: mock.fn(),
  warn: mock.fn(),
  info: mock.fn(),
  debug: mock.fn(),
  reset: function() {
    this.log.mock.resetCalls();
    this.error.mock.resetCalls();
    this.warn.mock.resetCalls();
    this.info.mock.resetCalls();
    this.debug.mock.resetCalls();
  }
};

// Export the mock logger
export default mockLogger;

// Export individual methods for named imports
export const { log, error, warn, info, debug } = mockLogger;
