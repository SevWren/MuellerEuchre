// filepath: test/game/logic/validation.unit.test.js
import { expect } from "chai";
import sinon from "sinon";
import { esmockWithPaths } from "../../utils/esmock_wrapper.js";

// CORRECTED: Use relative paths for the test file's own imports
import {
  GAME_PHASES,
  SUITS,
  PLAYER_ROLES,
  VALUES,
} from "../../../src/config/constants.js";
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  CardNotInHandError,
  MustFollowSuitError,
  InvalidBidError,
  InvalidDiscardError,
} from "../../../src/game/logic/errors.js";

describe("Validation Logic - validatePlay", () => {
  let sandbox; // Declare sandbox
  let loggerMock; // Declare loggerMock
  let generalIsLeftBowerMock;
  let generalValidatePlay;

  const baseGameState = {
    gamePhase: GAME_PHASES.PLAYING,
    currentPlayer: PLAYER_ROLES[0], // south
    trumpSuit: SUITS.SPADES,
    currentTrick: [],
    gameId: "test-game",
  };

  const player1Hand = [
    { id: "AC", suit: SUITS.CLUBS, value: VALUES.ACE },
    { id: "KC", suit: SUITS.CLUBS, value: VALUES.KING },
    { id: "AS", suit: SUITS.SPADES, value: VALUES.ACE }, // Trump
    { id: "KS", suit: SUITS.SPADES, value: VALUES.KING }, // Trump
    { id: "JD", suit: SUITS.DIAMONDS, value: VALUES.JACK }, // Potential Left Bower if Clubs is trump
  ];

  const player1Role = PLAYER_ROLES[0];

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    // Initialize logger mock with all required methods
    loggerMock = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
      debug: sandbox.stub(),
    };

    // Define the general mock for isLeftBower
    generalIsLeftBowerMock = (card, trumpSuit) => {
      if (!card || !trumpSuit) return false;
      
      // Check for left bower (jack of same color as trump)
      if (card.value === VALUES.JACK) {
        if (trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS) return true;
        if (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES) return true;
        if (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS) return true;
        if (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS) return true;
      }
      return false;
    };

    // Import the validation module with esmockWithPaths
    const validationModule = await esmockWithPaths(
      import.meta.url,
      '../../../src/game/logic/validation.js',
      {
        // Match the exact import paths used in the source file
        '../../utils/logger.js': loggerMock,
        '../../utils/deck.js': {
          isLeftBower: generalIsLeftBowerMock,
          areSameColor: (suit1, suit2) => {
            // Simple color check for testing
            const colors = {
              [SUITS.SPADES]: 'black',
              [SUITS.CLUBS]: 'black',
              [SUITS.HEARTS]: 'red',
              [SUITS.DIAMONDS]: 'red'
            };
            return colors[suit1] === colors[suit2];
          }
        }
      }
    );
    
    generalValidatePlay = validationModule.validatePlay;
  });

  afterEach(() => {
    sandbox.restore(); // Restore sandbox after each test
  });

  // Test cases for basic argument validation (uses generalValidatePlay)
  it("should throw ValidationError if gameState is missing", () => {
    expect(() =>
      generalValidatePlay(null, player1Hand, player1Hand[0], player1Role)
    ).to.throw(
      ValidationError,
      /Internal error: Missing data for play validation/
    );
  });
  it("should throw ValidationError if playerHand is missing", () => {
    expect(() =>
      generalValidatePlay(baseGameState, null, player1Hand[0], player1Role)
    ).to.throw(
      ValidationError,
      /Internal error: Missing data for play validation/
    );
  });
  it("should throw ValidationError if cardToPlay is missing", () => {
    expect(() =>
      generalValidatePlay(baseGameState, player1Hand, null, player1Role)
    ).to.throw(
      ValidationError,
      /Internal error: Missing data for play validation/
    );
  });
  it("should throw ValidationError if cardToPlay.id is missing", () => {
    expect(() =>
      generalValidatePlay(
        baseGameState,
        player1Hand,
        { suit: SUITS.CLUBS, value: VALUES.ACE },
        player1Role
      )
    ).to.throw(
      ValidationError,
      /Internal error: Missing data for play validation/
    );
  });
  it("should throw ValidationError if playerRole is missing", () => {
    expect(() =>
      generalValidatePlay(baseGameState, player1Hand, player1Hand[0], null)
    ).to.throw(
      ValidationError,
      /Internal error: Missing data for play validation/
    );
  });

  // Test case for invalid game phase (uses generalValidatePlay)
  it("should throw InvalidPhaseError if game is not in PLAYING phase", () => {
    const gameState = {
      ...baseGameState,
      gamePhase: GAME_PHASES.DEALER_DISCARD,
    };
    expect(
      () =>
        generalValidatePlay(gameState, player1Hand, player1Hand[0], player1Role)
    ).to.throw(InvalidPhaseError, /Cannot play card during .* phase/);
  });

  // Test case for not player's turn (uses generalValidatePlay)
  it("should throw NotPlayersTurnError if it is not the player's turn", () => {
    const gameState = { ...baseGameState, currentPlayer: PLAYER_ROLES[1] }; // west's turn
    expect(() =>
      generalValidatePlay(gameState, player1Hand, player1Hand[0], player1Role)
    ).to.throw(NotPlayersTurnError, /Not .*'s turn\. It is .*'s turn\./);
  });

  // Test case for card not in hand (uses generalValidatePlay)
  it("should throw CardNotInHandError if the card is not in player's hand", () => {
    const cardNotInHand = { id: "QH", suit: SUITS.HEARTS, value: VALUES.QUEEN };
    expect(() =>
      generalValidatePlay(
        baseGameState,
        player1Hand,
        cardNotInHand,
        player1Role
      )
    ).to.throw(CardNotInHandError, /Card QH is not in .*'s hand/);
  });

  // Test cases for following suit - This block will manage its own validatePlay and isLeftBowerMock
  describe("Following Suit Logic (General)", () => {
    let validatePlay;
    let isLeftBowerMock;
    let loggerMock;

    beforeEach(async () => {
      // Reset mocks
      loggerMock = {
        info: sandbox.stub(),
        warn: sandbox.stub(),
        error: sandbox.stub(),
        debug: sandbox.stub(),
      };

      // Define the mock behavior for isLeftBower for this test block
      isLeftBowerMock = (card, trumpSuit) => {
        // Only Jack of same color but different suit is Left Bower
        if (!card || card.value !== VALUES.JACK) return false;

        if (trumpSuit === SUITS.SPADES && card.suit === SUITS.CLUBS) return true;
        if (trumpSuit === SUITS.CLUBS && card.suit === SUITS.SPADES)
          return true;
        if (trumpSuit === SUITS.HEARTS && card.suit === SUITS.DIAMONDS)
          return true;
        if (trumpSuit === SUITS.DIAMONDS && card.suit === SUITS.HEARTS)
          return true;

        return false;
      };

      const validationModule = await esmockWithPaths(
        import.meta.url,
        '../../../src/game/logic/validation.js',
        {
          // Match the exact import paths used in the source file
          '../../utils/logger.js': loggerMock,
          '../../utils/deck.js': {
            isLeftBower: (card, trumpSuit) => isLeftBowerMock(card, trumpSuit),
            areSameColor: (suit1, suit2) => {
              // Mock areSameColor for testing
              if (suit1 === suit2) return true;
              if (
                (suit1 === SUITS.SPADES && suit2 === SUITS.CLUBS) ||
                (suit1 === SUITS.CLUBS && suit2 === SUITS.SPADES) ||
                (suit1 === SUITS.HEARTS && suit2 === SUITS.DIAMONDS) ||
                (suit1 === SUITS.DIAMONDS && suit2 === SUITS.HEARTS)
              ) {
                return true;
              }
              return false;
            }
          }
        }
      );
      validatePlay = validationModule.validatePlay;
    });

    it("should allow playing any card if no card has been led (leading the trick)", () => {
      const gameState = { ...baseGameState, currentTrick: [] };
      const cardToPlay = player1Hand[0]; // AC
      expect(() =>
        validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      ).to.not.throw();
      expect(
        validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      ).to.equal(true);
    });

    it("should allow playing a card of the led suit", () => {
      const ledCard = {
        card: { id: "QC", suit: SUITS.CLUBS, value: VALUES.QUEEN },
        player: PLAYER_ROLES[1],
      };
      const gameState = { ...baseGameState, currentTrick: [ledCard] }; // trumpSuit is Spades from baseGameState
      const cardToPlay = player1Hand[0]; // AC (Clubs)
      expect(() =>
        validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      ).to.not.throw();
      expect(
        validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      ).to.equal(true);
    });

    it("should throw MustFollowSuitError if player has the led suit but plays an off-suit card", async () => {
      const isLeftBowerStub = sinon.stub().returns(false);
      
      const validationModule = await esmockWithPaths(
        import.meta.url,
        '../../../src/game/logic/validation.js',
        {
          '../../utils/logger.js': loggerMock,
          '../../utils/deck.js': {
            isLeftBower: isLeftBowerStub,
            areSameColor: (suit1, suit2) => {
              const colors = {
                [SUITS.SPADES]: 'black',
                [SUITS.CLUBS]: 'black',
                [SUITS.HEARTS]: 'red',
                [SUITS.DIAMONDS]: 'red'
              };
              return colors[suit1] === colors[suit2];
            }
          }
        }
      );
      
      const validatePlay = validationModule.validatePlay;
      
      const testHand = [
        { id: "AC", suit: SUITS.CLUBS, value: VALUES.ACE },
        { id: "KC", suit: SUITS.CLUBS, value: VALUES.KING },
        { id: "AS", suit: SUITS.SPADES, value: VALUES.ACE }
      ];
      
      const ledCardDetails = {
        card: { id: "QC", suit: SUITS.CLUBS, value: VALUES.QUEEN },
        player: PLAYER_ROLES[1],
      };
      
      const gameState = {
        ...baseGameState,
        currentTrick: [ledCardDetails],
        trumpSuit: SUITS.SPADES,
      };

      const cardToAttempt = {
        id: "AS",
        suit: SUITS.SPADES,
        value: VALUES.ACE,
      };

      const action = () =>
        validatePlay(gameState, testHand, cardToAttempt, player1Role);

      expect(action).to.throw(
        MustFollowSuitError,
        `Must follow suit. Led suit is ${SUITS.CLUBS}, attempted to play ${SUITS.SPADES}.`
      );
      
      expect(isLeftBowerStub.callCount).to.be.at.least(1);
    });

    it("should allow playing an off-suit card if player does not have the led suit", () => {
      const ledCard = {
        card: { id: "QH", suit: SUITS.HEARTS, value: VALUES.QUEEN },
        player: PLAYER_ROLES[1],
      };
      const gameState = { ...baseGameState, currentTrick: [ledCard] };
      const cardToPlay = player1Hand[0];
      expect(() =>
        validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      ).to.not.throw();
      expect(
        validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      ).to.equal(true);
    });

    it("should allow playing any card if the led card is invalid (e.g. null) and NOT log a warning (current behavior)", () => {
      const ledCard = { card: null, player: PLAYER_ROLES[1] };
      const gameState = { ...baseGameState, currentTrick: [ledCard] };
      const cardToPlay = player1Hand[0];

      const result = validatePlay(
        gameState,
        player1Hand,
        cardToPlay,
        player1Role
      );

      expect(result).to.equal(true);
      expect(loggerMock.warn.called).to.be.false;
    });

    it("should allow playing any card if the led card is invalid (e.g. undefined) and NOT log a warning (current behavior)", () => {
      const ledCard = { card: undefined, player: PLAYER_ROLES[1] };
      const gameState = { ...baseGameState, currentTrick: [ledCard] };
      const cardToPlay = player1Hand[0];

      const result = validatePlay(
        gameState,
        player1Hand,
        cardToPlay,
        player1Role
      );

      expect(result).to.equal(true);
      expect(loggerMock.warn.called).to.be.false;
    });
  });

  describe("Following Suit Logic (Left Bower Scenarios)", () => {
    let validatePlay;
    let isLeftBowerMock;

    beforeEach(async () => {
      isLeftBowerMock = () => false;

      const validationModule = await esmockWithPaths(
        import.meta.url,
        '../../../src/game/logic/validation.js',
        {
          '../../utils/logger.js': loggerMock,
          '../../utils/deck.js': {
            isLeftBower: (card, trumpSuit) => isLeftBowerMock(card, trumpSuit),
            areSameColor: (suit1, suit2) => {
              if (suit1 === suit2) return true;
              if (
                (suit1 === SUITS.SPADES && suit2 === SUITS.CLUBS) ||
                (suit1 === SUITS.CLUBS && suit2 === SUITS.SPADES) ||
                (suit1 === SUITS.HEARTS && suit2 === SUITS.DIAMONDS) ||
                (suit1 === SUITS.DIAMONDS && suit2 === SUITS.HEARTS)
              ) {
                return true;
              }
              return false;
            }
          }
        }
      );
      validatePlay = validationModule.validatePlay;
    });

    it('should correctly use trump suit for Left Bower when checking "must follow suit" (player has Left Bower of led suit)', () => {
      isLeftBowerMock = (card, trumpSuit) =>
        card.id === "JC" && trumpSuit === SUITS.SPADES;

      const localPlayerHand = [
        { id: "JC", suit: SUITS.CLUBS, value: VALUES.JACK },
        { id: "TC", suit: SUITS.CLUBS, value: VALUES.TEN },
        { id: "AS", suit: SUITS.SPADES, value: VALUES.ACE },
      ];
      const ledCard = {
        card: { id: "QC", suit: SUITS.CLUBS, value: VALUES.QUEEN },
        player: PLAYER_ROLES[1],
      };
      const gameState = {
        ...baseGameState,
        trumpSuit: SUITS.SPADES,
        currentTrick: [ledCard],
      };
      const cardToPlay = localPlayerHand[0];

      expect(() =>
        validatePlay(gameState, localPlayerHand, cardToPlay, player1Role)
      ).to.throw(
        MustFollowSuitError,
        `Must follow suit. Led suit is ${SUITS.CLUBS}, attempted to play ${SUITS.SPADES}.`
      );

      const cardToPlayCorrectly = localPlayerHand[1];
      expect(() =>
        validatePlay(
          gameState,
          localPlayerHand,
          cardToPlayCorrectly,
          player1Role
        )
      ).to.not.throw();
    });

    it("should correctly use trump suit for Left Bower when determining led suit (Left Bower was led)", () => {
      isLeftBowerMock = (card, trumpSuit) =>
        card.id === "JC" && trumpSuit === SUITS.SPADES;

      const ledCard = {
        card: { id: "JC", suit: SUITS.CLUBS, value: VALUES.JACK },
        player: PLAYER_ROLES[1],
      };
      const gameState = {
        ...baseGameState,
        trumpSuit: SUITS.SPADES,
        currentTrick: [ledCard],
      };

      const cardToPlay = player1Hand[2];
      expect(() =>
        validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      ).to.not.throw();
      expect(
        validatePlay(gameState, player1Hand, cardToPlay, player1Role)
      ).to.equal(true);

      const cardToPlayWrong = player1Hand[0];
      expect(() =>
        validatePlay(gameState, player1Hand, cardToPlayWrong, player1Role)
      ).to.throw(
        MustFollowSuitError,
        `Must follow suit. Led suit is ${SUITS.SPADES}, attempted to play ${SUITS.CLUBS}.`
      );
    });

    it("should allow playing Left Bower if it matches the led suit (which is trump)", () => {
      isLeftBowerMock = (card, trumpSuit) =>
        card.id === "JS" && trumpSuit === SUITS.CLUBS;

      const localHand = [
        { id: "JS", suit: SUITS.SPADES, value: VALUES.JACK },
        { id: "AH", suit: SUITS.HEARTS, value: VALUES.ACE },
      ];
      const ledCard = {
        card: { id: "AC", suit: SUITS.CLUBS, value: VALUES.ACE },
        player: PLAYER_ROLES[1],
      };
      const gameState = {
        ...baseGameState,
        trumpSuit: SUITS.CLUBS,
        currentTrick: [ledCard],
      };
      const cardToPlay = localHand[0];

      expect(() =>
        validatePlay(gameState, localHand, cardToPlay, player1Role)
      ).to.not.throw();
      expect(
        validatePlay(gameState, localHand, cardToPlay, player1Role)
      ).to.equal(true);
    });

    it("should throw MustFollowSuitError if player has a card of the led suit but plays another non-trump card", () => {
      isLeftBowerMock = (card, trumpSuit) =>
        card.id === "JS" && trumpSuit === SUITS.CLUBS;

      const hand = [
        { id: "JS", suit: SUITS.SPADES, value: VALUES.JACK },
        { id: "KH", suit: SUITS.HEARTS, value: VALUES.KING },
        { id: "AS", suit: SUITS.SPADES, value: VALUES.ACE },
      ];
      const ledCardDetails = {
        card: { id: "QH", suit: SUITS.HEARTS, value: VALUES.QUEEN },
        player: PLAYER_ROLES[1],
      };
      const currentGameState = {
        ...baseGameState,
        trumpSuit: SUITS.CLUBS,
        currentTrick: [ledCardDetails],
      };
      const cardToAttempt = hand[2];

      expect(() =>
        validatePlay(currentGameState, hand, cardToAttempt, player1Role)
      ).to.throw(
        MustFollowSuitError,
        `Must follow suit. Led suit is ${SUITS.HEARTS}, attempted to play ${SUITS.SPADES}.`
      );
    });
  });

  it("should return true for a straightforward valid play (following non-trump suit)", () => {
    const ledCard = {
      card: { id: "QC", suit: SUITS.CLUBS, value: VALUES.QUEEN },
      player: PLAYER_ROLES[1],
    };
    const gameState = { ...baseGameState, currentTrick: [ledCard] };
    const cardToPlay = player1Hand[0];
    expect(
      generalValidatePlay(gameState, player1Hand, cardToPlay, player1Role)
    ).to.equal(true);
  });

  it("should return true for playing trump when player has no led suit", () => {
    const ledCard = {
      card: { id: "QH", suit: SUITS.HEARTS, value: VALUES.QUEEN },
      player: PLAYER_ROLES[1],
    };
    const gameState = {
      ...baseGameState,
      currentTrick: [ledCard],
      trumpSuit: SUITS.SPADES,
    };
    const cardToPlay = player1Hand[2];
    expect(
      generalValidatePlay(gameState, player1Hand, cardToPlay, player1Role)
    ).to.equal(true);
  });

  it("should return true when leading with a trump card", () => {
    const gameState = {
      ...baseGameState,
      currentTrick: [],
      trumpSuit: SUITS.SPADES,
    };
    const cardToPlay = player1Hand[2];
    expect(
      generalValidatePlay(gameState, player1Hand, cardToPlay, player1Role)
    ).to.equal(true);
  });
});

describe("Validation Logic - validateBid", () => {
  let sandbox;
  let loggerMock;
  let validateBid;
  let baseBidGameState;

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    loggerMock = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
      debug: sandbox.stub(),
    };

    const validationModule = await esmockWithPaths(
      import.meta.url,
      '../../../src/game/logic/validation.js',
      {
        '../../utils/logger.js': loggerMock
      }
    );
    validateBid = validationModule.validateBid;

    baseBidGameState = {
      gamePhase: GAME_PHASES.ORDER_UP_ROUND1,
      currentPlayer: PLAYER_ROLES[0],
      dealer: PLAYER_ROLES[3],
      turnCard: { id: "AS", suit: SUITS.SPADES, value: VALUES.ACE },
      bids: [],
      gameId: "test-bid-game",
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should throw ValidationError if gameState is missing", () => {
    expect(() => validateBid(null, PLAYER_ROLES[0], "pass")).to.throw(
      ValidationError,
      "Internal error: Missing or invalid data for bid validation."
    );
  });
  it("should throw ValidationError if playerRole is missing", () => {
    expect(() => validateBid(baseBidGameState, null, "pass")).to.throw(
      ValidationError,
      "Internal error: Missing or invalid data for bid validation."
    );
  });
  it("should throw ValidationError if decision is missing", () => {
    expect(() => validateBid(baseBidGameState, PLAYER_ROLES[0], null)).to.throw(
      ValidationError,
      "Internal error: Missing or invalid data for bid validation."
    );
  });
  it("should throw ValidationError if playerRole is invalid", () => {
    expect(() => validateBid(baseBidGameState, "invalidRole", "pass")).to.throw(
      ValidationError,
      "Internal error: Missing or invalid data for bid validation."
    );
  });

  it("should throw NotPlayersTurnError if it is not the current player's turn", () => {
    const gameState = { ...baseBidGameState, currentPlayer: PLAYER_ROLES[1] };
    expect(() => validateBid(gameState, PLAYER_ROLES[0], "pass")).to.throw(
      NotPlayersTurnError,
      `Not ${PLAYER_ROLES[0]}'s turn. It is ${PLAYER_ROLES[1]}'s turn.`
    );
  });

  it("should throw InvalidPhaseError if bidding is attempted outside bidding phases", () => {
    const gameState = { ...baseBidGameState, gamePhase: GAME_PHASES.PLAYING };
    expect(() => validateBid(gameState, PLAYER_ROLES[0], "pass")).to.throw(
      InvalidPhaseError,
      "Cannot make bid decision during " + GAME_PHASES.PLAYING + " phase."
    );
  });

  describe("Round 1 Bidding (ORDER_UP_ROUND1)", () => {
    beforeEach(() => {
      baseBidGameState.gamePhase = GAME_PHASES.ORDER_UP_ROUND1;
    });

    it('should allow "orderUp" decision', () => {
      expect(() =>
        validateBid(baseBidGameState, PLAYER_ROLES[0], "orderUp")
      ).to.not.throw();
      expect(
        validateBid(baseBidGameState, PLAYER_ROLES[0], "orderUp")
      ).to.equal(true);
    });
    it('should allow "pass" decision', () => {
      expect(() =>
        validateBid(baseBidGameState, PLAYER_ROLES[0], "pass")
      ).to.not.throw();
      expect(validateBid(baseBidGameState, PLAYER_ROLES[0], "pass")).to.equal(
        true
      );
    });
    it('should throw InvalidBidError for "callTrump" decision', () => {
      expect(() =>
        validateBid(baseBidGameState, PLAYER_ROLES[0], "callTrump", SUITS.CLUBS)
      ).to.throw(
        InvalidBidError,
        `Invalid decision 'callTrump' for ${GAME_PHASES.ORDER_UP_ROUND1}.`
      );
    });
    it("should throw InvalidBidError for other invalid decisions", () => {
      expect(() =>
        validateBid(baseBidGameState, PLAYER_ROLES[0], "invalidDecision")
      ).to.throw(
        InvalidBidError,
        `Invalid decision 'invalidDecision' for ${GAME_PHASES.ORDER_UP_ROUND1}.`
      );
    });
    it('should allow dealer to "orderUp" (accept turn card)', () => {
      const gameState = { ...baseBidGameState, currentPlayer: PLAYER_ROLES[3] };
      expect(() =>
        validateBid(gameState, PLAYER_ROLES[3], "orderUp")
      ).to.not.throw();
    });
    it('should allow dealer to "pass"', () => {
      const gameState = { ...baseBidGameState, currentPlayer: PLAYER_ROLES[3] };
      expect(() =>
        validateBid(gameState, PLAYER_ROLES[3], "pass")
      ).to.not.throw();
    });
  });

  describe("Round 2 Bidding (ORDER_UP_ROUND2)", () => {
    beforeEach(() => {
      baseBidGameState.gamePhase = GAME_PHASES.ORDER_UP_ROUND2;
      baseBidGameState.turnCard = {
        id: "AS",
        suit: SUITS.SPADES,
        value: VALUES.ACE,
      };
      baseBidGameState.bids = [
        { player: PLAYER_ROLES[0], decision: "pass", round: 1 },
        { player: PLAYER_ROLES[1], decision: "pass", round: 1 },
        { player: PLAYER_ROLES[2], decision: "pass", round: 1 },
        { player: PLAYER_ROLES[3], decision: "pass", round: 1 },
      ];
    });

    it('should allow "callTrump" decision with a valid suit (not the turned down suit)', () => {
      expect(() =>
        validateBid(baseBidGameState, PLAYER_ROLES[0], "callTrump", SUITS.CLUBS)
      ).to.not.throw();
      expect(
        validateBid(baseBidGameState, PLAYER_ROLES[0], "callTrump", SUITS.CLUBS)
      ).to.equal(true);
    });
    it('should allow "pass" decision (if not stick the dealer)', () => {
      expect(() =>
        validateBid(baseBidGameState, PLAYER_ROLES[0], "pass")
      ).to.not.throw();
      expect(validateBid(baseBidGameState, PLAYER_ROLES[0], "pass")).to.equal(
        true
      );
    });
    it('should throw InvalidBidError for "orderUp" decision', () => {
      expect(() =>
        validateBid(baseBidGameState, PLAYER_ROLES[0], "orderUp")
      ).to.throw(
        InvalidBidError,
        `Invalid decision 'orderUp' for ${GAME_PHASES.ORDER_UP_ROUND2}.`
      );
    });
    it('should throw InvalidBidError for "callTrump" with an invalid suit string', () => {
      expect(() =>
        validateBid(
          baseBidGameState,
          PLAYER_ROLES[0],
          "callTrump",
          "invalidSuit"
        )
      ).to.throw(
        InvalidBidError,
        "Invalid suit provided for callTrump decision."
      );
    });
    it('should throw InvalidBidError for "callTrump" with no suit', () => {
      expect(() =>
        validateBid(baseBidGameState, PLAYER_ROLES[0], "callTrump", null)
      ).to.throw(
        InvalidBidError,
        "Invalid suit provided for callTrump decision."
      );
    });
    it('should throw InvalidBidError for "callTrump" with the turned down suit', () => {
      expect(() =>
        validateBid(
          baseBidGameState,
          PLAYER_ROLES[0],
          "callTrump",
          SUITS.SPADES
        )
      ).to.throw(
        InvalidBidError,
        `Cannot call the suit that was turned down (${SUITS.SPADES}).`
      );
    });

    describe("Stick the Dealer rule", () => {
      beforeEach(() => {
        baseBidGameState.currentPlayer = PLAYER_ROLES[3];
        baseBidGameState.bids.push(
          { player: PLAYER_ROLES[0], decision: "pass", round: 2 },
          { player: PLAYER_ROLES[1], decision: "pass", round: 2 },
          { player: PLAYER_ROLES[2], decision: "pass", round: 2 }
        );
      });

      it('should throw InvalidBidError if dealer tries to "pass" (stick the dealer)', () => {
        expect(() =>
          validateBid(baseBidGameState, PLAYER_ROLES[3], "pass")
        ).to.throw(
          InvalidBidError,
          "Dealer must call a suit in this situation (stick the dealer)."
        );
      });
      it('should allow dealer to "callTrump" with a valid suit (stick the dealer)', () => {
        expect(() =>
          validateBid(
            baseBidGameState,
            PLAYER_ROLES[3],
            "callTrump",
            SUITS.CLUBS
          )
        ).to.not.throw();
      });
      it('should throw InvalidBidError if dealer tries to "callTrump" with turned down suit (stick the dealer)', () => {
        expect(() =>
          validateBid(
            baseBidGameState,
            PLAYER_ROLES[3],
            "callTrump",
            SUITS.SPADES
          )
        ).to.throw(
          InvalidBidError,
          `Cannot call the suit that was turned down (${SUITS.SPADES}).`
        );
      });
    });
  });
});

describe("Validation Logic - validateDealerDiscard", () => {
  let sandbox;
  let loggerMock;
  let validateDealerDiscard;
  let baseDiscardGameState;
  let dealerHand;
  const dealerRole = PLAYER_ROLES[0];
  const cardToDiscard = { id: "TC", suit: SUITS.CLUBS, value: VALUES.TEN };

  beforeEach(async () => {
    sandbox = sinon.createSandbox();

    loggerMock = {
      info: sandbox.stub(),
      warn: sandbox.stub(),
      error: sandbox.stub(),
      debug: sandbox.stub(),
    };

    const validationModule = await esmockWithPaths(
      import.meta.url,
      '../../../src/game/logic/validation.js',
      {
        '../../utils/logger.js': loggerMock
      }
    );
    validateDealerDiscard = validationModule.validateDealerDiscard;

    dealerHand = [
      { id: "AC", suit: SUITS.CLUBS, value: VALUES.ACE },
      { id: "KC", suit: SUITS.CLUBS, value: VALUES.KING },
      cardToDiscard,
      { id: "AS", suit: SUITS.SPADES, value: VALUES.ACE },
      { id: "KS", suit: SUITS.SPADES, value: VALUES.KING },
      { id: "JD", suit: SUITS.DIAMONDS, value: VALUES.JACK },
    ];

    baseDiscardGameState = {
      gamePhase: GAME_PHASES.DEALER_DISCARD,
      dealer: dealerRole,
      currentPlayer: dealerRole,
      gameId: "test-discard-game",
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("should throw ValidationError if gameState is missing", () => {
    expect(() =>
      validateDealerDiscard(null, dealerRole, cardToDiscard, dealerHand)
    ).to.throw(
      ValidationError,
      "Internal error: Missing data for discard validation."
    );
  });
  it("should throw ValidationError if playerRole is missing", () => {
    expect(() =>
      validateDealerDiscard(
        baseDiscardGameState,
        null,
        cardToDiscard,
        dealerHand
      )
    ).to.throw(
      ValidationError,
      "Internal error: Missing data for discard validation."
    );
  });
  it("should throw ValidationError if cardToDiscard is missing", () => {
    expect(() =>
      validateDealerDiscard(baseDiscardGameState, dealerRole, null, dealerHand)
    ).to.throw(
      ValidationError,
      "Internal error: Missing data for discard validation."
    );
  });
  it("should throw ValidationError if cardToDiscard.id is missing", () => {
    const invalidCard = { suit: SUITS.CLUBS, value: VALUES.TEN };
    expect(() =>
      validateDealerDiscard(
        baseDiscardGameState,
        dealerRole,
        invalidCard,
        dealerHand
      )
    ).to.throw(
      ValidationError,
      "Internal error: Missing data for discard validation."
    );
  });
  it("should throw ValidationError if playerHand is missing", () => {
    expect(() =>
      validateDealerDiscard(
        baseDiscardGameState,
        dealerRole,
        cardToDiscard,
        null
      )
    ).to.throw(
      ValidationError,
      "Internal error: Missing data for discard validation."
    );
  });

  it("should throw InvalidPhaseError if not in DEALER_DISCARD phase", () => {
    const gameState = {
      ...baseDiscardGameState,
      gamePhase: GAME_PHASES.PLAYING,
    };
    expect(() =>
      validateDealerDiscard(gameState, dealerRole, cardToDiscard, dealerHand)
    ).to.throw(
      InvalidPhaseError,
      "Cannot discard card during " + GAME_PHASES.PLAYING + " phase."
    );
  });

  it("should throw InvalidDiscardError if playerRole is not the dealer", () => {
    const nonDealerRole = PLAYER_ROLES[1];
    const gameState = {
      ...baseDiscardGameState,
      dealer: dealerRole,
      currentPlayer: nonDealerRole,
    };
    expect(() =>
      validateDealerDiscard(gameState, nonDealerRole, cardToDiscard, dealerHand)
    ).to.throw(
      InvalidDiscardError,
      `Only the dealer (${dealerRole}) can discard. Player ${nonDealerRole} attempted.`
    );
  });

  it("should throw NotPlayersTurnError if it is not the current player's turn (even if player is dealer)", () => {
    const gameState = {
      ...baseDiscardGameState,
      currentPlayer: PLAYER_ROLES[1],
    };
    expect(() =>
      validateDealerDiscard(gameState, dealerRole, cardToDiscard, dealerHand)
    ).to.throw(
      NotPlayersTurnError,
      `Not ${dealerRole}'s turn. It is ${PLAYER_ROLES[1]}'s turn.`
    );
  });

  it("should throw CardNotInHandError if cardToDiscard is not in dealerHand", () => {
    const cardNotInHand = { id: "QH", suit: SUITS.HEARTS, value: VALUES.QUEEN };
    expect(() =>
      validateDealerDiscard(
        baseDiscardGameState,
        dealerRole,
        cardNotInHand,
        dealerHand
      )
    ).to.throw(
      CardNotInHandError,
      `Card QH is not in dealer's hand to discard.`
    );
  });

  it("should return true for a valid discard scenario", () => {
    expect(() =>
      validateDealerDiscard(
        baseDiscardGameState,
        dealerRole,
        cardToDiscard,
        dealerHand
      )
    ).to.not.throw();
    expect(
      validateDealerDiscard(
        baseDiscardGameState,
        dealerRole,
        cardToDiscard,
        dealerHand
      )
    ).to.equal(true);
  });

  it("should not throw error if hand size is not 6, but log a warning (as per current implementation)", () => {
    const smallerHand = dealerHand.slice(0, 5);
    const cardInSmallerHand = smallerHand[2];

    const result = validateDealerDiscard(
      baseDiscardGameState,
      dealerRole,
      cardInSmallerHand,
      smallerHand
    );

    expect(result).to.equal(true);
    expect(loggerMock.warn.calledOnce).to.be.true;
    expect(loggerMock.warn.firstCall.args[0]).to.deep.include({
      playerRole: dealerRole,
      handSize: 5,
      gameId: baseDiscardGameState.gameId,
    });
    expect(loggerMock.warn.firstCall.args[1]).to.equal(
      "Dealer's hand does not have 6 cards at the point of discard validation."
    );
  });
});