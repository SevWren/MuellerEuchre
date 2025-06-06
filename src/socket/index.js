/**
 * @file Main socket configuration file
 * @module socket
 * @description Configures and initializes socket.io with all middleware and event handlers
 */

import { Server } from 'socket.io';
import { log } from '../utils/logger.js';
import { DEBUG_LEVELS } from '../config/constants.js';
import { authenticateSocket, authorizeSocket } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setupRateLimiting } from './middleware/rateLimiter.js';
import { registerGameHandlers } from './handlers/gameHandlers.js';

// Keep track of all connected clients
const connectedClients = new Map();

/**
 * Initialize socket.io with all middleware and event handlers
 * @param {Object} httpServer - The HTTP server instance
 * @param {Object} gameState - The shared game state
 * @returns {Object} Configured socket.io instance
 */
export function initializeSocket(server, gameState) {
    log(DEBUG_LEVELS.INFO, '[initializeSocket] Initializing socket.io');
    
    // Create socket.io instance with CORS configuration
    const io = new Server(server, {
        cors: {
            origin: process.env.NODE_ENV === 'production' 
                ? 'https://your-production-domain.com' 
                : 'http://localhost:3000',
            methods: ['GET', 'POST'],
            credentials: true
        },
        // Enable connection state recovery
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
            skipMiddlewares: true
        }
    });
    
    // Apply rate limiting
    setupRateLimiting(io, {
        // Custom rate limit overrides can go here
    });
    
    // Socket.io middleware
    io.use((socket, next) => {
        // Log all incoming connections
        log(DEBUG_LEVELS.DEBUG, `[socket:connection] New connection: ${socket.id}`);
        next();
    });
    
    // Apply authentication middleware
    io.use(authenticateSocket);
    
    // Apply error handling middleware
    io.use(errorHandler);
    
    // Handle new connections
    io.on('connection', (socket) => {
        log(DEBUG_LEVELS.INFO, `[socket:connection] Client connected: ${socket.id}`);
        
        // Add client to connected clients map
        connectedClients.set(socket.id, {
            connectedAt: Date.now(),
            lastActivity: Date.now(),
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent']
        });
        
        // Send initial game state to the client
        socket.emit('game:state', gameState);
        
        // Register event handlers
        registerGameHandlers(io, socket, gameState);
        
        // Handle client disconnection
        socket.on('disconnect', (reason) => {
            log(DEBUG_LEVELS.INFO, `[socket:disconnect] Client disconnected: ${socket.id} (${reason})`);
            
            // Remove client from connected clients
            connectedClients.delete(socket.id);
            
            // Handle player disconnection
            if (socket.playerRole) {
                // Mark player as disconnected but keep them in the game
                if (gameState.players[socket.playerRole]) {
                    gameState.players[socket.playerRole].isConnected = false;
                    gameState.connectedPlayerCount--;
                    
                    // Notify other players
                    socket.broadcast.emit('player:disconnected', {
                        playerRole: socket.playerRole,
                        playerName: gameState.players[socket.playerRole]?.name,
                        players: gameState.players,
                        connectedPlayerCount: gameState.connectedPlayerCount
                    });
                    
                    log(DEBUG_LEVELS.INFO, `[socket:disconnect] Player ${socket.playerRole} disconnected`);
                }
            }
        });
        
        // Handle reconnection
        socket.on('reconnect_attempt', (attemptNumber) => {
            log(DEBUG_LEVELS.INFO, `[socket:reconnect] Reconnection attempt ${attemptNumber} for ${socket.id}`);
        });
        
        socket.on('reconnect', (attemptNumber) => {
            log(DEBUG_LEVELS.INFO, `[socket:reconnect] Successfully reconnected after ${attemptNumber} attempts`);
            
            // Update client info
            if (connectedClients.has(socket.id)) {
                connectedClients.get(socket.id).lastActivity = Date.now();
            }
            
            // Handle player reconnection
            if (socket.playerRole && gameState.players[socket.playerRole]) {
                gameState.players[socket.playerRole].isConnected = true;
                gameState.connectedPlayerCount++;
                
                // Notify other players
                socket.broadcast.emit('player:reconnected', {
                    playerRole: socket.playerRole,
                    playerName: gameState.players[socket.playerRole]?.name,
                    players: gameState.players,
                    connectedPlayerCount: gameState.connectedPlayerCount
                });
                
                log(DEBUG_LEVELS.INFO, `[socket:reconnect] Player ${socket.playerRole} reconnected`);
            }
            
            // Send current game state to reconnected client
            socket.emit('game:state', gameState);
        });
        
        // Ping/pong for connection health monitoring
        socket.on('ping', (cb) => {
            if (typeof cb === 'function') {
                cb();
            }
        });
    });
    
    // Log connection errors
    io.engine.on('connection_error', (err) => {
        log(DEBUG_LEVELS.ERROR, `[socket:error] Connection error: ${err.message}`);
        log(DEBUG_LEVELS.DEBUG, `[socket:error] Error details:`, err);
    });
    
    // Clean up disconnected clients periodically
    setInterval(() => {
        const now = Date.now();
        const timeout = 5 * 60 * 1000; // 5 minutes
        
        for (const [socketId, client] of connectedClients.entries()) {
            if (now - client.lastActivity > timeout) {
                const socket = io.sockets.sockets.get(socketId);
                if (socket) {
                    log(DEBUG_LEVELS.INFO, `[socket:cleanup] Disconnecting idle socket: ${socketId}`);
                    socket.disconnect(true);
                }
                connectedClients.delete(socketId);
            }
        }
    }, 60 * 1000); // Check every minute
    
    log(DEBUG_LEVELS.INFO, '[initializeSocket] Socket.io initialized');
    return io;
}

/**
 * Get statistics about connected clients
 * @returns {Object} Connection statistics
 */
export function getConnectionStats() {
    return {
        totalConnections: connectedClients.size,
        activeConnections: Array.from(connectedClients.values()).filter(
            client => Date.now() - client.lastActivity < 30000 // Active in last 30 seconds
        ).length,
        connectedSince: Math.min(
            ...Array.from(connectedClients.values()).map(c => c.connectedAt)
        )
    };
}
