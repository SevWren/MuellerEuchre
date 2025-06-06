/**
 * @file Test utility functions for the Euchre multiplayer game server.
 * @module testUtils
 * @description Provides helper functions for setting up and managing test environments,
 * including test servers and client connections for Socket.IO based testing.
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioc } from 'socket.io-client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createApp } from '../../app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Creates a test server with Socket.IO and an HTTP server.
 * @async
 * @function createTestServer
 * @returns {Promise<{io: Server, httpServer: import('http').Server, port: number}>} An object containing:
 *   - `io`: The Socket.IO server instance
 *   - `httpServer`: The underlying HTTP server instance
 *   - `port`: The port number the server is listening on
 * @example
 * const { io, httpServer, port } = await createTestServer();
 * // Use the server for testing...
 * httpServer.close(); // Clean up when done
 */
export async function createTestServer() {
    const app = await createApp();
    const httpServer = createServer(app);
    const io = new Server(httpServer);
    
    return new Promise((resolve) => {
        const server = httpServer.listen(0, () => {
            const port = server.address().port;
            resolve({ io, httpServer: server, port });
        });
    });
}

/**
 * Creates a test client connected to a Socket.IO server.
 * @function createTestClient
 * @param {number} port - The port number of the server to connect to
 * @param {string} [namespace='/'] - The Socket.IO namespace to connect to
 * @returns {Promise<{socket: import('socket.io-client').Socket, disconnect: Function, id: string}>} A promise that resolves to an object containing:
 *   - `socket`: The connected Socket.IO client instance
 *   - `disconnect`: Function to disconnect the socket
 *   - `id`: The socket's unique identifier
 * @example
 * const client = await createTestClient(3000);
 * client.socket.emit('someEvent', { data: 'test' });
 * client.disconnect(); // Clean up when done
 */
export function createTestClient(port, namespace = '/') {
    return new Promise((resolve) => {
        const socket = ioc(`http://localhost:${port}${namespace}`);
        
        socket.on('connect', () => {
            resolve({
                socket,
                disconnect: () => socket.disconnect(),
                id: socket.id
            });
        });
    });
}

/**
 * Waits for a specific event to be emitted on a socket.
 * @function waitForEvent
 * @param {import('socket.io-client').Socket} socket - The socket to listen on
 * @param {string} event - The name of the event to wait for
 * @param {number} [timeout=5000] - Maximum time to wait in milliseconds before rejecting
 * @returns {Promise<any>} A promise that resolves with the event data when the event is received
 * @throws {Error} If the event is not received within the timeout period
 * @example
 * const client = await createTestClient(3000);
 * // In the test case:
 * const eventData = await waitForEvent(client.socket, 'gameUpdate');
 * assert.strictEqual(eventData.status, 'in-progress');
 */
export function waitForEvent(socket, event, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Timeout waiting for event: ${event}`));
        }, timeout);

        socket.once(event, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

/**
 * Simulates a player action by emitting an event to the server and handling the response.
 * @function simulatePlayerAction
 * @param {import('socket.io-client').Socket} socket - The socket to emit the action from
 * @param {string} action - The name of the action/event to emit
 * @param {Object} [data={}] - The data to send with the action
 * @returns {Promise<any>} A promise that resolves with the server's response
 * @throws {Error} If the server responds with an error
 * @example
 * try {
 *   const response = await simulatePlayerAction(
 *     client.socket,
 *     'playCard',
 *     { card: 'Ace of Spades' }
 *   );
 *   console.log('Server response:', response);
 * } catch (error) {
 *   console.error('Action failed:', error.message);
 * }
 */
export async function simulatePlayerAction(socket, action, data = {}) {
    return new Promise((resolve, reject) => {
        socket.emit(action, data, (response) => {
            if (response && response.error) {
                reject(new Error(response.error));
            } else {
                resolve(response);
            }
        });
    });
}
