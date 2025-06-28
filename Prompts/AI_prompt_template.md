## Euchre Multiplayer Rewrite - Project Implementation Plan & Architectural Mandate

### Core Architectural Mandate: The Layered Methodology

This is the non-negotiable architectural blueprint for the project. All work, without exception, MUST adhere to these principles of separation of concerns. Every task must be understood and implemented through the lens of its impact on one or more of these layers.

*   **Layer 1: Pure Core & Game Logic**
    *   **Responsibility:** Contains all pure, stateless game rules and business logic (e.g., determining a valid play, calculating a trick winner, validating a bid).
    *   **Constraints:** MUST NOT contain any state management, I/O, or network code. Functions in this layer receive data, process it, and return a result. They are fully deterministic.

*   **Layer 2: State Management**
    *   **Responsibility:** The single source of truth for the entire `gameState`. Manages atomic and immutable updates to the game state.
    *   **Responsibility:** When `gameState` reaches 500+ lines, `gameState` may be split over multiple numbered `gameState` files. If so, then ensure all instances of `gameState` are read.
    *   **Constraints:** All state changes MUST flow through this layer. No other layer is permitted to mutate the `gameState` object directly.

*   **Layer 3: Network & Socket Handlers**
    *   **Responsibility:** A thin communication layer. Listens for events from clients, validates incoming data, and calls functions in the lower layers (e.g., state management or phase logic) to execute actions. Broadcasts updated state back to clients.
    *   **Constraints:** MUST NOT contain any complex game logic. Its job is to orchestrate, not to think.

*   **Layer 4: Phase & Application Logic**
    *   **Responsibility:** Manages the game's state machine, transitioning between phases (e.g., from `BIDDING` to `PLAYING`). Uses functions from Layer 1 (Core Logic) to make decisions and functions from Layer 2 (State) to apply updates.
    *   **Constraints:** Acts as the "controller" logic that connects the other layers.

*   **Layer 5: Persistence**
    *   **Responsibility:** Handles saving the game state to and retrieving it from a database.
    *   **Constraints:** Interacts only with the State Management and Network layers at defined checkpoints (e.g., after a hand, on player disconnect).

---

### Next Sprint Priorities

1.  **Enforce Robust Error Handling Across All Layers.**
2.  **Develop Unit Tests for the Playing Phase.**
3.  **Develop Unit Tests for the Scoring Phase.**
4.  **Develop Unit Tests for the 'Go Alone' Decision Phase.**
5.  **Stabilize the Test Suite by Resolving Intermittent Failures.**

---

### Detailed Implementation Strategy

Each priority must be implemented according to the Core Architectural Mandate.

**1. Enforce Robust Error Handling Across All Layers**
*   **Goal:** Make the server resilient and prevent crashes.
*   **Architectural Implementation:**
    *   **Layer 3 (Network Handlers):** Wrap all calls to lower layers in `try/catch` blocks. Validate all incoming client data *before* processing. On any error (validation failure or thrown exception from a lower layer), log the error server-side and emit a structured error message to the specific client.
    *   **Layers 1 & 4 (Core/Phase Logic):** Functions in these layers MUST throw specific, descriptive errors when an invalid action is attempted (e.g., playing out of turn, bidding illegally). They should not handle the error themselves; they report it upwards to the Network Layer.

**2. Develop Unit Tests for the Playing Phase**
*   **Goal:** Achieve high confidence in the card-playing mechanics.
*   **Architectural Implementation:**
    *   **Layer 1 Tests:** Write unit tests that target the pure logic functions in isolation. Provide mock inputs and assert the return values for functions like `isValidPlay` and `determineTrickWinner`.
    *   **Layer 4 Tests:** Write tests for the phase-management logic. Simulate a `PLAYING` phase, call the `handlePlayCard` function, and assert that the correct state transitions and updates occur.

**3. Develop Unit Tests for the Scoring Phase**
*   **Goal:** Verify all scoring outcomes are calculated correctly.
*   **Architectural Implementation:**
    *   **Layer 1 Tests:** Write unit tests for any pure score calculation functions. Provide a completed hand state and assert that the correct point values are returned for all scenarios (euchre, march, etc.).
    *   **Layer 4 Tests:** Write tests for the `SCORING` phase logic. Assert that it correctly calls the Layer 1 scoring functions and applies the results to the game state via the Layer 2 State Manager, before correctly transitioning to the next game phase (`GAME_OVER` or `DEALING`).

**4. Develop Unit Tests for the 'Go Alone' Decision Phase**
*   **Goal:** Ensure the "go alone" mechanic works as intended.
*   **Architectural Implementation:**
    *   **Layer 4 Tests:** Target the `GOING_ALONE_DECISION` phase logic. Provide a game state where a maker has just been determined, then simulate the "go alone" decision. Assert that the `gameState` is correctly updated (e.g., a partner is marked as sitting out) and that the game transitions to the `PLAYING` phase.

**5. Stabilize the Test Suite by Resolving Intermittent Failures**
*   **Goal:** Create a reliable and trustworthy automated testing process.
*   **Architectural Implementation:**
    *   This is a process task. Identify any tests, particularly integration tests that cross multiple layers (like reconnection), that fail inconsistently. Isolate the race condition or asynchronous issue. If a fix is not immediate, disable the test with `it.skip()` and add a detailed `// TODO:` comment explaining the problem, ensuring the main test suite remains stable for development on individual layers.

---

### Completed Tasks
*(This section remains, serving as a historical log of what has been accomplished)*
    *   Use `async/await` for all asynchronous operations (e.g., database interactions from `gameRepository.js`, some file system operations if any were still needed, waiting for promises).
    *   Ensure promises are properly handled (awaited or returned explicitly).
*   **Babel Usage (Server-Side Application Code):**
    *   Babel dependencies exist in `package.json`, but configuration files were archived. For new server-side application code, **avoid using Babel unless absolutely necessary** for a critical, modern syntax feature not supported by the project's target Node.js version (assume current LTS). If you deem Babel necessary, you **must explicitly document its use and the reasoning** in your commit messages or code comments. Prefer native ES Module syntax.
*   **Testing & Test Environment:**
    *   **Test-Driven Development (TDD):** Write tests *before* or *concurrently with* implementation, especially for Layer 1 (Core Logic) and Layer 2 (State Management). Ensure all new code is covered by meaningful unit tests. Integration tests should verify interactions between layers.
    *   **Test Environment Status:** The project is transitioning its test environment.
        *   **Current State Awareness:** Be aware that some existing `package.json` test scripts still use the `esm` loader. The long-term goal is a simplified Mocha setup relying on native Node.js ESM. `proxyquire` is a listed devDependency but **must NOT be used** for new tests due to ESM incompatibility; prefer `esmock` for new mocking needs.
        *   **Your Path to Efficiency & Correctness:**
            1.  **New Code is King:** All *new* tests and *new* application code you write **must** be fully ESM compatible (using `import/export`) and adhere to best practices.
            2.  **Local Script Adjustment:** If the `esm` loader in an existing `package.json` script directly prevents you from running your new, clean ESM tests successfully, you are authorized to modify that *specific npm script for your current task* by removing the explicit `--loader=esm`. Document this adjustment when you report task completion.
            3.  **No Broad Refactoring (Yet):** Do *not* undertake a full-scale refactoring of the entire test environment or all `package.json` scripts *unless* it is explicitly assigned as a separate task from `todo.md`. Your focus is on delivering the features/fixes in `todo.md` using best practices for your *new* contributions.
    *   **No Rule Bypassing:** Test logic must not bypass game rules.
    *   **Test Setup:** Avoid global namespace pollution. Import test utilities (Chai, Sinon) directly into test files.

---

### 3. The `todo.md` Sprint Backlog

The `todo.md` file is our sprint backlog. It is a prioritized list of concrete tasks derived directly from the layered plan in `Thursday-Jules.txt`.

*   **Structure:** Highest priority uncompleted tasks are at the top. Completed tasks, marked with `[x]`, are at the bottom and include a brief summary of the implementation.
*   **Your Role:** You will consume tasks from the top of this file and add new tasks to it as you complete your work.

---

### 4. Your Task for This Session

Your task is to execute a development sprint by following these steps precisely.

**1. Implement Tasks:**
    *   Implement the top **5** highest-priority uncompleted tasks from the provided `todo.md` file.
    *   **Task Interpretation Guidance:**
        *   **Conceptual UI Tasks:** When a `todo.md` task is marked '(Conceptual)' and involves UI elements (e.g., 'UI: Visual Polish...'), your primary output should be a description of the visual changes and user experience. You may define or modify data structures or client-side service method signatures if necessary to support these concepts. **Do not generate actual UI rendering code (e.g., React JSX, HTML/CSS) for conceptual tasks.** Focus on clear descriptions that a human UI developer can implement.
        *   **'Unit Tests for X Phase' Tasks:** When a `todo.md` task is specifically 'Unit Tests for X Phase' (or similar wording indicating only test creation), your responsibility is to write comprehensive unit tests for the *pre-existing, rewritten* application logic found in the specified modules (e.g., `src/game/phases/XPhase.js` and any relevant socket handlers). **You should not modify or re-implement the application logic of these modules themselves** unless the task explicitly states to do so or to perform a refactor. Your focus is test creation and coverage for the existing code.

**2. Comprehensive Testing:**
    *   For each task, provide the **implementation** (as applicable per above guidance) and a **comprehensive test suite**.
    *   **Unit Tests:** Write tests to verify individual functions and methods in isolation. Adhere to a Test-Driven Development (TDD) approach, especially for Layer 1 and 2 tasks (and for new logic in Layer 3).
    *   **Integration Tests:** Where a task involves integrating modules (e.g., a state manager using a utility, or a socket handler using phase logic), write tests to ensure they work together correctly.
    *   **End-to-End (E2E) Tests:** E2E tests are not expected in the early layers. Note if a task will require E2E testing later.

**3. Update `todo.md` with Progress:**
    *   Produce the updated `todo.md` file.
    *   Move the 5 tasks you just completed to the bottom of the file.
    *   Mark them as complete (e.g., `[ ]` -> `[x]`).
    *   Below each completed task, add a concise, one-line summary of the implementation (e.g., `> Implemented asynchronous file and console transports for the logger.`)

**4. Plan the Next Sprint:**
    *   Consult the layered plan in `Thursday-Jules.txt`.
    *   Identify the next **5** logical tasks that should be worked on.
    *   Add these new tasks as uncompleted (`[ ]`) items to the top of the `todo.md` list, ensuring they are correctly prioritized.

**5. Final Output:**
    *   Your final response should include all the new/modified code files and the single, fully updated `todo.md` file.
