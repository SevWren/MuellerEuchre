## Euchre Multiplayer Development - Project Architectural Mandate for Layer 1

This document outlines the non-negotiable architectural blueprint and implementation strategy for **Layer 1: Pure Core & Game Logic** of the Euchre Multiplayer project. All development, without exception, MUST adhere strictly to these principles.

---

### Core Architectural Mandate: The Layered Methodology (Focus on Layer 1)

The project follows a strict layered architecture to ensure modularity, maintainability, and testability.

*   **Layer 1: Pure Core & Game Logic**
    *   **Responsibility:** Contains all pure, stateless game rules and business logic. This includes:
        *   **Game Rules:** Functions determining valid plays, trick winners, scoring calculations, trump determination, etc. (e.g., `src/game/logic/validation.js`, `src/utils/deck.js`, `src/game/logic/aiLogic.js`).
        *   **Pure State-Transition Functions:** Functions within `src/game/phases/` (e.g., `biddingPhase.js`, `playingPhase.js`, `scoringPhase.js`, `goAlonePhase.js`, `startNewHandPhase.js`, `lobbyPhase.js`, `endGame.js`) that take the current game state as an input, apply logic, and return a *new, updated* game state object. They **do not** directly modify the input state or any global state.
        *   **Core Utilities:** Foundational helpers like `src/utils/players.js` (turn progression, team logic), `src/utils/errorUtils.js`, `src/utils/historyUtils.js`, `src/utils/idGenerator.js`, `src/utils/i18n.js`, `src/utils/settingsUtils.js`, `src/utils/statsUtils.js`.
    *   **Constraints:**
        *   **Purity:** All functions in this layer MUST be pure. Their output depends solely on their inputs, and they produce NO side effects.
        *   **Statelessness:** MUST NOT hold or mutate any mutable state (e.g., global `gameState` variables, direct database references, or network connections).
        *   **No I/O:** MUST NOT perform any Input/Output operations (e.g., database calls, file system access, network requests).
        *   **Error Throwing:** Functions encountering invalid conditions or rules violations MUST throw specific, descriptive errors (defined in `src/game/logic/errors.js`). They DO NOT catch or handle these errors; they propagate them upwards.

---

### Detailed Implementation Strategy for Layer 1

Each priority related to Layer 1 development MUST strictly adhere to the Core Architectural Mandate outlined above.

**1. Enforce Robust Error Handling (Throwing)**
*   **Layer 1 Role:** Functions in this layer are the source of specific errors when game rules or logic invariants are violated.
*   **Implementation:** All validation functions (e.g., `src/game/logic/validation.js`) and phase logic functions (e.g., `src/game/phases/*.js`) MUST throw instances of custom error classes defined in `src/game/logic/errors.js` (e.g., `InvalidPhaseError`, `NotPlayersTurnError`, `InvalidBidError`, `PhaseLogicError`). These functions are not responsible for logging the error beyond basic debug messages; logging is handled by higher layers.

**2. Develop Unit Tests for Core Logic (Playing Phase)**
*   **Layer 1 Tests (`test/game/logic/validation.unit.test.js`, `test/game/phases/playingPhase.unit.test.js`):**
    *   **Goal:** Achieve high confidence in the card-playing mechanics (`validatePlay`, `determineTrickWinner`, `handlePlayCard`).
    *   **Implementation:**
        *   Write comprehensive unit tests that target the pure logic functions in `src/game/logic/validation.js` and `src/game/phases/playingPhase.js` in strict isolation.
        *   Provide mocked inputs (e.g., mock `gameState` objects, mock player hands) and assert the precise return values or the specific errors thrown.
        *   Ensure that mocking of internal dependencies (e.g., `src/utils/deck.js`, `src/utils/players.js` for `playingPhase.js`) is done using `esmock` as per the project's testing conventions (`test/utils/esmock_wrapper.js`).

**3. Develop Unit Tests for Core Logic (Scoring Phase)**
*   **Layer 1 Tests (`test/game/phases/scoringPhase.unit.test.js`):**
    *   **Goal:** Verify all scoring outcomes are calculated correctly (`calculateAndApplyScore`).
    *   **Implementation:**
        *   Write unit tests for the pure score calculation functions within `src/game/phases/scoringPhase.js`.
        *   Provide a completed hand state (with `tricksTaken`, `makerTeam`, `goingAlone` etc.) and assert that the correct point values are returned for all scenarios (march, euchre, etc.).
        *   Verify the correct game phase transition (e.g., to `GAME_OVER` or `DEALING`) and state resets (e.g., `tricksTaken` reset to zero) are correctly reflected in the *new* state returned by the function.

**4. Develop Unit Tests for Core Logic ('Go Alone' Decision Phase)**
*   **Layer 1 Tests (`test/game/phases/goAlonePhase.unit.test.js`):**
    *   **Goal:** Ensure the "go alone" mechanic works as intended (`handleGoAloneDecision`).
    *   **Implementation:**
        *   Target the pure `handleGoAloneDecision` function in `src/game/phases/goAlonePhase.js`.
        *   Provide a game state where a trump maker has been determined, and then simulate the "go alone" decision (`true` or `false`).
        *   Assert that the returned `gameState` correctly updates (e.g., `partnerSittingOut` is set, `goingAlone` flag is accurate, `currentPlayer` is adjusted) and that the game correctly transitions to the `PLAYING` phase.
        *   Ensure tests cover all validation (player turn, correct phase, trump maker identity) leading to specific error throws.

**5. Stabilize the Test Suite by Resolving Intermittent Failures**
*   **Process for Layer 1 Tests:** For any Layer 1 unit tests experiencing intermittent failures, the cause MUST be a race condition or asynchronous issue *within the test environment or its mocks*, as Layer 1 functions themselves are pure and deterministic.
*   **Action:** Isolate the flaky test and debug the test setup itself (e.g., `esmock` usage, mock state, `beforeEach`/`afterEach` cleanup). If a fix is not immediate, disable the test with `it.skip()` and add a detailed `// TODO:` comment explaining the problem, ensuring the main test suite remains stable for development on individual layers.

---

### Foundational Rules (Applies to Layer 1 Code)

*   **Immutability First:** Never mutate shared state directly. All functions in Layer 1 MUST produce a new state object if a state change is required.
*   **Test-Driven Development:** Write unit tests for all new Layer 1 logic using **Mocha/Chai**. Tests MUST be self-contained and explicitly import all helpers. `test/utils/esmock_wrapper.js` (using `esmock`) is the mandated tool for mocking dependencies.
*   **ESM Only:** All Layer 1 code MUST use ES Modules (`import`/`export`). No CommonJS (`require`/`module.exports`).
*   **Robust Error Handling:** Use the project's `src/utils/logger.js` for internal debugging logs within Layer 1. Errors for invalid actions MUST be *thrown* as specific `src/game/logic/errors.js` instances, not handled internally.

---

### Banned Anti-Patterns (Applies to Layer 1 Code)

*   Direct mutation of any `gameState` object passed as an argument or accessed via global scope.
*   Any form of I/O (database calls, file system, network requests).
*   Any logic related to `socket.io` or `express`.
*   Duplicated game logic; always refactor into shared utilities.
*   Synchronous operations that block the Node.js event loop.
*   Monkey-patching or modifying native/global objects.
*   Importing any modules explicitly marked as "client-side" or belonging to Layer 4.