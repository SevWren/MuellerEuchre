# ESMock Wrapper Usage Guide

## Overview
This document outlines the recommended patterns for mocking ES modules in tests using the `esmock_wrapper.js` utility.

## Basic Usage

### Importing the Wrapper
```javascript
import { esmockWithPaths } from '../../test/utils/esmock_wrapper.js';
```

### Mocking a Module
```javascript
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

### Mocking Patterns

#### 1. Basic Mock Setup
```javascript
const mockValidation = {
  validateSomething: sinon.stub().returns(true)
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
