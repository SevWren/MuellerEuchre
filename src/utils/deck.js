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
 * import { createDeck, shuffleDeck, sortHand } from '@/utils/deck';
 * import { SUITS } from '@/config/constants';
 *
 * // Create and shuffle a deck
 * const deck = createDeck();
 * const shuffled = shuffleDeck(deck);
 * 
 * // Sort a player's hand
 * const hand = [/* cards *\/];
 * const sortedHand = sortHand(hand, SUITS.HEARTS);
 * TODO: VERIFY All values are imported correctly from the recently updated Constants.js 
 * 
 *
 * @since 1.0.0
 */
import { SUITS, VALUES, CARD_RANKS } from "../config/constants.js";
import { InvalidCardError } from "../game/logic/errors.js";
import logger from "./logger.js";

// ===== Helper Functions =====

/**
 * Checks if a card is a Jack based on its properties.
 * @private
 * @param {Object} card - The card to check
 * @returns {boolean} True if the card is a Jack
 */
function isJack(card) {
  if (!card) return false;
  return (
    card.value === "J"
  );
}

// Map from the constant value to the simple name for lookups
const SUIT_CONSTANT_TO_NAME_MAP = {
  [SUITS.CARD_SUIT_HEARTS]: 'hearts',
  [SUITS.CARD_SUIT_DIAMONDS]: 'diamonds',
  [SUITS.CARD_SUIT_CLUBS]: 'clubs',
  [SUITS.CARD_SUIT_SPADES]: 'spades',
};

/**
 * Normalizes a suit string and validates it against SUITS values (case-insensitive).
 * @private
 * @param {string} suit - The suit to normalize
 * @returns {string} The normalized suit (using the correct case from SUITS)
 * @throws {InvalidCardError} If the suit is invalid
 */
function normalizeSuit(suit) {
  if (!suit || typeof suit !== 'string') {
    throw new InvalidCardError("Suit is required");
  }
  
  // First, check if the input is one of the canonical values already
  if (Object.values(SUITS).includes(suit)) {
    return suit;
  }

  const normalized = suit.toLowerCase();
  // Find the matching suit with correct case from SUITS
  const validSuit = Object.values(SUITS).find(s => s.toLowerCase().endsWith(normalized));
  
  if (!validSuit) {
    throw new InvalidCardError('Invalid suit');
  }
  
  return validSuit; // Return the correctly cased suit
}

function validateCardInput(card, trumpSuit) {
  if (!card || typeof card !== "object" || !('suit' in card)) {
    throw new InvalidCardError("Invalid card object: missing or invalid properties");
  }
  
  if (trumpSuit && typeof trumpSuit !== "string") {
    throw new Error("Invalid trumpSuit: must be a string");
  }
  
  const normalizedCardSuit = normalizeSuit(card.suit);
  const normalizedTrumpSuit = trumpSuit ? normalizeSuit(trumpSuit) : null;
  
  return {
    suit: normalizedCardSuit,
    value: card.value,
    name: card.name,
    id: card.id,
    trumpSuit: normalizedTrumpSuit
  };
}

/**
 * Maps suit names to their single-character representations
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
 * Maps card values to their full names
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
 * Represents a playing card in Euchre.
 * @typedef {Object} Card
 * @property {string} suit - The suit of the card (must be one of SUITS values)
 * @property {string} value - The face value ('9', '10', 'J', 'Q', 'K', 'A')
 * @property {string} id - Unique identifier (e.g., 'AH' for Ace of Hearts)
 * @property {string} name - Human-readable name (e.g., 'Ace of Hearts')
 * @example
 * {
 *   suit: 'hearts',
 *   value: 'A',
 *   id: 'AH',
 *   name: 'Ace of Hearts'
 * }
 */

/**
 * Determines the color (red or black) of a given card suit in a standard deck.
 * 
 * This is an internal utility function used by other deck utilities to determine
 * suit colors. It handles case-insensitive input and throws an InvalidCardError
 * for invalid suits.
 *
 * @private
 * @param {string} suit - The suit to evaluate (e.g., 'HEARTS', 'spades').
 * @returns {'red'|'black'} 'red' for Hearts/Diamonds, 'black' for Clubs/Spades.
 * @throws {InvalidCardError} If the suit is not a valid standard playing card suit.
 * 
 * @example
 * // Basic usage
 * getSuitColor('hearts');  // returns 'red'
 * getSuitColor('CLUBS');   // returns 'black'
 * getSuitColor('Diamonds'); // returns 'red'
 *
 * @example
 * // Error handling
 * try {
 *   getSuitColor('invalid'); // Throws InvalidCardError
 * } catch (error) {
 *   console.error(error.message);
 * }
 *
 * @see normalizeSuit - Used internally to normalize suit strings
 * @see SUIT_CONSTANT_TO_NAME_MAP - Maps suit constants to their names
 * @see areSameColor - Uses this function to compare suit colors
 * 
 * @referencedBy
 * - src/utils/deck.js - Used internally by areSameColor and other functions
 * - test/utils/deck.unit.test.js - Comprehensive test cases
 * 
 * @modifies None - Pure function with no side effects
 * @throws {InvalidCardError} When the input is not a valid suit
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
 * 
 * @example
 * // Basic usage
 * areSameColor('hearts', 'diamonds'); // true (both red)
 * areSameColor('HEARTS', 'SPADES');   // false (red vs black)
 *
 * // Case-insensitive comparison
 * areSameColor('Clubs', 'SPADES');    // true (both black)
 *
 * // With invalid input
 * areSameColor('hearts', 'invalid');  // false (with warning logged)
 *
 * @see getSuitColor - Used internally to determine suit colors
 * @see isLeftBower - Uses this function to determine Left Bower status
 * 
 * @referencedBy
 * - test/utils/deck.unit.test.js - Comprehensive test cases
 * - src/game/logic/validation.js - For validating card plays
 * - src/game/logic/aiLogic.js - For AI decision making
 * - src/utils/deck.js - Used by other deck utility functions
 * 
 * @modifies None - Pure function with no side effects (except logging on error)
 * @throws None - Gracefully handles all errors by returning false and logging a warning
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
 * @returns {Array<Object>} A new array containing 24 card objects.
 * 
 * @example
 * // Basic usage
 * const deck = createDeck();
 * console.log(deck.length); // 24
 * console.log(deck[0]);
 * // Output: {
 * //   suit: 'CARD_SUIT_HEARTS',
 * //   value: '9',
 * //   id: '9H',
 * //   name: 'Nine of Hearts'
 * // }
 *
 * @example
 * // Creating and shuffling a new deck
 * import { createDeck, shuffleDeck } from '@/utils/deck';
 * const freshDeck = createDeck();
 * const shuffledDeck = shuffleDeck(freshDeck);
 *
 * @see SUITS - Used to determine valid suits for the deck
 * @see VALUES - Used to determine valid card values (9-A)
 * @see SUIT_CONSTANT_TO_NAME_MAP - Maps suit constants to display names
 * @see SUIT_CHAR_MAP - Maps suit names to single-character symbols
 * @see VALUE_NAME_MAP - Maps card values to display names
 * 
 * @referencedBy
 * - test/utils/deck.unit.test.js - Comprehensive test cases
 * - src/game/phases/startNewHandPhase.js - For initializing a new game
 * - src/utils/__tests__/deck.test.js - Additional test coverage
 * - scripts/setupTestData.js - For test data initialization
 * 
 * @modifies None - Pure function that creates a new array
 * @throws None - No exceptions thrown, always returns a valid deck
 */
function createDeck() {
  const uniqueSuits = [...new Set(Object.values(SUITS))].filter(s => s.startsWith('CARD_SUIT_'));
  return uniqueSuits.flatMap((suit) =>
    VALUES.map((value) => {
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
 * @param {Array<Object>} deck - The deck of cards to shuffle. Each card should be a valid card object.
 * @returns {Array<Object>} A new array containing the same cards in random order.
 * @throws {InvalidCardError} If the input is not an array.
 * 
 * @example
 * // Basic usage
 * const deck = createDeck();
 * const shuffled = shuffleDeck(deck);
 * console.log(shuffled.length); // 24 (for a standard Euchre deck)
 * console.log(deck === shuffled); // false (new array is created)
 *
 * @example
 * // Error handling
 * try {
 *   shuffleDeck(null); // Throws InvalidCardError
 * } catch (error) {
 *   console.error(error.message);
 * }
 *
 * @see createDeck - Used to create a standard deck before shuffling
 * @see sortHand - Used to sort a hand after dealing
 * 
 * @referencedBy
 * - test/utils/deck.unit.test.js - Comprehensive test cases
 * - src/game/phases/startNewHandPhase.js - For preparing a new hand
 * - src/game/logic/aiLogic.js - AI simulation of possible game states
 * 
 * @modifies None - Pure function that returns a new array
 * @throws {InvalidCardError} When input is not an array
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
 * - Suits: '♣' (Clubs), '♦' (Diamonds), '♠' (Spades), '♥' (Hearts)
 * 
 * Handles various input formats and gracefully degrades to '??' for invalid cards.
 * 
 * @param {Object} card - The card object to convert. Can have different property names.
 * @param {string} [card.value] - The card value (e.g., '9', '10', 'J', 'Q', 'K', 'A').
 * @param {string} [card.suit] - The card suit (case-insensitive).
 * @param {string} [card.name] - Alternative way to specify card name (e.g., 'ace of spades').
 * @returns {string} A compact string ID (e.g., 'J♥' for Jack of Hearts) or '??' if invalid.
 * 
 * @example
 * // Basic usage with value and suit
 * const card1 = { value: 'J', suit: 'HEARTS' };
 * console.log(cardToId(card1)); // 'J♥'
 *
 * // Alternative usage with name
 * const card2 = { name: 'ace of spades' };
 * console.log(cardToId(card2)); // 'A♠'
 *
 * // Invalid card
 * console.log(cardToId({})); // '??'
 *
 * @see normalizeSuit - Used for consistent suit handling
 * @see SUIT_CHAR_MAP - Maps suit names to their symbol characters
 * @see SUIT_CONSTANT_TO_NAME_MAP - Normalizes suit constants to names
 * 
 * @referencedBy
 * - test/utils/deck.unit.test.js - Comprehensive test cases
 * - src/game/phases/playingPhase.js - For displaying cards in the UI
 * - src/game/logic/aiLogic.js - For AI decision making
 * - src/utils/logger.js - For consistent card logging
 * 
 * @modifies None - Pure function with no side effects
 * @throws None - Gracefully handles all invalid inputs by returning '??'
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
  if (!suitChar || !VALUES.includes(upperValue)) {
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
 * @param {Object} card - The card to check. Must be a valid card object with 'suit' and 'value' properties.
 * @param {string} trumpSuit - The current trump suit (case-insensitive).
 * @returns {boolean} True if the card is the Right Bower, false otherwise.
 * @throws {InvalidCardError} If the card has an invalid or missing suit.
 * 
 * @example
 * // Returns true - Jack of Hearts is Right Bower when Hearts is trump
 * isRightBower({ suit: 'HEARTS', value: 'J' }, 'hearts');
 * 
 * @example
 * // Returns false - Not a Jack
 * isRightBower({ suit: 'HEARTS', value: 'Q' }, 'hearts');
 * 
 * @example
 * // Returns false - Jack of wrong suit
 * isRightBower({ suit: 'DIAMONDS', value: 'J' }, 'hearts');
 * 
 * @see isLeftBower - Used in conjunction for Bower checks
 * @see getCardRank - Uses this function for card ranking
 * @see sortHand - Uses this function for sorting logic
 * 
 * @referencedBy
 * - test/utils/deck.unit.test.js - Comprehensive test cases
 * - src/game/logic/validation.js - Validates card plays
 * - src/game/logic/aiLogic.js - AI decision making
 * - src/game/phases/playingPhase.js - Game play logic
 * - src/game/phases/biddingPhase.js - Bidding decisions
 * 
 * @modifies None - Pure function with no side effects
 * @throws {InvalidCardError} When card has invalid or missing suit
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
  
  // We've already validated the suit if it exists, now check if it's a Jack
  // If the card has no value or the value is not 'J', return false
  if (!('value' in card) || card.value !== 'J') {
    return false;
  }
  
  // If we get here, the suit is valid, now check if it's a Jack
  if (!('value' in card) || card.value !== 'J') {
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
 * @param {Object} card - The card to check. Must be a valid card object with 'suit' and 'value' properties.
 * @param {string} trumpSuit - The current trump suit (case-insensitive).
 * @returns {boolean} True if the card is the Left Bower, false otherwise.
 * @throws {InvalidCardError} If the card or trump suit is invalid.
 * 
 * @example
 * // Returns true - Jack of Diamonds is Left Bower when Hearts is trump (both red)
 * isLeftBower({ suit: 'DIAMONDS', value: 'J' }, 'hearts');
 * 
 * @example
 * // Returns false - Not a Jack
 * isLeftBower({ suit: 'DIAMONDS', value: 'Q' }, 'hearts');
 * 
 * @example
 * // Returns false - Jack of wrong color
 * isLeftBower({ suit: 'CLUBS', value: 'J' }, 'hearts');
 * 
 * @see isRightBower - Complementary function for Right Bower checks
 * @see getCardRank - Uses this function for card ranking
 * @see areSameColor - Used internally to determine suit colors
 * @see sortHand - Uses this function for sorting logic
 * 
 * @referencedBy
 * - test/utils/deck.unit.test.js - Comprehensive test cases
 * - src/game/logic/validation.js - Validates card plays
 * - src/game/logic/aiLogic.js - AI decision making
 * - src/game/phases/playingPhase.js - Game play logic
 * - test/game/logic/validatePlay.edge.unit.test.js - Edge case testing
 * 
 * @modifies None - Pure function with no side effects
 * @throws {InvalidCardError} When card or trump suit is invalid
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
    if (card.value !== 'J') return false;
    
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
 * @param {Object} card - The card to rank. Must have 'suit' and 'value' properties.
 * @param {string} trumpSuit - The current trump suit (case-insensitive).
 * @param {string} [ledSuit=null] - The currently led suit (if any, case-insensitive).
 * @returns {number} The rank of the card (higher is better)
 * 
 * @example
 * // Returns highest rank (Right Bower)
 * getCardRank({ suit: 'HEARTS', value: 'J' }, 'HEARTS', 'DIAMONDS');
 * 
 * @example
 * // Returns second highest rank (Left Bower)
 * getCardRank({ suit: 'DIAMONDS', value: 'J' }, 'HEARTS', 'CLUBS');
 * 
 * @see isRightBower - Used to identify the Right Bower
 * @see isLeftBower - Used to identify the Left Bower
 * @see sortHand - Uses this function for card ordering
 * 
 * @referencedBy
 * - test/utils/deck.unit.test.js - Comprehensive test cases
 * - src/game/logic/aiLogic.js - AI decision making
 * - src/game/phases/playingPhase.js - Determines winning cards
 * - src/game/logic/validation.js - Validates card plays
 * 
 * @modifies None - Pure function with no side effects
 * @throws {InvalidCardError} When card has invalid suit or value
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
 * Sorts a hand of cards according to Euchre rules with trump suit taking precedence.
 * 
 * The sorting follows this priority order:
 * 1. Right Bower (highest)
 * 2. Left Bower (second highest)
 * 3. Other trump cards (A, K, Q, 10, 9)
 * 4. Non-trump cards by suit order (Clubs, Diamonds, Spades, Hearts)
 * 5. Cards of the same suit by rank (A, K, Q, J, 10, 9)
 * 
 * @param {Array<Object>} hand - Array of card objects to sort. Each card must have 'suit' and 'value' properties.
 * @param {string} [trumpSuit] - The current trump suit (case-insensitive). If not provided, sorts by natural order.
 * @returns {Array<Object>} A new array containing the sorted cards.
 * 
 * @example
 * // Basic usage with trump suit
 * const hand = [
 *   { suit: 'HEARTS', value: 'J' },  // Right Bower if trump is HEARTS
 *   { suit: 'DIAMONDS', value: 'J' }, // Left Bower if trump is HEARTS
 *   { suit: 'HEARTS', value: 'A' },
 *   { suit: 'CLUBS', value: '9' }
 * ];
 * const sorted = sortHand(hand, 'HEARTS');
 * // Returns: [
 * //   { suit: 'HEARTS', value: 'J' },    // Right Bower first
 * //   { suit: 'DIAMONDS', value: 'J' },   // Left Bower second
 * //   { suit: 'HEARTS', value: 'A' },     // Other trump cards
 * //   { suit: 'CLUBS', value: '9' }       // Non-trump cards
 * // ]
 *
 * @see isRightBower - Used to identify the Right Bower
 * @see isLeftBower - Used to identify the Left Bower
 * @see getCardRank - Used for determining card rankings
 * @see normalizeSuit - Used for consistent suit comparison
 * 
 * @referencedBy
 * - test/utils/deck.unit.test.js - Comprehensive test cases
 * - src/game/phases/playingPhase.js - For determining card play order
 * - src/game/logic/aiLogic.js - AI decision making for card selection
 * - src/game/logic/validation.js - Validating card plays
 * 
 * @modifies None - Pure function that returns a new array
 * @throws None - Handles errors gracefully, returns empty array for invalid input
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
    SUITS.CLUBS,
    SUITS.DIAMONDS,
    SUITS.SPADES,
    SUITS.HEARTS,
  ].filter(suit => !normalizedTrumpSuit || normalizeSuit(suit) !== normalizedTrumpSuit);

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
      
      const rank = CARD_RANKS[card.value.toUpperCase()] || 0;
      
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