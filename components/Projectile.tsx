
import React from 'react';
import { ProjectileState } from '../types';

interface ProjectileProps {
  projectile: ProjectileState;
}

const Projectile: React.FC<ProjectileProps> = ({ projectile }) => {
  const size = projectile.width; // Assuming width and height are same for simplicity

  const projectileStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${projectile.x}px`,
    top: `${projectile.y}px`,
    width: `${size}px`,
    height: `${size}px`,
    backgroundColor: projectile.color, // Directly use the color string
    zIndex: 8,
  };

  if (projectile.visualType === 'circle') {
    projectileStyle.borderRadius = '50%';
  } else if (projectile.visualType === 'spark') {
    // Spark might be smaller or have a quick fade - handled by particle system mostly
    // For now, render as a small square, color could be brighter
    projectileStyle.width = `${size * 0.7}px`;
    projectileStyle.height = `${size * 0.7}px`;
    projectileStyle.boxShadow = `0 0 3px 1px ${projectile.color}`;
  }
  // Default is 'square'

  return (
    <div style={projectileStyle}></div>
  );
};

export default React.memo(Projectile);
