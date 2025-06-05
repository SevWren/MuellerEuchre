/**
 * @file testStates.js - Test fixtures for Euchre game states
 * @module TestFixtures
 * @description Provides predefined game states and player data for testing various game scenarios
 * 
 * This file contains mock game states representing different phases of the Euchre game,
 * as well as test player objects that can be used across test files.
 * 
 * @typedef {Object} Card
 * @property {string} id - Unique card identifier
 * @property {string} suit - Card suit (hearts, diamonds, clubs, spades)
 * @property {string} value - Card value (A, K, Q, J, 10, 9)
 * 
 * @typedef {Object} Player
 * @property {string} id - Unique player identifier
 * @property {string} name - Player's display name
 * @property {Array<Card>} hand - Array of cards in player's hand
 * @property {boolean} [ready] - Whether the player is ready (optional)
 * 
 * @typedef {Object} Trick
 * @property {Array<Card>} cards - Cards played in the current trick
 * @property {string} leader - ID of the player who leads the trick
 * 
 * @typedef {Object} GameState
 * @property {string} gameId - Unique game identifier
 * @property {string} gamePhase - Current game phase (LOBBY, IN_PROGRESS, COMPLETED)
 * @property {Object.<string, Player>} players - Map of player IDs to player objects
 * @property {Object} settings - Game settings
 * @property {number} settings.maxPlayers - Maximum number of players
 * @property {number} settings.scoreToWin - Score needed to win the game
 * @property {number} [createdAt] - Timestamp of when the game was created
 * @property {number} [currentRound] - Current round number (for in-progress games)
 * @property {string} [currentTurn] - ID of the player whose turn it is
 * @property {Trick} [trick] - Current trick information
 * @property {string} [winner] - ID of the winning team (for completed games)
 * @property {Object} [scores] - Game scores (for completed games)
 * @property {number} [scores.team1] - Score for team 1
 * @property {number} [scores.team2] - Score for team 2
 */

/**
 * Sample card objects for use in tests
 * @type {Object.<string, Card>}
 */
const SAMPLE_CARDS = {
    NINE_HEARTS: { id: '9h', suit: 'hearts', value: '9' },
    TEN_HEARTS: { id: '10h', suit: 'hearts', value: '10' },
    JACK_HEARTS: { id: 'Jh', suit: 'hearts', value: 'J' },
    QUEEN_HEARTS: { id: 'Qh', suit: 'hearts', value: 'Q' },
    KING_HEARTS: { id: 'Kh', suit: 'hearts', value: 'K' },
    ACE_HEARTS: { id: 'Ah', suit: 'hearts', value: 'A' },
    NINE_DIAMONDS: { id: '9d', suit: 'diamonds', value: '9' },
    TEN_DIAMONDS: { id: '10d', suit: 'diamonds', value: '10' },
    JACK_DIAMONDS: { id: 'Jd', suit: 'diamonds', value: 'J' },
    QUEEN_DIAMONDS: { id: 'Qd', suit: 'diamonds', value: 'Q' },
    KING_DIAMONDS: { id: 'Kd', suit: 'diamonds', value: 'K' },
    ACE_DIAMONDS: { id: 'Ad', suit: 'diamonds', value: 'A' },
    NINE_CLUBS: { id: '9c', suit: 'clubs', value: '9' },
    TEN_CLUBS: { id: '10c', suit: 'clubs', value: '10' },
    JACK_CLUBS: { id: 'Jc', suit: 'clubs', value: 'J' },
    QUEEN_CLUBS: { id: 'Qc', suit: 'clubs', value: 'Q' },
    KING_CLUBS: { id: 'Kc', suit: 'clubs', value: 'K' },
    ACE_CLUBS: { id: 'Ac', suit: 'clubs', value: 'A' },
    NINE_SPADES: { id: '9s', suit: 'spades', value: '9' },
    TEN_SPADES: { id: '10s', suit: 'spades', value: '10' },
    JACK_SPADES: { id: 'Js', suit: 'spades', value: 'J' },
    QUEEN_SPADES: { id: 'Qs', suit: 'spades', value: 'Q' },
    KING_SPADES: { id: 'Ks', suit: 'spades', value: 'K' },
    ACE_SPADES: { id: 'As', suit: 'spades', value: 'A' }
};

/**
 * Test player objects for use in test fixtures.
 * Each player is initialized with a sample hand of cards.
 * @type {Object.<string, Player>}
 * @property {Player} PLAYER_1 - First test player with id 'player-1'
 * @property {Player} PLAYER_2 - Second test player with id 'player-2'
 * @property {Player} PLAYER_3 - Third test player with id 'player-3'
 * @property {Player} PLAYER_4 - Fourth test player with id 'player-4'
 * @example
 * // Usage in tests:
 * import { TEST_PLAYERS, SAMPLE_CARDS } from './fixtures/testStates';
 * const player1 = { 
 *   ...TEST_PLAYERS.PLAYER_1, 
 *   hand: [SAMPLE_CARDS.ACE_HEARTS, SAMPLE_CARDS.KING_HEARTS] 
 * };
 */
export const TEST_PLAYERS = {
    PLAYER_1: { 
        id: 'player-1', 
        name: 'Test Player 1', 
        hand: [
            SAMPLE_CARDS.ACE_HEARTS,
            SAMPLE_CARDS.KING_HEARTS,
            SAMPLE_CARDS.QUEEN_HEARTS,
            SAMPLE_CARDS.JACK_HEARTS,
            SAMPLE_CARDS.TEN_HEARTS
        ],
        ready: true 
    },
    PLAYER_2: { 
        id: 'player-2', 
        name: 'Test Player 2', 
        hand: [
            SAMPLE_CARDS.ACE_DIAMONDS,
            SAMPLE_CARDS.KING_DIAMONDS,
            SAMPLE_CARDS.QUEEN_DIAMONDS,
            SAMPLE_CARDS.JACK_DIAMONDS,
            SAMPLE_CARDS.TEN_DIAMONDS
        ],
        ready: true 
    },
    PLAYER_3: { 
        id: 'player-3', 
        name: 'Test Player 3', 
        hand: [
            SAMPLE_CARDS.ACE_CLUBS,
            SAMPLE_CARDS.KING_CLUBS,
            SAMPLE_CARDS.QUEEN_CLUBS,
            SAMPLE_CARDS.JACK_CLUBS,
            SAMPLE_CARDS.TEN_CLUBS
        ],
        ready: false 
    },
    PLAYER_4: { 
        id: 'player-4', 
        name: 'Test Player 4', 
        hand: [
            SAMPLE_CARDS.ACE_SPADES,
            SAMPLE_CARDS.KING_SPADES,
            SAMPLE_CARDS.QUEEN_SPADES,
            SAMPLE_CARDS.JACK_SPADES,
            SAMPLE_CARDS.TEN_SPADES
        ],
        ready: false 
    }
};

// Re-export SAMPLE_CARDS for use in tests
export { SAMPLE_CARDS };

/**
 * Generates a timestamp for consistent testing.
 * @returns {number} A fixed timestamp for testing
 */
const generateTestTimestamp = () => 1620000000000; // Fixed timestamp for consistent tests

/**
 * Initial game state for testing purposes.
 * Represents a game in the LOBBY phase with 2 players ready to start.
 * @type {GameState}
 * @property {string} gameId - Unique identifier for the game (format: 'test-game-{timestamp}')
 * @property {string} gamePhase - Current phase of the game (LOBBY)
 * @property {Object.<string, Player>} players - Map of player IDs to player objects
 * @property {Object} settings - Game settings including maxPlayers and scoreToWin
 * @property {number} createdAt - Timestamp of when the game was created
 * @property {string} [dealer] - ID of the current dealer (not set in initial state)
 * @property {string} [trumpSuit] - Current trump suit (not set in initial state)
 * @example
 * // Using in a test:
 * import { INITIAL_STATE, TEST_PLAYERS } from './fixtures/testStates';
 * const gameState = { 
 *   ...INITIAL_STATE,
 *   players: {
 *     ...INITIAL_STATE.players,
 *     [TEST_PLAYERS.PLAYER_3.id]: { ...TEST_PLAYERS.PLAYER_3, ready: true }
 *   }
 * };
 */
export const INITIAL_STATE = Object.freeze({
    gameId: `test-game-${generateTestTimestamp()}`,
    gamePhase: 'LOBBY',
    players: Object.freeze({
        [TEST_PLAYERS.PLAYER_1.id]: Object.freeze({ ...TEST_PLAYERS.PLAYER_1 }),
        [TEST_PLAYERS.PLAYER_2.id]: Object.freeze({ ...TEST_PLAYERS.PLAYER_2 })
    }),
    settings: Object.freeze({
        maxPlayers: 4,
        scoreToWin: 10,
        allowSpectators: true,
        autoPlay: false
    }),
    createdAt: generateTestTimestamp(),
    dealer: undefined,
    trumpSuit: undefined
});

/**
 * Game state representing an in-progress game.
 * Extends INITIAL_STATE with IN_PROGRESS phase and initial turn setup.
 * @type {GameState}
 * @property {string} gamePhase - Set to 'IN_PROGRESS'
 * @property {number} currentRound - The current round number (starts at 1)
 * @property {string} currentTurn - ID of the player whose turn it is
 * @property {Object} trick - Current trick information
 * @property {Array<Card>} trick.cards - Array of cards played in the current trick
 * @property {string} trick.leader - ID of the player who leads the current trick
 * @property {string} dealer - ID of the current dealer
 * @property {string} trumpSuit - Current trump suit (hearts, diamonds, clubs, spades)
 * @property {Object} scores - Current scores for both teams
 * @property {number} scores.team1 - Current score for team 1
 * @property {number} scores.team2 - Current score for team 2
 * @property {string} [winningTeam] - ID of the team that has won (if any)
 * @example
 * // Using in a test:
 * import { IN_PROGRESS_STATE, TEST_PLAYERS, SAMPLE_CARDS } from './fixtures/testStates';
 * const gameState = {
 *   ...IN_PROGRESS_STATE,
 *   currentTurn: TEST_PLAYERS.PLAYER_2.id,
 *   trick: { 
 *     cards: [SAMPLE_CARDS.ACE_HEARTS], 
 *     leader: TEST_PLAYERS.PLAYER_1.id 
 *   }
 * };
 */
export const IN_PROGRESS_STATE = Object.freeze({
    ...INITIAL_STATE,
    gamePhase: 'IN_PROGRESS',
    currentRound: 1,
    currentTurn: TEST_PLAYERS.PLAYER_1.id,
    trick: Object.freeze({
        cards: [],
        leader: TEST_PLAYERS.PLAYER_1.id
    }),
    dealer: TEST_PLAYERS.PLAYER_1.id,
    trumpSuit: 'hearts',
    scores: Object.freeze({
        team1: 0,
        team2: 0
    }),
    winningTeam: undefined
});

/**
 * Game state representing a completed game.
 * Extends IN_PROGRESS_STATE with COMPLETED phase and winner information.
 * @type {GameState}
 * @property {string} gamePhase - Set to 'COMPLETED'
 * @property {string} winner - ID of the winning team
 * @property {number} round - The final round number when the game ended
 * @property {Object} scores - Final scores for both teams
 * @property {number} scores.team1 - Final score for team 1
 * @property {number} scores.team2 - Final score for team 2
 * @property {number} completedAt - Timestamp when the game was completed
 * @property {Object} stats - Game statistics
 * @property {number} stats.duration - Game duration in seconds
 * @property {Object} stats.rounds - Number of rounds played
 * @example
 * // Using in a test:
 * import { COMPLETED_STATE } from './fixtures/testStates';
 * const gameState = {
 *   ...COMPLETED_STATE,
 *   winner: 'team2',
 *   scores: { 
 *     team1: 8, 
 *     team2: 10 
 *   },
 *   completedAt: Date.now()
 * };
 */
export const COMPLETED_STATE = Object.freeze({
    ...IN_PROGRESS_STATE,
    gamePhase: 'COMPLETED',
    winner: 'team1',
    round: 8,
    scores: Object.freeze({
        team1: 10,
        team2: 8
    }),
    completedAt: generateTestTimestamp() + 3600000, // 1 hour after creation
    stats: Object.freeze({
        duration: 3600, // 1 hour in seconds
        rounds: 8,
        tricksWon: {
            team1: 5,
            team2: 3
        },
        pointsPerRound: {
            team1: [0, 1, 3, 1, 2, 1, 1, 1],
            team2: [1, 1, 0, 1, 0, 1, 2, 2]
        }
    })
});

/**
 * Creates a modified game state by deeply merging a base state with modifications.
 * This function performs a deep merge for nested objects (players and settings) and a shallow merge for other properties.
 * 
 * @param {GameState} baseState - The base game state to modify. This will not be mutated.
 * @param {Object} [modifications={}] - Object containing state modifications to apply
 * @param {Object.<string, Player>} [modifications.players] - Optional player modifications to merge with existing players
 * @param {Object} [modifications.settings] - Optional settings modifications to merge with existing settings
 * @param {Trick} [modifications.trick] - Optional trick modifications
 * @param {Object} [modifications.scores] - Optional scores modifications
 * @param {*} [modifications...] - Any additional properties to add/override in the state
 * 
 * @returns {GameState} A new game state with modifications applied
 * 
 * @throws {TypeError} If baseState is not provided or is not an object
 * @throws {TypeError} If modifications is not an object (when provided)
 * 
 * @example
 * // Create a new state with additional players
 * import { createTestState, INITIAL_STATE, TEST_PLAYERS } from './fixtures/testStates';
 * 
 * const modifiedState = createTestState(INITIAL_STATE, {
 *   players: {
 *     [TEST_PLAYERS.PLAYER_3.id]: { ...TEST_PLAYERS.PLAYER_3, ready: true },
 *     [TEST_PLAYERS.PLAYER_4.id]: { ...TEST_PLAYERS.PLAYER_4, ready: true }
 *   },
 *   settings: { maxPlayers: 4, scoreToWin: 10, autoPlay: true },
 *   customProperty: 'value',
 *   currentTurn: TEST_PLAYERS.PLAYER_3.id
 * });
 * 
 * @example
 * // Extend an in-progress game state with a new trick
 * import { createTestState, IN_PROGRESS_STATE, TEST_PLAYERS, SAMPLE_CARDS } from './fixtures/testStates';
 * 
 * const gameState = createTestState(IN_PROGRESS_STATE, {
 *   currentTurn: TEST_PLAYERS.PLAYER_2.id,
 *   trick: {
 *     cards: [SAMPLE_CARDS.ACE_HEARTS, SAMPLE_CARDS.KING_HEARTS],
 *     leader: TEST_PLAYERS.PLAYER_1.id
 *   },
 *   scores: {
 *     team1: 3,
 *     team2: 2
 *   }
 * });
 * 
 * @example
 * // Create a minimal test state with validation
 * try {
 *   const minimalState = createTestState(
 *     { gameId: 'minimal', gamePhase: 'LOBBY', players: {}, settings: {} },
 *     { custom: 'value' }
 *   );
 * } catch (error) {
 *   console.error('Invalid state:', error.message);
 * }
 */
export const createTestState = (baseState, modifications = {}) => {
    // Input validation
    if (typeof baseState !== 'object' || baseState === null) {
        throw new TypeError('baseState must be an object');
    }
    
    if (modifications !== undefined && (typeof modifications !== 'object' || modifications === null)) {
        throw new TypeError('modifications must be an object');
    }

    // Create a deep copy of the base state
    const state = { ...baseState };
    
    // Apply modifications with special handling for nested objects
    const result = {
        ...state,
        ...modifications,
        // Deep merge players
        players: {
            ...state.players,
            ...(modifications.players || {})
        },
        // Deep merge settings
        settings: {
            ...state.settings,
            ...(modifications.settings || {})
        },
        // Deep merge trick if it exists
        ...(modifications.trick && {
            trick: {
                ...(state.trick || {}),
                ...modifications.trick,
                // Ensure cards is an array
                cards: [...(modifications.trick.cards || state.trick?.cards || [])]
            }
        }),
        // Deep merge scores if they exist
        ...(modifications.scores && {
            scores: {
                ...(state.scores || {}),
                ...modifications.scores
            }
        })
    };

    return result;
};
