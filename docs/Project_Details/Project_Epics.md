## Epics

*   **Epic 0: Layer 1 Core Logic Completion & Verification:**
    *   **Goal:** Ensure all core Euchre game logic and utility functions defined as Layer 1 are fully implemented, rigorously unit-tested, and verified for purity and adherence to architectural mandates. This epic establishes the immutable foundation of the game logic.
    *   **Deliverables:**
        *   **0.1: Full Layer 1 Module Implementation:**
            *   All functions in `src/game/logic/` (e.g., `aiLogic.js`, `errors.js`, `validation.js`) are complete, pure, and stateless.
            *   All functions in `src/utils/` (e.g., `deck.js`, `errorUtils.js`, `historyUtils.js`, `i18n.js`, `idGenerator.js`, `lobbyUtils.js`, `players.js`, `settingsUtils.js`, `statsUtils.js`) are complete, pure, stateless, and do not perform I/O.
            *   All functions in `src/game/phases/` (e.g., `biddingPhase.js`, `endGame.js`, `goAlonePhase.js`, `lobbyPhase.js`, `playingPhase.js`, `scoringPhase.js`, `startNewHandPhase.js`) are complete, pure, stateless, do not perform I/O, and return new state objects.
        *   **0.2: Comprehensive Layer 1 Unit Test Suite:**
            *   Dedicated unit test files for each Layer 1 module (e.g., `test/game/logic/*.unit.test.js`, `test/game/phases/*.unit.test.js`, `test/utils/*.unit.test.js`).
            *   Achieve minimum 95% code coverage for statements and branches for all Layer 1 modules (as per NFR7).
            *   All unit tests pass consistently when executed via `npm run test:coverage_layer1`.
        *   **0.3: Architectural Mandate Adherence (Layer 1):**
            *   Verification through manual code review and/or automated LLM audits (NFR6.4) that Layer 1 modules strictly adhere to purity (no side effects, no mutation of global/shared state), statelessness, and no I/O operations (NFR6.1).
            *   Ensure errors are *thrown* as specific `src/game/logic/errors.js` instances.
        *   **0.4: `esmock` Standardization Completion:**
            *   All Layer 1 unit tests (`test/game/logic/`, `test/game/phases/`, `test/utils/`) utilize `esmock_wrapper.js` for mocking dependencies, replacing any deprecated mocking patterns. This ensures cross-platform compatibility and consistent test setup as per `docs/esmock_fix_and_prevention_plan.md`.
        *   **0.5: Clean Test Suite:**
            *   All Layer 1 unit tests pass consistently (`npm run test:coverage_layer1`), ensuring no intermittent failures or environmental dependencies.
    *   **Value:** Provides a fully validated, reliable, and immutable core game logic foundation; critical prerequisite for all subsequent development; enables efficient AI-assisted development by ensuring clean context.

*   **Epic 1: Core Infrastructure Baseline:**
    *   **Goal:** Establish the fundamental Node.js/Express server framework, configure centralized logging, set up the MongoDB database connection with `gameRepository`, and create a basic deployable health-check endpoint. This epic ensures the core self-hosted backend infrastructure is stable, testable, and capable of basic persistence before game logic is introduced.
    *   **Deliverables:**
        *   **1.1: Node.js/Express Server Setup (`src/server.js`):**
            *   Initialize an Express.js application and create an HTTP server instance (`http.createServer(app)`).
            *   Configure basic middleware including `express.json()`.
            *   Define environment variable loading for the server port (e.g., `PORT`).
            *   Implement graceful server shutdown on `SIGINT` and `SIGTERM` signals to ensure proper cleanup.
            *   **NFR8 (Deployability) Reinforcement:** If the server fails to bind to the specified `PORT` (due to it being in use or invalid), it shall terminate with an informative error message (e.g., `EADDRINUSE` for port conflict).
            *   Verify server starts and is accessible on `http://localhost:PORT`.
        *   **1.2: Centralized Logging (`src/utils/logger.js`):**
            *   Integrate Pino logger with structured JSON logging capabilities.
            *   Configure log levels via environment variables (`LOG_LEVEL`, `DEBUG_LEVEL`).
            *   Enable `pino-pretty` for development environments.
            *   Implement `log` utility function for consistent logging across layers (e.g., `logger.info`, `logger.warn`, `logger.error`, `logger.debug`).
            *   Verify log messages appear correctly in console/output.
        *   **1.3: MongoDB Configuration & Repository (`src/config/database.js`, `src/db/gameRepository.js`):**
            *   Define MongoDB connection parameters (host, port, database, options) in `src/config/database.js`, externalized via `process.env.MONGO_HOST`, `MONGO_PORT`, `MONGO_DB`.
            *   Implement `GameRepository` class (`src/db/gameRepository.js`) as a singleton for managing MongoDB connection.
            *   Implement asynchronous `connect()`, `getGame()`, `updateGame()` (upsert), and `disconnect()` methods.
            *   Ensure `gameRepository` creates necessary unique (`gameId`) and TTL (`updatedAt`) indexes upon connection (NFR4.4).
            *   Verify successful connection and basic read/write operations (e.g., saving and retrieving a dummy game state).
        *   **1.4: Health Check Endpoint (`src/server.js`):**
            *   Expose an HTTP GET endpoint at `/api/status`.
            *   This endpoint shall return a JSON response `{"status": "ok", "timestamp": "..."}`.
            *   **Health Check Robustness:** Extend this health check to actively perform a lightweight query against MongoDB (e.g., `db.admin().ping()`) to confirm database responsiveness, not just connectivity status.
            *   Verify accessibility via web browser/curl.
        *   **1.5: Static File Serving (`src/server.js`):**
            *   Configure Express to serve static files from the `public/` directory using `express.static()`.
            *   Ensure `public/index.html` is served as the default entry page.
            *   Verify the `public/index.html` loads correctly in a web browser.
        *   **1.6: Automated Deployment Baseline:**
            *   The existing `test.yml` GitHub Action workflow (or a new dedicated deployment workflow) shall be configured to successfully build the application and deploy this minimal server baseline (including static files, health check) to the self-hosted environment.
            *   **Verification:** Confirm the deployed health check endpoint is reachable externally and returns "ok", demonstrating successful deployment of the core infrastructure.
            *   **Deployment Pre-Checks:** Document all required environmental prerequisites for the self-hosted environment (e.g., Node.js LTS version, MongoDB version, OS requirements, necessary network ports, network firewall rules, SSH configuration, and initial disk space requirements on the target server) to ensure smooth automated deployment.
    *   **Value:** Provides a stable, observable foundation; proves self-hosted environment setup; enables early testing of core non-game components.

*   **Epic 2: Multiplayer Lobby & Connection Core:**
    *   **Goal:** Implement the essential real-time multiplayer capabilities, including `Socket.IO` server setup, game room creation and joining, player role assignment, and initial player connection/disconnection handling. This epic establishes the basic multiplayer lobby system required before any game actions.
    *   **Deliverables:**
        *   **2.1: Socket.IO Server Initialization (`src/socket/index.js`):**
            *   Initialize `Socket.IO.Server` attached to the existing HTTP server (`httpServer`).
            *   Configure CORS for `Socket.IO` (e.g., `origin: "*"`, `methods: ["GET", "POST"]`).
            *   **Socket.IO Configuration (NFR1.1, NFR2.1):** Review and apply `maxHttpBufferSize` and `maxPayload` limits to mitigate large malicious messages.
            *   Register the primary `connection` and `disconnect` event listeners.
            *   Ensure `socket.id` is logged for new connections.
        *   **2.2: Player Connection Handling (`src/socket/handlers/playerConnectionHandlers.js`):**
            *   Implement `handlePlayerConnect` to manage new raw socket connections (though core game joining will be via `JOIN_GAME`).
            *   Implement `handlePlayerDisconnect` to mark players as `isConnected: false` in `gameState` and persist this status (NFR3).
            *   Ensure `socket.currentGameId` is set when a player joins a game, to be used on disconnect.
        *   **2.3: Game Creation & Joining (`src/socket/handlers/lobbyHandlers.js`):**
            *   Implement `GAME_EVENTS.JOIN_GAME` event handler on the server.
            *   If `gameIdToJoin` is not provided, generate a new unique `gameId` (using `src/utils/idGenerator.js`).
            *   Create initial `gameState` for new games, setting `gamePhase: LOBBY`.
            *   Persist initial `gameState` via `gameRepository.createGame()` and `updateGame()`.
            *   If `gameIdToJoin` is provided, retrieve existing `gameState` via `gameRepository.getGame()`.
            *   Handle "Game not found" scenarios for existing `gameIdToJoin` (FR1).
            *   Join the socket to the corresponding `Socket.IO` room (`socket.join(gameId)`).
        *   **2.4: Player Role Assignment & Lobby State:**
            *   Implement `assignRoleToPlayer` (`src/utils/lobbyUtils.js`) to assign a `PLAYER_ROLES` slot (e.g., "south", "west") to a joining player.
            *   Ensure player's custom name, `userId`, and `socketId` are stored in `gameState.players[role]`.
            *   **Player Naming (NFR5.6):** Reinforce `NFR5.6` to explicitly cover length limits (e.g., max 20 characters) for `playerName` in addition to input sanitization, to prevent excessive client-side rendering or database storage.
            *   Maintain `isConnected: true` status for active players.
            *   Use `isLobbyFull` (`src/utils/lobbyUtils.js`) to determine when 4 players are connected.
            *   Broadcast `GAME_EVENTS.ASSIGN_ROLE` to the joining player with their assigned role, `gameId`, and `isHost` status.
        *   **2.5: Lobby State Synchronization:**
            *   After any `JOIN_GAME` or `PLAYER_DISCONNECTED` event, broadcast the updated `gameState` to all clients in the specific `gameId` room using `io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, updatedGameState)` (FR4).
            *   Ensure sensitive data (like other players' hands) is *not* included in the `STATE_UPDATE` for non-owning clients (NFR5.3).
        *   **2.6: Lobby Full & Game Start Transition:**
            *   If `isLobbyFull` returns `true` after a player joins, automatically transition the `gamePhase` to `GAME_PHASES.DEALING` (`src/game/phases/lobbyPhase.js` - `attemptToStartGame`).
            *   Persist this phase change to MongoDB.
        *   **2.7: Player Reconnection Handling (`src/socket/handlers/playerConnectionHandlers.js`):**
            *   Implement `GAME_EVENTS.ACTION_REJOIN_GAME` handler.
            *   Retrieve game state from `gameRepository.getGame()` using `gameId` and `playerId`.
            *   Re-associate `socket.id` with the player's role and mark `isConnected: true`.
            *   Broadcast `GAME_EVENTS.STATE_UPDATE` to the rejoining player and the game room.
    *   **Value:** Enables players to connect, form lobbies, and experience the core real-time connection; provides a framework for managing player presence.

*   **Epic 3: Euchre Game Logic - Bidding & Initial Deal:**
    *   **Goal:** Fully implement the server-side logic for the initial setup of a Euchre hand, including dealer rotation, card dealing, and both rounds of trump bidding. This epic leverages Layer 1 pure functions and integrates them with Layer 3 Socket Handlers to manage the flow of the bidding phase.
    *   **Deliverables:**
        *   **3.1: New Hand Initialization (`src/game/phases/startNewHandPhase.js`):**
            *   Implement `startNewHand` pure function to:
                *   Rotate `dealer` role (`src/utils/players.js.getNextPlayer`).
                *   Create and shuffle a new 24-card Euchre `deck` (`src/utils/deck.js`).
                *   Deal 5 `cards` to each of the 4 players, placing remaining `cards` in `kitty`.
                *   Set `turnCard` from `kitty`.
                *   Determine `firstBidder` (player to left of dealer).
                *   Initialize `tricksTaken` for both teams to zero.
                *   Reset hand-specific `gameState` properties (e.g., `trumpSuit`, `makerTeam`, `bids`).
            *   This function is called by `lobbyPhase.js` when the game starts (lobby full) or when a new hand is requested.
        *   **3.2: Round 1 Bidding Logic (`src/game/phases/biddingPhase.js`, `src/game/logic/validation.js`):**
            *   Implement `handleOrderUpDecision` pure function:
                *   Validates player's "orderUp" or "pass" decision (`src/game/logic/validation.js.validateBid`).
                *   Updates `gameState` with `bids` array.
                *   If ordered up, sets `trumpSuit`, `makerTeam`, transitions to `DEALER_DISCARD` phase, and sets `currentPlayer` to `dealer`.
                *   If passed, advances `currentPlayer` to next bidder.
                *   If all pass, transitions to `ORDER_UP_ROUND2` phase.
        *   **3.3: Dealer Discard Logic (`src/game/phases/biddingPhase.js`, `src/game/logic/validation.js`):**
            *   Implement `handleDealerDiscard` pure function:
                *   Validates dealer's chosen `cardToDiscard` (`src/game/logic/validation.js.validateDealerDiscard`).
                *   Removes `cardToDiscard` from dealer's hand, ensuring 5 cards remain (dealer implicitly picked up turn card earlier).
                *   Sets `turnCard` to `null` (now in hand).
                *   Transitions to `GOING_ALONE_DECISION` phase, setting `currentPlayer` to the `maker` (who ordered up).
        *   **3.4: Round 2 Bidding Logic (`src/game/phases/biddingPhase.js`, `src/game/logic/validation.js`):**
            *   Implement `handleCallTrumpDecision` pure function:
                *   Validates player's "callTrump" (with chosen suit) or "pass" decision (`src/game/logic/validation.js.validateBid`).
                *   Updates `gameState` with `bids` array.
                *   If trump called, sets `trumpSuit`, `makerTeam`, transitions to `GOING_ALONE_DECISION` phase, and sets `currentPlayer` to the caller.
                *   If passed, advances `currentPlayer`.
                *   If all (including dealer) pass, transitions to `DEALING` phase (misdeal).
        *   **3.5: Socket Handlers for Bidding (`src/socket/handlers/biddingHandlers.js`):**
            *   Register `GAME_EVENTS.ACTION_ORDER_UP_DECISION`, `GAME_EVENTS.ACTION_DEALER_DISCARD`, `GAME_EVENTS.ACTION_CALL_TRUMP_DECISION` event handlers.
            *   Each handler will:
                *   Retrieve `gameState` from `gameRepository.getGame()`.
                *   Validate basic input.
                *   **Bidding Logic Input Validation (NFR5.2 reinforcement):** Implement robust validation/sanitization of the `bids` array (`data.bids` if passed, or `gameState.bids` from repo) before passing to Layer 1 pure functions. This includes checking for missing `decision` properties or other malformed elements to prevent Layer 1 from operating on potentially corrupted historical bid data.
                *   Call the appropriate pure Layer 1 logic function (`handleOrderUpDecision`, `handleDealerDiscard`, `handleCallTrumpDecision`).
                *   Persist the `updatedGameState` via `gameRepository.updateGame()`.
                *   Broadcast the `updatedGameState` to the game room (`io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, updatedGameState)`).
                *   Handle and emit `GAME_EVENTS.ACTION_ERROR` for validation or phase logic errors from Layer 1.
    *   **Value:** Establishes the full bidding and hand setup mechanics, allowing players to successfully determine trump for a hand.

*   **Epic 4: Euchre Game Logic - Trick Play & Scoring:**
    *   **Goal:** Implement the core trick-playing mechanics, including card validation, trick winner determination, and the end-of-hand scoring phase, integrating Layer 1 logic for a fully playable hand. This also includes the "Go Alone" decision.
    *   **Deliverables:**
        *   **4.1: "Go Alone" Decision Logic (`src/game/phases/goAlonePhase.js`):**
            *   Implement `handleGoAloneDecision` pure function:
                *   Validates `decidingPlayerRole` is the trump maker.
                *   Sets `goingAlone` flag and `playerGoingAlone` in `gameState`.
                *   Identifies `partnerSittingOut` and adjusts `currentPlayer` for first play of trick if partner sits out.
                *   **"Go Alone" Robustness (NFR4.2.1 reinforcement):** Add defensive check to ensure `playerGoingAlone` and `partnerSittingOut` are not already inconsistently set before update. If inconsistent, log warning or throw `PhaseLogicError`.
                *   Transitions to `PLAYING` phase.
        *   **4.2: Socket Handler for "Go Alone" (`src/socket/handlers/goAloneHandlers.js`):**
            *   Register `GAME_EVENTS.ACTION_GO_ALONE_DECISION` event handler.
            *   Retrieves `gameState`, calls `handleGoAloneDecision`, persists new state, and broadcasts update.
        *   **4.3: Card Play Logic (`src/game/phases/playingPhase.js`, `src/game/logic/validation.js`):**
            *   Implement `handlePlayCard` pure function:
                *   Validates player's chosen `cardPlayed` (`src/game/logic/validation.js.validatePlay`, ensuring adherence to suit led, trump rules).
                *   Removes `cardPlayed` from player's hand.
                *   Adds `cardPlayed` to `currentTrick`.
                *   Determines `nextPlayer` for the trick, skipping `partnerSittingOut` if applicable.
                *   Transitions game phase if trick is complete.
        *   **4.4: Trick Winner Determination (`src/game/phases/playingPhase.js`, `src/utils/deck.js`):**
            *   Implement `determineTrickWinner` pure function:
                *   Compares cards in `currentTrick` based on `trumpSuit` and `ledSuit` rules (`src/utils/deck.js.getCardRank`, `isRightBower`, `isLeftBower`).
                *   Returns the `playerRole` of the trick winner.
        *   **4.5: Hand Completion & Scoring Logic (`src/game/phases/scoringPhase.js`, `src/game/phases/endGame.js`):**
            *   Implement `calculateAndApplyScore` pure function:
                *   Calculates points for the maker team or opponents based on `tricksTaken` and `goingAlone` status.
                *   Updates `teamScores`.
                *   Resets hand-specific `gameState` properties (e.g., `tricksTaken`, `currentTrick`).
                *   Calls `checkGameOver` to determine if `WINNING_SCORE` has been reached.
            *   Implement `checkGameOver` pure function:
                *   Determines if game has reached `WINNING_SCORE`.
                *   If game over, sets `gamePhase: GAME_OVER` and `winningTeam`.
                *   If not game over, transitions to `DEALING` phase for new hand, rotates `dealer`.
            *   Implement `startNewGame` (if not already handled in `endGame.js` or `startNewHandPhase.js`) to reset overall game for new match.
        *   **4.6: Socket Handlers for Playing & Scoring (`src/socket/handlers/playingHandlers.js`, `src/socket/handlers/gameOverHandlers.js`):**
            *   Register `GAME_EVENTS.ACTION_PLAY_CARD` handler: Retrieves state, calls `handlePlayCard`, persists, broadcasts.
            *   **Card Data Integrity (NFR4.2.1/NFR4.2.2 reinforcement):** Implement robust validation/sanitization of `cardPlayed` data from client before passing to Layer 1. Ensure `Card` objects (especially `id`, `suit`, `value`) are well-formed and consistent with game rules, preventing malformed or duplicate cards from entering the game state.
            *   Register `GAME_EVENTS.ACTION_REQUEST_NEW_GAME` handler: Retrieves state, calls `startNewGame` (or equivalent reset), persists, broadcasts.
    *   **Value:** Enables full interactive gameplay of a Euchre hand, from card play to trick resolution and scoring.

*   **Epic 5: Minimal Playable UI:**
    *   **Goal:** Develop a basic React frontend to enable players to interact with the game, specifically for joining a lobby, seeing their hand, making bids, playing cards, and viewing scores in real-time, serving as the first end-to-end user experience.
    *   **Deliverables:**
        *   **5.1: React Frontend Setup:**
            *   Initialize a React application within the monorepo (e.g., in an `apps/web` or `packages/frontend` directory).
            *   Configure build tools (e.g., Webpack, Vite) and a development server for React.
            *   **Frontend Bundle Size Optimization:** Target initial load JavaScript bundle size <500KB gzipped by configuring build tools for tree-shaking, code splitting, and minification.
            *   Integrate `socket.io-client` for WebSocket communication with the backend.
        *   **5.2: Lobby Screen Implementation (FR1, UI Design Goals):**
            *   UI for players to input their custom `playerName` and choose to create a new game or join an existing game by `gameId`.
            *   Visual display of connected players in the lobby, using their custom names and indicating empty slots.
            *   UI feedback for name uniqueness/validation and "Game not found" or "Game full" errors.
            *   Button for the host to request starting the game.
        *   **5.3: Game Table Screen - Core Display (UI Design Goals):**
            *   Layout for the main game table, representing 4 player positions.
            *   Prominent display of the current player's hand with visual card representations (suit, rank).
            *   Representation of other players' hands (card backs with count).
            *   Area for the active trick.
            *   Scoreboard displaying team scores.
            *   Visual indicator for the current `dealer`.
            *   Area for game messages/announcements.
            *   **Robust Card Rendering:** The UI's card components shall gracefully handle and display placeholders or error icons for malformed or missing card data received in `gameState` updates, without crashing the application.
            *   **Critical Security (NFR5.3 reinforcement):** The client-side rendering logic *shall strictly enforce* NFR5.3 for player hands, ensuring it *never* displays other players' actual card details (suit, rank, value) even if inadvertently present in `gameState` payloads. Only obscured information (e.g., card backs, count) is permitted for non-owning players.
        *   **5.4: Interactive Gameplay Elements:**
            *   **Bidding Controls:** Implement modal dialogs or interactive buttons for "Order Up" / "Pass" and "Call Trump" / "Pass" (with suit selection), reflecting `GAME_PHASES.ORDER_UP_ROUND1` and `ORDER_UP_ROUND2`.
            *   **Dealer Discard:** UI for the dealer to select and discard a card after being ordered up.
            *   **Card Play:** Clickable cards in the player's hand. Client-side logic to visually enable only legally playable cards (mirroring server validation from FR3.5).
            *   **Input Debouncing/Throttling:** The UI shall debounce or throttle rapid player actions (e.g., card clicks, bid button presses) to prevent sending multiple duplicate or conflicting events to the server before a response is received, minimizing unnecessary server load and out-of-sync client behavior.
            *   **"Go Alone" Decision:** UI for the trump maker to choose "Go Alone" or "Play with Partner."
        *   **5.5: Real-time UI Synchronization:**
            *   Client-side logic to consume `GAME_EVENTS.STATE_UPDATE` events from the server and re-render the entire `Game Table Screen` based on the new `gameState` (FR4.3).
            *   Client-side data redaction for other players' hands (NFR5.3).
            *   Basic `Client-Side Lag Handling` (e.g., loading spinners) during network interruptions.
    *   **Value:** Enables full end-to-end testing of the core game loop from a user perspective; provides the first tangible product for user interaction.

*   **Epic 6: Reconnection & Game State Recovery:**
    *   **Goal:** Implement and refine robust automatic player reconnection and server restart recovery mechanisms, ensuring that active games can be seamlessly rejoined and resumed from their last saved state after any interruption.
    *   **Deliverables:**
        *   **6.1: Client-Side Reconnection Logic:**
            *   Implement client-side reconnection strategy using `socket.io-client` (e.g., `socket.on('reconnect')`).
            *   Upon reconnection, automatically send `GAME_EVENTS.ACTION_REJOIN_GAME` to the server with `gameId` and `playerId`.
            *   **Client-Side Reconnection UI:** Ensure UI feedback for reconnection attempts includes appropriate debouncing or smoothing (e.g., a minimum display duration for "Reconnecting..." status) to prevent excessive flickering during transient network issues.
        *   **6.2: Server-Side Active Game Recovery (NFR4.3):**
            *   During `src/server.js` startup, after successful MongoDB connection, query `gameRepository.findActiveGamesByPlayer()` (or `getGame` for specific known game IDs) to load all ongoing games into server memory.
            *   Ensure server remains functional and ready to accept `ACTION_REJOIN_GAME` for these recovered games.
            *   **Robust Corrupt State Handling (NFR4.3.4 reinforcement):** Implementation of active game detection must include robust `try-catch` blocks and validation to handle structurally corrupt game records from the database *without crashing the server*. If a game cannot be parsed/validated, it should be logged critically and marked as unrecoverable.
        *   **6.3: Client-Side Game State Resynchronization:**
            *   Upon successful `ACTION_REJOIN_GAME` and receipt of `GAME_EVENTS.STATE_UPDATE` from the server, the client shall fully resynchronize its UI to the received `gameState` (FR2.2).
            *   Verify player's assigned role and hand are correctly restored in the UI.
        *   **6.4: Player Status Indicators:**
            *   Implement visual indicators on the Game Table Screen to show if a player is currently `connected` or `disconnected` (FR2.3 implies this).
        *   **6.5: Server-Side Rejoin Validation:**
            *   Add a check in `src/socket/handlers/playerConnectionHandlers.js.handleRejoinGame` to explicitly reject rejoin attempts if `existingGameState.gamePhase === GAME_PHASES.GAME_OVER`, emitting an appropriate `GAME_EVENTS.ERROR` message like "Game has ended, cannot rejoin."
    *   **Value:** Significantly improves game reliability and user experience by minimizing frustration from disconnections and allowing game continuity.

### Hindsight is 20/20: The 'If Only...' Reflection

*   **Developer Needs:** If we had provided more concrete, step-by-step goals and explicit examples for each major deliverable within the epics (e.g., specific test cases for Layer 1 validation, mock API contracts for frontend integration), it would have streamlined the development process, reduced ambiguity for both human and AI developers, and enabled more targeted implementation.
*   **Layer 1 Improvements:** If we had enforced stricter input validation schemas and explicit return types (using JSDoc or TypeScript) for all Layer 1 pure functions from the start, it would have caught many subtle logic bugs earlier, enhanced the predictability of core game logic, simplified test mocking, and improved AI agent integration by providing clearer contracts for function interactions.