/**
 * @file Unit tests for deck utility functions
 * @module test/utils/deck.unit.test
 * @description
 *   Comprehensive test suite for deck utility functions using node:test and node:assert.
 *   Tests cover all functionality from src/utils/deck.js including deck creation and shuffling.
 *
 * @see {@link module:src/utils/deck} for the implementation being tested
 * @see {@link module:src/config/constants} for game constants used in testing
 * @since 1.0.0
 *
 * @example
 * // Running the tests
 * node --test test/utils/deck.unit.test.js
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
  describe('createDeck', () => {
    it('should create a deck with 24 cards', () => {
      const deck = deckUtils.createDeck();
      assert.strictEqual(Array.isArray(deck), true, 'Should return an array');
      assert.strictEqual(deck.length, 24, 'Should contain 24 cards');
    });

    it('should create a deck with unique card IDs', () => {
      const deck = deckUtils.createDeck();
      const cardIds = new Set(deck.map(card => card.id));
      assert.strictEqual(cardIds.size, 24, 'All card IDs should be unique');
    });

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
  describe('shuffleDeck', () => {
    it('should return a new array instance', () => {
      const originalDeck = deckUtils.createDeck();
      const shuffledDeck = deckUtils.shuffleDeck(originalDeck);
      
      assert.notStrictEqual(shuffledDeck, originalDeck, 'Should return a new array instance');
      assert.strictEqual(shuffledDeck.length, originalDeck.length, 'Should have the same number of cards');
    });

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

    it('should throw error for non-array input', () => {
      assert.throws(
        () => deckUtils.shuffleDeck('not an array'),
        /Invalid deck provided for shuffling: must be an array/,
        'Should throw error for non-array input'
      );
    });
  });
});
