# A Developer's Debugging Guide for MuellerEuchre-Windsurf

This guide provides a systematic, in-depth approach to debugging the MuellerEuchre codebase. It is tailored to the project's specific architecture, tools, and common challenges. Adhering to these principles is critical for maintaining code quality and ensuring the stability of the game's logic.

# Quick Initial Steps

1. Analyze entire file for naming conflicts.
2. mocking with mock.method() or direct assignment is causing "Cannot redefine property" TypeErrors due to ES module exports being read-only.
3. List issues that stem from ES modules being read-only.  List appoaches that use a factory pattern with dependency injection.
## 1. The Golden Rules of Debugging in This Repo

These are non-negotiable principles derived from the project's architecture. Violating them will lead to cascading failures and technical debt.

### **Rule #1: Respect the Layer 1 Purity Mandate**

The core game logic, located in `src/game/logic/`, `src/game/phases/`, and most of `src/utils/`, resides in **Layer 1**. This layer has a strict purity mandate.

 **Purity Mandate:** Layer 1 modules must be pure and stateless.

 *   No I/O operations (database, file system, network requests).
 *   No direct mutation of shared state (especially the `gameState` object).
 *   The same input must **always** produce the same output.
 *   No side effects.

When debugging a file in Layer 1, your fix **must also be contained within Layer 1**. You cannot modify a database call or a socket handler (Layer 3/5) to make a Layer 1 test pass. The logic must be corrected within its own layer.

### **Rule #2: Immutability is Law**

Directly modifying the `gameState` object or any other function argument is strictly forbidden in Layer 1. This is the most common source of difficult-to-trace bugs.

**THE WRONG WAY (MUTATION):**
```javascript
// BAD - This modifies the original player object.
function updateScore(player, points) {
  player.score += points; // MUTATION!
  return player;
}
```

**THE CORRECT WAY (IMMUTABILITY):**
```javascript
// GOOD - This returns a new object with the updated score.
function updateScore(player, points) {
  return {
    ...player,
    score: player.score + points
  };
}
```

## 2. Single Sources of Truth (Do Not Modify Lightly)

Certain files in this repository are foundational. Modifying them has wide-ranging, cascading effects. Treat them as the "constitution" of the application and change them only with a full understanding of the impact.

*   `src/config/constants.js`: This file defines the vocabulary of the entire game. Changing a value here without updating all its references will break the application. It is deeply frozen at runtime as per `docs/MandateforImplementingObjectFreeze.md`.
*   `src/utils/cardUtils.js`: This is the **authoritative source for Euchre card rules**. All logic related to card identity, Bowers, ranking, and effective suit is centralized here. If you think a card rule is wrong, this is the place to fix it, but be aware it will affect validation, AI, and trick-winning logic simultaneously.
*   `test/helpers/test-helpers.js`: This is the single source of truth for creating test data. Modifying a helper like `setupTestState` will impact dozens of tests. When debugging a test, assume this file is correct and that the issue lies in the module-under-test or the test's specific arrangement.

## 3. Key Architectural & Gameplay Documents

Before diving into the code, understand the rules of the system. These documents are your primary source of truth.

#### `docs/Layer1_Purity_Rules.md`
*   **When to Reference:** Any time you are working in `src/game/logic/`, `src/game/phases/`, or `src/utils/`. Use this document as a checklist to ensure your function is architecturally compliant. If you're wondering, "Can I log to the console here?" or "Can I modify this `gameState` object directly?", the answer is in this file (and it's "no").

#### `docs/MandateforImplementingObjectFreeze.md`
*   **When to Reference:** When working with constants from `src/config/constants.js`. This document explains why these objects are deeply immutable (`Object.freeze`) and why you must never attempt to change them at runtime. It also strictly forbids using `Object.freeze()` on function arguments like `gameState`.

#### `docs/The Complete Card Ranking Hierarchy.md`
*   **When to Reference:** This is your bible for any bug related to trick-winning logic. If the wrong player wins a trick, or if an AI makes a nonsensical play, consult this document. It explains the three-tiered system of card power (Trump > Led Suit > Off-Suit) and is the conceptual model behind the critical `getCardRank` utility function.

#### `docs/The Left Bowers Identity Shift.md`
*   **When to Reference:** This is a deep dive into the most complex rule in Euchre. Reference this document specifically when debugging "must follow suit" errors. If a player is incorrectly allowed (or forbidden) to play the Jack of the same-colored suit as trump, this document explains the precise conditions and logical flow required to handle it correctly.

#### `docs/The Going Alone Gameplay and Scoring Modifiers.md`
*   **When to Reference:** For any bug related to the "go alone" feature. This document covers the entire feature lifecycle: the initial decision in `goAlonePhase.js`, the state flags required in `gameState`, the turn-skipping logic in `utils/players.js`, and the special 4-point scoring rules in `scoringPhase.js`.

## 4. Your Debugging Toolkit: Scripts & Utilities

This project uses the native **`node:test`** runner and **`node:assert`** library.

### Key Scripts (`package.json`)

| Command | `package.json` script | When to Use It |
| :--- | :--- | :--- |
| `node --test <file_path>` | `npm run test:file -- <file_path>` | **Your primary tool.** Runs a single test file for focused debugging. |
| `node Scripts/run-deck-dependent-tests.js` | `npm run test:decktests` | **CRITICAL for regression.** Runs all tests that depend on card logic (`deck.js`, `cardUtils.js`). **Use this after any change to card ranking, Bowers, or dealing.** |
| `node Scripts/run-coverage-on-file.js <test_file_path>` | `npm run test:coverage:file -- <test_file_path>` | Generates a code coverage report for a single file. Use this to ensure your fix is fully tested and to find uncovered edge cases. |
| `node --test --watch` | `npm run test:watch` | Runs all tests and re-runs them on file changes. Good for general development. |

### Core Test Helpers

The file `test/helpers/test-helpers.js` is the single source of truth for creating test data.

*   **`createBaseGameState(overrides)`**: Creates a foundational, valid game state in the `LOBBY` phase.
*   **`setupTestState(options)`**: The most powerful helper. It programmatically advances the game to a specific phase (`PLAYING`, `DEALER_DISCARD`, etc.) with specific cards, trump, and trick states.
*   **`createCards(cardIdString)`**: Quickly create an array of card objects from a string (e.g., `"AS,KD,9C"`).

**Primary Reference:** `test/Test Helpers and Utilities.md`

## 5. Debugging Order of Operations (Layer 1 Focus)

Use this task list as a systematic guide when tackling bugs, particularly within the critical Layer 1.

### Task List
  - [ ] **Initial Analysis:** Clearly identify the bug and the specific Layer 1 module(s) involved (e.g., `biddingPhase.js`, `cardUtils.js`).
  - [ ] **Reproduce Failure:** Create a single, failing unit test that specifically reproduces the bug. Run *only* this test to confirm it fails as expected.
  - [ ] **Verify Mocks and Imports:** In the test file, verify that all external dependencies are correctly mocked using `node:test`'s `mock` API and that all relative import paths are correct. Fix any path or mock setup issues.
  - [ ] **Implement Minimal Fix:** Apply the smallest possible code change *within the Layer 1 module* to fix the logic and make the new test pass.
  - [ ] **Verify Single Test Pass:** Rerun the specific test file for the bug. Confirm that it now passes 100%.
  - [ ] **Check for Module Regressions:** Rerun *all* tests for the module you changed to ensure your fix did not introduce new bugs within that module.
  - [ ] **Check for Layer Regressions:** Run ALL Layer 1 unit tests one by one, or as a group, until ALL explicitly pass. Use a command like `node --test test/game/logic/**/*.unit.test.js` or `node --test test/game/phases/**/*.unit.test.js`.
  - [ ] **Final Verification:** Run the ENTIRE project test suite to ensure no cascading failures were introduced in higher layers.
  - [ ] **Document Changes:** Add or update JSDoc and/or inline comments to explain any complex or non-obvious logic in your fix.

***Verification is key.*** **ALWAYS run tests after modifying ANY code.**

## 6. MuellerEuchre Specific Precautions

*   **Layer 1 Purity:** When debugging Layer 1 modules (`src/game/logic/`, `src/utils/`), strictly enforce purity. Ensure no direct state mutations or side effects are introduced. If a bug fix requires state management, the logic should be handled by delegating to Layer 2.
*   **Test Directory Structure:** The test directory mirrors the `src` directory. When debugging a module, its corresponding test file and any relevant mocks are in the same relative path under `test/`.
*   **Asynchronous Operations:** For modules involving Socket.IO (`src/socket/`) or database interactions (`src/db/`), pay close attention to asynchronous code, Promises, and potential race conditions.
*   **Configuration and Constants:** Always reference `src/config/constants.js` for game rules, phases, and events. Never use hardcoded "magic strings" or numbers in your code or tests.
*   **Error Handling Strategy:** Layer 1 modules should **throw** specific, custom errors from `src/game/logic/validation-errors.js`. Higher layers are responsible for catching and handling these errors. Your Layer 1 fix should throw the correct error, not try to handle it.

## 7. Tricky Code Examples and Considerations

### Mocking ES Module Dependencies (The "Dynamic Import" Pattern)

This pattern is the most critical concept for testing in this repository. It allows mocking a module's exports *before* the module-under-test imports them.

1.  **Statically import the REAL dependency** you intend to mock.
2.  In your `it` block, use `mock.method()` to patch the function(s) on the real module.
3.  **Dynamically `import()` the module-under-test** *after* the mocks are applied.
4.  Use `afterEach(() => mock.restoreAll());` to ensure test isolation.

```javascript
// test/game/phases/biddingPhase.unit.test.js
import { describe, it, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// 1. Statically import the REAL dependency
import * as validation from '../../../src/game/logic/validation-core.js';

describe('handleOrderUpDecision', () => {
  // 4. Clean up mocks after each test
  afterEach(() => mock.restoreAll());

  it('should process a valid bid', async () => {
    // 2. PATCH the dependency's function for this test
    mock.method(validation, 'validateBid', () => true);

    // 3. DYNAMICALLY import the module being tested
    const { handleOrderUpDecision } = await import('../../../src/game/phases/biddingPhase.js');

    const gameState = /* ... create a valid game state ... */;
    const result = handleOrderUpDecision(gameState, 'PLAYER_SOUTH', true);
    assert.strictEqual(result.gamePhase, 'DEALER_DISCARD');
  });
});
```

### Writing Robust vs. Brittle Error Assertions

Assert against the error's stable properties (`name`, `code`, contextual data) instead of its `message` string, which can change.

**BRITTLE TEST (Avoid):**
```javascript
assert.throws(
  () => validatePlay(gameState, /* ... */),
  { message: /Must follow suit. Led suit is hearts/ }
);
```

**ROBUST TEST (Preferred):**
```javascript
import { MustFollowSuitError } from '@/game/logic/validation-errors.js';

assert.throws(
  () => validatePlay(gameState, /* ... */),
  (err) => {
    assert.strictEqual(err instanceof MustFollowSuitError, true);
    assert.strictEqual(err.code, 'E_MUST_FOLLOW_SUIT'); // Stable machine-readable code
    assert.strictEqual(err.ledSuit, 'hearts'); // Check the contextual data
    return true; // Confirms the error is the one we expected
  }
);
```

## 8. Logic Difficulties in Multiplayer Euchre

Be mindful of these common complexities when debugging:

*   **State Management:** The core challenge is managing the `gameState` accurately across all players in real-time. Bugs often arise from race conditions, incorrect state updates, or discrepancies between server and client states. Always trace the `gameState` object's transformation from one pure function to the next.
*   **Turn Management:** Ensuring the correct player's turn and handling the complex game flow (bidding, playing cards, scoring, dealer rotation) in a 4-player context requires careful logic. The `getNextPlayer` utility in `src/utils/players.js` is central to this flow.
*   **Rule Complexity:** Euchre has specific, context-dependent rules (e.g., Bowers, trump selection, scoring for going alone) that are complex to implement correctly and are prone to bugs. When in doubt, always refer to the official documentation in the `docs/` folder before assuming the code is wrong.