# Test File: `playingPhase.unit.test.js`

## Overview
This test file contains comprehensive unit tests for the playing phase of the Euchre Multiplayer game. It verifies the core game mechanics including card playing rules, trick determination, and game state management during the playing phase.

## Test Scope
- **Layer**: 1 (Pure Logic)
- **Dependencies**:
  - `src/game/phases/playingPhase.js` (module under test)
  - `src/config/constants.js` (for game constants)
  - `src/game/logic/validation-errors.js` (for error types)
  - `src/utils/deck.js` (for deck utilities)
  - `src/utils/players.js` (for player initialization)
  - `src/utils/cardUtils.js` (for card utilities)

## Test Structure

### Helper Functions
- `createPlayingGameState()`: Creates a fully initialized game state with:
  - Four players with hands of 5 cards each
  - Proper game phase (PLAYING)
  - Current player set to first player
  - Empty current trick array
  - Random trump suit selection
- `createTestCard(suit, value)`: Creates a standardized card object for testing
- `createTestContext(t)`: Sets up test context with mocked dependencies

### Test Categories
1. **Basic Validation**
   - Input parameter validation
   - Game state validation
   - Player role validation
   - Card validation

2. **Card Playing Logic**
   - Valid card plays
   - Invalid card plays
   - Following suit rules
   - Trump card handling

3. **Trick Determination**
   - Regular trick resolution
   - Trump card handling
   - Left/Right Bower handling
   - Tie-breaking rules

4. **Game State Management**
   - Current trick updates
   - Trick winner determination
   - Score updates
   - Game phase transitions

## Test Data Patterns
- Uses realistic card combinations for testing
- Covers edge cases in trick resolution
- Includes both valid and invalid game states
- Tests all player positions and team combinations

## Best Practices
1. **Isolation**:
   - Each test creates its own game state
   - Mocks are reset between tests
   - No shared state between test cases

2. **Readability**:
   - Clear, descriptive test names
   - Helper functions for common assertions
   - Consistent test structure

3. **Coverage**:
   - Tests both success and error cases
   - Covers edge cases in game rules
   - Verifies all state transitions

## Dependencies
- **Mocked Dependencies**:
  - `logger` utility module (for logging game events)
  - `players` utility module (for player management)
  - `deck` utility module (for card handling)
  - `cardUtils` utility module (for card ranking)

## Maintenance Notes
- When modifying the playing phase logic, ensure all test cases are updated accordingly
- New test cases should be added for any additional game rules or edge cases
- The test file follows the project's testing standards and conventions

## Related Files
- `src/game/phases/playingPhase.js` - Implementation being tested
- `test/game/phases/determineTrickWinner.test.js` - Related test file for trick winner determination
- `test/utils/__mocks__/logger.js` - Mock implementation for the logger
- `test/utils/__mocks__/players.js` - Mock implementation for player utilities
- `test/utils/__mocks__/deck.js` - Mock implementation for deck utilities

## Test Execution
```bash
# Run all tests in this file
node --test test/game/phases/playingPhase.unit.test.js

# Run a specific test
node --test --test-name-pattern="should play a card and update game state correctly" test/game/phases/playingPhase.unit.test.js
```

## Error Cases Tested
- Playing out of turn
- Playing invalid cards
- Not following suit when able
- Invalid game states
- Edge cases in trick resolution
- Invalid player roles or positions
