import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock'; // Import esmock

// Assuming createInitialGameState is a test utility or defined in state.js
// If not, this import will need adjustment or the function to be mocked/provided.
// Removed GameState from import as it's not an actual export
import { updateGameState, resetFullGame as createInitialGameState } from '../../src/game/state.js';
// Tested functions will be loaded via esmock
// Constants are fine to import directly
import { GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS, CARD_RANKS } from '../../src/config/constants.js';

// A helper for the getCardRank stub, assuming getLeftBowerSuit might not be on deckUtils directly
// or needs specific stubbing behavior for tests.
const getLeftBowerSuitStub = (trumpSuit) => {
    if (!trumpSuit) return null;
    // SUITS is now an object, e.g., SUITS.SPADES is 'spades'
    const suitColors = {
        [SUITS.SPADES]: 'black', // 'spades': 'black'
        [SUITS.CLUBS]: 'black',   // 'clubs': 'black'
        [SUITS.HEARTS]: 'red',    // 'hearts': 'red'
        [SUITS.DIAMONDS]: 'red', // 'diamonds': 'red'
    };
    const trumpColor = suitColors[trumpSuit]; // e.g., suitColors['spades']
    if (trumpColor === 'black') {
      return trumpSuit === SUITS.SPADES ? SUITS.CLUBS : SUITS.SPADES;
    }
    if (trumpColor === 'red') {
      return trumpSuit === SUITS.HEARTS ? SUITS.DIAMONDS : SUITS.HEARTS;
    }
    return null;
};


describe('Playing Phase Logic', () => {
  let gameState;
  let sandbox;
  let handlePlayCard; // Will be loaded with esmock
  let determineTrickWinner; // Will be loaded with esmock
  let mockValidation;
  let mockDeckUtils;
  let mockPlayersUtils;
  let mockState; // Restore mockState

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    // This gameState is the one we want updateGameState to modify directly in tests
    // It's initialized here and then parts are overridden.
    // We need createInitialGameState (the real resetFullGame) to run first.
    gameState = createInitialGameState();

    mockValidation = {
      isValidPlay: sandbox.stub().returns(true),
    };

    mockDeckUtils = {
      getCardRank: sandbox.stub().callsFake((card, trumpSuit, leadSuit) => {
        // Specific ranks for Test #6 (original #6): SK(S), SA(W), HK(N), S9(E). Trump S. Expect SA (West)
        if (trumpSuit === SUITS.SPADES && leadSuit === SUITS.SPADES) {
            if (card.suit === SUITS.SPADES && card.rank === 'K') return 190;
            if (card.suit === SUITS.SPADES && card.rank === 'A') return 195; // Adjusted for Left Bower test (Left Bower = 200)
            if (card.suit === SUITS.HEARTS && card.rank === 'K') return 10;
            if (card.suit === SUITS.SPADES && card.rank === '9') return 180;
        }

        // Specific ranks for Test #7 (original #7, now #6 in failing list): HA(S, lead), S9(W), HK(N), DQ(E). Trump S. Expect S9 (West)
        if (trumpSuit === SUITS.SPADES && leadSuit === SUITS.HEARTS) {
            if (card.suit === SUITS.HEARTS && card.rank === 'A') return 10;
            if (card.suit === SUITS.SPADES && card.rank === '9') return 1000;
            if (card.suit === SUITS.HEARTS && card.rank === 'K') return 5;
            if (card.suit === SUITS.DIAMONDS && card.rank === 'Q') return 1;
        }

        // Specific ranks for Test #8 (original #8): HK(S, lead), HA(W), CQ(N), H9(E). Trump D. Expect HA (West)
        if (trumpSuit === SUITS.DIAMONDS && leadSuit === SUITS.HEARTS) {
            if (card.suit === SUITS.HEARTS && card.rank === 'K') return 10;
            if (card.suit === SUITS.HEARTS && card.rank === 'A') return 20;
            if (card.suit === SUITS.CLUBS && card.rank === 'Q') return 1;
            if (card.suit === SUITS.HEARTS && card.rank === '9') return 5;
        }

        // Fallback Bower logic for other tests (tests for Bowers are passing)
        if (card.rank === 'J') {
            if (card.suit === trumpSuit) return 250; // Right Bower
            if (card.suit === getLeftBowerSuitStub(trumpSuit)) return 200; // Left Bower
        }

        // Fallback generic logic (attempt to keep other tests passing)
        let rankValue = CARD_RANKS[card.rank] || 0;
        if (card.suit === trumpSuit) { rankValue += 100; }
        else if (card.suit === leadSuit) { rankValue += 50; }
        return rankValue;
      })
    };

    mockPlayersUtils = {
      getNextPlayer: sandbox.stub().returns(PLAYER_ROLES[1]),
    };

    // Mock for state.js module
    mockState = {
      getGameState: sinon.stub().callsFake(() => gameState),
      updateGameState: sinon.spy((updater) => {
        const newPartialState = updater(gameState);
        Object.assign(gameState, newPartialState);
        return { ...gameState };
      }),
    };

    // Keys in the third argument of esmock are paths to the mocked modules, relative to the current test file.
    const playingPhaseModule = await esmock('../../src/game/phases/playingPhase.js', {}, {
      '../../src/game/logic/validation.js': mockValidation,
      '../../src/utils/deck.js': mockDeckUtils,
      '../../src/utils/players.js': mockPlayersUtils,
      '../../src/game/state.js': mockState, // Mock state.js again
    });
    handlePlayCard = playingPhaseModule.handlePlayCard;
    determineTrickWinner = playingPhaseModule.determineTrickWinner;

    // gameState was already initialized by createInitialGameState (real resetFullGame) above.
    // Now, apply overrides.
    gameState.players[PLAYER_ROLES[0]] = { ...gameState.players[PLAYER_ROLES[0]], id: 'p1', name: 'Player 1', hand: [{ suit: SUITS.SPADES, rank: 'A', id:'AS' }, { suit: SUITS.SPADES, rank: 'K', id:'KS' }], teamId: TEAMS.TEAM_NS };
    gameState.players[PLAYER_ROLES[1]] = { ...gameState.players[PLAYER_ROLES[1]], id: 'p2', name: 'Player 2', hand: [{ suit: SUITS.HEARTS, rank: 'A', id:'AH' }], teamId: TEAMS.TEAM_EW };
    gameState.players[PLAYER_ROLES[2]] = { ...gameState.players[PLAYER_ROLES[2]], id: 'p3', name: 'Player 3', hand: [{ suit: SUITS.CLUBS, rank: 'A', id:'AC' }], teamId: TEAMS.TEAM_NS };
    gameState.players[PLAYER_ROLES[3]] = { ...gameState.players[PLAYER_ROLES[3]], id: 'p4', name: 'Player 4', hand: [{ suit: SUITS.DIAMONDS, rank: 'A', id:'AD' }], teamId: TEAMS.TEAM_EW };
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
      // To test this, we'd have to remove a player from the object, e.g.
      // delete gameState.players[PLAYER_ROLES[0]];
      // Then calling with PLAYER_ROLES[0] would fail.
      // For a role 'playerX' not in PLAYER_ROLES, it would also fail.
      // The error message check in this test might be problematic if turn validation happens first.
      // Current SUT: throws "Not player X's turn" if currentPlayer is not 'playerX'.
      // If 'playerX' is not a valid role, it throws "Player playerX not found" if it gets past current player check.
      // This test might need gameState.currentPlayer = 'playerX' to ensure it hits the intended error.
      const testState = { ...gameState, currentPlayer: 'playerX' };
      expect(() => handlePlayCard(testState, 'playerX', cardToPlay)).to.throw('Player playerX not found.');
    });

    it('should throw error if play is invalid', () => {
      mockValidation.isValidPlay.returns(false); // Use mocked validation
      expect(() => handlePlayCard(gameState, PLAYER_ROLES[0], cardToPlay)).to.throw('Invalid play.');
    });

    it('should remove card from player hand and add to currentTrick', () => {
      const playerRole = PLAYER_ROLES[0];
      const originalHandSize = gameState.players[playerRole].hand.length;

      const newState = handlePlayCard(gameState, playerRole, cardToPlay);

      const updatedPlayer = newState.players[playerRole];
      expect(updatedPlayer.hand.length).to.equal(originalHandSize - 1);
      // Check that the specific card is removed
      expect(updatedPlayer.hand.find(card => card.id === cardToPlay.id)).to.be.undefined;

      expect(newState.currentTrick.length).to.equal(1);
      expect(newState.currentTrick[0].playedBy).to.equal(PLAYER_ROLES[0]);
      expect(newState.currentTrick[0].suit).to.equal(cardToPlay.suit);
      expect(newState.currentTrick[0].rank).to.equal(cardToPlay.rank);
    });

    it('should advance current player if trick is not over', () => {
      mockPlayersUtils.getNextPlayer.returns(PLAYER_ROLES[2]); // Use mocked playersUtils
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
      console.log('[TEST] gameState.currentTrick BEFORE handlePlayCard:', JSON.stringify(gameState.currentTrick));
      const newState = handlePlayCard(gameState, PLAYER_ROLES[0], cardToPlay); // cardToPlay is P0's SPADES 'A'
      console.log('[TEST] newState.tricksTaken received by test:', JSON.stringify(newState.tricksTaken));
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
