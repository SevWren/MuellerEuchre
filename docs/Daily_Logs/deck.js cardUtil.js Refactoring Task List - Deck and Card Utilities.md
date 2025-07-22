# Refactoring Task List - Deck and Card Utilities

This document provides a step-by-step task list to implement the refactoring of `src/utils/deck.js` and `src/utils/cardUtils.js`. Follow these steps meticulously, running tests after each major phase to ensure correctness.

**General Precaution:** Ensure all unit tests are passing before starting this refactor.

### Phase 1: Core Code Movement and Initial `cardUtils.js` Creation

The goal of this phase is to move functions and their dependencies to the new `cardUtils.js` and clean up `deck.js`.

-   [ ] **Task 1.1: Create `src/utils/cardUtils.js`**
    *   Create a new file: `MuellerEuchre-Windsurf/src/utils/cardUtils.js`.
    *   Add initial JSDoc and `module.exports` structure.

-   [ ] **Task 1.2: Move Functions and Internal Constants to `src/utils/cardUtils.js`**
    *   **From `src/utils/deck.js` to `src/utils/cardUtils.js`:**
        *   `getSuitColor(suit)`
        *   `areSameColor(suitA, suitB)`
        *   `cardToId(card)`
        *   `getCardRank(card, trumpSuit, ledSuit)`
        *   `sortHand(hand, trumpSuit)`
        *   Along with their *internal helper maps* used only by them (`SUIT_CONSTANT_TO_NAME_MAP`, `SUIT_TO_CHAR_MAP`, `VALUE_TO_CHAR_MAP`, `VALUE_TO_NAME_MAP`, `SUIT_TO_NAME_MAP`, `valueToNameMap`).
    *   **Ensure existing functions in `cardUtils.js` are present:**
        *   `normalizeSuit(suit)`
        *   `getPartnerSuit(suit)`
        *   `isRightBower(card, trumpSuit)`
        *   `isLeftBower(card, trumpSuit)`
        *   `getEffectiveSuit(card, trumpSuit)`

-   [ ] **Task 1.3: Update `src/utils/cardUtils.js` Imports**
    *   In `src/utils/cardUtils.js`, ensure the following imports are correct:
        *   `import { CARD_SUITS, CARD_VALUES, CARD_RANKS } from '../config/constants.js';`
        *   `import { InvalidCardError } from '../game/logic/validation-errors.js';`
        *   `import logger from './logger.js';` (if `getCardRank` or `sortHand`'s internal logging uses it).

-   [ ] **Task 1.4: Clean Up `src/utils/deck.js`**
    *   In `src/utils/deck.js`:
        *   Remove the moved functions: `getSuitColor`, `areSameColor`, `cardToId`, `getCardRank`, `sortHand`.
        *   Remove the unused internal helper: `isJack(card)`.
        *   Remove imports that are no longer needed (e.g., `InvalidCardError`, and the re-imported `normalizeSuit`, `getPartnerSuit`, `isRightBower`, `isLeftBower`, `getEffectiveSuit` from `cardUtils.js`).
        *   Ensure `src/utils/deck.js` only exports `createDeck` and `shuffleDeck`.
        *   Update the JSDoc and module description to reflect its new, focused purpose.

-   [ ] **Task 1.5: Run Basic Tests for Quick Feedback**
    *   Run linting: `npm run lint`
    *   Run `deck.unit.test.js` (it will now fail, this is expected): `node --test test/utils/deck.unit.test.js`
    *   Run `cardUtils.js` tests if they exist (they likely don't yet for the new functions, but confirm existing pass).

### Phase 2: Update Consumer Modules (Source Code)

Update import paths in source files that now reference functions moved to `cardUtils.js`.

-   [ ] **`src/game/logic/validation-core.js`**
    *   **Old Imports to Change:** `import { isLeftBower, areSameColor } from "../../utils/deck.js";`
    *   **New Imports Required:** `import { isLeftBower, areSameColor } from "../../utils/cardUtils.js";`
    *   **Action:** Modify the import statement.

-   [ ] **`src/game/phases/biddingPhase.js`**
    *   **Old Imports to Change:** `import { cardToId } from "../../utils/deck.js";`
    *   **New Imports Required:** `import { cardToId } from "../../utils/cardUtils.js";`
    *   **Action:** Modify the import statement.

-   [ ] **`src/game/phases/playingPhase.js`**
    *   **Old Imports to Change:** `import { getCardRank } from "../../utils/deck.js";`
    *   **New Imports Required:** `import { getCardRank } from "../../utils/cardUtils.js";`
    *   **Action:** Modify the import statement.

-   [ ] **`src/game/phases/startNewHandPhase.js`**
    *   **Old Imports to Change:** `import { createDeck, shuffleDeck, cardToId } from "../../utils/deck.js";`
    *   **New Imports Required:**
        *   `import { createDeck, shuffleDeck } from "../../utils/deck.js";` (remains for deck mechanics)
        *   `import { cardToId } from "../../utils/cardUtils.js";` (new import for card formatting)
    *   **Action:** Split the import statement into two distinct imports.

-   [ ] **Run Source Tests:** After updating source files, run specific module tests to catch errors early.
    *   `node --test src/game/logic/validation-core.js` (and its tests)
    *   `node --test src/game/phases/biddingPhase.js` (and its tests)
    *   `node --test src/game/phases/playingPhase.js` (and its tests)
    *   `node --test src/game/phases/startNewHandPhase.js` (and its tests)

### Phase 3: Update Consumer Modules (Test and Mock Files)

This is the most involved phase, particularly for test files that used `deck.js` for varied purposes.

-   [ ] **`test/__mocks__/utils/deck.js`**
    *   **Current Role:** Mocks the *entire* original `src/utils/deck.js`.
    *   **Action:**
        *   **Refactor:** This mock file should now *only* mock `createDeck` and `shuffleDeck` to align with the new `src/utils/deck.js`.
        *   **Move Mocks:** Create a new mock file `test/__mocks__/utils/cardUtils.js` and move the mock implementations for `isRightBower`, `isLeftBower`, `getCardRank`, `sortHand`, `areSameColor`, `normalizeSuit`, `cardToId` into this new file. Ensure they are exported correctly (e.g., using `mock.fn()` or similar `node:test` mocking).

-   [ ] **`test/game/logic/aiLogic.unit.test.js`**
    *   **Old Imports to Change:** `import { isLeftBower } from '../../utils/cardUtils.js';` (already uses `cardUtils.js`, but this import might have been originally indirect via `deck.js`).
    *   **Action:** Verify its direct import of `isLeftBower` from `cardUtils.js` is correct, or update if it was relying on `deck.js` re-exports.

-   [ ] **`test/game/logic/validatePlay.edge.unit.test.js`**
    *   **Old Imports to Change:** `import { isLeftBower } from '../../../src/utils/deck.js';`
    *   **New Imports Required:** `import { isLeftBower } from '../../../src/utils/cardUtils.js';`
    *   **Action:** Update the import statement.

-   [ ] **`test/game/logic/validatePlay.unit.test.js`**
    *   **Old Imports to Change:**
        *   `import * as deckUtils from '../../../src/utils/deck.js';` (This import might be unused or indirectly referenced due to local mocks).
        *   Local mock implementations for `isLeftBower` and `getEffectiveSuit`.
    *   **New Imports Required:** Ensure `isLeftBower` and `getEffectiveSuit` are either correctly imported from `src/utils/cardUtils.js` for testing purposes, or that their local mocks are still necessary and correctly reflect the logic in `src/utils/cardUtils.js`. Remove the `deckUtils` import if it's no longer needed.
    *   **Action:** Carefully review and adjust imports/local mocks.

-   [ ] **`test/game/phases/dealer_rotation_fix.unit.test.js`**
    *   **Current Usage:** `import { createStartNewHand } from './__mocks__/startNewHandPhase.js';`
    *   **Action:** No direct changes to this file, but its mock dependency (`test/game/phases/__mocks__/startNewHandPhase.js`) will need to be updated (see below).

-   [ ] **`test/game/phases/lobbyPhase.unit.test.js`**
    *   **Current Usage:** Calls `startNewHand` from `src/game/phases/startNewHandPhase.js`.
    *   **Action:** No direct changes required in this test file, as it consumes `startNewHandPhase.js` (which will be updated in Phase 2).

-   [ ] **`test/game/phases/playingPhase.unit.test.js`**
    *   **Current Imports:** Imports `createDeck`, `shuffleDeck` from `src/utils/deck.js`. It also imports the real `playingPhase.js` (which will now consume `cardUtils.js`).
    *   **Action:** The `createDeck` and `shuffleDeck` imports remain valid from `src/utils/deck.js`. No changes necessary unless its own `mockDeck.getCardRank` needs re-pointing for its test context.

-   [ ] **`test/game/phases/startNewHandPhase.unit.test.js`**
    *   **Old Imports to Change:** `import { createDeck, shuffleDeck, cardToId } from "../../utils/deck.js";`
    *   **New Imports Required:**
        *   `import { createDeck, shuffleDeck } from "../../utils/deck.js";`
        *   `import { cardToId } from "../../utils/cardUtils.js";`
    *   **Action:** Split the import statement.

-   [ ] **`test/game/phases/__mocks__/startNewHandPhase.js`**
    *   **Current Imports:** `import * as deckUtils from '../../../../src/utils/deck.js';`
    *   **Action:**
        *   Update `deckUtils` import to correctly point to `src/utils/deck.js` for `createDeck` and `shuffleDeck`.
        *   If the mock requires `cardToId` or other `cardUtils` functions, add explicit imports for them from `src/utils/cardUtils.js` OR provide mock implementations within this mock file.

-   [ ] **`test/helpers/test-helpers.js`**
    *   **Current Usage:** The internal `createDeck()` helper. `getCard()` uses `cardMap` (populated from `createDeck()`).
    *   **Action:** No changes required for the *internal* `createDeck()` or `getCard()`, as these are self-contained helpers for generating test data. However, ensure that any *explicit* calls to moved functions (like `cardToId` or `getCardRank` if used directly in test helpers) are updated.

-   [ ] **`test/socket/handlers/biddingHandlers.unit.test.js`**
    *   **Current Imports:** Uses `handleOrderUpDecision`, `handleCallTrumpDecision` from `src/game/phases/biddingPhase.js`.
    *   **Action:** No direct import changes, but verify tests continue to pass as `biddingPhase.js`'s internal imports will have shifted.

-   [ ] **`test/socket/handlers/playingHandlers.unit.test.js`**
    *   **Current Imports:** Uses `handlePlayCard` from `src/game/phases/playingPhase.js`.
    *   **Action:** No direct import changes, but verify tests continue to pass as `playingPhase.js`'s internal imports will have shifted.

-   [ ] **`test/utils/deck.unit.test.js`**
    *   **Current Role:** This file tests `src/utils/deck.js`.
    *   **Action (Major Overhaul):**
        *   **Move Tests:** Create a new test file: `MuellerEuchre-Windsurf/test/utils/cardUtils.unit.test.js`.
        *   Move all tests related to `areSameColor`, `cardToId`, `isRightBower`, `isLeftBower`, `getCardRank`, `sortHand` from `test/utils/deck.unit.test.js` to the new `test/utils/cardUtils.unit.test.js`.
        *   **Update `deck.unit.test.js`:** Modify `test/utils/deck.unit.test.js` to *only* test the `createDeck` and `shuffleDeck` functions, ensuring it uses the updated `src/utils/deck.js` imports.

### Phase 4: Verification and Cleanup

-   [ ] **Task 4.1: Run All Tests**
    *   Execute the entire test suite: `npm test` or `node --test` (if using native runner).
    *   Address any failing tests. Prioritize `MODULE_NOT_FOUND` errors (import path issues) first.

-   [ ] **Task 4.2: Comprehensive Code Review**
    *   Review `src/utils/deck.js` to confirm it strictly adheres to its new, focused role.
    *   Review `src/utils/cardUtils.js` to confirm it contains all card-related logic and its dependencies are correctly imported.
    *   Review affected source and test files to ensure imports are correct and logic is sound.

-   [ ] **Task 4.3: Delete Redundant Mocks/Tests**
    *   If any mock files or test files became entirely redundant (e.g., if a mock was for a function that moved and is now mocked in its new location), delete them. (e.g., `test/utils/deck.unit.test.js` will be heavily modified, not deleted, but `test/__mocks__/utils/deck.js` should be much smaller).

-   [ ] **Task 4.4: Update JSDoc and Project Documentation**
    *   Update JSDoc in `src/utils/deck.js` and `src/utils/cardUtils.js`.
    *   Update any other internal documentation that refers to the old structure of `deck.js`.

This detailed plan provides a clear path to implement the refactoring, minimizing disruption and ensuring the quality and correctness of the codebase.