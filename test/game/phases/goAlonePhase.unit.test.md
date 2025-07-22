# Test File: `goAlonePhase.unit.test.js`

## Overview
This test file contains unit tests for the "Go Alone" phase logic in the Euchre Multiplayer game. It verifies the validation, error handling, and state transitions when a player decides to go alone or play with a partner.

## Test Scope
- **Layer**: 1 (Pure Logic)
- **Dependencies**:
  - `src/game/phases/goAlonePhase.js` (module under test)
  - `src/config/constants.js` (for game constants)
  - `src/game/logic/validation-errors.js` (for error types)

## Test Structure

### Test Setup
- Uses Node.js's built-in `test` module and `assert` for assertions
- Mocks the `players` utility module for testing in isolation
- Provides a `createGoAloneGameState` helper function to generate consistent test states

### Test Categories
1. **State Validation**
   - Verifies the game is in the correct phase (`GAME_PHASE_GOING_ALONE_DECISION`)
   - Validates the current player is the one who ordered up the trump

2. **Error Handling**
   - Tests for `ValidationError` when game state is invalid
   - Tests for `InvalidPhaseError` when not in the correct game phase
   - Tests for `NotPlayersTurnError` when wrong player attempts to make a decision
   - Tests for `PhaseLogicError` for invalid decisions

3. **State Transitions**
   - Verifies correct state updates when a player chooses to go alone
   - Verifies correct state updates when a player chooses to play with a partner
   - Ensures the game progresses to the next phase after the decision is made

## Test Data Patterns
- Uses a consistent game state structure with:
  - Four players (North, South, East, West)
  - Proper team assignments (NS vs EW)
  - Mocked player utilities for partner and turn management

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
   - Covers edge cases in decision making
   - Verifies all state transitions

## Dependencies
- **Mocked Dependencies**:
  - `players` utility module (for partner and turn management)

## Maintenance Notes
- When modifying the "Go Alone" phase logic, ensure all test cases are updated accordingly
- New test cases should be added for any additional functionality
- The test file follows the project's testing standards and conventions

## Related Files
- `src/game/phases/goAlonePhase.js` - Implementation being tested
- `test/game/phases/__mocks__/players.js` - Mock implementations for player utilities
