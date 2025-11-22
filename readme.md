# 🃏 Mueller Euchre - Real-Time Multiplayer

> **🚧 Hobby Project & Work in Progress 🚧**
> This is a personal hobby project and is actively under development. Features may be incomplete or subject to change.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![CI/CD](https://github.com/mmueller-euchre/MuellerEuchre-Windsurf/actions/workflows/test-and-log.yml/badge.svg)](https://github.com/mmueller-euchre/MuellerEuchre-Windsurf/actions/workflows/test-and-log.yml)
[![Coverage Status](https://coveralls.io/repos/github/mmueller-euchre/MuellerEuchre-Windsurf/badge.svg?branch=main)](https://coveralls.io/github/mmueller-euchre/MuellerEuchre-Windsurf?branch=main)

A dynamic, real-time online Euchre card game. This project leverages Node.js, Express, and Socket.IO to deliver engaging 4-player multiplayer gameplay. It features a robust, server-authoritative layered architecture and persistent game state management with MongoDB, including active game recovery on server restart.

## ✨ Core Features

-   **Real-time Multiplayer**: Employs Socket.IO for seamless, real-time gameplay for four players.
-   **Complete Euchre Game Logic**: Full implementation of Euchre rules, including the two-round bidding process, trump selection (with "stick the dealer"), the "Left Bower" rule, going alone, trick-taking, and scoring.
-   **Server-Authoritative Architecture**: All game logic is validated and executed on the server to ensure fair play and prevent client-side manipulation.
-   **Persistent Game State**: Game progress is automatically saved to a MongoDB database, allowing for game recovery.
-   **Server Restart Recovery**: Upon server restart, all active games are automatically re-hydrated from the database into memory, allowing play to resume seamlessly.

## 🏛️ Architectural Overview

The application is built on a strict 5-layer architecture to ensure separation of concerns, testability, and maintainability.

-   **Layer 1: Pure Game Logic & Utilities**
    -   **Responsibility:** Contains pure, stateless functions that define the rules of Euchre. This layer has no side effects (no I/O, no network calls).
    -   **Key Modules:** `src/utils/*.js`, `src/game/logic/*.js`, `src/game/phases/*.js`.
    -   **Example:** `validatePlayCard()` in `validation-core.js` checks if a card play is valid based on the current trick and the player's hand.

-   **Layer 2: In-Memory State Management**
    -   **Responsibility:** Acts as the single, centralized, in-memory source of truth for all active games.
    -   **Key Module:** `src/game/state.js`.
    -   **Functionality:** Holds the `activeGames` map. Provides getters (`getGameState`) and setters (`updateGameState`) for manipulating state. It is the only module that directly mutates the game state object.

-   **Layer 3: Network API (Socket Handlers)**
    -   **Responsibility:** The "controller" layer. Listens for client events, calls Layer 1 and 2 functions to process actions, and emits state updates back to clients.
    -   **Key Modules:** `src/socket/handlers/*.js`.
    -   **Flow:** Receives a socket event -> Gets state from Layer 2 -> Calls a pure function from Layer 1 -> Updates state via Layer 2 -> Broadcasts the new state.

-   **Layer 4: User Interface (Conceptual)**
    -   **Responsibility:** Renders the game state for the user and captures user input.
    -   **Key Module:** `public/index.html` and `public/js/socketHandler.js`.
    -   **Status:** Currently a minimal, functional placeholder for testing the backend. Not a full-featured UI.

-   **Layer 5: Persistence**
    -   **Responsibility:** Handles all communication with the database (MongoDB).
    -   **Key Module:** `src/db/gameRepository.js`.
    -   **Functionality:** Provides an abstraction layer for database operations (`updateGame` (with upsert), `getGame`, `findAllActiveGames`). It is the only module that directly interacts with the database.

## 🚀 Quick Start

1.  **Prerequisites:**
    -   Node.js (v20.1.0 or later)
    -   MongoDB running on the default port (`mongodb://localhost:27017`)

2.  **Clone the repository:**
    ```bash
    git clone https://github.com/mmueller-euchre/MuellerEuchre-Windsurf.git
    cd MuellerEuchre-Windsurf
    ```

3.  **Install dependencies:**
    ```bash
    npm install
    ```

4.  **Run the server:**
    -   For development with automatic restarts on file changes:
        ```bash
        npm run dev
        ```
    -   To run in production mode:
        ```bash
        npm start
        ```

5.  **Access the game:**
    Open your web browser and navigate to `http://localhost:3000`. Open multiple tabs to simulate multiple players joining.

## 🧪 Testing

The project uses the native **`node:test`** framework for unit and integration testing.

-   **Testing Philosophy:** We use **Dependency Injection** via `Function.prototype.call` to mock dependencies and isolate units for testing. This avoids complex mocking libraries and keeps tests clean and readable. See `test/helpers/test-helpers.js` for implementation details.

-   **Run all tests:**
    ```bash
    npm test
    ```

-   **Run tests and generate coverage:**
    ```bash
    npm run coverage
    ```

-   **Run a specific test file:**
    ```bash
    node --test test/utils/deck.unit.test.js
    ```

## 📜 Development Conventions

-   **Linting and Formatting:** The project uses ESLint and Prettier for code quality and consistency.
    -   `npm run lint`: Check for linting errors.
    -   `npm run lint:fix`: Automatically fix linting errors.
    -   `npm run prettier`: Format code with Prettier.

## 🤝 Contributing

We welcome contributions! Please follow this workflow:

1.  **Fork** the repository.
2.  Create a **feature branch** (`git checkout -b feature/your-feature`).
3.  Commit your changes (`git commit -m 'Add some feature'`).
4.  Push to the branch (`git push origin feature/your-feature`).
5.  Open a **Pull Request** with a detailed description of your changes.

Please adhere to the existing code style, write tests for new functionality, and keep commits small and focused.