/**
 * @module game/logic/aiLogic
 * @description
 * Pure, stateless AI logic for Euchre game decisions.
 * 
 * This module provides deterministic AI functionality for the Euchre game,
 * implementing standard Euchre strategies for bidding and card play.
 * All functions are pure (same input always produces same output) and have no side effects.
 *
 * @example
 * // Basic usage in game flow
 * const aiDecision = chooseBid(playerHand, turnCard, isDealer, previousBids);
 * const cardToPlay = chooseCardToPlay(playerHand, currentTrick, trumpSuit, leadSuit);
 *
 * @see {@link module:game/phases/playingPhase} Where AI decisions are integrated
 * @see {@link module:game/phases/biddingPhase} Where AI bidding is integrated
 */

import { getEffectiveSuit } from './validation.js';
import { isLeftBower } from '../../utils/deck.js';


/**
 * Point values for card evaluation in AI decision making.
 * These values are used to calculate the strength of a hand for bidding and play decisions.
 * @constant {Object} POINTS
 * @property {number} RIGHT_BOWER - Value for the right bower (Jack of trump suit)
 * @property {number} LEFT_BOWER - Value for the left bower (Jack of same color as trump)
 * @property {number} TRUMP_ACE - Value for Ace of trump suit
 * @property {number} TRUMP_KING - Value for King of trump suit
 * @property {number} TRUMP_QUEEN - Value for Queen of trump suit
 * @property {number} TRUMP_TEN - Value for 10 of trump suit
 * @property {number} TRUMP_NINE - Value for 9 of trump suit
 */
const POINTS = {
  RIGHT_BOWER: 15,
  LEFT_BOWER: 10,
  TRUMP_ACE: 7,
  TRUMP_KING: 5,
  TRUMP_QUEEN: 3,
  TRUMP_TEN: 1,
  TRUMP_NINE: 1,
};

/**
 * Minimum hand strength required for the AI to consider making a bid.
 * This threshold is used in the bidding strategy to determine if the AI should bid
 * based on the calculated strength of their hand.
 * @constant {number} BID_THRESHOLD
 */
const BID_THRESHOLD = 20;

/**
 * Counts the number of trump cards in a player's hand.
 * A card is considered trump if it matches the trump suit or is the left bower.
 *
 * @function countTrumpInHand
 * @param {Array<object>} hand - The player's hand as an array of card objects.
 *        Each card should have `suit` and `rank` properties.
 * @param {string} trumpSuit - The current trump suit (e.g., 'hearts', 'spades').
 * @returns {number} The count of trump cards in the hand. Returns 0 for invalid input.
 *
 * @example
 * const hand = [
 *   { suit: 'hearts', rank: 'J' },  // Right bower if trump is hearts
 *   { suit: 'diamonds', rank: 'J' } // Left bower if trump is hearts
 * ];
 * const trumpCount = countTrumpInHand(hand, 'hearts'); // Returns 2
 *
 * @see findBowers For identifying bowers in the hand
 * @see getSuitColor Used internally to identify left bower
 */
function countTrumpInHand(hand, trumpSuit) {
  if (!Array.isArray(hand)) return 0;
  return hand.filter(
    (card) =>
      card.suit === trumpSuit ||
      (card.rank === "J" &&
        getSuitColor(card.suit) === getSuitColor(trumpSuit)),
  ).length;
}

/**
 * Identifies if the right and left bowers are present in the hand for a given trump suit.
 * 
 * In Euchre, the right bower is the Jack of the trump suit, and the left bower is the
 * Jack of the same color as the trump suit (e.g., if trump is hearts, left bower is Jack of diamonds).
 *
 * @function findBowers
 * @param {Array<object>} hand - The player's hand as an array of card objects.
 *        Each card should have `suit` and `rank` properties.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {object} An object with two boolean properties:
 *          - `rightBower`: `true` if the right bower is in the hand
 *          - `leftBower`: `true` if the left bower is in the hand
 *
 * @example
 * const hand = [
 *   { suit: 'hearts', rank: 'J' },  // Right bower if trump is hearts
 *   { suit: 'diamonds', rank: 'J' } // Left bower if trump is hearts
 * ];
 * const bowers = findBowers(hand, 'hearts');
 * // Returns { rightBower: true, leftBower: true }
 *
 * @see countTrumpInHand For counting all trump cards in the hand
 * @see POINTS For point values assigned to bowers
 */
function findBowers(hand, trumpSuit) {
  if (!Array.isArray(hand)) return { rightBower: false, leftBower: false };

  const rightBower = hand.some(
    (card) => card.rank === "J" && card.suit === trumpSuit,
  );

  const leftBower = hand.some(
    (card) =>
      card.rank === "J" &&
      card.suit !== trumpSuit &&
      getSuitColor(card.suit) === getSuitColor(trumpSuit),
  );

  return { rightBower, leftBower };
}

/**
 * Calculates point value for cards in hand matching given suit
 * @param {Array<object>} hand - Array of card objects
 * @param {string} suit - Suit to evaluate
 * @returns {number} Total point value
 */
function calculatePointsForSuit(hand, suit) {
  if (!Array.isArray(hand)) return 0;

  const TRUMP_POINTS_MAP = {
    A: POINTS.TRUMP_ACE,
    K: POINTS.TRUMP_KING,
    Q: POINTS.TRUMP_QUEEN,
    10: POINTS.TRUMP_TEN,
    9: POINTS.TRUMP_NINE,
  };

  return hand.reduce((total, card) => {
    const effectiveSuit = getEffectiveSuit(card, suit);
    if (effectiveSuit !== suit) return total;

    switch (card.rank) {
      case 'J':
        return total + (isLeftBower(card, suit) ? POINTS.LEFT_BOWER : 0);
      case 'A':
        return total + POINTS.TRUMP_ACE;
      case 'K':
        return total + POINTS.TRUMP_KING;
      case 'Q':
        return total + POINTS.TRUMP_QUEEN;
      case "10":
        return total + POINTS.TRUMP_TEN;
      case "9":
        return total + POINTS.TRUMP_NINE;
      default:
        return total;
    }
  }, 0);
}

/**
 * Evaluates the strength of a hand for a potential trump suit.
 * This is an internal helper function used by the AI to make bidding decisions.
 *
 * @private
 * @function _evaluateHand
 * @param {Array<object>} hand - The player's hand as an array of card objects.
 * @param {string} potentialTrump - The potential trump suit to evaluate against.
 * @returns {number} A numerical score representing the strength of the hand
 *          for the given trump suit. Higher scores indicate stronger hands.
 *          Returns 0 if the hand is empty or not an array.
 *
 * @example
 * const hand = [
 *   { suit: 'hearts', rank: 'J' },  // Right bower
 *   { suit: 'diamonds', rank: 'J' }, // Left bower
 *   { suit: 'hearts', rank: 'A' }   // Trump ace
 * ];
 * const score = _evaluateHand(hand, 'hearts');
 * // Returns: RIGHT_BOWER + LEFT_BOWER + TRUMP_ACE + trump count bonus
 *
 * @see calculatePointsForSuit Used to calculate base points for the trump suit
 * @see findBowers Used to identify bowers in the hand
 * @see countTrumpInHand Used to count total trump cards for bonus calculation
 */
function _evaluateHand(hand, potentialTrump) {
  if (!Array.isArray(hand) || hand.length === 0) return 0;
  if (typeof potentialTrump !== "string") return 0;
  
  let score = calculatePointsForSuit(hand, potentialTrump);
  const { rightBower, leftBower } = findBowers(hand, potentialTrump);
  
  if (rightBower) {
    score += POINTS.RIGHT_BOWER;
  }
  if (leftBower) {
    score += POINTS.LEFT_BOWER;
  }

  return score;
}

/**
 * Helper to get color of a suit (red or black)
 * @param {string} suit
 * @returns {'red'|'black'} Color of the suit
 */
function getSuitColor(suit) {
  const redSuits = ["hearts", "diamonds"];
  return redSuits.includes(suit) ? "red" : "black";
}

/**
 * Determines AI's bidding decision based on hand strength.
 * @param {Array<object>} hand - Array of card objects
 * @param {object} turnCard - Current turn card object
 * @param {boolean} isDealer - Whether AI is the dealer
 * @param {Array<object>} [bids=[]] - Array of previous bids in current round
 * @returns {object} Decision object {decision: string, suit?: string}
 */
function chooseBid(hand, turnCard, isDealer, bids = []) {
  if (!Array.isArray(hand) || hand.length === 0 || !turnCard) {
    return { decision: "pass" };
  }

  // Round 1: Evaluate turn card suit
  const turnCardScore = _evaluateHand(hand, turnCard.suit);
  if (turnCardScore >= BID_THRESHOLD) {
    return { decision: "orderUp" };
  }

  // Round 2: Evaluate other suits if everyone passed in round 1
  if (bids.every((bid) => bid.decision === "pass")) {
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const otherSuits = suits.filter((s) => s !== turnCard.suit);

    let bestSuit = null;
    let highestScore = 0;

    otherSuits.forEach((suit) => {
      const score = _evaluateHand(hand, suit);
      if (score > highestScore) {
        highestScore = score;
        bestSuit = suit;
      }
    });

    if (highestScore >= BID_THRESHOLD) {
      return { decision: "callTrump", suit: bestSuit };
    }
  }

  return { decision: "pass" };
}

/**
 * Gets the numeric value of a card based on trump suit
 * @param {object} card - Card object
 * @param {string} trumpSuit - Current trump suit
 * @returns {number} Numeric value of card
 */
function getCardValue(card, trumpSuit) {
  if (card.suit === trumpSuit) {
    if (card.rank === "J") return 100; // Right bower
    if (card.rank === "A") return 80;
    if (card.rank === "K") return 70;
    if (card.rank === "Q") return 60;
    if (card.rank === "10") return 40;
    if (card.rank === "9") return 30;
  }

  if (
    card.rank === "J" &&
    getSuitColor(card.suit) === getSuitColor(trumpSuit)
  ) {
    return 90; // Left bower
  }

  // Non-trump cards
  if (card.rank === "A") return 80;
  if (card.rank === "K") return 70;
  if (card.rank === "Q") return 60;
  if (card.rank === "J") return 50;
  if (card.rank === "10") return 40;
  if (card.rank === "9") return 30;

  return 0;
}

/**
 * Gets the current winning card in the trick
 * @param {Array<object>} trick - Array of cards in current trick
 * @param {string} trumpSuit - Current trump suit
 * @param {string} leadSuit - Lead suit of current trick
 * @returns {object|null} Winning card or null if empty trick
 */
function getWinningCard(trick, trumpSuit, leadSuit) {
  if (trick.length === 0) return null;

  let winningCard = trick[0];
  let winningValue = getCardValue(winningCard, trumpSuit);

  for (let i = 1; i < trick.length; i++) {
    const currentValue = getCardValue(trick[i], trumpSuit);
    if (currentValue > winningValue) {
      winningCard = trick[i];
      winningValue = currentValue;
    }
  }

  return winningCard;
}

/**
 * Gets the lowest value card from a hand
 * @param {Array<object>} cards - Array of card objects
 * @param {string} trumpSuit - Current trump suit
 * @returns {object|null} Lowest value card or null if empty
 */
function getLowestCard(cards, trumpSuit) {
  if (!Array.isArray(cards) || cards.length === 0) return null;

  let lowestCard = cards[0];
  let lowestValue = getCardValue(lowestCard, trumpSuit);

  for (let i = 1; i < cards.length; i++) {
    const currentValue = getCardValue(cards[i], trumpSuit);
    if (currentValue < lowestValue) {
      lowestCard = cards[i];
      lowestValue = currentValue;
    }
  }

  return lowestCard;
}

/**
 * Chooses a card for AI to play based on current trick state.
 * @param {Array<object>} hand - Array of card objects
 * @param {Array<object>} [currentTrick=[]] - Array of cards played in current trick
 * @param {string} trumpSuit - Current trump suit
 * @param {string} leadSuit - Lead suit of current trick
 * @returns {object|null} Selected card object or null if invalid input
 */
function chooseCardToPlay(hand, currentTrick = [], trumpSuit, leadSuit) {
  if (!Array.isArray(hand) || hand.length === 0) {
    return null;
  }

  // If leading (first to play in trick)
  if (currentTrick.length === 0) {
    // If only trump cards, play lowest trump
    const trumpCards = hand.filter(
      (card) =>
        card.suit === trumpSuit ||
        (card.rank === "J" &&
          getSuitColor(card.suit) === getSuitColor(trumpSuit)),
    );

    if (trumpCards.length === hand.length) {
      return getLowestCard(trumpCards, trumpSuit);
    }

    // Otherwise play lowest non-trump card
    return getLowestCard(hand, trumpSuit);
  }

  // If not leading, must follow suit if able
  const cardsInSuit = hand.filter((card) => {
    if (
      card.rank === "J" &&
      getSuitColor(card.suit) === getSuitColor(trumpSuit)
    ) {
      return leadSuit === trumpSuit; // Left bower counts as trump
    }
    return card.suit === leadSuit;
  });

  if (cardsInSuit.length > 0) {
    // Try to win the trick if possible
    const winningCard = getWinningCard(currentTrick, trumpSuit, leadSuit);
    if (winningCard) {
      const cardToBeat = getCardValue(winningCard, trumpSuit);
      const playableCards = cardsInSuit.filter(
        (card) => getCardValue(card, trumpSuit) > cardToBeat,
      );

      if (playableCards.length > 0) {
        return getLowestCard(playableCards, trumpSuit);
      }
    }
    // Otherwise play lowest card in suit
    return getLowestCard(cardsInSuit, trumpSuit);
  }

  // Can't follow suit - slough lowest card
  return getLowestCard(hand, trumpSuit);
}

// Export all public functions
export {
  countTrumpInHand,
  findBowers,
  calculatePointsForSuit,
  _evaluateHand,
  getSuitColor,
  chooseBid,
  getCardValue,
  getWinningCard,
  getLowestCard,
  chooseCardToPlay
};
