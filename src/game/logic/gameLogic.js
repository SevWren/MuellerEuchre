/**
 * Core game logic functions for Euchre
 */

/**
 * Get the next player in turn order
 * @param {string} currentPlayerRole - Current player's role
 * @param {string[]} [playerOrder] - Optional custom player order
 * @param {boolean} [goingAlone] - Whether someone is going alone
 * @param {string} [playerGoingAlone] - Role of player going alone
 * @param {string} [partnerSittingOut] - Role of partner sitting out
 * @returns {string} Next player's role
 */
export function getNextPlayer(currentPlayerRole, playerOrder = ['south', 'west', 'north', 'east'], goingAlone = false, playerGoingAlone = null, partnerSittingOut = null) {
    const currentIndex = playerOrder.indexOf(currentPlayerRole);
    if (currentIndex === -1) return undefined;
    
    let nextIndex = (currentIndex + 1) % playerOrder.length;
    
    // If someone is going alone and we're about to return their partner, skip to next
    if (goingAlone && playerGoingAlone && playerOrder[nextIndex] === partnerSittingOut) {
        nextIndex = (nextIndex + 1) % playerOrder.length;
    }
    
    return playerOrder[nextIndex];
}

/**
 * Get a player's partner
 * @param {string} playerRole - Player's role
 * @returns {string} Partner's role or undefined if invalid
 */
export function getPartner(playerRole) {
    const partners = {
        'north': 'south',
        'south': 'north',
        'east': 'west',
        'west': 'east'
    };
    return partners[playerRole];
}

/**
 * Convert a card object to a string
 * @param {Object} card - Card object
 * @returns {string} Formatted card string
 */
export function cardToString(card) {
    if (!card) return 'N/A';
    if (!card.value || !card.suit) return 'Unknown Card';
    return `${card.value} of ${card.suit}`;
}

/**
 * Sort a hand of cards with trump suit first
 * @param {Array} hand - Array of card objects
 * @param {string} trumpSuit - Current trump suit
 * @returns {Array} Sorted hand
 */
export function sortHand(hand, trumpSuit) {
    if (!hand || !Array.isArray(hand)) return [];
    if (hand.length === 0) return [];

    // Make a copy to avoid mutating the original
    const sortedHand = [...hand];
    
    // Define suit order: trump first, then others
    const suitOrder = [trumpSuit];
    const otherSuits = ['hearts', 'diamonds', 'clubs', 'spades']
        .filter(s => s !== trumpSuit);
    suitOrder.push(...otherSuits);
    
    // Define value order (high to low)
    const valueOrder = ['J', 'A', 'K', 'Q', '10', '9'];
    
    return sortedHand.sort((a, b) => {
        // Handle right bower (jack of trump suit)
        if (a.value === 'J' && a.suit === trumpSuit) return -1;
        if (b.value === 'J' && b.suit === trumpSuit) return 1;
        
        // Handle left bower (jack of same color as trump)
        const leftBowerSuits = {
            'hearts': 'diamonds',
            'diamonds': 'hearts',
            'clubs': 'spades',
            'spades': 'clubs'
        };
        const leftBowerSuit = leftBowerSuits[trumpSuit];
        
        if (a.value === 'J' && a.suit === leftBowerSuit) return -2;
        if (b.value === 'J' && b.suit === leftBowerSuit) return 2;
        
        // Sort by suit first (trump first, then others)
        const suitA = suitOrder.indexOf(a.suit);
        const suitB = suitOrder.indexOf(b.suit);
        
        if (suitA !== suitB) return suitA - suitB;
        
        // Same suit, sort by value (high to low)
        const valueA = valueOrder.indexOf(a.value);
        const valueB = valueOrder.indexOf(b.value);
        
        return valueA - valueB;
    });
}

/**
 * Check if a card is the right bower
 * @param {Object} card - Card to check
 * @param {string} trumpSuit - Current trump suit
 * @returns {boolean} True if right bower
 */
export function isRightBower(card, trumpSuit) {
    return card && (card.value === 'J' || card.rank === 'J') && card.suit === trumpSuit;
}

/**
 * Check if a card is the left bower
 * @param {Object} card - Card to check
 * @param {string} trumpSuit - Current trump suit
 * @returns {boolean} True if left bower
 */
export function isLeftBower(card, trumpSuit) {
    if (!card || (card.value !== 'J' && card.rank !== 'J')) return false;
    
    const leftBowerSuits = {
        'hearts': 'diamonds',
        'diamonds': 'hearts',
        'clubs': 'spades',
        'spades': 'clubs'
    };
    
    return card.suit === leftBowerSuits[trumpSuit];
}

/**
 * Get the rank of a card for comparison
 * @param {Object} card - Card to get rank for
 * @param {string} ledSuit - Suit that was led
 * @param {string} trumpSuit - Current trump suit
 * @returns {number} Card rank
 */
export function getCardRank(card, ledSuit, trumpSuit) {
    if (!card) return -1;
    
    // Handle right bower (jack of trump suit)
    if (card.rank === 'J' && card.suit === trumpSuit) {
        return 1000; // Highest rank
    }
    
    // Handle left bower (jack of same color as trump suit)
    if (isLeftBower(card, trumpSuit)) {
        return 900; // Second highest rank
    }
    
    // If the card is a jack of the same color as trump but not the left bower
    // (this can happen if the trump suit is not a jack)
    const sameColorSuits = {
        'hearts': 'diamonds',
        'diamonds': 'hearts',
        'clubs': 'spades',
        'spades': 'clubs'
    };
    
    if (card.rank === 'J' && sameColorSuits[card.suit] === trumpSuit) {
        return 0; // Not a left bower, so it's just a normal card
    }
    
    // Handle trump cards (excluding bowers which are handled above)
    if (card.suit === trumpSuit) {
        // For trump cards, use this ranking (highest to lowest):
        // Right Bower (handled above) > Left Bower (handled above) > A > K > Q > 10 > 9
        if (card.rank === 'A') {
            return 800; // Ace is the highest non-bower trump
        }
        const trumpValues = { 'K': 70, 'Q': 60, '10': 50, '9': 40 };
        return trumpValues[card.rank] || 0;
    }
    
    // Handle led suit cards (non-trump)
    if (card.suit === ledSuit && ledSuit !== trumpSuit) {
        // For non-trump cards of the led suit, use their face value
        const ledSuitValues = { 'A': 500, 'K': 400, 'Q': 300, 'J': 200, '10': 100, '9': 50 };
        return ledSuitValues[card.rank] || 10;
    }
    
    // Handle led suit cards when led suit is the same as trump
    if (card.suit === ledSuit) {
        // For cards of the led suit that's also trump, they should already be handled by the trump case above
        // This is just a fallback
        const ledSuitValues = { 'A': 200, 'K': 50, 'Q': 40, 'J': 30, '10': 20, '9': 10 };
        return ledSuitValues[card.rank] || 0;
    }
    
    // If this is the left bower's suit (same color as trump), treat as non-trump, non-led
    const leftBowerSuit = getLeftBowerSuit(trumpSuit);
    if (card.suit === leftBowerSuit) {
        // For the left bower's suit (when not the left bower itself), treat as lowest priority
        const offSuitValues = { 'A': 25, 'K': 20, 'Q': 15, 'J': 10, '10': 5, '9': 1 };
        return offSuitValues[card.rank] || 0;
    }
    
    // Non-trump, non-led suit cards have no value in this trick
    return 0;
    
    // Off-suit cards - lowest rank, but still need to be comparable
    const offSuitValues = { 'A': 25, 'K': 20, 'Q': 15, 'J': 10, '10': 5, '9': 1 };
    return offSuitValues[card.rank] || 0;
}

/**
 * Get the suit that would be the left bower for the given trump suit
 * @param {string} trumpSuit - The current trump suit
 * @returns {string} The suit of the left bower
 */
function getLeftBowerSuit(trumpSuit) {
    const leftBowerSuits = {
        'hearts': 'diamonds',
        'diamonds': 'hearts',
        'clubs': 'spades',
        'spades': 'clubs'
    };
    return leftBowerSuits[trumpSuit] || '';
}

/**
 * Get the color of a suit
 * @param {string} suit - Suit to get color for
 * @returns {string} 'red' or 'black'
 */
export function getSuitColor(suit) {
    const redSuits = ['hearts', 'diamonds'];
    const blackSuits = ['clubs', 'spades'];
    
    if (redSuits.includes(suit)) return 'red';
    if (blackSuits.includes(suit)) return 'black';
    return 'black'; // default
}
