//DO NOT PROCEED TO EDIT THIS until ALL OF LAYER 1 IS COMPLETE
import esmock from 'esmock';
import sinon from 'sinon';
import { TEAMS, GAME_PHASES, PLAYER_ROLES, SUITS } from '../../src/config/constants.js';
import { expect } from 'chai';

let resetFullGame, getGameState, updateGameState, createInitialGameState;

describe('Game State Management', () => {
  describe('resetFullGame()', () => {
    beforeEach(async () => {
      // Use esmock to get a fresh, isolated instance of the state module
      const stateModule = await esmock('../../src/game/state.js');
      resetFullGame = stateModule.resetFullGame;
      getGameState = stateModule.getGameState;
      updateGameState = stateModule.updateGameState;
      createInitialGameState = stateModule.createInitialGameState;
      resetFullGame();
    });

    it('should initialize gameId', () => {
      const gameState = getGameState();
      expect(gameState.gameId).to.be.a('string').and.not.empty;
    });

    it('should initialize gamePhase to LOBBY', () => {
      const gameState = getGameState();
      expect(gameState.gamePhase).to.equal(GAME_PHASES.LOBBY);
    });

    it('should initialize players using initializePlayers()', () => {
      const gameState = getGameState();
      expect(gameState.players).to.be.an('object');
      expect(Object.keys(gameState.players).length).to.equal(4); // Assuming 4 players
      // Further checks on player structure can be done here or rely on initializePlayers tests
      PLAYER_ROLES.forEach(role => {
        expect(gameState.players[role]).to.have.property('teamId');
      });
    });

    it('should initialize deck, kitty, and turnCard correctly', () => {
      const gameState = getGameState();
      expect(gameState.deck).to.be.an('array').that.is.empty; // Or depends on when deck is created
      expect(gameState.kitty).to.be.an('array').that.is.empty;
      expect(gameState.turnCard).to.be.null;
    });

    it('should initialize trumpSuit, dealer, and currentPlayer', () => {
      const gameState = getGameState();
      expect(gameState.trumpSuit).to.be.null;
      expect(gameState.dealer).to.equal(PLAYER_ROLES[0]); // Default dealer
      expect(gameState.currentPlayer).to.equal(PLAYER_ROLES[0]); // Default current player
    });

    it('should initialize tricksTaken with team IDs and zero counts', () => {
      const gameState = getGameState();
      expect(gameState.tricksTaken).to.deep.equal({
        [TEAMS.TEAM_NS]: 0, // Assuming TEAM_NS is one of the team IDs, e.g., 1
        [TEAMS.TEAM_EW]: 0  // Assuming TEAM_EW is the other, e.g., 2
      });
    });

    it('should initialize teamScores with team IDs and zero scores', () => {
      const gameState = getGameState();
      expect(gameState.teamScores).to.deep.equal({
        [TEAMS.TEAM_NS]: 0,
        [TEAMS.TEAM_EW]: 0
      });
    });

    it('should initialize other game properties to defaults', () => {
      const gameState = getGameState();
      expect(gameState.roundNumber).to.equal(1);
      expect(gameState.playerWhoOrderedUp).to.be.null;
      expect(gameState.playerWhoCalledTrump).to.be.null;
      expect(gameState.makerTeam).to.be.null;
      expect(gameState.goingAlone).to.be.false;
      expect(gameState.playerGoingAlone).to.be.null;
      expect(gameState.partnerSittingOut).to.be.null;
      expect(gameState.currentTrick).to.be.an('array').that.is.empty;
      expect(gameState.leadSuit).to.be.null;
      expect(gameState.gameMessages).to.be.an('array').that.is.empty;
      expect(gameState.lastUpdated).to.be.a('number');
    });
  });
});

async function getUninitializedStateModule() {
  // Use esmock to get a fresh, isolated instance of the state module
  // and mock its logger dependency.
  const mockLogger = {
    warn: () => {},
    error: () => {},
    info: () => {},
  };
  const stateModule = await esmock('../../src/game/state.js', {
    '../../src/utils/logger.js': mockLogger,
  });
  // Do NOT call resetFullGame, so state is uninitialized
  return stateModule;
}

describe('getGameState()', () => {
  let stateModule;
  let mockLogger;

  beforeEach(async () => {
    // Mock the logger for testing warnings/errors
    mockLogger = {
      warn: () => {},
      error: () => {},
      info: () => {},
    };

    stateModule = await esmock('../../src/game/state.js', {
      '../../src/utils/logger.js': mockLogger,
    });

    stateModule.resetFullGame();
  });

  it('should return a deep copy of the current game state', () => {
    const initialGameState = stateModule.getGameState();
    expect(initialGameState).to.be.an('object');
    expect(initialGameState.gamePhase).to.equal(GAME_PHASES.LOBBY);

    // Modify the returned copy and ensure the original internal state is unchanged
    initialGameState.gamePhase = GAME_PHASES.PLAYING;
    const currentGameState = stateModule.getGameState();
    expect(currentGameState.gamePhase).to.equal(GAME_PHASES.LOBBY);
  });

  it('should return an empty object and log a warning if state is not initialized', async () => {
    // Spy on warn before loading the module
    const warnSpy = sinon.spy();
    const logger = {
      warn: warnSpy,
      error: () => {},
      info: () => {},
    };
    const uninitializedStateModule = await esmock('../../src/game/state.js', {
      '../../src/utils/logger.js': logger,
    });

    const gameState = uninitializedStateModule.getGameState();

    expect(gameState).to.deep.equal({});
    expect(warnSpy.calledOnce).to.be.true;
    expect(warnSpy.calledWith('getGameState called before state was initialized. Returning empty object.')).to.be.true;
  });
});

describe('updateGameState()', () => {
  let stateModule;
  let mockLogger;

  beforeEach(async () => {
    mockLogger = {
      warn: () => {},
      error: () => {},
      info: () => {},
    };

    stateModule = await esmock('../../src/game/state.js', {
      '../../src/utils/logger.js': mockLogger,
    });

    stateModule.resetFullGame();
  });

  it('should update the game state with the new partial state returned by the updater', () => {
    // Use a valid phase from GAME_PHASES
    const newPhase = GAME_PHASES.ORDER_UP_ROUND1;
    const updatedState = stateModule.updateGameState((currentState) => {
      return { ...currentState, gamePhase: newPhase };
    });

    expect(updatedState.gamePhase).to.equal(newPhase);
    expect(stateModule.getGameState().gamePhase).to.equal(newPhase);
  });

  it('should return a deep copy of the updated state', () => {
    const updatedState = stateModule.updateGameState((currentState) => {
      return { ...currentState, roundNumber: 2 };
    });

    updatedState.roundNumber = 99; // Modify the returned copy
    expect(stateModule.getGameState().roundNumber).to.equal(2); // Original internal state should be unchanged
  });

  it('should throw an error and log if state is not initialized', async () => {
    // Spy on error before loading the module
    const errorSpy = sinon.spy();
    const logger = {
      warn: () => {},
      error: errorSpy,
      info: () => {},
    };
    const uninitializedStateModule = await esmock('../../src/game/state.js', {
      '../../src/utils/logger.js': logger,
    });
    expect(() => uninitializedStateModule.updateGameState(() => ({}))).to.throw('Game state is not initialized. Call resetFullGame() first.');
    expect(errorSpy.calledOnce).to.be.true;
    expect(errorSpy.calledWith('updateGameState called before state was initialized. Call resetFullGame() first.')).to.be.true;
  });

  it('should throw an error and log if updater is not a function', async () => {
    // Attach spy to the logger instance injected into the module
    const errorSpy = sinon.spy();
    const logger = {
      warn: () => {},
      error: errorSpy,
      info: () => {},
    };
    const stateModuleWithLogger = await esmock('../../src/game/state.js', {
      '../../src/utils/logger.js': logger,
    });
    stateModuleWithLogger.resetFullGame();
    expect(() => stateModuleWithLogger.updateGameState('not a function')).to.throw('Updater must be a function.');
    expect(errorSpy.calledOnce).to.be.true;
    expect(errorSpy.calledWith('updateGameState: updater must be a function.')).to.be.true;
  });

  it('should throw an error and log if updater does not return an object', async () => {
    // Attach spy to the logger instance injected into the module
    const errorSpy = sinon.spy();
    const logger = {
      warn: () => {},
      error: errorSpy,
      info: () => {},
    };
    const stateModuleWithLogger = await esmock('../../src/game/state.js', {
      '../../src/utils/logger.js': logger,
    });
    stateModuleWithLogger.resetFullGame();
    expect(() => stateModuleWithLogger.updateGameState(() => null)).to.throw('Updater function must return a valid new state object.');
    expect(errorSpy.calledOnce).to.be.true;
    expect(errorSpy.calledWith('updateGameState: updater function did not return a valid object.')).to.be.true;
  });

  it('should update lastUpdated timestamp', () => {
    const initialLastUpdated = stateModule.getGameState().lastUpdated;
    // Wait a bit to ensure timestamp changes
    return new Promise(resolve => setTimeout(resolve, 10)).then(() => {
      const updatedState = stateModule.updateGameState((currentState) => ({ ...currentState, gamePhase: GAME_PHASES.PLAYING }));
      expect(updatedState.lastUpdated).to.be.above(initialLastUpdated);
    });
  });

  it('should throw an error if the updater function creates a circular reference', async () => {
    // Setup: Create a state with a circular reference to force JSON.stringify to fail.
    const circularRef = {};
    circularRef.myself = circularRef;

    // Create a logger with a spy specifically for this test
    const errorSpy = sinon.spy();
    const loggerWithSpy = {
      error: errorSpy,
      warn: () => {},
      info: () => {},
    };

    // Load a fresh instance of the state module with the spied logger
    const stateModuleWithSpy = await esmock('../../src/game/state.js', {
      '../../src/utils/logger.js': loggerWithSpy,
    });
    stateModuleWithSpy.resetFullGame();

    let thrownError;
    try {
      // This update will introduce a circular reference, which should cause deepClone to fail.
      stateModuleWithSpy.updateGameState(state => {
        state.circular = circularRef;
        return state;
      });
    } catch (e) {
      thrownError = e;
    }
    expect(thrownError).to.be.an('error').with.property('message').that.includes('Failed to deep clone object');
    expect(errorSpy.called).to.be.true;
  });
});

describe('createInitialGameState()', () => {
  let stateModule;
  beforeEach(async () => {
    stateModule = await esmock('../../src/game/state.js');
  });

  it('should create a new game state object with default values', () => {
    const initialState = stateModule.createInitialGameState();

    expect(initialState).to.be.an('object');
    expect(initialState.gameId).to.be.a('string').and.not.empty;
    expect(initialState.gamePhase).to.equal(GAME_PHASES.LOBBY);
    expect(initialState.players).to.be.an('object');
    expect(Object.keys(initialState.players).length).to.equal(4);
    expect(initialState.deck).to.be.an('array').that.is.empty;
    expect(initialState.kitty).to.be.an('array').that.is.empty;
    expect(initialState.turnCard).to.be.null;
    expect(initialState.trumpSuit).to.be.null;
    expect(initialState.dealer).to.equal(PLAYER_ROLES[0]);
    expect(initialState.currentPlayer).to.equal(PLAYER_ROLES[1]); // Left of dealer
    expect(initialState.orderUpTurn).to.be.null;
    expect(initialState.bids).to.be.an('array').that.is.empty;
    expect(initialState.roundNumber).to.equal(1);
    expect(initialState.playerWhoOrderedUp).to.be.null;
    expect(initialState.playerWhoCalledTrump).to.be.null;
    expect(initialState.makerTeam).to.be.null;
    expect(initialState.goingAlone).to.be.false;
    expect(initialState.playerGoingAlone).to.be.null;
    expect(initialState.partnerSittingOut).to.be.null;
    expect(initialState.currentTrick).to.be.an('array').that.is.empty;
    expect(initialState.leadSuit).to.be.null;
    expect(initialState.tricksTaken).to.deep.equal({ [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 });
    expect(initialState.teamScores).to.deep.equal({ [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 });
    expect(initialState.gameMessages).to.be.an('array').that.is.empty;
    // expect(initialState.lastUpdated).to.be.a('number'); // This is commented out in the source
    expect(initialState.hostId).to.be.null;
    expect(initialState.settings).to.deep.equal({ winningScore: 10 });
  });

  it('should use the provided gameId if available', () => {
    const customGameId = 'my-custom-game-id';
    const initialState = stateModule.createInitialGameState(customGameId);
    expect(initialState.gameId).to.equal(customGameId);
  });
});
