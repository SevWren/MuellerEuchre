/**
 * Game logic for the bidding phases of Euchre (Order Up and Call Trump).
 * @module game/phases/biddingPhase
 */
import logger from '../../utils/logger.js';
import { updateGameState } from '../state.js';
import { GAME_PHASES, PLAYER_ROLES } from '../../config/constants.js';
import { getNextPlayer, getPartner, isTeammate } from '../../utils/players.js';
import { cardToId } from '../../utils/deck.js'; // For logging or messages
// Removed local getPlayerTeam function. Will use teamId from player objects.

/**
 * Handles a player's decision in the first round of bidding (order up or pass).
 * @param {object} currentGameState - The current game state.
 * @param {string} playerRole - The role of the player making the decision.
 * @param {boolean} wantsToOrderUp - True if the player wants to order the dealer up, false if passing.
 * @returns {object} The updated game state.
 */
export function handleOrderUpDecision(currentGameState, playerRole, wantsToOrderUp) {
    logger.info({ gameId: currentGameState.gameId, playerRole, wantsToOrderUp }, 'Handling order up decision.');

    // Use currentGameState directly instead of relying on a global via updateGameState's prevState
    const prevState = currentGameState; // Alias for clarity within existing logic structure

    const bids = [...(prevState.bids || []), { round: 1, playerRole, decision: wantsToOrderUp ? 'orderUp' : 'pass' }];
    let messageText = `${prevState.players[playerRole]?.name || playerRole} `;
    let changes = {};

    if (wantsToOrderUp) {
        if (!prevState.turnCard) { // Guard against null turnCard
            logger.error({ gameId: prevState.gameId, playerRole }, "handleOrderUpDecision: turnCard is null when trying to order up.");
            throw new Error("Cannot order up: turn card is missing.");
        }
        messageText += `ordered up the dealer (${prevState.dealer}) to pick up the ${cardToId(prevState.turnCard)}.`;
        const makerTeam = prevState.players[playerRole]?.teamId;
        if (!makerTeam) {
            logger.error({ gameId: prevState.gameId, playerRole }, "Could not determine team for ordering player in handleOrderUpDecision.");
            throw new Error("Player team could not be determined for ordering up.");
        }
        logger.info({ gameId: prevState.gameId, trumpSuit: prevState.turnCard.suit, makerTeam, playerWhoOrderedUp: playerRole }, "Trump ordered up.");

        changes = {
            trumpSuit: prevState.turnCard.suit,
            playerWhoOrderedUp: playerRole,
            makerTeam: makerTeam,
            gamePhase: GAME_PHASES.DEALER_DISCARD,
            currentPlayer: prevState.dealer, // Dealer's turn to discard
        };
    } else { // Player passed
        messageText += 'passed.';
        const nextBidder = getNextPlayer(playerRole, PLAYER_ROLES);
        const firstBidderOfRound1 = getNextPlayer(prevState.dealer, PLAYER_ROLES);

        if (nextBidder === firstBidderOfRound1) { // All 4 players passed
            messageText += ' All players passed in round 1. Moving to round 2 bidding.';
            logger.info({ gameId: prevState.gameId }, "All passed in order up round 1.");
            changes = {
                roundNumber: 2,
                gamePhase: GAME_PHASES.ORDER_UP_ROUND2,
                currentPlayer: firstBidderOfRound1,
            };
        } else {
            logger.info({ gameId: prevState.gameId, nextBidder }, `Player passed, next bidder is ${nextBidder}.`);
            changes = {
                currentPlayer: nextBidder,
            };
        }
    }

    return {
        ...prevState, // Spread the original state first
        ...changes,   // Then apply specific changes
        bids,         // Update bids array
        gameMessages: [...(prevState.gameMessages || []), { type: 'bidding', text: messageText, timestamp: new Date().toISOString() }],
    };
}

/**
 * Handles the dealer's discard after being ordered up.
 * @param {object} currentGameState - The current game state.
 * @param {string} dealerRole - The role of the dealer (should match currentGameState.dealer).
 * @param {string} cardToDiscardId - The ID of the card the dealer wishes to discard.
 * @returns {object} The updated game state.
 * @throws {Error} if card to discard is not found in dealer's hand.
 */
export function handleDealerDiscard(currentGameState, dealerRole, cardToDiscardId) {
    logger.info({ gameId: currentGameState.gameId, dealerRole, cardToDiscardId }, 'Handling dealer discard.');

    const prevState = JSON.parse(JSON.stringify(currentGameState)); // Simple deep clone

    if (prevState.dealer !== dealerRole) {
        logger.error({ dealerInState: prevState.dealer, attemptedDealer: dealerRole }, "handleDealerDiscard called by non-dealer.");
        throw new Error("Only the current dealer can discard.");
    }

    const dealerHand = [...(prevState.players[dealerRole]?.hand || [])];
    const turnCard = prevState.turnCard;

    if (!turnCard) {
        logger.error({ gameId: prevState.gameId }, "Dealer discard attempted but no turnCard in state.");
        throw new Error("Cannot discard: turn card is missing from game state.");
    }

    const discardIndex = dealerHand.findIndex(card => card.id === cardToDiscardId);
    if (discardIndex === -1) {
        logger.error({ gameId: prevState.gameId, dealerHand, cardToDiscardId }, "Card to discard not found in dealer's hand.");
        throw new Error("Card to discard not found in dealer's hand.");
    }

    const discardedCard = dealerHand.splice(discardIndex, 1)[0];
    dealerHand.push(turnCard);

    const newPlayersData = {
        ...prevState.players,
        [dealerRole]: {
            ...prevState.players[dealerRole],
            hand: dealerHand,
        }
    };

    const messageText = `${prevState.players[dealerRole]?.name || dealerRole} picked up the ${cardToId(turnCard)} and discarded ${cardToId(discardedCard)}.`;
    logger.info({ gameId: prevState.gameId, pickedUp: cardToId(turnCard), discarded: cardToId(discardedCard) }, "Dealer discard complete.");

    const goAloneDecider = prevState.playerWhoOrderedUp || prevState.playerWhoCalledTrump;

    return {
        ...prevState,
        players: newPlayersData,
        turnCard: null,
        gamePhase: GAME_PHASES.GOING_ALONE_DECISION,
        currentPlayer: goAloneDecider,
        gameMessages: [...(prevState.gameMessages || []), { type: 'bidding', text: messageText, timestamp: new Date().toISOString() }],
    };
}

/**
 * Handles a player's decision in the second round of bidding (call trump or pass).
 * @param {object} currentGameState - The current game state.
 * @param {string} playerRole - The role of the player making the decision.
 * @param {boolean} wantsToCall - True if the player wants to call a suit, false if passing.
 * @param {string} [suitCalled] - The suit called as trump, if wantsToCall is true.
 * @returns {object} The updated game state.
 */
export function handleCallTrumpDecision(currentGameState, playerRole, wantsToCall, suitCalled = null) {
    logger.info({ gameId: currentGameState.gameId, playerRole, wantsToCall, suitCalled }, 'Handling call trump decision.');

    const prevState = JSON.parse(JSON.stringify(currentGameState)); // Simple deep clone

    const bids = [...(prevState.bids || []), { round: 2, playerRole, decision: wantsToCall ? 'callTrump' : 'pass', suit: wantsToCall ? suitCalled : undefined }];
    let messageText = `${prevState.players[playerRole]?.name || playerRole} `;
    let changes = {};

    if (wantsToCall) {
        // Basic validation: suitCalled must be provided if wantsToCall is true
        if (!suitCalled) {
            logger.error({ gameId: prevState.gameId, playerRole }, "Attempted to call trump without specifying a suit.");
            throw new Error("Must specify a suit to call trump.");
        }
        // Game rule: Cannot call the suit of the original turn card (if it was turned down)
        if (prevState.turnCard && prevState.turnCard.suit === suitCalled && prevState.roundNumber === 2) {
             logger.warn({ gameId: prevState.gameId, playerRole, suitCalled, originalTurnCardSuit: prevState.turnCard.suit }, "Player attempted to call the suit of the turned-down card.");
             throw new Error("Cannot call the suit of the card that was turned down.");
        }

        messageText += `called ${suitCalled} as trump.`;
        const makerTeam = prevState.players[playerRole]?.teamId;
        if (!makerTeam) {
            logger.error({ gameId: prevState.gameId, playerRole }, "Could not determine team for calling player in handleCallTrumpDecision.");
            throw new Error("Player team could not be determined for calling trump.");
        }
        logger.info({ gameId: prevState.gameId, trumpSuit: suitCalled, makerTeam, playerWhoCalledTrump: playerRole }, "Trump called in round 2.");

        changes = {
            trumpSuit: suitCalled,
            playerWhoCalledTrump: playerRole,
            makerTeam: makerTeam,
            gamePhase: GAME_PHASES.GOING_ALONE_DECISION,
            currentPlayer: playerRole, // Player who called trump decides to go alone
        };
    } else { // Player passed
        messageText += 'passed.';
        const nextBidder = getNextPlayer(playerRole, PLAYER_ROLES);
        // const firstBidderOfRound2 = getNextPlayer(prevState.dealer, PLAYER_ROLES); // Not needed for this logic path

        if (playerRole === prevState.dealer) { // Current passer is the dealer, means all 4 passed in round 2
            messageText += ' All players passed in round 2. Misdeal.';
            logger.info({ gameId: prevState.gameId }, "All passed in call trump round (including dealer). Misdeal.");
            changes = {
                gamePhase: GAME_PHASES.DEALING,
                currentPlayer: getNextPlayer(prevState.dealer, PLAYER_ROLES), // For next deal
                turnCard: null,
                trumpSuit: null,
                roundNumber: 1, // Reset for new hand
                playerWhoOrderedUp: null,
                playerWhoCalledTrump: null,
                makerTeam: null,
            };
        } else {
            logger.info({ gameId: prevState.gameId, nextBidder }, `Player passed in round 2, next bidder is ${nextBidder}.`);
            changes = {
                currentPlayer: nextBidder,
            };
        }
    }

    return {
        ...prevState,
        ...changes,
        bids,
        gameMessages: [...(prevState.gameMessages || []), { type: 'bidding', text: messageText, timestamp: new Date().toISOString() }],
    };
}
