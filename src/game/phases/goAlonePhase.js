/**
 * Game logic for the "Go Alone" decision phase in Euchre.
 * @module game/phases/goAlonePhase
 */
import logger from '../../utils/logger.js';
// Removed import of updateGameState from '../state.js';
import { GAME_PHASES, PLAYER_ROLES } from '../../config/constants.js';
import { getNextPlayer, getPartner } from '../../utils/players.js';

/**
 * Handles the decision of whether the trump-making team wants to "go alone".
 * This is now a pure function. It takes the current game state and returns the new game state
 * or throws a structured error if the action is invalid.
 *
 * @param {object} currentGameState - The current game state object.
 * @param {string} decidingPlayerRole - The role of the player making the decision.
 * @param {boolean} wantsToGoAlone - True if the player/team decides to go alone, false otherwise.
 * @returns {object} The updated game state.
 * @throws {object} Error object with message, errorType, and details.
 */
export function handleGoAloneDecision(currentGameState, decidingPlayerRole, wantsToGoAlone) {
  const gameId = currentGameState?.gameId; // For logging context

  // Enhanced input parameter validation
  if (!currentGameState || !currentGameState.players) {
    const error = { message: 'Invalid currentGameState: must be provided with players.', errorType: 'INVALID_INPUT', details: { gameStateProvided: !!currentGameState } };
    logger.error({ error, gameId, decidingPlayerRole }, "handleGoAloneDecision: Missing or invalid currentGameState.");
    throw error;
  }
  if (typeof wantsToGoAlone !== 'boolean') {
    const error = { message: 'Invalid wantsToGoAlone: must be a boolean.', errorType: 'INVALID_INPUT', details: { wantsToGoAloneType: typeof wantsToGoAlone } };
    logger.error({ error, gameId, decidingPlayerRole }, "handleGoAloneDecision: Invalid type for wantsToGoAlone.");
    throw error;
  }
  if (typeof decidingPlayerRole !== 'string' || !decidingPlayerRole.trim() || !currentGameState.players[decidingPlayerRole]) {
    const error = { message: 'Invalid decidingPlayerRole: must be a non-empty string and exist in players.', errorType: 'INVALID_INPUT', details: { decidingPlayerRole } };
    logger.error({ error, gameId, decidingPlayerRole, players: currentGameState.players }, "handleGoAloneDecision: Invalid or missing decidingPlayerRole.");
    throw error;
  }

  logger.info({ gameId, decidingPlayerRole, wantsToGoAlone }, 'Handling "go alone" decision.');
  const prevState = JSON.parse(JSON.stringify(currentGameState)); // Deep clone

  if (prevState.gamePhase !== GAME_PHASES.GOING_ALONE_DECISION) {
    const error = {
      message: `Cannot make "go alone" decision during ${prevState.gamePhase} phase.`,
      errorType: 'INVALID_PHASE',
      details: { currentPhase: prevState.gamePhase, expectedPhase: GAME_PHASES.GOING_ALONE_DECISION }
    };
    logger.warn({ error, gameId, decidingPlayerRole }, error.message);
    throw error;
  }

  if (prevState.currentPlayer !== decidingPlayerRole) {
    const error = {
      message: `Not ${decidingPlayerRole}'s turn to make "go alone" decision. It's ${prevState.currentPlayer}'s turn.`,
      errorType: 'NOT_PLAYER_TURN',
      details: { currentPlayer: prevState.currentPlayer, expectedPlayer: decidingPlayerRole }
    };
    logger.warn({ error, gameId, decidingPlayerRole }, error.message);
    throw error;
  }

  const trumpMaker = prevState.playerWhoOrderedUp || prevState.playerWhoCalledTrump;
  if (decidingPlayerRole !== trumpMaker) {
    const error = {
      message: `Only the player who made trump (${trumpMaker}) can decide to go alone.`,
      errorType: 'AUTHORIZATION_ERROR', // Or 'GAME_RULE_VIOLATION'
      details: { decidingPlayerRole, expectedPlayer: trumpMaker }
    };
    logger.warn({ error, gameId, decidingPlayerRole, trumpMaker }, error.message);
    throw error;
  }

  // Logic to determine new state based on decision
  const playerGoingAloneActual = wantsToGoAlone ? trumpMaker : null;
  const partnerSittingOutActual = wantsToGoAlone ? getPartner(playerGoingAloneActual, PLAYER_ROLES) : null; // Ensure PLAYER_ROLES is passed if getPartner needs it

  let messageText = '';
  if (wantsToGoAlone) {
    messageText = `${prevState.players[playerGoingAloneActual]?.name || playerGoingAloneActual} is going alone! ${prevState.players[partnerSittingOutActual]?.name || partnerSittingOutActual} sits out.`;
    logger.info({ gameId, playerGoingAloneActual, partnerSittingOutActual }, "Player is going alone.");
  } else {
    messageText = `Team ${prevState.makerTeam || 'Unknown'} will play with a partner.`;
    logger.info({ gameId, makerTeam: prevState.makerTeam }, "Team playing with partner.");
  }

  let firstPlayerOfPlayPhase = getNextPlayer(prevState.dealer, PLAYER_ROLES);
  if (wantsToGoAlone && partnerSittingOutActual === firstPlayerOfPlayPhase) {
    firstPlayerOfPlayPhase = getNextPlayer(firstPlayerOfPlayPhase, PLAYER_ROLES);
  }

  const updatedGameState = {
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

  logger.info({ gameId, newPhase: updatedGameState.gamePhase, currentPlayer: updatedGameState.currentPlayer }, '"Go alone" decision processed.');
  return updatedGameState;
}
