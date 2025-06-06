import { DEBUG_LEVELS } from '../config/constants.js';
import fs from 'fs';

let currentDebugLevel = DEBUG_LEVELS.WARNING;

/**
 * Log a message if the specified level is less than or equal to the current debug level
 * @param {number} level - The debug level of the message
 * @param {string} message - The message to log
 */
function log(level, message) {
    if (level <= currentDebugLevel) {
        const levelStr = Object.keys(DEBUG_LEVELS).find(key => DEBUG_LEVELS[key] === level);
        const logMessage = `[${levelStr}] ${message}\n`;
        console.log(logMessage);
        fs.appendFileSync('server_log.txt', logMessage);
    }
}

/**
 * Set the current debug level
 * @param {number} level - The new debug level
 */
function setDebugLevel(level) {
    if (Object.values(DEBUG_LEVELS).includes(level)) {
        currentDebugLevel = level;
        log(DEBUG_LEVELS.INFO, `Debug level set to ${Object.keys(DEBUG_LEVELS).find(key => DEBUG_LEVELS[key] === level)}`);
    } else {
        log(DEBUG_LEVELS.WARNING, "Invalid debug level specified.");
    }
}

export { log, setDebugLevel, currentDebugLevel };
