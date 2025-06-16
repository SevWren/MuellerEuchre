import { GameState, updateGameState } from '../state.js';
import { isValidPlay } from '../logic/validation.js';
import { getCardRank } from '../../utils/deck.js';
import { getNextPlayer } from '../../utils/players.js';
import { GAME_PHASES } from '../../config/constants.js';

/**
 * Handles a player playing a card.
 * Validates the play, updates the current trick, determines the next player,
 * and transitions to scoring if the hand is over.
 *
 * @param {GameState} gameState The current state of the game.
 * @param {string} playerRole The role of the player making the play (e.g., 'player1', 'player2').
 * @param {object} cardPlayed The card object that was played.
 * @returns {GameState} The new game state.
 * @throws {Error} If the play is invalid.
 */
function handlePlayCard(gameState, playerRole, cardPlayed) {
  if (gameState.gamePhase !== GAME_PHASES.PLAYING) {
    throw new Error('Not in PLAYING phase.');
  }
  if (gameState.currentPlayer !== playerRole) {
    throw new Error(`Not player ${playerRole}'s turn.`);
  }

  const player = gameState.players.find(p => p.role === playerRole);
  if (!player) {
    throw new Error(`Player ${playerRole} not found.`);
  }

  // Corrected call to isValidPlay: playerRole is the 4th argument.
  // gameState.currentTrick and gameState.trumpSuit are accessible within isValidPlay from gameState.
  if (!isValidPlay(gameState, player.hand, cardPlayed, playerRole)) {
    throw new Error('Invalid play.');
  }

  let newGameState = { ...gameState };

  // Remove card from player's hand
  const newHand = player.hand.filter(card => !(card.suit === cardPlayed.suit && card.rank === cardPlayed.rank));
  const newPlayers = newGameState.players.map(p =>
    p.role === playerRole ? { ...p, hand: newHand } : p
  );
  newGameState = updateGameState(newGameState, { players: newPlayers });

  // Add card to current trick
  const newCurrentTrick = [...newGameState.currentTrick, { ...cardPlayed, playedBy: playerRole }];
  newGameState = updateGameState(newGameState, { currentTrick: newCurrentTrick });

  // Determine next player or end trick/hand
  if (newCurrentTrick.length === 4) {
    // Determine trick winner
    const trickWinnerRole = determineTrickWinner(newCurrentTrick, newGameState.trumpSuit, newGameState.currentTrick[0]?.playedBy);
    const winningPlayer = newGameState.players.find(p => p.role === trickWinnerRole);

    // Use winningPlayer.team (assuming it's set during player initialization)
    if (!winningPlayer || winningPlayer.team === undefined) {
      throw new Error(`Could not determine team for trick winner: ${trickWinnerRole}`);
    }
    const winnerTeam = winningPlayer.team;

    const newTricksTaken = { ...newGameState.tricksTaken };
    newTricksTaken[winnerTeam]++;

    newGameState = updateGameState(newGameState, {
      tricksTaken: newTricksTaken,
      currentTrick: [], // Reset for next trick
      currentPlayer: trickWinnerRole, // Winner leads next trick
      lastTrickWinner: trickWinnerRole,
      message: `${trickWinnerRole} wins the trick.`,
    });

    // Check if hand is over (5 tricks played)
    // Summing tricks for teamNS and teamEW might not be robust if team names change.
    // It's better to sum all values in newTricksTaken if it stores tricks per team.
    // Assuming newTricksTaken is { TEAM1: count, TEAM2: count }
    const totalTricksPlayed = Object.values(newTricksTaken).reduce((sum, count) => sum + count, 0);
    if (totalTricksPlayed === 5) { // Assuming 5 tricks per hand based on typical Euchre rules
      newGameState = updateGameState(newGameState, {
        gamePhase: GAME_PHASES.SCORING,
        currentPlayer: null, // Or determine who starts scoring/dealing next
        message: `Hand over. Scores for this hand: ${JSON.stringify(newTricksTaken)}. Moving to scoring.`,
      });
    }
  } else {
    // Advance to next player in the trick
    // Corrected call to getNextPlayer:
    // 1st arg: currentPlayerRole
    // 2nd arg (optional): playerSlots (e.g., newGameState.players.map(p => p.role) or PLAYER_ROLES from constants)
    // 3rd arg (optional): goingAlone (boolean)
    // 4th arg (optional): partnerSittingOut (string)
    // For simple trick progression, assuming PLAYER_ROLES contains the fixed order.
    const playerRoles = newGameState.players.map(p => p.role); // Or import PLAYER_ROLES if static and always used
    const nextPlayerForTrick = getNextPlayer(playerRole, playerRoles, newGameState.goingAlone, newGameState.partnerSittingOut);
    newGameState = updateGameState(newGameState, {
      currentPlayer: nextPlayerForTrick,
      message: `${playerRole} played ${cardPlayed.rank} of ${cardPlayed.suit}. Next player: ${nextPlayerForTrick}.`,
    });
  }
  return newGameState;
}

/**
 * Determines the winner of a completed trick.
 *
 * @param {Array<object>} trick Array of cards played in the trick, with {playedBy, suit, rank}.
 * @param {string} trumpSuit The trump suit for the current hand.
 * @param {string} leadPlayerRole The role of the player who led the trick.
 * @returns {string} The role of the player who won the trick.
 */
function determineTrickWinner(trick, trumpSuit, leadPlayerRole) {
  if (!trick || trick.length !== 4) {
    throw new Error('Trick must have 4 cards to determine a winner.');
  }

  const leadCard = trick[0];
  let winningCard = leadCard;

  for (let i = 1; i < trick.length; i++) {
    const currentCard = trick[i];
    const winningRank = getCardRank(winningCard, trumpSuit, leadCard.suit);
    const currentRank = getCardRank(currentCard, trumpSuit, leadCard.suit);

    if (currentRank > winningRank) {
      winningCard = currentCard;
    }
  }
  return winningCard.playedBy;
}

export { handlePlayCard, determineTrickWinner };
