## User Interface Design Goals

### Overall UX Vision

The overall UX vision is to provide a clean, intuitive, and highly responsive interface that enables seamless real-time Euchre gameplay without any distractions. The design will prioritize clarity, ease of use, and a focused gaming experience.

### Key Interaction Paradigms

*   **Real-time Responsiveness:** User actions (e.g., playing a card, bidding) should be reflected instantly across all connected clients.
*   **Intuitive Controls:** Core game actions should be easily discoverable and executable with minimal clicks or complex gestures.
*   **Clear Feedback:** The UI shall provide immediate visual and textual feedback for all player actions and state changes (e.g., "Not your turn," "Invalid bid," trick winner announcements).
*   **Client-Side Lag Handling:** The UI shall provide clear visual feedback (e.g., "Connecting...", "Reconnecting...", "Server Unresponsive") during network interruptions. It should never attempt to guess game state or allow actions if the client is out of sync with the server. If `game_state_update` events arrive out of order, the client must apply them correctly based on a version/timestamp within the state object.

### Core Screens and Views

*   **Lobby Screen:**
    *   **Functionality:** A screen where players can create new games or join existing games by ID. It will serve as the gathering point before a game starts.
    *   **Player Identification:** Players in the lobby shall be identified by their chosen custom name (input during join). The UI should clearly display all 4 player slots (e.g., "South", "West", "North", "East"), showing assigned custom names for joined players and indicating "Waiting for player..." for empty slots.
    *   **Game ID Display:** The `gameId` for the current lobby shall be prominently displayed with a one-click "Copy" button for easy sharing.
    *   **Start Game Control:** The player who created the game (host) shall have a visible "Start Game" button, which becomes enabled only when all 4 player slots are filled and connected.
    *   **Name Uniqueness and Validation Feedback:** The UI shall provide immediate, clear feedback (e.g., inline error message) if a chosen player name is already taken by an active player in the lobby or if it contains invalid/offensive characters, preventing the player from proceeding until a valid name is chosen.
*   **Game Table Screen:**
    *   **Layout:** A top-down view of a 4-player card table, with the local player's hand at the bottom, partner opposite, and opponents to the left and right.
    *   **Display Player Hands:**
        *   **Local Player's Hand:** The current player's hand shall be prominently displayed at the bottom of the screen, with cards fanned out and visually representing their suit and rank. Cards should be interactive (clickable) for playing.
        *   **Other Players' Hands:** The hands of the other three players shall be represented by card backs, with a clear number indicating how many cards each player has remaining. This provides crucial game state information without revealing private data.
    *   **Active Trick Area:** A central area on the table for displaying cards played in the current trick. As each player plays a card, it shall animate from their hand to the center, clearly indicating who played it.
    *   **Player Identification:** Throughout the game, players shall be identified by their **custom chosen names** (e.g., "Alice," "Bob," "Charlie," "David"). Their assigned role (e.g., "South") can be displayed subtly or be implicit from their position on the table.
    *   **Dealer Indicator:** A clear and persistent visual indicator (e.g., a "D" icon, a dealer chip) shall be displayed next to the current dealer's name. This indicator must rotate with the dealer each hand.
    *   **Game Information:**
        *   **Trump & Turn Card:** A visible display of the current `trumpSuit` and the face-up `turnCard` during bidding. Once trump is set, the turn card area can be hidden or repurposed.
        *   **Trick Counter:** A simple, at-a-glance counter showing the number of tricks won by each team for the *current hand* (e.g., "Your Team: 2 tricks", "Opponents: 1 trick"). This counter resets after each hand is scored.
    *   **Scoreboard:** A persistent scoreboard displaying the overall `teamScores` (North/South vs. East/West) and the winning score target (e.g., "10 points").
    *   **Player Turn Indication:** A clear visual cue (e.g., highlighting, animation, timer) to indicate whose turn it is to bid or play a card.
    *   **Interactive Bidding Controls:** Modal dialogs or on-screen buttons for making bidding decisions.
        *   **Bidding Target Clarity:** The UI shall clearly indicate whether an "Order Up" decision would force their partner or an opponent to pick up the trump (e.g., "Order up your Partner").
    *   **Interactive Card Play:** Player's hand cards shall be clickable. The client-side logic for enabling/disabling cards must precisely mirror server-side validation rules to prevent invalid moves.
    *   **Game Messages/Announcements:** A discreet, auto-scrolling area for system messages (e.g., "Alice won the trick," "Bob ordered up").
*   **End Game/Scoring Summary:** A screen or overlay showing final scores, game results, and options to start a new hand/game.

### High-Level User Flows

*   **Game Join & Lobby Flow:**
    ```mermaid
    graph TD
        A[Start Page] --> B{Choose Action};
        B -->|Create Game| C[Enter Player Name];
        C --> D[Server: Create Game & Assign Role];
        D --> E[Lobby Screen];
        B -->|Join Game| F[Enter Player Name & Game ID];
        F --> G[Server: Validate & Assign Role];
        G -- Invalid --> H[Show Error: Game Not Found/Full];
        H --> F;
        G -- Valid --> E;
        E --> I{4 Players Joined?};
        I -- No --> J[Wait for others...];
        J --> E;
        I -- Yes --> K[Server: Start Game (Dealing Phase)];
        K --> L[Transition to Game Table Screen];
    ```
*   **Core Gameplay Loop (Bidding & Playing):**
    ```mermaid
    graph TD
        A[Game Table: Start of Hand] --> B[Bidding Phase];
        B --> C{Your Turn to Bid?};
        C -- No --> D[Wait for other bidders];
        D --> B;
        C -- Yes --> E[Show Bidding Controls];
        E --> F{Bid Decision};
        F -- Pass --> G[Server: Advance Turn];
        F -- Order Up/Call --> H[Server: Set Trump & Transition Phase];
        G --> B;
        H --> I[Playing Phase];
        I --> J{Your Turn to Play?};
        J -- No --> K[Wait for other players];
        K --> I;
        J -- Yes --> L[Enable Playable Cards];
        L --> M[Player plays card];
        M --> N[Server: Update Trick & Advance Turn];
        N --> O{Trick Complete?};
        O -- No --> I;
        O -- Yes --> P[Server: Determine Winner & Update State];
        P --> Q{Hand Complete?};
        Q -- No --> I;
        Q -- Yes --> R[Scoring Phase];
    ```

### Accessibility: None

### Branding

The UI will feature a clean, modern aesthetic with a color palette that is easy on the eyes and supports readability. Visuals should be unobtrusive, allowing the core game elements to be the focus.

### Target Device and Platforms

Web Responsive, targeting modern desktop and mobile browsers to ensure a consistent experience across devices.