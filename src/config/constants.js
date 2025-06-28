/**
 * Euchre Game Constants and Configuration
 * @module constants
 * @description Contains all game-wide constants including card values, suits, game phases,
 * player roles, teams, and socket event names. These constants are used throughout the application
 * to maintain consistency and avoid magic strings/numbers.
 */

/**
 * Enumeration of card suits in Euchre
 * @enum {string}
 */
export const SUITS = {
  HEARTS: 'hearts',
  DIAMONDS: 'diamonds',
  CLUBS: 'clubs',
  SPADES: 'spades',
};

/**
 * Array of card values in ascending order of rank (9 is lowest, A is highest)
 * @type {string[]}
 */
export const VALUES = ['9', '10', 'J', 'Q', 'K', 'A'];

/**
 * Debug logging levels for the application logger
 * @enum {number}
 * @property {number} ERROR - Critical errors (highest priority)
 * @property {number} INFO - General information
 * @property {number} WARNING - Potential issues
 * @property {number} VERBOSE - Detailed debugging information
 */
export const DEBUG_LEVELS = {
    ERROR: 0,
    INFO: 1,
    WARNING: 2,
    VERBOSE: 3,
};

/**
 * Local storage keys used for persisting game state and preferences
 * @enum {string}
 */
export const STORAGE_KEYS = {
    GAME_STATE: 'euchre_game_state',       // Stores the current game state
    OFFLINE_QUEUE: 'euchre_offline_queue', // Stores actions while offline
    PLAYER_PREFERENCES: 'euchre_player_prefs', // Player settings
    CONNECTION_STATE: 'euchre_connection_state' // Network connection status
};

/**
 * Socket.IO event names for game communication
 * @enum {string}
 */
export const GAME_EVENTS = {
    // State synchronization
    STATE_UPDATE: 'game_state_update',       // Full game state update from server
    REQUEST_FULL_STATE: 'request_full_state', // Client request for full state

    // Client to Server Actions
    PLAY_CARD: 'play_card',                  // Player plays a card
    ACTION_ORDER_UP_DECISION: 'action_order_up_decision', // Order up/pass decision
    ACTION_DEALER_DISCARD: 'action_dealer_discard', // Dealer discards a card
    ACTION_CALL_TRUMP_DECISION: 'action_call_trump_decision', // Trump suit decision
    ACTION_GO_ALONE_DECISION: 'action_go_alone_decision', // Going alone decision
    JOIN_GAME: 'join_game',                  // Player joins a game
    ACTION_REJOIN_GAME: 'action_rejoin_game', // Player rejoins existing game

    // Server to Client Notifications
    ASSIGN_ROLE: 'assign_role',              // Server assigns player role
    GAME_FULL: 'game_full',                  // Game is full notification
    PLAYER_ALREADY_IN_GAME: 'player_already_in_game', // Duplicate player attempt

    // Connection events
    PLAYER_CONNECTED: 'player_connected',    // Player connection notification
    PLAYER_DISCONNECTED: 'player_disconnected', // Player disconnection
    RECONNECT: 'reconnect',                  // Reconnection attempt

    // Game flow events
    GAME_STARTED: 'game_started',            // Game start notification
    ROUND_STARTED: 'round_started',          // New round notification
    TRICK_COMPLETED: 'trick_completed',      // Trick completion
    GAME_OVER: 'game_over',                  // Game end notification

    // Error handling
    ERROR: 'generic_error'                   // Generic error notification
};

/**
 * Game phase states
 * @enum {string}
 * @description Represents the different phases of a Euchre game
 */
export const GAME_PHASES = {
    LOBBY: 'LOBBY',          // Players joining, before game starts
    DEALING: 'DEALING',      // Cards being dealt
    ORDER_UP_ROUND1: 'ORDER_UP_ROUND1', // First round of trump selection
    ORDER_UP_ROUND2: 'ORDER_UP_ROUND2', // Second round of trump selection
    GOING_ALONE: 'GOING_ALONE', // Maker decides to go alone
    PLAYING: 'PLAYING',      // Active play phase
    SCORING: 'SCORING',      // Scoring phase after hand
    GAME_OVER: 'GAME_OVER'   // Game completion
};

/**
 * Player seating positions
 * @type {string[]}
 * @description Standard Euchre seating positions (North/South vs East/West)
 */
export const PLAYER_ROLES = ['south', 'west', 'north', 'east']; // NS are index 0, 2; EW are index 1, 3

/**
 * Team identifiers
 * @enum {string}
 */
export const TEAMS = {
    TEAM_NS: 'NS', // North/South team
    TEAM_EW: 'EW'  // East/West team
};

/**
 * Card ranking values for Euchre
 * @enum {number}
 * @description Numerical values representing card strength in Euchre.
 * Higher values indicate stronger cards. Special values for bowers (trump Jacks).
 */
export const CARD_RANKS = {
    RIGHT_BOWER: 100, // Highest card - Jack of trump suit
    LEFT_BOWER: 90,   // Second highest - Jack of same color as trump
    ACE: 80,          // Standard high cards
    KING: 70,
    QUEEN: 60,
    JACK: 50,         // Non-bower Jack
    TEN: 40,
    NINE: 30          // Lowest card
};

/**
 * Winning score for a Euchre game
 * @type {number}
 * @constant
 */
export const WINNING_SCORE = 10;
