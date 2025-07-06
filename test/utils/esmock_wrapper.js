/**
 * @file ES Module mocking utility with path alias resolution
 * @module test/utils/esmock_wrapper
 * @description This module provides a wrapper around esmock that adds support for:
 * - Path alias resolution (e.g., @/utils/logger.js)
 * - Cross-platform path handling (Windows/POSIX)
 * - Consistent path resolution for tests
 * - Caching of resolved paths and mocks for performance
 * 
 * @example
 * // Basic usage
 * import { esmockWithPaths } from './test/utils/esmock_wrapper.js';
 * 
 * const mockModule = await esmockWithPaths(
 *   import.meta.url,
 *   '../../src/module.js',
 *   { '@/utils/logger.js': { log: () => {} } }
 * );
 * 
 * @see {@link https://github.com/iambumblehead/esmock} for the underlying esmock library
 */
import esmock from 'esmock';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import sinon from 'sinon';
import { parse } from 'jsonc-parser'; // <-- IMPORT THE NEW PARSER

// --- Configuration ---
/** @constant {boolean} IS_DEBUG - Controls debug logging */
const IS_DEBUG = process.env.ESMOCK_DEBUG === 'true';

/** @constant {string} projectRoot - Absolute path to the project root directory */
const projectRoot = path.resolve(fileURLToPath(import.meta.url), '../../../');

/** @constant {string} jsconfigPath - Path to the jsconfig.json file */
const jsconfigPath = path.join(projectRoot, 'jsconfig.json');

/**
 * @typedef {Object} JsConfig
 * @property {Object} [compilerOptions] - Compiler options from jsconfig
 * @property {Object} [compilerOptions.paths] - Path aliases configuration
 * @property {string[]} [compilerOptions.paths.*] - Array of path patterns for each alias
 */

// --- Error Classes ---

/**
 * Error thrown when there's an issue with the jsconfig.json configuration
 * @extends Error
 */
class ConfigError extends Error {
  constructor(message, cause) {
    super(message);
    this.name = 'ConfigError';
    this.cause = cause;
  }
}

/**
 * Error thrown when path resolution fails
 * @extends Error
 */
class PathResolutionError extends Error {
  constructor(message, specifier, cause) {
    super(message);
    this.name = 'PathResolutionError';
    this.specifier = specifier;
    this.cause = cause;
  }
}

/**
 * Logs messages to the console only if ESMOCK_DEBUG is enabled.
 * @param {...any} args - The messages or objects to log.
 */
const logDebug = (...args) => {
  if (IS_DEBUG) {
    console.log('[esmockWrapper]', ...args);
  }
};

/**
 * Validates the structure of jsconfig.json
 * @param {JsConfig} jsconfig - The parsed jsconfig object
 * @throws {ConfigError} If the configuration is invalid
 */
function validateJsConfig(jsconfig) {
  if (!jsconfig || typeof jsconfig !== 'object') {
    throw new ConfigError('Invalid jsconfig.json: must be an object');
  }

  const { compilerOptions } = jsconfig;
  if (!compilerOptions || typeof compilerOptions !== 'object') {
    throw new ConfigError('Missing or invalid compilerOptions in jsconfig.json');
  }

  const { paths } = compilerOptions;
  if (paths && typeof paths !== 'object') {
    throw new ConfigError('paths in compilerOptions must be an object');
  }
}

/**
 * Parses jsconfig.json to extract path aliases.
 * Caches the result to avoid repeated file reads.
 * @returns {Map<string, string>} A map of aliases to their resolved paths.
 * @throws {ConfigError} If jsconfig.json is invalid or cannot be read
 */
const getPathAliases = (() => {
  let aliases = null;
  return () => {
    if (aliases) {
      return aliases;
    }

    aliases = new Map();
    
    try {
      if (!fs.existsSync(jsconfigPath)) {
        logDebug('jsconfig.json not found, using default aliases');
        return aliases;
      }

      const jsconfigRaw = fs.readFileSync(jsconfigPath, 'utf-8');
      const jsconfig = parse(jsconfigRaw);
      
      // Validate the structure
      validateJsConfig(jsconfig);

      const paths = jsconfig?.compilerOptions?.paths || {};
      
      for (const [alias, pathArray] of Object.entries(paths)) {
        try {
          if (!Array.isArray(pathArray) || pathArray.length === 0) {
            logDebug(`Skipping empty path array for alias: ${alias}`);
            continue;
          }
          
          const cleanAlias = alias.replace(/[\/*]+$/, '');
          const cleanTargetPath = pathArray[0].replace(/[\/*]+$/, '');
          
          if (!cleanAlias) {
            logDebug('Skipping empty alias');
            continue;
          }
          
          if (!cleanTargetPath) {
            logDebug(`Skipping empty target path for alias: ${alias}`);
            continue;
          }
          
          const resolvedPath = path.join(projectRoot, cleanTargetPath);
          
          // Verify the path exists
          if (!fs.existsSync(resolvedPath)) {
            logDebug(`Path does not exist: ${resolvedPath} (alias: ${alias})`);
            continue;
          }
          
          aliases.set(cleanAlias, resolvedPath);
          logDebug(`Mapped alias: ${alias} -> ${resolvedPath}`);
          
        } catch (error) {
          console.warn(`[esmockWrapper] Error processing alias '${alias}':`, error.message);
        }
      }
      
    } catch (error) {
      // Re-throw as ConfigError with more context
      throw new ConfigError(
        `Failed to process jsconfig.json: ${error.message}`,
        error
      );
    }
    
    return aliases;
  };
})();

/**
 * Resolves an import string using path aliases if applicable.
 * 
 * For aliased paths (e.g., @/utils/logger.js), it returns a path relative to the project root.
 * For relative paths (./path or ../path), it returns them unchanged.
 * For absolute paths, it returns them unchanged.
 * 
 * All paths use forward slashes for cross-platform consistency.
 * 
 * @param {string} importString - The import string to resolve
 * @returns {string} The resolved path:
 *   - For aliases: path relative to project root (e.g., 'src/utils/logger.js')
 *   - For relative paths: the original path (e.g., './relative/path.js')
 *   - For absolute paths: the original path (e.g., '/absolute/path.js')
 * @throws {PathResolutionError} If there's an error resolving the path
 * @example
 * // Returns 'src/utils/logger.js'
 * resolveAlias('@/utils/logger.js');
 * 
 * // Returns './relative/path.js'
 * resolveAlias('./relative/path.js');
 */
const resolveAlias = (importString) => {
  try {
    if (typeof importString !== 'string' || !importString.trim()) {
      throw new Error('Invalid import string');
    }

    const aliases = getPathAliases();
    
    for (const [alias, basePath] of aliases.entries()) {
      if (importString.startsWith(`${alias}/`)) {
        const relativePath = importString.substring(alias.length + 1);
        const resolvedPath = path.join(basePath, relativePath);
        
        // Normalize path for consistent output
        const normalizedPath = path.normalize(resolvedPath);
        
        // Verify the resolved path is within the project
        if (!normalizedPath.startsWith(projectRoot)) {
          throw new Error(`Resolved path is outside project root: ${normalizedPath}`);
        }
        
        // Convert to relative path from project root and normalize separators
        const relativeToRoot = path.relative(projectRoot, normalizedPath);
        return relativeToRoot.replace(/\\/g, '/');
      }
    }
    
    return importString;
    
  } catch (error) {
    if (error instanceof ConfigError) {
      throw error; // Re-throw config errors as-is
    }
    throw new PathResolutionError(
      `Failed to resolve import: ${importString}`,
      importString,
      error
    );
  }
};

/**
 * A robust, cross-platform wrapper for esmock that simplifies mocking of ES modules.
 * It supports relative paths, path aliases from jsconfig.json, and global mocks.
 *
 * @async
 * @param {string} testFileUrl - The URL of the test file, i.e., `import.meta.url`.
 * @param {string} modulePathRelativeToTestFile - The relative path from the test file to the module under test.
 * @param {object} [userMocks={}] - An object where keys are module import strings (or aliases) and values are the mock implementations.
 * @param {object} [globalMocks={}] - An object for mocking global variables (e.g., { Date, fetch }).
 * @returns {Promise<any>} A promise that resolves to the mocked module instance.
 * @example
 * const { handlePlayCard } = await esmockWithPaths(
 *   import.meta.url,
 *   '../../../src/game/phases/playingPhase.js',
 *   {
 *     '@/utils/logger.js': mockLogger,
 *     '../../logic/validation.js': mockValidation,
 *     'nanoid': { nanoid: () => 'mock-id' }
 *   },
 *   { Date: MockDate }
 * );
 */
// Main function to mock modules with path resolution
async function esmockWithPaths(
  testFileUrl,
  modulePathRelativeToTestFile,
  userMocks = {},
  globalMocks = {}
) {
  if (!testFileUrl) {
    throw new Error('[esmockWrapper] `testFileUrl` (import.meta.url) is required.');
  }
  if (!modulePathRelativeToTestFile) {
    throw new Error('[esmockWrapper] `modulePathRelativeToTestFile` is required.');
  }

  const testFileDir = path.dirname(fileURLToPath(testFileUrl));
  const absoluteModulePath = path.resolve(testFileDir, modulePathRelativeToTestFile);
  // Use forward slashes for consistent module resolution across platforms
  const moduleUrl = absoluteModulePath.replace(/\\/g, '/');
  logDebug(`Module under test resolved to URL: ${moduleUrl}`);

  const sourceModuleDir = path.dirname(absoluteModulePath);
  const resolvedMocks = {};

  for (const [importStringKey, mockValue] of Object.entries(userMocks)) {
    const aliasedPath = resolveAlias(importStringKey);
    let mockKey;
  
    if (path.isAbsolute(aliasedPath)) {
      // Convert to forward slashes for Windows compatibility
      mockKey = aliasedPath.replace(/\\/g, '/');
    } else if (aliasedPath.startsWith('./') || aliasedPath.startsWith('../')) {
      const absoluteMockPath = path.resolve(sourceModuleDir, aliasedPath);
      mockKey = absoluteMockPath.replace(/\\/g, '/');
    } else {
      // For node_modules or built-in modules
      mockKey = aliasedPath;
    }
  
    // Ensure the key is in a consistent format
    resolvedMocks[mockKey] = mockValue;
  }

  try {
    logDebug(`Loading module: ${moduleUrl}`);
    logDebug('With mocks:', Object.keys(resolvedMocks));
    return await esmock(moduleUrl, resolvedMocks, globalMocks);
  } catch (error) {
    console.error('[esmockWrapper] Error loading module:', error);
    console.error('Module URL:', moduleUrl);
    console.error('Resolved mocks:', Object.keys(resolvedMocks));
    throw error;
  }
}

/**
 * Creates a mocked module with common dependencies automatically stubbed.
 * This is a higher-level factory function to reduce boilerplate in tests.
 *
 * @async
 * @param {string} testFileUrl - The URL of the test file, i.e., `import.meta.url`.
 * @param {string} modulePathRelativeToTestFile - The relative path to the module under test.
 * @param {object} [overrideMocks={}] - Mocks to override the common defaults.
 * @returns {Promise<{module: any, mocks: object}>} An object containing the mocked module and the stubs used.
 * @example
 * // In a test file:
 * let mockedPhase, mocks;
 * beforeEach(async () => {
 *   ({ module: mockedPhase, mocks } = await createMockedModule(
 *     import.meta.url,
 *     '../../../src/game/phases/somePhase.js',
 *     {  // Only override what's necessary for the test
 *       '@/utils/players.js': { getNextPlayer: () => 'player2' }
 *     }
 *   ));
 * });
 */
// Create the mocked module with common stubs
async function createMockedModule(testFileUrl, modulePathRelativeToTestFile, overrideMocks = {}) {
  const mocks = {
    logger: {
      info: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      debug: sinon.stub(),
    },
    // Add other common mocks here if needed
  };

  const finalMocks = {
    '@/utils/logger.js': mocks.logger,
    ...overrideMocks,
  };

  const module = await esmockWithPaths(testFileUrl, modulePathRelativeToTestFile, finalMocks);

  return { module, mocks };
}

// Export the public API
export {
  esmockWithPaths,
  createMockedModule,
  resolveAlias
};

// For testing purposes only
export const _testing = {
  projectRoot,
  jsconfigPath,
  ConfigError,
  PathResolutionError
};

/**
 * IMPORTANT: Mock Cleanup
 * 
 * To ensure proper test isolation, follow these guidelines:
 * 
 * 1. For each test file, import the modules you need at the top:
 *    ```javascript
 *    import { esmockWithPaths, createMockedModule } from '../utils/esmock_wrapper.js';
 *    ```
 * 
 * 2. In your test setup, use `beforeEach` to create fresh mocks:
 *    ```javascript
 *    let myModule, mocks;
 *    
 *    beforeEach(async () => {
 *      // Create fresh mocks for each test
 *      ({ module: myModule, mocks } = await createMockedModule(
 *        import.meta.url,
 *        '../../path/to/module.js',
 *        {
 *          // Your mock overrides here
 *        }
 *      ));
 *    });
 *    ```
 * 
 * 3. In your test teardown, use `afterEach` to clean up:
 *    ```javascript
 *    afterEach(() => {
 *      // Clear any module caches if needed
 *      if (typeof require !== 'undefined' && require.cache) {
 *        Object.keys(require.cache).forEach(key => {
 *          delete require.cache[key];
 *        });
 *      }
 *    });
 *    ```
 * 
 * Note: There is no need to call `purgeAllEsmock()` as it's not a valid operation.
 * The `esmock` module handles cleanup automatically between tests.
 */