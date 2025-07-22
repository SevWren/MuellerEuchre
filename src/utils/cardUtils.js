/**
 * @file src/utils/cardUtils.js
 * @module utils/cardUtils
 * @description
 *   Provides a comprehensive set of pure, stateless utility functions for evaluating
 *   individual card properties and behaviors according to Euchre rules. This module
 *   encapsulates the complex logic for identifying Bowers and determining a card's
 *   "effective suit" during gameplay.
 *
 *   This module is a core component of the Layer 1 (pure logic) architecture.
 *
 * @see {@link module:utils/deck} - For deck management (creation, shuffling).
 * @see {@link module:game/logic/validation-core} - Consumes these utilities for rule validation.
 * @see {@link module:game/logic/aiLogic} - Consumes these utilities for decision-making.
 * @see {@link docs/The Left Bowers Identity Shift.md} - For architectural context.
 */

import { CARD_SUITS, CARD_VALUES } from '../config/constants.js';
import { InvalidCardError } from '../game/logic/validation-errors.js';

// --- Internal Helper Maps ---

/**
 * Maps canonical suit constants (e.g., 'CARD_SUIT_HEARTS') to their simple, lowercase names.
 * @private
 * @readonly
 */
const SUIT_CONSTANT_TO_NAME_MAP = Object.freeze({
  [CARD_SUITS.CARD_SUIT_HEARTS]: 'hearts',
  [CARD_SUITS.CARD_SUIT_DIAMONDS]: 'diamonds',
  [CARD_SUITS.CARD_SUIT_CLUBS]: 'clubs',
  [CARD_SUITS.CARD_SUIT_SPADES]: 'spades',
});

// --- Core Utility Functions ---

/**
 * Normalizes a suit string to its canonical constant value (e.g., 'hearts' -> 'CARD_SUIT_HEARTS').
 * This function is robust and returns `null` for invalid inputs instead of throwing,
 * allowing calling functions to handle invalid data gracefully.
 *
 * @param {string} suit - The suit string to normalize (e.g., 'hearts', 'HEARTS', 'CARD_SUIT_HEARTS').
 * @returns {string|null} The canonical suit constant or `null` if the input is invalid.
 */
function normalizeSuit(suit) {
  if (!suit || typeof suit !== 'string') {
    return null;
  }

  const upperSuit = suit.toUpperCase();

  // Case 1: Input is already a canonical value (e.g., 'CARD_SUIT_HEARTS')
  if (upperSuit.startsWith('CARD_SUIT_')) {
    if (Object.values(CARD_SUITS).includes(upperSuit)) {
      return upperSuit;
    }
  }

  // Case 2: Input is a legacy key ('HEARTS') or simple name ('hearts')
  const suitName = upperSuit.replace(/^CARD_SUIT_/, '');
  const canonicalSuit = `CARD_SUIT_${suitName}`;

  if (Object.values(CARD_SUITS).includes(canonicalSuit)) {
    return canonicalSuit;
  }

  // Return null for any invalid suit string
  return null;
}

/**
 * Gets the "partner" suit of the same color (e.g., Spades -> Clubs).
 * This is essential for identifying the Left Bower.
 *
 * @param {string} suit - A suit constant or string.
 * @returns {string|null} The partner suit constant or `null` if the input suit is invalid.
 */
function getPartnerSuit(suit) {
  const normalizedSuit = normalizeSuit(suit);
  if (!normalizedSuit) {
    return null; // Gracefully handle invalid input suit
  }
  switch (normalizedSuit) {
    case CARD_SUITS.CARD_SUIT_SPADES: return CARD_SUITS.CARD_SUIT_CLUBS;
    case CARD_SUITS.CARD_SUIT_CLUBS: return CARD_SUITS.CARD_SUIT_SPADES;
    case CARD_SUITS.CARD_SUIT_HEARTS: return CARD_SUITS.CARD_SUIT_DIAMONDS;
    case CARD_SUITS.CARD_SUIT_DIAMONDS: return CARD_SUITS.CARD_SUIT_HEARTS;
    default:
      return null;
  }
}

/**
 * Determines if a card is the Right Bower (the Jack of the trump suit).
 *
 * @param {object} card - The card object to check, must have `suit` and `value` properties.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {boolean} `true` if the card is the Right Bower, otherwise `false`.
 * @throws {InvalidCardError} If the card or trump suit is invalid.
 */
function isRightBower(card, trumpSuit) {
  // Handle missing or invalid card object
  if (!card) {
    return false;
  }
  
  // Check for required card properties
  if (!card.suit || !card.value) {
    throw new InvalidCardError('Card must have suit and value properties');
  }
  
  // Check for valid trump suit
  if (!trumpSuit) {
    throw new InvalidCardError('trumpSuit is required');
  }
  
  // Only Jacks can be Right Bower
  if (card.value !== 'J') {
    return false;
  }

  const normalizedCardSuit = normalizeSuit(card.suit);
  const normalizedTrumpSuit = normalizeSuit(trumpSuit);

  // Throw for invalid suits (matching test expectations)
  if (!normalizedCardSuit) {
    throw new InvalidCardError(`Invalid suit: ${card.suit}`);
  }
  
  if (!normalizedTrumpSuit) {
    throw new InvalidCardError(`Invalid trump suit: ${trumpSuit}`);
  }

  return normalizedCardSuit === normalizedTrumpSuit;
}

/**
 * Determines if a card is the Left Bower (the Jack of the same color as trump).
 *
 * @param {object} card - The card object to check, must have `suit` and `value` properties.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {boolean} `true` if the card is the Left Bower, otherwise `false`.
 * @throws {InvalidCardError} If the card or trump suit is invalid.
 */
function isLeftBower(card, trumpSuit) {
  // Handle missing or invalid card object
  if (!card) {
    return false;
  }
  
  // Check for required card properties
  if (!card.suit || !card.value) {
    throw new InvalidCardError('Card must have suit and value properties');
  }
  
  // Check for valid trump suit
  if (!trumpSuit) {
    throw new InvalidCardError('trumpSuit is required');
  }
  
  // Only Jacks can be Left Bower
  if (card.value !== 'J') {
    return false;
  }
  
  // Check for valid card suit
  const normalizedCardSuit = normalizeSuit(card.suit);
  if (!normalizedCardSuit) {
    throw new InvalidCardError(`Invalid suit: ${card.suit}`);
  }
  
  // Check for valid trump suit (via getPartnerSuit which uses normalizeSuit)
  const partnerSuit = getPartnerSuit(trumpSuit);
  if (!partnerSuit) {
    throw new InvalidCardError(`Invalid trump suit: ${trumpSuit}`);
  }

  return normalizedCardSuit === partnerSuit;
}

/**
 * Determines the effective suit of a card for gameplay, accounting for the Left Bower's
 * identity shift. The Left Bower is always considered to be of the trump suit.
 *
 * This function is the primary utility that should be used by game logic to determine
 * what suit a card belongs to for following suit rules.
 *
 * @param {object} card - The card object to evaluate.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {string|null} The card's effective suit constant, or `null` if the card is invalid.
 */
function getEffectiveSuit(card, trumpSuit) {
  if (!card || !card.suit) {
    return null;
  }

  // The Left Bower's effective suit IS the trump suit.
  if (isLeftBower(card, trumpSuit)) {
    // Ensure we return the canonical trump suit constant.
    return normalizeSuit(trumpSuit);
  }

  // For all other cards, their effective suit is their printed suit.
  return normalizeSuit(card.suit);
}

export {
  normalizeSuit,
  getPartnerSuit,
  isRightBower,
  isLeftBower,
  getEffectiveSuit,
};