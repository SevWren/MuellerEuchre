/**
 * @file Scoring phase module for Euchre game
 * @module game/phases/scoring
 * @description Handles all scoring-related game logic including points calculation and game progression
 */

import { log } from '../../utils/logger.js';
import { GAME_PHASES, DEBUG_LEVELS, WINNING_SCORE } from '../../config/constants.js';
import { getPartner } from '../../utils/players.js';

/**
 * Calculates and updates scores based on the completed hand
 * @param {Object} gameState - Current game state
 * @returns {Object} Updated game state with new scores
 */
export function scoreCurrentHand(gameState) {
    log(DEBUG_LEVELS.INFO, '[scoreCurrentHand] Calculating hand scores');
    
    // Create a deep copy of the game state to avoid mutating the original
    const updatedState = JSON.parse(JSON.stringify(gameState));
    updatedState.currentPhase = GAME_PHASES.SCORING;
    
    // Initialize scores if they don't exist
    updatedState.scores = updatedState.scores || {
        'north+south': 0,
        'east+west': 0
    };
    
    // Count tricks won by each team
    const teamTricks = {
        'north+south': 0,
        'east+west': 0
    };
    
    // Count tricks won by each player
    Object.entries(updatedState.players).forEach(([playerRole, player]) => {
        const partner = getPartner(playerRole);
        const teamKey = [playerRole, partner].sort().join('+');
        teamTricks[teamKey] = (teamTricks[teamKey] || 0) + (player.tricksWon || 0);
    });
    
    // Determine which team was the maker (called trump)
    const makerTeam = updatedState.makerTeam || 'north+south';
    const makerTeamKey = makerTeam === 'north+south' ? 'north+south' : 'east+west';
    const opponentTeamKey = makerTeam === 'north+south' ? 'east+west' : 'north+south';
    
    const makerTricks = teamTricks[makerTeamKey] || 0;
    const opponentTricks = teamTricks[opponentTeamKey] || 0;
    
    // Calculate points based on Euchre scoring rules
    let makerPoints = 0;
    let opponentPoints = 0;
    let message = '';
    
    if (makerTricks >= 3) {
        // Maker team made their bid
        if (makerTricks === 5) {
            // March (took all 5 tricks)
            makerPoints = updatedState.goingAlone ? 4 : 2;
            message = `${makerTeam} made a march!`;
        } else {
            // Won 3 or 4 tricks
            makerPoints = 1;
            message = `${makerTeam} made their bid with ${makerTricks} tricks`;
        }
    } else {
        // Maker team was euchred
        opponentPoints = 2;
        message = `${makerTeam} was euchred! ${opponentTeamKey} scores 2 points`;
    }
    
    // Update team scores
    updatedState.scores[makerTeam] = (updatedState.scores[makerTeam] || 0) + makerPoints;
    updatedState.scores[opponentTeamKey] = (updatedState.scores[opponentTeamKey] || 0) + opponentPoints;
    
    // Add game message
    updatedState.messages = updatedState.messages || [];
    updatedState.messages.push({
        type: 'scoring',
        text: message,
        scores: {
            [makerTeam]: makerPoints,
            [opponentTeamKey]: opponentPoints
        }
    });
    
    // Check for game win
    const winningTeam = checkForGameWin(updatedState.scores);
    if (winningTeam) {
        updatedState.winner = winningTeam;
        updatedState.currentPhase = GAME_PHASES.GAME_OVER;
        updatedState.messages.push({
            type: 'game',
            text: `🎉 ${winningTeam} wins the game! 🎉`
        });
    } else {
        // Prepare for next hand
        updatedState.currentPhase = GAME_PHASES.BETWEEN_HANDS;
        
        // Rotate dealer for next hand
        const currentDealerIndex = updatedState.playerOrder.indexOf(updatedState.dealer);
        const nextDealerIndex = (currentDealerIndex + 1) % updatedState.playerOrder.length;
        updatedState.dealer = updatedState.playerOrder[nextDealerIndex];
        
        updatedState.messages.push({
            type: 'game',
            text: `Next hand! Dealer is ${updatedState.dealer}.`
        });
    }
    
    return updatedState;
}

/**
 * Checks if any team has reached the winning score
 * @private
 * @param {Object} scores - Current game scores by team
 * @returns {string|null} Winning team name or null if no winner yet
 */
function checkForGameWin(scores) {
    for (const [team, score] of Object.entries(scores)) {
        if (score >= WINNING_SCORE) {
            return team;
        }
    }
    return null;
}

/**
 * Resets the game state for a new game
 * @param {Object} gameState - Current game state
 * @returns {Object} Reset game state
 */
export function resetGame(gameState = {}) {
    log(DEBUG_LEVELS.INFO, '[resetGame] Resetting game');
    
    return {
        ...gameState,
        scores: {
            'north+south': 0,
            'east+west': 0
        },
        dealer: 'south',
        currentPhase: GAME_PHASES.LOBBY,
        messages: [{
            type: 'game',
            text: 'New game started! Waiting for players...'
        }],
        players: {
            north: { tricksWon: 0, hand: [] },
            south: { tricksWon: 0, hand: [] },
            east: { tricksWon: 0, hand: [] },
            west: { tricksWon: 0, hand: [] }
        },
        playerOrder: ['north', 'east', 'south', 'west'],
        makerTeam: null,
        goingAlone: false,
        playerGoingAlone: null
    };
}

