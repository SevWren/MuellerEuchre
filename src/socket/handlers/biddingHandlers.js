// src/socket/handlers/biddingHandlers.js
import { getGameState, updateGameState } from "../../game/state.js";
import { gameRepository } from "../../db/gameRepository.js";
import {
  handleOrderUpDecision,
  handleDealerDiscard,
  handleCallTrumpDecision,
} from "../../game/phases/biddingPhase.js";
import { validateBid, validateDealerDiscard } from "../../game/logic/validation-core.js";
import { GAME_EVENTS } from "../../config/constants.js";
import logger from "../../utils/logger.js";

/**
 * Registers handlers for bidding phase actions.
 * @param {object} socket The socket instance for the client.
 * @param {object} io The Socket.IO server instance.
 */
export function registerBiddingHandlers(socket, io) {
  const injection = { validateBid, validateDealerDiscard };

  socket.on(
    GAME_EVENTS.ACTION_ORDER_UP_DECISION,
    async ({ gameId, playerRole, decision }, callback) => {
      try {
        if (!gameId || !playerRole || decision === undefined) {
          const errorMsg = "Invalid payload for ACTION_ORDER_UP_DECISION";
          logger.warn(`[Game ID: ${gameId}] ${errorMsg}`, { gameId, playerRole, decision });
          if (callback) callback({ status: "error", message: errorMsg });
          return;
        }

        logger.info(`[Game ID: ${gameId}] Received ACTION_ORDER_UP_DECISION from ${playerRole}`);

        let gameState = getGameState(gameId);
        if (!gameState) {
            logger.info(`[Game ID: ${gameId}] Game not in memory, attempting to hydrate from DB.`);
            gameState = await gameRepository.getGame(gameId);
            if (gameState) {
                 updateGameState(gameId, () => gameState);
            }
        }
        if (!gameState) {
            const errorMsg = "Game not found.";
            logger.error(`[Game ID: ${gameId}] ${errorMsg}`);
            if (callback) callback({ status: "error", message: errorMsg });
            return;
        }

        const newGameState = updateGameState(gameId, (currentState) =>
          handleOrderUpDecision.call(injection, currentState, playerRole, decision)
        );

        await gameRepository.updateGame(gameId, newGameState);

        io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, newGameState);
        logger.info(`[Game ID: ${gameId}] Emitted ${GAME_EVENTS.STATE_UPDATE} after order up decision.`);

        if (callback) callback({ status: "ok" });
      } catch (error) {
        logger.error(`[Game ID: ${gameId}] Error in ACTION_ORDER_UP_DECISION handler: ${error.message}`, { error });
        if (callback) callback({ status: "error", message: error.message });
      }
    }
  );

  socket.on(
    GAME_EVENTS.ACTION_DEALER_DISCARD,
    async ({ gameId, playerRole, cardId }, callback) => {
      try {
        if (!gameId || !playerRole || !cardId) {
          const errorMsg = "Invalid payload for ACTION_DEALER_DISCARD";
          logger.warn(`[Game ID: ${gameId}] ${errorMsg}`, { gameId, playerRole, cardId });
          if (callback) callback({ status: "error", message: errorMsg });
          return;
        }

        logger.info(`[Game ID: ${gameId}] Received ACTION_DEALER_DISCARD from ${playerRole}`);

        let gameState = getGameState(gameId);
         if (!gameState) {
            logger.info(`[Game ID: ${gameId}] Game not in memory, attempting to hydrate from DB.`);
            gameState = await gameRepository.getGame(gameId);
            if (gameState) {
                 updateGameState(gameId, () => gameState);
            }
        }
        if (!gameState) {
            const errorMsg = "Game not found.";
            logger.error(`[Game ID: ${gameId}] ${errorMsg}`);
            if (callback) callback({ status: "error", message: errorMsg });
            return;
        }

        const newGameState = updateGameState(gameId, (currentState) =>
          handleDealerDiscard.call(injection, currentState, playerRole, cardId)
        );

        await gameRepository.updateGame(gameId, newGameState);

        io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, newGameState);
        logger.info(`[Game ID: ${gameId}] Emitted ${GAME_EVENTS.STATE_UPDATE} after dealer discard.`);

        if (callback) callback({ status: "ok" });
      } catch (error) {
        logger.error(`[Game ID: ${gameId}] Error in ACTION_DEALER_DISCARD handler: ${error.message}`, { error });
        if (callback) callback({ status: "error", message: error.message });
      }
    }
  );

  socket.on(
    GAME_EVENTS.ACTION_CALL_TRUMP_DECISION,
    async ({ gameId, playerRole, decision, suit }, callback) => {
      try {
        if (!gameId || !playerRole || decision === undefined) {
          const errorMsg = "Invalid payload for ACTION_CALL_TRUMP_DECISION";
          logger.warn(`[Game ID: ${gameId}] ${errorMsg}`, { gameId, playerRole, decision, suit });
          if (callback) callback({ status: "error", message: errorMsg });
          return;
        }

        logger.info(`[Game ID: ${gameId}] Received ACTION_CALL_TRUMP_DECISION from ${playerRole}`);

        let gameState = getGameState(gameId);
        if (!gameState) {
            logger.info(`[Game ID: ${gameId}] Game not in memory, attempting to hydrate from DB.`);
            gameState = await gameRepository.getGame(gameId);
            if (gameState) {
                 updateGameState(gameId, () => gameState);
            }
        }
       if (!gameState) {
            const errorMsg = "Game not found.";
            logger.error(`[Game ID: ${gameId}] ${errorMsg}`);
            if (callback) callback({ status: "error", message: errorMsg });
            return;
        }

        const newGameState = updateGameState(gameId, (currentState) =>
          handleCallTrumpDecision.call(injection, currentState, playerRole, decision, suit)
        );

        await gameRepository.updateGame(gameId, newGameState);

        io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, newGameState);
        logger.info(`[Game ID: ${gameId}] Emitted ${GAME_EVENTS.STATE_UPDATE} after call trump decision.`);

        if (callback) callback({ status: "ok" });
      } catch (error) {
        logger.error(`[Game ID: ${gameId}] Error in ACTION_CALL_TRUMP_DECISION handler: ${error.message}`, { error });
        if (callback) callback({ status: "error", message: error.message });
      }
    }
  );
}
