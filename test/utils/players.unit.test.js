import { initializePlayers, getPlayerTeam } from '../../src/utils/players.js';
import { TEAMS, PLAYER_ROLES } from '../../src/config/constants.js';
import { expect } from 'chai'; // Assuming chai is used, common in JS projects

describe('Player Utilities', () => {
  describe('initializePlayers()', () => {
    const players = initializePlayers();

    it('should initialize four players', () => {
      expect(Object.keys(players).length).to.equal(4);
    });

    it('should assign correct roles to players', () => {
      PLAYER_ROLES.forEach(role => {
        expect(players[role]).to.exist;
        expect(players[role].name).to.equal(role.charAt(0).toUpperCase() + role.slice(1));
      });
    });

    it('should assign teamId to players correctly (TEAM_NS: south, north; TEAM_EW: west, east)', () => {
      // PLAYER_ROLES = ['south', 'west', 'north', 'east']
      // South & North are TEAM_NS (index 0, 2)
      // West & East are TEAM_EW (index 1, 3)
      expect(players[PLAYER_ROLES[0]].teamId).to.equal(TEAMS.TEAM_NS, `${PLAYER_ROLES[0]} should be TEAM_NS`); // south
      expect(players[PLAYER_ROLES[1]].teamId).to.equal(TEAMS.TEAM_EW, `${PLAYER_ROLES[1]} should be TEAM_EW`); // west
      expect(players[PLAYER_ROLES[2]].teamId).to.equal(TEAMS.TEAM_NS, `${PLAYER_ROLES[2]} should be TEAM_NS`); // north
      expect(players[PLAYER_ROLES[3]].teamId).to.equal(TEAMS.TEAM_EW, `${PLAYER_ROLES[3]} should be TEAM_EW`); // east
    });

    it('should initialize player hands as empty arrays', () => {
      PLAYER_ROLES.forEach(role => {
        expect(players[role].hand).to.be.an('array').that.is.empty;
      });
    });

    it('should initialize other player properties', () => {
      PLAYER_ROLES.forEach(role => {
        expect(players[role].socketId).to.be.null;
        expect(players[role].score).to.equal(0); // This score might be team score, consider if it's still needed per player
        expect(players[role].isConnected).to.be.false;
        expect(players[role].tricksWonThisHand).to.equal(0);
      });
    });
  });

  describe('getPlayerTeam()', () => {
    it('should return the correct teamId for a player object', () => {
      const playerNS = { name: 'TestPlayerNS', teamId: TEAMS.TEAM_NS };
      const playerEW = { name: 'TestPlayerEW', teamId: TEAMS.TEAM_EW };
      expect(getPlayerTeam(playerNS)).to.equal(TEAMS.TEAM_NS);
      expect(getPlayerTeam(playerEW)).to.equal(TEAMS.TEAM_EW);
    });

    it('should return undefined if player object is invalid', () => {
      expect(getPlayerTeam(null)).to.be.undefined;
      expect(getPlayerTeam(undefined)).to.be.undefined;
      expect(getPlayerTeam({})).to.be.undefined; // No teamId property
    });

    it('should return undefined if player.teamId is not present', () => {
      const playerWithoutTeamId = { name: 'TestPlayerNoTeam' };
      expect(getPlayerTeam(playerWithoutTeamId)).to.be.undefined;
    });
  });
});
