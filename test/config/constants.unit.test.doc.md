# Constants Unit Test Documentation

## Overview
This document provides comprehensive documentation for the `constants.unit.test.js` file, which contains unit tests for the game constants defined in `src/config/constants.js`. These tests ensure that all game constants are properly defined, have the expected values, and maintain consistency across the application.

## Test File Location
- **Test File:** `test/config/constants.unit.test.js`
- **Source File:** `src/config/constants.js`

## Test Suite Structure
The test suite is organized into the following main sections, each corresponding to a constant or group of related constants:

1. **CARD_SUITS**
   - Verifies the existence and structure of card suit constants
   - Ensures backward compatibility with the `SUITS` alias
   - Validates all required suit values are present

2. **CARD_VALUES**
   - Tests the card values array for correct content and order
   - Ensures backward compatibility with the `VALUES` alias
   - Verifies the presence of all required card values (9 through A)

3. **CARD_RANKS**
   - Validates all card rank constants and their numerical values
   - Ensures correct ranking values for different card combinations
   - Verifies special rank values (RIGHT_BOWER, LEFT_BOWER, etc.)

4. **BID_DECISIONS**
   - Tests the presence of all bidding decision types
   - Verifies backward compatibility with legacy decision constants

5. **LOG_LEVELS**
   - Validates all log level constants
   - Ensures backward compatibility with `DEBUG_LEVELS`
   - Verifies the correct hierarchy of log levels

6. **STORAGE_KEYS**
   - Tests the presence of all storage key constants
   - Verifies backward compatibility with legacy key names

7. **GAME_EVENTS**
   - Validates all game event constants
   - Ensures all required event types are defined
   - Verifies backward compatibility with legacy event names

8. **GAME_PHASES**
   - Tests the game phase constants
   - Verifies all required phases are defined
   - Ensures backward compatibility with legacy phase names

9. **PLAYER_ROLES**
   - Validates player role constants
   - Verifies the presence of all four player positions
   - Ensures correct role identifiers

10. **PLAYER_POSITIONS**
    - Tests player position constants
    - Verifies backward compatibility with legacy position names

11. **TEAMS**
    - Validates team-related constants
    - Verifies the presence of all team identifiers
    - Ensures backward compatibility with legacy team names

12. **WINNING_SCORE**
    - Tests the winning score constant
    - Verifies the correct numerical value

## Test Coverage

### Constants Verified
- All game constants are verified for existence and correct values
- Backward compatibility with legacy constant names is maintained
- Enum-like objects are checked for all required keys

### Edge Cases
- Tests handle both new prefixed and legacy constant names
- Verifies that constant values are not accidentally modified
- Ensures all required constants are exported

### Type Safety
- Verifies that numeric constants are of type `number`
- Ensures string constants are of type `string`
- Validates that array constants contain the correct number of elements

## Running the Tests

To run just these tests:

```bash
node --test test/config/constants.unit.test.js
```

## Dependencies

- **`node:test`**: The built-in Node.js test runner.
- **`node:assert/strict`**: The library used for all assertions.
- **`src/config/constants.js`**: The source module under test.

## Maintenance

When adding new constants to `constants.js`:

1. Add corresponding test cases to verify the new constants.
2. Update this documentation to reflect any new test sections.
3. Ensure backward compatibility tests are added if applicable.
4. Run the tests to verify everything still passes.

## Test Output

Successful test output will show all test suites passing with a summary of the number of tests run. Any failures will be clearly indicated with details about which constant or value failed validation.

## See Also

- **Source Code:** `src/config/constants.js`
- **Project Testing Rules:** `docs/Test Helpers and Utilities.md`
- **Architectural Rules:** `docs/Layer1_Purity_Rules.md`