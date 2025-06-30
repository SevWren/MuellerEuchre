/**
 * Game logic for the "Go Alone" decision phase in Euchre.
 * @module game/phases/goAlonePhase
 */
import logger from '../../utils/logger.js';
import { GAME_PHASES, PLAYER_ROLES } from '../../config/constants.js';
import { getNextPlayer, getPartner } from '../../utils/players.js';
import { ValidationError, InvalidPhaseError, NotPlayersTurnError, PhaseLogicError } from '../logic/errors.js';

/**
 * Handles the decision of whether the trump-making team wants to "go alone".
 *
 * @param {object} currentGameState - The current game state object.
 * @param {string} decidingPlayerRole - The role of the player making the decision
 *                                      (should be playerWhoOrderedUp or playerWhoCalledTrump).
 * @param {boolean} wantsToGoAlone - True if the player/team decides to go alone, false otherwise.
 * @returns {object} The updated game state.
 * @throws {ValidationError} If basic arguments are missing or invalid.
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

  // Create a deep copy of the current game state to avoid mutating the input
  const newGameState = JSON.parse(JSON.stringify(currentGameState));
  
  // Determine the player going alone and their partner (if any)
  const playerGoingAloneActual = wantsToGoAlone ? trumpMaker : null;
  const partnerSittingOutActual = wantsToGoAlone ? getPartner(playerGoingAloneActual, newGameState.players) : null;

  // Log the decision
  let messageText = '';
  if (wantsToGoAlone) {
    messageText = `${newGameState.players[playerGoingAloneActual]?.name || playerGoingAloneActual} is going alone! ${newGameState.players[partnerSittingOutActual]?.name || partnerSittingOutActual} sits out.`;
    logger.info({ gameId: newGameState.gameId, playerGoingAloneActual, partnerSittingOutActual }, "Player is going alone.");
  } else {
    messageText = `Team ${newGameState.makerTeam || 'Unknown'} will play with a partner.`;
    logger.info({ gameId: newGameState.gameId, makerTeam: newGameState.makerTeam }, "Team playing with partner.");
  }

  // Determine the first player for the PLAYING phase
  let firstPlayerOfPlayPhase = getNextPlayer(newGameState.dealer, PLAYER_ROLES);

  // If that player is the one sitting out, the player to their left starts
  if (wantsToGoAlone && partnerSittingOutActual === firstPlayerOfPlayPhase) {
    firstPlayerOfPlayPhase = getNextPlayer(firstPlayerOfPlayPhase, PLAYER_ROLES);
  }

  // Update the new game state
  newGameState.goingAlone = wantsToGoAlone;
  newGameState.playerGoingAlone = playerGoingAloneActual;
  newGameState.partnerSittingOut = partnerSittingOutActual;
  newGameState.gamePhase = GAME_PHASES.PLAYING;
  newGameState.currentPlayer = firstPlayerOfPlayPhase;
  newGameState.gameMessages = [
    ...(newGameState.gameMessages || []), 
    { 
      type: 'game_flow', 
      text: messageText, 
      timestamp: new Date().toISOString() 
    }
  ];
  newGameState.currentTrick = [];
  newGameState.leadSuit = null;

  return newGameState;
}
