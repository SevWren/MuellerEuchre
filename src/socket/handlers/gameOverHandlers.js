// src/socket/handlers/gameOverHandlers.js
import { getGameState, updateGameState } from "../../game/state.js";
import { gameRepository } from "../../db/gameRepository.js";
import { startNewHand } from "../../game/phases/startNewHandPhase.js";
import { GAME_EVENTS, GAME_PHASES, TEAMS } from "../../config/constants.js";
import logger from "../../utils/logger.js";
import { getCardRank, getEffectiveSuit, validatePlay } from "../../game/logic/validation-core.js";
import { getNextPlayer } from "../../utils/players.js";

/**
 * Registers handlers for game over actions.
 * @param {object} socket The socket instance for the client.
 * @param {object} io The Socket.IO server instance.
 */
export function registerGameOverHandlers(socket, io) {
  const injection = { getCardRank, getEffectiveSuit, validatePlay, getNextPlayer };

  socket.on(
    GAME_EVENTS.ACTION_REQUEST_NEW_GAME,
    async ({ gameId, playerRole }, callback) => {
      try {
        if (!gameId || !playerRole) {
          const errorMsg = "Invalid payload for ACTION_REQUEST_NEW_GAME";
          logger.warn(`[Game ID: ${gameId}] ${errorMsg}`, { gameId, playerRole });
          if (callback) callback({ status: "error", message: errorMsg });
          return;
        }

        logger.info(`[Game ID: ${gameId}] Received ACTION_REQUEST_NEW_GAME from ${playerRole}`);

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

        if (gameState.gamePhase !== GAME_PHASES.GAME_OVER) {
          const errorMsg = "Game is not over yet.";
           logger.warn(`[Game ID: ${gameId}] ${errorMsg}`);
          if (callback) callback({ status: "error", message: errorMsg });
          return;
        }

        // Reset scores and prepare for a new game with the same players
        const newGameState = updateGameState(gameId, (currentState) => {
            let state = {
                ...currentState,
                teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
                gamePhase: GAME_PHASES.DEALING, // Transition to dealing to start a new hand
            };
            return startNewHand.call(injection, state);
        });

        await gameRepository.updateGame(gameId, newGameState);

        io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, newGameState);
        logger.info(`[Game ID: ${gameId}] Emitted ${GAME_EVENTS.STATE_UPDATE} for new game.`);

        if (callback) callback({ status: "ok" });
      } catch (error) {
        logger.error(`[Game ID: ${gameId}] Error in ACTION_REQUEST_NEW_GAME handler: ${error.message}`, { error });
        if (callback) callback({ status: "error", message: error.message });
      }
    }
  );
}
