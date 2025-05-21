const assert = require('assert');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('Deck Management', function() {
    let server;
    let logStub, appendFileStub;
    let createDeck, shuffleDeck, gameState, SUITS, VALUES;

    beforeEach(() => {
        logStub = sinon.stub(console, 'log');
        appendFileStub = sinon.stub();
        
        // Mock fs.appendFileSync
        const fsMock = { appendFileSync: appendFileStub };
        
        // Mock socket.io
        const ioMock = function() {
            return {
                sockets: { sockets: {} },
                to: () => ({ emit: () => {} }),
                emit: () => {},
                on: () => {},
                in: () => ({ emit: () => {} })
            };
        };

        // Load the server module with mocks
        server = proxyquire('../server3', {
            fs: fsMock,
            'socket.io': ioMock
        });

        // Extract the functions we want to test
        createDeck = server.createDeck;
        shuffleDeck = server.shuffleDeck;
        gameState = server.gameState;
        SUITS = server.SUITS;
        VALUES = server.VALUES;
        
        // Reset game state before each test
        server.resetFullGame();
    });

    afterEach(() => {
        logStub.restore();
    });

    describe('createDeck', function() {
        it('should create a standard Euchre deck with 24 cards', function() {
            createDeck();
            assert.strictEqual(gameState.deck.length, 24);
        });

        it('should create cards with all combinations of suits and values', function() {
            createDeck();
            
            // Count cards for each suit
            const suitCounts = { hearts: 0, diamonds: 0, clubs: 0, spades: 0 };
            const valueCounts = {};
            
            gameState.deck.forEach(card => {
                suitCounts[card.suit]++;
                valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
            });
            
            // Should have 6 cards per suit (9, 10, J, Q, K, A)
            Object.values(suitCounts).forEach(count => {
                assert.strictEqual(count, 6);
            });
            
            // Should have 4 of each value (one per suit)
            Object.values(valueCounts).forEach(count => {
                assert.strictEqual(count, 4);
            });
        });

        it('should generate unique IDs for each card', function() {
            createDeck();
            const cardIds = new Set();
            
            gameState.deck.forEach(card => {
                assert(!cardIds.has(card.id), `Duplicate card ID found: ${card.id}`);
                cardIds.add(card.id);
                assert.strictEqual(card.id, `${card.value}-${card.suit}`);
            });
        });
    });

    describe('shuffleDeck', function() {
        it('should maintain all original cards', function() {
            createDeck();
            const originalDeck = JSON.parse(JSON.stringify(gameState.deck));
            
            shuffleDeck();
            
            // Check that all original cards are still present
            const shuffledDeck = gameState.deck;
            assert.strictEqual(shuffledDeck.length, originalDeck.length);
            
            const originalCardIds = new Set(originalDeck.map(card => card.id));
            shuffledDeck.forEach(card => {
                assert(originalCardIds.has(card.id), `Unexpected card in shuffled deck: ${card.id}`);
            });
        });

        it('should change the order of cards', function() {
            // This test might occasionally fail due to random chance, but it's very unlikely
            createDeck();
            const originalOrder = gameState.deck.map(card => card.id);
            
            // Make multiple attempts to ensure we get a different order
            let isDifferent = false;
            for (let i = 0; i < 10; i++) {
                shuffleDeck();
                const newOrder = gameState.deck.map(card => card.id);
                if (JSON.stringify(originalOrder) !== JSON.stringify(newOrder)) {
                    isDifferent = true;
                    break;
                }
            }
            
            assert(isDifferent, 'Deck order did not change after multiple shuffles');
        });
    });

    describe('integration with game state', function() {
        it('should be used when starting a new hand', function() {
            // Mock createDeck and shuffleDeck to verify they're called
            const createDeckSpy = sinon.spy(server, 'createDeck');
            const shuffleDeckSpy = sinon.spy(server, 'shuffleDeck');
            
            server.startNewHand();
            
            assert(createDeckSpy.calledOnce, 'createDeck was not called');
            assert(shuffleDeckSpy.calledOnce, 'shuffleDeck was not called');
            assert.strictEqual(gameState.deck.length, 0); // Deck should be empty after dealing
            
            createDeckSpy.restore();
            shuffleDeckSpy.restore();
        });
    });
});
