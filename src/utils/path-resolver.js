import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { createMatchPath, loadConfig } from 'tsconfig-paths';

/**
 * @file Path resolution utility for handling path aliases consistently
 * @module utils/path-resolver
 * @description Provides centralized path resolution with support for aliases
 * defined in tsconfig.json/jsconfig.json. This utility uses tsconfig-paths
 * under the hood for robust path resolution that works consistently across
 * different environments (development, testing, production).
 *
 * @example
 * import { resolvePath } from '@/utils/path-resolver';
 *
 * // Resolve a path using aliases
 * const absolutePath = await resolvePath('@/config/database');
 *
 * // Resolve a module (supports both ESM and CommonJS)
 * const modulePath = await resolvePath('@/utils/logger', { type: 'module' });
 */

// Get project root directory
const __filename = fileURLToPath(import.meta.url);
const PROJECT_ROOT = path.resolve(path.dirname(__filename), '../..');

// Cache for resolved paths
const pathCache = new Map();

// Cache for tsconfig-paths matcher
let tsPathsMatcher = null;

/**
 * Custom error class for path resolution errors
 */
class PathResolutionError extends Error {
  constructor(message, specifier = '', cause = null) {
    super(message);
    this.name = 'PathResolutionError';
    this.specifier = specifier;
    this.cause = cause;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PathResolutionError);
    }
    
    if (cause && cause.stack) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`;
    }
  }
}

/**
 * Initializes the tsconfig-paths matcher
 * @returns {Promise<Function>} The path matcher function
 * @private
 */
async function initTsPathsMatcher() {
  if (tsPathsMatcher) {
    return tsPathsMatcher;
  }

  try {
    const result = loadConfig(process.cwd());
    
    if (result.resultType === 'success') {
      const { absoluteBaseUrl, paths } = result;
      tsPathsMatcher = createMatchPath(absoluteBaseUrl, paths, ['main']);
      return tsPathsMatcher;
    }
    
    throw new Error('Failed to load tsconfig/jsconfig');
  } catch (error) {
    console.warn('Failed to initialize tsconfig-paths, falling back to basic resolution');
    
    // Fallback to basic path resolution
    tsPathsMatcher = (requestedModule) => {
      if (requestedModule.startsWith('@/')) {
        return path.resolve(PROJECT_ROOT, requestedModule.replace('@/', 'src/'));
      } else if (requestedModule.startsWith('@test/')) {
        return path.resolve(PROJECT_ROOT, requestedModule.replace('@test/', 'test/'));
      }
      return null;
    };
    
    return tsPathsMatcher;
  }
}

/**
 * Resolves a module path using tsconfig-paths
 * @param {string} requestedModule - The module specifier to resolve
 * @param {Object} [options] - Resolution options
 * @param {string} [options.type='file'] - The type of resolution ('file' or 'module')
 * @returns {Promise<string>} The resolved path
 * @private
 */
async function resolveWithTsPaths(requestedModule, { type = 'file' } = {}) {
  const cacheKey = `${requestedModule}:${type}`;
  
  // Check cache first
  if (pathCache.has(cacheKey)) {
    return pathCache.get(cacheKey);
  }
  
  try {
    const matcher = await initTsPathsMatcher();
    let resolvedPath = matcher(requestedModule);
    
    if (!resolvedPath) {
      // If not found in tsconfig paths, try Node.js resolution
      if (type === 'module') {
        try {
          const resolved = await import.meta.resolve(requestedModule, `file://${PROJECT_ROOT}/`);
          resolvedPath = fileURLToPath(resolved);
        } catch (e) {
          // Fall through to throw error below
        }
      } else {
        try {
          const require = createRequire(import.meta.url);
          resolvedPath = require.resolve(requestedModule, { paths: [PROJECT_ROOT] });
        } catch (e) {
          // Fall through to throw error below
        }
      }
      
      if (!resolvedPath) {
        throw new PathResolutionError(
          `Unable to resolve module: ${requestedModule}`,
          requestedModule
        );
      }
    }
    
    // Cache the result
    pathCache.set(cacheKey, resolvedPath);
    return resolvedPath;
  } catch (error) {
    if (error instanceof PathResolutionError) {
      throw error;
    }
    
    throw new PathResolutionError(
      `Error resolving module: ${requestedModule}`,
      requestedModule,
      error
    );
  }
}

/**
 * Resolves a path using the configured aliases
 * @param {string} specifier - The path or specifier to resolve
 * @param {Object} [options] - Resolution options
 * @param {string} [options.type='file'] - The type of resolution ('file' or 'module')
 * @returns {Promise<string>} The resolved absolute path
 * @throws {PathResolutionError} If the path cannot be resolved
 */
export async function resolvePath(specifier, { type = 'file' } = {}) {
  try {
    // Handle empty or invalid input
    if (typeof specifier !== 'string' || !specifier.trim()) {
      throw new PathResolutionError('Invalid path specifier', specifier);
    }
    
    // Handle absolute paths
    if (path.isAbsolute(specifier)) {
      return path.normalize(specifier);
    }
    
    // Handle relative paths
    if (specifier.startsWith('.')) {
      const resolvedPath = path.resolve(PROJECT_ROOT, specifier);
      
      // Verify the resolved path is inside the project
      if (!resolvedPath.startsWith(PROJECT_ROOT)) {
        throw new PathResolutionError(
          'Resolved path is outside project root',
          specifier
        );
      }
      
      return resolvedPath;
    }
    
    // Handle aliases and module resolution using tsconfig-paths
    return await resolveWithTsPaths(specifier, { type });
  } catch (error) {
    if (error instanceof PathResolutionError) {
      throw error;
    }
    
    throw new PathResolutionError(
      `Error resolving path: ${specifier}`,
      specifier,
      error
    );
  }
}

/**
 * Resolves a module path and returns the module URL (for ESM imports)
 * @param {string} specifier - The module specifier to resolve
 * @returns {Promise<string>} The resolved module URL
 * @throws {PathResolutionError} If the module cannot be resolved
 */
export async function resolveModule(specifier) {
  const resolvedPath = await resolvePath(specifier, { type: 'module' });
  return pathToFileURL(resolvedPath).href;
}

/**
 * Clears the path resolution cache
 * This is primarily useful for testing
 */
export function clearPathCache() {
  pathCache.clear();
  tsPathsMatcher = null;
}

// Initialize the tsconfig-paths matcher (non-blocking)
initTsPathsMatcher().catch(error => {
  console.error('Failed to initialize path resolution:', error);
});
