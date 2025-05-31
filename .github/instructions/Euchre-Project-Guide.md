---
applyTo: '**'
---
# Euchre Multiplayer Project

## 1. Project Overview & Core Technologies
- This is a real-time multiplayer Euchre card game server.
- The server is written in **Node.js** using **ES Modules** (`type: "module"` in `package.json`). The primary server logic file is `server3.mjs` (or `src/server.js` as per `package.json` main entry).
- It utilizes **Express.js** for the HTTP server framework.
- **Socket.IO** is used for real-time WebSocket communication between the server and clients.
- Player data and game state might be persisted using **MongoDB** (as suggested by `readme.md` and `package.json` dependencies).

## 2. Euchre Game Rules & Logic
- **Standard Euchre rules apply.** When discussing game logic or suggesting code, adhere to these:
    - **Players & Teams:** 4 players in two partnerships (North/South vs. East/West).
    - **Deck:** 24-card deck (9, 10, J, Q, K, A of four suits).
    - **Dealing:** Each player receives 5 cards. One card is turned up (the "up-card").
    - **Trump Selection (Bidding):**
        - **Round 1:** Starting left of the dealer, players can "order up" the dealer (making the up-card's suit trump) or pass. If ordered up, the dealer picks up the up-card and discards one.
        - **Round 2:** If all pass in Round 1, the up-card is turned down. Players, starting left of the dealer, can name any *other* suit as trump or pass. If all pass again, the hand is re-dealt.
    - **Bowers:**
        - **Right Bower:** Jack of the trump suit (highest trump).
        - **Left Bower:** Jack of the suit of the *same color* as trump (second highest trump, considered part of the trump suit).
    - **Going Alone:** The player (or their partner) whose team made trump can "go alone." Their partner sits out.
    - **Gameplay:** Player left of dealer leads (or adjusted if going alone). Must follow suit if possible. Highest trump wins, or highest card of suit led if no trump is played.
    - **Scoring:**
        - Makers take 3-4 tricks: 1 point.
        - Makers take all 5 tricks (march): 2 points.
        - Makers go alone, 3-4 tricks: 1 point (or 4, current uses 1 point).
        - Makers go alone, 5 tricks: 4 points.
        - Makers Euchred (fail to take 3 tricks): Opponents get 2 points.
        - Game to 10 points.
- **Key Server File:** `server3.mjs` contains the majority of the game logic. (The `main` field in `package.json` points to `src/server.js`, which might be an alias or a refactored entry point for `server3.mjs`).
- **Card Representation:** Cards are objects, e.g., `{ suit: 'hearts', value: 'A', id: 'A-hearts' }`.
- **Suits & Values:** `SUITS = ['hearts', 'diamonds', 'clubs', 'spades']`, `VALUES = ['9', '10', 'J', 'Q', 'K', 'A']`.

## 3. Server State Management (`gameState`)
- The central game state is managed in a JavaScript object, typically named `gameState` (as seen in `server3.mjs`).
- **Key `gameState` properties include:**
    - `playerSlots`: `['south', 'west', 'north', 'east']`
    - `players`: An object mapping roles to player-specific data (socket ID, name, hand, team, tricks taken, etc.).
    - `gamePhase`: Critical string indicating the current stage (e.g., 'LOBBY', 'ORDER_UP_ROUND1', 'AWAITING_DEALER_DISCARD', 'PLAYING_TRICKS', 'GAME_OVER').
    - `deck`, `kitty`, `upCard`.
    - `trump`, `dealer`, `currentPlayer`.
    - `maker`, `playerWhoCalledTrump`.
    - `goingAlone`, `playerGoingAlone`, `partnerSittingOut`.
    - `team1Score`, `team2Score`.
    - `gameMessages`: An array for logging game events to players.
- State changes should generally trigger `broadcastGameState()`.

## 4. Core Server Functions (in `server3.mjs` or related modules)
- When discussing modifications or extensions, consider these existing functions:
    - `resetFullGame()`: Initializes/resets the entire game.
    - `startNewHand()`: Sets up for a new round of play. (Note: `startHand.unit.test.js` and files under `test/phases/startHand/` test modularized `startNewHand` logic, likely from `src/game/phases/startNewHand.js` rather than directly from a monolithic `server3.mjs`).
    - `createDeck()`, `shuffleDeck()`.
    - `handleOrderUpDecision()`, `handleDealerDiscard()`, `handleCallTrumpDecision()`, `handleGoAloneDecision()`, `handlePlayCard()`.
    - `scoreCurrentHand()`.
    - `broadcastGameState()`: Sends personalized game state to each connected client. Other players' hands are obscured. Deck is not sent.
    - `addGameMessage()`: For adding messages to the `gameMessages` log.
- **Logging:** The server uses a custom `log(level, message)` function with `DEBUG_LEVELS` (ERROR, INFO, WARNING, VERBOSE).

## 5. Socket.IO Communication
- **Server -> Client:**
    - `game_update`: Sends the personalized `gameState`.
    - `lobby_update`: Sends summarized lobby information.
    - `assign_role` (from `index.html` client logic).
    - `action_error` (for invalid client actions).
- **Client -> Server (from `index.html` client logic & `readme.md`):**
    - `request_start_game`
    - `action_order_up`
    - `action_dealer_discard`
    - `action_call_trump`
    - `action_go_alone`
    - `action_play_card`
    - `request_new_game_session`

## 6. Testing
- The project uses **Mocha** as the test runner, **Chai** for assertions (including `should` and `sinon-chai`), and **Sinon** for stubs, spies, and mocks.
- **ES Module Testing:**
    - Tests are written as ES Modules.
    - A custom loader (`test/loader.mjs`) is used to help Node.js resolve and load CommonJS testing libraries like Chai and Sinon in an ESM context.
    - Test setup is performed in `test/setup.js` (which also imports `test/test-helper.js`).
    - `.mocharc.json` configures Mocha, specifying the loader and setup files.
- **Mocking:**
    - The `setMocks({ fs: fsMock, io: ioMock })` function in `server3.mjs` is used for dependency injection of `fs` and `socket.io` (via `getIo()`) for testing purposes.
- **Coverage:** Code coverage is collected using `c8`.
- **Test File Structure (referencing `unit_test_file_trees.txt`):**
    - The main test directory is `test/` (or `G:/.` in the tree, assuming `G:/` is the test root).
    - **Configuration/Setup files** are at the root of the test directory: `loader.mjs`, `setup.js`, `test-helper.js`.
    - **Fixtures:** `test/fixtures/` (e.g., `testStates.js`).
    - **Helpers:** `test/helpers/` (e.g., `testUtils.js`). Note: `test/server/test-utils.js` and `test/server/testHelpers.js` also exist.
    - **Tests are organized by feature/module:**
        - `test/phases/`: Unit and integration tests for game phases (e.g., `orderUp.unit.test.js`, `startHand.unit.test.js`, `startHand.integration.test.js`).
            - Includes subdirectories for more granular phase tests, e.g., `test/phases/startHand/` (e.g., `dealCards.unit.test.js`).
        - `test/server/`: Unit and integration tests for general server logic and features (e.g., `dealerDiscard.unit.test.js`, `playCard.additional.unit.test.js`, `reconnection.integration.test.js`).
            - Includes subdirectories for specific server concerns like `persistence/`, `security/`, `validation/`.
        - `test/services/`: Unit tests for service-layer modules (e.g., `coreGame.unit.test.js`, `reconnection.unit.test.js`).
    - Unit tests commonly end with `.unit.test.js` and integration tests with `.integration.test.js`.

## 7. Code Style & Conventions
- Code is written in modern JavaScript (ES Modules).
- Favor clarity and maintainability.
- When generating code for `server3.mjs` or related modules, use ES Module `import`/`export` syntax.
- Pay attention to the existing structure of `gameState` and helper functions when suggesting modifications.
- Logging should use the provided `log()` function.
