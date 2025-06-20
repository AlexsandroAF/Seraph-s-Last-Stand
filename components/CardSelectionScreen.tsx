import React from 'react';
import { CardDefinition, CardRarity } from '../types';

interface CardSelectionScreenProps {
  cards: CardDefinition[];
  onSelectCard: (card: CardDefinition) => void;
  playerLevel: number;
}

const CardSelectionScreen: React.FC<CardSelectionScreenProps> = ({ cards, onSelectCard, playerLevel }) => {
  const getRarityStyles = (rarity: CardRarity) => {
    switch (rarity) {
      case CardRarity.COMMON: return { borderColor: '#9CA3AF', backgroundColor: '#37415190' }; // gray
      case CardRarity.UNCOMMON: return { borderColor: '#10B981', backgroundColor: '#05966990' }; // green
      case CardRarity.EPIC: return { borderColor: '#8B5CF6', backgroundColor: '#7C3AED90' }; // purple
      case CardRarity.ASCENSION: return { borderColor: '#F59E0B', backgroundColor: '#D9770690' }; // yellow/orange
      case CardRarity.SPECIAL: return { borderColor: '#38BDF8', backgroundColor: '#0EA5E990' }; // cyan/blue for special (staff unlocks)
      default: return { borderColor: '#6B7280', backgroundColor: '#4B556390' };
    }
  };

  if (!cards || cards.length === 0) {
    // Fallback if no cards are offered (should ideally not happen)
    return (
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 30, padding: '10px', color: 'white', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#FFFF00' }}>LEVEL {playerLevel} REACHED!</h2>
        <p style={{ fontSize: '12px', marginBottom: '15px' }}>No new upgrades available this time. Keep fighting!</p>
        <button 
          onClick={() => onSelectCard({id: 'continue', name: 'Continue', description: 'No upgrade', rarity: CardRarity.COMMON, effects: []})} // Dummy card to continue
          style={{padding: '8px 15px', fontSize: '12px', backgroundColor: '#00FF00', color: 'black', border: '1px solid white', cursor: 'pointer' }}
        >Continue</button>
      </div>
    );
  }

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 30,
      padding: '10px',
      color: 'white',
      textAlign: 'center',
    }}>
      <h2 style={{ fontSize: '20px', marginBottom: '10px', color: '#FFFF00' }}>LEVEL UP! (LVL {playerLevel})</h2>
      <p style={{ fontSize: '12px', marginBottom: '15px' }}>Choose your upgrade:</p>
      <div style={{
        display: 'grid',
        gridTemplateColumns: cards.length === 1 ? '1fr' : cards.length === 2 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
        gap: '15px',
        maxWidth: '700px',
        width: '100%',
      }}>
        {cards.map(card => (
          <button
            key={card.id}
            onClick={() => onSelectCard(card)}
            style={{
              padding: '12px',
              borderRadius: '3px',
              border: `2px solid`,
              transition: 'transform 0.2s, box-shadow 0.2s',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '10px',
              minHeight: '100px', // Ensure cards have some height
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              ...getRarityStyles(card.rarity),
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = `0 0 10px ${getRarityStyles(card.rarity).borderColor}`; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: 'bold',
                marginBottom: '5px',
                color: getRarityStyles(card.rarity).borderColor // Use border color for title to match
              }}>{card.name}</h3>
              <p style={{ fontSize: '10px', color: '#E5E7EB', marginBottom: '8px', minHeight: '30px' }}>{card.description}</p>
            </div>
            <p style={{ fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: getRarityStyles(card.rarity).borderColor, marginTop: 'auto' }}>
              {card.rarity} {card.cardType === 'staff_unlock' ? '(Staff)' : ''}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default CardSelectionScreen;