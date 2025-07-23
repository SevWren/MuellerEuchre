/**
 * Euchre Game Constants and Configuration
 * @module config/constants
 * @description Contains all game-wide constants including card values, suits, game phases,
 * player roles, teams, and socket event names. These constants are used throughout the application
 * to maintain consistency and avoid magic strings/numbers.
 *
 * All constants use a prefix pattern (e.g., CARD_, GAME_, PLAYER_) to ensure uniqueness
 * and prevent naming conflicts across the application.
 *
 * @example
 * import { CARD_SUITS, CARD_VALUES, GAME_PHASES } from '@/config/constants';
 */

/**
 * Enumeration of card suits in Euchre.
 * @readonly
 * @enum {string}
 * @property {string} CARD_SUIT_HEARTS - Hearts suit (♥)
 * @property {string} CARD_SUIT_DIAMONDS - Diamonds suit (♦)
 * @property {string} CARD_SUIT_CLUBS - Clubs suit (♣)
 * @property {string} CARD_SUIT_SPADES - Spades suit (♠)
 */
export const CARD_SUITS = Object.freeze({
  // Original exports for backward compatibility
  HEARTS: 'CARD_SUIT_HEARTS',
  DIAMONDS: 'CARD_SUIT_DIAMONDS',
  CLUBS: 'CARD_SUIT_CLUBS',
  SPADES: 'CARD_SUIT_SPADES',

  // New prefixed versions (preferred)
  CARD_SUIT_HEARTS: 'CARD_SUIT_HEARTS',
  CARD_SUIT_DIAMONDS: 'CARD_SUIT_DIAMONDS',
  CARD_SUIT_CLUBS: 'CARD_SUIT_CLUBS',
  CARD_SUIT_SPADES: 'CARD_SUIT_SPADES'
});

// Maintain original export for backward compatibility
export const SUITS = CARD_SUITS;

/**
 * Array of card values in ascending order of rank (9 is lowest, A is highest).
 * @readonly
 * @type {ReadonlyArray<'9'|'10'|'J'|'Q'|'K'|'A'>}
 * @example
 * const values = CARD_VALUES; // ['9', '10', 'J', 'Q', 'K', 'A']
 */
export const CARD_VALUES = ["9", "10", "J", "Q", "K", "A"];

// Maintain original export for backward compatibility
// Note: CARD_VALUES is an array, so we don't freeze it
export const VALUES = CARD_VALUES;

/**
 * Card ranking values for Euchre.
 * @description Numerical values representing card strength. Higher values indicate stronger cards.
 * Special values are used for bowers (trump Jacks). These are used by `getCardRank()` for
 * consistent card comparison.
 * @readonly
 * @enum {number}
 * @property {number} CARD_RANK_RIGHT_BOWER - Rank for the Jack of the trump suit (highest card).
 * @property {number} CARD_RANK_LEFT_BOWER - Rank for the Jack of the same color as trump (second highest).
 * @property {number} CARD_RANK_ACE - Rank for a standard Ace.
 * @property {number} CARD_RANK_KING - Rank for a standard King.
 * @property {number} CARD_RANK_QUEEN - Rank for a standard Queen.
 * @property {number} CARD_RANK_JACK - Rank for a non-bower, non-trump Jack.
 * @property {number} CARD_RANK_TEN - Rank for a standard 10.
 * @property {number} CARD_RANK_NINE - Rank for a standard 9 (lowest card).
 * @property {number} TRUMP_OFFSET - Value added to a card's base rank when it is trump.
 * @property {number} LED_OFFSET - Value added to a card's base rank when it matches the led suit (and is not trump).
 * @property {number} INVALID - Rank for an invalid or unrankable card.
 */
export const CARD_RANKS = Object.freeze({
  // (Do Not Change) Original special rank value exports for backward compatibility
  // (Do Not Change) The intrinsic value of a card, independent of suit context.
  RIGHT_BOWER: 150,
  LEFT_BOWER: 100,
  ACE: 14,
  KING: 13,
  QUEEN: 12,
  JACK: 11,
  TEN: 10,
  NINE: 9,

  // New prefixed versions (preferred)
  CARD_RANK_RIGHT_BOWER: 150, // Jack of trump suit (highest card)
  CARD_RANK_LEFT_BOWER: 100,  // Jack of same color as trump (second highest)
  CARD_RANK_ACE: 14,          // Standard high card
  CARD_RANK_KING: 13,
  CARD_RANK_QUEEN: 12,
  CARD_RANK_JACK: 11,         // Non-bower Non-Trump Jack
  CARD_RANK_TEN: 10,
  CARD_RANK_NINE: 9,          // Lowest standard card

  // Card rank offsets
  TRUMP_OFFSET: 100,  // Added to base rank for trump cards
  LED_OFFSET: 50,     // Added to base rank for led suit cards (non-trump)

  // Invalid card rank
  INVALID: 0
});

/**
 * Player bid decisions during the bidding phases.
 * @readonly
 * @enum {string}
 * @property {string} BID_DECISION_ORDER_UP - Player orders the dealer to pick up the turn card.
 * @property {string} BID_DECISION_PASS - Player passes their turn to bid.
 * @property {string} BID_DECISION_CALL_TRUMP - Player calls a suit for trump in the second round.
 */
export const BID_DECISIONS = Object.freeze({
  // Original values for backward compatibility
  ORDER_UP: 'orderUp',
  PASS: 'pass',
  CALL_TRUMP: 'callTrump',

  // New prefixed versions (preferred)
  BID_DECISION_ORDER_UP: 'orderUp',
  BID_DECISION_PASS: 'pass',
  BID_DECISION_CALL_TRUMP: 'callTrump',
});

/**
 * Logging levels for the application.
 * @readonly
 * @enum {string}
 * @property {string} LOG_LEVEL_ERROR - Critical errors that cause the app to fail.
 * @property {string} LOG_LEVEL_WARN - Non-critical issues that should be addressed.
 * @property {string} LOG_LEVEL_INFO - General information about application flow.
 * @property {string} LOG_LEVEL_DEBUG - Detailed debugging information.
 * @property {string} LOG_LEVEL_TRACE - Very detailed logging for specific debugging.
 */
export const LOG_LEVELS = Object.freeze({
  // Original exports for backward compatibility
  ERROR: 'LOG_LEVEL_ERROR',
  WARN: 'LOG_LEVEL_WARN',
  INFO: 'LOG_LEVEL_INFO',
  DEBUG: 'LOG_LEVEL_DEBUG',
  TRACE: 'LOG_LEVEL_TRACE',
  NONE: 'LOG_LEVEL_SILENT',

  // New prefixed versions (preferred)
  LOG_LEVEL_ERROR: 'LOG_LEVEL_ERROR', // Critical errors that cause the app to fail
  LOG_LEVEL_WARN: 'LOG_LEVEL_WARN',   // Non-critical issues that should be addressed
  LOG_LEVEL_INFO: 'LOG_LEVEL_INFO',   // General information about application flow
  LOG_LEVEL_DEBUG: 'LOG_LEVEL_DEBUG', // Detailed debugging information
  LOG_LEVEL_TRACE: 'LOG_LEVEL_TRACE', // Very detailed logging for specific debugging
  LOG_LEVEL_SILENT: 'LOG_LEVEL_SILENT' // No logging at all
});

// Maintain original export for backward compatibility
export const DEBUG_LEVELS = LOG_LEVELS;

/**
 * Local storage keys for persisting game state.
 * @readonly
 * @enum {string}
 * @property {string} STORAGE_KEY_GAME_STATE - Key for the current game state.
 * @property {string} STORAGE_KEY_PLAYER_ID - Key for the local player ID.
 * @property {string} STORAGE_KEY_PLAYER_NAME - Key for the player's chosen name.
 * @property {string} STORAGE_KEY_GAME_SETTINGS - Key for game settings/preferences.
 */
export const STORAGE_KEYS = Object.freeze({
  // Original exports for backward compatibility
  GAME_STATE: 'STORAGE_KEY_GAME_STATE',
  PLAYER_ID: 'STORAGE_KEY_PLAYER_ID',
  PLAYER_NAME: 'STORAGE_KEY_PLAYER_NAME',
  GAME_SETTINGS: 'STORAGE_KEY_GAME_SETTINGS',

  // New prefixed versions (preferred)
  STORAGE_KEY_GAME_STATE: 'STORAGE_KEY_GAME_STATE',    // Current game state
  STORAGE_KEY_PLAYER_ID: 'STORAGE_KEY_PLAYER_ID',      // Local player ID
  STORAGE_KEY_PLAYER_NAME: 'STORAGE_KEY_PLAYER_NAME',  // Player's chosen name
  STORAGE_KEY_GAME_SETTINGS: 'STORAGE_KEY_GAME_SETTINGS' // Game settings/preferences
});

/**
 * Socket.io event names used for game communication.
 * @readonly
 * @enum {string}
 * @property {string} GAME_EVENT_STATE_UPDATE - Server sends a full game state update to clients.
 * @property {string} GAME_EVENT_REQUEST_STATE - Client requests a full game state from the server.
 * @property {string} GAME_EVENT_PLAYER_ACTION - A generic player action (bid, play card, etc.).
 * @property {string} GAME_EVENT_PLAYER_JOIN - A new player joins the game.
 * @property {string} GAME_EVENT_PLAYER_LEAVE - A player leaves the game.
 * @property {string} GAME_EVENT_GAME_OVER - The game has ended.
 * @property {string} ACTION_ORDER_UP_DECISION - Client sends their order up/pass decision.
 * @property {string} ACTION_DEALER_DISCARD - Client (dealer) sends their discard decision.
 * @property {string} ACTION_CALL_TRUMP_DECISION - Client sends their call trump/pass decision.
 * @property {string} JOIN_GAME - Client requests to join a game.
 * @property {string} ACTION_REJOIN_GAME - Client requests to rejoin a game after disconnecting.
 * @property {string} ASSIGN_ROLE - Server assigns a role (e.g., PLAYER_SOUTH) to a client.
 * @property {string} PLAYER_DISCONNECTED - Server notifies clients that a player has disconnected.
 */
export const GAME_EVENTS = Object.freeze({
  // Original exports for backward compatibility
  STATE_UPDATE: 'GAME_EVENT_STATE_UPDATE',
  REQUEST_FULL_STATE: 'GAME_EVENT_REQUEST_STATE',
  PLAY_CARD: "play_card",
  ACTION_ORDER_UP_DECISION: "action_order_up_decision",
  ACTION_DEALER_DISCARD: "action_dealer_discard",
  ACTION_CALL_TRUMP_DECISION: "action_call_trump_decision",
  JOIN_GAME: "join_game",
  ACTION_REJOIN_GAME: "action_rejoin_game",
  ASSIGN_ROLE: "assign_role",
  GAME_FULL: "game_full",
  PLAYER_ALREADY_IN_GAME: "player_already_in_game",
  PLAYER_CONNECTED: "player_connected",
  PLAYER_DISCONNECTED: "player_disconnected",
  RECONNECT: "reconnect",
  GAME_STARTED: "game_started",
  ROUND_STARTED: "round_started",
  TRICK_COMPLETED: "trick_completed",
  GAME_OVER: "game_over",
  ERROR: "generic_error",

  // New prefixed versions (preferred)
  GAME_EVENT_STATE_UPDATE: 'GAME_EVENT_STATE_UPDATE', // Full game state update from server
  GAME_EVENT_REQUEST_STATE: 'GAME_EVENT_REQUEST_STATE', // Client request for full state
  GAME_EVENT_PLAYER_ACTION: 'GAME_EVENT_PLAYER_ACTION', // Player action (bid, play card, etc.)
  GAME_EVENT_CHAT_MESSAGE: 'GAME_EVENT_CHAT_MESSAGE', // In-game chat message
  GAME_EVENT_PLAYER_JOIN: 'GAME_EVENT_PLAYER_JOIN', // New player joins the game
  GAME_EVENT_PLAYER_LEAVE: 'GAME_EVENT_PLAYER_LEAVE', // Player leaves the game
  GAME_EVENT_GAME_OVER: 'GAME_EVENT_GAME_OVER' // Game has ended
});

/**
 * Game phase states.
 * @readonly
 * @enum {string}
 * @property {string} GAME_PHASE_LOBBY - Initial phase where players join before the game starts.
 * @property {string} GAME_PHASE_DEALING - Phase where cards are being dealt to players.
 * @property {string} GAME_PHASE_ORDER_UP_ROUND1 - First bidding round for selecting trump.
 * @property {string} GAME_PHASE_ORDER_UP_ROUND2 - Second bidding round if first round passes.
 * @property {string} GAME_PHASE_GOING_ALONE_DECISION - Phase where maker decides to play alone.
 * @property {string} GAME_PHASE_PLAYING - Main gameplay phase where tricks are played.
 * @property {string} GAME_PHASE_SCORING - Phase where hand results are calculated.
 * @property {string} GAME_PHASE_GAME_OVER - Final phase when game ends.
 */
export const GAME_PHASES = Object.freeze({
  // Original exports for backward compatibility
  LOBBY: 'GAME_PHASE_LOBBY',
  DEALING: 'GAME_PHASE_DEALING',
  ORDER_UP_ROUND1: 'GAME_PHASE_ORDER_UP_ROUND1',
  ORDER_UP_ROUND2: 'GAME_PHASE_ORDER_UP_ROUND2',
  GOING_ALONE_DECISION: 'GAME_PHASE_GOING_ALONE_DECISION',
  PLAYING: 'GAME_PHASE_PLAYING',
  SCORING: 'GAME_PHASE_SCORING',
  GAME_OVER: 'GAME_PHASE_GAME_OVER',

  // New prefixed versions (preferred)
  GAME_PHASE_LOBBY: 'GAME_PHASE_LOBBY', // Initial phase where players join before the game starts
  GAME_PHASE_DEALING: 'GAME_PHASE_DEALING', // Phase where cards are being dealt to players
  GAME_PHASE_ORDER_UP_ROUND1: 'GAME_PHASE_ORDER_UP_ROUND1', // First bidding round for selecting trump
  GAME_PHASE_ORDER_UP_ROUND2: 'GAME_PHASE_ORDER_UP_ROUND2', // Second bidding round if first round passes
  GAME_PHASE_GOING_ALONE_DECISION: 'GAME_PHASE_GOING_ALONE_DECISION', // Phase where maker decides to play alone
  GAME_PHASE_PLAYING: 'GAME_PHASE_PLAYING', // Main gameplay phase where tricks are played
  GAME_PHASE_SCORING: 'GAME_PHASE_SCORING', // Phase where hand results are calculated
  GAME_PHASE_GAME_OVER: 'GAME_PHASE_GAME_OVER' // Final phase when game ends
});

/**
 * Standard Euchre seating positions (North/South vs East/West).
 * @readonly
 * @type {ReadonlyArray<'PLAYER_SOUTH'|'PLAYER_WEST'|'PLAYER_NORTH'|'PLAYER_EAST'>}
 * @example
 * // Team NS: PLAYER_ROLES[0] and PLAYER_ROLES[2] (PLAYER_SOUTH and PLAYER_NORTH)
 * // Team EW: PLAYER_ROLES[1] and PLAYER_ROLES[3] (PLAYER_WEST and PLAYER_EAST)
 */
const PLAYER_ROLES_ARRAY = [
  'PLAYER_SOUTH',
  'PLAYER_WEST',
  'PLAYER_NORTH',
  'PLAYER_EAST'
];

// Export as read-only view of the array
export const PLAYER_ROLES = Object.freeze([...PLAYER_ROLES_ARRAY]);

/**
 * Individual player position constants for easier reference.
 * @readonly
 * @enum {string}
 * @property {string} PLAYER_SOUTH - The South player position.
 * @property {string} PLAYER_WEST - The West player position.
 * @property {string} PLAYER_NORTH - The North player position.
 * @property {string} PLAYER_EAST - The East player position.
 */
export const PLAYER_POSITIONS = Object.freeze({
  // Original values for backward compatibility
  SOUTH: 'PLAYER_SOUTH',
  WEST: 'PLAYER_WEST',
  NORTH: 'PLAYER_NORTH',
  EAST: 'PLAYER_EAST',

  // New prefixed versions (preferred)
  PLAYER_SOUTH: 'PLAYER_SOUTH',
  PLAYER_WEST: 'PLAYER_WEST',
  PLAYER_NORTH: 'PLAYER_NORTH',
  PLAYER_EAST: 'PLAYER_EAST'
});

/**
 * Team identifiers for Euchre (North/South vs East/West).
 * @readonly
 * @enum {string}
 * @property {string} TEAM_NS - North/South team.
 * @property {string} TEAM_EW - East/West team.
 */
export const TEAMS = Object.freeze({
  // Original values for backward compatibility
  NS: 'TEAM_NS',
  EW: 'TEAM_EW',

  // New prefixed versions (preferred)
  TEAM_NS: 'TEAM_NS', // North/South team
  TEAM_EW: 'TEAM_EW'  // East/West team
});

/**
 * Winning score for a Euchre game.
 * @readonly
 * @type {number}
 * @default 10
 */
export const WINNING_SCORE = 10;