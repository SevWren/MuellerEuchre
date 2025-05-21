/**
 * @file Error handling middleware for socket connections
 * @module socket/middleware/errorHandler
 * @description Centralized error handling for socket events
 */

import { log } from '../../utils/logger.js';
import { DEBUG_LEVELS } from '../../config/constants.js';

/**
 * Middleware to handle socket errors
 * @param {Object} socket - The socket instance
 * @param {Function} next - The next middleware function
 */
export function errorHandler(socket, next) {
    try {
        // Override socket.emit to catch and log errors
        const originalEmit = socket.emit;
        
        socket.emit = function(event, ...args) {
            try {
                return originalEmit.apply(socket, [event, ...args]);
            } catch (error) {
                log(DEBUG_LEVELS.ERROR, `[socket.emit] Error emitting ${event}: ${error.message}`);
                log(DEBUG_LEVELS.DEBUG, `[socket.emit] Error details:`, error);
                // Re-throw to be caught by the global error handler
                throw error;
            }
        };
        
        // Handle errors in event handlers
        const originalOn = socket.on;
        socket.on = function(event, handler) {
            return originalOn.call(socket, event, async (...args) => {
                try {
                    // If handler returns a promise, await it to catch async errors
                    const result = handler(...args);
                    if (result && typeof result.then === 'function') {
                        await result;
                    }
                } catch (error) {
                    handleSocketError(socket, error, event);
                }
            });
        };
        
        next();
    } catch (error) {
        log(DEBUG_LEVELS.ERROR, `[errorHandler] Error in error handler: ${error.message}`);
        next(error);
    }
}

/**
 * Handle socket errors and notify the client
 * @param {Object} socket - The socket instance
 * @param {Error} error - The error that occurred
 * @param {string} event - The event that caused the error
 */
function handleSocketError(socket, error, event) {
    // Log the error
    log(DEBUG_LEVELS.ERROR, `[handleSocketError] Error in ${event}: ${error.message}`);
    log(DEBUG_LEVELS.DEBUG, `[handleSocketError] Stack: ${error.stack}`);
    
    // Prepare error response
    const errorResponse = {
        success: false,
        error: {
            message: 'An error occurred',
            code: 'INTERNAL_ERROR',
            // Only include stack trace in development
            ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
        }
    };
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
        errorResponse.error = {
            message: 'Validation error',
            code: 'VALIDATION_ERROR',
            details: error.details || error.message
        };
    } else if (error.name === 'AuthorizationError') {
        errorResponse.error = {
            message: 'Not authorized',
            code: 'UNAUTHORIZED'
        };
    }
    
    // Emit error to the client
    socket.emit('error', errorResponse);
    
    // For critical errors, you might want to disconnect the socket
    if (error.isFatal) {
        log(DEBUG_LEVELS.ERROR, `[handleSocketError] Disconnecting socket due to fatal error: ${error.message}`);
        socket.disconnect(true);
    }
}

/**
 * Global error handler for unhandled promise rejections
 */
process.on('unhandledRejection', (reason, promise) => {
    log(DEBUG_LEVELS.ERROR, `[unhandledRejection] Unhandled Rejection at: ${promise}, reason: ${reason}`);
    // You might want to log this to an external service in production
});

/**
 * Global error handler for uncaught exceptions
 */
process.on('uncaughtException', (error) => {
    log(DEBUG_LEVELS.ERROR, `[uncaughtException] Uncaught Exception: ${error.message}`);
    log(DEBUG_LEVELS.ERROR, `[uncaughtException] Stack: ${error.stack}`);
    // You might want to perform cleanup and exit in production
    // process.exit(1);
});
