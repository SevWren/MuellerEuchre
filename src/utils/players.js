/**
 * Utility functions related to player management, teams, and turn order.
 * @module players
 */
import { PLAYER_ROLES, TEAMS } from '../config/constants.js';
import logger from './logger.js'; // Use the new Pino logger

/**
 * Gets the team identifier for a given player role.
 * (e.g., 'north' and 'south' are on one team, 'east' and 'west' on another).
 * @param {string} playerRole - The player's role (e.g., 'south', 'west').
 * @returns {string} The team identifier (e.g., 'north+south', 'east+west') or empty string if role is invalid.
 * @private // This function is only used internally by isTeammate
 */
function getTeamForPlayer(playerRole) {
  if (PLAYER_ROLES.slice(0, 2).includes(playerRole)) { // e.g., 'south', 'north' if PLAYER_ROLES[0]='south', PLAYER_ROLES[2]='north'
    // This assumes specific ordering in PLAYER_ROLES for teams.
    // A more robust way would be to have team definitions in constants.
    // For now, assuming PLAYER_ROLES = ['south', 'west', 'north', 'east']
    // Team 1: south, north
    // Team 2: west, east
    if (playerRole === PLAYER_ROLES[0] || playerRole === PLAYER_ROLES[2]) { // south or north
        return `${PLAYER_ROLES[0]}_${PLAYER_ROLES[2]}`; // e.g. "south_north"
    } else if (playerRole === PLAYER_ROLES[1] || playerRole === PLAYER_ROLES[3]) { // west or east
        return `${PLAYER_ROLES[1]}_${PLAYER_ROLES[3]}`; // e.g. "west_east"
    }
  }
  logger.warn({ playerRole }, 'Invalid playerRole provided to getTeamForPlayer');
  return '';
}

/**
 * Checks if two players are on the same team.
 * @param {string} player1Role - The first player's role.
 * @param {string} player2Role - The second player's role.
 * @returns {boolean} True if the players are on the same team, false otherwise.
 */
export function isTeammate(player1Role, player2Role) {
  if (!player1Role || !player2Role || !PLAYER_ROLES.includes(player1Role) || !PLAYER_ROLES.includes(player2Role)) {
    logger.warn({ player1Role, player2Role }, 'Invalid role(s) passed to isTeammate');
    return false;
  }
  if (player1Role === player2Role) return false; // A player is not their own teammate for game logic purposes

  const team1 = getTeamForPlayer(player1Role);
  const team2 = getTeamForPlayer(player2Role);

  return team1 !== '' && team1 === team2;
}

/**
 * Gets the partner's role for a given player role.
 * @param {string} playerRole - The player's role (e.g., 'south', 'west', 'north', 'east').
 * @returns {string|undefined} The partner's role, or undefined if the role is invalid.
 */
export function getPartner(playerRole) {
    // Assuming PLAYER_ROLES = ['south', 'west', 'north', 'east']
    // South's partner is North, West's partner is East.
    const partnerMap = {
        [PLAYER_ROLES[0]]: PLAYER_ROLES[2], // south: north
        [PLAYER_ROLES[1]]: PLAYER_ROLES[3], // west: east
        [PLAYER_ROLES[2]]: PLAYER_ROLES[0], // north: south
        [PLAYER_ROLES[3]]: PLAYER_ROLES[1]  // east: west
    };
    if (!PLAYER_ROLES.includes(playerRole)) {
        logger.warn({ playerRole }, 'Invalid playerRole passed to getPartner');
        return undefined;
    }
    return partnerMap[playerRole];
}

/**
 * Gets the next player in turn order, skipping a sitting out partner if applicable.
 * @param {string} currentPlayerRole - The current player's role.
 * @param {Array<string>} [playerSlots=PLAYER_ROLES] - Ordered array of player roles for the current game. Defaults to PLAYER_ROLES.
 * @param {boolean} [goingAlone=false] - Whether a player is "going alone".
 * @param {string} [partnerSittingOut] - The role of the partner who is sitting out (if goingAlone is true).
 * @returns {string|undefined} The next player's role, or undefined if inputs are invalid.
 */
export function getNextPlayer(currentPlayerRole, playerSlots = PLAYER_ROLES, goingAlone = false, partnerSittingOut = null) {
    if (!currentPlayerRole || !playerSlots || playerSlots.length !== 4) {
        logger.warn({ currentPlayerRole, playerSlots }, 'Invalid parameters for getNextPlayer: requires currentPlayerRole and valid playerSlots (array of 4).');
        return undefined;
    }

    const currentIndex = playerSlots.indexOf(currentPlayerRole);
    if (currentIndex === -1) {
        logger.warn({ currentPlayerRole, playerSlots }, `Current player role ${currentPlayerRole} not found in provided player slots.`);
        return undefined;
    }

    let nextIndex = (currentIndex + 1) % playerSlots.length;
    let nextPlayer = playerSlots[nextIndex];

    // If going alone, and the next player is the one sitting out, skip them.
    if (goingAlone && partnerSittingOut && nextPlayer === partnerSittingOut) {
        nextIndex = (nextIndex + 1) % playerSlots.length;
        nextPlayer = playerSlots[nextIndex];
    }

    return nextPlayer;
}

/**
 * Gets a player object by their socket ID from the game state.
 * @param {object} gameState - The current game state, containing a `players` object.
 * @param {string} socketId - The socket ID to look up.
 * @returns {object|null} The player object (value from the gameState.players map) or null if not found or inputs are invalid.
 */
export function getPlayerBySocketId(gameState, socketId) {
    if (!gameState || !gameState.players || typeof gameState.players !== 'object' || !socketId) {
        logger.warn({ gameStateExists: !!gameState, socketId }, 'Invalid arguments for getPlayerBySocketId.');
        return null;
    }
    
    for (const role in gameState.players) {
        if (gameState.players[role].socketId === socketId) {
            return gameState.players[role];
        }
    }
    return null;
}

/**
 * Gets a player's role by their socket ID from the game state.
 * @param {object} gameState - The current game state, containing a `players` object.
 * @param {string} socketId - The socket ID to look up.
 * @returns {string|null} The player's role (key from the gameState.players map) or null if not found or inputs are invalid.
 */
export function getRoleBySocketId(gameState, socketId) {
    if (!gameState || !gameState.players || typeof gameState.players !== 'object' || !socketId) {
        logger.warn({ gameStateExists: !!gameState, socketId }, 'Invalid arguments for getRoleBySocketId.');
        return null;
    }
    
    for (const role in gameState.players) {
        if (gameState.players[role].socketId === socketId) {
            return role;
        }
    }
    return null;
}

/**
 * Initializes the players object with default values for a new game.
 * Each player has a team, empty hand, zero score, null socketId, default name,
 * isConnected status, and zero tricksWonThisHand.
 * @returns {object} The initialized players object, mapping roles to player data.
 */
export function initializePlayers() {
    const players = {};
    PLAYER_ROLES.forEach((role, index) => {
        // Determine team: assuming PLAYER_ROLES = ['south', 'west', 'north', 'east']
        // South & North are TEAM1 (index 0, 2)
        // West & East are TEAM2 (index 1, 3)
        const team = (index % 2 === 0) ? TEAMS.TEAM1 : TEAMS.TEAM2;
        players[role] = {
            name: role.charAt(0).toUpperCase() + role.slice(1), // e.g., 'South'
            socketId: null,
            hand: [],
            team: team, // Assign to TEAM1 or TEAM2
            score: 0, // Overall game score for this player's team (might be redundant if teamScores used in gameState)
            isConnected: false,
            tricksWonThisHand: 0,
        };
    });
    return players;
}
