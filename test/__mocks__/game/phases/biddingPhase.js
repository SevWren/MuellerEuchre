// Mock implementation for bidding phase testing
// Provides controlled test doubles for the bidding phase functions
// @see src/game/phases/biddingPhase.js - Real implementation
// @see test/game/phases/biddingPhase.unit.test.js - Test usage

import { mock } from 'node:test';
import { PLAYER_ROLES, GAME_PHASES } from '../../../../src/config/constants.js';

/**
 * Creates a testable instance of the bidding phase logic with dependency injection.
 * This factory function returns mock implementations of all bidding phase functions
 * that can be controlled and observed during testing.
 *
 * @param {Object} [deps={}] - Dependencies to inject into the bidding phase functions
 * @param {Function} [deps.validateBid] - Mock function to validate bid decisions
 * @param {Function} [deps.handleGoingAloneDecision] - Mock function for handling going alone decisions
 * @param {Function} [deps.handlePlayCard] - Mock function for handling card plays
 * @param {Function} [deps.handleTrickComplete] - Mock function for handling completed tricks
 * @param {Function} [deps.handleRoundComplete] - Mock function for handling completed rounds
 * @param {Function} [deps.handleGameComplete] - Mock function for handling completed games
 * @returns {Object} An object containing mock implementations of all bidding phase functions
 * @property {Function} handleOrderUpDecision - Mock function for handling order-up decisions
 * @property {Function} handleDealerDiscard - Mock function for handling dealer discards
 * @property {Function} handleCallTrumpDecision - Mock function for handling trump calling decisions
 * 
 * @see {@link module:src/game/phases/biddingPhase} - The real implementation being mocked
 * @see {@link module:test/game/phases/biddingPhase.unit.test.js} - Tests using this mock
 * @see {@link module:test/helpers/test-helpers.js} - Test utilities used in conjunction with this mock
 * 
 * @example
 * // Basic usage with default mocks
 * const { handleOrderUpDecision } = createBiddingPhaseWithDeps();
 * 
 * // Usage with custom validation
 * const validateBid = mock.fn(() => true);
 * const { handleOrderUpDecision } = createBiddingPhaseWithDeps({ validateBid });
 */

export function createBiddingPhaseWithDeps(deps = {}) {
  // Default mock implementation for validateBid if not provided
  const validateBid = deps.validateBid || mock.fn(() => true);
  /**
   * Mock implementation of handleOrderUpDecision for testing the first round of bidding.
   * Simulates a player's decision to order up the dealer or pass in the first round.
   *
   * @param {Object} gameState - The current game state
   * @param {string} playerRole - The role of the player making the decision
   * @param {boolean} wantsToOrderUp - True to order up the dealer, false to pass
   * @returns {Object} A new game state reflecting the bidding decision
   * @throws {Error} If the turnCard is missing required properties
   * 
   * @see {@link module:src/game/phases/biddingPhase.handleOrderUpDecision} - The real implementation
   * @see {@link module:test/game/phases/biddingPhase.unit.test.js} - Tests using this mock
   * 
   * @example
   * // Test ordering up the dealer
   * const gameState = { /* ... *\/ };
   * const newState = mockHandleOrderUpDecision(gameState, 'PLAYER_NORTH', true);
   * 
   * // Test passing
   * const passedState = mockHandleOrderUpDecision(gameState, 'PLAYER_EAST', false);
   */
  const mockHandleOrderUpDecision = mock.fn((gameState, playerRole, wantsToOrderUp) => {
    // Call validateBid first, as the real implementation would
    validateBid(gameState, playerRole, wantsToOrderUp ? 'orderUp' : 'pass', null);
    
    // Create a deep copy of the game state to avoid mutating the original
    const newState = JSON.parse(JSON.stringify(gameState));
    
    // Ensure players object exists
    newState.players = newState.players || {};
    
    // Ensure the player exists and has a team
    if (!newState.players[playerRole]) {
      newState.players[playerRole] = { 
        id: playerRole,
        teamId: playerRole === PLAYER_ROLES[0] || playerRole === PLAYER_ROLES[2] ? 'TEAM_NS' : 'TEAM_EW',
        hand: []
      };
    } else if (!newState.players[playerRole].teamId) {
      newState.players[playerRole].teamId = playerRole === PLAYER_ROLES[0] || playerRole === PLAYER_ROLES[2] ? 'TEAM_NS' : 'TEAM_EW';
    }
    
    // Get the player's team
    const playerTeam = newState.players[playerRole].teamId;
    
    if (wantsToOrderUp) {
      // Ensure turnCard exists and has required properties
      if (!newState.turnCard) {
        // If turnCard is missing, create a default one
        newState.turnCard = {
          id: 'AD',
          suit: 'DIAMONDS',
          value: 'ACE',
          name: 'Ace of DIAMONDS',
          rank: 1
        };
      } else if (!newState.turnCard.suit) {
        throw new Error('turnCard is missing required suit property');
      }
      
      // Set up the state for successful order up
      newState.makerTeam = playerTeam;
      newState.playerWhoOrderedUp = playerRole;
      newState.trumpSuit = gameState.turnCard.suit;
      newState.gamePhase = GAME_PHASES.GOING_ALONE_DECISION;
      
      // Ensure the current player is set correctly
      newState.currentPlayer = playerRole;
    } else {
      // Handle passing
      const currentIndex = PLAYER_ROLES.indexOf(playerRole);
      const nextPlayer = PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
      newState.currentPlayer = nextPlayer;
      
      // If we've gone full circle, transition to next round or end bidding
      if (nextPlayer === newState.dealer) {
        if (newState.gamePhase === GAME_PHASES.ORDER_UP_ROUND1) {
          newState.gamePhase = GAME_PHASES.ORDER_UP_ROUND2;
        } else {
          // In round 2, if all pass, it's a misdeal
          newState.gamePhase = GAME_PHASES.DEALING;
        }
      }
    }
    
    return newState;
  });

  /**
   * Mock implementation of handleCallTrumpDecision for testing the second round of bidding.
   * Simulates a player's decision to call a trump suit or pass in the second round.
   *
   * @param {Object} gameState - The current game state
   * @param {string} playerRole - The role of the player making the decision
   * @param {boolean} wantsToCall - True to call a trump suit, false to pass
   * @param {string} [suitCalled=null] - The suit to call as trump (required if wantsToCall is true)
   * @returns {Object} A new game state reflecting the trump calling decision
   * @throws {Error} If validation fails or if the suit is invalid
   * 
   * @see {@link module:src/game/phases/biddingPhase.handleCallTrumpDecision} - The real implementation
   * @see {@link module:test/game/phases/biddingPhase.unit.test.js} - Tests using this mock
   * 
   * @example
   * // Test calling a trump suit
   * const gameState = { /* ... *\/ };
   * const newState = mockHandleCallTrumpDecision(gameState, 'PLAYER_EAST', true, 'HEARTS');
   * 
   * // Test passing
   * const passedState = mockHandleCallTrumpDecision(gameState, 'PLAYER_WEST', false);
   * 
   * // Test error when calling without a suit
   * assert.throws(
   *   () => mockHandleCallTrumpDecision(gameState, 'PLAYER_NORTH', true),
   *   { message: 'Suit is required when calling trump' }
   * );
   */
  const mockHandleCallTrumpDecision = mock.fn((gameState, playerRole, wantsToCall, suitCalled = null) => {
    // Create a deep copy of the game state to avoid mutating the original
    const newState = JSON.parse(JSON.stringify(gameState));
    
    // Ensure players object exists
    newState.players = newState.players || {};
    
    // Ensure the player exists and has a team
    if (!newState.players[playerRole]) {
      newState.players[playerRole] = { 
        id: playerRole,
        teamId: playerRole === PLAYER_ROLES[0] || playerRole === PLAYER_ROLES[2] ? 'TEAM_NS' : 'TEAM_EW',
        hand: []
      };
    } else if (!newState.players[playerRole].teamId) {
      newState.players[playerRole].teamId = playerRole === PLAYER_ROLES[0] || playerRole === PLAYER_ROLES[2] ? 'TEAM_NS' : 'TEAM_EW';
    }
    
    // Get the player's team
    const playerTeam = newState.players[playerRole].teamId;
    
    if (wantsToCall) {
      if (!suitCalled) {
        const error = new Error('suitCalled is required when wantsToCall is true');
        error.name = 'PhaseLogicError';
        error.details = { playerRole, gameId: newState.gameId };
        throw error;
      }
      
      // Set up the state for successful trump call
      newState.makerTeam = playerTeam;
      newState.playerWhoCalledTrump = playerRole;
      newState.trumpSuit = suitCalled;
      newState.gamePhase = GAME_PHASES.GOING_ALONE_DECISION;
      
      // Ensure the current player is set correctly
      newState.currentPlayer = playerRole;
    } else {
      // Handle passing
      const currentIndex = PLAYER_ROLES.indexOf(playerRole);
      const nextPlayer = PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
      newState.currentPlayer = nextPlayer;
      
      // If we've gone full circle, transition to DEALING phase (misdeal)
      // Only do this if we're in round 2 (ORDER_UP_ROUND2)
      if (nextPlayer === newState.dealer && newState.gamePhase === GAME_PHASES.ORDER_UP_ROUND2) {
        newState.gamePhase = GAME_PHASES.DEALING;
      }
    }
    
    return newState;
  });

  /**
   * Mock implementation of handleDealerDiscard for testing the dealer's discard action.
   * Simulates the dealer discarding a card after being ordered up in the first round.
   *
   * @param {Object} gameState - The current game state
   * @param {string} dealerRole - The role of the dealer discarding a card
   * @param {string} cardToDiscardId - The ID of the card to discard (e.g., 'H-A' for Ace of Hearts)
   * @returns {Object} A new game state with the dealer's hand updated and game phase advanced
   * @throws {Error} If the dealer doesn't have the specified card or if validation fails
   * 
   * @see {@link module:src/game/phases/biddingPhase.handleDealerDiscard} - The real implementation
   * @see {@link module:test/game/phases/biddingPhase.unit.test.js} - Tests using this mock
   * 
   * @example
   * // Test discarding a card
   * const gameState = { /* ... *\/ };
   * const newState = mockHandleDealerDiscard(gameState, 'PLAYER_SOUTH', 'H-9');
   * 
   * // Test error when card not in hand
   * assert.throws(
   *   () => mockHandleDealerDiscard(gameState, 'PLAYER_SOUTH', 'INVALID_CARD'),
   *   { name: 'CardNotInHandError' }
   * );
   */
  const mockHandleDealerDiscard = mock.fn((gameState, dealerRole, cardToDiscardId) => {
    // Create a deep copy of the input state to ensure immutability
    const inputStateCopy = JSON.parse(JSON.stringify(gameState));
    
    // Create a separate deep copy for the return value
    const newState = JSON.parse(JSON.stringify(gameState));

    // Get dealer's hand from the new state
    const dealerHand = newState.players[dealerRole]?.hand || [];
    const cardToDiscard = dealerHand.find(card => card.id === cardToDiscardId);

    // Check if card is in hand
    if (!cardToDiscard) {
      const error = new Error(`Card ${cardToDiscardId} not found in dealer's hand.`);
      error.name = 'CardNotInHandError';
      throw error;
    }

    // Check turn card exists
    if (!newState.turnCard) {
      const error = new Error('Cannot discard: turn card is missing from game state.');
      error.name = 'PhaseLogicError';
      throw error;
    }

    // Update the new state immutably
    newState.players = {
      ...newState.players,
      [dealerRole]: {
        ...newState.players[dealerRole],
        hand: dealerHand.filter(card => card.id !== cardToDiscardId)
      }
    };
    
    // Store the turn card ID before clearing it
    const turnCardId = newState.turnCard.id;
    
    // Update other state properties
    newState.turnCard = null;
    newState.gamePhase = GAME_PHASES.GOING_ALONE_DECISION;
    newState.currentPlayer = newState.playerWhoOrderedUp || newState.playerWhoCalledTrump;
    
    // Add game message
    const message = {
      type: 'bidding',
      text: `${newState.players[dealerRole]?.name || dealerRole} picked up the ${turnCardId} and discarded ${cardToDiscardId}.`,
      timestamp: new Date().toISOString()
    };
    
    newState.gameMessages = [
      ...(newState.gameMessages || []),
      message
    ];

    return newState;
  });

  // Return the mock module
  return {
    handleOrderUpDecision: mockHandleOrderUpDecision,
    handleCallTrumpDecision: mockHandleCallTrumpDecision,
    handleDealerDiscard: mockHandleDealerDiscard
  };
}

// Default export with mock implementations
const biddingPhase = createBiddingPhaseWithDeps();
export default biddingPhase;
