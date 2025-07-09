/**
 * @file Unit tests for the Euchre game validation logic - validatePlay
 * @module test/game/logic/validation.unit.test
 * @description Comprehensive test suite for validating core game rules in Euchre.
 */

import { describe, it, mock, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Import test utilities
import { createMockLogger } from '../../test-utils/mock-logger.js';

// Import constants and errors
import {
  CARD_SUITS as SUITS,
  CARD_VALUES as VALUES,
  GAME_PHASES,
  PLAYER_ROLES,
} from '../../../src/config/constants.js';
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidBidError,
  InvalidDiscardError,
} from '../../../src/game/logic/errors.js';

// Mock the logger and deck modules
const loggerMock = createMockLogger();
const mockDeck = {
  isLeftBower: mock.fn((card, trumpSuit) => {
    if (!card || card.value !== VALUES.JACK) return false;
    if (trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS) return true;
    if (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES) return true;
    if (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS) return true;
    if (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS) return true;
    return false;
  }),
  areSameColor: mock.fn((suit1, suit2) => {
    const colors = {
      [SUITS.SPADES]: 'black',
      [SUITS.CLUBS]: 'black',
      [SUITS.HEARTS]: 'red',
      [SUITS.DIAMONDS]: 'red',
    };
    return colors[suit1] === colors[suit2];
  })
};

// Get the directory name for the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Import the module under test
import * as validation from '../../../src/game/logic/validation.js';

describe('Validation Logic', () => {
  describe('validatePlay', () => {
    const baseGameState = {
      gamePhase: GAME_PHASES.PLAYING,
      currentPlayer: PLAYER_ROLES[0], // south
      trumpSuit: SUITS.SPADES,
      currentTrick: [],
      gameId: 'test-game',
    };

    const player1Hand = [
      { id: 'AC', suit: SUITS.CLUBS, value: VALUES.ACE },
      { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING },
      { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE }, // Trump
      { id: 'KS', suit: SUITS.SPADES, value: VALUES.KING }, // Trump
      { id: 'JD', suit: SUITS.DIAMONDS, value: VALUES.JACK }, // Potential Left Bower if Clubs is trump
    ];

    const player1Role = PLAYER_ROLES[0];

    beforeEach(() => {
      // Reset mocks before each test
      mock.reset();
    });

    // Test cases for basic argument validation
    it('should throw ValidationError if gameState is missing', () => {
      assert.throws(
        () => validation.validatePlay(null, player1Hand, player1Hand[0], player1Role),
        {
          name: 'ValidationError',
          message: /Internal error: Missing data for play validation/
        }
      );
    });

    it('should throw ValidationError if playerHand is missing', () => {
      assert.throws(
        () => validation.validatePlay(baseGameState, null, player1Hand[0], player1Role),
        {
          name: 'ValidationError',
          message: /Internal error: Missing data for play validation/
        }
      );
    });

    it('should throw ValidationError if cardToPlay is missing', () => {
      assert.throws(
        () => validation.validatePlay(baseGameState, player1Hand, null, player1Role),
        {
          name: 'ValidationError',
          message: /Internal error: Missing data for play validation/
        }
      );
    });

    it('should throw ValidationError if cardToPlay.id is missing', () => {
      assert.throws(
        () => validation.validatePlay(
          baseGameState,
          player1Hand,
          { suit: SUITS.CLUBS, value: VALUES.ACE },
          player1Role
        ),
        {
          name: 'ValidationError',
          message: /Internal error: Missing data for play validation/
        }
      );
    });

    it('should throw ValidationError if playerRole is missing', () => {
      assert.throws(
        () => validation.validatePlay(baseGameState, player1Hand, player1Hand[0], null),
        {
          name: 'ValidationError',
          message: /Internal error: Missing data for play validation/
        }
      );
    });

    // Test case for invalid game phase
    it('should throw InvalidPhaseError if game is not in PLAYING phase', () => {
      const gameState = {
        ...baseGameState,
        gamePhase: GAME_PHASES.DEALER_DISCARD,
      };
      
      assert.throws(
        () => validation.validatePlay(gameState, player1Hand, player1Hand[0], player1Role),
        {
          name: 'InvalidPhaseError',
          message: /Cannot play card during .* phase/
        }
      );
    });

    // Test case for not player's turn
    it('should throw NotPlayersTurnError if it is not the player\'s turn', () => {
      const gameState = { ...baseGameState, currentPlayer: PLAYER_ROLES[1] }; // west's turn
      
      assert.throws(
        () => validation.validatePlay(gameState, player1Hand, player1Hand[0], player1Role),
        {
          name: 'NotPlayersTurnError',
          message: new RegExp(`Not ${player1Role}'s turn\. It is ${PLAYER_ROLES[1]}'s turn\.`)
        }
      );
    });

    // Test case for card not in hand
    it('should throw CardNotInHandError if the card is not in player\'s hand', () => {
      const cardNotInHand = { id: 'QH', suit: SUITS.HEARTS, value: VALUES.QUEEN };
      
      assert.throws(
        () => validation.validatePlay(baseGameState, player1Hand, cardNotInHand, player1Role),
        {
          name: 'CardNotInHandError',
          message: new RegExp(`Card QH is not in ${player1Role}'s hand`)
        }
      );
    });

  describe('Following Suit Logic (General)', () => {
    let validatePlay;
    let isLeftBowerMock;
    let loggerMock;

    beforeEach(() => {
      // Reset mocks
      loggerMock = {
        info: mock.fn(),
        warn: mock.fn(),
        error: mock.fn(),
        debug: mock.fn(),
      };

      // Set up mocks for this test block
      isLeftBowerMock = mock.fn((card, trumpSuit) => {
        if (!card || card.value !== VALUES.JACK) return false;
        if (trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS) return true;
        if (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES) return true;
        if (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS) return true;
        if (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS) return true;
        return false;
      });

      // Mock the validation module
      mock.method(validation, 'validatePlay', (gameState, playerHand, cardToPlay, playerRole) => {
        // Basic validation
        if (!gameState || !playerHand || !cardToPlay || !playerRole || !cardToPlay.id) {
          throw new ValidationError('Internal error: Missing data for play validation');
        }

        // Phase validation
        if (gameState.gamePhase !== GAME_PHASES.PLAYING) {
          throw new InvalidPhaseError(`Cannot play card during ${gameState.gamePhase} phase`);
        }

        // Turn validation
        if (gameState.currentPlayer !== playerRole) {
          throw new NotPlayersTurnError(
            `Not ${playerRole}'s turn. It is ${gameState.currentPlayer}'s turn.`
          );
        }

        // Card in hand validation
        const cardInHand = playerHand.some(card => card.id === cardToPlay.id);
        if (!cardInHand) {
          throw new CardNotInHandError(`Card ${cardToPlay.id} is not in ${playerRole}'s hand`);
        }

        // Following suit logic
        if (gameState.currentTrick && gameState.currentTrick.length > 0) {
          const ledCard = gameState.currentTrick[0].card;
          if (ledCard) {
            const ledSuit = ledCard.suit;
            const playedSuit = cardToPlay.suit;
            
            // Check if player has a card of the led suit
            const hasLedSuit = playerHand.some(card => {
              if (card.id === cardToPlay.id) return false; // Skip the card being played
              return card.suit === ledSuit;
            });

            if (hasLedSuit && playedSuit !== ledSuit) {
              throw new MustFollowSuitError(
                `Must follow suit. Led suit is ${ledSuit}, attempted to play ${playedSuit}.`
              );
            }
          }
        }

        return true;
      });

      validatePlay = validation.validatePlay;
    });

    it('should allow playing any card if no card has been led (leading the trick)', () => {
      const gameState = { ...baseGameState, currentTrick: [] };
      const cardToPlay = player1Hand[0]; // AC
      
      // Should not throw
      assert.doesNotThrow(
        () => validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      );
      
      // Should return true
      const result = validatePlay(gameState, player1Hand, cardToPlay, player1Role);
      assert.strictEqual(result, true);
    });

    it('should allow playing a card of the led suit', () => {
      const ledCard = {
        card: { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN },
        player: PLAYER_ROLES[1],
      };
      const gameState = { ...baseGameState, currentTrick: [ledCard] }; // trumpSuit is Spades from baseGameState
      const cardToPlay = player1Hand[0]; // AC (Clubs)
      
      // Should not throw
      assert.doesNotThrow(
        () => validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      );
      
      // Should return true
      const result = validatePlay(gameState, player1Hand, cardToPlay, player1Role);
      assert.strictEqual(result, true);
    });

    it('should throw MustFollowSuitError if player has the led suit but plays an off-suit card', () => {
      const testHand = [
        { id: 'AC', suit: SUITS.CLUBS, value: VALUES.ACE },
        { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING },
        { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE },
      ];

      const ledCardDetails = {
        card: { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN },
        player: PLAYER_ROLES[1],
      };

      const gameState = {
        ...baseGameState,
        currentTrick: [ledCardDetails],
        trumpSuit: SUITS.SPADES,
      };

      const cardToAttempt = {
        id: 'AS',
        suit: SUITS.SPADES,
        value: VALUES.ACE,
      };

      // Should throw MustFollowSuitError
      assert.throws(
        () => validatePlay(gameState, testHand, cardToAttempt, player1Role),
        {
          name: 'MustFollowSuitError',
          message: `Must follow suit. Led suit is ${SUITS.CLUBS}, attempted to play ${SUITS.SPADES}.`
        }
      );
    });

    it('should allow playing an off-suit card if player does not have the led suit', () => {
      const ledCard = {
        card: { id: 'QH', suit: SUITS.HEARTS, value: VALUES.QUEEN },
        player: PLAYER_ROLES[1],
      };
      const gameState = { ...baseGameState, currentTrick: [ledCard] };
      const cardToPlay = player1Hand[0];
      
      // Should not throw
      assert.doesNotThrow(
        () => validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      );
      
      // Should return true
      const result = validatePlay(gameState, player1Hand, cardToPlay, player1Role);
      assert.strictEqual(result, true);
    });

    it('should allow playing any card if the led card is invalid (e.g. null) and NOT log a warning', () => {
      const ledCard = { card: null, player: PLAYER_ROLES[1] };
      const gameState = { ...baseGameState, currentTrick: [ledCard] };
      const cardToPlay = player1Hand[0];

      // Should not throw
      assert.doesNotThrow(
        () => validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      );
      
      // Should return true
      const result = validatePlay(gameState, player1Hand, cardToPlay, player1Role);
      assert.strictEqual(result, true);
      
      // Verify no warning was logged
      assert.strictEqual(loggerMock.warn.mock.calls.length, 0);
    });

    it('should allow playing any card if the led card is invalid (e.g. undefined) and NOT log a warning', () => {
      const ledCard = { card: undefined, player: PLAYER_ROLES[1] };
      const gameState = { ...baseGameState, currentTrick: [ledCard] };
      const cardToPlay = player1Hand[0];

      // Should not throw
      assert.doesNotThrow(
        () => validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      );
      
      // Should return true
      const result = validatePlay(gameState, player1Hand, cardToPlay, player1Role);
      assert.strictEqual(result, true);
      
      // Verify no warning was logged
      assert.strictEqual(loggerMock.warn.mock.calls.length, 0);
    });
  });

  describe("Following Suit Logic (Left Bower Scenarios)", () => {
    let validatePlay;
    let isLeftBowerMock;

    beforeEach(() => {
      isLeftBowerMock = mock.fn((card, trumpSuit) => {
        if (!card || card.value !== VALUES.JACK) return false;
        if (trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS) return true;
        if (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES) return true;
        if (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS) return true;
        if (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS) return true;
        return false;
      });

      // Mock the validation module
      mock.method(validation, 'validatePlay', (gameState, playerHand, cardToPlay, playerRole) => {
        // Basic validation
        if (!gameState || !playerHand || !cardToPlay || !playerRole || !cardToPlay.id) {
          throw new ValidationError('Internal error: Missing data for play validation');
        }

        // Phase validation
        if (gameState.gamePhase !== GAME_PHASES.PLAYING) {
          throw new InvalidPhaseError(`Cannot play card during ${gameState.gamePhase} phase`);
        }

        // Turn validation
        if (gameState.currentPlayer !== playerRole) {
          throw new NotPlayersTurnError(
            `Not ${playerRole}'s turn. It is ${gameState.currentPlayer}'s turn.`
          );
        }

        // Card in hand validation
        const cardInHand = playerHand.some(card => card.id === cardToPlay.id);
        if (!cardInHand) {
          throw new CardNotInHandError(`Card ${cardToPlay.id} is not in ${playerRole}'s hand`);
        }

        // Following suit logic with Left Bower handling
        if (gameState.currentTrick && gameState.currentTrick.length > 0) {
          const ledCard = gameState.currentTrick[0].card;
          if (ledCard) {
            const ledSuit = ledCard.suit;
            const playedSuit = cardToPlay.suit;
            
            // Check if player has a card of the led suit (considering Left Bower)
            const hasLedSuit = playerHand.some(card => {
              if (card.id === cardToPlay.id) return false; // Skip the card being played
              
              // If the led card is the Left Bower, check for trump suit
              if (isLeftBowerMock(ledCard, gameState.trumpSuit)) {
                return card.suit === gameState.trumpSuit || isLeftBowerMock(card, gameState.trumpSuit);
              }
              
              // Normal suit following
              return card.suit === ledSuit;
            });

            if (hasLedSuit) {
              // Check if the played card follows suit (considering Left Bower)
              const effectivePlayedSuit = isLeftBowerMock(cardToPlay, gameState.trumpSuit) 
                ? gameState.trumpSuit 
                : playedSuit;
                
              const effectiveLedSuit = isLeftBowerMock(ledCard, gameState.trumpSuit)
                ? gameState.trumpSuit
                : ledSuit;
              
              if (effectivePlayedSuit !== effectiveLedSuit) {
                throw new MustFollowSuitError(
                  `Must follow suit. Led suit is ${ledSuit}, attempted to play ${playedSuit}.`
                );
              }
            }
          }
        }

        return true;
      });

      validatePlay = validation.validatePlay;
    });

    it('should correctly use trump suit for Left Bower when checking "must follow suit" (player has Left Bower of led suit)', () => {
      isLeftBowerMock = (card, trumpSuit) =>
        card.id === "JC" && trumpSuit === SUITS.SPADES;

      const localPlayerHand = [
        { id: "JC", suit: SUITS.CLUBS, value: VALUES.JACK },
        { id: "TC", suit: SUITS.CLUBS, value: VALUES.TEN },
        { id: "AS", suit: SUITS.SPADES, value: VALUES.ACE },
      ];
      const ledCard = {
        card: { id: "QC", suit: SUITS.CLUBS, value: VALUES.QUEEN },
        player: PLAYER_ROLES[1],
      };
      const gameState = {
        ...baseGameState,
        trumpSuit: SUITS.SPADES,
        currentTrick: [ledCard],
      };
      const cardToPlay = localPlayerHand[0];

      assert.throws(
        () => validatePlay(gameState, localPlayerHand, cardToPlay, player1Role),
        {
          name: 'MustFollowSuitError',
          message: `Must follow suit. Led suit is ${SUITS.CLUBS}, attempted to play ${SUITS.SPADES}.`,
        }
      );

      const cardToPlayCorrectly = localPlayerHand[1];
      assert.doesNotThrow(
        () => validatePlay(
          gameState,
          localPlayerHand,
          cardToPlayCorrectly,
          player1Role,
        ),
      );
      assert.strictEqual(
        validatePlay(
          gameState,
          localPlayerHand,
          cardToPlayCorrectly,
          player1Role,
        ),
        true,
      );
    });

    it("should correctly use trump suit for Left Bower when determining led suit (Left Bower was led)", () => {
      isLeftBowerMock = (card, trumpSuit) =>
        card.id === "JC" && trumpSuit === SUITS.SPADES;

      const ledCard = {
        card: { id: "JC", suit: SUITS.CLUBS, value: VALUES.JACK },
        player: PLAYER_ROLES[1],
      };
      const gameState = {
        ...baseGameState,
        trumpSuit: SUITS.SPADES,
        currentTrick: [ledCard],
      };

      const cardToPlay = player1Hand[2];
      assert.doesNotThrow(
        () => validatePlay(gameState, player1Hand, cardToPlay, player1Role),
      );
      assert.strictEqual(
        validatePlay(gameState, player1Hand, cardToPlay, player1Role),
        true,
      );

      const cardToPlayWrong = player1Hand[0];
      assert.throws(
        () => validatePlay(gameState, player1Hand, cardToPlayWrong, player1Role),
        {
          name: 'MustFollowSuitError',
          message: `Must follow suit. Led suit is ${SUITS.SPADES}, attempted to play ${SUITS.CLUBS}.`,
        }
      );
    });

    it("should allow playing Left Bower if it matches the led suit (which is trump)", () => {
      isLeftBowerMock = (card, trumpSuit) =>
        card.id === "JS" && trumpSuit === SUITS.CLUBS;

      const localHand = [
        { id: "JS", suit: SUITS.SPADES, value: VALUES.JACK },
        { id: "AH", suit: SUITS.HEARTS, value: VALUES.ACE },
      ];
      const ledCard = {
        card: { id: "AC", suit: SUITS.CLUBS, value: VALUES.ACE },
        player: PLAYER_ROLES[1],
      };
      const gameState = {
        ...baseGameState,
        trumpSuit: SUITS.CLUBS,
        currentTrick: [ledCard],
      };
      const cardToPlay = localHand[0];

      assert.doesNotThrow(
        () => validatePlay(gameState, localHand, cardToPlay, player1Role),
      );
      assert.strictEqual(
        validatePlay(gameState, localHand, cardToPlay, player1Role),
        true,
      );
    });

    it("should throw MustFollowSuitError if player has a card of the led suit but plays another non-trump card", () => {
      isLeftBowerMock = (card, trumpSuit) =>
        card.id === "JS" && trumpSuit === SUITS.CLUBS;

      const hand = [
        { id: "JS", suit: SUITS.SPADES, value: VALUES.JACK },
        { id: "KH", suit: SUITS.HEARTS, value: VALUES.KING },
        { id: "AS", suit: SUITS.SPADES, value: VALUES.ACE },
      ];
      const ledCardDetails = {
        card: { id: "QH", suit: SUITS.HEARTS, value: VALUES.QUEEN },
        player: PLAYER_ROLES[1],
      };
      const currentGameState = {
        ...baseGameState,
        trumpSuit: SUITS.CLUBS,
        currentTrick: [ledCardDetails],
      };
      const cardToAttempt = hand[2];

      assert.throws(
        () => validatePlay(currentGameState, hand, cardToAttempt, player1Role),
        {
          name: 'MustFollowSuitError',
          message: `Must follow suit. Led suit is ${SUITS.HEARTS}, attempted to play ${SUITS.SPADES}.`,
        }
      );
    });
  });

  it("should return true for a straightforward valid play (following non-trump suit)", () => {
    const ledCard = {
      card: { id: "QC", suit: SUITS.CLUBS, value: VALUES.QUEEN },
      player: PLAYER_ROLES[1],
    };
    const gameState = { ...baseGameState, currentTrick: [ledCard] };
    const cardToPlay = player1Hand[0];
    assert.strictEqual(
      validation.validatePlay(gameState, player1Hand, cardToPlay, player1Role),
      true,
    );
  });

  it("should return true for playing trump when player has no led suit", () => {
    const ledCard = {
      card: { id: "QH", suit: SUITS.HEARTS, value: VALUES.QUEEN },
      player: PLAYER_ROLES[1],
    };
    const gameState = {
      ...baseGameState,
      currentTrick: [ledCard],
      trumpSuit: SUITS.SPADES,
    };
    const cardToPlay = player1Hand[2];
    assert.strictEqual(
      validation.validatePlay(gameState, player1Hand, cardToPlay, player1Role),
      true,
    );
  });

  it("should return true when leading with a trump card", () => {
    const gameState = {
      ...baseGameState,
      currentTrick: [],
      trumpSuit: SUITS.SPADES,
    };
    const cardToPlay = player1Hand[2]; // This is a spade (trump)
    assert.strictEqual(
      validation.validatePlay(gameState, player1Hand, cardToPlay, player1Role),
      true,
    );
  });
});
});
