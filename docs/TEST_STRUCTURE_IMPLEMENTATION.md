# Test Directory Restructuring Implementation Guide

## 🚧 Prerequisites

Before starting the test restructuring, please ensure these critical items are addressed:

### 1. Test Stability
- [ ] All existing tests are passing
- [ ] No flaky tests in the test suite, e.g.:
  - Tests that fail intermittently due to race conditions
  - Tests that fail because of external dependencies (e.g. network connectivity)
  - Tests that fail because of timing issues (e.g. tests that rely on `setTimeout`)
- [ ] Test failures are properly reported and visible in CI:
  - View test failure output in the GitHub Actions UI by clicking on the "Tests" tab
  - View test failure output in the terminal by running `npm test`
  - Implement test failure reporting by properly using `expect` and `assert` statements in test files

### 2. Codebase Health
- [ ] Resolve any critical bugs in test files, such as:
  - Tests that crash the Node.js process
  - Tests that run indefinitely or hang
  - Tests that result in an unexpected error or exception
  - Tests that cause a test runner to exit unexpectedly
- [ ] Fix any test-related ESLint errors, such as:
  - Unresolved imports
  - Missing or invalid type annotations
  - Incorrect or missing function return types
  - Unused variables or imports
- [ ] Ensure consistent test naming conventions:
  - **Avoid**: Generic names like `test-utils.js` or `testHelpers.js` in multiple locations
    - ❌ `test/utils/test-utils.js`
    - ❌ `test/game/logic/test-utils.js`
    - ✅ Use specific names like `test/utils/playerTestUtils.js` or `test/game/logic/biddingTestUtils.js`
  
  - **Test Files**: Should match the module they test with `.test.js` or `.spec.js` suffix
    - ❌ `test/game.js`
    - ✅ `test/game/gameState.unit.test.js`
    - ✅ `test/game/phases/biddingPhase.integration.test.js`
  
  - **Test Descriptions**: Should describe behavior, not implementation
    - ❌ `test('test handleBid', () => { ... })`
    - ❌ `test('works', () => { ... })`
    - ✅ `test('should process valid bid when player has sufficient points', () => { ... })`
    - ✅ `test('should throw InvalidBidError when bid is higher than player points', () => { ... })`
  
  - **Mock Files**: Should mirror the source structure with `__mocks__`
    - ❌ `test/mocks/gameService.js`
    - ✅ `test/__mocks__/services/gameService.js`
    - ✅ `test/__mocks__/utils/playerUtils.js`
  
  - **Fixture Files**: Should describe the test data they contain
    - ❌ `test/data/state1.js`
    - ✅ `test/__fixtures__/game/states/initialGameState.js`
    - ✅ `test/__fixtures__/players/playerWithWinningHand.js`

### 3. Infrastructure
- [ ] CI pipeline is working correctly
- [ ] Test coverage reporting is functional
- [ ] Dependencies are up-to-date

### 4. Team Alignment
- [ ] Team is aware of upcoming test structure changes
- [ ] Code freeze scheduled if needed
- [ ] Backup of current test directory available

## Tracking Your Progress

This guide includes specific completion criteria for each task. As you work through the implementation, check off completed items and verify all criteria are met before moving to the next phase.

### How to Track Progress
1. **Checklist Items**: Each task includes a checklist of completion criteria
2. **Verification Steps**: Specific commands or validations to confirm completion
3. **Code Examples**: Real examples from the codebase to guide implementation
4. **Common Pitfalls**: Watch out for these issues specific to our codebase

## Table of Contents
1. [Overview](#overview)
2. [Phase 1: Initial Setup](#phase-1-initial-setup-1-2-days)
3. [Phase 2: Migrate Existing Mocks and Fixtures](#phase-2-migrate-existing-mocks-and-fixtures-3-5-days)
4. [Phase 3: Update Test Files](#phase-3-update-test-files-ongoing)
5. [Documentation Updates](#documentation-updates)
6. [CI/CD Integration](#cicd-integration)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Rollout Strategy](#rollout-strategy)
9. [Verification](#verification)
10. [Cleanup](#cleanup)
11. [Additional Resources](#additional-resources)

## Overview
This document outlines the step-by-step process for implementing a structured test directory with `__mocks__` and `__fixtures__` directories. Each section includes learning resources to help understand and implement the changes effectively.

## Phase 1: Initial Setup (1-2 days)

### 1.1 Create Base Directory Structure

#### Completion Criteria
- [ ] All directories created with correct permissions
- [ ] Directory structure matches exactly:
  ```
  test/
  ├── __fixtures__/
  │   ├── game/
  │   │   ├── states/
  │   │   └── cards/
  │   └── players/
  └── __mocks__/
      ├── modules/
      ├── services/
      └── utils/
  ```
- [ ] Verify with command: `tree test/__fixtures__ test/__mocks__`

#### Implementation Steps
```bash
# Create directory structure
mkdir -p test/__fixtures__/game/states
mkdir -p test/__fixtures__/game/cards
mkdir -p test/__fixtures__/players
mkdir -p test/__mocks__/modules
mkdir -p test/__mocks__/services
mkdir -p test/__mocks__/utils
```

#### Codebase-Specific Examples
- Existing test utilities to migrate:
  - `test/utils/testMocks.js` → `test/__mocks__/utils/`
  - `test/game/logic/test-utils.js` → `test/__fixtures__/game/`

**Learning Resources:**
- [Jest Documentation: Manual Mocks](https://jestjs.io/docs/manual-mocks)
- [Testing Library: Setting up Test Utilities](https://testing-library.com/docs/react-testing-library/setup)

**Key Questions to Explore:**
1. What are the benefits of separating mocks and fixtures?
2. How does Jest's module resolution work with the `__mocks__` directory?
3. What's the difference between manual and automatic mocks in Jest?

### 1.2 Add Documentation Files

#### Completion Criteria
- [ ] `test/__fixtures__/README.md` created with:
  - [ ] Directory structure documentation
  - [ ] Usage examples with code snippets
  - [ ] Contribution guidelines
- [ ] `test/__mocks__/README.md` created with:
  - [ ] Mocking guidelines
  - [ ] Examples of common mocks
  - [ ] Naming conventions
- [ ] Documentation reviewed by team

#### Implementation Steps
1. Create `test/__fixtures__/README.md`
2. Create `test/__mocks__/README.md`
3. Add documentation for:
   - Directory structure
   - Naming conventions
   - Usage examples
   - Contribution guidelines

#### Codebase-Specific Examples
```markdown
# Fixtures for Game States

## Example: Basic Game State
```javascript
// test/__fixtures__/game/states/basic.js
export function createBasicGameState() {
  return {
    gamePhase: 'LOBBY',
    players: {
      south: { id: 'player1', name: 'Player 1' },
      // ... other players
    },
    // ... other game state properties
  };
}
```

## Mocking Guidelines

### Example: Mocking Player Utilities
```javascript
// test/__mocks__/utils/playerUtils.js
export function createMockPlayerUtils() {
  return {
    getNextPlayer: sinon.stub().returns('east'),
    getPartner: sinon.stub().returns('north')
  };
}
```
Create `test/__fixtures__/README.md` and `test/__mocks__/README.md` with guidelines and usage examples.

**Learning Resources:**
- [Documenting JavaScript Projects](https://jsdoc.app/)
- [Keep a Changelog](https://keepachangelog.com/)

**Key Questions to Explore:**
1. What information is most valuable in fixture/mock documentation?
2. How can we make the documentation maintainable?
3. What examples would be most helpful for new contributors?

## Phase 2: Migrate Existing Mocks and Fixtures (3-5 days)

### 2.1 Migrate High-Value Mocks

#### Completion Criteria
- [ ] `test/utils/testMocks.js` migrated to appropriate `__mocks__` directories
- [ ] All tests passing with new mock locations
- [ ] Old mock files deprecated with `@deprecated` JSDoc
- [ ] Update log messages to point to new locations

#### Implementation Steps
1. **Game Service Mocks**
   ```bash
   # Create service mock directory
   mkdir -p test/__mocks__/services
   
   # Migrate game service mocks
   mv test/utils/testMocks.js test/__mocks__/services/gameService.js
   ```

2. **Update Imports**
   - Search for: `from ['"]\.\./utils/testMocks['"]`
   - Replace with: `from '../../__mocks__/services/gameService'`

#### Codebase-Specific Examples
```javascript
// Before (in test files)
import { createMockGameState } from '../../test-utils';

// After
import { createMockGameState } from '../../__fixtures__/game/states';
```

### 2.2 Migrate Fixtures

#### Completion Criteria
- [ ] Game state fixtures moved to `test/__fixtures__/game/states/`
- [ ] Player fixtures moved to `test/__fixtures__/players/`
- [ ] Card-related fixtures moved to `test/__fixtures__/game/cards/`
- [ ] All imports updated to reference new locations

#### Implementation Steps
1. **Identify Fixtures**
   ```bash
   # Find large object literals in test files
   grep -r "= {" test/ --include="*.test.js" | grep -v "function"
   ```

2. **Extract Common Fixtures**
   ```javascript
   // test/__fixtures__/game/states/bidding.js
   export function createBiddingState() {
     return {
       gamePhase: 'BIDDING',
       // ... state properties
     };
   }
   ```

3. **Update Test Imports**
   ```javascript
   // Before
   const gameState = {
     // large object literal
   };
   
   // After
   import { createBiddingState } from '../../__fixtures__/game/states/bidding';
   const gameState = createBiddingState();
   ```

#### Common Pitfalls
- **Circular Dependencies**: Watch for circular references between fixtures
- **Test Isolation**: Ensure fixtures don't share mutable state between tests
- **Performance**: Large fixtures should be lazy-loaded when possible

### 2.1 Migrate High-Value Mocks
1. **Game Service Mocks**
   - Source: `test/utils/testMocks.js`
   - Target: `test/__mocks__/services/gameService.js`

2. **Player Utilities**
   - Source: `test/utils/testMocks.js` (player-related)
   - Target: `test/__mocks__/utils/playerUtils.js`

**Learning Resources:**
- [Jest: Mock Functions](https://jestjs.io/docs/mock-functions)
- [Sinon.js Documentation](https://sinonjs.org/)

**Key Questions to Explore:**
1. How do we ensure mock consistency across test files?
2. What's the best way to handle shared mock behavior?
3. How can we make mocks more maintainable?

### 2.2 Migrate Fixtures
1. **Game States**
   - Source: Various test files
   - Target: `test/__fixtures__/game/states/`

2. **Test Data**
   - Source: Test files with large data objects
   - Target: `test/__fixtures__/data/`

**Learning Resources:**
- [Test Data Builders Pattern](https://www.informit.com/articles/article.aspx?p=491514)
- [Factory Bot for JavaScript](https://github.com/tatyshev/factory-girl)

**Key Questions to Explore:**
1. What makes a good test fixture?
2. How can we make fixtures reusable across tests?
3. What's the best way to handle complex object hierarchies?

## Phase 3: Update Test Files (Ongoing)

### 3.1 Update Imports and Mock Usage

#### Completion Criteria
- [ ] All test files updated to use new import paths
- [ ] No direct references to old test utility locations
- [ ] All tests passing with updated imports
- [ ] ESLint rules passing

#### Implementation Steps
1. **Update Import Paths**
   ```bash
   # Find and replace old import paths
   find test/ -type f -name "*.test.js" -exec sed -i '' 's/from "\.\.\/test-utils"/from "..\/__fixtures__\/game"/g' {} \;
   ```

2. **Update Mock References**
   ```javascript
   // Before
   jest.mock('../../../src/services/gameService', () => ({
     // mock implementation
   }));
   
   // After
   jest.mock('../../../src/services/gameService'); // Uses __mocks__/services/gameService.js
   ```

3. **Verify Test Isolation**
   ```bash
   # Run tests with --runInBand to ensure isolation
   npm test -- --runInBand
   ```

#### Codebase-Specific Examples
```javascript
// test/game/phases/biddingPhase.unit.test.js
// Before
import { createBiddingState } from '../../../test-utils';

// After
import { createBiddingState } from '../../../__fixtures__/game/states/bidding';
```

### 3.2 Update Test Structure

#### Completion Criteria
- [ ] Test files follow consistent structure:
  ```
  // 1. Imports
  // 2. Test setup
  // 3. Test cases
  // 4. Cleanup
  ```
- [ ] All tests use fixtures from `__fixtures__`
- [ ] All mocks use `__mocks__`
- [ ] Test coverage maintained or improved

#### Implementation Steps
1. **Standardize Test Structure**
   ```javascript
   // 1. Imports
   import { expect } from 'chai';
   import sinon from 'sinon';
   import { createBiddingState } from '../../__fixtures__/game/states/bidding';
   
   // 2. Test setup
   describe('BiddingPhase', () => {
     let sandbox;
     let gameState;
     
     beforeEach(() => {
       sandbox = sinon.createSandbox();
       gameState = createBiddingState();
       // Setup mocks
     });
     
     afterEach(() => {
       sandbox.restore();
     });
     
     // 3. Test cases
     describe('handleBid', () => {
       it('should process valid bid', () => {
         // Test implementation
       });
     });
   });
   ```

2. **Update Test Runner**
   ```json
   // package.json
   {
     "scripts": {
       "test:structure": "node scripts/verify-test-structure.js"
     }
   }
   ```

#### Common Pitfalls
- **Test Pollution**: Ensure proper cleanup in `afterEach`
- **Mock Leakage**: Reset mocks between tests
- **Performance**: Avoid unnecessary setup in `beforeEach`

### 3.1 Update Imports and Mock Usage
```javascript
// Before
import { createMockGameState } from '../../test-utils';

// After
import { createMockGameState } from '../../__fixtures__/game/states';
```

**Learning Resources:**
- [JavaScript Modules: Import/Export](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Jest: ES Module Mocks](https://jestjs.io/docs/ecmascript-modules)

**Key Questions to Explore:**
1. How does module resolution work in our test environment?
2. What's the impact of import paths on test performance?
3. How can we automate import updates?

## Documentation Updates

### 4.1 Update CONTRIBUTING.md

#### Completion Criteria
- [ ] New testing section added to CONTRIBUTING.md
- [ ] Documentation covers:
  - [ ] Directory structure
  - [ ] Naming conventions
  - [ ] Mocking patterns
  - [ ] Fixture patterns
  - [ ] Test structure
- [ ] Examples provided for common scenarios
- [ ] Documentation reviewed by team

#### Implementation Steps
1. **Add Testing Section**
   ```markdown
   ## Testing Guidelines
   
   ### Directory Structure
   ```
   test/
   ├── __fixtures__/    # Test data and static resources
   │   ├── game/       # Game-related test data
   │   └── players/    # Player-related test data
   └── __mocks__/      # Manual mocks
       ├── services/   # Service mocks
       └── utils/      # Utility mocks
   ```
   
   ### Mocking Patterns
   ```javascript
   // Good: Using __mocks__ directory
   jest.mock('../../../src/services/gameService');
   
   // Bad: Inline mocks (avoid when possible)
   jest.mock('../../../src/services/gameService', () => ({
     // mock implementation
   }));
   ```
   
   ### Fixture Patterns
   ```javascript
   // Good: Using factory function
   export function createPlayer(id, name) {
     return { id, name, score: 0 };
   }
   
   // Bad: Hardcoded objects (avoid)
   const player = { id: 1, name: 'Test', score: 0 };
   ```
   ```

2. **Add Migration Guide**
   ```markdown
   ## Migrating to New Test Structure
   
   ### Updating Imports
   ```javascript
   // Before
   import { createGameState } from '../../test-utils';
   
   // After
   import { createGameState } from '../../__fixtures__/game/states';
   ```
   
   ### Moving Mocks
   ```javascript
   // Before (in test file)
   jest.mock('../../../src/services/gameService', () => ({
     // mock implementation
   }));
   
   // After (in test/__mocks__/services/gameService.js)
   export default {
     // mock implementation
   };
   ```
   ```

#### Codebase-Specific Examples
```markdown
### Example: Testing Bidding Logic

```javascript
// test/game/phases/biddingPhase.unit.test.js
import { createBiddingState } from '../../__fixtures__/game/states/bidding';
import { handleBid } from '../../../src/game/phases/biddingPhase';

describe('BiddingPhase', () => {
  let gameState;
  
  beforeEach(() => {
    gameState = createBiddingState();
  });
  
  it('should process valid bid', () => {
    const result = handleBid(gameState, 'north', 'pass');
    expect(result).to.have.property('bids');
    expect(result.bids).to.include('north:pass');
  });
});
```
```

### 4.1 Update CONTRIBUTING.md
Add testing guidelines and best practices.

**Learning Resources:**
- [How to Write a Good README](https://www.freecodecamp.org/news/how-to-write-a-good-readme-file/)
- [Conventional Commits](https://www.conventionalcommits.org/)

**Key Questions to Explore:**
1. What information do contributors need most?
2. How can we make the documentation actionable?
3. What examples would be most helpful?

## CI/CD Integration

### 5.1 Add Lint Rules and Verification Scripts

#### Completion Criteria
- [ ] ESLint rules added to prevent deprecated imports
- [ ] Test structure verification script created
- [ ] CI pipeline updated to verify test structure
- [ ] Pre-commit hooks updated

#### Implementation Steps
1. **Update ESLint Configuration**
   ```javascript
   // .eslintrc.js
   module.exports = {
     rules: {
       'no-restricted-imports': ['error', {
         paths: [{
           name: '../../test-utils',
           message: 'Use __fixtures__ directory instead'
         }]
       }]
     }
   };
   ```

2. **Create Verification Script**
   ```javascript
   // scripts/verify-test-structure.js
   const fs = require('fs');
   const path = require('path');
   
   // Check for direct mock usage
   function checkForInlineMocks(filePath) {
     const content = fs.readFileSync(filePath, 'utf8');
     if (content.includes('jest.mock(') && !content.includes('__mocks__')) {
       console.error(`❌ Found inline mock in ${filePath}`);
       return false;
     }
     return true;
   }
   
   // Run checks
   function verifyTestStructure() {
     // Implementation to verify test structure
   }
   
   verifyTestStructure();
   ```

3. **Update CI Pipeline**
   ```yaml
   # .github/workflows/ci.yml
   jobs:
     test-structure:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v2
         - name: Verify test structure
           run: npm run test:structure
   ```

#### Codebase-Specific Examples
```bash
# package.json
{
  "scripts": {
    "test:structure": "node scripts/verify-test-structure.js",
    "lint:test": "eslint 'test/**/*.js' --rule 'no-restricted-imports: ["error", { paths: [{ name: "../../test-utils", message: "Use __fixtures__ directory instead" }] }]'"
  }
}
```

### 5.2 Update Test Coverage

#### Completion Criteria
- [ ] Test coverage thresholds maintained
- [ ] New tests added for previously uncovered code
- [ ] Coverage reports generated

#### Implementation Steps
1. **Update Coverage Configuration**
   ```json
   // package.json
   {
     "jest": {
       "coverageThreshold": {
         "global": {
           "branches": 80,
           "functions": 85,
           "lines": 85,
           "statements": 85
         }
       }
     }
   }
   ```

2. **Generate Coverage Report**
   ```bash
   npm test -- --coverage
   ```

#### Common Pitfalls
- **False Positives**: Ensure coverage thresholds are realistic
- **Flaky Tests**: Fix or remove flaky tests
- **Slow Tests**: Optimize slow-running tests

### 5.1 Add Lint Rules and Verification Scripts
Update `.eslintrc.js` and `package.json` with test structure verification.

**Learning Resources:**
- [ESLint Rules](https://eslint.org/docs/rules/)
- [Husky: Git Hooks](https://typicode.github.io/husky/#/)

**Key Questions to Explore:**
1. What rules would help maintain test consistency?
2. How can we catch issues early in the development cycle?
3. What's the right balance between strictness and developer experience?

## Monitoring and Maintenance

### 6.1 Create Tracking Issue

#### Completion Criteria
- [ ] GitHub issue created for tracking progress
- [ ] Progress checklist added to issue
- [ ] Regular updates to track completion

#### Implementation Steps
1. **Create GitHub Issue**
   ```markdown
   # Test Directory Restructuring
   
   ## Progress
   - [ ] Phase 1: Initial Setup
     - [ ] Create directory structure
     - [ ] Add documentation
   - [ ] Phase 2: Migrate Mocks and Fixtures
     - [ ] Migrate game service mocks
     - [ ] Migrate player utilities
   - [ ] Phase 3: Update Test Files
     - [ ] Update imports
     - [ ] Standardize test structure
   - [ ] Documentation
     - [ ] Update CONTRIBUTING.md
     - [ ] Add examples
   - [ ] CI/CD Integration
     - [ ] Add lint rules
     - [ ] Update CI pipeline
   
   ## Guidelines
   - Follow patterns in `test/__fixtures__/README.md`
   - Update this issue with progress
   - Ask for help if blocked
   ```

2. **Track Progress**
   - Update the issue with completed items
   - Add comments for blockers or questions
   - Reference PRs that implement parts of the migration

#### Codebase-Specific Examples
```markdown
## Example: Completed Task

### Phase 1: Initial Setup - COMPLETED ✅
- [x] Create directory structure
- [x] Add documentation

### Phase 2: Migrate Mocks and Fixtures - IN PROGRESS 🚧
- [x] Migrate game service mocks (#123)
- [ ] Migrate player utilities

## Blockers
- Need clarification on mock structure for player utilities
- Waiting on review for #123
```

### 6.2 Regular Maintenance

#### Completion Criteria
- [ ] Schedule regular test maintenance
- [ ] Address technical debt
- [ ] Update documentation as needed

#### Implementation Steps
1. **Schedule Maintenance**
   - Set up monthly test maintenance tasks
   - Review and update test dependencies
   - Remove deprecated test utilities

2. **Address Technical Debt**
   - Create issues for test improvements
   - Prioritize high-impact changes
   - Document technical debt

3. **Update Documentation**
   - Keep documentation up to date
   - Add new examples
   - Remove outdated information

#### Common Pitfalls
- **Neglect**: Regular maintenance is crucial
- **Documentation Drift**: Keep docs in sync with code
- **Tech Debt**: Address issues early

### 6.1 Create Tracking Issue
Track progress and document decisions.

**Learning Resources:**
- [GitHub Project Management](https://docs.github.com/en/issues/tracking-your-work-with-issues/about-issues)
- [Agile Project Management](https://www.atlassian.com/agile)

**Key Questions to Explore:**
1. What metrics indicate successful adoption?
2. How can we gather feedback from the team?
3. What's the best way to track technical debt?

## Rollout Strategy

### 7.1 Phased Rollout

#### Completion Criteria
- [ ] Phase 1: Setup (Week 1)
  - [ ] Directory structure created
  - [ ] Documentation added
  - [ ] Team informed
- [ ] Phase 2: Migration (Weeks 2-3)
  - [ ] Critical paths migrated
  - [ ] Tests passing
  - [ ] Performance verified
- [ ] Phase 3: Completion (Week 4)
  - [ ] All tests migrated
  - [ ] Documentation complete
  - [ ] Old code removed

#### Implementation Steps
1. **Phase 1: Setup (Week 1)**
   - Create directories
   - Add documentation
   - Communicate changes to team

2. **Phase 2: Migration (Weeks 2-3)**
   - Migrate high-priority tests first
   - Update imports and mocks
   - Verify test coverage

3. **Phase 3: Completion (Week 4)**
   - Migrate remaining tests
   - Remove old test utilities
   - Final documentation updates

#### Codebase-Specific Examples
```markdown
## Phase 1: Setup - COMPLETED ✅

### Directory Structure
```
test/
├── __fixtures__/
│   ├── game/
│   │   ├── states/
│   │   └── cards/
│   └── players/
└── __mocks__/
    ├── services/
    └── utils/
```

### Documentation
- Added `test/__fixtures__/README.md`
- Added `test/__mocks__/README.md`
- Updated `CONTRIBUTING.md`

## Phase 2: Migration - IN PROGRESS 🚧

### Completed
- Migrated game service mocks (#123)
- Updated bidding phase tests (#124)

### In Progress
- Migrating player utilities
- Updating test imports

## Phase 3: Completion - NOT STARTED ⏳

### Pending
- Remove old test utilities
- Final documentation review
- Team training
```

### 7.2 Communication Plan

#### Completion Criteria
- [ ] Team informed of changes
- [ ] Documentation shared
- [ ] Feedback collected

#### Implementation Steps
1. **Announce Changes**
   - Send team announcement
   - Schedule onboarding session
   - Share documentation

2. **Gather Feedback**
   - Create feedback channel
   - Address concerns
   - Update documentation

3. **Follow Up**
   - Check in with team
   - Address issues
   - Celebrate success

#### Common Pitfalls
- **Poor Communication**: Keep team informed
- **Lack of Buy-in**: Address concerns early
- **Insufficient Training**: Provide resources

### 7.1 Phased Rollout
1. **Week 1**: Setup and documentation
2. **Weeks 2-3**: Migration of critical paths
3. **Week 4**: Completion and cleanup

**Learning Resources:**
- [Feature Flag Best Practices](https://launchdarkly.com/blog/feature-flag-best-practices/)
- [Progressive Delivery](https://www.weave.works/technologies/gitops/progressive-delivery/)

**Key Questions to Explore:**
1. How can we minimize disruption during the transition?
2. What's the best way to communicate changes to the team?
3. How do we handle rollback if needed?

## Verification

### 8.1 Test Coverage and Structure

#### Completion Criteria
- [ ] Test coverage meets or exceeds thresholds
- [ ] All tests pass
- [ ] Test structure verified

#### Implementation Steps
1. **Run Tests**
   ```bash
   # Run all tests
   npm test
   
   # Check coverage
   npm test -- --coverage
   ```

2. **Verify Structure**
   ```bash
   # Run structure verification
   npm run test:structure
   ```

3. **Check for Deprecated Patterns**
   ```bash
   # Find deprecated patterns
   grep -r "from ['\"]\.\./test-utils['\"]" test/
   grep -r "jest\.mock\([^_]*\.\./" test/
   ```

#### Codebase-Specific Examples
```bash
# Check for remaining test-utils imports
grep -r "from ['\"]\.\./test-utils['\"]" test/

# Check for inline mocks
grep -r "jest\.mock\([^_]*\.\./" test/ | grep -v "__mocks__"

# Verify test structure
npm run test:structure
```

### 8.2 Manual Verification

#### Completion Criteria
- [ ] Test files reviewed
- [ ] Mock usage verified
- [ ] Fixture usage verified

#### Implementation Steps
1. **Review Test Files**
   - Check for consistent structure
   - Verify mock usage
   - Check fixture usage

2. **Verify Mocks**
   - Check mock implementations
   - Verify mock resets
   - Check test isolation

3. **Verify Fixtures**
   - Check fixture organization
   - Verify fixture usage
   - Check for duplicate fixtures

#### Common Pitfalls
- **Inconsistent Structure**: Follow established patterns
- **Test Pollution**: Ensure proper cleanup
- **Duplicate Code**: Extract common patterns

### 8.1 Test Coverage and Structure
```bash
npm test -- --coverage
npm run verify-test-structure
```

**Learning Resources:**
- [Jest: Code Coverage](https://jestjs.io/docs/cli#--coverageboolean)
- [Test Coverage Best Practices](https://martinfowler.com/bliki/TestCoverage.html)

**Key Questions to Explore:**
1. What's an appropriate coverage threshold?
2. How can we measure the quality of tests, not just quantity?
3. What tools can help visualize test coverage?

## Cleanup

### 9.1 Remove Deprecated Code

#### Completion Criteria
- [ ] Old test utilities removed
- [ ] Deprecation warnings resolved
- [ ] Documentation updated

#### Implementation Steps
1. **Identify Deprecated Code**
   ```bash
   # Find deprecated test utilities
   grep -r "@deprecated" test/
   ```

2. **Remove Old Files**
   ```bash
   # Remove deprecated test utilities
   rm test/utils/test-utils.js
   ```

3. **Update Documentation**
   - Remove references to old utilities
   - Update examples
   - Verify links

#### Codebase-Specific Examples
```bash
# Find and remove deprecated test utilities
find test/ -type f -name "*.js" -exec grep -l "@deprecated" {} \; | xargs git rm

# Update imports
find test/ -type f -name "*.js" -exec sed -i '' 's/from ["']\.\.\/test-utils["']/from "..\/__fixtures__\/game"/g' {} \;
```

### 9.2 Final Verification

#### Completion Criteria
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Team trained

#### Implementation Steps
1. **Run Final Tests**
   ```bash
   npm test
   npm run test:structure
   ```

2. **Verify Documentation**
   - Check all links
   - Verify examples
   - Ensure consistency

3. **Train Team**
   - Schedule training session
   - Share documentation
   - Address questions

#### Common Pitfalls
- **Incomplete Migration**: Verify all tests
- **Outdated Documentation**: Keep docs current
- **Knowledge Gaps**: Provide training

### 9.1 Remove Deprecated Code
After successful migration, remove old test utilities.

**Learning Resources:**
- [Code Refactoring](https://refactoring.com/)
- [Technical Debt Management](https://martinfowler.com/tags/technical%20debt.html)

**Key Questions to Explore:**
1. How do we know when it's safe to remove old code?
2. What's the best way to communicate breaking changes?
3. How can we prevent regression when removing old code?

## Additional Resources

### Recommended Reading
1. [Test-Driven Development by Example](https://www.oreilly.com/library/view/test-driven-development/0321146530/)
2. [Working Effectively with Legacy Code](https://www.oreilly.com/library/view/working-effectively-with/0131177052/)
3. [Jest: Getting Started](https://jestjs.io/docs/getting-started)

### Tools to Explore
1. [Testing Library](https://testing-library.com/)
2. [Sinon.JS](https://sinonjs.org/)
3. [TestCafe](https://testcafe.io/)

### Community Resources
1. [Jest Community](https://github.com/jest-community)
2. [JavaScript Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
3. [Awesome Testing](https://github.com/TheJambo/awesome-testing)
