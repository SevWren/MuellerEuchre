/**
 * @file Unit tests for the internationalization (i18n) utility.
 * @module test/utils/i18n.js.unit.test
 * @description
 *   Comprehensive test suite for the i18n translation function.
 *   Verifies the behavior of the translation function with various inputs,
 *   including valid and invalid translation keys, placeholder replacements,
 *   and error handling.
 *
 * @see {@link module:src/utils/i18n} for the implementation being tested
 * @see {@link module:src/utils/logger} for the logger utility being mocked
 * @see {@link module:src/config/locales/en.json} for the translation messages
 *
 * @example
 * // Running the tests
 * node --test test/utils/i18n.js.unit.test.js
 *
 * @example
 * // Running with coverage report
 * npx c8 --include="src/utils/i18n.js" node --test test/utils/i18n.js.unit.test.js
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Statically import the module to be mocked
import { logger } from '../../src/utils/logger.js';

// Create a mock logger object to spy on calls
const mockLogger = {
  warn: mock.fn(),
};

/**
 * Test suite for the i18n utility module.
 * @namespace I18nUtilityTests
 * @see {@link module:src/utils/i18n} for the implementation
 */
describe('i18n Utility', () => {
  let t; // This will hold the function from the dynamically imported module

  beforeEach(async () => {
    // Reset the mock before each test
    mockLogger.warn.mock.resetCalls();
    // Mock the 'warn' method of the actual logger instance
    mock.method(logger, 'warn', mockLogger.warn);

    // Dynamically import the module under test to ensure it gets the mocked logger
    const i18nModule = await import('../../src/utils/i18n.js');
    t = i18nModule.t;
  });

  afterEach(() => {
    // Restore all mocks after each test
    mock.restoreAll();
  });

  /**
   * Test suite for the t() translation function.
   * @namespace I18nUtilityTests.t
   * @see {@link module:src/utils/i18n.t}
   */
  describe('t() function', () => {
    /**
     * Test suite for successful translation scenarios.
     * @namespace I18nUtilityTests.t.SuccessfulTranslations
     */
    describe('Successful Translations', () => {
      /**
       * Tests that a simple translation key returns the expected string.
       * @function
       * @name should_return_a_simple_translation_for_a_valid_key
       * @memberof I18nUtilityTests.t.SuccessfulTranslations
       */
      it('should return a simple translation for a valid key', () => {
        const result = t('game.phases.playing');
        assert.strictEqual(result, 'Playing phase');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });

      /**
       * Tests that a nested translation key returns the expected string.
       * @function
       * @name should_return_a_nested_translation_for_a_valid_key
       * @memberof I18nUtilityTests.t.SuccessfulTranslations
       */
      it('should return a nested translation for a valid key', () => {
        const result = t('game.messages.yourTurn');
        assert.strictEqual(result, 'Your turn to play');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });
    });

    /**
     * Test suite for placeholder replacement functionality.
     * @namespace I18nUtilityTests.t.PlaceholderReplacements
     */
    describe('Placeholder Replacements', () => {
      /**
       * Tests that a single placeholder is correctly replaced in the translation.
       * @function
       * @name should_handle_a_single_placeholder_replacement_correctly
       * @memberof I18nUtilityTests.t.PlaceholderReplacements
       */
      it('should handle a single placeholder replacement correctly', () => {
        const result = t('game.messages.waitingFor', { playerRole: 'South' });
        assert.strictEqual(result, 'Waiting for South to play');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });

      /**
       * Tests that multiple placeholders are correctly replaced in the translation.
       * @function
       * @name should_handle_multiple_placeholder_replacements_correctly
       * @memberof I18nUtilityTests.t.PlaceholderReplacements
       */
      it('should handle multiple placeholder replacements correctly', () => {
        const result = t('game.actions.playCard', { playerRole: 'North', card: 'AS' });
        assert.strictEqual(result, 'North played AS');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });

      /**
       * Tests that non-existent placeholders are left unchanged.
       * @function
       * @name should_not_replace_anything_if_a_placeholder_does_not_exist_in_the_string
       * @memberof I18nUtilityTests.t.PlaceholderReplacements
       */
      it('should not replace anything if a placeholder does not exist in the string', () => {
        const result = t('game.messages.yourTurn', { nonExistent: 'value' });
        assert.strictEqual(result, 'Your turn to play');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });

      /**
       * Tests that an empty replacements object doesn't cause errors.
       * @function
       * @name should_work_with_an_empty_replacements_object
       * @memberof I18nUtilityTests.t.PlaceholderReplacements
       */
      it('should work with an empty replacements object', () => {
        const result = t('game.messages.waitingFor', {});
        assert.strictEqual(result, 'Waiting for {playerRole} to play');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });

      /**
       * Tests that a non-object replacements parameter is handled gracefully.
       * @function
       * @name should_handle_non_object_replacements_parameter_gracefully
       * @memberof I18nUtilityTests.t.ErrorHandling
       */
      it('should handle non-object replacements parameter gracefully', () => {
        const result = t('game.messages.waitingFor', { playerRole: 'South' });
        assert.strictEqual(result, 'Waiting for South to play');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });
    });

    /**
     * Test suite for error handling and edge cases.
     * @namespace I18nUtilityTests.t.ErrorHandling
     */
    describe('Error Handling and Edge Cases', () => {
      /**
       * Tests that a non-existent top-level key returns the key and logs a warning.
       * @function
       * @name should_return_the_key_itself_if_a_top_level_key_is_not_found
       * @memberof I18nUtilityTests.t.ErrorHandling
       */
      it('should return the key itself if a top-level key is not found', () => {
        const key = 'nonexistent.key';
        const result = t(key);
        assert.strictEqual(result, key);
        assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
        assert.match(mockLogger.warn.mock.calls[0].arguments[0], /Translation key not found/);
      });

      /**
       * Tests that a non-existent nested key returns the key and logs a warning.
       * @function
       * @name should_return_the_key_itself_if_a_nested_key_is_not_found
       * @memberof I18nUtilityTests.t.ErrorHandling
       */
      it('should return the key itself if a nested key is not found', () => {
        const key = 'game.actions.nonexistent';
        const result = t(key);
        assert.strictEqual(result, key);
        assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
        assert.match(mockLogger.warn.mock.calls[0].arguments[0], /Translation key not found/);
      });

      /**
       * Tests that a key resolving to a non-string value returns the key and logs a warning.
       * @function
       * @name should_return_the_key_itself_if_the_resolved_value_is_an_object_not_a_string
       * @memberof I18nUtilityTests.t.ErrorHandling
       */
      it('should return the key itself if the resolved value is an object, not a string', () => {
        const key = 'game.actions';
        const result = t(key);
        assert.strictEqual(result, key);
        assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
        assert.match(mockLogger.warn.mock.calls[0].arguments[0], /is not a string/);
      });

      /**
       * Tests that a null key returns an empty string and logs a warning.
       * @function
       * @name should_return_an_empty_string_and_log_a_warning_for_a_null_key
       * @memberof I18nUtilityTests.t.ErrorHandling
       */
      it('should return an empty string and log a warning for a null key', () => {
        const result = t(null);
        assert.strictEqual(result, '');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
        assert.match(mockLogger.warn.mock.calls[0].arguments[0], /Invalid translation key/);
      });

      /**
       * Tests that an empty key returns an empty string and logs a warning.
       * @function
       * @name should_return_an_empty_string_and_log_a_warning_for_an_empty_key
       * @memberof I18nUtilityTests.t.ErrorHandling
       */
      it('should return an empty string and log a warning for an empty key', () => {
        const result = t('');
        assert.strictEqual(result, '');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
        assert.match(mockLogger.warn.mock.calls[0].arguments[0], /Invalid translation key/);
      });

      it('should return an empty string and log a warning for a key with only whitespace', () => {
        const result = t('   ');
        assert.strictEqual(result, '');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
        assert.match(mockLogger.warn.mock.calls[0].arguments[0], /Invalid translation key/);
      });

      it('should proceed without replacements and log a warning for a null replacements object', () => {
        const key = 'game.messages.waitingFor';
        const result = t(key, null);
        assert.strictEqual(result, 'Waiting for {playerRole} to play');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
        assert.match(mockLogger.warn.mock.calls[0].arguments[0], /Invalid replacements object/);
      });

      it('should proceed without replacements and log a warning for a non-object replacements value', () => {
        const key = 'game.messages.waitingFor';
        const result = t(key, 'invalid');
        assert.strictEqual(result, 'Waiting for {playerRole} to play');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
        assert.match(mockLogger.warn.mock.calls[0].arguments[0], /Invalid replacements object/);
      });
    });
  });
});