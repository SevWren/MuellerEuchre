# Test Migration Plan: CommonJS to ES Modules

# Table of Contents
 1. [Overview](#overview)
 2. [Current State Analysis](#current-state-analysis)
 3. [Migration Strategy](#migration-strategy)
 4. [Detailed Implementation Plan](#detailed-implementation-plan)
 5. [Verification Process](#verification-process)
 6. [Rollback Plan](#rollback-plan)
 7. [Progress Tracking](#progress-tracking)


## Overview

     This document outlines the plan to migrate test files from CommonJS to ES Modules (ESM) in the Euchre Multiplayer project. The migration will ensure better compatibility with modern JavaScript practices and improve module loading performance.


## Current State Analysis


### Test File Structure

     - Total test files: 36
     - File patterns:
          - `*.unit.test.js`: Unit tests for specific components
          - `server3.*.test.js`: Legacy server tests
          - `*.test.js`: General test files


### Dependencies

     - **Test Runner**: Mocha
     - **Assertion Libraries**:
          - `assert` (Node.js built-in)
          - `chai`
     - **Mocking/Stubbing**:
          - `proxyquire`
          - `sinon`
     - **Other**:
          - `esm` (for ES module support)
          - `c8` (test coverage)


### Current Issues

     1. Mix of CommonJS (`require`) and ES Module (`import`) syntax
     2. Inconsistent test structure across files
     3. Some tests rely on Node.js globals
     4. Mocking strategy needs updating for ESM


## Migration Strategy

### 1. Configuration Updates

     - [x] Update `package.json` for ESM support
          - Added ESM-related devDependencies
          - Updated test scripts to use relative paths
     - [x] Configure Mocha for ESM
          - Created `.mocharc.cjs` with ESM configuration
          - Added Babel configuration for ES modules
     - [x] Set up test coverage with `c8`
          - Added coverage scripts to package.json
     - [ ] Update CI/CD pipeline configuration

### 2. Test File Conversion

     - [ ] Convert simple test files first
     - [ ] Update core game logic tests
     - [ ] Migrate server3 integration tests
     - [ ] Update utility and helper tests

### 3. Testing and Validation

     - [ ] Run tests after each file conversion
     - [ ] Verify test coverage
     - [ ] Update documentation

  - [ ] Update documentation

## Detailed Implementation Plan


### Phase 1: Setup and Configuration


#### 1.1 Update package.json

     ```json
     {
          "type": "module",
          "scripts": {
               "test": "mocha",
               "test:watch": "mocha --watch",
               "test:coverage": "c8 mocha",
               "test:coverage:ci": "c8 --reporter=lcov mocha",
               "coverage:report": "c8 report --reporter=text-lcov | coveralls"
          }
     }
     ```


#### 1.2 Create/Update Configuration Files

     **.mocharc.cjs**
     ```javascript
     module.exports = {
          extension: ['js'],
          spec: ['test/**/*.test.js'],
          timeout: 5000,
          recursive: true,
          require: ['esm', 'chai/register-assert.js']
     };
     ```


### Phase 2: Test File Migration


#### 2.1 Simple Test files

     1. [x] `sanity.test.js` - Basic test case (converted)
     2. [x] `simple.test.js` - Already using ESM
     3. [ ] `scoring.unit.test.js` - Basic scoring logic


#### 2.2 Core Game Logic

1. [ ] `endGame.unit.test.js`
2. [ ] `playPhase.unit.test.js`
3. [ ] `goAlonePhase.unit.test.js`
4. [ ] `orderUpPhase.unit.test.js`
5. [ ] `reconnectionHandler.unit.test.js`
6. [ ] `startNewHand.unit.test.js`
7. [ ] `stateSyncService.unit.test.js`
8. [ ] `uiIntegrationService.unit.test.js`
9. [ ] `validation.unit.test.js`

#### 2.3 Server3 Tests

     1. [ ] `server3.callTrump.unit.test.js`
     2. [ ] `server3.cardUtils.unit.test.js`
     3. [ ] `server3.dealerDiscard.test.js`
     4. [ ] `server3.deck.unit.test.js`
     5. [ ] `server3.errorHandling.test.js`
     6. [ ] `server3.gameState.unit.test.js`
     7. [ ] `server3.goAlone.unit.test.js`
     8. [ ] `server3.integration.test.js`
     9. [ ] `server3.logging.unit.test.js`
    10. [ ] `server3.multiGame.test.js`
    11. [ ] `server3.orderUp.unit.test.js`
    12. [ ] `server3.performance.test.js`
    13. [ ] `server3.persistence.test.js`
    14. [ ] `server3.playCard.additional.test.js`
    15. [ ] `server3.playCard.unit.test.js`
    16. [ ] `server3.reconnection.test.js`
    17. [ ] `server3.scoreHand.unit.test.js`
    18. [ ] `server3.security.test.js`
    19. [ ] `server3.socket.unit.test.js`
    20. [ ] `server3.spectator.test.js`
    21. [ ] `server3.startNewHand.test.js`
    22. [ ] `server3.unit.test.js`
    23. [ ] `server3.validPlay.unit.test.js`
    24. [ ] `server3.validation.test.js`


### Phase 3: Testing and Validation

     1. [ ] Run all tests after each file conversion
     2. [ ] Verify test coverage meets requirements
     3. [ ] Update documentation
     4. [ ] Perform integration testing
     5. [ ] Conduct performance testing


## Verification Process


### Coverage Requirements

     - Statement coverage: 80% minimum
     - Branch coverage: 75% minimum
     - Function coverage: 80% minimum
     - Line coverage: 80% minimum


## Rollback Plan


     If issues arise during migration:

     1. Revert to the last known good commit
     2. Restore from backup if necessary
     3. Run full test suite to verify stability


## Progress Tracking


### Completed Tasks

     - [x] Initial analysis of test files
     - [x] Created migration plan
     - [x] Verified simple test conversion
     - [x] Converted `sanity.test.js` and `endGame.unit.test.js`
     - [x] Set up test environment and configurations


### In Progress

     - [x] Configuration updates
     - [ ] Test file migration
          - [x] Simple test files
          - [ ] Core game logic tests
          - [ ] Server3 integration tests
          - [ ] Utility and helper tests


### Pending

     - [ ] Final verification
     - [ ] Documentation updates


## Notes

     - All test files must be converted to use ES modules
     - Maintain backward compatibility where needed
     - Follow consistent 5-space indentation in all files
     - Ensure proper spacing after headers
     - Update test assertions to use Chai's expect syntax
- Update documentation to reflect changes
