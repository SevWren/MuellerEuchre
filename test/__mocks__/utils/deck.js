/**
 * @file test/__mocks__/deck.js
 * @module test/mocks/deck
 * @description
 *   Mock implementation of the deck utility module for isolated unit testing.
 *   This mock provides predictable, non-random versions of deck functions,
 *   allowing tests for other modules (like game phases) to be deterministic.
 *
 *   Key Behaviors:
 *   - `createDeck()`: Returns a small, static, ordered deck.
 *   - `shuffleDeck()`: Returns a new array but does NOT change the order of cards.
 *   - All functions are wrapped in `mock.fn()` to allow for spying and per-test overrides.
 */

import { mock } from 'node:test';
import { CARD_SUITS } from '../../../src/config/constants.js';

// A small, predictable, and consistently ordered deck for testing purposes.
// Tests can rely on the order of these cards when dealing.
const MOCK_DECK = Object.freeze([
  { suit: CARD_SUITS.CARD_SUIT_SPADES, value: 'A', id: 'AS', name: 'Ace of Spades' },
  { suit: CARD_SUITS.CARD_SUIT_SPADES, value: 'K', id: 'KS', name: 'King of Spades' },
  { suit: CARD_SUITS.CARD_SUIT_SPADES, value: 'Q', id: 'QS', name: 'Queen of Spades' },
  { suit: CARD_SUITS.CARD_SUIT_SPADES, value: 'J', id: 'JS', name: 'Jack of Spades' }, // Right Bower for Spades
  { suit: CARD_SUITS.CARD_SUIT_CLUBS, value: 'A', id: 'AC', name: 'Ace of Clubs' },
  { suit: CARD_SUITS.CARD_SUIT_CLUBS, value: 'K', id: 'KC', name: 'King of Clubs' },
  { suit: CARD_SUITS.CARD_SUIT_CLUBS, value: 'Q', id: 'QC', name: 'Queen of Clubs' },
  { suit: CARD_SUITS.CARD_SUIT_CLUBS, value: 'J', id: 'JC', name: 'Jack of Clubs' }, // Left Bower for Spades
  { suit: CARD_SUITS.CARD_SUIT_HEARTS, value: 'A', id: 'AH', name: 'Ace of Hearts' },
  { suit: CARD_SUITS.CARD_SUIT_HEARTS, value: 'K', id: 'KH', name: 'King of Hearts' },
  { suit: CARD_SUITS.CARD_SUIT_HEARTS, value: 'Q', id: 'QH', name: 'Queen of Hearts' },
  { suit: CARD_SUITS.CARD_SUIT_HEARTS, value: 'J', id: 'JH', name: 'Jack of Hearts' },
  { suit: CARD_SUITS.CARD_SUIT_DIAMONDS, value: 'A', id: 'AD', name: 'Ace of Diamonds' },
  { suit: CARD_SUITS.CARD_SUIT_DIAMONDS, value: 'K', id: 'KD', name: 'King of Diamonds' },
  { suit: CARD_SUITS.CARD_SUIT_DIAMONDS, value: 'Q', id: 'QD', name: 'Queen of Diamonds' },
  { suit: CARD_SUITS.CARD_SUIT_DIAMONDS, value: 'J', id: 'JD', name: 'Jack of Diamonds' },
  { suit: CARD_SUITS.CARD_SUIT_SPADES, value: '10', id: '10S', name: 'Ten of Spades' },
  { suit: CARD_SUITS.CARD_SUIT_CLUBS, value: '10', id: '10C', name: 'Ten of Clubs' },
  { suit: CARD_SUITS.CARD_SUIT_HEARTS, value: '10', id: '10H', name: 'Ten of Hearts' },
  { suit: CARD_SUITS.CARD_SUIT_DIAMONDS, value: '10', id: '10D', name: 'Ten of Diamonds' },
  { suit: CARD_SUITS.CARD_SUIT_SPADES, value: '9', id: '9S', name: 'Nine of Spades' },
  { suit: CARD_SUITS.CARD_SUIT_CLUBS, value: '9', id: '9C', name: 'Nine of Clubs' },
  { suit: CARD_SUITS.CARD_SUIT_HEARTS, value: '9', id: '9H', name: 'Nine of Hearts' },
  { suit: CARD_SUITS.CARD_SUIT_DIAMONDS, value: '9', id: '9D', name: 'Nine of Diamonds' },
]);

/**
 * Mock: Returns a small, fixed, and ordered deck every time.
 */
export const createDeck = mock.fn(() => {
  // Return a copy to prevent tests from modifying the mock's source deck
  return [...MOCK_DECK];
});

/**
 * Mock: Returns a new array but does NOT shuffle the deck.
 * This is crucial for predictable card dealing in tests.
 */
export const shuffleDeck = mock.fn((deck) => {
  return [...deck]; // Return a copy, but do not change the order
});

const deckMocks = {
  createDeck,
  shuffleDeck,
};

export default Object.freeze(deckMocks);