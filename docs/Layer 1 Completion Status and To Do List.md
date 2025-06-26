### Layer 1 Completion Status & To-Do List

This list outlines the status of all files required for a complete Layer 1, comparing their current state to the needs of a fully functional 4-person online multiplayer Euchre game. "100% Complete" means the file's logic is sound and it has a comprehensive unit test suite.

---

*   **`src/config/constants.js` - 100%**
    *   **To-Do:** None. This file is a complete set of constants for core game logic.

*   **`src/config/database.js` - 100%**
    *   **To-Do:** None. This configuration file is complete for its Layer 1 purpose.

*   **`src/game/logic/validation.js` - 100%**
    *   **To-Do:** None. This file is the project's best example of a complete Layer 1 module, with robust logic and a full unit test suite.

*   **`src/utils/errorUtils.js` - 100%**
    *   **To-Do:** None. This simple utility is fully tested and complete.

*   **`src/utils/players.js` - 65%**
    *   **To-Do:** The existing tests for `initializePlayers` are a good start, but critical functions are untested.
        1.  **Enhance `getNextPlayer`:** Modify the function to accept the `gameState.players` object and correctly skip players who are marked as `isConnected: false`.
        2.  **Expand Unit Tests:** Add tests for `isTeammate`, `getPartner`, `getPlayerBySocketId`, `getRoleBySocketId`, and the enhanced `getNextPlayer` (including the "skip disconnected" logic).

*   **`src/game/logic/errors.js` - 50%**
    *   **To-Do:** The error classes are functionally complete but have no unit tests.
        1.  **Create `test/game/logic/errors.unit.test.js`**.
        2.  For each custom error, write tests to verify its `name`, `message`, inheritance from `Error`, and any custom properties.

*   **`src/utils/deck.js` - 50%**
    *   **To-Do:** This is a high-priority gap. The logic is critical but completely untested.
        1.  **Create `test/utils/deck.unit.test.js`**.
        2.  Write comprehensive tests for `getCardRank`, covering all bower, trump, and off-suit scenarios.
        3.  Add tests for `createDeck`, `shuffleDeck`, `isRightBower`, `isLeftBower`, and `sortHand`.

*   **`src/utils/lobbyUtils.js` - 50%**
    *   **To-Do:** The pure functions for lobby management are untested.
        1.  **Create `test/utils/lobbyUtils.unit.test.js`**.
        2.  Add tests for `assignRoleToPlayer`, `isLobbyFull`, and `getNextAvailableRole` covering various lobby states.

*   **`src/utils/logger.js` - 50%**
    *   **To-Do:** The logger's initialization logic is untested.
        1.  **Create `test/utils/logger.unit.test.js`**.
        2.  Write tests to verify that `process.env` variables correctly set the log level.
        3.  Test the `log` compatibility wrapper to ensure it calls the correct underlying `pino` methods.

*   **`src/game/logic/aiLogic.js` - 0% (Missing File)**
    *   **To-Do:** This is a critical missing piece for a functional online game.
        1.  **Create `src/game/logic/aiLogic.js`** to house pure, stateless AI logic.
        2.  Implement `chooseBid(hand, ...)` and `chooseCardToPlay(hand, ...)` functions.
        3.  Create a corresponding `test/game/logic/aiLogic.unit.test.js` to validate the AI's decisions under various scenarios.

*   **`src/utils/settingsUtils.js` - 0% (Missing File)**
    *   **To-Do:** A full game needs configurable rules.
        1.  **Create `src/utils/settingsUtils.js`**.
        2.  Implement `getDefaultSettings()` and `validateSettings(customSettings)` to handle game options like winning score.
        3.  Create a corresponding `test/utils/settingsUtils.unit.test.js`.

*   **`src/utils/statsUtils.js` - 0% (Missing File)**
    *   **To-Do:** While not essential for gameplay, stats are a core feature of card games. The pure calculation logic belongs in Layer 1.
        1.  **Create `src/utils/statsUtils.js`**.
        2.  Implement pure functions like `calculateHandStats(gameState)` to derive statistics from game data.
        3.  Create a corresponding `test/utils/statsUtils.unit.test.js`.

*   **`src/utils/historyUtils.js` - 0% (Missing File)**
    *   **To-Do:** To provide a clear game log, a dedicated utility is needed to format game events into human-readable messages.
        1.  **Create `src/utils/historyUtils.js`**.
        2.  Implement a `createHistoryEntry(action, details)` factory function to standardize game messages.
        3.  Create a corresponding `test/utils/historyUtils.unit.test.js`.

*   **`src/utils/idGenerator.js` - 0% (Missing File)**
    *   **To-Do:** Replace ad-hoc ID generation with a centralized, robust utility.
        1.  **Create `src/utils/idGenerator.js`**.
        2.  Implement `generateGameId()` to create a more reliable unique ID than the current method.
        3.  Create a corresponding `test/utils/idGenerator.unit.test.js`.

*   **`src/config/locales/en.json` & `src/utils/i18n.js` - 0% (Missing Files)**
    *   **To-Do:** For a production-quality game, all user-facing strings should be externalized for internationalization.
        1.  **Create `src/config/locales/en.json`** to store English strings.
        2.  **Create `src/utils/i18n.js`** with a `t(key, replacements)` function to look up and format strings.
        3.  Create a corresponding `test/utils/i18n.unit.test.js`.