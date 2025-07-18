/**
 * @file test/server/persistence/autoSave.unit.test.js
 * @module test/server/persistence/autoSave
 * @description
 *   Unit tests for the auto-save functionality in the MockServer class.
 *
 *   This test suite uses esmock_wrapper.js to properly mock the MockServer class
 *   and its dependencies, ensuring test isolation and reliability.
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { MockServer } from '../test-utils.js'; // Import MockServer directly

describe("Auto-Save Functionality", () => {
  let server;
  let writeFileSyncMock;
  let clock;
  let loggerErrorMock;

  beforeEach(async () => {
    mock.restoreAll(); // Restore all mocks from previous tests

    // Mock fs methods
    writeFileSyncMock = mock.method(MockServer.prototype, 'fs', 'writeFileSync', mock.fn());
    mock.method(MockServer.prototype, 'fs', 'existsSync', mock.fn(() => false));
    mock.method(MockServer.prototype, 'fs', 'readFileSync', mock.fn(() => '{}'));

    // Mock logger.error
    loggerErrorMock = mock.method(MockServer.prototype, 'logger', 'error', mock.fn());

    // Instantiate the MockServer with auto-save enabled for testing this feature.
    server = new MockServer({
      config: {
        AUTO_SAVE: true,
        SAVE_FILE: "./test-save.json",
      },
    });

    // Use node:test's fake timers
    clock = mock.timers.install();

    await server.initialize();
  });

  afterEach(() => {
    clock.reset(); // Reset the real timers
    mock.restoreAll(); // Clean up all mocks and spies
  });

  it("should auto-save at regular intervals when enabled", async () => {
    writeFileSyncMock.mock.resetCalls(); // Reset calls after initialize

    // Advance time just before the first auto-save should trigger (30s interval)
    clock.tick(29999);
    assert.strictEqual(writeFileSyncMock.mock.callCount(), 0, "Should not have saved before the interval elapsed");

    // Advance time past the 30-second mark
    clock.tick(1);

    // Verify the save was called with the expected arguments
    assert.strictEqual(writeFileSyncMock.mock.callCount(), 1, "Should have auto-saved exactly once after the interval");
    const [filePath, data] = writeFileSyncMock.mock.calls[0].arguments;
    assert.ok(filePath.includes("test-save.json"));
    assert.deepStrictEqual(JSON.parse(data), { gamePhase: 'LOBBY', players: {}, team1Score: 0, team2Score: 0, version: '1.0.0' });
  });

  it("should not auto-save when disabled", async () => {
    // Create a new server instance with auto-save disabled
    const disabledServer = new MockServer({
      config: {
        AUTO_SAVE: false,
        SAVE_FILE: "./test-save.json",
      },
    });

    // Initialize the server. The initialize method should respect the config.
    await disabledServer.initialize();

    // Advance time well past the auto-save interval
    clock.tick(60000);

    // Verify that the file system was never written to
    assert.strictEqual(writeFileSyncMock.mock.callCount(), 0, "Should not auto-save when the feature is disabled");
  });

  it("should handle file system errors gracefully", async () => {
    // Make writeFileSync throw an error
    writeFileSyncMock.mock.mockImplementation(() => { throw new Error("File system error"); });

    // Trigger auto-save
    clock.tick(30000);

    // Verify the error was handled
    assert.strictEqual(loggerErrorMock.mock.callCount(), 1, "Should log the file system error");
    assert.ok(loggerErrorMock.mock.calls[0].arguments[0].includes("Error saving game state"), "Error message should contain 'Error saving game state'");
  });
});
