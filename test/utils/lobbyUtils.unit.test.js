/**
 * Unit tests for lobby utility functions in the Euchre Multiplayer game.
 * @module test/utils/lobbyUtils.unit.test
 * @description
 *   Comprehensive test suite for lobby management utilities including:
 *   - Player role assignment (assignRoleToPlayer)
 *   - Lobby status checks (isLobbyFull)
 *   - Available role detection (getNextAvailableRole)
 *
 * @see {@link module:src/utils/lobbyUtils} for the implementation being tested
 * @since 1.0.0
 */
import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import { PLAYER_ROLES, TEAMS } from '../../src/config/constants.js';

// Mock logger to prevent console output during tests
const loggerMock = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  debug: sinon.stub(),
};

describe('Lobby Utility Functions', () => {
  let lobbyUtils;
  let baseGameState;

  beforeEach(async () => {
    // Reset logger mocks before each test
    loggerMock.info.resetHistory();
    loggerMock.warn.resetHistory();
    loggerMock.error.resetHistory();
    loggerMock.debug.resetHistory();

    // Es-mock the module under test to inject our logger mock
    lobbyUtils = await esmock('../../src/utils/lobbyUtils.js', {
      '../../src/utils/logger.js': loggerMock,
    });

    baseGameState = {
      gameId: 'testGame123',
      players: {}, // Start with an empty players object
      teamScores: {
        [TEAMS.TEAM_NS]: 0,
        [TEAMS.TEAM_EW]: 0,
      },
    };
  });

  describe('assignRoleToPlayer', () => {
    it('should assign a role to a new player with initial properties', () => {
      const userId = 'user1';
      const playerName = 'Alice';
      const socketId = 'socket1';
      const role = PLAYER_ROLES[0]; // PLAYER_1

      const updatedState = lobbyUtils.assignRoleToPlayer(baseGameState, role, userId, playerName, socketId);

      expect(updatedState.players[role]).to.exist;
      expect(updatedState.players[role].id).to.equal(userId);
      expect(updatedState.players[role].name).to.equal(playerName);
      expect(updatedState.players[role].socketId).to.equal(socketId);
      expect(updatedState.players[role].isConnected).to.be.true;
      expect(updatedState.players[role].isActive).to.be.true;
      expect(updatedState.players[role].role).to.equal(role);
      expect(updatedState.players[role].teamId).to.equal(TEAMS.TEAM_NS); // PLAYER_1 is NS
      expect(updatedState.players[role].tricksWonThisHand).to.equal(0);
      expect(updatedState.players[role].score).to.equal(0);
      expect(loggerMock.info.calledOnce).to.be.true;
      expect(loggerMock.info.firstCall.args[0]).to.deep.include({ gameId: 'testGame123', role, userId, playerName });
    });

    it('should assign roles to players on different teams correctly', () => {
      const updatedState1 = lobbyUtils.assignRoleToPlayer(baseGameState, PLAYER_ROLES[0], 'user1', 'Alice', 's1'); // PLAYER_1 (NS)
      const updatedState2 = lobbyUtils.assignRoleToPlayer(updatedState1, PLAYER_ROLES[1], 'user2', 'Bob', 's2'); // PLAYER_2 (EW)

      expect(updatedState2.players[PLAYER_ROLES[0]].teamId).to.equal(TEAMS.TEAM_NS);
      expect(updatedState2.players[PLAYER_ROLES[1]].teamId).to.equal(TEAMS.TEAM_EW);
    });

    it('should update connection info and reset game stats when reassigning an existing role', () => {
      const initialPlayerState = {
        id: 'oldUser',
        name: 'OldName',
        socketId: 'oldSocket',
        isConnected: false,
        isActive: false,
        role: PLAYER_ROLES[0],
        teamId: TEAMS.TEAM_NS,
        tricksWonThisHand: 1,
        score: 5,
        customProp: 'value', // This should not be preserved
      };
      baseGameState.players[PLAYER_ROLES[0]] = initialPlayerState;

      const userId = 'newUser';
      const playerName = 'NewName';
      const socketId = 'newSocket';
      const role = PLAYER_ROLES[0];

      const originalGameState = { ...baseGameState }; // Deep copy to ensure no mutation
      const updatedState = lobbyUtils.assignRoleToPlayer(originalGameState, role, userId, playerName, socketId);

      // Verify original gameState is not mutated
      expect(originalGameState).to.deep.equal(baseGameState);
      expect(originalGameState.players[role]).to.deep.equal(initialPlayerState);

      // Verify updatedState has the correct new player data
      expect(updatedState.players[role]).to.exist;
      expect(updatedState.players[role].id).to.equal(userId);
      expect(updatedState.players[role].name).to.equal(playerName);
      expect(updatedState.players[role].socketId).to.equal(socketId);
      expect(updatedState.players[role].isConnected).to.be.true;
      expect(updatedState.players[role].isActive).to.be.true;
      expect(updatedState.players[role].role).to.equal(role);
      expect(updatedState.players[role].teamId).to.equal(TEAMS.TEAM_NS);
      expect(updatedState.players[role].tricksWonThisHand).to.equal(0); // Should be reset
      expect(updatedState.players[role].score).to.equal(0); // Should be reset
      expect(updatedState.players[role].customProp).to.be.undefined; // Should not preserve arbitrary old props
    });

    it('should return original gameState and log error if gameState is invalid', () => {
      const originalGameState = null;
      const result = lobbyUtils.assignRoleToPlayer(originalGameState, PLAYER_ROLES[0], 'u1', 'p1', 's1');
      expect(result).to.be.null;
      expect(loggerMock.error.calledOnce).to.be.true;
      expect(loggerMock.error.firstCall.args[1]).to.include('Invalid gameState or players object.');
    });

    it('should return original gameState and log warning if role is invalid', () => {
      const originalGameState = { ...baseGameState };
      const result = lobbyUtils.assignRoleToPlayer(originalGameState, 'INVALID_ROLE', 'u1', 'p1', 's1');
      expect(result).to.deep.equal(originalGameState); // Should not modify if role is invalid
      expect(loggerMock.warn.calledOnce).to.be.true;
      expect(loggerMock.warn.firstCall.args[1]).to.include('Invalid role specified: INVALID_ROLE');
    });
  });

  describe('isLobbyFull', () => {
    it('should return false for an empty lobby', () => {
      expect(lobbyUtils.isLobbyFull(baseGameState)).to.be.false;
    });

    it('should return false if some players are connected but not all roles are filled', () => {
      let currentState = lobbyUtils.assignRoleToPlayer(baseGameState, PLAYER_ROLES[0], 'u1', 'p1', 's1');
      expect(lobbyUtils.isLobbyFull(currentState)).to.be.false;
    });

    it('should return true if all player roles are filled and connected', () => {
      let currentState = { ...baseGameState };
      PLAYER_ROLES.forEach((role, index) => {
        currentState = lobbyUtils.assignRoleToPlayer(currentState, role, `user${index}`, `Player${index}`, `socket${index}`);
      });
      expect(lobbyUtils.isLobbyFull(currentState)).to.be.true;
    });

    it('should return false if a player is assigned but not connected', () => {
      let currentState = { ...baseGameState };
      PLAYER_ROLES.forEach((role, index) => {
        currentState = lobbyUtils.assignRoleToPlayer(currentState, role, `user${index}`, `Player${index}`, `socket${index}`);
      });
      // Create a new state with the disconnected player for the check
      const stateWithDisconnectedPlayer = {
        ...currentState,
        players: {
          ...currentState.players,
          [PLAYER_ROLES[0]]: {
            ...currentState.players[PLAYER_ROLES[0]],
            isConnected: false,
          },
        },
      };
      expect(lobbyUtils.isLobbyFull(stateWithDisconnectedPlayer)).to.be.false;
    });

    it('should return false if a player is assigned but not active', () => {
      let currentState = { ...baseGameState };
      PLAYER_ROLES.forEach((role, index) => {
        currentState = lobbyUtils.assignRoleToPlayer(currentState, role, `user${index}`, `Player${index}`, `socket${index}`);
      });
      // Create a new state with the inactive player for the check
      const stateWithInactivePlayer = {
        ...currentState,
        players: {
          ...currentState.players,
          [PLAYER_ROLES[0]]: {
            ...currentState.players[PLAYER_ROLES[0]],
            isActive: false,
          },
        },
      };
      expect(lobbyUtils.isLobbyFull(stateWithInactivePlayer)).to.be.false;
    });

    it('should return false if gameState or players object is null/undefined', () => {
      expect(lobbyUtils.isLobbyFull(null)).to.be.false;
      expect(lobbyUtils.isLobbyFull({ gameId: 'test', players: null })).to.be.false;
    });
  });

  describe('getNextAvailableRole', () => {
    it('should return PLAYER_1 if lobby is empty', () => {
      expect(lobbyUtils.getNextAvailableRole(baseGameState)).to.equal(PLAYER_ROLES[0]);
    });

    it('should return the next available role in order', () => {
      let currentState = lobbyUtils.assignRoleToPlayer(baseGameState, PLAYER_ROLES[0], 'u1', 'p1', 's1'); // PLAYER_1 taken
      expect(lobbyUtils.getNextAvailableRole(currentState)).to.equal(PLAYER_ROLES[1]);
    });

    it('should return null if all roles are taken and connected', () => {
      let currentState = { ...baseGameState };
      PLAYER_ROLES.forEach((role, index) => {
        currentState = lobbyUtils.assignRoleToPlayer(currentState, role, `user${index}`, `Player${index}`, `socket${index}`);
      });
      expect(lobbyUtils.getNextAvailableRole(currentState)).to.be.null;
    });

    it('should return an available role if a player is disconnected', () => {
      let currentState = { ...baseGameState };
      PLAYER_ROLES.forEach((role, index) => {
        currentState = lobbyUtils.assignRoleToPlayer(currentState, role, `user${index}`, `Player${index}`, `socket${index}`);
      });
       // Create a new state with the disconnected player for the check
      const stateWithDisconnectedPlayer = {
        ...currentState,
        players: {
          ...currentState.players,
          [PLAYER_ROLES[2]]: {
            ...currentState.players[PLAYER_ROLES[2]],
            isConnected: false,
          },
        },
      };
      expect(lobbyUtils.getNextAvailableRole(stateWithDisconnectedPlayer)).to.equal(PLAYER_ROLES[2]);
    });

    it('should return an available role if a player is inactive', () => {
      let currentState = { ...baseGameState };
      PLAYER_ROLES.forEach((role, index) => {
        currentState = lobbyUtils.assignRoleToPlayer(currentState, role, `user${index}`, `Player${index}`, `socket${index}`);
      });
       // Create a new state with the inactive player for the check
      const stateWithInactivePlayer = {
        ...currentState,
        players: {
          ...currentState.players,
          [PLAYER_ROLES[1]]: {
            ...currentState.players[PLAYER_ROLES[1]],
            isActive: false,
          },
        },
      };
      expect(lobbyUtils.getNextAvailableRole(stateWithInactivePlayer)).to.equal(PLAYER_ROLES[1]);
    });

    it('should return null if gameState or players object is null/undefined', () => {
      expect(lobbyUtils.getNextAvailableRole(null)).to.be.null;
      expect(lobbyUtils.getNextAvailableRole({ gameId: 'test', players: null })).to.be.null;
    });
  });
});