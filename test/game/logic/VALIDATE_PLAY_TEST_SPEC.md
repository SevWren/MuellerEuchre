# validatePlay.unit.test.js - Test Specification

## Overview
This document outlines all test cases that should be covered in `validatePlay.unit.test.js` to ensure comprehensive validation of Euchre game play rules. The test file should validate the core game mechanics, including card playing rules, following suit, and special card behaviors like the Left Bower.

## Test Categories

### 1. Initial Validation Tests
- [ ] Should throw ValidationError if gameState is missing
- [ ] Should throw ValidationError if playerHand is missing
- [ ] Should throw ValidationError if card is missing
- [ ] Should throw ValidationError if playerRole is missing
- [ ] Should throw InvalidPhaseError if game is not in PLAYING phase
- [ ] Should throw NotPlayersTurnError if it's not the player's turn
- [ ] Should throw CardNotInHandError if card is not in player's hand

### 2. Standard Play Validation
- [ ] Should allow leading with any card when no cards have been played
- [ ] Should allow following suit correctly
- [ ] Should throw MustFollowSuitError if player has the led suit but plays another
- [ ] Should allow playing any card when player is void in the led suit

### 3. Trump and Bower Scenarios

#### 3.1 When Trump is Led
- [ ] Should allow playing the Right Bower (trump suit Jack)
- [ ] Should allow playing the Left Bower (same color Jack as trump)
- [ ] Should allow playing other trump suit cards
- [ ] Should throw MustFollowSuitError if player has trump but plays off-suit

#### 3.2 When Left Bower's Original Suit is Led
- [ ] Should throw MustFollowSuitError if player has another card of the original suit
- [ ] Should allow playing Left Bower if no other cards of original suit are held
- [ ] Should allow playing other cards of the original suit when available

#### 3.3 When a Side Suit is Led (Neither Trump nor Left Bower's Suit)
- [ ] Should require following the led suit when possible
- [ ] Should allow playing Left Bower when void in led suit
- [ ] Should allow playing any card when void in led suit

### 4. Edge Cases
- [ ] Should handle empty trick array (first play of the hand)
- [ ] Should handle full trick (4 cards played)
- [ ] Should validate against the effective suit (important for Left Bower)
- [ ] Should handle all player roles (North, East, South, West)
- [ ] Should work with all possible trump suits

### 5. Integration with Game State
- [ ] Should correctly update game state after valid play
- [ ] Should not modify game state on invalid play
- [ ] Should maintain turn order after play validation

## Test Data Requirements

### Card Setup
- Standard 24-card Euchre deck
- All suits (Hearts, Diamonds, Clubs, Spades)
- All values (9, 10, J, Q, K, A)
- Special handling for Jack of same color as trump (Left Bower)

### Game States to Test
- Beginning of hand (no cards played)
- Mid-hand (some cards played)
- End of hand (last trick)
- Different dealer positions
- Different score scenarios

## Test Helpers
- `createMockGameState(phase, trumpSuit, currentPlayer, currentTrick)`
- `createPlayerHand(cards)`
- `createCard(id, suit, value)`
- `createTrick(playedCards)`

## Assertion Patterns
- Valid plays should return `true`
- Invalid plays should throw appropriate errors
- Error messages should be descriptive and helpful for debugging
- Game state should remain unchanged after validation failures

## Test Coverage Goals
- 100% line coverage for `validatePlay` function
- All error conditions tested
- All edge cases covered
- All possible card combinations verified

## Notes
- Tests should be independent and not rely on shared state
- Each test should set up its own test data
- Mock external dependencies as needed
- Follow the Arrange-Act-Assert pattern
- Use descriptive test names that explain the scenario being tested
