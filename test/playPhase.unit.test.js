import { expect } from 'chai';
import { handlePlayCard } from '../src/game/phases/playPhase.js';
import { GAME_PHASES, TEAMS } from '../src/config/constants.js';

/**
 * Helper function to create a deep copy of the game state
 * @param {Object} state - The game state to copy
 * @returns {Object} A deep copy of the game state
 */
function cloneGameState(state) {
    return JSON.parse(JSON.stringify(state));
}

/**
 * Helper function to simulate playing a complete trick
 * @param {Object} state - The current game state
 * @param {Array} plays - Array of {player, card} objects representing the plays in order
 * @returns {Object} The updated game state after the trick
 */
function playTrick(state, plays) {
    return plays.reduce((currentState, play) => 
        handlePlayCard(currentState, play.player, play.card), 
    cloneGameState(state));
}

describe('Play Phase', () => {
     let gameState;
      
     beforeEach(() => {
     // Setup a basic game state for testing
     /**
     * Sets up a fresh game state before each test case to ensure test isolation.
     * Initializes a standard Euchre game state with:
     * - Player order: North, East, South, West (clockwise)
     * - Dealer: South
     * - Current player: North (player to the dealer's left)
     * - Trump suit: hearts
     * - Maker team: North+South
     * - Player who called trump: North
     * - Trick leader: North (first to play in the first trick)
     * - Empty current trick and tricks array
     * - Pre-dealt hands for each player with known card distributions:
     *   - North: Right bower (J♥), Left bower (J♦), A♥, 10♣, Q♠
     *   - East: K♥, A♦, A♣, A♠, Q♥
     *   - South: 10♥, K♦, K♣, K♠, 9♥
     *   - West: Q♦, ... (remaining cards not shown in view)
     * 
     * This setup ensures consistent starting conditions for each test case
     * and includes a variety of card combinations to test different game scenarios.
     */          
          gameState = {
               playerOrder: ['north', 'east', 'south', 'west'],
               dealer: 'south',
               currentPlayer: 'north',
               currentPhase: GAME_PHASES.PLAYING,
               trumpSuit: 'hearts',
               makerTeam: 'north+south',
               playerWhoCalledTrump: 'north',
               trickLeader: 'north',
               currentTrick: [],
               tricks: [],
               players: {
                    north: { 
                         hand: [
                              { suit: 'hearts', rank: 'J' }, // Right bower (highest)
                              { suit: 'diamonds', rank: 'J' }, // Left bower (2nd highest)
                              { suit: 'hearts', rank: 'A' },
                              { suit: 'clubs', rank: '10' },
                              { suit: 'spades', rank: 'Q' }
                         ] 
                    },
                    east: { 
                         hand: [
                              { suit: 'hearts', rank: 'K' },
                              { suit: 'diamonds', rank: 'A' },
                              { suit: 'clubs', rank: 'A' },
                              { suit: 'spades', rank: 'A' },
                              { suit: 'hearts', rank: 'Q' }
                         ] 
                    },
                    south: { 
                         hand: [
                              { suit: 'hearts', rank: '10' },
                              { suit: 'diamonds', rank: 'K' },
                              { suit: 'clubs', rank: 'K' },
                              { suit: 'spades', rank: 'K' },
                              { suit: 'hearts', rank: '9' }
                         ] 
                    },
                    west: { 
                         hand: [
                              { suit: 'diamonds', rank: 'Q' },
                              { suit: 'diamonds', rank: '10' },
                              { suit: 'clubs', rank: 'Q' },
                              { suit: 'spades', rank: 'Q' },
                              { suit: 'clubs', rank: '9' }
                         ] 
                    }
               },
               messages: []
          };
     });

     describe('handlePlayCard', () => {
          /**
          * Test suite for the handlePlayCard function, which manages the core card playing
          * logic in the Euchre game. This suite verifies:
          * 
          * Core Game Mechanics:
          * - First card play in a trick
          * - Following suit requirements
          * - Trick completion and winner determination
          * - Proper player rotation
          * - Hand management (card removal after playing)
          * 
          * Trump Card Handling:
          * - Right bower (J of trump suit) as highest card
          * - Left bower (J of same color) as second highest
          * - Trump suit cards beating non-trump cards
          * 
          * Edge Cases:
          * - End of hand detection and phase transition to SCORING
          * - Validation of play rules (enforcing following suit)
          * - Proper trick winner calculation with mixed suits and trumps
          * 
          * Game State Updates:
          * - Current trick tracking
          * - Completed tricks history
          * - Player hand updates
          * - Game phase transitions
          * - Informative game messages
          * 
          * The tests use a standard Euchre setup with hearts as trump and North as the
          * player who called trump, ensuring consistent test conditions.
          */
          it('should handle first card of a trick', () => {
               const cardToPlay = { suit: 'clubs', rank: '10' };
               const result = handlePlayCard(gameState, 'north', cardToPlay);
               
               // Should update current trick
               expect(result.currentTrick).to.have.lengthOf(1);
               expect(result.currentTrick[0].card).to.deep.equal(cardToPlay);
               
               // Should remove card from player's hand
               expect(result.players.north.hand).to.have.lengthOf(4);
               expect(result.players.north.hand.some(c => 
                    c.suit === cardToPlay.suit && c.rank === cardToPlay.rank
               )).to.be.false;
               
               // Should update current player to next in rotation
               expect(result.currentPlayer).to.equal('east');
               
               // Should add message about the play
               expect(result.messages.some(m => 
                    m.type === 'play' && 
                    m.player === 'north' &&
                    m.text.includes('north plays 10 of clubs')
               )).to.be.true;
          });
          
          it('should complete a trick when all players have played', () => {
               // North leads
               let result = handlePlayCard(gameState, 'north', { suit: 'clubs', rank: '10' });
               // East follows suit
               result = handlePlayCard(result, 'east', { suit: 'clubs', rank: 'A' });
               // South follows suit
               result = handlePlayCard(result, 'south', { suit: 'clubs', rank: 'K' });
               // West follows suit
               result = handlePlayCard(result, 'west', { suit: 'clubs', rank: 'Q' });
               
               // Should have completed the trick
               expect(result.tricks).to.have.lengthOf(1);
               expect(result.currentTrick).to.have.lengthOf(0);
               
               // East should have won with the Ace of clubs
               expect(result.tricks[0].winner).to.equal('east');
               expect(result.tricks[0].team).to.equal('east+west');
               
               // Should have added message about trick completion
               expect(result.messages.some(m => 
                    m.type === 'trick' && 
                    m.winner === 'east' &&
                    m.text.includes('east wins the trick for Team east+west!')
               )).to.be.true;
               
               // Next trick should be led by the winner
               expect(result.currentPlayer).to.equal('east');
               expect(result.trickLeader).to.equal('east');
          });
          
          it('should handle trump cards correctly', () => {
               // North leads with non-trump
               let result = handlePlayCard(gameState, 'north', { suit: 'clubs', rank: '10' });
               // East plays a trump (hearts is trump)
               result = handlePlayCard(result, 'east', { suit: 'hearts', rank: 'K' });
               // South must follow suit (clubs)
               result = handlePlayCard(result, 'south', { suit: 'clubs', rank: 'K' });
               // West must follow suit (clubs)
               result = handlePlayCard(result, 'west', { suit: 'clubs', rank: 'Q' });
               
               // East should win with the trump
               expect(result.tricks[0].winner).to.equal('east');
          });
          
          it('should handle left bower as trump', () => {
               // North leads with left bower (diamonds J when hearts is trump)
               let result = handlePlayCard(gameState, 'north', { suit: 'diamonds', rank: 'J' });
               // East plays a trump (hearts is trump)
               result = handlePlayCard(result, 'east', { suit: 'hearts', rank: 'K' });
               
               // North's left bower should count as trump and win
               expect(result.currentTrick[0].card.suit).to.equal('diamonds');
               
               result = handlePlayCard(result, 'south', { suit: 'diamonds', rank: 'K' });
               result = handlePlayCard(result, 'west', { suit: 'diamonds', rank: 'Q' });
               
               // North should win with left bower (counts as trump)
               expect(result.tricks[0].winner).to.equal('north');
          });
          
          it('should enforce following suit with specific error message', () => {
               // North leads with clubs
               const result = handlePlayCard(gameState, 'north', { suit: 'clubs', rank: '10' });
               
               // East tries to play a spade but has clubs
               try {
                    handlePlayCard(result, 'east', { suit: 'spades', rank: 'A' });
                    expect.fail('Expected an error to be thrown');
               } catch (error) {
                    expect(error).to.be.an('Error');
                    expect(error.message).to.include('Must follow suit');
                    expect(error.message).to.include('east');
                    expect(error.message).to.include('clubs');
                    expect(error.message).to.include('spades');
               }
          });
          
          it('should handle end of hand', () => {
               // Simulate last trick
               gameState.players.north.hand = [{ suit: 'hearts', rank: 'J' }];
               gameState.players.east.hand = [{ suit: 'hearts', rank: 'K' }];
               gameState.players.south.hand = [{ suit: 'hearts', rank: '10' }];
               gameState.players.west.hand = [{ suit: 'hearts', rank: 'Q' }];
               
               // Play the last trick
               let result = handlePlayCard(gameState, 'north', { suit: 'hearts', rank: 'J' });
               result = handlePlayCard(result, 'east', { suit: 'hearts', rank: 'K' });
               result = handlePlayCard(result, 'south', { suit: 'hearts', rank: '10' });
               result = handlePlayCard(result, 'west', { suit: 'hearts', rank: 'Q' });
               
               // Should move to scoring phase
               expect(result.currentPhase).to.equal(GAME_PHASES.SCORING);
          });
     });
});

