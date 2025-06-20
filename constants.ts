
import { CardDefinition, CardRarity, HatDefinition, StaffDefinition, AscensionDefinition, PlayerStats, EnemyType, ProjectileVisualType } from './types';

// --- EXP & LEVELING ---
export const BASE_EXP_TO_NEXT_LEVEL = 100;
export const EXP_PER_LEVEL_SCALER = 1.2; // Each level needs 20% more EXP than the last

// --- HATS --- (Visuals simplified to white outlines in component)
export const HATS: HatDefinition[] = [
  {
    id: 'wizard_hat',
    name: "Wizard's Hat",
    description: "A cool pointy hat. No special effects.",
    effects: [],
  },
  {
    id: 'propeller_beanie',
    name: "Propeller Beanie",
    description: "Grants +1 jump.",
    effects: [{ stat: 'jumps', value: 1, mode: 'add' }],
  },
  {
    id: 'helmet',
    name: "Helmet",
    description: "+10% defense, -10% movement speed.",
    effects: [
        { stat: 'defense', value: 0.10, mode: 'add' },
        { stat: 'movementSpeed', value: 0.9, mode: 'multiply_base' }
    ],
  }
];

// --- STAFFS ---
export const STAFFS: StaffDefinition[] = [
  {
    id: 'wizard_staff',
    name: "Wizard's Staff",
    description: "Shoots a standard magical projectile.",
    projectileColor: '#FFFF00', // Yellow
    projectileVisualType: 'square',
    projectileBaseSpeed: 10,
    shotCount: 1,
  },
  {
    id: 'emerald_staff',
    name: "Emerald Staff",
    description: "Shoots faster, weaker homing projectiles.",
    baseDamageModifier: 0.6,
    baseAttackSpeedModifier: 0.7, // 30% faster
    projectileType: 'homing_placeholder', // Placeholder for actual homing logic
    projectileColor: '#00FF00', // Green
    projectileVisualType: 'circle',
    projectileBaseSpeed: 12,
    shotCount: 1,
    unlockLevel: 3,
  },
  {
    id: 'trident_staff',
    name: "Trident",
    description: "Shoots 3 projectiles in a spread.",
    baseAttackSpeedModifier: 1.15, // Slightly slower
    projectileType: 'multishot', 
    projectileColor: '#00FFFF', // Cyan
    projectileVisualType: 'spark',
    projectileBaseSpeed: 9,
    shotCount: 3,
    spreadAngle: 0.35, // Radians for spread (approx 20 degrees)
    unlockLevel: 5,
  },
  {
    id: 'boomstaff',
    name: "Boomstaff",
    description: "Shoots explosive projectiles.",
    baseDamageModifier: 1.2, // Higher base for explosion
    baseAttackSpeedModifier: 1.2, // Slower due to power
    projectileType: 'exploding_placeholder',
    projectileColor: '#FF0000', // Red
    projectileVisualType: 'square',
    projectileBaseSpeed: 8,
    shotCount: 1,
    unlockLevel: 7,
  }
];

// --- CARDS ---

// --- Stage 2 Card Constants ---
export const BARRIER_COOLDOWN_BASE = 8000; // ms
export const BARRIER_HITS_BASE = 1;
export const THUNDERBOLT_DAMAGE_BASE = 10;
export const THUNDERBOLT_INTERVAL_BASE = 5000; // ms
export const THUNDERBOLT_COUNT = 2;
export const THUNDERBOLT_RADIUS = 50; // pixels
export const FRAGMENTATION_COUNT_BASE = 2;
export const FRAGMENTATION_PROJECTILE_SPEED = 5;
export const FRAGMENTATION_PROJECTILE_SIZE_MULTIPLIER = 0.6;
export const FRAGMENTATION_DAMAGE_MULTIPLIER_BASE = 0.4;
export const COLD_SLOW_FACTOR_BASE = 0.01; // 1% slow per hit
export const COLD_MAX_SLOW_BASE = 0.8; // Max 80% slow
export const COLD_EFFECT_DURATION = 3000; // ms, how long the slow effect lasts per stack without refresh

// --- Stage 3 Ascension Constants ---
export const PROTECTOR_PROJECTILE_COUNT_ASCENSION = 8;
export const PROTECTOR_PROJECTILE_DAMAGE_MULTIPLIER_ASCENSION = 0.3; // 30% of player's base damage
export const ASCENSION_ACTIVATE_COLOR = '#FFD700'; // Gold


// Stage 1 Added Cards
const STAGE1_COMMON_CARDS: CardDefinition[] = [
  { id: 'renew_common', name: 'Renew', description: 'Heal to Max. HP.', rarity: CardRarity.COMMON, effects: [], onPickup: (player) => { player.currentHp = player.maxHp; } },
  { id: 'resist_common', name: 'Resist', description: 'Defense +4%.', rarity: CardRarity.COMMON, effects: [{ stat: 'defense', value: 0.04, mode: 'add' }] },
  { id: 'stability_common', name: 'Stability', description: 'Projectile takes +1 hit before exploding/disappearing.', rarity: CardRarity.COMMON, effects: [{ stat: 'projectileDurability', value: 1, mode: 'add' }] },
];

const STAGE1_UNCOMMON_CARDS: CardDefinition[] = [
  { id: 'rage_uncommon', name: 'Rage', description: 'If under 50% HP, raises your projectile and body damage accordingly (up to +50%).', rarity: CardRarity.UNCOMMON, effects: [], onPickup: (player) => { player.hasRageActive = true; } },
  { id: 'shrink_uncommon', name: 'Shrink', description: 'Makes you 10% smaller.', rarity: CardRarity.UNCOMMON, effects: [{ stat: 'playerSizeModifier', value: 0.9, mode: 'multiply_base' }] },
];

const STAGE1_EPIC_CARDS: CardDefinition[] = [
 { id: 'wound_epic', name: 'Wound', description: 'Dealing damage applies bleeding to the enemy (2 DPS for 3s).', rarity: CardRarity.EPIC, effects: [], onPickup: (player) => { player.appliesBleed = true; player.bleedDps = 2; player.bleedDuration = 3000; } },
];

// Stage 2 Added Cards
const STAGE2_UNCOMMON_CARDS: CardDefinition[] = [
  { 
    id: 'fragmentation_uncommon', name: 'Fragmentation', 
    description: `When killed, enemies release ${FRAGMENTATION_COUNT_BASE} weaker projectiles in random directions.`, 
    rarity: CardRarity.UNCOMMON, effects: [], 
    onPickup: (player) => { 
      player.hasFragmentation = true; 
      player.fragmentationCount = (player.fragmentationCount || 0) + FRAGMENTATION_COUNT_BASE; 
      player.fragmentationDamageMultiplier = player.fragmentationDamageMultiplier ?? FRAGMENTATION_DAMAGE_MULTIPLIER_BASE;
    } 
  },
  { 
    id: 'thunderbolt_uncommon', name: 'Thunderbolt', 
    description: `Calls ${THUNDERBOLT_COUNT} thunderbolts from the skies every ${THUNDERBOLT_INTERVAL_BASE / 1000} seconds.`, 
    rarity: CardRarity.UNCOMMON, effects: [], 
    onPickup: (player) => { 
      player.triggersThunderbolts = true; 
      player.thunderboltDamage = (player.thunderboltDamage ?? THUNDERBOLT_DAMAGE_BASE); 
      player.thunderboltInterval = player.thunderboltInterval || THUNDERBOLT_INTERVAL_BASE; 
      player.lastThunderboltTime = Date.now(); 
    } 
  },
];

const STAGE2_EPIC_CARDS: CardDefinition[] = [
  { 
    id: 'appraisal_epic', name: 'Appraisal', 
    description: '+1 item choice from now on.', 
    rarity: CardRarity.EPIC, effects: [{ stat: 'appraisalStacks', value: 1, mode: 'add' }],
    maxStacks: 2, 
  },
  { 
    id: 'barrier_epic_stage2', name: 'Barrier', 
    description: `Creates a shield that blocks ${BARRIER_HITS_BASE} damage once every ${BARRIER_COOLDOWN_BASE / 1000} seconds.`, 
    rarity: CardRarity.EPIC, effects: [], 
    onPickup: (player) => { 
      player.hasBarrier = true; 
      player.barrierCooldown = player.barrierCooldown || BARRIER_COOLDOWN_BASE; 
      player.barrierHitsRemaining = (player.barrierHitsRemaining || 0) + BARRIER_HITS_BASE;
      player.lastBarrierActivationTime = Date.now() - (player.barrierCooldown || BARRIER_COOLDOWN_BASE); 
    } 
  },
  { 
    id: 'cold_epic', name: 'Cold', 
    description: `Enemies get ${COLD_SLOW_FACTOR_BASE*100}% slower every time they take damage (up to ${COLD_MAX_SLOW_BASE*100}%).`, 
    rarity: CardRarity.EPIC, effects: [], 
    onPickup: (player) => { 
      player.appliesCold = true; 
      player.coldSlowFactor = (player.coldSlowFactor ?? COLD_SLOW_FACTOR_BASE);
      player.coldMaxSlow = player.coldMaxSlow ?? COLD_MAX_SLOW_BASE;
    } 
  },
];


const COMMON_CARDS: CardDefinition[] = [
  { id: 'catalyst_common', name: 'Minor Catalyst', description: 'Projectile damage +1', rarity: CardRarity.COMMON, effects: [{ stat: 'damage', value: 1, mode: 'add' }] },
  { id: 'growth_common', name: 'Minor Growth', description: 'Max HP +5', rarity: CardRarity.COMMON, effects: [{ stat: 'maxHp', value: 5, mode: 'add' }] },
  { id: 'resonance_common', name: 'Minor Resonance', description: 'Attack speed +8%', rarity: CardRarity.COMMON, effects: [{ stat: 'attackSpeed', value: 0.92, mode: 'multiply_base' }] },
  { id: 'swift_common', name: 'Minor Swiftness', description: 'Movement speed +10%', rarity: CardRarity.COMMON, effects: [{ stat: 'movementSpeed', value: 1.1, mode: 'multiply_base' }] },
  { id: 'eyesight_common', name: 'Keen Eyes', description: 'Crit chance +3%', rarity: CardRarity.COMMON, effects: [{ stat: 'critChance', value: 0.03, mode: 'add' }] },
  ...STAGE1_COMMON_CARDS,
];

const UNCOMMON_CARDS: CardDefinition[] = [
  { id: 'catalyst_uncommon', name: 'Catalyst', description: 'Projectile damage +3', rarity: CardRarity.UNCOMMON, effects: [{ stat: 'damage', value: 3, mode: 'add' }] },
  { id: 'growth_uncommon', name: 'Growth', description: 'Max HP +15', rarity: CardRarity.UNCOMMON, effects: [{ stat: 'maxHp', value: 15, mode: 'add' }] },
  { id: 'gush_uncommon', name: 'Gush', description: 'Adds +1 jump', rarity: CardRarity.UNCOMMON, effects: [{ stat: 'jumps', value: 1, mode: 'add' }], maxStacks: 4 }, // Max 5 jumps total with base
  { id: 'leech_uncommon', name: 'Leeching Strike', description: '1% Lifesteal', rarity: CardRarity.UNCOMMON, effects: [{ stat: 'lifesteal', value: 0.01, mode: 'add' }] },
  { id: 'cloak_uncommon', name: 'Shadow Cloak', description: '0.2s longer invulnerability after damage.', rarity: CardRarity.UNCOMMON, effects: [], onPickup: (player) => { /* Logic in game tick when damage is taken */ } },
  { id: 'charge_uncommon', name: 'Impact Charge', description: 'Projectile size +10%', rarity: CardRarity.UNCOMMON, effects: [{ stat: 'projectileSize', value: 1.1, mode: 'multiply_base' }] },
  ...STAGE1_UNCOMMON_CARDS,
  ...STAGE2_UNCOMMON_CARDS,
];

const EPIC_CARDS: CardDefinition[] = [
  { id: 'tome_epic', name: 'Ancient Tome', description: 'Common card effects +20%. (Simplified: Global +3% dmg, +5 MaxHP)', rarity: CardRarity.EPIC, effects: [{ stat: 'damage', value: 1.03, mode: 'multiply_total' }, { stat: 'maxHp', value: 1.03, mode: 'multiply_total'}] },
  { id: 'will_o_wisp_epic', name: 'Will-O-Wisp', description: 'Summons a helpful wisp. (Simplified: +8% attack speed)', rarity: CardRarity.EPIC, effects: [{ stat: 'attackSpeed', value: 0.92, mode: 'multiply_base' }] },
  { id: 'crit_mastery_epic', name: 'Critical Mastery', description: 'Crit Damage +50%', rarity: CardRarity.EPIC, effects: [{ stat: 'critDamage', value: 0.5, mode: 'add'}] },
  ...STAGE1_EPIC_CARDS,
  ...STAGE2_EPIC_CARDS,
];

const STAGE3_ASCENSION_CARDS: AscensionDefinition[] = [
    { 
        id: 'bloody_mage_ascension', name: 'Bloody Mage', 
        description: 'O sangramento agora causa 50% mais dano por tick do valor base do Wound.', 
        rarity: CardRarity.ASCENSION, baseCardId: 'wound_epic', stacksNeeded: 2, 
        effects: [{ stat: 'bleedDps', value: 1, mode: 'add' }] // Assumes base Wound DPS is 2, so +1 DPS
    },
    {
        id: 'freezer_ascension', name: 'Freezer',
        description: 'Agora pode desacelerar inimigos em até 100%. Inimigos totalmente desacelerados têm 1% de chance de serem instantaneamente derrotados ao sofrerem qualquer dano.',
        rarity: CardRarity.ASCENSION, baseCardId: 'cold_epic', stacksNeeded: 2,
        effects: [
            { stat: 'coldMaxSlow', value: 1.0, mode: 'set' },
            { stat: 'instaKillOnMaxSlowChance', value: 0.01, mode: 'set' }
        ]
    },
    {
        id: 'god_of_thunder_ascension', name: 'God of Thunder',
        description: 'Seus raios causam 3x mais dano.',
        rarity: CardRarity.ASCENSION, baseCardId: 'thunderbolt_uncommon', stacksNeeded: 3,
        effects: [{ stat: 'thunderboltDamage', value: 3, mode: 'multiply_total'}]
    },
    {
        id: 'protector_ascension', name: 'Protector',
        description: `Quando sua barreira quebra, dispara ${PROTECTOR_PROJECTILE_COUNT_ASCENSION} projéteis ao seu redor.`,
        rarity: CardRarity.ASCENSION, baseCardId: 'barrier_epic_stage2', stacksNeeded: 2,
        effects: [
            { stat: 'barrierBreakProjectileCount', value: PROTECTOR_PROJECTILE_COUNT_ASCENSION, mode: 'set' },
            { stat: 'barrierBreakProjectileDamageMultiplier', value: PROTECTOR_PROJECTILE_DAMAGE_MULTIPLIER_ASCENSION, mode: 'set' }
        ]
    },
    {
        id: 'ram_destroyer_ascension', name: 'RAM Destroyer',
        description: 'Inimigos agora liberam +4 projéteis de fragmentação e esses projéteis causam +25% de dano.',
        rarity: CardRarity.ASCENSION, baseCardId: 'fragmentation_uncommon', stacksNeeded: 2,
        effects: [
            { stat: 'fragmentationCount', value: 4, mode: 'add'},
            { stat: 'fragmentationDamageMultiplier', value: 0.25, mode: 'add'}
        ]
    }
];


const INITIAL_ASCENSION_CARDS: AscensionDefinition[] = [
  { id: 'flying_sorcerer', name: 'Flying Sorcerer', description: 'Infinite jumps.', rarity: CardRarity.ASCENSION, baseCardId: 'gush_uncommon', stacksNeeded: 4, effects: [{ stat: 'jumps', value: 999, mode: 'set' }] },
];

export const ALL_CARDS_POOL: CardDefinition[] = [...COMMON_CARDS, ...UNCOMMON_CARDS, ...EPIC_CARDS];
export const ALL_ASCENSIONS: AscensionDefinition[] = [...INITIAL_ASCENSION_CARDS, ...STAGE3_ASCENSION_CARDS];

// --- Initial Player Stats (base values) ---
export const BASE_PLAYER_STATS: PlayerStats = {
  maxHp: 50, // Lower starting HP
  currentHp: 50,
  damage: 5, // Lower starting damage
  attackSpeed: 525, // ms per shot (buffed from 600)
  movementSpeed: 4,
  jumpStrength: 13,
  jumps: 1,
  currentJumps: 1,
  critChance: 0.05,
  critDamage: 1.5,
  defense: 0,
  lifesteal: 0,
  projectileDurability: 1,
  projectileSize: 1,
  isInvulnerable: false,
  invulnerabilityEndTime: 0,
  // New
  level: 1,
  exp: 0,
  expToNextLevel: BASE_EXP_TO_NEXT_LEVEL,
  // Stage 1
  playerSizeModifier: 1,
  appliesBleed: false,
  bleedDps: 0,
  bleedDuration: 0,
  // Stage 2
  appraisalStacks: 0,
  hasBarrier: false,
  barrierCooldown: BARRIER_COOLDOWN_BASE,
  lastBarrierActivationTime: 0,
  barrierHitsRemaining: 0,
  appliesCold: false,
  coldSlowFactor: COLD_SLOW_FACTOR_BASE,
  coldMaxSlow: COLD_MAX_SLOW_BASE,
  triggersThunderbolts: false,
  thunderboltDamage: THUNDERBOLT_DAMAGE_BASE,
  thunderboltInterval: THUNDERBOLT_INTERVAL_BASE,
  lastThunderboltTime: 0,
  hasFragmentation: false,
  fragmentationCount: FRAGMENTATION_COUNT_BASE,
  fragmentationDamageMultiplier: FRAGMENTATION_DAMAGE_MULTIPLIER_BASE,
  // Stage 3
  instaKillOnMaxSlowChance: 0,
  barrierBreakProjectileCount: 0,
  barrierBreakProjectileDamageMultiplier: 0,
};

// --- Enemy types ---
export const ENEMY_TYPES: Record<string, EnemyType> = {
  grunt_standard: {
    id: 'grunt_standard',
    name: 'Standard Grunt',
    baseHp: 20,
    baseSpeed: 1,
    baseDamage: 5,
    width: 25, 
    height: 25,
    color: '#2ECC71', // Emerald Green
    points: 5,
    expValue: 10,
  },
  grunt_fast: {
    id: 'grunt_fast',
    name: 'Fast Grunt',
    baseHp: 15,
    baseSpeed: 2, // Keep fast
    baseDamage: 4,
    width: 20,
    height: 20,
    color: '#3498DB', // Peter River Blue
    points: 8,
    expValue: 15,
  },
  grunt_tough: {
    id: 'grunt_tough',
    name: 'Tough Grunt',
    baseHp: 50,
    baseSpeed: 0.8, // Base speed, can be modified by AI
    baseDamage: 8,
    width: 30,
    height: 30,
    color: '#7F8C8D', // Asbestos Grey
    points: 12,
    expValue: 25,
  },
  shooter_basic: {
    id: 'shooter_basic',
    name: 'Basic Shooter',
    baseHp: 25,
    baseSpeed: 0.7, // Slower horizontal patrol
    baseDamage: 6, // Projectile damage
    width: 28,
    height: 28,
    color: '#E67E22', // Carrot Orange
    points: 10,
    expValue: 20,
    attackCooldown: 2200, // ms
    projectileSpeed: 4.5, // Added
  }
};

// --- Game Configuration ---
export const ENEMY_SPAWN_INTERVAL_MIN = 2000; // Minimum ms between spawns
export const ENEMY_SPAWN_INTERVAL_MAX = 4000; // Maximum ms between spawns
export const MAX_ENEMIES_ON_SCREEN_BASE = 5;
export const MAX_ENEMIES_ON_SCREEN_PER_LEVEL = 1;

export const ENEMY_HP_SCALING_PER_LEVEL = 1.15;
export const ENEMY_DAMAGE_SCALING_PER_LEVEL = 1.08;
export const ENEMY_EXP_SCALING_PER_LEVEL = 1.1;

export const CARD_CHOICES_COUNT = 3; // Base number of choices

export const PLAYER_INITIAL_HAT_ID = 'wizard_hat';
export const PLAYER_INITIAL_STAFF_ID = 'wizard_staff';
export const STAFF_VISUAL_LENGTH = 25; // Length of the staff visual from player center

// --- Enemy AI & Projectile Constants ---
export const SHOOTER_ATTACK_RANGE = 350; // pixels, increased range
export const ENEMY_PROJECTILE_COLOR = '#FF00FF'; // Magenta
export const ENEMY_PROJECTILE_SIZE = 7; // pixels
export const ENEMY_PROJECTILE_VISUAL_TYPE: ProjectileVisualType = 'circle';
export const GRUNT_TOUGH_AGGRO_RANGE = 220; // pixels, increased range
export const GRUNT_TOUGH_AGGRO_SPEED_MULTIPLIER = 1.25; // Slightly faster when aggroed
export const SHOOTER_PATROL_SPEED_MULTIPLIER = 0.5; // Slower horizontal movement when patrolling
export const SHOOTER_ATTACKING_SPEED_MULTIPLIER = 0.1; // Very slow when in attack range

// --- Wound Card Constants ---
export const BLEED_TICK_INTERVAL = 1000; // ms
export const BLEED_PARTICLE_COLOR = '#8B0000'; // Dark Red

// --- Stage 2 Particle Colors ---
export const THUNDERBOLT_COLOR = '#FFFF00'; // Yellow
export const BARRIER_ACTIVE_COLOR = '#00FFFF'; // Cyan
export const COLD_HIT_COLOR = '#ADD8E6'; // Light Blue
export const FRAGMENT_SPAWN_COLOR = '#FFA500'; // Orange