## Technical Assumptions

### Repository Structure: Monorepo

The project will likely adopt a monorepo structure to contain both the backend Node.js application (server, game logic, persistence) and the frontend React application. This facilitates shared code (e.g., utility functions, constants, types) and streamlined development workflows.

### Service Architecture: Backend-driven with Pure Logic Layer

The core service architecture will be backend-driven, with all authoritative game logic residing on the server. It will strictly adhere to the established layered methodology:
*   **Layer 1 (Core Game Logic):** Pure, stateless, and testable game rules.
*   **Layer 3 (Network API - Socket.IO):** Handles client communication and orchestrates game flow by interacting with Layer 1 and Layer 5.
*   **Layer 5 (Data Access/Persistence):** Manages MongoDB interactions.

**Development Mandate: Layer by Layer Design Ensuring Layer Purity**

All development and modifications, especially within the core backend, MUST strictly adhere to the project's layered architectural mandate (as detailed in `docs/Project_Architectural_Mandate_for_Layer_1.md` and NFR6). This includes:

*   **Layer 1 (Core Game Logic & Utilities):**
    *   **Responsibility:** Contains all pure, stateless game rules and business logic (e.g., `src/game/logic/validation.js`, `src/utils/deck.js`, `src/game/phases/*.js`). Functions take input and return new state/data without side effects.
    *   **Purity Mandate:** MUST NOT perform any I/O operations (database calls, file system, network requests) and MUST NOT mutate global or shared state directly. Errors must be *thrown*.
    *   **Interactions:** Can be called by Layer 2/3. Cannot call any other layers (strictly no upward calls).

*   **Layer 2 (State Management & Orchestration - Conceptual):**
    *   **Responsibility:** Manages the central in-memory `gameState` for each active game instance. Orchestrates state changes by calling Layer 1 functions with the current state, and then coordinating its persistence.
    *   **Functionality:** Retrieves current game state (from Layer 5 directly or via Layer 3 handlers), calls appropriate Layer 1 functions with the state, receives a *new* state object, and then coordinates its persistence. It should hold the game state in memory for active games.
    *   **Interactions:** Calls Layer 1 (for pure logic) and Layer 5 (for persistence). Is called by Layer 3 (Network API). (Note: In the current codebase, some of this orchestration logic is currently embedded within Layer 3 socket handlers. Future refactoring may extract a dedicated Layer 2).

*   **Layer 3 (Network API - Socket Handlers):**
    *   **Responsibility:** Acts as the "controller" layer, managing client communication over `Socket.IO`. Listens for client events and translates them into calls to Layer 2/1 logic.
    *   **Functionality:** Retrieves current game state (from Layer 5 directly or via Layer 2), validates incoming client data, calls Layer 2/1 functions, and broadcasts `game_state_update` events back to clients.
    *   **Interactions:** Calls Layer 2/1 (for game logic) and Layer 5 (for persistence). Is called by client requests. Must NOT contain complex game logic or state mutation that belongs in Layer 1.

*   **Layer 4 (User Interface):**
    *   **Responsibility:** The client-side application responsible for rendering the game state received from the server and providing interactive elements for user input.
    *   **Functionality:** Receives `game_state_update` events (from Layer 3), renders the UI based solely on this server-authoritative data, and emits user actions (e.g., `play_card`, `order_up_decision`) back to Layer 3.
    *   **Interactions:** Communicates with Layer 3 (server). Must NOT contain game logic or state that should be server-authoritative.

*   **Layer 5 (Data Access & Persistence):**
    *   **Responsibility:** The data access layer, purely responsible for asynchronous `MongoDB` operations (`src/db/gameRepository.js`).
    *   **Functionality:** Provides methods to save, retrieve, and query game states from the database. It handles raw database interactions (e.g., connecting, reading/writing documents, indexing).
    *   **Interactions:** Is called by Layer 2/3. Must NOT contain game logic, network logic, or UI logic. **Strictly no upward calls** (e.g., calling Layer 3/2 or Layer 1 functions).

*   **Strict Layer Enforcement:**
    *   Code within a given layer shall only interact with specific adjacent layers as defined above.
    *   Upward calls (e.g., Layer 5 calling Layer 3, Layer 3 calling Layer 4) are strictly forbidden to maintain separation of concerns and reduce cognitive load.
    *   **Implication for AI Development:** This purity allows AI agents (and human developers) to reason about modules within their defined layer boundaries, significantly reducing the context required to understand and modify them, and making unit testing straightforward. Violations will lead to increased debugging complexity, unpredictable behavior, and make AI-assisted refactoring extremely challenging.

*   **Context Minimization (AI Development Focus):** Each module and function should be designed to encapsulate its specific responsibility, minimizing the amount of external context (e.g., other files, global state) an AI agent needs to comprehend to implement or modify it. This promotes efficient AI-assisted development.

*   **Enforcement & Validation:** Adherence to layered architecture principles shall be enforced through code reviews, automated tests (e.g., unit tests isolating layers), and potentially static analysis tools (future consideration, including LLM-assisted audits as defined in NFR6.4).

### Testing requirements: Comprehensive Unit and Integration Tests

The project mandates comprehensive testing to ensure reliability and maintainability.
*   **Unit Tests:** Mandatory for all Layer 1 modules, aiming for high code coverage (NFR7). These tests must be pure, mocking all external dependencies to verify the logic in isolation.
*   **Integration Tests:** Critical for validating interactions between layers (e.g., Socket Handlers with game logic and persistence).
*   **E2E Tests:** Planned for later phases (Post-MVP) to validate full system functionality from the client perspective.
*   **Automated Testing:** Integration into CI/CD pipeline (NFR7).
*   **Manual Testing:** Convenience methods should be available for manual testing during development.

### Additional Technical Assumptions and Requests

*   **Self-Hosted Environment:** The application is designed for deployment on owned hardware and software, with no reliance on external cloud-managed services for core hosting (as per updated trade-off analysis).
*   **MongoDB for Persistence:** MongoDB is the chosen database for game state persistence, as per existing setup.
*   **Node.js/Express for Backend:** The backend will continue to use Node.js and Express.js.
*   **React for Frontend:** The frontend will be built using React.
*   **Socket.IO for Real-time:** Socket.IO will be the primary technology for real-time communication between server and clients.
*   **Module System:** ES Modules (`import`/`export`) will be used consistently across the codebase.
*   **Error Handling (Layer 1):** The project's custom error classes defined in `src/game/logic/errors.js` (`ValidationError`, `NotPlayersTurnError`, `InvalidPhaseError`, `CardNotInHandError`, `MustFollowSuitError`, `InvalidBidError`, `InvalidDiscardError`, `PhaseLogicError`, `InvalidCardError`) are deemed **sufficient** for handling game logic validation and internal phase logic errors within Layer 1. They provide the necessary specificity for higher layers to interpret and respond.
*   **Logging:** The centralized `src/utils/logger.js` will be used for all application logging.