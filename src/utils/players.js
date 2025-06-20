/**
 * Utility functions related to player management, teams, and turn order.
 * @module players
 */
import { PLAYER_ROLES, TEAMS } from '../config/constants.js';
import logger from './logger.js'; // Use the new Pino logger

/**
 * Gets the team identifier (from `TEAMS` constants, e.g., `TEAMS.TEAM_NS`) for a given player role.
 * This function assumes a standard 4-player game where players at even indices in `PLAYER_ROLES`
 * (e.g., 0 and 2) form one team (e.g., `TEAMS.TEAM_NS`), and players at odd indices (e.g., 1 and 3)
 * form the other team (e.g., `TEAMS.TEAM_EW`).
 *
 * @param {string} playerRole - The player's role (e.g., 'south', 'west'). Must be a value from `PLAYER_ROLES`.
 * @returns {string|null} The team identifier (e.g., `TEAMS.TEAM_NS`, `TEAMS.TEAM_EW`) or `null` if the role is invalid.
 * @private Used internally, primarily by `isTeammate` and `initializePlayers`.
 */
function getTeamForPlayer(playerRole) {
  const roleIndex = PLAYER_ROLES.indexOf(playerRole);
  if (roleIndex === -1) {
    logger.warn({ playerRole }, 'Invalid playerRole provided to getTeamForPlayer');
    return null;
  }
  // Assuming PLAYER_ROLES = ['south', 'west', 'north', 'east']
  // Team NS: south (0), north (2) -> even indices
  // Team EW: west (1), east (3) -> odd indices
  return (roleIndex % 2 === 0) ? TEAMS.TEAM_NS : TEAMS.TEAM_EW;
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
 * Gets the next player in the turn order.
 * Handles "going alone" scenarios by skipping the partner who is sitting out.
 *
 * @param {string} currentPlayerRole - The role of the current player.
 * @param {Array<string>} [playerSlots=PLAYER_ROLES] - An ordered array of player roles defining the turn sequence.
 *                                                     Defaults to `PLAYER_ROLES`.
 * @param {boolean} [goingAlone=false] - Flag indicating if a player has chosen to "go alone".
 * @param {string|null} [partnerSittingOut=null] - The role of the partner who is sitting out, if `goingAlone` is true.
 * @returns {string|undefined} The role of the next player, or `undefined` if inputs are invalid
 * (e.g., `currentPlayerRole` not in `playerSlots`, or `playerSlots` is not an array of 4).
 */
export function getNextPlayer(currentPlayerRole, playerSlots = PLAYER_ROLES, goingAlone = false, partnerSittingOut = null) {
    if (!currentPlayerRole || !Array.isArray(playerSlots) || playerSlots.length !== 4) {
        logger.warn({ currentPlayerRole, playerSlotsProvided: playerSlots }, 'Invalid parameters for getNextPlayer: requires currentPlayerRole and valid playerSlots (array of 4).');
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
        nextIndex = (nextIndex + 1) % playerSlots.length; // Skip again
        nextPlayer = playerSlots[nextIndex];
    }

    return nextPlayer;
}

/**
 * Retrieves a player object from the game state by their socket ID.
 *
 * @param {object} gameState - The current game state.
 * @param {object} gameState.players - An object where player data is stored, keyed by role.
 *                                   Each player object is expected to have a `socketId` property.
 * @param {string} socketId - The socket ID to search for.
 * @returns {object|null} The player object (the value from the `gameState.players` map)
 *                        if found, or `null` if not found or if inputs are invalid.
 */
export function getPlayerBySocketId(gameState, socketId) {
    if (!gameState || !gameState.players || typeof gameState.players !== 'object' || !socketId) {
        logger.warn({ gameStateExists: !!gameState, socketId }, 'Invalid arguments for getPlayerBySocketId.');
        return null;
    }
    
    for (const role in gameState.players) {
        if (gameState.players[role] && gameState.players[role].socketId === socketId) { // Added null check for player[role]
            return gameState.players[role];
        }
    }
    return null;
}

/**
 * Retrieves a player's role (e.g., 'south', 'west') from the game state by their socket ID.
 *
 * @param {object} gameState - The current game state.
 * @param {object} gameState.players - An object where player data is stored, keyed by role.
 *                                   Each player object is expected to have a `socketId` property.
 * @param {string} socketId - The socket ID to search for.
 * @returns {string|null} The player's role (a key from the `gameState.players` map)
 *                        if found, or `null` if not found or if inputs are invalid.
 */
export function getRoleBySocketId(gameState, socketId) {
    if (!gameState || !gameState.players || typeof gameState.players !== 'object' || !socketId) {
        logger.warn({ gameStateExists: !!gameState, socketId }, 'Invalid arguments for getRoleBySocketId.');
        return null;
    }
    
    for (const role in gameState.players) {
        if (gameState.players[role] && gameState.players[role].socketId === socketId) { // Added null check for player[role]
            return role;
        }
    }
    return null;
}

/**
 * Initializes the `players` object for a new game state.
 * Creates entries for each role defined in `PLAYER_ROLES`. Each player is initialized with:
 * - A default name based on their role (e.g., 'South').
 * - `socketId` set to `null`.
 * - An empty `hand` array.
 * - A `teamId` determined by their position (based on `TEAMS` and `PLAYER_ROLES` constants).
 * - `score` initialized to 0 (note: team scores are primary in Euchre; this might be individual contribution or placeholder).
 * - `isConnected` set to `false`.
 * - `tricksWonThisHand` initialized to 0.
 *
 * @returns {object} An initialized players object, where keys are player roles (e.g., 'south')
 *                   and values are player data objects.
 */
export function initializePlayers() {
    const players = {};
    PLAYER_ROLES.forEach((role, index) => {
        // Determine team based on PLAYER_ROLES order and TEAMS constants
        const teamId = getTeamForPlayer(role); // Use getTeamForPlayer for consistency
        players[role] = {
            name: role.charAt(0).toUpperCase() + role.slice(1), // e.g., 'South'
            socketId: null,
            hand: [],
            teamId: teamId,
            score: 0, // Individual player score, team scores are separate in gameState.teamScores
            isConnected: false,
            tricksWonThisHand: 0,
        };
    });
    return players;
}

/**
 * Gets the team ID for a given player object.
 *
 * @param {object} player - The player object.
 * @param {string} player.teamId - The team identifier associated with the player.
 * @param {string} [player.id] - Player's unique ID (for logging).
 * @param {string} [player.name] - Player's name (for logging).
 * @returns {string|undefined} The team ID (e.g., `TEAMS.TEAM_NS`) of the player,
 *                             or `undefined` if player object is invalid or `teamId` is not set.
 */
export function getPlayerTeam(player) {
  if (!player || typeof player !== 'object') {
    logger.warn({ player }, 'Invalid player object passed to getPlayerTeam.');
    return undefined;
  }
  if (player.teamId === undefined) {
    logger.warn({ playerId: player.id, playerName: player.name }, 'Player object does not have a teamId.');
    // Fallback or error handling could be more sophisticated here if needed
  }
  return player.teamId;
}
