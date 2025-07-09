---
trigger: always_on
---

# Mueller Euchre Project-Specific AI Rules

This document contains the custom rules and architectural mandates for the Kilo Code AI agent working on the MuellerEuchre project. All AI contributions **MUST** strictly adhere to these principles.

## 1. Core Mission & Guiding Documents

Your primary mission is to execute the **layered rewrite** of the Euchre Multiplayer codebase. You are to function as an expert software architect, implementing, refactoring, and testing features with precision.

-   **Project Configuration (`package.json`):** This is the "how." It defines the project's dependencies, scripts, and its use of **ES Modules (`"type": "module"`)**.

## 2. The Layered Architecture (Non-Negotiable)

All code must be structured according to this strict separation of concerns. Any violation of this architecture is a critical failure. WE ARE ONLY DEVELOPING LAYER 1.

-   **Layer 1: Core Logic & Utilities**
    -   **Responsibility:** Contains all pure, stateless game rules and business logic (e.g., `src/game/logic/validation.js`, `src/utils/deck.js`).
    -   **Constraint:** **MUST NOT** contain any state management, I/O, or network code. Functions in this layer receive data, process it, and return a result. They are fully deterministic.

-   **Layer 2: State Management**
    -   **Responsibility:** The single source of truth for the entire `gameState` (e.g., `src/game/state.js`). Manages atomic and immutable updates.
    -   **Constraint:** All state changes **MUST** flow through this layer's exported functions. No other layer is permitted to mutate the `gameState` object directly.

-   **Layer 3: Network & Socket Handlers**
    -   **Responsibility:** A thin communication layer that orchestrates actions (e.g., `src/socket/handlers/`). Listens for client events, validates incoming data, and calls functions in the lower layers.
    -   **Constraint:** **MUST NOT** contain any complex game logic.

-   **Layer 4: Client-Side Services & UI**
    -   **Responsibility:** Manages the client-side representation of the game (e.g., `src/client/services/`).
    -   **Constraint:** All client-side logic is currently **conceptual**. Your task is to implement the service logic (`.js` files), not the UI rendering (`.jsx`, `.css`).

-   **Layer 5: Persistence**
    -   **Responsibility:** Handles saving and retrieving game state from the database (e.g., `src/db/gameRepository.js`).
    -   **Constraint:** Interacts only with the State Management and Network layers at defined checkpoints.

## 3. Core Development Protocol

This protocol governs how all tasks are executed.

### A. Foundational Rules
-   **Immutability First:** Never mutate shared state directly. All state updates must be atomic and produce a new state object.
-   **Test-Driven Development:** Write unit tests for all new logic using **node:test**. DO NOT USE `esmock`, `sinon`, `chai`, or `jest` as those are FORBIDDEN.  
-   **ESM Only:** All code **MUST** use ES Modules (`import`/`export`). Do not introduce CommonJS (`require`/`module.exports`).
-   **Robust Error Handling:** Use the project's async logger (`src/utils/logger.js`) and custom error classes (`src/game/logic/errors.js`). Validate all inputs at module boundaries.
-   **CHANGE VERIFICATION:** You MUST run the test for a file after ANY MODIFICATIONS. NEVER assume your modifications were correct.
### B. Banned Anti-Patterns
You must actively avoid and refactor any code that exhibits these patterns from the archived codebase:
-   **NO** direct mutation of shared state objects.
-   **NO** game logic located outside of Layer 1 (Core Logic).
-   **NO** synchronous file I/O in the main event loop (e.g., for logging).
-   **NO** monkey-patching or modifying native/global objects.
-   **NO** server-side code importing from client-side utilities.
-   **NO** logic that bypasses game rules in test environments.

## 4. Code Output & Documentation Standards

-   **JSDoc:** All new or modified functions, classes, and complex code blocks **MUST** be documented with JSDoc comments.
-   **Contextual Awareness:** Your generated code and comments must demonstrate a deep understanding of the existing codebase. Reference other modules and their functions.
-   **Clarity:** For large files, add high-level comments explaining the responsibility of each major code block.

## 5. Restricted Files & Operations

-   **DO NOT MODIFY** the CI/CD workflow files in `.github/workflows/`
-   **DO NOT** alter the fundamental structure of the `package.json` scripts without explicit instruction. Small modifications to test paths are acceptable if required for a task.