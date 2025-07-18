---
trigger: always_on
description: General rules for node:test
---

Core Principle: Isolate with Native Mocks

The primary goal is to isolate the module-under-test (SUT) by controlling its external dependencies. This **MUST** be achieved using the built-in `node:test` runner and its `mock` API. This eliminates external test runners and third-party mocking libraries, ensuring consistency and leveraging modern Node.js features.

The key to mocking ES Modules is to **patch a dependency *before* the SUT is loaded**, which is accomplished by using a **dynamic `import()`** for the SUT after the mock has been applied.

## 2. Rules of Engagement

### 2.1. Module Imports

1.  **Test Runner:** All test files **MUST** import the necessary components from `'node:test'`.
    ```javascript
    import { describe, it, test, beforeEach, afterEach, mock } from 'node:test';
    ```
2.  **Assertions:** All assertions **MUST** use the strict assertion library from `'node:assert/strict'`.
    ```javascript
    import assert from 'node:assert/strict';
    ```
3.  **Import Dependencies to Mock:** Statically import the **entire namespace** of any module containing functions you intend to mock. This provides a live binding to the module's exports, which is essential for the `mock` API to work.
    ```javascript
    // CORRECT: Import the entire module namespace
    import * as dependencyModule from "../../../src/utils/dependency.js";
    
    // INCORRECT: Do not destructure functions you intend to mock
    // import { functionToMock } from "../../../src/utils/dependency.js"; // <-- AVOID
    ```

### 2.2. Mocking Patterns

There are two approved patterns for mocking. The **auto-restoring context mock** is the preferred best practice. The **global mock** is a fallback for specific scenarios.

#### **Pattern A: Auto-Restoring Context Mock (Preferred Best Practice)**

This pattern uses the test context object (`t`) provided to each `test` or `it` block. Mocks created with `t.mock.method()` are **automatically restored** after the specific test completes, guaranteeing perfect isolation with no manual cleanup required.

**Workflow:**
1.  Statically import the dependency module at the top of your test file.
2.  Within your `test` or `it` block, use `t.mock.method()` to patch the dependency.
3.  Dynamically `import()` the SUT *after* the mock has been applied.

```javascript
// test/my-feature.test.js
import { test } from 'node:test';
import assert from 'node:assert';
// 1. Statically import the dependency.
import * as dependency from '../path/to/dependency.js';

test('should use an auto-restoring mocked dependency', async (t) => {
  // 2. Apply the mock using the test context 't'. This mock is active ONLY for this test.
  const mockFn = t.mock.method(dependency, 'someFunction', () => 'mocked value');

  // 3. Dynamically import the SUT AFTER the mock is applied.
  const { functionUnderTest } = await import('../path/to/module.js');

  // Act & Assert
  const result = functionUnderTest();
  assert.strictEqual(result, 'mocked value');
  assert.strictEqual(mockFn.mock.calls.length, 1);
}); // <-- mockFn is automatically restored here.
```

#### **Pattern B: Global Mock with Manual Cleanup (Fallback)**

This pattern should only be used when a mock needs to be **shared across multiple tests** within a `describe` block (e.g., set up in `beforeEach`). It uses the global `mock` object.

**Workflow:**
1.  Statically import the dependency module.
2.  In a `beforeEach` hook, use the global `mock.method()` to apply the patch.
3.  In an `afterEach` hook, it is **MANDATORY** to call `mock.restoreAll()` to prevent mock state from leaking between tests.
4.  Dynamically `import()` the SUT within each `it` block or in the `beforeEach` hook (after mocks are applied).

```javascript
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import * as dependency from '../path/to/dependency.js';

describe('Suite with shared mocks', () => {
  let functionUnderTest;

  beforeEach(async () => {
    // 2. Apply the mock using the global 'mock' object.
    mock.method(dependency, 'someFunction', () => 'shared mock value');
    
    // 4. Dynamically import SUT after mock is applied.
    const module = await import(`../path/to/module.js?v=${Date.now()}`);
    functionUnderTest = module.functionUnderTest;
  });

  afterEach(() => {
    // 3. MANDATORY: Restore all global mocks.
    mock.restoreAll();
  });

  it('should use the shared mock', () => {
    const result = functionUnderTest();
    assert.strictEqual(result, 'shared mock value');
  });
});
```

### 2.3. Test-Specific Mock Behavior

When using the **Global Mock** pattern, you can override the shared mock for a single test using `.mock.mockImplementationOnce()` on the mock function object.

```javascript
// Assumes a shared mock for 'someFunction' was set in beforeEach
it('should use a one-time override for a specific test', () => {
    // ARRANGE: Override the shared mock for just this test
    const mockFn = mock.method(dependency, 'someFunction', () => 'one-time value');
    // OR if the mock is already stored: mocks.dependency.someFunction.mock.mockImplementationOnce(...)
    
    // ACT & ASSERT
    const result = functionUnderTest();
    assert.strictEqual(result, 'one-time value');
});
```

## 3. Forbidden Libraries

The use of `esmock`, `sinon`, `chai`, `jest`, `proxyquire`, or any other third-party mocking, stubbing, or assertion library is **strictly forbidden** for new code. Existing tests using these libraries are considered technical debt and **MUST be refactored** to use the native `node:test` and `node:assert` APIs upon discovery or when the file is otherwise modified.