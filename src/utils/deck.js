/**
 * @module utils/deck
 * @description
 *   Provides a comprehensive set of utility functions for creating, managing,
 *   and evaluating a 24-card Euchre deck.
 *
 *   Core logic for card and deck manipulations in Euchre. Includes:
 *   - Deck creation and shuffling
 *   - Card ranking and identification
 *   - Hand sorting and suit evaluation
 *
 * @example
 * import { createDeck, shuffleDeck, sortHand } from "./deck";
 * import { CARD_SUITS } from "../config/constants";
 *
 * // Create and shuffle a deck
 * const deck = createDeck();
 * const shuffled = shuffleDeck(deck);
 * 
 * // Sort a player's hand
 * const hand = [/* cards *\/];
 * const sortedHand = sortHand(hand, CARD_SUITS.CARD_SUIT_HEARTS);
 *
 * @see src/game/phases/startNewHandPhase.js For deck creation during hand initialization
 * @see src/game/phases/playingPhase.js For card playing logic and validation
 * @see src/game/logic/aiLogic.js For AI decision making with cards
 * @see src/utils/logger.js For card-related logging
 * @since 1.0.0
 */

import { CARD_SUITS, CARD_VALUES, CARD_RANKS } from "../config/constants.js";
import { 
  InvalidCardError 
} from "../game/logic/validation-errors.js";
import { 
  normalizeSuit,
  getPartnerSuit,
  isRightBower,
  isLeftBower,
  getEffectiveSuit
} from "./cardUtils.js";
import logger from "./logger.js";

// ===== Helper Functions =====

/**
 * Checks if a card is a Jack.
 * @private
 * @param {import('./deck.js').Card} card - The card to check
 * @returns {boolean} True if the card is a Jack
 */
function isJack(card) {
  return card && card.value === 'J';
}

/**
 * A type representing one of the valid card value strings.
 * This is created directly from the `CARD_VALUES` constant array.
 * @typedef {typeof CARD_VALUES[number]} CardValue
 */

/**
 * A type representing one of the valid card suit constant strings.
 * This is created directly from the keys of the `CARD_SUITS` constant object.
 * @typedef {keyof typeof CARD_SUITS} SuitConstant
 */

/**
 * A type representing one of the valid card rank constant strings.
 * This is created directly from the keys of the `CARD_RANKS` constant object.
 * @typedef {keyof typeof CARD_RANKS} CardRankConstant
 */

// Map from the constant value to the simple name for lookups
const SUIT_CONSTANT_TO_NAME_MAP = {
  [CARD_SUITS.CARD_SUIT_HEARTS]: 'hearts',
  [CARD_SUITS.CARD_SUIT_DIAMONDS]: 'diamonds',
  [CARD_SUITS.CARD_SUIT_CLUBS]: 'clubs',
  [CARD_SUITS.CARD_SUIT_SPADES]: 'spades'
};

/**
 * Maps simple suit names (e.g., 'hearts') to their single-character representations (e.g., 'H').
 * This map is used for creating compact card IDs and human-readable card names.
 * @private
 * @readonly
 */
const SUIT_TO_CHAR_MAP = {
  [CARD_SUITS.CARD_SUIT_HEARTS]: 'H',
  [CARD_SUITS.CARD_SUIT_DIAMONDS]: 'D',
  [CARD_SUITS.CARD_SUIT_CLUBS]: 'C',
  [CARD_SUITS.CARD_SUIT_SPADES]: 'S'
};

/**
 * Maps card values to their single-character representations.
 * @private
 * @readonly
 */
const VALUE_TO_CHAR_MAP = {
  '9': '9',
  '10': 'T',
  'J': 'J',
  'Q': 'Q',
  'K': 'K',
  'A': 'A'
};

/**
 * Maps card values to their full names for display purposes.
 * @private
 * @readonly
 */
const VALUE_TO_NAME_MAP = {
  '9': 'Nine',
  '10': 'Ten',
  'J': 'Jack',
  'Q': 'Queen',
  'K': 'King',
  'A': 'Ace'
};

/**
 * Maps suit constants to their display names.
 * @private
 * @readonly
 */
const SUIT_TO_NAME_MAP = {
  [CARD_SUITS.CARD_SUIT_HEARTS]: 'Hearts',
  [CARD_SUITS.CARD_SUIT_DIAMONDS]: 'Diamonds',
  [CARD_SUITS.CARD_SUIT_CLUBS]: 'Clubs',
  [CARD_SUITS.CARD_SUIT_SPADES]: 'Spades'
};

/**
 * @typedef {object} Card
 * @property {SuitConstant} suit - The suit of the card. Must be one of the `CARD_SUITS` constant values (e.g., `CARD_SUIT_HEARTS`).
 * @property {CardValue} value - The face value of the card. Must be one of `CARD_VALUES` (e.g., '9', '10', 'J', 'Q', 'K', 'A').
 * @property {string} id - A unique, compact identifier for the card (e.g., 'AH' for Ace of Hearts, '9C' for Nine of Clubs).
 * @property {string} name - A human-readable name for the card (e.g., 'Ace of Hearts', 'Nine of Clubs').
 * @see src/game/phases/startNewHandPhase.js
 * @see src/game/phases/playingPhase.js
 * @see src/game/logic/validation.js
 * @see src/game/logic/aiLogic.js
 */

/**
 * Determines the color (red or black) of a given card suit in a standard deck.
 * 
 * This is an internal utility function used by other deck utilities to determine
 * suit colors. It handles case-insensitive input and throws an InvalidCardError
 * for invalid suits.
 * 
 * @private
 * @param {string} suit - The suit string to evaluate (e.g., 'HEARTS', 'spades', `CARD_SUIT_CLUBS`).
 * @returns {'red'|'black'} 'red' for Hearts/Diamonds, 'black' for Clubs/Spades.
 * @throws {InvalidCardError} If the provided suit is `null`, `undefined`, not a string, or does not correspond to a valid `CARD_SUITS` value.
 * @see normalizeSuit
 * @see areSameColor
 */
function getSuitColor(suit) {
  const normalizedSuit = normalizeSuit(suit);
  
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
 * Determines if two card suits are of the same color in a standard deck.
 * 
 * In Euchre, suits have the following colors:
 * - Red: Hearts (♥), Diamonds (♦)
 * - Black: Clubs (♣), Spades (♠)
 * 
 * This function is case-insensitive and gracefully handles invalid inputs by
 * catching errors and returning false.
 * 
 * @param {string} suitA - The first suit to compare (e.g., 'HEARTS', 'spades').
 * @param {string} suitB - The second suit to compare (e.g., 'DIAMONDS', 'clubs').
 * @returns {boolean} True if both suits are the same color, false otherwise.
 * @see getSuitColor
 * @see isLeftBower
 * @see src/game/logic/validation.js
 */
function areSameColor(suitA, suitB) {
  try {
    const colorA = getSuitColor(suitA);
    const colorB = getSuitColor(suitB);
    return colorA === colorB;
  } catch (error) {
    // If either suit is invalid, they can't be the same color
    if (error instanceof InvalidCardError) {
      return false;
    }
    // Re-throw any unexpected errors
    throw error;
  }
}

/**
 * Creates a standard 24-card Euchre deck with all necessary card properties.
 * 
 * The deck consists of 6 cards from each suit (9, 10, J, Q, K, A) across
 * the four standard suits (Hearts, Diamonds, Clubs, Spades). Each card is
 * represented as an object with the following properties:
 * - suit: The suit constant (e.g., 'CARD_SUIT_HEARTS')
 * - value: The card value ('9', '10', 'J', 'Q', 'K', 'A')
 * - id: A compact string ID (e.g., 'AH' for Ace of Hearts)
 * - name: A human-readable name (e.g., 'Ace of Hearts')
 * 
 * @returns {Array<import('./deck.js').Card>} A new array containing 24 card objects.
 * @see src/game/phases/startNewHandPhase.js
 */
function createDeck() {
  const uniqueSuits = [...new Set(Object.values(CARD_SUITS))].filter(s => s.startsWith('CARD_SUIT_'));
  return uniqueSuits.flatMap((suit) =>
    CARD_VALUES.map((value) => {
        const simpleName = SUIT_CONSTANT_TO_NAME_MAP[suit];
        return {
          suit,
          value,
          id: `${VALUE_TO_CHAR_MAP[value]}${SUIT_TO_CHAR_MAP[suit]}`,
          name: `${VALUE_TO_NAME_MAP[value]} of ${SUIT_TO_NAME_MAP[suit]}`,
        };
    })
  );
}

/**
 * Shuffles a deck of cards using the Fisher-Yates algorithm.
 * 
 * Creates a new array with the same cards in random order. The original deck
 * remains unmodified. This is a pure function that returns a new array.
 * 
 * @param {Array<import('./deck.js').Card>} deck - The deck of cards to shuffle. Each card should be a valid card object.
 * @returns {Array<import('./deck.js').Card>} A new array containing the same cards in random order.
 * @throws {InvalidCardError} If the input is not an array.
 * @see src/game/phases/startNewHandPhase.js
 */
function shuffleDeck(deck) {
  if (!Array.isArray(deck)) {
    throw new InvalidCardError(
      "Invalid deck provided for shuffling: must be an array.",
    );
  }

  const newDeck = [...deck]; // Create a shallow copy
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

/**
 * Converts a card object to a compact string ID representation.
 * 
 * The ID format is a combination of the card's value and a suit character:
 * - Values: '9', '10', 'J', 'Q', 'K', 'A'
 * - Suits: 'C' (Clubs), 'D' (Diamonds), 'S' (Spades), 'H' (Hearts)
 * 
 * Handles various input formats and gracefully degrades to '??' for invalid cards.
 * 
 * @param {import('./deck.js').Card | object} card - The card object to convert. Can have different property names.
 * @returns {string} A compact string ID (e.g., 'JH' for Jack of Hearts) or '??' if invalid.
 * @see src/game/phases/startNewHandPhase.js
 * @see src/game/phases/biddingPhase.js
 * @see src/utils/logger.js
 */
function cardToId(card) {
  if (!card) { return '??'; }

  // Extract value first
  let value = card.value;
  if (value === undefined && card.name && typeof card.name === 'string') {
    const nameLower = card.name.toLowerCase();
    const valueMap = {
      'ace': 'A', 'king': 'K', 'queen': 'Q', 'jack': 'J', 'ten': '10', 'nine': '9'
    };
    for (const [name, val] of Object.entries(valueMap)) {
      if (nameLower.startsWith(name)) {
        value = val;
        break;
      }
    }
  }
  
  // Uppercase the value for comparison
  const upperValue = typeof value === 'string' ? value.toUpperCase() : value;

  // Check for required properties *after* potential extraction from name
  if (!card.suit || !upperValue) {
    return '??';
  }
  
  let normalizedSuitConstant;
  try {
    normalizedSuitConstant = normalizeSuit(card.suit);
  } catch (e) {
    return '??';
  }

  const simpleSuitName = SUIT_CONSTANT_TO_NAME_MAP[normalizedSuitConstant];
  
  if (!simpleSuitName) {
     return '??';
  }
  
  const suitChar = SUIT_TO_CHAR_MAP[normalizedSuitConstant];

  // Use the uppercased value for the check
  if (!suitChar || !CARD_VALUES.includes(upperValue)) {
    return '??';
  }

  return `${upperValue}${suitChar}`;
}

/**
 * Determines the rank of a card in the context of the current game state.
 * 
 * Card ranking in Euchre follows these rules:
 * 1. Right Bower (Jack of trump suit) is highest (150)
 * 2. Left Bower (Jack of same color as trump) is second highest (100)
 * 3. Other trump cards follow in order: A, K, Q, 10, 9 (with TRUMP_OFFSET added)
 * 4. Cards of the led suit follow (with LED_OFFSET added)
 * 5. All other cards are ranked by their face value
 * 
 * @param {import('./deck.js').Card} card - The card to rank. Must have 'suit' and 'value' properties.
 * @param {string} trumpSuit - The current trump suit (case-insensitive).
 * @param {string} [ledSuit=null] - The currently led suit (if any, case-insensitive).
 * @returns {number} The rank of the card (higher is better)
 * @throws {InvalidCardError} When card has invalid suit or value, or if trumpSuit is invalid.
 * @see isRightBower
 * @see isLeftBower
 * @see sortHand
 * @see src/game/logic/aiLogic.js
 * @see src/game/phases/playingPhase.js
 * @see src/game/logic/validation.js
 * @see src/config/constants.js
 */
function getCardRank(card, trumpSuit, ledSuit = null) {
  // Input validation - return 0 for invalid inputs to match test expectations
  if (!card || typeof card !== 'object' || !card.suit || !card.value || !trumpSuit) {
    return CARD_RANKS.INVALID; // 0
  }

  // First, validate the card value
  const cardValue = String(card.value).toUpperCase();
  const valueToRankKey = {
    '9': 'CARD_RANK_NINE', '10': 'CARD_RANK_TEN', 'J': 'CARD_RANK_JACK',
    'Q': 'CARD_RANK_QUEEN', 'K': 'CARD_RANK_KING', 'A': 'CARD_RANK_ACE'
  };
  
  if (!(cardValue in valueToRankKey)) {
    return CARD_RANKS.INVALID; // 0
  }
  
  const rankKey = valueToRankKey[cardValue];
  
  // Try to normalize all suits, return 0 if any fail
  let normalizedCardSuit, normalizedTrumpSuit, normalizedLedSuit;
  try {
    normalizedCardSuit = normalizeSuit(card.suit);
  } catch (e) {
    return CARD_RANKS.INVALID; // 0 for invalid card suit
  }
  
  try {
    normalizedTrumpSuit = normalizeSuit(trumpSuit);
  } catch (e) {
    return CARD_RANKS.INVALID; // 0 for invalid trump suit
  }
  
  try {
    normalizedLedSuit = ledSuit ? normalizeSuit(ledSuit) : null;
  } catch (e) {
    // If ledSuit is provided but invalid, just treat as no led suit
    normalizedLedSuit = null;
  }
  
  // Check for Right Bower (Jack of trump suit)
  if (isRightBower(card, normalizedTrumpSuit)) {
    return CARD_RANKS.CARD_RANK_RIGHT_BOWER;
  }
  
  // Check for Left Bower (Jack of same color as trump)
  if (isLeftBower(card, normalizedTrumpSuit)) {
    return CARD_RANKS.CARD_RANK_LEFT_BOWER;
  }
  
  // Get the base rank for the card value
  const baseRank = CARD_RANKS[rankKey] || CARD_RANKS.INVALID;
  
  // Check if the card is a trump card (but not a bower)
  if (normalizedCardSuit === normalizedTrumpSuit) {
    return baseRank + CARD_RANKS.TRUMP_OFFSET;
  }
  
  // Check if the card matches the led suit (if any)
  if (normalizedLedSuit && normalizedCardSuit === normalizedLedSuit) {
    return baseRank + CARD_RANKS.LED_OFFSET;
  }
  
  // Default case: non-trump, non-led card
  return baseRank;
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
  // Input validation - return empty array for non-array input
  if (!Array.isArray(hand)) {
    logger.warn('Invalid hand provided for sorting: must be an array.');
    return [];
  }
  
  // Return a copy of the hand if it contains invalid card objects
  if (hand.some(card => typeof card !== 'object' || card === null)) {
    logger.warn('Invalid card objects in hand for sorting.');
    return [...hand];
  }

  // Create a working copy of the hand to avoid mutating the input
  const handCopy = [...hand];
  
  // Define the default suit order (Clubs, Diamonds, Spades, Hearts)
  const defaultSuitOrder = [
    CARD_SUITS.CARD_SUIT_CLUBS,
    CARD_SUITS.CARD_SUIT_DIAMONDS,
    CARD_SUITS.CARD_SUIT_SPADES,
    CARD_SUITS.CARD_SUIT_HEARTS
  ];
  
  // Determine if we have a valid trump suit
  let normalizedTrumpSuit = null;
  let hasValidTrumpSuit = false;
  
  if (trumpSuit) {
    try {
      normalizedTrumpSuit = normalizeSuit(trumpSuit);
      hasValidTrumpSuit = true;
    } catch (e) {
      logger.warn(`Invalid trump suit provided: ${trumpSuit}, sorting without trump logic.`);
      hasValidTrumpSuit = false;
    }
  }

  // If we have a valid trump suit, exclude it from the non-trump suit order
  // Otherwise, use the default suit order
  let nonTrumpSuitOrder;
  if (hasValidTrumpSuit) {
    nonTrumpSuitOrder = [
      CARD_SUITS.CARD_SUIT_CLUBS,
      CARD_SUITS.CARD_SUIT_DIAMONDS,
      CARD_SUITS.CARD_SUIT_SPADES,
      CARD_SUITS.CARD_SUIT_HEARTS
    ].filter(suit => normalizeSuit(suit) !== normalizedTrumpSuit);
  } else {
    nonTrumpSuitOrder = [
      CARD_SUITS.CARD_SUIT_CLUBS,
      CARD_SUITS.CARD_SUIT_DIAMONDS,
      CARD_SUITS.CARD_SUIT_SPADES,
      CARD_SUITS.CARD_SUIT_HEARTS
    ];
  }

  /**
   * Generates a sort key for a given card based on Euchre rules.
   * @param {import('./deck.js').Card} card - The card to generate the sort key for.
   * @returns {SortKey} The sort key object.
   */
  const getSortKey = (card) => {
    if (!card || typeof card !== 'object' || !card.suit || !card.value) {
      return { 
        isTrump: false, isRB: false, isLB: false, 
        suitOrder: Infinity, rank: -1, 
        originalIndex: handCopy.indexOf(card) 
      };
    }
    
    try {
      const normalizedSuit = normalizeSuit(card.suit);
      const isRB = normalizedTrumpSuit ? isRightBower(card, normalizedTrumpSuit) : false;
      const isLB = normalizedTrumpSuit ? isLeftBower(card, normalizedTrumpSuit) : false;
      const isTrump = isRB || isLB || (normalizedTrumpSuit && normalizedSuit === normalizedTrumpSuit);
      
      let suitOrder = Infinity;
      if (!isTrump) {
        // Find the suit in nonTrumpSuitOrder, handling both string and object comparisons
        suitOrder = nonTrumpSuitOrder.findIndex(suit => {
          try {
            return normalizeSuit(suit) === normalizedSuit;
          } catch (e) {
            return false;
          }
        });
        if (suitOrder === -1) suitOrder = Infinity;
      }
      
      // Get the base rank using getCardRank for consistent ranking
      const rank = getCardRank(card, normalizedTrumpSuit || '');
      
      return { 
        isTrump, 
        isRB, 
        isLB, 
        suitOrder, 
        rank: rank === CARD_RANKS.INVALID ? -1 : rank,
        originalIndex: handCopy.indexOf(card) 
      };
    } catch (e) {
      logger.warn(`Error generating sort key for card:`, { card, error: e.message });
      return { 
        isTrump: false, isRB: false, isLB: false, 
        suitOrder: Infinity, rank: -1, 
        originalIndex: handCopy.indexOf(card) 
      };
    }
  };

  return handCopy.sort((a, b) => {
    const aKey = getSortKey(a);
    const bKey = getSortKey(b);
    
    // Sort invalid cards to the end
    if (aKey.rank === -1 && bKey.rank === -1) return aKey.originalIndex - bKey.originalIndex;
    if (aKey.rank === -1) return 1;
    if (bKey.rank === -1) return -1;
    
    // Sort trump cards before non-trump cards
    if (aKey.isTrump && !bKey.isTrump) return -1;
    if (!aKey.isTrump && bKey.isTrump) return 1;
    
    // Both cards are trump
    if (aKey.isTrump && bKey.isTrump) {
      // Right Bower is highest
      if (aKey.isRB) return -1;
      if (bKey.isRB) return 1;
      
      // Left Bower is second highest
      if (aKey.isLB) return -1;
      if (bKey.isLB) return 1;
      
      // Then sort by rank (high to low)
      return bKey.rank - aKey.rank;
    }
    
    // Both cards are non-trump
    // First sort by suit order (as defined in nonTrumpSuitOrder)
    if (aKey.suitOrder !== bKey.suitOrder) {
      return aKey.suitOrder - bKey.suitOrder;
    }
    
    // Then by rank (high to low)
    if (aKey.rank !== bKey.rank) {
      return bKey.rank - aKey.rank;
    }
    
    // Finally, maintain original order for equal cards
    return aKey.originalIndex - bKey.originalIndex;
  });
}

const deckUtils = {
  areSameColor,
  createDeck,
  shuffleDeck,
  cardToId,
  isRightBower,
  isLeftBower,
  getCardRank,
  sortHand,
  normalizeSuit,
  getPartnerSuit,
};

export {
  areSameColor,
  createDeck,
  shuffleDeck,
  cardToId,
  isRightBower,
  isLeftBower,
  getCardRank,
  sortHand,
  normalizeSuit,
  getPartnerSuit
};

export default deckUtils;