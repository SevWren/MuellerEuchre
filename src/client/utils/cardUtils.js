/**
 * Sorts a player's hand by card value
 * @param {Array} hand - The player's hand to sort
 * @param {string} trumpSuit - The current trump suit
 * @param {string} [ledSuit] - Optional: the suit that was led in the current trick
 * @returns {Array} - The sorted hand
 */
export const sortHand = (hand, trumpSuit, ledSuit) => {
  if (!Array.isArray(hand) || hand.length === 0) return [];
  
  // Create a copy of the hand to avoid mutating the original
  return [...hand].sort((a, b) => {
    const valueA = getCardValue(a, trumpSuit, ledSuit);
    const valueB = getCardValue(b, trumpSuit, ledSuit);
    return valueB - valueA; // Sort in descending order (highest value first)
  });
};

/**
 * Get the numeric value of a card for sorting and comparison
 * @param {Object} card - The card object with rank and suit
 * @param {string} trumpSuit - The current trump suit
 * @returns {number} - Numeric value of the card
 */
export const getCardValue = (card, trumpSuit) => {
    if (!card || !card.rank || !card.suit) return 0;
    
    const isTrump = card.suit === trumpSuit || isLeftBower(card, trumpSuit);
    const isRightBower = card.rank === 'J' && card.suit === trumpSuit;
    const isLeftBowerCard = isLeftBower(card, trumpSuit);
    
    // Special handling for bowers (highest trumps)
    if (isRightBower) return 100; // Right bower is highest
    if (isLeftBowerCard) return 99;  // Left bower is second highest
    
    // Other trump cards
    if (isTrump) {
        const trumpValues = {
            'A': 14,
            'K': 13,
            'Q': 12,
            'J': 11,
            '10': 10,
            '9': 9
        };
        return 40 + (trumpValues[card.rank] || 0);
    }
    
    // Non-trump cards
    const nonTrumpValues = {
        'A': 14,
        'K': 13,
        'Q': 12,
        'J': 11,
        '10': 10,
        '9': 9
    };
    
    return nonTrumpValues[card.rank] || 0;
};

/**
 * Check if a card is the left bower (jack of the same color as trump)
 * @param {Object} card - The card to check
 * @param {string} trumpSuit - The current trump suit
 * @returns {boolean} - True if the card is the left bower
 */
export const isLeftBower = (card, trumpSuit) => {
    if (!card || !trumpSuit) return false;
    
    // Left bower is the jack of the same color as trump
    if (card.rank === 'J') {
        const sameColorSuits = {
            'hearts': 'diamonds',
            'diamonds': 'hearts',
            'clubs': 'spades',
            'spades': 'clubs'
        };
        
        return sameColorSuits[card.suit] === trumpSuit;
    }
    
    return false;
};

/**
 * Check if a card is a valid play based on the current trick
 * @param {Object} card - The card being played
 * @param {Array} hand - The player's current hand
 * @param {string} ledSuit - The suit that was led in the current trick
 * @param {string} trumpSuit - The current trump suit
 * @returns {boolean} - True if the play is valid
 */
export const isValidPlay = (card, hand, ledSuit, trumpSuit) => {
    if (!card || !hand || !hand.length) return false;
    
    // If no suit has been led yet, any card is valid
    if (!ledSuit) return true;
    
    // Check if player has any cards of the led suit (including left bower)
    const hasLedSuit = hand.some(c => {
        if (isLeftBower(c, trumpSuit)) {
            return ledSuit === trumpSuit;
        }
        return c.suit === ledSuit;
    });
    
    // If player doesn't have the led suit, any card is valid
    if (!hasLedSuit) return true;
    
    // If player has the led suit, they must follow suit
    if (isLeftBower(card, trumpSuit)) {
        return ledSuit === trumpSuit;
    }
    
    return card.suit === ledSuit;
};

/**
 * Determine the winning card of a trick
 * @param {Array} trick - Array of cards played in the trick
 * @param {string} trumpSuit - The current trump suit
 * @param {string} ledSuit - The suit that was led in the trick
 * @returns {number} - Index of the winning card in the trick array
 */
export const getWinningCardIndex = (trick, trumpSuit, ledSuit) => {
    if (!trick || !trick.length) return -1;
    
    // Find the highest card that follows the led suit or is trump
    let highestCard = null;
    let highestIndex = -1;
    
    trick.forEach((card, index) => {
        if (!card) return;
        
        const isTrump = card.suit === trumpSuit || isLeftBower(card, trumpSuit);
        const isLedSuit = card.suit === ledSuit || 
                         (isLeftBower(card, trumpSuit) && ledSuit === trumpSuit);
        
        // First card is always eligible
        if (highestIndex === -1) {
            highestCard = card;
            highestIndex = index;
            return;
        }
        
        const currentIsTrump = highestCard.suit === trumpSuit || 
                             isLeftBower(highestCard, trumpSuit);
        const currentIsLedSuit = highestCard.suit === ledSuit || 
                               (isLeftBower(highestCard, trumpSuit) && ledSuit === trumpSuit);
        
        // Trump beats non-trump
        if (isTrump && !currentIsTrump) {
            highestCard = card;
            highestIndex = index;
            return;
        }
        
        // If both are trump or both follow suit, compare values
        if ((isTrump && currentIsTrump) || (isLedSuit && currentIsLedSuit)) {
            const currentValue = getCardValue(highestCard, trumpSuit);
            const newValue = getCardValue(card, trumpSuit);
            
            if (newValue > currentValue) {
                highestCard = card;
                highestIndex = index;
            }
        }
    });
    
    return highestIndex;
};

/**
 * Create a standard deck of 24 Euchre cards (9-Ace of each suit)
 * @returns {Array} - Array of card objects
 */
export const createDeck = () => {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks = ['9', '10', 'J', 'Q', 'K', 'A'];
    const deck = [];
    
    let id = 0;
    suits.forEach(suit => {
        ranks.forEach(rank => {
            deck.push({
                id: id++,
                rank,
                suit,
                code: `${rank[0].toUpperCase()}${suit[0].toUpperCase()}`
            });
        });
    });
    
    return deck;
};

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - The array to shuffle
 * @returns {Array} - The shuffled array
 */
export const shuffleDeck = (array) => {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
};

/**
 * Deal cards to players
 * @param {Array} deck - The deck to deal from
 * @param {number} numPlayers - Number of players to deal to
 * @param {number} cardsPerPlayer - Number of cards per player
 * @returns {Object} - Object containing hands and remaining deck
 */
export const dealCards = (deck, numPlayers, cardsPerPlayer) => {
    const hands = Array(numPlayers).fill().map(() => []);
    const newDeck = [...deck];
    
    for (let i = 0; i < cardsPerPlayer; i++) {
        for (let j = 0; j < numPlayers; j++) {
            if (newDeck.length > 0) {
                hands[j].push(newDeck.pop());
            }
        }
    }
    
    return {
        hands,
        remainingDeck: newDeck
    };
};
