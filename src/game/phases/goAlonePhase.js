/**
 * Game logic for the "Go Alone" decision phase in Euchre.
 * @module game/phases/goAlonePhase
 */
import logger from '../../utils/logger.js';
import { updateGameState } from '../state.js';
import { GAME_PHASES, PLAYER_ROLES } from '../../config/constants.js';
import { getNextPlayer, getPartner } from '../../utils/players.js';

/**
 * Handles the decision of whether the trump-making team wants to "go alone".
 *
 * @param {object} currentGameState - The current game state object.
 * @param {string} decidingPlayerRole - The role of the player making the decision
 *                                      (should be playerWhoOrderedUp or playerWhoCalledTrump).
 * @param {boolean} wantsToGoAlone - True if the player/team decides to go alone, false otherwise.
 * @returns {{success: boolean, message: string, updatedGameState: object}}
 *          An object indicating success, a message, and the updated game state.
 *          Returns success:false if the action is invalid for the current state.
 */
export function handleGoAloneDecision(currentGameState, decidingPlayerRole, wantsToGoAlone) {
  if (!currentGameState || !currentGameState.players || typeof wantsToGoAlone !== 'boolean' || !PLAYER_ROLES.includes(decidingPlayerRole)) {
    logger.warn(
      { gameStateProvided: !!currentGameState, wantsToGoAlone, decidingPlayerRole },
      'handleGoAloneDecision: Missing or invalid arguments.'
    );
    return {
      success: false,
      message: 'Internal error: Missing data for go alone decision.',
      updatedGameState: currentGameState || {},
    };
  }

  if (currentGameState.gamePhase !== GAME_PHASES.GOING_ALONE_DECISION) {
    const message = `Cannot make "go alone" decision during ${currentGameState.gamePhase} phase.`;
    logger.warn({ currentPhase: currentGameState.gamePhase, gameId: currentGameState.gameId, decidingPlayerRole }, message);
    return { success: false, message, updatedGameState: currentGameState };
  }

  if (currentGameState.currentPlayer !== decidingPlayerRole) {
    const message = `Not ${decidingPlayerRole}'s turn to make "go alone" decision. It's ${currentGameState.currentPlayer}'s turn.`;
    logger.warn({ currentPlayer: currentGameState.currentPlayer, decidingPlayerRole, gameId: currentGameState.gameId }, message);
    return { success: false, message, updatedGameState: currentGameState };
  }

  const trumpMaker = currentGameState.playerWhoOrderedUp || currentGameState.playerWhoCalledTrump;
  if (decidingPlayerRole !== trumpMaker) {
      // This validation might be too strict if the partner of the trump maker can also make this call.
      // Current design assumes the trump maker (currentPlayer set by biddingPhase) makes the call.
      const message = `Only the player who made trump (${trumpMaker}) can decide to go alone.`;
      logger.warn({ decidingPlayerRole, trumpMaker, gameId: currentGameState.gameId }, message);
      return { success: false, message, updatedGameState: currentGameState };
  }

  try {
    const newGameState = updateGameState(prevState => {
      const playerGoingAloneActual = wantsToGoAlone ? trumpMaker : null;
      const partnerSittingOutActual = wantsToGoAlone ? getPartner(playerGoingAloneActual) : null;

      let messageText = '';
      if (wantsToGoAlone) {
        messageText = `${prevState.players[playerGoingAloneActual]?.name || playerGoingAloneActual} is going alone! ${prevState.players[partnerSittingOutActual]?.name || partnerSittingOutActual} sits out.`;
        logger.info({ gameId: prevState.gameId, playerGoingAloneActual, partnerSittingOutActual }, "Player is going alone.");
      } else {
        messageText = `Team ${prevState.makerTeam || 'Unknown'} will play with a partner.`;
         logger.info({ gameId: prevState.gameId, makerTeam: prevState.makerTeam }, "Team playing with partner.");
      }

      // Determine the first player for the PLAYING phase.
      // Usually player to the left of the dealer.
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
        currentPlayer: firstPlayerOfPlayPhase, // Player to start the first trick
        gameMessages: [...(prevState.gameMessages || []), { type: 'game_flow', text: messageText, timestamp: new Date().toISOString() }],
        // Reset currentTrick for the new playing phase
        currentTrick: [],
        leadSuit: null,
      };
    });

    return {
      success: true,
      message: wantsToGoAlone ? 'Going alone decision recorded.' : 'Playing with partner decision recorded.',
      updatedGameState: newGameState,
    };

  } catch (error) {
    logger.error({ error, decidingPlayerRole, gameId: currentGameState.gameId }, 'Error in handleGoAloneDecision during state update.');
    return {
      success: false,
      message: 'An internal error occurred while processing the "go alone" decision.',
      updatedGameState: currentGameState,
    };
  }
}
