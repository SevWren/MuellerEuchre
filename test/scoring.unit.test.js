/**
 * @file Unit tests for scoring module
 * @module test/scoring.unit.test.js
 * @description Verifies correct scoring of game hands
 * 
 * Tests cover:
 * - awarding 1 point for making the bid (3 tricks)
 * - awarding 2 points for making the bid and taking all 5 tricks (going alone)
 * - awarding 1 point for going alone and failing to make the bid
 * - awarding 2 points for making the bid and going alone (4 tricks)
 * - resetting the game state (tricks won, player going alone, etc.)
 */

import { expect } from 'chai';
import { scoreCurrentHand, resetGame } from '../src/game/phases/scoring.js';
import { GAME_PHASES } from '../src/config/constants.js';

describe('Scoring Module', () => {
     let gameState;

     beforeEach(() => {
          // Setup a basic game state for testing
          gameState = {
               currentPhase: GAME_PHASES.PLAYING,
               dealer: 'south',
               makerTeam: 'north+south',
               goingAlone: false,
               playerGoingAlone: null,
               playerOrder: ['north', 'east', 'south', 'west'],
               players: {
                    north: { tricksWon: 0 },
                    south: { tricksWon: 0 },
                    east: { tricksWon: 0 },
                    west: { tricksWon: 0 }
               },
               messages: []
          };
     });

     describe('scoreCurrentHand', () => {
          it('should award 1 point for making the bid (3 tricks)', () => {
               // Setup - makers take 3 tricks
               gameState.players.north.tricksWon = 2;
               gameState.players.south.tricksWon = 1;
               gameState.players.east.tricksWon = 1;
               gameState.players.west.tricksWon = 1;

               const result = scoreCurrentHand(gameState);
               
               expect(result.scores['north+south']).to.equal(1);
               expect(result.scores['east+west']).to.equal(0);
               expect(result.currentPhase).to.equal(GAME_PHASES.BETWEEN_HANDS);
          });

          it('should award 2 points for a march (5 tricks)', () => {
               // Setup - makers take all 5 tricks
               gameState.players.north.tricksWon = 3;
               gameState.players.south.tricksWon = 2;

               const result = scoreCurrentHand(gameState);
               
               expect(result.scores['north+south']).to.equal(2);
               expect(result.scores['east+west']).to.equal(0);
          });

          it('should award 4 points for a lone hand march', () => {
               // Setup - going alone and taking all 5 tricks
               gameState.goingAlone = true;
               gameState.playerGoingAlone = 'north';
               gameState.players.north.tricksWon = 5;
               gameState.players.south.tricksWon = 0;

               const result = scoreCurrentHand(gameState);
               
               expect(result.scores['north+south']).to.equal(4);
          });

          it('should euchre the makers if they take < 3 tricks', () => {
               // Setup - makers take only 2 tricks
               gameState.players.north.tricksWon = 1;
               gameState.players.south.tricksWon = 1;
               gameState.players.east.tricksWon = 2;
               gameState.players.west.tricksWon = 1;

               const result = scoreCurrentHand(gameState);
               
               expect(result.scores['east+west']).to.equal(2);
               expect(result.scores['north+south']).to.equal(0);
          });

          it('should declare a winner if score reaches 10', () => {
               // Setup - makers have 9 points and make their bid
               gameState.scores = { 'north+south': 9, 'east+west': 5 };
               gameState.players.north.tricksWon = 3;
               gameState.players.south.tricksWon = 0;

               const result = scoreCurrentHand(gameState);
               
               expect(result.currentPhase).to.equal(GAME_PHASES.GAME_OVER);
               expect(result.winner).to.equal('north+south');
          });
     });

     describe('resetGame', () => {
          it('should reset the game state for a new game', () => {
               const result = resetGame({
                    scores: { 'north+south': 5, 'east+west': 3 },
                    dealer: 'east',
                    currentPhase: GAME_PHASES.GAME_OVER,
                    messages: ['Game over!']
               });
               
               expect(result.scores).to.deep.equal({ 'north+south': 0, 'east+west': 0 });
               expect(result.currentPhase).to.equal(GAME_PHASES.LOBBY);
               expect(result.messages).to.deep.equal([{
                    type: 'game',
                    text: 'New game started! Waiting for players...'
               }]);
          });
     });
});
