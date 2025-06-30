# ESMock Path Resolution Solution

## Problem Statement

ESMock requires mock keys to exactly match import strings used in the source module. Current issues occur when:

- Test files use resolved paths (e.g., `../../../src/utils/deck.js`)
- Source files use relative paths (e.g., `../../utils/deck.js`)
- Path formats differ between Windows and Linux systems

## Cross-Platform Solutions

### 1. Path Normalization Utility

```javascript
// test/utils/pathUtils.js
import path from "path";

/**
 * Normalizes import paths for esmock to match source imports
 * @param {string} testFilePath - __filename from test
 * @param {string} importPath - Original import path from source
 * @returns {string} Normalized path matching source imports
 */
export function normalizeEsmockPath(testFilePath, importPath) {
  const testDir = path.dirname(testFilePath);
  const sourceDir = path.join(testDir, "../../src"); // Adjust based on test location

  // Convert to relative path from source perspective
  const absolutePath = path.resolve(sourceDir, importPath);
  return path
    .relative(testDir, absolutePath)
    .replace(/\\/g, "/") // Ensure forward slashes
    .replace(/\.js$/, ""); // Remove .js extension if present
}
```

### 2. Test File Structure Convention

Enforce mirroring source structure:

```
src/
  game/
    logic/
      validation.js
test/
  game/
    logic/
      validation.unit.test.js  // Uses same relative paths as source
```

### 3. ESMock Wrapper

```javascript
// test/utils/esmockWrapper.js
import esmock from "esmock";
import path from "path";

export async function esmockWithPaths(testFilePath, modulePath, mocks = {}) {
  const testDir = path.dirname(testFilePath);
  const absoluteModulePath = path.resolve(testDir, modulePath);

  // Normalize mock paths
  const normalizedMocks = {};
  for (const [mockPath, mockValue] of Object.entries(mocks)) {
    const normalizedPath = path
      .relative(
        testDir,
        path.resolve(path.dirname(absoluteModulePath), mockPath)
      )
      .replace(/\\/g, "/");
    normalizedMocks[normalizedPath] = mockValue;
  }

  return esmock(absoluteModulePath, normalizedMocks);
}
```

## Implementation Steps

1. Create `test/utils/pathUtils.js` with normalization functions
2. Create `test/utils/esmockWrapper.js` for consistent mocking
3. Update all test files to use these utilities
4. Document conventions in project guidelines
5. Update all
   readme.md

## Usage Example

```javascript
// In test files
import { esmockWithPaths } from "../utils/esmockWrapper.js";

const validationModule = await esmockWithPaths(
  import.meta.url, // test file path
  "./validation.js", // relative to test
  {
    "../../utils/deck.js": mockDeck, // matches source import
    "../../utils/logger.js": mockLogger,
  }
);
```

## Benefits

- Cross-platform compatibility
- Consistent path resolution
- No directory path keys needed
- Clear conventions for future tests
