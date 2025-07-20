# Mocking Strategy Documentation

## Overview
This document outlines the mocking strategies and patterns used in the Mueller Euchre test suite, with a strong emphasis on maintaining Layer 1 purity. The project follows a consistent approach to mocking dependencies to ensure reliable, deterministic, and maintainable tests.

## Layer 1 Purity Requirements

### Core Principles
- **Pure Functions**: All mocks must be pure and stateless
- **Deterministic**: Same inputs must always produce the same outputs
- **No Side Effects**: No I/O, network, or file system operations
- **Immutable Data**: Never modify input parameters; return new objects
- **No Global State**: All state must be passed as parameters

### Forbidden in Mocks
- No `console` logging (use the project logger)
- No `process` operations (`process.env`, `process.exit`)
- No `Date`/`Math.random` (inject as parameters if needed)
- No module-level mutable state

### Error Handling
- Throw specific error types from `src/game/logic/errors.js`
- Let errors bubble up to higher layers
- Include detailed error messages for debugging

## Core Mocking Principles

1. **Pure Function Testing**
   - All mocks maintain referential transparency
   - No side effects between test cases
   - Deterministic behavior for consistent test results

2. **Dependency Injection**
   - Dependencies are injected into test subjects
   - Mocks are created per-test-case for isolation
   - Clear separation between test setup and assertions

## Existing Mocks

### 1. `logger.js`
**Location**: `test/__mocks__/logger.js`

**Purpose**: Provides a mock implementation of the application logger for testing.

**Key Features**:
- Mock functions for all standard log levels (`log`, `error`, `warn`, `info`, `debug`)
- `reset()` method to clear call history between tests
- Supports both default and named imports

**Usage Example**:
```javascript
import logger, { info, error } from '../../src/utils/logger';

// In test setup
logger.reset();

// In assertions
test('should log error on failure', () => {
  expect(logger.error.mock.calls.length).toBe(1);
  expect(logger.error.mock.calls[0][0]).toContain('Error message');
});
```

### 2. `biddingPhase.js`
**Location**: `test/__mocks__/biddingPhase.js`

**Purpose**: Mocks bidding phase functionality for testing game flow.

**Key Features**:
- Simulates bid validation and processing
- Handles edge cases like invalid bids and turn validation
- Maintains test isolation through deep copying of game state

### 3. `players.js`
**Location**: `test/__mocks__/players.js`

**Purpose**: Provides mock implementations of player-related utilities for testing game flow and player interactions.

**Key Features**:
- Player rotation with `getNextPlayer()`
- Partner resolution with `getPartner()`
- Team assignments with `getTeamId()`
- Role validation with `isValidPlayerRole()`
- Call tracking for test assertions
- Test isolation through `reset()`

**Usage Example**:
```javascript
import {
  getNextPlayer,
  getPartner,
  getTeamId,
  callHistory,
  reset
} from '../__mocks__/players';
import { PLAYER_POSITIONS, TEAMS } from '../../src/config/constants';

// In test setup
beforeEach(() => {
  reset(); // Clear call history between tests
});

// In test
const nextPlayer = getNextPlayer(PLAYER_POSITIONS.PLAYER_NORTH, [
  PLAYER_POSITIONS.PLAYER_NORTH,
  PLAYER_POSITIONS.PLAYER_EAST
]);

// In assertions
assert.strictEqual(callHistory.getNextPlayer.length, 1);
```

### 4. `deck.js`
**Location**: `test/__mocks__/deck.js`

**Purpose**: Provides deterministic card deck operations for testing.

**Key Features**:
- Fixed deck order for predictable tests
- Mock implementations of card utilities
- Consistent shuffling behavior

## Mocking Patterns

### 1. Dynamic Import Pattern
Used when you need to mock modules that are dependencies of the module under test.

**Example**:
```javascript
// 1. Import the module to mock
import * as moduleToMock from '../../src/module';

// 2. Create mocks
const mockFn = mock.fn();

// 3. Replace module exports
mock.method(moduleToMock, 'exportedFunction', mockFn);

// 4. Dynamically import the module under test AFTER setting up mocks
const { functionUnderTest } = await import('../../src/moduleUnderTest.js');
```

### 2. Context Injection Pattern
Used for testing functions that use a context object.

**Example**:
```javascript
// Original function
export function exampleFunction(gameState) {
  return this.validation.validate(gameState);
}

// Test
const mockValidation = { validate: mock.fn(() => true) };
const result = exampleFunction.call(
  { validation: mockValidation },
  testGameState
);
```

### 3. Factory Pattern
Used for creating complex mock objects consistently.

**Example**:
```javascript
function createMockGameState(overrides = {}) {
  return {
    gamePhase: 'LOBBY',
    players: {},
    ...overrides
  };
}
```

## Best Practices

1. **Reset Mocks Between Tests**
   - Always reset mock call history in `beforeEach`
   - Avoid test pollution by creating fresh mocks per test

2. **Test-Specific Behavior**
   - Configure mocks within test cases for clarity
   - Use descriptive mock implementation names

3. **Verify Interactions**
   - Assert that expected functions were called
   - Verify call arguments and call counts

4. **Document Mock Behavior**
   - Add JSDoc for complex mocks
   - Document side effects and return values

## Common Pitfalls

1. **Incorrect Mock Setup Order**
   - Always set up mocks before importing the module under test
   - Use dynamic imports when necessary

2. **Over-Mocking**
   - Only mock what's necessary
   - Consider using real implementations when they're fast and deterministic

3. **Test Pollution**
   - Ensure tests don't affect each other
   - Clean up global state in `afterEach`

## Recommended New Mocks

1. **`validation.js` Mock**
   - Centralize validation logic
   - Simulate different validation scenarios

2. **`players.js` Mock**
   - Mock player-related utilities
   - Handle team assignments and player state
