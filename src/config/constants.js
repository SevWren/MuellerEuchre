// Game constants
export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const VALUES = ['9', '10', 'J', 'Q', 'K', 'A'];

export const DEBUG_LEVELS = {
    INFO: 1,
    WARNING: 2,
    VERBOSE: 3,
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
