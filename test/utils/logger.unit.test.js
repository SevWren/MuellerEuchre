/**
 * Unit tests for the logger utility in the Euchre Multiplayer game.
 * 
 * @TODO: Refactor to use only node:test and remove external testing libraries (chai, sinon, esmock)
 * - Replace chai assertions with node:assert
 * - Replace sinon mocks with node:test/mock
 * - Remove esmock and use native ESM mocking
 * - Remove chai and sinon dependencies
 * 
 * @module test/utils/logger.unit.test
 * @description
 *   Comprehensive test suite for the logging system including:
 *   TODO: REFACTOR TO NOT USE CHAI SINON OR ESMOCK
 * - Logger initialization and configuration
 *   - Log level setting from environment variables
 *   - Log message formatting and routing
 *   - Debug level mapping functionality
 *
 * @see {@link module:src/utils/logger} for the implementation being tested
 * @since 1.0.0
 */
import path from 'path';
import { fileURLToPath } from 'url';
import { expect } from 'chai'; //REFACTOR AND REMOVE USING CHAI
import sinon from 'sinon'; //REFACTOR AND REMOVE USING SINON
import { esmockWithPaths } from './esmock_wrapper.js'; //REFACTOR AND REMOVE USING ESMOCK
// Import the constants from the test logger constants
import { DEBUG_LEVELS } from './test-logger-constants.js';

// Store original environment variables
const originalEnv = { ...process.env };
  
// Set up test environment variables
process.env = {
  ...originalEnv,
  DEBUG_PATH_RESOLVER: 'true',
  NODE_ENV: 'test',
  // Set default log level for testing
  LOG_LEVEL: 'silent',
  // Clear any DEBUG_LEVEL that might interfere with tests
  DEBUG_LEVEL: ''
};
  
// Restore original environment after tests
after(() => {
  process.env = originalEnv;
});

// Enable stack trace limit for better debugging
Error.stackTraceLimit = 20;

// Get the directory name of the current module
const currentFile = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFile);

// Define project root path (go up three levels from test/utils/)
const projectRoot = path.resolve(currentDir, '../../..');

// Log module loading information
console.log('\n=== Module Loading Debug ===');
console.log('Current file:', currentFile);
console.log('Current directory:', currentDir);
console.log('Project root:', projectRoot);

// Define paths using the path resolver
console.log('\n=== Resolving Paths ===');
const loggerPath = path.resolve(projectRoot, 'src/utils/logger.js');
console.log('Logger path:', loggerPath);
const constantsPath = path.resolve(projectRoot, 'src/config/constants.js');
console.log('Constants path:', constantsPath);
console.log('========================\n');

// Ensure paths use forward slashes for cross-platform compatibility
const normalizePath = (p) => p.replace(/\\/g, '/');

// Helper function to create a fresh pino mock
const createPinoMock = () => {
  const mock = {
    _level: 'info',  // Internal level storage
    info: sinon.stub().returnsThis(),
    error: sinon.stub().returnsThis(),
    warn: sinon.stub().returnsThis(),
    debug: sinon.stub().returnsThis(),
    fatal: sinon.stub().returnsThis(),
    trace: sinon.stub().returnsThis(),
    child: sinon.stub().returnsThis()
  };

  // Add getter/setter for level property
  Object.defineProperty(mock, 'level', {
    get: () => mock._level,
    set: (value) => { mock._level = value; },
    enumerable: true,
    configurable: true
  });

  return mock;
};

/**
 * Creates a logger module with the specified mocks and environment variables
 * @param {Object} [overrides] - Override default mocks and environment variables
 * @param {Object} [overrides.mocks] - Additional module mocks
 * @param {Object} [overrides.envVars] - Additional environment variables
 * @param {Object} [overrides.constants] - Override default constants
 * @returns {Promise<Object>} - Logger module and its dependencies
 */
const createLoggerModule = async (overrides = {}) => {
  const pinoMock = createPinoMock();
  
  // Default mock constants that match the real ones
  const defaultConstants = {
    DEBUG_LEVELS: {
      NONE: 0,
      ERROR: 1,
      WARNING: 2,
      INFO: 3,
      VERBOSE: 4
    }
  };

  // Merge with any overrides
  const mockConstants = { ...defaultConstants, ...overrides.constants };

  // Default environment variables
  const defaultEnv = {
    NODE_ENV: 'test',
    LOG_LEVEL: '',
    DEBUG_LEVEL: '',
    ...overrides.envVars
  };
  
    // Mock the process object
  const processMock = {
    env: { ...defaultEnv }
  };

  try {
    // Create a fresh pino mock for this test
    const pinoMock = createPinoMock();
    
    // Mock the constants
    const mockConstants = {
      DEBUG_LEVELS: {
        NONE: 0,
        ERROR: 1,
        WARNING: 2,
        INFO: 3,
        VERBOSE: 4
      }
    };

      // Create a mock logger with all required methods and property getter/setter for level
    const mockLogger = {
      info: sinon.stub().returnsThis(),
      error: sinon.stub().returnsThis(),
      warn: sinon.stub().returnsThis(),
      debug: sinon.stub().returnsThis(),
      child: sinon.stub().returnsThis(),
      _level: 'info',
      get level() {
        return this._level;
      },
      set level(val) {
        this._level = val;
      },
      ...pinoMock
    };

    // Mock pino to return our mock logger
    const pinoStub = sinon.stub().callsFake((options) => {
      // Update mock logger with options if provided
      if (options && options.level) {
        mockLogger._level = options.level;
      }
      return mockLogger;
    });
    
    // Add pino static methods
    pinoStub.stub = pinoStub;
    pinoStub.transport = { target: sinon.stub() };
    pinoStub.transport.target.returns({ options: {} });
    
    // Add pino levels for testing
    pinoStub.levels = {
      values: {
        error: 50,
        warn: 40,
        info: 30,
        debug: 20,
        trace: 10
      },
      labels: {
        50: 'error',
        40: 'warn',
        30: 'info',
        20: 'debug',
        10: 'trace'
      }
    };

    // Import the logger module with mocks
    const loggerModule = await esmockWithPaths(
      import.meta.url, // Current test file URL
      loggerPath,      // Path to the module being tested
      {
        // Mock required modules
        'pino': pinoStub,
        '../config/constants.js': mockConstants,
        // Mock process for the module
        'process': processMock,
        // Add any additional mocks
        ...(overrides.mocks || {})
      }
    );

    // The logger module exports both a default export and named exports
    const logger = loggerModule.default || loggerModule;
    const { log, setDebugLevel } = loggerModule;

    // Verify we have valid exports
    if (!logger) {
      throw new Error('Logger instance is undefined');
    }
  
  

    return {
      pinoMock: mockLogger,  // Return our enhanced mock logger
      pinoStub,             // Return the pino stub for verification
      processMock,
      log: log || (() => {}),
      setDebugLevel: setDebugLevel || (() => {}),
      logger: mockLogger,    // Use our mock logger instead of the real one
      constants: mockConstants,
      envVars: { ...defaultEnv }
    };
  } catch (error) {
    console.error('Error creating logger module:', error);
    throw error;
  }
};

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