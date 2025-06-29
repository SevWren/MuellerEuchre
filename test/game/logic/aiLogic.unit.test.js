// filepath: test/game/logic/aiLogic.unit.test.js
import { describe, it } from "mocha";
import { expect } from "chai";
import esmock from "esmock";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("AI Logic Module", () => {
  let aiLogic;
  const mockHand = [
    { suit: "hearts", rank: "J" }, // Right bower if hearts is trump
    { suit: "diamonds", rank: "J" }, // Left bower if hearts is trump
    { suit: "hearts", rank: "A" },
    { suit: "clubs", rank: "9" },
    { suit: "spades", rank: "Q" },
  ];

  before(async () => {
    aiLogic = await esmock(
      path.join(__dirname, "../../src/game/logic/aiLogic.js"),
      {},
      {}
    );
  });

  after(() => {
    esmock.purge(aiLogic);
  });

  describe("countTrumpInHand()", () => {
    it("should count trump cards correctly", () => {
      const result = aiLogic.countTrumpInHand(mockHand, "hearts");
      expect(result).to.equal(3); // J hearts, J diamonds, A hearts
    });

    it("should return 0 for empty hand", () => {
      const result = aiLogic.countTrumpInHand([], "hearts");
      expect(result).to.equal(0);
    });

    it("should handle invalid inputs", () => {
      const result = aiLogic.countTrumpInHand(null, "hearts");
      expect(result).to.equal(0);
    });
  });

  describe("findBowers()", () => {
    it("should identify right and left bowers", () => {
      const result = aiLogic.findBowers(mockHand, "hearts");
      expect(result).to.deep.equal({
        rightBower: true,
        leftBower: true,
      });
    });

    it("should return false for no bowers", () => {
      const result = aiLogic.findBowers(mockHand, "clubs");
      expect(result).to.deep.equal({
        rightBower: false,
        leftBower: false,
      });
    });

    it("should handle empty hand", () => {
      const result = aiLogic.findBowers([], "hearts");
      expect(result).to.deep.equal({
        rightBower: false,
        leftBower: false,
      });
    });
  });

  describe("calculatePointsForSuit()", () => {
    it("should calculate points for trump suit", () => {
      const result = aiLogic.calculatePointsForSuit(mockHand, "hearts");
      // A hearts = 80 points
      expect(result).to.equal(80);
    });

    it("should return 0 for non-trump suit with no cards", () => {
      const result = aiLogic.calculatePointsForSuit(mockHand, "clubs");
      // Only 9 clubs = 30 points (but not trump)
      expect(result).to.equal(0);
    });

    it("should handle empty hand", () => {
      const result = aiLogic.calculatePointsForSuit([], "hearts");
      expect(result).to.equal(0);
    });
  });

  describe("_evaluateHand()", () => {
    it("should evaluate hand strength correctly", () => {
      const result = aiLogic._evaluateHand(mockHand, "hearts");
      // Right bower (100) + left bower (90) + A hearts (80) = 270
      expect(result).to.equal(270);
    });

    it("should return 0 for empty hand", () => {
      const result = aiLogic._evaluateHand([], "hearts");
      expect(result).to.equal(0);
    });
  });

  describe("chooseBid()", () => {
    const turnCard = { suit: "hearts", rank: "9" };

    it("should order up with strong hand", () => {
      const strongHand = [
        { suit: "hearts", rank: "J" },
        { suit: "hearts", rank: "A" },
        { suit: "hearts", rank: "K" },
        { suit: "hearts", rank: "Q" },
        { suit: "diamonds", rank: "J" },
      ];
      const result = aiLogic.chooseBid(strongHand, turnCard, false, []);
      expect(result.decision).to.equal("orderUp");
    });

    it("should pass with weak hand", () => {
      const weakHand = [
        { suit: "clubs", rank: "9" },
        { suit: "spades", rank: "10" },
        { suit: "diamonds", rank: "Q" },
        { suit: "clubs", rank: "K" },
        { suit: "spades", rank: "A" },
      ];
      const result = aiLogic.chooseBid(weakHand, turnCard, false, []);
      expect(result.decision).to.equal("pass");
    });

    it("should call trump in second round if strong enough", () => {
      const result = aiLogic.chooseBid(mockHand, turnCard, false, [
        { decision: "pass" },
        { decision: "pass" },
      ]);
      expect(result.decision).to.equal("callTrump");
      expect(result.suit).to.be.oneOf(["diamonds", "clubs", "spades"]);
    });

    it("should handle invalid inputs", () => {
      const result = aiLogic.chooseBid(null, turnCard, false, []);
      expect(result.decision).to.equal("pass");
    });
  });

  describe("chooseCardToPlay()", () => {
    const trumpSuit = "hearts";
    const leadSuit = "hearts";

    it("should play lowest trump when leading with all trump", () => {
      const allTrumpHand = [
        { suit: "hearts", rank: "J" },
        { suit: "hearts", rank: "A" },
        { suit: "diamonds", rank: "J" },
      ];
      const result = aiLogic.chooseCardToPlay(
        allTrumpHand,
        [],
        trumpSuit,
        leadSuit
      );
      expect(result.rank).to.equal("A"); // A is lowest trump in this case
    });

    it("should follow suit when able", () => {
      const currentTrick = [{ suit: "hearts", rank: "10" }];
      const result = aiLogic.chooseCardToPlay(
        mockHand,
        currentTrick,
        trumpSuit,
        leadSuit
      );
      expect(result.suit).to.equal("hearts");
    });

    it("should slough lowest card when cannot follow suit", () => {
      const currentTrick = [{ suit: "clubs", rank: "10" }];
      const result = aiLogic.chooseCardToPlay(
        mockHand,
        currentTrick,
        trumpSuit,
        "clubs"
      );
      expect(result.rank).to.equal("9"); // Lowest non-trump card
    });

    it("should return null for empty hand", () => {
      const result = aiLogic.chooseCardToPlay([], [], trumpSuit, leadSuit);
      expect(result).to.be.null;
    });
  });
});
