import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

// Corrected relative path to the module under test
import {
  createBaseGameState,
  setupTestState,
  setupCompletedHandState,
  createMockPlayer,
  createMockCard,
  createCards,
  getCard,
  createDeck,
  shuffleDeterministic,
  getTestId,
  resetTestIdCounter
} from './test-helpers.js';
import { GAME_PHASES, PLAYER_ROLES, TEAMS, SUITS, VALUES } from '../../src/config/constants.js';

describe('Test Helpers', () => {

  // Best practice: Ensure test isolation by resetting any stateful helpers.
  beforeEach(() => {
    resetTestIdCounter();
  });

  it('should create a base game state with default values', () => {
    const gameState = createBaseGameState();
    assert.strictEqual(typeof gameState, 'object', 'gameState should be an object');
    assert.notStrictEqual(gameState, null, 'gameState should not be null');
    assert.strictEqual(gameState.gamePhase, GAME_PHASES.LOBBY);
  });

  it('should setup a test state and advance to the specified phase', () => {
    const { gameState } = setupTestState({ phase: GAME_PHASES.PLAYING });
    assert.strictEqual(gameState.gamePhase, GAME_PHASES.PLAYING);
  });

  it('should create a completed hand state with correct tricks taken', () => {
    const gameState = setupCompletedHandState({ makerTeam: TEAMS.TEAM_NS, tricksWonByMaker: 3 });
    assert.strictEqual(gameState.gamePhase, GAME_PHASES.SCORING);
    assert.strictEqual(gameState.tricksTaken[TEAMS.TEAM_NS], 3);
    assert.strictEqual(gameState.tricksTaken[TEAMS.TEAM_EW], 2);
  });

  it('should create a mock player with correct team assignment', () => {
    const player = createMockPlayer(PLAYER_ROLES[0]);
    assert.strictEqual(typeof player, 'object', 'player should be an object');
    assert.notStrictEqual(player, null, 'player should not be null');
    assert.strictEqual(player.teamId, TEAMS.TEAM_NS);
  });

  it('should create a mock card with correct properties', () => {
    const card = createMockCard(SUITS.CARD_SUIT_SPADES, VALUES[0]); // VALUES[0] is '9'
    assert.strictEqual(typeof card, 'object', 'card should be an object');
    assert.notStrictEqual(card, null, 'card should not be null');
    assert.strictEqual(card.suit, SUITS.CARD_SUIT_SPADES);
    assert.strictEqual(card.value, VALUES[0]);
  });

  it('should create cards from a cardIdString', () => {
    const cardIdString = 'AS, KD';
    const cards = createCards(cardIdString);
    assert.ok(Array.isArray(cards), 'Should return an array');
    assert.strictEqual(cards.length, 2);
    assert.strictEqual(cards[0].id, 'AS');
    assert.strictEqual(cards[1].id, 'KD');
  });

  it('should get a card from the deck by ID', () => {
    const card = getCard('AS');
    assert.strictEqual(typeof card, 'object', 'card should be an object');
    assert.notStrictEqual(card, null, 'card should not be null');
    assert.strictEqual(card.id, 'AS');
  });

  it('should create a standard Euchre deck', () => {
    const deck = createDeck();
    assert.ok(Array.isArray(deck), 'Should return an array');
    assert.strictEqual(deck.length, 24);
  });

  it('should shuffle a deck deterministically', () => {
    const deck = createDeck();
    const shuffledDeck1 = shuffleDeterministic(deck, 123);
    const shuffledDeck2 = shuffleDeterministic(deck, 123);
    const shuffledDeck3 = shuffleDeterministic(deck, 54321);

    assert.ok(Array.isArray(shuffledDeck1), 'Should return an array');
    assert.strictEqual(shuffledDeck1.length, 24);
    assert.notDeepStrictEqual(shuffledDeck1, deck, 'Shuffled deck should not equal original deck');
    assert.deepStrictEqual(shuffledDeck1, shuffledDeck2, 'Shuffling with the same seed should produce the same result');
    assert.notDeepStrictEqual(shuffledDeck1, shuffledDeck3, 'Shuffling with a different seed should produce a different result');
  });

  it('should generate a unique test ID on each call', () => {
    const id1 = getTestId();
    const id2 = getTestId();
    assert.strictEqual(typeof id1, 'string');
    assert.strictEqual(typeof id2, 'string');
    assert.notStrictEqual(id1, id2, 'Sequential IDs should not be equal');
  });

  it('should reset the test ID counter correctly', () => {
    const id1 = getTestId(); // Should be 'id-0'
    getTestId(); // Should be 'id-1', increments counter

    resetTestIdCounter(); // Resets counter to 0

    const id2 = getTestId(); // Should be 'id-0' again
    assert.strictEqual(id1, id2, 'The first ID after a reset should be the same as the first ID before the reset.');
  });
});