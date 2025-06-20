import { useState, useEffect, useCallback } from 'preact/hooks';
import { socketService } from '../services/socketService';

/**
 * Hook to manage socket connection state and expose socket methods
 * @returns {Object} Socket state and methods
 */
export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(socketService.isConnected);
    const [connectionQuality, setConnectionQuality] = useState(socketService.getConnectionQuality());

    /**
     * Handles the socket connect event.
     * Updates the isConnected state to true.
     */
    // Handle connection state changes
    const handleConnect = useCallback(() => {
        setIsConnected(true);
    }, []);

    /**
     * Handles the socket disconnect event.
     * Updates the isConnected state to false and resets connection quality.
     */
    const handleDisconnect = useCallback(() => {
        setIsConnected(false);
        setConnectionQuality({
            latency: 0,
            jitter: 0,
            lastUpdated: null,
            quality: 'unknown'
        });
    }, []);

    /**
     * Handles the socket quality_update event.
     * Updates the connectionQuality state with the new quality data.
     * @param {object} quality - The new connection quality data.
     */
    // Handle connection quality updates
    const handleQualityUpdate = useCallback((quality) => {
        setConnectionQuality(prev => ({
            ...prev,
            ...quality,
            lastUpdated: Date.now()
        }));
    }, []);

    // Set up event listeners
    useEffect(() => {
        // Initial state
        setIsConnected(socketService.isConnected);
        setConnectionQuality(socketService.getConnectionQuality());

        // Set up event listeners
        socketService.on('connect', handleConnect);
        socketService.on('disconnect', handleDisconnect);
        socketService.on('quality_update', handleQualityUpdate);

        // Clean up
        return () => {
            socketService.off('connect', handleConnect);
            socketService.off('disconnect', handleDisconnect);
            socketService.off('quality_update', handleQualityUpdate);
        };
    }, [handleConnect, handleDisconnect, handleQualityUpdate]);

    return {
        // Connection state
        isConnected,
        connectionQuality,
        
        // Connection actions
        connect: socketService.connect.bind(socketService),
        disconnect: socketService.disconnect.bind(socketService),
        
        // Event handling
        on: socketService.on.bind(socketService),
        off: socketService.off.bind(socketService),
        emit: socketService.emit.bind(socketService),
        
        // Connection quality
        getConnectionQuality: socketService.getConnectionQuality.bind(socketService)
    };
};

export default useSocket;
