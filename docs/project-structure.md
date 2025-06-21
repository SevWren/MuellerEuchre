# Project Structure Documentation

This document outlines the structure of the `src` directory for the Euchre game application, detailing the purpose of each subdirectory and key files within them. It also includes a section on projected state, listing potentially missing functions or modules for future development.

## `src` Directory Layout

The `src` directory contains the core source code for the application, organized into the following subdirectories:

### 1. `client/`

*   **Purpose**: Contains all client-side code, likely for a web-based interface.
*   **Key Subdirectories/Files**:
    *   `components/`: This likely holds reusable UI components (e.g., `Card`, `GameBoard`, `PlayerHand`, `ConnectionStatus`). The specific files like `Card/Card.jsx` and `Card/Card.css` suggest a React-like component structure.
    *   `hooks/`: Contains custom React hooks, such as `useSocket.js` for managing WebSocket connections on the client-side.
    *   `services/`: Client-side services that abstract logic for interacting with the server or managing client state.
        *   `socketService.js`: Manages client-side WebSocket communication.
        *   `stateService.js`: Manages client-side game state (e.g., player hand, scores).
        *   `stateSyncService.js`: Handles synchronization of state with the server, including offline queueing.
        *   `uiIntegrationService.js`: Integrates game state updates with the UI components.
        *   `uiService.js`: Provides UI functionalities like displaying messages, modals, and prompts.
    *   `utils/`: Client-side utility functions.
        *   `cardUtils.js`: Utilities for card manipulations specific to the client display or logic.

### 2. `config/`

*   **Purpose**: Holds configuration files for the application.
*   **Key Files**:
    *   `constants.js`: Defines application-wide constants such as game rules (suits, values, winning score), game phases, event names for WebSockets, logging levels, and storage keys.
    *   `database.js`: Configures database connections (e.g., MongoDB, Redis), likely using environment variables.

### 3. `db/`

*   **Purpose**: Contains database interaction logic, primarily for persisting game state.
*   **Key Files**:
    *   `gameRepository.js`: Implements a repository pattern for abstracting database operations related to game data (e.g., creating, retrieving, updating game states in MongoDB).

### 4. `game/`

*   **Purpose**: Contains the core game logic for Euchre. This is where rules are implemented, and game progression is managed.
*   **Key Subdirectories/Files**:
    *   `logic/`: Core game rules and validation logic.
        *   `errors.js`: Defines custom error classes for specific game validation failures (e.g., `NotPlayersTurnError`, `InvalidPhaseError`).
        *   `validation.js`: Contains functions to validate game actions (e.g., `validatePlay`, `validateBid`).
        *   `gameLogic.js.archived`: Appears to be an archived file, possibly containing older game logic.
    *   `phases/`: Manages the logic for each distinct phase of the Euchre game.
        *   `bidding.js`: Handles bidding logic (ordering up, dealer discard, trump calling). Note: There's also a `biddingPhase.js` which might indicate some refactoring or organization choices.
        *   `biddingPhase.js`: Contains more comprehensive logic for the bidding rounds.
        *   `endGame.js`: Logic for ending a game, calculating final scores, and potentially setting up for a new game.
        *   `goAlonePhase.js`: Handles the "go alone" decision by the trump maker.
        *   `lobbyPhase.js`: Manages players joining and starting a game from the lobby.
        *   `playingPhase.js`: Logic for the card-playing part of the hand (tricks, following suit).
        *   `scoringPhase.js`: Calculates and applies scores after a hand is completed.
        *   `startNewHandPhase.js`: Logic for starting a new hand (dealing, setting up turn card).
    *   `state.js`: Manages the game state, including functions to initialize, get, and update the state, likely with a focus on immutability.
    *   `stateManager.js.archived`: An archived file, possibly an older version of state management.

### 5. `server.js` (in `src/`)

*   **Purpose**: The main entry point for the Node.js server.
*   **Role**:
    *   Initializes the Express application.
    *   Creates an HTTP server.
    *   Sets up middleware (e.g., for JSON parsing, serving static files from `public/`).
    *   Defines basic API routes (e.g., `/api/status`).
    *   Initializes and attaches the Socket.IO server (using logic from `src/socket/index.js`).
    *   Starts the server and listens on a configured port.
    *   Handles graceful shutdown.

### 6. `socket/`

*   **Purpose**: Contains all WebSocket communication logic using Socket.IO.
*   **Key Subdirectories/Files**:
    *   `handlers/`: Contains specific event handlers for different game actions received over WebSockets.
        *   `biddingHandlers.js`: Handles socket events related to bidding.
        *   `gameOverHandlers.js`: Handles events for game over scenarios, like starting a new game.
        *   `goAloneHandlers.js`: Handles the "go alone" decision event.
        *   `lobbyHandlers.js`: Handles lobby-related events like joining or starting a game.
        *   `playerConnectionHandlers.js`: Manages player connect, disconnect, and rejoin events.
        *   `playingHandlers.js`: Handles card play events.
    *   `index.js`: Initializes the Socket.IO server, sets up general connection listeners, and registers all the specific event handlers from the `handlers/` directory.
    *   `reconnectionHandler.js.archived`: Archived file, likely older reconnection logic.

### 7. `utils/`

*   **Purpose**: Contains utility functions used across the application (both server-side and potentially client-side if not specific to Node.js).
*   **Key Files**:
    *   `deck.js`: Utilities for creating, shuffling, and managing Euchre cards and decks (e.g., card ranking, bower logic).
    *   `errorUtils.js`: Utilities for creating standardized error payloads.
    *   `lobbyUtils.js`: Helper functions for lobby management (e.g., assigning roles, checking if full).
    *   `logger.js`: Configures and exports a logger instance (using Pino) for application logging.
    *   `players.js`: Utilities related to players (e.g., getting next player, partner, team information, initializing player objects).

---

## Projected State / Missing Modules or Functions

Based on the current structure and common application patterns, the following areas might benefit from future development or additions:

### Core Game Logic & State Management:
*   **Advanced AI Players**: If single-player modes or filling empty slots with AI is desired, a dedicated module for AI decision-making would be needed.
*   **Spectator Mode**: Logic to allow users to watch games without participating. This would involve changes in state broadcasting and possibly new socket events.
*   **Game Variations/Rules**: A more flexible system for handling different Euchre rule variations (e.g., "stick the dealer", British rules) if that's a future goal.
*   **Persistent Player Stats/Profiles**: Beyond `gameRepository` for game states, a separate repository/service for managing user accounts, persistent player statistics (win/loss, ELO rating), and preferences.

### Server & API:
*   **Authentication/Authorization**: Robust mechanisms for user authentication (e.g., JWT, OAuth) and authorization for game actions or API access. Currently, user identity seems loosely coupled with `socket.id` or a basic `userId`.
*   **Admin Interface/API**: For managing games, users, or viewing server status.
*   **More Comprehensive API**: Beyond `/api/status`, potentially APIs for listing active games, game history, player stats, etc.
*   **Rate Limiting**: For public-facing API endpoints and possibly socket events to prevent abuse.

### Socket Communication:
*   **More Specific Error Events**: Instead of a single `GAME_EVENTS.ERROR` for many situations, more granular error events could help the client provide better feedback.
*   **Room Management Enhancements**: More sophisticated logic for managing Socket.IO rooms, especially if multiple concurrent games are a primary feature (e.g., listing rooms, private rooms). The current `gameId` seems to function as a room identifier.

### Utilities:
*   **Input Validation Schemas**: Centralized schemas (e.g., using Joi or Zod) for validating payloads for API requests and socket event data, rather than manual checks in each handler.
*   **Internationalization (i18n)**: If multiple languages are to be supported, a system for managing and serving localized strings.
*   **Event Emitter/Bus**: For more decoupled communication between different server-side modules if direct function calls become too complex.

### Client-Side:
*   **State Management Library**: While `stateService.js` exists, for more complex client applications, a dedicated state management library (like Redux, Zustand, or Vuex if using Vue) might be beneficial.
*   **UI Testing**: Frameworks and utilities for testing client-side components and interactions.
*   **Build/Optimization Tools**: Advanced configuration for bundling, minification, and optimization of client-side assets.

### Testing:
*   **More Comprehensive Unit and Integration Tests**: The `.archived` test files suggest testing was considered. Expanding on this with a modern test runner (e.g., Jest, Vitest) for all critical modules (game logic, state, socket handlers, repositories) would be essential.
*   **End-to-End (E2E) Tests**: For testing full game flows from a user's perspective.

This list is not exhaustive but covers common areas for enhancement in web-based game applications.

---

## Identified Gaps in Test Coverage (`src` Directory)

The following is a list of modules and functionalities within the `src` directory that have been identified as potentially lacking sufficient test coverage. This list is based on a comparison of source files with existing test files and should be used as a guide for future test development.

### Client-side (`src/client/`)
*   **`hooks/useSocket.js`**: Unit tests for the custom hook's logic, WebSocket event handling, and state updates.
*   **`services/stateSyncService.js`**: Unit tests for state synchronization logic, offline queue management, and local storage interactions (mocking `localStorage`).
*   **`services/uiIntegrationService.js`**: Unit tests for how it subscribes to state changes and calls UI methods (mocking `gameUI` and `stateSyncService`).
*   **`utils/cardUtils.js` (client-specific)**: Unit tests for any client-side card utility functions.
*   **`components/*`**: While not explicitly listed for individual file tests in this subtask, UI components generally require testing (e.g., snapshot tests, interaction tests). This is a broader area for coverage.

### Configuration (`src/config/`)
*   **`database.js`**: Unit tests for the logic that processes environment variables and sets default configurations. Mock `process.env`.

### Database (`src/db/`)
*   **`gameRepository.js`**: Dedicated unit tests mocking the MongoDB client to cover all methods: `connect`, `createIndexes`, `updateGame`, `getGame`, `findActiveGamesByPlayer`, and `disconnect`. Focus on ensuring correct query formation and data transformation.

### Game Logic (`src/game/`)
*   **`logic/errors.js`**: While often tested implicitly, small unit tests could verify that custom error classes correctly store properties like `name`, `playerRole`, etc.
*   **`phases/bidding.js`**: If this file is still in use and contains logic distinct from `biddingPhase.js`, it would need its own tests.

### Server (`src/server.js`)
*   While integration tests are key for `server.js`, small unit tests could cover:
    *   The `/api/status` route handler logic.
    *   Any specific helper functions or custom middleware defined within `server.js` if it becomes more complex.

### Socket Handlers (`src/socket/handlers/`)
*   **`goAloneHandlers.js`**: Unit tests for `registerGoAloneHandlers` and its event listener, mocking game state interactions and Socket.IO emits.
*   **`lobbyHandlers.js`**: Unit tests for `registerLobbyHandlers`, covering both `request_start_game` and `GAME_EVENTS.JOIN_GAME` events. This will involve mocking game state, repository calls, and phase logic functions.
*   **`playerConnectionHandlers.js`**: Unit tests for `handlePlayerConnect`, `handleRejoinGame`, and `handlePlayerDisconnect`. These tests should mock `gameRepository`, `getGameState`/`updateGameState` (if still used by `handlePlayerConnect`), and Socket.IO methods.

### Socket Setup (`src/socket/index.js`)
*   **`index.js`**: Unit tests for `initializeSocket`. This could involve mocking the `socket.io` Server and Socket instances to verify that event handlers (connection, disconnect, custom events) are registered as expected on new connections.

### Utilities (`src/utils/`)
*   **`deck.js`**: Comprehensive unit tests for all card and deck utilities: `createDeck`, `shuffleDeck`, `cardToId`, `isRightBower`, `isLeftBower`, `getCardRank` (with various card, trump, and lead suit combinations), and `sortHand`.
*   **`lobbyUtils.js`**: Unit tests for `assignRoleToPlayer` (checking correct player object modification), `isLobbyFull`, and `getNextAvailableRole` with various `gameState.players` configurations.
*   **`logger.js`**: Unit tests for the initial log level determination logic based on environment variables (`LOG_LEVEL`, `DEBUG_LEVEL`). The Pino instance itself is an external library, but its configuration here can be tested.
