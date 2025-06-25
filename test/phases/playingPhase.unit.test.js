import { expect } from 'chai';
import sinon from 'sinon';
import esmock from 'esmock';
import { GAME_PHASES, PLAYER_ROLES, SUITS, TEAMS, VALUES } from '../../src/config/constants.js';
import {
  PhaseLogicError,
  NotPlayersTurnError,
  InvalidPhaseError,
  CardNotInHandError,
  MustFollowSuitError,
  ValidationError, // Though validatePlay throws this, direct import might be useful
} from '../../src/game/logic/errors.js';
import { createDeck, shuffleDeck } from '../../src/utils/deck.js'; // For test data setup
import { initializePlayers, getNextPlayer as originalGetNextPlayer } from '../../src/utils/players.js'; // For test data setup

// Mock logger
const loggerMock = {
  info: sinon.stub(),
  warn: sinon.stub(),
  error: sinon.stub(),
  debug: sinon.stub(),
};

// Helper to create a base game state for playing phase tests
const createPlayingGameState = () => {
  let initialPlayerObjects = initializePlayers();
  let deck = shuffleDeck(createDeck());
  const playerHands = {};

  PLAYER_ROLES.forEach(role => {
    playerHands[role] = [];
    for (let i = 0; i < 5; i++) { // Deal 5 cards each
      if (deck.length > 0) playerHands[role].push(deck.pop());
    }
  });

  const playersWithHands = PLAYER_ROLES.reduce((acc, role) => {
    acc[role] = { ...initialPlayerObjects[role], hand: playerHands[role] || [] };
    return acc;
  }, {});

  return {
    gameId: 'playingPhaseTestGame',
    gamePhase: GAME_PHASES.PLAYING,
    players: playersWithHands,
    dealer: PLAYER_ROLES[0], // South
    currentPlayer: PLAYER_ROLES[1], // West leads
    trumpSuit: SUITS.SPADES,
    makerTeam: TEAMS.TEAM_NS, // Assuming NS ordered up
    playerWhoOrderedUp: PLAYER_ROLES[0], // South
    currentTrick: [],
    tricksTaken: { [TEAMS.TEAM_NS]: 0, [TEAMS.TEAM_EW]: 0 },
    gameMessages: [],
    settings: { winningScore: 10 },
  };
};

describe('PlayingPhase Logic', () => {
  afterEach(() => {
    sinon.restore();
    loggerMock.info.resetHistory();
    loggerMock.warn.resetHistory();
    loggerMock.error.resetHistory();
    loggerMock.debug.resetHistory();
  });

  describe('handlePlayCard', () => {
    let handlePlayCard;
    let validatePlayMock;
    let getCardRankMock;
    let getNextPlayerMock;
    let baseGameState;

    beforeEach(async () => {
      validatePlayMock = sinon.stub();
      getCardRankMock = sinon.stub();
      getNextPlayerMock = sinon.stub().returns(PLAYER_ROLES[2]); // Default next player (North)

      const playingPhaseModule = await esmock('../../src/game/phases/playingPhase.js', {
        '../../src/game/logic/validation.js': { validatePlay: validatePlayMock },
        '../../src/utils/deck.js': { getCardRank: getCardRankMock },
        '../../src/utils/players.js': { getNextPlayer: getNextPlayerMock },
        '../../src/utils/logger.js': loggerMock, // Assuming playingPhase.js might use logger directly
        '../../src/game/state.js': { // Mock updateGameState to simplify state checks
            updateGameState: (fn) => {
                const current = JSON.parse(JSON.stringify(baseGameState)); // Simulate access to current state
                const changes = fn(current);
                baseGameState = { ...current, ...changes}; // Apply changes to our test's baseGameState
                return baseGameState;
            }
        },
        // '../../game/logic/errors.js': { PhaseLogicError, NotPlayersTurnError, InvalidPhaseError }
        '../../src/game/logic/errors.js': { PhaseLogicError, NotPlayersTurnError, InvalidPhaseError }        
      });
      handlePlayCard = playingPhaseModule.handlePlayCard;
      baseGameState = createPlayingGameState();
    });

    it('should throw PhaseLogicError if player is not found', () => {
      const cardPlayed = baseGameState.players[PLAYER_ROLES[1]].hand[0];
      expect(() => handlePlayCard(baseGameState, 'nonExistentPlayer', cardPlayed))
        .to.throw(PhaseLogicError, /Player nonExistentPlayer not found/);
    });

    it('should call validatePlay with correct arguments', () => {
      const playerRole = PLAYER_ROLES[1]; // West
      const cardPlayed = baseGameState.players[playerRole].hand[0];
      validatePlayMock.returns(true); // Assume valid play

      const gameStateAtCallTime = JSON.parse(JSON.stringify(baseGameState)); // Snapshot before call
      handlePlayCard(baseGameState, playerRole, cardPlayed);

      // Use sinon.match. Mocks for complex objects or a snapshot
      // For simplicity with current tools, checking specific properties or using a matcher if available
      // Here, ensuring it's called with an object that has the same gameId, and other specific args.
      expect(validatePlayMock.calledOnceWith(
        sinon.match.has('gameId', gameStateAtCallTime.gameId), // Ensures it's a game state object
        gameStateAtCallTime.players[playerRole].hand,          // Exact hand reference at call time
        cardPlayed,                                            // Exact card object
        playerRole                                             // Exact role
      )).to.be.true;
    });

    it('should propagate CardNotInHandError from validatePlay', () => {
      const playerRole = PLAYER_ROLES[1];
      const cardPlayed = { id: 'XX', suit: SUITS.CLUBS, value: 'X' }; // Not in hand
      validatePlayMock.throws(new CardNotInHandError("Card not in hand."));
      expect(() => handlePlayCard(baseGameState, playerRole, cardPlayed)).to.throw(CardNotInHandError);
    });

    it('should propagate MustFollowSuitError from validatePlay', () => {
      const playerRole = PLAYER_ROLES[1];
      const cardPlayed = baseGameState.players[playerRole].hand[0];
      validatePlayMock.throws(new MustFollowSuitError("Must follow suit."));
      expect(() => handlePlayCard(baseGameState, playerRole, cardPlayed)).to.throw(MustFollowSuitError);
    });


    it('should play a card, update hand, currentTrick, and currentPlayer if trick is not over', () => {
      const playerRole = PLAYER_ROLES[1]; // West
      const cardToPlay = baseGameState.players[playerRole].hand[0];
      const initialHandSize = baseGameState.players[playerRole].hand.length;
      validatePlayMock.returns(true);
      getNextPlayerMock.returns(PLAYER_ROLES[2]); // North next

      const newState = handlePlayCard(baseGameState, playerRole, cardToPlay);

      expect(newState.players[playerRole].hand.length).to.equal(initialHandSize - 1);
      expect(newState.players[playerRole].hand.some(c => c.id === cardToPlay.id)).to.be.false;
      expect(newState.currentTrick.length).to.equal(1);
      expect(newState.currentTrick[0].id).to.equal(cardToPlay.id);
      expect(newState.currentTrick[0].playedBy).to.equal(playerRole);
      expect(newState.currentPlayer).to.equal(PLAYER_ROLES[2]); // North
    });

    it('should determine trick winner and update state if trick is over (not last trick)', () => {
      const player1 = PLAYER_ROLES[1]; // West (current)
      const player2 = PLAYER_ROLES[2]; // North
      const player3 = PLAYER_ROLES[3]; // East
      const player4 = PLAYER_ROLES[0]; // South (dealer)

      baseGameState.currentTrick = [ // 3 cards already played
        { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN, playedBy: player1 },
        { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN, playedBy: player2 },
        { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING, playedBy: player3 },
      ];
      baseGameState.currentPlayer = player4; // South's turn

      const aceOfSpades = { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE };
      // Ensure player4 has this card and it's the one played
      // Remove it from other hands if it exists, then add to player4's hand
      PLAYER_ROLES.forEach(role => {
        baseGameState.players[role].hand = baseGameState.players[role].hand.filter(c => c.id !== aceOfSpades.id);
      });
      baseGameState.players[player4].hand = [aceOfSpades, ...baseGameState.players[player4].hand.slice(0,4)]; // Ensure 5 cards
      const cardToPlay = aceOfSpades; // South plays Ace of Spades

      baseGameState.trumpSuit = SUITS.SPADES; // Explicitly set trump for the test scenario

      validatePlayMock.returns(true);

      getCardRankMock.callsFake((card, trumpSuitInput, leadSuitInput) => {
        const effectiveTrumpSuit = SUITS.SPADES; // Trump for this test
        const effectiveLeadSuit = SUITS.CLUBS;  // Lead suit for this test trick

        if (card.suit === effectiveTrumpSuit) return 200 + Object.values(VALUES).indexOf(card.value);
        if (card.suit === effectiveLeadSuit) return 100 + Object.values(VALUES).indexOf(card.value);
        return Object.values(VALUES).indexOf(card.value);
      });

      const newState = handlePlayCard(baseGameState, player4, cardToPlay);

      expect(newState.currentTrick.length).to.equal(0);
      expect(newState.tricksTaken[TEAMS.TEAM_NS]).to.equal(1); // South is on TEAM_NS
      expect(newState.currentPlayer).to.equal(player4);
    });

    it('should throw PhaseLogicError if winner teamId cannot be determined', () => {
        baseGameState.currentPlayer = PLAYER_ROLES[0]; // South
        const cardToPlay = baseGameState.players[PLAYER_ROLES[0]].hand[0];
        baseGameState.currentTrick = [
            { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN, playedBy: PLAYER_ROLES[1] },
            { id: 'JC', suit: SUITS.CLUBS, value: VALUES.JACK, playedBy: PLAYER_ROLES[2] },
            { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN, playedBy: PLAYER_ROLES[3] },
        ];
        validatePlayMock.returns(true);
        getCardRankMock.returns(1); // Make it simple, first card wins

        // Modify a player object to lack teamId
        const originalPlayer0Data = baseGameState.players[PLAYER_ROLES[0]];
        baseGameState.players[PLAYER_ROLES[0]] = { ...originalPlayer0Data }; // Clone
        delete baseGameState.players[PLAYER_ROLES[0]].teamId; // Remove teamId from winner

        // This setup assumes player0 (South) will win the trick.
        // We need to ensure getCardRank makes player0's card the winner.
        // Let's make player1 (West) the leader of the current trick.
        baseGameState.currentTrick[0].playedBy = PLAYER_ROLES[1]; // West led
        // South (player0) is current player
        baseGameState.currentPlayer = PLAYER_ROLES[0];
        // To ensure South wins, let's say South plays a high trump
        const southCard = {id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE}; // Trump
        baseGameState.players[PLAYER_ROLES[0]].hand.push(southCard); // Add to hand temporarily

        getCardRankMock.callsFake((card, trumpSuit, leadSuit) => {
            if (card.id === 'AS') return 100; // South wins
            return 10; // Others lose
        });

        expect(() => handlePlayCard(baseGameState, PLAYER_ROLES[0], southCard))
            .to.throw(PhaseLogicError, /Could not determine teamId for trick winner/);
    });

    it('should transition to SCORING phase if hand is over (5 tricks played)', () => {
      baseGameState.currentPlayer = PLAYER_ROLES[0]; // South
      const cardToPlay = baseGameState.players[PLAYER_ROLES[0]].hand[0];
      baseGameState.currentTrick = [ /* 3 cards */
        { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN, playedBy: PLAYER_ROLES[1] },
        { id: 'JC', suit: SUITS.CLUBS, value: VALUES.JACK, playedBy: PLAYER_ROLES[2] },
        { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN, playedBy: PLAYER_ROLES[3] },
      ];
      // Simulate 4 tricks already taken by one team to make this the 5th trick
      baseGameState.tricksTaken[TEAMS.TEAM_NS] = 4;

      validatePlayMock.returns(true);
      getCardRankMock.returns(100); // Make current player (South) win the trick

      const newState = handlePlayCard(baseGameState, PLAYER_ROLES[0], cardToPlay);

      expect(newState.gamePhase).to.equal(GAME_PHASES.SCORING);
      expect(newState.currentPlayer).to.be.null; // Or whoever starts scoring
    });
  });

  describe('determineTrickWinner', () => {
    let determineTrickWinner;
    let getCardRankMock;

    beforeEach(async () => {
      getCardRankMock = sinon.stub();
      const playingPhaseModule = await esmock('../../src/game/phases/playingPhase.js', {
        '../../src/utils/deck.js': { getCardRank: getCardRankMock },
        // Mock other dependencies if determineTrickWinner starts using them
        '../../src/utils/logger.js': loggerMock,
      });
      determineTrickWinner = playingPhaseModule.determineTrickWinner;
    });

    it('should throw PhaseLogicError if trick does not have 4 cards', () => {
      const trick = [{ id: 'AC', suit: SUITS.CLUBS, value: VALUES.ACE, playedBy: PLAYER_ROLES[0] }];
      expect(() => determineTrickWinner(trick, SUITS.SPADES, PLAYER_ROLES[0]))
        .to.throw(PhaseLogicError, 'Trick must have 4 cards to determine a winner.');
    });

    it('should correctly determine winner based on getCardRank outputs', () => {
      const trick = [
        { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN, playedBy: PLAYER_ROLES[0] }, // Lead
        { id: 'JC', suit: SUITS.CLUBS, value: VALUES.JACK, playedBy: PLAYER_ROLES[1] },
        { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE, playedBy: PLAYER_ROLES[2] }, // Trump wins
        { id: 'QS', suit: SUITS.SPADES, value: VALUES.QUEEN, playedBy: PLAYER_ROLES[3] },// Lower trump
      ];
      const trumpSuit = SUITS.SPADES;
      const leadSuit = SUITS.CLUBS;

      getCardRankMock.callsFake((card, activeTrumpSuit, activeLeadSuit) => {
        expect(activeTrumpSuit).to.equal(trumpSuit);
        expect(activeLeadSuit).to.equal(leadSuit); // Check leadSuit is passed correctly
        if (card.id === 'AS') return 100; // Ace of Spades is highest
        if (card.id === 'QS') return 90;
        if (card.id === 'JC') return 80;
        if (card.id === 'TC') return 70;
        return 0;
      });

      const winner = determineTrickWinner(trick, trumpSuit, PLAYER_ROLES[0]);
      expect(winner).to.equal(PLAYER_ROLES[2]); // Player who played Ace of Spades
      expect(getCardRankMock.callCount).to.equal(4 * 2 - 2); // (n*2 - 2) comparisons for n cards after first
    });
  });
});
