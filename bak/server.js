// euchre-multiplayer/server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
const VALUES = ['9', '10', 'J', 'Q', 'K', 'A'];

const DEBUG_LEVELS = {
    INFO: 1,
    WARNING: 2,
    VERBOSE: 3,
};
//let currentDebugLevel = DEBUG_LEVELS.INFO; // Default debug level
let currentDebugLevel = DEBUG_LEVELS.VERBOSE; // Default debug level
function log(level, message) {
    if (level <= currentDebugLevel) {
        const levelStr = Object.keys(DEBUG_LEVELS).find(key => DEBUG_LEVELS[key] === level);
        console.log(`[${levelStr}] ${message}`);
    }
}

// Example: Change debug level dynamically (optional)
function setDebugLevel(level) {
    if (Object.values(DEBUG_LEVELS).includes(level)) {
        currentDebugLevel = level;
        log(DEBUG_LEVELS.INFO, `Debug level set to ${Object.keys(DEBUG_LEVELS).find(key => DEBUG_LEVELS[key] === level)}`);
    } else {
        log(DEBUG_LEVELS.WARNING, "Invalid debug level specified.");
    }
}

let gameState = {}; // Will be initialized by resetFullGame

function resetFullGame() {
    gameState = {
        gameId: Date.now(),
        playerSlots: ['south', 'west', 'north', 'east'],
        players: {},
        connectedPlayerCount: 0,
        gamePhase: 'LOBBY',
        deck: [],
        kitty: [],
        upCard: null,
        trump: null,
        dealer: 'south',
        initialDealerForSession: null,
        currentPlayer: null,
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
    gameState.playerSlots.forEach((role) => {
        gameState.players[role] = {
            id: null,
            name: role.charAt(0).toUpperCase() + role.slice(1),
            hand: [],
            team: (role === 'south' || role === 'north') ? 1 : 2,
            tricksTakenThisHand: 0
        };
    });
}

resetFullGame();

function addGameMessage(message, important = false) {
    const timestamp = new Date().toLocaleTimeString();
    log(DEBUG_LEVELS.VERBOSE, `[GAME MSG] ${message}`);
    gameState.gameMessages.unshift({ text: message, timestamp, important });
    if (gameState.gameMessages.length > 15) {
        gameState.gameMessages.pop();
    }
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

// --- START OF HIGHLIGHTED CHANGES for broadcastGameState ---
function broadcastGameState() {
    if (!io) return;

    // Send detailed game state to each connected player
    Object.keys(io.sockets.sockets).forEach(socketId => {
        const playerRole = getRoleBySocketId(socketId);
        if (playerRole && gameState.players[playerRole]) { // Ensure player exists in our roles
            const personalizedState = JSON.parse(JSON.stringify(gameState));
            delete personalizedState.deck; // Don't send full deck

            personalizedState.myRole = playerRole;
            personalizedState.myName = gameState.players[playerRole].name;

            // Obfuscate other players' hands
            for (const role of gameState.playerSlots) {
                if (role !== playerRole && personalizedState.players[role]) {
                    personalizedState.players[role].hand = personalizedState.players[role].hand.map(() => ({ S: 'back' }));
                }
            }
            io.to(socketId).emit('game_update', personalizedState);
        }
    });

    // If in LOBBY, also send a specific lobby_update to all clients
    // This allows clients to easily update lobby-specific UI elements.
    if (gameState.gamePhase === 'LOBBY') {
        io.emit('lobby_update', {
            players: gameState.playerSlots.map(role => ({
                role,
                name: gameState.players[role]?.name || 'Empty', // Use ? for safety if player object not fully init
                connected: !!gameState.players[role]?.id
            })),
            gameId: gameState.gameId,
            connectedPlayerCount: gameState.connectedPlayerCount // Explicitly send this
        });
    }
}
// --- END OF HIGHLIGHTED CHANGES for broadcastGameState ---


function createDeck() {
    gameState.deck = [];
    for (const suit of SUITS) {
        for (const value of VALUES) {
            gameState.deck.push({ suit, value, id: `${value}-${suit}` });
        }
    }
}

function shuffleDeck() {
    for (let i = gameState.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
    }
}

function getNextPlayer(currentPlayerRole) {
    const currentIndex = gameState.playerSlots.indexOf(currentPlayerRole);
    let nextIndex = (currentIndex + 1) % gameState.playerSlots.length;
    if (gameState.goingAlone && gameState.playerSlots[nextIndex] === gameState.partnerSittingOut) {
        nextIndex = (nextIndex + 1) % gameState.playerSlots.length;
    }
    return gameState.playerSlots[nextIndex];
}

function getPartner(playerRole) {
    if (playerRole === 'south') return 'north';
    if (playerRole === 'north') return 'south';
    if (playerRole === 'east') return 'west';
    if (playerRole === 'west') return 'east';
    return null;
}

function cardToString(card) {
    if (!card) return "N/A";
    return `${card.value} of ${card.suit}`;
}

function sortHand(hand) {
    hand.sort((a, b) => {
        const suitOrder = { 'hearts': 0, 'diamonds': 1, 'clubs': 2, 'spades': 3 };
        if (suitOrder[a.suit] < suitOrder[b.suit]) return -1;
        if (suitOrder[a.suit] > suitOrder[b.suit]) return 1;
        const valueOrder = { '9': 0, '10': 1, 'J': 2, 'Q': 3, 'K': 4, 'A': 5 };
        return valueOrder[a.value] - valueOrder[b.value];
    });
}

function getSuitColor(suit) {
    return (suit === 'hearts' || suit === 'diamonds') ? 'red' : 'black';
}

function isRightBower(card, trumpSuit) {
    return trumpSuit && card.value === 'J' && card.suit === trumpSuit;
}

function isLeftBower(card, trumpSuit) {
    if (!trumpSuit || card.value !== 'J') return false;
    const trumpColor = getSuitColor(trumpSuit);
    const cardColor = getSuitColor(card.suit);
    return trumpColor === cardColor && card.suit !== trumpSuit;
}

function getCardRank(card, ledSuit, trumpSuit) {
    if (isRightBower(card, trumpSuit)) return 100;
    if (isLeftBower(card, trumpSuit)) return 90;

    if (card.suit === trumpSuit) {
        const trumpValues = { '9': 1, '10': 2, 'Q': 3, 'K': 4, 'A': 5 };
        return 80 + trumpValues[card.value];
    }
    if (ledSuit) {
      let effectiveLedSuit = ledSuit;
      if (card.suit === effectiveLedSuit) {
          const normalValues = { '9': 1, '10': 2, 'J': 3, 'Q': 4, 'K': 5, 'A': 6 };
          return normalValues[card.value];
      }
    }
    return -1;
}

function startNewHand() {
    addGameMessage("Starting new hand...");
    gameState.gamePhase = 'DEALING';
    createDeck();
    shuffleDeck();

    gameState.playerSlots.forEach(role => {
        gameState.players[role].hand = [];
        gameState.players[role].tricksTakenThisHand = 0;
    });
    gameState.kitty = [];
    gameState.upCard = null;
    gameState.trump = null;
    gameState.orderUpRound = 1;
    gameState.maker = null;
    gameState.playerWhoCalledTrump = null;
    gameState.dealerHasDiscarded = false;
    gameState.goingAlone = false;
    gameState.playerGoingAlone = null;
    gameState.partnerSittingOut = null;
    gameState.tricks = [];
    gameState.currentTrickPlays = [];
    gameState.trickLeader = null;

    if (gameState.initialDealerForSession === null) {
        gameState.initialDealerForSession = gameState.dealer;
    } else {
        gameState.dealer = getNextPlayer(gameState.dealer);
    }
    addGameMessage(`${gameState.players[gameState.dealer].name} (${gameState.dealer}) is the dealer.`);

    let cardIdx = 0;
    const dealOrder = [getNextPlayer(gameState.dealer), getNextPlayer(getNextPlayer(gameState.dealer)), getNextPlayer(getNextPlayer(getNextPlayer(gameState.dealer))), gameState.dealer];

    for (let i = 0; i < 5; i++) {
        for (const role of dealOrder) {
            gameState.players[role].hand.push(gameState.deck[cardIdx++]);
        }
    }
    gameState.playerSlots.forEach(role => sortHand(gameState.players[role].hand));

    gameState.upCard = gameState.deck[cardIdx++];
    gameState.kitty = gameState.deck.slice(cardIdx);

    addGameMessage(`Cards dealt. Up-card is ${cardToString(gameState.upCard)}.`);

    gameState.currentPlayer = getNextPlayer(gameState.dealer);
    gameState.gamePhase = 'ORDER_UP_ROUND1';
    addGameMessage(`${gameState.players[gameState.currentPlayer].name}'s turn to order up or pass.`);
    broadcastGameState();
}

function handleOrderUpDecision(playerRole, orderedUp) {
    if (gameState.gamePhase !== 'ORDER_UP_ROUND1' || playerRole !== gameState.currentPlayer) {
        return;
    }

    addGameMessage(`${gameState.players[playerRole].name} ${orderedUp ? 'ordered up' : 'passed'}.`);

    if (orderedUp) {
        gameState.trump = gameState.upCard.suit;
        gameState.maker = gameState.players[playerRole].team;
        gameState.playerWhoCalledTrump = playerRole;
        addGameMessage(`Trump is ${gameState.trump}! Called by Team ${gameState.maker} (${gameState.players[playerRole].name}).`, true);

        gameState.players[gameState.dealer].hand.push(gameState.upCard);
        sortHand(gameState.players[gameState.dealer].hand);
        gameState.upCard = null;

        gameState.dealerHasDiscarded = false;
        gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
        gameState.currentPlayer = gameState.dealer;
        addGameMessage(`${gameState.players[gameState.dealer].name} (dealer) must discard a card.`);
    } else {
        gameState.currentPlayer = getNextPlayer(playerRole);
        if (playerRole === gameState.dealer) {
            addGameMessage(`Up-card ${cardToString(gameState.kitty[0])} turned down. Round 2 of bidding.`);
            gameState.orderUpRound = 2;
            gameState.currentPlayer = getNextPlayer(gameState.dealer);
            gameState.gamePhase = 'ORDER_UP_ROUND2';
            addGameMessage(`${gameState.players[gameState.currentPlayer].name}'s turn to call trump or pass.`);
        } else {
            addGameMessage(`${gameState.players[gameState.currentPlayer].name}'s turn to order up or pass.`);
        }
    }
    broadcastGameState();
}

function handleDealerDiscard(dealerRole, cardToDiscard) {
    if (gameState.gamePhase !== 'AWAITING_DEALER_DISCARD' || dealerRole !== gameState.dealer || dealerRole !== gameState.currentPlayer) {
        return;
    }
    const hand = gameState.players[dealerRole].hand;
    const discardIndex = hand.findIndex(c => c.id === cardToDiscard.id);

    if (discardIndex === -1 || hand.length !== 6) {
        io.to(gameState.players[dealerRole].id).emit('action_error', "Invalid discard attempt.");
        return;
    }
    const discarded = hand.splice(discardIndex, 1)[0];
    gameState.kitty.push(discarded);
    sortHand(hand);
    addGameMessage(`${gameState.players[dealerRole].name} discarded ${cardToString(discarded)}.`);
    gameState.dealerHasDiscarded = true;

    gameState.gamePhase = 'AWAITING_GO_ALONE';
    gameState.currentPlayer = gameState.playerWhoCalledTrump;
    addGameMessage(`${gameState.players[gameState.playerWhoCalledTrump].name}, do you want to go alone?`);
    broadcastGameState();
}

function handleCallTrumpDecision(playerRole, suitToCall) {
    if (gameState.gamePhase !== 'ORDER_UP_ROUND2' || playerRole !== gameState.currentPlayer) {
        return;
    }

    if (suitToCall) {
        if (suitToCall === gameState.kitty[0].suit) {
             io.to(gameState.players[playerRole].id).emit('action_error', "Cannot call the suit of the turned-down card.");
             return;
        }
        gameState.trump = suitToCall;
        gameState.maker = gameState.players[playerRole].team;
        gameState.playerWhoCalledTrump = playerRole;
        addGameMessage(`Trump is ${gameState.trump}! Called by Team ${gameState.maker} (${gameState.players[playerRole].name}).`, true);

        gameState.gamePhase = 'AWAITING_GO_ALONE';
        gameState.currentPlayer = gameState.playerWhoCalledTrump;
        addGameMessage(`${gameState.players[gameState.playerWhoCalledTrump].name}, do you want to go alone?`);
    } else {
        addGameMessage(`${gameState.players[playerRole].name} passed.`);
        gameState.currentPlayer = getNextPlayer(playerRole);
        if (playerRole === gameState.dealer) {
            addGameMessage("All players passed in the second round. Redealing.", true);
            startNewHand();
        } else {
             addGameMessage(`${gameState.players[gameState.currentPlayer].name}'s turn to call trump or pass.`);
        }
    }
    broadcastGameState();
}

function handleGoAloneDecision(playerRole, decision) {
    if (gameState.gamePhase !== 'AWAITING_GO_ALONE' || playerRole !== gameState.currentPlayer) {
        return;
    }

    if (decision) {
        gameState.goingAlone = true;
        gameState.playerGoingAlone = playerRole;
        gameState.partnerSittingOut = getPartner(playerRole);
        addGameMessage(`${gameState.players[playerRole].name} is GOING ALONE! Partner ${gameState.players[gameState.partnerSittingOut].name} sits out.`, true);
    } else {
        gameState.goingAlone = false;
        addGameMessage(`${gameState.players[playerRole].name} will play with their partner.`);
    }

    gameState.gamePhase = 'PLAYING_TRICKS';
    gameState.trickLeader = getNextPlayer(gameState.dealer);
    gameState.currentPlayer = gameState.trickLeader;
    if (gameState.goingAlone && gameState.currentPlayer === gameState.partnerSittingOut) {
        gameState.currentPlayer = getNextPlayer(gameState.currentPlayer);
        gameState.trickLeader = gameState.currentPlayer;
    }
    addGameMessage(`Hand begins. ${gameState.players[gameState.trickLeader].name} leads the first trick.`);
    broadcastGameState();
}

function serverIsValidPlay(playerRole, cardToPlay) {
    const hand = gameState.players[playerRole].hand;
    const cardInHand = hand.find(c => c.id === cardToPlay.id);
    if (!cardInHand) return false;

    if (gameState.currentTrickPlays.length === 0) return true;

    const ledPlay = gameState.currentTrickPlays[0];
    let ledSuitEffective = ledPlay.card.suit;
    if (isLeftBower(ledPlay.card, gameState.trump)) {
        ledSuitEffective = gameState.trump;
    }

    const playerHasLedSuit = hand.some(c => {
        if (isLeftBower(c, gameState.trump)) return ledSuitEffective === gameState.trump;
        return c.suit === ledSuitEffective;
    });

    if (playerHasLedSuit) {
        if (isLeftBower(cardInHand, gameState.trump)) return ledSuitEffective === gameState.trump;
        return cardInHand.suit === ledSuitEffective;
    }
    return true;
}

function handlePlayCard(playerRole, cardToPlay) {
    if (gameState.gamePhase !== 'PLAYING_TRICKS' || playerRole !== gameState.currentPlayer) {
        io.to(gameState.players[playerRole]?.id).emit('action_error', "Not your turn or wrong phase.");
        return;
    }
    if (!serverIsValidPlay(playerRole, cardToPlay)) {
         io.to(gameState.players[playerRole]?.id).emit('action_error', "Invalid card play.");
        return;
    }

    const hand = gameState.players[playerRole].hand;
    const cardIndex = hand.findIndex(c => c.id === cardToPlay.id);
    const playedCard = hand.splice(cardIndex, 1)[0];

    gameState.currentTrickPlays.push({ player: playerRole, card: playedCard });
    addGameMessage(`${gameState.players[playerRole].name} played ${cardToString(playedCard)}.`);

    const expectedTrickSize = gameState.goingAlone ? 3 : 4;
    if (gameState.currentTrickPlays.length === expectedTrickSize) {
        let trickWinnerRole = gameState.currentTrickPlays[0].player;
        let winningCardInTrick = gameState.currentTrickPlays[0].card;
        const firstCardLed = gameState.currentTrickPlays[0].card;
        let ledSuitForTrick = firstCardLed.suit;
        if (isLeftBower(firstCardLed, gameState.trump)) {
            ledSuitForTrick = gameState.trump;
        }

        for (let i = 1; i < gameState.currentTrickPlays.length; i++) {
            const currentPlay = gameState.currentTrickPlays[i];
            const cardBeingCompared = currentPlay.card;
            const winningIsTrump = isRightBower(winningCardInTrick, gameState.trump) || isLeftBower(winningCardInTrick, gameState.trump) || winningCardInTrick.suit === gameState.trump;
            const currentIsTrump = isRightBower(cardBeingCompared, gameState.trump) || isLeftBower(cardBeingCompared, gameState.trump) || cardBeingCompared.suit === gameState.trump;

            if (currentIsTrump && !winningIsTrump) {
                winningCardInTrick = cardBeingCompared;
                trickWinnerRole = currentPlay.player;
            } else if (currentIsTrump && winningIsTrump) {
                if (getCardRank(cardBeingCompared, null, gameState.trump) > getCardRank(winningCardInTrick, null, gameState.trump)) {
                    winningCardInTrick = cardBeingCompared;
                    trickWinnerRole = currentPlay.player;
                }
            } else if (!currentIsTrump && !winningIsTrump) {
                const winningIsLed = winningCardInTrick.suit === ledSuitForTrick;
                const currentIsLed = cardBeingCompared.suit === ledSuitForTrick;

                if (currentIsLed && !winningIsLed) {
                    winningCardInTrick = cardBeingCompared;
                    trickWinnerRole = currentPlay.player;
                } else if (currentIsLed && winningIsLed) {
                    if (getCardRank(cardBeingCompared, ledSuitForTrick, null) > getCardRank(winningCardInTrick, ledSuitForTrick, null)) {
                        winningCardInTrick = cardBeingCompared;
                        trickWinnerRole = currentPlay.player;
                    }
                }
            }
        }

        gameState.players[trickWinnerRole].tricksTakenThisHand++;
        gameState.tricks.push({ cardsPlayed: [...gameState.currentTrickPlays], winner: trickWinnerRole });
        addGameMessage(`${gameState.players[trickWinnerRole].name} wins the trick with ${cardToString(winningCardInTrick)}. (Tricks: ${gameState.players[trickWinnerRole].tricksTakenThisHand})`);
        gameState.currentTrickPlays = [];

        if (gameState.players.south.hand.length === 0) {
            scoreCurrentHand();
        } else {
            gameState.trickLeader = trickWinnerRole;
            gameState.currentPlayer = trickWinnerRole;
            addGameMessage(`${gameState.players[gameState.currentPlayer].name} leads next trick.`);
        }

    } else {
        gameState.currentPlayer = getNextPlayer(playerRole);
        addGameMessage(`${gameState.players[gameState.currentPlayer].name}'s turn.`);
    }
    broadcastGameState();
}

function scoreCurrentHand() {
    gameState.gamePhase = 'HAND_OVER';
    let team1Tricks = 0;
    let team2Tricks = 0;

    gameState.playerSlots.forEach(role => {
        if (gameState.players[role].team === 1) {
            team1Tricks += gameState.players[role].tricksTakenThisHand;
        } else {
            team2Tricks += gameState.players[role].tricksTakenThisHand;
        }
    });
    addGameMessage(`Hand ended. Team 1 tricks: ${team1Tricks}, Team 2 tricks: ${team2Tricks}. Makers: Team ${gameState.maker}`);

    let pointsAwarded = 0;
    let scoringTeamNum = 0;

    if (gameState.maker === 1) {
        if (team1Tricks === 5) pointsAwarded = gameState.goingAlone ? 4 : 2;
        else if (team1Tricks >= 3) pointsAwarded = 1;
        else {
            pointsAwarded = 2;
            scoringTeamNum = 2;
            addGameMessage(`Team 1 was EUCHRED!`, true);
        }
        if (scoringTeamNum === 0) scoringTeamNum = 1;
    } else {
        if (team2Tricks === 5) pointsAwarded = gameState.goingAlone ? 4 : 2;
        else if (team2Tricks >= 3) pointsAwarded = 1;
        else {
            pointsAwarded = 2;
            scoringTeamNum = 1;
            addGameMessage(`Team 2 was EUCHRED!`, true);
        }
        if (scoringTeamNum === 0) scoringTeamNum = 2;
    }

    if (pointsAwarded > 0) {
        if (scoringTeamNum === 1) gameState.team1Score += pointsAwarded;
        else gameState.team2Score += pointsAwarded;
        addGameMessage(`Team ${scoringTeamNum} scores ${pointsAwarded} point(s). Total: T1 ${gameState.team1Score} - T2 ${gameState.team2Score}.`, true);
    }

    if (gameState.team1Score >= 10 || gameState.team2Score >= 10) {
        gameState.gamePhase = 'GAME_OVER';
        gameState.winningTeam = gameState.team1Score >= 10 ? 1 : 2;
        addGameMessage(`GAME OVER! Team ${gameState.winningTeam} wins! Final Score: Team 1: ${gameState.team1Score}, Team 2: ${gameState.team2Score}.`, true);
    } else {
        addGameMessage("Preparing for next hand...", false);
        setTimeout(() => {
            startNewHand();
        }, 5000);
    }
    // broadcastGameState() will be called either by the timeout for startNewHand or immediately if game over
    if (gameState.gamePhase === 'GAME_OVER') { // Ensure game over state is sent
        broadcastGameState();
    }
}

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    log(DEBUG_LEVELS.INFO, `A user connected: ${socket.id}`);
    let assignedRole = null;

    // --- START OF HIGHLIGHTED CHANGES for connection logic ---
    if (gameState.gamePhase === 'GAME_OVER' && gameState.connectedPlayerCount === 0) {
        resetFullGame();
        addGameMessage("Game was over and all players left, resetting for new session.", true);
    }

    if (gameState.gamePhase === 'LOBBY') {
        for (const role of gameState.playerSlots) {
            if (!gameState.players[role].id) {
                assignedRole = role;
                gameState.players[role].id = socket.id;
                // Keep existing name if player object was already there (e.g. from a previous session)
                // gameState.players[role].name = gameState.players[role].name || (role.charAt(0).toUpperCase() + role.slice(1));
                gameState.connectedPlayerCount++;
                socket.emit('assign_role', { role: assignedRole, name: gameState.players[role].name });
                addGameMessage(`${gameState.players[role].name} (${role}) joined.`);
                break;
            }
        }
    }

    if (!assignedRole && gameState.gamePhase === 'LOBBY') {
        socket.emit('game_full', 'Sorry, all player slots are currently full. Please wait.');
        // Don't disconnect, allow observation or waiting.
    } else if (!assignedRole && gameState.gamePhase !== 'LOBBY') {
        socket.emit('game_in_progress', 'A game is currently in progress. You can observe or wait for the next game.');
        // Potentially send a less personalized game state for observers
        // For now, they just get the message and won't be assigned a role to interact.
    }
    // --- END OF HIGHLIGHTED CHANGES for connection logic ---

    broadcastGameState(); // Send initial state (game_update, and lobby_update if in LOBBY)

    socket.on('request_start_game', () => {
        if (getRoleBySocketId(socket.id) && gameState.connectedPlayerCount === 4 && gameState.gamePhase === 'LOBBY') {
            addGameMessage("Attempting to start game...", true);
            const dealers = ['south', 'west', 'north', 'east'];
            gameState.dealer = dealers[Math.floor(Math.random() * dealers.length)];
            gameState.initialDealerForSession = gameState.dealer;
            startNewHand();
        } else if (gameState.connectedPlayerCount < 4) {
            socket.emit('action_error', 'Need 4 players to start.');
        } else if (gameState.gamePhase !== 'LOBBY') {
            socket.emit('action_error', 'Game not in lobby phase.');
        }
    });

    socket.on('action_order_up', ({ decision }) => {
        const playerRole = getRoleBySocketId(socket.id);
        if (playerRole) handleOrderUpDecision(playerRole, decision);
    });

    socket.on('action_dealer_discard', ({ cardToDiscard }) => {
        const playerRole = getRoleBySocketId(socket.id);
        if (playerRole) handleDealerDiscard(playerRole, cardToDiscard);
    });

    socket.on('action_call_trump', ({ suit }) => {
        const playerRole = getRoleBySocketId(socket.id);
        if (playerRole) handleCallTrumpDecision(playerRole, suit);
    });

    socket.on('action_go_alone', ({ decision }) => {
        const playerRole = getRoleBySocketId(socket.id);
        if (playerRole) handleGoAloneDecision(playerRole, decision);
    });

    socket.on('action_play_card', ({ card }) => {
        const playerRole = getRoleBySocketId(socket.id);
        if (playerRole) handlePlayCard(playerRole, card);
    });
    
    socket.on('request_new_game_session', () => {
        if (gameState.gamePhase === 'GAME_OVER' || gameState.gamePhase === 'LOBBY') {
            addGameMessage("New game session requested.", true);
            const currentPlayersData = {}; // Store ID and name for re-assignment
            gameState.playerSlots.forEach(role => {
                if(gameState.players[role] && gameState.players[role].id) { // Check if player slot was occupied
                    currentPlayersData[gameState.players[role].id] = { role: role, name: gameState.players[role].name };
                }
            });

            resetFullGame(); 

            let reAssignedCount = 0;
            // Re-assign based on socket ID, into any available slot if their old one is taken
            // Or, try to give them their old slot first.
            const assignedSocketIds = new Set();

            // First pass: try to reassign to original role
            gameState.playerSlots.forEach(role => {
                for (const socketId in currentPlayersData) {
                    if (currentPlayersData[socketId].role === role && io.sockets.sockets[socketId]) {
                        gameState.players[role].id = socketId;
                        gameState.players[role].name = currentPlayersData[socketId].name;
                        reAssignedCount++;
                        assignedSocketIds.add(socketId);
                        io.to(socketId).emit('assign_role', { role: role, name: gameState.players[role].name });
                        break; 
                    }
                }
            });
            
            // Second pass: assign remaining connected players to any empty slot
            gameState.playerSlots.forEach(role => {
                if (!gameState.players[role].id) { // If slot is still empty
                    for (const socketId in currentPlayersData) {
                        if (!assignedSocketIds.has(socketId) && io.sockets.sockets[socketId]) {
                            gameState.players[role].id = socketId;
                            gameState.players[role].name = currentPlayersData[socketId].name;
                            reAssignedCount++;
                            assignedSocketIds.add(socketId);
                            io.to(socketId).emit('assign_role', { role: role, name: gameState.players[role].name });
                            break;
                        }
                    }
                }
            });

            gameState.connectedPlayerCount = reAssignedCount;
            gameState.gamePhase = 'LOBBY';
            addGameMessage(`Game reset. ${reAssignedCount} players assigned. Waiting for more if needed.`);
            broadcastGameState();
        } else {
            socket.emit('action_error', "Cannot start a new game session while a game is in progress.");
        }
    });


    socket.on('disconnect', () => {
        log(DEBUG_LEVELS.WARNING, `User disconnected: ${socket.id}`);
        const role = getRoleBySocketId(socket.id);
        if (role && gameState.players[role]) { // Check if player and role exist
            addGameMessage(`${gameState.players[role].name} (${role}) left.`);
            gameState.players[role].id = null;
            // gameState.players[role].name = role.charAt(0).toUpperCase() + role.slice(1); // Reset name to default
            gameState.connectedPlayerCount--;

            if (gameState.gamePhase !== 'LOBBY' && gameState.gamePhase !== 'GAME_OVER') {
                addGameMessage("Player disconnected during game.", true);
                if (gameState.connectedPlayerCount < 4) { // Or some other critical number
                     const currentT1 = gameState.team1Score;
                     const currentT2 = gameState.team2Score;
                     const initialDealer = gameState.initialDealerForSession;
                     const currentPlayersData = {};
                     gameState.playerSlots.forEach(r => {
                         if(gameState.players[r] && gameState.players[r].id && gameState.players[r].id !== socket.id) {
                            currentPlayersData[gameState.players[r].id] = { role: r, name: gameState.players[r].name };
                         }
                     });

                     resetFullGame();
                     gameState.team1Score = currentT1;
                     gameState.team2Score = currentT2;
                     gameState.initialDealerForSession = initialDealer;
                     
                     let reAssignedCount = 0;
                     const assignedSocketIds = new Set();
                     // Re-assign remaining players (similar to request_new_game_session)
                    gameState.playerSlots.forEach(r_slot => {
                        for (const s_id in currentPlayersData) {
                            if (currentPlayersData[s_id].role === r_slot && io.sockets.sockets[s_id] && !assignedSocketIds.has(s_id)) {
                                gameState.players[r_slot].id = s_id;
                                gameState.players[r_slot].name = currentPlayersData[s_id].name;
                                reAssignedCount++;
                                assignedSocketIds.add(s_id);
                                io.to(s_id).emit('assign_role', { role: r_slot, name: gameState.players[r_slot].name });
                                break;
                            }
                        }
                    });
                     gameState.playerSlots.forEach(r_slot => {
                        if (!gameState.players[r_slot].id) {
                            for (const s_id in currentPlayersData) {
                                if (!assignedSocketIds.has(s_id) && io.sockets.sockets[s_id]) {
                                    gameState.players[r_slot].id = s_id;
                                    gameState.players[r_slot].name = currentPlayersData[s_id].name;
                                    reAssignedCount++;
                                    assignedSocketIds.add(s_id);
                                    io.to(s_id).emit('assign_role', { role: r_slot, name: gameState.players[r_slot].name });
                                    break;
                                }
                            }
                        }
                    });
                     gameState.connectedPlayerCount = reAssignedCount;
                     gameState.gamePhase = 'LOBBY';
                     addGameMessage("Game reset to LOBBY due to player leaving.", true);
                }
            }
            broadcastGameState();
        }
    });
});

app.use(express.static(path.join(__dirname, 'public')));

server.listen(PORT, () => {
    log(DEBUG_LEVELS.INFO, `Euchre server listening on port ${PORT}`);
    log(DEBUG_LEVELS.INFO, `Access game at http://localhost:${PORT} or http://<your-local-ip>:${PORT}`);
    addGameMessage("Server started. Waiting for players.", true);
    broadcastGameState();
});