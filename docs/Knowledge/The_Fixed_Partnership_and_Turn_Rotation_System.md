# The Fixed Partnership and Turn Rotation System

## 1. Core Concept: The Euchre Table is Fixed

The entire logical structure of the MuellerEuchre-Windsurf application is built upon the foundational rule of a standard four-player Euchre game: the seating arrangement is fixed, and partnerships are non-negotiable. Players are assigned to cardinal directions (South, West, North, East), and their partner is always the player seated directly across from them.

This design choice is not a configurable setting; it is a hardcoded architectural mandate that ensures logical consistency throughout the entire game lifecycle, from dealing to scoring. Understanding this system is critical for any developer or AI working on the codebase.

## 2. The Unchanging Partnership Rule

The two teams in this implementation are always:
*   **Team North/South (NS):** The player in the `PLAYER_SOUTH` position is always partnered with the player in the `PLAYER_NORTH` position.
*   **Team East/West (EW):** The player in the `PLAYER_WEST` position is always partnered with the player in the `PLAYER_EAST` position.

This structure is immutable for the duration of a game. Any logic that attempts to create or validate a game state with different partnerships (e.g., South partnered with West) is fundamentally incompatible with the application's architecture.

## 3. The Programmatic Implementation (Codebase Deep Dive)

This fixed system is enforced programmatically through a single source of truth in `constants.js` and a set of utility functions in `players.js` that interpret this data.

### 3.1 The Single Source of Truth: `src/config/constants.js`

The `PLAYER_ROLES` array is the bedrock of this entire system. Its specific, unchanging order dictates both partnerships and turn rotation.

```javascript
// src/config/constants.js

export const PLAYER_ROLES = Object.freeze([
  'PLAYER_SOUTH',  // Index 0
  'PLAYER_WEST',   // Index 1
  'PLAYER_NORTH',  // Index 2
  'PLAYER_EAST'    // Index 3
]);

export const TEAMS = Object.freeze({
  TEAM_NS: 'TEAM_NS', // North/South team
  TEAM_EW: 'TEAM_EW'  // East/West team
});
```

The mathematical relationship between array indices is what defines the game's structure:

| Index | Role | Partner (Index + 2) % 4 | Next Player (Index + 1) % 4 | Team |
| :--- | :--- | :--- | :--- | :--- |
| 0 | `PLAYER_SOUTH` | `PLAYER_NORTH` (Index 2) | `PLAYER_WEST` (Index 1) | `TEAM_NS` |
| 1 | `PLAYER_WEST` | `PLAYER_EAST` (Index 3) | `PLAYER_NORTH` (Index 2) | `TEAM_EW` |
| 2 | `PLAYER_NORTH` | `PLAYER_SOUTH` (Index 0) | `PLAYER_EAST` (Index 3) | `TEAM_NS` |
| 3 | `PLAYER_EAST` | `PLAYER_WEST` (Index 1) | `PLAYER_SOUTH` (Index 0) | `TEAM_NS` |

### 3.2 The Logic Engine: `src/utils/players.js`

Several key utility functions rely entirely on the fixed order of the `PLAYER_ROLES` array.

#### `getPartner(playerRole)`
This function calculates a player's partner using simple array arithmetic. It finds the index of the given `playerRole` and adds 2 (modulo 4) to find the role of the player sitting directly across.

*   **Example:** `getPartner('PLAYER_SOUTH')