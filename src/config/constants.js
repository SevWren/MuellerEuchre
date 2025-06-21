
/**
 * Euchre Game Constants and Configuration
 * @module constants
 */

export const SUITS = {
  HEARTS: 'hearts',
  DIAMONDS: 'diamonds',
  CLUBS: 'clubs',
  SPADES: 'spades',
};
export const VALUES = ['9', '10', 'J', 'Q', 'K', 'A'];

export const DEBUG_LEVELS = {
    ERROR: 0,
    INFO: 1,
    WARNING: 2,
    VERBOSE: 3,
};

// Storage keys for local persistence
export const STORAGE_KEYS = {
    GAME_STATE: 'euchre_game_state',
    OFFLINE_QUEUE: 'euchre_offline_queue',
    PLAYER_PREFERENCES: 'euchre_player_prefs',
    CONNECTION_STATE: 'euchre_connection_state'
};

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

export const PLAYER_ROLES = ['south', 'west', 'north', 'east']; // NS are index 0, 2; EW are index 1, 3

export const TEAMS = {
    TEAM_NS: 'NS', // North/South team
    TEAM_EW: 'EW'  // East/West team
};

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

// Game configuration
export const WINNING_SCORE = 10;
