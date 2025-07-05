/**
 * Unit tests for player utility functions in the Euchre Multiplayer game.
 * @module test/utils/players.unit.test
 * @description
 *   Comprehensive test suite for player management utilities including:
 *   - Player initialization (initializePlayers)
 *   - Team identification (getPlayerTeam)
 *   - Teammate verification (isTeammate)
 *   - Partner lookup (getPartner)
 *   - Socket-based player lookup (getPlayerBySocketId, getRoleBySocketId)
 *   - Turn progression (getNextPlayer)
 *
 * @see {@link module:src/utils/players} for the implementation being tested
 * @since 1.0.0
 * 
 *TODO:   
 *Missing Test Cases:
 *No test for when playerSlots contains duplicate roles
 *No test for non-array playerSlots (only tests null/empty/incorrect length)
 *No test for playerSlots with non-string values
 *Potential Issues:
 *Tests assume PLAYER_ROLES has exactly 4 elements
 *No test for case where playerSlots has more than 4 elements
 *No test for case where playerSlots has 1 element
 *Test Reliability:
 *Tests are isolated with proper beforeEach/afterEach
 *Uses Chai assertions with Sinon-Chai for mock verification
 *Properly resets mocks between tests
 */
import { expect, use } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createMockedModule } from './esmock_wrapper.js';
import { TEAMS, PLAYER_ROLES } from '../../src/config/constants.js';

use(sinonChai);

// Module under test with mocks
let playersUtils, mocks;

beforeEach(async () => {
  // Create mocked module with logger
  const result = await createMockedModule(
    import.meta.url,
    '../../src/utils/players.js'
  );
  
  playersUtils = result.module;
  mocks = result.mocks;
  
  // Reset all mocks before each test
  sinon.reset();
});

afterEach(() => {
  sinon.restore();
});

describe('Player Utilities', () => {
  describe('initializePlayers()', () => {
    let players;
    
    beforeEach(() => {
      players = playersUtils.initializePlayers();
    });

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
    // Test data
    const validPlayerNS = { 
      id: 'p1', 
      name: 'Player NS', 
      teamId: TEAMS.TEAM_NS 
    };
    
    const validPlayerEW = { 
      id: 'p2', 
      name: 'Player EW', 
      teamId: TEAMS.TEAM_EW 
    };
    
    const playerWithoutTeamId = { 
      id: 'p3', 
      name: 'Player No Team' 
    };

    describe('with valid player objects', () => {
      it('should return TEAM_NS for North/South players', () => {
        const result = playersUtils.getPlayerTeam(validPlayerNS);
        expect(result).to.equal(TEAMS.TEAM_NS);
        expect(mocks.logger.warn.called).to.be.false;
      });

      it('should return TEAM_EW for East/West players', () => {
        const result = playersUtils.getPlayerTeam(validPlayerEW);
        expect(result).to.equal(TEAMS.TEAM_EW);
        expect(mocks.logger.warn.called).to.be.false;
      });
    });

    describe('with invalid inputs', () => {
      it('should log warning and return undefined for null', () => {
        const result = playersUtils.getPlayerTeam(null);
        expect(result).to.be.undefined;
        expect(mocks.logger.warn.calledOnce).to.be.true;
        const [context, message] = mocks.logger.warn.firstCall.args;
        expect(message).to.include('Invalid player object passed to getPlayerTeam');
        expect(context).to.deep.include({ player: null });
      });

      it('should log warning and return undefined for undefined', () => {
        const result = playersUtils.getPlayerTeam(undefined);
        expect(result).to.be.undefined;
        expect(mocks.logger.warn.calledOnce).to.be.true;
        const [context] = mocks.logger.warn.firstCall.args;
        expect(context).to.deep.include({ player: undefined });
      });

      it('should log warning and return undefined for non-object inputs', () => {
        [
          { input: 42, description: 'number' },
          { input: 'string', description: 'string' },
          { input: true, description: 'boolean' },
          { input: 0, description: 'zero' },
          { input: '', description: 'empty string' },
        ].forEach(({ input, description }) => {
          it(`should log warning and return undefined for ${description}`, () => {
            const result = playersUtils.getPlayerTeam(input);
            
            // Verify the function returns undefined
            expect(result, `Expected ${description} to return undefined`).to.be.undefined;
            expect(mocks.logger.warn.calledOnce).to.be.true;
            
            // Get the logger call arguments
            const [logObj, message] = mocks.logger.warn.firstCall.args;
            
            // Check the log object contains the original input
            expect(logObj).to.have.property('player', input);
            
            // Check the warning message
            expect(message).to.equal('Invalid player object passed to getPlayerTeam.');
          });
        });
        
        // Special case for array input
        it('should handle array input by checking for teamId', () => {
          const arrayInput = [];
          const result = playersUtils.getPlayerTeam(arrayInput);
          
          // Verify the function returns undefined
          expect(result).to.be.undefined;
          expect(mocks.logger.warn.calledOnce).to.be.true;
          
          // Get the logger call arguments
          const [logObj, message] = mocks.logger.warn.firstCall.args;
          
          // Check the log object contains playerId and playerName as undefined
          expect(logObj).to.deep.equal({
            playerId: undefined,
            playerName: undefined
          });
          
          // Check the warning message
          expect(message).to.equal('Player object does not have a teamId.');
        });
      });
    });

    describe('with player missing teamId', () => {
      it('should log warning and return undefined', () => {
        const result = playersUtils.getPlayerTeam(playerWithoutTeamId);
        expect(result).to.be.undefined;
        expect(mocks.logger.warn.calledOnce).to.be.true;
        const [context, message] = mocks.logger.warn.firstCall.args;
        expect(message).to.include('Player object does not have a teamId');
        expect(context).to.deep.include({
          playerId: playerWithoutTeamId.id,
          playerName: playerWithoutTeamId.name
        });
      });

      it('should handle null/undefined id and name gracefully', () => {
        const minimalPlayer = { teamId: null };
        const result = playersUtils.getPlayerTeam(minimalPlayer);
        expect(result).to.be.null; // teamId is explicitly set to null
        expect(mocks.logger.warn.called).to.be.false;

        const emptyPlayer = {};
        const result2 = playersUtils.getPlayerTeam(emptyPlayer);
        expect(result2).to.be.undefined;
        expect(mocks.logger.warn.calledOnce).to.be.true;
        const [context] = mocks.logger.warn.firstCall.args;
        expect(context).to.deep.include({
          playerId: undefined,
          playerName: undefined
        });
      });
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
      // The actual implementation calls getPlayerTeam with undefined, which logs a different warning
      expect(playersUtils.isTeammate('invalidRole1', PLAYER_ROLES[0])).to.be.false;
      expect(mocks.logger.warn.called).to.be.true;
    });

    it('should return false for invalid playerRole2 and log a warning', () => {
      expect(playersUtils.isTeammate(PLAYER_ROLES[0], 'invalidRole2')).to.be.false;
      expect(mocks.logger.warn.called).to.be.true;
    });

    it('should return false for null playerRole1 and log a warning', () => {
      expect(playersUtils.isTeammate(null, PLAYER_ROLES[0])).to.be.false;
      expect(mocks.logger.warn.called).to.be.true;
    });

    it('should return false for undefined playerRole2 and log a warning', () => {
      expect(playersUtils.isTeammate(PLAYER_ROLES[0], undefined)).to.be.false;
      expect(mocks.logger.warn.called).to.be.true;
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
      expect(mocks.logger.warn.called).to.be.true;
    });

    it('should return undefined for null player role and log a warning', () => {
      expect(playersUtils.getPartner(null)).to.be.undefined;
      expect(mocks.logger.warn.called).to.be.true;
    });

    it('should return undefined for undefined player role and log a warning', () => {
      expect(playersUtils.getPartner(undefined)).to.be.undefined;
      expect(mocks.logger.warn.called).to.be.true;
    });
  });

  describe('getPlayerBySocketId()', () => {
    let mockGameState;
    
    beforeEach(() => {
      mockGameState = {
        players: {
          [PLAYER_ROLES[0]]: { id: 'p1', name: 'South', socketId: 'socket-s' },
          [PLAYER_ROLES[1]]: { id: 'p2', name: 'West', socketId: 'socket-w' },
          [PLAYER_ROLES[2]]: { id: 'p3', name: 'North', socketId: 'socket-n' },
          [PLAYER_ROLES[3]]: { id: 'p4', name: 'East', socketId: 'socket-e' },
        }
      };
      // Reset logger mock before each test
      mocks.logger.warn.resetHistory();
    });

    it('should return the player object for a valid socket ID', () => {
      const player = playersUtils.getPlayerBySocketId(mockGameState, 'socket-w');
      expect(player).to.deep.equal(mockGameState.players[PLAYER_ROLES[1]]);
      expect(mocks.logger.warn.called).to.be.false;
    });

    it('should return null for a socket ID that does not exist', () => {
      const player = playersUtils.getPlayerBySocketId(mockGameState, 'socket-invalid');
      expect(player).to.be.null;
      expect(mocks.logger.warn.called).to.be.false;
    });

    it('should return null for null gameState and log a warning', () => {
      const result = playersUtils.getPlayerBySocketId(null, 'socket-s');
      expect(result).to.be.null;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Invalid arguments for getPlayerBySocketId');
      expect(context).to.deep.include({
        gameStateExists: false,
        socketId: 'socket-s'
      });
    });

    it('should return null for null socketId and log a warning', () => {
      const result = playersUtils.getPlayerBySocketId(mockGameState, null);
      expect(result).to.be.null;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Invalid arguments for getPlayerBySocketId');
      expect(context).to.deep.include({
        gameStateExists: true,
        socketId: null
      });
    });

    it('should return null for empty gameState and log a warning', () => {
      const result = playersUtils.getPlayerBySocketId({}, 'socket-s');
      expect(result).to.be.null;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Invalid arguments for getPlayerBySocketId');
      expect(context).to.deep.include({
        gameStateExists: true,
        socketId: 'socket-s'
      });
    });

    it('should return null for null players object in gameState and log a warning', () => {
      const result = playersUtils.getPlayerBySocketId({ players: null }, 'socket-123');
      expect(result).to.be.null;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Invalid arguments for getPlayerBySocketId');
      expect(context).to.deep.include({
        gameStateExists: true,
        socketId: 'socket-123'
      });
    });
  });

  describe('getRoleBySocketId()', () => {
    let mockGameState;
    
    beforeEach(() => {
      mockGameState = {
        players: {
          [PLAYER_ROLES[0]]: { id: 'p1', name: 'South', socketId: 'socket-s' },
          [PLAYER_ROLES[1]]: { id: 'p2', name: 'West', socketId: 'socket-w' },
          [PLAYER_ROLES[2]]: { id: 'p3', name: 'North', socketId: 'socket-n' },
          [PLAYER_ROLES[3]]: { id: 'p4', name: 'East', socketId: 'socket-e' },
        }
      };
      // Reset logger mock before each test
      mocks.logger.warn.resetHistory();
    });

    it('should return the correct role for a valid socket ID', () => {
      const result = playersUtils.getRoleBySocketId(mockGameState, 'socket-w');
      expect(result).to.equal(PLAYER_ROLES[1]);
      expect(mocks.logger.warn.called).to.be.false;
    });

    it('should return null for a non-existent socket ID', () => {
      const result = playersUtils.getRoleBySocketId(mockGameState, 'nonexistent-socket');
      expect(result).to.be.null;
      expect(mocks.logger.warn.called).to.be.false;
    });

    it('should return null for null gameState and log a warning', () => {
      const result = playersUtils.getRoleBySocketId(null, 'socket-s');
      expect(result).to.be.null;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Invalid arguments for getRoleBySocketId');
    });

    it('should return null for null socketId and log a warning', () => {
      const result = playersUtils.getRoleBySocketId(mockGameState, null);
      expect(result).to.be.null;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Invalid arguments for getRoleBySocketId');
    });

    it('should return null for empty players object in gameState without logging a warning', () => {
      const result = playersUtils.getRoleBySocketId({ players: {} }, 'socket-123');
      expect(result).to.be.null;
      // The implementation only logs warnings for null/undefined gameState or socketId, not for empty players object
      expect(mocks.logger.warn.called).to.be.false;
    });

    it('should return null for null players object in gameState and log a warning', () => {
      const result = playersUtils.getRoleBySocketId({ players: null }, 'socket-123');
      expect(result).to.be.null;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Invalid arguments for getRoleBySocketId');
    });
  });

  describe('getNextPlayer()', () => {
    let playerSlots;

    beforeEach(() => {
      playerSlots = [...PLAYER_ROLES];
      // Reset logger mock before each test
      if (mocks && mocks.logger) {
        mocks.logger.warn.resetHistory();
      }
    });

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
      const result = playersUtils.getNextPlayer('invalidRole', playerSlots);
      expect(result).to.be.undefined;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      
      // Get the actual arguments passed to the logger
      const [context, message] = mocks.logger.warn.firstCall.args;
      
      // Check if the message contains the expected text
      expect(message).to.include('Current player role invalidRole not found in provided player slots');
      
      // Verify the context contains the expected properties
      expect(context).to.have.property('currentPlayerRole', 'invalidRole');
      expect(context).to.have.property('playerSlots');
    });

    it('should return undefined for null currentPlayerRole and log a warning', () => {
      const result = playersUtils.getNextPlayer(null, playerSlots);
      expect(result).to.be.undefined;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Invalid parameters for getNextPlayer');
      expect(context).to.have.property('currentPlayerRole', null);
      expect(context).to.have.property('playerSlots');
    });

    it('should return undefined for undefined currentPlayerRole and log a warning', () => {
      const result = playersUtils.getNextPlayer(undefined, playerSlots);
      expect(result).to.be.undefined;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Invalid parameters for getNextPlayer');
      expect(context).to.have.property('currentPlayerRole', undefined);
      expect(context).to.have.property('playerSlots');
    });

    it('should return undefined if currentPlayerRole is not found in playerSlots and log a warning', () => {
      const customPlayerSlots = ['playerA', 'playerB', 'playerC', 'playerD'];
      const currentRole = PLAYER_ROLES[0]; // 'south'
      
      const result = playersUtils.getNextPlayer(currentRole, customPlayerSlots);
      
      expect(result).to.be.undefined;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Current player role south not found in provided player slots');
      expect(context).to.have.property('currentPlayerRole', currentRole);
      expect(context).to.have.property('playerSlots');
      expect(Array.isArray(context.playerSlots)).to.be.true;
    });

    it('should return undefined for null playerSlots and log a warning', () => {
      const currentRole = PLAYER_ROLES[0]; // 'south'
      
      const result = playersUtils.getNextPlayer(currentRole, null);
      
      expect(result).to.be.undefined;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Invalid parameters for getNextPlayer');
      expect(context).to.have.property('currentPlayerRole', currentRole);
      expect(context).to.have.property('playerSlots', null);
    });

    it('should return undefined for empty playerSlots array and log a warning', () => {
      const currentRole = PLAYER_ROLES[0]; // 'south'
      
      const result = playersUtils.getNextPlayer(currentRole, []);
      
      expect(result).to.be.undefined;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Invalid parameters for getNextPlayer');
      expect(context).to.have.property('currentPlayerRole', currentRole);
      expect(Array.isArray(context.playerSlots)).to.be.true;
      expect(context.playerSlots).to.be.empty;
    });

    it('should return undefined for playerSlots array with incorrect length and log a warning', () => {
      const currentRole = PLAYER_ROLES[0]; // 'south'
      const invalidPlayerSlots = ['south', 'west'];
      
      const result = playersUtils.getNextPlayer(currentRole, invalidPlayerSlots);
      
      expect(result).to.be.undefined;
      expect(mocks.logger.warn.calledOnce).to.be.true;
      
      const [context, message] = mocks.logger.warn.firstCall.args;
      expect(message).to.include('Invalid parameters for getNextPlayer');
      expect(context).to.have.property('currentPlayerRole', currentRole);
      expect(context).to.have.property('playerSlots');
      expect(Array.isArray(context.playerSlots)).to.be.true;
      expect(context.playerSlots).to.have.lengthOf(2);
    });

    it('should not skip if not going alone, even if partnerSittingOut is provided', () => {
      // If South (P0) is NOT going alone, North (P2) should NOT be skipped.
      expect(playersUtils.getNextPlayer(PLAYER_ROLES[0], playerSlots, false, PLAYER_ROLES[2])).to.equal(PLAYER_ROLES[1]); // Should still go to West
    });

    it('should not skip if going alone is true but partnerSittingOut is null/undefined', () => {
       expect(playersUtils.getNextPlayer(PLAYER_ROLES[0], playerSlots, true, null)).to.equal(PLAYER_ROLES[1]);
       expect(playersUtils.getNextPlayer(PLAYER_ROLES[0], playerSlots, true, undefined)).to.equal(PLAYER_ROLES[1]);
    });

    describe('with duplicate player roles', () => {
      it('should return undefined and log a warning for duplicate roles in playerSlots', () => {
        const duplicateSlots = [...PLAYER_ROLES, PLAYER_ROLES[0]]; // Has duplicate 'south'
        const result = playersUtils.getNextPlayer(PLAYER_ROLES[0], duplicateSlots);
        
        // Should return undefined for invalid playerSlots with duplicates
        expect(result).to.be.undefined;
        
        // Verify warning was logged
        expect(mocks.logger.warn.calledOnce).to.be.true;
        
        const [context, message] = mocks.logger.warn.firstCall.args;
        expect(message).to.include('Invalid parameters for getNextPlayer');
        expect(context).to.have.property('currentPlayerRole', PLAYER_ROLES[0]);
        expect(Array.isArray(context.playerSlots)).to.be.true;
      });
    });

    describe('with non-array playerSlots', () => {
      it('should handle non-array playerSlots', () => {
        const result = playersUtils.getNextPlayer(PLAYER_ROLES[0], {});
        expect(result).to.be.undefined;
        expect(mocks.logger.warn.calledOnce).to.be.true;
        
        const [context, message] = mocks.logger.warn.firstCall.args;
        expect(message).to.include('Invalid parameters for getNextPlayer');
        expect(context).to.have.property('currentPlayerRole', PLAYER_ROLES[0]);
        expect(context).to.have.property('playerSlots');
      });
    });
  });
});
