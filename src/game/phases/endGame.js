import { GAME_PHASES, WINNING_SCORE } from '../../config/constants.js';
import { log } from '../../utils/logger.js';

/**
 * Checks if the game has been won by comparing team scores against `WINNING_SCORE`.
 * If a team has won, it calls `endGame` to update the game state.
 *
 * @param {object} gameState - Current game state.
 * @param {object} gameState.scores - Object containing scores for teams (e.g., `{'north+south': 5, 'east+west': 3}`).
 * @param {boolean} [gameState.gameOver] - Flag indicating if the game is over.
 * @param {string|null} [gameState.winningTeam] - The team that won, if any.
 * @param {string} [gameState.currentPhase] - The current phase of the game.
 * @param {Array<object>} [gameState.messages] - Array of game messages.
 * @param {object} [gameState.matchStats] - Statistics for the overall match.
 * @returns {object} The potentially updated game state. If the game is over, state will reflect this; otherwise, original state is returned.
 */
export function checkGameOver(gameState) { // gameState is already a deep copy from handleEndOfHand's perspective or should be treated as mutable
    log(1, '[checkGameOver] Checking for game over condition');
    
    // No need to clone again if gameState is already a mutable copy or its modification is intended.
    // const updatedState = JSON.parse(JSON.stringify(gameState)); // Removed redundant clone
    
    // Check if either team has reached the winning score
    // Ensure calculateTeamScores uses the passed gameState directly
    const teamScores = calculateTeamScores(gameState);
    const winningTeam = Object.entries(teamScores).find(
        ([_, score]) => score >= WINNING_SCORE
    )?.[0];
    
    if (winningTeam) {
        // endGame will modify the gameState object directly (or its clone if passed)
        return endGame(gameState, winningTeam);
    }
    
    // No winner yet
    return gameState; // Return the passed gameState, possibly modified by endGame or unchanged
}

/**
 * Updates the game state to reflect that the game has ended.
 * Sets `gameOver` to true, records the `winningTeam`, changes `currentPhase` to `GAME_OVER`,
 * adds a game over message, and updates match statistics.
 * This function mutates the passed `gameState` object.
 *
 * @private
 * @param {object} gameState - Current game state to be modified.
 * @param {boolean} gameState.gameOver - Will be set to true.
 * @param {string|null} gameState.winningTeam - Will be set to the `winningTeam` argument.
 * @param {string} gameState.currentPhase - Will be set to `GAME_PHASES.GAME_OVER`.
 * @param {Array<object>} gameState.messages - Game over message will be added.
 * @param {object} gameState.matchStats - Match statistics will be updated.
 * @param {string} winningTeam - The identifier of the team that won the game (e.g., 'north+south').
 * @returns {object} The modified `gameState` object.
 */
function endGame(gameState, winningTeam) {
    log(1, `[endGame] Game over! ${winningTeam} wins!`);
    
    // Update game state
    gameState.gameOver = true;
    gameState.winningTeam = winningTeam;
    gameState.currentPhase = GAME_PHASES.GAME_OVER;
    
    // Add game message
    gameState.messages = gameState.messages || [];
    gameState.messages.push({
        type: 'game_over',
        team: winningTeam,
        text: `Game Over! ${winningTeam} wins the game!`,
        important: true
    });
    
    // Update match statistics
    gameState.matchStats = gameState.matchStats || {
        gamesPlayed: 0,
        teamWins: {
            'north+south': 0,
            'east+west': 0
        },
        lastUpdated: new Date().toISOString()
    };
    
    gameState.matchStats.gamesPlayed += 1;
    gameState.matchStats.teamWins[winningTeam] += 1;
    gameState.matchStats.lastUpdated = new Date().toISOString();
    
    return gameState;
}

/**
 * Resets the game state to prepare for a new game.
 * This typically involves clearing scores, player hands (implicitly by resetting players object),
 * game over status, and setting the phase to LOBBY.
 * Creates a deep copy of the input `gameState` to avoid mutating the original object from the previous game.
 *
 * @param {object} gameState - The current (likely game-over) game state.
 * This object is not mutated; a deep copy is made.
 * @returns {object} A new game state object, reset for a new game.
 */
export function startNewGame(gameState) {
    log(1, '[startNewGame] Starting a new game');
    
    // Create a deep copy of the game state
    const updatedState = JSON.parse(JSON.stringify(gameState));
    
    // Reset game-specific state
    updatedState.gameOver = false;
    updatedState.winningTeam = null;
    updatedState.currentPhase = GAME_PHASES.LOBBY;
    updatedState.players = {};
    updatedState.messages = [];
    
    // Reset player scores
    updatedState.scores = {
        'north+south': 0,
        'east+west': 0
    };
    
    // Add game message
    updatedState.messages.push({
        type: 'game',
        text: 'A new game is starting!',
        important: true
    });
    
    return updatedState;
}

/**
 * Calculates the current scores for each team based on the `gameState.scores` object.
 * Returns a new object with scores for 'north+south' and 'east+west', defaulting to 0 if not present.
 *
 * @private
 * @param {object} gameState - Current game state.
 * @param {object} [gameState.scores] - Object containing current scores for teams.
 * @returns {object} An object containing team scores, e.g., `{'north+south': 0, 'east+west': 0}`.
 */
function calculateTeamScores(gameState) {
    return {
        'north+south': gameState.scores?.['north+south'] || 0,
        'east+west': gameState.scores?.['east+west'] || 0
    };
}

/**
 * Processes the end of a hand: calculates points scored based on tricks won and the maker team,
 * updates team scores, adds relevant game messages, and then checks if the game is over.
 * Creates a deep copy of the `gameState` to ensure modifications do not affect previous states directly.
 *
 * @param {object} gameState - The current game state at the end of a hand.
 * @param {Array<object>} gameState.tricks - Array of completed tricks, each indicating the winning team.
 * @param {string} gameState.makerTeam - The team that made trump.
 * @param {object} gameState.scores - Current scores for each team.
 * @param {Array<object>} gameState.messages - Array of game messages.
 * @returns {object} The updated game state after scoring and checking for game over. This will be a new object.
 */
export function handleEndOfHand(gameState) {
    log(1, '[handleEndOfHand] Processing end of hand');
    log(1, `[handleEndOfHand] Initial gameState.scores: NS=${gameState.scores?.['north+south']}, EW=${gameState.scores?.['east+west']}`);
    
    // Create a deep copy of the game state
    const updatedState = JSON.parse(JSON.stringify(gameState));
    log(1, `[handleEndOfHand] Cloned updatedState.scores: NS=${updatedState.scores?.['north+south']}, EW=${updatedState.scores?.['east+west']}`);
    
    // Calculate tricks won by each team
    const tricksByTeam = {
        'north+south': 0,
        'east+west': 0
    };
    
    updatedState.tricks.forEach(trick => {
        tricksByTeam[trick.team] = (tricksByTeam[trick.team] || 0) + 1;
    });
    
    // Determine if makers made their bid
    const makerTeam = updatedState.makerTeam;
    const makerTricks = tricksByTeam[makerTeam] || 0;
    const makerWon = makerTricks >= 3;
    let points = 0;
    let scoringTeam = null;
    let messageText = '';

    if (makerWon) {
        scoringTeam = makerTeam;
        if (makerTricks === 5) { // March
            points = 2; // Standard Euchre march score for makers
            messageText = `Team ${makerTeam} made a march! ${points} points!`;
        } else { // Made bid (3 or 4 tricks)
            points = 1;
            messageText = `Team ${makerTeam} made their bid! ${points} point.`;
        }
    } else { // Euchred (makers got 0, 1, or 2 tricks)
        scoringTeam = getOpponentTeam(makerTeam);
        points = 2; // Opponents always get 2 points for a euchre
        messageText = `Team ${makerTeam} was euchred! ${points} points for ${scoringTeam}!`;
    }
    
    updatedState.messages.push({
        type: 'score',
        text: messageText,
        important: true
    });

    // Update scores
    log(1, `[handleEndOfHand] About to update scores. scoringTeam: ${scoringTeam}, makerTricks: ${makerTricks}, points: ${points}`);
    if (scoringTeam) {
        const currentScore = updatedState.scores[scoringTeam] || 0;
        log(1, `[handleEndOfHand] Updating score for ${scoringTeam}. Current: ${currentScore}, Adding: ${points}`);
        updatedState.scores[scoringTeam] = currentScore + points;
        log(1, `[handleEndOfHand] New score for ${scoringTeam}: ${updatedState.scores[scoringTeam]}`);
    } else {
        // This case should ideally not be reached if logic is correct (a team always scores)
        log(1, `[handleEndOfHand] No team scored points this hand. makerTricks: ${makerTricks}, makerTeam: ${makerTeam}`);
    }
    
    // Add score summary
    updatedState.messages.push({
        type: 'score_summary',
        text: `Scores - North/South: ${updatedState.scores['north+south']}, East/West: ${updatedState.scores['east+west']}`,
        important: true
    });
    
    // Check for game over
    return checkGameOver(updatedState);
}

/**
 * Determines the opponent team for a given team identifier.
 *
 * @private
 * @param {string} team - The team identifier (e.g., 'north+south' or 'east+west').
 * @returns {string} The identifier of the opposing team.
 */
function getOpponentTeam(team) {
    return team === 'north+south' ? 'east+west' : 'north+south';
}
