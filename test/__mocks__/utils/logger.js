/**
 * @file test/__mocks__/logger.js
 * @description Mock logger for testing purposes.
 * @see src/utils/logger.js
 * @see test/game/phases/endGame.unit.test.js
 */

import { mock } from 'node:test';

/**
 * A mock logger object for testing purposes.
 * It provides mock functions for common logging levels and a reset method.
 * @typedef {object} MockLogger
 * @property {import('node:test').Mock<any[], any>} log - Mock function for general logging.
 * @property {import('node:test').Mock<any[], any>} error - Mock function for error logging.
 * @property {import('node:test').Mock<any[], any>} warn - Mock function for warning logging.
 * @property {import('node:test').Mock<any[], any>} info - Mock function for info logging.
 * @property {import('node:test').Mock<any[], any>} debug - Mock function for debug logging.
 * @property {function(): void} reset - Resets all mock logger calls.
 */
const mockLogger = {
  log: mock.fn(),
  error: mock.fn(),
  warn: mock.fn(),
  info: mock.fn(),
  debug: mock.fn(),
  /**
   * Resets the call history of all mock logger functions.
   * @returns {void}
   */
  reset: function() {
    this.log.mock.resetCalls();
    this.error.mock.resetCalls();
    this.warn.mock.resetCalls();
    this.info.mock.resetCalls();
    this.debug.mock.resetCalls();
  }
};

/**
 * The default export is the mock logger object.
 * @type {MockLogger}
 */
export default mockLogger;

/**
 * Individual mock logger methods for named imports.
 * @type {{
 *   log: import('node:test').Mock<any[], any>,
 *   error: import('node:test').Mock<any[], any>,
 *   warn: import('node:test').Mock<any[], any>,
 *   info: import('node:test').Mock<any[], any>,
 *   debug: import('node:test').Mock<any[], any>
 * }}
 */
export const { log, error, warn, info, debug } = mockLogger;
