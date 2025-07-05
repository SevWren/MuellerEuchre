### **Updated Plan: Systemic `esmock` Path Correction and Standardization 7/3/25**

#### **1. Introduction & Goal (Status: Confirmed)**

The goal of this plan remains to **eradicate all `esmock` pathing errors across the entire test suite** and establish a clear, maintainable convention to prevent this class of error from recurring. This plan has been updated to reflect significant progress and the adoption of a superior mocking strategy.

#### **2. Project-Wide `esmock` Audit (Status: Updated)**

A project-wide analysis reveals that while progress has been made, several legacy patterns still exist and must be refactored. The new standard is the `esmock_wrapper.js` utility.

- **The New Standard (Wrapper):** The utility at `test/utils/esmock_wrapper.js` provides `esmockWithPaths` and `createMockedModule`. This is the mandatory pattern for all new and refactored tests as it correctly handles path aliases (`@/`) and is cross-platform compatible.
  - **Exemplars:** `test/utils/players.unit.test.js`, `test/game/phases/startNewHandPhase.unit.test.js`

- **Pattern A (High-Risk - DEPRECATED):** Hardcoded, deep relative paths (e.g., `../../../src/...`). This brittle pattern is still present in some older test files and must be eliminated.
  - **Files to fix:** `test/db/gameRepository.unit.test.js`, `test/game/state.unit.test.js`, `test/socket/handlers/biddingHandlers.unit.test.js`, `test/utils/statsUtils.unit.test.js`.

- **Pattern B (Medium-Risk - DEPRECATED):** Using `path.join(__dirname, ...)`. This is slightly more robust but does not support path aliasing and is less readable than the wrapper.
  - **Files to fix:** `test/utils/historyUtils.unit.test.js`.
  - **Files audited and compliant:** `test/game/logic/aiLogic.unit.test.js` has been audited and verified to be compliant with the new mocking standards.

- **Pattern C (COMPLETED - DEPRECATED):** Defining module paths as constants using `toPosixPath`. This pattern has been completely removed from all Layer 1 test files and replaced with the new wrapper.
  - **Completed Files:** All phase tests (`biddingPhase.unit.test.js`, `endGame.unit.test.js`, `goAlonePhase.unit.test.js`, `lobbyPhase.unit.test.js`, `playingPhase.unit.test.js`, `scoringPhase.unit.test.js`) and logic tests (`aiLogic.unit.test.js`, `validation.unit.test.js`) have been successfully audited and verified to be compliant with the new mocking standards.

#### **3. Phase 2: Staged Correction Strategy (Status: Layer 1 Complete)**

The fix is proceeding in stages, with Layer 1 (core game phase tests) now fully migrated to the new standard.

- **Stage 1: Layer 1 Files - COMPLETED**
  - All Layer 1 test files have been refactored to use `esmockWithPaths` or `createMockedModule`
  - Tests have been verified to pass with the new implementation
  - Documentation has been updated to reflect current patterns
  - All Layer 1 logic test files (`aiLogic.unit.test.js`, `validation.unit.test.js`) have been audited and verified to be compliant with the new mocking standards

- **Stage 2: Remaining Files - IN PROGRESS**
  - Continue refactoring remaining test files using Patterns A and B
  - Follow the same patterns established in Layer 1
  - Verify all tests pass after refactoring

- **Stage 2: Full Suite Verification**
  - After all individual files are refactored, run the entire test suite (`npm test`) to guarantee no cross-module regressions were introduced.

#### **4. Phase 3: Long-Term Prevention & Documentation (Status: Updated & Actionable)**

To ensure these issues do not happen again and that the new standard is followed, these steps are required:

1.  **Mandate `esmock_wrapper.js`:** All tests involving `esmock` **must** use the functions provided by `test/utils/esmock_wrapper.js`. Direct calls to `esmock()` with manual pathing are now strictly forbidden. This leverages the project's existing `jsconfig.json` path aliases for a clean and maintainable approach.

2.  **Testing Conventions Document:** The document at `docs/testing/mocking-patterns.md` serves as the official guide for all future tests and contains:
    - A clear statement mandating the use of the `esmock_wrapper.js`
    - Code examples demonstrating how to use `esmockWithPaths` and `createMockedModule`
    - An explanation of _why_ this wrapper is used (cross-platform compatibility, path alias support)
    - Best practices and common patterns for testing
    - Reference: [Mocking Patterns Documentation](./testing/mocking-patterns.md)

3.  **Update Existing Documentation:** All other development plans and workflow documents that reference testing or mocking must be updated to refer to the new `TESTING_CONVENTIONS.md` and the `esmock_wrapper.js` standard. This ensures a single, consistent source of truth.
