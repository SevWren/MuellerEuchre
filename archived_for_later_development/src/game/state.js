//FILE ARCHIVED Semi? Permanetly
//As it was coded before we moved onto layer 2
//we are  not sure if it adhered to ANY of the proper development
//plan & techniques.  Revisit this file at a later date

/**
 * Manages the Euchre game state, ensuring immutability and controlled updates.
 * @module state
 */
import { GAME_PHASES, PLAYER_ROLES, TEAMS } from "../config/constants.js"; // Added TEAMS
import { initializePlayers } from "../utils/players.js";
import logger from "../utils/logger.js";

let gameState = {};

/**
 * Creates a deep copy of an object.
 * @param {object} obj - The object to clone.
 * @returns {object} A deep copy of the object.
 * @private
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    logger.error(
      { err: error, objToString: String(obj) },
      "Error during deepClone.",
    );
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
      // Initialize with team constants
      // These constants should be imported if not already available
      // For example, if TEAMS is { TEAM_NS: 'NS', TEAM_EW: 'EW' }
      // Then this would be { 'NS': 0, 'EW': 0 }
      // Assuming TEAMS.TEAM_NS and TEAMS.TEAM_EW are available (e.g. 1 and 2)
      [TEAMS.TEAM_NS]: 0,
      [TEAMS.TEAM_EW]: 0,
    },
    teamScores: {
      [TEAMS.TEAM_NS]: 0,
      [TEAMS.TEAM_EW]: 0,
    },
    gameMessages: [],
    lastUpdated: Date.now(),
  };
  logger.info(
    { gameId: gameState.gameId, phase: gameState.gamePhase },
    "Game state initialized/reset",
  );
  return deepClone(gameState);
}

/**
 * Returns a deep copy of the current game state.
 * @returns {object} A deep copy of the game state. Returns empty object if not initialized.
 */
function getGameState() {
  if (Object.keys(gameState).length === 0) {
    logger.warn(
      "getGameState called before state was initialized. Returning empty object.",
    );
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
    logger.error(
      "updateGameState called before state was initialized. Call resetFullGame() first.",
    );
    throw new Error(
      "Game state is not initialized. Call resetFullGame() first.",
    );
  }
  if (typeof updater !== "function") {
    logger.error("updateGameState: updater must be a function.");
    throw new Error("Updater must be a function.");
  }

  const currentClone = deepClone(gameState);
  let newPartialState;
  try {
    newPartialState = updater(currentClone);
  } catch (err) {
    logger.error("updateGameState: updater function threw an error.");
    throw err;
  }

  if (typeof newPartialState !== "object" || newPartialState === null) {
    logger.error(
      "updateGameState: updater function did not return a valid object.",
    );
    throw new Error("Updater function must return a valid new state object.");
  }

  gameState = deepClone({ ...currentClone, ...newPartialState });
  gameState.lastUpdated = Date.now();

  return deepClone(gameState);
}

// resetFullGame(); // Don't call resetFullGame on module load if it's meant to be a utility

// Exported function to create a new, initial game state object
export function createInitialGameState(gameIdInput) {
  const gameId =
    gameIdInput ||
    `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const initialPlayers = initializePlayers(); // This already sets up player objects keyed by role

  return {
    gameId: gameId,
    gamePhase: GAME_PHASES.LOBBY,
    players: initialPlayers, // initializePlayers returns an object, not an array
    deck: [],
    kitty: [],
    turnCard: null,
    trumpSuit: null,
    dealer: PLAYER_ROLES[0], // Default dealer
    currentPlayer: PLAYER_ROLES[1], // Default: player left of dealer (e.g. West if South is dealer)
    orderUpTurn: null, //This might be redundant if currentPlayer is used
    bids: [],
    roundNumber: 1, // For bidding phase
    playerWhoOrderedUp: null,
    playerWhoCalledTrump: null,
    makerTeam: null,
    goingAlone: false,
    playerGoingAlone: null,
    partnerSittingOut: null,
    currentTrick: [],
    leadSuit: null,
    tricksTaken: {
      [TEAMS.TEAM_NS]: 0,
      [TEAMS.TEAM_EW]: 0,
    },
    teamScores: {
      [TEAMS.TEAM_NS]: 0,
      [TEAMS.TEAM_EW]: 0,
    },
    gameMessages: [],
    // lastUpdated: Date.now(), // Set when game is actually created/updated in DB
    hostId: null, // To be set when first player creates/joins
    settings: {
      winningScore: 10, // Default, can be overridden
      // other game settings
    },
  };
}

export {
  resetFullGame, // Keep for now if used by anything for its side-effecting nature
  getGameState,
  updateGameState,
  // createInitialGameState, // Already exported above due to `export function`
};
