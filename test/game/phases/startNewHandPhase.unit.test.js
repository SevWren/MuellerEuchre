// Unit tests for startNewHand phase logic
// Validates core game logic for deck creation, card dealing, and dealer rotation - Test data is generated programmatically

// Import test utilities
import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

// Import constants and types
import { GAME_PHASES, TEAMS, PLAYER_ROLES } from '../../../src/config/constants.js';
import { ValidationError, InvalidPhaseError, PhaseLogicError } from '../../../src/game/logic/errors.js';

// Import test utilities and mocks
import { createBaseGameState } from '../logic/test-utils.js';
import * as mockDeckModule from '../../../test/__mocks__/deck.js';

// Import modules to mock - use namespace imports for proper mocking
import * as playersModule from "../../../src/utils/players.js";
import * as deckModule from '../../../src/utils/deck.js';

// Constants
const EUCHRE_DECK_SIZE = 24; // Standard Euchre deck has 24 cards (9-Ace of each suit)
const CARDS_PER_PLAYER = 5; // Each player gets 5 cards
const EXPECTED_KITTY_SIZE = 3; // Expected number of cards in the kitty after dealing

// Track the module under test
let startNewHand;

// Helper function to create a mock deck
function createMockDeck(size = EUCHRE_DECK_SIZE) {
  const deck = [];
  const suits = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];
  const values = ['9', '10', 'J', 'Q', 'K', 'A'];
  
  for (let i = 0; i < size; i++) {
    const suit = suits[i % suits.length];
    const value = values[i % values.length];
    deck.push({
      suit,
      value,
      id: `${value}_${suit}`,
      isLeftBower: () => false,
      getEffectiveSuit: () => suit
    });
  }
  return deck;
}

describe("StartNewHandPhase Logic", () => {
  beforeEach(async () => {
    // Mock deck module methods
    mock.method(deckModule, 'createDeck', mockDeckModule.createDeck);
    mock.method(deckModule, 'shuffleDeck', mockDeckModule.shuffleDeck);
    mock.method(deckModule, 'cardToId', mockDeckModule.cardToId);

    // Mock players module methods
    mock.method(playersModule, 'getNextPlayer', (currentPlayer) => {
      const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
      return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
    });
    mock.method(playersModule, 'isTeammate', (p1, p2) => {
      const team1 = PLAYER_ROLES.indexOf(p1) % 2;
      const team2 = PLAYER_ROLES.indexOf(p2) % 2;
      return team1 === team2;
    });
    mock.method(playersModule, 'getPartner', (player) => {
      const index = PLAYER_ROLES.indexOf(player);
      return index >= 0 ? PLAYER_ROLES[(index + 2) % 4] : undefined;
    });

    // Dynamically import the module under test AFTER mocks are applied
    // Use a cache-busting query to ensure a fresh module for each test
    const modulePath = `../../../src/game/phases/startNewHandPhase.js?v=${Date.now()}`;
    const module = await import(modulePath);
    startNewHand = module.startNewHand;
  });

  afterEach(() => {
    mock.restoreAll();
  });

  // Error Handling Tests
  it("should throw ValidationError when currentGameState is null", () => {
    assert.throws(
      () => startNewHand(null),
      (err) => err instanceof ValidationError && err.message.includes('Missing or invalid currentGameState'),
      'Should throw ValidationError for null game state'
    );
  });

  it("should throw ValidationError when currentGameState.players is missing", () => {
    const invalidGameState = { gameId: "test" }; // Missing players
    assert.throws(
      () => startNewHand(invalidGameState),
      (err) => err instanceof ValidationError && err.message.includes('Missing or invalid currentGameState'),
      'Should throw ValidationError for missing players object'
    );
  });

  it("should throw InvalidPhaseError when game phase is not valid for starting a hand", () => {
    const invalidPhase = "INVALID_PHASE";
    const gameState = createBaseGameState();
    assert.throws(
      () => startNewHand({ ...gameState, gamePhase: invalidPhase }),
      (err) => err instanceof InvalidPhaseError,
      'Should throw InvalidPhaseError for an invalid phase'
    );
  });

  const phaseLogicErrorTestCases = [
    {
      description: 'kitty is empty before setting turn card',
      deckSize: PLAYER_ROLES.length * CARDS_PER_PLAYER, // Exactly enough for dealing, none left for kitty/turn card
    },
  ];

  for (const { description, deckSize } of phaseLogicErrorTestCases) {
    it(`should throw PhaseLogicError when ${description}`, async () => {
      // Arrange
      // Override the mock for this specific test
      mock.method(deckModule, 'createDeck', () => createMockDeck(deckSize));

      // Re-import the module to get the new mock
      const module = await import(`../../../src/game/phases/startNewHandPhase.js?v=${Date.now()}`);
      const testStartNewHand = module.startNewHand;
      const gameState = createBaseGameState();
      
      // Act & Assert
      assert.throws(
        () => testStartNewHand(gameState),
        (err) => err instanceof PhaseLogicError && err.message.match(/kitty.*empty|insufficient.*cards/i),
        'Should throw PhaseLogicError for insufficient cards'
      );
    });
  }

  // Success Path Tests
  it("should correctly initialize a new hand from LOBBY phase", () => {
    // Arrange
    const initialDealer = PLAYER_ROLES[0]; // South
    const expectedFirstBidder = PLAYER_ROLES[1]; // West (left of South)
    const gameState = createBaseGameState(GAME_PHASES.LOBBY, initialDealer);
    
    // Act
    const newState = startNewHand(gameState);

    // Assert
    assert.strictEqual(deckModule.createDeck.mock.calls.length, 1, 'Should create deck once');
    assert.strictEqual(deckModule.shuffleDeck.mock.calls.length, 1, 'Should shuffle deck once');
    
    assert.strictEqual(newState.dealer, initialDealer, 'Should keep initial dealer from LOBBY phase');
    assert.strictEqual(newState.gamePhase, GAME_PHASES.ORDER_UP_ROUND1, 'Should transition to ORDER_UP_ROUND1');

    PLAYER_ROLES.forEach((role) => {
      assert.strictEqual(newState.players[role].hand.length, CARDS_PER_PLAYER, `Player ${role} should have ${CARDS_PER_PLAYER} cards`);
    });

    assert.ok(newState.turnCard, 'Turn card should exist');
    assert.strictEqual(newState.kitty.length, EXPECTED_KITTY_SIZE, `Kitty should have ${EXPECTED_KITTY_SIZE} cards`);
    
    assert.strictEqual(newState.trumpSuit, null, 'Trump suit should be reset');
    assert.deepStrictEqual(newState.bids, [], 'Bids array should be empty');
    assert.deepStrictEqual(newState.tricksTaken, { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }, 'Tricks taken should be reset');
    
    assert.strictEqual(newState.currentPlayer, expectedFirstBidder, 'Current player should be the first bidder');
    assert.strictEqual(newState.orderUpTurn, expectedFirstBidder, 'Order up turn should be the first bidder');
  });

  it("should rotate dealer and start new hand from SCORING phase, preserving scores", () => {
    // Arrange
    const previousDealer = PLAYER_ROLES[3]; // East
    const expectedNewDealer = PLAYER_ROLES[0]; // South (next in rotation)
    const expectedFirstBidder = PLAYER_ROLES[1]; // West (left of new dealer)
    const teamScores = { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 3 };
    
    const gameState = createBaseGameState(GAME_PHASES.SCORING, previousDealer);
    gameState.teamScores = { ...teamScores };
    
    // Act
    const newState = startNewHand(gameState);

    // Assert
    assert.strictEqual(newState.dealer, expectedNewDealer, 'Should rotate dealer');
    assert.strictEqual(newState.gamePhase, GAME_PHASES.ORDER_UP_ROUND1, 'Should transition to ORDER_UP_ROUND1');
    assert.strictEqual(newState.currentPlayer, expectedFirstBidder, 'First bidder should be left of the new dealer');
    assert.deepStrictEqual(newState.teamScores, teamScores, 'Team scores should be preserved');
    
    PLAYER_ROLES.forEach(role => {
      assert.strictEqual(newState.players[role].hand.length, CARDS_PER_PLAYER, `Player ${role} should receive 5 cards`);
    });
  });

  it("should handle a misdeal from DEALING phase by rotating dealer and starting fresh", () => {
    // Arrange
    const dealerForMisdeal = PLAYER_ROLES[1]; // West
    const expectedNewDealer = PLAYER_ROLES[2]; // North
    const expectedFirstBidder = PLAYER_ROLES[3]; // East
    
    const gameState = createBaseGameState(GAME_PHASES.DEALING, dealerForMisdeal);
    
    // Act
    const newState = startNewHand(gameState);

    // Assert
    assert.strictEqual(newState.dealer, expectedNewDealer, 'Should rotate to the next dealer after a misdeal');
    assert.strictEqual(newState.gamePhase, GAME_PHASES.ORDER_UP_ROUND1, 'Should transition to ORDER_UP_ROUND1');
    assert.strictEqual(newState.currentPlayer, expectedFirstBidder, 'First bidder should be left of the new dealer');

    PLAYER_ROLES.forEach(role => {
      assert.strictEqual(newState.players[role].hand.length, CARDS_PER_PLAYER);
    });
    assert.ok(newState.turnCard);
    assert.strictEqual(newState.kitty.length, EXPECTED_KITTY_SIZE);
  });
  
  // Player Active/Inactive Tests
  it("should deal cards to disconnected but active players", () => {
    // Arrange
    const gameState = createBaseGameState(GAME_PHASES.LOBBY, PLAYER_ROLES[0]);
    const disconnectedPlayer = PLAYER_ROLES[1]; // West
    gameState.players[disconnectedPlayer].isConnected = false;
    gameState.players[disconnectedPlayer].isActive = true;
    
    // Act
    const newState = startNewHand(gameState);

    // Assert
    assert.strictEqual(newState.players[disconnectedPlayer].hand.length, CARDS_PER_PLAYER, 'Disconnected but active player should receive cards');
    assert.strictEqual(newState.kitty.length, EXPECTED_KITTY_SIZE, `Kitty size should be correct when dealing to all 4 active players`);
  });

  it("should exclude inactive players from the deal", () => {
    // Arrange
    const gameState = createBaseGameState(GAME_PHASES.LOBBY, PLAYER_ROLES[0]);
    const inactivePlayer = PLAYER_ROLES[2]; // North
    gameState.players[inactivePlayer].isActive = false;
    
    // Act
    const newState = startNewHand(gameState);

    // Assert
    assert.strictEqual(newState.players[inactivePlayer].hand.length, 0, 'Inactive player should not receive any cards');
    
    const activePlayerRoles = PLAYER_ROLES.filter(role => role !== inactivePlayer);
    activePlayerRoles.forEach(role => {
      assert.strictEqual(newState.players[role].hand.length, CARDS_PER_PLAYER, `Active player ${role} should receive cards`);
    });

    // Kitty size will be larger as fewer cards were dealt
    const expectedKitty = EUCHRE_DECK_SIZE - (activePlayerRoles.length * CARDS_PER_PLAYER) - 1;
    assert.strictEqual(newState.kitty.length, expectedKitty, `Kitty size should be ${expectedKitty} with 3 players dealt`);
  });

  // GAME_OVER Phase Tests
  describe("GAME_OVER Phase Handling", () => {
    for (let i = 0; i < PLAYER_ROLES.length; i++) {
      const currentDealer = PLAYER_ROLES[i];
      const expectedNextDealer = PLAYER_ROLES[(i + 1) % PLAYER_ROLES.length];
      const expectedFirstBidder = PLAYER_ROLES[(i + 2) % PLAYER_ROLES.length];

      it(`should rotate dealer from ${currentDealer} to ${expectedNextDealer} when starting from GAME_OVER`, () => {
        // Arrange
        const teamScores = { [TEAMS.TEAM_NS]: 5, [TEAMS.TEAM_EW]: 3 };
        const gameState = createBaseGameState(GAME_PHASES.GAME_OVER, currentDealer);
        gameState.teamScores = teamScores;

        // Act
        const newState = startNewHand(gameState);

        // Assert
        assert.strictEqual(newState.dealer, expectedNextDealer, `Dealer should rotate to ${expectedNextDealer}`);
        assert.strictEqual(newState.currentPlayer, expectedFirstBidder, `First bidder should be ${expectedFirstBidder}`);
        assert.strictEqual(newState.gamePhase, GAME_PHASES.ORDER_UP_ROUND1, 'Game should transition to ORDER_UP_ROUND1');
        assert.deepStrictEqual(newState.teamScores, teamScores, 'Scores should be preserved from the previous game');
      });
    }
  });

  // Dealing Logic Edge Cases
  describe("Dealing Logic Edge Cases", () => {
    it("should handle dealing with exactly 24 cards correctly", async () => {
      mock.method(deckModule, 'createDeck', () => createMockDeck(24));
      const module = await import(`../../../src/game/phases/startNewHandPhase.js?v=${Date.now()}`);
      const testStartNewHand = module.startNewHand;
      const gameState = createBaseGameState();
      
      const newState = testStartNewHand(gameState);

      assert.strictEqual(newState.kitty.length, 3, 'Kitty should have 3 cards');
      PLAYER_ROLES.forEach(role => {
        assert.strictEqual(newState.players[role].hand.length, 5, `Player ${role} should have 5 cards`);
      });
      assert.ok(newState.turnCard, 'Should have a turn card');
    });

    it("should handle dealing with more than 24 cards (extra cards should not affect kitty size)", async () => {
      mock.method(deckModule, 'createDeck', () => createMockDeck(30));
      const module = await import(`../../../src/game/phases/startNewHandPhase.js?v=${Date.now()}`);
      const testStartNewHand = module.startNewHand;
      const gameState = createBaseGameState();

      const newState = testStartNewHand(gameState);
      
      assert.strictEqual(newState.kitty.length, 3, 'Kitty size should remain 3, assuming extra cards are handled/discarded.');
      PLAYER_ROLES.forEach(role => {
        assert.strictEqual(newState.players[role].hand.length, 5);
      });
    });

    it("should throw PhaseLogicError when dealing with fewer than 21 cards", async () => {
      mock.method(deckModule, 'createDeck', () => createMockDeck(20));
      const module = await import(`../../../src/game/phases/startNewHandPhase.js?v=${Date.now()}`);
      const testStartNewHand = module.startNewHand;
      const gameState = createBaseGameState();
      
      assert.throws(() => testStartNewHand(gameState), PhaseLogicError);
    });

    it("should handle dealing with exactly 21 cards (0 kitty)", async () => {
      mock.method(deckModule, 'createDeck', () => createMockDeck(21));
      const module = await import(`../../../src/game/phases/startNewHandPhase.js?v=${Date.now()}`);
      const testStartNewHand = module.startNewHand;
      const gameState = createBaseGameState();

      const newState = testStartNewHand(gameState);

      assert.strictEqual(newState.kitty.length, 0, 'Kitty should be empty');
      PLAYER_ROLES.forEach(role => {
        assert.strictEqual(newState.players[role].hand.length, 5);
      });
      assert.ok(newState.turnCard, 'Turn card should still be set');
    });
  });
});
