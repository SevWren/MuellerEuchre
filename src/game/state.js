/**
 * @file src/game/state.js
 * @module game/state
 * @description
 *   Layer 2: State Management.
 *   The Single Source of Truth for in-memory game state.
 *   Enforces Recursive Immutability, Atomicity, and Memory Management.
 */

import { GAME_PHASES, TEAMS } from '../config/constants.js';
import { initializePlayers } from '../utils/players.js';
import { mergeSettings } from '../utils/settingsUtils.js';
import { generateGameId } from '../utils/idGenerator.js';
import logger from '../utils/logger.js';

/**
 * In-memory store for all active game states.
 * @private
 * @type {Map<string, Readonly<GameState>>}
 */
const activeGames = new Map();

// Constants for memory management
const STALE_GAME_TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 Hours

/**
 * Recursively freezes an object and all its nested properties.
 * This ensures strict immutability for the entire state tree.
 * @param {object} object - The object to freeze.
 * @returns {object} The deeply frozen object.
 */
function deepFreeze(object) {
  const propNames = Reflect.ownKeys(object);

  for (const name of propNames) {
    const value = object[name];

    if ((value && typeof value === "object") || typeof value === "function") {
      if (!Object.isFrozen(value)) {
        deepFreeze(value);
      }
    }
  }

  return Object.freeze(object);
}

/**
 * Creates the initial state object for a new Euchre game.
 * @param {string} hostId - The unique ID of the player creating the game.
 * @param {object} [customSettings={}] - Optional custom game settings.
 * @returns {Readonly<GameState>} A new, deeply frozen game state object.
 */
export function createGameState(hostId, customSettings = {}) {
  const gameId = generateGameId();
  const settings = mergeSettings(customSettings);
  const now = Date.now();

  const initialState = {
    gameId,
    hostId,
    gamePhase: GAME_PHASES.LOBBY,
    players: initializePlayers(),
    dealer: null,
    currentPlayer: null,
    turnCard: null,
    kitty: [],
    trumpSuit: null,
    makerTeam: null,
    playerWhoOrderedUp: null,
    playerWhoCalledTrump: null,
    goingAlone: false,
    playerGoingAlone: null,
    partnerSittingOut: null,
    currentTrick: [],
    leadSuit: null,
    tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
    teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
    bids: [],
    gameMessages: [],
    settings,
    winningTeam: null,
    gameOver: false,
    createdAt: now,
    updatedAt: now,
  };

  const frozenState = deepFreeze(initialState);
  activeGames.set(gameId, frozenState);

  logger.info({ gameId, hostId }, "New game state created.");
  return frozenState;
}

/**
 * Retrieves a deep copy of the current state for a given game.
 * @param {string} gameId - The ID of the game to retrieve.
 * @returns {Readonly<GameState> | null} A deeply frozen deep copy of the game state, or null if not found.
 */
export function getGameState(gameId) {
  const gameState = activeGames.get(gameId);

  if (!gameState) {
    return null;
  }

  try {
    return deepFreeze(structuredClone(gameState));
  } catch (e) {
    logger.error({ err: e, gameId }, "structuredClone failed. Falling back to JSON.");
    return deepFreeze(JSON.parse(JSON.stringify(gameState)));
  }
}

/**
 * Updates the state of a game using a transactional update function.
 * @param {string} gameId - The ID of the game to update.
 * @param {(currentState: Readonly<GameState>) => GameState} updateFn - Pure function to derive new state.
 * @returns {Readonly<GameState>} The new, deeply frozen game state.
 * @throws {Error} If game not found, updateFn returns invalid data, or updateFn returns a Promise.
 */
export function updateGameState(gameId, updateFn) {
  const currentState = activeGames.get(gameId);

  if (!currentState) {
    throw new Error(`Game with ID "${gameId}" not found.`);
  }

  const newState = updateFn(currentState);

  // STRICT VALIDATION: Ensure Layer 1 functions are synchronous
  if (newState instanceof Promise) {
    const msg = "State update function returned a Promise. Layer 1 functions must be synchronous.";
    logger.error({ gameId }, msg);
    throw new Error(msg);
  }

  if (!newState || typeof newState !== 'object' || !newState.gameId) {
    logger.error({ gameId }, "Update function returned invalid state.");
    throw new Error("State update function must return a valid game state object.");
  }

  const finalState = deepFreeze({
    ...newState,
    updatedAt: Date.now(),
  });

  activeGames.set(gameId, finalState);
  return finalState;
}

/**
 * Removes a game state from memory.
 * @param {string} gameId 
 * @returns {boolean} True if removed.
 */
export function removeGameState(gameId) {
  const deleted = activeGames.delete(gameId);
  if (deleted) {
    logger.info({ gameId }, "Game removed from memory.");
  }
  return deleted;
}

/**
 * Hydrates the in-memory store with games from the database.
 * Strict validation, Type Normalization, and Deep Freezing.
 * @param {GameState[]} games - Array of game objects from DB.
 */
export function hydrateGames(games) {
  if (!Array.isArray(games)) {
    logger.error("hydrateGames expected an array.");
    return;
  }

  let count = 0;
  for (const game of games) {
    if (!game || !game.gameId || !game.players || !game.gamePhase) {
      logger.warn({ gameId: game?.gameId }, "Skipping hydration of malformed game state.");
      continue;
    }

    // Normalize timestamps to numbers (handle MongoDB Date objects)
    if (game.createdAt instanceof Date) game.createdAt = game.createdAt.getTime();
    if (game.updatedAt instanceof Date) game.updatedAt = game.updatedAt.getTime();

    activeGames.set(game.gameId, deepFreeze(game));
    count++;
  }

  if (count > 0) {
    logger.info(`Hydrated ${count} games into memory.`);
  }
}

/**
 * Prunes games that haven't been updated in 2 hours.
 * @returns {number} The number of games pruned.
 */
export function pruneStaleGames() {
  const now = Date.now();
  let prunedCount = 0;

  for (const [gameId, state] of activeGames.entries()) {
    // Ensure we are comparing numbers
    const lastUpdate = typeof state.updatedAt === 'number' ? state.updatedAt : 0;
    
    if (now - lastUpdate > STALE_GAME_TIMEOUT_MS) {
      activeGames.delete(gameId);
      prunedCount++;
      logger.info({ gameId, ageMs: now - lastUpdate }, "Pruned stale game from memory.");
    }
  }

  return prunedCount;
}

/**
 * Debug utility to list active game IDs.
 * @returns {string[]}
 */
export function listActiveGames() {
  return Array.from(activeGames.keys());
}