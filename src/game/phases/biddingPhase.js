/**
 * Game logic for the bidding phases of Euchre (Order Up and Call Trump).
 * @module game/phases/biddingPhase
 */
import logger from '../../utils/logger.js';
import { updateGameState } from '../state.js';
import { GAME_PHASES, PLAYER_ROLES } from '../../config/constants.js';
import { getNextPlayer } from '../../utils/players.js'; // Removed getPartner, isTeammate as they are not used here
import { cardToId } from '../../utils/deck.js';
import { validateBid, validateDealerDiscard } from '../../game/logic/validation.js';
import { PhaseLogicError, CardNotInHandError } from '../../game/logic/errors.js'; // Added CardNotInHandError
// Removed local getPlayerTeam function. Will use teamId from player objects.

/**
 * Handles a player's decision in the first round of bidding (order up or pass).
 * @param {object} currentGameState - The current game state.
 * @param {string} playerRole - The role of the player making the decision.
 * @param {boolean} wantsToOrderUp - True if the player wants to order the dealer up, false if passing.
 * @returns {object} The updated game state.
 * @throws {ValidationError} If basic bid validation fails (via validateBid).
 * @throws {NotPlayersTurnError} If it's not the player's turn (via validateBid).
 * @throws {InvalidBidError} If the bid decision is invalid for the phase (via validateBid).
 * @throws {InvalidPhaseError} If bidding is attempted in wrong phase (via validateBid).
 * @throws {PhaseLogicError} If internal logic like missing turnCard or teamId fails.
 */
export function handleOrderUpDecision(currentGameState, playerRole, wantsToOrderUp) {
    logger.info({ gameId: currentGameState.gameId, playerRole, wantsToOrderUp }, 'Handling order up decision.');

    // Perform bid validation first
    validateBid(currentGameState, playerRole, wantsToOrderUp ? 'orderUp' : 'pass', null);

    // Use currentGameState directly instead of relying on a global via updateGameState's prevState
    const prevState = currentGameState; // Alias for clarity within existing logic structure

    const bids = [...(prevState.bids || []), { round: 1, playerRole, decision: wantsToOrderUp ? 'orderUp' : 'pass' }];
    let messageText = `${prevState.players[playerRole]?.name || playerRole} `;
    let changes = {};

    if (wantsToOrderUp) {
        if (!prevState.turnCard) {
            logger.error({ gameId: prevState.gameId, playerRole }, "handleOrderUpDecision: turnCard is null when trying to order up.");
            throw new PhaseLogicError("Cannot order up: turn card is missing.");
        }
        messageText += `ordered up the dealer (${prevState.dealer}) to pick up the ${cardToId(prevState.turnCard)}.`;
        const makerTeam = prevState.players[playerRole]?.teamId;
        if (!makerTeam) {
            logger.error({ gameId: prevState.gameId, playerRole }, "Could not determine team for ordering player in handleOrderUpDecision.");
            throw new PhaseLogicError("Player team could not be determined for ordering up.");
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
 * @param {string} dealerRole - The role of the dealer.
 * @param {string} cardToDiscardId - The ID of the card the dealer wishes to discard.
 * @returns {object} The updated game state.
 * @throws {ValidationError} If basic discard validation fails (via validateDealerDiscard).
 * @throws {NotPlayersTurnError} If it's not the player's turn (via validateDealerDiscard).
 * @throws {InvalidDiscardError} If the discard is invalid (via validateDealerDiscard).
 * @throws {InvalidPhaseError} If discarding is attempted in wrong phase (via validateDealerDiscard).
 * @throws {CardNotInHandError} If card to discard not in hand (via validateDealerDiscard or preliminary check).
 * @throws {PhaseLogicError} If internal logic like missing turnCard fails, or preliminary card ID check fails.
 */
export function handleDealerDiscard(currentGameState, dealerRole, cardToDiscardId) {
    logger.info({ gameId: currentGameState.gameId, dealerRole, cardToDiscardId }, 'Handling dealer discard.');

    // Note: currentGameState is used directly for reading, new state is built at the end.
    // This avoids issues with stale data if using a 'prevState' clone for some reads and currentGameState for others.
    const dealerHand = currentGameState.players[dealerRole]?.hand || [];
    const cardToDiscardObject = dealerHand.find(card => card.id === cardToDiscardId);

    // Preliminary check for the card by ID.
    // validateDealerDiscard will also check if the card object is in the hand.
    if (!cardToDiscardObject) {
        logger.error({ gameId: currentGameState.gameId, dealerHandAttempted: dealerHand, cardToDiscardId }, "Card to discard (by ID) not found in dealer's hand for preliminary validation.");
        // Throwing CardNotInHandError here is consistent with what validateDealerDiscard would do if card object was passed but not found.
        throw new CardNotInHandError(`Card ${cardToDiscardId} not found in dealer's hand.`);
    }

    // Perform validation with the found card object
    validateDealerDiscard(currentGameState, dealerRole, cardToDiscardObject, dealerHand);

    const turnCard = currentGameState.turnCard;
    if (!turnCard) {
        // This check is after validateDealerDiscard because validateDealerDiscard doesn't specifically check for turnCard presence,
        // but the discard action itself fundamentally requires it.
        logger.error({ gameId: currentGameState.gameId }, "Dealer discard attempted but no turnCard in state.");
        throw new PhaseLogicError("Cannot discard: turn card is missing from game state.");
    }

    // Re-construct hand for immutability: filter out discarded
    const newDealerHand = dealerHand.filter(card => card.id !== cardToDiscardId);
    // The turnCard is already part of dealerHand at this stage (conceptually, dealer picked it up, now has 6 cards).
    // So, we just remove the cardToDiscardId. The newDealerHand will have 5 cards.

    const newPlayersData = {
        ...currentGameState.players,
        [dealerRole]: {
            ...currentGameState.players[dealerRole],
            hand: newDealerHand,
        }
    };

    const messageText = `${currentGameState.players[dealerRole]?.name || dealerRole} picked up the ${cardToId(turnCard)} and discarded ${cardToId(cardToDiscardObject)}.`;
    logger.info({ gameId: currentGameState.gameId, pickedUp: cardToId(turnCard), discarded: cardToId(cardToDiscardObject) }, "Dealer discard complete.");

    const goAloneDecider = currentGameState.playerWhoOrderedUp || currentGameState.playerWhoCalledTrump;

    return {
        ...currentGameState, // Start with the original state
        players: newPlayersData, // Apply updated players object
        turnCard: null, // Turn card is now in hand
        gamePhase: GAME_PHASES.GOING_ALONE_DECISION,
        currentPlayer: goAloneDecider,
        gameMessages: [...(currentGameState.gameMessages || []), { type: 'bidding', text: messageText, timestamp: new Date().toISOString() }],
    };
}

/**
 * Handles a player's decision in the second round of bidding (call trump or pass).
 * @param {object} currentGameState - The current game state.
 * @param {string} playerRole - The role of the player making the decision.
 * @param {boolean} wantsToCall - True if the player wants to call a suit, false if passing.
 * @param {string} [suitCalled] - The suit called as trump, if wantsToCall is true.
 * @returns {object} The updated game state.
 * @throws {ValidationError} If basic bid validation fails (via validateBid).
 * @throws {NotPlayersTurnError} If it's not the player's turn (via validateBid).
 * @throws {InvalidBidError} If the bid decision is invalid for the phase (via validateBid).
 * @throws {InvalidPhaseError} If bidding is attempted in wrong phase (via validateBid).
 * @throws {PhaseLogicError} If internal logic like missing makerTeam fails.
 */
export function handleCallTrumpDecision(currentGameState, playerRole, wantsToCall, suitCalled = null) {
    logger.info({ gameId: currentGameState.gameId, playerRole, wantsToCall, suitCalled }, 'Handling call trump decision.');

    // Perform bid validation first
    // suitCalled can be null if wantsToCall is false (passing)
    validateBid(currentGameState, playerRole, wantsToCall ? 'callTrump' : 'pass', suitCalled);

    // Use currentGameState for reads, new state built at the end. Avoid prevState clone here.
    const bids = [...(currentGameState.bids || []), { round: 2, playerRole, decision: wantsToCall ? 'callTrump' : 'pass', suit: wantsToCall ? suitCalled : undefined }];
    let messageText = `${currentGameState.players[playerRole]?.name || playerRole} `;
    let changes = {};

    if (wantsToCall) {
        // suitCalled validity (is a valid suit, not the turned-down one) is now handled by validateBid.
        messageText += `called ${suitCalled} as trump.`;
        const makerTeam = currentGameState.players[playerRole]?.teamId;
        if (!makerTeam) {
            logger.error({ gameId: currentGameState.gameId, playerRole }, "Could not determine team for calling player in handleCallTrumpDecision.");
            throw new PhaseLogicError("Player team could not be determined for calling trump.");
        }
        logger.info({ gameId: currentGameState.gameId, trumpSuit: suitCalled, makerTeam, playerWhoCalledTrump: playerRole }, "Trump called in round 2.");

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

        // Dealer passing is the only condition that might end the round (misdeal)
        // "Stick the dealer" is handled by validateBid, preventing dealer from passing if necessary.
        if (playerRole === currentGameState.dealer) {
            // If validateBid allowed dealer to pass, it means it wasn't a "stick the dealer" scenario.
            // This implies all players (including dealer) have passed in round 2.
            messageText += ' All players passed in round 2. Misdeal.';
            logger.info({ gameId: currentGameState.gameId }, "All passed in call trump round (including dealer). Misdeal.");
            changes = {
                gamePhase: GAME_PHASES.DEALING,
                currentPlayer: getNextPlayer(currentGameState.dealer, PLAYER_ROLES), // For next deal
                turnCard: null,
                trumpSuit: null,
                roundNumber: 1, // Reset for new hand
                playerWhoOrderedUp: null,
                playerWhoCalledTrump: null,
                makerTeam: null,
            };
        } else {
            logger.info({ gameId: currentGameState.gameId, nextBidder }, `Player passed in round 2, next bidder is ${nextBidder}.`);
            changes = {
                currentPlayer: nextBidder,
            };
        }
    }

    return {
        ...currentGameState,
        ...changes,
        bids,
        gameMessages: [...(currentGameState.gameMessages || []), { type: 'bidding', text: messageText, timestamp: new Date().toISOString() }],
    };
}
