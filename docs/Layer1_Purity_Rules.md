# Layer 1 Purity Rules and Guidelines

## Table of Contents
1. [Core Principles](#core-principles)
2. [Pure Function Requirements](#pure-function-requirements)
3. [Input/Output Restrictions](#inputoutput-restrictions)
4. [State Management](#state-management)
5. [Error Handling](#error-handling)
6. [Testing Requirements](#testing-requirements)
7. [Code Organization](#code-organization)
8. [Common Pitfalls](#common-pitfalls)
9. [Validation Checklist](#validation-checklist)

## Core Principles

1. **Purity Mandate**: Layer 1 modules must be pure and stateless.
   - No I/O operations (database, file system, network requests)
   - No direct mutation of shared state
   - Same input always produces the same output
   - No side effects

2. **Layer Responsibilities**:
   - **Layer 1 (Core Logic)**: Pure game rules and utilities
   - **Layer 2 (State Management)**: Manages game state
   - **Layer 3 (Network API)**: Handles client communication
   - **Layer 4 (UI)**: Client-side rendering
   - **Layer 5 (Persistence)**: Database operations

## Pure Function Requirements

1. **Deterministic Output**:
   - Given the same inputs, always return the same output
   - No reliance on external state (e.g., Date.now(), Math.random())

2. **No Side Effects**:
   - Don't modify input parameters
   - Don't modify variables outside the function scope
   - Don't perform I/O operations

3. **Immutability**:
   - Treat all inputs as immutable
   - Return new objects/arrays instead of modifying existing ones
   - Use object spread or Object.assign() for object updates

## Input/Output Restrictions

### Allowed:
- Primitive values (numbers, strings, booleans)
- Plain objects and arrays (treated as immutable)
- Other pure functions
- Constants defined within the module

### Forbidden:
- File system operations (fs module)
- Database operations
- Network requests (HTTP, WebSockets, etc.)
- Process operations (process.env, process.exit, etc.)
- Global variables (except for module-level constants)
- Console logging (use the project's logger utility)
- Date/Time functions (pass as parameters if needed)

## State Management

1. **No Global State**:
   - Avoid module-level mutable state
   - If state is needed, it should be passed as a parameter

2. **Immutable Updates**:
   ```javascript
   // Bad - mutating state
   function updateScore(player, points) {
     player.score += points; // MUTATION!
     return player;
   }

   // Good - returning new state
   function updateScore(player, points) {
     return {
       ...player,
       score: player.score + points
     };
   }
   ```

## Error Handling

1. **Use Custom Errors**:
   - Throw specific error types from `src/game/logic/errors.js`
   - Don't handle errors in Layer 1 (let them bubble up)

2. **Error Types**:
   - `ValidationError`: For input validation failures
   - `NotPlayersTurnError`: For turn validation
   - `InvalidPhaseError`: For phase validation
   - `CardNotInHandError`: For card validation
   - `MustFollowSuitError`: For suit following rules
   - `InvalidBidError`: For bidding validation
   - `InvalidDiscardError`: For discard validation
   - `PhaseLogicError`: For phase-specific logic errors
   - `InvalidCardError`: For invalid card states

## Testing Requirements

1. **Unit Tests**:
   - 95%+ code coverage for Layer 1 modules
   - Test all error conditions
   - Test edge cases and boundary conditions

2. **Test Isolation**:
   - No external dependencies
   - Mock all non-Layer 1 functionality
   - Use the project's testing utilities

3. **Test Structure**:
   ```javascript
   describe('moduleName', () => {
     it('should do something', () => {
       // Arrange
       const input = createTestInput();
       
       // Act
       const result = functionUnderTest(input);
       
       // Assert
       expect(result).toEqual(expectedOutput);
     });
   });
   ```

## Code Organization

1. **File Structure**:
   - Core logic: `src/game/logic/`
   - Game phases: `src/game/phases/`
   - Utilities: `src/utils/`
   - Constants: `src/config/constants.js`

2. **Export Style**:
   - Use named exports at the bottom of files
   - Export only what's needed by other modules
   - Group related exports with comments

## Common Pitfalls

1. **Accidental I/O**:
   - Using `console.log` instead of the project logger
   - Accessing `process.env` directly
   - Using `Date.now()` or `new Date()` directly

2. **State Mutation**:
   - Modifying input parameters
   - Mutating objects/arrays in place
   - Using mutable module-level state

3. **Tight Coupling**:
   - Importing from higher layers
   - Directly using Layer 3/5 functionality
   - Making assumptions about caller context

## Validation Checklist

Before committing Layer 1 code, verify:

- [ ] No I/O operations
- [ ] No global state mutations
- [ ] All functions are pure
- [ ] Input validation is present
- [ ] Proper error types are thrown
- [ ] Tests cover all code paths
- [ ] No upward layer dependencies
- [ ] All exports are properly typed with JSDoc
- [ ] No direct use of `console` methods
- [ ] No use of `process` methods
- [ ] No use of `Date`/timing functions

## Examples

### Good (Pure Function)
```javascript
/**
 * Calculates the score for a trick
 * @param {Array} trick - Array of cards played in the trick
 * @param {string} trumpSuit - The current trump suit
 * @returns {string} The winning player's role
 * @throws {InvalidCardError} If trick contains invalid cards
 */
function calculateTrickWinner(trick, trumpSuit) {
  if (!Array.isArray(trick)) {
    throw new InvalidCardError('Trick must be an array');
  }
  
  // Implementation...
  return winningPlayerRole;
}
```

### Bad (Impure Function)
```javascript
// Bad - mutates input, uses console, has side effects
function updatePlayerScore(player, points) {
  player.score += points; // Mutation!
  console.log(`Updated score: ${player.score}`); // I/O!
  saveToDatabase(player); // I/O!
  return player;
}
```
