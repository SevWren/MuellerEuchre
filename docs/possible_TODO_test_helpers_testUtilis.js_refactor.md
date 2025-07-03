7/3/25 - This is for ways to expand the testUtils file, but it is unknown how much that would help or hurt future development based on how much current/prior code has been written.
#Possible Future  `test/helpers/testUtils.js` file.

  The improvements are extensive and directly address the complexities identified in the detailed analysis. This version provides powerful, flexible, and maintainable factories for generating both mock game states and mock dependencies, significantly enhancing the project's testing capabilities.

---

### **`test/helpers/testUtils.js` (Fully Improved and Refactored)**

```javascript
/**
 * @file test/helpers/testUtils.js
 * @module TestUtils
 * @description
 *   Provides reusable, project-wide test utilities and mock factories for the Euchre
 *   game testing suite. This file is a central part of the testing strategy, designed
 *   to reduce boilerplate code, ensure test consistency, and promote maintainable tests
 *   by providing reliable factories for mock data and dependencies.
 * @requires sinon
 */

import sinon from 'sinon';
import { GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS } from '../../src/config/constants.js';
import { initializePlayers } from '../../src/utils/players.js';
import { createDeck, shuffleDeck } from '../../src/utils/deck.js';

/**
 * Recursively merges properties of one or more source objects into a target object.
 * This is a pure function; it returns a new object and does not modify the inputs.
 * @private
 * @param {object} target - The initial object to merge into.
 * @param {...object} sources - The source objects to merge from.
 * @returns {object} A new object with the merged properties.
 */
function deepMerge(target, ...sources) {
  const output = { ...target };
  for (const source of sources) {
    if (isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!(key in output)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = deepMerge(output[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      }
    }
  }
  return output;
}
const isObject = (item) => (item && typeof item === 'object' && !Array.isArray(item));

/**
 * A powerful factory function that generates a realistic, phase-specific mock game state.
 * It uses actual project utilities like `initializePlayers` and `createDeck` to ensure the
 * generated state is structurally identical to what's used in production. It supports
 * deep overrides and specific hand assignments for precise test control.
 *
 * @param {string} [phase=GAME_PHASES.LOBBY] - The desired game phase for the mock state.
 * @param {object} [overrides={}] - An optional object to deeply merge and override any properties of the generated state.
 * @param {object} [overrides.overrideHands] - A special property to set specific hands for players, bypassing random dealing.
 * @returns {object} A fully-formed game state object tailored to the specified phase.
 *
 * @example
 * // Create a state for the "Stick the Dealer" rule.
 * const stickTheDealerState = createMockGameState(GAME_PHASES.ORDER_UP_ROUND2, {
 *   dealer: 'east',
 *   currentPlayer: 'east',
 *   bids: [
 *     { round: 2, playerRole: 'south', decision: 'pass' },
 *     { round: 2, playerRole: 'west', decision: 'pass' },
 *     { round: 2, playerRole: 'north', decision: 'pass' },
 *   ]
 * });
 *
 * @example
 * // Create a state to test a specific hand for a player.
 * const specificHandState = createMockGameState(GAME_PHASES.PLAYING, {
 *   overrideHands: {
 *     south: [ { id: 'AH', ... }, { id: 'KH', ... } ], // south has a strong hand
 *   }
 * });
 */
export function createMockGameState(phase = GAME_PHASES.LOBBY, overrides = {}) {
  const baseState = {
    gameId: 'mockGame123',
    gamePhase: phase,
    players: initializePlayers(),
    dealer: PLAYER_ROLES[0], // south
    currentPlayer: null,
    turnCard: null,
    kitty: [],
    trumpSuit: null,
    bids: [],
    roundNumber: 1,
    makerTeam: null,
    playerWhoOrderedUp: null,
    playerWhoCalledTrump: null,
    goingAlone: false,
    playerGoingAlone: null,
    partnerSittingOut: null,
    currentTrick: [],
    tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
    teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
    gameMessages: [],
    settings: { winningScore: 10 },
  };

  // --- Handle Card Distribution ---
  const needsDealtCards = [
    GAME_PHASES.ORDER_UP_ROUND1,
    GAME_PHASES.ORDER_UP_ROUND2,
    GAME_PHASES.DEALER_DISCARD,
    GAME_PHASES.GOING_ALONE,
    GAME_PHASES.PLAYING,
  ].includes(phase);

  if (needsDealtCards) {
    if (overrides.overrideHands) {
      // Use specific hands if provided, bypassing random dealing.
      for (const role in overrides.overrideHands) {
        if (baseState.players[role]) {
          baseState.players[role].hand = overrides.overrideHands[role];
        }
      }
      // Clean up the special property so it doesn't get merged later
      delete overrides.overrideHands;
    } else {
      // Default behavior: deal random hands
      const deck = shuffleDeck(createDeck());
      PLAYER_ROLES.forEach(role => {
        baseState.players[role].hand = deck.splice(0, 5);
      });
      baseState.turnCard = deck.pop();
      baseState.kitty = deck;
    }
  }

  // --- Phase-Specific Logic ---
  switch (phase) {
    case GAME_PHASES.ORDER_UP_ROUND1:
      baseState.currentPlayer = PLAYER_ROLES[1]; // west
      break;
    case GAME_PHASES.DEALER_DISCARD:
      baseState.trumpSuit = baseState.turnCard ? baseState.turnCard.suit : SUITS.HEARTS;
      baseState.makerTeam = TEAMS.TEAM_EW;
      baseState.playerWhoOrderedUp = PLAYER_ROLES[1];
      baseState.currentPlayer = baseState.dealer;
      if (baseState.turnCard) {
        baseState.players[baseState.dealer].hand.push(baseState.turnCard);
      }
      break;
    case GAME_PHASES.PLAYING:
      baseState.trumpSuit = SUITS.SPADES;
      baseState.makerTeam = TEAMS.TEAM_NS;
      baseState.currentPlayer = PLAYER_ROLES[1]; // west leads
      break;
  }

  // Use deepMerge to apply overrides, ensuring nested objects are merged correctly.
  return deepMerge(baseState, overrides);
}

/**
 * A factory function that creates a consistent set of standard mocks for common application dependencies.
 * This helps reduce boilerplate in unit tests and ensures mocks are consistent across the test suite.
 * It now includes mocks for Layer 1 utilities (`deckUtils`, `playerUtils`).
 *
 * @param {object} [overrides={}] - An optional object to deeply override the default mock implementations.
 * @returns {{logger: object, gameRepository: object, deckUtils: object, playerUtils: object}} An object containing the mock instances.
 * @example
 * // In a test file:
 * const mocks = createStandardMocks({
 *   deckUtils: { getCardRank: sinon.stub().returns(100) },
 *   playerUtils: { getNextPlayer: sinon.stub().returns('north') }
 * });
 *
 * // Then use these mocks with esmockWithPaths or createMockedModule
 * const mockedModule = await esmockWithPaths(import.meta.url, '...', {
 *   '@/utils/deck.js': mocks.deckUtils,
 *   '@/utils/players.js': mocks.playerUtils,
 *   '@/utils/logger.js': mocks.logger
 * });
 */
export function createStandardMocks(overrides = {}) {
  // --- Default Logger Mock ---
  const defaultLoggerMock = {
    info: sinon.stub(),
    warn: sinon.stub(),
    error: sinon.stub(),
    debug: sinon.stub(),
    fatal: sinon.stub(),
    child: sinon.stub().returnsThis(),
  };

  // --- Default Game Repository Mock ---
  const defaultRepoMock = {
    connect: sinon.stub().resolves(),
    disconnect: sinon.stub().resolves(),
    getGame: sinon.stub().resolves(null),
    updateGame: sinon.stub().callsFake(async (gameId, gameState) => gameState),
    createGame: sinon.stub().callsFake(async (gameId, gameState) => gameState),
    findActiveGamesByPlayer: sinon.stub().resolves([]),
  };

  // --- Default Deck Utilities Mock ---
  const defaultDeckUtilsMock = {
    createDeck: sinon.stub().callsFake(createDeck),
    shuffleDeck: sinon.stub().callsFake(deck => [...deck]),
    cardToId: sinon.stub().callsFake(card => card.id || '??'),
    isRightBower: sinon.stub().returns(false),
    isLeftBower: sinon.stub().returns(false),
    getCardRank: sinon.stub().returns(10), // A neutral, non-zero default
    sortHand: sinon.stub().callsFake(hand => [...hand]), // Return a copy
  };

  // --- Default Player Utilities Mock ---
  const defaultPlayerUtilsMock = {
    initializePlayers: sinon.stub().callsFake(initializePlayers),
    getPlayerTeam: sinon.stub().returns(TEAMS.TEAM_NS),
    isTeammate: sinon.stub().returns(false),
    getPartner: sinon.stub().returns(PLAYER_ROLES[2]), // Default partner for P0 is P2
    getPlayerBySocketId: sinon.stub().returns(null),
    getRoleBySocketId: sinon.stub().returns(null),
    getNextPlayer: sinon.stub().callsFake((current) => {
      const i = PLAYER_ROLES.indexOf(current);
      return i > -1 ? PLAYER_ROLES[(i + 1) % 4] : null;
    }),
  };

  // Use deepMerge to combine defaults with user-provided overrides.
  return {
    logger: deepMerge(defaultLoggerMock, overrides.logger || {}),
    gameRepository: deepMerge(defaultRepoMock, overrides.gameRepository || {}),
    deckUtils: deepMerge(defaultDeckUtilsMock, overrides.deckUtils || {}),
    playerUtils: deepMerge(defaultPlayerUtilsMock, overrides.playerUtils || {}),
  };
}

// --- Legacy/Client-Side Mocks (Retained for completeness) ---

export const createMockSafeStorage = () => ({
  getItem: sinon.stub(),
  setItem: sinon.stub(),
  removeItem: sinon.stub(),
});

export const resetAllMocks = (mocks) => {
  for (const group in mocks) {
    for (const key in mocks[group]) {
      const mockFn = mocks[group][key];
      if (mockFn && typeof mockFn.resetHistory === 'function') {
        mockFn.resetHistory();
      }
    }
  }
};
```