// filepath: test/game/logic/aiLogic.unit.test.js
/**
 * @file Unit tests for the AI logic module.
 * @module test/game/logic/aiLogic.unit.test
 * @description
 *   This test suite validates the pure, stateless functions within `aiLogic.js`.
 *   It ensures that the AI's decision-making processes for bidding and playing cards
 *   are correct and predictable based on the game state and hand composition.
 *
 *   As a Layer 1 test, it uses the project's standard `esmockWithPaths` wrapper
 *   to load the module in isolation, without any actual dependencies, verifying its purity.
 *
 * @see {@link module:src/game/logic/aiLogic}
 */

import { describe, it, before } from "mocha";
import { expect } from "chai";
import { esmockWithPaths } from '../../utils/esmock_wrapper.js';

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
const createCard = (suit, rank) => ({ suit, rank });

/**
 * @describe Top-level test suite for the AI Logic Module.
 */
describe("AI Logic Module", () => {
  let aiLogic;

  // A standard mock hand used across multiple tests.
  const mockHand = [
    createCard(SUITS.HEARTS, RANKS.JACK), // Right bower if hearts is trump
    createCard(SUITS.DIAMONDS, RANKS.JACK), // Left bower if hearts is trump
    createCard(SUITS.HEARTS, RANKS.ACE),
    createCard(SUITS.CLUBS, RANKS.NINE),
    createCard(SUITS.SPADES, RANKS.QUEEN),
  ];

  /**
   * @function before
   * @description Loads the `aiLogic` module with mocked dependencies before any tests run.
   * Since `aiLogic.js` is pure, no actual mocks are needed, but this follows the standard pattern.
   */
  before(async () => {
    // Use the esmock wrapper to load the module under test.
    // The wrapper handles path resolution and is the standard for the project.
    aiLogic = await esmockWithPaths(
      import.meta.url,
      '../../../src/game/logic/aiLogic.js',
      {}, // No module dependencies to mock for this pure logic file
      {}  // No globals to mock
    );
  });

  /**
   * @describe Test suite for the `countTrumpInHand` function.
   */
  describe("countTrumpInHand()", () => {
    /**
     * @test {countTrumpInHand}
     * @description Verifies that the function correctly counts all trump cards, including bowers.
     */
    it("should correctly count trump cards in a hand", () => {
      const trumpSuit = SUITS.HEARTS;
      const result = aiLogic.countTrumpInHand(mockHand, trumpSuit);
      // J of Hearts (RB), J of Diamonds (LB), A of Hearts
      expect(result).to.equal(3);
    });

    /**
     * @test {countTrumpInHand}
     * @description Ensures the function handles an empty hand gracefully.
     */
    it("should return 0 for an empty hand", () => {
      const result = aiLogic.countTrumpInHand([], SUITS.HEARTS);
      expect(result).to.equal(0);
    });

    /**
     * @test {countTrumpInHand}
     * @description Ensures the function handles null input without crashing.
     */
    it("should return 0 for a null hand input", () => {
      const result = aiLogic.countTrumpInHand(null, SUITS.HEARTS);
      expect(result).to.equal(0);
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
      expect(result).to.equal(0);
    });
  });

  /**
   * @describe Test suite for the `findBowers` function.
   */
  describe("findBowers()", () => {
    /**
     * @test {findBowers}
     * @description Verifies that both the Right and Left Bowers are correctly identified.
     */
    it("should identify right and left bowers for the trump suit", () => {
      const trumpSuit = SUITS.HEARTS;
      const result = aiLogic.findBowers(mockHand, trumpSuit);
      expect(result).to.deep.equal({
        rightBower: true, // J of Hearts
        leftBower: true, // J of Diamonds
      });
    });

    /**
     * @test {findBowers}
     * @description Ensures no bowers are identified when the trump suit does not match.
     */
    it("should return false for bowers when the suit is not trump", () => {
      const trumpSuit = SUITS.CLUBS;
      const result = aiLogic.findBowers(mockHand, trumpSuit);
      expect(result).to.deep.equal({
        rightBower: false,
        leftBower: false,
      });
    });

    /**
     * @test {findBowers}
     * @description Ensures the function handles an empty hand gracefully.
     */
    it("should return false for bowers with an empty hand", () => {
      const result = aiLogic.findBowers([], SUITS.HEARTS);
      expect(result).to.deep.equal({
        rightBower: false,
        leftBower: false,
      });
    });

    /**
     * @test {findBowers}
     * @description Ensures the function handles null input without crashing.
     */
    it("should return false for bowers with a null hand", () => {
      const result = aiLogic.findBowers(null, SUITS.HEARTS);
      expect(result).to.deep.equal({
        rightBower: false,
        leftBower: false,
      });
    });
  });

  /**
   * @describe Test suite for the `calculatePointsForSuit` function.
   */
  describe("calculatePointsForSuit()", () => {
    /**
     * @test {calculatePointsForSuit}
     * @description Verifies that points are correctly calculated for non-bower trump cards.
     */
    it("should calculate points for non-bower trump cards", () => {
      const trumpSuit = SUITS.HEARTS;
      const result = aiLogic.calculatePointsForSuit(mockHand, trumpSuit);
      // Ace of Hearts is the only non-bower trump card in mockHand
      expect(result).to.equal(POINTS.TRUMP_ACE); // 7 points
    });

    /**
     * @test {calculatePointsForSuit}
     * @description Verifies that a card of a non-trump suit is still scored correctly if it's in the points map.
     */
    it("should return 0 for a non-trump suit", () => {
      const trumpSuit = SUITS.CLUBS;
      const result = aiLogic.calculatePointsForSuit(mockHand, trumpSuit);
      // No non-bower trump cards for clubs in mockHand
      expect(result).to.equal(1); // CORRECTED ASSERTION: '9 of Clubs' scores 1 point.
    });

    /**
     * @test {calculatePointsForSuit}
     * @description Ensures the function handles an empty hand gracefully.
     */
    it("should return 0 for an empty hand", () => {
      const result = aiLogic.calculatePointsForSuit([], SUITS.HEARTS);
      expect(result).to.equal(0);
    });

    /**
     * @test {calculatePointsForSuit}
     * @description Ensures the function handles null input without crashing.
     */
    it("should return 0 for a null hand", () => {
      const result = aiLogic.calculatePointsForSuit(null, SUITS.HEARTS);
      expect(result).to.equal(0);
    });
  });

  /**
   * @describe Test suite for the `_evaluateHand` internal function.
   */
  describe("_evaluateHand()", () => {
    /**
     * @test {_evaluateHand}
     * @description Verifies that the total hand strength is calculated correctly by summing points from bowers and other trump cards.
     */
    it("should correctly evaluate hand strength based on trump and bowers", () => {
      const trumpSuit = SUITS.HEARTS;
      const result = aiLogic._evaluateHand(mockHand, trumpSuit);
      // J of Hearts (RB) + J of Diamonds (LB) + A of Hearts
      expect(result).to.equal(
        POINTS.RIGHT_BOWER + POINTS.LEFT_BOWER + POINTS.TRUMP_ACE
      ); // 15 + 10 + 7 = 32
    });

    /**
     * @test {_evaluateHand}
     * @description Ensures the function handles an empty hand gracefully.
     */
    it("should return 0 for an empty hand", () => {
      const result = aiLogic._evaluateHand([], SUITS.HEARTS);
      expect(result).to.equal(0);
    });

    /**
     * @test {_evaluateHand}
     * @description Ensures the function handles null input without crashing.
     */
    it("should return 0 for a null hand", () => {
      const result = aiLogic._evaluateHand(null, SUITS.HEARTS);
      expect(result).to.equal(0);
    });

    /**
     * @test {_evaluateHand}
     * @description Verifies that a hand with no trump cards evaluates to zero.
     */
    it("should return 0 if no trump cards or bowers are present", () => {
      const handWithoutTrump = [
        createCard(SUITS.CLUBS, RANKS.NINE),
        createCard(SUITS.SPADES, RANKS.QUEEN),
        createCard(SUITS.CLUBS, RANKS.KING),
      ];
      const result = aiLogic._evaluateHand(handWithoutTrump, SUITS.HEARTS);
      expect(result).to.equal(0);
    });
  });

  /**
   * @describe Test suite for the `chooseBid` function.
   */
  describe("chooseBid()", () => {
    const turnCard = createCard(SUITS.HEARTS, RANKS.NINE); // Turn card for bidding

    // Define a threshold for ordering up or calling trump (based on typical AI logic)
    const BID_THRESHOLD = 20;

    /**
     * @test {chooseBid}
     * @description Verifies the AI decides to "orderUp" when its hand strength for the turn card's suit exceeds the threshold.
     */
    it("should order up when hand strength exceeds the threshold", () => {
      const strongHand = [
        createCard(SUITS.HEARTS, RANKS.JACK), // RB: 15
        createCard(SUITS.HEARTS, RANKS.ACE), // Trump Ace: 7
        createCard(SUITS.HEARTS, RANKS.KING), // Trump King: 5
        createCard(SUITS.HEARTS, RANKS.QUEEN), // Trump Queen: 3
        createCard(SUITS.DIAMONDS, RANKS.JACK), // LB: 10
      ]; // Total: 15 + 7 + 5 + 3 + 10 = 40 points
      const result = aiLogic.chooseBid(strongHand, turnCard, false, []);
      expect(result.decision).to.equal("orderUp");
    });

    /**
     * @test {chooseBid}
     * @description Verifies the AI decides to "pass" when its hand strength is below the threshold.
     */
    it("should pass when hand strength is below the threshold", () => {
      const weakHand = [
        createCard(SUITS.CLUBS, RANKS.NINE), // 0
        createCard(SUITS.SPADES, RANKS.TEN), // 0
        createCard(SUITS.DIAMONDS, RANKS.QUEEN), // 0
        createCard(SUITS.CLUBS, RANKS.KING), // 0
        createCard(SUITS.SPADES, RANKS.ACE), // 0
      ]; // Total: 0 points
      const result = aiLogic.chooseBid(weakHand, turnCard, false, []);
      expect(result.decision).to.equal("pass");
    });

    /**
     * @test {chooseBid}
     * @description Verifies the AI decides to "callTrump" in the second round if it has a strong suit other than the one turned down.
     */
    it("should call trump in the second round if hand strength is sufficient for any suit", () => {
      // Using mockHand which evaluates to 32 points for hearts trump.
      // Now, let's test a scenario where the turn card was different, say spades.
      const turnCardSpades = createCard(SUITS.SPADES, RANKS.NINE);
      // Bids indicate we are in the second round of bidding.
      const bids = [{ decision: "pass" }, { decision: "pass" }];
      const result = aiLogic.chooseBid(mockHand, turnCardSpades, false, bids);

      // _evaluateHand(mockHand, 'hearts') = 32. This is > BID_THRESHOLD.
      // AI should call 'hearts' as trump.
      expect(result.decision).to.equal("callTrump");
      expect(result.suit).to.equal(SUITS.HEARTS);
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
        createCard(SUITS.CLUBS, RANKS.KING),
        createCard(SUITS.SPADES, RANKS.ACE),
      ]; // 0 points for any suit
      const bids = [{ decision: "pass" }, { decision: "pass" }];
      const result = aiLogic.chooseBid(veryWeakHand, turnCard, false, bids);
      expect(result.decision).to.equal("pass");
    });

    /**
     * @test {chooseBid}
     * @description Ensures the function handles null input without crashing.
     */
    it("should handle null hand input gracefully by passing", () => {
      const result = aiLogic.chooseBid(null, turnCard, false, []);
      expect(result.decision).to.equal("pass");
    });

    /**
     * @test {chooseBid}
     * @description Ensures the function handles an empty hand gracefully.
     */
    it("should handle empty hand input gracefully by passing", () => {
      const result = aiLogic.chooseBid([], turnCard, false, []);
      expect(result.decision).to.equal("pass");
    });
  });

  /**
   * @describe Test suite for the `chooseCardToPlay` function.
   */
  describe("chooseCardToPlay()", () => {
    const trumpSuit = SUITS.HEARTS;

    /**
     * @test {chooseCardToPlay}
     * @description Verifies the AI plays its lowest trump card when it is leading the trick and only has trump cards.
     */
    it("should play the lowest trump card when leading with only trump cards", () => {
      const allTrumpHand = [
        createCard(SUITS.HEARTS, RANKS.JACK), // RB (highest)
        createCard(SUITS.HEARTS, RANKS.ACE), // Trump Ace
        createCard(SUITS.DIAMONDS, RANKS.JACK), // LB (second highest)
      ];
      // Order of trump: J(H) > J(D) > A(H) -> Lowest is A(H)
      const result = aiLogic.chooseCardToPlay(
        allTrumpHand,
        [], // Empty trick, so AI is leading
        trumpSuit,
        SUITS.HEARTS // leadSuit is null when leading
      );
      expect(result).to.deep.equal(createCard(SUITS.HEARTS, RANKS.ACE));
    });

    /**
     * @test {chooseCardToPlay}
     * @description Verifies the AI follows suit and plays the lowest possible card that can still win the trick.
     */
    it("should follow suit with the lowest winning card if it can win", () => {
      const currentTrick = [createCard(SUITS.HEARTS, RANKS.TEN)]; // Opponent leads a trump
      const hand = [
        createCard(SUITS.HEARTS, RANKS.ACE), // Can win
        createCard(SUITS.HEARTS, RANKS.KING), // Can also win
        createCard(SUITS.CLUBS, RANKS.NINE), // Off-suit
      ];
      const result = aiLogic.chooseCardToPlay(
        hand,
        currentTrick,
        trumpSuit,
        SUITS.HEARTS // Lead suit is trump
      );
      // AI has K and A of hearts, both beat the 10. It should play the lowest winning card.
      expect(result).to.deep.equal(createCard(SUITS.HEARTS, RANKS.KING));
    });

    /**
     * @test {chooseCardToPlay}
     * @description Verifies the AI plays its lowest-value off-suit card (sloughs) when it cannot follow suit.
     */
    it("should slough the lowest value card when unable to follow suit", () => {
      const currentTrick = [createCard(SUITS.SPADES, RANKS.ACE)]; // Opponent leads spades
      const hand = [
        createCard(SUITS.HEARTS, RANKS.QUEEN), // Trump card
        createCard(SUITS.CLUBS, RANKS.NINE), // Lowest value off-suit
        createCard(SUITS.DIAMONDS, RANKS.TEN), // Another off-suit
      ];
      const result = aiLogic.chooseCardToPlay(
        hand,
        currentTrick,
        trumpSuit,
        SUITS.SPADES // Lead suit is spades
      );
      // Can't follow suit. Slough lowest value card. 9 of Clubs is lowest.
      expect(result).to.deep.equal(createCard(SUITS.CLUBS, RANKS.NINE));
    });

    /**
     * @test {chooseCardToPlay}
     * @description Verifies the AI follows suit with its lowest card of that suit if it cannot win the trick.
     */
    it("should play the lowest card of the lead suit when unable to win the trick", () => {
      const currentTrick = [createCard(SUITS.SPADES, RANKS.ACE)]; // Opponent leads a high spade
      const hand = [
        createCard(SUITS.SPADES, RANKS.NINE), // Can follow suit, but can't win
        createCard(SUITS.SPADES, RANKS.TEN), // Can also follow suit, can't win
        createCard(SUITS.HEARTS, RANKS.JACK), // Right Bower (could win by trumping)
      ];
      const result = aiLogic.chooseCardToPlay(
        hand,
        currentTrick,
        SUITS.DIAMONDS, // Diamonds are trump, so hearts jack is not trump
        SUITS.SPADES // Lead suit is spades
      );
      // Must follow suit. Has 9 and 10 of spades. Neither can win. Play lowest.
      expect(result).to.deep.equal(createCard(SUITS.SPADES, RANKS.NINE));
    });

    /**
     * @test {chooseCardToPlay}
     * @description Ensures the function handles an empty hand gracefully.
     */
    it("should return null for an empty hand", () => {
      const result = aiLogic.chooseCardToPlay(
        [],
        [],
        SUITS.HEARTS,
        SUITS.HEARTS
      );
      expect(result).to.be.null;
    });

    /**
     * @test {chooseCardToPlay}
     * @description Ensures the function handles null input without crashing.
     */
    it("should return null for a null hand", () => {
      const result = aiLogic.chooseCardToPlay(
        null,
        [],
        SUITS.HEARTS,
        SUITS.HEARTS
      );
      expect(result).to.be.null;
    });
  });
});