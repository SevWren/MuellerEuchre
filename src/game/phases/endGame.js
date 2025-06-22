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
    const currentTeamScores = calculateTeamScores(gameState); // Renamed to avoid conflict
    const winningTeam = Object.entries(currentTeamScores).find(
        ([teamId, score]) => score >= WINNING_SCORE
    )?.[0]; // teamId will be TEAMS.TEAM_NS or TEAMS.TEAM_EW
    
    if (winningTeam) {
        // endGame will modify the gameState object directly (or its clone if passed)
        return endGame(gameState, winningTeam, currentTeamScores); // Pass scores to avoid recalculation
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
function endGame(gameState, winningTeam, finalScores) { // Added finalScores parameter
    const winningTeamDisplay = winningTeam === TEAMS.TEAM_NS ? 'North/South' : 'East/West';
    log(1, `[endGame] Game over! ${winningTeamDisplay} wins!`);
    
    // Update game state
    gameState.gameOver = true;
    gameState.winningTeam = winningTeam; // Should be TEAMS.TEAM_NS or TEAMS.TEAM_EW
    gameState.currentPhase = GAME_PHASES.GAME_OVER;
    
    // Add game message
    gameState.messages = gameState.messages || [];
    gameState.messages.push({
        type: 'game_over',
        team: winningTeam, // Store short form
        text: `Game Over! Team ${winningTeamDisplay} wins the game!`,
        important: true
    });
    
    // Update match statistics
    gameState.matchStats = gameState.matchStats || {
        gamesPlayed: 0,
        teamWins: {
            [TEAMS.TEAM_NS]: 0,
            [TEAMS.TEAM_EW]: 0
        },
        lastUpdated: new Date().toISOString()
    };
    
    gameState.matchStats.gamesPlayed += 1;
    // Ensure winningTeam is the correct key ('NS' or 'EW')
    if (gameState.matchStats.teamWins.hasOwnProperty(winningTeam)) {
        gameState.matchStats.teamWins[winningTeam] += 1;
    } else {
        log(3, `[endGame] Attempted to increment win for unknown team: ${winningTeam}`);
    }
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
        [TEAMS.TEAM_NS]: 0,
        [TEAMS.TEAM_EW]: 0
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
function calculateTeamScores(gameState) { // Expects gameState.scores to use TEAMS.TEAM_NS/EW keys
    return {
        [TEAMS.TEAM_NS]: gameState.scores?.[TEAMS.TEAM_NS] || 0,
        [TEAMS.TEAM_EW]: gameState.scores?.[TEAMS.TEAM_EW] || 0
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
    const updatedState = JSON.parse(JSON.stringify(gameState)); // Deep copy
    // Ensure scores are initialized with TEAMS constants if not present
    updatedState.scores = {
        [TEAMS.TEAM_NS]: updatedState.scores?.[TEAMS.TEAM_NS] || 0,
        [TEAMS.TEAM_EW]: updatedState.scores?.[TEAMS.TEAM_EW] || 0,
    };
    log(1, `[handleEndOfHand] Cloned updatedState.scores: NS=${updatedState.scores[TEAMS.TEAM_NS]}, EW=${updatedState.scores[TEAMS.TEAM_EW]}`);
    
    // Calculate tricks won by each team
    // Expects trick.team to be TEAMS.TEAM_NS or TEAMS.TEAM_EW from test/game setup
    const tricksByTeam = {
        [TEAMS.TEAM_NS]: 0,
        [TEAMS.TEAM_EW]: 0
    };
    
    updatedState.tricks.forEach(trick => {
        if (tricksByTeam.hasOwnProperty(trick.team)) {
            tricksByTeam[trick.team]++;
        } else {
            log(2, `[handleEndOfHand] Encountered trick with unknown team: ${trick.team}`);
        }
    });
    
    // Determine if makers made their bid
    const makerTeam = updatedState.makerTeam; // Expected to be TEAMS.TEAM_NS or TEAMS.TEAM_EW
    if (!makerTeam || !tricksByTeam.hasOwnProperty(makerTeam)) {
        log(3, `[handleEndOfHand] Invalid or missing makerTeam: ${makerTeam}. Cannot determine score.`);
        // Potentially return state or throw error, for now, it will likely result in no score change.
        return checkGameOver(updatedState); // Or handle error more explicitly
    }
    const makerTricks = tricksByTeam[makerTeam]; // Already initialized to 0
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
    const teamNSDisplay = TEAMS.TEAM_NS; // Could be 'N/S' or similar for display later
    const teamEWDisplay = TEAMS.TEAM_EW;

    updatedState.messages.push({
        type: 'score_summary',
        text: `Scores - ${teamNSDisplay}: ${updatedState.scores[TEAMS.TEAM_NS]}, ${teamEWDisplay}: ${updatedState.scores[TEAMS.TEAM_EW]}`,
        important: true
    });
    
    // Check for game over
    return checkGameOver(updatedState);
}

/**
 * Gets the opponent team for a given team.
 * Expects team to be TEAMS.TEAM_NS or TEAMS.TEAM_EW.
 * @private
 * @param {string} team - The team to get the opponent for (e.g., TEAMS.TEAM_NS).
 * @returns {string} The opponent team (e.g., TEAMS.TEAM_EW).
 */
function getOpponentTeam(team) {
    if (team === TEAMS.TEAM_NS) return TEAMS.TEAM_EW;
    if (team === TEAMS.TEAM_EW) return TEAMS.TEAM_NS;
    log(3, `[getOpponentTeam] Unknown team provided: ${team}`);
    return null; // Or throw an error
}

// Import TEAMS from constants to be used in this module
import { TEAMS } from '../../config/constants.js';
