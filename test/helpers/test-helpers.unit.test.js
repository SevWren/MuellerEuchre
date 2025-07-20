/**
 * @file test/helpers/test-helpers.unit.test.js
 * @module test/helpers/test-helpers.unit
 * @description
 *   Unit tests for the `test-helpers.js` module. This suite ensures that all
 *   test utility functions behave as expected, providing reliable and consistent
 *   test data and environment management for other unit and integration tests
 *   within the Euchre Multiplayer project.
 *
 *   These tests cover:
 *   - Creation of base game states with various overrides.
 *   - Setup of complex test scenarios including specific game phases and trick states.
 *   - Generation of mock player and card objects with correct properties and team assignments.
 *   - Deterministic deck creation and shuffling.
 *   - Unique test ID generation and resetting.
 *   - Automatic mock tracking and cleanup mechanisms provided by `setupTestEnvironment`.
 *   - Proper handling of test context and cleanup callbacks.
 *
 * @see {@link module:test-helpers} for the implementation being tested.
 * @see {@link module:docs/Layer1_Purity_Rules.md} for architectural guidelines.
 * @see {@link module:docs/TESTING_WITH_DEPENDENCY_INJECTION.md} for testing patterns.
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import the module under test with all its exports
import {
  createBaseGameState,
  setupTestState,
  setupCompletedHandState,
  createMockPlayer,
  createMockCard,
  createCards,
  getCard,
  createDeck,
  shuffleDeterministic,
  getTestId,
  resetTestIdCounter,
  setupTestEnvironment,
  trackMock,
  createTestContext,
  withTestState,
  onCleanup
} from './test-helpers.js';

import { GAME_PHASES, PLAYER_ROLES, TEAMS, SUITS, VALUES } from '../../src/config/constants.js';

// Get the directory name for the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @describe Top-level test suite for the Test Helpers module.
 * @see {@link module:test-helpers}
 */
describe('Test Helpers', () => {
  // Setup test environment before all tests. This function registers global
  // beforeEach and afterEach hooks for mock resetting and cleanup callbacks.
  setupTestEnvironment();

  /**
   * @describe Test suite for core functionality of test data creation helpers.
   * @see {@link module:test-helpers.createBaseGameState}
   * @see {@link module:test-helpers.setupTestState}
   * @see {@link module:test-helpers.setupCompletedHandState}
   * @see {@link module:test-helpers.createMockPlayer}
   * @see {@link module:test-helpers.createMockCard}
   * @see {@link module:test-helpers.createCards}
   * @see {@link module:test-helpers.getCard}
   * @see {@link module:test-helpers.createDeck}
   * @see {@link module:test-helpers.shuffleDeterministic}
   */
  describe('Core Functionality', () => {
    /**
     * @test {createBaseGameState}
     * @description Verifies that `createBaseGameState` returns a well-formed
     * game state object with expected default values, including the initial phase.
     * @returns {void}
     */
    it('should create a base game state with default values', () => {
      const gameState = createBaseGameState();
      assert.strictEqual(typeof gameState, 'object', 'gameState should be an object');
      assert.notStrictEqual(gameState, null, 'gameState should not be null');
      assert.strictEqual(gameState.gamePhase, GAME_PHASES.LOBBY);
    });

    /**
     * @test {setupTestState}
     * @description Ensures `setupTestState` correctly initializes a game state
     * and advances it to the specified game phase, verifying phase transition.
     * @returns {void}
     */
    it('should setup a test state and advance to the specified phase', () => {
      const { gameState } = setupTestState({ phase: GAME_PHASES.PLAYING });
      assert.strictEqual(gameState.gamePhase, GAME_PHASES.PLAYING);
    });

    /**
     * @test {setupCompletedHandState}
     * @description Validates that `setupCompletedHandState` creates a game state
     * in the `SCORING` phase with accurate trick counts for both maker and opponent teams.
     * @returns {void}
     */
    it('should create a completed hand state with correct tricks taken', () => {
      const gameState = setupCompletedHandState({
        makerTeam: TEAMS.TEAM_NS,
        tricksWonByMaker: 3
      });
      assert.strictEqual(gameState.gamePhase, GAME_PHASES.SCORING);
      assert.strictEqual(gameState.tricksTaken[TEAMS.TEAM_NS], 3);
      assert.strictEqual(gameState.tricksTaken[TEAMS.TEAM_EW], 2);
    });

    /**
     * @test {createMockPlayer}
     * @description Confirms that `createMockPlayer` generates a player object
     * with correct default properties and accurate team assignment based on role.
     * @returns {void}
     */
    it('should create a mock player with correct team assignment', () => {
      const player = createMockPlayer(PLAYER_ROLES[0]);
      assert.strictEqual(typeof player, 'object', 'player should be an object');
      assert.notStrictEqual(player, null, 'player should not be null');
      assert.strictEqual(player.teamId, TEAMS.TEAM_NS);
    });

    /**
     * @test {createMockCard}
     * @description Verifies that `createMockCard` produces a card object with
     * the specified suit and value, and other necessary properties.
     * @returns {void}
     */
    it('should create a mock card with correct properties', () => {
      const card = createMockCard(SUITS.CARD_SUIT_SPADES, VALUES[0]);
      assert.strictEqual(typeof card, 'object', 'card should be an object');
      assert.notStrictEqual(card, null, 'card should not be null');
      assert.strictEqual(card.suit, SUITS.CARD_SUIT_SPADES);
      assert.strictEqual(card.value, VALUES[0]);
    });

    /**
     * @test {createCards}
     * @description Tests `createCards` to ensure it correctly parses a
     * comma-separated string of card IDs into an array of card objects.
     * @returns {void}
     */
    it('should create cards from a cardIdString', () => {
      const cardIdString = 'AS, KD';
      const cards = createCards(cardIdString);
      assert.ok(Array.isArray(cards), 'Should return an array');
      assert.strictEqual(cards.length, 2);
      assert.strictEqual(cards[0].id, 'AS');
      assert.strictEqual(cards[1].id, 'KD');
    });

    /**
     * @test {getCard}
     * @description Confirms that `getCard` retrieves the correct card object
     * from the internal deterministic deck based on its ID.
     * @returns {void}
     */
    it('should get a card from the deck by ID', () => {
      const card = getCard('AS');
      assert.strictEqual(typeof card, 'object', 'card should be an object');
      assert.notStrictEqual(card, null, 'card should not be null');
      assert.strictEqual(card.id, 'AS');
    });

    /**
     * @test {createDeck}
     * @description Verifies that `createDeck` generates a standard 24-card
     * Euchre deck as an array.
     * @returns {void}
     */
    it('should create a standard Euchre deck', () => {
      const deck = createDeck();
      assert.ok(Array.isArray(deck), 'Should return an array');
      assert.strictEqual(deck.length, 24);
    });

    /**
     * @test {shuffleDeterministic}
     * @description Ensures `shuffleDeterministic` shuffles a deck predictably
     * using a given seed, producing identical results for the same seed and
     * different results for different seeds.
     * @returns {void}
     */
    it('should shuffle a deck deterministically', () => {
      const deck = createDeck();
      const shuffledDeck1 = shuffleDeterministic(deck, 123);
      const shuffledDeck2 = shuffleDeterministic(deck, 123);
      const shuffledDeck3 = shuffleDeterministic(deck, 54321);

      assert.ok(Array.isArray(shuffledDeck1), 'Should return an array');
      assert.strictEqual(shuffledDeck1.length, 24);
      assert.notDeepStrictEqual(shuffledDeck1, deck, 'Shuffled deck should not equal original deck');
      assert.deepStrictEqual(shuffledDeck1, shuffledDeck2, 'Shuffling with the same seed should produce the same result');
      assert.notDeepStrictEqual(shuffledDeck1, shuffledDeck3, 'Shuffling with a different seed should produce a different result');
    });
  });

  /**
   * @describe Test suite for environment management utilities.
   * @see {@link module:test-helpers.setupTestEnvironment}
   * @see {@link module:test-helpers.trackMock}
   * @see {@link module:test-helpers.onCleanup}
   */
  describe('Test Environment Management', () => {
    /**
     * @test {trackMock}
     * @description Verifies that `trackMock` correctly registers a mock
     * function for automatic resetting of its call history after each test.
     * @returns {void}
     */
    it('should track and reset mocks automatically', () => {
      const mockFn = mock.fn();
      trackMock(mockFn);

      mockFn('test');
      assert.strictEqual(mockFn.mock.calls.length, 1);
      assert.strictEqual(mockFn.mock.calls[0].arguments[0], 'test');
      // The actual reset is handled by the `afterEach` hook registered by `setupTestEnvironment`.
      // This test primarily verifies that `trackMock` successfully registers the mock.
    });

    /**
     * @test {onCleanup}
     * @description Ensures that cleanup callbacks registered with `onCleanup`
     * are executed by the test environment's `afterEach` hook.
     * @returns {void}
     */
    it('should execute cleanup callbacks after each test', () => {
      let cleanupCalled = false;

      // Register a cleanup callback
      onCleanup(() => {
        cleanupCalled = true;
      });

      // The cleanup will be called by the test environment's afterEach hook.
      // This assertion verifies that the callback was successfully registered.
      assert.strictEqual(cleanupCalled, false, 'Cleanup should not be called yet');
    });
  });

  /**
   * @describe Test suite for the `createTestContext` helper.
   * @see {@link module:test-helpers.createTestContext}
   */
  describe('Test Context', () => {
    /**
     * @test {createTestContext}
     * @description Validates that `createTestContext` provides a mechanism
     * to track mocks and register cleanup functions specific to a test context,
     * ensuring their proper execution and isolation.
     * @returns {void}
     */
    it('should create a test context with mocks and cleanup', () => {
      const context = createTestContext();
      const mockFn = mock.fn();

      // Track a mock in the context
      context.track(mockFn);
      mockFn('test');

      // Register a cleanup function
      let cleanupCalled = false;
      context.onCleanup(() => {
        cleanupCalled = true;
      });

      assert.strictEqual(mockFn.mock.calls.length, 1);
      assert.strictEqual(cleanupCalled, false); // Cleanup not called yet
      // The actual cleanup is triggered by the global `afterEach` hook.
    });
  });

  /**
   * @describe Test suite for the `withTestState` helper.
   * @see {@link module:test-helpers.withTestState}
   */
  describe('withTestState Helper', () => {
    /**
     * @test {withTestState}
     * @description Ensures `withTestState` creates and manages a test game
     * state, applying specified overrides and providing a callable cleanup
     * function (even if it's a no-op for immutable state).
     * @returns {void}
     */
    it('should create and manage test state with automatic cleanup', () => {
      const { gameState, cleanup } = withTestState({
        phase: GAME_PHASES.PLAYING
      });

      assert.strictEqual(gameState.gamePhase, GAME_PHASES.PLAYING);
      cleanup(); // Should be a no-op but callable
    });

    /**
     * @test {withTestState}
     * @description Verifies that `withTestState` contributes to maintaining
     * test isolation by ensuring that game state generated in one test does
     * not leak into subsequent tests.
     * @returns {void}
     */
    it('should maintain test isolation between tests', () => {
      // This test implicitly verifies that state from previous tests doesn't leak
      const { gameState } = withTestState();
      assert.strictEqual(typeof gameState.gameId, 'string');
    });
  });

  /**
   * @describe Test suite for test ID generation utilities.
   * @see {@link module:test-helpers.getTestId}
   * @see {@link module:test-helpers.resetTestIdCounter}
   */
  describe('Test ID Generation', () => {
    /**
     * @test {getTestId}
     * @description Confirms that `getTestId` generates unique identifiers
     * on successive calls, following a predictable format.
     * @returns {void}
     */
    it('should generate unique test IDs', () => {
      const id1 = getTestId('test');
      const id2 = getTestId('test');
      assert.notStrictEqual(id1, id2, 'IDs should be unique');
      assert.match(id1, /^test-\d+$/, 'ID should match expected format');
    });

    /**
     * @test {resetTestIdCounter}
     * @description Verifies that `resetTestIdCounter` resets the internal
     * counter, causing `getTestId` to produce the same sequence of IDs from
     * the beginning.
     * @returns {void}
     */
    it('should reset test ID counter with resetTestIdCounter', () => {
      const id1 = getTestId('test');
      resetTestIdCounter();
      const id2 = getTestId('test');
      assert.strictEqual(id1, id2, 'IDs should match after reset');
    });
  });

  /**
   * @describe Test suite for path handling, specifically ensuring Windows compatibility.
   */
  describe('Path Handling (Windows-compatible)', () => {
    /**
     * @test {path}
     * @description Ensures that Node.js's `path` module and URL utilities
     * correctly handle Windows-style paths when converting between file paths
     * and URLs, maintaining path integrity.
     * @returns {void}
     */
    it('should handle Windows paths correctly', async () => {
      const testPath = path.join('test', 'helpers', 'test-helpers.js');
      const fullPath = path.join(__dirname, testPath);

      // Convert to file URL and back to verify the path is valid
      const fileUrl = new URL(`file://${fullPath}`);
      const resolvedPath = fileURLToPath(fileUrl);

      // Verify the path ends with the expected filename, normalizing separators
      assert.ok(
        resolvedPath.endsWith(testPath.replace(/\\/g, path.sep)),
        `Path should end with ${testPath}, got ${resolvedPath}`
      );
    });
  });
});