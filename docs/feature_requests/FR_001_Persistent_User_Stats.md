# Feature Request 001: Persistent User Statistics (The Archive Pattern)

## 1. Problem Statement
Currently, the application stores game state in the `games` MongoDB collection. To prevent storage bloat and maintain performance, this collection utilizes a **Time-To-Live (TTL) Index** on the `updatedAt` field, which automatically deletes game records 24 hours after they finish.

**Consequence:** When a game record is deleted, all history of that game (wins, losses, tricks taken, loners made) is permanently lost. There is currently no mechanism to track a user's long-term performance or lifetime statistics.

## 2. Proposed Solution: "The Archive Pattern"
We will decouple **Active Game State** (ephemeral, high-frequency) from **User Statistics** (permanent, low-frequency).

When a game transitions to `GAME_OVER`, the system will "flush" the final results into a separate, permanent MongoDB collection dedicated to user stats.

### 3. Architectural Changes

#### 3.1 New Database Collection: `users`
We will introduce a new collection named `users` (or `player_stats`).
*   **Persistence:** No TTL Index. Records persist indefinitely.
*   **Indexing:** Unique index on `userId`.

**Schema Definition:**
```json
{
  "_id": "ObjectId(...)",
  "userId": "string (Unique)",
  "lastPlayed": "Date",
  "stats": {
    "totalGames": "number",
    "wins": "number",
    "losses": "number",
    "totalTricks": "number",
    "lonersAttempted": "number",
    "lonersConverted": "number",
    "euchresInflicted": "number"
  }
}
```

#### 3.2 Repository Layer Update (`src/db/gameRepository.js`)
Add a new method `updateUserStats` to handle atomic increments. This ensures that if two games finish simultaneously for the same user, the stats are counted correctly without race conditions.

```javascript
/**
 * Atomically updates a user's lifetime statistics.
 * @param {string} userId - The unique ID of the player.
 * @param {object} delta - Object containing values to increment (e.g., { wins: 1 }).
 */
async function updateUserStats(userId, delta) {
  await this.db.collection("users").updateOne(
    { userId: userId },
    {
      $inc: {
        "stats.totalGames": 1,
        "stats.wins": delta.wins || 0,
        "stats.losses": delta.losses || 0,
        "stats.lonersConverted": delta.loners || 0
      },
      $set: { lastPlayed: new Date() }
    },
    { upsert: true }
  );
}
```

#### 3.3 Logic Layer Trigger (`src/socket/handlers/gameOverHandlers.js`)
The trigger point is the transition to `GAME_PHASES.GAME_OVER`.

*   **Current Flow:** `checkGameOver` -> returns state with `GAME_OVER`.
*   **New Flow:** Detect this state change in the handler (or a dedicated `endGame` service) and execute the archive logic.

**Pseudocode Logic:**
1.  Detect `GAME_OVER`.
2.  Iterate through `gameState.players`.
3.  Determine Win/Loss status for each player based on `player.teamId` vs `gameState.winningTeam`.
4.  Call `gameRepository.updateUserStats` for each player asynchronously ("fire and forget").

## 4. Implementation Checklist

- [ ] **Database:** Create `users` collection (lazy creation via code is acceptable).
- [ ] **Layer 5:** Implement `updateUserStats` in `gameRepository.js`.
- [ ] **Layer 1/3:** Identify the exact line where `GAME_OVER` is finalized.
- [ ] **Integration:** Hook the stats update call into the game-over workflow.
- [ ] **Testing:** Create an integration test htat simulates a game end and verifies the `users` collection is updated.

## 5. Future Considerations
*   **Leaderboards:** This new collection will allow for simple queries like `db.users.find().sort({ "stats.wins": -1 }).limit(10)` to generate global leaderboards.
*   **Auth Integration:** If we add user authentication later, this `userId` will map to the authenticated user account.
