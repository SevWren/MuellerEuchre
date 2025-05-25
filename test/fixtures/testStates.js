/**
 * @file testStates.js - Test fixtures for Euchre game states
 * @module TestFixtures
 * @description Provides predefined game states and player data for testing various game scenarios
 * 
 * This file contains mock game states representing different phases of the Euchre game,
 * as well as test player objects that can be used across test files.
 */

/**
 * Test player objects for use in test fixtures.
 * @type {Object.<string, Player>}
 * @property {Player} PLAYER_1 - First test player with id 'player-1'
 * @property {Player} PLAYER_2 - Second test player with id 'player-2'
 * @property {Player} PLAYER_3 - Third test player with id 'player-3'
 * @property {Player} PLAYER_4 - Fourth test player with id 'player-4'
 * @example
 * // Usage in tests:
 * const { PLAYER_1, PLAYER_2 } = require('./fixtures/testStates');
 * const player1 = { ...PLAYER_1, hand: [card1, card2] };
 */
export const TEST_PLAYERS = {
    PLAYER_1: { id: 'player-1', name: 'Test Player 1', hand: [] },
    PLAYER_2: { id: 'player-2', name: 'Test Player 2', hand: [] },
    PLAYER_3: { id: 'player-3', name: 'Test Player 3', hand: [] },
    PLAYER_4: { id: 'player-4', name: 'Test Player 4', hand: [] }
};

/**
 * Initial game state for testing purposes.
 * Represents a game in the LOBBY phase with 2 players ready to start.
 * @type {GameState}
 * @property {string} gameId - Unique identifier for the game
 * @property {string} gamePhase - Current phase of the game (LOBBY)
 * @property {Object} players - Object containing player objects
 * @property {Object} settings - Game settings including maxPlayers and scoreToWin
 * @property {number} createdAt - Timestamp of when the game was created
 * @example
 * // Using in a test:
 * const gameState = { ...INITIAL_STATE };
 * gameState.players[PLAYER_3.id] = { ...PLAYER_3, ready: true };
 */
export const INITIAL_STATE = {
    gameId: 'test-game',
    gamePhase: 'LOBBY',
    players: {
        [TEST_PLAYERS.PLAYER_1.id]: TEST_PLAYERS.PLAYER_1,
        [TEST_PLAYERS.PLAYER_2.id]: TEST_PLAYERS.PLAYER_2
    },
    settings: {
        maxPlayers: 4,
        scoreToWin: 10
    },
    createdAt: Date.now()
};

/**
 * Game state representing an in-progress game.
 * Extends INITIAL_STATE with IN_PROGRESS phase and initial turn setup.
 * @type {GameState}
 * @property {string} gamePhase - Set to 'IN_PROGRESS'
 * @property {number} currentRound - The current round number
 * @property {string} currentTurn - ID of the player whose turn it is
 * @property {Object} trick - Current trick information
 * @property {Array} trick.cards - Array of cards played in the current trick
 * @property {string} trick.leader - ID of the player who leads the current trick
 * @example
 * // Using in a test:
 * const gameState = {
 *   ...IN_PROGRESS_STATE,
 *   currentTurn: PLAYER_2.id,
 *   trick: { cards: [card1], leader: PLAYER_1.id }
 * };
 */
export const IN_PROGRESS_STATE = {
    ...INITIAL_STATE,
    gamePhase: 'IN_PROGRESS',
    currentRound: 1,
    currentTurn: TEST_PLAYERS.PLAYER_1.id,
    trick: {
        cards: [],
        leader: TEST_PLAYERS.PLAYER_1.id
    }
};

/**
 * Game state representing a completed game.
 * Extends IN_PROGRESS_STATE with COMPLETED phase and winner information.
 * @type {GameState}
 * @property {string} gamePhase - Set to 'COMPLETED'
 * @property {string} winner - ID of the winning team
 * @property {Object} scores - Final scores for both teams
 * @property {number} scores.team1 - Final score for team 1
 * @property {number} scores.team2 - Final score for team 2
 * @example
 * // Using in a test:
 * const gameState = {
 *   ...COMPLETED_STATE,
 *   winner: 'team2',
 *   scores: { team1: 8, team2: 10 }
 * };
 */
export const COMPLETED_STATE = {
    ...IN_PROGRESS_STATE,
    gamePhase: 'COMPLETED',
    winner: 'team1',
    scores: {
        team1: 10,
        team2: 8
    }
};

/**
 * Creates a modified game state by deeply merging a base state with modifications.
 * 
 * @param {GameState} baseState - The base game state to modify. This will not be mutated.
 * @param {Object} [modifications={}] - Object containing state modifications to apply
 * @param {Object} [modifications.players] - Optional player modifications to merge with existing players
 * @param {Object} [modifications.settings] - Optional settings modifications to merge with existing settings
 * @param {*} [modifications...] - Any additional properties to add/override in the state
 * 
 * @returns {GameState} A new game state with modifications applied
 * 
 * @example
 * // Create a new state with additional players
 * const modifiedState = createTestState(INITIAL_STATE, {
 *   players: {
 *     [PLAYER_3.id]: { ...PLAYER_3, ready: true },
 *     [PLAYER_4.id]: { ...PLAYER_4, ready: true }
 *   },
 *   settings: { maxPlayers: 4, scoreToWin: 10 },
 *   customProperty: 'value'
 * });
 * 
 * @example
 * // Extend an in-progress game state
 * const inProgress = createTestState(IN_PROGRESS_STATE, {
 *   currentTurn: PLAYER_2.id,
 *   trick: {
 *     cards: [card1, card2],
 *     leader: PLAYER_1.id
 *   }
 * });
 */
export const createTestState = (baseState, modifications = {}) => ({
    ...baseState,
    ...modifications,
    players: {
        ...baseState.players,
        ...(modifications.players || {})
    },
    settings: {
        ...baseState.settings,
        ...(modifications.settings || {})
    }
});
