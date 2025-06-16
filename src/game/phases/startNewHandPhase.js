/**
 * Logic for starting a new hand in Euchre: shuffling, dealing, and setting up for bidding.
 * @module game/phases/startNewHandPhase
 */
import logger from '../../utils/logger.js';
import { updateGameState } from '../state.js';
import { createDeck, shuffleDeck } from '../../utils/deck.js';
import { getNextPlayer } from '../../utils/players.js';
import { GAME_PHASES, PLAYER_ROLES } from '../../config/constants.js';

/**
 * Starts a new hand: rotates dealer, shuffles, deals cards, sets up turn card,
 * and transitions the game state to the first round of bidding.
 *
 * @param {object} currentGameState - The current game state object.
 * @returns {{success: boolean, message: string, updatedGameState: object}}
 *          An object indicating success, a message, and the updated game state.
 *          Returns success:false if the game is not in a valid phase to start a new hand.
 */
export function startNewHand(currentGameState) {
  if (!currentGameState || !currentGameState.players) {
    logger.error({ gameStateProvided: !!currentGameState }, 'startNewHand: Missing currentGameState.');
    return {
        success: false,
        message: 'Internal error: Missing game state to start new hand.',
        updatedGameState: currentGameState || {}
    };
  }

  // A new hand can typically start after LOBBY (first hand) or after SCORING (subsequent hands)
  // Or if explicitly in DEALING phase.
  if (![GAME_PHASES.DEALING, GAME_PHASES.LOBBY, GAME_PHASES.SCORING, GAME_PHASES.GAME_OVER].includes(currentGameState.gamePhase)) {
    const message = `Cannot start a new hand from the current game phase: ${currentGameState.gamePhase}.`;
    logger.warn({ currentPhase: currentGameState.gamePhase, gameId: currentGameState.gameId }, message);
    return { success: false, message, updatedGameState: currentGameState };
  }

  try {
    const newGameState = updateGameState(prevState => {
      // Determine the new dealer
      // If it's the very first hand (coming from LOBBY), prevState.dealer is the initial default.
      // Otherwise, rotate from the previous hand's dealer.
      const newDealer = (prevState.gamePhase === GAME_PHASES.LOBBY)
        ? prevState.dealer // Keep initial dealer for the very first hand
        : getNextPlayer(prevState.dealer, PLAYER_ROLES);

      logger.info({ oldDealer: prevState.dealer, newDealer, gameId: prevState.gameId }, "Determining new dealer for the hand.");

      let freshDeck = createDeck();
      freshDeck = shuffleDeck(freshDeck);

      const newPlayerHands = {
        [PLAYER_ROLES[0]]: [],
        [PLAYER_ROLES[1]]: [],
        [PLAYER_ROLES[2]]: [],
        [PLAYER_ROLES[3]]: [],
      };

      // Deal cards: 5 to each player, in rounds of 3 then 2, or 2 then 3.
      // Standard dealing pattern: (Dealer's team chooses one pattern for the game, or it alternates)
      // For simplicity, let's use a fixed pattern for now: (e.g. 3-2 to each)
      // Player left of dealer gets cards first.
      let dealingToPlayerIndex = PLAYER_ROLES.indexOf(getNextPlayer(newDealer, PLAYER_ROLES));

      for (let i = 0; i < 2; i++) { // Two rounds of dealing
        for (let j = 0; j < PLAYER_ROLES.length; j++) {
          const playerRoleToDeal = PLAYER_ROLES[dealingToPlayerIndex % PLAYER_ROLES.length];
          const cardsToDealCount = (i === 0) ? 3 : 2; // Round 1: 3 cards, Round 2: 2 cards (example pattern)

          if (prevState.players[playerRoleToDeal]?.isConnected) { // Only deal to connected players
            for (let k = 0; k < cardsToDealCount; k++) {
              if (freshDeck.length > 0) {
                newPlayerHands[playerRoleToDeal].push(freshDeck.pop());
              }
            }
          }
          dealingToPlayerIndex++;
        }
      }

      const kitty = freshDeck; // Remaining cards form the kitty
      if (kitty.length === 0) { // Should not happen with 24 cards, 4 players, 5 cards each (4 cards in kitty)
          logger.error({ kittyLength: kitty.length, gameId: prevState.gameId }, "Error in dealing: Kitty is empty!");
          // This is a critical error, potentially stop the state update or throw
          // For now, log and continue, but this indicates a flaw in deck/dealing logic if it occurs
          // To prevent error, ensure turnCard can be popped. If kitty is empty, this will fail.
          // This case should ideally be impossible if createDeck and dealing counts are correct.
          // throw new Error("Dealing error: Kitty became empty before turn card could be set.");
      }

      const turnCard = kitty.length > 0 ? kitty.pop() : null; // Top card of kitty is turned up
                                                              // Kitty now has 3 cards if all went well

      if (!turnCard) {
        logger.error({gameId: prevState.gameId}, "Critical error: No turn card could be set from kitty.");
        // This would break the game. Consider how to handle this.
        // For now, this will result in turnCard being null, which bidding logic must handle.
      }

      const firstBidder = getNextPlayer(newDealer, PLAYER_ROLES);

      const newPlayersData = { ...prevState.players };
      PLAYER_ROLES.forEach(role => {
        newPlayersData[role] = {
          ...prevState.players[role], // Preserve score, name, isConnected
          hand: newPlayerHands[role] || [], // Assign new hand
          tricksWonThisHand: 0, // Reset for the new hand
        };
      });

      const startHandMessage = {
        type: 'system',
        text: `New hand started. Dealer is ${newDealer}. ${firstBidder} to make the first bid on the turn card.`,
        timestamp: new Date().toISOString(),
      };

      return {
        ...prevState,
        dealer: newDealer,
        players: newPlayersData,
        deck: [], // Deck is now distributed into hands and kitty
        kitty: kitty, // Kitty after turn card is removed
        turnCard: turnCard,
        trumpSuit: null,
        bids: [],
        roundNumber: 1, // This seems like it should be `prevState.roundNumber + 1` or managed elsewhere if it's game round vs hand round
        playerWhoOrderedUp: null,
        playerWhoCalledTrump: null,
        makerTeam: null,
        goingAlone: false,
        playerGoingAlone: null,
        partnerSittingOut: null,
        currentTrick: [],
        leadSuit: null,
        // tricksTaken are reset within newPlayersData per player
        gamePhase: GAME_PHASES.ORDER_UP_ROUND1,
        currentPlayer: firstBidder, // This player starts the bidding
        orderUpTurn: firstBidder, // Explicitly set who's turn it is to bid
        gameMessages: [...(prevState.gameMessages || []), startHandMessage],
      };
    });

    logger.info({ gameId: newGameState.gameId, newPhase: newGameState.gamePhase, dealer: newGameState.dealer }, 'New hand started, cards dealt.');
    return {
        success: true,
        message: 'New hand started successfully.',
        updatedGameState: newGameState
    };

  } catch (error) {
    logger.error({ error, gameId: currentGameState.gameId }, 'Critical error in startNewHand.');
    return {
        success: false,
        message: 'An internal error occurred while starting a new hand.',
        updatedGameState: currentGameState // Return original state on error
    };
  }
}
