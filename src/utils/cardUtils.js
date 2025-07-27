/**
 * @file src/utils/cardUtils.js
 * @module utils/cardUtils
 * @description
 *   Provides a comprehensive set of pure, stateless utility functions for evaluating
 *   individual card properties and behaviors according to Euchre rules. This module
 *   encapsulates the complex logic for identifying Bowers and determining a card's
 *   "effective suit" during gameplay, as well as sorting hands.
 *   THIS FILE IS A SOURCE OF TRUTH
 *   DO NOT EDIT IT
 *   This module is a core component of the Layer 1 (pure logic) architecture.
 * @see {@link module:utils/deck} - For deck management (creation, shuffling).
 * @see {@link module:game/logic/validation-core} - Consumes these utilities for rule validation.
 * @see {@link module:game/logic/aiLogic} - Consumes these utilities for decision-making.
 * @see {@link docs/The Left Bowers Identity Shift.md} - For architectural context.
 * @see {@link test/utils/cardUtils.unit.test.js} - For unit tests.
 * @see {@link test/game/phases/playingPhase.unit.test.js} - For integration with playing phase logic.
 *
 * @typedef {Object} Card
 * @property {string} suit - The card's suit (must be a valid CARD_SUITS constant).
 * @property {string} value - The card's value (e.g., 'Ace', 'King', '10').
 * @property {string} [id] - Optional unique identifier for the card.
 * @property {string} [playedBy] - Optional player ID of who played the card.
 * @property {boolean} [isTrump] - Optional flag indicating if the card is a trump card.
 * @property {boolean} [isLeftBower] - Optional flag indicating if the card is the Left Bower.
 * @property {boolean} [isRightBower] - Optional flag indicating if the card is the Right Bower.
 * @property {number} [rank] - Optional rank value for sorting.
 */

import { CARD_SUITS, CARD_VALUES, CARD_RANKS } from '../config/constants.js';
import { InvalidCardError } from '../game/logic/validation-errors.js';
import logger from './logger.js';

// --- Internal Helper Maps ---

/**
 * Maps canonical suit constants (e.g., 'CARD_SUIT_HEARTS') to their simple, lowercase names.
 * Used internally for display and comparison purposes.
 *
 * @private
 * @readonly
 * @type {Object<string, string>}
 * @example
 * // Returns 'hearts'
 * SUIT_CONSTANT_TO_NAME_MAP['CARD_SUIT_HEARTS']
 */
const SUIT_CONSTANT_TO_NAME_MAP = Object.freeze({
  [CARD_SUITS.CARD_SUIT_HEARTS]: 'hearts',
  [CARD_SUITS.CARD_SUIT_DIAMONDS]: 'diamonds',
  [CARD_SUITS.CARD_SUIT_CLUBS]: 'clubs',
  [CARD_SUITS.CARD_SUIT_SPADES]: 'spades'
});

/**
 * Maps simple suit names (e.g., 'hearts') to their single-character representations (e.g., 'H').
 * This map is used for creating compact card IDs and human-readable card names.
 * @private
 * @readonly
 */
const SUIT_TO_CHAR_MAP = Object.freeze({
  [CARD_SUITS.CARD_SUIT_HEARTS]: 'H',
  [CARD_SUITS.CARD_SUIT_DIAMONDS]: 'D',
  [CARD_SUITS.CARD_SUIT_CLUBS]: 'C',
  [CARD_SUITS.CARD_SUIT_SPADES]: 'S'
});

/**
 * Maps card values to their single-character representations.
 * @private
 * @readonly
 */
const VALUE_TO_CHAR_MAP = Object.freeze({
  '9': '9',
  '10': 'T',
  'J': 'J',
  'Q': 'Q',
  'K': 'K',
  'A': 'A'
});

/**
 * Maps card values to their full names for display purposes.
 * @private
 * @readonly
 */
const VALUE_TO_NAME_MAP = Object.freeze({
  '9': 'Nine',
  '10': 'Ten',
  'J': 'Jack',
  'Q': 'Queen',
  'K': 'King',
  'A': 'Ace'
});

/**
 * Maps suit constants to their display names.
 * @private
 * @readonly
 */
const SUIT_TO_NAME_MAP = Object.freeze({
  [CARD_SUITS.CARD_SUIT_HEARTS]: 'Hearts',
  [CARD_SUITS.CARD_SUIT_DIAMONDS]: 'Diamonds',
  [CARD_SUITS.CARD_SUIT_CLUBS]: 'Clubs',
  [CARD_SUITS.CARD_SUIT_SPADES]: 'Spades'
});

// --- Core Utility Functions ---

/**
 * Normalizes a suit string to its canonical constant form (e.g., 'HEARTS' -> 'CARD_SUIT_HEARTS').
 * This is a core internal utility that standardizes suit strings across the application.
 *
 * The function performs the following normalization steps:
 * 1. Trims whitespace from the input string
 * 2. Converts to uppercase for case-insensitive comparison
 * 3. Matches against known suit patterns in CARD_SUITS
 * 4. Returns the canonical constant form if a match is found
 *
 * @param {string} suit - The suit string to normalize. Can be in various formats:
 *   - Full constant (e.g., 'CARD_SUIT_HEARTS')
 *   - Simple name (e.g., 'hearts', 'HEARTS', 'HeArTs')
 *   - Partial match (e.g., 'heart' will match 'HEARTS')
 * @returns {string} The normalized suit constant (e.g., 'CARD_SUIT_HEARTS').
 * @throws {InvalidCardError} If:
 *   - The input is null, undefined, or not a string
 *   - The input string cannot be matched to a valid suit constant
 * @private
 * @see {@link CARD_SUITS} - For the complete list of valid suit constants.
 * @see {@link getSuitColor} - For getting the color of a normalized suit.
 * @see {@link areSameColor} - For comparing colors of normalized suits.
 * @see {@link isLeftBower} - Uses this function to normalize suits for comparison.
 * @see {@link isRightBower} - Uses this function to normalize suits for comparison.
 * @example
 * // Returns 'CARD_SUIT_HEARTS' (various input formats)
 * normalizeSuit('hearts');
 * normalizeSuit('HEARTS');
 * normalizeSuit('CARD_SUIT_HEARTS');
 * normalizeSuit('  heart  ');
 *
 * @example
 * // Returns 'CARD_SUIT_CLUBS' (various input formats)
 * normalizeSuit('clubs');
 * normalizeSuit('CLUBS');
 * normalizeSuit('CARD_SUIT_CLUBS');
 * normalizeSuit('  club  ');
 *
 * @example
 * // Throws InvalidCardError (invalid suit)
 * try {
 *   normalizeSuit('invalid');
 * } catch (error) {
 *   console.error(error.message); // "Invalid card suit: invalid"
 * }
 *
 * @example
 * // Throws InvalidCardError (not a string)
 * try {
 *   normalizeSuit(42);
 * } catch (error) {
 *   console.error(error.message); // "Suit must be a string"
 * }
 *
 * @example
 * // Throws InvalidCardError (empty string)
 * try {
 *   normalizeSuit('');
 * } catch (error) {
 *   console.error(error.message); // "Suit cannot be empty"
 * }
 */
function normalizeSuit(suit) {
  if (suit === null || suit === undefined) {
    throw new InvalidCardError('Suit cannot be null or undefined');
  }

  if (typeof suit !== 'string') {
    throw new InvalidCardError('Suit must be a string');
  }

  const trimmedSuit = suit.trim();
  if (trimmedSuit === '') {
    throw new InvalidCardError('Suit cannot be empty');
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
 * This is essential for identifying the Left Bower in Euchre.
 *
 * @param {string} suit - A suit constant or string.
 * @returns {string|null} The partner suit constant or `null` if the input suit is invalid.
 * @see {@link isLeftBower} - Uses this function to identify the Left Bower.
 * @see {@link CARD_SUITS} - For valid suit constants.
 * @example
 * // Returns 'CARD_SUIT_CLUBS'
 * getPartnerSuit('CARD_SUIT_SPADES');
 * // Returns 'CARD_SUIT_DIAMONDS'
 * getPartnerSuit('hearts');
 * // Returns null
 * getPartnerSuit('invalid');
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
 * The Right Bower is the highest-ranking card in Euchre.
 *
 * @param {Card} card - The card to check.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {boolean} `true` if the card is the Right Bower, otherwise `false`.
 * @throws {InvalidCardError} If the card is missing required properties or has an invalid suit.
 * @see {@link isLeftBower} - For identifying the Left Bower.
 * @see {@link getEffectiveSuit} - Used to determine the effective suit of a card.
 * @example
 * // Returns true (right bower)
 * isRightBower(
 *   { suit: 'CARD_SUIT_HEARTS', value: 'J' },
 *   'CARD_SUIT_HEARTS'
 * );
 * // Returns false (not a jack)
 * isRightBower(
 *   { suit: 'CARD_SUIT_HEARTS', value: 'A' },
 *   'CARD_SUIT_HEARTS'
 * );
 */
function isRightBower(card, trumpSuit) {
  // Check for missing or invalid card object
  if (!card || typeof card !== 'object') {
    throw new InvalidCardError('Card must be an object');
  }

  // Check for missing required properties - throw for missing suit property
  if (!card.suit) {
    throw new InvalidCardError('Card must have a suit property');
  }

  // Check for missing required properties - throw for missing value property
  if (!card.value) {
    throw new InvalidCardError('Card must have a value property');
  }

  // Return false if no trump suit is provided
  if (!trumpSuit) {
    return false;
  }

  // Only Jacks can be the Right Bower
  if (card.value !== 'J') {
    return false;
  }

  // Normalize the card's suit and the trump suit
  const normalizedCardSuit = normalizeSuit(card.suit);
  const normalizedTrumpSuit = normalizeSuit(trumpSuit);

  // Validate the card suit (throw for invalid card suit)
  if (!normalizedCardSuit) {
    throw new InvalidCardError(`Invalid card suit: ${card.suit}`);
  }

  // Return false for invalid trump suit instead of throwing
  if (!normalizedTrumpSuit) {
    return false;
  }

  // Check if this is the Right Bower (Jack of the trump suit)
  return normalizedCardSuit === normalizedTrumpSuit;
}

/**
 * Determines if a card is the Left Bower (the Jack of the same color as the trump suit).
 * The Left Bower is the second-highest ranking card in Euchre.
 *
 * @param {Card} card - The card to evaluate. Must have `suit` and `value` properties.
 * @param {string} trumpSuit - The current trump suit (e.g., 'CARD_SUIT_HEARTS' or 'hearts').
 * @returns {boolean} `true` if the card is the Left Bower, `false` otherwise.
 * @throws {InvalidCardError} If the card is invalid, missing required properties, or has invalid suit.
 * @see {@link isRightBower} - For identifying the highest ranking card (Right Bower).
 * @see {@link getSuitColor} - For determining a suit's color.
 * @see {@link getCardRank} - For the complete card ranking system.
 * @example
 * // Returns true (Jack of Diamonds is Left Bower when Hearts is trump)
 * isLeftBower(
 *   { suit: 'CARD_SUIT_DIAMONDS', value: 'J' },
 *   'CARD_SUIT_HEARTS'  // Hearts and diamonds are both red
 * );
 * @example
 * // Returns false (Jack of Spades when Hearts is trump)
 * isLeftBower(
 *   { suit: 'CARD_SUIT_SPADES', value: 'J' },
 *   'CARD_SUIT_HEARTS'  // Spades is black, Hearts is red
 * );
 * @example
 * // Returns false (Ace of Diamonds is not a Jack)
 * isLeftBower(
 *   { suit: 'CARD_SUIT_DIAMONDS', value: 'A' },
 *   'CARD_SUIT_HEARTS'
 * );
 * @example
 * // Throws InvalidCardError (missing value)
 * isLeftBower(
 *   { suit: 'CARD_SUIT_DIAMONDS' },
 *   'CARD_SUIT_HEARTS'
 * );
 * @example
 * // Throws InvalidCardError (invalid trump suit)
 * isLeftBower(
 *   { suit: 'CARD_SUIT_DIAMONDS', value: 'J' },
 *   'INVALID_SUIT'
 * );
 * @example
 * // Returns false (invalid trump suit doesn't throw, just returns false)
 * isLeftBower(
 *   { suit: 'CARD_SUIT_DIAMONDS', value: 'J' },
 *   'INVALID_SUIT'
 * );
 */
function isLeftBower(card, trumpSuit) {
  // Check for missing or invalid card object
  if (!card || typeof card !== 'object') {
    return false;
  }

  // Check for missing required properties - throw for missing suit property
  if (!card.hasOwnProperty('suit')) {
    throw new InvalidCardError('Suit is required');
  }

  // Return false for missing value property
  if (!card.hasOwnProperty('value')) {
    return false;
  }

  // Check for missing or falsy trumpSuit - return false for falsy values
  if (!trumpSuit) {
    return false;
  }

  // Only Jacks can be Left Bower
  if (card.value !== 'J') {
    return false;
  }

  // Try to normalize the card's suit - this will throw for invalid suit values
  let normalizedCardSuit;
  try {
    normalizedCardSuit = normalizeSuit(card.suit);
  } catch (error) {
    throw new InvalidCardError('Invalid suit');
  }

  if (!normalizedCardSuit) {
    throw new InvalidCardError('Invalid suit');
  }

  // Get the partner suit (same color as trump)
  let partnerSuit;

  // Normalize the trump suit - throw for invalid trump suits as per test expectations
  let normalizedTrumpSuit;
  try {
    normalizedTrumpSuit = normalizeSuit(trumpSuit);
    if (!normalizedTrumpSuit) {
      throw new Error('Invalid trump suit');
    }
  } catch (error) {
    throw new InvalidCardError('Invalid suit');
  }

  // Get the partner suit - throw if we can't determine it
  try {
    partnerSuit = getPartnerSuit(normalizedTrumpSuit);
  } catch (error) {
    throw new InvalidCardError('Invalid suit');
  }

  // Shouldn't happen as getPartnerSuit throws for invalid suits, but just in case
  if (!partnerSuit) {
    return false;
  }

  // Check if this is the Left Bower (Jack of the same color as trump)
  return normalizedCardSuit === partnerSuit;
}

/**
 * Determines the effective suit of a card for gameplay, accounting for the Left Bower's
 * identity shift. The Left Bower (Jack of the same color as trump) is always considered
 * to be of the trump suit for gameplay purposes.
 *
 * This function is the single source of truth for determining a card's effective suit
 * and should be used by all game logic that needs to determine suit-based rules like
 * following suit or determining trick winners.
 *
 * @param {Card} card - The card object to evaluate. Must have `suit` and `value` properties.
 * @param {string} trumpSuit - The current trump suit (e.g., 'CARD_SUIT_HEARTS' or 'hearts').
 * @returns {string} The card's effective suit constant.
 * @throws {InvalidCardError} If the card is invalid, missing required properties, or has an invalid suit.
 * @see {@link isLeftBower} - Used to identify the Left Bower (Jack of same color as trump).
 * @see {@link isRightBower} - Used to identify the Right Bower (Jack of trump suit).
 * @see {@link getSuitColor} - For determining a suit's color.
 * @see {@link getCardRank} - For getting the complete ranking of cards including Bowers.
 * @example
 * // Returns 'CARD_SUIT_SPADES' (Left Bower becomes trump)
 * getEffectiveSuit(
 *   { suit: 'CARD_SUIT_CLUBS', value: 'J' }, // Jack of clubs
 *   'CARD_SUIT_SPADES'  // When spades is trump
 * );
 * @example
 * // Returns 'CARD_SUIT_HEARTS' (Right Bower is always trump)
 * getEffectiveSuit(
 *   { suit: 'CARD_SUIT_HEARTS', value: 'J' }, // Jack of hearts
 *   'CARD_SUIT_HEARTS'  // When hearts is trump
 * );
 * @example
 * // Returns 'CARD_SUIT_DIAMONDS' (normal card, no special handling)
 * getEffectiveSuit(
 *   { suit: 'CARD_SUIT_DIAMONDS', value: 'A' }, // Ace of diamonds
 *   'CARD_SUIT_HEARTS'  // When hearts is trump
 * );
 * @example
 * // Throws InvalidCardError (missing value)
 * getEffectiveSuit(
 *   { suit: 'CARD_SUIT_HEARTS' },
 *   'CARD_SUIT_SPADES'
 * );
 * @example
 * // Throws InvalidCardError (invalid card suit)
 * getEffectiveSuit(
 *   { suit: 'INVALID_SUIT', value: 'J' },
 *   'CARD_SUIT_SPADES'
 * );
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

/**
 * Determines the color (red or black) of a given card suit in a standard deck.
 * This is a core utility function used throughout the codebase for suit color determination.
 *
 * The function first normalizes the input suit string to its canonical form using
 * `normalizeSuit()` and then returns the corresponding color. It handles various
 * input formats (e.g., 'HEARTS', 'hearts', 'CARD_SUIT_HEARTS') and is case-insensitive.
 *
 * @param {string} suit - The suit to evaluate. Can be in various formats:
 *   - Full constant (e.g., 'CARD_SUIT_HEARTS')
 *   - Simple name (e.g., 'hearts', 'HEARTS', 'HeArTs')
 *   - Partial match (e.g., 'heart' will match 'HEARTS')
 * @returns {'red'|'black'} The color of the suit:
 *   - 'red' for Hearts or Diamonds
 *   - 'black' for Clubs or Spades
 * @throws {InvalidCardError} If the suit is:
 *   - `null` or `undefined`
 *   - Not a string
 *   - Cannot be normalized to a valid suit constant
 * @see {@link normalizeSuit} - For the complete suit normalization logic.
 * @see {@link areSameColor} - For comparing if two suits have the same color.
 * @see {@link CARD_SUITS} - For the complete list of valid suit constants.
 * @see {@link isLeftBower} - Uses this function to identify the Left Bower.
 * @example
 * // Returns 'red' (various input formats)
 * getSuitColor('hearts');
 * getSuitColor('HEARTS');
 * getSuitColor('CARD_SUIT_HEARTS');
 * getSuitColor('  heart  ');
 *
 * @example
 * // Returns 'black' (various input formats)
 * getSuitColor('clubs');
 * getSuitColor('SPADES');
 * getSuitColor('CARD_SUIT_CLUBS');
 * getSuitColor('  spade  ');
 *
 * @example
 * // Throws InvalidCardError (invalid suit)
 * try {
 *   getSuitColor('invalid');
 * } catch (error) {
 *   console.error(error.message); // "Invalid card suit: invalid"
 * }
 *
 * @example
 * // Throws InvalidCardError (not a string)
 * try {
 *   getSuitColor(42);
 * } catch (error) {
 *   console.error(error.message); // "Suit must be a string"
 * }
 */
function getSuitColor(suit) {
  const normalizedSuit = normalizeSuit(suit);

  if (!normalizedSuit) {
    throw new InvalidCardError(`Invalid suit: ${suit}`);
  }

  switch (normalizedSuit) {
    case CARD_SUITS.CARD_SUIT_HEARTS:
    case CARD_SUITS.CARD_SUIT_DIAMONDS:
      return 'red';
    case CARD_SUITS.CARD_SUIT_CLUBS:
    case CARD_SUITS.CARD_SUIT_SPADES:
      return 'black';
    default:
      // This should theoretically never be reached due to normalizeSuit validation
      throw new InvalidCardError(`Invalid suit: ${suit}`);
  }

}

/**
 * Converts a card ID string (e.g., 'AH' for Ace of Hearts) to a card object.
 * This is the inverse of the `cardToId` function and handles the standard
 * two-character card ID format used throughout the application.
 *
 * The ID format is case-insensitive and follows this pattern:
 * - First character: Card value (A, K, Q, J, T/1, 9)
 * - Second character: Suit (H, D, C, S for hearts, diamonds, clubs, spades)
 *
 * Special cases:
 * - 'T' or '1' are both valid for the 10 of any suit
 * - Suits are case-insensitive ('Ah' is equivalent to 'AH')
 *
 * @param {string} id - The card ID string to convert (e.g., 'AH', '10S', 'JD').
 * @returns {Card} The corresponding card object with `suit` and `value` properties.
 *   The suit will be a valid suit constant (e.g., 'CARD_SUIT_HEARTS').
 *   The value will be a valid card value (e.g., 'Ace', 'King', '10').
 * @throws {InvalidCardError} If:
 *   - The ID is null, undefined, or not a string
 *   - The ID has an invalid length (not 2 characters)
 *   - The value character is invalid
 *   - The suit character is invalid
 * @see {@link cardToId} - For the inverse operation.
 * @see {@link CARD_VALUES} - For valid card values.
 * @see {@link CARD_SUITS} - For valid suit constants.
 * @example
 * // Returns { suit: 'CARD_SUIT_HEARTS', value: 'Ace' }
 * idToCard('AH');
 *
 * @example
 * // Returns { suit: 'CARD_SUIT_SPADES', value: '10' } (both formats work for 10)
 * idToCard('10S');
 * idToCard('TS');
 *
 * @example
 * // Returns { suit: 'CARD_SUIT_DIAMONDS', value: 'Jack' }
 * idToCard('jd'); // Case-insensitive
 *
 * @example
 * // Throws InvalidCardError (invalid length)
 * try {
 *   idToCard('A');
 * } catch (error) {
 *   console.error(error.message); // "Invalid card ID format: A"
 * }
 */
function idToCard(id) {
  if (id === null || id === undefined) {
    throw new InvalidCardError('Card ID cannot be null or undefined');
  }

  if (typeof id !== 'string') {
    throw new InvalidCardError('Card ID must be a string');
  }

  // Handle '10' as a special case since it's two characters
  const normalizedId = id.trim().toUpperCase();
  if (normalizedId.length === 2 || (normalizedId.length === 3 && normalizedId.startsWith('10'))) {
    let valueChar, suitChar;

    if (normalizedId.startsWith('10') && normalizedId.length === 3) {
      valueChar = '1';
      suitChar = normalizedId[2];
    } else {
      valueChar = normalizedId[0];
      suitChar = normalizedId[1];
    }

    // Map value character to full value string
    const valueMap = {
      'A': 'Ace',
      'K': 'King',
      'Q': 'Queen',
      'J': 'Jack',
      '1': '10',
      'T': '10',
      '9': '9'
    };

    const value = valueMap[valueChar];
    if (!value) {
      throw new InvalidCardError(`Invalid card value: ${valueChar}`);
    }

    // Map suit character to full suit constant
    const suitMap = {
      'H': CARD_SUITS.CARD_SUIT_HEARTS,
      'D': CARD_SUITS.CARD_SUIT_DIAMONDS,
      'C': CARD_SUITS.CARD_SUIT_CLUBS,
      'S': CARD_SUITS.CARD_SUIT_SPADES
    };

    const suit = suitMap[suitChar];
    if (!suit) {
      throw new InvalidCardError(`Invalid card suit: ${suitChar}`);
    }

    return { suit, value };
  }

  throw new InvalidCardError(`Invalid card ID format: ${id}`);
}

/**
 * Determines if two suits are of the same color (both red or both black).
 * This is used for identifying the Left Bower and for suit color-based rules.
 *
 * Special cases:
 * - 'T' or '1' are both valid for the 10 of any suit
 * - Suits are case-insensitive ('Ah' is equivalent to 'AH')
 *
 * @param {string} id - The card ID string to convert (e.g., 'AH', '10S', 'JD').
 * @returns {Card} The corresponding card object with `suit` and `value` properties.
 *   The suit will be a valid suit constant (e.g., 'CARD_SUIT_HEARTS').
 *   The value will be a valid card value (e.g., 'Ace', 'King', '10').
 * @throws {InvalidCardError} If:
 *   - The ID is null, undefined, or not a string
 *   - The ID has an invalid length (not 2 characters)
 *   - The value character is invalid
 *   - The suit character is invalid
 * @see {@link cardToId} - For the inverse operation.
 * @see {@link CARD_VALUES} - For valid card values.
 * @see {@link CARD_SUITS} - For valid suit constants.
 * @example
 * // Returns { suit: 'CARD_SUIT_HEARTS', value: 'Ace' }
 * idToCard('AH');
 *
 * @example
 * // Returns { suit: 'CARD_SUIT_SPADES', value: '10' } (both formats work for 10)
 * idToCard('10S');
 * idToCard('TS');
 *
 * @example
 * // Returns { suit: 'CARD_SUIT_DIAMONDS', value: 'Jack' }
 * idToCard('jd'); // Case-insensitive
 *
 * @example
 * // Throws InvalidCardError (invalid length)
 * try {
 *   idToCard('A');
 * } catch (error) {
 *   console.error(error.message); // "Invalid card ID format: A"
 * }
 *
 * @example
 * // Throws InvalidCardError (invalid value)
 * try {
 *   idToCard('XH');
 * } catch (error) {
 *   console.error(error.message); // "Invalid card value: X"
 * }
 *
 * @example
 * // Throws InvalidCardError (invalid suit)
 * try {
 *   idToCard('AX');
 * } catch (error) {
 *   console.error(error.message); // "Invalid card suit: X"
 * }
 */

/**
 * Determines if two suits are of the same color (both red or both black).
 * This is used for identifying the Left Bower and for suit color-based rules.
 *
 * @param {string} suit1 - The first suit to compare (e.g., 'hearts', 'CARD_SUIT_SPADES').
 * @param {string} suit2 - The second suit to compare (e.g., 'diamonds', 'CARD_SUIT_CLUBS').
 * @returns {boolean} `true` if both suits are the same color, `false` otherwise.
 * @throws {InvalidCardError} If either suit is invalid (null, undefined, or not a valid suit).
 * @see {@link getSuitColor} - For getting the color of a single suit.
 * @see {@link isLeftBower} - Uses this function to identify the Left Bower.
 * @see {@link CARD_SUITS} - For valid suit constants.
 * @example
 * // Returns true (both red)
 * areSameColor('hearts', 'diamonds');
 *
 * @example
 * // Returns true (both black)
 * areSameColor('clubs', 'spades');
 *
 * @example
 * // Returns false (red and black)
 * areSameColor('hearts', 'clubs');
 *
 * @example
 * // Throws InvalidCardError (invalid suit)
 * try {
 *   areSameColor('hearts', 'invalid');
 * } catch (error) {
 *   console.error(error.message);
 * }
 */
function areSameColor(suit1, suit2) {
  // Handle null/undefined inputs by returning false
  if (suit1 === null || suit1 === undefined || suit2 === null || suit2 === undefined) {
    return false;
  }

  try {
    // Get colors for both suits
    const color1 = getSuitColor(suit1);
    const color2 = getSuitColor(suit2);

    // Compare the colors
    return color1 === color2;
  } catch (error) {
    // If either suit is invalid, return false
    return false;
  }
}

/**
 * Converts a card object to a unique string ID.
 * The ID is in the format "{VALUE}{SUIT}" where:
 * - Value is a single character (A, K, Q, J, T for 10, 9)
 * - Suit is a single character (H, D, C, S)
 *
 * @param {Card} card - The card object to convert. Must have `suit` and `value` properties.
 * @returns {string} The card ID in the format "{VALUE}{SUIT}" (e.g., "AH" for Ace of Hearts, "TS" for 10 of Spades).
 * @throws {InvalidCardError} If the card is invalid, missing required properties, or has invalid suit/value.
 * @see {@link CARD_SUITS} - For valid suit constants.
 * @see {@link CARD_VALUES} - For valid card values.
 * @example
 * // Returns 'AH' (Ace of Hearts)
 * cardToId({ suit: 'CARD_SUIT_HEARTS', value: 'Ace' });
 * // Returns 'TS' (10 of Spades)
 * cardToId({ suit: 'spades', value: '10' });
 * // Returns 'JD' (Jack of Diamonds)
 * cardToId({ suit: 'diamonds', value: 'Jack' });
 * // Throws InvalidCardError (missing value)
 * cardToId({ suit: 'hearts' });
 * // Throws InvalidCardError (invalid suit)
 * cardToId({ suit: 'invalid', value: 'Ace' });
 * // Returns '10S'
 * cardToId({ suit: 'CARD_SUIT_SPADES', value: '10' });
 * // Throws InvalidCardError
 * cardToId({ suit: 'invalid', value: 'A' });
 */


function cardToId(card) {
  if (!card || typeof card !== 'object') {
    throw new InvalidCardError('Card must be an object');
  }

  const { suit, value } = card;

  if (!suit) {
    throw new InvalidCardError('Card is missing suit property');
  }

  if (!value) {
    throw new InvalidCardError('Card is missing value property');
  }

  // Get the single-character suit representation
  const suitChar = SUIT_TO_CHAR_MAP[suit];
  if (!suitChar) {
    throw new InvalidCardError(`Invalid suit: ${suit}`);
  }

  // Get the single-character value representation (or the first character for 10)
  const valueChar = value === '10' ? 'T' : value[0].toUpperCase();

  return `${valueChar}${suitChar}`;
}


/**
 * Gets the base rank value of a card value according to Euchre's standard ranking.
 * This is used for sorting and comparing cards when not considering the trump suit.
 *
 * The base rank values are as follows:
 * - Right Bower (Jack of trump): Handled by getCardRank
 * - Left Bower (Jack of same color): Handled by getCardRank
 * - Ace: 6
 * - King: 5
 * - Queen: 4
 * - Jack: 3
 * - 10: 2
 * - 9: 1
 *
 * @param {string} value - The card value to evaluate (case-sensitive). Must be one of:
 *   'Ace', 'King', 'Queen', 'Jack', '10', '9'.
 * @returns {number} The base rank value (6 for Ace down to 1 for 9).
 * @throws {InvalidCardError} If the card value is invalid, null, or undefined.
 * @see {@link CARD_VALUES} - For the complete list of valid card values.
 * @see {@link getCardRank} - For getting the complete rank including trump suit considerations.
 * @see {@link isLeftBower} - For identifying the Left Bower (Jack of same color as trump).
 * @see {@link isRightBower} - For identifying the Right Bower (Jack of trump suit).
 * @example
 * // Returns 6 (Ace is highest non-trump card)
 * getBaseRankValue('Ace');
 * @example
 * // Returns 5 (King is second highest non-trump)
 * getBaseRankValue('King');
 * @example
 * // Returns 3 (Jack's base rank, though it may be promoted for Bowers)
 * getBaseRankValue('Jack');
 * @example
 * // Returns 2 (10 is low in Euchre)
 * getBaseRankValue('10');
 * @example
 * // Returns 1 (9 is the lowest card in Euchre)
 * getBaseRankValue('9');
 * @example
 * // Throws InvalidCardError (invalid value)
 * getBaseRankValue('Joker');
 * @example
 * // Throws InvalidCardError (case sensitive)
 * getBaseRankValue('ace');  // Must be 'Ace' with capital 'A'
 * @example
 * // Throws InvalidCardError (missing value)
 * getBaseRankValue();
 */
function getBaseRankValue(value) {
  if (!value) {
    throw new InvalidCardError('Card value is required');
  }

  const normalizedValue = typeof value === 'string' ? value.toLowerCase() : '';

  // Euchre rank order (highest to lowest): Ace, King, Queen, Jack, 10, 9
  const rankValues = {
    'ace': 6,
    'a': 6,        // Handle 'A' as alias for 'ace'
    'king': 5,
    'k': 5,        // Handle 'K' as alias for 'king'
    'queen': 4,
    'q': 4,        // Handle 'Q' as alias for 'queen'
    'jack': 3,
    'j': 3,        // Handle 'J' as alias for 'jack'
    '10': 2,
    '9': 1
  };

  const rankValue = rankValues[normalizedValue];

  if (rankValue === undefined) {
    throw new InvalidCardError(`Invalid card value: ${value}`);
  }

  return rankValue;
}

/**
 * Gets the rank of a card considering the trump suit.
 * The rank determines the card's strength in the current hand with the following hierarchy:
 * 1. Right Bower (Jack of trump suit): 100
 * 2. Left Bower (Jack of same color as trump): 90
 * 3. Other trump cards: 50 + base rank value
 * 4. Non-trump cards: base rank value (6 for Ace, 5 for King, etc.)
 *
 * @param {Card} card - The card to evaluate. Must have `suit` and `value` properties.
 * @param {string} trumpSuit - The current trump suit (e.g., 'CARD_SUIT_HEARTS' or 'hearts').
 * @returns {number} The rank of the card (higher is better).
 * @throws {InvalidCardError} If the card is missing required properties or has invalid values.
 * @see {@link isRightBower} - For identifying the highest ranking card (100).
 * @see {@link isLeftBower} - For identifying the second-highest ranking card (90).
 * @see {@link getBaseRankValue} - For getting the base rank without trump consideration.
 * @see {@link CARD_RANKS} - For base rank values of non-trump cards.
 * @example
 * // Returns 100 (right bower - highest rank)
 * getCardRank(
 *   { suit: 'CARD_SUIT_HEARTS', value: 'J' },
 *   'CARD_SUIT_HEARTS'
 * );
 * @example
 * // Returns 90 (left bower - second highest rank)
 * getCardRank(
 *   { suit: 'CARD_SUIT_DIAMONDS', value: 'J' },
 *   'CARD_SUIT_HEARTS'  // Hearts and diamonds are both red
 * );
 * @example
 * // Returns 56 (ace of trump suit - 50 + 6)
 * getCardRank(
 *   { suit: 'CARD_SUIT_HEARTS', value: 'A' },
 *   'CARD_SUIT_HEARTS'
 * );
 * @example
 * // Returns 6 (ace of non-trump - just base rank value)
 * getCardRank(
 *   { suit: 'CARD_SUIT_DIAMONDS', value: 'A' },
 *   'CARD_SUIT_HEARTS'
 * );
 * @example
 * // Throws InvalidCardError (missing value)
 * getCardRank(
 *   { suit: 'CARD_SUIT_HEARTS' },
 *   'CARD_SUIT_HEARTS'
 * );
 */
function getCardRank(card, trumpSuit) {
  if (!card || typeof card !== 'object') {
    throw new InvalidCardError('Card must be an object');
  }

  if (!card.suit) {
    throw new InvalidCardError('Card is missing suit property');
  }

  if (!card.value) {
    throw new InvalidCardError('Card is missing value property');
  }

  // If no trump suit is provided, use base rank value
  if (!trumpSuit) {
    return getBaseRankValue(card.value);
  }

  // Check for Right Bower (Jack of trump suit)
  if (isRightBower(card, trumpSuit)) {
    return 100; // Highest possible rank
  }

  // Check for Left Bower (Jack of same color as trump)
  if (isLeftBower(card, trumpSuit)) {
    return 90; // Second highest rank
  }

  // Check if the card is a trump suit card (but not a bower)
  const effectiveSuit = getEffectiveSuit(card, trumpSuit);
  if (effectiveSuit === trumpSuit) {
    // For trump cards, use base rank + 50 (to make them higher than non-trump)
    return 50 + getBaseRankValue(card.value);
  }

  // For non-trump cards, just use the base rank
  return getBaseRankValue(card.value);
}

/**
 * @typedef {object} SortKey
 * @property {boolean} isTrump - True if the card is a trump card.
 * @property {boolean} isRB - True if the card is the Right Bower.
 * @property {boolean} isLB - True if the card is the Left Bower.
 * @property {number} suitOrder - The order of the suit within non-trump suits, or Infinity if trump.
 * @property {number} rank - The base rank of the card.
 * @property {number} originalIndex - The original index of the card in the hand.
 */

/**
 * Sorts a hand of cards according to Euchre rules with trump suit taking precedence.
 *
 * The sorting follows this priority order:
 * 1. Right Bower (highest)
 * 2. Left Bower (second highest)
 * 3. Other trump cards (A, K, Q, 10, 9)
 * 4. Non-trump cards by suit order (Clubs, Diamonds, Spades, Hearts)
 * 5. Cards of the same suit by rank (A, K, Q, J, 10, 9)
 *
 * @param {Array<import('./deck.js').Card>} hand - Array of card objects to sort. Each card must have 'suit' and 'value' properties.
 * @param {string} [trumpSuit] - The current trump suit (case-insensitive). If not provided, sorts by natural order.
 * @returns {Array<import('./deck.js').Card>} A new array containing the sorted cards.
 * @see isRightBower
 * @see isLeftBower
 * @see getCardRank
 * @see normalizeSuit
 * @see src/game/phases/playingPhase.js
 * @see src/game/logic/aiLogic.js
 * @see src/game/logic/validation.js
 */
function sortHand(hand, trumpSuit) {
  // Input validation - throw error for non-array input
  if (!Array.isArray(hand)) {
    throw new InvalidCardError('Hand must be an array of cards');
  }

  // Return a copy of the hand if it contains invalid card objects
  if (hand.some(card => typeof card !== 'object' || card === null)) {
    logger.warn('Invalid card objects in hand for sorting.');
    return [...hand];
  }

  // Create a working copy of the hand to avoid mutating the input
  const handCopy = [...hand];

  // Define the default suit order (Clubs, Diamonds, Spades, Hearts)
  // This order determines how non-trump suits are sorted
  const defaultSuitOrder = [
    CARD_SUITS.CARD_SUIT_CLUBS,     // 0
    CARD_SUITS.CARD_SUIT_DIAMONDS,   // 1
    CARD_SUITS.CARD_SUIT_SPADES,     // 2
    CARD_SUITS.CARD_SUIT_HEARTS      // 3
  ];
  
  // Create a map of suit to order for faster lookups
  const suitOrderMap = new Map();
  
  // Determine if we have a valid trump suit
  let hasValidTrumpSuit = false;
  let normalizedTrumpSuit = null;
  
  // First, handle the trump suit if provided
  if (trumpSuit) {
    try {
      normalizedTrumpSuit = normalizeSuit(trumpSuit);
      // Check if the normalized suit is one of the valid suits
      if (Object.values(CARD_SUITS).includes(normalizedTrumpSuit)) {
        hasValidTrumpSuit = true;
      } else {
        logger.warn(`Invalid trump suit provided: ${trumpSuit}, sorting without trump logic.`);
      }
    } catch (e) {
      // If we can't normalize the trump suit, treat it as invalid
      logger.warn(`Invalid trump suit provided: ${trumpSuit}, sorting without trump logic.`);
    }
  }
  
  // Initialize with all suits in default order
  defaultSuitOrder.forEach((suit, index) => {
    try {
      const normalizedSuit = normalizeSuit(suit);
      // Only add if not already added (trump suit will be added with -1)
      if (hasValidTrumpSuit && normalizedSuit === normalizedTrumpSuit) {
        suitOrderMap.set(normalizedSuit, -1); // Trump suit gets highest priority
      } else {
        suitOrderMap.set(normalizedSuit, index);
      }
    } catch (e) {
      // Skip invalid suits
    }
  });

  /**
   * Generates a sort key for a given card based on Euchre rules.
   * @param {import('./deck.js').Card} card - The card to generate the sort key for.
   * @returns {SortKey} The sort key object.
   */
  const getSortKey = (card) => {
    // Handle invalid cards
    if (!card || typeof card !== 'object' || !card.suit || !card.value) {
      return {
        isTrump: false,
        isRB: false,
        isLB: false,
        suitOrder: Infinity,
        rank: -1,
        baseRank: -1,
        originalIndex: handCopy.indexOf(card),
        isInvalid: true
      };
    }

    try {
      const normalizedSuit = normalizeSuit(card.suit);
      const isRB = hasValidTrumpSuit ? isRightBower(card, normalizedTrumpSuit) : false;
      const isLB = hasValidTrumpSuit ? isLeftBower(card, normalizedTrumpSuit) : false;
      const isTrump = isRB || isLB || (hasValidTrumpSuit && normalizedSuit === normalizedTrumpSuit);

      // Get the base rank (A=14, K=13, ..., 9=9)
      const baseRank = getBaseRankValue(card.value);

      // For invalid cards, treat as invalid
      if (baseRank === 0 || !normalizedSuit) {
        return {
          isTrump: false, isRB: false, isLB: false,
          suitOrder: Infinity, rank: -1, baseRank: -1,
          originalIndex: handCopy.indexOf(card),
          isInvalid: true
        };
      }

      // For trump cards, we use a special order: Right Bower, Left Bower, then by rank
      if (isTrump) {
        // For trump cards, we use a special rank that ensures:
        // Right Bower (1000) > Left Bower (900) > Ace (14) > King (13) > ... > 9 (9)
        const trumpRank = isRB ? 1000 : (isLB ? 900 : baseRank);

        return {
          isTrump: true,
          isRB,
          isLB,
          suitOrder: -1, // All trumps come before non-trumps
          rank: trumpRank,
          baseRank,
          originalIndex: handCopy.indexOf(card),
          isInvalid: false
        };
      }

      // For non-trump cards, use the suit order and base rank
      // The rank is used for secondary sorting within the same suit
      const suitOrder = suitOrderMap.get(normalizedSuit) ?? Infinity;

      return {
        isTrump: false,
        isRB: false,
        isLB: false,
        suitOrder,
        rank: baseRank, // Use base rank for non-trump cards
        baseRank,
        originalIndex: handCopy.indexOf(card),
        isInvalid: false
      };
    } catch (e) {
      // If we can't process the card, treat it as invalid
      logger.warn(`Error generating sort key for card:`, { card, error: e.message });
      return {
        isTrump: false, isRB: false, isLB: false,
        suitOrder: Infinity, rank: -1, baseRank: -1,
        originalIndex: handCopy.indexOf(card),
        isInvalid: true
      };
    }
  };

  // Sort the hand
  const sortedHand = [...handCopy];
  
  sortedHand.sort((a, b) => {
    const aKey = getSortKey(a);
    const bKey = getSortKey(b);

    // 1. Sort invalid cards to the end, maintaining their original order
    if (aKey.isInvalid && bKey.isInvalid) {
      return aKey.originalIndex - bKey.originalIndex;
    }
    if (aKey.isInvalid) return 1;
    if (bKey.isInvalid) return -1;

    // If we have a valid trump suit, use trump-based sorting
    if (hasValidTrumpSuit) {
      // 2. Sort trump cards before non-trump cards
      if (aKey.isTrump && !bKey.isTrump) return -1;
      if (!aKey.isTrump && bKey.isTrump) return 1;

      // 3. Both cards are trump - sort by rank (highest first)
      if (aKey.isTrump && bKey.isTrump) {
        // If ranks are equal, maintain original order
        return bKey.rank - aKey.rank || aKey.originalIndex - bKey.originalIndex;
      }
    }

    // 4. Both cards are non-trump (or no valid trump suit)
    // First sort by rank (highest first)
    if (aKey.rank !== bKey.rank) {
      return bKey.rank - aKey.rank;
    }
    
    // 5. Same rank - sort by suit order (Clubs, Diamonds, Spades, Hearts)
    if (aKey.suitOrder !== bKey.suitOrder) {
      return aKey.suitOrder - bKey.suitOrder;
    }

    // 6. If everything else is equal, maintain original order
    return aKey.originalIndex - bKey.originalIndex;
  });
  
  return sortedHand;
}

// Export all internal helper maps and constants
export {
  // Core functions
  normalizeSuit,
  getPartnerSuit,
  isRightBower,
  isLeftBower,
  getEffectiveSuit,
  getSuitColor,
  areSameColor,
  cardToId,
  getCardRank,
  sortHand,
  getBaseRankValue,

  // Internal helper maps (exported for deck.js)
  SUIT_CONSTANT_TO_NAME_MAP,
  SUIT_TO_CHAR_MAP,
  VALUE_TO_CHAR_MAP,
  VALUE_TO_NAME_MAP,
  SUIT_TO_NAME_MAP,
};