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

const BID_THRESHOLD = 20;

function countTrumpInHand(hand, trumpSuit) {
  if (!Array.isArray(hand)) return 0;
  return hand.filter((card) => {
    if (!card || !card.suit || !card.value) return false;
    return card.suit === trumpSuit || isLeftBower(card, trumpSuit);
  }).length;
}

function calculateHandStrength(hand, trumpSuit) {
  if (!Array.isArray(hand)) return 0;

  return hand.reduce((total, card) => {
    if (!card || !card.suit || !card.value) {
      return total;
    }

    const isTrumpCard = card.suit === trumpSuit || isLeftBower(card, trumpSuit);

    if (!isTrumpCard) {
      return total;
    }

    if (card.value === "J") {
      if (card.suit === trumpSuit) {
        return total + POINTS.RIGHT_BOWER;
      }
      if (isLeftBower(card, trumpSuit)) {
        return total + POINTS.LEFT_BOWER;
      }
    }

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

function _evaluateHand(hand, potentialTrump) {
  if (!Array.isArray(hand) || hand.length === 0) return 0;
  if (typeof potentialTrump !== "string") return 0;

  return calculateHandStrength(hand, potentialTrump);
}

function chooseBid(hand, turnCard, isDealer, bids = []) {
  if (!Array.isArray(hand) || hand.length === 0 || !turnCard) {
    return { decision: "pass" };
  }

  const turnCardScore = _evaluateHand(hand, turnCard.suit);
  if (turnCardScore >= BID_THRESHOLD) {
    return { decision: "orderUp" };
  }

  if (bids.every((bid) => bid.decision === "pass")) {
    const suits = Object.values(CARD_SUITS).filter(s => s.startsWith('CARD_SUIT_'));
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

function getCardValue(card, trumpSuit) {
  if (!card || !card.suit || !card.value) return 0;
  if (card.suit === trumpSuit) {
    if (card.value === "J") return 100;
    if (card.value === "A") return 80;
    if (card.value === "K") return 70;
    if (card.value === "Q") return 60;
    if (card.value === "10") return 40;
    if (card.value === "9") return 30;
  }

  if (isLeftBower(card, trumpSuit)) {
    return 90;
  }

  if (card.value === "A") return 20;
  if (card.value === "K") return 18;
  if (card.value === "Q") return 16;
  if (card.value === "J") return 14;
  if (card.value === "10") return 12;
  if (card.value === "9") return 10;

  return 0;
}

function getWinningCard(trick, trumpSuit, leadSuit) {
  if (trick.length === 0) return null;

  let winningCard = trick[0];
  for (let i = 1; i < trick.length; i++) {
    const currentCard = trick[i];
    if (!currentCard || !currentCard.suit || !currentCard.value) continue;
    const winningSuit = getEffectiveSuit(winningCard, trumpSuit);
    const currentSuit = getEffectiveSuit(currentCard, trumpSuit);

    if (winningSuit === currentSuit) {
      if (
        getCardValue(currentCard, trumpSuit) >
        getCardValue(winningCard, trumpSuit)
      ) {
        winningCard = currentCard;
      }
    } else if (currentSuit === trumpSuit) {
      winningCard = currentCard;
    }
  }

  return winningCard;
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

function chooseCardToPlay(hand, currentTrick = [], trumpSuit, leadSuit) {
  const normalizedLeadSuit = leadSuit ? normalizeSuit(leadSuit) : null;
  if (!Array.isArray(hand) || hand.length === 0) {
    return null;
  }

  if (currentTrick.length === 0) {
    const trumpCards = hand.filter(
      (card) =>
        card &&
        card.suit &&
        card.value &&
        getEffectiveSuit(card, trumpSuit) === trumpSuit
    );

    if (trumpCards.length === hand.length) {
      return getLowestCard(trumpCards, trumpSuit);
    }

    const nonTrumpCards = hand.filter(
      (card) =>
        card &&
        card.suit &&
        card.value &&
        getEffectiveSuit(card, trumpSuit) !== trumpSuit
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

  const cardsInSuit = hand.filter((card) => {
    if (!card || !card.suit || !card.value) return false;
    return getEffectiveSuit(card, trumpSuit) === normalizedLeadSuit;
  });

  if (cardsInSuit.length > 0) {
    const winningCard = getWinningCard(
      currentTrick,
      trumpSuit,
      normalizedLeadSuit
    );
    if (winningCard) {
      const cardToBeatValue = getCardValue(winningCard, trumpSuit);
      const winningSuit = getEffectiveSuit(winningCard, trumpSuit);

      const playableWinningCards = [];
      for (const card of cardsInSuit) {
        const cardValue = getCardValue(card, trumpSuit);

        if (winningSuit === trumpSuit) {
          const isTrump = getEffectiveSuit(card, trumpSuit) === trumpSuit;
          if (isTrump && cardValue > cardToBeatValue) {
            playableWinningCards.push(card);
          }
        } else {
          if (cardValue > cardToBeatValue) {
            playableWinningCards.push(card);
          }
        }
      }

      if (playableWinningCards.length > 0) {
        return getLowestCard(playableWinningCards, trumpSuit);
      }
    }
    return getLowestCard(cardsInSuit, trumpSuit);
  }

  const nonTrumpCards = hand.filter(
    (card) =>
      card &&
      card.suit &&
      card.value &&
      getEffectiveSuit(card, trumpSuit) !== trumpSuit
  );

  if (nonTrumpCards.length === 0) {
    return getLowestCard(hand, trumpSuit);
  }

  return getLowestCard(nonTrumpCards, trumpSuit);
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