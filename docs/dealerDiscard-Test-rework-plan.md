# Rework Plan for test/server/dealerDiscard.unit.test.js

## 1. Introduction

This document outlines the plan to refactor the unit test file `test/server/dealerDiscard.unit.test.js`. The current test relies on a non-existent `server3.mjs` file and needs to be updated to work with the current codebase structure, specifically by targeting the correct game logic function for dealer discards.

## 2. Analysis of Current Test and Codebase

*   **Current Test (`test/server/dealerDiscard.unit.test.js`):**
    *   Imports `* as server3Module from '../../server3.mjs'`.
    *   Assumes `server3Module` exports `handleDealerDiscard`, manages `gameState`, and provides an `io` object.
    *   Uses a `createServer` helper to wrap `server3Module` and inject a mock `io`.
    *   Asserts outcomes by checking a mutated `gameState` and an `emittedMessages` array for socket events (including errors).
*   **Actual Codebase:**
    *   The server entry point is `src/server.js`, which sets up HTTP and Socket.IO but delegates game logic.
    *   The core logic for dealer discard is found in `src/game/phases/biddingPhase.js`, specifically the function `handleDealerDiscard(currentGameState, dealerRole, cardToDiscardId)`.
    *   This function takes the current game state, dealer's role, and the ID of the card to discard. It returns a *new* updated game state object or throws errors for invalid operations.
    *   Socket event handling (receiving requests, calling core logic, persisting state, emitting updates) is managed in `src/socket/handlers/biddingHandlers.js`, which imports and uses `handleDealerDiscard` from `biddingPhase.js`.

## 3. Proposed Refactoring Strategy

The goal is to make `test/server/dealerDiscard.unit.test.js` a focused unit test for the `handleDealerDiscard` function in `src/game/phases/biddingPhase.js`.

### 3.1. Target Function

*   The test will directly import and test:
    `import { handleDealerDiscard } from '../../src/game/phases/biddingPhase.js';`

### 3.2. Key Changes to the Test File

*   **Imports:**
    *   Remove `import * as server3Module from '../../server3.mjs';`.
    *   Remove `import { DEBUG_LEVELS } from server3Module;`.
    *   Add the direct import for `handleDealerDiscard` as shown above.
*   **Test Setup (`beforeEach`):**
    *   Remove the `createServer` function.
    *   Remove `server` object instantiation.
    *   Remove `ioMock` and the `emittedMessages` array. The target function does not emit socket events directly. Error conditions will be tested by catching thrown exceptions.
    *   The `gameState` object will continue to be initialized and used as the primary input for `handleDealerDiscard`.
*   **Function Invocation:**
    *   Calls like `server.handleDealerDiscard('south', cardObject)` will be changed to `handleDealerDiscard(gameState, 'south', cardObject.id)`. The third argument must be the card ID (string).
*   **Assertion Logic:**
    *   **Successful Discard:** Instead of checking a mutated global `gameState`, tests will check the properties of the *new game state object returned* by `handleDealerDiscard`.
    *   **Error Handling:** Instead of checking `emittedMessages` for `action_error`, tests will use `assert.throws()` to verify that `handleDealerDiscard` (or the validation functions it calls) throws the expected types of errors (e.g., `CardNotInHandError`, `InvalidPhaseError`, `NotPlayersTurnError`, `InvalidDiscardError`).
*   **Specific Test Case Adaptations:**
    *   **Invalid Phase/Player:** Test that appropriate errors are thrown.
    *   **Invalid Hand Size (Not 6 cards for dealer before discard):** Test that `validateDealerDiscard` (called by `handleDealerDiscard`) leads to an appropriate error being thrown. The original test logic for this ("dealer must have exactly 6 cards") refers to the state *before* the dealer picks up the turn card and *before* they discard. The `handleDealerDiscard` function in `biddingPhase.js` is called *after* the dealer has effectively picked up the turn card (implicitly, as `turnCard` is part of `currentGameState` and added to hand). The validation `validateDealerDiscard` checks if the hand (which includes the `turnCard`) has 6 cards before discarding. This aligns with the standard Euchre rule where the dealer's hand temporarily becomes 6 cards.
    *   **Card Not in Hand:** Test that `CardNotInHandError` is thrown.
    *   **Successful Discard Logic:**
        *   Verify the returned `gameState.players[dealerRole].hand` has 5 cards, contains the `turnCard`, and does not contain the `discardedCardId`.
        *   Verify `gameState.gamePhase` is `GOING_ALONE_DECISION`.
        *   Verify `gameState.currentPlayer` is updated to the player who made trump.
        *   Verify `gameState.turnCard` is `null` in the new state.
        *   The concept of a `kitty` being explicitly updated with the discarded card is not present in the `biddingPhase.js` version of `handleDealerDiscard`. The card is simply removed from the hand. The test assertions related to `gameState.kitty` will be removed or re-evaluated if there's a different mechanism.

### 3.3. Helper Utilities

*   The custom `DEBUG` logging utility and its calls (`DEBUG.log`, `DEBUG.error`) within the test file will be removed to simplify the test and remove dependency on non-existent modules. Standard `console.log` can be used for temporary debugging if needed during the rework.

## 4. Potential Challenges

*   Ensuring the mock `gameState` objects in each test accurately reflect all necessary properties required by `handleDealerDiscard` and `validateDealerDiscard`.
*   Mapping the error types or messages from the old test's `action_error` events to the specific error types/messages thrown by the new target function and its validators.

## 5. Outcome

The refactored `test/server/dealerDiscard.unit.test.js` will be a robust unit test for the core dealer discard logic, independent of server implementation details, socket communications, or database interactions. This improves test isolation and maintainability.
