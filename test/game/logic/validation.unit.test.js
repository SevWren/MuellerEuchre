import { expect } from 'chai';
import sinon from 'sinon'; // Import sinon
import esmock from 'esmock';
import { GAME_PHASES, SUITS, PLAYER_ROLES, VALUES } from '../../../src/config/constants.js';
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidBidError,
  InvalidDiscardError,
} from '../../../src/game/logic/errors.js';

describe('Validation Logic - validatePlay', () => {
  let sandbox; // Declare sandbox
  let loggerMock; // Declare loggerMock
  let generalValidatePlay;
  let generalIsLeftBowerMock;

  const baseGameState = {
    gamePhase: GAME_PHASES.PLAYING,
    currentPlayer: PLAYER_ROLES[0], // PLAYER_1
    trumpSuit: SUITS.SPADES,
    currentTrick: [],
    gameId: 'test-game',
  };

  const player1Hand = [
    { id: 'AC', suit: SUITS.CLUBS, value: VALUES.ACE },
    { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING },
    { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE }, // Trump
    { id: 'KS', suit: SUITS.SPADES, value: VALUES.KING }, // Trump
    { id: 'JD', suit: SUITS.DIAMONDS, value: VALUES.JACK }, // Potential Left Bower if Clubs is trump
  ];

  const player1Role = PLAYER_ROLES[0];

  beforeEach(async () => {
    sandbox = sinon.createSandbox(); // Initialize sandbox

    // Mock logger to prevent console output during tests and allow spying
    loggerMock = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
      debug: sandbox.stub(),
    };

    // This mock is for general tests outside of 'Following Suit Logic' or other specific blocks
    generalIsLeftBowerMock = (card, trumpSuit) => {
      if (trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS && card.value === VALUES.JACK) return true;
      if (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES && card.value === VALUES.JACK) return true;
      if (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS && card.value === VALUES.JACK) return true;
      if (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS && card.value === VALUES.JACK) return true;
      return false;
    };

    const validationModule = await esmock('../../../src/game/logic/validation.js', {
      '../../../src/utils/logger.js': loggerMock,
      '../../../src/utils/deck.js': {
        isLeftBower: (card, trumpSuit) => generalIsLeftBowerMock(card, trumpSuit),
      },
    });
    generalValidatePlay = validationModule.validatePlay;
  });

  afterEach(() => {
    sandbox.restore(); // Restore sandbox after each test
  });

  // Test cases for basic argument validation (uses generalValidatePlay)
  it('should throw ValidationError if gameState is missing', () => {
    expect(() => generalValidatePlay(null, player1Hand, player1Hand[0], player1Role)).to.throw(ValidationError, 'Internal error: Missing data for play validation.');
  });
  it('should throw ValidationError if playerHand is missing', () => {
    expect(() => generalValidatePlay(baseGameState, null, player1Hand[0], player1Role)).to.throw(ValidationError, 'Internal error: Missing data for play validation.');
  });
  it('should throw ValidationError if cardToPlay is missing', () => {
    expect(() => generalValidatePlay(baseGameState, player1Hand, null, player1Role)).to.throw(ValidationError, 'Internal error: Missing data for play validation.');
  });
    it('should throw ValidationError if cardToPlay.id is missing', () => {
    expect(() => generalValidatePlay(baseGameState, player1Hand, { suit: SUITS.CLUBS, value: VALUES.ACE }, player1Role)).to.throw(ValidationError, 'Internal error: Missing data for play validation.');
  });
  it('should throw ValidationError if playerRole is missing', () => {
    expect(() => generalValidatePlay(baseGameState, player1Hand, player1Hand[0], null)).to.throw(ValidationError, 'Internal error: Missing data for play validation.');
  });

  // Test case for invalid game phase (uses generalValidatePlay)
  it('should throw InvalidPhaseError if game is not in PLAYING phase', () => {
    const gameState = { ...baseGameState, gamePhase: GAME_PHASES.DEALER_DISCARD };
    expect(() => generalValidatePlay(gameState, player1Hand, player1Hand[0], player1Role)).to.throw(InvalidPhaseError, `Cannot play card during ${GAME_PHASES.DEALER_DISCARD} phase.`);
  });

  // Test case for not player's turn (uses generalValidatePlay)
  it('should throw NotPlayersTurnError if it is not the player\'s turn', () => {
    const gameState = { ...baseGameState, currentPlayer: PLAYER_ROLES[1] }; // PLAYER_2's turn
    expect(() => generalValidatePlay(gameState, player1Hand, player1Hand[0], player1Role)).to.throw(NotPlayersTurnError, `Not ${PLAYER_ROLES[0]}'s turn. It is ${PLAYER_ROLES[1]}'s turn.`);
  });

  // Test case for card not in hand (uses generalValidatePlay)
  it('should throw CardNotInHandError if the card is not in player\'s hand', () => {
    const cardNotInHand = { id: 'QH', suit: SUITS.HEARTS, value: VALUES.QUEEN };
    expect(() => generalValidatePlay(baseGameState, player1Hand, cardNotInHand, player1Role)).to.throw(CardNotInHandError, `Card QH is not in ${player1Role}'s hand.`);
  });

  // Test cases for following suit - This block will manage its own validatePlay and isLeftBowerMock
  describe('Following Suit Logic (General)', () => {
    let validatePlay; // Specific to this describe block
    let isLeftBowerMock; // Specific to this describe block

    beforeEach(async () => {
      // Define the default mock behavior for isLeftBower for tests in this block
      isLeftBowerMock = (card, trumpSuit) => {
        if (trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS && card.value === VALUES.JACK) return true;
        if (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES && card.value === VALUES.JACK) return true;
        if (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS && card.value === VALUES.JACK) return true;
        if (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS && card.value === VALUES.JACK) return true;
        return false;
      };

      const validationModule = await esmock('../../../src/game/logic/validation.js', {
        '../../../src/utils/logger.js': loggerMock,
        '../../../src/utils/deck.js': {
          isLeftBower: (card, trumpSuit) => isLeftBowerMock(card, trumpSuit),
        },
      });
      validatePlay = validationModule.validatePlay;
    });

    it('should allow playing any card if no card has been led (leading the trick)', () => {
      const gameState = { ...baseGameState, currentTrick: [] };
      const cardToPlay = player1Hand[0]; // AC
      expect(() => validatePlay(gameState, player1Hand, cardToPlay, player1Role)).to.not.throw();
      expect(validatePlay(gameState, player1Hand, cardToPlay, player1Role)).to.equal(true);
    });

    it('should allow playing a card of the led suit', () => {
      const ledCard = { card: { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN }, player: PLAYER_ROLES[1] };
      const gameState = { ...baseGameState, currentTrick: [ledCard] }; // trumpSuit is Spades from baseGameState
      const cardToPlay = player1Hand[0]; // AC (Clubs)
      // isLeftBowerMock(AC, Spades) should be false. Effective suit of AC is Clubs.
      // isLeftBowerMock(QC, Spades) should be false. Effective suit of QC is Clubs. Led suit is Clubs.
      expect(() => validatePlay(gameState, player1Hand, cardToPlay, player1Role)).to.not.throw();
      expect(validatePlay(gameState, player1Hand, cardToPlay, player1Role)).to.equal(true);
    });

    it('should throw MustFollowSuitError if player has led suit but plays off-suit', () => {
      const ledCard = { card: { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN }, player: PLAYER_ROLES[1] };
      const gameState = { ...baseGameState, currentTrick: [ledCard], trumpSuit: SUITS.SPADES };
      const cardToPlay = player1Hand[2]; // AS (Spades)
      expect(() => validatePlay(gameState, player1Hand, cardToPlay, player1Role)).to.throw(MustFollowSuitError, 'Must follow suit. Led suit is clubs, attempted to play spades.');
    });

    it('should allow playing an off-suit card if player does not have the led suit', () => {
      const ledCard = { card: { id: 'QH', suit: SUITS.HEARTS, value: VALUES.QUEEN }, player: PLAYER_ROLES[1] };
      const gameState = { ...baseGameState, currentTrick: [ledCard] }; // Led suit is Hearts
      const cardToPlay = player1Hand[0]; // AC (Clubs, player has no Hearts in player1Hand)
      // isLeftBowerMock for QH (Hearts) with Spades trump -> false. Led suit Hearts.
      // Player hand (AC, KC, AS, KS, JD) has no Hearts.
      expect(() => validatePlay(gameState, player1Hand, cardToPlay, player1Role)).to.not.throw();
      expect(validatePlay(gameState, player1Hand, cardToPlay, player1Role)).to.equal(true);
    });

    it('should allow playing any card if the led card suit cannot be determined (e.g. null/undefined card) and log a warning', () => {
        const ledCard = { card: null, player: PLAYER_ROLES[1] };
        const gameState = { ...baseGameState, currentTrick: [ledCard] };
        const cardToPlay = player1Hand[0]; // AC
        expect(() => validatePlay(gameState, player1Hand, cardToPlay, player1Role)).to.not.throw();
        expect(loggerMock.warn.calledOnceWithMatch({ ledCard: null }, "Led card's effective suit could not be determined.")).to.be.true;
    });

  });

  // Test cases for Left Bower specific following suit logic
  describe('Following Suit Logic (Left Bower Scenarios)', () => {
    let validatePlay; // Specific to this describe block
    let isLeftBowerMock; // Specific to this describe block

    // This beforeEach will be overridden by specific tests if needed,
    // but provides a default for this block if a test doesn't redefine it.
    beforeEach(async () => {
        // Default mock for Left Bower scenarios
        isLeftBowerMock = (card, trumpSuit) => {
            // Default behavior: JC is Left Bower if trump is Spades
            if (trumpSuit === SUITS.SPADES && card.id === 'JC') return true;
            // Add other default Left Bower rules if necessary for tests in this block
            return false;
        };

        const validationModule = await esmock('../../../src/game/logic/validation.js', {
            '../../../src/utils/logger.js': loggerMock,
            '../../../src/utils/deck.js': {
                isLeftBower: (card, trumpSuit) => isLeftBowerMock(card, trumpSuit),
            },
        });
        validatePlay = validationModule.validatePlay;
    });

    it('should correctly use trump suit for Left Bower when checking "must follow suit" (player has Left Bower of led suit)', async () => {
      // Redefine isLeftBowerMock specifically for this test's esmock call
      const specificIsLeftBowerMock = (card, trumpSuit) => card.id === 'JC' && trumpSuit === SUITS.SPADES; // JC is SPADES for this test

      const validationModule = await esmock('../../../src/game/logic/validation.js', {
          '../../../src/utils/logger.js': loggerMock,
          '../../../src/utils/deck.js': {
              isLeftBower: (card, trumpSuit) => specificIsLeftBowerMock(card, trumpSuit),
          },
      });
      const validatePlaySpecific = validationModule.validatePlay;

      const localPlayerHand = [
        { id: 'JC', suit: SUITS.CLUBS, value: VALUES.JACK }, // Effective SPADE
        { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN },   // CLUBS
        { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE }, // SPADES
      ];
      const ledCard = { card: { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN }, player: PLAYER_ROLES[1] }; // Led CLUBS
      const gameState = { ...baseGameState, trumpSuit: SUITS.SPADES, currentTrick: [ledCard] };
      const cardToPlay = localPlayerHand[0]; // Playing JC (effective SPADE)

      // specificIsLeftBowerMock(QC, Spades) -> false. Led suit CLUBS.
      // specificIsLeftBowerMock(JC, Spades) -> true. JC is SPADES.
      // specificIsLeftBowerMock(TC, Spades) -> false. TC is CLUBS.
      // Player has TC (true Club), card played JC (Spade). Should throw.
      expect(() => validatePlaySpecific(gameState, localPlayerHand, cardToPlay, player1Role))
        .to.throw(MustFollowSuitError, `Must follow suit. Led suit is ${SUITS.CLUBS}, attempted to play ${SUITS.SPADES}.`);

      // Playing the TC (true Club) should be valid
      const cardToPlayCorrectly = localPlayerHand[1]; // TC
      expect(() => validatePlaySpecific(gameState, localPlayerHand, cardToPlayCorrectly, player1Role)).to.not.throw();
    });

    it('should correctly use trump suit for Left Bower when determining led suit (Left Bower was led)', async () => {
      const specificIsLeftBowerMock = (card, trumpSuit) => card.id === 'JC' && trumpSuit === SUITS.SPADES;  // JC is SPADES for this test

      const validationModule = await esmock('../../../src/game/logic/validation.js', {
          '../../../src/utils/logger.js': loggerMock,
          '../../../src/utils/deck.js': {
              isLeftBower: (card, trumpSuit) => specificIsLeftBowerMock(card, trumpSuit),
          },
      });
      const validatePlaySpecific = validationModule.validatePlay;

      const ledCard = { card: { id: 'JC', suit: SUITS.CLUBS, value: VALUES.JACK }, player: PLAYER_ROLES[1] }; // Led JC (effective Spade)
      const gameState = { ...baseGameState, trumpSuit: SUITS.SPADES, currentTrick: [ledCard] };
      const cardToPlay = player1Hand[2]; // AS (Spade) - follows effective suit (Spades)
      // specificIsLeftBowerMock(JC, Spades) -> true. Led suit SPADES.
      // Player hand (player1Hand) has AS, KS (Spades). Card played AS (Spade). Valid.
      expect(() => validatePlaySpecific(gameState, player1Hand, cardToPlay, player1Role)).to.not.throw();
      expect(validatePlaySpecific(gameState, player1Hand, cardToPlay, player1Role)).to.equal(true);

      // Player plays a Club (AC) when Left Bower (Spade) was led. Player has other spades (AS, KS).
      const cardToPlayWrong = player1Hand[0]; // AC (Club)
      // specificIsLeftBowerMock(AC, Spades) -> false. AC is CLUBS.
      // Player has Spades (AS, KS). Led suit SPADES. Card played CLUBS. Should throw.
      expect(() => validatePlaySpecific(gameState, player1Hand, cardToPlayWrong, player1Role))
        .to.throw(MustFollowSuitError, `Must follow suit. Led suit is ${SUITS.SPADES}, attempted to play ${SUITS.CLUBS}.`);
    });

    it('should allow playing Left Bower if it matches the led suit (which is trump)', async () => {
        const specificIsLeftBowerMock = (card, trumpSuit) => card.id === 'JS' && trumpSuit === SUITS.CLUBS; // JS is CLUBS for this test

        const validationModule = await esmock('../../../src/game/logic/validation.js', {
            '../../../src/utils/logger.js': loggerMock,
            '../../../src/utils/deck.js': {
                isLeftBower: (card, trumpSuit) => specificIsLeftBowerMock(card, trumpSuit),
            },
        });
        const validatePlaySpecific = validationModule.validatePlay;

        const localHand = [
            { id: 'JS', suit: SUITS.SPADES, value: VALUES.JACK }, // Effective Club
            { id: 'AH', suit: SUITS.HEARTS, value: VALUES.ACE },
        ];
        const ledCard = { card: { id: 'AC', suit: SUITS.CLUBS, value: VALUES.ACE }, player: PLAYER_ROLES[1] }; // Led CLUBS
        const gameState = { ...baseGameState, trumpSuit: SUITS.CLUBS, currentTrick: [ledCard] };
        const cardToPlay = localHand[0]; // JS (effective Club)
        // specificIsLeftBowerMock(AC, Clubs) -> false. Led suit CLUBS.
        // specificIsLeftBowerMock(JS, Clubs) -> true. JS is CLUBS.
        // Player has JS (effective Club). Card played JS (effective Club). Valid.
        expect(() => validatePlaySpecific(gameState, localHand, cardToPlay, player1Role)).to.not.throw();
        expect(validatePlaySpecific(gameState, localHand, cardToPlay, player1Role)).to.equal(true);
    });


    it('should throw MustFollowSuitError if player has Left Bower of led suit (trump) but plays non-trump, non-led', async () => {
        const specificIsLeftBowerMock = (card, trumpSuit) => card.id === 'JS' && trumpSuit === SUITS.CLUBS; // JS is CLUBS for this test

        const validationModule = await esmock('../../../src/game/logic/validation.js', {
            '../../../src/utils/logger.js': loggerMock,
            '../../../src/utils/deck.js': {
                isLeftBower: (card, trumpSuit) => specificIsLeftBowerMock(card, trumpSuit),
            },
        });
        const validatePlaySpecific = validationModule.validatePlay;

        const hand = [
            { id: 'JS', suit: SUITS.SPADES, value: VALUES.JACK },   // Effective Club (Trump)
            { id: 'KH', suit: SUITS.HEARTS, value: VALUES.KING },   // Heart (Led suit)
            { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE },   // Spade (Neither) - this is the card to play
        ];
        const ledCardDetails = { card: { id: 'QH', suit: SUITS.HEARTS, value: VALUES.QUEEN }, player: PLAYER_ROLES[1] }; // Led Hearts
        const currentGameState = { ...baseGameState, trumpSuit: SUITS.CLUBS, currentTrick: [ledCardDetails] };
        const cardToAttempt = hand[2]; // AS (Spade)

        // Player has KH (Heart), must play it.
        expect(() => validatePlaySpecific(currentGameState, hand, cardToAttempt, player1Role))
            .to.throw(MustFollowSuitError, `Must follow suit. Led suit is ${SUITS.HEARTS}, attempted to play ${SUITS.SPADES}.`);
    });
  });

  // Valid play scenarios (using generalValidatePlay)
  it('should return true for a straightforward valid play (following non-trump suit)', () => {
    const ledCard = { card: { id: 'QC', suit: SUITS.CLUBS, value: VALUES.QUEEN }, player: PLAYER_ROLES[1] };
    const gameState = { ...baseGameState, currentTrick: [ledCard] };
    const cardToPlay = player1Hand[0]; // AC
    expect(generalValidatePlay(gameState, player1Hand, cardToPlay, player1Role)).to.equal(true);
  });

  it('should return true for playing trump when player has no led suit', () => {
    const ledCard = { card: { id: 'QH', suit: SUITS.HEARTS, value: VALUES.QUEEN }, player: PLAYER_ROLES[1] }; // Led Hearts
    const gameState = { ...baseGameState, currentTrick: [ledCard], trumpSuit: SUITS.SPADES };
    const cardToPlay = player1Hand[2]; // AS (Spades, trump), player has no Hearts
    expect(generalValidatePlay(gameState, player1Hand, cardToPlay, player1Role)).to.equal(true);
  });

    it('should return true when leading with a trump card', () => {
        const gameState = { ...baseGameState, currentTrick: [], trumpSuit: SUITS.SPADES };
        const cardToPlay = player1Hand[2]; // AS (Spades, trump)
        expect(generalValidatePlay(gameState, player1Hand, cardToPlay, player1Role)).to.equal(true);
    });
});

describe('Validation Logic - validateBid', () => {
  let sandbox; // Declare sandbox
  let loggerMock; // Declare loggerMock
  let validateBid; // Will hold the function from the module
  let baseBidGameState;

  beforeEach(async () => {
    sandbox = sinon.createSandbox(); // Initialize sandbox

    // Mock logger to prevent console output during tests and allow spying
    loggerMock = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
      debug: sandbox.stub(),
    };

    // For validateBid, we don't have deck.js dependencies currently, so esmock is simpler
    // If validateBid started using something from deck.js, we'd need to mock it here.
    const validationModule = await esmock('../../../src/game/logic/validation.js', {
      '../../../src/utils/logger.js': loggerMock,
      // No need to mock deck.js for validateBid unless it's used by validateBid
    });
    validateBid = validationModule.validateBid;

    baseBidGameState = {
      gamePhase: GAME_PHASES.ORDER_UP_ROUND1,
      currentPlayer: PLAYER_ROLES[0], // PLAYER_1
      dealer: PLAYER_ROLES[3], // PLAYER_4
      turnCard: { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE },
      bids: [],
      gameId: 'test-bid-game',
    };
  });

  afterEach(() => {
    sandbox.restore(); // Restore sandbox after each test
  });

  // Argument validation
  it('should throw ValidationError if gameState is missing', () => {
    expect(() => validateBid(null, PLAYER_ROLES[0], 'pass')).to.throw(ValidationError, 'Internal error: Missing or invalid data for bid validation.');
  });
  it('should throw ValidationError if playerRole is missing', () => {
    expect(() => validateBid(baseBidGameState, null, 'pass')).to.throw(ValidationError, 'Internal error: Missing or invalid data for bid validation.');
  });
  it('should throw ValidationError if decision is missing', () => {
    expect(() => validateBid(baseBidGameState, PLAYER_ROLES[0], null)).to.throw(ValidationError, 'Internal error: Missing or invalid data for bid validation.');
  });
  it('should throw ValidationError if playerRole is invalid', () => {
    expect(() => validateBid(baseBidGameState, 'invalidRole', 'pass')).to.throw(ValidationError, 'Internal error: Missing or invalid data for bid validation.');
  });

  // Turn validation
  it('should throw NotPlayersTurnError if it is not the current player\'s turn', () => {
    const gameState = { ...baseBidGameState, currentPlayer: PLAYER_ROLES[1] };
    expect(() => validateBid(gameState, PLAYER_ROLES[0], 'pass')).to.throw(NotPlayersTurnError, `Not ${PLAYER_ROLES[0]}'s turn. It is ${PLAYER_ROLES[1]}'s turn.`);
  });

  // Phase validation
  it('should throw InvalidPhaseError if bidding is attempted outside bidding phases', () => {
    const gameState = { ...baseBidGameState, gamePhase: GAME_PHASES.PLAYING };
    expect(() => validateBid(gameState, PLAYER_ROLES[0], 'pass')).to.throw(InvalidPhaseError, `Cannot make bid decision during ${GAME_PHASES.PLAYING} phase.`);
  });

  // Round 1 Bidding Logic
  describe('Round 1 Bidding (ORDER_UP_ROUND1)', () => {
    beforeEach(() => {
      baseBidGameState.gamePhase = GAME_PHASES.ORDER_UP_ROUND1;
    });

    it('should allow "orderUp" decision', () => {
      expect(() => validateBid(baseBidGameState, PLAYER_ROLES[0], 'orderUp')).to.not.throw();
      expect(validateBid(baseBidGameState, PLAYER_ROLES[0], 'orderUp')).to.equal(true);
    });
    it('should allow "pass" decision', () => {
      expect(() => validateBid(baseBidGameState, PLAYER_ROLES[0], 'pass')).to.not.throw();
      expect(validateBid(baseBidGameState, PLAYER_ROLES[0], 'pass')).to.equal(true);
    });
    it('should throw InvalidBidError for "callTrump" decision', () => {
      expect(() => validateBid(baseBidGameState, PLAYER_ROLES[0], 'callTrump', SUITS.CLUBS)).to.throw(InvalidBidError, `Invalid decision 'callTrump' for ${GAME_PHASES.ORDER_UP_ROUND1}.`);
    });
    it('should throw InvalidBidError for other invalid decisions', () => {
      expect(() => validateBid(baseBidGameState, PLAYER_ROLES[0], 'invalidDecision')).to.throw(InvalidBidError, `Invalid decision 'invalidDecision' for ${GAME_PHASES.ORDER_UP_ROUND1}.`);
    });
    it('should allow dealer to "orderUp" (accept turn card)', () => {
      const gameState = { ...baseBidGameState, currentPlayer: PLAYER_ROLES[3] }; // Dealer's turn
      expect(() => validateBid(gameState, PLAYER_ROLES[3], 'orderUp')).to.not.throw();
    });
     it('should allow dealer to "pass"', () => {
      const gameState = { ...baseBidGameState, currentPlayer: PLAYER_ROLES[3] }; // Dealer's turn
      expect(() => validateBid(gameState, PLAYER_ROLES[3], 'pass')).to.not.throw();
    });
  });

  // Round 2 Bidding Logic
  describe('Round 2 Bidding (ORDER_UP_ROUND2)', () => {
    beforeEach(() => {
      baseBidGameState.gamePhase = GAME_PHASES.ORDER_UP_ROUND2;
      baseBidGameState.turnCard = { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE }; // Assume Spades was turned down
      baseBidGameState.bids = [ // Simulate previous passes
        { player: PLAYER_ROLES[0], decision: 'pass', round: 1 },
        { player: PLAYER_ROLES[1], decision: 'pass', round: 1 },
        { player: PLAYER_ROLES[2], decision: 'pass', round: 1 },
        { player: PLAYER_ROLES[3], decision: 'pass', round: 1 }, // Dealer passed on turn card
      ];
    });

    it('should allow "callTrump" decision with a valid suit (not the turned down suit)', () => {
      expect(() => validateBid(baseBidGameState, PLAYER_ROLES[0], 'callTrump', SUITS.CLUBS)).to.not.throw();
      expect(validateBid(baseBidGameState, PLAYER_ROLES[0], 'callTrump', SUITS.CLUBS)).to.equal(true);
    });
    it('should allow "pass" decision (if not stick the dealer)', () => {
      expect(() => validateBid(baseBidGameState, PLAYER_ROLES[0], 'pass')).to.not.throw();
      expect(validateBid(baseBidGameState, PLAYER_ROLES[0], 'pass')).to.equal(true);
    });
    it('should throw InvalidBidError for "orderUp" decision', () => {
      expect(() => validateBid(baseBidGameState, PLAYER_ROLES[0], 'orderUp')).to.throw(InvalidBidError, `Invalid decision 'orderUp' for ${GAME_PHASES.ORDER_UP_ROUND2}.`);
    });
    it('should throw InvalidBidError for "callTrump" with an invalid suit string', () => {
      expect(() => validateBid(baseBidGameState, PLAYER_ROLES[0], 'callTrump', 'invalidSuit')).to.throw(InvalidBidError, 'Invalid suit provided for callTrump decision.');
    });
    it('should throw InvalidBidError for "callTrump" with no suit', () => {
      expect(() => validateBid(baseBidGameState, PLAYER_ROLES[0], 'callTrump', null)).to.throw(InvalidBidError, 'Invalid suit provided for callTrump decision.');
    });
    it('should throw InvalidBidError for "callTrump" with the turned down suit', () => {
      expect(() => validateBid(baseBidGameState, PLAYER_ROLES[0], 'callTrump', SUITS.SPADES)).to.throw(InvalidBidError, `Cannot call the suit that was turned down (${SUITS.SPADES}).`);
    });

    describe('Stick the Dealer rule', () => {
      beforeEach(() => {
        // Simulate 3 passes in round 2, making it dealer's turn
        baseBidGameState.currentPlayer = PLAYER_ROLES[3]; // Dealer's turn
        baseBidGameState.bids.push(
          { player: PLAYER_ROLES[0], decision: 'pass', round: 2 },
          { player: PLAYER_ROLES[1], decision: 'pass', round: 2 },
          { player: PLAYER_ROLES[2], decision: 'pass', round: 2 }
        );
      });

      it('should throw InvalidBidError if dealer tries to "pass" (stick the dealer)', () => {
        expect(() => validateBid(baseBidGameState, PLAYER_ROLES[3], 'pass')).to.throw(InvalidBidError, 'Dealer must call a suit in this situation (stick the dealer).');
      });
      it('should allow dealer to "callTrump" with a valid suit (stick the dealer)', () => {
        expect(() => validateBid(baseBidGameState, PLAYER_ROLES[3], 'callTrump', SUITS.CLUBS)).to.not.throw();
      });
       it('should throw InvalidBidError if dealer tries to "callTrump" with turned down suit (stick the dealer)', () => {
        expect(() => validateBid(baseBidGameState, PLAYER_ROLES[3], 'callTrump', SUITS.SPADES)).to.throw(InvalidBidError, `Cannot call the suit that was turned down (${SUITS.SPADES}).`);
       });
     });
   });
});

describe('Validation Logic - validateDealerDiscard', () => {
  let sandbox; // Declare sandbox
  let loggerMock; // Declare loggerMock
  let validateDealerDiscard;
  let baseDiscardGameState;
  let dealerHand; // Should contain 6 cards for valid scenarios
  const dealerRole = PLAYER_ROLES[0]; // Assume Player 1 is dealer for these tests
  const cardToDiscard = { id: 'TC', suit: SUITS.CLUBS, value: VALUES.TEN }; // A card presumed to be in hand

  beforeEach(async () => {
    sandbox = sinon.createSandbox(); // Initialize sandbox

    // Mock logger to prevent console output during tests and allow spying
    loggerMock = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
      debug: sandbox.stub(),
    };

    const validationModule = await esmock('../../../src/game/logic/validation.js', {
      '../../../src/utils/logger.js': loggerMock,
      // No deck.js dependency for validateDealerDiscard
    });
    validateDealerDiscard = validationModule.validateDealerDiscard;

    dealerHand = [
      { id: 'AC', suit: SUITS.CLUBS, value: VALUES.ACE },
      { id: 'KC', suit: SUITS.CLUBS, value: VALUES.KING },
      cardToDiscard, // TC
      { id: 'AS', suit: SUITS.SPADES, value: VALUES.ACE },
      { id: 'KS', suit: SUITS.SPADES, value: VALUES.KING },
      { id: 'JD', suit: SUITS.DIAMONDS, value: VALUES.JACK },
    ];

    baseDiscardGameState = {
      gamePhase: GAME_PHASES.DEALER_DISCARD,
      dealer: dealerRole,
      currentPlayer: dealerRole, // Dealer's turn to discard
      gameId: 'test-discard-game',
      // Other properties like turnCard, bids might not be directly relevant for these validations
      // but can be added if specific scenarios need them.
    };
  });

  afterEach(() => {
    sandbox.restore(); // Restore sandbox after each test
  });

  // Argument validation
  it('should throw ValidationError if gameState is missing', () => {
    expect(() => validateDealerDiscard(null, dealerRole, cardToDiscard, dealerHand)).to.throw(ValidationError, 'Internal error: Missing data for discard validation.');
  });
  it('should throw ValidationError if playerRole is missing', () => {
    expect(() => validateDealerDiscard(baseDiscardGameState, null, cardToDiscard, dealerHand)).to.throw(ValidationError, 'Internal error: Missing data for discard validation.');
  });
  it('should throw ValidationError if cardToDiscard is missing', () => {
    expect(() => validateDealerDiscard(baseDiscardGameState, dealerRole, null, dealerHand)).to.throw(ValidationError, 'Internal error: Missing data for discard validation.');
  });
  it('should throw ValidationError if cardToDiscard.id is missing', () => {
    const invalidCard = { suit: SUITS.CLUBS, value: VALUES.TEN }; // Missing id
    expect(() => validateDealerDiscard(baseDiscardGameState, dealerRole, invalidCard, dealerHand)).to.throw(ValidationError, 'Internal error: Missing data for discard validation.');
  });
  it('should throw ValidationError if playerHand is missing', () => {
    expect(() => validateDealerDiscard(baseDiscardGameState, dealerRole, cardToDiscard, null)).to.throw(ValidationError, 'Internal error: Missing data for discard validation.');
  });

  // Phase validation
  it('should throw InvalidPhaseError if not in DEALER_DISCARD phase', () => {
    const gameState = { ...baseDiscardGameState, gamePhase: GAME_PHASES.PLAYING };
    expect(() => validateDealerDiscard(gameState, dealerRole, cardToDiscard, dealerHand)).to.throw(InvalidPhaseError, `Cannot discard card during ${GAME_PHASES.PLAYING} phase.`);
  });

  // Dealer validation
  it('should throw InvalidDiscardError if playerRole is not the dealer', () => {
    const nonDealerRole = PLAYER_ROLES[1];
    const gameState = { ...baseDiscardGameState, dealer: dealerRole, currentPlayer: nonDealerRole }; // Still dealerRole in gameState.dealer, but nonDealerRole is attempting
    // To make this test meaningful, current player should also be the nonDealerRole if game logic enforces that only current player can act
    // However, this specific check is about *being* the dealer vs. *not being* the dealer.
    expect(() => validateDealerDiscard(gameState, nonDealerRole, cardToDiscard, dealerHand)).to.throw(InvalidDiscardError, `Only the dealer (${dealerRole}) can discard. Player ${nonDealerRole} attempted.`);
  });

  // Turn validation
  it('should throw NotPlayersTurnError if it is not the current player\'s turn (even if player is dealer)', () => {
    const gameState = { ...baseDiscardGameState, currentPlayer: PLAYER_ROLES[1] }; // Dealer is player1, but current player is player2
    expect(() => validateDealerDiscard(gameState, dealerRole, cardToDiscard, dealerHand)).to.throw(NotPlayersTurnError, `Not ${dealerRole}'s turn. It is ${PLAYER_ROLES[1]}'s turn.`);
  });

  // Card in hand validation
  it('should throw CardNotInHandError if cardToDiscard is not in dealerHand', () => {
    const cardNotInHand = { id: 'QH', suit: SUITS.HEARTS, value: VALUES.QUEEN };
    expect(() => validateDealerDiscard(baseDiscardGameState, dealerRole, cardNotInHand, dealerHand)).to.throw(CardNotInHandError, `Card QH is not in dealer's hand to discard.`);
  });

  // Valid discard
  it('should return true for a valid discard scenario', () => {
    expect(() => validateDealerDiscard(baseDiscardGameState, dealerRole, cardToDiscard, dealerHand)).to.not.throw();
    expect(validateDealerDiscard(baseDiscardGameState, dealerRole, cardToDiscard, dealerHand)).to.equal(true);
  });

  it('should not throw error if hand size is not 6, but log a warning (as per current implementation)', () => {
    const smallerHand = dealerHand.slice(0, 5);
    // Ensure the card to discard is still in the smaller hand for this test to be valid for other checks
    const cardInSmallerHand = smallerHand[2];
    // loggerMock.warn should be called, but the function itself should not throw for this reason.
    expect(() => validateDealerDiscard(baseDiscardGameState, dealerRole, cardInSmallerHand, smallerHand)).to.not.throw();
    // TODO: Add a spy on logger.warn and assert it was called, if possible with current tools. For now, just checking no throw.
  });
});

describe('Sanity check', () => {
  it('should run tests and output this line', () => {
    console.log('Sanity check: test is running');
  });
});

// Add other validation function tests here as needed
