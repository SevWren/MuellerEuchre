/**
 * Test utilities and mocks for startNewHandPhase testing
 * 
 * This file contains:
 * 1. Test utilities for creating consistent test data (createBaseGameState, createMockDeck)
 * 2. Dependency-injected version of startNewHand for testing
 * 
 * Moved from test/game/phases/startNewHandPhase.unit.test.js to improve reusability
 * and maintainability of test code.
 */

import { GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS, VALUES } from '../../../../src/config/constants.js';
import { PhaseLogicError } from '../../../../src/game/logic/errors.js';

/**
 * A type representing one of the valid game phase strings.
 * This is created directly from the keys of the GAME_PHASES constant object.
 * @typedef {keyof typeof GAME_PHASES} GamePhase
 */

/**
 * A type representing one of the valid player role strings.
 * This is created directly from the keys of the PLAYER_ROLES constant object.
 * @typedef {keyof typeof PLAYER_ROLES} PlayerRole
 */

/**
 * A type representing one of the valid team name strings.
 * This is created directly from the keys of the TEAMS constant object.
 * @typedef {keyof typeof TEAMS} TeamName
 */

/**
 * Represents a playing card.
 * @typedef {object} Card
 * @property {string} id - Unique identifier for the card.
 * @property {string} suit - The suit of the card (e.g., 'CLUBS', 'DIAMONDS').
 * @property {string} value - The value of the card (e.g., 'NINE', 'KING').
 * @property {function(): string} toString - Returns a string representation of the card.
 */

/**
 * Represents the state of a player in the game.
 * @typedef {object} PlayerState
 * @property {string} id - The unique ID of the player.
 * @property {string} name - The display name of the player.
 * @property {boolean} isConnected - Whether the player is currently connected.
 * @property {TeamName} teamId - The team the player belongs to.
 * @property {Card[]} hand - An array of cards in the player's hand.
 */

/**
 * Represents the full state of a Euchre game.
 * @typedef {object} GameState
 * @property {string} gameId - The unique identifier for the game.
 * @property {GamePhase} gamePhase - The current phase of the game.
 * @property {Object.<PlayerRole, PlayerState>} players - An object mapping player roles to their states.
 * @property {PlayerRole} dealer - The role of the current dealer.
 * @property {PlayerRole | null} currentPlayer - The role of the player whose turn it is.
 * @property {any[]} gameMessages - An array of game messages or events.
 * @property {Object.<TeamName, number>} teamScores - An object mapping team names to their current scores.
 * @property {PlayerRole | null} orderUpTurn - The player who can order up the trump.
 * @property {Card | null} turnCard - The card turned up for trump selection.
 * @property {string | null} trumpSuit - The current trump suit.
 * @property {Card[]} currentTrick - An array of cards played in the current trick.
 * @property {string | null} leadSuit - The suit of the first card played in the trick.
 * @property {string | null} makerTeam - The team that made trump.
 * @property {boolean} goingAlone - True if a player is going alone.
 * @property {PlayerRole | null} partnerSittingOut - The partner sitting out if a player is going alone.
 * @property {any[]} bids - An array of bid objects.
 * @property {Card[]} kitty - The cards remaining in the kitty.
 */

/**
 * Creates a version of startNewHand with injectable dependencies for testing.
 * @param {{
 *   createDeck?: function(): Card[],
 *   shuffleDeck?: function(Card[]): Card[],
 *   getNextPlayer?: function(PlayerRole, PlayerRole[]): PlayerRole
 * }} [dependencies] - An object with mock implementations for dependent utils.
 * @returns {function(GameState): GameState} The configured startNewHand function for testing.
 * @see test/game/phases/startNewHandPhase.unit.test.js
 */
export function createStartNewHand({ 
  createDeck, 
  shuffleDeck, 
  getNextPlayer 
}) {
  /**
   * Starts a new hand and updates the game state. This is a pure function.
   *
   * @param {GameState} currentGameState - The current, immutable game state before starting a new hand.
   * @returns {GameState} A new game state object with a new hand started, dealer rotated, and cards dealt.
   * @throws {Error} If the provided game state is invalid or missing required properties.
   * @throws {Error} If attempting to start a new hand from an invalid game phase.
   */
  return function startNewHand(currentGameState) {
    // Input validation
    if (!currentGameState || !currentGameState.players || !currentGameState.gameId) {
      throw new Error("Invalid game state: missing required properties");
    }

    // Phase validation
    if (![
      GAME_PHASES.DEALING,
      GAME_PHASES.LOBBY,
      GAME_PHASES.SCORING,
      GAME_PHASES.GAME_OVER,
    ].includes(currentGameState.gamePhase)) {
      throw new Error(`Cannot start a new hand from phase: ${currentGameState.gamePhase}`);
    }

    // Create a deep copy of the game state to avoid mutations
    const newState = JSON.parse(JSON.stringify(currentGameState));
    
    // Rotate dealer to next player
    const currentDealer = newState.dealer;
    const playerRoles = Object.keys(newState.players);
    const nextDealer = getNextPlayer(currentDealer, playerRoles);
    
    // Update game state
    newState.dealer = nextDealer;
    newState.currentPlayer = getNextPlayer(nextDealer, playerRoles);
    newState.orderUpTurn = newState.currentPlayer;
    newState.gamePhase = GAME_PHASES.ORDER_UP_ROUND1;
    newState.turnCard = null;
    newState.trumpSuit = null;
    newState.currentTrick = [];
    newState.leadSuit = null;
    newState.makerTeam = null;
    newState.goingAlone = false;
    newState.partnerSittingOut = null;
    newState.bids = [];
    
    // Create and shuffle a new deck
    const freshDeck = createDeck();
    const shuffledDeck = shuffleDeck(freshDeck);
    
    // Store the kitty (last 3 cards)
    newState.kitty = shuffledDeck.slice(-3);
    
    // Deal cards to players (simplified for testing)
    const dealCards = shuffledDeck.slice(0, -3);
    Object.keys(newState.players).forEach(playerRole => {
      newState.players[playerRole].hand = dealCards.splice(0, 5);
    });

    return newState;
  };
}

/**
 * Creates a base game state object for testing purposes.
 * @param {GamePhase} [phase=GAME_PHASES.LOBBY] - The initial game phase for the created state.
 * @param {PlayerRole} [dealer=PLAYER_ROLES[0]] - The initial dealer role for the created state.
 * @returns {GameState} A new game state object initialized with default values.
 * @see test/game/phases/startNewHandPhase.unit.test.js
 */
function createBaseGameState(
  phase = GAME_PHASES.LOBBY,
  dealer = PLAYER_ROLES[0],
) {
  const gameState = {
    gameId: "startNewHandTestGame",
    gamePhase: phase,
    players: {},
    dealer: dealer,
    currentPlayer: null,
    gameMessages: [],
    teamScores: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
  };

  for (const role of PLAYER_ROLES) {
    gameState.players[role] = {
      id: role,
      name: `Player ${role}`,
      isConnected: true,
      teamId:
        role === PLAYER_ROLES[0] || role === PLAYER_ROLES[2]
          ? TEAMS.TEAM_NS
          : TEAMS.TEAM_EW,
      hand: [],
    };
  }
  return gameState;
}

/**
 * Generates a mock deck of Euchre cards for testing.
 * @param {number} [numCards=24] - The number of cards to generate in the mock deck.
 * @returns {Card[]} An array of card objects representing a Euchre deck.
 * @see test/game/phases/startNewHandPhase.unit.test.js
 */
function createMockDeck(numCards = 24) {
  // Standard Euchre deck: 9, 10, J, Q, K, A of each suit
  const euchreValues = [
    VALUES.NINE,
    VALUES.TEN,
    VALUES.JACK,
    VALUES.QUEEN,
    VALUES.KING,
    VALUES.ACE,
  ];

  const suits = Object.values(SUITS);
  const deck = [];
  let cardCount = 0;
  let cardIndex = 0;

  // Generate cards in a consistent order
  for (const suit of suits) {
    for (const value of euchreValues) {
      if (cardCount >= numCards) break;

      // Ensure we have valid values for suit and value
      const cardSuit = suit || "unknown";
      const cardValue = value || "unknown";

      deck.push({
        id: `card_${cardIndex++}`,
        suit: cardSuit,
        value: cardValue,
        toString: () => `${cardValue}_of_${cardSuit}`,
      });

      cardCount++;
    }
    if (cardCount >= numCards) break;
  }

  return deck;
}

// Export a default implementation using the real dependencies
import * as deckUtils from '../../../../src/utils/deck.js';
import { getNextPlayer as realGetNextPlayer } from '../../../../src/utils/players.js';

const defaultStartNewHand = createStartNewHand({
  createDeck: deckUtils.createDeck,
  shuffleDeck: deckUtils.shuffleDeck,
  getNextPlayer: realGetNextPlayer
});

// Export all test utilities
export {
  createBaseGameState,
  createMockDeck,
};

// Export the default implementation as the main export
export default defaultStartNewHand;
