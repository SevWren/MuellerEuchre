### High-Level Goal for Layer 2 (300 Line per file limit)

The fundamental flaw of the current architecture is its reliance on a single, global, in-memory `gameState` variable. This pattern is untenable for a real multiplayer application as it cannot manage multiple concurrent games, cannot persist progress, and is prone to race conditions.

The high-level goal of Layer 2 is to completely replace this fragile global variable with an **authoritative, transactional State Management Core**. This represents a critical architectural shift from a simple script to a robust, service-oriented system.

This new State Management Core will be responsible for:

1.  **Multi-Instance Management:** Maintaining the state of every active game on the server, each identified by a unique `gameId`. This is the foundation for supporting multiple, simultaneous game rooms.
2.  **State Caching:** Intelligently keeping the state of active games in memory for high performance, while knowing how to retrieve inactive games from a persistent store.
3.  **Persistence Orchestration:** Acting as the sole coordinator with the database layer (`gameRepository`). The core itself won't talk to the database, but it will command the repository to save and load states, ensuring a clean separation of concerns.
4.  **Atomic and Immutable Updates:** Enforcing the "dispatch" pattern for all state changes. No part of the application will be allowed to mutate state directly. Instead, they will submit an "action" (a pure function from a `phases/*.js` file) to the core, which guarantees that the entire state transition is an atomic, immutable operation.

Upon completion of Layer 2, the application will have a central nervous system for state, enabling the socket handlers in Layer 3 to become thin, declarative entry points that simply say, "For this game, perform this action."

---

### Projected Files for a Complete Layer 2

Based on the 300-line constraint, the `gameService.js` file, which acts as the main API for all game actions, is a candidate for being split. While its total line count might not exceed 300, its responsibility is broad. Splitting it by game phase aligns with the existing project structure and improves modularity and maintainability.

---

#### 1. `src/game/gameManager.js` (New File)

*   **Purpose:** The central singleton service that manages the lifecycle and in-memory cache of all active game instances. It is the only module that directly holds and mutates the `activeGames` map.
*   **Key Functions / Contents:**
    *   `activeGames`: An in-memory `Map` object, `new Map()`, to store `gameState` objects keyed by `gameId`.
    *   `createGame(hostId)`: Creates a new game state using the `state.js` factory, adds it to the `activeGames` map, and commands `gameRepository` to persist the initial record.
    *   `getGame(gameId)`: Retrieves a game state. It first checks the in-memory `activeGames` map. If not found, it commands `gameRepository` to load from the database, caches the result in the map, and then returns it.
    *   `updateGame(gameId, updaterFn)`: The core transactional update function. It retrieves the current state, applies the pure `updaterFn` to produce a new state, updates the in-memory map, and asynchronously commands `gameRepository` to save the new state.
    *   `endGame(gameId)`: Removes a completed game from the in-memory `activeGames` map to conserve memory.
*   **Architectural Justification:** This file has a single, vital responsibility: managing the collection of active game states. It centralizes the logic for caching, loading, and orchestrating persistence, ensuring consistency. Its estimated line count is well under 300 lines.
*   **Interaction with Other Layers:**
    *   **Uses:** `state.js` (as a factory), `gameRepository.js` (for persistence).
    *   **Serves:** The new `gameService` modules.

---

#### 2. The Game Service API (Split into Multiple Files)

The original concept of a single `gameService.js` would contain a function for every player action. To adhere to the principle of high cohesion and the 300-line constraint, this is split into multiple files, mirroring the `phases` directory structure.

##### 2a. `src/game/services/lobbyService.js` (New File)

*   **Purpose:** To provide the high-level API for all actions related to the lobby and game setup.
*   **Key Functions / Contents:**
    *   `joinGame(gameId, user, playerName, socketId)`: Contains the complex logic for a player joining a game, finding an available role, and handling the creation of a new game if `gameId` is null.
    *   `rejoinGame(gameId, user, socketId)`: Handles the logic for a player reconnecting to an existing game.
    *   `startGame(gameId, requestingPlayerRole)`: Orchestrates the transition from Lobby to Dealing. It will call `gameManager.updateGame` with the `attemptToStartGame` and `startNewHand` pure functions from the phase logic files.
*   **Architectural Justification:** Grouping all lobby-related actions together keeps the concerns of game creation, joining, and starting separate from in-game actions like playing cards.
*   **Interaction with Other Layers:**
    *   **Uses:** `gameManager.js`, `lobbyPhase.js`, `startNewHandPhase.js`.
    *   **Serves:** `lobbyHandlers.js`, `playerConnectionHandlers.js`.

##### 2b. `src/game/services/biddingService.js` (New File)

*   **Purpose:** To provide the high-level API for all bidding-related actions.
*   **Key Functions / Contents:**
    *   `orderUp(gameId, playerRole, decision)`: Calls `gameManager.updateGame` with the `handleOrderUpDecision` updater function.
    *   `callTrump(gameId, playerRole, suit, decision)`: Calls `gameManager.updateGame` with the `handleCallTrumpDecision` updater function.
    *   `dealerDiscard(gameId, playerRole, cardId)`: Calls `gameManager.updateGame` with the `handleDealerDiscard` updater function.
*   **Architectural Justification:** Encapsulates all actions that can occur during the two bidding rounds.
*   **Interaction with Other Layers:**
    *   **Uses:** `gameManager.js`, `biddingPhase.js`.
    *   **Serves:** `biddingHandlers.js`.

##### 2c. `src/game/services/playingService.js` (New File)

*   **Purpose:** To provide the high-level API for all actions during the main playing and scoring phases.
*   **Key Functions / Contents:**
    *   `goAlone(gameId, playerRole, decision)`: Calls `gameManager.updateGame` with the `handleGoAloneDecision` updater function.
    *   `playCard(gameId, playerRole, card)`: Calls `gameManager.updateGame` with the `handlePlayCard` updater function.
    *   `scoreHand(gameId)`: A new service function that will be called by a handler when a hand is complete. It will call `gameManager.updateGame` with the `calculateAndApplyScore` updater function.
    *   `requestNewGame(gameId, playerRole)`: Calls `gameManager.updateGame` with the `handleNewGameRequest` updater function.
*   **Architectural Justification:** Groups all actions related to the trick-taking, scoring, and game-over loop.
*   **Interaction with Other Layers:**
    *   **Uses:** `gameManager.js`, `goAlonePhase.js`, `playingPhase.js`, `scoringPhase.js`.
    *   **Serves:** `goAloneHandlers.js`, `playingHandlers.js`, `gameOverHandlers.js`.

---

#### 3. `src/game/state.js` (Refactored File)

*   **Purpose:** This file is simplified to become a pure factory. Its sole responsibility is to generate a valid, default `gameState` object. It will no longer hold any state itself.
*   **Key Functions / Contents:**
    *   `createInitialGameState(gameId)`: The main export. Returns a fresh game state object.
    *   **REMOVED:** The global `gameState` variable, `getGameState()`, and `updateGameState()`.
*   **Architectural Justification:** This refactoring removes the last vestige of global state, enforcing the new service-based architecture. It adheres to the single responsibility principle.
*   **Interaction with Other Layers:**
    *   **Serves:** `gameManager.js`.

---

#### 4. `src/db/gameRepository.js` (Existing File)

*   **Purpose:** Unchanged. This remains the Data Access Layer (DAL), responsible for all direct database operations.
*   **Key Functions / Contents:**
    *   The existing functions (`connect`, `getGame`, `updateGame`, `disconnect`) are appropriate.
    *   A new `createGame(gameId, gameState)` function should be added to use MongoDB's `insertOne` for clarity, distinguishing it from the `updateOne` logic in `updateGame`.
*   **Architectural Justification:** Isolating all database code in this module makes the system easier to maintain and test. It allows the rest of the application to be persistence-agnostic.
*   **Interaction with Other Layers:**
    *   **Serves:** Used exclusively by `gameManager.js`.