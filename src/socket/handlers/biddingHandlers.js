/**
 * Socket event handlers for bidding-related game actions.
 * @module socket/handlers/biddingHandlers
 */
import logger from '../../utils/logger.js';
import {
  handleOrderUpDecision,
  handleDealerDiscard,
  handleCallTrumpDecision
} from '../../game/phases/biddingPhase.js';
import { isValidBid, isValidDealerDiscard } from '../../game/logic/validation.js';
import { getRoleBySocketId } from '../../utils/players.js';
import { gameRepository } from '../../db/gameRepository.js';
import { GAME_EVENTS, GAME_PHASES } from '../../config/constants.js';

/**
 * Registers handlers for bidding-related socket events.
 * These handlers manage the logic for ordering up, dealer discarding, and calling trump.
 *
 * @param {import('socket.io').Socket} socket - The socket instance for the connected client.
 * @param {import('socket.io').Server} io - The Socket.IO server instance.
 */
export function registerBiddingHandlers(socket, io) {

  /**
   * Handles the 'ACTION_ORDER_UP_DECISION' event from a client.
   * This event is triggered when a player decides to order the dealer up or pass during the first bidding round.
   * Validates the decision, updates the game state via `handleOrderUpDecision` from `biddingPhase.js`,
   * persists the new state, and broadcasts it to all players in the game room.
   * Sends an acknowledgement to the client.
   *
   * @param {object} data - The payload from the client.
   * @param {string} data.gameId - The ID of the game.
   * @param {'orderUp'|'pass'} data.decision - The player's decision.
   * @param {function} ack - The acknowledgement callback to inform the client of the result.
   *                         Called with `(error, response)`: `error` is null on success.
   *                         `response` contains `{ status: 'ok'|'error', message: string }`.
   */
  socket.on(GAME_EVENTS.ACTION_ORDER_UP_DECISION, async (data, ack) => {
    ack = typeof ack === 'function' ? ack : () => {};
    if (!data || !data.gameId || typeof data.decision !== 'string') {
      logger.warn({ socketId: socket.id, dataReceived: data }, 'Invalid data for order_up_decision: gameId and decision string required.');
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Invalid decision data: gameId and decision string required.', event: GAME_EVENTS.ACTION_ORDER_UP_DECISION });
      return ack({ status: 'error', message: 'Invalid decision data: gameId and decision string required.' });
    }
    const { gameId, decision } = data;

    try {
      const currentGameState = await gameRepository.getGame(gameId);
      if (!currentGameState) {
        logger.warn({ socketId: socket.id, gameId }, `${GAME_EVENTS.ACTION_ORDER_UP_DECISION}: Game not found.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Game not found.', event: GAME_EVENTS.ACTION_ORDER_UP_DECISION });
        return ack({ status: 'error', message: 'Game not found.' });
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        logger.warn({ socketId: socket.id, gameId, event: GAME_EVENTS.ACTION_ORDER_UP_DECISION }, 'Received event from unassigned socket or player not in game.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Player role not recognized for this game.', event: GAME_EVENTS.ACTION_ORDER_UP_DECISION });
        return ack({ status: 'error', message: 'Player role not recognized for this game.'});
      }

      // Moved current player check after playerRole is confirmed valid for this game state
      if (currentGameState.currentPlayer !== playerRole) {
        logger.warn({ gameId, playerRole, expectedPlayer: currentGameState.currentPlayer }, 'Attempted bid by non-current player');
        return ack({ status: 'error', message: 'Not your turn to make a bidding decision.' });
      }

      logger.info({ socketId: socket.id, playerRole, decision, gameId }, `Received ${GAME_EVENTS.ACTION_ORDER_UP_DECISION}: ${decision}`);

      // isValidBid might be better placed after basic checks in a real scenario
      const validationResult = isValidBid(currentGameState, playerRole, decision);
      if (!validationResult.isValid) {
        logger.warn({ socketId: socket.id, playerRole, gameId, decision, reason: validationResult.message }, 'Invalid order_up_decision.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: validationResult.message, event: GAME_EVENTS.ACTION_ORDER_UP_DECISION });
        return ack({ status: 'error', message: validationResult.message });
      }

      const wantsToOrderUp = decision === 'orderUp';
      const updatedGameState = handleOrderUpDecision(currentGameState, playerRole, wantsToOrderUp);

      await gameRepository.updateGame(gameId, updatedGameState);
      io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, updatedGameState);
      logger.info({ gameId, playerRole, decision }, 'Order up decision processed, state saved and broadcasted.');
      return ack(null, { status: 'ok', message: 'Order up decision processed.' });

    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameId, decision }, `Error processing ${GAME_EVENTS.ACTION_ORDER_UP_DECISION}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: error.message || 'Error processing your decision.', event: GAME_EVENTS.ACTION_ORDER_UP_DECISION });
      return ack({ status: 'error', message: error.message || 'Error processing your decision.'});
    }
  });

  /**
   * Handles the 'ACTION_DEALER_DISCARD' event from a client.
   * This event is triggered when the dealer discards a card after being ordered up.
   * Validates the discard, updates the game state via `handleDealerDiscard` from `biddingPhase.js`,
   * persists the new state, and broadcasts it.
   * Sends an acknowledgement to the client.
   *
   * @param {object} data - The payload from the client.
   * @param {string} data.gameId - The ID of the game.
   * @param {string} data.cardId - The ID of the card the dealer is discarding.
   * @param {function} ack - The acknowledgement callback.
   */
  socket.on(GAME_EVENTS.ACTION_DEALER_DISCARD, async (data, ack) => {
    ack = typeof ack === 'function' ? ack : () => {};
    if (!data || !data.gameId || typeof data.cardId !== 'string') {
      logger.warn({ socketId: socket.id, dataReceived: data }, 'Invalid data for dealer_discard: gameId and cardId string required.');
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Invalid discard data: cardId must be a string and gameId provided.', event: GAME_EVENTS.ACTION_DEALER_DISCARD });
      return ack({ status: 'error', message: 'Invalid discard data: cardId must be a string and gameId provided.'});
    }
    const { gameId, cardId } = data;

    try {
      const currentGameState = await gameRepository.getGame(gameId);
      if (!currentGameState) {
        logger.warn({ socketId: socket.id, gameId }, `${GAME_EVENTS.ACTION_DEALER_DISCARD}: Game not found.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Game not found.', event: GAME_EVENTS.ACTION_DEALER_DISCARD });
        return ack({ status: 'error', message: 'Game not found.'});
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        logger.warn({ socketId: socket.id, gameId, event: GAME_EVENTS.ACTION_DEALER_DISCARD }, 'Received event from unassigned socket.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Player role not recognized for this game.', event: GAME_EVENTS.ACTION_DEALER_DISCARD });
        return ack({ status: 'error', message: 'Player role not recognized for this game.'});
      }

      if (playerRole !== currentGameState.dealer) {
          logger.warn({ socketId: socket.id, playerRole, gameId, dealer: currentGameState.dealer }, 'Non-dealer attempted to discard.');
          socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Only the dealer can discard.', event: GAME_EVENTS.ACTION_DEALER_DISCARD });
          return ack({ status: 'error', message: 'Only the dealer can discard.'});
      }

      if (currentGameState.gamePhase !== GAME_PHASES.DEALER_DISCARD) {
             logger.warn({ socketId: socket.id, playerRole, gameId, currentPhase: currentGameState.gamePhase }, 'Attempted discard outside of DEALER_DISCARD phase.');
            socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Not the correct game phase for dealer to discard.', event: GAME_EVENTS.ACTION_DEALER_DISCARD });
            return ack({ status: 'error', message: 'Not the correct game phase for dealer to discard.'});
      }

      const playerHand = currentGameState.players[playerRole]?.hand;
      const cardToDiscard = playerHand?.find(c => c.id === cardId);

      logger.info({ socketId: socket.id, playerRole, cardId, gameId }, `Received ${GAME_EVENTS.ACTION_DEALER_DISCARD}: ${cardId}`);

      // isValidDealerDiscard might be better placed after basic checks
      const validationResult = isValidDealerDiscard(currentGameState, playerRole, cardToDiscard, playerHand);
      if (!validationResult.isValid) {
        logger.warn({ socketId: socket.id, playerRole, gameId, cardId, reason: validationResult.message }, 'Invalid dealer_discard.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: validationResult.message, event: GAME_EVENTS.ACTION_DEALER_DISCARD });
        return ack({ status: 'error', message: validationResult.message });
      }

      const updatedGameState = handleDealerDiscard(currentGameState, playerRole, cardId);

      await gameRepository.updateGame(gameId, updatedGameState);
      io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, updatedGameState); // Corrected event name
      logger.info({ gameId, playerRole, cardId }, 'Dealer discard processed, state saved and broadcasted.');
      return ack(null, { status: 'ok', message: 'Dealer discard processed.' });

    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameId, cardId }, `Error processing ${GAME_EVENTS.ACTION_DEALER_DISCARD}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: error.message || 'Error processing your discard.', event: GAME_EVENTS.ACTION_DEALER_DISCARD });
      return ack({ status: 'error', message: error.message || 'Error processing your discard.'});
    }
  });

  /**
   * Handles the 'ACTION_CALL_TRUMP_DECISION' event from a client.
   * This event is triggered when a player decides to call a trump suit or pass during the second bidding round.
   * Validates the decision, updates the game state via `handleCallTrumpDecision` from `biddingPhase.js`,
   * persists the new state, and broadcasts it.
   * Sends an acknowledgement to the client.
   *
   * @param {object} data - The payload from the client.
   * @param {string} data.gameId - The ID of the game.
   * @param {'callTrump'|'pass'} data.decision - The player's decision.
   * @param {string} [data.suit] - The suit called as trump, if `decision` is 'callTrump'.
   * @param {function} ack - The acknowledgement callback.
   */
  socket.on(GAME_EVENTS.ACTION_CALL_TRUMP_DECISION, async (data, ack) => {
    ack = typeof ack === 'function' ? ack : () => {};
    if (!data || !data.gameId || typeof data.decision !== 'string' || (data.decision === 'callTrump' && typeof data.suit !== 'string')) {
      logger.warn({ socketId: socket.id, dataReceived: data }, 'Invalid data for call_trump_decision.');
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Invalid call trump decision data.', event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION });
      return ack({ status: 'error', message: 'Invalid call trump decision data.'});
    }
    const { gameId, decision, suit } = data;

    try {
      const currentGameState = await gameRepository.getGame(gameId);
      if (!currentGameState) {
        logger.warn({ socketId: socket.id, gameId }, `${GAME_EVENTS.ACTION_CALL_TRUMP_DECISION}: Game not found.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Game not found.', event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION });
        return ack({ status: 'error', message: 'Game not found.'});
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        logger.warn({ socketId: socket.id, gameId, event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION }, 'Received event from unassigned socket.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Player role not recognized for this game.', event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION });
        return ack({ status: 'error', message: 'Player role not recognized for this game.'});
      }

      if (currentGameState.currentPlayer !== playerRole) {
            logger.warn({ gameId, playerRole, expectedPlayer: currentGameState.currentPlayer }, 'Attempted call trump by non-current player');
            socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Not your turn to call trump.', event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION });
            return ack({ status: 'error', message: 'Not your turn to call trump.' });
      }

      if (currentGameState.gamePhase !== GAME_PHASES.ORDER_UP_ROUND2) {
            logger.warn(`Attempt to call trump outside of ORDER_UP_ROUND2 phase. Game: ${gameId}, Phase: ${currentGameState.gamePhase}`);
            socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Not the correct phase to call trump.', event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION });
            return ack({ status: 'error', message: 'Not the correct phase to call trump.' });
      }

      logger.info({ socketId: socket.id, playerRole, decision, suit, gameId }, `Received ${GAME_EVENTS.ACTION_CALL_TRUMP_DECISION}: ${decision} ${suit || ''}`);

      const validationResult = isValidBid(currentGameState, playerRole, decision, suit);
      if (!validationResult.isValid) {
        logger.warn({ socketId: socket.id, playerRole, gameId, decision, suit, reason: validationResult.message }, 'Invalid call_trump_decision.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: validationResult.message, event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION });
        return ack({ status: 'error', message: validationResult.message });
      }

      const wantsToCall = decision === 'callTrump';
      const updatedGameState = handleCallTrumpDecision(currentGameState, playerRole, wantsToCall, suit);

      await gameRepository.updateGame(gameId, updatedGameState);
      io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, updatedGameState);
      logger.info({ gameId, playerRole, decision, suit }, 'Call trump decision processed, state saved and broadcasted.');
      return ack(null, { status: 'ok', message: 'Call trump decision processed.' });

    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameId, decision, suit }, `Error processing ${GAME_EVENTS.ACTION_CALL_TRUMP_DECISION}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: error.message || 'Error processing your decision.', event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION });
      return ack({ status: 'error', message: error.message || 'Error processing your decision.'});
    }
  });
}
