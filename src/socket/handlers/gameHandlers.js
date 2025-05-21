/**
 * @file Game event handlers for socket connections
 * @module socket/handlers/gameHandlers
 * @description Handles all game-related socket events
 */

import { log } from '../../utils/logger.js';
import { DEBUG_LEVELS, GAME_PHASES } from '../../config/constants.js';
import { startNewHand } from '../../game/phases/playing.js';
import { scoreCurrentHand, resetGame } from '../../game/phases/scoring.js';

/**
 * Register game-related socket event handlers
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - The socket instance
 * @param {Object} gameState - The game state
 */
export function registerGameHandlers(io, socket, gameState) {
    log(DEBUG_LEVELS.INFO, `[registerGameHandlers] Registering game handlers for socket ${socket.id}`);
    
    // Store game state in the socket for easy access in handlers
    socket.gameState = gameState;
    
    /**
     * Handle player joining the game
     * @param {Object} data - Player data
     * @param {string} data.playerName - The player's name
     * @param {string} data.playerRole - The player's role (north, east, south, west)
     */
    socket.on('player:join', (data) => {
        try {
            const { playerName, playerRole } = data;
            
            if (!playerName || !playerRole) {
                throw new Error('Player name and role are required');
            }
            
            if (!gameState.playerOrder.includes(playerRole)) {
                throw new Error(`Invalid player role: ${playerRole}`);
            }
            
            // Check if the seat is already taken
            if (gameState.players[playerRole]) {
                throw new Error(`Seat ${playerRole} is already taken`);
            }
            
            // Add player to the game
            gameState.players[playerRole] = {
                id: socket.id,
                name: playerName,
                role: playerRole,
                hand: [],
                tricksWon: 0,
                isConnected: true
            };
            
            // Add to connected players count
            gameState.connectedPlayerCount++;
            
            // Store player role in socket for disconnection handling
            socket.playerRole = playerRole;
            
            // Notify all clients about the new player
            io.emit('player:joined', {
                playerRole,
                playerName,
                players: gameState.players,
                connectedPlayerCount: gameState.connectedPlayerCount
            });
            
            log(DEBUG_LEVELS.INFO, `[player:join] ${playerName} joined as ${playerRole}`);
            
            // If all players have joined, start the game
            if (gameState.connectedPlayerCount === 4) {
                startNewGame(io, gameState);
            }
            
        } catch (error) {
            log(DEBUG_LEVELS.ERROR, `[player:join] Error: ${error.message}`);
            socket.emit('error', {
                success: false,
                error: {
                    message: error.message,
                    code: 'PLAYER_JOIN_ERROR'
                }
            });
        }
    });
    
    /**
     * Handle player leaving the game
     */
    socket.on('player:leave', () => {
        try {
            const { playerRole } = socket;
            
            if (!playerRole || !gameState.players[playerRole]) {
                throw new Error('Player not found in game');
            }
            
            const playerName = gameState.players[playerRole].name;
            
            // Remove player from the game
            delete gameState.players[playerRole];
            gameState.connectedPlayerCount--;
            
            // Notify all clients about the player leaving
            io.emit('player:left', {
                playerRole,
                playerName,
                players: gameState.players,
                connectedPlayerCount: gameState.connectedPlayerCount
            });
            
            log(DEBUG_LEVELS.INFO, `[player:leave] ${playerName} (${playerRole}) left the game`);
            
            // Reset game if there are not enough players
            if (gameState.connectedPlayerCount < 2) {
                resetGameState(io, gameState);
            }
            
        } catch (error) {
            log(DEBUG_LEVELS.ERROR, `[player:leave] Error: ${error.message}`);
        }
    });
    
    /**
     * Handle player playing a card
     * @param {Object} card - The card being played
     */
    socket.on('game:playCard', (card) => {
        try {
            const { playerRole } = socket;
            
            if (!playerRole || !gameState.players[playerRole]) {
                throw new Error('Player not found in game');
            }
            
            if (gameState.currentPlayer !== playerRole) {
                throw new Error('Not your turn to play');
            }
            
            // Update game state with the played card
            gameState = handlePlayCard(gameState, playerRole, card);
            
            // Broadcast the updated game state to all players
            io.emit('game:stateUpdate', gameState);
            
            // If the hand is complete, score it
            if (gameState.currentPhase === GAME_PHASES.SCORING) {
                gameState = scoreCurrentHand(gameState);
                io.emit('game:handComplete', gameState);
                
                // Start a new hand if the game is not over
                if (gameState.currentPhase !== GAME_PHASES.GAME_OVER) {
                    setTimeout(() => {
                        gameState = startNewHand(gameState);
                        io.emit('game:newHand', gameState);
                    }, 3000); // 3 second delay before starting a new hand
                } else {
                    io.emit('game:over', gameState);
                }
            }
            
        } catch (error) {
            log(DEBUG_LEVELS.ERROR, `[game:playCard] Error: ${error.message}`);
            socket.emit('error', {
                success: false,
                error: {
                    message: error.message,
                    code: 'PLAY_CARD_ERROR'
                }
            });
        }
    });
    
    /**
     * Handle chat messages
     * @param {string} message - The chat message
     */
    socket.on('chat:message', (message) => {
        try {
            const { playerRole } = socket;
            
            if (!playerRole || !gameState.players[playerRole]) {
                throw new Error('Player not found in game');
            }
            
            const playerName = gameState.players[playerRole].name;
            const chatMessage = {
                playerRole,
                playerName,
                message,
                timestamp: new Date().toISOString()
            };
            
            // Add message to chat history
            gameState.chatHistory = gameState.chatHistory || [];
            gameState.chatHistory.push(chatMessage);
            
            // Broadcast the message to all players
            io.emit('chat:message', chatMessage);
            
        } catch (error) {
            log(DEBUG_LEVELS.ERROR, `[chat:message] Error: ${error.message}`);
            socket.emit('error', {
                success: false,
                error: {
                    message: 'Failed to send message',
                    code: 'CHAT_ERROR'
                }
            });
        }
    });
}

/**
 * Start a new game
 * @param {Object} io - Socket.IO server instance
 * @param {Object} gameState - The game state
 */
function startNewGame(io, gameState) {
    log(DEBUG_LEVELS.INFO, '[startNewGame] Starting a new game');
    
    // Initialize game state
    gameState.currentPhase = GAME_PHASES.BIDDING;
    gameState.deck = []; // This would be populated with a new deck
    gameState.currentTrick = [];
    gameState.tricks = [];
    gameState.ledSuit = null;
    gameState.dealer = 'south'; // Or determine randomly
    gameState.currentPlayer = 'east'; // Player to the left of dealer
    gameState.messages = [];
    
    // Deal cards and set up initial game state
    gameState = startNewHand(gameState);
    
    // Notify all clients that the game has started
    io.emit('game:started', gameState);
    
    log(DEBUG_LEVELS.INFO, '[startNewGame] Game started successfully');
}

/**
 * Reset the game state
 * @param {Object} io - Socket.IO server instance
 * @param {Object} gameState - The game state
 */
function resetGameState(io, gameState) {
    log(DEBUG_LEVELS.INFO, '[resetGameState] Resetting game state');
    
    // Reset game state but keep players
    const players = { ...gameState.players };
    Object.keys(players).forEach(role => {
        players[role] = {
            ...players[role],
            hand: [],
            tricksWon: 0
        };
    });
    
    // Reset game state
    Object.assign(gameState, {
        currentPhase: GAME_PHASES.LOBBY,
        deck: [],
        currentTrick: [],
        tricks: [],
        ledSuit: null,
        dealer: null,
        currentPlayer: null,
        messages: [],
        players,
        connectedPlayerCount: Object.keys(players).length
    });
    
    // Notify all clients that the game has been reset
    io.emit('game:reset', gameState);
    
    log(DEBUG_LEVELS.INFO, '[resetGameState] Game state reset');
}
