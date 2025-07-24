### Non Functional

*   **NFR1: Performance - Real-time Latency:** The system shall ensure minimal latency for real-time interactions.
    *   **NFR1.1: Critical Action Latency:** The round-trip time (RTT) for critical game actions (e.g., player action sent to server, server processes, server broadcasts update, client receives update) shall be sub-200ms for 90% of requests. This specifically applies to:
        *   `GAME_EVENTS.ACTION_PLAY_CARD`
        *   `GAME_EVENTS.ACTION_ORDER_UP_DECISION`
        *   `GAME_EVENTS.ACTION_DEALER_DISCARD`
        *   `GAME_EVENTS.ACTION_GO_ALONE_DECISION`
    *   **NFR1.2: Load Conditions:** This latency target shall be met under typical load conditions, defined as up to 5 concurrent active games (20 concurrent players) connected to the self-hosted server.
    *   **NFR1.3: Network Sensitivity:** Performance should be acceptable on standard broadband connections (e.g., >25 Mbps download, >3 Mbps upload). Degradation on high-latency or low-bandwidth connections (e.g., mobile data, satellite internet) is understood but should not render the game unplayable.
    *   **NFR1.4: Server-Side Processing Optimization:** Critical synchronous game logic functions (e.g., within `src/game/phases/` and `src/game/logic/`) shall be profiled and optimized to minimize blocking the Node.js event loop, ensuring processing for a single action remains under 50ms.
    *   **NFR1.5: Database Performance:** MongoDB operations (read/write) performed by `src/db/gameRepository.js` shall execute efficiently, utilizing appropriate indexing to ensure data retrieval and persistence contribute minimally to overall latency (e.g., individual DB operations under 100ms for game state updates).
    *   **NFR1.6: Load Testing Validation:** The self-hosted environment shall undergo load testing to validate its capacity to support the stated 20 concurrent players and confirm that `NFR1.1` latency targets are consistently met.
*   **NFR2: Scalability - Concurrent Users:** The self-hosted infrastructure shall reliably support up to 20 concurrent active players (5 simultaneous games) without significant degradation in performance or an increase in latency beyond NFR1.
    *   **NFR2.1: Performance Degradation Threshold:** Under peak load (20 concurrent players actively playing), average critical action latency shall not exceed 300ms. The system shall remain responsive, avoiding freezes or crashes.
    *   **NFR2.2: Resource Utilization:** During peak load, CPU utilization on the hosting hardware should remain below 80%, and memory utilization below 70%, to ensure stability and capacity for bursts.
    *   **NFR2.3: Graceful Degradation:** If the system exceeds its planned capacity, it should degrade gracefully (e.g., slower responses, increased latency) rather than crashing or rejecting connections outright. New connection attempts might be queued or politely rejected if resources are exhausted.
    *   **NFR2.4: Future Scaling Strategy:** Future scaling beyond 20 concurrent players is recognized as a post-MVP concern and will require re-evaluation of hardware, network capacity, and potentially architectural changes (e.g., Node.js clustering, multiple instances).
*   **NFR3: Reliability - Connection Stability:** The system shall maintain stable WebSocket connections, minimizing unexpected disconnections. The automatic reconnection feature (FR2.2) should successfully re-establish 95% of dropped connections within 10 seconds.
*   **NFR4: Reliability - Game State Persistence:** The system shall reliably persist game state to MongoDB after every critical state change (e.g., phase transition, trick completion, score update) to enable recovery from server restarts or disconnections.
    *   **NFR4.1: Persistence Frequency:** The full game state shall be persisted to MongoDB via `src/db/gameRepository.js` immediately following any action that results in a significant state change, including:
        *   Successful player actions (bids, card plays, go alone decisions)
        *   Phase transitions (e.g., LOBBY to DEALING, PLAYING to SCORING)
        *   Trick completion and winner determination
        *   Score updates and game over detection
    *   **NFR4.2: Data Integrity:** Persisted game states shall maintain data integrity, reflecting the exact state of the game at the point of save, including player hands, current trick, scores, trump, dealer, and current player.
        *   **NFR4.2.1: Schema Validation:** Game state documents stored in MongoDB shall adhere to a defined schema (implicitly by consistent application logic and explicitly via future-proof schema validation mechanisms, e.g., MongoDB schema validation rules). Any partial or malformed state shall be rejected or logged as an integrity issue, not persisted in a corrupted form.
        *   **NFR4.2.2: Atomicity & Consistency:** Updates to the game state document (`gameRepository.updateGame`) shall be atomic, ensuring that an update is either fully applied or not at all. Conflicts from concurrent writes to the *same* game document should be managed to prevent data loss or inconsistencies (e.g., by using MongoDB's optimistic locking patterns or by ensuring that update operations are idempotent and always apply to the latest state retrieved).
        *   **NFR4.2.3: State Object Serialization Safety:** The `gameState` object passed to `gameRepository.updateGame` shall be guaranteed to be fully JSON-serializable. It must not contain circular references, functions, or non-data objects (e.g., Socket.IO instances, internal Node.js objects) that would cause persistence failures or data corruption.
    *   **NFR4.3: Recovery on Restart:** Upon server restart, all actively saved games shall be recoverable from the database, allowing players to rejoin and resume play from the last persisted state. Games that have reached the `GAME_OVER` phase should be identifiable but not automatically resumed.
        *   **NFR4.3.1: Server Startup Process:** During server initialization (`src/server.js`), the application shall establish a connection to MongoDB via `gameRepository.connect()` before accepting incoming client connections for game actions. If the database connection fails, the server shall log an error and not fully start or indicate an unhealthy state.
        *   **N4.3.2: Active Game Detection:** Upon successful database connection at startup, the server shall actively query `gameRepository` to identify all ongoing games (i.e., not in `GAME_OVER` phase) that were active before the restart. These games shall be loaded into server memory.
        *   **N4.3.3: Player Reconnection Post-Restart:** Existing players of active games shall be able to reconnect (`GAME_EVENTS.ACTION_REJOIN_GAME`) to their resumed games, with their `socketId` re-associated and their game state resynchronized from the loaded in-memory state.
        *   **N4.3.4: Corrupt State Handling:** If a loaded game state is detected as corrupt or inconsistent (e.g., missing critical fields, invalid phase transitions), the server shall log a critical error, mark the game as unrecoverable, and prevent players from joining or resuming that specific game. It should not crash the server or affect other games.
    *   **NFR4.4: TTL Indexing:** MongoDB collections for game states shall utilize Time-To-Live (TTL) indexing (e.g., `expireAfterSeconds`) to automatically clean up stale or abandoned game records, as currently configured in `src/db/gameRepository.js`.
*   **NFR5: Security - Data Protection:** The system shall protect sensitive game state data (e.g., player hands) from unauthorized client-side access or manipulation. All server-client communication shall be secured.
    *   **NFR5.1: Data Minimization:** Only essential player and game state data shall be stored and transmitted. Sensitive personal information not directly required for gameplay shall not be collected or stored.
    *   **NFR5.2: Server-Side Validation:** All player actions and incoming data from clients shall be rigorously validated on the server (`src/game/logic/validation.js`, `src/socket/handlers/`) before any state changes are applied. This prevents cheating or manipulation of game rules from the client.
    *   **NFR5.3: Data Secrecy (Player Hands):** Player hands (`hand` property within `players` objects) shall *only* be visible to the owning player on their client. For other players, only aggregated or obscured information (e.g., number of cards) shall be broadcast. The full `gameState` broadcast to all players (FR4.2) must redact other players' hands.
    *   **NFR5.4: Communication Security:** All communication between clients and the server (HTTP for static files, WebSocket for game data) shall be secured to prevent eavesdropping and tampering. (Note: SSL/TLS certificate setup is a self-hosted environment concern for implementation).
    *   **NFR5.5: Authentication/Authorization:** Basic authentication for player joining (`playerName`) shall be implemented. The server shall authorize actions, ensuring only the `currentPlayer` can make moves and only `dealer` can discard.
    *   **NFR5.6: Input Sanitization:** All user-provided text inputs (e.g., `playerName`, future chat messages) shall be sanitized to prevent common web vulnerabilities such as Cross-Site Scripting (XSS) or SQL/NoSQL Injection.
    *   **NFR5.7: Rate Limiting (Future):** Implement rate limiting on API/WebSocket endpoints to mitigate Denial-of-Service (DoS) attacks (future consideration for scalability beyond MVP).
*   **NFR6: Maintainability - Layered Architecture Adherence:** All new code shall strictly adhere to the defined Layered Development methodology, ensuring clear separation of concerns (e.g., Layer 1 pure logic, Layer 3 socket handlers, Layer 5 persistence).
    *   **NFR6.1: Layer Responsibilities & Communication:**
        *   **Layer 1 (Core Game Logic & Utilities):** Pure, stateless functions (`src/game/logic/`, `src/utils/`, `src/game/phases/`) that take input and return new state/data without side effects (no I/O, no global state mutation). Errors must be *thrown* as specific `src/game/logic/errors.js` instances.
        *   **Layer 2 (State Management & Orchestration - Conceptual):** Manages the central in-memory `gameState` for each active game. Orchestrates state changes by calling Layer 1 functions with the current state, and then persisting the *new* state via Layer 5. (Currently handled within Layer 3).
        *   **Layer 3 (Network API - Socket Handlers):** Listens for client `Socket.IO` events. Retrieves current game state from Layer 5, calls Layer 2/1 logic, saves new state to Layer 5, and broadcasts updates to clients. Handles `Socket.IO` specific logic and client communication (`src/socket/handlers/`).
        *   **Layer 4 (User Interface):** Client-side application responsible for rendering `gameState` updates from Layer 3 and emitting user actions. (Frontend in `public/` and `src/client/` conceptual structure).
        *   **Layer 5 (Data Access & Persistence):** Purely responsible for asynchronous `MongoDB` operations (`src/db/gameRepository.js`). Provides methods to save and retrieve game states; does not contain game logic or state mutation.
    *   **NFR6.2: Strict Layer Enforcement:** Code within a given layer shall only interact with adjacent layers as defined (e.g., Layer 1 must not call Layer 5 directly, Layer 3 must not contain game logic that should be in Layer 1). Upward calls are forbidden (e.g., Layer 5 calling Layer 3).
    *   **NFR6.3: Context Minimization (AI Development Focus):** Each module and function should be designed to encapsulate its specific responsibility, minimizing the amount of external context (e.g., other files, global state) an AI agent needs to comprehend to implement or modify it. This promotes efficient AI-assisted development.
    *   **NFR6.4: Enforcement & Validation:** Adherence to layered architecture principles shall be enforced through code reviews, automated tests (e.g., unit tests isolating layers), and potentially static analysis tools (future consideration).
        *   **NFR6.4.1: LLM Audit Objectives:** Periodically, an LLM (e.g., a BMad QA Agent or Architect Agent) shall audit the codebase to identify architectural deviations, specifically focusing on cross-layer violations (e.g., Layer 1 performing I/O, Layer 3 containing pure game logic). The primary objective is to maintain Layer 1's purity and detect unwanted coupling, promoting clean handoffs for AI agents.
        *   **NFR6.4.2: LLM Audit Scope:** LLM audits shall primarily target newly added or modified code within `src/game/`, `src/utils/`, `src/socket/`, and `src/db/` directories. Reviews will focus on module imports and high-level function call patterns.
        *   **NFR6.4.3: Possible LLM Audit Prompts:**
            *   **Prompt for Layer Purity Violation (I/O in Layer 1):**
                ```
                Given the Layer 1 module: [MODULE_FILE_PATH] and its code:
                [CODE_SNIPPET_OF_MODULE]
                Identify any high-level patterns or direct calls that suggest this module might be performing I/O operations (e.g., database calls, file system access, network requests, or direct Socket.IO emits/listeners). Does this violate Layer 1's purity mandate (NFR6.1) by introducing side-effects? Explain why or why not, and if it does, suggest the appropriate layer for such operations.
                ```
            *   **Prompt for Upward Layer Violation (e.g., Layer 5 calling Layer 3):**
                ```
                Examine the Layer X (e.g., Layer 5 - Persistence) module: [MODULE_FILE_PATH] with its code:
                [CODE_SNIPPET_OF_MODULE]
                According to NFR6.2, Layer X should not directly interact with layers above it (e.g., Layer 3 - Network API handlers). Look for any imports or high-level function calls that seem to initiate communication or control flow in an "upward" direction in the layered architecture. Describe any violations found and propose refactoring principles to adhere to strict layer enforcement.
                ```
            *   **Prompt for Logic Misplacement (Layer 3 containing Layer 1 logic):**
                ```
                Review the Layer 3 module (Network API Handler): [MODULE_FILE_PATH] and its code:
                [CODE_SNIPPET_OF_MODULE]
                Evaluate if this module contains significant or complex game rules, core calculations, or state-transition logic that appears to be pure and deterministic, which should ideally reside in Layer 1 (Core Game Logic & Utilities) as per NFR6.1. Identify such logic and explain why it represents a misplacement, suggesting a high-level approach for refactoring it into Layer 1 modules.
                ```
            *   **Prompt for Context Minimization Review (NFR6.3):**
                ```
                Consider the module at: [MODULE_FILE_PATH] with its code:
                [MODULE_CODE]
                From a maintainability and AI development perspective (NFR6.3), assess if this module is overly complex or has too many responsibilities, making it difficult to understand or modify in isolation. Suggest high-level refactoring strategies to reduce its cognitive load and minimize the external context an AI agent would need.
                ```
        *   **NFR6.4.4: LLM Audit Output:** LLM audits shall provide findings in a structured format (e.g., Markdown table with File, Issue Type, Severity, Description, Recommended Fix) and cite the relevant NFR.
*   **NFR7: Testability - Comprehensive Unit Testing:** All core game logic (Layer 1 modules in `src/game/logic/` and `src/utils/` and `src/game/phases/`) shall be covered by comprehensive unit tests (`test/game/logic/`, `test/game/phases/`, `test/utils/`) with minimum 95% code coverage for statements and branches in these modules.
*   **NFR8: Deployability - Self-Hosted Environment:** The application shall be deployable and runnable on a standard Node.js environment on owned hardware, with all configuration externalized (e.g., via environment variables in `src/config/database.js`).
*   **NFR9: Usability - Ad-Free Experience:** The user interface shall remain completely free of third-party advertisements or intrusive monetization elements.
*   **NFR10: User Feedback - Error Messaging:** Error messages displayed to users shall be clear, concise, and provide actionable information (e.g., "Not your turn," "Invalid card," "Game not found").