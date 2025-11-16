# The Immutable Player Role Structure

## 1. The Core Concept: The Single Source of Truth

In the MuellerEuchre-Windsurf codebase, the `PLAYER_ROLES` array, defined in `src/config/constants.js`, is the **single, authoritative source of truth** for all logic related to player seating, team composition, and the clockwise flow of gameplay.

This design choice ensures that these fundamental game mechanics are **predictable, deterministic, and derived from one location**, eliminating the risk of data inconsistency that could arise from storing this information in multiple places (e.g., on individual player objects or in the game state).

---

## 2. The Canonical Definition

The entire structure is based on the following hardcoded and immutable array:

```javascript
// src/config/constants.js

export const PLAYER_ROLES = Object.freeze([
  'PLAYER_SOUTH', // Index 0
  'PLAYER_WEST',  // Index 1
  'PLAYER_NORTH', // Index 2
  'PLAYER_EAST'   // Index 3
]);
```

### Key Aspects of this Definition:

*   **`Object.freeze()`**: This is a deliberate and critical part of the definition. It makes the array's structure (the order and identity of the roles) **deeply immutable at runtime**. This prevents any accidental or malicious modification of the game's core seating arrangement.
*   **The Order is CRITICAL**: The specific order (`SOUTH`, `WEST`, `NORTH`, `EAST`) directly corresponds to the clockwise flow of play around a physical card table. All programmatic logic relies on this exact sequence.

---

## 3. How It's Used: Deriving Game Logic

The power of this design is that multiple complex game mechanics are derived mathematically from this simple, ordered array. This logic is primarily encapsulated in `src/utils/players.js`.

### 3.1. Deriving Clockwise Turn Order

The turn order is calculated by finding the current player's index and moving to the next one, wrapping around from the end to the beginning.

*   **Logic:** `nextPlayerIndex = (currentPlayerIndex + 1) % 4`
*   **Utility Function:** `getNextPlayer(currentPlayerRole)`
*   **Resulting Flow:**
    `PLAYER_SOUTH` → `PLAYER_WEST` → `PLAYER_NORTH` → `PLAYER_EAST` → `PLAYER_SOUTH`...

### 3.2. Deriving Fixed Partnerships

A player's partner is always the person two seats away in the rotation (directly across the table).

*   **Logic:** `partnerIndex = (playerIndex + 2) % 4`
*   **Utility Function:** `getPartner(playerRole)`
*   **Resulting Partnerships:**
    *   `PLAYER_SOUTH` (Index 0) ↔ `PLAYER_NORTH` (Index 2)
    *   `PLAYER_WEST` (Index 1) ↔ `PLAYER_EAST` (Index 3)

### 3.3. Deriving Team Assignments

Team assignments are derived based on a player's index being even or odd, which corresponds to the North/South and East/West axes.

*   **Logic:** `team = (playerIndex % 2 === 0) ? TEAMS.NS : TEAMS.EW`
*   **Resulting Teams:**

| Player Role    | Index | `index % 2` | Team        |
| :------------- | :---- | :---------- | :---------- |
| `PLAYER_SOUTH` | 0     | 0           | `TEAMS.NS`  |
| `PLAYER_WEST`  | 1     | 1           | `TEAMS.EW`  |
| `PLAYER_NORTH` | 2     | 0           | `TEAMS.NS`  |
| `PLAYER_EAST`  | 3     | 1           | `TEAMS.EW`  |

---

## 4. The Architectural Mandate: Why This Matters

This structure is not a setting; it is a **fundamental architectural constant**. For any developer or LLM working on this project, this concept has critical implications:

**DO:**
Always derive a player's team, partner, or the next player in the turn order programmatically using the utilities in `src/utils/players.js`. This is the only correct and safe way.

```javascript
// Correct Usage
import { getPartner, getNextPlayer } from '@/utils/players.js';

const southsPartner = getPartner('PLAYER_SOUTH'); // Always returns 'PLAYER_NORTH'
const nextTurnAfterWest = getNextPlayer('PLAYER_WEST'); // Always returns 'PLAYER_NORTH'
```

**DON'T:**
Never hardcode partnerships, teams, or turn order. Do not write logic that assumes this structure is configurable. A game state where `PLAYER_SOUTH` and `PLAYER_WEST` are considered partners is an **invalid and corrupt state**.

```javascript
// ANTI-PATTERN: This logic is fundamentally flawed in this project's architecture.
// It incorrectly assumes partnerships could change.
function isInvalidTeammateCheck(playerA, playerB) {
  if (playerA.role === 'PLAYER_SOUTH' && playerB.role === 'PLAYER_WEST') {
    return true; // This check is redundant and brittle. Use isTeammate() instead.
  }
}
```

---

## 5. Implications for Debugging

This single source of truth provides a powerful tool for debugging:

*   **Turn Order Bugs:** If the game advances to the wrong player, the problem is not in the core rotation logic. The bug lies in the `gameState` that was passed *to* `getNextPlayer()`—likely an incorrect `currentPlayer` or an improper handling of the `goingAlone` state.
*   **Team/Scoring Bugs:** If a trick is awarded to the wrong team, it is not because the team definitions are wrong. It indicates a deeper issue, such as the `trickWinner` being misidentified or the `gameState.players` object becoming corrupted.

---

### See Also:
*   **Implementation:** [`src/config/constants.js`](../../src/config/constants.js)
*   **Utility Functions:** [`src/utils/players.js`](../../src/utils/players.js)
*   **Related Concept:** [`The Fixed Seating and Partnership Logic`](./The_Fixed_Seating_and_Partnership_Logic.md)
---

## 6. Special Cases and Advanced Logic

### The "Go Alone" Special Case: Skipping a Player

The turn order logic has a critical exception: when a player "goes alone." In this scenario, the partner of the lone player sits out for the entire hand and does not participate in bidding or playing cards.

The getNextPlayer() function is explicitly designed to handle this special case.

\\\javascript
// src/utils/players.js
function getNextPlayer(
  currentPlayerRole,
  playerSlots = PLAYER_ROLES,
  goingAlone = false,
  partnerSittingOut = null,
) {
  // ... index calculation ...
  let nextPlayer = playerSlots[nextIndex];

  // If going alone, and the next player is the one sitting out, skip them.
  if (goingAlone && partnerSittingOut && nextPlayer === partnerSittingOut) {
    nextIndex = (nextIndex + 1) % playerSlots.length;
    nextPlayer = playerSlots[nextIndex];
  }

  return nextPlayer;
}
\\\

As shown in the implementation, the function checks the goingAlone and partnerSittingOut flags from the gameState. If the next player in the standard rotation is the one sitting out, the function performs the rotation logic a second time to skip them and pass the turn to the following player.

**Example Turn Order (South Goes Alone):**
*   **Maker:** PLAYER_SOUTH
*   **Partner Sitting Out:** PLAYER_NORTH
*   **Standard Order:** South ? West ? North ? East
*   **Modified "Go Alone" Order:** South ? West ? **(skip North)** ? East ? South...

This conditional logic ensures that the turn flow remains correct during a "loner" hand.

---
