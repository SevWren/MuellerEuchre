/**
 * @file Test suite for the playing phase logic of the Euchre game.
 * @module test/game/phases/playingPhase.unit.test
 * @description Comprehensive test suite for the Euchre game's playing phase, covering all aspects
 * of card play, trick taking, and game state management. This suite verifies the core game logic 
 * for the playing phase, including:
 * - Basic validation of card plays
 * - Enforcement of game rules (following suit, valid plays)
 * - Trick winner determination
 * - Game state transitions
 * - Edge cases and error conditions
 * - Special rules like going alone
 *
 * @see {@link module:src/game/phases/playingPhase} - The implementation being tested.
 * @see {@link module:docs/Knowledge/The Left Bowers Identity Shift.md} - Documentation on Left Bower behavior.
 * @see {@link module:docs/Knowledge/The Complete Card Ranking Hierarchy.md} - Card ranking documentation.
 * @see {@link module:docs/Knowledge/The Going Alone Gameplay and Scoring Modifiers.md} - Going alone rules.
 * @see {@link module:src/game/logic/validation-core} - Core validation logic.
 * @see {@link module:src/utils/cardUtils} - Card utilities and helpers.
 *
 * @typedef {import('../../../src/config/constants.js').GAME_PHASES} GAME_PHASES - Game phase constants.
 * @typedef {import('../../../src/config/constants.js').CARD_SUITS} CARD_SUITS - Card suit constants.
 * @typedef {import('../../../src/config/constants.js').CARD_VALUES} CARD_VALUES - Card value constants.
 * @typedef {import('../../../src/config/constants.js').PLAYER_POSITIONS} PLAYER_POSITIONS - Player position constants.
 * @typedef {import('../../../src/game/logic/validation-errors.js').PhaseLogicError} PhaseLogicError - Phase-specific errors.
 * @typedef {import('../../../src/game/logic/validation-errors.js').NotPlayersTurnError} NotPlayersTurnError - Turn validation errors.
 * @typedef {import('../../../src/game/logic/validation-errors.js').CardNotInHandError} CardNotInHandError - Card validation errors.
 * @typedef {import('../../../src/game/logic/validation-errors.js').MustFollowSuitError} MustFollowSuitError - Suit following errors.
 * @typedef {import('../../../src/game/logic/validation-errors.js').InvalidCardError} InvalidCardError - Invalid card errors.
 *
 * @example
 * // Run all tests in this file
 * node --test test/game/phases/playingPhase.unit.test.js
 *
 * @example
 * // Run a specific test suite
 * node --test test/game/phases/playingPhase.unit.test.js -m "PlayingPhase Logic - handlePlayCard"
 */

import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Import SUT functions directly
import { handlePlayCard, determineTrickWinner } from '../../../src/game/phases/playingPhase.js';

// Import constants and errors
import { GAME_PHASES, CARD_SUITS, CARD_VALUES, PLAYER_POSITIONS } from '../../../src/config/constants.js';
import {
  PhaseLogicError,
  NotPlayersTurnError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidCardError
} from '../../../src/game/logic/validation-errors.js';

// Import actual dependency modules
import * as validationCore from '../../../src/game/logic/validation-core.js';
import * as cardUtils from '../../../src/utils/cardUtils.js';
import * as players from '../../../src/utils/players.js';

// Import test helpers directly
import { createDeck, shuffleDeck } from '../../../src/utils/deck.js';
import { initializePlayers } from '../../../src/utils/players.js';

/**
 * Creates a complete game state object for testing the playing phase of Euchre.
 * This factory function initializes all necessary game state properties with sensible defaults,
 * allowing for easy customization of specific test scenarios through the options parameter.
 *
 * @function createPlayingGameState
 * @param {Object} [options={}] - Configuration options for the game state.
 * @param {string} [options.gameId='playingPhaseTestGame'] - Unique identifier for the game.
 * @param {PLAYER_POSITIONS} [options.dealer=PLAYER_POSITIONS.PLAYER_SOUTH] - The dealer position.
 * @param {PLAYER_POSITIONS} [options.currentPlayer] - Current player position (defaults to left of dealer).
 * @param {CARD_SUITS} [options.trumpSuit=CARD_SUITS.CARD_SUIT_SPADES] - The trump suit for the current hand.
 * @param {'TEAM_NS'|'TEAM_EW'} [options.makerTeam='TEAM_NS'] - Team that made the trump.
 * @param {PLAYER_POSITIONS} [options.playerWhoOrderedUp] - Player who ordered up (defaults to dealer).
 * @param {Array<Object>} [options.currentTrick=[]] - Array of cards played in the current trick.
 * @param {Object.<string, number>} [options.tricksTaken] - Number of tricks taken by each team.
 * @param {boolean} [options.goingAlone=false] - Whether a player is going alone.
 * @param {PLAYER_POSITIONS|null} [options.partnerSittingOut=null] - Partner sitting out if going alone.
 * @param {number} [options.winningScore=10] - Score needed to win the game.
 * @param {Object.<PLAYER_POSITIONS, Array<{suit: CARD_SUITS, value: CARD_VALUES, id: string}>>} [options.customHands] - Custom card hands for players.
 * @returns {Object} A fully initialized game state object with the following structure:
 * @returns {string} gameId - Unique game identifier.
 * @returns {string} gamePhase - Current game phase (always set to PLAYING).
 * @returns {Object} players - Map of player positions to player objects.
 * @returns {PLAYER_POSITIONS} dealer - Current dealer position.
 * @returns {PLAYER_POSITIONS} currentPlayer - Current player's turn.
 * @returns {CARD_SUITS} trumpSuit - Current trump suit.
 * @returns {string} makerTeam - Team that made the trump.
 * @returns {PLAYER_POSITIONS} playerWhoOrderedUp - Player who ordered up the trump.
 * @returns {Array<Object>} currentTrick - Cards played in the current trick.
 * @returns {Object.<string, number>} tricksTaken - Number of tricks taken by each team.
 * @returns {boolean} goingAlone - Whether a player is going alone.
 * @returns {PLAYER_POSITIONS|null} partnerSittingOut - Partner sitting out if going alone.
 * @returns {number} winningScore - Score needed to win the game.
 *
 * @example
 * // Create a basic game state
 * const gameState = createPlayingGameState();
 *
 * @example
 * // Create a custom game state with specific trump and dealer
 * const customState = createPlayingGameState({
 *   trumpSuit: CARD_SUITS.CARD_SUIT_HEARTS,
 *   dealer: PLAYER_POSITIONS.PLAYER_EAST,
 *   goingAlone: true,
 *   partnerSittingOut: PLAYER_POSITIONS.PLAYER_WEST
 * });
 */
const createPlayingGameState = ({
  gameId = 'playingPhaseTestGame',
  dealer = PLAYER_POSITIONS.PLAYER_SOUTH,
  currentPlayer,
  trumpSuit = CARD_SUITS.CARD_SUIT_SPADES,
  makerTeam = 'TEAM_NS',
  playerWhoOrderedUp,
  currentTrick = [],
  tricksTaken,
  goingAlone = false,
  partnerSittingOut = null,
  winningScore = 10,
  customHands = {}
} = {}) => {
  // Initialize players with their roles and empty hands
  const initialPlayerObjects = initializePlayers();
  
  // If custom hands are provided, use them; otherwise, deal random cards
  let playersWithHands;
  
  if (Object.keys(customHands).length > 0) {
    // Use provided custom hands
    playersWithHands = Object.entries(initialPlayerObjects).reduce((acc, [role, player]) => {
      acc[role] = {
        ...player,
        hand: customHands[role] || []
      };
      return acc;
    }, {});
  } else {
    // Deal random cards
    const deck = shuffleDeck(createDeck());
    const playerHands = {};

    // Deal 5 cards to each player
    Object.values(PLAYER_POSITIONS).forEach((role) => {
      playerHands[role] = [];
      for (let i = 0; i < 5; i++) {
        if (deck.length > 0) playerHands[role].push(deck.pop());
      }
    });

    playersWithHands = Object.entries(initialPlayerObjects).reduce((acc, [role, player]) => {
      acc[role] = {
        ...player,
        hand: playerHands[role] || []
      };
      return acc;
    }, {});
  }

  // Set default currentPlayer to dealer if not specified
  const currentPlayerRole = currentPlayer || dealer;
  
  // Set default playerWhoOrderedUp to dealer if not specified
  const orderedUpBy = playerWhoOrderedUp || dealer;
  
  // Set default tricks taken if not specified
  const defaultTricksTaken = { 'TEAM_NS': 0, 'TEAM_EW': 0 };
  
  return {
    gameId,
    gamePhase: GAME_PHASES.PLAYING,
    players: playersWithHands,
    dealer,
    currentPlayer: currentPlayerRole,
    trumpSuit,
    makerTeam,
    playerWhoOrderedUp: orderedUpBy,
    currentTrick: [...currentTrick], // Ensure we don't modify the input array
    tricksTaken: { ...defaultTricksTaken, ...tricksTaken },
    gameMessages: [],
    settings: { winningScore },
    goingAlone,
    partnerSittingOut,
    // Add timestamps for game state tracking
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
};

/**
 * Creates a standardized card object for testing purposes.
 * 
 * @function createTestCard
 * @param {CARD_SUITS} suit - The suit of the card (must be a valid CARD_SUITS constant).
 * @param {CARD_VALUES} value - The value/rank of the card (must be a valid CARD_VALUES constant).
 * @returns {Object} A card object with the following properties:
 * @returns {string} id - A unique identifier for the card.
 * @returns {CARD_SUITS} suit - The suit of the card.
 * @returns {CARD_VALUES} value - The value/rank of the card.
 *
 * @example
 * // Create a test card
 * const aceOfHearts = createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'A');
 * 
 * @throws {TypeError} If suit or value is not provided or invalid.
 */
const createTestCard = (suit, value) => ({ suit, value, id: `${value}${suit.charAt(8)}` });

/**
 * A collection of utility functions for creating test data structures.
 * These helpers make it easier to construct specific game states for testing
 * various scenarios in the playing phase.
 * 
 * @namespace testUtils
 * @property {function} createTrick - Creates a mock trick array with played cards.
 * @property {function} createHand - Creates a player's hand array from card definitions.
 * @property {function} createPlayedCard - Creates a played card object with player info.
 */
const testUtils = {
  /**
   * Creates a trick array with cards played by specified players.
   * 
   * @function createTrick
   * @param {Array<Object>} cards - Array of card objects to include in the trick.
   * @param {Array<PLAYER_POSITIONS>} players - Array of player positions in play order.
   * @returns {Array<{card: Object, playedBy: PLAYER_POSITIONS}>} Trick array with cards and their players.
   * 
   * @example
   * const trick = testUtils.createTrick(
   *   [card1, card2, card3, card4],
   *   [PLAYER_POSITIONS.PLAYER_SOUTH, PLAYER_POSITIONS.PLAYER_WEST, 
   *    PLAYER_POSITIONS.PLAYER_NORTH, PLAYER_POSITIONS.PLAYER_EAST]
   * );
   */
  createTrick: (cards, players) => {
    if (!Array.isArray(cards) || !Array.isArray(players)) {
      throw new TypeError('Both cards and players must be arrays');
    }
    return cards.map((card, index) => ({
      card,
      playedBy: players[index % players.length]
    }));
  },

  /**
   * Creates a player's hand from an array of card definitions.
   * 
   * @function createHand
   * @param {Array<{suit: CARD_SUITS, value: CARD_VALUES}>} cards - Array of card definitions.
   * @returns {Array<Object>} Array of card objects with generated IDs.
   * 
   * @example
   * const hand = testUtils.createHand([
   *   {suit: CARD_SUITS.CARD_SUIT_HEARTS, value: 'A'},
   *   {suit: CARD_SUITS.CARD_SUIT_SPADES, value: 'K'}
   * ]);
   */
  createHand: (cards) => {
    if (!Array.isArray(cards)) {
      throw new TypeError('Cards must be an array');
    }
    return cards.map(card => ({
      ...card,
      id: `${card.value}_of_${card.suit}`
    }));
  },

  /**
   * Creates a played card object with player information.
   * 
   * @function createPlayedCard
   * @param {PLAYER_POSITIONS} player - The player who played the card.
   * @param {Object} card - The card that was played.
   * @returns {{card: Object, playedBy: PLAYER_POSITIONS}} Played card object.
   * 
   * @example
   * const playedCard = testUtils.createPlayedCard(
   *   PLAYER_POSITIONS.PLAYER_NORTH,
   *   {suit: CARD_SUITS.CARD_SUIT_DIAMONDS, value: 'Q'}
   * );
   */
  createPlayedCard: (player, card) => ({
    card,
    playedBy: player
  })
};  

/**
 * @name PlayingPhase Logic - Basic Validation
 * @description Test suite for the basic validation logic in the playing phase.
 */
describe('PlayingPhase Logic - Basic Validation', { concurrency: false }, () => {
  let mockServices;

  beforeEach(() => {
    mockServices = {
      validatePlay: mock.fn(validationCore.validatePlay),
      getNextPlayer: mock.fn(players.getNextPlayer),
      determineTrickWinner: mock.fn(determineTrickWinner)
    };
  });

  afterEach(() => {
    mock.restoreAll();
  });

  /**
   * @description Verifies that `handlePlayCard` throws a TypeError if the gameState is null.
   */
  it('should throw TypeError if gameState is null', () => {
    const invalidGameState = null;
    const playerRole = PLAYER_POSITIONS.PLAYER_SOUTH;
    const cardToPlay = createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'A');
    
    assert.throws(
      () => handlePlayCard.call(mockServices, invalidGameState, playerRole, cardToPlay),
      { name: 'TypeError', message: 'gameState must be an object' },
      'Should throw TypeError for null gameState'
    );
    
    assert.strictEqual(mockServices.validatePlay.mock.calls.length, 0, 'validatePlay should not be called');
  });

  /**
   * @description Verifies that `handlePlayCard` throws a PhaseLogicError if the playerRole is not found.
   */
  it('should throw PhaseLogicError if playerRole is invalid', () => {
    const gameState = createPlayingGameState();
    const invalidPlayerRole = 'INVALID_PLAYER';
    const cardToPlay = createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'A');

    assert.throws(
      () => handlePlayCard.call(mockServices, gameState, invalidPlayerRole, cardToPlay),
      { name: 'PhaseLogicError', message: `Player ${invalidPlayerRole} not found` },
      'Should throw PhaseLogicError for invalid player role'
    );

    assert.strictEqual(mockServices.validatePlay.mock.calls.length, 0, 'validatePlay should not be called');
  });

  /**
   * @description Verifies that `handlePlayCard` propagates a CardNotInHandError from the validation layer.
   */
  it('should throw CardNotInHandError if card is not in player\'s hand', () => {
    const gameState = createPlayingGameState();
    const playerRole = gameState.currentPlayer;
    const cardNotInHand = createTestCard(CARD_SUITS.CARD_SUIT_SPADES, 'A');
    const playerHand = gameState.players[playerRole].hand;

    mockServices.validatePlay.mock.mockImplementation(() => {
      throw new CardNotInHandError(cardNotInHand.id, playerHand.map(c => c.id));
    });

    assert.throws(
      () => handlePlayCard.call(mockServices, gameState, playerRole, cardNotInHand),
      {
        name: 'CardNotInHandError',
        message: `Card with ID '${cardNotInHand.id}' not found in player's hand.`
      },
      'Should throw CardNotInHandError when card is not in player\'s hand'
    );

    assert.strictEqual(mockServices.validatePlay.mock.calls.length, 1, 'validatePlay should be called once');
  });

  /**
   * @description Verifies that `handlePlayCard` propagates a NotPlayersTurnError from the validation layer.
   */
  it('should throw NotPlayersTurnError when not the player\'s turn', () => {
    const gameState = createPlayingGameState();
    const currentPlayer = gameState.currentPlayer;
    const notCurrentPlayer = PLAYER_POSITIONS.PLAYER_WEST;
    const cardToPlay = createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'A');

    mockServices.validatePlay.mock.mockImplementation(() => {
      throw new NotPlayersTurnError(notCurrentPlayer, currentPlayer);
    });

    assert.throws(
      () => handlePlayCard.call(mockServices, gameState, notCurrentPlayer, cardToPlay),
      {
        name: 'NotPlayersTurnError',
        message: `Not ${notCurrentPlayer}'s turn. It is ${currentPlayer}'s turn.`,
        playerRole: notCurrentPlayer,
        currentPlayer: currentPlayer
      },
      'Should throw NotPlayersTurnError when not the player\'s turn'
    );

    assert.strictEqual(mockServices.validatePlay.mock.calls.length, 1, 'validatePlay should be called once');
  });

  /**
   * @description Verifies that `validatePlay` is called with the correct arguments before any state change.
   */
  it('should validate card play before processing', () => {
    const gameState = createPlayingGameState();
    const playerRole = gameState.currentPlayer;
    const playerHand = [...gameState.players[playerRole].hand];
    const cardToPlay = playerHand[0];
    const nextPlayer = PLAYER_POSITIONS.PLAYER_WEST;

    mockServices.getNextPlayer.mock.mockImplementation(() => nextPlayer);

    const updatedGameState = handlePlayCard.call(mockServices, gameState, playerRole, cardToPlay);

    assert.strictEqual(mockServices.validatePlay.mock.callCount(), 1);
    const [callGameState, callPlayerHand, callCardToPlay, callPlayerRole] = mockServices.validatePlay.mock.calls[0].arguments;
    assert.deepStrictEqual(callGameState, gameState);
    assert.deepStrictEqual(callPlayerHand, playerHand);
    assert.deepStrictEqual(callCardToPlay, cardToPlay);
    assert.strictEqual(callPlayerRole, playerRole);
    assert.strictEqual(updatedGameState.currentPlayer, nextPlayer);
    assert.strictEqual(updatedGameState.currentTrick.length, 1);
    assert.deepStrictEqual(updatedGameState.currentTrick[0].card, cardToPlay);
    assert.strictEqual(updatedGameState.currentTrick[0].playedBy, playerRole);
    assert.strictEqual(updatedGameState.players[playerRole].hand.length, playerHand.length - 1);
    assert.ok(!updatedGameState.players[playerRole].hand.some(card => card.id === cardToPlay.id));
  });
});

/**
 * @name PlayingPhase Logic - handlePlayCard
 * @description Test suite for the core card playing logic in the Euchre game.
 */
describe('PlayingPhase Logic - handlePlayCard', { concurrency: false }, () => {
  let mockServices;

  beforeEach(() => {
    mockServices = {
      validatePlay: mock.fn(validationCore.validatePlay),
      getNextPlayer: mock.fn(players.getNextPlayer),
      getCardRank: mock.fn(cardUtils.getCardRank),
      getEffectiveSuit: mock.fn(cardUtils.getEffectiveSuit),
      isLeftBower: mock.fn(cardUtils.isLeftBower),
      isRightBower: mock.fn(cardUtils.isRightBower),
      getPartner: mock.fn(players.getPartner),
    };
    // Explicitly bind SUT functions to mockServices for consistent 'this' context
    mockServices.determineTrickWinner = determineTrickWinner.bind(mockServices);
    mockServices.handlePlayCard = handlePlayCard.bind(mockServices);
  });

  afterEach(() => {
    mock.restoreAll();
  });

  /**
   * @description Verifies that `handlePlayCard` throws an error if the card is not in the player's hand, even if validation was mocked to pass.
   */
  it('should throw CardNotInHandError if card is not in player\'s hand (logic check)', () => {
    const gameState = createPlayingGameState();
    const currentPlayer = gameState.currentPlayer;
    const cardNotInHand = createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'A');
    gameState.players[currentPlayer].hand = testUtils.createHand([
      createTestCard(CARD_SUITS.CARD_SUIT_SPADES, 'K'),
    ]);

    mockServices.validatePlay.mock.mockImplementation(() => true);

    assert.throws(
      () => mockServices.handlePlayCard(gameState, currentPlayer, cardNotInHand),
      (err) => {
        assert.ok(err instanceof PhaseLogicError, 'Error should be PhaseLogicError');
        assert.match(err.message, /Card .* not found in player's hand/);
        return true;
      },
      'Should throw PhaseLogicError if card is not in player\'s hand after validation'
    );
  });

  /**
   * @description Verifies that `handlePlayCard` throws a MustFollowSuitError if a player can follow suit but chooses not to.
   */
  it('should throw MustFollowSuitError if player can follow suit but doesn\'t', () => {
    const trumpSuit = CARD_SUITS.CARD_SUIT_SPADES;
    const ledSuit = CARD_SUITS.CARD_SUIT_HEARTS;
    const customHands = {
      [PLAYER_POSITIONS.PLAYER_SOUTH]: testUtils.createHand([
        createTestCard(ledSuit, 'K'),
        createTestCard(CARD_SUITS.CARD_SUIT_DIAMONDS, 'A')
      ])
    };
    const gameState = createPlayingGameState({
      trumpSuit,
      customHands,
      currentTrick: testUtils.createTrick([createTestCard(ledSuit, '10')], [PLAYER_POSITIONS.PLAYER_EAST])
    });
    const currentPlayer = gameState.currentPlayer;
    const cardNotFollowingSuit = gameState.players[currentPlayer].hand[1];

    assert.throws(
      () => mockServices.handlePlayCard(gameState, currentPlayer, cardNotFollowingSuit),
      (err) => {
        assert.ok(err instanceof MustFollowSuitError, 'Error should be MustFollowSuitError');
        assert.strictEqual(err.ledSuit, ledSuit);
        assert.strictEqual(err.playedSuit, CARD_SUITS.CARD_SUIT_DIAMONDS);
        return true;
      }
    );
  });

  /**
   * @description Verifies that a valid card play correctly updates the game state.
   */
  it('should play a card and update game state correctly', () => {
    const customHands = {
      [PLAYER_POSITIONS.PLAYER_SOUTH]: testUtils.createHand([
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'K'),
        createTestCard(CARD_SUITS.CARD_SUIT_DIAMONDS, 'A'),
      ])
    };
    const gameState = createPlayingGameState({ customHands });
    const currentPlayer = gameState.currentPlayer;
    const cardToPlay = gameState.players[currentPlayer].hand[1];
    const initialHandLength = gameState.players[currentPlayer].hand.length;

    const result = mockServices.handlePlayCard(gameState, currentPlayer, cardToPlay);

    assert.deepStrictEqual(result.currentTrick[0].card, cardToPlay);
    assert.strictEqual(result.currentTrick[0].playedBy, currentPlayer);
    assert.strictEqual(result.players[currentPlayer].hand.length, initialHandLength - 1);
    assert.ok(!result.players[currentPlayer].hand.some(c => c.id === cardToPlay.id));
    assert.strictEqual(result.currentPlayer, PLAYER_POSITIONS.PLAYER_WEST);
  });

  /**
   * @description Verifies that the game transitions to the SCORING phase after the final trick of a hand.
   */
  it('should transition to SCORING phase when trick is complete (5th trick of hand)', () => {
    const trumpSuit = CARD_SUITS.CARD_SUIT_SPADES;
    const customHands = {
      [PLAYER_POSITIONS.PLAYER_SOUTH]: testUtils.createHand([createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'A')]),
    };
    const existingTrick = [
      { card: createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, '10'), playedBy: PLAYER_POSITIONS.PLAYER_EAST },
      { card: createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'Q'), playedBy: PLAYER_POSITIONS.PLAYER_NORTH },
      { card: createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'K'), playedBy: PLAYER_POSITIONS.PLAYER_WEST },
    ];
    const gameState = createPlayingGameState({
      trumpSuit,
      customHands,
      currentTrick: existingTrick,
      tricksTaken: { 'TEAM_NS': 2, 'TEAM_EW': 2 } // 4 tricks already played
    });
    const currentPlayer = gameState.currentPlayer;
    const cardToPlay = gameState.players[currentPlayer].hand[0];

    const updatedGameState = mockServices.handlePlayCard(gameState, currentPlayer, cardToPlay);

    assert.strictEqual(updatedGameState.currentTrick.length, 0);
    assert.strictEqual(updatedGameState.tricksTaken['TEAM_NS'], 3);
    assert.strictEqual(updatedGameState.tricksTaken['TEAM_EW'], 2);
    assert.strictEqual(updatedGameState.gamePhase, GAME_PHASES.SCORING);
    assert.strictEqual(updatedGameState.currentPlayer, null);
    assert.ok(updatedGameState.lastTrick);
    assert.strictEqual(updatedGameState.lastTrick.length, 4);
    assert.strictEqual(updatedGameState.lastTrickWinner, currentPlayer);
    assert.deepStrictEqual(updatedGameState.lastTrickWinningCard, cardToPlay);
    assert.strictEqual(updatedGameState.lastTrickWinningTeam, 'TEAM_NS');
  });

  /**
   * @description Verifies that `getNextPlayer` is called correctly and skips the partner when a player is going alone.
   */
  it('should correctly skip partner when going alone', () => {
    const trumpMaker = PLAYER_POSITIONS.PLAYER_SOUTH;
    const partner = PLAYER_POSITIONS.PLAYER_NORTH;
    const nextPlayerAfterMaker = PLAYER_POSITIONS.PLAYER_WEST;

    const specificCardToPlay = createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'A');
    const customHands = {
      [trumpMaker]: testUtils.createHand([specificCardToPlay]),
    };

    const gameState = createPlayingGameState({
      currentPlayer: trumpMaker,
      goingAlone: true,
      partnerSittingOut: partner,
      dealer: PLAYER_POSITIONS.PLAYER_EAST,
      customHands: customHands,
    });

    const cardToPlay = specificCardToPlay;

    // The mock for getNextPlayer is already on mockServices from beforeEach.
    // We can just let the bound handlePlayCard call it.
    const updatedGameState = mockServices.handlePlayCard(gameState, trumpMaker, cardToPlay);
    
    // THE FIX: Use .mock.callCount() to check if the mock was called.
    assert.strictEqual(mockServices.getNextPlayer.mock.callCount(), 1, 'getNextPlayer should have been called once');

    // Verify the arguments passed to getNextPlayer
    const [spyCall] = mockServices.getNextPlayer.mock.calls;
    assert.strictEqual(spyCall.arguments[0], trumpMaker, "First argument to getNextPlayer should be the current player");
    assert.ok(Array.isArray(spyCall.arguments[1]), "Second argument should be an array of player roles");
    assert.strictEqual(spyCall.arguments[2], true, "Third argument (goingAlone) should be true");
    assert.strictEqual(spyCall.arguments[3], partner, "Fourth argument (partnerSittingOut) should be the correct partner");

    // Verify the final state is correct
    assert.strictEqual(updatedGameState.currentPlayer, nextPlayerAfterMaker, 'Current player should be set to the player after the maker, skipping partner');
  });

  /**
   * @description Verifies that an internal logic error is thrown if a card is not found in the hand after validation passes.
   */
  it('should throw PhaseLogicError if card is not found in hand after successful validation', () => {
    const gameState = createPlayingGameState();
    const currentPlayer = gameState.currentPlayer;
    const cardToPlay = createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'A'); // A card that is NOT in the real hand
    
    // Mock validatePlay to return true, simulating successful validation
    mockServices.validatePlay.mock.mockImplementation(() => true);

    // Manually set up the player's hand so that cardToPlay is NOT actually in it
    // This simulates an inconsistent state where validation passed but the card is missing
    gameState.players[currentPlayer].hand = testUtils.createHand([
      createTestCard(CARD_SUITS.CARD_SUIT_SPADES, 'K'),
      createTestCard(CARD_SUITS.CARD_SUIT_CLUBS, 'Q'),
    ]);

    assert.throws(
      () => mockServices.handlePlayCard(gameState, currentPlayer, cardToPlay),
      (err) => {
        assert.ok(err instanceof PhaseLogicError, 'Error should be PhaseLogicError');
        assert.match(err.message, /Card .* not found in player's hand after validation./);
        return true;
      },
      'Should throw PhaseLogicError if card is not found in hand when attempting to remove it'
    );
  });
});

/**
 * @name PlayingPhase Logic - determineTrickWinner
 * @description Test suite for the logic that determines the winner of a trick in Euchre.
 */
describe('PlayingPhase Logic - determineTrickWinner', { concurrency: false }, () => {
  let mockServices;

  beforeEach(() => {
    mockServices = {
      getCardRank: mock.fn(cardUtils.getCardRank),
      getEffectiveSuit: mock.fn(cardUtils.getEffectiveSuit),
      isLeftBower: mock.fn(cardUtils.isLeftBower),
      isRightBower: mock.fn(cardUtils.isRightBower),
      areSameColor: mock.fn(cardUtils.areSameColor),
    };
  });

  afterEach(() => {
    mock.restoreAll();
  });

  /**
   * @description Verifies that `determineTrickWinner` throws an error if the trick does not contain exactly 4 cards.
   */
  it('should throw PhaseLogicError if trick doesn\'t have exactly 4 cards', () => {
    const trumpSuit = CARD_SUITS.CARD_SUIT_HEARTS;
    const leadPlayerRole = PLAYER_POSITIONS.PLAYER_SOUTH;

    assert.throws(
      () => determineTrickWinner.call(mockServices, [], trumpSuit, leadPlayerRole),
      { name: 'PhaseLogicError', message: 'Trick must have 4 cards to determine a winner' }
    );

    const partialTrick = testUtils.createTrick([createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'A')], [PLAYER_POSITIONS.PLAYER_SOUTH]);
    assert.throws(
      () => determineTrickWinner.call(mockServices, partialTrick, trumpSuit, leadPlayerRole),
      { name: 'PhaseLogicError', message: 'Trick must have 4 cards to determine a winner' }
    );
  });

  /**
   * @description Verifies that the player with the highest card of the leading suit wins when no trump is played.
   */
  it('should return the player with the highest card of the leading suit', () => {
    const trick = testUtils.createTrick(
      [
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, '9'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, '10'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'Q'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'K')
      ],
      [PLAYER_POSITIONS.PLAYER_SOUTH, PLAYER_POSITIONS.PLAYER_WEST, PLAYER_POSITIONS.PLAYER_NORTH, PLAYER_POSITIONS.PLAYER_EAST]
    );
    const trumpSuit = CARD_SUITS.CARD_SUIT_SPADES;
    const leadPlayerRole = PLAYER_POSITIONS.PLAYER_SOUTH;

    const winner = determineTrickWinner.call(mockServices, trick, trumpSuit, leadPlayerRole);

    assert.strictEqual(winner, PLAYER_POSITIONS.PLAYER_EAST);
    assert.strictEqual(mockServices.getCardRank.mock.calls.length, 4);
  });
  
  /**
   * @description Verifies that a trump card wins the trick even if it's a low rank.
   */
  it('should respect trump suit when present', () => {
    const trick = testUtils.createTrick(
      [
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'A'),
        createTestCard(CARD_SUITS.CARD_SUIT_SPADES, '9'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'K'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'Q')
      ],
      [PLAYER_POSITIONS.PLAYER_SOUTH, PLAYER_POSITIONS.PLAYER_WEST, PLAYER_POSITIONS.PLAYER_NORTH, PLAYER_POSITIONS.PLAYER_EAST]
    );
    const trumpSuit = CARD_SUITS.CARD_SUIT_SPADES;
    const leadPlayerRole = PLAYER_POSITIONS.PLAYER_SOUTH;
    
    const winner = determineTrickWinner.call(mockServices, trick, trumpSuit, leadPlayerRole);
    
    assert.strictEqual(winner, PLAYER_POSITIONS.PLAYER_WEST);
  });
  
  /**
   * @description Verifies that the Left Bower is correctly identified as the winning card.
   */
  it('should handle bowers correctly', () => {
    const trick = testUtils.createTrick(
      [
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'A'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'J'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'K'),
        createTestCard(CARD_SUITS.CARD_SUIT_DIAMONDS, 'J')
      ],
      [PLAYER_POSITIONS.PLAYER_SOUTH, PLAYER_POSITIONS.PLAYER_WEST, PLAYER_POSITIONS.PLAYER_NORTH, PLAYER_POSITIONS.PLAYER_EAST]
    );
    const trumpSuit = CARD_SUITS.CARD_SUIT_DIAMONDS;
    const leadPlayerRole = PLAYER_POSITIONS.PLAYER_SOUTH;
    
    const winner = determineTrickWinner.call(mockServices, trick, trumpSuit, leadPlayerRole);
    
    assert.strictEqual(winner, PLAYER_POSITIONS.PLAYER_EAST);
  });

  /**
   * @description Verifies the highest card of the led suit wins when no trump is played.
   */
  it('should return the player who played the highest card of the led suit (no trump)', () => {
    const trumpSuit = CARD_SUITS.CARD_SUIT_SPADES;
    const leadPlayerRole = PLAYER_POSITIONS.PLAYER_SOUTH;
    const trick = testUtils.createTrick(
      [
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, '10'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'K'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'Q'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, '9'),
      ],
      [PLAYER_POSITIONS.PLAYER_SOUTH, PLAYER_POSITIONS.PLAYER_WEST, PLAYER_POSITIONS.PLAYER_NORTH, PLAYER_POSITIONS.PLAYER_EAST]
    );

    const winner = determineTrickWinner.call(mockServices, trick, trumpSuit, leadPlayerRole);
    
    assert.strictEqual(winner, PLAYER_POSITIONS.PLAYER_WEST);
  });

  /**
   * @description Verifies that the highest trump card wins the trick.
   */
  it('should return the player who played the highest trump card', () => {
    const trumpSuit = CARD_SUITS.CARD_SUIT_HEARTS;
    const leadPlayerRole = PLAYER_POSITIONS.PLAYER_SOUTH;
    const trick = testUtils.createTrick(
      [
        createTestCard(CARD_SUITS.CARD_SUIT_DIAMONDS, 'A'),
        createTestCard(CARD_SUITS.CARD_SUIT_DIAMONDS, 'K'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, '10'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'Q'),
      ],
      [PLAYER_POSITIONS.PLAYER_SOUTH, PLAYER_POSITIONS.PLAYER_WEST, PLAYER_POSITIONS.PLAYER_NORTH, PLAYER_POSITIONS.PLAYER_EAST]
    );

    const winner = determineTrickWinner.call(mockServices, trick, trumpSuit, leadPlayerRole);
    
    assert.strictEqual(winner, PLAYER_POSITIONS.PLAYER_EAST);
  });

  /**
   * @description Verifies that the Right Bower wins the trick against other cards.
   */
  it('should handle Bower ranking correctly (Right Bower wins)', () => {
    const trumpSuit = CARD_SUITS.CARD_SUIT_SPADES;
    const leadPlayerRole = PLAYER_POSITIONS.PLAYER_SOUTH;
    const tenOfHearts = createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, '10');
    const aceOfDiamonds = createTestCard(CARD_SUITS.CARD_SUIT_DIAMONDS, 'A');
    const jackOfClubs = createTestCard(CARD_SUITS.CARD_SUIT_CLUBS, 'J');
    const jackOfSpades = createTestCard(CARD_SUITS.CARD_SUIT_SPADES, 'J');
    
    const trick = testUtils.createTrick(
      [tenOfHearts, aceOfDiamonds, jackOfClubs, jackOfSpades],
      [PLAYER_POSITIONS.PLAYER_SOUTH, PLAYER_POSITIONS.PLAYER_WEST, PLAYER_POSITIONS.PLAYER_NORTH, PLAYER_POSITIONS.PLAYER_EAST]
    );

    const result = determineTrickWinner.call(mockServices, trick, trumpSuit, leadPlayerRole);
    
    assert.strictEqual(result, PLAYER_POSITIONS.PLAYER_EAST);
  });

  /**
   * @description Verifies that the Left Bower wins the trick against other trump cards.
   */
  it('should handle Bower ranking correctly (Left Bower wins)', () => {
    const trumpSuit = CARD_SUITS.CARD_SUIT_HEARTS;
    const leadPlayerRole = PLAYER_POSITIONS.PLAYER_SOUTH;
    const tenOfClubs = createTestCard(CARD_SUITS.CARD_SUIT_CLUBS, '10');
    const jackOfDiamonds = createTestCard(CARD_SUITS.CARD_SUIT_DIAMONDS, 'J');
    const queenOfHearts = createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'Q');
    const kingOfHearts = createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'K');

    const trick = testUtils.createTrick(
      [tenOfClubs, jackOfDiamonds, queenOfHearts, kingOfHearts],
      [PLAYER_POSITIONS.PLAYER_SOUTH, PLAYER_POSITIONS.PLAYER_WEST, PLAYER_POSITIONS.PLAYER_NORTH, PLAYER_POSITIONS.PLAYER_EAST]
    );

    const winner = determineTrickWinner.call(mockServices, trick, trumpSuit, leadPlayerRole);
    
    assert.strictEqual(winner, PLAYER_POSITIONS.PLAYER_WEST);
  });

  /**
   * @description Verifies that an InvalidCardError is thrown if a card in the trick is malformed.
   */
  it('should throw InvalidCardError for malformed card in trick', () => {
    const trumpSuit = CARD_SUITS.CARD_SUIT_HEARTS;
    const leadPlayerRole = PLAYER_POSITIONS.PLAYER_SOUTH;
    
    // Create a trick with a malformed card (missing suit property)
    const malformedTrick = testUtils.createTrick(
      [
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'A'),
        { value: 'K', id: 'malformedCard' }, // Malformed card
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, 'Q'),
        createTestCard(CARD_SUITS.CARD_SUIT_HEARTS, '9')
      ],
      [PLAYER_POSITIONS.PLAYER_SOUTH, PLAYER_POSITIONS.PLAYER_WEST, PLAYER_POSITIONS.PLAYER_NORTH, PLAYER_POSITIONS.PLAYER_EAST]
    );

    // Mock getCardRank to throw InvalidCardError when it encounters a malformed card
    mockServices.getCardRank.mock.mockImplementation((card, trump, led) => {
      if (!card || !card.suit || !card.value) {
        throw new InvalidCardError('Card is missing suit or value property.');
      }
      // Fallback to original implementation for valid cards
      return cardUtils.getCardRank(card, trump, led);
    });

    assert.throws(
      () => determineTrickWinner.call(mockServices, malformedTrick, trumpSuit, leadPlayerRole),
      (err) => {
        assert.ok(err instanceof InvalidCardError, 'Error should be InvalidCardError');
        assert.match(err.message, /Card is missing suit or value property./);
        return true;
      },
      'Should throw InvalidCardError for malformed card in trick'
    );
  });
});