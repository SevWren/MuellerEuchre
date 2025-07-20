// Mock implementation for bidding phase testing
// Provides controlled test doubles for the bidding phase functions
// @see src/game/phases/biddingPhase.js - Real implementation
// @see test/game/phases/biddingPhase.unit.test.js - Test usage

import { mock } from 'node:test';
import { PLAYER_ROLES, GAME_PHASES } from '../../src/config/constants.js';

/**
 * Creates mock implementations of bidding phase functions for testing.
 * @return {object} Mock functions for bidding phase operations
 **/

export function createBiddingPhaseWithDeps(deps = {}) {
  // Default mock implementation for validateBid if not provided
  const validateBid = deps.validateBid || mock.fn(() => true);
  // Mock for handleOrderUpDecision
  const mockHandleOrderUpDecision = mock.fn((gameState, playerRole, wantsToOrderUp) => {
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

  // Mock for handleCallTrumpDecision
  const mockHandleCallTrumpDecision = mock.fn((gameState, playerRole, wantsToCall, suitCalled) => {
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

  // Mock for handleDealerDiscard
  const mockHandleDealerDiscard = mock.fn((gameState, playerId, cardId) => {
    // Create a deep copy of the game state
    const newState = JSON.parse(JSON.stringify(gameState));

    // Test 1: Check if in DEALER_DISCARD phase
    if (newState.gamePhase !== GAME_PHASES.DEALER_DISCARD) {
      const error = new Error('Invalid phase');
      error.name = 'InvalidPhaseError';
      error.code = 'E_INVALID_PHASE';
      throw error;
    }

    // Test 2: Check if player is the dealer
    if (playerId !== newState.dealer) {
      const error = new Error('Player is not the dealer');
      error.name = 'NotDealerError';
      error.code = 'E_NOT_DEALER';
      throw error;
    }

    // Test 3: Check if card is in hand
    const playerHand = newState.players[playerId]?.hand || [];
    const cardInHand = playerHand.some(card => 
      `${card.value}${card.suit[0].toUpperCase()}` === cardId
    );

    if (!cardInHand) {
      const error = new Error('Card not in hand');
      error.name = 'CardNotInHandError';
      error.code = 'E_CARD_NOT_IN_HAND';
      throw error;
    }

    // Test 4: Check hand size before discard (should be 6)
    if (playerHand.length !== 6) {
      const error = new Error('Dealer must have 6 cards before discarding');
      error.name = 'HandSizeError';
      error.code = 'E_INVALID_HAND_SIZE';
      throw error;
    }

    // If all validations pass, process the discard
    // Remove the discarded card from hand
    newState.players[playerId].hand = playerHand.filter(card => 
      `${card.value}${card.suit[0].toUpperCase()}` !== cardId
    );

    // Transition to next phase
    newState.gamePhase = GAME_PHASES.PLAYING_TRICKS;
    
    // Add game message
    newState.gameMessages = newState.gameMessages || [];
    newState.gameMessages.push({
      playerId,
      text: `dealer discarded ${cardId}`,
      type: 'SYSTEM',
      timestamp: new Date().toISOString()
    });

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
