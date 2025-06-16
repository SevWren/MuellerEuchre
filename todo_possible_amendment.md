### **MASTER INSTRUCTIONS: Euchre Multiplayer [AI SHOULD NEVER REMOVE THIS]**

**Directive 0: Master Mandate**
This document contains the complete and authoritative instructions for the development of the Euchre Multiplayer project. All previous instructions are superseded. The primary goals are to ensure stability, maintainability, and operational focus by strictly adhering to the principles outlined below.

---

### **Part 1: Core Directives (The Unbreakable Rules)**

1.  **Strict Layer Adherence:** You will operate exclusively within the "Layered Development" methodology defined in Part 2. Work on one layer is to be completed and validated before work on a subsequent layer begins.
2.  **Sequential Task Execution:** You will execute tasks from the "Master Task List" (Part 3) in the precise, non-negotiable order they are listed. Do not skip or reorder tasks.
3.  **TDD is Law for Layer 1:** All modules within Layer 1 (Core Logic) **MUST** be developed using the TDD flow defined in the Session Protocol (Part 4).
4.  **Minimal Context is the Goal:** Your primary constraint is to minimize contextual awareness. When working within a layer, your focus is confined to that layer's specific task. You are to rely on the explicit definitions in this document.

---

### **Part 2: The Methodology - Layered Development with Manual Integration Testing**

**Core Principle:** Master one layer before moving to the next. Each layer has a single, clear job.

#### **Layer 1: The Core Logic (The TDD Foundation)**
This is where the rules of the game are built in a completely isolated environment.
*   **Methodology:** Simplified Test-Driven Development (TDD).
*   **Your Task:** You will execute the TDD protocol (Part 4) for each task: generate the test definitions, create the test file, run the tests to confirm failure, and upon user command, generate the implementation code to make those tests pass.
*   **Contextual Limitation:** In this layer, you only think about data and rules. You have zero awareness of the server, network, or UI.

#### **Layer 2: The State & Network API (The First Divergence)**
This is where the core logic is connected to the outside world.
*   **Methodology:** Create "Logic-Free Endpoints" and a "State Dispatcher."
*   **Your Task:**
    1.  **State Management:** Create a state module that manages the `gameState` object. It uses pure functions from Layer 1 to calculate and return a **new** state object in response to actions. It never modifies state directly.
    2.  **Network Handlers:** Create socket handlers whose only job is to translate network events into action objects for the state manager. They contain **no game logic**.
*   **Contextual Limitation:** When writing a socket handler, your only awareness is routing messages. You do not need to know *how* the game logic works.

#### **Layer 3: The User Interface (The Second Divergence)**
This is the visual part that the player sees.
*   **Methodology:** "State Display and Event-Emitting." The UI is a "dumb" client.
*   **Your Task:** Write UI components with two jobs: 1. Render a `gameState` object received from the server. 2. Emit a simple message to the server on user interaction.
*   **Contextual Limitation:** Your context is purely visual. You only need to know the structure of the `gameState` object.

#### **Layer 4: The Final Check (Manual Integration Test)**
This is the final verification that all layers work together.
*   **Methodology:** Manual End-to-End (E2E) Testing.
*   **Your Role:** You will provide instructions **for the user** to conduct this manual test: start the server, open four browser tabs, and play the game. This is the only phase where the user performs the test action.
*   **Contextual Limitation:** During this phase, you are in "test analysis mode."

---

### **Part 3: The Master Task List**

#### **[LAYER 1: CORE GAME LOGIC & UTILITIES (TDD)]**

**Task 1.1: Establish a Stable, Minimal TDD Environment**

**Task 1.2: Rewrite `src/rewritten/utils/logger.js` (Asynchronous & Robust)**
*   **Why:** All new modules require reliable, non-blocking logging.
*   **Action (TDD):** Define requirements via tests for asynchronous logging with levels (ERROR, WARN, INFO, DEBUG) to the console.

**Task 1.3: Rewrite `src/rewritten/utils/deck.js` (Correct Card Logic)**
*   **Why:** Card creation, shuffling, and ranking are fundamental to the game.
*   **Action (TDD):**
    1.  Test `createDeck()` for a 24-card Euchre deck.
    2.  Test `shuffleDeck(deck)`.
    3.  Test helpers: `isRightBower(card, trumpSuit)`, `isLeftBower(card, trumpSuit)`.
    4.  Test the **critical** `getCardRank(card, ledSuit, trumpSuit)` for all Bower, trump, and off-suit scenarios.
    5.  Test `sortHand(hand, trumpSuit)` based on the correct rank.

**Task 1.4: Rewrite `src/rewritten/utils/players.js`**
*   **Why:** Centralize all player-related turn logic.
*   **Action (TDD):**
    1.  Test `initializePlayers()` for the correct starting structure.
    2.  Test `getPartner(playerRole)`.
    3.  Test `getNextPlayer()` for both normal and "going alone" turn progression.
    4.  Test `getPlayerBySocketId()` and `getRoleBySocketId()`.

**Task 1.5: Rewrite `src/rewritten/game/logic/validation.js`**
*   **Why:** To enforce legal game moves, preventing invalid state changes.
*   **Action (TDD):**
    1.  Test `isValidPlay(playerHand, cardToPlay, currentTrick, trumpSuit)` to enforce "must follow suit" rules, including correct Left Bower behavior. **No test-mode bypasses.**
    2.  Test validation for bids and dealer discards.

**Task 1.6: Rewrite Core Game Phase Logic (as Pure Functions)**
*   **Why:** To encapsulate game rules into predictable, testable units.
*   **Action (TDD, one module at a time):**
    1.  **Trick Logic (`trick.js`):** Test `determineTrickOutcome(trickPlays, trumpSuit)` to return the correct winner.
    2.  **Scoring Logic (`scoring.js`):** Test `calculateHandScore(tricksWonByTeam, makerTeam, isGoingAlone)` to return the correct point values for all outcomes.
    3.  **Bidding Logic (`bidding.js`):** Test `determineOrderUpOutcome(...)` to return the new game state parameters (trump, next phase, etc.).

#### **[LAYER 2: STATE MANAGEMENT & NETWORK API]**

**Task 2.1: Design and Implement the State Manager (`state.js`)**
**Task 2.2: Setup Server and Socket.IO Infrastructure**
**Task 2.3: Implement Logic-Free Socket Handlers (`gameHandlers.js`)**

#### **[LAYER 3: THE USER INTERFACE]**

**Task 3.1: Refactor Client-Side Services (`socketService.js`, etc.)**
**Task 3.2: Refactor UI Components to Render the New `gameState`**
**Task 3.3: Update UI Event Handling to Emit Correct Socket Events**

#### **[LAYER 4: MANUAL INTEGRATION TESTING]**

**Task 4.1: Conduct Full Manual E2E Game Test**

---

### **Part 4: Session Protocol**

To execute a task within Layer 1, the following TDD protocol will be strictly followed:

1.  **STATE CURRENT TASK:** You will state the next task number and title from the Master Task List.
    *   *Example: "Executing Task 1.2: Rewrite `src/rewritten/utils/logger.js`."*
2.  **GENERATE TEST & CREATE FILE:** You will generate the complete contents for the test file and state that you are creating the file at the specified path.
    *   *Example: "Generating test definitions for `test/rewrite_tests/utils/logger.test.js`. I am creating this file now with the following content:" [code block follows]*
3.  **RUN FAILING TEST & AWAIT COMMAND:** You will execute the test runner, report the expected failing output, and then await the user's command to proceed.
    *   *Example: "I have executed `npm run test:rewrite`. The tests are failing as expected. Awaiting your command to proceed to implementation."*
4.  **GENERATE IMPLEMENTATION & CREATE/UPDATE FILE:** Upon user command, you will generate the implementation code and state that you are creating or updating the corresponding source file.
    *   *Example: "Proceeding. Generating implementation for `src/rewritten/utils/logger.js`. I am creating this file now with the following content:" [code block follows]*
5.  **RUN PASSING TEST & AWAIT NEXT TASK:** You will execute the test runner again, report the successful "passing" output, and then await the user's command to begin the next task in the sequence.
    *   *Example: "I have executed `npm run test:rewrite`. All tests are now passing. Task 1.2 is complete. Awaiting your command to begin the next task."*