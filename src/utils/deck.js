import { SUITS, VALUES } from '../config/constants.js';
import { log, currentDebugLevel } from './logger.js';

/**
 * Creates a new deck of cards
 * @returns {Array} A new deck of cards
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
 * Shuffles a deck of cards using the Fisher-Yates algorithm
 * @param {Array} deck - The deck to shuffle
 * @returns {Array} The shuffled deck
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
 * Converts a card object to a string representation
 * @param {Object} card - The card to convert
 * @returns {string} String representation of the card
 */
export function cardToString(card) {
    if (!card) return 'No card';
    return `${card.value} of ${card.suit}`;
}

/**
 * Checks if a card is the right bower (Jack of trump suit)
 * @param {Object} card - The card to check
 * @param {string} trumpSuit - The current trump suit
 * @returns {boolean} True if the card is the right bower
 */
export function isRightBower(card, trumpSuit) {
    return card && 
           card.value === 'J' && 
           card.suit === trumpSuit;
}

/**
 * Checks if a card is the left bower (Jack of same color as trump)
 * @param {Object} card - The card to check
 * @param {string} trumpSuit - The current trump suit
 * @returns {boolean} True if the card is the left bower
 */
export function isLeftBower(card, trumpSuit) {
    if (!card || card.value !== 'J') return false;
    
    // Define card color mappings
    const suitColors = {
        'hearts': 'red',
        'diamonds': 'red',
        'clubs': 'black',
        'spades': 'black'
    };
    
    const trumpColor = suitColors[trumpSuit];
    const cardColor = suitColors[card.suit];
    
    return cardColor === trumpColor && 
           card.suit !== trumpSuit;
}
