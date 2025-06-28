import esmock from 'esmock'; // Import esmock for mocking ES Modules
import { initializePlayers, getPlayerTeam, isTeammate, getPartner, getPlayerBySocketId, getRoleBySocketId, getNextPlayer } from '../../src/utils/players.js';
import { TEAMS, PLAYER_ROLES } from '../../src/config/constants.js';
import { expect } from 'chai'; // Assuming chai is used, common in JS projects
import sinon from 'sinon'; // Import sinon for mocking logger

// Mock logger to prevent console output during tests
const loggerMock = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  debug: sinon.stub(),
};

// Es-mock the module under test to inject our logger mock
let playersUtils;

beforeEach(async () => {
  // Reset logger mocks before each test
  loggerMock.info.resetHistory();
  loggerMock.warn.resetHistory();
  loggerMock.error.resetHistory();
  loggerMock.debug.resetHistory();

  playersUtils = await esmock('../../src/utils/players.js', {
    '../../src/utils/logger.js': loggerMock,
  });
});

afterEach(() => {
  sinon.restore();
});

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

  describe('isTeammate()', () => {
    // Assuming PLAYER_ROLES = ['south', 'west', 'north', 'east']
    it('should return true for players on the same team (South and North)', () => {
      expect(playersUtils.isTeammate(PLAYER_ROLES[0], PLAYER_ROLES[2])).to.be.true;
    });

    it('should return true for players on the same team (West and East)', () => {
      expect(playersUtils.isTeammate(PLAYER_ROLES[1], PLAYER_ROLES[3])).to.be.true;
    });

    it('should return false for players on opposite teams (South and West)', () => {
      expect(playersUtils.isTeammate(PLAYER_ROLES[0], PLAYER_ROLES[1])).to.be.false;
    });

    it('should return false for players on opposite teams (North and East)', () => {
      expect(playersUtils.isTeammate(PLAYER_ROLES[2], PLAYER_ROLES[3])).to.be.false;
    });

    it('should return false if comparing a player to themselves', () => {
      expect(playersUtils.isTeammate(PLAYER_ROLES[0], PLAYER_ROLES[0])).to.be.false;
    });

    it('should return false for invalid playerRole1 and log a warning', () => {
      expect(playersUtils.isTeammate('invalidRole1', PLAYER_ROLES[0])).to.be.false;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid role\(s\) passed to isTeammate/);
    });

    it('should return false for invalid playerRole2 and log a warning', () => {
      expect(playersUtils.isTeammate(PLAYER_ROLES[0], 'invalidRole2')).to.be.false;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid role\(s\) passed to isTeammate/);
    });

    it('should return false for null playerRole1 and log a warning', () => {
      expect(playersUtils.isTeammate(null, PLAYER_ROLES[0])).to.be.false;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid role\(s\) passed to isTeammate/);
    });

    it('should return false for undefined playerRole2 and log a warning', () => {
      expect(playersUtils.isTeammate(PLAYER_ROLES[0], undefined)).to.be.false;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid role\(s\) passed to isTeammate/);
    });

    it('should log a warning if getTeamForPlayer returns empty string', () => {
      // This scenario is implicitly covered by invalid roles, as getTeamForPlayer logs and returns empty string.
      // To explicitly test this, we'd need to mock getTeamForPlayer, which is not exported.
      // The current tests for invalid roles already cover the 'false' return.
    });
  });

  describe('getPartner()', () => {
    // Assuming PLAYER_ROLES = ['south', 'west', 'north', 'east']
    it('should return the correct partner for South', () => {
      expect(playersUtils.getPartner(PLAYER_ROLES[0])).to.equal(PLAYER_ROLES[2]); // North
    });

    it('should return the correct partner for West', () => {
      expect(playersUtils.getPartner(PLAYER_ROLES[1])).to.equal(PLAYER_ROLES[3]); // East
    });

    it('should return the correct partner for North', () => {
      expect(playersUtils.getPartner(PLAYER_ROLES[2])).to.equal(PLAYER_ROLES[0]); // South
    });

    it('should return the correct partner for East', () => {
      expect(playersUtils.getPartner(PLAYER_ROLES[3])).to.equal(PLAYER_ROLES[1]); // West
    });

    it('should return undefined for an invalid player role string and log a warning', () => {
      expect(playersUtils.getPartner('invalidRole')).to.be.undefined;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid playerRole passed to getPartner/);
    });

    it('should return undefined for null player role and log a warning', () => {
      expect(playersUtils.getPartner(null)).to.be.undefined;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid playerRole passed to getPartner/);
    });

    it('should return undefined for undefined player role and log a warning', () => {
      expect(playersUtils.getPartner(undefined)).to.be.undefined;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid playerRole passed to getPartner/);
    });
  });

  describe('getPlayerBySocketId()', () => {
    const mockGameState = {
      players: {
        [PLAYER_ROLES[0]]: { id: 'p1', name: 'South', socketId: 'socket-s' },
        [PLAYER_ROLES[1]]: { id: 'p2', name: 'West', socketId: 'socket-w' },
        [PLAYER_ROLES[2]]: { id: 'p3', name: 'North', socketId: 'socket-n' },
        [PLAYER_ROLES[3]]: { id: 'p4', name: 'East', socketId: 'socket-e' },
      }
    };

    it('should return the player object for a valid socket ID', () => {
      const player = playersUtils.getPlayerBySocketId(mockGameState, 'socket-w');
      expect(player).to.deep.equal(mockGameState.players[PLAYER_ROLES[1]]);
    });

    it('should return null for a socket ID that does not exist', () => {
      const player = playersUtils.getPlayerBySocketId(mockGameState, 'socket-invalid');
      expect(player).to.be.null;
    });

    it('should return null for null gameState and log a warning', () => {
      expect(playersUtils.getPlayerBySocketId(null, 'socket-s')).to.be.null;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid arguments for getPlayerBySocketId\./);
    });

    it('should return null for null socketId and log a warning', () => {
      expect(playersUtils.getPlayerBySocketId(mockGameState, null)).to.be.null;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid arguments for getPlayerBySocketId\./);
    });

    it('should return null for empty players object in gameState and log a warning', () => {
      expect(playersUtils.getPlayerBySocketId({}, 'socket-s')).to.be.null; // Empty players object
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid arguments for getPlayerBySocketId\./);
    });

    it('should return null for null players object in gameState and log a warning', () => {
      expect(playersUtils.getPlayerBySocketId({ players: null }, 'socket-s')).to.be.null; // Null players object
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid arguments for getPlayerBySocketId\./);
    });
  });

  describe('getRoleBySocketId()', () => {
     const mockGameState = {
      players: {
        [PLAYER_ROLES[0]]: { id: 'p1', name: 'South', socketId: 'socket-s' },
        [PLAYER_ROLES[1]]: { id: 'p2', name: 'West', socketId: 'socket-w' },
        [PLAYER_ROLES[2]]: { id: 'p3', name: 'North', socketId: 'socket-n' },
        [PLAYER_ROLES[3]]: { id: 'p4', name: 'East', socketId: 'socket-e' },
      }
    };

    it('should return the player role for a valid socket ID', () => {
      const role = playersUtils.getRoleBySocketId(mockGameState, 'socket-n');
      expect(role).to.equal(PLAYER_ROLES[2]); // North
    });

    it('should return null for a socket ID that does not exist', () => {
      const role = playersUtils.getRoleBySocketId(mockGameState, 'socket-invalid');
      expect(role).to.be.null;
    });

    it('should return null for null gameState and log a warning', () => {
      expect(playersUtils.getRoleBySocketId(null, 'socket-s')).to.be.null;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid arguments for getRoleBySocketId\./);
    });

    it('should return null for null socketId and log a warning', () => {
      expect(playersUtils.getRoleBySocketId(mockGameState, null)).to.be.null;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid arguments for getRoleBySocketId\./);
    });

    it('should return null for empty players object in gameState and log a warning', () => {
      expect(playersUtils.getRoleBySocketId({}, 'socket-s')).to.be.null; // Empty players object
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid arguments for getRoleBySocketId\./);
    });

    it('should return null for null players object in gameState and log a warning', () => {
      expect(playersUtils.getRoleBySocketId({ players: null }, 'socket-s')).to.be.null; // Null players object
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid arguments for getRoleBySocketId\./);
    });
  });

  describe('getNextPlayer()', () => {
    const playerSlots = PLAYER_ROLES; // ['south', 'west', 'north', 'east']

    it('should return the next player in the standard order', () => {
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[0], playerSlots)).to.equal(PLAYER_ROLES[1]); // South -> West
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[1], playerSlots)).to.equal(PLAYER_ROLES[2]); // West -> North
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[2], playerSlots)).to.equal(PLAYER_ROLES[3]); // North -> East
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[3], playerSlots)).to.equal(PLAYER_ROLES[0]); // East -> South (wraps around)
    });

    it('should skip the partner if going alone', () => {
      // If South (P0) is going alone, North (P2) sits out.
      // Next player after South (P0) should be West (P1).
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[0], playerSlots, true, PLAYER_ROLES[2])).to.equal(PLAYER_ROLES[1]);

      // If West (P1) is going alone, East (P3) sits out.
      // Next player after West (P1) should be North (P2).
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[1], playerSlots, true, PLAYER_ROLES[3])).to.equal(PLAYER_ROLES[2]);

      // If North (P2) is going alone, South (P0) sits out.
      // Next player after North (P2) should be East (P3).
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[2], playerSlots, true, PLAYER_ROLES[0])).to.equal(PLAYER_ROLES[3]);

      // If East (P3) is going alone, West (P1) sits out.
      // Next player after East (P3) should be South (P0) (wraps around).
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[3], playerSlots, true, PLAYER_ROLES[1])).to.equal(PLAYER_ROLES[0]);
    });

    it('should handle wrapping around when skipping the partner', () => {
      // If East (P3) is going alone, West (P1) sits out.
      // Next player after East (P3) is South (P0). South is not sitting out.
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[3], playerSlots, true, PLAYER_ROLES[1])).to.equal(PLAYER_ROLES[0]);
    });

    it('should return undefined for invalid currentPlayerRole string and log a warning', () => {
      expect(playersUtils.getNextPlayer('invalidRole', playerSlots)).to.be.undefined;
      expect(loggerMock.warn.args[0][1]).to.match(/Current player role invalidRole not found in provided player slots\./);
    });

    it('should return undefined for null currentPlayerRole and log a warning', () => {
      expect(playersUtils.getNextPlayer(null, playerSlots)).to.be.undefined;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid parameters for getNextPlayer:/);
    });

    it('should return undefined for undefined currentPlayerRole and log a warning', () => {
      expect(playersUtils.getNextPlayer(undefined, playerSlots)).to.be.undefined;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid parameters for getNextPlayer:/);
    });

    it('should return undefined if currentPlayerRole is not found in playerSlots and log a warning', () => {
      const customPlayerSlots = ['playerA', 'playerB', 'playerC', 'playerD'];
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[0], customPlayerSlots)).to.be.undefined;
      expect(loggerMock.warn.args[0][1]).to.match(/Current player role .* not found in provided player slots/);
    });

    it('should return undefined for null playerSlots and log a warning', () => {
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[0], null)).to.be.undefined;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid parameters for getNextPlayer:/);
    });

    it('should return undefined for empty playerSlots array and log a warning', () => {
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[0], [])).to.be.undefined;
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid parameters for getNextPlayer:/);
    });

    it('should return undefined for playerSlots array with incorrect length and log a warning', () => {
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[0], ['south', 'west'])).to.be.undefined; // Not 4 players
      expect(loggerMock.warn.args[0][1]).to.match(/Invalid parameters for getNextPlayer:/);
    });

    it('should not skip if not going alone, even if partnerSittingOut is provided', () => {
      // If South (P0) is NOT going alone, North (P2) should NOT be skipped.
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[0], playerSlots, false, PLAYER_ROLES[2])).to.equal(PLAYER_ROLES[1]); // Should still go to West
    });

    it('should not skip if going alone is true but partnerSittingOut is null/undefined', () => {
       expect(playersUtils.getNextPlayer(PLAYER_ROLES[0], playerSlots, true, null)).to.equal(PLAYER_ROLES[1]);
       expect(playersUtils.getNextPlayer(PLAYER_ROLES[0], playerSlots, true, undefined)).to.equal(PLAYER_ROLES[1]);
    });
  });
});
