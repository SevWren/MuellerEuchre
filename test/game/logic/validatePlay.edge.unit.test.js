/**
 * @file test/game/logic/validatePlay.edge.unit.test.js
 * @module test/game/logic/validatePlay.edge.unit.test
 * @description
 *   Edge case tests for the Euchre game validation logic.
 *   These tests target specific branches not covered by the main test file.
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  CARD_SUITS,
  CARD_VALUES,
  GAME_PHASES,
  PLAYER_POSITIONS,
  CARD_RANKS
} from '../../../src/config/constants.js';
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  CardNotInHandError,
  MustFollowSuitError
} from '../../../src/game/logic/validation-errors.js';
import { validatePlay, getEffectiveSuit } from '../../../src/game/logic/validation-core.js';
import { isLeftBower } from '../../../src/utils/deck.js';

// Use prefixed constants directly for clarity
const { JACK, ACE, KING } = CARD_VALUES;

// --- Test Helper Functions ---

/**
 * Creates a card object with the specified properties.
 * @param {string} id - The card ID
 * @param {string} suit - The card suit
 * @param {string} value - The card value
 * @returns {Object} The card object
 */
const createCard = (id, suit, value) => ({
  id: id || `${value}${suit[0].toUpperCase()}`,
  suit,
  value
});

/**
 * Creates a base game state with default values.
 * @param {string} gamePhase - The game phase to set
 * @returns {Object} The game state object
 */
const createBaseGameState = (gamePhase = GAME_PHASES.PLAYING) => ({
  gamePhase,
  currentPlayer: 'south',
  currentTrick: [],
  currentTrickSuit: null,
  trumpSuit: CARD_SUITS.CARD_SUIT_HEARTS,
  players: {
    south: { id: 'south', name: 'South', hand: [], team: 'NS' },
    west: { id: 'west', name: 'West', hand: [], team: 'EW' },
    north: { id: 'north', name: 'North', hand: [], team: 'NS' },
    east: { id: 'east', name: 'East', hand: [], team: 'EW' }
  },
  teams: {
    NS: { score: 0, tricksWon: 0 },
    EW: { score: 0, tricksWon: 0 }
  },
  gameMessages: []
});

// --- Test Suite ---
describe('validatePlay Edge Cases', () => {
  let gameState;
  let playerHand;
  const playerRole = 'south';
  
  // Helper function to set up a test scenario
  const setupTestScenario = (options = {}) => {
    const {
      trumpSuit = CARD_SUITS.CARD_SUIT_SPADES,
      gamePhase = GAME_PHASES.PLAYING,
      currentTrick = [],
      playerCards = [
        createCard('AH', CARD_SUITS.CARD_SUIT_HEARTS, CARD_VALUES.ACE),
        createCard('KH', CARD_SUITS.CARD_SUIT_HEARTS, CARD_VALUES.KING),
        createCard('QD', CARD_SUITS.CARD_SUIT_DIAMONDS, CARD_VALUES.QUEEN),
        createCard('JC', CARD_SUITS.CARD_SUIT_CLUBS, CARD_VALUES.JACK), // Left Bower if trump is SPADES
        createCard('9S', CARD_SUITS.CARD_SUIT_SPADES, CARD_VALUES.NINE)  // Trump card
      ]
    } = options;
    
    gameState = createBaseGameState(gamePhase);
    gameState.currentPlayer = playerRole;
    playerHand = [...playerCards];
    
    gameState.players[playerRole] = {
      ...gameState.players[playerRole],
      hand: [...playerCards],
      position: playerRole
    };
    
    gameState.trumpSuit = trumpSuit;
    gameState.currentTrick = currentTrick;
    
    return { gameState, playerHand };
  };
  
  beforeEach(() => {
    // Reset mocks and state before each test
    if (mock && typeof mock.restoreAll === 'function') {
      mock.restoreAll();
    }
    setupTestScenario();
  });

  describe('Leading Card Scenarios', () => {
    it('should allow playing any card when leading (empty currentTrick)', () => {
      const { gameState, playerHand } = setupTestScenario({
        currentTrick: []
      });
      
      // Test each card in the hand
      for (const card of playerHand) {
        assert.doesNotThrow(
          () => validatePlay(gameState, playerHand, card, playerRole),
          `Should not throw when playing ${card.id} as lead card`
        );
        
        const result = validatePlay(gameState, playerHand, card, playerRole);
        assert.strictEqual(
          result,
          true,
          `Should return true when playing ${card.id} as lead card`
        );
      }
    });
    
    it('should not require following suit when leading', () => {
      const { gameState, playerHand } = setupTestScenario({
        currentTrick: []
      });
      
      // Test with a non-trump card
      const nonTrumpCard = playerHand.find(card => card.suit !== gameState.trumpSuit);
      assert.doesNotThrow(
        () => validatePlay(gameState, playerHand, nonTrumpCard, playerRole),
        'Should allow playing any card when leading'
      );
    });
  });

  describe('Left Bower Behavior', () => {
    it('should identify the led suit as trump when the Left Bower is led', () => {
      const trumpSuit = CARD_SUITS.CARD_SUIT_HEARTS;
      const leftBower = createCard('JD', CARD_SUITS.CARD_SUIT_DIAMONDS, JACK); // Left Bower when trump is hearts
      const offSuitCard = createCard('AC', CARD_SUITS.CARD_SUIT_CLUBS, ACE);
      
      const { gameState, playerHand } = setupTestScenario({
        trumpSuit,
        currentTrick: [{
          card: leftBower,
          player: 'west',
          index: 0
        }],
        playerCards: [leftBower, offSuitCard]
      });
      
      // Test 1: Should throw when trying to play off-suit when having the Left Bower
      assert.throws(
        () => validatePlay(gameState, playerHand, offSuitCard, playerRole),
        {
          name: 'MustFollowSuitError',
          code: 'E_MUST_FOLLOW_SUIT',
          ledSuit: trumpSuit,
          playedSuit: offSuitCard.suit
        },
        'Should require following trump suit when Left Bower is led'
      );
      
      // Test 2: Should allow playing the Left Bower (trump) when trump is led
      const result = validatePlay(gameState, playerHand, leftBower, playerRole);
      assert.strictEqual(
        result,
        true,
        'Should allow playing the Left Bower when trump is led'
      );
    });

    it('should treat the Left Bower as part of the trump suit when checking if player can follow', () => {
      // Reset game state for this test
      gameState = createBaseGameState(GAME_PHASES.PLAYING);
      gameState.trumpSuit = CARD_SUITS.CARD_SUIT_HEARTS; // Trump is hearts, so JD is Left Bower
      gameState.currentPlayer = playerRole;
      
      // Player has the Left Bower (JD) which is effectively hearts (trump)
      // and an off-suit card (AS)
      playerHand = [
        createCard('JD', CARD_SUITS.CARD_SUIT_DIAMONDS, JACK), // Left Bower (effective suit: Hearts)
        createCard('AS', CARD_SUITS.CARD_SUIT_SPADES, 'A'),    // Off-suit
      ];
      gameState.players[playerRole].hand = [...playerHand];
      
      // Trump (hearts) is led (King of Hearts)
      const trumpCard = createCard('KH', CARD_SUITS.CARD_SUIT_HEARTS, 'K');
      gameState.currentTrick = [{
        card: trumpCard,
        player: 'west',
        index: 0
      }];

      // Player must follow suit (hearts/trump) if they can
      // They have the Left Bower (JD) which is effectively hearts/trump
      // So they must play it instead of the off-suit AS
      
      // Should throw if trying to play off-suit when having a trump card (Left Bower)
      const offSuitCardToPlay = playerHand[1]; // The Ace of Spades
      
      assert.throws(
        () => validatePlay(gameState, playerHand, offSuitCardToPlay, playerRole),
        {
          name: 'MustFollowSuitError',
          code: 'E_MUST_FOLLOW_SUIT',
          ledSuit: gameState.trumpSuit,
          playedSuit: offSuitCardToPlay.suit
        },
        'Expected MustFollowSuitError when not following suit with a trump card in hand'
      );
      
      // Should allow playing the Left Bower (trump)
      assert.strictEqual(
        validatePlay(gameState, playerHand, playerHand[0], playerRole),
        true,
        'Should allow playing the Left Bower when trump is led'
      );
    });
  });

  describe('Error Handling', () => {
    describe('ValidationError', () => {
      it('should require all arguments', () => {
        const testCases = [
          {
            args: [null, playerHand, playerHand[0], playerRole],
            expected: {
              name: 'ValidationError',
              code: 'GENERIC_VALIDATION_ERROR'
            }
          },
          {
            args: [gameState, null, playerHand[0], playerRole],
            expected: {
              name: 'ValidationError',
              code: 'GENERIC_VALIDATION_ERROR'
            }
          },
          {
            args: [gameState, playerHand, null, playerRole],
            expected: {
              name: 'ValidationError',
              code: 'GENERIC_VALIDATION_ERROR'
            }
          },
          {
            args: [gameState, playerHand, playerHand[0], null],
            expected: {
              name: 'ValidationError',
              code: 'GENERIC_VALIDATION_ERROR'
            }
          }
        ];

        for (const { args, expected } of testCases) {
          assert.throws(
            () => validatePlay(...args),
            {
              ...expected
            },
            `Expected ValidationError for args: ${JSON.stringify(args)}`
          );
        }
      });
    });

    describe('InvalidPhaseError', () => {
      it('should be thrown when game is not in PLAYING phase', () => {
        const invalidPhases = Object.values(GAME_PHASES).filter(p => p !== GAME_PHASES.PLAYING);
        
        for (const phase of invalidPhases) {
          const { gameState } = setupTestScenario({ gamePhase: phase });
          
          assert.throws(
            () => validatePlay(gameState, playerHand, playerHand[0], playerRole),
            {
              name: 'InvalidPhaseError',
              code: 'E_INVALID_PHASE',
              action: 'play card',
              currentPhase: phase,
              expectedPhase: GAME_PHASES.PLAYING
            },
            `Expected InvalidPhaseError for phase: ${phase}`
          );
        }
      });
    });
  });
});
