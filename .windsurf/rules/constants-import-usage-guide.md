---
trigger: glob
globs: src/**/*.js,test/**/*.js
---

# Proper Usage of Game Constants (constants.js)
# tags: javascript, constants, refactor, style, euchre

# description
This rule enforces the use of the new, prefixed constants from `constants.js` and discourages the use of legacy, non-prefixed aliases. The constants file has been updated to use a consistent naming convention (e.g., `GAME_PHASE_LOBBY` instead of `LOBBY`) to improve clarity and prevent naming collisions across the application.

# rationale
Using the prefixed constant names provides several key benefits:
1.  **Clarity & Self-Documentation**: A constant like `GAME_PHASE_LOBBY` is far more descriptive and less ambiguous than a generic name like `LOBBY`. It immediately tells the reader its category and purpose.
2.  **Avoids Naming Collisions**: Generic names like `PASS`, `ERROR`, or `SOUTH` can easily conflict with local variables or other imported modules. The prefixed versions (e.g., `BID_DECISION_PASS`, `LOG_LEVEL_ERROR`, `PLAYER_POSITIONS.PLAYER_SOUTH`) are unique and prevent such conflicts.
3.  **Code Consistency**: Enforcing a single, consistent naming scheme makes the codebase easier to read, search, and maintain for all developers.
4.  **Future-Proofing**: The non-prefixed aliases are maintained for backward compatibility and may be deprecated or removed in the future. Adopting the new standard ensures your code is aligned with the project's direction.

# examples

### ❌ Before
The following code incorrectly imports and uses legacy, non-prefixed constants. These are harder to understand out of context and risk naming collisions.

```javascript
// Incorrectly imports and uses legacy, non-prefixed constants.
import { SUITS, LOBBY, NS, VALUES, SOUTH, STATE_UPDATE } from '@/config/constants';

function setupInitialState(player) {
  if (player.team === NS) {
    // ... team logic
  }

  // 'LOBBY' is generic and could be confused with other variables.
  return {
    phase: LOBBY,
    dealer: SOUTH,
    cards: VALUES,
    trump: SUITS.HEARTS,
  };
}

function handleSocketEvent(eventName) {
    if (eventName === STATE_UPDATE) {
        // ... logic for state update
    }
}
```

### ✅ After
The corrected code imports the modern, prefixed constants. Notice how the imports are clearer and the usage is more explicit and unambiguous.

```javascript
// Correctly imports and uses the preferred, prefixed constants.
import {
  CARD_SUITS,
  GAME_PHASES,
  TEAMS,
  PLAYER_POSITIONS,
  CARD_VALUES,
  GAME_EVENTS
} from '@/config/constants';

function setupInitialState(player) {
  // Access the prefixed property from the imported `TEAMS` object.
  if (player.team === TEAMS.TEAM_NS) {
    // ... team logic
  }

  // Prefixed constants are explicit and unambiguous.
  return {
    phase: GAME_PHASES.GAME_PHASE_LOBBY,
    dealer: PLAYER_POSITIONS.PLAYER_SOUTH,
    cards: CARD_VALUES, // The preferred export name is CARD_VALUES
    trump: CARD_SUITS.CARD_SUIT_HEARTS,
  };
}

function handleSocketEvent(eventName) {
    if (eventName === GAME_EVENTS.GAME_EVENT_STATE_UPDATE) {
        // ... logic for state update
    }
}
```