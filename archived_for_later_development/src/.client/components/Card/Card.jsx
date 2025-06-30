import { h } from 'preact';
import { useMemo } from 'preact/hooks';
import './Card.css';

const RANK_SYMBOLS = {
    '9': '9',
    '10': '10',
    'J': 'J',
    'Q': 'Q',
    'K': 'K',
    'A': 'A'
};

const SUIT_SYMBOLS = {
    'hearts': '♥',
    'diamonds': '♦',
    'clubs': '♣',
    'spades': '♠'
};

export const Card = ({
    rank,
    suit,
    isTrump = false,
    faceDown = false,
    onClick,
    className = ''
}) => {
    const color = useMemo(() => {
        return ['hearts', 'diamonds'].includes(suit) ? 'red' : 'black';
    }, [suit]);

    const rankSymbol = RANK_SYMBOLS[rank] || rank;
    const suitSymbol = SUIT_SYMBOLS[suit] || suit;

    if (faceDown) {
        return (
            <div 
                className={`card face-down ${className}`}
                onClick={onClick}
                aria-hidden="true"
            />
        );
    }

    return (
        <div 
            className={`card ${color} ${isTrump ? 'trump' : ''} ${className}`}
            data-rank={rankSymbol}
            data-suit={suitSymbol}
            onClick={onClick}
            role="img"
            aria-label={`${rank} of ${suit}${isTrump ? ' (trump)' : ''}`}
        >
            <div className="card-corner top-left">
                <span className="card-rank">{rankSymbol}</span>
                <span className="card-suit">{suitSymbol}</span>
            </div>
            <div className="card-center">
                <span className="card-suit">{suitSymbol}</span>
            </div>
            <div className="card-corner bottom-right">
                <span className="card-rank">{rankSymbol}</span>
                <span className="card-suit">{suitSymbol}</span>
            </div>
            {isTrump && <div className="trump-corner">★</div>}
        </div>
    );
};
