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

let gameState = {}; // Will be initialized by resetFullGame

function resetFullGame() {
    gameState = {
        gameId: Date.now(), // Simple ID for the game session
        playerSlots: ['south', 'west', 'north', 'east'],
        players: { // Populated on connection
            // south: { id: null, name: "South", hand: [], team: 1, tricksTakenThisHand: 0 },
            // west:  { id: null, name: "West",  hand: [], team: 2, tricksTakenThisHand: 0 },
            // north: { id: null, name: "North", hand: [], team: 1, tricksTakenThisHand: 0 },
            // east:  { id: null, name: "East",  hand: [], team: 2, tricksTakenThisHand: 0 }
        },
        connectedPlayerCount: 0,
        gamePhase: 'LOBBY', // LOBBY, DEALING, ORDER_UP_ROUND1, AWAITING_DEALER_DISCARD, AWAITING_GO_ALONE, ORDER_UP_ROUND2, PLAYING_TRICKS, HAND_OVER, GAME_OVER
        deck: [],
        kitty: [],
        upCard: null,
        trump: null,
        dealer: 'south', // Initial dealer, will rotate
        initialDealerForSession: null, // To track rotation properly across games
        currentPlayer: null, // Whose turn is it to act (bid or play)
        orderUpRound: 1,
        maker: null, // Team that called trump (1 or 2)
        playerWhoCalledTrump: null, // The specific player role ('south', etc.)
        dealerHasDiscarded: false,
        goingAlone: false,
        playerGoingAlone: null, // Role of player going alone
        partnerSittingOut: null, // Role of partner sitting out
        tricks: [], // Array of { cardsPlayed: [{player, card}], winner } for the current hand
        currentTrickPlays: [], // Array of { player, card } for the current trick being played
        trickLeader: null, // Player who led the current trick
        team1Score: 0,
        team2Score: 0,
        gameMessages: [],
        winningTeam: null,
    };
    // Initialize player structures
    gameState.playerSlots.forEach((role, index) => {
        gameState.players[role] = {
            id: null,
            name: role.charAt(0).toUpperCase() + role.slice(1),
            hand: [],
            team: (role === 'south' || role === 'north') ? 1 : 2,
            tricksTakenThisHand: 0
        };
    });
}

resetFullGame(); // Initialize on server start

// --- UTILITY FUNCTIONS ---
function addGameMessage(message, important = false) {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[GAME MSG] ${message}`);
    gameState.gameMessages.unshift({ text: message, timestamp, important }); // Add to beginning
    if (gameState.gameMessages.length > 15) {
        gameState.gameMessages.pop(); // Keep it to a reasonable size
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
        if (playerRole) {
            // Tailor state for each player
            const personalizedState = JSON.parse(JSON.stringify(gameState)); // Deep copy
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
        } else {
            // Could be a spectator or someone not fully joined
            // For simplicity, only send to assigned players.
        }
    });
     if (gameState.gamePhase !== 'LOBBY') {
        io.emit('lobby_update', { // Send simpler lobby update if game not started
            players: gameState.playerSlots.map(role => ({
                role,
                name: gameState.players[role]?.name || 'Empty',
                connected: !!gameState.players[role]?.id
            })),
            canStart: gameState.connectedPlayerCount === 4 && gameState.gamePhase === 'LOBBY',
            gameId: gameState.gameId
        });
    }
}


// --- CORE EUCHRE LOGIC ---
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
    // Skip partner if someone is going alone
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

function getCardRank(card, ledSuit, trumpSuit) { // ledSuit can be null if not relevant
    if (isRightBower(card, trumpSuit)) return 100;
    if (isLeftBower(card, trumpSuit)) return 90;

    if (card.suit === trumpSuit) {
        const trumpValues = { '9': 1, '10': 2, 'Q': 3, 'K': 4, 'A': 5 }; // J is bower
        return 80 + trumpValues[card.value];
    }
    if (ledSuit) { // Only consider led suit rank if it's relevant for the comparison
      let effectiveLedSuit = ledSuit;
      // If the led card was a left bower, its suit is effectively trump for following purposes
      // This check is usually done before calling getCardRank on followers by setting ledSuit to trumpSuit
      if (card.suit === effectiveLedSuit) {
          const normalValues = { '9': 1, '10': 2, 'J': 3, 'Q': 4, 'K': 5, 'A': 6 };
          return normalValues[card.value];
      }
    }
    return -1; // Off-suit, non-trump, or ledSuit not relevant
}


// --- GAME STATE TRANSITIONS & ACTIONS ---

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

    // Rotate dealer
    if (gameState.initialDealerForSession === null) { // First hand of the game session
        // gameState.dealer is already set (e.g. 'south' or random)
        gameState.initialDealerForSession = gameState.dealer;
    } else {
        gameState.dealer = getNextPlayer(gameState.dealer); // Rotate from previous hand's dealer
    }
    addGameMessage(`${gameState.players[gameState.dealer].name} (${gameState.dealer}) is the dealer.`);

    // Deal cards
    let cardIdx = 0;
    const dealOrder = [getNextPlayer(gameState.dealer), getNextPlayer(getNextPlayer(gameState.dealer)), getNextPlayer(getNextPlayer(getNextPlayer(gameState.dealer))), gameState.dealer];

    for (let i = 0; i < 5; i++) { // 5 cards each
        for (const role of dealOrder) {
            gameState.players[role].hand.push(gameState.deck[cardIdx++]);
        }
    }
    gameState.playerSlots.forEach(role => sortHand(gameState.players[role].hand));

    gameState.upCard = gameState.deck[cardIdx++];
    gameState.kitty = gameState.deck.slice(cardIdx); // Remaining 3 cards for kitty

    addGameMessage(`Cards dealt. Up-card is ${cardToString(gameState.upCard)}.`);

    gameState.currentPlayer = getNextPlayer(gameState.dealer);
    gameState.gamePhase = 'ORDER_UP_ROUND1';
    addGameMessage(`${gameState.players[gameState.currentPlayer].name}'s turn to order up or pass.`);
    broadcastGameState();
}

function handleOrderUpDecision(playerRole, orderedUp) {
    if (gameState.gamePhase !== 'ORDER_UP_ROUND1' || playerRole !== gameState.currentPlayer) {
        return; // Not their turn or wrong phase
    }

    addGameMessage(`${gameState.players[playerRole].name} ${orderedUp ? 'ordered up' : 'passed'}.`);

    if (orderedUp) {
        gameState.trump = gameState.upCard.suit;
        gameState.maker = gameState.players[playerRole].team;
        gameState.playerWhoCalledTrump = playerRole;
        addGameMessage(`Trump is ${gameState.trump}! Called by Team ${gameState.maker} (${gameState.players[playerRole].name}).`, true);

        // Dealer must take the upCard
        gameState.players[gameState.dealer].hand.push(gameState.upCard);
        sortHand(gameState.players[gameState.dealer].hand);
        gameState.upCard = null; // upCard is now in dealer's hand

        gameState.dealerHasDiscarded = false;
        gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
        gameState.currentPlayer = gameState.dealer; // Dealer's turn to discard
        addGameMessage(`${gameState.players[gameState.dealer].name} (dealer) must discard a card.`);
    } else { // Passed
        gameState.currentPlayer = getNextPlayer(playerRole);
        // Check if round 1 is over (everyone passed, back to player left of dealer)
        if (playerRole === gameState.dealer) { // Dealer was last to pass in round 1
            addGameMessage(`Up-card ${cardToString(gameState.kitty[0])} (was ${gameState.trump}) turned down. Round 2 of bidding.`);
            // Note: kitty[0] was the upCard. It's conceptually turned down.
            gameState.orderUpRound = 2;
            gameState.currentPlayer = getNextPlayer(gameState.dealer); // Player left of dealer starts round 2
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
    gameState.kitty.push(discarded); // Add to general kitty pile
    sortHand(hand);
    addGameMessage(`${gameState.players[dealerRole].name} discarded ${cardToString(discarded)}.`);
    gameState.dealerHasDiscarded = true;

    // Now, the player who called trump (or their team) decides to go alone
    gameState.gamePhase = 'AWAITING_GO_ALONE';
    gameState.currentPlayer = gameState.playerWhoCalledTrump; // Player who made trump decides first
    addGameMessage(`${gameState.players[gameState.playerWhoCalledTrump].name}, do you want to go alone?`);
    broadcastGameState();
}

function handleCallTrumpDecision(playerRole, suitToCall) {
    if (gameState.gamePhase !== 'ORDER_UP_ROUND2' || playerRole !== gameState.currentPlayer) {
        return;
    }

    if (suitToCall) {
        if (suitToCall === gameState.kitty[0].suit) { // Cannot call the suit of the turned-down card
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
    } else { // Passed in round 2
        addGameMessage(`${gameState.players[playerRole].name} passed.`);
        gameState.currentPlayer = getNextPlayer(playerRole);
        if (playerRole === gameState.dealer) { // Everyone passed in round 2 ("stick the dealer" not implemented, redeal)
            addGameMessage("All players passed in the second round. Redealing.", true);
            startNewHand(); // This will reset phases and dealer
        } else {
             addGameMessage(`${gameState.players[gameState.currentPlayer].name}'s turn to call trump or pass.`);
        }
    }
    broadcastGameState();
}

function handleGoAloneDecision(playerRole, decision) {
    if (gameState.gamePhase !== 'AWAITING_GO_ALONE' || playerRole !== gameState.currentPlayer) {
        return; // TODO: Could also allow partner of caller to decide if caller passes on going alone
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

    // Start playing tricks
    gameState.gamePhase = 'PLAYING_TRICKS';
    gameState.trickLeader = getNextPlayer(gameState.dealer); // Player left of dealer leads first trick
    gameState.currentPlayer = gameState.trickLeader;
    // Skip leader if they are the partner sitting out (shouldn't happen if logic is right, dealer's partner could be sitting out)
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
    if (!cardInHand) return false; // Card not in hand

    if (gameState.currentTrickPlays.length === 0) return true; // Can lead any card

    const ledPlay = gameState.currentTrickPlays[0];
    let ledSuitEffective = ledPlay.card.suit;
    if (isLeftBower(ledPlay.card, gameState.trump)) {
        ledSuitEffective = gameState.trump;
    }

    const playerHasLedSuit = hand.some(c => {
        if (isLeftBower(c, gameState.trump)) return ledSuitEffective === gameState.trump;
        return c.suit === ledSuitEffective;
    });

    if (playerHasLedSuit) { // Must follow suit if possible
        if (isLeftBower(cardInHand, gameState.trump)) return ledSuitEffective === gameState.trump;
        return cardInHand.suit === ledSuitEffective;
    }
    return true; // Can play anything if void in led suit
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
        // Determine trick winner
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

            // Logic: is cardBeingCompared better than winningCardInTrick?
            // 1. current is trump, winner is not: current wins
            // 2. both trump: higher rank wins
            // 3. neither trump: current is led suit, winner is not: current wins
            // 4. both led suit (neither trump): higher rank wins
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
            } else if (!currentIsTrump && !winningIsTrump) { // Neither is trump
                const winningIsLed = winningCardInTrick.suit === ledSuitForTrick; // (Left bower case for ledSuitForTrick already handled)
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
        // End of trick winner determination

        gameState.players[trickWinnerRole].tricksTakenThisHand++;
        gameState.tricks.push({ cardsPlayed: [...gameState.currentTrickPlays], winner: trickWinnerRole });
        addGameMessage(`${gameState.players[trickWinnerRole].name} wins the trick with ${cardToString(winningCardInTrick)}. (Tricks: ${gameState.players[trickWinnerRole].tricksTakenThisHand})`);
        gameState.currentTrickPlays = [];

        if (gameState.players.south.hand.length === 0) { // Hand is over (check any player, South is fine)
            scoreCurrentHand(); // This will update scores and may change gamePhase to GAME_OVER or start new hand
        } else {
            // Start next trick
            gameState.trickLeader = trickWinnerRole;
            gameState.currentPlayer = trickWinnerRole;
            addGameMessage(`${gameState.players[gameState.currentPlayer].name} leads next trick.`);
        }

    } else { // Trick not over
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

    if (gameState.maker === 1) { // Team 1 called trump
        if (team1Tricks === 5) pointsAwarded = gameState.goingAlone ? 4 : 2;
        else if (team1Tricks >= 3) pointsAwarded = 1; // Standard is 1 pt even if alone for 3-4
        else { // Euchred
            pointsAwarded = 2;
            scoringTeamNum = 2; // Opponent scores
            addGameMessage(`Team 1 was EUCHRED!`, true);
        }
        if (scoringTeamNum === 0) scoringTeamNum = 1; // If not euchred, makers score
    } else { // Team 2 called trump
        if (team2Tricks === 5) pointsAwarded = gameState.goingAlone ? 4 : 2;
        else if (team2Tricks >= 3) pointsAwarded = 1;
        else { // Euchred
            pointsAwarded = 2;
            scoringTeamNum = 1; // Opponent scores
            addGameMessage(`Team 2 was EUCHRED!`, true);
        }
        if (scoringTeamNum === 0) scoringTeamNum = 2;
    }

    if (pointsAwarded > 0) {
        if (scoringTeamNum === 1) gameState.team1Score += pointsAwarded;
        else gameState.team2Score += pointsAwarded;
        addGameMessage(`Team ${scoringTeamNum} scores ${pointsAwarded} point(s). Total: T1 ${gameState.team1Score} - T2 ${gameState.team2Score}.`, true);
    }

    // Check for game over
    if (gameState.team1Score >= 10 || gameState.team2Score >= 10) {
        gameState.gamePhase = 'GAME_OVER';
        gameState.winningTeam = gameState.team1Score >= 10 ? 1 : 2;
        addGameMessage(`GAME OVER! Team ${gameState.winningTeam} wins! Final Score: Team 1: ${gameState.team1Score}, Team 2: ${gameState.team2Score}.`, true);
    } else {
        // Delay then start new hand
        addGameMessage("Preparing for next hand...", false);
        setTimeout(() => {
            startNewHand();
        }, 5000); // 5 second delay
    }
    // broadcastGameState() will be called by the calling function or if new hand starts
}


// --- SOCKET.IO ---
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);
    let assignedRole = null;

    if (gameState.gamePhase === 'GAME_OVER' && gameState.connectedPlayerCount === 0) {
        resetFullGame(); // Reset if game was over and no one is connected
    }

    // Assign player to an empty slot
    for (const role of gameState.playerSlots) {
        if (!gameState.players[role].id) {
            assignedRole = role;
            gameState.players[role].id = socket.id;
            // gameState.players[role].name = role; // Set a default name or allow user to set
            gameState.connectedPlayerCount++;
            socket.emit('assign_role', { role: assignedRole, name: gameState.players[role].name });
            addGameMessage(`${gameState.players[role].name} (${role}) joined.`);
            break;
        }
    }

    if (!assignedRole) {
        socket.emit('game_full', 'Sorry, the game is full or already in progress with 4 players.');
        socket.disconnect(true);
        return;
    }

    broadcastGameState(); // Update everyone

    socket.on('request_start_game', () => {
        if (getRoleBySocketId(socket.id) && gameState.connectedPlayerCount === 4 && gameState.gamePhase === 'LOBBY') {
            addGameMessage("Attempting to start game...", true);
            // Pick initial dealer (e.g., South or random)
            const dealers = ['south', 'west', 'north', 'east'];
            gameState.dealer = dealers[Math.floor(Math.random() * dealers.length)];
            gameState.initialDealerForSession = gameState.dealer;

            startNewHand(); // This will deal cards and change phase
        } else if (gameState.connectedPlayerCount < 4) {
            socket.emit('action_error', 'Need 4 players to start.');
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
        // Allow resetting if game is over or in lobby
        if (gameState.gamePhase === 'GAME_OVER' || gameState.gamePhase === 'LOBBY') {
            addGameMessage("New game session requested.", true);
            const currentPlayers = {};
            gameState.playerSlots.forEach(role => {
                if(gameState.players[role].id) {
                    currentPlayers[role] = {id: gameState.players[role].id, name: gameState.players[role].name};
                }
            });

            resetFullGame(); // Resets all game state including scores

            // Re-assign players who are still connected
            let reAssignedCount = 0;
            gameState.playerSlots.forEach(role => {
                if(currentPlayers[role]) {
                    gameState.players[role].id = currentPlayers[role].id;
                    gameState.players[role].name = currentPlayers[role].name; // Keep name
                    reAssignedCount++;
                     // Notify re-assigned player of their role in the new game context
                    io.to(currentPlayers[role].id).emit('assign_role', { role: role, name: gameState.players[role].name });
                }
            });
            gameState.connectedPlayerCount = reAssignedCount;
            gameState.gamePhase = 'LOBBY';
            addGameMessage(`Game reset. ${reAssignedCount} players remain. Waiting for more if needed.`);
            broadcastGameState();
        } else {
            socket.emit('action_error', "Cannot start a new game session while a game is in progress.");
        }
    });


    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const role = getRoleBySocketId(socket.id);
        if (role) {
            addGameMessage(`${gameState.players[role].name} (${role}) left.`);
            gameState.players[role].id = null;
            // gameState.players[role].name = role; // Reset name or keep?
            gameState.connectedPlayerCount--;

            // Handle disconnection during game (simplified: go to lobby)
            if (gameState.gamePhase !== 'LOBBY' && gameState.gamePhase !== 'GAME_OVER') {
                addGameMessage("Player disconnected during game. Resetting to lobby.", true);
                // More complex logic could be pause, AI takeover, etc.
                // For now, just reset the current hand/game progress but keep scores.
                const currentTeam1Score = gameState.team1Score;
                const currentTeam2Score = gameState.team2Score;
                const currentInitialDealer = gameState.initialDealerForSession;

                resetFullGame(); // This clears scores, so we restore them
                gameState.team1Score = currentTeam1Score;
                gameState.team2Score = currentTeam2Score;
                gameState.initialDealerForSession = currentInitialDealer; // Preserve who was next to deal

                // Re-assign players who are still connected
                let reAssignedCount = 0;
                const stillConnectedSockets = Object.keys(io.sockets.sockets);
                gameState.playerSlots.forEach(r => {
                    const pSocketId = gameState.players[r].id; // This would be from BEFORE reset, so need to find by socket.id
                     // This logic is a bit flawed since resetFullGame clears players.
                     // A better approach is to iterate currently connected sockets and re-seat them.
                });
                 // Simplified reset: just go to lobby, players will need to rejoin slots if they refresh
                gameState.gamePhase = 'LOBBY';

            }
            broadcastGameState();
        }
    });
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

/* REMOVE OR COMMENT THIS LINE:
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Euchre.html'));
});
*/

server.listen(PORT, () => {
    console.log(`Euchre server listening on port ${PORT}`);
    console.log(`Access game at http://localhost:${PORT} or http://<your-local-ip>:${PORT}`);
    addGameMessage("Server started. Waiting for players.", true);
    broadcastGameState(); // Initial broadcast for any listening clients
});