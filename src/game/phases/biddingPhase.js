/**
 * @file src/game/phases/biddingPhase.js
 * @module game/phases/biddingPhase
 * @description
 * Pure Layer 1 module implementing the core bidding phase logic for Euchre.
 * Handles order up decisions, dealer discards, and trump calling in a stateless manner.
 *
 * 8-2-25 - 100% Coverage 
 * 
 * 
 * @see {@link module:src/game/phases} for other game phase implementations
 * @see {@link module:src/game/logic/validation-core} for validation logic
 * @see {@link module:test/game/phases/biddingPhase.unit.test.js} for test coverage
 */

import logger from "../../utils/logger.js";
import { GAME_PHASES, PLAYER_ROLES } from "../../config/constants.js";
import { getNextPlayer } from "../../utils/players.js";
import { cardToId } from "../../utils/cardUtils.js";
import { PhaseLogicError, CardNotInHandError, InvalidPhaseError, InvalidBidError } from "../logic/validation-errors.js";

/**
 * @typedef {import('../../game/state.js').GameState} GameState
 * @typedef {import('../../config/constants.js').PlayerRole} PlayerRole
 * @typedef {import('../../config/constants.js').Suit} Suit
 * @typedef {import('../../config/constants.js').Team} Team
 * @typedef {import('../../game/state.js').Card} Card
 * @typedef {import('../../game/state.js').Player} PlayerData
 * @typedef {import('../../game/state.js').Bid} Bid
 */

/**
 * @typedef {object} GameMessage
 * @property {string} type - Message type (e.g., 'bidding', 'game', 'system')
 * @property {string} text - Message content
 * @property {string} timestamp - ISO timestamp of the message
 * @property {string} [playerId] - Optional player ID if message is player-specific
 */

/**
 * Processes a player's decision in the first round of bidding (order up or pass).
 * This pure function requires `this.validateBid` to be injected via its execution context.
 *
 * This pure function implements the core logic for the first round of Euchre bidding.
 * It validates the bid, updates game state accordingly, and handles the transition
 * to either the dealer discard phase or the next bidding round.
 *
 * @param {GameState} currentGameState - The current immutable game state
 * @param {PlayerRole} playerRole - The role of the player making the decision
 * @param {boolean} wantsToOrderUp - True to order up the dealer, false to pass
 * @returns {GameState} A new game state reflecting the bidding decision
 *
 * @throws {import('../logic/validation-errors.js').ValidationError} If bid validation fails
 * @throws {import('../logic/validation-errors.js').NotPlayersTurnError} If called out of turn
 * @throws {import('../logic/validation-errors.js').InvalidBidError} For invalid bid parameters
 * @throws {import('../logic/validation-errors.js').InvalidPhaseError} If called in wrong phase
 * @throws {PhaseLogicError} For internal logic errors (e.g., missing turn card)
 *
 * @see {@link module:src/game/logic/validation-core.validateBid} For bid validation logic
 * @see {@link module:test/game/phases/biddingPhase.unit.test.js} For test coverage
 * @see {@link module:src/socket/handlers/biddingHandlers} For WebSocket integration
 * @see {@link module:src/utils/players.getNextPlayer} For determining the next player
 * @see {@link module:src/utils/cardUtils.cardToId} For converting card objects to IDs for messages
 *
 * @example
 * // Order up the dealer
 * const newState = handleOrderUpDecision.call({ validateBid }, gameState, 'PLAYER_NORTH', true);
 *
 * @example
 * // Pass the bid
 * const passedState = handleOrderUpDecision.call({ validateBid }, gameState, 'PLAYER_EAST', false);
 */
function handleOrderUpDecision(currentGameState, playerRole, wantsToOrderUp) {
  this.validateBid(
    currentGameState,
    playerRole,
    wantsToOrderUp ? "orderUp" : "pass",
    null,
  );

  const newState = structuredClone(currentGameState);

  const newBid = { round: 1, playerRole, decision: wantsToOrderUp ? "orderUp" : "pass" };
  newState.bids = [...(newState.bids || []), newBid];

  let messageText = `${newState.players[playerRole]?.name || playerRole} `;

  if (wantsToOrderUp) {
    if (!newState.turnCard) {
      throw new PhaseLogicError("Cannot order up: turn card is missing.");
    }
    messageText += `ordered up the dealer (${newState.dealer}) to pick up the ${cardToId(newState.turnCard)}.`;
    const makerTeam = newState.players[playerRole]?.teamId;
    if (!makerTeam) {
      logger.error(
        { gameId: newState.gameId, playerRole },
        "Could not determine team for ordering player in handleOrderUpDecision.",
      );
      throw new PhaseLogicError(
        "Player team could not be determined for ordering up.",
      );
    }
    
    newState.trumpSuit = newState.turnCard.suit;
    newState.playerWhoOrderedUp = playerRole;
    newState.makerTeam = makerTeam;
    newState.gamePhase = GAME_PHASES.DEALER_DISCARD;
    newState.currentPlayer = newState.dealer;
  } else {
    messageText += "passed.";
    const nextBidder = getNextPlayer(playerRole, PLAYER_ROLES);

    if (nextBidder === getNextPlayer(newState.dealer, PLAYER_ROLES)) {
      messageText += " All players passed in round 1. Moving to round 2 bidding.";
      newState.roundNumber = 2;
      newState.gamePhase = GAME_PHASES.ORDER_UP_ROUND2;
      newState.currentPlayer = getNextPlayer(newState.dealer, PLAYER_ROLES);
    } else {
      newState.currentPlayer = nextBidder;
    }
  }

  const newMessage = {
    type: "bidding",
    text: messageText,
    timestamp: new Date().toISOString(),
  };
  newState.gameMessages = [...(newState.gameMessages || []), newMessage];

  return newState;
}

/**
 * Processes the dealer's card discard after being ordered up in round 1.
 * This pure function requires `this.validateDealerDiscard` to be injected via its execution context.
 *
 * This pure function handles the dealer's discard action, which occurs after a successful
 * order-up in the first round of bidding. It validates the discard, removes the specified
 * card from the dealer's hand, and transitions the game to the playing phase.
 *
 * @param {GameState} currentGameState - The current immutable game state
 * @param {PlayerRole} dealerRole - The role of the dealer discarding
 * @param {string} cardToDiscardId - The ID of the card to discard (e.g., 'H-A' for Ace of Hearts)
 * @returns {GameState} A new game state with the dealer's hand updated
 *
 * @throws {import('../logic/validation-errors.js').ValidationError} If discard validation fails
 * @throws {import('../logic/validation-errors.js').NotPlayersTurnError} If called out of turn
 * @throws {import('../logic/validation-errors.js').InvalidDiscardError} For invalid discards
 * @throws {CardNotInHandError} If the specified card is not in the dealer's hand
 * @throws {PhaseLogicError} For internal logic errors (e.g., invalid game phase)
 *
 * @see {@link module:src/game/logic/validation-core.validateDealerDiscard} For discard validation logic
 * @see {@link module:test/game/phases/biddingPhase.unit.test.js} For test coverage
 * @see {@link module:src/socket/handlers/biddingHandlers} For WebSocket integration
 * @see {@link module:src/utils/cardUtils.cardToId} For converting card objects to IDs for messages
 *
 * @example
 * // Dealer discards a card
 * const newState = handleDealerDiscard.call({ validateDealerDiscard }, gameState, 'PLAYER_SOUTH', 'H-J');
 *
 * @example
 * // Throws if card not in hand
 * try {
 *   handleDealerDiscard.call({ validateDealerDiscard }, gameState, 'PLAYER_SOUTH', 'INVALID_CARD');
 * } catch (error) {
 *   console.error('Discard failed:', error.message);
 * }
 */
function handleDealerDiscard(currentGameState, dealerRole, cardToDiscardId) {
  const dealerHand = currentGameState.players[dealerRole]?.hand || [];
  const cardToDiscardObject = dealerHand.find(
    (card) => card.id === cardToDiscardId,
  );

  if (!cardToDiscardObject) {
    logger.error(
      { gameId: currentGameState.gameId, dealerHandAttempted: dealerHand, cardToDiscardId },
      "Card to discard (by ID) not found in dealer's hand.",
    );
    throw new CardNotInHandError(
      `Card ${cardToDiscardId} not found in dealer's hand.`,
    );
  }

  this.validateDealerDiscard(
    currentGameState,
    dealerRole,
    cardToDiscardObject,
    dealerHand,
  );

  const turnCard = currentGameState.turnCard;
  if (!turnCard) {
    throw new PhaseLogicError("Cannot discard: turn card is missing from game state.");
  }

  const newState = structuredClone(currentGameState);

  const newDealerHand = newState.players[dealerRole].hand.filter(
    (card) => card.id !== cardToDiscardId,
  );
  newState.players[dealerRole].hand = newDealerHand;

  const messageText = `${newState.players[dealerRole]?.name || dealerRole} picked up the ${cardToId(turnCard)} and discarded ${cardToId(cardToDiscardObject)}.`;
  
  const goAloneDecider = newState.playerWhoOrderedUp || newState.playerWhoCalledTrump;
  newState.turnCard = null;
  newState.gamePhase = GAME_PHASES.GOING_ALONE_DECISION;
  newState.currentPlayer = goAloneDecider;
  
  const newMessage = {
    type: "bidding",
    text: messageText,
    timestamp: new Date().toISOString(),
  };
  newState.gameMessages = [...(newState.gameMessages || []), newMessage];

  return newState;
}

/**
 * Processes a player's decision in the second round of bidding (call trump or pass).
 * This pure function requires `this.validateBid` to be injected via its execution context.
 *
 * This pure function handles the second round of Euchre bidding, where players can
 * call any suit (except the turned-down card) as trump or pass. It validates the
 * bid, updates the game state, and transitions to the appropriate phase.
 *
 * @param {GameState} currentGameState - The current immutable game state
 * @param {PlayerRole} playerRole - The role of the player deciding
 * @param {boolean} wantsToCall - True to call a trump suit, false to pass
 * @param {Suit} [suitCalled] - Required if wantsToCall is true
 * @returns {GameState} A new game state reflecting the bidding decision
 *
 * @throws {import('../logic/validation-errors.js').ValidationError} If bid validation fails
 * @throws {import('../logic/validation-errors.js').NotPlayersTurnError} If called out of turn
 * @throws {import('../logic/validation-errors.js').InvalidBidError} For invalid bid parameters
 * @throws {import('../logic/validation-errors.js').InvalidPhaseError} If called in wrong phase
 * @throws {PhaseLogicError} For internal logic errors (e.g., missing team assignment)
 *
 * @see {@link module:src/game/logic/validation-core.validateBid} For bid validation logic
 * @see {@link module:test/game/phases/biddingPhase.unit.test.js} For test coverage
 * @see {@link module:src/socket/handlers/biddingHandlers} For WebSocket integration
 * @see {@link module:src/utils/players.getNextPlayer} For determining the next player
 *
 * @example
 * // Call hearts as trump
 * const newState = handleCallTrumpDecision.call({ validateBid }, gameState, 'PLAYER_EAST', true, 'CARD_SUIT_HEARTS');
 *
 * @example
 * // Pass the bid
 * const passedState = handleCallTrumpDecision.call({ validateBid }, gameState, 'PLAYER_WEST', false);
 *
 * @example
 * // Throws if suit not provided when calling
 * try {
 *   handleCallTrumpDecision.call({ validateBid }, gameState, 'PLAYER_NORTH', true);
 * } catch (error) {
 *   console.error('Call failed:', error.message);
 * }
 */
function handleCallTrumpDecision(currentGameState, playerRole, wantsToCall, suitCalled = null) {
  if (currentGameState.gamePhase !== GAME_PHASES.ORDER_UP_ROUND2) {
    throw new InvalidPhaseError(
      'callTrump decision',
      currentGameState.gamePhase,
      [GAME_PHASES.ORDER_UP_ROUND2]
    );
  }

  const player = currentGameState.players[playerRole];
  if (!player || (!player.teamId && !player.team)) {
    throw new InvalidBidError(`Could not determine team for player ${playerRole}.`);
  }

  this.validateBid(
    currentGameState,
    playerRole,
    wantsToCall ? "callTrump" : "pass",
    suitCalled,
  );

  const newState = structuredClone(currentGameState);

  const newBid = {
    round: 2,
    playerRole,
    decision: wantsToCall ? "callTrump" : "pass",
    suit: wantsToCall ? suitCalled : undefined,
  };
  newState.bids = [...(newState.bids || []), newBid];

  let messageText = `${newState.players[playerRole]?.name || playerRole} `;

  if (wantsToCall) {
    messageText += `called ${suitCalled} as trump.`;
    const makerTeam = player?.teamId || player?.team;

    newState.trumpSuit = suitCalled;
    newState.playerWhoCalledTrump = playerRole;
    newState.makerTeam = makerTeam;
    newState.gamePhase = GAME_PHASES.GOING_ALONE_DECISION;
    newState.currentPlayer = playerRole;
  } else {
    messageText += "passed.";
    if (playerRole === newState.dealer) {
      messageText += " All players passed in round 2. Misdeal.";
      newState.gamePhase = GAME_PHASES.DEALING;
      newState.currentPlayer = getNextPlayer(newState.dealer, PLAYER_ROLES);
      newState.turnCard = null;
      newState.trumpSuit = null;
      newState.roundNumber = 1;
      newState.playerWhoOrderedUp = null;
      newState.playerWhoCalledTrump = null;
      newState.makerTeam = null;
    } else {
      newState.currentPlayer = getNextPlayer(playerRole, PLAYER_ROLES);
    }
  }

  const newMessage = {
    type: "bidding",
    text: messageText,
    timestamp: new Date().toISOString(),
  };
  newState.gameMessages = [...(newState.gameMessages || []), newMessage];

  return newState;
}

export {
  handleOrderUpDecision,
  handleDealerDiscard,
  handleCallTrumpDecision,
};