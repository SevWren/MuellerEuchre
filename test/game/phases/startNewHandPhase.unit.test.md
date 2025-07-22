# Test File: `startNewHandPhase.unit.test.js`

## Overview
This test file contains unit tests for the start new hand phase logic in the Euchre Multiplayer game. It verifies the initialization of a new hand, including deck creation, card dealing, dealer rotation, and game state setup.

## Test Scope
- **Layer**: 1 (Pure Logic)
- **Dependencies**:
  - `src/game/phases/startNewHandPhase.js` (module under test)
  - `src/config/constants.js` (for game constants)
  - `src/game/logic/validation-errors.js` (for error types)
  - `src/utils/deck.js` (for deck utilities)
  - `src/utils/players.js` (for player utilities)
  - `test/helpers/test-helpers.js` (for test utilities)

## Test Structure

### Helper Functions
- `createMockDeck(count)`: Creates a mock deck with the specified number of cards
- `setupDeckMocks(deckSize)`: Configures mocks for deck operations
- `reloadStartNewHandModule()`: Reloads the module under test with fresh imports

### Test Categories
1. **Error Handling**
   - Invalid game states
   - Missing or invalid parameters
   - Phase validation
   - Deck size validation

2. **Deck Management**
   - Deck creation and shuffling
   - Card dealing to players
   - Kitty card setup
   - Turn card selection

3. **Dealer Rotation**
   - Proper dealer rotation between hands
   - First bidder determination
   - Score preservation during rotation

4. **Game State Initialization**
   - Player hand setup
   - Game phase transitions
   - Score tracking
   - Trick and round management

## Test Data Patterns
- Uses mock decks with known card distributions
- Tests various deck sizes (including edge cases)
- Covers all player positions and team configurations
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
   - Covers edge cases in deck management
   - Verifies all state transitions

## Dependencies
- **Mocked Dependencies**:
  - `deck` utility module (for deck operations)
  - `players` utility module (for player management)

## Maintenance Notes
- When modifying the start new hand logic, ensure all test cases are updated accordingly
- New test cases should be added for any additional game rules or edge cases
- The test file follows the project's testing standards and conventions

## Related Files
- `src/game/phases/startNewHandPhase.js` - Implementation being tested
- `test/helpers/test-helpers.js` - Test utilities
- `test/utils/__mocks__/deck.js` - Mock implementation for deck utilities
- `test/utils/__mocks__/players.js` - Mock implementation for player utilities

## Test Execution
```bash
# Run all tests in this file
node --test test/game/phases/startNewHandPhase.unit.test.js

# Run a specific test
node --test --test-name-pattern="should rotate dealer from SCORING phase" test/game/phases/startNewHandPhase.unit.test.js
```

## Known Issues
- Some tests are temporarily skipped due to ESM module mocking limitations
- Test will be re-enabled once proper ESM mocking solution is implemented

## Error Cases Tested
- Invalid game states
- Missing or invalid parameters
- Insufficient deck size
- Invalid dealer rotation
- Phase validation failures
