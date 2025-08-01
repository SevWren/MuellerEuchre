/**
 * Game logic for the "Go Alone" decision phase in Euchre.
 * @module game/phases/goAlonePhase
 *
 * IMPORTANT: This module should NEVER modify the constants file directly.
 * All game configuration should be handled through the game state and parameters.
 * The constants file is considered immutable and should only be imported from, never modified.
 *
 * @see {@link module:src/config/constants}
 * @see {@link module:src/utils/players}
 * @see {@link module:src/game/logic/validation-errors}
 * @see {@link module:test/game/phases/goAlonePhase.unit.test.js}
 */
import {
  GAME_PHASES,
  PLAYER_POSITIONS,
  PLAYER_ROLES,
} from "../../config/constants.js";
import { getNextPlayer, getPartner } from "../../utils/players.js";
import {
  ValidationError,
  InvalidPhaseError,
  NotPlayersTurnError,
  PhaseLogicError,
} from "../logic/validation-errors.js";

/**
 * A type representing one of the valid player role strings.
 * @typedef {'PLAYER_SOUTH'|'PLAYER_WEST'|'PLAYER_NORTH'|'PLAYER_EAST'} PlayerRole
 */

/**
 * Represents the structure of a player object within the game state.
 * @typedef {object} Player
 * @property {string} name - The display name of the player.
 * @property {string|null} socketId - The socket ID of the connected player, or null if disconnected.
 * @property {Array<object>} hand - An array of card objects in the player's hand.
 * @property {string} teamId - The ID of the player's team (e.g., 'TEAM_NS', 'TEAM_EW').
 * @property {number} score - The player's current score (or their team's score).
 * @property {boolean} isConnected - True if the player is currently connected.
 * @property {number} tricksWonThisHand - The number of tricks won by this player in the current hand.
 */

/**
 * Represents the state of a Euchre game.
 * @typedef {object} GameState
 * @property {string} gameId - The unique identifier for the game.
 * @property {keyof typeof GAME_PHASES} gamePhase - Current phase of the game.
 * @property {PlayerRole} dealer - The role of the current dealer.
 * @property {Object.<PlayerRole, Player>} players - An object mapping player roles to player data.
 * @property {Array<object>} deck - The array of cards remaining in the deck.
 * @property {string|null} trumpSuit - The current trump suit.
 * @property {Array<object>} currentTrick - An array of cards played in the current trick.
 * @property {object<string, number>} tricksTaken - An object mapping team IDs to the number of tricks taken by that team.
 * @property {string|null} makerTeam - The team that made trump, or null.
 * @property {PlayerRole|null} playerWhoOrderedUp - The player who ordered up.
 * @property {PlayerRole|null} playerWhoCalledTrump - The player who called trump.
 * @property {boolean} goingAlone - True if a player is going alone.
 * @property {PlayerRole|null} playerGoingAlone - The role of the player going alone, if any.
 * @property {PlayerRole|null} partnerSittingOut - The role of the partner sitting out when going alone.
 * @property {object<string, number>} teamScores - An object mapping team IDs to their current scores.
 * @property {Array<object>} kitty - Cards in the kitty.
 * @property {object|null} turnCard - The card turned up as potential trump.
 * @property {PlayerRole} currentPlayer - The role of the current player.
 * @property {Array<object>} gameMessages - Log of game events and messages.
 * @property {string|null} leadSuit - The lead suit of the current trick.
 */

/**
 * Handles the decision of whether the trump-making team wants to "go alone".
 * This is a pure function that returns a new game state without mutating the input.
 *
 * @param {GameState} currentGameState - The current game state.
 * @param {PlayerRole} decidingPlayerRole - The role of the player making the decision.
 * @param {boolean} wantsToGoAlone - Whether the player wants to go alone.
 * @returns {GameState} The new game state with updates.
 * @throws {ValidationError} If inputs are invalid.
 * @throws {InvalidPhaseError} If not in GOING_ALONE_DECISION phase.
 * @throws {NotPlayersTurnError} If it's not the player's turn.
 * @throws {PhaseLogicError} If the player can't make this decision (e.g., not the trump maker).
 * @see {@link module:src/utils/players.getPartner}
 * @see {@link module:src/utils/players.getNextPlayer}
 * @see {@link module:src/config/constants.GAME_PHASES}
 * @see {@link module:src/config/constants.PLAYER_POSITIONS}
 * @see {@link module:src/config/constants.PLAYER_ROLES}
 */
export function handleGoAloneDecision(
  currentGameState,
  decidingPlayerRole,
  wantsToGoAlone
) {
  // Input validation - ensure all required parameters are provided and valid
  if (
    !currentGameState ||
    !currentGameState.players ||
    typeof currentGameState.players !== "object"
  ) {
    throw new ValidationError("Invalid game state: missing or invalid players");
  }

  if (
    typeof decidingPlayerRole !== "string" ||
    !Object.values(PLAYER_POSITIONS).includes(decidingPlayerRole)
  ) {
    throw new ValidationError("Invalid player role");
  }

  if (typeof wantsToGoAlone !== "boolean") {
    throw new ValidationError("wantsToGoAlone must be a boolean");
  }

  // Phase validation - must be in the correct phase
  if (
    currentGameState.gamePhase !== GAME_PHASES.GAME_PHASE_GOING_ALONE_DECISION
  ) {
    throw new InvalidPhaseError(
      `Cannot make "go alone" decision during ${currentGameState.gamePhase} phase.`,
      "go alone decision",
      GAME_PHASES.GAME_PHASE_GOING_ALONE_DECISION
    );
  }

  // Turn validation - must be the player's turn
  if (currentGameState.currentPlayer !== decidingPlayerRole) {
    throw new NotPlayersTurnError(
      decidingPlayerRole,
      currentGameState.currentPlayer
    );
  }

  // Role validation - only the trump maker can decide to go alone
  const trumpMaker =
    currentGameState.playerWhoOrderedUp ||
    currentGameState.playerWhoCalledTrump;
  if (!trumpMaker) {
    throw new PhaseLogicError("Cannot determine trump maker");
  }

  if (decidingPlayerRole !== trumpMaker) {
    throw new PhaseLogicError(
      `Only the player who made trump (${trumpMaker}) can decide to go alone. Player ${decidingPlayerRole} attempted.`
    );
  }

  // Create a deep copy of the current game state to avoid mutating the input
  // Note: In a real implementation, you might want to use a more efficient deep clone
  // or an immutable data structure library for better performance with large objects
  const newGameState = {
    ...currentGameState,
    // Override only the properties that need to change
    goingAlone: wantsToGoAlone,
    playerGoingAlone: wantsToGoAlone ? trumpMaker : null,
    partnerSittingOut: wantsToGoAlone
      ? getPartner(trumpMaker, currentGameState.players)
      : null,
    gamePhase: GAME_PHASES.GAME_PHASE_PLAYING,
    currentTrick: [],
    leadSuit: null,
    // Create a new array for game messages to avoid mutation
    gameMessages: [
      ...(currentGameState.gameMessages || []),
      {
        type: "game_flow",
        text: wantsToGoAlone
          ? `${currentGameState.players[trumpMaker]?.name || trumpMaker} is going alone! ` +
            `${currentGameState.players[getPartner(trumpMaker, currentGameState.players)]?.name || "Partner"} sits out.`
          : `${currentGameState.players[trumpMaker]?.name || trumpMaker} chooses to play with a partner.`,
        timestamp: new Date().toISOString(),
      },
    ],
  };

  // Determine the first player for the PLAYING phase - use PLAYER_ROLES to maintain correct order
  let firstPlayer = getNextPlayer(newGameState.dealer, PLAYER_ROLES);

  // If that player is the one sitting out, the player to their left starts
  if (wantsToGoAlone && newGameState.partnerSittingOut === firstPlayer) {
    firstPlayer = getNextPlayer(firstPlayer, PLAYER_ROLES);
  }

  // Set the current player for the next phase
  newGameState.currentPlayer = firstPlayer;

  return newGameState;
}
