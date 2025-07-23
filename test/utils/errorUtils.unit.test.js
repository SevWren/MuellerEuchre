/**
 * Unit tests for error utility functions in the Euchre Multiplayer game.
 * @module test/utils/errorUtils.unit.test
 * @description
 *   Test suite for error payload creation utility functions.
 *   - Tests cover the createErrorPayload function which standardizes error responses
 *   - Verifies proper handling of action, message, and details parameters
 *
 * @see {@link module:src/utils/errorUtils} for the implementation being tested
 * @since 1.0.0
 * @see {@link module:test/utils/deck.unit.test} for reference implementation
 * 
 * 7-23-25 100% Passing 100% Coverage
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createErrorPayload } from '../../src/utils/errorUtils.js';
import { GAME_EVENTS } from '../../src/config/constants.js';

/**
 * Test suite for error utility functions.
 * @namespace ErrorUtilsTests
 */
describe('Error Utils', () => {
  /**
   * Test suite for the createErrorPayload function.
   * @namespace ErrorUtilsTests.createErrorPayload
   * @see {@link module:src/utils/errorUtils.createErrorPayload}
   */
  describe('createErrorPayload', () => {
    it('should create an error payload with action and message', () => {
      const action = GAME_EVENTS.PLAY_CARD;
      const message = 'Failed to play card.';
      const payload = createErrorPayload(action, message);
      
      assert.deepStrictEqual(payload, {
        action,
        message,
        details: null,
      }, 'Should create payload with action and message');
    });

    it('should create an error payload with action, message, and details', () => {
      const action = GAME_EVENTS.ACTION_ORDER_UP_DECISION;
      const message = 'Invalid decision.';
      const details = { reason: 'Not your turn' };
      const payload = createErrorPayload(action, message, details);
      
      assert.deepStrictEqual(payload, {
        action,
        message,
        details,
      }, 'Should include details object in payload');
    });

    it('should create an error payload with string details', () => {
      const action = GAME_EVENTS.JOIN_GAME;
      const message = 'Cannot join game.';
      const details = 'Game is full.';
      const payload = createErrorPayload(action, message, details);
      
      assert.deepStrictEqual(payload, {
        action,
        message,
        details,
      }, 'Should handle string details');
    });
  });
});
