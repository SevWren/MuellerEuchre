//run `npm test aiLogic.unit.test.js ` and debug all failing tests @aiLogic.unit.test.js 





// src/game/logic/aiLogic.js
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

import { isLeftBower } from '../../utils/cardUtils.js';


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
 */
function countTrumpInHand(hand, trumpSuit) {
  if (!Array.isArray(hand)) return 0;
  return hand.filter((card) => {
    if (!card || !card.suit || !card.value) return false;
    // A card is trump if its suit matches the trump suit, or if it's the Left Bower.
    return card.suit === trumpSuit || isLeftBower(card, trumpSuit);
  }).length;
}

/**
 * Calculates the total point value (strength) of a hand for a given trump suit.
 * This function consolidates all scoring logic, including bowers and other trump cards.
 * @param {Array<object>} hand - Array of card objects
 * @param {string} trumpSuit - The suit to evaluate as trump
 * @returns {number} Total point value of the hand
 */
function calculateHandStrength(hand, trumpSuit) {
  if (!Array.isArray(hand)) return 0;

  return hand.reduce((total, card) => {
    if (!card || !card.suit || !card.value) {
      return total;
    }

    // A card is trump if it's the left bower or its suit matches trump.
    const isTrumpCard = card.suit === trumpSuit || isLeftBower(card, trumpSuit);

    if (!isTrumpCard) {
      return total;
    }

    // Check for Bowers first
    if (card.value === "J") {
      // The Right Bower is just the Jack of the trump suit.
      if (card.suit === trumpSuit) {
        return total + POINTS.RIGHT_BOWER;
      }
      // This check is explicit for clarity, though isTrumpCard already covers it.
      if (isLeftBower(card, trumpSuit)) {
        return total + POINTS.LEFT_BOWER;
      }
    }

    // Score other trump cards
    switch (card.value) {
      case "A":
        return total + POINTS.TRUMP_ACE;
      case "K":
        return total + POINTS.TRUMP_KING;
      case "Q":
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
 * const score = _evaluateHand(hand, 'hearts'); // Returns 32
 *
 * @see calculateHandStrength Used to calculate the strength of the hand.
 */
function _evaluateHand(hand, potentialTrump) {
  if (!Array.isArray(hand) || hand.length === 0) return 0;
  if (typeof potentialTrump !== "string") return 0;
  
  return calculateHandStrength(hand, potentialTrump);
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
 * Determines the effective suit of a card, considering the Left Bower rule.
 * This is a local implementation for AI logic to avoid external dependencies.
 * @param {object} card - The card to evaluate.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {string} The effective suit of the card.
 */
function getEffectiveSuit(card, trumpSuit) {
  if (!card || !card.suit || !card.value) {
    return null;
  }
  if (isLeftBower(card, trumpSuit)) {
    return trumpSuit;
  }
  return card.suit;
}

/**
 * Gets the numeric value of a card based on trump suit
 * @param {object} card - Card object
 * @param {string} trumpSuit - Current trump suit
 * @returns {number} Numeric value of card
 */
function getCardValue(card, trumpSuit) {
  if (!card || !card.suit || !card.value) return 0;
  if (card.suit === trumpSuit) {
    if (card.value === "J") return 100; // Right bower
    if (card.value === "A") return 80;
    if (card.value === "K") return 70;
    if (card.value === "Q") return 60;
    if (card.value === "10") return 40;
    if (card.value === "9") return 30;
  }

  if (isLeftBower(card, trumpSuit)) {
    return 90; // Left bower
  }

  // Non-trump cards
  if (card.value === "A") return 20;
  if (card.value === "K") return 18;
  if (card.value === "Q") return 16;
  if (card.value === "J") return 14;
  if (card.value === "10") return 12;
  if (card.value === "9") return 10;

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
  for (let i = 1; i < trick.length; i++) {
    const currentCard = trick[i];
    if (!currentCard || !currentCard.suit || !currentCard.value) continue;
    const winningSuit = getEffectiveSuit(winningCard, trumpSuit);
    const currentSuit = getEffectiveSuit(currentCard, trumpSuit);

    if (winningSuit === currentSuit) {
      // Both are same suit, compare values
      if (getCardValue(currentCard, trumpSuit) > getCardValue(winningCard, trumpSuit)) {
        winningCard = currentCard;
      }
    } else if (currentSuit === trumpSuit) {
      // Current card is trump, winning card is not
      winningCard = currentCard;
    }
    // If winning card is trump and current is not, do nothing.
    // If both are non-trump, non-lead suits, do nothing (first card leads).
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

  return cards.reduce((lowestCard, currentCard) => {
    if (!lowestCard) return currentCard;
    return getCardValue(currentCard, trumpSuit) < getCardValue(lowestCard, trumpSuit) ? currentCard : lowestCard;
  }, null);
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
      (card) => card && card.suit && card.value && getEffectiveSuit(card, trumpSuit) === trumpSuit
    );

    if (trumpCards.length === hand.length) {
      return getLowestCard(trumpCards, trumpSuit);
    }
    
    // Play highest non-trump card if not all trump
    const nonTrumpCards = hand.filter(card => card && card.suit && card.value && getEffectiveSuit(card, trumpSuit) !== trumpSuit);
    if(nonTrumpCards.length > 0) {
        return nonTrumpCards.reduce((highest, card) => getCardValue(card, trumpSuit) > getCardValue(highest, trumpSuit) ? card : highest);
    }
    
    // Fallback to lowest card overall if something is weird
    return getLowestCard(hand, trumpSuit);
  }

  // If not leading, must follow suit if able
  const cardsInSuit = hand.filter((card) => {
    if (!card || !card.suit || !card.value) return false;
    return getEffectiveSuit(card, trumpSuit) === leadSuit;
  });

  if (cardsInSuit.length > 0) {
    // Try to win the trick if possible
    const winningCard = getWinningCard(currentTrick, trumpSuit, leadSuit);
    if (winningCard) {
      const cardToBeatValue = getCardValue(winningCard, trumpSuit);
      const winningSuit = getEffectiveSuit(winningCard, trumpSuit);
      
      // Find all cards that can win the trick
      const playableWinningCards = [];
      for (const card of cardsInSuit) {
        if (!card || !card.suit || !card.value) continue;
        
        const isTrump = getEffectiveSuit(card, trumpSuit) === trumpSuit;
        const cardValue = getCardValue(card, trumpSuit);
        
        if (winningSuit === trumpSuit) {
          // If winning card is trump, must play higher trump to win
          if (isTrump && cardValue > cardToBeatValue) {
            playableWinningCards.push(card);
          }
        } else {
          // If winning card is not trump, can win with any trump or higher card of lead suit
          if (isTrump) {
            // Any trump card beats a non-trump card
            playableWinningCards.push(card);
          } else if (cardValue > cardToBeatValue) {
            // Must be same suit and higher value to win
            playableWinningCards.push(card);
          }
        }
      }

      if (playableWinningCards.length > 0) {
        // Play the lowest card that can still win
        return getLowestCard(playableWinningCards, trumpSuit);
      }
    }
    // If can't win, play lowest card in suit
    return getLowestCard(cardsInSuit, trumpSuit);
  }

  // Can't follow suit - slough lowest value non-trump card if possible
  const nonTrumpCards = hand.filter(card => 
    card && card.suit && card.value && getEffectiveSuit(card, trumpSuit) !== trumpSuit
  );
  
  // If no non-trump cards, return lowest card overall
  if (nonTrumpCards.length === 0) {
    return getLowestCard(hand, trumpSuit);
  }
  
  // Otherwise, return lowest non-trump card
  return getLowestCard(nonTrumpCards, trumpSuit);
}

// Export all public functions
export {
  countTrumpInHand,
  calculateHandStrength,
  _evaluateHand,
  chooseBid,
  getCardValue,
  getWinningCard,
  getLowestCard,
  chooseCardToPlay
};