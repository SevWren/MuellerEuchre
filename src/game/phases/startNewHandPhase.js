/**
 * @module game/phases/startNewHandPhase
 * @description Logic for starting a new hand in Euchre: shuffling, dealing, and setting up for bidding.
 * This module handles the initialization of a new hand, including dealer rotation, card dealing, and
 * game state transition to the bidding phase.
 *
 * @see {@link module:src/game/phases/playingPhase} For the next phase in the game flow
 * @see {@link module:src/game/phases/biddingPhase} For the phase that follows after dealing
 * @see {@link module:src/utils/deck} For deck creation and shuffling utilities
 * @see {@link module:src/config/constants}
 * @see {@link module:src/utils/logger}
 * @see {@link module:src/utils/cardUtils}
 * @see {@link module:src/utils/players}
 * @see {@link module:src/game/logic/validation-errors}
 * @see {@link module:test/game/phases/startNewHandPhase.unit.test.js}
 */

/**
 * Represents a playing card.
 * @typedef {object} Card
 * @property {string} suit - The suit of the card (e.g., 'hearts', 'diamonds')
 * @property {string} value - The value of the card (e.g., '9', 'J', 'Q', 'K', 'A')
 * @property {string} [id] - Optional unique identifier for the card
 */

/**
 * Represents the structure of a player object within the game state.
 * @typedef {object} Player
 * @property {Card[]} hand - Array of cards in the player's hand
 * @property {boolean} [isActive=true] - Whether the player is active in the game
 * @property {number} [tricksWonThisHand=0] - Number of tricks won in the current hand
 * @property {string} name - The display name of the player.
 * @property {string|null} socketId - The socket ID of the connected player, or null if disconnected.
 * @property {string} teamId - The ID of the player's team (e.g., 'TEAM_NS', 'TEAM_EW').
 * @property {number} score - The player's current score (or their team's score).
 * @property {boolean} isConnected - True if the player is currently connected.
 */

/**
 * Represents the state of a Euchre game.
 * @typedef {object} GameState
 * @property {string} gameId - Unique identifier for the game
 * @property {keyof typeof GAME_PHASES} gamePhase - Current phase of the game
 * @property {Object.<string, Player>} players - Map of player roles to player objects
 * @property {string} dealer - Role of the current dealer
 * @property {Card} turnCard - The face-up card for the current hand
 * @property {Card[]} kitty - Array of cards in the kitty (undealt cards)
 * @property {string} currentPlayer - Role of the player whose turn it is
 * @property {string} orderUpTurn - Role of the player whose turn it is to order up
 * @property {string|null} trumpSuit - The current trump suit, or null if not yet determined
 * @property {Array} bids - Array of bids made in the current hand
 * @property {number} roundNumber - Current round number
 * @property {string|null} playerWhoOrderedUp - Role of the player who ordered up the trump
 * @property {string|null} playerWhoCalledTrump - Role of the player who called trump
 * @property {string|null} makerTeam - Team that made the trump call
 * @property {boolean} goingAlone - Whether a player is going alone
 * @property {string|null} playerGoingAlone - Role of the player going alone, if any
 * @property {string|null} partnerSittingOut - Role of the sitting out partner, if applicable
 * @property {Card[]} currentTrick - Cards played in the current trick
 * @property {string|null} leadSuit - Lead suit of the current trick
 * @property {Object} tricksTaken - Number of tricks taken by each team
 * @property {number} tricksTaken.TEAM_NS - Tricks taken by North/South team
 * @property {number} tricksTaken.TEAM_EW - Tricks taken by East/West team
 * @property {Array} gameMessages - Array of game messages
 * @property {number} lastUpdated - Timestamp of last state update
 * @property {object} [scores] - Current scores for each team.
 * @property {object} [previousTricksTaken] - Tricks taken in the previous hand.
 */
import logger from "../../utils/logger.js";
import { createDeck, shuffleDeck } from "../../utils/deck.js";
import { cardToId } from "../../utils/cardUtils.js";
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
 * @function startNewHand
 * @param {GameState} currentGameState - The current game state object. Must include:
 *   - players: Object mapping player roles to player objects
 *   - gameId: String identifier for the game
 *   - gamePhase: Current game phase
 *   - dealer: (Optional) Current dealer's role
 * @returns {GameState} A new game state object with:
 *   - Dealer rotated to the next player
 *   - Newly shuffled and dealt cards to all active players
 *   - Turn card and kitty set up
 *   - Game phase transitioned to ORDER_UP_ROUND1
 *   - All hand-specific state reset
 * @throws {ValidationError} If `currentGameState` is missing required properties or is invalid.
 * @throws {InvalidPhaseError} If the game is not in a valid phase to start a new hand.
 * @throws {PhaseLogicError} If dealing encounters a critical error (e.g., empty kitty).
 *
 * @see {@link module:src/game/phases/startNewHandPhase} For the module documentation
 * @see {@link module:src/utils/deck.createDeck} For deck creation logic
 * @see {@link module:src/utils/deck.shuffleDeck} For deck shuffling logic
 * @see {@link module:src/utils/players.getNextPlayer} For player rotation logic
 * @see {@link module:src/game/phases/biddingPhase} For the next phase in the game flow
 */
function startNewHand(currentGameState) {
  if (
    !currentGameState ||
    !currentGameState.players ||
    !currentGameState.gameId
  ) {
    throw new ValidationError(
      "startNewHand: Missing or invalid currentGameState (must include players and gameId)."
    );
  }

  const validStartPhases = [
    GAME_PHASES.GAME_PHASE_DEALING,
    GAME_PHASES.GAME_PHASE_LOBBY,
    GAME_PHASES.GAME_PHASE_SCORING,
    GAME_PHASES.GAME_PHASE_GAME_OVER,
  ];
  if (!validStartPhases.includes(currentGameState.gamePhase)) {
    throw new InvalidPhaseError(
      `Cannot start a new hand from the current game phase: ${currentGameState.gamePhase}.`,
      "start new hand",
      validStartPhases
    );
  }

  logger.info(
    {
      gameId: currentGameState.gameId,
      currentPhase: currentGameState.gamePhase,
    },
    "Starting new hand procedures."
  );

  let newState = JSON.parse(JSON.stringify(currentGameState));

  try {
    // 1. Determine the new dealer
    // Default to East's left (North) if no dealer is set
    const currentDealer = newState.dealer || PLAYER_ROLES[3];
    const newDealer =
      newState.gamePhase === GAME_PHASES.GAME_PHASE_LOBBY && newState.dealer
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
      logger.warn(
        { gameId: newState.gameId, activePlayers: activePlayers.length },
        "Starting hand with fewer than 4 active players."
      );
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
    // Remaining cards after dealing become the kitty
    const kitty = deck;
    if (kitty.length === 0) {
      throw new PhaseLogicError(
        "Deck exhausted. No cards left for kitty and turn card."
      );
    }

    newState.turnCard = kitty.shift(); // The top card of the remainder is the turn card
    newState.kitty = kitty; // The rest are the kitty

    logger.debug(
      {
        gameId: newState.gameId,
        turnCard: cardToId(newState.turnCard),
        kittySize: newState.kitty.length,
      },
      "Dealt cards and set turn card."
    );

    // 6. Determine the first bidder (left of dealer)
    // The player to the left of the dealer bids first
    let firstBidder = getNextPlayer(newDealer, PLAYER_ROLES);

    // If the next player is not active, find the next active one in turn order.
    let attempts = 0; // Safeguard against infinite loops
    while (
      !activePlayers.includes(firstBidder) &&
      attempts < PLAYER_ROLES.length
    ) {
      firstBidder = getNextPlayer(firstBidder, PLAYER_ROLES);
      attempts++;
    }

    // 7. Reset state for the new hand and set phase to bidding
    // This creates a fresh state object with all hand-specific properties reset
    const startHandMessage = {
      type: "system",
      text: `New hand started. Dealer is ${newDealer}. ${cardToId(newState.turnCard)} is up. ${firstBidder} to make the first bid.`,
      timestamp: new Date().toISOString(),
    };

    newState = {
      ...newState,
      gamePhase: GAME_PHASES.GAME_PHASE_ORDER_UP_ROUND1,
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

    // Reset tricks won counter for all players
    PLAYER_ROLES.forEach((role) => {
      if (newState.players[role]) {
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
      "Critical error in startNewHand."
    );
    throw error;
  }
}

export { startNewHand };
