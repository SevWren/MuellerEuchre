// filepath: test/utils/idGenerator.unit.test.js

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateGameId } from "../../src/utils/idGenerator.js";

describe("idGenerator", () => {
  describe("generateGameId()", () => {
    it("should return a string", () => {
      const id = generateGameId();
      assert.strictEqual(typeof id, 'string');
    });

    it("should return an ID of length 10", () => {
      const id = generateGameId();
      assert.strictEqual(id.length, 10);
    });

    it("should generate unique IDs on successive calls", () => {
      const id1 = generateGameId();
      const id2 = generateGameId();
      assert.notStrictEqual(id1, id2);
    });

    it("should generate a large number of unique IDs", () => {
      const numIds = 1000;
      const ids = new Set();
      for (let i = 0; i < numIds; i++) {
        ids.add(generateGameId());
      }
      assert.strictEqual(ids.size, numIds);
    });
  });
});
