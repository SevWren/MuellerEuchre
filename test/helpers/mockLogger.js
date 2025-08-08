/**
 * Test helper for mocking the logger in tests.
 * This module provides functions to suppress and restore logger output.
 * @module test/helpers/mockLogger
 */

import * as loggerModule from '../../src/utils/logger.js';

// Store the original logger implementation
const originalLogger = loggerModule.log;

// Create a silent logger
const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: () => silentLogger,
  level: 'silent',
  silent: () => {}
};

/**
 * Suppresses all logger output by replacing the logger with a silent implementation.
 * @function suppressLogger
 * @returns {Function} A function that can be called to restore the original logger.
 */
export function suppressLogger() {
  // Replace the logger with our silent implementation
  loggerModule.log = () => silentLogger;
  
  // Return a function to restore the original logger
  return () => {
    loggerModule.log = originalLogger;
  };
}

/**
 * Restores the original logger implementation.
 * @function restoreLogger
 */
export function restoreLogger() {
  loggerModule.log = originalLogger;
}
