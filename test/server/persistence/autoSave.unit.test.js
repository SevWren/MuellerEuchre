// filepath: test/server/persistence/autoSave.unit.test.js
/**
 * @file test/server/persistence/autoSave.unit.test.js
 * @module test/server/persistence/autoSave
 * @description
 *   Unit tests for the auto-save functionality.
 *
 *   NOTE: This test suite validates the behavior of the `MockServer` test utility,
 *   not a production source module from `src/`. The auto-save logic (`setInterval`)
 *   is contained within the `MockServer` class itself. Therefore, this test correctly
 *   uses Sinon's fake timers to control time and does not use the `esmock_wrapper.js`,
 *   as there is no source module to mock.
 */

import { expect } from 'chai';
import sinon from 'sinon';
import { MockServer } from '../test-utils.js';

describe('Auto-Save Functionality', () => {
    let server;
    let writeFileSyncStub;
    let clock;

    beforeEach(() => {
        // Create a stub for the file system's write method
        writeFileSyncStub = sinon.stub();
        // Use fake timers to control setInterval and setTimeout
        clock = sinon.useFakeTimers();
        
        // Instantiate the MockServer with the stubbed file system
        // and enable AUTO_SAVE for testing this feature.
        server = new MockServer({
            fs: { writeFileSync: writeFileSyncStub },
            config: { AUTO_SAVE: true }
        });
    });

    afterEach(() => {
        // Restore the real timers
        clock.restore();
        // Clean up the interval timer if it exists to prevent test leakage
        if (server?.autoSaveInterval) {
            clearInterval(server.autoSaveInterval);
        }
    });

    it('should auto-save at regular intervals when enabled', async () => {
        // Initialize the server, which starts the auto-save interval
        await server.initialize();
        writeFileSyncStub.resetHistory();

        // Advance time just before the first auto-save should trigger (30s interval)
        clock.tick(29999);
        expect(writeFileSyncStub.called, 'Should not have saved before the interval elapsed').to.be.false;

        // Advance time past the 30-second mark
        clock.tick(1);
        expect(writeFileSyncStub.calledOnce, 'Should have auto-saved exactly once after the interval').to.be.true;
    });

    it('should not auto-save when disabled', async () => {
        // Override the server's config to disable auto-saving
        server.config.AUTO_SAVE = false;
        
        // Initialize the server. The initialize method should respect this config.
        await server.initialize();
        
        // Advance time well past the auto-save interval
        clock.tick(60000);
        
        // Verify that the file system was never written to
        expect(writeFileSyncStub.called, 'Should not auto-save when the feature is disabled').to.be.false;
    });
});