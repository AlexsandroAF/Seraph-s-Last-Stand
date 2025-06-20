
import React, { useEffect, useReducer, useCallback, useState, useRef } from 'react';
import PlayerComponent from './components/Player';
import EnemyComponent from './components/Enemy';
import ProjectileComponent from './components/Projectile';
import UIOverlay from './components/UIOverlay';
import StartScreen from './components/StartScreen';
import CardSelectionScreen from './components/CardSelectionScreen';
import GameOverScreen from './components/GameOverScreen';
import PauseScreen from './components/PauseScreen';
import {
  PlayerState, EnemyState, ProjectileState, CardDefinition, GameStatus, HatDefinition, StaffDefinition, PlayerStats,
  GAME_WIDTH, GAME_HEIGHT, PLAYER_INITIAL_X, PLAYER_INITIAL_Y, PLAYER_WIDTH, PLAYER_HEIGHT, GRAVITY, GROUND_LEVEL, CardRarity, ParticleEffect, TerrainBlock, TERRAIN_BLOCKS, ENEMY_MAX_DEPTH_FACTOR, ProjectileVisualType
} from './types';
import { 
    BASE_PLAYER_STATS, ALL_CARDS_POOL, ALL_ASCENSIONS, HATS, STAFFS, ENEMY_TYPES, CARD_CHOICES_COUNT,
    BASE_EXP_TO_NEXT_LEVEL, EXP_PER_LEVEL_SCALER, PLAYER_INITIAL_HAT_ID, PLAYER_INITIAL_STAFF_ID,
    ENEMY_SPAWN_INTERVAL_MIN, ENEMY_SPAWN_INTERVAL_MAX, MAX_ENEMIES_ON_SCREEN_BASE, MAX_ENEMIES_ON_SCREEN_PER_LEVEL,
    ENEMY_HP_SCALING_PER_LEVEL, ENEMY_DAMAGE_SCALING_PER_LEVEL, ENEMY_EXP_SCALING_PER_LEVEL, STAFF_VISUAL_LENGTH,
    SHOOTER_ATTACK_RANGE, ENEMY_PROJECTILE_COLOR, ENEMY_PROJECTILE_SIZE, ENEMY_PROJECTILE_VISUAL_TYPE,
    GRUNT_TOUGH_AGGRO_RANGE, GRUNT_TOUGH_AGGRO_SPEED_MULTIPLIER, SHOOTER_PATROL_SPEED_MULTIPLIER, SHOOTER_ATTACKING_SPEED_MULTIPLIER,
    BLEED_TICK_INTERVAL, BLEED_PARTICLE_COLOR, // Stage 1 import
    // Stage 2 imports
    BARRIER_COOLDOWN_BASE, BARRIER_HITS_BASE, THUNDERBOLT_DAMAGE_BASE, THUNDERBOLT_INTERVAL_BASE, THUNDERBOLT_COUNT, THUNDERBOLT_RADIUS, 
    FRAGMENTATION_COUNT_BASE, FRAGMENTATION_PROJECTILE_SPEED, FRAGMENTATION_PROJECTILE_SIZE_MULTIPLIER, FRAGMENTATION_DAMAGE_MULTIPLIER_BASE, 
    COLD_SLOW_FACTOR_BASE, COLD_MAX_SLOW_BASE, COLD_EFFECT_DURATION,
    THUNDERBOLT_COLOR, BARRIER_ACTIVE_COLOR, COLD_HIT_COLOR, FRAGMENT_SPAWN_COLOR,
    // Stage 3 imports
    ASCENSION_ACTIVATE_COLOR, PROTECTOR_PROJECTILE_COUNT_ASCENSION, PROTECTOR_PROJECTILE_DAMAGE_MULTIPLIER_ASCENSION
} from './constants';
import { v4 as uuidv4 } from 'uuid';


const applyCardEffects = (currentStats: PlayerState, card: CardDefinition): PlayerState => {
  let newStats = { ...currentStats };
  
  if (card.cardType === 'staff_unlock' && card.staffToUnlockId) {
    const newStaff = STAFFS.find(s => s.id === card.staffToUnlockId);
    if (newStaff) {
        newStats.activeStaff = newStaff;
        newStats.unlockedStaffIds.add(newStaff.id);
        if (newStaff.effects) { // Check if newStaff has effects
            newStaff.effects.forEach(effect => {
                 const tempCardForStaffEffect: CardDefinition = { id: `staff_effect_${newStaff.id}_${effect.stat}`, name: "Staff Effect", description: "", rarity: CardRarity.SPECIAL, effects: [effect]};
                 newStats = applyCardEffects(newStats, tempCardForStaffEffect); 
            });
        }
    }
  } else {
    card.effects.forEach(effect => {
      const statProperty = effect.stat;
      
      if (statProperty === 'playerSizeModifier') {
        let currentValue = Number(newStats.playerSizeModifier);
        if (isNaN(currentValue)) currentValue = BASE_PLAYER_STATS.playerSizeModifier;

        switch (effect.mode) {
            case 'add': newStats.playerSizeModifier = currentValue + effect.value; break;
            case 'multiply_base': newStats.playerSizeModifier = currentValue * effect.value; break;
            case 'multiply_total': newStats.playerSizeModifier = currentValue * effect.value; break;
            case 'set': newStats.playerSizeModifier = effect.value; break;
        }
        newStats.playerSizeModifier = Math.max(0.1, newStats.playerSizeModifier); 

      } else if (statProperty as keyof PlayerStats) { 
        const statKey = statProperty as keyof PlayerStats;
        let currentValue = Number(newStats[statKey]);
        const baseValue = Number(BASE_PLAYER_STATS[statKey as keyof PlayerStats]); 
        
        if (isNaN(currentValue) && typeof baseValue === 'number') { // Ensure baseValue is a number
            currentValue = baseValue; 
        } else if (isNaN(currentValue)) {
            // Fallback if baseValue is also not a number (should not happen with good definitions)
            currentValue = effect.mode === 'multiply_base' || effect.mode === 'multiply_total' ? 1 : 0;
        }
        
        const oldValueForLog = newStats[statKey]; 

        switch (effect.mode) {
          case 'add':
            (newStats[statKey] as number) = currentValue + effect.value;
            break;
          case 'multiply_base': 
             (newStats[statKey] as number) = currentValue * effect.value;
            break;
          case 'multiply_total':
            (newStats[statKey] as number) = currentValue * effect.value;
            break;
          case 'set':
            (newStats[statKey] as number) = effect.value;
            break;
        }
         if (card.id === 'will_o_wisp_epic' && statKey === 'attackSpeed') {
            console.log(`Will-O-Wisp: attackSpeed changed from ${oldValueForLog} to ${newStats.attackSpeed}. Effect value: ${effect.value}, Current value used for calc: ${currentValue}`);
        }
        if (card.id === 'resonance_common' && statKey === 'attackSpeed') {
            console.log(`Minor Resonance: attackSpeed changed from ${oldValueForLog} to ${newStats.attackSpeed}. Effect value: ${effect.value}, Current value used for calc: ${currentValue}`);
        }
      }
    });
  }

  if (card.onPickup) {
    const returnedState = card.onPickup(newStats);
    if (returnedState !== undefined) { 
        newStats = returnedState as PlayerState; 
    }
  }
  
  newStats.currentHp = Math.min(newStats.currentHp, newStats.maxHp);
  if (newStats.currentHp < 0) newStats.currentHp = 0;
  newStats.attackSpeed = Math.max(50, newStats.attackSpeed); 

  return newStats;
};


const initializePlayer = (hat: HatDefinition): PlayerState => {
  const initialStaff = STAFFS.find(s => s.id === PLAYER_INITIAL_STAFF_ID) || STAFFS[0];
  let player: PlayerState = { 
    ...BASE_PLAYER_STATS, 
    x: PLAYER_INITIAL_X,
    y: PLAYER_INITIAL_Y,
    width: PLAYER_WIDTH, 
    height: PLAYER_HEIGHT, 
    isJumping: false,
    velocityY: 0,
    facingDirection: 'right' as 'left' | 'right',
    activeHat: hat,
    activeStaff: initialStaff,
    chosenCards: {},
    activeAscensions: new Set<string>(),
    unlockedStaffIds: new Set<string>([initialStaff.id]),
    currentJumps: BASE_PLAYER_STATS.jumps,
    aimAngle: 0,
    // Stage 1
    playerSizeModifier: BASE_PLAYER_STATS.playerSizeModifier,
    hasRageActive: false, 
    appliesBleed: BASE_PLAYER_STATS.appliesBleed,
    bleedDps: BASE_PLAYER_STATS.bleedDps,
    bleedDuration: BASE_PLAYER_STATS.bleedDuration,
    // Stage 2
    appraisalStacks: BASE_PLAYER_STATS.appraisalStacks,
    hasBarrier: BASE_PLAYER_STATS.hasBarrier,
    barrierCooldown: BASE_PLAYER_STATS.barrierCooldown,
    lastBarrierActivationTime: BASE_PLAYER_STATS.lastBarrierActivationTime,
    barrierHitsRemaining: BASE_PLAYER_STATS.barrierHitsRemaining,
    appliesCold: BASE_PLAYER_STATS.appliesCold,
    coldSlowFactor: BASE_PLAYER_STATS.coldSlowFactor,
    coldMaxSlow: BASE_PLAYER_STATS.coldMaxSlow,
    triggersThunderbolts: BASE_PLAYER_STATS.triggersThunderbolts,
    thunderboltDamage: BASE_PLAYER_STATS.thunderboltDamage,
    thunderboltInterval: BASE_PLAYER_STATS.thunderboltInterval,
    lastThunderboltTime: BASE_PLAYER_STATS.lastThunderboltTime,
    hasFragmentation: BASE_PLAYER_STATS.hasFragmentation,
    fragmentationCount: BASE_PLAYER_STATS.fragmentationCount,
    fragmentationDamageMultiplier: BASE_PLAYER_STATS.fragmentationDamageMultiplier,
    // Stage 3
    instaKillOnMaxSlowChance: BASE_PLAYER_STATS.instaKillOnMaxSlowChance,
    barrierBreakProjectileCount: BASE_PLAYER_STATS.barrierBreakProjectileCount,
    barrierBreakProjectileDamageMultiplier: BASE_PLAYER_STATS.barrierBreakProjectileDamageMultiplier,
  };

  hat.effects.forEach(effect => {
    player = applyCardEffects(player, { id: `hat_${hat.id}`, name: hat.name, description:'', rarity: CardRarity.COMMON, effects: [effect] });
  });
  
  if (initialStaff.effects) { // Check if initialStaff has effects
    initialStaff.effects.forEach(effect => {
        player = applyCardEffects(player, { id: `staff_init_${initialStaff.id}`, name: initialStaff.name, description:'', rarity: CardRarity.SPECIAL, effects: [effect] });
    });
  }

  player.currentJumps = player.jumps;
  player.currentHp = player.maxHp;
  player.expToNextLevel = BASE_EXP_TO_NEXT_LEVEL; 
  return player;
};

type GameAction =
  | { type: 'START_GAME'; payload: { hat: HatDefinition } }
  | { type: 'RESTART_GAME' }
  | { type: 'SELECT_CARD'; payload: CardDefinition }
  | { type: 'GAME_TICK'; payload: { keysPressed: Set<string>; deltaTime: number; mousePosition: {x: number, y: number} } }
  | { type: 'PAUSE_GAME' }
  | { type: 'RESUME_GAME' }
  | { type: 'MAIN_MENU' };

interface GameReducerState {
    status: GameStatus;
    player: PlayerState;
    enemies: EnemyState[];
    projectiles: ProjectileState[];
    score: number;
    gameTime: number; 
    lastShotTime: number;
    offeredCards: CardDefinition[];
    keysPressed: Set<string>; 
    particleEffects: ParticleEffect[];
    lastEnemySpawnTime: number; 
    activeCardIcons: { id: string, count: number, rarity: CardRarity }[]; 
    mousePosition: { x: number, y: number };
}

function gameReducer(state: GameReducerState, action: GameAction): GameReducerState {
    switch (action.type) {
        case 'START_GAME': {
            const initialPlayer = initializePlayer(action.payload.hat);
            return {
                ...state,
                status: 'PLAYING',
                player: initialPlayer,
                enemies: [],
                projectiles: [],
                score: 0,
                gameTime: 0,
                lastShotTime: 0,
                offeredCards: [],
                keysPressed: new Set(),
                particleEffects: [],
                lastEnemySpawnTime: 0,
                activeCardIcons: [],
                mousePosition: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 }, 
            };
        }
        case 'RESTART_GAME': {
            const currentHat = state.player.activeHat || HATS.find(h=>h.id === PLAYER_INITIAL_HAT_ID) || HATS[0];
            const initialPlayer = initializePlayer(currentHat);
             return {
                ...state, 
                status: 'PLAYING',
                player: initialPlayer,
                enemies: [],
                projectiles: [],
                score: 0,
                gameTime: 0,
                lastShotTime: 0,
                offeredCards: [],
                keysPressed: new Set(),
                particleEffects: [],
                lastEnemySpawnTime: 0,
                activeCardIcons: [],
                mousePosition: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 },
            };
        }
        case 'MAIN_MENU':
            return { ...state, status: 'START_SCREEN' };

        case 'SELECT_CARD': {
            if (action.payload.id === 'continue') { 
                 return { ...state, status: 'PLAYING', offeredCards: [] };
            }

            let newPlayerState = applyCardEffects(state.player, action.payload);
            const cardId = action.payload.id;
            let newParticleEffectsFromSelection = [...state.particleEffects];

            if (action.payload.cardType !== 'staff_unlock') { 
              newPlayerState.chosenCards[cardId] = (newPlayerState.chosenCards[cardId] || 0) + 1;
            }

            ALL_ASCENSIONS.forEach(asc => {
                if (asc.baseCardId === cardId && 
                    (newPlayerState.chosenCards[cardId] || 0) >= asc.stacksNeeded && 
                    !newPlayerState.activeAscensions.has(asc.id)) {
                    
                    newPlayerState = applyCardEffects(newPlayerState, asc);
                    newPlayerState.activeAscensions.add(asc.id);
                    // Add ascension particle effect
                    const playerRenderWidth = PLAYER_WIDTH * newPlayerState.playerSizeModifier;
                    const playerRenderHeight = PLAYER_HEIGHT * newPlayerState.playerSizeModifier;
                    newParticleEffectsFromSelection.push({
                        id: uuidv4(),
                        x: newPlayerState.x + playerRenderWidth / 2,
                        y: newPlayerState.y + playerRenderHeight / 2,
                        type: 'ascension_activate',
                        creationTime: Date.now(), // Use current time for particle
                        duration: 800, // Duration of ascension particle
                        size: playerRenderWidth * 2, // Size of ascension particle
                        color: ASCENSION_ACTIVATE_COLOR,
                        particleCount: 1, // Single large flash/ring
                        particleShape: 'circle'
                    });
                }
            });
            
            const newActiveCardIcons = Object.entries(newPlayerState.chosenCards).map(([id, count]) => {
                const cardDef = ALL_CARDS_POOL.find(c => c.id === id) || ALL_ASCENSIONS.find(c => c.id === id);
                return { id, count, rarity: cardDef?.rarity || CardRarity.COMMON };
            });
            newPlayerState.activeAscensions.forEach(ascId => {
                 if(!newActiveCardIcons.find(icon => icon.id === ascId)) {
                    const cardDef = ALL_ASCENSIONS.find(c => c.id === ascId);
                    if(cardDef) newActiveCardIcons.push({id: ascId, count: 1, rarity: cardDef.rarity});
                 }
            });

            return { ...state, player: newPlayerState, status: 'PLAYING', offeredCards: [], activeCardIcons: newActiveCardIcons, particleEffects: newParticleEffectsFromSelection };
        }
        case 'PAUSE_GAME':
            return state.status === 'PLAYING' ? { ...state, status: 'PAUSED' } : state;
        case 'RESUME_GAME':
            return state.status === 'PAUSED' ? { ...state, status: 'PLAYING', lastShotTime: Date.now(), lastEnemySpawnTime: Date.now() - (ENEMY_SPAWN_INTERVAL_MAX - 1000) } : state;

        case 'GAME_TICK': {
            if (state.status !== 'PLAYING') return state;
            
            const { keysPressed, mousePosition: currentMousePosition } = action.payload; 
            let { player, enemies, projectiles, score, gameTime, lastShotTime, particleEffects, lastEnemySpawnTime, activeCardIcons } = { ...state };
            const currentTime = Date.now();
            let newGameTime = gameTime + 16; 

            let newStatus: GameStatus = state.status;
            let newProjectilesFromGame: ProjectileState[] = []; // For thunderbolts, fragments, protector
            const newParticleEffectsList = [...particleEffects]; 

            const playerRenderWidth = PLAYER_WIDTH * player.playerSizeModifier;
            const playerRenderHeight = PLAYER_HEIGHT * player.playerSizeModifier;
            const playerCenterX = player.x + playerRenderWidth / 2;
            const playerCenterY = player.y + playerRenderHeight / 2;

            player.aimAngle = Math.atan2(currentMousePosition.y - playerCenterY, currentMousePosition.x - playerCenterX);
            player.facingDirection = Math.cos(player.aimAngle) >= 0 ? 'right' : 'left';


            // Player movement
            const moveSpeed = player.movementSpeed;
            if (keysPressed.has('arrowleft') || keysPressed.has('a')) {
                player.x = Math.max(0, player.x - moveSpeed);
            }
            if (keysPressed.has('arrowright') || keysPressed.has('d')) {
                player.x = Math.min(GAME_WIDTH - playerRenderWidth, player.x + moveSpeed);
            }

            if ((keysPressed.has(' ') || keysPressed.has('arrowup') || keysPressed.has('w')) && player.currentJumps > 0 && !player.isJumping) {
                player.isJumping = true;
                player.velocityY = -player.jumpStrength;
                player.currentJumps -= 1;
            }
            
            player.y += player.velocityY;
            player.velocityY += GRAVITY;

            let onSolidGround = false;
            TERRAIN_BLOCKS.forEach(block => {
              const horizontalOverlap = player.x < block.x + block.width && player.x + playerRenderWidth > block.x;
              const verticalLanding = player.y + playerRenderHeight >= block.y && player.y + playerRenderHeight - player.velocityY <= block.y + 1 ; 

              if (horizontalOverlap && verticalLanding && player.velocityY >= 0) {
                player.y = block.y - playerRenderHeight;
                player.velocityY = 0;
                player.isJumping = false;
                player.currentJumps = player.jumps;
                onSolidGround = true;
              }
            });

            if (!onSolidGround && player.y + playerRenderHeight >= GROUND_LEVEL && player.velocityY >=0) { 
                player.y = GROUND_LEVEL - playerRenderHeight;
                player.velocityY = 0;
                player.isJumping = false;
                player.currentJumps = player.jumps;
            }

            if (player.y < -playerRenderHeight * 2) { 
                player.y = GROUND_LEVEL - playerRenderHeight;
                player.velocityY = 0;
                player.isJumping = false;
                player.currentJumps = player.jumps;
            }

            if (player.isInvulnerable && currentTime > player.invulnerabilityEndTime && !(player.hasBarrier && (player.barrierHitsRemaining || 0) > 0) ) {
                player.isInvulnerable = false;
            }
            
            // Barrier Logic (cooldown restore)
            if (player.hasBarrier) {
                if ((player.barrierHitsRemaining || 0) === 0 && currentTime - (player.lastBarrierActivationTime || 0) > (player.barrierCooldown || BARRIER_COOLDOWN_BASE)) {
                    // Restore hits based on stacks, ensuring at least base hits if card is picked
                    const barrierCardStacks = player.chosenCards['barrier_epic_stage2'] || 0;
                    if (barrierCardStacks > 0) {
                         player.barrierHitsRemaining = barrierCardStacks * BARRIER_HITS_BASE;
                    } else if (player.activeAscensions.has('protector_ascension')) { // If only ascension active but not base card for some reason
                         player.barrierHitsRemaining = BARRIER_HITS_BASE; 
                    }
                }
                if ((player.barrierHitsRemaining || 0) > 0) {
                     newParticleEffectsList.push({ id: uuidv4(), x: playerCenterX, y: playerCenterY, type: 'barrier_active', creationTime: currentTime, duration: 50, size: playerRenderWidth * 1.5, color: BARRIER_ACTIVE_COLOR, particleCount: 1, fixedPosition: true, particleShape: 'circle'});
                }
            }

            // Thunderbolt Logic
            if (player.triggersThunderbolts && currentTime - (player.lastThunderboltTime || 0) > (player.thunderboltInterval || THUNDERBOLT_INTERVAL_BASE)) {
                for (let i = 0; i < THUNDERBOLT_COUNT; i++) {
                    const targetX = enemies.length > 0 ? enemies[Math.floor(Math.random() * enemies.length)].x + enemies[Math.floor(Math.random() * enemies.length)].width / 2 : Math.random() * GAME_WIDTH;
                    const targetY = enemies.length > 0 ? enemies[Math.floor(Math.random() * enemies.length)].y + enemies[Math.floor(Math.random() * enemies.length)].height / 2 : Math.random() * (GAME_HEIGHT * 0.8); 
                    
                    newParticleEffectsList.push({ 
                        id: uuidv4(), 
                        x: targetX, 
                        y: targetY, 
                        type: 'thunderbolt_impact', 
                        creationTime: currentTime, 
                        duration: 350, // Slightly shorter for quicker strike visual
                        size: THUNDERBOLT_RADIUS, // Base size for ground flash
                        color: THUNDERBOLT_COLOR, 
                        particleCount: 1, // Main bolt effect is 1, sub-particles handled in render
                        particleShape: 'circle' // For ground flash
                    });

                    enemies.forEach(enemy => {
                        const distToBolt = Math.sqrt(Math.pow(enemy.x + enemy.width/2 - targetX, 2) + Math.pow(enemy.y + enemy.height/2 - targetY, 2));
                        if (distToBolt < THUNDERBOLT_RADIUS) {
                            const boltDamage = (player.thunderboltDamage || THUNDERBOLT_DAMAGE_BASE);
                            enemy.hp -= boltDamage;
                            // Apply Cold effect from thunderbolt
                            if (player.appliesCold && enemy.slowFactor < (player.coldMaxSlow || COLD_MAX_SLOW_BASE)) {
                                enemy.slowFactor = Math.min((player.coldMaxSlow || COLD_MAX_SLOW_BASE), enemy.slowFactor + (player.coldSlowFactor || COLD_SLOW_FACTOR_BASE));
                                enemy.lastSlowedTime = currentTime;
                                newParticleEffectsList.push({ id: uuidv4(), x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, type: 'cold_hit', creationTime: currentTime, duration: 200, size: enemy.width * 0.3, color: COLD_HIT_COLOR, particleCount: 3 });
                            }
                            // Freezer insta-kill check from thunderbolt
                            if (enemy.hp > 0 && (player.instaKillOnMaxSlowChance || 0) > 0 && enemy.slowFactor >= (player.coldMaxSlow || 0) && (player.coldMaxSlow || 0) === 1.0) {
                                if (Math.random() < (player.instaKillOnMaxSlowChance || 0)) {
                                    enemy.hp = 0; // Insta-kill
                                }
                            }
                        }
                    });
                }
                player.lastThunderboltTime = currentTime;
            }


            // Player shooting
            let newLastShotTime = lastShotTime;
            const actualAttackSpeed = player.attackSpeed * (player.activeStaff.baseAttackSpeedModifier || 1);
            if (currentTime - newLastShotTime > actualAttackSpeed) {
                const projBaseSize = 5; 
                const projWidth = projBaseSize * player.projectileSize;
                const projHeight = projBaseSize * player.projectileSize;
                
                const critRoll = Math.random();
                const isCrit = critRoll < player.critChance;
                let damageDealt = player.damage * (player.activeStaff.baseDamageModifier || 1);
                
                if (player.hasRageActive && player.currentHp < player.maxHp * 0.5) {
                    const hpPercentageBelowThreshold = 1 - (player.currentHp / (player.maxHp * 0.5)); 
                    const rageMultiplier = 1 + (0.5 * hpPercentageBelowThreshold); 
                    damageDealt *= rageMultiplier;
                }
                damageDealt *= (isCrit ? player.critDamage : 1);
                
                const staffProjectileSpeed = player.activeStaff.projectileBaseSpeed || 10;
                const shotCount = player.activeStaff.shotCount || 1;
                const spreadAngle = player.activeStaff.spreadAngle || 0; 

                const projectileFireAngle = Math.atan2(currentMousePosition.y - playerCenterY, currentMousePosition.x - playerCenterX);
                
                let tempPlayerProjectiles = [...projectiles];
                for (let i = 0; i < shotCount; i++) {
                    let currentShotAngle = projectileFireAngle; 
                    if (shotCount > 1) {
                        currentShotAngle = projectileFireAngle - (spreadAngle / 2) + (i * (spreadAngle / (shotCount - 1 || 1)));
                         if (shotCount === 1) currentShotAngle = projectileFireAngle; 
                    }

                    const dx = Math.cos(currentShotAngle) * staffProjectileSpeed;
                    const dy = Math.sin(currentShotAngle) * staffProjectileSpeed;

                    const spawnOffsetX = Math.cos(currentShotAngle) * (playerRenderWidth / 2 + STAFF_VISUAL_LENGTH * 0.5);
                    const spawnOffsetY = Math.sin(currentShotAngle) * (playerRenderHeight / 2 + STAFF_VISUAL_LENGTH * 0.5);

                    const newProjectile: ProjectileState = {
                        id: uuidv4(),
                        x: playerCenterX + spawnOffsetX - projWidth / 2,
                        y: playerCenterY + spawnOffsetY - projHeight / 2,
                        width: projWidth,
                        height: projHeight,
                        damage: damageDealt / shotCount, 
                        dx: dx,
                        dy: dy,
                        isPlayerProjectile: true,
                        durability: player.projectileDurability,
                        color: player.activeStaff.projectileColor || '#FFFF00',
                        visualType: player.activeStaff.projectileVisualType || 'square',
                        spawnTime: currentTime,
                        angle: currentShotAngle, 
                    };
                    tempPlayerProjectiles.push(newProjectile);
                }
                projectiles = tempPlayerProjectiles;
                newLastShotTime = currentTime;
            }
            lastShotTime = newLastShotTime;

            // Update enemies & Enemy AI
            let updatedEnemies = enemies.map(e => {
                let currentEnemyState = {...e};
                let newY = currentEnemyState.y;
                let newX = currentEnemyState.x;
                let currentHorizontalSpeed = currentEnemyState.horizontalSpeed;
                let currentHorizontalDirection = currentEnemyState.horizontalDirection;
                const enemyTypeDefinition = ENEMY_TYPES[currentEnemyState.type];

                // Cold effect decay
                if (currentEnemyState.slowFactor > 0 && currentTime - currentEnemyState.lastSlowedTime > COLD_EFFECT_DURATION) {
                    currentEnemyState.slowFactor = Math.max(0, currentEnemyState.slowFactor - 0.1); 
                    currentEnemyState.lastSlowedTime = currentTime; 
                }
                const actualEnemySpeedMultiplier = (1 - currentEnemyState.slowFactor);


                if (currentEnemyState.bleeding) {
                    if (currentTime - currentEnemyState.bleeding.lastTickTime >= BLEED_TICK_INTERVAL) {
                        const bleedDamageToApply = currentEnemyState.bleeding.dps;
                        currentEnemyState.hp -= bleedDamageToApply;
                        currentEnemyState.bleeding.lastTickTime = currentTime;
                        currentEnemyState.bleeding.durationRemaining -= BLEED_TICK_INTERVAL;
                        newParticleEffectsList.push({ id: uuidv4(), x: currentEnemyState.x + currentEnemyState.width / 2, y: currentEnemyState.y + currentEnemyState.height / 2, type: 'bleed_tick', creationTime: currentTime, duration: 300, size: currentEnemyState.width * 0.3, color: BLEED_PARTICLE_COLOR, particleCount: 2, particleSpeed: 0.5, particleShape: 'circle'});
                        
                        // Freezer insta-kill check from bleed
                         if (currentEnemyState.hp > 0 && (player.instaKillOnMaxSlowChance || 0) > 0 && currentEnemyState.slowFactor >= (player.coldMaxSlow || 0) && (player.coldMaxSlow || 0) === 1.0) {
                            if (Math.random() < (player.instaKillOnMaxSlowChance || 0)) {
                                currentEnemyState.hp = 0; // Insta-kill
                            }
                        }
                    }
                    if (currentEnemyState.bleeding.durationRemaining <= 0) {
                        currentEnemyState.bleeding = undefined;
                    }
                }


                if (!currentEnemyState.reachedTargetY) {
                    newY = currentEnemyState.y + currentEnemyState.speed * actualEnemySpeedMultiplier;
                    if (newY >= currentEnemyState.targetY!) {
                        newY = currentEnemyState.targetY!;
                        currentEnemyState.reachedTargetY = true;
                        currentHorizontalSpeed = enemyTypeDefinition.baseSpeed * (enemyTypeDefinition.id === ENEMY_TYPES.shooter_basic.id ? SHOOTER_PATROL_SPEED_MULTIPLIER : 1);
                        currentHorizontalDirection = Math.random() < 0.5 ? 1 : -1;
                    }
                } else { 
                    const dxToPlayer = playerCenterX - (currentEnemyState.x + currentEnemyState.width / 2);
                    const dyToPlayer = playerCenterY - (currentEnemyState.y + currentEnemyState.height / 2);
                    const distanceToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dyToPlayer * dyToPlayer);

                    if (currentEnemyState.type === ENEMY_TYPES.grunt_tough.id) {
                        if (distanceToPlayer < GRUNT_TOUGH_AGGRO_RANGE && Math.abs(dyToPlayer) < currentEnemyState.height * 2.5) {
                            currentHorizontalDirection = dxToPlayer > 0 ? 1 : -1;
                            currentHorizontalSpeed = enemyTypeDefinition.baseSpeed * GRUNT_TOUGH_AGGRO_SPEED_MULTIPLIER;
                        } else {
                             currentHorizontalSpeed = enemyTypeDefinition.baseSpeed; 
                             if(currentTime - (currentEnemyState.lastAttackTime || 0) > 2000 && Math.random() < 0.01) { 
                                currentHorizontalDirection = Math.random() < 0.5 ? 1 : -1;
                                currentEnemyState.lastAttackTime = currentTime; 
                             }
                        }
                    } else if (currentEnemyState.type === ENEMY_TYPES.shooter_basic.id) {
                        if (distanceToPlayer < SHOOTER_ATTACK_RANGE) {
                            currentHorizontalSpeed = enemyTypeDefinition.baseSpeed * SHOOTER_ATTACKING_SPEED_MULTIPLIER; 
                        } else {
                            currentHorizontalSpeed = enemyTypeDefinition.baseSpeed * SHOOTER_PATROL_SPEED_MULTIPLIER; 
                             if(currentTime - (currentEnemyState.lastAttackTime || 0) > 3000 && Math.random() < 0.02) { 
                                currentHorizontalDirection = Math.random() < 0.5 ? 1 : -1;
                                currentEnemyState.lastAttackTime = currentTime; 
                             }
                        }
                        
                        if (enemyTypeDefinition.attackCooldown && distanceToPlayer < SHOOTER_ATTACK_RANGE && currentTime - (currentEnemyState.lastAttackTime || 0) > enemyTypeDefinition.attackCooldown) {
                            const angleToPlayer = Math.atan2(dyToPlayer, dxToPlayer);
                            const projSpeed = enemyTypeDefinition.projectileSpeed || 3;
                            newProjectilesFromGame.push({
                                id: uuidv4(),
                                x: currentEnemyState.x + currentEnemyState.width / 2 - ENEMY_PROJECTILE_SIZE / 2,
                                y: currentEnemyState.y + currentEnemyState.height / 2 - ENEMY_PROJECTILE_SIZE / 2,
                                width: ENEMY_PROJECTILE_SIZE,
                                height: ENEMY_PROJECTILE_SIZE,
                                damage: currentEnemyState.damage,
                                dx: Math.cos(angleToPlayer) * projSpeed,
                                dy: Math.sin(angleToPlayer) * projSpeed,
                                isPlayerProjectile: false,
                                durability: 1,
                                color: ENEMY_PROJECTILE_COLOR,
                                visualType: ENEMY_PROJECTILE_VISUAL_TYPE,
                                spawnTime: currentTime,
                                angle: angleToPlayer,
                            });
                            currentEnemyState.lastAttackTime = currentTime;
                        }

                    } else { 
                        currentHorizontalSpeed = enemyTypeDefinition.baseSpeed;
                        if(currentTime - (currentEnemyState.lastAttackTime || 0) > (2500 + Math.random()*1000) && Math.random() < 0.05) { 
                           currentHorizontalDirection = Math.random() < 0.5 ? 1 : -1;
                           currentEnemyState.lastAttackTime = currentTime; 
                        }
                    }
                    
                    newX = currentEnemyState.x + (currentHorizontalSpeed! * currentHorizontalDirection! * actualEnemySpeedMultiplier);
                    if (newX <= 0) {
                        newX = 0;
                        currentHorizontalDirection = 1;
                    } else if (newX + currentEnemyState.width >= GAME_WIDTH) {
                        newX = GAME_WIDTH - currentEnemyState.width;
                        currentHorizontalDirection = -1;
                    }
                }
                return { ...currentEnemyState, y: newY, x: newX, horizontalSpeed: currentHorizontalSpeed, horizontalDirection: currentHorizontalDirection };
            }).filter(e => e.y < GAME_HEIGHT + e.height && e.hp > 0); 
            enemies = updatedEnemies;
            
            projectiles = [...projectiles, ...newProjectilesFromGame];
            newProjectilesFromGame = []; // Reset


            // Projectile movement (all projectiles)
            projectiles = projectiles.map(p => ({
                ...p,
                x: p.x + p.dx,
                y: p.y + p.dy,
            })).filter(p => p.x > -p.width - 50 && p.x < GAME_WIDTH + 50 && p.y > -p.height - 50 && p.y < GAME_HEIGHT + 50); 

            // Spawn enemies
            let newLastEnemySpawnTime = lastEnemySpawnTime;
            const maxEnemies = MAX_ENEMIES_ON_SCREEN_BASE + (player.level -1) * MAX_ENEMIES_ON_SCREEN_PER_LEVEL;
            const spawnInterval = ENEMY_SPAWN_INTERVAL_MAX - (player.level * 50); 
            if (enemies.length < maxEnemies && currentTime - newLastEnemySpawnTime > Math.max(ENEMY_SPAWN_INTERVAL_MIN, spawnInterval) ) {
                const enemyTypeList = Object.values(ENEMY_TYPES);
                const randomType = enemyTypeList[Math.floor(Math.random() * enemyTypeList.length)];
                
                const scale = player.level -1;
                const enemyHp = Math.floor(randomType.baseHp * Math.pow(ENEMY_HP_SCALING_PER_LEVEL, scale));
                const enemyDamage = Math.floor(randomType.baseDamage * Math.pow(ENEMY_DAMAGE_SCALING_PER_LEVEL, scale));
                
                let currentEnemies = [...enemies];
                currentEnemies.push({
                    id: uuidv4(),
                    x: Math.random() * (GAME_WIDTH - randomType.width),
                    y: -randomType.height - Math.random() * 50,
                    width: randomType.width,
                    height: randomType.height,
                    hp: enemyHp,
                    maxHp: enemyHp,
                    type: randomType.id,
                    speed: randomType.baseSpeed + (scale * 0.05 * randomType.baseSpeed), 
                    damage: enemyDamage,
                    color: randomType.color,
                    targetY: (GAME_HEIGHT * ENEMY_MAX_DEPTH_FACTOR * 0.8) - randomType.height - (Math.random() * GAME_HEIGHT * 0.25), 
                    reachedTargetY: false,
                    lastAttackTime: 0,
                    slowFactor: 0, 
                    lastSlowedTime: 0,
                });
                enemies = currentEnemies;
                newLastEnemySpawnTime = currentTime;
            }
            lastEnemySpawnTime = newLastEnemySpawnTime;
            
            // Collision: Player Projectiles vs Enemies
            let remainingPlayerProjectiles: ProjectileState[] = [];
            let currentScore = score;
            let currentExp = player.exp;

            for (const proj of projectiles) {
                if (!proj.isPlayerProjectile) { 
                    remainingPlayerProjectiles.push(proj); 
                    continue; 
                }
                let projHitSomething = false;
                
                let filteredEnemies = [];
                for (const enemy of enemies) {
                    if (proj.x < enemy.x + enemy.width && proj.x + proj.width > enemy.x &&
                        proj.y < enemy.y + enemy.height && proj.y + proj.height > enemy.y) {
                        
                        enemy.hp -= proj.damage; 
                        projHitSomething = true;
                        
                        if (player.appliesBleed && player.bleedDps && player.bleedDuration) {
                            enemy.bleeding = {
                                dps: player.bleedDps,
                                durationRemaining: player.bleedDuration,
                                lastTickTime: currentTime,
                            };
                        }
                        // Apply Cold effect
                        if (player.appliesCold && enemy.slowFactor < (player.coldMaxSlow || COLD_MAX_SLOW_BASE)) {
                            enemy.slowFactor = Math.min((player.coldMaxSlow || COLD_MAX_SLOW_BASE), enemy.slowFactor + (player.coldSlowFactor || COLD_SLOW_FACTOR_BASE));
                            enemy.lastSlowedTime = currentTime;
                            newParticleEffectsList.push({ id: uuidv4(), x: proj.x + proj.width/2, y: proj.y + proj.height/2, type: 'cold_hit', creationTime: currentTime, duration: 200, size: enemy.width * 0.3, color: COLD_HIT_COLOR, particleCount: 3 });
                        }
                        // Freezer insta-kill check from projectile
                        if (enemy.hp > 0 && (player.instaKillOnMaxSlowChance || 0) > 0 && enemy.slowFactor >= (player.coldMaxSlow || 0) && (player.coldMaxSlow || 0) === 1.0) {
                            if (Math.random() < (player.instaKillOnMaxSlowChance || 0)) {
                                enemy.hp = 0; // Insta-kill
                            }
                        }


                        newParticleEffectsList.push({ id: uuidv4(), x: proj.x + proj.width/2, y: proj.y + proj.height/2, type: 'hit_spark', creationTime: currentTime, duration: 150, size: 3, color: proj.color, particleCount: 3, particleSpeed: 2, particleShape: proj.visualType === 'circle' ? 'circle' : proj.visualType === 'spark' ? 'spark' : 'square'});

                        if (player.lifesteal > 0) {
                            player.currentHp = Math.min(player.maxHp, player.currentHp + proj.damage * player.lifesteal);
                        }

                        if (enemy.hp <= 0) {
                            const enemyDef = ENEMY_TYPES[enemy.type];
                            currentScore += enemyDef?.points || 5;
                            const expGained = Math.floor((enemyDef?.expValue || 5) * Math.pow(ENEMY_EXP_SCALING_PER_LEVEL, player.level -1));
                            currentExp += expGained;

                            newParticleEffectsList.push({ id: uuidv4(), x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2, type: 'explosion', creationTime: currentTime, duration: 300, size: enemy.width * 0.5, color: '#FFA500', particleCount: 10 + Math.min(5, Math.floor(enemy.width/5)), particleSpeed: 3, particleShape: 'square'});
                            
                            // Fragmentation Logic
                            if (player.hasFragmentation && player.fragmentationCount) {
                                newParticleEffectsList.push({id: uuidv4(), x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, type: 'fragment_spawn', creationTime: currentTime, duration: 250, size: enemy.width * 0.4, color: FRAGMENT_SPAWN_COLOR, particleCount: player.fragmentationCount / 2 });
                                for (let i = 0; i < player.fragmentationCount; i++) {
                                    const angle = Math.random() * Math.PI * 2;
                                    const fragSpeed = FRAGMENTATION_PROJECTILE_SPEED;
                                    const fragSize = (5 * player.projectileSize) * FRAGMENTATION_PROJECTILE_SIZE_MULTIPLIER;
                                    newProjectilesFromGame.push({
                                        id: uuidv4(),
                                        x: enemy.x + enemy.width / 2 - fragSize / 2,
                                        y: enemy.y + enemy.height / 2 - fragSize / 2,
                                        width: fragSize,
                                        height: fragSize,
                                        damage: player.damage * (player.fragmentationDamageMultiplier || FRAGMENTATION_DAMAGE_MULTIPLIER_BASE),
                                        dx: Math.cos(angle) * fragSpeed,
                                        dy: Math.sin(angle) * fragSpeed,
                                        isPlayerProjectile: true,
                                        durability: 1,
                                        color: player.activeStaff.projectileColor || '#FFFF00', 
                                        visualType: 'spark',
                                        spawnTime: currentTime,
                                        isFragment: true,
                                    });
                                }
                            }

                        } else {
                            filteredEnemies.push(enemy);
                        }
                    } else {
                        filteredEnemies.push(enemy);
                    }
                }
                enemies = filteredEnemies;

                if (!projHitSomething || proj.durability > 1) {
                    if(projHitSomething) proj.durability -=1; 
                    remainingPlayerProjectiles.push(proj);
                }
            }
            projectiles = [...remainingPlayerProjectiles, ...newProjectilesFromGame]; 
            score = currentScore;
            player.exp = currentExp;
            newProjectilesFromGame = []; // Clear for next potential sources within the same tick

            // Collision: Enemy Projectiles vs Player & Enemies vs Player (Contact)
            let finalProjectilesAfterPlayerHit: ProjectileState[] = [];
            let oldBarrierHits = player.barrierHitsRemaining || 0; // Store before processing hits

            for (const proj of projectiles) {
                if (!proj.isPlayerProjectile) { // Only enemy projectiles
                    if (player.x < proj.x + proj.width && player.x + playerRenderWidth > proj.x &&
                        player.y < proj.y + proj.height && player.y + playerRenderHeight > proj.y) {
                        
                        let damageBlockedByBarrier = false;
                        if (player.hasBarrier && (player.barrierHitsRemaining || 0) > 0) {
                            player.barrierHitsRemaining = (player.barrierHitsRemaining || 0) - 1;
                            damageBlockedByBarrier = true;
                            newParticleEffectsList.push({ id: uuidv4(), x: playerCenterX, y: playerCenterY, type: 'hit_spark', creationTime: currentTime, duration: 250, size: playerRenderWidth * 0.5, color: BARRIER_ACTIVE_COLOR, particleCount: 5 });
                        }

                        if (!damageBlockedByBarrier && !player.isInvulnerable) {
                            const damageTaken = Math.max(1, proj.damage * (1 - player.defense));
                            player.currentHp -= damageTaken;
                            player.isInvulnerable = true;
                            let invulnDuration = 500; 
                            if (player.chosenCards['cloak_uncommon']) { 
                                 invulnDuration += player.chosenCards['cloak_uncommon'] * 200; 
                            }
                            player.invulnerabilityEndTime = currentTime + invulnDuration;
                             newParticleEffectsList.push({ id: uuidv4(), x: playerCenterX, y: playerCenterY, type: 'hit_spark', creationTime: currentTime, duration: 250, size: playerRenderWidth * 0.6, color: '#FFFFFF', particleCount: 5, particleSpeed: 1.5, particleShape: 'circle'});
                        }
                        // Projectile is consumed
                    } else {
                        finalProjectilesAfterPlayerHit.push(proj); 
                    }
                } else {
                     finalProjectilesAfterPlayerHit.push(proj); 
                }
            }
            projectiles = finalProjectilesAfterPlayerHit;


            enemies.forEach(enemy => {
                if (player.x < enemy.x + enemy.width && player.x + playerRenderWidth > enemy.x &&
                    player.y < enemy.y + enemy.height && player.y + playerRenderHeight > enemy.y) {
                    
                    let damageBlockedByBarrier = false;
                    if (player.hasBarrier && (player.barrierHitsRemaining || 0) > 0) {
                        player.barrierHitsRemaining = (player.barrierHitsRemaining || 0) - 1;
                        damageBlockedByBarrier = true;
                        newParticleEffectsList.push({ id: uuidv4(), x: playerCenterX, y: playerCenterY, type: 'hit_spark', creationTime: currentTime, duration: 250, size: playerRenderWidth * 0.5, color: BARRIER_ACTIVE_COLOR, particleCount: 5 });
                    }

                    if (!damageBlockedByBarrier && !player.isInvulnerable) {
                         let contactDamage = enemy.damage;
                         if (player.hasRageActive && player.currentHp < player.maxHp * 0.5) {
                            const hpPercentageBelowThreshold = 1 - (player.currentHp / (player.maxHp * 0.5));
                            const rageMultiplier = 1 + (0.5 * hpPercentageBelowThreshold); 
                            contactDamage *= rageMultiplier; 
                        }
                        const damageTaken = Math.max(1, contactDamage * (1 - player.defense));
                        player.currentHp -= damageTaken;
                        player.isInvulnerable = true;
                        let invulnDuration = 500; 
                        if (player.chosenCards['cloak_uncommon']) { 
                             invulnDuration += player.chosenCards['cloak_uncommon'] * 200; 
                        }
                        player.invulnerabilityEndTime = currentTime + invulnDuration;
                        newParticleEffectsList.push({ id: uuidv4(), x: playerCenterX, y: playerCenterY, type: 'hit_spark', creationTime: currentTime, duration: 250, size: playerRenderWidth * 0.7, color: '#FFDDDD', particleCount: 7, particleSpeed: 1.8, particleShape: 'square'});
                    }
                }
            });

            // Protector Ascension Logic (Barrier Break)
            if (oldBarrierHits > 0 && (player.barrierHitsRemaining || 0) === 0 && (player.barrierBreakProjectileCount || 0) > 0) {
                player.lastBarrierActivationTime = currentTime; // Start cooldown
                const breakCount = player.barrierBreakProjectileCount || 0;
                const breakDamageMultiplier = player.barrierBreakProjectileDamageMultiplier || 0;
                const projBaseSize = 5; 
                const projWidth = projBaseSize * player.projectileSize; // Use player's current proj size
                const projHeight = projBaseSize * player.projectileSize;
                const staffProjectileSpeed = player.activeStaff.projectileBaseSpeed || 10;

                for (let i = 0; i < breakCount; i++) {
                    const angle = (i / breakCount) * Math.PI * 2;
                    const dx = Math.cos(angle) * staffProjectileSpeed;
                    const dy = Math.sin(angle) * staffProjectileSpeed;
                    newProjectilesFromGame.push({
                        id: uuidv4(),
                        x: playerCenterX - projWidth / 2,
                        y: playerCenterY - projHeight / 2,
                        width: projWidth,
                        height: projHeight,
                        damage: player.damage * breakDamageMultiplier, // Base player damage * multiplier
                        dx,
                        dy,
                        isPlayerProjectile: true,
                        durability: 1, // Protector projectiles durability
                        color: player.activeStaff.projectileColor || '#00FFFF', // Use staff color or cyan
                        visualType: player.activeStaff.projectileVisualType || 'spark',
                        spawnTime: currentTime,
                        angle: angle,
                    });
                }
                 projectiles = [...projectiles, ...newProjectilesFromGame];
                 newProjectilesFromGame = []; // Clear again
            }

            
            particleEffects = newParticleEffectsList.filter(p => currentTime < p.creationTime + p.duration);
            let offered: CardDefinition[] = state.offeredCards; 

            if (player.exp >= player.expToNextLevel) {
                player.level += 1;
                player.exp -= player.expToNextLevel; 
                player.expToNextLevel = Math.floor(BASE_EXP_TO_NEXT_LEVEL * Math.pow(EXP_PER_LEVEL_SCALER, player.level -1));
                player.currentHp = player.maxHp; 
                newStatus = 'CARD_SELECTION';
                
                particleEffects.push({ id: uuidv4(), x: player.x + playerRenderWidth/2, y: player.y + playerRenderHeight/2, type: 'level_up', creationTime: currentTime, duration: 1000, size: playerRenderWidth*1.5, color: '#FFFF00', particleCount: 20, particleSpeed: 2, particleShape: 'circle'});

                const newOfferedCards: CardDefinition[] = [];
                const availableCards = [...ALL_CARDS_POOL.filter(c => {
                    const stackCount = player.chosenCards[c.id] || 0;
                    return !c.maxStacks || stackCount < c.maxStacks;
                })];
                
                STAFFS.forEach(staffDef => {
                    if (staffDef.unlockLevel && player.level >= staffDef.unlockLevel && !player.unlockedStaffIds.has(staffDef.id)) {
                        const staffUnlockCard: CardDefinition = {
                            id: `unlock_${staffDef.id}`,
                            name: `Unlock: ${staffDef.name}`,
                            description: staffDef.description,
                            rarity: CardRarity.SPECIAL,
                            effects: [], 
                            cardType: 'staff_unlock',
                            staffToUnlockId: staffDef.id,
                        };
                        if (!newOfferedCards.find(o => o.id === staffUnlockCard.id) && !availableCards.find(ac => ac.id === staffUnlockCard.id)) { 
                           availableCards.push(staffUnlockCard); 
                        }
                    }
                });
                
                const numChoices = CARD_CHOICES_COUNT + player.appraisalStacks;

                const potentialEpics = availableCards.filter(c => c.rarity === CardRarity.EPIC || c.rarity === CardRarity.SPECIAL);
                if (potentialEpics.length > 0 && Math.random() < 0.25 + (player.level * 0.01) ) { 
                     const epicCard = potentialEpics.splice(Math.floor(Math.random() * potentialEpics.length), 1)[0];
                     newOfferedCards.push(epicCard);
                     const idxInAvailable = availableCards.findIndex(c => c.id === epicCard.id);
                     if (idxInAvailable > -1) availableCards.splice(idxInAvailable, 1);
                }

                while (newOfferedCards.length < numChoices && availableCards.length > 0) {
                    const randomIndex = Math.floor(Math.random() * availableCards.length);
                    const candidateCard = availableCards.splice(randomIndex, 1)[0];
                    if (!newOfferedCards.find(o => o.id === candidateCard.id)) { 
                        newOfferedCards.push(candidateCard);
                    }
                }
                
                 if (newOfferedCards.length === 0 && availableCards.length > 0 && numChoices > 0) { 
                    newOfferedCards.push(availableCards.splice(Math.floor(Math.random() * availableCards.length), 1)[0]);
                 }
                 offered = newOfferedCards; 
            }

            if (player.currentHp <= 0) {
                newStatus = 'GAME_OVER';
            }
            
            const playerForNextState = { ...player };

            return { 
                ...state, 
                status: newStatus, 
                player: playerForNextState, 
                enemies, 
                projectiles, 
                score, 
                gameTime: newGameTime, 
                lastShotTime, 
                particleEffects, 
                lastEnemySpawnTime, 
                activeCardIcons, 
                mousePosition: currentMousePosition,
                offeredCards: offered 
            };
        }
        default:
            return state;
    }
}


const App: React.FC = () => {
    const initialHat = HATS.find(h => h.id === PLAYER_INITIAL_HAT_ID) || HATS[0];
    const initialPlayerState = initializePlayer(initialHat);
    const gameContainerRef = useRef<HTMLDivElement>(null);
    const mousePositionRef = useRef<{ x: number, y: number }>({ x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 });


    const [gameState, dispatch] = useReducer(gameReducer, {
        status: 'START_SCREEN',
        player: initialPlayerState,
        enemies: [],
        projectiles: [],
        score: 0,
        gameTime: 0,
        lastShotTime: 0,
        offeredCards: [],
        keysPressed: new Set<string>(),
        particleEffects: [],
        lastEnemySpawnTime: 0,
        activeCardIcons: [],
        mousePosition: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2},
    });
    
    const { status, player, enemies, projectiles, score, offeredCards, particleEffects, activeCardIcons } = gameState; 
    const [localKeysPressed, setLocalKeysPressed] = useState<Set<string>>(new Set());

    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        setLocalKeysPressed(prev => new Set(prev).add(event.key.toLowerCase()));
         if (event.key.toLowerCase() === 'escape') {
            if (gameState.status === 'PLAYING') dispatch({ type: 'PAUSE_GAME' });
            else if (gameState.status === 'PAUSED') dispatch({ type: 'RESUME_GAME' });
        }
    }, [gameState.status]); 

    const handleKeyUp = useCallback((event: KeyboardEvent) => {
        setLocalKeysPressed(prev => {
            const next = new Set(prev);
            next.delete(event.key.toLowerCase());
            return next;
        });
    }, []);

    const handleMouseMove = useCallback((event: MouseEvent) => {
        if (gameContainerRef.current) {
            const rect = gameContainerRef.current.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            mousePositionRef.current = { x: Math.max(0, Math.min(x, GAME_WIDTH)), y: Math.max(0, Math.min(y, GAME_HEIGHT)) };
        }
    }, []); 


    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        
        const gameArea = gameContainerRef.current;
        if (gameArea) {
            gameArea.addEventListener('mousemove', handleMouseMove);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            if (gameArea) {
                gameArea.removeEventListener('mousemove', handleMouseMove);
            }
        };
    }, [handleKeyDown, handleKeyUp, handleMouseMove]);

    useEffect(() => {
        if (status === 'PLAYING') {
            const gameLoop = setInterval(() => {
                dispatch({ type: 'GAME_TICK', payload: { keysPressed: localKeysPressed, deltaTime: 16, mousePosition: mousePositionRef.current } });
            }, 16); 
            return () => clearInterval(gameLoop);
        }
    }, [status, localKeysPressed, dispatch]); 

    const startGame = (hat: HatDefinition) => {
        dispatch({ type: 'START_GAME', payload: { hat } });
    };
    const selectCard = (card: CardDefinition) => dispatch({ type: 'SELECT_CARD', payload: card });
    const restartGame = () => dispatch({ type: 'RESTART_GAME' });
    const handlePause = () => dispatch({ type: 'PAUSE_GAME' });
    const handleResume = () => dispatch({ type: 'RESUME_GAME' });
    const handleMainMenu = () => dispatch({ type: 'MAIN_MENU' });

    const renderTerrain = () => {
      return TERRAIN_BLOCKS.map((block, index) => (
        <div key={`terrain-${index}`} style={{
          position: 'absolute',
          left: block.x,
          top: block.y,
          width: block.width,
          height: block.height,
          border: '2px solid white', 
          boxSizing: 'border-box',
          backgroundColor: '#000000', 
          zIndex: 1, 
        }}></div>
      ));
    };
    
    const renderParticle = (p: ParticleEffect) => {
        const elapsed = (Date.now() - p.creationTime);
        const progress = Math.min(1, elapsed / p.duration); // Ensure progress doesn't exceed 1
        let currentSize = p.size;
        let opacity = 0.7;
        const particlesArray: JSX.Element[] = [];

        if (p.type === 'thunderbolt_impact') {
            const boltWidth = 4 + Math.random() * 2; // Slight flicker in width
            const strikeDownProgress = Math.min(1, progress / 0.15); // Bolt strikes in first 15% of duration
            const actualBoltHeight = p.y * strikeDownProgress;
            const boltOpacity = 1 - progress; // Fades out over full duration

            // Bolt Shaft
            particlesArray.push(
                <div key={`${p.id}-shaft`} style={{
                    position: 'absolute',
                    left: p.x - boltWidth / 2,
                    top: p.y - actualBoltHeight, // Starts from impact point and grows upwards (effectively striking down)
                    width: boltWidth,
                    height: actualBoltHeight,
                    backgroundColor: p.color,
                    opacity: Math.max(0, boltOpacity * (strikeDownProgress < 1 ? 0.7 : 1)), // Flicker effect during strike
                    zIndex: 15,
                }}></div>
            );

            // Ground Flash
            const flashProgress = Math.min(1, progress / 0.5); // Flash expands/contracts in first 50%
            let flashRadius = p.size;
            if (flashProgress < 0.5) { // Expand
                flashRadius = p.size * (flashProgress / 0.5);
            } else { // Contract
                flashRadius = p.size * (1 - (flashProgress - 0.5) / 0.5);
            }
            const flashOpacity = 0.9 * (1 - progress); // Fades over full duration

            if (flashRadius > 0) {
                particlesArray.push(
                    <div key={`${p.id}-flash`} style={{
                        position: 'absolute',
                        left: p.x - flashRadius,
                        top: p.y - flashRadius,
                        width: flashRadius * 2,
                        height: flashRadius * 2,
                        backgroundColor: 'white', // Bright white flash
                        borderRadius: '50%',
                        opacity: Math.max(0, flashOpacity),
                        transform: 'scale(1)', // No additional scaling needed here
                        zIndex: 16, // Above shaft
                    }}></div>
                );
            }
        } else if (p.type === 'explosion' || p.type === 'fragment_spawn') {
            currentSize = p.size * (progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7); 
            opacity = 1 - progress;
            const count = p.particleCount || 1;
            for(let i=0; i < count; i++) {
                const actualProgress = Math.max(0.01, progress);
                const particleSpeedFactor = p.particleSpeed || 1;
                let offsetX = 0;
                let offsetY = 0;
                if (!p.fixedPosition) { 
                    offsetX = (Math.random() - 0.5) * p.size * particleSpeedFactor * actualProgress * 2;
                    offsetY = (Math.random() - 0.5) * p.size * particleSpeedFactor * actualProgress * 2;
                }
                particlesArray.push(
                    <div key={`${p.id}-${i}`} className={`absolute`} style={{ 
                        left: p.x + offsetX - currentSize/2,
                        top: p.y + offsetY - currentSize/2,
                        width: currentSize,
                        height: currentSize,
                        backgroundColor: p.color,
                        borderRadius: p.particleShape === 'circle' ? '50%' : p.particleShape === 'spark' ? '2px' : '0%', 
                        opacity: Math.max(0, opacity),
                        transform: `scale(${Math.max(0.01, currentSize / p.size)})`, 
                        zIndex: 15,
                    }}></div>
                );
            }
        } else if (p.type === 'hit_spark' || p.type === 'bleed_tick' || p.type === 'cold_hit') {
            currentSize = p.size * (1 - progress); 
            opacity = 0.8 - progress * 0.8;
             const count = p.particleCount || 1;
            for(let i=0; i < count; i++) {
                const actualProgress = Math.max(0.01, progress);
                const particleSpeedFactor = p.particleSpeed || 1;
                let offsetX = 0;
                let offsetY = 0;
                if (!p.fixedPosition) { 
                    offsetX = (Math.random() - 0.5) * p.size * particleSpeedFactor * actualProgress * 2;
                    offsetY = (Math.random() - 0.5) * p.size * particleSpeedFactor * actualProgress * 2;
                }
                particlesArray.push(
                    <div key={`${p.id}-${i}`} className={`absolute`} style={{ 
                        left: p.x + offsetX - currentSize/2,
                        top: p.y + offsetY - currentSize/2,
                        width: currentSize,
                        height: currentSize,
                        backgroundColor: p.color,
                        borderRadius: p.particleShape === 'circle' ? '50%' : p.particleShape === 'spark' ? '2px' : '0%', 
                        opacity: Math.max(0, opacity),
                        transform: `scale(${Math.max(0.01, currentSize / p.size)})`, 
                        zIndex: 15,
                    }}></div>
                );
            }
        } else if (p.type === 'level_up') {
            currentSize = p.size * (progress < 0.5 ? progress / 0.5 : 1); 
            opacity = 1 - progress;
            const count = p.particleCount || 1;
            for(let i=0; i < count; i++) {
                const actualProgress = Math.max(0.01, progress);
                const particleSpeedFactor = p.particleSpeed || 1;
                let offsetX = 0;
                let offsetY = 0;
                if (!p.fixedPosition) { 
                    offsetX = (Math.random() - 0.5) * p.size * particleSpeedFactor * actualProgress * 2;
                    offsetY = (Math.random() - 0.5) * p.size * particleSpeedFactor * actualProgress * 2;
                }
                particlesArray.push(
                    <div key={`${p.id}-${i}`} className={`absolute`} style={{ 
                        left: p.x + offsetX - currentSize/2,
                        top: p.y + offsetY - currentSize/2,
                        width: currentSize,
                        height: currentSize,
                        backgroundColor: p.color,
                        borderRadius: p.particleShape === 'circle' ? '50%' : p.particleShape === 'spark' ? '2px' : '0%', 
                        opacity: Math.max(0, opacity),
                        transform: `scale(${Math.max(0.01, currentSize / p.size)})`, 
                        zIndex: 15,
                    }}></div>
                );
            }
        } else if (p.type === 'barrier_active') {
             currentSize = p.size; 
             opacity = 0.3 + Math.sin(progress * Math.PI * 4) * 0.15; // Pulsating barrier
             particlesArray.push(
                <div key={`${p.id}-0`} style={{ 
                    left: p.x - currentSize/2,
                    top: p.y - currentSize/2,
                    width: currentSize,
                    height: currentSize,
                    backgroundColor: p.color,
                    borderRadius: '50%', 
                    opacity: Math.max(0, opacity),
                    zIndex: 15,
                    border: `2px solid ${p.color}`, // Make barrier more visually distinct
                    boxSizing: 'border-box',
                    mixBlendMode: 'screen', // Brighter effect
                }}></div>
            );
        } else if (p.type === 'ascension_activate') {
            currentSize = p.size * (0.3 + progress * 0.7); 
            opacity = 1 - Math.pow(progress, 2); 
            particlesArray.push(
                <div key={`${p.id}-0`} style={{ 
                    left: p.x - currentSize/2,
                    top: p.y - currentSize/2,
                    width: currentSize,
                    height: currentSize,
                    backgroundColor: p.color,
                    borderRadius: '50%', 
                    opacity: Math.max(0, opacity),
                    zIndex: 15,
                }}></div>
            );
        }
        
        return particlesArray;
    };


    return (
        <div className="w-full h-full flex items-center justify-center bg-black">
            {status === 'START_SCREEN' && <StartScreen onStartGame={startGame} />}
            
            {(status !== 'START_SCREEN') && (
                <div ref={gameContainerRef} className="game-container" style={{ width: GAME_WIDTH, height: GAME_HEIGHT, cursor: 'crosshair' }}>
                    {renderTerrain()}
                    <UIOverlay player={player} score={score} activeCardIcons={activeCardIcons} onPause={handlePause} />
                    <PlayerComponent player={player} />
                    {enemies.map(enemy => <EnemyComponent key={enemy.id} enemy={enemy} />)}
                    {projectiles.map(proj => <ProjectileComponent key={proj.id} projectile={proj} />)}
                    {particleEffects.flatMap(renderParticle)}

                    {status === 'CARD_SELECTION' && <CardSelectionScreen cards={offeredCards} onSelectCard={selectCard} playerLevel={player.level} />}
                    {status === 'GAME_OVER' && <GameOverScreen score={score} level={player.level} onRestart={restartGame} />}
                    {status === 'PAUSED' && <PauseScreen onResume={handleResume} onMainMenu={handleMainMenu} />}
                </div>
            )}
        </div>
    );
};

export default App;
