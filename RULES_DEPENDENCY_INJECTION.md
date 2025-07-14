# Dependency Injection Pattern Rules for Euchre Multiplayer

## When to Use Dependency Injection

### ✅ Use Dependency Injection When:

1. **Testing Pure Functions (Layer 1)**
   - When writing unit tests for pure functions with external dependencies
   - Example: `test/game/phases/__mocks__/startNewHandPhase.js`

2. **ESM Module Testing**
   - When testing ESM modules where traditional mocking is problematic
   - When `jest.mock()` or similar tools cause issues

3. **Complex Dependencies**
   - When a function has multiple dependencies that need to be mocked
   - When testing different scenarios with the same function

4. **Edge Case Testing**
   - When testing error conditions or edge cases
   - When you need to simulate specific dependency behavior

## Implementation Pattern

### 1. Create a Factory Function

```javascript
// In test/__mocks__/moduleName.js
export function createModuleWithDeps({
  // List all dependencies with default implementations
  dependency1 = realDependency1,
  dependency2 = realDependency2,
  // ...
}) {
  return function actualFunction(params) {
    // Implementation using injected dependencies
  };
}
```

### 2. Export Default Implementation

```javascript
// In the same mock file
import * as realDeps from '../../src/real/dependencies';

export default createModuleWithDeps({
  dependency1: realDeps.dependency1,
  // ...
});
```

## File Naming and Location

- Place mock implementations in `test/__mocks__/` directories
- Name mock files to match the module they're mocking
- Follow the pattern: `originalName.mock.js` or `originalName.js` in `__mocks__`

## Testing Guidelines

1. **Test File Structure**
   ```javascript
   import { createModuleWithDeps } from './__mocks__/moduleName';
   
   describe('Module Tests', () => {
     it('should work with test doubles', () => {
       const testDouble = { /* mock implementation */ };
       const testFn = createModuleWithDeps({
         dependency1: testDouble,
       });
       
       // Test the function with injected test double
     });
   });
   ```

2. **Assertions**
   - Test both success and error cases
   - Verify function behavior with different dependency states
   - Test edge cases by injecting specific dependency behaviors

## When NOT to Use This Pattern

❌ For simple utility functions with no dependencies  
❌ When testing integration between components (use integration tests)  
❌ When the overhead outweighs the benefits  
❌ For third-party libraries (use their testing utilities instead)

## Best Practices

1. **Keep Mocks Simple**
   - Focus on the interface, not implementation
   - Avoid duplicating complex logic

2. **Document Dependencies**
   - Use JSDoc to document all dependencies
   - Include type information

3. **Maintain Consistency**
   - Follow the same pattern across similar modules
   - Keep mock implementations in sync with real ones