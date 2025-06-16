/**
 * Logic for starting a new hand in Euchre: shuffling, dealing, and setting up for bidding.
 * @module game/phases/startNewHandPhase
 */
import logger from '../../utils/logger.js';
// Removed: import { updateGameState } from '../state.js';
import { createDeck, shuffleDeck, cardToId } from '../../utils/deck.js'; // Added cardToId for logging if needed
import { getNextPlayer } from '../../utils/players.js';
import { GAME_PHASES, PLAYER_ROLES, TEAMS } from '../../config/constants.js'; // PLAYER_ROLES and TEAMS moved here

/**
 * Starts a new hand: rotates dealer, shuffles, deals cards, sets up turn card,
 * and transitions the game state to the first round of bidding.
 * This is now a PURE FUNCTION. It accepts the current game state and returns the new state.
 *
 * @param {object} currentGameState - The current game state object.
 * @returns {object} The updated game state object.
 * @throws {Error} if currentGameState is invalid or dealing encounters a critical error.
 */
export function startNewHand(currentGameState) {
  if (!currentGameState || !currentGameState.players || !currentGameState.gameId) {
    const errorMsg = 'startNewHand: Missing or invalid currentGameState (must include players and gameId).';
    logger.error({ gameStateProvided: !!currentGameState, gameId: currentGameState?.gameId }, errorMsg);
    throw new Error(errorMsg);
  }

  // A new hand can typically start after LOBBY (first hand) or after SCORING (subsequent hands)
  // Or if explicitly in DEALING phase by game logic.
  if (![GAME_PHASES.DEALING, GAME_PHASES.LOBBY, GAME_PHASES.SCORING, GAME_PHASES.GAME_OVER].includes(currentGameState.gamePhase)) {
    const message = `Cannot start a new hand from the current game phase: ${currentGameState.gamePhase}.`;
    logger.warn({ currentPhase: currentGameState.gamePhase, gameId: currentGameState.gameId }, message);
    // Instead of returning an object with success:false, throw or handle as error by caller
    throw new Error(message);
  }

  logger.info({ gameId: currentGameState.gameId, currentPhase: currentGameState.gamePhase }, "Starting new hand procedures.");

  // Deep clone to ensure immutability of the input state
  let newState = JSON.parse(JSON.stringify(currentGameState));

  try {
    const newDealer = (newState.gamePhase === GAME_PHASES.LOBBY && newState.dealer) // If LOBBY and dealer already set (e.g. by createInitialGameState)
      ? newState.dealer
      : getNextPlayer(newState.dealer, PLAYER_ROLES);

    logger.info({ oldDealer: currentGameState.dealer, newDealer, gameId: newState.gameId }, "Determining new dealer for the hand.");
    newState.dealer = newDealer;

    let freshDeck = createDeck();
    freshDeck = shuffleDeck(freshDeck);

    const newPlayerHands = {
      [PLAYER_ROLES[0]]: [], [PLAYER_ROLES[1]]: [],
      [PLAYER_ROLES[2]]: [], [PLAYER_ROLES[3]]: [],
    };

    let dealingToPlayerIndex = PLAYER_ROLES.indexOf(getNextPlayer(newDealer, PLAYER_ROLES));

    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < PLAYER_ROLES.length; j++) {
        const playerRoleToDeal = PLAYER_ROLES[dealingToPlayerIndex % PLAYER_ROLES.length];
        const cardsToDealCount = (i === 0) ? 3 : 2;

        if (newState.players[playerRoleToDeal]?.isConnected || newState.players[playerRoleToDeal]?.isActive) {
          for (let k = 0; k < cardsToDealCount; k++) {
            if (freshDeck.length > 0) {
              newPlayerHands[playerRoleToDeal].push(freshDeck.pop());
            }
          }
        }
        dealingToPlayerIndex++;
      }
    }

    newState.kitty = freshDeck;
    if (newState.kitty.length === 0) {
        const criticalErrorMsg = "Error in dealing: Kitty is empty before setting turn card!";
        logger.error({ kittyLength: newState.kitty.length, gameId: newState.gameId }, criticalErrorMsg);
        throw new Error(criticalErrorMsg);
    }

    newState.turnCard = newState.kitty.pop();

    if (!newState.turnCard) {
      const criticalErrorMsg = "Critical error: No turn card could be set from kitty.";
      logger.error({gameId: newState.gameId}, criticalErrorMsg);
      throw new Error(criticalErrorMsg);
    }

    const firstBidder = getNextPlayer(newDealer, PLAYER_ROLES);

    PLAYER_ROLES.forEach(role => {
      newState.players[role] = {
        ...newState.players[role],
        hand: newPlayerHands[role] || [],
        tricksWonThisHand: 0,
      };
    });

    const startHandMessage = {
      type: 'system',
      text: `New hand started. Dealer is ${newDealer}. ${cardToId(newState.turnCard)} is up. ${firstBidder} to make the first bid.`,
      timestamp: new Date().toISOString(),
    };

    newState.gamePhase = GAME_PHASES.ORDER_UP_ROUND1;
    newState.currentPlayer = firstBidder;
    newState.orderUpTurn = firstBidder; // Explicitly set who's turn it is to bid
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
    // tricksTaken for teams are reset at the start of a hand, not here.
    // They are reset when scores are calculated or when a game ends.
    // For per-hand trick count, that's players[X].tricksWonThisHand.
    // Game-level tricksTaken by team should be reset when teamScores are reset (new game).
    // For a new hand within a game, teamScores persist, but tricksTaken by team for point calc should be reset.
    // This is typically handled by scoring logic before starting a new hand.
    // Let's assume team-level tricksTaken are reset by scoring or game reset.
    // For safety, if this function is the sole source of hand reset:
    newState.tricksTaken = { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 };


    newState.gameMessages = [...(newState.gameMessages || []), startHandMessage];
    newState.lastUpdated = Date.now();

    logger.info({ gameId: newState.gameId, newPhase: newState.gamePhase, dealer: newState.dealer, turnCard: cardToId(newState.turnCard) }, 'New hand started, cards dealt, phase set to ORDER_UP_ROUND1.');
    return newState; // Return the new state object

  } catch (error) {
    logger.error({ error, gameId: currentGameState.gameId }, 'Critical error in startNewHand.');
    // Re-throw to allow caller to handle; caller should not use a potentially corrupt state.
    throw error;
  }
}
