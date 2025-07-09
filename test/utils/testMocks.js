/**
 * Test Mocks and Constants for Euchre Game Testing
 * @module test/utils/testMocks
 * @description
 * This file re-exports all game constants from the main constants file
 * and provides pure test utilities for unit testing.
 * 
 * @important
 * - This file should only be used in test environments.
 * - All functions must be pure (no side effects, same output for same input).
 * - No I/O operations or global state mutations allowed.
 * - For production code, import directly from 'src/config/constants.js'.
 */

// Import all constants from the main constants file
import {
  // Card constants
  CARD_SUITS,
  CARD_VALUES,
  CARD_RANKS,
  
  // Game constants
  GAME_PHASES,
  GAME_EVENTS,
  WINNING_SCORE,
  
  // Player and team constants
  PLAYER_ROLES,
  TEAMS,
  
  // Logging and storage
  LOG_LEVELS,
  STORAGE_KEYS,
  
  // Backward compatibility exports
  SUITS,
  VALUES,
  DEBUG_LEVELS
} from '../../src/config/constants.js';

// =============================================
// Mock Implementations
// =============================================

/**
 * Creates a pure mock logger object for testing.
 * Each method is a no-op function that returns undefined.
 * 
 * @returns {Object} A mock logger object with standard logging methods
 * @property {Function} error - No-op error logger
 * @property {Function} warn - No-op warning logger
 * @property {Function} info - No-op info logger
 * @property {Function} debug - No-op debug logger
 * @property {Function} trace - No-op trace logger
 * 
 * @example
 * const logger = createMockLogger();
 * logger.info('Test message'); // Does nothing
 */
function createMockLogger() {
  return Object.freeze({
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
  });
}

/**
 * Validates if an object is a valid mock logger.
 * 
 * @param {*} logger - The object to validate
 * @returns {boolean} True if the object is a valid mock logger
 * @throws {TypeError} If the logger is not a valid mock logger
 */
function validateMockLogger(logger) {
  if (!logger || typeof logger !== 'object') {
    throw new TypeError('Logger must be an object');
  }
  
  const requiredMethods = ['error', 'warn', 'info', 'debug', 'trace'];
  for (const method of requiredMethods) {
    if (typeof logger[method] !== 'function') {
      throw new TypeError(`Logger is missing required method: ${method}`);
    }
  }
  
  return true;
}

// =============================================
// Exports
// =============================================

export {
  // Card constants
  CARD_SUITS,
  CARD_VALUES,
  CARD_RANKS,
  
  // Game constants
  GAME_PHASES,
  GAME_EVENTS,
  WINNING_SCORE,
  
  // Player and team constants
  PLAYER_ROLES,
  TEAMS,
  
  // Logging and storage
  LOG_LEVELS,
  STORAGE_KEYS,
  
  // Backward compatibility exports
  SUITS,
  VALUES,
  DEBUG_LEVELS,
  
  // Mock functions
  createMockLogger,
  validateMockLogger
};