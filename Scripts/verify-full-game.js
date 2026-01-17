import io from "socket.io-client";
import { expect } from "chai";
import { chooseBid, chooseCardToPlay } from "../src/game/logic/aiLogic.js";

const SERVER_URL = "http://localhost:3000";
const PLAYER_NAMES = ["Player South", "Player West", "Player North", "Player East"];
const PLAYER_ROLES = ["PLAYER_SOUTH", "PLAYER_WEST", "PLAYER_NORTH", "PLAYER_EAST"];

function createClient(name) {
  const socket = io(SERVER_URL, {
    reconnection: false,
    forceNew: true,
  });
  socket.on("connect", () => {
    console.log(`Client ${name} connected with id ${socket.id}`);
  });
  socket.on("disconnect", () => {
    console.log(`Client ${name} disconnected`);
  });
  socket.on("connect_error", (err) => {
    console.error(`Client ${name} connection error:`, err);
  });
  return { socket, name, role: null, playerId: null };
}

async function runTest() {
    const clients = PLAYER_NAMES.map(name => createClient(name));
    let gameId = null;
    let gameState = null;
    
    // 1. Connect and join game
    await new Promise(resolve => {
        let playersJoined = 0;
        clients.forEach((client, index) => {
            client.socket.on("connect", () => {
                client.socket.emit("joinGame", { name: client.name }, (response) => {
                    if(response.error) {
                        console.error(`Client ${client.name} failed to join:`, response.error);
                        process.exit(1);
                    }
                    if(!gameId) gameId = response.gameId;
                });
            });
            client.socket.on("ASSIGN_ROLE", (data) => {
                client.role = data.role;
                client.playerId = data.playerId;
                playersJoined++;
                if(playersJoined === 4) {
                    // One player starts the game
                    clients[0].socket.emit("request_start_game", {gameId: gameId}, (res) => {
                        if(res.status !== 'ok'){
                            console.error("Failed to start game:", res.message);
                            process.exit(1);
                        }
                    });
                }
            });
        });
        
        clients[0].socket.on("GAME_STATE_UPDATE", (state) => {
            gameState = state;
            if(gameState.gamePhase !== "LOBBY") {
                resolve();
            }
        });
    });

    console.log("Game started, proceeding with game play...");

    // 2. Game loop
    while(gameState && gameState.gamePhase !== 'GAME_OVER') {
        await new Promise(resolve => {
            const currentPlayerRole = gameState.currentPlayer;
            const client = clients.find(c => c.role === currentPlayerRole);

            if(!client) {
                console.log("Waiting for next turn...");
                setTimeout(resolve, 1000); // Wait and retry
                return;
            }
            
            const playerState = gameState.players[currentPlayerRole];

            if (gameState.gamePhase === 'ORDER_UP_ROUND1' || gameState.gamePhase === 'ORDER_UP_ROUND2') {
                const bid = chooseBid(playerState.hand, gameState.turnCard, gameState.dealer === currentPlayerRole, gameState.bids);
                const event = gameState.gamePhase === 'ORDER_UP_ROUND1' ? 'ACTION_ORDER_UP_DECISION' : 'ACTION_CALL_TRUMP_DECISION';
                client.socket.emit(event, { gameId, playerRole: currentPlayerRole, decision: bid.decision === 'pass' ? false : true, suit: bid.suit }, () => resolve());
            } else if (gameState.gamePhase === 'DEALER_DISCARD') {
                // Simple AI: discard first non-trump card
                const cardToDiscard = playerState.hand.find(c => c.suit !== gameState.trumpSuit) || playerState.hand[0];
                client.socket.emit('ACTION_DEALER_DISCARD', { gameId, playerRole: currentPlayerRole, cardId: cardToDiscard.id }, () => resolve());
            } else if (gameState.gamePhase === 'GOING_ALONE_DECISION') {
                client.socket.emit('ACTION_GO_ALONE_DECISION', { gameId, playerRole: currentPlayerRole, goingAlone: false }, () => resolve());
            } else if (gameState.gamePhase === 'PLAYING') {
                const cardToPlay = chooseCardToPlay(playerState.hand, gameState.currentTrick, gameState.trumpSuit, gameState.leadSuit);
                client.socket.emit('ACTION_PLAY_CARD', { gameId, playerRole: currentPlayerRole, card: cardToPlay }, () => resolve());
            } else {
                // Other phases, just wait for state update
                resolve();
            }
        });

        // Wait for the next state update
        await new Promise(resolve => {
            const client = clients[0]; // Any client can listen for the update
            client.socket.once("GAME_STATE_UPDATE", (newState) => {
                gameState = newState;
                console.log("New game state phase:", gameState.gamePhase);
                resolve();
            });
        });
    }

    console.log("Game over! Winner:", gameState.winningTeam);
    clients.forEach(c => c.socket.disconnect());
    process.exit(0);
}

runTest().catch(err => {
    console.error("Test failed with error:", err);
    process.exit(1);
});
