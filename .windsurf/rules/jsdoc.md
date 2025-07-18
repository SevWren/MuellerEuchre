---
trigger: model_decision
description: When working with complex files.
---

JSDoc Best Practices for the Euchre Project

This ruleset outlines the mandatory JSDoc techniques for documenting the Euchre project. Proper documentation is critical for maintaining Layer 1 purity, enabling test-driven development with `node:test`, and ensuring clarity across the layered architecture. Consistent and detailed JSDoc provides a structured format that is easily understood by both developers and AI assistants, aligning with the project's development standards.

### 1. Basic Function Documentation (`@param`, `@returns`)

This is the foundational technique for describing a function's contract. For this project, it's essential for documenting pure Layer 1 functions that operate on game state.

**The Technique:**
Use `@param {type} name - Description` for each parameter and `@returns {type} - Description` for the return value. All Layer 1 functions that transform state must document their inputs and outputs.

**Example (Based on `constants-import-usage-guide.md`):**
```javascript
import {
  GAME_PHASES,
  PLAYER_POSITIONS,
  CARD_VALUES,
  CARD_SUITS,
  TEAMS
} from '@/config/constants';

/**
 * Creates the initial state object for a new game. This is a pure function.
 *
 * @param {{ team: string }} player - The player object, containing their team.
 * @returns {{phase: string, dealer: string, cards: any[], trump: string}} A new state fragment.
 */
function setupInitialState(player) {
  // Access the prefixed property from the imported `TEAMS` object.
  if (player.team === TEAMS.TEAM_NS) {
    // ... team logic
  }

  // Prefixed constants are explicit and unambiguous.
  return {
    phase: GAME_PHASES.GAME_PHASE_LOBBY,
    dealer: PLAYER_POSITIONS.PLAYER_SOUTH,
    cards: CARD_VALUES,
    trump: CARD_SUITS.CARD_SUIT_HEARTS,
  };
}
```

**Why it's useful:**
*   **Architectural Compliance:** Clearly states the function's contract, aligning with Layer 1 purity rules.
*   **Type Safety:** Provides IntelliSense and allows static analysis tools to catch errors.
*   **Clarity:** A developer immediately understands the function's purpose without reading its implementation.

---

### 2. Defining Complex Objects with In-Place `@typedef`

Since the project doesn't have a central `types.js`, the most effective way to document complex objects like `gameState` is to define their structure with `@typedef` directly in the file where they are most relevant, or above the functions that use them.

**The Technique:**
Use `@typedef {object} TypeName` and `@property` to define the structure of a complex object. This definition should be placed in the JSDoc block of a function or at the top of a file.

**Example (A hypothetical `src/game/phases/dealPhase.js`):**
```javascript
import { GAME_PHASES, PLAYER_POSITIONS } from '@/config/constants';

/**
 * Represents the state of a Euchre game.
 * @typedef {object} GameState
 * @property {string} gameId - The unique identifier for the game.
 * @property {string} phase - The current phase, e.g., GAME_PHASES.GAME_PHASE_DEAL.
 * @property {string} dealer - The position of the current dealer.
 * @property {object<string, {hand: object[]}>} players - An object mapping player positions to player data.
 * @property {object[]} deck - The array of cards remaining in the deck.
 */

/**
 * Deals cards to players and updates the game state. This is a pure function.
 *
 * @param {GameState} gameState - The current, immutable game state before dealing.
 * @returns {GameState} A new game state object with cards dealt and phase updated.
 */
function dealCards(gameState) {
  // Per "Rules_Enforcing Purity in Layer 1", we must work on a clone.
  const newGameState = JSON.parse(JSON.stringify(gameState));

  // ... pure logic to deal cards from newGameState.deck to newGameState.players ...
  newGameState.phase = GAME_PHASES.GAME_PHASE_BIDDING;
  
  return newGameState;
}
```

**Why it's useful:**
*   **Contextual Clarity:** The structure of `GameState` is defined right where it's being used, making it easy to understand.
*   **Scoped Documentation:** Avoids the need for a non-existent global types file while still providing rich autocompletion.
*   **Maintainability:** When logic in `dealPhase.js` changes, its expected `GameState` structure can be updated in the same file.

---

### 3. Documenting Dependency Injection for Tests

The project mandates a specific dependency injection pattern for testing. JSDoc is crucial for documenting the `dependencies` object required by the mock factory, as specified in `dependency-injection.md`.

**The Technique:**
Use an inline object definition `{{key: Type}}` within a `@param` tag to describe the shape of the dependencies object for a `create...` test factory.

**Example (Based on `dependency-injection.md` and `test/__mocks__/`):**
```javascript
import * as realPlayerUtils from '../../src/utils/players.js';
import * as realDeckUtils from '../../src/utils/deck.js';

/**
 * Factory to create a testable instance of a game phase function with injectable dependencies.
 *
 * @param {{
 *   getPartner?: function(string): string,
 *   getWinningCard?: function(object[]): object
 * }} [dependencies] - An object with mock implementations for dependent utils.
 * @returns {function(object, object): object} The configured pure function for testing.
 */
export function createPhaseWithDeps({
  getPartner = realPlayerUtils.getPartner,
  getWinningCard = realDeckUtils.getWinningCard
} = {}) {
  // This returned function is the "Subject Under Test"
  return function handlePhaseLogic(gameState, payload) {
    const partner = getPartner(payload.playerId);
    const winningCard = getWinningCard(gameState.currentTrick);
    // ... logic that uses the injected dependencies
    return newGameState;
  };
}
```

**Why it's useful:**
*   **Testability:** Makes it obvious which functions need to be mocked to properly isolate the unit under test.
*   **Clarity for Testers:** Anyone writing a test can see the exact "seams" available for injecting test doubles.
*   **Adheres to DI Rules:** Aligns perfectly with the project's `dependency-injection.md` mandate.

---

### 4. Creating Types from Constants (`@typedef`, `keyof typeof`)

Instead of importing types from a non-existent file, you can create new, powerful types directly from your existing constants objects. This is an advanced technique that works perfectly with the structure in `constants.js`.

**The Technique:**
Import a constant object (like `GAME_PHASES`) and use `keyof typeof` to create a type that represents one of its keys. This ensures your types are always in sync with your constants.

**Example (in a file using constants):**
```javascript
import { GAME_PHASES } from '../../config/constants.js';

/**
 * A type representing one of the valid game phase strings.
 * This is created directly from the keys of the GAME_PHASES constant object.
 * @typedef {keyof typeof GAME_PHASES} GamePhase
 */

/**
 * Transitions the game to a new phase.
 * @param {object} gameState - The current game state.
 * @param {GamePhase} nextPhase - The phase to transition to. Must be a valid phase from GAME_PHASES.
 * @returns {object} The updated game state.
 */
function transitionToPhase(gameState, nextPhase) {
  const newGameState = { ...gameState };
  // The 'nextPhase' parameter is now type-checked against the keys of GAME_PHASES.
  newGameState.phase = GAME_PHASES[nextPhase];
  return newGameState;
}
```
**Why it's useful:**
*   **Always in Sync:** If you add a new phase to `constants.js`, the `GamePhase` type automatically includes it. No need to update docs elsewhere.
*   **DRY & Robust:** Leverages your existing code (constants) to create documentation and type safety.
*   **Correctness:** This pattern correctly uses a real, existing file (`constants.js`) as the source of truth.

---

### 5. Mandatory Reference Tracking with `@see`

Per `Rules_Overall.md`, this is a project-specific mandate to track a function's usage, which is critical for understanding the impact of changes.

**The Technique:**
For any non-trivial exported function, add a `@see` tag for **every file** that calls or references it. This creates a manual but explicit dependency map within the code itself.

**Example (Based on the `goAlonePhase.edge.unit.test.js` examples):**
```javascript
// In a file like 'src/utils/players.js'

/**
 * Retrieves the partner of a given player.
 * @param {string} playerId - The ID of the player (e.g., PLAYER_SOUTH).
 * @returns {string} The ID of the partner player (e.g., PLAYER_NORTH).
 * @see src/game/phases/goAlonePhase.js
 * @see test/game/phases/goAlonePhase.edge.unit.test.js
 */
export function getPartner(playerId) {
  // ... implementation ...
}
```

**Why it's useful:**
*   **Impact Analysis:** Before changing `getPartner`, a developer can instantly see which files depend on it and must be checked or tested.
*   **Code Navigation:** Provides quick "links" to related parts of the codebase, improving discoverability.
*   **Architectural Enforcement:** Makes dependencies explicit, helping to prevent architectural violations.