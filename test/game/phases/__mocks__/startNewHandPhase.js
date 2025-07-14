/**
 * Test-specific version of startNewHandPhase with dependency injection
 * This allows testing without having to mock ES modules directly
 */

import { GAME_PHASES, PLAYER_ROLES, TEAMS } from '../../../../src/config/constants.js';
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

// Export a default implementation using the real dependencies
import * as deckUtils from '../../../../src/utils/deck.js';
import { getNextPlayer as realGetNextPlayer } from '../../../../src/utils/players.js';

const defaultStartNewHand = createStartNewHand({
  createDeck: deckUtils.createDeck,
  shuffleDeck: deckUtils.shuffleDeck,
  getNextPlayer: realGetNextPlayer
});

// Export the default implementation as the main export
export default defaultStartNewHand;
