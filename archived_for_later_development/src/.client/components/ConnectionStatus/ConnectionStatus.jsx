import { h } from 'preact';
import { useEffect, useState, useRef } from 'preact/hooks';
import { useSocket } from '../../hooks/useSocket';
import './ConnectionStatus.css';

/**
 * ConnectionStatus component that shows the current connection status and quality
 */
export const ConnectionStatus = () => {
    const { isConnected, connectionQuality } = useSocket();
    const [isVisible, setIsVisible] = useState(false);
    const [status, setStatus] = useState('disconnected');
    const [message, setMessage] = useState('Connecting...');
    const [showQuality, setShowQuality] = useState(false);
    const visibilityTimeout = useRef(null);
    const qualityTimeout = useRef(null);

    // Update status when connection state changes
    useEffect(() => {
        // Clear any pending timeouts
        if (visibilityTimeout.current) {
            clearTimeout(visibilityTimeout.current);
            visibilityTimeout.current = null;
        }

        if (isConnected) {
            setStatus('connected');
            setMessage('Connected');
            
            // Show the status briefly when connected
            setIsVisible(true);
            visibilityTimeout.current = setTimeout(() => {
                setIsVisible(false);
            }, 3000);
        } else {
            setStatus('disconnected');
            setMessage('Disconnected - attempting to reconnect...');
            setIsVisible(true);
            setShowQuality(false);
        }

        return () => {
            if (visibilityTimeout.current) {
                clearTimeout(visibilityTimeout.current);
            }
        };
    }, [isConnected]);

    // Show connection quality when available
    useEffect(() => {
        if (qualityTimeout.current) {
            clearTimeout(qualityTimeout.current);
            qualityTimeout.current = null;
        }

        if (isConnected && connectionQuality && connectionQuality.quality !== 'unknown') {
            setShowQuality(true);
            
            // Show quality for a bit longer than the main status
            qualityTimeout.current = setTimeout(() => {
                setShowQuality(false);
            }, 5000);
        }

        return () => {
            if (qualityTimeout.current) {
                clearTimeout(qualityTimeout.current);
            }
        };
    }, [connectionQuality, isConnected]);

    // Don't show anything if connected and not visible
    if (!isVisible && status === 'connected' && !showQuality) {
        return null;
    }

    // Get quality percentage (0-100) based on latency
    const getQualityPercentage = () => {
        if (!connectionQuality || !connectionQuality.latency) return 100;
        
        // Map latency to percentage (0-300ms -> 100-0%)
        const latency = connectionQuality.latency;
        return Math.max(0, Math.min(100, 100 - (latency / 3)));
    };

    const qualityPercentage = getQualityPercentage();
    const qualityClass = 
        qualityPercentage > 80 ? 'excellent' :
        qualityPercentage > 50 ? 'good' :
        qualityPercentage > 20 ? 'fair' : 'poor';

    // Determine the main class based on visibility and status
    const containerClasses = [
        'connection-status',
        `status-${status}`,
        !isVisible && 'hidden',
        showQuality && 'show-quality'
    ].filter(Boolean).join(' ');

    return (
        <div className={containerClasses}>
            <div className="status-indicator">
                <div className="status-dot" />
                <span className="status-text">
                    {status === 'connected' ? 'Connected' : message}
                </span>
            </div>
            
            {status === 'connected' && showQuality && connectionQuality?.latency > 0 && (
                <div className="connection-quality">
                    <div className="quality-bar">
                        <div 
                            className={`quality-fill ${qualityClass}`}
                            style={{ width: `${qualityPercentage}%` }}
                        />
                    </div>
                    <span className="quality-text">
                        <span>Connection Quality: {qualityClass.charAt(0).toUpperCase() + qualityClass.slice(1)}</span>
                        <span>{connectionQuality.latency}ms</span>
                    </span>
                </div>
            )}
        </div>
    );
};

export default ConnectionStatus;
