# Core Functional Requirements for a 4-Player Euchre Game (Node.js/Socket.IO)

This document outlines the theoretical core functional requirements for a basic, functioning 4-player multiplayer Euchre game implemented with a Node.js backend and Socket.IO for real-time communication.

**Legend for Gap Analysis:**
*   `[X]` - Strong evidence of full or near-full implementation.
*   `[P]` - Evidence of partial implementation; core logic likely present but full integration or UI/UX aspects might be incomplete.
*   `[ ]` - No clear evidence from file/directory structure or not enough information.

## I. Game Setup & Lobby

1.  **Player Connection & Identification:**
    *   `[X]` Users can connect to the server. (Implied by `src/socket/index.js`, `gameHandlers.js`)
    *   `[X]` Server assigns a unique ID to each connected socket. (Standard Socket.IO behavior)
    *   `[P]` Basic player naming or anonymous identification. (`src/utils/players.js` exists; auth middleware suggests more than anonymous)
2.  **Lobby Formation (4 Players):**
    *   `[P]` Players can join a game lobby. (`GAME_PHASES.LOBBY` in `src/config/constants.js`; `multiGame.integration.test.js` suggests lobby logic)
    *   `[P]` Lobby waits until 4 players are present. (Logical prerequisite for game start)
    *   `[X]` Assignment of players to fixed positions/roles (e.g., North, South, East, West). (`PLAYER_ROLES` in constants, player utilities)
    *   `[X]` Formation of two teams (e.g., North/South vs. East/West). (`TEAMS` in constants)
3.  **Game Start:**
    *   `[P]` Game automatically starts when lobby is full. (`src/game/phases/startNewHand.js`, `GAME_STARTED` event in constants)
    *   `[X]` Initialization of game score (0-0). (Covered by state management and scoring logic)

## II. Dealing Phase

1.  **Dealer Selection:**
    *   `[P]` Initial dealer selected (e.g., randomly or fixed). (Game state would need a dealer)
    *   `[P]` Dealer rotates clockwise each hand. (Player utilities like `getNextPlayer` suggest this logic)
2.  **Dealing Cards:**
    *   `[X]` Standard 24-card Euchre deck (9, 10, J, Q, K, A of 4 suits). (`src/utils/deck.js`, constants)
    *   `[X]` Each of the 4 players receives 5 cards, dealt in batches (e.g., 3-2 or 2-3). (`dealCards.unit.test.js`)
    *   `[P]` Remaining 4 cards form the "kitty". (Implicit in 24 cards, 5 per player)
3.  **Revealing Up-Card:**
    *   `[X]` Top card of the kitty is turned face up (the "up-card"). (`orderUpPhase.js`, `test/phases/orderUp.unit.test.js`)

## III. Trump Selection Phase

1.  **Ordering Up - Round 1 (Suit of Up-Card):**
    *   `[X]` Starting with player to dealer's left, each player can "order up" the dealer or "pass". (`src/game/phases/orderUpPhase.js`, tests)
    *   `[X]` If a player orders up:
        *   `[X]` The suit of the up-card becomes trump.
        *   `[X]` The dealer must pick up the up-card and discard one card from their hand face down. (`dealerDiscard.unit.test.js`)
        *   `[X]` The team that ordered up (or whose partner ordered up) becomes the "makers".
        *   `[X]` Phase ends.
    *   `[X]` If all four players pass, Round 2 begins.
2.  **Calling/Making - Round 2 (Any Other Suit):**
    *   `[X]` Up-card is turned face down.
    *   `[X]` Starting with player to dealer's left, each player can "call" or "make" a trump suit (any suit *other* than the suit of the original up-card) or "pass". (`src/game/phases/bidding.js` might cover this, or `orderUpPhase.js` handles both rounds)
    *   `[X]` If a player calls a suit:
        *   `[X]` That suit becomes trump.
        *   `[X]` The team that called trump becomes the "makers".
        *   `[X]` Phase ends.
    *   `[P]` If all four players pass again: (`startNewHand.edge.unit.test.js` might cover misdeal/redeal logic)
        *   `[P]` It's a "misdeal" or "stick the dealer". Basic implementation likely means redeal.
        *   `[P]` (For redeal: cards are collected, re-shuffled, re-dealt).
3.  **"Going Alone" Option:**
    *   `[X]` After trump is decided, the player who made trump (or whose partner made trump, allowing the partner to decide) has the option to "go alone". (`src/game/phases/goAlonePhase.js`, `test/phases/goAlone.unit.test.js`)
    *   `[X]` If going alone, their partner sits out for that hand.

## IV. Trick Playing Phase

1.  **Leading Card:**
    *   `[X]` Player to the dealer's left leads the first trick (unless a player went alone, then player to *their* left leads or as per specific rules). (`src/game/phases/playPhase.js` or `playing.js`, player utilities)
    *   `[X]` Winner of each trick leads the next trick.
2.  **Following Suit:**
    *   `[X]` Players must follow the suit of the card led if they have a card of that suit. (`src/game/logic/validation.js`, `cardPlayValidation.unit.test.js`)
    *   `[X]` If a player has no cards of the suit led, they can play any card (trump or off-suit).
3.  **Playing Trump:**
    *   `[X]` Trump cards are the highest value (Bowers, then A, K, Q, J, 10, 9 of trump suit). (`CARD_RANKS` in constants, game logic)
    *   `[X]` Special rules for "left bower" (Jack of the same color as trump suit, counts as trump).
4.  **Winning a Trick:**
    *   `[X]` Highest trump card played wins the trick. (`playPhase.js` or `playing.js`)
    *   `[X]` If no trump is played, the highest card of the suit led wins the trick.
    *   `[X]` Player who won the trick collects the cards (conceptually) and leads the next trick.
5.  **Hand Completion:**
    *   `[X]` Phase continues until all 5 tricks are played. (`TRICK_COMPLETED` event in constants)

## V. Scoring Phase

1.  **Counting Tricks Won:**
    *   `[X]` Each team counts the number of tricks they won. (`src/game/phases/scoring.js`, `test/phases/scoring.unit.test.js`)
2.  **Awarding Points (Makers vs. Defenders):**
    *   `[X]` **Makers win 3 or 4 tricks:** 1 point.
    *   `[X]` **Makers win all 5 tricks (march):** 2 points.
    *   `[P]` **Makers go alone and win 3 or 4 tricks:** 1 point (standard, some rules 2). Basic: 1 point. (Scoring logic for "go alone" needs specific confirmation but likely covered by `goAlonePhase.js` and `scoring.js` interaction)
    *   `[P]` **Makers go alone and win all 5 tricks:** 4 points.
    *   `[X]` **Defenders "euchre" the makers (makers win < 3 tricks):** Defenders get 2 points.
    *   `[P]` **Defenders "euchre" makers who went alone:** Defenders get 2 points (standard, some rules 4). Basic: 2 points.
3.  **Updating Game Score:**
    *   `[X]` Add points to the respective team's game score. (State management)

## VI. Game Progression & End

1.  **Checking for Game Win:**
    *   `[X]` After scoring a hand, check if either team has reached the winning score (e.g., 10 points). (`WINNING_SCORE` in constants, `src/game/phases/endGame.js`)
2.  **Starting New Hand:**
    *   `[X]` If no winner, dealer rotates, new hand begins (back to Dealing Phase). (`src/game/phases/startNewHand.js`)
3.  **Game Over:**
    *   `[X]` When a team reaches the winning score, they are declared the winner. (`GAME_OVER` event, `endGame.js`)
    *   `[P]` Option to start a new game or return to lobby. (Likely handled by client-side UI and server game setup logic)

## VII. Server-Side Logic & State Management

1.  **Game State Object:**
    *   `[X]` Comprehensive server-side object holding all current game information. (`src/game/state.js`, `stateManager.js`)
2.  **Rule Enforcement:**
    *   `[X]` Server validates all player actions against game rules and current state. (`src/game/logic/validation.js`, `src/utils/validation.js`, various validation tests)
    *   `[X]` Prevents illegal moves.
3.  **Turn Management:**
    *   `[X]` Server controls whose turn it is to act. (Game state includes `currentPlayer`)
4.  **Persistence (Basic/Optional for "Basic Functioning"):**
    *   `[X]` (Optional) Ability to save/load game state. (`src/db/gameRepository.js`, persistence tests. This is implemented beyond basic.)

## VIII. Client-Server Communication (Socket.IO)

1.  **Broadcasting Game State:**
    *   `[X]` Server emits game state updates to all players. (`src/socket/index.js`, `stateSyncService.js`, `STATE_UPDATE` event)
    *   `[P]` May include full state or deltas. (Implementation detail, but sync service exists)
2.  **Emitting Specific Events:**
    *   `[X]` Server emits events for specific game occurrences. (Constant `GAME_EVENTS` suggests this)
3.  **Receiving Player Actions:**
    *   `[X]` Server listens for client events representing player decisions. (`src/socket/handlers/gameHandlers.js`)
4.  **Error Handling:**
    *   `[X]` Server informs clients of invalid actions. (`errorHandler.js` middleware, validation utilities)
5.  **Disconnection/Reconnection (Basic):**
    *   `[X]` Server detects player disconnections. (`reconnectionHandler.js`, `PLAYER_DISCONNECTED` event)
    *   `[P]` (Basic) Game might pause or end if a player disconnects. More advanced: allow reconnection and state restoration. (`reconnection.integration.test.js` suggests advanced handling)

## IX. Client-Side Responsibilities (Conceptual)

1.  **Displaying Game State:**
    *   `[P]` Render cards, scores, current player, trump suit, etc. (`src/client/components` like `Card`, `GameBoard`, `PlayerHand` suggest this is substantially implemented)
2.  **Handling Player Input:**
    *   `[P]` Allow players to click cards to play, buttons for decisions. (UI components imply this)
3.  **Communicating with Server:**
    *   `[X]` Send player actions to the server via Socket.IO. (`src/client/services/socketService.js`)
    *   `[X]` Receive and process game state updates and events from the server. (`stateSyncService.js`)
