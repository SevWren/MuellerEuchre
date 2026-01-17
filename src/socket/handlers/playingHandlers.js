// filepath: src/socket/handlers/playingHandlers.js
import { getGameState, updateGameState } from "../../game/state.js";
import { gameRepository } from "../../db/gameRepository.js";
import { handlePlayCard } from "../../game/phases/playingPhase.js";
import { GAME_EVENTS } from "../../config/constants.js";
import logger from "../../utils/logger.js";
import { getCardRank, getEffectiveSuit, validatePlay } from "../../game/logic/validation-core.js";
import { getNextPlayer } from "../../utils/players.js";

/**
 * Registers handlers for playing phase actions.
 * @param {object} socket The socket instance for the client.
 * @param {object} io The Socket.IO server instance.
 */
export function registerPlayingHandlers(socket, io) {
  const injection = { getCardRank, getEffectiveSuit, validatePlay, getNextPlayer };

  socket.on(
    GAME_EVENTS.ACTION_PLAY_CARD,
    async ({ gameId, playerRole, card }, callback) => {
      try {
        // 1. Input Validation
        if (
          !gameId ||
          !playerRole ||
          !card ||
          !card.id ||
          !card.suit ||
          !card.value
        ) {
          const errorMsg = "Invalid payload for ACTION_PLAY_CARD";
          logger.warn(`[Game ID: ${gameId}] ${errorMsg}`, { gameId, playerRole, card });
          if (callback) callback({ status: "error", message: errorMsg });
          return;
        }

        logger.info(
          `[Game ID: ${gameId}] Received ${GAME_EVENTS.ACTION_PLAY_CARD} from ${playerRole} with card ${card.id}`
        );

        // 2. State Retrieval
        let gameState = getGameState(gameId);
        if (!gameState) {
          logger.info(`[Game ID: ${gameId}] Game not in memory, attempting to hydrate from DB.`);
          const dbState = await gameRepository.getGame(gameId);
          if (dbState) {
            // This is a simplified hydration for a single game.
            // A full server restart would use state.hydrateGames().
            updateGameState(gameId, () => dbState);
            gameState = getGameState(gameId);
          }
        }

        if (!gameState) {
          const errorMsg = "Game not found.";
          logger.error(`[Game ID: ${gameId}] ${errorMsg}`);
          if (callback) callback({ status: "error", message: errorMsg });
          return;
        }

        // 3. Atomic Update
        const newGameState = updateGameState(gameId, (currentState) =>
          handlePlayCard.call(injection, currentState, playerRole, card)
        );

        // 4. Persistence
        await gameRepository.updateGame(gameId, newGameState);

        // 5. Broadcast
        io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, newGameState);
        logger.info(
          `[Game ID: ${gameId}] Emitted ${GAME_EVENTS.STATE_UPDATE} after card play. Current player: ${newGameState.currentPlayer}, Phase: ${newGameState.gamePhase}`
        );

        // 6. Ack
        if (callback) callback({ status: "ok" });
      } catch (error) {
        logger.error(
          `[Game ID: ${gameId}] Error in ${GAME_EVENTS.ACTION_PLAY_CARD} handler: ${error.message}`,
          { error }
        );
        if (callback) callback({ status: "error", message: error.message });
      }
    }
  );
}
