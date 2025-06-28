# layer-1-purity.md

### **Step-by-Step Task: Enforce Layer 1 Purity**

This task focuses on refactoring specific Layer 1 files (`src/game/phases/*.js`) to ensure their functions are strictly pure. This means they will:
1.  Take `currentGameState` (or relevant parts) as an input argument.
2.  Perform calculations or transformations on a **deep clone** of that input.
3.  **Return a brand new state object** reflecting the changes.
4.  **NEVER** call `updateGameState` from `src/game/state.js`.
5.  **NEVER** directly interact with `gameRepository.js` (Layer 5).

---

#### **Task 1: Refactor `src/game/phases/biddingPhase.js`**

*   **Goal:** Ensure `handleOrderUpDecision`, `handleDealerDiscard`, and `handleCallTrumpDecision` are pure by removing unused `updateGameState` import.
*   **Affected Function(s):** `handleOrderUpDecision`, `handleDealerDiscard`, `handleCallTrumpDecision`
*   **Action(s):**
    1.  Open `src/game/phases/biddingPhase.js`.
    2.  **Remove the import statement:**
        ```javascript
        // Remove this line:
        import { updateGameState } from '../state.js';
        ```
    3.  **Verification:** Confirm that after removing the import, the file still functions correctly (it should, as the `updateGameState` call was not actually present in these functions; only the import was). The functions already return new state objects.

---

#### **Task 2: Refactor `src/game/phases/playingPhase.js`**

*   **Goal:** Make `handlePlayCard` a pure function that returns a new state object, instead of calling `updateGameState`.
*   **Affected Function(s):** `handlePlayCard`
*   **Action(s):**
    1.  Open `src/game/phases/playingPhase.js`.
    2.  **Remove the import statement:**
        ```javascript
        // Remove this line:
        import { updateGameState } from '../state.js';
        ```
    3.  **Modify `handlePlayCard` function:**
        *   At the beginning of the function, create a deep clone of the input `gameState` to work on:
            ```javascript
            function handlePlayCard(gameState, playerRole, cardPlayed) {
              // ...existing player existence check...

              // Start with a deep clone of the input gameState
              let newGameState = JSON.parse(JSON.stringify(gameState));
            ```
        *   Replace all subsequent calls to `updateGameState` with direct modifications to `newGameState`. For example:
            *   Change this:
                ```javascript
                newGameState = updateGameState(gs => ({ ...gs, players: updatedPlayers }));
                ```
                To this:
                ```javascript
                newGameState.players = updatedPlayers;
                ```
            *   Change this:
                ```javascript
                newGameState = updateGameState(gs => ({ ...gs, currentTrick: newCurrentTrick }));
                ```
                To this:
                ```javascript
                newGameState.currentTrick = newCurrentTrick;
                ```
            *   Change this:
                ```javascript
                newGameState = updateGameState(gs => ({
                  ...gs,
                  tricksTaken: updatedTricksTaken,
                  currentTrick: [],
                  currentPlayer: trickWinnerRole,
                  lastTrickWinner: trickWinnerRole,
                  message: `${trickWinnerRole} wins the trick.`,
                }));
                ```
                To this (applying changes directly to `newGameState`):
                ```javascript
                newGameState.tricksTaken = updatedTricksTaken;
                newGameState.currentTrick = [];
                newGameState.currentPlayer = trickWinnerRole;
                newGameState.lastTrickWinner = trickWinnerRole;
                newGameState.message = `${trickWinnerRole} wins the trick.`;
                ```
            *   Change this:
                ```javascript
                newGameState = updateGameState(gs => ({
                  ...gs,
                  gamePhase: GAME_PHASES.SCORING,
                  currentPlayer: null,
                  message: `Hand over. ${finalTricksMessageSegment} Moving to scoring.`,
                }));
                ```
                To this:
                ```javascript
                newGameState.gamePhase = GAME_PHASES.SCORING;
                newGameState.currentPlayer = null;
                newGameState.message = `Hand over. ${finalTricksMessageSegment} Moving to scoring.`;
                ```
            *   Change this:
                ```javascript
                newGameState = updateGameState(gs => ({
                  ...gs,
                  currentPlayer: nextPlayerForTrick,
                  message: `${playerRole} played ${cardPlayed.rank} of ${cardPlayed.suit}. Next player: ${nextPlayerForTrick}.`,
                }));
                ```
                To this:
                ```javascript
                newGameState.currentPlayer = nextPlayerForTrick;
                newGameState.message = `${playerRole} played ${cardPlayed.rank} of ${cardPlayed.suit}. Next player: ${nextPlayerForTrick}.`;
                ```
        *   Ensure the function explicitly `return newGameState;` at the very end.

---

#### **Task 3: Refactor `src/game/phases/scoringPhase.js`**

*   **Goal:** Make `calculateAndApplyScore` and `checkGameOver` pure functions that return new state objects, and remove `handleNewGameRequest` from Layer 1.
*   **Affected Function(s):** `calculateAndApplyScore`, `checkGameOver`, `handleNewGameRequest`
*   **Action(s):**
    1.  Open `src/game/phases/scoringPhase.js`.
    2.  **Remove imports for state management and persistence:**
        ```javascript
        // Remove these lines:
        // import { updateGameState, resetFullGame } from '../state.js';
        import { resetFullGame } from '../state.js'; // This will be removed in a later step
        import { gameRepository } from '../../db/gameRepository.js';
        ```
    3.  **Modify `calculateAndApplyScore` function:**
        *   At the beginning of the function, create a deep clone of the input `gameState`:
            ```javascript
            async function calculateAndApplyScore(gameState) {
              // ...existing phase/makerTeam checks...

              let newGameState = JSON.parse(JSON.stringify(gameState)); // Work on a clone
            ```
        *   Replace all direct modifications to `gameState` with modifications to `newGameState`. For example:
            *   Change `gameState.tricksTaken = { ... }` to `newGameState.tricksTaken = { ... }`
            *   Change `gameState.teamScores[scoringTeam] += pointsScored;` to `newGameState.teamScores[scoringTeam] += pointsScored;`
            *   Change `gameState.message = ...` to `newGameState.message = ...`
            *   Change `gameState.previousTricksTaken = ...` to `newGameState.previousTricksTaken = ...`
            *   Change `gameState.tricksTaken = { ... }` to `newGameState.tricksTaken = { ... }`
            *   Change `gameState.currentTrick = [];` to `newGameState.currentTrick = [];`
        *   **Crucially, modify the call to `checkGameOver`:**
            *   Change `return await checkGameOver(gameState);`
            *   To: `return checkGameOver(newGameState);` (Remove `await` as `checkGameOver` will also become pure and not return a Promise).

    4.  **Modify `checkGameOver` function (within `scoringPhase.js` or `endGame.js` if it's imported from there):**
        *   **Note:** Your `scoringPhase.js` imports `checkGameOver` from `endGame.js`. So the actual modification needs to happen in `src/game/phases/endGame.js`.
        *   Open `src/game/phases/endGame.js`.
        *   **Remove persistence import:**
            ```javascript
            // Remove this line:
            import { log } from '../../utils/logger.js'; // This is fine, but gameRepository is not
            // Remove this line:
            import { gameRepository } from '../../db/gameRepository.js';
            ```
        *   **Modify `checkGameOver` function:**
            *   Ensure it works on a clone (it already seems to: `const updatedState = JSON.parse(JSON.stringify(gameState));`).
            *   **Remove the `gameRepository.updateGame` call:**
                ```javascript
                // Remove this line:
                // await gameRepository.updateGame(gameId, gameState);
                ```
            *   Ensure it `return`s the `updatedState` (or `gameState` if you remove the clone and work directly on `gameState` assuming it's already a clone from the caller). The current code returns `gameState` directly.
            *   **Remove the `async` keyword** from `checkGameOver` as it no longer performs `await` operations.
            *   **Remove the `TEAMS` import:** `import { TEAMS } from '../../config/constants.js';` (It's already imported by `scoringPhase.js` which calls `handleEndOfHand`, so it's redundant here).

    5.  **Remove `handleNewGameRequest` from `src/game/phases/scoringPhase.js`:**
        *   **Delete the entire function definition:**
            ```javascript
            // Delete this entire function:
            function handleNewGameRequest(gameState) {
              if (gameState.gamePhase !== GAME_PHASES.GAME_OVER) {
                throw new InvalidPhaseError('Can only start a new game from GAME_OVER phase.');
              }
              logger.info(`[Game ID: ${gameState.gameId}] Handling new game request.`);
              return resetFullGame();
            }
            ```
        *   **Remove its export:**
            ```javascript
            // Remove handleNewGameRequest from this export list:
            export { calculateAndApplyScore, checkGameOver, handleNewGameRequest };
            ```
            It should become:
            ```javascript
            export { calculateAndApplyScore, checkGameOver };
            ```
        *   **Remove the unused `resetFullGame` import:**
            ```javascript
            // Remove this line:
            import { resetFullGame } from '../state.js';
            ```

---

**Verification Steps (After completing all actions):**

1.  **Run Tests:** Execute your unit tests, especially those for `biddingPhase`, `playingPhase`, and `scoringPhase`. They should still pass. If not, debug the state flow.
2.  **Code Review:** Manually inspect the modified files to ensure:
    *   No more `updateGameState` calls.
    *   No more `gameRepository` imports or calls.
    *   All Layer 1 functions consistently return a *new* state object (or a primitive/simple object like `determineTrickWinner`).
    *   No direct mutation of input `gameState` objects (always work on a clone).
    *   No `async` keyword on functions that no longer perform `await` operations.