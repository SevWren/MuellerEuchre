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

# Key Constants

## Core Game Constants
- `SUITS`: Enumeration of card suits (Hearts, Diamonds, Clubs, Spades)
- `VALUES`: Array of card values in ascending order (9-A)
- `CARD_RANKS`: Numerical values representing card strength in Euchre
- `WINNING_SCORE`: Score needed to win the game (default: 10)

## Game Flow
- `GAME_PHASES`: Different states of the game (LOBBY, DEALING, PLAYING, etc.)
- `TEAMS`: Team identifiers (NS for North/South, EW for East/West)
- `PLAYER_ROLES`: Standard Euchre seating positions (south, west, north, east)

## Network & Storage
- `GAME_EVENTS`: Socket.IO event names for game communication
- `STORAGE_KEYS`: Local storage keys for persisting game state
- `DEBUG_LEVELS`: Logging levels for the application

# Usage Guidelines

## Importing Constants
```javascript
import { 
  SUITS, 
  VALUES, 
  GAME_PHASES,
  // ... other constants as needed 
} from '@/config/constants';
```

## Best Practices
1. **Always use these constants** instead of hardcoded values
2. **Never modify constants** at runtime
3. **Import only what you need** to keep bundles small
4. **Use enum values** for type safety where applicable
5. **Refer to JSDoc** for detailed usage of each constant

### Type Safety
All constants are marked as `@readonly` and include TypeScript-style type annotations for better IDE support and type checking.

### Examples
```javascript
// Good
if (suit === SUITS.HEARTS) { /* ... */ }

// Bad - avoid magic strings
if (suit === 'hearts') { /* ... */ }
```

## Maintenance
- Update JSDoc when adding new constants
- Keep related constants grouped together
- Ensure enum values are properly documented with `@property`
- Add examples for complex constants
- Mark all constants as `@readonly`