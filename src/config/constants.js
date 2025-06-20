
/**
 * Euchre Game Constants and Configuration
 * @module constants
 */

/**
 * @constant {object} SUITS
 * @description Defines the four suits in a standard deck of cards.
 * @property {string} HEARTS - The hearts suit.
 * @property {string} DIAMONDS - The diamonds suit.
 * @property {string} CLUBS - The clubs suit.
 * @property {string} SPADES - The spades suit.
 */
export const SUITS = {
  HEARTS: 'hearts',
  DIAMONDS: 'diamonds',
  CLUBS: 'clubs',
  SPADES: 'spades',
};

/**
 * @constant {Array<string>} VALUES
 * @description Standard card ranks in Euchre.
 */
export const VALUES = ['9', '10', 'J', 'Q', 'K', 'A'];

/**
 * @constant {object} DEBUG_LEVELS
 * @description Defines different levels for debugging logs.
 * @property {number} ERROR - Error messages.
 * @property {number} INFO - Informational messages.
 * @property {number} WARNING - Warning messages.
 * @property {number} VERBOSE - Verbose debugging messages.
 */
export const DEBUG_LEVELS = {
    ERROR: 0,
    INFO: 1,
    WARNING: 2,
    VERBOSE: 3,
};

/**
 * @constant {object} STORAGE_KEYS
 * @description Keys used for storing game-related data in localStorage.
 * @property {string} GAME_STATE - Key for storing the current game state.
 * @property {string} OFFLINE_QUEUE - Key for storing actions queued while offline.
 * @property {string} PLAYER_PREFERENCES - Key for storing user-specific preferences.
 * @property {string} CONNECTION_STATE - Key for storing the last known connection state.
 */
// Storage keys for local persistence
export const STORAGE_KEYS = {
    GAME_STATE: 'euchre_game_state',
    OFFLINE_QUEUE: 'euchre_offline_queue',
    PLAYER_PREFERENCES: 'euchre_player_prefs',
    CONNECTION_STATE: 'euchre_connection_state'
};

/**
 * @constant {object} GAME_EVENTS
 * @description Defines the types of events used for WebSocket communication between client and server.
 * Each property represents a distinct game event.
 */
// Game events for WebSocket communication
export const GAME_EVENTS = {
    // State synchronization
    STATE_UPDATE: 'game_state_update', // Server to client: full game state update
    REQUEST_FULL_STATE: 'request_full_state', // Client to server: request for full state

    // Client to Server Actions (specific)
    PLAY_CARD: 'play_card', // Player plays a card
    ACTION_ORDER_UP_DECISION: 'action_order_up_decision', // Player orders up or passes
    ACTION_DEALER_DISCARD: 'action_dealer_discard', // Dealer discards a card
    ACTION_CALL_TRUMP_DECISION: 'action_call_trump_decision', // Player calls trump or passes
    ACTION_GO_ALONE_DECISION: 'action_go_alone_decision', // Maker decides to go alone
    JOIN_GAME: 'join_game', // Player attempts to join a game
    ACTION_REJOIN_GAME: 'action_rejoin_game', // Player confirms rejoining a game

    // Server to Client Notifications (specific)
    ASSIGN_ROLE: 'assign_role', // Server assigns role, gameId, etc. to player
    GAME_FULL: 'game_full', // Server indicates game is full
    PLAYER_ALREADY_IN_GAME: 'player_already_in_game', // Server indicates player is already in a game
    // PLAYER_ACTION: 'player_action', // Too generic, replaced by specific actions
    // MAKE_BID: 'make_bid', // Too generic, replaced by specific actions
    // GO_ALONE: 'go_alone', // Too generic, replaced by specific actions

    // Connection events (may be initiated by client or server)
    PLAYER_CONNECTED: 'player_connected', // General notification: a player connected
    PLAYER_DISCONNECTED: 'player_disconnected', // General notification: a player disconnected
    RECONNECT: 'reconnect', // Client attempts to reconnect

    // Game flow events (mostly server to client)
    GAME_STARTED: 'game_started', // Game has officially started
    ROUND_STARTED: 'round_started', // A new round has started
    TRICK_COMPLETED: 'trick_completed', // A trick has finished
    GAME_OVER: 'game_over', // The game has ended

    // Generic error event
    ERROR: 'generic_error' // Server to client: a generic error occurred
};

/**
 * @constant {object} GAME_PHASES
 * @description Defines the different phases a Euchre game can be in.
 * @property {string} LOBBY - Players are in the lobby, game not yet started.
 * @property {string} DEALING - Cards are being dealt.
 * @property {string} ORDER_UP_ROUND1 - First round of bidding to order up the dealer.
 * @property {string} ORDER_UP_ROUND2 - Second round of bidding to call trump.
 * @property {string} GOING_ALONE - Maker decides if they are playing alone.
 * @property {string} PLAYING - Main phase where cards are played.
 * @property {string} SCORING - Scores are being calculated and displayed.
 * @property {string} GAME_OVER - The game has ended.
 */
export const GAME_PHASES = {
    LOBBY: 'LOBBY',
    DEALING: 'DEALING',
    ORDER_UP_ROUND1: 'ORDER_UP_ROUND1',
    ORDER_UP_ROUND2: 'ORDER_UP_ROUND2',
    GOING_ALONE: 'GOING_ALONE',
    PLAYING: 'PLAYING',
    SCORING: 'SCORING',
    GAME_OVER: 'GAME_OVER'
};

/**
 * @constant {Array<string>} PLAYER_ROLES
 * @description Defines the possible roles/positions for players in a 4-player game.
 * Indices 0 and 2 (South, North) form one team, and 1 and 3 (West, East) form the other.
 */
export const PLAYER_ROLES = ['south', 'west', 'north', 'east']; // NS are index 0, 2; EW are index 1, 3

/**
 * @constant {object} TEAMS
 * @description Defines team identifiers.
 * @property {string} TEAM_NS - Identifier for the North/South team.
 * @property {string} TEAM_EW - Identifier for the East/West team.
 */
export const TEAMS = {
    TEAM_NS: 'NS', // North/South team
    TEAM_EW: 'EW'  // East/West team
};

/**
 * @constant {object} CARD_RANKS
 * @description Numerical representation of card ranks, primarily for sorting and comparison,
 * especially when trump is involved. Higher numbers indicate stronger cards.
 * These values are conceptual and might be used in combination with suit information.
 * @property {number} RIGHT_BOWER - Value for the Right Bower (Jack of trump).
 * @property {number} LEFT_BOWER - Value for the Left Bower (other Jack of same color as trump).
 * @property {number} ACE - Value for an Ace (trump or non-trump).
 * @property {number} KING - Value for a King (trump or non-trump).
 * @property {number} QUEEN - Value for a Queen (trump or non-trump).
 * @property {number} JACK - Value for a Jack (non-bower trump or non-trump).
 * @property {number} TEN - Value for a Ten (trump or non-trump).
 * @property {number} NINE - Value for a Nine (trump or non-trump).
 */
export const CARD_RANKS = {
    RIGHT_BOWER: 100,
    LEFT_BOWER: 90,
    ACE: 80,
    KING: 70,
    QUEEN: 60,
    JACK: 50,
    TEN: 40,
    NINE: 30
};

/**
 * @constant {number} WINNING_SCORE
 * @description The score required for a team to win the game.
 */
// Game configuration
export const WINNING_SCORE = 10;
