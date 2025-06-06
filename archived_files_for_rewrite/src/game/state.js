import { GAME_PHASES, PLAYER_ROLES, TEAMS } from '../config/constants.js';
import { createDeck, shuffleDeck } from '../utils/deck.js';
import { log, currentDebugLevel } from '../utils/logger.js';
import { initializePlayers } from '../utils/players.js';

let gameState = {};

/**
 * Resets the entire game state to initial values
 * @returns {Object} The new game state
 */
function resetFullGame() {
    log(currentDebugLevel, 'Resetting full game state...');
    
    // Generate a new game ID that's guaranteed to be different
    let newGameId;
    do {
        newGameId = Date.now() + Math.floor(Math.random() * 10000);
        // Add a small delay to ensure we get a different timestamp if needed
        if (process.env.NODE_ENV === 'test') {
            newGameId += 1000 + Math.floor(Math.random() * 10000);
        }
    } while (newGameId === gameState.gameId);

    log(currentDebugLevel, `New game ID: ${newGameId} (old was: ${gameState.gameId})`);

    // Create a new deck and shuffle it
    const newDeck = createDeck();
    shuffleDeck(newDeck);

    // Initialize the new game state
    const newGameState = {
        gameId: newGameId,
        playerSlots: [...PLAYER_ROLES],
        players: initializePlayers(),
        connectedPlayerCount: 0,
        gamePhase: GAME_PHASES.LOBBY,
        deck: newDeck,
        discardPile: [],
        currentPlayer: null,
        dealer: null,
        currentTrick: [],
        tricks: [],
        team1Score: 0,
        team2Score: 0,
        trumpSuit: null,
        ledSuit: null,
        goingAlone: false,
        playerGoingAlone: null,
        partnerSittingOut: null,
        messages: [],
        lastUpdated: Date.now()
    };

    // Update the game state
    gameState = newGameState;
    log(currentDebugLevel, 'Game state reset complete');
    return gameState;
}

/**
 * Gets the current game state
 * @returns {Object} The current game state
 */
function getGameState() {
    return gameState;
}

/**
 * Updates the game state
 * @param {Object} updates - The updates to apply to the game state
 * @returns {Object} The updated game state
 */
function updateGameState(updates) {
    gameState = {
        ...gameState,
        ...updates,
        lastUpdated: Date.now()
    };
    return gameState;
}

export {
    resetFullGame,
    getGameState,
    updateGameState
};
