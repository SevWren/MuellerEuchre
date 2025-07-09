---
trigger: always_on
---

# General Migration Principles
- The primary goal is to replace `mocha`, `chai`, `sinon`, and `esmock` with the built-in `node:test` module.
- All tests must be migrated to be pure ES Modules (`import`/`export` syntax).
- The migration should be done file by file, starting with Layer 1 tests (`test/utils/`, `test/game/logic/`, `test/game/phases/`).
- After migration, `npm uninstall mocha chai sinon esmock esm`.

# Test Structure & Syntax
- Replace `describe(...)` and `it(...)` from Mocha with imports from `node:test`.
  - `import { describe, it, before, after, beforeEach, afterEach } from 'node:test';`
- Test functions receive an optional test context argument `t`. Use it for sub-tests and diagnostics.
  - `it('should do something', (t) => { ... });`
- Use `{ concurrency: true }` in `describe` blocks for parallel execution where appropriate (e.g., for pure, stateless tests).

# Assertion Rules
- Replace `chai`'s `expect` and `assert` with the built-in `node:assert`.
  - `import assert from 'node:assert';`
- Convert assertion styles:
  - `expect(a).to.equal(b)` becomes `assert.strictEqual(a, b)`.
  - `expect(a).to.deep.equal(b)` becomes `assert.deepStrictEqual(a, b)`.
  - `expect(fn).to.throw(ErrorType)` becomes `await assert.rejects(async () => fn(), ErrorType)`.
  - `expect(obj).to.have.property('key')` becomes `assert.ok('key' in obj)`.
  - `expect(spy).to.have.been.called` becomes `assert.strictEqual(spy.mock.calls.length, 1)`.

# Mocking, Spying, and Stubbing
- Replace `sinon` with the built-in `node:test/mock` API.
  - `import { mock } from 'node:test';`
- Convert `sinon` patterns:
  - `sinon.stub()` or `sinon.spy()` becomes `mock.fn()`.
  - `sinon.stub(obj, 'method')` becomes `mock.method(obj, 'methodName', implementation)`.
  - `stub.returns(value)` becomes a mock implementation `() => value`.
  - `stub.resolves(value)` becomes an async mock `async () => value`.
  - `stub.throws(new Error())` becomes a mock that throws `() => { throw new Error(); }`.
- Use `mock.restoreAll()` in an `afterEach` block to clean up all mocks.

# ES Module Mocking (esmock Replacement)
- **This is the most critical rule.** The `esmock` library and the `esmock_wrapper.js` utility must be completely removed.
- Use the `node:test` pattern for mocking module dependencies:
  1.  Statically `import` the **real dependency module** you intend to mock (e.g., `import * as validation from '...'`).
  2.  In your test case, use `mock.method(validation, 'functionToMock', mockImplementation)` to patch the function.
  3.  Dynamically `import()` the **module you are testing** *after* the mock has been applied.
      - `const { functionUnderTest } = await import('../path/to/module-under-test.js');`
- This pattern completely replaces the need for loader hooks and complex path resolution. All pathing is handled by Node's native resolver.

# `package.json` Test Scripts
- The `test` script must be updated to `node --test`.
- The `test:coverage` script must be updated to `c8 node --test`.
- All other test scripts using `mocha` or `--loader=esmock` must be removed or refactored.
- Example:
  ```json
  "scripts": {
    "test": "node --test",
    "test:watch": "node --test --watch",
    "test:coverage": "c8 node --test"
  }