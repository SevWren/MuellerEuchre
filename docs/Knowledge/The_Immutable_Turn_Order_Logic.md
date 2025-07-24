# The Immutable Turn Order Logic

## 1. Core Concept: Clockwise Rotation

The flow of play in Euchre is governed by a simple, immutable rule: the turn to bid or play a card always proceeds **clockwise** around the table. This sequence is determined by the fixed seating arrangement of the four players (South, West, North, East).

This principle is a foundational constant of the game's logic and is programmatically enforced to ensure predictable and correct gameplay. The turn order is not a configurable setting; it is an inherent part of the game's structure.

---

## 2. The Programmatic Model: A Single Source of Truth

The entire logic for turn order is derived from one authoritative source: the `PLAYER_ROLES` array in `src/config/constants.js`.

```javascript
// src/config/constants.js

export const PLAYER_ROLES = Object.freeze([
  'PLAYER_SOUTH', // Index 0
  'PLAYER_WEST',  // Index 1
  'PLAYER_NORTH', // Index 2
  'PLAYER_EAST'   // Index 3
]);
```

The order of this array defines the clockwise rotation. All turn progression logic is handled by a single, dedicated utility function that consumes this array: `getNextPlayer()` in `src/utils/players.js`.

---

## 3. The Standard Turn Order

In a standard hand where all four players are participating, the `getNextPlayer()` function implements a simple mathematical rotation.

-   **Logic:** `nextPlayerIndex = (currentPlayerIndex + 1) % 4`

This formula takes the index of the current player, increments it by one, and uses the modulo operator to wrap around from the last player (index 3) back to the first (index 0).

This results in the following predictable, clockwise turn order:

**`PLAYER_SOUTH` → `PLAYER_WEST` → `PLAYER_NORTH` → `PLAYER_EAST` → `PLAYER_SOUTH`...**

This standard logic is applied during both rounds of bidding and for each of the five tricks in the playing phase.

---

## 4. The "Go Alone" Special Case: Skipping a Player

The turn order logic has a critical exception: when a player "goes alone." In this scenario, the partner of the lone player sits out for the entire hand and does not participate in bidding or playing cards.

The `getNextPlayer()` function is explicitly designed to handle this special case.

```javascript
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
```

As shown in the implementation, the function checks the `goingAlone` and `partnerSittingOut` flags from the `gameState`. If the next player in the standard rotation is the one sitting out, the function performs the rotation logic a second time to skip them and pass the turn to the following player.

**Example Turn Order (South Goes Alone):**
*   **Maker:** `PLAYER_SOUTH`
*   **Partner Sitting Out:** `PLAYER_NORTH`
*   **Standard Order:** South → West → North → East
*   **Modified "Go Alone" Order:** South → West → **(skip North)** → East → South...

This conditional logic ensures that the turn flow remains correct during a "loner" hand.

---

## 5. Architectural Mandate: Centralized Logic

For any developer or LLM working on this codebase, it is crucial to understand that `getNextPlayer()` is the **single source of truth for all turn progression**.

-   The turn order is **immutable** and is not configurable.
-   All game phases that require turn progression **must** use this utility function.

**DO:**
Always determine the next player by calling the utility.
```javascript
// Correct usage in a game phase module
import { getNextPlayer } from '@/utils/players.js';

function advanceTurn(gameState) {
  const nextPlayer = getNextPlayer(
    gameState.currentPlayer,
    PLAYER_ROLES,
    gameState.goingAlone,
    gameState.partnerSittingOut
  );
  
  // Return new state with updated currentPlayer
  return { ...gameState, currentPlayer: nextPlayer };
}
```

**DON'T:**
Never implement custom or redundant turn order logic within a game phase. This is an anti-pattern that will lead to bugs and inconsistencies.
```javascript
// ANTI-PATTERN: This logic is a bug waiting to happen.
function advanceTurnIncorrectly(gameState) {
  const currentIndex = PLAYER_ROLES.indexOf(gameState.currentPlayer);
  const nextPlayer = PLAYER_ROLES[(currentIndex + 1) % 4];
  // This fails to account for the "go alone" scenario.
  
  return { ...gameState, currentPlayer: nextPlayer };
}
```

---

## 6. Implications for Development and Debugging

This centralized and deterministic approach significantly simplifies development and debugging.

1.  **Reliability:** Since the core rotation logic is encapsulated in one well-tested function, developers can trust that the turn order will be handled correctly as long as the function is called with the proper inputs.

2.  **Debugging:** If a bug related to turn order occurs (e.g., a player is skipped incorrectly, or the turn gets stuck), the problem is almost certainly **not within the `getNextPlayer()` function itself**. The bug will be in the **`gameState` being passed to it**.

    **Debugging Checklist:**
    *   Is the `gameState.currentPlayer` correct *before* calling `getNextPlayer()`?
    *   If a player is going alone, are the `gameState.goingAlone` and `gameState.partnerSittingOut` flags set correctly *before* the call?
    *   Is the code in the calling module (e.g., `biddingPhase.js` or `playingPhase.js`) correctly updating its state with the value returned by `getNextPlayer()`?