
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
  PlayerState, EnemyState, ProjectileState, CardDefinition, GameStatus, HatDefinition, StaffDefinition, PlayerStats, EnemyType, FirearmType,
  GAME_WIDTH, GAME_HEIGHT, PLAYER_INITIAL_X, PLAYER_INITIAL_Y, PLAYER_WIDTH, PLAYER_HEIGHT, GRAVITY, GROUND_LEVEL, CardRarity, ParticleEffect, TerrainBlock, TERRAIN_BLOCKS, /* ENEMY_MAX_DEPTH_FACTOR, */ ProjectileVisualType, GameState
} from './types';
import {
    BASE_PLAYER_STATS, ALL_CARDS_POOL, ALL_ASCENSIONS, HATS, STAFFS, ENEMY_TYPES, CARD_CHOICES_COUNT,
    BASE_EXP_TO_NEXT_LEVEL, EXP_PER_LEVEL_SCALER, PLAYER_INITIAL_HAT_ID, PLAYER_INITIAL_STAFF_ID,
    ENEMY_SPAWN_INTERVAL_MIN, ENEMY_SPAWN_INTERVAL_MAX, MAX_ENEMIES_ON_SCREEN_BASE, MAX_ENEMIES_ON_SCREEN_PER_LEVEL,
    ENEMY_HP_SCALING_PER_LEVEL, ENEMY_DAMAGE_SCALING_PER_LEVEL, ENEMY_EXP_SCALING_PER_LEVEL, STAFF_VISUAL_LENGTH,
    BLEED_TICK_INTERVAL, BLEED_PARTICLE_COLOR,
    BARRIER_COOLDOWN_BASE, BARRIER_HITS_BASE, THUNDERBOLT_DAMAGE_BASE, THUNDERBOLT_INTERVAL_BASE, THUNDERBOLT_COUNT, THUNDERBOLT_RADIUS,
    FRAGMENTATION_COUNT_BASE, FRAGMENTATION_PROJECTILE_SPEED, FRAGMENTATION_PROJECTILE_SIZE_MULTIPLIER, FRAGMENTATION_DAMAGE_MULTIPLIER_BASE,
    COLD_SLOW_FACTOR_BASE, COLD_MAX_SLOW_BASE, COLD_EFFECT_DURATION,
    THUNDERBOLT_COLOR, BARRIER_ACTIVE_COLOR, COLD_HIT_COLOR, FRAGMENT_SPAWN_COLOR,
    ASCENSION_ACTIVATE_COLOR, PROTECTOR_PROJECTILE_COUNT_ASCENSION, PROTECTOR_PROJECTILE_DAMAGE_MULTIPLIER_ASCENSION,
    ELITE_SPAWN_CHANCE_BASE, ELITE_HP_MULTIPLIER, /* ELITE_DAMAGE_MULTIPLIER, */ ELITE_SIZE_MULTIPLIER, ELITE_AURA_COLOR,
    ENEMY_PROJECTILE_BASE_SIZE, ENEMY_PROJECTILE_DEFAULT_COLOR, ENEMY_PROJECTILE_DEFAULT_VISUAL_TYPE,
    MIN_ENEMY_SEPARATION_DISTANCE, MUZZLE_FLASH_COLOR, MUZZLE_FLASH_DURATION, MUZZLE_FLASH_SIZE, ENEMY_AIM_LEAD_FACTOR
} from './constants';
import { v4 as uuidv4 } from 'uuid';


const applyCardEffects = (currentStats: PlayerState, card: CardDefinition): PlayerState => {
  let newStats = { ...currentStats };

  if (card.cardType === 'staff_unlock' && card.staffToUnlockId) {
    const newStaff = STAFFS.find(s => s.id === card.staffToUnlockId);
    if (newStaff) {
        newStats.activeStaff = newStaff;
        newStats.unlockedStaffIds.add(newStaff.id);
        if (newStaff.effects) {
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

        if (isNaN(currentValue) && typeof baseValue === 'number') {
            currentValue = baseValue;
        } else if (isNaN(currentValue)) {
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
    id: 'player_1', // Added player ID
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
    playerSizeModifier: BASE_PLAYER_STATS.playerSizeModifier,
    hasRageActive: false,
    appliesBleed: BASE_PLAYER_STATS.appliesBleed,
    bleedDps: BASE_PLAYER_STATS.bleedDps,
    bleedDuration: BASE_PLAYER_STATS.bleedDuration,
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
    instaKillOnMaxSlowChance: BASE_PLAYER_STATS.instaKillOnMaxSlowChance,
    barrierBreakProjectileCount: BASE_PLAYER_STATS.barrierBreakProjectileCount,
    barrierBreakProjectileDamageMultiplier: BASE_PLAYER_STATS.barrierBreakProjectileDamageMultiplier,
  };

  hat.effects.forEach(effect => {
    player = applyCardEffects(player, { id: `hat_${hat.id}`, name: hat.name, description:'', rarity: CardRarity.COMMON, effects: [effect] });
  });

  if (initialStaff.effects) {
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

interface GameReducerState extends GameState { // GameState from types.ts now includes enemiesKilled
    keysPressed: Set<string>; // Still needed for internal reducer logic, not part of snapshot GameState
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
                enemiesKilled: 0, // Initialize enemiesKilled
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
                enemiesKilled: 0, // Reset enemiesKilled
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
                    const playerRenderWidth = PLAYER_WIDTH * newPlayerState.playerSizeModifier;
                    newParticleEffectsFromSelection.push({
                        id: uuidv4(),
                        x: newPlayerState.x + playerRenderWidth / 2,
                        y: newPlayerState.y + (PLAYER_HEIGHT * newPlayerState.playerSizeModifier) / 2,
                        type: 'ascension_activate',
                        creationTime: Date.now(),
                        duration: 800,
                        size: playerRenderWidth * 2,
                        color: ASCENSION_ACTIVATE_COLOR,
                        particleCount: 1,
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
            let { player, projectiles: currentProjectiles, score, gameTime, lastShotTime: playerLastShotTime, particleEffects, lastEnemySpawnTime, activeCardIcons, enemiesKilled } = { ...state };
            let currentTickEnemies = [...state.enemies]; 

            const currentTime = Date.now();
            let newGameTime = gameTime + 16; 

            let newStatus: GameStatus = state.status;
            let newEnemyProjectiles: ProjectileState[] = [];
            const newParticleEffectsList = [...particleEffects];

            const playerRenderWidth = PLAYER_WIDTH * player.playerSizeModifier;
            const playerRenderHeight = PLAYER_HEIGHT * player.playerSizeModifier;
            const playerCenterX = player.x + playerRenderWidth / 2;
            const playerCenterY = player.y + playerRenderHeight / 2;

            player.aimAngle = Math.atan2(currentMousePosition.y - playerCenterY, currentMousePosition.x - playerCenterX);
            player.facingDirection = Math.cos(player.aimAngle) >= 0 ? 'right' : 'left';

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

            if (player.hasBarrier) {
                if ((player.barrierHitsRemaining || 0) === 0 && currentTime - (player.lastBarrierActivationTime || 0) > (player.barrierCooldown || BARRIER_COOLDOWN_BASE)) {
                    const barrierCardStacks = player.chosenCards['barrier_epic_stage2'] || 0;
                    if (barrierCardStacks > 0) {
                         player.barrierHitsRemaining = barrierCardStacks * BARRIER_HITS_BASE;
                    } else if (player.activeAscensions.has('protector_ascension')) {
                         player.barrierHitsRemaining = BARRIER_HITS_BASE;
                    }
                }
                if ((player.barrierHitsRemaining || 0) > 0) {
                     newParticleEffectsList.push({ id: uuidv4(), x: playerCenterX, y: playerCenterY, type: 'barrier_active', creationTime: currentTime, duration: 50, size: playerRenderWidth * 1.5, color: BARRIER_ACTIVE_COLOR, particleCount: 1, fixedPosition: true, particleShape: 'circle'});
                }
            }

            if (player.triggersThunderbolts && currentTime - (player.lastThunderboltTime || 0) > (player.thunderboltInterval || THUNDERBOLT_INTERVAL_BASE)) {
                for (let i = 0; i < THUNDERBOLT_COUNT; i++) {
                    const targetX = currentTickEnemies.length > 0 ? currentTickEnemies[Math.floor(Math.random() * currentTickEnemies.length)].x + currentTickEnemies[Math.floor(Math.random() * currentTickEnemies.length)].width / 2 : Math.random() * GAME_WIDTH;
                    const targetY = currentTickEnemies.length > 0 ? currentTickEnemies[Math.floor(Math.random() * currentTickEnemies.length)].y + currentTickEnemies[Math.floor(Math.random() * currentTickEnemies.length)].height / 2 : Math.random() * (GAME_HEIGHT * 0.8);

                    newParticleEffectsList.push({
                        id: uuidv4(), x: targetX, y: targetY, type: 'thunderbolt_impact',
                        creationTime: currentTime, duration: 350, size: THUNDERBOLT_RADIUS,
                        color: THUNDERBOLT_COLOR, particleCount: 1, particleShape: 'circle'
                    });

                    currentTickEnemies.forEach(enemy => { 
                        if (enemy.hp <= 0) return; 

                        const distToBolt = Math.sqrt(Math.pow(enemy.x + enemy.width/2 - targetX, 2) + Math.pow(enemy.y + enemy.height/2 - targetY, 2));
                        if (distToBolt < THUNDERBOLT_RADIUS) {
                            const hpBeforeBolt = enemy.hp;
                            const boltDamage = (player.thunderboltDamage || THUNDERBOLT_DAMAGE_BASE);
                            enemy.hp -= boltDamage;

                            if (player.appliesCold && enemy.slowFactor < (player.coldMaxSlow || COLD_MAX_SLOW_BASE)) {
                                enemy.slowFactor = Math.min((player.coldMaxSlow || COLD_MAX_SLOW_BASE), enemy.slowFactor + (player.coldSlowFactor || COLD_SLOW_FACTOR_BASE));
                                enemy.lastSlowedTime = currentTime;
                                newParticleEffectsList.push({ id: uuidv4(), x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, type: 'cold_hit', creationTime: currentTime, duration: 200, size: enemy.width * 0.3, color: COLD_HIT_COLOR, particleCount: 3 });
                            }
                            
                            if (enemy.hp > 0 && (player.instaKillOnMaxSlowChance || 0) > 0 && enemy.slowFactor >= (player.coldMaxSlow || 0) && (player.coldMaxSlow || 0) === 1.0) {
                                if (Math.random() < (player.instaKillOnMaxSlowChance || 0)) enemy.hp = 0;
                            }

                            if (enemy.hp <= 0 && hpBeforeBolt > 0 && !enemy.deathEffectsProcessed) {
                                const enemyDef = ENEMY_TYPES[enemy.type];
                                score += enemyDef?.points || 5;
                                player.exp += Math.floor((enemyDef?.expValue || 5) * Math.pow(ENEMY_EXP_SCALING_PER_LEVEL, player.level -1) * (enemy.isElite ? 1.5 : 1));
                                enemiesKilled++;
                                const enemyCenterXForDeath = enemy.x + enemy.width / 2;
                                const enemyCenterYForDeath = enemy.y + enemy.height / 2;
                                newParticleEffectsList.push({ 
                                    id: uuidv4(), x: enemyCenterXForDeath, y: enemyCenterYForDeath, type: 'explosion', creationTime: currentTime, 
                                    duration: 300, size: enemy.width * 0.5, color: '#FFA500', particleCount: 10 + Math.min(5, Math.floor(enemy.width/5)), 
                                    particleSpeed: 3, particleShape: 'square'
                                });
                                if (player.hasFragmentation && player.fragmentationCount) {
                                    newParticleEffectsList.push({id: uuidv4(), x: enemyCenterXForDeath, y: enemyCenterYForDeath, type: 'fragment_spawn', creationTime: currentTime, duration: 250, size: enemy.width * 0.4, color: FRAGMENT_SPAWN_COLOR, particleCount: (player.fragmentationCount || 0) / 2 });
                                    for (let fragIdx = 0; fragIdx < (player.fragmentationCount || 0); fragIdx++) {
                                        const angle = Math.random() * Math.PI * 2;
                                        const fragSpeed = FRAGMENTATION_PROJECTILE_SPEED;
                                        const fragSize = (5 * player.projectileSize) * FRAGMENTATION_PROJECTILE_SIZE_MULTIPLIER;
                                        currentProjectiles.push({ 
                                            id: uuidv4(), x: enemyCenterXForDeath - fragSize / 2, y: enemyCenterYForDeath - fragSize / 2,
                                            width: fragSize, height: fragSize, damage: player.damage * (player.fragmentationDamageMultiplier || FRAGMENTATION_DAMAGE_MULTIPLIER_BASE),
                                            dx: Math.cos(angle) * fragSpeed, dy: Math.sin(angle) * fragSpeed, isPlayerProjectile: true, durability: 1,
                                            color: player.activeStaff.projectileColor || '#FFFF00', visualType: 'spark', spawnTime: currentTime,
                                        });
                                    }
                                }
                                enemy.deathEffectsProcessed = true;
                            }
                        }
                    });
                }
                player.lastThunderboltTime = currentTime;
            }
            

            let newPlayerLastShotTime = playerLastShotTime;
            const actualAttackSpeed = player.attackSpeed * (player.activeStaff.baseAttackSpeedModifier || 1);
            if (currentTime - newPlayerLastShotTime > actualAttackSpeed) {
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
                    currentProjectiles.push({
                        id: uuidv4(), x: playerCenterX + spawnOffsetX - projWidth / 2, y: playerCenterY + spawnOffsetY - projHeight / 2,
                        width: projWidth, height: projHeight, damage: damageDealt / shotCount, dx: dx, dy: dy,
                        isPlayerProjectile: true, durability: player.projectileDurability, color: player.activeStaff.projectileColor || '#FFFF00',
                        visualType: player.activeStaff.projectileVisualType || 'square', spawnTime: currentTime, angle: currentShotAngle,
                        isCrit: isCrit, 
                    });
                }
                newPlayerLastShotTime = currentTime;
            }
            playerLastShotTime = newPlayerLastShotTime;

            currentTickEnemies = currentTickEnemies.map((enemyObject) => {
                let enemyState = {...enemyObject}; 
                const enemyTypeDefinition = ENEMY_TYPES[enemyState.type];
                const enemyCenterX = enemyState.x + enemyState.width / 2;
                const enemyCenterY = enemyState.y + enemyState.height / 2;

                if (enemyState.hp > 0) {
                    if (enemyState.bleeding) {
                        if (currentTime - enemyState.bleeding.lastTickTime >= BLEED_TICK_INTERVAL) {
                            const bleedDamageToApply = enemyState.bleeding.dps;
                            enemyState.hp -= bleedDamageToApply;
                            enemyState.bleeding.lastTickTime = currentTime;
                            enemyState.bleeding.durationRemaining -= BLEED_TICK_INTERVAL;
                            newParticleEffectsList.push({ id: uuidv4(), x: enemyCenterX, y: enemyCenterY, type: 'bleed_tick', creationTime: currentTime, duration: 300, size: enemyState.width * 0.3, color: BLEED_PARTICLE_COLOR, particleCount: 2, particleSpeed: 0.5, particleShape: 'circle'});
                        }
                        if (enemyState.bleeding.durationRemaining <= 0) enemyState.bleeding = undefined;
                    }
                    if (enemyState.slowFactor > 0 && currentTime - enemyState.lastSlowedTime > COLD_EFFECT_DURATION) {
                        enemyState.slowFactor = Math.max(0, enemyState.slowFactor - 0.1);
                        enemyState.lastSlowedTime = currentTime;
                    }
                    if (enemyState.hp > 0 && (player.instaKillOnMaxSlowChance || 0) > 0 && enemyState.slowFactor >= (player.coldMaxSlow || 0) && (player.coldMaxSlow || 0) === 1.0) {
                        if (Math.random() < (player.instaKillOnMaxSlowChance || 0)) enemyState.hp = 0;
                    }

                    if (enemyState.hp <= 0 && !enemyState.deathEffectsProcessed && enemyObject.hp > 0) { 
                        const enemyDef = ENEMY_TYPES[enemyState.type];
                        score += enemyDef?.points || 5;
                        player.exp += Math.floor((enemyDef?.expValue || 5) * Math.pow(ENEMY_EXP_SCALING_PER_LEVEL, player.level -1) * (enemyState.isElite ? 1.5 : 1));
                        enemiesKilled++;
                        newParticleEffectsList.push({ 
                            id: uuidv4(), x: enemyCenterX, y: enemyCenterY, type: 'explosion', creationTime: currentTime, 
                            duration: 300, size: enemyState.width * 0.5, color: '#FFA500', particleCount: 10 + Math.min(5, Math.floor(enemyState.width/5)), 
                            particleSpeed: 3, particleShape: 'square'
                        });
                        if (player.hasFragmentation && player.fragmentationCount) {
                            newParticleEffectsList.push({id: uuidv4(), x: enemyCenterX, y: enemyCenterY, type: 'fragment_spawn', creationTime: currentTime, duration: 250, size: enemyState.width * 0.4, color: FRAGMENT_SPAWN_COLOR, particleCount: (player.fragmentationCount || 0) / 2 });
                            for (let i = 0; i < (player.fragmentationCount || 0); i++) {
                                const angle = Math.random() * Math.PI * 2;
                                const fragSpeed = FRAGMENTATION_PROJECTILE_SPEED;
                                const fragSize = (5 * player.projectileSize) * FRAGMENTATION_PROJECTILE_SIZE_MULTIPLIER;
                                currentProjectiles.push({ 
                                    id: uuidv4(), x: enemyCenterX - fragSize / 2, y: enemyCenterY - fragSize / 2,
                                    width: fragSize, height: fragSize, damage: player.damage * (player.fragmentationDamageMultiplier || FRAGMENTATION_DAMAGE_MULTIPLIER_BASE),
                                    dx: Math.cos(angle) * fragSpeed, dy: Math.sin(angle) * fragSpeed, isPlayerProjectile: true, durability: 1,
                                    color: player.activeStaff.projectileColor || '#FFFF00', visualType: 'spark', spawnTime: currentTime,
                                });
                            }
                        }
                        enemyState.deathEffectsProcessed = true;
                    }
                } 

                if (enemyState.hp > 0) {
                    let effectiveSpeed = enemyTypeDefinition.baseSpeed * (1 - enemyState.slowFactor);
                    let effectiveDamage = enemyTypeDefinition.baseDamage;
                    let effectiveAttackCooldown = enemyTypeDefinition.attackCooldown;
                    let effectiveProjectileSpeed = enemyTypeDefinition.projectileSpeed;
                    let effectiveProjectilesInBurst = enemyTypeDefinition.projectilesInBurst || 1;
                    let effectiveBurstInterval = enemyTypeDefinition.burstInterval || 100;
                    let effectiveShotgunPelletCount = enemyTypeDefinition.shotgunPelletCount || 1;
                    let effectiveWaveAmplitude = enemyTypeDefinition.projectileWaveAmplitude || 0;

                    if (enemyState.isElite) {
                        effectiveDamage *= enemyTypeDefinition.eliteDamageMultiplier || 1.5;
                        if (enemyTypeDefinition.eliteAttackCooldownMultiplier) effectiveAttackCooldown *= enemyTypeDefinition.eliteAttackCooldownMultiplier;
                        if (enemyTypeDefinition.eliteProjectileSpeedMultiplier) effectiveProjectileSpeed *= enemyTypeDefinition.eliteProjectileSpeedMultiplier;
                        if (enemyTypeDefinition.eliteProjectilesInBurstAdd) effectiveProjectilesInBurst += enemyTypeDefinition.eliteProjectilesInBurstAdd;
                        if (enemyTypeDefinition.eliteShotgunPelletCountAdd) effectiveShotgunPelletCount += enemyTypeDefinition.eliteShotgunPelletCountAdd;
                        if (enemyTypeDefinition.eliteWaveAmplitudeMultiplier) effectiveWaveAmplitude *= enemyTypeDefinition.eliteWaveAmplitudeMultiplier;
                    }

                    let dXToPlayer = playerCenterX - enemyCenterX;
                    let dYToPlayer = playerCenterY - enemyCenterY;
                    const distanceToPlayer = Math.sqrt(dXToPlayer * dXToPlayer + dYToPlayer * dYToPlayer);
                    let moveX = 0;
                    let moveY = 0;
                    
                    if (distanceToPlayer < enemyTypeDefinition.optimalFiringDistanceMin && distanceToPlayer > 0) {
                        const retreatSpeed = effectiveSpeed * 0.8; 
                        moveX = -(dXToPlayer / distanceToPlayer) * retreatSpeed;
                        moveY = -(dYToPlayer / distanceToPlayer) * retreatSpeed;
                    } else { 
                        let currentActionSpeed = effectiveSpeed;
                        if (enemyState.attackState === 'aiming' || enemyState.attackState === 'firing') {
                            currentActionSpeed *= 0.3;
                        }

                        if (distanceToPlayer > enemyTypeDefinition.optimalFiringDistanceMax) { 
                            moveX = (dXToPlayer / distanceToPlayer) * currentActionSpeed;
                            moveY = (dYToPlayer / distanceToPlayer) * currentActionSpeed;
                        } else { 
                            const preferredYOffset = -30; 
                            if (Math.abs(dYToPlayer - preferredYOffset) > 20) {
                                moveY = Math.sign(dYToPlayer - preferredYOffset) * currentActionSpeed * 0.3; 
                            } else {
                                moveY = 0; 
                            }
                            enemyState.horizontalDirection = enemyState.horizontalDirection || (Math.random() < 0.5 ? 1 : -1);
                            moveX = enemyState.horizontalDirection * currentActionSpeed * 0.5; 
                            if ( (enemyState.x <=0 && moveX < 0) || (enemyState.x + enemyState.width >= GAME_WIDTH && moveX > 0) ){
                                enemyState.horizontalDirection = (enemyState.horizontalDirection || 1) * -1 as (1 | -1);
                                moveX *= -1; 
                            }
                        }
                    }
                    
                    state.enemies.forEach(otherEnemyRef => { 
                        if (enemyState.id === otherEnemyRef.id || otherEnemyRef.hp <=0) return; 
                        const distToOtherX = enemyCenterX - (otherEnemyRef.x + otherEnemyRef.width / 2);
                        const distToOtherY = enemyCenterY - (otherEnemyRef.y + otherEnemyRef.height / 2);
                        const distToOther = Math.sqrt(distToOtherX * distToOtherX + distToOtherY * distToOtherY);
                        if (distToOther < enemyTypeDefinition.separationDistance && distToOther > 0) {
                            const repelForceFactor = 0.4; 
                            const repelX = distToOtherX / distToOther;
                            const repelY = distToOtherY / distToOther;
                            moveX += repelX * effectiveSpeed * repelForceFactor; 
                            moveY += repelY * effectiveSpeed * repelForceFactor;
                        }
                    });

                    enemyState.x += moveX;
                    enemyState.y += moveY;
                    enemyState.x = Math.max(0, Math.min(GAME_WIDTH - enemyState.width, enemyState.x));
                    enemyState.y = Math.max(0, Math.min(GAME_HEIGHT - enemyState.height - 40, enemyState.y)); 

                    if (enemyTypeDefinition.attackCooldown) { 
                        const canAttack = distanceToPlayer < enemyTypeDefinition.attackRange && distanceToPlayer > 10; 
                        
                        if (enemyState.attackState === 'idle' || enemyState.attackState === 'pursuing') {
                            if (canAttack && currentTime - enemyState.lastAttackTime > effectiveAttackCooldown) {
                                enemyState.attackState = 'aiming';
                                enemyState.attackProgressTimer = 0;
                                enemyState.currentBurstShotsFired = 0; 
                            } else if (!canAttack && enemyState.attackState !== 'pursuing') {
                                 enemyState.attackState = 'pursuing'; 
                            } else if (enemyState.attackState === 'pursuing' && canAttack) {
                                 enemyState.attackState = 'idle'; 
                            }
                        } else if (enemyState.attackState === 'aiming') {
                            enemyState.attackProgressTimer += 16; 
                            if (enemyState.attackProgressTimer >= enemyTypeDefinition.attackTelegraphTime) {
                                enemyState.attackState = 'firing';
                                enemyState.attackProgressTimer = 0; 
                                enemyState.currentBurstShotsFired = 0; 
                                enemyState.lastBurstShotTime = currentTime - effectiveBurstInterval; 
                            }
                        } else if (enemyState.attackState === 'firing') {
                            if (enemyState.currentBurstShotsFired < effectiveProjectilesInBurst &&
                                currentTime - enemyState.lastBurstShotTime >= effectiveBurstInterval) {

                                const aimAngle = Math.atan2(dYToPlayer, dXToPlayer); 
                                
                                const muzzleFlashAngle = aimAngle;
                                const muzzleOffsetX = Math.cos(muzzleFlashAngle) * (enemyState.width / 2 + MUZZLE_FLASH_SIZE * 0.3);
                                const muzzleOffsetY = Math.sin(muzzleFlashAngle) * (enemyState.height / 2 + MUZZLE_FLASH_SIZE * 0.3);

                                newParticleEffectsList.push({
                                    id: uuidv4(), x: enemyCenterX + muzzleOffsetX, y: enemyCenterY + muzzleOffsetY, type: 'muzzle_flash',
                                    creationTime: currentTime, duration: MUZZLE_FLASH_DURATION, size: MUZZLE_FLASH_SIZE * (enemyState.isElite ? 1.3 : 1),
                                    color: MUZZLE_FLASH_COLOR, particleCount: 1, angle: muzzleFlashAngle,
                                });
                                
                                const baseProjectile: Omit<ProjectileState, 'id' | 'dx' | 'dy'> = {
                                    x: enemyCenterX - ENEMY_PROJECTILE_BASE_SIZE / 2 + muzzleOffsetX, 
                                    y: enemyCenterY - ENEMY_PROJECTILE_BASE_SIZE / 2 + muzzleOffsetY,
                                    width: ENEMY_PROJECTILE_BASE_SIZE, height: ENEMY_PROJECTILE_BASE_SIZE, 
                                    damage: effectiveDamage, isPlayerProjectile: false, durability: 1,
                                    color: enemyTypeDefinition.projectileColor || ENEMY_PROJECTILE_DEFAULT_COLOR, 
                                    visualType: enemyTypeDefinition.projectileVisualType || ENEMY_PROJECTILE_DEFAULT_VISUAL_TYPE,
                                    spawnTime: currentTime, angle: aimAngle,
                                    initialY: enemyCenterY + muzzleOffsetY, 
                                    currentWaveTime: 0, 
                                };

                                if (enemyTypeDefinition.firearmType === 'shotgun') {
                                    for (let i = 0; i < effectiveShotgunPelletCount; i++) {
                                        const pelletAngle = aimAngle + (Math.random() - 0.5) * (enemyTypeDefinition.shotgunSpreadAngle || 0.1);
                                        newEnemyProjectiles.push({ 
                                            ...baseProjectile, 
                                            id: uuidv4(), 
                                            dx: Math.cos(pelletAngle) * effectiveProjectileSpeed, 
                                            dy: Math.sin(pelletAngle) * effectiveProjectileSpeed,
                                            visualType: 'pellet', 
                                            width: ENEMY_PROJECTILE_BASE_SIZE * 0.6, 
                                            height: ENEMY_PROJECTILE_BASE_SIZE * 0.6,
                                        });
                                    }
                                } else if (enemyTypeDefinition.firearmType === 'smg' && enemyTypeDefinition.smgSpreadAngle) {
                                    const shotAngle = aimAngle + (Math.random() - 0.5) * enemyTypeDefinition.smgSpreadAngle;
                                     newEnemyProjectiles.push({ 
                                        ...baseProjectile, 
                                        id: uuidv4(), 
                                        dx: Math.cos(shotAngle) * effectiveProjectileSpeed, 
                                        dy: Math.sin(shotAngle) * effectiveProjectileSpeed,
                                    });
                                } else if (enemyTypeDefinition.firearmType === 'beam_rifle') {
                                    newEnemyProjectiles.push({ 
                                        ...baseProjectile, 
                                        id: uuidv4(), 
                                        dx: Math.cos(aimAngle) * effectiveProjectileSpeed, 
                                        dy: Math.sin(aimAngle) * effectiveProjectileSpeed,
                                        waveAmplitude: effectiveWaveAmplitude,
                                        waveFrequency: enemyTypeDefinition.projectileWaveFrequency,
                                    });
                                }
                                 else { 
                                    newEnemyProjectiles.push({ 
                                        ...baseProjectile, 
                                        id: uuidv4(), 
                                        dx: Math.cos(aimAngle) * effectiveProjectileSpeed, 
                                        dy: Math.sin(aimAngle) * effectiveProjectileSpeed,
                                    });
                                }
                                enemyState.currentBurstShotsFired++;
                                enemyState.lastBurstShotTime = currentTime;
                            }

                            if (enemyState.currentBurstShotsFired >= effectiveProjectilesInBurst) {
                                enemyState.attackState = 'cooldown';
                                enemyState.lastAttackTime = currentTime; 
                                enemyState.attackProgressTimer = 0; 
                            }
                        } else if (enemyState.attackState === 'cooldown') {
                            if (currentTime - enemyState.lastAttackTime > effectiveAttackCooldown) {
                                enemyState.attackState = 'idle';
                            }
                        }
                    } 
                } 

                if (enemyState.isElite && enemyState.hp > 0) {
                    newParticleEffectsList.push({id: uuidv4(), x: enemyCenterX, y: enemyCenterY, type: 'elite_aura', creationTime: currentTime, duration: 100, size: enemyState.width * 1.3, color: ELITE_AURA_COLOR, particleCount: 1, fixedPosition: true, particleShape: 'circle'});
                }
                return enemyState;
            }); 

            currentProjectiles = [...currentProjectiles, ...newEnemyProjectiles];
            newEnemyProjectiles = [];


            currentProjectiles = currentProjectiles.map(p => {
                let newProjX = p.x + p.dx;
                let newProjY = p.y + p.dy;
                if (p.waveAmplitude && p.waveFrequency) {
                   p.currentWaveTime = (p.currentWaveTime || 0) + 16;
                }
                return { ...p, x: newProjX, y: newProjY };
            }).filter(p => p.x > -p.width - 50 && p.x < GAME_WIDTH + 50 && p.y > -p.height - 50 && p.y < GAME_HEIGHT + 50 && p.durability > 0);


            let newLastEnemySpawnTime = lastEnemySpawnTime;
            const maxEnemies = MAX_ENEMIES_ON_SCREEN_BASE + (player.level -1) * MAX_ENEMIES_ON_SCREEN_PER_LEVEL;
            const spawnInterval = ENEMY_SPAWN_INTERVAL_MAX - (player.level * 50); 
            if (currentTickEnemies.filter(e=> e.hp > 0).length < maxEnemies && currentTime - newLastEnemySpawnTime > Math.max(ENEMY_SPAWN_INTERVAL_MIN, spawnInterval) ) {
                const enemyTypeList = Object.values(ENEMY_TYPES);
                const randomType = enemyTypeList[Math.floor(Math.random() * enemyTypeList.length)];
                const isNewEnemyElite = Math.random() < ELITE_SPAWN_CHANCE_BASE;
                let enemyHp = Math.floor(randomType.baseHp * Math.pow(ENEMY_HP_SCALING_PER_LEVEL, player.level -1));
                let enemyDamage = Math.floor(randomType.baseDamage * Math.pow(ENEMY_DAMAGE_SCALING_PER_LEVEL, player.level -1));
                let enemyWidth = randomType.width;
                let enemyHeight = randomType.height;
                if (isNewEnemyElite) {
                    enemyHp *= ELITE_HP_MULTIPLIER;
                    enemyWidth *= ELITE_SIZE_MULTIPLIER;
                    enemyHeight *= ELITE_SIZE_MULTIPLIER;
                }
                const spawnX = Math.random() * (GAME_WIDTH - enemyWidth);
                const spawnY = -enemyHeight - (10 + Math.random() * 20); 
                currentTickEnemies.push({
                    id: uuidv4(), x: spawnX, y: spawnY, width: enemyWidth, height: enemyHeight, hp: enemyHp, maxHp: enemyHp,
                    type: randomType.id, speed: randomType.baseSpeed + ((player.level-1) * 0.05 * randomType.baseSpeed),
                    damage: enemyDamage, color: randomType.color, 
                    reachedTargetY: false, 
                    lastAttackTime: currentTime + Math.random() * randomType.attackCooldown, 
                    slowFactor: 0, lastSlowedTime: 0,
                    isElite: isNewEnemyElite, attackState: 'pursuing', attackProgressTimer: 0, currentBurstShotsFired: 0,
                    lastBurstShotTime: 0, horizontalDirection: (Math.random() < 0.5 ? 1 : -1) as (1 | -1),
                    deathEffectsProcessed: false,
                });
                newLastEnemySpawnTime = currentTime;
            }
            lastEnemySpawnTime = newLastEnemySpawnTime;

            
            let enemiesProcessedByPlayerProjectiles = [...currentTickEnemies]; 
            let projectilesThatHit = new Set<string>(); 

            for (const proj of currentProjectiles) {
                if (!proj.isPlayerProjectile || proj.durability <= 0) continue;
            
                let hitThisProjectile = false;
                enemiesProcessedByPlayerProjectiles = enemiesProcessedByPlayerProjectiles.map(enemy => {
                    if (enemy.hp <= 0 || hitThisProjectile) return enemy; 
            
                    if (proj.x < enemy.x + enemy.width && proj.x + proj.width > enemy.x &&
                        proj.y < enemy.y + enemy.height && proj.y + proj.height > enemy.y) {
            
                        enemy.hp -= proj.damage;
                        hitThisProjectile = true; 
                        projectilesThatHit.add(proj.id); 
            
                        newParticleEffectsList.push({
                            id: uuidv4(),
                            x: enemy.x + enemy.width / 2 + (Math.random() * enemy.width * 0.6 - enemy.width * 0.3),
                            y: enemy.y + enemy.height / 2 - 10,
                            type: 'damage_number', creationTime: currentTime, duration: 600, size: 12,
                            color: proj.isCrit ? '#FFFF00' : '#FFFFFF', text: proj.damage.toFixed(0),
                            isCritEffect: proj.isCrit,
                        });
            
                        if (player.appliesBleed && player.bleedDps && player.bleedDuration) {
                            enemy.bleeding = { dps: player.bleedDps, durationRemaining: player.bleedDuration, lastTickTime: currentTime, };
                        }
                        if (player.appliesCold && enemy.slowFactor < (player.coldMaxSlow || COLD_MAX_SLOW_BASE)) {
                            enemy.slowFactor = Math.min((player.coldMaxSlow || COLD_MAX_SLOW_BASE), enemy.slowFactor + (player.coldSlowFactor || COLD_SLOW_FACTOR_BASE));
                            enemy.lastSlowedTime = currentTime;
                            newParticleEffectsList.push({ id: uuidv4(), x: proj.x + proj.width/2, y: proj.y + proj.height/2, type: 'cold_hit', creationTime: currentTime, duration: 200, size: enemy.width * 0.3, color: COLD_HIT_COLOR, particleCount: 3 });
                        }
                        if (enemy.hp > 0 && (player.instaKillOnMaxSlowChance || 0) > 0 && enemy.slowFactor >= (player.coldMaxSlow || 0) && (player.coldMaxSlow || 0) === 1.0) {
                            if (Math.random() < (player.instaKillOnMaxSlowChance || 0)) enemy.hp = 0;
                        }
                        newParticleEffectsList.push({ id: uuidv4(), x: proj.x + proj.width/2, y: proj.y + proj.height/2, type: 'hit_spark', creationTime: currentTime, duration: 150, size: 3, color: proj.color, particleCount: 3, particleSpeed: 2, particleShape: proj.visualType === 'circle' ? 'circle' : proj.visualType === 'spark' ? 'spark' : 'square'});
                        if (player.lifesteal > 0) {
                            player.currentHp = Math.min(player.maxHp, player.currentHp + proj.damage * player.lifesteal);
                        }
            
                        if (enemy.hp <= 0 && !enemy.deathEffectsProcessed) {
                            const enemyDef = ENEMY_TYPES[enemy.type];
                            score += enemyDef?.points || 5;
                            player.exp += Math.floor((enemyDef?.expValue || 5) * Math.pow(ENEMY_EXP_SCALING_PER_LEVEL, player.level -1) * (enemy.isElite ? 1.5 : 1));
                            enemiesKilled++;
                            newParticleEffectsList.push({ id: uuidv4(), x: enemy.x + enemy.width/2, y: enemy.y + enemy.height/2, type: 'explosion', creationTime: currentTime, duration: 300, size: enemy.width * 0.5, color: '#FFA500', particleCount: 10 + Math.min(5, Math.floor(enemy.width/5)), particleSpeed: 3, particleShape: 'square'});
                            if (player.hasFragmentation && player.fragmentationCount) {
                                newParticleEffectsList.push({id: uuidv4(), x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height / 2, type: 'fragment_spawn', creationTime: currentTime, duration: 250, size: enemy.width * 0.4, color: FRAGMENT_SPAWN_COLOR, particleCount: (player.fragmentationCount || 0) / 2 });
                                for (let i = 0; i < (player.fragmentationCount || 0); i++) {
                                    const angle = Math.random() * Math.PI * 2;
                                    const fragSpeed = FRAGMENTATION_PROJECTILE_SPEED;
                                    const fragSize = (5 * player.projectileSize) * FRAGMENTATION_PROJECTILE_SIZE_MULTIPLIER;
                                    currentProjectiles.push({ 
                                        id: uuidv4(), x: enemy.x + enemy.width / 2 - fragSize / 2, y: enemy.y + enemy.height / 2 - fragSize / 2,
                                        width: fragSize, height: fragSize, damage: player.damage * (player.fragmentationDamageMultiplier || FRAGMENTATION_DAMAGE_MULTIPLIER_BASE),
                                        dx: Math.cos(angle) * fragSpeed, dy: Math.sin(angle) * fragSpeed, isPlayerProjectile: true, durability: 1,
                                        color: player.activeStaff.projectileColor || '#FFFF00', visualType: 'spark', spawnTime: currentTime,
                                    });
                                }
                            }
                            enemy.deathEffectsProcessed = true;
                        }
                    }
                    return enemy;
                });
            }
            currentTickEnemies = enemiesProcessedByPlayerProjectiles;
            currentProjectiles = currentProjectiles.map(p => {
                if (projectilesThatHit.has(p.id)) {
                    return {...p, durability: p.durability -1 };
                }
                return p;
            }).filter(p => p.durability > 0);


            let finalProjectilesAfterPlayerCollision: ProjectileState[] = [];
            let oldBarrierHits = player.barrierHitsRemaining || 0;
            for (const proj of currentProjectiles) {
                if (proj.isPlayerProjectile) { 
                    finalProjectilesAfterPlayerCollision.push(proj);
                    continue;
                }
                let effectiveProjY = proj.y;
                if (proj.waveAmplitude && proj.waveFrequency && proj.initialY != null && proj.currentWaveTime != null) {
                     const angularFrequency = proj.waveFrequency * (2 * Math.PI) / 1000;
                     effectiveProjY = proj.y + proj.waveAmplitude * Math.sin(angularFrequency * proj.currentWaveTime);
                }
                if (player.x < proj.x + proj.width && player.x + playerRenderWidth > proj.x &&
                    player.y < effectiveProjY + proj.height && player.y + playerRenderHeight > effectiveProjY) {
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
                    proj.durability = 0; 
                }
                if(proj.durability > 0) finalProjectilesAfterPlayerCollision.push(proj);
            }
            currentProjectiles = finalProjectilesAfterPlayerCollision;

            currentTickEnemies.forEach(enemy => {
                 if (enemy.hp <=0) return;
                 const enemyDef = ENEMY_TYPES[enemy.type];
                if (player.x < enemy.x + enemy.width && player.x + playerRenderWidth > enemy.x &&
                    player.y < enemy.y + enemy.height && player.y + playerRenderHeight > enemy.y) {
                    let damageBlockedByBarrier = false;
                    if (player.hasBarrier && (player.barrierHitsRemaining || 0) > 0) {
                        player.barrierHitsRemaining = (player.barrierHitsRemaining || 0) - 1;
                        damageBlockedByBarrier = true;
                        newParticleEffectsList.push({ id: uuidv4(), x: playerCenterX, y: playerCenterY, type: 'hit_spark', creationTime: currentTime, duration: 250, size: playerRenderWidth * 0.5, color: BARRIER_ACTIVE_COLOR, particleCount: 5 });
                    }
                    if (!damageBlockedByBarrier && !player.isInvulnerable) {
                         let contactDamage = (enemyDef.baseDamage * (enemy.isElite && enemyDef.eliteDamageMultiplier ? enemyDef.eliteDamageMultiplier : (enemy.isElite ? 1.5 : 1))) * 0.3 ; 
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

             if (oldBarrierHits > 0 && (player.barrierHitsRemaining || 0) === 0 && (player.barrierBreakProjectileCount || 0) > 0) {
                player.lastBarrierActivationTime = currentTime;
                const breakCount = player.barrierBreakProjectileCount || 0;
                const breakDamageMultiplier = player.barrierBreakProjectileDamageMultiplier || 0;
                const projBaseSize = 5;
                const projWidth = projBaseSize * player.projectileSize;
                const projHeight = projBaseSize * player.projectileSize;
                const staffProjectileSpeed = player.activeStaff.projectileBaseSpeed || 10;
                for (let i = 0; i < breakCount; i++) {
                    const angle = (i / breakCount) * Math.PI * 2;
                    const dx = Math.cos(angle) * staffProjectileSpeed;
                    const dy = Math.sin(angle) * staffProjectileSpeed;
                    currentProjectiles.push({ 
                        id: uuidv4(), x: playerCenterX - projWidth / 2, y: playerCenterY - projHeight / 2,
                        width: projWidth, height: projHeight, damage: player.damage * breakDamageMultiplier, dx, dy,
                        isPlayerProjectile: true, durability: 1, color: player.activeStaff.projectileColor || '#00FFFF',
                        visualType: player.activeStaff.projectileVisualType || 'spark', spawnTime: currentTime, angle: angle,
                    });
                }
            }

            // Safety net for unprocessed deaths
            currentTickEnemies.forEach(enemy => {
                if (enemy.hp <= 0 && !enemy.deathEffectsProcessed) {
                    console.warn(`SAFETY NET: Enemy ${enemy.id} (${enemy.type}) HP <= 0 but death effects not processed. Forcing effects.`);
                    const enemyDef = ENEMY_TYPES[enemy.type];
                    score += enemyDef?.points || 5;
                    player.exp += Math.floor((enemyDef?.expValue || 5) * Math.pow(ENEMY_EXP_SCALING_PER_LEVEL, player.level -1) * (enemy.isElite ? 1.5 : 1));
                    enemiesKilled++;
                    const enemyCenterXForDeath = enemy.x + enemy.width / 2;
                    const enemyCenterYForDeath = enemy.y + enemy.height / 2;
                    newParticleEffectsList.push({ 
                        id: uuidv4(), x: enemyCenterXForDeath, y: enemyCenterYForDeath, type: 'explosion', creationTime: currentTime, 
                        duration: 300, size: enemy.width * 0.5, color: '#FFA500', particleCount: 10 + Math.min(5, Math.floor(enemy.width/5)), 
                        particleSpeed: 3, particleShape: 'square'
                    });
                    if (player.hasFragmentation && player.fragmentationCount) {
                         newParticleEffectsList.push({id: uuidv4(), x: enemyCenterXForDeath, y: enemyCenterYForDeath, type: 'fragment_spawn', creationTime: currentTime, duration: 250, size: enemy.width * 0.4, color: FRAGMENT_SPAWN_COLOR, particleCount: (player.fragmentationCount || 0) / 2 });
                        for (let i = 0; i < (player.fragmentationCount || 0); i++) {
                            const angle = Math.random() * Math.PI * 2;
                            const fragSpeed = FRAGMENTATION_PROJECTILE_SPEED;
                            const fragSize = (5 * player.projectileSize) * FRAGMENTATION_PROJECTILE_SIZE_MULTIPLIER;
                            currentProjectiles.push({ 
                                id: uuidv4(), x: enemyCenterXForDeath - fragSize / 2, y: enemyCenterYForDeath - fragSize / 2,
                                width: fragSize, height: fragSize, damage: player.damage * (player.fragmentationDamageMultiplier || FRAGMENTATION_DAMAGE_MULTIPLIER_BASE),
                                dx: Math.cos(angle) * fragSpeed, dy: Math.sin(angle) * fragSpeed, isPlayerProjectile: true, durability: 1,
                                color: player.activeStaff.projectileColor || '#FFFF00', visualType: 'spark', spawnTime: currentTime,
                            });
                        }
                    }
                    enemy.deathEffectsProcessed = true; // Mark as processed by safety net
                }
            });
            
            const finalEnemiesForState = currentTickEnemies.filter(e => e.hp > 0 && e.y < GAME_HEIGHT + e.height);


            particleEffects = newParticleEffectsList.filter(p => currentTime < p.creationTime + p.duration);
            let offered: CardDefinition[] = state.offeredCards;
            let cardsCollectedSummary: { name: string; rarity: CardRarity; }[] = []; 

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
                            id: `unlock_${staffDef.id}`, name: `Unlock: ${staffDef.name}`, description: staffDef.description,
                            rarity: CardRarity.SPECIAL, effects: [], cardType: 'staff_unlock', staffToUnlockId: staffDef.id,
                        };
                        if (!newOfferedCards.find(o => o.id === staffUnlockCard.id) && !availableCards.find(ac => ac.id === staffUnlockCard.id)) {
                           availableCards.push(staffUnlockCard);
                        }
                    }
                });
                const numChoices = CARD_CHOICES_COUNT + player.appraisalStacks;
                const rarityWeights: Record<CardRarity, number> = {
                    [CardRarity.COMMON]: 10, [CardRarity.UNCOMMON]: 5, [CardRarity.EPIC]: 2,
                    [CardRarity.SPECIAL]: 3, [CardRarity.ASCENSION]: 0,
                };
                const weightedAvailableCards: { card: CardDefinition, weight: number }[] = [];
                availableCards.forEach(card => {
                    weightedAvailableCards.push({ card, weight: rarityWeights[card.rarity] || 1 });
                });
                let hasNonCommonOffered = false;
                const potentialNonCommons = weightedAvailableCards.filter(wc => wc.card.rarity !== CardRarity.COMMON);
                if (potentialNonCommons.length > 0 && newOfferedCards.length < numChoices) {
                    const totalNonCommonWeight = potentialNonCommons.reduce((sum, wc) => sum + wc.weight, 0);
                    let randomWeight = Math.random() * totalNonCommonWeight;
                    for (const weightedCard of potentialNonCommons) {
                        randomWeight -= weightedCard.weight;
                        if (randomWeight <= 0) {
                            if (!newOfferedCards.find(o => o.id === weightedCard.card.id)) {
                                newOfferedCards.push(weightedCard.card);
                                hasNonCommonOffered = true;
                                const idxInWeighted = weightedAvailableCards.findIndex(wc => wc.card.id === weightedCard.card.id);
                                if(idxInWeighted > -1) weightedAvailableCards.splice(idxInWeighted, 1);
                            }
                            break;
                        }
                    }
                }
                while (newOfferedCards.length < numChoices && weightedAvailableCards.length > 0) {
                    const totalWeight = weightedAvailableCards.reduce((sum, wc) => sum + wc.weight, 0);
                    let randomWeight = Math.random() * totalWeight;
                    for (let i = 0; i < weightedAvailableCards.length; i++) {
                        randomWeight -= weightedAvailableCards[i].weight;
                        if (randomWeight <= 0) {
                            const candidateCard = weightedAvailableCards.splice(i, 1)[0].card;
                            if (!newOfferedCards.find(o => o.id === candidateCard.id)) {
                                newOfferedCards.push(candidateCard);
                            }
                            break;
                        }
                    }
                }
                 offered = newOfferedCards;
            }

            if (player.currentHp <= 0) {
                newStatus = 'GAME_OVER';
                cardsCollectedSummary = Object.entries(player.chosenCards)
                    .map(([cardId, count]) => {
                        const cardDef = ALL_CARDS_POOL.find(c => c.id === cardId);
                        return cardDef ? { name: `${cardDef.name} (x${count})`, rarity: cardDef.rarity } : null;
                    })
                    .filter(Boolean) as { name: string; rarity: CardRarity; }[];

                player.activeAscensions.forEach(ascId => {
                    const ascDef = ALL_ASCENSIONS.find(a => a.id === ascId);
                    if (ascDef) {
                        cardsCollectedSummary.push({ name: ascDef.name, rarity: ascDef.rarity });
                    }
                });
                cardsCollectedSummary.sort((a, b) => {
                    const rarityOrder = [CardRarity.COMMON, CardRarity.UNCOMMON, CardRarity.EPIC, CardRarity.SPECIAL, CardRarity.ASCENSION];
                    const rarityDiff = rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity);
                    if (rarityDiff !== 0) return rarityDiff;
                    return a.name.localeCompare(b.name);
                });
            }

            const playerForNextState = { ...player };
            const gameStateForReturn: GameReducerState = {
                status: newStatus,
                player: playerForNextState,
                enemies: finalEnemiesForState,
                projectiles: currentProjectiles,
                score,
                gameTime: newGameTime,
                enemiesKilled,
                lastShotTime: playerLastShotTime,
                particleEffects,
                lastEnemySpawnTime,
                activeCardIcons,
                mousePosition: currentMousePosition,
                offeredCards: offered,
                keysPressed: state.keysPressed, 
            };

            if (newStatus === 'GAME_OVER') {
                (gameStateForReturn as any)._cardsCollectedSummaryForGameOver = cardsCollectedSummary;
            }

            return gameStateForReturn;
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
        enemiesKilled: 0,
        lastShotTime: 0,
        offeredCards: [],
        keysPressed: new Set<string>(),
        particleEffects: [],
        lastEnemySpawnTime: 0,
        activeCardIcons: [],
        mousePosition: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2},
    });

    const { status, player, enemies, projectiles, score, offeredCards, particleEffects, activeCardIcons, gameTime, enemiesKilled } = gameState;
    const [localKeysPressed, setLocalKeysPressed] = useState<Set<string>>(new Set<string>());

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
        const progress = Math.min(1, elapsed / p.duration);
        let currentSize = p.size;
        let opacity = 0.7;
        const particlesArray: JSX.Element[] = [];

        if (p.type === 'damage_number' && p.text) {
            const yOffset = -20 * progress; // Move up
            opacity = 1 - Math.pow(progress, 2); // Fade out
            particlesArray.push(
                <div key={`${p.id}-damage`} style={{
                    position: 'absolute',
                    left: p.x - (p.text.length * (p.size * 0.4)) / 2, // Center text based on length and approx char width
                    top: p.y + yOffset,
                    fontSize: `${p.size}px`,
                    fontWeight: p.isCritEffect ? 'bold' : 'normal',
                    color: p.isCritEffect ? '#FFFF00' : p.color, // Yellow for crit, otherwise use p.color (should be white)
                    opacity: Math.max(0, opacity),
                    whiteSpace: 'nowrap',
                    zIndex: 25, // Above most things
                    textShadow: p.isCritEffect ? '0 0 3px #000000, 0 0 5px #FF8C00' : '0 0 3px #000000', // Crit shadow vs normal
                }}>
                    {p.text}
                </div>
            );
        } else if (p.type === 'muzzle_flash') {
            const flashProgress = Math.min(1, progress / 0.5); 
            currentSize = p.size * (flashProgress < 0.3 ? (flashProgress / 0.3) : (1 - (flashProgress - 0.3) / 0.7));
            opacity = 0.9 * (1 - Math.pow(progress, 2)); 
            const angleDeg = (p.angle || 0) * (180 / Math.PI);
             particlesArray.push(
                <div key={`${p.id}-flash`} style={{
                    position: 'absolute',
                    left: p.x - currentSize / 2,
                    top: p.y - currentSize / 2,
                    width: currentSize,
                    height: currentSize,
                    backgroundColor: p.color,
                    borderRadius: '50%',
                    opacity: Math.max(0, opacity),
                    transform: `rotate(${angleDeg}deg) scaleX(1.5) scaleY(0.5)`, 
                    transformOrigin: 'center center',
                    zIndex: 15,
                }}></div>
            );
        } else if (p.type === 'thunderbolt_impact') {
            const boltWidth = 4 + Math.random() * 2;
            const strikeDownProgress = Math.min(1, progress / 0.15);
            const actualBoltHeight = p.y * strikeDownProgress;
            const boltOpacity = 1 - progress;

            particlesArray.push(
                <div key={`${p.id}-shaft`} style={{
                    position: 'absolute',
                    left: p.x - boltWidth / 2,
                    top: p.y - actualBoltHeight, 
                    width: boltWidth,
                    height: actualBoltHeight,
                    backgroundColor: p.color,
                    opacity: Math.max(0, boltOpacity * (strikeDownProgress < 1 ? 0.7 : 1)),
                    zIndex: 15,
                }}></div>
            );

            const flashProgress = Math.min(1, progress / 0.5);
            let flashRadius = p.size;
            if (flashProgress < 0.5) {
                flashRadius = p.size * (flashProgress / 0.5);
            } else {
                flashRadius = p.size * (1 - (flashProgress - 0.5) / 0.5);
            }
            const flashOpacity = 0.9 * (1 - progress);

            if (flashRadius > 0) {
                particlesArray.push(
                    <div key={`${p.id}-flash`} style={{
                        position: 'absolute',
                        left: p.x - flashRadius,
                        top: p.y - flashRadius,
                        width: flashRadius * 2,
                        height: flashRadius * 2,
                        backgroundColor: 'white',
                        borderRadius: '50%',
                        opacity: Math.max(0, flashOpacity),
                        transform: 'scale(1)',
                        zIndex: 16,
                    }}></div>
                );
            }
        } else if (p.type === 'explosion' || p.type === 'fragment_spawn' ) {
            currentSize = p.size * (progress < 0.3 ? progress / 0.3 : 1 - (progress - 0.3) / 0.7);
            opacity = 1 - progress;
            const count = p.particleCount || 1;
            for(let i=0; i < count; i++) {
                const actualProgress = Math.max(0.01, progress);
                const particleSpeedFactor = p.particleSpeed || 1;
                let offsetX = 0;
                let offsetY = 0;
                if (!p.fixedPosition ) {
                    offsetX = (Math.cos(i/count * Math.PI*2 + Math.random()*0.5-0.25) ) * p.size * particleSpeedFactor * actualProgress * 1.5;
                    offsetY = (Math.sin(i/count * Math.PI*2 + Math.random()*0.5-0.25) ) * p.size * particleSpeedFactor * actualProgress * 1.5;
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
        } else if (p.type === 'hit_spark' || p.type === 'bleed_tick' || p.type === 'cold_hit' ) {
            currentSize = p.size * (1 - progress);
            opacity = 0.8 - progress * 0.8;
             const count = p.particleCount || 1;
            for(let i=0; i < count; i++) {
                const actualProgress = Math.max(0.01, progress);
                const particleSpeedFactor = p.particleSpeed || 1;
                let offsetX = (Math.random() - 0.5) * p.size * particleSpeedFactor * actualProgress * 2;
                let offsetY = (Math.random() - 0.5) * p.size * particleSpeedFactor * actualProgress * 2;
                if (p.fixedPosition) { offsetX = 0; offsetY = 0; }

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
                let offsetX = (Math.random() - 0.5) * p.size * particleSpeedFactor * actualProgress * 2;
                let offsetY = (Math.random() - 0.5) * p.size * particleSpeedFactor * actualProgress * 2;
                if (p.fixedPosition) {offsetX=0; offsetY=0;}

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
             opacity = 0.3 + Math.sin(progress * Math.PI * 4) * 0.15;
             particlesArray.push(
                <div key={`${p.id}-0`} style={{
                    position: 'absolute',
                    left: p.x - currentSize/2,
                    top: p.y - currentSize/2,
                    width: currentSize,
                    height: currentSize,
                    borderRadius: '50%',
                    opacity: Math.max(0, opacity),
                    zIndex: 15,
                    border: `2px solid ${p.color}`,
                    boxSizing: 'border-box',
                }}></div>
            );
        } else if (p.type === 'ascension_activate') {
            currentSize = p.size * (0.3 + progress * 0.7);
            opacity = 1 - Math.pow(progress, 2);
            particlesArray.push(
                <div key={`${p.id}-0`} style={{
                    position: 'absolute',
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
        } else if (p.type === 'elite_aura') {
            currentSize = p.size * (0.8 + Math.sin(progress * Math.PI * 2) * 0.2);
            opacity = 0.2 + Math.sin(progress * Math.PI * 2) * 0.1;
            particlesArray.push(
                 <div key={`${p.id}-aura`} style={{
                    position: 'absolute',
                    left: p.x - currentSize/2,
                    top: p.y - currentSize/2,
                    width: currentSize,
                    height: currentSize,
                    borderRadius: '50%',
                    backgroundColor: p.color,
                    opacity: Math.max(0, opacity),
                    zIndex: 4,
                }}></div>
            );
        }

        return particlesArray;
    };


    const renderProjectileWithWave = (proj: ProjectileState) => {
        let displayY = proj.y;
        if (proj.waveAmplitude && proj.waveFrequency && proj.initialY != null && proj.currentWaveTime != null) {
            const angularFrequency = proj.waveFrequency * (2 * Math.PI) / 1000; 
            displayY = proj.y + proj.waveAmplitude * Math.sin(angularFrequency * proj.currentWaveTime);
        }
        return <ProjectileComponent key={proj.id} projectile={{ ...proj, y: displayY }} />;
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
                    {projectiles.map(proj => renderProjectileWithWave(proj))}
                    {particleEffects.flatMap(renderParticle)}

                    {status === 'CARD_SELECTION' && <CardSelectionScreen cards={offeredCards} onSelectCard={selectCard} playerLevel={player.level} />}
                    {status === 'GAME_OVER' && 
                        <GameOverScreen 
                            score={score} 
                            level={player.level} 
                            onRestart={restartGame} 
                            // This temp access is a workaround because the reducer's returned state doesn't formally include it
                            // but we sneak it in when status becomes GAME_OVER.
                            // A better approach would be to have a dedicated `gameOverStats` field in GameState.
                            timeSurvived={gameTime} 
                            enemiesKilled={enemiesKilled} 
                            cardsCollectedSummary={(gameState as any)._cardsCollectedSummaryForGameOver || []} 
                        />
                    }
                    {status === 'PAUSED' && <PauseScreen onResume={handleResume} onMainMenu={handleMainMenu} />}
                </div>
            )}
        </div>
    );
};

export default App;
