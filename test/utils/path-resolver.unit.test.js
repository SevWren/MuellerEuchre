import test from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

// Import the module under test
import { resolvePath, PathResolutionError, clearAliasCache } from '../../src/utils/path-resolver.js';

// Helper to normalize paths for consistent testing
const normalizePath = (p) => p.replace(/\\\\/g, '/');

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

// Helper to create expected paths
const expectedPath = (...segments) => {
  return normalizePath(path.join(PROJECT_ROOT, ...segments));
};

// Create mock file system with normalized paths
const MOCK_FS = {
  // Mock jsconfig.json with all required paths
  [path.join(PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/')]: JSON.stringify({
    compilerOptions: {
      baseUrl: ".",
      paths: {
        "@/*": ["src/*"],
        "@test/*": ["test/*"],
        "@public/*": ["public/*"],
        "@fixtures/*": ["test/__fixtures__/*"],
        "@mocks/*": ["test/__mocks__/*"]
      }
    }
  }),
  
  // Mock source files that should exist
  [path.join(PROJECT_ROOT, 'src', 'config', 'database.js').replace(/\\/g, '/')]: '// Mock database config',
  [path.join(PROJECT_ROOT, 'src', 'utils', 'test-utils.js').replace(/\\/g, '/')]: '// Mock test utils',
  
  // Mock test files
  [path.join(PROJECT_ROOT, 'test', 'utils', 'test-utils.js').replace(/\\/g, '/')]: '// Mock test utils',
  
  // Mock directories (needed for path resolution)
  [path.join(PROJECT_ROOT, 'src').replace(/\\/g, '/')]: { isDirectory: true },
  [path.join(PROJECT_ROOT, 'src', 'config').replace(/\\/g, '/')]: { isDirectory: true },
  [path.join(PROJECT_ROOT, 'src', 'utils').replace(/\\/g, '/')]: { isDirectory: true },
  [path.join(PROJECT_ROOT, 'test').replace(/\\/g, '/')]: { isDirectory: true },
  [path.join(PROJECT_ROOT, 'test', 'utils').replace(/\\/g, '/')]: { isDirectory: true },
  [path.join(PROJECT_ROOT, 'public').replace(/\\/g, '/')]: { isDirectory: true },
  [path.join(PROJECT_ROOT, 'test', '__fixtures__').replace(/\\/g, '/')]: { isDirectory: true },
  [path.join(PROJECT_ROOT, 'test', '__mocks__').replace(/\\/g, '/')]: { isDirectory: true }
};

// Store original fs methods
const originalFs = {
  readFile: fs.readFile,
  access: fs.access
};

// Store original environment variables
const originalNodeEnv = process.env.NODE_ENV;

// Make MOCK_FS available globally for the path resolver
global.MOCK_FS = MOCK_FS;

// Store original fs.promises methods for cleanup
const originalFsPromises = {
  readFile: fs.promises.readFile,
  access: fs.promises.access
};

// Setup mocks
const setupFsMocks = () => {
  console.log('Setting up mock file system with the following paths:');
  Object.keys(MOCK_FS).forEach(key => {
    console.log(`  - ${key}: ${typeof MOCK_FS[key] === 'string' ? 
      (MOCK_FS[key].length > 50 ? MOCK_FS[key].substring(0, 50) + '...' : MOCK_FS[key]) : 
      '[directory]'}`);
  });
  
  // Ensure MOCK_FS is available globally for the path resolver
  global.MOCK_FS = MOCK_FS;
  
  // Set test environment
  process.env.NODE_ENV = 'test';

  // Mock readFile
  fs.promises.readFile = async (filePath) => {
    const normalizedPath = normalizePath(filePath);
    console.log(`[MOCK] readFile called with: ${filePath} (normalized: ${normalizedPath})`);
    
    // Try exact match first
    if (MOCK_FS[normalizedPath] !== undefined) {
      console.log(`[MOCK] Found exact match: ${normalizedPath}`);
      return MOCK_FS[normalizedPath];
    }
    
    // Try with .js extension
    const withJsExt = normalizedPath + '.js';
    if (MOCK_FS[withJsExt] !== undefined) {
      console.log(`[MOCK] Found .js match: ${withJsExt}`);
      return MOCK_FS[withJsExt];
    }
    
    // Try with resolved path
    const resolvedPath = path.resolve(filePath);
    if (MOCK_FS[resolvedPath] !== undefined) {
      console.log(`[MOCK] Found resolved match: ${resolvedPath}`);
      return MOCK_FS[resolvedPath];
    }
    
    console.error(`[MOCK] File not found: ${filePath} (tried ${normalizedPath} and ${resolvedPath})`);
    const error = new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    error.code = 'ENOENT';
    throw error;
  };

  // Mock access
  fs.promises.access = async (filePath, mode = fs.constants.R_OK) => {
    const normalizedPath = normalizePath(filePath);
    console.log(`[MOCK] access called with: ${filePath} (mode: ${mode}), normalized: ${normalizedPath}`);
    
    // Check for exact match first
    if (MOCK_FS[normalizedPath] !== undefined) {
      console.log(`[MOCK] Access granted (exact match): ${normalizedPath}`);
      return;
    }
    
    // Check for directory access - handle both with and without trailing slash
    const dirPath = normalizedPath.endsWith('/') ? normalizedPath : `${normalizedPath}/`;
    
    // Check if this is a directory in our mock FS
    if (MOCK_FS[dirPath]?.isDirectory) {
      console.log(`[MOCK] Directory access granted: ${dirPath}`);
      return;
    }
    
    // Check if any path in MOCK_FS starts with this path (for nested files)
    const isDirectory = Object.keys(MOCK_FS).some(key => {
      // Check if the key represents a file inside this directory
      if (key.startsWith(dirPath) && key !== dirPath) {
        console.log(`[MOCK] Directory access granted (contains files): ${dirPath}`);
        return true;
      }
      
      // Handle the case where the path is a directory but we're checking without a trailing slash
      if (key === normalizedPath && MOCK_FS[key]?.isDirectory) {
        console.log(`[MOCK] Directory access granted (exact dir match): ${normalizedPath}`);
        return true;
      }
      
      // Check for .js file access
      if (key === `${normalizedPath}.js` || key === `${filePath}.js`) {
        console.log(`[MOCK] Access granted to .js file: ${key}`);
        return true;
      }
      
      return false;
    });
    
    if (isDirectory) {
      return; // Access granted
    }
    
    // Special case: Check if this is a path that should be accessible via alias
    const aliasMatch = Object.entries(MOCK_FS).find(([key, value]) => {
      if (typeof value === 'string' && value.includes('jsconfig.json')) {
        try {
          const config = JSON.parse(value);
          const aliases = config.compilerOptions?.paths || {};
          return Object.entries(aliases).some(([alias, paths]) => {
            const aliasPath = paths[0].replace(/[\/*]+$/, ''); // Remove trailing /*
            const fullPath = path.resolve(PROJECT_ROOT, aliasPath);
            return normalizedPath.startsWith(fullPath);
          });
        } catch (e) {
          return false;
        }
      }
      return false;
    });
    
    if (aliasMatch) {
      console.log(`[MOCK] Access granted via alias: ${normalizedPath}`);
      return;
    }
    
    // If we get here, access is denied
    console.error(`[MOCK] Access denied to: ${normalizedPath}`);
    const error = new Error(`ENOENT: no such file or directory, access '${normalizedPath}'`);
    error.code = 'ENOENT';
    throw error;
  };
};

// Restore original environment and mocks
const teardownFsMocks = () => {
  try {
    // Restore fs.promises methods
    fs.promises.readFile = originalFsPromises.readFile;
    fs.promises.access = originalFsPromises.access;
    
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    
    // Clear global MOCK_FS
    delete global.MOCK_FS;
    
    // For ESM, we don't have require.cache, so we need to use import.meta.url
    // to clear the module cache. This is a no-op in ESM, but we keep it for clarity.
    try {
      // This is a no-op in ESM, but we keep it for documentation
      const modulePath = new URL('../../src/utils/path-resolver.js', import.meta.url).pathname;
      // In ESM, the module cache is managed by the runtime and not directly accessible
      console.log(`[TEARDOWN] Note: In ESM, module cache is managed by the runtime`);
    } catch (e) {
      console.error('[TEARDOWN] Error during module cache cleanup:', e);
    }
  } catch (error) {
    console.error('Error during test teardown:', error);
    throw error;
  }
};

test('Path Resolver', async (t) => {
  // Setup mocks before each test
  setupFsMocks();
  
  // Clear the alias cache before each test
  clearAliasCache();
  
  // Verify the mock file system is set up correctly
  await t.test('should have mock file system set up', async () => {
    // Force re-initialization of the mock file system
    setupFsMocks();
    
    // Verify MOCK_FS is properly set up
    assert.ok(global.MOCK_FS, 'MOCK_FS should be set on global');
    
    // Check for jsconfig.json in mock FS
    const jsConfigPath = path.join(PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
    assert.ok(global.MOCK_FS[jsConfigPath], `jsconfig.json should exist in mock FS at ${jsConfigPath}`);
    
    // Verify the content of jsconfig.json
    try {
      const jsConfig = JSON.parse(global.MOCK_FS[jsConfigPath]);
      assert.ok(jsConfig.compilerOptions, 'jsconfig.json should have compilerOptions');
      assert.ok(jsConfig.compilerOptions.paths, 'jsconfig.json should have paths in compilerOptions');
    } catch (e) {
      assert.fail(`Failed to parse jsconfig.json: ${e.message}`);
    }
    
    // Verify all expected directories exist in mock FS
    const expectedDirs = [
      path.join(PROJECT_ROOT, 'src'),
      path.join(PROJECT_ROOT, 'src', 'config'),
      path.join(PROJECT_ROOT, 'src', 'utils'),
      path.join(PROJECT_ROOT, 'test'),
      path.join(PROJECT_ROOT, 'test', 'utils'),
      path.join(PROJECT_ROOT, 'public'),
      path.join(PROJECT_ROOT, 'test', '__fixtures__'),
      path.join(PROJECT_ROOT, 'test', '__mocks__')
    ];
    
    expectedDirs.forEach(dir => {
      const normalizedDir = dir.replace(/\\/g, '/');
      assert.ok(
        global.MOCK_FS[normalizedDir]?.isDirectory, 
        `Directory should exist in mock FS: ${normalizedDir}`
      );
    });
  });
  
  // Verify jsconfig.json is loaded correctly
  await t.test('should load jsconfig.json', async () => {
    const jsconfigPath = path.join(PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
    const jsconfigContent = await fs.promises.readFile(jsconfigPath, 'utf-8');
    const jsconfig = JSON.parse(jsconfigContent);
    assert.ok(jsconfig, 'Should load jsconfig.json');
    assert.ok(jsconfig.compilerOptions, 'jsconfig should have compilerOptions');
    assert.ok(jsconfig.compilerOptions.paths, 'jsconfig should have paths');
    
    // Log the loaded aliases for debugging
    console.log('Loaded jsconfig paths:', Object.keys(jsconfig.compilerOptions.paths));
  });
  
  process.env.NODE_ENV = 'test';

  // Test cases
  await t.test('should resolve paths with @/ alias', async () => {
    // The @/* alias maps to src/*, so we should only include the path after src/
    const resolvedPath = await resolvePath('@/config/database');
    const expectedPath = path.join(process.cwd(), 'src', 'config', 'database.js');
    // Normalize both paths to handle different path separators
    assert.strictEqual(
      path.normalize(resolvedPath),
      path.normalize(expectedPath)
    );
    
    // Verify the file exists in our mock FS
    assert.ok(
      MOCK_FS[normalizePath(resolvedPath)] !== undefined,
      `Resolved path does not exist in mock FS: ${normalizePath(resolvedPath)}`
    );
  });

  await t.test('should resolve paths with @test/ alias', async () => {
    // The @test/* alias maps to test/*, so we should only include the path after test/
    const resolvedPath = await resolvePath('@test/utils/test-utils');
    const expectedPath = path.join(process.cwd(), 'test', 'utils', 'test-utils.js');
    // Normalize both paths to handle different path separators
    assert.strictEqual(
      path.normalize(resolvedPath),
      path.normalize(expectedPath)
    );
    
    // Verify the file exists in our mock FS
    assert.ok(
      MOCK_FS[normalizePath(resolvedPath)] !== undefined,
      `Resolved path does not exist in mock FS: ${normalizePath(resolvedPath)}`
    );
  });

  await t.test('should handle relative paths', async () => {
    const result = await resolvePath('./test-file');
    const expected = path.resolve(process.cwd(), 'test-file');
    assert.strictEqual(
      normalizePath(result), 
      normalizePath(expected),
      `Expected ${normalizePath(expected)} but got ${normalizePath(result)}`
    );
  });

  await t.test('should handle absolute paths', async () => {
    // Use a temp file in the project directory to avoid permission issues
    const tempFile = path.join(PROJECT_ROOT, 'temp-test-file');
    MOCK_FS[tempFile] = '// Temporary test file';
    
    try {
      const result = await resolvePath(tempFile);
      assert.strictEqual(
        normalizePath(result), 
        normalizePath(tempFile),
        `Expected ${normalizePath(tempFile)} but got ${normalizePath(result)}`
      );
    } finally {
      // Clean up
      delete MOCK_FS[tempFile];
    }
  });

  await t.test('should throw PathResolutionError for non-existent aliases', async () => {
    try {
      await resolvePath('@nonexistent/path');
      assert.fail('Expected PathResolutionError was not thrown');
    } catch (error) {
      assert.strictEqual(error.name, 'PathResolutionError');
      assert.match(error.message, /No matching alias found/);
    }
  });

  await t.test('should handle missing jsconfig.json', async () => {
    // Save original state
    const originalReadFile = fs.promises.readFile;
    const originalMockFs = { ...global.MOCK_FS };
    
    try {
      // Remove jsconfig from mock FS and clear alias cache
      const jsconfigPath = path.join(PROJECT_ROOT, 'jsconfig.json').replace(/\\/g, '/');
      delete global.MOCK_FS[jsconfigPath];
      clearAliasCache();
      
      // Mock readFile to reject as a fallback
      fs.promises.readFile = async () => {
        throw new Error('File not found');
      };
      
      await assert.rejects(
        async () => {
          // Force reload of jsconfig
          await resolvePath('@/some/path');
        },
        {
          name: 'PathResolutionError',
          message: /(Failed to load|No matching alias found)/
        },
        'Expected PathResolutionError was not thrown'
      );
    } finally {
      // Restore original state
      global.MOCK_FS = originalMockFs;
      fs.promises.readFile = originalReadFile;
      clearAliasCache();
    }
  });

  await t.test('PathResolutionError should include the original error', async () => {
    const originalError = new Error('Original error');
    const error = new PathResolutionError('Test error', 'test/path', originalError);
    
    assert.strictEqual(error.name, 'PathResolutionError');
    assert.strictEqual(error.message, 'Test error');
    assert.strictEqual(error.specifier, 'test/path');
    assert.strictEqual(error.cause, originalError);
    assert.match(String(error.stack), /Caused by: Error: Original error/);
  });

  // Teardown after all tests
  await t.test('teardown', () => {
    teardownFsMocks();
  });
});
