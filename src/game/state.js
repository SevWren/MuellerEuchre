/**
 * Manages the Euchre game state, ensuring immutability and controlled updates.
 * @module state
 */
import { GAME_PHASES, PLAYER_ROLES, TEAMS } from '../config/constants.js'; // Added TEAMS
import { initializePlayers } from '../utils/players.js';
import logger from '../utils/logger.js';

let gameState = {};

/**
 * Creates a deep copy of an object.
 * @param {object} obj - The object to clone.
 * @returns {object} A deep copy of the object.
 * @private
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (error) {
    logger.error({ err: error, objToString: String(obj) }, 'Error during deepClone.');
    throw new Error(`Failed to deep clone object: ${error.message}`);
  }
}

/**
 * Initializes or resets the internal module `gameState` to a default lobby status.
 * This function has a side effect of modifying the module-level `gameState` variable.
 * It creates a new game with a unique ID and initializes all game properties to their default starting values.
 *
 * @returns {object} A deep copy of the newly initialized game state. The structure includes:
 * - `gameId`: {string} Unique identifier for the game.
 * - `gamePhase`: {string} Initial phase, set to `GAME_PHASES.LOBBY`.
 * - `players`: {object} Player objects initialized by `initializePlayers()`.
 * - `deck`: {Array<object>} Empty array, to be populated on deal.
 * - `kitty`: {Array<object>} Empty array, to be populated on deal.
 * - `turnCard`: {null|object} Null initially.
 * - `trumpSuit`: {null|string} Null initially.
 * - `dealer`: {string} Role of the dealer, defaults to `PLAYER_ROLES[0]`.
 * - `currentPlayer`: {string} Role of the current player, defaults to `PLAYER_ROLES[0]`.
 * - `orderUpTurn`: {null|string} Null initially.
 * - `bids`: {Array<object>} Empty array for bidding history.
 * - `roundNumber`: {number} Initialized to 1.
 * - `playerWhoOrderedUp`: {null|string} Null initially.
 * - `playerWhoCalledTrump`: {null|string} Null initially.
 * - `makerTeam`: {null|string} Null initially.
 * - `goingAlone`: {boolean} False initially.
 * - `playerGoingAlone`: {null|string} Null initially.
 * - `partnerSittingOut`: {null|string} Null initially.
 * - `currentTrick`: {Array<object>} Empty array for cards in the current trick.
 * - `leadSuit`: {null|string} Null initially.
 * - `tricksTaken`: {object} Tracks tricks taken by each team, initialized to 0 for `TEAMS.TEAM_NS` and `TEAMS.TEAM_EW`.
 * - `teamScores`: {object} Tracks scores for each team, initialized to 0 for `TEAMS.TEAM_NS` and `TEAMS.TEAM_EW`.
 * - `gameMessages`: {Array<object>} Empty array for game messages.
 * - `lastUpdated`: {number} Timestamp of the last update.
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
  logger.info({ gameId: gameState.gameId, phase: gameState.gamePhase }, 'Game state initialized/reset');
  return deepClone(gameState);
}

/**
 * Returns a deep copy of the current internal module `gameState`.
 * If the game state has not been initialized (e.g., by `resetFullGame`),
 * it logs a warning and returns an empty object.
 *
 * @returns {object} A deep copy of the current game state, or an empty object if not initialized.
 * For the structure of the game state, see `resetFullGame` or `createInitialGameState`.
 */
function getGameState() {
  if (Object.keys(gameState).length === 0) {
    logger.warn('getGameState called before state was initialized. Returning empty object.');
    return {};
  }
  return deepClone(gameState);
}

/**
 * Updates the internal module `gameState` using an updater function.
 * The updater function receives a deep copy of the current state and should return
 * an object representing the new state (or a partial state object containing changes to be merged).
 * This function ensures that updates are applied immutably to the internal `gameState`.
 * It also updates the `lastUpdated` timestamp.
 *
 * @param {function(object): object} updater - A function that takes a deep copy of the current internal `gameState`
 *                                             and returns an object representing the new desired state or a partial state with changes.
 * @returns {object} A deep copy of the new, updated internal `gameState`.
 * @throws {Error} If the game state is not initialized, if the updater is not a function,
 * or if the updater function does not return a valid object.
 */
function updateGameState(updater) {
  if (Object.keys(gameState).length === 0) {
    logger.error('updateGameState called before state was initialized. Call resetFullGame() first.');
    throw new Error('Game state is not initialized. Call resetFullGame() first.');
  }
  if (typeof updater !== 'function') {
    logger.error('updateGameState: updater must be a function.');
    throw new Error('Updater must be a function.');
  }

  const currentClone = deepClone(gameState);
  const newPartialState = updater(currentClone);

  if (typeof newPartialState !== 'object' || newPartialState === null) {
    logger.error('updateGameState: updater function did not return a valid object.');
    throw new Error('Updater function must return a valid new state object.');
  }

  gameState = deepClone({ ...currentClone, ...newPartialState });
  gameState.lastUpdated = Date.now();

  return deepClone(gameState);
}

// resetFullGame(); // Don't call resetFullGame on module load if it's meant to be a utility

/**
 * Creates and returns a new, initial game state object.
 * This function is a factory for generating a clean state for a new game instance.
 * It does not modify any internal module state.
 *
 * @param {string} [gameIdInput] - Optional. A specific game ID to use. If not provided, a new unique ID is generated.
 * @returns {object} A new game state object with all properties initialized for the start of a game. This includes:
 * - `gameId`: {string} Unique identifier for the game.
 * - `gamePhase`: {string} Initial phase, set to `GAME_PHASES.LOBBY`.
 * - `players`: {object} Player objects initialized by `initializePlayers()`, keyed by role.
 * - `deck`: {Array<object>} Empty array.
 * - `kitty`: {Array<object>} Empty array.
 * - `turnCard`: {null|object} Set to null.
 * - `trumpSuit`: {null|string} Set to null.
 * - `dealer`: {string} Default dealer, typically `PLAYER_ROLES[0]`.
 * - `currentPlayer`: {string} Default current player, typically player left of dealer (`PLAYER_ROLES[1]`).
 * - `orderUpTurn`: {null|string} Set to null.
 * - `bids`: {Array<object>} Empty array.
 * - `roundNumber`: {number} Set to 1 (for bidding).
 * - `playerWhoOrderedUp`: {null|string} Set to null.
 * - `playerWhoCalledTrump`: {null|string} Set to null.
 * - `makerTeam`: {null|string} Set to null.
 * - `goingAlone`: {boolean} Set to false.
 * - `playerGoingAlone`: {null|string} Set to null.
 * - `partnerSittingOut`: {null|string} Set to null.
 * - `currentTrick`: {Array<object>} Empty array.
 * - `leadSuit`: {null|string} Set to null.
 * - `tricksTaken`: {object} Tracks tricks for `TEAMS.TEAM_NS` and `TEAMS.TEAM_EW`, initialized to 0.
 * - `teamScores`: {object} Tracks scores for `TEAMS.TEAM_NS` and `TEAMS.TEAM_EW`, initialized to 0.
 * - `gameMessages`: {Array<object>} Empty array.
 * - `hostId`: {null|string} Set to null, to be assigned when a host creates/joins.
 * - `settings`: {object} Contains game settings like `winningScore`.
 * @property {number} settings.winningScore - Default winning score (e.g., 10).
 */
// Exported function to create a new, initial game state object
export function createInitialGameState(gameIdInput) {
  const gameId = gameIdInput || `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
    }
  };
}


export {
  resetFullGame, // Keep for now if used by anything for its side-effecting nature
  getGameState,
  updateGameState,
  // createInitialGameState, // Already exported above due to `export function`
};
