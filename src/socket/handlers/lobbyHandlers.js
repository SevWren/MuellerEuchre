/**
 * Socket event handlers for the LOBBY game phase.
 * @module socket/handlers/lobbyHandlers
 */
import logger from '../../utils/logger.js';
import { attemptToStartGame } from '../../game/phases/lobbyPhase.js';
import { getRoleBySocketId } from '../../utils/players.js';
import { gameRepository } from '../../db/gameRepository.js';
import { GAME_EVENTS, PLAYER_ROLES, GAME_PHASES, TEAMS as APP_TEAMS } from '../../config/constants.js';
import { createInitialGameState } from '../../game/state.js';
import { startNewHand } from '../../game/phases/startNewHandPhase.js';

// Temporary minimal utility functions - ideally these come from a dedicated lobbyUtils.js
const TEAMS = APP_TEAMS;

function assignRoleToPlayer(gameState, role, userId, playerName, socketId) {
  const newGameState = JSON.parse(JSON.stringify(gameState));
  newGameState.players[role] = {
    ...(newGameState.players[role] || {}),
    id: userId,
    name: playerName,
    socketId: socketId,
    isConnected: true,
    role: role,
    teamId: (PLAYER_ROLES.indexOf(role) % 2 === 0) ? TEAMS.TEAM_NS : TEAMS.TEAM_EW,
  };
  if (newGameState.players[role].tricksWonThisHand === undefined) newGameState.players[role].tricksWonThisHand = 0;
  if (newGameState.players[role].score === undefined) newGameState.players[role].score = 0;
  newGameState.players[role].isActive = true;

  return newGameState;
}

function isLobbyFull(gameState) {
  if (!gameState || !gameState.players) return false;
  return PLAYER_ROLES.every(role =>
    gameState.players[role] &&
    gameState.players[role].isConnected &&
    gameState.players[role].isActive
  );
}

function getNextAvailableRole(gameState) {
  if (!gameState || !gameState.players) return null;
  for (const role of PLAYER_ROLES) {
    if (!gameState.players[role] || !gameState.players[role].isConnected || !gameState.players[role].isActive) {
      return role;
    }
  }
  return null;
}
// End temporary utils


/**
 * Registers lobby-specific event handlers for a given socket.
 * @param {object} socket - The Socket.IO socket instance for a client.
 * @param {object} io - The Socket.IO server instance.
 */
export function registerLobbyHandlers(socket, io) {
  /**
   * Handles a client's request to start the game.
   * Expected data: { gameId: string }
   */
  socket.on('request_start_game', async (data, ack) => {
    ack = typeof ack === 'function' ? ack : () => {};
    if (!data || !data.gameId) {
      logger.warn({ socketId: socket.id, dataReceived: data }, 'Invalid data for request_start_game: gameId missing.');
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Invalid request: gameId is required.', event: 'request_start_game'});
      return ack({ status: 'error', message: 'Invalid request: gameId is required.'});
    }
    const { gameId } = data;

    try {
      const currentGameState = await gameRepository.getGame(gameId);
      if (!currentGameState) {
        logger.warn({ socketId: socket.id, gameId }, 'request_start_game: Game not found.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Game not found. Cannot start.', event: 'request_start_game' });
        return ack({ status: 'error', message: 'Game not found. Cannot start.'});
      }

      const requestingPlayerRole = getRoleBySocketId(currentGameState, socket.id);
      if (!requestingPlayerRole) {
        logger.warn({ socketId: socket.id, gameId }, 'request_start_game: Requesting user not found in this game or has no role.');
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: 'Cannot start game: Your player role is not recognized for this game. Please rejoin.', event: 'request_start_game'});
        return ack({ status: 'error', message: 'Cannot start game: Your player role is not recognized for this game. Please rejoin.'});
      }

      logger.info(
        { socketId: socket.id, role: requestingPlayerRole, gameId },
        `Player ${requestingPlayerRole} is requesting to start game ${gameId}.`
      );

      const result = attemptToStartGame(currentGameState, requestingPlayerRole);

      if (result.success && result.updatedGameState) {
        await gameRepository.updateGame(gameId, result.updatedGameState);
        logger.info(
          { gameId, newPhase: result.updatedGameState.gamePhase },
          `Game start successful. Broadcasting updated state. Message: ${result.message}`
        );
        io.to(gameId).emit(GAME_EVENTS.STATE_UPDATE, result.updatedGameState);
        return ack(null, { status: 'ok', message: result.message || 'Game started.', gameState: result.updatedGameState });
      } else {
        logger.warn(
          { socketId: socket.id, role: requestingPlayerRole, gameId, reason: result.message },
          'Request to start game failed.'
        );
        socket.emit(GAME_EVENTS.ACTION_ERROR, { message: result.message || 'Could not start the game.', event: 'request_start_game'});
        return ack({ status: 'error', message: result.message || 'Could not start the game.'});
      }
    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameId }, `Error processing request_start_game for game ${gameId}.`);
      socket.emit(GAME_EVENTS.ACTION_ERROR, { message: error.message || 'An error occurred while trying to start the game.', event: 'request_start_game'});
      return ack({ status: 'error', message: error.message || 'An error occurred while trying to start the game.'});
    }
  });

  /**
   * Handles 'ACTION_JOIN_LOBBY' from a client.
   */
  socket.on(GAME_EVENTS.ACTION_JOIN_LOBBY, async (data, ack) => {
    ack = typeof ack === 'function' ? ack : () => {};
    if (!data || typeof data.playerName !== 'string') {
      logger.warn({ socketId: socket.id, dataReceived: data }, 'Invalid data for ACTION_JOIN_LOBBY: playerName string required.');
      return ack({ status: 'error', message: 'Invalid request: playerName is required.' });
    }

    const { playerName } = data;
    let { gameIdToJoin } = data;
    const user = socket.request.user || { id: socket.id };

    try {
      let gameState;
      let assignedRole;
      let isNewGame = false;

      if (!gameIdToJoin) { // Create new game
        isNewGame = true;
        gameIdToJoin = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        gameState = createInitialGameState(gameIdToJoin);
        gameState.hostId = user.id;

        assignedRole = PLAYER_ROLES[0];
        gameState = assignRoleToPlayer(gameState, assignedRole, user.id, playerName, socket.id);

        await gameRepository.createGame(gameIdToJoin, gameState);
        logger.info(`New game created by ${playerName} (${user.id}) with ID: ${gameIdToJoin}. Player assigned role ${assignedRole}.`);

        socket.join(gameIdToJoin);
        socket.gameId = gameIdToJoin;
        if(socket.request.user) socket.request.user.role = assignedRole; else socket.request.user = { role: assignedRole, id: user.id};

        socket.emit(GAME_EVENTS.ASSIGN_ROLE, {
            gameId: gameIdToJoin, role: assignedRole, players: gameState.players,
            isHost: true, playerId: user.id
        });

        // Since this is a new game with 1 player, it's not full yet.
        // Broadcast the current lobby state.
        io.to(gameIdToJoin).emit(GAME_EVENTS.STATE_UPDATE, gameState);
        logger.info(`Player ${playerName} (${user.id}) created game ${gameIdToJoin} as ${assignedRole}. State broadcasted.`);
        return ack(null, { status: 'ok', message: 'New game created and joined.', gameId: gameIdToJoin, role: assignedRole, players: gameState.players, gameState });

      } else { // Join existing game
        gameState = await gameRepository.getGame(gameIdToJoin);
        if (!gameState) {
          logger.warn(`Player ${playerName} (${user.id}) tried to join non-existent game: ${gameIdToJoin}`);
          return ack({ status: 'error', message: `Game ${gameIdToJoin} not found.` });
        }
        if (gameState.gamePhase !== GAME_PHASES.LOBBY) {
          logger.warn(`Player ${playerName} (${user.id}) tried to join active/ended game: ${gameIdToJoin}, Phase: ${gameState.gamePhase}`);
          return ack({ status: 'error', message: `Game ${gameIdToJoin} is not in lobby phase.` });
        }

        let existingPlayerRole = null;
        for(const role of PLAYER_ROLES){
            if(gameState.players[role] && gameState.players[role].id === user.id) {
                existingPlayerRole = role;
                break;
            }
        }

        if(existingPlayerRole) {
            assignedRole = existingPlayerRole;
            gameState.players[assignedRole].socketId = socket.id;
            gameState.players[assignedRole].isConnected = true;
            gameState.players[assignedRole].name = playerName;
            gameState.players[assignedRole].isActive = true;
        } else {
            if (isLobbyFull(gameState)) {
              logger.warn(`Player ${playerName} (${user.id}) tried to join full game: ${gameIdToJoin}`);
              return ack({ status: 'error', message: 'Game is full.' });
            }
            assignedRole = getNextAvailableRole(gameState);
            if (!assignedRole) {
                 logger.error(`Lobby join error: No role available in game ${gameIdToJoin} despite not being full.`);
                return ack({ status: 'error', message: 'Failed to assign role, lobby might be in an inconsistent state.' });
            }
            gameState = assignRoleToPlayer(gameState, assignedRole, user.id, playerName, socket.id);
        }

        socket.join(gameIdToJoin);
        socket.gameId = gameIdToJoin;
        if(socket.request.user) socket.request.user.role = assignedRole; else socket.request.user = { role: assignedRole, id: user.id};

        socket.emit(GAME_EVENTS.ASSIGN_ROLE, {
            gameId: gameIdToJoin, role: assignedRole, players: gameState.players,
            isHost: gameState.hostId === user.id, playerId: user.id
        });

        let finalGameStateToAck = gameState; // Start with current state

        if (isLobbyFull(gameState) && gameState.gamePhase === GAME_PHASES.LOBBY) {
            logger.info(`Lobby for game ${gameIdToJoin} is now full. Starting game automatically.`);
            const startHandResult = startNewHand(gameState);
            if (startHandResult.success) {
                finalGameStateToAck = startHandResult.updatedGameState; // This state includes dealt cards and new phase
                logger.info(`Game ${gameIdToJoin} auto-started by lobby full. Phase: ${finalGameStateToAck.gamePhase}`);
            } else {
                logger.error(`Failed to auto-start new hand for game ${gameIdToJoin} after lobby full: ${startHandResult.message}`);
                io.to(gameIdToJoin).emit(GAME_EVENTS.ACTION_ERROR, { message: `Failed to auto-start game: ${startHandResult.message}` });
                // Ack with current lobby state, but indicate game start error.
                await gameRepository.updateGame(gameIdToJoin, gameState);
                io.to(gameIdToJoin).emit(GAME_EVENTS.STATE_UPDATE, gameState);
                return ack(null, { status: 'ok', message: 'Joined lobby, but failed to auto-start game.', gameId: gameIdToJoin, role: assignedRole, players: gameState.players, gameState });
            }
        }

        await gameRepository.updateGame(gameIdToJoin, finalGameStateToAck);
        io.to(gameIdToJoin).emit(GAME_EVENTS.STATE_UPDATE, finalGameStateToAck);
        logger.info(`Player ${playerName} (${user.id}) processed for game ${gameIdToJoin} as ${assignedRole}. State broadcasted.`);
        return ack(null, { status: 'ok', message: 'Joined existing game.', gameId: gameIdToJoin, role: assignedRole, players: finalGameStateToAck.players, gameState: finalGameStateToAck });
      }
    } catch (error) {
      logger.error({ err: error, socketId: socket.id, gameIdToJoin, playerName }, `Error processing ACTION_JOIN_LOBBY.`);
      return ack({ status: 'error', message: error.message || 'An error occurred while joining the lobby.' });
    }
  });
}
