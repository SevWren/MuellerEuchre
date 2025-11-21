import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { GAME_PHASES } from '../../src/config/constants.js';
import { createMockLogger } from '../test-utils/mock-logger.js';
import * as loggerModule from '../../src/utils/logger.js';

describe('Layer 2: State Management (src/game/state.js)', () => {
  let stateModule;
  let mockLogger;

  beforeEach(async () => {
    mockLogger = createMockLogger();
    mock.method(loggerModule.logger, 'info', mockLogger.info);
    mock.method(loggerModule.logger, 'warn', mockLogger.warn);
    mock.method(loggerModule.logger, 'error', mockLogger.error);
    mock.method(loggerModule.logger, 'debug', mockLogger.debug);

    // Cache-bust import to reset module-level Map
    stateModule = await import(`../../src/game/state.js?t=${Date.now()}`);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  describe('Core CRUD Operations', () => {
    it('createGameState should return a frozen, valid state', () => {
      const state = stateModule.createGameState('host-1');
      assert.ok(Object.isFrozen(state));
      assert.strictEqual(state.hostId, 'host-1');
      assert.strictEqual(state.gamePhase, GAME_PHASES.LOBBY);
    });

    it('getGameState should return a deep copy, not a reference', () => {
      const state = stateModule.createGameState('host-1');
      const retrieved1 = stateModule.getGameState(state.gameId);
      
      // Verify it is a different object reference
      assert.notStrictEqual(state, retrieved1, 'Should return new object references');
      
      // Verify deep equality
      assert.deepStrictEqual(state, retrieved1, 'Should have identical content');
    });

    it('getGameState should return a frozen object to prevent consumer mutation', () => {
      const state = stateModule.createGameState('host-1');
      const retrieved = stateModule.getGameState(state.gameId);
      
      assert.ok(Object.isFrozen(retrieved), 'Returned state should be frozen');
      
      // Verify that attempting to mutate throws an error
      assert.throws(() => {
        retrieved.gamePhase = 'MUTATED';
      }, /Cannot assign to read only property|Cannot add property|object is not extensible/);
    });

    it('updateGameState should perform atomic updates and update timestamp', async () => {
      const start = stateModule.createGameState('host-1');
      // Sleep 1ms to ensure timestamp difference
      await new Promise(r => setTimeout(r, 1));
      
      const next = stateModule.updateGameState(start.gameId, (s) => ({
        ...s,
        gamePhase: GAME_PHASES.DEALING
      }));

      assert.strictEqual(next.gamePhase, GAME_PHASES.DEALING);
      assert.ok(next.updatedAt > start.updatedAt);
      assert.ok(Object.isFrozen(next));
    });
  });

  describe('Hydration Logic', () => {
    it('should hydrate valid games into memory', () => {
      const validGame = { 
        gameId: 'saved-1', 
        gamePhase: 'LOBBY', 
        players: {}, 
        updatedAt: Date.now() 
      };
      
      stateModule.hydrateGames([validGame]);
      
      const retrieved = stateModule.getGameState('saved-1');
      assert.deepStrictEqual(retrieved, validGame);
      assert.ok(Object.isFrozen(retrieved)); // Must be frozen upon hydration
    });

    it('should reject malformed games during hydration', () => {
      const invalidGame = { gameId: 'bad-1' }; // Missing players/phase
      
      stateModule.hydrateGames([invalidGame]);
      
      const retrieved = stateModule.getGameState('bad-1');
      assert.strictEqual(retrieved, null);
      
      // Verify warning logged
      mockLogger.assertLogged('warn', /Skipping hydration/);
    });
  });

  describe('Memory Management (Pruning)', () => {
    it('should prune games older than 2 hours', () => {
      const oldTime = Date.now() - (2 * 60 * 60 * 1000) - 1000; // 2h 1s ago
      const newTime = Date.now();

      // Manually inject states via hydrate to control timestamps
      const oldGame = { gameId: 'old', updatedAt: oldTime, players: {}, gamePhase: 'LOBBY' };
      const newGame = { gameId: 'new', updatedAt: newTime, players: {}, gamePhase: 'LOBBY' };

      stateModule.hydrateGames([oldGame, newGame]);

      const prunedCount = stateModule.pruneStaleGames();

      assert.strictEqual(prunedCount, 1);
      assert.strictEqual(stateModule.getGameState('old'), null);
      assert.ok(stateModule.getGameState('new'));
    });
  });
});