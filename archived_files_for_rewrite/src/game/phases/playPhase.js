import { GAME_PHASES } from '../../config/constants.js';
import { log } from '../../utils/logger.js';
import { getNextPlayer, isTeammate } from '../../utils/players.js';
import { getCardValue, isLeftBower, isRightBower } from '../../client/utils/cardUtils.js';
import { getCardRank } from '../logic/gameLogic.js';

/**
 * Handles a player playing a card during the trick
 * @param {Object} gameState - Current game state
 * @param {string} playerRole - Role of the player playing the card
 * @param {Object} card - The card being played
 * @returns {Object} Updated game state
 */
export function handlePlayCard(gameState, playerRole, card) {
    log(1, `[handlePlayCard] ${playerRole} playing ${card.rank} of ${card.suit}`);
    
    // Create a deep copy of the game state
    const updatedState = JSON.parse(JSON.stringify(gameState));
    
    // Get the led suit before the card is played
    const ledSuit = getLedSuit(updatedState);
    
    // Validate the play
    validatePlay(updatedState, playerRole, card, ledSuit);
    
    // Remove card from player's hand
    const cardIndex = updatedState.players[playerRole].hand.findIndex(c => 
        c.rank === card.rank && c.suit === card.suit
    );
    if (cardIndex === -1) {
        throw new Error('Card not found in player\'s hand');
    }
    const playedCard = updatedState.players[playerRole].hand.splice(cardIndex, 1)[0];
    
    // Add to current trick
    if (!updatedState.currentTrick) {
        updatedState.currentTrick = [];
    }
    
    const trickPlay = {
        player: playerRole,
        card: playedCard
    };
    
    updatedState.currentTrick.push(trickPlay);
    
    // Add game message
    updatedState.messages = updatedState.messages || [];
    updatedState.messages.push({
        type: 'play',
        player: playerRole,
        card: playedCard,
        text: `${playerRole} plays ${cardToString(playedCard)}`
    });
    
    // Check if trick is complete
    const playersInHand = getActivePlayers(updatedState);
    if (updatedState.currentTrick.length >= playersInHand.length) {
        return completeTrick(updatedState);
    }
    
    // Move to next player
    updatedState.currentPlayer = getNextActivePlayer(updatedState, playerRole);
    
    return updatedState;
}

/**
 * Completes the current trick and updates the game state
 * @private
 * @param {Object} gameState - Current game state
 * @returns {Object} Updated game state
 */
function completeTrick(gameState) {
    // Create a new object to avoid mutating the original state
    const updatedState = JSON.parse(JSON.stringify(gameState));
    
    const trickWinner = determineTrickWinner(updatedState);
    console.log('completeTrick - determined winner:', trickWinner);
    console.log('completeTrick - currentTrick:', JSON.stringify(updatedState.currentTrick, null, 2));
    
    const winningTeam = getTeamForPlayer(trickWinner);
    
    // Update trick count for the winning team
    updatedState.tricks = updatedState.tricks || [];
    const newTrick = {
        winner: trickWinner,
        team: winningTeam,
        cards: [...updatedState.currentTrick]
    };
    console.log('completeTrick - new trick being added:', JSON.stringify(newTrick, null, 2));
    updatedState.tricks.push(newTrick);
    
    // Clear the current trick
    updatedState.currentTrick = [];
    
    // Add game message
    updatedState.messages = updatedState.messages || [];
    updatedState.messages.push({
        type: 'trick',
        winner: trickWinner,
        team: winningTeam,
        text: `${trickWinner} wins the trick for Team ${winningTeam}!`,
        important: true
    });
    
    // Set the current player to the trick winner for the next trick
    updatedState.currentPlayer = trickWinner;
    updatedState.trickLeader = trickWinner;
    
    // Check for end of hand
    const allPlayersOutOfCards = Object.values(updatedState.players).every(
        player => !player.hand || player.hand.length === 0
    );
    
    if (allPlayersOutOfCards) {
        // End of hand - score it
        updatedState.currentPhase = GAME_PHASES.SCORING;
        // The scoring module will handle the rest
    } else {
        // Start new trick
        updatedState.currentTrick = [];
        
        updatedState.messages.push({
            type: 'game',
            text: `${trickWinner} leads the next trick.`
        });
    }
    
    return updatedState;
}

/**
 * Determines the winner of the current trick
 * @private
 * @param {Object} gameState - Current game state
 * @returns {string} Role of the winning player
 */
function determineTrickWinner(gameState) {
    const { trumpSuit, currentTrick } = gameState;
    
    if (!currentTrick || currentTrick.length === 0) {
        throw new Error('No cards in current trick');
    }
    
    // Determine the led suit (suit of the first card played, accounting for left bower)
    const ledCard = currentTrick[0].card;
    let ledSuit = ledCard.suit;
    
    // If the led card is the left bower, the led suit is trump
    if (isLeftBower(ledCard, trumpSuit)) {
        ledSuit = trumpSuit;
    } else if (ledCard.suit === trumpSuit) {
        // If the led card is a trump card, the led suit is trump
        ledSuit = trumpSuit;
    } else if (ledCard.suit === getSameColorSuit(trumpSuit) && ledCard.rank === 'J') {
        // If the led card is the left bower (jack of same color as trump), the led suit is trump
        ledSuit = trumpSuit;
    }
    
    console.log('\n=== Determining Trick Winner ===');
    console.log(`Trump Suit: ${trumpSuit}, Led Suit: ${ledSuit}`);
    
    // Helper function to get the same color suit
    function getSameColorSuit(suit) {
        const sameColorSuits = {
            'hearts': 'diamonds',
            'diamonds': 'hearts',
            'clubs': 'spades',
            'spades': 'clubs'
        };
        return sameColorSuits[suit];
    }
    
    // Find the winning card
    let winningCard = currentTrick[0];
    let winningRank = getCardRank(winningCard.card, ledSuit, trumpSuit);
    console.log(`\n=== Card Rankings ===`);
    console.log(`Initial winning card: ${cardToString(winningCard.card)} (${winningRank}) played by ${winningCard.player}`);
    console.log(`  - isRightBower: ${isRightBower(winningCard.card, trumpSuit)}`);
    console.log(`  - isLeftBower: ${isLeftBower(winningCard.card, trumpSuit)}`);
    console.log(`  - suit: ${winningCard.card.suit}, rank: ${winningCard.card.rank}`);
    
    // Start from the second card (index 1) since we already have the first card as the initial winner
    for (let i = 1; i < currentTrick.length; i++) {
        const currentCard = currentTrick[i];
        const currentRank = getCardRank(currentCard.card, ledSuit, trumpSuit);
        console.log(`\nComparing to: ${cardToString(currentCard.card)} (${currentRank}) played by ${currentCard.player}`);
        console.log(`  - isRightBower: ${isRightBower(currentCard.card, trumpSuit)}`);
        console.log(`  - isLeftBower: ${isLeftBower(currentCard.card, trumpSuit)}`);
        console.log(`  - suit: ${currentCard.card.suit}, rank: ${currentCard.card.rank}`);
        console.log(`Current winner: ${winningCard.player} with ${cardToString(winningCard.card)} (${winningRank})`);
        
        // Only update the winner if the current card has a higher rank
        // If ranks are equal, the first card played (earlier in the trick) wins
        if (currentRank > winningRank) {
            console.log(`  => NEW WINNER: ${currentCard.player} with ${cardToString(currentCard.card)} (${currentRank} > ${winningRank})`);
            winningCard = currentCard;
            winningRank = currentRank;
        } else {
            console.log(`  => KEEP WINNER: ${winningCard.player} with ${cardToString(winningCard.card)} (${winningRank} >= ${currentRank})`);
        }
    }
    
    return winningCard.player;
}

/**
 * Validates if a card play is legal
 * @private
 * @param {Object} gameState - Current game state
 * @param {string} playerRole - Role of the player
 * @param {Object} card - Card being played
 * @param {string} [ledSuit] - The currently led suit (if any)
 * @throws {Error} If the play is invalid
 */
function validatePlay(gameState, playerRole, card, ledSuit) {
    // Check if it's the player's turn
    if (gameState.currentPlayer !== playerRole) {
        throw new Error(`Not ${playerRole}'s turn to play`);
    }
    
    // Check if game is in playing phase
    if (gameState.currentPhase !== GAME_PHASES.PLAYING) {
        throw new Error('Cannot play card in current phase');
    }
    
    // Check if player has the card
    const playerHand = gameState.players[playerRole].hand || [];
    const hasCard = playerHand.some(c => 
        c.rank === card.rank && c.suit === card.suit
    );
    
    if (!hasCard) {
        throw new Error('Card not in player\'s hand');
    }
    
    // If not the first player in the trick, must follow suit if possible
    if (gameState.currentTrick && gameState.currentTrick.length > 0) {
        const playerHand = gameState.players[playerRole].hand;
        
        // Check if player has a card of the led suit
        const hasLedSuit = playerHand.some(c => {
            // Handle left bower as trump
            if (isLeftBower(c, gameState.trumpSuit)) {
                return ledSuit === gameState.trumpSuit;
            }
            return c.suit === ledSuit;
        });
        
        // Get the effective suit of the played card
        const playedSuit = isLeftBower(card, gameState.trumpSuit) 
            ? gameState.trumpSuit 
            : card.suit;
            
        // Player must follow suit if they can
        if (hasLedSuit) {
            // If they played a trump card, it's always valid
            if (playedSuit === gameState.trumpSuit) {
                return;
            }
            // Otherwise, must follow the led suit
            if (playedSuit !== ledSuit) {
                throw new Error(`Must follow suit (${ledSuit})`);
            }
        }
    }
}

/**
 * Gets the effective led suit for the current trick
 * @private
 * @param {Object} gameState - Current game state
 * @returns {string} The led suit
 */
function getLedSuit(gameState) {
    if (!gameState.currentTrick || gameState.currentTrick.length === 0) {
        return null;
    }
    
    const ledCard = gameState.currentTrick[0].card;
    
    // Left bower counts as trump
    if (isLeftBower(ledCard, gameState.trumpSuit)) {
        return gameState.trumpSuit;
    }
    
    return ledCard.suit;
}

/**
 * Gets the next active player (skips sitting out players in "go alone")
 * @private
 * @param {Object} gameState - Current game state
 * @param {string} currentPlayer - Current player role
 * @returns {string} Next active player role
 */
function getNextActivePlayer(gameState, currentPlayer) {
    let nextPlayer = getNextPlayer(currentPlayer, gameState.playerOrder);
    
    // Skip players who are sitting out
    while (nextPlayer === gameState.partnerSittingOut) {
        nextPlayer = getNextPlayer(nextPlayer, gameState.playerOrder);
    }
    
    return nextPlayer;
}

/**
 * Gets all active players in the current hand
 * @private
 * @param {Object} gameState - Current game state
 * @returns {string[]} Array of active player roles
 */
function getActivePlayers(gameState) {
    if (!gameState.goingAlone) {
        return [...gameState.playerOrder];
    }
    
    // In "go alone", skip the sitting out partner
    return gameState.playerOrder.filter(
        player => player !== gameState.partnerSittingOut
    );
}

/**
 * Helper function to get a player's team
 * @private
 * @param {string} playerRole - The player's role
 * @returns {string} The team name
 */
function getTeamForPlayer(playerRole) {
    return ['north', 'south'].includes(playerRole) ? 'north+south' : 'east+west';
}

/**
 * Converts a card to a string representation
 * @private
 * @param {Object} card - The card to convert
 * @returns {string} String representation of the card
 */
function cardToString(card) {
    return `${card.rank} of ${card.suit}`;
}
