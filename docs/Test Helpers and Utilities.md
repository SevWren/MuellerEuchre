# Test Helpers and Utilities

This document provides a comprehensive overview of the test helper files and utility functions used throughout the Mueller Euchre test suite. These helpers are designed to promote clean, maintainable, and deterministic tests by providing standardized ways to create mock data, manage test environments, and simulate various game scenarios.

## Guiding Principles: The 'Why' Behind the Helpers

The entire test helper suite is built upon a set of cumulatively compatible, widely accepted software design principles. Adherence to these helpers is adherence to these principles.

1.  **DRY (Don't Repeat Yourself):** The very existence of these helpers is an application of this principle. Functions like `createBaseGameState` and `setupTestState` prevent every single test file from needing to manually construct complex, multi-property `gameState` objects, reducing code duplication and the risk of error.

2.  **SSOT (Single Source of Truth):** These helpers are the **SSOT** for test data. All unit tests **MUST** use these helpers to generate game states, players, and cards. This guarantees that all test data has a consistent, valid shape, preventing entire classes of bugs that arise from malformed or inconsistent mock data.

3.  **KISS (Keep It Simple, Stupid):** The helpers achieve simplicity by abstracting away complexity. A test author should not need to know the 50+ properties of a valid `PLAYING` phase `gameState`. They only need to call `setupTestState({ phase: 'PLAYING' })`. The helper manages the complexity, keeping the test itself simple, readable, and focused on its specific goal.

4.  **YAGNI (You Ain't Gonna Need It):** The helper suite is designed to be pragmatic, providing the functionality essential for robust testing without adding speculative features. We do not build complex state generators for scenarios that are not currently under test. This keeps the helpers lean and easy to maintain.

5.  **SoC (Separation of Concerns):** The helpers enforce a strict separation between the *concern of creating test data* and the *concern of executing test logic*. This directly supports the **Arrange-Act-Assert** pattern. The helpers are responsible for the "Arrange" step, allowing the body of the test to focus exclusively on the "Act" and "Assert" steps.

6.  **SRP (Single Responsibility Principle):** Each helper function is designed with a single responsibility. `createCards` only creates cards from a string. `shuffleDeterministic` only shuffles a deck predictably. `setupCompletedHandState` only creates a state ready for scoring. This makes each helper easy to understand, test, and compose.

7.  **DIP (Dependency Inversion Principle):** The helpers are designed to facilitate this principle, especially during testing. Mock factories like `createStartNewHand` and environment setups like `setupSocketTest` are built to allow the injection of mock dependencies. This allows high-level modules to be tested in complete isolation from their low-level concrete implementations.

## Table of Contents
1.  [Core Test Helpers (`test/helpers/test-helpers.js`)](#1-core-test-helpers-testhelperstest-helpersjs)
2.  [General Test Utilities (`test/helpers/testUtils.js`)](#2-general-test-utilities-testhelperstestutilsjs)
3.  [Server Test Utilities (`test/server/test-utils.js`)](#3-server-test-utilities-testservertest-utilsjs)
4.  [Validation Test Utilities (`test/utils/validation-test-utils.js`)](#4-validation-test-utilities-testutilsvalidation-test-utilsjs)
5.  [Mock Factories (`test/game/phases/__mocks__/startNewHandPhase.js`)](#5-mock-factories-testgamephases__mocks__startnewhandphasejs)
6.  [Specialized Mocks and Factories](#6-specialized-mocks-and-factories)
    *   [Mock Logger Factory (`test/test-utils/mock-logger.js`)](#mock-logger-factory-testtest-utilsmock-loggerjs)
    *   [General Mocks & Constants (`test/utils/testMocks.js`)](#general-mocks--constants-testutilstestmocksjs)

---

## 1. Core Test Helpers (`test/helpers/test-helpers.js`)

This is the primary file for creating mock game states and managing the test environment. It provides powerful, configurable functions for setting up complex scenarios.

### Test Environment Management

These functions provide automatic setup and cleanup for tests, ensuring isolation.

-   **`setupTestEnvironment()`**: Registers global `beforeEach` and `afterEach` hooks to automatically reset mocks and run cleanup callbacks. This should be called once per test file.
-   **`onCleanup(fn)`**: Registers a cleanup function `fn` to be called after each test.
-   **`trackMock(mockFn)`**: Registers a `node:test` mock function for automatic call history reset after each test.
-   **`createTestContext()`**: Creates a context object with its own `track` and `onCleanup` methods for managing groups of related mocks and cleanup logic.

### Deterministic ID Generation

-   **`getTestId(prefix)`**: Generates a unique, deterministic ID (e.g., `game-0`, `game-1`) for tests.
-   **`resetTestIdCounter()`**: Resets the counter for `getTestId`. This is called automatically by `setupTestEnvironment` before each test to ensure predictable IDs.

### Card and Deck Creation

-   **`createDeck()`**: Creates a standard, ordered 24-card Euchre deck.
-   **`shuffleDeterministic(deck, seed)`**: Shuffles a deck predictably using a seeded Fisher-Yates algorithm. The same seed will always produce the same shuffled order.
-   **`createMockCard(suit, value)`**: Creates a single realistic mock card object.
-   **`getCard(cardId)`**: Retrieves a card object from the standard deck by its ID (e.g., "AS", "KD").
-   **`createCards(cardIdString)`**: Creates an array of card objects from a comma-separated string of card IDs (e.g., `"AS,KD,9C"`).

### Player and Game State Creation

-   **`createMockPlayer(role, overrides)`**: Creates a complete mock player object with automatic team assignment based on their role.

-   **`createBaseGameState(overrides)`**: Creates a foundational game state object with four complete, consistent player objects and sensible defaults, typically in the `LOBBY` phase.

    ```javascript
    // Usage Example
    const gameState = createBaseGameState({
      dealer: PLAYER_ROLES[1], // Set the dealer to West
      teamScores: { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 3 }
    });
    ```

-   **`setupTestState(options)`**: A powerful, configurable state generator that logically advances the game to a desired phase with specific conditions. This is the preferred way to set up complex test scenarios. This upholds the **SoC (Separation of Concerns)** principle by handling the complex 'Arrange' phase of a test, allowing the test body to focus purely on the 'Act' and 'Assert' phases.

    **Options:**
    -   `phase`: The target game phase (e.g., `GAME_PHASES.PLAYING`).
    -   `dealer`: The role of the dealer for the hand.
    -   `handOverrides`: A map of player roles to specific card arrays (e.g., `{ [PLAYER_ROLES[0]]: createCards('AS,KS,QS') }`).
    -   `trickOverrides`: An array of played cards to place in the `currentTrick`.
    -   `stateOverrides`: Raw overrides to apply to the final game state.

    ```javascript
    // Usage Example: Setup for a PLAYING phase where one card has been played
    const { gameState, playerHand } = setupTestState({
      phase: GAME_PHASES.PLAYING,
      dealer: PLAYER_ROLES[0], // South
      trumpSuit: SUITS.SPADES,
      trickOverrides: [{
        card: getCard('9C'),
        playedBy: PLAYER_ROLES[1] // West leads 9 of Clubs
      }]
    });
    // gameState is now in the PLAYING phase, it's North's turn (PLAYER_ROLES[2]).
    // playerHand contains North's hand.
    ```

-   **`setupCompletedHandState(options)`**: Creates a game state ready for the `SCORING` phase.

    **Options:**
    -   `makerTeam`: The team that called trump.
    -   `tricksWonByMaker`: The number of tricks the maker team won (0-5).
    -   `goingAlone`: (Optional) Boolean indicating if the maker went alone.

-   **`setupSocketTest(options)`**: Creates a complete mock environment for testing a socket handler. This helper embodies the **DIP (Dependency Inversion Principle)** by providing a sandboxed environment where dependencies like a mock `socket`, `io` server, and `gameRepository` are injected for the test.

---

## 2. General Test Utilities (`test/helpers/testUtils.js`)

This file provides miscellaneous, reusable test utilities.

-   **`createMockSafeStorage()`**: Returns a mock storage object with `getItem`, `setItem`, and `removeItem` methods, all of which are `mock.fn()`.
-   **`createMockSocketService()`**: Creates a comprehensive mock socket service client with mocked methods (`emit`, `on`, `off`, `disconnect`, `connect`) and state tracking (`isConnected`, `eventHandlers`).
-   **`createTestState(overrides)`**: A simple utility to create a basic test game state, primarily for lobby-related tests.

---

## 3. Server Test Utilities (`test/server/test-utils.js`)

This file contains helpers specifically for testing server-side logic, particularly persistence and socket connection handling.

-   **`class MockServer`**: A mock server implementation that simulates the main server's behavior regarding state management and persistence.
    -   **Constructor(`options`)**: Accepts mock `io`, `config`, `logger`, `fs`, and an `initialState`.
    -   **Methods**: Includes `initialize()`, `saveGameState()`, `cleanupGameState()`, `shutdown()`, etc., to simulate the server lifecycle.

-   **`createTestServer(options)`**: A factory function that creates and initializes a `MockServer` instance with all its dependencies (IO, FS, logger) already mocked. This is the main entry point for server-side tests.

-   **`createMockSocket(id)`**: Creates a simplified mock socket object for server-side connection tests.

-   **`mockIo()`**: Creates a mock Socket.IO server instance with a collection of mock sockets.

-   **`simulateAction(socketId, action, data)`**: A helper to find a mock socket by its ID and trigger one of its registered event handlers.

---

## 4. Validation Test Utilities (`test/utils/validation-test-utils.js`)

This file provides shared utilities specifically for creating consistent test data for game logic validation tests.

-   **`createCard(id, suit, value)`**: A lightweight card object creator for validation tests.
-   **`createStandardDeck()`**: Generates a standard 24-card Euchre deck.
-   **`createBaseGameState(overrides)`**: Creates a complete game state object with sensible defaults, typically starting in the `ORDER_UP_ROUND1` phase.
-   **`dealCards(gameState, hands)`**: A pure function that takes a game state and a map of player hands and returns a new game state with the cards dealt.
-   **`createMockLogger()`**: A factory that returns a mock logger where each log level (`info`, `warn`, etc.) is a `mock.fn()`. Includes a `reset()` method.

---

## 5. Mock Factories (`test/game/phases/__mocks__/startNewHandPhase.js`)

This file exemplifies the dependency injection pattern used for testing pure Layer 1 game logic. This pattern is a direct implementation of the **DIP (Dependency Inversion Principle)**, allowing high-level modules to be tested independently of their low-level dependencies.

-   **`createStartNewHand(dependencies)`**: This is a factory function. Instead of directly exporting the `startNewHand` logic, it exports a function that *creates* the `startNewHand` function. This allows tests to inject mock dependencies (`createDeck`, `shuffleDeck`, `getNextPlayer`).

    ```javascript
    // Usage in a test
    import { createStartNewHand } from './__mocks__/startNewHandPhase.js';

    const testDependencies = {
      createDeck: () => [/* predictable deck */],
      shuffleDeck: (deck) => deck, // Don't shuffle for deterministic tests
      getNextPlayer: (currentPlayer) => /* predictable next player */
    };

    // Create a testable instance of the startNewHand function
    const startNewHand = createStartNewHand(testDependencies);

    // Now, test startNewHand
    const result = startNewHand(initialState);
    ```
- **Other Helpers**: This file also exports its own `createBaseGameState` and `createMockDeck` helpers tailored for its tests.

---

## 6. Specialized Mocks and Factories

### Mock Logger Factory (`test/test-utils/mock-logger.js`)

This provides a standardized mock logger factory for use across the test suite.

-   **`createMockLogger()`**: Creates and returns a mock logger object.
    -   **Mocked Methods**: `info`, `warn`, `error`, `debug` are all `mock.fn()`.
    -   **Helper Methods**:
        -   `reset()`: Resets all mock functions.
        -   `assertLogged(level, message, times)`: An assertion helper to verify that a specific log message was called.

### General Mocks & Constants (`test/utils/testMocks.js`)

This file serves as a central point for test-specific constants and simple, pure mock factories.

-   **Constant Re-exports**: It re-exports all constants from `src/config/constants.js` so that tests can import them from a single, consistent location within the `test` directory.
-   **`createMockLogger()`**: Creates a frozen, pure mock logger where each method is a no-op function (`() => {}`). This is useful for tests where logging behavior is not being asserted.
-   **`validateMockLogger(logger)`**: A type-checking utility that verifies an object conforms to the mock logger interface, throwing a `TypeError` if it doesn't.