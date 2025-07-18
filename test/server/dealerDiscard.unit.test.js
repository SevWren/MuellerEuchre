import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { logger } from '../../src/utils/logger.js';
import * as deckUtils from '../../src/utils/deck.js';
import { SUITS, GAME_PHASES } from '../../src/config/constants.js';
import { InvalidPhaseError, NotDealerError, CardNotInHandError, HandSizeError } from '../../src/game/logic/errors.js';
import { createBiddingPhaseWithDeps } from '../__mocks__/biddingPhase.js';

// Create test doubles
const mockValidateDealerDiscard = mock.fn();
const mockValidateBid = mock.fn();
const mockCardToId = mock.fn((card) => 
  card ? `${card.value}${card.suit.charAt(0).toUpperCase()}` : 'UnknownCard'
);
const mockLogger = {
  info: mock.fn(),
  error: mock.fn()
};

// Create the test subject with our test doubles
const { handleDealerDiscard } = createBiddingPhaseWithDeps({
  validateDealerDiscard: mockValidateDealerDiscard,
  validateBid: mockValidateBid,
  cardToId: mockCardToId,
  logger: mockLogger
});

describe('Euchre Server | Phase Logic | handleDealerDiscard', () => {
  let gameState;

  beforeEach(() => {
    // Reset all mocks before each test
    mock.reset();
    mockValidateDealerDiscard.mock.resetCalls();
    mockValidateBid.mock.resetCalls();
    mockCardToId.mock.resetCalls();
    mockLogger.info.mock.resetCalls();
    mockLogger.error.mock.resetCalls();

    // Initialize a fresh game state for each test
    gameState = {
      players: {
        south: { id: 'south', hand: [] },
        west: { id: 'west', hand: [] },
        north: { id: 'north', hand: [] },
        east: { id: 'east', hand: [] }
      },
      gamePhase: GAME_PHASES.DEALER_DISCARD,
      dealer: 'south',
      gameMessages: []
    };
  });

  afterEach(() => {
    // Clean up after each test
    mock.restoreAll();
  });

  it('should successfully process a valid dealer discard', () => {
    // Arrange
    const cardToDiscard = { suit: 'hearts', value: 'A' };
    const cardToKeep = { suit: 'hearts', value: 'K' };
    const cardToDiscardId = 'AH';
    gameState.players.south.hand = [cardToDiscard, cardToKeep];
    
    // Setup mock validation to pass
    mockValidateDealerDiscard.mock.mockImplementation(() => ({
      isValid: true,
      error: null
    }));

    // Setup mock bid validation to pass
    mockValidateBid.mock.mockImplementation(() => ({
      isValid: true,
      error: null
    }));

    // Setup cardToId mock to return card IDs
    mockCardToId.mock.mockImplementation((card) => 
      card ? `${card.value}${card.suit.charAt(0).toUpperCase()}` : 'UnknownCard'
    );

    // Act
    const newState = handleDealerDiscard(gameState, 'south', cardToDiscardId);

    // Assert
    assert.strictEqual(newState.players.south.hand.length, 1, 'Should remove the discarded card from hand');
    assert.strictEqual(newState.players.south.hand[0].value, 'K', 'Should keep the other card in hand');
    assert.strictEqual(newState.gamePhase, GAME_PHASES.PLAYING_TRICKS, 'Should transition to PLAYING_TRICKS phase');
    assert.ok(newState.gameMessages.length > 0, 'Should add a game message');
    assert.ok(newState.gameMessages[0].text.includes('discarded'), 'Game message should announce the discard');
  });

  it('should throw InvalidPhaseError when not in DEALER_DISCARD phase', () => {
    // Arrange
    const cardToDiscardId = 'AH';
    gameState.gamePhase = GAME_PHASES.BIDDING; // Not DEALER_DISCARD phase

    // Setup mock validation to fail with InvalidPhaseError
    mockValidateDealerDiscard.mock.mockImplementation(() => {
      throw new InvalidPhaseError('Not in DEALER_DISCARD phase');
    });

    // Act & Assert
    assert.throws(
      () => handleDealerDiscard(gameState, 'south', cardToDiscardId),
      {
        name: 'InvalidPhaseError',
        code: 'E_INVALID_PHASE'
      },
      'Should throw InvalidPhaseError when not in DEALER_DISCARD phase'
    );
  });

  it('should throw NotDealerError when player is not the dealer', () => {
    // Arrange
    const cardToDiscardId = 'AH';
    gameState.gamePhase = GAME_PHASES.DEALER_DISCARD;
    gameState.dealer = 'south';

    // Setup mock validation to fail with NotDealerError
    mockValidateDealerDiscard.mock.mockImplementation(() => {
      throw new NotDealerError('Player is not the dealer');
    });

    // Act & Assert
    assert.throws(
      () => handleDealerDiscard(gameState, 'west', cardToDiscardId),
      {
        name: 'NotDealerError',
        code: 'E_NOT_DEALER'
      },
      'Should throw NotDealerError when player is not the dealer'
    );
  });

  it('should throw CardNotInHandError when card is not in hand', () => {
    // Arrange
    const cardToDiscardId = 'AH';
    gameState.gamePhase = GAME_PHASES.DEALER_DISCARD;
    gameState.dealer = 'south';
    gameState.players.south.hand = []; // Empty hand

    // Setup mock validation to fail with CardNotInHandError
    mockValidateDealerDiscard.mock.mockImplementation(() => {
      throw new CardNotInHandError('Card not in hand');
    });

    // Act & Assert
    assert.throws(
      () => handleDealerDiscard(gameState, 'south', cardToDiscardId),
      {
        name: 'CardNotInHandError',
        code: 'E_CARD_NOT_IN_HAND'
      },
      'Should throw CardNotInHandError when card is not in hand'
    );
  });

  it('should throw HandSizeError if the dealer hand size is incorrect before discard', () => {
    // Arrange - Give dealer wrong number of cards
    gameState.players.south.hand = [
      { suit: 'hearts', value: 'A' },
      { suit: 'hearts', value: 'K' },
      { suit: 'hearts', value: 'Q' },
      { suit: 'hearts', value: 'J' },
      { suit: 'hearts', value: '10' },
      { suit: 'hearts', value: '9' },
      { suit: 'hearts', value: '8' } // 7 cards is too many
    ];

    // Setup mock validation to fail with HandSizeError
    mockValidateDealerDiscard.mock.mockImplementation(() => {
      throw new HandSizeError('Dealer must have 6 cards before discarding');
    });

    // Act & Assert
    assert.throws(
      () => handleDealerDiscard(gameState, 'south', 'AH'),
      {
        name: 'HandSizeError',
        code: 'E_INVALID_HAND_SIZE',
        message: 'Dealer must have 6 cards before discarding'
      },
      'Should throw HandSizeError when dealer hand size is incorrect'
    );
  });
});