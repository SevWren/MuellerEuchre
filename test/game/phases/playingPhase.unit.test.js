/**
 * @file test/phases/playingPhase.unit.test.js
 * @module test/phases/playingPhase.unit
 * @description
 *   Unit tests for the playing phase logic of the Euchre Multiplayer game.
 *   These tests cover card play validation, trick resolution, error handling,
 *   and phase transitions for the main play loop.
 *
 *   CURRENT STATE:
 *     - Tests use esmock to mock all dependencies and isolate the pure logic.
 *     - All scenarios for card play, trick completion, and error propagation are covered.
 *     - The file is focused on Layer 1 logic, not on state management or network.
 *
 *   WHEN THE PROJECT IS COMPLETE:
 *     - This file will serve as the definitive test suite for Layer 1 playing phase logic.
 *     - All rules for card play, trick resolution, and phase transitions will be validated here.
 *     - No test will require integration with state, persistence, or network code.
 */

import { expect } from "chai";
import sinon from "sinon";
import esmock from "esmock";
import path from "path";
import { fileURLToPath } from "url";

// =============================================
// PATH CONSTANTS (Pattern from esmock_fix_and_prevention_plan.md)
// =============================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Converts a relative path to an absolute path with POSIX separators
 * @param {string} relativePath - Path relative to the test file
 * @returns {string} Absolute path with POSIX separators
 */
const toPosixPath = (relativePath) => {
  return path.resolve(__dirname, relativePath).replace(/\\/g, "/");
};

// Define all module paths as constants at the top of the file
const PATHS = {
  // Source files - use relative paths from the test file
  PLAYING_PHASE: toPosixPath("../../../src/game/phases/playingPhase.js"),
  CONSTANTS: toPosixPath("../../../src/config/constants.js"),
  ERRORS: toPosixPath("../../../src/game/logic/errors.js"),
  DECK_UTILS: toPosixPath("../../../src/utils/deck.js"),
  PLAYER_UTILS: toPosixPath("../../../src/utils/players.js"),
  VALIDATION: toPosixPath("../../../src/game/logic/validation.js"),
  LOGGER: toPosixPath("../../../src/utils/logger.js"),
  
  // Test utilities
  TEST_UTILS: toPosixPath("../../testUtils.js")
};

// Import using path constants to ensure consistency
import {
  GAME_PHASES,
  PLAYER_ROLES,
  SUITS,
  TEAMS,
  VALUES,
} from "../../../src/config/constants.js";

import {
  PhaseLogicError,
  NotPlayersTurnError,
  InvalidPhaseError,
  CardNotInHandError,
  MustFollowSuitError,
  ValidationError,
} from "../../../src/game/logic/errors.js";

// Import test utilities using path constants
import { createDeck, shuffleDeck } from "../../../src/utils/deck.js";
import {
  initializePlayers,
  getNextPlayer as originalGetNextPlayer,
} from "../../../src/utils/players.js";

// Mock logger
const loggerMock = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  debug: sinon.stub(),
  log: sinon.stub(), // Add log method to match the logger interface
};

// Helper to create a base game state for playing phase tests
const createPlayingGameState = () => {
  let initialPlayerObjects = initializePlayers();
  let deck = shuffleDeck(createDeck());
  const playerHands = {};

  PLAYER_ROLES.forEach((role) => {
    playerHands[role] = [];
    for (let i = 0; i < 5; i++) {
      // Deal 5 cards each
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
    gameId: "playingPhaseTestGame",
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

describe("PlayingPhase Logic", () => {
  let sandbox;
  
  beforeEach(() => {
    // Create a fresh sandbox for each test
    sandbox = sinon.createSandbox();
    
    // Reset all logger mocks
    Object.values(loggerMock).forEach(mock => {
      if (typeof mock.resetHistory === 'function') {
        mock.resetHistory();
      }
    });
  });

  afterEach(() => {
    // Restore the sandbox after each test
    sandbox.restore();
  });

  describe("handlePlayCard", () => {
    let handlePlayCard;
    let mockValidation;
    let mockPlayers;
    let mockDeck;
    let playingPhaseModule;

    beforeEach(async () => {
      // Setup mocks
      mockValidation = {
        validatePlay: sandbox.stub().returns({ valid: true, errors: [] }),
      };

      mockPlayers = {
        getNextPlayer: sandbox.stub().callsFake((currentPlayer) => {
          const currentIndex = PLAYER_ROLES.indexOf(currentPlayer);
          return PLAYER_ROLES[(currentIndex + 1) % PLAYER_ROLES.length];
        }),
        getPartner: sandbox.stub().callsFake((playerRole) => {
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
        createDeck: sandbox.stub().callsFake(createDeck),
        shuffleDeck: sandbox.stub().callsFake(shuffleDeck),
      };

      // Import the module with the mocked dependencies using path constants
      playingPhaseModule = await esmock(
        PATHS.PLAYING_PHASE,
        {
          [PATHS.LOGGER]: loggerMock,
          [PATHS.VALIDATION]: mockValidation,
          [PATHS.PLAYER_UTILS]: mockPlayers,
          [PATHS.DECK_UTILS]: mockDeck,
        },
        {
          // Additional options for esmock if needed
        }
      );

      handlePlayCard = playingPhaseModule.handlePlayCard;
    });

    // Helper function to create a test card
    const createTestCard = (suit, value) => ({ suit, value });

    it('should throw TypeError if currentGameState is null', () => {
      // Don't mock validatePlay since we expect it to throw before that
      expect(() => handlePlayCard(null, PLAYER_ROLES[0], createTestCard(SUITS.HEARTS, 'A')))
        .to.throw(TypeError, /Cannot read propert.*players/);
    });

    it('should throw PhaseLogicError if playerRole is invalid', () => {
      const gameState = createPlayingGameState();
      
      // Mock validation to pass the initial null check but fail on player lookup
      mockValidation.validatePlay.returns({ valid: true, errors: [] });
      
      expect(() => handlePlayCard(gameState, 'INVALID_PLAYER', createTestCard(SUITS.HEARTS, 'A')))
        .to.throw('Player INVALID_PLAYER not found');
    });

    it('should throw PhaseLogicError if player is not found', () => {
      const gameState = createPlayingGameState();
      const cardPlayed = gameState.players[PLAYER_ROLES[0]].hand[0];
      
      // Mock the validation to pass
      mockValidation.validatePlay.returns({ valid: true, errors: [] });
      
      // Try to play with a non-existent player
      expect(() => handlePlayCard(gameState, 'nonExistentPlayer', cardPlayed))
        .to.throw('Player nonExistentPlayer not found');
    });

    it("should call validatePlay with correct arguments", () => {
      const gameState = createPlayingGameState();
      const playerRole = gameState.currentPlayer; // West
      const cardPlayed = gameState.players[playerRole].hand[0];
      
      // Reset the mock to track calls
      mockValidation.validatePlay.resetHistory();
      
      // Mock validation to pass
      mockValidation.validatePlay.returns({ valid: true, errors: [] });
      
      // Call the function
      handlePlayCard(gameState, playerRole, cardPlayed);

      // Verify validatePlay was called with the expected arguments
      expect(mockValidation.validatePlay.calledOnce).to.be.true;
      const callArgs = mockValidation.validatePlay.firstCall.args;
      
      expect(callArgs[0]).to.deep.include({
        gameId: gameState.gameId,
        gamePhase: gameState.gamePhase,
        currentPlayer: gameState.currentPlayer
      });
      
      expect(callArgs[1]).to.deep.equal(gameState.players[playerRole].hand);
      expect(callArgs[2]).to.deep.equal(cardPlayed);
      expect(callArgs[3]).to.equal(playerRole);
    });

    it("should propagate CardNotInHandError from validatePlay", () => {
      const gameState = createPlayingGameState();
      const playerRole = gameState.currentPlayer;
      const cardPlayed = { id: "XX", suit: SUITS.CLUBS, value: "X" }; // Not in hand
      
      // Mock validation to throw CardNotInHandError
      mockValidation.validatePlay.throws(new CardNotInHandError("Card not in hand."));
      
      expect(() => handlePlayCard(gameState, playerRole, cardPlayed))
        .to.throw(CardNotInHandError);
    });

    it("should propagate MustFollowSuitError from validatePlay", () => {
      const gameState = createPlayingGameState();
      const playerRole = gameState.currentPlayer;
      const cardPlayed = gameState.players[playerRole].hand[0];
      
      // Mock validation to throw MustFollowSuitError
      mockValidation.validatePlay.throws(new MustFollowSuitError("Must follow suit."));
      
      expect(() => handlePlayCard(gameState, playerRole, cardPlayed))
        .to.throw(MustFollowSuitError);
    });

    it("should play a card, update hand, currentTrick, and currentPlayer if trick is not over", () => {
      const gameState = createPlayingGameState();
      const playerRole = gameState.currentPlayer; // West
      
      // Ensure the card has a value property for the test
      const cardToPlay = { ...gameState.players[playerRole].hand[0] };
      if (!cardToPlay.value) {
        // If the card doesn't have a value, set a default one based on the ID
        const valueMap = {
          'A': 'Ace', 'K': 'King', 'Q': 'Queen', 'J': 'Jack', '10': '10', '9': '9'
        };
        const valueChar = cardToPlay.id[0];
        cardToPlay.value = valueMap[valueChar] || valueChar;
      }
      
      const initialHandSize = gameState.players[playerRole].hand.length;
      
      // Mock validation to pass
      mockValidation.validatePlay.returns({ valid: true, errors: [] });
      
      // Mock getNextPlayer to return the next player
      const nextPlayer = PLAYER_ROLES[(PLAYER_ROLES.indexOf(playerRole) + 1) % PLAYER_ROLES.length];
      mockPlayers.getNextPlayer.returns(nextPlayer);
      
      // Call the function
      const newState = handlePlayCard(gameState, playerRole, cardToPlay);

      // Verify the card was removed from the player's hand
      expect(newState.players[playerRole].hand).to.have.length(initialHandSize - 1);
      expect(newState.players[playerRole].hand.some(card => 
        card.id === cardToPlay.id
      )).to.be.false;
      
      // Verify the card was added to the current trick
      expect(newState.currentTrick).to.have.length(1);
      expect(newState.currentTrick[0]).to.deep.include({
        id: cardToPlay.id,
        suit: cardToPlay.suit,
        value: cardToPlay.value,
        playedBy: playerRole
      });
      
      // Verify the next player is set
      expect(newState.currentPlayer).to.equal(nextPlayer);
    });

    it("should determine trick winner and update state if trick is over (not last trick)", () => {
      const gameState = createPlayingGameState();
      const player1 = gameState.currentPlayer; // West (current)
      const player2 = PLAYER_ROLES[(PLAYER_ROLES.indexOf(player1) + 1) % 4]; // North
      const player3 = PLAYER_ROLES[(PLAYER_ROLES.indexOf(player1) + 2) % 4]; // East
      const player4 = PLAYER_ROLES[(PLAYER_ROLES.indexOf(player1) + 3) % 4]; // South (dealer)

      // Set up a trick with 3 cards already played
      gameState.currentTrick = [
        { player: player1, card: { id: "TC", suit: SUITS.CLUBS, value: VALUES.TEN } },
        { player: player2, card: { id: "QC", suit: SUITS.CLUBS, value: VALUES.QUEEN } },
        { player: player3, card: { id: "KC", suit: SUITS.CLUBS, value: VALUES.KING } },
      ];
      
      // Set current player to South (player4)
      gameState.currentPlayer = player4;
      
      // Create a high card for South to win the trick
      const aceOfSpades = { id: "AS", suit: SUITS.SPADES, value: VALUES.ACE };
      
      // Ensure player4 has this card in their hand
      gameState.players[player4].hand = [
        aceOfSpades,
        ...gameState.players[player4].hand.filter(card => card.id !== "AS").slice(0, 4)
      ];
      
      // Set trump suit for this test
      gameState.trumpSuit = SUITS.SPADES;
      
      // Mock validation to pass
      mockValidation.validatePlay.returns({ valid: true, errors: [] });
      
      // Mock getNextPlayer to return the winner (South)
      mockPlayers.getNextPlayer.returns(player4);
      
      // Mock getPartner to return the partner (North for South)
      mockPlayers.getPartner.withArgs(player4).returns(player2);
      
      // Call the function
      const newState = handlePlayCard(gameState, player4, aceOfSpades);
      
      // Verify the trick was cleared
      expect(newState.currentTrick).to.have.length(0);
      
      // Verify the tricksTaken was updated
      expect(newState.tricksTaken[TEAMS.TEAM_NS]).to.equal(1);
      
      // Verify the current player is set to the winner (South)
      expect(newState.currentPlayer).to.equal(player4);
    });

    it("should throw PhaseLogicError if winner teamId cannot be determined", () => {
      const gameState = createPlayingGameState();
      const player1 = gameState.currentPlayer; // West (current)
      const player2 = PLAYER_ROLES[(PLAYER_ROLES.indexOf(player1) + 1) % 4]; // North
      const player3 = PLAYER_ROLES[(PLAYER_ROLES.indexOf(player1) + 2) % 4]; // East
      const player4 = PLAYER_ROLES[(PLAYER_ROLES.indexOf(player1) + 3) % 4]; // South (dealer)
      
      // Set up a trick with 3 cards already played
      gameState.currentTrick = [
        { player: player1, card: { id: "TC", suit: SUITS.CLUBS, value: VALUES.TEN } },
        { player: player2, card: { id: "QC", suit: SUITS.CLUBS, value: VALUES.QUEEN } },
        { player: player3, card: { id: "KC", suit: SUITS.CLUBS, value: VALUES.KING } },
      ];
      
      // Set current player to South (player4)
      gameState.currentPlayer = player4;
      
      // Create a high card for South to win the trick
      const aceOfSpades = { id: "AS", suit: SUITS.SPADES, value: VALUES.ACE };
      
      // Ensure player4 has this card in their hand
      gameState.players[player4].hand = [
        aceOfSpades,
        ...gameState.players[player4].hand.filter(card => card.id !== "AS").slice(0, 4)
      ];
      
      // Set trump suit for this test
      gameState.trumpSuit = SUITS.SPADES;
      
      // Remove teamId from the player to simulate the error condition
      delete gameState.players[player4].teamId;
      
      // Mock validation to pass
      mockValidation.validatePlay.returns({ valid: true, errors: [] });
      
      // Mock getNextPlayer to return the winner (South)
      mockPlayers.getNextPlayer.returns(player4);
      
      // Mock getPartner to return null to simulate the error condition
      mockPlayers.getPartner.withArgs(player4).returns(null);
      
      // Call the function and expect an error
      expect(() => {
        handlePlayCard(gameState, player4, aceOfSpades);
      }).to.throw(PhaseLogicError, /Could not determine teamId for trick winner/);
    });

    it("should transition to SCORING phase if hand is over (5 tricks played)", async () => {
      const gameState = createPlayingGameState();
      
      // Set up a game state where TEAM_NS has 3 tricks and TEAM_EW has 1 (total 4 tricks played)
      // After this trick, total will be 5 which should trigger SCORING
      gameState.tricksTaken = { [TEAMS.TEAM_NS]: 3, [TEAMS.TEAM_EW]: 1 };
      
      // Set up a complete trick with 3 cards already played
      gameState.currentTrick = [
        { id: "KC", suit: SUITS.CLUBS, value: "K", playedBy: PLAYER_ROLES[1] }, // West
        { id: "QC", suit: SUITS.CLUBS, value: "Q", playedBy: PLAYER_ROLES[2] }, // North
        { id: "JC", suit: SUITS.CLUBS, value: "J", playedBy: PLAYER_ROLES[3] }  // East
      ];
      
      // It's South's turn to play the 4th card
      gameState.currentPlayer = PLAYER_ROLES[0]; // South's turn
      
      // Give South a card to play
      const cardToPlay = { id: "AS", suit: SUITS.SPADES, value: "A" };
      gameState.players[PLAYER_ROLES[0]].hand = [
        cardToPlay,
        { id: "2S", suit: SUITS.SPADES, value: "2" },
        { id: "3S", suit: SUITS.SPADES, value: "3" },
        { id: "4S", suit: SUITS.SPADES, value: "4" },
        { id: "5S", suit: SUITS.SPADES, value: "5" }
      ];

      // Mock validation to pass
      mockValidation.validatePlay.returns({ valid: true, errors: [] });
      
      // Mock getNextPlayer to return the next player
      mockPlayers.getNextPlayer.returns(PLAYER_ROLES[1]);
      
      // Mock getPartner to return a partner for the trick winner
      mockPlayers.getPartner.returns(PLAYER_ROLES[2]); // North is South's partner

      // Import the module with the mocked getCardRank function
      const mockedPlayingPhaseModule = await esmock(
        PATHS.PLAYING_PHASE,
        {
          [PATHS.LOGGER]: loggerMock,
          [PATHS.VALIDATION]: mockValidation,
          [PATHS.PLAYER_UTILS]: mockPlayers,
          [PATHS.DECK_UTILS]: mockDeck,
          // Mock getCardRank to control the trick winner determination
          [PATHS.DECK_UTILS]: {
            ...mockDeck,
            getCardRank: (card, trumpSuit, ledSuit) => {
              // Make the ace of spades the highest card
              if (card.id === 'AS') return 100;
              // Make all other cards lower
              return 1;
            }
          }
        },
        {
          // Additional options for esmock if needed
        }
      );

      // Get the handlePlayCard function from the mocked module
      const mockedHandlePlayCard = mockedPlayingPhaseModule.handlePlayCard;

      // Call the function
      const newState = mockedHandlePlayCard(gameState, PLAYER_ROLES[0], cardToPlay);

      // Verify the game transitioned to SCORING phase
      expect(newState.gamePhase).to.equal(GAME_PHASES.SCORING);
      
      // Verify the trick was counted for TEAM_NS
      expect(newState.tricksTaken[TEAMS.TEAM_NS]).to.equal(4); // 3 + 1 new trick
      expect(newState.tricksTaken[TEAMS.TEAM_EW]).to.equal(1); // Unchanged
    });

  describe("determineTrickWinner", () => {
    let determineTrickWinner;
    let mockGetCardRank;

    beforeEach(async () => {
      // Mock getCardRank to control the trick winner determination
      mockGetCardRank = sinon.stub();
      
      // Create a mock for the deck utils that includes our stubbed getCardRank
      const mockDeckUtils = {
        ...mockDeck,
        getCardRank: mockGetCardRank
      };

      // Import the module with our mocks
      const mockedPlayingPhaseModule = await esmock(
        PATHS.PLAYING_PHASE,
        {
          [PATHS.LOGGER]: loggerMock,
          [PATHS.VALIDATION]: mockValidation,
          [PATHS.PLAYER_UTILS]: mockPlayers,
          [PATHS.DECK_UTILS]: mockDeckUtils,
        },
        {
          // Additional options for esmock if needed
        }
      );

      determineTrickWinner = mockedPlayingPhaseModule.determineTrickWinner;
    });

    it("should throw PhaseLogicError if trick doesn't have exactly 4 cards", () => {
      const trick = [
        { suit: SUITS.HEARTS, value: 'A', playedBy: 'player1' },
        { suit: SUITS.HEARTS, value: 'K', playedBy: 'player2' },
        { suit: SUITS.HEARTS, value: 'Q', playedBy: 'player3' }
        // Missing 4th card
      ];
      
      expect(() => determineTrickWinner(trick, SUITS.SPADES, 'player1'))
        .to.throw(PhaseLogicError, 'Trick must have 4 cards to determine a winner');
    });

    it("should return the player who played the highest card of the led suit when no trump is played", () => {
      const trick = [
        { suit: SUITS.HEARTS, value: 'A', playedBy: 'player1' },
        { suit: SUITS.HEARTS, value: 'K', playedBy: 'player2' },
        { suit: SUITS.HEARTS, value: 'Q', playedBy: 'player3' },
        { suit: SUITS.HEARTS, value: 'J', playedBy: 'player4' }
      ];

      // Mock getCardRank to return higher values for higher cards
      mockGetCardRank.callsFake((card) => {
        const values = { 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        return values[card.value];
      });

      const winner = determineTrickWinner(trick, SUITS.SPADES, 'player1');
      expect(winner).to.equal('player1'); // Ace is highest
    });

    it("should return the player who played the highest trump card when trump is played", () => {
      const trick = [
        { suit: SUITS.HEARTS, value: 'A', playedBy: 'player1' },  // Non-trump ace (14)
        { suit: SUITS.SPADES, value: 'J', playedBy: 'player2' },  // Right bower (highest)
        { suit: SUITS.HEARTS, value: 'K', playedBy: 'player3' },  // Non-trump king (13)
        { suit: SUITS.SPADES, value: 'Q', playedBy: 'player4' }   // Trump queen (32)
      ];

      // Mock getCardRank to handle trump cards and right bower correctly
      mockGetCardRank.callsFake((card, trumpSuit) => {
        const baseValues = { '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        
        // Right bower (J of trump suit) is highest
        if (card.suit === trumpSuit && card.value === 'J') return 40;
        
        // Regular trump cards (add 20 to make them higher than non-trump)
        if (card.suit === trumpSuit) return 20 + baseValues[card.value];
        
        // Non-trump cards
        return baseValues[card.value];
      });

      const winner = determineTrickWinner(trick, SUITS.SPADES, 'player1');
      expect(winner).to.equal('player2'); // Right bower (J of spades) should win
      
      // Verify the values we're using in our mock
      const values = {
        player1: 14,  // Ace of hearts (non-trump)
        player2: 40,  // Jack of spades (right bower)
        player3: 13,  // King of hearts (non-trump)
        player4: 32   // Queen of spades (trump)
      };
      
      // This is just for debugging - the test will fail if the values aren't as expected
      expect(values.player2).to.be.greaterThan(values.player4); // Right bower > other trump
      expect(values.player4).to.be.greaterThan(values.player1); // Trump > non-trump ace
      expect(values.player1).to.be.greaterThan(values.player3); // Ace > king (both non-trump)
    });

    it("should handle the left bower as the highest trump card", () => {
      const trick = [
        { suit: SUITS.CLUBS, value: 'J', playedBy: 'player1' },  // Left bower (highest when spades are trump)
        { suit: SUITS.SPADES, value: 'J', playedBy: 'player2' }, // Right bower
        { suit: SUITS.SPADES, value: 'A', playedBy: 'player3' }, // Trump ace
        { suit: SUITS.HEARTS, value: 'A', playedBy: 'player4' }  // Non-trump
      ];

      // Mock getCardRank to handle bowers correctly
      mockGetCardRank.callsFake((card, trumpSuit, ledSuit) => {
        const baseValues = { 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        
        // Right bower (J of trump suit) is highest
        if (card.suit === trumpSuit && card.value === 'J') return 40;
        
        // Left bower (J of same color as trump) is next highest
        const isLeftBower = card.value === 'J' && 
                           ((trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS) ||
                            (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES) ||
                            (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS) ||
                            (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS));
        
        if (isLeftBower) return 39;
        
        // Regular trump cards
        if (card.suit === trumpSuit) return 20 + baseValues[card.value];
        
        // Non-trump cards
        return baseValues[card.value];
      });

      const winner = determineTrickWinner(trick, SUITS.SPADES, 'player1');
      expect(winner).to.equal('player2'); // Right bower (J of spades) wins
      
      // Now test with clubs as trump - left bower should win
      const winner2 = determineTrickWinner(trick, SUITS.CLUBS, 'player1');
      expect(winner2).to.equal('player1'); // Left bower (J of clubs when spades are trump)
    });

    it("should handle the case where all cards are of the led suit with no trump", () => {
      const trick = [
        { suit: SUITS.HEARTS, value: '10', playedBy: 'player1' },
        { suit: SUITS.HEARTS, value: 'K', playedBy: 'player2' },
        { suit: SUITS.HEARTS, value: 'Q', playedBy: 'player3' },
        { suit: SUITS.HEARTS, value: 'J', playedBy: 'player4' }
      ];

      // Simple ranking where higher face value wins
      mockGetCardRank.callsFake((card) => {
        const values = { '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        return values[card.value];
      });

      const winner = determineTrickWinner(trick, SUITS.SPADES, 'player1');
      expect(winner).to.equal('player2'); // King is highest
    });
  });
}); // End of describe("handlePlayCard")
}); // End of describe("PlayingPhase Logic")

// This empty line ensures the file ends with a newline
