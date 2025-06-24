import assert from 'assert';
import esmock from 'esmock';
import sinon from 'sinon';
import { handleDealerDiscard } from '../../../src/game/phases/biddingPhase.js';
import { DEBUG_LEVELS } from '../../../src/config/constants.js';

// Verify if we should remove these unused imports
//import { expect } from 'chai';


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

// server3.mjs related 'createServer' function is no longer needed and removed.

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

        mockValidateDealerDiscard = sinon.spy((_gameState, _dealerRole, _cardToDiscard, _dealerHand) => {
            // Default successful validation: return true or nothing
            // Throw an error in specific tests if needed
        });
        
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

        actualHandleDealerDiscard = await esmock('../../../src/game/phases/biddingPhase.js', {
            '../../../src/game/logic/validation.js': {
                validateDealerDiscard: mockValidateDealerDiscard,
            },
            '../../../src/utils/logger.js': mockLogger,
            '../../../src/utils/deck.js': {
                cardToId: mockCardToId,
            },
            // If CardNotInHandError needed to be mocked (e.g. to check constructor calls)
            // '../../../src/game/logic/errors.js': {
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
         * must have exactly 6 cards before discarding one.
         */
        it('should reject discard when hand size is not 6', function() {
            // Setup test
            gameState.gamePhase = 'AWAITING_DEALER_DISCARD';
            gameState.dealer = 'south';
            gameState.currentPlayer = 'south';
            gameState.players.south.hand = [
                { id: 1, suit: 'hearts', value: 'A' },
                { id: 2, suit: 'hearts', value: 'K' },
                { id: 3, suit: 'hearts', value: 'Q' },
                { id: 4, suit: 'hearts', value: 'J' },
                { id: 5, suit: 'hearts', value: '10' }
            ];
            
            const cardToAttemptDiscard = gameState.players.south.hand[0]; // { id: 1, suit: 'hearts', value: 'A' }
            
            // Configure mockValidateDealerDiscard to throw for this specific scenario
            mockValidateDealerDiscard = sinon.spy((gs, role, card, hand) => {
                if (hand.length !== 6) {
                    throw new Error('Invalid hand size for discard (must be 6).');
                }
            });

            // Re-esmock to apply the new mock behavior for this test case
            // This is tricky because esmock is usually top-level.
            // A better way would be to configure the spy behavior before the call.
            // For now, let's assume the spy is checked after the call.
            // The spy in beforeEach is generic. We need to make it throw for this test.
            // So, we will modify the existing spy's behavior for this call.
            
            const originalMockValidate = mockValidateDealerDiscard; // Save original spy from beforeEach
            mockValidateDealerDiscard.callsFake((gs, role, card, hand) => { // Temporarily change behavior
                if (hand.length !== 6) {
                    throw new Error('Invalid hand size for discard (must be 6).');
                }
                // Call the original spy implementation if you want to track calls globally
                // originalMockValidate(gs, role, card, hand);
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
            const cardToDiscard = { id: 'H9', suit: 'hearts', value: '9' };
            const turnUpCard = { id: 'HT', suit: 'hearts', value: '10' };

            gameState = {
                gamePhase: 'AWAITING_DEALER_DISCARD', // Correct phase from constants.js
                dealer: 'south',
                currentPlayer: 'south',
                playerWhoCalledTrump: 'west', // or playerWhoOrderedUp
                playerWhoOrderedUp: 'west', // biddingPhase uses this to set next player
                turnCard: turnUpCard, // Dealer picks this up
                kitty: [], // Kitty will receive the discarded card
                messages: [],
                players: {
                    south: {
                        id: 'south-1',
                        name: 'Player 1',
                        hand: [
                            { id: 'HA', suit: 'hearts', value: 'A' },
                            { id: 'HK', suit: 'hearts', value: 'K' },
                            { id: 'HQ', suit: 'hearts', value: 'Q' },
                            { id: 'HJ', suit: 'hearts', value: 'J' },
                            { id: 'H10', suit: 'hearts', value: '10' }, // This is actually the turnUpCard in this test's logic
                            cardToDiscard // H9
                        ]
                    },
                    west: { id: 'west-1', name: 'Player 2', hand: [] },
                    north: { id: 'north-1', name: 'Player 3', hand: [] },
                    east: { id: 'east-1', name: 'Player 4', hand: [] }
                },
                playerSlots: ['south', 'west', 'north', 'east'],
                team1Score: 0, team2Score: 0,
                currentTrickPlays: [],
                tricksWon: { team1: 0, team2: 0 },
                dealerHasDiscarded: false,
                gameMessages: []
            };
            
            // Execute
            const newState = actualHandleDealerDiscard.handleDealerDiscard(gameState, 'south', cardToDiscard.id);
            
            // Verify
            assert.ok(newState, 'Should return a new game state object for successful discard');

            // Check mocks
            sinon.assert.calledOnce(mockValidateDealerDiscard);
            sinon.assert.calledWith(mockValidateDealerDiscard, gameState, 'south', sinon.match({id: cardToDiscard.id}), gameState.players.south.hand);
            sinon.assert.calledWith(mockLogger.info, sinon.match.has("pickedUp", mockCardToId(turnUpCard)));
            sinon.assert.calledWith(mockLogger.info, sinon.match.has("discarded", mockCardToId(cardToDiscard)));

            // Check returned state
            assert.strictEqual(newState.dealerHasDiscarded, undefined, 'dealerHasDiscarded should not be set on gameState by biddingPhase.handleDealerDiscard'); // This flag might be managed by the caller/socket handler
            assert.strictEqual(newState.gamePhase, 'GOING_ALONE_DECISION', 'Should move to GOING_ALONE_DECISION phase');
            assert.strictEqual(newState.currentPlayer, 'west', 'Current player should be set to player who ordered up/called trump');

            // Kitty is not directly updated by biddingPhase.handleDealerDiscard; it expects the caller to manage this.
            // The function adds the turnCard to hand and removes the discarded card.
            // The discarded card is not placed in `newState.kitty` by `handleDealerDiscard`.
            // This test's original expectation for kitty needs to change.
            // assert.strictEqual(newState.kitty.length, 1, 'Kitty should have one card');
            // assert.strictEqual(newState.kitty[0].id, cardToDiscard.id, 'Discarded card should be in the kitty');
            assert.strictEqual(newState.players.south.hand.length, 5, 'Dealer should have 5 cards');
            assert.ok(newState.players.south.hand.some(card => card.id === turnUpCard.id), 'Dealer hand should contain the turnUpCard');
            assert.ok(!newState.players.south.hand.some(card => card.id === cardToDiscard.id), 'Dealer hand should not contain the discarded card');
            assert.strictEqual(newState.turnCard, null, 'gameState.turnCard should be null after discard');

            assert.ok(newState.gameMessages.some(msg => msg.text.includes('picked up') && msg.text.includes(mockCardToId(turnUpCard))), 'Game message should reflect discard');
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
