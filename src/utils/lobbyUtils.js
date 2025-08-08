/**
 * Utility functions for lobby management.
 * @module utils/lobbyUtils
 * @see src/socket/handlers/lobbyHandlers.js
 * @see test/utils/lobbyUtils.unit.test.js
 */
import { ValidationError as EuchreError } from '../game/logic/validation-errors.js';
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

/**
 * Represents the state of a player within the game.
 * @typedef {object} PlayerState
 * @property {string} id - The user's unique ID.
 * @property {string} name - The player's chosen name.
 * @property {string} socketId - The player's socket ID.
 * @property {boolean} isConnected - True if the player is currently connected.
 * @property {boolean} isActive - True if the player is active in the current game session.
 * @property {PlayerRole} role - The assigned role of the player (e.g., PLAYER_NORTH).
 * @property {TeamName} teamId - The team ID of the player (e.g., TEAM_NS, TEAM_EW).
 * @property {number} tricksWonThisHand - The number of tricks won by the player in the current hand.
 * @property {number} score - The total score of the player across hands.
 */

/**
 * Represents the state of a team within the game.
 * @typedef {object} TeamState
 * @property {TeamName} id - The unique identifier for the team (e.g., TEAM_NS).
 * @property {PlayerRole[]} players - An array of player roles belonging to this team.
 * @property {number} score - The total score of the team across hands.
 */

/**
 * Represents the comprehensive state of a Euchre game.
 * This is a partial definition focusing on properties used in lobbyUtils.
 * @typedef {object} GameState
 * @property {string} [gameId] - The unique identifier for the game.
 * @property {Object.<PlayerRole, PlayerState>} players - An object mapping player roles to their PlayerState.
 * @property {Object.<TeamName, TeamState>} teams - An object mapping team IDs to their TeamState.
 */

// Default no-op logger for when none is provided
const noopLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: () => noopLogger,
  level: 'silent',
  silent: () => {}
};

/**
 * Creates an object containing lobby utility functions with the specified logger.
 * @param {Object} [logger] - The logger instance to use for logging. If not provided, a no-op logger will be used.
 * @returns {Object} An object containing the lobby utility functions.
 */
export function createLobbyUtils(logger = noopLogger) {
  /**
   * Assigns a role to a player and updates the game state. This is a pure function.
   * @param {GameState} gameState - The current game state.
   * @param {PlayerRole} role - The role to assign.
   * @param {string} userId - The user's unique ID.
   * @param {string} playerName - The player's chosen name.
   * @param {string} socketId - The player's socket ID.
   * @returns {GameState} The modified game state.
   * @throws {EuchreError} E_INVALID_GAME_STATE if gameState or players object is invalid.
   * @throws {EuchreError} E_INVALID_ROLE if an invalid role is specified.
   */
  function assignRoleToPlayer(
    gameState,
    role,
    userId,
    playerName,
    socketId,
  ) {
    if (!gameState || !gameState.players) {
      const error = new EuchreError(
        'Invalid gameState or players object.',
        'E_INVALID_GAME_STATE'
      );
      error.details = { gameState, role, userId };
      logger.error('Invalid gameState or players object', { error });
      throw error;
    }
  // or `!PLAYER_ROLES[role]`. The JSDoc is updated to reflect the `keyof typeof` pattern.
  if (!PLAYER_ROLES.includes(role)) {
    const error = new EuchreError(
      `Invalid role specified: ${role}`,
      'E_INVALID_ROLE'
    );
    error.details = { role };
    throw error;
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

  // Create a new players object with the updated player
  const updatedPlayers = {
    ...gameState.players,
    [role]: newPlayerState,
  };

  // Initialize teams object if it doesn't exist
  const updatedTeams = gameState.teams ? { ...gameState.teams } : {};
  
  if (gameState.teams) {
    Object.entries(updatedTeams).forEach(([_, team]) => {
      if (!team) return;
      if (!team.players) {
        team.players = [];
      } else {
        team.players = team.players.filter(playerRole => playerRole !== role);
      }
    });
  }
  
  // Ensure the team exists in the teams object
  if (!updatedTeams[playerTeamId]) {
    console.log(`Team ${playerTeamId} does not exist, creating it`);
    updatedTeams[playerTeamId] = { 
      score: 0,
      players: [] 
    };
  }
  
  // Debug logging before ensuring players array exists
  console.log(`Team ${playerTeamId} state before ensuring players array:`, 
    JSON.stringify(updatedTeams[playerTeamId], null, 2));
  
  // Ensure the team has a players array and initialize it if it doesn't exist
  if (!updatedTeams[playerTeamId].players || !Array.isArray(updatedTeams[playerTeamId].players)) {
    console.log(`Initializing players array for team ${playerTeamId}`);
    updatedTeams[playerTeamId].players = [];
  }
  
  // Debug logging before adding role
  console.log(`Team ${playerTeamId} players before adding role:`, 
    JSON.stringify(updatedTeams[playerTeamId].players, null, 2));
  
  // Add the role to the correct team if it's not already there
  if (!updatedTeams[playerTeamId].players.includes(role)) {
    logger.info(`Adding role ${role} to team ${playerTeamId}`);
    updatedTeams[playerTeamId].players.push(role);
    logger.debug(`Team ${playerTeamId} players after adding role:`, 
      JSON.stringify(updatedTeams[playerTeamId].players, null, 2));
  } else {
    logger.info(`Role ${role} already exists in team ${playerTeamId}`);
  }

  // Create the updated state with the new players and teams
  const updatedState = {
    ...gameState,
    players: updatedPlayers,
    teams: updatedTeams,
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
 * @see src/socket/handlers/lobbyHandlers.js
 * @see test/utils/lobbyUtils.unit.test.js
 */
function isLobbyFull(gameState) {
  // Handle invalid game state or missing players object
  if (!gameState || !gameState.players) {
    logger.warn('isLobbyFull called with invalid gameState');
    return false;
  }

  // Check if all required player roles are filled with connected, active players
  const allRolesFilled = Object.values(PLAYER_ROLES).every(role => {
    const player = gameState.players[role];
    return player && player.isConnected && player.isActive;
  });
  
  logger.debug(`Lobby is ${allRolesFilled ? 'full' : 'not full'}`);
  return allRolesFilled;
}

/**
 * Gets the next available player role in the lobby.
 * @param {GameState} gameState - The current game state.
 * @returns {PlayerRole | null} The next available role, or null if all roles are taken.
 * @see src/socket/handlers/lobbyHandlers.js
 * @see test/utils/lobbyUtils.unit.test.js
 */
function getNextAvailableRole(gameState) {
  if (!gameState || !gameState.players) {
    logger.warn('getNextAvailableRole called with invalid gameState');
    return null;
  }

  // Find the first role that doesn't have a connected, active player
  const availableRole = Object.values(PLAYER_ROLES).find(
    (role) =>
      !gameState.players[role] ||
      !gameState.players[role].isConnected ||
      !gameState.players[role].isActive
  );

  logger.debug(`Next available role: ${availableRole || 'none'}`);
  return availableRole || null;
}

/**
 * Gets the team for a given player role.
 * @private
 * @param {PlayerRole} role - The player role.
 * @returns {TeamName} The team name.
 */
function getTeamForRole(role) {
  const team = role.endsWith('_NORTH') || role.endsWith('_SOUTH') ? 'TEAM_NS' : 'TEAM_EW';
  logger.trace(`Role ${role} is on team ${team}`);
  return team;
}

  // Return the public API of the module
  return {
    assignRoleToPlayer,
    isLobbyFull,
    getNextAvailableRole
  };
}