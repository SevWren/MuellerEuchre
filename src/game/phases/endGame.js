import { GAME_PHASES, WINNING_SCORE } from '../../config/constants.js';
import { log } from '../../utils/logger.js';

/**
 * Checks if the game has been won and updates the game state accordingly
 * @param {Object} gameState - Current game state
 * @returns {Object} Updated game state with game over status if applicable
 */
export function checkGameOver(gameState) {
    log(1, '[checkGameOver] Checking for game over condition');
    
    // Create a deep copy of the game state
    const updatedState = JSON.parse(JSON.stringify(gameState));
    
    // Check if either team has reached the winning score
    const teamScores = calculateTeamScores(updatedState);
    const winningTeam = Object.entries(teamScores).find(
        ([_, score]) => score >= WINNING_SCORE
    )?.[0];
    
    if (winningTeam) {
        return endGame(updatedState, winningTeam);
    }
    
    // No winner yet
    return updatedState;
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
    
    // Create a deep copy of the game state
    const updatedState = JSON.parse(JSON.stringify(gameState));
    
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
    
    // Calculate points
    let points = 1; // Standard win
    
    if (makerTricks === 5) {
        // March (won all 5 tricks)
        points = 2;
        updatedState.messages.push({
            type: 'score',
            text: `Team ${makerTeam} made a march! 2 points!`,
            important: true
        });
    } else if (makerTricks === 0) {
        // Euchred (didn't make bid)
        points = 2; // Other team gets 2 points
        updatedState.messages.push({
            type: 'score',
            text: `Team ${makerTeam} was euchred! 2 points for ${getOpponentTeam(makerTeam)}!`,
            important: true
        });
    } else if (makerWon) {
        updatedState.messages.push({
            type: 'score',
            text: `Team ${makerTeam} made their bid! 1 point.`,
            important: true
        });
    } else {
        updatedState.messages.push({
            type: 'score',
            text: `Team ${makerTeam} was set! 1 point for ${getOpponentTeam(makerTeam)}.`,
            important: true
        });
    }
    
    // Update scores
    if (makerWon) {
        updatedState.scores[makerTeam] = (updatedState.scores[makerTeam] || 0) + points;
    } else {
        const opponentTeam = getOpponentTeam(makerTeam);
        updatedState.scores[opponentTeam] = (updatedState.scores[opponentTeam] || 0) + points;
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
