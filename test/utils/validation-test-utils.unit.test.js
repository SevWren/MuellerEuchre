import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import * as testUtils from './validation-test-utils.js';

const {
  createCard,
  createStandardDeck,
  createBaseGameState,
  dealCards,
  createMockLogger,
  SUITS,
  VALUES,
  GAME_PHASES,
  PLAYER_ROLES
} = testUtils;

describe('Validation Test Utilities', () => {

  describe('createCard()', () => {
    it('should create a card object with all required properties', () => {
      const card = createCard('AS', SUITS.CARD_SUIT_SPADES, 'A');
      assert.strictEqual(card.id, 'AS');
      assert.strictEqual(card.suit, SUITS.CARD_SUIT_SPADES);
      assert.strictEqual(card.value, 'A');
      assert.strictEqual(typeof card.isLeftBower, 'function');
      assert.strictEqual(typeof card.getEffectiveSuit, 'function');
    });

    it('should throw an error if id, suit, or value is missing', () => {
      assert.throws(() => createCard(null, SUITS.CARD_SUIT_SPADES, 'A'), /createCard requires id, suit, and value parameters/);
      assert.throws(() => createCard('AS', null, 'A'), /createCard requires id, suit, and value parameters/);
      assert.throws(() => createCard('AS', SUITS.CARD_SUIT_SPADES, null), /createCard requires id, suit, and value parameters/);
    });

    it('should have default methods that return expected values', () => {
      const card = createCard('KC', SUITS.CARD_SUIT_CLUBS, 'K');
      assert.strictEqual(card.isLeftBower(SUITS.CARD_SUIT_SPADES), false);
      assert.strictEqual(card.getEffectiveSuit(SUITS.CARD_SUIT_SPADES), SUITS.CARD_SUIT_CLUBS);
    });
  });

  describe('createStandardDeck()', () => {
    let deck;

    beforeEach(() => {
      deck = createStandardDeck();
    });

    it('should create a deck with exactly 24 cards', () => {
      assert.strictEqual(deck.length, 24);
    });

    it('should create a deck with unique cards', () => {
      const cardIds = deck.map(card => card.id);
      const uniqueIds = new Set(cardIds);
      assert.strictEqual(uniqueIds.size, 24, 'All card IDs in the deck should be unique');
    });

    it('should contain 6 cards of each suit', () => {
      const suitCounts = deck.reduce((counts, card) => {
        counts[card.suit] = (counts[card.suit] || 0) + 1;
        return counts;
      }, {});
      assert.strictEqual(suitCounts[SUITS.CARD_SUIT_SPADES], 6);
      assert.strictEqual(suitCounts[SUITS.CARD_SUIT_HEARTS], 6);
      assert.strictEqual(suitCounts[SUITS.CARD_SUIT_DIAMONDS], 6);
      assert.strictEqual(suitCounts[SUITS.CARD_SUIT_CLUBS], 6);
    });
  });

  describe('createBaseGameState()', () => {
    it('should create a game state with correct default values', () => {
      const gameState = createBaseGameState();
      assert.strictEqual(gameState.gamePhase, GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND1);
      assert.strictEqual(gameState.dealer, 'north');
      assert.strictEqual(gameState.currentPlayer, 'south');
      assert.deepStrictEqual(gameState.currentTrick, []);
      assert.deepStrictEqual(gameState.tricks, { NS: 0, EW: 0 });
      assert.strictEqual(gameState.trumpSuit, null);
      assert.ok(gameState.upCard);
      assert.ok(gameState.turnCard);
      assert.deepStrictEqual(Object.keys(gameState.players).sort(), [...PLAYER_ROLES].sort());
    });

    it('should apply overrides correctly', () => {
      const overrides = {
        gamePhase: GAME_PHASES.PLAYING,
        currentPlayer: 'west',
        trumpSuit: SUITS.CARD_SUIT_SPADES,
      };
      const gameState = createBaseGameState(overrides);
      assert.strictEqual(gameState.gamePhase, GAME_PHASES.PLAYING);
      assert.strictEqual(gameState.currentPlayer, 'west');
      assert.strictEqual(gameState.trumpSuit, SUITS.CARD_SUIT_SPADES);
    });

    it('should handle an empty override object without errors', () => {
      assert.doesNotThrow(() => createBaseGameState({}));
    });
  });

  describe('dealCards()', () => {
    let gameState;

    beforeEach(() => {
      gameState = createBaseGameState();
    });

    it('should deal cards to the specified players', () => {
      const hands = {
        [PLAYER_ROLES[0]]: [createCard('AS', SUITS.CARD_SUIT_SPADES, 'A')],
        [PLAYER_ROLES[2]]: [createCard('KH', SUITS.CARD_SUIT_HEARTS, 'K'), createCard('QH', SUITS.CARD_SUIT_HEARTS, 'Q')],
      };
      const newState = dealCards(gameState, hands);
      assert.deepStrictEqual(newState.players[PLAYER_ROLES[0]].hand, hands[PLAYER_ROLES[0]]);
      assert.deepStrictEqual(newState.players[PLAYER_ROLES[2]].hand, hands[PLAYER_ROLES[2]]);
      assert.deepStrictEqual(newState.players[PLAYER_ROLES[1]].hand, []);
    });

    it('should return a new game state object, not mutating the original', () => {
      const hands = { [PLAYER_ROLES[0]]: [createCard('AS', SUITS.CARD_SUIT_SPADES, 'A')] };
      const newState = dealCards(gameState, hands);
      assert.notStrictEqual(newState, gameState);
      assert.notStrictEqual(newState.players, gameState.players);
      assert.deepStrictEqual(gameState.players[PLAYER_ROLES[0]].hand, []);
    });

    it("should overwrite a player's existing hand", () => {
      gameState.players[PLAYER_ROLES[0]].hand = [createCard('9C', SUITS.CARD_SUIT_CLUBS, '9')];
      const newHand = [createCard('AS', SUITS.CARD_SUIT_SPADES, 'A')];
      const newState = dealCards(gameState, { [PLAYER_ROLES[0]]: newHand });
      assert.deepStrictEqual(newState.players[PLAYER_ROLES[0]].hand, newHand);
    });

    it('should throw an error if a player ID does not exist in the game state', () => {
      const hands = { 'non-existent-player': [createCard('AS', SUITS.CARD_SUIT_SPADES, 'A')] };
      assert.throws(() => dealCards(gameState, hands), /Player non-existent-player not found in game state/);
    });
  });

  describe('createMockLogger()', () => {
    it('should return an object with all expected logging methods', () => {
      const logger = createMockLogger();
      assert.strictEqual(typeof logger.info, 'function');
      assert.strictEqual(typeof logger.warn, 'function');
      assert.strictEqual(typeof logger.error, 'function');
      assert.strictEqual(typeof logger.debug, 'function');
      assert.strictEqual(typeof logger.reset, 'function');
    });

    it('should have methods that are node:test mock functions', () => {
      const logger = createMockLogger();
      assert.ok(logger.info.mock, 'info should be a mock function');
      assert.ok(logger.warn.mock, 'warn should be a mock function');
      assert.ok(logger.error.mock, 'error should be a mock function');
      assert.ok(logger.debug.mock, 'debug should be a mock function');
    });

    it('reset() method should reset call counts for all mock functions', () => {
      const logger = createMockLogger();
      logger.info('test');
      logger.warn('test');
      logger.error('test');
      logger.debug('test');

      assert.strictEqual(logger.info.mock.calls.length, 1);
      assert.strictEqual(logger.warn.mock.calls.length, 1);
      assert.strictEqual(logger.error.mock.calls.length, 1);
      assert.strictEqual(logger.debug.mock.calls.length, 1);

      logger.reset();

      assert.strictEqual(logger.info.mock.calls.length, 0);
      assert.strictEqual(logger.warn.mock.calls.length, 0);
      assert.strictEqual(logger.error.mock.calls.length, 0);
      assert.strictEqual(logger.debug.mock.calls.length, 0);
    });
  });
});