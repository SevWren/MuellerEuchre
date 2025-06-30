# Euchre Multiplayer Test Fix Plan

## Notes
- Current blocker: esmock module resolution issues in startNewHandPhase.unit.test.js on Windows
- Environment: Windows with spaces in the path (C:\github\MuellerEuchre - Windsurf)
- Project uses ESM modules with Mocha for testing
- Utility tests (deck, settingsUtils, historyUtils) are all passing after targeted fixes to logic and test expectations.
- All other phase test files (biddingPhase, endGame, goAlonePhase, lobbyPhase, playingPhase, scoringPhase) have been fixed and are passing.

## Attempted Fixes (Not Working for
)
1. Direct Relative Imports
   - Tried using direct relative imports (e.g., `import * as module from '../../../../src/...'`)
   - Result: Failed with `ERR_MODULE_NOT_FOUND`

2. Dynamic Imports with URL
   - Implemented dynamic imports with `new URL(relativePath, import.meta.url).href`
   - Result: Still encountering `ERR_MODULE_NOT_FOUND`

3. CommonJS require with createRequire
   - Attempted to use CommonJS `require` with `createRequire(import.meta.url)`
   - Result: `ReferenceError: require is not defined` in ESM context

4. Node.js Flags
   - Tried running with `--experimental-import-meta-resolve`
   - Tried running with `--es-module-specifier-resolution=node`
   - Result: No improvement in module resolution

5. Working Directory Changes
   - Attempted to run from different directories to avoid spaces in path
   - Result: Command syntax issues on Windows with `&&` operator

6. Path Normalization
   - Tried normalizing paths with `path` module and `fileURLToPath`
   - Result: Still encountering module resolution issues

## Task List
- [x] Fix esmock import/export issues in historyUtils tests
- [x] Fix logic/test expectation mismatches in utility tests
- [x] Fix all deck utility function test failures (cardToId, getCardRank, sortHand, isRightBower, isLeftBower, createDeck)
- [x] Fix all settingsUtils (validateSettings) test failures
- [x] Fix esmock import/module path issues in Layer 1 phase logic test files
  - [x] biddingPhase.unit.test.js: fix all import paths and mocks
  - [x] endGame.unit.test.js: fix all import paths and mocks
  - [x] goAlonePhase.unit.test.js: fix all import paths and mocks
  - [x] lobbyPhase.unit.test.js: fix all import paths and mocks
  - [x] playingPhase.unit.test.js: fix all import paths and mocks
  - [x] scoringPhase.unit.test.js: fix all import paths and mocks
  - [ ] startNewHandPhase.unit.test.js: fix all import paths and mocks
    - [ ] Explore alternative mocking libraries (e.g., testdouble, proxyquire, rewire)
    - [ ] Investigate esmock configuration options for Windows paths
    - [ ] Consider restructuring test to reduce mocking requirements
    - [ ] Test with `import.meta.resolve()` if available
    - [ ] Try using `file://` protocol with encoded paths for imports
  - [ ] Rerun each test file individually after changes
  - [ ] Document any test-specific logic fixes needed
- [ ] Run ALL LAYER 1 unit tests one by one until ALL EXPLICITLY return 100% pass conditions
  - [ ] Always run: npx mocha test/**/*.unit.test.js before considering tests fixed

## Current Goal
Resolve esmock module resolution issues in startNewHandPhase.unit.test.js on Windows by either:
1. Making esmock work with the current path structure, or
2. Implementing an alternative testing/mocking approach that works with the current environment