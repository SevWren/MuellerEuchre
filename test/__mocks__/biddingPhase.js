// Mock implementation for biddingPhase module
import { mock } from 'node:test';

// Enhanced mock implementation for testing
export function createBiddingPhaseWithDeps() {
  const mockHandleDealerDiscard = mock.fn((gameState, playerId, cardId) => {
    // Create a deep copy of the game state
    const newState = JSON.parse(JSON.stringify(gameState));

    // Test 1: Check if in DEALER_DISCARD phase
    if (newState.gamePhase !== 'DEALER_DISCARD') {
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
    newState.gamePhase = 'PLAYING_TRICKS';
    
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
    handleDealerDiscard: mockHandleDealerDiscard
  };
}

// Default export with real implementations
const biddingPhase = createBiddingPhaseWithDeps();
export default biddingPhase;
