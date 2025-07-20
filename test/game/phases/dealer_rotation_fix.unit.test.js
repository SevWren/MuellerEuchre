/**
 * @file test/game/phases/dealer_rotation_fix.unit.test.js
 * @module test/game/phases/dealer_rotation_fix
 * @description
 *   Unit tests for the `startNewHand` function in the `startNewHandPhase.js` module.
 *   Validates the dealer rotation logic in Euchre.
 *
 * @see {@link module:src/game/phases/startNewHandPhase}
 * @see {@link module:test/helpers/test-helpers}
 * @see {@link module:test/game/phases/__mocks__/startNewHandPhase}
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Project imports
import { GAME_PHASES, PLAYER_ROLES } from '../../../src/config/constants.js';
import { createBaseGameState } from '../../helpers/test-helpers.js';

// Import our testable implementation with dependency injection
import { createStartNewHand } from './__mocks__/startNewHandPhase.js';

/**
 * Creates a full deck of 24 Euchre cards (9, 10, J, Q, K, A of each suit).
 * This is a mock implementation for testing purposes.
 * @returns {Array<object>} A new array representing a standard Euchre deck.
 * @see {@link module:.windsurf/rules/jsdoc.md#1-basic-function-documentation-param-returns}
 */
const createMockDeck = () => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['9', '10', 'J', 'Q', 'K', 'A'];
  const deck = [];
  
  suits.forEach(suit => {
    values.forEach(value => {
      deck.push({ suit, value, id: `${value}_${suit}` });
    });
  });
  
  return deck;
};

// Create a fresh mock deck for each test
let mockDeck;

// Track mock calls
const mockCalls = {
  createDeck: 0,
  shuffleDeck: 0,
  getNextPlayer: 0
};

/**
 * @typedef {object} TestDependencies
 * @property {function(): Array<object>} createDeck - Mock function for creating a deck.
 * @property {function(Array<object>): Array<object>} shuffleDeck - Mock function for shuffling a deck.
 * @property {function(string, Array<string>|Array<object>): string} getNextPlayer - Mock function for getting the next player in rotation.
 */

/**
 * Test doubles for dependencies used in `startNewHandPhase.js`.
 * These functions are injected into the `createStartNewHand` factory.
 * @type {TestDependencies}
 * @see {@link module:.windsurf/rules/jsdoc.md#3-documenting-dependency-injection-for-tests}
 */
const testDependencies = {
  /**
   * Mock implementation of `createDeck`. Increments `mockCalls.createDeck` and returns a copy of `mockDeck`.
   * @returns {Array<object>} A copy of the current mock deck.
   */
  createDeck: () => {
    mockCalls.createDeck++;
    return [...mockDeck];
  },
  /**
   * Mock implementation of `shuffleDeck`. Increments `mockCalls.shuffleDeck` and returns a shallow copy of the input deck.
   * @param {Array<object>} deck - The deck to "shuffle".
   * @returns {Array<object>} A new array representing the "shuffled" deck.
   */
  shuffleDeck: (deck) => {
    mockCalls.shuffleDeck++;
    return [...deck]; // Return a new array to simulate shuffling
  },
  /**
   * Mock implementation of `getNextPlayer`. Increments `mockCalls.getNextPlayer` and determines the next player in a circular rotation.
   * Handles both arrays of player role strings and arrays of player objects.
   * @param {string} currentPlayer - The role string of the current player.
   * @param {Array<string>|Array<object>} players - An array of player role strings or player objects.
   * @returns {string} The role string of the next player.
   */
  getNextPlayer: (currentPlayer, players) => {
    mockCalls.getNextPlayer++;
    // Make sure players is an array of role strings
    if (Array.isArray(players) && players.length > 0 && typeof players[0] === 'object') {
      // If players is an array of player objects, get their roles
      const playerRoles = players.map(p => p.role || p);
      const currentIndex = playerRoles.indexOf(currentPlayer);
      if (currentIndex === -1) return playerRoles[0]; // Default to first player if not found
      return playerRoles[(currentIndex + 1) % playerRoles.length];
    } else {
      // Handle case where players is an array of role strings
      const currentIndex = players.indexOf(currentPlayer);
      if (currentIndex === -1) return players[0]; // Default to first player if not found
      return players[(currentIndex + 1) % players.length];
    }
  }
};

/**
 * Test suite for dealer rotation logic in Euchre.
 * @see {@link module:.windsurf/rules/jsdoc.md#1-basic-function-documentation-param-returns}
 */
describe("Dealer Rotation", () => {
  let startNewHand;
  
  /**
   * Resets mock call counters and creates a fresh mock deck and `startNewHand` instance before each test.
   */
  beforeEach(() => {
    // Reset mock call counters before each test
    Object.keys(mockCalls).forEach(key => { mockCalls[key] = 0; });
    
    // Create a fresh mock deck for each test
    mockDeck = createMockDeck();
    
    // Create a fresh instance with test doubles
    startNewHand = createStartNewHand(testDependencies);
  });

  it("should rotate dealer to next player after each hand", () => {
    // Test each player as the current dealer
    for (let i = 0; i < PLAYER_ROLES.length; i++) {
      // Arrange
      const currentDealer = PLAYER_ROLES[i];
      const nextDealerIndex = (i + 1) % PLAYER_ROLES.length;
      const expectedNextDealer = PLAYER_ROLES[nextDealerIndex];
      // First bidder is the player after the new dealer
      const expectedFirstBidder = PLAYER_ROLES[(nextDealerIndex + 1) % PLAYER_ROLES.length];
      
      // Create a game state in the SCORING phase with the current dealer
      const gameState = createBaseGameState(GAME_PHASES.SCORING, currentDealer);
      gameState.gamePhase = GAME_PHASES.SCORING;
      gameState.dealer = currentDealer; // Explicitly set the dealer

      // Act
      const result = startNewHand(gameState);
      
      // Assert - Verify dealer rotation
      assert.strictEqual(
        result.dealer,
        expectedNextDealer,
        `Dealer rotation failed. Current: ${currentDealer}, Expected next: ${expectedNextDealer}, Actual next: ${result.dealer}`
      );

      // Verify first bidder (player after new dealer)
      assert.strictEqual(
        result.currentPlayer,
        expectedFirstBidder,
        `First bidder mismatch. Expected: ${expectedFirstBidder}, Actual: ${result.currentPlayer}`
      );
      assert.strictEqual(
        result.orderUpTurn,
        expectedFirstBidder,
        `Order up turn should be first bidder. Expected: ${expectedFirstBidder}, Actual: ${result.orderUpTurn}`
      );
      
      // Assert - Verify game phase transition
      assert.strictEqual(
        result.gamePhase,
        GAME_PHASES.ORDER_UP_ROUND1,
        `Game phase mismatch. Expected: ${GAME_PHASES.ORDER_UP_ROUND1}, Actual: ${result.gamePhase}`
      );
      
      // Verify mock calls
      assert.strictEqual(
        mockCalls.createDeck,
        i + 1,
        'createDeck should be called once per test iteration'
      );
      assert.strictEqual(
        mockCalls.shuffleDeck,
        i + 1,
        'shuffleDeck should be called once per test iteration'
      );
      assert.ok(
        mockCalls.getNextPlayer >= 2, // At least 2 calls: dealer rotation + first bidder
        'getNextPlayer should be called at least twice per test iteration'
      );
    }
  });
  
  it('should throw an error when starting from an invalid phase', () => {
    // Arrange
    const invalidPhase = GAME_PHASES.ORDER_UP_ROUND1; // Invalid phase for starting a new hand
    const gameState = createBaseGameState(invalidPhase, PLAYER_ROLES[0]);
    gameState.gamePhase = invalidPhase;
    
    // Act & Assert
    assert.throws(
      () => startNewHand(gameState),
      {
        name: 'Error',
        message: /Cannot start a new hand from phase/
      },
      'Should throw when starting from invalid phase'
    );
  });
  
  it('should properly handle the kitty and player hands', () => {
    // Arrange
    const gameState = createBaseGameState(GAME_PHASES.SCORING, PLAYER_ROLES[0]);
    gameState.gamePhase = GAME_PHASES.SCORING;
    
    // Act
    const result = startNewHand(gameState);
    
    // Assert - Verify kitty has 3 cards
    assert.strictEqual(
      result.kitty.length,
      3,
      'Kitty should have 3 cards'
    );
    
    // Assert - Verify each player has 5 cards
    const playerHands = Object.values(result.players).map(p => p.hand);
    
    // Check each player's hand
    playerHands.forEach((hand, index) => {
      assert.strictEqual(
        hand.length,
        5,
        `Player ${Object.keys(result.players)[index]} should have 5 cards, got ${hand.length}`
      );
      
      // Verify all cards are unique (no duplicates)
      const cardIds = hand.map(card => card.id);
      const uniqueCardIds = new Set(cardIds);
      assert.strictEqual(
        uniqueCardIds.size,
        cardIds.length,
        `Player ${Object.keys(result.players)[index]} has duplicate cards`
      );
    });
    
    // Verify all cards are accounted for (no duplicates across hands and kitty)
    const allCardIds = [
      ...playerHands.flatMap(hand => hand.map(card => card.id)),
      ...result.kitty.map(card => card.id)
    ];
    const allUniqueCardIds = new Set(allCardIds);
    assert.strictEqual(
      allUniqueCardIds.size,
      allCardIds.length,
      'There are duplicate cards across hands and kitty'
    );
  });
});
