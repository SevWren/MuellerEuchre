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
 * and transitions the game state to the first round of bidding.
 * This is now a PURE FUNCTION. It accepts the current game state and returns the new state.
 *
 * @param {object} currentGameState - The current game state object.
 * @returns {object} The updated game state object.
 * @throws {ValidationError} If `currentGameState` is missing or invalid.
 * @throws {InvalidPhaseError} If the game is not in a valid phase to start a new hand.
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

    // Initialize empty hands for all players
    const newPlayerHands = {};
    
    // Ensure all players have an empty hand array, even if they're not connected/active
    PLAYER_ROLES.forEach(role => {
      newPlayerHands[role] = [];
    });

    // Get the player to the left of the dealer to start dealing
    let currentPlayerIndex = PLAYER_ROLES.indexOf(getNextPlayer(newDealer, PLAYER_ROLES));
    
    // Function to check if we should deal to a player
    const shouldDealToPlayer = (playerRole) => {
      const player = newState.players[playerRole];
      if (!player) return false;
      // Only don't deal if explicitly set to inactive or disconnected
      if (player.isActive === false) return false;
      if (player.isConnected === false && player.isActive !== true) return false;
      return true;
    };

    // First pass: Deal 3 cards to each active/connected player
    for (let i = 0; i < PLAYER_ROLES.length; i++) {
      const playerRole = PLAYER_ROLES[currentPlayerIndex];
      if (shouldDealToPlayer(playerRole)) {
        // Deal 3 cards to this player
        for (let j = 0; j < 3 && freshDeck.length > 0; j++) {
          newPlayerHands[playerRole].push(freshDeck.pop());
        }
      }
      currentPlayerIndex = (currentPlayerIndex + 1) % PLAYER_ROLES.length;
    }
    
    // Second pass: Deal 2 more cards to each active/connected player
    for (let i = 0; i < PLAYER_ROLES.length; i++) {
      const playerRole = PLAYER_ROLES[currentPlayerIndex];
      if (shouldDealToPlayer(playerRole)) {
        // Deal 2 more cards to this player
        for (let j = 0; j < 2 && freshDeck.length > 0; j++) {
          newPlayerHands[playerRole].push(freshDeck.pop());
        }
      }
      currentPlayerIndex = (currentPlayerIndex + 1) % PLAYER_ROLES.length;
    }

    newState.kitty = freshDeck;
    if (newState.kitty.length === 0) {
        const criticalErrorMsg = "Error in dealing: Kitty is empty before setting turn card!";
        // logger.error({ kittyLength: newState.kitty.length, gameId: newState.gameId }, criticalErrorMsg);
        throw new PhaseLogicError(criticalErrorMsg);
    }

    // Pop the turn card from the kitty - we've already verified kitty is not empty
    // so we don't need to check for undefined here
    newState.turnCard = newState.kitty.pop();

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
