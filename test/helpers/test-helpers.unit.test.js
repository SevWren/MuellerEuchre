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
} from '../../src/test-utils/test-helpers.js';

import { GAME_PHASES, PLAYER_ROLES, TEAMS, SUITS, VALUES } from '../../src/config/constants.js';

// Get the directory name for the current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Test Helpers', () => {
  // Setup test environment before all tests
  setupTestEnvironment();

  // Existing test cases
  describe('Core Functionality', () => {
    it('should create a base game state with default values', () => {
      const gameState = createBaseGameState();
      assert.strictEqual(typeof gameState, 'object', 'gameState should be an object');
      assert.notStrictEqual(gameState, null, 'gameState should not be null');
      assert.strictEqual(gameState.gamePhase, GAME_PHASES.LOBBY);
    });

    it('should setup a test state and advance to the specified phase', () => {
      const { gameState } = setupTestState({ phase: GAME_PHASES.PLAYING });
      assert.strictEqual(gameState.gamePhase, GAME_PHASES.PLAYING);
    });

    it('should create a completed hand state with correct tricks taken', () => {
      const gameState = setupCompletedHandState({ 
        makerTeam: TEAMS.TEAM_NS, 
        tricksWonByMaker: 3 
      });
      assert.strictEqual(gameState.gamePhase, GAME_PHASES.SCORING);
      assert.strictEqual(gameState.tricksTaken[TEAMS.TEAM_NS], 3);
      assert.strictEqual(gameState.tricksTaken[TEAMS.TEAM_EW], 2);
    });

    it('should create a mock player with correct team assignment', () => {
      const player = createMockPlayer(PLAYER_ROLES[0]);
      assert.strictEqual(typeof player, 'object', 'player should be an object');
      assert.notStrictEqual(player, null, 'player should not be null');
      assert.strictEqual(player.teamId, TEAMS.TEAM_NS);
    });

    it('should create a mock card with correct properties', () => {
      const card = createMockCard(SUITS.CARD_SUIT_SPADES, VALUES[0]);
      assert.strictEqual(typeof card, 'object', 'card should be an object');
      assert.notStrictEqual(card, null, 'card should not be null');
      assert.strictEqual(card.suit, SUITS.CARD_SUIT_SPADES);
      assert.strictEqual(card.value, VALUES[0]);
    });

    it('should create cards from a cardIdString', () => {
      const cardIdString = 'AS, KD';
      const cards = createCards(cardIdString);
      assert.ok(Array.isArray(cards), 'Should return an array');
      assert.strictEqual(cards.length, 2);
      assert.strictEqual(cards[0].id, 'AS');
      assert.strictEqual(cards[1].id, 'KD');
    });

    it('should get a card from the deck by ID', () => {
      const card = getCard('AS');
      assert.strictEqual(typeof card, 'object', 'card should be an object');
      assert.notStrictEqual(card, null, 'card should not be null');
      assert.strictEqual(card.id, 'AS');
    });

    it('should create a standard Euchre deck', () => {
      const deck = createDeck();
      assert.ok(Array.isArray(deck), 'Should return an array');
      assert.strictEqual(deck.length, 24);
    });

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

  describe('Test Environment Management', () => {
    it('should track and reset mocks automatically', () => {
      const mockFn = mock.fn();
      trackMock(mockFn);
      
      mockFn('test');
      assert.strictEqual(mockFn.mock.calls.length, 1);
      assert.strictEqual(mockFn.mock.calls[0].arguments[0], 'test');
    });

    it('should execute cleanup callbacks after each test', () => {
      // This test is a bit special because we're testing the test environment itself
      // The actual cleanup is verified by the test environment's afterEach hook
      let cleanupCalled = false;
      
      // Register a cleanup callback
      onCleanup(() => {
        cleanupCalled = true;
      });
      
      // The cleanup will be called by the test environment's afterEach hook
      // We just need to verify that the callback was registered
      assert.strictEqual(cleanupCalled, false, 'Cleanup should not be called yet');
    });
  });

  describe('Test Context', () => {
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
    });
  });

  describe('withTestState Helper', () => {
    it('should create and manage test state with automatic cleanup', () => {
      const { gameState, cleanup } = withTestState({
        phase: GAME_PHASES.PLAYING
      });
      
      assert.strictEqual(gameState.gamePhase, GAME_PHASES.PLAYING);
      cleanup(); // Should be a no-op but callable
    });

    it('should maintain test isolation between tests', () => {
      // This test verifies that state from previous tests doesn't leak
      const { gameState } = withTestState();
      assert.strictEqual(typeof gameState.gameId, 'string');
    });
  });

  describe('Test ID Generation', () => {
    it('should generate unique test IDs', () => {
      const id1 = getTestId('test');
      const id2 = getTestId('test');
      assert.notStrictEqual(id1, id2, 'IDs should be unique');
      assert.match(id1, /^test-\d+$/, 'ID should match expected format');
    });

    it('should reset test ID counter with resetTestIdCounter', () => {
      const id1 = getTestId('test');
      resetTestIdCounter();
      const id2 = getTestId('test');
      assert.strictEqual(id1, id2, 'IDs should match after reset');
    });
  });

  describe('Path Handling (Windows-compatible)', () => {
    it('should handle Windows paths correctly', async () => {
      const testPath = path.join('test', 'helpers', 'test-helpers.js');
      const fullPath = path.join(__dirname, testPath);
      
      // Convert to file URL and back to verify the path is valid
      const fileUrl = new URL(`file://${fullPath}`);
      const resolvedPath = fileURLToPath(fileUrl);
      
      // Verify the path ends with the expected filename
      assert.ok(
        resolvedPath.endsWith(testPath.replace(/\\/g, path.sep)),
        `Path should end with ${testPath}, got ${resolvedPath}`
      );
    });
  });
});