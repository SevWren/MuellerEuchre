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
2.  **Left Bower**: The Jack of the same color as the trump suit. It **adopts the trump suit as its effective suit** for the duration of the hand, regardless of its printed suit. This is critical for the 'must follow suit' rule. (Second highest card in the game).
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

The project's logic for this hierarchy is centralized in the `getCardRank` function, located in `src/utils/cardUtils.js`. This function assigns a numerical score to a card based on the current `trumpSuit`.

The function uses offsets to ensure the tiers are respected:

*   **Right Bower:** A fixed value of **100**.
*   **Left Bower:** A fixed value of **90**.
*   **Other Trump Cards:** A **+50** offset is added to their base rank.
*   **Non-Trump Cards:** Receive only their base rank (1-6).

### Example `getCardRank` Evaluation

**Scenario:**
*   **Trump Suit:** Spades (♠)

| Card Played | Suit | Value | Context | Rank Calculation | Final Rank |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **J♠** | Spades | Jack | **Right Bower** | `(Fixed Value)` | **100** |
| **J♣** | Clubs | Jack | **Left Bower** | `(Fixed Value)` | **90** |
| **A♠** | Spades | Ace | Trump Suit | `6 (Ace) + 50 (Trump)` | **56** |
| **9♠** | Spades | Nine | Trump Suit | `1 (Nine) + 50 (Trump)` | **51** |
| **A♥** | Hearts | Ace | Off-Suit | `6 (Ace)` | **6** |
| **K♥** | Hearts | King | Off-Suit | `5 (King)` | **5** |
| **A♦** | Diamonds | Ace | Off-Suit | `6 (Ace)` | **6** |
| **K♦** | Diamonds | King | Off-Suit | `5 (King)` | **5** |

As shown, the Bowers have unique high values. Any other trump card (rank > 50) will beat any non-trump card (rank < 7). Unlike the led suit, off-suit cards are not given a special offset, but they are still outranked by trump cards.

---

## 4. Implications for Game Logic

This ranking hierarchy is the foundation for several key game components:

*   **`determineTrickWinner` (`playingPhase.js`):** This function's primary job is to iterate through the four cards in a completed trick, call `getCardRank` on each one (providing the current `trumpSuit`), and identify the card with the highest returned value. The player who played that card is the winner.

*   **`aiLogic.js`:** Any competent AI must understand this hierarchy to make intelligent plays.
    *   **Leading a Trick:** An AI might lead with a high off-suit Ace, hoping to win if no one has that suit to trump.
    *   **Following Suit:** If an opponent plays a high card of the led suit, the AI must use `getCardRank` to determine if it has a card in its hand that can beat it (either a higher card of the same suit or any trump card).
    *   **Deciding to Trump:** If the AI is void in the led suit, it must decide if it's worth using a valuable trump card to win the trick.

A clear understanding of this three-tiered, context-dependent ranking system is essential for any developer working on the core gameplay logic of this Euchre application.