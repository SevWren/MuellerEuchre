// test/game/logic/aiLogic.unit.test.js
/**
 * @file Unit tests for the AI logic module.
 * @module test/game/logic/aiLogic.unit.test
 * @description
 *   This test suite validates the pure, stateless functions within `aiLogic.js`.
 *   It ensures that the AI's decision-making processes for bidding and playing cards
 *   are correct and predictable based on the game state and hand composition.
 *
 *   As a Layer 1 test, it uses the project's standard `node:test` wrapper
 *   to load the module in isolation, without any actual dependencies, verifying its purity.
 *
 * @see {@link module:src/game/logic/aiLogic}
 */

import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

// --- Test Constants ---

/**
 * @constant {object} SUITS - A local enumeration of card suits for test readability.
 */
const SUITS = {
  CLUBS: "clubs",
  DIAMONDS: "diamonds",
  HEARTS: "hearts",
  SPADES: "spades",
};

/**
 * @constant {object} RANKS - A local enumeration of card ranks for test readability.
 */
const RANKS = {
  NINE: "9",
  TEN: "10",
  JACK: "J",
  QUEEN: "Q",
  KING: "K",
  ACE: "A",
};

/**
 * @constant {object} POINTS - Point values used to score an AI's hand, mirroring the implementation.
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
 * @description Helper function to create a card object for use in tests.
 * @param {string} suit - The suit of the card.
 * @param {string} rank - The rank of the card.
 * @returns {{suit: string, rank: string}} A card object.
 */
const createCard = (suit, value) => ({ suit, value });

/**
 * @describe Top-level test suite for the AI Logic Module.
 */
describe("AI Logic Module", () => {
  let aiLogic;

/**
   * @function beforeEach
   * @description Resets all mocks before each test to ensure test isolation.
   */
  beforeEach(async () => {
    mock.reset();
    // Use dynamic import to load the module under test, allowing for isolation.
    aiLogic = await import("../../../src/game/logic/aiLogic.js");
  });

  /**
   * @function afterEach
   * @description Restores all mocks after each test to clean up the test environment.
   */
  afterEach(() => {
    mock.restoreAll();
  });
  // A standard mock hand used across multiple tests.
  const mockHand = [
    createCard(SUITS.HEARTS, 'J'), // Right bower if hearts is trump
    createCard(SUITS.DIAMONDS, 'J'), // Left bower if hearts is trump
    createCard(SUITS.HEARTS, 'A'),
    createCard(SUITS.CLUBS, '9'),
    createCard(SUITS.SPADES, 'Q'),
  ];

  /**
   * @describe Test suite for the `countTrumpInHand` function.
   */
  describe("countTrumpInHand()", () => {
    /**
     * @test {countTrumpInHand}
     * @description Verifies that the function correctly counts all trump cards, including bowers.
     */
    it("should correctly count trump cards in a hand, including bowers", () => {
      const trumpSuit = SUITS.HEARTS;
      const result = aiLogic.countTrumpInHand(mockHand, trumpSuit);
      // J of Hearts (RB), J of Diamonds (LB), A of Hearts
      assert.strictEqual(result, 3, "Should count Right Bower, Left Bower, and Trump Ace");
    });

    /**
     * @test {countTrumpInHand}
     * @description Ensures the function handles an empty hand gracefully.
     */
    it("should return 0 for an empty hand", () => {
      const result = aiLogic.countTrumpInHand([], SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });

    /**
     * @test {countTrumpInHand}
     * @description Ensures the function handles null input without crashing.
     */
    it("should return 0 for a null hand input", () => {
      const result = aiLogic.countTrumpInHand(null, SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });

    /**
     * @test {countTrumpInHand}
     * @description Verifies the function returns 0 when no trump cards are present.
     */
    it("should return 0 if no trump cards are present", () => {
      const handWithoutTrump = [
        { suit: "clubs", rank: "9" },
        { suit: "spades", rank: "Q" },
      ];
      const result = aiLogic.countTrumpInHand(handWithoutTrump, SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });
  });
  
  /**
   * @describe Test suite for the `calculateHandStrength` function.
   */
  describe("calculateHandStrength()", () => {
    /**
     * @test {calculateHandStrength}
     * @description Verifies that points are correctly calculated for a full hand including bowers.
     */
    it("should calculate the total strength of a hand including bowers and trump", () => {
      const trumpSuit = SUITS.HEARTS;
      const result = aiLogic.calculateHandStrength(mockHand, trumpSuit);
      // Expected: Right Bower (15) + Left Bower (10) + Trump Ace (7) = 32
      assert.strictEqual(result, 32, "Hand strength should be the sum of all trump points");
    });

    /**
     * @test {calculateHandStrength}
     * @description Verifies that a hand with no trump evaluates to 0.
     */
    it("should return 0 for a hand with no trump cards for the given suit", () => {
      const trumpSuit = SUITS.CLUBS;
      // mockHand has no clubs that are trump, and no bowers for clubs.
      const hand = [
        createCard(SUITS.HEARTS, RANKS.ACE),
        createCard(SUITS.DIAMONDS, RANKS.KING),
      ];
      const result = aiLogic.calculateHandStrength(hand, trumpSuit);
      assert.strictEqual(result, 0);
    });

    /**
     * @test {calculateHandStrength}
     * @description Ensures the function handles an empty hand gracefully.
     */
    it("should return 0 for an empty hand", () => {
      const result = aiLogic.calculateHandStrength([], SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });

    /**
     * @test {calculateHandStrength}
     * @description Ensures the function handles null input without crashing.
     */
    it("should return 0 for a null hand", () => {
      const result = aiLogic.calculateHandStrength(null, SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });
  });

  /**
   * @describe Test suite for the `_evaluateHand` internal function.
   */
  describe("_evaluateHand()", () => {
    /**
     * @test {_evaluateHand}
     * @description Verifies that the total hand strength is calculated correctly.
     */
    it("should correctly evaluate hand strength by calling calculateHandStrength", () => {
      const trumpSuit = SUITS.HEARTS;
      const result = aiLogic._evaluateHand(mockHand, trumpSuit);
      // J of Hearts (RB) + J of Diamonds (LB) + A of Hearts
      assert.strictEqual(
        result,
        POINTS.RIGHT_BOWER + POINTS.LEFT_BOWER + POINTS.TRUMP_ACE,
        "Expected score should be 32"
      );
    });

    /**
     * @test {_evaluateHand}
     * @description Ensures the function handles an empty hand gracefully.
     */
    it("should return 0 for an empty hand", () => {
      const result = aiLogic._evaluateHand([], SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });

    /**
     * @test {_evaluateHand}
     * @description Ensures the function handles null input without crashing.
     */
    it("should return 0 for a null hand", () => {
      const result = aiLogic._evaluateHand(null, SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });
  });

  /**
   * @describe Test suite for the `chooseBid` function.
   */
  describe("chooseBid()", () => {
    const turnCard = createCard(SUITS.HEARTS, RANKS.NINE);

    /**
     * @test {chooseBid}
     * @description Verifies the AI decides to "orderUp" when its hand strength for the turn card's suit exceeds the threshold.
     */
    it("should order up when hand strength exceeds the threshold", () => {
       const strongHand = [
        createCard(SUITS.HEARTS, RANKS.JACK), // RB: 15
        createCard(SUITS.HEARTS, RANKS.ACE), // Trump Ace: 7
        createCard(SUITS.DIAMONDS, RANKS.JACK), // LB: 10
      ]; // Total: 15 + 7 + 10 = 32 points
      const result = aiLogic.chooseBid(strongHand, turnCard, false, []);
      assert.strictEqual(result.decision, "orderUp");
    });

    /**
     * @test {chooseBid}
     * @description Verifies the AI decides to "pass" when its hand strength is below the threshold.
     */
    it("should pass when hand strength is below the threshold", () => {
      const weakHand = [
        createCard(SUITS.CLUBS, RANKS.NINE), 
        createCard(SUITS.SPADES, RANKS.TEN), 
        createCard(SUITS.DIAMONDS, RANKS.QUEEN),
      ]; // Total: 0 points for Hearts
      const result = aiLogic.chooseBid(weakHand, turnCard, false, []);
      assert.strictEqual(result.decision, "pass");
    });

    /**
     * @test {chooseBid}
     * @description Verifies the AI decides to "callTrump" in the second round if it has a strong suit other than the one turned down.
     */
    it("should call trump in the second round if hand strength is sufficient for any suit", () => {
      const turnCardSpades = createCard(SUITS.SPADES, RANKS.NINE);
      const bids = [{ decision: "pass" }, { decision: "pass" }];
      const result = aiLogic.chooseBid(mockHand, turnCardSpades, false, bids);

      // _evaluateHand(mockHand, 'hearts') = 32. This is > BID_THRESHOLD.
      // AI should call 'hearts' as trump.
      assert.strictEqual(result.decision, "callTrump");
      assert.strictEqual(result.suit, SUITS.HEARTS);
    });

    /**
     * @test {chooseBid}
     * @description Verifies the AI passes in the second round if no suit meets the bidding threshold.
     */
    it("should pass in the second round if hand strength is insufficient for any suit", () => {
      const veryWeakHand = [
        createCard(SUITS.CLUBS, RANKS.NINE),
        createCard(SUITS.SPADES, RANKS.TEN),
        createCard(SUITS.DIAMONDS, RANKS.QUEEN),
      ];
      const bids = [{ decision: "pass" }, { decision: "pass" }];
      const result = aiLogic.chooseBid(veryWeakHand, turnCard, false, bids);
      assert.strictEqual(result.decision, "pass");
    });
  });

  /**
   * @describe Test suite for the `chooseCardToPlay` function.
   */
  describe("chooseCardToPlay()", () => {
    // Note: The chooseCardToPlay logic has been simplified/adjusted in refactoring.
    // These tests validate the new, more robust behavior.
    const trumpSuit = SUITS.HEARTS;

    it("should follow suit with the lowest winning card if it can win", () => {
      const currentTrick = [createCard(SUITS.HEARTS, RANKS.TEN)]; // Opponent leads a trump (value: 40)
      const hand = [
        createCard(SUITS.HEARTS, RANKS.ACE),   // Can win (value: 80)
        createCard(SUITS.HEARTS, RANKS.KING),  // Can also win (value: 70)
        createCard(SUITS.CLUBS, RANKS.NINE),   // Off-suit
      ];
      const result = aiLogic.chooseCardToPlay(
        hand,
        currentTrick,
        trumpSuit,
        SUITS.HEARTS, // Lead suit is trump
      );
      // AI has K and A of hearts, both beat the 10. It should play the lowest winning card.
      assert.deepStrictEqual(result, createCard(SUITS.HEARTS, RANKS.KING));
    });

    it("should slough the lowest value card when unable to follow suit", () => {
      const currentTrick = [createCard(SUITS.SPADES, RANKS.ACE)]; // Opponent leads spades
      const hand = [
        createCard(SUITS.HEARTS, RANKS.QUEEN),  // Trump card (value: 60)
        createCard(SUITS.CLUBS, RANKS.NINE),    // Lowest value off-suit (value: 10)
        createCard(SUITS.DIAMONDS, RANKS.TEN),  // Another off-suit (value: 12)
      ];
      const result = aiLogic.chooseCardToPlay(
        hand,
        currentTrick,
        trumpSuit,
        SUITS.SPADES, // Lead suit is spades
      );
      // Can't follow suit. Slough lowest value card. 9 of Clubs is lowest.
      assert.deepStrictEqual(result, createCard(SUITS.CLUBS, RANKS.NINE));
    });

    it("should play the lowest card of the lead suit when unable to win the trick", () => {
      const currentTrick = [createCard(SUITS.SPADES, RANKS.ACE)]; // Opponent leads a high spade
      const hand = [
        createCard(SUITS.SPADES, RANKS.NINE), // Can follow suit, but can't win
        createCard(SUITS.SPADES, RANKS.TEN),  // Can also follow suit, can't win
        createCard(SUITS.HEARTS, RANKS.JACK), // Right Bower (could win by trumping, but must follow)
      ];
      const result = aiLogic.chooseCardToPlay(
        hand,
        currentTrick,
        SUITS.HEARTS, // Hearts are trump
        SUITS.SPADES, // Lead suit is spades
      );
      // Must follow suit (Spades). Has 9 and 10 of spades. Neither can win. Play lowest.
      assert.deepStrictEqual(result, createCard(SUITS.SPADES, RANKS.NINE));
    });

    it("should return null for an empty hand", () => {
      const result = aiLogic.chooseCardToPlay([], [], SUITS.HEARTS, SUITS.HEARTS);
      assert.strictEqual(result, null);
    });
  });
});