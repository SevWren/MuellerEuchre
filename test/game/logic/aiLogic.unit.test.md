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

#### 2.1 `countTrumpInHand()`
Tests the function that counts trump cards in a player's hand.

**Test Cases:**
1. Counts right bower correctly
2. Counts left bower correctly
3. Counts regular trump cards
4. Handles empty hand
5. Handles null/undefined inputs
6. Ignores non-trump cards

#### 2.2 `calculateHandStrength()`
Tests the function that calculates the total point value of a hand.

**Test Cases:**
1. Scores right bower (15 points)
2. Scores left bower (10 points)
3. Scores trump Ace (7 points)
4. Scores trump King (5 points)
5. Scores trump Queen (3 points)
6. Scores trump 10 (1 point)
7. Scores trump 9 (1 point)
8. Ignores non-trump cards
9. Handles empty hand
10. Handles invalid inputs

#### 2.3 `_evaluateHand()`
Tests the internal hand evaluation function.

**Test Cases:**
1. Returns 0 for empty hand
2. Returns 0 for invalid inputs
3. Returns correct score for valid hand
4. Delegates to calculateHandStrength

#### 2.4 `chooseBid()`
Tests the AI's bidding decision logic.

**First Round Bidding:**
1. Orders up with strong hand (≥20 points)
2. Passes with weak hand
3. Considers dealer position
4. Handles null/undefined turn card
5. Handles empty hand

**Second Round Bidding:**
1. Calls best suit if strong enough
2. Passes if no strong suit
3. Considers previous passes
4. Handles edge cases

#### 2.5 `chooseCardToPlay()`
Tests the AI's card selection logic.

**Following Suit:**
1. Plays lowest winning card
2. Plays lowest card if can't win
3. Handles left bower correctly

**Leading:**
1. Leads with highest trump if holding multiple
2. Leads with highest non-trump if no trumps
3. Leads singleton when appropriate

**Sloughing:**
1. Discards lowest non-trump
2. Handles void in lead suit

**Edge Cases:**
1. Empty trick
2. Last trick
3. Near end of game

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
