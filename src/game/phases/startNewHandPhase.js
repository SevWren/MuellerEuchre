/**
 * Logic for starting a new hand in Euchre: shuffling, dealing, and setting up for bidding.
 * @module game/phases/startNewHandPhase
 */
import logger from "../../utils/logger.js";
import { createDeck, shuffleDeck, cardToId } from "../../utils/deck.js";
import { getNextPlayer } from "../../utils/players.js";
import { GAME_PHASES, PLAYER_ROLES, TEAMS } from "../../config/constants.js";
import {
  ValidationError,
  InvalidPhaseError,
  PhaseLogicError,
} from "../logic/validation-errors.js";

/**
 * Starts a new hand: rotates dealer, shuffles, deals cards, sets up turn card,
 * and transitions the game state to the first round of bidding.
 * This is a PURE FUNCTION. It accepts the current game state and returns the new state.
 *
 * @param {object} currentGameState - The current game state object.
 * @returns {object} The updated game state object.
 * @throws {ValidationError} If `currentGameState` is missing or invalid.
 * @throws {InvalidPhaseError} If the game is not in a valid phase to start a new hand.
 * @throws {PhaseLogicError} If dealing encounters a critical error (e.g., empty kitty).
 */
export function startNewHand(currentGameState) {
  if (
    !currentGameState ||
    !currentGameState.players ||
    !currentGameState.gameId
  ) {
    throw new ValidationError(
      "startNewHand: Missing or invalid currentGameState (must include players and gameId).",
    );
  }

  const validStartPhases = [
    GAME_PHASES.DEALING,
    GAME_PHASES.LOBBY,
    GAME_PHASES.SCORING,
    GAME_PHASES.GAME_OVER,
  ];
  if (!validStartPhases.includes(currentGameState.gamePhase)) {
    throw new InvalidPhaseError(
      `Cannot start a new hand from the current game phase: ${currentGameState.gamePhase}.`
    );
  }

  logger.info(
    {
      gameId: currentGameState.gameId,
      currentPhase: currentGameState.gamePhase,
    },
    "Starting new hand procedures.",
  );

  let newState = JSON.parse(JSON.stringify(currentGameState));

  try {
    // 1. Determine the new dealer
    const currentDealer = newState.dealer || PLAYER_ROLES[3]; // Default to East's left if no dealer
    const newDealer = (newState.gamePhase === GAME_PHASES.LOBBY && newState.dealer)
      ? newState.dealer
      : getNextPlayer(currentDealer, PLAYER_ROLES);

    newState.dealer = newDealer;
    logger.debug({ gameId: newState.gameId, newDealer }, "Dealer rotated.");

    // 2. Create and shuffle a new deck
    const deck = shuffleDeck(createDeck());
    if (deck.length < 24) {
        throw new PhaseLogicError("Invalid deck: must contain 24 cards.");
    }

    // 3. Reset player hands and identify active players
    const activePlayers = [];
    PLAYER_ROLES.forEach((role) => {
      if (newState.players[role]) {
        newState.players[role].hand = [];
        if (newState.players[role].isActive !== false) {
          activePlayers.push(role);
        }
      }
    });

    if (activePlayers.length < 4) {
        logger.warn({ gameId: newState.gameId, activePlayers: activePlayers.length }, "Starting hand with fewer than 4 active players.");
    }

    // 4. Deal cards in two passes (3-2, 2-3 pattern)
    const dealRound = (count) => {
        let playerToDeal = getNextPlayer(newDealer, PLAYER_ROLES);
        for (let i = 0; i < PLAYER_ROLES.length; i++) {
            if (activePlayers.includes(playerToDeal)) {
                const cardsToDeal = deck.splice(0, count);
                newState.players[playerToDeal].hand.push(...cardsToDeal);
            }
            playerToDeal = getNextPlayer(playerToDeal, PLAYER_ROLES);
        }
    };
    
    dealRound(3);
    dealRound(2);
    
    // 5. Set the kitty and turn card correctly
    const kitty = deck;
    if (kitty.length === 0) {
        throw new PhaseLogicError("Deck exhausted. No cards left for kitty and turn card.");
    }

    newState.turnCard = kitty.shift(); // The top card of the remainder is the turn card
    newState.kitty = kitty; // The rest are the kitty

    logger.debug({ gameId: newState.gameId, turnCard: cardToId(newState.turnCard), kittySize: newState.kitty.length }, "Dealt cards and set turn card.");

    // 6. Determine the first bidder (left of dealer)
    const firstBidder = getNextPlayer(newDealer, activePlayers);

    // 7. Reset state for the new hand and set phase to bidding
    const startHandMessage = {
      type: "system",
      text: `New hand started. Dealer is ${newDealer}. ${cardToId(newState.turnCard)} is up. ${firstBidder} to make the first bid.`,
      timestamp: new Date().toISOString(),
    };

    newState = {
        ...newState,
        gamePhase: GAME_PHASES.ORDER_UP_ROUND1,
        currentPlayer: firstBidder,
        orderUpTurn: firstBidder,
        trumpSuit: null,
        bids: [],
        roundNumber: 1,
        playerWhoOrderedUp: null,
        playerWhoCalledTrump: null,
        makerTeam: null,
        goingAlone: false,
        playerGoingAlone: null,
        partnerSittingOut: null,
        currentTrick: [],
        leadSuit: null,
        tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
        gameMessages: [...(newState.gameMessages || []), startHandMessage],
        lastUpdated: Date.now(),
    };

    PLAYER_ROLES.forEach((role) => {
        if(newState.players[role]) {
            newState.players[role].tricksWonThisHand = 0;
        }
    });

    logger.info(
      { gameId: newState.gameId, newPhase: newState.gamePhase },
      "New hand started, ready for bidding."
    );

    return newState;
  } catch (error) {
    logger.error(
      { error, gameId: currentGameState.gameId },
      "Critical error in startNewHand.",
    );
    throw error;
  }
}
