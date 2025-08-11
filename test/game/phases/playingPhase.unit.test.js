/**
 * @file test/game/phases/playingPhase.unit.test.js
 * @module test/game/phases/playingPhase.unit.test
 * @description
 *   Comprehensive test suite for the Euchre game's playing phase. This suite
 *   verifies the pure functions in `src/game/phases/playingPhase.js`, ensuring
 *   they correctly handle card plays, trick winner determination, and game state
 *   transitions while adhering to the project's Layer 1 purity and testing mandates.
 *
 *   The suite employs a dependency injection pattern, where dependencies like validators
 *   and player utilities are passed via a `mockServices` object using `.call()`.
 *   To handle mocking in an ES Module environment, the module under test is imported
 *   dynamically in a `beforeEach` hook after mocks are established.
 *
 * @see {@link module:src/game/phases/playingPhase} - The implementation being tested.
 * @see {@link module:docs/The Unabridged Mueller Euchre Debugging Bible.md} - For dependency injection patterns.
 * @see {@link module:test/helpers/test-helpers} - For test state generation.
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { handlePlayCard, determineTrickWinner } from '../../../src/game/phases/playingPhase.js';
import { GAME_PHASES, CARD_SUITS, PLAYER_ROLES, TEAMS } from '../../../src/config/constants.js';
import { PhaseLogicError, NotPlayersTurnError, CardNotInHandError, MustFollowSuitError, InvalidCardError } from '../../../src/game/logic/validation-errors.js';
import * as validationCore from '../../../src/game/logic/validation-core.js';
import * as cardUtils from '../../../src/utils/cardUtils.js';
import * as players from '../../../src/utils/players.js';
import { setupTestState, createCards } from '../../helpers/test-helpers.js';

/**
 * @describe Top-level test suite for the PlayingPhase Logic.
 */
describe('PlayingPhase Logic', () => {
  /**
   * @type {object} mockServices - An object containing mocked dependencies injected into the functions under test.
   */
  let mockServices;
  /**
   * @type {Function} handlePlayCard - A reference to the function from the dynamically imported module.
   */
  let handlePlayCard;
  /**
   * @type {Function} determineTrickWinner - A reference to the function from the dynamically imported module.
   */
  let determineTrickWinner;

  /**
   * @beforeEach Sets up mocks and dynamically imports the module under test.
   * This ensures that a fresh module instance, aware of any suite-level mocks,
   * is used for each test, preventing state leakage and solving ESM mocking issues.
   */
  beforeEach(async () => {
    mockServices = {
      validatePlay: mock.fn(validationCore.validatePlay),
      getNextPlayer: mock.fn(players.getNextPlayer),
      getCardRank: mock.fn(cardUtils.getCardRank),
      getEffectiveSuit: mock.fn(cardUtils.getEffectiveSuit),
    };

    // Dynamically import the module to ensure it gets fresh dependencies
    const module = await import(`../../../src/game/phases/playingPhase.js?v=${Date.now()}`);
    handlePlayCard = module.handlePlayCard;
    determineTrickWinner = module.determineTrickWinner;
  });

  /**
   * @afterEach Restores all mocks after each test to ensure test isolation.
   */
  afterEach(() => {
    mock.restoreAll();
  });

  /**
   * @describe Test suite for the `handlePlayCard` function.
   */
  describe('handlePlayCard', () => {
    /**
     * @test {handlePlayCard}
     * @description Verifies that the function throws a TypeError for null or invalid gameState.
     */
    it('should throw TypeError if gameState is null or invalid', () => {
      assert.throws(() => handlePlayCard.call(mockServices, null, PLAYER_ROLES[0], {}), { name: 'TypeError' });
      assert.throws(() => handlePlayCard.call(mockServices, 'not-an-object', PLAYER_ROLES[0], {}), { name: 'TypeError' });
    });

    /**
     * @test {handlePlayCard}
     * @description Verifies that the function throws a TypeError for invalid playerRole types.
     */
    it('should throw TypeError for invalid playerRole types', () => {
      const { gameState } = setupTestState({ phase: GAME_PHASES.GAME_PHASE_PLAYING });
      assert.throws(() => handlePlayCard.call(mockServices, gameState, null, {}), { name: 'TypeError' });
    });

    /**
     * @test {handlePlayCard}
     * @description Verifies that the function throws a TypeError for invalid cardPlayed types.
     */
    it('should throw TypeError for invalid cardPlayed types', () => {
      const { gameState } = setupTestState({ phase: GAME_PHASES.GAME_PHASE_PLAYING });
      assert.throws(() => handlePlayCard.call(mockServices, gameState, PLAYER_ROLES[0], null), { name: 'TypeError' });
    });

    /**
     * @test {handlePlayCard}
     * @description Verifies that a PhaseLogicError is thrown if the playerRole is not found in the game state.
     */
    it('should throw PhaseLogicError if playerRole is not found in gameState', () => {
      const { gameState } = setupTestState({ phase: GAME_PHASES.GAME_PHASE_PLAYING });
      assert.throws(() => handlePlayCard.call(mockServices, gameState, 'INVALID_ROLE', {}), { name: 'PhaseLogicError' });
    });

    /**
     * @test {handlePlayCard}
     * @description Verifies a PhaseLogicError is thrown for state inconsistencies where validation might pass but the card is not actually in the hand.
     */
    it('should throw PhaseLogicError if card is not found in hand after validation passes', () => {
      const { gameState } = setupTestState({ phase: GAME_PHASES.GAME_PHASE_PLAYING });
      const cardNotInHand = createCards('AS')[0];
      mockServices.validatePlay = mock.fn(() => true);
      assert.throws(() => handlePlayCard.call(mockServices, gameState, gameState.currentPlayer, cardNotInHand), { name: 'PhaseLogicError' });
    });
    
    /**
     * @test {handlePlayCard}
     * @description Verifies the catch block for cloning errors is covered by simulating a failure in `structuredClone`.
     */
    it('should throw a generic Error if structuredClone fails', () => {
      const { gameState, playerHand } = setupTestState({ phase: GAME_PHASES.GAME_PHASE_PLAYING });
      const cardToPlay = playerHand[0];
      const playerRole = gameState.currentPlayer;
      const cloneError = new Error('Clone failed');
      mock.method(global, 'structuredClone', () => { throw cloneError; });
      assert.throws(() => handlePlayCard.call(mockServices, gameState, playerRole, cardToPlay), (err) => err.cause === cloneError);
    });

    /**
     * @test {handlePlayCard}
     * @description This test is critical for achieving 100% branch coverage. It simulates an
     * environment where `structuredClone` is not available by temporarily deleting it from
     * the global scope. It then dynamically imports a fresh version of the `playingPhase`
     * module, which will now execute the fallback cloning logic using `JSON.parse(JSON.stringify(...))`.
     * The original global function is restored in a `finally` block to ensure test isolation.
     */
    it('should use JSON.parse/stringify fallback if structuredClone is unavailable', async () => {
      const originalStructuredClone = global.structuredClone;
      try {
        delete global.structuredClone;
        
        const { handlePlayCard: handlePlayCardFresh } = await import(`../../../src/game/phases/playingPhase.js?v=${Date.now()}`);
        
        const { gameState, playerHand } = setupTestState({ phase: GAME_PHASES.GAME_PHASE_PLAYING });
        const cardToPlay = playerHand[0];
        const playerRole = gameState.currentPlayer;
        
        const newState = handlePlayCardFresh.call(mockServices, gameState, playerRole, cardToPlay);

        assert.notStrictEqual(newState, gameState);
        assert.deepStrictEqual(newState.players[playerRole].hand.length, 4);
      } finally {
        global.structuredClone = originalStructuredClone;
      }
    });

    /**
     * @test {handlePlayCard}
     * @description Verifies a valid card play correctly updates the game state by adding the card to the current trick.
     */
    it('should play a card and update the current trick', () => {
      const { gameState, playerHand } = setupTestState({ phase: GAME_PHASES.GAME_PHASE_PLAYING });
      const cardToPlay = playerHand[0];
      const playerRole = gameState.currentPlayer;
      const newState = handlePlayCard.call(mockServices, gameState, playerRole, cardToPlay);
      assert.strictEqual(newState.currentTrick.length, 1);
    });

    /**
     * @test {handlePlayCard}
     * @description Verifies the turn correctly advances to the next player after a valid card play.
     */
    it('should advance to the next player after a card is played', () => {
      const { gameState, playerHand } = setupTestState({ phase: GAME_PHASES.GAME_PHASE_PLAYING });
      const cardToPlay = playerHand[0];
      const playerRole = gameState.currentPlayer;
      const expectedNextPlayer = players.getNextPlayer(playerRole);
      const newState = handlePlayCard.call(mockServices, gameState, playerRole, cardToPlay);
      assert.strictEqual(newState.currentPlayer, expectedNextPlayer);
    });

    /**
     * @test {handlePlayCard}
     * @description Verifies trick completion logic, including winner determination and updating the `tricksTaken` state.
     */
    it('should determine a trick winner and update state when the trick is complete', () => {
      const { gameState } = setupTestState({
        phase: GAME_PHASES.GAME_PHASE_PLAYING,
        trickOverrides: [
          { card: createCards('9S')[0], playedBy: PLAYER_ROLES[1] },
          { card: createCards('10S')[0], playedBy: PLAYER_ROLES[2] },
          { card: createCards('QS')[0], playedBy: PLAYER_ROLES[3] },
        ],
        handOverrides: { [PLAYER_ROLES[0]]: createCards('AS') }
      });
      const playerRole = gameState.currentPlayer;
      const cardToPlay = gameState.players[playerRole].hand[0];
      const newState = handlePlayCard.call(mockServices, gameState, playerRole, cardToPlay);
      assert.strictEqual(newState.tricksTaken[TEAMS.TEAM_NS], 1);
    });

    /**
     * @test {handlePlayCard}
     * @description Verifies the game correctly transitions to the SCORING phase after the final (5th) trick is completed.
     */
    it('should transition to SCORING phase after the 5th trick is completed', () => {
      const { gameState } = setupTestState({
        phase: GAME_PHASES.GAME_PHASE_PLAYING,
        trickOverrides: [
          { card: createCards('9S')[0], playedBy: PLAYER_ROLES[1] },
          { card: createCards('10S')[0], playedBy: PLAYER_ROLES[2] },
          { card: createCards('QS')[0], playedBy: PLAYER_ROLES[3] },
        ],
        handOverrides: {
          [PLAYER_ROLES[0]]: createCards('AS'),
          [PLAYER_ROLES[1]]: createCards('KS'),
          [PLAYER_ROLES[2]]: createCards('JS'),
          [PLAYER_ROLES[3]]: createCards('10C'),
        },
        stateOverrides: { tricksTaken: { [TEAMS.TEAM_NS]: 2, [TEAMS.TEAM_EW]: 2 } }
      });
      const playerRole = gameState.currentPlayer;
      const cardToPlay = gameState.players[playerRole].hand[0];
      const newState = handlePlayCard.call(mockServices, gameState, playerRole, cardToPlay);
      assert.strictEqual(newState.gamePhase, GAME_PHASES.GAME_PHASE_SCORING);
    });

    /**
     * @test {handlePlayCard}
     * @description Verifies a PhaseLogicError is thrown if the determined trick winner has corrupted or missing team data.
     */
    it('should throw PhaseLogicError if the trick winner has no teamId', () => {
      const { gameState } = setupTestState({
        phase: GAME_PHASES.GAME_PHASE_PLAYING,
        trickOverrides: [
          { card: createCards('9S')[0], playedBy: PLAYER_ROLES[1] },
          { card: createCards('10S')[0], playedBy: PLAYER_ROLES[2] },
          { card: createCards('QS')[0], playedBy: PLAYER_ROLES[3] },
        ],
        handOverrides: { [PLAYER_ROLES[0]]: createCards('AS') }
      });
      const playerRole = gameState.currentPlayer;
      const cardToPlay = gameState.players[playerRole].hand[0];
      delete gameState.players[playerRole].teamId;
      assert.throws(() => handlePlayCard.call(mockServices, gameState, playerRole, cardToPlay), { name: 'PhaseLogicError' });
    });
  });

  /**
   * @describe Test suite for the `determineTrickWinner` function.
   */
  describe('determineTrickWinner', () => {
    /**
     * @test {determineTrickWinner}
     * @description Verifies that a TypeError is thrown if the function is called without the required dependencies (`getCardRank`, `getEffectiveSuit`) in its `this` context.
     */
    it('should throw TypeError if dependencies are not injected', () => {
      const trick = [ { card: createCards('9S')[0], playedBy: PLAYER_ROLES[0] }, { card: createCards('10S')[0], playedBy: PLAYER_ROLES[1] }, { card: createCards('QS')[0], playedBy: PLAYER_ROLES[2] }, { card: createCards('KS')[0], playedBy: PLAYER_ROLES[3] } ];
      assert.throws(() => determineTrickWinner.call({}, trick, CARD_SUITS.SPADES, PLAYER_ROLES[0]), { name: 'TypeError' });
    });

    /**
     * @test {determineTrickWinner}
     * @description Verifies a PhaseLogicError is thrown if the trick is incomplete (does not contain 4 cards).
     */
    it('should throw PhaseLogicError if trick does not have 4 cards', () => {
      const trick = [{ card: createCards('9S')[0], playedBy: PLAYER_ROLES[0] }];
      assert.throws(() => determineTrickWinner.call(mockServices, trick, CARD_SUITS.SPADES, PLAYER_ROLES[0]), { name: 'PhaseLogicError' });
    });

    /**
     * @test {determineTrickWinner}
     * @description Verifies a PhaseLogicError is thrown if the lead player of the trick is missing or null.
     */
    it('should throw PhaseLogicError if leadPlayerRole is missing', () => {
      const trick = [ { card: createCards('9S')[0], playedBy: PLAYER_ROLES[0] }, { card: createCards('10S')[0], playedBy: PLAYER_ROLES[1] }, { card: createCards('QS')[0], playedBy: PLAYER_ROLES[2] }, { card: createCards('KS')[0], playedBy: PLAYER_ROLES[3] } ];
      assert.throws(() => determineTrickWinner.call(mockServices, trick, CARD_SUITS.SPADES, null), { name: 'PhaseLogicError' });
    });

    /**
     * @test {determineTrickWinner}
     * @description Verifies winner determination based on the highest-ranking card of the led suit when no trump cards are played.
     */
    it('should determine the winner based on the highest rank of the led suit if no trump is played', () => {
      const trick = [ { card: createCards('9C')[0], playedBy: PLAYER_ROLES[0] }, { card: createCards('10C')[0], playedBy: PLAYER_ROLES[1] }, { card: createCards('QC')[0], playedBy: PLAYER_ROLES[2] }, { card: createCards('KC')[0], playedBy: PLAYER_ROLES[3] } ];
      const winner = determineTrickWinner.call(mockServices, trick, CARD_SUITS.SPADES, PLAYER_ROLES[0]);
      assert.strictEqual(winner, PLAYER_ROLES[3]);
    });

    /**
     * @test {determineTrickWinner}
     * @description Verifies that the highest trump card played wins the trick, regardless of the led suit or the rank of other non-trump cards.
     */
    it('should determine the winner based on the highest trump card', () => {
      const trick = [ { card: createCards('AC')[0], playedBy: PLAYER_ROLES[0] }, { card: createCards('KC')[0], playedBy: PLAYER_ROLES[1] }, { card: createCards('9S')[0], playedBy: PLAYER_ROLES[2] }, { card: createCards('QC')[0], playedBy: PLAYER_ROLES[3] } ];
      const winner = determineTrickWinner.call(mockServices, trick, CARD_SUITS.SPADES, PLAYER_ROLES[0]);
      assert.strictEqual(winner, PLAYER_ROLES[2]);
    });

    /**
     * @test {determineTrickWinner}
     * @description Verifies winner determination involving the Left Bower, ensuring it is correctly ranked as a high trump card.
     */
    it('should correctly identify the Left Bower as the winning card', () => {
      const trick = [ { card: createCards('AS')[0], playedBy: PLAYER_ROLES[0] }, { card: createCards('KS')[0], playedBy: PLAYER_ROLES[1] }, { card: createCards('JC')[0], playedBy: PLAYER_ROLES[2] }, { card: createCards('QS')[0], playedBy: PLAYER_ROLES[3] } ];
      const winner = determineTrickWinner.call(mockServices, trick, CARD_SUITS.SPADES, PLAYER_ROLES[0]);
      assert.strictEqual(winner, PLAYER_ROLES[2]);
    });
  });
});