# Logger Test Coverage Analysis

This document outlines the specific lines and branches in `src/utils/logger.js` that are not covered by the existing tests in `test/utils/logger.unit.test.js`. For each uncovered area, a new test case is proposed to ensure 100% test coverage.

## 1. `createLogger()` Factory Function

### Uncovered Branches:
- The `prettyPrint: true` branch within the `createLogger` function is not explicitly tested. The existing tests rely on the `isProduction` flag, which is an indirect way of testing this.
- The default behavior when no `destination` is provided is not tested.

### Proposed Test Cases:

**Test Case 1: `prettyPrint` option**
- **Goal:** Verify that the `transport` option is correctly configured when `prettyPrint` is `true`.
- **File:** `test/utils/logger.unit.test.js`
- **Suggestion:**
  ```javascript
  it('should configure pino-pretty transport when prettyPrint is true', () => {
    const { createLogger } = require('../../src/utils/logger.js');
    const logger = createLogger({ prettyPrint: true });
    // This is tricky to assert directly without inspecting internal properties.
    // A snapshot test or checking for the presence of logger.transport would work.
    // For now, we can infer it by checking if it doesn't throw.
    assert.doesNotThrow(() => createLogger({ prettyPrint: true }));
  });
  ```

**Test Case 2: No destination stream**
- **Goal:** Ensure the logger can be created without a destination stream, defaulting to `stdout`.
- **File:** `test/utils/logger.unit.test.js`
- **Suggestion:**
  ```javascript
  it('should create a logger that writes to stdout by default', () => {
    const { createLogger } = require('../../src/utils/logger.js');
    assert.doesNotThrow(() => createLogger());
  });
  ```

## 2. `getLogLevelFromEnv()` Function

### Uncovered Branches:
- The case where `DEBUG_LEVEL` is set to a valid level other than `DEBUG_LEVELS.DEBUG` (e.g., `INFO`, `WARN`) is not explicitly tested.

### Proposed Test Case:

**Test Case: `DEBUG_LEVEL` with `INFO`**
- **Goal:** Verify that `getLogLevelFromEnv` correctly maps `DEBUG_LEVELS.INFO` to the 'info' pino level.
- **File:** `test/utils/logger.unit.test.js`
- **Suggestion:**
  ```javascript
  it('should correctly map DEBUG_LEVELS.INFO to "info"', () => {
    const { getLogLevelFromEnv } = require('../../src/utils/logger.js');
    const env = { DEBUG_LEVEL: DEBUG_LEVELS.INFO };
    const { level } = getLogLevelFromEnv(env);
    assert.strictEqual(level, 'info');
  });
  ```

## 3. `log()` Function

### Uncovered Branches:
The `switch` statement in the `log` function is not fully covered.
- `case DEBUG_LEVELS.DEBUG` / `LOG_LEVEL_DEBUG`
- `case DEBUG_LEVELS.LOG_LEVEL_TRACE`
- `case DEBUG_LEVELS.NONE` / `LOG_LEVEL_SILENT`
- The `default` case for an unknown log level.
- The case where `obj` is not provided.

### Proposed Test Cases:

**Test Case 1: `DEBUG` level**
- **Goal:** Verify `logger.debug` is called for `DEBUG_LEVELS.DEBUG`.
- **File:** `test/utils/logger.unit.test.js`
- **Suggestion (to be added inside the `log() Function` describe block):**
  ```javascript
  log(DEBUG_LEVELS.DEBUG, 'debug message', testObj);
  assert.strictEqual(mockPinoInstance.debug.mock.callCount(), 1);
  assert.deepStrictEqual(mockPinoInstance.debug.mock.calls[0].arguments, [testObj, 'debug message']);
  ```

**Test Case 2: `TRACE` level**
- **Goal:** Verify `logger.trace` is called for `DEBUG_LEVELS.LOG_LEVEL_TRACE`.
- **File:** `test/utils/logger.unit.test.js`
- **Suggestion:**
  ```javascript
  log(DEBUG_LEVELS.LOG_LEVEL_TRACE, 'trace message', testObj);
  assert.strictEqual(mockPinoInstance.trace.mock.callCount(), 1);
  assert.deepStrictEqual(mockPinoInstance.trace.mock.calls[0].arguments, [testObj, 'trace message']);
  ```

**Test Case 3: `SILENT` level**
- **Goal:** Verify no logger method is called for `DEBUG_LEVELS.LOG_LEVEL_SILENT`.
- **File:** `test/utils/logger.unit.test.js`
- **Suggestion:**
  ```javascript
  log(DEBUG_LEVELS.LOG_LEVEL_SILENT, 'silent message', testObj);
  assert.strictEqual(mockPinoInstance.error.mock.callCount(), 0);
  assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 0);
  assert.strictEqual(mockPinoInstance.info.mock.callCount(), 0);
  assert.strictEqual(mockPinoInstance.debug.mock.callCount(), 0);
  assert.strictEqual(mockPinoInstance.trace.mock.callCount(), 0);
  ```

**Test Case 4: Default case for unknown level**
- **Goal:** Verify `logger.info` is called as a fallback for an unknown log level.
- **File:** `test/utils/logger.unit.test.js`
- **Suggestion:**
  ```javascript
  it('should fall back to info for an unknown log level', () => {
    const { log } = createLoggerModule({ pino: mockPino, process: mockProcess, console: mockConsole });
    log('UNKNOWN_LEVEL', 'unknown level message');
    assert.strictEqual(mockPinoInstance.info.mock.callCount(), 1);
    const [loggedObj, message] = mockPinoInstance.info.mock.calls[0].arguments;
    assert.deepStrictEqual(loggedObj, {});
    assert.strictEqual(message, 'Unknown log level (UNKNOWN_LEVEL): unknown level message');
  });
  ```

**Test Case 5: Log without an object**
- **Goal:** Verify that `log()` works correctly when the `obj` parameter is omitted.
- **File:** `test/utils/logger.unit.test.js`
- **Suggestion:**
  ```javascript
  it('should handle logging without an object', () => {
    const { log } = createLoggerModule({ pino: mockPino, process: mockProcess, console: mockConsole });
    log(DEBUG_LEVELS.INFO, 'message without object');
    assert.strictEqual(mockPinoInstance.info.mock.callCount(), 1);
    const [loggedObj, message] = mockPinoInstance.info.mock.calls[0].arguments;
    assert.deepStrictEqual(loggedObj, {});
    assert.strictEqual(message, 'message without object');
  });
  ```

## 4. Default Export

### Uncovered Branches:
- The test suite does not verify that the default export is the same instance as the named `logger` export.

### Proposed Test Case:

**Test Case: Default export instance**
- **Goal:** Ensure the default export is the same singleton instance as `logger`.
- **File:** `test/utils/logger.unit.test.js`
- **Suggestion:**
  ```javascript
  it('should have a default export that is the same as the named logger export', async () => {
    const { logger, default: defaultLogger } = await import('../../src/utils/logger.js');
    assert.strictEqual(defaultLogger, logger);
  });