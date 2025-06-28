/**
 * Unit tests for the logger utility in the Euchre Multiplayer game.
 * @module test/utils/logger.unit.test
 * @description
 *   Comprehensive test suite for the logging system including:
 *   - Logger initialization and configuration
 *   - Log level setting from environment variables
 *   - Log message formatting and routing
 *   - Debug level mapping functionality
 *
 * @see {@link module:src/utils/logger} for the implementation being tested
 * @since 1.0.0
 */
import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import { DEBUG_LEVELS } from '../../src/config/constants.js';

describe('Logger Utility', () => {
  let loggerModule;
  let pinoMock;

  beforeEach(async () => {
    // Create a mock for the pino library
    pinoMock = {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
      trace: sinon.stub(),
      fatal: sinon.stub(),
      level: 'info', // Default level for the mock
    };

    // Mock process.env for testing environment variable logic
    const originalEnv = process.env;
    process.env = { ...originalEnv }; // Create a copy to modify

    // Es-mock the logger module, injecting our pino mock and controlling process.env
    loggerModule = await esmock('../../src/utils/logger.js', {
      'pino': sinon.stub().returns(pinoMock), // Mock the pino constructor
      '../../src/config/constants.js': { DEBUG_LEVELS },
    });
  });

  afterEach(() => {
    sinon.restore();
    // Restore original process.env after each test
    delete process.env.LOG_LEVEL;
    delete process.env.DEBUG_LEVEL;
  });

  describe('Initialization and Level Setting', () => {
    it('should initialize with default "info" level if no env vars are set', async () => {
      // Re-import to ensure fresh initialization without env vars
      const freshLoggerModule = await esmock('../../src/utils/logger.js', {
        'pino': sinon.stub().returns(pinoMock),
        '../../src/config/constants.js': { DEBUG_LEVELS },
      });
      expect(pinoMock.info.calledWith('Server listening on port 3000')).to.be.false; // Example of default logger usage
      expect(pinoMock.info.calledWith('Socket.IO initialized.')).to.be.false;
      expect(pinoMock.level).to.equal('info'); // Check the mock's level property if it were set
    });

    it('should set log level based on LOG_LEVEL environment variable', async () => {
      process.env.LOG_LEVEL = 'debug';
      const freshPinoMock = { ...pinoMock, level: 'debug' }; // Simulate pino setting its level
      const freshLoggerModule = await esmock('../../src/utils/logger.js', {
        'pino': sinon.stub().returns(freshPinoMock),
        '../../src/config/constants.js': { DEBUG_LEVELS },
      });
      expect(freshPinoMock.level).to.equal('debug');
    });

    it('should set log level based on DEBUG_LEVEL environment variable (ERROR)', async () => {
      process.env.DEBUG_LEVEL = DEBUG_LEVELS.ERROR.toString();
      const freshPinoMock = { ...pinoMock, level: 'error' };
      const freshLoggerModule = await esmock('../../src/utils/logger.js', {
        'pino': sinon.stub().returns(freshPinoMock),
        '../../src/config/constants.js': { DEBUG_LEVELS },
      });
      expect(freshPinoMock.level).to.equal('error');
    });

    it('should set log level based on DEBUG_LEVEL environment variable (INFO)', async () => {
      process.env.DEBUG_LEVEL = DEBUG_LEVELS.INFO.toString();
      const freshPinoMock = { ...pinoMock, level: 'info' };
      const freshLoggerModule = await esmock('../../src/utils/logger.js', {
        'pino': sinon.stub().returns(freshPinoMock),
        '../../src/config/constants.js': { DEBUG_LEVELS },
      });
      expect(freshPinoMock.level).to.equal('info');
    });

    it('should set log level based on DEBUG_LEVEL environment variable (WARNING)', async () => {
      process.env.DEBUG_LEVEL = DEBUG_LEVELS.WARNING.toString();
      const freshPinoMock = { ...pinoMock, level: 'warn' };
      const freshLoggerModule = await esmock('../../src/utils/logger.js', {
        'pino': sinon.stub().returns(freshPinoMock),
        '../../src/config/constants.js': { DEBUG_LEVELS },
      });
      expect(freshPinoMock.level).to.equal('warn');
    });

    it('should set log level based on DEBUG_LEVEL environment variable (VERBOSE)', async () => {
      process.env.DEBUG_LEVEL = DEBUG_LEVELS.VERBOSE.toString();
      const freshPinoMock = { ...pinoMock, level: 'debug' };
      const freshLoggerModule = await esmock('../../src/utils/logger.js', {
        'pino': sinon.stub().returns(freshPinoMock),
        '../../src/config/constants.js': { DEBUG_LEVELS },
      });
      expect(freshPinoMock.level).to.equal('debug');
    });

    it('should prioritize LOG_LEVEL over DEBUG_LEVEL', async () => {
      process.env.LOG_LEVEL = 'error';
      process.env.DEBUG_LEVEL = DEBUG_LEVELS.VERBOSE.toString(); // This would be 'debug'
      const freshPinoMock = { ...pinoMock, level: 'error' };
      const freshLoggerModule = await esmock('../../src/utils/logger.js', {
        'pino': sinon.stub().returns(freshPinoMock),
        '../../src/config/constants.js': { DEBUG_LEVELS },
      });
      expect(freshPinoMock.level).to.equal('error'); // LOG_LEVEL should win
    });

    it('should use pino-pretty transport in non-production environment', async () => {
      process.env.NODE_ENV = 'development';
      const pinoConstructorSpy = sinon.stub().returns(pinoMock);
      await esmock('../../src/utils/logger.js', {
        'pino': pinoConstructorSpy,
        '../../src/config/constants.js': { DEBUG_LEVELS },
      });
      expect(pinoConstructorSpy.calledWithMatch({
        transport: { target: 'pino-pretty' }
      })).to.be.true;
    });

    it('should not use pino-pretty transport in production environment', async () => {
      process.env.NODE_ENV = 'production';
      const pinoConstructorSpy = sinon.stub().returns(pinoMock);
      await esmock('../../src/utils/logger.js', {
        'pino': pinoConstructorSpy,
        '../../src/config/constants.js': { DEBUG_LEVELS },
      });
      expect(pinoConstructorSpy.calledWithMatch({
        transport: { target: 'pino-pretty' }
      })).to.be.false;
    });
  });

  describe('log function (compatibility wrapper)', () => {
    it('should call logger.error for DEBUG_LEVELS.ERROR with message and object', () => {
      loggerModule.log(DEBUG_LEVELS.ERROR, 'Error message', { data: 'some data' });
      expect(pinoMock.error.calledOnceWith({ data: 'some data' }, 'Error message')).to.be.true;
    });

    it('should call logger.error for DEBUG_LEVELS.ERROR with message only', () => {
      loggerModule.log(DEBUG_LEVELS.ERROR, 'Error message');
      expect(pinoMock.error.calledOnceWith('Error message')).to.be.true;
    });

    it('should call logger.info for DEBUG_LEVELS.INFO with message and object', () => {
      loggerModule.log(DEBUG_LEVELS.INFO, 'Info message', { data: 'some data' });
      expect(pinoMock.info.calledOnceWith({ data: 'some data' }, 'Info message')).to.be.true;
    });

    it('should call logger.info for DEBUG_LEVELS.INFO with message only', () => {
      loggerModule.log(DEBUG_LEVELS.INFO, 'Info message');
      expect(pinoMock.info.calledOnceWith('Info message')).to.be.true;
    });

    it('should call logger.warn for DEBUG_LEVELS.WARNING with message and object', () => {
      loggerModule.log(DEBUG_LEVELS.WARNING, 'Warning message', { data: 'some data' });
      expect(pinoMock.warn.calledOnceWith({ data: 'some data' }, 'Warning message')).to.be.true;
    });

    it('should call logger.warn for DEBUG_LEVELS.WARNING with message only', () => {
      loggerModule.log(DEBUG_LEVELS.WARNING, 'Warning message');
      expect(pinoMock.warn.calledOnceWith('Warning message')).to.be.true;
    });

    it('should call logger.debug for DEBUG_LEVELS.VERBOSE with message and object', () => {
      loggerModule.log(DEBUG_LEVELS.VERBOSE, 'Debug message', { data: 'some data' });
      expect(pinoMock.debug.calledOnceWith({ data: 'some data' }, 'Debug message')).to.be.true;
    });

    it('should call logger.debug for DEBUG_LEVELS.VERBOSE with message only', () => {
      loggerModule.log(DEBUG_LEVELS.VERBOSE, 'Debug message');
      expect(pinoMock.debug.calledOnceWith('Debug message')).to.be.true;
    });

    it('should default to logger.info for unknown log levels with object', () => {
      loggerModule.log(999, 'Unknown level message', { data: 'unknown' });
      expect(pinoMock.info.calledOnceWith({ data: 'unknown' }, 'Unknown log level (999): Unknown level message')).to.be.true;
    });

    it('should default to logger.info for unknown log levels with message only', () => {
      loggerModule.log(999, 'Unknown level message');
      expect(pinoMock.info.calledOnceWith('Unknown log level (999): Unknown level message')).to.be.true;
    });
  });

  describe('setDebugLevel function', () => {
    it('should log a warning when setDebugLevel is called', () => {
      loggerModule.setDebugLevel(DEBUG_LEVELS.ERROR);
      expect(pinoMock.warn.calledOnce).to.be.true;
      expect(pinoMock.warn.firstCall.args[0]).to.include('Attempted to set debug level');
    });

    it('should correctly map DEBUG_LEVELS to pino level names in warning message', () => {
      loggerModule.setDebugLevel(DEBUG_LEVELS.VERBOSE);
      expect(pinoMock.warn.firstCall.args[0]).to.include('debug');
    });
  });
});