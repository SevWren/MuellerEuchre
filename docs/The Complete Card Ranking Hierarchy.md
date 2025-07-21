# The Complete Card Ranking Hierarchy

## 1. Core Concept: Context is Everything

In Euchre, a card's power is not fixed. Its ability to win a trick is entirely dependent on its context within the current hand. This hierarchy is the single most important concept for determining a trick's winner and for developing any form of game logic or AI.

A card's rank is determined by its relationship to two key pieces of game state:
1.  The **Trump Suit**
2.  The **Led Suit** (the suit of the first card played in a trick)

These contexts create three distinct tiers of power.

---

## 2. The Three Tiers of Card Power

Every card in a trick falls into one of these three tiers. A card from a higher tier will **always** beat a card from a lower tier.

### Tier 1: The Trump Suit (Highest Power)

Cards belonging to the trump suit are the most powerful cards in the hand. This tier includes the **Right Bower** and the **Left Bower**.

*   **Rule:** If one or more trump cards are played in a trick, the **highest-ranking trump card** wins the trick.
*   **Example:** If Hearts (♥) is trump, a 9♥ will beat an A♠, K♠, Q♠, and J♠ played in the same trick.

The internal ranking *within the trump suit* is unique:

1.  **Right Bower**: The Jack of the trump suit. (Highest card in the game).
2.  **Left Bower**: The Jack of the same color as the trump suit. (Second highest card).
3.  **Ace** of trump.
4.  **King** of trump.
5.  **Queen** of trump.
6.  **Ten** of trump.
7.  **Nine** of trump.

### Tier 2: The Led Suit (Medium Power)

If no trump cards are played in a trick, the highest card of the suit that was led wins.

*   **Rule:** If no trump is played, the **highest-ranking card of the led suit** wins the trick.
*   **Example:** The first player leads the K♦. The other players play the 9♦, A♣, and 10♠. No trump is played. The K♦ wins because it is the highest card of the led suit (Diamonds). The A♣ and 10♠ have no power to win.

### Tier 3: Off-Suit Cards (No Power)

Cards that are neither trump nor of the led suit have no power to win a trick.

*   **Rule:** A card that is not trump and does not match the led suit **cannot win the trick**.
*   **Example:** Spades (♠) are trump. The first player leads the K♥. The second player plays the A♥. The third player plays the 9♠ (a low trump card). The A♥ is currently winning, but the 9♠ trumps it and wins the trick.

---

## 3. The `getCardRank` Function: A Programmatic Model

The project's logic for this hierarchy is centralized in the `getCardRank` function, located in `src/utils/deck.js`. This function assigns a numerical score to a card based on the current `trumpSuit` and `ledSuit`.

The function uses offsets to ensure the three tiers are respected:

*   **`CARD_RANKS.TRUMP_OFFSET` (e.g., +100):** A large value added to trump cards to ensure they outrank all non-trump cards.
*   **`CARD_RANKS.LED_OFFSET` (e.g., +50):** A medium value added to cards of the led suit (that are not trump) to ensure they outrank off-suit cards.
*   **Base Rank (9-14):** The card's natural value (Ace = 14, King = 13, etc.).

### Example `getCardRank` Evaluation

**Scenario:**
*   **Trump Suit:** Spades (♠)
*   **Led Suit:** Hearts (♥)

| Card Played | Suit | Value | Context | Rank Calculation | Final Rank |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **J♠** | Spades | Jack | **Right Bower** | `CARD_RANK_RIGHT_BOWER` | **150** |
| **J♣** | Clubs | Jack | **Left Bower** | `CARD_RANK_LEFT_BOWER` | **100** |
| **A♠** | Spades | Ace | Trump Suit | `14 (Ace) + 100 (Trump)` | **114** |
| **9♠** | Spades | Nine | Trump Suit | `9 (Nine) + 100 (Trump)` | **109** |
| **A♥** | Hearts | Ace | Led Suit | `14 (Ace) + 50 (Led)` | **64** |
| **K♥** | Hearts | King | Led Suit | `13 (King) + 50 (Led)` | **63** |
| **A♦** | Diamonds | Ace | Off-Suit | `14 (Ace)` | **14** |
| **K♦** | Diamonds | King | Off-Suit | `13 (King)` | **13** |

As shown, any trump card (rank > 100) will beat any led-suit card (rank > 50), which will in turn beat any off-suit card (rank < 20).

---

## 4. Implications for Game Logic

This ranking hierarchy is the foundation for several key game components:

*   **`determineTrickWinner` (`playingPhase.js`):** This function's primary job is to iterate through the four cards in a completed trick, call `getCardRank` on each one, and identify the card with the highest returned value. The player who played that card is the winner.

*   **`aiLogic.js`:** Any competent AI must understand this hierarchy to make intelligent plays.
    *   **Leading a Trick:** An AI might lead with a high off-suit Ace, hoping to win if no one has that suit to trump.
    *   **Following Suit:** If an opponent plays a high card of the led suit, the AI must use `getCardRank` to determine if it has a card in its hand that can beat it (either a higher card of the same suit or any trump card).
    *   **Deciding to Trump:** If the AI is void in the led suit, it must decide if it's worth using a valuable trump card to win the trick.

A clear understanding of this three-tiered, context-dependent ranking system is essential for any developer working on the core gameplay logic of this Euchre application.