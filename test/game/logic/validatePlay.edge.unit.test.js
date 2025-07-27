/**
 * @file test/game/logic/validatePlay.edge.unit.test.js
 * @module test/game/logic/validatePlay.edge.unit.test
 * @description
 *   Edge case tests for the Euchre game validation logic.
 *   this file tests src\game\logic\validation-core.js
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
      // Set up test constants
      const trumpSuit = CARD_SUITS.CARD_SUIT_HEARTS; // Hearts is trump
      const playerRole = 'north';
      
      console.log('=== Test Setup ===');
      console.log('Trump suit:', trumpSuit);
      
      // Create cards - no mock methods needed as we'll use the real implementations
      const leftBower = { 
        id: 'JD', 
        suit: CARD_SUITS.CARD_SUIT_DIAMONDS, // Jack of Diamonds
        value: 'J' // Must be 'J' for Jack, not JACK constant
      };
      
      console.log('Left bower card:', JSON.stringify(leftBower, null, 2));
      console.log('Is left bower?', isLeftBower(leftBower, trumpSuit));
      
      const offSuitCard = { 
        id: 'AC', 
        suit: CARD_SUITS.CARD_SUIT_CLUBS, // Ace of Clubs
        value: ACE
      };
      
      console.log('Off-suit card:', JSON.stringify(offSuitCard, null, 2));
      console.log('Is off-suit card left bower?', isLeftBower(offSuitCard, trumpSuit));
      
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
      
      console.log('\n=== Test 1: Playing off-suit when having the Left Bower ===');
      console.log('Player hand:', JSON.stringify(playerHand.map(c => c.id), null, 2));
      console.log('Current trick:', JSON.stringify(gameState.currentTrick, null, 2));
      
      // Test 1: Should throw when trying to play off-suit when having the Left Bower
      try {
        validatePlay(gameState, playerHand, offSuitCard, playerRole);
        assert.fail('Expected MustFollowSuitError but no error was thrown');
      } catch (error) {
        console.log('Error caught:', error.message);
        console.log('Error details:', {
          name: error.name,
          code: error.code,
          ledSuit: error.ledSuit,
          playedSuit: error.playedSuit
        });
        
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
      
      console.log('=== Test 2 Setup ===');
      console.log('Trump suit:', trumpSuit);
      
      // Create cards - no mock methods needed as we'll use the real implementations
      const leftBower = { 
        id: 'JD', 
        suit: CARD_SUITS.CARD_SUIT_DIAMONDS, // Jack of Diamonds (Left Bower when hearts is trump)
        value: 'J'
      };
      
      console.log('Left bower card:', JSON.stringify(leftBower, null, 2));
      console.log('Is left bower?', isLeftBower(leftBower, trumpSuit));
      
      const offSuitCard = { 
        id: 'AS', 
        suit: CARD_SUITS.CARD_SUIT_SPADES, // Ace of Spades (off-suit)
        value: 'A'
      };
      
      console.log('Off-suit card:', JSON.stringify(offSuitCard, null, 2));
      
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
      
      console.log('\n=== Test 2: Playing off-suit when having the Left Bower (trump) ===');
      console.log('Player hand:', playerHand.map(c => c.id));
      console.log('Current trick:', JSON.stringify(gameState.currentTrick, null, 2));
      
      // Test: Should throw when trying to play off-suit when having a trump card (Left Bower)
      try {
        validatePlay(gameState, playerHand, offSuitCard, playerRole);
        assert.fail('Expected MustFollowSuitError but no error was thrown');
      } catch (error) {
        console.log('Error caught:', error.message);
        console.log('Error details:', {
          name: error.name,
          code: error.code,
          ledSuit: error.ledSuit,
          playedSuit: error.playedSuit
        });
        
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
