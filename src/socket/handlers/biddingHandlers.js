/**
 * Socket event handlers for bidding-related game actions.
 * @module socket/handlers/biddingHandlers
 */
import logger from '../../utils/logger.js';
// import { getGameState } from '../../game/state.js'; // No longer using global state
import {
  handleOrderUpDecision,
  handleDealerDiscard,
  handleCallTrumpDecision
} from '../../game/phases/biddingPhase.js';
import { isValidBid, isValidDealerDiscard } from '../../game/logic/validation.js';
import { getRoleBySocketId } from '../../utils/players.js';
import { getGame, updateGame } from '../../db/gameRepository.js';
import { GAME_EVENTS } from '../../config/constants.js';

/**
 * Registers bidding-specific event handlers for a given socket.
 * @param {object} socket - The Socket.IO socket instance for a client.
 * @param {object} io - The Socket.IO server instance.
 */
export function registerBiddingHandlers(socket, io) {

  /**
   * Handles 'action_order_up_decision' from a client.
   * Expected data: { gameId: string, decision: 'orderUp' | 'pass' }
   */
  socket.on(GAME_EVENTS.ACTION_ORDER_UP_DECISION, async (data) => {
    if (!data || !data.gameId || typeof data.decision !== 'string') {
      logger.warn({ socketId: socket.id, dataReceived: data }, 'Invalid data for order_up_decision.');
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Invalid decision data: gameId and decision string required.', event: GAME_EVENTS.ACTION_ORDER_UP_DECISION });
      return;
    }
    const { gameId, decision } = data;

    try {
      const currentGameState = await getGame(gameId);
      if (!currentGameState) {
        logger.warn({ socketId: socket.id, gameId }, `${GAME_EVENTS.ACTION_ORDER_UP_DECISION}: Game not found.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Game not found.', event: GAME_EVENTS.ACTION_ORDER_UP_DECISION });
        return;
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        logger.warn({ socketId: socket.id, gameId, event: GAME_EVENTS.ACTION_ORDER_UP_DECISION }, 'Received event from unassigned socket.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Player role not recognized for this game.', event: GAME_EVENTS.ACTION_ORDER_UP_DECISION });
        return;
      }

      logger.info({ socketId: socket.id, playerRole, decision, gameId }, `Received ${GAME_EVENTS.ACTION_ORDER_UP_DECISION}: ${decision}`);

      const validationResult = isValidBid(currentGameState, playerRole, decision);
      if (!validationResult.isValid) {
        logger.warn({ socketId: socket.id, playerRole, gameId, decision, reason: validationResult.message }, 'Invalid order_up_decision.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: validationResult.message, event: GAME_EVENTS.ACTION_ORDER_UP_DECISION });
        return;
      }

      const wantsToOrderUp = decision === 'orderUp';
      const updatedGameState = handleOrderUpDecision(currentGameState, playerRole, wantsToOrderUp);

      await updateGame(gameId, updatedGameState);
      io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, updatedGameState);
      logger.info({ gameId, playerRole, decision }, 'Order up decision processed, state saved and broadcasted.');

    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameId, decision }, `Error processing ${GAME_EVENTS.ACTION_ORDER_UP_DECISION}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: error.message || 'Error processing your decision.', event: GAME_EVENTS.ACTION_ORDER_UP_DECISION });
    }
  });

  /**
   * Handles 'action_dealer_discard' from a client.
   * Expected data: { gameId: string, cardId: string } (ID of the card to discard)
   */
  socket.on(GAME_EVENTS.ACTION_DEALER_DISCARD, async (data) => {
    if (!data || !data.gameId || typeof data.cardId !== 'string') {
      logger.warn({ socketId: socket.id, dataReceived: data }, 'Invalid data for dealer_discard: gameId and cardId string required.');
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Invalid discard data: cardId must be a string and gameId provided.', event: GAME_EVENTS.ACTION_DEALER_DISCARD });
      return;
    }
    const { gameId, cardId } = data;

    try {
      const currentGameState = await getGame(gameId);
      if (!currentGameState) {
        logger.warn({ socketId: socket.id, gameId }, `${GAME_EVENTS.ACTION_DEALER_DISCARD}: Game not found.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Game not found.', event: GAME_EVENTS.ACTION_DEALER_DISCARD });
        return;
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        logger.warn({ socketId: socket.id, gameId, event: GAME_EVENTS.ACTION_DEALER_DISCARD }, 'Received event from unassigned socket.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Player role not recognized for this game.', event: GAME_EVENTS.ACTION_DEALER_DISCARD });
        return;
      }

      if (playerRole !== currentGameState.dealer) {
          logger.warn({ socketId: socket.id, playerRole, gameId, dealer: currentGameState.dealer }, 'Non-dealer attempted to discard.');
          socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Only the dealer can discard.', event: GAME_EVENTS.ACTION_DEALER_DISCARD });
          return;
      }

      const playerHand = currentGameState.players[playerRole]?.hand;
      const cardToDiscard = playerHand?.find(c => c.id === cardId);

      logger.info({ socketId: socket.id, playerRole, cardId, gameId }, `Received ${GAME_EVENTS.ACTION_DEALER_DISCARD}: ${cardId}`);

      const validationResult = isValidDealerDiscard(currentGameState, playerRole, cardToDiscard, playerHand);
      if (!validationResult.isValid) {
        logger.warn({ socketId: socket.id, playerRole, gameId, cardId, reason: validationResult.message }, 'Invalid dealer_discard.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: validationResult.message, event: GAME_EVENTS.ACTION_DEALER_DISCARD });
        return;
      }

      const updatedGameState = handleDealerDiscard(currentGameState, playerRole, cardId);

      await updateGame(gameId, updatedGameState);
      io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, updatedGameState);
      logger.info({ gameId, playerRole, cardId }, 'Dealer discard processed, state saved and broadcasted.');

    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameId, cardId }, `Error processing ${GAME_EVENTS.ACTION_DEALER_DISCARD}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: error.message || 'Error processing your discard.', event: GAME_EVENTS.ACTION_DEALER_DISCARD });
    }
  });

  /**
   * Handles 'action_call_trump_decision' from a client.
   * Expected data: { gameId: string, decision: 'callTrump' | 'pass', suit?: string }
   */
  socket.on(GAME_EVENTS.ACTION_CALL_TRUMP_DECISION, async (data) => {
    if (!data || !data.gameId || typeof data.decision !== 'string' || (data.decision === 'callTrump' && typeof data.suit !== 'string')) {
      logger.warn({ socketId: socket.id, dataReceived: data }, 'Invalid data for call_trump_decision.');
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Invalid call trump decision data.', event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION });
      return;
    }
    const { gameId, decision, suit } = data;

    try {
      const currentGameState = await getGame(gameId);
      if (!currentGameState) {
        logger.warn({ socketId: socket.id, gameId }, `${GAME_EVENTS.ACTION_CALL_TRUMP_DECISION}: Game not found.`);
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Game not found.', event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION });
        return;
      }

      const playerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!playerRole) {
        logger.warn({ socketId: socket.id, gameId, event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION }, 'Received event from unassigned socket.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Player role not recognized for this game.', event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION });
        return;
      }

      logger.info({ socketId: socket.id, playerRole, decision, suit, gameId }, `Received ${GAME_EVENTS.ACTION_CALL_TRUMP_DECISION}: ${decision} ${suit || ''}`);

      const validationResult = isValidBid(currentGameState, playerRole, decision, suit);
      if (!validationResult.isValid) {
        logger.warn({ socketId: socket.id, playerRole, gameId, decision, suit, reason: validationResult.message }, 'Invalid call_trump_decision.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: validationResult.message, event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION });
        return;
      }

      const wantsToCall = decision === 'callTrump';
      const updatedGameState = handleCallTrumpDecision(currentGameState, playerRole, wantsToCall, suit);

      await updateGame(gameId, updatedGameState);
      io.to(gameId).emit(GAME_EVENTS.GAME_STATE_UPDATE, updatedGameState);
      logger.info({ gameId, playerRole, decision, suit }, 'Call trump decision processed, state saved and broadcasted.');

    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameId, decision, suit }, `Error processing ${GAME_EVENTS.ACTION_CALL_TRUMP_DECISION}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: error.message || 'Error processing your decision.', event: GAME_EVENTS.ACTION_CALL_TRUMP_DECISION });
    }
  });
}

// Conceptual notes for biddingHandlers.js tests:
// describe('Bidding Handlers', () => {
//   // ... (mock socket, io, getGame, updateGame, phase logic functions)
//   it('should process order_up_decision, save state, and broadcast', async () => {
//     // Setup: mock getGame, handleOrderUpDecision
//     // Action: Simulate ACTION_ORDER_UP_DECISION
//     // Assert: updateGame called, io.to(gameId).emit called.
//   });
//   it('should process dealer_discard, save state, and broadcast', async () => {
//     // Setup: mock getGame, handleDealerDiscard
//     // Action: Simulate ACTION_DEALER_DISCARD
//     // Assert: updateGame called, io.to(gameId).emit called.
//   });
//   it('should process call_trump_decision, save state, and broadcast', async () => {
//     // Setup: mock getGame, handleCallTrumpDecision
//     // Action: Simulate ACTION_CALL_TRUMP_DECISION
//     // Assert: updateGame called, io.to(gameId).emit called.
//   });
//   // ... tests for invalid data, game not found, player not in game, validation failures, errors during phase logic.
// });
