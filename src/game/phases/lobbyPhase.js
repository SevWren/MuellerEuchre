/**
 * Game logic specific to the LOBBY phase.
 * @module game/phases/lobbyPhase
 */
import logger from '../../utils/logger.js';
import { updateGameState } from '../state.js';
import { GAME_PHASES, PLAYER_ROLES } from '../../config/constants.js';
import { ValidationError, InvalidPhaseError, PhaseLogicError } from '../logic/errors.js';

/**
 * Attempts to start the game from the LOBBY phase.
 * Validates if enough players are connected and transitions the game phase.
 *
 * @param {object} currentGameState - The current game state object.
 * @param {string} requestingPlayerRole - The role of the player attempting to start the game.
 * @returns {object} The updated game state.
 * @throws {ValidationError} If `currentGameState` or `requestingPlayerRole` is missing.
 * @throws {InvalidPhaseError} If the game is not in the LOBBY phase, or if phase changes unexpectedly.
 * @throws {PhaseLogicError} If not enough players are connected.
 */
export function attemptToStartGame(currentGameState, requestingPlayerRole) {
  if (!currentGameState || !currentGameState.players || !requestingPlayerRole) {
    throw new ValidationError('Internal error: Missing currentGameState or requestingPlayerRole to start game.');
  }

  if (currentGameState.gamePhase !== GAME_PHASES.LOBBY) {
    throw new InvalidPhaseError(`Game cannot be started from ${currentGameState.gamePhase} phase. Must be in LOBBY phase.`);
  }

  const connectedPlayers = PLAYER_ROLES.filter(role =>
    currentGameState.players[role] && currentGameState.players[role].isConnected
  ).length;

  const requiredPlayers = PLAYER_ROLES.length;

  if (connectedPlayers < requiredPlayers) {
    throw new PhaseLogicError(`Not enough players to start. Need ${requiredPlayers}, have ${connectedPlayers}.`);
  }

  // All conditions met, proceed to start the game
  // Removed try...catch block, errors from updateGameState or its updater should propagate.
  const newGameState = updateGameState(prevState => {
    // Concurrency check: Ensure we are working with the freshest state
    if (prevState.gamePhase !== GAME_PHASES.LOBBY) {
      logger.warn({ currentPhase: prevState.gamePhase, gameId: prevState.gameId },
        'Game phase changed unexpectedly before starting. Aborting start.');
      throw new InvalidPhaseError('Game phase changed unexpectedly before starting. Aborting start.');
    }

    const gameStartMessage = {
      type: 'system',
      text: `Game started by ${prevState.players[requestingPlayerRole]?.name || requestingPlayerRole}. Preparing to deal...`,
      timestamp: new Date().toISOString(),
    };

    return {
      ...prevState,
      gamePhase: GAME_PHASES.DEALING,
      gameMessages: [...(prevState.gameMessages || []), gameStartMessage],
      // Initialize/reset other relevant fields for a new game start
      currentPlayer: prevState.dealer, // Dealer usually starts by dealing. Or player left of dealer for first bid.
                                      // This will be set by the DEALING phase itself.
                                      // For now, just ensure phase transition.
      // TODO: Consider what other state fields should be reset or initialized here vs. in DEALING phase logic.
    };
  });

  logger.info({ gameId: newGameState.gameId, newPhase: newGameState.gamePhase, startedBy: requestingPlayerRole }, 'Game started successfully.');
  return newGameState;
}
