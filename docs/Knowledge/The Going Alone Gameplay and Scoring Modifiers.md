# The "Going Alone" Gameplay and Scoring Modifiers

## 1. Core Concept: High-Risk, High-Reward

"Going Alone" is a strategic decision in Euchre where the player who made trump (the "maker") chooses to play the hand without their partner. This is a high-risk, high-reward maneuver that fundamentally alters both the **flow of gameplay** and the **rules for scoring** for that hand.

Because this feature impacts multiple, distinct parts of the application—player turn rotation, game state management, and score calculation—understanding its full lifecycle is critical to prevent bugs.

---

## 2. The Lifecycle of a "Go Alone" Hand

### Step 1: The Decision (`goAlonePhase.js`)

*   **Who Can Decide?** Only the player who successfully ordered up or called trump (the "maker") has the option to go alone.
*   **When?** The decision is made immediately after the bidding phase is resolved (and after the dealer discards, if applicable). This occurs during the `GOING_ALONE_DECISION` game phase.
*   **State Change:** The player's decision (a `boolean` value) is received by the server. The `handleGoAloneDecision` function is responsible for updating the game state with the outcome.

### Step 2: State Management (`gameState` object)

To correctly manage a "go alone" hand, the following flags must be set in the `gameState` object:

*   `goingAlone: boolean`: Set to `true` if the maker chose to go alone.
*   `playerGoingAlone: string`: The role of the player who is going alone (e.g., `PLAYER_SOUTH`).
*   `partnerSittingOut: string`: The role of the maker's partner, who will be inactive for the hand. This is crucial for the turn-skipping logic.

These flags are set by `handleGoAloneDecision` and are read by modules in later phases.

### Step 3: Gameplay Modification (`playingPhase.js` & `utils/players.js`)

The most significant change to gameplay is the modification of turn order. The partner of the lone player does not participate in the hand.

*   **The Rule:** When determining the next player to play, the logic must check if the next player in the standard rotation is the `partnerSittingOut`. If they are, that player must be skipped, and the turn passes to the following player.
*   **Implementation:** This logic is handled by the `getNextPlayer` utility in `src/utils/players.js`. The function accepts the `goingAlone` and `partnerSittingOut` flags and contains the necessary logic to perform the skip. The `handlePlayCard` function in `playingPhase.js` relies on `getNextPlayer` to correctly advance the `currentPlayer`.

**Example Turn Order:**
*   **Standard Order:** South → West → North → East
*   **Scenario:** South goes alone. North is their partner and sits out.
*   **Modified Order:** South → West → **(skip North)** → East → South...

### Step 4: Scoring Modification (`scoringPhase.js`)

The scoring rules for a "go alone" hand are different from a standard hand, providing a bonus for taking all five tricks.

*   **The Rule:** The `calculateAndApplyScore` function in `scoringPhase.js` must check the `goingAlone` flag and apply the following special scoring matrix *only if the maker's team won the hand*:

| Tricks Taken by Lone Player | Points Awarded to Maker's Team | Name |
| :--- | :--- | :--- |
| 3 or 4 | **1 point** | Made Bid |
| 5 (all tricks) | **4 points** | Loner March |

*   **Euchre Rule:** If the lone player fails to take at least 3 tricks, their team is "euchred." The opposing team is awarded **2 points**, just as in a standard hand. There is no extra penalty for the lone player or bonus for the opponents.

---

## 4. Implications for Game Logic

*   **`goAlonePhase.js`:** This module is the entry point. It must correctly validate that only the maker can make the decision and must set all three required `gameState` flags (`goingAlone`, `playerGoingAlone`, `partnerSittingOut`).

*   **`utils/players.js`:** The `getNextPlayer` function is critical. It must be aware of the "go alone" state to ensure turn order is handled correctly throughout the five tricks of the `playingPhase`.

*   **`scoringPhase.js`:** This module is the exit point. It must read the `goingAlone` flag and the number of tricks taken to apply the correct point value (1, 4, or 2 for a euchre).

*   **`aiLogic.js`:** A sophisticated AI must weigh the potential for 4 points against the increased risk of being euchred. It needs to evaluate its hand strength to determine if it can reliably take 3 or, ideally, 5 tricks without its partner's help. The logic for this decision would be based on the scoring table outlined above.

A failure to account for the "go alone" state in any of these modules will lead to critical gameplay bugs, such as dealing the sitting-out partner into the next hand, incorrect turn progression, or awarding the wrong number of points.