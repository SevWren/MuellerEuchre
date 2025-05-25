import { expect } from 'chai';

// Import the server module and other dependencies dynamically
let server3;
let handlePlayCard;
let serverIsValidPlay;

describe('Euchre Server Play Card Functions', function() {
    // Alias for easier access
    let gameState, resetFullGame, log;
    
    before(async function() {
        // Set a longer timeout for the before hook
        this.timeout(10000);
        
        try {
            // Import the server module
            const serverModule = await import('../server3.mjs');
            server3 = serverModule.default || serverModule;
            
            // Import the functions to test
            const playPhaseModule = await import('../src/game/phases/playPhase.js');
            const validationModule = await import('../src/game/logic/validation.js');
            
            handlePlayCard = playPhaseModule.handlePlayCard;
            serverIsValidPlay = validationModule.serverIsValidPlay;
            
            // Initialize local variables
            gameState = server3.gameState;
            resetFullGame = server3.resetFullGame;
            log = server3.log;
        } catch (error) {
            console.error('Error in before hook:', error);
            throw error;
        }
    });
    
    // Save original game state for cleanup
    let originalGameState;
    
    before(() => {
        // Save original game state
        originalGameState = JSON.parse(JSON.stringify(server3.gameState));
        // Set up test environment
        server3.resetFullGame();
    });
    
    after(() => {
        // Restore original game state after all tests
        Object.assign(server3.gameState, originalGameState);
    });
    
    beforeEach(() => {
        // Reset game state before each test
        server3.resetFullGame();
        
        // Set up test-specific state
        server3.gameState.players = {
            south: { 
                id: 'south-socket',
                name: 'South',
                hand: [
                    { id: 1, suit: 'hearts', value: 'A' },
                    { id: 2, suit: 'diamonds', value: 'K' }
                ]
            },
            north: {
                id: 'north-socket',
                name: 'North',
                hand: [
                    { id: 3, suit: 'clubs', value: 'Q' },
                    { id: 4, suit: 'spades', value: 'J' }
                ]
            },
            east: {
                id: 'east-socket',
                name: 'East',
                hand: [
                    { id: 5, suit: 'hearts', value: '10' },
                    { id: 6, suit: 'diamonds', value: '9' }
                ]
            },
            west: {
                id: 'west-socket',
                name: 'West',
                hand: [
                    { id: 7, suit: 'clubs', value: 'K' },
                    { id: 8, suit: 'spades', value: 'Q' }
                ]
            }
        };
        
        // Set up game state for playing phase
        server3.gameState.currentPhase = 'PLAYING';
        server3.gameState.currentPlayer = 'south';
        server3.gameState.trumpSuit = 'hearts';
        server3.gameState.currentTrick = [];
        server3.gameState.tricks = [];
        server3.gameState.playerOrder = ['south', 'west', 'north', 'east'];
        server3.gameState.dealer = 'north';
        server3.gameState.messages = [];
        server3.gameState.players = {
            south: { 
                id: 'south-socket',
                name: 'South',
                hand: [
                    { id: 1, suit: 'hearts', rank: 'A' },
                    { id: 2, suit: 'diamonds', rank: 'K' }
                ]
            },
            north: {
                id: 'north-socket',
                name: 'North',
                hand: [
                    { id: 3, suit: 'clubs', rank: 'Q' },
                    { id: 4, suit: 'spades', rank: 'J' }
                ]
            },
            east: {
                id: 'east-socket',
                name: 'East',
                hand: [
                    { id: 5, suit: 'hearts', rank: '10' },
                    { id: 6, suit: 'diamonds', rank: '9' }
                ]
            },
            west: {
                id: 'west-socket',
                name: 'West',
                hand: [
                    { id: 7, suit: 'clubs', rank: 'K' },
                    { id: 8, suit: 'spades', rank: 'Q' }
                ]
            }
        };
    });

    describe('serverIsValidPlay', function() {
        it('should validate card is in player hand', function() {
            const gameState = {...server3.gameState};
            const playerRole = 'south';
            const cardToValidate = { suit: 'hearts', rank: 'A' };
            
            // This should be valid since the card is in the player's hand
            const result = serverIsValidPlay(playerRole, cardToValidate, gameState);
            expect(result).to.be.true;
            
            // This should be invalid since the card is not in the player's hand
            const invalidCard = { suit: 'spades', rank: 'A' };
            const invalidResult = serverIsValidPlay(playerRole, invalidCard, gameState);
            expect(invalidResult).to.be.false;
        });

        it('should enforce following suit when able', function() {
            const gameState = JSON.parse(JSON.stringify(server3.gameState));
            const playerRole = 'west';
            
            // Set a non-trump suit for this test
            gameState.trumpSuit = 'spades';
            
            // Update west's hand to include hearts and clubs
            gameState.players.west.hand = [
                { suit: 'hearts', rank: 'K' },
                { suit: 'clubs', rank: 'K' }
            ];
            
            // Set up the trick with a leading heart
            gameState.currentTrick = [
                { player: 'south', card: { suit: 'hearts', value: 'A' } }
            ];
            gameState.currentPlayer = playerRole;
            
            // Player has a heart and tries to play it (valid)
            const validCard = { suit: 'hearts', rank: 'K' };
            const validResult = serverIsValidPlay(playerRole, validCard, gameState);
            expect(validResult).to.be.true;
            
            // Player tries to play a different suit while having the led suit (should be invalid)
            const invalidCard = { suit: 'clubs', rank: 'K' };
            const invalidResult = serverIsValidPlay(playerRole, invalidCard, gameState);
            expect(invalidResult).to.be.false;
        });
    });

    describe('handlePlayCard', function() {
        it('should update game state when card is played', function() {
            const gameState = { ...server3.gameState };
            const playerRole = 'south';
            const cardToPlay = { suit: 'hearts', rank: 'A' };
            
            const updatedState = handlePlayCard(gameState, playerRole, cardToPlay);
            
            // Verify the card was removed from the player's hand
            const playerHand = updatedState.players[playerRole].hand;
            expect(playerHand).to.have.lengthOf(1);
            expect(playerHand.some(card => card.suit === cardToPlay.suit && card.rank === cardToPlay.rank)).to.be.false;
            
            // Verify the card was added to the current trick
            expect(updatedState.currentTrick).to.have.lengthOf(1);
            expect(updatedState.currentTrick[0].player).to.equal(playerRole);
            expect(updatedState.currentTrick[0].card.suit).to.equal(cardToPlay.suit);
            expect(updatedState.currentTrick[0].card.rank).to.equal(cardToPlay.rank);
        });

        it('should complete trick when all players have played', function() {
            const gameState = JSON.parse(JSON.stringify(server3.gameState));
            
            // Set up players with specific cards that are in their hands
            const southCard = { suit: 'hearts', rank: 'A' };
            const westCard = { suit: 'clubs', rank: 'K' };
            const northCard = { suit: 'clubs', rank: 'Q' };
            const eastCard = { suit: 'hearts', rank: '10' };
            
            // Update player hands with cards that match exactly what will be played
            gameState.players = {
                ...gameState.players,
                south: { ...gameState.players.south, hand: [southCard] },
                west: { ...gameState.players.west, hand: [westCard] },
                north: { ...gameState.players.north, hand: [northCard] },
                east: { ...gameState.players.east, hand: [eastCard] }
            };
            
            // Set up game state
            gameState.currentTrick = [];
            gameState.playerOrder = ['south', 'west', 'north', 'east'];
            gameState.currentPlayer = 'south';
            gameState.currentPhase = 'PLAYING';
            gameState.tricks = [];
            gameState.trumpSuit = 'hearts'; // Explicitly set trump suit to hearts
            
            // Play the trick with proper state management
            let updatedState;
            
            // South plays first
            updatedState = handlePlayCard(JSON.parse(JSON.stringify(gameState)), 'south', JSON.parse(JSON.stringify(southCard)));
            
            // West plays next with the updated state from south's play
            updatedState = handlePlayCard(JSON.parse(JSON.stringify(updatedState)), 'west', JSON.parse(JSON.stringify(westCard)));
            
            // North plays next with the updated state from west's play
            updatedState = handlePlayCard(JSON.parse(JSON.stringify(updatedState)), 'north', JSON.parse(JSON.stringify(northCard)));
            
            // East plays last - this should complete the trick
            updatedState = handlePlayCard(JSON.parse(JSON.stringify(updatedState)), 'east', JSON.parse(JSON.stringify(eastCard)));
            
            // The trick should be completed and added to the tricks array
            expect(updatedState.tricks).to.have.lengthOf(1);
            
            // Current trick should be cleared for the next trick
            expect(updatedState.currentTrick).to.have.lengthOf(0);
            
            // Log the trick winner for debugging
            console.log('Trick winner:', updatedState.tricks[0].winner);
            console.log('Trick cards:', updatedState.tricks[0].cards);
            
            // Log the full updated state for debugging
            console.log('Full updated state:', JSON.stringify(updatedState, null, 2));
            
            // Verify the trick winner is correct based on game logic
            // The Ace of hearts (south) should beat the 10 of hearts (east)
            console.log('Verifying trick winner is south...');
            console.log('Actual trick winner:', updatedState.tricks[0].winner);
            console.log('All tricks:', JSON.stringify(updatedState.tricks, null, 2));
            
            expect(updatedState.tricks[0].winner).to.equal('south');
            
            // Verify the next player is correctly set to the winner of the trick
            console.log('Verifying current player is set to winner (south)...');
            console.log('Actual current player:', updatedState.currentPlayer);
            expect(updatedState.currentPlayer).to.equal('south');
            
            // Verify the trick contains all played cards
            expect(updatedState.tricks[0].cards).to.have.lengthOf(4);
        });

        it('should throw error when playing out of turn', function() {
            const gameState = { 
                ...server3.gameState,
                currentPlayer: 'south'
            };
            
            expect(() => {
                handlePlayCard(gameState, 'west', { suit: 'clubs', rank: 'K' });
            }).to.throw('Not west\'s turn to play');
        });

        it('should throw error when card not in hand', function() {
            const gameState = { ...server3.gameState };
            
            expect(() => {
                handlePlayCard(gameState, 'south', { suit: 'spades', rank: 'A' });
            }).to.throw('Card not in player\'s hand');
        });

        it('should throw error when not following suit', function() {
            const gameState = JSON.parse(JSON.stringify(server3.gameState));
            
            // Set up west's hand with hearts and clubs
            gameState.players.west.hand = [
                { suit: 'hearts', rank: 'K' },
                { suit: 'clubs', rank: 'K' }
            ];
            
            // Set up the trick with a leading heart
            gameState.currentTrick = [
                { player: 'south', card: { suit: 'hearts', rank: 'A' } }
            ];
            gameState.currentPlayer = 'west';
            
            // West tries to play clubs but must follow hearts
            expect(() => {
                handlePlayCard(gameState, 'west', { suit: 'clubs', rank: 'K' });
            }).to.throw('Must follow suit (hearts)');
        });

        it('should handle left bower as trump', function() {
            // Test 1: Left bower should beat regular trump cards
            let gameState = JSON.parse(JSON.stringify(server3.gameState));
            
            // Set up the game state with left bower as trump
            const leftBower = { suit: 'diamonds', rank: 'J' };  // Left bower when trump is hearts
            const rightBower = { suit: 'hearts', rank: 'J' };   // Right bower
            const regularTrump = { suit: 'hearts', rank: 'A' };  // Regular trump card
            
            // Set up game state for first test (left bower vs regular trump)
            gameState.trumpSuit = 'hearts';
            gameState.players.south.hand = [leftBower];
            gameState.players.west.hand = [regularTrump];
            gameState.playerOrder = ['south', 'west'];
            gameState.currentPlayer = 'south';
            gameState.currentPhase = 'PLAYING';
            gameState.currentTrick = [];
            gameState.tricks = [];
            
            // Verify the left bower is recognized as a trump card
            const leftBowerIsTrump = serverIsValidPlay('south', leftBower, gameState);
            expect(leftBowerIsTrump).to.be.true;
            
            // South plays left bower
            let updatedState = handlePlayCard(JSON.parse(JSON.stringify(gameState)), 'south', JSON.parse(JSON.stringify(leftBower)));
            
            // West plays regular trump
            updatedState = handlePlayCard(updatedState, 'west', JSON.parse(JSON.stringify(regularTrump)));
            
            // Left bower (south) should win over regular trump (west)
            expect(updatedState.tricks[0].winner).to.equal('south');
            
            // Test 2: Right bower should beat left bower
            gameState = JSON.parse(JSON.stringify(server3.gameState));
            
            // Set up game state for second test (right bower vs left bower)
            gameState.trumpSuit = 'hearts';
            gameState.players.south.hand = [leftBower];
            gameState.players.west.hand = [rightBower];
            gameState.playerOrder = ['south', 'west'];
            gameState.currentPlayer = 'south';
            gameState.currentPhase = 'PLAYING';
            gameState.currentTrick = [];
            gameState.tricks = [];
            
            // South plays left bower
            updatedState = handlePlayCard(JSON.parse(JSON.stringify(gameState)), 'south', JSON.parse(JSON.stringify(leftBower)));
            
            // West plays right bower (should win over left bower)
            updatedState = handlePlayCard(updatedState, 'west', JSON.parse(JSON.stringify(rightBower)));
            
            // Right bower (west) should win over left bower (south)
            expect(updatedState.tricks[0].winner).to.equal('west');
        });

        it('should handle end of hand when all tricks are played', function() {
            const gameState = JSON.parse(JSON.stringify(server3.gameState));
            
            // Set up players with specific cards
            const southCard = { suit: 'hearts', rank: 'A' };
            const westCard = { suit: 'hearts', rank: 'K' };
            const northCard = { suit: 'hearts', rank: 'Q' };
            const eastCard = { suit: 'hearts', rank: 'J' };
            
            gameState.players = {
                ...gameState.players,
                south: { ...gameState.players.south, hand: [southCard] },
                west: { ...gameState.players.west, hand: [westCard] },
                north: { ...gameState.players.north, hand: [northCard] },
                east: { ...gameState.players.east, hand: [eastCard] }
            };
            
            gameState.currentTrick = [];
            gameState.playerOrder = ['south', 'west', 'north', 'east'];
            gameState.currentPlayer = 'south';
            gameState.currentPhase = 'PLAYING';
            gameState.tricks = [];
            gameState.maxTricks = 1; // Only one trick to complete the hand
            
            // Play the trick
            let updatedState = handlePlayCard(JSON.parse(JSON.stringify(gameState)), 'south', JSON.parse(JSON.stringify(southCard)));
            updatedState = handlePlayCard(updatedState, 'west', JSON.parse(JSON.stringify(westCard)));
            updatedState = handlePlayCard(updatedState, 'north', JSON.parse(JSON.stringify(northCard)));
            updatedState = handlePlayCard(updatedState, 'east', JSON.parse(JSON.stringify(eastCard)));
            
            // Should move to scoring phase after last trick
            expect(updatedState.currentPhase).to.equal('SCORING');
        });
    });
});
