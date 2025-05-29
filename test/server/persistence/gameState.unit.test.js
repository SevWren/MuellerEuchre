import assert from "assert";
import sinon from "sinon";
import { expect } from 'chai';
import { createTestServer } from '../test-utils.js'; // Fix import path

// Add GamePersistence class definition
class GamePersistence {
    constructor(options = {}) {
        this.fs = options.fs;
        this.basePath = options.basePath;
    }

    saveGameState(gameId, state) {
        const data = JSON.stringify(state);
        this.fs.writeFileSync(`${this.basePath}/${gameId}.json`, data);
        return true;
    }

    loadGameState(gameId) {
        if (!this.fs.existsSync(`${this.basePath}/${gameId}.json`)) {
            return null;
        }
        const data = this.fs.readFileSync(`${this.basePath}/${gameId}.json`, 'utf8');
        return JSON.parse(data);
    }
}

// Use ES module export
export { GamePersistence };

describe('Game State Persistence', () => {
    let persistence, mockFs;

    beforeEach(() => {
        mockFs = {
            writeFileSync: sinon.stub(),
            readFileSync: sinon.stub(),
            existsSync: sinon.stub()
        };

        persistence = new GamePersistence({
            fs: mockFs,
            basePath: './data'
        });
    });

    it('should save game state', () => {
        const gameState = {
            id: 'test-game',
            players: {},
            scores: { team1: 0, team2: 0 }
        };

        persistence.saveGameState('test-game', gameState);
        expect(mockFs.writeFileSync.called).to.be.true;
    });

    it('should load game state', () => {
        const gameState = {
            id: 'test-game',
            players: {},
            scores: { team1: 0, team2: 0 }
        };

        mockFs.existsSync.returns(true);
        mockFs.readFileSync.returns(JSON.stringify(gameState));

        const loadedState = persistence.loadGameState('test-game');
        expect(loadedState).to.deep.equal(gameState);
    });

    it('should handle missing game state', () => {
        mockFs.existsSync.returns(false);
        const loadedState = persistence.loadGameState('missing-game');
        expect(loadedState).to.be.null;
    });
});
