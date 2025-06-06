# 🧪 Euchre Multiplayer Test Suite

This directory contains all automated tests for the Euchre Multiplayer project. The test suite ensures the reliability, correctness, and maintainability of the game's core logic, server, and services.

---

## 📁 Test Directory Structure

- **test/phases/**  
  Unit and integration tests for modular game phase logic (e.g., order up, go alone, play, scoring).
- **test/server/**  
  Tests for server-level logic, including persistence, reconnection, and validation.
- **test/services/**  
  Tests for service-layer modules (e.g., reconnection, core game services).
- **test/fixtures/**  
  Static data and state objects used as test fixtures.
- **test/helpers/**  
  Utility functions and helpers for test setup and assertions.
- **test/setup.js, test/loader.mjs, test/test-helper.js**  
  Test runner setup, ES module loader, and global test helpers.

---

## 🏗️ Test File Naming Conventions

- **Unit tests:**  
  `*.unit.test.js`  
  Test a single function or module in isolation.
- **Integration tests:**  
  `*.integration.test.js`  
  Test the interaction between multiple modules or a full game phase.
- **Edge case tests:**  
  `*.edge.unit.test.js`  
  Focus on rare or boundary conditions.

---

## 🧩 Test Philosophy & Methodologies

### Test Type Methodology Preferences

- **Unit Tests**  
  - **Preferred Patterns:**  
    - Arrange-Act-Assert (AAA)  
    - FIRST Principles (Fast, Isolated, Repeatable, Self-validating, Timely)
  - **Typical Location:**  
    - `test/phases/*.unit.test.js`  
    - `test/server/*.unit.test.js`  
    - `test/services/*.unit.test.js`
  - **Description:**  
    - Test a single function or module in isolation, using mocks/stubs as needed.
    - Use clear, descriptive `describe` and `it` blocks.
    - Example: `goAlone.unit.test.js`, `coreGame.unit.test.js`

- **Integration Tests**  
  - **Preferred Patterns:**  
    - Given-When-Then (GWT)  
    - Test Pyramid (integration tests supplement, not replace, unit tests)
  - **Typical Location:**  
    - `test/phases/*.integration.test.js`  
    - `test/server/*.integration.test.js`
  - **Description:**  
    - Test the interaction between multiple modules or simulate a full game phase.
    - Use minimal mocks; prefer real module interactions.
    - Example: `startHand.integration.test.js`, `multiGame.integration.test.js`

- **End-to-End (E2E) Tests**  
  - **Preferred Patterns:**  
    - Given-When-Then (GWT)  
    - Test Pyramid (fewest, highest-level tests)
  - **Typical Location:**  
    - (Not currently present, but would be in `test/e2e/` or similar)
  - **Description:**  
    - Simulate real user flows through the entire system.
    - Use real server and client, minimal mocking.

### Universal Patterns Used

- **Arrange-Act-Assert (AAA):**  
  Used in all unit tests for clarity and maintainability.
- **Given-When-Then (GWT):**  
  Used in integration and (future) E2E tests for readability.
- **Test Pyramid:**  
  Emphasize many unit tests, some integration tests, and few E2E tests.
- **FIRST Principles:**  
  All unit tests should be Fast, Isolated, Repeatable, Self-validating, and Timely.
- **Mocking, Stubbing, Spying:**  
  Use Sinon for mocks/stubs/spies, especially in unit tests.
- **Data-Driven Testing:**  
  Use fixtures and parameterized tests for scenarios with many input variations.
- **Clear Naming:**  
  All test files, suites, and cases use descriptive names and comments.

---

## 🛠️ Running the Tests

From the project root, run:

```bash
npm test
```

- Uses **Mocha** as the test runner.
- **Chai** for assertions.
- **Sinon** for mocks/stubs/spies.
- **c8** for code coverage.

---

## 📝 Adding New Tests

1. Place new unit tests in the appropriate `test/phases/`, `test/server/`, or `test/services/` directory.
2. Name files according to the conventions above.
3. Follow the AAA pattern and FIRST principles for unit tests.
4. Use GWT for integration/E2E tests.
5. Use fixtures and helpers as needed.
6. Ensure tests are isolated and repeatable.

---

## 🔗 References

- [Mocha Documentation](https://mochajs.org/)
- [Chai Documentation](https://www.chaijs.com/)
- [Sinon Documentation](https://sinonjs.org/)
- [c8 Coverage](https://www.npmjs.com/package/c8)

---

## 📣 Contact

For questions or contributions, see the main [README.md](../readme.md) or open an issue on GitHub.
