# Refactoring Plan: Adopt `esmock_wrapper.js` in `biddingPhase.unit.test_new_wrapper.js`

## Goal

Replace manual `esmock` setup and path handling in `test/game/phases/biddingPhase.unit.test_new_wrapper.js` with the simplified approach provided by `test/utils/esmock_wrapper.js`. This will streamline the test file, making it more concise and easier to maintain by leveraging the centralized logic in the `esmock_wrapper.js`.

## Steps

1.  **Remove Manual Path Handling:**
    *   Delete the `__filename`, `__dirname`, and `toPosixPath` constants and function (lines 35-45).
    *   Remove the `PATHS` object (lines 48-59) as the wrapper handles path resolution.
2.  **Update Imports:**
    *   Remove the direct import of `esmock` (line 28).
    *   Remove the imports of `path` and `fileURLToPath` (lines 29-30).
    *   Import `createMockedModule` and `purgeAllEsmock` from `test/utils/esmock_wrapper.js`.
    *   Keep necessary imports like `expect`, `sinon`, and the constants/errors.
3.  **Refactor `beforeEach` Blocks:**
    *   In each `describe` block (`handleOrderUpDecision`, `handleDealerDiscard`, `handleCallTrumpDecision`), modify the `beforeEach` block.
    *   Replace the existing `esmock` call with a call to `createMockedModule`.
    *   The `createMockedModule` function takes `import.meta.url` as the first argument, the relative path to the module under test (`../../../src/game/phases/biddingPhase.js`) as the second, and an `overrideMocks` object as the third.
    *   The `overrideMocks` object will contain the specific mocks needed for that test suite (e.g., `validateBid`, `validateDealerDiscard`). The logger mock is automatically provided by `createMockedModule`.
    *   Update the variable assignments to destructure the returned object from `createMockedModule` (e.g., `({ module: handleOrderUpDecision, mocks } = await createMockedModule(...));`).
4.  **Update `afterEach` Block:**
    *   Modify the existing `afterEach` block (lines 156-162) to call `purgeAllEsmock()` to ensure the esmock cache is cleared after each test.
5.  **Review and Clean Up:**
    *   Remove any unused variables or helper functions that were only needed for the old setup (e.g., `baseLoggerMock` might become unnecessary if only the stubs from the wrapper's returned `mocks` object are used).
    *   Ensure all test assertions remain the same and continue to target the correct functionality.

```mermaid
graph TD
    A[Start Refactor] --> B{Analyze Current Test File};
    B --> C[Identify Manual Path Handling];
    C --> D[Identify Direct esmock Calls];
    D --> E[Outline Replacement with Wrapper];
    E --> F[Plan Step 1: Remove Manual Paths];
    E --> G[Plan Step 2: Update Imports];
    E --> H[Plan Step 3: Refactor beforeEach];
    E --> I[Plan Step 4: Update afterEach];
    E --> J[Plan Step 5: Review and Cleanup];
    J --> K[Present Plan to User];