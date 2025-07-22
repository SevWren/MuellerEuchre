# Test File: `scoringPhase.unit.test.js`

## Overview
This test file contains unit tests for the scoring phase logic in the Euchre Multiplayer game. It verifies the correct calculation of scores, hand completion, game over detection, and new game initialization.

## Test Scope
- **Layer**: 1 (Pure Logic)
- **Dependencies**:
  - `src/game/phases/scoringPhase.js` (module under test)
  - `src/config/constants.js` (for game constants)
  - `src/game/logic/validation-errors.js` (for error types)

## Test Structure

### Helper Functions
- `createMockLogger()`: Creates a mock logger with common logging methods
- `createScoringGameState()`: Creates a base game state for scoring tests with:
  - Default game state for scoring phase
  - Two teams (NS and EW)
  - Empty game messages array
  - Default winning score settings

### Test Categories
1. **Score Calculation**
   - Basic scoring for different numbers of tricks won
   - Edge cases (0 tricks, all tricks)
   - Score validation and updates

2. **Game Over Detection**
   - Win condition verification
   - Score threshold validation
   - Game state transition on game over

3. **New Game Initialization**
   - State reset after hand completion
   - Score carryover between hands
   - Player role rotation

4. **Error Handling**
   - Invalid game states
   - Missing or invalid parameters
   - Phase validation

## Test Data Patterns
- Uses realistic game states with varying trick counts
- Tests all possible scoring scenarios
- Covers edge cases in score calculation
- Includes both valid and invalid game states

## Best Practices
1. **Isolation**:
   - Each test creates its own game state
   - Mocks are reset between tests
   - No shared state between test cases

2. **Readability**:
   - Clear test descriptions
   - Helper functions for common assertions
   - Consistent test structure

3. **Coverage**:
   - Tests both success and error cases
   - Covers edge cases in scoring
   - Verifies all state transitions

## Dependencies
- **Mocked Dependencies**:
  - `logger` utility module (for logging game events)

## Maintenance Notes
- When modifying the scoring logic, ensure all test cases are updated accordingly
- New test cases should be added for any additional scoring rules or edge cases
- The test file follows the project's testing standards and conventions

## Related Files
- `src/game/phases/scoringPhase.js` - Implementation being tested
- `test/utils/__mocks__/logger.js` - Mock implementation for the logger

## Test Execution
```bash
# Run all tests in this file
node --test test/game/phases/scoringPhase.unit.test.js

# Run a specific test
node --test --test-name-pattern="should calculate scores correctly" test/game/phases/scoringPhase.unit.test.js
```

## Error Cases Tested
- Invalid game phase
- Missing or invalid game state
- Score calculation edge cases
- Invalid team configurations
- Game over detection scenarios
