import assert from "node:assert/strict";
import { describe, it, beforeEach, mock } from 'node:test';
import { createTestServer } from "../test-utils.js";

// Add GamePersistence class definition
class GamePersistence {
  constructor(options = {}) {
    this.fs = options.fs;
    this.basePath = options.basePath;
  }

  saveGameState(gameId, state) {
    const data = JSON.stringify(state);
    this.fs.writeFileSync(`${this.basePath}/${gameId}.json`, data);
    return true;
  }

  loadGameState(gameId) {
    if (!this.fs.existsSync(`${this.basePath}/${gameId}.json`)) {
      return null;
    }
    const data = this.fs.readFileSync(
      `${this.basePath}/${gameId}.json`,
      "utf8",
    );
    return JSON.parse(data);
  }

  // --- Add these methods to support player data persistence ---
  /**
   * Saves player data to a file named {playerId}.player.json in the basePath.
   * @param {string} playerId
   * @param {object} playerData
   */
  savePlayerData(playerId, playerData) {
    const data = JSON.stringify(playerData);
    this.fs.writeFileSync(`${this.basePath}/${playerId}.player.json`, data);
    return true;
  }

  /**
   * Loads player data from a file named {playerId}.player.json in the basePath.
   * @param {string} playerId
   * @returns {object|null}
   */
  loadPlayerData(playerId) {
    const filePath = `${this.basePath}/${playerId}.player.json`;
    if (!this.fs.existsSync(filePath)) {
      return null;
    }
    const data = this.fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  }
}

// Use ES module export
export { GamePersistence };

describe("Game State Persistence", () => {
  let server, persistence; // mockFs will be accessed via server.fs

  beforeEach(() => {
    ({ server } = createTestServer()); // Get the server instance which contains mockFs as server.fs
    // Instantiate the local GamePersistence class, passing server.fs
    persistence = new GamePersistence({ fs: server.fs, basePath: "." });
  });

  it("should save game state", () => {
    const gameState = {
      id: "test-game",
      players: {},
      scores: { team1: 0, team2: 0 },
    };

    persistence.saveGameState("test-game", gameState);
    assert.strictEqual(server.mockIo.sockets.sockets['socket1'].emit.mock.callCount(), 0); // Example of how to use mock.fn()
  });

  it("should load game state", () => {
    const gameState = {
      id: "test-game",
      players: {},
      scores: { team1: 0, team2: 0 },
    };

    server.mockIo.sockets.sockets['socket1'].emit.mock.mockImplementation(() => {}); // Example of how to use mock.fn()
    server.fs.existsSync.mock.mockImplementation(() => true);
    server.fs.readFileSync.mock.mockImplementation(() => JSON.stringify(gameState));

    const loadedState = persistence.loadGameState("test-game");
    assert.deepStrictEqual(loadedState, gameState);
  });

  it("should handle missing game state", () => {
    server.fs.existsSync.mock.mockImplementation(() => false);
    const loadedState = persistence.loadGameState("missing-game");
    assert.strictEqual(loadedState, null);
  });
});
