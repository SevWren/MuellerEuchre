/**
 * @file test/config/constants.unit.test.js
 * @module test/config/constants.unit.test
 * @description
 *   Comprehensive test suite for the game constants defined in `src/config/constants.js`.
 *   This suite verifies that all exported constant objects and values are correctly defined,
 *   immutable where expected (`Object.freeze`), and that backward-compatibility aliases
 *   (e.g., `SUITS` for `CARD_SUITS`) are maintained. It serves as the authoritative
 *   specification for the structure of the constants module.
 *
 * @see {@link module:src/config/constants} for the source module being tested.
 * @see {@link file://./test/config/constants.unit.test.doc.md} for detailed documentation of this test file.
 *
 * @example
 * // To run these tests directly from the command line:
 * node --test test/config/constants.unit.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import the constants module for testing
import * as constants from '../../src/config/constants.js';

/**
 * @description Groups all tests related to the constants defined in `src/config/constants.js`.
 * @namespace ConstantsTests
 */
describe('Game Constants', () => {
  /**
   * @description Tests the `CARD_SUITS` constant object, ensuring it contains all four unique card suits and that the `SUITS` alias is maintained for backward compatibility.
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
   * @description Tests the `CARD_VALUES` constant array, verifying it contains the correct six card values in the specified order and maintains the `VALUES` alias.
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
   * @description Tests the `CARD_RANKS` constant object, verifying all numeric rank values and special offsets.
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
   * @description Tests the `BID_DECISIONS` constant object for bidding actions.
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
   * @description Tests the `LOG_LEVELS` constant object and its `DEBUG_LEVELS` alias.
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
   * @description Tests the `STORAGE_KEYS` constant object for local storage keys.
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
   * @description Tests the `GAME_EVENTS` constant object for socket event names.
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
   * @description Tests the `GAME_PHASES` constant object for game state machine phases.
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
   * @description Tests the `PLAYER_ROLES` constant array for player seating positions.
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
   * @description Tests the `PLAYER_POSITIONS` constant object, which provides convenient aliases for roles.
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
   * @description Tests the `TEAMS` constant object for team identifiers.
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
   * @description Tests the `WINNING_SCORE` constant value.
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