import {
  isLeftBower,
  getEffectiveSuit,
  normalizeSuit,
} from "../../utils/cardUtils.js";
import { CARD_SUITS } from "../../config/constants.js";

const POINTS = {
  RIGHT_BOWER: 15,
  LEFT_BOWER: 10,
  TRUMP_ACE: 7,
  TRUMP_KING: 5,
  TRUMP_QUEEN: 3,
  TRUMP_TEN: 1,
  TRUMP_NINE: 1,
};

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

const BID_THRESHOLD = 20;

const TRUMP_VALUE_MAP = {
  J: AI_CARD_VALUES.TRUMP_RIGHT_BOWER,
  A: AI_CARD_VALUES.TRUMP_ACE,
  K: AI_CARD_VALUES.TRUMP_KING,
  Q: AI_CARD_VALUES.TRUMP_QUEEN,
  "10": AI_CARD_VALUES.TRUMP_TEN,
  "9": AI_CARD_VALUES.TRUMP_NINE,
};

const OFFSUIT_VALUE_MAP = {
  A: AI_CARD_VALUES.OFFSUIT_ACE,
  K: AI_CARD_VALUES.OFFSUIT_KING,
  Q: AI_CARD_VALUES.OFFSUIT_QUEEN,
  J: AI_CARD_VALUES.OFFSUIT_JACK,
  "10": AI_CARD_VALUES.OFFSUIT_TEN,
  "9": AI_CARD_VALUES.OFFSUIT_NINE,
};

function countTrumpInHand(hand, trumpSuit) {
  if (!Array.isArray(hand)) return 0;
  return hand.filter((card) => {
    if (!card || !card.suit || !card.value) return false;
    return getEffectiveSuit(card, trumpSuit) === trumpSuit;
  }).length;
}

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

function _evaluateHand(hand, potentialTrump) {
  if (!Array.isArray(hand) || hand.length === 0) return 0;
  if (typeof potentialTrump !== "string") return 0;
  return calculateHandStrength(hand, potentialTrump);
}

function _findBestSuitToCall(hand, suitsToConsider) {
  return suitsToConsider.reduce((best, suit) => {
    const score = _evaluateHand(hand, suit);
    if (score > best.score) {
      return { suit, score };
    }
    return best;
  }, { suit: null, score: 0 });
}

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

function _sloughCard(hand, trumpSuit) {
  const nonTrumpCards = hand.filter(
    (card) => card && card.suit && card.value && getEffectiveSuit(card, trumpSuit) !== trumpSuit
  );

  if (nonTrumpCards.length > 0) {
    return getLowestCard(nonTrumpCards, trumpSuit);
  }

  return getLowestCard(hand, trumpSuit);
}

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