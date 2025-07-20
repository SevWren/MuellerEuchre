// filepath: test/game/logic/errors.unit.test.js
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

describe('Custom Error Classes', () => {
  it('ValidationError should be instance of Error', () => {
    const error = new ValidationError('Test');
    assert.ok(error instanceof Error);
  });

  it('ValidationError should have correct name and message', () => {
    const msg = 'Test message';
    const error = new ValidationError(msg);
    assert.strictEqual(error.name, 'ValidationError');
    assert.strictEqual(error.message, msg);
  });

  describe('NotPlayersTurnError', () => {
    it('should be instance of ValidationError', () => {
      const error = new NotPlayersTurnError('North', 'South');
      assert.ok(error instanceof ValidationError);
    });

    it('should have correct name', () => {
      const error = new NotPlayersTurnError('North', 'South');
      assert.strictEqual(error.name, 'NotPlayersTurnError');
    });

    it('should include player roles in default message', () => {
      const playerRole = 'North';
      const currentPlayer = 'South';
      const error = new NotPlayersTurnError(playerRole, currentPlayer);
      assert.match(error.message, new RegExp(playerRole));
      assert.match(error.message, new RegExp(currentPlayer));
    });

    it('should store playerRole and currentPlayer', () => {
      const playerRole = 'North';
      const currentPlayer = 'South';
      const error = new NotPlayersTurnError(playerRole, currentPlayer);
      assert.strictEqual(error.playerRole, playerRole);
      assert.strictEqual(error.currentPlayer, currentPlayer);
    });
  });

  describe('Other Error Classes', () => {
    const testCases = [
      { class: InvalidPhaseError, name: 'InvalidPhaseError' },
      { class: CardNotInHandError, name: 'CardNotInHandError' },
      { class: MustFollowSuitError, name: 'MustFollowSuitError' },
      { class: InvalidBidError, name: 'InvalidBidError' },
      { class: InvalidDiscardError, name: 'InvalidDiscardError' },
      { class: PhaseLogicError, name: 'PhaseLogicError' },
      { class: InvalidGoAloneError, name: 'InvalidGoAloneError' },
      { class: InvalidCardError, name: 'InvalidCardError' }
    ];

    testCases.forEach(({ class: ErrorClass, name }) => {
      it(`${name} should be instance of ValidationError`, () => {
        const error = new ErrorClass('Test');
        assert.ok(error instanceof ValidationError);
      });

      it(`${name} should have correct name and message`, () => {
        const msg = 'Test message';
        const error = new ErrorClass(msg);
        assert.strictEqual(error.name, name);
        assert.strictEqual(error.message, msg);
      });
    });
  });
});
