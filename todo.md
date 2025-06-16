# Project TODO List

This file outlines the next crucial steps for the Euchre Multiplayer game development, following the foundational rewrite of core server components.

## Immediate Next Steps (Core Game Flow Completion)

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

## Medium Term Priorities

5.  **Refine Team Management & Definitions (`src/utils/players.js` & `state.js`)**
    *   **Tasks:**
        *   Formalize team structure within `gameState.players` or as a separate `gameState.teams` object during `initializePlayers`.
        *   Ensure `getPlayerTeam` in `players.js` (or a similar utility) robustly returns a consistent team ID (e.g., 'teamNS', 'teamEW', or 0/1) usable by scoring logic.
        *   Update `scoringPhase.js` to use these team definitions for `tricksTaken` and `teamScores`.

6.  **Client-Side Implementation (Ongoing & Critical)**
    *   **Tasks:** This is a broad category. Key next client steps include:
        *   Handling `assign_role` and `game_full` events.
        *   Displaying player hands, turn card, current trick, scores, game messages.
        *   Emitting bidding actions (`action_order_up_decision`, `action_dealer_discard`, `action_call_trump_decision`) based on user input via UI modals.
        *   Emitting `action_go_alone_decision`.
        *   Emitting `action_play_card` by selecting a card from the hand.
        *   Dynamically updating the UI based on `gameState` broadcasts from the server.
        *   Disabling/enabling UI elements based on `currentPlayer` and `gamePhase`.

7.  **Persistence - Game State Saving/Loading**
    *   **Tasks:**
        *   Re-evaluate or re-implement a `src/game/stateManager.js` (archived).
        *   Integrate `src/db/gameRepository.js` (kept) to save game state at appropriate milestones (e.g., after each hand, on significant player actions).
        *   Implement logic to load an existing game if a `gameId` is known (e.g., for player reconnection to an active game).

## Longer Term / Enhancements

8.  **Robust Reconnection Logic (Server & Client)**
    *   **Server:** Beyond basic disconnect/reconnect, allow players to rejoin a game in progress if their session/role can be identified.
    *   **Client:** Implement robust client-side reconnection attempts for dropped connections (the archived `src/socket/reconnectionHandler.js` had client-side logic that could be a reference for a new implementation).

9.  **Comprehensive Error Handling & User Feedback**
    *   Ensure all error conditions are gracefully handled and meaningful messages are sent to the client.
    *   Improve UI feedback for invalid actions or server errors.

10. **Testing (Continuous)**
    *   Write unit and integration tests for all new phase logic and socket handlers.
    *   Aim for high test coverage.
    *   Develop end-to-end tests for full game flows.

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
