import React from 'react';
import { PlayerState, PLAYER_WIDTH, PLAYER_HEIGHT } from '../types';
import { STAFF_VISUAL_LENGTH } from '../constants';

interface PlayerProps {
  player: PlayerState;
}

const Player: React.FC<PlayerProps> = ({ player }) => {
  // Use playerSizeModifier to affect visual size
  const playerRenderWidth = PLAYER_WIDTH * player.playerSizeModifier;
  const playerRenderHeight = PLAYER_HEIGHT * player.playerSizeModifier;

  const playerStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${player.x}px`,
    top: `${player.y}px`,
    width: `${playerRenderWidth}px`,
    height: `${playerRenderHeight}px`,
    zIndex: 10,
  };

  let dynamicEffectStyle: React.CSSProperties = {};
  if (player.hasBarrier && (player.barrierHitsRemaining || 0) > 0) {
    dynamicEffectStyle = {
      boxShadow: '0 0 8px 2px #FFFFFF',
      opacity: 0.9,
    };
  } else if (player.isInvulnerable) {
    dynamicEffectStyle = {
      boxShadow: '0 0 6px 1px #FFFFFF',
      opacity: 0.7,
    };
  }

  // Hat visual - estilo pixelado
  let hatVisual;
  if (player.activeHat) {
    if (player.activeHat.id === 'propeller_beanie') {
      hatVisual = (
        <div style={{
          position: 'absolute',
          top: `-${playerRenderHeight * 0.25}px`,
          left: `${playerRenderWidth * 0.3}px`,
          width: `${playerRenderWidth * 0.4}px`,
          height: `${playerRenderHeight * 0.15}px`,
          border: '1px solid white',
        }}>
          <div style={{ 
            position: 'absolute', 
            top: '-2px', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            width: '1px', 
            height: '2px', 
            background: 'white' 
          }}></div>
        </div>
      );
    } else if (player.activeHat.id === 'helmet') {
       hatVisual = (
        <div style={{
          position: 'absolute',
          top: `-${playerRenderHeight * 0.2}px`,
          left: `-1px`,
          width: `${playerRenderWidth + 2}px`,
          height: `${playerRenderHeight * 0.3}px`,
          border: '1px solid white',
          borderBottom: 'none',
        }}></div>
      );
    } else { // Chapéu de Mago pixelado
         hatVisual = (
            <div style={{
              position: 'absolute',
              top: `-${playerRenderHeight * 0.5}px`, 
              left: `${playerRenderWidth * 0.2}px`,
              width: `0`,
              height: `0`,
              borderLeft: `${playerRenderWidth * 0.3}px solid transparent`,
              borderRight: `${playerRenderWidth * 0.3}px solid transparent`,
              borderBottom: `${playerRenderHeight * 0.6}px solid white`,
            }}>
              {/* Linha na lateral do chapéu */}
              <div style={{
                position: 'absolute',
                bottom: `${playerRenderHeight * 0.1}px`,
                left: `${-playerRenderWidth * 0.15}px`,
                width: `${playerRenderWidth * 0.3}px`,
                height: '1px',
                backgroundColor: 'white',
              }}></div>
            </div>
         );
    }
  }

  // Cajado visual - mais simples e pixelado
  const staffThickness = 2;
  const staffRotationDegrees = player.aimAngle * (180 / Math.PI);

  const staffStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${playerRenderWidth / 2}px`,
    top: `${playerRenderHeight / 2 - staffThickness / 2}px`,
    width: `${STAFF_VISUAL_LENGTH}px`,
    height: `${staffThickness}px`,
    backgroundColor: 'white',
    transformOrigin: '0% 50%',
    transform: `rotate(${staffRotationDegrees}deg)`,
    zIndex: -1,
  };

  // Orbe pixelado na ponta do cajado
  const orbSize = 4;
  const orbStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${playerRenderWidth / 2 + STAFF_VISUAL_LENGTH - orbSize / 2}px`,
    top: `${playerRenderHeight / 2 - orbSize / 2}px`,
    width: `${orbSize}px`,
    height: `${orbSize}px`,
    backgroundColor: 'white',
    transformOrigin: `${-STAFF_VISUAL_LENGTH + orbSize / 2}px 50%`,
    transform: `rotate(${staffRotationDegrees}deg)`,
    zIndex: 5,
  };
  
  // Eye direction based on aimAngle
  const eyeHorizontalOffset = Math.cos(player.aimAngle) * (playerRenderWidth * 0.1);
  const eyeVerticalOffset = Math.sin(player.aimAngle) * (playerRenderHeight * 0.08);
  
  return (
    <div style={playerStyle}>
      {/* Corpo do Mago - estilo pixelado simples */}
      <div style={{
        width: '100%',
        height: '100%',
        border: '2px solid white',
        boxSizing: 'border-box',
        position: 'relative',
        ...dynamicEffectStyle,
      }}>
        {/* Cajado */}
        <div style={staffStyle}></div>
        
        {/* Orbe na ponta do cajado */}
        <div style={orbStyle}></div>

        {/* Rosto/Máscara - área escura no meio */}
        <div style={{
          position: 'absolute',
          top: '25%',
          left: '25%',
          width: '50%',
          height: '35%',
          backgroundColor: 'transparent',
          border: '1px solid white',
        }}>
          {/* Olhos pixelados */}
          <div style={{
            position: 'absolute',
            top: `calc(40% + ${eyeVerticalOffset}px)`,
            left: `calc(30% + ${eyeHorizontalOffset}px)`,
            width: '2px',
            height: '2px',
            backgroundColor: 'white',
          }}></div>
          <div style={{
            position: 'absolute',
            top: `calc(40% + ${eyeVerticalOffset}px)`,
            left: `calc(70% + ${eyeHorizontalOffset}px)`,
            width: '2px',
            height: '2px',
            backgroundColor: 'white',
          }}></div>
        </div>

        {/* Braços simples */}
        <div style={{
          position: 'absolute',
          top: '45%',
          left: '-3px',
          width: '8px',
          height: '2px',
          backgroundColor: 'white',
        }}></div>
        <div style={{
          position: 'absolute',
          top: '45%',
          right: '-3px',
          width: '8px',
          height: '2px',
          backgroundColor: 'white',
        }}></div>

        {/* Linha central da túnica */}
        <div style={{
          position: 'absolute',
          top: '65%',
          left: '48%',
          width: '1px',
          height: '30%',
          backgroundColor: 'white',
        }}></div>

        {/* Base da túnica - linha horizontal */}
        <div style={{
          position: 'absolute',
          bottom: '5%',
          left: '20%',
          width: '60%',
          height: '1px',
          backgroundColor: 'white',
        }}></div>
      </div>
      
      {/* Hat Visual */}
      {hatVisual}
    </div>
  );
};

export default React.memo(Player);