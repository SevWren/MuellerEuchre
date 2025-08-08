/**
 * Unit tests for lobby utility functions in the Euchre Multiplayer game.
 * @module test/utils/lobbyUtils.unit.test
 * @description
 *   Comprehensive test suite for lobby management utilities including:
 *   - Player role assignment (assignRoleToPlayer)
 *   - Lobby status checks (isLobbyFull)
 *   - Available role detection (getNextAvailableRole)
 * 7-24-25 All Pass
 * 
 * @see {@link module:src/utils/lobbyUtils} for the implementation being tested
 * @see src/utils/lobbyUtils.js
 * @see src/utils/players.js
 * @see src/config/constants.js
 * @since 1.0.0
 */

/**
 * @typedef {import('../src/config/constants.js').PLAYER_POSITIONS} PLAYER_POSITIONS_CONST
 * @typedef {import('../src/config/constants.js').TEAMS} TEAMS_CONST
 */

/**
 * A type representing one of the valid player role strings.
 * This is created directly from the keys of the PLAYER_POSITIONS constant object.
 * @typedef {keyof PLAYER_POSITIONS_CONST} PlayerRole
 * @see src/config/constants.js
 */

/**
 * A type representing one of the valid team ID strings.
 * This is created directly from the keys of the TEAMS constant object.
 * @typedef {keyof TEAMS_CONST} TeamId
 * @see src/config/constants.js
 */

/**
 * Represents a player object in the game state.
 * @typedef {object} Player
 * @property {string} id - The unique user ID.
 * @property {string} name - The player's display name.
 * @property {string} socketId - The socket ID of the connected client.
 * @property {boolean} isConnected - True if the player's client is currently connected.
 * @property {boolean} isActive - True if the player is actively participating in the current game.
 * @property {PlayerRole} role - The assigned role/position of the player (e.g., PLAYER_SOUTH).
 * @property {TeamId} teamId - The ID of the team the player belongs to (e.g., TEAM_NS).
 * @property {number} tricksWonThisHand - Number of tricks won by this player in the current hand.
 * @property {number} score - Total score accumulated by this player across games.
 */

/**
 * Represents the state of a Euchre game.
 * @typedef {object} GameState
 * @property {string} gameId - The unique identifier for the game.
 * @property {Object.<PlayerRole, Player>} players - An object mapping player roles to player data.
 * @property {Object.<TeamId, {score: number, players: PlayerRole[]}>} teams - An object mapping team IDs to team data.
 * @property {string} gamePhase - The current phase of the game (e.g., 'lobby', 'deal').
 * @property {Object.<TeamId, number>} teamScores - Scores for each team.
 * @property {Array<string>} messages - A log of game messages.
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import required utilities
const playersPath = join(__dirname, '..', '..', 'src', 'utils', 'players.js');
const { initializePlayers, getPartner } = (await import('file://' + playersPath));

// Import required constants
const constantsPath = join(__dirname, '..', '..', 'src', 'config', 'constants.js');
const { TEAMS, PLAYER_POSITIONS, PLAYER_ROLES } = await import('file://' + constantsPath);

// Import the module under test
import { createLobbyUtils } from '../../src/utils/lobbyUtils.js';

// Create a mock logger for testing
const mockLogger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
  child: () => mockLogger,
  level: 'silent',
  silent: () => {}
};

// Create an instance of the lobby utils with the mock logger
const { assignRoleToPlayer, isLobbyFull, getNextAvailableRole } = createLobbyUtils(mockLogger);

describe('Lobby Utility Functions', () => {
  /** @type {GameState} */
  let baseGameState;
  let mockReset;

  beforeEach(async (t) => {
    // Setup mocks for logger
    mockReset = t.mock.method(console, 'log', () => {});
    
    // Apply the logger mock
    mock.method(console, 'info', () => {});
    mock.method(console, 'warn', () => {});
    mock.method(console, 'error', () => {});
    mock.method(console, 'debug', () => {});
    
    // Create a fresh game state for each test using initializePlayers
    baseGameState = {
      gameId: 'testGame123',
      players: initializePlayers(), // Initialize players with default values
      teams: {
        [TEAMS.TEAM_NS]: { score: 0, players: [] },
        [TEAMS.TEAM_EW]: { score: 0, players: [] }
      },
      gamePhase: 'lobby',
      teamScores: {
        [TEAMS.TEAM_NS]: 0,
        [TEAMS.TEAM_EW]: 0,
      },
      messages: []
    };
  });

  /**
   * Tests for the `assignRoleToPlayer` function.
   * @see src/utils/lobbyUtils.js#assignRoleToPlayer
   */
  describe('assignRoleToPlayer', () => {
    it('should initialize a completely new player with all properties', () => {
      const userId = 'brandNewUser';
      const playerName = 'BrandNew';
      const socketId = 'newSocket1';
      const role = PLAYER_POSITIONS.PLAYER_SOUTH;
      
      // Create a game state with no existing players
      const emptyGameState = {
        ...baseGameState,
        players: {}
      };
      
      const updatedState = assignRoleToPlayer(emptyGameState, role, userId, playerName, socketId);
      const player = updatedState.players[role];
      
      // Verify all properties are initialized
      assert.strictEqual(player.id, userId);
      assert.strictEqual(player.name, playerName);
      assert.strictEqual(player.socketId, socketId);
      assert.strictEqual(player.isConnected, true);
      assert.strictEqual(player.isActive, true);
      assert.strictEqual(player.role, role);
      assert.strictEqual(player.teamId, TEAMS.TEAM_NS); // First role should be on TEAM_NS
      assert.strictEqual(player.tricksWonThisHand, 0);
      assert.strictEqual(player.score, 0);
    });
    
    it('should handle teams with undefined players array', () => {
      console.log('\n--- Starting test: should handle teams with undefined players array ---');
      
      const userId = 'user1';
      const playerName = 'TestPlayer';
      const socketId = 'socket1';
      const role = PLAYER_POSITIONS.PLAYER_SOUTH;
      
      // Log the role and team assignment
      console.log(`\nTesting with role: ${role}`);
      console.log(`Expected team: ${PLAYER_ROLES.indexOf(role) % 2 === 0 ? TEAMS.TEAM_NS : TEAMS.TEAM_EW}`);
      
      // Create a minimal game state with just what's needed for this test
      const testGameState = {
        ...baseGameState,
        teams: {
          [TEAMS.TEAM_NS]: { score: 0, players: undefined },
          [TEAMS.TEAM_EW]: { score: 0, players: undefined }
        },
        players: {}
      };
      
      console.log('\nInitial game state:');
      console.log(JSON.stringify({
        teams: testGameState.teams,
        players: testGameState.players
      }, null, 2));
      
      // Ensure the teams have undefined players arrays initially
      console.log(`\nVerifying initial state...`);
      console.log(`TEAM_NS players is undefined: ${testGameState.teams[TEAMS.TEAM_NS].players === undefined}`);
      console.log(`TEAM_EW players is undefined: ${testGameState.teams[TEAMS.TEAM_EW].players === undefined}`);
      
      assert.strictEqual(testGameState.teams[TEAMS.TEAM_NS].players, undefined, 'TEAM_NS players should be undefined initially');
      assert.strictEqual(testGameState.teams[TEAMS.TEAM_EW].players, undefined, 'TEAM_EW players should be undefined initially');
      
      // Call the function and verify it handles the undefined players array
      console.log('\nCalling assignRoleToPlayer...');
      const updatedState = assignRoleToPlayer(testGameState, role, userId, playerName, socketId);
      
      console.log('\nUpdated game state:');
      console.log(JSON.stringify({
        teams: updatedState.teams,
        players: updatedState.players
      }, null, 2));
      
      // Verify the team's players array was created and contains the role
      console.log(`\nVerifying TEAM_NS...`);
      console.log(`TEAM_NS players is array: ${Array.isArray(updatedState.teams[TEAMS.TEAM_NS].players)}`);
      console.log(`TEAM_NS players:`, updatedState.teams[TEAMS.TEAM_NS].players);
      
      assert(Array.isArray(updatedState.teams[TEAMS.TEAM_NS].players), 'TEAM_NS should have a players array');
      assert(updatedState.teams[TEAMS.TEAM_NS].players.includes(role), `TEAM_NS players should include the role ${role}`);
      
      // Verify the other team's players array was also initialized
      console.log(`\nVerifying TEAM_EW...`);
      console.log(`TEAM_EW players is array: ${Array.isArray(updatedState.teams[TEAMS.TEAM_EW].players)}`);
      console.log(`TEAM_EW players:`, updatedState.teams[TEAMS.TEAM_EW].players);
      
      assert(Array.isArray(updatedState.teams[TEAMS.TEAM_EW].players), 'TEAM_EW should have a players array');
      assert.strictEqual(updatedState.teams[TEAMS.TEAM_EW].players.length, 0, 'TEAM_EW players array should be empty');
      
      console.log('\n--- Test completed successfully ---\n');
    });

    it('should handle teams with missing players array', () => {
      const userId = 'user2';
      const playerName = 'TestPlayer2';
      const socketId = 'socket2';
      const role = PLAYER_POSITIONS.PLAYER_NORTH;
      
      // Create a test state with a team that has no players array
      const testState = {
        ...baseGameState,
        teams: {
          [TEAMS.TEAM_NS]: { score: 0 },
          [TEAMS.TEAM_EW]: { score: 0 }
        },
        players: {}
      };
      
      // Remove the players array from the team
      delete testState.teams[TEAMS.TEAM_NS].players;
      
      const updatedState = assignRoleToPlayer(testState, role, userId, playerName, socketId);
      
      // Verify the team's players array was created and contains the role
      assert(Array.isArray(updatedState.teams[TEAMS.TEAM_NS].players), 'TEAM_NS should have a players array');
      assert(updatedState.teams[TEAMS.TEAM_NS].players.includes(role), 'TEAM_NS players should include the role');
      
      // Verify the other team's players array was also initialized
      assert(Array.isArray(updatedState.teams[TEAMS.TEAM_EW].players), 'TEAM_EW should have a players array');
      assert.strictEqual(updatedState.teams[TEAMS.TEAM_EW].players.length, 0, 'TEAM_EW players array should be empty');
    });
    
    it('should handle role assignment when team does not exist', () => {
      const userId = 'user3';
      const playerName = 'TestPlayer3';
      const socketId = 'socket3';
      const role = PLAYER_POSITIONS.PLAYER_EAST; // Should be on TEAM_EW
      const expectedTeamId = TEAMS.TEAM_EW;
      
      // Create a fresh base state with no teams
      const freshBaseState = {
        ...baseGameState,
        teams: {
          // Only include the opposite team
          [TEAMS.TEAM_NS]: { 
            score: 0, 
            players: [] 
          }
          // TEAM_EW is intentionally missing to test the error case
        },
        players: {}
      };
      
      // First, verify the team doesn't exist in the initial state
      assert.strictEqual(freshBaseState.teams[expectedTeamId], undefined, 'Team should not exist initially');
      
      // Call the function - this should create the missing team
      const updatedState = assignRoleToPlayer(freshBaseState, role, userId, playerName, socketId);
      
      // Verify the team was created with a players array containing the role
      assert(updatedState.teams[expectedTeamId] !== undefined, `Team ${expectedTeamId} should be created`);
      assert(Array.isArray(updatedState.teams[expectedTeamId].players), 'Team should have a players array');
      
      // Verify the player was added to the team
      assert(updatedState.teams[expectedTeamId].players.includes(role), 'Role should be added to team players');
      
      // Verify the player's state was updated correctly
      assert.strictEqual(updatedState.players[role].id, userId, 'User ID should be set');
      assert.strictEqual(updatedState.players[role].name, playerName, 'Player name should be set');
      assert.strictEqual(updatedState.players[role].socketId, socketId, 'Socket ID should be updated');
      assert.strictEqual(updatedState.players[role].isConnected, true, 'Player should be connected');
      assert.strictEqual(updatedState.players[role].isActive, true, 'Player should be active');
      assert.strictEqual(updatedState.players[role].teamId, expectedTeamId, 'Player should be assigned to the correct team');
      
      // Test case 3: Team is completely missing from the teams object (not even an empty object)
      // This specifically tests the case where the team doesn't exist in the teams object at all
      const roleToTest2 = 'PLAYER_WEST'; // This should be TEAM_EW
      const expectedTeamId2 = TEAMS.TEAM_EW; // We know WEST is on TEAM_EW
      
      // Create a fresh base state with no teams at all
      const minimalBaseState = {
        ...baseGameState,
        teams: {}, // No teams defined at all
        players: {
          ...baseGameState.players,
          [roleToTest2]: {
            ...baseGameState.players[roleToTest2],
            teamId: expectedTeamId2,
            isConnected: false,
            isActive: false
          }
        }
      };
      
      // This will test the branch where the teams object is completely empty
      const updatedState2 = assignRoleToPlayer(minimalBaseState, roleToTest2, userId, playerName, socketId);
      
      // Verify the team was created with a players array containing the role
      assert(updatedState2.teams[expectedTeamId2] !== undefined, `Team ${expectedTeamId2} should be created`);
      assert(Array.isArray(updatedState2.teams[expectedTeamId2].players), 'Team should have a players array');
      assert(updatedState2.teams[expectedTeamId2].players.includes(roleToTest2), 'Role should be added to team players');
      
      // Verify the player's connection status was updated
      assert.strictEqual(updatedState2.players[roleToTest2].isConnected, true, 'Player should be connected');
      assert.strictEqual(updatedState2.players[roleToTest2].isActive, true, 'Player should be active');
      
      // Test case 4: Team object is undefined in the teams object
      // This tests the specific case where the team key exists but its value is undefined
      const roleToTest3 = 'PLAYER_NORTH'; // This should be TEAM_NS
      const expectedTeamId3 = TEAMS.TEAM_NS; // We know NORTH is on TEAM_NS
      
      // Create a state where the team exists but is set to undefined
      const undefinedTeamState = {
        ...baseGameState,
        teams: {
          [TEAMS.TEAM_NS]: undefined, // Team exists but is undefined
          [TEAMS.TEAM_EW]: { score: 0, players: [] }
        },
        players: {
          ...baseGameState.players,
          [roleToTest3]: {
            ...baseGameState.players[roleToTest3],
            teamId: expectedTeamId3,
            isConnected: false,
            isActive: false
          }
        }
      };
      
      // This will test the branch where the team exists but is undefined
      const updatedState3 = assignRoleToPlayer(undefinedTeamState, roleToTest3, userId, playerName, socketId);
      
      // Verify the team was properly initialized
      assert(updatedState3.teams[expectedTeamId3] !== undefined, `Team ${expectedTeamId3} should exist`);
      assert(updatedState3.teams[expectedTeamId3] !== null, `Team ${expectedTeamId3} should not be null`);
      assert(Array.isArray(updatedState3.teams[expectedTeamId3].players), 'Team should have a players array');
      assert(updatedState3.teams[expectedTeamId3].players.includes(roleToTest3), 'Role should be added to team players');
      
      // Verify the player's connection status was updated
      assert.strictEqual(updatedState3.players[roleToTest3].isConnected, true, 'Player should be connected');
      assert.strictEqual(updatedState3.players[roleToTest3].isActive, true, 'Player should be active');
      
    });

    it('should handle case where team exists but has no players array', () => {
      const userId = 'user4';
      const playerName = 'TestPlayer4';
      const socketId = 'socket4';
      const role = 'PLAYER_WEST'; // Use the role string directly to match the function's behavior
      const expectedTeamId = TEAMS.TEAM_EW; // PLAYER_WEST should be on TEAM_EW
      
      // Create a test state where the team exists but has no players array
      const testState = {
        gameId: 'testGame123',
        players: {},
        teams: {
          [TEAMS.TEAM_NS]: { score: 0 }, // No players array here
          [expectedTeamId]: { score: 0 } // Team exists but has no players array
        }
      };
      
      // Call the function
      const updatedState = assignRoleToPlayer(testState, role, userId, playerName, socketId);
      
      // Verify the team now has a players array with the role
      assert(updatedState.teams[expectedTeamId], `Team ${expectedTeamId} should exist`);
      assert(Array.isArray(updatedState.teams[expectedTeamId].players), 'Team should have a players array');
      assert(updatedState.teams[expectedTeamId].players.includes(role), `Role '${role}' should be in team's players array`);
      
      // Verify the player's state was updated correctly
      assert(updatedState.players[role], `Player state for role '${role}' should exist`);
      assert.strictEqual(updatedState.players[role].id, userId, 'Player ID should match');
      assert.strictEqual(updatedState.players[role].name, playerName, 'Player name should match');
      assert.strictEqual(updatedState.players[role].socketId, socketId, 'Socket ID should match');
      assert.strictEqual(updatedState.players[role].role, role, 'Role should be set correctly');
      assert.strictEqual(updatedState.players[role].teamId, expectedTeamId, 'Team ID should be set correctly');
      assert.strictEqual(updatedState.players[role].isConnected, true, 'isConnected should be true');
      assert.strictEqual(updatedState.players[role].isActive, true, 'isActive should be true');
      assert.strictEqual(updatedState.players[role].tricksWonThisHand, 0, 'tricksWonThisHand should be 0');
      assert.strictEqual(updatedState.players[role].score, 0, 'score should be 0');
    });

    it('should handle role assignment when team is missing players array', () => {
      const userId = 'user5';
      const playerName = 'TestPlayer5';
      const socketId = 'socket5';
      const role = 'PLAYER_EAST';
      const teamId = TEAMS.TEAM_EW;
      
      // Create a test state where the team exists but has no players array
      const testState = {
        ...baseGameState,
        teams: {
          [TEAMS.TEAM_NS]: { score: 0, players: [] },
          [teamId]: { score: 0 } // No players array
        },
        players: {}
      };
      
      // Call the function
      const updatedState = assignRoleToPlayer(testState, role, userId, playerName, socketId);
      
      // Verify the team now has a players array with the role
      assert(Array.isArray(updatedState.teams[teamId].players), 'Team should now have a players array');
      assert(updatedState.teams[teamId].players.includes(role), 'Role should be added to team players');
      
      // Verify the player's state was updated correctly
      assert.strictEqual(updatedState.players[role].id, userId, 'User ID should be set');
      assert.strictEqual(updatedState.players[role].name, playerName, 'Player name should be set');
      assert.strictEqual(updatedState.players[role].socketId, socketId, 'Socket ID should be updated');
      assert.strictEqual(updatedState.players[role].isConnected, true, 'Player should be connected');
      assert.strictEqual(updatedState.players[role].isActive, true, 'Player should be active');
      assert.strictEqual(updatedState.players[role].teamId, teamId, 'Player should be assigned to the correct team');
    });
      
    it('should handle role assignment with various team states', () => {
      // Test case 1: Team exists but has no players array
      const userId = 'user5';
      const playerName = 'TestPlayer5';
      const socketId = 'socket5';
      const role = 'PLAYER_EAST';
      const teamId = TEAMS.TEAM_EW;
      
      // Create a test state where the team exists but has no players array
      const testState = {
        ...baseGameState,
        teams: {
          [TEAMS.TEAM_NS]: { score: 0, players: [] },
          [teamId]: { score: 0 } // No players array
        },
        players: {}
      };
      
      // Call the function
      const updatedState = assignRoleToPlayer(testState, role, userId, playerName, socketId);
      
      // Verify the team now has a players array with the role
      assert(Array.isArray(updatedState.teams[teamId].players), 'Team should have a players array');
      assert(updatedState.teams[teamId].players.includes(role), 'Role should be added to team players');
      
      // Verify the player's state was updated correctly
      assert.strictEqual(updatedState.players[role].id, userId, 'User ID should be set');
      assert.strictEqual(updatedState.players[role].name, playerName, 'Player name should be set');
      assert.strictEqual(updatedState.players[role].socketId, socketId, 'Socket ID should be updated');
      assert.strictEqual(updatedState.players[role].isConnected, true, 'Player should be connected');
      assert.strictEqual(updatedState.players[role].isActive, true, 'Player should be active');
      assert.strictEqual(updatedState.players[role].teamId, teamId, 'Player should be assigned to the correct team');
      
      // Test case 2: Team is completely missing from the teams object
      const role2 = 'PLAYER_SOUTH'; // This should be TEAM_NS
      const expectedTeamId2 = TEAMS.TEAM_NS;
      
      // Create a state where the team is missing completely
      const missingTeamState = {
        ...baseGameState,
        teams: {
          // TEAM_NS is completely missing
          [TEAMS.TEAM_EW]: { score: 0, players: [] } // Only TEAM_EW is defined
        },
        players: {}
      };
      
      // Call the function
      const updatedState2 = assignRoleToPlayer(missingTeamState, role2, 'user6', 'TestPlayer6', 'socket6');
      
      // Verify the team was properly created and initialized
      assert(updatedState2.teams[expectedTeamId2] !== undefined, `Team ${expectedTeamId2} should be created`);
      assert(Array.isArray(updatedState2.teams[expectedTeamId2].players), 'Team should have a players array');
      assert(updatedState2.teams[expectedTeamId2].players.includes(role2), 'Role should be added to team players');
      
      // Verify the player's connection status was updated
      assert.strictEqual(updatedState2.players[role2].isConnected, true, 'Player should be connected');
      assert.strictEqual(updatedState2.players[role2].isActive, true, 'Player should be active');
      assert.strictEqual(updatedState2.players[role2].teamId, expectedTeamId2, 'Player should be assigned to the correct team');
    });
    
    it('should assign a role to a new player with initial properties', () => {
      const userId = 'user1';
      const playerName = 'Alice';
      const socketId = 'socket1';
      /** @type {PlayerRole} */
      const role = PLAYER_POSITIONS.PLAYER_SOUTH;
      
      const updatedState = assignRoleToPlayer(baseGameState, role, userId, playerName, socketId);
      /** @type {Player} */
      const player = updatedState.players[role];
      
      // Verify the player object in the updated state
      assert.strictEqual(player.id, userId, 'Should set the correct user ID');
      assert.strictEqual(player.name, playerName, 'Should set the correct player name');
      assert.strictEqual(player.socketId, socketId, 'Should set the correct socket ID');
      assert.strictEqual(player.role, role, 'Should set the correct role');
      assert.strictEqual(player.isConnected, true, 'Should set isConnected to true');
      assert.strictEqual(player.isActive, true, 'Should set isActive to true');
      
      // Verify the game state was updated
      assert.strictEqual(updatedState.players[role], player, 'Should add the player to the game state');
      
      // Verify the team assignment (South is on TEAM_NS)
      const expectedTeam = TEAMS.TEAM_NS; // South is on TEAM_NS
      assert.strictEqual(
        updatedState.teams[expectedTeam].players.includes(role), 
        true, 
        `Should add the role ${role} to team ${expectedTeam}`
      );
      
      // Verify the player's teamId is set correctly
      assert.strictEqual(
        player.teamId, 
        expectedTeam, 
        `Player's teamId should be set to ${expectedTeam}`
      );
    });

    it('should assign roles to players on different teams correctly', () => {
      // Assign South (NS team)
      const updatedState1 = assignRoleToPlayer(baseGameState, PLAYER_POSITIONS.PLAYER_SOUTH, 'user1', 'Alice', 's1');
      
      // The current implementation allows role reassignment, so we'll verify the role was assigned correctly
      const updatedState2 = assignRoleToPlayer(updatedState1, PLAYER_POSITIONS.PLAYER_SOUTH, 'user2', 'Bob', 's2');
      
      // Verify the role was reassigned to the new user
      assert.strictEqual(updatedState2.players[PLAYER_POSITIONS.PLAYER_SOUTH].id, 'user2', 'Should update the player for the role');
      
      // Assign North (NS team) and East (EW team)
      const updatedState3 = assignRoleToPlayer(updatedState2, PLAYER_POSITIONS.PLAYER_NORTH, 'user3', 'Charlie', 's3');
      const updatedState4 = assignRoleToPlayer(updatedState3, PLAYER_POSITIONS.PLAYER_EAST, 'user4', 'Dave', 's4');

      // Verify team assignments
      assert.strictEqual(
        updatedState1.players[PLAYER_POSITIONS.PLAYER_SOUTH].teamId, 
        TEAMS.TEAM_NS, 
        'South player should be on NS team'
      );
      assert.strictEqual(
        updatedState4.players[PLAYER_POSITIONS.PLAYER_EAST].teamId, 
        TEAMS.TEAM_EW, 
        'East player should be on EW team'
      );
    });

    it('should update connection info and reset game stats when reassigning an existing role', () => {
      /** @type {Player} */
      const initialPlayerState = {
        id: 'oldUser',
        name: 'OldName',
        socketId: 'oldSocket',
        isConnected: false,
        isActive: false,
        role: PLAYER_POSITIONS.PLAYER_SOUTH,
        teamId: TEAMS.TEAM_NS,
        tricksWonThisHand: 1,
        score: 5,
        customProp: 'value', // This should not be preserved
      };
      baseGameState.players[PLAYER_POSITIONS.PLAYER_SOUTH] = initialPlayerState;

      const userId = 'newUser';
      const playerName = 'NewName';
      const socketId = 'newSocket';
      /** @type {PlayerRole} */
      const role = PLAYER_POSITIONS.PLAYER_SOUTH;

      /** @type {GameState} */
      const originalGameState = { ...baseGameState }; // Deep copy to ensure no mutation
      const updatedState = assignRoleToPlayer(originalGameState, role, userId, playerName, socketId);

      // Verify original gameState is not mutated
      assert.deepStrictEqual(originalGameState, baseGameState, 'Original game state should not be mutated');
      assert.deepStrictEqual(originalGameState.players[role], initialPlayerState, 'Original player state should not be mutated');

      // Verify updatedState has the correct new player data
      assert.ok(updatedState.players[role], 'Player should exist in updated state');
      assert.strictEqual(updatedState.players[role].id, userId, 'User ID should be updated');
      assert.strictEqual(updatedState.players[role].name, playerName, 'Player name should be updated');
      assert.strictEqual(updatedState.players[role].socketId, socketId, 'Socket ID should be updated');
      assert.strictEqual(updatedState.players[role].isConnected, true, 'Player should be connected');
      assert.strictEqual(updatedState.players[role].isActive, true, 'Player should be active');
      assert.strictEqual(updatedState.players[role].role, role, 'Player role should be preserved');
      assert.strictEqual(updatedState.players[role].teamId, TEAMS.TEAM_NS, 'Team should be preserved');
      assert.strictEqual(updatedState.players[role].tricksWonThisHand, 0, 'Tricks should be reset');
      assert.strictEqual(updatedState.players[role].score, 0, 'Score should be reset');
      assert.strictEqual(updatedState.players[role].customProp, undefined, 'Custom properties should not be preserved');
    });

    it('should throw E_INVALID_GAME_STATE error if gameState is invalid', () => {
      const originalGameState = null;
      try {
        assignRoleToPlayer(originalGameState, PLAYER_POSITIONS.PLAYER_SOUTH, 'u1', 'p1', 's1');
        assert.fail('Expected an error to be thrown');
      } catch (error) {
        // Check the error code and message
        assert.strictEqual(
          error.code,
          'E_INVALID_GAME_STATE',
          'Error code should be E_INVALID_GAME_STATE'
        );
        assert.strictEqual(
          error.message,
          'Invalid gameState or players object.',
          'Error message should match expected format'
        );
      }
    });

    it('should throw E_INVALID_ROLE error if role is invalid', () => {
      const invalidRole = 'INVALID_ROLE';
      try {
        assignRoleToPlayer(baseGameState, invalidRole, 'user2', 'Bob', 's2');
        assert.fail('Expected an error to be thrown');
      } catch (error) {
        // Check the error code and message
        assert.strictEqual(
          error.code,
          'E_INVALID_ROLE',
          'Error code should be E_INVALID_ROLE'
        );
        assert.strictEqual(
          error.message,
          `Invalid role specified: ${invalidRole}`,
          'Error message should match expected format'
        );
      }
    });
  });

  /**
   * Tests for the `isLobbyFull` function.
   * @see src/utils/lobbyUtils.js#isLobbyFull
   */
  describe('isLobbyFull', () => {
    it('should return false for an empty lobby', () => {
      assert.strictEqual(isLobbyFull(baseGameState), false, 'Empty lobby should not be full');
    });

    it('should return false if some players are connected but not all roles are filled', () => {
      let currentState = assignRoleToPlayer({...baseGameState}, PLAYER_POSITIONS.PLAYER_SOUTH, 'u1', 'p1', 's1');
      assert.strictEqual(isLobbyFull(currentState), false, 'Lobby should not be full with only one player');
    });

    it('should return false if all roles are filled but some players are disconnected', () => {
      let state = {...baseGameState};
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_SOUTH, 'u1', 'p1', 's1');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_WEST, 'u2', 'p2', 's2');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_NORTH, 'u3', 'p3', 's3');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_EAST, 'u4', 'p4', 's4');
      
      // Disconnect some players
      state.players[PLAYER_POSITIONS.PLAYER_SOUTH].isConnected = false;
      state.players[PLAYER_POSITIONS.PLAYER_NORTH].isConnected = false;
      
      assert.strictEqual(isLobbyFull(state), false, 'Lobby should not be full with disconnected players');
    });

    it('should return true if all roles are filled with connected players', () => {
      let state = {...baseGameState};
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_SOUTH, 'u1', 'p1', 's1');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_WEST, 'u2', 'p2', 's2');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_NORTH, 'u3', 'p3', 's3');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_EAST, 'u4', 'p4', 's4');
      
      assert.strictEqual(isLobbyFull(state), true, 'Lobby should be full with all players connected');
    });

    it('should handle invalid game state', () => {
      assert.strictEqual(isLobbyFull(null), false, 'Should handle null game state');
      assert.strictEqual(isLobbyFull({}), false, 'Should handle empty game state');
      assert.strictEqual(isLobbyFull({players: {}}), false, 'Should handle missing required properties');
    });

    it('should handle missing or invalid players object', () => {
      assert.strictEqual(isLobbyFull({...baseGameState, players: null}), false, 'Should handle null players');
      assert.strictEqual(isLobbyFull({...baseGameState, players: {}}), false, 'Should handle empty players object');
    });
  });

  /**
   * Tests for the `getNextAvailableRole` function.
   * @see src/utils/lobbyUtils.js#getNextAvailableRole
   */
  describe('getNextAvailableRole', () => {
    it('should return PLAYER_SOUTH if lobby is empty', () => {
      assert.strictEqual(getNextAvailableRole(baseGameState), PLAYER_POSITIONS.PLAYER_SOUTH, 'Should return first role for empty lobby');
    });

    it('should return the next available role in order', () => {
      // Assign first role (SOUTH)
      let state = assignRoleToPlayer({...baseGameState}, PLAYER_POSITIONS.PLAYER_SOUTH, 'u1', 'p1', 's1');
      assert.strictEqual(
        getNextAvailableRole(state), 
        PLAYER_POSITIONS.PLAYER_WEST, 
        'Should return WEST role when SOUTH is taken'
      );
      
      // Assign second role (WEST)
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_WEST, 'u2', 'p2', 's2');
      assert.strictEqual(
        getNextAvailableRole(state), 
        PLAYER_POSITIONS.PLAYER_NORTH, 
        'Should return NORTH role when SOUTH and WEST are taken'
      );
      
      // Assign third role (NORTH)
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_NORTH, 'u3', 'p3', 's3');
      assert.strictEqual(
        getNextAvailableRole(state), 
        PLAYER_POSITIONS.PLAYER_EAST, 
        'Should return EAST role when SOUTH, WEST, and NORTH are taken'
      );
    });

    it('should return null if all roles are taken and connected', () => {
      // Fill all roles with connected players
      let state = {...baseGameState};
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_SOUTH, 'u1', 'p1', 's1');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_WEST, 'u2', 'p2', 's2');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_NORTH, 'u3', 'p3', 's3');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_EAST, 'u4', 'p4', 's4');
      
      assert.strictEqual(getNextAvailableRole(state), null, 'Should return null when all roles are taken');
    });

    it('should return an available role if a player is disconnected', () => {
      // Fill all roles
      let state = {...baseGameState};
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_SOUTH, 'u1', 'p1', 's1');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_WEST, 'u2', 'p2', 's2');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_NORTH, 'u3', 'p3', 's3');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_EAST, 'u4', 'p4', 's4');
      
      // Disconnect a player
      state.players[PLAYER_POSITIONS.PLAYER_WEST].isConnected = false;
      
      assert.strictEqual(
        getNextAvailableRole(state), 
        PLAYER_POSITIONS.PLAYER_WEST, 
        'Should return role of disconnected player'
      );
    });

    it('should return an available role if a player is inactive', () => {
      // Fill all roles
      let state = {...baseGameState};
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_SOUTH, 'u1', 'p1', 's1');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_WEST, 'u2', 'p2', 's2');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_NORTH, 'u3', 'p3', 's3');
      state = assignRoleToPlayer(state, PLAYER_POSITIONS.PLAYER_EAST, 'u4', 'p4', 's4');
      
      // Mark a player as inactive
      state.players[PLAYER_POSITIONS.PLAYER_NORTH].isActive = false;
      
      assert.strictEqual(
        getNextAvailableRole(state), 
        PLAYER_POSITIONS.PLAYER_NORTH, 
        'Should return role of inactive player'
      );
    });

    it('should return null if gameState or players object is null/undefined', () => {
      assert.strictEqual(getNextAvailableRole(null), null, 'Should return null for null gameState');
      assert.strictEqual(getNextAvailableRole({}), null, 'Should return null for empty gameState');
      assert.strictEqual(getNextAvailableRole({ players: null }), null, 'Should return null for null players');
    });
  });

  afterEach(() => {
    // Reset mocks after each test
    if (mockReset) {
      mockReset.mock.resetCalls();
    }
  });
});