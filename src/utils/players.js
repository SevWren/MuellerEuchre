import { PLAYER_ROLES, TEAMS } from '../config/constants.js';
import { log, currentDebugLevel } from './logger.js';

/**
 * Checks if two players are on the same team
 * @param {string} player1Role - The first player's role
 * @param {string} player2Role - The second player's role
 * @returns {boolean} - True if the players are on the same team
 */
export function isTeammate(player1Role, player2Role) {
  if (!player1Role || !player2Role) return false;
  
  const team1 = getTeamForPlayer(player1Role);
  const team2 = getTeamForPlayer(player2Role);
  
  return team1 === team2;
}

/**
 * Gets the team for a player
 * @param {string} playerRole - The player's role
 * @returns {string} - The team name
 */
function getTeamForPlayer(playerRole) {
  if (['north', 'south'].includes(playerRole)) {
    return 'north+south';
  } else if (['east', 'west'].includes(playerRole)) {
    return 'east+west';
  }
  return '';
}

/**
 * Gets the partner role for a given player role
 * @param {string} playerRole - The player's role (south, west, north, east)
 * @returns {string} The partner's role
 */
export function getPartner(playerRole) {
    const partnerMap = {
        south: 'north',
        north: 'south',
        east: 'west',
        west: 'east'
    };
    return partnerMap[playerRole];
}

/**
 * Gets the next player in turn order
 * @param {string} currentPlayerRole - The current player's role
 * @param {Array} playerSlots - Array of player roles in order
 * @param {boolean} [goingAlone=false] - Whether someone is going alone
 * @param {string} [playerGoingAlone] - The role of the player going alone
 * @param {string} [partnerSittingOut] - The role of the sitting out partner
 * @returns {string} The next player's role
 */
export function getNextPlayer(currentPlayerRole, playerSlots, goingAlone = false, playerGoingAlone, partnerSittingOut) {
    if (!currentPlayerRole || !playerSlots || playerSlots.length === 0) {
        log(currentDebugLevel, 'Invalid parameters for getNextPlayer');
        return undefined;
    }

    const currentIndex = playerSlots.indexOf(currentPlayerRole);
    if (currentIndex === -1) {
        log(currentDebugLevel, `Current player role ${currentPlayerRole} not found in player slots`);
        return undefined;
    }

    let nextIndex = (currentIndex + 1) % playerSlots.length;
    let nextPlayer = playerSlots[nextIndex];

    // Skip the sitting out partner if someone is going alone
    if (goingAlone && nextPlayer === partnerSittingOut) {
        nextIndex = (nextIndex + 1) % playerSlots.length;
        nextPlayer = playerSlots[nextIndex];
    }

    return nextPlayer;
}

/**
 * Gets a player by their socket ID
 * @param {Object} gameState - The current game state
 * @param {string} socketId - The socket ID to look up
 * @returns {Object|null} The player object or null if not found
 */
export function getPlayerBySocketId(gameState, socketId) {
    if (!gameState || !socketId) return null;
    
    return Object.values(gameState.players).find(
        player => player.socketId === socketId
    ) || null;
}

/**
 * Gets a player's role by their socket ID
 * @param {Object} gameState - The current game state
 * @param {string} socketId - The socket ID to look up
 * @returns {string|null} The player's role or null if not found
 */
export function getRoleBySocketId(gameState, socketId) {
    if (!gameState || !socketId) return null;
    
    const playerEntry = Object.entries(gameState.players).find(
        ([_, player]) => player.socketId === socketId
    );
    
    return playerEntry ? playerEntry[0] : null;
}

/**
 * Initializes the players object with default values
 * @returns {Object} The initialized players object
 */
export function initializePlayers() {
    return {
        south: { team: TEAMS.TEAM1, hand: [], score: 0, socketId: null, name: 'South' },
        west: { team: TEAMS.TEAM2, hand: [], score: 0, socketId: null, name: 'West' },
        north: { team: TEAMS.TEAM1, hand: [], score: 0, socketId: null, name: 'North' },
        east: { team: TEAMS.TEAM2, hand: [], score: 0, socketId: null, name: 'East' }
    };
}
