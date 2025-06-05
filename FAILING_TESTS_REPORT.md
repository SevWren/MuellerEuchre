# Failing Tests Report (Non-Proxyquire Issues)

This report details failing tests that are NOT primarily due to the `proxyquire` ESM incompatibility or the `test/services/stateSync.unit.test.js` file reversion issue.

**Note:** The test environment's instability and the masking effect of `proxyquire` failures in `beforeEach` hooks make a definitive list challenging. The following are based on observations from recent test runs. Once the environment is stable and `proxyquire` issues are addressed, a more accurate list can be generated.

## Approximate Count of These Failures: ~20

## Observed Error Types and Examples:

1.  **TypeError: Method not found on server instance**
    *   Example: `TypeError: server.applyCSP is not a function`
    *   Likely Cause: Tests may be using an outdated or incorrect mock/instance of the server, or the method itself has been removed or renamed. (Many of these were fixed by refactoring tests to use proxyquire for the main server module, but some might persist if method names changed).

2.  **AssertionError: Regex mismatch or other assertion failures**
    *   Example: Specific error messages would vary, e.g., `AssertionError: expected 'some string' to match /pattern/`.
    *   Likely Cause: Core logic changes in the application that are not reflected in test assertions, or incorrect test case expectations. (e.g., `test/server/security/input.test.js`, `test/server/security/session.test.js`, `test/server/validation.unit.test.js`).

3.  **TypeError: Cannot read properties of undefined/null**
    *   Example: `TypeError: Cannot read properties of undefined (reading 'someProperty')` or `TypeError: Cannot read properties of null (reading 'someFunction')`
    *   Likely Cause: Often occurs in `beforeEach` hooks where setup is incomplete, or in test logic where an object is unexpectedly null or undefined. Issues with asynchronous operations or incorrect mocking can lead to this. (e.g., `TypeError: Cannot set properties of null (setting 'id')` in `socket.unit.test.js`, `validation.unit.test.js`, `validation/cardPlayValidation.unit.test.js`). `TypeError: logStub.restore is not a function` in various security tests if `logStub` isn't a Sinon stub. `TypeError: getIo(...).emit is not a function` in `phases/play.unit.test.js`.

4.  **ReferenceError: Variable not defined**
    *   Example: `ReferenceError: document is not defined` (specifically for tests that might be trying to run client-side logic in a Node.js environment without proper setup like jsdom, e.g., `services/uiIntegration.unit.test.js`).
    *   Example: `ReferenceError: logStub is not defined` (e.g., `reconnection.integration.test.js` in an `afterEach` hook if `logStub` wasn't initialized in its scope).
    *   Likely Cause: Missing imports, incorrect test environment setup for specific code, or typos.

## Next Steps for These Failures:

- Once the critical environment instability and `proxyquire` issues (detailed in `ENVIRONMENT_INSTABILITY.md`) are resolved, these tests need to be re-run and analyzed individually.
- Each failure will require specific debugging to pinpoint the root cause in the application code or the test logic.
