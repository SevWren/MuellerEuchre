import { h } from 'preact';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';
import { Card } from '../Card/Card.jsx';
import { getCardValue, isLeftBower } from '../../utils/cardUtils.js';
import './PlayerHand.css';

export const PlayerHand = ({
    cards = [],
    onCardClick,
    onCardHover,
    highlightedCard,
    isTurn = false,
    trumpSuit = null,
    disabled = false
}) => {
    const handRef = useRef(null);
    
    // Calculate card positions for fanning effect
    const calculateCardPositions = useCallback(() => {
        if (!handRef.current) return [];
        
        const handWidth = handRef.current.offsetWidth;
        const cardWidth = 100; // Approximate width of a card
        const maxRotation = 15; // Maximum rotation in degrees
        const maxOffset = 30; // Maximum vertical offset in pixels
        const cardOverlap = 40; // How much cards overlap
        
        const totalCardWidth = Math.min(
            cards.length * (cardWidth - cardOverlap) + cardOverlap,
            handWidth * 0.9 // Max 90% of container width
        );
        
        const startX = (handWidth - totalCardWidth) / 2;
        
        return cards.map((card, index) => {
            // Calculate position along the fan curve
            const t = cards.length > 1 ? index / (cards.length - 1) : 0.5;
            const rotation = maxRotation * (t * 2 - 1); // -maxRotation to +maxRotation
            const offset = Math.sin(t * Math.PI) * maxOffset;
            const x = startX + index * ((totalCardWidth - cardWidth) / Math.max(1, cards.length - 1));
            
            // Calculate z-index based on hover state
            const isHovered = highlightedCard?.id === card.id;
            const zIndex = isHovered ? 1000 : index;
            
            return {
                ...card,
                style: {
                    transform: `translateX(${x}px) rotate(${rotation}deg) translateY(${isHovered ? -30 : 0}px)`,
                    zIndex,
                    transition: 'transform 0.2s ease-in-out',
                    cursor: isTurn && !disabled ? 'pointer' : 'default',
                    filter: disabled ? 'grayscale(0.7) brightness(0.8)' : 'none',
                    position: 'absolute',
                    bottom: isHovered ? '20px' : '0',
                    transformOrigin: 'center bottom',
                    boxShadow: isHovered && isTurn ? '0 10px 20px rgba(0,0,0,0.2)' : '0 2px 5px rgba(0,0,0,0.1)'
                },
                className: `hand-card ${isHovered ? 'hovered' : ''} ${!isTurn || disabled ? 'disabled' : ''}`
            };
        });
    }, [cards, highlightedCard, isTurn, disabled]);
    
    const cardPositions = useMemo(
        () => calculateCardPositions(),
        [calculateCardPositions]
    );
    
    // Handle window resize to recalculate card positions
    useEffect(() => {
        const handleResize = () => {
            calculateCardPositions();
        };
        
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [calculateCardPositions]);
    
    // Sort cards by suit and value for better organization
    const sortedCards = useMemo(() => {
        if (!trumpSuit) return cardPositions;
        
        return [...cardPositions].sort((a, b) => {
            // Check if cards are the left bower (jack of same color as trump)
            const aIsLeftBower = isLeftBower(a, trumpSuit);
            const bIsLeftBower = isLeftBower(b, trumpSuit);
            
            // Left bower comes first
            if (aIsLeftBower && !bIsLeftBower) return -1;
            if (!aIsLeftBower && bIsLeftBower) return 1;
            
            // Then sort by suit (trump first, then other suits)
            const aSuit = a.suit === trumpSuit ? '' : a.suit;
            const bSuit = b.suit === trumpSuit ? '' : b.suit;
            
            if (aSuit < bSuit) return -1;
            if (aSuit > bSuit) return 1;
            
            // Finally sort by card value
            return getCardValue(a, trumpSuit) - getCardValue(b, trumpSuit);
        });
    }, [cardPositions, trumpSuit]);
    
    const handleCardClick = (card) => {
        if (!isTurn || disabled) return;
        onCardClick?.(card);
    };
    
    const handleCardHover = (card) => {
        if (!isTurn || disabled) return;
        onCardHover?.(card);
    };
    
    return (
        <div 
            ref={handRef}
            className={`player-hand ${!isTurn ? 'not-turn' : ''} ${disabled ? 'disabled' : ''}`}
        >
            {sortedCards.map(({ id, rank, suit, style, className }) => (
                <div 
                    key={id}
                    className={className}
                    style={style}
                    onClick={() => handleCardClick({ id, rank, suit })}
                    onMouseEnter={() => handleCardHover({ id, rank, suit })}
                    onMouseLeave={() => onCardHover?.(null)}
                    aria-label={`${rank} of ${suit}`}
                    role="button"
                    tabIndex={isTurn && !disabled ? 0 : -1}
                    onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && isTurn && !disabled) {
                            e.preventDefault();
                            handleCardClick({ id, rank, suit });
                        }
                    }}
                >
                    <Card 
                        rank={rank} 
                        suit={suit} 
                        isTrump={suit === trumpSuit || isLeftBower({ rank, suit }, trumpSuit)}
                    />
                </div>
            ))}
        </div>
    );
};
