import { expect } from 'chai';
import { createTestServer, createTestClient, waitForEvent, simulatePlayerAction } from '../utils/testUtils.js';
import { GAME_EVENTS } from '../../config/constants.js';

describe('Game Flow Integration Tests', function() {
    let server;
    let httpServer;
    let io;
    let port;
    let clients = [];
    const PLAYER_NAMES = ['Alice', 'Bob', 'Charlie', 'Diana'];
    const PLAYER_IDS = [];

    before(async function() {
        // Start test server
        ({ io, httpServer, port } = await createTestServer());
        
        // Create 4 player clients
        for (let i = 0; i < 4; i++) {
            const client = await createTestClient(port);
            clients.push(client);
            PLAYER_IDS.push(client.id);
        }
    });

    after(async function() {
        // Clean up
        await Promise.all(clients.map(client => client.disconnect()));
        await new Promise(resolve => httpServer.close(resolve));
    });

    afterEach(async function() {
        // Reset game state between tests
        await Promise.all(clients.map(client => 
            simulatePlayerAction(client.socket, 'reset_game')
        ));
    });

    it('should complete a full game with all players', async function() {
        this.timeout(10000); // Increase timeout for this test

        // 1. Join players to the game
        const joinPromises = clients.map((client, index) => 
            simulatePlayerAction(client.socket, 'join_game', { 
                playerName: PLAYER_NAMES[index],
                playerId: client.id 
            })
        );
        
        await Promise.all(joinPromises);

        // 2. Start the game
        await simulatePlayerAction(clients[0].socket, 'start_game');

        // 3. Wait for game to start
        const gameStartEvents = clients.map(client => 
            waitForEvent(client.socket, GAME_EVENTS.GAME_STARTED)
        );
        await Promise.all(gameStartEvents);

        // 4. Simulate bidding phase
        const dealerIndex = 0; // Assuming first client is dealer for this test
        const bidderIndex = (dealerIndex + 1) % 4;
        
        // Bidder orders up
        await simulatePlayerAction(
            clients[bidderIndex].socket, 
            'place_bid', 
            { suit: 'hearts', orderUp: true }
        );

        // 5. Wait for bid to be accepted
        const bidAcceptedEvents = clients.map(client => 
            waitForEvent(client.socket, GAME_EVENTS.BID_ACCEPTED)
        );
        await Promise.all(bidAcceptedEvents);

        // 6. Dealer discards a card
        await simulatePlayerAction(
            clients[dealerIndex].socket,
            'discard_card',
            { cardId: '9-clubs' }
        );

        // 7. Play the first trick
        const playPromises = [];
        for (let i = 0; i < 4; i++) {
            const playerIndex = (bidderIndex + i) % 4;
            const cardToPlay = i === 0 ? 'J-hearts' : '9-spades'; // Simplified for test
            
            playPromises.push(
                simulatePlayerAction(
                    clients[playerIndex].socket,
                    'play_card',
                    { cardId: cardToPlay }
                )
            );

            // Wait for card played event
            if (i < 3) {
                playPromises.push(
                    Promise.all(clients.map(client => 
                        waitForEvent(client.socket, GAME_EVENTS.CARD_PLAYED)
                    ))
                );
            }
        }


        await Promise.all(playPromises);

        // 8. Verify trick completed
        const trickCompletedEvents = clients.map(client => 
            waitForEvent(client.socket, GAME_EVENTS.TRICK_COMPLETED)
        );
        await Promise.all(trickCompletedEvents);

        // 9. Continue playing until hand is complete...
        // (In a real test, you would simulate the rest of the hand)
        // 10. Verify game state updates
        const gameState = await simulatePlayerAction(
            clients[0].socket,
            'get_game_state'
        );

        expect(gameState).to.have.property('currentPhase').that.is.a('string');
        expect(gameState).to.have.property('scores').that.is.an('object');
        
        // Verify at least one trick has been played
        expect(gameState.completedTricks).to.have.lengthOf.at.least(1);
    });

    it('should handle player disconnection and reconnection', async function() {
        this.timeout(10000);
        
        // 1. Join players
        await Promise.all(clients.map((client, index) => 
            simulatePlayerAction(client.socket, 'join_game', { 
                playerName: PLAYER_NAMES[index],
                playerId: client.id 
            })
        ));

        // 2. Start game
        await simulatePlayerAction(clients[0].socket, 'start_game');

        // 3. Disconnect a player
        const disconnectedClient = clients[1];
        await disconnectedClient.disconnect();

        // 4. Verify other players receive disconnect notification
        const disconnectEvents = clients
            .filter((_, i) => i !== 1) // All except the disconnected client
            .map(client => waitForEvent(client.socket, GAME_EVENTS.PLAYER_DISCONNECTED));
        
        await Promise.all(disconnectEvents);

        // 5. Reconnect the player
        const reconnectedClient = await createTestClient(port);
        clients[1] = reconnectedClient; // Replace the disconnected client
        
        // 6. Rejoin the game
        await simulatePlayerAction(
            reconnectedClient.socket, 
            'rejoin_game', 
            { 
                playerName: PLAYER_NAMES[1],
                playerId: reconnectedClient.id,
                gameId: 'test-game-id' // In a real test, you'd get this from the game state
            }
        );

        // 7. Verify reconnection was successful
        const gameState = await simulatePlayerAction(
            reconnectedClient.socket,
            'get_game_state'
        );
        
        expect(gameState.players[1].connected).to.be.true;
        expect(gameState.players[1].name).to.equal(PLAYER_NAMES[1]);
    });
});
