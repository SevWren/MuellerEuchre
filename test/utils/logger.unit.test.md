# Logger Unit Test Documentation

## Overview
This document outlines the functionality tested in `logger.unit.test.js` to facilitate a rewrite using only Node.js native testing capabilities (`node:test` and `node:assert`).

## Test Environment Setup

### Environment Variables
- `NODE_ENV`: Set to 'test' by default
- `LOG_LEVEL`: Controls the log level (default: 'silent')
- `DEBUG_LEVEL`: Alternative way to set log level (overridden by LOG_LEVEL)
- `DEBUG_PATH_RESOLVER`: Set to 'true' for debugging path resolution

### Test Constants
- `DEBUG_LEVELS`: Object with numeric log levels:
  - `ERROR`: 0
  - `WARNING`: 1
  - `INFO`: 2
  - `VERBOSE`: 3
  - `DEBUG`: 4

## Test Suite Structure

### 1. Initialization Tests
- Verifies logger initialization with default settings
- Tests environment variable handling for log levels
- Validates proper behavior with missing/invalid environment variables

### 2. Log Level Configuration
- Tests all log level mappings (error, warn, info, debug, verbose)
- Validates LOG_LEVEL precedence over DEBUG_LEVEL
- Handles invalid log level inputs gracefully

### 3. Transport Configuration
- Uses pino-pretty transport in non-production environments
- Disables pino-pretty in production
- Configures transport options based on environment

### 4. Logging Functions
- Tests all log level methods (error, warn, info, debug)
- Verifies message formatting and object handling
- Validates log level filtering
- Tests debug level setting functionality

## Mock Implementation Details

### Pino Mock
```javascript
{
  _level: 'info',  // Internal level storage
  info: function(),
  error: function(),
  warn: function(),
  debug: function(),
  fatal: function(),
  trace: function(),
  child: function(),
  level: string // Getter/setter for log level
}
```

### Test Helpers
1. `createPinoMock()`: Creates a fresh pino mock instance
2. `createLoggerModule(overrides)`: Creates a test logger module with configurable mocks

## Test Cases

### Initialization
- [x] Initialize with default 'info' level if no env vars are set
- [x] Set log level based on LOG_LEVEL environment variable

### Log Level Configuration
- [x] Map DEBUG_LEVEL values to pino log levels
- [x] Prioritize LOG_LEVEL over DEBUG_LEVEL
- [x] Handle invalid log levels gracefully

### Transport Configuration
- [x] Use pino-pretty in non-production environments
- [x] Disable pino-pretty in production

### Logging Functions
- [x] Log errors with DEBUG_LEVELS.ERROR
- [x] Log warnings with DEBUG_LEVELS.WARNING
- [x] Log info with DEBUG_LEVELS.INFO
- [x] Log debug with DEBUG_LEVELS.VERBOSE
- [x] Respect current log level (don't log below threshold)
- [x] Handle setDebugLevel function

## Required Assertions for Rewrite
1. Verify logger initialization with correct default level
2. Validate environment variable handling
3. Test all log level methods are called with correct parameters
4. Verify log level filtering works as expected
5. Test transport configuration based on environment
6. Validate error handling for invalid inputs

## Migration Notes
1. Replace `chai` assertions with `node:assert`
2. Replace `sinon` mocks with `node:test/mock`
3. Remove `esmock` in favor of native ESM mocking
4. Use `node:test` for test runner functionality
5. Implement custom mock for pino logger
6. Maintain the same test coverage and edge case handling
