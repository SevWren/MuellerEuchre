// filepath: test/utils/historyUtils.unit.test.js

/**
 * @file Unit tests for the historyUtils module.
 * @module test/utils/historyUtils.unit.test
 * @see {@link module:utils/historyUtils} for the module under test.
 * @see {@link module:utils/logger} for the logger utility being mocked.
 */

import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import path from "node:path";

// Statically import the dependency to be mocked.
import * as logger from "../../src/utils/logger.js";

/**
 * @typedef {import('../../src/utils/historyUtils.js').HistoryEntry} HistoryEntry
 */

describe("historyUtils", () => {
  let createHistoryEntry;
  let warnMock;

  beforeEach(async () => {
    // 1. Set up the mock on the imported logger module before each test.
    warnMock = mock.method(logger.logger, "warn", () => {});

    // 2. Dynamically import the module under test AFTER the mock is applied.
    // This ensures the module gets the mocked version of the dependency.
    // A cache-busting query is added to ensure a fresh module for each test.
    const modulePath = path.resolve(process.cwd(), "src/utils/historyUtils.js");
    const moduleUrl = `${pathToFileURL(modulePath).href}?v=${Date.now()}`;
    const historyUtils = await import(moduleUrl);
    createHistoryEntry = historyUtils.createHistoryEntry;
  });

  afterEach(() => {
    // 3. Restore all mocks to their original state after each test.
    // This is crucial for preventing mock state from leaking between test files.
    mock.restoreAll();
  });

  describe("createHistoryEntry(actionType, detailsObject)", () => {
    it("should create a history entry with valid actionType and details", () => {
      const actionType = "PLAY_CARD";
      const details = {
        playerRole: "North",
        card: { id: "AH", rank: "Ace", suit: "Hearts" },
      };
      const entry = createHistoryEntry(actionType, details);

      assert.ok(entry.timestamp);
      assert.strictEqual(typeof entry.timestamp, "string");
      assert.strictEqual(entry.action, actionType);
      assert.deepStrictEqual(entry.details, {
        playerRole: "North",
        cardId: "AH",
      });
      assert.strictEqual(warnMock.mock.calls.length, 0);
    });

    it("should include cardId in details if card object is present", () => {
      const actionType = "PLAY_CARD";
      const details = {
        playerRole: "South",
        card: { id: "TS", rank: "Ten", suit: "Spades" },
      };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.details.cardId, "TS");
      assert.strictEqual(entry.details.card, undefined);
      assert.strictEqual(warnMock.mock.calls.length, 0);
    });

    it("should handle detailsObject being null", () => {
      const actionType = "SOME_ACTION";
      const entry = createHistoryEntry(actionType, null);

      assert.ok(entry.timestamp);
      assert.strictEqual(entry.action, actionType);
      assert.deepStrictEqual(entry.details, { originalDetails: null });
      assert.strictEqual(warnMock.mock.calls.length, 1);
    });

    it("should handle detailsObject not being an object", () => {
      const actionType = "ANOTHER_ACTION";
      const details = "invalid details";
      const entry = createHistoryEntry(actionType, details);

      assert.ok(entry.timestamp);
      assert.strictEqual(entry.action, actionType);
      assert.deepStrictEqual(entry.details, {
        originalDetails: details,
      });
      assert.strictEqual(warnMock.mock.calls.length, 1);
    });

    it("should handle invalid actionType (null)", () => {
      const details = { some: "detail" };
      const entry = createHistoryEntry(null, details);

      assert.ok(entry.timestamp);
      assert.strictEqual(entry.action, "UNKNOWN_ACTION");
      assert.deepStrictEqual(entry.details, details);
      assert.strictEqual(warnMock.mock.calls.length, 1);
    });

    it("should handle invalid actionType (empty string)", () => {
      const details = { some: "detail" };
      const entry = createHistoryEntry("", details);

      assert.ok(entry.timestamp);
      assert.strictEqual(entry.action, "UNKNOWN_ACTION");
      assert.deepStrictEqual(entry.details, details);
      assert.strictEqual(warnMock.mock.calls.length, 1);
    });

    it("should handle malformed card object in details (missing id)", () => {
      const actionType = "PLAY_CARD";
      const card = { rank: "King", suit: "Clubs" };
      const details = {
        playerRole: "East",
        card: card,
      };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.details.card, undefined);
      assert.strictEqual(entry.details.cardId, "INVALID_CARD");
      assert.strictEqual(entry.details.playerRole, "East");
      assert.strictEqual(warnMock.mock.calls.length, 1);
    });

    it("should handle malformed card object in details (null)", () => {
      const actionType = "PLAY_CARD";
      const card = null;
      const details = { playerRole: "West", card: card };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.details.cardId, "INVALID_CARD");
      assert.strictEqual(entry.details.playerRole, "West");
      assert.strictEqual(warnMock.mock.calls.length, 1);
    });

    it("should handle malformed card object in details (not an object)", () => {
      const actionType = "PLAY_CARD";
      const card = "not a card";
      const details = { playerRole: "West", card: card };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.details.card, undefined);
      assert.strictEqual(entry.details.cardId, "INVALID_CARD");
      assert.strictEqual(entry.details.playerRole, "West");
      assert.strictEqual(warnMock.mock.calls.length, 1);
    });

    it("should handle missing playerRole for PLAY_CARD action", () => {
      const actionType = "PLAY_CARD";
      const details = { card: { id: "QH", rank: "Queen", suit: "Hearts" } };

      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.details.cardId, "QH");
      assert.strictEqual(entry.details.card, undefined);

      // Check that the warning was logged
      assert.strictEqual(warnMock.mock.calls.length, 1);
      const call = warnMock.mock.calls[0];
      assert.match(
        call.arguments[0],
        /Missing playerRole for PLAY_CARD action/
      );
    });

    it("should handle missing cardId for PLAY_CARD action when card object is missing", () => {
      const actionType = "PLAY_CARD";
      const details = { playerRole: "North" };
      const entry = createHistoryEntry(actionType, details);

      assert.deepStrictEqual(entry.details, { playerRole: "North" });
      assert.strictEqual(warnMock.mock.calls.length, 1);
      const call = warnMock.mock.calls[0];
      assert.match(call.arguments[0], /Missing cardId for PLAY_CARD action/);
    });

    it("should handle extra properties in details object", () => {
      const actionType = "SOME_ACTION";
      const details = { prop1: "value1", prop2: 123 };
      const entry = createHistoryEntry(actionType, details);

      assert.deepStrictEqual(entry.details, details);
      assert.strictEqual(warnMock.mock.calls.length, 0);
    });

    it("should handle ORDER_UP action type", () => {
      const actionType = "ORDER_UP";
      const details = {
        playerRole: "South",
        card: { id: "AS", rank: "Ace", suit: "Spades" },
      };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.action, actionType);
      assert.strictEqual(entry.details.playerRole, "South");
      assert.strictEqual(entry.details.cardId, "AS");
      assert.strictEqual(entry.details.card, undefined);
    });

    it("should handle PASS action type", () => {
      const actionType = "PASS";
      const details = { playerRole: "East" };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.action, actionType);
      assert.strictEqual(entry.details.playerRole, "East");
    });

    it("should handle CALL_TRUMP action type", () => {
      const actionType = "CALL_TRUMP";
      const details = { playerRole: "West", suit: "Hearts" };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.action, actionType);
      assert.strictEqual(entry.details.playerRole, "West");
      assert.strictEqual(entry.details.suit, "Hearts");
    });

    it("should handle unknown action type", () => {
      const actionType = "UNKNOWN_ACTION_TYPE";
      const details = { some: "data" };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.action, actionType);
      assert.deepStrictEqual(entry.details, details);
    });
  });
});
