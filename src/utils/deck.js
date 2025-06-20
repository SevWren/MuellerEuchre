/**
 * Utility functions for Euchre deck and card manipulations.
 * @module deck
 */
import { SUITS, VALUES, CARD_RANKS } from '../config/constants.js';
import logger from './logger.js';

/**
 * Gets the color of a suit.
 * @param {string} suit - The suit (e.g., 'hearts', 'spades').
 * @returns {string} 'red' or 'black'.
 * @private
 */
function getSuitColor(suit) {
  if (suit === 'hearts' || suit === 'diamonds') {
    return 'red';
  }
  return 'black';
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
    '9': 'Nine', '10': 'Ten', 'J': 'Jack', 'Q': 'Queen', 'K': 'King', 'A': 'Ace'
  };
  const suitToChar = {
    'hearts': 'H', 'diamonds': 'D', 'clubs': 'C', 'spades': 'S'
  };

  for (const suit of Object.values(SUITS)) { // Iterate over values if SUITS is an object
    for (const value of VALUES) {
      deck.push({
        suit: suit,
        value: value,
        id: `${value}${suitToChar[suit]}`, // e.g., AH, 9S
        name: `${valueToName[value]} of ${suit.charAt(0).toUpperCase() + suit.slice(1)}` // e.g. Ace of Hearts
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
 * @param {object} card - The card object.
 * @param {string} card.suit - The suit of the card (e.g., 'hearts').
 * @param {string} card.value - The rank/value of the card (e.g., 'K', '9').
 * @returns {string} The string representation of the card (e.g., 'KH'), or '??' if card is invalid.
 */
export function cardToId(card) {
  if (!card || !card.suit || !card.value) {
    logger.warn({ card }, 'Invalid card object passed to cardToId');
    return '??';
  }
   const suitToChar = {
    'hearts': 'H', 'diamonds': 'D', 'clubs': 'C', 'spades': 'S'
  };
  return `${card.value}${suitToChar[card.suit]}`;
}


/**
 * Checks if a card is the Right Bower.
 * The Right Bower is the Jack of the trump suit.
 * @param {object} card - The card object.
 * @param {string} card.suit - The suit of the card.
 * @param {string} card.value - The rank/value of the card.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {boolean} True if the card is the Right Bower.
 */
export function isRightBower(card, trumpSuit) {
  return card && card.value === 'J' && card.suit === trumpSuit;
}

/**
 * Checks if a card is the Left Bower.
 * The Left Bower is the Jack of the suit of the same color as trump.
 * @param {object} card - The card object.
 * @param {string} card.suit - The suit of the card.
 * @param {string} card.value - The rank/value of the card.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {boolean} True if the card is the Left Bower.
 */
export function isLeftBower(card, trumpSuit) {
  if (!card || card.value !== 'J' || !trumpSuit) return false;
  if (card.suit === trumpSuit) return false; // Not the Right Bower
  return getSuitColor(card.suit) === getSuitColor(trumpSuit);
}

/**
 * Calculates the rank of a card for trick evaluation or general power comparison.
 * Higher numbers indicate higher rank. Considers Right Bower, Left Bower, other trumps,
 * cards of the led suit (if provided), and off-suit cards.
 *
 * @param {object} card - The card object.
 * @param {string} card.suit - The suit of the card.
 * @param {string} card.value - The rank/value of the card.
 * @param {string} trumpSuit - The current trump suit.
 * @param {string} [ledSuit=null] - The suit that was led in the current trick.
 * If `null`, the card's on-suit status (if not trump) is not prioritized as if following suit.
 * @returns {number} The numerical rank of the card. Returns 0 if arguments are invalid.
 */
export function getCardRank(card, trumpSuit, ledSuit = null) {
  if (!card || !card.value || !card.suit || !trumpSuit) {
    logger.error({ card, trumpSuit, ledSuit }, 'Invalid arguments for getCardRank');
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
 * Sorts a player's hand for UI display or consistent ordering.
 * The general sorting order is:
 * 1. Trump cards: Right Bower, Left Bower, then Ace down to Nine of trump.
 * 2. Non-trump cards: Grouped by a defined suit order (e.g., Spades, Clubs, Diamonds, Hearts, excluding trump),
 *    and then ranked from Ace down to Nine within each suit.
 * This function returns a new sorted array and does not mutate the original hand.
 *
 * @param {Array<object>} hand - The player's hand, an array of card objects.
 * Each card object should have `suit` and `value` properties.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {Array<object>} A new array containing the sorted hand. Returns an empty array if hand is invalid,
 * or a basic rank-sorted hand if `trumpSuit` is not provided.
 */
export function sortHand(hand, trumpSuit) {
  if (!hand || !Array.isArray(hand)) return [];
  if (!trumpSuit) return [...hand].sort((a, b) => (b.value_rank || 0) - (a.value_rank || 0)); // Basic sort if no trump

  // Define a suit order for non-trump suits (e.g., Spades, Clubs, Diamonds, Hearts)
  // This helps in grouping suits consistently.
  const suitOrder = { [trumpSuit]: 0 };
  let orderIndex = 1;
  for (const s of ['spades', 'clubs', 'diamonds', 'hearts']) { // Example non-trump order
    if (s !== trumpSuit) {
      suitOrder[s] = orderIndex++;
    }
  }
  // Ensure any unexpected suit gets a high order
  const getSuitOrder = (suit) => suitOrder[suit] !== undefined ? suitOrder[suit] : 99;


  return [...hand].sort((a, b) => {
    const aIsTrump = isRightBower(a, trumpSuit) || isLeftBower(a, trumpSuit) || a.suit === trumpSuit;
    const bIsTrump = isRightBower(b, trumpSuit) || isLeftBower(b, trumpSuit) || b.suit === trumpSuit;

    // Rank for Bowers within trump
    const rankA = getCardRank(a, trumpSuit, null); // ledSuit null as we only care about general power here
    const rankB = getCardRank(b, trumpSuit, null);

    if (aIsTrump && !bIsTrump) return -1; // a (trump) comes before b (non-trump)
    if (!aIsTrump && bIsTrump) return 1;  // b (trump) comes before a (non-trump)

    if (aIsTrump && bIsTrump) { // Both are trump
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
