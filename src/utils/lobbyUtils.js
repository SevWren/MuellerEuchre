/**
 * Utility functions for lobby management.
 * @module utils/lobbyUtils
 * @see src/socket/handlers/lobbyHandlers.js
 */
import { EuchreError } from '../game/logic/validation-errors.js';
import { PLAYER_ROLES, TEAMS } from "../config/constants.js";
/**
 * A type representing one of the valid player role strings.
 * This is created directly from the keys of the PLAYER_ROLES constant object.
 * @typedef {keyof typeof PLAYER_ROLES} PlayerRole
 */

/**
 * A type representing one of the valid team strings.
 * This is created directly from the keys of the TEAMS constant object.
 * @typedef {keyof typeof TEAMS} TeamName
 */
import logger from "./logger.js";
/**
 * Represents the state of a player within the game.
 * @typedef {object} PlayerState
 * @property {string} id - The user's unique ID.
 * @property {string} name - The player's chosen name.
 * @property {string} socketId - The player's socket ID.
 * @property {boolean} isConnected - True if the player is currently connected.
 * @property {boolean} isActive - True if the player is active in the current game session.
 * @throws {EuchreError} LOBBY_INVALID_GAME_STATE if gameState or players object is invalid.
 * @throws {EuchreError} LOBBY_INVALID_ROLE if an invalid role is specified.
 * @throws {EuchreError} LOBBY_INVALID_GAME_STATE if gameState or players object is invalid.
 * @throws {EuchreError} LOBBY_INVALID_ROLE if an invalid role is specified.
 * @property {string} role - The assigned role of the player (e.g., PLAYER_NORTH).
 * @property {string} teamId - The team ID of the player (e.g., TEAM_NS, TEAM_EW).
 * @property {number} tricksWonThisHand - The number of tricks won by the player in the current hand.
 * @property {number} score - The total score of the player across hands.
 */

/**
 * Represents the comprehensive state of a Euchre game.
 * This is a partial definition focusing on properties used in lobbyUtils.
 * @typedef {object} GameState
 * @property {string} [gameId] - The unique identifier for the game.
 * @property {object<string, PlayerState>} players - An object mapping player roles to their PlayerState.
 */

/**
 * Assigns a role to a player and updates the game state. This is a pure function.
 * @param {GameState} gameState - The current game state.
 * @param {PlayerRole} role - The role to assign.
 * @param {string} userId - The user's unique ID.
 * @param {string} playerName - The player's chosen name.
 * @param {string} socketId - The player's socket ID.
 * @returns {GameState} The modified game state.
 * @throws {EuchreError} LOBBY_INVALID_GAME_STATE if gameState or players object is invalid.
 * @throws {EuchreError} LOBBY_INVALID_ROLE if an invalid role is specified.
 */
export function assignRoleToPlayer(
  gameState,
  role,
  userId,
  playerName,
  socketId,
) {
  if (!gameState || !gameState.players) {
    throw new EuchreError(
      "LOBBY_INVALID_GAME_STATE",
      "Invalid gameState or players object.",
      { gameState, role, userId },
    );
  }
  if (!PLAYER_ROLES.includes(role)) {
    throw new EuchreError(
      "LOBBY_INVALID_ROLE",
      `Invalid role specified: ${role}`,
      { role },
    );
  }

  const playerTeamId =
    PLAYER_ROLES.indexOf(role) % 2 === 0 ? TEAMS.TEAM_NS : TEAMS.TEAM_EW;

  const newPlayerState = {
    // Preserve some existing data if rejoining, but reset game-specific stats
    ...(gameState.players[role]
      ? {
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
        }
      : {
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

  logger.info(
    { gameId: gameState.gameId, role, userId, playerName },
    `Assigned role ${role} to player ${playerName} (${userId}).`,
  );
  return updatedState;
}

/**
 * Checks if the lobby is full (all player roles are taken by connected players).
 * @param {GameState} gameState - The current game state.
 * @returns {boolean} True if the lobby is full, false otherwise.
 */
export function isLobbyFull(gameState) {
  if (!gameState || !gameState.players) return false;
  return PLAYER_ROLES.every(
    (role) =>
      gameState.players[role] &&
      gameState.players[role].isConnected &&
      gameState.players[role].isActive, // Consider isActive for players in the current game session
  );
}

/**
 * Gets the next available player role in the lobby.
 * @param {GameState} gameState - The current game state.
 * @returns {string | null} The next available role, or null if all roles are taken.
 */
export function getNextAvailableRole(gameState) {
  if (!gameState || !gameState.players) return null;
  for (const role of PLAYER_ROLES) {
    // A slot is available if the role key doesn't exist,
    // or if the player in that role is not connected or not active.
    if (
      !gameState.players[role] ||
      !gameState.players[role].isConnected ||
      !gameState.players[role].isActive
    ) {
      return role;
    }
  }
  return null;
}
