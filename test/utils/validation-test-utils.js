import { mock } from "node:test";
import {
  CARD_SUITS as SUITS,
  CARD_VALUES as VALUES,
  GAME_PHASES,
  PLAYER_ROLES,
  BID_DECISIONS,
} from "../../src/config/constants.js";

function createCard(id, suit, value) {
  const missingParams = [];
  if (!id) missingParams.push("id");
  if (!suit) missingParams.push("suit");
  if (!value) missingParams.push("value");

  if (missingParams.length > 0) {
    const error = new Error(
      `createCard requires id, suit, and value parameters. Missing: ${missingParams.join(", ")}`
    );
    throw error;
  }

  try {
    const card = {
      id,
      suit,
      value,
      isLeftBower: () => false,
      getEffectiveSuit: (trumpSuit) => suit,
    };

    return card;
  } catch (error) {
    throw error;
  }
}

function createStandardDeck() {
  const deck = [];
  const suits = [
    SUITS.CARD_SUIT_SPADES,
    SUITS.CARD_SUIT_HEARTS,
    SUITS.CARD_SUIT_DIAMONDS,
    SUITS.CARD_SUIT_CLUBS,
  ];
  const values = [...VALUES];

  const suitCharMap = {
    [SUITS.CARD_SUIT_SPADES]: "S",
    [SUITS.CARD_SUIT_HEARTS]: "H",
    [SUITS.CARD_SUIT_DIAMONDS]: "D",
    [SUITS.CARD_SUIT_CLUBS]: "C",
  };

  const valueDisplayMap = {
    9: "9",
    10: "10",
    J: "J",
    Q: "Q",
    K: "K",
    A: "A",
  };

  for (const suit of suits) {
    for (const value of values) {
      const cardId = `${valueDisplayMap[value] || value}${suitCharMap[suit] || "?"}`;
      deck.push(createCard(cardId, suit, value));
    }
  }

  return deck;
}

function createBaseGameState(overrides = {}) {
  if (typeof VALUES === "undefined") {
    throw new Error(
      "VALUES constant is not defined in validation-test-utils.js"
    );
  } else if (!Array.isArray(VALUES)) {
    throw new Error(
      "VALUES constant is not an array in validation-test-utils.js"
    );
  } else if (VALUES.length === 0) {
    throw new Error("VALUES array is empty in validation-test-utils.js");
  }

  const baseGameState = {
    gamePhase: GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND1,
    dealer: "north",
    currentPlayer: "south",
    currentTrick: [],
    tricks: { NS: 0, EW: 0 },
    trumpSuit: null,
    upCard: null,
    turnCard: null,
    players: {},
  };

  try {
    const upCard = createCard("9H", SUITS.CARD_SUIT_HEARTS, VALUES[0]);
    baseGameState.upCard = upCard;
    baseGameState.turnCard = { ...upCard };
  } catch (error) {
    throw error;
  }

  if (!overrides.players) {
    baseGameState.players = {
      [PLAYER_ROLES[0]]: {
        id: "south",
        name: "South",
        hand: [],
        team: "NS",
      },
      [PLAYER_ROLES[1]]: {
        id: "west",
        name: "West",
        hand: [],
        team: "EW",
      },
      [PLAYER_ROLES[2]]: {
        id: "north",
        name: "North",
        hand: [],
        team: "NS",
      },
      [PLAYER_ROLES[3]]: {
        id: "east",
        name: "East",
        hand: [],
        team: "EW",
      },
    };
  }

  if (overrides) {
    Object.assign(baseGameState, overrides);
  }

  return baseGameState;
}

function dealCards(gameState, hands) {
  const newState = JSON.parse(JSON.stringify(gameState));

  for (const [playerId, cards] of Object.entries(hands)) {
    if (!newState.players[playerId]) {
      throw new Error(`Player ${playerId} not found in game state`);
    }
    newState.players[playerId] = {
      ...newState.players[playerId],
      hand: [...cards],
    };
  }

  return newState;
}

function createMockLogger() {
  const mockLogger = {
    info: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
    debug: mock.fn(),
    reset: function () {
      this.info.mock.resetCalls();
      this.warn.mock.resetCalls();
      this.error.mock.resetCalls();
      this.debug.mock.resetCalls();
    },
  };
  return mockLogger;
}

export {
  createCard,
  createStandardDeck,
  createBaseGameState,
  dealCards,
  createMockLogger,
  SUITS,
  VALUES,
  GAME_PHASES,
  PLAYER_ROLES,
  BID_DECISIONS,
};