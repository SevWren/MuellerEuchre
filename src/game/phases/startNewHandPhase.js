/**
 * Logic for starting a new hand in Euchre: shuffling, dealing, and setting up for bidding.
 * @module game/phases/startNewHandPhase
 */
import logger from '../../utils/logger.js';
import { createDeck, shuffleDeck, cardToId } from '../../utils/deck.js';
import { getNextPlayer } from '../../utils/players.js';
import { GAME_PHASES, PLAYER_ROLES, TEAMS } from '../../config/constants.js';

/**
 * Starts a new hand: rotates dealer, shuffles, deals cards, sets up turn card,
 * and transitions the game state to the first round of bidding.
 * This is a PURE FUNCTION. It accepts the current game state and returns the new state.
 *
 * @param {object} currentGameState - The current game state object.
 * @returns {object} The updated game state object.
 * @throws {object} Error object with message, errorType, and details if input is invalid or dealing encounters a critical error.
 */
export function startNewHand(currentGameState) {
  // Enhanced input parameter validation
  if (!currentGameState || typeof currentGameState !== 'object') {
    const error = { message: 'startNewHand: currentGameState must be provided as an object.', errorType: 'INVALID_INPUT', details: { gameStateType: typeof currentGameState } };
    logger.error(error, error.message);
    throw error;
  }
  if (!currentGameState.players || typeof currentGameState.players !== 'object') {
    const error = { message: 'startNewHand: currentGameState.players must be provided as an object.', errorType: 'INVALID_INPUT', details: { playersType: typeof currentGameState.players } };
    logger.error({ ...error, gameId: currentGameState.gameId }, error.message); // Log gameId if available
    throw error;
  }
  if (typeof currentGameState.gameId !== 'string' || !currentGameState.gameId.trim()) {
    const error = { message: 'startNewHand: currentGameState.gameId must be a non-empty string.', errorType: 'INVALID_INPUT', details: { gameId: currentGameState.gameId } };
    logger.error(error, error.message);
    throw error;
  }
  // Dealer might be null if it's the very first hand from LOBBY and not yet set.
  // getNextPlayer should handle initial dealer determination if currentGameState.dealer is null.
  // However, if dealer IS set, it should be valid.
  if (currentGameState.dealer && (typeof currentGameState.dealer !== 'string' || !currentGameState.dealer.trim() || !PLAYER_ROLES.includes(currentGameState.dealer))) {
      const error = { message: `startNewHand: currentGameState.dealer ('${currentGameState.dealer}') is invalid.`, errorType: 'INVALID_INPUT', details: { dealer: currentGameState.dealer } };
      logger.error({ ...error, gameId: currentGameState.gameId }, error.message);
      throw error;
  }


  // Phase validation
  if (![GAME_PHASES.DEALING, GAME_PHASES.LOBBY, GAME_PHASES.SCORING, GAME_PHASES.GAME_OVER].includes(currentGameState.gamePhase)) {
    const error = {
      message: `Cannot start a new hand from the current game phase: ${currentGameState.gamePhase}.`,
      errorType: 'INVALID_PHASE',
      details: { currentPhase: currentGameState.gamePhase, gameId: currentGameState.gameId }
    };
    logger.warn(error, error.message);
    throw error;
  }

  logger.info({ gameId: currentGameState.gameId, currentPhase: currentGameState.gamePhase }, "Starting new hand procedures.");
  let newState = JSON.parse(JSON.stringify(currentGameState)); // Deep clone

  try {
    // Determine new dealer: if phase is LOBBY and dealer is already set (e.g. by createInitialGameState), use that. Otherwise, rotate.
    const newDealer = (newState.gamePhase === GAME_PHASES.LOBBY && newState.dealer && PLAYER_ROLES.includes(newState.dealer))
      ? newState.dealer
      : getNextPlayer(newState.dealer, PLAYER_ROLES); // getNextPlayer should handle null currentDealer for first hand

    logger.info({ oldDealer: currentGameState.dealer, newDealer, gameId: newState.gameId }, "Determining new dealer for the hand.");
    newState.dealer = newDealer;

    let freshDeck = createDeck();
    freshDeck = shuffleDeck(freshDeck);

    const newPlayerHands = PLAYER_ROLES.reduce((acc, role) => {
        acc[role] = [];
        return acc;
    }, {});


    let dealingToPlayerIndex = PLAYER_ROLES.indexOf(getNextPlayer(newDealer, PLAYER_ROLES));

    for (let i = 0; i < 2; i++) { // Two rounds of dealing
      for (let j = 0; j < PLAYER_ROLES.length; j++) {
        const playerRoleToDeal = PLAYER_ROLES[dealingToPlayerIndex % PLAYER_ROLES.length];
        const cardsToDealCount = (i === 0) ? 3 : 2; // Deal 3 then 2, or 2 then 3

        // Only deal to active/connected players if that's a rule, otherwise deal to all roles
        // Assuming here all roles get cards regardless of connection status for simplicity of dealing logic.
        // Connection status can be checked when it's their turn to play/bid.
        for (let k = 0; k < cardsToDealCount; k++) {
          if (freshDeck.length > 0) {
            newPlayerHands[playerRoleToDeal].push(freshDeck.pop());
          } else {
            // Should not happen with standard deck size and player count
            const error = { message: "Error in dealing: Ran out of cards in deck prematurely.", errorType: 'DEALING_ERROR', details: { gameId: newState.gameId } };
            logger.error(error, error.message);
            throw error;
          }
        }
        dealingToPlayerIndex++;
      }
    }

    newState.kitty = freshDeck;
    if (newState.kitty.length === 0) { // Should be 4 cards in kitty
        const error = { message: "Error in dealing: Kitty is empty before setting turn card!", errorType: 'DEALING_ERROR', details: { kittyLength: newState.kitty.length, gameId: newState.gameId } };
        logger.error(error, error.message);
        throw error;
    }

    newState.turnCard = newState.kitty.pop(); // Turn up the top card of the kitty

    if (!newState.turnCard) {
      const error = { message: "Critical error: No turn card could be set from kitty.", errorType: 'DEALING_ERROR', details: { gameId: newState.gameId } };
      logger.error(error, error.message);
      throw error;
    }

    const firstBidder = getNextPlayer(newDealer, PLAYER_ROLES);

    PLAYER_ROLES.forEach(role => {
      newState.players[role] = {
        ...newState.players[role], // Preserve existing player info like score, name, id
        hand: newPlayerHands[role],
        tricksWonThisHand: 0, // Reset for the new hand
      };
    });

    const startHandMessage = {
      type: 'system',
      text: `New hand started. Dealer is ${newDealer}. ${cardToId(newState.turnCard)} is up. ${firstBidder} to make the first bid.`,
      timestamp: new Date().toISOString(),
    };

    // Reset state for the new hand
    newState.gamePhase = GAME_PHASES.ORDER_UP_ROUND1;
    newState.currentPlayer = firstBidder;
    newState.orderUpTurn = firstBidder;
    newState.trumpSuit = null;
    newState.bids = [];
    newState.roundNumber = 1;
    newState.playerWhoOrderedUp = null;
    newState.playerWhoCalledTrump = null;
    newState.makerTeam = null;
    newState.goingAlone = false;
    newState.playerGoingAlone = null;
    newState.partnerSittingOut = null;
    newState.currentTrick = [];
    newState.leadSuit = null;
    newState.tricksTaken = { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }; // Reset team tricks for the new hand

    newState.gameMessages = [...(newState.gameMessages || []), startHandMessage];
    newState.lastUpdated = Date.now();

    logger.info({ gameId: newState.gameId, newPhase: newState.gamePhase, dealer: newState.dealer, turnCard: cardToId(newState.turnCard) }, 'New hand started, cards dealt, phase set to ORDER_UP_ROUND1.');
    return newState;

  } catch (error) {
    // If it's already a structured error, re-throw it. Otherwise, wrap it.
    if (error.errorType) {
        logger.error({ error, gameId: currentGameState.gameId, phase: 'startNewHand-catch' }, `Re-throwing structured error: ${error.message}`);
        throw error;
    }
    const wrappedError = { message: `Critical error in startNewHand: ${error.message}`, errorType: 'DEALING_ERROR', details: { originalError: error.toString(), gameId: currentGameState.gameId } };
    logger.error({ error: wrappedError, originalError: error, gameId: currentGameState.gameId }, wrappedError.message);
    throw wrappedError;
  }
}
