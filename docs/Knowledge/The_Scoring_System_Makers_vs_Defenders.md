# The Euchre Scoring System: Makers vs. Defenders

## 1. Core Concept: Fulfilling the Contract

The scoring system in Euchre is not a simple contest of who wins the most tricks. It is an **asymmetric system** based on which team made a "contract" by choosing the trump suit. This creates two distinct roles for each hand:

*   **The "Makers":** The team that successfully ordered up or called trump. Their goal is to win **at least 3 of the 5 tricks**.
*   **The "Defenders":** The opposing team. Their goal is to **prevent the Makers from winning 3 tricks**.

The points awarded at the end of a hand depend entirely on which of these roles a team holds and whether the Makers fulfilled their contract.

---

## 2. The Programmatic Keystone: `gameState.makerTeam`

The entire scoring logic is driven by a single, critical piece of information in the `gameState` object: the `makerTeam` property.

This property is set during the bidding phase (in `src/game/phases/biddingPhase.js`) when a player successfully makes trump. It is the **single source of truth** that the scoring module uses to determine which team is the "Makers" and which is the "Defenders."

```javascript
// Example gameState snippet entering the SCORING phase
{
  // ... other properties
  "gamePhase": "GAME_PHASE_SCORING",
  "makerTeam": "TEAM_NS", // CRITICAL: This tells the logic that North/South are the Makers.
  "tricksTaken": {
    "TEAM_NS": 3,
    "TEAM_EW": 2
  },
  "goingAlone": false,
  // ...
}
```

An error in scoring can almost always be traced back to an incorrect or missing `makerTeam` value.

---

## 3. The Standard Scoring Matrix

The `calculateAndApplyScore` function in `src/game/phases/scoringPhase.js` uses the following matrix to determine the outcome of a standard hand (when no one is "going alone").

| Outcome                       | Tricks Taken by Maker Team | Scoring Team | Points Awarded |
| :---------------------------- | :------------------------- | :----------- | :------------- |
| **Made Bid** (Standard)       | 3 or 4                     | **Makers**   | **1 point**    |
| **March** (Took all tricks)   | 5                          | **Makers**   | **2 points**   |
| **Euchred** (Failed to make bid) | 0, 1, or 2                 | **Defenders**| **2 points**   |

It is critical to note that **Defenders only score points if they "Euchre" the Makers**. If the Makers win 3 tricks and the Defenders win 2, the Defenders get **zero points**.

---

## 4. The "Going Alone" Scoring Modifier

As detailed in `docs/The Going Alone Gameplay and Scoring Modifiers.md`, if the Maker chose to "go alone," the potential rewards are higher. The scoring logic in `scoringPhase.js` checks the `gameState.goingAlone` flag and applies a modified scoring matrix.

| Outcome (Going Alone)         | Tricks Taken by Lone Maker | Scoring Team | Points Awarded |
| :---------------------------- | :------------------------- | :----------- | :------------- |
| **Made Bid** (Standard)       | 3 or 4                     | **Makers**   | **1 point**    |
| **Loner March** (Took all tricks)| 5                          | **Makers**   | **4 points**   |
| **Euchred** (Failed)            | 0, 1, or 2                 | **Defenders**| **2 points**   |

**Note:** The penalty for being Euchred is the same (2 points for the Defenders) whether the Maker was playing with a partner or going alone.

---

## 5. Code Implementation Deep Dive

The entire logic described above is encapsulated within the **`calculateAndApplyScore`** function located in **`src/game/phases/scoringPhase.js`**.

The function follows these logical steps:

1.  **Validate Phase:** Confirms that `gameState.gamePhase` is `SCORING`.
2.  **Identify Roles:** Reads `gameState.makerTeam` to identify the Makers and determines the Defenders (the other team).
3.  **Count Tricks:** Reads the final counts from `gameState.tricksTaken`.
4.  **Check for Go Alone:** Reads the `gameState.goingAlone` boolean flag.
5.  **Apply Logic:** Uses a series of `if/else` statements to implement the logic from the scoring matrices above.
6.  **Update State:** Creates a new game state object with the updated `teamScores`.
7.  **Check for Game Over:** It then proceeds to check if the new scores meet or exceed the `WINNING_SCORE`, which determines the next game phase (`DEALING` or `GAME_OVER`).

---

## 6. Implications for the LLM

To reliably debug, code, or reason about this system, you must internalize the following:

*   **Primacy of `makerTeam`:** When debugging a scoring issue, the **first and most important variable to inspect is `gameState.makerTeam`**. If it is `null`, `undefined`, or set to the wrong team, the scoring will be incorrect.
*   **Asymmetric Logic:** Your generated code and debugging analysis must always account for the two roles (Maker/Defender). Do not assume points are simply awarded to the team with more tricks.
*   **"Go Alone" is a Key Flag:** Before calculating points, always check the `gameState.goingAlone` flag, as it fundamentally changes the reward for taking all 5 tricks from 2 points to 4.
*   **"Negative Knowledge":** Understand that Defenders **do not score points for winning 1 or 2 tricks**. They only score when they win 3 or more tricks, which is called a Euchre.