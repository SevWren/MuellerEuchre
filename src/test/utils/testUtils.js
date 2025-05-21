import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as ioc } from 'socket.io-client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createApp } from '../../app.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create a test server with Socket.IO
 * @returns {Promise<{io: Server, httpServer: any, port: number}>}
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
 * Create a test client connected to the server
 * @param {number} port - Server port
 * @param {string} [namespace='/'] - Socket.IO namespace
 * @returns {Promise<{socket: any, disconnect: Function, id: string}>}
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
 * Wait for a specific event on a socket
 * @param {any} socket - Socket.IO client socket
 * @param {string} event - Event name to wait for
 * @param {number} [timeout=5000] - Timeout in ms
 * @returns {Promise<any>} - Event data
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
 * Simulate player action with error handling
 * @param {any} socket - Socket.IO client socket
 * @param {string} action - Action name
 * @param {Object} data - Action data
 * @returns {Promise<any>} - Response from the server
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
