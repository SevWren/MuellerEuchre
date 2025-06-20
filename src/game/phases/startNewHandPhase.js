/**
 * Logic for starting a new hand in Euchre: shuffling, dealing, and setting up for bidding.
 * @module game/phases/startNewHandPhase
 */
import logger from '../../utils/logger.js';
import { createDeck, shuffleDeck, cardToId } from '../../utils/deck.js';
import { getNextPlayer } from '../../utils/players.js';
import { GAME_PHASES, PLAYER_ROLES, TEAMS } from '../../config/constants.js';
import { ValidationError, InvalidPhaseError, PhaseLogicError } from '../logic/errors.js';

/**
 * Starts a new hand: rotates dealer, shuffles, deals cards, sets up turn card,
 * and transitions the game state to the first round of bidding (`ORDER_UP_ROUND1`).
 * This function is designed to be pure; it takes the current game state, performs a deep clone,
 * and then returns a completely new state object representing the start of the new hand.
 *
 * @param {object} currentGameState - The current game state object.
 * @param {object} currentGameState.players - Player objects, used to determine connection status and previous dealer.
 * @param {string} currentGameState.gameId - ID of the game.
 * @param {string} currentGameState.gamePhase - Current phase of the game (e.g., `DEALING`, `LOBBY`, `SCORING`).
 * @param {string} [currentGameState.dealer] - Role of the dealer from the previous hand.
 * @param {Array<object>} [currentGameState.gameMessages] - Existing game messages to be preserved.
 * @returns {object} A new game state object, fully reset and prepared for the start of a new hand.
 * Key properties set include: `dealer`, `players` (with new hands), `kitty`, `turnCard`,
 * `gamePhase` (to `ORDER_UP_ROUND1`), `currentPlayer`, `trumpSuit` (to null), `bids` (empty array),
 * `roundNumber` (to 1), `tricksTaken` (reset), etc.
 * @throws {ValidationError} If `currentGameState` or essential properties like `players` or `gameId` are missing.
 * @throws {InvalidPhaseError} If the game is not in a valid phase to start a new hand (e.g., `DEALING`, `LOBBY`, `SCORING`, `GAME_OVER`).
 * @throws {PhaseLogicError} If dealing encounters a critical error (e.g., empty kitty).
 */
export function startNewHand(currentGameState) {
  if (!currentGameState || !currentGameState.players || !currentGameState.gameId) {
    const errorMsg = 'startNewHand: Missing or invalid currentGameState (must include players and gameId).';
    // logger.error({ gameStateProvided: !!currentGameState, gameId: currentGameState?.gameId }, errorMsg); // Logging can be done by caller
    throw new ValidationError(errorMsg);
  }

  if (![GAME_PHASES.DEALING, GAME_PHASES.LOBBY, GAME_PHASES.SCORING, GAME_PHASES.GAME_OVER].includes(currentGameState.gamePhase)) {
    const message = `Cannot start a new hand from the current game phase: ${currentGameState.gamePhase}.`;
    // logger.warn({ currentPhase: currentGameState.gamePhase, gameId: currentGameState.gameId }, message);
    throw new InvalidPhaseError(message);
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
        // logger.error({ kittyLength: newState.kitty.length, gameId: newState.gameId }, criticalErrorMsg);
        throw new PhaseLogicError(criticalErrorMsg);
    }

    newState.turnCard = newState.kitty.pop();

    if (!newState.turnCard) {
      const criticalErrorMsg = "Critical error: No turn card could be set from kitty.";
      // logger.error({gameId: newState.gameId}, criticalErrorMsg);
      throw new PhaseLogicError(criticalErrorMsg);
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
