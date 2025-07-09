/**
 * @file test/game/phases/goAlonePhase.edge.unit.test.js
 * @module test/game/phases/goAlonePhase.edge.unit
 * @description
 *   Edge case tests for the "Go Alone" phase logic in Euchre Multiplayer.
 *   These tests target specific branches not covered by the main test file.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME_PHASES,
  PLAYER_ROLES,
  TEAMS
} from '../../../src/config/constants.js';
import { handleGoAloneDecision } from '../../../src/game/phases/goAlonePhase.js';

// Helper function to create a minimal valid game state for edge case testing
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

  return {
    dealer,
    currentPlayer: trumpMaker,
    trumpMaker,
    playerWhoOrderedUp: trumpMaker, // Required to identify who can go alone
    playerWhoCalledTrump: trumpMaker, // Alternative way to identify trump maker
    gamePhase: GAME_PHASES.GAME_PHASE_GOING_ALONE_DECISION,
    players,
    currentTrick: { cards: [] },
    gameMessages: [],
    // Add required fields to prevent validation errors
    currentTrick: [],
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

  // Ensure the trump maker exists in the players object
  if (trumpMaker && !state.players[trumpMaker]) {
    state.players[trumpMaker] = { id: trumpMaker, name: trumpMaker, teamId: TEAMS.TEAM_NS };
  }
  
  return state;
};

describe('GoAlonePhase Edge Cases', () => {
  describe('Player Object Edge Cases', () => {
    it('should handle missing player name in players object', () => {
      const [SOUTH] = PLAYER_ROLES;
      const gameState = createEdgeCaseState(SOUTH, SOUTH);
      
      // Remove name from player object
      delete gameState.players[SOUTH].name;
      
      const newState = handleGoAloneDecision(gameState, SOUTH, true);
      const message = newState.gameMessages[0].text;
      assert.match(message, new RegExp(`${SOUTH} is going alone!`));
    });

    it('should handle missing partner in players object', () => {
      const [SOUTH, , NORTH] = PLAYER_ROLES;
      const gameState = createEdgeCaseState(SOUTH, SOUTH);
      
      // Remove partner from players
      delete gameState.players[NORTH];
      
      const newState = handleGoAloneDecision(gameState, SOUTH, true);
      const message = newState.gameMessages[0].text;
      assert.match(message, /Partner sits out/);
    });

    it('should handle empty players object', () => {
      const [SOUTH] = PLAYER_ROLES;
      const gameState = createEdgeCaseState(SOUTH, SOUTH);
      gameState.players = {};
      
      const newState = handleGoAloneDecision(gameState, SOUTH, true);
      const message = newState.gameMessages[0].text;
      assert.match(message, new RegExp(`${SOUTH} is going alone!`));
    });

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

  describe('Game Message Edge Cases', () => {
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
