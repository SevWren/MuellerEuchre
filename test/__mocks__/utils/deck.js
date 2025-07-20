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
import { CARD_SUITS, CARD_VALUES, CARD_RANKS } from '../../../src/config/constants.js';

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

/**
 * Mock: A simple, predictable version of cardToId.
 */
export const cardToId = mock.fn((card) => card?.id || '??');

/**
 * Mock: A simple, controllable version of isRightBower.
 * Tests can override this implementation if needed.
 */
export const isRightBower = mock.fn((card, trumpSuit) => {
  if (!card || !trumpSuit) return false;
  return card.value === 'J' && card.suit === trumpSuit;
});

/**
 * Mock: A simple, controllable version of isLeftBower.
 * Defaults to false. A test that needs it to be true must override it.
 */
export const isLeftBower = mock.fn((card, trumpSuit) => {
  if (!card || !trumpSuit || card.value !== 'J') return false;
  const colorMap = {
    [CARD_SUITS.CARD_SUIT_SPADES]: CARD_SUITS.CARD_SUIT_CLUBS,
    [CARD_SUITS.CARD_SUIT_CLUBS]: CARD_SUITS.CARD_SUIT_SPADES,
    [CARD_SUITS.CARD_SUIT_HEARTS]: CARD_SUITS.CARD_SUIT_DIAMONDS,
    [CARD_SUITS.CARD_SUIT_DIAMONDS]: CARD_SUITS.CARD_SUIT_HEARTS,
  };
  return colorMap[trumpSuit] === card.suit;
});

/**
 * Mock: A simplified rank calculation for predictable testing.
 */
export const getCardRank = mock.fn((card, trumpSuit) => {
  if (!card || !card.value) return 0;
  const rankMap = { '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
  let rank = rankMap[card.value] || 0;

  if (isRightBower(card, trumpSuit)) return CARD_RANKS.CARD_RANK_RIGHT_BOWER;
  if (isLeftBower(card, trumpSuit)) return CARD_RANKS.CARD_RANK_LEFT_BOWER;

  if (card.suit === trumpSuit) {
    rank += CARD_RANKS.TRUMP_OFFSET;
  }
  return rank;
});

/**
 * Mock: A simple, deterministic sort that sorts by card ID alphabetically.
 */
export const sortHand = mock.fn((hand) => {
  if (!Array.isArray(hand)) return [];
  return [...hand].sort((a, b) => (a.id || '').localeCompare(b.id || ''));
});

/**
 * Mock: A simple, predictable implementation of areSameColor.
 */
export const areSameColor = mock.fn((suitA, suitB) => {
  const redSuits = [CARD_SUITS.CARD_SUIT_HEARTS, CARD_SUITS.CARD_SUIT_DIAMONDS];
  const isARed = redSuits.includes(suitA);
  const isBRed = redSuits.includes(suitB);
  return isARed === isBRed;
});

/**
 * Mock: A simple passthrough for normalizeSuit.
 */
export const normalizeSuit = mock.fn((suit) => suit);

const deckMocks = {
  createDeck,
  shuffleDeck,
  cardToId,
  isRightBower,
  isLeftBower,
  getCardRank,
  sortHand,
  areSameColor,
  normalizeSuit,
};

export default Object.freeze(deckMocks);