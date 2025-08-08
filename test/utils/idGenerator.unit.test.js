/**
 * @file Unit tests for the ID Generator utility
 * @module test/utils/idGenerator.unit.test
 * @description
 *   Test suite for the game ID generation functionality.
 *   Verifies that game IDs are generated with the correct format, length, and uniqueness.
 *
 * @see {@link module:src/utils/idGenerator} for the implementation being tested
 *
 * @example
 * // Running the tests
 * node --test test/utils/idGenerator.unit.test.js
 *
 * @example
 * // Running with coverage report
 * npx c8 --include="src/utils/idGenerator.js" node --test test/utils/idGenerator.unit.test.js
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { generateGameId } from "../../src/utils/idGenerator.js";

/**
 * Test suite for the ID Generator module.
 * @namespace IDGeneratorTests
 * @see {@link module:src/utils/idGenerator} for the implementation
 */
describe("idGenerator", () => {
  /**
   * Test suite for the generateGameId function.
   * @namespace IDGeneratorTests.generateGameId
   * @see {@link module:src/utils/idGenerator.generateGameId}
   */
  describe("generateGameId()", () => {
    /**
     * Tests that generateGameId returns a string.
     * @function
     * @name should_return_a_string
     * @memberof IDGeneratorTests.generateGameId
     */
    it("should return a string", () => {
      const id = generateGameId();
      assert.strictEqual(typeof id, 'string');
    });

    /**
     * Tests that generateGameId returns an ID of exactly 10 characters.
     * @function
     * @name should_return_an_ID_of_length_10
     * @memberof IDGeneratorTests.generateGameId
     */
    it("should return an ID of length 10", () => {
      const id = generateGameId();
      assert.strictEqual(id.length, 10);
    });

    /**
     * Tests that generateGameId produces different values on successive calls.
     * @function
     * @name should_generate_unique_IDs_on_successive_calls
     * @memberof IDGeneratorTests.generateGameId
     */
    it("should generate unique IDs on successive calls", () => {
      const id1 = generateGameId();
      const id2 = generateGameId();
      assert.notStrictEqual(id1, id2);
    });

    /**
     * Tests that generateGameId can generate many unique IDs without collisions.
     * @function
     * @name should_generate_a_large_number_of_unique_IDs
     * @memberof IDGeneratorTests.generateGameId
     * @param {number} numIds - The number of unique IDs to generate (default: 1000)
     */
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
