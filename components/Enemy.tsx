import React from 'react';
import { EnemyState } from '../types';
import { ENEMY_TYPES, ELITE_TELEGRAPH_TINT_COLOR, ELITE_AURA_COLOR } from '../constants';

interface EnemyProps {
  enemy: EnemyState;
}

const Enemy: React.FC<EnemyProps> = ({ enemy }) => {
  const { x, y, width, height, hp, maxHp, type, color: baseColor, isElite, attackState } = enemy;

  let displayColor = baseColor;
  if (isElite) {
    displayColor = ELITE_AURA_COLOR;
  }

  if (attackState === 'aiming') {
    const flashOn = (Date.now() % 300) < 150;
    displayColor = flashOn ? ELITE_TELEGRAPH_TINT_COLOR : (isElite ? ELITE_AURA_COLOR : baseColor);
  }

  const enemyStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${x}px`,
    top: `${y}px`,
    width: `${width}px`,
    height: `${height}px`,
    zIndex: 5,
  };

  const healthPercentage = Math.max(0, (hp / maxHp) * 100);

  const renderWireframeShape = () => {
    const lineThickness = isElite ? 2 : 1.5;
    const shapes: JSX.Element[] = [];
    
    // Helper to create a line
    const createLine = (
      id: string,
      x1: string, y1: string,
      w: string, h: string,
      angle: number = 0
    ) => {
      return (
        <div
          key={`${enemy.id}-line-${id}`}
          style={{
            position: 'absolute',
            left: x1,
            top: y1,
            width: w,
            height: h,
            backgroundColor: displayColor,
            transformOrigin: 'top left',
            transform: `rotate(${angle}deg)`,
          }}
        />
      );
    };

    // Helper to create circles (eyes)
    const createCircle = (id: string, x: string, y: string, size: number, filled: boolean = false) => {
      return (
        <div
          key={`${enemy.id}-circle-${id}`}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: `${size}px`,
            height: `${size}px`,
            border: filled ? 'none' : `${lineThickness}px solid ${displayColor}`,
            backgroundColor: filled ? displayColor : 'transparent',
            borderRadius: '50%',
          }}
        />
      );
    };

    switch (type) {
      case ENEMY_TYPES.grunt_standard.id: // Basic Seraph - Triangle body with eye
        // Triangle body
        shapes.push(createLine('triangle-left', '50%', '20%', `${width * 0.4}px`, `${lineThickness}px`, 135));
        shapes.push(createLine('triangle-right', '50%', '20%', `${width * 0.4}px`, `${lineThickness}px`, 45));
        shapes.push(createLine('triangle-base', '20%', '80%', '60%', `${lineThickness}px`));
        
        // Central eye
        shapes.push(createCircle('eye-outer', 'calc(50% - 8px)', 'calc(50% - 8px)', 16, false));
        shapes.push(createCircle('eye-inner', 'calc(50% - 3px)', 'calc(50% - 3px)', 6, true));
        
        // Wing lines
        shapes.push(createLine('wing-left', '10%', '40%', '20%', `${lineThickness}px`, -30));
        shapes.push(createLine('wing-right', '70%', '40%', '20%', `${lineThickness}px`, 30));
        break;

      case ENEMY_TYPES.grunt_fast.id: // Fast Seraph - Diamond with multiple eyes
        // Diamond shape
        shapes.push(createLine('diamond-tl', '50%', '10%', '35%', `${lineThickness}px`, 135));
        shapes.push(createLine('diamond-tr', '50%', '10%', '35%', `${lineThickness}px`, 45));
        shapes.push(createLine('diamond-bl', '50%', '90%', '35%', `${lineThickness}px`, -135));
        shapes.push(createLine('diamond-br', '50%', '90%', '35%', `${lineThickness}px`, -45));
        
        // Three small eyes in vertical line
        shapes.push(createCircle('eye1', 'calc(50% - 4px)', '25%', 8, false));
        shapes.push(createCircle('eye2', 'calc(50% - 4px)', '45%', 8, false));
        shapes.push(createCircle('eye3', 'calc(50% - 4px)', '65%', 8, false));
        
        // Speed lines
        shapes.push(createLine('speed1', '0%', '50%', '15%', `${lineThickness}px`));
        shapes.push(createLine('speed2', '85%', '50%', '15%', `${lineThickness}px`));
        break;

      case ENEMY_TYPES.grunt_tough.id: // Tough Seraph - Hexagon with eye grid
        // Hexagon
        const hexSize = Math.min(width, height) * 0.4;
        shapes.push(createLine('hex-top', '30%', '20%', '40%', `${lineThickness}px`));
        shapes.push(createLine('hex-tr', '70%', '20%', `${hexSize}px`, `${lineThickness}px`, 60));
        shapes.push(createLine('hex-br', '70%', '80%', `${hexSize}px`, `${lineThickness}px`, -60));
        shapes.push(createLine('hex-bottom', '30%', '80%', '40%', `${lineThickness}px`));
        shapes.push(createLine('hex-bl', '30%', '20%', `${hexSize}px`, `${lineThickness}px`, 120));
        shapes.push(createLine('hex-tl', '30%', '80%', `${hexSize}px`, `${lineThickness}px`, -120));
        
        // Eye grid (2x2)
        shapes.push(createCircle('eye-tl', '30%', '30%', 10, false));
        shapes.push(createCircle('eye-tr', '55%', '30%', 10, false));
        shapes.push(createCircle('eye-bl', '30%', '55%', 10, false));
        shapes.push(createCircle('eye-br', '55%', '55%', 10, false));
        break;

      case ENEMY_TYPES.shooter_basic.id: // Shooter Seraph - Rectangle with beam
        // Main body
        shapes.push(createLine('body-top', '10%', '30%', '50%', `${lineThickness}px`));
        shapes.push(createLine('body-bottom', '10%', '70%', '50%', `${lineThickness}px`));
        shapes.push(createLine('body-left', '10%', '30%', `${lineThickness}px`, '40%'));
        shapes.push(createLine('body-right', '60%', '30%', `${lineThickness}px`, '40%'));
        
        // Large eye
        shapes.push(createCircle('main-eye', '25%', 'calc(50% - 10px)', 20, false));
        shapes.push(createCircle('pupil', '32%', 'calc(50% - 3px)', 6, true));
        
        // Beam projector
        shapes.push(createLine('beam-top', '60%', '45%', '40%', `${lineThickness}px`));
        shapes.push(createLine('beam-bottom', '60%', '55%', '40%', `${lineThickness}px`));
        shapes.push(createLine('beam-end', `calc(100% - ${lineThickness}px)`, '45%', `${lineThickness}px`, '10%'));
        
        // Wings (geometric)
        shapes.push(createLine('wing-top', '20%', '10%', '30%', `${lineThickness}px`, 15));
        shapes.push(createLine('wing-bottom', '20%', '90%', '30%', `${lineThickness}px`, -15));
        break;
        
      default: // Fallback - Abstract geometric seraph
        // Outer ring
        shapes.push(createCircle('ring-outer', 'calc(50% - 20px)', 'calc(50% - 20px)', 40, false));
        
        // Central eye
        shapes.push(createCircle('center-eye', 'calc(50% - 8px)', 'calc(50% - 8px)', 16, false));
        shapes.push(createCircle('center-pupil', 'calc(50% - 2px)', 'calc(50% - 2px)', 4, true));
        
        // Cross pattern
        shapes.push(createLine('cross-v', 'calc(50% - 1px)', '20%', `${lineThickness}px`, '60%'));
        shapes.push(createLine('cross-h', '20%', 'calc(50% - 1px)', '60%', `${lineThickness}px`));
        break;
    }
    
    return shapes;
  };

  return (
    <div style={enemyStyle}>
      <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'visible' }}>
        {renderWireframeShape()}
      </div>
      {/* Health Bar */}
      <div style={{
        position: 'absolute',
        top: '-6px',
        left: '0',
        width: '100%',
        height: '3px',
        backgroundColor: '#555',
        zIndex: 6,
      }}>
        <div
          style={{
            width: `${healthPercentage}%`,
            height: '100%',
            backgroundColor: '#FF0000',
            transition: 'width 0.2s linear',
          }}
        ></div>
      </div>
    </div>
  );
};

export default React.memo(Enemy);