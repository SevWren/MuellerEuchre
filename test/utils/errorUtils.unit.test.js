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
 */
import { expect } from 'chai';
import { createErrorPayload } from '../../src/utils/errorUtils.js';
import { GAME_EVENTS } from '../../src/config/constants.js';

describe('Error Utils', () => {
  describe('createErrorPayload', () => {
    it('should create an error payload with action and message', () => {
      const action = GAME_EVENTS.PLAY_CARD;
      const message = 'Failed to play card.';
      const payload = createErrorPayload(action, message);
      expect(payload).to.deep.equal({
        action,
        message,
        details: null,
      });
    });

    it('should create an error payload with action, message, and details', () => {
      const action = GAME_EVENTS.ACTION_ORDER_UP_DECISION;
      const message = 'Invalid decision.';
      const details = { reason: 'Not your turn' };
      const payload = createErrorPayload(action, message, details);
      expect(payload).to.deep.equal({
        action,
        message,
        details,
      });
    });

    it('should create an error payload with string details', () => {
      const action = GAME_EVENTS.JOIN_GAME;
      const message = 'Cannot join game.';
      const details = 'Game is full.';
      const payload = createErrorPayload(action, message, details);
      expect(payload).to.deep.equal({
        action,
        message,
        details,
      });
    });
  });
});
