### **Project Development Plan: MuellerEuchre-Windsurf**

This plan outlines the necessary phases to take the project from its current state (with a mostly complete Layer 1) to a stable, fully playable, and deployable four-player online Euchre game.

---

### **Phase 2: Test Suite Stabilization & Layer 1 Completion**

**Goal:** Achieve 100% passing unit tests for the core game logic (Layer 1). This is the highest priority, as a stable foundation is required before building higher-level features. This phase directly addresses the tasks outlined in the project's planning documents.

**Key Tasks:**

1.  **Systemic `esmock` Refactoring:**
    *   **Action:** Systematically audit all test files under `test/` as outlined in `docs/esmock_fix_and_prevention_plan_checklist.md`.
    *   **Implementation:** Replace all outdated `esmock` pathing patterns with the standardized `esmockWithPaths` or `createMockedModule` utility from `test/utils/esmock_wrapper.js`. This ensures cross-platform compatibility and adherence to the project's defined testing conventions.
    *   **Verification:** After refactoring each test file, run it individually to confirm it still passes (e.g., `npx mocha test/utils/players.unit.test.js`).

2.  **Full Layer 1 Test Execution:**
    *   **Action:** Run the complete test suite for Layer 1 to identify any remaining failures or regressions.
    *   **Implementation:** Execute the specific test script from `package.json`: `npm run test:coverage_layer1`.
    *   **Verification:** Analyze the output and fix any failing tests. This may involve correcting test logic or fixing bugs in the corresponding `src/` files that were exposed by the improved test setup.

3.  **Final Verification & Documentation:**
    *   **Action:** Run the entire project test suite to ensure no regressions were introduced in other layers.
    *   **Implementation:** Execute the main test script: `npm test`.
    *   **Documentation:** Create the `docs/TESTING_CONVENTIONS.md` file as mandated by the project plan, documenting the mandatory use of the `esmock_wrapper.js` for all future tests.

**Outcome:** A stable and reliable Layer 1 with a complete, passing unit test suite, providing high confidence in the core game rules and utilities.

---

### **Phase 3: Integration Testing & Backend Service Hardening**

**Goal:** Verify that the isolated backend layers (Layer 1 Core Logic, Layer 3 Network API, and Layer 5 Persistence) work together correctly. This moves beyond unit tests to integration tests that simulate real-world event flows.

**Key Tasks:**

1.  **Lobby and Game Start Integration Test:**
    *   **Action:** Create a new integration test file (`test/integration/lobby.integration.test.js`).
    *   **Implementation:** This test will simulate four clients connecting, emitting `join_game` events, and being placed into a lobby. It will then test both the explicit `request_start_game` event and the automatic start that occurs when the lobby becomes full.
    *   **Verification:** Assert that the game state correctly transitions from `LOBBY` to `ORDER_UP_ROUND1`, cards are dealt, and the `game_state_update` is broadcast to all clients in the game room.

2.  **Full Hand Lifecycle Integration Test:**
    *   **Action:** Create a new integration test (`test/integration/fullHand.integration.test.js`).
    *   **Implementation:** Simulate the flow of a complete hand, with mock clients sending events in the correct sequence: `action_order_up_decision` -> `action_dealer_discard` -> `action_go_alone_decision` -> multiple `action_play_card` events.
    *   **Verification:** After each action, assert that the game state in the mock database (`gameRepository`) is updated correctly and that the `game_state_update` event is broadcast to the room with the expected state changes (e.g., new `currentPlayer`, updated `currentTrick`).

3.  **Player Disconnection & Reconnection Test:**
    *   **Action:** Create a new integration test (`test/integration/reconnection.integration.test.js`).
    *   **Implementation:**
        *   **Disconnect:** Simulate four players joining a game. Then, simulate one client disconnecting.
        *   **Reconnect:** Simulate the same user connecting with a new socket and emitting an `action_rejoin_game` event with their `gameId` and `playerId`.
    *   **Verification:**
        *   **Disconnect:** Assert that the player's `isConnected` status is set to `false` in the database and that other players receive a `game_state_update` reflecting this.
        *   **Reconnect:** Assert that the player's `isConnected` status is set back to `true`, their new `socketId` is stored, and they receive a full `game_state_update` to sync their client.

**Outcome:** A fully tested and hardened backend where all services and logic layers are confirmed to work in concert.

---

### **Phase 4: Client-Side UI Implementation (From Placeholder to Playable)**

**Goal:** Replace the static `public/index.html` with a minimal but functional client-side application capable of rendering the game and handling user actions, enabling full manual E2E testing. This phase will leverage the architectural hints in the `archived_for_later_development` folder.

**Key Tasks:**

1.  **UI Scaffolding:**
    *   **Action:** Enhance the `public/` directory to support a more structured UI.
    *   **Implementation:** Keep the existing `index.html` but gut its script section. Create a new `main.js` as the entry point. Structure the UI into components conceptually (e.g., in separate JS files or as functions within `main.js`).

2.  **Client-Side Services:**
    *   **Action:** Implement client-side services for managing the socket and state, based on the concepts in the archived `socketService.js` and `stateService.js`.
    *   **Implementation:**
        *   **`socketService.js`:** A module that initializes the single Socket.IO client and wraps `socket.emit()` and `socket.on()` for easy use by the UI.
        *   **`uiState.js`:** A simple state management module that holds the latest `gameState` received from the server and allows UI components to subscribe to changes.

3.  **UI Component Rendering:**
    *   **Action:** Write the core rendering logic.
    *   **Implementation:** In the `game_state_update` handler within `socketService.js`, call a function to update the central state in `uiState.js`. The `uiState` module, upon update, will notify all subscribed UI functions to re-render. Create rendering functions for:
        *   `renderPlayerHand()`: Displays the cards for the local player.
        *   `renderOpponentHands()`: Displays card backs for opponents.
        *   `renderTrickArea()`: Shows cards played in the current trick.
        *   `renderScoreBoard()`: Updates scores and trump indicator.
        *   `renderActionModals()`: Shows/hides bidding and "go alone" modals based on `gameState.phase` and `gameState.currentPlayer`.

4.  **User Interaction Handling:**
    *   **Action:** Connect user inputs to server events.
    *   **Implementation:** Add event listeners to the UI elements. For example, clicking a card in `renderPlayerHand()` should call a function in the socket service to `socket.emit('action_play_card', { ... })`. Clicking a button in a modal should emit the corresponding bidding decision.
    *   **UX Improvement:** Add logic to visually disable (e.g., lower opacity) cards that are not legally playable based on the current trick's lead suit.

**Outcome:** A functional, locally playable game that, while not polished, allows for full end-to-end manual testing of the complete application logic.

---

### **Phase 5: Full System E2E Testing & Refinement**

**Goal:** Conduct thorough end-to-end testing using the newly functional UI to find and fix bugs in the complete system.

**Key Tasks:**

1.  **Document Manual Test Cases:**
    *   **Action:** Create a testing checklist.
    *   **Implementation:** Document scenarios to test, including: lobby joining, starting a game, every scoring possibility (march, euchre, alone hands), "stick the dealer" rule, disconnections and reconnections mid-game, and invalid move attempts.

2.  **Execute E2E Testing:**
    *   **Action:** Perform the manual tests.
    *   **Implementation:** Open four browser windows, connect to the local server, and play through the documented scenarios multiple times.

3.  **Bug Triage and Fixing:**
    *   **Action:** Log all bugs found, whether in the frontend rendering or backend logic.
    *   **Implementation:** Address critical bugs by returning to the relevant layer (e.g., fix a scoring bug in `scoringPhase.js` and its unit test) and re-testing.

**Outcome:** A stable application with major bugs resolved and a high degree of confidence in its correctness.

---

### **Phase 6: Deployment & Finalization**

**Goal:** Prepare and document the application for production deployment.

**Key Tasks:**

1.  **Configuration for Production:**
    *   **Action:** Abstract all environment-specific settings.
    *   **Implementation:** Ensure that the MongoDB connection URI, server port, and any other sensitive or environment-dependent values are loaded from environment variables (`process.env`), not hardcoded. Update `src/config/database.js` if necessary.

2.  **Production Database Setup:**
    *   **Action:** Prepare for a production database.
    *   **Implementation:** Document the need to set up a production-ready MongoDB instance (e.g., using MongoDB Atlas) and configure the application with its connection string via environment variables.

3.  **Process Management & Logging:**
    *   **Action:** Set up the application to run robustly on a server.
    *   **Implementation:** Recommend and document the use of a process manager like `pm2` to handle running the Node.js server, managing restarts, and monitoring. Ensure production logs are not in "pretty" format.

4.  **Documentation Update:**
    *   **Action:** Update the `readme.md` with final instructions.
    *   **Implementation:** Add clear, concise sections for "Local Development Setup" and "Production Deployment," detailing all required steps, environment variables, and commands.

**Outcome:** A complete, well-documented, and deployable online Euchre application.