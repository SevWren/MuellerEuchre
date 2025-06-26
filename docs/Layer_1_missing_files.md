### Missing Files & Functionality for a Complete Layer 1

The following files do not currently exist but are essential for a complete and robust Layer 1.

#### 1. Core Game Logic

*   **File Path:** `src/game/logic/aiLogic.js`
*   **Purpose:** To provide a stateless, predictable AI to take over for disconnected players. A game cannot function if a player disconnects mid-hand without a fallback. This AI logic must be pure (taking game state as input and returning a decision) to be testable and part of Layer 1.
*   **Key Functions / Contents:**
    *   `chooseBid(hand, turnCard, isDealer, bids)`: A function that analyzes a hand and the game situation to decide whether to order up, pass, or call a suit.
    *   `chooseDiscard(hand)`: A function that determines the least valuable card in a 6-card hand to discard.
    *   `chooseCardToPlay(hand, trick, trumpSuit, ledSuit)`: The most critical AI function. It would analyze the current trick and the player's hand to select the optimal card to play, following all game rules.
*   **Layer 1 Justification:** The AI's decision-making is part of the game's core "business logic." By keeping it in a pure, stateless utility, it can be easily tested and separated from the higher-level logic that decides *when* to use the AI (which would be in Layer 3 or 4).

---

#### 2. Core Utilities

*   **File Path:** `src/utils/settingsUtils.js`
*   **Purpose:** To manage and validate game settings. A real-world game allows for host-configurable "house rules" (e.g., winning score, "stick the dealer"). This utility provides pure functions to handle these settings.
*   **Key Functions / Contents:**
    *   `getDefaultSettings()`: Returns a default game settings object (e.g., `{ winningScore: 10, stickTheDealer: true }`).
    *   `validateSettings(customSettings)`: Takes a settings object from a user and validates it. For example, it would ensure `winningScore` is a number between 5 and 20. It should return a boolean or throw an error on invalid settings.
    *   `mergeWithDefaults(customSettings)`: Merges a user's partial settings with the defaults to create a complete, valid settings object for a new game.
*   **Layer 1 Justification:** Game settings directly influence the rules and win conditions. The logic to validate and manage these settings is pure and foundational.

*   **File Path:** `src/utils/statsUtils.js`
*   **Purpose:** To calculate and process player and game statistics. While storing stats is a database concern (Layer 2/3), the pure calculation logic belongs in Layer 1.
*   **Key Functions / Contents:**
    *   `calculateHandStats(gameState)`: Takes a completed hand's `gameState` and returns an object detailing what happened (e.g., `{ makerTeam: 'NS', pointsScored: 2, wasEuchre: true, wentAlone: false }`).
    *   `updatePlayerStats(playerStats, handStats)`: Takes a player's current stats object and the results from `calculateHandStats` to return a new, updated stats object (e.g., incrementing wins, losses, euchres, etc.).
*   **Layer 1 Justification:** The logic for deriving statistics from game data is a pure data transformation, making it a perfect fit for a Layer 1 utility.

*   **File Path:** `src/utils/historyUtils.js`
*   **Purpose:** To create structured, human-readable log entries for the game flow. The `gameMessages` array is a simple implementation; a more robust system would use a dedicated utility to generate these entries.
*   **Key Functions / Contents:**
    *   `createHistoryEntry(action, details)`: A factory function that takes a game action (e.g., `'PLAY_CARD'`, `'CALL_TRUMP'`) and a details object (`{ player, card, suit }`) and returns a standardized history object: `{ timestamp, message, action, details }`.
    *   `formatHistory(historyArray)`: A function that could take an array of history objects and format it into a human-readable game log.
*   **Layer 1 Justification:** Generating consistent, structured log data from game events is a pure utility function. It standardizes how game events are described.

*   **File Path:** `src/utils/idGenerator.js`
*   **Purpose:** To create more robust and potentially human-readable unique IDs for games and players, rather than relying on `Date.now()` and `Math.random()`.
*   **Key Functions / Contents:**
    *   `generateGameId()`: Could generate a short, memorable ID like "blue-dog-7" or a standard UUID.
    *   `generatePlayerId()`: Could generate a UUID for a persistent player identity.
*   **Layer 1 Justification:** ID generation is a fundamental, stateless utility. Centralizing it makes the ID strategy consistent and easy to change.

---

#### 3. Configuration & Data

*   **File Path:** `src/config/locales/en.json` (and other language files like `es.json`)
*   **Purpose:** To store all user-facing strings for internationalization (i18n). A robust application should not have hardcoded strings like "Not your turn" or "Game Over!" in the logic files.
*   **Key Functions / Contents:** This would be a JSON file, not a `.js` file.
    *   Example content: `{ "error_not_your_turn": "It is not your turn to play.", "game_over_message": "Game Over! {winner} wins!" }`
*   **Layer 1 Justification:** This is configuration data that the core logic would depend on.

*   **File Path:** `src/utils/i18n.js`
*   **Purpose:** A utility to retrieve and format localized strings from the locale files.
*   **Key Functions / Contents:**
    *   `t(key, replacements)`: A function that takes a key (e.g., `'error_not_your_turn'`) and an optional object of replacements (e.g., `{ winner: 'Team NS' }`) to return the final, formatted string in the currently selected language.
*   **Layer 1 Justification:** This is a pure utility for string manipulation and data retrieval, essential for making the game's output maintainable and translatable.