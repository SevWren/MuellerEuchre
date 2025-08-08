// TODO: Fully JSDoc
// TODO: Improve decision making logic
// 8-3-25 - Currently 100% Coverage

/**
 * @module game/logic/aiLogic
 * @description
 * AI decision-making logic for the Euchre game (Layer 1).
 * 
 * This module contains pure functions that implement the AI player's decision-making
 * process for the Euchre card game. It handles card selection for both bidding and
 * playing phases, following standard Euchre strategies.
 * 
 * The AI uses a points-based evaluation system to determine the strength of its hand
 * and makes decisions based on the current game state, including the trick history,
 * trump suit, and cards played by other players.
 * 
 * @see {@link module:utils/cardUtils} For card utility functions
 * @see {@link module:config/constants} For game constants and enums
 * @see {@link module:game/logic/validation-core} For game validation rules
 */

import {
  isLeftBower,
  getEffectiveSuit,
  normalizeSuit,
} from "../../utils/cardUtils.js";
import { CARD_SUITS } from "../../config/constants.js";

/**
 * Point values assigned to trump cards for hand strength calculation.
 * Higher values indicate stronger cards in the context of Euchre.
 * @constant {Object<string, number>}
 * @property {number} RIGHT_BOWER - Points for the Jack of trump suit (15)
 * @property {number} LEFT_BOWER - Points for the Jack of same color as trump (10)
 * @property {number} TRUMP_ACE - Points for Ace of trump suit (7)
 * @property {number} TRUMP_KING - Points for King of trump suit (5)
 * @property {number} TRUMP_QUEEN - Points for Queen of trump suit (3)
 * @property {number} TRUMP_TEN - Points for 10 of trump suit (1)
 * @property {number} TRUMP_NINE - Points for 9 of trump suit (1)
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
 * Relative values assigned to cards for AI decision making.
 * These values are used to compare cards when making strategic decisions.
 * @constant {Object<string, number>}
 * @property {number} TRUMP_RIGHT_BOWER - Value for the Jack of trump suit (100)
 * @property {number} TRUMP_LEFT_BOWER - Value for the Jack of same color as trump (90)
 * @property {number} TRUMP_ACE - Value for Ace of trump suit (80)
 * @property {number} TRUMP_KING - Value for King of trump suit (70)
 * @property {number} TRUMP_QUEEN - Value for Queen of trump suit (60)
 * @property {number} TRUMP_TEN - Value for 10 of trump suit (40)
 * @property {number} TRUMP_NINE - Value for 9 of trump suit (30)
 * @property {number} OFFSUIT_ACE - Value for off-suit Ace (20)
 * @property {number} OFFSUIT_KING - Value for off-suit King (18)
 * @property {number} OFFSUIT_QUEEN - Value for off-suit Queen (16)
 * @property {number} OFFSUIT_JACK - Value for off-suit Jack (14)
 * @property {number} OFFSUIT_TEN - Value for off-suit 10 (12)
 * @property {number} OFFSUIT_NINE - Value for off-suit 9 (10)
 * @property {number} INVALID - Value for invalid cards (0)
 */
const AI_CARD_VALUES = {
  TRUMP_RIGHT_BOWER: 100,
  TRUMP_LEFT_BOWER: 90,
  TRUMP_ACE: 80,
  TRUMP_KING: 70,
  TRUMP_QUEEN: 60,
  TRUMP_TEN: 40,
  TRUMP_NINE: 30,
  OFFSUIT_ACE: 20,
  OFFSUIT_KING: 18,
  OFFSUIT_QUEEN: 16,
  OFFSUIT_JACK: 14,
  OFFSUIT_TEN: 12,
  OFFSUIT_NINE: 10,
  INVALID: 0,
};

/**
 * Minimum hand strength required to consider ordering up or calling trump.
 * This threshold determines how strong a hand must be for the AI to make a bid.
 * @constant {number}
 */
const BID_THRESHOLD = 20;

/**
 * Maps card values to their corresponding AI values when they are in the trump suit.
 * Used to quickly look up the strategic value of a trump card.
 * @constant {Object<string, number>}
 */
const TRUMP_VALUE_MAP = {
  J: AI_CARD_VALUES.TRUMP_RIGHT_BOWER,
  A: AI_CARD_VALUES.TRUMP_ACE,
  K: AI_CARD_VALUES.TRUMP_KING,
  Q: AI_CARD_VALUES.TRUMP_QUEEN,
  "10": AI_CARD_VALUES.TRUMP_TEN,
  "9": AI_CARD_VALUES.TRUMP_NINE,
};

/**
 * Maps card values to their corresponding AI values when they are off-suit.
 * Used to quickly look up the strategic value of a non-trump card.
 * @constant {Object<string, number>}
 */
const OFFSUIT_VALUE_MAP = {
  A: AI_CARD_VALUES.OFFSUIT_ACE,
  K: AI_CARD_VALUES.OFFSUIT_KING,
  Q: AI_CARD_VALUES.OFFSUIT_QUEEN,
  J: AI_CARD_VALUES.OFFSUIT_JACK,
  "10": AI_CARD_VALUES.OFFSUIT_TEN,
  "9": AI_CARD_VALUES.OFFSUIT_NINE,
};

/**
 * Counts the number of trump cards in a player's hand.
 * 
 * @param {Array<Object>} hand - The player's hand, an array of card objects
 * @param {string} trumpSuit - The current trump suit
 * @returns {number} The count of trump cards in the hand
 * @example
 * const hand = [{ suit: 'HEARTS', value: 'A' }, { suit: 'SPADES', value: 'J' }];
 * const trumpCount = countTrumpInHand(hand, 'HEARTS'); // Returns 1
 */
function countTrumpInHand(hand, trumpSuit) {
  if (!Array.isArray(hand)) return 0;
  return hand.filter((card) => {
    if (!card || !card.suit || !card.value) return false;
    return getEffectiveSuit(card, trumpSuit) === trumpSuit;
  }).length;
}

/**
 * Calculates the total strength of a hand based on trump cards.
 * 
 * The strength is calculated by assigning point values to each trump card in the hand.
 * Non-trump cards do not contribute to the hand strength.
 *
 * @param {Array<Object>} hand - The player's hand, an array of card objects
 * @param {string} trumpSuit - The current trump suit
 * @returns {number} The total strength of the hand (higher is stronger)
 * @see POINTS For the point values assigned to each card
 * @example
 * const hand = [
 *   { suit: 'HEARTS', value: 'J' }, // Right bower = 15
 *   { suit: 'DIAMONDS', value: 'J' }, // Left bower = 10
 *   { suit: 'HEARTS', value: 'A' } // Trump ace = 7
 * ];
 * const strength = calculateHandStrength(hand, 'HEARTS'); // Returns 32
 */
function calculateHandStrength(hand, trumpSuit) {
  if (!Array.isArray(hand)) return 0;

  return hand.reduce((total, card) => {
    if (!card || !card.suit || !card.value) {
      return total;
    }

    if (getEffectiveSuit(card, trumpSuit) !== trumpSuit) {
      return total;
    }

    if (card.value === "J") {
      if (card.suit === trumpSuit) {
        return total + POINTS.RIGHT_BOWER;
      }
      return total + POINTS.LEFT_BOWER;
    }

    switch (card.value) {
      case "A": return total + POINTS.TRUMP_ACE;
      case "K": return total + POINTS.TRUMP_KING;
      case "Q": return total + POINTS.TRUMP_QUEEN;
      case "10": return total + POINTS.TRUMP_TEN;
      case "9": return total + POINTS.TRUMP_NINE;
      default: return total;
    }
  }, 0);
}

/**
 * Evaluates the strength of a hand with a potential trump suit.
 * This is a wrapper around calculateHandStrength with input validation.
 * 
 * @private
 * @param {Array<Object>} hand - The player's hand, an array of card objects
 * @param {string} potentialTrump - The potential trump suit to evaluate
 * @returns {number} The strength of the hand with the given trump suit, or 0 if inputs are invalid
 */
function _evaluateHand(hand, potentialTrump) {
  if (!Array.isArray(hand) || hand.length === 0) return 0;
  if (typeof potentialTrump !== "string") return 0;
  return calculateHandStrength(hand, potentialTrump);
}

/**
 * Finds the best suit to call as trump from a list of possible suits.
 * 
 * @private
 * @param {Array<Object>} hand - The player's hand, an array of card objects
 * @param {Array<string>} suitsToConsider - Array of suit strings to evaluate
 * @returns {Object} An object containing the best suit and its score
 * @property {string|null} suit - The best suit found, or null if no suits provided
 * @property {number} score - The strength score of the best suit
 */
function _findBestSuitToCall(hand, suitsToConsider) {
  return suitsToConsider.reduce((best, suit) => {
    const score = _evaluateHand(hand, suit);
    if (score > best.score) {
      return { suit, score };
    }
    return best;
  }, { suit: null, score: 0 });
}

/**
 * Determines the AI's bid decision based on the current game state.
 * 
 * The AI will order up the turn card if its hand strength with that trump meets or exceeds
 * the BID_THRESHOLD. In the second round of bidding, it will call a different suit if
 * the hand strength with that suit meets the threshold.
 *
 * @param {Array<Object>} hand - The AI's current hand
 * @param {Object} turnCard - The turn card that could be ordered up
 * @param {boolean} isDealer - Whether the AI is the dealer
 * @param {Array<Object>} [bids=[]] - Array of previous bids in the current round
 * @returns {Object} The AI's bid decision
 * @property {string} decision - One of: 'orderUp', 'callTrump', or 'pass'
 * @property {string} [suit] - Required if decision is 'callTrump'
 * @example
 * const hand = [
 *   { suit: 'HEARTS', value: 'J' }, // Right bower
 *   { suit: 'HEARTS', value: 'A' }  // Trump ace
 * ];
 * const turnCard = { suit: 'HEARTS', value: '9' };
 * const bid = chooseBid(hand, turnCard, false, []);
 * // Returns { decision: 'orderUp' }
 */
function chooseBid(hand, turnCard, isDealer, bids = []) {
  if (!Array.isArray(hand) || hand.length === 0 || !turnCard) {
    return { decision: "pass" };
  }

  const turnCardScore = _evaluateHand(hand, turnCard.suit);
  if (turnCardScore >= BID_THRESHOLD) {
    return { decision: "orderUp" };
  }

  const isRoundTwo = bids.length >= 4 && bids.every((bid) => bid.decision === "pass");
  if (isRoundTwo) {
    const suits = Object.values(CARD_SUITS).filter(s => s.startsWith('CARD_SUIT_'));
    const callableSuits = suits.filter((s) => s !== turnCard.suit);
    const { suit: bestSuit, score: highestScore } = _findBestSuitToCall(hand, callableSuits);

    if (highestScore >= BID_THRESHOLD) {
      return { decision: "callTrump", suit: bestSuit };
    }
  }

  return { decision: "pass" };
}

/**
 * Gets the strategic value of a card based on the current trump suit.
 * 
 * The value is determined by the card's rank and whether it's in the trump suit.
 * Special handling is provided for the right and left bowers.
 *
 * @param {Object} card - The card to evaluate
 * @param {string} trumpSuit - The current trump suit
 * @returns {number} The strategic value of the card (higher is better)
 * @see AI_CARD_VALUES For the possible return values
 * @example
 * const card1 = { suit: 'HEARTS', value: 'J' }; // Right bower
 * const card2 = { suit: 'DIAMONDS', value: 'J' }; // Left bower if hearts is trump
 * const trump = 'HEARTS';
 * 
 * getCardValue(card1, trump); // Returns 100 (TRUMP_RIGHT_BOWER)
 * getCardValue(card2, trump); // Returns 90 (TRUMP_LEFT_BOWER)
 */
function getCardValue(card, trumpSuit) {
  if (!card || !card.suit || !card.value) return AI_CARD_VALUES.INVALID;

  if (card.value === "J") {
    if (card.suit === trumpSuit) return AI_CARD_VALUES.TRUMP_RIGHT_BOWER;
    if (isLeftBower(card, trumpSuit)) return AI_CARD_VALUES.TRUMP_LEFT_BOWER;
  }

  if (getEffectiveSuit(card, trumpSuit) === trumpSuit) {
    return TRUMP_VALUE_MAP[card.value] || AI_CARD_VALUES.INVALID;
  }

  return OFFSUIT_VALUE_MAP[card.value] || AI_CARD_VALUES.INVALID;
}

/**
 * Determines the winning card in a trick based on the trump and lead suits.
 * 
 * The winning card is determined by:
 * 1. The highest trump card, if any trumps are played
 * 2. Otherwise, the highest card of the lead suit
 *
 * @param {Array<Object>} trick - The current trick, an array of card objects
 * @param {string} trumpSuit - The current trump suit
 * @param {string} leadSuit - The suit that was led in this trick
 * @returns {Object|null} The winning card, or null if trick is empty
 * @example
 * const trick = [
 *   { suit: 'HEARTS', value: '9' },
 *   { suit: 'HEARTS', value: 'K' },
 *   { suit: 'SPADES', value: 'A' },
 *   { suit: 'CLUBS', value: 'J' } // Left bower if hearts is trump
 * ];
 * const trump = 'HEARTS';
 * const lead = 'HEARTS';
 * const winner = getWinningCard(trick, trump, lead);
 * // Returns { suit: 'CLUBS', value: 'J' } (left bower)
 */
function getWinningCard(trick, trumpSuit, leadSuit) {
  if (!trick || trick.length === 0) return null;

  return trick.reduce((winningCard, currentCard) => {
    if (!currentCard || !currentCard.suit || !currentCard.value) return winningCard;
    if (!winningCard) return currentCard;

    const winningSuit = getEffectiveSuit(winningCard, trumpSuit);
    const currentSuit = getEffectiveSuit(currentCard, trumpSuit);

    if (winningSuit === currentSuit) {
      return getCardValue(currentCard, trumpSuit) > getCardValue(winningCard, trumpSuit)
        ? currentCard
        : winningCard;
    }
    return currentSuit === trumpSuit ? currentCard : winningCard;
  });
}

/**
 * Finds the lowest value card from an array of cards, considering the trump suit.
 * 
 * @param {Array<Object>} cards - The cards to evaluate
 * @param {string} trumpSuit - The current trump suit
 * @returns {Object|null} The lowest value card, or null if no valid cards
 * @example
 * const cards = [
 *   { suit: 'HEARTS', value: 'A' },
 *   { suit: 'SPADES', value: '9' }, // Lowest
 *   { suit: 'HEARTS', value: 'K' }
 * ];
 * const trump = 'HEARTS';
 * const lowest = getLowestCard(cards, trump);
 * // Returns { suit: 'SPADES', value: '9' }
 */
function getLowestCard(cards, trumpSuit) {
  if (!Array.isArray(cards) || cards.length === 0) return null;

  const validCards = cards.filter(c => c && c.suit && c.value);
  if (validCards.length === 0) return null;

  return validCards.reduce((lowestCard, currentCard) => {
    return getCardValue(currentCard, trumpSuit) < getCardValue(lowestCard, trumpSuit)
      ? currentCard
      : lowestCard;
  });
}

/**
 * Determines the best card to lead with when the AI is the first to play in a trick.
 * 
 * Strategy:
 * 1. If all cards are trump, play the lowest trump
 * 2. Otherwise, play the highest non-trump card
 * 3. Fall back to lowest card if no better option is found
 *
 * @private
 * @param {Array<Object>} hand - The AI's current hand
 * @param {string} trumpSuit - The current trump suit
 * @returns {Object|null} The selected card to lead with, or null if hand is empty
 */
function _leadTrick(hand, trumpSuit) {
  const trumpCards = hand.filter(
    (card) => card && card.suit && card.value && getEffectiveSuit(card, trumpSuit) === trumpSuit
  );

  if (trumpCards.length === hand.length) {
    return getLowestCard(trumpCards, trumpSuit);
  }

  const nonTrumpCards = hand.filter(
    (card) => card && card.suit && card.value && getEffectiveSuit(card, trumpSuit) !== trumpSuit
  );

  if (nonTrumpCards.length > 0) {
    return nonTrumpCards.reduce((highest, card) =>
      getCardValue(card, trumpSuit) > getCardValue(highest, trumpSuit)
        ? card
        : highest
    );
  }

  return getLowestCard(hand, trumpSuit);
}

/**
 * Determines the best card to play when following suit in a trick.
 * 
 * Strategy:
 * 1. If possible, play the lowest card that can win the trick
 * 2. Otherwise, play the lowest card of the led suit
 * 3. Returns null if no cards of the led suit are found
 *
 * @private
 * @param {Array<Object>} hand - The AI's current hand
 * @param {Array<Object>} currentTrick - The current trick's cards
 * @param {string} trumpSuit - The current trump suit
 * @param {string} leadSuit - The suit that was led in this trick
 * @returns {Object|null} The selected card to play, or null if cannot follow suit
 */
function _followSuit(hand, currentTrick, trumpSuit, leadSuit) {
  const cardsInSuit = hand.filter((card) => {
    if (!card || !card.suit || !card.value) return false;
    return getEffectiveSuit(card, trumpSuit) === leadSuit;
  });

  if (cardsInSuit.length > 0) {
    const winningCardInTrick = getWinningCard(currentTrick, trumpSuit, leadSuit);
    if (winningCardInTrick) {
      const cardToBeatValue = getCardValue(winningCardInTrick, trumpSuit);

      const winningCardsInHand = cardsInSuit.filter(card => {
        return getCardValue(card, trumpSuit) > cardToBeatValue;
      });

      if (winningCardsInHand.length > 0) {
        return getLowestCard(winningCardsInHand, trumpSuit);
      }
    }
    return getLowestCard(cardsInSuit, trumpSuit);
  }
  return null;
}

/**
 * Selects a card to discard when the AI cannot follow suit.
 * 
 * Strategy:
 * 1. Prefer to discard the lowest non-trump card
 * 2. If only trumps remain, discard the lowest trump
 *
 * @private
 * @param {Array<Object>} hand - The AI's current hand
 * @param {string} trumpSuit - The current trump suit
 * @returns {Object|null} The selected card to discard, or null if hand is empty
 */
function _sloughCard(hand, trumpSuit) {
  const nonTrumpCards = hand.filter(
    (card) => card && card.suit && card.value && getEffectiveSuit(card, trumpSuit) !== trumpSuit
  );

  if (nonTrumpCards.length > 0) {
    return getLowestCard(nonTrumpCards, trumpSuit);
  }

  return getLowestCard(hand, trumpSuit);
}

/**
 * Determines the best card for the AI to play in the current trick.
 * 
 * This is the main entry point for the AI's card selection logic.
 * It delegates to specialized functions based on the game state:
 * - When leading: uses _leadTrick()
 * - When following suit: uses _followSuit()
 * - When unable to follow suit: uses _sloughCard()
 *
 * @param {Array<Object>} hand - The AI's current hand
 * @param {Array<Object>} [currentTrick=[]] - The current trick's cards
 * @param {string} trumpSuit - The current trump suit
 * @param {string} [leadSuit] - The suit that was led in this trick
 * @returns {Object|null} The selected card to play, or null if no valid play
 * @see _leadTrick For leading strategy
 * @see _followSuit For following suit strategy
 * @see _sloughCard For discarding strategy
 * @example
 * const hand = [
 *   { suit: 'HEARTS', value: 'A' },
 *   { suit: 'SPADES', value: '9' },
 *   { suit: 'CLUBS', value: 'J' } // Left bower if hearts is trump
 * ];
 * const trick = [{ suit: 'HEARTS', value: '10' }];
 * const trump = 'HEARTS';
 * const lead = 'HEARTS';
 * const card = chooseCardToPlay(hand, trick, trump, lead);
 * // Returns { suit: 'CLUBS', value: 'J' } (left bower)
 */
function chooseCardToPlay(hand, currentTrick = [], trumpSuit, leadSuit) {
  if (!Array.isArray(hand) || hand.length === 0) {
    return null;
  }

  if (currentTrick.length === 0) {
    return _leadTrick(hand, trumpSuit);
  }

  const normalizedLeadSuit = leadSuit ? normalizeSuit(leadSuit) : null;
  const cardToPlay = _followSuit(hand, currentTrick, trumpSuit, normalizedLeadSuit);

  if (cardToPlay) {
    return cardToPlay;
  }

  return _sloughCard(hand, trumpSuit);
}

/**
 * @namespace aiLogic
 * @description
 * Contains all the AI logic functions for the Euchre game.
 * This module provides decision-making capabilities for the AI player,
 * including bidding and card selection strategies.
 *
 * @see module:game/logic/aiLogic~chooseBid For bid decision logic
 * @see module:game/logic/aiLogic~chooseCardToPlay For card selection logic
 */
export {
  countTrumpInHand,
  calculateHandStrength,
  _evaluateHand,
  chooseBid,
  getCardValue,
  getWinningCard,
  getLowestCard,
  chooseCardToPlay,
};