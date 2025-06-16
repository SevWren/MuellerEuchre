import { resetFullGame, getGameState } from '../../src/game/state.js';
import { TEAMS, GAME_PHASES, PLAYER_ROLES } from '../../src/config/constants.js';
import { expect } from 'chai';

describe('Game State Management', () => {
  describe('resetFullGame()', () => {
    beforeEach(() => {
      // Ensure a fresh state before each test that relies on resetFullGame's direct output
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
