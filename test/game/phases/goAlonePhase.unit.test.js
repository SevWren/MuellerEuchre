/**
 * @file test/phases/goAlonePhase.unit.test.js
 * @module test/phases/goAlonePhase.unit
 * @description
 *   Unit tests for the "Go Alone" phase logic in Euchre Multiplayer.
 *   These tests verify correct validation, error handling, and state transitions
 *   when a player decides to go alone or play with a partner.
 *
 *   This test file uses Node.js's built-in test runner and assertions.
 *   All tests are focused on Layer 1 logic, not on state management or network.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Import constants and errors
import {
  GAME_PHASES,
  PLAYER_ROLES,
  TEAMS,
} from '../../../src/config/constants.js';

import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  PhaseLogicError,
} from '../../../src/game/logic/errors.js';

// Import the module under test
import { handleGoAloneDecision } from '../../../src/game/phases/goAlonePhase.js';

// Helper to create a base game state for go_alone phase tests
const createGoAloneGameState = (currentPlayer, trumpMaker) => ({
  gameId: "goAloneTestGame",
  gamePhase: GAME_PHASES.GAME_PHASE_GOING_ALONE_DECISION,
  players: {
    [PLAYER_ROLES[0]]: {
      id: PLAYER_ROLES[0],
      name: "South",
      teamId: TEAMS.TEAM_NS,
    },
    [PLAYER_ROLES[1]]: {
      id: PLAYER_ROLES[1],
      name: "West",
      teamId: TEAMS.TEAM_EW,
    },
    [PLAYER_ROLES[2]]: {
      id: PLAYER_ROLES[2],
      name: "North",
      teamId: TEAMS.TEAM_NS,
    },
    [PLAYER_ROLES[3]]: {
      id: PLAYER_ROLES[3],
      name: "East",
      teamId: TEAMS.TEAM_EW,
    },
  },
  currentPlayer: currentPlayer || PLAYER_ROLES[0],
  dealer: PLAYER_ROLES[0],
  makerTeam: trumpMaker ? TEAMS.TEAM_NS : TEAMS.TEAM_EW,
  playerWhoOrderedUp: trumpMaker || PLAYER_ROLES[0],
  currentTrick: [],
  tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  gameMessages: [],
  settings: { winningScore: 10 },
  leadSuit: null, // Should be null before play starts
});

describe('GoAlonePhase Logic', () => {
  // Mock the players utility module
  const playersMock = {
    getNextPlayer: mock.fn(),
    getPartner: mock.fn(),
  };

  // Set up mocks before each test
  beforeEach(() => {
    // Reset all mocks
    mock.reset();
    
    // Mock the players module
    mock.method(playersMock, 'getNextPlayer', (current, players) => {
      const currentIndex = players.indexOf(current);
      return players[(currentIndex + 1) % players.length];
    });
    
    mock.method(playersMock, 'getPartner', (playerId, players) => {
      const partnerMap = {
        [PLAYER_ROLES[0]]: PLAYER_ROLES[2], // South's partner is North
        [PLAYER_ROLES[1]]: PLAYER_ROLES[3], // West's partner is East
        [PLAYER_ROLES[2]]: PLAYER_ROLES[0], // North's partner is South
        [PLAYER_ROLES[3]]: PLAYER_ROLES[1], // East's partner is West
      };
      return partnerMap[playerId] || null;
    });
  });

  describe('Input Validation', () => {
    it('should throw ValidationError if currentGameState is null', () => {
      assert.throws(
        () => handleGoAloneDecision(null, PLAYER_ROLES[0], true),
        {
          name: 'ValidationError',
          message: 'Invalid game state: missing or invalid players'
        }
      );
    });

    it('should throw ValidationError if decidingPlayerRole is invalid', () => {
      const gameState = createGoAloneGameState(PLAYER_ROLES[0], PLAYER_ROLES[0]);
      assert.throws(
        () => handleGoAloneDecision(gameState, 'InvalidRole', true),
        {
          name: 'ValidationError',
          message: 'Invalid player role'
        }
      );
    });

    it('should throw ValidationError if wantsToGoAlone is not boolean', () => {
      const gameState = createGoAloneGameState(PLAYER_ROLES[0], PLAYER_ROLES[0]);
      assert.throws(
        () => handleGoAloneDecision(gameState, PLAYER_ROLES[0], 'not_boolean'),
        {
          name: 'ValidationError',
          message: 'wantsToGoAlone must be a boolean'
        }
      );
    });
  });

  describe('Phase and Turn Validation', () => {
    it('should throw InvalidPhaseError if not in GAME_PHASE_GOING_ALONE_DECISION phase', () => {
      const gameState = createGoAloneGameState(PLAYER_ROLES[0], PLAYER_ROLES[0]);
      gameState.gamePhase = GAME_PHASES.GAME_PHASE_PLAYING;
      
      assert.throws(
        () => handleGoAloneDecision(gameState, PLAYER_ROLES[0], true),
        {
          name: 'InvalidPhaseError',
          message: `Cannot make "go alone" decision during ${GAME_PHASES.GAME_PHASE_PLAYING} phase.`
        }
      );
    });

    it('should throw NotPlayersTurnError if current player is not the deciding player', () => {
      const decidingPlayer = PLAYER_ROLES[0];
      const currentPlayer = PLAYER_ROLES[1];
      const gameState = createGoAloneGameState(currentPlayer, decidingPlayer);
      
      assert.throws(
        () => handleGoAloneDecision(gameState, decidingPlayer, true),
        {
          name: 'NotPlayersTurnError',
          message: `Not ${decidingPlayer}'s turn. It is ${currentPlayer}'s turn.`
        }
      );
    });

    it('should throw PhaseLogicError if deciding player is not the trump maker', () => {
      const trumpMaker = PLAYER_ROLES[0];
      const decidingPlayer = PLAYER_ROLES[1];
      const gameState = createGoAloneGameState(decidingPlayer, trumpMaker);
      
      assert.throws(
        () => handleGoAloneDecision(gameState, decidingPlayer, true),
        {
          name: 'PhaseLogicError',
          message: `Only the player who made trump (${trumpMaker}) can decide to go alone. Player ${decidingPlayer} attempted.`
        }
      );
    });
  });

  describe('Success Paths', () => {
    it('should update state correctly when player decides to go alone', () => {
      const trumpMaker = PLAYER_ROLES[0]; // South
      const partner = PLAYER_ROLES[2]; // North
      const dealer = PLAYER_ROLES[3]; // East
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      gameState.dealer = dealer;

      // Setup mocks
      playersMock.getPartner.mock.mockImplementation((playerId) => {
        return playerId === trumpMaker ? partner : null;
      });

      // Execute
      const newState = handleGoAloneDecision(gameState, trumpMaker, true);

      // Verify
      assert.strictEqual(newState.goingAlone, true);
      assert.strictEqual(newState.playerGoingAlone, trumpMaker);
      assert.strictEqual(newState.partnerSittingOut, partner);
      assert.strictEqual(newState.gamePhase, GAME_PHASES.GAME_PHASE_PLAYING);
      assert.strictEqual(newState.gameMessages.length, 1);
      assert.match(newState.gameMessages[0].text, /is going alone/);
    });

    it('should update state correctly when player decides to play with partner', () => {
      const trumpMaker = PLAYER_ROLES[0]; // South
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      
      // Execute
      const newState = handleGoAloneDecision(gameState, trumpMaker, false);
      
      // Verify
      assert.strictEqual(newState.goingAlone, false);
      assert.strictEqual(newState.playerGoingAlone, null);
      assert.strictEqual(newState.partnerSittingOut, null);
      assert.strictEqual(newState.gamePhase, GAME_PHASES.GAME_PHASE_PLAYING);
      assert.strictEqual(newState.gameMessages.length, 1);
      assert.match(newState.gameMessages[0].text, /chooses to play with a partner/);
    });

    it('should correctly set the first player when partner sits out', () => {
      console.log('\n=== Starting test: should correctly set the first player when partner sits out ===');
      
      // In Euchre, the order is: South (dealer), West, North, East
      const [SOUTH, WEST, NORTH, EAST] = PLAYER_ROLES;
      const trumpMaker = SOUTH;
      const partner = NORTH; // North is South's partner
      const dealer = SOUTH; // South is the dealer
      
      console.log(`Test setup: Dealer=${dealer}, TrumpMaker=${trumpMaker}, Partner=${partner}`);
      
      // Create game state with South as the dealer and trump maker
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      gameState.dealer = dealer;
      
      console.log('Game state created with:', {
        dealer: gameState.dealer,
        currentPlayer: gameState.currentPlayer,
        trumpMaker: gameState.playerWhoOrderedUp,
        gamePhase: gameState.gamePhase
      });

      // Setup mocks
      playersMock.getPartner.mock.mockImplementation((playerId) => {
        return playerId === trumpMaker ? partner : null;
      });

      // Mock getNextPlayer to handle the player order correctly
      playersMock.getNextPlayer.mock.mockImplementation((current, playerSlots) => {
        // Handle case where playerSlots might be an array of length 8 (duplicated)
        const uniqueSlots = [...new Set(playerSlots)]; // Remove duplicates
        
        // Ensure we have exactly 4 unique player roles
        if (uniqueSlots.length !== 4) {
          console.log('Invalid unique player slots:', uniqueSlots);
          return undefined;
        }
        
        // Get the current index in the playerSlots array
        const currentIndex = uniqueSlots.indexOf(current);
        if (currentIndex === -1) {
          console.log('Current player not found in playerSlots:', current, 'in', playerSlots);
          return undefined;
        }
        
        // Return the next player in the sequence, wrapping around if needed
        const nextPlayer = uniqueSlots[(currentIndex + 1) % uniqueSlots.length];
        console.log(`getNextPlayer: ${current} -> ${nextPlayer} (from ${uniqueSlots.join(', ')})`);
        return nextPlayer;
      });

      // Execute - South (dealer) decides to go alone
      console.log('\nCalling handleGoAloneDecision with:', {
        decidingPlayerRole: trumpMaker,
        wantsToGoAlone: true
      });
      
      const newState = handleGoAloneDecision(gameState, trumpMaker, true);
      
      console.log('\nNew game state after handleGoAloneDecision:', {
        currentPlayer: newState.currentPlayer,
        goingAlone: newState.goingAlone,
        playerGoingAlone: newState.playerGoingAlone,
        partnerSittingOut: newState.partnerSittingOut,
        gamePhase: newState.gamePhase
      });

      // The first player should be the player to the left of the dealer (West)
      // In Euchre, play proceeds to the left, so after South (dealer) comes West
      console.log(`\nAsserting that currentPlayer (${newState.currentPlayer}) equals WEST (${WEST})`);
      assert.strictEqual(newState.currentPlayer, WEST, 
        `Expected first player to be ${WEST} (to the left of dealer ${dealer}) but got ${newState.currentPlayer}`);
        
      console.log('=== Test completed successfully ===\n');
    });
  });
});
