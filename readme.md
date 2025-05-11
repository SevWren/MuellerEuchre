# Online Multiplayer Euchre Card Game

## 1. Project Overview

This project aims to create a web-based, real-time, 4-player Euchre card game. Players connect via their web browsers to a central server that manages the game logic and state. The goal is to provide a functional and interactive Euchre experience adhering to common game rules.

**Core Technologies:**
*   **Backend:** Node.js with Express.js for the web server and Socket.IO for real-time, bidirectional WebSocket communication.
*   **Frontend:** HTML for structure, CSS (with some Tailwind CSS via CDN) for styling, and client-side JavaScript for UI interactions and communication with the server.

**Game Rules & Mechanics (Implemented or In Progress):**
*   **Players:** 4 players, in two partnerships (North/South vs. East/West).
*   **Deck:** Standard 24-card Euchre deck (9, 10, Jack, Queen, King, Ace of each of the four suits).
*   **Dealing:** 5 cards dealt to each player. An "up-card" is turned from the remaining kitty.
*   **Trump Making (Bidding):**
    *   **Round 1:** Players, starting left of the dealer, can "order up" the dealer (making the up-card's suit trump and forcing the dealer to take it) or "pass."
    *   **Dealer's Discard:** If trump is made by ordering up the dealer, the dealer picks up the up-card and discards one card from their hand.
    *   **Round 2:** If all players pass in Round 1, the up-card is turned down. Players, starting left of the dealer, can name any *other* suit as trump or pass. If all players pass again, the hand is typically re-dealt (current implementation).
*   **Going Alone:** The player (or their partner) whose team made trump can choose to "go alone," meaning their partner sits out for that hand, and the "loner" plays against both opponents.
*   **Card Ranking (with Trump):**
    1.  Jack of the trump suit (Right Bower).
    2.  Jack of the suit of the *same color* as trump (Left Bower - acts as a trump card).
    3.  Ace, King, Queen, 10, 9 of the trump suit.
    4.  Non-trump suits: Ace, King, Queen, (Jack, if not a Bower), 10, 9.
*   **Gameplay:**
    *   The player to the dealer's left leads the first trick (unless someone is going alone, adjusting the lead).
    *   Players must follow suit if possible. If void in the suit led, they can play any card (including trump).
    *   The highest card of the suit led wins the trick, unless a trump card is played, in which case the highest trump card wins.
    *   The winner of a trick leads the next trick.
*   **Scoring:**
    *   Makers (team that chose trump) take 3 or 4 tricks: 1 point.
    *   Makers take all 5 tricks (march): 2 points.
    *   Makers go alone and take 3 or 4 tricks: 1 point (classic scoring, some variations give 4). Current implementation uses 1 point.
    *   Makers go alone and take all 5 tricks: 4 points.
    *   Makers fail to take 3 tricks (Euchred): Opponents score 2 points.
*   **Winning the Game:** First team to reach 10 points wins.

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

## 2. File Descriptions

### `server.js`
This is the main backend file, running on Node.js. It manages the entire game logic, state, and communication between players.

*   **Server Setup:**
    *   Uses `express` to create a web server and `http` module as its base.
    *   Initializes `socket.io` and attaches it to the HTTP server for WebSocket communication.
    *   Serves static files (like `index.html` and any associated CSS/JS) from the `public` directory. **Note:** Currently, `index.html` is at the root; for `app.use(express.static(path.join(__dirname, 'public')));` to work as intended, `index.html` should be moved into a `public` subdirectory.
*   **Game State (`gameState` object):**
    *   A comprehensive JavaScript object that acts as the single source of truth for all game-related information. This includes:
        *   `gameId`: Unique identifier for the current game session.
        *   `playerSlots`: Array defining the roles ('south', 'west', 'north', 'east').
        *   `players`: An object mapping roles to player-specific data (socket ID, name, hand, team, tricks taken).
        *   `connectedPlayerCount`: Tracks active connections.
        *   `gamePhase`: Critical string indicating the current stage of the game (e.g., 'LOBBY', 'DEALING', 'ORDER_UP_ROUND1', 'PLAYING_TRICKS', 'GAME_OVER').
        *   `deck`, `kitty`, `upCard`: Card management.
        *   `trump`, `dealer`, `currentPlayer`: Game flow and rule variables.
        *   `orderUpRound`, `maker`, `playerWhoCalledTrump`: Bidding process state.
        *   `goingAlone`, `playerGoingAlone`, `partnerSittingOut`: State for "lone hands."
        *   `tricks`, `currentTrickPlays`, `trickLeader`: Trick management.
        *   `team1Score`, `team2Score`, `winningTeam`: Scoring.
        *   `gameMessages`: A log of important game events.
    *   `resetFullGame()`: Function to initialize or reset `gameState` to a default, clean state for a new game or upon server start.
*   **Game Logic Functions:**
    *   A suite of functions implementing Euchre rules:
        *   Card Management: `createDeck()`, `shuffleDeck()`.
        *   Dealing: Handled within `startNewHand()`.
        *   Hand Lifecycle: `startNewHand()` (sets up for a new round of play).
        *   Player/Team Utilities: `getNextPlayer()`, `getPartner()`.
        *   Card Representation: `cardToString()`, `sortHand()`.
        *   Trump/Bower Logic: `isRightBower()`, `isLeftBower()`, `getSuitColor()`, `getCardRank()` (determines card power).
        *   Player Action Handlers: `handleOrderUpDecision()`, `handleDealerDiscard()`, `handleCallTrumpDecision()`, `handleGoAloneDecision()`, `handlePlayCard()`.
        *   Validation: `serverIsValidPlay()` ensures plays adhere to rules.
        *   Scoring: `scoreCurrentHand()` calculates points after each hand.
*   **Socket.IO Event Handling (`io.on('connection', ...)`):**
    *   **`connection`:** When a new client connects:
        *   Assigns an available role if in 'LOBBY' phase.
        *   Notifies client of 'game_full' or 'game_in_progress' if applicable.
        *   Calls `broadcastGameState()` to send current state.
    *   **Client-Sent Events:** Listens for actions emitted by clients:
        *   `request_start_game`: Initiates a new game if conditions met.
        *   `action_order_up`, `action_dealer_discard`, `action_call_trump`, `action_go_alone`, `action_play_card`: Trigger corresponding server-side game logic handlers.
        *   `request_new_game_session`: Resets the game to lobby, re-assigning currently connected players.
    *   **`disconnect`:** When a client disconnects:
        *   Updates `connectedPlayerCount`, clears player slot.
        *   If a game is in progress and player count drops, resets the game to 'LOBBY', preserving scores and attempting to re-assign remaining players.
*   **State Broadcasting (`broadcastGameState()`):**
    *   Crucial function called after most state changes.
    *   Sends a tailored version of `gameState` to *each* connected client via `game_update`.
        *   Personalization includes revealing only that client's hand and marking their role/name. Other hands are obfuscated.
        *   The full deck is not sent.
    *   If `gameState.gamePhase === 'LOBBY'`, it also emits a `lobby_update` with summarized player connection info for simpler lobby UI rendering.
*   **Utility Functions:**
    *   `addGameMessage()`: Adds a timestamped message to the `gameMessages` log.
    *   `getPlayerBySocketId()`, `getRoleBySocketId()`: Helper functions for mapping socket IDs to player data.
*   **Server Initialization:** Starts the HTTP server and listens on the defined `PORT`.

### `index.html`
This file is the single-page application (SPA) that players interact with in their browsers. It contains the HTML structure, CSS styling, and client-side JavaScript logic.

*   **HTML Structure:**
    *   Standard HTML5 document setup.
    *   Includes Socket.IO client library and Tailwind CSS from CDNs.
    *   **Main UI Areas:**
        *   `.score-area`: Displays team scores, current trump, and player identification.
        *   `#game-status-display`: Shows the current phase of the game or whose turn it is.
        *   `#lobby-info-display`: Shows connected players during the 'LOBBY' phase.
        *   `#game-messages-display`: A log of game events.
        *   `#lobby-actions`: Contains the "Start Game" button.
        *   `.kitty-area`: Displays the up-card (or kitty placeholder).
        *   `.center-game-area`: Contains the `.trick-area` where cards played to the current trick are shown.
        *   Player Areas (`#south-area`, `#west-area`, `#north-area`, `#east-area`): Positioned around the table, each contains a player label and a `div` for rendering their hand.
    *   **Modals:** Hidden `div` elements that are shown for player interactions:
        *   `#order-up-modal`: For Round 1 bidding.
        *   `#dealer-discard-modal`: For the dealer to discard after picking up.
        *   `#call-trump-modal`: For Round 2 bidding.
        *   `#go-alone-modal`: For the trump-making team to decide on playing alone.
        *   `#game-over-modal`: Displays final results and new game option.
        *   `#rules-modal`: Initially shown, provides game rules.
*   **CSS Styling (Embedded `<style>`):**
    *   Uses CSS custom properties (e.g., `--card-width`, `--red`) for theme consistency.
    *   Detailed styling for:
        *   Cards: Dimensions, appearance (face/back), hover effects for playable cards, selection indication for discard.
        *   Player Areas: Absolute positioning and rotations to simulate a card table perspective. Labels are also styled based on dealer/current player status.
        *   Trick Area: Positioning for cards played by each player.
        *   Up-Card/Kitty Area.
        *   Modals: Centered overlay appearance.
        *   Buttons: General styling and specific styles for different actions (primary, success, danger).
        *   General page layout and typography.
*   **Client-Side JavaScript (`<script>` block):**
    *   **Socket.IO Client:** Initializes `socket = io()` to connect to the server.
    *   **Global State:**
        *   `myPlayerRole`, `myName`: Stores the client's assigned role and name.
        *   `currentServerGameState`: A local copy of the latest game state received from the server.
    *   **DOM Element Cache (`elements` object):** Stores references to frequently used HTML elements for easier access and minor performance gain.
    *   **Socket Event Listeners:**
        *   `connect`: Logs successful connection.
        *   `assign_role`: Updates `myPlayerRole` and `myName`, sets document title.
        *   `lobby_update`: Updates `currentServerGameState` (if in lobby phase) and refreshes the lobby UI.
        *   `game_update`: The core message handler. Updates `currentServerGameState`, hides all modals, calls `updateUI()` to re-render the game based on the new state, then calls `handleTurnSpecificModals()` or `showGameOverModal()` as appropriate. Also updates game messages.
        *   `game_full`, `action_error`: Displays alert messages from the server.
    *   **UI Rendering Functions:**
        *   `updateUI(state)`: Master function to refresh the entire game view. It updates scores, trump display, game status text, player labels (highlighting current player, dealer, partner), renders all player hands using `renderHand()`, and renders the up-card and current trick.
        *   `renderHand(handArray, handContainer, isMyHand, gameState)`: Clears and re-renders cards in a player's hand area. If it's the current client's hand and their turn to play, it makes valid cards clickable.
        *   `renderCardDOM(cardData, cardElement, currentTrump, isMyCard)`: Creates the visual representation of a single card (value, suit symbols, color, trump indicator text) within a given `cardElement`. Handles card backs for unknown cards.
        *   `updateGameMessages(messagesArray)`: Populates the game messages log.
        *   `handleTurnSpecificModals(state)`: Shows the correct modal dialog (e.g., "Order Up?") if it's the client's turn and the game phase requires a decision. Populates modals with relevant info (e.g., up-card details).
        *   `showGameOverModal(state)`: Displays game results.
    *   **Player Action Emitters:** Event listeners on buttons (e.g., "Order Up", "Pass", "Play Card") that, when clicked, emit corresponding messages (e.g., `action_order_up`, `action_play_card`) to the server with necessary data.
    *   **Client-Side Helpers:**
        *   `getPlayerRelativePosition(targetRole)`: Calculates how other players' areas should be displayed relative to the client's fixed 'South' perspective.
        *   `clientIsLeftBower()`, `clientIsValidPlay()`: Client-side logic to assist UI (e.g., highlighting playable cards). Authoritative validation is done on the server.
        *   `SUITS_DATA`: An object mapping suit names to symbols and CSS classes for rendering.
        *   `getPartner()`: Client-side utility to identify partner.
    *   **Initialization:** Sets initial game status text.

### `package.json`
This is the manifest file for the Node.js project.
*   **`name`**: "public" (This is unconventional for a project root; typically, it's the project's name, e.g., "euchre-multiplayer").
*   **`version`**: "1.0.0".
*   **`description`**: Empty.
*   **`main`**: "index.js" (The actual server entry point is `server.js`).
*   **`scripts`**: Contains a placeholder "test" script. Could be used for `npm start` to run `node server.js`.
*   **`dependencies`**:
    *   `express`: "^5.1.0" (Web framework).
    *   `socket.io`: "^4.8.1" (Real-time communication library).
*   Lists project metadata and dependencies required by `npm`.

### `package-lock.json`
This file is automatically generated by `npm` to lock down the exact versions of all installed dependencies and their sub-dependencies.
*   **Purpose**: Ensures that anyone who installs the project dependencies using `npm install` will get the identical package versions, leading to reproducible builds and avoiding unexpected issues from transitive dependency updates.
*   It should not be manually edited.

## 3. Current Bugs & Issues Being Addressed

1.  **Client UI Not Updating After Game Start / Stale UI:**
    *   **Description:** After the "Start Game" button is clicked and the server initiates the game (dealing cards, setting the up-card, determining the first player for bidding), the client UIs often do not reflect these changes. They remain stuck displaying a pre-game or lobby state.
    *   **Symptoms Observed:**
        *   Game status text (top center) shows "Connected. Waiting for role..." or similar stale message instead of "Current: [PlayerName] - Order up or pass?".
        *   Player hands are not rendered or show as empty.
        *   The up-card area does not display the correct up-card dealt by the server.
        *   Game messages (bottom left) might still show "Welcome!" or only initial connection messages.
    *   **Potential Causes:**
        *   The `game_update` event from the server might not be consistently processed by the client's `socket.on('game_update', ...)` handler after the transition from the 'LOBBY' phase.
        *   The `updateUI(state)` function on the client might have logical errors preventing it from correctly re-rendering the entire UI with the new game state data (player hands, up-card, trick area, status text, etc.).
        *   The global `currentServerGameState` on the client might not be updating correctly, or `updateUI` might be using an old version.
        *   CSS or DOM manipulation issues where old elements are not cleared before new ones are rendered, or elements are not being selected/updated correctly.
        *   The client-side `myPlayerRole` variable might be `null` or incorrect when `updateUI` is called, leading to errors in `getPlayerRelativePosition` and incorrect rendering of player areas.

2.  **Incorrect Up-Card Display ("North" Label Bug):**
    *   **Description:** A very specific and persistent UI bug where the designated up-card area in the center of the table (`#up-card`) displays a card back with the text "North" (rotated 180 degrees) superimposed on it. This occurs instead of the actual up-card face (e.g., "Ace of Hearts" as per server logs).
    *   **Symptoms Observed:** The element with `id="up-card"` shows content that seems to originate from or be styled like the `#north-area`'s player label or card elements.
    *   **Potential Causes:**
        *   **CSS Conflict/Specificity:** Overly broad CSS selectors targeting `.card` or `.player-label` within `#north-area` (which has `transform: rotate(180deg)`) might be unintentionally affecting the `#up-card` element, especially if `#up-card` also has the class `card`.
        *   **DOM Manipulation Error:** JavaScript code in `updateUI` or `renderCardDOM` might be incorrectly targeting or populating the `#up-card` element, possibly due to an ID collision (unlikely if IDs are unique as they appear to be) or a faulty logic path when specifically rendering the up-card.
        *   The logic in `updateUI` for rendering the up-card might be flawed, falling through to a default card back rendering, and then some other part of the UI update (perhaps player area rendering) incorrectly writes "North" into it or applies styles that cause this appearance.

3.  **Inconsistent Client State After "Start Game" Action:**
    *   **Description:** In some test scenarios, after one client clicks "Start Game," other clients might not transition correctly. For example, one client might show the "Start Game" button as "Starting...", while another client receives an error like "Game not in lobby phase."
    *   **Symptoms Observed:** Different clients display conflicting UI states immediately after the game start is attempted.
    *   **Potential Causes:**
        *   The `game_update` broadcast by the server that changes `gameState.gamePhase` from 'LOBBY' might not be reaching all clients simultaneously or is being processed with errors/delays on some clients.
        *   Client-side logic for managing the "Start Game" button's state (`disabled`, `textContent`) and its interaction with `lobby_update` vs. `game_update` might be inconsistent across clients or have race conditions.

4.  **Race Condition/State Management Between `lobby_update` and `game_update` (Proactively Addressed):**
    *   **Description:** A potential issue where a `lobby_update` message (intended for lobby UI) could arrive *after* a `game_update` has already advanced the `gamePhase` beyond 'LOBBY'. If the `lobby_update` handler unconditionally sets `gamePhase` back to 'LOBBY' or overwrites other critical game state, it could disrupt the game flow.
    *   **Status:** Recent changes in the `index.html` `socket.on('lobby_update', ...)` handler were made to mitigate this by making state updates conditional on `currentServerGameState.gamePhase === 'LOBBY'`. This is more of a bug prevention measure.

5.  **General Robustness of Client-Side State Synchronization:**
    *   **Description:** Ensuring that all clients maintain an accurate and synchronized view of the game state at all times, especially during rapid phase transitions or when modals for player actions are displayed/hidden.
    *   **Symptoms Observed:** The UI sometimes feels "stuck" or doesn't immediately reflect whose turn it is, what the valid actions are, or the results of an action.
    *   **Potential Causes:**
        *   Timing issues with hiding/showing modals relative to UI updates.
        *   The client needs to reliably clear previous state (e.g., old cards, old status messages) before rendering new state from `game_update`. The previous version of `updateUI` for up-card was refined to explicitly clear `innerHTML` and `className` for `elements.upCardEl`. This principle might need to be applied more broadly if stale elements persist.

## 4. Setup & Running

1.  **Prerequisites:**
    *   Node.js and npm installed.
2.  **Installation:**
    *   Clone the repository or download the files.
    *   Navigate to the project's root directory in your terminal.
    *   Run `npm install` to install the dependencies (`express`, `socket.io`).
3.  **Running the Server:**
    *   Run `node server.js` from the project's root directory.
    *   The server will typically start on `http://localhost:3000`.
4.  **Playing the Game:**
    *   Open a web browser and navigate to `http://localhost:3000`.
    *   Open four separate browser tabs or windows (or use different browsers/incognito mode) and navigate to the same address to simulate four players.
    *   Once four players are connected (as shown in the "Players" list in the lobby), one player can click the "Start Game" button.
    *   **Important Note on Static Files:** The `server.js` is configured to serve static files from a `public` subdirectory (`app.use(express.static(path.join(__dirname, 'public')));`). Ensure that `index.html` (and any other client-side assets like CSS or image files if added later) is located inside a folder named `public` at the root of the project.