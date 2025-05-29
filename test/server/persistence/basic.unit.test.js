import assert from "assert";
import sinon from "sinon";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { expect } from 'chai';
import { createTestServer, MockServer } from '../test-utils.js'; // Add MockServer import

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SAVE_FILE = path.join(__dirname, '..', 'game_state.json');

describe('Basic Persistence', function() {
    let server, gameState, mockIo;
    let logStub, writeFileSyncStub, readFileSyncStub, existsSyncStub;

    beforeEach(async () => {
        logStub = { info: sinon.stub(), error: sinon.stub(), debug: sinon.stub() };
        writeFileSyncStub = sinon.stub();
        readFileSyncStub = sinon.stub();
        existsSyncStub = sinon.stub();
        
        const fsMock = {
            readFileSync: readFileSyncStub,
            existsSync: existsSyncStub,
            writeFileSync: writeFileSyncStub,
            readdirSync: sinon.stub().returns([]),
            mkdirSync: sinon.stub(),
            constants: fs.constants
        };
        
        server = new MockServer({
            io: mockIo,
            config: { SAVE_FILE },
            logger: logStub,
            fs: fsMock
        });
        
        // Configure server with AUTO_SAVE disabled for the specific test
        server.config = { 
            ...server.config,
            AUTO_SAVE: false 
        };
        
        await server.initialize();
    });

    afterEach(() => {
        if (server?.autoSaveInterval) {
            clearInterval(server.autoSaveInterval);
        }
        sinon.restore();
    });

    describe('Save Game State', () => {
        it('should not save when auto-save is disabled', async () => {
            server.config.AUTO_SAVE = false;
            const result = await server.saveGameState();
            assert.strictEqual(result, false);
            assert.strictEqual(writeFileSyncStub.called, false);
        });

        it('should handle save errors gracefully', async () => {
            server.config.AUTO_SAVE = true;
            writeFileSyncStub.throws(new Error('Failed to write'));
            const result = await server.saveGameState();
            assert.strictEqual(result, false);
            assert(logStub.error.called);
        });
    });

    describe('Load Game State', () => {
        it('should handle missing or corrupt save file', async () => {
            existsSyncStub.returns(true);
            readFileSyncStub.throws(new Error('Corrupt file'));
            
            await server.initialize();
            
            assert.strictEqual(server.gameState.gamePhase, 'LOBBY');
            assert(logStub.error.called);
        });
    });
});
