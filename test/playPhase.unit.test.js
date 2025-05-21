import { expect } from 'chai';
import { handlePlayCard } from '../src/game/phases/playPhase.js';
import { GAME_PHASES } from '../src/config/constants.js';

describe('Play Phase', () => {
     let gameState;
     
     beforeEach(() => {
          // Setup a basic game state for testing
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
               // North leads with non-trump
               let result = handlePlayCard(gameState, 'north', { suit: 'diamonds', rank: 'J' }); // Left bower
               // East plays a trump (hearts is trump)
               result = handlePlayCard(result, 'east', { suit: 'hearts', rank: 'K' });
               
               // North's left bower should count as trump and win
               expect(result.currentTrick[0].card.suit).to.equal('diamonds');
               
               result = handlePlayCard(result, 'south', { suit: 'diamonds', rank: 'K' });
               result = handlePlayCard(result, 'west', { suit: 'diamonds', rank: 'Q' });
               
               // North should win with left bower (counts as trump)
               expect(result.tricks[0].winner).to.equal('north');
          });
          
          it('should enforce following suit', () => {
               // North leads with clubs
               let result = handlePlayCard(gameState, 'north', { suit: 'clubs', rank: '10' });
               
               // East tries to play a spade but has clubs
               expect(() => handlePlayCard(result, 'east', { suit: 'spades', rank: 'A' }))
                    .to.throw('Must follow suit');
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
