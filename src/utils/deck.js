/**
 * @module utils/deck
 * @description Utility functions for managing and evaluating cards in a Euchre game
 */

import { SUITS, VALUES } from '../config/constants.js';
import { log, currentDebugLevel } from './logger.js';

/**
 * Creates a new standard 24-card Euchre deck (9, 10, J, Q, K, A of each suit)
 * @returns {Array<Object>} A new array of card objects, each with `suit` and `value` properties
 * @example
 * const deck = createDeck();
 * // Returns: [{suit: 'hearts', value: '9'}, {suit: 'hearts', value: '10'}, ...]
 */
export function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const value of VALUES) {
            deck.push({ suit, value });
        }
    }
    log(currentDebugLevel, 'Created a new deck');
    return deck;
}

/**
 * Shuffles a deck of cards in-place using the Fisher-Yates algorithm
 * @param {Array<Object>} deck - The deck to shuffle
 * @returns {Array<Object>} The shuffled deck (same reference as input)
 * @example
 * const shuffled = shuffleDeck(createDeck());
 */
export function shuffleDeck(deck) {
    const shuffledDeck = [...deck];
    for (let i = shuffledDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledDeck[i], shuffledDeck[j]] = [shuffledDeck[j], shuffledDeck[i]];
    }
    log(currentDebugLevel, 'Deck shuffled');
    return shuffledDeck;
}

/**
 * Converts a card object to a human-readable string representation
 * @param {Object} card - The card to convert
 * @param {string} [card.suit] - The card's suit (e.g., 'hearts', 'diamonds')
 * @param {string} [card.value] - The card's value (e.g., 'A', 'K', 'Q', 'J', '10', '9')
 * @returns {string} String representation of the card (e.g., 'Ace of Spades')
 * @example
 * cardToString({ suit: 'hearts', value: 'A' }); // Returns: 'A of hearts'
 */
export function cardToString(card) {
    if (!card) return 'No card';
    return `${card.value} of ${card.suit}`;
}

/**
 * Determines if a card is the right bower (Jack of the trump suit)
 * @param {Object} card - The card to check
 * @param {string} card.suit - The card's suit
 * @param {string} card.value - The card's value
 * @param {string} trumpSuit - The current trump suit
 * @returns {boolean} True if the card is the right bower
 * @example
 * isRightBower({ suit: 'hearts', value: 'J' }, 'hearts'); // Returns: true
 */
export function isRightBower(card, trumpSuit) {
    return card && 
           card.value === 'J' && 
           card.suit === trumpSuit;
}

/**
 * Determines if a card is the left bower (Jack of the same color as trump)
 * @param {Object} card - The card to check
 * @param {string} card.suit - The card's suit
 * @param {string} card.value - The card's value
 * @param {string} trumpSuit - The current trump suit
 * @returns {boolean} True if the card is the left bower
 * @example
 * // If trump is 'hearts', the left bower is Jack of diamonds
 * isLeftBower({ suit: 'diamonds', value: 'J' }, 'hearts'); // Returns: true
 */
export function isLeftBower(card, trumpSuit) {
    // Check if card is a jack (using either rank or value)
    const isJack = card && (card.value === 'J' || card.rank === 'J');
    if (!isJack) return false;
    
    // Define card color mappings
    const suitColors = {
        'hearts': 'red',
        'diamonds': 'red',
        'clubs': 'black',
        'spades': 'black'
    };
    
    const trumpColor = suitColors[trumpSuit];
    const cardColor = suitColors[card.suit];
    
    // Card is a left bower if it's the same color as trump but a different suit
    return cardColor === trumpColor && 
           card.suit !== trumpSuit;
}

/**
 * Gets the relative rank of a card for comparison during play
 * @param {Object} card - The card to evaluate
 * @param {string} card.suit - The card's suit
 * @param {string} card.value - The card's value
 * @param {string} trumpSuit - The current trump suit
 * @param {string} [ledSuit=null] - The suit that was led (if any)
 * @returns {number} Numeric rank where higher numbers beat lower ones
 * @description
 * Card ranking follows standard Euchre rules:
 * - Right bower (J of trump): 15
 * - Left bower (J of same color): 14
 * - Other trump: J(13), A(12), K(11), Q(10), 10(9), 9(8)
 * - Led suit: A(7), K(6), Q(5), J(4), 10(3), 9(2)
 * - Other cards: 0 (cannot win the trick)
 * @example
 * // With hearts as trump and spades led
 * getCardRank({ suit: 'hearts', value: 'J' }, 'hearts', 'spades'); // Returns: 15 (right bower)
 * getCardRank({ suit: 'diamonds', value: 'J' }, 'hearts', 'spades'); // Returns: 14 (left bower)
 * getCardRank({ suit: 'spades', value: 'A' }, 'hearts', 'spades'); // Returns: 7 (led suit ace)
 */
export function getCardRank(card, trumpSuit, ledSuit = null) {
    if (!card) return -1;
    
    const isTrump = card.suit === trumpSuit || 
                  (card.value === 'J' && 
                   ((card.suit === 'hearts' && trumpSuit === 'diamonds') ||
                    (card.suit === 'diamonds' && trumpSuit === 'hearts') ||
                    (card.suit === 'clubs' && trumpSuit === 'spades') ||
                    (card.suit === 'spades' && trumpSuit === 'clubs')));
    
    const isLeftBowerCard = isLeftBower(card, trumpSuit);
    const isRightBowerCard = isRightBower(card, trumpSuit);
    
    // Right bower is highest
    if (isRightBowerCard) return 15;
    // Left bower is second highest
    if (isLeftBowerCard) return 14;
    
    // For non-trump cards, only consider the led suit if specified
    const effectiveSuit = ledSuit || card.suit;
    const isLedSuit = effectiveSuit === card.suit;
    
    // If it's a trump card (and not a bower)
    if (isTrump) {
        const trumpRanks = {
            'J': 13,
            'A': 12,
            'K': 11,
            'Q': 10,
            '10': 9,
            '9': 8
        };
        return trumpRanks[card.value] || 0;
    }
    
    // For non-trump cards
    if (isLedSuit) {
        const ledRanks = {
            'A': 7,
            'K': 6,
            'Q': 5,
            'J': 4,
            '10': 3,
            '9': 2
        };
        return ledRanks[card.value] || 0;
    }
    
    // Cards that don't follow suit and aren't trump
    return 0;
}
