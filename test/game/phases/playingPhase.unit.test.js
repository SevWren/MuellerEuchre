// filepath: test/game/phases/playingPhase.unit.test.js
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
} from '../../../src/game/logic/errors.js';

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

test('PlayingPhase Logic', async (t) => {
  await t.test('handlePlayCard', async (t) => {
    let handlePlayCard;
    let mockValidation;
    let mockPlayers;
    let mockDeck;
    let loggerMock;

    // Mock logger
    loggerMock = {
      info: t.mock.fn(),
      warn: t.mock.fn(),
      error: t.mock.fn(),
      debug: t.mock.fn(),
      log: t.mock.fn(),
    };

    mockValidation = {
      validatePlay: t.mock.fn(() => ({ valid: true, errors: [] })),
    };

    mockPlayers = {
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

    mockDeck = {
      createDeck: t.mock.fn(createDeck),
      shuffleDeck: t.mock.fn(shuffleDeck),
      getCardRank: t.mock.fn(), // Will be mocked specifically in relevant tests
    };

    // Dynamically import the module with mocks
    const playingPhaseModule = await import('../../../src/game/phases/playingPhase.js');
    playingPhaseModule.default.logger = loggerMock;
    playingPhaseModule.default.validation = mockValidation;
    playingPhaseModule.default.players = mockPlayers;
    playingPhaseModule.default.deck = mockDeck;
    handlePlayCard = playingPhaseModule.handlePlayCard;

    t.test('should throw TypeError if currentGameState is null', (t) => {
      assert.throws(
        () => handlePlayCard(null, PLAYER_ROLES[0], createTestCard(SUITS.HEARTS, 'A')),
        TypeError,
        /Cannot read propert.*players/
      );
    });

    t.test('should throw PhaseLogicError if playerRole is invalid', (t) => {
      const gameState = createPlayingGameState();
      mockValidation.validatePlay.mock.mockImplementation(() => ({ valid: true, errors: [] }));

      assert.throws(
        () => handlePlayCard(gameState, 'INVALID_PLAYER', createTestCard(SUITS.HEARTS, 'A')),
        (err) => {
          assert.strictEqual(err.message, 'Player INVALID_PLAYER not found');
          return err instanceof PhaseLogicError;
        }
      );
    });

    t.test('should call validatePlay with correct arguments', (t) => {
      const gameState = createPlayingGameState();
      const playerRole = gameState.currentPlayer; // West
      const cardPlayed = gameState.players[playerRole].hand[0];

      mockValidation.validatePlay.mock.mockImplementation(() => ({ valid: true, errors: [] }));

      handlePlayCard(gameState, playerRole, cardPlayed);

      assert.strictEqual(mockValidation.validatePlay.mock.callCount(), 1);
      const callArgs = mockValidation.validatePlay.mock.calls[0].arguments;

      assert.deepStrictEqual(callArgs[0], gameState); // validatePlay expects full gameState
      assert.deepStrictEqual(callArgs[1], gameState.players[playerRole].hand);
      assert.deepStrictEqual(callArgs[2], cardPlayed);
      assert.strictEqual(callArgs[3], playerRole);
    });

    t.test('should propagate CardNotInHandError from validatePlay', (t) => {
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

    t.test('should propagate MustFollowSuitError from validatePlay', (t) => {
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

    t.test('should play a card, update hand, currentTrick, and currentPlayer if trick is not over', (t) => {
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
        id: cardToPlay.id,
        suit: cardToPlay.suit,
        value: cardToPlay.value,
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
        { player: player1, card: { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN } },
        { player: player2, card: { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN } },
        { player: player3, card: { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING } },
      ];

      gameState.currentPlayer = player4;

      const aceOfSpades = { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE };
      gameState.players[player4].hand = [
        aceOfSpades,
        ...gameState.players[player4].hand.filter((card) => card.id !== 'AS').slice(0, 4),
      ];

      gameState.trumpSuit = SUITS.SPADES;

      mockValidation.validatePlay.mock.mockImplementation(() => ({ valid: true, errors: [] }));
      mockPlayers.getNextPlayer.mock.mockImplementation(() => player4);
      mockPlayers.getPartner.mock.mockImplementation((role) => {
        const partnerMap = {
          [PLAYER_ROLES[0]]: PLAYER_ROLES[2], // South's partner is North
          [PLAYER_ROLES[1]]: PLAYER_ROLES[3], // West's partner is East
          [PLAYER_ROLES[2]]: PLAYER_ROLES[0], // North's partner is South
          [PLAYER_ROLES[3]]: PLAYER_ROLES[1], // East's partner is West
        };
        return partnerMap[role];
      });

      // Mock getCardRank for this specific test
      const mockGetCardRank = t.mock.fn((card, trumpSuit, ledSuit) => {
        if (card.id === 'AS') return 100;
        return 1;
      });

      const mockedPlayingPhaseModule = await mock.module(
        '../../../src/game/phases/playingPhase.js',
        {
          '../../../src/utils/logger.js': loggerMock,
          '../../../src/game/logic/validation.js': mockValidation,
          '../../../src/utils/players.js': mockPlayers,
          '../../../src/utils/deck.js': {
            ...mockDeck, // Keep other deck functions if needed
            getCardRank: mockGetCardRank,
          },
        }
      );
      const mockedHandlePlayCard = mockedPlayingPhaseModule.handlePlayCard;

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
        { player: player1, card: { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN } },
        { player: player2, card: { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN } },
        { player: player3, card: { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING } },
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
      mockPlayers.getNextPlayer.mock.mockImplementation(() => player4);
      mockPlayers.getPartner.mock.mockImplementation(() => null); // Simulate error condition

      const mockGetCardRank = t.mock.fn((card, trumpSuit, ledSuit) => {
        if (card.id === 'AS') return 100;
        return 1;
      });

      mockGetCardRank.mockImplementation((card, trumpSuit, ledSuit) => {
        if (card === 'AS') return 14;
        if (card === 'KS') return 13;
        return 0;
      });
      
      const mockedPlayingPhaseModule = await import('../../../src/game/phases/playingPhase.js');
      mockedPlayingPhaseModule.default.logger = loggerMock;
      mockedPlayingPhaseModule.default.validation = mockValidation;
      mockedPlayingPhaseModule.default.players = mockPlayers;
      mockedPlayingPhaseModule.default.deck = mockDeck;
      const mockedHandlePlayCard = mockedPlayingPhaseModule.handlePlayCard;

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
        { id: 'KC', suit: SUITS.CLUBS, value: 'K', playedBy: PLAYER_ROLES[1] }, // West
        { id: 'QC', suit: SUITS.CLUBS, value: 'Q', playedBy: PLAYER_ROLES[2] }, // North
        { id: 'JC', suit: SUITS.CLUBS, value: 'J', playedBy: PLAYER_ROLES[3] }, // East
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
      mockPlayers.getNextPlayer.mock.mockImplementation(() => PLAYER_ROLES[1]);
      mockPlayers.getPartner.mock.mockImplementation(() => PLAYER_ROLES[2]); // North is South's partner

      const mockGetCardRank = t.mock.fn((card, trumpSuit, ledSuit) => {
        if (card.id === 'AS') return 100;
        return 1;
      });

      mockGetCardRank.mockImplementation((card, trumpSuit, ledSuit) => {
        if (card === 'AS') return 14;
        if (card === 'KS') return 13;
        return 0;
      });
      
      const mockedPlayingPhaseModule = await import('../../../src/game/phases/playingPhase.js');
      mockedPlayingPhaseModule.default.logger = loggerMock;
      mockedPlayingPhaseModule.default.validation = mockValidation;
      mockedPlayingPhaseModule.default.players = mockPlayers;
      mockedPlayingPhaseModule.default.deck = mockDeck;
      const mockedHandlePlayCard = mockedPlayingPhaseModule.handlePlayCard;

      const newState = mockedHandlePlayCard(gameState, PLAYER_ROLES[0], cardToPlay);

      assert.strictEqual(newState.gamePhase, GAME_PHASES.SCORING);
      assert.strictEqual(newState.tricksTaken[TEAMS.TEAM_NS], 4);
      assert.strictEqual(newState.tricksTaken[TEAMS.TEAM_EW], 1);
    });
  }); // End of handlePlayCard tests

  await t.test('determineTrickWinner', async (t) => {
    let determineTrickWinner;
    let mockGetCardRank;
    let loggerMock;
    let mockValidation;
    let mockPlayers;
    let mockDeck;

    loggerMock = {
      info: t.mock.fn(),
      warn: t.mock.fn(),
      error: t.mock.fn(),
      debug: t.mock.fn(),
      log: t.mock.fn(),
    };

    mockValidation = {
      validatePlay: t.mock.fn(() => ({ valid: true, errors: [] })),
    };

    mockPlayers = {
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

    mockDeck = {
      createDeck: t.mock.fn(createDeck),
      shuffleDeck: t.mock.fn(shuffleDeck),
      getCardRank: t.mock.fn(), // Will be mocked specifically in relevant tests
    };

    const playingPhaseModule = await import('../../../src/game/phases/playingPhase.js');
    playingPhaseModule.default.logger = loggerMock;
    playingPhaseModule.default.validation = mockValidation;
    playingPhaseModule.default.players = mockPlayers;
    playingPhaseModule.default.deck = mockDeck;
    determineTrickWinner = playingPhaseModule.determineTrickWinner;

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
        { suit: SUITS.HEARTS, value: 'A', playedBy: 'player1' },
        { suit: SUITS.HEARTS, value: 'K', playedBy: 'player2' },
        { suit: SUITS.HEARTS, value: 'Q', playedBy: 'player3' },
        { suit: SUITS.HEARTS, value: 'J', playedBy: 'player4' },
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
        { suit: SUITS.HEARTS, value: 'A', playedBy: 'player1' }, // Non-trump ace (14)
        { suit: SUITS.SPADES, value: 'J', playedBy: 'player2' }, // Right bower (highest)
        { suit: SUITS.HEARTS, value: 'K', playedBy: 'player3' }, // Non-trump king (13)
        { suit: SUITS.SPADES, value: 'Q', playedBy: 'player4' }, // Trump queen (32)
      ];

      mockDeck.getCardRank.mock.mockImplementation((card, trumpSuit) => {
        const baseValues = { 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14 };
        if (card.suit === trumpSuit && card.value === 'J') return 40;
        if (card.suit === trumpSuit) return 20 + baseValues[card.value];
        return baseValues[card.value];
      });

      const winner = determineTrickWinner(trick, SUITS.SPADES, 'player1');
      assert.strictEqual(winner, 'player2');

      const values = {
        player1: mockDeck.getCardRank({ suit: SUITS.HEARTS, value: 'A' }, SUITS.SPADES, SUITS.HEARTS),
        player2: mockDeck.getCardRank({ suit: SUITS.SPADES, value: 'J' }, SUITS.SPADES, SUITS.HEARTS),
        player3: mockDeck.getCardRank({ suit: SUITS.HEARTS, value: 'K' }, SUITS.SPADES, SUITS.HEARTS),
        player4: mockDeck.getCardRank({ suit: SUITS.SPADES, value: 'Q' }, SUITS.SPADES, SUITS.HEARTS),
      };

      assert.ok(values.player2 > values.player4, 'Right bower > other trump');
      assert.ok(values.player4 > values.player1, 'Trump > non-trump ace');
      assert.ok(values.player1 > values.player3, 'Ace > king (both non-trump)');
    });

    t.test('should handle the left bower as the highest trump card', (t) => {
      const trick = [
        { suit: SUITS.CLUBS, value: 'J', playedBy: 'player1' }, // Left bower (highest when spades are trump)
        { suit: SUITS.SPADES, value: 'J', playedBy: 'player2' }, // Right bower
        { suit: SUITS.SPADES, value: 'A', playedBy: 'player3' }, // Trump ace
        { suit: SUITS.HEARTS, value: 'A', playedBy: 'player4' }, // Non-trump
      ];

      mockDeck.getCardRank.mock.mockImplementation((card, trumpSuit, ledSuit) => {
        const baseValues = { J: 11, Q: 12, K: 13, A: 14 };
        if (card.suit === trumpSuit && card.value === 'J') return 40;

        const isLeftBower =
          card.value === 'J' &&
          ((trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS) ||
            (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES) ||
            (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS) ||
            (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS));

        if (isLeftBower) return 39;
        if (card.suit === trumpSuit) return 20 + baseValues[card.value];
        return baseValues[card.value];
      });

      const winner = determineTrickWinner(trick, SUITS.SPADES, 'player1');
      assert.strictEqual(winner, 'player2'); // Right bower (J of spades) wins

      const winner2 = determineTrickWinner(trick, SUITS.CLUBS, 'player1');
      assert.strictEqual(winner2, 'player1'); // Left bower (J of clubs when clubs are trump)
    });

    t.test('should handle the case where all cards are of the led suit with no trump', (t) => {
      const trick = [
        { suit: SUITS.HEARTS, value: '10', playedBy: 'player1' },
        { suit: SUITS.HEARTS, value: 'K', playedBy: 'player2' },
        { suit: SUITS.HEARTS, value: 'Q', playedBy: 'player3' },
        { suit: SUITS.HEARTS, value: 'J', playedBy: 'player4' },
      ];

      mockDeck.getCardRank.mock.mockImplementation((card) => {
        const values = { 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14 };
        return values[card.value];
      });

      const winner = determineTrickWinner(trick, SUITS.SPADES, 'player1');
      assert.strictEqual(winner, 'player2'); // King is highest
    });
  }); // End of determineTrickWinner tests
}); // End of PlayingPhase Logic tests
