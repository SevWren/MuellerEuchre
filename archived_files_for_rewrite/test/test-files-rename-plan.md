# Test Files Standardization Plan - COMPLETED ✅

## Goals
- ✅ Consistent, clear test file names
- ✅ Minimal, logical directory structure
- ✅ Focus on server-side domains only

## Naming
- ✅ All test files: `[feature].[type].test.js` (type = unit, integration, e2e if needed)
- ✅ Only use subdirectories if there are many tests per domain

## File Renaming Plan - COMPLETED

### Phases (moved to `phases/` directory)
- [x] `endGame.unit.test.js`         → `phases/endGame.unit.test.js`
- [x] `goAlonePhase.unit.test.js`    → `phases/goAlone.unit.test.js`
- [x] `orderUpPhase.unit.test.js`    → `phases/orderUp.unit.test.js`
- [x] `playPhase.unit.test.js`       → `phases/play.unit.test.js`
- [x] `scoring.unit.test.js`         → `phases/scoring.unit.test.js`
- [x] `startNewHand.unit.test.js`    → `phases/startHand.unit.test.js`
- [x] `startNewHand.integration.test.js` → `phases/startHand.integration.test.js`
- [ ] `playPhase.fixed.test.js` - **Note**: Still in root, consider merging with `phases/play.unit.test.js`

### Services (moved to `services/` directory)
- [x] `reconnectionHandler.unit.test.js` → `services/reconnection.unit.test.js`
- [x] `stateSyncService.unit.test.js`    → `services/stateSync.unit.test.js`
- [x] `uiIntegrationService.unit.test.js`→ `services/uiIntegration.unit.test.js`
- [x] `validation.unit.test.js`          → `services/validation.unit.test.js`
- [x] `coreGameLogic.unit.test.js`       → `services/coreGame.unit.test.js`
- [ ] `temp_stateSyncService.unit.test.js` - **Note**: Still in root, marked as temporary

### Server (moved to `server/` directory)
- [x] `server3.basic.test.mjs`           → `server/basic.unit.test.js`
- [x] `server3.dealerDiscard.test.js`    → `server/dealerDiscard.unit.test.js`
- [x] `server3.errorHandling.test.js`    → `server/errorHandling.unit.test.js`
- [x] `server3.goAlone.unit.test.js`     → `server/goAlone.unit.test.js`
- [x] `server3.integration.test.js`      → `server/integration.test.js`
- [x] `server3.logging.unit.test.js`     → `server/logging.unit.test.js`
- [x] `server3.multiGame.test.js`        → `server/multiGame.integration.test.js`
- [x] `server3.orderUp.unit.test.js`     → `server/orderUp.unit.test.js`
- [x] `server3.performance.test.js`      → `server/performance.unit.test.js`
- [x] `server3.persistence.test.js`      → `server/persistence.unit.test.js`
- [x] `server3.playCard.additional.test.js` → `server/playCard.additional.unit.test.js`
- [x] `server3.playCard.unit.test.js`    → `server/playCard.unit.test.js`
- [x] `server3.reconnection.test.js`     → `server/reconnection.integration.test.js`
- [x] `server3.scoreHand.unit.test.js`   → `server/scoreHand.unit.test.js`
- [x] `server3.security.test.js`         → `server/security.integration.test.js`
- [x] `server3.socket.unit.test.js`      → `server/socket.unit.test.js`
- [x] `server3.spectator.test.js`        → `server/spectator.integration.test.js`
- [x] `server3.validation.test.js`       → `server/validation.unit.test.js`

### Archived/Obsolete
- [x] `archived/` directory exists and contains old test files
- [ ] Review `temp_stateSyncService.unit.test.js` - Marked as temporary, decide if it can be removed
- [ ] Review `playPhase.fixed.test.js` - Check if it's still needed or can be merged with `phases/play.unit.test.js`

## Next Steps
- [ ] Run test suite to ensure all tests still pass with the new file structure
- [ ] Update any import statements in test files that reference the old file locations
- [ ] Update any CI/CD pipeline configurations that might reference the old test file locations
- [ ] Remove this plan file or mark it as completed in version control

## Notes
- ✅ Original file structure has been preserved in git history
- ✅ Changes have been documented in this file
- A backup of the original structure exists in git history

---