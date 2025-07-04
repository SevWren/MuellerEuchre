// All files / utils deck.js
// 88.98% Statements 199/220  88.89% Branches  32/36  87.50% Functions  7/8  88.98% Lines  199/220

//TODO:  REWORK FILE to use ESMOCK and DO NOT USE PROXYQUIRE

/**
 * Utility functions for Euchre deck and card manipulations.
 * @module deck
 */
import { SUITS, VALUES, CARD_RANKS } from "../config/constants.js";
import logger from "./logger.js";

/**
 * Gets the color of a suit.
 * @param {string} suit - The suit (e.g., 'hearts', 'spades').
 * @returns {string} 'red' or 'black'.
 * @private
 */
function getSuitColor(suit) {
  if (suit === "hearts" || suit === "diamonds") {
    return "red";
  }
  return "black";
}

/**
 * Creates a standard 24-card Euchre deck.
 * Each card is an object: { suit: string, value: string, id: string, name: string }
 * id is like 'KH' (King of Hearts), name is like 'King of Hearts'.
 * @returns {Array<object>} The deck of cards.
 */
export function createDeck() {
  const deck = [];
  const valueToName = {
    9: "Nine",
    10: "Ten",
    J: "Jack",
    Q: "Queen",
    K: "King",
    A: "Ace",
  };
  const suitToChar = {
    hearts: "H",
    diamonds: "D",
    clubs: "C",
    spades: "S",
  };

  for (const suit of Object.values(SUITS)) {
    // Iterate over values if SUITS is an object
    for (const value of VALUES) {
      deck.push({
        suit: suit,
        value: value,
        id: `${value}${suitToChar[suit]}`, // e.g., AH, 9S
        name: `${valueToName[value]} of ${suit.charAt(0).toUpperCase() + suit.slice(1)}`, // e.g. Ace of Hearts
      });
    }
  }
  return deck;
}

/**
 * Shuffles a deck of cards using the Fisher-Yates algorithm.
 * Returns a new shuffled array, does not mutate the original.
 * @param {Array<object>} deck - The deck to shuffle.
 * @returns {Array<object>} A new array with the cards shuffled.
 */
export function shuffleDeck(deck) {
  const newDeck = [...deck]; // Create a copy
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
}

/**
 * Formats a card object into a concise string ID (e.g., "KH", "9S").
 * @param {object} card - The card object { suit, value }.
 * @returns {string} The string representation of the card.
 */
export function cardToId(card) {
  if (!card || !card.suit || !card.value) {
    logger.warn({ card }, "Invalid card object passed to cardToId");
    return "??";
  }
  const suitToChar = {
    hearts: "H",
    diamonds: "D",
    clubs: "C",
    spades: "S",
  };
  return `${card.value}${suitToChar[card.suit]}`;
}

/**
 * Checks if a card is the Right Bower.
 * The Right Bower is the Jack of the trump suit.
 * @param {object} card - The card object { suit, value }.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {boolean} True if the card is the Right Bower.
 */
export function isRightBower(card, trumpSuit) {
  return card && card.value === "J" && card.suit === trumpSuit;
}

/**
 * Checks if a card is the Left Bower.
 * The Left Bower is the Jack of the suit of the same color as trump.
 * @param {object} card - The card object { suit, value }.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {boolean} True if the card is the Left Bower.
 */
export function isLeftBower(card, trumpSuit) {
  if (!card || card.value !== "J" || !trumpSuit) return false;
  if (card.suit === trumpSuit) return false; // Not the Right Bower
  return getSuitColor(card.suit) === getSuitColor(trumpSuit);
}

/**
 * Calculates the rank of a card for trick evaluation.
 * Higher numbers indicate higher rank.
 * @param {object} card - The card object { suit, value }.
 * @param {string} trumpSuit - The current trump suit.
 * @param {string} [ledSuit] - The suit that was led in the current trick. If null, assumes not following suit.
 * @returns {number} The rank of the card.
 */
export function getCardRank(card, trumpSuit, ledSuit = null) {
  if (!card || !card.value || !card.suit || !trumpSuit) {
    logger.error(
      { card, trumpSuit, ledSuit },
      "Invalid arguments for getCardRank",
    );
    return 0;
  }

  let baseRank = CARD_RANKS[card.value.toUpperCase()] || 0;
  const effectiveSuit = isLeftBower(card, trumpSuit) ? trumpSuit : card.suit;

  // Is it trump?
  if (isRightBower(card, trumpSuit)) {
    return 200 + CARD_RANKS.JACK; // Specific high rank for Right Bower
  }
  if (isLeftBower(card, trumpSuit)) {
    return 190 + CARD_RANKS.JACK; // Specific high rank for Left Bower
  }
  if (effectiveSuit === trumpSuit) {
    return 100 + baseRank; // Other trump cards
  }

  // Not trump, is it the led suit?
  if (ledSuit && card.suit === ledSuit) {
    return 50 + baseRank; // On-suit, not trump
  }

  // Off-suit, not trump
  return baseRank; // Lowest category
}

/**
 * Sorts a player's hand. Primarily for UI display.
 * Order: Trump (Bowers first, then A-9), then other suits by a defined order (e.g., color, then specific suit order), then by rank within suit.
 * This is a suggested sorting, can be adapted.
 * @param {Array<object>} hand - The player's hand (array of card objects).
 * @param {string} trumpSuit - The current trump suit.
 * @returns {Array<object>} A new array with the hand sorted.
 */
export function sortHand(hand, trumpSuit) {
  if (!hand || !Array.isArray(hand)) return [];
  if (!trumpSuit)
    return [...hand].sort((a, b) => (b.value_rank || 0) - (a.value_rank || 0)); // Basic sort if no trump

  // Define a suit order for non-trump suits (e.g., Spades, Clubs, Diamonds, Hearts)
  // This helps in grouping suits consistently.
  const suitOrder = { [trumpSuit]: 0 };
  let orderIndex = 1;
  for (const s of ["spades", "clubs", "diamonds", "hearts"]) {
    // Example non-trump order
    if (s !== trumpSuit) {
      suitOrder[s] = orderIndex++;
    }
  }
  // Ensure any unexpected suit gets a high order
  const getSuitOrder = (suit) =>
    suitOrder[suit] !== undefined ? suitOrder[suit] : 99;

  return [...hand].sort((a, b) => {
    const aIsTrump =
      isRightBower(a, trumpSuit) ||
      isLeftBower(a, trumpSuit) ||
      a.suit === trumpSuit;
    const bIsTrump =
      isRightBower(b, trumpSuit) ||
      isLeftBower(b, trumpSuit) ||
      b.suit === trumpSuit;

    // Rank for Bowers within trump
    const rankA = getCardRank(a, trumpSuit, null); // ledSuit null as we only care about general power here
    const rankB = getCardRank(b, trumpSuit, null);

    if (aIsTrump && !bIsTrump) return -1; // a (trump) comes before b (non-trump)
    if (!aIsTrump && bIsTrump) return 1; // b (trump) comes before a (non-trump)

    if (aIsTrump && bIsTrump) {
      // Both are trump
      return rankB - rankA; // Higher rank first
    }

    // Neither is trump, sort by suit order then by rank
    const suitOrderA = getSuitOrder(a.suit);
    const suitOrderB = getSuitOrder(b.suit);

    if (suitOrderA !== suitOrderB) {
      return suitOrderA - suitOrderB;
    }

    // Same suit (non-trump), sort by rank
    return rankB - rankA; // Higher rank first
  });
}
