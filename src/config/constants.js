/**
 * Euchre Game Constants and Configuration
 * @module config/constants
 * @description Contains all game-wide constants including card values, suits, game phases,
 * player roles, teams, and socket event names. These constants are used throughout the application
 * to maintain consistency and avoid magic strings/numbers.
 * @example
 * import { SUITS, VALUES, GAME_PHASES } from '@/config/constants';
 */

/**
 * Enumeration of card suits in Euchre
 * @readonly
 * @enum {string}
 * @property {string} HEARTS - Hearts suit (♥)
 * @property {string} DIAMONDS - Diamonds suit (♦)
 * @property {string} CLUBS - Clubs suit (♣)
 * @property {string} SPADES - Spades suit (♠)
 */
export const SUITS = {
  HEARTS: "hearts",
  DIAMONDS: "diamonds",
  CLUBS: "clubs",
  SPADES: "spades",
};

/**
 * Array of card values in ascending order of rank (9 is lowest, A is highest)
 * @readonly
 * @type {Array<'9'|'10'|'J'|'Q'|'K'|'A'>}
 * @example
 * const values = VALUES; // ['9', '10', 'J', 'Q', 'K', 'A']
 */
export const VALUES = ["9", "10", "J", "Q", "K", "A"];

/**
 * Debug logging levels for the application logger
 * @readonly
 * @enum {number}
 * @property {number} ERROR=0 - Critical errors (highest priority)
 * @property {number} INFO=1 - General information
 * @property {number} WARNING=2 - Potential issues
 * @property {number} VERBOSE=3 - Detailed debugging information (lowest priority)
 */
export const DEBUG_LEVELS = {
  ERROR: 0,
  INFO: 1,
  WARNING: 2,
  VERBOSE: 3,
};

/**
 * Local storage keys used for persisting game state and preferences
 * @readonly
 * @enum {string}
 * @property {string} GAME_STATE - Key for storing current game state
 * @property {string} OFFLINE_QUEUE - Key for storing actions while offline
 * @property {string} PLAYER_PREFERENCES - Key for storing player settings
 * @property {string} CONNECTION_STATE - Key for network connection status
 */
export const STORAGE_KEYS = {
  GAME_STATE: "euchre_game_state",
  OFFLINE_QUEUE: "euchre_offline_queue",
  PLAYER_PREFERENCES: "euchre_player_prefs",
  CONNECTION_STATE: "euchre_connection_state",
};

/**
 * Socket.IO event names for game communication
 * @readonly
 * @enum {string}
 * @property {string} STATE_UPDATE - Full game state update from server
 * @property {string} REQUEST_FULL_STATE - Client request for full state
 * @property {string} PLAY_CARD - Player plays a card
 * @property {string} ACTION_ORDER_UP_DECISION - Order up/pass decision
 * @property {string} ACTION_DEALER_DISCARD - Dealer discards a card
 * @property {string} ACTION_CALL_TRUMP_DECISION - Trump suit decision
 * @property {string} ACTION_GO_ALONE_DECISION - Going alone decision
 * @property {string} JOIN_GAME - Player joins a game
 * @property {string} ACTION_REJOIN_GAME - Player rejoins existing game
 * @property {string} ASSIGN_ROLE - Server assigns player role
 * @property {string} GAME_FULL - Game is full notification
 * @property {string} PLAYER_ALREADY_IN_GAME - Duplicate player attempt
 * @property {string} PLAYER_CONNECTED - Player connection notification
 * @property {string} PLAYER_DISCONNECTED - Player disconnection
 * @property {string} RECONNECT - Reconnection attempt
 * @property {string} GAME_STARTED - Game start notification
 * @property {string} ROUND_STARTED - New round notification
 * @property {string} TRICK_COMPLETED - Trick completion
 * @property {string} GAME_OVER - Game end notification
 * @property {string} ERROR - Generic error notification
 */
export const GAME_EVENTS = {
  // State synchronization
  STATE_UPDATE: "game_state_update", // Full game state update from server
  REQUEST_FULL_STATE: "request_full_state", // Client request for full state

  // Client to Server Actions
  PLAY_CARD: "play_card", // Player plays a card
  ACTION_ORDER_UP_DECISION: "action_order_up_decision", // Order up/pass decision
  ACTION_DEALER_DISCARD: "action_dealer_discard", // Dealer discards a card
  ACTION_CALL_TRUMP_DECISION: "action_call_trump_decision", // Trump suit decision
  ACTION_GO_ALONE_DECISION: "action_go_alone_decision", // Going alone decision
  JOIN_GAME: "join_game", // Player joins a game
  ACTION_REJOIN_GAME: "action_rejoin_game", // Player rejoins existing game

  // Server to Client Notifications
  ASSIGN_ROLE: "assign_role", // Server assigns player role
  GAME_FULL: "game_full", // Game is full notification
  PLAYER_ALREADY_IN_GAME: "player_already_in_game", // Duplicate player attempt

  // Connection events
  PLAYER_CONNECTED: "player_connected", // Player connection notification
  PLAYER_DISCONNECTED: "player_disconnected", // Player disconnection
  RECONNECT: "reconnect", // Reconnection attempt

  // Game flow events
  GAME_STARTED: "game_started", // Game start notification
  ROUND_STARTED: "round_started", // New round notification
  TRICK_COMPLETED: "trick_completed", // Trick completion
  GAME_OVER: "game_over", // Game end notification

  // Error handling
  ERROR: "generic_error", // Generic error notification
};

/**
 * Game phase states
 * @readonly
 * @enum {string}
 * @property {string} LOBBY - Players joining, before game starts
 * @property {string} DEALING - Cards being dealt
 * @property {string} ORDER_UP_ROUND1 - First round of trump selection
 * @property {string} ORDER_UP_ROUND2 - Second round of trump selection
 * @property {string} GOING_ALONE - Maker decides to go alone
 * @property {string} PLAYING - Active play phase
 * @property {string} SCORING - Scoring phase after hand
 * @property {string} GAME_OVER - Game completion
 */
export const GAME_PHASES = {
  LOBBY: "LOBBY", // Players joining, before game starts
  DEALING: "DEALING", // Cards being dealt
  ORDER_UP_ROUND1: "ORDER_UP_ROUND1", // First round of trump selection
  ORDER_UP_ROUND2: "ORDER_UP_ROUND2", // Second round of trump selection
  GOING_ALONE: "GOING_ALONE", // Maker decides to go alone
  PLAYING: "PLAYING", // Active play phase
  SCORING: "SCORING", // Scoring phase after hand
  GAME_OVER: "GAME_OVER", // Game completion
};

/**
 * Standard Euchre seating positions (North/South vs East/West)
 * @readonly
 * @type {Array<'south'|'west'|'north'|'east'>}
 * @example
 * // Team NS: PLAYER_ROLES[0] and PLAYER_ROLES[2] (south and north)
 * // Team EW: PLAYER_ROLES[1] and PLAYER_ROLES[3] (west and east)
 */
export const PLAYER_ROLES = ["south", "west", "north", "east"];

/**
 * Team identifiers
 * @readonly
 * @enum {string}
 * @property {string} TEAM_NS - North/South team
 * @property {string} TEAM_EW - East/West team
 */
export const TEAMS = {
  TEAM_NS: "NS",
  TEAM_EW: "EW",
};

/**
 * Card ranking values for Euchre
 * @readonly
 * @enum {number}
 * @description Numerical values representing card strength in Euchre.
 * Higher values indicate stronger cards. Special values for bowers (trump Jacks).
 * @property {number} RIGHT_BOWER=100 - Highest card - Jack of trump suit
 * @property {number} LEFT_BOWER=90 - Second highest - Jack of same color as trump
 * @property {number} ACE=80 - Standard high cards
 * @property {number} KING=70
 * @property {number} QUEEN=60
 * @property {number} JACK=50 - Non-bower Jack
 * @property {number} TEN=40
 * @property {number} NINE=30 - Lowest card
 */
export const CARD_RANKS = {
  RIGHT_BOWER: 100, // Highest card - Jack of trump suit
  LEFT_BOWER: 90, // Second highest - Jack of same color as trump
  ACE: 80, // Standard high cards
  KING: 70,
  QUEEN: 60,
  JACK: 50, // Non-bower Jack
  TEN: 40,
  NINE: 30, // Lowest card
};

/**
 * Winning score for a Euchre game
 * @readonly
 * @type {number}
 * @default 10
 */
export const WINNING_SCORE = 10;
