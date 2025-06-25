

# Project TODO List

Tues June 24 2025:
Still unable to find the cause of Jules's environment breaking after one instance of running `npm test`
Attempting to use windsurf: Remember to 

This Below contents outlines the next crucial steps for the Euchre Multiplayer game development, following the foundational rewrite of core server components.

## Next Sprint Priorities (Generated Tasks)

1.  **Server: Comprehensive Error Handling & Validation**
    *   **Details:** Systematically review all server-side socket handlers and game phase logic. Ensure all error conditions are caught, logged appropriately, and result in meaningful error events/messages being sent to the client. Strengthen input validation for all actions.
    *   **Original Ref:** Adapted from Longer Term - Item 9

2.  **UI: Visual Polish - Card and Player Representations (Conceptual)**
    *   **Details (Conceptual):** Define improved visual representations for cards (distinguishing suits and ranks clearly) and player positions on the game board. Specify how active player, dealer, and trick winner could be visually highlighted.
    *   **Original Ref:** New/Enhancement

3.  **Server: Unit Tests for Playing Phase**
    *   **Details:** Write comprehensive unit tests for `src/game/phases/playingPhase.js` and associated handlers in `src/socket/handlers/playingHandlers.js`. Cover various scenarios like valid/invalid plays, trick completion, hand completion, and effects of "go alone".
    *   **Original Ref:** Derived from Longer Term - Item 10 (Testing Continuous)

4.  **Server: Unit Tests for Scoring Phase**
    *   **Details:** Write comprehensive unit tests for `src/game/phases/scoringPhase.js` and associated handlers (if any directly for scoring actions, or verify integration with game over/new hand). Cover score calculation for makers/opponents, march, euchre, and game over conditions.
    *   **Original Ref:** Derived from Longer Term - Item 10 (Testing Continuous)

5.  **Server: Unit Tests for Go-Alone Phase**
    *   **Details:** Write comprehensive unit tests for `src/game/phases/goAlonePhase.js` (if it exists as a distinct phase logic file) and its integration with `src/socket/handlers/goAloneHandlers.js`. Test maker deciding to go alone or with partner, and the impact on `gameState` (e.g., `partnerSittingOut`).
    *   **Original Ref:** Derived from Longer Term - Item 10 (Testing Continuous)

6.  **Server: Review and Stabilize/Disable Reconnection Tests**
    *   **Details:** Review all existing server-side tests (unit and integration) for any tests specifically covering reconnection or auto-reconnection logic. If these tests are proving problematic to pass reliably or are consuming excessive time to fix during general development, temporarily disable them (e.g., using `.skip()` or by commenting them out with a clear `TODO`). The goal is to ensure the main test suite remains stable for other development efforts.
    *   **Original Ref:** User Feedback (Turn 21)

---

## Detailed Implementation Plan for Next Sprint Priorities

This section outlines the sub-tasks, affected files, and proposed logic for each of the 10 priority tasks.

**Preamble: Client-Side Task Approach**
*Client-side tasks will focus on defining the *logic* and *data handling* within hypothetical client-side services or components. Actual UI rendering code (e.g., React JSX) will be described conceptually rather than implemented verbatim, as I cannot directly produce or test visual UI components. The goal is to prepare the structural JavaScript/TypeScript code for a UI developer.*
*Assumed client files: `src/client/services/socketService.js` (for emitting actions, listening to events), `src/client/services/uiService.js` (for UI update logic), `src/client/services/stateService.js` (for managing client-side game state).*

---

**1. Client: Comprehensive Error Handling & User Feedback (Client-Side)** (Was Task 6)
    *   **Goal:** Improve client-side resilience and user experience by handling errors gracefully.
    *   **Sub-tasks (Conceptual):**
        1.  **In `socketService.js`:**
            *   Standardize error handling for `socket.emit` acknowledgements. If an ack indicates an error, or if it times out, propagate this error.
            *   Implement a general listener for server-emitted `GAME_EVENTS.ERROR` (or a similar generic error event). Callback should pass the error message to `uiService.showErrorModal` or `uiService.displayMessage`.
        2.  **In `uiService.js`:**
            *   Refine `showErrorModal` and `displayMessage` to present errors clearly.
            *   For critical action emitters (bidding, playing), if an error is received in an ack, provide feedback (e.g., "Bid could not be placed: Server error").
        3.  **In action-triggering methods in `uiService.js` (e.g., `promptOrderUp`):**
            *   Conceptually wrap `socketService` calls in try/catch if the emitters are made to return Promises that can reject on error/timeout.
    *   **Files affected:** `src/client/services/socketService.js`, `src/client/services/uiService.js`.
    *   **Unit Tests:** (Conceptual)
        *   Test that `socketService` handles ack errors/timeouts.
        *   Test that `socketService` routes server `ERROR` events to `uiService`.
        *   Test `uiService` methods display errors appropriately.

---

**2. Client: Reconnection UI Flow** (Was Task 7)
    *   **Goal:** Provide a clear user experience for game reconnections.
    *   **Sub-tasks (Conceptual):**
        1.  **In `socketService.js`:**
            *   The listener for `GAME_EVENTS.PLAYER_ALREADY_IN_GAME` (Task 2) calls `uiService.promptForRejoin`.
            *   Add listeners for `connect` and `disconnect` events from the socket itself.
                *   On `disconnect`, call `uiService.showConnectionLostMessage()`.
                *   On `connect` (re-established connection), attempt to auto-rejoin if game/player IDs are available in `stateService`. Emit a specific rejoin event.
        2.  **In `stateService.js`:**
            *   Store session identifiers (`playerId`, `gameId`) if received, possibly in `localStorage` via a persistence service (future task).
            *   `hasReconnectInfo()`: Checks if enough info is available to attempt a rejoin.
        3.  **In `uiService.js`:**
            *   `promptForRejoin(gameId)`: (Task 2) Confirmed by user, should trigger a rejoin action via `socketService`.
            *   `showConnectionLostMessage()`: Displays a non-modal message indicating connection loss and attempt to reconnect.
            *   `showReconnectingModal()`: Displays a modal indicating reconnection is in progress.
            *   `showReconnectedMessage()`: Confirms successful reconnection.
            *   `showReconnectionFailedModal()`: Informs user if reconnection ultimately fails.
    *   **Files affected:** `src/client/services/socketService.js`, `src/client/services/stateService.js`, `src/client/services/uiService.js`.
    *   **Unit Tests:** (Conceptual)
        *   Test `socketService` calls correct `uiService` methods on connect/disconnect.
        *   Test `uiService` methods for different reconnection prompts/messages.

---

**3. Server: Comprehensive Error Handling & Validation** (Was Task 8)
    *   **Goal:** Make the server more robust by improving error handling and input validation across all modules.
    *   **Sub-tasks:**
        1.  **Review Socket Handlers (`src/socket/handlers/*.js`):**
            *   For every handler, ensure incoming data is validated (e.g., presence of `gameId`, `playerRole`, correct data types for payloads).
            *   Wrap main logic in `try/catch` blocks.
            *   On error, emit a specific error event back to the calling socket (e.g., `socket.emit(GAME_EVENTS.ACTION_FAILED, { action: ORIGINAL_ACTION, error: 'Details' })`) or a generic `GAME_EVENTS.ERROR`.
            *   Log errors server-side using `logger.error()`.
        2.  **Review Game Phase Logic (`src/game/phases/*.js`):**
            *   Functions like `handlePlayCard`, `calculateAndApplyScore`, etc., should throw specific errors if invalid states or inputs are encountered (some of this is already done).
            *   Ensure these errors are caught by the calling socket handlers and communicated to the client.
        3.  **Review Game Logic (`src/game/logic/*.js`):**
            *   Strengthen validation functions (e.g., `isValidPlay`) to cover more edge cases.
        4.  **Standardize Error Response Format:** Define a consistent error object structure for client communication.
    *   **Files affected:** All files in `src/socket/handlers/`, `src/game/phases/`, `src/game/logic/`.
    *   **Unit Tests:**
        *   Add tests for invalid inputs and error conditions for each socket handler.
        *   Add tests for error throwing in game phase logic functions.

---

**4. Testing: Client-Side Service Mocking and Basic Tests** (Was Task 9)
    *   **Goal:** Establish a basic unit testing setup for the conceptual client-side services.
    *   **Sub-tasks:**
        1.  **Test Environment Setup:**
            *   Ensure Mocha/Chai (or chosen test framework) can run tests for client-side files (may involve Babel/ESM configuration if not already fully set up for client code).
        2.  **Mock Dependencies:**
            *   For `socketService.js` tests: Create a mock `socket.io-client` socket instance.
            *   For `uiService.js` tests: Create mock `stateService` and `socketService` instances.
            *   For `stateService.js` tests: Test methods in isolation.
        3.  **Write Basic Unit Tests:**
            *   **`socketService.js`:**
                *   Test that `initializeEventListeners` registers handlers for expected `GAME_EVENTS`.
                *   Test that emitter methods (e.g., `emitOrderUpDecision`) call `this.socket.emit` with the correct event name and payload structure.
            *   **`stateService.js`:**
                *   Test each mutator (e.g., `setGameDetails`) correctly updates the conceptual state properties.
                *   Test each getter correctly returns data from the conceptual state.
            *   **`uiService.js`:**
                *   Test that UI interaction methods (e.g., `promptOrderUp`) call the appropriate `socketService` methods.
                *   Test that display methods (e.g., `displayPlayerHand`) attempt to call the correct `stateService` getters.
    *   **Files affected:** New test files (e.g., `test/client/socketService.test.js`, `test/client/stateService.test.js`, `test/client/uiService.test.js`).
    *   **Unit Tests:** This task *is* about writing unit tests.

---

**5. UI: Visual Polish - Card and Player Representations (Conceptual)** (Was Task 10)
    *   **Goal:** Define improved visual clarity for key game elements.
    *   **Sub-tasks (Conceptual - descriptions of what should be done):**
        1.  **Card Rendering:**
            *   Specify how card suits (Hearts, Diamonds, Clubs, Spades) and ranks (9, 10, J, Q, K, A) should be visually distinct and easily readable. Consider standard playing card iconography.
            *   Define how "bower" status (Right and Left) might be visually indicated on the cards or in relation to the trump suit display.
        2.  **Player Positions:**
            *   Describe a clear and intuitive layout for player positions around a conceptual game table (e.g., South at bottom, North at top, West to left, East to right).
            *   Specify how a player's own position should be highlighted or made distinct.
        3.  **Active Player Indication:**
            *   Describe visual cues for the `currentPlayer` (e.g., highlighting their area, a turn indicator).
        4.  **Dealer Indication:**
            *   Describe how the dealer (`gameState.dealer`) should be visually marked (e.g., a "D" token).
        5.  **Trick Winner Indication:**
            *   Describe how the winner of each trick could be visually indicated before cards are collected.
    *   **Files affected:** Primarily `src/client/services/uiService.js` (comments describing these visual elements) or design documents.
    *   **Unit Tests:** Not applicable for this purely conceptual/descriptive task.

---

## Medium Term Priorities (Original)

5.  **Refine Team Management & Definitions (`src/utils/players.js` & `state.js`)**
    *   **(Status: PROMOTED & COMPLETED - See Completed Tasks Sprint Item 1)**

6.  **Client-Side Implementation (Ongoing & Critical)**
    *   **(Status: PROMOTED & PARTIALLY COMPLETED - See Completed Tasks Sprint Items 2-5 and current Sprint Items 1-3, 6, 7)**

7.  **Persistence - Game State Saving/Loading**
    *   **(Status: PROMOTED - See current Sprint Item 4)**

## Longer Term / Enhancements (Original)

8.  **Robust Reconnection Logic (Server & Client)**
    *   **Server:** **(Status: PROMOTED - See current Sprint Item 5)**
    *   **Client:** **(Status: PROMOTED - See current Sprint Item 7)**

9.  **Comprehensive Error Handling & User Feedback**
    *   **(Status: PROMOTED & SPLIT - See current Sprint Items 6 (Client) and 8 (Server))**

10. **Testing (Continuous)**
    *   **(Status: ONGOING & PROMOTED - See current Sprint Item 9 for client-side focus)**
    *   Write unit and integration tests for all new phase logic and socket handlers.
    *   Aim for high test coverage.
    *   Develop end-to-end tests for full game flows.

## Completed Tasks

1.  **Implement Playing Phase Logic (`src/game/phases/playingPhase.js`)**
    *   **Status: COMPLETED**
    *   **Tasks:**
        *   Develop `handlePlayCard(currentGameState, playerRole, cardPlayed)`:
            *   Validate play using `isValidPlay` from `validation.js`.
            *   Add card to `currentGameState.currentTrick`.
            *   Advance `currentPlayer` within the trick.
        *   Develop logic to determine trick winner after 4 cards are played:
            *   Use `getCardRank` from `deck.js`.
            *   Award trick to the winning player/team (update `gameState.tricksTaken`).
            *   Set `currentPlayer` to the trick winner to lead the next trick.
        *   After 5 tricks, transition `gamePhase` to `SCORING`.
    *   **Depends on:** `state.js`, `deck.js`, `validation.js`, `players.js`.

2.  **Implement Playing Phase Socket Handlers (`src/socket/handlers/playingHandlers.js`)**
    *   **Status: COMPLETED**
    *   **Tasks:**
        *   Create `registerPlayingHandlers(socket, io)`.
        *   Listen for `action_play_card` (data: `{ card: cardObject or cardId }`).
        *   Validate, call `handlePlayCard` from `playingPhase.js`.
        *   Broadcast `gameState` updates (e.g., after each card played, after trick completion).
    *   **Action:** Update `src/socket/index.js` to register these handlers.

3.  **Implement Scoring Phase Logic (`src/game/phases/scoringPhase.js`)**
    *   **Status: COMPLETED**
    *   **Tasks:**
        *   Review and adapt/rewrite existing logic from the (kept but for-review) `src/game/phases/endGame.js` into this new module, ensuring immutable state updates.
        *   `calculateHandScore(currentGameState)`:
            *   Determine points based on `makerTeam`, `tricksTaken` by each team, and `goingAlone` status.
            *   Consider rules for making bid, march (all 5 tricks), and euchre (makers set).
        *   Update `currentGameState.teamScores`.
        *   `checkGameOver(currentGameState)`: Check if any team has reached `WINNING_SCORE`.
        *   Transition `gamePhase` to `GAME_OVER` if game ended, otherwise to `DEALING` (for next hand, triggering `startNewHandPhase.js`).
        *   Update `currentPlayer` for the start of the next hand (dealer rotation handled by `startNewHandPhase.js`).
    *   **Depends on:** `state.js`, `constants.js`, `players.js`.

4.  **Implement Game Over & New Game Logic (within `scoringPhase.js` or new `gameOverPhase.js`)**
    *   **Status: COMPLETED**
    *   **Tasks:**
        *   Handle the `GAME_OVER` state: Announce winner.
        *   Provide a mechanism/event for players to request a new game.
        *   `handleNewGameRequest(currentGameState)`: If requested, call `resetFullGame()` from `state.js` to reset to `LOBBY`.
    *   **Socket Handlers:** Add `action_request_new_game` handler. Broadcast updated (reset) `gameState`.

---
**NEWLY COMPLETED TASKS (Sprint)**
---

**1. Refine Team Management & Definitions (`src/utils/players.js` & `src/game/state.js`)**
    *   **Status: COMPLETED**
    *   **Details:** Formalize team structure within `gameState.players` or as a separate `gameState.teams` object. Ensure `getPlayerTeam` or similar utility robustly returns a consistent team ID. Update scoring to use these definitions.
    *   **Original Ref:** Item 5 (Medium Term)
    *   **Implementation Details:**
        *   **Modified `initializePlayers` in `src/utils/players.js` (initially thought it was in `src/game/state.js`):**
            *   When creating player objects, assigned a `teamId` (using `TEAMS.TEAM_NS` or `TEAMS.TEAM_EW` from `src/config/constants.js`) directly to each player object based on their role.
            *   Changed `TEAMS` constants from `TEAM1`/`TEAM2` to `TEAM_NS`/`TEAM_EW` for clarity.
        *   **Updated `getPlayerTeam` in `src/utils/players.js`:**
            *   Created `getPlayerTeam(player)` to reliably return `player.teamId`.
        *   **Updated `src/game/state.js` (`resetFullGame`):**
            *   Initialized `gameState.tricksTaken` and `gameState.teamScores` to be objects keyed by new team IDs (`TEAMS.TEAM_NS`, `TEAMS.TEAM_EW`).
        *   **Updated `scoringPhase.js`:**
            *   Verified `calculateAndApplyScore` already used team constants for `tricksTaken` and `teamScores`. No changes needed there due to the `state.js` update.
        *   **Updated `playingPhase.js`:**
            *   Modified `handlePlayCard` to use `winningPlayer.teamId` to credit tricks to the correct team object key.
        *   **Unit Tests:**
            *   Created `test/utils/players.unit.test.js` for `initializePlayers` and `getPlayerTeam`.
            *   Created `test/game/state.unit.test.js` for `resetFullGame` state initialization.
            *   Updated existing tests in `test/phases/playingPhase.unit.test.js` and `test/phases/scoringPhase.unit.test.js` to align with `teamId` changes and ensure they pass. This involved significant debugging of test mocks (`esmock` for ES Modules, `chai` import fixes) and fixing a subtle bug with `SUITS` constants being an array instead of an object. Also fixed issues in `handlePlayCard` and `scoringPhase` related to state updates and object iteration.

---

**2. Client: Handle `assign_role` and `game_full` Events**
    *   **Status: COMPLETED**
    *   **Details:** Implement client-side logic to process `assign_role` (e.g., storing the player's role) and `game_full` (e.g., displaying a message if lobby is full) events from the server.
    *   **Original Ref:** Item 6 (Client-Side)
    *   **Implementation Details (Conceptual):**
        *   **`src/client/services/socketService.js`:**
            *   Overwritten existing file with new conceptual structure.
            *   Added conceptual listeners for `GAME_EVENTS.ASSIGN_ROLE`, `GAME_EVENTS.GAME_FULL`, and `GAME_EVENTS.PLAYER_ALREADY_IN_GAME`.
            *   Callbacks for these listeners call conceptual methods on `stateService` (e.g., `setGameDetails`, `setPlayerRole`, `updatePlayerList`) and `uiService` (e.g., `displayAssignedRole`, `showErrorModal`, `promptForRejoin`).
        *   **`src/client/services/stateService.js`:** Created with conceptual state properties and mutator methods.
        *   **`src/client/services/uiService.js`:** Created with conceptual UI methods.
        *   All files include a preamble indicating their conceptual nature.

---

**3. Client: Display Core Game Information**
    *   **Status: COMPLETED**
    *   **Details:** Implement UI components to display player hands, the turn card, the current trick, team scores, and game messages/log.
    *   **Original Ref:** Item 6 (Client-Side)
    *   **Implementation Details (Conceptual):**
        *   **`src/client/services/stateService.js`:**
            *   Added getter methods: `getPlayerHand()`, `getTurnCard()`, `getCurrentTrick()`, `getTeamScores()`, `getLatestGameMessage()`.
            *   Updated conceptual `gameState` structure to hold data for these getters.
        *   **`src/client/services/uiService.js`:**
            *   Added new conceptual UI methods: `displayPlayerHand()`, `displayTurnCard()`, `displayCurrentTrick()`, `displayTeamScores()`, `displayGameMessages()`.
            *   These methods call corresponding getters in `stateService` and log the information conceptually.
            *   A conceptual `stateService` dependency was added to `uiService`.

---

**4. Client: Implement Bidding Action Emitters**
    *   **Status: COMPLETED**
    *   **Details:** Develop UI elements (e.g., buttons, modals) for players to make bidding decisions (`action_order_up_decision`, `action_dealer_discard`, `action_call_trump_decision`) and emit these actions to the server.
    *   **Original Ref:** Item 6 (Client-Side)
    *   **Implementation Details (Conceptual):**
        *   **`src/client/services/socketService.js`:**
            *   Added emitter methods: `emitOrderUpDecision(passes)`, `emitDealerDiscard(discardedCard)`, `emitCallTrumpDecision(suit, passes)`.
            *   These methods construct payloads (using conceptual `stateService.getGameId()` and `stateService.getPlayerRole()`) and use `this.socket.emit` placeholder.
        *   **`src/client/services/uiService.js`:**
            *   Added UI interaction methods: `promptOrderUp()`, `promptDealerDiscard()`, `promptCallTrump()`.
            *   These methods simulate UI interactions and call the respective emitter methods on `socketService`.
            *   A conceptual `socketService` dependency was added.

---

**5. Client: Implement "Go Alone" Action Emitter**
    *   **Status: COMPLETED**
    *   **Details:** Develop UI elements for players to decide on "going alone" and emit `action_go_alone_decision` to the server.
    *   **Original Ref:** Item 6 (Client-Side)
    *   **Implementation Details (Conceptual):**
        *   **`src/client/services/socketService.js`:**
            *   Added emitter method: `emitGoAloneDecision(goesAlone)`.
            *   Constructs payload and uses `this.socket.emit` placeholder.
        *   **`src/client/services/uiService.js`:**
            *   Added UI interaction method: `promptGoAlone()`.
            *   Conceptually checks if the player is the maker (using conceptual `stateService.getPlayerRole()` and `stateService.getMaker()`) before prompting and emitting.

---
--- SPRINT 2 COMPLETED TASKS (Current Sprint) ---

**1. Client: Implement "Play Card" Action Emitter**
    *   **Status: COMPLETED**
    *   **Summary:** Implemented `emitPlayCard` in `socketService.js` and conceptual `handlePlayCardSelection` in `uiService.js`. Added conceptual unit tests. Event `GAME_EVENTS.PLAY_CARD` used.
    *   **Original Detailed Description:**
        *   (Was Task 6)
        *   **Goal:** Allow players to select and play a card.
        *   **Sub-tasks:**
            1.  **In `socketService.js`:**
                *   `emitPlayCard(gameId, playerRole, card)`: Emits `GAME_EVENTS.ACTION_PLAY_CARD`.
            2.  **In `uiService.js` (conceptual):**
                *   Logic for selecting a card from the player's hand display.
                *   Visual feedback for selected card.
                *   On confirmation (e.g., "Play Selected Card" button, or card click if unambiguous), call `socketService.emitPlayCard`.
        *   **Files affected:** `src/client/services/socketService.js`, `src/client/services/uiService.js`.
        *   **Unit Tests:** (Conceptual)
            *   Test `socketService.emitPlayCard` sends correct event and payload.

---

**2. Client: Dynamic UI Updates from `gameState`**
    *   **Status: COMPLETED**
    *   **Summary:** Implemented `updateFullGameState` and subscription mechanism in `stateService.js`. `socketService.js` listener for `GAME_EVENTS.STATE_UPDATE` now calls this. `uiService.js` conceptually subscribes. Client services refactored for dependency injection. Conceptual tests added.
    *   **Original Detailed Description:**
        *   (Was Task 7)
        *   **Goal:** Ensure UI reflects server state changes.
        *   **Sub-tasks:**
            1.  **In `socketService.js`:**
                *   The existing listener for `GAME_EVENTS.GAME_STATE_UPDATE` should receive the full `gameState`.
                *   Callback should pass `gameState` to `stateService.updateFullGameState(newState)`.
            2.  **In `stateService.js`:**
                *   `updateFullGameState(newState)`: Replaces the client's local `gameState` with `newState`.
                *   Implement a subscription mechanism or use a reactive framework pattern so that `uiService` (or UI components) are notified when `gameState` changes.
            3.  **In `uiService.js` (conceptual):**
                *   Ensure all display logic (from Task 3 and others) re-evaluates/re-renders when `stateService.gameState` is updated. This is typically handled by reactive UI frameworks (React, Vue, Svelte, Angular). If not using one, manual re-render calls would be needed.
        *   **Files affected:** `src/client/services/socketService.js`, `src/client/services/stateService.js`, `src/client/services/uiService.js`.
        *   **Unit Tests:** (Conceptual)
            *   Test `stateService.updateFullGameState` correctly updates local state.
            *   Test notification/reaction mechanism for UI updates.

---

**3. Client: Contextual UI Element Control**
    *   **Status: COMPLETED**
    *   **Summary:** Added conceptual methods to `uiService.js` (`getBiddingControlsState`, `getGoAloneControlsState`, `getCardPlayabilityState`, `getRequestNewGameButtonState`) for dynamic UI element state based on `gameState`. Conceptual tests added.
    *   **Original Detailed Description:**
        *   (Was Task 8)
        *   **Goal:** Show/hide or enable/disable UI elements based on game context.
        *   **Sub-tasks:**
            1.  **In `uiService.js` (conceptual) / UI components:**
                *   Bidding controls: Only visible and enabled for `stateService.getCurrentPlayer()` during `GAME_PHASES.BIDDING` or `GAME_PHASES.CALLING_TRUMP`. Specific controls depend on sub-phases (order up, dealer discard, call trump).
                *   "Go Alone" controls: Only visible/enabled for the maker during `GAME_PHASES.GOING_ALONE`.
                *   Card playability: Cards in hand should only be selectable/playable by `stateService.getCurrentPlayer()` during `GAME_PHASES.PLAYING`. Visual cues for valid/invalid plays according to game rules (e.g., must follow suit) would be an enhancement here.
                *   "Request New Game" button: Only visible/enabled during `GAME_PHASES.GAME_OVER`.
        *   **Files affected:** `src/client/services/uiService.js`, `src/client/services/stateService.js`.
        *   **Unit Tests:** (Conceptual)
            *   Test `uiService` or component logic correctly determines visibility/enabled state based on various `gameState` properties (`currentPlayer`, `gamePhase`).

---

**4. Persistence: Game State Saving & Loading**
    *   **Status: COMPLETED**
    *   **Summary:** Integrated `gameRepository.js` (`getGame`, `updateGame`) into `lobbyHandlers`, `biddingHandlers`, `goAloneHandlers`, `playerConnectionHandlers`, and `scoringPhase.js`. Handlers are now async. `gameRepository.js` methods refined (upsert, null for not found). Conceptual tests added.
    *   **Original Detailed Description:**
        *   (Was Task 9)
        *   **Goal:** Implement robust game state saving and loading.
        *   **Sub-tasks:**
            1.  **Re-evaluate `src/game/stateManager.js` (archived):**
                *   Review for any useful concepts. Likely, its direct functionality is now split between `gameRepository.js` and phase transition logic.
            2.  **Integrate `gameRepository.js` for saving:**
                *   Ensure `updateGame(gameId, gameState)` from `src/db/gameRepository.js` is called at critical points:
                    *   After player joins/leaves lobby (in `lobbyHandlers.js`).
                    *   After bidding phase completes (trump selected, in `biddingHandlers.js` or `biddingPhase.js` before broadcasting).
                    *   After "go alone" decision (in `goAloneHandlers.js` or `goAlonePhase.js`).
                    *   After each trick is completed (in `playingPhase.js` logic, already done via `playingHandlers.js`).
                    *   After hand scoring is complete (in `scoringPhase.js` logic, before broadcasting DEALING/GAME_OVER).
                    *   After game reset (in `gameOverHandlers.js`).
                *   *Files affected:* `lobbyHandlers.js`, `biddingHandlers.js`, `goAloneHandlers.js`, `playingHandlers.js` (already does it), `scoringPhase.js` (via `gameOverHandlers.js` for reset, and needs to be added for end of hand score).
            3.  **Implement `loadGame(gameId)` in `gameRepository.js`:**
                *   This function should already exist (`getGame(gameId)`). Ensure it correctly retrieves and reconstructs the game state from the database.
                *   Consider if any data transformation is needed upon loading (e.g., if database schema differs slightly or if some properties are transient).
            4.  **Logic for loading game for reconnection (see Task 10 also):**
                *   When a player tries to connect/reconnect with a `gameId` (e.g., `socket.on('join_game', { gameId, playerId })`), if `gameRepository.getGame(gameId)` returns an active game, allow player to rejoin if they were part of it.
                *   *Files affected:* `src/socket/handlers/playerConnectionHandlers.js` (or similar).
        *   **Unit Tests:**
            *   Test that `updateGame` is called from the various handlers/phases.
            *   Test `getGame` correctly retrieves and reconstructs state (may need DB mocking or integration tests).

---

**5. Server: Robust Reconnection for In-Progress Games**
    *   **Status: COMPLETED**
    *   **Summary:** Refined `playerConnectionHandlers.js` with `handleRejoinGame` (triggered by `GAME_EVENTS.RECONNECT`) and `handlePlayerDisconnect`. Logic manages `player.isConnected`, `socketId`, persists state, and emits events. `socket.currentGameId` implemented. Conceptual tests added.
    *   **Original Detailed Description:**
        *   (Was Task 10)
        *   **Goal:** Allow players to seamlessly rejoin active games.
        *   **Sub-tasks:**
            1.  **Player Identification on Reconnect:**
                *   When a socket connects, it might provide a `playerId` and `gameId` from a previous session (e.g., stored in `localStorage` on client).
                *   *Files affected:* `src/socket/handlers/playerConnectionHandlers.js`.
            2.  **In `playerConnectionHandlers.js` (or similar):**
                *   On `rejoin_game` event (or enhanced `join_game`):
                    *   Receive `gameId`, `playerId` (or a session token).
                    *   Call `gameRepository.getGame(gameId)`.
                    *   If game exists and is active (not GAME_OVER unless spectating):
                        *   Find the player in `gameState.players` by `playerId`.
                        *   If found:
                            *   Update their `socketId` to the new `socket.id`.
                            *   Mark player as active again.
                            *   `socket.join(gameId)` to put them in the room.
                            *   Emit `GAME_EVENTS.GAME_STATE_UPDATE` *to that specific socket* with the current `gameState`.
                            *   Emit a general `GAME_EVENTS.PLAYER_RECONNECTED` event to the room with the player's role/name.
                        *   If not found, or game inactive, emit error.
                    *   If game doesn't exist, emit error.
                *   Save updated game state (with new `socketId`) via `gameRepository.updateGame`.
            3.  **Handle Disconnects:**
                *   In `disconnect` handler in `src/socket/index.js`:
                    *   Identify the player/game associated with `socket.id`.
                    *   Instead of removing player immediately, mark them as `inactive: true` in `gameState.players`.
                    *   Save this state.
                    *   Start a timer (e.g., 2 minutes). If player doesn't reconnect within timer, *then* potentially remove them or handle as abandoned (game-specific rule).
                    *   Broadcast `GAME_EVENTS.PLAYER_DISCONNECTED` to other players.
        *   **Files affected:** `src/socket/handlers/playerConnectionHandlers.js`, `src/socket/index.js`, `src/db/gameRepository.js`, `src/game/state.js` (if `inactive` flag is added).
        *   **Unit Tests:**
            *   Test `rejoin_game` handler: successful rejoin, game not found, player not in game.
            *   Test `disconnect` handler: player marked inactive, timer logic (conceptual for timer).

---

## **PREVIOUSLY COMPLETED TASKS (Retained for reference)**
---

1.  **Client: Comprehensive Error Handling & User Feedback (Client-Side)**
    *   **Status: COMPLETED**
    *   **Details:** Implement robust client-side error handling for socket events and user actions. Display clear, user-friendly messages for server errors or invalid operations.
    *   **Original Ref:** Adapted from Longer Term - Item 9
    *   **Summary:**
        *   `socketService.js` emitter methods (`emitOrderUpDecision`, `emitDealerDiscard`, etc.) updated to return Promises via a new `_emitWithAck` helper. This helper uses a conceptual `socket.timeout().emit()` for ack error/timeout handling.
        *   A global `GAME_EVENTS.ERROR` listener was added to `socketService.js`, calling `uiService.displayGlobalError` upon receiving generic server errors.
        *   `uiService.js` methods `displayGlobalError(message)`, `showErrorModal(message, title)`, and `displayMessage(message, type)` were added/refined for clearer error presentation and more flexible messaging.
        *   Action-triggering methods in `uiService.js` (e.g., `promptOrderUp`, `handlePlayCardSelection`) were updated to use the Promise-based emitters from `socketService.js`. They now use `.then()` for success feedback and `.catch()` to display action-specific errors via `showErrorModal`. Conceptual spinner calls (`showSpinner`/`hideSpinner`) were added.
        *   Relevant `GAME_EVENTS` (e.g., `ERROR`, `ACTION_ORDER_UP_DECISION`) were added/updated in `src/config/constants.js` for consistency.
        *   Conceptual unit tests for error handling scenarios were added as comments in `socketService.js` and `uiService.js`.

2.  **Client: Reconnection UI Flow**
    *   **Status: COMPLETED**
    *   **Details:** Design and implement the client-side UI flow for reconnection. This includes handling `PLAYER_ALREADY_IN_GAME`, prompting for rejoin, attempting reconnection, and updating UI based on success/failure.
    *   **Original Ref:** Client part of original Longer Term - Item 8
    *   **Summary:**
        *   `stateService.js` updated to store `playerId` and `gameId` (methods: `setPlayerId`, `setGameDetails` (for `gameId`), `getPlayerId`, `getGameId`). Implemented `hasReconnectInfo()`. Conceptual `localStorage` comments added.
        *   `socketService.js` native `connect` listener now attempts auto-rejoin by emitting `GAME_EVENTS.RECONNECT` (using `playerId` and `gameId` from `stateService`) if `hasReconnectInfo()` is true. It calls `uiService.showReconnectingModal`, then `uiService.showReconnectedMessage` or `uiService.showReconnectionFailedModal` based on ack. If no reconnect info, calls `uiService.hideModal`.
        *   `socketService.js` native `disconnect` listener calls `uiService.showConnectionLostMessage`.
        *   The `GAME_EVENTS.PLAYER_ALREADY_IN_GAME` listener in `socketService.js` correctly calls `uiService.promptForRejoin(data.gameId)`.
        *   A new `socketService.emitRejoinGame(gameId)` method added for user-confirmed rejoins, emitting `GAME_EVENTS.ACTION_REJOIN_GAME`. Handles ack/timeout for UI feedback.
        *   `uiService.js` received new methods: `promptForRejoin` (conceptually shows dialog, calls `socketService.emitRejoinGame`), `showConnectionLostMessage`, `showReconnectingModal`, `showReconnectedMessage`, and `showReconnectionFailedModal` to provide user feedback.
        *   `socketService.handleAssignRole` now also calls `stateService.setPlayerId` with the `playerId` from the server payload.
        *   `GAME_EVENTS.ACTION_REJOIN_GAME` added to `constants.js`. `GAME_EVENTS.RECONNECT` was already present.
        *   Conceptual unit tests for reconnection logic added as comments in all three services.

3.  **Testing: Client-Side Service Mocking and Basic Tests**
    *   **Status: COMPLETED**
    *   **Details:** Set up a basic testing environment for the conceptual client-side services (`socketService`, `stateService`, `uiService`). Develop mock objects for dependencies and write basic unit tests for defined methods.
    *   **Original Ref:** Adapted from Longer Term - Item 10
    *   **Summary:**
        *   Created test directory `test/client/services/` and new test files: `stateService.test.js`, `socketService.test.js`, and `uiService.test.js`.
        *   **`stateService.test.js`:** Includes tests for initial state, setters/getters (e.g., `setPlayerId`, `getGameId`, `getPlayerRole`), `hasReconnectInfo`, `updateFullGameState` (including subscriber notification), the subscription mechanism itself (subscribe, unsubscribe, error handling), and various other state getters. A minor fix was noted for `stateService.js` to initialize `this.subscriptions = []`.
        *   **`socketService.test.js`:** Includes tests for constructor, `_emitWithAck` (success, error, timeout), emitter methods (verifying correct event/payload, Promise handling), and listeners for server-sent/native socket events (`ASSIGN_ROLE`, `STATE_UPDATE`, `ERROR`, `PLAYER_ALREADY_IN_GAME`, `connect`, `disconnect`). Utilized Sinon for comprehensive mocking of `socket.io-client` (including ack simulation), `StateService`, and `UiService`.
        *   **`uiService.test.js`:** Includes tests for the constructor, action-triggering methods (checking calls to `socketService` and conceptual Promise handling like spinners/messages), conceptual UI display methods (checking console logs and calls to `stateService`), and contextual UI logic methods (e.g., `getBiddingControlsState`). Utilized Sinon for mocking `StateService` and `SocketService`.
        *   All tests are structured for Mocha/Chai and focus on testing the logical operations within each service rather than actual UI rendering.

4.  **Server: Unit Tests for Bidding Phase**
    *   **Details:** Write comprehensive unit tests for `src/game/phases/biddingPhase.js` and associated handlers in `src/socket/handlers/biddingHandlers.js`. Cover various scenarios, including different bids, dealer choices, and edge cases. Focus on validating state changes and emitted events.
    *   **Original Ref:** Derived from Longer Term - Item 10 (Testing Continuous)
    *   **Status: COMPLETED**
    *   **Summary:**
        *   Created `test/phases/biddingPhase.unit.test.js` with tests for `handleOrderUpDecision`, `handleDealerDiscard`, and `handleCallTrumpDecision`, covering player passes, ordering/calling trump, dealer actions, phase transitions (including `ORDER_UP_ROUND2`, `DEALER_DISCARD`, `GOING_ALONE_DECISION`), and misdeal scenarios. Noted that initial state setup for bidding is handled by test helpers.
        *   Created `test/socket/handlers/biddingHandlers.unit.test.js` with tests for handler registration and individual handlers (`ACTION_ORDER_UP_DECISION`, `ACTION_DEALER_DISCARD`, `ACTION_CALL_TRUMP_DECISION`). Tests cover successful execution (repository calls, phase logic calls, state broadcasting) and error handling (game not found, phase logic errors, role validation).
        *   Utilized Mocha/Chai/Sinon with comprehensive mocking for dependencies like `gameRepository`, `io`, `socket`, `logger`, and `biddingPhase.js` module functions.

5.  **Server: Integration Tests for Lobby and Game Start**
    *   **Details:** Develop integration tests covering the flow from players joining a lobby, the game starting, up to and including the initial bidding round. These tests verify interactions between `lobbyHandlers.js`, `playerConnectionHandlers.js`, `biddingPhase.js` (implicitly via `startNewHandPhase.js`), and `state.js`, using a mock `gameRepository`. Simulate multiple client connections and actions.
    *   **Original Ref:** Derived from Longer Term - Item 10 (Testing Continuous)
    *   **Status: COMPLETED**
    *   **Summary:**
        *   Created `test/integration/lobbyAndGameStart.integration.test.js`.
        *   Implemented an in-memory `gameRepository` mock and a `MockSocket` class with a `mockIoInstance` to simulate client connections and server broadcasts for focused integration testing.
        *   Tested the successful flow of 4 players joining a lobby, leading to automatic game start (simulated by calling `startNewHand()` after 4th player joins) and transition into the `ORDER_UP_ROUND1` bidding phase. Verified correct initial game state (player hands, dealer, turn card, active bidder).
        *   Tested a player disconnecting from the lobby before game start, ensuring the player is removed/marked inactive and other players are updated.
        *   Tested an attempt to join an already full game/lobby, verifying an error is sent to the attempting client.
        *   Tests validated interactions with `gameRepository`, correct state updates, and broadcasting of events to simulated clients.
