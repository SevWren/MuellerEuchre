# Debugging Deck Utility Tests

## Notes
- User requested to run and debug all failing tests in `test/utils/deck.unit.test.js` until they pass.
- There are currently failing tests in `test/utils/deck.unit.test.js` related to invalid card suit handling in `isRightBower`.
- The attempted fix for invalid suit handling in `isRightBower` did not resolve the failing test; further debugging required.
- Project uses strict constant naming and import conventions per rules.
- Enhanced documentation for isRightBower and isLeftBower in deck.js to include comprehensive comments and reference-tracking per all referencing files.
- Enhanced documentation for all modified functions in deck.js to include comprehensive comments and reference-tracking per all referencing files.
- Enhanced documentation for shuffleDeck and cardToId in deck.js to include comprehensive comments and reference-tracking per all referencing files.
- Enhanced documentation for createDeck in deck.js to include comprehensive comments and reference-tracking per all referencing files.
- Enhanced documentation for areSameColor in deck.js to include comprehensive comments and reference-tracking per all referencing files.
- Enhanced documentation for getSuitColor in deck.js to include comprehensive comments and reference-tracking per all referencing files.
- The "Left Bower Identity Shift" logic (from `docs/The Left Bowers Identity Shift.md`) has now been fully analyzed and integrated into deck utility logic and tests.
- Need to identify all files and unit tests that reference any modified code in `deck.js` and verify no cascading problems were introduced.
- The following files and tests import or reference `deck.js` and must be verified:
  - [ ] Verify: test/utils/deck.unit.test.js
  - test/server/dealerDiscard.unit.test.js
  - test/game/phases/__mocks__/startNewHandPhase.js
  - test/game/phases/startNewHandPhase.unit.test.js
  - test/game/phases/playingPhase.unit.test.js
  - test/game/phases/biddingPhase.unit.test.js
  - test/game/logic/validatePlay.unit.test.js
  - test/game/logic/validatePlay.edge.unit.test.js
  - src/game/phases/startNewHandPhase.js
  - src/game/phases/playingPhase.js
  - src/game/phases/biddingPhase.js
  - src/game/logic/validation.js
  - src/game/logic/aiLogic.js
  - Scripts/run-deck-dependent-tests.js

## Task List
- [x] Analyze failing tests in `deck.unit.test.js`
- [x] Analyze and incorporate "Left Bower Identity Shift" rules from documentation
- [x] Identify root causes in `src/utils/deck.js`
- [x] Fix logic or error handling for invalid card and trump suit cases in `isLeftBower`
- [x] Fix logic or error handling for invalid trump suit case in `isRightBower`
- [x] Re-run tests to verify all pass
- [x] Add comprehensive comments to modified functions in deck.js to track referencing files
- [x] Add documentation comments to all modified functions in deck.js tracking referencing files
- [x] Add documentation comments to shuffleDeck and cardToId in deck.js tracking referencing files
- [x] Add documentation comments to createDeck in deck.js tracking referencing files
- [x] Add documentation comments to areSameColor in deck.js tracking referencing files
- [x] Add documentation comments to getSuitColor in deck.js tracking referencing files
- [ ] Fix logic or error handling for invalid card suit cases in `isRightBower`
- [ ] Identify all files and unit tests that reference any modified code in deck.js and verify no cascading problems
  - [ ] Verify: test/utils/deck.unit.test.js
  - [ ] Verify: test/server/dealerDiscard.unit.test.js
  - [ ] Verify: test/game/phases/__mocks__/startNewHandPhase.js
  - [ ] Verify: test/game/phases/startNewHandPhase.unit.test.js
  - [ ] Verify: test/game/phases/playingPhase.unit.test.js
  - [ ] Verify: test/game/phases/biddingPhase.unit.test.js
  - [ ] Verify: test/game/logic/validatePlay.unit.test.js
  - [ ] Verify: test/game/logic/validatePlay.edge.unit.test.js
  - [ ] Verify: src/game/phases/startNewHandPhase.js
  - [ ] Verify: src/game/phases/playingPhase.js
  - [ ] Verify: src/game/phases/biddingPhase.js
  - [ ] Verify: src/game/logic/validation.js
  - [ ] Verify: src/game/logic/aiLogic.js
  - [ ] Verify: Scripts/run-deck-dependent-tests.js

## Current Goal
Debug and fix invalid suit handling in isRightBower