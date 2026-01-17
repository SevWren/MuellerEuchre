# System Implementation Specifications

This document defines the detailed implementation specifications for the Mueller Euchre project. It serves as a reference for the expected behavior and internal logic of the system's core modules.

---

## 1. Network API (Layer 3) Specifications

**Objective:** Define the strict contract between the Client (Layer 4) and the Server (Layer 3). All handlers follow the **Transaction Pattern**: `Validate Inputs` -> `Get State` -> `Atomic Update (Layer 2)` -> `Persist (Layer 5)` -> `Broadcast`.

### General Event Structures

*   **Server-to-Client Broadcast:**
    *   Event: `GAME_EVENTS.STATE_UPDATE`
    *   Payload: The full `GameState` object.
*   **Client-to-Server Acknowledgment:**
    *   Every emit must include a callback.
    *   Success: `{ status: "ok", ...data }`
    *   Failure: `{ status: "error", message: "..." }`

### Event Handlers

#### `src/socket/handlers/playingHandlers.js`

**Event: `ACTION_PLAY_CARD`**
*   **Input Payload:**
    ```json
    {
      "gameId": "string",
      "playerRole": "string",
      "card": { "id": "AH", "suit": "CARD_SUIT_HEARTS", "value": "A" }
    }
    ```
*   **Implementation Logic:**
    1.  **Input Validation:** Ensures `card.id`, `card.suit`, and `card.value` are present and are strings.
    2.  **State Retrieval:** Retrieves state via `getGameState(gameId)`. Hydrates from DB using `repo.getGame(gameId)` if missing from memory.
    3.  **Atomic Update:** Calls `updateGameState(gameId, (state) => handlePlayCard(state, playerRole, card))`.
        *   Validates `card.id` against the player's hand in memory.
    4.  **Persistence:** Persists new state via `await gameRepository.updateGame(gameId, newState)`.
    5.  **Broadcast:** Emits `GAME_EVENTS.STATE_UPDATE` to the room `gameId`.
    6.  **Ack:** Returns `{ status: "ok" }`.

#### `src/socket/handlers/biddingHandlers.js`

**Event: `ACTION_ORDER_UP_DECISION`**
*   **Input Payload:** `{ "gameId": "...", "playerRole": "...", "decision": boolean }`
*   **Logic:** Updates state using Layer 1 `handleOrderUpDecision`.

**Event: `ACTION_DEALER_DISCARD`**
*   **Input Payload:** `{ "gameId": "...", "playerRole": "...", "cardId": "AH" }`
*   **Logic:**
    *   Validates that `cardId` is a string.
    *   Updates state using Layer 1 `handleDealerDiscard`.

**Event: `ACTION_CALL_TRUMP_DECISION`**
*   **Input Payload:** `{ "gameId": "...", "playerRole": "...", "decision": boolean, "suit": "CARD_SUIT_..." (optional) }`
*   **Logic:**
    *   If `decision` is true, validates that `suit` is a valid string from constants.
    *   Updates state using Layer 1 `handleCallTrumpDecision`.

#### `src/socket/handlers/goAloneHandlers.js`

**Event: `ACTION_GO_ALONE_DECISION`**
*   **Input Payload:** `{ "gameId": "...", "playerRole": "...", "goingAlone": boolean }`
*   **Logic:** Updates state using Layer 1 `handleGoAloneDecision`.

#### `src/socket/handlers/gameOverHandlers.js`

**Event: `ACTION_REQUEST_NEW_GAME`**
*   **Input Payload:** `{ "gameId": "...", "playerRole": "..." }`
*   **Logic:** Resets the game state for a new match if the game is over.

#### `src/socket/handlers/playerConnectionHandlers.js`

**Event: `ACTION_REJOIN_GAME`**
*   **Input Payload:** `{ "gameId": "...", "playerId": "..." }`
*   **Implementation Logic:**
    1.  **Fetch:** Retrieves state from Memory or DB.
    2.  **Validate:** Checks if `playerId` matches a player's `id` in `state.players`.
    3.  **Atomic Update:** Sets `players[role].isConnected = true` and `players[role].socketId = socket.id` without deleting game state.
    4.  **Socket Action:** Joins the socket to `gameId`.
    5.  **Direct Emit:** Emits `GAME_EVENTS.STATE_UPDATE` to the socket.
    6.  **Broadcast:** Emits `GAME_EVENTS.STATE_UPDATE` to the room.

**Internal: `handlePlayerDisconnect`**
*   **Trigger:** Socket disconnect event.
*   **Logic:**
    1.  Identifies `gameId` and `playerRole` associated with the socket.
    2.  **Atomic Update:** Sets `players[role].isConnected = false` and `socketId = null`.
    3.  **Persist:** Saves connection status to DB.
    4.  **Broadcast:** Emits `PLAYER_DISCONNECTED` event to the room.

---

## 2. State Management (Layer 2) Specifications

**Objective:** Manage the in-memory store and ensure lifecycle management. `src/game/state.js` acts as the **Single Source of Truth** and in-memory database cache.

### Internal Data Structure
`activeGames` is a `Map` where the Key is `gameId` (string) and the Value is the `GameState` (Frozen Object).

### Public API Implementation

**`createGameState(hostId)`**
*   Generates a new game ID and initializes players.
*   Sets initial phase, distinct timestamps (`createdAt`, `updatedAt`), and empty structures for game components.
*   Recursively freezes the state before storing in `activeGames`.

**`getGameState(gameId)`**
*   Returns a **deep copy** (`structuredClone`) of the state to prevent direct mutation by consumers.
*   Returns `null` if the game is not found.

**`updateGameState(gameId, updateFn)`**
*   Accepts a pure function `updateFn` that takes `currentState` and returns `newState`.
*   Validates that `updateFn` does not return a Promise (enforcing synchronous Layer 1 logic).
*   Updates `updatedAt` timestamp.
*   Freezes `newState` and updates `activeGames`.

**`hydrateGames(gamesArray)`**
*   Iterates through an array of game objects (from DB) and populates the `activeGames` Map.
*   Recursively `Object.freeze()`s every hydrated state.

**`pruneStaleGames()`**
*   Iterates through `activeGames` and removes entries where `updatedAt` is older than 2 hours.

---

## 3. Persistence (Layer 5) Specifications

**Objective:** Ensure data safety and server restart recovery. Managed by `src/db/gameRepository.js`.

### Database Configuration
*   Connects using `process.env.MONGO_URI` with robust options (pool size, timeouts).

### Method Implementations

**`connect()`**
*   Establishes connection to MongoDB.
*   Creates a **Unique Index** on `gameId`.
*   Creates a **TTL Index** on `updatedAt` (24 hours).

**`updateGame(gameId, gameState)`**
*   Uses `updateOne` with `{ upsert: true }`.
*   Updates headers (`$set: gameState`) and handles creation timestamp (`$setOnInsert`).

**`findAllActiveGames()`**
*   Queries for games where `gamePhase` is not `GAME_PHASE_GAME_OVER`.
*   Includes a sanity check for `updatedAt` within the last 24 hours.

**Server Startup Sequence (`src/server.js`)**
*   Awaits `gameRepository.connect()`.
*   Awaits `gameRepository.findAllActiveGames()`.
*   Calls `state.hydrateGames()` with the result **before** opening the Socket.IO port.

---

## 4. Client/UI (Layer 4) Specifications

**Objective:** Align the Frontend with the Backend API Contract. Implemented in `public/js/socketHandler.js`.

### Core Logic

**`updateUI/render(gameState)`**
*   **Unidirectional Data Flow:** Purely renders the `gameState` received from the server.
*   **Phase Switching:** Dynamically hides/shows DOM elements (Lobby vs. Game View) based strictly on `gameState.gamePhase`.
*   **Card Rendering:** Maps server Card IDs (e.g., "AH") to CSS classes/images.
*   **Interactive Controls:** Renders context-aware buttons (Order Up, Pass, Call Trump) based on `currentPlayer` and `gamePhase`.

**Session Persistence**
*   **Storage:** Saves `gameId`, `playerId`, and `role` to `localStorage` on `ASSIGN_ROLE` event.
*   **Reconnection:** On page load (`init()`), checks `localStorage` and automatically emits `ACTION_REJOIN_GAME`.
