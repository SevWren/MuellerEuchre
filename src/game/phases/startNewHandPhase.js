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
} from "../logic/errors.js";

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
  if (
    !currentGameState ||
    !currentGameState.players ||
    !currentGameState.gameId
  ) {
    const errorMsg =
      "startNewHand: Missing or invalid currentGameState (must include players and gameId).";
    // logger.error({ gameStateProvided: !!currentGameState, gameId: currentGameState?.gameId }, errorMsg); // Logging can be done by caller
    throw new ValidationError(errorMsg);
  }

  if (
    ![
      GAME_PHASES.DEALING,
      GAME_PHASES.LOBBY,
      GAME_PHASES.SCORING,
      GAME_PHASES.GAME_OVER,
    ].includes(currentGameState.gamePhase)
  ) {
    const message = `Cannot start a new hand from the current game phase: ${currentGameState.gamePhase}.`;
    // logger.warn({ currentPhase: currentGameState.gamePhase, gameId: currentGameState.gameId }, message);
    throw new InvalidPhaseError(message);
  }

  logger.info(
    {
      gameId: currentGameState.gameId,
      currentPhase: currentGameState.gamePhase,
    },
    "Starting new hand procedures.",
  );

  // Deep clone to ensure immutability of the input state
  let newState = JSON.parse(JSON.stringify(currentGameState));

  try {
    // Determine the new dealer
    const newDealer =
      newState.gamePhase === GAME_PHASES.LOBBY && newState.dealer // If LOBBY and dealer already set (e.g. by createInitialGameState)
        ? newState.dealer // Keep existing dealer in LOBBY phase
        : getNextPlayer(newState.dealer || PLAYER_ROLES[0], PLAYER_ROLES); // Rotate dealer otherwise, default to first player if no dealer

    logger.info(
      {
        oldDealer: currentGameState.dealer,
        newDealer,
        gameId: newState.gameId,
      },
      "Determining new dealer for the hand.",
    );
    newState.dealer = newDealer;

    // Create and shuffle a new deck
    const freshDeck = shuffleDeck(createDeck());

    // Initialize all players with empty hands and ensure they have required properties
    const activePlayers = [];
    PLAYER_ROLES.forEach((role) => {
      if (!newState.players[role]) {
        newState.players[role] = {
          hand: [],
          isConnected: true,
          isActive: true,
        };
      } else {
        newState.players[role].hand = [];
        // Ensure required properties exist
        newState.players[role].isConnected =
          newState.players[role].isConnected !== false;
        newState.players[role].isActive =
          newState.players[role].isActive !== false;
      }

      // Track active players for dealing order
      // Only check isActive - disconnected but active players should still be in the dealing order
      if (newState.players[role].isActive !== false) {
        activePlayers.push(role);
      }
    });

    // Function to check if we should deal to a player
    const shouldDealToPlayer = (playerRole) => {
      const player = newState.players[playerRole];
      if (!player) return false;

      // Only check isActive for dealing cards
      // Disconnected but active players should still receive cards
      return player.isActive !== false;
    };

    // Helper function to deal cards to players
    const dealCards = (numCards) => {
      let currentPlayerIndex = PLAYER_ROLES.indexOf(
        getNextPlayer(newDealer, PLAYER_ROLES),
      );
      let cardsDealt = 0;
      const dealStartDeckSize = freshDeck.length;
      console.log(
        `Starting deal: ${numCards} cards per player, ${freshDeck.length} cards remaining in deck`,
      );

      // Keep dealing until all active players have the required number of cards
      while (cardsDealt < activePlayers.length * numCards) {
        const playerRole = PLAYER_ROLES[currentPlayerIndex];

        if (shouldDealToPlayer(playerRole)) {
          // Check if player needs more cards
          if (newState.players[playerRole].hand.length < 5) {
            if (freshDeck.length === 0) {
              throw new PhaseLogicError("Kitty became empty during dealing");
            }
            const card = freshDeck.pop();
            newState.players[playerRole].hand.push(card);
            cardsDealt++;
          }
        }

        currentPlayerIndex = (currentPlayerIndex + 1) % PLAYER_ROLES.length;
        // Log progress every full round
        if (currentPlayerIndex === 0) {
          console.log(
            `Dealing progress: ${cardsDealt} cards dealt, ${freshDeck.length} remaining`,
          );
        }
      }
    };

    // First pass: Deal 3 cards to each active/connected player
    console.log("Starting first deal (3 cards per player)");
    dealCards(3);

    // Log hands after first deal
    console.log(
      "After first deal (3 cards):",
      Object.fromEntries(
        Object.entries(newState.players).map(([role, player]) => [
          role,
          {
            handSize: player.hand.length,
            isActive: player.isActive,
            isConnected: player.isConnected,
          },
        ]),
      ),
    );

    // Second pass: Deal 2 more cards to each active/connected player
    console.log("Starting second deal (2 more cards)");
    dealCards(2);

    // Log hands after second deal
    console.log(
      "After second deal (total 5 cards):",
      Object.fromEntries(
        Object.entries(newState.players).map(([role, player]) => [
          role,
          {
            handSize: player.hand.length,
            isActive: player.isActive,
            isConnected: player.isConnected,
          },
        ]),
      ),
    );

    // Set the kitty (remaining cards)
    newState.kitty = [...freshDeck];
    console.log("Kitty before turn card:", newState.kitty.length, "cards");

    // Set the turn card (top card of the kitty)
    if (newState.kitty.length === 0) {
      throw new PhaseLogicError("Kitty is empty before setting turn card");
    }

    // The turn card is the top card of the kitty
    newState.turnCard = newState.kitty.pop();
    console.log(
      "After taking turn card - Kitty size:",
      newState.kitty.length,
      "cards",
    );

    // First bidder is the player to the left of the dealer
    let firstBidder = getNextPlayer(newDealer, PLAYER_ROLES);

    // Make sure first bidder is an active player
    while (!shouldDealToPlayer(firstBidder)) {
      firstBidder = getNextPlayer(firstBidder, PLAYER_ROLES);

      // Safety check to prevent infinite loop
      if (firstBidder === newDealer) {
        throw new PhaseLogicError(
          "No active players available to be first bidder",
        );
      }
    }

    // Set the first bidder as the current player and order up turn
    newState.currentPlayer = firstBidder;
    newState.orderUpTurn = firstBidder;

    // Log the final state for debugging
    logger.debug(
      {
        gameId: newState.gameId,
        dealer: newState.dealer,
        firstBidder,
        kittySize: newState.kitty.length,
        playerHandSizes: Object.fromEntries(
          Object.entries(newState.players).map(([role, player]) => [
            role,
            {
              handSize: player.hand.length,
              isActive: player.isActive,
              isConnected: player.isConnected,
            },
          ]),
        ),
      },
      "New hand dealt",
    );

    PLAYER_ROLES.forEach((role) => {
      newState.players[role] = {
        ...newState.players[role],
        tricksWonThisHand: 0,
      };
    });

    const startHandMessage = {
      type: "system",
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

    newState.gameMessages = [
      ...(newState.gameMessages || []),
      startHandMessage,
    ];
    newState.lastUpdated = Date.now();

    logger.info(
      {
        gameId: newState.gameId,
        newPhase: newState.gamePhase,
        dealer: newState.dealer,
        turnCard: cardToId(newState.turnCard),
      },
      "New hand started, cards dealt, phase set to ORDER_UP_ROUND1.",
    );
    return newState; // Return the new state object
  } catch (error) {
    logger.error(
      { error, gameId: currentGameState.gameId },
      "Critical error in startNewHand.",
    );
    // Re-throw to allow caller to handle; caller should not use a potentially corrupt state.
    throw error;
  }
}
