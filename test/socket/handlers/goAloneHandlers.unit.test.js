// filepath: test/socket/handlers/goAloneHandlers.unit.test.js
import logger from '../../../src/utils/logger.js';
import { handleGoAloneDecision } from '../../../src/game/phases/goAlonePhase.js';
import { getRoleBySocketId } from '../../../src/utils/players.js';
import { gameRepository } from '../../../src/db/gameRepository.js'; // CORRECTED IMPORT
import { GAME_EVENTS } from '../../../src/config/constants.js';
import esmock from 'esmock';
import sinon from 'sinon';
import { expect } from 'chai';

// Mock paths for esmock using relative paths
const goAloneHandlersModulePath = '../../../src/socket/handlers/goAloneHandlers.js';
const goAlonePhaseModulePath = '../../../src/game/phases/goAlonePhase.js';
const playersModulePath = '../../../src/utils/players.js';
const loggerModulePath = '../../../src/utils/logger.js';
const gameRepositoryModulePath = '../../../src/db/gameRepository.js';

describe('Go Alone Socket Handlers', () => {
  let mockSocket, mockIo, mockGameRepository, handleGoAloneDecisionStub, getRoleBySocketIdStub, stubbedLogger;

  beforeEach(async () => {
    // Reset stubs and spies
    handleGoAloneDecisionStub = sinon.stub();
    getRoleBySocketIdStub = sinon.stub().returns('player1');
    stubbedLogger = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
    };
    mockGameRepository = {
      getGame: sinon.stub(),
      updateGame: sinon.stub(),
    };

    mockSocket = {
      id: 'socket123',
      emit: sinon.spy(),
      on: sinon.spy(),
    };
    mockIo = {
      to: sinon.stub().returns({ emit: sinon.spy() }),
    };

    // Use esmock to load the handler with mocked dependencies
    const { registerGoAloneHandlers } = await esmock(goAloneHandlersModulePath, {
      [loggerModulePath]: { default: stubbedLogger },
      [goAlonePhaseModulePath]: { handleGoAloneDecision: handleGoAloneDecisionStub },
      [playersModulePath]: { getRoleBySocketId: getRoleBySocketIdStub },
      [gameRepositoryModulePath]: { gameRepository: mockGameRepository }, // CORRECTED MOCK
    });

    registerGoAloneHandlers(mockSocket, mockIo);
  });

  afterEach(() => {
    sinon.restore();
    esmock.purge(goAloneHandlersModulePath);
  });

  const getHandler = () => {
    const call = mockSocket.on.getCalls().find(c => c.args[0] === GAME_EVENTS.ACTION_GO_ALONE_DECISION);
    if (!call) throw new Error('Handler not registered');
    return call.args[1];
  };

  it('should process go_alone_decision, save state, and broadcast if successful', async () => {
    const handler = getHandler();
    const mockGameState = { gameId: 'game1' };
    const mockUpdatedState = { gameId: 'game1', gamePhase: 'PLAYING' };
    mockGameRepository.getGame.resolves(mockGameState); // CORRECTED USAGE
    handleGoAloneDecisionStub.returns({ success: true, updatedGameState: mockUpdatedState, message: 'Success' });

    await handler({ gameId: 'game1', decision: true });

    expect(mockGameRepository.getGame).to.have.been.calledWith('game1'); // CORRECTED USAGE
    expect(handleGoAloneDecisionStub).to.have.been.calledWith(mockGameState, 'player1', true);
    expect(mockGameRepository.updateGame).to.have.been.calledWith('game1', mockUpdatedState); // CORRECTED USAGE
    expect(mockIo.to('game1').emit).to.have.been.calledWith(GAME_EVENTS.GAME_STATE_UPDATE, mockUpdatedState);
  });

  it('should emit error to player if handleGoAloneDecision returns success=false', async () => {
    const handler = getHandler();
    const mockGameState = { gameId: 'game1' };
    mockGameRepository.getGame.resolves(mockGameState); // CORRECTED USAGE
    handleGoAloneDecisionStub.returns({ success: false, message: 'Not your turn' });

    await handler({ gameId: 'game1', decision: true });

    expect(mockSocket.emit).to.have.been.calledWith(GAME_EVENTS.ACTION_ERROR, {
      message: 'Not your turn',
      event: GAME_EVENTS.ACTION_GO_ALONE_DECISION,
    });
    expect(mockGameRepository.updateGame).to.not.have.been.called; // CORRECTED USAGE
  });
});