/**
 * @file Test suite for AI Logic module in Euchre game
 * @module test/game/logic/aiLogic.unit.test
 * @description Tests for AI decision making in the Euchre game, including bidding strategies,
 * card selection, and hand evaluation. This test suite verifies the AI's ability to make
 * intelligent decisions based on the current game state.
 * 
 * @see {@link module:src/game/logic/aiLogic} for the implementation being tested
 * @see {@link module:test/helpers/test-helpers} for test utilities
 * @see {@link module:src/config/constants} for game constants
 */

import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { CARD_SUITS, CARD_VALUES } from "../../../src/config/constants.js";
import { createMockCard } from "../../helpers/test-helpers.js";

/**
 * @constant {Object} POINTS
 * @description Point values assigned to different card combinations in the AI's evaluation
 * @property {number} RIGHT_BOWER - Points for the Right Bower (Jack of trump suit)
 * @property {number} LEFT_BOWER - Points for the Left Bower (Jack of same color as trump)
 * @property {number} TRUMP_ACE - Points for Ace of trump suit
 * @property {number} TRUMP_KING - Points for King of trump suit
 * @property {number} TRUMP_QUEEN - Points for Queen of trump suit
 * @property {number} TRUMP_TEN - Points for Ten of trump suit
 * @property {number} TRUMP_NINE - Points for Nine of trump suit
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
 * @constant {Object} AI_CARD_VALUES
 * @description Numerical values assigned to different card types for AI decision making
 * @property {number} TRUMP_RIGHT_BOWER - Value for Right Bower
 * @property {number} TRUMP_LEFT_BOWER - Value for Left Bower
 * @property {number} TRUMP_ACE - Value for Ace of trump
 * @property {number} TRUMP_KING - Value for King of trump
 * @property {number} TRUMP_QUEEN - Value for Queen of trump
 * @property {number} TRUMP_TEN - Value for Ten of trump
 * @property {number} TRUMP_NINE - Value for Nine of trump
 * @property {number} OFFSUIT_ACE - Value for Ace of non-trump
 * @property {number} OFFSUIT_KING - Value for King of non-trump
 * @property {number} OFFSUIT_QUEEN - Value for Queen of non-trump
 * @property {number} OFFSUIT_JACK - Value for Jack of non-trump (not Left Bower)
 * @property {number} OFFSUIT_TEN - Value for Ten of non-trump
 * @property {number} OFFSUIT_NINE - Value for Nine of non-trump
 * @property {number} INVALID - Value for invalid/unknown cards
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
 * Test suite for the AI Logic module
 * @name AI Logic Module
 * @function
 * @description Tests the AI's decision-making capabilities in the Euchre game
 */
describe("AI Logic Module", () => {
  /** @type {Object} Reference to the AI Logic module being tested */
  let aiLogic;

  /**
   * Setup before each test case
   * - Resets all mocks
   * - Re-imports the AI Logic module to ensure test isolation
   */
  beforeEach(async () => {
    mock.reset();
    aiLogic = await import("../../../src/game/logic/aiLogic.js");
  });

  /**
   * Cleanup after each test case
   * - Restores all mocks to their original state
   */
  afterEach(() => {
    mock.restoreAll();
  });

  /**
   * A mock hand used across multiple test cases
   * Contains a mix of trump and non-trump cards:
   * - Right Bower (Jack of Hearts)
   * - Left Bower (Jack of Diamonds, when Hearts is trump)
   * - Ace of Hearts (trump)
   * - Nine of Clubs (off-suit)
   * - Queen of Spades (off-suit)
   * @type {Array<Object>}
   */
  const mockHand = [
    createMockCard(CARD_SUITS.HEARTS, "J"),
    createMockCard(CARD_SUITS.DIAMONDS, "J"),
    createMockCard(CARD_SUITS.HEARTS, "A"),
    createMockCard(CARD_SUITS.CLUBS, "9"),
    createMockCard(CARD_SUITS.SPADES, "Q"),
  ];

  /**
   * Test suite for the countTrumpInHand function
   * @name countTrumpInHand()
   * @function
   * @description Tests the AI's ability to count trump cards in a hand,
   * including special cases like bowers and invalid inputs
   */
  describe("countTrumpInHand()", () => {
    /**
     * Test case: Should correctly identify and count all trump cards in a hand
     * - Verifies that Right Bower, Left Bower, and other trump cards are counted
     * - Uses a hand with mixed trump and non-trump cards
     */
    it("should correctly count trump cards in a hand, including bowers", () => {
      const trumpSuit = CARD_SUITS.HEARTS;
      const result = aiLogic.countTrumpInHand(mockHand, trumpSuit);
      assert.strictEqual(
        result,
        3,
        "Should count Right Bower, Left Bower, and Trump Ace"
      );
    });

    it("should return 0 for an empty hand", () => {
      const result = aiLogic.countTrumpInHand([], CARD_SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });

    /**
     * Test case: Should handle null hand input
     * - Verifies that null input returns a count of 0
     * - Tests the function's null-safety
     */
    it("should return 0 for a null hand input", () => {
      const result = aiLogic.countTrumpInHand(null, CARD_SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });

    /**
     * Test case: Should correctly identify when no trump cards are present
     * - Verifies that the function returns 0 when no cards match the trump suit
     * - Uses a hand with only non-trump cards
     */
    it("should return 0 if no trump cards are present", () => {
      const handWithoutTrump = [
        { suit: CARD_SUITS.CLUBS, value: "9" },
        { suit: CARD_SUITS.SPADES, value: "Q" },
      ];
      const result = aiLogic.countTrumpInHand(handWithoutTrump, CARD_SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });

    it("should ignore invalid card objects in the hand", () => {
      const handWithInvalid = [
        ...mockHand,
        null,
        {},
        { suit: CARD_SUITS.HEARTS },
      ];
      const trumpSuit = CARD_SUITS.HEARTS;
      const result = aiLogic.countTrumpInHand(handWithInvalid, trumpSuit);
      assert.strictEqual(result, 3, "Should count valid trump and ignore invalid objects");
    });
  });

  /**
   * Test suite for the calculateHandStrength function
   * @name calculateHandStrength()
   * @function
   * @description Tests the AI's ability to calculate the total strength of a hand
   * based on the point values of trump cards and bowers
   */
  describe("calculateHandStrength()", () => {
    /**
     * Test case: Should calculate total strength of a hand with mixed cards
     * - Verifies that the function correctly sums points from Right Bower, Left Bower, and Trump Ace
     * - Uses a hand with multiple trump cards of different values
     */
    it("should calculate the total strength of a hand including bowers and trump", () => {
      const trumpSuit = CARD_SUITS.HEARTS;
      const result = aiLogic.calculateHandStrength(mockHand, trumpSuit);
      const expected = POINTS.RIGHT_BOWER + POINTS.LEFT_BOWER + POINTS.TRUMP_ACE;
      assert.strictEqual(
        result,
        expected,
        "Hand strength should be the sum of all trump points"
      );
    });

    /**
     * Test case: Should handle a hand with only a Left Bower
     * - Verifies that the function correctly identifies and scores the Left Bower
     * - Tests the function's behavior with a minimal valid hand
     */
    it("should calculate strength correctly for a hand with only a Left Bower", () => {
      const hand = [createMockCard(CARD_SUITS.DIAMONDS, 'J')];
      const result = aiLogic.calculateHandStrength(hand, CARD_SUITS.HEARTS);
      assert.strictEqual(result, POINTS.LEFT_BOWER);
    });

    it("should ignore invalid cards in hand strength calculation", () => {
      const hand = [
        createMockCard(CARD_SUITS.HEARTS, "A"),
        null,
        {},
        { suit: CARD_SUITS.HEARTS }, // missing value
        { value: "K" } // missing suit
      ];
      const result = aiLogic.calculateHandStrength(hand, CARD_SUITS.HEARTS);
      assert.strictEqual(result, POINTS.TRUMP_ACE);
    });

    it("should return null for an empty trick", () => {
        const result = aiLogic.getWinningCard([], CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.strictEqual(result, null);
    });

    /**
     * Test case: Should ignore invalid cards in the trick
     * - Verifies that the function ignores cards with missing or invalid properties
     * - Tests the function's input validation and error handling
     * - Ensures the function doesn't throw errors with malformed input
     */
    it("should ignore invalid cards in the trick", () => {
        const trick = [
            createMockCard(CARD_SUITS.CLUBS, '10'),
            null,
            createMockCard(CARD_SUITS.CLUBS, 'A'),
            {}
        ];
        const result = aiLogic.getWinningCard(trick, CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, 'A'));
    });

    /**
     * Test case: Should ignore card objects with missing properties in the trick
     * - Verifies that the function ignores cards with missing suit or value properties
     * - Tests the function's input validation and error handling
     * - Ensures the function doesn't throw errors with malformed input
     */
    it("should ignore card objects with missing properties in the trick", () => {
        const trick = [
            createMockCard(CARD_SUITS.CLUBS, '10'),
            { suit: CARD_SUITS.CLUBS },
            createMockCard(CARD_SUITS.CLUBS, 'A'),
            { value: '9' }
        ];
        const result = aiLogic.getWinningCard(trick, CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, 'A'));
    });

    /**
     * Test case: Should keep trump as winning card when a non-trump is played
     * - Verifies that the function prioritizes trump cards over non-trump cards
     * - Tests the function's behavior with a mix of trump and non-trump cards
     * - Ensures the function correctly applies trump suit rules
     */
    it("should keep trump as winning card when a non-trump is played", () => {
        const trumpSuit = CARD_SUITS.HEARTS;
        const leadSuit = CARD_SUITS.SPADES;
        const trick = [
            createMockCard(CARD_SUITS.HEARTS, '9'),
            createMockCard(CARD_SUITS.SPADES, 'A'),
        ];
        const result = aiLogic.getWinningCard(trick, trumpSuit, leadSuit);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.HEARTS, '9'));
    });

    /**
     * Test case: Should keep lead suit as winning card when another off-suit is played
     * - Verifies that the function prioritizes the led suit over other non-trump suits
     * - Tests the function's behavior with multiple non-trump suits
     * - Ensures the function correctly applies led suit rules
     */
    it("should keep lead suit as winning card when another off-suit is played", () => {
        const trumpSuit = CARD_SUITS.HEARTS;
        const leadSuit = CARD_SUITS.SPADES;
        const trick = [
            createMockCard(CARD_SUITS.SPADES, '9'),
            createMockCard(CARD_SUITS.CLUBS, 'A'),
        ];
        const result = aiLogic.getWinningCard(trick, trumpSuit, leadSuit);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.SPADES, '9'));
    });

    /**
     * Test case: Should select a trump card as winner over a higher-value lead suit card
     * - Verifies that the function prioritizes trump cards over the led suit
     * - Tests the function's behavior with a mix of trump and non-trump cards
     * - Ensures the function correctly applies trump suit rules
     */
    it("should select a trump card as winner over a higher-value lead suit card", () => {
        const trumpSuit = CARD_SUITS.HEARTS;
        const leadSuit = CARD_SUITS.SPADES;
        const trick = [
            createMockCard(CARD_SUITS.SPADES, 'A'),
            createMockCard(CARD_SUITS.HEARTS, '9'),
        ];
        const result = aiLogic.getWinningCard(trick, trumpSuit, leadSuit);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.HEARTS, '9'));
    });
  });

  describe("chooseBid()", () => {
    it("should pass if hand is empty or turnCard is missing", () => {
      assert.deepStrictEqual(aiLogic.chooseBid([], { suit: CARD_SUITS.HEARTS, value: "9" }, false), { decision: "pass" });
      assert.deepStrictEqual(aiLogic.chooseBid(mockHand, null, false), { decision: "pass" });
    });

    it("should order up if hand strength meets threshold", () => {
      // Strong hand for Hearts
      const strongHand = [
        createMockCard(CARD_SUITS.HEARTS, "J"), // Right Bower (15)
        createMockCard(CARD_SUITS.HEARTS, "A"), // Ace (7)
        createMockCard(CARD_SUITS.HEARTS, "K"), // King (5) = 27 > 20
      ];
      const turnCard = { suit: CARD_SUITS.HEARTS, value: "9" };
      const result = aiLogic.chooseBid(strongHand, turnCard, false);
      assert.deepStrictEqual(result, { decision: "orderUp" });
    });

    it("should pass if hand strength is below threshold", () => {
      // Weak hand for Hearts
      const weakHand = [
        createMockCard(CARD_SUITS.SPADES, "9"),
        createMockCard(CARD_SUITS.CLUBS, "9"),
        createMockCard(CARD_SUITS.DIAMONDS, "9"),
      ];
      const turnCard = { suit: CARD_SUITS.HEARTS, value: "9" };
      const result = aiLogic.chooseBid(weakHand, turnCard, false);
      assert.deepStrictEqual(result, { decision: "pass" });
    });

    it("should call trump in round 2 if a suit meets threshold", () => {
      // Round 2: Hearts was turned down. Hand is strong in Spades.
      const hand = [
        createMockCard(CARD_SUITS.SPADES, "J"), // Right Bower (15)
        createMockCard(CARD_SUITS.SPADES, "A"), // Ace (7) = 22 > 20
      ];
      const turnCard = { suit: CARD_SUITS.HEARTS, value: "9" };
      // 4 passes indicate round 2
      const bids = [
        { decision: "pass" }, { decision: "pass" }, { decision: "pass" }, { decision: "pass" }
      ];
      
      const result = aiLogic.chooseBid(hand, turnCard, false, bids);
      assert.deepStrictEqual(result, { decision: "callTrump", suit: CARD_SUITS.SPADES });
    });

    it("should pass in round 2 if no suit meets threshold", () => {
      const hand = [
        createMockCard(CARD_SUITS.SPADES, "9"),
        createMockCard(CARD_SUITS.CLUBS, "9"),
      ];
      const turnCard = { suit: CARD_SUITS.HEARTS, value: "9" };
      const bids = [
        { decision: "pass" }, { decision: "pass" }, { decision: "pass" }, { decision: "pass" }
      ];
      
      const result = aiLogic.chooseBid(hand, turnCard, false, bids);
      assert.deepStrictEqual(result, { decision: "pass" });
    });
  });

  describe("getCardValue()", () => {
    it("should return correct values for Bowers", () => {
      const trump = CARD_SUITS.HEARTS;
      const rightBower = createMockCard(CARD_SUITS.HEARTS, "J");
      const leftBower = createMockCard(CARD_SUITS.DIAMONDS, "J");
      
      assert.strictEqual(aiLogic.getCardValue(rightBower, trump), AI_CARD_VALUES.TRUMP_RIGHT_BOWER);
      assert.strictEqual(aiLogic.getCardValue(leftBower, trump), AI_CARD_VALUES.TRUMP_LEFT_BOWER);
    });

    it("should return INVALID for invalid cards", () => {
      assert.strictEqual(aiLogic.getCardValue(null, CARD_SUITS.HEARTS), AI_CARD_VALUES.INVALID);
      assert.strictEqual(aiLogic.getCardValue({}, CARD_SUITS.HEARTS), AI_CARD_VALUES.INVALID);
    });
  });

  /**
   * Test suite for the chooseCardToPlay function
   * @name chooseCardToPlay()
   * @function
   * @description Tests the AI's ability to select the best card to play
   * in various game situations, including leading, following suit, and sloughing
   */
  describe("chooseCardToPlay()", () => {
    it("should return null if hand is empty or invalid", () => {
      assert.strictEqual(aiLogic.chooseCardToPlay([], [], CARD_SUITS.HEARTS), null);
      assert.strictEqual(aiLogic.chooseCardToPlay(null, [], CARD_SUITS.HEARTS), null);
    });

    it("should lead with lowest trump if hand contains only trumps", () => {
      const trump = CARD_SUITS.HEARTS;
      const hand = [
        createMockCard(trump, "A"),
        createMockCard(trump, "K"),
        createMockCard(trump, "9"),
      ];
      // Should play lowest trump (9)
      const result = aiLogic.chooseCardToPlay(hand, [], trump, null);
      assert.deepStrictEqual(result, createMockCard(trump, "9"));
    });

    it("should lead with highest non-trump when it is the first card in the hand", () => {
        const hand = [
            createMockCard(CARD_SUITS.SPADES, 'A'),
            createMockCard(CARD_SUITS.CLUBS, 'K'),
            createMockCard(CARD_SUITS.HEARTS, '9'),
        ];
        const currentTrick = [];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, CARD_SUITS.HEARTS, null);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.SPADES, 'A'));
    });

    /**
     * Test case: Should ignore malformed cards when choosing a lead card
     * - Verifies that the function skips null or invalid card objects
     * - Tests the function's ability to handle malformed input when leading
     * - Ensures the function returns a valid card when available
     */
    it("chooseCardToPlay should ignore malformed cards in hand when leading", () => {
        const hand = [null, createMockCard(CARD_SUITS.SPADES, 'A'), {}];
        const result = aiLogic.chooseCardToPlay(hand, [], CARD_SUITS.HEARTS, null);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.SPADES, 'A'));
    });

    /**
     * Test case: Should handle malformed cards when following suit
     * - Verifies that the function skips invalid cards when determining suit
     * - Tests the function's ability to handle malformed input when following
     * - Ensures the function returns a valid card of the led suit when available
     */
    it("chooseCardToPlay should ignore malformed cards when determining cards in suit", () => {
        const hand = [null, createMockCard(CARD_SUITS.CLUBS, 'A'), {}];
        const currentTrick = [createMockCard(CARD_SUITS.CLUBS, '9')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, 'A'));
    });

    /**
     * Test case: Should handle malformed cards when finding winning plays
     * - Verifies that the function skips invalid cards when evaluating winning plays
     * - Tests the function's ability to handle malformed input in trick evaluation
     * - Ensures the function returns a valid winning card when available
     */
    it("chooseCardToPlay should ignore malformed cards when finding playable winning cards", () => {
        const hand = [null, createMockCard(CARD_SUITS.CLUBS, 'A'), {}];
        const currentTrick = [createMockCard(CARD_SUITS.CLUBS, '9')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, 'A'));
    });

    /**
     * Test case: Should not play a lower trump when a higher one is winning
     * - Verifies that the function recognizes when a lower trump won't win the trick
     * - Tests the function's ability to evaluate relative trump card values
     * - Ensures the function doesn't waste high-value trump cards unnecessarily
     */
    it("chooseCardToPlay should not consider a lower trump as a winning card", () => {
        const trumpSuit = CARD_SUITS.HEARTS;
        const currentTrick = [createMockCard(trumpSuit, 'K')];
        const hand = [createMockCard(trumpSuit, '9')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, trumpSuit, trumpSuit);
        assert.deepStrictEqual(result, createMockCard(trumpSuit, '9'));
    });

    /**
     * Test case: Should recognize when trumping is a winning play
     * - Verifies that the function identifies when a trump card can win the trick
     * - Tests the function's ability to evaluate trump cards against led suit
     * - Ensures the function plays the winning trump card when appropriate
     */
    it("chooseCardToPlay should correctly identify trumping as a winning play when following suit", () => {
        const trumpSuit = CARD_SUITS.SPADES;
        const leadSuit = CARD_SUITS.SPADES;
        const currentTrick = [createMockCard(leadSuit, '9')];
        const hand = [createMockCard(trumpSuit, 'A')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, trumpSuit, leadSuit);
        assert.deepStrictEqual(result, createMockCard(trumpSuit, 'A'));
    });

    /**
     * Test case: Should play the highest off-suit card to win
     * - Verifies that the function selects the highest card of the led suit
     * - Tests the function's ability to evaluate relative card values within a suit
     * - Ensures the function plays to win when possible with off-suit cards
     */
    it("chooseCardToPlay should correctly play higher off-suit to win", () => {
        const trumpSuit = CARD_SUITS.HEARTS;
        const leadSuit = CARD_SUITS.SPADES;
        const currentTrick = [createMockCard(leadSuit, '10')];
        const hand = [createMockCard(leadSuit, 'A')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, trumpSuit, leadSuit);
        assert.deepStrictEqual(result, createMockCard(leadSuit, 'A'));
    });

    /**
     * Test case: Should handle malformed cards when sloughing
     * - Verifies that the function skips invalid cards when discarding
     * - Tests the function's ability to handle malformed input when sloughing
     * - Ensures the function returns a valid card when sloughing is necessary
     */
    it("chooseCardToPlay should ignore malformed cards when sloughing", () => {
        const currentTrick = [createMockCard(CARD_SUITS.SPADES, 'A')];
        const hand = [null, createMockCard(CARD_SUITS.CLUBS, '9'), {}];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, CARD_SUITS.HEARTS, CARD_SUITS.SPADES);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, '9'));
    });

    /**
     * Test case: Should handle null or non-array input in getLowestCard
     * - Verifies that the function gracefully handles invalid input
     * - Tests the function's null-safety and input validation
     * - Ensures the function returns null for invalid input
     */
    it("getLowestCard should handle non-array input", () => {
        assert.strictEqual(aiLogic.getLowestCard(null, CARD_SUITS.HEARTS), null);
    });

    /**
     * Test case: Should handle single-card array in getLowestCard
     * - Verifies that the function works correctly with a single card
     * - Tests the function's behavior with minimal valid input
     * - Ensures the function returns the only card when only one is provided
     */
    it("getLowestCard should handle single-card array", () => {
        const card = createMockCard(CARD_SUITS.HEARTS, 'A');
        assert.deepStrictEqual(aiLogic.getLowestCard([card], CARD_SUITS.HEARTS), card);
    });

    /**
     * Test case: Should handle equal-value cards in getLowestCard
     * - Verifies that the function returns the first card when values are equal
     * - Tests the function's tie-breaking behavior
     * - Ensures consistent behavior when multiple cards have the same value
     */
    it("getLowestCard should return first card if values are equal", () => {
        const card1 = createMockCard(CARD_SUITS.CLUBS, '9');
        const card2 = createMockCard(CARD_SUITS.SPADES, '9');
        const result = aiLogic.getLowestCard([card1, card2], CARD_SUITS.HEARTS);
        assert.deepStrictEqual(result, card1);
    });

    /**
     * Test case: Should lead with highest non-trump when it's first
     * - Verifies that the function selects the highest non-trump card when leading
     * - Tests the function's ability to identify the highest card in the hand
     * - Ensures the function prioritizes non-trump cards when leading
     */
    it("should lead with highest non-trump when it is the first card in the hand", () => {
        const hand = [
            createMockCard(CARD_SUITS.SPADES, 'A'),
            createMockCard(CARD_SUITS.CLUBS, 'K'),
            createMockCard(CARD_SUITS.HEARTS, '9'),
        ];
        const result = aiLogic.chooseCardToPlay(hand, [], CARD_SUITS.HEARTS, null);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.SPADES, 'A'));
    });

    /**
     * Test case: Should find highest non-trump regardless of position
     * - Verifies that the function correctly identifies the highest non-trump card
     * - Tests the function's ability to scan the entire hand for the best lead
     * - Ensures the function doesn't depend on card order when choosing a lead
     */
    it("should lead with highest non-trump when it is not the first card in the hand", () => {
        const hand = [
            createMockCard(CARD_SUITS.CLUBS, 'K'),
            createMockCard(CARD_SUITS.SPADES, 'A'),
            createMockCard(CARD_SUITS.HEARTS, '9'),
        ];
        const result = aiLogic.chooseCardToPlay(hand, [], CARD_SUITS.HEARTS, null);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.SPADES, 'A'));
    });

    /**
     * Test case: Should play trump when void in lead suit
     * - Verifies that the function plays a trump card when unable to follow suit
     * - Tests the function's ability to recognize when it's void in the led suit
     * - Ensures the function uses trump cards effectively when appropriate
     */
    it("chooseCardToPlay should win with trump when void in lead suit", () => {
        const trumpSuit = CARD_SUITS.HEARTS;
        const leadSuit = CARD_SUITS.SPADES;
        const currentTrick = [createMockCard(leadSuit, 'A')];
        const hand = [createMockCard(trumpSuit, '9')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, trumpSuit, leadSuit);
        assert.deepStrictEqual(result, createMockCard(trumpSuit, '9'));
    });

    /**
     * Test case: Should handle leading with only trump and invalid cards
     * - Verifies that the function falls back to the lowest trump when no valid non-trump cards exist
     * - Tests the function's ability to handle edge cases with invalid cards
     * - Ensures the function always returns a valid card when possible
     */
    it("chooseCardToPlay should fallback to lowest card when leading and hand has only trump and invalid cards", () => {
        const hand = [
            {},
            createMockCard(CARD_SUITS.HEARTS, 'A'),
            createMockCard(CARD_SUITS.HEARTS, '9'),
        ];
        const result = aiLogic.chooseCardToPlay(hand, [], CARD_SUITS.HEARTS, null);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.HEARTS, '9'));
    });
  });

  describe("Coverage Edge Cases", () => {
    it("chooseBid should return pass if bids array is invalid", () => {
      const result = aiLogic.chooseBid({ bids: null }, "north");
      assert.strictEqual(result.decision, "pass");
    });

    it("getCardValue should return 0 for invalid card", () => {
      const result = aiLogic.getCardValue(null, "HEARTS");
      assert.strictEqual(result, 0);
      
      const result2 = aiLogic.getCardValue({}, "HEARTS");
      assert.strictEqual(result2, 0);
    });

    it("getLowestCard should return null for empty or invalid card list", () => {
      assert.strictEqual(aiLogic.getLowestCard([], "HEARTS"), null);
      assert.strictEqual(aiLogic.getLowestCard([null, {}], "HEARTS"), null);
    });

    it("chooseCardToPlay should handle null leadSuit", () => {
      const hand = [{ id: "AH", suit: "HEARTS", value: "A" }];
      const trick = [{ id: "9H", suit: "HEARTS", value: "9" }];
      // Should not throw and return a card
      const result = aiLogic.chooseCardToPlay(hand, trick, "SPADES", null);
      assert.ok(result);
    });
    
    it("getWinningCard should handle invalid cards in reduce", () => {
        // This targets the reduce logic where currentCard is invalid
        const trick = [
            { id: "AH", suit: "HEARTS", value: "A" },
            null,
            { id: "KS", suit: "SPADES", value: "K" }
        ];
        const winner = aiLogic.getWinningCard(trick, "HEARTS");
        assert.strictEqual(winner.id, "AH");
    });

    it("calculateHandStrength should handle Trump Queen, 10, and invalid values", () => {
        const hand = [
            { id: "Q", suit: "HEARTS", value: "Q" },
            { id: "10", suit: "HEARTS", value: "10" },
            { id: "X", suit: "HEARTS", value: "INVALID" }
        ];
        // Q=3, 10=2, Invalid=0 -> Total 5
        assert.strictEqual(aiLogic.calculateHandStrength(hand, "HEARTS"), 5);
    });

    it("chooseBid should handle non-string turnCard suit", () => {
        const hand = [{ id: "AH", suit: "HEARTS", value: "A" }];
        const turnCard = { id: "9H", suit: null, value: "9" }; // Invalid suit
        const result = aiLogic.chooseBid(hand, turnCard, false, []);
        assert.strictEqual(result.decision, "pass");
    });

    it("getCardValue should handle invalid values for trump and offsuit", () => {
        const trumpCard = { id: "X", suit: "HEARTS", value: "INVALID" };
        const offCard = { id: "Y", suit: "SPADES", value: "INVALID" };
        
        assert.strictEqual(aiLogic.getCardValue(trumpCard, "HEARTS"), 0); // AI_CARD_VALUES.INVALID
        assert.strictEqual(aiLogic.getCardValue(offCard, "HEARTS"), 0);
    });

    it("getWinningCard should handle [null, valid] trick", () => {
        const trick = [
            null,
            { id: "AH", suit: "HEARTS", value: "A" }
        ];
        const winner = aiLogic.getWinningCard(trick, "HEARTS");
        assert.strictEqual(winner.id, "AH");
    });

    it("getWinningCard should keep current winner if next card is lower", () => {
        const trick = [
            { id: "AH", suit: "HEARTS", value: "A" },
            { id: "KH", suit: "HEARTS", value: "K" }
        ];
        const winner = aiLogic.getWinningCard(trick, "HEARTS");
        assert.strictEqual(winner.id, "AH");
    });

    it("countTrumpInHand should handle null/invalid hand", () => {
        assert.strictEqual(aiLogic.countTrumpInHand(null, "HEARTS"), 0);
        assert.strictEqual(aiLogic.countTrumpInHand("not-array", "HEARTS"), 0);
    });

    it("calculateHandStrength should handle null/invalid hand or missing trump", () => {
        assert.strictEqual(aiLogic.calculateHandStrength(null, "HEARTS"), 0);
        assert.strictEqual(aiLogic.calculateHandStrength([], null), 0);
    });
  });
});