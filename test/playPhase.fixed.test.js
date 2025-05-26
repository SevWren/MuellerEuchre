/**
 * @file playPhase.fixed.test.js - Fixed test for play phase functionality
 * @module PlayPhaseFixedTest
 * @description Test file for play phase functionality
 * @requires chai
 * @requires ../server3.mjs
 * @see ../src/game/phases/playPhase.js
 */

import { expect } from 'chai';

// Import the server module and other dependencies dynamically
let server3;
let handlePlayCard;

// Load the server module before tests
describe('Play Phase Fixed Test', function() {
    before(async function() {
        // Set a longer timeout for the before hook to allow for module loading
        this.timeout(10000);
        
        try {
            // Import the server module
            const serverModule = await import('../server3.mjs');
            server3 = serverModule;
            
            // Import the playPhase functions
            const playPhase = await import('../src/game/phases/playPhase.js');
            handlePlayCard = playPhase.handlePlayCard;
            
            // Initialize the game state
            server3.resetFullGame();
        } catch (error) {
            console.error('Failed to initialize test setup:', error);
            throw error;
        }
    });

    it('should complete trick when all players have played', function() {
        // Create a deep copy of the game state
        const gameState = JSON.parse(JSON.stringify(server3.gameState));
        
        // Set up players with specific cards that are in their hands
        const southCard = { suit: 'hearts', rank: 'A' };
        const westCard = { suit: 'clubs', rank: 'K' };
        const northCard = { suit: 'clubs', rank: 'Q' };
        const eastCard = { suit: 'hearts', rank: '10' };
        
        // Update player hands with cards that match exactly what will be played
        gameState.players = {
            ...gameState.players,
            south: { ...gameState.players.south, hand: [southCard] },
            west: { ...gameState.players.west, hand: [westCard] },
            north: { ...gameState.players.north, hand: [northCard] },
            east: { ...gameState.players.east, hand: [eastCard] }
        };
        
        // Set up game state
        gameState.currentTrick = [];
        gameState.playerOrder = ['south', 'west', 'north', 'east'];
        gameState.currentPlayer = 'south';
        gameState.currentPhase = 'PLAYING';
        gameState.tricks = [];
        gameState.trumpSuit = 'hearts'; // Explicitly set trump suit to hearts
        
        // Play the trick with proper state management
        let updatedState;
    
        // South plays first
        updatedState = handlePlayCard(
            JSON.parse(JSON.stringify(gameState)), 
            'south', 
            JSON.parse(JSON.stringify(southCard))
        );
        
        // West plays next with the updated state from south's play
        updatedState = handlePlayCard(
            JSON.parse(JSON.stringify(updatedState)), 
            'west', 
            JSON.parse(JSON.stringify(westCard))
        );
        
        // North plays next with the updated state from west's play
        updatedState = handlePlayCard(
            JSON.parse(JSON.stringify(updatedState)), 
            'north', 
            JSON.parse(JSON.stringify(northCard))
        );
        
        // East plays last - this should complete the trick
        updatedState = handlePlayCard(
            JSON.parse(JSON.stringify(updatedState)), 
            'east', 
            JSON.parse(JSON.stringify(eastCard))
        );
        
        // The trick should be completed and added to the tricks array
        expect(updatedState.tricks).to.have.lengthOf(1, 'Should have one completed trick');
        
        // Current trick should be cleared for the next trick
        expect(updatedState.currentTrick).to.have.lengthOf(0, 'Current trick should be cleared');
        
        // Log the trick winner for debugging
        console.log('Trick winner:', updatedState.tricks[0].winner);
        console.log('Trick cards:', updatedState.tricks[0].cards);
        
        // Verify the trick winner is correct based on game logic
        // The Ace of hearts (south) should beat the 10 of hearts (east)
        expect(updatedState.tricks[0].winner).to.equal('south', 'South should win with Ace of hearts');
        
        // Verify the next player is correctly set to the winner of the trick
        expect(updatedState.currentPlayer).to.equal('south', 'Next player should be the trick winner');
    });
});
