/**
 * Test configuration constants for the logger utility tests.
 * This file contains mock constants used specifically for testing the logger.
 * 
 * @fileoverview Mock constants for logger testing
 * @module test/utils/test-logger-constants
 * @since 1.0.0
 */

/**
 * Debug levels for testing logger functionality.
 * @readonly
 * @enum {number}
 */
export const DEBUG_LEVELS = {
  ERROR: 0,
  WARNING: 1,
  INFO: 2,
  VERBOSE: 3,
  DEBUG: 4
};

// Export default for backward compatibility
export default {
  DEBUG_LEVELS
};
