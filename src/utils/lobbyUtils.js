/**
 * Utility functions for lobby management.
 * @module utils/lobbyUtils
 */
import { PLAYER_ROLES, TEAMS } from '../config/constants.js';
import logger from './logger.js';

/**
 * Assigns a role to a player in the game state.
 * Modifies and returns the gameState.
 * @param {object} gameState - The current game state.
 * @param {string} role - The role to assign.
 * @param {string} userId - The user's unique ID.
 * @param {string} playerName - The player's chosen name.
 * @param {string} socketId - The player's socket ID.
 * @returns {object} The modified game state.
 */
export function assignRoleToPlayer(gameState, role, userId, playerName, socketId) {
  if (!gameState || !gameState.players) {
    logger.error({ gameState, role, userId }, 'assignRoleToPlayer: Invalid gameState or players object.');
    return gameState;
  }
  if (!PLAYER_ROLES.includes(role)) {
    logger.warn({ role }, `assignRoleToPlayer: Invalid role specified: ${role}`);
    return gameState;
  }

  const playerTeamId = (PLAYER_ROLES.indexOf(role) % 2 === 0) ? TEAMS.TEAM_NS : TEAMS.TEAM_EW;

  const newPlayerState = {
    // Preserve some existing data if rejoining, but reset game-specific stats
    ...(gameState.players[role] ? {
      id: userId,
      name: playerName,
      socketId: socketId,
      isConnected: true,
      isActive: true,
      role: role,
      teamId: playerTeamId,
      // Explicitly reset game-specific stats for a new assignment/hand
      tricksWonThisHand: 0,
      score: 0,
    } : {
      // For a completely new player, initialize all properties
      id: userId,
      name: playerName,
      socketId: socketId,
      isConnected: true,
      isActive: true,
      role: role,
      teamId: playerTeamId,
      tricksWonThisHand: 0,
      score: 0,
    }),
  };

  const updatedPlayers = {
    ...gameState.players,
    [role]: newPlayerState,
  };

  const updatedState = {
    ...gameState,
    players: updatedPlayers,
  };

  logger.info({ gameId: gameState.gameId, role, userId, playerName }, `Assigned role ${role} to player ${playerName} (${userId}).`);
  return updatedState;
}

/**
 * Checks if the lobby is full (all player roles are taken by connected players).
 * @param {object} gameState - The current game state.
 * @returns {boolean} True if the lobby is full, false otherwise.
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
 * @param {object} gameState - The current game state.
 * @returns {string|null} The next available role, or null if all roles are taken.
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
