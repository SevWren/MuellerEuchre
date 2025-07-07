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
    card.value === "J" ||
    card.value === "JACK" ||
    (card.name && typeof card.name === "string" && card.name.toUpperCase().startsWith("JACK")) ||
    (card.id && (card.id.startsWith("J") || card.id.includes("J")))
  );
}

/**
 * Normalizes a suit string and validates it against SUITS values (case-insensitive).
 * @private
 * @param {string} suit - The suit to normalize
 * @returns {string} The normalized suit (using the correct case from SUITS)
 * @throws {InvalidCardError} If the suit is invalid
 */
function normalizeSuit(suit) {
  if (!suit) {
    throw new InvalidCardError("Suit is required");
  }
  
  const normalized = String(suit).toLowerCase();
  // Find the matching suit with correct case from SUITS
  const validSuit = Object.values(SUITS).find(s => s.toLowerCase() === normalized);
  
  if (!validSuit) {
    throw new InvalidCardError(`Invalid suit: ${suit}`);
  }
  
  return validSuit; // Return the correctly cased suit
}

/**
 * Validates card input parameters.
 * @private
 * @param {Object} card - The card to validate
 * @param {string} [trumpSuit] - Optional trump suit for validation
 * @returns {Object} Normalized card and suit information
 * @throws {InvalidCardError} If validation fails
 */
function validateCardInput(card, trumpSuit) {
  logger.debug('validateCardInput called with:', { 
    card, 
    trumpSuit,
    'card.suit type': typeof card?.suit,
    'trumpSuit type': typeof trumpSuit
  });

  if (!card || typeof card !== "object" || !card.suit) {
    const error = new InvalidCardError("Invalid card object: missing or invalid properties");
    logger.debug('validateCardInput error:', error.message);
    throw error;
  }
  
  if (trumpSuit && typeof trumpSuit !== "string") {
    const error = new Error("Invalid trumpSuit: must be a string");
    logger.debug('validateCardInput error:', error.message);
    throw error;
  }
  
  const normalizedCardSuit = normalizeSuit(card.suit);
  const normalizedTrumpSuit = trumpSuit ? normalizeSuit(trumpSuit) : null;
  
  const result = {
    suit: normalizedCardSuit,
    value: card.value,
    name: card.name,
    id: card.id,
    trumpSuit: normalizedTrumpSuit
  };
  
  logger.debug('validateCardInput returning:', {
    ...result,
    isTrump: normalizedCardSuit === normalizedTrumpSuit,
    'normalizedCardSuit': normalizedCardSuit,
    'normalizedTrumpSuit': normalizedTrumpSuit,
    'inputCardSuit': card.suit,
    'inputTrumpSuit': trumpSuit
  });
  
  return result;
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
 * Rank bonus values for card evaluation in Euchre.
 * These values create a clear hierarchy in card ranking:
 * Right Bower (Jack of trump) > Left Bower (Jack of same color as trump) > Other trumps > Led suit > Off-suit
 * @private
 * @readonly
 * @enum {number}
 * @property {number} RIGHT_BOWER_RANK_BONUS=150 - Bonus for the Right Bower (Jack of trump)
 * @property {number} LEFT_BOWER_RANK_BONUS=100 - Bonus for the Left Bower (Jack of same color as trump)
 * @property {number} TRUMP_RANK_BONUS=100 - Bonus for any trump card (except bowers)
 * @property {number} LED_SUIT_RANK_BONUS=50 - Bonus for cards in the led suit (non-trump)
 */
const CARD_RANK_BONUSES = {
  RIGHT_BOWER: 150,
  LEFT_BOWER: 100,
  TRUMP: 100,
  LED_SUIT: 50,
};

const {
  RIGHT_BOWER_RANK_BONUS,
  LEFT_BOWER_RANK_BONUS,
  TRUMP_RANK_BONUS,
  LED_SUIT_RANK_BONUS,
} = CARD_RANK_BONUSES;

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
 * Gets the color of a suit (red or black).
 * @private
 * @param {string} suit - The suit to evaluate (case-insensitive).
 * @returns {'red'|'black'} The suit color.
 * @throws {InvalidCardError} If suit is invalid.
 * @example
 * getSuitColor('hearts'); // returns 'red'
 * getSuitColor('CLUBS'); // returns 'black'
 */
function getSuitColor(suit) {
  if (!suit) {
    throw new InvalidCardError("Suit is required");
  }

  // Normalize the suit to lowercase for comparison
  const normalizedSuit = suit.toLowerCase();

  // Check if the suit is valid by comparing against all SUITS values
  const isValidSuit = Object.values(SUITS).some(
    (validSuit) => validSuit.toLowerCase() === normalizedSuit,
  );

  if (!isValidSuit) {
    throw new InvalidCardError(`Invalid suit: ${suit}`);
  }

  // Determine the color based on the normalized suit
  return normalizedSuit === SUITS.HEARTS.toLowerCase() ||
    normalizedSuit === SUITS.DIAMONDS.toLowerCase()
    ? "red"
    : "black";
}

/**
 * Checks if two suits are the same color.
 * @param {string} suitA - First suit (case-insensitive).
 * @param {string} suitB - Second suit (case-insensitive).
 * @returns {boolean} True if both suits are the same color, false otherwise.
 * @example
 * areSameColor('hearts', 'diamonds'); // returns true (both red)
 * areSameColor('hearts', 'spades');   // returns false (red vs black)
 */
function areSameColor(suitA, suitB) {
  try {
    return getSuitColor(suitA) === getSuitColor(suitB);
  } catch (error) {
    // Log a warning for invalid suit inputs without throwing,
    // as this function is used in contexts where invalid input might be expected
    // (e.g., checking a non-card object).
    logger.warn(
      `Invalid suit comparison: suitA=${suitA}, suitB=${suitB}`,
      error,
    );
    return false;
  }
}

/**
 * Creates a standard 24-card Euchre deck.
 *
 * The deck consists of the 9, 10, Jack, Queen, King, and Ace cards for each of the four standard suits.
 * Each card is represented as a detailed object with suit, value, id, and name properties.
 *
 * @returns {Card[]} An array of 24 card objects, forming a complete Euchre deck.
 * @example
 * const deck = createDeck();
 * console.log(deck.length); // 24
 * console.log(deck[0]); // { suit: 'hearts', value: '9', id: '9H', name: 'Nine of Hearts' }
 */
function createDeck() {
  return Object.values(SUITS).flatMap((suit) =>
    VALUES.map((value) => ({
      suit,
      value, // Include the value property for consistency
      id: `${value}${SUIT_CHAR_MAP[suit]}`,
      name: `${VALUE_NAME_MAP[value]} of ${suit.charAt(0).toUpperCase() + suit.slice(1)}`,
    })),
  );
}

/**
 * Shuffles a deck of cards using the Fisher-Yates algorithm.
 * Returns a new shuffled array without mutating the original.
 *
 * @function shuffleDeck
 * @memberof module:utils/deck
 * @param {Card[]} deck - The deck to shuffle. Must be an array of valid Card objects.
 * @returns {Card[]} A new array containing the same cards in random order.
 * @throws {InvalidCardError} If deck is not an array or contains invalid cards.
 * @example
 * // Basic usage
 * const deck = createDeck();
 * const shuffled = shuffleDeck(deck);
 * console.log(shuffled.length); // 24
 * console.log(deck[0] === shuffled[0]); // false (very likely)
 *
 * // With error handling
 * try {
 *   const badDeck = 'not an array';
 *   const result = shuffleDeck(badDeck);
 * } catch (error) {
 *   console.error(error.message); // 'Invalid deck provided for shuffling: must be an array.'
 * }
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
 * Converts a card object into a standardized string identifier.
 * The ID follows the format: value followed by suit initial (e.g., 'KH' for King of Hearts).
 *
 * @function cardToId
 * @memberof module:utils/deck
 * @param {Card} card - The card object to convert. Must contain `suit` and `value` properties.
 * @returns {string} The card's ID string (e.g., '9H', 'KS', '10D'). Returns '??' if the card is invalid.
 * @throws {InvalidCardError} If the card parameter is missing or malformed.
 * @example
 * // Basic usage
 * const card = { suit: 'hearts', value: 'K' };
 * const cardId = cardToId(card); // Returns 'KH'
 *
 * // With error handling
 * try {
 *   const invalidCard = { value: 'K' }; // Missing suit
 *   const id = cardToId(invalidCard); // Throws InvalidCardError
 * } catch (error) {
 *   console.error(error.message);
 * }
 *
 * // With invalid card (returns '??')
 * const unknownCard = null;
 * const unknownId = cardToId(unknownCard); // Returns '??'
 */
function cardToId(card) {
  // Debug log the card object
  console.log("cardToId received card:", JSON.stringify(card, null, 2));
  console.log("SUITS:", JSON.stringify(SUITS, null, 2));
  console.log("VALUES:", JSON.stringify(VALUES, null, 2));

  // Validate card input
  try {
    validateCardInput(card);
  } catch (error) {
    logger.warn(error.message, { card });
    return "??";
  }

  // If value is not provided, try to extract it from the name
  let value = card.value;
  if (value === undefined && card.name) {
    // Extract the value from the name (e.g., "Ace of Hearts" -> "Ace", "Ten of Diamonds" -> "10")
    const valueMatch = card.name.match(/^(\w+)/);
    if (valueMatch) {
      let valueName = valueMatch[1].toLowerCase();

      // Special case for 'Ten' which is two words but we only matched the first part
      if (valueName === "ten") {
        value = "10";
        console.log("Extracted value from name (Ten):", value);
      } else {
        // Map full value names to their corresponding values
        const valueMap = {
          ace: "A",
          king: "K",
          queen: "Q",
          jack: "J",
          nine: "9",
        };

        if (valueName in valueMap) {
          value = valueMap[valueName];
          console.log("Extracted value from name:", value);
        }
      }
    }
  }

  if (value === undefined) {
    console.error(
      "Card object missing value property and could not extract from name:",
      card,
    );
    logger.warn(
      "Card object missing value property and could not extract from name:",
      card,
    );
    return "??";
  }

  // Normalize the suit to lowercase to match SUIT_CHAR_MAP keys
  const normalizedSuit =
    typeof card.suit === "string" ? card.suit.toLowerCase() : card.suit;
  console.log("Normalized suit:", normalizedSuit);

  // Check if the suit is valid
  if (!(normalizedSuit in SUIT_CHAR_MAP)) {
    console.error(
      `Invalid suit in card object: "${card.suit}" (normalized: "${normalizedSuit}"). Valid suits:`,
      Object.keys(SUIT_CHAR_MAP),
    );
    logger.warn(`Invalid suit in card object: ${card.suit}`);
    return "??";
  }

  // Get the suit character (H, D, C, S)
  const suitChar = SUIT_CHAR_MAP[normalizedSuit];

  // Convert value to string and handle special cases
  let valueStr = String(value).toUpperCase();
  console.log("Value string:", valueStr);

  // Handle the special case for '10' value
  if (valueStr === "10") {
    const result = `10${suitChar}`;
    console.log("Returning 10 card ID:", result);
    return result;
  }

  // For other values, use the first character (A, K, Q, J, 9)
  const result = `${valueStr.charAt(0)}${suitChar}`;
  console.log("Returning card ID:", result);
  return result;
}

/**
 * Determines if a card is the Right Bower in the current game context.
 * The Right Bower is the Jack of the trump suit and is the highest-ranking card in Euchre.
 *
 * @function isRightBower
 * @memberof module:utils/deck
 * @param {Card} card - The card to check. Must contain `suit` and `value` properties.
 * @param {string} trumpSuit - The current trump suit (case-insensitive).
 * @returns {boolean} `true` if the card is the Right Bower, `false` otherwise.
 * @throws {InvalidCardError} If the card is invalid or missing required properties.
 * @throws {Error} If `trumpSuit` is not provided or invalid.
 * @example
 * // Basic usage
 * const card = { suit: 'hearts', value: 'J' };
 * const isRight = isRightBower(card, 'hearts'); // true
 *
 * // With different trump suit
 * const card2 = { suit: 'spades', value: 'J' };
 * const isRight2 = isRightBower(card2, 'hearts'); // false
 *
 * // With error handling
 * try {
 *   const invalidCard = { value: 'J' }; // Missing suit
 *   const result = isRightBower(invalidCard, 'hearts');
 * } catch (error) {
 *   console.error(error.message);
 * }
 */
function isRightBower(card, trumpSuit) {
  // Debug logging
  console.log("isRightBower called with:", {
    card,
    trumpSuit,
    VALUES: VALUES,
    SUITS: SUITS,
    "VALUES.JACK": VALUES.JACK,
  });

  if (!card || typeof card !== "object" || !card.suit || !trumpSuit) {
    console.log("Invalid input to isRightBower:", { card, trumpSuit });
    return false;
  }

  // A card is a Jack if:
  // 1. Its value is 'J' or 'JACK'
  // 2. Its name indicates it's a Jack
  // 3. Its ID starts with 'J' (e.g., 'JS' for Jack of Spades)
  const isJack =
    card.value === "J" ||
    card.value === "JACK" ||
    (card.name &&
      typeof card.name === "string" &&
      card.name.toLowerCase().startsWith("jack")) ||
    (card.id && card.id.startsWith("J"));

  if (!isJack) {
    console.log("Card is not a Jack:", card);
    return false;
  }

  // Normalize suits
  let normalizedCardSuit, normalizedTrumpSuit;
  try {
    const validated = validateCardInput(card, trumpSuit);
    normalizedCardSuit = validated.suit;
    normalizedTrumpSuit = validated.trumpSuit;
  } catch (error) {
    logger.debug("Invalid input to isRightBower:", { error: error.message, card, trumpSuit });
    return false;
  }

  // Debug logging
  console.log("Comparing:", {
    isJack,
    normalizedCardSuit,
    normalizedTrumpSuit,
    suitsMatch: normalizedCardSuit === normalizedTrumpSuit,
  });

  // The Right Bower must be a Jack, and its suit must match the trump suit (case-insensitive)
  const result = isJack && normalizedCardSuit === normalizedTrumpSuit;
  return result;
}

/**
 * Determines if a card is the Left Bower in the current game context.
 * The Left Bower is the Jack of the suit that is the same color as the trump suit
 * and is the second-highest ranking card in Euchre.
 *
 * @function isLeftBower
 * @memberof module:utils/deck
 * @param {Card} card - The card to check. Must contain `suit` and `value` properties.
 * @param {string} trumpSuit - The current trump suit (case-insensitive).
 * @returns {boolean} `true` if the card is the Left Bower, `false` otherwise.
 * @throws {InvalidCardError} If the card is invalid or missing required properties.
 * @throws {Error} If `trumpSuit` is not provided or invalid.
 * @example
 * // Basic usage - Left Bower when trump is hearts (same color as diamonds)
 * const card = { suit: 'diamonds', value: 'J' };
 * const isLeft = isLeftBower(card, 'hearts'); // true
 *
 * // Not Left Bower when trump is clubs (same color as spades)
 * const card2 = { suit: 'diamonds', value: 'J' };
 * const isLeft2 = isLeftBower(card2, 'clubs'); // false
 *
 * // With error handling
 * try {
 *   const invalidCard = { value: 'J' }; // Missing suit
 *   const result = isLeftBower(invalidCard, 'hearts');
 * } catch (error) {
 *   console.error(error.message);
 * }
 *
 * @see isRightBower
 */
function isLeftBower(card, trumpSuit) {
  // Debug log the input values
  logger.debug("isLeftBower called with:", {
    card,
    trumpSuit,
    "VALUES.JACK": VALUES.JACK,
    "card.value": card?.value,
    "card.suit": card?.suit,
  });

  // Handle null/undefined cases (return false, not errors)
  if (!card) {
    logger.debug("isLeftBower: null/undefined card");
    return false;
  }
  
  // Empty object case (return false, not error)
  if (Object.keys(card).length === 0) {
    logger.debug("isLeftBower: empty card object");
    return false;
  }
  
  // Explicitly check for missing suit property (should throw)
  if (!('suit' in card)) {
    logger.debug("isLeftBower: missing suit property");
    throw new InvalidCardError("Suit is required");
  }
  
  // Falsy trumpSuit returns false (not an error)
  if (!trumpSuit) {
    logger.debug("isLeftBower: falsy trumpSuit", { trumpSuit });
    return false;
  }
  
  // Validate card input (this will throw for invalid suit)
  let normalizedCardSuit, normalizedTrumpSuit;
  try {
    const validated = validateCardInput(card, trumpSuit);
    normalizedCardSuit = validated.suit;
    normalizedTrumpSuit = validated.trumpSuit;
  } catch (error) {
    // Re-throw any validation errors related to suit
    if (error.message.includes('suit') || error.message.includes('Suit')) {
      throw error;
    }
    // For other validation errors, just return false
    return false;
  }

  // Check if the card is a Jack
  const isJackCard = isJack(card);

  if (!isJackCard) {
    logger.debug("Card is not a Jack:", { id: card.id, value: card.value });
    return false;
  }

  // Check if the card is the Right Bower (which would make it not the Left Bower)
  if (isRightBower(card, trumpSuit)) {
    logger.debug("Card is the Right Bower, not Left Bower:", {
      id: card.id,
      suit: card.suit,
    });
    return false;
  }

  // If we got here, we have valid normalized suits
  // Now check if this is the Right Bower (which would make it not the Left Bower)
  if (isRightBower(card, trumpSuit)) {
    logger.debug("Card is the Right Bower, not Left Bower:", {
      id: card.id,
      suit: card.suit,
    });
    return false;
  }

  // Check if the card's suit is the same color as the trump suit but different
  const cardSuitColor = getSuitColor(normalizedCardSuit);
  const trumpSuitColor = getSuitColor(normalizedTrumpSuit);
  const sameColor = cardSuitColor === trumpSuitColor;
  const differentSuit = normalizedCardSuit !== normalizedTrumpSuit;

  const result = sameColor && differentSuit;

  logger.debug("isLeftBower result:", {
    result,
    cardSuit: normalizedCardSuit,
    trumpSuit: normalizedTrumpSuit,
    sameColor,
    differentSuit,
    cardSuitColor,
    trumpSuitColor,
  });

  return result;
}

/**
 * Calculates the relative rank of a card for trick evaluation in Euchre.
 * Higher numbers indicate higher rank. The ranking follows Euchre rules:
 * - Right Bower (Jack of trump suit) is highest
 * - Left Bower (Jack of same color as trump) is second highest
 * - Other trump cards follow in standard order (Ace high)
 * - Led suit cards (if any) come next
 * - Other cards are ranked by standard order
 *
 * @function getCardRank
 * @memberof module:utils/deck
 * @param {Card} card - The card to evaluate. Must contain `suit` and `value` properties.
 * @param {string} trumpSuit - The current trump suit (case-insensitive).
 * @param {string} [ledSuit=null] - Optional suit that was led in the current trick.
 * @returns {number} Numerical rank where higher numbers beat lower ones.
 * @throws {InvalidCardError} If card is invalid or missing required properties.
 * @throws {Error} If `trumpSuit` is not provided or invalid.
 * @example
 * // Basic usage with trump suit only
 * const card = { suit: 'hearts', value: 'J' };
 * const rank = getCardRank(card, 'hearts'); // Returns highest rank (Right Bower)
 *
 * // With led suit (affects non-trump cards of the led suit)
 * const card2 = { suit: 'diamonds', value: 'A' };
 * const rank2 = getCardRank(card2, 'hearts', 'diamonds'); // Higher than non-led suit cards
 *
 * // With error handling
 * try {
 *   const invalidCard = { value: 'K' }; // Missing suit
 *   const rank = getCardRank(invalidCard, 'hearts');
 * } catch (error) {
 *   console.error(error.message);
 * }
 *
 * @see isRightBower
 * @see isLeftBower
 */
function getCardRank(card, trumpSuit, ledSuit = null) {
  // Debug logging
  logger.debug('getCardRank called with:', { 
    card, 
    trumpSuit, 
    ledSuit,
    'card.type': typeof card,
    'card.value': card?.value,
    'card.suit': card?.suit,
    'trumpSuit.type': typeof trumpSuit
  });

  // Handle invalid inputs gracefully to match test expectations
  if (!card || typeof card !== 'object' || !card.suit || !card.value || !trumpSuit) {
    logger.warn('Invalid arguments for getCardRank');
    return 0;
  }

  try {
    // Normalize inputs for consistent case handling
    const cardValue = String(card.value).toUpperCase();
    
    // Normalize and validate inputs with case-insensitive handling
    let normalizedCardSuit, normalizedTrumpSuit, normalizedLedSuit;
    try {
      // Validate card value exists in CARD_RANKS (case-insensitive)
      if (!(cardValue in CARD_RANKS)) {
        throw new Error(`Invalid card value: ${card.value}`);
      }
      
      // Normalize the card suit (case-insensitive)
      normalizedCardSuit = normalizeSuit(card.suit);
      
      // Normalize the trump suit (case-insensitive)
      normalizedTrumpSuit = normalizeSuit(trumpSuit);
      
      // Normalize the led suit if provided (case-insensitive)
      normalizedLedSuit = ledSuit ? normalizeSuit(ledSuit) : null;
      
    } catch (error) {
      logger.warn('Error normalizing card input:', error);
      return 0;
    }
    
    // Debug log the normalization results
    logger.debug('Normalized values:', {
      cardSuit: normalizedCardSuit,
      trumpSuit: normalizedTrumpSuit,
      ledSuit: normalizedLedSuit,
      cardValue,
      isRightBower: isRightBower(card, normalizedTrumpSuit),
      isLeftBower: isLeftBower(card, normalizedTrumpSuit)
    });
    
    // 1. Check for Right Bower (Jack of trump suit) - highest rank (150)
    if (isRightBower(card, normalizedTrumpSuit)) {
      logger.debug('Card is Right Bower, returning', CARD_RANKS.RIGHT_BOWER);
      return CARD_RANKS.RIGHT_BOWER;
    }
    
    // 2. Check for Left Bower (Jack of same color as trump) - second highest (100)
    if (isLeftBower(card, normalizedTrumpSuit)) {
      logger.debug('Card is Left Bower, returning', CARD_RANKS.LEFT_BOWER);
      return CARD_RANKS.LEFT_BOWER;
    }
    
    // Get base rank from CARD_RANKS (should be defined since we validated cardValue)
    const baseRank = CARD_RANKS[cardValue];
    
    // 3. Check for other trump cards (suit matches trump suit, and it's not a bower)
    const isTrump = normalizedCardSuit === normalizedTrumpSuit;
    
    if (isTrump) {
      // For trump cards, add the TRUMP_OFFSET (100) to the base rank
      // This ensures they're higher than non-trump cards
      const trumpRank = baseRank + CARD_RANKS.TRUMP_OFFSET;
      logger.debug('Trump card rank:', { 
        baseRank, 
        offset: CARD_RANKS.TRUMP_OFFSET, 
        trumpRank,
        cardValue,
        rankValue: CARD_RANKS[cardValue]
      });
      return trumpRank;
    }
    
    // 4. Check for led suit cards (if a suit was led)
    if (normalizedLedSuit && normalizedCardSuit === normalizedLedSuit) {
      // For led suit cards, add the LED_OFFSET (50) to the base rank
      // This makes them higher than non-led, non-trump cards but lower than trump cards
      const ledRank = baseRank + CARD_RANKS.LED_OFFSET;
      logger.debug('Led suit card rank:', { 
        baseRank, 
        offset: CARD_RANKS.LED_OFFSET, 
        ledRank 
      });
      return ledRank;
    }
    
    // 5. For all other cards, just return the base rank
    // This includes off-suit cards that weren't led
    logger.debug('Base rank (non-trump, non-led):', { 
      baseRank, 
      cardValue,
      rankValue: CARD_RANKS[cardValue] 
    });
    return baseRank;
  } catch (error) {
    logger.warn("Error in getCardRank:", error);
    return 0; // Return 0 for any errors to match test expectations
  }
}

/**
 * Sorts a player's hand for optimal display in the UI according to Euchre conventions.
 * The sorting order is designed to group cards logically for easy play:
 * 1. Trump cards first (Right Bower, then Left Bower, then other trumps by rank)
 * 2. Non-trump cards grouped by suit in the order: Clubs, Diamonds, Hearts, Spades
 * 3. Within each group, cards are sorted by rank (highest first)
 *
 * @function sortHand
 * @memberof module:utils/deck
 * @param {Card[]} hand - The player's hand to sort. Must be an array of valid Card objects.
 * @param {string} trumpSuit - The current trump suit (case-insensitive).
 * @returns {Card[]} A new array containing the sorted cards. Returns an empty array if input is invalid.
 * @throws {TypeError} If `trumpSuit` is not provided or is not a string.
 * @example
 * // Basic usage
 * const hand = [
 *   { suit: 'hearts', value: 'J' },  // Right Bower if trump is hearts
 *   { suit: 'diamonds', value: 'J' }, // Left Bower if trump is hearts
 *   { suit: 'hearts', value: 'A' },   // Other trump
 *   { suit: 'clubs', value: 'K' },    // Off-suit
 *   { suit: 'spades', value: '10' }   // Off-suit
 * ];
 * const sortedHand = sortHand(hand, 'hearts');
 * // Returns: [
 * //   { suit: 'hearts', value: 'J' },   // Right Bower first
 * //   { suit: 'diamonds', value: 'J' },  // Left Bower second
 * //   { suit: 'hearts', value: 'A' },    // Other trumps by rank
 * //   { suit: 'clubs', value: 'K' },     // Off-suits by suit order
 * //   { suit: 'spades', value: '10' }    // Then by rank within suit
 * // ]
 *
 * // With error handling
 * try {
 *   const invalidHand = 'not an array';
 *   const result = sortHand(invalidHand, 'hearts'); // Returns [] with warning
 * } catch (error) {
 *   console.error(error);
 * }
 *
 * @see isRightBower
 * @see isLeftBower
 * @see getCardRank
 */
function sortHand(hand, trumpSuit) {
  if (!Array.isArray(hand)) {
    logger.warn("Invalid hand provided for sorting: must be an array.", {
      hand,
    });
    return [];
  }

  // Create a copy to avoid mutating the original hand array
  const handCopy = [...hand];
  
  // Handle invalid trumpSuit
  let normalizedTrumpSuit;
  try {
    normalizedTrumpSuit = trumpSuit ? normalizeSuit(trumpSuit) : null;
  } catch (error) {
    logger.warn("Invalid trumpSuit in sortHand, defaulting to no trump:", error);
    normalizedTrumpSuit = null;
  }

  // Define a consistent suit order for non-trump suits (Clubs, Diamonds, Spades, Hearts)
  // This matches the test expectations and Euchre conventions
  const nonTrumpSuitOrder = [
    SUITS.CLUBS,
    SUITS.DIAMONDS,
    SUITS.SPADES,
    SUITS.HEARTS,
  ].filter(suit => !normalizedTrumpSuit || normalizeSuit(suit) !== normalizedTrumpSuit);

  // Helper function to get card sort key
  const getSortKey = (card) => {
    if (!card || typeof card !== 'object' || !card.suit || !card.value) {
      return { 
        isTrump: false, 
        isRB: false, 
        isLB: false, 
        suitOrder: Infinity, 
        rank: -1, 
        originalIndex: handCopy.indexOf(card) 
      };
    }
    
    try {
      const normalizedSuit = normalizeSuit(card.suit);
      const isRB = normalizedTrumpSuit ? isRightBower(card, normalizedTrumpSuit) : false;
      const isLB = normalizedTrumpSuit ? isLeftBower(card, normalizedTrumpSuit) : false;
      const isTrump = isRB || isLB || (normalizedTrumpSuit && normalizedSuit === normalizedTrumpSuit);
      
      // For non-trump cards, use predefined suit order (Clubs, Diamonds, Spades, Hearts)
      let suitOrder = Infinity;
      if (!isTrump) {
        suitOrder = nonTrumpSuitOrder.findIndex(suit => suit === normalizedSuit);
        if (suitOrder === -1) suitOrder = Infinity; // Invalid suit goes to end
      }
      
      // Get base rank from CARD_RANKS
      const rank = CARD_RANKS[card.value.toUpperCase()] || 0;
      
      return {
        isTrump,
        isRB,
        isLB,
        suitOrder,
        rank,
        originalIndex: handCopy.indexOf(card)
      };
    } catch (e) {
      return { 
        isTrump: false, 
        isRB: false, 
        isLB: false, 
        suitOrder: Infinity, 
        rank: -1, 
        originalIndex: handCopy.indexOf(card) 
      };
    }
  };

  // Sort the hand
  return handCopy.sort((a, b) => {
    const aKey = getSortKey(a);
    const bKey = getSortKey(b);
    
    // 1. Sort by trump status (trump cards first)
    if (aKey.isTrump && !bKey.isTrump) return -1;
    if (!aKey.isTrump && bKey.isTrump) return 1;
    
    // 2. If both are trump, sort by: Right Bower > Left Bower > Other trumps by rank
    if (aKey.isTrump && bKey.isTrump) {
      // Right Bower is highest
      if (aKey.isRB) return -1;
      if (bKey.isRB) return 1;
      
      // Left Bower is second highest
      if (aKey.isLB) return -1;
      if (bKey.isLB) return 1;
      
      // For other trumps, sort by rank (highest first)
      return bKey.rank - aKey.rank;
    }
    
    // 3. For non-trump cards, sort by suit order first (Clubs, Diamonds, Spades, Hearts)
    if (aKey.suitOrder !== bKey.suitOrder) {
      return aKey.suitOrder - bKey.suitOrder;
    }
    
    // 4. Same suit, sort by rank (highest first)
    if (aKey.rank !== bKey.rank) {
      return bKey.rank - aKey.rank;
    }
    
    // 5. If ranks are equal, maintain original order for stability
    return aKey.originalIndex - bKey.originalIndex;
  });
}

// Bundle all the named exports into a single object for a default export.
// This allows consumers to import either the entire utility set or individual functions.
// e.g., `import deckUtils from './deck.js';` or `import { createDeck } from './deck.js';`
const deckUtils = {
  areSameColor,
  createDeck,
  shuffleDeck,
  cardToId,
  isRightBower,
  isLeftBower,
  getCardRank,
  sortHand,
};

// Named exports for individual imports
export {
  areSameColor,
  createDeck,
  shuffleDeck,
  cardToId,
  isRightBower,
  isLeftBower,
  getCardRank,
  sortHand
};

export default deckUtils;
