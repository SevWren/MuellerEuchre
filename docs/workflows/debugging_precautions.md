# Debugging Workflow Precautions for MuellerEuchre

This document outlines a systematic approach to debugging within the MuellerEuchre project, with a strong emphasis on minimizing cascading test failures and adhering to the project's architectural principles.

## 1. Core Principles for Effective Debugging

When approaching a bug, always keep the following principles in mind:

- **Understand the Layer:** Identify which architectural layer the file you are debugging belongs to (Layer 1: Core Logic, Layer 2: State Management, Layer 3: Network API, etc.). This context is crucial for understanding its responsibilities and constraints.
- **Embrace Test-Driven Debugging (TDD):**
  - **Reproduce the Bug First:** Before making any code changes, write a new unit test that specifically reproduces the bug you are observing. This test should initially fail.
  - **Isolate with Mocks:** Utilize `esmock` to mock dependencies of the module under test. This ensures you are debugging the module in isolation and not its collaborators.
- **Analyze Dependencies and Impact:**
  - **Dependency Mapping:** Understand which other modules your file depends on and which modules depend on yours.
  - **Cascading Failure Awareness:** Consider how a change in your file might affect downstream tests or modules. A small fix in one area could inadvertently break another if not carefully managed.
- **Adhere to Purity and Immutability:**
  - **Layer 1:** Ensure all Layer 1 functions remain pure and stateless. Avoid side effects, direct state mutation, or I/O operations. Any state changes should be handled by Layer 2.
  - **Immutability:** Always work with copies of state objects and return new objects rather than mutating existing ones.
- **Review Recent Changes:** Check the Git history for recent commits related to the file or its dependencies.
- **Leverage Project Logging:** Use the centralized logger (`src/utils/logger.js`) to add detailed, contextual log messages during debugging. Avoid using `console.log` directly.
- **Test Environment Setup:** **Upon discovering an incorrect test environment setup, ALWAYS first prompt the user for guidance and WAIT for their response.**

## 2. Step-by-Step Debugging Process

Follow these steps to systematically debug issues:

1.  **Identify and Define the Bug:**
    - Clearly articulate the observed incorrect behavior.
    - Define the expected correct behavior.
    - Note any error messages, stack traces, or unexpected outputs.

2.  **Reproduce the Bug with a Test:**
    - Create a new unit test file (e.g., `test/path/to/your/module.unit.test.js`) or add a new test case to an existing file.
    - Write a test that triggers the bug. This test should fail when run against the current codebase.
    - Ensure the test is as specific as possible to the bug.

3.  **Analyze the Failing Test:**
    - Run the new test and observe its failure.
    - Determine if the failure is due to:
      - An `AssertionError` (expected vs. actual values).
      - An uncaught exception or error.
      - Incorrect mock behavior.
      - Unexpected side effects.

4.  **Isolate the Module Under Test:**
    - Use `esmock` to mock all external dependencies of the module you are debugging.
    - Focus your debugging efforts solely on the logic within the target module.

5.  **Inspect Code Execution:**
    - Use a debugger (e.g., Node.js inspector, IDE debugger) to step through the code execution path that triggers the bug.
    - Pay close attention to variable values, function arguments, return values, and the flow of control.

6.  **Formulate and Test Hypotheses:**
    - Based on your observations, form a hypothesis about the root cause of the bug.
    - Make the smallest possible code change to your module that you believe will fix the bug and pass the failing test.

7.  **Implement Minimal Fix and Re-test:**
    - Apply the minimal change required to make the failing test pass.
    - Run _all_ relevant tests (unit, integration) to ensure no regressions were introduced.
    - If the fix causes other tests to fail, revert the change and refine your hypothesis.

8.  **Refactor and Document:**
    - Once the bug is fixed and all tests pass, refactor the code for clarity, maintainability, and adherence to project standards.
    - Add or update JSDoc comments as necessary.
    - If the fix is complex or non-obvious, add inline comments explaining the solution.

## 3. MuellerEuchre Specific Precautions

- **Layer 1 Purity:** When debugging Layer 1 modules (`src/game/logic/`, `src/utils/`), strictly enforce purity. Ensure no direct state mutations or side effects are introduced. If a bug requires state management, it should be handled by delegating to Layer 2.
- **Test Directory Structure:** Be mindful of the test organization (`test/game/logic/`, `test/phases/`, `test/socket/handlers/`, etc.) when identifying which tests are relevant to a particular module.
- **Asynchronous Operations:** For modules involving Socket.IO (`src/socket/`) or database interactions (`src/db/`), pay close attention to asynchronous code, callbacks, Promises, and potential race conditions. Ensure proper error handling for async operations.
- **Configuration and Constants:** Refer to `src/config/` for any constants or configurations that might influence behavior. Ensure your debugging aligns with these settings.
- **Error Handling Strategy:** Layer 1 modules should throw specific errors, while higher layers handle the catching and processing. Ensure your debugging respects this error propagation strategy.

### Tricky Code Examples and Considerations

When debugging, be aware of these common complexities within the MuellerEuchre codebase:

- **`esmock` Challenges:**
  - **Complex Dependency Graphs:** Mocking modules with many interdependencies can be challenging. Ensure mocks accurately reflect the expected behavior of dependencies, and that mock implementations themselves don't introduce subtle bugs.
  - **Mock Implementation Errors:** A common pitfall is an incorrectly implemented mock function that returns unexpected values or throws errors, leading to false positives or negatives in tests. Always verify your mocks.
  - **Example:** If `src/game/logic/cardUtils.js` depends on `src/utils/deck.js`, and you mock `deck.js` to return a fixed set of cards, ensure the mock correctly simulates card dealing and shuffling if those aspects are relevant to the bug.

- **Relative Pathing Issues:**
  - **Fragility:** Relative paths (`./`, `../`) are essential for modularity but can be fragile. If a file is moved or refactored without updating its import statements, it can lead to `MODULE_NOT_FOUND` errors or unexpected behavior.
  - **Verification:** **ALWAYS** verify that all relative paths in `import` and `export` statements are correct and working as expected when debugging. For instance, an import like `import { logger } from '../../utils/logger.js';` assumes a specific directory structure. If `logger.js` were moved to `src/core/utils/`, this import would break.
  - **Example:** Debugging `src/game/phases/playingPhase.js` might involve imports like `../logic/validation.js`. If `validation.js` were moved, this import would fail.

- **Logic Difficulties in Multiplayer Euchre:**
  - **State Management:** The core challenge in multiplayer games is managing the game state accurately across all players in real-time. Bugs can arise from race conditions, incorrect state updates, or discrepancies between server and client states.
  - **Turn Management:** Ensuring the correct player's turn and handling game flow (bidding, playing cards, scoring) in a 4-player context requires careful logic. Debugging often involves tracing the sequence of actions and state changes.
  - **Rule Variations:** Euchre has specific rules (e.g., Bowers, trump selection, scoring for going alone) that can be complex to implement correctly and thus prone to bugs.

## 4. Handling Test Environment Issues

- **User Prompt:** If you encounter issues related to the test environment setup (e.g., missing dependencies, incorrect configurations, test runner errors), **do not attempt to resolve them independently.** Instead, clearly articulate the problem to the user and **prompt them for guidance**. **WAIT for their response** before proceeding.
