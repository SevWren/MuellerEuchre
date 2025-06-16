import { GAME_PHASES, WINNING_SCORE } from '../../config/constants.js';
import { log } from '../../utils/logger.js';

/**
 * Checks if the game has been won and updates the game state accordingly
 * @param {Object} gameState - Current game state
 * @returns {Object} Updated game state with game over status if applicable
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
 * Handles the end of a game
 * @private
 * @param {Object} gameState - Current game state
 * @param {string} winningTeam - The team that won the game
 * @returns {Object} Updated game state with game over status
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
 * Handles a request to start a new game
 * @param {Object} gameState - Current game state
 * @returns {Object} Reset game state for a new game
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
 * Calculates the current scores for each team
 * @private
 * @param {Object} gameState - Current game state
 * @returns {Object} Team scores
 */
function calculateTeamScores(gameState) {
    return {
        'north+south': gameState.scores?.['north+south'] || 0,
        'east+west': gameState.scores?.['east+west'] || 0
    };
}

/**
 * Handles the end of a hand and updates scores
 * @param {Object} gameState - Current game state
 * @returns {Object} Updated game state with scores and next phase
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
 * Gets the opponent team for a given team
 * @private
 * @param {string} team - The team to get the opponent for
 * @returns {string} The opponent team
 */
function getOpponentTeam(team) {
    return team === 'north+south' ? 'east+west' : 'north+south';
}
