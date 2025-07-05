# Refactor playingPhase.unit.test.js to use esmock_wrapper.js

## Notes
- Documentation for aiLogic.unit.test.js and validation.unit.test.js has been updated. All Layer 1 test documentation is now current and compliant with the codebase.
- MANDATORY: For all file analysis, every line of every file must be reviewed for compliance and correctness (see permanent memory: Full File Analysis Protocol).
- Ensure that the analysis of lobbyPhase.unit.test.js is performed line-by-line for the entire file, not just the first 200 lines, in accordance with the protocol.
- Documented issues in lobbyPhase.unit.test.js:
  - Critical: Hardcoded team IDs (use TEAMS constants),
  - Major: Redundant concurrency test (should be removed or revised),
  - Minor: Missing TEAMS import, missing edge case tests, possible code organization improvements (e.g., move mock logger setup to before block, break up long lines).
- Recommendations for lobbyPhase.unit.test.js:
  1. Replace hardcoded team IDs with TEAMS constants.
  2. Remove or update the redundant concurrency test.
  3. Add missing edge case and input validation tests (invalid player role, game state immutability, message format, max player count, etc.).
  4. Add TEAMS to import statements.
  5. Refactor code organization as needed for clarity and maintainability.
- After making changes, always run the affected tests, check for unintended side effects, and verify that test coverage remains adequate.
- Issues found in endGame.unit.test.js: direct import instead of esmockWithPaths, platform-specific test skipping, duplicate properties in gameState, hardcoded values, and missing edge case coverage. See memory for details.
- Future audit required: Perform a comprehensive review of all files to identify missing tests for edge cases and improve coverage, aiming for close to 100%.
- Both the issues memory for endGame.unit.test.js and the future test coverage audit memory will notify the user when they are no longer valid, i.e., when the work has been 100% completed.
- Several non-Layer 1 test files (e.g., biddingHandlers.unit.test.js, historyUtils.unit.test.js) are still using direct esmock or deprecated mocking patterns and must be refactored to use esmock_wrapper.js. These files need to be queued for refactor as part of the next review phase.
- Next: Review remaining test files for mocking compliance and correct usage of esmock_wrapper.js; ensure all non-Layer 1 files using deprecated patterns are identified and queued for refactor.

## Task List
- [ ] Audit every file containing the word "mock" in the codebase for compliance and documentation accuracy
- [ ] Review remaining test files for mocking compliance and esmock_wrapper.js usage
  - [ ] Identify and queue all non-Layer 1 test files using direct esmock or deprecated mocking patterns (e.g., biddingHandlers.unit.test.js, historyUtils.unit.test.js) for refactor to use esmock_wrapper.js
- [ ] Address critical, major, and minor issues in lobbyPhase.unit.test.js:
  - [ ] Replace hardcoded team IDs with TEAMS constants
  - [ ] Remove or update the redundant concurrency test
  - [ ] Add missing edge case and input validation tests
  - [ ] Add TEAMS to import statements
  - [ ] Refactor code organization for clarity and maintainability
- [ ] Address all issues and recommendations in endGame.unit.test.js
- [ ] Perform comprehensive audit for missing edge case tests and coverage improvements

## Current Goal
Audit remaining test files for mocking compliance and address issues in lobbyPhase.unit.test.js and endGame.unit.test.js