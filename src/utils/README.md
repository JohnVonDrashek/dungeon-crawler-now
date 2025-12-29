# Utils Directory

![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)
![Constants](https://img.shields.io/badge/Constants-10-green?style=flat-square)
![Used%20In](https://img.shields.io/badge/Used%20In-20%2B%20Files-orange?style=flat-square)

The `utils/` directory contains shared utility modules and constants used throughout the **Infernal Ascent** codebase. This directory serves as the single source of truth for game-wide configuration values.

---

## Table of Contents

- [Purpose](#purpose)
- [Files](#files)
- [Constants Reference](#constants-reference)
  - [Display Constants](#display-constants)
  - [Player Stats](#player-stats)
  - [Dungeon Generation](#dungeon-generation)
- [Usage Across the Codebase](#usage-across-the-codebase)
- [Guidelines for Adding New Constants](#guidelines-for-adding-new-constants)

---

## Purpose

The utils directory provides:

1. **Centralized Configuration** - All magic numbers and game-tuning values in one place
2. **Type Safety** - Exported TypeScript constants with proper typing
3. **Easy Balancing** - Modify game balance by changing single values
4. **Consistency** - Ensures all systems use the same values for calculations

---

## Files

| File | Description |
|------|-------------|
| `constants.ts` | Core game constants for dimensions, player stats, and dungeon generation |

---

## Constants Reference

### Display Constants

These constants define the game's visual dimensions and tile rendering.

| Constant | Value | Type | Description |
|----------|-------|------|-------------|
| `TILE_SIZE` | `32` | `number` | Size of a single tile in pixels. Used for sprite sizing, collision boxes, physics calculations, and world-to-tile coordinate conversion. |
| `GAME_WIDTH` | `800` | `number` | Game canvas width in pixels. Used by Phaser configuration for renderer setup. |
| `GAME_HEIGHT` | `600` | `number` | Game canvas height in pixels. Used by Phaser configuration for renderer setup. |

**Canvas Dimensions:**
- Aspect Ratio: 4:3
- Tiles Visible: ~25 horizontal x ~19 vertical (depending on camera zoom)

### Player Stats

These constants define the player's initial/base statistics.

| Constant | Value | Type | Description |
|----------|-------|------|-------------|
| `PLAYER_SPEED` | `150` | `number` | Base movement speed in pixels per second. Affected by equipment bonuses and sin effects (e.g., Sloth's slowing aura). |
| `PLAYER_MAX_HP` | `100` | `number` | Starting maximum health points. Increases through leveling and equipment. |
| `PLAYER_BASE_ATTACK` | `10` | `number` | Starting attack power. Used in damage formula: `damage = max(1, attack - defense)`. |
| `PLAYER_BASE_DEFENSE` | `5` | `number` | Starting defense value. Reduces incoming damage. |

**Stat Scaling:**
- Stats increase through level-up stat point allocation
- Equipment bonuses add to base stats
- Total stat = Base stat + Level bonuses + Equipment bonuses

### Dungeon Generation

These constants control the procedural dungeon generation (BSP algorithm).

| Constant | Value | Type | Description |
|----------|-------|------|-------------|
| `DUNGEON_WIDTH` | `100` | `number` | Dungeon width in tiles. Total playable area: 100 x 32 = 3200 pixels. |
| `DUNGEON_HEIGHT` | `100` | `number` | Dungeon height in tiles. Total playable area: 100 x 32 = 3200 pixels. |
| `MIN_ROOM_SIZE` | `16` | `number` | Minimum room dimension in tiles (16 x 32 = 512 pixels minimum). |
| `MAX_ROOM_SIZE` | `32` | `number` | Maximum room dimension in tiles (32 x 32 = 1024 pixels maximum). |

**Room Size Calculations:**
- Minimum room area: 16 x 16 = 256 tiles (8,192 sq pixels)
- Maximum room area: 32 x 32 = 1,024 tiles (32,768 sq pixels)
- Room count: Typically 8-15 rooms per dungeon (varies by BSP splits)

---

## Usage Across the Codebase

### TILE_SIZE (Most Widely Used)

Used in **20+ files** for coordinate calculations, sprite sizing, and physics:

| Category | Files | Usage |
|----------|-------|-------|
| **Entities** | `Player.ts`, `Enemy.ts`, `NPC.ts` | Collision body sizing, movement calculations |
| **Enemy Types** | `EnemyTypes.ts`, `SinBosses.ts` | Attack ranges, ability radii (e.g., `TILE_SIZE * 5` for pull radius) |
| **Systems** | `Weapon.ts`, `RoomManager.ts`, `HazardSystem.ts` | Projectile sizing, room activation zones |
| **Scenes** | `GameScene.ts`, `HubScene.ts`, `ShopScene.ts` | World coordinate conversions |
| **UI** | `MinimapUI.ts`, `LoreUIManager.ts` | Scale calculations for map display |
| **Managers** | `EnemySpawnManager.ts`, `RoomDecorationManager.ts`, `DungeonNPCManager.ts` | Spawn position calculations |

**Common Patterns:**

```typescript
// Convert tile coordinates to world pixels
const worldX = tileX * TILE_SIZE;
const worldY = tileY * TILE_SIZE;

// Define ability ranges as tile multiples
private readonly PULL_RADIUS = TILE_SIZE * 5;  // 160 pixels
private readonly SLOW_RADIUS = TILE_SIZE * 3;  // 96 pixels

// Check distance in tile units
if (dist < TILE_SIZE * 8) { /* within 8 tiles */ }
```

### GAME_WIDTH / GAME_HEIGHT

Used in **2 files** for Phaser configuration:

| File | Usage |
|------|-------|
| `config.ts` | Phaser game configuration (renderer dimensions) |
| `src/README.md` | Documentation reference |

```typescript
// config.ts
export const gameConfig: Phaser.Types.Core.GameConfig = {
  width: GAME_WIDTH,   // 800
  height: GAME_HEIGHT, // 600
  // ...
};
```

### PLAYER_* Stats

Used in **2 files** for player initialization:

| File | Usage |
|------|-------|
| `Player.ts` | Initialize base stats and computed stats |
| `entities/README.md` | Documentation reference |

```typescript
// Player.ts
private baseMaxHp: number = PLAYER_MAX_HP;
private baseAttack: number = PLAYER_BASE_ATTACK;
private baseDefense: number = PLAYER_BASE_DEFENSE;
private baseSpeed: number = PLAYER_SPEED;

public hp: number = PLAYER_MAX_HP;
public maxHp: number = PLAYER_MAX_HP;
public attack: number = PLAYER_BASE_ATTACK;
public defense: number = PLAYER_BASE_DEFENSE;
public speed: number = PLAYER_SPEED;
```

### DUNGEON_* and ROOM_* Constants

Used in **3 files** for procedural generation:

| File | Usage |
|------|-------|
| `DungeonGenerator.ts` | BSP room size constraints |
| `GameScene.ts` | Dungeon tilemap creation |
| `GameSceneInit.ts` | Dungeon initialization |

```typescript
// DungeonGenerator.ts
import { MIN_ROOM_SIZE, MAX_ROOM_SIZE } from '../utils/constants';

// GameScene.ts
import { TILE_SIZE, DUNGEON_WIDTH, DUNGEON_HEIGHT } from '../utils/constants';

// Create dungeon tilemap
const dungeonWidth = DUNGEON_WIDTH * TILE_SIZE;  // 3200 pixels
const dungeonHeight = DUNGEON_HEIGHT * TILE_SIZE; // 3200 pixels
```

---

## Guidelines for Adding New Constants

### When to Add a Constant

Add a constant to `constants.ts` when:

1. **Used in multiple files** - A value appears in 2+ files
2. **Game balance tuning** - Designers may need to adjust the value
3. **Calculation base** - Other values derive from it (e.g., `TILE_SIZE * 5`)
4. **Magic number** - An unexplained number in the code

### Naming Conventions

Follow these patterns for constant names:

| Pattern | Example | Usage |
|---------|---------|-------|
| `SYSTEM_PROPERTY` | `PLAYER_SPEED`, `ENEMY_SPAWN_DELAY` | System-specific values |
| `THING_SIZE` | `TILE_SIZE`, `ROOM_SIZE` | Dimension values |
| `THING_COUNT` | `MAX_ENEMIES`, `MIN_ROOM_SIZE` | Quantity constraints |
| `THING_RATE` | `XP_RATE`, `SPAWN_RATE` | Multipliers and rates |

### Adding a New Constant

1. **Add to constants.ts:**

```typescript
// Group with related constants, add a comment if not obvious
export const NEW_CONSTANT = 42;
```

2. **Export pattern:**

```typescript
// Named exports (preferred for tree-shaking)
export const TILE_SIZE = 32;

// NOT default exports
export default { TILE_SIZE }; // Avoid this
```

3. **Import in consuming files:**

```typescript
// Import only what you need
import { TILE_SIZE, PLAYER_SPEED } from '../utils/constants';

// NOT wildcard imports
import * as Constants from '../utils/constants'; // Avoid this
```

4. **Update documentation:**

Add the new constant to this README in the appropriate section with:
- Constant name
- Value
- Type
- Description
- Usage examples if non-obvious

### Categories for Future Constants

Consider organizing future constants into these categories:

```typescript
// === Display ===
export const TILE_SIZE = 32;
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

// === Player Base Stats ===
export const PLAYER_SPEED = 150;
export const PLAYER_MAX_HP = 100;
export const PLAYER_BASE_ATTACK = 10;
export const PLAYER_BASE_DEFENSE = 5;

// === Dungeon Generation ===
export const DUNGEON_WIDTH = 100;
export const DUNGEON_HEIGHT = 100;
export const MIN_ROOM_SIZE = 16;
export const MAX_ROOM_SIZE = 32;

// === Combat (future) ===
// export const CRITICAL_HIT_CHANCE = 0.1;
// export const KNOCKBACK_FORCE = 200;

// === Enemy (future) ===
// export const ENEMY_AGGRO_RANGE = TILE_SIZE * 8;
// export const ENEMY_ATTACK_COOLDOWN = 1000;
```

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
