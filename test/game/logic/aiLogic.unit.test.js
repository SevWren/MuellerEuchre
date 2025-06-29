// filepath: test/game/logic/aiLogic.unit.test.js
import { describe, it } from "mocha";
import { expect } from "chai";
import { chooseBid, chooseCardToPlay } from "../../src/game/logic/aiLogic.js";

describe("AI Logic Unit Tests", () => {
  describe("chooseBid()", () => {
    it("should return pass decision for empty hand", () => {
      const result = chooseBid([], { suit: "hearts" }, false, []);
      expect(result).to.deep.equal({ decision: "pass" });
    });

    it("should return pass decision for invalid hand input", () => {
      const result = chooseBid(null, { suit: "hearts" }, false, []);
      expect(result).to.deep.equal({ decision: "pass" });
    });

    it("should return orderUp for strong hand with turn card suit", () => {
      const hand = [
        { suit: "hearts", rank: "J" }, // Right bower = 100
        { suit: "hearts", rank: "A" }, // 80
        { suit: "hearts", rank: "K" }, // 70
      ]; // Total = 250 > threshold (180)
      const result = chooseBid(hand, { suit: "hearts" }, false, []);
      expect(result).to.deep.equal({ decision: "orderUp" });
    });

    it("should return callTrump for strong hand with other suit in round 2", () => {
      const hand = [
        { suit: "spades", rank: "J" }, // Left bower if trump is clubs = 90
        { suit: "spades", rank: "A" }, // 80
        { suit: "spades", rank: "K" }, // 70
      ]; // Total = 240 > threshold (180)
      const bids = [{ decision: "pass" }, { decision: "pass" }];
      const result = chooseBid(hand, { suit: "hearts" }, false, bids);
      expect(result).to.deep.equal({ decision: "callTrump", suit: "spades" });
    });

    it("should return pass for weak hand", () => {
      const hand = [
        { suit: "hearts", rank: "9" }, // 30
        { suit: "hearts", rank: "10" }, // 40
        { suit: "diamonds", rank: "9" }, // 0 (not trump)
      ]; // Total = 70 < threshold (180)
      const result = chooseBid(hand, { suit: "hearts" }, false, []);
      expect(result).to.deep.equal({ decision: "pass" });
    });
  });

  describe("chooseCardToPlay()", () => {
    const testHand = [
      { suit: "hearts", rank: "J" }, // Right bower (trump)
      { suit: "diamonds", rank: "J" }, // Left bower if trump is hearts
      { suit: "hearts", rank: "A" },
      { suit: "clubs", rank: "K" },
      { suit: "spades", rank: "10" },
    ];
    const trumpSuit = "hearts";

    it("should return null for empty hand", () => {
      const result = chooseCardToPlay([], [], trumpSuit, "hearts");
      expect(result).to.be.null;
    });

    it("should return null for invalid hand input", () => {
      const result = chooseCardToPlay(null, [], trumpSuit, "hearts");
      expect(result).to.be.null;
    });

    it("should lead with lowest non-trump card when leading", () => {
      const result = chooseCardToPlay(testHand, [], trumpSuit, "");
      expect(result).to.deep.equal({ suit: "clubs", rank: "K" }); // Lowest non-trump
    });

    it("should lead with lowest trump card when only holding trump", () => {
      const trumpOnlyHand = [
        { suit: "hearts", rank: "J" },
        { suit: "diamonds", rank: "J" },
        { suit: "hearts", rank: "A" },
      ];
      const result = chooseCardToPlay(trumpOnlyHand, [], trumpSuit, "");
      expect(result).to.deep.equal({ suit: "hearts", rank: "A" }); // Lowest trump
    });

    it("should follow suit with lowest card when unable to win", () => {
      const currentTrick = [
        { suit: "clubs", rank: "A" }, // High card in suit
      ];
      const result = chooseCardToPlay(
        testHand,
        currentTrick,
        trumpSuit,
        "clubs"
      );
      expect(result).to.deep.equal({ suit: "clubs", rank: "K" }); // Only clubs card
    });

    it("should follow suit with winning card if possible", () => {
      const currentTrick = [
        { suit: "clubs", rank: "10" }, // Low card in suit
      ];
      const result = chooseCardToPlay(
        testHand,
        currentTrick,
        trumpSuit,
        "clubs"
      );
      expect(result).to.deep.equal({ suit: "clubs", rank: "K" }); // Beats 10
    });

    it("should slough lowest card when cannot follow suit", () => {
      const currentTrick = [
        { suit: "diamonds", rank: "A" }, // Lead suit is diamonds
      ];
      const result = chooseCardToPlay(
        testHand,
        currentTrick,
        trumpSuit,
        "diamonds"
      );
      // Should slough lowest non-trump (spades 10 is lower than clubs K)
      expect(result).to.deep.equal({ suit: "spades", rank: "10" });
    });

    it("should treat left bower as trump when following suit", () => {
      const currentTrick = [
        { suit: "hearts", rank: "A" }, // Lead suit is trump (hearts)
      ];
      const result = chooseCardToPlay(
        testHand,
        currentTrick,
        trumpSuit,
        "hearts"
      );
      // Should play left bower (diamonds J) since it counts as trump
      expect(result).to.deep.equal({ suit: "diamonds", rank: "J" });
    });
  });
});
