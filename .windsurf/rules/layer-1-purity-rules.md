---
trigger: always_on
---

# Core Layer 1 Purity Principles
- Ensure Layer 1 modules are pure and stateless.
- Guarantee that the same input always produces the same output (deterministic).
- Eliminate all side effects.
- Prohibit imports from higher layers (e.g., Layer 2, 3, 5).
- Document all exported functions with JSDoc, including types.

# Function Requirements
- Do not modify input parameters or variables outside the function's scope.
- Implement input validation for all public functions.
- Forbid reliance on external state or non-deterministic functions like `Date.now()` or `Math.random()`.

# Forbidden Operations
- Prohibit all I/O operations (e.g., database, file system, network requests).
- Prohibit `process` operations (e.g., `process.env`, `process.exit`).
- Disallow direct `console` logging; use the designated project logger.
- Avoid direct use of Date/Time functions; pass them as parameters if needed.

# State & Data Handling
- Treat all inputs as immutable, returning new data structures instead of modifying existing ones.
- Forbid module-level mutable state; all necessary state must be passed as parameters.
- Permit only primitive values, plain objects/arrays, and other pure functions as inputs/outputs.

# Error Handling
- Throw specific, custom error types from `src/game/logic/errors.js`.
- Do not handle errors within Layer 1; let them bubble up to higher layers.
- Utilize predefined error types for specific failures (e.g., `ValidationError`, `InvalidPhaseError`).

# Testing Requirements
- Mandate 95%+ unit test coverage for all Layer 1 modules.
- Ensure tests cover all error conditions, edge cases, and boundary conditions.
- Isolate tests by mocking all non-Layer 1 functionality and external dependencies.

# Code & File Organization
- Use named exports at the bottom of the file.
- Export only the functions and constants needed by other modules.
- Core Logic: `src/game/logic/`
- Game Phases: `src/game/phases/`
- Utilities: `src/utils/`
- Constants: `src/config/constants.js`