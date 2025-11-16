# Project Architectural Mandate: The Layered Methodology

This document outlines the non-negotiable architectural blueprint and implementation strategy for the Euchre Multiplayer project. All development, without exception, MUST adhere strictly to these principles.

---

## Core Architectural Mandate: The 5 Layers

The project follows a strict layered architecture to ensure modularity, maintainability, and testability.

- **Layer 1: Core Logic & Utilities**
  - **Responsibility:** Pure, stateless functions. No side effects, I/O, or state mutation.
  - **Includes:** Game rules (`src/game/logic/validation-core.js`), state-transition functions (`src/game/phases/*.js`), card mechanics (`src/utils/cardUtils.js`), player utilities (`src/utils/players.js`), core constants (`src/config/constants.js`), and other utilities.
    - **Note:** While this layer is overwhelmingly pure, `src/game/phases/lobbyPhase.js` contains some stateful logic for game setup and is a known exception.
  - **Constraints:**
    - **Purity:** All functions in this layer MUST be pure. Their output depends solely on their inputs, and they produce NO side effects.
    - **Statelessness:** MUST NOT hold or mutate any mutable state (e.g., global `gameState` variables, direct database references, or network connections).
    - **No I/O:** MUST NOT perform any Input/Output operations (e.g., database calls, file system access, network requests).
    - **Error Throwing:** Functions encountering invalid conditions or rules violations MUST throw specific, descriptive errors (defined in `src/game/logic/errors.js`). They DO NOT catch or handle these errors; they propagate them upwards.

- **Layer 2: State Management**
  - **Responsibility:** The single source of truth for `gameState`. All state updates must be atomic and immutable.
  - **Includes:** The central game state object (`src/game/state.js`), state update functions, and state factories.

- **Layer 3: Network API (Socket Handlers)**
  - **Responsibility:** A thin communication layer for input validation and action dispatching. No complex game logic.
  - **Includes:** Socket.IO initialization and all specific socket event handlers (`src/socket/handlers/`).

- **Layer 4: Client Services/UI**
  - **Responsibility:** Consumes server state and interacts with the network layer.
  - **Includes:** React/Preact components, client-side hooks, client-side services, and static client-side JavaScript files.

- **Layer 5: Persistence**
  - **Responsibility:** Handles saving to and retrieving from a database.
  - **Includes:** The database repository (`src/db/gameRepository.js`).

---

### Detailed Implementation Strategy for Layer 1

Each priority related to Layer 1 development MUST strictly adhere to the Core Architectural Mandate outlined above.

**1. Enforce Robust Error Handling (Throwing)**

- **Layer 1 Role:** Functions in this layer are the source of specific errors when game rules or logic invariants are violated.
- **Implementation:** All validation functions (e.g., `src/game/logic/validation.js`) and phase logic functions (e.g., `src/game/phases/*.js`) MUST throw instances of custom error classes defined in `src/game/logic/errors.js` (e.g., `InvalidPhaseError`, `NotPlayersTurnError`, `InvalidBidError`, `PhaseLogicError`). These functions are not responsible for logging the error beyond basic debug messages; logging is handled by higher layers.

**2. Develop Unit Tests for Core Logic (Playing Phase)**

- **Layer 1 Tests (`test/game/logic/validation.unit.test.js`, `test/game/phases/playingPhase.unit.test.js`):**
  - **Goal:** Achieve high confidence in the card-playing mechanics (`validatePlay`, `determineTrickWinner`, `handlePlayCard`).
  - **Implementation:**
    - Write comprehensive unit tests that target the pure logic functions in `src/game/logic/validation.js` and `src/game/phases/playingPhase.js` in strict isolation.
    - Provide mocked inputs (e.g., mock `gameState` objects, mock player hands) and assert the precise return values or the specific errors thrown.
    - Ensure that mocking of internal dependencies (e.g., `src/utils/deck.js`, `src/utils/players.js` for `playingPhase.js`) is done using `node:test`, NEVER esmock NEVER sinon NEVER chai NEVER jest.

**3. Develop Unit Tests for Core Logic (Scoring Phase)**

- **Layer 1 Tests (`test/game/phases/scoringPhase.unit.test.js`):**
  - **Goal:** Verify all scoring outcomes are calculated correctly (`calculateAndApplyScore`).
  - **Implementation:**
    - Write unit tests for the pure score calculation functions within `src/game/phases/scoringPhase.js`.
    - Provide a completed hand state (with `tricksTaken`, `makerTeam`, `goingAlone` etc.) and assert that the correct point values are returned for all scenarios (march, euchre, etc.).
    - Verify the correct game phase transition (e.g., to `GAME_OVER` or `DEALING`) and state resets (e.g., `tricksTaken` reset to zero) are correctly reflected in the _new_ state returned by the function.

**4. Develop Unit Tests for Core Logic ('Go Alone' Decision Phase)**

- **Layer 1 Tests (`test/game/phases/goAlonePhase.unit.test.js`):**
  - **Goal:** Ensure the "go alone" mechanic works as intended (`handleGoAloneDecision`).
  - **Implementation:**
    - Target the pure `handleGoAloneDecision` function in `src/game/phases/goAlonePhase.js`.
    - Provide a game state where a trump maker has been determined, and then simulate the "go alone" decision (`true` or `false`).
    - Assert that the returned `gameState` correctly updates (e.g., `partnerSittingOut` is set, `goingAlone` flag is accurate, `currentPlayer` is adjusted) and that the game correctly transitions to the `PLAYING` phase.
    - Ensure tests cover all validation (player turn, correct phase, trump maker identity) leading to specific error throws.

**5. Stabilize the Test Suite by Resolving Intermittent Failures**

- **Process for Layer 1 Tests:** For any Layer 1 unit tests experiencing intermittent failures, the cause MUST be a race condition or asynchronous issue _within the test environment or its mocks_, as Layer 1 functions themselves are pure and deterministic.
- **Action:** Isolate the flaky test and debug the test setup itself (e.g., `node:test` usage, mock state, any cleanup). If a fix is not immediate, disable the test and add a detailed `// TODO:` comment explaining the problem, ensuring the main test suite remains stable for development on individual layers.

---

### Foundational Rules (Applies to All Layers)

- **Immutability First:** Never mutate shared state directly. All functions in Layer 1 MUST produce a new state object if a state change is required.
- **Test-Driven Development:** Write unit tests for all new Layer 1 logic using **node:test**. Tests MUST be self-contained and explicitly import all helpers.
- **ESM Only:** All code MUST use ES Modules (`import`/`export`). No CommonJS (`require`/`module.exports`).
- **Robust Error Handling:** Use the project's `src/utils/logger.js` for internal debugging logs. Errors for invalid actions MUST be _thrown_ as specific `src/game/logic/errors.js` instances, not handled internally.

---

### Banned Anti-Patterns (Applies to All Layers)

- Direct mutation of any `gameState` object passed as an argument or accessed via global scope.
- Any form of I/O (database calls, file system, network requests) within Layer 1.
- Any logic related to `socket.io` or `express` outside of Layer 3.
- Duplicated game logic; always refactor into shared utilities.
- Synchronous operations that block the Node.js event loop.
- Monkey-patching or modifying native/global objects.
- Importing any modules explicitly marked as "client-side" or belonging to Layer 4 into server-side layers (1, 2, 3, 5).

---

### Appendix: Examples of Layer Principle Violations

The following are concrete examples of anti-patterns and their correct, layered-compliant fixes.

#### 1. Introducing Side Effects (Violates Layer 1 Purity)
   - **Violation:**
     ```js
     // Incorrect: This function mutates the game state, which is a side effect.
     function updatePlayerScore(player, score) {
       player.score += score; // Direct state mutation
     }
     ```
   - **Fix:**
     ```js
     // Correct: Return a new player object with the updated score.
     function updatePlayerScore(player, score) {
       return { ...player, score: player.score + score };
     }
     ```

#### 2. Including Complex Game Logic (Violates Layer Separation)
   - **Violation:**
     ```js
     // Incorrect: This Layer 3 handler contains complex game flow logic.
     socket.on('START_GAME', (players) => {
       const state = initializeGame(players);
       const state2 = dealCards(state);
       const state3 = startBidding(state2);
       io.emit('update', state3);
     });
     ```
   - **Fix:**
     ```js
     // Correct: The handler calls a single Layer 2/1 function.
     socket.on('START_GAME', (players) => {
       const newState = handleStartGame(initialState, players); // Logic is in Layer 1
       io.emit('update', newState);
     });
     ```

#### 3. Duplicating Logic
   - **Violation:**
     ```js
     // Incorrect: Duplicated logic for determining the winner of a trick.
     function determineTrickWinner(trickPlays, trumpSuit) {
       // ... 15 lines of complex ranking logic ...
     }

     function determineBestCardForAI(hand, trumpSuit) {
       // ... Same 15 lines of complex ranking logic ...
     }
     ```
   - **Fix:**
     ```js
     // Correct: Refactor to a single utility function in Layer 1.
     function getCardRank(card, trumpSuit, leadSuit) {
        // ... 15 lines of complex ranking logic ...
     }
     ```

#### 4. Using Synchronous I/O
   - **Violation:**
     ```js
     // Incorrect: Synchronous I/O operation blocks the event loop.
     function loadGameRules() {
       const rules = fs.readFileSync("game-rules.json", "utf-8");
       return JSON.parse(rules);
     }
     ```
   - **Fix:**
     ```js
     // Correct: Use asynchronous I/O, and place it in the correct layer (e.g., server startup).
     async function loadGameRules() {
       const rules = await fs.promises.readFile("game-rules.json", "utf-8");
       return JSON.parse(rules);
     }
     ```

