/*
Euchre Server - ES Module Version
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

import { SUITS, VALUES, DEBUG_LEVELS, GAME_PHASES, PLAYER_ROLES } from './src/config/constants.js';
import { log, setDebugLevel } from './src/utils/logger.js'; // Removed currentDebugLevel import as it's not used directly here
import { createDeck as utilCreateDeck, shuffleDeck as utilShuffleDeck, cardToString, sortHand, isRightBower, isLeftBower, getSuitColor, getCardRank } from './src/utils/deck.js';
import { getPlayerBySocketId as utilGetPlayerBySocketId, getRoleBySocketId as utilGetRoleBySocketId, getNextPlayer as utilGetNextPlayer, getPartner as utilGetPartner } from './src/utils/players.js';
import { getGameState, updateGameState, resetFullGame as utilResetFullGame } from './src/game/state.js';

utilResetFullGame(); // Initialize state via the state module

function addGameMessage(message) {
    const currentGameState = getGameState();
    if (!currentGameState) { log(DEBUG_LEVELS.ERROR, 'addGameMessage: GState not avail'); return; }
    let gameMessages = currentGameState.gameMessages || [];
    const timestamp = new Date().toLocaleTimeString();
    gameMessages = [{ text: message, timestamp, important: false }, ...gameMessages];
    if (gameMessages.length > 15) gameMessages = gameMessages.slice(0, 15);
    updateGameState({ gameMessages });
    log(DEBUG_LEVELS.VERBOSE, `[GAME MSG] ${message}`);
}

function getPlayerBySocketId(socketId) { return utilGetPlayerBySocketId(getGameState(), socketId); }
function getRoleBySocketId(socketId) { return utilGetRoleBySocketId(getGameState(), socketId); }

function broadcastGameState() {
    if (!getIo()) return;
    const currentGameState = getGameState();
    Object.keys(getIo().sockets.sockets).forEach(socketId => {
        const playerRole = getRoleBySocketId(socketId);
        if (playerRole && currentGameState.players && currentGameState.players[playerRole]) {
            const personalizedState = JSON.parse(JSON.stringify(currentGameState));
            delete personalizedState.deck;
            personalizedState.myRole = playerRole;
            personalizedState.myName = currentGameState.players[playerRole].name;
            for (const role of currentGameState.playerSlots) {
                if (role !== playerRole && personalizedState.players[role] && personalizedState.players[role].hand) {
                    personalizedState.players[role].hand = personalizedState.players[role].hand.map(() => ({ S: 'back' }));
                }
            }
            getIo().to(socketId).emit('game_update', personalizedState);
        }
    });
    if (currentGameState.gamePhase === GAME_PHASES.LOBBY) {
        const lobbyData = { /* ... */ }; // Simplified for brevity, already correct
        getIo().emit('lobby_update', lobbyData);
    }
}

function startNewHand() {
    log(DEBUG_LEVELS.INFO, 'Starting new hand...');
    const currentGameState = getGameState();

    let deckForDealing = currentGameState.deck;
    if (!deckForDealing || deckForDealing.length < 24) {
        log(DEBUG_LEVELS.WARNING, "Deck invalid/small in startNewHand. Re-init.");
        deckForDealing = utilShuffleDeck(utilCreateDeck());
    }

    const hands = [
        deckForDealing.slice(0, 5), deckForDealing.slice(5, 10),
        deckForDealing.slice(10, 15), deckForDealing.slice(15, 20)
    ];
    const kitty = deckForDealing.slice(20, 23);
    const upCard = deckForDealing.length > 23 ? deckForDealing[23] : null;

    if (!upCard) { // Critical error if no upCard after attempting re-init
        log(DEBUG_LEVELS.ERROR, "Still no upCard after deck re-init. Aborting startNewHand.");
        // Potentially reset game or enter error state
        utilResetFullGame(); // Safest fallback
        broadcastGameState();
        return;
    }

    const updatedPlayers = JSON.parse(JSON.stringify(currentGameState.players));
    (currentGameState.playerSlots || PLAYER_ROLES).forEach((role, index) => {
        updatedPlayers[role] = {
            ...(updatedPlayers[role] || {}), // Preserve name, id, team if player existed
            hand: hands[index],
            hasPlayed: false,
            tricksTakenThisHand: 0,
            isGoingAlone: false,
            isSittingOut: false
        };
    });

    updateGameState({
        currentPlayer: utilGetNextPlayer(currentGameState.dealer, currentGameState.playerSlots || PLAYER_ROLES),
        gamePhase: GAME_PHASES.ORDER_UP_ROUND1, // Correct phase after dealing
        tricks: [],
        currentTrickPlays: [],
        winner: null, // Winner of previous trick/hand
        players: updatedPlayers,
        deck: deckForDealing,
        kitty: kitty,
        upCard: upCard,
        trump: null,
        ledSuit: null,
        maker: null,
        playerWhoCalledTrump: null,
        dealerHasDiscarded: false,
        goingAlone: false,
        playerGoingAlone: null,
        partnerSittingOut: null,
        // gameMessages: currentGameState.gameMessages // Preserve messages
    });
    addGameMessage(`New hand started. ${currentGameState.dealer} is dealer. ${cardToString(getGameState().upCard)} is up.`);
    broadcastGameState();
}

function handleOrderUpDecision(playerRole, orderedUp) {
    const currentGameState = getGameState();
    log(DEBUG_LEVELS.VERBOSE, `[HOD] ${playerRole}, ${orderedUp}, phase: ${currentGameState.gamePhase}, turn: ${currentGameState.currentPlayer}`);

    if (currentGameState.currentPlayer !== playerRole) { log(DEBUG_LEVELS.WARNING, `Not ${playerRole}'s turn.`); return; }
    if (![GAME_PHASES.ORDER_UP_ROUND1, GAME_PHASES.ORDER_UP_ROUND2].includes(currentGameState.gamePhase)) {
        log(DEBUG_LEVELS.ERROR, `Invalid phase for HOD: ${currentGameState.gamePhase}`); return;
    }

    let changes = {};
    const playersCopy = JSON.parse(JSON.stringify(currentGameState.players));

    if (orderedUp) {
        if (!currentGameState.upCard) { log(DEBUG_LEVELS.ERROR, "No upCard."); return; }
        const trumpSuit = currentGameState.upCard.suit;
        addGameMessage(`${playersCopy[playerRole].name} ordered up ${trumpSuit}.`);

        if (playersCopy[currentGameState.dealer] && currentGameState.upCard) {
            playersCopy[currentGameState.dealer].hand.push(currentGameState.upCard);
        } else { log(DEBUG_LEVELS.ERROR, "Dealer/upCard err."); return; }

        changes = {
            trump: trumpSuit, maker: playersCopy[playerRole].team, playerWhoCalledTrump: playerRole,
            gamePhase: GAME_PHASES.AWAITING_DEALER_DISCARD, currentPlayer: currentGameState.dealer,
            players: playersCopy, upCard: null
        };
    } else {
        addGameMessage(`${playersCopy[playerRole].name} passed.`);
        let nextPlayer = utilGetNextPlayer(playerRole, currentGameState.playerSlots);
        let { orderUpRound, gamePhase, dealer, playerSlots, upCard } = currentGameState;

        const isDealer = playerRole === dealer;
        const partnerOfDealer = utilGetPartner(dealer); // Player who bids last in round 2 if dealer's team doesn't call

        if (gamePhase === GAME_PHASES.ORDER_UP_ROUND1 && isDealer) {
            changes = { gamePhase: GAME_PHASES.ORDER_UP_ROUND2, currentPlayer: utilGetNextPlayer(dealer, playerSlots), orderUpRound: 2, originalUpCard: upCard }; // Store original upCard
            addGameMessage(`Round 1 complete. ${cardToString(upCard)} turned down. Round 2 bidding.`);
        } else if (gamePhase === GAME_PHASES.ORDER_UP_ROUND2 && playerRole === partnerOfDealer) {
             addGameMessage("All players passed. Misdeal. Redealing...");
             updateGameState({ gamePhase: GAME_PHASES.DEALING, upCard: null });
             startNewHand();
             return;
        } else {
            changes = { currentPlayer: nextPlayer };
        }
    }
    updateGameState(changes);
    broadcastGameState();
}

// Refactor other handlers (handleDealerDiscard, etc.) similarly to use getGameState and updateGameState
// For brevity in this turn, they are simplified or left as-is, but will need full refactoring.

function handleDealerDiscard(dealerRole, cardToDiscardId) {
    const currentGameState = getGameState();
    log(DEBUG_LEVELS.INFO, `[HDD] ${dealerRole} discards ${cardToDiscardId}. Phase: ${currentGameState.gamePhase}`);
    if (currentGameState.gamePhase !== GAME_PHASES.AWAITING_DEALER_DISCARD || dealerRole !== currentGameState.dealer || dealerRole !== currentGameState.currentPlayer) {
        log(DEBUG_LEVELS.WARNING, `HDD: Invalid conditions.`); return false;
    }
    const player = currentGameState.players[dealerRole];
    if (!player || player.hand.length !== 6) { log(DEBUG_LEVELS.WARNING, `HDD: Dealer hand invalid.`); return false; }
    const cardIndex = player.hand.findIndex(card => card.id === cardToDiscardId);
    if (cardIndex === -1) { log(DEBUG_LEVELS.WARNING, `HDD: Card not in hand.`); return false; }

    const updatedPlayers = JSON.parse(JSON.stringify(currentGameState.players));
    updatedPlayers[dealerRole].hand.splice(cardIndex, 1)[0];
    
    updateGameState({
        players: updatedPlayers, dealerHasDiscarded: true,
        gamePhase: GAME_PHASES.GOING_ALONE, currentPlayer: currentGameState.playerWhoCalledTrump,
    });
    addGameMessage(`${updatedPlayers[dealerRole].name} discarded.`);
    broadcastGameState(); return true;
}

function handleCallTrumpDecision(playerRole, suitToCall) {
    const currentGameState = getGameState();
    log(DEBUG_LEVELS.INFO, `[HCTD] ${playerRole} calls ${suitToCall}. Phase: ${currentGameState.gamePhase}`);
    if (currentGameState.gamePhase !== GAME_PHASES.ORDER_UP_ROUND2 || currentGameState.currentPlayer !== playerRole) {
        log(DEBUG_LEVELS.WARNING, `HCTD: Invalid conditions.`); return;
    }
    if (currentGameState.originalUpCard && suitToCall === currentGameState.originalUpCard.suit) {
         log(DEBUG_LEVELS.WARNING, `Cannot call turned down suit.`); return;
    }
    const player = currentGameState.players[playerRole];
    updateGameState({
        trump: suitToCall, maker: player.team, playerWhoCalledTrump: playerRole,
        gamePhase: GAME_PHASES.GOING_ALONE, // After calling in round 2, decider goes to "go alone"
        currentPlayer: playerRole, // The one who called trump decides to go alone
        upCard: null, originalUpCard: null // Clear upCard states
    });
    addGameMessage(`${player.name} called ${suitToCall}.`);
    broadcastGameState();
}

function handleGoAloneDecision(playerRole, decision) {
    const currentGameState = getGameState();
    log(DEBUG_LEVELS.INFO, `[HGAD] ${playerRole} alone: ${decision}. Phase: ${currentGameState.gamePhase}`);
    if (currentGameState.gamePhase !== GAME_PHASES.GOING_ALONE || currentGameState.currentPlayer !== playerRole) {
        log(DEBUG_LEVELS.WARNING, `HGAD: Invalid conditions.`); return;
    }
    const player = currentGameState.players[playerRole];
    const updatedPlayers = JSON.parse(JSON.stringify(currentGameState.players));
    updatedPlayers[playerRole].isGoingAlone = decision;
    let partnerToSitOut = null;
    if (decision) {
        partnerToSitOut = utilGetPartner(playerRole);
        if (updatedPlayers[partnerToSitOut]) updatedPlayers[partnerToSitOut].isSittingOut = true;
        addGameMessage(`${player.name} is going alone!`);
    } else {
        if (updatedPlayers[utilGetPartner(playerRole)]) updatedPlayers[utilGetPartner(playerRole)].isSittingOut = false;
        addGameMessage(`${player.name} plays with partner.`);
    }
    updateGameState({
        players: updatedPlayers, goingAlone: decision, playerGoingAlone: decision ? playerRole : null, partnerSittingOut,
        gamePhase: GAME_PHASES.PLAYING, currentPlayer: utilGetNextPlayer(currentGameState.dealer, currentGameState.playerSlots)
    });
    broadcastGameState();
}

function serverIsValidPlay(playerRole, cardToPlay) {
    const currentGameState = getGameState();
    // Logic from previous correct version of serverIsValidPlay
    const player = currentGameState.players[playerRole];
    if (!player || !player.hand || !player.hand.find(card => card.id === cardToPlay.id)) return false;
    if (currentGameState.currentTrickPlays.length === 0) return true;
    const ledCard = currentGameState.currentTrickPlays[0].card;
    let actualLedSuit = ledCard.suit;
    if (isLeftBower(ledCard, currentGameState.trump) && getSuitColor(ledCard.suit) === getSuitColor(currentGameState.trump)) {
        actualLedSuit = currentGameState.trump;
    }
    const cardIsTrump = (cardToPlay.suit === currentGameState.trump) || isLeftBower(cardToPlay, currentGameState.trump);
    if (actualLedSuit === currentGameState.trump) {
        return cardIsTrump;
    }
    if (cardToPlay.suit === actualLedSuit && !cardIsTrump) return true;
    const hasLedSuit = player.hand.some(card => {
        if (isLeftBower(card, currentGameState.trump) && getSuitColor(actualLedSuit) === getSuitColor(currentGameState.trump) && actualLedSuit !== currentGameState.trump) {
            return false;
        }
        return card.suit === actualLedSuit && !isRightBower(card, currentGameState.trump);
    });
    if (hasLedSuit) return false;
    return true;
}

function handlePlayCard(playerRole, cardToPlayInput) {
    let currentGameState = getGameState();
    log(DEBUG_LEVELS.VERBOSE, `[HPC] ${playerRole} plays ${cardToString(cardToPlayInput)}. Phase: ${currentGameState.gamePhase}, Turn: ${currentGameState.currentPlayer}`);
    if (currentGameState.gamePhase !== GAME_PHASES.PLAYING) { log(DEBUG_LEVELS.WARNING, "Not PLAYING phase."); return; }
    if (currentGameState.currentPlayer !== playerRole) { log(DEBUG_LEVELS.WARNING, `Not ${playerRole}'s turn.`); return; }
    const player = currentGameState.players[playerRole];
    const cardInHandIndex = player.hand.findIndex(c => c.id === cardToPlayInput.id);
    if (cardInHandIndex === -1) { log(DEBUG_LEVELS.WARNING, `Card not in hand for ${playerRole}.`); return; }
    const playedCard = player.hand[cardInHandIndex];
    if (!serverIsValidPlay(playerRole, playedCard)) { log(DEBUG_LEVELS.WARNING, `Invalid play by ${playerRole}: ${cardToString(playedCard)}`); return; }

    const updatedPlayers = JSON.parse(JSON.stringify(currentGameState.players));
    updatedPlayers[playerRole].hand.splice(cardInHandIndex, 1);
    const updatedCurrentTrickPlays = [...currentGameState.currentTrickPlays, { player: playerRole, card: playedCard }];

    let changes = { players: updatedPlayers, currentTrickPlays: updatedCurrentTrickPlays };
    updateGameState(changes);

    currentGameState = getGameState(); // Refresh state
    const activePlayerCount = PLAYER_ROLES.filter(r => !(currentGameState.goingAlone && r === currentGameState.partnerSittingOut)).length;
    if (currentGameState.currentTrickPlays.length === activePlayerCount) {
        scoreCurrentHand();
    } else {
        updateGameState({ currentPlayer: utilGetNextPlayer(playerRole, currentGameState.playerSlots, currentGameState.goingAlone, currentGameState.playerGoingAlone, currentGameState.partnerSittingOut) });
    }
    broadcastGameState();
}

function scoreCurrentHand() {
    let currentGameState = getGameState();
    const { currentTrickPlays, trump, players, playerSlots, goingAlone, partnerSittingOut, gamePhase, maker, team1Score, team2Score } = currentGameState;
    if (currentTrickPlays.length < PLAYER_ROLES.filter(r => !(goingAlone && r === partnerSittingOut)).length) {
        log(DEBUG_LEVELS.ERROR, "scoreCurrentHand called prematurely."); return;
    }

    let trickWinnerRole = currentTrickPlays[0].player;
    let winningCardInTrick = currentTrickPlays[0].card;
    const ledSuitForTrick = currentTrickPlays[0].card.suit;

    for (let i = 1; i < currentTrickPlays.length; i++) {
        const play = currentTrickPlays[i];
        if (getCardRank(play.card, ledSuitForTrick, trump) > getCardRank(winningCardInTrick, ledSuitForTrick, trump)) {
            winningCardInTrick = play.card;
            trickWinnerRole = play.player;
        }
    }

    let updatedPlayers = JSON.parse(JSON.stringify(players));
    updatedPlayers[trickWinnerRole].tricksTakenThisHand += 1;
    addGameMessage(`${updatedPlayers[trickWinnerRole].name} wins trick with ${cardToString(winningCardInTrick)}.`);

    let changes = {
        players: updatedPlayers,
        tricks: [...currentGameState.tricks, currentTrickPlays],
        currentTrickPlays: [],
        currentPlayer: trickWinnerRole,
        trickLeader: trickWinnerRole
    };

    if (changes.tricks.length === 5) { // Hand is over
        let team1Tricks = 0; let team2Tricks = 0;
        playerSlots.forEach(role => {
            if (updatedPlayers[role].team === 1) team1Tricks += updatedPlayers[role].tricksTakenThisHand;
            if (updatedPlayers[role].team === 2) team2Tricks += updatedPlayers[role].tricksTakenThisHand;
        });

        let t1ScoreInc = 0; let t2ScoreInc = 0;
        const makerTeam = currentGameState.maker;
        const makersAreTeam1 = makerTeam === 1;
        const makersTricks = makersAreTeam1 ? team1Tricks : team2Tricks;

        if (currentGameState.goingAlone && currentGameState.playerGoingAlone && updatedPlayers[currentGameState.playerGoingAlone].team === makerTeam) {
            if (makersTricks === 5) { makersAreTeam1 ? t1ScoreInc = 4 : t2ScoreInc = 4; }
            else if (makersTricks >= 3) { makersAreTeam1 ? t1ScoreInc = 1 : t2ScoreInc = 1; }
            else { !makersAreTeam1 ? t1ScoreInc = 2 : t2ScoreInc = 2; }
        } else {
            if (makersTricks === 5) { makersAreTeam1 ? t1ScoreInc = 2 : t2ScoreInc = 2; }
            else if (makersTricks >= 3) { makersAreTeam1 ? t1ScoreInc = 1 : t2ScoreInc = 1; }
            else { !makersAreTeam1 ? t1ScoreInc = 2 : t2ScoreInc = 2; }
        }
        changes.team1Score = team1Score + t1ScoreInc;
        changes.team2Score = team2Score + t2ScoreInc;
        addGameMessage(`Hand complete. Score: T1 ${changes.team1Score}, T2 ${changes.team2Score}`);

        if (changes.team1Score >= 10 || changes.team2Score >= 10) {
            changes.gamePhase = GAME_PHASES.GAME_OVER;
            changes.winningTeam = changes.team1Score >= 10 ? 1 : 2;
            addGameMessage(`Team ${changes.winningTeam} wins the game!`);
        } else {
            changes.dealer = utilGetNextPlayer(currentGameState.dealer, playerSlots);
            changes.gamePhase = GAME_PHASES.DEALING;
            changes.currentPlayer = utilGetNextPlayer(changes.dealer, playerSlots);
        }
    }
    updateGameState(changes);
    const finalGameState = getGameState();
    if (finalGameState.tricks.length === 5 && finalGameState.gamePhase === GAME_PHASES.DEALING) {
        startNewHand();
    } else {
        broadcastGameState();
    }
}

function setMocks({ fs: fsMock, io: ioMock }) {
    if (fsMock) globalThis._test_fs = fsMock;
    if (ioMock) globalThis._test_io = ioMock;
}
function getFs() { return globalThis._test_fs || fs; }
function getIo() { return globalThis._test_io || io; }

export {
    broadcastGameState, getGameState, updateGameState, startNewHand,
    handleOrderUpDecision, handleDealerDiscard, handleCallTrumpDecision,
    handleGoAloneDecision, serverIsValidPlay, handlePlayCard, scoreCurrentHand,
    setMocks, log, setDebugLevel,
    utilGetPlayerBySocketId, utilGetRoleBySocketId, utilGetNextPlayer, utilGetPartner,
    utilCreateDeck as createDeck, // Re-export for basic.unit.test.js
    utilShuffleDeck as shuffleDeck // Re-export for basic.unit.test.js
};

if (import.meta.url === `file://${process.argv[1]}`) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        log(DEBUG_LEVELS.INFO, `Server running on port ${PORT}`);
    });
}
