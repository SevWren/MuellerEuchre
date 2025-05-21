import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { GAME_PHASES } from './config/constants.js';
import { resetFullGame, getGameState, updateGameState } from './game/state.js';
import { log, setDebugLevel } from './utils/logger.js';
import { currentDebugLevel } from './utils/logger.js';

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../../public')));

// Set the view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Routes
app.get('/', (req, res) => {
    res.render('index', { gameState: getGameState() });
});

// Initialize game state
resetFullGame();

// Socket.io connection handling
io.on('connection', (socket) => {
    log(currentDebugLevel, `New connection: ${socket.id}`);
    
    // Handle player joining
    socket.on('joinGame', (playerData) => {
        const gameState = getGameState();
        const availableSlot = Object.entries(gameState.players).find(
            ([_, player]) => !player.socketId
        );
        
        if (availableSlot) {
            const [role, player] = availableSlot;
            player.socketId = socket.id;
            player.name = playerData.name || role;
            gameState.connectedPlayerCount++;
            
            updateGameState({
                ...gameState,
                [`players.${role}`]: player
            });
            
            socket.emit('joinedGame', { role, gameState: getGameState() });
            io.emit('gameStateUpdate', getGameState());
            
            log(currentDebugLevel, `${player.name} joined as ${role}`);
        } else {
            socket.emit('gameFull');
        }
    });
    
    // Handle disconnection
    socket.on('disconnect', () => {
        const gameState = getGameState();
        const playerEntry = Object.entries(gameState.players).find(
            ([_, player]) => player.socketId === socket.id
        );
        
        if (playerEntry) {
            const [role, player] = playerEntry;
            log(currentDebugLevel, `${player.name} (${role}) disconnected`);
            
            // Clear the player's socket ID but keep their name
            player.socketId = null;
            gameState.connectedPlayerCount--;
            
            updateGameState({
                ...gameState,
                [`players.${role}`]: player
            });
            
            io.emit('gameStateUpdate', getGameState());
        }
    });
    
    // Add more socket event handlers here...
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    log(currentDebugLevel, `Server running on port ${PORT}`);
});

// Export for testing
let exports = {};
if (process.env.NODE_ENV === 'test') {
    exports = { app, server, io };
}

export default exports;
