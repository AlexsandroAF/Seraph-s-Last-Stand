
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

export interface EnemyType {
  id: string;
  name: string;
  baseHp: number;
  baseSpeed: number;
  baseDamage: number;
  width: number;
  height: number;
  color: string; // Outline color
  points: number;
  expValue: number;
  attackCooldown?: number; // For enemies that shoot
  projectileSpeed?: number; // Speed of projectiles if the enemy shoots
}

export interface EnemyState {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  type: string; // EnemyType ID
  speed: number;
  damage: number; // Contact damage or projectile damage
  color: string; // Now primarily for outline or specific visual queues, not bg
  targetY?: number; // Y-coordinate where enemy stops descending
  horizontalSpeed?: number;
  horizontalDirection?: 1 | -1;
  reachedTargetY: boolean;
  lastAttackTime?: number; // Timestamp of the last attack for cooldown

  // Stage 1 Card Mechanics
  bleeding?: {
    dps: number;
    durationRemaining: number;
    lastTickTime: number;
    sourcePlayerId?: string; // Optional: if multiple players or sources
  };

  // Stage 2 Card Mechanics
  slowFactor: number; // 0 to coldMaxSlow (e.g., 0 to 0.8 for 80% slow)
  lastSlowedTime: number; // Timestamp for Cold effect duration
}

export type ProjectileVisualType = 'square' | 'circle' | 'spark';

export interface ProjectileState {
  id:string;
  x: number;
  y: number;
  width: number; // Base size, visual size might be affected by type
  height: number; // Base size
  damage: number;
  dx: number; // Velocity x component
  dy: number; // Velocity y component
  isPlayerProjectile: boolean;
  durability: number;
  color: string; // e.g., '#FF0000' for red, used by specific projectile types
  effects?: Partial<ProjectileEffects>;
  visualType: ProjectileVisualType;
  spawnTime: number; // For effects like limited lifespan if needed
  angle?: number; // Optional: store original angle for some effects
  isFragment?: boolean; // For Fragmentation card
}

export interface ProjectileEffects {
  homing?: boolean;
  piercing?: boolean;
  exploding?: boolean;
  fragmentationCount?: number; // Number of fragments on explosion/hit
}

export enum CardRarity {
  COMMON = 'Common',
  UNCOMMON = 'Uncommon',
  EPIC = 'Epic',
  ASCENSION = 'Ascension',
  SPECIAL = 'Special' // For staff unlocks, etc.
}

export interface CardEffect {
  stat: keyof PlayerStats | 'playerSize' | 'playerSizeModifier'; // Allow specific non-stat effects
  value: number;
  mode: 'add' | 'multiply_base' | 'multiply_total' | 'set';
  description?: string; // Optional specific description for this effect
}

export interface CardDefinition {
  id: string;
  name: string;
  description: string;
  rarity: CardRarity;
  effects: CardEffect[];
  maxStacks?: number;
  onPickup?: (player: PlayerState) => PlayerState | void; // For complex logic
  cardType?: 'standard' | 'staff_unlock';
  staffToUnlockId?: string; // If cardType is 'staff_unlock'
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
  // Visuals will be simplified to white outlines, handled in component
}

export interface StaffDefinition {
  id: string;
  name: string;
  description: string;
  baseDamageModifier?: number;
  baseAttackSpeedModifier?: number;
  projectileType?: string; // e.g. 'homing', 'triple', 'beam'
  projectileColor?: string; // Default color for projectiles from this staff
  projectileVisualType?: ProjectileVisualType;
  projectileBaseSpeed?: number;
  spreadAngle?: number; // For multi-shot staffs like Trident
  shotCount?: number; // For multi-shot staffs
  unlockLevel?: number; // Level at which this staff can be offered as an unlock
  effects?: CardEffect[]; // Optional effects applied when this staff is equipped
}

export type GameStatus = 'START_SCREEN' | 'PLAYING' | 'CARD_SELECTION' | 'GAME_OVER' | 'PAUSED';

export interface GameState {
  status: GameStatus;
  player: PlayerState;
  enemies: EnemyState[];
  projectiles: ProjectileState[];
  // wave: number; // Replaced by player level for primary progression
  score: number;
  gameTime: number; // total time elapsed for things like cooldowns
  lastShotTime: number;
  offeredCards: CardDefinition[];
  particleEffects: ParticleEffect[];
  lastEnemySpawnTime: number;
  activeCardIcons: { id: string, count: number, rarity: CardRarity }[]; // For UI display
  mousePosition: { x: number, y: number }; // Relative to game area
}

export interface ParticleEffect {
  id: string;
  x: number;
  y: number;
  type: 'explosion' | 'hit_spark' | 'level_up' | 'bleed_tick' | 'thunderbolt_impact' | 'barrier_active' | 'cold_hit' | 'fragment_spawn' | 'ascension_activate';
  creationTime: number;
  duration: number;
  size: number; // Base size of particles
  color: string; // e.g. '#FFA500'
  particleCount?: number; // Number of individual specks in the effect
  particleSpeed?: number;
  particleShape?: 'square' | 'circle' | 'spark';
  fixedPosition?: boolean; // For particles that should not spread, like barrier
}

// Global game constants
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const PLAYER_INITIAL_X = GAME_WIDTH / 2;
export const PLAYER_INITIAL_Y = GAME_HEIGHT - 80; // Adjusted for terrain
export const PLAYER_WIDTH = 20; // Slimmer player
export const PLAYER_HEIGHT = 30; // Slimmer player
export const GRAVITY = 0.7; // Slightly less floaty
export const GROUND_LEVEL = GAME_HEIGHT - 60; // Adjusted for visible terrain height
export const ENEMY_MAX_DEPTH_FACTOR = 0.7; // Enemies stop around 70% of screen height

// Terrain definition (simple blocks)
export interface TerrainBlock {
  x: number;
  y: number;
  width: number;
  height: number;
}
export const TERRAIN_BLOCKS: TerrainBlock[] = [
  // A simple flat ground with some variations, like the screenshot
  // Main floor
  { x: 0, y: GAME_HEIGHT - 40, width: GAME_WIDTH, height: 40 },
  // Some raised platforms (example)
  { x: 100, y: GAME_HEIGHT - 80, width: 150, height: 40 },
  { x: 300, y: GAME_HEIGHT - 120, width: 100, height: 40 },
  { x: 550, y: GAME_HEIGHT - 80, width: 150, height: 40 },
  // Create a more varied terrain based on screenshot.
  // Left side stairs/blocks
  { x: 0, y: GAME_HEIGHT - 40, width: 80, height: 40 },
  { x: 0, y: GAME_HEIGHT - 60, width: 60, height: 20 },
  { x: 0, y: GAME_HEIGHT - 80, width: 40, height: 20 },

  // Middle low ground
  { x: 80, y: GAME_HEIGHT - 20, width: 200, height: 20 },

  // Central platform
  { x: 280, y: GAME_HEIGHT - 60, width: 120, height: 20 },
  { x: 280, y: GAME_HEIGHT - 40, width: 120, height: 20 },


  // Right side blocks/stairs
  { x:GAME_WIDTH - 80, y: GAME_HEIGHT - 40, width: 80, height: 40},
  { x:GAME_WIDTH - 60, y: GAME_HEIGHT - 60, width: 60, height: 20},
  { x:GAME_WIDTH - 40, y: GAME_HEIGHT - 80, width: 40, height: 20},
  { x:GAME_WIDTH - 180, y: GAME_HEIGHT - 60, width: 100, height: 20}, // platform before stairs
];