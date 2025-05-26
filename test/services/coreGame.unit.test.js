/**
 * @file coreGameLogic.unit.test.js - Unit tests for the CoreGameLogic module
 * @module CoreGameLogicUnitTest
 * @description Unit tests for the CoreGameLogic module
 * @requires chai
 * @see ../../src/game/logic/gameLogic.js
 */

import { expect } from 'chai';
import { 
    getNextPlayer, 
    getPartner, 
    cardToString, 
    sortHand, 
    isRightBower, 
    isLeftBower, 
    getCardRank,
    getSuitColor
} from '../../src/game/logic/gameLogic.js';

describe('Core Game Logic', function() {
    describe('getNextPlayer', function() {
        it('returns the next player in order', function() {
            expect(getNextPlayer('south')).to.equal('west');
            expect(getNextPlayer('west')).to.equal('north');
            expect(getNextPlayer('north')).to.equal('east');
            expect(getNextPlayer('east')).to.equal('south');
        });

        it('should skip partner when going alone', function() {
            const roles = ['south', 'west', 'north', 'east'];
            const current = 'south';
            const goingAlone = true;
            const playerGoingAlone = 'south';
            const partnerSittingOut = 'north';
            const next = getNextPlayer(current, roles, goingAlone, playerGoingAlone, partnerSittingOut);
            expect(next).to.equal('west');
            // Next after 'west' should be 'east', skipping 'north'
            expect(getNextPlayer('west', roles, goingAlone, playerGoingAlone, partnerSittingOut)).to.equal('east');
            // Next after 'east' should wrap to 'south', skipping 'north'
            expect(getNextPlayer('east', roles, goingAlone, playerGoingAlone, partnerSittingOut)).to.equal('south');
        });
    });

    describe('getPartner', function() {
        it('returns the correct partner', function() {
            expect(getPartner('south')).to.equal('north');
            expect(getPartner('north')).to.equal('south');
            expect(getPartner('east')).to.equal('west');
            expect(getPartner('west')).to.equal('east');
        });

        it('should return undefined for invalid role', function() {
            expect(getPartner('invalid')).to.be.undefined;
        });
    });

    describe('cardToString', function() {
        it('returns correct string', function() {
            expect(cardToString({ value: 'J', suit: 'hearts' })).to.equal('J of hearts');
            expect(cardToString(null)).to.equal('N/A');
        });

        it('should handle incomplete card objects', function() {
            expect(cardToString({})).to.equal('Unknown Card');
            expect(cardToString({suit: 'hearts'})).to.equal('Unknown Card');
            expect(cardToString({value: 'A'})).to.equal('Unknown Card');
        });
    });

    describe('sortHand', function() {
        it('sorts by suit and value', function() {
            const hand = [
                { value: 'A', suit: 'spades' },
                { value: '9', suit: 'hearts' },
                { value: 'K', suit: 'clubs' },
                { value: '10', suit: 'hearts' },
                { value: 'J', suit: 'diamonds' }
            ];
            const sorted = sortHand(hand);
            expect(sorted[0].suit).to.equal('hearts');
            expect(sorted[1].suit).to.equal('hearts');
            expect(sorted[2].suit).to.equal('diamonds');
            expect(sorted[3].suit).to.equal('clubs');
            expect(sorted[4].suit).to.equal('spades');
        });

        it('should handle empty hand', function() {
            expect(sortHand([], 'hearts')).to.deep.equal([]);
        });

        it('should handle hand with only one suit', function() {
            const hand = [
                {suit: 'hearts', value: 'A'},
                {suit: 'hearts', value: 'K'},
                {suit: 'hearts', value: 'Q'}
            ];
            const sorted = sortHand(hand, 'hearts');
            expect(sorted).to.have.lengthOf(3);
            expect(sorted.every(card => card.suit === 'hearts')).to.be.true;
        });

        it('sorts hand with trump suit correctly', function() {
            const hand = [
                { value: 'J', suit: 'hearts' }, // right bower
                { value: 'J', suit: 'diamonds' }, // left bower if trump is hearts
                { value: 'A', suit: 'hearts' },
                { value: 'K', suit: 'spades' },
                { value: '9', suit: 'clubs' }
            ];
            const sorted = sortHand([...hand], 'hearts');
            // Right bower should be first, then left bower, then trump ace, then others
            expect(sorted[0].value).to.equal('J');
            expect(sorted[0].suit).to.equal('hearts');
            expect(sorted[1].value).to.equal('J');
            expect(sorted[1].suit).to.equal('diamonds');
        });
    });

    describe('isRightBower and isLeftBower', function() {
        it('correctly identifies bowers', function() {
            expect(isRightBower({ value: 'J', suit: 'hearts' }, 'hearts')).to.be.true;
            expect(isRightBower({ value: 'J', suit: 'spades' }, 'hearts')).to.be.false;
            expect(isLeftBower({ value: 'J', suit: 'diamonds' }, 'hearts')).to.be.true;
            expect(isLeftBower({ value: 'J', suit: 'hearts' }, 'hearts')).to.be.false;
        });
    });

    describe('getCardRank', function() {
        it('returns correct rank for right/left bower and trump', function() {
            expect(getCardRank({ rank: 'J', suit: 'hearts' }, 'hearts', 'hearts')).to.equal(1000); // right bower
            expect(getCardRank({ rank: 'J', suit: 'diamonds' }, 'hearts', 'hearts')).to.equal(900); // left bower
            expect(getCardRank({ rank: 'A', suit: 'hearts' }, 'hearts', 'hearts')).to.equal(800); // trump ace
            expect(getCardRank({ rank: '9', suit: 'hearts' }, 'hearts', 'hearts')).to.equal(40); // trump 9
            expect(getCardRank({ rank: 'A', suit: 'spades' }, 'spades', 'hearts')).to.equal(500); // led suit ace (non-trump)
        });
    });

    describe('getSuitColor', function() {
        it('returns correct colors for each suit', function() {
            expect(getSuitColor('hearts')).to.equal('red');
            expect(getSuitColor('diamonds')).to.equal('red');
            expect(getSuitColor('clubs')).to.equal('black');
            expect(getSuitColor('spades')).to.equal('black');
            expect(getSuitColor('invalid')).to.equal('black'); // default
        });
    });
});
