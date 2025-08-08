/**
 * @file Unit tests for error utility functions in the Euchre Multiplayer game.
 * @module test/utils/errorUtils.unit.test
 * @description
 *   Comprehensive test suite for error payload creation utility functions.
 *   Verifies the behavior of error payload creation with various input combinations,
 *   ensuring proper handling of action, message, and details parameters.
 *
 * @see {@link module:src/utils/errorUtils} for the implementation being tested
 * @see {@link module:src/config/constants} for GAME_EVENTS constants
 *
 * @example
 * // Running the tests
 * node --test test/utils/errorUtils.unit.test.js
 *
 * @example
 * // Running with coverage report
 * npx c8 --include="src/utils/errorUtils.js" node --test test/utils/errorUtils.unit.test.js
 *
 * @version 1.0.0
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
 * @see {@link module:src/utils/errorUtils} for the implementation
 */
describe('Error Utils', () => {
  /**
   * Test suite for the createErrorPayload function.
   * @namespace ErrorUtilsTests.createErrorPayload
   * @see {@link module:src/utils/errorUtils.createErrorPayload}
   */
  describe('createErrorPayload', () => {
    /**
     * Tests that createErrorPayload creates a payload with action and message.
     * @function
     * @name should_create_an_error_payload_with_action_and_message
     * @memberof ErrorUtilsTests.createErrorPayload
     * @see {@link module:src/utils/errorUtils.createErrorPayload}
     */
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

    /**
     * Tests that createErrorPayload includes details when provided.
     * @function
     * @name should_create_an_error_payload_with_action_message_and_details
     * @memberof ErrorUtilsTests.createErrorPayload
     * @see {@link module:src/config/constants.GAME_EVENTS} for valid action values
     */
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

    /**
     * Tests that createErrorPayload handles string details correctly.
     * @function
     * @name should_create_an_error_payload_with_string_details
     * @memberof ErrorUtilsTests.createErrorPayload
     */
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
