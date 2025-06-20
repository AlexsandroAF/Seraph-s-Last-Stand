
import React from 'react';
import { CardRarity } from '../types'; // Import CardRarity

interface GameOverScreenProps {
  score: number;
  level: number;
  timeSurvived: number; // In milliseconds
  enemiesKilled: number;
  cardsCollectedSummary: { name: string; rarity: CardRarity; }[];
  onRestart: () => void;
}

// Helper to format time from milliseconds to HH:MM:SS
const formatTime = (timeInMilliseconds: number): string => {
  const totalSeconds = Math.floor(timeInMilliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Helper to get rarity color (similar to CardSelectionScreen)
const getRarityColor = (rarity: CardRarity): string => {
    switch (rarity) {
      case CardRarity.COMMON: return '#9CA3AF'; // gray
      case CardRarity.UNCOMMON: return '#10B981'; // green
      case CardRarity.EPIC: return '#8B5CF6'; // purple
      case CardRarity.ASCENSION: return '#F59E0B'; // yellow/orange
      case CardRarity.SPECIAL: return '#38BDF8'; // cyan/blue
      default: return '#E5E7EB'; // default light gray/white
    }
};

const GameOverScreen: React.FC<GameOverScreenProps> = ({ 
    score, 
    level, 
    timeSurvived, 
    enemiesKilled, 
    cardsCollectedSummary, 
    onRestart 
}) => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(100, 20, 20, 0.92)', // Darker, more opaque red
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 30,
      color: 'white',
      padding: '20px',
      textAlign: 'center',
      gap: '10px', // Added gap for better spacing
    }}>
      <h1 style={{ fontSize: '36px', marginBottom: '10px', color: '#FFDDDD', textShadow: '2px 2px #000000' }}>GAME OVER</h1>
      
      <div style={{
        backgroundColor: 'rgba(0,0,0,0.4)',
        padding: '15px',
        borderRadius: '5px',
        border: '1px solid #FF8888',
        width: '100%',
        maxWidth: '450px',
        boxSizing: 'border-box',
      }}>
        <p style={{ fontSize: '18px', marginBottom: '5px' }}>Level Reached: <span style={{ fontWeight: 'bold', color: '#FFFF99' }}>{level}</span></p>
        <p style={{ fontSize: '18px', marginBottom: '5px' }}>Final Score: <span style={{ fontWeight: 'bold', color: '#FFFF99' }}>{score}</span></p>
        <p style={{ fontSize: '16px', marginBottom: '5px' }}>Time Survived: <span style={{ fontWeight: 'bold', color: '#99FFFF' }}>{formatTime(timeSurvived)}</span></p>
        <p style={{ fontSize: '16px', marginBottom: '15px' }}>Enemies Vanquished: <span style={{ fontWeight: 'bold', color: '#99FF99' }}>{enemiesKilled}</span></p>
      </div>

      {cardsCollectedSummary && cardsCollectedSummary.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          padding: '10px',
          borderRadius: '5px',
          border: '1px solid #AAAAFF',
          width: '100%',
          maxWidth: '450px',
          maxHeight: '150px', // Limit height and make scrollable
          overflowY: 'auto',
          boxSizing: 'border-box',
          textAlign: 'left',
          fontSize: '10px',
        }}>
          <h2 style={{ fontSize: '14px', marginBottom: '8px', color: '#CCEEFF', textAlign: 'center' }}>Upgrades Acquired:</h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {cardsCollectedSummary.map((card, index) => (
              <li key={index} style={{ 
                marginBottom: '3px', 
                padding: '2px 4px',
                borderRadius: '2px',
                backgroundColor: 'rgba(255,255,255,0.05)',
              }}>
                <span style={{ color: getRarityColor(card.rarity), fontWeight: 'bold' }}>
                  [{card.rarity}]
                </span> {card.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={onRestart}
        style={{
          backgroundColor: '#FFFF00',
          color: 'black',
          border: '1px solid white',
          padding: '12px 25px',
          fontSize: '16px',
          cursor: 'pointer',
          textTransform: 'uppercase',
          marginTop: '15px',
          fontWeight: 'bold',
        }}
      >
        Try Again
      </button>
    </div>
  );
};

export default GameOverScreen;
