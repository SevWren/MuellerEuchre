---

# Euchre Multiplayer - Migration to Modular Structure

This document outlines the changes made to restructure the Euchre multiplayer game server from a single `server3.js` file to a modular architecture.

## Table of Contents

- [Migration Status](#migration-status)
- [Project Structure](#project-structure)
- [Migration Steps](#migration-steps)
- [Testing Strategy](#testing-strategy)
- [Deployment Guide](#deployment-guide)
- [Troubleshooting](#troubleshooting)
- [Migration Timeline](#migration-timeline)
- [Initial Setup](#initial-setup)
- [Development Workflow](#development-workflow)
- [Migration Process](#migration-process)
- [Detailed Migration Guide](#detailed-migration-guide)
- [Next Steps](#next-steps)
- [Known Issues](#known-issues)
- [Rollback Plan](#rollback-plan)

## Migration Status

- **Completed:**
  - Created modular directory structure in `src/`
  - Implemented core game state management in `game/state.js`
  - Set up WebSocket communication in `socket/`
  - Created utility modules for deck, players, and logging
  - Implemented game phase handlers in `game/phases/`
  - Set up configuration in `config/constants.js`
  - Implemented validation logic in `game/logic/validation.js`
  - Created unit tests for validation module
  - Created comprehensive test suite in `test/`
  - Implemented scoring logic in `game/phases/scoring.js`
  - Added unit tests for scoring module
  - Updated configuration with WINNING_SCORE constant
  - Improved state management in scoring module
  - Implemented new hand initialization in `game/phases/startNewHand.js`
  - Added comprehensive tests for new hand functionality
  - Implemented card dealing logic with proper 2-3-2 dealing pattern
  - Implemented order-up phase logic in `game/phases/orderUpPhase.js`
  - Added comprehensive tests for order-up phase
  - Implemented dealer discard functionality
  - Added second round of bidding (calling trump)

## Current Status

### Completed
- Core game mechanics (dealing, bidding, playing, scoring)
- Game state management and persistence
- WebSocket communication with automatic reconnection
- Client-side WebSocket service with message queuing
- State synchronization service with offline support
- UI integration service for state management
- MongoDB-based game state persistence
- Comprehensive test coverage for core game logic
- "Go Alone" functionality
- Main game play loop and trick-taking
- End-game conditions and scoring
- Unit tests for validation and scoring modules
- Test infrastructure setup with Mocha and Chai
- Test coverage reporting with nyc

### In Progress
1. **Client-Side State Sync**
   - Implement state synchronization service
   - Add offline mode support
   - Handle reconnection scenarios

2. **UI/UX Improvements**
   - Add connection status indicators
   - Improve game state visualization
   - Add loading states during reconnection

3. **Testing & Quality**
   - Add integration tests for WebSocket communication
   - Test with various network conditions
   - Verify reconnection behavior

4. **Documentation**
   - Update API documentation
   - Create developer guide
   - Add inline code documentation

## Testing Status

### Test Migration Progress
- [x] Set up test infrastructure with Mocha and Chai
- [x] Migrate validation module tests to new structure
- [x] Migrate scoring module tests
- [x] Create tests for new game state management
- [x] Migrate WebSocket communication tests
  - Created new test file: `src/test/services/socketService.test.js`
  - Tests cover connection management, message queuing, and reconnection
  - Added connection quality tracking tests
- [x] Update integration tests for new module structure
  - Created new test file: `src/test/integration/gameFlow.test.js`
  - Added test utilities in `src/test/utils/testUtils.js`
  - Tests cover full game flow including:
    - Player joining and game start
    - Bidding phase
    - Card playing and trick completion
    - Player disconnection and reconnection
- [ ] Verify test coverage for all modules
- [ ] Set up CI/CD pipeline for automated testing

### Test Fixes Required
1. **Test Dependencies**
   - Update proxyquire usage for ES modules
   - Replace direct server3.js requires with module imports
   - Fix WebSocket mock implementations

2. **Test Coverage**
   - Add missing tests for new modules
   - Improve edge case coverage
   - Add integration tests for module interactions

3. **Test Performance**
   - Optimize test execution time
   - Implement test parallelization
   - Add test data factories

## Test Migration Status

### Current State
- **Total Test Files:** 35
- **Migrated to ES Modules:** ~15%
- **Test Coverage:** Needs improvement
- **CI/CD:** Not yet configured

### Migration Progress
- [x] Set up test infrastructure with Mocha and ES modules
- [x] Migrate core validation tests to new structure
- [ ] Migrate remaining test files (in progress)
  - [x] validation.unit.test.js
  - [ ] server3.validation.test.js
  - [ ] server3.unit.test.js
  - [ ] server3.callTrump.unit.test.js
  - [ ] server3.cardUtils.unit.test.js
  - [ ] server3.dealerDiscard.test.js
  - [ ] server3.deck.unit.test.js
  - [ ] server3.errorHandling.test.js
  - [ ] server3.gameState.unit.test.js
  - [ ] server3.goAlone.unit.test.js
  - [ ] server3.integration.test.js
  - [ ] server3.logging.unit.test.js
  - [ ] server3.multiGame.test.js
  - [ ] server3.orderUp.unit.test.js
  - [ ] server3.performance.test.js
  - [ ] server3.persistence.test.js
  - [ ] server3.playCard.additional.test.js
  - [ ] server3.playCard.unit.test.js
  - [ ] server3.reconnection.test.js
  - [ ] server3.scoreHand.unit.test.js
  - [ ] server3.security.test.js
  - [ ] server3.socket.unit.test.js
  - [ ] server3.spectator.test.js
  - [ ] server3.startNewHand.test.js
  - [ ] server3.validPlay.unit.test.js
  - [ ] endGame.unit.test.js
  - [ ] goAlonePhase.unit.test.js
  - [ ] orderUpPhase.unit.test.js
  - [ ] playPhase.unit.test.js
  - [ ] reconnectionHandler.unit.test.js
  - [ ] sanity.test.js
  - [ ] scoring.unit.test.js
  - [ ] startNewHand.unit.test.js
  - [ ] stateSyncService.unit.test.js
  - [ ] uiIntegrationService.unit.test.js
- [ ] Update test documentation
- [ ] Configure test coverage reporting
- [ ] Set up CI/CD pipeline

### Test Structure Changes
```diff
- Old: test/server3.*.test.js (CommonJS)
+ New: src/test/**/*.test.js (ES Modules)
```

### Next Steps
1. **Complete Test Migration**
   - [ ] Migrate remaining test files to ES modules
   - [ ] Update test imports to use new module paths
   - [ ] Ensure all tests pass with new structure

2. **Improve Test Quality**
   - [ ] Add missing test cases
   - [ ] Improve test coverage
   - [ ] Add integration tests

3. **Documentation & Automation**
   - [ ] Update test documentation
   - [ ] Add code coverage reporting
   - [ ] Set up CI/CD pipeline

2. **Game Component Integration**
   - [x] **Game Board Component** (`/src/client/components/GameBoard`)
     - Basic layout and game state management
     - Handles keyboard navigation
     - Manages turn-based gameplay
     - Integrates with WebSocket for real-time updates
   - [x] **Player Hand Component** (`/src/client/components/PlayerHand`)
     - Displays cards in a fan layout
     - Handles card selection and hover states
     - Supports keyboard navigation
     - Visual feedback for playable cards
   - [x] **Card Playing Interaction**
     - Click/tap to select cards
     - Visual feedback for valid/invalid plays
     - Smooth animations for card plays
   - [ ] **Bidding Interface**
     - [ ] Order-up phase UI
     - [ ] Trump selection
     - [ ] Going alone option
     - [ ] Visual feedback for current bid state
   - [ ] **Score Display**
     - [ ] Current game score
     - [ ] Round-by-round history
     - [ ] Visual indicators for team scores
   - [ ] **Additional Components Needed**
     - [ ] Trick area display
     - [ ] Trump indicator
     - [ ] Turn indicator
     - [ ] Game phase indicators

2. **Offline Mode**
   - Implement local storage for game state persistence
      *only if this would be a feature required to auto-reconnect
   - Handle reconnection scenarios gracefully
   - Add client visual network offline / network issues status indicator

3. **UI Polish**
   - Add animations for card plays
   - Improve mobile responsiveness
   - Add sound effects
   - Implement game theme and styling

2. **UI Feedback**
   - Add visual indicators for connection status
   - Show loading states during reconnection
   - Add toast notifications for important game events

3. **Testing**
   - Add end-to-end tests for reconnection scenarios
   - Test with simulated network conditions
   - Verify state consistency after reconnection

### Medium Priority
1. **Performance Optimization**
   - Implement state diffing to reduce WebSocket payload
   - ???  Add client-side prediction for smoother gameplay
   - Optimize html client rendering performance
   - Implement virtual scrolling for game history
   - ?? Add code splitting for better load times

2. **Accessibility**
   - Add keyboard navigation
   - Implement screen reader support
   - Add high contrast mode
   - Ensure color contrast meets WCAG guidelines

3. **Analytics**
   - Add game metrics collection
   - Track player actions and game outcomes
   - Monitor performance metrics
   - Implement error tracking

2. **Enhanced Features**
   - Add game history and statistics
   - Implement player profiles and matchmaking
   - Add chat functionality

3. **Testing**
   - Test with various network conditions

2. **Enhanced Features**
   - Add current game history and statistics
   - Implement player profiles
   - Add chat functionality

3. **Documentation**
   - Document WebSocket API

- **Recently Completed:**
  - Implemented MongoDB-based game state persistence in `db/gameRepository.js`
  - Created `GameStateManager` for handling game state serialization/deserialization
  - Added configuration management for database connections
  - Implemented in-memory caching for active games
  - Added TTL (Time-To-Live) for inactive games (24h)
  - Added player-specific game lookup functionality

- **Recently Completed:**
  - Implemented end-game conditions in `game/phases/endGame.js`
  - Added comprehensive scoring logic including:
    - Standard point calculation
    - March (winning all 5 tricks) for 2 points
    - Euchre (failing to make bid) awards 2 points to opponents
  - Added game over detection and handling
  - Implemented new game initialization
  - Added match statistics tracking
  - Created comprehensive test suite for end-game scenarios

- **Recently Completed:**
  - Implemented main game play loop in `game/phases/playPhase.js`
  - Added comprehensive trick-taking logic with support for:
    - Following suit rules
    - Trump card handling
    - Left bower as highest trump
    - Trick winner determination
  - Added extensive test coverage for play phase
  - Implemented hand completion and transition to scoring phase

- **Recently Completed:**
  - Implemented "go alone" functionality in `game/phases/goAlonePhase.js`
  - Added comprehensive tests for go alone phase
  - Updated game state management for solo play

- **Next Steps:**
  1. Complete migration of game logic from `server3.js` to modular files
  2. Update and expand test coverage for all modules
  3. Implement remaining game phase handlers
  4. Optimize WebSocket communication
  5. Update client-side code to work with new API
  6. Deploy and monitor performance

## Project Structure

   The new modular structure organizes the codebase into logical components:

```
   euchre-multiplayer/
   ├── src/
   │   ├── game/
   │   │   ├── deck.js         # Card deck management
   │   │   ├── player.js       # Player state and actions
   │   │   ├── gameLogic.js    # Core game rules and flow
   │   │   └── scoring.js      # Scoring calculations
   │   ├── server/
   │   │   ├── server.js       # Main server entry point
   │   │   ├── websocket.js    # WebSocket connection handling
   │   │   └── routes.js       # API routes and endpoints
   │   ├── utils/
   │   │   ├── logger.js       # Logging utilities
   │   │   └── config.js       # Configuration settings
   │   └── index.js            # Application entry point
   ├── tests/
   │   ├── unit/
   │   ├── integration/
   │   └── e2e/
   ├── docs/
   │   └── migration.md        # This file
   ├── package.json
   └── README.md
```

## Migration Steps

1. **Analysis:** Reviewed `server3.js` to identify logical components (game logic, networking, utilities).
2. **Planning:** Designed the new directory structure and module responsibilities.
3. **Refactoring:** Split `server3.js` into smaller files under `src/`.
4. **Testing:** Wrote unit tests for each module to ensure functionality.
5. **Integration:** Connected modules via `index.js` and verified interactions.
6. **Documentation:** Updated `migration.md` with progress and details.

## Testing Strategy

- **Unit Tests:** Test individual modules (e.g., `deck.js`, `gameLogic.js`) for correctness.
- **Integration Tests:** Verify that modules interact correctly (e.g., WebSocket with game logic).
- **End-to-End Tests:** Simulate a full game with multiple clients to ensure stability.

Tools:
- Jest for unit and integration testing
- Custom scripts for E2E testing with simulated clients

## Deployment Guide

### Prerequisites

- Node.js v16+
- npm v8+
- Git

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/euchre-multiplayer.git
   cd euchre-multiplayer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
4. Access the game at `ws://localhost:3000`.

## Troubleshooting

- **WebSocket Connection Fails:**
  - Ensure port 3000 is open and not blocked by a firewall.
  - Check server logs via `logger.js` output.

- **Game Logic Errors:**
  - Verify `gameLogic.js` is correctly imported in `index.js`.
  - Run unit tests: `npm test`.

- **Need Help?**
  - Open an issue at `https://github.com/yourusername/euchre-multiplayer/issues`.

## Migration Timeline

- **Week 1:** Analysis and planning
- **Week 2:** Refactoring and initial module creation
- **Week 3:** Testing and integration
- **Week 4:** Documentation and final testing

## Initial Setup

To set up the development environment:

1. Install Node.js and npm.
2. Clone the repo and run `npm install`.
3. Use `npm run dev` for development mode with hot reloading.

## Development Workflow

- Create a branch for changes: `git checkout -b feature/your-feature`.
- Commit changes with clear messages.
- Run tests before pushing: `npm test`.
- Submit a pull request for review.

## Migration Process

The migration followed a phased approach:
- Extracted game logic into `game/` directory.
- Moved WebSocket code to `server/websocket.js`.
- Centralized utilities in `utils/`.

## Detailed Migration Guide

### Step 1: Game Logic
- Moved deck-related code to `deck.js`.
- Isolated player management in `player.js`.

### Step 2: Networking
- Separated WebSocket logic into `websocket.js`.
- Defined routes in `routes.js`.

### Step 3: Testing
- Added test cases for each module in `tests/`.

## Next Steps

- Complete remaining tests.
- Deploy to a staging environment.
- Gather feedback from users.

## Known Issues

- Occasional WebSocket disconnects under high load.
- Scoring edge case with trump cards not fully tested.

## Rollback Plan

If issues arise:
1. Revert to `server3.js` by checking out the previous commit.
2. Stop the modular server and restart with the old setup.
