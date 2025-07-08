/**
 * @file Provides robust, case-insensitive comparison utilities.
 * @module utils/comparisonUtils
 * @description Use these functions to safely compare strings against constants
 * from `src/config/constants.js` to avoid common case-sensitivity bugs.
 */

/**
 * Compares two strings for equality, ignoring case.
 * This function is null-safe and type-safe, returning `false` if either input is not a string.
 *
 * @param {string} str1 - The first string, often from a variable source like user input or an API response.
 * @param {string} str2 - The second string, typically a constant from `src/config/constants.js`.
 * @returns {boolean} True if the strings are equal ignoring case, false otherwise.
 *
 * @example
 * // Basic usage with a constant from the project
 * import { areEqualIgnoreCase } from '@/utils/comparisonUtils.js';
 * import { SUITS } from '@/config/constants.js';
 *
 * const userInputSuit = 'Hearts'; // Could be 'hearts', 'HEARTS', etc.
 *
 * // Correctly evaluates to true because 'Hearts'.toLowerCase() === 'hearts'
 * if (areEqualIgnoreCase(userInputSuit, SUITS.HEARTS)) {
 *   console.log('The suit is hearts.');
 * }
 *
 * @example
 * // Demonstrating different cases
 * areEqualIgnoreCase('Hello World', 'hello world'); // true
 * areEqualIgnoreCase('Test', 'test');             // true
 * areEqualIgnoreCase('Euchre', 'eUCHRE');           // true
 *
 * @example
 * // Demonstrating inequality
 * areEqualIgnoreCase('hearts', 'spades');           // false
 *
 * @example
 * // Handling non-string and null/undefined inputs safely
 * areEqualIgnoreCase('test', null);                 // false
 * areEqualIgnoreCase(undefined, 'test');            // false
 * areEqualIgnoreCase(123, '123');                   // false (because the first argument is not a string)
 * areEqualIgnoreCase(null, undefined);              // false
 */
export function areEqualIgnoreCase(str1, str2) {
    // Ensure both inputs are strings before comparing
    if (typeof str1 !== 'string' || typeof str2 !== 'string') {
      return false;
    }
    return str1.toLowerCase() === str2.toLowerCase();
  }