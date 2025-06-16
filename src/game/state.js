/**
 * Manages the Euchre game state, ensuring immutability and controlled updates.
 * @module state
 */
import { GAME_PHASES, PLAYER_ROLES } from '../config/constants.js';
import { initializePlayers } from '../utils/players.js';
import logger from '../utils/logger.js';

let gameState = {};

/**
 * Creates a deep copy of an object.
 * @param {object} obj - The object to clone.
 * @returns {object} A deep copy of the object.
 * @private
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    logger.error({ err: error, objToString: String(obj) }, 'Error during deepClone.');
    throw new Error(`Failed to deep clone object: ${error.message}`);
  }
}

/**
 * Initializes or resets the game state to a default lobby status.
 * @returns {object} A deep copy of the newly initialized game state.
 */
function resetFullGame() {
  const newGameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const initialPlayers = initializePlayers();

  gameState = {
    gameId: newGameId,
    gamePhase: GAME_PHASES.LOBBY,
    players: initialPlayers,
    deck: [],
    kitty: [],
    turnCard: null,
    trumpSuit: null,
    dealer: PLAYER_ROLES[0],
    currentPlayer: PLAYER_ROLES[0], // Default current player
    orderUpTurn: null,
    bids: [],
    roundNumber: 1,
    playerWhoOrderedUp: null,
    playerWhoCalledTrump: null,
    makerTeam: null,
    goingAlone: false,
    playerGoingAlone: null,
    partnerSittingOut: null,
    currentTrick: [],
    leadSuit: null,
    tricksTaken: {
      [PLAYER_ROLES[0]]: 0,
      [PLAYER_ROLES[1]]: 0,
      [PLAYER_ROLES[2]]: 0,
      [PLAYER_ROLES[3]]: 0,
    },
    teamScores: {}, // Placeholder for team scores
    gameMessages: [],
    lastUpdated: Date.now(),
  };
  logger.info({ gameId: gameState.gameId, phase: gameState.gamePhase }, 'Game state initialized/reset');
  return deepClone(gameState);
}

/**
 * Returns a deep copy of the current game state.
 * @returns {object} A deep copy of the game state. Returns empty object if not initialized.
 */
function getGameState() {
  if (Object.keys(gameState).length === 0) {
    logger.warn('getGameState called before state was initialized. Returning empty object.');
    return {};
  }
  return deepClone(gameState);
}

/**
 * Updates the game state using an updater function.
 * @param {function(object): object} updater - A function that takes the current state (deep copy)
 *                                             and returns the new state object.
 * @returns {object} The new game state (a deep copy).
 * @throws {Error} If the updater function does not return an object, or if state is not initialized.
 */
function updateGameState(updater) {
  if (Object.keys(gameState).length === 0) {
    logger.error('updateGameState called before state was initialized. Call resetFullGame() first.');
    throw new Error('Game state is not initialized. Call resetFullGame() first.');
  }
  if (typeof updater !== 'function') {
    logger.error('updateGameState: updater must be a function.');
    throw new Error('Updater must be a function.');
  }

  const currentClone = deepClone(gameState);
  const newPartialState = updater(currentClone);

  if (typeof newPartialState !== 'object' || newPartialState === null) {
    logger.error('updateGameState: updater function did not return a valid object.');
    throw new Error('Updater function must return a valid new state object.');
  }

  gameState = deepClone({ ...currentClone, ...newPartialState });
  gameState.lastUpdated = Date.now();

  return deepClone(gameState);
}

resetFullGame();

export {
  resetFullGame,
  getGameState,
  updateGameState,
};
