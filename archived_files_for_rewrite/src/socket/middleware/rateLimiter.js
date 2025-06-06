/**
 * @file Rate limiting middleware for socket connections
 * @module socket/middleware/rateLimiter
 * @description Implements rate limiting for socket events to prevent abuse
 */

import { log } from '../../utils/logger.js';
import { DEBUG_LEVELS } from '../../config/constants.js';

// In-memory store for rate limiting
const rateLimitStore = new Map();

// Default rate limit configuration
const DEFAULT_LIMITS = {
    // Global rate limits (per socket)
    global: {
        windowMs: 60 * 1000, // 1 minute
        max: 100, // Max requests per windowMs
        message: 'Too many requests, please try again later.'
    },
    // Per-event rate limits
    events: {
        'player:join': {
            windowMs: 10 * 1000, // 10 seconds
            max: 3,
            message: 'Too many join attempts, please try again later.'
        },
        'game:create': {
            windowMs: 60 * 1000, // 1 minute
            max: 5,
            message: 'Too many game creation attempts, please try again later.'
        },
        'chat:message': {
            windowMs: 10 * 1000, // 10 seconds
            max: 10,
            message: 'You are sending messages too quickly.'
        }
    }
};

/**
 * Middleware to rate limit socket events
 * @param {Object} options - Custom rate limit options
 * @returns {Function} Rate limiting middleware function
 */
export function rateLimiter(options = {}) {
    const limits = { ...DEFAULT_LIMITS, ...options };
    
    return (socket, event, next) => {
        try {
            const ip = socket.handshake.address || socket.conn.remoteAddress;
            const socketId = socket.id;
            const eventName = event[0];
            
            // Get the appropriate rate limit config for this event
            const eventConfig = limits.events[eventName] || limits.global;
            const windowMs = eventConfig.windowMs;
            const max = eventConfig.max;
            
            // Create a unique key for this socket + event combination
            const key = `${ip}:${socketId}:${eventName}`;
            
            // Get or create the rate limit record
            const now = Date.now();
            let record = rateLimitStore.get(key) || { count: 0, resetTime: now + windowMs };
            
            // Reset the counter if the window has passed
            if (now > record.resetTime) {
                record = { count: 1, resetTime: now + windowMs };
                rateLimitStore.set(key, record);
                return next();
            }
            
            // Increment the counter
            record.count++;
            rateLimitStore.set(key, record);
            
            // Check if rate limit exceeded
            if (record.count > max) {
                log(DEBUG_LEVELS.WARN, `[rateLimiter] Rate limit exceeded for ${eventName} from ${ip}`);
                
                // Calculate reset time in seconds
                const resetIn = Math.ceil((record.resetTime - now) / 1000);
                
                // Notify the client
                socket.emit('rateLimitExceeded', {
                    success: false,
                    error: {
                        message: eventConfig.message,
                        code: 'RATE_LIMIT_EXCEEDED',
                        retryAfter: resetIn
                    }
                });
                
                // Don't call next() to prevent the event handler from executing
                return;
            }
            
            // Clean up old records periodically
            if (Math.random() < 0.01) { // 1% chance to clean up
                cleanupOldRecords();
            }
            
            next();
        } catch (error) {
            log(DEBUG_LEVELS.ERROR, `[rateLimiter] Error: ${error.message}`);
            // Allow the request to continue if there's an error in rate limiting
            next();
        }
    };
}

/**
 * Clean up old rate limit records
 */
function cleanupOldRecords() {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime + 60000) { // 1 minute after reset time
            rateLimitStore.delete(key);
        }
    }
}

/**
 * Middleware to apply rate limiting to all socket events
 * @param {Object} io - Socket.IO server instance
 * @param {Object} options - Rate limiting options
 */
export function setupRateLimiting(io, options = {}) {
    const limiter = rateLimiter(options);
    
    io.use((socket, next) => {
        // Override the emit method to apply rate limiting
        const originalEmit = socket.emit;
        
        socket.emit = function(event, ...args) {
            // Apply rate limiting before emitting
            limiter(socket, [event, ...args], () => {
                originalEmit.apply(socket, [event, ...args]);
            });
        };
        
        next();
    });
}

/**
 * Get rate limit info for a specific socket and event
 * @param {string} socketId - The socket ID
 * @param {string} eventName - The event name
 * @returns {Object} Rate limit information
 */
export function getRateLimitInfo(socketId, eventName) {
    const key = `:${socketId}:${eventName}`;
    for (const [k, record] of rateLimitStore.entries()) {
        if (k.endsWith(key)) {
            return {
                count: record.count,
                remaining: Math.max(0, DEFAULT_LIMITS.events[eventName]?.max - record.count || 0),
                resetTime: record.resetTime
            };
        }
    }
    return null;
}
