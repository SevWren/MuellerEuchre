# The Fixed Seating and Partnership Logic

## 1. Core Concept: The Cardinal Directions

In Euchre, the game is always played by four players in a fixed seating arrangement. These seats correspond to the cardinal directions: **North, South, East, and West**. This structure is fundamental to the game and defines both the teams and the flow of play.

-   **Partnerships are fixed and are always across the table.**
-   **The North/South (NS) Team:** The player in the North seat is always partners with the player in the South seat.
-   **The East/West (EW) Team:** The player in the East seat is always partners with the player in the West seat.

This structure is a non-negotiable rule of the game and, therefore, a hardcoded architectural constant in this codebase.

---

## 2. The Programmatic Model: A Single Source of Truth

The entire logic for seating, partnerships, and turn order is derived from a single, authoritative source: the `PLAYER_ROLES` array in `src/config/constants.js`.

```javascript
// src/config/constants.js

export const PLAYER_ROLES = Object.freeze([
  'PLAYER_SOUTH', // Index 0
  'PLAYER_WEST',  // Index 1
  'PLAYER_NORTH', // Index 2
  'PLAYER_EAST'   // Index 3
]);
```

The order of this array is **CRITICAL**. It defines the clockwise rotation of play and the mathematical relationship between partners. It must not be altered.

---

## 3. Deriving Partnerships and Teams (`src/utils/players.js`)

Instead of storing team and partner information redundantly on various objects, the codebase derives these relationships programmatically from the `PLAYER_ROLES` array. This is primarily handled by utility functions in `src/utils/players.js`.

### `getPartner(playerRole)`

This function calculates a player's partner based on their index in the `PLAYER_ROLES` array. The logic is simple and deterministic: a partner is always two seats away.

-   **Logic:** `partnerIndex = (playerIndex + 2) % 4`

### `isTeammate(player1Role, player2Role)`

This function checks if two players belong to the same partnership axis (North/South or East/West) by determining if they are partners.

### Player and Team Mapping

The fixed structure results in the following predictable mapping:

| Player Role    | Index | Partner        | Team        |
| :------------- | :---- | :------------- | :---------- |
| `PLAYER_SOUTH` | 0     | `PLAYER_NORTH` | `TEAMS.NS`  |
| `PLAYER_WEST`  | 1     | `PLAYER_EAST`  | `TEAMS.EW`  |
| `PLAYER_NORTH` | 2     | `PLAYER_SOUTH` | `TEAMS.NS`  |
| `PLAYER_EAST`  | 3     | `PLAYER_WEST`  | `TEAMS.EW`  |

---

## 4. The Gameplay Implication: Turn Order

The fixed seating arrangement also defines the immutable, clockwise flow of play. This logic is encapsulated in the `getNextPlayer()` utility function in `src/utils/players.js`.

-   **Logic:** `nextPlayerIndex = (currentPlayerIndex + 1) % 4`

This results in a predictable turn order that always follows the sequence of the `PLAYER_ROLES` array:

**South → West → North → East → South...**

The `getNextPlayer()` function is also aware of the "Go Alone" game state and will correctly skip the `partnerSittingOut` to maintain the correct turn order during a "loner" hand.

---

## 5. Architectural Mandate: This Structure is Immutable

For any developer or LLM interacting with this codebase, it is essential to understand that the partnership and seating structure is a fixed, architectural constant.

-   Player partnerships are **always** determined by their seat.
-   The `PLAYER_ROLES` array in `constants.js` is the **single source of truth** for this structure.
-   This structure is **not a configurable setting**. Any part of the application that attempts to treat it as such is fundamentally incorrect.
-   A game state where `PLAYER_SOUTH` and `PLAYER_WEST` are considered partners is an **invalid and corrupt state**.

**DO:**
Always derive a player's team or partner from their role using the provided utilities.
```javascript
import { getPartner } from '@/utils/players.js';
import { TEAMS } from '@/config/constants.js';

const southsPartner = getPartner('PLAYER_SOUTH'); // Correctly returns 'PLAYER_NORTH'
const southsTeam = TEAMS.NS;
```

**DON'T:**
Never write logic that assumes configurable or dynamic partnerships. This is an anti-pattern in this codebase.
```javascript
// ANTI-PATTERN: This logic is fundamentally flawed in this project's architecture.
if (gameState.settings.teamConfig === 'south-west-vs-north-east') {
    // This entire block of code is invalid because this state is impossible.
}
```

---

## 6. Implications for Development and Debugging

This fixed structure simplifies development and provides clear guideposts for debugging.

1.  **Data Normalization:** You do not need to pass a `teamId` to every function. If a function has access to a player's `role`, it can always determine their team and partner.
2.  **Debugging Turn Order:** If the turn order is incorrect, the bug is almost certainly located in the *inputs* to `getNextPlayer()` (i.e., an incorrect `currentPlayer`, `goingAlone`, or `partnerSittingOut` value was passed), not in the fundamental clockwise rotation logic.
3.  **Validating Game State:** If you encounter a bug where players on the same physical side of the table (e.g., South and West) are scoring points for the same team, it indicates a critical data corruption issue in how the `gameState` is being managed, not a simple miscalculation.