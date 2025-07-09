// filepath: test/utils/testMocks.unit.test.js
import { test } from 'node:test';
import assert from 'node:assert';
import {
  createMockLogger,
  validateMockLogger
} from './testMocks.js';

test('createMockLogger returns a logger with no-op functions', () => {
  const mockLogger = createMockLogger();
  assert.strictEqual(typeof mockLogger.info, 'function');
  assert.strictEqual(typeof mockLogger.warn, 'function');
  assert.strictEqual(typeof mockLogger.error, 'function');
  assert.strictEqual(typeof mockLogger.debug, 'function');
  assert.strictEqual(typeof mockLogger.trace, 'function');
});

test('validateMockLogger validates a valid logger', () => {
  const mockLogger = createMockLogger();
  assert.doesNotThrow(() => validateMockLogger(mockLogger));
  assert.strictEqual(validateMockLogger(mockLogger), true);
});

test('validateMockLogger throws for invalid logger', () => {
  // Test with non-object
  assert.throws(
    () => validateMockLogger('not an object'),
    { name: 'TypeError', message: 'Logger must be an object' }
  );

  // Test with object missing required methods
  const invalidLogger = { info: () => {}, warn: () => {} }; // Missing error, debug, trace
  assert.throws(
    () => validateMockLogger(invalidLogger),
    { name: 'TypeError', message: 'Logger is missing required method: error' }
  );
});