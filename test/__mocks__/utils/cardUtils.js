/**
 * @file test/__mocks__/utils/cardUtils.js
 * @module test/mocks/cardUtils
 * @description
 *   Mock implementation of the card utility module for isolated unit testing.
 *   This mock provides predictable versions of card-related functions,
 *   allowing tests for other modules (like game phases) to be deterministic.
 *
 *   Key Behaviors:
 *   - All functions are wrapped in `mock.fn()` to allow for spying and per-test overrides.
 */

import { mock } from 'node:test';
import { CARD_SUITS, CARD_VALUES, CARD_RANKS } from '../../../src/config/constants.js';

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

const cardUtilsMocks = {
  cardToId,
  isRightBower,
  isLeftBower,
  getCardRank,
  sortHand,
  areSameColor,
  normalizeSuit,
};

export default Object.freeze(cardUtilsMocks);