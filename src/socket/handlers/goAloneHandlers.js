// src/socket/handlers/goAloneHandlers.js
import { getGameState, updateGameState } from "../../game/state.js";
import { gameRepository } from "../../db/gameRepository.js";
import { handleGoAloneDecision } from "../../game/phases/goAlonePhase.js";
import { isValidGoAlone } from "../../game/logic/validation-core.js";
import { GAME_EVENTS } from "../../config/constants.js";
import logger from "../../utils/logger.js";

/**
 * Registers handlers for "go alone" phase actions.
 * @param {object} socket The socket instance for the client.
 * @param {object} io The Socket.IO server instance.
 */
export function registerGoAloneHandlers(socket, io) {

  socket.on(
    GAME_EVENTS.ACTION_GO_ALONE_DECISION,
    async ({ gameId, playerRole, goingAlone }, callback) => {
      try {
        if (!gameId || !playerRole || goingAlone === undefined) {
          const errorMsg = "Invalid payload for ACTION_GO_ALONE_DECISION";
          logger.warn(`[Game ID: ${gameId}] ${errorMsg}`, { gameId, playerRole, goingAlone });
          if (callback) callback({ status: "error", message: errorMsg });
          return;
        }

        logger.info(`[Game ID: ${gameId}] Received ACTION_GO_ALONE_DECISION from ${playerRole}`);

        let gameState = getGameState(gameId);
        if (!gameState) {
            logger.info(`[Game ID: ${gameId}] Game not in memory, attempting to hydrate from DB.`);
            gameState = await gameRepository.getGame(gameId);
            if (gameState) {
                 updateGameState(gameId, () => gameState);
                 gameState = getGameState(gameId);
            }
        }
        if (!gameState) {
            const errorMsg = "Game not found.";
            logger.error(`[Game ID: ${gameId}] ${errorMsg}`);
            if (callback) callback({ status: "error", message: errorMsg });
            return;
        }

        const newGameState = updateGameState(gameId, (currentState) => {
            isValidGoAlone(currentState, playerRole);
            return handleGoAloneDecision(currentState, playerRole, goingAlone);
        });

        await gameRepository.updateGame(gameId, newGameState);

        io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, newGameState);
        logger.info(`[Game ID: ${gameId}] Emitted ${GAME_EVENTS.STATE_UPDATE} after go alone decision.`);

        if (callback) callback({ status: "ok" });
      } catch (error) {
        logger.error(`[Game ID: ${gameId}] Error in ACTION_GO_ALONE_DECISION handler: ${error.message}`, { error });
        if (callback) callback({ status: "error", message: error.message });
      }
    }
  );
}
