/**
 * Unit tests for test mocks in testMocks.js
 * @module test/utils/testMocks.unit.test
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { createMockPlayerUtils } from './testMocks.js';

describe('Test Mocks', () => {
  describe('createMockPlayerUtils()', () => {
    let mockPlayerUtils;

    beforeEach(() => {
      mockPlayerUtils = createMockPlayerUtils();
    });

    afterEach(() => {
      sinon.restore();
    });

    describe('getNextPlayer()', () => {
      const defaultPlayerSlots = ['south', 'west', 'north', 'east'];

      it('should return the next player in standard order', () => {
        expect(mockPlayerUtils.getNextPlayer('south', defaultPlayerSlots)).to.equal('west');
        expect(mockPlayerUtils.getNextPlayer('west', defaultPlayerSlots)).to.equal('north');
        expect(mockPlayerUtils.getNextPlayer('north', defaultPlayerSlots)).to.equal('east');
        expect(mockPlayerUtils.getNextPlayer('east', defaultPlayerSlots)).to.equal('south');
      });

      it('should handle going alone by skipping the sitting out partner', () => {
        // South is going alone, North is sitting out
        expect(mockPlayerUtils.getNextPlayer('south', defaultPlayerSlots, true, 'north')).to.equal('west');
        
        // West is going alone, East is sitting out
        expect(mockPlayerUtils.getNextPlayer('west', defaultPlayerSlots, true, 'east')).to.equal('north');
        
        // North is going alone, South is sitting out
        expect(mockPlayerUtils.getNextPlayer('north', defaultPlayerSlots, true, 'south')).to.equal('east');
        
        // East is going alone, West is sitting out
        expect(mockPlayerUtils.getNextPlayer('east', defaultPlayerSlots, true, 'west')).to.equal('south');
      });

      it('should handle wrap-around when skipping the sitting out partner', () => {
        // East is going alone, West is sitting out
        // Next after East should be South (skipping West)
        expect(mockPlayerUtils.getNextPlayer('east', defaultPlayerSlots, true, 'west')).to.equal('south');
      });

      it('should return undefined for invalid currentPlayerRole', () => {
        expect(mockPlayerUtils.getNextPlayer('invalid', defaultPlayerSlots)).to.be.undefined;
        expect(mockPlayerUtils.getNextPlayer(null, defaultPlayerSlots)).to.be.undefined;
        expect(mockPlayerUtils.getNextPlayer(undefined, defaultPlayerSlots)).to.be.undefined;
      });

      it('should return undefined for invalid playerSlots', () => {
        expect(mockPlayerUtils.getNextPlayer('south', null)).to.be.undefined;
        expect(mockPlayerUtils.getNextPlayer('south', [])).to.be.undefined;
        expect(mockPlayerUtils.getNextPlayer('south', ['only', 'two'])).to.be.undefined;
      });

      it('should return undefined if currentPlayerRole is not in playerSlots', () => {
        const customSlots = ['player1', 'player2', 'player3', 'player4'];
        expect(mockPlayerUtils.getNextPlayer('south', customSlots)).to.be.undefined;
      });
    });
  });
});
