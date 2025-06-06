/**
 * @file Main server file for Euchre Multiplayer
 * @description Sets up the Express server, initializes socket.io, and manages the game state
 */

import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Import configuration
import { DEBUG_LEVELS, PORT } from './config/constants.js';
import { log } from './utils/logger.js';

// Import game state and socket initialization
import { initializeGameState, getGameState } from './game/state.js';
import { initializeSocket } from './socket/index.js';

// Set up __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// Set view engine (if using server-side rendering)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../../views'));

// API Routes
app.get('/api/status', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve the main application
app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
});

// Initialize game state
initializeGameState();

// Initialize Socket.IO with our custom configuration
initializeSocket(server, getGameState());

// Handle server errors
server.on('error', (error) => {
    log(DEBUG_LEVELS.ERROR, `Server error: ${error.message}`);
    if (error.syscall !== 'listen') {
        throw error;
    }

    // Handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
            log(DEBUG_LEVELS.ERROR, `Port ${PORT} requires elevated privileges`);
            process.exit(1);
            break;
        case 'EADDRINUSE':
            log(DEBUG_LEVELS.ERROR, `Port ${PORT} is already in use`);
            process.exit(1);
            break;
        default:
            throw error;
    }
});

// Start the server if this file is run directly
if (process.env.NODE_ENV !== 'test') {
    server.listen(PORT, () => {
        log(DEBUG_LEVELS.INFO, `Server running on port ${PORT}`);
        log(DEBUG_LEVELS.INFO, `Environment: ${process.env.NODE_ENV || 'development'}`);
        log(DEBUG_LEVELS.INFO, `Debug level: ${DEBUG_LEVELS[process.env.DEBUG_LEVEL] || 'INFO'}`);
    });
}

// Handle process termination
process.on('SIGTERM', () => {
    log(DEBUG_LEVELS.INFO, 'SIGTERM received. Shutting down gracefully...');
    server.close(() => {
        log(DEBUG_LEVELS.INFO, 'Server closed');
        process.exit(0);
    });
});

process.on('unhandledRejection', (reason, promise) => {
    log(DEBUG_LEVELS.ERROR, 'Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    log(DEBUG_LEVELS.ERROR, 'Uncaught Exception:', error);
});

// Export for testing purposes
export { app, server };
