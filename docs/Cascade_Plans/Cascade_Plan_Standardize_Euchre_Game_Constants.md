# Plan: Standardize Exported Constants in constants.js

## Notes
- All exported variables in `src/config/constants.js` must be descriptive and unique, as this file is a single source of truth referenced throughout the codebase.
- `GAME_PHASES` has already been enhanced with unique, descriptive, and backward-compatible variable names.
- All files that import from `src/config/constants.js` must be found and checked to ensure they use the new descriptive variable names correctly.
- The following files have been identified as importing from `constants.js` and must be reviewed/updated:
- [ ] - test/utils/players.unit.test.js
- [ ] - test/utils/lobbyUtils.unit.test.js
- [ ] - test/utils/errorUtils.unit.test.js
- [ ] - test/socket/handlers/playingHandlers.unit.test.js
- [ ] - test/socket/handlers/goAloneHandlers.unit.test.js
- [ ] - test/socket/handlers/gameOverHandlers.unit.test.js
- [ ] - test/socket/handlers/biddingHandlers.unit.test.js
- [ ] - test/server/dealerDiscard.unit.test.js
- [ ] - test/game/phases/startNewHandPhase.unit.test.js
- [ ] - test/game/phases/scoringPhase.unit.test.js
- [ ] - test/game/phases/playingPhase.unit.test.js
- [ ] - test/game/phases/lobbyPhase.unit.test.js
- [ ] - test/game/phases/goAlonePhase.unit.test.js
- [ ] - test/game/phases/endGame.unit.test.js
- [ ] - test/game/phases/dealer_rotation_fix.test.js
- [ ] - test/game/phases/biddingPhase.unit.test.js
- [ ] - test/game/logic/validation.unit.test.js
- [ ] - test/game/logic/validation.GoAlone.unit.test.js
- [ ] - src/utils/statsUtils.js
- [ ] - src/utils/players.js
- [ ] - src/utils/logger.js
- [ ] - src/utils/lobbyUtils.js
- [ ] - src/utils/deck.js
- [ ] - src/socket/handlers/playingHandlers.js
- [ ] - src/socket/handlers/playerConnectionHandlers.js
- [ ] - src/socket/handlers/lobbyHandlers.js
- [ ] - src/socket/handlers/goAloneHandlers.js
- [ ] - src/socket/handlers/gameOverHandlers.js
- [ ] - src/socket/handlers/biddingHandlers.js
- [ ] - src/game/phases/startNewHandPhase.js
- [ ] - src/game/phases/scoringPhase.js
- [ ] - src/game/phases/playingPhase.js
- [ ] - src/game/phases/lobbyPhase.js
- [ ] - src/game/phases/goAlonePhase.js
- [ ] - src/game/phases/endGame.js
- [ ] - src/game/phases/biddingPhase.js
- [ ] - src/game/logic/validation.js
- [ ] - docs/Coverage_Info/utils deck.js

## Task List
- [x] Enhance `GAME_PHASES` with descriptive, unique, and backward-compatible names
- [x] Standardize all other exported variables in `constants.js` to use descriptive and unique names, maintaining backward compatibility
- [ ] Find all files that import from `src/config/constants.js`
- [ ] For each importing file, verify all imported variable usages are correct
- [ ] For each importing file, verify all offset variables are are logically being used correctly
- [ ] Update imports/usages in those files to use the new descriptive names as needed
- [ ] Update imports/usages in those files to use the new logic as needed
- [ ] Run tests to verify all changes are correct

## Current Goal
Find and update all usages of constants.js exports across the codebase