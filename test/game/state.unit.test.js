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
    it('createGameState should return a deeply frozen, valid state', () => {
      const state = stateModule.createGameState('host-1');
      assert.ok(Object.isFrozen(state));
      assert.ok(Object.isFrozen(state.players));
      assert.strictEqual(state.hostId, 'host-1');
      mockLogger.assertLogged('info', /New game state created/);
    });

    it('getGameState should return null if game does not exist', () => {
        const result = stateModule.getGameState('non-existent');
        assert.strictEqual(result, null);
    });

    it('getGameState should return a frozen deep copy', () => {
      const state = stateModule.createGameState('host-1');
      const retrieved = stateModule.getGameState(state.gameId);
      assert.notStrictEqual(state, retrieved);
      assert.ok(Object.isFrozen(retrieved));
      
      assert.throws(() => {
        retrieved.players.newProp = 1;
      }, /Cannot add property|object is not extensible/);
    });

    it('getGameState should fall back to JSON if structuredClone fails', () => {
        const state = stateModule.createGameState('host-1');
        
        // Mock structuredClone to throw
        const originalClone = global.structuredClone;
        global.structuredClone = () => { throw new Error('Simulated Failure'); };
        
        try {
            const retrieved = stateModule.getGameState(state.gameId);
            assert.deepStrictEqual(retrieved, state);
            mockLogger.assertLogged('error', /structuredClone failed/);
        } finally {
            global.structuredClone = originalClone;
        }
    });

    it('updateGameState should update state and timestamp', () => {
        const start = stateModule.createGameState('host-1');
        const next = stateModule.updateGameState(start.gameId, s => ({ ...s, gamePhase: 'TEST' }));
        assert.strictEqual(next.gamePhase, 'TEST');
    });

    it('updateGameState should throw if gameId not found', () => {
        assert.throws(() => {
            stateModule.updateGameState('fake-id', s => s);
        }, /Game with ID "fake-id" not found/);
    });

    it('updateGameState should throw if updateFn returns invalid data', () => {
        const state = stateModule.createGameState('host-1');
        
        // Case 1: Returns null
        assert.throws(() => {
            stateModule.updateGameState(state.gameId, () => null);
        }, /State update function must return a valid game state object/);

        // Case 2: Returns object without gameId
        assert.throws(() => {
            stateModule.updateGameState(state.gameId, () => ({ foo: 'bar' }));
        }, /State update function must return a valid game state object/);
    });

    it('updateGameState should reject async update functions (Promises)', () => {
      const state = stateModule.createGameState('host-1');
      
      assert.throws(() => {
        stateModule.updateGameState(state.gameId, async (s) => s);
      }, /Layer 1 functions must be synchronous/);
    });

    it('removeGameState should remove the game from memory', () => {
      const state = stateModule.createGameState('host-1');
      assert.ok(stateModule.getGameState(state.gameId));
      
      const result = stateModule.removeGameState(state.gameId);
      assert.strictEqual(result, true);
      assert.strictEqual(stateModule.getGameState(state.gameId), null);
      
      // Manually verify the log exists in the mock calls
      // We access the mocked function directly on the module
      const calls = loggerModule.logger.info.mock.calls;
      const hasRemovalLog = calls.some(c => c.arguments[1] && /Game removed/.test(c.arguments[1]));
      assert.ok(hasRemovalLog, 'Should log "Game removed from memory"');
    });
    
    it('removeGameState should return false if game not found', () => {
        const result = stateModule.removeGameState('fake-id');
        assert.strictEqual(result, false);
    });

    it('listActiveGames should return all game IDs', () => {
      const s1 = stateModule.createGameState('h1');
      const s2 = stateModule.createGameState('h2');
      
      const list = stateModule.listActiveGames();
      assert.strictEqual(list.length, 2);
      assert.ok(list.includes(s1.gameId));
      assert.ok(list.includes(s2.gameId));
    });
  });

  describe('Hydration & Normalization', () => {
    it('should normalize Date objects to timestamps', () => {
      const dateObj = new Date();
      const game = { 
        gameId: 'g1', 
        gamePhase: 'LOBBY', 
        players: {}, 
        createdAt: dateObj,
        updatedAt: dateObj 
      };
      
      stateModule.hydrateGames([game]);
      
      const hydrated = stateModule.getGameState('g1');
      assert.strictEqual(typeof hydrated.createdAt, 'number');
      assert.strictEqual(hydrated.createdAt, dateObj.getTime());
      assert.ok(Object.isFrozen(hydrated));
    });

    it('should log error if hydrateGames input is not an array', () => {
        stateModule.hydrateGames(null);
        mockLogger.assertLogged('error', /hydrateGames expected an array/);
    });
    
    it('should skip malformed games in hydration array', () => {
        const good = { gameId: 'good', gamePhase: 'LOBBY', players: {} };
        const bad = { gameId: 'bad' }; // Missing props
        
        stateModule.hydrateGames([good, bad]);
        
        assert.ok(stateModule.getGameState('good'));
        assert.strictEqual(stateModule.getGameState('bad'), null);
        mockLogger.assertLogged('warn', /Skipping hydration/);
    });
  });

  describe('Memory Management', () => {
    it('should prune games older than 2 hours', () => {
      const oldTime = Date.now() - (2 * 60 * 60 * 1000) - 1000;
      const newTime = Date.now();
      const oldGame = { gameId: 'old', updatedAt: oldTime, players: {}, gamePhase: 'LOBBY' };
      const newGame = { gameId: 'new', updatedAt: newTime, players: {}, gamePhase: 'LOBBY' };

      stateModule.hydrateGames([oldGame, newGame]);
      const prunedCount = stateModule.pruneStaleGames();

      assert.strictEqual(prunedCount, 1);
      assert.strictEqual(stateModule.getGameState('old'), null);
      assert.ok(stateModule.getGameState('new'));
    });

    it('should handle games with missing/invalid timestamps during prune', () => {
        // If updatedAt is missing, it defaults to 0 (1970), so it should be pruned
        const weirdGame = { gameId: 'weird', players: {}, gamePhase: 'LOBBY' }; 
        stateModule.hydrateGames([weirdGame]);
        
        const prunedCount = stateModule.pruneStaleGames();
        assert.strictEqual(prunedCount, 1);
        assert.strictEqual(stateModule.getGameState('weird'), null);
    });
  });
});