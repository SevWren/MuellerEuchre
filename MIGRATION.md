# Migration to Modular Structure

This document outlines the changes made to restructure the Euchre multiplayer game server from a single `server3.js` file to a modular architecture.

## Current Status: In Progress

### ✅ Completed Tasks

- Created modular directory structure under `src/`
- Set up core configuration in `src/config/constants.js`
- Implemented utility modules:
  - `src/utils/logger.js` - Logging functionality
  - `src/utils/deck.js` - Card and deck operations
  - `src/utils/players.js` - Player management
- Created game state management in `src/game/state.js`
- Implemented game phases:
  - `src/game/phases/bidding.js` - Bidding phase logic
  - `src/game/phases/playing.js` - Playing phase logic
  - `src/game/phases/scoring.js` - Scoring phase logic
- Updated `package.json` with new scripts and dependencies
- Created migration tools:
  - `migrate.js` - Analyzes and suggests module organization
  - `init-modules.js` - Creates module files with stubs
- Added comprehensive `.gitignore`
- Fixed linting issues in migrated code

### 🚧 In Progress

- Migrating remaining game logic from `server3.js` to modular structure
- Implementing socket event handlers in the new structure
- Updating and writing new tests for the modular code

### 📋 Remaining Tasks

1. **Complete Core Game Logic Migration**
   - [x] Implemented playing phase logic (trick-taking, turn management)
   - [x] Implemented scoring phase logic (points calculation, game win conditions)
   - [ ] Move remaining game logic from `server3.js` to appropriate modules
   - [ ] Update all imports/exports

2. **Socket.IO Handlers**
   - [ ] Create `src/socket/` directory structure
   - [ ] Move socket event handlers from `server3.js`
   - [ ] Implement proper error handling and logging

3. **Testing**
   - [ ] Update existing tests for new module structure
   - [ ] Add unit tests for new modules
   - [ ] Add integration tests for game flow
   - [ ] Test edge cases and error conditions

4. **Documentation**
   - [ ] Update README.md with new setup instructions
   - [ ] Add JSDoc comments to all functions
   - [ ] Document API endpoints and socket events
   - [ ] Create API reference documentation

5. **Cleanup**
   - [ ] Remove deprecated code from `server3.js`
   - [ ] Verify all functionality works as expected
   - [ ] Optimize imports and dependencies
   - [ ] Perform final code review

## New Project Structure

```text
src/
├── config/               # Configuration and constants
│   └── constants.js      # Game constants and enums
├── game/                 # Core game logic
│   ├── state.js          # Game state management
│   └── phases/           # Game phase handlers
├── public/               # Static files (HTML, CSS, client JS)
├── socket/               # Socket.IO handlers and middleware
├── test/                 # Test files
└── utils/                # Utility functions
    ├── deck.js          # Card and deck utilities
    ├── logger.js        # Logging utilities
    └── players.js       # Player-related utilities
```

## Key Changes

1. **Modular Code Organization**
   - Split the monolithic `server3.js` into logical modules
   - Each module has a single responsibility
   - Improved code organization and maintainability

2. **ES Modules**
   - Switched from CommonJS to ES modules
   - Added `"type": "module"` to package.json
   - Updated import/export syntax

3. **Dependency Management**
   - Added `nodemon` for development
   - Updated test scripts to support ES modules
   - Added `--experimental-vm-modules` flag for Mocha

## Migration Steps

### Initial Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Update Environment**
   - Ensure you're using Node.js 14+ (recommended: LTS version)
   - Install nodemon globally if needed: `npm install -g nodemon`

### Development Workflow

1. **Running the Server**
   - Development: `npm run dev` (with hot-reload)
   - Production: `npm start`

2. **Running Tests**
   - Run all tests: `npm test`
   - Run tests in watch mode: `npm run test:watch`
   - Run specific test file: `npx mocha path/to/test.js`

3. **Migration Tools**
   - Analyze codebase: `npm run migrate`
   - Initialize new modules: `npm run init:modules`

### Migration Process

1. **For Each Module**

  
   a. Create module file if it doesn't exist
   b. Move related functions from server3.js
   c. Update imports/exports
   d. Write/update tests
   e. Test functionality
   f. Update documentation
   ```

2. **After Each Module**
   - Run tests
   - Commit changes
   - Update this document

## Detailed Migration Guide

### 1. Core Game Logic Migration

#### 1.1 Game Phases

- [ ] `src/game/phases/bidding.js`
  - [ ] `handleOrderUpDecision`
  - [ ] `handleDealerDiscard`
  - [ ] `handleCallTrumpDecision`
  - [ ] `handleGoAloneDecision`

- [x] `src/game/phases/playing.js`
  - [x] `startNewHand` - Initializes a new hand with proper game state
  - [x] `handlePlayCard` - Processes card plays and manages trick logic
  - [x] `determineTrickWinner` - Determines the winner of each trick

- [x] `src/game/phases/scoring.js`
  - [x] `scoreCurrentHand` - Calculates scores and updates game state
  - [x] `checkForGameWin` - Determines if a team has won the game
  - [x] `resetGame` - Prepares the game for a new match

#### 1.2 Game Logic

- [ ] `src/game/logic/validation.js`
  - [ ] `isValidPlay`
  - [ ] `validateCardPlay`
  - [ ] `canPlayCard`

#### 1.3 State Management

- [ ] `src/game/state.js`
  - [ ] `resetGameState`
  - [ ] `updateGameState`
  - [ ] `broadcastGameState`
  - [ ] `addGameMessage`

### 2. Socket.IO Implementation

#### 2.1 Event Handlers

- [ ] `src/socket/connection.js`
  - [ ] Handle player connections
  - [ ] Handle disconnections
  - [ ] Handle reconnections

- [ ] `src/socket/events.js`
  - [ ] Game actions
  - [ ] Chat messages
  - [ ] Player actions

#### 2.2 Middleware

- [ ] `src/socket/middleware.js`
  - [ ] Authentication
  - [ ] Rate limiting
  - [ ] Error handling

### 3. Testing Strategy

#### 3.1 Unit Tests

- [ ] Utility functions
- [ ] Game logic
- [ ] State management

#### 3.2 Integration Tests

- [ ] Game flow
- [ ] Player interactions
- [ ] Score calculations

#### 3.3 E2E Tests

- [ ] Full game simulation
- [ ] Edge cases
- [ ] Error conditions

### 4. Documentation Updates

#### 4.1 Code Documentation

- [ ] JSDoc for all functions
- [ ] Module documentation
- [ ] API documentation

#### 4.2 User Documentation

- [ ] Setup instructions
- [ ] Game rules
- [ ] Troubleshooting guide

### 5. Final Steps

1. **Code Review**
   - Review all changes
   - Ensure consistent coding style
   - Verify all tests pass

2. **Performance Testing**
   - Test with multiple concurrent games
   - Monitor memory usage
   - Optimize where needed

3. **Deployment**
   - Update deployment scripts
   - Configure environment variables
   - Monitor after deployment

4. **Post-Migration**
   - Archive old `server3.js`
   - Update version number
   - Create release notes

## Next Steps

1. **Complete the Migration**
   - Move remaining game logic from `server3.js` to appropriate modules
   - Update client-side code to work with the new server structure
   - Add more unit tests for the new modules

2. **Documentation**

   - Update README.md with new setup instructions
   - Add JSDoc comments to all functions and modules
   - Document the API endpoints and socket events

3. **Testing**
   - Add integration tests
   - Set up CI/CD pipeline
   - Add end-to-end tests

## Known Issues

- Some game logic still needs to be migrated from the old `server3.js`
- Client-side code needs updates to work with the new server structure
- Test coverage needs improvement

## Rollback Plan

If you need to revert to the old structure:

1. Check out the commit before the migration
2. Restore the original `server3.js`
3. Revert package.json changes
4. Remove the new directories if needed

## Contributing

When making changes, please follow these guidelines:

1. Keep modules focused and single-purpose
2. Write tests for new functionality
3. Document public APIs with JSDoc
4. Follow the existing code style
5. Update documentation when making changes
