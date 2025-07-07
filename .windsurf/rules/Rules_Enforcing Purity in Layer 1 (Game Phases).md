### **Ruleset: Enforcing Purity in Layer 1 (Game Phases)**

This document outlines the architectural rules for all modules within the `src/game/phases/` directory. The primary goal is to ensure that all game logic in this layer is implemented as **pure functions**, making the system more predictable, testable, and maintainable.

#### **Core Principles**

1.  **Pure, Stateless Logic:** All exported functions must be pure. They receive the current state as input, perform calculations, and return a new, transformed state without causing any side effects.

2.  **Explicit State Flow:** Functions must not access a global or shared state. The entire state they need to operate on must be passed in as an argument.

3.  **Immutability is Non-Negotiable:** Functions **must never** mutate the input `gameState` object. All modifications must be performed on a deep clone.

4.  **No Direct State Management:** Layer 1 is forbidden from calling state management functions (e.g., `updateGameState`, `resetFullGame`). Its only responsibility is to calculate the *next* state.

5.  **No I/O Operations:** 
     *  **5.a) Layer 1 must not perform any I/O.
     *  **5.b) Layer 1 must not perform any database interactions (`gameRepository`)
     *  **5.c) Layer 1 must not perform any logging to files.
     *  **5.d) Layer 1 must not perform any making network calls.


#### **Implementation Rules & Best Practices**


     *   **Deep Cloning:** Any function that modifies the `gameState` must create a deep clone at the beginning of its execution.

    ```javascript
    // CORRECT: Start with a deep clone.
    function handlePlayCard(gameState, /* ...args */) {
      let newGameState = JSON.parse(JSON.stringify(gameState));
      // ...
    }
    ```

     *   **State Modification:** State changes must be performed via direct property assignment on the cloned `newGameState` object.
    ```javascript
    // CORRECT: Direct assignment to the clone.
    newGameState.currentPlayer = nextPlayer;
    newGameState.message = 'Player changed.';
    ```

*   **Return New State:** Every state-transforming function must conclude by returning the modified clone.
    ```javascript
    // CORRECT: Explicitly return the new state.
    return newGameState;
    ```

*   **Function Composition:** When chaining pure functions, the new state object returned from one function must be passed as the input to the next.
    ```javascript
    // CORRECT: Chaining pure functions with their outputs.
    let updatedScoreState = calculateAndApplyScore(gameState);
    return checkGameOver(updatedScoreState);
    ```

*   **Synchronous by Default:** Functions in this layer should be synchronous. The `async` keyword is forbidden unless a function uses `await` for a pure, promise-based calculation, which should be rare.

#### **Forbidden Patterns (Anti-Patterns)**

The following patterns are strictly prohibited in the `src/game/phases/` directory and will fail code review.

1.  **Forbidden Imports:**
    ```javascript
    // FORBIDDEN
    import { updateGameState, resetFullGame } from '../state.js';
    import { gameRepository } from '../../db/gameRepository.js';
    ```

2.  **Direct Mutation of Input State:**
    ```javascript
    // FORBIDDEN: Modifying the original gameState argument.
    function handlePlayCard(gameState, /* ... */) {
        gameState.currentPlayer = nextPlayer; // VIOLATION!
        // ...
    }
    ```

3.  **Calling State Management Functions:**
    ```javascript
    // FORBIDDEN
    let newGameState = updateGameState(gs => ({...gs, prop: val}));
    ```

4.  **Performing I/O:**
    ```javascript
    // FORBIDDEN
    await gameRepository.updateGame(gameState.gameId, newGameState);
    ```

#### **Enforcement and Verification**

1.  **Unit Testing:** All Layer 1 functions require comprehensive unit tests. Tests must:
    *   Provide a sample `gameState` object as input.
    *   Call the function with necessary arguments.
    *   Assert that the **returned** state object matches the expected outcome.
    *   **Crucially, assert that the original input object was not mutated.**

2.  **Code Review:** Pull Requests modifying Layer 1 must be strictly checked against this ruleset, with a focus on identifying any "Forbidden Patterns."

3.  **Static Analysis (Future Goal):** Enforce these rules with custom ESLint configurations to automatically flag forbidden imports and patterns during development.