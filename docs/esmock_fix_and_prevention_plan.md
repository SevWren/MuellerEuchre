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
  - **Files to fix:** `test/game/logic/aiLogic.unit.test.js`, `test/utils/historyUtils.unit.test.js`.

- **Pattern C (Intermediate - DEPRECATED):** Defining module paths as constants using `toPosixPath`. While an improvement over Pattern A, this pattern is now superseded by the wrapper.
  - **Files to fix:** Most phase tests (`biddingPhase.unit.test.js`, `endGame.unit.test.js`, etc.) and some socket handler tests currently use this pattern and should be refactored for consistency.

#### **3. Phase 2: Staged Correction Strategy (Status: Updated Strategy)**

The fix will continue in stages, with the goal of migrating all tests to the new standard.

- **Stage 1: Systemic Refactoring**
  - Systematically read and refactor every test file identified as using Patterns A, B, or C.
  - The sole objective is to replace their `esmock` implementation with calls to `esmockWithPaths` or `createMockedModule`.
  - Run tests for each file after refactoring to confirm it passes and functionality is preserved.

- **Stage 2: Full Suite Verification**
  - After all individual files are refactored, run the entire test suite (`npm test`) to guarantee no cross-module regressions were introduced.

#### **4. Phase 3: Long-Term Prevention & Documentation (Status: Updated & Actionable)**

To ensure these issues do not happen again and that the new standard is followed, these steps are required:

1.  **Mandate `esmock_wrapper.js`:** All tests involving `esmock` **must** use the functions provided by `test/utils/esmock_wrapper.js`. Direct calls to `esmock()` with manual pathing are now strictly forbidden. This leverages the project's existing `jsconfig.json` path aliases for a clean and maintainable approach.

2.  **Create New Conventions Document:** A new document **must** be created at `docs/TESTING_CONVENTIONS.md`. This file will serve as the official guide for all future tests and will contain:
    - A clear statement mandating the use of the `esmock_wrapper.js`.
    - Code examples demonstrating how to use `esmockWithPaths` and `createMockedModule`.
    - An explanation of _why_ this wrapper is used (cross-platform compatibility, path alias support).

3.  **Update Existing Documentation:** All other development plans and workflow documents that reference testing or mocking must be updated to refer to the new `TESTING_CONVENTIONS.md` and the `esmock_wrapper.js` standard. This ensures a single, consistent source of truth.
