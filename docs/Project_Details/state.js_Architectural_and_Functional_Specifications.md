# **DOCUMENT: Architectural & Functional Specification for `src/game/state.js`**

## 1.0 Executive Summary & Statement of Purpose

This document provides the exhaustive architectural and functional specification for the **`src/game/state.js`** module. This module is the singular and authoritative implementation of **Layer 2: State Management** within the MuellerEuchre-Windsurf application's layered architecture, as mandated by the  Project Architectural Mandate for Layer 1.

The primary directive of this module is to serve as the **single, centralized, in-memory source of truth** for the state of all active game sessions. It provides an encapsulated, transactional, and immutable API for state manipulation, acting as the critical intermediary between the impure, I/O-bound **Layer 3 (Network Handlers)** and the stateless, deterministic **Layer 1 (Pure Core & Game Logic)**.

Its existence is a direct fulfillment of the project's core principles of immutability and centralized state, designed to manage multiple concurrent games identified by a unique `gameId`. By strictly controlling access to the game state, this module eradicates entire classes of potential bugs endemic to real-time applications, such as race conditions within Node.js's single-threaded event loop, unintended side effects, and state desynchronization.

## 2.0 Core Principles & Architectural Mandates

The design and implementation of `src/game/state.js` are dictated by the non-negotiable architectural mandates of the project. Every function and design pattern herein is a direct reflection of these principles.

*   **Single Source of Truth:** All game logic, at any point in time, must derive its understanding of a game's state from this module. There are no other valid sources for in-memory game state.

*   **Immutability First:** The module strictly enforces an immutable state management paradigm. The authoritative state held in memory is deeply frozen via `Object.freeze()`. Functions that retrieve state (`getGameState`) return a full deep copy (`structuredClone`), making it impossible for consumers of the state to mutate the source of truth accidentally.

*   **Atomic State Transitions:** All modifications to a game's state are performed atomically through the `updateGameState` function. This function accepts a pure "updater" function as an argument, ensuring that the complex logic of calculating the *next* state (a Layer 1 responsibility) is cleanly separated from the act of *committing* that new state to memory (this module's responsibility).

*   **Strict Encapsulation:** The internal in-memory data store (a private `Map` named `activeGames`) is a module-level variable and is not exported. The public API is the sole entry point for any state interaction, guaranteeing that the principles above are upheld without exception.

*   **Layer Purity Boundary:** This module serves as the formal boundary between layers. It receives requests from the impure Layer 3, provides a pristine, reliable state snapshot to the pure Layer 1 functions, and accepts the new, calculated state back to be committed.

## 3.0 Canonical Data Schemas

These schemas define the immutable structures managed by this module.

### 3.1 The `GameState` Object Schema: An Exhaustive Breakdown

The `GameState` object is the definitive data structure representing a single, complete game.

| Property | Type | Detailed Description & Purpose | Architectural Justification & Source Document(s) |
| :--- | :--- | :--- | :--- |
| **`gameId`** | `string` | A unique, cryptographically strong, URL-friendly identifier for the game session. Generated once upon creation. | Serves as the primary key for all state management, persistence (`gameRepository`), and `socket.io` room management. |
| **`hostId`** | `string` | The unique ID of the player who created the game. Used to determine host privileges (e.g., starting the game). | Manages lobby control flow. |
| **`gamePhase`** | `string` | The current phase of the game. Must be one of the `GAME_PHASES` constants. This property dictates all valid actions. | The core of the game's state machine. Essential for enforcing rules of each phase. |
| **`players`** | `object.<string, Player>` | A map where keys are player roles (e.g., `PLAYER_SOUTH`) and values are `Player` objects (see Schema 3.2). | Mandated by the immutable, fixed-seating arrangement. Keying by role is deterministic. |
| **`dealer`** | `string` | The role of the current dealer. Rotates clockwise after each hand or a misdeal. | Critical for determining the start of bidding and the `DEALER_DISCARD` action. |
| **`currentPlayer`**| `string` | The role of the player whose turn it is to act. The single source of truth for turn order. | Must follow a strict clockwise rotation, enforced by `utils/players.js`.  |
| **`turnCard`** | `Card \| null` | The single card (see Schema 3.3) turned face-up after the deal. Catalyst for Round 1 bidding. Becomes `null` after bidding. | A constraint for Round 2 bidding (cannot call this suit). |
| **`kitty`** | `Card[]` | The three cards remaining in the deck after dealing and setting the `turnCard`. Not in play. | Standard component of the Euchre deal. Essential for state integrity and potential future analytics. |
| **`trumpSuit`** | `string \| null` | The suit declared trump. Fundamentally alters card power. A `null` value indicates bidding is in progress. | The most critical piece of contextual information for all gameplay logic. |
| **`makerTeam`** | `string \| null` | The team that made trump ('TEAM_NS' or 'TEAM_EW'). Contractually obligated to win at least 3 tricks. | The keystone property for the entire asymmetric scoring system, differentiating Makers from Defenders.  |
| **`playerWhoOrderedUp`**| `string \| null` | The role of the maker who successfully ordered up the dealer in Round 1. | Differentiates the maker and determines who decides to "go alone." |
| **`playerWhoCalledTrump`**| `string \| null` | The role of the maker who successfully called trump in Round 2. | Differentiates the maker and determines who decides to "go alone." |
| **`goingAlone`** | `boolean` | `true` if the maker chose to play without their partner. | Triggers modified turn rotation and scoring rules (1/4 points). |
| **`playerGoingAlone`**| `string \| null` | The role of the specific player who is going alone. | Identifies the lone hand for scoring and UI purposes. |
| **`partnerSittingOut`** | `string \| null` | The role of the maker's partner, who is inactive and must be skipped in turn rotation. | Critical input for the `getNextPlayer` utility to correctly manage game flow. |
| **`currentTrick`**| `object[]` | An array of `{card, playedBy}` objects representing cards in the current trick. Length is 0-4. | The transient state for a single trick, used to determine the trick winner. |
| **`leadSuit`** | `string \| null` | The suit of the first card in `currentTrick`. Dictates the suit that must be followed. | Crucial context for `validatePlay`. Input for `getCardRank` to determine trick winners. |
| **`tricksTaken`**| `object.<string, number>` | A map of team IDs to the number of tricks they have won in the current hand (0-5). Resets each hand. | The primary input for `scoringPhase.js` to calculate points. |
| **`teamScores`** | `object.<string, number>` | A map of team IDs to their total game score, persisting across hands. | Tracks progress towards the `winningScore`. |
| **`settings`** | `object` | The settings for this game instance, primarily `{ winningScore: number }`. | Fulfills the requirement for configurable game rules. |
| **`gameOver`** | `boolean` | A flag set to `true` when a team's score meets or exceeds the `winningScore`. Prevents further game actions. | The terminal state flag for a game session, acting as a circuit-breaker. |
| **`createdAt`** | `number` | Unix timestamp (ms) of game creation. | For metadata, analytics, and potential cleanup of exceptionally old, stale games. |
| **`updatedAt`** | `number` | Unix timestamp of the last state modification. | Critical for **`NFR4.4 (TTL Indexing)`**. `gameRepository.js` relies on this field to configure MongoDB to automatically purge abandoned games. |

### 3.2 The `Player` Object Schema

| Property | Type | Detailed Description |
| :--- | :--- | :--- |
| **`id`** | `string` | Unique identifier for the user session/account. |
| **`name`** | `string` | The player's display name, provided in the lobby. |
| **`role`** | `string` | Player's fixed seat/role (e.g., `PLAYER_SOUTH`). |
| **`teamId`** | `string` | The player's permanent team ('TEAM_NS' or 'TEAM_EW'). |
| **`hand`** | `Card[]` | Array of `Card` objects in the player's hand. **CRITICAL:** This data must be redacted before sending to other clients (`NFR5.3`). |
| **`isConnected`**| `boolean`| `true` if the player's client has an active WebSocket connection. |
| **`socketId`** | `string \| null` | The current, transient Socket.IO ID for the player. |

### 3.3 The `Card` Object Schema

| Property | Type | Detailed Description |
| :--- | :--- | :--- |
| **`id`** | `string` | A compact, unique identifier (e.g., "AS", "9D"). |
| **`suit`** | `string` | The canonical suit constant (e.g., `CARD_SUIT_SPADES`). |
| **`value`** | `string` | The face value ('9', '10', 'J', 'Q', 'K', 'A'). |
| **`name`** | `string` | The human-readable name (e.g., "Ace of Spades"). |

## 4.0 API Reference

### `createGameState(hostId, [customSettings])`
*   **Description:** The state factory function. Orchestrates calls to Layer 1 utilities (`generateGameId`, `initializePlayers`, `mergeSettings`) to generate a valid, fully initialized `GameState` object for a new game lobby.
*   **Returns:** `{Readonly<GameState>}` A new, deeply frozen game state object.
*   **Implementation Detail:** Immediately adds the new state to the internal `activeGames` Map.

### `getGameState(gameId)`
*   **Description:** Retrieves a snapshot of the current state for a specific game.
*   **Returns:** `{GameState | null}` A **deep copy** of the game state object if found; otherwise, `null`.
*   **Security & Immutability Note:** The mandatory use of `structuredClone()` is a critical design choice. It creates a complete, disconnected copy, guaranteeing that no consumer can ever accidentally mutate the authoritative in-memory state. This prevents a large class of hard-to-debug state corruption bugs.
*   **Performance Note:** `structuredClone` is fast but not free. This function should not be called inside tight, performance-critical loops where the state is not expected to change.

### `updateGameState(gameId, updateFn)`
*   **Description:** The sole, atomic entry point for all state mutations, enforcing a transactional update pattern.
*   **@param** `{(currentState: Readonly<GameState>) => GameState}` `updateFn` - A **pure function** (from Layer 1) that accepts the current, frozen state and returns a new, modified state object.
*   **Returns:** `{Readonly<GameState>}` The newly computed, frozen game state.
*   **Implementation Detail:** The function operates as a transaction: (1) `Map.get()` the current state, (2) pass it to the `updateFn`, (3) `Object.freeze()` the new state returned by `updateFn`, (4) `Map.set()` the new state. This pattern prevents race conditions by ensuring the `updateFn` always operates on the most current version of the state available at the time of its execution.

### `removeGameState(gameId)`
*   **Description:** Handles memory management by purging a completed or abandoned game state from the active in-memory pool.
*   **Returns:** `{boolean}` `true` if a game was found and removed, `false` otherwise.
*   **Integration Note:** This must be called by `gameOverHandlers.js` after a game's final state has been persisted, preventing memory leaks on the server.

## 5.0 Development, Debugging, and Testing Considerations

*   **Immutability Simplifies Debugging:** Because the state is immutable and managed centrally, debugging game logic errors is simplified. A bug is not a "corrupted state" but an incorrectly calculated `newCalculatedState` returned by a pure Layer 1 function. The debugging process becomes a linear trace of `(state_in) -> pure_function -> (state_out)`.
*   **Test Isolation:** When unit testing Layer 3 socket handlers, this module's API provides a perfect seam for mocking. A test can mock `getGameState` to provide a specific scenario and `updateGameState` to capture the resulting state, completely isolating the handler from the complexities of the full game engine.
*   **Platform & Environment Nuances (Windows Development):**
    *   **Core Logic Agnosticism:** The JavaScript logic within `state.js` is platform-agnostic and will execute identically on Windows, Linux, or macOS.
    *   **Tooling Awareness:** While the module itself is safe, developers on Windows must be mindful of how surrounding tools handle paths. When testing modules that consume `state.js`, ensure that mocks for `state.js` are imported using paths that are correctly resolved by the `node --test` runner on Windows. The use of `path.join` and `url.fileURLToPath` in test setups is recommended to mitigate these issues.

## 6.0 Scalability and Production Readiness

*   **Single-Process Limitation:** The use of a module-level `Map` confines all active game states to a single Node.js process. This meets the NFRs for the project's initial scope. Scaling horizontally to a multi-process or multi-server architecture would require replacing the in-memory `Map` with an external, low-latency key-value store like **Redis**. The abstract API (`get`, `update`, `remove`) is intentionally designed to facilitate such a migration with minimal changes to Layer 3 handlers.
*   **State Hydration on Server Restart:** As required by **`NFR4.3 (Recovery on Restart)`**, the server now automatically re-hydrates its `activeGames` map from the database on startup. The `server.js` module calls `gameRepository.findAllActiveGames()` and passes the results to `state.js`'s `hydrateGames()` function, which populates the in-memory store. This allows for seamless recovery of active games after a server restart.