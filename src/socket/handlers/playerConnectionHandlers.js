// src/socket/handlers/playerConnectionHandlers.js
import { getGameState, updateGameState } from "../../game/state.js";
import { gameRepository } from "../../db/gameRepository.js";
import { GAME_EVENTS, PLAYER_ROLES } from "../../config/constants.js";
import logger from "../../utils/logger.js";
import { getRoleBySocketId } from "../../utils/players.js";

export function registerPlayerConnectionHandlers(socket, io) {
    socket.on(GAME_EVENTS.ACTION_REJOIN_GAME, async ({ gameId, playerId }, callback) => {
        try {
            if (!gameId || !playerId) {
                const errorMsg = "Invalid payload for ACTION_REJOIN_GAME";
                logger.warn(`[Game ID: ${gameId}] ${errorMsg}`, { gameId, playerId });
                if (callback) callback({ status: "error", message: errorMsg });
                return;
            }

            logger.info(`[Game ID: ${gameId}] Received ACTION_REJOIN_GAME from player ${playerId}`);

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

            let playerRoleToRejoin = null;
            if (PLAYER_ROLES.includes(playerId)) {
                playerRoleToRejoin = playerId;
            } else {
                for (const role of PLAYER_ROLES) {
                    if (gameState.players[role] && gameState.players[role].id === playerId) {
                        playerRoleToRejoin = role;
                        break;
                    }
                }
            }

            if (!playerRoleToRejoin || !gameState.players[playerRoleToRejoin]) {
                const errorMsg = `Player ${playerId} not found in game.`;
                logger.warn(`[Game ID: ${gameId}] ${errorMsg}`);
                if (callback) callback({ status: "error", message: errorMsg });
                return;
            }
            
            if (gameState.players[playerRoleToRejoin].isConnected) {
              const errorMsg = `Player ${playerRoleToRejoin} is already connected.`;
              logger.warn(`[Game ID: ${gameId}] ${errorMsg}`);
              if (callback) callback({ status: "error", message: errorMsg });
              return;
            }

            const newGameState = updateGameState(gameId, (currentState) => {
                const newPlayers = { ...currentState.players };
                newPlayers[playerRoleToRejoin] = {
                    ...newPlayers[playerRoleToRejoin],
                    isConnected: true,
                    socketId: socket.id,
                };
                return { ...currentState, players: newPlayers };
            });

            await gameRepository.updateGame(gameId, newGameState);

            socket.join(gameId);
            socket.currentGameId = gameId;

            socket.emit(GAME_EVENTS.STATE_UPDATE, newGameState);
            io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, newGameState);
            
            logger.info(`[Game ID: ${gameId}] Player ${playerRoleToRejoin} has rejoined.`);
            if (callback) callback({ status: "ok" });
        } catch (error) {
            logger.error(`[Game ID: ${gameId}] Error in ACTION_REJOIN_GAME handler: ${error.message}`, { error });
            if (callback) callback({ status: "error", message: error.message });
        }
    });
}


export async function handlePlayerDisconnect(socket, io) {
  const gameId = socket.currentGameId;
  if (!gameId) {
    return;
  }

  try {
    let gameState = getGameState(gameId);
    if (!gameState) {
      return; 
    }
    
    const playerRole = getRoleBySocketId(gameState, socket.id);

    if (playerRole) {
      logger.info(`[Game ID: ${gameId}] Player ${playerRole} disconnected.`);
      const newGameState = updateGameState(gameId, (currentState) => {
        const newPlayers = { ...currentState.players };
        newPlayers[playerRole] = {
          ...newPlayers[playerRole],
          isConnected: false,
          socketId: null,
        };
        return { ...currentState, players: newPlayers };
      });

      await gameRepository.updateGame(gameId, newGameState);
      io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, newGameState);
    }
  } catch (error) {
    logger.error(`[Game ID: ${gameId}] Error during disconnect: ${error.message}`, { error });
  }
}
