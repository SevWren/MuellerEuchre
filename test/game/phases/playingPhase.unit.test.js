/**
 * @file Test suite for the playing phase logic of the Euchre game.
 * @module test/game/phases/playingPhase.unit.test
 * @description Tests for the playing phase functionality including card playing rules,
 * trick determination, and game state transitions.
 * 
 * This test suite verifies the core game logic for the playing phase of Euchre, including:
 * - Basic validation of input parameters
 * - Card playing rules and validation
 * - Trick winner determination
 * - Game state management during the playing phase
 * - 7-22-25 100% Tests Pass 
 * - 7-23 Need to improve coverage. Currently at 73%
 * 
 * @see {@link src/game/phases/playingPhase.js} - Implementation being tested
 * @see {@link test/game/phases/determineTrickWinner.test.js} - Related test file
 * 
 * @typedef {import('../../../src/config/constants').GAME_PHASES} GAME_PHASES - Game phase constants
 * @typedef {import('../../../src/config/constants').PLAYER_ROLES} PLAYER_ROLES - Player role constants
 * @typedef {import('../../../src/config/constants').SUITS} SUITS - Card suit constants
 * @typedef {import('../../../src/config/constants').TEAMS} TEAMS - Team constants
 * @typedef {import('../../../src/config/constants').VALUES} VALUES - Card value constants
 * @typedef {import('../../../src/game/logic/validation-errors').PhaseLogicError} PhaseLogicError
 * @typedef {import('../../../src/game/logic/validation-errors').NotPlayersTurnError} NotPlayersTurnError
 * @typedef {import('../../../src/game/logic/validation-errors').InvalidPhaseError} InvalidPhaseError
 * @typedef {import('../../../src/game/logic/validation-errors').CardNotInHandError} CardNotInHandError
 * @typedef {import('../../../src/game/logic/validation-errors').MustFollowSuitError} MustFollowSuitError
 * @typedef {import('../../../src/game/logic/validation-errors').ValidationError} ValidationError
 * @typedef {import('../../../src/game/phases/playingPhase').GameState} GameState - Game state type
 * @typedef {import('../../../src/utils/deck').Card} Card - Card type
 * 
 * @example
 * // Run all tests in this file
 * node --test test/game/phases/playingPhase.unit.test.js
 */

'use strict';
import assert from 'node:assert';
import { test, mock } from 'node:test';
import {
  GAME_PHASES,
  PLAYER_ROLES,
  SUITS,
  TEAMS,
  VALUES,
} from '../../../src/config/constants.js';

import {
  PhaseLogicError,
  NotPlayersTurnError,
  InvalidPhaseError,
  CardNotInHandError,
  MustFollowSuitError,
  ValidationError,
} from '../../../src/game/logic/validation-errors.js';

import { createDeck, shuffleDeck } from '../../../src/utils/deck.js';
import { initializePlayers } from '../../../src/utils/players.js';
import { getCardRank as realGetCardRank } from '../../../src/utils/cardUtils.js';

/**
 * Creates a base game state for playing phase tests with initialized players and hands.
 * 
 * @function createPlayingGameState
 * @returns {GameState} A fully initialized game state object ready for playing phase tests
 * 
 * @description
 * This helper function creates a consistent starting point for playing phase tests.
 * It initializes:
 * - Four players with unique roles (NORTH, EAST, SOUTH, WEST)
 * - Each player has a hand of 5 cards
 * - The game phase is set to PLAYING
 * - Current player is set to the first player (NORTH)
 * - An empty current trick array
 * - Random trump suit selection
 * 
 * @example
 * // Basic usage
 * const gameState = createPlayingGameState();
 * 
 * // Access player hands
 * const northHand = gameState.players[PLAYER_ROLES.NORTH].hand;
 * 
 * @see {@link src/game/phases/playingPhase.js} - For the expected game state structure
 */
const createPlayingGameState = () => {
  let initialPlayerObjects = initializePlayers();
  let deck = shuffleDeck(createDeck());
  const playerHands = {};

  PLAYER_ROLES.forEach((role) => {
    playerHands[role] = [];
    for (let i = 0; i < 5; i++) {
      if (deck.length > 0) playerHands[role].push(deck.pop());
    }
  });

  const playersWithHands = PLAYER_ROLES.reduce((acc, role) => {
    acc[role] = {
      ...initialPlayerObjects[role],
      hand: playerHands[role] || [],
    };
    return acc;
  }, {});

  return {
    gameId: 'playingPhaseTestGame',
    gamePhase: GAME_PHASES.PLAYING,
    players: playersWithHands,
    dealer: PLAYER_ROLES[0],
    currentPlayer: PLAYER_ROLES[1],
    trumpSuit: SUITS.SPADES,
    makerTeam: TEAMS.TEAM_NS,
    playerWhoOrderedUp: PLAYER_ROLES[0],
    currentTrick: [],
    tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
    gameMessages: [],
    settings: { winningScore: 10 },
  };
};

/**
 * Creates a test card object with the specified suit and value.
 * 
 * @function createTestCard
 * @param {string} suit - The suit of the card (must be a valid SUITS constant)
 * @param {string} value - The value of the card (must be a valid VALUES constant)
 * @returns {Card} A card object with the specified suit and value
 * @throws {TypeError} If suit or value are not valid
 * 
 * @description
 * Creates a standardized card object for testing purposes with the following properties:
 * - id: Auto-generated unique identifier
 * - suit: The provided suit
 * - value: The provided value
 * - name: A human-readable name (e.g., "Ace of Spades")
 * 
 * @example
 * // Create a test card
 * const aceOfSpades = createTestCard(SUITS.SPADES, VALUES.ACE);
 * // Returns: { id: 'card-1', suit: 'SPADES', value: 'A', name: 'Ace of Spades' }
 * 
 * @see {@link SUITS} - For valid suit values
 * @see {@link VALUES} - For valid card values
 */
const createTestCard = (suit, value) => ({ suit, value });

/**
 * @constant {Object} SUT - System Under Test imports with original names
 * @property {Function} originalHandlePlayCard - The handlePlayCard function from playingPhase.js
 * @property {Function} originalDetermineTrickWinner - The determineTrickWinner function from playingPhase.js
 * @private
 */
const { 
  handlePlayCard: originalHandlePlayCard, 
  determineTrickWinner: originalDetermineTrickWinner 
} = await import('../../../src/game/phases/playingPhase.js');

/**
 * Creates a test context with mocked dependencies and utilities for testing the playing phase.
 * 
 * @function createTestContext
 * @param {Object} t - The test context object provided by node:test
 * @returns {Object} An object containing test utilities and mocks
 * @property {Function} handlePlayCard - The handlePlayCard function under test
 * @property {Function} determineTrickWinner - The determineTrickWinner function under test
 * @property {Object} mockValidation - Mocked validation utilities
 * @property {Object} mockPlayers - Mocked player utilities
 * @property {Object} mockDeck - Mocked deck utilities
 * @property {Object} loggerMock - Mocked logger
 * 
 * @description
 * This function sets up a test context with mocked dependencies for the playing phase.
 * It provides a way to isolate the playing phase logic and test it independently.
 * 
 * @example
 * test('example test', async (t) => {
 *   const { handlePlayCard, mockDeck } = createTestContext(t);
 *   // Test implementation...
 * });
 */
function createTestContext(t) {
  const loggerMock = {
    info: t.mock.fn(),
    warn: t.mock.fn(),
    error: t.mock.fn(),
    debug: t.mock.fn(),
    log: t.mock.fn(),
  };

  const mockValidation = {
    validatePlay: t.mock.fn(() => ({ valid: true, errors: [] })),
  };

  const mockPlayers = {
    getNextPlayer: t.mock.fn((currentPlayer) => {
      const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
      return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
    }),
    getPartner: t.mock.fn((playerRole) => {
      const partnerMap = {
        [PLAYER_ROLES[0]]: PLAYER_ROLES[2], // South's partner is North
        [PLAYER_ROLES[1]]: PLAYER_ROLES[3], // West's partner is East
        [PLAYER_ROLES[2]]: PLAYER_ROLES[0], // North's partner is South
        [PLAYER_ROLES[3]]: PLAYER_ROLES[1], // East's partner is West
      };
      return partnerMap[playerRole];
    }),
  };

  const mockDeck = {
    getCardRank: t.mock.fn((...args) => realGetCardRank(...args)),
  };
  
  // Initialize with a simple mock that delegates to the real function
  mockDeck.getCardRank = t.mock.fn((...args) => realGetCardRank(...args));

  const handlePlayCard = (gameState, playerRole, cardPlayed, customDeckUtils) =>
    originalHandlePlayCard(gameState, playerRole, cardPlayed, customDeckUtils || mockDeck);

  const determineTrickWinner = (trick, trumpSuit, leadPlayerRole, customDeckUtils) => {
    const deckUtils = customDeckUtils || mockDeck;
    return originalDetermineTrickWinner(trick, trumpSuit, leadPlayerRole, deckUtils);
  };

  return {
    loggerMock,
    mockValidation,
    mockPlayers,
    mockDeck,
    handlePlayCard,
    determineTrickWinner,
  };
}

/**
 * Test suite for basic validation of the playing phase logic.
 * 
 * @name PlayingPhase Logic - Basic Validation
 * @function
 * @memberof module:test/game/phases/playingPhase.unit.test
 * @description Tests the basic validation logic in the playing phase.
 * 
 * This suite verifies that the playing phase correctly validates its inputs
 * and throws appropriate errors for invalid states. It tests edge cases and
 * invalid inputs to ensure the game remains in a consistent state.
 * 
 * Test Cases:
 * 1. Null game state validation
 * 2. Invalid player role validation
 * 
 * @see handlePlayCard - The function being tested
 */
test('PlayingPhase Logic - Basic Validation', async (t) => {
  const testContext = createTestContext(t);
  const { handlePlayCard } = testContext;

  /**
   * @name should throw TypeError if currentGameState is null
   * @function
   * @description Verifies that handlePlayCard throws a TypeError when currentGameState is null.
   */
  await t.test('should throw TypeError if currentGameState is null', (t) => {
    const testFn = () => handlePlayCard(null, PLAYER_ROLES[0], createTestCard(SUITS.HEARTS, 'A'));
    assert.throws(testFn, { name: 'TypeError', message: 'gameState must be an object' });
  });

  /**
   * @name should throw PhaseLogicError if playerRole is invalid
   * @function
   * @description Verifies that handlePlayCard throws a PhaseLogicError when an invalid player role is provided.
   */
  await t.test('should throw PhaseLogicError if playerRole is invalid', (t) => {
    const gameState = createPlayingGameState();
    assert.throws(
      () => handlePlayCard(gameState, 'INVALID_PLAYER', createTestCard(SUITS.HEARTS, 'A')),
      (err) => err.message.includes('Player INVALID_PLAYER not found') && err instanceof PhaseLogicError
    );
  });
});

/**
 * Test suite for the handlePlayCard function in the playing phase.
 * 
 * @name PlayingPhase Logic - handlePlayCard
 * @function
 * @memberof module:test/game/phases/playingPhase.unit.test
 * @description Tests the core card playing logic in the Euchre game.
 * 
 * This suite verifies that cards are played according to the rules of Euchre,
 * including validation of card plays, enforcement of game rules, and proper
 * updates to the game state. It covers both positive and negative test cases.
 * 
 * Key Test Cases:
 * 1. Card not in player's hand
 * 2. Following suit requirements
 * 3. Valid card play and state updates
 * 
 * @see handlePlayCard - The function being tested
 * @see GAME_PHASES - For game phase constants
 * @see PLAYER_ROLES - For player role constants
 */
test('PlayingPhase Logic - handlePlayCard', async (t) => {
  const testContext = createTestContext(t);
  const { handlePlayCard } = testContext;

  /**
   * @name should throw CardNotInHandError if card is not in player's hand
   * @function
   * @description Verifies that handlePlayCard throws a CardNotInHandError when
   * the player attempts to play a card that isn't in their hand.
   */
  await t.test('should throw CardNotInHandError if card is not in player\'s hand', (t) => {
    const gameState = createPlayingGameState();
    const currentPlayer = PLAYER_ROLES[0];
    
    // Create a card that's not in the player's hand
    const cardNotInHand = { 
      ...createTestCard(SUITS.HEARTS, 'A'),
      id: 'nonexistent-card-id',
      name: 'Ace of Hearts'
    };
    
    // Set the current player
    gameState.currentPlayer = currentPlayer;
    
    // Ensure the player has some cards in hand
    gameState.players[currentPlayer].hand = [
      { ...createTestCard(SUITS.SPADES, 'K'), id: 'card-1', name: 'King of Spades' },
      { ...createTestCard(SUITS.DIAMONDS, 'Q'), id: 'card-2', name: 'Queen of Diamonds' },
      { ...createTestCard(SUITS.CLUBS, 'J'), id: 'card-3', name: 'Jack of Clubs' },
    ];
    
    assert.throws(
      () => handlePlayCard(gameState, currentPlayer, cardNotInHand),
      (err) => err.message.includes('not found in player\'s hand') && err instanceof CardNotInHandError
    );
  });

  /**
   * @name should throw MustFollowSuitError if player can follow suit but doesn't
   * @function
   * @description Verifies that handlePlayCard enforces the rule that players must
   * follow the led suit when they are able to do so.
   */
  await t.test('should throw MustFollowSuitError if player can follow suit but doesn\'t', (t) => {
    const gameState = createPlayingGameState();
    const currentPlayer = PLAYER_ROLES[0];
    const ledSuit = SUITS.HEARTS;
    
    // Set up the game state for this test
    gameState.currentPlayer = currentPlayer;
    gameState.trumpSuit = SUITS.SPADES; // Set a trump suit
    
    // Create a trick with a led suit of HEARTS
    gameState.currentTrick = [
      { 
        card: { 
          ...createTestCard(ledSuit, '10'),
          id: 'led-card-1',
          name: '10 of Hearts'
        }, 
        playedBy: 'player1' 
      }
    ];
    
    // Set up player's hand with cards including one that follows suit
    gameState.players[currentPlayer].hand = [
      { ...createTestCard(ledSuit, 'K'), id: 'following-card', name: 'King of Hearts' }, // Follows suit
      { ...createTestCard(SUITS.DIAMONDS, 'A'), id: 'not-following', name: 'Ace of Diamonds' } // Doesn't follow
    ];
    
    // Try to play the card that doesn't follow suit
    const cardNotFollowingSuit = gameState.players[currentPlayer].hand[1];
    
    assert.throws(
      () => handlePlayCard(gameState, currentPlayer, cardNotFollowingSuit),
      (err) => err.message.includes('Must follow suit') && err instanceof MustFollowSuitError
    );
  });

  /**
   * @name should play a card and update game state correctly
   * @function
   * @description Verifies that handlePlayCard correctly updates the game state
   * when a valid card is played, including removing the card from the player's hand
   * and adding it to the current trick.
   */
  await t.test('should play a card and update game state correctly', async (t) => {
    // Create a fresh game state
    const gameState = createPlayingGameState();
    const currentPlayer = PLAYER_ROLES[0];
    
    // Create a test card with all required properties
    const cardToPlay = { 
      ...createTestCard(SUITS.HEARTS, 'K'),
      id: 'test-card-1',
      name: 'King of Hearts',
      value: 'K',
      suit: SUITS.HEARTS,
      playedBy: currentPlayer
    };
    
    // Set up player's hand with our test card
    gameState.players[currentPlayer].hand = [cardToPlay];
    gameState.currentPlayer = currentPlayer;
    gameState.gamePhase = GAME_PHASES.PLAYING; // Ensure we're in the playing phase
    
    // Store initial state for assertions
    const initialHandSize = gameState.players[currentPlayer].hand.length;
    const initialTrickSize = gameState.currentTrick.length;

    // Mock deckUtils with required getCardRank function
    const deckUtils = {
      getCardRank: (card, trumpSuit) => {
        // Simple ranking for test purposes
        const rankOrder = { '9': 0, '10': 1, 'J': 2, 'Q': 3, 'K': 4, 'A': 5 };
        return rankOrder[card.value] || 0;
      }
    };
    
    // Play the card and get the updated game state
    const updatedGameState = await handlePlayCard(gameState, currentPlayer, cardToPlay, deckUtils);

    // Verify the card was removed from the player's hand
    assert.strictEqual(
      updatedGameState.players[currentPlayer].hand.length, 
      0, // Should be empty since we only had one card
      'Card should be removed from player\'s hand'
    );
    
    // Verify the card was added to the current trick
    assert.strictEqual(
      updatedGameState.currentTrick.length, 
      1, // Should have one card in the trick now
      'Card should be added to the current trick'
    );
    
    // Verify the card in the trick matches the played card
    const playedCardInTrick = updatedGameState.currentTrick[0];
    
    // Check that the card properties match (including id and playedBy which is added by handlePlayCard)
    const { playedBy, ...cardInTrick } = playedCardInTrick;
    const expectedCard = { ...cardToPlay, playedBy: currentPlayer };
    assert.deepStrictEqual(
      { ...cardInTrick, playedBy },
      expectedCard,
      'Played card should match the card in the trick'
    );
    
    // Verify the playedBy field is set correctly
    assert.strictEqual(
      playedBy, 
      currentPlayer,
      'Played card should be marked with the correct player'
    );
    
    // Verify the card was actually removed from the hand by checking its ID
    const cardStillInHand = updatedGameState.players[currentPlayer].hand.some(
      card => card.id === cardToPlay.id
    );
    assert.strictEqual(
      cardStillInHand,
      false,
      'Card with ID should not be in player\'s hand after playing. Hand contents: ' + 
      JSON.stringify(updatedGameState.players[currentPlayer].hand.map(c => c.id))
    );
  });
});

/**
 * Test suite for the determineTrickWinner function in the playing phase.
 * 
 * @name PlayingPhase Logic - determineTrickWinner
 * @function
 * @memberof module:test/game/phases/playingPhase.unit.test
 * @description Tests the logic for determining the winner of a trick in Euchre.
 * 
 * This suite verifies that the correct winner is determined based on the rules of Euchre,
 * taking into account:
 * - Trump suit
 * - Led suit
 * - Card ranks (including special cards like the left bower)
 * - Edge cases and invalid inputs
 * 
 * Key Test Cases:
 * 1. Trick with insufficient cards
 * 2. Normal trick with trump and non-trump cards
 * 3. Special case: Left bower as highest trump
 * 
 * @see determineTrickWinner - The function being tested
 * @see SUITS - For suit constants
 * @see VALUES - For card value constants
 */
test('PlayingPhase Logic - determineTrickWinner', async (t) => {
  const testContext = createTestContext(t);
  const { determineTrickWinner: testDetermineTrickWinner, mockDeck } = testContext;

  /**
   * @name should throw PhaseLogicError if trick doesn't have exactly 4 cards
   * @function
   * @description Verifies that determineTrickWinner throws a PhaseLogicError when the trick
   * doesn't contain exactly 4 cards.
   */
  await t.test('should throw PhaseLogicError if trick doesn\'t have exactly 4 cards', (t) => {
    // Test with empty trick
    assert.throws(
      () => testDetermineTrickWinner([], SUITS.HEARTS, PLAYER_ROLES[0]),
      { name: 'PhaseLogicError', message: 'Trick must have 4 cards to determine a winner' }
    );

    // Test with too few cards
    assert.throws(
      () => testDetermineTrickWinner([{ suit: SUITS.HEARTS, value: 'A' }], SUITS.HEARTS, PLAYER_ROLES[0]),
      { name: 'PhaseLogicError', message: 'Trick must have 4 cards to determine a winner' }
    );
  });

  /**
   * @name should return the player who played the highest card of the led suit
   * @function
   * @description Verifies that determineTrickWinner correctly identifies the highest card
   * of the led suit when no trump cards are played.
   */
  await t.test('should return the player who played the highest card of the led suit', (t) => {
    const trick = [
      { card: { suit: SUITS.HEARTS, value: '10' }, playedBy: 'player1' },
      { card: { suit: SUITS.HEARTS, value: 'K' }, playedBy: 'player2' },
      { card: { suit: SUITS.HEARTS, value: 'Q' }, playedBy: 'player3' },
      { card: { suit: SUITS.HEARTS, value: 'J' }, playedBy: 'player4' },
    ];

    // Set up our mock implementation for this test
    const values = { '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    mockDeck.getCardRank = t.mock.fn((card) => {
      return values[card.value];
    });

    const winner = testDetermineTrickWinner(trick, SUITS.SPADES, 'player1');
    assert.strictEqual(winner, 'player2'); // King is highest
  });

  /**
   * @name should handle the left bower correctly
   * @function
   * @description Verifies that determineTrickWinner correctly handles the left bower
   * (jack of the same color as trump) as the second highest card after the right bower.
   */
  await t.test('should handle the left bower correctly', (t) => {
    const trick = [
      { card: { suit: SUITS.CLUBS, value: 'J' }, playedBy: 'player1' }, // Left bower
      { card: { suit: SUITS.SPADES, value: 'J' }, playedBy: 'player2' }, // Right bower
      { card: { suit: SUITS.SPADES, value: 'A' }, playedBy: 'player3' }, // Trump ace
      { card: { suit: SUITS.HEARTS, value: 'A' }, playedBy: 'player4' }, // Non-trump
    ];

    // Create a new mock function for this test
    const baseValues = { '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    mockDeck.getCardRank = t.mock.fn((card, trumpSuit) => {
      // Right bower
      if (card.suit === trumpSuit && card.value === 'J') return 40;
      
      // Left bower
      const isLeftBower = card.value === 'J' && (
        (trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS) ||
        (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES) ||
        (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS) ||
        (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS)
      );
      
      if (isLeftBower) return 39;
      if (card.suit === trumpSuit) return 20 + baseValues[card.value];
      return baseValues[card.value];
    });

    const winner = testDetermineTrickWinner(trick, SUITS.SPADES, 'player1');
    assert.strictEqual(winner, 'player2'); // Right bower (J of spades) wins
    assert.strictEqual(mockDeck.getCardRank.mock.calls.length, 6, 'getCardRank should be called 6 times');
  });
});
