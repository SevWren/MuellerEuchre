# 🃏 Euchre Multiplayer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://github.com/SevWren/MuellerEuchre/actions/workflows/test.yml/badge.svg)](https://github.com/SevWren/MuellerEuchre/actions)
[![Coverage Status](https://coveralls.io/repos/github/SevWren/MuellerEuchre/badge.svg?branch=main)](https://coveralls.io/github/SevWren/MuellerEuchre?branch=main)

🚀 **Project Status:** Active Development | 🎮 WIP | 🔄 Real-time Multiplayer

A full-featured, real-time online Euchre card game with WebSocket support, automatic reconnection, and persistent game state. Built with Node.js, Express, and Socket.IO for seamless multiplayer gameplay.

## ✨ Features

- **Real-time Multiplayer**: Play with friends or join random opponents (join a game and autofill with connected players)
- **Automatic Reconnection**: Never lose your game to connection drops (reconnection logic)
- **Persistent Game State**: Your progress is saved automatically ()
- **Complete Euchre Rules**: All standard Euchre rules implemented
- **Responsive Design**: Play on desktop or mobile devices (access via html frontend) **future development*
- **Fast & Reliable**: Built with modern web technologies
- **Secure**: Authentication and data validation (game logic is handled server side)
- **Tested**: Comprehensive test coverage

## 🚀 Quick Start


## 🧪 Testing

We use a comprehensive testing strategy to ensure code quality and reliability:

#### Test Types

1. **Unit Tests**
   - Test individual functions and components in isolation
   - Located in `test/unit/` (if this is still applicable)

2. **Integration Tests**
   - Test interactions between components
   - Located in `test/integration/` (if this is still applicable)

3. **End-to-End Tests**
   - Test complete game flows
   - Located in `test/e2e/` (if this is still applicable)

## 🚀 CI/CD Pipeline

We use GitHub Actions for continuous integration: (if this is still applicable)

- **On every push/pull request to `main`:**  (if this is still applicable)
  - Lint TypeScript and JavaScript code  (if this is still applicable)
  - Run all tests  (if this is still applicable)
  - Check code coverage  (if this is still applicable)
  - Build the application  (if this is still applicable)

- **On release:** (if this is still applicable)
  - Publish to npm (if this is still applicable)
  - Deploy to production (if configured) (if this is still applicable)

```bash
node --inspect-brk node_modules/mocha/bin/mocha --require esm path/to/test/file.test.js (if this is still applicable)
```

### WebSocket Events  
(if this is still applicable)
#### Client → Server
- `joinGame`: Join a game with player details  (if this is still applicable)
- `startGame`: Start the game (host only)  (if this is still applicable)
- `playCard`: Play a card  (if this is still applicable)
- `makeBid`: Place a bid  (if this is still applicable)
- `goAlone`: Declare going alone  (if this is still applicable)

#### Server → Client
- `gameState`: Full game state update   (if this is still applicable)
- `playerJoined`: New player notification   (if this is still applicable)
- `gameStarted`: Game start notification   (if this is still applicable)
- `trickCompleted`: Trick resolution   (if this is still applicable)
- `gameOver`: Game end notification   (if this is still applicable)

## 📊 Current State of the Project

### Implemented Features
- **Real-time Multiplayer**: Fully functional WebSocket-based communication for up to 4 players.
- **Game Logic**: Complete implementation of Euchre rules, including:
  - Trump selection (both rounds).
  - Trick-taking logic with proper card rankings.
  - Scoring system, including "Go Alone" scenarios.
- **Server-Side Validation**: Ensures all player actions adhere to game rules.
- **Persistent Game State**:
- **Responsive UI**: Optimized for both desktop and mobile devices.  (FUTURE TASK)
- **Automatic Reconnection**: Handles player disconnections and reconnections gracefully.
- **Comprehensive Testing**: Unit, integration, and end-to-end tests covering core game logic and interactions.

### Incomplete or Missing Features
- **Enhanced Player Disconnection Handling**: Currently resets the game to the lobby; needs improvement to allow reconnection without disrupting the game.

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
5. Open a pull request, be extremely thorough.  Ensure enough details that would provide a LLM with enough contextual awareness.

### Code Style
- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Keep commits small and focused, avoiding file rewrites if possible.

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

## Modular Architecture

### Core Modules

### Configuration
- **package.json**: Project manifest and scripts
  - Main entry: `src/index.js`
  - Scripts for development, testing, and production
  - Dependencies management
  - Test configuration

### Client-Side Architecture

#### `public/index.html` // Future projected file
- **Purpose:** Main entry point for the client-side application // Being designed/coded later in the Developmental Process
- **Key Features:**
  - //(Conceptual) Loads Tailwind CSS and Socket.IO client
  - //(Conceptual) Initializes the React application
  - //(Conceptual) Contains the root DOM element

#### `src/client/`
- **components/**: Reusable UI components
  - //list current components here ie `playerhand/` `trickarea/` `scoreboard` `connection status`
- **hooks/**: Custom React hooks   (if this is still applicable)
  - `useSocket.js`: WebSocket connection management  (if this is still applicable)
  - `useGameState.js`: Game state management  (if this is still applicable)
- **services/**: Client-side services (if this is still applicable)
  - `socketService.js`: WebSocket communication (if this is still applicable)
  - `gameService.js`: Game logic utilities (if this is still applicable)
  - `storageService.js`: Local storage management (if this is still applicable)