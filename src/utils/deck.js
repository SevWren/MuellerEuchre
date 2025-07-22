/**
 * @module utils/deck
 * @description
 *   Provides utility functions for creating and managing a 24-card Euchre deck.
 *
 *   Core deck management functions:
 *   - Deck creation (standard 24-card Euchre deck)
 *   - Deck shuffling
 *
 *   For card evaluation, ranking, and hand management, see `cardUtils.js`.
 *
 * @example
 * import { createDeck, shuffleDeck } from "./deck";
 *
 * // Create and shuffle a deck
 * const deck = createDeck();
 * const shuffled = shuffleDeck(deck);
 *
 * @see src/utils/cardUtils.js For card evaluation, ranking, and hand management
 * @see src/game/phases/startNewHandPhase.js For deck creation during hand initialization
 * @since 1.0.0
 */

import { CARD_SUITS, CARD_VALUES } from "../config/constants.js";
import { InvalidCardError } from "../game/logic/validation-errors.js";
import { 
  SUIT_CONSTANT_TO_NAME_MAP,
  SUIT_TO_CHAR_MAP,
  VALUE_TO_CHAR_MAP,
  VALUE_TO_NAME_MAP,
  SUIT_TO_NAME_MAP
} from "./cardUtils.js";
import logger from "./logger.js";

// ===== Helper Functions =====

/**
 * @typedef {object} Card
 * @property {string} suit - The suit of the card. Must be one of the `CARD_SUITS` constant values (e.g., `CARD_SUIT_HEARTS`).
 * @property {string} value - The face value of the card. Must be one of `CARD_VALUES` (e.g., '9', '10', 'J', 'Q', 'K', 'A').
 * @property {string} [id] - A unique, compact identifier for the card (e.g., 'AH' for Ace of Hearts, '9C' for Nine of Clubs).
 * @property {string} [name] - A human-readable name for the card (e.g., 'Ace of Hearts', 'Nine of Clubs').
 */

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

// Note: Card utilities have been moved to cardUtils.js
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
      if (normalizedTrumpSuit) {
        hasValidTrumpSuit = true;
      }
    } catch (e) {
      // If we can't normalize the trump suit, treat it as invalid
      logger.warn(`Invalid trump suit provided: ${trumpSuit}, sorting without trump logic.`);
      hasValidTrumpSuit = false;
    }
  }

  // Create a map of suit to order for faster lookups
  const suitOrderMap = new Map();
  
  // If we have a valid trump suit, it gets highest priority (-1)
  // Then we add the remaining suits in default order (0, 1, 2, etc.)
  let nextSuitOrder = 0;
  
  // First add the trump suit if valid
  if (hasValidTrumpSuit) {
    suitOrderMap.set(normalizedTrumpSuit, -1);
  }
  
  // Then add all other suits in default order
  defaultSuitOrder.forEach(suit => {
    try {
      const normalized = normalizeSuit(suit);
      // Only add if not already added (trump suit)
      if (!suitOrderMap.has(normalized)) {
        suitOrderMap.set(normalized, nextSuitOrder);
        nextSuitOrder++;
      }
    } catch (e) {
      // Skip invalid suits
    }
  });
  
  // For non-trump suits, we need to maintain the default order
  const nonTrumpSuits = new Set();
  defaultSuitOrder.forEach(suit => {
    try {
      nonTrumpSuits.add(normalizeSuit(suit));
    } catch (e) {
      // Skip invalid suits
    }
  });
  if (hasValidTrumpSuit) {
    nonTrumpSuits.delete(normalizedTrumpSuit);
  }

  /**
   * Gets the base rank value for a card value (A=14, K=13, ..., 9=9).
   * @param {string} value - The card value.
   * @returns {number} The numeric rank value.
   */
  const getBaseRankValue = (value) => {
    switch (value) {
      case 'A': return 14;
      case 'K': return 13;
      case 'Q': return 12;
      case 'J': return 11;
      case '10': return 10;
      case '9': return 9;
      default: return 0; // Invalid rank
    }
  };

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

  return handCopy.sort((a, b) => {
    const aKey = getSortKey(a);
    const bKey = getSortKey(b);
    
    // 1. Sort invalid cards to the end, maintaining their original order
    if (aKey.isInvalid && bKey.isInvalid) {
      return aKey.originalIndex - bKey.originalIndex;
    }
    if (aKey.isInvalid) return 1;
    if (bKey.isInvalid) return -1;
    
    // 2. Sort trump cards before non-trump cards
    if (aKey.isTrump && !bKey.isTrump) return -1;
    if (!aKey.isTrump && bKey.isTrump) return 1;
    
    // 3. Both cards are trump - sort by rank (highest first)
    if (aKey.isTrump && bKey.isTrump) {
      return bKey.rank - aKey.rank;
    }
    
    // 4. Both cards are non-trump - first sort by suit order
    if (aKey.suitOrder !== bKey.suitOrder) {
      return aKey.suitOrder - bKey.suitOrder;
    }
    
    // 5. Same suit - sort by rank (highest first)
    if (aKey.rank !== bKey.rank) {
      return bKey.rank - aKey.rank;
    }
    
    // 6. If everything else is equal, maintain original order
    return aKey.originalIndex - bKey.originalIndex;
  });
}

/**
 * Gets the base rank value for a card value (A=14, K=13, ..., 9=9).
 * @param {string} value - The card value.
 * @returns {number} The numeric rank value.
 */
function getBaseRankValue(value) {
  if (!value) return 0;
  
  const upperValue = String(value).toUpperCase();
  switch (upperValue) {
    case 'A': return 14;
    case 'K': return 13;
    case 'Q': return 12;
    case 'J': return 11;
    case '10': return 10;
    case '9': return 9;
    default: return 0;
  }
}

const deckUtils = {
  createDeck,
  shuffleDeck,
};

// Export the deck utilities
export {
  createDeck,
  shuffleDeck
};

export default deckUtils;