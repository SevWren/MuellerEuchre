/**
 * @file Unit tests for comparison utility functions.
 * @module test/utils/comparisonUtils.unit.test
 * @description
 *   This test suite validates the `areEqualIgnoreCase` function from `comparisonUtils.js`.
 *   It covers a comprehensive set of test cases including positive, negative,
 *   type safety, and edge cases to ensure robust and predictable behavior.
 *
 * @see {@link module:src/utils/comparisonUtils} for the implementation being tested.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { areEqualIgnoreCase } from '../../src/utils/comparisonUtils.js';

describe('Comparison Utils', () => {
  describe('areEqualIgnoreCase()', () => {
    // =========================================================================
    // Category 1: Positive Cases (Should return true)
    // =========================================================================

    it('should return true for identical lowercase strings', () => {
      const result = areEqualIgnoreCase('hello', 'hello');
      assert.strictEqual(result, true, 'Identical lowercase strings should be considered equal');
    });

    it('should return true for identical strings with different casing', () => {
      assert.strictEqual(areEqualIgnoreCase('Hello', 'hello'), true, 'Mixed case and lowercase should be equal');
      assert.strictEqual(areEqualIgnoreCase('hello', 'HELLO'), true, 'Lowercase and uppercase should be equal');
      assert.strictEqual(areEqualIgnoreCase('HeLlO wOrLd', 'hElLo WoRlD'), true, 'Complex mixed cases should be equal');
    });

    it('should return true for alphanumeric strings with different casing', () => {
      const result = areEqualIgnoreCase('Euchre123', 'euchre123');
      assert.strictEqual(result, true, 'Alphanumeric strings with different cases should be equal');
    });

    it('should return true for two empty strings', () => {
      const result = areEqualIgnoreCase('', '');
      assert.strictEqual(result, true, 'Two empty strings should be considered equal');
    });

    // =========================================================================
    // Category 2: Negative Cases (Should return false)
    // =========================================================================

    it('should return false for completely different strings', () => {
      const result = areEqualIgnoreCase('hearts', 'spades');
      assert.strictEqual(result, false, 'Fundamentally different strings should not be equal');
    });

    it('should return false for strings that are substrings of each other', () => {
      const result = areEqualIgnoreCase('test', 'testing');
      assert.strictEqual(result, false, 'A substring should not be considered equal to the full string');
    });

    it('should return false for strings with leading or trailing whitespace', () => {
      assert.strictEqual(areEqualIgnoreCase(' test', 'test'), false, 'Leading whitespace should cause inequality');
      assert.strictEqual(areEqualIgnoreCase('test ', 'test'), false, 'Trailing whitespace should cause inequality');
      assert.strictEqual(areEqualIgnoreCase(' test ', 'test'), false, 'Surrounding whitespace should cause inequality');
    });

    it('should return false for strings differing only by internal whitespace', () => {
      const result = areEqualIgnoreCase('hello world', 'helloworld');
      assert.strictEqual(result, false, 'Internal whitespace differences should cause inequality');
    });

    // =========================================================================
    // Category 3: Type Safety & Invalid Input Cases (Should return false)
    // =========================================================================

    it('should return false when one argument is null', () => {
      assert.strictEqual(areEqualIgnoreCase('test', null), false, 'A string compared to null should be false');
      assert.strictEqual(areEqualIgnoreCase(null, 'test'), false, 'Null compared to a string should be false');
    });

    it('should return false when both arguments are null', () => {
      const result = areEqualIgnoreCase(null, null);
      assert.strictEqual(result, false, 'Two null arguments should be false');
    });

    it('should return false when one argument is undefined', () => {
      assert.strictEqual(areEqualIgnoreCase('test', undefined), false, 'A string compared to undefined should be false');
      assert.strictEqual(areEqualIgnoreCase(undefined, 'test'), false, 'Undefined compared to a string should be false');
    });

    it('should return false when both arguments are undefined', () => {
      const result = areEqualIgnoreCase(undefined, undefined);
      assert.strictEqual(result, false, 'Two undefined arguments should be false');
    });

    it('should return false when one argument is a number', () => {
      assert.strictEqual(areEqualIgnoreCase(123, '123'), false, 'A number and a string should be false');
      assert.strictEqual(areEqualIgnoreCase('123', 123), false, 'A string and a number should be false');
    });

    it('should return false when one argument is a boolean', () => {
      assert.strictEqual(areEqualIgnoreCase(true, 'true'), false, 'A boolean and a string should be false');
      assert.strictEqual(areEqualIgnoreCase('false', false), false, 'A string and a boolean should be false');
    });

    it('should return false when one argument is an object', () => {
      const result = areEqualIgnoreCase({}, '[object Object]');
      assert.strictEqual(result, false, 'An object and a string should be false');
    });

    it('should return false when one argument is an array', () => {
      const result = areEqualIgnoreCase([], '');
      assert.strictEqual(result, false, 'An array and a string should be false');
    });
  });
});