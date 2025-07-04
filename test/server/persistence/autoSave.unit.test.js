/**
 * @file test/server/persistence/autoSave.unit.test.js
 * @module test/server/persistence/autoSave
 * @description
 *   Unit tests for the auto-save functionality in the MockServer class.
 *
 *   This test suite uses esmock_wrapper.js to properly mock the MockServer class
 *   and its dependencies, ensuring test isolation and reliability.
 */

import { expect } from "chai";
import sinon from "sinon";
import { esmockWithPaths } from "../../utils/esmock_wrapper.js";

// Path to the module under test
const MOCK_SERVER_PATH = "../../server/test-utils.js";

describe("Auto-Save Functionality", () => {
  let MockServer;
  let server;
  let writeFileSyncStub;
  let clock;

  before(async () => {
    // Create a stub for the file system's write method
    writeFileSyncStub = sinon.stub();

    // Import the MockServer class with mocks using esmockWithPaths
    const mockFs = {
      writeFileSync: writeFileSyncStub,
      existsSync: sinon.stub().returns(false),
      readFileSync: sinon.stub().returns("{}"),
    };

    // Mock the logger
    const mockLogger = {
      info: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
    };

    // Import the module with mocks
    const module = await esmockWithPaths(import.meta.url, MOCK_SERVER_PATH, {
      fs: mockFs,
      "fs/promises": {
        readFile: sinon.stub().resolves("{}"),
        writeFile: sinon.stub().resolves(),
      },
      "@/utils/logger.js": { logger: mockLogger },
    });

    MockServer = module.MockServer;
  });

  beforeEach(() => {
    // Reset stubs before each test
    writeFileSyncStub.resetHistory();

    // Use fake timers to control setInterval and setTimeout
    clock = sinon.useFakeTimers();

    // Instantiate the MockServer with the stubbed file system
    // and enable AUTO_SAVE for testing this feature.
    server = new MockServer({
      fs: {
        writeFileSync: writeFileSyncStub,
        existsSync: sinon.stub().returns(false),
      },
      config: {
        AUTO_SAVE: true,
        SAVE_FILE: "./test-save.json",
      },
      logger: {
        error: sinon.stub(),
      },
    });
  });

  afterEach(() => {
    // Restore the real timers
    clock.restore();
    // Clean up the interval timer if it exists to prevent test leakage
    if (server?.autoSaveInterval) {
      clearInterval(server.autoSaveInterval);
    }
    // Reset all stubs
    sinon.reset();
  });

  it("should auto-save at regular intervals when enabled", async () => {
    // Initialize the server, which starts the auto-save interval
    await server.initialize();
    writeFileSyncStub.resetHistory();

    // Advance time just before the first auto-save should trigger (30s interval)
    clock.tick(29999);
    expect(
      writeFileSyncStub.called,
      "Should not have saved before the interval elapsed",
    ).to.be.false;

    // Advance time past the 30-second mark
    clock.tick(1);

    // Verify the save was called with the expected arguments
    expect(
      writeFileSyncStub.calledOnce,
      "Should have auto-saved exactly once after the interval",
    ).to.be.true;
    const [filePath, data] = writeFileSyncStub.firstCall.args;
    expect(filePath).to.include("test-save.json");
    expect(JSON.parse(data)).to.have.property("version", "1.0.0");
  });

  it("should not auto-save when disabled", async () => {
    // Create a new server instance with auto-save disabled
    const disabledServer = new MockServer({
      fs: {
        writeFileSync: writeFileSyncStub,
        existsSync: sinon.stub().returns(false),
      },
      config: {
        AUTO_SAVE: false,
        SAVE_FILE: "./test-save.json",
      },
      logger: {
        error: sinon.stub(),
      },
    });

    // Initialize the server. The initialize method should respect the config.
    await disabledServer.initialize();

    // Advance time well past the auto-save interval
    clock.tick(60000);

    // Verify that the file system was never written to
    expect(
      writeFileSyncStub.called,
      "Should not auto-save when the feature is disabled",
    ).to.be.false;

    // Clean up
    if (disabledServer.autoSaveInterval) {
      clearInterval(disabledServer.autoSaveInterval);
    }
  });

  it("should handle file system errors gracefully", async () => {
    // Create a new server instance with a failing file system
    const errorStub = sinon.stub().throws(new Error("File system error"));
    const errorServer = new MockServer({
      fs: {
        writeFileSync: errorStub,
        existsSync: sinon.stub().returns(false),
      },
      config: {
        AUTO_SAVE: true,
        SAVE_FILE: "./test-save.json",
      },
      logger: {
        error: sinon.stub(),
      },
    });

    // Initialize the server
    await errorServer.initialize();

    // Trigger auto-save
    clock.tick(30000);

    // Verify the error was handled
    expect(errorServer.logger.error.called, "Should log the file system error")
      .to.be.true;

    // Clean up
    if (errorServer.autoSaveInterval) {
      clearInterval(errorServer.autoSaveInterval);
    }
  });
});
