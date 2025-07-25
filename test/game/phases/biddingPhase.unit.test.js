/**
 * @file test/game/phases/biddingPhase.unit.test.js
 * @module test/game/phases/biddingPhase.unit
 * @description
 * Unit tests for the bidding phase logic of the Euchre Multiplayer game.
 * 
 * 7-23 Need to improve coverage. currently only at 76%
 * 
 * @see {@link module:src/game/phases/biddingPhase}
 */

import { describe, it, afterEach, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Project imports
import {
  GAME_PHASES,
  PLAYER_ROLES,
  SUITS,
  VALUES,
  TEAMS,
} from '../../../src/config/constants.js';
// Import the actual implementations to wrap with test dependencies
import { 
  handleOrderUpDecision as originalHandleOrderUpDecision,
  handleDealerDiscard as originalHandleDealerDiscard,
  handleCallTrumpDecision as originalHandleCallTrumpDecision
} from '../../../src/game/phases/biddingPhase.js';
import {
  PhaseLogicError,
  NotPlayersTurnError,
  CardNotInHandError,
} from '../../../src/game/logic/validation-errors.js';

// Test helpers
import {
  setupTestState,
  resetTestIdCounter,
} from '../../helpers/test-helpers.js';

// Import the mock implementation from __mocks__
import { createBiddingPhaseWithDeps } from '../../__mocks__/game/phases/biddingPhase.js';

// Import the actual implementation to create a spy
import * as validationCore from '../../../src/game/logic/validation-core.js';

// Wrap the original functions with test dependencies
function createTestBiddingPhase(deps = {}) {
  // Default implementations for required dependencies
  const defaultDeps = {
    validateBid: () => true,
    validateDealerDiscard: () => true,
    getNextPlayer: (current, players) => {
      const currentIndex = players.indexOf(current);
      return players[(currentIndex + 1) % players.length];
    },
    handleGoingAloneDecision: () => ({}),
    handlePlayCard: () => ({}),
    handleTrickComplete: () => ({}),
    handleRoundComplete: () => ({}),
    handleGameComplete: () => ({}),
  };
  
  // Merge provided deps with defaults
  const testDeps = { ...defaultDeps, ...deps };
  
      // Create bound versions of the functions with test dependencies
  const handleOrderUpDecision = (gameState, playerRole, wantsToOrderUp) => {
    const context = {
      validateBid: testDeps.validateBid
    };
    return originalHandleOrderUpDecision.call(context, gameState, playerRole, wantsToOrderUp);
  };
  
  const handleDealerDiscard = (gameState, dealerRole, cardToDiscardId) => {
    const context = {
      validateDealerDiscard: testDeps.validateDealerDiscard,
      getNextPlayer: testDeps.getNextPlayer
    };
    return originalHandleDealerDiscard.call(context, gameState, dealerRole, cardToDiscardId);
  };
  
  const handleCallTrumpDecision = (gameState, playerRole, wantsToCall, suitCalled) => {
    const context = {
      validateBid: testDeps.validateBid,
      getNextPlayer: testDeps.getNextPlayer
    };
    return originalHandleCallTrumpDecision.call(context, gameState, playerRole, wantsToCall, suitCalled);
  };
  
  return {
    handleOrderUpDecision,
    handleDealerDiscard,
    handleCallTrumpDecision,
    ...testDeps // Also return the test dependencies for verification
  };
}

// Default test dependencies with mock implementations
const defaultDeps = {
  validateBid: () => true, // Default mock that passes validation
  validateDealerDiscard: validationCore.validateDealerDiscard,
  getNextPlayer: (current, players) => {
    const currentIndex = players.indexOf(current);
    return players[(currentIndex + 1) % players.length];
  },
  handleGoingAloneDecision: () => ({}),
  handlePlayCard: () => ({}),
  handleTrickComplete: () => ({}),
  handleRoundComplete: () => ({}),
  handleGameComplete: () => ({}),
};

// Helper function to create a test instance with mocks
function createTestInstance(mocks = {}) {
  // Create a fresh instance with the provided mocks
  return createTestBiddingPhase({
    ...defaultDeps,
    ...mocks
  });
}

// Reset test state before each test
beforeEach(() => {
  resetTestIdCounter();
});

// Import the real module for constants
import * as biddingPhaseModule from '../../../src/game/phases/biddingPhase.js';

// Helper function to get the next player in the rotation
function testGetNextPlayer(currentPlayer) {
  const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
  return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
}

/**
 * Creates a test state for bidding phase tests
 * @param {string} dealer - The dealer's role
 * @param {number} round - The round number (1 or 2)
 * @param {string} turnCardSuit - The suit of the turn card
 * @returns {Object} The game state
 */
const setupBiddingState = (
  dealer = PLAYER_ROLES[0],
  round = 1,
  turnCardSuit = SUITS.HEARTS
) => {
  const phase = round === 1 
    ? GAME_PHASES.ORDER_UP_ROUND1 
    : GAME_PHASES.ORDER_UP_ROUND2;
  
  // Set up team assignments using TEAMS constants
  const teamMap = {
    [PLAYER_ROLES[0]]: TEAMS.TEAM_NS, // NORTH
    [PLAYER_ROLES[1]]: TEAMS.TEAM_EW, // EAST
    [PLAYER_ROLES[2]]: TEAMS.TEAM_NS, // SOUTH
    [PLAYER_ROLES[3]]: TEAMS.TEAM_EW  // WEST
  };

  // Determine the first player (left of the dealer)
  const dealerIndex = PLAYER_ROLES.indexOf(dealer);
  const firstPlayerIndex = (dealerIndex + 1) % PLAYER_ROLES.length;
  const firstPlayer = PLAYER_ROLES[firstPlayerIndex];
  
  // Set the current player for the test
  const currentPlayerForTest = firstPlayer;

  // Initialize players with team assignments and required properties
  const players = PLAYER_ROLES.reduce((acc, role) => {
    const teamId = teamMap[role];
    const playerId = `player_${role.toLowerCase()}`; // Ensure consistent playerId format
    const name = role.replace('PLAYER_', '').toLowerCase();
    
    acc[role] = {
      id: playerId,
      playerId,
      role,
      teamId: teamId, // Ensure teamId is set
      team: teamId,   // Some tests might look for team instead of teamId
      name,
      cards: [],
      hand: [],
      isDealer: role === dealer,
      isCurrentPlayer: role === currentPlayerForTest,
      isReady: true,
      score: 0,
      tricksWon: 0,
      isGoingAlone: false
    };
    return acc;
  }, {});

  // Use setupTestState to create a consistent game state
  const { gameState } = setupTestState({
    phase,
    dealer,
    stateOverrides: {
      roundNumber: round,
      turnCard: {
        id: `A${turnCardSuit[0].toUpperCase()}`,
        suit: turnCardSuit,
        value: 'ACE',
        name: `Ace of ${turnCardSuit}`,
        rank: VALUES.indexOf('ACE') + 1
      },
      currentPlayer: testGetNextPlayer(dealer),
      players
    }
  });
  
  return gameState;
};

describe("BiddingPhase Logic", () => {
  // Helper to create a deep copy of an object
  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Helper to create a test state
  function createTestState() {
    return setupBiddingState(PLAYER_ROLES[0], 1, SUITS.DIAMONDS);
  }

  beforeEach(() => {
    // Reset test ID counter before each test
    resetTestIdCounter();
  });

  describe("handleOrderUpDecision", () => {
    it("should not modify the input gameState", () => {
      const gameState = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const originalState = deepCopy(gameState);
      const playerRole = gameState.currentPlayer;

      // Create a test instance with default deps
      const { handleOrderUpDecision } = createTestInstance();
      
      handleOrderUpDecision(gameState, playerRole, true);
      assert.deepStrictEqual(gameState, originalState);
    });

    it("should call validateBid with correct parameters", () => {
      const gameState = setupBiddingState(
        PLAYER_ROLES[0], // dealer
        1, // round 1
        SUITS.DIAMONDS, // turn card suit
      );
      const playerRole = gameState.currentPlayer;
      
      // Track validateBid calls
      let validateBidCalled = false;
      
      // Create a test instance with a mock validateBid
      const { handleOrderUpDecision } = createTestInstance({
        validateBid: (state, role, decision, suit) => {
          validateBidCalled = true;
          assert.strictEqual(role, playerRole, 'Should validate with correct player role');
          assert.strictEqual(decision, 'orderUp', 'Should validate orderUp decision');
          assert.strictEqual(suit, null, 'Suit should be null for orderUp decision');
          return true;
        }
      });

      // Call the function
      handleOrderUpDecision(gameState, playerRole, true);

      // Verify validateBid was called
      assert.strictEqual(validateBidCalled, true, 'validateBid should be called');
    });

    it("should propagate validation errors", () => {
      const gameState = setupBiddingState(PLAYER_ROLES[0], 1, SUITS.HEARTS);
      const playerRole = PLAYER_ROLES[1]; // Not the current player
      const expectedError = new NotPlayersTurnError(playerRole, gameState.currentPlayer);

      // Create a test instance with a mock validateBid that throws
      const { handleOrderUpDecision } = createTestInstance({
        validateBid: () => {
          throw expectedError;
        }
      });

      assert.throws(
        () => handleOrderUpDecision(gameState, playerRole, true),
        (err) => {
          return err.name === expectedError.name && 
                 err.message.includes(expectedError.message);
        },
        'Should throw NotPlayersTurnError'
      );
    });

    it("should return correct state when player orders up", () => {
      const gameState = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const playerRole = gameState.currentPlayer;
      
      // Create a test instance with default deps
      const { handleOrderUpDecision } = createTestInstance();

      // Call the actual function (no need to mock for this test)
      const nextState = handleOrderUpDecision(gameState, playerRole, true);
      
      // Get the expected team based on the player's role
      const expectedTeam = gameState.players[playerRole].teamId;
      
      // Verify the state updates
      assert.strictEqual(nextState.trumpSuit, SUITS.DIAMONDS, 'Should set trump suit');
      assert.strictEqual(nextState.makerTeam, expectedTeam, 'Should set maker team to the player\'s team');
      assert.strictEqual(nextState.playerWhoOrderedUp, playerRole, 'Should set player who ordered up');
      // The implementation transitions to DEALER_DISCARD phase first
      assert.strictEqual(nextState.gamePhase, GAME_PHASES.DEALER_DISCARD, 'Should transition to dealer discard phase after ordering up');
      assert.strictEqual(nextState.currentPlayer, gameState.dealer, 'Should set current player to the dealer to discard');
    });

    it("should advance to next player when player passes", () => {
      const gameStateInOrderUpRound1 = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const currentPlayer = gameStateInOrderUpRound1.currentPlayer;
      const nextPlayer = testGetNextPlayer(currentPlayer);

      const { handleOrderUpDecision } = createTestInstance();

      const result = handleOrderUpDecision(
        gameStateInOrderUpRound1,
        currentPlayer,
        false,
      );

      assert.strictEqual(result.currentPlayer, nextPlayer);
      assert.strictEqual(result.trumpSuit, null);
    });

    it("should advance to round 2 when all players pass in round 1", () => {
      let currentState = setupBiddingState(PLAYER_ROLES[0], 1, SUITS.DIAMONDS);
      const firstBidder = currentState.currentPlayer;

      PLAYER_ROLES.forEach((_, index) => {
        const player =
          PLAYER_ROLES[(PLAYER_ROLES.indexOf(firstBidder) + index) % 4];
        const { handleOrderUpDecision } = createTestInstance();
        currentState = handleOrderUpDecision(currentState, player, false);
      });

      assert.strictEqual(currentState.gamePhase, GAME_PHASES.ORDER_UP_ROUND2);
      assert.strictEqual(currentState.currentPlayer, firstBidder);
    });

    it("should call validateBid with correct arguments for ordering up and passing", () => {
      const gameState = setupBiddingState(PLAYER_ROLES[0], 1, SUITS.DIAMONDS);
      const playerRole = gameState.currentPlayer;
      
      // Track calls to validateBid
      const validateBidCalls = [];
      
      // Create a test instance with a mock validateBid
      const { handleOrderUpDecision } = createTestInstance({
        validateBid: (...args) => {
          validateBidCalls.push(args);
          return true;
        }
      });

      // Test ordering up
      handleOrderUpDecision(gameState, playerRole, true);
      
      // Verify validateBid was called with correct arguments for order up
      assert.strictEqual(validateBidCalls.length, 1, 'validateBid should be called once for order up');
      assert.deepStrictEqual(
        validateBidCalls[0],
        [
          gameState,
          playerRole,
          "orderUp",
          null,
        ],
        'validateBid should be called with correct arguments for order up'
      );

      // Clear calls for next test
      validateBidCalls.length = 0;

      // Test passing
      handleOrderUpDecision(gameState, playerRole, false);
      
      // Verify validateBid was called with correct arguments for pass
      assert.strictEqual(validateBidCalls.length, 1, 'validateBid should be called once for pass');
      assert.deepStrictEqual(
        validateBidCalls[0],
        [
          gameState,
          playerRole,
          "pass",
          null,
        ],
        'validateBid should be called with correct arguments for pass'
      );
    });

    it("should propagate errors from validateBid", () => {
      const gameState = setupBiddingState(
        PLAYER_ROLES[0],
        1,
        SUITS.DIAMONDS,
      );
      const playerRole = gameState.currentPlayer;
      const expectedError = new NotPlayersTurnError(playerRole, "otherPlayer");
      
      let validateBidCalled = false;
      
      // Create a test instance with a mock validateBid that throws
      const { handleOrderUpDecision } = createTestInstance({
        validateBid: () => {
          validateBidCalled = true;
          throw expectedError;
        }
      });

      assert.throws(
        () => handleOrderUpDecision(gameState, playerRole, true),
        (err) => {
          return err.name === expectedError.name && 
                 err.message.includes(expectedError.message);
        },
        'Should rethrow NotPlayersTurnError',
      );
      
      // Verify validateBid was called
      assert.strictEqual(validateBidCalled, true, 'validateBid should be called');
    });

    it("should call validateBid with correct arguments for call trump decision", () => {
      const gameState = setupBiddingState(
        PLAYER_ROLES[0],
        2, // Round 2
        SUITS.DIAMONDS,
      );
      const playerRole = gameState.currentPlayer;
      const suitToCall = SUITS.HEARTS;
      
      // Track calls to validateBid
      let validateBidCalls = [];
      
      // Create a test instance with a mock validateBid
      const { handleCallTrumpDecision } = createTestInstance({
        validateBid: (state, role, decision, suit, turnCard) => {
          validateBidCalls.push({ state, role, decision, suit, turnCard });
          return true; // Simulate successful validation
        }
      });

      // Call with call trump
      handleCallTrumpDecision(gameState, playerRole, true, suitToCall);
      
      // Verify validateBid was called with correct arguments
      assert.strictEqual(validateBidCalls.length, 1, 'validateBid should be called once for call trump');
      assert.strictEqual(validateBidCalls[0].role, playerRole, 'Should validate for the correct player');
      assert.strictEqual(validateBidCalls[0].decision, 'callTrump', 'Should validate callTrump decision');
      assert.strictEqual(validateBidCalls[0].suit, suitToCall, 'Should validate with correct suit');
    });

    it("should propagate errors from validateBid in call trump decision", () => {
      const gameState = setupBiddingState(
        PLAYER_ROLES[0],
        2, // Round 2
        SUITS.DIAMONDS,
      );
      const playerRole = gameState.currentPlayer;
      const suitToCall = SUITS.HEARTS;
      const expectedError = new Error("Invalid bid");
      expectedError.name = 'InvalidBidError';
      expectedError.code = 'E_INVALID_BID';

      // Track if validateBid was called
      let validateBidCalled = false;

      // Create a test instance with a mock validateBid that throws an error
      const { handleCallTrumpDecision } = createTestInstance({
        validateBid: (state, role, decision, suit) => {
          validateBidCalled = true;
          assert.strictEqual(role, playerRole, 'Should validate for the correct player');
          assert.strictEqual(decision, 'callTrump', 'Should validate callTrump decision');
          assert.strictEqual(suit, suitToCall, 'Should validate with correct suit');
          throw expectedError;
        }
      });

      // Verify the error is propagated
      assert.throws(
        () => handleCallTrumpDecision(gameState, playerRole, true, suitToCall),
        (err) => {
          return err === expectedError || 
                 (err.name === 'InvalidBidError' && 
                  err.message === expectedError.message && 
                  err.code === 'E_INVALID_BID');
        },
        'Should propagate the error from validateBid'
      );
      
      // Verify validateBid was called
      assert.strictEqual(validateBidCalled, true, 'validateBid should be called');
    });

    it("should throw InvalidBidError with appropriate message when calling trump with invalid state", () => {
      // Create a test state with a player that has no team
      const gameState = setupBiddingState(
        PLAYER_ROLES[0], // dealer
        2, // Round 2
        SUITS.DIAMONDS, // turn card
      );
      
      // Create a copy of the state and remove the team from the player
      const stateWithoutTeam = JSON.parse(JSON.stringify(gameState));
      const playerRole = stateWithoutTeam.currentPlayer;
      const suitToCall = SUITS.HEARTS;
      
      // Remove both team and teamId from the player to ensure the test fails as expected
      delete stateWithoutTeam.players[playerRole].teamId;
      delete stateWithoutTeam.players[playerRole].team;

      // Create a test instance with a mock validateBid that won't be called due to the invalid state
      let validateBidCalled = false;
      const testInstance = createTestInstance({
        validateBid: () => {
          validateBidCalled = true;
          return true;
        }
      });
      
      // Verify the error is thrown with the correct properties
      // The error should be thrown during the initial validation before validateBid is called
      assert.throws(
        () => {
          // Create a bound version of the function with the test instance as 'this' context
          const boundFn = testInstance.handleCallTrumpDecision.bind(testInstance);
          return boundFn(stateWithoutTeam, playerRole, true, suitToCall);
        },
        (err) => {
          const isExpectedError = err.name === 'InvalidBidError' && 
                               typeof err.message === 'string' && 
                               err.message.includes(`Could not determine team for player ${playerRole}`) &&
                               err.code === 'E_INVALID_BID';
          
          if (!isExpectedError) {
            console.error('Unexpected error:', err);
          }
          
          return isExpectedError;
        },
        'Should throw InvalidBidError with appropriate message when player has no team'
      );
      
      // Verify validateBid was not called since we failed team validation first
      assert.strictEqual(validateBidCalled, false, 'validateBid should not be called when team validation fails');
    });

    it("should throw InvalidBidError when calling trump in round 1", () => {
      // Create a test state in round 1 (order up round)
      const gameState = setupBiddingState(
        PLAYER_ROLES[0], // dealer
        1, // Round 1
        SUITS.DIAMONDS // turn card
      );
      
      // Ensure we're in the correct phase for round 1
      const stateInRound1 = {
        ...gameState,
        phase: GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND1
      };
      
      const playerRole = stateInRound1.currentPlayer;
      const suitToCall = SUITS.HEARTS;
      
      // Create a test instance with a mock validateBid that would pass if called
      let validateBidCalled = false;
      const testInstance = createTestInstance({
        validateBid: () => {
          validateBidCalled = true;
          return true; // Even if validation passes, the phase check should fail first
        }
      });

      // Verify that calling trump in round 1 throws an error
      // Note: In round 1, players should be ordering up, not calling trump
      assert.throws(
        () => testInstance.handleCallTrumpDecision(stateInRound1, playerRole, true, suitToCall),
        (err) => {
          const isValidError = err.name === 'InvalidPhaseError' && 
                            typeof err.message === 'string' && 
                            err.message.includes("callTrump decision") &&
                            err.message.includes("ORDER_UP_ROUND2") &&
                            err.code === 'E_INVALID_PHASE';
          
          if (!isValidError) {
            console.error('Unexpected error:', err);
          }
          return isValidError;
        },
        'Should throw InvalidPhaseError when calling trump in round 1 (ORDER_UP_ROUND1)'
      );
      
      // Verify validateBid was not called since we failed phase validation first
      assert.strictEqual(validateBidCalled, false, 'validateBid should not be called when phase is invalid');
      
      // Validate that validateBid was not called due to the invalid phase
      assert.strictEqual(validateBidCalled, false, 'validateBid should not be called when phase is invalid');
    });

    it("Round 2: should advance currentPlayer if player passes (after validation passes)", () => {
      // Create a round 2 state with the first player as current player
      const gameStateInCallTrumpRound = setupBiddingState(
        PLAYER_ROLES[0], // dealer (NORTH)
        2, // round 2
        SUITS.DIAMONDS, // turn card
        true // set phase to ORDER_UP_ROUND2
      );
      
      // Set current player to EAST (player after dealer)
      gameStateInCallTrumpRound.currentPlayer = PLAYER_ROLES[1]; // EAST
      
      // Create a test instance with a mock validateBid that always passes
      const { handleCallTrumpDecision } = createTestInstance({
        validateBid: () => true
      });

      const nextState = handleCallTrumpDecision(
        gameStateInCallTrumpRound,
        PLAYER_ROLES[1], // EAST
        false, // pass
        null
      );
      
      // Verify the phase remains in ORDER_UP_ROUND2
      assert.strictEqual(
        nextState.gamePhase, 
        GAME_PHASES.ORDER_UP_ROUND2, 
        'Should remain in round 2 after a pass'
      );
      
      // Verify currentPlayer advanced to the next player (SOUTH)
      assert.strictEqual(
        nextState.currentPlayer,
        PLAYER_ROLES[2], // SOUTH
        'Should advance to next player after pass'
      );
      
      // Verify no trump was set
      assert.strictEqual(
        nextState.trumpSuit, 
        null, 
        'Should not set trump when player passes'
      );
    });

    it("Round 2: should set trump, maker, and transition to GOING_ALONE_DECISION if player calls a valid suit (after validation passes)", () => {
      // Set up a round 2 state (call trump round)
      const gameState = setupBiddingState(
        PLAYER_ROLES[0], // dealer
        2, // round 2
        SUITS.DIAMONDS, // turn card
      );
      
      // Ensure the phase is set to ROUND 2 explicitly
      gameState.phase = GAME_PHASES.ORDER_UP_ROUND2;
      
      const callingPlayer = gameState.currentPlayer;
      const suitToCall = SUITS.HEARTS;
      
      // Track if validateBid was called
      let validateBidCalled = false;
      
      // Create a test instance with a mock validateBid
      const { handleCallTrumpDecision } = createTestInstance({
        validateBid: (state, role, decision, suit) => {
          validateBidCalled = true;
          assert.strictEqual(role, callingPlayer, 'Should validate for the correct player');
          assert.strictEqual(decision, 'callTrump', 'Should validate callTrump decision');
          assert.strictEqual(suit, suitToCall, 'Should validate with correct suit');
          return true; // Validation passes
        }
      });

      // Call with call trump
      const nextState = handleCallTrumpDecision(
        gameState,
        callingPlayer,
        true,
        suitToCall,
      );
      
      // Verify validateBid was called
      assert.strictEqual(validateBidCalled, true, 'validateBid should be called');
      
      // Verify the state was updated correctly
      assert.strictEqual(nextState.trumpSuit, suitToCall, 'Should set the trump suit');
      assert.strictEqual(
        nextState.makerTeam,
        gameState.players[callingPlayer].teamId,
        'Should set the maker team to the calling player\'s team'
      );
      assert.strictEqual(
        nextState.gamePhase,
        GAME_PHASES.GOING_ALONE_DECISION,
        'Should transition to GOING_ALONE_DECISION phase'
      );
      assert.strictEqual(
        nextState.playerWhoCalledTrump,
        callingPlayer,
        'Should set the player who called trump'
      );
    });

    it("Round 2: should handle all players passing as a misdeal", () => {
      // Set up a round 2 state (call trump round)
      let gameState = setupBiddingState(
        PLAYER_ROLES[0], // dealer (NORTH)
        2, // round 2
        SUITS.DIAMONDS // turn card
      );
      
      // Set up mocks for validateBid
      let validateBidCalls = [];
      const { handleCallTrumpDecision } = createTestInstance({
        validateBid: (state, role, decision, suit) => {
          validateBidCalls.push({ role, decision, suit });
          return true; // Always pass validation
        }
      });
      
      // All players pass (EAST, SOUTH, WEST, NORTH)
      const playerOrder = [
        PLAYER_ROLES[1], // EAST
        PLAYER_ROLES[2], // SOUTH
        PLAYER_ROLES[3], // WEST
        PLAYER_ROLES[0]  // NORTH (dealer)
      ];
      
      // All players pass, including dealer
      for (let i = 0; i < playerOrder.length; i++) {
        const playerRole = playerOrder[i];
        gameState = handleCallTrumpDecision(
          gameState,
          playerRole,
          false, // pass
          null
        );
        
        // If not the last player, verify the current player advanced
        if (i < playerOrder.length - 1) {
          const nextPlayerIndex = (i + 1) % playerOrder.length;
          assert.strictEqual(
            gameState.currentPlayer,
            playerOrder[nextPlayerIndex],
            `After ${playerRole} passes, current player should be ${playerOrder[nextPlayerIndex]}`
          );
        } else {
          // After dealer passes, should transition to DEALING phase for a misdeal
          assert.strictEqual(
            gameState.gamePhase,
            GAME_PHASES.DEALING,
            'Should transition to DEALING phase for a misdeal when all players pass in round 2'
          );
        }
      }
      
      // Verify validateBid was called for each player's pass
      assert.strictEqual(
        validateBidCalls.length, 
        playerOrder.length, 
        `validateBid should be called once for each player (${playerOrder.length} times)`
      );
    });
  });
});