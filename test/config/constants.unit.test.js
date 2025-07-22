/**
 * @file Unit tests for game constants
 * @module test/config/constants.unit.test
 * @description
 *   Comprehensive test suite for game constants defined in src/config/constants.js.
 *   Ensures all constants are properly defined, have expected values, and maintain
 *   consistency across the application.
 *
 * @see {@link module:src/config/constants} for the constants being tested
 * @see {@link module:test/__mocks__/constants} for mock implementations used in testing
 * @since 1.0.0
 * 
 * @example
 * // Running the tests
 * node --test test/config/constants.unit.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import the constants module for testing
import * as constants from '../../src/config/constants.js';

/**
 * Test suite for game constants.
 * @namespace ConstantsTests
 */
describe('Game Constants', () => {
  /**
   * Test suite for CARD_SUITS constant.
   * @namespace ConstantsTests.CARD_SUITS
   */
  describe('CARD_SUITS', () => {
    it('should contain all required suit values', () => {
      const suits = new Set(Object.values(constants.CARD_SUITS));
      // We expect 4 unique suit values (HEARTS, DIAMONDS, CLUBS, SPADES)
      // but they're duplicated with and without CARD_SUIT_ prefix
      assert.strictEqual(suits.size, 4, 'Should have exactly 4 unique suit values');
    });

    it('should have all required suit values', () => {
      const expectedSuits = [
        'CARD_SUIT_HEARTS',
        'CARD_SUIT_DIAMONDS',
        'CARD_SUIT_CLUBS',
        'CARD_SUIT_SPADES'
      ];
      
      expectedSuits.forEach(suit => {
        assert.ok(
          Object.values(constants.CARD_SUITS).includes(suit),
          `Should include ${suit}`
        );
      });
    });

    it('should maintain backward compatibility with SUITS', () => {
      assert.deepStrictEqual(
        constants.SUITS,
        constants.CARD_SUITS,
        'SUITS should be an alias for CARD_SUITS'
      );
    });
  });

  /**
   * Test suite for CARD_VALUES constant.
   * @namespace ConstantsTests.CARD_VALUES
   */
  describe('CARD_VALUES', () => {
    it('should contain exactly six values', () => {
      assert.strictEqual(
        constants.CARD_VALUES.length,
        6,
        'Should have exactly 6 card values'
      );
    });

    it('should have values in correct order (9 to A)', () => {
      const expectedValues = ['9', '10', 'J', 'Q', 'K', 'A'];
      assert.deepStrictEqual(
        constants.CARD_VALUES,
        expectedValues,
        'Card values should be in ascending order from 9 to A'
      );
    });

    it('should maintain backward compatibility with VALUES', () => {
      assert.deepStrictEqual(
        constants.VALUES,
        constants.CARD_VALUES,
        'VALUES should be an alias for CARD_VALUES'
      );
    });
  });

  /**
   * Test suite for CARD_RANKS constant.
   * @namespace ConstantsTests.CARD_RANKS
   */
  describe('CARD_RANKS', () => {
    it('should have all required rank values', () => {
      const requiredRanks = [
        'RIGHT_BOWER',
        'LEFT_BOWER',
        'ACE',
        'KING',
        'QUEEN',
        'JACK',
        'TEN',
        'NINE',
        'CARD_RANK_RIGHT_BOWER',
        'CARD_RANK_LEFT_BOWER',
        'CARD_RANK_ACE',
        'CARD_RANK_KING',
        'CARD_RANK_QUEEN',
        'CARD_RANK_JACK',
        'CARD_RANK_TEN',
        'CARD_RANK_NINE',
        'TRUMP_OFFSET',
        'LED_OFFSET',
        'INVALID'
      ];

      requiredRanks.forEach(rank => {
        assert.ok(
          rank in constants.CARD_RANKS,
          `Should include ${rank} in CARD_RANKS`
        );
      });
    });

    it('should have correct rank values', () => {
      assert.strictEqual(constants.CARD_RANKS.RIGHT_BOWER, 150, 'RIGHT_BOWER should be 150');
      assert.strictEqual(constants.CARD_RANKS.LEFT_BOWER, 100, 'LEFT_BOWER should be 100');
      assert.strictEqual(constants.CARD_RANKS.ACE, 14, 'ACE should be 14');
      assert.strictEqual(constants.CARD_RANKS.KING, 13, 'KING should be 13');
      assert.strictEqual(constants.CARD_RANKS.QUEEN, 12, 'QUEEN should be 12');
      assert.strictEqual(constants.CARD_RANKS.JACK, 11, 'JACK should be 11');
      assert.strictEqual(constants.CARD_RANKS.TEN, 10, 'TEN should be 10');
      assert.strictEqual(constants.CARD_RANKS.NINE, 9, 'NINE should be 9');
      assert.strictEqual(constants.CARD_RANKS.TRUMP_OFFSET, 100, 'TRUMP_OFFSET should be 100');
      assert.strictEqual(constants.CARD_RANKS.LED_OFFSET, 50, 'LED_OFFSET should be 50');
      assert.strictEqual(constants.CARD_RANKS.INVALID, 0, 'INVALID should be 0');
    });
  });

  /**
   * Test suite for BID_DECISIONS constant.
   * @namespace ConstantsTests.BID_DECISIONS
   */
  describe('BID_DECISIONS', () => {
    it('should have all required decision types', () => {
      const requiredDecisions = [
        'ORDER_UP',
        'PASS',
        'CALL_TRUMP',
        'BID_DECISION_ORDER_UP',
        'BID_DECISION_PASS',
        'BID_DECISION_CALL_TRUMP'
      ];

      requiredDecisions.forEach(decision => {
        assert.ok(
          decision in constants.BID_DECISIONS,
          `Should include ${decision} in BID_DECISIONS`
        );
      });
    });
  });

  /**
   * Test suite for LOG_LEVELS constant.
   * @namespace ConstantsTests.LOG_LEVELS
   */
  describe('LOG_LEVELS', () => {
    it('should have all required log levels', () => {
      const requiredLevels = [
        'ERROR',
        'WARN',
        'INFO',
        'DEBUG',
        'TRACE',
        'LOG_LEVEL_ERROR',
        'LOG_LEVEL_WARN',
        'LOG_LEVEL_INFO',
        'LOG_LEVEL_DEBUG',
        'LOG_LEVEL_TRACE'
      ];

      requiredLevels.forEach(level => {
        assert.ok(
          level in constants.LOG_LEVELS,
          `Should include ${level} in LOG_LEVELS`
        );
      });
    });

    it('should maintain backward compatibility with DEBUG_LEVELS', () => {
      assert.deepStrictEqual(
        constants.DEBUG_LEVELS,
        constants.LOG_LEVELS,
        'DEBUG_LEVELS should be an alias for LOG_LEVELS'
      );
    });
  });

  /**
   * Test suite for STORAGE_KEYS constant.
   * @namespace ConstantsTests.STORAGE_KEYS
   */
  describe('STORAGE_KEYS', () => {
    it('should have all required storage keys', () => {
      const requiredKeys = [
        'GAME_STATE',
        'PLAYER_ID',
        'PLAYER_NAME',
        'GAME_SETTINGS',
        'STORAGE_KEY_GAME_STATE',
        'STORAGE_KEY_PLAYER_ID',
        'STORAGE_KEY_PLAYER_NAME',
        'STORAGE_KEY_GAME_SETTINGS'
      ];

      requiredKeys.forEach(key => {
        assert.ok(
          key in constants.STORAGE_KEYS,
          `Should include ${key} in STORAGE_KEYS`
        );
      });
    });
  });

  /**
   * Test suite for GAME_EVENTS constant.
   * @namespace ConstantsTests.GAME_EVENTS
   */
  describe('GAME_EVENTS', () => {
    it('should have all required event types', () => {
      const requiredEvents = [
        'STATE_UPDATE',
        'REQUEST_FULL_STATE',
        'PLAY_CARD',
        'ACTION_ORDER_UP_DECISION',
        'ACTION_DEALER_DISCARD',
        'ACTION_CALL_TRUMP_DECISION',
        'JOIN_GAME',
        'ACTION_REJOIN_GAME',
        'ASSIGN_ROLE',
        'GAME_FULL',
        'PLAYER_ALREADY_IN_GAME',
        'PLAYER_CONNECTED',
        'PLAYER_DISCONNECTED',
        'RECONNECT',
        'GAME_STARTED',
        'ROUND_STARTED',
        'TRICK_COMPLETED',
        'GAME_OVER',
        'ERROR',
        'GAME_EVENT_STATE_UPDATE',
        'GAME_EVENT_REQUEST_STATE',
        'GAME_EVENT_PLAYER_ACTION',
        'GAME_EVENT_CHAT_MESSAGE',
        'GAME_EVENT_PLAYER_JOIN',
        'GAME_EVENT_PLAYER_LEAVE',
        'GAME_EVENT_GAME_OVER'
      ];

      requiredEvents.forEach(event => {
        assert.ok(
          event in constants.GAME_EVENTS,
          `Should include ${event} in GAME_EVENTS`
        );
      });
    });
  });

  /**
   * Test suite for GAME_PHASES constant.
   * @namespace ConstantsTests.GAME_PHASES
   */
  describe('GAME_PHASES', () => {
    it('should have all required game phases', () => {
      const requiredPhases = [
        'LOBBY',
        'DEALING',
        'ORDER_UP_ROUND1',
        'ORDER_UP_ROUND2',
        'GOING_ALONE_DECISION',
        'PLAYING',
        'SCORING',
        'GAME_OVER',
        'GAME_PHASE_LOBBY',
        'GAME_PHASE_DEALING',
        'GAME_PHASE_ORDER_UP_ROUND1',
        'GAME_PHASE_ORDER_UP_ROUND2',
        'GAME_PHASE_GOING_ALONE_DECISION',
        'GAME_PHASE_PLAYING',
        'GAME_PHASE_SCORING',
        'GAME_PHASE_GAME_OVER'
      ];

      requiredPhases.forEach(phase => {
        assert.ok(
          phase in constants.GAME_PHASES,
          `Should include ${phase} in GAME_PHASES`
        );
      });
    });
  });

  /**
   * Test suite for PLAYER_ROLES constant.
   * @namespace ConstantsTests.PLAYER_ROLES
   */
  describe('PLAYER_ROLES', () => {
    it('should contain exactly four player roles', () => {
      assert.strictEqual(
        constants.PLAYER_ROLES.length,
        4,
        'Should have exactly 4 player roles'
      );
    });

    it('should have all required player roles', () => {
      const expectedRoles = [
        'PLAYER_SOUTH',
        'PLAYER_WEST',
        'PLAYER_NORTH',
        'PLAYER_EAST'
      ];

      expectedRoles.forEach(role => {
        assert.ok(
          constants.PLAYER_ROLES.includes(role),
          `Should include ${role} in PLAYER_ROLES`
        );
      });
    });
  });

  /**
   * Test suite for PLAYER_POSITIONS constant.
   * @namespace ConstantsTests.PLAYER_POSITIONS
   */
  describe('PLAYER_POSITIONS', () => {
    it('should have all required player positions', () => {
      const requiredPositions = [
        'SOUTH',
        'WEST',
        'NORTH',
        'EAST',
        'PLAYER_SOUTH',
        'PLAYER_WEST',
        'PLAYER_NORTH',
        'PLAYER_EAST'
      ];

      requiredPositions.forEach(position => {
        assert.ok(
          position in constants.PLAYER_POSITIONS,
          `Should include ${position} in PLAYER_POSITIONS`
        );
      });
    });
  });

  /**
   * Test suite for TEAMS constant.
   * @namespace ConstantsTests.TEAMS
   */
  describe('TEAMS', () => {
    it('should have all required team identifiers', () => {
      const requiredTeams = [
        'NS',
        'EW',
        'TEAM_NS',
        'TEAM_EW'
      ];

      requiredTeams.forEach(team => {
        assert.ok(
          team in constants.TEAMS,
          `Should include ${team} in TEAMS`
        );
      });
    });
  });

  /**
   * Test suite for WINNING_SCORE constant.
   * @namespace ConstantsTests.WINNING_SCORE
   */
  describe('WINNING_SCORE', () => {
    it('should be a number', () => {
      assert.strictEqual(
        typeof constants.WINNING_SCORE,
        'number',
        'WINNING_SCORE should be a number'
      );
    });

    it('should have a value of 10', () => {
      assert.strictEqual(
        constants.WINNING_SCORE,
        10,
        'WINNING_SCORE should be 10'
      );
    });
  });
});
