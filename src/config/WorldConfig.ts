/**
 * World Configuration for the 7 Deadly Sins worlds
 * Each world has 3 floors, themed around one sin
 */

export enum SinWorld {
  PRIDE = 'pride',
  GREED = 'greed',
  WRATH = 'wrath',
  SLOTH = 'sloth',
  ENVY = 'envy',
  GLUTTONY = 'gluttony',
  LUST = 'lust',
}

export interface WorldColors {
  primary: number;    // Main accent color
  secondary: number;  // Secondary accent
  floor: number;      // Floor tile tint
  wall: number;       // Wall tile tint
  portal: number;     // Portal glow color
}

export interface WorldConfig {
  id: SinWorld;
  name: string;
  subtitle: string;
  description: string;
  floorCount: number;
  enemyTypes: string[];       // Enemy types that spawn in this world
  primaryEnemy: string;       // The sin enemy that dominates (60% spawn rate)
  bossType: string;           // The sin boss class name
  colors: WorldColors;
  portalPosition: { x: number; y: number };  // Position in hub (tile coords)
}

export const WORLD_CONFIGS: Record<SinWorld, WorldConfig> = {
  [SinWorld.PRIDE]: {
    id: SinWorld.PRIDE,
    name: 'Tower of Pride',
    subtitle: 'Where the vain ascend',
    description: 'Golden spires reaching toward heaven, built by those who thought themselves gods.',
    floorCount: 3,
    enemyTypes: ['PrideEnemy', 'TankEnemy', 'RangedEnemy'],
    primaryEnemy: 'PrideEnemy',
    bossType: 'PrideBoss',
    colors: {
      primary: 0xffd700,   // Gold
      secondary: 0xf5f5dc, // Beige
      floor: 0x4a4520,     // Dark gold floor
      wall: 0x3d3818,      // Darker gold wall
      portal: 0xffd700,
    },
    portalPosition: { x: 8, y: 3 },
  },

  [SinWorld.GREED]: {
    id: SinWorld.GREED,
    name: 'Vaults of Greed',
    subtitle: 'Never enough',
    description: 'Endless treasuries where the avaricious hoard what they can never spend.',
    floorCount: 3,
    enemyTypes: ['GreedEnemy', 'FastEnemy', 'BasicEnemy'],
    primaryEnemy: 'GreedEnemy',
    bossType: 'GreedBoss',
    colors: {
      primary: 0x22c55e,   // Green
      secondary: 0xffd700, // Gold accents
      floor: 0x1a3d1a,     // Dark green floor
      wall: 0x152d15,      // Darker green wall
      portal: 0x22c55e,
    },
    portalPosition: { x: 16, y: 3 },
  },

  [SinWorld.WRATH]: {
    id: SinWorld.WRATH,
    name: 'Inferno of Wrath',
    subtitle: 'Burn with fury',
    description: 'Flames of rage consume all reason, leaving only destruction.',
    floorCount: 3,
    enemyTypes: ['WrathEnemy', 'FastEnemy', 'TankEnemy'],
    primaryEnemy: 'WrathEnemy',
    bossType: 'WrathBoss',
    colors: {
      primary: 0xdc2626,   // Red
      secondary: 0xf97316, // Orange
      floor: 0x3d1515,     // Dark red floor
      wall: 0x2d1010,      // Darker red wall
      portal: 0xdc2626,
    },
    portalPosition: { x: 20, y: 8 },
  },

  [SinWorld.SLOTH]: {
    id: SinWorld.SLOTH,
    name: 'Mire of Sloth',
    subtitle: 'Time stands still',
    description: 'A fog of lethargy where ambition goes to die.',
    floorCount: 3,
    enemyTypes: ['SlothEnemy', 'TankEnemy', 'BasicEnemy'],
    primaryEnemy: 'SlothEnemy',
    bossType: 'SlothBoss',
    colors: {
      primary: 0x6b7280,   // Gray
      secondary: 0x60a5fa, // Pale blue
      floor: 0x2a2d33,     // Dark gray floor
      wall: 0x1f2227,      // Darker gray wall
      portal: 0x9ca3af,
    },
    portalPosition: { x: 4, y: 14 },
  },

  [SinWorld.ENVY]: {
    id: SinWorld.ENVY,
    name: 'Shadows of Envy',
    subtitle: 'What others have',
    description: 'Darkness where souls covet what can never be theirs.',
    floorCount: 3,
    enemyTypes: ['EnvyEnemy', 'FastEnemy', 'RangedEnemy'],
    primaryEnemy: 'EnvyEnemy',
    bossType: 'EnvyBoss',
    colors: {
      primary: 0x16a34a,   // Dark green
      secondary: 0x1f2937, // Dark shadow
      floor: 0x1a2d1a,     // Very dark green floor
      wall: 0x0f1f0f,      // Near-black green wall
      portal: 0x22c55e,
    },
    portalPosition: { x: 20, y: 14 },
  },

  [SinWorld.GLUTTONY]: {
    id: SinWorld.GLUTTONY,
    name: 'Pits of Gluttony',
    subtitle: 'Consume everything',
    description: 'An endless feast for those who can never be satisfied.',
    floorCount: 3,
    enemyTypes: ['GluttonyEnemy', 'TankEnemy', 'BasicEnemy'],
    primaryEnemy: 'GluttonyEnemy',
    bossType: 'GluttonyBoss',
    colors: {
      primary: 0xfbbf24,   // Amber/Orange
      secondary: 0xf59e0b, // Darker amber
      floor: 0x3d3015,     // Dark amber floor
      wall: 0x2d2410,      // Darker amber wall
      portal: 0xfbbf24,
    },
    portalPosition: { x: 12, y: 17 },
  },

  [SinWorld.LUST]: {
    id: SinWorld.LUST,
    name: 'Gardens of Lust',
    subtitle: 'Desire without end',
    description: 'Seductive beauty masks the chains that bind the heart.',
    floorCount: 3,
    enemyTypes: ['LustEnemy', 'FastEnemy', 'RangedEnemy'],
    primaryEnemy: 'LustEnemy',
    bossType: 'LustBoss',
    colors: {
      primary: 0xec4899,   // Pink
      secondary: 0xfce7f3, // Light pink
      floor: 0x3d1530,     // Dark magenta floor
      wall: 0x2d1025,      // Darker magenta wall
      portal: 0xec4899,
    },
    portalPosition: { x: 4, y: 8 },
  },
};

// Helper to get world config by ID
export function getWorldConfig(world: SinWorld): WorldConfig {
  const config = WORLD_CONFIGS[world];
  // Defensive check: return PRIDE config as fallback if world not found
  if (!config) {
    console.warn(`[WorldConfig] Unknown world: ${world}, using PRIDE as fallback`);
    return WORLD_CONFIGS[SinWorld.PRIDE];
  }
  return config;
}

// Get all world IDs in display order
export function getAllWorlds(): SinWorld[] {
  return [
    SinWorld.PRIDE,
    SinWorld.GREED,
    SinWorld.WRATH,
    SinWorld.SLOTH,
    SinWorld.ENVY,
    SinWorld.GLUTTONY,
    SinWorld.LUST,
  ];
}

// Total floors across all worlds
export const TOTAL_FLOORS = Object.values(WORLD_CONFIGS).reduce(
  (sum, config) => sum + config.floorCount,
  0
);
