import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTestServer } from "../test-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAVE_FILE = path.join(__dirname, "..", "game_state.json");

describe("Basic Persistence", function () {
  let server, gameState;
  let writeFileSyncMock, readFileSyncMock, existsSyncMock;
  let loggerErrorMock; // Mock for logger.error

  beforeEach(async () => {
    // Use createTestServer instead of manual setup
    ({ server, gameState } = createTestServer());
    writeFileSyncMock = mock.method(server.fs, 'writeFileSync', mock.fn());
    readFileSyncMock = mock.method(server.fs, 'readFileSync', mock.fn(() => ''));
    existsSyncMock = mock.method(server.fs, 'existsSync', mock.fn(() => false));
    loggerErrorMock = mock.method(server.logger, 'error', mock.fn());

    // Configure server with AUTO_SAVE disabled for the specific test
    server.config = {
      ...server.config,
      AUTO_SAVE: false,
    };

    await server.initialize();
  });

  afterEach(() => {
    mock.restoreAll(); // Restore all mocks
  });

  describe("Save Game State", () => {
    it("should not save when auto-save is disabled", async () => {
      server.config.AUTO_SAVE = false;
      const result = await server.saveGameState();
      assert.strictEqual(result, false);
      assert.strictEqual(writeFileSyncMock.mock.callCount(), 0);
    });

    it("should handle save errors gracefully", async () => {
      server.config.AUTO_SAVE = true;
      writeFileSyncMock.mock.mockImplementation(() => { throw new Error("Failed to write"); });
      const result = await server.saveGameState();
      assert.strictEqual(result, false);
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
      assert.ok(loggerErrorMock.mock.calls[0].arguments[0].includes("Error saving game state:"));
    });
  });

  describe("Load Game State", () => {
    it("should handle missing or corrupt save file", async () => {
      existsSyncMock.mock.mockImplementation(() => true);
      readFileSyncMock.mock.mockImplementation(() => { throw new Error("Corrupt file"); });

      // Re-initialize server to trigger load logic with the new mocks
      server = createTestServer();
      server.config = {
        ...server.config,
        SAVE_FILE: SAVE_FILE,
      };
      mock.method(server.fs, 'existsSync', existsSyncMock);
      mock.method(server.fs, 'readFileSync', readFileSyncMock);
      mock.method(server.logger, 'error', loggerErrorMock);

      await server.initialize();

      assert.strictEqual(server.gameState.gamePhase, "LOBBY");
      assert.strictEqual(loggerErrorMock.mock.callCount(), 1);
      assert.ok(loggerErrorMock.mock.calls[0].arguments[0].includes("Error loading saved state:"));
    });
  });
});
