// filepath: test/game/logic/validation-errors.unit.test.js
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  ValidationError,
  NotPlayersTurnError,
  InvalidPhaseError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidBidError,
  InvalidDiscardError,
  PhaseLogicError,
  InvalidGoAloneError,
  InvalidCardError
} from '../../../src/game/logic/validation-errors.js';

/**
 * @file Unit tests for the custom error classes defined in `validation-errors.js`.
 * @see src/game/logic/validation-errors.js
 * @see test/game/logic/validation-errors.unit.test.js
 */

/**
 * Describes the test suite for custom error classes.
 * Verifies that each custom error class extends `Error` or `ValidationError` correctly,
 * has the correct name, and constructs messages and properties as expected.
 * @see src/game/logic/validation-errors.js
 * @see test/game/logic/validation-errors.unit.test.js
 */
describe('Custom Error Classes', () => {
  /**
   * Tests that `ValidationError` is an instance of the native `Error` class.
   * @see src/game/logic/validation-errors.js
   * @see test/game/logic/validation-errors.unit.test.js
   */
  it('ValidationError should be instance of Error', () => {
    const error = new ValidationError('Test');
    assert.ok(error instanceof Error);
  });

  /**
   * Tests that `ValidationError` has the correct `name` property and retains the provided `message`.
   * @see src/game/logic/validation-errors.js
   * @see test/game/logic/validation-errors.unit.test.js
   */
  it('ValidationError should have correct name and message', () => {
    const msg = 'Test message';
    const error = new ValidationError(msg);
    assert.strictEqual(error.name, 'ValidationError');
    assert.strictEqual(error.message, msg);
  });

  /**
   * Describes the test suite for the `NotPlayersTurnError` class.
   * @see src/game/logic/validation-errors.js
   * @see test/game/logic/validation-errors.unit.test.js
   */
  describe('NotPlayersTurnError', () => {
    /**
     * Tests that `NotPlayersTurnError` is an instance of `ValidationError`.
     * @see src/game/logic/validation-errors.js
     * @see test/game/logic/validation-errors.unit.test.js
     */
    it('should be instance of ValidationError', () => {
      const error = new NotPlayersTurnError('North', 'South');
      assert.ok(error instanceof ValidationError);
    });

    /**
     * Tests that `NotPlayersTurnError` has the correct `name` property.
     * @see src/game/logic/validation-errors.js
     * @see test/game/logic/validation-errors.unit.test.js
     */
    it('should have correct name', () => {
      const error = new NotPlayersTurnError('North', 'South');
      assert.strictEqual(error.name, 'NotPlayersTurnError');
    });

    /**
     * Tests that the default message for `NotPlayersTurnError` includes the player roles.
     * @see src/game/logic/validation-errors.js
     * @see test/game/logic/validation-errors.unit.test.js
     */
    it('should include player roles in default message', () => {
      const playerRole = 'North';
      const currentPlayer = 'South';
      const error = new NotPlayersTurnError(playerRole, currentPlayer);
      assert.match(error.message, new RegExp(playerRole));
      assert.match(error.message, new RegExp(currentPlayer));
    });

    /**
     * Tests that `NotPlayersTurnError` correctly stores `playerRole` and `currentPlayer` properties.
     * @see src/game/logic/validation-errors.js
     * @see test/game/logic/validation-errors.unit.test.js
     */
    it('should store playerRole and currentPlayer', () => {
      const playerRole = 'North';
      const currentPlayer = 'South';
      const error = new NotPlayersTurnError(playerRole, currentPlayer);
      assert.strictEqual(error.playerRole, playerRole);
      assert.strictEqual(error.currentPlayer, currentPlayer);
    });
  });

  /**
   * Describes the test suite for various other custom error classes.
   * @see src/game/logic/validation-errors.js
   * @see test/game/logic/validation-errors.unit.test.js
   */
  describe('Other Error Classes', () => {
    /**
     * Tests that `InvalidPhaseError` is an instance of `ValidationError`.
     * @see src/game/logic/validation-errors.js
     * @see test/game/logic/validation-errors.unit.test.js
     */
    it('InvalidPhaseError should be instance of ValidationError', () => {
      const error = new InvalidPhaseError('test action', 'current', 'expected');
      assert.ok(error instanceof ValidationError);
    });

    /**
     * Tests that `InvalidPhaseError` has the correct `name`, message, and stores its specific properties.
     * @see src/game/logic/validation-errors.js
     * @see test/game/logic/validation-errors.unit.test.js
     */
    it('InvalidPhaseError should have correct name and message', () => {
      const action = 'test action';
      const current = 'current';
      const expected = 'expected';
      const error = new InvalidPhaseError(action, current, expected);
      assert.strictEqual(error.name, 'InvalidPhaseError');
      assert.strictEqual(
        error.message,
        `Cannot ${action} during the ${current} phase. Expected ${expected}.`
      );
      assert.strictEqual(error.action, action);
      assert.strictEqual(error.currentPhase, current);
      assert.strictEqual(error.expectedPhase, expected);
    });

    /**
     * Tests that `CardNotInHandError` is an instance of `ValidationError`.
     * @see src/game/logic/validation-errors.js
     * @see test/game/logic/validation-errors.unit.test.js
     */
    it('CardNotInHandError should be instance of ValidationError', () => {
      const error = new CardNotInHandError('card123', ['card1', 'card2']);
      assert.ok(error instanceof ValidationError);
    });

    /**
     * Tests that `CardNotInHandError` has the correct `name`, message, and stores its specific properties.
     * @see src/game/logic/validation-errors.js
     * @see test/game/logic/validation-errors.unit.test.js
     */
    it('CardNotInHandError should have correct name and message', () => {
      const cardId = 'card123';
      const hand = ['card1', 'card2'];
      const error = new CardNotInHandError(cardId, hand);
      assert.strictEqual(error.name, 'CardNotInHandError');
      assert.strictEqual(
        error.message,
        `Card with ID '${cardId}' not found in player's hand.`
      );
      assert.strictEqual(error.cardId, cardId);
      assert.deepStrictEqual(error.playerHandIds, hand);
    });

    /**
     * Tests that `MustFollowSuitError` is an instance of `ValidationError`.
     * @see src/game/logic/validation-errors.js
     * @see test/game/logic/validation-errors.unit.test.js
     */
    it('MustFollowSuitError should be instance of ValidationError', () => {
      const error = new MustFollowSuitError('hearts', 'spades');
      assert.ok(error instanceof ValidationError);
    });

    /**
     * Tests that `MustFollowSuitError` has the correct `name`, message, and stores its specific properties.
     * @see src/game/logic/validation-errors.js
     * @see test/game/logic/validation-errors.unit.test.js
     */
    it('MustFollowSuitError should have correct name and message', () => {
      const ledSuit = 'hearts';
      const playedSuit = 'spades';
      const error = new MustFollowSuitError(ledSuit, playedSuit);
      assert.strictEqual(error.name, 'MustFollowSuitError');
      assert.strictEqual(
        error.message,
        `Must follow suit. Led suit is ${ledSuit}, attempted to play a card of ${playedSuit}.`
      );
      assert.strictEqual(error.ledSuit, ledSuit);
      assert.strictEqual(error.playedSuit, playedSuit);
    });

    /**
     * Defines a collection of other error classes to be tested generically.
     * Each object specifies the error `name`, a `factory` function to create an instance,
     * and optional `props` to verify specific properties on the error object.
     * @type {Array<Object>}
     * @property {string} name - The name of the error class.
     * @property {function(): ValidationError} factory - A function that returns an instance of the error class.
     * @property {Object} [props] - Optional properties to check on the created error instance.
     */
    [
      {
        name: 'InvalidBidError',
        factory: () => new InvalidBidError('Test message', { decision: 'pass' }),
        props: { details: { decision: 'pass' } }
      },
      {
        name: 'InvalidDiscardError',
        factory: () => new InvalidDiscardError('Test message', { card: { id: 'test' } }),
        props: { details: { card: { id: 'test' } } }
      },
      {
        name: 'PhaseLogicError',
        factory: () => new PhaseLogicError('Test message'),
      },
      {
        name: 'InvalidGoAloneError',
        factory: () => new InvalidGoAloneError('Test message'),
      },
      {
        name: 'InvalidCardError',
        factory: () => new InvalidCardError('Test message', { id: 'test' }),
        props: { card: { id: 'test' } }
      }
    ].forEach(({ name, factory, props = {} }) => {
      /**
       * Tests that a specific error class (`${name}`) is an instance of `ValidationError`.
       * @param {string} name - The name of the error class being tested in this iteration.
       * @param {function(): ValidationError} factory - The factory function for the error.
       * @see src/game/logic/validation-errors.js
       * @see test/game/logic/validation-errors.unit.test.js
       */
      it(`${name} should be instance of ValidationError`, () => {
        const error = factory();
        assert.ok(error instanceof ValidationError);
      });

      /**
       * Tests that a specific error class (`${name}`) has the correct `name`, message, and specific properties.
       * @param {string} name - The name of the error class being tested in this iteration.
       * @param {function(): ValidationError} factory - The factory function for the error.
       * @param {Object} props - The expected properties to check on the error instance.
       * @see src/game/logic/validation-errors.js
       * @see test/game/logic/validation-errors.unit.test.js
       */
      it(`${name} should have correct name and message`, () => {
        const error = factory();
        assert.strictEqual(error.name, name);
        assert.strictEqual(error.message, 'Test message');

        // Check additional properties if any
        Object.entries(props).forEach(([prop, value]) => {
          if (typeof value === 'object' && value !== null) {
            assert.deepStrictEqual(error[prop], value);
          } else {
            assert.strictEqual(error[prop], value);
          }
        });
      });
    });
  });
});