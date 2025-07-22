# End Game Phase Test Documentation

## Overview
This document outlines the responsibilities and test coverage of the `endGame.unit.test.js` file, which contains unit tests for the end-game logic of the Euchre Multiplayer game.

## Test File Purpose
The test file verifies the correct behavior of the end-game phase in the Euchre game, including score calculation, game over detection, match statistics tracking, and new game initialization.

## Test Dependencies
- Node.js `node:test` module for test running
- Node.js `node:assert/strict` for assertions
- Mock logger for verifying logging behavior
- Game constants from `src/config/constants.js`

## Test Structure

### 1. Test Setup and Utilities

#### `createTestGameState()`
Creates a standardized game state object for testing with the following properties:
- `gameId`: Test game ID
- `gamePhase`: Set to `END_GAME`
- `players`: Four players (2 per team)
- `scores`: Initialized to 0 for both teams
- `matchStats`: Tracks games played and team wins
- `messages`: Empty array for game messages

#### `hasMessage(messages, type, text)`
Helper function to check if a specific message exists in the game messages array.

### 2. Test Suites

#### `handleEndOfHand` Tests
Verifies the logic for handling the end of a hand, including:
- Score updates for normal hands
- 2-point awards for marches (winning all tricks)
- 2-point awards for euchres (stopping the maker team)
- Error handling for invalid team assignments
- Proper logging of warnings for edge cases

#### `checkGameOver` Tests
Validates the game over detection logic:
- Correctly identifies when a team has reached the winning score
- Updates game state with winner information
- Properly handles games that aren't over yet
- Updates match statistics

#### `endGame` (Internal Function) Tests
Tests internal game ending logic:
- Handles unknown teams gracefully
- Logs appropriate warnings for edge cases
- Maintains data integrity during game end

#### `startNewGame` Tests
Verifies the new game initialization:
- Resets all game state properly
- Clears player information
- Resets scores and match statistics
- Transitions to the LOBBY phase
- Adds appropriate game messages

## Test Coverage Areas

### Score Calculation
- Normal point awards (1 point for making bid)
- March bonuses (2 points for taking all tricks)
- Euchre penalties (2 points to opponents)
- Score threshold checking

### State Management
- Game phase transitions
- Winning team detection
- Game over state handling
- Player and team state management

### Error Handling
- Invalid team detection
- Missing or malformed game state
- Edge cases in score calculation
- Logging of warnings and errors

### Match Statistics
- Games played counter
- Team win tracking
- Statistic persistence across games

## Test Data Patterns

### Game State Objects
- Valid game states with various score combinations
- Edge cases (minimum/maximum scores)
- Invalid states for error testing

### Message Validation
- Score update messages
- Game over announcements
- Warning and error messages

## Best Practices

### Test Isolation
- Each test starts with a fresh game state
- Mocks are reset between tests
- No test depends on the state from previous tests

### Assertions
- Uses strict equality checks
- Verifies both positive and negative conditions
- Checks message content and formatting

### Documentation
- Comprehensive test descriptions
- Clear assertion messages
- Helpful error messages

## Dependencies
- Game phases and states from constants
- Team and player role definitions
- Scoring rules and win conditions

## Maintenance Notes
- Tests should be updated if scoring rules change
- New edge cases should be added as they're discovered
- Test data should be kept in sync with game constants
