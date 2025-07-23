# AI Logic Unit Test Documentation

## File: `test/game/logic/aiLogic.unit.test.js`

## Overview
This document provides comprehensive documentation for the AI Logic unit tests, which validate the behavior of the Euchre AI's decision-making processes for bidding and card play.

## Test Structure

### 1. Test Setup

#### Imports
```javascript
import { describe, it, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
```

#### Test Constants
- `SUITS`: Enumeration of card suits (CLUBS, DIAMONDS, HEARTS, SPADES)
- `RANKS`: Enumeration of card ranks (NINE, TEN, JACK, QUEEN, KING, ACE)
- `POINTS`: Point values for card evaluation (matching implementation)

#### Test Helpers
- `createCard(suit, rank)`: Creates a card object for testing

### 2. Test Suites

#### 2.1 `countTrumpInHand(hand, trumpSuit)`
Counts the number of trump cards in a player's hand, including left bower.

**Parameters:**
- `hand`: Array of card objects `{suit: string, value: string}`
- `trumpSuit`: String representing the current trump suit

**Test Cases:**
1. **Right Bower**
   - Trump is hearts, hand contains J♥
   - Expected: Counts as 1 trump

2. **Left Bower**
   - Trump is hearts, hand contains J♦ (left bower)
   - Expected: Counts as 1 trump

3. **Regular Trump Cards**
   - Trump is hearts, hand contains A♥, K♥, Q♥
   - Expected: Counts all as trumps

4. **Empty Hand**
   - `hand = []`
   - Expected: Returns 0

5. **Null/Undefined Inputs**
   - `hand = null` or `hand = undefined`
   - `trumpSuit = null` or `trumpSuit = undefined`
   - Expected: Returns 0

6. **Non-Trump Cards**
   - Trump is hearts, hand contains only spades and clubs
   - Expected: Returns 0

7. **Mixed Hand**
   - Trump is hearts, hand contains [J♥, J♦, A♠, K♥, 9♣]
   - Expected: Counts 2 trumps (J♥ and K♥, J♦ is left bower)

8. **Invalid Card Objects**
   - Hand contains `{suit: null, value: null}`, `{}`, `null`
   - Expected: Ignores invalid cards

#### 2.2 `calculateHandStrength(hand, trumpSuit)`
Calculates the total point value of a hand based on the trump suit.

**Scoring Table:**
| Card Type       | Points | Example (trump=hearts) |
|-----------------|--------|------------------------|
| Right Bower     | 15     | J♥                     |
| Left Bower      | 10     | J♦                     |
| Trump Ace       | 7      | A♥                     |
| Trump King      | 5      | K♥                     |
| Trump Queen     | 3      | Q♥                     |
| Trump 10        | 1      | 10♥                    |
| Trump 9         | 1      | 9♥                     |
| Non-trump cards | 0      | Any ♠ ♦ ♣              |

**Test Cases:**
1. **Right Bower**
   - Hand: `[J♥]`, trump: hearts
   - Expected: 15 points

2. **Left Bower**
   - Hand: `[J♦]`, trump: hearts
   - Expected: 10 points

3. **Trump Cards**
   - Hand: `[A♥, K♥, Q♥, 10♥, 9♥]`, trump: hearts
   - Expected: 7 + 5 + 3 + 1 + 1 = 17 points

4. **Mixed Hand**
   - Hand: `[J♥, J♦, A♥, K♠, 9♣]`, trump: hearts
   - Expected: 15 + 10 + 7 + 0 + 0 = 32 points

5. **Non-Trump Cards**
   - Hand: `[A♠, K♠, Q♠, J♠, 10♠]`, trump: hearts
   - Expected: 0 points

6. **Empty/Invalid Inputs**
   - `hand = []` → 0
   - `hand = null` → 0
   - `hand = [null, undefined, {}]` → 0
   - `trumpSuit = null` → 0

7. **Edge Cases**
   - Hand with duplicate cards
   - Hand with all cards same rank
   - Hand with all cards same suit but not trump

#### 2.3 `_evaluateHand(hand, potentialTrump)`
Internal function that evaluates hand strength for a potential trump suit.

**Test Cases:**
1. **Input Validation**
   - Empty array: `_evaluateHand([], 'hearts')` → 0
   - Non-array hand: `_evaluateHand({}, 'hearts')` → 0
   - Invalid trump: `_evaluateHand([A♥], null)` → 0

2. **Delegation**
   - Verify calls `calculateHandStrength` with same arguments
   - Returns same value as direct `calculateHandStrength` call

3. **Edge Cases**
   - Hand with one card
   - Maximum possible hand (all trumps + bowers)
   - Hand with only non-trump cards

#### 2.4 `chooseBid(hand, turnCard, isDealer, bids)`
Determines AI's bidding decision based on hand strength and game state.

**Bidding Logic:**
- First Round: Can order up turn card's suit
- Second Round: Can call any suit except turn card's suit
- BID_THRESHOLD = 20 points

**Test Cases:**
1. **First Round - Order Up**
   - Hand score ≥ 20 for turn card suit
   - Expected: `{ decision: 'orderUp' }`

2. **First Round - Pass**
   - Hand score < 20 for turn card suit
   - Expected: `{ decision: 'pass' }`

3. **Second Round - Call Trump**
   - All passed first round
   - Hand has suit with score ≥ 20
   - Expected: `{ decision: 'callTrump', suit: 'bestSuit' }`

4. **Second Round - Pass**
   - All passed first round
   - No suit meets threshold
   - Expected: `{ decision: 'pass' }`

5. **Edge Cases**
   - Empty hand
   - Null/undefined turnCard
   - Invalid bids array
   - Dealer forced to pick (all passed to dealer)
   - Multiple eligible suits (should pick highest scoring)

#### 2.5 `chooseCardToPlay(hand, currentTrick, trumpSuit, leadSuit)`
Selects the optimal card for the AI to play based on game state.

**Card Selection Logic:**
- If leading (empty trick):
  - If only trumps, play lowest trump
  - Otherwise, play highest non-trump

- If following suit:
  - Try to win trick if possible (play lowest winning card)
  - Otherwise, play lowest card in suit

- If void in lead suit (sloughing):
  - Play lowest value card (prefer non-trump)

**Test Cases:**
1. **Leading**
   - Only trumps: `[J♥, 9♥]` → play 9♥
   - Mixed: `[A♠, K♠, Q♥]` → play A♠
   - All non-trump: `[A♠, K♠, Q♠]` → play A♠

2. **Following Suit**
   - Can win: Trick=[9♠], hand=[Q♠, J♠] → play Q♠
   - Can't win: Trick=[A♠], hand=[9♠, 10♠] → play 9♠
   - Left bower: Trick=[Q♥], hand=[J♦] (trump=hearts) → play J♦

3. **Sloughing**
   - Has trumps: Need ♠ but void, hand=[J♥, 9♥, K♦] → play K♦
   - No trumps: hand=[A♣, K♦, Q♣] → play K♦

4. **Edge Cases**
   - Empty hand
   - Invalid cards in trick
   - Last trick strategy
   - Near endgame (count remaining cards)
   - All same rank
   - All same suit

### 3. Test Data

#### Standard Test Hand
```javascript
const mockHand = [
  createCard(SUITS.HEARTS, RANKS.JACK),  // Right bower if hearts is trump
  createCard(SUITS.DIAMONDS, RANKS.JACK), // Left bower if hearts is trump
  createCard(SUITS.HEARTS, RANKS.ACE),    // Trump ace
  createCard(SUITS.CLUBS, RANKS.NINE),    // Off-suit
  createCard(SUITS.SPADES, RANKS.QUEEN)   // Off-suit
];
```

#### Test Scenarios
1. **Strong Trump Hand**
   - Multiple high trumps
   - Right and left bower
   - High non-trump cards

2. **Weak Hand**
   - No trumps
   - Low-value cards
   - Mixed suits

3. **Edge Cases**
   - Empty hand
   - Invalid cards
   - Full trick (4 cards)

## Running Tests

### Single Test File
```bash
node --test test/game/logic/aiLogic.unit.test.js
```

### With Debugging
```bash
node --inspect-brk --test test/game/logic/aiLogic.unit.test.js
```

## Test Coverage

### Functions Tested
- `countTrumpInHand()`
- `calculateHandStrength()`
- `_evaluateHand()`
- `chooseBid()`
- `chooseCardToPlay()`
- `getEffectiveSuit()`
- `getCardValue()`
- `getWinningCard()`
- `getLowestCard()`

### Edge Cases Covered
- Empty hands/inputs
- Invalid card objects
- Full/empty tricks
- All trump/non-trump hands
- Edge ranks (Jack as bower, Ace high, etc.)

## Best Practices

### Test Structure
- Each test is independent
- Mocks are reset before each test
- Test data is recreated for each test
- Clear test names using `it('should...')` pattern

### Assertions
- Uses `node:assert/strict`
- Clear error messages
- Both positive and negative test cases

### Documentation
- JSDoc for test helpers
- Clear test descriptions
- Organized by function and scenario
