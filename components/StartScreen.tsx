import React, { useState } from 'react';
import { HATS } from '../constants';
import { HatDefinition } from '../types';

interface StartScreenProps {
  onStartGame: (hat: HatDefinition) => void; // Staff is no longer selected here
}

const StartScreen: React.FC<StartScreenProps> = ({ onStartGame }) => {
  const [selectedHat, setSelectedHat] = useState<HatDefinition>(HATS[0]);

  return (
    <div style={{
      width: '100%',
      maxWidth: '500px',
      padding: '30px',
      border: '2px solid white',
      textAlign: 'center',
      backgroundColor: '#111', // Darker background for modal
      boxShadow: '0 0 10px #FFFF0050',
    }}>
      <h1 style={{ fontSize: '28px', marginBottom: '20px', color: '#FFFF00' }}>Seraph's Last Stand</h1>
      <p style={{ marginBottom: '25px', fontSize: '12px' }}>Prepare for the onslaught!</p>

      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '16px', marginBottom: '10px', color: '#00FFFF' }}>Choose Hat</h2>
        <select
          value={selectedHat.id}
          onChange={(e) => setSelectedHat(HATS.find(h => h.id === e.target.value) || HATS[0])}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: '#333',
            color: 'white',
            border: '1px solid white',
            fontFamily: "'Press Start 2P', cursive",
            fontSize: '10px',
            outline: 'none'
          }}
        >
          {HATS.map(hat => (
            <option key={hat.id} value={hat.id}>{hat.name}</option>
          ))}
        </select>
        <p style={{ marginTop: '8px', fontSize: '10px', color: '#BBB', minHeight: '30px' }}>
          {selectedHat.description}
        </p>
      </div>

      <button
        onClick={() => onStartGame(selectedHat)}
        style={{
          backgroundColor: '#00FF00',
          color: 'black',
          border: '1px solid white',
          padding: '10px 20px',
          fontSize: '14px',
          cursor: 'pointer',
          textTransform: 'uppercase',
        }}
      >
        Start Game
      </button>
      <p style={{ marginTop: '20px', fontSize: '10px', color: '#AAA' }}>Move: A/D or Arrows | Jump: Space | Auto-Shoot</p>
    </div>
  );
};

export default StartScreen;