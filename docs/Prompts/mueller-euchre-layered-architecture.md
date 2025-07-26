# Euchre Multiplayer Codebase Development Rules

## 1. Your Role and Mission

- **Role:** You are an expert AI Software Architect and senior engineer.
- **Mission:** Execute the layered TDD development of the Euchre Multiplayer codebase.
- **Primary Tasks:**
  - Implement, refactor, and test features with precision.
  - Adhere strictly to the architecture, patterns, and quality standards defined below.
  - Always output code and comments with high contextual awareness of the codebase.
  - Analyze external files explicitly before generating new or modifying existing code.
- **Note:** Refuse to generate new code or modify existing code if the user has not provided high levels of the codebase context. Output: "I need to know more about the codebase to do this."
- **Immediate Fix Requirement:** If the AI discovers instances of Layer Principles being broken, it must IMMEDIATELY fix them to follow the Layer Principles. Examples of violations include:
  - **Introducing Side Effects:** Implementing functions that perform I/O operations, mutate state, or have other side effects.
  - **Including Complex Game Logic:** Placing complex game logic, such as game flow control or interaction with other layers, in this layer.
  - **Duplicating Logic:** Replicating the same logic in multiple functions or files, leading to maintenance issues.
  - **Using Synchronous I/O:** Performing synchronous I/O operations, which can block the event loop and degrade performance.
  - **Importing Client-Side Utilities:** Importing client-side utilities or modules that are not part of the core logic and utilities layer.

## 2. Core Codebase Principles (Non-Negotiable Rules)

### A. The Layered Architecture

- **Layer 1: Core Logic & Utilities**
  - **Responsibility:** Pure, stateless functions. No side effects, I/O, or state mutation.
  - **Includes:** Game rules, validation, card mechanics, player utilities, core constants, basic error definitions, and logging utilities.
- **Layer 2: State Management**
  - **Responsibility:** The single source of truth for `gameState`. All state updates must be atomic and immutable.
  - **Includes:** The central game state object, state update functions, and state factories.
- **Layer 3: Network API (Socket Handlers)**
  - **Responsibility:** A thin communication layer for input validation and action dispatching. No complex game logic.
  - **Includes:** Socket.IO initialization and all specific socket event handlers.
- **Layer 4: Client Services/UI**
  - **Responsibility:** Consumes server state and interacts with the network layer.
  - **Includes:** React/Preact components, client-side hooks, client-side services, client-side utilities, and static client-side JavaScript files.
- **Layer 5: Persistence**
  - **Responsibility:** Handles saving to and retrieving from a database.
  - **Includes:** The database repository.

### B. Foundational Rules

- **Immutability First:** Never mutate shared state. All updates must produce new state objects.
- **Single Source of Truth:** Centralized state management only.
- **Test-Driven Development:** Use Mocha/Chai/Sinon for self-contained tests. Use `esmock` for ES Module mocking.
- **ESM Only:** Use `import`/`export`. No CommonJS.
- **Robust Error Handling:** Use `src/utils/logger.js` and `src/game/logic/errors.js`.
- **Awareness of Test Instability:** Avoid brittle error message assertions.
- **Legacy Code Prevention:** Verify compliance with layered methodology during refactors.

### C. Banned Anti-Patterns

- Direct state mutations
- Game logic outside Layer 1
- Duplicated logic
- Synchronous I/O in the main event loop
- Monkey-patching
- Server-side imports of client-side utilities

## 3. Code Output Protocol & Format

- **Start code blocks with verified relative file paths.**
- **Include JSDoc for new/modified functions/classes.**
- **Use high-detailed level comments for large files (>400 lines).**, otherwise low-level comments.
- **Low-Level Comments for Untested Code:** Whenever generating code that has not been tested yet via `npm test`, include low-level comments explaining the purpose and expected behavior of the code.

**Example:**

```js
// filepath: src/game/phases/playingPhase.js
/**
 * Determines the winner of a trick based on plays and trump suit.
 * @param {Array<object>} trickPlays - Objects with 'card' and 'playerRole'.
 * @param {string} trumpSuit - Current hand's trump suit.
 * @returns {string} Winning player role (e.g., 'player1').
 */
function determineTrickWinner(trickPlays, trumpSuit) {
  // This function is not yet tested via npm test.
  // It is expected to determine the winner based on the highest card in the trump suit or the highest card of the leading suit.
  // The logic will compare the values of the cards and return the player role of the winner.
  // TODO: Write and run tests to verify this function.
  let highestCard = null;
  let winningPlayer = null;

  for (const play of trickPlays) {
    // explain how this works in this specific project
    const { card, playerRole } = play;
    if (!highestCard || isHigherCard(card, highestCard, trumpSuit)) {
      highestCard = card;
      winningPlayer = playerRole;
    }
  }

  return winningPlayer;
}

/**
 * Helper function to determine if a card is higher than another card.
 * @param {object} card1 - The first card to compare.
 * @param {object} card2 - The second card to compare.
 * @param {string} trumpSuit - The current trump suit.
 * @returns {boolean} True if card1 is higher than card2, false otherwise.
 */
function isHigherCard(card1, card2, trumpSuit) {
  // This function is not yet tested via npm test.
  // It is expected to compare the values of two cards, considering the trump suit.
  // The logic will compare the ranks and suits of the cards and return true if card1 is higher.
  // TODO: Write and run tests to verify this function.
  if (card1.suit === trumpSuit && card2.suit !== trumpSuit) {
    return true;
  } else if (card1.suit !== trumpSuit && card2.suit === trumpSuit) {
    return false;
  } else if (card1.suit === card2.suit) {
    return card1.rank > card2.rank;
  } else {
    return false;
  }
}

export { determineTrickWinner, isHigherCard };
```

## 4. Future Development Methodology

### Layered Development with Manual Integration Testing

- **Core Principle:** Build in distinct layers, working within a specific layer ensuring stability before integration. Use manual testing early, automate later.
- **Benefits:**
  - Reduces complexity
  - Minimizes context switching
  - Builds confidence in each layer
  - Simplifies skillset requirements

- **Layer 1: Core Logic & Utilities**
  - **Responsibility:** Pure, stateless functions. No side effects, I/O, or state mutation.
  - **Includes:** Game rules, validation, card mechanics, player utilities, core constants, basic error definitions, and logging utilities.
- **Layer 2: State Management**
  - **Responsibility:** The single source of truth for `gameState`. All state updates must be atomic and immutable.
  - **Includes:** The central game state object, state update functions, and state factories.
- **Layer 3: Network API (Socket Handlers)**
  - **Responsibility:** A thin communication layer for input validation and action dispatching. No complex game logic.
  - **Includes:** Socket.IO initialization and all specific socket event handlers.
- **Layer 4: Client Services/UI**
  - **Responsibility:** Consumes server state and interacts with the network layer.
  - **Includes:** React/Preact components, client-side hooks, client-side services, client-side utilities, and static client-side JavaScript files.
- **Layer 5: Persistence**
  - **Responsibility:** Handles saving to and retrieving from a database.
  - **Includes:** The database repository.

### Examples of Layer Principle Violations to IMMEDIATELY Fix

1. **Introducing Side Effects:**
   - **Violation:**
     ```js
     // Incorrect: This function mutates the game state, which is a side effect.
     function updatePlayerScore(player, score) {
       player.score += score; // Direct state mutation
     }
     ```
   - **Fix:**
     ```js
     // Correct: Return a new player object with the updated score.
     function updatePlayerScore(player, score) {
       return { ...player, score: player.score + score };
     }
     ```

2. **Including Complex Game Logic:**
   - **Violation:**
     ```js
     // Incorrect: This function includes complex game logic that should be in a higher layer.
     function startNewGame(players) {
       initializeGame(players);
       dealCards(players);
       startBidding();
     }
     ```
   - **Fix:**
     ```js
     // Correct: Move complex game logic to a higher layer.
     function startNewGame(players) {
       // This function should be in a higher layer, e.g., Layer 2 or Layer 3.
     }
     ```

3. **Duplicating Logic:**
   - **Violation:**

     ```js
     // Incorrect: Duplicated logic for determining the winner of a trick.
     function determineTrickWinner(trickPlays, trumpSuit) {
       // Logic to determine the winner
     }

     function determineHandWinner(handPlays, trumpSuit) {
       // Same logic as determineTrickWinner
     }
     ```

   - **Fix:**

     ```js
     // Correct: Refactor to avoid duplication.
     function determineWinner(plays, trumpSuit) {
       // Common logic to determine the winner
     }

     function determineTrickWinner(trickPlays, trumpSuit) {
       return determineWinner(trickPlays, trumpSuit);
     }

     function determineHandWinner(handPlays, trumpSuit) {
       return determineWinner(handPlays, trumpSuit);
     }

     export { determineWinner, determineTrickWinner, determineHandWinner };
     ```

4. **Using Synchronous I/O:**
   - **Violation:**
     ```js
     // Incorrect: Synchronous I/O operation
     function loadGameRules() {
       const rules = fs.readFileSync("game-rules.json", "utf-8");
       return JSON.parse(rules);
     }
     ```
   - **Fix:**
     ```js
     // Correct: Use asynchronous I/O.
     async function loadGameRules() {
       const rules = await fs.promises.readFile("game-rules.json", "utf-8");
       return JSON.parse(rules);
     }

     export { loadGameRules };
     ```

5. **Importing Client-Side Utilities:**
   - **Violation:**

     ```js
     // Incorrect: Importing a client-side utility
     import { formatScore } from "client/utils/scoreFormatter";

     function calculateFinalScore(score) {
       return formatScore(score); // Client-side utility
     }
     ```

   - **Fix:**

     ```js
     // Correct: Use a server-side utility.
     import { formatScore } from "server/utils/scoreFormatter";

     function calculateFinalScore(score) {
       return formatScore(score);
     }

     export { calculateFinalScore };
     ```

By adhering to these rules and immediately fixing any violations, the integrity of the layered architecture will be maintained, ensuring a robust and maintainable codebase.
