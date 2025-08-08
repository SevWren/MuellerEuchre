/**
 * @file Test utilities for validation tests
 * @module test/utils/validation-test-utils
 * @description Shared utilities for creating consistent test data in validation tests
 */

import { mock } from "node:test";
import {
  CARD_SUITS as SUITS,
  CARD_VALUES as VALUES,
  GAME_PHASES,
  PLAYER_ROLES,
  BID_DECISIONS,
} from "../../src/config/constants.js";

/**
 * Creates a card object with the correct structure for testing
 * @param {string} id - The card ID (e.g., 'AS' for Ace of Spades)
 * @param {string} suit - The card suit (must match SUITS constants)
 * @param {string} value - The card value (must match VALUES constants)
 * @returns {Object} A card object with required properties and methods
 */
function createCard(id, suit, value) {
  console.log("createCard called with:", { id, suit, value });

  // Check if any required parameter is missing or empty
  const missingParams = [];
  if (!id) missingParams.push("id");
  if (!suit) missingParams.push("suit");
  if (!value) missingParams.push("value");

  if (missingParams.length > 0) {
    const error = new Error(
      `createCard requires id, suit, and value parameters. Missing: ${missingParams.join(", ")}`
    );
    console.error("Error in createCard:", error.message);
    console.trace("createCard call stack");
    throw error;
  }

  try {
    const card = {
      id,
      suit,
      value,
      // These methods will be properly mocked in tests
      isLeftBower: () => false,
      getEffectiveSuit: (trumpSuit) => suit,
    };

    console.log("Successfully created card:", card);
    return card;
  } catch (error) {
    console.error("Error creating card object:", error);
    throw error;
  }
}

/**
 * Creates a standard deck of 24 Euchre cards
 * @returns {Array<Object>} Array of card objects
 */
function createStandardDeck() {
  const deck = [];
  const suits = [
    SUITS.CARD_SUIT_SPADES,
    SUITS.CARD_SUIT_HEARTS,
    SUITS.CARD_SUIT_DIAMONDS,
    SUITS.CARD_SUIT_CLUBS,
  ];
  const values = [...VALUES]; // Create a copy of the frozen array

  // Map constant names to their single-character ID representation
  const suitCharMap = {
    [SUITS.CARD_SUIT_SPADES]: "S",
    [SUITS.CARD_SUIT_HEARTS]: "H",
    [SUITS.CARD_SUIT_DIAMONDS]: "D",
    [SUITS.CARD_SUIT_CLUBS]: "C",
  };

  // Create a mapping of value to display name for card IDs
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
      // Create a card ID like 'KH' for King of Hearts
      const cardId = `${valueDisplayMap[value] || value}${suitCharMap[suit] || "?"}`;
      deck.push(createCard(cardId, suit, value));
    }
  }

  return deck;
}

/**
 * Creates a base game state with all required fields
 * @param {Object} overrides - Optional overrides for default values
 * @returns {Object} A complete game state object
 */
function createBaseGameState(overrides = {}) {
  // Debug: Log all available constants at the start
  console.log("DEBUG: Available constants in validation-test-utils.js:", {
    SUITS: SUITS ? Object.keys(SUITS) : "UNDEFINED",
    VALUES: VALUES
      ? Array.isArray(VALUES)
        ? VALUES
        : "NOT AN ARRAY"
      : "UNDEFINED",
    GAME_PHASES: GAME_PHASES ? Object.keys(GAME_PHASES) : "UNDEFINED",
    PLAYER_ROLES: PLAYER_ROLES
      ? Array.isArray(PLAYER_ROLES)
        ? PLAYER_ROLES
        : "NOT AN ARRAY"
      : "UNDEFINED",
  });

  // Debug: Log the VALUES before using it
  console.log("DEBUG: createBaseGameState - VALUES:", {
    type: typeof VALUES,
    isArray: Array.isArray(VALUES),
    length: Array.isArray(VALUES) ? VALUES.length : "N/A",
    values: VALUES,
  });

  // Debug: Check if VALUES is defined and accessible
  if (typeof VALUES === "undefined") {
    console.error("ERROR: VALUES is undefined in createBaseGameState");
    throw new Error(
      "VALUES constant is not defined in validation-test-utils.js"
    );
  } else if (!Array.isArray(VALUES)) {
    console.error("ERROR: VALUES is not an array:", VALUES);
    throw new Error(
      "VALUES constant is not an array in validation-test-utils.js"
    );
  } else if (VALUES.length === 0) {
    console.error("ERROR: VALUES array is empty");
    throw new Error("VALUES array is empty in validation-test-utils.js");
  } else {
    console.log("DEBUG: First card value:", VALUES[0]);
  }

  // Create the base game state
  const baseGameState = {
    gamePhase: GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND1,
    dealer: "north",
    currentPlayer: "south",
    currentTrick: [],
    tricks: { NS: 0, EW: 0 },
    trumpSuit: null,
    upCard: null, // Will be set below
    turnCard: null, // Will be set below
    players: {},
  };

  try {
    // Create cards using the VALUES array
    const upCard = createCard("9H", SUITS.CARD_SUIT_HEARTS, VALUES[0]); // 9 of Hearts
    baseGameState.upCard = upCard;
    baseGameState.turnCard = { ...upCard };

    console.log("DEBUG: Created base game state with upCard:", upCard);
  } catch (error) {
    console.error(
      "ERROR creating cards in createBaseGameState:",
      error.message
    );
    throw error;
  }

  // Initialize players with empty hands if not provided in overrides
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
    console.log(
      "DEBUG: Initialized players:",
      Object.keys(baseGameState.players)
    );
  }

  // Apply overrides after setting defaults
  if (overrides) {
    console.log("DEBUG: Applying overrides:", Object.keys(overrides));
    Object.assign(baseGameState, overrides);
  }

  return baseGameState;
}

/**
 * Deals cards to players for testing
 * @param {Object} gameState - The game state to modify
 * @param {Object} hands - Object mapping player IDs to arrays of cards
 * @returns {Object} The updated game state
 */
function dealCards(gameState, hands) {
  // Perform a deep copy to ensure immutability.
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

/**
 * Creates a mock logger for testing
 * @returns {Object} A mock logger object
 */
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
