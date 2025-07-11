---
trigger: always_on
---

# Refactoring Guide: Migrating to `node:test`

This guide provides a systematic process for converting test files from libraries like `esmock`, `chai`, `sinon`, and `jest` to use Node.js's native test runner. The goal is to create lean, fast, and dependency-free tests that align with the best practices demonstrated in `goAlonePhase.unit.test.js` and `goAlonePhase.edge.unit.test.js`.

## Core Concepts of `node:test`

-   **Test Runner:** The `node:test` module provides the test runner itself, including functions like `describe`, `it`, `test`, and lifecycle hooks like `beforeEach`.
-   **Assertion Library:** The `node:assert/strict` module provides strict equality checking and a comprehensive set of assertion tools.
-   **Mocking Engine:** The `test.mock` object, available from `node:test`, is a powerful, built-in tool for creating mocks, stubs, and spies, replacing the need for `sinon` or `esmock`.

---

## Step-by-Step Refactoring Process

Follow these steps to convert a legacy test file.

### 1. Update Imports and Test Structure

The first step is to replace the old library imports with the new `node:` modules.

**➡️ Action: Replace `require`/`import` statements for `chai`, `sinon`, `mocha`, `jest`, or `esmock` with `node:test` and `node:assert/strict`.**

#### Example Conversion:

**Before (Chai/Sinon/Mocha):**
```javascript
const { expect } = require('chai');
const sinon = require('sinon');
const { describe, it, beforeEach } = require('mocha');
```

**After (`node:test`):**
```javascript
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
```
*Note: `describe` and `it` function identically to their Mocha counterparts, providing a seamless transition for test structure.*

### 2. Convert Assertions (from `chai`/`jest` to `node:assert`)

Next, convert all `expect()` style assertions to the `assert.*` methods from `node:assert/strict`. Using the `/strict` variant is crucial as it uses `===` for comparisons, preventing common bugs.

**➡️ Action: Find all `expect()` calls and replace them with the corresponding `assert` method.**

#### Common Assertion Conversions ALWAYS USE NODE: NEVER CHAI NEVER JEST:

| Chai / Jest `expect` (`expect(value)...`)          | `node:assert/strict` (`assert...`)                               | Notes                                                              |
| -------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ |
| `.to.equal(expected)`                              | `.strictEqual(value, expected)`                                  | Checks for strict `===` equality.                                  |
| `.to.deep.equal(expected)`                         | `.deepStrictEqual(value, expected)`                              | For deep equality in objects and arrays.                           |
| `.to.be.true` / `.to.be.false`                     | `.strictEqual(value, true)` / `.strictEqual(value, false)`       | Be explicit about boolean values.                                  |
| `.to.be.null` / `.to.be.undefined`                 | `.strictEqual(value, null)` / `.strictEqual(value, undefined)`   | Checks for `null` or `undefined`.                                  |
| `.to.throw(Error, /message/)`                      | `.throws(() => { ... }, { name: 'Error', message: /message/ })`  | The function to test must be wrapped in an arrow function.         |
| `.to.include('substring')` / `.to.match(/regex/)`  | `.match(value, /substring\|regex/)`                              | Checks if a string matches a regular expression.                   |
| `.to.be.an('array')`                               | `(Array.isArray(value), 'Should be an array')`                    | `assert(expression, message)` is great for simple truthiness.      |
| `.to.have.lengthOf(num)`                           | `.strictEqual(value.length, num)`                                | Direct property assertion.                                         |

### 3. Refactor Mocks (from `esmock`/`sinon` to `test.mock`)

This is the most critical part of the refactoring. The `node:test` mocking engine is powerful but has one golden rule.

> **The Golden Rule of `node:test` Mocking:** You **MUST** define your mocks using `mock.method()` *before* you `import` the module that contains the code you are testing. This allows the test runner to intercept the module loader.

**➡️ Action: Replace all `esmock` and `sinon` stubs/spies with `test.mock` methods, ensuring the correct import order.**

#### Example: Replacing `esmock`

**Before (`esmock`):**
```javascript
import { test } from 'node:test';
import esmock from 'esmock';

test('should use mocked partner logic', async () => {
  const { handleGoAloneDecision } = await esmock(
    '../../../src/game/phases/goAlonePhase.js', 
    {
      '../../../src/utils/players.js': {
        getPartner: () => 'PLAYER_NORTH' // Mock implementation
      }
    }
  );
  // ... test logic ...
});
```

**After (`node:test`):**
```javascript
import { test, mock } from 'node:test';
import assert from 'node:assert/strict';

test('should use mocked partner logic', async () => {
  // 1. Mock the dependency's method FIRST.
  const playersUtil = await import('../../../src/utils/players.js');
  mock.method(playersUtil, 'getPartner', () => 'PLAYER_NORTH');

  // 2. NOW import the module under test.
  const { handleGoAloneDecision } = await import(
    '../../../src/game/phases/goAlonePhase.js'
  );

  // ... test logic ...
  // The imported handleGoAloneDecision will now use the mocked getPartner.
});
```

#### Example: Replacing `sinon` Spies and Stubs

Use `mock.fn()` to create spies or simple stubs. Use `mock.method()` to replace a specific function on an imported module.

**➡️ Action: Replace `sinon.spy()` and `sinon.stub()` with `mock.fn()` or `mock.method()` and update assertion syntax.**

#### Common Mocking Conversions:

| Sinon                               | `node:test` `mock`                                | Notes                                                        |
| ----------------------------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| `sinon.spy()`                       | `mock.fn()`                                       | Creates a standalone spy function.                           |
| `sinon.stub().returns(val)`         | `mock.fn(() => val)`                              | Creates a function that returns a specific value.            |
| `spy.callCount`                     | `spy.mock.callCount()`                            | Gets the number of times the mock was called.                |
| `spy.getCall(0).args`               | `spy.mock.calls[0].arguments`                     | Accesses the arguments of a specific call.                   |
| `spy.calledWith(...args)`           | `assert.deepStrictEqual(spy.mock.calls[0].arguments, [...args])` | Manually assert the arguments of a call.                   |
| `stub.resetHistory()`               | `spy.mock.reset()`                                | Resets call history, but not the implementation.             |
| `sinon.restore()`                   | *(Automatic)*                                     | `node:test` auto-restores mocks after each test. `mock.reset()` resets call counts in a `beforeEach` hook. |

### 4. Update Lifecycle Hooks (`beforeEach`)

The `beforeEach` hook is perfect for ensuring mocks are in a clean state before every test.

**➡️ Action: Use `beforeEach` to call `mock.reset()`, which clears the call history of all mocks.**

**Example:**
```javascript
import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

describe('My Module', () => {
  // This runs before each 'it' or 'test' block in this describe suite.
  beforeEach(() => {
    mock.reset(); // Clears call counts and history for all mocks.
  });

  it('should do something', () => {
    // ...
  });
});
```