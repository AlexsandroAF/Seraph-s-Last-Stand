import React from 'react';

interface PauseScreenProps {
  onResume: () => void;
  onMainMenu: () => void;
}

const PauseScreen: React.FC<PauseScreenProps> = ({ onResume, onMainMenu }) => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      color: 'white',
      padding: '10px',
      textAlign: 'center',
    }}>
      <h1 style={{ fontSize: '28px', marginBottom: '25px', color: '#FFFF00' }}>Paused</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <button
          onClick={onResume}
          style={{
            minWidth: '180px',
            backgroundColor: '#00FF00',
            color: 'black',
            border: '1px solid white',
            padding: '10px 15px',
            fontSize: '14px',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Resume
        </button>
        <button
          onClick={onMainMenu}
          style={{
            minWidth: '180px',
            backgroundColor: '#00FFFF',
            color: 'black',
            border: '1px solid white',
            padding: '10px 15px',
            fontSize: '14px',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
        >
          Main Menu
        </button>
      </div>
       <p style={{ marginTop: '30px', fontSize: '10px', color: '#AAA' }}>Move: A/D or Arrows | Jump: Space</p>
    </div>
  );
};

export default PauseScreen;