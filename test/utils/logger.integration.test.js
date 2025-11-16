/**
 * Integration tests for the logger utility in the Euchre Multiplayer game.
 * @module test/utils/logger.integration.test
 * @description
 *   This test suite is specifically designed to achieve 100% code coverage on the
 *   real `src/utils/logger.js` module. It tests the `createLogger` factory function
 *   by directing its output to an in-memory stream, ensuring reliable and isolated
 *   testing without interfering with `process.stdout`.
 *
 * @see {@link module:src/utils/logger} for the implementation being tested.
 * @see {@link module:test/utils/logger.unit.test} for the isolated unit tests.
 */

import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Writable } from "node:stream";
import pino from "pino"; // <-- FIX: Import pino
import { createLogger, getLogLevelFromEnv } from "../../src/utils/logger.js";

// Helper to create a writable stream that captures output to an array.
function createCaptureStream() {
  const chunks = [];
  const stream = new Writable({
    write(chunk, encoding, callback) {
      chunks.push(chunk.toString());
      callback();
    },
  });
  return { stream, chunks };
}

describe("Logger Utility (Integration Tests on Real Module)", () => {
  afterEach(() => {
    delete process.env.LOG_LEVEL;
    delete process.env.NODE_ENV;
    delete process.env.DEBUG_LEVEL;
  });

  describe("createLogger() factory", () => {
    it("should create a logger that writes JSON to a custom stream", () => {
      const { stream, chunks } = createCaptureStream();
      // Use pino.destination to make the stream synchronous for the test
      const logger = createLogger(
        { level: "info" },
        pino.destination({ dest: stream, sync: true })
      );

      logger.info("hello world");

      assert.strictEqual(chunks.length, 1);
      const logJson = JSON.parse(chunks[0]);
      assert.strictEqual(logJson.level, 30);
      assert.strictEqual(logJson.msg, "hello world");
    });

    it("should respect the log level passed in options", () => {
      const { stream, chunks } = createCaptureStream();
      const logger = createLogger(
        { level: "error" },
        pino.destination({ dest: stream, sync: true })
      );

      // This should be suppressed
      logger.info("should not appear");
      assert.strictEqual(chunks.length, 0);

      // This should appear
      logger.error("should appear");
      assert.strictEqual(chunks.length, 1);
      const logJson = JSON.parse(chunks[0]);
      assert.strictEqual(logJson.msg, "should appear");
    });

    it("should use prettyPrint when option is true", async () => {
      const { stream, chunks } = createCaptureStream();
      // pino-pretty transport is async, so we pass the raw stream
      const logger = createLogger(
        {
          level: "info",
          prettyPrint: true,
        },
        stream
      );

      logger.info("pretty print test");

      // FIX: Wait for the async write to complete
      await new Promise((resolve) => setImmediate(resolve));

      assert.strictEqual(chunks.length, 1);
      // pino-pretty output is not JSON, so we check for string content
      assert.match(chunks[0], /pretty print test/);
      assert.doesNotMatch(chunks[0], /"msg":"pretty print test"/);
    });
  });

  describe("getLogLevelFromEnv() integration", () => {
    it("should respect LOG_LEVEL environment variable", () => {
      process.env.LOG_LEVEL = "error";
      const { level } = getLogLevelFromEnv(process.env);
      const { stream, chunks } = createCaptureStream();
      const logger = createLogger(
        { level },
        pino.destination({ dest: stream, sync: true })
      );

      // This log should be suppressed
      logger.info("should not appear");
      assert.strictEqual(chunks.length, 0);

      // This log should appear
      logger.error("should appear");
      assert.strictEqual(chunks.length, 1);
      const logJson = JSON.parse(chunks[0]);
      assert.strictEqual(logJson.msg, "should appear");
    });
  });
});
