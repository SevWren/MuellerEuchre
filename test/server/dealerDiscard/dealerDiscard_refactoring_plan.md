
# Dealer Discard Test Suite Refactoring Plan

## 1. Directory Structure
```
test/server/dealerDiscard/
├── __mocks__/                  # Mock implementations
│   └── io.mock.js             # Socket.IO mock implementation
│
├── fixtures/                  # Test data and state
│   ├── gameStates.js         # Game state templates
│   └── testCards.js          # Card definitions and utilities
│
├── helpers/                   # Test utilities
│   ├── testUtils.js          # Common test utilities
│   └── assertions.js         # Custom assertions
│
├── unit/                      # Unit test files
│   ├── validation.test.js    # Input validation tests
│   ├── stateChanges.test.js  # State modification tests
│   └── errorHandling.test.js # Error case tests
│
├── integration/               # Integration tests
│   └── gameFlow.test.js      # Game flow integration
│
└── index.test.js             # Main test entry point
```

## 2. File Breakdown

### 2.1 Mocks (`__mocks__/io.mock.js`)
- **Purpose**: Centralized mock for Socket.IO
- **Contents**:
  - `createMockIo()` - Factory for creating mock IO instances
  - `MockSocket` - Simulated socket connection
  - Event tracking and assertion helpers

### 2.2 Fixtures (`fixtures/`)
- **gameStates.js**:
  - `createBaseGameState()` - Minimal valid game state
  - `createDealerDiscardState()` - State ready for discard
  - `createInvalidDiscardStates()` - Various invalid states

- **testCards.js**:
  - Card definitions (suits, ranks)
  - Card creation utilities
  - Pre-defined test hands

### 2.3 Helpers (`helpers/`)
- **testUtils.js**:
  - Test setup/teardown
  - Common test scenarios
  - State manipulation helpers

- **assertions.js**:
  - `assertErrorEmitted()`
  - `assertStateUnchanged()`
  - `assertCardMoved()`

### 2.4 Unit Tests (`unit/`)
- **validation.test.js**:
  - Input validation
  - Game state validation
  - Player role validation

- **stateChanges.test.js**:
  - Card movement
  - Phase transitions
  - Score updates

- **errorHandling.test.js**:
  - Invalid inputs
  - Edge cases
  - Error messages

### 2.5 Integration Tests (`integration/`)
- **gameFlow.test.js**:
  - Full discard workflow
  - Multi-player interactions
  - Turn progression

## 3. Test Coverage Goals

### 3.1 Core Functionality
- [ ] Basic discard works
- [ ] Card moves from hand to kitty
- [ ] Game phase updates
- [ ] Turn advances correctly

### 3.2 Validation
- [ ] Invalid game phases
- [ ] Non-dealer attempts
- [ ] Invalid card selections
- [ ] Missing game state

### 3.3 Edge Cases
- [ ] First/last card
- [ ] Duplicate cards
- [ ] Concurrent discards
- [ ] Network failures

## 4. Implementation Phases

### Phase 1: Setup (1 hour)
- Create directory structure
- Set up base utilities
- Move existing tests

### Phase 2: Core Tests (2 hours)
- Basic discard functionality
- State validation
- Error handling

### Phase 3: Edge Cases (2 hours)
- Boundary conditions
- Error scenarios
- Concurrency tests

### Phase 4: Integration (1 hour)
- Game flow
- Multi-player
- End-to-end

## 5. Quality Gates

### 5.1 Before Merge
- 100% line coverage
- All tests pass
- No linting errors
- Documentation complete

### 5.2 Performance
- Individual tests < 100ms
- Full suite < 5s
- No memory leaks

## 6. Documentation

### 6.1 Test Structure
```markdown
# Test Structure

## Unit Tests
- Location: `unit/`
- Focus: Isolated functionality
- Dependencies: Mocks only

## Integration Tests
- Location: `integration/`
- Focus: Component interaction
- Dependencies: Minimal mocks
```

### 6.2 Writing New Tests
1. Add fixtures if needed
2. Write test in appropriate category
3. Add assertions
4. Document edge cases

## 7. Future Improvements

### 7.1 Test Generation
- Property-based testing
- Fuzz testing
- Performance benchmarks

### 7.2 Tooling
- Coverage reporting
- Test timing analysis
- Visual debugging

## 8. Rollback Plan

1. Keep original test file
2. Phase implementation
3. Verify after each phase
4. Remove original after verification

## Next Steps

1. Approve this plan
2. Begin Phase 1 implementation
3. Review initial structure
4. Proceed with test migration

## Status

- [ ] Phase 1: Setup
- [ ] Phase 2: Core Tests
- [ ] Phase 3: Edge Cases
- [ ] Phase 4: Integration

## Changelog

### 2025-05-29
- Initial refactoring plan created
