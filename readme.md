# 🃏 Euchre Multiplayer

> **🚧 Hobby Project & Work in Progress 🚧**
> Please note: This is a personal hobby project and is actively under development. Features may be incomplete or subject to change.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/SevWren/MuellerEuchre/actions/workflows/test.yml/badge.svg)](https://github.com/SevWren/MuellerEuchre/actions)
[![Coverage Status](https://coveralls.io/repos/github/SevWren/MuellerEuchre/badge.svg?branch=main)](https://coveralls.io/github/SevWren/MuellerEuchre?branch=main)

🚀 **Project Status:** Actively Developed & Maintained | 🎮 Gameplay Focus | 🔄 Real-time Multiplayer

A dynamic, real-time online Euchre card game experience. This project leverages Node.js, Express, and Socket.IO to deliver engaging multiplayer gameplay, complete with automatic reconnection and persistent game state management. Development is ongoing, with a focus on refining core mechanics, expanding features, and building a user-friendly frontend.

## ✨ Features

- **Real-time Multiplayer**: Leverages Socket.IO for seamless real-time gameplay. Core WebSocket handling can be seen in `src/server.js` and specific event handlers in `src/socket/handlers/`.
- **Automatic Reconnection**: Players can rejoin active games if their connection drops. Logic is managed in `src/socket/handlers/playerConnectionHandlers.js` (see `handleRejoinGame` and `handlePlayerDisconnect`).
- **Persistent Game State**: Game progress is saved automatically using MongoDB, as detailed in `src/db/gameRepository.js`.
- **Euchre Game Logic**: Core Euchre rules are implemented, including bidding, trump selection, card play, and scoring. Key validation rules are in `src/game/logic/validation.js`, with phase-specific logic in files like `src/game/phases/biddingPhase.js` and `src/game/phases/playingPhase.js`. (Note: `src/game/logic/gameLogic.js` was archived as part of a refactor to distribute logic into these more granular phase modules).
- **Responsive Design**: Planned for future development, allowing play on desktop or mobile devices via an HTML frontend.
- **Modern Tech Stack**: Built with Node.js, Express, and Socket.IO for a fast and reliable experience.
- **Server-Authoritative Logic**: Game logic is handled on the server-side to ensure fair play and prevent client-side manipulation.
- **Comprehensive Testing**: Includes unit and integration tests. Test scripts are in `package.json` and tests reside in the `test/` directory.

## 🚀 Quick Start

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/SevWren/MuellerEuchre.git
    cd MuellerEuchre
    ```

2.  **Install dependencies:**
    It's recommended to use `npm ci` for a clean install based on `package-lock.json`, or `npm install` if you don't have a lock file or are managing dependencies actively.

    ```bash
    npm ci
    # or
    npm install
    ```

3.  **Set up environment variables (if any):**
    _(If your project requires a `.env` file for specific configurations like database connection strings in production, add instructions here. For example: "Copy `.env.example` to `.env` and fill in the necessary values.")_
    Currently, the default configuration (e.g., for MongoDB connection) should work out of the box for local development if MongoDB is running on its default port (`mongodb://localhost:27017`).

4.  **Run the server:**
    - For production mode (or a simple start):
      ```bash
      npm start
      ```
    - For development mode (with Nodemon for automatic server restarts on file changes):
      ```bash
      npm run dev
      ```

5.  **Access the game:**
    Open your web browser and navigate to:
    ```
    http://localhost:3000
    ```
    _(This assumes the default port `3000` is used, as defined in `src/server.js`. If you've configured a different port via the `PORT` environment variable, use that instead.)_

## 🧪 Testing

We use a comprehensive testing strategy to ensure code quality and reliability. Tests are written using Mocha and Chai.

#### Test Directory Structure

Our tests are organized into the following directories under `test/`:

- `test/client/`: Contains tests for client-side logic and services (currently minimal as focus is backend).
  - `services/`: Tests for individual client-side services.
- `test/game/`: Focuses on core game state management and fundamental game logic.
  - `logic/`: Unit tests for specific game logic modules, like `validation.js`.
- `test/helpers/`: Utility functions and helpers used across various tests.
- `test/integration/`: Tests that cover interactions between multiple components or modules (e.g., lobby joining and game start flow).
- `test/phases/`: Contains tests specifically for the different game phases (bidding, playing, scoring, etc.).
- `test/server/`: Houses tests for server-side specific logic, including persistence.
  - `persistence/`: Tests related to database interactions and game state persistence.
- `test/socket/`: Dedicated to testing Socket.IO event handlers and communication logic.
  - `handlers/`: Unit tests for individual socket event handlers.
- `test/utils/`: Tests for various utility functions used throughout the application.

_(Note: The test structure aims to mirror the `src/` directory organization. End-to-end (E2E) tests are not yet implemented.)_

#### Running Tests

- **Run all tests (as defined in `package.json`):**

  ```bash
  npm test
  ```

- **Run specific tests (as defined in `package.json`):**
  ```bash
  npm test test_filename
  ```
- **Run tests in watch mode (re-runs on file changes):**
  ```bash
  npm run test:watch
  ```
- **Run specific integration tests (example):**

  ```bash
  npm run test:integration
  ```

  _(Currently, `test:integration` points to a specific file; this can be expanded.)_

- **Debugging Tests:**
  To debug a specific test file, you can use the `test:debug` script from `package.json` as a template or run Mocha directly:

  ```bash
  # Example: Run all tests in a specific directory with debugger
  node --inspect node_modules/mocha/bin/mocha test/phases/**/*.test.js --recursive --timeout 10000
  # Example: Run a single test file with debugger
  node --inspect node_modules/mocha/bin/mocha test/phases/biddingPhase.unit.test.js --recursive --timeout 10000
  ```

  You can also append a file path to the `npm run test:debug --` command if the script is set up to pass additional arguments to Mocha.
  Since the project uses `"type": "module"` in `package.json`, the `--require esm` flag is generally not needed. For complex scenarios, using `--loader=esm` (as seen in the `test:integration` script in `package.json`) might be necessary.

  Many IDEs also offer built-in JavaScript debugging tools that can attach to Node.js processes.

## 🚀 CI/CD Pipeline

We use GitHub Actions for continuous integration to ensure code quality and stability. The workflow is defined in `.github/workflows/test.yml`.

**Triggers:**

The CI pipeline is triggered on:

- Every `push` to the `resolve_unit_tests` branch.
- Every `pull_request` targeting the `resolve_unit_tests` branch.
- Changes to markdown files (`.md`), text files (`.txt`), `.gitignore`, and `.editorconfig` are ignored by these triggers.

**Key Actions Performed:**

1.  **Linting:**
    - **ESLint:** Checks the JavaScript code for style and potential errors (`npx eslint .`).
    - **Prettier:** Verifies code formatting consistency (`npx prettier --check .`).
      _(This job runs on Node.js 20.x)_

2.  **Testing:**
    - Tests are executed across multiple Node.js versions: `18.x` and `20.x`.
    - Dependencies are installed using `npm ci`.
    - The command `npm run test:coverage` is used, which implies test execution and coverage generation via `c8`.

3.  **Test Coverage:**
    - Coverage reports are generated during the test runs.
    - For pushes to the `resolve_unit_tests` branch on the `SevWren/MuellerEuchre` repository, and specifically for the Node.js `18.x` test run, the lcov coverage report (`./coverage/lcov.info`) is uploaded to [Codecov](https://about.codecov.io/) if a `CODECOV_TOKEN` is available.

4.  **Build:**
    - The application is built using `npm run build --if-present`. This command will execute the build script defined in `package.json` if it exists.
      _(This job runs on Node.js 20.x)_

_(Release-specific actions like publishing to npm or deploying to production are not currently part of this CI workflow.)_

### WebSocket Events

This section outlines the key WebSocket events used for communication between the client and server. Event names are defined in `src/config/constants.js` as properties of the `GAME_EVENTS` object.

_(This section provides a technical overview. For detailed API specifications, refer to the source code and inline JSDoc comments, especially in `src/socket/handlers/` and `src/config/constants.js`.)_

#### Client → Server (Actions & Requests)

Client-initiated events typically involve a player taking an action or making a request.

- **`GAME_EVENTS.JOIN_GAME` (`join_game`)**: Player requests to join a new or existing game.
  - Payload: `{ playerName: string, gameIdToJoin?: string }`
- **`request_start_game`**: Player (typically the host or any player if conditions are met) requests to start the game from the lobby.
  - Payload: `{ gameId: string }`
- **`GAME_EVENTS.ACTION_ORDER_UP_DECISION` (`action_order_up_decision`)**: Player makes a decision during the first bidding round (order up or pass).
  - Payload: `{ gameId: string, decision: 'orderUp' | 'pass' }`
- **`GAME_EVENTS.ACTION_DEALER_DISCARD` (`action_dealer_discard`)**: Dealer discards a card after being ordered up.
  - Payload: `{ gameId: string, cardId: string }`
- **`GAME_EVENTS.ACTION_CALL_TRUMP_DECISION` (`action_call_trump_decision`)**: Player makes a decision during the second bidding round (call trump or pass).
  - Payload: `{ gameId: string, decision: 'callTrump' | 'pass', suit?: string }`
- **`GAME_EVENTS.ACTION_GO_ALONE_DECISION` (`action_go_alone_decision`)**: The player who made trump (or their team) decides whether to "go alone".
  - Payload: `{ gameId: string, decision: boolean }`
- **`GAME_EVENTS.ACTION_PLAY_CARD` (`action_play_card`)**: Player plays a card during the active playing phase.
  - Payload: `{ gameId: string, playerRole: string, card: { id: string, suit: string, rank: string } }`
- **`GAME_EVENTS.ACTION_REQUEST_NEW_GAME` (`action_request_new_game`)**: Player requests to start a new game session after a game has concluded.
  - Payload: `{ gameId: string, playerRole: string }`
- **`GAME_EVENTS.ACTION_REJOIN_GAME` (`action_rejoin_game`)**: Player attempts to rejoin a game they were previously part of (e.g., after a disconnection).
  - Payload: `{ gameId: string, playerId: string }` (where `playerId` can be their role or unique ID)

#### Server → Client (Updates & Notifications)

Server-initiated events inform clients about changes in game state, errors, or other relevant occurrences.

- **`GAME_EVENTS.STATE_UPDATE` (`game_state_update`)**: This is the primary event for sending the complete, updated game state to all clients in a specific game room. It is emitted after most actions that alter the game's status, including phase changes (e.g., game started, trick completed, game over).
  - Payload: The full `gameState` object.
- **`GAME_EVENTS.ASSIGN_ROLE` (`assign_role`)**: Server assigns a role (e.g., 'south', 'north') and other initial information to a newly connected or joined player.
  - Payload: `{ gameId: string, role: string, players: object, isHost?: boolean, playerId?: string }`
- **`GAME_EVENTS.PLAYER_DISCONNECTED` (`player_disconnected`)**: Notifies clients that a player has disconnected. The overall game state (reflecting the player's disconnected status) is also typically sent via `GAME_EVENTS.STATE_UPDATE`.
  - Payload: `{ gameId: string, role: string, message: string }`
- **Player Reconnection Notification**: When a player successfully rejoins (client sends `GAME_EVENTS.ACTION_REJOIN_GAME`), other clients are notified of the updated player status primarily through a `GAME_EVENTS.STATE_UPDATE`. The rejoining player also receives the full `GAME_EVENTS.STATE_UPDATE` to synchronize their game.
- **`GAME_EVENTS.GAME_FULL` (`game_full`)**: Sent to a client attempting to join if the game is already at maximum capacity.
  - Payload: `{ message: string }`
- **`GAME_EVENTS.ERROR` (`generic_error`)**: A generic error message sent to a client when something goes wrong on the server that isn't tied to a specific player action (e.g., server-side issue during connection).
  - Payload: `{ message: string }`
- **`GAME_EVENTS.ACTION_ERROR` (`action_error`)**: Sent to a client when a specific action they attempted results in an error (e.g., invalid bid, not their turn, card play out of sequence).
  - Payload: `{ message: string, event?: string (name of the client action that failed) }`

## 📊 Current State of the Project

### Implemented Features

- **Real-time Multiplayer**: Fully functional WebSocket-based communication for up to 4 players using Socket.IO.
- **Game Logic**: Core Euchre rules are implemented through a distributed system:
  - Fundamental action validation is centralized in `src/game/logic/validation.js`.
  - Each game phase (bidding, playing, scoring, etc.) has its logic managed in dedicated modules within `src/game/phases/`.
  - Socket handlers in `src/socket/handlers/` coordinate these pieces and manage communication.
  - This represents a refactoring from a previous monolithic `gameLogic.js` (now archived) to a more modular and maintainable structure.
  - Includes trump selection (both rounds), trick-taking with correct card rankings, and scoring (including "Go Alone" scenarios).
- **Server-Side Validation**: All player actions are validated on the server (as seen in `src/game/logic/validation.js` and within phase-specific logic) to ensure they adhere to game rules.
- **Persistent Game State**: Game progress is saved to MongoDB via `src/db/gameRepository.js`, allowing games to be resumed.
- **Automatic Reconnection**: Players can disconnect and then rejoin active games with their state (hand, score, etc.) preserved. This is handled by logic in `src/socket/handlers/playerConnectionHandlers.js`.
- **Comprehensive Testing**: A suite of tests (unit, integration) covers core game logic, server operations, and component interactions, as detailed in the "Testing" section.

### Incomplete or Missing Features

- **User Interface (UI) Implementation**: The most significant missing piece is a dynamic, browser-based UI for players to interact with the game.
- **Player Disconnection/Reconnection Handling**: While basic reconnection functionality exists (players can rejoin and their state is preserved), further enhancements are planned:
  - More sophisticated UI feedback and options for players experiencing intermittent connection issues.
  - Graceful game pausing/unpausing if multiple players disconnect or if a host disconnects.
  - Potential for temporary AI takeover for a disconnected player (as an optional feature to keep games flowing).
- **Comprehensive End-to-End (E2E) Testing**: While unit and integration tests are in place, a full E2E testing suite (e.g., using tools like Cypress or Playwright) is yet to be developed.
- **User Interface (UI)**: Currently, the project focus is primarily on the backend game logic and server operations. A fully-featured, responsive HTML frontend is a **future development task**.

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Bugs**: File an issue if you find a bug
2. **Suggest Features**: Suggest new features or improvements
3. **Submit Pull Requests**: Submit PRs for bug fixes or new features

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a pull request, be extremely thorough. Ensure enough details that would provide a LLM with enough contextual awareness.
   docs\workflows

### Code Style

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Keep commits small and focused, avoiding file rewrites if possible.

**Key Features (Implemented/In Progress):**

- **Real-time Multiplayer Core**: Connections for up to 4 players via Socket.IO. (Core logic in place)
- **Role Assignment**: Automatic assignment to 'South', 'West', 'North', 'East' on joining. (Core logic in place)
- **Lobby System**: Basic system for players to gather before game start. (Core logic in place, UI/UX is future work)
- **Game Start Logic**: Game can be requested to start by a player or auto-starts when lobby is full. (Core logic in place, current implementation subject to refinement)
- **Card Dealing & Up-Card**: Server-authoritative card dealing and presentation of the turn-up card. (Core logic in place, managed by `src/game/phases/startNewHandPhase.js`)
- **Trump Selection**: Full two-round bidding process, including "stick the dealer". (Core logic in place, see `src/game/phases/biddingPhase.js` and `src/game/logic/validation.js`)
- **Dealer Discard**: Mechanism for the dealer to discard after trump is chosen. (Core logic in place, part of `src/game/phases/biddingPhase.js`)
- **"Going Alone"**: Process for the trump-making team to decide if a player "goes alone," including partner sit-out. (Core logic in place, see `src/game/phases/goAlonePhase.js`)
- **Trick Play**: Logic for playing tricks, enforcing rules like following suit and trump rules. (Core logic in place, see `src/game/phases/playingPhase.js` and `src/game/logic/validation.js`)
- **Server-Side Validation**: Comprehensive validation of all player actions against game rules. (Core logic in place, primarily in `src/game/logic/validation.js`)
- **Trick Winner Determination**: Correct determination of trick winners, including Bower rankings. (Core logic in place, part of `src/game/phases/playingPhase.js`)
- **Scoring**: Hand and game score accumulation up to the winning score (default 10 points). (Core logic in place, see `src/game/phases/scoringPhase.js`, subject to refinement)
- **Game Over & Restart**: Detection of game end and ability to request a new game. (Core logic in place, see `src/game/phases/scoringPhase.js` and `src/socket/handlers/gameOverHandlers.js`)
- **Player Disconnection/Reconnection**: Players can disconnect and rejoin active games with their state preserved. (Core logic in place via `src/socket/handlers/playerConnectionHandlers.js`,
  further UI enhancements planned)
- **Client-Side UI (Conceptual)**: Designs for displaying game state, hands, scores, etc., are for future HTML frontend. (Design phase / future implementation)
- **Modal Dialogs (Conceptual)**: UI for player decisions (bidding, playing) is part of future UI design. (Design phase / future implementation)

## Architectural Overview

### Guiding Methodology: Layered Development

**Core Principle:** The application is built in distinct, manageable layers. This separation of concerns ensures the codebase is stable, maintainable, and testable. Each layer has a specific, well-defined responsibility.

**Benefits of this Architecture:**

- **Reduces Complexity:** Isolates different parts of the system (e.g., game rules, state persistence, network communication).
- **Improves Maintainability:** Changes to one layer (e.g., swapping the database) have minimal impact on others (e.g., the core game rules).
- **Enhances Testability:** Each layer can be unit-tested in isolation.

---

### Layer 1: Core Game Logic & Utilities (Pure Functions)

**Focus:** This layer contains the pure, stateless rules and essential utilities of Euchre. All functions in this layer are deterministic: their output depends only on their input, and they have no side effects (like database calls or network I/O).

**Key Modules & Responsibilities:**

- **`src/utils/`:** Foundational utilities.
  - **`deck.js`**: Manages card creation, shuffling, and ranking (including Bower logic).
  - **`players.js`**: Handles turn progression (e.g., `getNextPlayer`), team association, and partner lookups.
  - **`logger.js`**: Provides robust, asynchronous logging for the application.
  - Other Utilities: `errorUtils.js`, `historyUtils.js`, `idGenerator.js`, `lobbyUtils.js`, etc., provide other stateless helper functions.
- **`src/game/logic/`**: Core game rule enforcement.
  - **`validation.js`**: Contains pure functions (`validatePlay`, `validateBid`, `validateDealerDiscard`) that check if a proposed action is legal according to the rules of Euchre.
  - **`errors.js`**: Defines custom error classes (e.g., `NotPlayersTurnError`, `MustFollowSuitError`) for clear and specific error handling.
  - **`aiLogic.js`**: Houses the stateless logic for an AI player to make decisions.
- **`src/game/phases/`**: Pure state-transition functions.
  - Each file (e.g., `biddingPhase.js`, `playingPhase.js`, `scoringPhase.js`) contains pure functions that take the current game state and an action, then return a **new, updated game state object**.
  - These functions encapsulate the step-by-step logic of the game (e.g., `handlePlayCard` determines the outcome of a card being played and returns the resulting state). They do not directly mutate state or call persistence.

---

### Layer 2 & 5: State Management & Persistence (The Game Instance & Repository Model)

**Focus:** The application's architecture does not use a single, global state manager. Instead, it employs a **persistence-backed, per-game instance model**. The `gameRepository` acts as the single source of truth for game state persistence, while the socket handlers orchestrate state changes for each active game.

**Key Modules & Responsibilities:**

- **`src/db/gameRepository.js` (Layer 5 - Persistence):**
  - This is the data access layer (DAL), responsible for all direct communication with the MongoDB database.
  - It provides asynchronous methods like `getGame(gameId)`, `updateGame(gameId, gameState)`, and `createGame(gameId, gameState)`.
  - All other parts of the application interact with the database _only_ through this module, ensuring a clean separation of concerns.

- **State Orchestration (Layer 2 - State Management):**
  - There is no central state management file.
  - State is managed on a per-request basis within the socket handlers (Layer 3). A typical flow is:
    1.  A socket handler receives a client action (e.g., `play_card`).
    2.  It retrieves the current state for that `gameId` from `gameRepository.getGame()`.
    3.  It passes this state to a pure function in Layer 1 (e.g., `handlePlayCard()`).
    4.  The Layer 1 function returns a new, updated state object.
    5.  The handler persists this new state using `gameRepository.updateGame()`.
    6.  The handler broadcasts the new state to clients.

---

### Layer 3: The Network API (Socket Handlers)

**Focus:** This layer acts as the "controller" of the application. It listens for client events, orchestrates the game logic flow using the layers below it, and communicates results back to clients.

**Key Modules & Responsibilities:**

- **`src/socket/index.js`**: Initializes the Socket.IO server and registers the primary connection and disconnection event handlers. It delegates action-specific events to the appropriate handler modules.
- **`src/socket/handlers/*.js`**: Each file manages the events for a specific part of the game flow (e.g., `lobbyHandlers.js`, `biddingHandlers.js`, `playingHandlers.js`).
  - Handlers are responsible for validating incoming data from the client socket.
  - They contain the core orchestration logic described in the "State Orchestration" section above (get state, call pure logic, save state, broadcast).
  - They are the only modules that directly use both the `gameRepository` (Layer 5) and the phase logic functions (Layer 1).

---

### Layer 4: The User Interface

**Focus:** The client-side application, responsible for rendering the game state and emitting user actions to the server.

**Current Status:** A foundational client-side structure exists but is considered conceptual and lower priority than the server-side logic. The `public/index.html` file is a basic placeholder for testing and is not a representation of the final UI.

**Key Modules & Responsibilities:**

- **`src/client/components/`**: A conceptual structure for Preact/React components (e.g., `Card`, `GameBoard`). These are not fully implemented.
- **`src/client/services/`**: Conceptual client-side services to manage WebSocket communication (`socketService.js`), local state (`stateService.js`), and UI logic (`uiService.js`). These files outline the intended logic but are not connected to a fully interactive UI.
- **`src/client/hooks/` and `src/client/utils/`**: Placeholder directories for future client-side development.

---

### Integration and End-to-End Testing

**Focus:** Verifying that all layers work together correctly.

**Methodology:**

1.  **Unit Tests:** Each module, especially in Layer 1, must have comprehensive unit tests.
2.  **Integration Tests:** These tests verify the "seams" between layers, such as ensuring a socket handler correctly calls a phase logic function and persists the result.
3.  **Manual E2E Testing:** Playing through a full game with multiple clients remains a critical step to identify bugs in the overall flow, user experience, and state synchronization.
