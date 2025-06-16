/**
 * Socket event handlers for bidding-related game actions.
 * @module socket/handlers/biddingHandlers
 */
import logger from '../../utils/logger.js';
import { getGameState } from '../../game/state.js';
import {
  handleOrderUpDecision,
  handleDealerDiscard,
  handleCallTrumpDecision
} from '../../game/phases/biddingPhase.js';
import { isValidBid, isValidDealerDiscard } from '../../game/logic/validation.js';
import { getRoleBySocketId } from '../../utils/players.js';
// import { GAME_EVENTS } from '../../config/constants.js'; // If event names become constants

/**
 * Registers bidding-specific event handlers for a given socket.
 * @param {object} socket - The Socket.IO socket instance for a client.
 * @param {object} io - The Socket.IO server instance.
 */
export function registerBiddingHandlers(socket, io) {
  const eventPrefix = 'action_'; // Consistent prefix for client actions

  /**
   * Handles 'action_order_up_decision' from a client.
   * Expected data: { decision: 'orderUp' | 'pass' }
   */
  socket.on(`${eventPrefix}order_up_decision`, (data) => {
    const currentGameState = getGameState();
    const playerRole = getRoleBySocketId(currentGameState, socket.id);

    if (!playerRole) {
      logger.warn({ socketId: socket.id, event: 'order_up_decision' }, 'Received event from unassigned socket.');
      socket.emit('action_error', { message: 'Player role not recognized. Please rejoin.', event: 'order_up_decision' });
      return;
    }

    if (!data || typeof data.decision !== 'string') {
        logger.warn({ socketId: socket.id, playerRole, data }, 'Invalid data for order_up_decision.');
        socket.emit('action_error', { message: 'Invalid decision data.', event: 'order_up_decision' });
        return;
    }
    const { decision } = data; // decision is 'orderUp' or 'pass'

    logger.info({ socketId: socket.id, playerRole, decision, gameId: currentGameState.gameId }, `Received order_up_decision: ${decision}`);

    const validationResult = isValidBid(currentGameState, playerRole, decision);
    if (!validationResult.isValid) {
      logger.warn({ socketId: socket.id, playerRole, decision, reason: validationResult.message }, 'Invalid order_up_decision.');
      socket.emit('action_error', { message: validationResult.message, event: 'order_up_decision' });
      return;
    }

    try {
      const wantsToOrderUp = decision === 'orderUp';
      const updatedGameState = handleOrderUpDecision(currentGameState, playerRole, wantsToOrderUp);
      io.emit('gameState', updatedGameState);
      logger.info({ gameId: updatedGameState.gameId, playerRole, decision }, 'Order up decision processed and state broadcasted.');
    } catch (error) {
      logger.error({ err: error, socketId: socket.id, playerRole, decision }, 'Error processing order_up_decision.');
      socket.emit('action_error', { message: error.message || 'Error processing your decision.', event: 'order_up_decision' });
    }
  });

  /**
   * Handles 'action_dealer_discard' from a client.
   * Expected data: { cardId: string } (ID of the card to discard)
   */
  socket.on(`${eventPrefix}dealer_discard`, (data) => {
    const currentGameState = getGameState();
    const playerRole = getRoleBySocketId(currentGameState, socket.id);

    if (!playerRole) {
      logger.warn({ socketId: socket.id, event: 'dealer_discard' }, 'Received event from unassigned socket.');
      socket.emit('action_error', { message: 'Player role not recognized. Please rejoin.', event: 'dealer_discard' });
      return;
    }

    if (!data || typeof data.cardId !== 'string') {
        logger.warn({ socketId: socket.id, playerRole, data }, 'Invalid data for dealer_discard: cardId missing or not a string.');
        socket.emit('action_error', { message: 'Invalid discard data: cardId must be a string.', event: 'dealer_discard' });
        return;
    }
    const { cardId } = data;

    // Ensure player is the dealer
    if (playerRole !== currentGameState.dealer) {
        logger.warn({ socketId: socket.id, playerRole, dealer: currentGameState.dealer }, 'Non-dealer attempted to discard.');
        socket.emit('action_error', { message: 'Only the dealer can discard.', event: 'dealer_discard' });
        return;
    }

    const playerHand = currentGameState.players[playerRole]?.hand;
    const cardToDiscard = playerHand?.find(c => c.id === cardId);

    logger.info({ socketId: socket.id, playerRole, cardId, gameId: currentGameState.gameId }, `Received dealer_discard: ${cardId}`);

    const validationResult = isValidDealerDiscard(currentGameState, playerRole, cardToDiscard, playerHand);
    if (!validationResult.isValid) {
      logger.warn({ socketId: socket.id, playerRole, cardId, reason: validationResult.message }, 'Invalid dealer_discard.');
      socket.emit('action_error', { message: validationResult.message, event: 'dealer_discard' });
      return;
    }

    try {
      const updatedGameState = handleDealerDiscard(currentGameState, playerRole, cardId);
      io.emit('gameState', updatedGameState);
      logger.info({ gameId: updatedGameState.gameId, playerRole, cardId }, 'Dealer discard processed and state broadcasted.');
    } catch (error) {
      logger.error({ err: error, socketId: socket.id, playerRole, cardId }, 'Error processing dealer_discard.');
      socket.emit('action_error', { message: error.message || 'Error processing your discard.', event: 'dealer_discard' });
    }
  });

  /**
   * Handles 'action_call_trump_decision' from a client.
   * Expected data: { decision: 'callTrump' | 'pass', suit?: string }
   */
  socket.on(`${eventPrefix}call_trump_decision`, (data) => {
    const currentGameState = getGameState();
    const playerRole = getRoleBySocketId(currentGameState, socket.id);

    if (!playerRole) {
      logger.warn({ socketId: socket.id, event: 'call_trump_decision' }, 'Received event from unassigned socket.');
      socket.emit('action_error', { message: 'Player role not recognized. Please rejoin.', event: 'call_trump_decision' });
      return;
    }

    if (!data || typeof data.decision !== 'string' || (data.decision === 'callTrump' && typeof data.suit !== 'string') ) {
        logger.warn({ socketId: socket.id, playerRole, data }, 'Invalid data for call_trump_decision.');
        socket.emit('action_error', { message: 'Invalid call trump decision data.', event: 'call_trump_decision' });
        return;
    }
    const { decision, suit } = data; // suit may be undefined if decision is 'pass'

    logger.info({ socketId: socket.id, playerRole, decision, suit, gameId: currentGameState.gameId }, `Received call_trump_decision: ${decision} ${suit || ''}`);

    const validationResult = isValidBid(currentGameState, playerRole, decision, suit);
    if (!validationResult.isValid) {
      logger.warn({ socketId: socket.id, playerRole, decision, suit, reason: validationResult.message }, 'Invalid call_trump_decision.');
      socket.emit('action_error', { message: validationResult.message, event: 'call_trump_decision' });
      return;
    }

    try {
      const wantsToCall = decision === 'callTrump';
      const updatedGameState = handleCallTrumpDecision(currentGameState, playerRole, wantsToCall, suit);
      io.emit('gameState', updatedGameState);
      logger.info({ gameId: updatedGameState.gameId, playerRole, decision, suit }, 'Call trump decision processed and state broadcasted.');
    } catch (error) {
      logger.error({ err: error, socketId: socket.id, playerRole, decision, suit }, 'Error processing call_trump_decision.');
      socket.emit('action_error', { message: error.message || 'Error processing your decision.', event: 'call_trump_decision' });
    }
  });
}
