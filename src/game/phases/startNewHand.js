import { GAME_PHASES } from '../../config/constants.js';
import { createDeck, shuffleDeck } from '../../utils/deck.js';
import { log } from '../../utils/logger.js';
import { getNextPlayer } from '../../utils/players.js';

/**
 * Starts a new hand of Euchre
 * @param {Object} gameState - Current game state
 * @returns {Object} Updated game state with new hand initialized
 */
export function startNewHand(gameState) {
    log(1, '[startNewHand] Starting new hand...');
    
    // Create a deep copy of the game state
    const updatedState = JSON.parse(JSON.stringify(gameState));
    
    // Rotate dealer before starting new hand
    const dealerIndex = updatedState.playerOrder.indexOf(updatedState.dealer);
    const nextDealerIndex = (dealerIndex + 1) % updatedState.playerOrder.length;
    updatedState.dealer = updatedState.playerOrder[nextDealerIndex];
    
    // If this is the first hand of the session, set the initial dealer
    if (updatedState.initialDealerForSession === null) {
        log(1, `[startNewHand] Setting initial dealer for session: ${updatedState.dealer}`);
        updatedState.initialDealerForSession = updatedState.dealer;
    } else {
        log(1, `[startNewHand] Rotated dealer to ${updatedState.dealer}`);
    }

    // Set current player to the player to the left of the dealer
    const currentPlayerIndex = (nextDealerIndex + 1) % updatedState.playerOrder.length;
    updatedState.currentPlayer = updatedState.playerOrder[currentPlayerIndex];
    
    // Create and shuffle a new deck
    updatedState.deck = createDeck();
    shuffleDeck(updatedState.deck);

    // Reset hand-specific state
    updatedState.tricks = [];
    updatedState.currentTrick = [];
    updatedState.trickLeader = null;
    updatedState.kitty = [];
    updatedState.upCard = null;
    updatedState.trumpSuit = null;
    updatedState.orderUpRound = 1;
    updatedState.makerTeam = null;
    updatedState.playerWhoCalledTrump = null;
    updatedState.goingAlone = false;
    updatedState.playerGoingAlone = null;
    updatedState.partnerSittingOut = null;
    updatedState.currentPhase = GAME_PHASES.DEALING;
    
    // Reset player-specific state
    updatedState.playerOrder.forEach(playerRole => {
        updatedState.players[playerRole] = {
            ...updatedState.players[playerRole],
            hand: [],
            tricksWon: 0,
            isDealer: playerRole === updatedState.dealer,
            isCurrentPlayer: playerRole === updatedState.currentPlayer
        };
    });
    
    log(1, `[startNewHand] New hand started. Dealer: ${updatedState.dealer}, First player: ${updatedState.currentPlayer}`);
    return updatedState;
}

/**
 * Deals cards to all players
 * @param {Object} gameState - Current game state
 * @returns {Object} Updated game state with cards dealt
 */
export function dealCards(gameState) {
    log(1, '[dealCards] Dealing cards to players');
    
    // Create a deep copy of the game state
    const updatedState = JSON.parse(JSON.stringify(gameState));
    
    // Deal 5 cards to each player (2-3-2 pattern for 4 players)
    const dealOrder = [];
    let currentPlayerIndex = updatedState.playerOrder.indexOf(updatedState.currentPlayer);
    
    // Generate deal order (left of dealer first, then around the table)
    for (let i = 0; i < 4; i++) {
        dealOrder.push(updatedState.playerOrder[currentPlayerIndex]);
        currentPlayerIndex = (currentPlayerIndex + 1) % 4;
    }
    
    // Deal cards in 2-3-2 pattern
    const cardsPerPlayer = 5;
    const dealPattern = [2, 3, 2];
    
    dealPattern.forEach((cardsToDeal, round) => {
        dealOrder.forEach(playerRole => {
            for (let i = 0; i < cardsToDeal; i++) {
                if (updatedState.deck.length === 0) {
                    log(2, '[dealCards] Warning: Ran out of cards while dealing');
                    break;
                }
                const card = updatedState.deck.pop();
                updatedState.players[playerRole].hand.push(card);
            }
        });
    });
    
    // Set the up card (top card of the remaining deck)
    updatedState.upCard = updatedState.deck.pop();
    updatedState.kitty = [...updatedState.deck];
    updatedState.deck = []; // Clear the deck after dealing
    
    log(1, `[dealCards] Dealt cards. Up card: ${JSON.stringify(updatedState.upCard)}`);
    updatedState.currentPhase = GAME_PHASES.ORDER_UP_ROUND1;
    
    return updatedState;
}
