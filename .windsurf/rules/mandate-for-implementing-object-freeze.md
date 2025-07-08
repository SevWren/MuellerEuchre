---
trigger: manual
---

# Mandate for Implementing `Object.freeze()` in `src/config/constants.js`

# Core Principle: Achieve True Immutability
- The primary goal is to prevent any runtime modification of shared constants, upholding the Layer 1 mandate of purity and statelessness.
- Recognize that `const` alone is insufficient; it prevents reassignment but does not make an object's properties immutable.
- Use `Object.freeze()` to make object literals truly read-only, preventing accidental mutations that can cause difficult-to-trace bugs.

# Implementation Strategy & Syntax
- Apply `Object.freeze()` directly to every exported object literal at the point of its declaration.
- **Target Objects for Freezing:** `SUITS`, `CARD_RANKS`, `DEBUG_LEVELS`, `STORAGE_KEYS`, `GAME_EVENTS`, `GAME_PHASES`, `TEAMS`.
- **Exemptions:** Primitives (`WINNING_SCORE`) and simple arrays (`VALUES`) do not require freezing.
- **Correct Syntax:** Wrap the object literal directly within `Object.freeze()`.
    - **Before:** `export const SUITS = { HEARTS: "hearts", ... };`
    - **After:** `export const SUITS = Object.freeze({ HEARTS: "hearts", ... });`

# Architectural Justification & Alignment
- This freezing operation is a one-time action that occurs when the `constants.js` module is first loaded by the Node.js runtime.
- It is considered part of the application's initialization setup, not a runtime side effect of a pure game logic function.
- This practice establishes a secure, immutable foundation, enabling other Layer 1 functions to remain pure without defensive copying.

# Prohibited Actions & Anti-Patterns
- **NEVER** apply `Object.freeze()` to function arguments, especially a `gameState` object, within a Layer 1 function.
- Freezing an input argument is a direct mutation and a side effect, which is a strict violation of the Layer 1 architectural mandate.
- The sole responsibility for freezing constants lies within the `constants.js` file itself, at the moment of declaration.