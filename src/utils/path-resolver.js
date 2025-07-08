import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';

// Debug logging utility
const debug = (() => {
  const isDebug = process.env.DEBUG_PATH_RESOLVER === 'true' || process.env.NODE_ENV === 'test';
  return (...args) => {
    if (isDebug) {
      console.debug('[PathResolver]', ...args);
    }
  };
})();

/**
 * @file Path resolution utility for handling path aliases consistently
 * @module utils/path-resolver
 * @description Provides centralized path resolution with support for aliases
 * defined in jsconfig.json. This utility is used by both the application
 * and test runners to ensure consistent path resolution.
 *
 * Features:
 * - Path alias resolution (e.g., @/utils/logger)
 * - Test environment detection and handling
 * - Debug logging for troubleshooting
 * - Consistent path resolution across environments
 *
 * @example
 * import { resolvePath, getTestMockPath } from '@/utils/path-resolver';
 *
 * // Resolve a path using aliases
 * const absolutePath = resolvePath('@/config/database');
 * 
 * // Get correct mock path for tests
 * const mockPath = getTestMockPath(import.meta.url, '../config/constants.js');
 */

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..'
);

// Cache for the parsed jsconfig.json
let jsConfigCache = null;

// Normalize path separators to forward slashes for consistent matching
const normalizePath = (p) => p.replace(/\\/g, '/');

// Check if a path is inside the project root
const isPathInProjectRoot = (filePath) => {
  const relative = path.relative(PROJECT_ROOT, filePath);
  return !relative.startsWith('..') && !path.isAbsolute(relative);
};

// Cache for resolved aliases
let aliasCache = null;

/**
 * Determines if the current environment is a test environment
 * @returns {boolean} True if running in a test environment
 */
function isTestEnvironment() {
  return process.env.NODE_ENV === 'test' || 
         process.env.JEST_WORKER_ID !== undefined ||
         process.env.VITEST_WORKER_ID !== undefined ||
         process.env.MOCHA_WORKER !== undefined;
}

/**
 * Helper to get the correct path for test mocks relative to the test file
 * @param {string} testFileUrl - The URL of the test file (import.meta.url)
 * @param {string} importPath - The import path from the module being tested
 * @returns {string} The correct path to use for mocking
 */
export function getTestMockPath(testFileUrl, importPath) {
  if (!isTestEnvironment()) {
    return importPath;
  }

  const testDir = path.dirname(fileURLToPath(testFileUrl));
  const projectRoot = findProjectRoot(__dirname);
  
  // If it's a relative path, resolve it relative to the test file
  if (importPath.startsWith('.')) {
    const resolvedPath = path.resolve(testDir, importPath);
    const relativeToRoot = path.relative(projectRoot, resolvedPath);
    debug(`Resolved test mock path: ${importPath} -> ${relativeToRoot}`);
    return relativeToRoot.replace(/\\/g, '/');
  }
  
  // For non-relative paths, return as-is
  return importPath;
}

/**
 * Finds the project root directory by looking for package.json
 * @param {string} startDir - Directory to start searching from
 * @returns {string} The project root directory
 */
function findProjectRoot(startDir) {
  let current = path.resolve(startDir);
  
  while (current !== path.dirname(current)) {
    const packagePath = path.join(current, 'package.json');
    if (fs.existsSync(packagePath)) {
      return current;
    }
    current = path.dirname(current);
  }
  
  return process.cwd();
}

/**
 * Clears the alias cache, forcing it to be reloaded on next access
 * This is primarily useful for testing
 */
export function clearAliasCache() {
  aliasCache = null;
}

/**
 * Custom error class for path resolution errors
 */
export class PathResolutionError extends Error {
  /**
   * @param {string} message - Error message
   * @param {string} [specifier] - The path or specifier that failed to resolve
   * @param {Error} [cause] - The underlying error that caused this error
   */
  constructor(message, specifier = '', cause = null) {
    super(message);
    this.name = 'PathResolutionError';
    this.specifier = specifier;
    this.cause = cause;
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PathResolutionError);
    }
    
    // Add cause to stack trace if available
    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Loads and parses jsconfig.json
 * @returns {Promise<Object>} The parsed jsconfig object
 * @private
 */
async function loadJsConfig() {
  const jsconfigPath = path.join(PROJECT_ROOT, 'jsconfig.json');
  console.log(`[PATH-RESOLVER] Loading jsconfig from: ${jsconfigPath}`);
  
  try {
    let content;
    
    // Check for mock file system in test environment
    if (process.env.NODE_ENV === 'test' && global.MOCK_FS) {
      const normalizedPath = normalizePath(jsconfigPath);
      console.log(`[PATH-RESOLVER] Using mock file system for: ${normalizedPath}`);
      content = global.MOCK_FS[normalizedPath];
      
      if (!content) {
        throw new Error(`File not found in mock FS: ${normalizedPath}`);
      }
    } else {
      // Use real file system
      content = await fs.readFile(jsconfigPath, 'utf-8');
    }
    
    console.log(`[PATH-RESOLVER] Successfully read jsconfig.json`);
    const config = typeof content === 'string' ? JSON.parse(content) : content;
    console.log(`[PATH-RESOLVER] Parsed jsconfig.json:`, JSON.stringify({
      baseUrl: config?.compilerOptions?.baseUrl,
      paths: Object.keys(config?.compilerOptions?.paths || {})
    }, null, 2));
    return config;
  } catch (error) {
    console.error(`[PATH-RESOLVER] Failed to load/parse jsconfig.json:`, error);
    throw new PathResolutionError(
      `Failed to load or parse jsconfig.json: ${error.message}`,
      jsconfigPath,
      error
    );
  }
}

/**
 * Validates the structure of the jsconfig object
 * @param {Object} config - The parsed jsconfig object
 * @throws {PathResolutionError} If the configuration is invalid
 * @private
 */
function validateJsConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new PathResolutionError('jsconfig.json must be an object');
  }

  const { compilerOptions } = config;
  if (!compilerOptions || typeof compilerOptions !== 'object') {
    throw new PathResolutionError('Missing or invalid compilerOptions in jsconfig.json');
  }

  const { baseUrl, paths } = compilerOptions;
  
  if (baseUrl && typeof baseUrl !== 'string') {
    throw new PathResolutionError('baseUrl in compilerOptions must be a string');
  }
  
  if (paths && typeof paths !== 'object') {
    throw new PathResolutionError('paths in compilerOptions must be an object');
  }
}

/**
 * Initializes the alias cache by loading and processing jsconfig.json
 * @returns {Promise<Map<string, string>>} Map of aliases to their resolved paths
 * @private
 */
async function initAliasCache() {
  if (aliasCache) {
    return aliasCache;
  }

  aliasCache = new Map();
  
  try {
    const config = await loadJsConfig();
    validateJsConfig(config);
    
    const { baseUrl = '.', paths = {} } = config.compilerOptions;
    const basePath = path.resolve(PROJECT_ROOT, baseUrl);
    
    for (const [alias, pathArray] of Object.entries(paths)) {
      try {
        if (!Array.isArray(pathArray) || pathArray.length === 0) {
          continue;
        }
        
        const cleanAlias = alias.replace(/[\/*]+$/, '');
        const cleanTargetPath = pathArray[0].replace(/[\/*]+$/, '');
        
        if (!cleanAlias || !cleanTargetPath) {
          continue;
        }
        
        const resolvedPath = path.resolve(basePath, cleanTargetPath);
        
        // Verify the path exists
        try {
          if (process.env.NODE_ENV === 'test' && global.MOCK_FS) {
            // Check mock file system
            const normalizedPath = normalizePath(resolvedPath);
            const pathExists = Object.keys(global.MOCK_FS).some(key => {
              // Check for exact match or if this is a directory containing the path
              return key === normalizedPath || 
                     (global.MOCK_FS[key]?.isDirectory && 
                      normalizedPath.startsWith(key + '/'));
            });
            
            if (!pathExists) {
              throw new Error('Path not found in mock FS');
            }
          } else {
            // Use real file system
            await fs.access(resolvedPath, fs.constants.R_OK);
          }
          
          aliasCache.set(cleanAlias, resolvedPath);
        } catch (accessError) {
          console.warn(`[path-resolver] Path does not exist: ${resolvedPath} (alias: ${cleanAlias})`);
        }
        
      } catch (error) {
        console.warn(`[path-resolver] Error processing alias '${alias}':`, error.message);
      }
    }
    
    return aliasCache;
    
  } catch (error) {
    aliasCache = null; // Reset cache on error
    throw error;
  }
}

/**
 * Resolves a path using the configured aliases
 * @param {string} specifier - The path or specifier to resolve
 * @returns {Promise<string>} The resolved absolute path
 * @throws {PathResolutionError} If the path cannot be resolved
 */
export async function resolvePath(specifier, basePath = process.cwd()) {
  debug(`Resolving path: ${specifier} (base: ${basePath})`);
  
  if (typeof specifier !== 'string' || !specifier.trim()) {
    const error = new PathResolutionError('Invalid path specifier', specifier);
    debug(`Path resolution error: ${error.message}`);
    throw error;
  }

  // Check if the path is already absolute
  if (path.isAbsolute(specifier)) {
    const resolvedPath = path.resolve(specifier);
    // Security check: ensure resolved path is within project root
    if (!isPathInProjectRoot(resolvedPath)) {
      throw new PathResolutionError(
        `Resolved path is outside project root: ${resolvedPath}`,
        specifier
      );
    }
    return resolvedPath;
  }

  // Handle relative paths
  if (specifier.startsWith('.')) {
    const resolvedPath = path.resolve(basePath, specifier);
    debug(`Resolved relative path: ${specifier} -> ${resolvedPath}`);
    
    // Security check: ensure relative paths don't escape project root
    if (!isPathInProjectRoot(resolvedPath)) {
      const error = new PathResolutionError(
        `Resolved path is outside project root: ${resolvedPath}`,
        specifier
      );
      debug(`Security violation: ${error.message}`);
      throw error;
    }
    
    // In test environment, ensure the path is in a format that matches the module system's expectations
    if (isTestEnvironment()) {
      const normalizedPath = path.normalize(resolvedPath).replace(/\\/g, '/');
      debug(`Normalized path for test environment: ${normalizedPath}`);
      return normalizedPath;
    }
    
    return resolvedPath;
  }

  // Handle URL imports (e.g., from node_modules)
  if (!specifier.startsWith('@')) {
    debug(`Returning non-aliased specifier as-is: ${specifier}`);
    return specifier;
  }

  // Initialize alias cache if needed
  const aliases = await initAliasCache();
  
  // Find the longest matching alias
  let bestMatch = '';
  console.log(`Resolving specifier: ${specifier}`);
  console.log(`Available aliases:`, Array.from(aliases.keys()));
  
  for (const [alias] of aliases) {
    const aliasPrefix = `${alias}/`;
    const isMatch = specifier.startsWith(aliasPrefix) || specifier === alias;
    console.log(`Checking alias '${alias}': isMatch=${isMatch}, specifier='${specifier}', aliasPrefix='${aliasPrefix}'`);
    
    if ((specifier.startsWith(aliasPrefix) || specifier === alias) && alias.length > bestMatch.length) {
      bestMatch = alias;
      console.log(`New best match: ${bestMatch}`);
    }
  }
  
  if (!bestMatch) {
    throw new PathResolutionError(`No matching alias found for: ${specifier}`, specifier);
  }
  
  const aliasMapping = aliases.get(bestMatch);
  const aliasPrefix = `${bestMatch}/`;
  // Construct the full path by joining the base path with the remaining path
  // Remove any leading ./ or ../ from the specifier
  const relativePath = specifier.slice(aliasPrefix.length).replace(/^\.?\//, '');
  
  // Get the base path from the alias mapping (remove trailing /* if present)
  const aliasBasePath = aliasMapping.replace(/\*$/, '');
  
  // Join the paths, ensuring we don't duplicate the project root
  let fullPath = path.join(aliasBasePath, relativePath);
  
  // If the base path isn't absolute, prepend the project root
  if (!path.isAbsolute(fullPath)) {
    fullPath = path.join(PROJECT_ROOT, fullPath);
  }

  // Add .js extension if not present
  if (!fullPath.endsWith('.js')) {
    const jsPath = `${fullPath}.js`;
    // In tests, check if the path exists in the mock FS
    if (process.env.NODE_ENV === 'test' || typeof global !== 'undefined' && global.MOCK_FS) {
      const mockFs = global.MOCK_FS || {};
      const normalizedJsPath = jsPath.replace(/\\/g, '/');
      if (mockFs[normalizedJsPath] !== undefined) {
        fullPath = jsPath;
      }
    } 
    // In production/development, check the actual filesystem
    else {
      try {
        await fs.promises.access(jsPath);
        fullPath = jsPath;
      } catch (e) {
        // If .js version doesn't exist, keep the original path
      }
    }
  }

  // Normalize the path to handle any ../ or ./ segments
  const normalizedPath = path.normalize(fullPath).replace(/\\/g, '/');
  
  // Security check: ensure the path is within the project
  if (!isPathInProjectRoot(normalizedPath)) {
    throw new PathResolutionError(
      `Resolved path is outside project root: ${normalizedPath}`,
      specifier
    );
  }
  
  return normalizedPath;
}

// Initialize the cache immediately (non-blocking)
initAliasCache().catch(error => {
  console.error('Failed to initialize path aliases:', error);
});
