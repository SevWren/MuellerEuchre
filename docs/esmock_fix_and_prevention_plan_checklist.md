Files that need to be updated to use the new `esmock_wrapper.js` standard.

### **Task Plan: `esmock` Standardization**

-   [ ] **Refactor All Deprecated `esmock` Usages to the New Wrapper Standard**
    -   [ ] `test/db/gameRepository.unit.test.js`
        -   [ ] Replace hardcoded relative paths with `esmockWithPaths` or `createMockedModule`.  Run individual file test to verify any changes made.
    -   [ ] `test/game/state.unit.test.js`
        -   [ ] Replace hardcoded relative paths with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
    -   [ ] `test/utils/statsUtils.unit.test.js`
        -   [ ] Replace direct `esmock` call with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
    -   [ ] `test/game/logic/aiLogic.unit.test.js`
        -   [ ] Replace `path.join(__dirname, ...)` logic with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
    -   [ ] `test/utils/historyUtils.unit.test.js`
        -   [ ] Replace `path.join(__dirname, ...)` logic with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
    -   [ ] `test/game/phases/biddingPhase.unit.test.js`
        -   [ ] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
    -   [ ] `test/game/phases/endGame.unit.test.js`
        -   [ ] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
    -   [ ] `test/game/phases/goAlonePhase.unit.test.js`
        -   [ ] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
    -   [ ] `test/game/phases/lobbyPhase.unit.test.js`
        -   [ ] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
    -   [ ] `test/game/phases/playingPhase.unit.test.js`
        -   [ ] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
    -   [ ] `test/game/phases/scoringPhase.unit.test.js`
        -   [ ] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
    -   [ ] `test/game/logic/validation.unit.test.js`
        -   [ ] Replace `toPosixPath` helper and path constants with `esmock_wrapper.js` utility. Run individual file test to verify any changes made.
    -   [ ] `test/socket/handlers/goAloneHandlers.unit.test.js`
        -   [ ] Replace direct `esmock` call with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
    -   [ ] `test/socket/handlers/playingHandlers.unit.test.js`
        -   [ ] Replace direct `esmock` call with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
    -   [X] `test/socket/handlers/biddingHandlers.unit.test.js`
        -   [X] Replace hardcoded relative paths with `esmockWithPaths` or `createMockedModule`. Run individual file test to verify any changes made.
-   [ ] **Finalize Documentation**
    -   [ ] Create `docs/TESTING_CONVENTIONS.md` to mandate the use of `esmock_wrapper.js`.
## Current Goal