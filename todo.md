# Project TODO List

This file outlines the next crucial steps for the Euchre Multiplayer game development, following the foundational rewrite of core server components.

## Next Sprint Priorities (Generated Tasks)

1.  **Refine Team Management & Definitions (`src/utils/players.js` & `state.js`)**
    *   **Details:** Formalize team structure within `gameState.players` or as a separate `gameState.teams` object. Ensure `getPlayerTeam` or similar utility robustly returns a consistent team ID. Update scoring to use these definitions.
    *   **Original Ref:** Item 5 (Medium Term)

2.  **Client: Handle `assign_role` and `game_full` Events**
    *   **Details:** Implement client-side logic to process `assign_role` (e.g., storing the player's role) and `game_full` (e.g., displaying a message if lobby is full) events from the server.
    *   **Original Ref:** Item 6 (Client-Side)

3.  **Client: Display Core Game Information**
    *   **Details:** Implement UI components to display player hands, the turn card, the current trick, team scores, and game messages/log.
    *   **Original Ref:** Item 6 (Client-Side)

4.  **Client: Implement Bidding Action Emitters**
    *   **Details:** Develop UI elements (e.g., buttons, modals) for players to make bidding decisions (`action_order_up_decision`, `action_dealer_discard`, `action_call_trump_decision`) and emit these actions to the server.
    *   **Original Ref:** Item 6 (Client-Side)

5.  **Client: Implement "Go Alone" Action Emitter**
    *   **Details:** Develop UI elements for players to decide on "going alone" and emit `action_go_alone_decision` to the server.
    *   **Original Ref:** Item 6 (Client-Side)

6.  **Client: Implement "Play Card" Action Emitter**
    *   **Details:** Allow players to select a card from their hand through the UI and emit `action_play_card` to the server. Include visual feedback for selection.
    *   **Original Ref:** Item 6 (Client-Side)

7.  **Client: Dynamic UI Updates from `gameState`**
    *   **Details:** Ensure the client-side UI dynamically re-renders and updates based on `gameState` objects broadcast from the server after any action or state change.
    *   **Original Ref:** Item 6 (Client-Side)

8.  **Client: Contextual UI Element Control**
    *   **Details:** Implement logic to disable or enable UI elements (buttons, card selection) based on the `currentPlayer` and current `gamePhase` received in `gameState`.
    *   **Original Ref:** Item 6 (Client-Side)

9.  **Persistence: Game State Saving & Loading**
    *   **Details:** Re-evaluate `stateManager.js` (archived). Integrate `gameRepository.js` to save game state at key milestones. Implement logic to load an existing game by `gameId` for scenarios like reconnection.
    *   **Original Ref:** Item 7 (Medium Term)

10. **Server: Robust Reconnection for In-Progress Games**
    *   **Details:** Enhance server-side reconnection logic beyond basic disconnect/reconnect. Allow players to rejoin a game already in progress if their session/role can be identified and the game state supports it.
    *   **Original Ref:** Item 8 (Longer Term)

## Detailed Implementation Plan for Next Sprint Priorities

This section outlines the sub-tasks, affected files, and proposed logic for each of the 10 priority tasks.

**Preamble: Client-Side Task Approach**
*Client-side tasks will focus on defining the *logic* and *data handling* within hypothetical client-side services or components. Actual UI rendering code (e.g., React JSX) will be described conceptually rather than implemented verbatim, as I cannot directly produce or test visual UI components. The goal is to prepare the structural JavaScript/TypeScript code for a UI developer.*
*Assumed client files: `src/client/services/socketService.js` (for emitting actions, listening to events), `src/client/services/uiService.js` (for UI update logic), `src/client/services/stateService.js` (for managing client-side game state).*

---

**1. Refine Team Management & Definitions (`src/utils/players.js` & `src/game/state.js`)**
    *   **Goal:** Formalize team structure and ensure consistent team identification.
    *   **Sub-tasks:**
        1.  **Modify `initializePlayers` in `src/game/state.js`:**
            *   When creating player objects, assign a `teamId` (e.g., `TEAMS.TEAM_NS` or `TEAMS.TEAM_EW`) directly to each player object based on their role (e.g., player1/player3 are NS, player2/player4 are EW).
            *   *Files affected:* `src/game/state.js`
            *   *Logic:* Inside `initializePlayers`, add `teamId: (player.role === PLAYER_ROLES[0] || player.role === PLAYER_ROLES[2]) ? TEAMS.TEAM_NS : TEAMS.TEAM_EW`.
        2.  **Review/Update `getPlayerTeam` in `src/utils/players.js`:**
            *   Ensure this utility (or create it if non-existent) reliably returns the `teamId` using the property set in `initializePlayers`. If `player.teamId` is now standard, this function might simply be `(player) => player.teamId`.
            *   *Files affected:* `src/utils/players.js`
        3.  **Update `scoringPhase.js`:**
            *   Modify `calculateAndApplyScore` to use `player.teamId` or the refined `getPlayerTeam` utility when determining scores and tricks taken by teams, ensuring consistency. This might already be implicitly handled if `makerTeam` is correctly set using `TEAMS.TEAM_NS` or `TEAMS.TEAM_EW`. Double-check usage with `tricksTaken[makerTeam]`.
            *   *Files affected:* `src/game/phases/scoringPhase.js`
        4.  **Update `playingPhase.js`:**
            *   Modify `determineTrickWinner` and subsequent logic in `handlePlayCard` that updates `tricksTaken`. Ensure it correctly uses the player's `teamId` to credit the trick. (e.g., `const winnerTeam = winningPlayer.teamId; newTricksTaken[winnerTeam]++;`).
            *   *Files affected:* `src/game/phases/playingPhase.js`
    *   **Unit Tests:**
        *   Test `initializePlayers` ensures correct `teamId` assignment.
        *   Test `getPlayerTeam` (if modified significantly).
        *   Ensure existing tests for scoring and playing phase still pass and correctly reflect team-based outcomes.

---

**2. Client: Handle `assign_role` and `game_full` Events**
    *   **Goal:** Implement client-side listeners for crucial early connection events.
    *   **Sub-tasks:**
        1.  **In `socketService.js` (or equivalent):**
            *   Listen for `GAME_EVENTS.ASSIGN_ROLE`:
                *   Callback takes `({ role, gameId, players, isHost })`.
                *   Store `role`, `gameId`, `isHost` in `stateService.js`.
                *   Update player list in `stateService.js`.
                *   Potentially call `uiService.js` to update role display.
            *   Listen for `GAME_EVENTS.GAME_FULL`:
                *   Callback takes `({ message })`.
                *   Call `uiService.js` to display the "game full" message.
            *   Listen for `GAME_EVENTS.PLAYER_ALREADY_IN_GAME`:
                *   Callback takes `({ message, gameId })`.
                *   Call `uiService.js` to display message, potentially offer reconnection to `gameId`.
    *   **Files affected:** `src/client/services/socketService.js`, `src/client/services/stateService.js`, `src/client/services/uiService.js` (conceptual).
    *   **Unit Tests:** (Conceptual for client-side)
        *   Test that `socketService` correctly registers listeners.
        *   Test that callbacks update `stateService` and call `uiService` appropriately.

---

**3. Client: Display Core Game Information**
    *   **Goal:** Create UI components/logic to show essential game data.
    *   **Sub-tasks:** (Conceptual: these would be UI components)
        1.  **Player Hand Display:**
            *   Logic in `uiService.js` to take `stateService.getPlayerHand()` and render it. Cards should be selectable later.
        2.  **Turn Card Display:**
            *   Logic in `uiService.js` to display `stateService.getTurnCard()`.
        3.  **Current Trick Display:**
            *   Logic in `uiService.js` to display cards in `stateService.getCurrentTrick()`, showing who played what.
        4.  **Team Scores Display:**
            *   Logic in `uiService.js` to display `stateService.getTeamScores()`.
        5.  **Game Messages/Log Display:**
            *   Logic in `uiService.js` to display messages from `stateService.getGameMessages()`.
    *   **Files affected:** `src/client/services/uiService.js`, `src/client/services/stateService.js`.
    *   **Unit Tests:** (Conceptual)
        *   Test `uiService` functions correctly format data from `stateService` for display.

---

**4. Client: Implement Bidding Action Emitters**
    *   **Goal:** Allow players to emit bidding decisions.
    *   **Sub-tasks:**
        1.  **In `socketService.js` (or `actionsService.js`):**
            *   `emitOrderUpDecision(gameId, playerRole, passes)`: Emits `GAME_EVENTS.ACTION_ORDER_UP_DECISION`.
            *   `emitDealerDiscard(gameId, playerRole, discardedCard)`: Emits `GAME_EVENTS.ACTION_DEALER_DISCARD`.
            *   `emitCallTrumpDecision(gameId, playerRole, suit, passes)`: Emits `GAME_EVENTS.ACTION_CALL_TRUMP_DECISION`.
        2.  **In `uiService.js` (conceptual):**
            *   Logic for "Order Up" UI (buttons for "Order Up", "Pass"). On click, call `socketService.emitOrderUpDecision`.
            *   Logic for "Dealer Discard" UI (card selection from hand). On selection, call `socketService.emitDealerDiscard`.
            *   Logic for "Call Trump" UI (suit selection, "Pass" button). On action, call `socketService.emitCallTrumpDecision`.
    *   **Files affected:** `src/client/services/socketService.js`, `src/client/services/uiService.js`.
    *   **Unit Tests:** (Conceptual)
        *   Test `socketService` emitter functions send correct event names and payloads.
        *   Test `uiService` logic calls the correct `socketService` functions.

---

**5. Client: Implement "Go Alone" Action Emitter**
    *   **Goal:** Allow players to emit their "go alone" decision.
    *   **Sub-tasks:**
        1.  **In `socketService.js`:**
            *   `emitGoAloneDecision(gameId, playerRole, goesAlone)`: Emits `GAME_EVENTS.ACTION_GO_ALONE_DECISION`.
        2.  **In `uiService.js` (conceptual):**
            *   Logic for "Go Alone" UI (e.g., a checkbox or Yes/No buttons) shown to the maker. On action, call `socketService.emitGoAloneDecision`.
    *   **Files affected:** `src/client/services/socketService.js`, `src/client/services/uiService.js`.
    *   **Unit Tests:** (Conceptual)
        *   Test `socketService.emitGoAloneDecision` sends correct event and payload.

---

**6. Client: Implement "Play Card" Action Emitter**
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

**7. Client: Dynamic UI Updates from `gameState`**
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

**8. Client: Contextual UI Element Control**
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

**9. Persistence: Game State Saving & Loading**
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

**10. Server: Robust Reconnection for In-Progress Games**
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

## Medium Term Priorities (Original)

5.  **Refine Team Management & Definitions (`src/utils/players.js` & `state.js`)**
    *   **(Largely covered by 'Next Sprint Priorities - Task 1'. Refer to that section and its detailed implementation plan.)**
    *   Original Tasks:
        *   Formalize team structure within `gameState.players` or as a separate `gameState.teams` object during `initializePlayers`.
        *   Ensure `getPlayerTeam` in `players.js` (or a similar utility) robustly returns a consistent team ID (e.g., 'teamNS', 'teamEW', or 0/1) usable by scoring logic.
        *   Update `scoringPhase.js` to use these team definitions for `tricksTaken` and `teamScores`.

6.  **Client-Side Implementation (Ongoing & Critical)**
    *   **(This broad category is substantially covered by 'Next Sprint Priorities - Tasks 2, 3, 4, 5, 6, 7, 8'. Refer to that section and its detailed implementation plan for specific actionable client tasks.)**
    *   Original Task Overview: This is a broad category. Key next client steps include:
        *   Handling `assign_role` and `game_full` events.
        *   Displaying player hands, turn card, current trick, scores, game messages.
        *   Emitting bidding actions (`action_order_up_decision`, `action_dealer_discard`, `action_call_trump_decision`) based on user input via UI modals.
        *   Emitting `action_go_alone_decision`.
        *   Emitting `action_play_card` by selecting a card from the hand.
        *   Dynamically updating the UI based on `gameState` broadcasts from the server.
        *   Disabling/enabling UI elements based on `currentPlayer` and `gamePhase`.

7.  **Persistence - Game State Saving/Loading**
    *   **(Largely covered by 'Next Sprint Priorities - Task 9'. Refer to that section and its detailed implementation plan.)**
    *   Original Tasks:
        *   Re-evaluate or re-implement a `src/game/stateManager.js` (archived).
        *   Integrate `src/db/gameRepository.js` (kept) to save game state at appropriate milestones (e.g., after each hand, on significant player actions).
        *   Implement logic to load an existing game if a `gameId` is known (e.g., for player reconnection to an active game).

## Longer Term / Enhancements (Original)

8.  **Robust Reconnection Logic (Server & Client)**
    *   **Server:** Beyond basic disconnect/reconnect, allow players to rejoin a game in progress if their session/role can be identified. **(Server portion covered by 'Next Sprint Priorities - Task 10'. Refer to that section and its detailed implementation plan.)**
    *   **Client:** Implement robust client-side reconnection attempts for dropped connections (the archived `src/socket/reconnectionHandler.js` had client-side logic that could be a reference for a new implementation).

9.  **Comprehensive Error Handling & User Feedback**
    *   Ensure all error conditions are gracefully handled and meaningful messages are sent to the client.
    *   Improve UI feedback for invalid actions or server errors.

10. **Testing (Continuous)**
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
