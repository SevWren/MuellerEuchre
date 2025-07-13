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
  let log, setDebugLevel, logger;
  let pinoMock;
  let originalEnv;

  beforeEach(() => {
    // Store original environment variables
    originalEnv = { ...process.env };
    
    // Clear test environment variables
    delete process.env.DEBUG;
    delete process.env.DEBUG_LEVEL;
    delete process.env.LOG_LEVEL;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
    
    // Restore stubs
    sinon.restore();
  });

  describe('Initialization', () => {
    it('should initialize with default "info" level if no env vars are set', async () => {
      const { pinoMock } = await createLoggerModule({
        envVars: {
          LOG_LEVEL: undefined,
          DEBUG_LEVEL: undefined
        }
      });
      
      // Verify the logger was created with the correct level
      const call = pinoStub.getCall(0);
      expect(call.args[0].level).to.equal('info');
    });

    it('should set log level based on LOG_LEVEL environment variable', async () => {
      const { logger, pinoStub } = await createLoggerModule({
        envVars: { LOG_LEVEL: 'debug' }
      });
      
      // Verify the logger was created with the correct level
      const call = pinoStub.getCall(0);
      expect(call.args[0].level).to.equal('debug');
    });
  });

  describe('Log Level Configuration', () => {
    // Parameterized test for different log levels
    [
      { level: 'error', value: DEBUG_LEVELS.ERROR },
      { level: 'info', value: DEBUG_LEVELS.INFO },
      { level: 'warn', value: DEBUG_LEVELS.WARNING },
      { level: 'debug', value: DEBUG_LEVELS.VERBOSE }
    ].forEach(({ level, value }) => {
      it(`should set log level to ${level} when DEBUG_LEVEL is ${value}`, async () => {
        const { pinoStub } = await createLoggerModule({
          envVars: { DEBUG_LEVEL: value.toString() }
        });
        
        // Verify the logger was created with the correct level
        const call = pinoStub.getCall(0);
        expect(call.args[0].level).to.equal(level);
      });
    });

    it('should prioritize LOG_LEVEL over DEBUG_LEVEL', async () => {
      const { pinoStub } = await createLoggerModule({
        envVars: { LOG_LEVEL: 'error', DEBUG_LEVEL: '4' }
      });
      
      // Verify the logger was created with the correct level
      const call = pinoStub.getCall(0);
      expect(call.args[0].level).to.equal('error');
    });

    it('should handle invalid log levels', async () => {
      const { logger, pinoStub } = await createLoggerModule({
        envVars: { LOG_LEVEL: 'invalid' }
      });
      
      // Verify the logger was created with the default level
      const call = pinoStub.getCall(0);
      expect(call.args[0].level).to.equal('info');
    });
  });

  describe('Transport Configuration', () => {
    it('should use pino-pretty transport in non-production environment', async () => {
      const { pinoStub } = await createLoggerModule({
        envVars: { NODE_ENV: 'development' }
      });
      
      // Verify pino was called with transport options
      const call = pinoStub.getCall(0);
      expect(call.args[0].transport).to.exist;
      expect(call.args[0].transport.target).to.equal('pino-pretty');
    });

    it('should not use pino-pretty transport in production environment', async () => {
      const { pinoStub } = await createLoggerModule({
        envVars: { NODE_ENV: 'production' }
      });
      
      // Verify pino was not called with transport options
      const call = pinoStub.getCall(0);
      expect(call.args[0].transport).to.not.exist;
    });
  });

  describe('Logging Functions', () => {
    it('should call logger.error for DEBUG_LEVELS.ERROR with message and object', async () => {
      const { mockLogger, log, constants } = await createLoggerModule();
      const error = new Error('Test error');
      log(constants.DEBUG_LEVELS.ERROR, 'Test error', error);
      expect(mockLogger.error.calledWith(error, 'Test error')).to.be.true;
    });

    it('should call logger.warn for DEBUG_LEVELS.WARNING', async () => {
      const { mockLogger, log, constants } = await createLoggerModule();
      log(constants.DEBUG_LEVELS.WARNING, 'Warning message');
      expect(mockLogger.warn.calledWith('Warning message')).to.be.true;
    });

    it('should call logger.info for DEBUG_LEVELS.INFO', async () => {
      const { mockLogger, log, constants } = await createLoggerModule();
      log(constants.DEBUG_LEVELS.INFO, 'Info message');
      expect(mockLogger.info.calledWith('Info message')).to.be.true;
    });

    it('should call logger.debug for DEBUG_LEVELS.VERBOSE', async () => {
      const { mockLogger, log, constants } = await createLoggerModule({
        envVars: { LOG_LEVEL: 'debug' }
      });
      
      // Test debug logging - only works when log level is debug or higher
      log(constants.DEBUG_LEVELS.VERBOSE, 'Test debug', { debug: true });
      expect(mockLogger.debug.calledWith('Test debug', { debug: true })).to.be.true;
    });

    it('should not log below the current log level', async () => {
      const { mockLogger, log, constants } = await createLoggerModule({
        envVars: { LOG_LEVEL: 'warn' }
      });
      
      // This should not be logged
      log(constants.DEBUG_LEVELS.INFO, 'This should not be logged', { test: true });
      expect(mockLogger.info.called).to.be.false;
    });

    it('should handle setDebugLevel function', async () => {
      const { mockLogger, setDebugLevel, constants } = await createLoggerModule();
      
      // Test setting debug level
      setDebugLevel(constants.DEBUG_LEVELS.VERBOSE);
      // Verify the warning was logged
      expect(mockLogger.warn.called).to.be.true;
    });
  });

  describe('Error Handling', () => {
    it('should handle missing log level in constants', async () => {
      const { log, mockLogger } = await createLoggerModule({
        mocks: {
          '../config/constants.js': { DEBUG_LEVELS: {} }
        }
      });
      log(999, 'Test');
      // Should default to info level
      expect(mockLogger.info.calledWith('Test')).to.be.true;
    });

    it('should handle missing message', async () => {
      const { log, mockLogger } = await createLoggerModule();
      log(1);
      // Should not throw and should log something
      expect(mockLogger.error.called).to.be.true;
    });

    it('should handle missing pino instance', async () => {
      const { log } = await createLoggerModule({
        mocks: {
          'pino': () => null
        }
      });
      // Should not throw even if pino is not available
      expect(() => log(1, 'Test')).to.not.throw();
    });
    
    it('should handle unknown log levels', async () => {
      const { log, mockLogger } = await createLoggerModule();
      log(999, 'Test');
      // Should default to info level for unknown levels
      expect(mockLogger.info.calledWith('Test')).to.be.true;
    });
  });

  describe('setDebugLevel function', () => {
    it('should log a warning when setDebugLevel is called', async () => {
      const { mockLogger, setDebugLevel, constants } = await createLoggerModule();
      setDebugLevel(constants.DEBUG_LEVELS.ERROR);
      expect(mockLogger.warn.called).to.be.true;
    });

    it('should correctly map DEBUG_LEVELS to pino level names in warning message', async () => {
      const { mockLogger, setDebugLevel, constants } = await createLoggerModule();
      setDebugLevel(constants.DEBUG_LEVELS.ERROR);
      const warningMessage = mockLogger.warn.getCall(0).args[0];
      expect(warningMessage).to.include('error');
    });
  });
});
