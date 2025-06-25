import assert from 'assert';
import esmock from 'esmock';
import sinon from 'sinon';
import { handleDealerDiscard } from '../../src/game/phases/biddingPhase.js'; // Adjusted path
import { DEBUG_LEVELS, GAME_PHASES } from '../../src/config/constants.js';

// Debug configuration
const DEBUG = Object.freeze({
    enabled: process.env.DEBUG_TESTS === 'true',
    log: function(...args) {
        if (this.enabled) {
            console.log('[DEBUG]', ...args);
        }
    },
    error: function(...args) {
        if (this.enabled) {
            console.error('[ERROR]', ...args);
        }
    }
});

// Create a closure to store emitted messages
const createMockIo = (emittedMessages) => {
    return {
        to: () => ({
            emit: (event, message) => {
                // Store emitted messages for testing
                emittedMessages.push({ event, message });
            }
        }),
        emit: (event, message) => {
            // Store broadcast messages
            emittedMessages.push({ event, message, broadcast: true });
        },
        in: () => ({
            emit: (event, message) => {
                // Store room messages
                emittedMessages.push({ event, message, room: true });
            }
        })
    };
};

describe('Euchre Server Dealer Discard Functions', function() {
    /** @type {Function} mockedHandleDealerDiscard - The imported and potentially esmocked version of handleDealerDiscard */
    let actualHandleDealerDiscard;
    
    /** @type {Object} gameState - The game state object */
    let gameState;
    
    /** @type {Object} mockIo - Mock IO instance, though handleDealerDiscard may not use it directly */
    let mockIo;
    
    /** @type {Array} emittedMessages - Array to store emitted messages for testing (may become less relevant) */
    let emittedMessages = [];

    // Mocks for dependencies of handleDealerDiscard
    let mockValidateDealerDiscard;
    let mockLogger;
    let mockCardToId;
    let MockCardNotInHandError;


    /**
     * @description Before each test, reset the test environment and set up mocks.
     * Uses esmock to import handleDealerDiscard with mocked dependencies.
     */
    beforeEach(async () => {
        emittedMessages = []; // Reset for clarity, though direct emissions might not occur

        mockValidateDealerDiscard = sinon.stub();
        // Default behavior for the stub (can be overridden in specific tests)
        // For most tests, we want it to behave like a successful validation (do nothing, or return true)
        // If a test needs it to throw, it can configure it: mockValidateDealerDiscard.throws(new Error(...));
        // Or for the specific hand size test: mockValidateDealerDiscard.callsFake((gs, role, card, hand) => { ... });
        
        mockLogger = {
            info: sinon.spy(),
            warn: sinon.spy(),
            error: sinon.spy(),
            debug: sinon.spy(),
        };

        mockCardToId = sinon.spy(card => card ? `${card.value}${card.suit.charAt(0).toUpperCase()}` : 'UnknownCard');

        // This is a real error class, but we might want to spy on its constructor or ensure it's the one thrown
        // For now, we'll allow the real one to be used by the module,
        // but if specific tests need to control its instantiation, this could be a mock constructor.
        // We're primarily mocking functions *called by* handleDealerDiscard.
        // CardNotInHandError is defined in errors.js, which biddingPhase.js imports.
        // We can let it use the real one, or if we needed to check *how* it's constructed by handleDealerDiscard,
        // we would mock errors.js itself. For now, assume real error is fine.
        // MockCardNotInHandError = sinon.stub(); // Example if we wanted to mock instantiation

        actualHandleDealerDiscard = await esmock('../../src/game/phases/biddingPhase.js', { // Adjusted path
            '../../src/game/logic/validation.js': { // Adjusted path for mock
                validateDealerDiscard: mockValidateDealerDiscard,
            },
            '../../src/utils/logger.js': mockLogger, // Adjusted path for mock
            '../../src/utils/deck.js': { // Adjusted path for mock
                cardToId: mockCardToId,
            },
            // If CardNotInHandError needed to be mocked (e.g. to check constructor calls)
            // '../../src/game/logic/errors.js': { // Adjusted path for mock
            //   CardNotInHandError: MockCardNotInHandError
            // }
        });
        
        // The old ioMock might still be useful if we want to simulate a handler calling our function
        // and then check what that handler would emit. For now, keep its structure.
        mockIo = createMockIo(emittedMessages); // createMockIo is defined in the file

        // Initialize game state with all required properties
        gameState = {
            gamePhase: 'LOBBY',
            playerSlots: ['south', 'west', 'north', 'east'],
            players: {
                south: { id: 'fakeSocketId', name: 'Player 1', hand: [] },
                west: { id: 'fakeSocketId2', name: 'Player 2', hand: [] },
                north: { id: 'fakeSocketId3', name: 'Player 3', hand: [] },
                east: { id: 'fakeSocketId4', name: 'Player 4', hand: [] }
            },
            messages: [], // This 'messages' might be legacy, gameState now has 'gameMessages'
            team1Score: 0,
            team2Score: 0,
            currentTrickPlays: [],
            tricksWon: { team1: 0, team2: 0 },
            kitty: [],
            dealer: null,
            currentPlayer: null,
            playerWhoCalledTrump: null,
            dealerHasDiscarded: false,
            gameMessages: [] // Ensure gameMessages is part of the test gameState
        };
        
        // The old wrapper for handleDealerDiscard (previously on 'server.handleDealerDiscard') is no longer needed.
        // Tests will call actualHandleDealerDiscard.handleDealerDiscard directly.
        // Error handling and message/event checking will be done by inspecting
        // thrown errors or the returned gameState.
        // The lines `server.gameState = gameState;` and the definition of `originalHandleDealerDiscard`
        // and the reassignment of `server.handleDealerDiscard` are removed as 'server' is no longer used.
    });

    /**
     * @description Test suite for the handleDealerDiscard function.
     * Tests various scenarios for the dealer discard functionality.
     */
        /**
         * Test suite for the handleDealerDiscard function.
         * Tests various scenarios for the dealer discard functionality.
         */
    describe('handleDealerDiscard', function() {
        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server rejects discard attempts
         * when the game is not in the AWAITING_DEALER_DISCARD phase.
         */
        it('should reject discard when not in AWAITING_DEALER_DISCARD phase', function() {
            // Setup test
            gameState.gamePhase = 'PLAYING_TRICKS';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.south.hand = [{ id: 'H1', suit: 'hearts', value: 'A' }]; // Changed id to string for consistency
            
            // Execute and Verify
            assert.throws(
                () => actualHandleDealerDiscard.handleDealerDiscard(gameState, 'south', 'H1'),
                Error, // Expecting an error propagated from validateDealerDiscard, likely InvalidPhaseError
                'Should throw an error for wrong phase'
            );
            // We also expect validateDealerDiscard to have been called and that's what throws.
            // So, check that our mock was called.
            sinon.assert.calledOnce(mockValidateDealerDiscard);
            assert.strictEqual(gameState.dealerHasDiscarded, false, 'dealerHasDiscarded should remain false');
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server rejects discard attempts
         * from players who are not the current dealer.
         */
        it('should reject discard from non-dealer player', function() {
            // Setup test
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south'; // Important: current player is south (dealer)
            // 'north' is attempting the discard. Their hand content is less relevant than them not being the dealer.
            gameState.players.north.hand = [{ id: 'H1', suit: 'hearts', value: 'A' }];
            
            // Execute and Verify
            assert.throws(
                () => actualHandleDealerDiscard.handleDealerDiscard(gameState, 'north', 'H1'),
                Error, // Expecting an error from validateDealerDiscard, likely InvalidDiscardError
                'Should throw an error for non-dealer player'
            );
            sinon.assert.calledOnce(mockValidateDealerDiscard);
            assert.strictEqual(gameState.dealerHasDiscarded, false, 'dealerHasDiscarded should remain false');
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server enforces the rule that the dealer
         * must have exactly 6 cards (after picking up the turn card) before discarding one.
         */
        it('should reject discard when hand size is not 6 (after including turnCard)', function() {
            // Setup test
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.turnCard = { id: 'C1A', suit: 'clubs', value: 'A' }; // Turn card to be picked up
            gameState.players.south.hand = [ // Hand currently has 4 cards, + turn card = 5
                { id: 'H1A', suit: 'hearts', value: 'A' },
                { id: 'H1K', suit: 'hearts', value: 'K' },
                { id: 'H1Q', suit: 'hearts', value: 'Q' },
                { id: 'H1J', suit: 'hearts', value: 'J' },
            ];
            
            const cardToAttemptDiscard = gameState.players.south.hand[0]; // { id: 1, suit: 'hearts', value: 'A' }
            
            // Configure the behavior of the mockValidateDealerDiscard stub (from beforeEach)
            // specifically for this test case.
            mockValidateDealerDiscard.callsFake((gs, role, card, hand) => {
                if (hand.length !== 6) {
                    throw new Error('Invalid hand size for discard (must be 6).');
                }
                // If hand.length is 6, it will do nothing (default stub behavior),
                // which is fine as this test expects the throw.
            });

            // Execute and Verify
            assert.throws(
                () => actualHandleDealerDiscard.handleDealerDiscard(gameState, 'south', String(cardToAttemptDiscard.id)),
                Error,
                'Invalid hand size for discard (must be 6).'
            );
            sinon.assert.calledOnce(mockValidateDealerDiscard); // Check that our configured mock was called
            assert.strictEqual(gameState.dealerHasDiscarded, false, 'dealerHasDiscarded should remain false');

            // Restore original mockValidateDealerDiscard behavior from beforeEach if it was more complex
            // For a simple spy, just re-assigning in the next beforeEach run is fine.
            // If it had more complex default behavior: mockValidateDealerDiscard = originalMockValidate;
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that a valid dealer discard is processed correctly,
         * updating the game state and transitioning to the next phase.
         */
        it('should successfully process valid dealer discard', function() {
            // Setup test
            // Ensure mockValidateDealerDiscard does not throw for this valid case
            // The default spy in beforeEach is fine.
            // Setup: Dealer 'south' has 5 cards. Picks up 'turnUpCard', resulting in 6. Then discards 'cardToDiscardFromHand'.
            const originalHand = [
                { id: 'HA', suit: 'hearts', value: 'A' },
                { id: 'HK', suit: 'hearts', value: 'K' },
                { id: 'HQ', suit: 'hearts', value: 'Q' },
                { id: 'HJ', suit: 'hearts', value: 'J' },
                { id: 'H9', suit: 'hearts', value: '9' } // Card that will be kept
            ];
            const turnUpCard = { id: 'HT', suit: 'hearts', value: '10' }; // This is the card picked up
            const cardToDiscardFromHand = { id: 'HA', suit: 'hearts', value: 'A' }; // Dealer chooses to discard Ace of Hearts

            // The hand that handleDealerDiscard receives (and validateDealerDiscard)
            // is the hand *after* picking up the turn card.
            const dealerHandAfterPickup = [...originalHand, turnUpCard]; // Now 6 cards

            gameState = {
                gamePhase: GAME_PHASES.DEALER_DISCARD, // Correct phase from constants.js
                dealer: 'south',
                currentPlayer: 'south',
                playerWhoCalledTrump: 'west', // or playerWhoOrderedUp
                playerWhoOrderedUp: 'west', // biddingPhase uses this to set next player
                turnCard: turnUpCard, // This is the card that was on the table, now conceptually in hand
                kitty: [],
                messages: [],
                players: {
                    ...gameState.players, // Spread existing players for other roles
                    south: {
                        id: 'south-1',
                        name: 'Player 1',
                        hand: dealerHandAfterPickup // Hand of 6 cards
                    },
                    // Ensure other players exist for functions like getNextPlayer if they are called
                    west: { id: 'west-1', name: 'Player 2', hand: [] },
                    north: { id: 'north-1', name: 'Player 3', hand: [] },
                    east: { id: 'east-1', name: 'Player 4', hand: [] }
                },
                playerSlots: ['south', 'west', 'north', 'east'], // ensure this matches roles used
                team1Score: 0, team2Score: 0,
                currentTrickPlays: [],
                tricksWon: { team1: 0, team2: 0 },
                dealerHasDiscarded: false, // This property is not used by biddingPhase.js
                gameMessages: []
            };
            
            // Execute
            // handleDealerDiscard is called with the ID of the card to be removed from the 6-card hand.
            const newState = actualHandleDealerDiscard.handleDealerDiscard(gameState, 'south', cardToDiscardFromHand.id);
            
            // Verify
            assert.ok(newState, 'Should return a new game state object for successful discard');

            // Check mocks
            sinon.assert.calledOnce(mockValidateDealerDiscard);
            // validateDealerDiscard is called with the 6-card hand
            sinon.assert.calledWith(mockValidateDealerDiscard, gameState, 'south', sinon.match({id: cardToDiscardFromHand.id}), dealerHandAfterPickup);
            sinon.assert.calledWith(mockLogger.info, sinon.match.has("pickedUp", mockCardToId(turnUpCard)));
            sinon.assert.calledWith(mockLogger.info, sinon.match.has("discarded", mockCardToId(cardToDiscardFromHand)));

            // Check returned state
            assert.strictEqual(newState.gamePhase, GAME_PHASES.GOING_ALONE_DECISION, 'Should move to GOING_ALONE_DECISION phase');
            assert.strictEqual(newState.currentPlayer, 'west', 'Current player should be set to player who ordered up/called trump');

            assert.strictEqual(newState.players.south.hand.length, 5, 'Dealer should have 5 cards');
            // The turnUpCard (HT) should be in the final hand (unless it was the one discarded, which it isn't in this setup)
            assert.ok(newState.players.south.hand.some(card => card.id === turnUpCard.id), 'Dealer hand should contain the turnUpCard (HT)');
            // The cardToDiscardFromHand (HA) should NOT be in the final hand
            assert.ok(!newState.players.south.hand.some(card => card.id === cardToDiscardFromHand.id), 'Dealer hand should not contain the discarded card (HA)');

            // Ensure other original cards (except the discarded one) are still there
            const expectedKeptCards = originalHand.filter(c => c.id !== cardToDiscardFromHand.id);
            expectedKeptCards.forEach(keptCard => {
                assert.ok(newState.players.south.hand.some(card => card.id === keptCard.id), `Kept card ${keptCard.id} should be in hand`);
            });

            assert.strictEqual(newState.turnCard, null, 'gameState.turnCard (on table) should be null after discard');
            assert.ok(newState.gameMessages.some(msg => msg.text.includes('picked up') && msg.text.includes(mockCardToId(turnUpCard)) && msg.text.includes('discarded') && msg.text.includes(mockCardToId(cardToDiscardFromHand))), 'Game message should reflect discard');
        });

        /**
         * @test {handleDealerDiscard}
         * @description Verifies that the server prevents the dealer from discarding
         * a card that is not in their hand.
         */
        it('should reject discard of card not in hand', function() {
            // Setup test
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.south.hand = [
                { id: 1, suit: 'hearts', value: 'A' },
                { id: 2, suit: 'hearts', value: 'K' },
                { id: 3, suit: 'hearts', value: 'Q' },
                { id: 4, suit: 'hearts', value: 'J' },
                { id: 5, suit: 'hearts', value: '10' },
                { id: 6, suit: 'hearts', value: '9' }
            ];
            
            const cardNotInHandId = 'XX'; // An ID guaranteed not to be in the hand
            
            // Execute and Verify
            assert.throws(
                () => actualHandleDealerDiscard.handleDealerDiscard(gameState, 'south', cardNotInHandId),
                Error, // Expecting CardNotInHandError from the preliminary check in handleDealerDiscard
                `Card ${cardNotInHandId} not found in dealer's hand.` // Match the specific error message if possible
            );
            
            // Check that logger.error was called due to the preliminary check failing
            sinon.assert.calledWith(mockLogger.error, sinon.match.has("cardToDiscardId", cardNotInHandId));

            // mockValidateDealerDiscard should NOT have been called in this case because the preliminary check fails first.
            sinon.assert.notCalled(mockValidateDealerDiscard);
            
            assert.strictEqual(gameState.players.south.hand.length, 6, 'Hand size should remain unchanged');
            // dealerHasDiscarded is not set by the function itself, so checking original gameState is correct
            assert.strictEqual(gameState.dealerHasDiscarded, false, 'dealerHasDiscarded should remain false');
        });
    });
});
