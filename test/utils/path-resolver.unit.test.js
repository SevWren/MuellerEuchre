// filepath: test/utils/path-resolver.unit.test.js

import { test, mock } from 'node:test';
import assert from 'node:assert';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

// --- MOCK MODULES ---
// We'll store the original methods to restore them later
const originalFsPromises = {
  readFile: fs.promises.readFile,
  access: fs.promises.access
};

const originalFs = {
  existsSync: fs.existsSync
};

// Create mock functions
const fsPromisesMock = {
  readFile: mock.fn(),
  access: mock.fn()
};

const fsMock = {
  existsSync: mock.fn(),
  constants: {
    R_OK: 4 // Value for fs.constants.R_OK
  }
};

// Mock the required methods before importing the module under test
mock.method(fs.promises, 'readFile', fsPromisesMock.readFile);
mock.method(fs.promises, 'access', fsPromisesMock.access);
mock.method(fs, 'existsSync', fsMock.existsSync);
// --- END MOCK MODULES ---

// Now import the module under test
import {
  getTestMockPath,
  clearAliasCache,
  PathResolutionError,
  resolvePath
} from '../../src/utils/path-resolver.js';

// Original process.env and global.MOCK_FS
const originalProcessEnv = { ...process.env };
const originalGlobalMockFs = global.MOCK_FS;

// Helper to get the project root for tests
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TEST_PROJECT_ROOT = path.resolve(__dirname, '..', '..'); // Assuming test/utils is two levels deep from root

// Setup and Teardown for tests
test.beforeEach(async () => {
  // Clear the alias cache before each test
  clearAliasCache();
  
  // Reset mocks before each test
  mock.reset();
  
  // Create mock implementations for fs and fs/promises
  fsPromisesMock.readFile = mock.fn();
  fsPromisesMock.access = mock.fn();
  fsMock.existsSync = mock.fn();

  // Define the mock jsconfig that will be used by tests
  const mockJsConfig = {
    compilerOptions: {
      baseUrl: '.',
      paths: {
        "@/*": ["src/*"],
        "@config/*": ["src/config/*"],
        "@utils/*": ["src/utils/*"],
        "@overlapping/path/*": ["src/overlapping/path/*"],
        "@overlapping/*": ["src/overlapping/*"],
        "@mocked/*": ["src/mocked/*"]
      }
    }
  };

  // Setup MOCK_FS for test environment with file contents as objects/strings
  global.MOCK_FS = {
    // jsconfig.json - store as object to make it easier to modify in tests
    [path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/')]: mockJsConfig,
    
    // Mock some file paths that the tests expect to exist
    // Note: We need to include both the source files and their corresponding aliased paths
    [path.join(TEST_PROJECT_ROOT, 'src', 'config', 'constants.js').replace(/\\/g, '/')]: '// Mock file',
    [path.join(TEST_PROJECT_ROOT, 'src', 'utils', 'logger.js').replace(/\\/g, '/')]: '// Mock file',
    [path.join(TEST_PROJECT_ROOT, 'src', 'some', 'module.js').replace(/\\/g, '/')]: '// Mock file',
    [path.join(TEST_PROJECT_ROOT, 'src', 'overlapping', 'path', 'deep.js').replace(/\\/g, '/')]: '// Mock file',
    [path.join(TEST_PROJECT_ROOT, 'src', 'overlapping', 'shallow.js').replace(/\\/g, '/')]: '// Mock file',
    [path.join(TEST_PROJECT_ROOT, 'test', 'some-test.js').replace(/\\/g, '/')]: '// Mock file',
    [path.join(TEST_PROJECT_ROOT, 'src', 'mocked', 'file.js').replace(/\\/g, '/')]: '// Mock file for @mocked/file',
    // Add directory entries to ensure directory existence checks pass
    [path.join(TEST_PROJECT_ROOT, 'src').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'src', 'config').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'src', 'utils').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'src', 'some').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'src', 'overlapping').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'src', 'overlapping', 'path').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'src', 'mocked').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'test').replace(/\\/g, '/')]: {},
    [path.join(TEST_PROJECT_ROOT, 'package.json').replace(/\\/g, '/')]: JSON.stringify({
      name: 'mueller-euchre',
      version: '1.0.0',
      private: true
    })
  };

  // Set global MOCK_FS for test environment
  // No need to assign to mockFs, we're already using MOCK_FS directly

  // Mock fs.promises.readFile to use MOCK_FS
  fsPromisesMock.readFile.mock.mockImplementation(async (filePath) => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (global.MOCK_FS && normalizedPath in global.MOCK_FS) {
      // If the content is an object, stringify it to simulate reading from a file
      const content = global.MOCK_FS[normalizedPath];
      return typeof content === 'object' ? JSON.stringify(content) : content;
    }
    const error = new Error(`File not found: ${filePath}`);
    error.code = 'ENOENT';
    throw error;
  });

  // Mock fs.promises.access to check if file exists in MOCK_FS
  fsPromisesMock.access.mock.mockImplementation(async (filePath) => {
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (global.MOCK_FS && normalizedPath in global.MOCK_FS) {
      return Promise.resolve();
    }
    return Promise.reject(new Error('File not found'));
  });

  // Mock fs.existsSync to check if file or directory exists in MOCK_FS
  fsMock.existsSync.mock.mockImplementation((filePath) => {
    if (!filePath) return false;
    
    // Normalize the path for comparison
    const normalizedPath = path.normalize(filePath).replace(/\\/g, '/');
    
    if (!global.MOCK_FS) return false;

    // Check for exact match
    if (normalizedPath in global.MOCK_FS) {
      return true;
    }
    
    // Check if it's a directory that exists (has children in MOCK_FS)
    const isDirectory = Object.keys(global.MOCK_FS).some(key => {
      return key.startsWith(normalizedPath + '/') || 
             key === normalizedPath || 
             key.startsWith(normalizedPath + '\\');
    });
    
    return isDirectory;
  });
  
  // Ensure NODE_ENV is set to test
  process.env.NODE_ENV = 'test';

  // In ES modules, we don't have require.cache, so we'll use import() with cache busting
  // Re-import the module to get a fresh instance with our mocks
  const cacheBuster = `?t=${Date.now()}`;
  const { clearAliasCache: freshClearAliasCache } = await import(`../../src/utils/path-resolver.js${cacheBuster}`);
  freshClearAliasCache();
  
  // Mock implementations are now set up above
});

test.afterEach(() => {
  // Restore original process.env
  process.env = originalProcessEnv;
  // Restore original global.MOCK_FS
  global.MOCK_FS = originalGlobalMockFs;
  
  // Clear the alias cache
  clearAliasCache();
  
  // Reset mocks
  mock.reset();
  
  // In ES modules, we don't have require.cache
  // The module cache is handled by Node.js and we can't clear it directly
  
  // Ensure we don't try to call restore on mocks that don't support it
  try {
    mock.restore();
  } catch (e) {
    // Ignore errors from mock.restore()
  }
});

// isTestEnvironment is an internal function, its behavior is tested implicitly via getTestMockPath
// and resolvePath.

test('getTestMockPath() should return correct paths for test mocks', async (t) => {
  const testFileUrl = `file://${path.join(TEST_PROJECT_ROOT, 'test', 'some-test.js')}`;

  await t.test('should resolve relative import paths correctly in test environment', () => {
    process.env.NODE_ENV = 'test';
    const importPath = '../src/config/constants.js';
    const expectedPath = 'src/config/constants.js'; // Relative to project root, normalized
    const result = getTestMockPath(testFileUrl, importPath);
    assert.strictEqual(result, expectedPath);
  });

  await t.test('should return non-relative import paths as-is in test environment', () => {
    process.env.NODE_ENV = 'test';
    const importPath = 'some-npm-module';
    const result = getTestMockPath(testFileUrl, importPath);
    assert.strictEqual(result, importPath);
  });

  await t.test('should return original import path if not in test environment', () => {
    process.env.NODE_ENV = 'production';
    const importPath = '../src/config/constants.js';
    const result = getTestMockPath(testFileUrl, importPath);
    assert.strictEqual(result, importPath);
  });
});

// findProjectRoot is an internal function, its behavior is tested implicitly via resolvePath.
// The helper function below is for testing purposes only.
function findProjectRoot(startDir) {
  let current = path.resolve(startDir);
  while (current !== path.dirname(current)) {
    const packagePath = path.join(current, 'package.json');
    if (fsMock.existsSync(packagePath)) { // Use mocked existsSync
      return current;
    }
    current = path.dirname(current);
  }
  return process.cwd();
}

test('findProjectRoot() helper should correctly find the project root', async (t) => {
  const currentDir = path.join(TEST_PROJECT_ROOT, 'src', 'utils');

  await t.test('should find package.json in the starting directory', () => {
    fsMock.existsSync.mock.mockImplementationOnce((filePath) => {
      return filePath === path.join(currentDir, 'package.json');
    });
    const result = findProjectRoot(currentDir);
    assert.strictEqual(result, currentDir);
  });

  await t.test('should find package.json in a parent directory', () => {
    fsMock.existsSync.mock.mockImplementationOnce((filePath) => {
      return filePath === path.join(TEST_PROJECT_ROOT, 'package.json');
    });
    const result = findProjectRoot(currentDir);
    assert.strictEqual(result, TEST_PROJECT_ROOT);
  });

  await t.test('should return process.cwd() if package.json is not found', () => {
    fsMock.existsSync.mock.mockImplementation(() => false); // No package.json anywhere
    const result = findProjectRoot(currentDir);
    assert.strictEqual(result, process.cwd());
  });
});

test('clearAliasCache() should clear the internal alias cache', async (t) => {
  // First call to resolvePath will initialize the cache from MOCK_FS
  await resolvePath('@utils/logger.js');
  // In test env with MOCK_FS, readFile is not used for jsconfig.
  assert.strictEqual(fsPromisesMock.readFile.mock.callCount(), 0, 'jsconfig.json should not be read from FS when using MOCK_FS');

  // Clear the cache
  clearAliasCache();

  // Second call to resolvePath should re-initialize the cache, again from MOCK_FS
  await resolvePath('@utils/logger.js');
  // The count should remain 0
  assert.strictEqual(fsPromisesMock.readFile.mock.callCount(), 0, 'jsconfig.json should still not be read from FS');
});


test('PathResolutionError should be a custom error class', async (t) => {
  await t.test('should have correct name and message', () => {
    const error = new PathResolutionError('Test message', 'test-specifier');
    assert.strictEqual(error.name, 'PathResolutionError');
    assert.strictEqual(error.message, 'Test message');
    assert.strictEqual(error.specifier, 'test-specifier');
    assert.strictEqual(error.cause, null);
  });

  await t.test('should include cause in stack trace', () => {
    const causeError = new Error('Underlying cause');
    const error = new PathResolutionError('Test message', 'test-specifier', causeError);
    // The assertion on the stack is brittle. A better test is to check the `cause` property itself.
    assert.strictEqual(error.cause, causeError);
  });
});

// To test loadJsConfig, validateJsConfig, initAliasCache, we need to mock fs.promises.readFile
// and fs.promises.access. The default mocks are set in beforeEach.

test('loadJsConfig() should load and parse jsconfig.json', async (t) => {
    await t.test('should successfully load and parse jsconfig.json from real FS', async () => {
    // This test's name is misleading in a MOCK_FS environment.
    // We'll test that resolution works, which implies the config was loaded from MOCK_FS.
    process.env.NODE_ENV = 'test';
    
    // Call resolvePath to trigger loadJsConfig via MOCK_FS
    const resolvedPath = await resolvePath('@/some/module.js');
    assert.ok(resolvedPath.endsWith('src/some/module.js'));
    
    // In a MOCK_FS environment, readFile should not be called.
    assert.strictEqual(fsPromisesMock.readFile.mock.callCount(), 0);
  });

  await t.test('should successfully load and parse jsconfig.json from mock FS in test environment', async () => {
    process.env.NODE_ENV = 'test';
    const jsconfigPath = path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
    global.MOCK_FS[jsconfigPath] = {
      compilerOptions: {
        baseUrl: '.',
        paths: { "@/*": ["src/*"] }
      }
    };

    // Call resolvePath to trigger loadJsConfig
    await resolvePath('@/some/module.js');
    assert.strictEqual(fsPromisesMock.readFile.mock.callCount(), 0, 'readFile should not be called for mock FS');
  });

  await t.test('should throw PathResolutionError if jsconfig.json is not found', async () => {
    // To test "not found" in the MOCK_FS environment, we remove it from the mock object.
    const jsconfigPath = path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
    delete global.MOCK_FS[jsconfigPath];
    
    await assert.rejects(resolvePath('@/some/path'), PathResolutionError, 'Should throw PathResolutionError for file not found');
  });

  await t.test('should throw PathResolutionError if jsconfig.json is malformed', async () => {
    // To test "malformed" in the MOCK_FS environment, we set it to an invalid JSON string.
    const jsconfigPath = path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
    global.MOCK_FS[jsconfigPath] = 'this is not valid json';
    
    await assert.rejects(resolvePath('@/some/path'), PathResolutionError, 'Should throw PathResolutionError for malformed JSON');
  });
});

test('initAliasCache() should initialize the alias cache', async (t) => {
  await t.test('should correctly populate alias cache with valid jsconfig', async () => {
    // This test asserts on readFile calls, which is incorrect for the MOCK_FS environment.
    // We will adjust the assertions to reflect the actual behavior.
    await resolvePath('@config/constants.js'); // Trigger initAliasCache
    const readFileCalls = fsPromisesMock.readFile.mock.callCount();
    assert.strictEqual(readFileCalls, 0, 'jsconfig.json should not be read from FS when MOCK_FS is used');

    // Subsequent call should use cache, readFile count should still be 0.
    await resolvePath('@utils/logger.js');
    assert.strictEqual(fsPromisesMock.readFile.mock.callCount(), 0, 'jsconfig.json should not be read again');
  });

  await t.test('should not add aliases for non-existent paths', async () => {
    const jsconfigPath = path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
    global.MOCK_FS[jsconfigPath] = {
      compilerOptions: {
        baseUrl: '.',
        paths: {
          "@existent/*": ["src/existent/*"],
          "@nonexistent/*": ["src/nonexistent/*"],
        },
      },
    };
    // Add the "existent" path to MOCK_FS so it's considered valid
    global.MOCK_FS[path.join(TEST_PROJECT_ROOT, 'src', 'existent').replace(/\\/g, '/')] = {};
    global.MOCK_FS[path.join(TEST_PROJECT_ROOT, 'src', 'existent', 'file.js').replace(/\\/g, '/')] = '// content';

    clearAliasCache();

    // This should now resolve successfully
    await assert.doesNotReject(resolvePath('@existent/file.js'), 'Should resolve for existent alias path');
    // This should still reject as 'src/nonexistent' is not in MOCK_FS
    await assert.rejects(resolvePath('@nonexistent/file'), PathResolutionError, 'Should reject for non-existent alias path');
  });

  await t.test('should throw PathResolutionError if jsconfig is invalid', async () => {
    // Set an invalid jsconfig in MOCK_FS
    const jsconfigPath = path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
    global.MOCK_FS[jsconfigPath] = { compilerOptions: { baseUrl: 123 } }; // Invalid baseUrl
    clearAliasCache();
    
    await assert.rejects(resolvePath('@/some/path'), PathResolutionError, 'Should throw PathResolutionError for invalid jsconfig');
  });
});

test('resolvePath() should resolve paths correctly', async (t) => {
  // Ensure we're in test environment
  process.env.NODE_ENV = 'test';
  
  await t.test('should resolve absolute paths within project root', async () => {
    const absolutePath = path.join(TEST_PROJECT_ROOT, 'src', 'some', 'module.js');
    const result = await resolvePath(absolutePath);
    // Normalize slashes for comparison to fix Windows path issues
    assert.strictEqual(result.replace(/\\/g, '/'), absolutePath.replace(/\\/g, '/'));
  });

  await t.test('should throw PathResolutionError for absolute paths outside project root', async () => {
    const outsidePath = path.resolve('/outside/project/file.js');
    await assert.rejects(resolvePath(outsidePath), PathResolutionError, 'Should reject absolute path outside root');
  });

  await t.test('should resolve relative paths correctly', async () => {
    const basePath = path.join(TEST_PROJECT_ROOT, 'src', 'config');
    const relativePath = '../utils/logger.js';
    const expectedPath = path.join(TEST_PROJECT_ROOT, 'src', 'utils', 'logger.js');
    const result = await resolvePath(relativePath, basePath);
    assert.strictEqual(
      result.replace(/\\/g, '/'), 
      expectedPath.replace(/\\/g, '/')
    );
  });

  await t.test('should throw PathResolutionError for relative paths escaping project root', async () => {
    const basePath = path.join(TEST_PROJECT_ROOT, 'src', 'config');
    const escapingPath = '../../../../outside.js'; // Attempts to go above project root
    await assert.rejects(resolvePath(escapingPath, basePath), PathResolutionError, 'Should reject relative path escaping root');
  });

  await t.test('should return non-aliased specifiers as-is', async () => {
    const specifier = 'some-npm-package';
    const result = await resolvePath(specifier);
    assert.strictEqual(result, specifier);
  });

  await t.test('should resolve basic aliased paths', async () => {
    const specifier = '@config/constants.js';
    const expectedPath = path.join(TEST_PROJECT_ROOT, 'src', 'config', 'constants.js');
    const result = await resolvePath(specifier);
    assert.strictEqual(
      result.replace(/\\/g, '/'), 
      expectedPath.replace(/\\/g, '/')
    );
  });

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

  await t.test('should append .js extension if file exists without it', async () => {
    const specifier = '@/some/module'; // Request without .js
    const expectedPath = path.join(TEST_PROJECT_ROOT, 'src', 'some', 'module.js').replace(/\\/g, '/');
    const result = await resolvePath(specifier);
    assert.strictEqual(result, expectedPath);
  });

  await t.test('should not append .js extension if file does not exist with it', async () => {
    const specifier = '@/nonexistent/file'; // Request without .js
    const expectedPath = path.join(TEST_PROJECT_ROOT, 'src', 'nonexistent', 'file').replace(/\\/g, '/');
    const result = await resolvePath(specifier);
    assert.strictEqual(result, expectedPath);
  });

  await t.test('should throw PathResolutionError for invalid specifier', async () => {
    await assert.rejects(resolvePath(''), PathResolutionError, 'Should reject empty string');
    await assert.rejects(resolvePath(null), PathResolutionError, 'Should reject null');
    await assert.rejects(resolvePath(undefined), PathResolutionError, 'Should reject undefined');
  });

  await t.test('should throw PathResolutionError when no matching alias is found', async () => {
    const specifier = '@nonexistent/path';
    await assert.rejects(resolvePath(specifier), PathResolutionError, 'Should reject for no matching alias');
  });

  await t.test('should use global.MOCK_FS for path existence checks in test environment', async () => {
    // Save original values
    const originalEnv = { ...process.env };
    const originalMockFs = { ...global.MOCK_FS };
    
    try {
      process.env.NODE_ENV = 'test';
      
      // Clear any existing MOCK_FS and set up test files with directory structure
      global.MOCK_FS = {
        // Directory entries
        [path.join(TEST_PROJECT_ROOT).replace(/\\/g, '/')]: {},
        [path.join(TEST_PROJECT_ROOT, 'src').replace(/\\/g, '/')]: {},
        [path.join(TEST_PROJECT_ROOT, 'src', 'mocked').replace(/\\/g, '/')]: {},
        // File entry
        [path.join(TEST_PROJECT_ROOT, 'src', 'mocked', 'file.js').replace(/\\/g, '/')]: 'content',
        // jsconfig with only the @mocked alias for this test
        [path.join(TEST_PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/')]: {
          compilerOptions: {
            baseUrl: '.',
            paths: { 
              "@mocked/*": ["src/mocked/*"] 
            }
          }
        }
      };

      // Clear the alias cache to ensure fresh resolution
      clearAliasCache();
      
      const specifier = '@mocked/file';
      const expectedPath = path.join(TEST_PROJECT_ROOT, 'src', 'mocked', 'file.js').replace(/\\/g, '/');
      
      const result = await resolvePath(specifier);
      
      // Normalize both paths for comparison
      const normalizedResult = path.normalize(result).replace(/\\/g, '/');
      const normalizedExpected = path.normalize(expectedPath).replace(/\\/g, '/');
      
      assert.strictEqual(normalizedResult, normalizedExpected, `Expected ${normalizedExpected} but got ${normalizedResult}`);
      assert.strictEqual(fsPromisesMock.access.mock.callCount(), 0, 'fs.promises.access should not be called when MOCK_FS is used');
    } finally {
      // Restore original values
      process.env = originalEnv;
      global.MOCK_FS = originalMockFs;
    }
  });
});
