# Euchre Multiplayer Test Fix Plan

## Notes
- Current blockers are Layer 1 unit test failures due to esmock import/module resolution issues in phase logic test files (biddingPhase, endGame, goAlonePhase, lobbyPhase, playingPhase, scoringPhase, startNewHandPhase).
- Utility tests (deck, settingsUtils, historyUtils) are all passing after targeted fixes to logic and test expectations.
- Persistent environment info: Project root is c:/github/MuellerEuchre - Windsurf; all tests run with Mocha; esmock is used for mocking ESM modules; PowerShell is the default shell in VS Code; test files are in test/ directory and source in src/; .gitignore previously blocked .vscode/settings.json but this is now resolved; all plans and logs are written to docs/ and .codeium/windsurf/brain/.

## Task List
- [x] Remove .vscode/settings.json from .gitignore to allow access
- [x] Fix JSON syntax in settings.json
- [x] Analyze PowerShell terminal configuration for issues
- [x] Recommend and implement fixes for PowerShell args and shell integration
- [x] Test that VS Code now runs commands in PowerShell as intended
- [x] Fix esmock import/export issues in historyUtils tests
- [x] Fix logic/test expectation mismatches in utility tests
- [x] Fix all deck utility function test failures (cardToId, getCardRank, sortHand, isRightBower, isLeftBower, createDeck)
- [x] Fix all settingsUtils (validateSettings) test failures
- [ ] Fix esmock import/module path issues in Layer 1 phase logic test files
  - [ ] biddingPhase.unit.test.js: fix all import paths and mocks
  - [ ] endGame.unit.test.js: fix all import paths and mocks
  - [ ] goAlonePhase.unit.test.js: fix all import paths and mocks
  - [ ] lobbyPhase.unit.test.js: fix all import paths and mocks
  - [ ] playingPhase.unit.test.js: fix all import paths and mocks
  - [ ] scoringPhase.unit.test.js: fix all import paths and mocks
  - [ ] startNewHandPhase.unit.test.js: fix all import paths and mocks
  - [ ] Rerun each test file individually after changes
  - [ ] Document any test-specific logic fixes needed
- [ ] Run ALL LAYER 1 unit tests one by one until ALL EXPLICITLY return 100% pass conditions
  - [ ] Always run: npx mocha test/**/*.unit.test.js before considering tests fixed

## Current Goal
Fix esmock import/module path issues in Layer 1 phase logic test files.