/**
 * Game logic for the bidding phases of Euchre (Order Up and Call Trump).
 * @module game/phases/biddingPhase
 */
import logger from '../../utils/logger.js';
// updateGameState from '../state.js' is not used as these functions are pure.
import { GAME_PHASES, PLAYER_ROLES, SUITS } from '../../config/constants.js'; // Added SUITS
import { getNextPlayer } from '../../utils/players.js';
import { cardToId } from '../../utils/deck.js';

/**
 * Handles a player's decision in the first round of bidding (order up or pass).
 * @param {object} currentGameState - The current game state.
 * @param {string} playerRole - The role of the player making the decision.
 * @param {boolean} wantsToOrderUp - True if the player wants to order the dealer up, false if passing.
 * @returns {object} The updated game state.
 * @throws {object} Error object with message and errorType.
 */
export function handleOrderUpDecision(currentGameState, playerRole, wantsToOrderUp) {
    const gameId = currentGameState?.gameId; // For logging context
    logger.info({ gameId, playerRole, wantsToOrderUp }, 'Handling order up decision.');

    // Input Validation
    if (typeof playerRole !== 'string' || !playerRole.trim() || !currentGameState?.players?.[playerRole]) {
        const error = { message: "Invalid playerRole or player not found in game state.", errorType: 'INVALID_INPUT', details: { playerRole } };
        logger.error({ gameId, error, playerRole, currentGameStatePlayers: currentGameState?.players }, "Validation failed in handleOrderUpDecision.");
        throw error;
    }

    const prevState = JSON.parse(JSON.stringify(currentGameState)); // Deep clone for safety

    const bids = [...(prevState.bids || []), { round: 1, playerRole, decision: wantsToOrderUp ? 'orderUp' : 'pass' }];
    let messageText = `${prevState.players[playerRole]?.name || playerRole} `;
    let changes = {};

    if (wantsToOrderUp) {
        if (!prevState.turnCard) {
            const error = { message: "Cannot order up: turn card is missing.", errorType: 'MISSING_TURN_CARD' };
            logger.error({ gameId, playerRole, error }, "handleOrderUpDecision: turnCard is null.");
            throw error;
        }
        messageText += `ordered up the dealer (${prevState.dealer}) to pick up the ${cardToId(prevState.turnCard)}.`;
        const makerTeam = prevState.players[playerRole]?.teamId;
        if (!makerTeam) {
            const error = { message: "Player team could not be determined for ordering up.", errorType: 'STATE_ERROR' };
            logger.error({ gameId, playerRole, error }, "Could not determine team for ordering player.");
            throw error;
        }
        logger.info({ gameId, trumpSuit: prevState.turnCard.suit, makerTeam, playerWhoOrderedUp: playerRole }, "Trump ordered up.");

        changes = {
            trumpSuit: prevState.turnCard.suit,
            playerWhoOrderedUp: playerRole,
            makerTeam: makerTeam,
            gamePhase: GAME_PHASES.DEALER_DISCARD,
            currentPlayer: prevState.dealer,
        };
    } else { // Player passed
        messageText += 'passed.';
        const nextBidder = getNextPlayer(playerRole, PLAYER_ROLES);
        const firstBidderOfRound1 = getNextPlayer(prevState.dealer, PLAYER_ROLES);

        if (nextBidder === firstBidderOfRound1) {
            messageText += ' All players passed in round 1. Moving to round 2 bidding.';
            logger.info({ gameId }, "All passed in order up round 1.");
            changes = {
                roundNumber: 2,
                gamePhase: GAME_PHASES.ORDER_UP_ROUND2,
                currentPlayer: firstBidderOfRound1,
            };
        } else {
            logger.info({ gameId, nextBidder }, `Player passed, next bidder is ${nextBidder}.`);
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

/**
 * Handles the dealer's discard after being ordered up.
 * @param {object} currentGameState - The current game state.
 * @param {string} dealerRole - The role of the dealer.
 * @param {string} cardToDiscardId - The ID of the card the dealer wishes to discard.
 * @returns {object} The updated game state.
 * @throws {object} Error object with message and errorType.
 */
export function handleDealerDiscard(currentGameState, dealerRole, cardToDiscardId) {
    const gameId = currentGameState?.gameId;
    logger.info({ gameId, dealerRole, cardToDiscardId }, 'Handling dealer discard.');

    // Input Validation
    if (typeof dealerRole !== 'string' || !dealerRole.trim() || !currentGameState?.players?.[dealerRole]) {
        const error = { message: "Invalid dealerRole or dealer not found in game state.", errorType: 'INVALID_INPUT', details: { dealerRole } };
        logger.error({ gameId, error, dealerRole, currentGameStatePlayers: currentGameState?.players }, "Validation failed in handleDealerDiscard (dealerRole).");
        throw error;
    }
    if (typeof cardToDiscardId !== 'string' || !cardToDiscardId.trim()) {
        const error = { message: "Invalid cardToDiscardId: must be a non-empty string.", errorType: 'INVALID_INPUT', details: { cardToDiscardId } };
        logger.error({ gameId, error, dealerRole }, "Validation failed in handleDealerDiscard (cardToDiscardId).");
        throw error;
    }

    const prevState = JSON.parse(JSON.stringify(currentGameState));

    if (prevState.dealer !== dealerRole) {
        const error = { message: "Only the current dealer can discard.", errorType: 'AUTHORIZATION_ERROR', details: { stateDealer: prevState.dealer, attemptedDealer: dealerRole } };
        logger.error({ gameId, error }, "handleDealerDiscard called by non-dealer.");
        throw error;
    }

    const dealerHand = [...(prevState.players[dealerRole]?.hand || [])];
    const turnCard = prevState.turnCard;

    if (!turnCard) {
        const error = { message: "Cannot discard: turn card is missing from game state.", errorType: 'MISSING_TURN_CARD' };
        logger.error({ gameId, error }, "Dealer discard attempted but no turnCard in state.");
        throw error;
    }

    const discardIndex = dealerHand.findIndex(card => card.id === cardToDiscardId);
    if (discardIndex === -1) {
        const error = { message: "Card to discard not found in dealer's hand.", errorType: 'INVALID_CARD', details: { dealerHand, cardToDiscardId } };
        logger.error({ gameId, error }, "Card to discard not found in dealer's hand.");
        throw error;
    }

    const discardedCard = dealerHand.splice(discardIndex, 1)[0];
    dealerHand.push(turnCard);

    const newPlayersData = { ...prevState.players, [dealerRole]: { ...prevState.players[dealerRole], hand: dealerHand } };
    const messageText = `${prevState.players[dealerRole]?.name || dealerRole} picked up the ${cardToId(turnCard)} and discarded ${cardToId(discardedCard)}.`;
    logger.info({ gameId, pickedUp: cardToId(turnCard), discarded: cardToId(discardedCard) }, "Dealer discard complete.");

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
 * @throws {object} Error object with message and errorType.
 */
export function handleCallTrumpDecision(currentGameState, playerRole, wantsToCall, suitCalled = null) {
    const gameId = currentGameState?.gameId;
    logger.info({ gameId, playerRole, wantsToCall, suitCalled }, 'Handling call trump decision.');

    // Input Validation
    if (typeof playerRole !== 'string' || !playerRole.trim() || !currentGameState?.players?.[playerRole]) {
        const error = { message: "Invalid playerRole or player not found in game state.", errorType: 'INVALID_INPUT', details: { playerRole } };
        logger.error({ gameId, error, playerRole, currentGameStatePlayers: currentGameState?.players }, "Validation failed in handleCallTrumpDecision (playerRole).");
        throw error;
    }
    if (wantsToCall && (typeof suitCalled !== 'string' || !suitCalled.trim() || !Object.values(SUITS).includes(suitCalled))) {
        const error = { message: "Invalid suitCalled: must be a non-empty string and a valid suit.", errorType: 'INVALID_INPUT', details: { suitCalled, validSuits: Object.values(SUITS) } };
        logger.error({ gameId, error, playerRole, suitCalled }, "Validation failed in handleCallTrumpDecision (suitCalled).");
        throw error;
    }

    const prevState = JSON.parse(JSON.stringify(currentGameState));

    const bids = [...(prevState.bids || []), { round: 2, playerRole, decision: wantsToCall ? 'callTrump' : 'pass', suit: wantsToCall ? suitCalled : undefined }];
    let messageText = `${prevState.players[playerRole]?.name || playerRole} `;
    let changes = {};

    if (wantsToCall) {
        if (!suitCalled) { // This check is redundant due to input validation above, but kept for defense-in-depth
            const error = { message: "Must specify a suit to call trump.", errorType: 'VALIDATION_ERROR' };
            logger.error({ gameId, playerRole, error }, "Attempted to call trump without specifying a suit.");
            throw error;
        }
        if (prevState.turnCard && prevState.turnCard.suit === suitCalled && prevState.roundNumber === 2) {
            const error = { message: "Cannot call the suit of the card that was turned down.", errorType: 'GAME_RULE_VIOLATION', details: { suitCalled, turnedDownSuit: prevState.turnCard.suit } };
            logger.warn({ gameId, playerRole, error }, "Player attempted to call the suit of the turned-down card.");
            throw error;
        }

        messageText += `called ${suitCalled} as trump.`;
        const makerTeam = prevState.players[playerRole]?.teamId;
        if (!makerTeam) {
            const error = { message: "Player team could not be determined for calling trump.", errorType: 'STATE_ERROR' };
            logger.error({ gameId, playerRole, error }, "Could not determine team for calling player.");
            throw error;
        }
        logger.info({ gameId, trumpSuit: suitCalled, makerTeam, playerWhoCalledTrump: playerRole }, "Trump called in round 2.");

        changes = {
            trumpSuit: suitCalled,
            playerWhoCalledTrump: playerRole,
            makerTeam: makerTeam,
            gamePhase: GAME_PHASES.GOING_ALONE_DECISION,
            currentPlayer: playerRole,
        };
    } else { // Player passed
        messageText += 'passed.';
        const nextBidder = getNextPlayer(playerRole, PLAYER_ROLES);

        if (playerRole === prevState.dealer) {
            messageText += ' All players passed in round 2. Misdeal.';
            logger.info({ gameId }, "All passed in call trump round (including dealer). Misdeal.");
            changes = {
                gamePhase: GAME_PHASES.DEALING,
                currentPlayer: getNextPlayer(prevState.dealer, PLAYER_ROLES),
                turnCard: null,
                trumpSuit: null,
                roundNumber: 1,
                playerWhoOrderedUp: null,
                playerWhoCalledTrump: null,
                makerTeam: null,
            };
        } else {
            logger.info({ gameId, nextBidder }, `Player passed in round 2, next bidder is ${nextBidder}.`);
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
