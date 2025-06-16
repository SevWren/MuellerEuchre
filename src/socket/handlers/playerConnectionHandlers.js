/**
 * Handles player connection and disconnection events for Socket.IO.
 * @module socket/handlers/playerConnectionHandlers
 */
import logger from '../../utils/logger.js';
import { getGameState, updateGameState } from '../../game/state.js';
import { PLAYER_ROLES, GAME_PHASES } from '../../config/constants.js'; // GAME_EVENTS can be added if used
import { getRoleBySocketId } from '../../utils/players.js';

/**
 * Handles a new client connection, attempts to assign them a player role,
 * and updates the game state.
 * @param {object} socket - The Socket.IO socket object for the connected client.
 * @param {object} io - The Socket.IO server instance.
 */
export function handlePlayerConnect(socket, io) {
  logger.debug({ socketId: socket.id }, 'Attempting to handle new player connection.');
  const currentGameState = getGameState();
  let assignedRole = null;

  // Find an available slot
  for (const role of PLAYER_ROLES) {
    if (currentGameState.players && currentGameState.players[role] && currentGameState.players[role].socketId === null) {
      assignedRole = role;
      break;
    }
  }

  if (assignedRole) {
    const newName = assignedRole.charAt(0).toUpperCase() + assignedRole.slice(1); // Default name by role
    let updatedPlayers; // To capture the state of players after update for logging/emit
    const updatedGameState = updateGameState(currentState => {
      const newPlayers = JSON.parse(JSON.stringify(currentState.players)); // Deep clone players
      newPlayers[assignedRole] = {
        ...newPlayers[assignedRole], // Keep existing player data like score, hand (if any from a previous game)
        socketId: socket.id,
        name: newPlayers[assignedRole].name || newName, // Use existing name or default
        isConnected: true,
      };
      updatedPlayers = newPlayers; // Capture for use outside updater
      return { ...currentState, players: newPlayers };
    });

    socket.emit('assign_role', { role: assignedRole, name: updatedPlayers[assignedRole].name });
    logger.info({ socketId: socket.id, assignedRole, name: updatedPlayers[assignedRole].name }, 'Player assigned to role.');

    // Broadcast the updated game state to all clients
    io.emit('gameState', updatedGameState); // Or a more specific 'player_list_update' or 'player_joined'

  } else {
    logger.warn({ socketId: socket.id }, 'No available player slots. Rejecting connection.');
    socket.emit('game_full', { message: 'Sorry, the game is currently full.' });
    // Consider disconnecting the socket if the game is full and no spectator mode exists
    // socket.disconnect(true);
  }
}

/**
 * Handles a client disconnection, updates the player's status in the game state,
 * and notifies other clients.
 * @param {object} socket - The Socket.IO socket object for the disconnected client.
 * @param {object} io - The Socket.IO server instance.
 */
export function handlePlayerDisconnect(socket, io) {
  const currentGameState = getGameState();
  const disconnectedPlayerRole = getRoleBySocketId(currentGameState, socket.id);

  if (disconnectedPlayerRole) {
    logger.info({ socketId: socket.id, role: disconnectedPlayerRole }, 'Player disconnected.');

    const updatedGameState = updateGameState(currentState => {
      const newPlayers = JSON.parse(JSON.stringify(currentState.players)); // Deep clone players
      if (newPlayers[disconnectedPlayerRole]) {
        newPlayers[disconnectedPlayerRole].isConnected = false;
        newPlayers[disconnectedPlayerRole].socketId = null; // Clear socketId to make slot available
        // Note: Player's name, score, hand etc., are kept for now.
        // Game logic might decide to reset these based on phase or rules.
      }

      // Basic game reset if a player disconnects mid-game (simplistic for now)
      // More advanced logic would be needed for robust reconnection or game pausing.
      let newPhase = currentState.gamePhase;
      if (currentState.gamePhase !== GAME_PHASES.LOBBY && currentState.gamePhase !== GAME_PHASES.GAME_OVER) {
        // Example: if not enough players remain connected to continue, reset to lobby.
        // This logic needs to be more sophisticated. For now, just marking as disconnected.
        // newPhase = GAME_PHASES.LOBBY; // Or some 'PAUSED' state
        // logger.info({ gameId: currentState.gameId, previousPhase: currentState.gamePhase }, `Game phase reset to LOBBY due to player disconnect.`);
      }

      return { ...currentState, players: newPlayers, gamePhase: newPhase };
    });

    // Notify remaining clients
    io.emit('gameState', updatedGameState); // Or a more specific 'player_left' or 'player_disconnected' event
    // io.emit('player_disconnected', { role: disconnectedPlayerRole });


  } else {
    logger.warn({ socketId: socket.id }, 'Disconnected socket had no assigned player role.');
  }
}
