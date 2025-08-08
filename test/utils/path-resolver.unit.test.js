/**
 * @file test/utils/path-resolver.unit.test.js
 * @module test/utils/path-resolver.unit
 * @description
 *   Comprehensive unit tests for the `path-resolver` utility module.
 *   This suite rigorously verifies the module's ability to correctly resolve
 *   various types of file paths (absolute, relative, aliased) across different
 *   environments (production, test) and operating systems (Windows compatibility).
 *
 *   It also tests error handling for invalid paths, security constraints (path traversal),
 *   and the integrity of its internal alias caching mechanism.
 *
 * @requires node:test
 * @requires node:assert
 * @requires node:path
 * @requires node:url
 * @requires node:fs
 * @see {@link module:src/utils/path-resolver} for the implementation being tested.
 * @see {@link module:test/test-utils/mock-logger} for mock logger setup.
 */

import { test, mock } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
// Import the mock logger utility and actual logger
import { createMockLogger } from '../test-utils/mock-logger.js';
import logger from '../../src/utils/logger.js';

/**
 * Mock logger instance used for capturing log calls during tests.
 * @private
 * @type {object}
 */
const mockLogger = createMockLogger();
/**
 * Stores original logger methods to restore them after tests.
 * @private
 * @type {object}
 */
const originalLoggerMethods = {
  error: logger.error,
  warn: logger.warn,
  info: logger.info,
  debug: logger.debug,
  trace: logger.trace
};

// Replace logger methods with mocks
Object.assign(logger, {
  error: mockLogger.error,
  warn: mockLogger.warn,
  info: mockLogger.info,
  debug: mockLogger.debug,
  trace: mockLogger.trace
});

/**
 * Restores original logger methods after all tests in this file have completed.
 * @private
 */
test.after(() => {
  Object.assign(logger, originalLoggerMethods);
});

/**
 * Original `fs.promises.readFile` method.
 * @private
 * @type {function}
 */
const originalFsPromises = {
  readFile: fs.promises.readFile,
  access: fs.promises.access
};

/**
 * Original `fs.existsSync` method.
 * @private
 * @type {function}
 */
const originalFs = {
  existsSync: fs.existsSync
};

/**
 * Mock object for `fs.promises` methods.
 * @private
 * @type {object}
 */
const fsPromisesMock = {
  readFile: mock.fn(),
  access: mock.fn()
};

/**
 * Mock object for `fs` methods.
 * @private
 * @type {object}
 */
const fsMock = {
  existsSync: mock.fn(),
  constants: {
    R_OK: 4
  }
};

// Apply mocks to `fs.promises` and `fs`
mock.method(fs.promises, 'readFile', fsPromisesMock.readFile);
mock.method(fs.promises, 'access', fsPromisesMock.access);
mock.method(fs, 'existsSync', fsMock.existsSync);

/**
 * Imports the module under test.
 * @private
 * @type {object}
 */
import {
  getTestMockPath,
  clearAliasCache,
  PathResolutionError,
  resolvePath
} from '../../src/utils/path-resolver.js';

/**
 * Original `process.env` object.
 * @private
 * @type {object}
 */
const originalProcessEnv = { ...process.env };
/**
 * Original `global.MOCK_FS` object.
 * @private
 * @type {object}
 */
const originalGlobalMockFs = global.MOCK_FS;

/**
 * The absolute path to the current test file.
 * @private
 * @type {string}
 */
const __filename = fileURLToPath(import.meta.url);
/**
 * The directory name of the current test file.
 * @private
 * @type {string}
 */
const __dirname = path.dirname(__filename);
/**
 * The absolute path to the project root directory for testing.
 * @private
 * @type {string}
 */
const TEST_PROJECT_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Sets up the test environment before each test.
 * Resets mocks, clears alias cache, and configures `global.MOCK_FS`.
 * @private
 */
test.beforeEach(async () => {
  clearAliasCache();
  mock.reset();
  
  fsPromisesMock.readFile = mock.fn();
  fsPromisesMock.access = mock.fn();
  fsMock.existsSync = mock.fn();

  /**
   * Mock `jsconfig.json` content for testing.
   * @private
   * @type {object}
   */
  const mockJsConfig = {
    compilerOptions: {
      baseUrl: '.',
      paths: {
        "@/*": ["src/*"],
        "@config/*": ["src/config/*"],
        "@utils/*": ["src/utils/*"],
        "@overlapping/path/*": ["src/overlapping/path/*"],
        "@overlapping/*": ["src/overlapping/*"],
        "@mocked/*": ["src/mocked/*"],
        "@test/*": ["test/*"],
        "@public/*": ["public/*"]
      }
    }
  };

  // Create a deep copy of the mockJsConfig to prevent test interference
  const mockJsConfigCopy = JSON.parse(JSON.stringify(mockJsConfig));
  
  /**
   * Global mock file system object for simulating file system interactions in tests.
   * Keys are normalized file paths, values are file contents or empty objects for directories.
   * @private
   * @type {object}
   */
  global.MOCK_FS = {
    [path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/')]: mockJsConfigCopy,
    [path.join(TEST_PROJECT_ROOT, 'src', 'config', 'constants.js').replace(/\\/g, '/')]: '// Mock file',
    [path.join(TEST_PROJECT_ROOT, 'src', 'utils', 'logger.js').replace(/\\/g, '/')]: '// Mock file',
    [path.join(TEST_PROJECT_ROOT, 'src', 'some', 'module.js').replace(/\\/g, '/')]: '// Mock file',
    [path.join(TEST_PROJECT_ROOT, 'src', 'overlapping', 'path', 'deep.js').replace(/\\/g, '/')]: '// Mock file',
    [path.join(TEST_PROJECT_ROOT, 'src', 'overlapping', 'shallow.js').replace(/\\/g, '/')]: '// Mock file',
    [path.join(TEST_PROJECT_ROOT, 'test', 'some-test.js').replace(/\\/g, '/')]: '// Mock file',
    [path.join(TEST_PROJECT_ROOT, 'src', 'mocked', 'file.js').replace(/\\/g, '/')]: '// Mock file for @mocked/file',
    [path.join(TEST_PROJECT_ROOT, 'src').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'src', 'config').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'src', 'utils').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'src', 'some').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'src', 'overlapping').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'src', 'overlapping', 'path').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'src', 'mocked').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'test').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'public').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'package.json').replace(/\\/g, '/')]: JSON.stringify({
      name: 'mueller-euchre',
      version: '1.0.0',
      private: true
    })
  };

  // Mock `fs.promises.readFile` to read from `global.MOCK_FS`
  fsPromisesMock.readFile.mock.mockImplementation(async (filePath) => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (global.MOCK_FS && normalizedPath in global.MOCK_FS) {
      const content = global.MOCK_FS[normalizedPath];
      if (content === undefined) {
        throw new Error(`File not found in mock FS: ${normalizedPath}`);
      }
      return typeof content === 'object' ? JSON.stringify(content) : content;
    }
    const error = new Error(`File not found: ${filePath}`);
    error.code = 'ENOENT';
    throw error;
  });

  // Mock `fs.promises.access` to check existence in `global.MOCK_FS`
  fsPromisesMock.access.mock.mockImplementation(async (filePath) => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (global.MOCK_FS && (normalizedPath in global.MOCK_FS)) {
      return Promise.resolve();
    }
    const error = new Error(`ENOENT: no such file or directory, access '${filePath}'`);
    error.code = 'ENOENT';
    return Promise.reject(error);
  });

  // Mock `fs.existsSync` to check existence in `global.MOCK_FS`
  fsMock.existsSync.mock.mockImplementation((filePath) => {
    if (!filePath) return false;
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    if (!global.MOCK_FS) return false;
    return (normalizedPath in global.MOCK_FS);
  });
  
  process.env.NODE_ENV = 'test';

  // Use a cache-buster to ensure a fresh import of the module under test
  const cacheBuster = `?t=${Date.now()}`;
  const { clearAliasCache: freshClearAliasCache } = await import(`../../src/utils/path-resolver.js${cacheBuster}`);
  freshClearAliasCache();
});

/**
 * Cleans up the test environment after each test.
 * Restores original environment variables and `global.MOCK_FS`.
 * @private
 */
test.afterEach(() => {
  // Restore process.env
  process.env = originalProcessEnv;
  
  // Clear alias cache
  clearAliasCache();
  
  // Reset the mock file system if it exists
  if (global.MOCK_FS) {
    global.MOCK_FS = originalGlobalMockFs;
  }
  
  // Reset all mocks
  mock.reset();
});

/**
 * Test suite for `getTestMockPath` function.
 * @see {@link module:src/utils/path-resolver.getTestMockPath}
 */
test('getTestMockPath() should return correct paths for test mocks', async (t) => {
  const testFileUrl = `file://${path.join(TEST_PROJECT_ROOT, 'test', 'some-test.js')}`;

  /**
   * @test {getTestMockPath} Should resolve relative import paths correctly in test environment.
   */
  await t.test('should resolve relative import paths correctly in test environment', () => {
    process.env.NODE_ENV = 'test';
    const importPath = '../src/config/constants.js';
    const expectedPath = 'src/config/constants.js';
    const result = getTestMockPath(testFileUrl, importPath);
    assert.strictEqual(result, expectedPath);
  });

  /**
   * @test {getTestMockPath} Should return non-relative import paths as-is in test environment.
   */
  await t.test('should return non-relative import paths as-is in test environment', () => {
    process.env.NODE_ENV = 'test';
    const importPath = 'some-npm-module';
    const result = getTestMockPath(testFileUrl, importPath);
    assert.strictEqual(result, importPath);
  });

  /**
   * @test {getTestMockPath} Should return original import path if not in test environment.
   */
  await t.test('should return original import path if not in test environment', () => {
    process.env.NODE_ENV = 'production';
    const importPath = '../src/config/constants.js';
    const result = getTestMockPath(testFileUrl, importPath);
    assert.strictEqual(result, importPath);
  });
});

/**
 * Helper function to find the project root for testing purposes.
 * @private
 * @param {string} startDir - The directory to start searching from.
 * @returns {string} The project root path.
 */
function findProjectRoot(startDir) {
  let current = path.resolve(startDir);
  while (current !== path.dirname(current)) {
    const packagePath = path.join(current, 'package.json');
    if (fsMock.existsSync(packagePath)) {
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}

/**
 * Test suite for `findProjectRoot` helper function.
 * @see {@link module:src/utils/path-resolver.findProjectRoot}
 */
test('findProjectRoot() helper should correctly find the project root', async (t) => {
  const currentDir = path.join(TEST_PROJECT_ROOT, 'src', 'utils');

  /**
   * @test {findProjectRoot} Should find `package.json` in a parent directory.
   */
  await t.test('should find package.json in a parent directory', () => {
    fsMock.existsSync.mock.mockImplementationOnce((filePath) => {
      return filePath === path.join(TEST_PROJECT_ROOT, 'package.json');
    });
    const result = findProjectRoot(currentDir);
    assert.strictEqual(result, TEST_PROJECT_ROOT);
  });

  /**
   * @test {findProjectRoot} Should return `process.cwd()` if `package.json` is not found.
   */
  await t.test('should return process.cwd() if package.json is not found', () => {
    fsMock.existsSync.mock.mockImplementation(() => false);
    const result = findProjectRoot(currentDir);
    assert.strictEqual(result, process.cwd());
  });
});

/**
 * Test suite for `clearAliasCache` function.
 * @see {@link module:src/utils/path-resolver.clearAliasCache}
 */
test('clearAliasCache() should clear the internal alias cache', async (t) => {
  /**
   * @test {clearAliasCache} Should clear the cache, forcing re-initialization on next `resolvePath` call.
   */
  await t.test('should clear the cache, forcing re-initialization on next resolvePath call', async () => {
    await resolvePath('@utils/logger.js');
    assert.strictEqual(fsPromisesMock.readFile.mock.callCount(), 0); // No readFile call due to MOCK_FS
    clearAliasCache();
    await resolvePath('@utils/logger.js');
    assert.strictEqual(fsPromisesMock.readFile.mock.callCount(), 0); // Still no readFile call due to MOCK_FS
  });
});

/**
 * Test suite for `PathResolutionError` class.
 * @see {@link module:src/utils/path-resolver.PathResolutionError}
 */
test('PathResolutionError should be a custom error class', async (t) => {
  /**
   * @test {PathResolutionError} Should have correct name and message.
   */
  await t.test('should have correct name and message', () => {
    const error = new PathResolutionError('Test message', 'test-specifier');
    assert.strictEqual(error.name, 'PathResolutionError');
    assert.strictEqual(error.message, 'Test message');
    assert.strictEqual(error.specifier, 'test-specifier');
    assert.strictEqual(error.cause, null);
  });

  /**
   * @test {PathResolutionError} Should include cause in stack trace.
   */
  await t.test('should include cause in stack trace', () => {
    const causeError = new Error('Underlying cause');
    const error = new PathResolutionError('Test message', 'test-specifier', causeError);
    assert.strictEqual(error.cause, causeError);
  });
});

/**
 * Test suite for `loadJsConfig` function.
 * @see {@link module:src/utils/path-resolver.loadJsConfig}
 */
test('loadJsConfig() should load and parse jsconfig.json', async (t) => {
  const originalMockFs = { ...global.MOCK_FS };
  const originalEnv = { ...process.env };
  
  /**
   * @test {loadJsConfig} Should successfully load and parse `jsconfig.json` from mock FS in test environment.
   */
  await t.test('should successfully load and parse jsconfig.json from mock FS in test environment', async () => {
    process.env.NODE_ENV = 'test';
    const jsconfigPath = path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
    
    // Create a fresh mock FS for this test
    global.MOCK_FS = {
      ...global.MOCK_FS,
      [jsconfigPath]: {
        compilerOptions: {
          baseUrl: '.',
          paths: { "@/*": ["src/*"] }
        }
      }
    };
    
    // This should use the mock FS and not call readFile
    await resolvePath('@/some/module.js');
    assert.strictEqual(fsPromisesMock.readFile.mock.callCount(), 0);
  });

  /**
   * @test {loadJsConfig} Should throw `PathResolutionError` if `jsconfig.json` is not found.
   */
  await t.test('should throw PathResolutionError if jsconfig.json is not found', async () => {
    process.env.NODE_ENV = 'test';
    const jsconfigPath = path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
    
    // Remove jsconfig from mock FS for this test
    global.MOCK_FS = { ...originalMockFs };
    delete global.MOCK_FS[jsconfigPath];
    
    // Mock readFile to throw ENOENT error
    fsPromisesMock.readFile.mock.mockImplementationOnce(() => {
      const error = new Error('File not found');
      error.code = 'ENOENT';
      throw error;
    });
    
    await assert.rejects(
      resolvePath('@/some/path'),
      (err) => {
        return err instanceof PathResolutionError && 
               err.message.includes('Failed to load or parse jsconfig.json');
      }
    );
  });

  /**
   * @test {loadJsConfig} Should throw `PathResolutionError` if `jsconfig.json` is malformed.
   */
  await t.test('should throw PathResolutionError if jsconfig.json is malformed', async () => {
    process.env.NODE_ENV = 'test';
    const jsconfigPath = path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
    
    // Set invalid JSON in mock FS
    global.MOCK_FS = {
      ...global.MOCK_FS,
      [jsconfigPath]: 'this is not valid json'
    };
    
    await assert.rejects(
      resolvePath('@/some/path'),
      (err) => {
        return err instanceof PathResolutionError && 
               err.message.includes('Failed to load or parse jsconfig.json');
      }
    );
  });
  
  // Restore original state
  global.MOCK_FS = originalMockFs;
  process.env = originalEnv;
});

/**
 * Test suite for `initAliasCache` function.
 * @see {@link module:src/utils/path-resolver.initAliasCache}
 */
test('initAliasCache() should initialize the alias cache', async (t) => {
  const originalMockFs = { ...global.MOCK_FS };
  const originalEnv = { ...process.env };
  
  // Setup test environment
  process.env.NODE_ENV = 'test';
  
  /**
   * @test {initAliasCache} Should correctly populate alias cache with valid `jsconfig`.
   */
  await t.test('should correctly populate alias cache with valid jsconfig', async () => {
    // Setup mock file system with valid jsconfig
    const jsconfigPath = path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
    const existentPath = path.join(TEST_PROJECT_ROOT, 'src', 'existent', 'file.js').replace(/\\/g, '/');
    
    global.MOCK_FS = {
      ...global.MOCK_FS,
      [jsconfigPath]: {
        compilerOptions: {
          baseUrl: '.',
          paths: {
            "@config/*": ["src/config/*"],
            "@utils/*": ["src/utils/*"],
            "@existent/*": ["src/existent/*"]
          }
        }
      },
      [existentPath]: '// content',
      [path.join(TEST_PROJECT_ROOT, 'src', 'config', 'constants.js').replace(/\\/g, '/')]: '// mock constants',
      [path.join(TEST_PROJECT_ROOT, 'src', 'utils', 'logger.js').replace(/\\/g, '/')]: '// mock logger',
      // Add the directory to the mock FS
      [path.join(TEST_PROJECT_ROOT, 'src', 'existent').replace(/\\/g, '/')]: {}
    };
    
    clearAliasCache();
    
    // Test that the alias is resolved correctly
    const resolvedPath = await resolvePath('@existent/file');
    assert.strictEqual(
      resolvedPath.replace(/\\/g, '/'), 
      existentPath,
      'Should resolve @existent/file to the correct path'
    );
    
    // Test with .js extension
    const resolvedPathWithExt = await resolvePath('@existent/file.js');
    assert.strictEqual(
      resolvedPathWithExt.replace(/\\/g, '/'),
      existentPath,
      'Should resolve @existent/file.js to the correct path'
    );
    
    // Test non-existent alias
    await assert.rejects(
      resolvePath('@nonexistent/file'),
      (err) => err instanceof PathResolutionError && 
               err.message.includes('No matching alias found for: @nonexistent/file')
    );
  });

  /**
   * @test {initAliasCache} Should throw `PathResolutionError` if `jsconfig` is invalid.
   */
  await t.test('should throw PathResolutionError if jsconfig is invalid', async () => {
    const jsconfigPath = path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
    global.MOCK_FS = {
      ...global.MOCK_FS,
      [jsconfigPath]: { compilerOptions: { baseUrl: 123 } }
    };
    
    clearAliasCache();
    await assert.rejects(
      resolvePath('@/some/path'),
      (err) => {
        return err instanceof PathResolutionError && 
               err.message.includes('Failed to initialize alias cache');
      },
      'Should throw PathResolutionError for invalid jsconfig'
    );
  });
  
  // Restore original state
  global.MOCK_FS = originalMockFs;
  process.env = originalEnv;
});

/**
 * Test suite for `resolvePath` function.
 * @see {@link module:src/utils/path-resolver.resolvePath}
 */
test('resolvePath() should resolve paths correctly', async (t) => {
  const originalMockFs = { ...global.MOCK_FS };
  const originalEnv = { ...process.env };
  
  // Setup test environment
  process.env.NODE_ENV = 'test';
  
  // Setup mock file system for resolvePath tests
  const jsconfigPath = path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
  const mockJsConfig = {
    compilerOptions: {
      baseUrl: '.',
      paths: {
        "@/*": ["src/*"],
        "@config/*": ["src/config/*"],
        "@utils/*": ["src/utils/*"],
        "@test/*": ["test/*"],
        "@public/*": ["public/*"]
      }
    }
  };
  
  global.MOCK_FS = {
    ...global.MOCK_FS,
    [jsconfigPath]: mockJsConfig,
    [path.join(TEST_PROJECT_ROOT, 'package.json').replace(/\\/g, '/')]: '{}',
    [path.join(TEST_PROJECT_ROOT, 'src', 'some', 'module.js').replace(/\\/g, '/')]: '// Mock module',
    [path.join(TEST_PROJECT_ROOT, 'src', 'config', 'constants.js').replace(/\\/g, '/')]: '// Mock constants',
    [path.join(TEST_PROJECT_ROOT, 'src', 'utils', 'logger.js').replace(/\\/g, '/')]: '// Mock logger',
    [path.join(TEST_PROJECT_ROOT, 'public', 'index.html').replace(/\\/g, '/')]: '<!-- Mock HTML -->',
    [path.join(TEST_PROJECT_ROOT, 'test', 'test-utils.js').replace(/\\/g, '/')]: '// Test utils'
  };
  
  /**
   * @test {resolvePath} Should resolve absolute paths within project root.
   */
  await t.test('should resolve absolute paths within project root', async () => {
    const absolutePath = path.join(TEST_PROJECT_ROOT, 'src', 'some', 'module.js');
    const result = await resolvePath(absolutePath);
    assert.strictEqual(result.replace(/\\/g, '/'), absolutePath.replace(/\\/g, '/'));
  });

  /**
   * @test {resolvePath} Should throw `PathResolutionError` for absolute paths outside project root.
   */
  await t.test('should throw PathResolutionError for absolute paths outside project root', async () => {
    const outsidePath = path.resolve('/outside/project/file.js');
    await assert.rejects(resolvePath(outsidePath), PathResolutionError);
  });

  /**
   * @test {resolvePath} Should resolve relative paths correctly.
   */
  await t.test('should resolve relative paths correctly', async () => {
    const basePath = path.join(TEST_PROJECT_ROOT, 'src', 'config');
    const relativePath = '../utils/logger.js';
    const expectedPath = path.join(TEST_PROJECT_ROOT, 'src', 'utils', 'logger.js');
    const result = await resolvePath(relativePath, basePath);
    assert.strictEqual(result.replace(/\\/g, '/'), expectedPath.replace(/\\/g, '/'));
  });

  /**
   * @test {resolvePath} Should throw `PathResolutionError` for relative paths escaping project root.
   */
  await t.test('should throw PathResolutionError for relative paths escaping project root', async () => {
    const basePath = path.join(TEST_PROJECT_ROOT, 'src', 'config');
    const escapingPath = '../../../../outside.js';
    await assert.rejects(resolvePath(escapingPath, basePath), PathResolutionError);
  });

  /**
   * @test {resolvePath} Should return non-aliased specifiers as-is.
   */
  await t.test('should return non-aliased specifiers as-is', async () => {
    const specifier = 'some-npm-package';
    const result = await resolvePath(specifier);
    assert.strictEqual(result, specifier);
  });

  /**
   * @test {resolvePath} Should resolve basic aliased paths.
   */
  await t.test('should resolve basic aliased paths', async () => {
    const specifier = '@config/constants.js';
    const expectedPath = path.join(TEST_PROJECT_ROOT, 'src', 'config', 'constants.js');
    const result = await resolvePath(specifier);
    assert.strictEqual(result.replace(/\\/g, '/'), expectedPath.replace(/\\/g, '/'));
  });

  /**
   * @test {resolvePath} Should apply longest matching alias.
   */
  await t.test('should apply longest matching alias', async () => {
    const specifier = '@overlapping/path/deep.js';
    const expectedPath = path.join(TEST_PROJECT_ROOT, 'src', 'overlapping', 'path', 'deep.js').replace(/\\/g, '/');
    const result = await resolvePath(specifier);
    assert.strictEqual(result, expectedPath);

    const specifier2 = '@overlapping/shallow.js';
    const expectedPath2 = path.join(TEST_PROJECT_ROOT, 'src', 'overlapping', 'shallow.js').replace(/\\/g, '/');
    const result2 = await resolvePath(specifier2);
    assert.strictEqual(result2, expectedPath2);
  });

  /**
   * @test {resolvePath} Should append `.js` extension if file exists without it.
   */
  await t.test('should append .js extension if file exists without it', async () => {
    const specifier = '@/some/module';
    const expectedPath = path.join(TEST_PROJECT_ROOT, 'src', 'some', 'module.js').replace(/\\/g, '/');
    const result = await resolvePath(specifier);
    assert.strictEqual(result, expectedPath);
  });

  /**
   * @test {resolvePath} Should not append `.js` extension if file does not exist with it.
   */
  await t.test('should not append .js extension if file does not exist with it', async () => {
    const specifier = '@/nonexistent/file';
    const expectedPath = path.join(TEST_PROJECT_ROOT, 'src', 'nonexistent', 'file').replace(/\\/g, '/');
    const result = await resolvePath(specifier);
    assert.strictEqual(result, expectedPath);
  });

  /**
   * @test {resolvePath} Should throw `PathResolutionError` for invalid specifier.
   */
  await t.test('should throw PathResolutionError for invalid specifier', async () => {
    await assert.rejects(resolvePath(''), PathResolutionError);
    await assert.rejects(resolvePath(null), PathResolutionError);
    await assert.rejects(resolvePath(undefined), PathResolutionError);
  });

  /**
   * @test {resolvePath} Should throw `PathResolutionError` when no matching alias is found.
   */
  await t.test('should throw PathResolutionError when no matching alias is found', async () => {
    const specifier = '@nonexistent/path';
    await assert.rejects(resolvePath(specifier), PathResolutionError);
  });

  /**
   * @test {resolvePath} Should use `global.MOCK_FS` for path existence checks in test environment.
   */
  await t.test('should use global.MOCK_FS for path existence checks in test environment', async () => {
    process.env.NODE_ENV = 'test';
    global.MOCK_FS = {
      [path.join(TEST_PROJECT_ROOT).replace(/\\/g, '/')]: {},
      [path.join(TEST_PROJECT_ROOT, 'src').replace(/\\/g, '/')]: {},
      [path.join(TEST_PROJECT_ROOT, 'src', 'mocked').replace(/\\/g, '/')]: {},
      [path.join(TEST_PROJECT_ROOT, 'src', 'mocked', 'file.js').replace(/\\/g, '/')]: 'content',
      [path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/')]: {
        compilerOptions: {
          baseUrl: '.',
          paths: { "@mocked/*": ["src/mocked/*"] }
        }
      }
    };
    clearAliasCache();
    const specifier = '@mocked/file';
    const expectedPath = path.join(TEST_PROJECT_ROOT, 'src', 'mocked', 'file.js').replace(/\\/g, '/');
    const result = await resolvePath(specifier);
    const normalizedResult = path.normalize(result).replace(/\\/g, '/');
    const normalizedExpected = path.normalize(expectedPath).replace(/\\/g, '/');
    assert.strictEqual(normalizedResult, normalizedExpected);
    assert.strictEqual(fsPromisesMock.access.mock.callCount(), 0);
  });
});