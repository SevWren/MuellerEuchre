/**
 * Game logic for the "Go Alone" decision phase in Euchre.
 * @module game/phases/goAlonePhase
 */
import logger from '../../utils/logger.js';
import { updateGameState } from '../state.js';
import { GAME_PHASES, PLAYER_ROLES } from '../../config/constants.js';
import { getNextPlayer, getPartner } from '../../utils/players.js';
import { ValidationError, InvalidPhaseError, NotPlayersTurnError, PhaseLogicError } from '../logic/errors.js';

/**
 * Handles the decision of whether the trump-making player chooses to "go alone".
 * Validates that the decision is made by the correct player and in the correct phase.
 * Updates the game state to reflect the "go alone" status, identifies the partner sitting out (if any),
 * and determines the first player for the `PLAYING` phase.
 *
 * @param {object} currentGameState - The current game state object.
 * @param {string} [currentGameState.gameId] - ID of the game (for logging).
 * @param {object} currentGameState.players - Player objects keyed by role, used to determine partner.
 * @param {string} currentGameState.gamePhase - Current phase, must be `GOING_ALONE_DECISION`.
 * @param {string} currentGameState.currentPlayer - The player whose turn it is (must be the `decidingPlayerRole`).
 * @param {string|null} currentGameState.playerWhoOrderedUp - Role of the player who ordered up.
 * @param {string|null} currentGameState.playerWhoCalledTrump - Role of the player who called trump.
 * @param {string} [currentGameState.makerTeam] - The team that made trump.
 * @param {string} currentGameState.dealer - The role of the current dealer.
 * @param {Array<object>} [currentGameState.gameMessages] - Array of game messages.
 * @param {string} decidingPlayerRole - The role of the player making the decision
 *                                      (should be the same as `playerWhoOrderedUp` or `playerWhoCalledTrump`).
 * @param {boolean} wantsToGoAlone - True if the player decides to go alone, false otherwise.
 * @returns {object} The updated game state after processing the "go alone" decision.
 * @throws {ValidationError} If basic arguments are missing or invalid (e.g., `currentGameState`, `decidingPlayerRole`).
 * @throws {InvalidPhaseError} If not in the GOING_ALONE_DECISION phase.
 * @throws {NotPlayersTurnError} If it's not the decidingPlayerRole's turn.
 * @throws {PhaseLogicError} If the deciding player is not the trump maker.
 */
export function handleGoAloneDecision(currentGameState, decidingPlayerRole, wantsToGoAlone) {
  if (!currentGameState || !currentGameState.players || typeof wantsToGoAlone !== 'boolean' || !PLAYER_ROLES.includes(decidingPlayerRole)) {
    throw new ValidationError('Internal error: Missing or invalid arguments for go alone decision.');
  }

  if (currentGameState.gamePhase !== GAME_PHASES.GOING_ALONE_DECISION) {
    throw new InvalidPhaseError(`Cannot make "go alone" decision during ${currentGameState.gamePhase} phase.`);
  }

  if (currentGameState.currentPlayer !== decidingPlayerRole) {
    throw new NotPlayersTurnError(decidingPlayerRole, currentGameState.currentPlayer);
  }

  const trumpMaker = currentGameState.playerWhoOrderedUp || currentGameState.playerWhoCalledTrump;
  if (decidingPlayerRole !== trumpMaker) {
      throw new PhaseLogicError(`Only the player who made trump (${trumpMaker}) can decide to go alone. Player ${decidingPlayerRole} attempted.`);
  }

  // The main logic of updating the state based on the decision.
  // No try-catch here as errors from updateGameState (if any) or its updater function should propagate.
  const newGameState = updateGameState(prevState => {
    const playerGoingAloneActual = wantsToGoAlone ? trumpMaker : null;
    const partnerSittingOutActual = wantsToGoAlone ? getPartner(playerGoingAloneActual, prevState.players) : null; // Pass players if getPartner needs it

    let messageText = '';
    if (wantsToGoAlone) {
      messageText = `${prevState.players[playerGoingAloneActual]?.name || playerGoingAloneActual} is going alone! ${prevState.players[partnerSittingOutActual]?.name || partnerSittingOutActual} sits out.`;
      logger.info({ gameId: prevState.gameId, playerGoingAloneActual, partnerSittingOutActual }, "Player is going alone.");
    } else {
      messageText = `Team ${prevState.makerTeam || 'Unknown'} will play with a partner.`;
      logger.info({ gameId: prevState.gameId, makerTeam: prevState.makerTeam }, "Team playing with partner.");
    }

    // Determine the first player for the PLAYING phase.
    let firstPlayerOfPlayPhase = getNextPlayer(prevState.dealer, PLAYER_ROLES);

    // If that player is the one sitting out, the player to their left starts.
    if (wantsToGoAlone && partnerSittingOutActual === firstPlayerOfPlayPhase) {
      firstPlayerOfPlayPhase = getNextPlayer(firstPlayerOfPlayPhase, PLAYER_ROLES);
    }

    return {
      ...prevState,
      goingAlone: wantsToGoAlone,
      playerGoingAlone: playerGoingAloneActual,
      partnerSittingOut: partnerSittingOutActual,
      gamePhase: GAME_PHASES.PLAYING,
      currentPlayer: firstPlayerOfPlayPhase,
      gameMessages: [...(prevState.gameMessages || []), { type: 'game_flow', text: messageText, timestamp: new Date().toISOString() }],
      currentTrick: [],
      leadSuit: null,
    };
  });

  return newGameState;
}
