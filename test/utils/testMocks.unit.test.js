// filepath: test/utils/testMocks.unit.test.js
import { test } from 'node:test';
import assert from 'node:assert';
import {
  createMockLogger,
  createMockPlayerUtils,
  createMockValidation,
  createMockDeckUtils,
  createMockGameState
} from './testMocks.js';

test('createMockLogger returns a logger with no-op functions', () => {
  const mockLogger = createMockLogger();
  assert.strictEqual(typeof mockLogger.info, 'function');
  assert.strictEqual(typeof mockLogger.warn, 'function');
  assert.strictEqual(typeof mockLogger.error, 'function');
  assert.strictEqual(typeof mockLogger.debug, 'function');
  assert.strictEqual(typeof mockLogger.log, 'function');
});

test('createMockPlayerUtils returns default implementations', () => {
  const mockPlayerUtils = createMockPlayerUtils();
  assert.strictEqual(typeof mockPlayerUtils.getNextPlayer, 'function');
  assert.strictEqual(typeof mockPlayerUtils.getPartner, 'function');
  
  // Test getNextPlayer default behavior
  const nextPlayer = mockPlayerUtils.getNextPlayer('south');
  assert.strictEqual(nextPlayer, 'west');
  
  // Test getPartner default behavior
  const partner = mockPlayerUtils.getPartner('south');
  assert.strictEqual(partner, 'north');
});

test('createMockPlayerUtils allows overrides', () => {
  const overrideGetNextPlayer = () => 'north';
  const mockPlayerUtils = createMockPlayerUtils({
    getNextPlayer: overrideGetNextPlayer
  });
  assert.strictEqual(mockPlayerUtils.getNextPlayer('south'), 'north');
});

test('createMockValidation returns default implementations', () => {
  const mockValidation = createMockValidation();
  assert.strictEqual(typeof mockValidation.validatePlay, 'function');
  assert.deepStrictEqual(mockValidation.validatePlay(), { valid: true, errors: [] });
});

test('createMockValidation allows overrides', () => {
  const overrideValidatePlay = () => ({ valid: false, errors: ['Invalid move'] });
  const mockValidation = createMockValidation({
    validatePlay: overrideValidatePlay
  });
  assert.deepStrictEqual(mockValidation.validatePlay(), { valid: false, errors: ['Invalid move'] });
});

test('createMockDeckUtils returns default implementations', () => {
  const mockDeckUtils = createMockDeckUtils();
  assert.strictEqual(typeof mockDeckUtils.getCardRank, 'function');
  assert.strictEqual(mockDeckUtils.getCardRank(), 1);
});

test('createMockDeckUtils allows overrides', () => {
  const overrideGetCardRank = () => 10;
  const mockDeckUtils = createMockDeckUtils({
    getCardRank: overrideGetCardRank
  });
  assert.strictEqual(mockDeckUtils.getCardRank(), 10);
});

test('createMockGameState returns a default game state', () => {
  const gameState = createMockGameState();
  assert.strictEqual(gameState.gameId, 'test-game');
  assert.strictEqual(gameState.gamePhase, 'PLAYING');
  assert.strictEqual(gameState.currentPlayer, 'south');
  assert.strictEqual(gameState.trumpSuit, 'hearts');
  assert.deepStrictEqual(gameState.tricksTaken, { NS: 0, EW: 0 });
});

test('createMockGameState allows overrides', () => {
  const overrides = {
    gameId: 'overridden-game',
    gamePhase: 'BIDDING',
    currentPlayer: 'north',
    settings: { winningScore: 15 }
  };
  const gameState = createMockGameState(overrides);
  assert.strictEqual(gameState.gameId, 'overridden-game');
  assert.strictEqual(gameState.gamePhase, 'BIDDING');
  assert.strictEqual(gameState.currentPlayer, 'north');
  assert.strictEqual(gameState.settings.winningScore, 15);
  // Ensure default properties are still present
  assert.deepStrictEqual(gameState.tricksTaken, { NS: 0, EW: 0 });
});