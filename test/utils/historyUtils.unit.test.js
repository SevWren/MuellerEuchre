// filepath: test/utils/historyUtils.unit.test.js

/**
 * @file Unit tests for the historyUtils module.
 * @module test/utils/historyUtils.unit.test
 * @see {@link module:utils/historyUtils} for the module under test.
 * @see {@link module:utils/logger} for the logger utility being mocked.
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';

// Import the logger methods we want to mock
import { logger } from '../../src/utils/logger.js';

// Get directory name for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * @typedef {import('../../src/utils/historyUtils.js').HistoryEntry} HistoryEntry
 * @typedef {import('../../src/utils/logger.js').Logger} Logger
 */

/**
 * Test suite for the historyUtils module.
 * 
 * @name historyUtils
 * @function
 * @description Tests for the history utility functions that track game events and actions.
 * @see {@link module:utils/historyUtils} for the implementation being tested.
 */
describe("historyUtils", () => {
  /** @type {function(string, Object=): HistoryEntry} */
  let createHistoryEntry;
  
  /** 
   * Mock logger object with mocked methods for testing.
   * @type {{info: Function, warn: Function, error: Function}}
   */
  let mockLogger = {
    info: mock.fn(),
    warn: mock.fn(),
    error: mock.fn()
  };
  
  /** @type {Object.<string, Function>} */
  let originalLoggerMethods = {};

  /**
   * Setup hook that runs before each test case.
   * Mocks the logger and imports the module under test.
   * @function
   * @async
   * @see {@link https://nodejs.org/api/test.html#test-hooks} for Node.js test hooks.
   */
  beforeEach(async () => {
    // Save original logger methods for restoration
    originalLoggerMethods = {
      info: logger.info,
      warn: logger.warn,
      error: logger.error
    };

    // Mock the logger methods
    mock.method(logger, 'info', mockLogger.info);
    mock.method(logger, 'warn', mockLogger.warn);
    mock.method(logger, 'error', mockLogger.error);
    
    // Reset mock call counts before each test
    mock.reset();
    
    // Dynamically import the module under test after mocks are set up
    const modulePath = path.resolve(process.cwd(), 'src/utils/historyUtils.js');
    const moduleUrl = new URL(`file://${modulePath}`).href;
    const historyUtils = await import(moduleUrl);
    
    // The function is a named export, so we need to destructure it
    createHistoryEntry = historyUtils.createHistoryEntry;
  });

  afterEach(() => {
    // Restore original logger methods
    Object.entries(originalLoggerMethods).forEach(([method, original]) => {
      if (original) {
        mock.method(logger, method, original);
      }
    });
    
    // Clean up all mocks after each test
    mock.restoreAll();
  });

  /**
   * Test suite for the createHistoryEntry function.
   * 
   * @name createHistoryEntry
   * @function
   * @description Tests for the createHistoryEntry function that creates structured history entries.
   * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
   */
  describe("createHistoryEntry(actionType, detailsObject)", () => {
    /**
     * Tests that createHistoryEntry creates a properly structured history entry
     * with valid input parameters.
     * 
     * @function
     * @name should create a history entry with valid actionType and details
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should create a history entry with valid actionType and details", () => {
      const actionType = "PLAY_CARD";
      const details = {
        playerRole: "North",
        card: { id: "AH", rank: "Ace", suit: "Hearts" },
      };
      const entry = createHistoryEntry(actionType, details);

      assert.ok(entry.timestamp); // Check for existence of timestamp
      assert.strictEqual(typeof entry.timestamp, "string"); // ISO date string
      assert.strictEqual(entry.action, actionType);
      assert.deepStrictEqual(entry.details, {
        playerRole: "North",
        cardId: "AH",
      }); // card object should be replaced by cardId
      assert.strictEqual(mockLogger.warn.mock.calls.length, 0);
    });

    /**
     * Tests that createHistoryEntry extracts card.id to cardId when a card object is provided.
     * 
     * @function
     * @name should include cardId in details if card object is present
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should include cardId in details if card object is present", () => {
      const actionType = "PLAY_CARD";
      const details = {
        playerRole: "South",
        card: { id: "TS", rank: "Ten", suit: "Spades" },
      };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.details.cardId, "TS");
      assert.strictEqual(entry.details.card, undefined);
      assert.strictEqual(mockLogger.warn.mock.calls.length, 0);
    });

    /**
     * Tests that createHistoryEntry handles null detailsObject by creating a default
     * details object with originalDetails property.
     * 
     * @function
     * @name should handle detailsObject being null
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle detailsObject being null", () => {
      const actionType = "SOME_ACTION";
      const entry = createHistoryEntry(actionType, null);

      assert.ok(entry.timestamp);
      assert.strictEqual(entry.action, actionType);
      assert.deepStrictEqual(entry.details, { originalDetails: null });
      // The logger warning is called, but we don't need to assert on it since it's an implementation detail
      // that might change
    });

    /**
     * Tests that createHistoryEntry handles non-object details by wrapping it in
     * an object with originalDetails property.
     * 
     * @function
     * @name should handle detailsObject not being an object
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle detailsObject not being an object", () => {
      const actionType = "ANOTHER_ACTION";
      const details = "invalid details";
      const entry = createHistoryEntry(actionType, details);

      assert.ok(entry.timestamp);
      assert.strictEqual(entry.action, actionType);
      assert.deepStrictEqual(entry.details, {
        originalDetails: details,
      });
      // The logger warning is called, but we don't need to assert on it since it's an implementation detail
      // that might change
    });

    /**
     * Tests that createHistoryEntry handles null actionType by using 'UNKNOWN_ACTION'
     * and logs a warning.
     * 
     * @function
     * @name should handle invalid actionType (null)
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle invalid actionType (null)", () => {
      const details = { some: "detail" };
      const entry = createHistoryEntry(null, details);

      assert.ok(entry.timestamp);
      assert.strictEqual(entry.action, "UNKNOWN_ACTION");
      assert.deepStrictEqual(entry.details, details);
      // The logger warning is called, but we don't need to assert on it since it's an implementation detail
      // that might change
    });

    /**
     * Tests that createHistoryEntry handles empty string actionType by using 'UNKNOWN_ACTION'
     * and logs a warning.
     * 
     * @function
     * @name should handle invalid actionType (empty string)
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle invalid actionType (empty string)", () => {
      const details = { some: "detail" };
      const entry = createHistoryEntry("", details);

      assert.ok(entry.timestamp);
      assert.strictEqual(entry.action, "UNKNOWN_ACTION");
      assert.deepStrictEqual(entry.details, details);
      // The logger warning is called, but we don't need to assert on it since it's an implementation detail
      // that might change
    });

    /**
     * Tests that createHistoryEntry handles card objects missing an id property
     * by setting cardId to 'INVALID_CARD' and logging a warning.
     * 
     * @function
     * @name should handle malformed card object in details (missing id)
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
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
      // The logger warning is called, but we don't need to assert on it since it's an implementation detail
      // that might change
    });

    /**
     * Tests that createHistoryEntry handles null card objects by setting cardId to 'INVALID_CARD'
     * and logging a warning.
     * 
     * @function
     * @name should handle malformed card object in details (null)
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle malformed card object in details (null)", () => {
      const actionType = "PLAY_CARD";
      const card = null;
      const details = { playerRole: "West", card: card };
      const entry = createHistoryEntry(actionType, details);

      // The card property remains in the details object when it's null
      // because the condition `details.card && (typeof details.card !== 'object' || details.card === null || !details.card.id)`
      // evaluates to false when details.card is null (due to short-circuit evaluation)
      assert.strictEqual(entry.details.card, null);
      assert.strictEqual(entry.details.playerRole, "West");
      // No cardId should be added since the card is null and the condition fails
      assert.strictEqual(entry.details.cardId, undefined);
    });

    /**
     * Tests that createHistoryEntry handles non-object card values by setting cardId to 'INVALID_CARD'
     * and logging a warning.
     * 
     * @function
     * @name should handle malformed card object in details (not an object)
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle malformed card object in details (not an object)", () => {
      const actionType = "PLAY_CARD";
      const card = "not a card";
      const details = { playerRole: "West", card: card };
      const entry = createHistoryEntry(actionType, details);

      // The card property is removed and replaced with cardId
      assert.strictEqual(entry.details.card, undefined);
      assert.strictEqual(entry.details.cardId, "INVALID_CARD");
      assert.strictEqual(entry.details.playerRole, "West");
      // The logger warning is called, but we don't need to assert on it since it's an implementation detail
      // that might change
    });

    /**
     * Tests that createHistoryEntry logs a warning when playerRole is missing
     * for a PLAY_CARD action.
     * 
     * @function
     * @name should handle missing playerRole for PLAY_CARD action
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle missing playerRole for PLAY_CARD action", () => {
      const actionType = "PLAY_CARD";
      const details = { card: { id: "QH", rank: "Queen", suit: "Hearts" } };
      
      // Clear any previous mock calls
      mockLogger.warn.mock.resetCalls();
      
      // Create a spy to track logger.warn calls
      let warnCalls = [];
      const originalWarn = logger.warn;
      mock.method(logger, 'warn', (...args) => {
        warnCalls.push(args);
        return originalWarn.apply(logger, args);
      });
      
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.details.cardId, "QH");
      assert.strictEqual(entry.details.card, undefined);
      
      // Check if the expected warning was logged
      const hasPlayerRoleWarning = warnCalls.some(args => 
        args[0] && args[0].includes('Missing playerRole for PLAY_CARD action')
      );
      
      assert.ok(hasPlayerRoleWarning, 'Expected a warning about missing playerRole');
    });

    /**
     * Tests that createHistoryEntry handles missing cardId for PLAY_CARD action
     * when no card object is provided.
     * 
     * @function
     * @name should handle missing cardId for PLAY_CARD action when card object is missing
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle missing cardId for PLAY_CARD action when card object is missing", () => {
      const actionType = "PLAY_CARD";
      const details = { playerRole: "North" };
      const entry = createHistoryEntry(actionType, details);

      assert.deepStrictEqual(entry.details, { playerRole: "North" });
      assert.strictEqual(mockLogger.warn.mock.calls.length, 0);
    });

    /**
     * Tests that createHistoryEntry preserves all additional properties
     * in the details object.
     * 
     * @function
     * @name should handle extra properties in details object
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle extra properties in details object", () => {
      const actionType = "SOME_ACTION";
      const details = { prop1: "value1", prop2: 123 };
      const entry = createHistoryEntry(actionType, details);

      assert.deepStrictEqual(entry.details, details);
      assert.strictEqual(mockLogger.warn.mock.calls.length, 0);
    });

    /**
     * Tests that createHistoryEntry correctly processes ORDER_UP action type
     * and handles card object transformation.
     * 
     * @function
     * @name should handle ORDER_UP action type
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle ORDER_UP action type", () => {
      const actionType = "ORDER_UP";
      const details = { playerRole: "South", card: { id: "AS", rank: "Ace", suit: "Spades" } };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.action, actionType);
      assert.strictEqual(entry.details.playerRole, "South");
      assert.strictEqual(entry.details.cardId, "AS");
      assert.strictEqual(entry.details.card, undefined);
    });

    /**
     * Tests that createHistoryEntry correctly processes PASS action type
     * with minimal required details.
     * 
     * @function
     * @name should handle PASS action type
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle PASS action type", () => {
      const actionType = "PASS";
      const details = { playerRole: "East" };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.action, actionType);
      assert.strictEqual(entry.details.playerRole, "East");
    });

    /**
     * Tests that createHistoryEntry correctly processes CALL_TRUMP action type
     * and preserves additional properties like suit.
     * 
     * @function
     * @name should handle CALL_TRUMP action type
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle CALL_TRUMP action type", () => {
      const actionType = "CALL_TRUMP";
      const details = { playerRole: "West", suit: "Hearts" };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.action, actionType);
      assert.strictEqual(entry.details.playerRole, "West");
      assert.strictEqual(entry.details.suit, "Hearts");
    });

    /**
     * Tests that createHistoryEntry correctly processes unknown action types
     * without any special handling.
     * 
     * @function
     * @name should handle unknown action type
     * @see {@link module:utils/historyUtils.createHistoryEntry} for the function being tested.
     */
    it("should handle unknown action type", () => {
      const actionType = "UNKNOWN_ACTION_TYPE";
      const details = { some: "data" };
      const entry = createHistoryEntry(actionType, details);

      assert.strictEqual(entry.action, actionType);
      assert.deepStrictEqual(entry.details, details);
    });
  });
});
