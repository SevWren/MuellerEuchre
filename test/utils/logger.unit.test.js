import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import { DEBUG_LEVELS } from '../../src/config/constants.js';
import { createLoggerModule } from '../__mocks__/utils/logger.js';

describe('Logger Utility', () => {
  // These tests are for the pure functions which can be imported directly
  describe('Pure Function Tests (No Mocks)', async () => {
    const { getLogLevelFromEnv, createLogger } = await import('../../src/utils/logger.js');

    describe('getLogLevelFromEnv', () => {
      it('should prioritize LOG_LEVEL over DEBUG_LEVEL', () => {
        const env = { LOG_LEVEL: 'error', DEBUG_LEVEL: DEBUG_LEVELS.DEBUG };
        const { level } = getLogLevelFromEnv(env);
        assert.strictEqual(level, 'error');
      });

      it('should use default "info" level when no variables are set', () => {
        const { level } = getLogLevelFromEnv({});
        assert.strictEqual(level, 'info');
      });

      it('should return a warning for an invalid DEBUG_LEVEL', () => {
        const { level, warning } = getLogLevelFromEnv({ DEBUG_LEVEL: 'INVALID' });
        assert.strictEqual(level, 'info');
        assert.strictEqual(warning, "Invalid DEBUG_LEVEL: INVALID, defaulting to 'info'");
      });
    });

    describe('createLogger (Factory Test)', () => {
      it('should create a logger with redaction paths', (t, done) => {
        const logObject = { hand: ['AS', 'KS'], other: 'data' };
        const stream = new Writable({
          write(chunk, encoding, callback) {
            try {
              const log = JSON.parse(chunk.toString());
              assert.strictEqual(log.hand, '[Redacted]');
              assert.strictEqual(log.other, 'data');
              done();
            } catch (err) {
              done(err);
            }
            callback();
          }
        });
        const testLogger = createLogger({ level: 'info', redact: ['hand'] }, stream);
        testLogger.info(logObject);
      });
    });
  });

  describe('Module Initialization and Runtime Behavior', () => {
    let mockPinoInstance;
    let mockPino;
    let mockProcess;
    let mockConsole;

    beforeEach(() => {
      mockPinoInstance = {
        error: mock.fn(),
        warn: mock.fn(),
        info: mock.fn(),
        debug: mock.fn(),
        trace: mock.fn(),
        level: 'info',
      };
      mockPino = mock.fn(() => mockPinoInstance);
      mockProcess = { env: {} };
      mockConsole = { warn: mock.fn() };
    });

    afterEach(() => {
      mock.restoreAll();
    });

    it('should log a startup warning if DEBUG_LEVEL is invalid', () => {
      mockProcess.env.DEBUG_LEVEL = 'INVALID_LEVEL';
      createLoggerModule({ pino: mockPino, process: mockProcess, console: mockConsole });
      assert.strictEqual(mockConsole.warn.mock.callCount(), 1);
      const [warningMessage] = mockConsole.warn.mock.calls[0].arguments;
      assert.match(warningMessage, /Invalid DEBUG_LEVEL: INVALID_LEVEL/);
    });

    describe('log() Function', () => {
      it('should call the appropriate logger method for each level', () => {
        const { log } = createLoggerModule({ pino: mockPino, process: mockProcess, console: mockConsole });
        const testObj = { data: 'test' };

        log(DEBUG_LEVELS.ERROR, 'error message', testObj);
        assert.strictEqual(mockPinoInstance.error.mock.callCount(), 1);
        assert.deepStrictEqual(mockPinoInstance.error.mock.calls[0].arguments, [testObj, 'error message']);

        log(DEBUG_LEVELS.WARN, 'warn message', testObj);
        assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 1);
      });

      it('should handle context argument correctly', () => {
        const { log } = createLoggerModule({ pino: mockPino, process: mockProcess, console: mockConsole });
        const testObj = { data: 'payload' };
        const context = 'game-logic';
        log(DEBUG_LEVELS.INFO, 'message with context', testObj, context);
        assert.strictEqual(mockPinoInstance.info.mock.callCount(), 1);
        const [loggedObj] = mockPinoInstance.info.mock.calls[0].arguments;
        assert.deepStrictEqual(loggedObj, { ...testObj, context });
      });
    });

    describe('setDebugLevel() Function', () => {
      it('should log a warning and change the logger level property', () => {
        const { logger, setDebugLevel } = createLoggerModule({ pino: mockPino, process: mockProcess, console: mockConsole });
        setDebugLevel(DEBUG_LEVELS.LOG_LEVEL_DEBUG);
        assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 1);
        assert.strictEqual(logger.level, 'debug');
      });

      it('should handle unknown log levels gracefully', () => {
        const { logger, setDebugLevel } = createLoggerModule({ pino: mockPino, process: mockProcess, console: mockConsole });
        setDebugLevel('UNKNOWN_LEVEL');
        assert.strictEqual(mockPinoInstance.warn.mock.callCount(), 1);
        assert.strictEqual(logger.level, 'info');
      });
    });
  });
});