// filepath: test/game/phases/playingPhase.unit.test.js
// 7/18/25 - Test Currently has 6 pass 7 failing
import assert from 'node:assert';
import { test } from 'node:test';
import { mock } from 'node:test';
import {
  GAME_PHASES,
  PLAYER_ROLES,
  SUITS,
  TEAMS,
  VALUES,
} from '../../../src/config/constants.js';

import {
  PhaseLogicError,
  NotPlayersTurnError,
  InvalidPhaseError,
  CardNotInHandError,
  MustFollowSuitError,
  ValidationError,
} from '../../../src/game/logic/validation-errors.js'; //file was moved for restructuring and rename to validation-errors.js

import { createDeck, shuffleDeck } from '../../../src/utils/deck.js';
import { initializePlayers } from '../../../src/utils/players.js';

// Helper to create a base game state for playing phase tests
const createPlayingGameState = () => {
  let initialPlayerObjects = initializePlayers();
  let deck = shuffleDeck(createDeck());
  const playerHands = {};

  PLAYER_ROLES.forEach((role) => {
    playerHands[role] = [];
    for (let i = 0; i < 5; i++) {
      if (deck.length > 0) playerHands[role].push(deck.pop());
    }
  });

  const playersWithHands = PLAYER_ROLES.reduce((acc, role) => {
    acc[role] = {
      ...initialPlayerObjects[role],
      hand: playerHands[role] || [],
    };
    return acc;
  }, {});

  return {
    gameId: 'playingPhaseTestGame',
    gamePhase: GAME_PHASES.PLAYING,
    players: playersWithHands,
    dealer: PLAYER_ROLES[0], // South
    currentPlayer: PLAYER_ROLES[1], // West leads
    trumpSuit: SUITS.SPADES,
    makerTeam: TEAMS.TEAM_NS, // Assuming NS ordered up
    playerWhoOrderedUp: PLAYER_ROLES[0], // South
    currentTrick: [],
    tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
    gameMessages: [],
    settings: { winningScore: 10 },
  };
};

// Helper function to create a test card
const createTestCard = (suit, value) => ({ suit, value });

// Import the module once at the top level
const { handlePlayCard: originalHandlePlayCard, determineTrickWinner: originalDetermineTrickWinner } = await import('../../../src/game/phases/playingPhase.js');

// Create test context
function createTestContext(t) {
  // Initialize mocks
  const loggerMock = {
    info: t.mock.fn(),
    warn: t.mock.fn(),
    error: t.mock.fn(),
    debug: t.mock.fn(),
    log: t.mock.fn(),
  };

  const mockValidation = {
    validatePlay: t.mock.fn(() => ({ valid: true, errors: [] })),
  };

  const mockPlayers = {
    getNextPlayer: t.mock.fn((currentPlayer) => {
      const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
      return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
    }),
    getPartner: t.mock.fn((playerRole) => {
      const partnerMap = {
        [PLAYER_ROLES[0]]: PLAYER_ROLES[2], // South's partner is North
        [PLAYER_ROLES[1]]: PLAYER_ROLES[3], // West's partner is East
        [PLAYER_ROLES[2]]: PLAYER_ROLES[0], // North's partner is South
        [PLAYER_ROLES[3]]: PLAYER_ROLES[1], // East's partner is West
      };
      return partnerMap[playerRole];
    }),
  };

  const mockDeck = {
    createDeck: t.mock.fn(createDeck),
    shuffleDeck: t.mock.fn(shuffleDeck),
    getCardRank: t.mock.fn(),
  };

  // Create wrapped functions with mocks
  const handlePlayCard = (gameState, playerRole, cardPlayed) => {
    const context = {
      validation: mockValidation,
      players: mockPlayers,
      deck: mockDeck,
      logger: loggerMock
    };
    return originalHandlePlayCard.call(context, gameState, playerRole, cardPlayed);
  };

  const determineTrickWinner = (trick, trumpSuit, leadPlayerRole) => {
    const context = {
      validation: mockValidation,
      players: mockPlayers,
      deck: mockDeck,
      logger: loggerMock
    };
    return originalDetermineTrickWinner.call(context, trick, trumpSuit, leadPlayerRole);
  };

  return {
    loggerMock,
    mockValidation,
    mockPlayers,
    mockDeck,
    handlePlayCard,
    determineTrickWinner
  };
}

// Main test suite
test('PlayingPhase Logic', async (t) => {
  const testContext = createTestContext(t);
  const { handlePlayCard, determineTrickWinner, mockValidation, mockPlayers, mockDeck, loggerMock } = testContext;

  t.test('should throw TypeError if currentGameState is null', (t) => {
    const testFn = () => handlePlayCard(null, PLAYER_ROLES[0], createTestCard(SUITS.HEARTS, 'A'));
    assert.throws(
      testFn,
      {
        name: 'TypeError',
        message: /Cannot read propert.*players/
      }
    );
  });

  t.test('should throw PhaseLogicError if playerRole is invalid', (t) => {
    const gameState = createPlayingGameState();
    mockValidation.validatePlay.mock.mockImplementation(() => ({ valid: true, errors: [] }));

    assert.throws(
      () => handlePlayCard(gameState, 'INVALID_PLAYER', createTestCard(SUITS.HEARTS, 'A')),
      (err) => {
        assert(err.message.includes('Player INVALID_PLAYER not found'));
        return err instanceof PhaseLogicError;
      }
    );
  });

  t.test('should call validatePlay with correct arguments', async (t) => {
    const gameState = createPlayingGameState();
    const playerRole = gameState.currentPlayer; // West
    const cardPlayed = gameState.players[playerRole].hand[0];

    mockValidation.validatePlay.mock.mockImplementation(() => ({ valid: true, errors: [] }));

    handlePlayCard(gameState, playerRole, cardPlayed);

    assert.strictEqual(mockValidation.validatePlay.mock.callCount(), 1);
    const callArgs = mockValidation.validatePlay.mock.calls[0].arguments;

    assert.deepStrictEqual(callArgs[0], gameState);
    assert.deepStrictEqual(callArgs[1], gameState.players[playerRole].hand);
    assert.deepStrictEqual(callArgs[2], cardPlayed);
    assert.strictEqual(callArgs[3], playerRole);
  });

  t.test('should propagate CardNotInHandError from validatePlay', async (t) => {
    const gameState = createPlayingGameState();
    const playerRole = gameState.currentPlayer;
    const cardPlayed = { id: 'XX', suit: SUITS.CLUBS, value: 'X' };

    mockValidation.validatePlay.mock.mockImplementation(() => {
      throw new CardNotInHandError('Card not in hand.');
    });

    assert.throws(
      () => handlePlayCard(gameState, playerRole, cardPlayed),
      CardNotInHandError
    );
  });

  t.test('should propagate MustFollowSuitError from validatePlay', async (t) => {
    const gameState = createPlayingGameState();
    const playerRole = gameState.currentPlayer;
    const cardPlayed = gameState.players[playerRole].hand[0];

    mockValidation.validatePlay.mock.mockImplementation(() => {
      throw new MustFollowSuitError('Must follow suit.');
    });

    assert.throws(
      () => handlePlayCard(gameState, playerRole, cardPlayed),
      MustFollowSuitError
    );
  });

  t.test('should play a card, update hand, currentTrick, and currentPlayer if trick is not over', async (t) => {
    const gameState = createPlayingGameState();
    const playerRole = gameState.currentPlayer; // West

    const cardToPlay = { ...gameState.players[playerRole].hand[0] };
    if (!cardToPlay.value) {
      const valueMap = { A: 'Ace', K: 'King', Q: 'Queen', J: 'Jack', 10: '10', 9: '9' };
      const valueChar = cardToPlay.id[0];
      cardToPlay.value = valueMap[valueChar] || valueChar;
    }

    const initialHandSize = gameState.players[playerRole].hand.length;

    mockValidation.validatePlay.mock.mockImplementation(() => ({ valid: true, errors: [] }));

    const nextPlayer = PLAYER_ROLES[(PLAYER_ROLES.indexOf(playerRole) + 1) % PLAYER_ROLES.length];
    mockPlayers.getNextPlayer.mock.mockImplementation(() => nextPlayer);

    const newState = handlePlayCard(gameState, playerRole, cardToPlay);

    assert.strictEqual(newState.players[playerRole].hand.length, initialHandSize - 1);
    assert.strictEqual(
      newState.players[playerRole].hand.some((card) => card.id === cardToPlay.id),
      false
    );

    assert.strictEqual(newState.currentTrick.length, 1);
    assert.deepStrictEqual(newState.currentTrick[0], {
      ...cardToPlay,
      playedBy: playerRole,
    });

    assert.strictEqual(newState.currentPlayer, nextPlayer);
  });

  t.test('should determine trick winner and update state if trick is over (not last trick)', async (t) => {
    const gameState = createPlayingGameState();
    const player1 = gameState.currentPlayer; // West (current)
    const player2 = PLAYER_ROLES[(PLAYER_ROLES.indexOf(player1) + 1) % 4]; // North
    const player3 = PLAYER_ROLES[(PLAYER_ROLES.indexOf(player1) + 2) % 4]; // East
    const player4 = PLAYER_ROLES[(PLAYER_ROLES.indexOf(player1) + 3) % 4]; // South (dealer)

    gameState.currentTrick = [
      { card: { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN }, playedBy: player1 },
      { card: { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN }, playedBy: player2 },
      { card: { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING }, playedBy: player3 },
    ];

    gameState.currentPlayer = player4;

    const aceOfSpades = { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE };
    gameState.players[player4].hand = [
      aceOfSpades,
      ...gameState.players[player4].hand.filter((card) => card.id !== 'AS').slice(0, 4),
    ];

    gameState.trumpSuit = SUITS.SPADES;

    mockValidation.validatePlay.mock.mockImplementation(() => ({ valid: true, errors: [] }));

    // Mock determineTrickWinner to return the winner
    const mockedDetermineTrickWinner = t.mock.fn(() => player4);
    const mockedHandlePlayCard = (gameState, playerRole, cardPlayed) => {
        const context = {
            determineTrickWinner: mockedDetermineTrickWinner,
            validatePlay: mockValidation.validatePlay,
            players: mockPlayers,
            deck: mockDeck,
            logger: loggerMock
        };
        return originalHandlePlayCard.call(context, gameState, playerRole, cardPlayed);
    };

    const newState = mockedHandlePlayCard(gameState, player4, aceOfSpades);

    assert.strictEqual(newState.currentTrick.length, 0);
    assert.strictEqual(newState.tricksTaken[TEAMS.TEAM_NS], 1);
    assert.strictEqual(newState.currentPlayer, player4);
  });

  t.test('should throw PhaseLogicError if winner teamId cannot be determined', async (t) => {
    const gameState = createPlayingGameState();
    const player1 = gameState.currentPlayer; // West (current)
    const player2 = PLAYER_ROLES[(PLAYER_ROLES.indexOf(player1) + 1) % 4]; // North
    const player3 = PLAYER_ROLES[(PLAYER_ROLES.indexOf(player1) + 2) % 4]; // East
    const player4 = PLAYER_ROLES[(PLAYER_ROLES.indexOf(player1) + 3) % 4]; // South (dealer)

    gameState.currentTrick = [
      { card: { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN }, playedBy: player1 },
      { card: { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN }, playedBy: player2 },
      { card: { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING }, playedBy: player3 },
    ];

    gameState.currentPlayer = player4;

    const aceOfSpades = { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE };
    gameState.players[player4].hand = [
      aceOfSpades,
      ...gameState.players[player4].hand.filter((card) => card.id !== 'AS').slice(0, 4),
    ];

    gameState.trumpSuit = SUITS.SPADES;
    delete gameState.players[player4].teamId; // Simulate error condition

    mockValidation.validatePlay.mock.mockImplementation(() => ({ valid: true, errors: [] }));
    
    const mockedDetermineTrickWinner = t.mock.fn(() => player4);
    const mockedHandlePlayCard = (gameState, playerRole, cardPlayed) => {
        const context = {
            determineTrickWinner: mockedDetermineTrickWinner,
            validatePlay: mockValidation.validatePlay,
            players: mockPlayers,
            deck: mockDeck,
            logger: loggerMock
        };
        return originalHandlePlayCard.call(context, gameState, playerRole, cardPlayed);
    };

    assert.throws(
      () => mockedHandlePlayCard(gameState, player4, aceOfSpades),
      (err) => {
        assert.ok(err instanceof PhaseLogicError);
        assert.ok(/Could not determine teamId for trick winner/.test(err.message));
        return true;
      }
    );
  });

  t.test('should transition to SCORING phase if hand is over (5 tricks played)', async (t) => {
    const gameState = createPlayingGameState();

    gameState.tricksTaken = { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 1 };

    gameState.currentTrick = [
      { card: { id: 'KC', suit: SUITS.CLUBS, value: 'K' }, playedBy: PLAYER_ROLES[1] }, // West
      { card: { id: 'QC', suit: SUITS.CLUBS, value: 'Q' }, playedBy: PLAYER_ROLES[2] }, // North
      { card: { id: 'JC', suit: SUITS.CLUBS, value: 'J' }, playedBy: PLAYER_ROLES[3] }, // East
    ];

    gameState.currentPlayer = PLAYER_ROLES[0]; // South's turn

    const cardToPlay = { id: 'AS', suit: SUITS.SPADES, value: 'A' };
    gameState.players[PLAYER_ROLES[0]].hand = [
      cardToPlay,
      { id: '2S', suit: SUITS.SPADES, value: '2' },
      { id: '3S', suit: SUITS.SPADES, value: '3' },
      { id: '4S', suit: SUITS.SPADES, value: '4' },
      { id: '5S', suit: SUITS.SPADES, value: '5' },
    ];

    mockValidation.validatePlay.mock.mockImplementation(() => ({ valid: true, errors: [] }));

    const mockedDetermineTrickWinner = t.mock.fn(() => PLAYER_ROLES[0]); // South wins
    const mockedHandlePlayCard = (gameState, playerRole, cardPlayed) => {
        const context = {
            determineTrickWinner: mockedDetermineTrickWinner,
            validatePlay: mockValidation.validatePlay,
            players: mockPlayers,
            deck: mockDeck,
            logger: loggerMock
        };
        return originalHandlePlayCard.call(context, gameState, playerRole, cardPlayed);
    };

    const newState = mockedHandlePlayCard(gameState, PLAYER_ROLES[0], cardToPlay);

    assert.strictEqual(newState.gamePhase, GAME_PHASES.SCORING);
    assert.strictEqual(newState.tricksTaken[TEAMS.TEAM_NS], 4);
    assert.strictEqual(newState.tricksTaken[TEAMS.TEAM_EW], 1);
  });

  await t.test('determineTrickWinner', async (t) => {
    t.test('should throw PhaseLogicError if trick doesn\'t have exactly 4 cards', (t) => {
      const trick = [
        { suit: SUITS.HEARTS, value: 'A', playedBy: 'player1' },
        { suit: SUITS.HEARTS, value: 'K', playedBy: 'player2' },
        { suit: SUITS.HEARTS, value: 'Q', playedBy: 'player3' },
      ];

      assert.throws(
        () => determineTrickWinner(trick, SUITS.SPADES, 'player1'),
        (err) => {
          assert.ok(err instanceof PhaseLogicError);
          assert.strictEqual(err.message, 'Trick must have 4 cards to determine a winner');
          return true;
        }
      );
    });

    t.test('should return the player who played the highest card of the led suit when no trump is played', (t) => {
      const trick = [
        { card: { suit: SUITS.HEARTS, value: 'A' }, playedBy: 'player1' },
        { card: { suit: SUITS.HEARTS, value: 'K' }, playedBy: 'player2' },
        { card: { suit: SUITS.HEARTS, value: 'Q' }, playedBy: 'player3' },
        { card: { suit: SUITS.HEARTS, value: 'J' }, playedBy: 'player4' },
      ];

      mockDeck.getCardRank.mock.mockImplementation((card) => {
        const values = { J: 11, Q: 12, K: 13, A: 14 };
        return values[card.value];
      });

      const winner = determineTrickWinner(trick, SUITS.SPADES, 'player1');
      assert.strictEqual(winner, 'player1');
    });

    t.test('should return the player who played the highest trump card when trump is played', (t) => {
      const trick = [
        { card: { suit: SUITS.HEARTS, value: 'A' }, playedBy: 'player1' }, // Non-trump ace
        { card: { suit: SUITS.SPADES, value: 'J' }, playedBy: 'player2' }, // Right bower
        { card: { suit: SUITS.HEARTS, value: 'K' }, playedBy: 'player3' }, // Non-trump king
        { card: { suit: SUITS.SPADES, value: 'Q' }, playedBy: 'player4' }, // Trump queen
      ];

      mockDeck.getCardRank.mock.mockImplementation((card, trumpSuit) => {
        const baseValues = { 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14 };
        if (card.suit === trumpSuit && card.value === 'J') return 40;
        if (card.suit === trumpSuit) return 20 + baseValues[card.value];
        return baseValues[card.value];
      });

      const winner = determineTrickWinner(trick, SUITS.SPADES, 'player1');
      assert.strictEqual(winner, 'player2');
    });

    t.test('should handle the left bower correctly', (t) => {
      const trick = [
        { card: { suit: SUITS.CLUBS, value: 'J' }, playedBy: 'player1' }, // Left bower
        { card: { suit: SUITS.SPADES, value: 'J' }, playedBy: 'player2' }, // Right bower
        { card: { suit: SUITS.SPADES, value: 'A' }, playedBy: 'player3' }, // Trump ace
        { card: { suit: SUITS.HEARTS, value: 'A' }, playedBy: 'player4' }, // Non-trump
      ];

      mockDeck.getCardRank.mock.mockImplementation((card, trumpSuit, ledSuit) => {
        const baseValues = { J: 11, Q: 12, K: 13, A: 14 };
        if (card.suit === trumpSuit && card.value === 'J') return 40; // Right bower

        const isLeftBower =
          card.value === 'J' &&
          ((trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS) ||
           (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES) ||
           (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS) ||
           (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS));

        if (isLeftBower) return 39; // Left bower is just below right
        if (card.suit === trumpSuit) return 20 + baseValues[card.value];
        return baseValues[card.value];
      });

      const winner = determineTrickWinner(trick, SUITS.SPADES, 'player1');
      assert.strictEqual(winner, 'player2'); // Right bower (J of spades) wins

      const winner2 = determineTrickWinner(trick, SUITS.CLUBS, 'player1');
      assert.strictEqual(winner2, 'player1'); // Right bower (J of clubs) wins
    });

    t.test('should handle the case where all cards are of the led suit with no trump', (t) => {
      const trick = [
        { card: { suit: SUITS.HEARTS, value: '10' }, playedBy: 'player1' },
        { card: { suit: SUITS.HEARTS, value: 'K' }, playedBy: 'player2' },
        { card: { suit: SUITS.HEARTS, value: 'Q' }, playedBy: 'player3' },
        { card: { suit: SUITS.HEARTS, value: 'J' }, playedBy: 'player4' },
      ];

      mockDeck.getCardRank.mock.mockImplementation((card) => {
        const values = { '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        return values[card.value];
      });

      const winner = determineTrickWinner(trick, SUITS.SPADES, 'player1');
      assert.strictEqual(winner, 'player2'); // King is highest
    });
  });
});
