
export interface PlayerStats {
  maxHp: number;
  currentHp: number;
  damage: number;
  attackSpeed: number; // Lower is faster (ms per shot)
  movementSpeed: number;
  jumpStrength: number;
  jumps: number; // Max jumps
  currentJumps: number; // Jumps remaining in current airtime
  critChance: number; // 0-1
  critDamage: number; // Multiplier, e.g., 1.5 for +50%
  defense: number; // Percentage reduction 0-1
  lifesteal: number; // Percentage of damage dealt, 0-1
  projectileDurability: number; // How many hits a projectile can take
  projectileSize: number; // Multiplier
  isInvulnerable: boolean; // For cloak/barrier
  invulnerabilityEndTime: number; // Timestamp

  // New EXP and Leveling
  level: number;
  exp: number;
  expToNextLevel: number;

  // Stage 1 Card Mechanics
  playerSizeModifier: number; // For Shrink card
  appliesBleed?: boolean;     // For Wound card
  bleedDps?: number;          // For Wound card
  bleedDuration?: number;     // For Wound card

  // Stage 2 Card Mechanics
  appraisalStacks: number;      // For Appraisal card
  hasBarrier?: boolean;          // For Barrier card
  barrierCooldown?: number;      // For Barrier card
  lastBarrierActivationTime?: number; // For Barrier card cooldown tracking
  barrierHitsRemaining?: number; // For Barrier card
  appliesCold?: boolean;         // For Cold card
  coldSlowFactor?: number;       // Base slow % per hit for Cold card
  coldMaxSlow?: number;          // Max slow % for Cold card
  triggersThunderbolts?: boolean; // For Thunderbolt card
  thunderboltDamage?: number;    // For Thunderbolt card
  thunderboltInterval?: number;  // For Thunderbolt card
  lastThunderboltTime?: number;  // For Thunderbolt card
  hasFragmentation?: boolean;    // For Fragmentation card
  fragmentationCount?: number;   // For Fragmentation card
  fragmentationDamageMultiplier?: number; // For Fragmentation card

  // Stage 3 Ascension Card Mechanics
  instaKillOnMaxSlowChance?: number; // For Freezer ascension
  barrierBreakProjectileCount?: number; // For Protector ascension
  barrierBreakProjectileDamageMultiplier?: number; // For Protector ascension
}

export interface PlayerState extends PlayerStats {
  id: string; // Added for identification
  x: number;
  y: number;
  width: number; // Base width, visual width can be affected by playerSizeModifier
  height: number; // Base height, visual height can be affected by playerSizeModifier
  isJumping: boolean;
  velocityY: number;
  facingDirection: 'left' | 'right';
  activeHat: HatDefinition | null;
  activeStaff: StaffDefinition; // Now non-nullable, starts with Wizard's Staff
  chosenCards: Record<string, number>; // cardId: stackCount
  activeAscensions: Set<string>; // ascensionCardId
  unlockedStaffIds: Set<string>; // IDs of staffs player has unlocked
  aimAngle: number; // Angle in radians for mouse aiming

  // Stage 1 Card Mechanics
  hasRageActive?: boolean;   // For Rage card
}

export type FirearmType = 'rifle' | 'smg' | 'shotgun' | 'beam_rifle' | 'heavy_pistol'; // Descriptive

export interface EnemyType {
  id: string;
  name: string;
  baseHp: number;
  baseSpeed: number; // Base movement speed
  baseDamage: number; // Damage per projectile
  width: number;
  height: number;
  color: string;
  points: number;
  expValue: number;
  firearmType: FirearmType; // Descriptive type of weapon

  attackCooldown: number; // Time between shots or bursts (ms)
  attackRange: number; // Max distance to attempt attack
  attackTelegraphTime: number; // Time enemy might pause/aim before firing
  
  projectileSpeed: number;
  projectileColor?: string; // Optional: if different from ENEMY_PROJECTILE_COLOR
  projectileVisualType?: ProjectileVisualType; // Optional: if different from ENEMY_PROJECTILE_VISUAL_TYPE

  // Firearm specific parameters
  projectilesInBurst?: number; // For burst weapons (e.g., rifle)
  burstInterval?: number; // Time between shots in a burst (ms)
  
  shotgunPelletCount?: number; // For shotgun type
  shotgunSpreadAngle?: number; // Spread for shotgun pellets

  smgSpreadAngle?: number; // Slight spread for SMG

  // Wave specific for beam_rifle (Shooter Basic)
  projectileWaveAmplitude?: number;
  projectileWaveFrequency?: number;

  // AI Behavior
  optimalFiringDistanceMin: number;
  optimalFiringDistanceMax: number;
  separationDistance: number; // How much space to keep from other enemies

  // Elite Variant Modifiers
  eliteAttackCooldownMultiplier?: number; // Affects fire rate
  eliteDamageMultiplier?: number; // Affects projectile damage
  eliteProjectileSpeedMultiplier?: number;
  eliteProjectilesInBurstAdd?: number;
  eliteShotgunPelletCountAdd?: number;
  eliteWaveAmplitudeMultiplier?: number;
}

export interface EnemyState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  type: string; // ID of EnemyType
  speed: number; // Current movement speed
  damage: number; // Current projectile damage
  color: string;
  targetY?: number; // Might be used for initial positioning or dynamic vertical adjustment
  horizontalSpeed?: number; // Current horizontal movement speed
  horizontalDirection?: 1 | -1;
  reachedTargetY: boolean; // True if enemy reached its general vertical patrol/engagement zone
  lastAttackTime: number; // Timestamp of the last shot/burst start

  bleeding?: {
    dps: number;
    durationRemaining: number;
    lastTickTime: number;
    sourcePlayerId?: string;
  };

  slowFactor: number;
  lastSlowedTime: number;

  attackState: 'idle' | 'pursuing' | 'aiming' | 'firing' | 'cooldown'; // Updated states
  attackProgressTimer: number; // For timing aiming/telegraph and firing/burst actions
  
  // Burst fire tracking
  currentBurstShotsFired: number;
  lastBurstShotTime: number; // For time between individual shots in a burst

  // Elite properties
  isElite?: boolean;
  deathEffectsProcessed?: boolean;
}

export type ProjectileVisualType = 'square' | 'circle' | 'spark' | 'pellet'; // Added pellet for shotgun

export interface ProjectileState {
  id:string;
  x: number;
  y: number;
  width: number;
  height: number;
  damage: number;
  dx: number;
  dy: number;
  isPlayerProjectile: boolean;
  durability: number;
  color: string;
  effects?: Partial<ProjectileEffects>;
  visualType: ProjectileVisualType;
  spawnTime: number;
  angle?: number;
  isCrit?: boolean; // For damage numbers

  // Properties for specific enemy projectile behaviors if needed beyond basic straight shot
  // Example: Wave from Shooter Basic
  initialY?: number;
  waveAmplitude?: number;
  waveFrequency?: number;
  currentWaveTime?: number;
  // Homing and Gravity were for previous iteration, might be removed if not used by new firearm types
  applyGravity?: boolean;
  gravityValue?: number;
  homingTargetId?: string;
  homingFactor?: number;
}

export interface ProjectileEffects {
  homing?: boolean;
  piercing?: boolean;
  exploding?: boolean;
  fragmentationCount?: number;
}

export enum CardRarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  EPIC = 'Epic',
  ASCENSION = 'Ascension',
  SPECIAL = 'Special'
}

export interface CardEffect {
  stat: keyof PlayerStats | 'playerSize' | 'playerSizeModifier';
  value: number;
  mode: 'add' | 'multiply_base' | 'multiply_total' | 'set';
  description?: string;
}

export interface CardDefinition {
  id: string;
  name: string;
  description: string;
  rarity: CardRarity;
  effects: CardEffect[];
  maxStacks?: number;
  onPickup?: (player: PlayerState) => PlayerState | void;
  cardType?: 'standard' | 'staff_unlock';
  staffToUnlockId?: string;
}

export interface AscensionDefinition extends CardDefinition {
  rarity: CardRarity.ASCENSION;
  baseCardId: string;
  stacksNeeded: number;
}

export interface HatDefinition {
  id: string;
  name: string;
  description: string;
  effects: CardEffect[];
}

export interface StaffDefinition {
  id: string;
  name: string;
  description: string;
  baseDamageModifier?: number;
  baseAttackSpeedModifier?: number;
  projectileType?: string;
  projectileColor?: string;
  projectileVisualType?: ProjectileVisualType;
  projectileBaseSpeed?: number;
  spreadAngle?: number;
  shotCount?: number;
  unlockLevel?: number;
  effects?: CardEffect[];
}

export type GameStatus = 'START_SCREEN' | 'PLAYING' | 'CARD_SELECTION' | 'GAME_OVER' | 'PAUSED';

export interface GameState {
  status: GameStatus;
  player: PlayerState;
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  score: number;
  gameTime: number;
  enemiesKilled: number; // Added to track enemies killed
  lastShotTime: number; // Player's last shot time
  offeredCards: CardDefinition[];
  particleEffects: ParticleEffect[];
  lastEnemySpawnTime: number;
  activeCardIcons: { id: string, count: number, rarity: CardRarity }[];
  mousePosition: { x: number, y: number };
}

export interface ParticleEffect {
  id: string;
  x: number;
  y: number;
  type: 'explosion' | 'hit_spark' | 'level_up' | 'bleed_tick' |
        'thunderbolt_impact' | 'barrier_active' | 'cold_hit' | 'fragment_spawn' |
        'ascension_activate' | 'elite_aura' | 'muzzle_flash' | 'damage_number'; // Added damage_number
  creationTime: number;
  duration: number;
  size: number;
  color: string;
  particleCount?: number;
  particleSpeed?: number;
  particleShape?: 'square' | 'circle' | 'spark';
  fixedPosition?: boolean;
  angle?: number; // For directional muzzle flash
  text?: string; // For damage numbers
  isCritEffect?: boolean; // For damage numbers
}

// Global game constants
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const PLAYER_INITIAL_X = GAME_WIDTH / 2;
export const PLAYER_INITIAL_Y = GAME_HEIGHT - 80;
export const PLAYER_WIDTH = 20;
export const PLAYER_HEIGHT = 30;
export const GRAVITY = 0.7; // Player gravity
export const GROUND_LEVEL = GAME_HEIGHT - 60;
export const ENEMY_MAX_DEPTH_FACTOR = 0.7; // Less relevant now

// Terrain definition (simple blocks)
export interface TerrainBlock {
  x: number;
  y: number;
  width: number;
  height: number;
}
export const TERRAIN_BLOCKS: TerrainBlock[] = [
  { x: 0, y: GAME_HEIGHT - 40, width: GAME_WIDTH, height: 40 },
  { x: 100, y: GAME_HEIGHT - 80, width: 150, height: 40 },
  { x: 300, y: GAME_HEIGHT - 120, width: 100, height: 40 },
  { x: 550, y: GAME_HEIGHT - 80, width: 150, height: 40 },
  { x: 0, y: GAME_HEIGHT - 40, width: 80, height: 40 },
  { x: 0, y: GAME_HEIGHT - 60, width: 60, height: 20 },
  { x: 0, y: GAME_HEIGHT - 80, width: 40, height: 20 },
  { x: 80, y: GAME_HEIGHT - 20, width: 200, height: 20 },
  { x: 280, y: GAME_HEIGHT - 60, width: 120, height: 20 },
  { x: 280, y: GAME_HEIGHT - 40, width: 120, height: 20 },
  { x:GAME_WIDTH - 80, y: GAME_HEIGHT - 40, width: 80, height: 40},
  { x:GAME_WIDTH - 60, y: GAME_HEIGHT - 60, width: 60, height: 20},
  { x:GAME_WIDTH - 40, y: GAME_HEIGHT - 80, width: 40, height: 20},
  { x:GAME_WIDTH - 180, y: GAME_HEIGHT - 60, width: 100, height: 20},
];
