---
trigger: always_on
description: Apply these rules when writing new or refactoring existing unit tests in the codebase. They ensure all tests are consistent, reliable, and maintainable by standardizing mocking, test isolation, and path handling for the Node.js test runner.
---

# Excellent Unit Test

Core Principle: Isolate with Native Mocks

The primary goal is to isolate the module-under-test (SUT) by controlling its external dependencies. This **MUST** be achieved using the built-in `node:test` runner and its `mock` API, available in Node.js v20+. This approach eliminates external test runners (Jest, Mocha) and third-party mocking libraries (Sinon, esmock), ensuring consistency and leveraging modern Node.js features.

The key to mocking ES Modules is to **patch a dependency *before* the SUT is loaded**. This is accomplished by using a **dynamic `import()`** for the SUT after the mock has been applied.

## 1. Setup and Imports

### 1.1. Test Runner and Assertions

1.  **Test Runner:** All test files **MUST** import the necessary components from `'node:test'`.
    ```javascript
    import { describe, it, test, beforeEach, afterEach, mock } from 'node:test';
    ```
2.  **Assertions:** All assertions **MUST** use the strict assertion library from `'node:assert/strict'`.
    ```javascript
    import assert from 'node:assert/strict';
    ```

### 1.2. Importing Dependencies to Mock

You **MUST** statically import the **entire namespace** of any module containing functions you intend to mock. This provides a live binding to the module's exports, which is essential for the `mock` API to patch the correct object.

```javascript
// CORRECT: Import the entire module namespace.
// This gives us a reference to the module object itself.
import * as dependency from "../../../src/utils/dependency.js";

// INCORRECT: Do not destructure functions you intend to mock.
// This creates a static copy of the function, which cannot be patched.
// import { functionToMock } from "../../../src/utils/dependency.js"; // <-- AVOID THIS
```

## 2. Mocking Patterns

There are two approved patterns for mocking. The "Global Mock" is the most common pattern for test suites, while the "Test-Scoped Mock" is excellent for single tests.

### Pattern A: Global Mocks with `beforeEach`/`afterEach` (Common Pattern)

This is the standard pattern for test suites defined with `describe`. Mocks are applied in a `beforeEach` hook and cleaned up in an `afterEach` hook, ensuring isolation between tests within the suite.

**Workflow:**
1.  Statically import the dependency module's namespace at the top of the file.
2.  In a `beforeEach` hook, use the global `mock.method()` to patch the dependency.
3.  In the same `beforeEach` hook, dynamically `import()` the SUT *after* the mock is applied. Store the imported module in a suite-level variable.
4.  In an `afterEach` hook, it is **MANDATORY** to call `mock.restoreAll()` to prevent mock state from leaking to other test files.

**Example:**

Let's assume we want to test `players.js`, which depends on `logger.js`.

*Dependency: `src/utils/logger.js`*
```javascript
export const logger = {
  warn: (message) => console.warn(message)
};
```

*SUT: `src/utils/players.js`*
```javascript
import { logger } from './logger.js';

export function getPartner(playerRole) {
  if (!playerRole) {
    logger.warn('Invalid player role provided');
    return undefined;
  }
  // ... implementation ...
}
```

*Test: `test/utils/players.test.js`*
```javascript
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// 1. Statically import the dependency's namespace.
import * as loggerModule from '../../src/utils/logger.js';

describe('Player Utilities with Global Mocks', () => {
  let playersUtils;
  let loggerWarnMock;

  beforeEach(async () => {
    // 2. Patch the dependency's method using the global `mock` object.
    // This mock will be active for every test in this suite.
    loggerWarnMock = mock.method(loggerModule.logger, 'warn', () => {
      // This is a "spy" that does nothing but record that it was called.
    });

    // 3. Dynamically import the SUT AFTER the mock is applied.
    playersUtils = await import('../../src/utils/players.js');
  });

  afterEach(() => {
    // 4. MANDATORY: Restore all global mocks.
    mock.restoreAll();
  });

  it('should call logger.warn for an invalid player role', () => {
    // Act
    const result = playersUtils.getPartner(null);

    // Assert
    assert.strictEqual(result, undefined);
    assert.strictEqual(loggerWarnMock.mock.calls.length, 1, 'logger.warn should have been called once');
  });
});
```

### Pattern B: Test-Scoped Mocks with `test()` Context (For Single Tests)

This pattern uses the test context object (`t`) provided to each `test` or `it` block. Mocks created with `t.mock.method()` are **automatically restored** after that specific test completes, guaranteeing perfect isolation with no manual cleanup required. It is ideal for tests that are not part of a larger `describe` suite or for one-off mocks.

**Workflow:**
1.  Statically import the dependency module's namespace.
2.  Within your `test` or `it` block, use `t.mock.method()` to patch the dependency.
3.  Dynamically `import()` the SUT *after* the mock has been applied.

**Example:**

*Dependency: `src/utils/api.js`*
```javascript
export function getExternalValue() {
  return 'real value from API';
}
```

*SUT: `src/sut.js`*
```javascript
import { getExternalValue } from './utils/api.js';

export function processApiValue() {
  const value = getExternalValue();
  return `Processed: ${value}`;
}
```

*Test: `test/sut.test.js`*
```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

// 1. Statically import the dependency's namespace.
import * as api from '../src/utils/api.js';

test('should process a mocked value using a test-scoped mock', async (t) => {
  // 2. Apply the mock using the test context 't'.
  // This mock is active ONLY for this test.
  const mockGetValue = t.mock.method(api, 'getExternalValue', () => 'mocked value');

  // 3. Dynamically import the SUT AFTER the mock is applied.
  const { processApiValue } = await import('../src/sut.js');

  // Act & Assert
  const result = processApiValue();
  assert.strictEqual(result, 'Processed: mocked value');
  assert.strictEqual(mockGetValue.mock.calls.length, 1);
}); // <-- mockGetValue is automatically restored here.

test('should process the real value, proving the mock was restored', async (t) => {
  // The mock from the previous test is gone. Importing the SUT here will
  // get the original, un-mocked dependency.
  const { processApiValue } = await import('../src/sut.js');

  const result = processApiValue();
  assert.strictEqual(result, 'Processed: real value from API');
});
```

## 3. Overriding Mocks for a Single Test

When using the **Global Mock** pattern (Pattern A), you can easily override the shared mock for a single test case using `.mock.mockImplementationOnce()`. This is useful for testing a specific edge case without affecting other tests in the suite.

```javascript
// Continuing the example from Pattern A...
describe('Player Utilities with Global Mocks', () => {
  let playersUtils;
  let loggerWarnMock;

  beforeEach(async () => {
    // This shared mock is a simple spy for most tests.
    loggerWarnMock = mock.method(loggerModule.logger, 'warn', () => {});
    playersUtils = await import('../../src/utils/players.js');
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should use the standard shared mock', () => {
    playersUtils.getPartner(null);
    assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
  });

  it('should use a one-time implementation for a specific test case', () => {
    // ARRANGE: Override the mock's behavior for this test only.
    let specialMessage = '';
    loggerWarnMock.mock.mockImplementationOnce((msg) => {
      specialMessage = `SPECIAL LOG: ${msg}`;
    });

    // ACT
    playersUtils.getPartner(null);

    // ASSERT
    // The one-time implementation was called instead of the spy.
    assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
    assert.match(specialMessage, /SPECIAL LOG: Invalid player role/);
  });

  it('should have reverted to the original shared mock', () => {
    // The .mockImplementationOnce() is gone, and the mock has reverted
    // to the spy implementation defined in the beforeEach hook.
    playersUtils.getPartner(null);
    assert.strictEqual(loggerWarnMock.mock.calls.length, 1);
  });
});
```

## 4. Forbidden Libraries

The use of `esmock`, `sinon`, `chai`, `jest`, `proxyquire`, or any other third-party mocking, stubbing, or assertion library is **strictly forbidden** for new code. Existing tests using these libraries are considered technical debt and **MUST be refactored** to use the native `node:test` and `node:assert/strict` APIs upon discovery or when the file is otherwise modified.