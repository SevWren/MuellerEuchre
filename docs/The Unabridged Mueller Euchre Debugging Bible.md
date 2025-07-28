### The Unabridged Mueller Euchre Debugging Bible

This document is the authoritative guide for every developer on this team. It is not a list of suggestions; it is a playbook of established, battle-hardened procedures. The "why" behind these rules is written in the long hours and frustrating failures documented across our `plan.md` files. Follow them precisely.

### Playbook 1: Mastering Mocking & Test Isolation in ES Modules

**The Core Commandment: Thou Shalt Not Attempt to Mutate Imports.**

ES Modules have read-only, live bindings. Any attempt to overwrite an imported function will result in a `TypeError: Cannot redefine property`. This is not a bug; it is a feature of the language. Our solution is **always** Dependency Injection.

#### **Case Study 1: The `biddingPhase.js` `validateBid` Nightmare**

This was the source of countless failures documented in `ced1d6a2-1d26-40d2-9484-dde7130a8ba6/plan.md`.

**The Anti-Pattern (FORBIDDEN CODE):**

This pattern will crash the test runner. It is fundamentally incompatible with our architecture.

```javascript
// AVOID THIS AT ALL COSTS - from a failing test for biddingPhase.unit.test.js
import { test } from 'node:test';
import * as validation from '../../../src/game/logic/validation.js'; // The module itself
import { handleOrderUpDecision } from '../../../src/game/phases/biddingPhase.js';

test('A guaranteed failure trying to mock a direct import', (t) => {
  // THIS LINE THROWS A TypeError. IT IS THE ORIGINAL SIN OF ESM TESTING.
  t.mock.method(validation, 'validateBid', () => ({ isValid: true }));

  // The test never reaches this point.
  handleOrderUpDecision(createBaseGameState(), createBaseGameState().players[0]);
});
```

**The Canonical Solution: Refactor for Injection**

**Step 1: Expunge the Direct Import from Source Code.**
Go into `src/game/phases/biddingPhase.js` and sever its hard dependency on `validation.js`.

*   **BEFORE (The source of our pain):**
    ```javascript
    // src/game/phases/biddingPhase.js
    import { validateBid } from '../logic/validation.js'; // <-- THE HARD-CODED DEPENDENCY
    import { GAME_PHASES } from '../../config/constants.js';
    import { InvalidBidError, PhaseLogicError } from '../../utils/errors.js';

    export function handleOrderUpDecision(gameState, player) {
      const { isValid, message } = validateBid(gameState, player, 'orderUp'); // Untestable direct call
      if (!isValid) {
        throw new InvalidBidError(message);
      }
      // ...
    }
    ```

*   **AFTER (The testable, correct version):**
    ```javascript
    // src/game/phases/biddingPhase.js
    // NOTICE: The import of `validateBid` is GONE.
    import { GAME_PHASES } from '../../config/constants.js';
    import { InvalidBidError, PhaseLogicError } from '../../utils/errors.js';

    export function handleOrderUpDecision(gameState, player) {
      // The dependency is now supplied via the `this` context at runtime.
      const { isValid, message } = this.validateBid(gameState, player, 'orderUp');
      if (!isValid) {
        throw new InvalidBidError(message);
      }
      // ...
    }
    ```

**Step 2: Inject the Mock During the Test.**
In `test/game/phases/biddingPhase.unit.test.js`, we now have full control. We construct a temporary object (`mockServices`) to hold our mocks and inject it using `Function.prototype.call`.

```javascript
// test/game/phases/biddingPhase.unit.test.js (THE GOLD STANDARD)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleOrderUpDecision } from '../../../src/game/phases/biddingPhase.js';
import { createBaseGameState } from '../../helpers/test-helpers.js';

test('should call injected validateBid and proceed if valid', (t) => {
  const gameState = createBaseGameState();
  const player = gameState.players[0];

  // 1. Create a "service provider" object for this test's context.
  const mockServices = {
    validateBid: t.mock.fn(
      () => ({ isValid: true, message: '' }), // Our mock returns a valid result
      { times: 1 } // We can even assert it's called exactly once here.
    ),
  };

  // 2. Execute the function, using `.call()` to set `this` to our `mockServices`.
  const nextState = handleOrderUpDecision.call(mockServices, gameState, player);

  // 3. Assert the outcome.
  assert.strictEqual(nextState.phase, 'DEALER_DISCARD');
  
  // 4. Verify the mock's interactions. This is the whole point of the pattern.
  const call = mockServices.validateBid.mock.calls[0];
  assert.deepStrictEqual(call.arguments[0], gameState, 'gameState was not passed correctly to validateBid');
  assert.deepStrictEqual(call.arguments[1], player, 'player was not passed correctly to validateBid');
  assert.strictEqual(call.arguments[2], 'orderUp', 'bidType was not passed correctly to validateBid');
});
```

### Playbook 2: Exterminating Data Shape and State Bugs

These bugs manifest as `TypeError: Cannot read properties of undefined` or assertions that mysteriously fail. The cause is always a deviation between the data your test provides and the data the implementation expects.

#### **Case Study 1: The `aiLogic.js` `rank` vs. `value` Disaster**

This issue, from `9ff1d4e7-f242-4262-8203-03c53c8ecae0/plan.md`, cost hours of debugging time.

*   **The Flawed Implementation Code in `src/game/logic/aiLogic.js`:**
    ```javascript
    // src/game/logic/aiLogic.js -> _evaluateHand()
    function _evaluateHand(hand, trumpSuit) {
      let score = 0;
      for (const card of hand) {
        // THIS LINE IS THE LANDMINE. If `card.value` is undefined, it becomes `score += undefined`, resulting in `NaN`.
        score += card.value;
        if (isTrump(card, trumpSuit)) {
          score += 10; // Bonus for trump
        }
      }
      return score;
    }
    ```
*   **The Broken Test (`test/game/logic/aiLogic.unit.test.js`):** The test was constructing card objects that were missing the critical `value` property.
    ```javascript
    // test/game/logic/aiLogic.unit.test.js (BROKEN)
    // Manually creating objects is a recipe for this kind of error.
    const defectiveHand = [
      { suit: 'Spades', rank: 'A' }, // NO `value` PROPERTY!
      { suit: 'Hearts', rank: 'K' }, // NO `value` PROPERTY!
    ];

    const handStrength = _evaluateHand(defectiveHand, 'Diamonds');
    assert.strictEqual(handStrength, 27); // This will fail. `handStrength` will be NaN.
    ```
*   **The Fix: Use Canonical Test Helpers and Be Explicit.**
    Our `test/helpers/test-helpers.js` file is not optional. Use `createCard` to ensure every card object is correctly formed.

    ```javascript
    // test/game/logic/aiLogic.unit.test.js (CORRECT)
    import { createCard } from '../../helpers/test-helpers.js';

    const correctHand = [
      // createCard ensures all properties (`name`, `suit`, `rank`, `value`) are present.
      createCard({ suit: 'Spades', rank: 'A', value: 14 }),
      createCard({ suit: 'Hearts', rank: 'K', value: 13 }),
    ];

    const handStrength = _evaluateHand(correctHand, 'Diamonds');
    assert.strictEqual(handStrength, 27, 'Hand strength should be the sum of values');
    ```

#### **Case Study 2: The `scoringPhase.js` Inconsistent State Properties**

The plan `239d478b-2f69-495d-82dc-d3f73a3a9218/plan.md` details a painful process of discovering that test scenarios were using different property names than the implementation.

*   **The Implementation (`src/game/phases/scoringPhase.js`):** It clearly expects `makerTeam` and `tricksByTeam`.
    ```javascript
    // src/game/phases/scoringPhase.js
    export function scoreHand(gameState) {
      const { makerTeam, tricksByTeam } = gameState; // Destructuring these specific properties
      const makerTricks = tricksByTeam[makerTeam];
      // ...
    }
    ```
*   **The Broken Test Data (`test/game/phases/scoringPhase.unit.test.js`):**
    ```javascript
    // test/game/phases/scoringPhase.unit.test.js (BROKEN SCENARIO)
    const scenarios = [
      {
        description: 'Makers get 3 tricks, not a loner',
        maker: 'team1', // <-- WRONG NAME! Should be `makerTeam`
        tricksNS: 3, // <-- WRONG NAME! Should be nested in `tricksByTeam`
        tricksEW: 2,
        expectedScoreNS: 1,
        expectedScoreEW: 0,
      },
    ];
    ```
*   **The Fix: Standardize Test Data Structures.**
    Make all test data structures perfectly mirror the real `gameState` object.

    ```javascript
    // test/game/phases/scoringPhase.unit.test.js (CORRECT SCENARIO)
    const scenarios = [
      {
        description: 'Makers get 3 tricks, not a loner',
        makerTeam: 'team1', // <-- CORRECT!
        tricksByTeam: { // <-- CORRECT!
          team1: 3,
          team2: 2,
        },
        expectedScores: {
          team1: 1,
          team2: 0,
        },
      },
    ];
    ```

### Playbook 4: Slaying Tooling, Environment, and Platform Demons

These are the most frustrating bugs because they often feel disconnected from your code.

#### **Case Study 1: The Windows `ERR_UNSUPPORTED_ESM_URL_SCHEME` Error**

This bug, noted in `eaac71d2-f63e-499f-96e9-97c06dcff0aa/plan.md`, plagues dynamic imports on Windows if not handled correctly.

*   **The Problem:** You need to dynamically import a module in a test to control when its code executes.
*   **The Broken Code:**
    ```javascript
    // This will fail on Windows systems
    import path from 'node:path';
    const modulePath = path.resolve(__dirname, '..', 'src', 'utils', 'logger.js');
    const { logger } = await import(modulePath); // Throws ERR_UNSUPPORTED_ESM_URL_SCHEME
    ```
*   **The Universal Fix:** Use `pathToFileURL` from the `node:url` module to create a compliant file URL that works on all operating systems.

    ```javascript
    import { pathToFileURL } from 'node:url';
    import path from 'node:path';
    import { test } from 'node:test';

    test('should dynamically import a module correctly', async (t) => {
      const modulePath = path.resolve(process.cwd(), 'src', 'utils', 'logger.js');
      const moduleUrl = pathToFileURL(modulePath).href;

      // This works everywhere.
      const { logger } = await import(moduleUrl); 

      assert.ok(logger, 'Logger should be imported');
    });
    ```

#### **Case Study 2: The `process.env` Module Caching Trap**

The logger tests in `eaac71d2` and `961ad467` repeatedly failed when trying to test different `LOG_LEVEL` environment variables.

*   **The Code Being Tested (`src/utils/logger.js`):** The logger's level is determined **once** when the module is first loaded into memory.
    ```javascript
    // src/utils/logger.js
    import pino from 'pino';

    // THIS CODE RUNS ONLY ONCE PER PROCESS, WHEN THE MODULE IS FIRST IMPORTED.
    const logLevel = process.env.LOG_LEVEL || 'info'; 

    const logger = pino({ level: logLevel });

    export default logger;
    ```
*   **The Flawed Test Strategy:**
    ```javascript
    test('setting LOG_LEVEL to debug should work', (t) => {
      process.env.LOG_LEVEL = 'debug';
      // THIS RE-IMPORT DOES NOTHING! Node returns the already-cached module.
      const { logger } = await import('./logger.js'); 
      assert.strictEqual(logger.level, 'debug'); // Will fail if logger was already imported with 'info'
    });
    ```
*   **The Solution: Control the Environment *Before* Import.**
    If you must test environment variables, you must either run tests in separate child processes (which is slow and complex) or, more practically, refactor the code to be less reliant on initial state. If that's not possible, structure your test file so that the environment is set *before* the very first import. For the logger, we refactored it to be initializable.

    *   **Refactored `logger.js` (conceptual):**
        ```javascript
        let logger;
        export function initializeLogger(level) {
          logger = pino({ level: level || 'info' });
        }
        export function getLogger() {
          if (!logger) initializeLogger();
          return logger;
        }
        ```
    *   **Test for Refactored Code:**
        ```javascript
        test('can initialize logger with a specific level', (t) => {
          const { initializeLogger, getLogger } = await import('./logger.js');
          initializeLogger('debug');
          const logger = getLogger();
          assert.strictEqual(logger.level, 'debug');
        });
        ```

This level of detail is the standard. Use this bible. Add to it when new, painful lessons are learned. Do not deviate.