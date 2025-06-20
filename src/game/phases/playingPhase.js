import { updateGameState } from '../state.js';
import { validatePlay } from '../logic/validation.js'; // Changed from isValidPlay
import { getCardRank } from '../../utils/deck.js';
import { getNextPlayer } from '../../utils/players.js';
import { GAME_PHASES } from '../../config/constants.js';
import { PhaseLogicError, NotPlayersTurnError, InvalidPhaseError } from '../logic/errors.js'; // Added error imports

/**
 * Handles a player playing a card.
 * Validates the play, updates the current trick, determines the next player,
 * and transitions to scoring if the hand is over.
 * This function relies on `validatePlay` to ensure the move is legal before proceeding.
 * It uses `updateGameState` for state transitions, implying it works with previous state to produce a new one.
 *
 * @param {object} gameState - The current state of the game.
 * @param {object} gameState.players - Player objects keyed by role, each with a `hand` array and `teamId`.
 * @param {Array<object>} gameState.currentTrick - Array of cards currently played in the trick.
 * @param {string} gameState.trumpSuit - The current trump suit.
 * @param {object} gameState.tricksTaken - Object tracking tricks taken by each team.
 * @param {string|null} gameState.currentPlayer - The role of the player whose turn it is.
 * @param {string|null} gameState.lastTrickWinner - The role of the player who won the last trick.
 * @param {string} [gameState.message] - Current game message.
 * @param {string} gameState.gamePhase - Current game phase (should be `PLAYING`).
 * @param {boolean} [gameState.goingAlone] - Flag indicating if a player is going alone.
 * @param {string|null} [gameState.partnerSittingOut] - Role of the partner sitting out, if any.
 * @param {string} playerRole - The role of the player making the play (e.g., 'player1', 'player2').
 * @param {object} cardPlayed - The card object that was played. Must have `id`, `rank`, and `suit`.
 * @param {string} cardPlayed.id - Unique identifier of the card.
 * @param {string} cardPlayed.rank - Rank of the card.
 * @param {string} cardPlayed.suit - Suit of the card.
 * @returns {object} The new game state after the card play.
 * @throws {PhaseLogicError} For internal inconsistencies (e.g., player not found, teamId missing for winner) or logic failures.
 * @throws {PhaseLogicError} For internal inconsistencies or logic failures.
 * @throws {NotPlayersTurnError} If it's not the player's turn (from validatePlay).
 * @throws {InvalidPhaseError} If not in PLAYING phase (from validatePlay).
 * @throws {CardNotInHandError} If card not in hand (from validatePlay).
 * @throws {MustFollowSuitError} If player fails to follow suit (from validatePlay).
 */
function handlePlayCard(gameState, playerRole, cardPlayed) {
  // Player existence check
  const player = gameState.players[playerRole];
  if (!player) {
    throw new PhaseLogicError(`Player ${playerRole} not found.`);
  }

  // Validate the play (this will throw on invalid phase, turn, or play)
  validatePlay(gameState, player.hand, cardPlayed, playerRole);

  let newGameState = { ...gameState }; // Start with a shallow copy

  // Remove card from player's hand
  const newHand = player.hand.filter(card => card.id !== cardPlayed.id);
  const updatedPlayers = {
    ...newGameState.players,
    [playerRole]: {
      ...newGameState.players[playerRole],
      hand: newHand,
    },
  };
  newGameState = updateGameState(gs => ({ ...gs, players: updatedPlayers }));

  // Add card to current trick
  const newCurrentTrick = [...newGameState.currentTrick, { ...cardPlayed, playedBy: playerRole }];
  newGameState = updateGameState(gs => ({ ...gs, currentTrick: newCurrentTrick }));

  // Determine next player or end trick/hand
  if (newCurrentTrick.length === 4) {
    // Determine trick winner
    const trickWinnerRole = determineTrickWinner(newCurrentTrick, newGameState.trumpSuit, newGameState.currentTrick[0]?.playedBy);
    // gameState.players is an object keyed by role, not an array.
    const winningPlayer = newGameState.players[trickWinnerRole];

  // Use winningPlayer.teamId
    if (!winningPlayer || winningPlayer.teamId === undefined) {
    throw new PhaseLogicError(`Could not determine teamId for trick winner: ${trickWinnerRole}`);
    }
    const winnerTeam = winningPlayer.teamId;

    const updatedTricksTaken = { ...newGameState.tricksTaken };
    updatedTricksTaken[winnerTeam]++;

    newGameState = updateGameState(gs => ({
      ...gs,
      tricksTaken: updatedTricksTaken,
      currentTrick: [],
      currentPlayer: trickWinnerRole,
      lastTrickWinner: trickWinnerRole,
      message: `${trickWinnerRole} wins the trick.`,
    }));

    const totalTricksPlayedThisHand = Object.values(newGameState.tricksTaken).reduce((sum, count) => sum + count, 0);

    if (totalTricksPlayedThisHand === 5) {
      const finalTricksMessageSegment = `Scores for this hand: ${JSON.stringify(newGameState.tricksTaken)}.`;
      newGameState = updateGameState(gs => ({
        ...gs,
        gamePhase: GAME_PHASES.SCORING,
        currentPlayer: null,
        message: `Hand over. ${finalTricksMessageSegment} Moving to scoring.`,
      }));
    }
  } else {
    // Advance to next player if trick is not over
    const playerRoles = Object.keys(newGameState.players);
    const nextPlayerForTrick = getNextPlayer(playerRole, playerRoles, newGameState.goingAlone, newGameState.partnerSittingOut);
    newGameState = updateGameState(gs => ({
      ...gs,
      currentPlayer: nextPlayerForTrick,
      message: `${playerRole} played ${cardPlayed.rank} of ${cardPlayed.suit}. Next player: ${nextPlayerForTrick}.`,
    }));
  }
  return newGameState;
}

/**
 * Determines the winner of a completed trick based on Euchre rules.
 * It considers the trump suit, the lead suit, and card ranks (including bowers).
 *
 * @param {Array<object>} trick - Array of cards played in the trick. Each card object in the array
 * should have `playedBy` (string), `suit` (string), and `rank` (string) properties.
 * It is assumed that the cards are in the order they were played.
 * @param {string} trumpSuit - The trump suit for the current hand.
 * @param {string} leadPlayerRole - The role of the player who led the trick (not directly used in current logic but good for context,
 * as `leadCard.suit` is derived from the first card in `trick`).
 * @returns {string} The role (`playedBy`) of the player who won the trick.
 * @throws {PhaseLogicError} If the trick does not contain exactly 4 cards.
 */
function determineTrickWinner(trick, trumpSuit, leadPlayerRole) { // leadPlayerRole is context, leadCard.suit is key
  if (!trick || trick.length !== 4) {
    throw new PhaseLogicError('Trick must have 4 cards to determine a winner.');
  }

  const leadCard = trick[0]; // The first card played in the trick establishes the lead suit (unless trumped)
  let winningCard = leadCard;

  for (let i = 1; i < trick.length; i++) {
    const currentCard = trick[i];
    // getCardRank needs the lead suit of the trick to correctly value off-suit cards.
    // The lead suit for rank comparison is always based on the first card played in the trick.
    const winningRank = getCardRank(winningCard, trumpSuit, leadCard.suit);
    const currentRank = getCardRank(currentCard, trumpSuit, leadCard.suit);

    if (currentRank > winningRank) {
      winningCard = currentCard;
    }
  }
  return winningCard.playedBy;
}

export { handlePlayCard, determineTrickWinner };
