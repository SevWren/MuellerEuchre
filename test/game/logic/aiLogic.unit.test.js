// TODO: Fully JSDoc
// TODO: Improve decision making logic
// 8-3-25 - Currently 100% Coverage

import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { CARD_SUITS, CARD_VALUES } from "../../../src/config/constants.js";
import { createMockCard } from "../../helpers/test-helpers.js";

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

describe("AI Logic Module", () => {
  let aiLogic;

  beforeEach(async () => {
    mock.reset();
    aiLogic = await import("../../../src/game/logic/aiLogic.js");
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const mockHand = [
    createMockCard(CARD_SUITS.HEARTS, "J"),
    createMockCard(CARD_SUITS.DIAMONDS, "J"),
    createMockCard(CARD_SUITS.HEARTS, "A"),
    createMockCard(CARD_SUITS.CLUBS, "9"),
    createMockCard(CARD_SUITS.SPADES, "Q"),
  ];

  describe("countTrumpInHand()", () => {
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

    it("should return 0 for a null hand input", () => {
      const result = aiLogic.countTrumpInHand(null, CARD_SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });

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

  describe("calculateHandStrength()", () => {
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

    it("should calculate strength correctly for a hand with only a Left Bower", () => {
      const hand = [createMockCard(CARD_SUITS.DIAMONDS, 'J')];
      const result = aiLogic.calculateHandStrength(hand, CARD_SUITS.HEARTS);
      assert.strictEqual(result, POINTS.LEFT_BOWER);
    });

    it("should return 0 for a hand with no trump cards for the given suit", () => {
      const trumpSuit = CARD_SUITS.CLUBS;
      const hand = [
        createMockCard(CARD_SUITS.HEARTS, 'A'),
        createMockCard(CARD_SUITS.DIAMONDS, 'K'),
      ];
      const result = aiLogic.calculateHandStrength(hand, trumpSuit);
      assert.strictEqual(result, 0);
    });

    it("should return 0 for an empty hand", () => {
      const result = aiLogic.calculateHandStrength([], CARD_SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });

    it("should return 0 for a null hand", () => {
      const result = aiLogic.calculateHandStrength(null, CARD_SUITS.HEARTS);
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
      const result = aiLogic.calculateHandStrength(handWithInvalid, trumpSuit);
      const expected = POINTS.RIGHT_BOWER + POINTS.LEFT_BOWER + POINTS.TRUMP_ACE;
      assert.strictEqual(result, expected, "Should calculate strength of valid cards and ignore invalid ones");
    });

    it("should ignore trump cards with unrecognized values (switch default case)", () => {
      const handWithBadValue = [
        createMockCard(CARD_SUITS.HEARTS, "J"),
        { suit: CARD_SUITS.HEARTS, value: "8" },
      ];
      const trumpSuit = CARD_SUITS.HEARTS;
      const result = aiLogic.calculateHandStrength(handWithBadValue, trumpSuit);
      assert.strictEqual(result, POINTS.RIGHT_BOWER, "Should ignore trump card with unrecognized value");
    });

    it("should correctly score a King of trump", () => {
        const hand = [createMockCard(CARD_SUITS.HEARTS, 'K')];
        const result = aiLogic.calculateHandStrength(hand, CARD_SUITS.HEARTS);
        assert.strictEqual(result, POINTS.TRUMP_KING);
    });
  });

  describe("_evaluateHand()", () => {
    it("should correctly evaluate hand strength by calling calculateHandStrength", () => {
      const trumpSuit = CARD_SUITS.HEARTS;
      const result = aiLogic._evaluateHand(mockHand, trumpSuit);
      assert.strictEqual(
        result,
        POINTS.RIGHT_BOWER + POINTS.LEFT_BOWER + POINTS.TRUMP_ACE,
        "Expected score should be 32"
      );
    });

    it("should return 0 for an empty hand", () => {
      const result = aiLogic._evaluateHand([], CARD_SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });

    it("should return 0 for a null hand", () => {
      const result = aiLogic._evaluateHand(null, CARD_SUITS.HEARTS);
      assert.strictEqual(result, 0);
    });

    it("should return 0 for a non-string potential trump suit", () => {
      const result = aiLogic._evaluateHand(mockHand, null);
      assert.strictEqual(result, 0);
      const result2 = aiLogic._evaluateHand(mockHand, 123);
      assert.strictEqual(result2, 0);
    });
  });

  describe("chooseBid()", () => {
    const turnCard = createMockCard(CARD_SUITS.HEARTS, '9');

    it("should order up when hand strength exceeds the threshold", () => {
      const strongHand = [
        createMockCard(CARD_SUITS.HEARTS, 'J'),
        createMockCard(CARD_SUITS.HEARTS, 'A'),
        createMockCard(CARD_SUITS.DIAMONDS, 'J'),
      ];
      const result = aiLogic.chooseBid(strongHand, turnCard, false, []);
      assert.strictEqual(result.decision, "orderUp");
    });

    it("should pass when hand strength is below the threshold", () => {
      const weakHand = [
        createMockCard(CARD_SUITS.CLUBS, '9'),
        createMockCard(CARD_SUITS.SPADES, '10'),
        createMockCard(CARD_SUITS.DIAMONDS, 'Q'),
      ];
      const result = aiLogic.chooseBid(weakHand, turnCard, false, []);
      assert.strictEqual(result.decision, "pass");
    });

    it("should call trump in the second round if hand strength is sufficient for any suit", () => {
      const turnCardSpades = createMockCard(CARD_SUITS.SPADES, '9');
      const bids = [
        { decision: "pass" },
        { decision: "pass" },
        { decision: "pass" },
        { decision: "pass" },
      ];
      const result = aiLogic.chooseBid(mockHand, turnCardSpades, false, bids);
      assert.strictEqual(result.decision, "callTrump");
      assert.strictEqual(result.suit, CARD_SUITS.HEARTS);
    });

    it("should pass in the second round if hand strength is insufficient for any suit", () => {
      const veryWeakHand = [
        createMockCard(CARD_SUITS.CLUBS, '9'),
        createMockCard(CARD_SUITS.SPADES, '10'),
        createMockCard(CARD_SUITS.DIAMONDS, 'Q'),
      ];
      const bids = [
        { decision: "pass" },
        { decision: "pass" },
        { decision: "pass" },
        { decision: "pass" },
      ];
      const result = aiLogic.chooseBid(veryWeakHand, turnCard, false, bids);
      assert.strictEqual(result.decision, "pass");
    });

    it("should return 'pass' for an empty hand or null turn card", () => {
        const resultEmptyHand = aiLogic.chooseBid([], createMockCard(CARD_SUITS.HEARTS, '9'), false, []);
        assert.deepStrictEqual(resultEmptyHand, { decision: "pass" });

        const resultNullCard = aiLogic.chooseBid(mockHand, null, false, []);
        assert.deepStrictEqual(resultNullCard, { decision: "pass" });
    });

    it("should choose the first suit evaluated in round 2 if scores are tied", () => {
      const turnCardDiamonds = createMockCard(CARD_SUITS.DIAMONDS, '9');
      const hand = [
        createMockCard(CARD_SUITS.HEARTS, 'J'),
        createMockCard(CARD_SUITS.HEARTS, 'A'),
        createMockCard(CARD_SUITS.CLUBS, 'J'),
        createMockCard(CARD_SUITS.CLUBS, 'A'),
      ];
      const bids = [
        { decision: "pass" },
        { decision: "pass" },
        { decision: "pass" },
        { decision: "pass" },
      ];
      const result = aiLogic.chooseBid(hand, turnCardDiamonds, false, bids);
      assert.strictEqual(result.decision, "callTrump");
      assert.strictEqual(result.suit, CARD_SUITS.HEARTS);
    });
  });

  describe("getCardValue()", () => {
    it("should return 0 for invalid card objects", () => {
        assert.strictEqual(aiLogic.getCardValue(null, CARD_SUITS.HEARTS), AI_CARD_VALUES.INVALID);
        assert.strictEqual(aiLogic.getCardValue({}, CARD_SUITS.HEARTS), AI_CARD_VALUES.INVALID);
        assert.strictEqual(aiLogic.getCardValue({ suit: CARD_SUITS.HEARTS }, CARD_SUITS.HEARTS), AI_CARD_VALUES.INVALID);
    });

    it("should return 0 for cards with unrecognized values", () => {
        const card = { suit: CARD_SUITS.SPADES, value: "8" };
        assert.strictEqual(aiLogic.getCardValue(card, CARD_SUITS.HEARTS), AI_CARD_VALUES.INVALID);
    });

    it("should return correct value for Left Bower", () => {
        const leftBower = createMockCard(CARD_SUITS.DIAMONDS, 'J');
        const result = aiLogic.getCardValue(leftBower, CARD_SUITS.HEARTS);
        assert.strictEqual(result, AI_CARD_VALUES.TRUMP_LEFT_BOWER);
    });

    it("should return correct value for a trump Queen", () => {
        const card = createMockCard(CARD_SUITS.HEARTS, 'Q');
        const result = aiLogic.getCardValue(card, CARD_SUITS.HEARTS);
        assert.strictEqual(result, AI_CARD_VALUES.TRUMP_QUEEN);
    });

    it("should return correct value for a non-trump Queen", () => {
        const card = createMockCard(CARD_SUITS.SPADES, 'Q');
        const result = aiLogic.getCardValue(card, CARD_SUITS.HEARTS);
        assert.strictEqual(result, AI_CARD_VALUES.OFFSUIT_QUEEN);
    });

    it("should return correct value for a non-bower, non-trump Jack", () => {
        const card = createMockCard(CARD_SUITS.SPADES, 'J');
        const result = aiLogic.getCardValue(card, CARD_SUITS.HEARTS);
        assert.strictEqual(result, AI_CARD_VALUES.OFFSUIT_JACK);
    });
  });

  describe("getWinningCard()", () => {
    it("should return null for an empty trick", () => {
        const result = aiLogic.getWinningCard([], CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.strictEqual(result, null);
    });

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

  describe("getLowestCard()", () => {
    it("should return null for an empty or invalid array", () => {
        assert.strictEqual(aiLogic.getLowestCard([], CARD_SUITS.HEARTS), null);
        assert.strictEqual(aiLogic.getLowestCard(null, CARD_SUITS.HEARTS), null);
    });

    it("should return null if hand contains only invalid cards", () => {
        const hand = [{}, null, { suit: 'hearts' }];
        assert.strictEqual(aiLogic.getLowestCard(hand, CARD_SUITS.HEARTS), null);
    });
  });

  describe("chooseCardToPlay()", () => {
    const trumpSuit = CARD_SUITS.HEARTS;

    it("should follow suit with the lowest winning card if it can win", () => {
      const currentTrick = [createMockCard(CARD_SUITS.HEARTS, '10')];
      const hand = [
        createMockCard(CARD_SUITS.HEARTS, 'A'),
        createMockCard(CARD_SUITS.HEARTS, 'K'),
        createMockCard(CARD_SUITS.CLUBS, '9'),
      ];
      const result = aiLogic.chooseCardToPlay(
        hand,
        currentTrick,
        trumpSuit,
        CARD_SUITS.HEARTS
      );
      assert.deepStrictEqual(result, createMockCard(CARD_SUITS.HEARTS, 'K'));
    });

    it("should slough the lowest value card when unable to follow suit", () => {
      const currentTrick = [createMockCard(CARD_SUITS.SPADES, 'A')];
      const hand = [
        createMockCard(CARD_SUITS.HEARTS, 'Q'),
        createMockCard(CARD_SUITS.CLUBS, '9'),
        createMockCard(CARD_SUITS.DIAMONDS, '10'),
      ];
      const result = aiLogic.chooseCardToPlay(
        hand,
        currentTrick,
        trumpSuit,
        CARD_SUITS.SPADES
      );
      assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, '9'));
    });

    it("should play the lowest card of the lead suit when unable to win the trick", () => {
      const currentTrick = [createMockCard(CARD_SUITS.SPADES, 'A')];
      const hand = [
        createMockCard(CARD_SUITS.SPADES, '9'),
        createMockCard(CARD_SUITS.SPADES, '10'),
        createMockCard(CARD_SUITS.HEARTS, 'J'),
      ];
      const result = aiLogic.chooseCardToPlay(
        hand,
        currentTrick,
        CARD_SUITS.HEARTS,
        CARD_SUITS.SPADES
      );
      assert.deepStrictEqual(result, createMockCard(CARD_SUITS.SPADES, '9'));
    });

    it("should return null for an empty hand", () => {
      const result = aiLogic.chooseCardToPlay(
        [],
        [],
        CARD_SUITS.HEARTS,
        CARD_SUITS.HEARTS
      );
      assert.strictEqual(result, null);
    });

    it("should handle leadSuit being null or undefined", () => {
        const hand = [createMockCard(CARD_SUITS.SPADES, 'A')];
        const result = aiLogic.chooseCardToPlay(hand, [], CARD_SUITS.HEARTS, null);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.SPADES, 'A'));
    });

    it("should play lowest trump when void in lead suit and only holding trump", () => {
        const currentTrick = [createMockCard(CARD_SUITS.CLUBS, 'A')];
        const hand = [
            createMockCard(CARD_SUITS.HEARTS, 'J'),
            createMockCard(CARD_SUITS.HEARTS, '9'),
        ];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.HEARTS, '9'));
    });

    it("should lead with lowest trump when hand is all trump cards", () => {
        const hand = [
            createMockCard(CARD_SUITS.HEARTS, 'A'),
            createMockCard(CARD_SUITS.HEARTS, 'K')
        ];
        const result = aiLogic.chooseCardToPlay(hand, [], CARD_SUITS.HEARTS, null);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.HEARTS, 'K'));
    });

    it("should ignore invalid cards when determining which card to play", () => {
        const currentTrick = [createMockCard(CARD_SUITS.CLUBS, 'A')];
        const hand = [
            createMockCard(CARD_SUITS.CLUBS, '9'),
            null,
            {}
        ];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, '9'));
    });
  });

  describe("Coverage-focused Edge Cases", () => {
    it("getCardValue should return INVALID for trump with unrecognized value", () => {
        const card = { suit: CARD_SUITS.HEARTS, value: "8" };
        assert.strictEqual(aiLogic.getCardValue(card, CARD_SUITS.HEARTS), AI_CARD_VALUES.INVALID);
    });

    it("getWinningCard should keep winning card if next card is lower value of same suit", () => {
        const trick = [
            createMockCard(CARD_SUITS.CLUBS, 'A'),
            createMockCard(CARD_SUITS.CLUBS, '9'),
        ];
        const result = aiLogic.getWinningCard(trick, CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, 'A'));
    });

    it("getWinningCard should handle a trick starting with an invalid card", () => {
        const trick = [
            null,
            createMockCard(CARD_SUITS.CLUBS, 'A'),
        ];
        const result = aiLogic.getWinningCard(trick, CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, 'A'));
    });

    it("chooseCardToPlay should handle a trick with only invalid cards", () => {
        const currentTrick = [null, {}];
        const hand = [
            createMockCard(CARD_SUITS.CLUBS, 'A'),
            createMockCard(CARD_SUITS.CLUBS, '9'),
        ];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, '9'));
    });

    it("getCardValue should handle cards with missing properties", () => {
        assert.strictEqual(aiLogic.getCardValue({ suit: CARD_SUITS.HEARTS }, CARD_SUITS.HEARTS), 0);
        assert.strictEqual(aiLogic.getCardValue({ value: 'A' }, CARD_SUITS.HEARTS), 0);
    });

    it("chooseCardToPlay should handle non-array hand", () => {
        const result = aiLogic.chooseCardToPlay(null, [], CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.strictEqual(result, null);
    });

    it("chooseCardToPlay should handle null leadSuit when not leading", () => {
        const hand = [createMockCard(CARD_SUITS.SPADES, 'A')];
        const currentTrick = [createMockCard(CARD_SUITS.CLUBS, '9')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, CARD_SUITS.HEARTS, null);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.SPADES, 'A'));
    });

    it("chooseCardToPlay should ignore malformed cards in hand when leading", () => {
        const hand = [null, createMockCard(CARD_SUITS.SPADES, 'A'), {}];
        const result = aiLogic.chooseCardToPlay(hand, [], CARD_SUITS.HEARTS, null);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.SPADES, 'A'));
    });

    it("chooseCardToPlay should ignore malformed cards when determining cards in suit", () => {
        const hand = [null, createMockCard(CARD_SUITS.CLUBS, 'A'), {}];
        const currentTrick = [createMockCard(CARD_SUITS.CLUBS, '9')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, 'A'));
    });

    it("chooseCardToPlay should ignore malformed cards when finding playable winning cards", () => {
        const hand = [null, createMockCard(CARD_SUITS.CLUBS, 'A'), {}];
        const currentTrick = [createMockCard(CARD_SUITS.CLUBS, '9')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, CARD_SUITS.HEARTS, CARD_SUITS.CLUBS);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, 'A'));
    });

    it("chooseCardToPlay should not consider a lower trump as a winning card", () => {
        const trumpSuit = CARD_SUITS.HEARTS;
        const currentTrick = [createMockCard(trumpSuit, 'K')];
        const hand = [createMockCard(trumpSuit, '9')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, trumpSuit, trumpSuit);
        assert.deepStrictEqual(result, createMockCard(trumpSuit, '9'));
    });

    it("chooseCardToPlay should correctly identify trumping as a winning play when following suit", () => {
        const trumpSuit = CARD_SUITS.SPADES;
        const leadSuit = CARD_SUITS.SPADES;
        const currentTrick = [createMockCard(leadSuit, '9')];
        const hand = [createMockCard(trumpSuit, 'A')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, trumpSuit, leadSuit);
        assert.deepStrictEqual(result, createMockCard(trumpSuit, 'A'));
    });

    it("chooseCardToPlay should correctly play higher off-suit to win", () => {
        const trumpSuit = CARD_SUITS.HEARTS;
        const leadSuit = CARD_SUITS.SPADES;
        const currentTrick = [createMockCard(leadSuit, '10')];
        const hand = [createMockCard(leadSuit, 'A')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, trumpSuit, leadSuit);
        assert.deepStrictEqual(result, createMockCard(leadSuit, 'A'));
    });

    it("chooseCardToPlay should ignore malformed cards when sloughing", () => {
        const currentTrick = [createMockCard(CARD_SUITS.SPADES, 'A')];
        const hand = [null, createMockCard(CARD_SUITS.CLUBS, '9'), {}];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, CARD_SUITS.HEARTS, CARD_SUITS.SPADES);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.CLUBS, '9'));
    });

    it("getLowestCard should handle non-array input", () => {
        assert.strictEqual(aiLogic.getLowestCard(null, CARD_SUITS.HEARTS), null);
    });

    it("getLowestCard should handle single-card array", () => {
        const card = createMockCard(CARD_SUITS.HEARTS, 'A');
        assert.deepStrictEqual(aiLogic.getLowestCard([card], CARD_SUITS.HEARTS), card);
    });

    it("getLowestCard should return first card if values are equal", () => {
        const card1 = createMockCard(CARD_SUITS.CLUBS, '9');
        const card2 = createMockCard(CARD_SUITS.SPADES, '9');
        const result = aiLogic.getLowestCard([card1, card2], CARD_SUITS.HEARTS);
        assert.deepStrictEqual(result, card1);
    });

    it("should lead with highest non-trump when it is the first card in the hand", () => {
        const hand = [
            createMockCard(CARD_SUITS.SPADES, 'A'),
            createMockCard(CARD_SUITS.CLUBS, 'K'),
            createMockCard(CARD_SUITS.HEARTS, '9'),
        ];
        const result = aiLogic.chooseCardToPlay(hand, [], CARD_SUITS.HEARTS, null);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.SPADES, 'A'));
    });

    it("should lead with highest non-trump when it is not the first card in the hand", () => {
        const hand = [
            createMockCard(CARD_SUITS.CLUBS, 'K'),
            createMockCard(CARD_SUITS.SPADES, 'A'),
            createMockCard(CARD_SUITS.HEARTS, '9'),
        ];
        const result = aiLogic.chooseCardToPlay(hand, [], CARD_SUITS.HEARTS, null);
        assert.deepStrictEqual(result, createMockCard(CARD_SUITS.SPADES, 'A'));
    });

    it("chooseCardToPlay should win with trump when void in lead suit", () => {
        const trumpSuit = CARD_SUITS.HEARTS;
        const leadSuit = CARD_SUITS.SPADES;
        const currentTrick = [createMockCard(leadSuit, 'A')];
        const hand = [createMockCard(trumpSuit, '9')];
        const result = aiLogic.chooseCardToPlay(hand, currentTrick, trumpSuit, leadSuit);
        assert.deepStrictEqual(result, createMockCard(trumpSuit, '9'));
    });

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
});