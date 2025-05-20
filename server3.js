const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

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
        const levelStr = Object.keys(DEBUG_LEVELS).find(key => DEBUG_LEVELS[key] === level);
        const logMessage = `[${levelStr}] ${message}\n`;
        console.log(logMessage);
        fs.appendFileSync('server_log.txt', logMessage);
    }
}

function setDebugLevel(level) {
    if (Object.values(DEBUG_LEVELS).includes(level)) {
        currentDebugLevel = level;
        log(DEBUG_LEVELS.INFO, `Debug level set to ${Object.keys(DEBUG_LEVELS).find(key => DEBUG_LEVELS[key] === level)}`);
    } else {
        log(DEBUG_LEVELS.WARNING, "Invalid debug level specified.");
    }
}

let gameState = {};

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
    log(DEBUG_LEVELS.VERBOSE, `Game state reset: ${JSON.stringify(gameState)}`);
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
    gameState.deck = [];
    for (const suit of SUITS) {
        for (const value of VALUES) {
            gameState.deck.push({ suit, value, id: `${value}-${suit}` });
        }
    }
    log(DEBUG_LEVELS.VERBOSE, `Deck created: ${JSON.stringify(gameState.deck)}`);
}

function shuffleDeck() {
    for (let i = gameState.deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.deck[i], gameState.deck[j]] = [gameState.deck[j], gameState.deck[i]];
    }
    log(DEBUG_LEVELS.VERBOSE, `Deck shuffled: ${JSON.stringify(gameState.deck)}`);
}

function getNextPlayer(currentPlayerRole, roles, goingAlone, playerGoingAlone, partnerSittingOut) {
    // Defensive: use explicit args, fallback to gameState for backward compatibility
    const slots = Array.isArray(roles) ? roles : (gameState && Array.isArray(gameState.playerSlots) ? gameState.playerSlots : undefined);
    if (!slots || !Array.isArray(slots) || !slots.length) return undefined;
    const idx = slots.indexOf(currentPlayerRole);
    if (idx === -1) return undefined;
    let nextIdx = (idx + 1) % slots.length;
    if (goingAlone && partnerSittingOut && slots[nextIdx] === partnerSittingOut) {
        nextIdx = (nextIdx + 1) % slots.length;
        // If only 2 players left, prevent infinite loop
        if (slots[nextIdx] === currentPlayerRole) return undefined;
    }
    return slots[nextIdx];
}

function getPartner(playerRole) {
    if (!playerRole) return undefined;
    if (playerRole === 'south') return 'north';
    if (playerRole === 'north') return 'south';
    if (playerRole === 'east') return 'west';
    if (playerRole === 'west') return 'east';
    return undefined;
}

function cardToString(card) {
    if (card === null || card === undefined) return 'N/A';
    if (!card || typeof card !== 'object' || !card.value || !card.suit) return 'Unknown Card';
    return `${card.value} of ${card.suit}`;
}

function sortHand(hand, trumpSuit) {
    if (!Array.isArray(hand)) return [];
    // Defensive: do not mutate original
    const copy = hand.map(card => ({ ...card }));
    const suitOrder = { 'hearts': 0, 'diamonds': 1, 'clubs': 2, 'spades': 3 };
    const valueOrder = { '9': 0, '10': 1, 'J': 2, 'Q': 3, 'K': 4, 'A': 5 };
    copy.sort((a, b) => {
        // Trump sorting: right bower > left bower > trump > others
        if (trumpSuit) {
            const aIsRB = isRightBower(a, trumpSuit);
            const bIsRB = isRightBower(b, trumpSuit);
            if (aIsRB && !bIsRB) return -1;
            if (!aIsRB && bIsRB) return 1;
            const aIsLB = isLeftBower(a, trumpSuit);
            const bIsLB = isLeftBower(b, trumpSuit);
            if (aIsLB && !bIsLB) return -1;
            if (!aIsLB && bIsLB) return 1;
            if (a.suit === trumpSuit && b.suit !== trumpSuit) return -1;
            if (a.suit !== trumpSuit && b.suit === trumpSuit) return 1;
        }
        if (suitOrder[a.suit] < suitOrder[b.suit]) return -1;
        if (suitOrder[a.suit] > suitOrder[b.suit]) return 1;
        return valueOrder[b.value] - valueOrder[a.value]; // Sort values in descending order (A, K, Q, etc.)
    });
    return copy;
}

function isRightBower(card, trumpSuit) {
    if (!card || !trumpSuit) return false;
    return card.value === 'J' && card.suit === trumpSuit;
}

function isLeftBower(card, trumpSuit) {
    if (!card || !trumpSuit || card.value !== 'J') return false;
    const trumpColor = getSuitColor(trumpSuit);
    const cardColor = getSuitColor(card.suit);
    return trumpColor === cardColor && card.suit !== trumpSuit;
}

function getCardRank(card, ledSuit, trumpSuit) {
    if (!card || !card.value || !card.suit) return -1;
    if (isRightBower(card, trumpSuit)) return 100;
    if (isLeftBower(card, trumpSuit)) return 90;
    if (trumpSuit && card.suit === trumpSuit) {
        const trumpValues = { '9': 1, '10': 2, 'Q': 3, 'K': 4, 'A': 5 };
        return 80 + (trumpValues[card.value] || 0);
    }
    if (ledSuit && card.suit === ledSuit) {
        const normalValues = { '9': 1, '10': 2, 'J': 3, 'Q': 4, 'K': 5, 'A': 6 };
        return normalValues[card.value] || 0;
    }
    if (!trumpSuit && !ledSuit) return 0;
    return -1;
}

function startNewHand() {
    addGameMessage("Starting new hand...");
    gameState.gamePhase = 'DEALING';
    log(DEBUG_LEVELS.INFO, `Game phase changed to ${gameState.gamePhase}`);
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
    log(DEBUG_LEVELS.INFO, `Dealer assigned: ${gameState.dealer}`);

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
    log(DEBUG_LEVELS.INFO, `Up-card: ${cardToString(gameState.upCard)}`);

    gameState.currentPlayer = getNextPlayer(gameState.dealer);
    gameState.gamePhase = 'ORDER_UP_ROUND1';
    log(DEBUG_LEVELS.INFO, `Game phase changed to ${gameState.gamePhase}`);
    addGameMessage(`${gameState.players[gameState.currentPlayer].name}'s turn to order up or pass.`);
    log(DEBUG_LEVELS.VERBOSE, `New hand started: ${JSON.stringify(gameState)}`);
    broadcastGameState();
}

function handleOrderUpDecision(playerRole, orderedUp) {
    if (gameState.gamePhase !== 'ORDER_UP_ROUND1' || playerRole !== gameState.currentPlayer) {
        log(DEBUG_LEVELS.WARNING, `Invalid order up attempt by ${playerRole}`);
        return;
    }

    addGameMessage(`${gameState.players[playerRole].name} ${orderedUp ? 'ordered up' : 'passed'}.`);
    log(DEBUG_LEVELS.INFO, `${gameState.players[playerRole].name} ${orderedUp ? 'ordered up' : 'passed'}`);

    if (orderedUp) {
        gameState.trump = gameState.upCard.suit;
        gameState.maker = gameState.players[playerRole].team;
        gameState.playerWhoCalledTrump = playerRole;
        addGameMessage(`Trump is ${gameState.trump}! Called by Team ${gameState.maker} (${gameState.players[playerRole].name}).`, true);
        log(DEBUG_LEVELS.INFO, `Trump set to ${gameState.trump} by Team ${gameState.maker}`);

        gameState.players[gameState.dealer].hand.push(gameState.upCard);
        sortHand(gameState.players[gameState.dealer].hand);
        gameState.upCard = null;

        gameState.dealerHasDiscarded = false;
        gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
        gameState.currentPlayer = gameState.dealer;
        log(DEBUG_LEVELS.INFO, `Game phase changed to ${gameState.gamePhase}`);
        addGameMessage(`${gameState.players[gameState.dealer].name} (dealer) must discard a card.`);
    } else {
        gameState.currentPlayer = getNextPlayer(playerRole);
        if (playerRole === gameState.dealer) {
            addGameMessage(`Up-card ${cardToString(gameState.kitty[0])} turned down. Round 2 of bidding.`);
            log(DEBUG_LEVELS.INFO, `Up-card turned down. Starting Round 2 of bidding.`);
            gameState.orderUpRound = 2;
            gameState.currentPlayer = getNextPlayer(gameState.dealer);
            gameState.gamePhase = 'ORDER_UP_ROUND2';
            log(DEBUG_LEVELS.INFO, `Game phase changed to ${gameState.gamePhase}`);
            addGameMessage(`${gameState.players[gameState.currentPlayer].name}'s turn to call trump or pass.`);
        } else {
            addGameMessage(`${gameState.players[gameState.currentPlayer].name}'s turn to order up or pass.`);
            log(DEBUG_LEVELS.INFO, `${gameState.players[gameState.currentPlayer].name}'s turn to order up or pass`);
        }
    }
    broadcastGameState();
}

function handleDealerDiscard(dealerRole, cardToDiscard) {
    if (gameState.gamePhase !== 'AWAITING_DEALER_DISCARD' || dealerRole !== gameState.dealer || dealerRole !== gameState.currentPlayer) {
        log(DEBUG_LEVELS.WARNING, `Invalid discard attempt by ${dealerRole}`);
        return;
    }
    const hand = gameState.players[dealerRole].hand;
    const discardIndex = hand.findIndex(c => c.id === cardToDiscard.id);

    if (discardIndex === -1 || hand.length !== 6) {
        io.to(gameState.players[dealerRole].id).emit('action_error', "Invalid discard attempt.");
        log(DEBUG_LEVELS.WARNING, `Invalid discard attempt by ${dealerRole}: card not in hand or hand size incorrect`);
        return;
    }
    const discarded = hand.splice(discardIndex, 1)[0];
    gameState.kitty.push(discarded);
    sortHand(hand);
    addGameMessage(`${gameState.players[dealerRole].name} discarded ${cardToString(discarded)}.`);
    log(DEBUG_LEVELS.INFO, `${gameState.players[dealerRole].name} discarded ${cardToString(discarded)}`);
    gameState.dealerHasDiscarded = true;

    gameState.gamePhase = 'AWAITING_GO_ALONE';
    gameState.currentPlayer = gameState.playerWhoCalledTrump;
    log(DEBUG_LEVELS.INFO, `Game phase changed to ${gameState.gamePhase}`);
    addGameMessage(`${gameState.players[gameState.playerWhoCalledTrump].name}, do you want to go alone?`);
    broadcastGameState();
}

function handleCallTrumpDecision(playerRole, suitToCall) {
    if (gameState.gamePhase !== 'ORDER_UP_ROUND2' || playerRole !== gameState.currentPlayer) {
        log(DEBUG_LEVELS.WARNING, `Invalid call trump attempt by ${playerRole}`);
        return;
    }

    if (suitToCall) {
        if (suitToCall === gameState.kitty[0].suit) {
            io.to(gameState.players[playerRole].id).emit('action_error', "Cannot call the suit of the turned-down card.");
            log(DEBUG_LEVELS.WARNING, `${playerRole} attempted to call turned-down suit: ${suitToCall}`);
            return;
        }
        gameState.trump = suitToCall;
        gameState.maker = gameState.players[playerRole].team;
        gameState.playerWhoCalledTrump = playerRole;
        addGameMessage(`Trump is ${gameState.trump}! Called by Team ${gameState.maker} (${gameState.players[playerRole].name}).`, true);
        log(DEBUG_LEVELS.INFO, `Trump set to ${gameState.trump} by Team ${gameState.maker}`);

        gameState.gamePhase = 'AWAITING_GO_ALONE';
        gameState.currentPlayer = gameState.playerWhoCalledTrump;
        log(DEBUG_LEVELS.INFO, `Game phase changed to ${gameState.gamePhase}`);
        addGameMessage(`${gameState.players[gameState.playerWhoCalledTrump].name}, do you want to go alone?`);
    } else {
        addGameMessage(`${gameState.players[playerRole].name} passed.`);
        log(DEBUG_LEVELS.INFO, `${gameState.players[playerRole].name} passed in Round 2`);
        gameState.currentPlayer = getNextPlayer(playerRole);
        if (playerRole === gameState.dealer) {
            addGameMessage("All players passed in the second round. Redealing.", true);
            log(DEBUG_LEVELS.INFO, "All players passed in Round 2. Redealing.");
            startNewHand();
        } else {
            addGameMessage(`${gameState.players[gameState.currentPlayer].name}'s turn to call trump or pass.`);
            log(DEBUG_LEVELS.INFO, `${gameState.players[gameState.currentPlayer].name}'s turn to call trump or pass`);
        }
    }
    broadcastGameState();
}

function handleGoAloneDecision(playerRole, decision) {
    if (gameState.gamePhase !== 'AWAITING_GO_ALONE' || playerRole !== gameState.currentPlayer) {
        log(DEBUG_LEVELS.WARNING, `Invalid go alone decision attempt by ${playerRole}`);
        return;
    }

    if (decision) {
        gameState.goingAlone = true;
        gameState.playerGoingAlone = playerRole;
        gameState.partnerSittingOut = getPartner(playerRole);
        addGameMessage(`${gameState.players[playerRole].name} is GOING ALONE! Partner ${gameState.players[gameState.partnerSittingOut].name} sits out.`, true);
        log(DEBUG_LEVELS.INFO, `${gameState.players[playerRole].name} is going alone. Partner ${gameState.players[gameState.partnerSittingOut].name} sits out`);
    } else {
        gameState.goingAlone = false;
        addGameMessage(`${gameState.players[playerRole].name} will play with their partner.`);
        log(DEBUG_LEVELS.INFO, `${gameState.players[playerRole].name} will play with their partner`);
    }

    gameState.gamePhase = 'PLAYING_TRICKS';
    gameState.trickLeader = getNextPlayer(gameState.dealer);
    gameState.currentPlayer = gameState.trickLeader;
    if (gameState.goingAlone && gameState.currentPlayer === gameState.partnerSittingOut) {
        gameState.currentPlayer = getNextPlayer(gameState.currentPlayer);
        gameState.trickLeader = gameState.currentPlayer;
    }
    addGameMessage(`Hand begins. ${gameState.players[gameState.trickLeader].name} leads the first trick.`);
    log(DEBUG_LEVELS.INFO, `Game phase changed to ${gameState.gamePhase}. Trick leader: ${gameState.trickLeader}`);
    broadcastGameState();
}

function serverIsValidPlay(playerRole, cardToPlay) {
    const hand = gameState.players[playerRole].hand;
    const cardInHand = hand.find(c => c.id === cardToPlay.id);
    if (!cardInHand) {
        log(DEBUG_LEVELS.VERBOSE, `Card not in hand: ${cardToString(cardToPlay)} for ${playerRole}`);
        return false;
    }

    if (gameState.currentTrickPlays.length === 0) {
        log(DEBUG_LEVELS.VERBOSE, `Valid play check for ${playerRole}: ${cardToString(cardToPlay)} - valid (leading)`);
        return true;
    }

    const ledPlay = gameState.currentTrickPlays[0];
    let ledSuitEffective = ledPlay.card.suit;
    if (isLeftBower(ledPlay.card, gameState.trump)) {
        ledSuitEffective = gameState.trump;
    }

    const playerHasLedSuit = hand.some(c => {
        if (isLeftBower(c, gameState.trump)) return ledSuitEffective === gameState.trump;
        return c.suit === ledSuitEffective;
    });

    let isValid = true;
    if (playerHasLedSuit) {
        if (isLeftBower(cardToPlay, gameState.trump)) {
            isValid = ledSuitEffective === gameState.trump;
        } else {
            isValid = cardToPlay.suit === ledSuitEffective;
        }
    }
    log(DEBUG_LEVELS.VERBOSE, `Valid play check for ${playerRole}: ${cardToString(cardToPlay)} - ${isValid ? 'valid' : 'invalid'}`);
    return isValid;
}

function handlePlayCard(playerRole, cardToPlay) {
    if (gameState.gamePhase !== 'PLAYING_TRICKS' || playerRole !== gameState.currentPlayer) {
        io.to(gameState.players[playerRole]?.id).emit('action_error', "Not your turn or wrong phase.");
        log(DEBUG_LEVELS.WARNING, `Invalid play attempt by ${playerRole}: not their turn or wrong phase`);
        return;
    }
    if (!serverIsValidPlay(playerRole, cardToPlay)) {
        io.to(gameState.players[playerRole]?.id).emit('action_error', "Invalid card play.");
        log(DEBUG_LEVELS.WARNING, `Invalid card play attempt by ${playerRole}: ${cardToString(cardToPlay)}`);
        return;
    }

    const hand = gameState.players[playerRole].hand;
    const cardIndex = hand.findIndex(c => c.id === cardToPlay.id);
    const playedCard = hand.splice(cardIndex, 1)[0];

    gameState.currentTrickPlays.push({ player: playerRole, card: playedCard });
    addGameMessage(`${gameState.players[playerRole].name} played ${cardToString(playedCard)}.`);
    log(DEBUG_LEVELS.INFO, `${gameState.players[playerRole].name} played ${cardToString(playedCard)}`);

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
        log(DEBUG_LEVELS.INFO, `Trick won by ${gameState.players[trickWinnerRole].name} with ${cardToString(winningCardInTrick)}`);
        gameState.currentTrickPlays = [];

        if (gameState.players.south.hand.length === 0) {
            scoreCurrentHand();
        } else {
            gameState.trickLeader = trickWinnerRole;
            gameState.currentPlayer = trickWinnerRole;
            addGameMessage(`${gameState.players[gameState.currentPlayer].name} leads next trick.`);
            log(DEBUG_LEVELS.INFO, `${gameState.players[gameState.currentPlayer].name} leads next trick`);
        }
    } else {
        gameState.currentPlayer = getNextPlayer(playerRole);
        addGameMessage(`${gameState.players[gameState.currentPlayer].name}'s turn.`);
        log(DEBUG_LEVELS.INFO, `${gameState.players[gameState.currentPlayer].name}'s turn`);
    }
    broadcastGameState();
}

function scoreCurrentHand() {
    gameState.gamePhase = 'HAND_OVER';
    log(DEBUG_LEVELS.INFO, `Game phase changed to ${gameState.gamePhase}`);
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
    log(DEBUG_LEVELS.INFO, `Hand ended. Team 1 tricks: ${team1Tricks}, Team 2 tricks: ${team2Tricks}. Makers: Team ${gameState.maker}`);

    let pointsAwarded = 0;
    let scoringTeamNum = 0;

    if (gameState.maker === 1) {
        if (team1Tricks === 5) pointsAwarded = gameState.goingAlone ? 4 : 2;
        else if (team1Tricks >= 3) pointsAwarded = 1;
        else {
            pointsAwarded = 2;
            scoringTeamNum = 2;
            addGameMessage(`Team 1 was EUCHRED!`, true);
            log(DEBUG_LEVELS.INFO, `Team 1 was EUCHRED!`);
        }
        if (scoringTeamNum === 0) scoringTeamNum = 1;
    } else {
        if (team2Tricks === 5) pointsAwarded = gameState.goingAlone ? 4 : 2;
        else if (team2Tricks >= 3) pointsAwarded = 1;
        else {
            pointsAwarded = 2;
            scoringTeamNum = 1;
            addGameMessage(`Team 2 was EUCHRED!`, true);
            log(DEBUG_LEVELS.INFO, `Team 2 was EUCHRED!`);
        }
        if (scoringTeamNum === 0) scoringTeamNum = 2;
    }

    if (pointsAwarded > 0) {
        if (scoringTeamNum === 1) gameState.team1Score += pointsAwarded;
        else gameState.team2Score += pointsAwarded;
        addGameMessage(`Team ${scoringTeamNum} scores ${pointsAwarded} point(s). Total: T1 ${gameState.team1Score} - T2 ${gameState.team2Score}.`, true);
        log(DEBUG_LEVELS.INFO, `Team ${scoringTeamNum} scored ${pointsAwarded} points. Total: T1 ${gameState.team1Score} - T2 ${gameState.team2Score}`);
    }

    if (gameState.team1Score >= 10 || gameState.team2Score >= 10) {
        gameState.gamePhase = 'GAME_OVER';
        gameState.winningTeam = gameState.team1Score >= 10 ? 1 : 2;
        addGameMessage(`GAME OVER! Team ${gameState.winningTeam} wins! Final Score: Team 1: ${gameState.team1Score}, Team 2: ${gameState.team2Score}.`, true);
        log(DEBUG_LEVELS.INFO, `Game over. Team ${gameState.winningTeam} wins with scores T1: ${gameState.team1Score}, T2: ${gameState.team2Score}`);
    } else {
        addGameMessage("Preparing for next hand...", false);
        log(DEBUG_LEVELS.INFO, "Preparing for next hand");
        setTimeout(() => {
            startNewHand();
        }, 5000);
    }
    log(DEBUG_LEVELS.VERBOSE, `Hand scored: ${JSON.stringify(gameState)}`);
    if (gameState.gamePhase === 'GAME_OVER') {
        broadcastGameState();
    }
}

io.on('connection', (socket) => {
    log(DEBUG_LEVELS.INFO, `A user connected: ${socket.id}`);
    let assignedRole = null;

    if (gameState.gamePhase === 'GAME_OVER' && gameState.connectedPlayerCount === 0) {
        resetFullGame();
        addGameMessage("Game was over and all players left, resetting for new session.", true);
        log(DEBUG_LEVELS.INFO, "Game was over and all players left, resetting for new session");
    }

    if (gameState.gamePhase === 'LOBBY') {
        for (const role of gameState.playerSlots) {
            if (!gameState.players[role].id) {
                assignedRole = role;
                gameState.players[role].id = socket.id;
                gameState.connectedPlayerCount++;
                socket.emit('assign_role', { role: assignedRole, name: gameState.players[role].name });
                addGameMessage(`${gameState.players[role].name} (${role}) joined.`);
                log(DEBUG_LEVELS.INFO, `${gameState.players[role].name} (${role}) joined`);
                break;
            }
        }
    }

    if (!assignedRole && gameState.gamePhase === 'LOBBY') {
        socket.emit('game_full', 'Sorry, all player slots are currently full. Please wait.');
        log(DEBUG_LEVELS.WARNING, `Game full for new connection: ${socket.id}`);
    } else if (!assignedRole && gameState.gamePhase !== 'LOBBY') {
        socket.emit('game_in_progress', 'A game is currently in progress. You can observe or wait for the next game.');
        log(DEBUG_LEVELS.WARNING, `Game in progress for new connection: ${socket.id}`);
    }
    
    broadcastGameState(); // Broadcast the current game state to all connected clients

    /**
     * Handles the request to start a new game.
     * Validates the request to ensure the game is in the correct state before starting.
     */
    socket.on('request_start_game', () => {
        const playerRole = getRoleBySocketId(socket.id);

        // Check if the request is valid: 4 players are connected and the game is in the 'LOBBY' phase
        if (playerRole && gameState.connectedPlayerCount === 4 && gameState.gamePhase === 'LOBBY') {
            log(DEBUG_LEVELS.INFO, `${gameState.players[playerRole].name} (${playerRole}) requested to start the game`);
            addGameMessage("Attempting to start game...", true);
            log(DEBUG_LEVELS.INFO, "Game start requested");

            // Randomly assign a dealer for the new game session
            const dealers = ['south', 'west', 'north', 'east'];
            gameState.dealer = dealers[Math.floor(Math.random() * dealers.length)];
            gameState.initialDealerForSession = gameState.dealer;

            // Start a new hand, transitioning the game to the 'DEALING' phase
            startNewHand();
        } else if (gameState.connectedPlayerCount < 4) {
            // Error handling when there are not enough players
            socket.emit('action_error', 'Need 4 players to start.');
            log(DEBUG_LEVELS.WARNING, `Attempt to start game with ${gameState.connectedPlayerCount} players. Need 4`);
        } else if (gameState.gamePhase !== 'LOBBY') {
            // Error handling if the game is not in the 'LOBBY' phase
            socket.emit('action_error', 'Game not in lobby phase.');
            log(DEBUG_LEVELS.WARNING, `Attempt to start game while not in lobby phase. Current phase: ${gameState.gamePhase}`);
        }
    });

    socket.on('action_order_up', ({ decision }) => {
        try {
            log(DEBUG_LEVELS.VERBOSE, `Received action_order_up from ${socket.id}: ${decision}`);
            const playerRole = getRoleBySocketId(socket.id);
            if (playerRole) handleOrderUpDecision(playerRole, decision);
        } catch (error) {
            log(DEBUG_LEVELS.WARNING, `Error in action_order_up: ${error.message}`);
        }
    });

    socket.on('action_dealer_discard', ({ cardToDiscard }) => {
        try {
            log(DEBUG_LEVELS.VERBOSE, `Received action_dealer_discard from ${socket.id}: ${JSON.stringify(cardToDiscard)}`);
            const playerRole = getRoleBySocketId(socket.id);
            if (playerRole) handleDealerDiscard(playerRole, cardToDiscard);
        } catch (error) {
            log(DEBUG_LEVELS.WARNING, `Error in action_dealer_discard: ${error.message}`);
        }
    });

    socket.on('action_call_trump', ({ suit }) => {
        try {
            log(DEBUG_LEVELS.VERBOSE, `Received action_call_trump from ${socket.id}: ${suit}`);
            const playerRole = getRoleBySocketId(socket.id);
            if (playerRole) handleCallTrumpDecision(playerRole, suit);
        } catch (error) {
            log(DEBUG_LEVELS.WARNING, `Error in action_call_trump: ${error.message}`);
        }
    });

    socket.on('action_go_alone', ({ decision }) => {
        try {
            log(DEBUG_LEVELS.VERBOSE, `Received action_go_alone from ${socket.id}: ${decision}`);
            const playerRole = getRoleBySocketId(socket.id);
            if (playerRole) handleGoAloneDecision(playerRole, decision);
        } catch (error) {
            log(DEBUG_LEVELS.WARNING, `Error in action_go_alone: ${error.message}`);
        }
    });

    socket.on('action_play_card', ({ card }) => {
        try {
            log(DEBUG_LEVELS.VERBOSE, `Received action_play_card from ${socket.id}: ${JSON.stringify(card)}`);
            const playerRole = getRoleBySocketId(socket.id);
            if (playerRole) handlePlayCard(playerRole, card);
        } catch (error) {
            log(DEBUG_LEVELS.WARNING, `Error in action_play_card: ${error.message}`);
        }
    });

    socket.on('request_new_game_session', () => {
        if (gameState.gamePhase === 'GAME_OVER' || gameState.gamePhase === 'LOBBY') {
            addGameMessage("New game session requested.", true);
            log(DEBUG_LEVELS.INFO, "New game session requested");
            const currentPlayersData = {};
            gameState.playerSlots.forEach(role => {
                if (gameState.players[role] && gameState.players[role].id) {
                    currentPlayersData[gameState.players[role].id] = { role: role, name: gameState.players[role].name };
                }
            });

            resetFullGame();

            let reAssignedCount = 0;
            const assignedSocketIds = new Set();

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

            gameState.playerSlots.forEach(role => {
                if (!gameState.players[role].id) {
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
            log(DEBUG_LEVELS.INFO, `Game reset. ${reAssignedCount} players assigned`);
            broadcastGameState();
        } else {
            socket.emit('action_error', "Cannot start a new game session while a game is in progress.");
            log(DEBUG_LEVELS.WARNING, `Attempt to start new game session while game is in progress. Current phase: ${gameState.gamePhase}`);
        }
    });

    socket.on('disconnect', () => {
        log(DEBUG_LEVELS.WARNING, `User disconnected: ${socket.id}`);
        const role = getRoleBySocketId(socket.id);
        if (role && gameState.players[role]) {
            addGameMessage(`${gameState.players[role].name} (${role}) left.`);
            log(DEBUG_LEVELS.INFO, `${gameState.players[role].name} (${role}) disconnected`);
            gameState.players[role].id = null;
            gameState.connectedPlayerCount--;

            if (gameState.gamePhase !== 'LOBBY' && gameState.gamePhase !== 'GAME_OVER') {
                addGameMessage("Player disconnected during game.", true);
                log(DEBUG_LEVELS.WARNING, `Player ${role} disconnected during game. Resetting to LOBBY`);
                if (gameState.connectedPlayerCount < 4) {
                    const currentT1 = gameState.team1Score;
                    const currentT2 = gameState.team2Score;
                    const initialDealer = gameState.initialDealerForSession;
                    const currentPlayersData = {};
                    gameState.playerSlots.forEach(r => {
                        if (gameState.players[r] && gameState.players[r].id && gameState.players[r].id !== socket.id) {
                            currentPlayersData[gameState.players[r].id] = { role: r, name: gameState.players[r].name };
                        }
                    });

                    resetFullGame();
                    gameState.team1Score = currentT1;
                    gameState.team2Score = currentT2;
                    gameState.initialDealerForSession = initialDealer;

                    let reAssignedCount = 0;
                    const assignedSocketIds = new Set();
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
                    log(DEBUG_LEVELS.INFO, "Game reset to LOBBY due to player leaving");
                }
            }
            broadcastGameState();
        }
    });
});

app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory

// Only start the server if run directly, not when required for tests
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        log(DEBUG_LEVELS.INFO, `Euchre server listening on port ${PORT}`);
        log(DEBUG_LEVELS.INFO, `Access game at http://localhost:${PORT} or http://<your-local-ip>:${PORT}`);
        addGameMessage("Server started. Waiting for players.", true);
        broadcastGameState();
    });
}

module.exports = {
    /**
    * Module exports for Euchre server core functions and state.
    * These exports are used for game logic and testing purposes.
    */    
    gameState, // The main game state object, representing the current game session.
    DEBUG_LEVELS, // Logging levels for debugging purposes.
    getNextPlayer, // Function to determine the next player's turn.
    getPartner, // Function to get the partner of a given player.
    cardToString, // Converts a card object to its string representation.
    sortHand, // Sorts a player's hand, considering the trump suit.
    getSuitColor, // Returns the color of the suit ('red' or 'black').
    isRightBower, // Checks if a card is the Right Bower in the current trump suit.
    isLeftBower, // Checks if a card is the Left Bower in the current trump suit.
    getCardRank, // Determines the rank of a card based on Euchre rules.
    resetFullGame, // Resets the game state to its initial configuration.
    startNewHand // Prepares the game state for starting a new hand.
};

function getSuitColor(suit) {
    /**
     * Returns the color of the given suit, either 'red' or 'black'. If the
     * suit is unknown, returns 'black'.
     *
     * @param {string} suit - the suit to get the color for
     * @returns {string} the color of the suit, either 'red' or 'black'
     */
    if (suit === 'hearts' || suit === 'diamonds') return 'red';
    if (suit === 'spades' || suit === 'clubs') return 'black';
    return 'black';
}
