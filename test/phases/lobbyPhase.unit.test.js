/**
 * @file test/phases/lobbyPhase.unit.test.js
 * @module test/phases/lobbyPhase.unit
 * @description
 *   Unit tests for the lobby phase logic of the Euchre Multiplayer game.
 *   These tests validate the logic for starting a game from the lobby,
 *   including player count checks, phase validation, and concurrency handling.
 *
 *   CURRENT STATE:
 *     - Tests use esmock to mock state management and logger dependencies.
 *     - All validation and error scenarios for starting a game are covered.
 *     - The file is focused on pure logic, not on network or persistence.
 *
 *   WHEN THE PROJECT IS COMPLETE:
 *     - This file will be the canonical test suite for Layer 1 lobby logic.
 *     - All rules for transitioning from lobby to game start will be validated here.
 *     - No test will require integration with state, persistence, or network code.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import { GAME_PHASES, PLAYER_ROLES } from '../../src/config/constants.js';
import {
  ValidationError,
  InvalidPhaseError,
  PhaseLogicError,
} from '../../src/game/logic/errors.js';

// Default logger mock
const defaultLoggerMock = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  debug: sinon.stub(),
};

// Helper to create a base game state for lobby phase tests
const createLobbyGameState = (phase = GAME_PHASES.LOBBY, connectedPlayerCount = 4) => {
  const gameState = {
    gameId: 'lobbyTestGame',
    gamePhase: phase,
    players: {},
    gameMessages: [],
    dealer: PLAYER_ROLES[0], // Default dealer
  };

  for (let i = 0; i < PLAYER_ROLES.length; i++) {
    const role = PLAYER_ROLES[i];
    gameState.players[role] = {
      id: role,
      name: `Player ${i + 1}`,
      isConnected: i < connectedPlayerCount, // Only first 'connectedPlayerCount' are connected
      teamId: i % 2 === 0 ? 'NS' : 'EW', // Example team assignment
    };
  }
  return gameState;
};

describe('LobbyPhase Logic', () => {
  let attemptToStartGame;
  let updateGameStateStub;
  let currentTestGameStateForStub; // Used by updateGameStateStub

  beforeEach(async () => {
    updateGameStateStub = sinon.stub().callsFake(updaterFn => {
      // Apply the updater to the state provided by the test
      return updaterFn(currentTestGameStateForStub);
    });

    const lobbyPhaseModule = await esmock('../../src/game/phases/lobbyPhase.js', {
      '../../src/game/state.js': { updateGameState: updateGameStateStub },
      '../../src/utils/logger.js': defaultLoggerMock,
      // Errors are imported by test file for assertions
    });
    attemptToStartGame = lobbyPhaseModule.attemptToStartGame;

    defaultLoggerMock.info.resetHistory();
    defaultLoggerMock.warn.resetHistory();
    defaultLoggerMock.error.resetHistory();
  });

  afterEach(() => {
    sinon.restore();
  });

  // Argument Validation Tests
  it('should throw ValidationError if currentGameState is null', () => {
    expect(() => attemptToStartGame(null, PLAYER_ROLES[0]))
      .to.throw(ValidationError, 'Internal error: Missing currentGameState or requestingPlayerRole to start game.');
  });

  it('should throw ValidationError if requestingPlayerRole is missing', () => {
    const gameState = createLobbyGameState();
    expect(() => attemptToStartGame(gameState, null))
      .to.throw(ValidationError, 'Internal error: Missing currentGameState or requestingPlayerRole to start game.');
  });

  // Phase and Player Count Validation
  it('should throw InvalidPhaseError if game is not in LOBBY phase', () => {
    const gameState = createLobbyGameState(GAME_PHASES.PLAYING);
    currentTestGameStateForStub = gameState; // Not strictly needed as error is pre-updater
    expect(() => attemptToStartGame(gameState, PLAYER_ROLES[0]))
      .to.throw(InvalidPhaseError, `Game cannot be started from ${GAME_PHASES.PLAYING} phase. Must be in LOBBY phase.`);
  });

  it('should throw PhaseLogicError if not enough players are connected', () => {
    const gameState = createLobbyGameState(GAME_PHASES.LOBBY, 3); // Only 3 players connected
    currentTestGameStateForStub = gameState;
    expect(() => attemptToStartGame(gameState, PLAYER_ROLES[0]))
      .to.throw(PhaseLogicError, `Not enough players to start. Need 4, have 3.`);
  });

  // Concurrency Check (phase changed before update)
  it('should throw InvalidPhaseError if game phase changes from LOBBY inside updater', () => {
    const initialGameState = createLobbyGameState(GAME_PHASES.LOBBY, 4);
    // This state will be what the updater function (prevState) sees
    currentTestGameStateForStub = { ...initialGameState, gamePhase: GAME_PHASES.PLAYING };

    // attemptToStartGame is called with initialGameState (which passes initial checks)
    // but the updater function inside it, when called by updateGameStateStub, will see currentTestGameStateForStub
    expect(() => attemptToStartGame(initialGameState, PLAYER_ROLES[0]))
      .to.throw(InvalidPhaseError, 'Game phase changed unexpectedly before starting. Aborting start.');
  });

  // Success Path Test
  it('should transition to DEALING phase and update game messages if conditions are met', () => {
    const gameState = createLobbyGameState(GAME_PHASES.LOBBY, 4);
    currentTestGameStateForStub = gameState; // Set for the updater
    const requestingPlayer = PLAYER_ROLES[0];

    const newState = attemptToStartGame(gameState, requestingPlayer);

    expect(updateGameStateStub.calledOnce).to.be.true;
    expect(newState.gamePhase).to.equal(GAME_PHASES.DEALING);
    expect(newState.gameMessages.length).to.equal(1);
    expect(newState.gameMessages[0].text).to.include(`Game started by ${gameState.players[requestingPlayer].name}`);
    expect(newState.gameMessages[0].type).to.equal('system');
    // Check if currentPlayer is set (optional, based on TODO in source)
    // For now, source sets it to prevState.dealer (South P0)
    expect(newState.currentPlayer).to.equal(gameState.dealer);
  });
});
