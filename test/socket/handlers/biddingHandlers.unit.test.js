// test/socket/handlers/biddingHandlers.unit.test.js
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { registerBiddingHandlers } from '../../../src/socket/handlers/biddingHandlers.js';
import { GAME_EVENTS } from '../../../src/config/constants.js';
import logger from '../../../src/utils/logger.js';
// Mock game state and persistence functions
import * as gameStateModule from '../../../src/game/state.js';
import * as gameRepositoryModule from '../../../src/db/gameRepository.js';
// Mock bidding phase logic functions
import * as biddingPhaseModule from '../../../src/game/phases/biddingPhase.js';
// Mock validation functions
import * as validationCoreModule from '../../../src/game/logic/validation-core.js';

// --- Test Setup ---
const setupMocks = () => {
  const mockSocket = {
    id: 'socket1',
    on: mock.fn(),
    emit: mock.fn(),
  };
  const mockIo = {
    to: mock.fn(() => ({
      emit: mock.fn(),
    })),
  };
  const mockEmitToRoom = mockIo.to().emit; // Reference to the emit function in the room

  const mockGameState = {
    gameId: 'testGame1',
    players: {
      player1: { id: 'user1', name: 'Player1', socketId: 'socket1', teamId: 'TEAM_NS' },
      player2: { id: 'user2', name: 'Player2', socketId: 'socket2', teamId: 'TEAM_EW' },
    },
    currentPlayer: 'player1',
    dealer: 'player2',
    turnCard: { suit: 'DIAMONDS', value: 'ACE' },
    gamePhase: 'GAME_PHASE_ORDER_UP_ROUND1',
    gameMessages: [],
    bids: [],
    playerWhoOrderedUp: null,
    playerWhoCalledTrump: null,
    makerTeam: null,
  };

  const mockGetGameState = mock.fn((gameId) => {
    if (gameId === mockGameState.gameId) {
      return { ...mockGameState }; // Return a clone
    }
    return null;
  });
  const mockUpdateGameState = mock.fn((gameId, updateFn) => {
    if (gameId === mockGameState.gameId) {
      const currentState = mockGetGameState(gameId);
      return updateFn(currentState);
    }
    throw new Error('Game not found for update');
  });

  const mockGameRepository = {
    getGame: mock.fn(async (gameId) => {
      if (gameId === mockGameState.gameId) {
        return { ...mockGameState }; // Return a clone
      }
      return null;
    }),
    updateGame: mock.fn(async (gameId, gameState) => Promise.resolve(gameState)),
  };

  const mockBiddingPhase = {
    handleOrderUpDecision: mock.fn((state, playerRole, decision) => ({ ...state, updatedBy: 'handleOrderUpDecision' })),
    handleDealerDiscard: mock.fn((state, playerRole, cardId) => ({ ...state, updatedBy: 'handleDealerDiscard' })),
    handleCallTrumpDecision: mock.fn((state, playerRole, decision, suit) => ({ ...state, updatedBy: 'handleCallTrumpDecision' })),
  };

  const mockValidationCore = {
    validateBid: mock.fn(() => true),
    validateDealerDiscard: mock.fn(() => true),
  };

  // Mock logger methods
  const mockLogger = {
    info: mock.fn(),
    warn: mock.fn(),
    error: mock.fn(),
  };
  mock.method(logger, 'info', mockLogger.info);
  mock.method(logger, 'warn', mockLogger.warn);
  mock.method(logger, 'error', mockLogger.error);


  return {
    mockSocket,
    mockIo,
    mockEmitToRoom,
    mockGameState,
    mockGetGameState,
    mockUpdateGameState,
    mockGameRepository,
    mockBiddingPhase,
    mockValidationCore,
    mockLogger,
  };
};

describe('biddingHandlers', () => {
  let mocks;

  beforeEach(() => {
    mocks = setupMocks();
    // Dynamically mock the modules to ensure fresh state and apply mocks
    mock.method(gameStateModule, 'getGameState', mocks.mockGetGameState);
    mock.method(gameStateModule, 'updateGameState', mocks.mockUpdateGameState);
    mock.method(gameRepositoryModule, 'gameRepository', mocks.mockGameRepository);
    mock.method(biddingPhaseModule, 'handleOrderUpDecision', mocks.mockBiddingPhase.handleOrderUpDecision);
    mock.method(biddingPhaseModule, 'handleDealerDiscard', mocks.mockBiddingPhase.handleDealerDiscard);
    mock.method(biddingPhaseModule, 'handleCallTrumpDecision', mocks.mockBiddingPhase.handleCallTrumpDecision);
    mock.method(validationCoreModule, 'validateBid', mocks.mockValidationCore.validateBid);
    mock.method(validationCoreModule, 'validateDealerDiscard', mocks.mockValidationCore.validateDealerDiscard);

    // Register the handlers once per test suite
    registerBiddingHandlers(mocks.mockSocket, mocks.mockIo);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it('should register all bidding event handlers', () => {
    assert.strictEqual(mocks.mockSocket.on.mock.callCount(), 3);
    assert.strictEqual(mocks.mockSocket.on.mock.calls[0].arguments[0], GAME_EVENTS.ACTION_ORDER_UP_DECISION);
    assert.strictEqual(mocks.mockSocket.on.mock.calls[1].arguments[0], GAME_EVENTS.ACTION_DEALER_DISCARD);
    assert.strictEqual(mocks.mockSocket.on.mock.calls[2].arguments[0], GAME_EVENTS.ACTION_CALL_TRUMP_DECISION);
  });

  describe('ACTION_ORDER_UP_DECISION handler', () => {
    let handler;
    let callback;

    beforeEach(() => {
      handler = mocks.mockSocket.on.mock.calls.find(call => call.arguments[0] === GAME_EVENTS.ACTION_ORDER_UP_DECISION).arguments[1];
      callback = mock.fn();
    });

    it('should process a valid order up decision', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', decision: true };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockGetGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockBiddingPhase.handleOrderUpDecision.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockIo.to.mock.callCount(), 1);
      assert.strictEqual(mocks.mockEmitToRoom.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Received ACTION_ORDER_UP_DECISION')), true);
      assert.strictEqual(mocks.mockLogger.info.mock.calls.some(c => c.arguments[0].includes('Emitted GAME_EVENT_STATE_UPDATE')), true);
    });

    it('should hydrate game state from DB if not in memory', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null); // Simulate not in memory
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', decision: true };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockGameRepository.getGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 2); // One for hydration, one for game logic
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
    });

    it('should return error for invalid payload', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1' }; // Missing decision
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.warn.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Invalid payload for ACTION_ORDER_UP_DECISION' });
    });

    it('should return error if game not found in memory or DB', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null);
      mocks.mockGameRepository.getGame.mock.mockImplementationOnce(() => null);
      const payload = { gameId: 'nonExistentGame', playerRole: 'player1', decision: true };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Game not found.' });
    });

    it('should handle errors from bidding phase logic', async () => {
      mocks.mockBiddingPhase.handleOrderUpDecision.mock.mockImplementation(() => {
        throw new Error('Invalid bid');
      });
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', decision: true };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Invalid bid' });
    });
  });

  describe('ACTION_DEALER_DISCARD handler', () => {
    let handler;
    let callback;

    beforeEach(() => {
      handler = mocks.mockSocket.on.mock.calls.find(call => call.arguments[0] === GAME_EVENTS.ACTION_DEALER_DISCARD).arguments[1];
      callback = mock.fn();
      // Set game phase for dealer discard
      mocks.mockGameState.gamePhase = 'GAME_PHASE_DEALER_DISCARD';
      mocks.mockGameState.currentPlayer = mocks.mockGameState.dealer;
      mocks.mockGameState.players[mocks.mockGameState.dealer] = { hand: [{ id: 'card1' }, { id: 'card2' }, { id: 'card3' }, { id: 'card4' }, { id: 'card5' }, { id: 'turnCard' }], name: 'Dealer' };
      mocks.mockGameState.turnCard = { id: 'turnCard' };
    });

    it('should process a valid dealer discard', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: mocks.mockGameState.dealer, cardId: 'card1' };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockGetGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockBiddingPhase.handleDealerDiscard.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockIo.to.mock.callCount(), 1);
      assert.strictEqual(mocks.mockEmitToRoom.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
    });

    it('should hydrate game state from DB if not in memory', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null); // Simulate not in memory
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: mocks.mockGameState.dealer, cardId: 'card1' };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockGameRepository.getGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 2); // One for hydration, one for game logic
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
    });

    it('should return error for invalid payload', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: mocks.mockGameState.dealer }; // Missing cardId
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.warn.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Invalid payload for ACTION_DEALER_DISCARD' });
    });

    it('should return error if game not found in memory or DB', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null);
      mocks.mockGameRepository.getGame.mock.mockImplementationOnce(() => null);
      const payload = { gameId: 'nonExistentGame', playerRole: mocks.mockGameState.dealer, cardId: 'card1' };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Game not found.' });
    });

    it('should handle errors from bidding phase logic', async () => {
      mocks.mockBiddingPhase.handleDealerDiscard.mock.mockImplementation(() => {
        throw new Error('Invalid discard');
      });
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: mocks.mockGameState.dealer, cardId: 'card1' };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Invalid discard' });
    });
  });

  describe('ACTION_CALL_TRUMP_DECISION handler', () => {
    let handler;
    let callback;

    beforeEach(() => {
      handler = mocks.mockSocket.on.mock.calls.find(call => call.arguments[0] === GAME_EVENTS.ACTION_CALL_TRUMP_DECISION).arguments[1];
      callback = mock.fn();
      // Set game phase for call trump
      mocks.mockGameState.gamePhase = 'GAME_PHASE_ORDER_UP_ROUND2';
    });

    it('should process a valid call trump decision', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', decision: true, suit: 'CLUBS' };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockGetGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockBiddingPhase.handleCallTrumpDecision.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 1);
      assert.strictEqual(mocks.mockGameRepository.updateGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockIo.to.mock.callCount(), 1);
      assert.strictEqual(mocks.mockEmitToRoom.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
    });

    it('should hydrate game state from DB if not in memory', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null); // Simulate not in memory
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', decision: true, suit: 'CLUBS' };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockGameRepository.getGame.mock.callCount(), 1);
      assert.strictEqual(mocks.mockUpdateGameState.mock.callCount(), 2); // One for hydration, one for game logic
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'ok' });
    });

    it('should return error for invalid payload', async () => {
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1' }; // Missing decision
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.warn.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Invalid payload for ACTION_CALL_TRUMP_DECISION' });
    });

    it('should return error if game not found in memory or DB', async () => {
      mocks.mockGetGameState.mock.mockImplementationOnce(() => null);
      mocks.mockGameRepository.getGame.mock.mockImplementationOnce(() => null);
      const payload = { gameId: 'nonExistentGame', playerRole: 'player1', decision: true, suit: 'CLUBS' };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Game not found.' });
    });

    it('should handle errors from bidding phase logic', async () => {
      mocks.mockBiddingPhase.handleCallTrumpDecision.mock.mockImplementation(() => {
        throw new Error('Invalid call trump');
      });
      const payload = { gameId: mocks.mockGameState.gameId, playerRole: 'player1', decision: true, suit: 'CLUBS' };
      await handler(payload, callback);

      assert.strictEqual(mocks.mockLogger.error.mock.callCount(), 1);
      assert.strictEqual(callback.mock.callCount(), 1);
      assert.deepStrictEqual(callback.mock.calls[0].arguments[0], { status: 'error', message: 'Invalid call trump' });
    });
  });
});
