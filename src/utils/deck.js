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
  SUIT_TO_CHAR_MAP,
  VALUE_TO_CHAR_MAP,
  VALUE_TO_NAME_MAP,
  SUIT_TO_NAME_MAP,
  SUIT_CONSTANT_TO_NAME_MAP
} from "./cardUtils.js";

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