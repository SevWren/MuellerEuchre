# `docs/The_Dealer_Discard_Mechanism.md`

# The Dealer Discard Mechanism

## 1. Core Concept: "Picking It Up"

The dealer discard is a special, mandatory action in Euchre that occurs **only** when a player "orders up" the dealer during the first round of bidding. This action is the literal fulfillment of the "pick it up" command.

-   **Trigger:** A successful "order up" bid in `GAME_PHASES.ORDER_UP_ROUND1`.
-   **Who Acts:** Only the player who is the current `dealer`.
-   **The Action:** The dealer adds the face-up `turnCard` to their hand, temporarily holding six cards. They must then choose and discard one card face-down to return their hand to the legal size of five.

This process is a unique and critical state transition in the game's lifecycle.

---

## 2. The Discard Lifecycle and State Transitions

The discard mechanism is managed by a distinct, short-lived game phase.

### Step 1: Transition to `DEALER_DISCARD`

After a player successfully orders up the dealer in `handleOrderUpDecision()` (`src/game/phases/biddingPhase.js`), the following state changes occur to initiate the discard phase:

1.  The `gameState.trumpSuit` is set to the suit of the `turnCard`.
2.  The `gameState.gamePhase` transitions to `GAME_PHASES.DEALER_DISCARD`.
3.  The `gameState.currentPlayer` is set to the `dealer`'s role.
4.  Crucially, the `turnCard` object remains in the `gameState` to represent the card the dealer is about to pick up. The dealer's hand still contains only five cards at this point in the state object.

### Step 2: The Dealer's Decision

The server now waits for the dealer to send their discard decision. This action is handled by the socket handler for `GAME_EVENTS.ACTION_DEALER_DISCARD` (`src/socket/handlers/biddingHandlers.js`).

### Step 3: Validation and Execution

When the dealer's decision is received, the server validates and processes it using the dedicated functions.

#### Validation (`src/game/logic/validation-core.js`)

The `validateDealerDiscard()` function is the gatekeeper that enforces the rules of this specific action. It is a pure function that checks for several conditions:

1.  Is the game in the `DEALER_DISCARD` phase?
2.  Is the player making the action actually the `dealer`?
3.  Is the card being discarded actually in the dealer's hand? (This check implicitly handles the addition of the `turnCard` on the client or in the handler logic).
4.  **The Critical Constraint:** Is the card being discarded the same as the `turnCard`? The dealer **CANNOT** discard the card they were just forced to pick up.

```javascript
// src/game/logic/validation-core.js

/**
 * Validates if a dealer's discard is legal.
 * @param {GameState} gameState - The current game state.
 * @param {string} playerRole - The role of the player discarding (must be the dealer).
 * @param {Card} cardToDiscard - The card to be discarded.
 * @param {Card[]} playerHand - The dealer's 6-card hand (including the turnCard).
 */
function validateDealerDiscard(gameState, playerRole, cardToDiscard, playerHand) {
  // ... initial phase and role checks ...

  // Prevent discarding the turn card
  if (gameState.turnCard && cardToDiscard.id === gameState.turnCard.id) {
    throw new InvalidDiscardError('Cannot discard the turn card (upcard).');
  }
  return true;
}
```

#### State Update (`src/game/phases/biddingPhase.js`)

Once the discard is validated, the `handleDealerDiscard()` function (located in `biddingPhase.js`) calculates the next game state.

1.  The `turnCard` is conceptually added to the dealer's hand.
2.  The `cardToDiscard` is removed from the dealer's hand.
3.  The `gameState.turnCard` property is set to `null`, as the card is now fully integrated into play.
4.  The `gameState.gamePhase` transitions to the next logical step, which is `GAME_PHASES.GOING_ALONE_DECISION`.
5.  The `gameState.currentPlayer` is set to the role of the player who ordered up the dealer, as they are now the "maker" and must decide whether to go alone.

---

## 3. Implications for Development and Debugging

1.  **Temporary 6-Card Hand:** The dealer's hand briefly contains six cards. Any logic that strictly validates for a 5-card hand must be aware of this temporary exception during the `DEALER_DISCARD` phase. The test file `test/game/logic/validation.unit.test.js` includes a check that logs a warning if the dealer's hand *doesn't* have 6 cards at the moment of validation.
2.  **`turnCard` is Immutable:** The rule against discarding the `turnCard` is a core part of Euchre. A bug where this is allowed would be a critical failure of the `validateDealerDiscard` function. When debugging a discard issue, this should be the first rule to check.
3.  **Source of Truth:**
    *   **Is this discard allowed?** This is answered by `validateDealerDiscard()` in `validation-core.js`.
    *   **What happens after a legal discard?** This is answered by `handleDealerDiscard()` in `biddingPhase.js`.
4.  **File Naming Anomaly:** It is important to note that the `handleDealerDiscard` logic, despite relating to the `DEALER_DISCARD` phase, is located within the `biddingPhase.js` module. This is a structural choice in the codebase that developers and the LLM must be aware of to locate the correct source file.