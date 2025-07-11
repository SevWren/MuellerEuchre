---
trigger: always_on
---

### refactor esmock chai mocha sino Ruleset

# General Migration Principles
- The primary goal is to replace legacy test runners and libraries (`mocha`, `chai`, `sinon`, `esmock`, `jest`) with the built-in `node:test` module and its ecosystem.
- All tests must be migrated to be pure ES Modules (`import`/`export` syntax).

# Example of proper usage.
- Analyze `test/game/phases/goAlonePhase.edge.unit.test.js` in painstaking detail for examples of correct node:test usage and example of what refactoring looks like post removing `mocha`, `chai`, `sinon`, `esmock`, `jest`

# Test Structure & Syntax
- Replace `describe(...)` and `it(...)` from Mocha/Jest with imports from `node:test`.
  - `import { describe, it, before, after, beforeEach, afterEach } from 'node:test';`
- Test functions receive an optional test context argument `t`. Use it for sub-tests and diagnostics.
  - `it('should do something', (t) => { ... });`
- Use `{ concurrency: true }` in `describe` blocks for parallel execution where appropriate (e.g., for pure, stateless tests).

# Assertion Rules
- Replace `chai`'s `expect`/`assert` and `jest`'s `expect` with the built-in `node:assert`.
  - `import assert from 'node:assert';`
- Convert assertion styles:
  - `expect(a).to.equal(b)` or `expect(a).toBe(b)` becomes `assert.strictEqual(a, b)`.
  - `expect(a).to.deep.equal(b)` or `expect(a).toEqual(b)` becomes `assert.deepStrictEqual(a, b)`.
  - `expect(fn).to.throw(ErrorType)` or `expect(fn).toThrow(ErrorType)` becomes `await assert.rejects(async () => fn(), ErrorType)`.
  - `expect(obj).to.have.property('key')` or `expect(obj).toHaveProperty('key')` becomes `assert.ok('key' in obj)`.
  - `expect(spy).to.have.been.called` or `expect(spy).toHaveBeenCalled()` becomes `assert.strictEqual(spy.mock.calls.length >= 1, true)`.
  - `expect(spy).toHaveBeenCalledTimes(n)` becomes `assert.strictEqual(spy.mock.calls.length, n)`.

# Mocking, Spying, and Stubbing (Functions & Methods)
- Replace `sinon` and `jest.fn`/`jest.spyOn` with the built-in `node:test/mock` API.
  - `import { mock } from 'node:test';`
- Convert common patterns:
  - `sinon.stub()`, `sinon.spy()`, or `jest.fn()` becomes `mock.fn()`.
  - `sinon.stub(obj, 'method')` or `jest.spyOn(obj, 'method')` becomes `mock.method(obj, 'methodName', implementation)`.
  - `stub.returns(value)` or `mockFn.mockReturnValue(value)` becomes a mock implementation `() => value`.
  - `stub.resolves(value)` or `mockFn.mockResolvedValue(value)` becomes an async mock `async () => value`.
  - `stub.throws(new Error())` or `mockFn.mockImplementation(() => { throw new Error() })` becomes `() => { throw new Error(); }`.
- Use `mock.restoreAll()` in an `afterEach` block to clean up all mocks and spies. This is the replacement for `sinon.restore()` and is essential for test isolation.

# ES Module Dependency Mocking (The "Dynamic Import" Pattern)
- **This is the most critical rule for replacing `esmock` and `jest.unstable_mockModule`.**
- This pattern allows mocking a module's exports before the module-under-test imports them, without requiring loaders or complex configurations.

### The `node:test` Pattern:
1.  **Statically import the real dependency** you intend to mock. This gives you a live binding to its exports.
    ```javascript
    import * as dependencyToMock from '../../../src/utils/deck.js';
    ```
2.  **In your test case (`it` block), patch the dependency's functions** using `mock.method()`.
    ```javascript
    mock.method(dependencyToMock, 'isLeftBower', () => true); // Mock implementation
    mock.method(dependencyToMock, 'areSameColor', () => false);
    ```
3.  **Dynamically `import()` the module you are testing** *after* the mocks have been applied. This ensures it receives the mocked versions of its dependencies.
    ```javascript
    const { functionUnderTest } = await import('../path/to/module-under-test.js');
    ```
4.  **Clean up mocks** using `mock.restoreAll()` in an `afterEach` hook.

### Example: Replacing `jest.unstable_mockModule`

**BEFORE (Jest):**
```javascript
// test.js
import { describe, it, afterEach, jest } from '@jest/globals';

describe('my feature', () => {
  afterEach(() => {
    jest.resetModules(); // Clears module cache for isolation
  });

  it('should behave correctly with mocked dependencies', async () => {
    jest.unstable_mockModule('../src/utils/deck.js', () => ({
      isLeftBower: jest.fn().mockReturnValue(true),
    }));

    const { functionUnderTest } = await import('../src/my-feature.js');
    // ... assertions
  });
});
```

**AFTER (node:test):**
```javascript
// test.js
import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert';
import * as deckUtils from '../src/utils/deck.js'; // 1. Static import

describe('my feature', () => {
  afterEach(() => {
    mock.restoreAll(); // Replaces jest.resetModules() and cleans mocks
  });

  it('should behave correctly with mocked dependencies', async () => {
    // 2. Patch the real module's exports
    const isLeftBowerMock = mock.method(deckUtils, 'isLeftBower', () => true);

    // 3. Dynamically import the SUT
    const { functionUnderTest } = await import('../src/my-feature.js');

    // ... run test and assert
    const result = functionUnderTest(/* ... */);
    assert.strictEqual(result, 'expected value');
    assert.strictEqual(isLeftBowerMock.mock.calls.length, 1);
  });
});
```