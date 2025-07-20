
/**
 * @file Unit tests for the players mock implementation.
 * @module test/__mocks__/players.unit.test
 * @description
 *   This test suite validates the pure, deterministic behavior of the `players` mock module.
 *   It ensures that the mock functions (`getNextPlayer`, `getPartner`, `getTeamId`, `isValidPlayerRole`)
 *   provide predictable outputs and correctly track their calls in `callHistory`.
 *   The `reset` function's ability to clear call history is also thoroughly tested,
 *   guaranteeing proper test isolation.
 *
 * @see {@link module:test/__mocks__/players} - The mock implementation being tested.
 * @see {@link module:test/__mocks__/mocks_doc.md} - General mocking guidelines.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { getNextPlayer, getPartner, getTeamId, isValidPlayerRole, callHistory, reset } from './players.js';
import { PLAYER_POSITIONS, TEAMS } from '../../../src/config/constants.js';

/**
 * @constant {object} PLAYER_POSITIONS - Destructured player position constants for test readability.
 */
const {
  PLAYER_NORTH,
  PLAYER_SOUTH,
  PLAYER_EAST,
  PLAYER_WEST
} = PLAYER_POSITIONS;

/**
 * @describe Top-level test suite for the Players Mock module.
 */
describe('Players Mock', () => {
  /**
   * @function beforeEach
   * @description Resets the call history of all mock functions before each test
   * to ensure test isolation and a clean state.
   * @returns {void}
   */
  beforeEach(() => {
    reset();
  });

  /**
   * @describe Test suite for the `getNextPlayer` mock function.
   * @see {@link module:test/__mocks__/players.getNextPlayer}
   */
  describe('getNextPlayer', () => {
    /**
     * @test {getNextPlayer}
     * @description Verifies that `getNextPlayer` correctly returns the subsequent
     * player in the defined rotation, including wrapping around from the last player
     * to the first.
     * @returns {void}
     */
    it('should return the next player in rotation', () => {
      const players = [PLAYER_NORTH, PLAYER_EAST, PLAYER_SOUTH, PLAYER_WEST];

      assert.strictEqual(getNextPlayer(PLAYER_NORTH, players), PLAYER_EAST);
      assert.strictEqual(getNextPlayer(PLAYER_EAST, players), PLAYER_SOUTH);
      assert.strictEqual(getNextPlayer(PLAYER_SOUTH, players), PLAYER_WEST);
      assert.strictEqual(getNextPlayer(PLAYER_WEST, players), PLAYER_NORTH); // Wraps around
    });

    /**
     * @test {getNextPlayer}
     * @description Ensures `getNextPlayer` can correctly extract player roles
     * from an array of player objects and determine the next player.
     * @returns {void}
     */
    it('should work with player objects', () => {
      const players = [
        { role: PLAYER_NORTH },
        { role: PLAYER_EAST },
        { role: PLAYER_SOUTH },
        { role: PLAYER_WEST }
      ];

      assert.strictEqual(getNextPlayer(PLAYER_NORTH, players), PLAYER_EAST);
    });

    /**
     * @test {getNextPlayer}
     * @description Confirms that `getNextPlayer` records its calls, including
     * input parameters and the returned value, in the `callHistory` object.
     * @returns {void}
     */
    it('should track calls in callHistory', () => {
      const players = [PLAYER_NORTH, PLAYER_EAST];
      getNextPlayer(PLAYER_NORTH, players);

      assert.strictEqual(callHistory.getNextPlayer.length, 1);
      assert.deepStrictEqual(callHistory.getNextPlayer[0], {
        currentPlayer: PLAYER_NORTH,
        players,
        nextPlayer: PLAYER_EAST
      });
    });
  });

  /**
   * @describe Test suite for the `getPartner` mock function.
   * @see {@link module:test/__mocks__/players.getPartner}
   */
  describe('getPartner', () => {
    /**
     * @test {getPartner}
     * @description Verifies that `getPartner` returns the correct partner role
     * for each of the four player positions in a Euchre game.
     * @returns {void}
     */
    it('should return the correct partner for each position', () => {
      assert.strictEqual(getPartner(PLAYER_NORTH), PLAYER_SOUTH);
      assert.strictEqual(getPartner(PLAYER_SOUTH), PLAYER_NORTH);
      assert.strictEqual(getPartner(PLAYER_EAST), PLAYER_WEST);
      assert.strictEqual(getPartner(PLAYER_WEST), PLAYER_EAST);
    });

    /**
     * @test {getPartner}
     * @description Confirms that `getPartner` records its calls, including
     * the input player role and the returned partner, in the `callHistory` object.
     * @returns {void}
     */
    it('should track calls in callHistory', () => {
      getPartner(PLAYER_NORTH);

      assert.strictEqual(callHistory.getPartner.length, 1);
      assert.deepStrictEqual(callHistory.getPartner[0], {
        playerRole: PLAYER_NORTH,
        partner: PLAYER_SOUTH
      });
    });
  });

  /**
   * @describe Test suite for the `getTeamId` mock function.
   * @see {@link module:test/__mocks__/players.getTeamId}
   */
  describe('getTeamId', () => {
    /**
     * @test {getTeamId}
     * @description Verifies that `getTeamId` correctly assigns the team
     * identifier (`TEAM_NS` or `TEAM_EW`) to each player position.
     * @returns {void}
     */
    it('should return correct team for each position', () => {
      assert.strictEqual(getTeamId(PLAYER_NORTH), TEAMS.TEAM_NS);
      assert.strictEqual(getTeamId(PLAYER_SOUTH), TEAMS.TEAM_NS);
      assert.strictEqual(getTeamId(PLAYER_EAST), TEAMS.TEAM_EW);
      assert.strictEqual(getTeamId(PLAYER_WEST), TEAMS.TEAM_EW);
    });
  });

  /**
   * @describe Test suite for the `isValidPlayerRole` mock function.
   * @see {@link module:test/__mocks__/players.isValidPlayerRole}
   */
  describe('isValidPlayerRole', () => {
    /**
     * @test {isValidPlayerRole}
     * @description Ensures `isValidPlayerRole` returns `true` for all
     * predefined valid player roles.
     * @returns {void}
     */
    it('should return true for valid player roles', () => {
      Object.values(PLAYER_POSITIONS).forEach(role => {
        assert.strictEqual(isValidPlayerRole(role), true);
      });
    });

    /**
     * @test {isValidPlayerRole}
     * @description Verifies that `isValidPlayerRole` returns `false` for
     * inputs that are not valid player roles, including empty strings, `null`,
     * and `undefined`.
     * @returns {void}
     */
    it('should return false for invalid player roles', () => {
      assert.strictEqual(isValidPlayerRole('INVALID_ROLE'), false);
      assert.strictEqual(isValidPlayerRole(''), false);
      assert.strictEqual(isValidPlayerRole(null), false);
      assert.strictEqual(isValidPlayerRole(undefined), false);
    });
  });

  /**
   * @describe Test suite for the `reset` function.
   * @see {@link module:test/__mocks__/players.reset}
   */
  describe('reset', () => {
    /**
     * @test {reset}
     * @description Confirms that `reset` successfully clears the call history
     * for all tracked mock functions, ensuring a clean state for subsequent tests.
     * @returns {void}
     */
    it('should clear all call history', () => {
      // Make some calls
      getNextPlayer(PLAYER_NORTH, [PLAYER_NORTH, PLAYER_EAST]);
      getPartner(PLAYER_NORTH);

      // Verify calls were made
      assert.strictEqual(callHistory.getNextPlayer.length, 1);
      assert.strictEqual(callHistory.getPartner.length, 1);

      // Reset and verify cleared
      reset();
      assert.strictEqual(callHistory.getNextPlayer.length, 0);
      assert.strictEqual(callHistory.getPartner.length, 0);
    });
  });
});
