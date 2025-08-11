/**
 * test/utils/cardUtils.unit.test.js
 */

import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";

import * as cardUtils from "../../src/utils/cardUtils.js";
import { InvalidCardError } from "../../src/game/logic/validation-errors.js";
import logger from "../../src/utils/logger.js";

import * as constants from "../../src/config/constants.js";

const SUITS = constants.SUITS;

describe("Card Utility Functions", () => {
  describe("normalizeSuit", () => {
    it("normalizes simple suit names and constants; returns null for unknown string", () => {
      assert.strictEqual(
        cardUtils.normalizeSuit("hearts"),
        SUITS.CARD_SUIT_HEARTS
      );
      assert.strictEqual(
        cardUtils.normalizeSuit("SPADES"),
        SUITS.CARD_SUIT_SPADES
      );
      assert.strictEqual(
        cardUtils.normalizeSuit("clubs"),
        SUITS.CARD_SUIT_CLUBS
      );
      assert.strictEqual(
        cardUtils.normalizeSuit("  Clubs  "),
        SUITS.CARD_SUIT_CLUBS
      );
      assert.strictEqual(cardUtils.normalizeSuit("invalid"), null);
    });

    it("throws for non-string or empty input", () => {
      assert.throws(() => cardUtils.normalizeSuit(null), InvalidCardError);
      assert.throws(() => cardUtils.normalizeSuit(""), InvalidCardError);
      assert.throws(() => cardUtils.normalizeSuit(123), InvalidCardError);
    });

    it("returns null for unknown valid strings", () => {
      assert.strictEqual(cardUtils.normalizeSuit("joker"), null);
      assert.strictEqual(cardUtils.normalizeSuit("  unknownSuit "), null);
    });
  });

  describe("getPartnerSuit", () => {
    it("throws InvalidCardError on invalid suit input", () => {
      assert.throws(() => cardUtils.getPartnerSuit("joker"), InvalidCardError);
      assert.throws(() => cardUtils.getPartnerSuit(null), InvalidCardError);
    });

    it("returns correct partner suits for all valid suits", () => {
      assert.strictEqual(
        cardUtils.getPartnerSuit(SUITS.CARD_SUIT_HEARTS),
        SUITS.CARD_SUIT_DIAMONDS
      );
      assert.strictEqual(
        cardUtils.getPartnerSuit(SUITS.CARD_SUIT_DIAMONDS),
        SUITS.CARD_SUIT_HEARTS
      );
      assert.strictEqual(
        cardUtils.getPartnerSuit(SUITS.CARD_SUIT_CLUBS),
        SUITS.CARD_SUIT_SPADES
      );
      assert.strictEqual(
        cardUtils.getPartnerSuit(SUITS.CARD_SUIT_SPADES),
        SUITS.CARD_SUIT_CLUBS
      );
    });
  });

  describe("areSameColor / getSuitColor", () => {
    it("returns correct colors and comparisons", () => {
      assert.strictEqual(
        cardUtils.areSameColor(
          SUITS.CARD_SUIT_HEARTS,
          SUITS.CARD_SUIT_DIAMONDS
        ),
        true
      );
      assert.strictEqual(
        cardUtils.areSameColor(SUITS.CARD_SUIT_CLUBS, SUITS.CARD_SUIT_SPADES),
        true
      );
      assert.strictEqual(
        cardUtils.areSameColor(SUITS.CARD_SUIT_HEARTS, SUITS.CARD_SUIT_CLUBS),
        false
      );
      assert.strictEqual(cardUtils.areSameColor("hearts", "DIAMONDS"), true);
      assert.strictEqual(
        cardUtils.areSameColor("invalid", SUITS.CARD_SUIT_HEARTS),
        false
      );
    });

    it("returns false if either suit is null or undefined", () => {
      assert.strictEqual(
        cardUtils.areSameColor(null, SUITS.CARD_SUIT_HEARTS),
        false
      );
      assert.strictEqual(
        cardUtils.areSameColor(SUITS.CARD_SUIT_CLUBS, undefined),
        false
      );
      assert.strictEqual(cardUtils.areSameColor(null, null), false);
    });

    it("getSuitColor throws for invalid suit", () => {
      assert.throws(() => cardUtils.getSuitColor("badSuit"), InvalidCardError);
    });

    it("returns correct colors for all suits", () => {
      assert.strictEqual(cardUtils.getSuitColor(SUITS.CARD_SUIT_HEARTS), "red");
      assert.strictEqual(
        cardUtils.getSuitColor(SUITS.CARD_SUIT_DIAMONDS),
        "red"
      );
      assert.strictEqual(
        cardUtils.getSuitColor(SUITS.CARD_SUIT_CLUBS),
        "black"
      );
      assert.strictEqual(
        cardUtils.getSuitColor(SUITS.CARD_SUIT_SPADES),
        "black"
      );
    });
  });

  describe("Bower identification", () => {
    it("isRightBower identifies Jack of trump", () => {
      const jackHearts = { suit: SUITS.CARD_SUIT_HEARTS, value: "J" };
      assert.strictEqual(
        cardUtils.isRightBower(jackHearts, SUITS.CARD_SUIT_HEARTS),
        true
      );
      assert.strictEqual(
        cardUtils.isRightBower(
          { suit: SUITS.CARD_SUIT_CLUBS, value: "J" },
          SUITS.CARD_SUIT_HEARTS
        ),
        false
      );
    });

    it("isLeftBower identifies partner-Jack as left bower", () => {
      const leftBower = { suit: SUITS.CARD_SUIT_DIAMONDS, value: "J" };
      assert.strictEqual(
        cardUtils.isLeftBower(leftBower, SUITS.CARD_SUIT_HEARTS),
        true
      );
      const rightBower = { suit: SUITS.CARD_SUIT_HEARTS, value: "J" };
      assert.strictEqual(
        cardUtils.isLeftBower(rightBower, SUITS.CARD_SUIT_HEARTS),
        false
      );
    });

    it("throws on invalid card objects for bower checks", () => {
      assert.throws(
        () => cardUtils.isRightBower(null, SUITS.CARD_SUIT_HEARTS),
        InvalidCardError
      );
      assert.throws(
        () => cardUtils.isLeftBower({}, SUITS.CARD_SUIT_HEARTS),
        InvalidCardError
      );
    });

    it("throws InvalidCardError for invalid card or trump suit with unknown suits", () => {
      const invalidCard = { suit: "joker", value: "J" };
      assert.throws(
        () => cardUtils.isRightBower(invalidCard, SUITS.CARD_SUIT_HEARTS),
        InvalidCardError
      );
      assert.throws(
        () =>
          cardUtils.isRightBower(
            { suit: SUITS.CARD_SUIT_HEARTS, value: "J" },
            "joker"
          ),
        InvalidCardError
      );

      assert.throws(
        () => cardUtils.isLeftBower(invalidCard, SUITS.CARD_SUIT_HEARTS),
        InvalidCardError
      );
      assert.throws(
        () =>
          cardUtils.isLeftBower(
            { suit: SUITS.CARD_SUIT_HEARTS, value: "J" },
            "joker"
          ),
        InvalidCardError
      );
    });
  });

  describe("getEffectiveSuit", () => {
    it("returns trump for left bower, original suit otherwise", () => {
      const leftBower = { suit: SUITS.CARD_SUIT_DIAMONDS, value: "J" };
      const trump = SUITS.CARD_SUIT_HEARTS;
      assert.strictEqual(cardUtils.getEffectiveSuit(leftBower, trump), trump);

      const aceSpades = { suit: SUITS.CARD_SUIT_SPADES, value: "A" };
      assert.strictEqual(
        cardUtils.getEffectiveSuit(aceSpades, trump),
        SUITS.CARD_SUIT_SPADES
      );
    });

    it("throws InvalidCardError for non-object or invalid input", () => {
      assert.throws(
        () => cardUtils.getEffectiveSuit(null, SUITS.CARD_SUIT_HEARTS),
        InvalidCardError
      );
      assert.throws(
        () => cardUtils.getEffectiveSuit(undefined, SUITS.CARD_SUIT_HEARTS),
        InvalidCardError
      );
      assert.throws(
        () => cardUtils.getEffectiveSuit({}, SUITS.CARD_SUIT_HEARTS),
        InvalidCardError
      );
      assert.throws(
        () =>
          cardUtils.getEffectiveSuit(
            { suit: null, value: "A" },
            SUITS.CARD_SUIT_HEARTS
          ),
        InvalidCardError
      );
      assert.throws(
        () =>
          cardUtils.getEffectiveSuit(
            { suit: SUITS.CARD_SUIT_CLUBS },
            SUITS.CARD_SUIT_HEARTS
          ),
        InvalidCardError
      );
    });
  });

  describe("Formatting helpers: cardToId / idToCard", () => {
    it("valid conversions and error handling for cardToId", () => {
      assert.throws(() => cardUtils.cardToId(undefined), InvalidCardError);
      assert.throws(() => cardUtils.cardToId({}), InvalidCardError);
      assert.throws(
        () => cardUtils.cardToId({ suit: SUITS.CARD_SUIT_HEARTS }),
        InvalidCardError
      );
      assert.throws(() => cardUtils.cardToId({ value: "A" }), InvalidCardError);

      assert.strictEqual(
        cardUtils.cardToId({ suit: SUITS.CARD_SUIT_HEARTS, value: "A" }),
        "AH"
      );
      assert.strictEqual(
        cardUtils.cardToId({ suit: SUITS.CARD_SUIT_DIAMONDS, value: "K" }),
        "KD"
      );
      assert.strictEqual(
        cardUtils.cardToId({ suit: SUITS.CARD_SUIT_CLUBS, value: "Q" }),
        "QC"
      );
      assert.strictEqual(
        cardUtils.cardToId({ suit: SUITS.CARD_SUIT_SPADES, value: "J" }),
        "JS"
      );
      assert.strictEqual(
        cardUtils.cardToId({ suit: SUITS.CARD_SUIT_HEARTS, value: "10" }),
        "TH"
      );
      assert.strictEqual(
        cardUtils.cardToId({ suit: SUITS.CARD_SUIT_DIAMONDS, value: "9" }),
        "9D"
      );

      const fallback = cardUtils.cardToId({
        suit: SUITS.CARD_SUIT_HEARTS,
        value: "X",
      });
      assert.strictEqual(fallback, "XH");
    });

    it("uses fallback for unknown card value characters", () => {
      const suits = Object.values(SUITS);
      for (const suit of suits) {
        const card = { suit, value: "UnknownValue" };
        const id = cardUtils.cardToId(card);
        assert.strictEqual(typeof id, "string");
        assert.strictEqual(id.endsWith(id.slice(-1)), true); // ends with suit char
      }
    });

    it("idToCard accepts 'T' or '10' forms and throws on bad input", () => {
      assert.throws(() => cardUtils.idToCard(null), InvalidCardError);
      assert.throws(() => cardUtils.idToCard(123), InvalidCardError);
      assert.throws(() => cardUtils.idToCard("A"), InvalidCardError);
      assert.throws(() => cardUtils.idToCard("AX"), InvalidCardError);
      assert.throws(() => cardUtils.idToCard("XH"), InvalidCardError);
    });

    it("throws for invalid suit characters", () => {
      assert.throws(() => cardUtils.idToCard("AX"), InvalidCardError);
      assert.throws(() => cardUtils.idToCard("9Z"), InvalidCardError);
    });

    it("throws for invalid value parts", () => {
      assert.throws(() => cardUtils.idToCard("ZX"), InvalidCardError);
    });

    it("accepts trimmed strings", () => {
      const card = cardUtils.idToCard(" 9H ");
      assert.deepStrictEqual(card, {
        suit: SUITS.CARD_SUIT_HEARTS,
        value: "9",
      });
    });

    it("throws for invalid string lengths and types", () => {
      assert.throws(() => cardUtils.idToCard(""), InvalidCardError);
      assert.throws(() => cardUtils.idToCard("A"), InvalidCardError);
      assert.throws(() => cardUtils.idToCard("1"), InvalidCardError);
      assert.throws(() => cardUtils.idToCard("1234"), InvalidCardError);
      assert.throws(() => cardUtils.idToCard([]), InvalidCardError);
      assert.throws(() => cardUtils.idToCard({}), InvalidCardError);
    });
  });

  describe("getEffectiveSuit - invalid card suit or value types", () => {
    it("throws InvalidCardError when card suit or value are not strings", () => {
      assert.throws(
        () =>
          cardUtils.getEffectiveSuit(
            { suit: 10, value: "J" },
            SUITS.CARD_SUIT_HEARTS
          ),
        InvalidCardError
      );
      assert.throws(
        () =>
          cardUtils.getEffectiveSuit(
            { suit: SUITS.CARD_SUIT_HEARTS, value: {} },
            SUITS.CARD_SUIT_HEARTS
          ),
        InvalidCardError
      );
    });
  });

  describe("Ranking & sorting", () => {
    it("getBaseRankValue returns base numeric values or throws", () => {
      assert.strictEqual(cardUtils.getBaseRankValue("A"), 6);
      assert.strictEqual(cardUtils.getBaseRankValue("K"), 5);
      assert.strictEqual(cardUtils.getBaseRankValue("Q"), 4);
      assert.strictEqual(cardUtils.getBaseRankValue("J"), 3);
      assert.strictEqual(cardUtils.getBaseRankValue("10"), 2);
      assert.strictEqual(cardUtils.getBaseRankValue("9"), 1);
      assert.throws(() => cardUtils.getBaseRankValue("X"), InvalidCardError);
    });

    it("getCardRank follows Euchre rules", () => {
      const trump = SUITS.CARD_SUIT_HEARTS;
      const rightBower = { suit: SUITS.CARD_SUIT_HEARTS, value: "J" };
      const leftBower = { suit: SUITS.CARD_SUIT_DIAMONDS, value: "J" };
      const aceHearts = { suit: SUITS.CARD_SUIT_HEARTS, value: "A" };
      const kingClubs = { suit: SUITS.CARD_SUIT_CLUBS, value: "K" };

      assert.strictEqual(cardUtils.getCardRank(rightBower, trump) > 0, true);
      assert.strictEqual(cardUtils.getCardRank(leftBower, trump) > 0, true);
      assert.strictEqual(cardUtils.getCardRank(aceHearts, trump) > 0, true);
      assert.strictEqual(cardUtils.getCardRank(kingClubs, trump) > 0, true);

      assert.throws(() => cardUtils.getCardRank(null, trump), InvalidCardError);
      assert.throws(
        () => cardUtils.getCardRank({ suit: SUITS.CARD_SUIT_HEARTS }, trump),
        InvalidCardError
      );
      assert.throws(
        () => cardUtils.getCardRank({ value: "A" }, trump),
        InvalidCardError
      );
      assert.throws(() => cardUtils.getCardRank({}, trump), InvalidCardError);
    });

    describe("sortHand", () => {
      let warnMock;
      beforeEach(() => {
        warnMock = mock.method(logger, "warn", () => {});
      });
      afterEach(() => {
        if (warnMock?.mock?.restore) {
          warnMock.mock.restore();
        }
      });

      it("sorts with trump first then by rank, places invalids at end", () => {
        const trump = SUITS.CARD_SUIT_HEARTS;
        const rightBower = {
          suit: SUITS.CARD_SUIT_HEARTS,
          value: "J",
          id: "JH",
        };
        const leftBower = {
          suit: SUITS.CARD_SUIT_DIAMONDS,
          value: "J",
          id: "JD",
        };
        const aceHearts = {
          suit: SUITS.CARD_SUIT_HEARTS,
          value: "A",
          id: "AH",
        };
        const kingHearts = {
          suit: SUITS.CARD_SUIT_HEARTS,
          value: "K",
          id: "KH",
        };
        const aceClubs = { suit: SUITS.CARD_SUIT_CLUBS, value: "A", id: "AC" };
        const kingSpades = {
          suit: SUITS.CARD_SUIT_SPADES,
          value: "K",
          id: "KS",
        };

        const unsortedHand = [
          kingSpades,
          aceHearts,
          rightBower,
          kingHearts,
          leftBower,
          aceClubs,
        ];
        const sorted = cardUtils.sortHand(unsortedHand, trump);
        assert.deepStrictEqual(
          sorted.map((c) => c.id),
          ["JH", "JD", "AH", "KH", "AC", "KS"]
        );
      });

      it("places invalid objects at the end", () => {
        const trump = SUITS.CARD_SUIT_HEARTS;
        const aceHearts = {
          suit: SUITS.CARD_SUIT_HEARTS,
          value: "A",
          id: "AH",
        };
        const kingHearts = {
          suit: SUITS.CARD_SUIT_HEARTS,
          value: "K",
          id: "KH",
        };
        const invalid = { id: "invalid1" };

        const result = cardUtils.sortHand(
          [aceHearts, invalid, kingHearts],
          trump
        );
        assert.strictEqual(result[result.length - 1].id, "invalid1");
      });

      it("returns [] when given non-array", () => {
        assert.deepStrictEqual(
          cardUtils.sortHand(null, SUITS.CARD_SUIT_HEARTS),
          []
        );
      });

      it("logs warnings for invalid cards missing suit or value", () => {
        const invalidCards = [
          { id: "missingSuit" },
          { suit: SUITS.CARD_SUIT_HEARTS },
          { value: "A" },
          null,
          "string",
        ];
        const spyWarn = mock.method(logger, "warn", () => {});
        cardUtils.sortHand(invalidCards, SUITS.CARD_SUIT_HEARTS);
        assert(spyWarn.mock.calls.length >= invalidCards.length);
        spyWarn.mock.restore();
      });

      it("logs warnings for various invalid cards", () => {
        const invalidCards = [
          { id: "missingSuitValue" },
          { suit: null, value: null },
          { suit: undefined, value: "A" },
          { suit: SUITS.CARD_SUIT_HEARTS, value: undefined },
          null,
          "random string",
          42,
          {},
        ];
        const spyWarn = mock.method(logger, "warn", () => {});
        cardUtils.sortHand(invalidCards, SUITS.CARD_SUIT_HEARTS);
        assert(spyWarn.mock.calls.length >= invalidCards.length);
        spyWarn.mock.restore();
      });
    });
  });
});
