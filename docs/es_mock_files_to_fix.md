### 1. `test/db/gameRepository.unit.test.js`

*   **Source Module Being Tested:** `src/db/gameRepository.js`
*   **Import String in Source:** `import logger from '../utils/logger.js';`
*   **Incorrect `esmock` Key in Test:** `loggerModulePath = '../../src/utils/logger.js'`
*   **Correct `esmock` Key:** `'../utils/logger.js'`
*   **Reason:** The test uses a more "root-relative" path for the logger mock, while the source uses a direct relative path from its own location.

---

### 2. `test/game/state.unit.test.js`

*   **Source Module Being Tested:** `src/game/state.js`
*   **Import String in Source:** `import logger from '../utils/logger.js';`
*   **Incorrect `esmock` Key in Test:** `'../../src/utils/logger.js'`
*   **Correct `esmock` Key:** `'../utils/logger.js'`
*   **Reason:** Similar to `gameRepository.unit.test.js`, the test uses a longer, incorrect relative path for the logger mock.

---

### 3. `test/game/phases/biddingPhase.unit.test.js`

*   **Source Module Being Tested:** `src/game/phases/biddingPhase.js`
*   **Import Strings in Source:**
    *   `import logger from '../../utils/logger.js';`
    *   `import { validateBid, validateDealerDiscard } from '../../game/logic/validation.js';`
*   **Incorrect `esmock` Keys in Test:**
    *   `'../../../src/game/logic/validation.js'`
    *   `'../../../src/utils/logger.js'`
*   **Correct `esmock` Keys:**
    *   `'../../game/logic/validation.js'`
    *   `'../../utils/logger.js'`
*   **Reason:** The test uses "root-relative" paths starting with `../../../src/`, which do not match the shorter relative paths used in the source.

---

### 4. `test/game/phases/endGame.unit.test.js`

*   **Source Module Being Tested:** `src/game/phases/endGame.js`
*   **Import String in Source:** `import { log } from '../../utils/logger.js';`
*   **Incorrect `esmock` Key in Test:** `'../../src/utils/logger.js'`
*   **Correct `esmock` Key:** `'../../utils/logger.js'`
*   **Reason:** The test uses a more "root-relative" path for the logger mock, while the source uses a direct relative path.

---

### 5. `test/game/phases/goAlonePhase.unit.test.js`

*   **Source Module Being Tested:** `src/game/phases/goAlonePhase.js`
*   **Import Strings in Source:**
    *   `import { updateGameState } from '../state.js';`
    *   `import logger from '../../utils/logger.js';`
    *   `import { getNextPlayer, getPartner } from '../../utils/players.js';`
*   **Incorrect `esmock` Keys in Test:**
    *   `'../../src/game/state.js'`
    *   `'../../src/utils/logger.js'`
    *   `'../../src/utils/players.js'`
*   **Correct `esmock` Keys:**
    *   `'../state.js'`
    *   `'../../utils/logger.js'`
    *   `'../../utils/players.js'`
*   **Reason:** The test uses "root-relative" paths starting with `../../src/` instead of the exact relative paths (e.g., `'../state.js'`).

---

### 6. `test/game/phases/lobbyPhase.unit.test.js`

*   **Source Module Being Tested:** `src/game/phases/lobbyPhase.js`
*   **Import String in Source:** `import logger from '../../utils/logger.js';`
*   **Incorrect `esmock` Key in Test:** `'../../src/utils/logger.js'`
*   **Correct `esmock` Key:** `'../../utils/logger.js'`
*   **Reason:** The test uses a more "root-relative" path for the logger mock, while the source uses a direct relative path.

---

### 7. `test/game/phases/startNewHandPhase.unit.test.js`

*   **Source Module Being Tested:** `src/game/phases/startNewHandPhase.js`
*   **Import Strings in Source:**
    *   `import logger from '../../utils/logger.js';`
    *   `import { createDeck, shuffleDeck, cardToId } from '../../utils/deck.js';`
    *   `import { getNextPlayer } from '../../utils/players.js';`
*   **Incorrect `esmock` Keys in Test:**
    *   `'../../src/utils/logger.js'`
    *   `'../../src/utils/deck.js'`
    *   `'../../src/utils/players.js'`
*   **Correct `esmock` Keys:**
    *   `'../../utils/logger.js'`
    *   `'../../utils/deck.js'`
    *   `'../../utils/players.js'`
*   **Reason:** The test uses "root-relative" paths starting with `../../src/`, which do not match the shorter relative paths used in the source.

---

### 8. `test/socket/handlers/biddingHandlers.unit.test.js`

*   **Source Module Being Tested:** `src/socket/handlers/biddingHandlers.js`
*   **Import Strings in Source:**
    *   `import logger from '../../utils/logger.js';`
    *   `import { handleOrderUpDecision, handleDealerDiscard, handleCallTrumpDecision } from '../../game/phases/biddingPhase.js';`
    *   `import { isValidBid, isValidDealerDiscard } from '../../game/logic/validation.js';`
    *   `import { getRoleBySocketId } from '../../utils/players.js';`
    *   `import { gameRepository } from '../../db/gameRepository.js';`
*   **Incorrect `esmock` Keys in Test:**
    *   `loggerModulePath = '../../../src/utils/logger.js'`
    *   `biddingPhaseModulePath = '../../../src/game/phases/biddingPhase.js'`
    *   `validationModulePath = '../../../src/game/logic/validation.js'`
    *   `playersModulePath = '../../../src/utils/players.js'`
    *   `gameRepositoryModulePath = '../../../src/db/gameRepository.js'`
*   **Correct `esmock` Keys:**
    *   `loggerModulePath = '../../utils/logger.js'`
    *   `biddingPhaseModulePath = '../../game/phases/biddingPhase.js'`
    *   `validationModulePath = '../../game/logic/validation.js'`
    *   `playersModulePath = '../../utils/players.js'`
    *   `gameRepositoryModulePath = '../../db/gameRepository.js'`
*   **Reason:** The test uses "root-relative" paths starting with `../../../src/`, which do not match the shorter relative paths used in the source.

---

### 9. `test/socket/handlers/goAloneHandlers.unit.test.js`

*   **Source Module Being Tested:** `src/socket/handlers/goAloneHandlers.js`
*   **Import Strings in Source:**
    *   `import logger from '../../utils/logger.js';`
    *   `import { handleGoAloneDecision } from '../../game/phases/goAlonePhase.js';`
    *   `import { getRoleBySocketId } from '../../utils/players.js';`
    *   `import { gameRepository } from '../../../src/db/gameRepository.js';` (NOTE: This one is *already* using the longer path in the source!)
*   **Incorrect `esmock` Keys in Test:**
    *   `loggerModulePath = '../../../src/utils/logger.js'`
    *   `goAlonePhaseModulePath = '../../../src/game/phases/goAlonePhase.js'`
    *   `playersModulePath = '../../../src/utils/players.js'`
*   **Correct `esmock` Keys:**
    *   `loggerModulePath = '../../utils/logger.js'`
    *   `goAlonePhaseModulePath = '../../game/phases/goAlonePhase.js'`
    *   `playersModulePath = '../../utils/players.js'`
*   **Reason:** The test uses "root-relative" paths starting with `../../../src/`, which do not match the shorter relative paths used in the source. (The `gameRepository` path is correct in the test because it's also long in the source).

---

### 10. `test/socket/handlers/playingHandlers.unit.test.js`

*   **Source Module Being Tested:** `src/socket/handlers/playingHandlers.js`
*   **Import Strings in Source:**
    *   `import { gameRepository } from '../../db/gameRepository.js';`
    *   `import { handlePlayCard } from '../../game/phases/playingPhase.js';`
    *   `import logger from '../../utils/logger.js';`
*   **Incorrect `esmock` Keys in Test:**
    *   `gameRepositoryModulePath = '../../../src/db/gameRepository.js'`
    *   `playingPhaseModulePath = '../../../src/game/phases/playingPhase.js'`
    *   `loggerModulePath = '../../../src/utils/logger.js'`
*   **Correct `esmock` Keys:**
    *   `gameRepositoryModulePath = '../../db/gameRepository.js'`
    *   `playingPhaseModulePath = '../../game/phases/playingPhase.js'`
    *   `loggerModulePath = '../../utils/logger.js'`
*   **Reason:** The test uses "root-relative" paths starting with `../../../src/`, which do not match the shorter relative paths used in the source.

---

### 11. `test/utils/deck.unit.test.js`

*   **Source Module Being Tested:** `src/utils/deck.js`
*   **Import String in Source:** `import logger from './logger.js';`
*   **Incorrect `esmock` Key in Test:** `'../../src/utils/logger.js'`
*   **Correct `esmock` Key:** `'./logger.js'`
*   **Reason:** The test uses a more "root-relative" path for the logger mock, while the source uses a local relative path.

---

### 12. `test/utils/historyUtils.unit.test.js`

*   **Source Module Being Tested:** `src/utils/historyUtils.js`
*   **Import String in Source:** `import { logger } from "./logger.js";`
*   **Incorrect `esmock` Key in Test:** `'../../src/utils/logger.js'`
*   **Correct `esmock` Key:** `'./logger.js'`
*   **Reason:** The test uses a more "root-relative" path for the logger mock, while the source uses a local relative path.

---

### 13. `test/utils/lobbyUtils.unit.test.js`

*   **Source Module Being Tested:** `src/utils/lobbyUtils.js`
*   **Import String in Source:** `import logger from './logger.js';`
*   **Incorrect `esmock` Key in Test:** `'../../src/utils/logger.js'`
*   **Correct `esmock` Key:** `'./logger.js'`
*   **Reason:** The test uses a more "root-relative" path for the logger mock, while the source uses a local relative path.

---

### 14. `test/utils/players.unit.test.js`

*   **Source Module Being Tested:** `src/utils/players.js`
*   **Import String in Source:** `import logger from './logger.js';`
*   **Incorrect `esmock` Key in Test:** `'../../src/utils/logger.js'`
*   **Correct `esmock` Key:** `'./logger.js'`
*   **Reason:** The test uses a more "root-relative" path for the logger mock, while the source uses a local relative path.

---

### 15. `test/utils/statsUtils.unit.test.js`

*   **Source Module Being Tested:** `src/utils/statsUtils.js`
*   **Import Strings in Source:**
    *   `import { PhaseLogicError } from "../game/logic/errors.js";`
    *   `import { logger } from "./logger.js";`
    *   `import { TEAMS } from "../config/constants.js";`
*   **Incorrect `esmock` Keys in Test:**
    *   `"../../src/game/logic/errors.js"`
    *   `"../../src/utils/logger.js"`
    *   `"../../src/config/constants.js"`
*   **Correct `esmock` Keys:**
    *   `"../game/logic/errors.js"`
    *   `"./logger.js"`
    *   `"../config/constants.js"`
*   **Reason:** The test uses "root-relative" paths starting with `../../src/`, which do not match the shorter relative paths used in the source.

---