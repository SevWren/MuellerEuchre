/**
 * Game logic for the bidding phases of Euchre (Order Up and Call Trump).
 * @module game/phases/biddingPhase
 */
import logger from '../../utils/logger.js';
import { updateGameState } from '../state.js';
import { GAME_PHASES, PLAYER_ROLES } from '../../config/constants.js';
import { getNextPlayer, getPartner, isTeammate } from '../../utils/players.js';
import { cardToId } from '../../utils/deck.js'; // For logging or messages

/**
 * Determines the team of a given player.
 * Note: This is a simplified version. A more robust team association might be stored directly in player objects.
 * @param {string} playerRole - The role of the player.
 * @returns {string|null} Team identifier (e.g., 'teamNS', 'teamEW') or null.
 */
function getPlayerTeam(playerRole) {
    // Assumes PLAYER_ROLES = ['south', 'west', 'north', 'east']
    // South & North (indices 0, 2) are one team. West & East (indices 1, 3) are another.
    const playerIndex = PLAYER_ROLES.indexOf(playerRole);
    if (playerIndex === 0 || playerIndex === 2) return `${PLAYER_ROLES[0]}_${PLAYER_ROLES[2]}`; // south_north
    if (playerIndex === 1 || playerIndex === 3) return `${PLAYER_ROLES[1]}_${PLAYER_ROLES[3]}`; // west_east
    return null;
}

/**
 * Handles a player's decision in the first round of bidding (order up or pass).
 * @param {object} currentGameState - The current game state.
 * @param {string} playerRole - The role of the player making the decision.
 * @param {boolean} wantsToOrderUp - True if the player wants to order the dealer up, false if passing.
 * @returns {object} The updated game state.
 */
export function handleOrderUpDecision(currentGameState, playerRole, wantsToOrderUp) {
    logger.info({ gameId: currentGameState.gameId, playerRole, wantsToOrderUp }, 'Handling order up decision.');

    return updateGameState(prevState => {
        const bids = [...(prevState.bids || []), { round: 1, playerRole, decision: wantsToOrderUp ? 'orderUp' : 'pass' }];
        let messageText = `${prevState.players[playerRole]?.name || playerRole} `;

        if (wantsToOrderUp) {
            messageText += `ordered up the dealer (${prevState.dealer}) to pick up the ${cardToId(prevState.turnCard)}.`;
            const makerTeam = getPlayerTeam(playerRole);
            logger.info({ gameId: prevState.gameId, trumpSuit: prevState.turnCard.suit, makerTeam, playerWhoOrderedUp: playerRole }, "Trump ordered up.");

            return {
                ...prevState,
                bids,
                trumpSuit: prevState.turnCard.suit,
                playerWhoOrderedUp: playerRole,
                makerTeam: makerTeam,
                gamePhase: GAME_PHASES.DEALER_DISCARD,
                currentPlayer: prevState.dealer, // Dealer's turn to discard
                gameMessages: [...(prevState.gameMessages || []), { type: 'bidding', text: messageText, timestamp: new Date().toISOString() }],
            };
        } else { // Player passed
            messageText += 'passed.';
            const nextBidder = getNextPlayer(playerRole, PLAYER_ROLES);
            const firstBidderOfRound1 = getNextPlayer(prevState.dealer, PLAYER_ROLES);

            if (nextBidder === firstBidderOfRound1) { // All 4 players (or all non-dealers + dealer if dealer's turn to consider pickup) passed
                messageText += ' All players passed in round 1. Moving to round 2 bidding.';
                logger.info({ gameId: prevState.gameId }, "All passed in order up round 1.");
                return {
                    ...prevState,
                    bids,
                    roundNumber: 2,
                    gamePhase: GAME_PHASES.ORDER_UP_ROUND2, // Mistake in plan, should be ORDER_UP_ROUND2
                    currentPlayer: firstBidderOfRound1, // Player left of dealer starts round 2
                    // turnCard remains the same for round 2, but conceptually "turned down"
                    gameMessages: [...(prevState.gameMessages || []), { type: 'bidding', text: messageText, timestamp: new Date().toISOString() }],
                };
            } else {
                logger.info({ gameId: prevState.gameId, nextBidder }, `Player passed, next bidder is ${nextBidder}.`);
                return {
                    ...prevState,
                    bids,
                    currentPlayer: nextBidder,
                    gameMessages: [...(prevState.gameMessages || []), { type: 'bidding', text: messageText, timestamp: new Date().toISOString() }],
                };
            }
        }
    });
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

    return updateGameState(prevState => {
        if (prevState.dealer !== dealerRole) { // Should be caught by validation, but good to double check
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
        dealerHand.push(turnCard); // Add the turn card to dealer's hand

        const newPlayersData = {
            ...prevState.players,
            [dealerRole]: {
                ...prevState.players[dealerRole],
                hand: dealerHand,
            }
        };

        const messageText = `${prevState.players[dealerRole]?.name || dealerRole} picked up the ${cardToId(turnCard)} and discarded ${cardToId(discardedCard)}.`;
        logger.info({ gameId: prevState.gameId, pickedUp: cardToId(turnCard), discarded: cardToId(discardedCard) }, "Dealer discard complete.");

        // Determine who makes the go-alone decision. Typically, the player who ordered up or their partner.
        // For simplicity, let's assume the player who ordered up makes the decision.
        const goAloneDecider = prevState.playerWhoOrderedUp || prevState.playerWhoCalledTrump; // playerWhoCalledTrump would be null here

        return {
            ...prevState,
            players: newPlayersData,
            turnCard: null, // Turn card has been picked up
            // kitty might store the discarded card, or a general discard pile. For now, it's just removed.
            gamePhase: GAME_PHASES.GOING_ALONE_DECISION, // Or PLAYING if skipping go_alone decision
            currentPlayer: goAloneDecider, // Player who made trump (or team) decides to go alone
            gameMessages: [...(prevState.gameMessages || []), { type: 'bidding', text: messageText, timestamp: new Date().toISOString() }],
        };
    });
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

    return updateGameState(prevState => {
        const bids = [...(prevState.bids || []), { round: 2, playerRole, decision: wantsToCall ? 'callTrump' : 'pass', suit: wantsToCall ? suitCalled : undefined }];
        let messageText = `${prevState.players[playerRole]?.name || playerRole} `;

        if (wantsToCall) {
            messageText += `called ${suitCalled} as trump.`;
            const makerTeam = getPlayerTeam(playerRole);
            logger.info({ gameId: prevState.gameId, trumpSuit: suitCalled, makerTeam, playerWhoCalledTrump: playerRole }, "Trump called in round 2.");

            return {
                ...prevState,
                bids,
                trumpSuit: suitCalled,
                playerWhoCalledTrump: playerRole,
                makerTeam: makerTeam,
                gamePhase: GAME_PHASES.GOING_ALONE_DECISION, // Or PLAYING
                currentPlayer: playerRole, // Player who called trump decides to go alone
                gameMessages: [...(prevState.gameMessages || []), { type: 'bidding', text: messageText, timestamp: new Date().toISOString() }],
            };
        } else { // Player passed
            messageText += 'passed.';
            const nextBidder = getNextPlayer(playerRole, PLAYER_ROLES);
            const firstBidderOfRound2 = getNextPlayer(prevState.dealer, PLAYER_ROLES);

            // Check for "Stick the Dealer" scenario or misdeal
            // Dealer is the last to bid in round 2. If nextBidder is firstBidderOfRound2, it means it has gone all the way around.
            if (playerRole === prevState.dealer) { // Current passer is the dealer, means all 4 passed in round 2
                messageText += ' All players passed in round 2. Misdeal.';
                logger.info({ gameId: prevState.gameId }, "All passed in call trump round (including dealer). Misdeal.");
                // Transition back to DEALING to start a new hand. Dealer rotation will occur in startNewHand.
                return {
                    ...prevState,
                    bids,
                    gamePhase: GAME_PHASES.DEALING,
                    currentPlayer: getNextPlayer(prevState.dealer, PLAYER_ROLES), // Next dealer's left (for new deal)
                    gameMessages: [...(prevState.gameMessages || []), { type: 'bidding', text: messageText, timestamp: new Date().toISOString() }],
                    // Reset relevant bidding state for the new hand
                    turnCard: null,
                    trumpSuit: null,
                    roundNumber: 1,
                    playerWhoOrderedUp: null,
                    playerWhoCalledTrump: null,
                    makerTeam: null,
                };
            } else { // Not dealer, or not everyone passed yet
                 logger.info({ gameId: prevState.gameId, nextBidder }, `Player passed in round 2, next bidder is ${nextBidder}.`);
                return {
                    ...prevState,
                    bids,
                    currentPlayer: nextBidder,
                    gameMessages: [...(prevState.gameMessages || []), { type: 'bidding', text: messageText, timestamp: new Date().toISOString() }],
                };
            }
        }
    });
}
