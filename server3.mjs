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

// Utility/game logic functions migrated from server3.js

function addGameMessage(message, state = gameState) {
    if (!state) {
        console.error('addGameMessage: No state provided');
        return;
    }
    
    // Initialize messages array if it doesn't exist
    if (!Array.isArray(state.gameMessages)) {
        state.gameMessages = [];
    }
    
    const timestamp = new Date().toLocaleTimeString();
    const important = false;
    state.gameMessages.unshift({ text: message, timestamp, important });
    
    // Keep only the last 15 messages
    if (state.gameMessages.length > 15) {
        state.gameMessages = state.gameMessages.slice(0, 15);
    }
    log(DEBUG_LEVELS.VERBOSE, `[GAME MSG] ${message}`);
}

function getPlayerBySocketId(socketId) {
    for (const role of gameState.playerSlots) {
        if (gameState.players[role] && gameState.players[role].id === socketId) {
            return gameState.players[role];
        }
    }
    return null;
}

function getRoleBySocketId(socketId) {
    for (const role of gameState.playerSlots) {
        if (gameState.players[role] && gameState.players[role].id === socketId) {
            return role;
        }
    }
    return null;
}

function broadcastGameState() {
    if (!getIo()) return;

    Object.keys(getIo().sockets.sockets).forEach(socketId => {
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
            getIo().to(socketId).emit('game_update', personalizedState);
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
        getIo().emit('lobby_update', lobbyData);
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

function getNextPlayer(currentPlayerRole, playerSlots, goingAlone, playerGoingAlone, partnerSittingOut) {
    const currentIndex = playerSlots.indexOf(currentPlayerRole);
    if (currentIndex === -1) return null;

    let nextIndex = (currentIndex + 1) % playerSlots.length;

    // Skip over the partner if going alone
    if (goingAlone && playerGoingAlone) {
        const partnerIndex = playerSlots.indexOf(partnerSittingOut);
        if (partnerIndex !== -1 && nextIndex === partnerIndex) {
            nextIndex = (nextIndex + 1) % playerSlots.length;
        }
    }

    return playerSlots[nextIndex];
}

function getPartner(playerRole) {
    const partnerMap = {
        'south': 'north',
        'north': 'south',
        'east': 'west',
        'west': 'east'
    };
    return partnerMap[playerRole] || null;
}

function cardToString(card) {
    if (!card) return '';
    const valueStr = card.value === '10' ? 'T' : card.value;
    return `${valueStr}${card.suit.charAt(0).toUpperCase()}`;
}

function sortHand(hand, trumpSuit) {
    const suitOrder = { 'clubs': 1, 'diamonds': 2, 'hearts': 3, 'spades': 4 };
    return hand.sort((a, b) => {
        if (isLeftBower(a, trumpSuit)) return -1;
        if (isLeftBower(b, trumpSuit)) return 1;
        if (isRightBower(a, trumpSuit)) return -1;
        if (isRightBower(b, trumpSuit)) return 1;

        const aRank = VALUES.indexOf(a.value);
        const bRank = VALUES.indexOf(b.value);
        if (aRank !== bRank) return bRank - aRank;

        return (suitOrder[b.suit] || 0) - (suitOrder[a.suit] || 0);
    });
}

function isRightBower(card, trumpSuit) {
    return card.value === 'J' && card.suit === trumpSuit;
}

function isLeftBower(card, trumpSuit) {
    const partnerSuit = trumpSuit === 'hearts' ? 'diamonds' : 'hearts';
    return card.value === 'J' && card.suit === partnerSuit;
}

function getSuitColor(suit) {
    if (suit === 'hearts' || suit === 'diamonds') return 'red';
    if (suit === 'spades' || suit === 'clubs') return 'black';
    return 'black';
}

function getCardRank(card, ledSuit, trumpSuit) {
    if (isRightBower(card, trumpSuit)) return 1000;
    if (isLeftBower(card, trumpSuit)) return 900;

    const suit = card.suit;
    const value = card.value;

    if (suit === ledSuit) {
        return VALUES.indexOf(value);
    } else if (suit === trumpSuit) {
        return 500 + VALUES.indexOf(value);
    } else {
        return VALUES.indexOf(value);
    }
}

// --- Game logic handlers ---

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
            const socket = getIo().sockets.sockets.get
                ? getIo().sockets.sockets.get(oldPlayer.socketId)
                : getIo().sockets.sockets[oldPlayer.socketId];
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

function startNewHand() {
    log(DEBUG_LEVELS.INFO, 'Starting new hand...');
    gameState.currentPlayer = gameState.dealer;
    gameState.gamePhase = 'PLAY';
    gameState.tricks = [];
    gameState.currentTrickPlays = [];
    gameState.winner = null;

    // Reset player states
    for (const role of gameState.playerSlots) {
        const player = gameState.players[role];
        if (player) {
            player.hasPlayed = false;
            player.tricksTakenThisHand = 0;
        }
    }

    // Move the kitty to the table
    gameState.table = gameState.kitty;
    gameState.kitty = [];

    // Deal cards
    const deck = gameState.deck;
    const hands = [deck.slice(0, 5), deck.slice(5, 10), deck.slice(10, 15), deck.slice(15, 20)];
    gameState.playerSlots.forEach((role, index) => {
        gameState.players[role].hand = hands[index];
    });

    // Set trump and upcard
    gameState.trump = null;
    gameState.upCard = null;

    // Notify players
    broadcastGameState();
}

function handleOrderUpDecision(playerRole, orderedUp) {
    log(DEBUG_LEVELS.INFO, `Player ${playerRole} ordered up: ${orderedUp}`);
    if (orderedUp) {
        gameState.trump = gameState.upCard.suit;
        gameState.gamePhase = 'PLAY';
        gameState.currentPlayer = gameState.dealer;
        addGameMessage(`${gameState.players[playerRole].name} has ordered up ${gameState.trump}.`);
    } else {
        addGameMessage(`${gameState.players[playerRole].name} has passed.`);
    }
    gameState.playerWhoCalledTrump = orderedUp ? playerRole : null;
    broadcastGameState();
}

function handleDealerDiscard(dealerRole, cardToDiscard, state = gameState) {
    // Add null check for state
    if (!state) {
        log(DEBUG_LEVELS.WARNING, '[handleDealerDiscard] State is undefined');
        return false;
    }

    log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Entry - dealerRole: ${dealerRole}, cardToDiscard: ${JSON.stringify(cardToDiscard)}`);
    log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Current gamePhase: ${state.gamePhase}, currentPlayer: ${state.currentPlayer}, dealer: ${state.dealer}`);

    // Check if we're in the correct phase
    if (state.gamePhase !== 'AWAITING_DEALER_DISCARD') {
        const errorMsg = `Invalid phase for dealer discard. Expected: AWAITING_DEALER_DISCARD, Actual: ${state.gamePhase || 'undefined'}`;
        log(DEBUG_LEVELS.WARNING, `[handleDealerDiscard] ${errorMsg}`);
        const io = this?.getIo ? this.getIo() : getIo();
        if (io && state.players && state.players[dealerRole]?.id) {
            io.to(state.players[dealerRole].id).emit('action_error', 'Cannot discard in current phase');
        }
        log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Exiting with false - wrong phase`);
        return false;
    }

    // Verify the player is the dealer and it's their turn
    log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Validating dealer role - Dealer: ${state.dealer}, Current Player: ${state.currentPlayer}, Caller: ${dealerRole}`);
    if (dealerRole !== state.dealer || dealerRole !== state.currentPlayer) {
        const errorMsg = `Invalid discard attempt: ${dealerRole} is not the current dealer (dealer: ${state.dealer}, current: ${state.currentPlayer})`;
        log(DEBUG_LEVELS.WARNING, `[handleDealerDiscard] ${errorMsg}`);
        const io = this?.getIo ? this.getIo() : getIo();
        if (io && state.players && state.players[dealerRole]?.id) {
            io.to(state.players[dealerRole].id).emit('action_error', 'Only the dealer can discard at this time');
        }
        log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Exiting with false - not the dealer`);
        return false;
    }

    // Validate dealer exists and has exactly 6 cards
    const player = state.players[dealerRole];
    const handSize = player && Array.isArray(player.hand) ? player.hand.length : 'invalid';
    log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Validating hand - Player exists: ${!!player}, Hand type: ${Array.isArray(player?.hand) ? 'array' : typeof player?.hand}, Hand size: ${handSize}`);
    
    if (!player || !Array.isArray(player.hand) || player.hand.length !== 6) {
        const errorMsg = `Invalid discard by dealer ${dealerRole}: Must have exactly 6 cards to discard (has ${handSize} cards)`;
        log(DEBUG_LEVELS.WARNING, `[handleDealerDiscard] ${errorMsg}`);
        const io = this?.getIo ? this.getIo() : getIo();
        if (io && player?.id) {
            io.to(player.id).emit('action_error', errorMsg);
        }
        log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Exiting with false - invalid hand`);
        return false;
    }

    // Find the card in the player's hand
    log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Looking for card: ${JSON.stringify(cardToDiscard)}`);
    log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Player hand: ${JSON.stringify(player.hand.map(c => ({id: c.id, suit: c.suit, value: c.value})))}`);
    const cardIndex = player.hand.findIndex(card => 
        card.id === cardToDiscard.id && 
        card.suit === cardToDiscard.suit && 
        card.value === cardToDiscard.value
    );

    if (cardIndex === -1) {
        log(DEBUG_LEVELS.WARNING, `[handleDealerDiscard] Card not found in player's hand`);
        const io = this?.getIo ? this.getIo() : getIo();
        if (io && state.players && state.players[dealerRole]?.id) {
            io.to(state.players[dealerRole].id).emit('action_error', 'Card not found in hand');
        }
        log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Exiting with false - card not found`);
        return false;
    }

    try {
        // Remove the discarded card from the player's hand
        const initialHandSize = player.hand.length;
        const [discardedCard] = player.hand.splice(cardIndex, 1);
        state.dealerHasDiscarded = true;
        log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Card removed from hand. Hand size before: ${initialHandSize}, after: ${player.hand.length}`);

        // Move the card to the kitty
        state.kitty = state.kitty || [];
        state.kitty.push(discardedCard);
        log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Card added to kitty. Kitty size: ${state.kitty.length}`);

        // Move to next phase and update current player
        state.gamePhase = 'AWAITING_GO_ALONE';
        state.currentPlayer = state.playerWhoCalledTrump;

        // Add game message
        const nextPlayer = state.players[state.playerWhoCalledTrump];
        const message = `${player.name} has discarded. Asking ${nextPlayer?.name || 'unknown player'} if they want to go alone.`;
        log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] ${message}`);
        addGameMessage(message);

        log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Broadcasting game state update`);
        if (state === gameState) {
            broadcastGameState();
        } else {
            log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Skipping broadcast - using test state`);
        }
        log(DEBUG_LEVELS.INFO, `[handleDealerDiscard] Successfully completed, returning true`);
        return true;
    } catch (error) {
        log(DEBUG_LEVELS.WARNING, `[handleDealerDiscard] Error during discard processing: ${error.message}`);
        log(DEBUG_LEVELS.INFO, error.stack);
        const io = this?.getIo ? this.getIo() : getIo();
        if (io && player?.id) {
            io.to(player.id).emit('action_error', 'An error occurred while processing your discard');
        }
        return false;
    }
}

function handleCallTrumpDecision(playerRole, suitToCall) {
    log(DEBUG_LEVELS.INFO, `Player ${playerRole} called trump: ${suitToCall}`);
    const player = gameState.players[playerRole];
    if (!player || player.hasCalledTrump) {
        log(DEBUG_LEVELS.WARNING, `Invalid trump call by player ${playerRole}`);
        return;
    }

    player.hasCalledTrump = true;
    gameState.trump = suitToCall;

    // Move the game to the next phase (e.g., PLAY)
    gameState.gamePhase = 'PLAY';
    gameState.currentPlayer = getNextPlayer(playerRole, gameState.playerSlots);
    addGameMessage(`${player.name} has called ${suitToCall} as trump.`);

    broadcastGameState();
}

function handleGoAloneDecision(playerRole, decision) {
    log(DEBUG_LEVELS.INFO, `Player ${playerRole} decided to go alone: ${decision}`);
    const player = gameState.players[playerRole];
    if (!player || player.isGoingAlone === decision) {
        log(DEBUG_LEVELS.WARNING, `Invalid go alone decision by player ${playerRole}`);
        return;
    }

    player.isGoingAlone = decision;
    gameState.goingAlone = decision ? true : false;

    if (decision) {
        // If going alone, set the playerGoingAlone and remove their partner
        gameState.playerGoingAlone = decision ? playerRole : null;
        gameState.partnerSittingOut = decision ? getPartner(playerRole) : null;
        addGameMessage(`${player.name} is going alone!`);
    } else {
        // Not going alone, restore partner
        gameState.playerGoingAlone = null;
        gameState.partnerSittingOut = null;
        addGameMessage(`${player.name} will play with a partner.`);
    }

    broadcastGameState();
}

function serverIsValidPlay(playerRole, cardToPlay) {
    const player = gameState.players[playerRole];
    if (!player || !player.hand.find(card => card.id === cardToPlay)) {
        return false;
    }

    // If it's the first play of the trick, any card can be played
    if (gameState.currentTrickPlays.length === 0) {
        return true;
    }

    const ledSuit = gameState.currentTrickPlays[0].suit;
    const trumpSuit = gameState.trump;

    // Must follow suit if able
    if (player.hand.some(card => card.suit === ledSuit)) {
        return cardToPlay.suit === ledSuit;
    }

    // If player has no cards of the led suit, they can play any card
    return true;
}

function handlePlayCard(playerRole, cardToPlay) {
    log(DEBUG_LEVELS.INFO, `Player ${playerRole} played card: ${cardToPlay}`);
    const player = gameState.players[playerRole];
    if (!player || !player.hand.find(card => card.id === cardToPlay)) {
        log(DEBUG_LEVELS.WARNING, `Invalid play by player ${playerRole}: ${cardToPlay}`);
        return;
    }

    // If it's the first play of the trick, any card can be played
    if (gameState.currentTrickPlays.length === 0) {
        gameState.currentTrickPlays.push(player.hand.find(card => card.id === cardToPlay));
        player.hasPlayed = true;
    } else {
        const ledSuit = gameState.currentTrickPlays[0].suit;
        const trumpSuit = gameState.trump;

        // Must follow suit if able
        if (player.hand.some(card => card.suit === ledSuit)) {
            if (cardToPlay.suit !== ledSuit) {
                log(DEBUG_LEVELS.WARNING, `Player ${playerRole} tried to play out of turn: ${cardToPlay}`);
                return;
            }
        } else {
            // If player has no cards of the led suit, they can play any card
            gameState.currentTrickPlays.push(player.hand.find(card => card.id === cardToPlay));
            player.hasPlayed = true;
        }
    }

    // Check if the trick is complete
    if (gameState.currentTrickPlays.length === 4) {
        scoreCurrentHand();
    } else {
        // Move to the next player
        gameState.currentPlayer = getNextPlayer(playerRole, gameState.playerSlots, gameState.goingAlone, gameState.playerGoingAlone, gameState.partnerSittingOut);
    }

    broadcastGameState();
}

function scoreCurrentHand() {
    const { currentTrickPlays, trump, players, playerSlots } = gameState;

    // Determine the winning card based on the game rules
    const winningCard = currentTrickPlays.reduce((winningCard, card) => {
        if (!winningCard) return card;

        const winningCardRank = getCardRank(winningCard, winningCard.suit, trump);
        const cardRank = getCardRank(card, card.suit, trump);

        return cardRank > winningCardRank ? card : winningCard;
    }, null);

    // Determine the winner based on the winning card
    const winningPlayerRole = playerSlots.find(role => players[role]?.hand.find(card => card.id === winningCard.id));

    // Update scores and tricks taken
    if (winningPlayerRole) {
        players[winningPlayerRole].tricksTaken++;
        gameState.currentPlayer = winningPlayerRole;
        gameState.tricks.push(currentTrickPlays);
        gameState.currentTrickPlays = [];
        addGameMessage(`${players[winningPlayerRole].name} wins the trick with ${cardToString(winningCard)}.`);
    }

    // Check if the hand is over (all cards played)
    const allHands = Object.values(players).map(player => player.hand);
    const handOver = allHands.every(hand => hand.length === 0);

    if (handOver) {
        // End of the hand, calculate scores
        const team1Score = playerSlots.filter((_, i) => i % 2 === 0).reduce((sum, role) => sum + players[role].tricksTaken, 0);
        const team2Score = playerSlots.filter((_, i) => i % 2 === 1).reduce((sum, role) => sum + players[role].tricksTaken, 0);

        // Update game state with scores
        gameState.team1Score += team1Score;
        gameState.team2Score += team2Score;

        // Check for a winning team
        const winningTeam = (gameState.team1Score >= 10) ? 1 : (gameState.team2Score >= 10) ? 2 : null;
        if (winningTeam) {
            gameState.winningTeam = winningTeam;
            addGameMessage(`Team ${winningTeam} wins the game!`);
        } else {
            addGameMessage(`End of hand scores - Team 1: ${gameState.team1Score}, Team 2: ${gameState.team2Score}`);
        }
    }

    broadcastGameState();
}

// --- Dependency injection for testing ---
function setMocks({ fs: fsMock, io: ioMock }) {
    if (fsMock) {
        // Replace all fs references
        globalThis._test_fs = fsMock;
    }
    if (ioMock) {
        globalThis._test_io = ioMock;
    }
}

// Use injected mocks if present
function getFs() {
    return globalThis._test_fs || fs;
}
function getIo() {
    return globalThis._test_io || io;
}

// Replace all direct fs/io usage below with getFs()/getIo() as needed
// For example, replace fs.appendFileSync(...) with getFs().appendFileSync(...)
// and io.emit(...) with getIo().emit(...)

// --- Exports for testing and external use ---
export {
    log,
    setDebugLevel,
    resetFullGame,
    createDeck,
    shuffleDeck,
    getRoleBySocketId,
    broadcastGameState,
    gameState,
    getNextPlayer,
    getPartner,
    cardToString,
    sortHand,
    getSuitColor,
    isRightBower,
    isLeftBower,
    getCardRank,
    startNewHand,
    handleOrderUpDecision,
    handleDealerDiscard,
    handleCallTrumpDecision,
    handleGoAloneDecision,
    serverIsValidPlay,
    handlePlayCard,
    scoreCurrentHand,
    DEBUG_LEVELS,
    setMocks
};

// Only start the server if this file is run directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        log(DEBUG_LEVELS.INFO, `Server running on port ${PORT}`);
    });
}
