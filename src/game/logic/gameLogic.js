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
    return card && card.value === 'J' && card.suit === trumpSuit;
}

/**
 * Check if a card is the left bower
 * @param {Object} card - Card to check
 * @param {string} trumpSuit - Current trump suit
 * @returns {boolean} True if left bower
 */
export function isLeftBower(card, trumpSuit) {
    if (!card || card.value !== 'J') return false;
    
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
    
    // Right bower (jack of trump suit)
    if (isRightBower(card, trumpSuit)) return 100;
    
    // Left bower (jack of same color as trump)
    if (isLeftBower(card, trumpSuit)) return 90;
    
    // Other trump cards
    if (card.suit === trumpSuit) {
        const trumpValues = { 'A': 85, 'K': 80, 'Q': 75, 'J': 70, '10': 65, '9': 60 };
        return trumpValues[card.value] || 55;
    }
    
    // Led suit cards (if any)
    if (card.suit === ledSuit) {
        const ledValues = { 'A': 30, 'K': 25, 'Q': 20, 'J': 15, '10': 10, '9': 5 };
        return ledValues[card.value] || 0;
    }
    
    // Off-suit cards have no rank
    return 0;
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
