/**
 * @file Authentication middleware for socket connections
 * @module socket/middleware/auth
 * @description Handles socket authentication and authorization
 */

import { log } from '../../utils/logger.js';
import { DEBUG_LEVELS } from '../../config/constants.js';

/**
 * Middleware to authenticate socket connections
 * @param {Object} socket - The socket instance
 * @param {Function} next - The next middleware function
 */
export function authenticateSocket(socket, next) {
    try {
        // Extract token from handshake or query
        const token = socket.handshake.auth?.token || 
                    socket.handshake.query?.token ||
                    socket.request.headers?.authorization?.split(' ')[1];

        if (!token) {
            log(DEBUG_LEVELS.WARN, '[authenticateSocket] No token provided');
            return next(new Error('Authentication error: No token provided'));
        }

        // Here you would typically verify the token
        // For now, we'll just attach the token to the socket
        socket.token = token;
        
        // You could also attach user info:
        // socket.user = { id: userId, role: userRole };
        
        log(DEBUG_LEVELS.DEBUG, `[authenticateSocket] Socket ${socket.id} authenticated`);
        next();
    } catch (error) {
        log(DEBUG_LEVELS.ERROR, `[authenticateSocket] Error: ${error.message}`);
        next(new Error('Authentication error'));
    }
}

/**
 * Middleware to authorize socket events
 * @param {Array} allowedRoles - Array of role names that are allowed
 * @returns {Function} Middleware function
 */
export function authorizeSocket(allowedRoles = []) {
    return (socket, next) => {
        try {
            // In a real app, you would check the user's role from the token
            // For now, we'll just check if the socket is authenticated
            if (!socket.token) {
                log(DEBUG_LEVELS.WARN, '[authorizeSocket] Unauthorized: No token');
                return next(new Error('Unauthorized'));
            }
            
            // If no specific roles required, just continue
            if (allowedRoles.length === 0) {
                return next();
            }
            
            // Here you would check if the user's role is in allowedRoles
            // For now, we'll just continue if they're authenticated
            // const userRole = socket.user?.role;
            // if (!userRole || !allowedRoles.includes(userRole)) {
            //     return next(new Error('Insufficient permissions'));
            // }
            
            next();
        } catch (error) {
            log(DEBUG_LEVELS.ERROR, `[authorizeSocket] Error: ${error.message}`);
            next(new Error('Authorization error'));
        }
    };
}

/**
 * Middleware to check if the game is in a specific phase
 * @param {string} requiredPhase - The required game phase
 * @returns {Function} Middleware function
 */
export function requireGamePhase(requiredPhase) {
    return (socket, next) => {
        try {
            const { gameState } = socket;
            
            if (!gameState) {
                log(DEBUG_LEVELS.WARN, '[requireGamePhase] No game state found');
                return next(new Error('Game state not available'));
            }
            
            if (gameState.currentPhase !== requiredPhase) {
                log(DEBUG_LEVELS.WARN, `[requireGamePhase] Wrong game phase. Required: ${requiredPhase}, Current: ${gameState.currentPhase}`);
                return next(new Error(`Action not allowed in current game phase: ${gameState.currentPhase}`));
            }
            
            next();
        } catch (error) {
            log(DEBUG_LEVELS.ERROR, `[requireGamePhase] Error: ${error.message}`);
            next(new Error('Game phase validation error'));
        }
    };
}
