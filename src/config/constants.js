// Game constants
export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const VALUES = ['9', '10', 'J', 'Q', 'K', 'A'];

export const DEBUG_LEVELS = {
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
    STATE_UPDATE: 'game_state_update',
    REQUEST_FULL_STATE: 'request_full_state',
    PLAYER_ACTION: 'player_action',
    
    // Game actions
    PLAY_CARD: 'play_card',
    MAKE_BID: 'make_bid',
    GO_ALONE: 'go_alone',
    
    // Connection events
    PLAYER_CONNECTED: 'player_connected',
    PLAYER_DISCONNECTED: 'player_disconnected',
    RECONNECT: 'reconnect',
    
    // Game flow
    GAME_STARTED: 'game_started',
    ROUND_STARTED: 'round_started',
    TRICK_COMPLETED: 'trick_completed',
    GAME_OVER: 'game_over'
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

export const PLAYER_ROLES = ['south', 'west', 'north', 'east'];

export const TEAMS = {
    TEAM1: 1,
    TEAM2: 2
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
