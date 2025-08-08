/**
 * @file test/game/logic/validatePlay.edge.unit.test.js
 * @module test/game/logic/validatePlay.edge.unit.test
 * @description
 *   Edge case tests for the Euchre game validation logic.
 *   This file specifically tests the `validatePlay` function from 
 *   `src/game/logic/validation-core.js`, focusing on edge cases and error conditions
 *   that might not be covered in the main test suite.
 *
 * ## Test Categories
 * - Left Bower Behavior: Tests special handling of the Left Bower card
 * - Leading Card Scenarios: Tests validation when a player leads a trick
 * - Error Handling: Tests various error conditions and validations
 * - Edge Cases: Tests boundary conditions and unusual scenarios
 *
 * ## Key Tested Functionality
 * - Correct identification of the Left Bower's effective suit
 * - Proper validation of card plays when leading a trick
 * - Comprehensive error handling for invalid game states and inputs
 * - Validation of the "follow suit" rule with special card combinations
 *
 * @see {@link module:src/game/logic/validation-core} For the implementation being tested
 * @see {@link module:src/utils/cardUtils} For card utility functions
 * @see {@link module:src/config/constants} For game constants and enums
 * @see {@link module:src/game/logic/validation-errors} For custom error types
 * @see {@link .windsurf/rules/jsdoc.md} For JSDoc standards
 * @see {@link .windsurf/rules/jsdoc-see.md} For @see tag guidelines
 *
 * @example
 * // Example test case structure
 * describe('Left Bower Behavior', () => {
 *   it('should identify the led suit as trump when the Left Bower is led', () => {
 *     // Test implementation
 *   });
 * });
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
import { isLeftBower } from '../../../src/utils/cardUtils.js';

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
  
  /**
   * Sets up a test scenario with a customizable game state and player hand.
   * This helper function creates an immutable game state object for each test,
   * ensuring test isolation and predictable results.
   * @param {object} options - Configuration options for the test scenario.
   * @param {string} [options.trumpSuit=CARD_SUITS.CARD_SUIT_SPADES] - The trump suit for the scenario.
   * @param {string} [options.gamePhase=GAME_PHASES.PLAYING] - The current game phase.
   * @param {Array<Object>} [options.currentTrick=[]] - An array of cards already played in the current trick.
   * @param {Array<Object>} [options.playerCards=[]] - An array of card objects for the current player's hand.
   * @returns {{gameState: object, playerHand: Array<Object>}} An object containing the configured game state and player hand.
   */
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
      // Set up test constants
      const trumpSuit = CARD_SUITS.CARD_SUIT_HEARTS; // Hearts is trump
      const playerRole = 'north';
      
      // Create cards - no mock methods needed as we'll use the real implementations
      const leftBower = { 
        id: 'JD', 
        suit: CARD_SUITS.CARD_SUIT_DIAMONDS, // Jack of Diamonds
        value: 'J' // Must be 'J' for Jack, not JACK constant
      };
      
      const offSuitCard = { 
        id: 'AC', 
        suit: CARD_SUITS.CARD_SUIT_CLUBS, // Ace of Clubs
        value: ACE
      };
      
      // Create player hand with both cards
      const playerHand = [leftBower, offSuitCard];
      
      // Set up the game state with the left bower as the led card
      const gameState = {
        gamePhase: GAME_PHASES.PLAYING,
        currentPlayer: playerRole,
        currentTrick: [{
          card: leftBower,
          player: 'west',
          index: 0
        }],
        trumpSuit: trumpSuit,
        players: {
          [playerRole]: { hand: playerHand },
          'west': { hand: [leftBower] },
          'north': { hand: [] },
          'east': { hand: [] }
        }
      };
      
      // Test 1: Should throw when trying to play off-suit when having the Left Bower
      try {
        validatePlay(gameState, playerHand, offSuitCard, playerRole);
        assert.fail('Expected MustFollowSuitError but no error was thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'MustFollowSuitError', 'Error should be MustFollowSuitError');
        assert.strictEqual(error.code, 'E_MUST_FOLLOW_SUIT', 'Error code should be E_MUST_FOLLOW_SUIT');
        assert.strictEqual(error.ledSuit, trumpSuit, 'Led suit in error should be trump suit');
        assert.strictEqual(error.playedSuit, offSuitCard.suit, 'Played suit in error should match off-suit card');
      }
      
      // Test 2: Should allow playing the Left Bower (trump) when trump is led
      const result = validatePlay(gameState, playerHand, leftBower, playerRole);
      assert.strictEqual(
        result,
        true,
        'Should allow playing the Left Bower when trump is led'
      );
    });

    it('should treat the Left Bower as part of the trump suit when checking if player can follow', () => {
      // Set up test constants
      const trumpSuit = CARD_SUITS.CARD_SUIT_HEARTS; // Trump is hearts, so JD is Left Bower
      const playerRole = 'north';
      
      // Create cards - no mock methods needed as we'll use the real implementations
      const leftBower = { 
        id: 'JD', 
        suit: CARD_SUITS.CARD_SUIT_DIAMONDS, // Jack of Diamonds (Left Bower when hearts is trump)
        value: 'J'
      };
      
      const offSuitCard = { 
        id: 'AS', 
        suit: CARD_SUITS.CARD_SUIT_SPADES, // Ace of Spades (off-suit)
        value: 'A'
      };
      
      // Create player hand with both cards
      const playerHand = [leftBower, offSuitCard];
      
      // Set up the game state with a trump card led (King of Hearts)
      const gameState = {
        gamePhase: GAME_PHASES.PLAYING,
        currentPlayer: playerRole,
        currentTrick: [{
          card: { 
            id: 'KH', 
            suit: CARD_SUITS.CARD_SUIT_HEARTS, // King of Hearts (trump)
            value: 'K' 
          },
          player: 'west',
          index: 0
        }],
        trumpSuit: trumpSuit,
        players: {
          [playerRole]: { hand: playerHand },
          'west': { hand: [] },
          'east': { hand: [] },
          'south': { hand: [] }
        }
      };
      
      // Test: Should throw when trying to play off-suit when having a trump card (Left Bower)
      try {
        validatePlay(gameState, playerHand, offSuitCard, playerRole);
        assert.fail('Expected MustFollowSuitError but no error was thrown');
      } catch (error) {
        assert.strictEqual(error.name, 'MustFollowSuitError', 'Error should be MustFollowSuitError');
        assert.strictEqual(error.code, 'E_MUST_FOLLOW_SUIT', 'Error code should be E_MUST_FOLLOW_SUIT');
        assert.strictEqual(error.ledSuit, trumpSuit, 'Led suit in error should be trump suit');
        assert.strictEqual(error.playedSuit, offSuitCard.suit, 'Played suit in error should match off-suit card');
      }
      
      // Test: Should allow playing the Left Bower (trump) when trump is led
      const result = validatePlay(gameState, playerHand, leftBower, playerRole);
      assert.strictEqual(
        result,
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
