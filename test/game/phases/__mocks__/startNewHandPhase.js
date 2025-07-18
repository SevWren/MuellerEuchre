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
 * Creates a version of startNewHand with injectable dependencies
 * @param {Object} deps - Dependencies to inject
 * @param {Function} deps.createDeck - Function to create a deck
 * @param {Function} deps.shuffleDeck - Function to shuffle a deck
 * @param {Function} deps.getNextPlayer - Function to get next player
 * @returns {Function} The startNewHand function with injected dependencies
 */
export function createStartNewHand({ 
  createDeck, 
  shuffleDeck, 
  getNextPlayer 
}) {
  /**
   * Starts a new hand with injected dependencies
   * @param {object} currentGameState - The current game state
   * @returns {object} The updated game state
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
 * Creates a base game state for testing
 * @param {string} [phase=GAME_PHASES.LOBBY] - Initial game phase
 * @param {string} [dealer=PLAYER_ROLES[0]] - Initial dealer role
 * @returns {Object} A new game state object
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
 * Generates a mock deck of Euchre cards
 * @param {number} [numCards=24] - Number of cards to generate
 * @returns {Array<Object>} Array of card objects
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
