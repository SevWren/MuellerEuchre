import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs, { existsSync } from 'node:fs';
import { promises as fsp } from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import { createMatchPath, loadConfig } from 'tsconfig-paths';

// Type definitions for better type safety
/** @typedef {import('node:fs').Stats} FsStats */

/**
 * Error class for path resolution failures
 */
class PathResolutionError extends Error {
  /**
   * @param {string} message - The error message
   * @param {string} [specifier=''] - The path or specifier that caused the error
   * @param {Error|undefined} [cause] - The underlying error that caused this error
   */
  constructor(message, specifier = '', cause = undefined) {
    super(message);
    this.name = 'PathResolutionError';
    this.specifier = specifier;
    if (cause) {
      this.cause = cause;
    }
    
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
 * @file Path resolution utility for handling path aliases consistently
 * @module utils/path-resolver
 * @description Provides centralized path resolution with support for aliases
 * defined in jsconfig.json/tsconfig.json. This utility uses tsconfig-paths
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
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..', '..'
);

/**
 * Cache for resolved paths with TTL and LRU eviction
 * @type {Map<string, {value: string, expires: number, lastAccessed: number}>}
 */
const pathCache = new Map();
// Cache configuration
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CACHE_SIZE_LIMIT = 1000; // Maximum number of cache entries
const MAX_CACHE_SIZE = CACHE_SIZE_LIMIT; // Alias for backward compatibility
let cacheHits = 0;
let cacheMisses = 0;

/**
 * Normalizes path separators to forward slashes for consistent matching
 * @param {string} p - The path to normalize
 * @returns {string} The normalized path
 */
const normalizePath = (p) => typeof p === 'string' ? p.replace(/\\/g, '/') : '';

/**
 * Ensures the path has a .js extension if it's a local file path
 * @param {string} filePath - The path to check
 * @returns {Promise<string>} The path with .js extension if needed
 */
async function ensureJsExtension(filePath) {
  if (!filePath) return filePath;
  
  // Skip URLs or protocol-based paths
  if (filePath.startsWith('http:') || filePath.startsWith('https:') || 
      filePath.startsWith('file:') || filePath.startsWith('node:')) {
    return filePath;
  }
  
  // Skip if it's a node module or already has an extension
  if (filePath.includes('node_modules') || path.extname(filePath)) {
    return filePath;
  }
  
  // Handle Windows paths with drive letters
  const hasDrive = /^[a-zA-Z]:[\\/]/.test(filePath);
  const normalizedPath = hasDrive 
    ? filePath.replace(/\\/g, '/') 
    : path.normalize(filePath).replace(/\\/g, '/');
  
  // Skip if it's a directory
  try {
    const stats = await fsp.stat(filePath).catch(() => null);
    if (stats?.isDirectory()) {
      return filePath;
    }
    
    // If file exists without extension, return as is
    if (stats?.isFile()) {
      return filePath;
    }
  } catch (e) {
    // Continue to add .js if we can't stat the file
  }
  
  // Add .js extension if it doesn't exist and the path doesn't end with /
  if (!filePath.endsWith('/') && !filePath.endsWith('\\')) {
    return `${filePath}.js`;
  }
  
  return filePath;
}

// Cache for tsconfig-paths matcher
let tsPathsMatcher = null;

// Initialization state tracking - consolidated to single location
let _isInitialized = false;
let _isInitializing = false;
let _initializationError = null;

/**
 * Checks if a module is a Node.js built-in module
 * @param {string} specifier - The module specifier to check
 * @returns {boolean} True if the specifier is a Node.js built-in module
 * @private
 */
function isNodeBuiltin(specifier) {
  if (typeof specifier !== 'string') return false;
  
  // Handle @node/ prefix (Node.js core modules)
  if (specifier.startsWith('node:') || specifier.startsWith('@node/')) {
    return true;
  }
  
  // Check against built-in modules
  const builtins = new Set([
    'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'crypto',
    'dgram', 'dns', 'domain', 'events', 'fs', 'http', 'http2', 'https',
    'inspector', 'module', 'net', 'os', 'path', 'perf_hooks', 'process',
    'punycode', 'querystring', 'readline', 'repl', 'stream', 'string_decoder',
    'timers', 'tls', 'trace_events', 'tty', 'url', 'util', 'v8', 'vm', 'worker',
    'zlib'
  ]);
  
  return builtins.has(specifier.split('/')[0]);
}

/**
 * Validates if a path is safe and within the project root
 * @param {string} filePath - The path to validate
 * @returns {boolean} True if the path is safe, false otherwise
 * @private
 */
function isPathSafe(filePath) {
  if (typeof filePath !== 'string') return false;
  
  const normalizedPath = path.normalize(filePath);
  const relativePath = path.relative(PROJECT_ROOT, normalizedPath);
  
  // Prevent directory traversal
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return false;
  }
  
  return true;
}

/**
 * Initializes the tsconfig-paths matcher
 * @returns {Promise<Function>} The path matcher function
 * @private
 */
const initTsPathsMatcher = async () => {
  if (tsPathsMatcher) return tsPathsMatcher;
  
  // If already initializing, wait for it to complete
  if (_isInitializing) {
    await new Promise((resolve) => {
      const checkInitialized = () => {
        if (!_isInitializing) {
          resolve(undefined);
        } else {
          setTimeout(checkInitialized, 10);
        }
      };
      checkInitialized();
    });
    return tsPathsMatcher;
  }
  
  // Mark as initializing
  _isInitializing = true;
  _initializationError = null;

  try {
    // Try to load tsconfig.json first, fall back to jsconfig.json
    const tsConfigResult = loadConfig(process.cwd());
    
    if (tsConfigResult.resultType === 'success') {
      const { absoluteBaseUrl, paths } = tsConfigResult;
      tsPathsMatcher = createMatchPath(absoluteBaseUrl, paths, ['main']);
      
      // Update initialization state
      _isInitialized = true;
      _isInitializing = false;
      
      return tsPathsMatcher;
    }
    
    throw new Error('Failed to load tsconfig/jsconfig');
  } catch (error) {
    console.warn('Failed to initialize tsconfig-paths, falling back to basic resolution');
    
    // Fallback to basic path resolution
    tsPathsMatcher = (requestedModule) => {
      // Basic path resolution logic here
      return requestedModule;
    };
    
    // Update initialization state
    _isInitialized = true;
    _isInitializing = false;
    
    return tsPathsMatcher;
  }
};

/**
 * Cleans up the cache by removing expired entries and optionally trimming to a target size
 * @param {number} [targetSize] - Optional target size to trim the cache to
 * @returns {number} Number of entries removed
 * @private
 */
function cleanupCache(targetSize) {
  const now = Date.now();
  let removedCount = 0;
  
  // First remove expired entries
  for (const [key, entry] of pathCache.entries()) {
    if (now > entry.expires) {
      pathCache.delete(key);
      removedCount++;
    }
  }
  
  // If a target size is provided and we're still over it, remove least recently used entries
  if (targetSize !== undefined && pathCache.size > targetSize) {
    const entries = Array.from(pathCache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
    
    const entriesToRemove = pathCache.size - targetSize;
    for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
      pathCache.delete(entries[i][0]);
      removedCount++;
    }
  }
  
  return removedCount;
}

/**
 * Gets a value from the cache if it exists and is not expired
 * @param {string} key - The cache key
 * @returns {any|undefined} The cached value or undefined if not found or expired
 * @private
 */
function getFromCache(key) {
  const now = Date.now();
  const entry = pathCache.get(key);
  
  if (!entry) {
    cacheMisses++;
    return undefined;
  }
  
  // Check if entry is expired
  const currentTime = Date.now();
  if (currentTime > entry.expires) {
    pathCache.delete(key);
    cacheMisses++;
    return undefined;
  }
  
  // Update last accessed time
  entry.lastAccessed = now;
  cacheHits++;
  
  // Return the value directly if it's a primitive or object without metadata
  return entry.value;
}

/**
 * Sets a value in the cache with metadata
 * @param {string} key - The cache key
 * @param {any} value - The value to cache
 * @param {Object} [options] - Cache options
 * @param {number} [options.ttl] - Time to live in milliseconds (overrides default)
 * @private
 */
function setInCache(key, value, { ttl } = {}) {
  const now = Date.now();
  
  // Clean up expired entries if we're approaching the size limit
  if (pathCache.size >= CACHE_SIZE_LIMIT * 0.9) {
    cleanupCache();
  }
  
  // Add the new entry with metadata
  const currentTime = Date.now();
  const cacheEntry = {
    value,
    expires: currentTime + CACHE_TTL_MS,
    lastAccessed: currentTime,
    createdAt: currentTime  // Included to match the type definition
  };
  pathCache.set(key, cacheEntry);
  
  return value;
}

/**
 * Clears the path resolution cache, forcing it to be reloaded on next access.
 * This is primarily useful for testing.
 * @param {string} [key] - Optional key to clear. If not provided, clears the entire cache.
 * @returns {number} Number of cache entries removed
 */
function clearAliasCache(key) {
  if (key !== undefined) {
    // Clear a specific key
    const hadKey = pathCache.has(key);
    pathCache.delete(key);
    return hadKey ? 1 : 0;
  }
  
  // Clear all cache entries
  const count = pathCache.size;
  pathCache.clear();
  
  // Reset the tsconfig-paths matcher and initialization state
  tsPathsMatcher = null;
  _initializationError = null;
  _isInitializing = false;
  _isInitialized = false;
  
  // Reset cache stats
  cacheHits = 0;
  cacheMisses = 0;
  
  return count;
}

/**
 * Loads and parses the project's configuration (tsconfig.json or jsconfig.json)
 * @returns {Promise<Object>} The parsed config object with resolved paths
 * @private
 */
async function loadProjectConfig() {
  try {
    // Try to load tsconfig.json first, fall back to jsconfig.json
    const result = loadConfig(process.cwd());
    
    if (result.resultType === 'success') {
      return {
        absoluteBaseUrl: result.absoluteBaseUrl,
        paths: result.paths,
        configFilePath: result.configFileAbsolutePath,
        isTsConfig: result.configFileAbsolutePath.endsWith('tsconfig.json')
      };
    }
    
    // Fall back to jsconfig.json if tsconfig.json not found
    const jsConfigPath = path.join(PROJECT_ROOT, 'jsconfig.json');
    const data = await fsp.readFile(jsConfigPath, 'utf-8');
    const config = JSON.parse(data);
    
    // Convert jsconfig.json format to match tsconfig-paths format
    const baseUrl = path.resolve(PROJECT_ROOT, config.compilerOptions.baseUrl || '.');
    
    return {
      absoluteBaseUrl: baseUrl,
      paths: config.compilerOptions.paths || {},
      configFilePath: jsConfigPath,
      isTsConfig: false
    };
  } catch (error) {
    // Handle the error with type safety
    const errorObj = error instanceof Error 
      ? error 
      : new Error(typeof error === 'string' ? error : 'Unknown error');
      
    throw new PathResolutionError(
      'Failed to load or parse project configuration (tsconfig.json/jsconfig.json)',
      '',
      errorObj
    );
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
  const cached = getFromCache(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  try {
    await initTsPathsMatcher();
    
    // Handle @/ alias specifically for test environment
    if (requestedModule.startsWith('@/')) {
      const relativePath = requestedModule.replace(/^@\//, '');
      const possiblePaths = [
        path.resolve(PROJECT_ROOT, 'src', relativePath),
        path.resolve(PROJECT_ROOT, 'test', relativePath),
        path.resolve(PROJECT_ROOT, relativePath)
      ];
      
      // Try each possible path with and without .js extension
      for (const basePath of possiblePaths) {
        const pathsToTry = [basePath];
        if (!basePath.endsWith('.js')) {
          pathsToTry.push(`${basePath}.js`);
        }
        
        for (const tryPath of pathsToTry) {
          try {
            await fsp.access(tryPath, fs.constants.F_OK);
            const resolvedPath = path.resolve(tryPath);
            setInCache(cacheKey, resolvedPath);
            return resolvedPath;
          } catch (/** @type {unknown} */ e) {
            // Continue to next path
          }
        }
      }
    }
    
    // Try to resolve using tsconfig-paths
    let resolvedPath = tsPathsMatcher(requestedModule);
    
    // If not found, try with .js extension
    if (!resolvedPath && !requestedModule.endsWith('.js')) {
      resolvedPath = tsPathsMatcher(`${requestedModule}.js`);
      
      // If still not found, try with .js extension added to the last path segment
      if (!resolvedPath) {
        const parts = requestedModule.split('/');
        const lastPart = parts[parts.length - 1];
        if (!lastPart.includes('.')) {  // Only if no extension
          parts[parts.length - 1] = `${lastPart}.js`;
          resolvedPath = tsPathsMatcher(parts.join('/'));
        }
      }
    }
    
    if (!resolvedPath) {
      // If not found in tsconfig paths, try Node.js resolution
      if (type === 'module') {
        // For ESM modules, we need to handle package.json exports
        try {
          const resolved = await import.meta.resolve(requestedModule, `file://${PROJECT_ROOT}/`);
          resolvedPath = fileURLToPath(resolved);
        } catch (e) {
          // Fall through to throw error below
        }
      } else {
        // For CommonJS or file paths
        try {
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
    
    // Cache the result with size limit
    if (pathCache.size >= MAX_CACHE_SIZE) {
      // Remove the first (oldest) entry if cache is full
      const firstKey = pathCache.keys().next().value;
      if (firstKey !== undefined) {
        pathCache.delete(firstKey);
      }
    }
    
    // Only cache if path is safe
    if (isPathSafe(resolvedPath)) {
      pathCache.set(cacheKey, resolvedPath);
    }
    
    return resolvedPath;
  } catch (/** @type {unknown} */ error) {
    if (error instanceof PathResolutionError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    throw new PathResolutionError(
      `Error resolving module: ${requestedModule}`,
      requestedModule,
      errorMessage
    );
  }
}

/**
 * Resolves a path using the configured aliases
 * @param {string} specifier - The path or specifier to resolve
 * @param {Object} [options] - Resolution options
 * @param {'file'|'module'} [options.type='file'] - The type of resolution ('file' or 'module')
 * @returns {Promise<string>} The resolved absolute path
 * @throws {PathResolutionError} If the path cannot be resolved
 * @throws {TypeError} If the input is invalid
 */
async function resolvePath(specifier, { type = 'file' } = {}) {
  // Validate input parameters
  if (typeof specifier !== 'string' || !specifier.trim()) {
    throw new TypeError('Specifier must be a non-empty string');
  }
  
  if (type !== 'file' && type !== 'module') {
    throw new TypeError("Type must be either 'file' or 'module'");
  }
  
  // Create a cache key that includes both the specifier and type
  const cacheKey = `${specifier}:${type}`;
  
  // Try to get from cache first
  const cached = getFromCache(cacheKey);
  if (cached !== undefined) {
    return cached;
  }
  
  // Handle URLs and special protocols
  // Handle URLs and special protocols
  if (/^[a-zA-Z]+:/.test(specifier)) {
    // For file: URLs, convert to path and resolve
    if (specifier.startsWith('file:')) {
      try {
        const filePath = fileURLToPath(specifier);
        const resolvedPath = await resolvePath(filePath, { type });
        try {
          // Check file access with read permission
          await fsp.access(resolvedPath, fsp.constants.R_OK);
          setInCache(cacheKey, resolvedPath);
          return resolvedPath;
        } catch (error) {
          throw new PathResolutionError(
            `File not found: ${resolvedPath}`,
            specifier,
            error instanceof Error ? error : new Error(String(error))
          );
        }
      } catch (error) {
        throw new PathResolutionError(
          `Failed to access file URL: ${specifier}`,
          specifier,
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
    
    // For other URLs, verify access and cache
    try {
      const url = new URL(specifier);
      // Only check access for file URLs, not http/https
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        setInCache(cacheKey, specifier);
        return specifier;
      }
      
      // For other URL types, check file access
      await fsp.access(url.pathname, fsp.constants.R_OK);
      setInCache(cacheKey, specifier);
      return specifier;
    } catch (error) {
      throw new PathResolutionError(
        `Failed to access URL: ${specifier}`,
        specifier,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  // Handle query parameters and hashes in the specifier
  const cleanSpecifier = specifier.split(/[?#]/)[0];
  const queryAndHash = specifier.slice(cleanSpecifier.length);
  
  // If the specifier has a query or hash, handle it after resolving the base path
  if (queryAndHash) {
    try {
      const basePath = await resolvePath(cleanSpecifier, { type });
      const resolvedPath = `${basePath}${queryAndHash}`;
      setInCache(cacheKey, resolvedPath);
      return resolvedPath;
    } catch (error) {
      throw new PathResolutionError(
        `Failed to resolve path with query/hash: ${specifier}`,
        specifier,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
  
  // Handle absolute paths
  if (path.isAbsolute(specifier)) {
    const normalizedPath = path.normalize(specifier);
    
    // Verify the path is within the project root for security
    if (!isPathSafe(normalizedPath)) {
      throw new PathResolutionError(
        'Resolved path is outside project root',
        specifier
      );
    }
    
    // For absolute paths, check if it's a directory and try to resolve to index.js
    try {
      /** @type {import('fs').Stats} */
      const stats = await fsp.stat(normalizedPath);
      if (stats.isDirectory()) {
        const indexPath = path.join(normalizedPath, 'index.js');
        try {
          await fsp.access(indexPath, fsp.constants.F_OK);
          setInCache(cacheKey, indexPath);
          return indexPath;
        } catch (e) {
          // index.js doesn't exist, continue with original path
        }
      }
    } catch (/** @type {unknown} */ e) {
      // If we can't stat the path, continue with normal resolution
    }
    
    // If it's a file with no extension, try to add .js
    if (!path.extname(normalizedPath)) {
      try {
        const jsPath = `${normalizedPath}.js`;
        await fsp.access(jsPath, fs.constants.F_OK);
        setInCache(cacheKey, jsPath);
        return jsPath;
      } catch (/** @type {unknown} */ e) {
        // .js version doesn't exist, continue with original path
      }
    }
    
    setInCache(cacheKey, normalizedPath);
    return normalizedPath;
    
    // For modules, ensure .js extension is present if needed
    if (type === 'module' && !normalizedPath.endsWith('.js')) {
      const withExt = `${normalizedPath}.js`;
      try {
        await fsp.access(withExt);
        setInCache(cacheKey, withExt);
        return withExt;
      } catch (e) {
        // Continue with original path if .js version doesn't exist
      }
    }
    
    // For non-module files or if .js version doesn't exist
    try {
      await fsp.access(normalizedPath, fs.constants.F_OK);
      setInCache(cacheKey, normalizedPath);
      return normalizedPath;
    } catch (e) {
      throw new PathResolutionError(
        `File not found: ${normalizedPath}`,
        specifier
      );
    }
  }
  
  // Handle Node.js built-in modules
  if (isNodeBuiltin(specifier)) {
    // For built-in modules in test environment, resolve to node_modules path
    if (process.env.NODE_ENV === 'test') {
      // Remove any node: prefix for resolution
      const moduleName = specifier.replace(/^node:/, '');
      
      // Special handling for 'path' module in tests
      if (moduleName === 'path') {
        // Try to resolve path module from node_modules
        try {
          const modulePath = require.resolve('path');
          if (fs.existsSync(modulePath)) {
            setInCache(cacheKey, modulePath);
            return modulePath;
          }
        } catch (error) {
          // Fall through to default behavior if resolution fails
        }
      }
      
      // For other built-in modules, try to resolve them
      try {
        // Try to resolve the module path using require.resolve
        const modulePath = require.resolve(moduleName);
        
        // Verify the resolved path exists and is within node_modules
        if (fs.existsSync(modulePath) && modulePath.includes('node_modules')) {
          setInCache(cacheKey, modulePath);
          return modulePath;
        }
      } catch (error) {
        // If we can't resolve it, continue to the default behavior
      }
    }
    
    // Default behavior: return the specifier as-is
    setInCache(cacheKey, specifier);
    return specifier;
  }

  // Handle relative paths
  if (specifier.startsWith('.')) {
    // Get the directory of the calling module
    const callerDir = process.cwd();
    const resolvedPath = path.resolve(callerDir, specifier);
    
    // First try to resolve as a file
    try {
      const stats = await fsp.stat(resolvedPath);
      if (stats.isFile()) {
        // If it's a file, ensure it has a .js extension
        const ext = path.extname(resolvedPath);
        if (!ext) {
          const jsPath = `${resolvedPath}.js`;
          try {
            await fsp.access(jsPath, fsp.constants.F_OK);
            setInCache(cacheKey, jsPath);
            return jsPath;
          } catch (e) {
            // .js version doesn't exist, continue with original path
          }
        }
        setInCache(cacheKey, resolvedPath);
        return resolvedPath;
      } else if (stats.isDirectory()) {
        // If it's a directory, try to resolve to index.js
        const indexPath = path.join(resolvedPath, 'index.js');
        try {
          await fsp.access(indexPath, fsp.constants.F_OK);
          setInCache(cacheKey, indexPath);
          return indexPath;
        } catch (e) {
          // index.js doesn't exist, continue with normal resolution
        }
      }
    } catch (e) {
      // File doesn't exist, try adding .js extension
      if (!path.extname(resolvedPath)) {
        try {
          const jsPath = `${resolvedPath}.js`;
          await fsp.access(jsPath, fs.constants.F_OK);
          setInCache(cacheKey, jsPath);
          return jsPath;
        } catch (/** @type {unknown} */ e) {
          // .js version doesn't exist, continue with normal resolution
        }
      }
    }
    
    // Verify the path is within the project root for security
    if (!isPathSafe(resolvedPath)) {
      throw new PathResolutionError(
        'Resolved path is outside project root',
        specifier
      );
    }
    
    // First try the path as-is
    try {
      // Check if it's a directory
      const stats = await fsp.stat(resolvedPath);
      if (stats.isDirectory()) {
        // Try index.js in the directory
        const indexPath = path.join(resolvedPath, 'index.js');
        await fsp.access(indexPath, fs.constants.F_OK);
        setInCache(cacheKey, indexPath);
        return indexPath;
      }
      
      // It's a file, check if it exists
      await fsp.access(resolvedPath, fs.constants.F_OK);
      setInCache(cacheKey, resolvedPath);
      return resolvedPath;
    } catch (/** @type {unknown} */ e) {
      // If the path doesn't exist, try with .js extension if not already present
      if (!resolvedPath.endsWith('.js')) {
        const withExt = `${resolvedPath}.js`;
        try {
          await fsp.access(withExt, fs.constants.F_OK);
          setInCache(cacheKey, withExt);
          return withExt;
        } catch (/** @type {unknown} */ e) {
          // Continue with error handling below
        }
      }
      
      throw new PathResolutionError(
        `File not found: ${resolvedPath}`,
        specifier,
        e instanceof Error ? e : new Error(String(e))
      );
    }
  }
  
  // Handle aliases using tsconfig-paths
  try {
    const resolvedWithTsPaths = await resolveWithTsPaths(specifier, { type });
    if (resolvedWithTsPaths) {
      // Ensure the resolved path has a .js extension if it's a local file
      if (resolvedWithTsPaths.startsWith(PROJECT_ROOT) && !resolvedWithTsPaths.endsWith('.js')) {
        try {
          const withExt = `${resolvedWithTsPaths}.js`;
          await fsp.access(withExt, fs.constants.F_OK);
          setInCache(cacheKey, withExt);
          return withExt;
        } catch (e) {
          // If .js version doesn't exist, continue with the original path
        }
      }
      setInCache(cacheKey, resolvedWithTsPaths);
      return resolvedWithTsPaths;
    }
  } catch (error) {
    // If there's an error resolving with tsconfig-paths, try other methods
    if (!(error instanceof PathResolutionError)) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Error resolving with tsconfig-paths: ${errorMessage}`);
    }
  }

  // Handle aliases and module resolution using tsconfig-paths
  try {
    const resolved = await resolveWithTsPaths(specifier, { type });
    setInCache(cacheKey, resolved);
    return resolved;
  } catch (/** @type {unknown} */ error) {
    if (error instanceof PathResolutionError) {
      throw error;
    }
    
    const errorMessage = error instanceof Error ? error : new Error(String(error));
    throw new PathResolutionError(
      `Error resolving path: ${specifier}`,
      specifier,
      errorMessage
    );
  }
}

/**
 * Resolves a module path and returns the module URL (for ESM imports)
 * @param {string} specifier - The module specifier to resolve
 * @returns {Promise<string>} The resolved module URL
 * @throws {PathResolutionError} If the module cannot be resolved
 */
async function resolveModule(specifier) {
  const resolvedPath = await resolvePath(specifier, { type: 'module' });
  return pathToFileURL(resolvedPath).href;
}

/**
 * Helper function to import a module using the resolved path
 * @param {string} specifier - The module specifier to import
 * @returns {Promise<*>} The imported module
 */
async function importModule(specifier) {
  try {
    const modulePath = await resolvePath(specifier, { type: 'module' });
    // Convert to file URL if it's a local path
    const importPath = modulePath.startsWith('file:') 
      ? modulePath 
      : pathToFileURL(modulePath).href;
    return import(importPath);
  } catch (error) {
    // If we get here, the module couldn't be imported
    throw new PathResolutionError(
      `Failed to import module: ${error instanceof Error ? error.message : String(error)}`,
      specifier,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

// Track initialization state - variables already declared above

/**
 * Initializes the path resolver
 * @returns {Promise<void>}
 */
/**
 * Checks if the path resolver has been successfully initialized
 * @returns {boolean} True if initialized, false otherwise
 */
function isInitialized() {
  return _isInitialized;
}

/**
 * Gets the initialization error if one occurred
 * @returns {Error | null} The initialization error or null if no error occurred
 */
function getInitializationError() {
  return _initializationError;
}

async function initialize() {
  if (_isInitializing || _isInitialized) return;
  
  _isInitializing = true;
  try {
    // Initialize tsconfig-paths matcher
    await initTsPathsMatcher();
    _isInitialized = true;
  } catch (error) {
    _initializationError = error instanceof Error ? error : new Error(String(error));
    throw _initializationError;
  } finally {
    _isInitializing = false;
  }
}

// Start initialization (but don't wait for it)
initialize().catch(error => {
  console.error('Initialization failed:', error);
});

/**
 * Clears the entire path resolution cache
 * @returns {number} The number of entries cleared
 */
function clearCache() {
  const count = pathCache.size;
  pathCache.clear();
  return count;
}

/**
 * Gets cache statistics
 * @returns {{hits: number, misses: number, size: number}} Cache statistics
 */
function getCacheStats() {
  return {
    hits: cacheHits,
    misses: cacheMisses,
    size: pathCache.size
  };
}

/**
 * Resets the cache statistics (hits and misses counters)
 * @returns {{hits: number, misses: number}} The statistics before reset
 */
function resetCacheStats() {
  const stats = {
    hits: cacheHits,
    misses: cacheMisses
  };
  
  cacheHits = 0;
  cacheMisses = 0;
  
  return stats;
}

// ===== Exports =====
// Path utilities
const pathUtils = {
  normalizePath,
  ensureJsExtension
};

// Create the main module object
const pathResolver = {
  // Core functions
  resolvePath,
  resolveModule,
  importModule,
  
  // Cache management
  clearCache,
  clearAliasCache,
  getCacheStats,
  resetCacheStats,
  
  // Initialization
  isInitialized,
  getInitializationError,
  
  // Error class
  PathResolutionError,
  
  // Utility functions
  isPathSafe,
  
  // Path utilities
  pathUtils,
  
  // Constants (for testing)
  CACHE_TTL_MS,
  CACHE_SIZE_LIMIT
};



// Export the main module object as default
export default pathResolver;

// Also export individual functions/components
export {
  
  // Error class
  PathResolutionError,
  
  // Utility functions
  isPathSafe,
  
  // Path utilities
  pathUtils,
  
  // Constants (for testing)
  CACHE_TTL_MS,
  CACHE_SIZE_LIMIT
};
