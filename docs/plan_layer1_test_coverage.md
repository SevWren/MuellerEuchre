# Plan to Achieve 100% Test Coverage for Layer 1

This document outlines the plan to achieve 100% unit test coverage for all files identified as belonging to Layer 1 of the Mueller Euchre project, based on the project's layered architecture definition and a recent test coverage report.

Layer 1 includes:
- Core Logic & Utilities: Pure, stateless functions for game rules and utilities.
- Location: `src/game/logic/`, `src/utils/`, and `/src/game/phases/*.js`.

The following Layer 1 files have been identified, along with their current test coverage status (based on the provided report):

- `src/game/logic/errors.js`: Not explicitly listed, but implicitly used. Needs explicit tests.
- `src/game/logic/validation.js`: 98.42%
- `src/game/phases/bidding.js`: 82.44%
- `src/game/phases/biddingPhase.js`: 82.44%
- `src/game/phases/endGame.js`: 82.44%
- `src/game/phases/goAlonePhase.js`: 82.44%
- `src/game/phases/lobbyPhase.js`: 82.44%
- `src/game/phases/playingPhase.js`: 82.44%
- `src/game/phases/scoringPhase.js`: 8244%
- `src/game/phases/startNewHandPhase.js`: 82.44%
- `src/utils/deck.js`: 60.0%
- `src/utils/errorUtils.js`: 100.0% (Already complete)
- `src/utils/lobbyUtils.js`: 0.0%
- `src/utils/logger.js`: 60.91% (Aim for high coverage)
- `src/utils/players.js`: 61.08%

## Proposed Plan

The plan is divided into three phases: creating new test files for modules currently lacking them, enhancing existing test files to cover missing logic, and verifying coverage through iterative testing.

### Phase 1: Create New Test Files

For Layer 1 files with low or no existing coverage, create dedicated unit test files.

1.  **Test `src/game/logic/errors.js`**:
    *   Create [`test/game/logic/errors.unit.test.js`](test/game/logic/errors.unit.test.js).
    *   Write tests to verify the definition and inheritance of each custom error class (`ValidationError`, `NotPlayersTurnError`, `InvalidPhaseError`, etc.).

2.  **Test `src/utils/lobbyUtils.js`**:
    *   Create [`test/utils/lobbyUtils.unit.test.js`](test/utils/lobbyUtils.unit.test.js).
    *   Write tests for `assignRoleToPlayer`, `isLobbyFull`, and `getNextAvailableRole`, covering various lobby states (empty, partial, full) and player scenarios (joining, rejoining).

3.  **Test `src/utils/deck.js`**:
    *   Create [`test/utils/deck.unit.test.js`](test/utils/deck.unit.test.js).
    *   Write tests for `createDeck`, `shuffleDeck`, `cardToId`, `isRightBower`, `isLeftBower`, `getCardRank`, and `sortHand`, ensuring all logic and edge cases related to card properties and ranking are covered.

4.  **Test `src/utils/logger.js`**:
    *   Create [`test/utils/logger.unit.test.js`](test/utils/logger.unit.test.js).
    *   Use mocking to test the exported `logger`, `log`, and `setDebugLevel` functions, verifying that they interact correctly with the underlying Pino library for different log levels and inputs. Aim for high statement coverage.

### Phase 2: Enhance Existing Test Files

For Layer 1 files that already have unit test files but are not at 100% coverage, add tests to cover the missing lines and branches.

5.  **Enhance `test/game/logic/validation.unit.test.js`**:
    *   Analyze the detailed coverage report for [`src/game/logic/validation.js`](src/game/logic/validation.js).
    *   Add specific test cases to [`test/game/logic/validation.unit.test.js`](test/game/logic/validation.unit.test.js) to cover any identified missing lines or branches in `validatePlay`, `validateBid`, and `validateDealerDiscard`.

6.  **Enhance Phase Unit Tests (`test/phases/*.unit.test.js`)**:
    *   Analyze the detailed coverage report for each file in [`src/game/phases/`](src/game/phases/).
    *   For each phase file (`bidding.js`, `biddingPhase.js`, `endGame.js`, `goAlonePhase.js`, `lobbyPhase.js`, `playingPhase.js`, `scoringPhase.js`, `startNewHandPhase.js`), add tests to their corresponding unit test files in [`test/phases/`](test/phases/) to cover any missing logic, branches, or statements. This will require setting up specific game states to exercise different code paths.

7.  **Enhance `test/utils/players.unit.test.js`**:
    *   Analyze the detailed coverage report for [`src/utils/players.js`](src/utils/players.js).
    *   Add tests to [`test/utils/players.unit.test.js`](test/utils/players.unit.test.js) to cover any missing logic in the player utility functions, particularly focusing on edge cases in functions like `getNextPlayer`.

### Phase 3: Verify and Iterate

Continuously verify test coverage and iterate on test implementation until the goal is reached.

8.  **Run Coverage Report**: Execute the test suite with coverage reporting enabled (`npm run test:coverage` or equivalent).
9.  **Review Report**: Analyze the generated coverage report to identify any remaining gaps in Layer 1 coverage.
10. **Iterate**: If coverage is not yet 100% (or high for the logger), return to Phase 2 to add more tests for the identified gaps. Repeat this phase until the coverage goal is met.

## Plan Visualization

```mermaid
graph TD
    A[Start: Analyze Coverage Report] --> B{Identify Layer 1 Files};
    B --> C{Files with < 100% Coverage};
    C --> D{Files Missing Dedicated Tests};
    C --> E{Files with Existing Tests};
    D --> F[Phase 1: Create New Test Files];
    F --> G[Test src/game/logic/errors.js];
    F --> H[Test src/utils/lobbyUtils.js];
    F --> I[Test src/utils/deck.js];
    F --> J[Test src/utils/logger.js];
    J --> K{Achieve High Coverage for Logger};
    E --> L[Phase 2: Enhance Existing Test Files];
    L --> M[Enhance validation.unit.test.js];
    L --> N[Enhance phase unit tests];
    L --> O[Enhance players.unit.test.js];
    G --> P{Tests Written?};
    H --> P;
    I --> P;
    J --> P;
    M --> Q{Tests Added?};
    N --> Q;
    O --> Q;
    P --> R[Run Coverage Report];
    Q --> R;
    R --> S{100% Layer 1 Coverage?};
    S -- No --> C;
    S -- Yes --> T[Phase 3: Verify and Complete];
    T --> U[Final Coverage Report Review];
    U --> V[Task Complete];