import assert from "assert";
import sinon from "sinon";
import { MockServer } from '../testHelpers.js';

describe('Auto-Save Functionality', () => {
    let server, writeFileSyncStub, clock;

    beforeEach(() => {
        writeFileSyncStub = sinon.stub();
        clock = sinon.useFakeTimers();
        
        server = new MockServer({
            fs: { writeFileSync: writeFileSyncStub },
            config: { AUTO_SAVE: true }
        });
    });

    afterEach(() => {
        clock.restore();
        if (server?.autoSaveInterval) {
            clearInterval(server.autoSaveInterval);
        }
    });

    it('should auto-save at regular intervals', async () => {
        await server.initialize();
        writeFileSyncStub.resetHistory();

        clock.tick(29000);
        assert.strictEqual(writeFileSyncStub.called, false);

        clock.tick(1000);
        assert.strictEqual(writeFileSyncStub.called, true);
    });

    it('should not auto-save when disabled', async () => {
        server.config.AUTO_SAVE = false;
        await server.initialize();
        
        clock.tick(60000);
        assert.strictEqual(writeFileSyncStub.called, false);
    });
});
