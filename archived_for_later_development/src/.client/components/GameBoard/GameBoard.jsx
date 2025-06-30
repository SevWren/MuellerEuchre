import { h } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { GAME_EVENTS } from '../../../config/constants.js';
import { useGame } from '../../../hooks/useGame.js';
import { Card } from '../Card/Card.jsx';
import { PlayerHand } from '../PlayerHand/PlayerHand.jsx';
import { TrickArea } from '../TrickArea/TrickArea.jsx';
import { ScoreBoard } from '../ScoreBoard/ScoreBoard.jsx';
import { BidPanel } from '../BidPanel/BidPanel.jsx';
import { GameOverlay } from '../GameOverlay/GameOverlay.jsx';
import './GameBoard.css';

export const GameBoard = () => {
    const { 
        state, 
        isConnected, 
        isMyTurn, 
        playCard, 
        makeBid, 
        startGame,
        leaveGame
    } = useGame();
    
    const [highlightedCard, setHighlightedCard] = useState(null);
    const [showBidPanel, setShowBidPanel] = useState(false);
    const boardRef = useRef(null);
    
    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!state?.gamePhase === 'PLAYING' || !isMyTurn) return;
            
            // Handle card selection with arrow keys
            if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                e.preventDefault();
                const currentIndex = state.currentPlayer?.hand?.findIndex(
                    card => card.id === highlightedCard?.id
                );
                
                if (currentIndex === -1 && state.currentPlayer?.hand?.length > 0) {
                    setHighlightedCard(state.currentPlayer.hand[0]);
                    return;
                }
                
                const newIndex = {
                    'ArrowLeft': currentIndex - 1,
                    'ArrowRight': currentIndex + 1,
                    'ArrowUp': 0,
                    'ArrowDown': state.currentPlayer.hand.length - 1
                }[e.key];
                
                if (newIndex >= 0 && newIndex < state.currentPlayer.hand.length) {
                    setHighlightedCard(state.currentPlayer.hand[newIndex]);
                }
            }
            
            // Play selected card with Enter/Space
            if ((e.key === 'Enter' || e.key === ' ') && highlightedCard) {
                e.preventDefault();
                handlePlayCard(highlightedCard);
            }
        };
        
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state, highlightedCard, isMyTurn]);
    
    // Reset highlighted card when hand changes
    useEffect(() => {
        setHighlightedCard(null);
    }, [state?.currentPlayer?.hand]);
    
    const handlePlayCard = async (card) => {
        if (!isMyTurn) return;
        
        try {
            await playCard(card);
            setHighlightedCard(null);
        } catch (error) {
            console.error('Failed to play card:', error);
        }
    };
    
    const handleBid = async (bid) => {
        try {
            await makeBid(bid);
            setShowBidPanel(false);
        } catch (error) {
            console.error('Failed to place bid:', error);
        }
    };
    
    const renderGamePhase = () => {
        if (!state) return null;
        
        switch (state.gamePhase) {
            case 'LOBBY':
                return (
                    <GameOverlay title="Waiting for Players">
                        <div className="player-list">
                            {Object.values(state.players || {}).map(player => (
                                <div key={player.id} className="player-item">
                                    {player.name}{player.isHost ? ' 👑' : ''}
                                </div>
                            ))}
                        </div>
                        {state.isHost && (
                            <button 
                                className="btn btn-primary"
                                onClick={startGame}
                                disabled={Object.keys(state.players || {}).length < 2}
                            >
                                Start Game
                            </button>
                        )}
                    </GameOverlay>
                );
                
            case 'BIDDING':
                if (state.currentPlayer === state.players[state.currentPlayerId]?.id) {
                    return (
                        <BidPanel 
                            isOpen={showBidPanel}
                            onClose={() => setShowBidPanel(false)}
                            onBid={handleBid}
                            upCard={state.upCard}
                            dealer={state.dealer}
                            currentPlayer={state.currentPlayer}
                            minBid={state.minBid}
                        />
                    );
                }
                return (
                    <GameOverlay title="Waiting for bids..." />
                );
                
            case 'PLAYING':
                return (
                    <>
                        <TrickArea 
                            trick={state.currentTrick} 
                            trumpSuit={state.trumpSuit}
                            leader={state.trickLeader}
                        />
                        {isMyTurn && (
                            <div className="turn-indicator">Your turn!</div>
                        )}
                    </>
                );
                
            case 'GAME_OVER':
                return (
                    <GameOverlay title={`Game Over - ${state.winner} wins!`}>
                        <ScoreBoard scores={state.scores} />
                        <button 
                            className="btn btn-primary"
                            onClick={startGame}
                        >
                            Play Again
                        </button>
                    </GameOverlay>
                );
                
            default:
                return null;
        }
    };
    
    if (!state) {
        return (
            <div className="game-board loading">
                <div className="spinner"></div>
                <p>Loading game...</p>
            </div>
        );
    }
    
    return (
        <div className={`game-board phase-${state.gamePhase?.toLowerCase()}`} ref={boardRef}>
            {/* Score Board */}
            <ScoreBoard 
                scores={state.scores} 
                round={state.roundNumber}
                trumpSuit={state.trumpSuit}
                dealer={state.dealer}
                currentPlayer={state.currentPlayer}
            />
            
            {/* Main Game Area */}
            <div className="game-area">
                {/* Opponent's Area */}
                <div className="opponent-area">
                    {Object.entries(state.players || {})
                        .filter(([id]) => id !== state.currentPlayerId)
                        .map(([id, player]) => (
                            <div key={id} className={`player-seat ${player.team === 1 ? 'team1' : 'team2'}`}>
                                <div className="player-info">
                                    <span className="player-name">
                                        {player.name}
                                        {player.isDealer && ' (D)'}
                                    </span>
                                    <span className="card-count">
                                        {player.hand?.length || 0} cards
                                    </span>
                                </div>
                            </div>
                        ))}
                </div>
                
                {/* Center Play Area */}
                <div className="center-area">
                    {renderGamePhase()}
                </div>
                
                {/* Current Player's Area */}
                <div className="player-area">
                    {state.currentPlayer && (
                        <PlayerHand 
                            cards={state.currentPlayer.hand || []}
                            onCardClick={handlePlayCard}
                            highlightedCard={highlightedCard}
                            onCardHover={setHighlightedCard}
                            isTurn={isMyTurn}
                            trumpSuit={state.trumpSuit}
                        />
                    )}
                    
                    <div className="player-actions">
                        {state.gamePhase === 'BIDDING' && isMyTurn && (
                            <button 
                                className="btn btn-bid"
                                onClick={() => setShowBidPanel(true)}
                            >
                                Place Bid
                            </button>
                        )}
                        
                        <button 
                            className="btn btn-leave"
                            onClick={leaveGame}
                        >
                            Leave Game
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Connection Status */}
            <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? 'Connected' : 'Disconnected'}
            </div>
        </div>
    );
};
