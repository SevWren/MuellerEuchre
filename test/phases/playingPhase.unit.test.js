import chai from 'chai';
import sinon from 'sinon';
// Assuming createInitialGameState is a test utility or defined in state.js
// If not, this import will need adjustment or the function to be mocked/provided.
import { GameState, updateGameState, resetFullGame as createInitialGameState } from '../../src/game/state.js';
import { handlePlayCard, determineTrickWinner } from '../../src/game/phases/playingPhase.js';
import * as validation from '../../src/game/logic/validation.js';
import * as deckUtils from '../../src/utils/deck.js';
import * as playersUtils from '../../src/utils/players.js'; // Corrected import alias
import { GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS, CARD_RANKS } from '../../src/config/constants.js';

const { expect } = chai;

// A helper for the getCardRank stub, assuming getLeftBowerSuit might not be on deckUtils directly
// or needs specific stubbing behavior for tests.
const getLeftBowerSuitStub = (trumpSuit) => {
    if (!trumpSuit) return null;
    const suitColors = {
        [SUITS.SPADES]: 'black', [SUITS.CLUBS]: 'black',
        [SUITS.HEARTS]: 'red', [SUITS.DIAMONDS]: 'red',
    };
    const trumpColor = suitColors[trumpSuit];
    if (trumpColor === 'black') return trumpSuit === SUITS.SPADES ? SUITS.CLUBS : SUITS.SPADES;
    if (trumpColor === 'red') return trumpSuit === SUITS.HEARTS ? SUITS.DIAMONDS : SUITS.HEARTS;
    return null;
};


describe('Playing Phase Logic', () => {
  let gameState;
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    // Stub external dependencies
    sandbox.stub(validation, 'isValidPlay').returns(true);

    // Stub for getCardRank
    sandbox.stub(deckUtils, 'getCardRank').callsFake((card, trumpSuit, leadSuit) => {
      let rankValue = CARD_RANKS[card.rank] || 0; // Use direct lookup
      if (card.suit === trumpSuit) rankValue += 100;
      else if (card.suit === leadSuit) rankValue += 50;

      // Simplified Bower logic for the stub
      if (card.rank === 'J') {
        if (card.suit === trumpSuit) { // Right Bower
          rankValue += 200; // Make Right Bower highest
        } else if (card.suit === getLeftBowerSuitStub(trumpSuit)) { // Left Bower
          rankValue += 150; // Make Left Bower second highest
        }
      }
      return rankValue;
    });

    sandbox.stub(playersUtils, 'getNextPlayer').returns(PLAYER_ROLES[1]);

    // Using resetFullGame as createInitialGameState based on typical setup
    // This will provide a basic game state structure.
    gameState = createInitialGameState(); // Call it to get a fresh state object

    const players = [
      { role: PLAYER_ROLES[0], id: 'p1', name: 'Player 1', hand: [{ suit: SUITS.SPADES, rank: 'A', id:'AS' }, { suit: SUITS.SPADES, rank: 'K', id:'KS' }], team: TEAMS.TEAM_NS },
      { role: PLAYER_ROLES[1], id: 'p2', name: 'Player 2', hand: [{ suit: SUITS.HEARTS, rank: 'A', id:'AH' }], team: TEAMS.TEAM_EW },
      { role: PLAYER_ROLES[2], id: 'p3', name: 'Player 3', hand: [{ suit: SUITS.CLUBS, rank: 'A', id:'AC' }], team: TEAMS.TEAM_NS },
      { role: PLAYER_ROLES[3], id: 'p4', name: 'Player 4', hand: [{ suit: SUITS.DIAMONDS, rank: 'A', id:'AD' }], team: TEAMS.TEAM_EW },
    ];
    // Override parts of the gameState for specific test needs
    gameState.players = players;
    gameState.gamePhase = GAME_PHASES.PLAYING;
    gameState.currentPlayer = PLAYER_ROLES[0];
    gameState.trumpSuit = SUITS.SPADES;
    gameState.currentTrick = [];
    gameState.tricksTaken = { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 }; // Ensure object structure
    gameState.dealer = PLAYER_ROLES[0];
    // Ensure teamScores is initialized as it's accessed in playingPhase if a hand completes
    gameState.teamScores = { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 };
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('determineTrickWinner', () => {
    it('should correctly determine winner when trump is led and Right Bower is played', () => {
      const trick = [
        { suit: SUITS.SPADES, rank: 'K', playedBy: PLAYER_ROLES[0], id:'KS' }, // Trump King
        { suit: SUITS.SPADES, rank: 'J', playedBy: PLAYER_ROLES[1], id:'JS' }, // Right Bower (Jack of Spades, current trump)
        { suit: SUITS.HEARTS, rank: 'K', playedBy: PLAYER_ROLES[2], id:'KH' },// Off-suit
        { suit: SUITS.SPADES, rank: '9', playedBy: PLAYER_ROLES[3], id:'9S' }, // Lower Trump
      ];
      // getCardRank stub: Right Bower (JS) = CARD_RANKS.J + 200; King of Spades = CARD_RANKS.K + 100
      const winner = determineTrickWinner(trick, SUITS.SPADES, PLAYER_ROLES[0]);
      expect(winner).to.equal(PLAYER_ROLES[1]);
    });

    it('should correctly determine winner with Left Bower beating other trump', () => {
        // SPADES is trump, so CLUBS Jack is Left Bower
        const trick = [
            { suit: SUITS.SPADES, rank: 'A', playedBy: PLAYER_ROLES[0], id:'AS' },  // Trump Ace
            { suit: SUITS.CLUBS, rank: 'J', playedBy: PLAYER_ROLES[1], id:'JC' },  // Left Bower (Jack of Clubs)
            { suit: SUITS.SPADES, rank: 'K', playedBy: PLAYER_ROLES[2], id:'KS' },  // Trump King
            { suit: SUITS.DIAMONDS, rank: 'Q', playedBy: PLAYER_ROLES[3], id:'QD'}, // Off-suit
        ];
        // getCardRank stub: Left Bower (JC) = CARD_RANKS.J + 150; Ace of Spades = CARD_RANKS.A + 100
        // So Left Bower should win here based on the stub.
        const winner = determineTrickWinner(trick, SUITS.SPADES, PLAYER_ROLES[0]);
        expect(winner).to.equal(PLAYER_ROLES[1]);
    });


    it('should correctly determine winner when trump is led (non-bower)', () => {
      const trick = [
        { suit: SUITS.SPADES, rank: 'K', playedBy: PLAYER_ROLES[0], id:'KS' }, // Trump
        { suit: SUITS.SPADES, rank: 'A', playedBy: PLAYER_ROLES[1], id:'AS' }, // Higher Trump
        { suit: SUITS.HEARTS, rank: 'K', playedBy: PLAYER_ROLES[2], id:'KH' },// Off-suit
        { suit: SUITS.SPADES, rank: '9', playedBy: PLAYER_ROLES[3], id:'9S' }, // Lower Trump
      ];
      const winner = determineTrickWinner(trick, SUITS.SPADES, PLAYER_ROLES[0]);
      expect(winner).to.equal(PLAYER_ROLES[1]);
    });

    it('should correctly determine winner with off-suit led, trump played', () => {
      const trick = [
        { suit: SUITS.HEARTS, rank: 'A', playedBy: PLAYER_ROLES[0], id:'AH' }, // Lead off-suit
        { suit: SUITS.SPADES, rank: '9', playedBy: PLAYER_ROLES[1], id:'9S' }, // Trump
        { suit: SUITS.HEARTS, rank: 'K', playedBy: PLAYER_ROLES[2], id:'KH' },// Follow suit
        { suit: SUITS.DIAMONDS, rank: 'Q', playedBy: PLAYER_ROLES[3], id:'QD' },// Off-suit
      ];
      const winner = determineTrickWinner(trick, SUITS.SPADES, PLAYER_ROLES[0]);
      expect(winner).to.equal(PLAYER_ROLES[1]);
    });

    it('should correctly determine winner with only non-trump cards', () => {
      const trick = [
        { suit: SUITS.HEARTS, rank: 'K', playedBy: PLAYER_ROLES[0], id:'KH' }, // Lead
        { suit: SUITS.HEARTS, rank: 'A', playedBy: PLAYER_ROLES[1], id:'AH' }, // Higher in suit
        { suit: SUITS.CLUBS, rank: 'Q', playedBy: PLAYER_ROLES[2], id:'QC' },  // Off-suit
        { suit: SUITS.HEARTS, rank: '9', playedBy: PLAYER_ROLES[3], id:'9H' }, // Lower in suit
      ];
      const winner = determineTrickWinner(trick, SUITS.DIAMONDS, PLAYER_ROLES[0]); // Trump is DIAMONDS
      expect(winner).to.equal(PLAYER_ROLES[1]);
    });

    it('should throw error if trick does not have 4 cards', () => {
      const trick = [{ suit: SUITS.HEARTS, rank: 'K', playedBy: PLAYER_ROLES[0], id:'KH' }];
      expect(() => determineTrickWinner(trick, SUITS.SPADES, PLAYER_ROLES[0])).to.throw('Trick must have 4 cards');
    });
  });

  describe('handlePlayCard', () => {
    // Player 0's initial hand has { suit: SUITS.SPADES, rank: 'A', id:'AS' }
    const cardToPlay = { suit: SUITS.SPADES, rank: 'A', id:'AS' };

    it('should throw error if not in PLAYING phase', () => {
      gameState.gamePhase = GAME_PHASES.BIDDING;
      expect(() => handlePlayCard(gameState, PLAYER_ROLES[0], cardToPlay)).to.throw('Not in PLAYING phase.');
    });

    it('should throw error if not current players turn', () => {
      gameState.currentPlayer = PLAYER_ROLES[1];
      expect(() => handlePlayCard(gameState, PLAYER_ROLES[0], cardToPlay)).to.throw(`Not player ${PLAYER_ROLES[0]}'s turn.`);
    });

    it('should throw error if player not found', () => {
      // Modify gameState.players to not include a findable 'playerX' by role for this test
      gameState.players = gameState.players.filter(p => p.role !== 'playerX');
      expect(() => handlePlayCard(gameState, 'playerX', cardToPlay)).to.throw('Player playerX not found.');
    });

    it('should throw error if play is invalid', () => {
      validation.isValidPlay.returns(false); // Mock validation to return false
      expect(() => handlePlayCard(gameState, PLAYER_ROLES[0], cardToPlay)).to.throw('Invalid play.');
    });

    it('should remove card from player hand and add to currentTrick', () => {
      const player = gameState.players.find(p => p.role === PLAYER_ROLES[0]);
      const originalHandSize = player.hand.length;

      const newState = handlePlayCard(gameState, PLAYER_ROLES[0], cardToPlay);

      const updatedPlayer = newState.players.find(p => p.role === PLAYER_ROLES[0]);
      expect(updatedPlayer.hand.length).to.equal(originalHandSize - 1);
      // Check that the specific card is removed
      expect(updatedPlayer.hand.find(card => card.id === cardToPlay.id)).to.be.undefined;

      expect(newState.currentTrick.length).to.equal(1);
      expect(newState.currentTrick[0].playedBy).to.equal(PLAYER_ROLES[0]);
      expect(newState.currentTrick[0].suit).to.equal(cardToPlay.suit);
      expect(newState.currentTrick[0].rank).to.equal(cardToPlay.rank);
    });

    it('should advance current player if trick is not over', () => {
      playersUtils.getNextPlayer.returns(PLAYER_ROLES[2]); // Explicitly set for this test
      const newState = handlePlayCard(gameState, PLAYER_ROLES[0], cardToPlay);
      expect(newState.currentPlayer).to.equal(PLAYER_ROLES[2]);
      expect(newState.currentTrick.length).to.equal(1);
    });

    it('should determine trick winner, update tricksTaken, and set winner as currentPlayer if trick is over (4 cards)', () => {
      gameState.currentTrick = [ // 3 cards already played
        { suit: SUITS.HEARTS, rank: 'K', playedBy: PLAYER_ROLES[1], id:'KH' },
        { suit: SUITS.HEARTS, rank: 'Q', playedBy: PLAYER_ROLES[2], id:'QH' },
        { suit: SUITS.HEARTS, rank: 'J', playedBy: PLAYER_ROLES[3], id:'JH' },
      ];
      // Player0 (TEAM_NS) plays the 4th card (cardToPlay = SPADES 'A', which is trump)
      // Based on getCardRank stub, SPADES 'A' (trump) will win against HEARTS K, Q, J.

      const newState = handlePlayCard(gameState, PLAYER_ROLES[0], cardToPlay); // cardToPlay is P0's SPADES 'A'

      expect(newState.tricksTaken[TEAMS.TEAM_NS]).to.equal(1);
      expect(newState.currentTrick.length).to.equal(0); // Trick reset
      expect(newState.currentPlayer).to.equal(PLAYER_ROLES[0]); // Winner leads next
      expect(newState.lastTrickWinner).to.equal(PLAYER_ROLES[0]);
    });

    it('should transition to SCORING phase if 5 tricks are played', () => {
      // TEAM_NS has P0, P2. TEAM_EW has P1, P3.
      // Let TEAM_NS have 2 tricks, TEAM_EW have 2 tricks. This is the 5th trick.
      gameState.tricksTaken = { [TEAMS.TEAM_NS]: 2, [TEAMS.TEAM_EW]: 2 };
      gameState.currentTrick = [
        { suit: SUITS.HEARTS, rank: 'K', playedBy: PLAYER_ROLES[1], id:'KH' }, // P1 (EW)
        { suit: SUITS.HEARTS, rank: 'Q', playedBy: PLAYER_ROLES[2], id:'QH' }, // P2 (NS)
        { suit: SUITS.HEARTS, rank: 'J', playedBy: PLAYER_ROLES[3], id:'JH' }, // P3 (EW)
      ];
      // P0 (NS) plays cardToPlay (SPADES 'A' - trump) and wins the trick.
      // This means TEAM_NS gets their 3rd trick.

      const newState = handlePlayCard(gameState, PLAYER_ROLES[0], cardToPlay);

      expect(newState.tricksTaken[TEAMS.TEAM_NS]).to.equal(3);
      expect(newState.gamePhase).to.equal(GAME_PHASES.SCORING);
      expect(newState.currentPlayer).to.be.null;
      expect(newState.message).to.include('Hand over');
    });
  });
});
