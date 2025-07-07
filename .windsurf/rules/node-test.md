---
trigger: always_on
---

### **Node.js Native Testing (`node:test`) and Mocking**

# Node.js Native Testing (`node:test`) and Mocking

-   **Primary Tooling**: Utilize the built-in `node:test` runner and its `mock` API for all unit and integration tests. This eliminates external test runners like Mocha and third-party mocking libraries.

-   **Auto-Restoring Mocks (Best Practice)**: The primary pattern for mocking is to use the test context object (`t`). `t.mock.method(module, 'methodName', implementation)` is the preferred approach as it **automatically restores the original method** after the test completes, ensuring perfect test isolation.

    ```javascript
    import { test } from 'node:test';
    import assert from 'node:assert';
    import * as dependency from '../path/to/dependency.js';
    import { functionUnderTest } from '../path/to/module.js';

    test('should use a mocked dependency', (t) => {
      // This mock is ONLY active for this specific test case.
      const mockFn = t.mock.method(dependency, 'someFunction', () => 'mocked value');

      const result = functionUnderTest();

      assert.strictEqual(result, 'mocked value');
      assert.strictEqual(mockFn.mock.calls.length, 1);
    });
    ```

-   **Manual Mock Cleanup (Fallback)**: If a mock needs to be shared across multiple tests within a `describe` block (e.g., set up in `beforeEach`), use the global `mock` API. In this case, it is **mandatory** to clean up the mock in an `afterEach` block using `mock.restore()` to prevent mock state from leaking between tests.

    ```javascript
    import { describe, it, before, afterEach, mock } from 'node:test';
    // ...

    describe('Suite with shared mocks', () => {
      afterEach(() => {
        // MUST restore all global mocks after each test.
        mock.restore();
      });

      it('should use a mock set up globally for this suite', (t) => {
        const globalMock = mock.method(dependency, 'someFunction', () => 'global mock');
        // ...
      });
    });
    ```

-   **Assertion Library**: All assertions **must** use the native `node:assert` module. The use of `chai`, `expect`, esmock, sinon, chai or other third-party assertion libraries is forbidden.

-   **Forbidden Libraries**: The use of `esmock`, `proxyquire`, or other third-party mocking/stubbing libraries is deprecated for new tests. Existing tests using these libraries are considered technical debt and **must be refactored** to use the native `node:test/mock` API upon discovery or when the file is otherwise modified.