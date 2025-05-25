# 🃏 Euchre Multiplayer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/SevWren/MuellerEuchre/actions/workflows/test.yml/badge.svg)](https://github.com/SevWren/MuellerEuchre/actions)
[![Coverage Status](https://coveralls.io/repos/github/SevWren/MuellerEuchre/badge.svg?branch=main)](https://coveralls.io/github/SevWren/MuellerEuchre?branch=main)

🚀 **Project Status:** Active Development | 🎮 Playable | 🔄 Real-time Multiplayer

A full-featured, real-time online Euchre card game with WebSocket support, automatic reconnection, and persistent game state. Built with Node.js, Express, and Socket.IO for seamless multiplayer gameplay.

## ✨ Features

- 🎮 **Real-time Multiplayer**: Play with friends or join random opponents
- 🔄 **Automatic Reconnection**: Never lose your game to connection drops
- 💾 **Persistent Game State**: Your progress is saved automatically
- 🃏 **Complete Euchre Rules**: All standard Euchre rules implemented
- 📱 **Responsive Design**: Play on desktop or mobile devices
- 🚀 **Fast & Reliable**: Built with modern web technologies
- 🔒 **Secure**: Authentication and data validation
- 🧪 **Tested**: Comprehensive test coverage

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- MongoDB instance (local or cloud)
- Modern web browser

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/SevWren/MuellerEuchre.git
   cd MuellerEuchre/euchre-multiplayer
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables** (create `.env` file):
   ```env
   MONGODB_URI=mongodb://localhost:27017/euchre
   PORT=3000
   NODE_ENV=development
   JWT_SECRET=your_jwt_secret_here
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open in your browser**:
   ```
   http://localhost:3000
   ```

## 🧪 Testing

We use a comprehensive testing strategy to ensure code quality and reliability:

### Test Coverage

- **Core Game Logic**: 85%
- **Validation**: 92%
- **Scoring**: 88%
- **UI Components**: 65%
- **Integration**: 70%

### Running Tests

#### Prerequisites
- Node.js 16+ and npm
- MongoDB instance (in-memory server is used for testing)

#### Available Scripts

```bash
# Run all tests
npm test

# Run tests with coverage reporting
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- path/to/test/file.test.js

# Run tests with debug output
DEBUG=euchre:* npm test
```

#### Test Types

1. **Unit Tests**
   - Test individual functions and components in isolation
   - Located in `test/unit/`

2. **Integration Tests**
   - Test interactions between components
   - Located in `test/integration/`

3. **End-to-End Tests**
   - Test complete game flows
   - Located in `test/e2e/`

#### Debugging Tests

To debug tests, you can use:

1. **Chrome DevTools**:
   ```bash
   npx node --inspect-brk node_modules/.bin/mocha --require esm test/path/to/test.js
   ```
   Then open `chrome://inspect` in Chrome

2. **VS Code**:
   Add this to your `.vscode/launch.json`:
   ```json
   {
     "type": "node",
     "request": "launch",
     "name": "Mocha Tests",
     "program": "${workspaceFolder}/node_modules/mocha/bin/_mocha",
     "args": [
       "--require", "esm",
       "--timeout", "999999",
       "--colors",
       "${workspaceFolder}/test/path/to/test.js"
     ],
     "console": "integratedTerminal",
     "internalConsoleOptions": "neverOpen"
   }
   ```

## 🚀 CI/CD Pipeline

We use GitHub Actions for continuous integration:

- **On every push/pull request to `main`:**
  - Lint TypeScript and JavaScript code
  - Run all tests
  - Check code coverage
  - Build the application

- **On release:**
  - Publish to npm
  - Deploy to production (if configured)

```bash
node --inspect-brk node_modules/mocha/bin/mocha --require esm path/to/test/file.test.js
```

Then open Chrome DevTools and click on the Node.js icon to start debugging.

## 📚 API Reference

### WebSocket Events

#### Client → Server
- `joinGame`: Join a game with player details
- `startGame`: Start the game (host only)
- `playCard`: Play a card
- `makeBid`: Place a bid
- `goAlone`: Declare going alone

#### Server → Client
- `gameState`: Full game state update
- `playerJoined`: New player notification
- `gameStarted`: Game start notification
- `trickCompleted`: Trick resolution
- `gameOver`: Game end notification

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `MONGODB_URI` | - | MongoDB connection string |
| `NODE_ENV` | development | Runtime environment |
| `LOG_LEVEL` | info | Logging level |
| `SOCKET_PATH` | /socket.io | Socket.IO path |

## 🧪 Testing

### Run all tests
```bash
npm test
```

### Test specific suite
```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e
```

### Test coverage
```bash
npm run test:coverage
```

## 🚀 Features

- **Real-time 4-player Euchre** with WebSocket communication
- **Automatic reconnection** with exponential backoff and connection quality monitoring
- **Connection status indicator** showing real-time network quality and latency
- **Persistent game state** with MongoDB storage
- **Responsive UI** that works on desktop and mobile
- **Complete Euchre rules** including:
  - Standard and "Go Alone" gameplay
  - Full trump selection process
  - Trick-taking with proper card rankings
  - Score tracking and game history
- **Modern Architecture**:
  - Modular, maintainable codebase
  - Client-side state management
  - Comprehensive test coverage

⚠️ **Note:** This project is actively being developed. See [Current Status](#current-status) for details.

## 1. Project Overview

This project aims to create a web-based, real-time, 4-player Euchre card game. Players connect via their web browsers to a central server that manages the game logic and state. The goal is to provide a functional and interactive Euchre experience adhering to common game rules.

**Core Technologies:**
*   **Backend:** Node.js with Express.js for the web server and Socket.IO for real-time, bidirectional WebSocket communication.
*   **Frontend:** HTML for structure, CSS (with some Tailwind CSS via CDN) for styling, and client-side JavaScript for UI interactions and communication with the server.

## 🏗️ Project Structure

```
euchre-multiplayer/
├── src/                    # Source code
│   ├── client/             # Client-side code
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   └── services/       # Client services
│   ├── config/             # Configuration files
│   ├── db/                 # Database models and utilities
│   ├── game/               # Game logic
│   │   ├── logic/          # Core game logic
│   │   └── phases/         # Game phase handlers
│   ├── socket/             # WebSocket handlers
│   └── utils/              # Utility functions
├── test/                   # Test files
│   ├── integration/        # Integration tests
│   ├── unit/               # Unit tests
│   └── e2e/                # End-to-end tests
├── public/                 # Static files
└── docs/                   # Documentation
```

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
5. Open a pull request

### Code Style
- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Keep commits small and focused


    *   **Round 1:** Players, starting left of the dealer, can "order up" the dealer (making the up-card's suit trump and forcing the dealer to take it) or "pass."
    *   **Dealer's Discard:** If trump is made by ordering up the dealer, the dealer picks up the up-card and discards one card from their hand.
    *   **Round 2:** If all players pass in Round 1, the up-card is turned down. Players, starting left of the dealer, can name any *other* suit as trump or pass. If all players pass again, the hand is typically re-dealt (current implementation).
*   **Going Alone:** The player (or their partner) whose team made trump can choose to "go alone," meaning their partner sits out for that hand, and the "loner" plays against both opponents.
*   **Card Ranking (with Trump):**
    1.  Jack of the trump suit (Right Bower).
    2.  Jack of the suit of the *same color* as trump (Left Bower - acts as a trump card).
    3.  Ace, King, Queen, 10, 9 of the trump suit.
    4.  Non-trump suits: Ace, King, Queen, (Jack, if not a Bower), 10, 9.
*   **Gameplay:**
    *   The player to the dealer's left leads the first trick (unless someone is going alone, adjusting the lead).
    *   Players must follow suit if possible. If void in the suit led, they can play any card (including trump).
    *   The highest card of the suit led wins the trick, unless a trump card is played, in which case the highest trump card wins.
    *   The winner of a trick leads the next trick.
*   **Scoring:**
    *   Makers (team that chose trump) take 3 or 4 tricks: 1 point.
    *   Makers take all 5 tricks (march): 2 points.
    *   Makers go alone and take 3 or 4 tricks: 1 point (classic scoring, some variations give 4). Current implementation uses 1 point.
    *   Makers go alone and take all 5 tricks: 4 points.
    *   Makers fail to take 3 tricks (Euchred): Opponents score 2 points.
*   **Winning the Game:** First team to reach 10 points wins.

**Key Features (Implemented/In Progress):**
*   Real-time connection for up to 4 players.
*   Automatic role assignment (South, West, North, East).
*   Lobby system for players to gather before starting a game.
*   Game start initiated by any player once 4 players are connected.
*   Server-authoritative card dealing and up-card presentation.
*   Full trump selection process (both rounds).
*   Dealer discard mechanism.
*   "Going Alone" decision and partner sit-out logic.
*   Trick playing logic, including following suit and trump rules.
*   Server-side validation of plays.
*   Trick winner determination based on Euchre rules (including Bowers).
*   Hand scoring and game score accumulation.
*   Game over detection and winner announcement.
*   Client-side UI for displaying game state, player hands (with relative positioning), scores, game messages, and current player/dealer indicators.
*   Modal dialogs for player decisions.
*   Handling of player disconnections (currently resets the game to the lobby).
*   Ability for players to request a new game session after a game concludes or from the lobby.

## 2. File Descriptions

### `src/client/components/ConnectionStatus/`

A reusable React component that provides real-time feedback about the WebSocket connection status:

- Displays current connection state (connected/disconnected/reconnecting)
- Shows connection quality metrics (latency, jitter)
- Visual indicators for connection quality
- Smooth animations for state transitions
- Responsive design that works on all screen sizes

### `src/client/hooks/useSocket.js`

A custom React hook that provides a clean interface for components to interact with the WebSocket connection:

- Manages connection state
- Tracks connection quality metrics
- Provides methods for sending and receiving messages
- Handles reconnection logic

### `src/client/services/socketService.js`

Enhanced WebSocket service with connection quality monitoring:

- Tracks latency and jitter
- Implements ping-pong mechanism for connection health
- Provides detailed connection quality metrics
- Handles automatic reconnection with exponential backoff

### `server.js`
This is the main backend file, running on Node.js. It manages the entire game logic, state, and communication between players.

*   **Server Setup:**
    *   Uses `express` to create a web server and `http` module as its base.
    *   Initializes `socket.io` and attaches it to the HTTP server for WebSocket communication.
    *   Serves static files (like `index.html` and any associated CSS/JS) from the `public` directory. **Note:** Currently, `index.html` is at the root; for `app.use(express.static(path.join(__dirname, 'public')));` to work as intended, `index.html` should be moved into a `public` subdirectory.
*   **Game State (`gameState` object):**
    *   A comprehensive JavaScript object that acts as the single source of truth for all game-related information. This includes:
        *   `gameId`: Unique identifier for the current game session.
        *   `playerSlots`: Array defining the roles ('south', 'west', 'north', 'east').
        *   `players`: An object mapping roles to player-specific data (socket ID, name, hand, team, tricks taken).
        *   `connectedPlayerCount`: Tracks active connections.
        *   `gamePhase`: Critical string indicating the current stage of the game (e.g., 'LOBBY', 'DEALING', 'ORDER_UP_ROUND1', 'PLAYING_TRICKS', 'GAME_OVER').
        *   `deck`, `kitty`, `upCard`: Card management.
        *   `trump`, `dealer`, `currentPlayer`: Game flow and rule variables.
        *   `orderUpRound`, `maker`, `playerWhoCalledTrump`: Bidding process state.
        *   `goingAlone`, `playerGoingAlone`, `partnerSittingOut`: State for "lone hands."
        *   `tricks`, `currentTrickPlays`, `trickLeader`: Trick management.
        *   `team1Score`, `team2Score`, `winningTeam`: Scoring.
        *   `gameMessages`: A log of important game events.
    *   `resetFullGame()`: Function to initialize or reset `gameState` to a default, clean state for a new game or upon server start.
*   **Game Logic Functions:**
    *   A suite of functions implementing Euchre rules:
        *   Card Management: `createDeck()`, `shuffleDeck()`.
        *   Dealing: Handled within `startNewHand()`.
        *   Hand Lifecycle: `startNewHand()` (sets up for a new round of play).
        *   Player/Team Utilities: `getNextPlayer()`, `getPartner()`.
        *   Card Representation: `cardToString()`, `sortHand()`.
        *   Trump/Bower Logic: `isRightBower()`, `isLeftBower()`, `getSuitColor()`, `getCardRank()` (determines card power).
        *   Player Action Handlers: `handleOrderUpDecision()`, `handleDealerDiscard()`, `handleCallTrumpDecision()`, `handleGoAloneDecision()`, `handlePlayCard()`.
        *   Validation: `serverIsValidPlay()` ensures plays adhere to rules.
        *   Scoring: `scoreCurrentHand()` calculates points after each hand.
*   **Socket.IO Event Handling (`io.on('connection', ...)`):**
    *   **`connection`:** When a new client connects:
        *   Assigns an available role if in 'LOBBY' phase.
        *   Notifies client of 'game_full' or 'game_in_progress' if applicable.
        *   Calls `broadcastGameState()` to send current state.
    *   **Client-Sent Events:** Listens for actions emitted by clients:
        *   `request_start_game`: Initiates a new game if conditions met.
        *   `action_order_up`, `action_dealer_discard`, `action_call_trump`, `action_go_alone`, `action_play_card`: Trigger corresponding server-side game logic handlers.
        *   `request_new_game_session`: Resets the game to lobby, re-assigning currently connected players.
    *   **`disconnect`:** When a client disconnects:
        *   Updates `connectedPlayerCount`, clears player slot.
        *   If a game is in progress and player count drops, resets the game to 'LOBBY', preserving scores and attempting to re-assign remaining players.
*   **State Broadcasting (`broadcastGameState()`):**
    *   Crucial function called after most state changes.
    *   Sends a tailored version of `gameState` to *each* connected client via `game_update`.
        *   Personalization includes revealing only that client's hand and marking their role/name. Other hands are obfuscated.
        *   The full deck is not sent.
    *   If `gameState.gamePhase === 'LOBBY'`, it also emits a `lobby_update` with summarized player connection info for simpler lobby UI rendering.
*   **Utility Functions:**
    *   `addGameMessage()`: Adds a timestamped message to the `gameMessages` log.
    *   `getPlayerBySocketId()`, `getRoleBySocketId()`: Helper functions for mapping socket IDs to player data.
*   **Server Initialization:** Starts the HTTP server and listens on the defined `PORT`.

### `index.html`
This file is the single-page application (SPA) that players interact with in their browsers. It contains the HTML structure, CSS styling, and client-side JavaScript logic.

*   **HTML Structure:**
    *   Standard HTML5 document setup.
    *   Includes Socket.IO client library and Tailwind CSS from CDNs.
    *   **Main UI Areas:**
        *   `.score-area`: Displays team scores, current trump, and player identification.
        *   `#game-status-display`: Shows the current phase of the game or whose turn it is.
        *   `#lobby-info-display`: Shows connected players during the 'LOBBY' phase.
        *   `#game-messages-display`: A log of game events.
        *   `#lobby-actions`: Contains the "Start Game" button.
        *   `.kitty-area`: Displays the up-card (or kitty placeholder).
        *   `.center-game-area`: Contains the `.trick-area` where cards played to the current trick are shown.
        *   Player Areas (`#south-area`, `#west-area`, `#north-area`, `#east-area`): Positioned around the table, each contains a player label and a `div` for rendering their hand.
    *   **Modals:** Hidden `div` elements that are shown for player interactions:
        *   `#order-up-modal`: For Round 1 bidding.
        *   `#dealer-discard-modal`: For the dealer to discard after picking up.
        *   `#call-trump-modal`: For Round 2 bidding.
        *   `#go-alone-modal`: For the trump-making team to decide on playing alone.
        *   `#game-over-modal`: Displays final results and new game option.
        *   `#rules-modal`: Initially shown, provides game rules.
*   **CSS Styling (Embedded `<style>`):**
    *   Uses CSS custom properties (e.g., `--card-width`, `--red`) for theme consistency.
    *   Detailed styling for:
        *   Cards: Dimensions, appearance (face/back), hover effects for playable cards, selection indication for discard.
        *   Player Areas: Absolute positioning and rotations to simulate a card table perspective. Labels are also styled based on dealer/current player status.
        *   Trick Area: Positioning for cards played by each player.
        *   Up-Card/Kitty Area.
        *   Modals: Centered overlay appearance.
        *   Buttons: General styling and specific styles for different actions (primary, success, danger).
        *   General page layout and typography.
*   **Client-Side JavaScript (`<script>` block):**
    *   **Socket.IO Client:** Initializes `socket = io()` to connect to the server.
    *   **Global State:**
        *   `myPlayerRole`, `myName`: Stores the client's assigned role and name.
        *   `currentServerGameState`: A local copy of the latest game state received from the server.
    *   **DOM Element Cache (`elements` object):** Stores references to frequently used HTML elements for easier access and minor performance gain.
    *   **Socket Event Listeners:**
        *   `connect`: Logs successful connection.
        *   `assign_role`: Updates `myPlayerRole` and `myName`, sets document title.
        *   `lobby_update`: Updates `currentServerGameState` (if in lobby phase) and refreshes the lobby UI.
        *   `game_update`: The core message handler. Updates `currentServerGameState`, hides all modals, calls `updateUI()` to re-render the game based on the new state, then calls `handleTurnSpecificModals()` or `showGameOverModal()` as appropriate. Also updates game messages.
        *   `game_full`, `action_error`: Displays alert messages from the server.
    *   **UI Rendering Functions:**
        *   `updateUI(state)`: Master function to refresh the entire game view. It updates scores, trump display, game status text, player labels (highlighting current player, dealer, partner), renders all player hands using `renderHand()`, and renders the up-card and current trick.
        *   `renderHand(handArray, handContainer, isMyHand, gameState)`: Clears and re-renders cards in a player's hand area. If it's the current client's hand and their turn to play, it makes valid cards clickable.
        *   `renderCardDOM(cardData, cardElement, currentTrump, isMyCard)`: Creates the visual representation of a single card (value, suit symbols, color, trump indicator text) within a given `cardElement`. Handles card backs for unknown cards.
        *   `updateGameMessages(messagesArray)`: Populates the game messages log.
        *   `handleTurnSpecificModals(state)`: Shows the correct modal dialog (e.g., "Order Up?") if it's the client's turn and the game phase requires a decision. Populates modals with relevant info (e.g., up-card details).
        *   `showGameOverModal(state)`: Displays game results.
    *   **Player Action Emitters:** Event listeners on buttons (e.g., "Order Up", "Pass", "Play Card") that, when clicked, emit corresponding messages (e.g., `action_order_up`, `action_play_card`) to the server with necessary data.
    *   **Client-Side Helpers:**
        *   `getPlayerRelativePosition(targetRole)`: Calculates how other players' areas should be displayed relative to the client's fixed 'South' perspective.
        *   `clientIsLeftBower()`, `clientIsValidPlay()`: Client-side logic to assist UI (e.g., highlighting playable cards). Authoritative validation is done on the server.
        *   `SUITS_DATA`: An object mapping suit names to symbols and CSS classes for rendering.
        *   `getPartner()`: Client-side utility to identify partner.
    *   **Initialization:** Sets initial game status text.

### `package.json`
This is the manifest file for the Node.js project.
*   **`name`**: "public" (This is unconventional for a project root; typically, it's the project's name, e.g., "euchre-multiplayer").
*   **`version`**: "1.0.0".
*   **`description`**: Empty.
*   **`main`**: "index.js" (The actual server entry point is `server.js`).
*   **`scripts`**: Contains various npm scripts for development and testing:
    - `dev`: Start development server with hot-reloading

---

## Modular Architecture

### Core Modules

#### `src/game/`
- **state.js**: Manages the core game state and state transitions
- **phases/**: Handles different game phases
  - `lobbyPhase.js`: Manages player connections and game initialization
  - `orderUpPhase.js`: Handles the first round of bidding
  - `callTrumpPhase.js`: Manages the second round of bidding
  - `playPhase.js`: Controls the trick-taking gameplay
  - `scoringPhase.js`: Handles scoring and game progression
  - `endGame.js`: Manages game conclusion and winner determination

#### `src/socket/`
- **connection.js**: Manages WebSocket connections and events
- **middleware/**: Socket middleware for authentication and validation
- **handlers/**: Event handlers for different game actions

#### `src/config/`
- **constants.js**: Game constants and configuration
- **logger.js**: Centralized logging configuration

#### `src/db/`
- **gameRepository.js**: MongoDB integration for game state persistence
- **models/**: Database models and schemas

### Testing
- **test/unit/**: Unit tests for individual modules
- **test/integration/**: Integration tests for module interactions
- **test/e2e/**: End-to-end tests for complete game flows

### Client-Side
- **public/index.html**: Main game interface
- **src/client/components/**: Reusable UI components
- **src/client/hooks/**: Custom React hooks
- **src/client/services/**: Client-side services (e.g., WebSocket service)

### Configuration
- **package.json**: Project manifest and scripts
  - Main entry: `src/index.js`
  - Scripts for development, testing, and production
  - Dependencies management
  - Test configuration

### Client-Side Architecture

#### `public/index.html`
- **Purpose:** Main entry point for the client-side application
- **Key Features:**
  - Loads Tailwind CSS and Socket.IO client
  - Initializes the React application
  - Contains the root DOM element

#### `src/client/`
- **components/**: Reusable UI components
  - `GameBoard/`: Main game interface
  - `PlayerHand/`: Player's card hand
  - `TrickArea/`: Display of current trick
  - `Scoreboard/`: Game score tracking
  - `ConnectionStatus/`: Connection status indicator
- **hooks/**: Custom React hooks
  - `useSocket.js`: WebSocket connection management
  - `useGameState.js`: Game state management
- **services/**: Client-side services
  - `socketService.js`: WebSocket communication
  - `gameService.js`: Game logic utilities
  - `storageService.js`: Local storage management

### readme.md
- **Purpose:** Project documentation and setup instructions.
- **Key Points:**
  - Explains project overview, setup, running, and known issues.
  - **Unit Test Instructions:**
    - On Windows 10, use the full file path to run tests:
      ```
      npx mocha G:\Users\mmuel\OneDrive\Documents\GitHub\MuellerEuchre\euchre-multiplayer\test\server3.unit.test.js --require proxyquire --reporter spec
      ```
    - Test files must be UTF-8 encoded and not have hidden extensions.
    - The test suite uses improved mocks for `socket.io`.

---

## Summary
- The project is structured for real-time Euchre gameplay with robust server logic and a modern web UI.
- Unit tests are isolated and require specific mocking for the environment.
- All instructions and caveats for running and testing the project are included above.

## 4. Setup & Running

1.  **Prerequisites:**
    *   Node.js and npm installed.
2.  **Installation:**
    *   Clone the repository or download the files.
    *   Navigate to the project's root directory in your terminal.
    *   Run `npm install` to install the dependencies (`express`, `socket.io`).
3.  **Running the Server:**
    *   Run `node server.js` from the project's root directory.
    *   The server will typically start on `http://localhost:3000`.
4.  **Playing the Game:**
    *   Open a web browser and navigate to `http://localhost:3000`.
    *   Open four separate browser tabs or windows (or use different browsers/incognito mode) and navigate to the same address to simulate four players.
    *   Once four players are connected (as shown in the "Players" list in the lobby), one player can click the "Start Game" button.
    *   **Important Note on Static Files:** The `server.js` is configured to serve static files from a `public` subdirectory (`app.use(express.static(path.join(__dirname, 'public')));`). Ensure that `index.html` (and any other client-side assets like CSS or image files if added later) is located inside a folder named `public` at the root of the project.