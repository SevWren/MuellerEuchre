// filepath: test/utils/i18n.js.unit.test.js

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Statically import the module to be mocked
import { logger } from '../../src/utils/logger.js';

// Create a mock logger object to spy on calls
const mockLogger = {
  warn: mock.fn(),
};

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

  describe('t() function', () => {
    describe('Successful Translations', () => {
      it('should return a simple translation for a valid key', () => {
        const result = t('game.phases.playing');
        assert.strictEqual(result, 'Playing phase');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });

      it('should return a nested translation for a valid key', () => {
        const result = t('game.messages.yourTurn');
        assert.strictEqual(result, 'Your turn to play');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });
    });

    describe('Placeholder Replacements', () => {
      it('should handle a single placeholder replacement correctly', () => {
        const result = t('game.messages.waitingFor', { playerRole: 'South' });
        assert.strictEqual(result, 'Waiting for South to play');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });

      it('should handle multiple placeholder replacements correctly', () => {
        const result = t('game.actions.playCard', { playerRole: 'North', card: 'AS' });
        assert.strictEqual(result, 'North played AS');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });

      it('should not replace anything if a placeholder does not exist in the string', () => {
        const result = t('game.messages.yourTurn', { nonExistent: 'value' });
        assert.strictEqual(result, 'Your turn to play');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });

      it('should work with an empty replacements object', () => {
        const result = t('game.messages.waitingFor', {});
        assert.strictEqual(result, 'Waiting for {playerRole} to play');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 0);
      });
    });

    describe('Error Handling and Edge Cases', () => {
      it('should return the key itself if a top-level key is not found', () => {
        const key = 'nonexistent.key';
        const result = t(key);
        assert.strictEqual(result, key);
        assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
        assert.match(mockLogger.warn.mock.calls[0].arguments[0], /Translation key not found/);
      });

      it('should return the key itself if a nested key is not found', () => {
        const key = 'game.actions.nonexistent';
        const result = t(key);
        assert.strictEqual(result, key);
        assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
        assert.match(mockLogger.warn.mock.calls[0].arguments[0], /Translation key not found/);
      });

      it('should return the key itself if the resolved value is an object, not a string', () => {
        const key = 'game.actions';
        const result = t(key);
        assert.strictEqual(result, key);
        assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
        assert.match(mockLogger.warn.mock.calls[0].arguments[0], /is not a string/);
      });

      it('should return an empty string and log a warning for a null key', () => {
        const result = t(null);
        assert.strictEqual(result, '');
        assert.strictEqual(mockLogger.warn.mock.callCount(), 1);
        assert.match(mockLogger.warn.mock.calls[0].arguments[0], /Invalid translation key/);
      });

      it('should return an empty string and log a warning for an empty string key', () => {
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