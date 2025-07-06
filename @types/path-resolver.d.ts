import { MatchPath } from 'tsconfig-paths';

declare module './test/utils/path-resolver' {
  export interface CacheEntry {
    value: string;
    expires: number;
    lastAccessed: number;
    createdAt?: number; // Optional timestamp for cache entry creation
  }

  export interface PathResolver {
    resolvePath(specifier: string, options?: { type?: string }): Promise<string>;
    resolveModule(specifier: string, options?: { type?: string }): Promise<string>;
    importModule(specifier: string, options?: { type?: string }): Promise<any>;
    clearAliasCache(): void;
    clearCache(): void;
    getCacheStats(): { hits: number; misses: number; size: number };
    resetCacheStats(): void;
    isInitialized(): boolean;
    getInitializationError(): Error | null;
    initTsPathsMatcher(): Promise<void>;
  }

  const pathResolver: PathResolver;
  export default pathResolver;
}

// Global type augmentations
declare global {
  // Extend the ErrorConstructor interface to include the captureStackTrace method
  interface ErrorConstructor {
    captureStackTrace?(error: Error, constructorOpt?: Function): void;
  }
}
