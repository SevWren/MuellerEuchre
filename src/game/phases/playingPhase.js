/**
 * @file src/game/phases/playingPhase.js
 * @module game/phases/playingPhase
 * @description
 *   Pure Layer 1 module implementing the core logic for the "PLAYING" phase of Euchre.
 *   This module is responsible for processing card plays, managing the state of the
 *   current trick, determining the trick winner, and transitioning the game to the
 *   SCORING phase when a hand is complete.
 *
 *   As a pure Layer 1 module, all functions herein are stateless and deterministic. They
 *   receive the current game state and an action, and return a new, updated game state
 *   without any side effects.
 */

// =============================================================================
// Type Definitions for JSDoc
// =============================================================================

import { GAME_PHASES, PLAYER_ROLES, TEAMS, SUITS, VALUES } from "../../config/constants.js";
import {
  PhaseLogicError,
  NotPlayersTurnError,
  InvalidPhaseError,
  CardNotInHandError,
  MustFollowSuitError
} from "../logic/validation-errors.js";

/**
 * A type representing one of the valid player role strings.
 * This is created directly from the keys of the PLAYER_ROLES constant array.
 * @typedef {keyof typeof PLAYER_ROLES} PlayerRole
 */

/**
 * A type representing one of the valid team name strings.
 * @typedef {keyof typeof TEAMS} TeamName
 */

/**
 * Represents a playing card.
 * @typedef {object} Card
 * @property {string} id - The unique identifier for the card (e.g., "AS", "9D").
 * @property {string} suit - The suit of the card, from SUITS constants.
 * @property {string} value - The face value of the card ('9', '10', 'J', 'Q', 'K', 'A').
 * @property {string} name - The human-readable name (e.g., "Ace of Spades").
 */

/**
 * Represents a single player within the game state.
 * @typedef {object} Player
 * @property {string} id - The unique identifier for the player's session or account.
 * @property {string} name - The player's display name.
 * @property {PlayerRole} role - The player's assigned role (e.g., 'PLAYER_SOUTH').
 * @property {TeamName} teamId - The ID of the team the player belongs to (e.g., 'TEAM_NS').
 * @property {Card[]} hand - An array of card objects in the player's hand.
 * @property {boolean} isConnected - The player's current connection status.
 */

/**
 * Represents the complete, canonical state of a single Euchre game.
 * @typedef {object} GameState
 * @property {string} gameId - The unique identifier for the game session.
 * @property {string} gamePhase - The current phase of the game, from GAME_PHASES.
 * @property {Object.<PlayerRole, Player>} players - A map of player roles to player data.
 * @property {PlayerRole} dealer - The role of the current dealer.
 * @property {PlayerRole} currentPlayer - The role of the player whose turn it is.
 * @property {string | null} trumpSuit - The suit that is currently trump.
 * @property {string | null} makerTeam - The team that called trump.
 * @property {boolean} goingAlone - True if the maker is playing without their partner.
 * @property {PlayerRole | null} partnerSittingOut - The role of the partner sitting out.
 * @property {{card: Card, playedBy: PlayerRole}[]} currentTrick - The cards played in the current trick.
 * @property {Object.<TeamName, number>} tricksTaken - A map of team IDs to the number of tricks they have won.
 */

// =============================================================================
// Internal Helper Functions
// =============================================================================

/**
 * Creates a deep clone of the game state to ensure immutability.
 * @private
 * @param {GameState} state - The game state to clone.
 * @returns {GameState} A new, deep copy of the game state.
 * @throws {Error} If the state cannot be cloned.
 */
function deepCloneState(state) {
  try {
    return structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
  } catch (error) {
    throw new Error('Failed to clone game state', { cause: error });
  }
}

/**
 * Validates that a player exists in the game state.
 * @private
 * @param {GameState} gameState - The current game state.
 * @param {PlayerRole} playerRole - The role of the player to validate.
 * @returns {Player} The player object if found.
 * @throws {PhaseLogicError} If the player is not found in the game state.
 */
function validatePlayer(gameState, playerRole) {
  if (!gameState?.players?.[playerRole]) {
    throw new PhaseLogicError(`Player ${playerRole} not found`);
  }
  return gameState.players[playerRole];
}

// =============================================================================
// Public API Functions
// =============================================================================

/**
 * Handles a player playing a card. Validates the play, updates the current trick,
 * determines the next player, and transitions to scoring if the hand is over.
 * @description This function relies on `this.validatePlay` and `this.getNextPlayer`
 * being available in its execution context via dependency injection.
 *
 * @param {GameState} gameState - The current, immutable state of the game.
 * @param {PlayerRole} playerRole - The role of the player making the play.
 * @param {Card} cardPlayed - The card object that was played.
 * @returns {GameState} The new, updated game state.
 * @throws {TypeError} If any of the input arguments are of the wrong type.
 * @throws {PhaseLogicError} For internal inconsistencies or logic failures.
 * @throws {NotPlayersTurnError} If it's not the player's turn (from `this.validatePlay`).
 * @throws {InvalidPhaseError} If not in PLAYING phase (from `this.validatePlay`).
 * @throws {CardNotInHandError} If card not in hand (from `this.validatePlay`).
 * @throws {MustFollowSuitError} If player fails to follow suit (from `this.validatePlay`).
 * @see src/socket/handlers/playingHandlers.js
 * @see test/game/phases/playingPhase.unit.test.js
 * @see docs/refactoring_Playing_Phase_And_playing_phase_test_task_guide.md
 * @see docs/Knowledge/The Going Alone Gameplay and Scoring Modifiers.md
 */
function handlePlayCard(gameState, playerRole, cardPlayed) {
  if (!gameState || typeof gameState !== 'object') {
    throw new TypeError('gameState must be an object');
  }
  if (!playerRole || typeof playerRole !== 'string') {
    throw new TypeError('playerRole must be a non-empty string');
  }
  if (!cardPlayed || typeof cardPlayed !== 'object') {
    throw new TypeError('cardPlayed must be an object');
  }
  
  const player = validatePlayer(gameState, playerRole);

  // Validate the play and throw any validation errors
  this.validatePlay(gameState, player.hand, cardPlayed, playerRole);

  // Create a deep clone of the game state
  let newGameState = deepCloneState(gameState);

  // Remove card from player's hand
  const newHand = player.hand.filter((card) => card.id !== cardPlayed.id);
  if (newHand.length === player.hand.length) {
      throw new PhaseLogicError(`Card ${cardPlayed.id} not found in player's hand after validation.`);
  }
  newGameState.players = {
    ...newGameState.players,
    [playerRole]: {
      ...newGameState.players[playerRole],
      hand: newHand,
    },
  };

  // Add card to current trick
  newGameState.currentTrick = [
    ...newGameState.currentTrick,
    { card: cardPlayed, playedBy: playerRole },
  ];

  // Determine next player or end trick/hand
  if (newGameState.currentTrick.length === 4) {
    const completedTrick = [...newGameState.currentTrick];
    // Determine trick winner
    const trickWinnerRole = determineTrickWinner.call(
      this, // Pass the context to determineTrickWinner
      completedTrick,
      newGameState.trumpSuit,
      completedTrick[0]?.playedBy
    );
    
    const winningPlayer = newGameState.players[trickWinnerRole];
    const winnerTeam = winningPlayer?.teamId;
    
    if (winnerTeam === undefined) {
      throw new PhaseLogicError(
        `Could not determine teamId for trick winner: ${trickWinnerRole}`
      );
    }

    // **FIX START**: Find the actual winning card to store in the state
    const leadSuit = this.getEffectiveSuit(completedTrick[0].card, newGameState.trumpSuit);
    let winningCard = completedTrick[0].card;
    let winningRank = this.getCardRank(winningCard, newGameState.trumpSuit, leadSuit);

    for (let i = 1; i < completedTrick.length; i++) {
        const currentCard = completedTrick[i].card;
        const currentRank = this.getCardRank(currentCard, newGameState.trumpSuit, leadSuit);
        if (currentRank > winningRank) {
            winningCard = currentCard;
            winningRank = currentRank;
        }
    }
    // **FIX END**

    const updatedTricksTaken = {
      ...newGameState.tricksTaken,
      [winnerTeam]: (newGameState.tricksTaken[winnerTeam] || 0) + 1
    };

    newGameState.tricksTaken = updatedTricksTaken;
    newGameState.lastTrick = completedTrick; // **FIX**: Save the completed trick
    newGameState.lastTrickWinner = trickWinnerRole;
    newGameState.lastTrickWinningCard = winningCard; // **FIX**: Save the winning card
    newGameState.lastTrickWinningTeam = winnerTeam; // **FIX**: Save the winning team
    newGameState.currentTrick = [];
    newGameState.currentPlayer = trickWinnerRole;
    newGameState.message = `${trickWinnerRole} wins the trick.`;

    const totalTricksPlayedThisHand = Object.values(
      newGameState.tricksTaken,
    ).reduce((sum, count) => sum + count, 0);

    if (totalTricksPlayedThisHand === 5) {
      const finalTricksMessageSegment = `Scores for this hand: ${JSON.stringify(newGameState.tricksTaken)}.`;
      newGameState.gamePhase = GAME_PHASES.SCORING;
      newGameState.currentPlayer = null;
      newGameState.message = `Hand over. ${finalTricksMessageSegment} Moving to scoring.`;
    }
  } else {
    // Advance to next player if trick is not over
    const playerRoles = Object.keys(newGameState.players);
    const nextPlayerForTrick = this.getNextPlayer(
      playerRole,
      playerRoles,
      newGameState.goingAlone,
      newGameState.partnerSittingOut,
    );
    newGameState.currentPlayer = nextPlayerForTrick;
    newGameState.message = `${playerRole} played ${cardPlayed.value} of ${cardPlayed.suit}. Next player: ${nextPlayerForTrick}.`;
  }
  return newGameState;
}

/**
 * Determines the winner of a completed trick based on Euchre rules.
 * @description This function relies on `this.getCardRank` being available in its
 * execution context via dependency injection.
 *
 * @param {Array} trick - Array of card objects with playedBy property
 * @param {string} trumpSuit - The current trump suit
 * @param {string} leadPlayerRole - The player who led the trick
 * @returns {string} The role of the player who won the trick
 * @throws {PhaseLogicError} If trick is invalid or missing required properties
 * @see test/game/phases/playingPhase.unit.test.js - For test cases
 * @see docs/The Complete Card Ranking Hierarchy.md - For card ranking rules
 */
function determineTrickWinner(trick, trumpSuit, leadPlayerRole) {
  if (typeof this.getCardRank !== 'function' || typeof this.getEffectiveSuit !== 'function') {
    throw new TypeError('this.getCardRank and this.getEffectiveSuit must be functions');
  }
  
  validateTrick(trick);
  
  if (!leadPlayerRole) {
    throw new PhaseLogicError('leadPlayerRole is required');
  }

  const leadCard = trick[0].card;
  // **FIX START**: Use getEffectiveSuit to correctly handle the Left Bower being led.
  const ledSuit = this.getEffectiveSuit(leadCard, trumpSuit);
  // **FIX END**
  
  let winningEntry = trick[0];
  let winningRank = this.getCardRank(winningEntry.card, trumpSuit, ledSuit);

  for (let i = 1; i < trick.length; i++) {
    const currentEntry = trick[i];
    const currentRank = this.getCardRank(currentEntry.card, trumpSuit, ledSuit);
    
    if (currentRank > winningRank) {
      winningEntry = currentEntry;
      winningRank = currentRank;
    }
  }
  
  return winningEntry.playedBy;
}

function validateTrick(trick) {
  if (!Array.isArray(trick) || trick.length !== 4) {
    throw new PhaseLogicError('Trick must have 4 cards to determine a winner');
  }
}

export { handlePlayCard, determineTrickWinner };