# ESMock Wrapper Usage Guide

## Overview
This document outlines the recommended patterns for mocking ES modules in tests using the `esmock_wrapper.js` utility. This wrapper provides a consistent way to mock dependencies across the codebase and handles path resolution automatically.

> **Migration Status**: All Layer 1 test files have been migrated to use `esmock_wrapper.js`. The following files are now using the new mocking pattern:

### Layer 1 - Game Phases (Completed)
- [x] `test/game/phases/biddingPhase.unit.test.js`
- [x] `test/game/phases/endGame.unit.test.js`
- [x] `test/game/phases/goAlonePhase.unit.test.js`
- [x] `test/game/phases/lobbyPhase.unit.test.js`
- [x] `test/game/phases/playingPhase.unit.test.js`
- [x] `test/game/phases/scoringPhase.unit.test.js`

### Layer 1 - Game Logic (Completed)
- [x] `test/game/logic/aiLogic.unit.test.js` - Verified to be compliant with the new mocking standards
- [x] `test/game/logic/validation.unit.test.js` - Verified to be compliant with the new mocking standards

### Next Steps
- [ ] Continue migration of remaining test files in other layers
- [ ] Update ESLint rules to enforce the new mocking pattern

## Table of Contents
1. [Basic Usage](#basic-usage)
2. [Mocking Patterns](#mocking-patterns)
   - [Basic Module Mocking](#1-basic-module-mocking)
   - [Using createMockedModule](#2-using-createmockedmodule)
   - [Mocking Dependencies](#3-mocking-dependencies)
   - [Testing Different Scenarios](#4-testing-different-scenarios)
3. [Migration Status](#migration-status)
4. [Best Practices](#best-practices)
5. [Common Pitfalls](#common-pitfalls)

## Basic Usage

### Importing the Wrapper
```javascript
import { esmockWithPaths, createMockedModule } from '../../test/utils/esmock_wrapper.js';
```

### Basic Module Mocking
```javascript
// Basic usage with esmockWithPaths
const mockModule = await esmockWithPaths(
  import.meta.url,  // Always use import.meta.url for the test file
  '../../../src/path/to/module.js',  // Path to the module under test
  {
    // Mock dependencies using path aliases or relative paths
    '@/utils/logger.js': loggerMock,
    '../other/dependency.js': dependencyMock,
    'external-package': externalPackageMock
  }
);
```

### Using createMockedModule
For more complex scenarios, use `createMockedModule`:

```javascript
const { module: mockModule, mocks } = await createMockedModule(
  import.meta.url,
  '../../../src/path/to/module.js',
  {
    // Mock dependencies
    '@/utils/logger.js': {
      info: sinon.stub(),
      error: sinon.stub()
    },
    // Other mocks...
  }
);

// Access mocks through the mocks object
const { logger } = mocks;
```

## Mocking Patterns

### 1. Basic Module Mocking
```javascript
// Simple stub example
const mockValidation = {
  validateSomething: sinon.stub().returns(true),
  // Reset the stub in beforeEach
  reset: function() {
    this.validateSomething.resetHistory();
  }
};

// In your test file
beforeEach(() => {
  mockValidation.reset();
});

// Usage in tests
it('should validate input', async () => {
  const { validateInput } = await esmockWithPaths(
    import.meta.url,
    '../../../src/utils/validation.js',
    {
      './validators': mockValidation
    }
  );
  
  const result = validateInput('test');
  expect(result).to.be.true;
  expect(mockValidation.validateSomething).to.have.been.calledWith('test');
});

### 2. Using createMockedModule for Complex Scenarios
```javascript
describe('Complex Module', () => {
  let moduleUnderTest;
  let mocks;
  
  beforeEach(async () => {
    const result = await createMockedModule(
      import.meta.url,
      '../../../src/game/phases/complexPhase.js',
      {
        '@/utils/logger.js': {
          info: sinon.stub(),
          error: sinon.stub().throws('Unexpected error call')
        },
        '../validators': {
          validate: sinon.stub().returns(true)
        }
      }
    );
    
    moduleUnderTest = result.module;
    mocks = result.mocks;
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  it('should handle complex scenarios', () => {
    // Test implementation
  });
});

### 3. Mocking Dependencies

#### Mocking Node.js Built-ins
```javascript
const { module: fsMock } = await createMockedModule(
  import.meta.url,
  '../../../src/utils/fileHandler.js',
  {
    'node:fs/promises': {
      readFile: sinon.stub().resolves('file content'),
      writeFile: sinon.stub().resolves()
    }
  }
);

#### Mocking External Packages
```javascript
const { module: paymentService } = await createMockedModule(
  import.meta.url,
  '../../../src/services/payment.js',
  {
    'stripe': {
      charges: {
        create: sinon.stub().resolves({ id: 'ch_123', status: 'succeeded' })
      }
    }
  }
);

### 4. Testing Different Scenarios

#### Testing Error Cases
```javascript
it('should handle validation errors', async () => {
  // Setup error case
  mocks['../validators'].validate.throws(new Error('Validation failed'));
  
  await expect(moduleUnderTest.processData(invalidData))
    .to.be.rejectedWith('Validation failed');
  
  expect(mocks['@/utils/logger.js'].error)
    .to.have.been.calledWith('Validation failed');
});

#### Testing Async Operations
```javascript
it('should handle async operations', async () => {
  const promise = moduleUnderTest.longRunningOperation();
  
  // Simulate async completion
  await new Promise(resolve => setImmediate(resolve));
  
  // Assert async behavior
  expect(mocks['../services/api'].fetch).to.have.been.calledOnce;
  
  const result = await promise;
  expect(result).to.equal('expected result');
});

## Best Practices

1. **Isolate Tests**: Each test should be independent and not rely on state from other tests
2. **Use beforeEach/afterEach**: Reset mocks and test state between tests
3. **Be Specific with Mocks**: Only mock what's necessary for the test
4. **Test Error Cases**: Verify error handling and edge cases
5. **Use Sinon Sandbox**: For automatic cleanup of stubs and spies

## Common Pitfalls

1. **Memory Leaks**: Always clean up mocks and stubs in afterEach
2. **Over-mocking**: Don't mock everything, focus on external dependencies
3. **Fragile Tests**: Avoid testing implementation details
4. **Async Issues**: Handle promises and timeouts properly
5. **Global State**: Be careful with module caching in tests
};

const module = await esmockWithPaths(
  import.meta.url,
  '../../../src/module.js',
  {
    '@/utils/validation.js': mockValidation
  }
);
```

#### 2. Sequential Return Values
```javascript
const mockPlayerUtils = {
  getNextPlayer: sinon.stub()
    .onFirstCall().returns('north')
    .onSecondCall().returns('east')
};
```

#### 3. Dynamic Behavior
```javascript
let callCount = 0;
const mockUtils = {
  generateId: () => `id-${++callCount}`
};
```

## Best Practices

1. **Use Path Aliases**: Always use the `@/` prefix for project modules.
2. **Keep Mocks Simple**: Each test should only mock what it needs.
3. **Reset Mocks**: Use `sinon.reset()` or `sinon.restore()` in `afterEach`.
4. **Be Explicit**: Prefer explicit return values over complex logic in mocks.
5. **Test Edge Cases**: Include tests for error conditions and edge cases.

## Common Pitfalls

1. **Circular Dependencies**: Be careful with modules that depend on each other.
2. **Stateful Mocks**: Reset any state in `beforeEach`/`afterEach`.
3. **Async/Await**: Remember to `await` the `esmockWithPaths` call.
4. **Path Resolution**: Use path aliases to avoid platform-specific path issues.
