/*
Euchre Server - ES Module Version
--------------------------------
Converted from server3.js to use ES Modules
*/

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server);

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['9', '10', 'J', 'Q', 'K', 'A'];

const DEBUG_LEVELS = {
    INFO: 1,
    WARNING: 2,
    VERBOSE: 3,
};

let currentDebugLevel = DEBUG_LEVELS.WARNING;

function log(level, message) {
    if (level <= currentDebugLevel) {
        const timestamp = new Date().toISOString();
        const levelStr = Object.entries(DEBUG_LEVELS).find(([_, val]) => val === level)?.[0] || 'UNKNOWN';
        console.log(`[${timestamp}] [${levelStr}] ${message}`);
    }
}

function setDebugLevel(level) {
    if (Object.values(DEBUG_LEVELS).includes(level)) {
        currentDebugLevel = level;
        log(DEBUG_LEVELS.INFO, `Debug level set to ${level}`);
    } else {
        log(DEBUG_LEVELS.WARNING, `Invalid debug level: ${level}`);
    }
}

// Game state
let gameState = {};

function getRoleBySocketId(socketId) {
    if (!gameState.playerSlots) return null;
    for (const role of gameState.playerSlots) {
        if (gameState.players[role] && gameState.players[role].id === socketId) {
            return role;
        }
    }
    return null;
}

function broadcastGameState() {
    if (!io) return;

    Object.keys(io.sockets.sockets).forEach(socketId => {
        const playerRole = getRoleBySocketId(socketId);
        if (playerRole && gameState.players[playerRole]) {
            const personalizedState = JSON.parse(JSON.stringify(gameState));
            delete personalizedState.deck;

            personalizedState.myRole = playerRole;
            personalizedState.myName = gameState.players[playerRole].name;

            for (const role of gameState.playerSlots) {
                if (role !== playerRole && personalizedState.players[role]) {
                    personalizedState.players[role].hand = personalizedState.players[role].hand.map(() => ({ S: 'back' }));
                }
            }
            io.to(socketId).emit('game_update', personalizedState);
            log(DEBUG_LEVELS.VERBOSE, `Sent game_update to ${playerRole}: phase=${personalizedState.gamePhase}, currentPlayer=${personalizedState.currentPlayer}`);
        }
    });

    if (gameState.gamePhase === 'LOBBY') {
        const lobbyData = {
            players: gameState.playerSlots.map(role => ({
                role,
                name: gameState.players[role]?.name || 'Empty',
                connected: !!gameState.players[role]?.id
            })),
            gameId: gameState.gameId,
            connectedPlayerCount: gameState.connectedPlayerCount
        };
        io.emit('lobby_update', lobbyData);
        log(DEBUG_LEVELS.VERBOSE, `Sent lobby_update: ${JSON.stringify(lobbyData)}`);
    }
}

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const value of VALUES) {
            deck.push({ suit, value, id: `${value}-${suit}` });
        }
    }
    // Assign to gameState.deck for test compatibility
    if (gameState) gameState.deck = deck;
    log(DEBUG_LEVELS.VERBOSE, `Deck created: ${JSON.stringify(deck)}`);
    return deck;
}

function shuffleDeck(deck) {
    // If no deck is provided, use the gameState deck
    const deckToShuffle = deck || (gameState && gameState.deck);
    if (!deckToShuffle || !Array.isArray(deckToShuffle)) {
        log(DEBUG_LEVELS.WARNING, `Invalid deck provided to shuffleDeck: ${typeof deckToShuffle}`);
        return [];
    }
    // Fisher-Yates shuffle
    for (let i = deckToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deckToShuffle[i], deckToShuffle[j]] = [deckToShuffle[j], deckToShuffle[i]];
    }
    // Assign back to gameState.deck for test compatibility
    if (!deck && gameState) gameState.deck = deckToShuffle;
    log(DEBUG_LEVELS.VERBOSE, `Deck shuffled: ${deckToShuffle.length} cards`);
    return deckToShuffle;
}

// Reset the entire game state to initial values
function resetFullGame() {
    log(DEBUG_LEVELS.INFO, 'Resetting full game state...');
    
    // Store the old game state for reference
    const oldGameState = { ...gameState };
    
    // Generate a new game ID that's guaranteed to be different
    let newGameId;
    do {
        newGameId = Date.now() + Math.floor(Math.random() * 10000);
        if (process.env.NODE_ENV === 'test') {
            newGameId += 1000 + Math.floor(Math.random() * 10000);
        }
    } while (newGameId === oldGameState.gameId);
    
    log(DEBUG_LEVELS.INFO, `New game ID: ${newGameId} (old was: ${oldGameState.gameId})`);

    // Create a new deck
    const newDeck = createDeck();
    shuffleDeck(newDeck);

    // Create a completely new game state with default values
    const newGameState = {
        gameId: newGameId,
        playerSlots: ['south', 'west', 'north', 'east'],
        players: {},
        connectedPlayerCount: 0,
        gamePhase: 'LOBBY',
        deck: newDeck,
        kitty: [],
        upCard: null,
        trump: null,
        dealer: 'south',
        initialDealerForSession: null,
        currentPlayer: 'east',
        orderUpRound: 1,
        maker: null,
        playerWhoCalledTrump: null,
        dealerHasDiscarded: false,
        goingAlone: false,
        playerGoingAlone: null,
        partnerSittingOut: null,
        tricks: [],
        currentTrickPlays: [],
        trickLeader: null,
        team1Score: 0,
        team2Score: 0,
        gameMessages: [],
        winningTeam: null,
    };

    // Initialize players with default values
    newGameState.playerSlots.forEach((role) => {
        const oldPlayer = oldGameState.players?.[role] || {};
        const playerName = oldPlayer.name || role.charAt(0).toUpperCase() + role.slice(1);
        
        newGameState.players[role] = {
            id: null,
            socketId: null,
            name: playerName,
            hand: [],
            team: (role === 'south' || role === 'north') ? 1 : 2,
            tricksTaken: 0,
            tricksTakenThisHand: 0,
            isConnected: false,
            isReady: false,
            isDealer: role === 'south',
            hasPlayed: false,
            hasCalledTrump: false,
            isGoingAlone: false,
            isSittingOut: false
        };
        
        // Clean up old socket connections
        if (oldPlayer.socketId) {
            const socket = io.sockets.sockets.get(oldPlayer.socketId);
            if (socket) {
                socket.leave(role);
                socket.leave(`game-${oldGameState.gameId}`);
            }
        }
    });
    
    // Reset any timers
    if (gameState.gameTimer) {
        clearTimeout(gameState.gameTimer);
    }

    // Update the module's gameState reference
    gameState = newGameState;
    
    log(DEBUG_LEVELS.INFO, `Game state reset with new gameId: ${gameState.gameId}`);
    
    // Broadcast the new game state
    if (typeof broadcastGameState === 'function') {
        broadcastGameState();
    }
    
    return gameState;
}

// Export all functions that need to be tested
export {
    log,
    setDebugLevel,
    resetFullGame,
    createDeck,
    shuffleDeck,
    getRoleBySocketId,
    broadcastGameState,
    gameState
};

// Only start the server if this file is run directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        log(DEBUG_LEVELS.INFO, `Server running on port ${PORT}`);
    });
}
