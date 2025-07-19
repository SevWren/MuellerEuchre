/**
 * @file test/phases/goAlonePhase.unit.test.js
 * @module test/phases/goAlonePhase.unit
 * @description
 *   Unit tests for the "Go Alone" phase logic in Euchre Multiplayer.
 *   These tests verify correct validation, error handling, and state transitions
 *   when a player decides to go alone or play with a partner.
 *
 *   This test file uses Node.js's built-in test runner and assertions.
 *   All tests are focused on Layer 1 logic, not on state management or network.
 */

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Import constants and errors
import {
  GAME_PHASES,
  PLAYER_ROLES,
  TEAMS,
} from '../../../src/config/constants.js';

import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  PhaseLogicError,
} from '../../../src/game/logic/validation-errors.js';

// Import the module under test
import { handleGoAloneDecision } from '../../../src/game/phases/goAlonePhase.js';

// Helper to create a base game state for go_alone phase tests
const createGoAloneGameState = (currentPlayer, trumpMaker) => ({
  gameId: "goAloneTestGame",
  gamePhase: GAME_PHASES.GAME_PHASE_GOING_ALONE_DECISION,
  players: {
    [PLAYER_ROLES[0]]: {
      id: PLAYER_ROLES[0],
      name: "South",
      teamId: TEAMS.TEAM_NS,
    },
    [PLAYER_ROLES[1]]: {
      id: PLAYER_ROLES[1],
      name: "West",
      teamId: TEAMS.TEAM_EW,
    },
    [PLAYER_ROLES[2]]: {
      id: PLAYER_ROLES[2],
      name: "North",
      teamId: TEAMS.TEAM_NS,
    },
    [PLAYER_ROLES[3]]: {
      id: PLAYER_ROLES[3],
      name: "East",
      teamId: TEAMS.TEAM_EW,
    },
  },
  currentPlayer: currentPlayer || PLAYER_ROLES[0],
  dealer: PLAYER_ROLES[0],
  makerTeam: trumpMaker ? TEAMS.TEAM_NS : TEAMS.TEAM_EW,
  playerWhoOrderedUp: trumpMaker || PLAYER_ROLES[0],
  currentTrick: [],
  tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  gameMessages: [],
  settings: { winningScore: 10 },
  leadSuit: null, // Should be null before play starts
});

describe('GoAlonePhase Logic', () => {
  // Mock the players utility module
  const playersMock = {
    getNextPlayer: mock.fn(),
    getPartner: mock.fn(),
  };

  // Set up mocks before each test
  beforeEach(() => {
    // Reset all mocks
    mock.reset();
    
    // Mock the players module
    mock.method(playersMock, 'getNextPlayer', (current, players) => {
      const currentIndex = players.indexOf(current);
      return players[(currentIndex + 1) % players.length];
    });
    
    mock.method(playersMock, 'getPartner', (playerId, players) => {
      const partnerMap = {
        [PLAYER_ROLES[0]]: PLAYER_ROLES[2], // South's partner is North
        [PLAYER_ROLES[1]]: PLAYER_ROLES[3], // West's partner is East
        [PLAYER_ROLES[2]]: PLAYER_ROLES[0], // North's partner is South
        [PLAYER_ROLES[3]]: PLAYER_ROLES[1], // East's partner is West
      };
      return partnerMap[playerId] || null;
    });
  });

  describe('Input Validation', () => {
    it('should throw ValidationError if currentGameState is null', () => {
      assert.throws(
        () => handleGoAloneDecision(null, PLAYER_ROLES[0], true),
        {
          name: 'ValidationError',
          message: 'Invalid game state: missing or invalid players'
        }
      );
    });

    it('should throw ValidationError if decidingPlayerRole is invalid', () => {
      const gameState = createGoAloneGameState(PLAYER_ROLES[0], PLAYER_ROLES[0]);
      assert.throws(
        () => handleGoAloneDecision(gameState, 'InvalidRole', true),
        {
          name: 'ValidationError',
          message: 'Invalid player role'
        }
      );
    });

    it('should throw ValidationError if wantsToGoAlone is not boolean', () => {
      const gameState = createGoAloneGameState(PLAYER_ROLES[0], PLAYER_ROLES[0]);
      assert.throws(
        () => handleGoAloneDecision(gameState, PLAYER_ROLES[0], 'not_boolean'),
        {
          name: 'ValidationError',
          message: 'wantsToGoAlone must be a boolean'
        }
      );
    });
  });

  describe('Phase and Turn Validation', () => {
    it('should throw PhaseLogicError when trump maker cannot be determined', () => {
      const gameState = createGoAloneGameState('PLAYER_SOUTH', 'PLAYER_SOUTH');
      // Remove both playerWhoOrderedUp and playerWhoCalledTrump to trigger the error
      delete gameState.playerWhoOrderedUp;
      delete gameState.playerWhoCalledTrump;

      assert.throws(
        () => handleGoAloneDecision(gameState, 'PLAYER_SOUTH', true),
        {
          name: 'PhaseLogicError',
          message: 'Cannot determine trump maker'
        }
      );
    });

    it('should throw InvalidPhaseError if not in GAME_PHASE_GOING_ALONE_DECISION phase', () => {
      const gameState = createGoAloneGameState('PLAYER_SOUTH', 'PLAYER_SOUTH');
      gameState.gamePhase = 'SOME_OTHER_PHASE';

      assert.throws(
        () => handleGoAloneDecision(gameState, 'PLAYER_SOUTH', true),
        {
          name: 'InvalidPhaseError',
          message: /Cannot make "go alone" decision during SOME_OTHER_PHASE phase/
        }
      );
    })

    it('should throw NotPlayersTurnError if current player is not the deciding player', () => {
      const decidingPlayer = PLAYER_ROLES[0];
      const currentPlayer = PLAYER_ROLES[1];
      const gameState = createGoAloneGameState(currentPlayer, decidingPlayer);
      
      assert.throws(
        () => handleGoAloneDecision(gameState, decidingPlayer, true),
        {
          name: 'NotPlayersTurnError',
          message: `Not ${decidingPlayer}'s turn. It is ${currentPlayer}'s turn.`
        }
      );
    });

    it('should throw PhaseLogicError if deciding player is not the trump maker', () => {
      const trumpMaker = PLAYER_ROLES[0];
      const decidingPlayer = PLAYER_ROLES[1];
      const gameState = createGoAloneGameState(decidingPlayer, trumpMaker);
      
      assert.throws(
        () => handleGoAloneDecision(gameState, decidingPlayer, true),
        {
          name: 'PhaseLogicError',
          message: `Only the player who made trump (${trumpMaker}) can decide to go alone. Player ${decidingPlayer} attempted.`
        }
      );
    });
  });

  describe('Success Paths', () => {
    it('should update state correctly when player decides to go alone', () => {
      const trumpMaker = PLAYER_ROLES[0]; // South
      const partner = PLAYER_ROLES[2]; // North
      const dealer = PLAYER_ROLES[3]; // East
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      gameState.dealer = dealer;

      // Setup mocks
      playersMock.getPartner.mock.mockImplementation((playerId) => {
        return playerId === trumpMaker ? partner : null;
      });

      // Execute
      const newState = handleGoAloneDecision(gameState, trumpMaker, true);

      // Verify
      assert.strictEqual(newState.goingAlone, true);
      assert.strictEqual(newState.playerGoingAlone, trumpMaker);
      assert.strictEqual(newState.partnerSittingOut, partner);
    });

    it('should update state correctly when player decides to play with partner', () => {
      const trumpMaker = PLAYER_ROLES[0]; // South
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      
      // Execute
      const newState = handleGoAloneDecision(gameState, trumpMaker, false);
      
      // Verify
      assert.strictEqual(newState.goingAlone, false);
      assert.strictEqual(newState.playerGoingAlone, null);
      assert.strictEqual(newState.partnerSittingOut, null);
      assert.strictEqual(newState.gamePhase, GAME_PHASES.GAME_PHASE_PLAYING);
      assert.strictEqual(newState.gameMessages.length, 1);
      assert.match(newState.gameMessages[0].text, /chooses to play with a partner/);
    });

    it('should handle case where first player is the partner sitting out', () => {
      // Set up a scenario where the dealer is the player to the right of the partner who is sitting out
      // This way, the first player would normally be the partner, but since they're sitting out,
      // we need to skip to the next player
      const [SOUTH, WEST, NORTH, EAST] = PLAYER_ROLES;
      
      // Set up the scenario where:
      // - Dealer is SOUTH
      // - Trump maker is NORTH (who is sitting out)
      // - Partner is SOUTH (the dealer)
      const dealer = SOUTH;
      const trumpMaker = NORTH;
      const partner = SOUTH; // Partner is SOUTH (the dealer)
      
      // Create game state with NORTH as trump maker and SOUTH as dealer
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      gameState.dealer = dealer;
      
      // Mock getNextPlayer to return the player to the left of the dealer (EAST)
      // and then handle the case where the first player is the partner sitting out
      playersMock.getNextPlayer.mock.mockImplementation((currentPlayer, playerSlots) => {
        // First call: getNextPlayer(dealer, PLAYER_ROLES) - should return WEST (left of dealer)
        if (currentPlayer === dealer) return WEST;
        
        // Second call: getNextPlayer(WEST, PLAYER_ROLES) - should return NORTH
        if (currentPlayer === WEST) return NORTH;
        
        // For other cases, just return the next player in the array
        const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
        return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
      });
      
      // Mock getPartner to return SOUTH as the partner for NORTH
      playersMock.getPartner.mock.mockImplementation((playerId) => {
        if (playerId === NORTH) return SOUTH;
        if (playerId === SOUTH) return NORTH;
        return null;
      });
      
      // Execute - NORTH decides to go alone (SOUTH will be sitting out)
      const newState = handleGoAloneDecision(gameState, trumpMaker, true);
      
      // The first player should be WEST (skipping SOUTH who is the dealer and sitting out)
      assert.strictEqual(
        newState.currentPlayer, 
        WEST, 
        'Should skip the sitting out partner (dealer) and set currentPlayer to the next player (WEST)'
      );
      
      // Verify other state updates
      assert.strictEqual(newState.goingAlone, true, 'Should set goingAlone to true');
      assert.strictEqual(newState.playerGoingAlone, trumpMaker, 'Should set playerGoingAlone to the trump maker');
      assert.strictEqual(newState.partnerSittingOut, partner, 'Should set partnerSittingOut to the partner');
      assert.strictEqual(newState.gamePhase, GAME_PHASES.GAME_PHASE_PLAYING, 'Should advance to PLAYING phase');
    });
    
    it('should handle case where first player after dealer is the partner sitting out', () => {
      // Set up a scenario where the first player after the dealer is the partner who is sitting out
      const [SOUTH, WEST, NORTH, EAST] = PLAYER_ROLES;
      
      // Set up the scenario where:
      // - Dealer is NORTH
      // - Trump maker is SOUTH (who is going alone)
      // - Partner is NORTH (the dealer) who is sitting out
      const dealer = NORTH;
      const trumpMaker = SOUTH;
      const partner = NORTH; // Partner is NORTH (the dealer)
      
      // Create game state with SOUTH as trump maker and NORTH as dealer
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      gameState.dealer = dealer;
      
      // Mock getNextPlayer to return the player to the left of the dealer (WEST)
      // and then handle the case where the first player is the partner sitting out
      playersMock.getNextPlayer.mock.mockImplementation((currentPlayer, playerSlots) => {
        // First call: getNextPlayer(dealer, PLAYER_ROLES) - should return EAST (left of dealer)
        if (currentPlayer === dealer) return EAST;
        
        // Second call: getNextPlayer(EAST, PLAYER_ROLES) - should return SOUTH
        if (currentPlayer === EAST) return SOUTH;
        
        // For other cases, just return the next player in the array
        const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
        return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
      });
      
      // Mock getPartner to return NORTH as the partner for SOUTH
      playersMock.getPartner.mock.mockImplementation((playerId) => {
        if (playerId === SOUTH) return NORTH;
        if (playerId === NORTH) return SOUTH;
        return null;
      });
      
      // Execute - SOUTH decides to go alone (NORTH will be sitting out)
      const newState = handleGoAloneDecision(gameState, trumpMaker, true);
      
      // The first player should be EAST (skipping NORTH who is the dealer and sitting out)
      assert.strictEqual(
        newState.currentPlayer, 
        EAST, 
        'Should skip the sitting out partner (dealer) and set currentPlayer to the next player (EAST)'
      );
      
      // Verify other state updates
      assert.strictEqual(newState.goingAlone, true, 'Should set goingAlone to true');
      assert.strictEqual(newState.playerGoingAlone, trumpMaker, 'Should set playerGoingAlone to the trump maker');
      assert.strictEqual(newState.partnerSittingOut, partner, 'Should set partnerSittingOut to the partner');
      assert.strictEqual(newState.gamePhase, GAME_PHASES.GAME_PHASE_PLAYING, 'Should advance to PLAYING phase');
    });

    it('should not skip first player when they are not the partner sitting out', () => {
      // Set up a scenario where the first player is not the partner who is sitting out
      const [SOUTH, WEST, NORTH, EAST] = PLAYER_ROLES;
      
      // Set up the scenario where:
      // - Dealer is NORTH
      // - Trump maker is SOUTH (who is going alone)
      // - Partner is NORTH (the dealer) who is sitting out
      // - First player is EAST (not the partner)
      const dealer = NORTH;
      const trumpMaker = SOUTH;
      const partner = NORTH; // Partner is NORTH (the dealer)
      
      // Create game state with SOUTH as trump maker and NORTH as dealer
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      gameState.dealer = dealer;
      
      // Mock getNextPlayer to return EAST as the first player after the dealer
      playersMock.getNextPlayer.mock.mockImplementation((currentPlayer, playerSlots) => {
        // First call: getNextPlayer(dealer, PLAYER_ROLES) - should return EAST (left of dealer)
        if (currentPlayer === dealer) return EAST;
        
        // For other cases, just return the next player in the array
        const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
        return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
      });
      
      // Mock getPartner to return NORTH as the partner for SOUTH
      playersMock.getPartner.mock.mockImplementation((playerId) => {
        if (playerId === SOUTH) return NORTH;
        if (playerId === NORTH) return SOUTH;
        return null;
      });
      
      // Execute - SOUTH decides to go alone (NORTH will be sitting out)
      const newState = handleGoAloneDecision(gameState, trumpMaker, true);
      
      // The first player should be EAST (not skipped since they're not the partner)
      assert.strictEqual(
        newState.currentPlayer, 
        EAST, 
        'Should not skip the first player since they are not the partner sitting out'
      );
      
      // Verify other state updates
      assert.strictEqual(newState.goingAlone, true, 'Should set goingAlone to true');
      assert.strictEqual(newState.playerGoingAlone, trumpMaker, 'Should set playerGoingAlone to the trump maker');
      assert.strictEqual(newState.partnerSittingOut, partner, 'Should set partnerSittingOut to the partner');
      assert.strictEqual(newState.gamePhase, GAME_PHASES.GAME_PHASE_PLAYING, 'Should advance to PLAYING phase');
    });

    it('should handle case when dealer is the one going alone', () => {
      // Set up a scenario where the dealer is the one going alone
      const [SOUTH, WEST, NORTH, EAST] = PLAYER_ROLES;
      
      // Set up the scenario where:
      // - Dealer is SOUTH (going alone)
      // - Trump maker is SOUTH (dealer)
      // - Partner is NORTH (sitting out)
      // - First player after dealer is WEST (not the partner)
      const dealer = SOUTH;
      const trumpMaker = SOUTH;
      const partner = NORTH;
      
      // Create game state with SOUTH as trump maker and dealer
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      gameState.dealer = dealer;
      
      // Mock getNextPlayer to return WEST as the first player after the dealer
      playersMock.getNextPlayer.mock.mockImplementation((currentPlayer, playerSlots) => {
        // First call: getNextPlayer(dealer, PLAYER_ROLES) - should return WEST (left of dealer)
        if (currentPlayer === dealer) return WEST;
        
        // For other cases, just return the next player in the array
        const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
        return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
      });
      
      // Mock getPartner to return NORTH as the partner for SOUTH
      playersMock.getPartner.mock.mockImplementation((playerId) => {
        if (playerId === SOUTH) return NORTH;
        if (playerId === NORTH) return SOUTH;
        return null;
      });
      
      // Execute - SOUTH (dealer) decides to go alone (NORTH will be sitting out)
      const newState = handleGoAloneDecision(gameState, trumpMaker, true);
      
      // The first player should be WEST (not skipped since they're not the partner)
      assert.strictEqual(
        newState.currentPlayer, 
        WEST, 
        'Should not skip the first player since they are not the partner sitting out'
      );
      
      // Verify other state updates
      assert.strictEqual(newState.goingAlone, true, 'Should set goingAlone to true');
      assert.strictEqual(newState.playerGoingAlone, trumpMaker, 'Should set playerGoingAlone to the trump maker');
      assert.strictEqual(newState.partnerSittingOut, partner, 'Should set partnerSittingOut to the partner');
      assert.strictEqual(newState.gamePhase, GAME_PHASES.GAME_PHASE_PLAYING, 'Should advance to PLAYING phase');
    });

    it('should handle case when partner is not sitting directly after dealer', () => {
      // This test also covers the branch where the game message is generated with a player name
      // This helps cover the ternary operator in the game message generation
      const [SOUTH, WEST, NORTH, EAST] = PLAYER_ROLES;
      
      // Set up the scenario where:
      // - Dealer is WEST
      // - Trump maker is SOUTH (going alone)
      // - Partner is NORTH (sitting out)
      // - First player after dealer is NORTH (partner, should be skipped)
      const dealer = WEST;
      const trumpMaker = SOUTH;
      const partner = NORTH;
      
      // Create game state with SOUTH as trump maker and WEST as dealer
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      gameState.dealer = dealer;
      
      // Add player names to the game state to test the game message generation
      gameState.players = {
        [SOUTH]: { name: 'Player South' },
        [NORTH]: { name: 'Player North' },
        [EAST]: { name: 'Player East' },
        [WEST]: { name: 'Player West' }
      };
      
      // Track getNextPlayer calls to ensure proper sequencing
      let getNextPlayerCalls = 0;
      playersMock.getNextPlayer.mock.mockImplementation((currentPlayer, playerSlots) => {
        getNextPlayerCalls++;
        
        // First call: getNextPlayer(dealer, PLAYER_ROLES) - should return NORTH (left of WEST)
        if (getNextPlayerCalls === 1) return NORTH;
        
        // Second call: getNextPlayer(NORTH, PLAYER_ROLES) - should return EAST
        if (getNextPlayerCalls === 2) return EAST;
        
        // For other cases, just return the next player in the array
        const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
        return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
      });
      
      // Mock getPartner to return NORTH as the partner for SOUTH
      playersMock.getPartner.mock.mockImplementation((playerId) => {
        if (playerId === SOUTH) return NORTH;
        if (playerId === NORTH) return SOUTH;
        return null;
      });
      
      // Execute - SOUTH decides to go alone (NORTH will be sitting out)
      const newState = handleGoAloneDecision(gameState, trumpMaker, true);
      
      // The first player should be EAST (skipping NORTH who is the partner sitting out)
      assert.strictEqual(
        newState.currentPlayer, 
        EAST, 
        'Should skip the partner (NORTH) and set currentPlayer to the next player (EAST)'
      );
      
      // Verify the game message was generated correctly with player names
      const lastMessage = newState.gameMessages[newState.gameMessages.length - 1];
      assert.strictEqual(
        lastMessage.text,
        'Player South is going alone! Player North sits out.',
        'Should include player names in the game message'
      );
      
      // Verify other state updates
      assert.strictEqual(newState.goingAlone, true, 'Should set goingAlone to true');
      assert.strictEqual(newState.playerGoingAlone, trumpMaker, 'Should set playerGoingAlone to the trump maker');
      assert.strictEqual(newState.partnerSittingOut, partner, 'Should set partnerSittingOut to the partner');
      assert.strictEqual(newState.gamePhase, GAME_PHASES.GAME_PHASE_PLAYING, 'Should advance to PLAYING phase');
    });

    it('should generate correct message when player decides to play with partner', () => {
      // This test covers the branch where wantsToGoAlone is false
      const [SOUTH, WEST, NORTH, EAST] = PLAYER_ROLES;
      
      // Set up the scenario where:
      // - Dealer is WEST
      // - Trump maker is SOUTH (chooses to play with partner)
      const dealer = WEST;
      const trumpMaker = SOUTH;
      
      // Create game state with SOUTH as trump maker and WEST as dealer
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      gameState.dealer = dealer;
      
      // Add player names to the game state to test the game message generation
      gameState.players = {
        [SOUTH]: { name: 'Player South' },
        [NORTH]: { name: 'Player North' },
        [EAST]: { name: 'Player East' },
        [WEST]: { name: 'Player West' }
      };
      
      // Mock getNextPlayer to return NORTH as the first player after the dealer
      playersMock.getNextPlayer.mock.mockImplementation((currentPlayer, playerSlots) => {
        // First call: getNextPlayer(dealer, PLAYER_ROLES) - should return NORTH (left of WEST)
        if (currentPlayer === dealer) return NORTH;
        
        // For other cases, just return the next player in the array
        const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
        return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
      });
      
      // Mock getPartner to return NORTH as the partner for SOUTH
      playersMock.getPartner.mock.mockImplementation((playerId) => {
        if (playerId === SOUTH) return NORTH;
        if (playerId === NORTH) return SOUTH;
        return null;
      });
      
      // Execute - SOUTH decides to play with partner (wantsToGoAlone = false)
      const newState = handleGoAloneDecision(gameState, trumpMaker, false);
      
      // The first player should be NORTH (left of dealer)
      assert.strictEqual(
        newState.currentPlayer, 
        NORTH, 
        'Should set currentPlayer to the player left of dealer (NORTH)'
      );
      
      // Verify the game message was generated correctly
      const lastMessage = newState.gameMessages[newState.gameMessages.length - 1];
      assert.strictEqual(
        lastMessage.text,
        'Player South chooses to play with a partner.',
        'Should include player name in the game message when choosing to play with partner'
      );
      
      // Verify other state updates
      assert.strictEqual(newState.goingAlone, false, 'Should set goingAlone to false');
      assert.strictEqual(newState.playerGoingAlone, null, 'Should set playerGoingAlone to null');
      assert.strictEqual(newState.partnerSittingOut, null, 'Should set partnerSittingOut to null');
      assert.strictEqual(newState.gamePhase, GAME_PHASES.GAME_PHASE_PLAYING, 'Should advance to PLAYING phase');
    });

    it('should handle case when player names are not available in game state', () => {
      // This test covers the branch where player names are not available in the game state
      // and the fallback to role names is used in the game message
      const [SOUTH, WEST, NORTH, EAST] = PLAYER_ROLES;
      
      // Set up the scenario where:
      // - Dealer is WEST
      // - Trump maker is SOUTH (going alone)
      // - Partner is NORTH (sitting out)
      const dealer = WEST;
      const trumpMaker = SOUTH;
      const partner = NORTH;
      
      // Create game state with SOUTH as trump maker and WEST as dealer
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      gameState.dealer = dealer;
      
      // Ensure players object is empty to test the fallback to role names
      gameState.players = {};
      
      // Track getNextPlayer calls to ensure proper sequencing
      let getNextPlayerCalls = 0;
      playersMock.getNextPlayer.mock.mockImplementation((currentPlayer, playerSlots) => {
        getNextPlayerCalls++;
        
        // First call: getNextPlayer(dealer, PLAYER_ROLES) - should return NORTH (left of WEST)
        if (getNextPlayerCalls === 1) return NORTH;
        
        // Second call: getNextPlayer(NORTH, PLAYER_ROLES) - should return EAST
        if (getNextPlayerCalls === 2) return EAST;
        
        // For other cases, just return the next player in the array
        const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
        return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
      });
      
      // Mock getPartner to return NORTH as the partner for SOUTH
      playersMock.getPartner.mock.mockImplementation((playerId) => {
        if (playerId === SOUTH) return NORTH;
        if (playerId === NORTH) return SOUTH;
        return null;
      });
      
      // Execute - SOUTH decides to go alone (NORTH will be sitting out)
      const newState = handleGoAloneDecision(gameState, trumpMaker, true);
      
      // Verify the game message was generated correctly with role names as fallback
      const lastMessage = newState.gameMessages[newState.gameMessages.length - 1];
      assert.strictEqual(
        lastMessage.text,
        'PLAYER_SOUTH is going alone! Partner sits out.',
        'Should use role names when player names are not available'
      );
    });

    it('should handle case when partner is not sitting directly after dealer', () => {
      // Set up a scenario where the partner is not sitting directly after the dealer
      const [SOUTH, WEST, NORTH, EAST] = PLAYER_ROLES;
      
      // Set up the scenario where:
      // - Dealer is WEST
      // - Trump maker is SOUTH (going alone)
      // - Partner is NORTH (sitting out)
      // - First player after dealer is NORTH (partner, should be skipped)
      const dealer = WEST;
      const trumpMaker = SOUTH;
      const partner = NORTH;
      
      // Create game state with SOUTH as trump maker and WEST as dealer
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      gameState.dealer = dealer;
      
      // Track getNextPlayer calls to ensure proper sequencing
      let getNextPlayerCalls = 0;
      playersMock.getNextPlayer.mock.mockImplementation((currentPlayer, playerSlots) => {
        getNextPlayerCalls++;
        
        // First call: getNextPlayer(dealer, PLAYER_ROLES) - should return NORTH (left of WEST)
        if (getNextPlayerCalls === 1) return NORTH;
        
        // Second call: getNextPlayer(NORTH, PLAYER_ROLES) - should return EAST
        if (getNextPlayerCalls === 2) return EAST;
        
        // For other cases, just return the next player in the array
        const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
        return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
      });
      
      // Mock getPartner to return NORTH as the partner for SOUTH
      playersMock.getPartner.mock.mockImplementation((playerId) => {
        if (playerId === SOUTH) return NORTH;
        if (playerId === NORTH) return SOUTH;
        return null;
      });
      
      // Execute - SOUTH decides to go alone (NORTH will be sitting out)
      const newState = handleGoAloneDecision(gameState, trumpMaker, true);
      
      // The first player should be EAST (skipping NORTH who is the partner sitting out)
      assert.strictEqual(
        newState.currentPlayer, 
        EAST, 
        'Should skip the partner (NORTH) and set currentPlayer to the next player (EAST)'
      );
      
      // Verify other state updates
      assert.strictEqual(newState.goingAlone, true, 'Should set goingAlone to true');
      assert.strictEqual(newState.playerGoingAlone, trumpMaker, 'Should set playerGoingAlone to the trump maker');
      assert.strictEqual(newState.partnerSittingOut, partner, 'Should set partnerSittingOut to the partner');
      assert.strictEqual(newState.gamePhase, GAME_PHASES.GAME_PHASE_PLAYING, 'Should advance to PLAYING phase');
    });

    it('should correctly set the first player when partner sits out', () => {
      console.log('\n=== Starting test: should correctly set the first player when partner sits out ===');
      
      // In Euchre, the order is: South (dealer), West, North, East
      const [SOUTH, WEST, NORTH, EAST] = PLAYER_ROLES;
      const trumpMaker = SOUTH;
      const partner = NORTH; // North is South's partner
      const dealer = SOUTH; // South is the dealer
      
      console.log(`Test setup: Dealer=${dealer}, TrumpMaker=${trumpMaker}, Partner=${partner}`);
      
      // Create game state with South as the dealer and trump maker
      const gameState = createGoAloneGameState(trumpMaker, trumpMaker);
      gameState.dealer = dealer;
      
      console.log('Game state created with:', {
        dealer: gameState.dealer,
        currentPlayer: gameState.currentPlayer,
        trumpMaker: gameState.playerWhoOrderedUp,
        gamePhase: gameState.gamePhase
      });

      // Setup mocks
      playersMock.getPartner.mock.mockImplementation((playerId) => {
        return playerId === trumpMaker ? partner : null;
      });

      // Mock getNextPlayer to handle the player order correctly
      playersMock.getNextPlayer.mock.mockImplementation((current, playerSlots) => {
        // Handle case where playerSlots might be an array of length 8 (duplicated)
        const uniqueSlots = [...new Set(playerSlots)]; // Remove duplicates
        
        // Ensure we have exactly 4 unique player roles
        if (uniqueSlots.length !== 4) {
          console.log('Invalid unique player slots:', uniqueSlots);
          return undefined;
        }
        
        // Get the current index in the playerSlots array
        const currentIndex = uniqueSlots.indexOf(current);
        if (currentIndex === -1) {
          console.log('Current player not found in playerSlots:', current, 'in', playerSlots);
          return undefined;
        }
        
        // Return the next player in the sequence, wrapping around if needed
        const nextPlayer = uniqueSlots[(currentIndex + 1) % uniqueSlots.length];
        console.log(`getNextPlayer: ${current} -> ${nextPlayer} (from ${uniqueSlots.join(', ')})`);
        return nextPlayer;
      });

      // Execute - South (dealer) decides to go alone
      console.log('\nCalling handleGoAloneDecision with:', {
        decidingPlayerRole: trumpMaker,
        wantsToGoAlone: true
      });
      
      const newState = handleGoAloneDecision(gameState, trumpMaker, true);
      
      console.log('\nNew game state after handleGoAloneDecision:', {
        currentPlayer: newState.currentPlayer,
        goingAlone: newState.goingAlone,
        playerGoingAlone: newState.playerGoingAlone,
        partnerSittingOut: newState.partnerSittingOut,
        gamePhase: newState.gamePhase
      });

      // The first player should be the player to the left of the dealer (West)
      // In Euchre, play proceeds to the left, so after South (dealer) comes West
      console.log(`\nAsserting that currentPlayer (${newState.currentPlayer}) equals WEST (${WEST})`);
      assert.strictEqual(newState.currentPlayer, WEST, 
        `Expected first player to be ${WEST} (to the left of dealer ${dealer}) but got ${newState.currentPlayer}`);
        
      console.log('=== Test completed successfully ===\n');
    });
  });
});
