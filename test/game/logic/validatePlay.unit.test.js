/**
 * @file Unit tests for the Euchre game validation logic
 * @module test/game/logic/validation.unit.test
 * @description Comprehensive test suite for validating core game rules in Euchre,
 * including playing cards, bidding, and discarding.
 */

import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// --- Import Constants & Custom Errors ---
import {
  CARD_SUITS as SUITS,
  CARD_VALUES as VALUES,
  GAME_PHASES,
  PLAYER_ROLES,
  BID_DECISIONS,
} from '../../../src/config/constants.js';
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidBidError,
  InvalidDiscardError,
} from '../../../src/game/logic/validation-errors.js';

// --- Centralized Mock Implementations ---
// Logic is defined once and reused, preventing duplication.

const isLeftBower = (card, trumpSuit) => {
  if (!card || card.value !== VALUES.JACK) return false;
  const colorMap = {
    [SUITS.SPADES]: SUITS.CLUBS,
    [SUITS.CLUBS]: SUITS.SPADES,
    [SUITS.HEARTS]: SUITS.DIAMONDS,
    [SUITS.DIAMONDS]: SUITS.HEARTS,
  };
  return colorMap[trumpSuit] === card.suit;
};

const getEffectiveSuit = (card, trumpSuit) => {
  return isLeftBower(card, trumpSuit) ? trumpSuit : card.suit;
};

const mockLogger = {
  info: mock.fn(),
  warn: mock.fn(),
  error: mock.fn(),
  debug: mock.fn(),
};

// Import the validation module first
const validationModule = await import('../../../src/game/logic/validation-core.js');
const { validatePlay, validateBid, validateDealerDiscard } = validationModule;

// Import the deck utilities with a different name to avoid conflicts
import * as deckUtils from '../../../src/utils/deck.js';

// Reset mocks before each test
beforeEach(() => {
  mockLogger.info.mock.resetCalls();
  mockLogger.warn.mock.resetCalls();
  mockLogger.error.mock.resetCalls();
  mockLogger.debug.mock.resetCalls();
});

// --- Test Helper Functions ---

// Create a card with the correct structure including the required methods
const createCard = (id, suit, value) => ({
  id,
  suit,
  value,
  isLeftBower: (trumpSuit) => deckUtils.isLeftBower({ id, suit, value }, trumpSuit),
  getEffectiveSuit: (trumpSuit) => deckUtils.getEffectiveSuit({ id, suit, value }, trumpSuit)
});

const createBaseGameState = (gamePhase = GAME_PHASES.GAME_PHASE_PLAYING) => ({
  gamePhase,
  dealer: 'north',
  currentPlayer: 'south',
  currentTrick: [],
  trumpSuit: null,
  upCard: createCard('KH', SUITS.HEARTS, VALUES.KING),
  players: {
    south: { id: 'south', name: 'South', hand: [], team: 'NS' },
    west: { id: 'west', name: 'West', hand: [], team: 'EW' },
    north: { id: 'north', name: 'North', hand: [], team: 'NS' },
    east: { id: 'east', name: 'East', hand: [], team: 'EW' },
  },
});

// =============================================================================
// --- TEST SUITES ---
// =============================================================================

describe('Game Validation Logic', () => {
  afterEach(() => {
    mock.restoreAll();
  });

  // ===========================================================================
  // == validatePlay Suite
  // ===========================================================================
  describe('validatePlay', () => {
    let gameState;
    let playerHand;
    const playerRole = 'south'; // Using string literal for player role

    // Initialize all players with empty hands in the base game state
    const initPlayerHands = (gameState) => {
      // Ensure all player roles have a hand array
      Object.values(PLAYER_ROLES).forEach(role => {
        if (!gameState.players[role]) {
          gameState.players[role] = { hand: [] };
        } else if (!gameState.players[role].hand) {
          gameState.players[role].hand = [];
        }
      });
      return gameState;
    };

    beforeEach(() => {
      // Create base game state and initialize all player hands
      gameState = createBaseGameState(GAME_PHASES.GAME_PHASE_PLAYING);
      gameState = initPlayerHands(gameState);
      
      // Set up trump suit and current player
      gameState.trumpSuit = SUITS.HEARTS;
      gameState.currentPlayer = playerRole;
      
      // Set up player's hand
      playerHand = [
        createCard('9H', SUITS.HEARTS, VALUES.NINE), // Trump
        createCard('AC', SUITS.CLUBS, VALUES.ACE),
        createCard('KC', SUITS.CLUBS, VALUES.KING),
        createCard('JD', SUITS.DIAMONDS, VALUES.JACK), // Left Bower
      ];
      gameState.players[playerRole].hand = [...playerHand];
    });

    describe('Initial Argument & State Validation', () => {
      it('should throw ValidationError if gameState is missing', () => {
        assert.throws(() => validatePlay(null, playerHand, playerHand[0], playerRole), ValidationError);
      });

      it('should throw ValidationError if playerHand is missing', () => {
        assert.throws(() => validatePlay(gameState, null, playerHand[0], playerRole), ValidationError);
      });

      it('should throw ValidationError if cardToPlay is missing', () => {
        assert.throws(() => validatePlay(gameState, playerHand, null, playerRole), ValidationError);
      });

      it('should throw InvalidPhaseError if game is not in PLAYING phase', () => {
        gameState.gamePhase = GAME_PHASES.GAME_PHASE_DEALER_DISCARD;
        assert.throws(
          () => validatePlay(gameState, playerHand, playerHand[0], playerRole), 
          InvalidPhaseError,
          'Should throw InvalidPhaseError when not in PLAYING phase'
        );
      });

      it("should throw NotPlayersTurnError if it is not the player's turn", () => {
        // Use a different player role that's not the current player
        gameState.currentPlayer = 'west'; // Using string literal instead of PLAYER_ROLES.WEST
        assert.throws(
          () => validatePlay(gameState, playerHand, playerHand[0], playerRole), 
          NotPlayersTurnError,
          'Should throw NotPlayersTurnError when it\'s not the player\'s turn'
        );
      });

      it("should throw CardNotInHandError if the card is not in player's hand", () => {
        const cardNotInHand = createCard('QH', SUITS.HEARTS, VALUES.QUEEN);
        assert.throws(() => validatePlay(gameState, playerHand, cardNotInHand, playerRole), CardNotInHandError);
      });
    });

    describe('Following Suit (Standard Plays)', () => {
      it('should return true when leading the trick', () => {
        gameState.currentTrick = [];
        assert.strictEqual(validatePlay(gameState, playerHand, playerHand[1], playerRole), true);
      });

      it('should return true when following suit correctly', () => {
        gameState.currentTrick = [{ card: createCard('QC', SUITS.CLUBS, VALUES.QUEEN) }];
        assert.strictEqual(validatePlay(gameState, playerHand, playerHand[1], playerRole), true);
      });

      it('should throw MustFollowSuitError if player has the led suit but plays another', () => {
        gameState.currentTrick = [{ card: createCard('QC', SUITS.CLUBS, VALUES.QUEEN) }];
        assert.throws(() => validatePlay(gameState, playerHand, playerHand[0], playerRole), MustFollowSuitError);
      });

      it('should return true when playing off-suit because player does not have the led suit', () => {
        gameState.currentTrick = [{ card: createCard('AS', SUITS.SPADES, VALUES.ACE) }];
        assert.strictEqual(validatePlay(gameState, playerHand, playerHand[1], playerRole), true);
      });
    });

    describe('Following Suit (Trump & Bower Scenarios)', () => {
      it('should return true when playing trump because player has no led suit', () => {
        gameState.currentTrick = [{ card: createCard('AS', SUITS.SPADES, VALUES.ACE) }];
        assert.strictEqual(validatePlay(gameState, playerHand, playerHand[0], playerRole), true);
      });

      it('should throw MustFollowSuitError if a player has the led suit but tries to play trump', () => {
        gameState.currentTrick = [{ card: createCard('QC', SUITS.CLUBS, VALUES.QUEEN) }];
        assert.throws(() => validatePlay(gameState, playerHand, playerHand[0], playerRole), MustFollowSuitError);
      });

      it('should treat the Left Bower as part of the trump suit when checking if player can follow', () => {
        gameState.trumpSuit = SUITS.HEARTS;
        playerHand = [
          createCard('JD', SUITS.DIAMONDS, VALUES.JACK), // Left Bower (effective suit: Hearts)
          createCard('AS', SUITS.SPADES, VALUES.ACE),
        ];
        gameState.players[playerRole].hand = playerHand;
        gameState.currentTrick = [{ card: createCard('KS', SUITS.SPADES, VALUES.KING) }];

        assert.throws(() => validatePlay(gameState, playerHand, playerHand[0], playerRole), MustFollowSuitError);
        assert.strictEqual(validatePlay(gameState, playerHand, playerHand[1], playerRole), true);
      });

      it('should allow playing the Left Bower when trump is led', () => {
        gameState.trumpSuit = SUITS.HEARTS;
        playerHand = [createCard('JD', SUITS.DIAMONDS, VALUES.JACK)];
        gameState.players[playerRole].hand = playerHand;
        gameState.currentTrick = [{ card: createCard('9H', SUITS.HEARTS, VALUES.NINE) }];
        assert.strictEqual(validatePlay(gameState, playerHand, playerHand[0], playerRole), true);
      });

      it('should identify the led suit as trump when the Left Bower is led', () => {
        // Set up trump and current player
        gameState.trumpSuit = SUITS.HEARTS;
        gameState.currentPlayer = playerRole; // Set current player to the test player
        
        // Set up player's hand with a trump card and an off-suit card
        playerHand = [
          createCard('9H', SUITS.HEARTS, VALUES.NINE), // Trump
          createCard('AC', SUITS.CLUBS, VALUES.ACE),    // Off-suit
        ];
        gameState.players[playerRole].hand = playerHand;
        
        // Set up the current trick with the Left Bower (JD) as the led card
        // JD is the Left Bower when trump is HEARTS (since JD is DIAMONDS and JACK is the same as JACK)
        gameState.currentTrick = [{ 
          card: createCard('JD', SUITS.DIAMONDS, VALUES.JACK),
          playedBy: PLAYER_ROLES[1] // Another player led the Left Bower
        }];

        // Should throw MustFollowSuitError when trying to play off-suit (AC) when could follow trump
        assert.throws(
          () => validatePlay(gameState, playerHand, playerHand[1], playerRole),
          MustFollowSuitError,
          'Should not be able to play off-suit when holding a trump card and Left Bower is led'
        );
        
        // Should allow playing a trump card (9H)
        assert.strictEqual(
          validatePlay(gameState, playerHand, playerHand[0], playerRole),
          true,
          'Should allow playing a trump card when Left Bower is led'
        );
      });
    });
  });

  // ===========================================================================
  // == validateBid Suite
  // ===========================================================================
  describe('validateBid', () => {
    let gameState;
    const playerRole = PLAYER_ROLES[0]; // PLAYER_SOUTH

    beforeEach(() => {
      gameState = createBaseGameState(GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND1);
      gameState.currentPlayer = playerRole;
    });

    it('should throw InvalidPhaseError if not in a bidding phase', () => {
      gameState.gamePhase = GAME_PHASES.GAME_PHASE_PLAYING;
      assert.throws(() => validateBid(gameState, playerRole, { type: 'pass' }), InvalidPhaseError);
    });

    it("should throw NotPlayersTurnError if it's not the player's turn to bid", () => {
      gameState.currentPlayer = PLAYER_ROLES[1]; // PLAYER_WEST
      assert.throws(() => validateBid(gameState, playerRole, 'pass'), NotPlayersTurnError);
    });

    it('should return true for a valid "pass" bid', () => {
      assert.strictEqual(validateBid(gameState, playerRole, 'pass'), true);
    });

    it('should return true for a valid "orderUp" bid in round 1', () => {
      // Set up for dealer (north) to order up in round 1
      const dealerRole = PLAYER_ROLES[3]; // PLAYER_NORTH
      gameState.gamePhase = GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND1;
      gameState.currentPlayer = dealerRole;
      gameState.dealer = dealerRole;
      assert.strictEqual(validateBid(gameState, dealerRole, BID_DECISIONS.ORDER_UP), true);
    });

    it('should throw InvalidBidError for an unknown bid type', () => {
      assert.throws(() => validateBid(gameState, playerRole, 'invalidBid'), InvalidBidError);
    });

    it('should throw InvalidBidError if dealer tries to pick it up in round 2', () => {
      gameState.gamePhase = GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND2;
      gameState.currentPlayer = PLAYER_ROLES[3]; // PLAYER_NORTH
      assert.throws(
        () => validateBid(gameState, gameState.currentPlayer, 'pickItUp'), 
        InvalidBidError
      );
    });

    it('should return true for a valid "callTrump" bid in round 2', () => {
      gameState.gamePhase = GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND2;
      gameState.currentPlayer = playerRole;
      assert.strictEqual(validateBid(gameState, playerRole, 'callTrump', SUITS.SPADES), true);
    });

    it('should throw InvalidBidError if called trump is the same as the up-card suit in round 2', () => {
      gameState.gamePhase = GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND2;
      gameState.currentPlayer = playerRole;
      const bid = { type: 'callTrump', suit: gameState.upCard.suit }; // Hearts
      assert.throws(
        () => validateBid(gameState, playerRole, bid), 
        InvalidBidError,
        'Should not allow calling trump suit that was turned down in round 1'
      );
    });
  });

  // ===========================================================================
  // == validateDiscard Suite
  // ===========================================================================
  describe('validateDiscard', () => {
    let gameState;
    let dealerRole;
    let dealerHand;

    beforeEach(() => {
      // Create a fresh game state with DEALER_DISCARD phase
      gameState = createBaseGameState();
      
      // Set up dealer and current player
      dealerRole = 'north';
      gameState.dealer = dealerRole;
      gameState.currentPlayer = dealerRole;
      gameState.gamePhase = GAME_PHASES.GAME_PHASE_DEALER_DISCARD;
      
      // Initialize all players with empty hands first
      Object.values(PLAYER_ROLES).forEach(role => {
        gameState.players[role] = gameState.players[role] || { hand: [] };
      });
      
      // Set up dealer's hand with 5 cards (before picking up the upcard)
      dealerHand = [
        createCard('9H', SUITS.HEARTS, VALUES.NINE),
        createCard('AC', SUITS.CLUBS, VALUES.ACE),
        createCard('QD', SUITS.DIAMONDS, VALUES.QUEEN),
        createCard('JS', SUITS.SPADES, VALUES.JACK),
        createCard('10C', SUITS.CLUBS, VALUES.TEN),
      ];
      
      // Set up upCard that was just picked up
      gameState.upCard = createCard('KH', SUITS.HEARTS, VALUES.KING);
      
      // Add the upcard to the dealer's hand (simulating the pickup)
      dealerHand.push({...gameState.upCard});
      gameState.players[dealerRole].hand = [...dealerHand];
      
      // Set up game state for discard phase
      gameState.trumpSuit = SUITS.HEARTS; // Assuming hearts is trump for this test
      gameState.dealerHasPickedUp = true;
    });

    it('should throw InvalidPhaseError if not in the DEALER_DISCARD phase', () => {
      // Set the phase to something other than DEALER_DISCARD
      gameState.gamePhase = GAME_PHASES.GAME_PHASE_PLAYING;
      const cardToDiscard = gameState.players[dealerRole].hand[0];
      
      // The validation should throw InvalidPhaseError
      assert.throws(
        () => validateDealerDiscard(gameState, dealerRole, cardToDiscard, gameState.players[dealerRole].hand), 
        InvalidPhaseError,
        'Should throw InvalidPhaseError when not in DEALER_DISCARD phase'
      );
    });

    it('should throw NotPlayersTurnError if a non-dealer tries to discard', () => {
      const nonDealer = 'south'; // Non-dealer role
      const cardToDiscard = createCard('AS', SUITS.SPADES, VALUES.ACE);
      
      // First ensure the test is set up correctly
      assert.strictEqual(gameState.currentPlayer, dealerRole, 'Test setup: Current player should be dealer');
      assert.notStrictEqual(nonDealer, dealerRole, 'Test setup: nonDealer should not be the dealer');
      
      // The validation should throw NotPlayersTurnError
      assert.throws(
        () => validateDealerDiscard(gameState, nonDealer, cardToDiscard, gameState.players[dealerRole].hand), 
        NotPlayersTurnError,
        'Should throw NotPlayersTurnError when non-dealer tries to discard'
      );
    });

    it('should throw CardNotInHandError if the discarded card is not in the dealer\'s hand', () => {
      const cardNotInHand = createCard('QH', SUITS.HEARTS, VALUES.QUEEN);
      
      // Ensure the card is not in the dealer's hand
      const cardIds = gameState.players[dealerRole].hand.map(card => card.id);
      assert(!cardIds.includes(cardNotInHand.id), 'Test setup: card should not be in dealer\'s hand');
      
      assert.throws(
        () => validateDealerDiscard(gameState, dealerRole, cardNotInHand, gameState.players[dealerRole].hand), 
        CardNotInHandError,
        'Should throw CardNotInHandError when discarding a card not in hand'
      );
    });

    it('should throw InvalidDiscardError if the dealer tries to discard the up-card they just picked up', () => {
      // Add the up-card to the dealer's hand to simulate the pickup
      const dealerHand = gameState.players[dealerRole].hand;
      const upCardCopy = {...gameState.upCard};
      dealerHand.push(upCardCopy);
      
      // Set the turnCard in gameState to be the same as upCard
      gameState.turnCard = {...gameState.upCard};
      
      // Ensure the up-card is in the dealer's hand
      const upCardInHand = dealerHand.some(card => 
        card.id === gameState.upCard.id && 
        card.suit === gameState.upCard.suit
      );
      assert(upCardInHand, 'Test setup: upCard should be in dealer\'s hand');
      
      // The validation should throw InvalidDiscardError
      assert.throws(
        () => validateDealerDiscard(gameState, dealerRole, upCardCopy, dealerHand), 
        InvalidDiscardError,
        'Should throw InvalidDiscardError when trying to discard the picked up up-card'
      );
      
      // Verify the error message is correct
      try {
        validateDealerDiscard(gameState, dealerRole, upCardCopy, dealerHand);
        assert.fail('Expected InvalidDiscardError to be thrown');
      } catch (error) {
        assert.strictEqual(error.message, 'Cannot discard the turn card (upcard).', 'Error message should match');
      }
    });

    it('should return true for a valid discard', () => {
      // Ensure we're in the correct phase
      assert.strictEqual(
        gameState.gamePhase, 
        GAME_PHASES.GAME_PHASE_DEALER_DISCARD, 
        'Test setup: game should be in DEALER_DISCARD phase'
      );
      
      const dealerHand = gameState.players[dealerRole].hand;
      const cardToDiscard = dealerHand[0];
      
      // The validation should pass for a valid discard
      assert.strictEqual(
        validateDealerDiscard(gameState, dealerRole, cardToDiscard, dealerHand), 
        true,
        'Should return true for a valid discard'
      );
    });
  });
});