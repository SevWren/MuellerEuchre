/**
 * @file Shared test utilities for validation test suites
 * @module test/game/logic/validation-shared-setup
 * @description
 *   Centralized setup utilities for validation tests. Re-exports existing
 *   test helpers and provides validation-specific helper functions.
 *   This eliminates duplicate mock code across validation test files.
 *
 * @see {@link module:test/helpers/test-helpers} For general test utilities
 * @see {@link module:test/test-utils/mock-logger} For mock logger
 */

// Import utilities first
import { setupTestState as helperSetupTestState } from '../../helpers/test-helpers.js';

// Re-export mock logger (eliminates ~140 lines of duplicate code)
export { createMockLogger } from '../../test-utils/mock-logger.js';

// Re-export test helpers
export {
  setupTestState,
  createCards,
  getCard,
  createMockCard,
  PLAYER_ROLES,
  createBaseGameState,
} from '../../helpers/test-helpers.js';

// Re-export constants for convenience
export {
  GAME_PHASES,
  CARD_SUITS as SUITS,
  CARD_VALUES as VALUES,
  PLAYER_POSITIONS,
} from '../../../src/config/constants.js';

// Import for use in helper functions
import { GAME_PHASES as PHASES } from '../../../src/config/constants.js';

// Re-export all validation errors
export {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidBidError,
  InvalidDiscardError,
  InvalidGoAloneError,
} from '../../../src/game/logic/validation-errors.js';

/**
 * Creates a game state ready for bid validation tests.
 * @param {object} [overrides={}] - Optional overrides for the game state
 * @returns {object} A game state in ORDER_UP_ROUND1 phase
 */
export function createBidGameState(overrides = {}) {
  const { gameState } = helperSetupTestState({
    phase: PHASES.GAME_PHASE_ORDER_UP_ROUND1,
    ...overrides,
  });
  return gameState;
}

/**
 * Creates a game state ready for play validation tests.
 * @param {object} [overrides={}] - Optional overrides for the game state
 * @returns {object} A game state in PLAYING phase
 */
export function createPlayGameState(overrides = {}) {
  const { gameState } = helperSetupTestState({
    phase: PHASES.GAME_PHASE_PLAYING,
    ...overrides,
  });
  return gameState;
}

/**
 * Creates a game state ready for dealer discard validation tests.
 * @param {object} [overrides={}] - Optional overrides for the game state
 * @returns {object} A game state in DEALER_DISCARD phase
 */
export function createDiscardGameState(overrides = {}) {
  const { gameState } = helperSetupTestState({
    phase: PHASES.GAME_PHASE_DEALER_DISCARD,
    ...overrides,
  });
  // The validation code uses the non-prefixed constant
  gameState.gamePhase = PHASES.DEALER_DISCARD;
  return gameState;
}

/**
 * Creates a game state ready for go-alone validation tests.
 * @param {object} [overrides={}] - Optional overrides for the game state
 * @returns {object} A game state in GOING_ALONE_DECISION phase
 */
export function createGoAloneGameState(overrides = {}) {
  const { gameState } = helperSetupTestState({
    phase: PHASES.GAME_PHASE_GOING_ALONE_DECISION,
    ...overrides,
  });
  return gameState;
}
