# deck.js cardUtil.js Proposed File Structure and Function Distribution

This document outlines a refactoring plan to enhance the modularity and clarity of our utility functions related to card and deck management. The core principle is to enforce a strict **separation of concerns**:

*   **`src/utils/deck.js`**: Will solely manage the *collection* of cards (the deck itself).
*   **`src/utils/cardUtils.js`**: Will provide all logic related to *individual card properties*, game-specific card evaluation (like ranking and bower identification), and hand-level operations that depend on individual card rules.

### Rationale for This Refactoring

1.  **Clearer Responsibilities (Modularity):**
    *   Currently, `src/utils/deck.js` is a mixed bag, handling both the physical deck (shuffling, creating) and complex game rules tied to individual cards (Bowers, ranking, following suit). This blurs its purpose.
    *   By separating, `deck.js` becomes a simple "deck factory and manipulator," while `cardUtils.js` centralizes the intricate rules of Euchre related to card identity and power.

2.  **Enhanced Layer 1 Purity:**
    *   Both `deck.js` and `cardUtils.js` are designated as Layer 1 modules (pure functions with no side effects). This refactoring makes it easier to verify and maintain this purity, as each module's scope is narrowed.

3.  **Improved Readability and Discoverability:**
    *   Developers will intuitively know where to find functions: "Need to shuffle cards? `deck.js`. Need to know if a card is a Left Bower or compare its rank? `cardUtils.js`." This reduces cognitive load and onboarding time.

4.  **Reduced Maintenance Overhead and Bug Risk:**
    *   Changes to card ranking rules (e.g., adjusting Bower values) will be contained within `cardUtils.js` and its tests, without affecting the core `deck.js` functionality.
    *   Similarly, changes to deck generation won't impact card evaluation logic. This reduces the blast radius of changes and makes debugging easier.

5.  **Better Test Isolation:**
    *   Test files can now explicitly mock `deck.js` when testing only card logic, or mock `cardUtils.js` when testing only deck mechanics, leading to more precise and robust unit tests.

### Proposed Function Distribution

---

#### `src/utils/deck.js` (Post-Refactoring)

*   **Purpose:** Manages the creation and randomization of a Euchre deck.
*   **Exported Functions:**
    *   `createDeck()`: Generates a new, ordered 24-card Euchre deck.
    *   `shuffleDeck(deck)`: Randomizes the order of cards in a given deck (returns a new array).
*   **Removal:** The `isJack` internal helper will be removed as it is no longer used here. Any re-exports of functions moving to `cardUtils.js` will also be removed.

---

#### `src/utils/cardUtils.js` (Post-Refactoring)

*   **Purpose:** Provides all logic pertaining to individual card properties, their evaluation within the game context (e.g., trump, led suit), and operations on a collection of cards (like a hand) that rely on these individual card rules. This module will become the authoritative source for Euchre card rules.
*   **Exported Functions (existing and newly moved):**

    1.  **Core Card Identification & Properties:**
        *   `normalizeSuit(suit)`: Standardizes suit strings to canonical constants.
        *   `getPartnerSuit(suit)`: Identifies the suit of the same color (for Bowers).
        *   `getSuitColor(suit)`: Determines if a suit is red or black. (***Moved from `deck.js`***)
        *   `areSameColor(suitA, suitB)`: Compares the colors of two suits. (***Moved from `deck.js`***)
        *   `isRightBower(card, trumpSuit)`: Determines if a card is the Right Bower.
        *   `isLeftBower(card, trumpSuit)`: Determines if a card is the Left Bower.
        *   `getEffectiveSuit(card, trumpSuit)`: Determines a card's effective suit (handling Left Bower identity shift).

    2.  **Card Evaluation & Ranking:**
        *   `getCardRank(card, trumpSuit, ledSuit)`: Assigns a numerical rank to a card based on current game context. (***Moved from `deck.js`***)

    3.  **Hand Management (Rules-Based):**
        *   `sortHand(hand, trumpSuit)`: Sorts a player's hand according to Euchre rules. (***Moved from `deck.js`***)

    4.  **Card Formatting:**
        *   `cardToId(card)`: Converts a card object to its compact ID string representation. (***Moved from `deck.js`***)

*   **Internal Constants/Maps (to be moved with functions):**
    *   `SUIT_CONSTANT_TO_NAME_MAP`
    *   `SUIT_TO_CHAR_MAP`
    *   `VALUE_TO_CHAR_MAP`
    *   `VALUE_TO_NAME_MAP`
    *   `SUIT_TO_NAME_MAP`
    *   `valueToNameMap` (internal to `getCardRank`)

---

This refactoring will create two highly cohesive and loosely coupled modules, significantly improving the overall architecture and maintainability of the Euchre game logic.
