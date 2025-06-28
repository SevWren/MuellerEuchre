// filepath: test/utils/deck.unit.test.js
// TODO: REMOVE All use of proxyquire. Rework to always us ESMOCK
import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import { SUITS, VALUES, CARD_RANKS } from '../../src/config/constants.js';

// Mock logger to prevent console output during tests
const loggerMock = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  debug: sinon.stub(),
};

describe('Deck Utility Functions', () => {
  let deckUtils;

  beforeEach(async () => { // Use async for esmock
    // Reset logger mocks before each test
    loggerMock.info.resetHistory();
    loggerMock.warn.resetHistory();
    loggerMock.error.resetHistory();
    loggerMock.debug.resetHistory();

    // Use esmock to inject the logger mock
    deckUtils = await esmock('../../src/utils/deck.js', {
      '../../src/utils/logger.js': { default: loggerMock }, // Mock logger using its absolute path from project root
    });
  });

  // After each test, unload the mocked module
  afterEach(async () => {
    await esmock.unload('../../src/utils/deck.js');
  });

  describe('createDeck', () => {
    it('should create a deck with 24 cards', () => {
      const deck = deckUtils.createDeck();
      expect(deck).to.be.an('array');
      expect(deck).to.have.lengthOf(24);
    });

    it('should contain unique cards', () => {
      const deck = deckUtils.createDeck();
      const cardIds = new Set(deck.map(card => card.id));
      expect(cardIds.size).to.equal(24);
    });

    it('should contain cards with correct properties (suit, value, id, name)', () => {
      const deck = deckUtils.createDeck();
      const sampleCard = deck.find(c => c.id === 'AH'); // Ace of Hearts
      expect(sampleCard).to.exist;
      expect(sampleCard.suit).to.equal(SUITS.HEARTS);
      expect(sampleCard.value).to.equal(VALUES.ACE);
      expect(sampleCard.name).to.equal('Ace of Hearts');

      const anotherCard = deck.find(c => c.id === 'JC'); // Jack of Clubs
      expect(anotherCard).to.exist;
      expect(anotherCard.suit).to.equal(SUITS.CLUBS);
      expect(anotherCard.value).to.equal(VALUES.JACK);
      expect(anotherCard.name).to.equal('Jack of Clubs');
    });
  });

  describe('shuffleDeck', () => {
    it('should return a new array instance', () => {
      const originalDeck = deckUtils.createDeck();
      const shuffledDeck = deckUtils.shuffleDeck(originalDeck);
      expect(shuffledDeck).to.not.equal(originalDeck); // Should be a new instance
      expect(shuffledDeck).to.have.lengthOf(originalDeck.length); // Should have same length
      expect(shuffledDeck).to.have.deep.members(originalDeck); // Should contain the same cards, regardless of order
    });

    it('should contain the same cards as the original deck', () => {
      const originalDeck = deckUtils.createDeck();
      const shuffledDeck = deckUtils.shuffleDeck(originalDeck);
      expect(shuffledDeck).to.have.lengthOf(originalDeck.length);
      // Check if all cards from original are present in shuffled (order doesn't matter)
      originalDeck.forEach(card => {
        expect(shuffledDeck).to.deep.include(card);
      });
    });

    it('should result in a different order (probabilistically)', () => {
      // This test is probabilistic and might fail rarely. Run multiple times if flaky.
      const originalDeck = deckUtils.createDeck();
      let isShuffled = false;
      for (let i = 0; i < 5; i++) { // Try a few times to ensure shuffling
        const shuffledDeck = deckUtils.shuffleDeck(originalDeck);
        if (JSON.stringify(originalDeck) !== JSON.stringify(shuffledDeck)) {
          isShuffled = true;
          break;
        }
      }
      expect(isShuffled).to.be.true;
    });
  });

  describe('cardToId', () => {
    it('should return the correct ID for a valid card', () => {
      const card = { suit: SUITS.HEARTS, value: VALUES.ACE };
      expect(deckUtils.cardToId(card)).to.equal('AH');
    });

    it('should return correct ID for other suits', () => {
      expect(deckUtils.cardToId({ suit: SUITS.CLUBS, value: VALUES.KING })).to.equal('KC');
      expect(deckUtils.cardToId({ suit: SUITS.DIAMONDS, value: VALUES.TEN })).to.equal('TD');
      expect(deckUtils.cardToId({ suit: SUITS.SPADES, value: VALUES.JACK })).to.equal('JS');
    });

    it('should log a warning and return "?? " for invalid card objects', () => {
      expect(deckUtils.cardToId(null)).to.equal('??');
      expect(loggerMock.warn.calledOnce).to.be.true;
      loggerMock.warn.resetHistory();

      expect(deckUtils.cardToId({})).to.equal('??');
      expect(loggerMock.warn.calledOnce).to.be.true;
      loggerMock.warn.resetHistory();

      expect(deckUtils.cardToId({ suit: SUITS.HEARTS })).to.equal('??');
      expect(loggerMock.warn.calledOnce).to.be.true;
      loggerMock.warn.resetHistory();

      expect(deckUtils.cardToId({ value: VALUES.ACE })).to.equal('??');
      expect(loggerMock.warn.calledOnce).to.be.true;
    });
  });

  describe('isRightBower', () => {
    it('should return true for the Jack of the trump suit', () => {
      const card = { suit: SUITS.HEARTS, value: VALUES.JACK };
      expect(deckUtils.isRightBower(card, SUITS.HEARTS)).to.be.true;
    });

    it('should return false for a non-Jack of the trump suit', () => {
      const card = { suit: SUITS.HEARTS, value: VALUES.ACE };
      expect(deckUtils.isRightBower(card, SUITS.HEARTS)).to.be.false;
    });

    it('should return false for the Jack of a different suit', () => {
      const card = { suit: SUITS.CLUBS, value: VALUES.JACK };
      expect(deckUtils.isRightBower(card, SUITS.HEARTS)).to.be.false;
    });

    it('should return false for invalid card or trumpSuit', () => {
      expect(deckUtils.isRightBower(null, SUITS.HEARTS)).to.be.false;
      expect(deckUtils.isRightBower({ suit: SUITS.HEARTS, value: VALUES.JACK }, null)).to.be.false;
    });
  });

  describe('isLeftBower', () => {
    it('should return true for the Jack of the same color as trump (different suit)', () => {
      const card = { suit: SUITS.DIAMONDS, value: VALUES.JACK }; // Red
      expect(deckUtils.isLeftBower(card, SUITS.HEARTS)).to.be.true; // Red trump
    });

    it('should return true for the Jack of the same color as trump (different suit, black)', () => {
      const card = { suit: SUITS.SPADES, value: VALUES.JACK }; // Black
      expect(deckUtils.isLeftBower(card, SUITS.CLUBS)).to.be.true; // Black trump
    });

    it('should return false if it is the Right Bower', () => {
      const card = { suit: SUITS.HEARTS, value: VALUES.JACK };
      expect(deckUtils.isLeftBower(card, SUITS.HEARTS)).to.be.false;
    });

    it('should return false for a non-Jack of the same color', () => {
      const card = { suit: SUITS.DIAMONDS, value: VALUES.ACE };
      expect(deckUtils.isLeftBower(card, SUITS.HEARTS)).to.be.false;
    });

    it('should return false for a Jack of a different color', () => {
      const card = { suit: SUITS.CLUBS, value: VALUES.JACK }; // Black
      expect(deckUtils.isLeftBower(card, SUITS.HEARTS)).to.be.false; // Red trump
    });

    it('should return false for invalid card or trumpSuit', () => {
      expect(deckUtils.isLeftBower(null, SUITS.HEARTS)).to.be.false;
      expect(deckUtils.isLeftBower({ suit: SUITS.HEARTS, value: VALUES.JACK }, null)).to.be.false;
      expect(deckUtils.isLeftBower({}, SUITS.HEARTS)).to.be.false;
    });
  });

  describe('getCardRank', () => {
    const trumpSuit = SUITS.HEARTS;
    const ledSuit = SUITS.DIAMONDS; // Different from trump

    it('should return highest rank for Right Bower', () => {
      const rightBower = { suit: SUITS.HEARTS, value: VALUES.JACK };
      expect(deckUtils.getCardRank(rightBower, trumpSuit, ledSuit)).to.be.above(200);
    });

    it('should return second highest rank for Left Bower', () => {
      const leftBower = { suit: SUITS.DIAMONDS, value: VALUES.JACK }; // Same color as Hearts
      expect(deckUtils.getCardRank(leftBower, trumpSuit, ledSuit)).to.be.above(190).and.below(200);
    });

    it('should rank other trump cards higher than non-trump cards', () => {
      const trumpAce = { suit: SUITS.HEARTS, value: VALUES.ACE };
      const nonTrumpAce = { suit: SUITS.SPADES, value: VALUES.ACE };
      expect(deckUtils.getCardRank(trumpAce, trumpSuit, ledSuit)).to.be.above(100);
      expect(deckUtils.getCardRank(trumpAce, trumpSuit, ledSuit)).to.be.above(deckUtils.getCardRank(nonTrumpAce, trumpSuit, ledSuit));
    });

    it('should rank led suit cards higher than off-suit cards (non-trump)', () => {
      const ledAce = { suit: SUITS.DIAMONDS, value: VALUES.ACE };
      const offSuitAce = { suit: SUITS.CLUBS, value: VALUES.ACE };
      expect(deckUtils.getCardRank(ledAce, trumpSuit, ledSuit)).to.be.above(50);
      expect(deckUtils.getCardRank(ledAce, trumpSuit, ledSuit)).to.be.above(deckUtils.getCardRank(offSuitAce, trumpSuit, ledSuit));
    });

    it('should use base rank for off-suit, non-trump, non-led cards', () => {
      const offSuitCard = { suit: SUITS.CLUBS, value: VALUES.TEN };
      expect(deckUtils.getCardRank(offSuitCard, trumpSuit, ledSuit)).to.equal(CARD_RANKS.TEN);
    });

    it('should handle null/undefined ledSuit correctly (no led suit bonus)', () => {
      const card = { suit: SUITS.CLUBS, value: VALUES.ACE };
      expect(deckUtils.getCardRank(card, trumpSuit, null)).to.equal(CARD_RANKS.ACE);
      expect(deckUtils.getCardRank(card, trumpSuit, undefined)).to.equal(CARD_RANKS.ACE);
    });

    it('should log an error and return 0 for invalid card or trumpSuit', () => {
      expect(deckUtils.getCardRank(null, trumpSuit, ledSuit)).to.equal(0);
      expect(loggerMock.error.calledOnce).to.be.true;
      loggerMock.error.resetHistory();

      expect(deckUtils.getCardRank({ suit: SUITS.HEARTS, value: VALUES.ACE }, null, ledSuit)).to.equal(0);
      expect(loggerMock.error.calledOnce).to.be.true;
      loggerMock.error.resetHistory();

      expect(deckUtils.getCardRank({}, trumpSuit, ledSuit)).to.equal(0);
      expect(loggerMock.error.calledOnce).to.be.true;
    });
  });

  describe('sortHand', () => {
    const trumpSuit = SUITS.SPADES;
    const hand = [
      { id: '9H', suit: SUITS.HEARTS, value: VALUES.NINE },
      { id: 'JS', suit: SUITS.SPADES, value: VALUES.JACK }, // Right Bower
      { id: 'AD', suit: SUITS.DIAMONDS, value: VALUES.ACE },
      { id: 'JC', suit: SUITS.CLUBS, value: VALUES.JACK }, // Left Bower (Spades is trump)
      { id: 'KS', suit: SUITS.SPADES, value: VALUES.KING }, // Trump
      { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN },
    ];

    it('should return a new array instance', () => {
      const sortedHand = deckUtils.sortHand(hand, trumpSuit);
      expect(sortedHand).to.not.equal(hand);
      expect(sortedHand).to.have.lengthOf(hand.length);
    });

    it('should sort hand with Right Bower first, then Left Bower, then other trumps', () => {
      const sortedHand = deckUtils.sortHand(hand, trumpSuit);
      // Right Bower (JS) should be first
      expect(sortedHand[0].id).to.equal('JS');
      // Left Bower (JC) should be second
      expect(sortedHand[1].id).to.equal('JC');
      // Other trump (KS) should be third
      expect(sortedHand[2].id).to.equal('KS');
    });

    it('should sort non-trump suits by defined order (Clubs then Diamonds then Hearts)', () => {
      const sortedHand = deckUtils.sortHand(hand, trumpSuit);
      // After trumps, should be Clubs (QC), then Diamonds (AD), then Hearts (9H)
      const nonTrumpCards = sortedHand.slice(3);
      expect(nonTrumpCards[0].suit).to.equal(SUITS.CLUBS);
      expect(nonTrumpCards[1].suit).to.equal(SUITS.DIAMONDS);
      expect(nonTrumpCards[2].suit).to.equal(SUITS.HEARTS);
    });

    it('should sort cards within the same suit by rank (highest first)', () => {
      const handWithMultipleClubs = [
        { id: 'AC', suit: SUITS.CLUBS, value: VALUES.ACE },
        { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING },
        { id: '9C', suit: SUITS.CLUBS, value: VALUES.NINE },
      ];
      const sortedHand = deckUtils.sortHand(handWithMultipleClubs, SUITS.DIAMONDS); // Trump is Diamonds
      expect(sortedHand[0].id).to.equal('AC');
      expect(sortedHand[1].id).to.equal('KC');
      expect(sortedHand[2].id).to.equal('9C');
    });

    it('should handle empty hand', () => {
      expect(deckUtils.sortHand([], trumpSuit)).to.deep.equal([]);
    });

    it('should handle null/undefined hand gracefully', () => {
      expect(deckUtils.sortHand(null, trumpSuit)).to.deep.equal([]);
      expect(deckUtils.sortHand(undefined, trumpSuit)).to.deep.equal([]);
    });

    it('should sort correctly when no trump suit is provided (basic rank sort)', () => {
      const noTrumpHand = [
        { id: '9H', suit: SUITS.HEARTS, value: VALUES.NINE, value_rank: 9 },
        { id: 'AD', suit: SUITS.DIAMONDS, value: VALUES.ACE, value_rank: 14 },
        { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING, value_rank: 13 },
      ];
      const sortedHand = deckUtils.sortHand(noTrumpHand, null);
      expect(sortedHand[0].id).to.equal('AD');
      expect(sortedHand[1].id).to.equal('KC');
      expect(sortedHand[2].id).to.equal('9H');
    });
  });
});