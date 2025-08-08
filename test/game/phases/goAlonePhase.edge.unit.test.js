/**
 * @file test/game/phases/goAlonePhase.edge.unit.test.js
 * @module test/game/phases/goAlonePhase.edge.unit
 * @description
 *   Comprehensive edge case tests for the "Go Alone" phase logic in Euchre Multiplayer.
 *   These tests specifically target error conditions, boundary cases, and unusual scenarios
 *   that might not be covered in the main test suite.
 *
 *   Test Categories:
 *   - Player Object Edge Cases: Tests handling of malformed or missing player data
 *   - Game Message Edge Cases: Tests behavior with missing or malformed game messages
 *
 *   Key Test Scenarios:
 *   - Handling of undefined/missing player names
 *   - Missing or null player objects
 *   - Undefined or malformed game message arrays
 *   - Preservation of existing game state
 *
 * @see {@link module:src/game/phases/goAlonePhase} - The implementation being tested
 * @see {@link module:test/game/phases/goAlonePhase.unit.test.js} - Main test suite for goAlonePhase
 * @see {@link module:test/helpers/test-helpers} - Test utilities and helpers
 * @see {@link module:.windsurf/rules/jsdoc.md} - JSDoc style guide
 *
 * @test {handleGoAloneDecision} - Tests edge cases in the go alone decision logic
 * @test {GameState} - Verifies state transitions and validation in edge scenarios
 *
 * @example
 * // Run all edge case tests
 * node --test test/game/phases/goAlonePhase.edge.unit.test.js
 *
 * @example
 * // Run a specific test
 * node --test --test-name-pattern="should handle undefined player names" test/game/phases/goAlonePhase.edge.unit.test.js
 *
 * @since 1.0.0
 * @lastModified 2025-08-07
 */

/**
 * Node.js test runner and assertion library.
 * @see {@link https://nodejs.org/api/test.html}
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
/**
 * Game constants and phase logic.
 * @see {@link module:src/config/constants}
 */
import {
  GAME_PHASES,
  PLAYER_ROLES,
  TEAMS
} from '../../../src/config/constants.js';

/**
 * The function under test.
 * @see {@link module:src/game/phases/goAlonePhase}
 */
import { handleGoAloneDecision } from '../../../src/game/phases/goAlonePhase.js';

/**
 * Creates a minimal valid game state for testing edge cases in the go alone phase.
 * This helper function sets up a basic game state with the specified dealer and trump maker,
 * including all required player objects and game phase information.
 *
 * @param {string} dealer - The player role (e.g., 'PLAYER_NORTH') who is the dealer
 * @param {string} trumpMaker - The player role who made the trump call
 * @returns {Object} A game state object with the specified dealer and trump maker
 * @property {Object} players - Object containing player information
 * @property {string} dealer - The dealer's role
 * @property {string} playerWhoCalledTrump - The player who called trump
 * @property {string} [gamePhase] - The current game phase (optional)
 * @property {string} [makerTeam] - The team that made the trump call (optional)
 *
 * @example
 * // Create a test state with North as dealer and East as trump maker
 * const testState = createEdgeCaseState('PLAYER_NORTH', 'PLAYER_EAST');
 */
function createEdgeCaseState(dealer, trumpMaker) {
  // Create a complete set of players
  const players = {};
  for (const role of PLAYER_ROLES) {
    players[role] = {
      id: role,
      name: role.replace('PLAYER_', ''),
      teamId: [TEAMS.TEAM_NS, TEAMS.TEAM_EW][role.endsWith('_WEST') || role.endsWith('_EAST') ? 1 : 0]
    };
  }

  // Ensure the trump maker exists in the players object
  if (trumpMaker && !players[trumpMaker]) {
    players[trumpMaker] = { 
      id: trumpMaker, 
      name: trumpMaker, 
      teamId: TEAMS.TEAM_NS 
    };
  }

  return {
    dealer,
    currentPlayer: trumpMaker,
    trumpMaker,
    playerWhoOrderedUp: trumpMaker, // Required to identify who can go alone
    playerWhoCalledTrump: trumpMaker, // Alternative way to identify trump maker
    gamePhase: GAME_PHASES.GAME_PHASE_GOING_ALONE_DECISION,
    players,
    currentTrick: [],
    gameMessages: [],
    leadSuit: null,
    trumpSuit: 'hearts',
    goingAlone: false,
    playerGoingAlone: null,
    partnerSittingOut: null,
    // Add any other required properties
    scores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
    hands: {},
    kitty: []
  };
};

/**
 * Main test suite for Go Alone phase edge cases.
 * Focuses on testing error conditions and boundary cases not covered in the main test suite.
 * @see {@link module:test/game/phases/goAlonePhase.edge.unit}
 */
describe('GoAlonePhase Edge Cases', () => {
  /**
   * Tests related to handling various player object edge cases.
   * Verifies behavior with malformed or incomplete player data.
   * @see {@link module:src/game/phases/goAlonePhase~handleGoAloneDecision}
   */
  describe('Player Object Edge Cases', () => {
    /**
     * Verifies that the system handles undefined player names correctly
     * when a player chooses to go alone.
     * @test {handleGoAloneDecision} - Player name handling
     */
    it('should handle undefined player names when going alone', () => {
      const [SOUTH, NORTH] = PLAYER_ROLES;
      const gameState = createEdgeCaseState(SOUTH, SOUTH);
      
      // Set up players with undefined names
      gameState.players[SOUTH].name = undefined;
      gameState.players[NORTH].name = undefined;
      
      const newState = handleGoAloneDecision(gameState, SOUTH, true);
      const message = newState.gameMessages[0].text;
      assert.match(message, new RegExp(`${SOUTH} is going alone!`));
      // The actual message includes the partner's role name
      assert.match(message, /NORTH sits out/);
    });
    
    /**
     * Verifies that the system handles undefined player names correctly
     * when playing with a partner.
     * @test {handleGoAloneDecision} - Player name handling
     */
    it('should handle undefined player names when playing with partner', () => {
      const [SOUTH] = PLAYER_ROLES;
      const gameState = createEdgeCaseState(SOUTH, SOUTH);
      
      // Set up players with undefined names
      gameState.players[SOUTH].name = undefined;
      
      const newState = handleGoAloneDecision(gameState, SOUTH, false);
      const message = newState.gameMessages[0].text;
      assert.match(message, new RegExp(`${SOUTH} chooses to play with a partner`));
    });
    
    /**
     * Verifies that the system handles missing player names correctly.
     * @test {handleGoAloneDecision} - Player name handling
     */
    it('should handle missing player name in players object', () => {
      const [SOUTH] = PLAYER_ROLES;
      const gameState = createEdgeCaseState(SOUTH, SOUTH);
      
      // Remove name from player object
      delete gameState.players[SOUTH].name;
      
      const newState = handleGoAloneDecision(gameState, SOUTH, true);
      const message = newState.gameMessages[0].text;
      assert.match(message, new RegExp(`${SOUTH} is going alone!`));
    });

    /**
     * Verifies that the system handles missing partner objects correctly.
     * @test {handleGoAloneDecision} - Partner handling
     */
    it('should handle missing partner in players object', () => {
      const [SOUTH, , NORTH] = PLAYER_ROLES;
      const gameState = createEdgeCaseState(SOUTH, SOUTH);
      
      // Remove partner from players
      delete gameState.players[NORTH];
      
      const newState = handleGoAloneDecision(gameState, SOUTH, true);
      const message = newState.gameMessages[0].text;
      assert.match(message, /Partner sits out/);
    });

    /**
     * Verifies that the system handles an empty players object correctly.
     * @test {handleGoAloneDecision} - Players object handling
     */
    it('should handle empty players object', () => {
      const [SOUTH] = PLAYER_ROLES;
      const gameState = createEdgeCaseState(SOUTH, SOUTH);
      gameState.players = {};
      
      const newState = handleGoAloneDecision(gameState, SOUTH, true);
      const message = newState.gameMessages[0].text;
      assert.match(message, new RegExp(`${SOUTH} is going alone!`));
    });

    /**
     * Verifies that the system throws a ValidationError when players is null.
     * @test {handleGoAloneDecision} - Error handling
     */
    it('should throw ValidationError when players object is null', () => {
      const [SOUTH] = PLAYER_ROLES;
      const gameState = createEdgeCaseState(SOUTH, SOUTH);
      gameState.players = null;
      
      assert.throws(
        () => handleGoAloneDecision(gameState, SOUTH, true),
        {
          name: 'ValidationError',
          message: 'Invalid game state: missing or invalid players'
        }
      );
    });
  });

  /**
   * Tests related to game message handling edge cases.
   * Verifies proper handling of missing or malformed message arrays.
   * @see {@link module:src/game/phases/goAlonePhase~handleGoAloneDecision}
   */
  describe('Game Message Edge Cases', () => {
    /**
     * Verifies that the system handles a missing gameMessages array correctly.
     * @test {handleGoAloneDecision} - Game messages handling
     */
    it('should handle missing gameMessages array', () => {
      const [SOUTH] = PLAYER_ROLES;
      const gameState = createEdgeCaseState(SOUTH, SOUTH);
      
      // Explicitly set gameMessages to undefined to test this edge case
      gameState.gameMessages = undefined;
      
      const newState = handleGoAloneDecision(gameState, SOUTH, true);
      
      // Verify the game state was updated correctly
      assert(Array.isArray(newState.gameMessages), 'Should create new gameMessages array');
      assert.strictEqual(newState.gameMessages.length, 1, 'Should have one game message');
      assert.match(newState.gameMessages[0].text, /is going alone/, 'Should indicate going alone');
      assert.strictEqual(newState.goingAlone, true, 'Should set goingAlone to true');
      assert.strictEqual(newState.playerGoingAlone, SOUTH, 'Should set playerGoingAlone to SOUTH');
      assert.strictEqual(newState.partnerSittingOut, 'PLAYER_NORTH', 'Should set partnerSittingOut to NORTH');
    });

    /**
     * Verifies that existing game messages are preserved when new ones are added.
     * @test {handleGoAloneDecision} - Game messages handling
     */
    it('should preserve existing game messages', () => {
      const [SOUTH] = PLAYER_ROLES;
      const gameState = createEdgeCaseState(SOUTH, SOUTH);
      
      // Set up existing messages
      const testMessage = { type: 'test', text: 'Previous message', timestamp: new Date().toISOString() };
      gameState.gameMessages = [testMessage];
      
      const newState = handleGoAloneDecision(gameState, SOUTH, false);
      
      // Verify the game state was updated correctly
      assert(Array.isArray(newState.gameMessages), 'Should have gameMessages array');
      assert.strictEqual(newState.gameMessages.length, 2, 'Should have both old and new messages');
      assert.deepStrictEqual(
        newState.gameMessages[0], 
        testMessage, 
        'Should preserve original message exactly'
      );
      assert.match(
        newState.gameMessages[1].text, 
        /chooses to play with a partner/, 
        'Should add new message about playing with partner'
      );
      assert.strictEqual(newState.goingAlone, false, 'Should set goingAlone to false');
      assert.strictEqual(newState.playerGoingAlone, null, 'Should not set playerGoingAlone');
      assert.strictEqual(newState.partnerSittingOut, null, 'Should not set partnerSittingOut');
    });
    
    /**
     * Verifies that the correct message is generated when playing with a partner.
     * @test {handleGoAloneDecision} - Message generation
     */
    it('should generate correct message when playing with partner', () => {
      const [SOUTH] = PLAYER_ROLES;
      const gameState = createEdgeCaseState(SOUTH, SOUTH);
      
      // Call with wantsToGoAlone = false to test the other branch of the ternary
      const newState = handleGoAloneDecision(gameState, SOUTH, false);
      
      // Verify the game message was generated correctly
      assert.strictEqual(newState.gameMessages.length, 1, 'Should have one game message');
      assert.match(
        newState.gameMessages[0].text, 
        /chooses to play with a partner/, 
        'Should indicate playing with partner'
      );
      
      // Also verify the state is set correctly for playing with a partner
      assert.strictEqual(newState.goingAlone, false, 'Should set goingAlone to false');
      assert.strictEqual(newState.playerGoingAlone, null, 'Should not set playerGoingAlone');
      assert.strictEqual(newState.partnerSittingOut, null, 'Should not set partnerSittingOut');
    });
  });
});
