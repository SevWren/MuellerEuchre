# Testing with Dependency Injection in Euchre Multiplayer

## Overview

This guide explains when and how to use the `__mocks__` directory with dependency injection for testing in the Euchre Multiplayer project. This pattern is particularly useful for testing pure functions (Layer 1) that have complex dependencies.

## Table of Contents

1. [When to Use This Pattern](#when-to-use-this-pattern)
2. [Implementation Guide](#implementation-guide)
3. [Example: startNewHandPhase](#example-startnewhandphase)
4. [Best Practices](#best-practices)
5. [Common Pitfalls](#common-pitfalls)
6. [Alternatives](#alternatives)

## When to Use This Pattern

Use the `__mocks__` with dependency injection pattern when:

✅ **Testing Pure Functions** with complex dependencies  
✅ **Working with ESM Modules** where traditional mocking is challenging  
✅ **Needing Fine-Grained Control** over test doubles  
✅ **Testing Edge Cases** that are hard to trigger with real implementations  

## Implementation Guide

### 1. Create a Mock Module

Create a file in the appropriate `__mocks__` directory (e.g., `test/__mocks__/moduleName.js`):

```javascript
/**
 * Test-specific version of module with dependency injection
 */
import { SOME_CONSTANTS } from '../../../src/config/constants.js';

function createModuleWithDeps({
  // List all dependencies with default implementations
  dependency1 = realDependency1,
  dependency2 = realDependency2,
  // ...
}) {
  return function actualFunction(params) {
    // Implementation using injected dependencies
  };
}

// Export default implementation with real dependencies
import * as realDeps from '../../src/real/dependencies';

const defaultExport = createModuleWithDeps({
  dependency1: realDeps.dependency1,
  // ...
});

export { createModuleWithDeps, defaultExport as default };
```

### 2. Using in Tests

```javascript
import { createModuleWithDeps } from './__mocks__/moduleName';

describe('Module Tests', () => {
  it('should work with test doubles', () => {
    // 1. Create test doubles
    const mockDep1 = { /* mock implementation */ };
    
    // 2. Create test instance with injected dependencies
    const testFn = createModuleWithDeps({
      dependency1: mockDep1,
      // ...
    });
    
    // 3. Test the function
    const result = testFn(testParams);
    
    // 4. Make assertions
    assert.strictEqual(result.expected, 'value');
  });
});
```

## Example: startNewHandPhase

See `test/game/phases/__mocks__/startNewHandPhase.js` for a complete example:

```javascript
// Factory function with dependency injection
function createStartNewHand({ 
  createDeck, 
  shuffleDeck,
  getNextPlayer 
}) {
  return function startNewHand(currentGameState) {
    // Implementation using injected dependencies
  };
}

// Default export with real implementations
import * as deckUtils from '../../../../src/utils/deck.js';
import { getNextPlayer as realGetNextPlayer } from '../../../../src/utils/players.js';

const defaultExport = createStartNewHand({
  createDeck: deckUtils.createDeck,
  shuffleDeck: deckUtils.shuffleDeck,
  getNextPlayer: realGetNextPlayer
});

export { createStartNewHand, defaultExport as default };
```

## Best Practices

1. **Keep Mocks Simple**
   - Focus on the interface, not implementation
   - Avoid duplicating complex logic from the real implementation

2. **Document Dependencies**
   - Clearly document all dependencies in JSDoc
   - Include type information if using TypeScript

3. **Test Edge Cases**
   - Test error conditions and edge cases
   - Verify proper error messages and types

4. **Maintain Consistency**
   - Follow the same pattern across similar modules
   - Keep mock implementations in sync with real ones

## Common Pitfalls

❌ **Over-mocking** - Don't mock what you don't own  
❌ **Implementation Testing** - Test behavior, not implementation details  
❌ **Inconsistent Mocks** - Keep mocks in sync with real implementations  
❌ **Slow Tests** - Keep mocks lightweight to avoid slow test runs  

## Alternatives

Consider these alternatives when appropriate:

1. **Integration Tests** - For testing component interactions
2. **E2E Tests** - For testing complete user flows
3. **Snapshot Testing** - For UI components
4. **Property-based Testing** - For testing with generated inputs

## See Also

- [Layer 1 Purity Rules](./Layer1_Purity_Rules.md)
- [Testing Guidelines](./TEST_STRUCTURE_IMPLEMENTATION.md)
- [Debugging Workflow](./workflows/debugging_precautions.md)

---

*Last Updated: 2025-07-13*
