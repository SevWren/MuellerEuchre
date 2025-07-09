/**
 * Game logic for the "Go Alone" decision phase in Euchre.
 * @module game/phases/goAlonePhase
 * 
 * IMPORTANT: This module should NEVER modify the constants file directly.
 * All game configuration should be handled through the game state and parameters.
 * The constants file is considered immutable and should only be imported from, never modified.
 */
import { GAME_PHASES, PLAYER_POSITIONS, PLAYER_ROLES } from "../../config/constants.js";
import { getNextPlayer, getPartner } from "../../utils/players.js";
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  PhaseLogicError,
} from "../logic/errors.js";

/**
 * Handles the decision of whether the trump-making team wants to "go alone".
 * This is a pure function that returns a new game state without mutating the input.
 *
 * @param {Object} currentGameState - The current game state
 * @param {string} decidingPlayerRole - The role of the player making the decision
 * @param {boolean} wantsToGoAlone - Whether the player wants to go alone
 * @returns {Object} The new game state with updates
 * @throws {ValidationError} If inputs are invalid
 * @throws {InvalidPhaseError} If not in GOING_ALONE_DECISION phase
 * @throws {NotPlayersTurnError} If it's not the player's turn
 * @throws {PhaseLogicError} If the player can't make this decision
 */
export function handleGoAloneDecision(
  currentGameState,
  decidingPlayerRole,
  wantsToGoAlone,
) {
  // Input validation - ensure all required parameters are provided and valid
  if (!currentGameState || !currentGameState.players || typeof currentGameState.players !== 'object') {
    throw new ValidationError('Invalid game state: missing or invalid players');
  }
  
  if (typeof decidingPlayerRole !== 'string' || !Object.values(PLAYER_POSITIONS).includes(decidingPlayerRole)) {
    throw new ValidationError('Invalid player role');
  }
  
  if (typeof wantsToGoAlone !== 'boolean') {
    throw new ValidationError('wantsToGoAlone must be a boolean');
  }

  // Phase validation - must be in the correct phase
  if (currentGameState.gamePhase !== GAME_PHASES.GAME_PHASE_GOING_ALONE_DECISION) {
    throw new InvalidPhaseError(
      `Cannot make "go alone" decision during ${currentGameState.gamePhase} phase.`
    );
  }

  // Turn validation - must be the player's turn
  if (currentGameState.currentPlayer !== decidingPlayerRole) {
    throw new NotPlayersTurnError(decidingPlayerRole, currentGameState.currentPlayer);
  }

  // Role validation - only the trump maker can decide to go alone
  const trumpMaker = currentGameState.playerWhoOrderedUp || currentGameState.playerWhoCalledTrump;
  if (!trumpMaker) {
    throw new PhaseLogicError('Cannot determine trump maker');
  }
  
  if (decidingPlayerRole !== trumpMaker) {
    throw new PhaseLogicError(
      `Only the player who made trump (${trumpMaker}) can decide to go alone. Player ${decidingPlayerRole} attempted.`
    );
  }

  // Create a deep copy of the current game state to avoid mutating the input
  // Note: In a real implementation, you might want to use a more efficient deep clone
  // or an immutable data structure library for better performance with large objects
  const newGameState = {
    ...currentGameState,
    // Override only the properties that need to change
    goingAlone: wantsToGoAlone,
    playerGoingAlone: wantsToGoAlone ? trumpMaker : null,
    partnerSittingOut: wantsToGoAlone ? getPartner(trumpMaker, currentGameState.players) : null,
    gamePhase: GAME_PHASES.GAME_PHASE_PLAYING,
    currentTrick: [],
    leadSuit: null,
    // Create a new array for game messages to avoid mutation
    gameMessages: [
      ...(currentGameState.gameMessages || []),
      {
        type: 'game_flow',
        text: wantsToGoAlone
          ? `${currentGameState.players[trumpMaker]?.name || trumpMaker} is going alone! ` +
            `${currentGameState.players[getPartner(trumpMaker, currentGameState.players)]?.name || 'Partner'} sits out.`
          : `${currentGameState.players[trumpMaker]?.name || trumpMaker} chooses to play with a partner.`,
        timestamp: new Date().toISOString()
      }
    ]
  };

  // Determine the first player for the PLAYING phase - use PLAYER_ROLES to maintain correct order
  let firstPlayer = getNextPlayer(newGameState.dealer, PLAYER_ROLES);

  // If that player is the one sitting out, the player to their left starts
  if (wantsToGoAlone && newGameState.partnerSittingOut === firstPlayer) {
    firstPlayer = getNextPlayer(firstPlayer, PLAYER_ROLES);
  }

  // Set the current player for the next phase
  newGameState.currentPlayer = firstPlayer;

  return newGameState;
}
