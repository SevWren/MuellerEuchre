/**
 * Socket event handlers for bidding-related game actions.
 * @module socket/handlers/biddingHandlers
 */
import logger from '../../utils/logger.js';
import { SUITS } from '../../config/constants.js'; // Import SUITS
import {
  handleOrderUpDecision,
  handleDealerDiscard,
  handleCallTrumpDecision,
} from '../../game/phases/biddingPhase.js';
import { isValidBid, isValidDealerDiscard } from '../../game/logic/validation.js';
import { getRoleBySocketId } from '../../utils/players.js';
import { gameRepository } from '../../db/gameRepository.js';
import { GAME_EVENTS, GAME_PHASES } from '../../config/constants.js';

// Helper to create standardized error objects
const createErrorObject = (action, errorType, message, details) => ({
  action,
  errorType,
  message,
  details,
});

export function registerBiddingHandlers(socket, io) {
  socket.on(GAME_EVENTS.ACTION_ORDER_UP_DECISION, async (data, ack) => {
    ack = typeof ack === 'function' ? ack : () => {};
    const action = GAME_EVENTS.ACTION_ORDER_UP_DECISION;

    if (!data || !data.gameId || typeof data.decision !== 'string') {
      const error = createErrorObject(action, 'INVALID_INPUT', 'Invalid decision data: gameId and decision string required.', { receivedData: data });
      logger.warn({ socketId: socket.id, error, gameId: data?.gameId }, `Validation error for ${action}`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, error);
      return ack({ status: 'error', error });
    }

    const { gameId, decision } = data;

    // Enhanced input validation for decision
    if (decision !== 'orderUp' && decision !== 'pass') {
      const error = createErrorObject(action, 'INVALID_DECISION', "Decision must be 'orderUp' or 'pass'.", { decision });
      logger.warn({ socketId: socket.id, error, gameId }, `Validation error for ${action}`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, error);
      return ack({ status: 'error', error });
    }

    try {
      const currentGameState = await gameRepository.getGame(gameId);
      if (!currentGameState) {
        const error = createErrorObject(action, 'GAME_NOT_FOUND', 'Game not found.', { gameId });
        logger.warn({ socketId: socket.id, error, gameId }, `${action}: Game not found.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        const error = createErrorObject(action, 'PLAYER_NOT_IN_GAME', 'Player role not recognized for this game.', { socketId: socket.id });
        logger.warn({ socketId: socket.id, error, gameId }, `Received ${action} from unassigned socket or player not in game.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      if (currentGameState.currentPlayer !== playerRole) {
        const error = createErrorObject(action, 'NOT_CURRENT_PLAYER', 'Not your turn to make a bidding decision.', { currentPlayer: currentGameState.currentPlayer, playerRole });
        logger.warn({ socketId: socket.id, error, gameId, playerRole, expectedPlayer: currentGameState.currentPlayer }, `Attempted ${action} by non-current player.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error); // Emit to socket for consistency, though ack handles it for the client
        return ack({ status: 'error', error });
      }

      logger.info({ socketId: socket.id, playerRole, decision, gameId }, `Received ${action}: ${decision}`);

      const validationResult = isValidBid(currentGameState, playerRole, decision);
      if (!validationResult.isValid) {
        const error = createErrorObject(action, 'INVALID_BID', validationResult.message, { decision });
        logger.warn({ socketId: socket.id, error, gameId, playerRole, decision, reason: validationResult.message }, `Invalid ${action}.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      const wantsToOrderUp = decision === 'orderUp';
      const updatedGameState = handleOrderUpDecision(currentGameState, playerRole, wantsToOrderUp);

      await gameRepository.updateGame(gameId, updatedGameState);
      io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, updatedGameState);
      logger.info({ gameId, playerRole, decision }, `${action} processed, state saved and broadcasted.`);
      return ack(null, { status: 'ok', message: 'Order up decision processed.' });

    } catch (e) {
      const error = createErrorObject(action, 'INTERNAL_SERVER_ERROR', e.message || 'Error processing your decision.', { stack: e.stack });
      logger.error({ err: e, socketId: socket.id, gameId, decision, action }, `Error processing ${action}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, error);
      return ack({ status: 'error', error });
    }
  });

  socket.on(GAME_EVENTS.ACTION_DEALER_DISCARD, async (data, ack) => {
    ack = typeof ack === 'function' ? ack : () => {};
    const action = GAME_EVENTS.ACTION_DEALER_DISCARD;

    if (!data || !data.gameId || typeof data.cardId !== 'string') {
      const error = createErrorObject(action, 'INVALID_INPUT', 'Invalid discard data: gameId and cardId string required.', { receivedData: data });
      logger.warn({ socketId: socket.id, error, gameId: data?.gameId }, `Validation error for ${action}`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, error);
      return ack({ status: 'error', error });
    }
    const { gameId, cardId } = data;

    try {
      const currentGameState = await gameRepository.getGame(gameId);
      if (!currentGameState) {
        const error = createErrorObject(action, 'GAME_NOT_FOUND', 'Game not found.', { gameId });
        logger.warn({ socketId: socket.id, error, gameId }, `${action}: Game not found.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        const error = createErrorObject(action, 'PLAYER_NOT_IN_GAME', 'Player role not recognized for this game.', { socketId: socket.id });
        logger.warn({ socketId: socket.id, error, gameId }, `Received ${action} from unassigned socket.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      if (playerRole !== currentGameState.dealer) {
        const error = createErrorObject(action, 'NOT_DEALER', 'Only the dealer can discard.', { playerRole, dealer: currentGameState.dealer });
        logger.warn({ socketId: socket.id, error, gameId, playerRole, dealer: currentGameState.dealer }, `Non-dealer attempted ${action}.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      if (currentGameState.gamePhase !== GAME_PHASES.DEALER_DISCARD) {
        const error = createErrorObject(action, 'INVALID_PHASE', 'Not the correct game phase for dealer to discard.', { currentPhase: currentGameState.gamePhase });
        logger.warn({ socketId: socket.id, error, gameId, playerRole, currentPhase: currentGameState.gamePhase }, `Attempted ${action} outside of DEALER_DISCARD phase.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      const playerHand = currentGameState.players[playerRole]?.hand;
      const cardToDiscard = playerHand?.find(c => c.id === cardId);

      logger.info({ socketId: socket.id, playerRole, cardId, gameId }, `Received ${action}: ${cardId}`);

      const validationResult = isValidDealerDiscard(currentGameState, playerRole, cardToDiscard, playerHand);
      if (!validationResult.isValid) {
        const error = createErrorObject(action, 'INVALID_DISCARD', validationResult.message, { cardId });
        logger.warn({ socketId: socket.id, error, gameId, playerRole, cardId, reason: validationResult.message }, `Invalid ${action}.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      const updatedGameState = handleDealerDiscard(currentGameState, playerRole, cardId);

      await gameRepository.updateGame(gameId, updatedGameState);
      io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, updatedGameState); // Note: Original code used GAME_STATE_UPDATE, not STATE_UPDATE. Kept original.
      logger.info({ gameId, playerRole, cardId }, `${action} processed, state saved and broadcasted.`);
      return ack(null, { status: 'ok', message: 'Dealer discard processed.' });

    } catch (e) {
      const error = createErrorObject(action, 'INTERNAL_SERVER_ERROR', e.message || 'Error processing your discard.', { stack: e.stack });
      logger.error({ err: e, socketId: socket.id, gameId, cardId, action }, `Error processing ${action}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, error);
      return ack({ status: 'error', error });
    }
  });

  socket.on(GAME_EVENTS.ACTION_CALL_TRUMP_DECISION, async (data, ack) => {
    ack = typeof ack === 'function' ? ack : () => {};
    const action = GAME_EVENTS.ACTION_CALL_TRUMP_DECISION;

    // Initial data presence check
    if (!data || !data.gameId || typeof data.decision !== 'string') {
      const error = createErrorObject(action, 'INVALID_INPUT', 'Invalid call trump decision data: gameId and decision string required.', { receivedData: data });
      logger.warn({ socketId: socket.id, error, gameId: data?.gameId }, `Validation error for ${action}`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, error);
      return ack({ status: 'error', error });
    }

    const { gameId, decision, suit } = data;

    // Enhanced input validation for decision
    if (decision !== 'callTrump' && decision !== 'pass') {
      const error = createErrorObject(action, 'INVALID_DECISION', "Decision must be 'callTrump' or 'pass'.", { decision });
      logger.warn({ socketId: socket.id, error, gameId }, `Validation error for ${action}`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, error);
      return ack({ status: 'error', error });
    }

    // Enhanced input validation for suit (if decision is 'callTrump')
    if (decision === 'callTrump') {
      if (typeof suit !== 'string' || !Object.values(SUITS).includes(suit)) {
        const error = createErrorObject(action, 'INVALID_SUIT', 'Invalid suit provided for calling trump.', { suit, validSuits: Object.values(SUITS) });
        logger.warn({ socketId: socket.id, error, gameId, decision }, `Validation error for ${action}: Invalid suit.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }
    }


    try {
      const currentGameState = await gameRepository.getGame(gameId);
      if (!currentGameState) {
        const error = createErrorObject(action, 'GAME_NOT_FOUND', 'Game not found.', { gameId });
        logger.warn({ socketId: socket.id, error, gameId }, `${action}: Game not found.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        const error = createErrorObject(action, 'PLAYER_NOT_IN_GAME', 'Player role not recognized for this game.', { socketId: socket.id });
        logger.warn({ socketId: socket.id, error, gameId }, `Received ${action} from unassigned socket.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      if (currentGameState.currentPlayer !== playerRole) {
        const error = createErrorObject(action, 'NOT_CURRENT_PLAYER', 'Not your turn to call trump.', { currentPlayer: currentGameState.currentPlayer, playerRole });
        logger.warn({ socketId: socket.id, error, gameId, playerRole, expectedPlayer: currentGameState.currentPlayer }, `Attempted ${action} by non-current player.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      if (currentGameState.gamePhase !== GAME_PHASES.ORDER_UP_ROUND2) {
        const error = createErrorObject(action, 'INVALID_PHASE', 'Not the correct phase to call trump.', { currentPhase: currentGameState.gamePhase });
        logger.warn({ socketId: socket.id, error, gameId, playerRole, currentPhase: currentGameState.gamePhase }, `Attempt to ${action} outside of ORDER_UP_ROUND2 phase.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      logger.info({ socketId: socket.id, playerRole, decision, suit, gameId }, `Received ${action}: ${decision} ${suit || ''}`);

      // The existing isValidBid should handle the logic for whether calling a suit is valid in context
      const validationResult = isValidBid(currentGameState, playerRole, decision, suit);
      if (!validationResult.isValid) {
        const error = createErrorObject(action, 'INVALID_BID', validationResult.message, { decision, suit });
        logger.warn({ socketId: socket.id, error, gameId, playerRole, decision, suit, reason: validationResult.message }, `Invalid ${action}.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, error);
        return ack({ status: 'error', error });
      }

      const wantsToCall = decision === 'callTrump';
      const updatedGameState = handleCallTrumpDecision(currentGameState, playerRole, wantsToCall, suit);

      await gameRepository.updateGame(gameId, updatedGameState);
      io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, updatedGameState);
      logger.info({ gameId, playerRole, decision, suit }, `${action} processed, state saved and broadcasted.`);
      return ack(null, { status: 'ok', message: 'Call trump decision processed.' });

    } catch (e) {
      const error = createErrorObject(action, 'INTERNAL_SERVER_ERROR', e.message || 'Error processing your decision.', { stack: e.stack });
      logger.error({ err: e, socketId: socket.id, gameId, decision, suit, action }, `Error processing ${action}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, error);
      return ack({ status: 'error', error });
    }
  });
}
