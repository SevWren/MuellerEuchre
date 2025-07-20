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
import { InvalidCardError } from "../game/logic/validation-errors.js";
import logger from "./logger.js";

// ===== Helper Functions =====

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

/**
 * Checks if a card is a Jack based on its properties.
 * This is a private helper function used internally for bower logic.
 * @private
 * @param {import('./deck.js').Card} card - The card object to check.
 * @returns {boolean} True if the card's value is 'J', false otherwise.
 * @see isRightBower
 * @see isLeftBower
 */
function isJack(card) {
  if (!card) return false;
  return (
    card.value === "J"
  );
}

// Map from the constant value to the simple name for lookups
const SUIT_CONSTANT_TO_NAME_MAP = {
  [CARD_SUITS.CARD_SUIT_HEARTS]: 'hearts',
  [CARD_SUITS.CARD_SUIT_DIAMONDS]: 'diamonds',
  [CARD_SUITS.CARD_SUIT_CLUBS]: 'clubs',
  [CARD_SUITS.CARD_SUIT_SPADES]: 'spades',
};

/**
 * Normalizes a suit string and validates it against `CARD_SUITS` values (case-insensitive).
 * This function ensures that any provided suit string (e.g., 'hearts', 'HEARTS', 'CARD_SUIT_HEARTS')
 * is converted to its canonical `CARD_SUITS` constant value.
 * @private
 * @param {string} suit - The suit string to normalize.
 * @returns {SuitConstant} The normalized suit string, which will be one of the `CARD_SUITS` constants (e.g., 'CARD_SUIT_HEARTS').
 * @throws {InvalidCardError} If the provided suit is `null`, `undefined`, not a string, or does not correspond to a valid `CARD_SUITS` value.
 * @see getSuitColor
 * @see cardToId
 * @see isRightBower
 * @see isLeftBower
 * @see getCardRank
 * @see sortHand
 
 */
function normalizeSuit(suit) {
  if (!suit || typeof suit !== 'string') {
    throw new InvalidCardError("Suit is required");
  }
  
  // First, check if the input is one of the canonical values already
  if (Object.values(CARD_SUITS).includes(suit)) {
    return suit;
  }

  const normalized = suit.toLowerCase();
  // Find the matching suit with correct case from CARD_SUITS
  const validSuit = Object.values(CARD_SUITS).find(s => s.toLowerCase().endsWith(normalized));
  
  if (!validSuit) {
    throw new InvalidCardError('Invalid suit');
  }
  
  return validSuit; // Return the correctly cased suit
}

/**
 * Maps simple suit names (e.g., 'hearts') to their single-character representations (e.g., 'H').
 * This map is used for creating compact card IDs and human-readable card names.
 * @private
 * @readonly
 * @enum {string}
 */
const SUIT_CHAR_MAP = {
  hearts: "H",
  diamonds: "D",
  clubs: "C",
  spades: "S",
};

/**
 * Maps card values (e.g., '9', 'J') to their full, human-readable names (e.g., 'Nine', 'Jack').
 * This map is primarily used for generating human-readable card names.
 * @private
 * @readonly
 * @enum {string}
 */
const VALUE_NAME_MAP = {
  9: "Nine",
  10: "Ten",
  J: "Jack",
  Q: "Queen",
  K: "King",
  A: "Ace",
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

  const simpleSuitName = SUIT_CONSTANT_TO_NAME_MAP[normalizedSuit];
  if (!simpleSuitName) {
      throw new InvalidCardError(`Could not determine color for suit: ${suit}`);
  }

  return simpleSuitName === 'hearts' || simpleSuitName === 'diamonds'
    ? "red"
    : "black";
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
    return getSuitColor(suitA) === getSuitColor(suitB);
  } catch (error) {
    logger.warn(
      `Invalid suit comparison: suitA=${suitA}, suitB=${suitB}`,
      error,
    );
    return false;
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
 * - id: A compact string ID (e.g., '9H' for 9 of Hearts)
 * - name: A human-readable name (e.g., 'Nine of Hearts')
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
          id: `${value}${SUIT_CHAR_MAP[simpleName]}`,
          name: `${VALUE_NAME_MAP[value]} of ${simpleName.charAt(0).toUpperCase() + simpleName.slice(1)}`,
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
  
  const suitChar = SUIT_CHAR_MAP[simpleSuitName];

  // Use the uppercased value for the check
  if (!suitChar || !CARD_VALUES.includes(upperValue)) {
    return '??';
  }

  return `${upperValue}${suitChar}`;
}

/**
 * Determines if a card is the Right Bower (Jack of the trump suit).
 * 
 * The Right Bower is the highest-ranking card in Euchre, being the Jack of the trump suit.
 * This function validates the input and checks if the card meets the Right Bower criteria.
 * 
 * @param {import('./deck.js').Card} card - The card to check. Must be a valid card object with 'suit' and 'value' properties.
 * @param {string} trumpSuit - The current trump suit (case-insensitive).
 * @returns {boolean} True if the card is the Right Bower, false otherwise.
 * @throws {InvalidCardError} If the card has an invalid or missing suit.
 * @see isLeftBower
 * @see getCardRank
 * @see sortHand
 * @see src/game/logic/validation.js
 * @see src/game/logic/aiLogic.js
 * @see src/game/phases/playingPhase.js
 * @see src/game/phases/biddingPhase.js
 */
function isRightBower(card, trumpSuit) {
  // Handle null/undefined card or non-object
  if (!card || typeof card !== 'object') {
    return false;
  }
  
  // Handle empty object (return false)
  if (Object.keys(card).length === 0) {
    return false;
  }
  
  // If the card has a suit, validate it first (this will throw for invalid suits)
  if ('suit' in card) {
    try {
      // This will throw with 'Invalid suit' message if invalid
      normalizeSuit(card.suit);
    } catch (error) {
      // Re-throw with the exact expected error message
      if (error instanceof InvalidCardError) {
        throw new InvalidCardError('Invalid suit');
      }
      throw error; // Re-throw any unexpected errors
    }
  }
  
  // If the card has a value but no suit, throw an error
  if ('value' in card && !('suit' in card)) {
    throw new InvalidCardError('Suit is required');
  }
  
  // If the card is not a Jack, return false
  if (!isJack(card)) {
    return false;
  }
  
  // Normalize the card suit
  const normalizedCardSuit = normalizeSuit(card.suit);
  
  // Handle falsy trumpSuit (empty string, null, undefined) or invalid trump suits
  let normalizedTrumpSuit;
  try {
    normalizedTrumpSuit = normalizeSuit(trumpSuit);
  } catch (error) {
    // Return false for invalid trump suits (per test expectations)
    return false;
  }
  
  // Check if it matches the trump suit
  return normalizedCardSuit === normalizedTrumpSuit;
}


/**
 * Determines if a card is the Left Bower (Jack of the same color as trump).
 * 
 * The Left Bower is the second-highest card in Euchre, being the Jack of the same
 * color as the trump suit. For example, if Hearts is trump, the Jack of Diamonds
 * is the Left Bower (both are red).
 * 
 * @param {import('./deck.js').Card} card - The card to check. Must be a valid card object with 'suit' and 'value' properties.
 * @param {string} trumpSuit - The current trump suit (case-insensitive).
 * @returns {boolean} True if the card is the Left Bower, false otherwise.
 * @throws {InvalidCardError} If the card or trump suit is invalid.
 * @see isRightBower
 * @see getCardRank
 * @see areSameColor
 * @see sortHand
 * @see src/game/logic/validation.js
 * @see src/game/logic/aiLogic.js
 * @see src/game/phases/playingPhase.js
 */
function isLeftBower(card, trumpSuit) {
    // Handle null/undefined card
    if (!card) return false;
    
    // Handle missing or invalid card properties
    if (typeof card !== 'object' || !('value' in card)) {
        return false;
    }
    
    // Handle missing suit (must throw according to test)
    if (!('suit' in card)) {
        throw new InvalidCardError('Suit is required');
    }
    
    // Handle falsy trumpSuit (empty string, null, undefined)
    if (!trumpSuit) {
        return false;
    }
    
    // Normalize the trump suit (will throw if invalid)
    const normalizedTrumpSuit = normalizeSuit(trumpSuit);
    
    // Check if it's a Jack
    if (!isJack(card)) return false;
    
    // Normalize the card suit (will throw if invalid)
    const normalizedCardSuit = normalizeSuit(card.suit);
    
    // A card can't be the left bower if it's the same suit as trump (that's the right bower)
    if (normalizedCardSuit === normalizedTrumpSuit) return false;
    
    // A left bower must be the same color as the trump suit
    return areSameColor(normalizedCardSuit, normalizedTrumpSuit);
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
  if (!card || typeof card !== 'object' || !card.suit || !card.value || !trumpSuit) {
    logger.warn('Invalid arguments for getCardRank');
    return CARD_RANKS.INVALID;
  }

  try {
    const cardValue = String(card.value).toUpperCase();
    const valueToRankKey = {
      '9': 'CARD_RANK_NINE', '10': 'CARD_RANK_TEN', 'J': 'CARD_RANK_JACK',
      'Q': 'CARD_RANK_QUEEN', 'K': 'CARD_RANK_KING', 'A': 'CARD_RANK_ACE'
    };
    
    if (!(cardValue in valueToRankKey)) {
      logger.warn(`Invalid card value: ${card.value}`);
      return CARD_RANKS.INVALID;
    }
    
    const rankKey = valueToRankKey[cardValue];
    const normalizedCardSuit = normalizeSuit(card.suit);
    const normalizedTrumpSuit = normalizeSuit(trumpSuit);
    const normalizedLedSuit = ledSuit ? normalizeSuit(ledSuit) : null;
    
    if (isRightBower(card, normalizedTrumpSuit)) {
      return CARD_RANKS.CARD_RANK_RIGHT_BOWER;
    }
    
    if (isLeftBower(card, normalizedTrumpSuit)) {
      return CARD_RANKS.CARD_RANK_LEFT_BOWER;
    }
    
    const baseRank = CARD_RANKS[rankKey] || CARD_RANKS.INVALID;
    
    if (normalizedCardSuit === normalizedTrumpSuit) {
      return baseRank + CARD_RANKS.TRUMP_OFFSET;
    }
    
    if (normalizedLedSuit && normalizedCardSuit === normalizedLedSuit) {
      return baseRank + CARD_RANKS.LED_OFFSET;
    }
    
    return baseRank;
  } catch (error) {
    logger.warn("Error in getCardRank:", error);
    return CARD_RANKS.INVALID;
  }
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
  if (!Array.isArray(hand)) {
    logger.warn("Invalid hand provided for sorting: must be an array.", {
      hand,
    });
    return [];
  }

  const handCopy = [...hand];
  
  let normalizedTrumpSuit;
  try {
    normalizedTrumpSuit = trumpSuit ? normalizeSuit(trumpSuit) : null;
  } catch (error) {
    logger.warn("Invalid trumpSuit in sortHand, defaulting to no trump:", error);
    normalizedTrumpSuit = null;
  }

  const nonTrumpSuitOrder = [
    CARD_SUITS.CARD_SUIT_CLUBS,
    CARD_SUITS.CARD_SUIT_DIAMONDS,
    CARD_SUITS.CARD_SUIT_SPADES,
    CARD_SUITS.CARD_SUIT_HEARTS,
  ].filter(suit => !normalizedTrumpSuit || normalizeSuit(suit) !== normalizedTrumpSuit);

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
        suitOrder = nonTrumpSuitOrder.findIndex(suit => suit === normalizedSuit);
        if (suitOrder === -1) suitOrder = Infinity;
      }
      
      const rankName = VALUE_NAME_MAP[card.value]?.toUpperCase();
      const rank = rankName ? (CARD_RANKS[rankName] || 0) : 0;
      
      return { isTrump, isRB, isLB, suitOrder, rank, originalIndex: handCopy.indexOf(card) };
    } catch (e) {
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
    
    if (aKey.isTrump && !bKey.isTrump) return -1;
    if (!aKey.isTrump && bKey.isTrump) return 1;
    
    if (aKey.isTrump && bKey.isTrump) {
      if (aKey.isRB) return -1;
      if (bKey.isRB) return 1;
      
      if (aKey.isLB) return -1;
      if (bKey.isLB) return 1;
      
      return bKey.rank - aKey.rank;
    }
    
    if (aKey.suitOrder !== bKey.suitOrder) {
      return aKey.suitOrder - bKey.suitOrder;
    }
    
    if (aKey.rank !== bKey.rank) {
      return bKey.rank - aKey.rank;
    }
    
    return aKey.originalIndex - bKey.originalIndex;
  });
}

const deckUtils = Object.freeze({
  areSameColor,
  createDeck,
  shuffleDeck,
  cardToId,
  isRightBower,
  isLeftBower,
  getCardRank,
  sortHand,
  normalizeSuit,
});

export {
  areSameColor,
  createDeck,
  shuffleDeck,
  cardToId,
  isRightBower,
  isLeftBower,
  getCardRank,
  sortHand,
  normalizeSuit
};

export default deckUtils;