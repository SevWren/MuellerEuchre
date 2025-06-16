import * as chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { EventEmitter } from 'events';
import esmock from 'esmock';

chai.use(sinonChai);
const expect = chai.expect;

import { GAME_PHASES, PLAYER_ROLES, GAME_EVENTS, SUITS } from '../../src/config/constants.js';
import { createInitialGameState, resetFullGame } from '../../src/game/state.js';
import { initializePlayers } from '../../src/utils/players.js';
// Logger will be mocked via esmock
// import { handlePlayerDisconnect, handleRejoinGame } from '../../src/socket/handlers/playerConnectionHandlers.js'; // Will be esmocked
import { startNewHand } from '../../src/game/phases/startNewHandPhase.js';

// Construct paths for esmock
const lobbyHandlersModulePath = new URL('../../src/socket/handlers/lobbyHandlers.js', import.meta.url).pathname;
const playerConnectionHandlersModulePath = new URL('../../src/socket/handlers/playerConnectionHandlers.js', import.meta.url).pathname;
const loggerModulePath = new URL('../../src/utils/logger.js', import.meta.url).pathname;
const gameRepositoryModulePath = new URL('../../src/db/gameRepository.js', import.meta.url).pathname;


// In-memory store for gameRepository mock
let memoryGameStore = {};

const mockGameRepository = {
  getGame: sinon.stub().callsFake(async (gameId) => {
    return memoryGameStore[gameId] ? JSON.parse(JSON.stringify(memoryGameStore[gameId])) : null;
  }),
  updateGame: sinon.stub().callsFake(async (gameId, gameState) => {
    memoryGameStore[gameId] = JSON.parse(JSON.stringify(gameState));
    return memoryGameStore[gameId];
  }),
  createGame: sinon.stub().callsFake(async (gameId, initialGameState) => {
    memoryGameStore[gameId] = JSON.parse(JSON.stringify(initialGameState));
    return memoryGameStore[gameId];
  }),
  deleteGame: sinon.stub().callsFake(async (gameId) => {
    delete memoryGameStore[gameId];
  }),
  clearStore: () => {
    memoryGameStore = {};
  }
};

class MockSocket extends EventEmitter {
  constructor(id, user = null) {
    super();
    this.id = id;
    this.rooms = new Set([id]);
    this.gameId = null;
    this.playerRole = null;
    this.request = { user };
    this.join = sinon.spy((room) => {
      this.rooms.add(room);
    });
    this.leave = sinon.spy((room) => {
      this.rooms.delete(room);
    });
    this.emit = sinon.spy((event, ...args) => {
      // console.log(`[MockSocket DEBUG ${this.id}] Emitting event: ${event} with data:`, ...args); // Too verbose for now
    });
    this.broadcast = {
      to: sinon.stub().returns({
        emit: sinon.spy((event, ...args) => {
          // Intentionally no console.log here for broadcasts to keep test output clean
        })
      })
    };
    this._handlers = {};
  }

  on(eventName, handler) {
    // Intentionally no console.log here for event registration to keep test output clean
    if (!this._handlers[eventName]) {
      this._handlers[eventName] = [];
    }
    this._handlers[eventName].push(handler);
  }

  async _simulateClientEmit(eventName, data, ackCallback) {
    // Intentionally no console.log here for simulateClientEmit to keep test output clean
    const eventHandlers = this._handlers[eventName]; // Use the received eventName as key
    if (eventHandlers && eventHandlers.length > 0) {
        for (const h of eventHandlers) {
            await h(data, ackCallback);
        }
    } else {
      // This case might be interesting to log if it happens unexpectedly,
      // but for now, keeping output clean.
      // console.log(`[MockSocket Sim DEBUG ${this.id}] No handlers for event: '${eventName}'`);
    }
  }

  getLastEmit(eventName) {
      const calls = this.emit.getCalls().filter(call => call.args[0] === eventName);
      return calls.pop();
  }
}

let mockIoInstance;
let stubbedLogger;

const setupMockIo = () => {
  mockIoInstance = {
    sockets: new Map(),
    _roomSpies: {}, // Cache for spies per room
    to: sinon.stub().callsFake((roomOrSocketId) => {
      if (!mockIoInstance._roomSpies[roomOrSocketId]) {
        const emitSpy = sinon.spy((event, ...args) => {
          // Actual emit to mock clients connected to this room
          const targetSockets = [];
          for (const socket of mockIoInstance.sockets.values()) {
            if (socket.rooms.has(roomOrSocketId) || socket.id === roomOrSocketId) {
              targetSockets.push(socket);
            }
          }
          targetSockets.forEach(s => s.emit(event, ...args));
        });
        mockIoInstance._roomSpies[roomOrSocketId] = emitSpy;
      }
      const existingSpy = mockIoInstance._roomSpies[roomOrSocketId];
      return { emit: existingSpy, _spy: existingSpy }; // Return the cached spy and its reference for getRoomBroadcasts
    }),
    emit: sinon.spy((event, ...args) => {
         // console.log(`[mockIoInstance DEBUG] Emitting globally, event: ${event}, data:`, ...args); // Too verbose
    }),
    _addSocket: (socket) => {
      mockIoInstance.sockets.set(socket.id, socket);
    },
    on: sinon.spy(),
    getRoomBroadcasts: (roomId, eventName) => {
        const roomEmitSpy = mockIoInstance.to(roomId)._spy; // This will now get the cached spy via .to()
        return roomEmitSpy ? roomEmitSpy.getCalls().filter(call => call.args[0] === eventName) : [];
    }
  };
};

// TODO: Unskip these tests. Tests are failing.
// Current Hypothesis (Turn 58): The primary issue seems to be with how `esmock`
// loads `lobbyHandlers.js` and how its event handlers are registered or invoked
// by the `MockSocket._simulateClientEmit` in the test.
// Despite `esmock` resolving module paths, temporary logs added to `lobbyHandlers.js`
// did not appear in test output, suggesting the instrumented handler logic might not
// be running as expected. This prevents proper testing of `ACTION_JOIN_LOBBY`.
// Further debugging should focus on:
// 1. Verifying that `registerLobbyHandlers` (from the esmocked module) correctly
//    attaches its internal handlers to the `MockSocket` instances.
// 2. Ensuring `_simulateClientEmit` correctly invokes these esmocked handlers.
// 3. Using a very basic logger mock (e.g., direct console.log) with esmock to
//    guarantee log visibility during debugging.
// The `ACTION_JOIN_LOBBY` handler itself in `lobbyHandlers.js` was refactored
// (Turn 50) for `ack(); return;` discipline and game auto-start logic.
describe('Lobby and Game Start Integration Tests', () => {
  let clients = [];
  let registerLobbyHandlers_esmocked;
  let esmocked_handlePlayerDisconnect;
  let esmocked_handleRejoinGame;

  beforeEach(async () => {
    sinon.restore();
    mockGameRepository.clearStore();
    mockGameRepository.getGame.resetHistory();
    mockGameRepository.updateGame.resetHistory();
    mockGameRepository.createGame.resetHistory();
    setupMockIo();

    // Reverted stubbedLogger to use sinon.stub() for cleaner test output
    stubbedLogger = {
        info: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        warn: sinon.stub(),
        fatal: sinon.stub(),
        child: sinon.stub().returnsThis(), // Ensure child returns the stubbed logger for chained calls
    };

    const commonMocks = {
      [loggerModulePath]: { default: stubbedLogger },
      [gameRepositoryModulePath]: { gameRepository: mockGameRepository },
    };

    const lobbyHandlersModule = await esmock(lobbyHandlersModulePath, {}, commonMocks);
    registerLobbyHandlers_esmocked = lobbyHandlersModule.registerLobbyHandlers;

    const playerConnectionHandlersModule = await esmock(playerConnectionHandlersModulePath, {}, commonMocks);
    esmocked_handlePlayerDisconnect = playerConnectionHandlersModule.handlePlayerDisconnect;
    esmocked_handleRejoinGame = playerConnectionHandlersModule.handleRejoinGame;

    clients = [];
    for (let i = 0; i < 4; i++) {
      const clientSocket = new MockSocket(`clientSocketId-${i+1}`, { id: `mockUser${i+1}` });
      mockIoInstance._addSocket(clientSocket);

      registerLobbyHandlers_esmocked(clientSocket, mockIoInstance);

      // Corrected from RECONNECT_ATTEMPT to RECONNECT
      clientSocket.on(GAME_EVENTS.RECONNECT, async (data, ack) => {
          await esmocked_handleRejoinGame(clientSocket, mockIoInstance, data.gameId, data.playerId, ack);
      });
      clients.push(clientSocket);
    }
  });

  afterEach(() => {
    sinon.restore();
    mockGameRepository.clearStore();
    esmock.purge(lobbyHandlersModulePath);
    esmock.purge(playerConnectionHandlersModulePath);
  });

  it('Test Case: Successful 4-Player Game Start and Entry into Bidding', async () => {
    let assignedGameId;

    let client1 = clients[0];
    let client1Ack = sinon.spy();
    // Removed console.log
    await client1._simulateClientEmit(GAME_EVENTS.JOIN_GAME, { gameIdToJoin: null, playerName: 'Player 1' }, client1Ack);

    expect(client1Ack).to.have.been.calledOnce;
    const ackArgs1 = client1Ack.getCall(0).args[1];
    if (!ackArgs1) {
        // Retain this error log as it's crucial for test failure diagnosis
        console.log('Ack call args for client1Ack:', client1Ack.getCall(0).args);
        throw new Error(`ackArgs1 is undefined. Ack was likely called with error: ${JSON.stringify(client1Ack.getCall(0).args[0])}`);
    }
    expect(ackArgs1.status).to.equal('ok');
    assignedGameId = ackArgs1.gameId;
    expect(assignedGameId).to.be.a('string');
    client1.gameId = assignedGameId;
    client1.playerRole = ackArgs1.role;

    let gameState = await mockGameRepository.getGame(assignedGameId);
    expect(gameState).to.not.be.null;
    expect(gameState.players[client1.playerRole].name).to.equal('Player 1');
    expect(gameState.players[client1.playerRole].socketId).to.equal(client1.id);

    for (let i = 1; i < 4; i++) {
      let client = clients[i];
      let clientAck = sinon.spy();
      // Removed console.log
      await client._simulateClientEmit(GAME_EVENTS.JOIN_GAME, { gameIdToJoin: assignedGameId, playerName: `Player ${i+1}` }, clientAck);

      expect(clientAck).to.have.been.calledOnce;
      const ackArgsClient = clientAck.getCall(0).args[1];
      if (!ackArgsClient) throw new Error(`ackArgsClient is undefined for Player ${i+1}. Ack error: ${JSON.stringify(clientAck.getCall(0).args[0])}`);
      expect(ackArgsClient.status).to.equal('ok');
      client.gameId = assignedGameId;
      client.playerRole = ackArgsClient.role;

      const clientAssignRoleEmit = client.getLastEmit(GAME_EVENTS.ASSIGN_ROLE);
      expect(clientAssignRoleEmit, `ASSIGN_ROLE not emitted for client ${i+1}`).to.exist;
      // Removed console.log
      expect(clientAssignRoleEmit.args[1]).to.deep.include({
        gameId: assignedGameId,
        role: PLAYER_ROLES[i],
      });
    }

    gameState = await mockGameRepository.getGame(assignedGameId);
    expect(Object.keys(gameState.players).filter(p => gameState.players[p].isActive).length).to.equal(4);
    expect(gameState.gamePhase).to.equal(GAME_PHASES.ORDER_UP_ROUND1);

    const handStartDate = new Date().toISOString();
    const dateStub = sinon.stub(Date.prototype, 'toISOString').returns(handStartDate);

    let biddingReadyGameState = gameState;

    dateStub.restore();

    expect(biddingReadyGameState.turnCard).to.be.an('object').with.keys('suit', 'value', 'id', 'name');
    expect(biddingReadyGameState.kitty.length).to.equal(24 - 20 - 1);

    const dealer = biddingReadyGameState.dealer;
    const expectedActiveBidder = PLAYER_ROLES[(PLAYER_ROLES.indexOf(dealer) + 1) % 4];
    expect(biddingReadyGameState.currentPlayer).to.equal(expectedActiveBidder);

    for (let i = 0; i < 4; i++) {
      const playerRole = PLAYER_ROLES[i];
      expect(biddingReadyGameState.players[playerRole].hand.length).to.equal(5);
      expect(biddingReadyGameState.players[playerRole].name).to.equal(`Player ${i+1}`);
    }
    expect(biddingReadyGameState.trumpSuit).to.be.null;
    expect(biddingReadyGameState.makerTeam).to.be.null;

    const lastMessage = biddingReadyGameState.gameMessages[biddingReadyGameState.gameMessages.length -1];
    expect(lastMessage.text).to.include(`New hand started. Dealer is ${dealer}. ${biddingReadyGameState.turnCard.id} is up. ${expectedActiveBidder} to make the first bid`);

    const roomBroadcasts = mockIoInstance.getRoomBroadcasts(assignedGameId, GAME_EVENTS.STATE_UPDATE);
    expect(roomBroadcasts.length).to.be.greaterThan(0);
    // Corrected to access payload from args[1] as args[0] is the event name
    const finalGameStateBroadcast = roomBroadcasts.pop().args[1];
    expect(finalGameStateBroadcast.gamePhase).to.equal(GAME_PHASES.ORDER_UP_ROUND1);

    clients.forEach(client => {
      const clientStateUpdateCall = client.getLastEmit(GAME_EVENTS.STATE_UPDATE);
      expect(clientStateUpdateCall, `Client ${client.id} did not receive STATE_UPDATE`).to.exist;
      // Removed console.log
      const clientStateUpdate = clientStateUpdateCall.args[1]; // Corrected from args[0] to args[1]
      expect(clientStateUpdate.gamePhase).to.equal(GAME_PHASES.ORDER_UP_ROUND1);
      expect(clientStateUpdate.currentPlayer).to.equal(expectedActiveBidder);
      if(client.playerRole) expect(clientStateUpdate.players[client.playerRole].hand.length).to.equal(5);
      expect(clientStateUpdate.turnCard).to.deep.equal(biddingReadyGameState.turnCard);
    });
  });

  it('Test Case: Player Leaves Lobby Before Game Starts', async () => {
    let assignedGameId;
    let client1 = clients[0];
    let client2 = clients[1];
    let client3 = clients[2];

    let client1Ack = sinon.spy();
    await client1._simulateClientEmit(GAME_EVENTS.JOIN_GAME, { gameIdToJoin: null, playerName: 'Player 1' }, client1Ack);
    const ackArgs1 = client1Ack.getCall(0).args[1];
    if (!ackArgs1) throw new Error(`ackArgs1 is undefined for Player 1. Ack error: ${JSON.stringify(client1Ack.getCall(0).args[0])}`);
    assignedGameId = ackArgs1.gameId;
    client1.gameId = assignedGameId;
    client1.playerRole = ackArgs1.role;

    let client2Ack = sinon.spy();
    await client2._simulateClientEmit(GAME_EVENTS.JOIN_GAME, { gameIdToJoin: assignedGameId, playerName: 'Player 2' }, client2Ack);
    const ackArgs2 = client2Ack.getCall(0).args[1];
    if (!ackArgs2) throw new Error(`ackArgs2 is undefined for Player 2. Ack error: ${JSON.stringify(client2Ack.getCall(0).args[0])}`);
    client2.gameId = assignedGameId;
    client2.playerRole = ackArgs2.role;

    let client3Ack = sinon.spy();
    await client3._simulateClientEmit(GAME_EVENTS.JOIN_GAME, { gameIdToJoin: assignedGameId, playerName: 'Player 3' }, client3Ack);
    const ackArgs3 = client3Ack.getCall(0).args[1];
    if (!ackArgs3) throw new Error(`ackArgs3 is undefined for Player 3. Ack error: ${JSON.stringify(client3Ack.getCall(0).args[0])}`);
    client3.gameId = assignedGameId;
    client3.playerRole = ackArgs3.role;

    let gameState = await mockGameRepository.getGame(assignedGameId);
    expect(Object.keys(gameState.players).filter(p => gameState.players[p].isActive).length).to.equal(3);

    await esmocked_handlePlayerDisconnect(client3, mockIoInstance, assignedGameId);

    const updatedGameState = await mockGameRepository.getGame(assignedGameId);
    expect(updatedGameState.players[client3.playerRole].isConnected).to.be.false;
    expect(updatedGameState.players[client3.playerRole].socketId).to.be.null;

    // Removed console.log for repository state, test is passing
    // console.log(`[IntegrationTest DEBUG] State of disconnected player ${client3.playerRole} in repository:`, JSON.stringify(updatedGameState.players[client3.playerRole], null, 2));

    // Re-enable client emit checks for disconnect test
    [client1, client2].forEach(client => {
        const clientStateUpdateCall = client.getLastEmit(GAME_EVENTS.STATE_UPDATE);
        expect(clientStateUpdateCall, `Client ${client.id} did not receive STATE_UPDATE after disconnect`).to.exist;
        // Removed console.log
        const clientStateUpdate = clientStateUpdateCall.args[1]; // Corrected from args[0] to args[1]
        expect(clientStateUpdate.players[client3.playerRole].isConnected).to.be.false;
    });
  });

  it('Test Case: Attempt to Join Full Lobby/Game', async () => {
    let assignedGameId;
    for (let i = 0; i < 4; i++) {
        let clientAck = sinon.spy();
        // Removed console.log
        await clients[i]._simulateClientEmit(GAME_EVENTS.JOIN_GAME, { gameIdToJoin: assignedGameId, playerName: `Player ${i+1}` }, clientAck);

        const ackCall = clientAck.getCall(0);
        if (!ackCall) throw new Error(`ackSpy not called for Player ${i+1}`);

        if (i === 0 && !assignedGameId) {
            const ackArgsLoop1 = ackCall.args[1];
            if (!ackArgsLoop1) throw new Error(`ackArgsLoop1 is undefined for Player ${i+1}. Ack error: ${JSON.stringify(ackCall.args[0])}`);
            assignedGameId = ackArgsLoop1.gameId;
        }
        clients[i].gameId = assignedGameId;
        const ackArgsLoop = ackCall.args[1];
        if (!ackArgsLoop) throw new Error(`ackArgsLoop is undefined for Player ${i+1}. Ack error: ${JSON.stringify(ackCall.args[0])}`);
        clients[i].playerRole = ackArgsLoop.role;
    }

    let currentGameState = await mockGameRepository.getGame(assignedGameId);
    expect(currentGameState.gamePhase).to.equal(GAME_PHASES.ORDER_UP_ROUND1);
    expect(Object.keys(currentGameState.players).filter(p => currentGameState.players[p].isActive).length).to.equal(4);

    const client5 = new MockSocket('clientSocketId-5', {id: 'mockUser5'});
    registerLobbyHandlers_esmocked(client5, mockIoInstance);

    const client5Ack = sinon.spy();
    // Removed console.log
    await client5._simulateClientEmit(GAME_EVENTS.JOIN_GAME, { gameIdToJoin: assignedGameId, playerName: 'Player 5' }, client5Ack);

    expect(client5Ack).to.have.been.calledOnce;
    const ackArgs = client5Ack.getCall(0).args[0];
    expect(ackArgs).to.deep.equal({ status: 'error', message: `Game ${assignedGameId} is not in lobby phase.` });
  });
});
