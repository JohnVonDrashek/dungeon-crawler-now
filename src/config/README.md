# Config Directory

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Game Config](https://img.shields.io/badge/Game-Configuration-purple)

This directory contains configuration files that define the core game data structures. The primary file is `WorldConfig.ts`, which defines the Seven Deadly Sins worlds that form the backbone of the dungeon crawler's progression system.

## Files

| File | Description |
|------|-------------|
| `WorldConfig.ts` | Defines all 7 sin-themed worlds, their visual styles, enemies, and bosses |

---

## WorldConfig.ts

### Purpose

`WorldConfig.ts` is the central configuration file for the game's world system. It defines:

- The `SinWorld` enum identifying each of the 7 worlds
- The `WorldConfig` interface structure for world metadata
- Complete configurations for all 7 sin-themed dungeons
- Helper functions for accessing world data

### SinWorld Enum

```typescript
export enum SinWorld {
  PRIDE = 'pride',
  GREED = 'greed',
  WRATH = 'wrath',
  SLOTH = 'sloth',
  ENVY = 'envy',
  GLUTTONY = 'gluttony',
  LUST = 'lust',
}
```

---

## Interface Structures

### WorldColors

Defines the color palette for each world's visual theming:

```typescript
export interface WorldColors {
  primary: number;    // Main accent color (hex)
  secondary: number;  // Secondary accent (hex)
  floor: number;      // Floor tile tint (hex)
  wall: number;       // Wall tile tint (hex)
  portal: number;     // Portal glow color (hex)
}
```

### WorldConfig

Complete configuration for a single world:

```typescript
export interface WorldConfig {
  id: SinWorld;                              // Enum identifier
  name: string;                              // Display name
  subtitle: string;                          // Tagline shown in UI
  description: string;                       // Lore description
  floorCount: number;                        // Number of dungeon floors (always 3)
  enemyTypes: string[];                      // Enemy classes that can spawn
  primaryEnemy: string;                      // Dominant enemy (60% spawn rate)
  bossType: string;                          // Boss class name for final floor
  colors: WorldColors;                       // Visual color palette
  portalPosition: { x: number; y: number };  // Hub portal location (tile coords)
}
```

---

## World Configurations

### Pride - Tower of Pride

| Property | Value |
|----------|-------|
| **Name** | Tower of Pride |
| **Subtitle** | "Where the vain ascend" |
| **Description** | Golden spires reaching toward heaven, built by those who thought themselves gods. |
| **Floors** | 3 |
| **Enemies** | `PrideEnemy`, `TankEnemy`, `RangedEnemy` |
| **Primary Enemy** | `PrideEnemy` |
| **Boss** | `PrideBoss` |
| **Portal Position** | (8, 3) |

**Colors:**
| Color | Hex | Description |
|-------|-----|-------------|
| Primary | `0xffd700` | Gold |
| Secondary | `0xf5f5dc` | Beige |
| Floor | `0x4a4520` | Dark gold |
| Wall | `0x3d3818` | Darker gold |
| Portal | `0xffd700` | Gold |

---

### Greed - Vaults of Greed

| Property | Value |
|----------|-------|
| **Name** | Vaults of Greed |
| **Subtitle** | "Never enough" |
| **Description** | Endless treasuries where the avaricious hoard what they can never spend. |
| **Floors** | 3 |
| **Enemies** | `GreedEnemy`, `FastEnemy`, `BasicEnemy` |
| **Primary Enemy** | `GreedEnemy` |
| **Boss** | `GreedBoss` |
| **Portal Position** | (16, 3) |

**Colors:**
| Color | Hex | Description |
|-------|-----|-------------|
| Primary | `0x22c55e` | Green |
| Secondary | `0xffd700` | Gold accents |
| Floor | `0x1a3d1a` | Dark green |
| Wall | `0x152d15` | Darker green |
| Portal | `0x22c55e` | Green |

---

### Wrath - Inferno of Wrath

| Property | Value |
|----------|-------|
| **Name** | Inferno of Wrath |
| **Subtitle** | "Burn with fury" |
| **Description** | Flames of rage consume all reason, leaving only destruction. |
| **Floors** | 3 |
| **Enemies** | `WrathEnemy`, `FastEnemy`, `TankEnemy` |
| **Primary Enemy** | `WrathEnemy` |
| **Boss** | `WrathBoss` |
| **Portal Position** | (20, 8) |

**Colors:**
| Color | Hex | Description |
|-------|-----|-------------|
| Primary | `0xdc2626` | Red |
| Secondary | `0xf97316` | Orange |
| Floor | `0x3d1515` | Dark red |
| Wall | `0x2d1010` | Darker red |
| Portal | `0xdc2626` | Red |

---

### Sloth - Mire of Sloth

| Property | Value |
|----------|-------|
| **Name** | Mire of Sloth |
| **Subtitle** | "Time stands still" |
| **Description** | A fog of lethargy where ambition goes to die. |
| **Floors** | 3 |
| **Enemies** | `SlothEnemy`, `TankEnemy`, `BasicEnemy` |
| **Primary Enemy** | `SlothEnemy` |
| **Boss** | `SlothBoss` |
| **Portal Position** | (4, 14) |

**Colors:**
| Color | Hex | Description |
|-------|-----|-------------|
| Primary | `0x6b7280` | Gray |
| Secondary | `0x60a5fa` | Pale blue |
| Floor | `0x2a2d33` | Dark gray |
| Wall | `0x1f2227` | Darker gray |
| Portal | `0x9ca3af` | Light gray |

---

### Envy - Shadows of Envy

| Property | Value |
|----------|-------|
| **Name** | Shadows of Envy |
| **Subtitle** | "What others have" |
| **Description** | Darkness where souls covet what can never be theirs. |
| **Floors** | 3 |
| **Enemies** | `EnvyEnemy`, `FastEnemy`, `RangedEnemy` |
| **Primary Enemy** | `EnvyEnemy` |
| **Boss** | `EnvyBoss` |
| **Portal Position** | (20, 14) |

**Colors:**
| Color | Hex | Description |
|-------|-----|-------------|
| Primary | `0x16a34a` | Dark green |
| Secondary | `0x1f2937` | Dark shadow |
| Floor | `0x1a2d1a` | Very dark green |
| Wall | `0x0f1f0f` | Near-black green |
| Portal | `0x22c55e` | Green |

---

### Gluttony - Pits of Gluttony

| Property | Value |
|----------|-------|
| **Name** | Pits of Gluttony |
| **Subtitle** | "Consume everything" |
| **Description** | An endless feast for those who can never be satisfied. |
| **Floors** | 3 |
| **Enemies** | `GluttonyEnemy`, `TankEnemy`, `BasicEnemy` |
| **Primary Enemy** | `GluttonyEnemy` |
| **Boss** | `GluttonyBoss` |
| **Portal Position** | (12, 17) |

**Colors:**
| Color | Hex | Description |
|-------|-----|-------------|
| Primary | `0xfbbf24` | Amber/Orange |
| Secondary | `0xf59e0b` | Darker amber |
| Floor | `0x3d3015` | Dark amber |
| Wall | `0x2d2410` | Darker amber |
| Portal | `0xfbbf24` | Amber |

---

### Lust - Gardens of Lust

| Property | Value |
|----------|-------|
| **Name** | Gardens of Lust |
| **Subtitle** | "Desire without end" |
| **Description** | Seductive beauty masks the chains that bind the heart. |
| **Floors** | 3 |
| **Enemies** | `LustEnemy`, `FastEnemy`, `RangedEnemy` |
| **Primary Enemy** | `LustEnemy` |
| **Boss** | `LustBoss` |
| **Portal Position** | (4, 8) |

**Colors:**
| Color | Hex | Description |
|-------|-----|-------------|
| Primary | `0xec4899` | Pink |
| Secondary | `0xfce7f3` | Light pink |
| Floor | `0x3d1530` | Dark magenta |
| Wall | `0x2d1025` | Darker magenta |
| Portal | `0xec4899` | Pink |

---

## Helper Functions

### getWorldConfig

Retrieves the configuration for a specific world:

```typescript
import { SinWorld, getWorldConfig } from '../config/WorldConfig';

const prideConfig = getWorldConfig(SinWorld.PRIDE);
console.log(prideConfig.name); // "Tower of Pride"
```

### getAllWorlds

Returns all world IDs in display order:

```typescript
import { getAllWorlds } from '../config/WorldConfig';

const worlds = getAllWorlds();
// [SinWorld.PRIDE, SinWorld.GREED, SinWorld.WRATH, SinWorld.SLOTH,
//  SinWorld.ENVY, SinWorld.GLUTTONY, SinWorld.LUST]
```

### TOTAL_FLOORS

Constant representing the total number of floors across all worlds (21 floors total):

```typescript
import { TOTAL_FLOORS } from '../config/WorldConfig';

console.log(TOTAL_FLOORS); // 21
```

---

## Adding a New World

To add a new world (e.g., an 8th sin or bonus world):

### Step 1: Add to SinWorld Enum

```typescript
export enum SinWorld {
  PRIDE = 'pride',
  GREED = 'greed',
  WRATH = 'wrath',
  SLOTH = 'sloth',
  ENVY = 'envy',
  GLUTTONY = 'gluttony',
  LUST = 'lust',
  NEW_WORLD = 'new_world',  // Add new entry
}
```

### Step 2: Add Configuration to WORLD_CONFIGS

```typescript
[SinWorld.NEW_WORLD]: {
  id: SinWorld.NEW_WORLD,
  name: 'Realm of New World',
  subtitle: 'Your tagline here',
  description: 'Lore description for the world.',
  floorCount: 3,
  enemyTypes: ['NewWorldEnemy', 'BasicEnemy', 'TankEnemy'],
  primaryEnemy: 'NewWorldEnemy',
  bossType: 'NewWorldBoss',
  colors: {
    primary: 0x123456,
    secondary: 0x654321,
    floor: 0x112233,
    wall: 0x001122,
    portal: 0x123456,
  },
  portalPosition: { x: 12, y: 12 },
},
```

### Step 3: Update getAllWorlds()

Add the new world to the returned array:

```typescript
export function getAllWorlds(): SinWorld[] {
  return [
    SinWorld.PRIDE,
    SinWorld.GREED,
    SinWorld.WRATH,
    SinWorld.SLOTH,
    SinWorld.ENVY,
    SinWorld.GLUTTONY,
    SinWorld.LUST,
    SinWorld.NEW_WORLD,  // Add here
  ];
}
```

### Step 4: Create Supporting Content

You will also need to add:

- Enemy class in `src/entities/enemies/EnemyTypes.ts`
- Boss class in `src/entities/enemies/SinBosses.ts`
- NPC lore in `src/entities/NPC.ts` (`WORLD_LORE` and `BOSS_WARNINGS`)
- Portal in Hub scene at the specified `portalPosition`

---

## System Integration

WorldConfig is used extensively throughout the codebase:

### Scenes

| File | Usage |
|------|-------|
| `GameScene.ts` | Gets world config for enemy spawning and theming |
| `HubScene.ts` | Renders portals, tracks world completion |
| `MenuScene.ts` | Displays world colors and symbols on main menu |
| `GameOverScene.ts` | Shows world name in death statistics |
| `ShopScene.ts` | Receives current world context |

### Systems

| File | Usage |
|------|-------|
| `EnemySpawnManager.ts` | Selects enemies based on `enemyTypes` and `primaryEnemy` |
| `ProgressionSystem.ts` | Tracks completion status per world |
| `SaveSystem.ts` | Persists active world in save data |
| `LightingSystem.ts` | Derives lighting palettes from world colors |
| `AssetGenerator.ts` | Generates world-specific tile textures |
| `DungeonNPCManager.ts` | Creates NPCs with world-appropriate dialogue |

### UI Components

| File | Usage |
|------|-------|
| `GameHUD.ts` | Displays current world name and floor |
| `DebugMenuUI.ts` | Allows teleporting to specific worlds |

### Entities

| File | Usage |
|------|-------|
| `NPC.ts` | Maps `SinWorld` to lore dialogue and boss warnings |

---

## Quick Reference: Enemy Compositions

| World | Primary (60%) | Secondary | Tertiary |
|-------|---------------|-----------|----------|
| Pride | PrideEnemy | TankEnemy | RangedEnemy |
| Greed | GreedEnemy | FastEnemy | BasicEnemy |
| Wrath | WrathEnemy | FastEnemy | TankEnemy |
| Sloth | SlothEnemy | TankEnemy | BasicEnemy |
| Envy | EnvyEnemy | FastEnemy | RangedEnemy |
| Gluttony | GluttonyEnemy | TankEnemy | BasicEnemy |
| Lust | LustEnemy | FastEnemy | RangedEnemy |

---

## Quick Reference: Portal Positions in Hub

```
Hub Grid Layout (tile coordinates):

     x=4    x=8    x=12   x=16   x=20
y=3         PRIDE         GREED
y=8  LUST                        WRATH
y=14 SLOTH                       ENVY
y=17               GLUTTONY
```

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
