import React from 'react';
import { GameState, PlayerState } from '../types'; // GameState needed for activeCardIcons

interface UIOverlayProps {
  player: PlayerState;
  score: number;
  activeCardIcons: GameState['activeCardIcons'];
  onPause: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ player, score, activeCardIcons, onPause }) => {
  const hpPercentage = Math.max(0, (player.currentHp / player.maxHp) * 100);
  const expPercentage = Math.max(0, (player.exp / player.expToNextLevel) * 100);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      padding: '10px',
      color: 'white',
      zIndex: 20,
      fontSize: '10px', // Smaller base font for pixel aesthetic
      display: 'flex',
      flexDirection: 'column',
      gap: '5px', // Space between top elements and bottom card icons
    }}>
      {/* Top Bar: HP, Level, EXP, Score, Pause */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
        {/* Left Side: HP & Player Stats */}
        <div style={{ minWidth: '200px' }}>
          <div>HP: {Math.ceil(player.currentHp)} / {player.maxHp}</div>
          <div style={{ width: '150px', height: '10px', border: '1px solid white', backgroundColor: '#333' }}>
            <div
              style={{ width: `${hpPercentage}%`, height: '100%', backgroundColor: '#FF0000', transition: 'width 0.3s ease-out' }}
            ></div>
          </div>
          <div style={{marginTop: '3px', fontSize: '8px'}}>
            Dmg: {player.damage.toFixed(1)} | AS: {(1000 / player.attackSpeed).toFixed(1)}/s | Crit: {(player.critChance * 100).toFixed(0)}%
          </div>
        </div>

        {/* Center: Level & EXP */}
        <div style={{ textAlign: 'center', minWidth: '150px' }}>
          <div>LEVEL: {player.level}</div>
          <div style={{ width: '120px', height: '8px', border: '1px solid white', margin: '2px auto', backgroundColor: '#333' }}>
            <div
              style={{ width: `${expPercentage}%`, height: '100%', backgroundColor: '#00FFFF', transition: 'width 0.3s ease-out' }}
            ></div>
          </div>
          <div style={{fontSize: '8px'}}>EXP: {player.exp} / {player.expToNextLevel}</div>
        </div>
        
        {/* Right Side: Score & Pause */}
        <div style={{ textAlign: 'right', minWidth: '150px' }}>
          <div>SCORE: {score}</div>
          <button 
              onClick={onPause} 
              style={{
                background: 'none',
                border: '1px solid #FFFF00',
                color: '#FFFF00',
                padding: '3px 6px',
                fontSize: '10px',
                cursor: 'pointer',
                marginTop: '5px'
              }}
          >
              PAUSE
          </button>
        </div>
      </div>

      {/* Bottom Bar: Active Card Icons */}
      <div style={{
        position: 'absolute',
        bottom: '-50px', // Position below game screen, adjust if needed
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '5px',
        padding: '5px',
        // backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: '3px',
        maxHeight: '40px', // Limit height
        overflowX: 'auto', // Allow horizontal scroll if many icons
        flexWrap: 'nowrap',
      }}>
        {activeCardIcons.map((icon, index) => (
          <div key={index} title={`${icon.id} (x${icon.count})`} style={{
            width: '20px',
            height: '20px',
            border: `1px solid ${icon.rarity === CardRarity.COMMON ? 'grey' : icon.rarity === CardRarity.UNCOMMON ? 'green' : icon.rarity === CardRarity.EPIC ? 'purple' : 'yellow'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '8px',
            backgroundColor: 'rgba(50,50,50,0.7)',
            position: 'relative', // For stack count
          }}>
            {icon.id.substring(0,1).toUpperCase()} {/* First letter as placeholder */}
            {icon.count > 1 && <span style={{position: 'absolute', bottom: '-2px', right: '-2px', fontSize: '7px', background: 'black', borderRadius: '50%', padding: '0 2px'}}>{icon.count}</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default UIOverlay;

// Temporary CardRarity enum for UIOverlay if not imported directly
enum CardRarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  EPIC = 'Epic',
  ASCENSION = 'Ascension',
  SPECIAL = 'Special'
}
