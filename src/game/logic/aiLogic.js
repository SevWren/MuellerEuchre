// filepath: src/game/logic/aiLogic.js
/**
 * Module containing AI logic for disconnected players in Euchre.
 * Provides pure, stateless functions for AI decision making.
 */

const BID_THRESHOLD = 180; // Adjusted for new card ranking values

/**
 * Evaluates the strength of a hand for a potential trump suit.
 * @private
 * @param {Array} hand - Array of card objects
 * @param {string} potentialTrump - Potential trump suit to evaluate against
 * @returns {number} Numerical score representing hand strength
 */
function _evaluateHand(hand, potentialTrump) {
  if (!Array.isArray(hand) || hand.length === 0) return 0;
  if (typeof potentialTrump !== "string") return 0;

  const TRUMP_VALUES = {
    J: 100, // Right Bower
    J_sameColor: 90, // Left Bower
    A: 80,
    K: 70,
    Q: 60,
    10: 40,
    9: 30,
  };

  let score = 0;

  hand.forEach((card) => {
    if (card.suit === potentialTrump) {
      // Trump suit cards
      if (card.rank === "J") {
        score += TRUMP_VALUES.J; // Right Bower
      } else {
        score += TRUMP_VALUES[card.rank] || 0;
      }
    } else if (
      card.rank === "J" &&
      getSuitColor(card.suit) === getSuitColor(potentialTrump)
    ) {
      // Left Bower (Jack of same color as trump)
      score += TRUMP_VALUES.J_sameColor;
    }
  });

  return score;
}

/**
 * Helper to get color of a suit (red or black)
 * @private
 * @param {string} suit
 * @returns {string} 'red' or 'black'
 */
function getSuitColor(suit) {
  const redSuits = ["hearts", "diamonds"];
  return redSuits.includes(suit) ? "red" : "black";
}

/**
 * Determines AI's bidding decision based on hand strength.
 * @param {Array} hand - Array of card objects
 * @param {object} turnCard - Current turn card object
 * @param {boolean} isDealer - Whether AI is the dealer
 * @param {Array} bids - Array of previous bids in current round
 * @returns {object} Decision object {decision: string, suit?: string}
 */
export function chooseBid(hand, turnCard, isDealer, bids = []) {
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
 * Chooses a card for AI to play based on current trick state.
 * @param {Array} hand - Array of card objects
 * @param {Array} currentTrick - Array of cards played in current trick
 * @param {string} trumpSuit - Current trump suit
 * @param {string} leadSuit - Lead suit of current trick
 * @returns {object|null} Selected card object or null if invalid input
 */
export function chooseCardToPlay(hand, currentTrick = [], trumpSuit, leadSuit) {
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
          getSuitColor(card.suit) === getSuitColor(trumpSuit))
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
        (card) => getCardValue(card, trumpSuit) > cardToBeat
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

/**
 * Gets the numeric value of a card based on trump suit
 * @private
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
 * @private
 * @param {Array} trick - Array of cards in current trick
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
 * @private
 * @param {Array} cards - Array of card objects
 * @param {string} trumpSuit - Current trump suit
 * @returns {object} Lowest value card
 */
function getLowestCard(cards, trumpSuit) {
  if (cards.length === 0) return null;

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
