import { GAME_PHASES } from '../../config/constants.js';
import { log } from '../../utils/logger.js';
import { getNextPlayer, isTeammate } from '../../utils/players.js';
import { getCardRank, isLeftBower, isRightBower } from '../../utils/cards.js';

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
    
    // Validate the play
    validatePlay(updatedState, playerRole, card);
    
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
    const trickWinner = determineTrickWinner(gameState);
    const winningTeam = getTeamForPlayer(trickWinner);
    
    // Update trick count for the winning team
    gameState.tricks = gameState.tricks || [];
    gameState.tricks.push({
        winner: trickWinner,
        team: winningTeam,
        cards: [...gameState.currentTrick]
    });
    
    // Add game message
    gameState.messages.push({
        type: 'trick',
        winner: trickWinner,
        team: winningTeam,
        text: `${trickWinner} wins the trick for Team ${winningTeam}!`,
        important: true
    });
    
    // Check for end of hand
    const allPlayersOutOfCards = Object.values(gameState.players).every(
        player => !player.hand || player.hand.length === 0
    );
    
    if (allPlayersOutOfCards) {
        // End of hand - score it
        gameState.currentPhase = GAME_PHASES.SCORING;
        // The scoring module will handle the rest
    } else {
        // Start new trick
        gameState.currentTrick = [];
        gameState.currentPlayer = trickWinner; // Trick winner leads next trick
        gameState.trickLeader = trickWinner;
        
        gameState.messages.push({
            type: 'game',
            text: `${trickWinner} leads the next trick.`
        });
    }
    
    return gameState;
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
    }
    
    // Find the winning card
    let winningCard = currentTrick[0];
    
    for (let i = 1; i < currentTrick.length; i++) {
        const currentCard = currentTrick[i];
        
        // Get ranks for comparison
        const winningRank = getCardRank(winningCard.card, ledSuit, trumpSuit);
        const currentRank = getCardRank(currentCard.card, ledSuit, trumpSuit);
        
        // If current card is higher rank, it's the new winner
        if (currentRank > winningRank) {
            winningCard = currentCard;
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
 * @throws {Error} If the play is invalid
 */
function validatePlay(gameState, playerRole, card) {
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
    
    // If not the first player in the trick, validate against led suit
    if (gameState.currentTrick && gameState.currentTrick.length > 0) {
        const ledSuit = getLedSuit(gameState);
        const hasLedSuit = playerHand.some(card => {
            if (isLeftBower(card, gameState.trumpSuit)) {
                return ledSuit === gameState.trumpSuit;
            }
            return card.suit === ledSuit;
        });
        
        if (hasLedSuit) {
            const playedSuit = isLeftBower(card, gameState.trumpSuit) 
                ? gameState.trumpSuit 
                : card.suit;
                
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
