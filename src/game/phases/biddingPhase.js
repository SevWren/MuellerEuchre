/**
 * @file src/game/phases/biddingPhase.js
 * @module game/phases/biddingPhase
 * @description
 * Pure Layer 1 module implementing the core bidding phase logic for Euchre.
 * Handles order up decisions, dealer discards, and trump calling in a stateless manner.
 * 
 * @see {@link module:src/game/phases} for other game phase implementations
 * @see {@link module:src/game/logic/validation} for validation logic
 * @see {@link module:test/game/phases/biddingPhase.unit.test.js} for test coverage
 */

import logger from "../../utils/logger.js";
import { GAME_PHASES, PLAYER_ROLES, CARD_SUITS, CARD_VALUES } from "../../config/constants.js";
import { getNextPlayer } from "../../utils/players.js";
import { cardToId } from "../../utils/deck.js";
import { validateBid, validateDealerDiscard } from "../logic/validation-core.js";
import { PhaseLogicError, CardNotInHandError } from "../logic/validation-errors.js";

/**
 * @typedef {Object} Card
 * @property {keyof typeof CARD_SUITS} suit - The suit of the card (e.g., 'CARD_SUIT_HEARTS')
 * @property {keyof typeof CARD_VALUES} value - The face value of the card (e.g., 'ACE', 'KING')
 * @property {string} id - Unique identifier for the card (e.g., 'H-A' for Ace of Hearts)
 * @property {string} [name] - Human-readable name of the card (e.g., 'Ace of Hearts')
 * @property {number} [rank] - Numeric rank used for comparison (1-13)
 */

/**
 * @typedef {Object} PlayerData
 * @property {string} name - Display name of the player
 * @property {Card[]} hand - Array of cards in the player's hand
 * @property {string} teamId - The team this player belongs to (e.g., 'TEAM_NS', 'TEAM_EW')
 */

/**
 * @typedef {Object} GameState
 * @property {string} gameId - Unique identifier for the game session
 * @property {keyof typeof GAME_PHASES} gamePhase - Current phase of the game
 * @property {Object<keyof typeof PLAYER_ROLES, PlayerData>} players - Map of player roles to player data
 * @property {Card|null} turnCard - The face-up card for the current round
 * @property {keyof typeof PLAYER_ROLES} dealer - Role of the current dealer
 * @property {keyof typeof PLAYER_ROLES} currentPlayer - Role of the player whose turn it is
 * @property {Array<Bid>} bids - History of bids in the current hand
 * @property {keyof typeof CARD_SUITS|null} trumpSuit - Currently declared trump suit (if any)
 * @property {keyof typeof PLAYER_ROLES|null} playerWhoOrderedUp - Player who ordered up (round 1)
 * @property {keyof typeof PLAYER_ROLES|null} playerWhoCalledTrump - Player who called trump (round 2)
 * @property {string|null} makerTeam - Team that declared trump (e.g., 'TEAM_NS', 'TEAM_EW')
 * @property {number} roundNumber - Current bidding round (1 or 2)
 * @property {Array<GameMessage>} gameMessages - Log of game events and messages
 */

/**
 * @typedef {Object} Bid
 * @property {number} round - The bidding round (1 or 2)
 * @property {keyof typeof PLAYER_ROLES} playerRole - Player who made the bid
 * @property {'orderUp'|'pass'|'callTrump'|'goAlone'} decision - Type of bid
 * @property {keyof typeof CARD_SUITS} [suit] - Suit called (for callTrump)
 */

/**
 * @typedef {Object} GameMessage
 * @property {string} type - Message type (e.g., 'bidding', 'game', 'system')
 * @property {string} text - Message content
 * @property {string} timestamp - ISO timestamp of the message
 * @property {string} [playerId] - Optional player ID if message is player-specific
 */

/**
 * Processes a player's decision in the first round of bidding (order up or pass).
 * 
 * This pure function implements the core logic for the first round of Euchre bidding.
 * It validates the bid, updates game state accordingly, and handles the transition
 * to either the dealer discard phase or the next bidding round.
 *
 * @param {GameState} currentGameState - The current immutable game state
 * @param {keyof typeof PLAYER_ROLES} playerRole - The role of the player making the decision
 * @param {boolean} wantsToOrderUp - True to order up the dealer, false to pass
 * @returns {GameState} A new game state reflecting the bidding decision
 * 
 * @throws {import('../logic/validation-core.js').ValidationError} If bid validation fails
 * @throws {import('../logic/validation-core.js').NotPlayersTurnError} If called out of turn
 * @throws {import('../logic/validation-core.js').InvalidBidError} For invalid bid parameters
 * @throws {import('../logic/validation-core.js').InvalidPhaseError} If called in wrong phase
 * @throws {PhaseLogicError} For internal logic errors (e.g., missing turn card)
 * 
 * @see {@link module:src/game/logic/validation.validateBid} For bid validation logic
 * @see {@link module:test/game/phases/biddingPhase.unit.test.js} For test coverage
 * @see {@link module:src/socket/handlers/biddingHandlers} For WebSocket integration
 * 
 * @example
 * // Order up the dealer
 * const newState = handleOrderUpDecision(gameState, 'PLAYER_NORTH', true);
 * 
 * // Pass the bid
 * const passedState = handleOrderUpDecision(gameState, 'PLAYER_EAST', false);
 */
function handleOrderUpDecision(currentGameState, playerRole, wantsToOrderUp) {
  logger.info(
    { gameId: currentGameState.gameId, playerRole, wantsToOrderUp },
    "Handling order up decision.",
  );

  // Perform bid validation first
  validateBid(
    currentGameState,
    playerRole,
    wantsToOrderUp ? "orderUp" : "pass",
    null,
  );

  // Use currentGameState directly instead of relying on a global via updateGameState's prevState
  const prevState = currentGameState; // Alias for clarity within existing logic structure

  const bids = [
    ...(prevState.bids || []),
    { round: 1, playerRole, decision: wantsToOrderUp ? "orderUp" : "pass" },
  ];
  let messageText = `${prevState.players[playerRole]?.name || playerRole} `;
  let changes = {};

  if (wantsToOrderUp) {
    if (!prevState.turnCard) {
      logger.error(
        { gameId: prevState.gameId, playerRole },
        "handleOrderUpDecision: turnCard is null when trying to order up.",
      );
      throw new PhaseLogicError("Cannot order up: turn card is missing.");
    }
    messageText += `ordered up the dealer (${prevState.dealer}) to pick up the ${cardToId(prevState.turnCard)}.`;
    const makerTeam = prevState.players[playerRole]?.teamId;
    if (!makerTeam) {
      logger.error(
        { gameId: prevState.gameId, playerRole },
        "Could not determine team for ordering player in handleOrderUpDecision.",
      );
      throw new PhaseLogicError(
        "Player team could not be determined for ordering up.",
      );
    }
    logger.info(
      {
        gameId: prevState.gameId,
        trumpSuit: prevState.turnCard.suit,
        makerTeam,
        playerWhoOrderedUp: playerRole,
      },
      "Trump ordered up.",
    );

    changes = {
      trumpSuit: prevState.turnCard.suit,
      playerWhoOrderedUp: playerRole,
      makerTeam: makerTeam,
      gamePhase: GAME_PHASES.DEALER_DISCARD,
      currentPlayer: prevState.dealer, // Dealer's turn to discard
    };
  } else {
    // Player passed
    messageText += "passed.";
    const nextBidder = getNextPlayer(playerRole, PLAYER_ROLES);

    if (nextBidder === getNextPlayer(prevState.dealer, PLAYER_ROLES)) {
      // All 4 players passed
      messageText +=
        " All players passed in round 1. Moving to round 2 bidding.";
      logger.info(
        { gameId: prevState.gameId },
        "All passed in order up round 1.",
      );
      changes = {
        roundNumber: 2,
        gamePhase: GAME_PHASES.ORDER_UP_ROUND2,
        currentPlayer: getNextPlayer(prevState.dealer, PLAYER_ROLES),
      };
    } else {
      logger.info(
        { gameId: prevState.gameId, nextBidder },
        `Player passed, next bidder is ${nextBidder}.`,
      );
      changes = {
        currentPlayer: nextBidder,
      };
    }
  }

  return {
    ...prevState, // Spread the original state first
    ...changes, // Then apply specific changes
    bids, // Update bids array
    gameMessages: [
      ...(prevState.gameMessages || []),
      {
        type: "bidding",
        text: messageText,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Processes the dealer's card discard after being ordered up in round 1.
 * 
 * This pure function handles the dealer's discard action, which occurs after a successful
 * order-up in the first round of bidding. It validates the discard, removes the specified
 * card from the dealer's hand, and transitions the game to the playing phase.
 *
 * @param {GameState} currentGameState - The current immutable game state
 * @param {keyof typeof PLAYER_ROLES} dealerRole - The role of the dealer discarding
 * @param {string} cardToDiscardId - The ID of the card to discard (e.g., 'H-A' for Ace of Hearts)
 * @returns {GameState} A new game state with the dealer's hand updated
 * 
 * @throws {import('../logic/validation-core.js').ValidationError} If discard validation fails
 * @throws {import('../logic/validation-core.js').NotPlayersTurnError} If called out of turn
 * @throws {import('../logic/validation-core.js').InvalidDiscardError} For invalid discards
 * @throws {CardNotInHandError} If the specified card is not in the dealer's hand
 * @throws {PhaseLogicError} For internal logic errors (e.g., invalid game phase)
 * 
 * @see {@link module:src/game/logic/validation.validateDealerDiscard} For discard validation logic
 * @see {@link module:test/game/phases/biddingPhase.unit.test.js} For test coverage
 * @see {@link module:src/socket/handlers/biddingHandlers} For WebSocket integration
 * 
 * @example
 * // Dealer discards a card
 * const newState = handleDealerDiscard(gameState, 'PLAYER_SOUTH', 'H-J');
 * 
 * // Throws if card not in hand
 * try {
 *   handleDealerDiscard(gameState, 'PLAYER_SOUTH', 'INVALID_CARD');
 * } catch (error) {
 *   console.error('Discard failed:', error.message);
 * }
 */
function handleDealerDiscard(currentGameState, dealerRole, cardToDiscardId) {
  logger.info(
    { gameId: currentGameState.gameId, dealerRole, cardToDiscardId },
    "Handling dealer discard.",
  );

  // Note: currentGameState is used directly for reading, new state is built at the end.
  // This avoids issues with stale data if using a 'prevState' clone for some reads and currentGameState for others.
  const dealerHand = currentGameState.players[dealerRole]?.hand || [];
  const cardToDiscardObject = dealerHand.find(
    (card) => card.id === cardToDiscardId,
  );

  // Preliminary check for the card by ID.
  // validateDealerDiscard will also check if the card object is in the hand.
  if (!cardToDiscardObject) {
    logger.error(
      {
        gameId: currentGameState.gameId,
        dealerHandAttempted: dealerHand,
        cardToDiscardId,
      },
      "Card to discard (by ID) not found in dealer's hand for preliminary validation.",
    );
    // Throwing CardNotInHandError here is consistent with what validateDealerDiscard would do if card object was passed but not found.
    throw new CardNotInHandError(
      `Card ${cardToDiscardId} not found in dealer's hand.`,
    );
  }

  // Perform validation with the found card object
  validateDealerDiscard(
    currentGameState,
    dealerRole,
    cardToDiscardObject,
    dealerHand,
  );

  const turnCard = currentGameState.turnCard;
  if (!turnCard) {
    // This check is after validateDealerDiscard because validateDealerDiscard doesn't specifically check for turnCard presence,
    // but the discard action itself fundamentally requires it.
    logger.error(
      { gameId: currentGameState.gameId },
      "Dealer discard attempted but no turnCard in state.",
    );
    throw new PhaseLogicError(
      "Cannot discard: turn card is missing from game state.",
    );
  }

  // Re-construct hand for immutability: filter out discarded
  const newDealerHand = dealerHand.filter(
    (card) => card.id !== cardToDiscardId,
  );
  // The turnCard is already part of dealerHand at this stage (conceptually, dealer picked it up, now has 6 cards).
  // So, we just remove the cardToDiscardId. The newDealerHand will have 5 cards.

  const newPlayersData = {
    ...currentGameState.players,
    [dealerRole]: {
      ...currentGameState.players[dealerRole],
      hand: newDealerHand,
    },
  };

  const messageText = `${currentGameState.players[dealerRole]?.name || dealerRole} picked up the ${cardToId(turnCard)} and discarded ${cardToId(cardToDiscardObject)}.`;
  logger.info(
    {
      gameId: currentGameState.gameId,
      pickedUp: cardToId(turnCard),
      discarded: cardToId(cardToDiscardObject),
    },
    "Dealer discard complete.",
  );

  const goAloneDecider =
    currentGameState.playerWhoOrderedUp ||
    currentGameState.playerWhoCalledTrump;

  return {
    ...currentGameState, // Start with the original state
    players: newPlayersData, // Apply updated players object
    turnCard: null, // Turn card is now in hand
    gamePhase: GAME_PHASES.GOING_ALONE_DECISION,
    currentPlayer: goAloneDecider,
    gameMessages: [
      ...(currentGameState.gameMessages || []),
      {
        type: "bidding",
        text: messageText,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Processes a player's decision in the second round of bidding (call trump or pass).
 * 
 * This pure function handles the second round of Euchre bidding, where players can
 * call any suit (except the turned-down card) as trump or pass. It validates the
 * bid, updates the game state, and transitions to the appropriate phase.
 *
 * @param {GameState} currentGameState - The current immutable game state
 * @param {keyof typeof PLAYER_ROLES} playerRole - The role of the player deciding
 * @param {boolean} wantsToCall - True to call a trump suit, false to pass
 * @param {keyof typeof CARD_SUITS} [suitCalled] - Required if wantsToCall is true
 * @returns {GameState} A new game state reflecting the bidding decision
 * 
 * @throws {import('../logic/validation-core.js').ValidationError} If bid validation fails
 * @throws {import('../logic/validation-core.js').NotPlayersTurnError} If called out of turn
 * @throws {import('../logic/validation-core.js').InvalidBidError} For invalid bid parameters
 * @throws {import('../logic/validation-core.js').InvalidPhaseError} If called in wrong phase
 * @throws {PhaseLogicError} For internal logic errors (e.g., missing team assignment)
 * 
 * @see {@link module:src/game/logic/validation.validateBid} For bid validation logic
 * @see {@link module:test/game/phases/biddingPhase.unit.test.js} For test coverage
 * @see {@link module:src/socket/handlers/biddingHandlers} For WebSocket integration
 * 
 * @example
 * // Call hearts as trump
 * const newState = handleCallTrumpDecision(gameState, 'PLAYER_EAST', true, 'CARD_SUIT_HEARTS');
 * 
 * // Pass the bid
 * const passedState = handleCallTrumpDecision(gameState, 'PLAYER_WEST', false);
 * 
 * // Throws if suit not provided when calling
 * try {
 *   handleCallTrumpDecision(gameState, 'PLAYER_NORTH', true);
 * } catch (error) {
 *   console.error('Call failed:', error.message);
 * }
 */
function handleCallTrumpDecision(currentGameState, playerRole, wantsToCall, suitCalled = null) {
  logger.info(
    { gameId: currentGameState.gameId, playerRole, wantsToCall, suitCalled },
    "Handling call trump decision.",
  );

  // Perform bid validation first
  // suitCalled can be null if wantsToCall is false (passing)
  validateBid(
    currentGameState,
    playerRole,
    wantsToCall ? "callTrump" : "pass",
    suitCalled,
  );

  // Use currentGameState for reads, new state built at the end. Avoid prevState clone here.
  const bids = [
    ...(currentGameState.bids || []),
    {
      round: 2,
      playerRole,
      decision: wantsToCall ? "callTrump" : "pass",
      suit: wantsToCall ? suitCalled : undefined,
    },
  ];
  let messageText = `${currentGameState.players[playerRole]?.name || playerRole} `;
  let changes = {};

  if (wantsToCall) {
    // suitCalled validity (is a valid suit, not the turned-down one) is now handled by validateBid.
    messageText += `called ${suitCalled} as trump.`;
    const makerTeam = currentGameState.players[playerRole]?.teamId;
    if (!makerTeam) {
      logger.error(
        { gameId: currentGameState.gameId, playerRole },
        "Could not determine team for calling player in handleCallTrumpDecision.",
      );
      throw new PhaseLogicError(
        "Player team could not be determined for calling trump.",
      );
    }
    logger.info(
      {
        gameId: currentGameState.gameId,
        trumpSuit: suitCalled,
        makerTeam,
        playerWhoCalledTrump: playerRole,
      },
      "Trump called in round 2.",
    );

    changes = {
      trumpSuit: suitCalled,
      playerWhoCalledTrump: playerRole,
      makerTeam: makerTeam,
      gamePhase: GAME_PHASES.GOING_ALONE_DECISION,
      currentPlayer: playerRole, // Player who called trump decides to go alone
    };
  } else {
    // Player passed
    messageText += "passed.";
    const nextBidder = getNextPlayer(playerRole, PLAYER_ROLES);

    // Dealer passing is the only condition that might end the round (misdeal)
    // "Stick the dealer" is handled by validateBid, preventing dealer from passing if necessary.
    if (playerRole === currentGameState.dealer) {
      // If validateBid allowed dealer to pass, it means it wasn't a "stick the dealer" scenario.
      // This implies all players (including dealer) have passed in round 2.
      messageText += " All players passed in round 2. Misdeal.";
      logger.info(
        { gameId: currentGameState.gameId },
        "All passed in call trump round (including dealer). Misdeal.",
      );
      changes = {
        gamePhase: GAME_PHASES.DEALING,
        currentPlayer: getNextPlayer(currentGameState.dealer, PLAYER_ROLES), // For next deal
        turnCard: null,
        trumpSuit: null,
        roundNumber: 1, // Reset for new hand
        playerWhoOrderedUp: null,
        playerWhoCalledTrump: null,
        makerTeam: null,
      };
    } else {
      logger.info(
        { gameId: currentGameState.gameId, nextBidder },
        `Player passed in round 2, next bidder is ${nextBidder}.`,
      );
      changes = {
        currentPlayer: nextBidder,
      };
    }
  }

  return {
    ...currentGameState,
    ...changes,
    bids,
    gameMessages: [
      ...(currentGameState.gameMessages || []),
      {
        type: "bidding",
        text: messageText,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export {
  handleOrderUpDecision,
  handleDealerDiscard,
  handleCallTrumpDecision,
  // Export constants for testing
  PLAYER_ROLES,
  GAME_PHASES,
};
