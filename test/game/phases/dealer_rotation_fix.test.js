/**
 * @file test/game/phases/dealer_rotation_fix.test.js
 * @module test/game/phases/dealer_rotation_fix
 * @description
 *   Unit tests for the `startNewHand` function in the `startNewHandPhase.js` module.
 *
 *   This test suite specifically validates the Layer 1 core logic for dealer rotation.
 *   It ensures that the `startNewHand` function, when called from a valid preceding phase,
 *   correctly identifies the next dealer in sequence according to the rules of Euchre.
 *
 *   All dependencies are mocked using the project's standard `esmockWithPaths` wrapper
 *   to ensure the function is tested as a pure, stateless unit.
 *
 * @see {@link module:src/game/phases/startNewHandPhase}
 */

import { expect } from "chai";
import sinon from "sinon";
import { esmockWithPaths } from "../../utils/esmock_wrapper.js";

// Import constants using the correct relative path
import { GAME_PHASES, PLAYER_ROLES } from "../../../src/config/constants.js";

// Define module path using the correct relative path
const MODULE_PATH = "../../../src/game/phases/startNewHandPhase.js";

/**
 * @description Creates a mock implementation of the deck utilities for testing.
 * @returns {object} A mock object with stubbed deck utility functions.
 */
const createMockDeckUtils = () => ({
  createDeck: sinon.stub(),
  shuffleDeck: sinon.stub().callsFake((deck) => [...deck]), // Return a copy to avoid mutation
  cardToId: sinon.stub().returns("mock-card-id"),
});

/**
 * @description Creates a mock implementation of the player utilities for testing.
 * @returns {object} A mock object with stubbed player utility functions.
 */
const createMockPlayerUtils = () => ({
  getNextPlayer: sinon.stub(),
});

// Create mock logger
const mockLogger = {
  debug: sinon.stub(),
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
};

// Import actual errors for instanceof checks
import * as actualErrors from "../../../src/game/logic/errors.js";

/**
 * @description Creates a base game state object for use in tests.
 * @param {string} [phase=GAME_PHASES.LOBBY] - The initial game phase.
 * @param {string} [dealer=PLAYER_ROLES[0]] - The role of the dealer.
 * @returns {object} A simplified but valid game state object.
 */
const createBaseGameState = (
  phase = GAME_PHASES.LOBBY,
  dealer = PLAYER_ROLES[0],
) => ({
  gameId: "test-game-123",
  gamePhase: phase,
  dealer,
  players: {
    [PLAYER_ROLES[0]]: { hand: [], isActive: true, isConnected: true },
    [PLAYER_ROLES[1]]: { hand: [], isActive: true, isConnected: true },
    [PLAYER_ROLES[2]]: { hand: [], isActive: true, isConnected: true },
    [PLAYER_ROLES[3]]: { hand: [], isActive: true, isConnected: true },
  },
  settings: {
    winningScore: 10,
  },
});

/**
 * @description Generates a mock deck of cards for testing purposes.
 * @param {number} [numCards=24] - The number of cards to generate in the deck.
 * @returns {Array<object>} An array of card objects.
 */
const createMockDeck = (numCards = 24) => {
  const suits = ["hearts", "diamonds", "clubs", "spades"];
  const values = ["9", "10", "J", "Q", "K", "A"];
  const deck = [];

  for (let i = 0; i < numCards; i++) {
    const suit = suits[Math.floor(i / 6) % 4];
    const value = values[i % 6];
    deck.push({
      suit,
      value,
      id: `${value}_${suit}`,
      rank: values.indexOf(value) + 1,
    });
  }

  return deck;
};

describe("Dealer Rotation", () => {
  let startNewHand;
  let mockDeckUtils;
  let mockPlayerUtils;

  /**
   * @function beforeEach
   * @description Resets mocks and re-imports the module under test before each test case
   * to ensure a clean, isolated environment.
   */
  beforeEach(async () => {
    // Create fresh mocks for each test
    mockDeckUtils = createMockDeckUtils();
    mockPlayerUtils = createMockPlayerUtils();

    // Import the module with mocks using esmock_wrapper
    const module = await esmockWithPaths(import.meta.url, MODULE_PATH, {
      // Use path aliases for mocks, as per project convention
      "@/utils/deck.js": mockDeckUtils,
      "@/utils/players.js": mockPlayerUtils,
      "@/utils/logger.js": mockLogger,
      "@/game/logic/errors.js": actualErrors, // Use actual error classes for instanceof checks
    });

    startNewHand = module.startNewHand;
  });

  /**
   * @function afterEach
   * @description Restores all Sinon stubs and spies after each test.
   */
  afterEach(() => {
    sinon.restore();
  });

  /**
   * @test {startNewHand}
   * @covers {startNewHand}
   * @description Verifies that the dealer role correctly rotates to the next player in sequence
   * after a hand is completed. This test iterates through all four player positions to ensure
   * the rotation wraps around correctly.
   */
  it("should rotate dealer to next player after each hand", () => {
    // Test dealer rotation through all player positions
    for (let i = 0; i < PLAYER_ROLES.length; i++) {
      // Arrange
      const currentDealer = PLAYER_ROLES[i];
      const expectedNextDealer = PLAYER_ROLES[(i + 1) % PLAYER_ROLES.length];
      const expectedFirstBidder = PLAYER_ROLES[(i + 2) % PLAYER_ROLES.length];

      const gameState = createBaseGameState(GAME_PHASES.SCORING, currentDealer);

      // Create a full deck
      const fullDeck = createMockDeck();
      mockDeckUtils.createDeck.returns([...fullDeck]);

      // Mock the next player with proper rotation logic
      // This single fake covers all calls to getNextPlayer within startNewHand
      mockPlayerUtils.getNextPlayer.callsFake((player) => {
        const currentIndex = PLAYER_ROLES.indexOf(player);
        return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
      });

      // Act
      const result = startNewHand(gameState);

      // Assert - verify dealer rotation and game phase
      expect(
        result.dealer,
        `Test iteration ${i}: Expected dealer to rotate from ${currentDealer} to ${expectedNextDealer}`,
      ).to.equal(expectedNextDealer);

      expect(
        result.currentPlayer,
        `Test iteration ${i}: Expected first bidder to be ${expectedFirstBidder}`,
      ).to.equal(expectedFirstBidder);

      expect(result.orderUpTurn).to.equal(expectedFirstBidder);
      expect(result.gamePhase).to.equal("ORDER_UP_ROUND1");
    }
  });
});
