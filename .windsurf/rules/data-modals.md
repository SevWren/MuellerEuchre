---
trigger: always_on
---

### `docs/Data_Models.md`

# Mueller Euchre: Formal Data Model Schemas (As-Is Implementation)

**Audience: LLM Agents & Developers**

This document is the **single source of truth** for the data structures used throughout the Mueller Euchre application **in its current implementation**. It is a faithful, as-is representation designed to provide a clear and unambiguous contract for code generation and analysis that is compatible with the existing codebase.

**Note:** Concepts like "Team" and "Trick" are not represented as single, formal objects in the current data model. Their state is distributed across several properties on the main `GameState` object. See the "How an LLM Should Interpret This Schema" section for guidance.

## Table of Contents

1.  [The `GameState` Object](#1-the-gamestate-object)
2.  [The `Player` Object](#2-the-player-object)
3.  [The `Card` Object](#3-the-card-object)
4.  [The `Bid` Object](#4-the-bid-object)
5.  [The `TrickEntry` Object](#5-the-trickentry-object)
6.  [How an LLM Should Interpret This Schema](#6-how-an-llm-should-interpret-this-schema)

---

## 1. The `GameState` Object

This is the canonical object representing the entire state of a single game instance.

| Property | Type | Nullable | Valid Values / Notes |
| :--- | :--- | :--- | :--- |
| `gameId` | `string` | No | Unique identifier for the game session. e.g., `"abc123xyz"`. |
| `gamePhase` | `string` | No | The current phase of the game. **Must be a value from `GAME_PHASES`**. |
| `players` | `Object<string, Player>` | No | A map where keys are player roles from `PLAYER_ROLES` (e.g., `"PLAYER_SOUTH"`) and values are `Player` objects. |
| `dealer` | `string` | Yes | The role of the current dealer. A value from `PLAYER_ROLES`. `null` only before the first hand. |
| `currentPlayer` | `string` | Yes | The role of the player whose turn it is to act. A value from `PLAYER_ROLES`. `null` during phase transitions. |
| `turnCard` | `Card` | Yes | The face-up card from the kitty used for Round 1 bidding. Becomes `null` after bidding is complete. |
| `kitty` | `Array<Card>` | No | The cards remaining after dealing. Typically contains 3 cards after the `turnCard` is set. |
| `trumpSuit` | `string` | Yes | The suit chosen as trump. **Must be a value from `CARD_SUITS`**. `null` until bidding is complete. |
| `makerTeam` | `string` | Yes | The team that chose the trump suit. **Must be a value from `TEAMS`** (e.g., `"TEAM_NS"`). `null` until bidding is complete. |
| `playerWhoOrderedUp` | `string` | Yes | The role of the player who ordered up in Round 1. A value from `PLAYER_ROLES`. |
| `playerWhoCalledTrump` | `string` | Yes | The role of the player who called trump in Round 2. A value from `PLAYER_ROLES`. |
| `goingAlone` | `boolean` | No | `true` if the maker has chosen to play the hand without their partner. |
| `playerGoingAlone` | `string` | Yes | The role of the player who is going alone. A value from `PLAYER_ROLES`. |
| `partnerSittingOut` | `string` | Yes | The role of the partner who is inactive for the current hand. A value from `PLAYER_ROLES`. |
| `currentTrick` | `Array<TrickEntry>` | No | An array of `TrickEntry` objects representing the cards played in the current trick. Length is 0-4. |
| `leadSuit` | `string` | Yes | The **effective suit** of the first card played in the `currentTrick`. **Must be a value from `CARD_SUITS`**. `null` if trick has not started. |
| `bids` | `Array<Bid>` | No | A log of all bidding actions taken during the current hand's bidding phase. |
| `tricksTaken` | `Object<string, number>` | No | A map of team IDs (`TEAMS`) to the number of tricks won in the **current hand**. e.g., `{ "TEAM_NS": 0, "TEAM_EW": 0 }`. |
| `teamScores` | `Object<string, number>` | No | A map of team IDs (`TEAMS`) to the **total game score** across all hands. e.g., `{ "TEAM_NS": 0, "TEAM_EW": 0 }`. |
| `settings` | `Object` | No | The game settings. e.g., `{ "winningScore": 10 }`. |
| `gameOver` | `boolean` | No | Flag indicating if a team has reached the `winningScore`. |
| `winningTeam` | `string` | Yes | The team that won the game. **Must be a value from `TEAMS`**. `null` until `gameOver` is `true`. |
| `createdAt` | `number` | No | Unix timestamp (ms) of when the game was created. |
| `updatedAt` | `number` | No | Unix timestamp (ms) of the last state modification. Used for TTL indexing in the database. |

---

## 2. The `Player` Object

Represents a single player at the table. This object is stored within the `GameState.players` map.

| Property | Type | Nullable | Valid Values / Notes |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | A persistent, unique identifier for the user account or session. |
| `name` | `string` | No | The user-provided display name for the game. |
| `role` | `string` | No | The player's fixed role at the table. **Must be a value from `PLAYER_ROLES`**. |
| `teamId` | `string` | No | The team the player belongs to. **Must be a value from `TEAMS`**, derived from their `role`. |
| `hand` | `Array<Card>` | No | The array of `Card` objects currently in the player's hand. Contains 0-5 cards. |
| `isConnected` | `boolean` | No | The live connection status of the player. `true` if they have an active socket. |
| `socketId` | `string` | Yes | The current, ephemeral socket ID of the player. `null` if disconnected. |

---

## 3. The `Card` Object

Represents a single playing card.

| Property | Type | Nullable | Valid Values / Notes |
| :--- | :--- | :--- | :--- |
| `id` | `string` | No | A compact, unique identifier. e.g., `"AS"`, `"9H"`, `"JC"`. |
| `suit` | `string` | No | The canonical suit. **Must be a value from `CARD_SUITS`**. |
| `value` | `string` | No | The face value. **Must be a value from `CARD_VALUES`** (`"9"`, `"10"`, `"J"`, `"Q"`, `"K"`, `"A"`). |
| `name` | `string` | No | The human-readable name. e.g., `"Ace of Spades"`. |

---

## 4. The `Bid` Object

Represents a single bid action taken by a player. Stored in the `GameState.bids` array.

| Property | Type | Nullable | Valid Values / Notes |
| :--- | :--- | :--- | :--- |
| `playerRole` | `string` | No | The role of the player who made the bid. **Must be a value from `PLAYER_ROLES`**. |
| `decision` | `string` | No | The bidding decision. e.g., `"orderUp"`, `"pass"`, `"callTrump"`. |
| `suit` | `string` | Yes | The suit called as trump. Only present if `decision` is `"callTrump"`. **Must be a value from `CARD_SUITS`**. |
| `round` | `number` | No | The round of bidding in which the action was taken (1 or 2). |

---

## 5. The `TrickEntry` Object

Represents a single card played within a trick. Stored in the `GameState.currentTrick` array.

| Property | Type | Nullable | Valid Values / Notes |
| :--- | :--- | :--- | :--- |
| `playerRole` | `string` | No | The role of the player who played the card. **Must be a value from `PLAYER_ROLES`**. |
| `card` | `Card` | No | The `Card` object that was played. |

---

## 6. How an LLM Should Interpret This Schema

1.  **Direct Mapping:** This schema is a **direct, 1:1 representation** of the `GameState` object used in the codebase. When generating a function that accepts `gameState` as an argument, you must assume the object has exactly these top-level properties.

2.  **Implicit Concepts (Crucial):** Certain game concepts are not formal objects. You must assemble them from the properties available in `GameState`.
    *   **The "Team" Concept:** To get the full status of a team (e.g., `TEAM_NS`), you must combine data from three separate properties:
        *   **Total Score:** `gameState.teamScores['TEAM_NS']`
        *   **Tricks Won This Hand:** `gameState.tricksTaken['TEAM_NS']`
        *   **Players on Team:** Filter `gameState.players` for `Player` objects where `player.teamId === 'TEAM_NS'`.
    *   **The "Trick" Concept:** To understand the current trick, you must use two separate properties:
        *   **Cards Played:** `gameState.currentTrick` (an `Array<TrickEntry>`).
        *   **Lead Suit:** `gameState.leadSuit` (a `string`). The `leadSuit` is the authoritative source for the suit that must be followed.

3.  **Immutability:** The project's core architectural mandate is **immutability**. Any function that modifies the game state must **not** mutate the input `gameState` object. It must return a **new `GameState` object** containing the changes, typically created using an object spread (`{ ...gameState, ...changes }`).