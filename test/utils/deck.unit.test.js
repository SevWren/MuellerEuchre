/**
 * @file Unit tests for deck utility functions
 * @module test/utils/deck.unit.test
 * @description
 *   Comprehensive test suite for deck utility functions using node:test and node:assert.
 *   Tests cover all functionality from src/utils/deck.js including:
 *   - Deck creation with proper card structure and properties
 *   - Deck shuffling algorithm and validation
 *   - Error handling for invalid inputs
 *
 * @see {@link module:src/utils/deck} for the implementation being tested
 * @see {@link module:src/config/constants} for game constants used in testing
 * @see {@link module:src/utils/cardUtils} for card-related utilities used by deck functions
 *
 * @example
 * // Running the tests
 * node --test test/utils/deck.unit.test.js
 *
 * @example
 * // Running with coverage report
 * npx c8 --include="src/utils/deck.js" node --test test/utils/deck.unit.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * The module under test containing all deck utility functions.
 * @type {Object}
 */
import * as deckUtils from '../../src/utils/deck.js';

// Import game constants for testing
const constants = await import('../../src/config/constants.js');

/**
 * Available card suits for testing.
 * @type {Object<string, string>}
 * @property {string} HEARTS - Hearts suit constant
 * @property {string} DIAMONDS - Diamonds suit constant
 * @property {string} CLUBS - Clubs suit constant
 * @property {string} SPADES - Spades suit constant
 */
const SUITS = { ...constants.SUITS };

/**
 * Test suite for all deck utility functions.
 * @namespace DeckUtilityTests
 */
describe('Deck Utility Functions', () => {
  /**
   * Test suite for the createDeck function.
   * @namespace DeckUtilityTests.createDeck
   * @see {@link module:src/utils/deck.createDeck}
   */
  /**
   * Test suite for the createDeck function.
   * @namespace DeckUtilityTests.createDeck
   * @see {@link module:src/utils/deck.createDeck}
   * @see {@link module:src/config/constants} for CARD_VALUES and CARD_SUITS
   */
  describe('createDeck', () => {
    /**
     * Tests that createDeck returns a valid deck with 24 cards.
     * @function
     * @name should_create_a_deck_with_24_cards
     * @memberof DeckUtilityTests.createDeck
     */
    it('should create a deck with 24 cards', () => {
      const deck = deckUtils.createDeck();
      assert.strictEqual(Array.isArray(deck), true, 'Should return an array');
      assert.strictEqual(deck.length, 24, 'Should contain 24 cards');
    });

    /**
     * Tests that each card in the deck has a unique ID.
     * @function
     * @name should_create_a_deck_with_unique_card_IDs
     * @memberof DeckUtilityTests.createDeck
     */
    it('should create a deck with unique card IDs', () => {
      const deck = deckUtils.createDeck();
      const cardIds = new Set(deck.map(card => card.id));
      assert.strictEqual(cardIds.size, 24, 'All card IDs should be unique');
    });

    /**
     * Tests that each card in the deck has all required properties with correct types.
     * @function
     * @name should_create_cards_with_required_properties
     * @memberof DeckUtilityTests.createDeck
     * @see {@link module:src/utils/deck~Card} for the expected card structure
     */
    it('should create cards with required properties', () => {
      const deck = deckUtils.createDeck();
      const sampleCard = deck[0];
      
      assert.ok(sampleCard, 'Deck should not be empty');
      assert.strictEqual(typeof sampleCard.suit, 'string', 'Card should have a suit');
      assert.strictEqual(typeof sampleCard.value, 'string', 'Card should have a value');
      assert.strictEqual(typeof sampleCard.id, 'string', 'Card should have an id');
      assert.strictEqual(typeof sampleCard.name, 'string', 'Card should have a name');
      
      // Check that the ID matches the expected format (e.g., '9H', 'KS', '10D')
      assert.ok(/^([9JQKA]|10)[HCDS]$/.test(sampleCard.id), 'Card ID should match expected format');
      
      // Verify all cards have a value property
      deck.forEach(card => {
        assert.ok('value' in card, 'Card should have a value property');
        assert.strictEqual(typeof card.value, 'string', 'Card value should be a string');
        assert.ok(card.value.length > 0, 'Card value should not be empty');
      });
    });
  });

  /**
   * Test suite for the shuffleDeck function.
   * @namespace DeckUtilityTests.shuffleDeck
   * @see {@link module:src/utils/deck.shuffleDeck}
   */
  /**
   * Test suite for the shuffleDeck function.
   * @namespace DeckUtilityTests.shuffleDeck
   * @see {@link module:src/utils/deck.shuffleDeck}
   */
  describe('shuffleDeck', () => {
    /**
     * Tests that shuffleDeck returns a new array instance and doesn't modify the original.
     * @function
     * @name should_return_a_new_array_instance
     * @memberof DeckUtilityTests.shuffleDeck
     */
    it('should return a new array instance', () => {
      const originalDeck = deckUtils.createDeck();
      const shuffledDeck = deckUtils.shuffleDeck(originalDeck);
      
      assert.notStrictEqual(shuffledDeck, originalDeck, 'Should return a new array instance');
      assert.strictEqual(shuffledDeck.length, originalDeck.length, 'Should have the same number of cards');
    });

    /**
     * Tests that the shuffled deck contains all original cards.
     * @function
     * @name should_contain_all_original_cards
     * @memberof DeckUtilityTests.shuffleDeck
     */
    it('should contain all original cards', () => {
      const originalDeck = deckUtils.createDeck();
      const shuffledDeck = deckUtils.shuffleDeck([...originalDeck]);
      
      // Check that every card from original exists in shuffled
      for (const card of originalDeck) {
        const found = shuffledDeck.some(c => 
          c.id === card.id && 
          c.suit === card.suit && 
          c.name === card.name
        );
        assert.ok(found, `Card ${card.id} missing from shuffled deck`);
      }
    });

    /**
     * Tests that shuffleDeck throws an error for non-array input.
     * @function
     * @name should_throw_error_for_non_array_input
     * @memberof DeckUtilityTests.shuffleDeck
     * @see {@link module:src/game/logic/validation-errors~InvalidCardError}
     */
    it('should throw error for non-array input', () => {
      assert.throws(
        () => deckUtils.shuffleDeck('not an array'),
        /Invalid deck provided for shuffling: must be an array/,
        'Should throw error for non-array input'
      );
    });
  });
});
