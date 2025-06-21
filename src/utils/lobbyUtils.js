/**
 * Utility functions for lobby management.
 * @module utils/lobbyUtils
 */
import { PLAYER_ROLES, TEAMS } from '../config/constants.js';
import logger from './logger.js';

/**
 * Assigns a player to a specific role in the game state.
 * This function directly modifies the `players` object within the provided `gameState` object.
 * It sets the player's ID, name, socket ID, connection status, role, team, and initializes hand-specific scores.
 *
 * @param {object} gameState - The current game state object. This object will be mutated.
 * @param {object} gameState.players - An object where player data is stored, keyed by role.
 * @param {string} [gameState.gameId] - The ID of the game (for logging).
 * @param {string} role - The player role to assign (e.g., 'south', from `PLAYER_ROLES`).
 * @param {string} userId - The unique identifier for the user/player.
 * @param {string} playerName - The display name chosen by the player.
 * @param {string} socketId - The active Socket.IO ID for the player's connection.
 * @returns {object} The `gameState` object, with the `players` property modified to include the assigned player.
 * Returns the original `gameState` (or potentially throws an error, though current implementation returns state)
 * if `gameState` or `gameState.players` is invalid, or if the `role` is not a valid player role.
 */
export function assignRoleToPlayer(gameState, role, userId, playerName, socketId) {
  if (!gameState || !gameState.players) {
    logger.error({ gameState, role, userId }, 'assignRoleToPlayer: Invalid gameState or players object.');
    // Potentially throw or return gameState unmodified if critical error
    return gameState;
  }
  if (!PLAYER_ROLES.includes(role)) {
    logger.warn({ role }, `assignRoleToPlayer: Invalid role specified: ${role}`);
    return gameState; // Or throw
  }

  // This function mutates the gameState.players[role] object directly.
  const playerTeamId = (PLAYER_ROLES.indexOf(role) % 2 === 0) ? TEAMS.TEAM_NS : TEAMS.TEAM_EW;

  gameState.players[role] = {
    ...(gameState.players[role] || {}), // Preserve any existing data for the role if any (e.g. if re-assigning)
    id: userId,                         // User's persistent ID
    name: playerName,
    socketId: socketId,
    isConnected: true,
    isActive: true,                     // Mark as active in the current game session
    role: role,                         // Explicitly store role
    teamId: playerTeamId,
    tricksWonThisHand: 0,               // Initialize for new hand/game
    // score: 0, // Individual player scores are usually not tracked this way in Euchre; team scores are primary.
                 // initializePlayers or game reset logic should handle initial score setup.
                 // If a player object pre-existed (e.g. disconnected then reconnected), their score might be preserved if relevant.
  };
   if (gameState.players[role].score === undefined) { // Ensure score is initialized if not already present
       gameState.players[role].score = 0; // Default to 0 if it was a completely new slot.
   }


  logger.info({ gameId: gameState.gameId, role, userId, playerName }, `Assigned role ${role} to player ${playerName} (${userId}).`);
  return gameState;
}

/**
 * Checks if the lobby is full. A lobby is full if all defined `PLAYER_ROLES`
 * are occupied by players who are marked as `isConnected` and `isActive`.
 *
 * @param {object} gameState - The current game state.
 * @param {object} gameState.players - An object containing player data, keyed by role.
 * Each player object should have `isConnected` and `isActive` boolean properties.
 * @returns {boolean} True if the lobby is full, false otherwise (including if `gameState` or `gameState.players` is null/undefined).
 */
export function isLobbyFull(gameState) {
  if (!gameState || !gameState.players) return false;
  return PLAYER_ROLES.every(role =>
    gameState.players[role] &&
    gameState.players[role].isConnected &&
    gameState.players[role].isActive // Consider isActive for players in the current game session
  );
}

/**
 * Gets the next available player role in the lobby.
 * A role is considered available if it's not present in `gameState.players`,
 * or if the player currently in that role is not `isConnected` or not `isActive`.
 * Roles are checked in the order defined by `PLAYER_ROLES`.
 *
 * @param {object} gameState - The current game state.
 * @param {object} gameState.players - An object containing player data, keyed by role.
 * Each player object should have `isConnected` and `isActive` boolean properties.
 * @returns {string|null} The string identifier of the next available role (e.g., 'south'),
 * or `null` if all roles are currently filled by active, connected players.
 * Returns `null` if `gameState` or `gameState.players` is null/undefined.
 */
export function getNextAvailableRole(gameState) {
  if (!gameState || !gameState.players) return null;
  for (const role of PLAYER_ROLES) {
    // A slot is available if the role key doesn't exist,
    // or if the player in that role is not connected or not active.
    if (!gameState.players[role] || !gameState.players[role].isConnected || !gameState.players[role].isActive) {
      return role;
    }
  }
  return null;
}
