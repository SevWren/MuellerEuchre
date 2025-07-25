Layer 1 ("Core Game Logic & Utilities (Pure Functions)" that are deterministic, depend only on their input, and have no side effects like database calls or network I/O)
# SRC Files
`src/config/constants.js`
`src/game/logic/aiLogic.js`
`src/game/logic/validation-errors.js`
`src/game/logic/validation-core.js`
`src/game/phases/biddingPhase.js`
`src/game/phases/endGame.js`
`src/game/phases/goAlonePhase.js`
`src/game/phases/lobbyPhase.js`
`src/game/phases/playingPhase.js`
`src/game/phases/scoringPhase.js`
`src/game/phases/startNewHandPhase.js`
`src/utils/deck.js`
`src/utils/errorUtils.js`
`src/utils/historyUtils.js`
`src/utils/i18n.js`
`src/utils/idGenerator.js`
`src/utils/lobbyUtils.js`
`src/utils/players.js`
`src/utils/settingsUtils.js`
`src/utils/statsUtils.js`
`src/utils/path-resolver.js`

# Unit Tests
`test/config/constants.unit.test.js`                7-24 100% passing
`test/game/logic/aiLogic.unit.test.js`              7-24 100% Passing
`test/game/phases/biddingPhase.unit.test.js`        7-24 100% Pass 7-23
`test/game/phases/scoringPhase.unit.test.js`        7-24 100% Pass
`test/game/phases/endGame.unit.test.js`             7-24 100% Pass
`test/game/phases/startNewHandPhase.unit.test.js`   7-24 100% Pass
`test/utils/errorUtils.unit.test.js`                7-24 100% Pass
`test/utils/historyUtils.unit.test.js`              7-24 100% Pass
`test/utils/idGenerator.unit.test.js`               7-24 100% pass
`test/utils/logger.unit.test.js`                    7-24 100% Pass, almost 100% coverage
`test/utils/lobbyUtils.unit.test.js`                7-24 100% coverage
`test/utils/statsUtils.unit.test.js`                7-24 100% pass
`test/game/logic/validation-errors.unit.test.js`    7-24 100% Pass
`test/game/logic/validation.unit.test.js`           7-24 100% passing
`test/game/phases/goAlonePhase.unit.test.js`        7-24 100% passing
`test/game/phases/lobbyPhase.unit.test.js`          7-24 100% pass
`test/game/phases/playingPhase.unit.test.js`        7-24 100% passing
`test/utils/players.unit.test.js`                   7-24 100% pass
`test/utils/deck.unit.test.js`                      7-24 100% pass
`test/utils/settingsUtils.unit.test.js`             7-24 100% Pass
`test/utils/path-resolver.unit.test.js`             7-24 100% Pass