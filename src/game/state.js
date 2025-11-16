// filepath: src/game/state.js
/**
 * @file src/game/state.js
 * @module game/state
 * @description
 *   This module represents Layer 2: State Management. It is the single, authoritative
 *   source of truth for the in-memory state of all active Euchre games on the server.
 *   It provides an abstraction layer over the raw storage of game state objects, ensuring
 *   that all state modifications are atomic, immutable, and consistent.
 *
 *   Architectural Role:
 *   - Sits between Layer 1 (Pure Logic) and Layer 3 (Network Handlers).
 *   - Manages a collection of game states, keyed by `gameId`.
 *   - Exposes a controlled API for creating, retrieving, updating, and removing game states.
 *   - Enforces the "Immutability First" principle by returning deep copies of game state
 *     and freezing state objects to prevent accidental mutation.
 *
 *   Core Responsibilities:
 *   - Provide state factories for creating new, valid initial game states (`createGameState`).
 *   - Safely retrieve the current state of any active game (`getGameState`).
 *   - Provide a transactional update mechanism to apply changes atomically (`updateGameState`).
 *   - Clean up memory by removing finished or stale game states (`removeGameState`).
 * 
 *   - This is a starting point for the file that was generated from a rough draft of all
 *   - required needs for the functionality of this file. 
 *   - 
 *   - 
 * @see {@link file://./docs/project_details/Project_Architectural_Mandate_for_Layer_1.md} for architectural principles.
 * @see {@link module:utils/players} for player initialization logic.
 * @see {@link module:socket/handlers} where these functions are consumed.
 */

import { GAME_PHASES, TEAMS } from '../config/constants.js';
import { initializePlayers } from '../utils/players.js';
import { getDefaultSettings, mergeSettings } from '../utils/settingsUtils.js';
import { generateGameId } from '../utils/idGenerator.js';
import logger from '../utils/logger.js';

/**
 * In-memory store for all active game states, keyed by gameId.
 * This is a private, module-level variable and is not exported, ensuring that all
 * interactions with the game states are funneled through the exported API,
 * which guarantees immutability and transactional integrity.
 * @private
 * @type {Map<string, Readonly<GameState>>}
 */
const activeGames = new Map();

// =============================================================================
// Type Definitions for JSDoc
// =============================================================================

/**
 * Represents a playing card.
 * @typedef {object} Card
 * @property {string} id - The unique identifier for the card (e.g., "AS", "9D").
 * @property {string} suit - The suit of the card, from `SUITS` constants.
 * @property {string} value - The face value of the card ('9', '10', 'J', 'Q', 'K', 'A').
 * @property {string} name - The human-readable name (e.g., "Ace of Spades").
 */

/**
 * Represents a player's bid during the bidding phase.
 * @typedef {object} Bid
 * @property {number} round - The round of bidding (1 or 2).
 * @property {string} playerRole - The role of the player who made the bid.
 * @property {string} decision - The decision made ('orderUp', 'pass', 'callTrump').
 * @property {string} [suit] - The suit called, if applicable.
 */

/**
 * Represents a single player within the game state.
 * @typedef {object} Player
 * @property {string} id - The unique identifier for the player's session or account.
 * @property {string} name - The player's display name.
 * @property {string} role - The player's assigned role (e.g., 'PLAYER_SOUTH').
 * @property {string} teamId - The ID of the team the player belongs to (e.g., 'TEAM_NS').
 * @property {Card[]} hand - An array of card objects in the player's hand.
 * @property {boolean} isConnected - The player's current connection status.
 * @property {string | null} socketId - The player's current Socket.IO ID.
 */

/**
 * Represents the complete, canonical state of a single Euchre game.
 * This object is the single source of truth for a game's lifecycle.
 * @typedef {object} GameState
 * @property {string} gameId - The unique identifier for the game session.
 * @property {string} hostId - The unique ID of the player who created the game.
 * @property {string} gamePhase - The current phase of the game, from `GAME_PHASES`.
 * @property {object.<string, Player>} players - A map of player roles to player data.
 * @property {string | null} dealer - The role of the current dealer.
 * @property {string | null} currentPlayer - The role of the player whose turn it is.
 * @property {Card | null} turnCard - The card turned up after the deal to propose trump.
 * @property {Card[]} kitty - The remaining cards after dealing.
 * @property {string | null} trumpSuit - The suit that is currently trump.
 * @property {string | null} makerTeam - The team that called trump ('TEAM_NS' or 'TEAM_EW').
 * @property {string | null} playerWhoOrderedUp - The role of the player who ordered up in round 1.
 * @property {string | null} playerWhoCalledTrump - The role of the player who called trump in round 2.
 * @property {boolean} goingAlone - True if the maker is playing without their partner.
 * @property {string | null} playerGoingAlone - The role of the player who is going alone.
 * @property {string | null} partnerSittingOut - The role of the partner sitting out.
 * @property {{card: Card, playedBy: string}[]} currentTrick - The cards played in the current trick.
 * @property {string | null} leadSuit - The suit of the first card played in the trick.
 * @property {object.<string, number>} tricksTaken - A map of team IDs to the number of tricks they have won in the current hand.
 * @property {object.<string, number>} teamScores - A map of team IDs to their total game score.
 * @property {Bid[]} bids - A history of bids made in the current hand.
 * @property {object[]} gameMessages - An array of log messages for the client UI.
 * @property {object} settings - The settings for this game instance.
 * @property {number} settings.winningScore - The score required to win the game.
 * @property {string | null} winningTeam - The team that won the game, or null.
 * @property {boolean} gameOver - A flag indicating if the game has concluded.
 * @property {number} createdAt - A Unix timestamp of when the game was created.
 * @property {number} updatedAt - A Unix timestamp of the last time the state was updated.
 */

/**
 * Creates the initial state object for a new Euchre game.
 * This function is the "State Factory" for Layer 2. It generates a valid,
 * consistent starting point for a game in the LOBBY phase.
 *
 * @param {string} hostId - The unique ID of the player who is creating the game.
 * @param {object} [customSettings={}] - Optional custom game settings.
 * @returns {Readonly<GameState>} A new, frozen game state object.
 */
function createGameState(hostId, customSettings = {}) {
  // This function is not yet tested via npm test.
  // It orchestrates calls to Layer 1 utilities to generate a valid initial GameState.
  // It is expected to create a game object, freeze it, store it in the in-memory map, and return it.
  // TODO: Write and run tests to verify this function's behavior, especially with custom settings.
  const gameId = generateGameId();
  const settings = mergeSettings(customSettings);
  const now = Date.now();

  const initialState = {
    gameId,
    hostId,
    gamePhase: GAME_PHASES.LOBBY,
    players: initializePlayers(), // Pure function from Layer 1
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

  const frozenState = Object.freeze(initialState);
  activeGames.set(gameId, frozenState);

  logger.info({ gameId, hostId, settings }, "New game state created and stored in memory.");
  return frozenState;
}

/**
 * Retrieves a deep copy of the current state for a given game.
 * Returning a deep copy is essential to enforce the immutability principle.
 * Callers receive a snapshot of the state and cannot mutate the source of truth directly.
 *
 * @param {string} gameId - The ID of the game to retrieve.
 * @returns {GameState | null} A deep copy of the game state object, or null if the game is not found.
 */
function getGameState(gameId) {
  // This function is not yet tested via npm test.
  // It retrieves a game state from the in-memory map.
  // Crucially, it must return a deep copy to prevent mutation of the authoritative state.
  // It uses structuredClone for efficiency with a JSON-based fallback.
  // TODO: Write and run tests to verify it returns a copy, not a reference, and handles not-found cases.
  const gameState = activeGames.get(gameId);

  if (!gameState) {
    logger.warn({ gameId }, "Attempted to get state for a non-existent game.");
    return null;
  }

  try {
    return structuredClone(gameState);
  } catch (e) {
    logger.error({ err: e, gameId }, "Failed to clone game state. Falling back to JSON method.");
    return JSON.parse(JSON.stringify(gameState));
  }
}

/**
 * Updates the state of a game using a provided update function.
 * This is the primary method for modifying game state. It ensures that updates are
 * atomic and that the new state is frozen to maintain immutability.
 *
 * @param {string} gameId - The ID of the game to update.
 * @param {(currentState: Readonly<GameState>) => GameState} updateFn - A pure function that takes the current state
 *   and returns a new, updated state object.
 * @returns {Readonly<GameState>} The new, frozen game state after the update.
 * @throws {Error} If the game is not found or if the update function returns an invalid state.
 */
function updateGameState(gameId, updateFn) {
  // This function is not yet tested via npm test.
  // It provides the atomic update mechanism. It gets the current state,
  // passes it to the pure `updateFn`, and then commits the new, frozen state to memory.
  // TODO: Write and run tests to verify atomicity, immutability, and error handling for invalid update functions.
  const currentState = activeGames.get(gameId);

  if (!currentState) {
    logger.error({ gameId }, "Attempted to update a non-existent game state.");
    throw new Error(`Game with ID "${gameId}" not found.`);
  }

  const newState = updateFn(currentState);

  if (!newState || typeof newState !== 'object') {
    logger.error({ gameId, returnedState: newState }, "Update function returned an invalid state.");
    throw new Error("State update function must return a valid game state object.");
  }

  const finalState = Object.freeze({
    ...newState,
    updatedAt: Date.now(),
  });

  activeGames.set(gameId, finalState);
  logger.debug({ gameId, newPhase: finalState.gamePhase }, "Game state updated in memory.");

  return finalState;
}

/**
 * Removes a game state from the in-memory store.
 * This is used when a game is over, abandoned, or needs to be cleaned up.
 *
 * @param {string} gameId - The ID of the game to remove.
 * @returns {boolean} `true` if the game was found and removed, `false` otherwise.
 */
function removeGameState(gameId) {
  // This function is not yet tested via npm test.
  // It handles memory cleanup by removing a game state from the active map.
  // TODO: Write and run tests to verify it correctly removes states and handles non-existent IDs.
  const deleted = activeGames.delete(gameId);
  if (deleted) {
    logger.info({ gameId }, "Game state removed from memory.");
  } else {
    logger.warn({ gameId }, "Attempted to remove a non-existent game state.");
  }
  return deleted;
}

/**
 * Retrieves a list of all active game IDs currently in memory.
 * Useful for debugging, admin panels, or server status checks.
 *
 * @returns {string[]} An array of active game IDs.
 */
function listActiveGames() {
  // This function is not yet tested via npm test.
  // It is a simple diagnostic utility to get all keys from the active games map.
  // TODO: Write and run tests to verify it returns the correct list of keys.
  return Array.from(activeGames.keys());
}

/**
 * Hydrates the in-memory store with games from the database.
 * This is intended to be called on server startup to recover active games.
 * @param {GameState[]} games - An array of game state objects from the database.
 */
function hydrateGames(games) {
  if (!Array.isArray(games)) {
    logger.error({ games }, "hydrateGames received non-array input.");
    return;
  }

  let hydratedCount = 0;
  for (const game of games) {
    if (game && game.gameId) {
      const frozenState = Object.freeze(game);
      activeGames.set(game.gameId, frozenState);
      hydratedCount++;
    } else {
      logger.warn({ game }, "Skipped hydrating invalid game object from database.");
    }
  }

  if (hydratedCount > 0) {
    logger.info(`Successfully hydrated ${hydratedCount} active games into memory.`);
  }
}

// Export all functions at the end of the file
export {
  createGameState,
  getGameState,
  updateGameState,
  removeGameState,
  listActiveGames,
  hydrateGames
};