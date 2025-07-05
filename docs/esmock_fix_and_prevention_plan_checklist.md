Files that need to be updated to use the new `esmock_wrapper.js` standard.

### **Task Plan: `esmock` Standardization**

- [ ] **Refactor All Deprecated `esmock` Usages to the New Wrapper Standard**
  - [ ] `test/db/gameRepository.unit.test.js`
    - [ ] Replace hardcoded relative paths with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
  - [ ] `test/game/state.unit.test.js`
    - [ ] Replace hardcoded relative paths with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
  - [ ] `test/utils/statsUtils.unit.test.js`
    - [ ] Replace direct `esmock` call with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
  - [x] `test/game/logic/aiLogic.unit.test.js`
    - [x] Audited and verified to be compliant with `esmock_wrapper.js` standards. No changes needed as it already uses `esmockWithPaths` correctly.
  - [ ] `test/utils/historyUtils.unit.test.js`
    - [ ] Replace `path.join(__dirname, ...)` logic with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
  - [x] `test/game/phases/biddingPhase.unit.test.js`
    - [x] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
  - [x] `test/game/phases/endGame.unit.test.js`
    - [x] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
  - [x] `test/game/phases/goAlonePhase.unit.test.js`
    - [x] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
  - [x] `test/game/phases/lobbyPhase.unit.test.js`
    - [x] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
  - [x] `test/game/phases/playingPhase.unit.test.js`
    - [x] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
  - [x] `test/game/phases/scoringPhase.unit.test.js`
    - [x] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
  - [x] `test/game/logic/validation.unit.test.js`
    - [x] Audited and verified to be compliant with `esmock_wrapper.js` standards. The file correctly uses `esmockWithPaths` and follows project mocking patterns.
  - [ ] `test/socket/handlers/goAloneHandlers.unit.test.js`
    - [ ] Replace direct `esmock` call with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
  - [ ] `test/socket/handlers/playingHandlers.unit.test.js`
    - [ ] Replace direct `esmock` call with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
  - [x] `test/socket/handlers/biddingHandlers.unit.test.js`
    - [x] Replace hardcoded relative paths with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
- [x] **Finalize Documentation**
  - [x] Create `docs/testing/mocking-patterns.md` to document the use of `esmock_wrapper.js`
  - [x] Update `esmock_fix_and_prevention_plan.md` to reflect current status

## Verification of Layer 1 Completion

All Layer 1 test files have been verified to use `esmock_wrapper.js` with the following patterns:

### Verified Patterns
- [x] All imports from `esmock_wrapper.js` use either `esmockWithPaths` or `createMockedModule`
- [x] No direct usage of `esmock` in test files
- [x] No usage of `toPosixPath` or `PATHS` constants
- [x] All tests pass after refactoring
- [x] Documentation has been updated to reflect current patterns

### Layer 1 Test Files
- [x] `test/game/phases/biddingPhase.unit.test.js`
- [x] `test/game/phases/endGame.unit.test.js`
- [x] `test/game/phases/goAlonePhase.unit.test.js`
- [x] `test/game/phases/lobbyPhase.unit.test.js`
- [x] `test/game/phases/playingPhase.unit.test.js`
- [x] `test/game/phases/scoringPhase.unit.test.js`
- [x] `test/game/logic/aiLogic.unit.test.js`
- [x] `test/game/logic/validation.unit.test.js`

## Current Goal
