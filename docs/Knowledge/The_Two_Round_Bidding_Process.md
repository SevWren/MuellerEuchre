# The Two-Round Bidding Process and Constraints

## 1. Core Concept: Establishing Trump

Bidding is the crucial phase in Euchre that determines three critical pieces of game state for the upcoming hand:

1.  The **Trump Suit**: The suit that will outrank all others.
2.  The **Maker Team**: The team that chooses the trump suit and is obligated to win at least three of the five tricks.
3.  The **`turnCard`**: A single card turned face-up after the deal, which serves as the catalyst for the entire bidding process.

To manage this, the game uses a structured, two-round bidding system. The rules and available actions are different in each round, making the `gamePhase` property the most important piece of state for understanding bidding logic.

---

## 2. The Bidding Lifecycle

The bidding process begins immediately after a new hand is dealt and proceeds clockwise, starting with the player to the left of the dealer.

### Step 1: The `turnCard` (`startNewHandPhase.js`)

At the start of a hand, a single card is turned face-up from the top of the remaining deck. This is the `turnCard`. The suit of this card is the only suit that can be chosen as trump during the first round of bidding.

### Step 2: Round 1 Bidding (`GAME_PHASES.ORDER_UP_ROUND1`)

During this phase, each player, in turn, must make a choice regarding the `turnCard`.

*   **Available Actions:**
    *   **"Order Up"**: The player accepts the `turnCard`'s suit as trump for their team. This action immediately concludes the first round of bidding. The game transitions to the `DEALER_DISCARD` phase, where the dealer must pick up the `turnCard` and discard another card. Following the discard, the game enters the `GOING_ALONE_DECISION` phase. The game transitions to the `DEALER_DISCARD` phase, where the dealer must pick up the `turnCard` and discard another card. Following the discard, the game enters the `GOING_ALONE_DECISION` phase.
    *   **"Pass"**: The player declines to make the `turnCard`'s suit trump. The decision then passes to the next player in clockwise order.

*   **Phase Logic (`src/game/phases/biddingPhase.js`)**: This round is governed by the `handleOrderUpDecision()` function.

*   **Transition Condition**: If all four players pass, the `turnCard` is turned face-down, and the game state transitions to `GAME_PHASES.ORDER_UP_ROUND2`.

### Step 3: Round 2 Bidding (`GAME_PHASES.ORDER_UP_ROUND2`)

This round only occurs if everyone passed in Round 1. The rules now change.

*   **Available Actions:**
    *   **"Call Trump"**: The player may choose *any suit* as trump, **with one critical exception**.
    *   **"Pass"**: The player declines to name a trump suit. The decision passes to the next player.

*   **The Critical Constraint**: A player **CANNOT** call the suit of the original `turnCard` that was turned down at the end of Round 1. For example, if the Ace of Spades was the `turnCard` and was turned down, no player may call Spades as trump in Round 2.

*   **Phase Logic (`src/game/phases/biddingPhase.js`)**: This round is governed by the `handleCallTrumpDecision()` function.

*   **Transition Condition**: Bidding ends as soon as one player calls a suit. If all four players pass again, it results in a **misdeal**, and the game state transitions back to `GAME_PHASES.DEALING` for a new hand with a new dealer.

---

## 3. The Programmatic Implementation

The bidding logic is cleanly separated into two distinct concerns: validation (the rules) and phase logic (the consequences).

### State Management

The entire bidding process is a state machine driven by the `gamePhase` property in the `gameState` object. The `turnCard` is a critical piece of state history that must be preserved until Round 2 is complete.

-   `GAME_PHASES.ORDER_UP_ROUND1`: The state during the first round.
-   `GAME_PHASES.ORDER_UP_ROUND2`: The state during the second round.

### Validation Logic (`src/game/logic/validation-core.js`)

The `validateBid()` function is the gatekeeper for all bidding actions. It is a pure function that takes the `gameState` and a proposed bid and throws a specific error if the bid violates the rules.

```javascript
// src/game/logic/validation-core.js

/**
 * Validates if a bid is legal according to Euchre rules.
 * @param {GameState} gameState - The current game state.
 * @param {string} playerRole - The role of the player making the bid.
 * @param {string} decision - The bid decision ('orderUp', 'pass', 'callTrump').
 * @param {string} [suit] - The suit being called.
 */
function validateBid(gameState, playerRole, decision, suit = null) {
  // Checks for:
  // 1. Correct player's turn.
  // 2. Correct game phase.
  // 3. In Round 1, only allows 'orderUp' or 'pass'.
  // 4. In Round 2, only allows 'callTrump' or 'pass'.
  // 5. In Round 2, explicitly checks if `suit` is the same as the `turnCard.suit` and throws an InvalidBidError if it is.
}
```

### Game Phase Logic (`src/game/phases/biddingPhase.js`)

This module contains the pure functions that are executed *after* a bid has been validated. These functions calculate the *next* game state based on the outcome of the bid.

```javascript
// src/game/phases/biddingPhase.js

/**
 * Processes a player's decision in the first round of bidding.
 */
function handleOrderUpDecision(currentGameState, playerRole, wantsToOrderUp) {
  // Returns a new gameState object with:
  // - Bidding ended and trump set (if ordered up).
  // - Turn advanced to the next player (if passed).
  // - Phase advanced to ORDER_UP_ROUND2 (if all passed).
}

/**
 * Processes a player's decision in the second round of bidding.
 */
function handleCallTrumpDecision(currentGameState, playerRole, wantsToCall, suitCalled) {
  // Returns a new gameState object with:
  // - Bidding ended and trump set (if called).
  // - Turn advanced to the next player (if passed).
  // - Phase advanced to DEALING (if all passed - a misdeal).
}
```

---

## 4. Implications for Development and Debugging

A clear understanding of this two-round structure is essential for anyone working on the codebase.

1.  **Phase is Paramount:** The `gamePhase` property is the single most important factor in determining the validity of a bid. When debugging, the first step should always be to check the `gamePhase` to understand which set of rules applies.
2.  **The `turnCard` as State History:** The `turnCard` is not just a card; it's a piece of state that constrains the actions available in Round 2. A bug where a player illegally calls the turned-down suit is likely an issue in how `validateBid()` is checking against `gameState.turnCard.suit`.
3.  **Separation of Concerns:** Remember the roles of the two key files:
    *   **Is this bid allowed?** This question is answered by `src/game/logic/validation-core.js`.
    *   **What happens after a legal bid?** This question is answered by `src/game/phases/biddingPhase.js`.