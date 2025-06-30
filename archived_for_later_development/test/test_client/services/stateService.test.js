// File located at test/client/services/stateService.test.js
import * as chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { StateService } from '../../../src/client/services/stateService.js'; // Use named import for the class

chai.use(sinonChai);
const expect = chai.expect;

describe('StateService', () => {
  let stateService;

  beforeEach(() => {
    stateService = new StateService();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Constructor and Initial State', () => {
    it('should initialize with default values', () => {
      expect(stateService.getPlayerId()).to.be.null;
      expect(stateService.getGameId()).to.be.null;
      expect(stateService.getPlayerRole()).to.be.null;
      expect(stateService.isHost).to.be.false;
      expect(stateService.players).to.deep.equal([]);
      expect(stateService.gameState).to.deep.equal({
        players: {},
        turnCard: null,
        currentTrick: [],
        teamScores: {},
        message: '',
      });
    });
  });

  describe('Player ID Management', () => {
    it('should set and get playerId', () => {
      const testPlayerId = 'player123';
      stateService.setPlayerId(testPlayerId);
      expect(stateService.getPlayerId()).to.equal(testPlayerId);
    });
  });

  describe('Game ID and Details Management', () => {
    it('should set and get gameId via setGameDetails', () => {
      const testGameId = 'game456';
      stateService.setGameDetails({ gameId: testGameId, isHost: true });
      expect(stateService.getGameId()).to.equal(testGameId);
      expect(stateService.isHost).to.be.true;
    });

    it('setGameDetails should handle null gameId', () => {
      stateService.setGameDetails({ gameId: null, isHost: false });
      expect(stateService.getGameId()).to.be.null;
      expect(stateService.isHost).to.be.false;
    });
  });

  describe('Player Role Management', () => {
    it('should set and get playerRole', () => {
      const testPlayerRole = 'north';
      stateService.setPlayerRole(testPlayerRole);
      expect(stateService.getPlayerRole()).to.equal(testPlayerRole);
    });
  });

  describe('hasReconnectInfo', () => {
    it('should return true if playerId and gameId are set', () => {
      stateService.setPlayerId('p1');
      stateService.setGameDetails({ gameId: 'g1', isHost: false });
      expect(stateService.hasReconnectInfo()).to.be.true;
    });

    it('should return false if playerId is not set', () => {
      stateService.setGameDetails({ gameId: 'g1', isHost: false });
      expect(stateService.hasReconnectInfo()).to.be.false;
    });

    it('should return false if gameId is not set', () => {
      stateService.setPlayerId('p1');
      expect(stateService.hasReconnectInfo()).to.be.false;
    });

    it('should return false if neither playerId nor gameId is set', () => {
      expect(stateService.hasReconnectInfo()).to.be.false;
    });
  });

  describe('Game State Management', () => {
    it('should update full game state and notify subscribers', () => {
      const initialState = { phase: 'BIDDING', turn: 'player1' };
      const newState = { phase: 'PLAYING', turn: 'player2', turnCard: { suit: 'HEARTS', rank: 'A' } };
      stateService.gameState = initialState;

      const subscriberCallback = sinon.spy();
      stateService.subscribe(subscriberCallback);

      stateService.updateFullGameState(newState);

      expect(stateService.gameState).to.deep.equal(newState);
      expect(subscriberCallback).to.have.been.calledOnceWith(newState);
    });

    it('should update players list when full game state is updated with players', () => {
        const newState = {
            players: {
                north: { id: 'north', hand: [], isConnected: true },
                south: { id: 'south', hand: [], isConnected: true }
            },
        };
        stateService.updateFullGameState(newState);
        expect(stateService.players).to.be.an('array').with.lengthOf(2);
        expect(stateService.players.find(p => p.id === 'north')).to.exist;
    });


    it('getLatestGameMessage should return message from gameState', () => {
        stateService.gameState.message = 'Test message';
        expect(stateService.getLatestGameMessage()).to.equal('Test message');
    });

    it('getPlayerHand should return hand for the current playerRole', () => {
        stateService.setPlayerRole('north');
        stateService.gameState.players = {
            north: { hand: [{id: 'AH'}, {id: 'KH'}] },
            south: { hand: [{id: 'AS'}, {id: 'KS'}] }
        };
        expect(stateService.getPlayerHand()).to.deep.equal([{id: 'AH'}, {id: 'KH'}]);
    });

    it('getPlayerHand should return null if playerRole is not set', () => {
        stateService.gameState.players = { // Ensure players object exists
            north: { hand: [{id: 'AH'}, {id: 'KH'}] }
        };
        expect(stateService.getPlayerHand()).to.be.null;
    });

    it('getPlayerHand should return null if player data not found for role', () => {
        stateService.setPlayerRole('east'); // Role 'east'
        stateService.gameState.players = { // But 'east' is not in players object
            north: { id: 'north', hand: [{id: 'AH'}] }
        };
        expect(stateService.getPlayerHand()).to.be.null;
    });

    it('getPlayerHand should return empty array if player exists but their hand is undefined/null', () => {
        stateService.setPlayerRole('east');
        stateService.gameState.players = {
            east: { name: 'East Player' /* hand is undefined/null */ },
            north: { id: 'north', hand: [{id: 'AH'}] }
        };
        expect(stateService.getPlayerHand()).to.deep.equal([]);
    });


    it('getTurnCard should return turnCard from gameState', () => {
        const turnCard = { suit: 'SPADES', rank: 'J' };
        stateService.gameState.turnCard = turnCard;
        expect(stateService.getTurnCard()).to.deep.equal(turnCard);
    });

    it('getCurrentTrick should return currentTrick from gameState', () => {
        const trick = [{ card: { suit: 'CLUBS', rank: 'A'}, playedBy: 'north' }];
        stateService.gameState.currentTrick = trick;
        expect(stateService.getCurrentTrick()).to.deep.equal(trick);
    });

    it('getCurrentTrick should return empty array if currentTrick is undefined', () => {
        stateService.gameState.currentTrick = undefined;
        expect(stateService.getCurrentTrick()).to.deep.equal([]);
    });

    it('getTeamScores should return teamScores from gameState', () => {
        const scores = { 'NS': 5, 'EW': 2 };
        stateService.gameState.teamScores = scores;
        expect(stateService.getTeamScores()).to.deep.equal(scores);
    });
  });

  describe('Subscription Mechanism', () => {
    it('should add a callback to subscriptions and return an unsubscribe function', () => {
      const callback = sinon.spy();
      expect(stateService.subscriptions).to.be.an('array').that.is.empty;

      const unsubscribe = stateService.subscribe(callback);
      expect(stateService.subscriptions).to.include(callback);
      expect(stateService.subscriptions.length).to.equal(1);

      unsubscribe();
      expect(stateService.subscriptions).to.be.an('array').that.is.empty;
    });

    it('should not add non-function callbacks to subscriptions and return a no-op unsubscribe', () => {
      const nonFunctionCallback = 'not a function';
      const consoleErrorStub = sinon.stub(console, 'error');
      const unsubscribe = stateService.subscribe(nonFunctionCallback);
      expect(stateService.subscriptions).to.not.include(nonFunctionCallback);
      expect(unsubscribe).to.be.a('function');
      expect(unsubscribe).to.not.throw();
      expect(consoleErrorStub).to.have.been.calledOnceWith('[Conceptual StateService] Attempted to subscribe with non-function:', 'not a function');
      consoleErrorStub.restore();
    });

    it('should notify multiple subscribers', () => {
      const callback1 = sinon.spy();
      const callback2 = sinon.spy();
      stateService.subscribe(callback1);
      stateService.subscribe(callback2);

      const newState = { message: 'Notify all' };
      stateService.updateFullGameState(newState);

      expect(callback1).to.have.been.calledOnceWith(newState);
      expect(callback2).to.have.been.calledOnceWith(newState);
    });

    it('should handle errors in subscriber callbacks gracefully', () => {
      const faultyCallback = sinon.stub().throws(new Error('Faulty subscriber'));
      const healthyCallback = sinon.spy();
      const consoleErrorStub = sinon.stub(console, 'error');

      stateService.subscribe(faultyCallback);
      stateService.subscribe(healthyCallback);

      const newState = { message: 'Testing fault tolerance' };
      stateService.updateFullGameState(newState);

      expect(faultyCallback).to.have.been.calledOnceWith(newState);
      expect(healthyCallback).to.have.been.calledOnceWith(newState);
      expect(consoleErrorStub).to.have.been.calledWith('[Conceptual StateService] Error in subscription callback:', sinon.match.instanceOf(Error));

      consoleErrorStub.restore();
    });
  });
});
