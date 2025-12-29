# Game Systems

[![Systems Count](https://img.shields.io/badge/systems-22-blue.svg)](.)
[![Architecture](https://img.shields.io/badge/architecture-ECS--style-green.svg)](.)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6.svg)](.)

This directory contains all decoupled game systems that power the dungeon crawler. Systems are designed to be **single-responsibility**, **loosely-coupled**, and **composable** - separating game logic from scene management and entity behavior.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [System Categories](#system-categories)
  - [Combat Systems](#combat-systems)
  - [Dungeon Generation & Management](#dungeon-generation--management)
  - [Item & Loot Systems](#item--loot-systems)
  - [Visual & Audio Systems](#visual--audio-systems)
  - [Persistence Systems](#persistence-systems)
  - [Data Models](#data-models)
- [Singleton vs Instance-Based](#singleton-vs-instance-based)
- [System Dependencies](#system-dependencies)
- [Key Interfaces](#key-interfaces)

---

## Architecture Overview

Systems in this directory follow a **manager pattern** where each system:

1. **Encapsulates domain logic** - Combat calculations, loot generation, room management, etc.
2. **Receives dependencies via constructor** - Scene, Player, other managers
3. **Exposes a clean public API** - Methods for the scene to call
4. **Emits events** for cross-system communication via `scene.events`

Most systems are **instance-based** and created per-scene, while a few are **singletons** for global state (settings, progression).

---

## System Categories

### Combat Systems

| System | File | Description |
|--------|------|-------------|
| **CombatSystem** | `CombatSystem.ts` | Calculates damage, critical hits, knockback, and displays damage numbers |
| **PlayerAttackManager** | `PlayerAttackManager.ts` | Handles all player attack patterns (wand, sword, bow, staff, daggers), projectile creation, and collision handling |
| **EnemySpawnManager** | `EnemySpawnManager.ts` | Spawns enemies by room type, creates sin-specific enemies/bosses, manages health bars |
| **HazardSystem** | `HazardSystem.ts` | Manages environmental hazards: spike traps, lava pits, arrow shooters |

#### CombatSystem

**Purpose:** Core damage calculation engine.

```typescript
interface DamageResult {
  damage: number;
  isCritical: boolean;
  knockbackX: number;
  knockbackY: number;
}
```

**Key Methods:**
- `calculateDamage(attacker, defender): DamageResult`
- `applyDamage(target, result): void`

---

#### PlayerAttackManager

**Purpose:** Translates player input into weapon-specific attack patterns.

**Weapon Types Supported:**
- **Wand** - Single projectile, fast attack speed
- **Sword** - Melee arc attack, hits all enemies in cone
- **Bow** - Piercing arrow, long range
- **Staff** - AoE explosion on impact
- **Daggers** - Triple-shot spread attack

**Key Methods:**
- `create(): void` - Initialize projectile group
- `setupPlayerAttack(inventoryUI, levelUpUI): void` - Bind click handler
- `handleProjectileEnemyCollision(projectile, enemy): void`
- `handleProjectileWallCollision(projectile): void`

**Dependencies:** `Player`, `AudioSystem`, `Weapon`

---

#### EnemySpawnManager

**Purpose:** Spawns and manages all enemies in dungeon rooms.

**Features:**
- World-specific enemy distribution (60% primary sin enemy)
- Sin boss spawning on floor 3 of each world
- Challenge room elite enemies
- Health bar creation/updating

**Key Methods:**
- `spawnEnemiesInRoom(room, isBossFloor, exitRoom): void`
- `createHealthBar(enemy): void`
- `updateAllHealthBars(): void`
- `removeHealthBar(enemy): void`

**Dependencies:** `Player`, `RoomManager`, `AudioSystem`, `WorldConfig`

---

#### HazardSystem

**Purpose:** Environmental hazards that damage the player.

**Hazard Types:**
| Type | Behavior |
|------|----------|
| `SPIKE_TRAP` | Toggles between active/inactive states |
| `LAVA_PIT` | Continuous damage while standing on |
| `ARROW_SHOOTER` | Wall-mounted, fires projectiles periodically |

**Key Methods:**
- `spawnHazardsInRoom(room, dungeonData): void`
- `update(delta): void` - Call each frame
- `getArrowGroup(): Phaser.Physics.Arcade.Group`

**Dependencies:** `Player`, `RoomManager`

---

### Dungeon Generation & Management

| System | File | Description |
|--------|------|-------------|
| **DungeonGenerator** | `DungeonGenerator.ts` | Procedural room-based dungeon generation with BSP algorithm |
| **RoomManager** | `RoomManager.ts` | Tracks room states (unvisited/active/cleared), manages doors and darkness overlay |
| **RoomDecorationManager** | `RoomDecorationManager.ts` | Places chests, shrines, candles, and challenge markers |
| **DungeonNPCManager** | `DungeonNPCManager.ts` | Spawns Lost Souls and Warning Spirits in dungeon rooms |
| **WangTileSystem** | `WangTileSystem.ts` | Corner-based autotiling for seamless floor/wall transitions |

#### DungeonGenerator

**Purpose:** Creates procedurally generated dungeon layouts.

```typescript
interface DungeonData {
  tiles: number[][];  // 0 = floor, 1 = wall
  rooms: Room[];
  spawnPoint: { x: number; y: number };
  exitPoint: { x: number; y: number };
}

enum RoomType {
  NORMAL, SPAWN, EXIT, TREASURE, TRAP, SHRINE, CHALLENGE
}
```

**Algorithm:** Binary Space Partitioning (BSP) with seeded random for reproducibility.

**Key Methods:**
- `generate(): DungeonData`
- `getEnemySpawnPositions(count, excludeRoom): Position[]`

---

#### RoomManager

**Purpose:** Runtime room state machine.

```typescript
enum RoomState {
  UNVISITED = 'unvisited',
  ACTIVE = 'active',      // Doors closed, enemies spawned
  CLEARED = 'cleared'     // Doors open, safe
}
```

**Key Methods:**
- `update(playerX, playerY): Room | null` - Returns room if newly entered
- `activateRoom(roomId, enemyCount): void` - Close doors, show darkness
- `onEnemyKilled(activeEnemyCount): void` - Check for room clear
- `getDoorGroup(): Phaser.Physics.Arcade.StaticGroup`

---

#### RoomDecorationManager

**Purpose:** Populates rooms with interactive objects.

**Decorations by Room Type:**
- **Treasure** - Chest with guaranteed rare+ loot and weapon
- **Shrine** - Healing fountain (full HP restore, single use)
- **Challenge** - Skull markers in corners
- **All Rooms** - Wall candles (start unlit, light on room activation)

**Key Methods:**
- `addRoomDecorations(onLoreCallback): void`
- `handleChestOpen(player, chest): void`
- `handleShrineUse(player, shrine): void`

**Dependencies:** `LightingSystem`, `LootSystem`, `LootDropManager`, `VisualEffectsManager`

---

#### DungeonNPCManager

**Purpose:** Manages dungeon-specific NPCs.

**NPC Types:**
- **Lost Souls** - Appear in shrine rooms, provide world-specific lore
- **Warning Spirits** - Appear on floor 2 near exit, warn about boss

**Key Methods:**
- `spawnDungeonNPCs(): void`
- `checkNPCProximity(): void` - Call each frame
- `getNearbyNPC(): NPC | null`
- `talkToNPC(): void` - Initiate dialogue

---

#### WangTileSystem

**Purpose:** Automatic tile selection for smooth terrain transitions.

**Algorithm:** Corner-based Wang tiles where each corner is encoded as wall/floor, creating 16 possible configurations mapped to specific tileset frames.

```typescript
function getWangTileFrame(nw, ne, sw, se, mapping): number
function getSimpleCornerValues(tiles, x, y, width, height): CornerValues
```

**Supported Worlds:** pride, greed, wrath, sloth, envy, gluttony, lust, hub

---

### Item & Loot Systems

| System | File | Description |
|--------|------|-------------|
| **Item** | `Item.ts` | Item data model with types, rarities, and procedural generation |
| **Weapon** | `Weapon.ts` | Weapon definitions, stats, and attack patterns |
| **InventorySystem** | `InventorySystem.ts` | Player inventory and equipment management |
| **LootSystem** | `LootSystem.ts` | Drop chance calculations and loot generation |
| **LootDropManager** | `LootDropManager.ts` | Spawns item/weapon/gold drops with visual effects |

#### Item

**Purpose:** Item data model and factory functions.

```typescript
enum ItemType { WEAPON, ARMOR, ACCESSORY, CONSUMABLE }
enum ItemRarity { COMMON, UNCOMMON, RARE, EPIC, LEGENDARY }

interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  stats: ItemStats;
  description: string;
  healAmount?: number;
  weaponData?: WeaponData;
}
```

**Key Functions:**
- `createItem(templateId): Item`
- `generateProceduralItem(floor, rarity): Item`
- `createItemFromWeapon(weapon): Item`

---

#### Weapon

**Purpose:** Weapon type definitions and damage calculation.

```typescript
enum WeaponType { WAND, SWORD, BOW, STAFF, DAGGERS }

interface WeaponStats {
  type: WeaponType;
  damage: number;
  attackSpeed: number;
  range: number;
  projectileSpeed: number;
  projectileCount: number;
  spread: number;
  piercing: boolean;
  aoe: boolean;
  aoeRadius: number;
}
```

**Rarity Scaling:** 0% / 15% / 30% / 45% / 60% bonus damage

**Key Methods:**
- `getDamageMultiplier(): number`
- `getDisplayName(): string`
- `static createRandom(floor): Weapon`

---

#### InventorySystem

**Purpose:** Manages player's item storage and equipment slots.

```typescript
interface Equipment {
  weapon: Item | null;
  armor: Item | null;
  accessory: Item | null;
}
```

**Key Methods:**
- `addItem(item): boolean`
- `equipItem(itemId): Item | null` (returns previously equipped)
- `useConsumable(itemId): Item | null`
- `getEquipmentStats(): InventoryStats`
- `serialize() / deserialize(data)` - For save system

---

#### LootSystem

**Purpose:** Determines what loot drops and at what rarity.

**Rarity Weights (base):**
| Rarity | Weight |
|--------|--------|
| Common | 60 |
| Uncommon | 25 |
| Rare | 12 |
| Epic | 3 |
| Legendary | 0.5 |

Floor progression shifts weights toward rarer items.

**Key Methods:**
- `shouldDrop(): boolean` - Based on `dropChance` (default 40%)
- `generateLoot(floor): Item | null`
- `generateGuaranteedLoot(minRarity): Item` - For chests/bosses

---

#### LootDropManager

**Purpose:** Creates visual item drops in the game world.

**Features:**
- Point lights with rarity-colored glow
- Floating animations
- Pop-in/scale effects
- Gold coin burst for larger amounts

**Key Methods:**
- `spawnItemDrop(x, y, item): void`
- `spawnWeaponDrop(x, y, weapon): void`
- `spawnGoldDrop(x, y, amount): void`
- `handleItemPickup(player, item): void`
- `handleGoldPickup(player, gold): void`

---

### Visual & Audio Systems

| System | File | Description |
|--------|------|-------------|
| **LightingSystem** | `LightingSystem.ts` | Dynamic lighting with Phaser Light2D pipeline |
| **VisualEffectsManager** | `VisualEffectsManager.ts` | Camera shake, damage numbers, particles, notifications |
| **AudioSystem** | `AudioSystem.ts` | Procedural sound generation and ambient music |
| **AssetGenerator** | `AssetGenerator.ts` | Runtime texture generation for all game sprites |

#### LightingSystem

**Purpose:** Creates atmospheric dungeon lighting.

**Light Types:**
- **Player Torch** - Follows player, neutral warm color
- **Wall Torches** - Flicker animation, world-specific colors
- **Wall Rim Lights** - Subtle edge highlighting for depth
- **Boss Glow** - Sin-specific aura colors

**World-Specific Palettes:** Each sin world has unique ambient color, torch colors, and rim color.

**Key Methods:**
- `enable() / disable()`
- `createPlayerTorch(x, y): Light`
- `createTorchLight(x, y, config?, roomId?, startLit?): Light`
- `lightRoom(roomId): void` - Animate torches on when room activates
- `createWallRimLights(tiles, tileSize): void`
- `update(delta): void` - Flicker animation

---

#### VisualEffectsManager

**Purpose:** All non-lighting visual feedback.

**Key Methods:**
- `shakeCamera(intensity, duration): void`
- `showDamageNumber(x, y, damage, isPlayer): void`
- `showFloatingText(x, y, message, color): void`
- `spawnDeathParticles(x, y): void`
- `showGameMessage(msg): void`
- `showLevelUpNotification(): void`

---

#### AudioSystem

**Purpose:** Sound effects and procedural ambient music.

**Sound Effects:** Attack, hit, pickup, level up, enemy death, hurt, stairs, potion, whisper, tablet

**Music System:**
- Dorian mode scale (A root)
- Three styles: `exploration`, `shrine`, `combat`
- Drone oscillator with LFO wobble
- Random melody generation with stepwise motion

**Key Methods:**
- `play(key, volume): void`
- `startMusic(style): void`
- `stopMusic(): void`
- `setMusicStyle(style): void`
- `setMasterVolume / setMusicVolume / setSFXVolume`

**Dependencies:** `SettingsManager` for volume persistence

---

#### AssetGenerator

**Purpose:** Creates all placeholder textures at runtime.

**Asset Categories:**
- Player sprites
- Enemy sprites (basic + sin-themed)
- Floor/wall tiles (generic + world-specific)
- Projectiles and effects
- Items and weapons
- Room decorations (chests, shrines, lore objects)
- Hazard sprites

**Usage:** Called once in `BootScene.preload()`:
```typescript
const generator = new AssetGenerator(scene);
generator.generateAll();
```

---

### Persistence Systems

| System | File | Description |
|--------|------|-------------|
| **SaveSystem** | `SaveSystem.ts` | localStorage save/load with migration support |
| **SettingsManager** | `SettingsManager.ts` | Volume and settings persistence (singleton) |
| **ProgressionSystem** | `ProgressionSystem.ts` | World completion tracking (singleton) |
| **LoreSystem** | `LoreSystem.ts` | Lore discovery tracking and content delivery |

#### SaveSystem

**Purpose:** Persists game state to localStorage.

```typescript
interface SaveData {
  version: number;
  progression: GameProgression;
  player: PlayerData;
  inventory: { items: Item[]; equipment: Equipment };
  timestamp: number;
}
```

**Migration:** Automatically migrates v1 (linear floor) to v2 (world progression).

**Static Methods:**
- `save(progression, playerData, inventory): boolean`
- `load(): SaveData | null`
- `hasSave(): boolean`
- `deleteSave(): void`
- `getSaveInfo(): SaveInfo | null`

---

#### SettingsManager (Singleton)

**Purpose:** Audio settings persistence.

```typescript
interface GameSettings {
  masterVolume: number;  // 0-1
  musicVolume: number;   // 0-1
  sfxVolume: number;     // 0-1
}
```

**Usage:**
```typescript
import { SettingsManager } from './SettingsManager';
SettingsManager.setMasterVolume(0.8);
const volume = SettingsManager.getMasterVolume();
```

---

#### ProgressionSystem (Singleton)

**Purpose:** Tracks which sin worlds are completed and current run state.

```typescript
interface WorldProgress {
  started: boolean;
  currentFloor: number;
  completed: boolean;
  deathCount: number;
}

interface ActiveRun {
  world: SinWorld;
  floor: number;
}
```

**Key Methods:**
- `startWorld(world, floor): void`
- `advanceFloor(): void`
- `completeWorld(world): void`
- `handleDeath(): void`
- `getCompletedWorldCount(): number`
- `areAllWorldsCompleted(): boolean`

**Usage:**
```typescript
import { progressionManager } from './ProgressionSystem';
progressionManager.startWorld(SinWorld.PRIDE);
```

---

#### LoreSystem

**Purpose:** Delivers contextual lore based on floor depth.

**Lore Types:**
| Type | Display | Content |
|------|---------|---------|
| `tablet` | Modal | Long-form story entries |
| `scratch` | Floating text | Short survivor messages |
| `whisper` | Ethereal | Brief ghostly utterances |

Distribution shifts toward whispers in deeper floors.

**Key Methods:**
- `getRandomLore(floor, type?): LoreEntry | null`
- `getRandomLoreType(floor): LoreType`
- `markDiscovered(id): void`
- `getDiscoveredCount() / getTotalCount()`

---

### Data Models

| File | Description |
|------|-------------|
| **Item.ts** | Item interface, types, rarities, templates, procedural generation |
| **Weapon.ts** | Weapon interface, type definitions, stat constants |

These are not runtime systems but shared data models used across multiple systems.

---

## Singleton vs Instance-Based

| Pattern | Systems | Rationale |
|---------|---------|-----------|
| **Singleton** | `SettingsManager`, `ProgressionManager` | Global state that persists across scenes |
| **Instance** | All others | Scene-specific, destroyed on scene change |

---

## System Dependencies

```
GameScene
  |
  +-- DungeonGenerator (standalone)
  |
  +-- RoomManager
  |     +-- DungeonData
  |
  +-- LightingSystem
  |     +-- (Phaser Light2D)
  |
  +-- AudioSystem
  |     +-- SettingsManager (singleton)
  |
  +-- RoomDecorationManager
  |     +-- LightingSystem
  |     +-- LootSystem
  |     +-- LootDropManager
  |     +-- VisualEffectsManager
  |
  +-- EnemySpawnManager
  |     +-- RoomManager
  |     +-- AudioSystem
  |
  +-- PlayerAttackManager
  |     +-- AudioSystem
  |     +-- Weapon
  |
  +-- HazardSystem
  |     +-- RoomManager
  |
  +-- DungeonNPCManager
  |     +-- DialogueUI
  |
  +-- LootDropManager
  |     +-- AudioSystem
  |     +-- Item, Weapon
  |
  +-- VisualEffectsManager (standalone)
  |
  +-- LoreSystem (standalone)
  |
  +-- CombatSystem (standalone)
```

---

## Key Interfaces

### Room Interface
```typescript
interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  id: number;
  doors: { x: number; y: number }[];
  type: RoomType;
}
```

### DamageResult Interface
```typescript
interface DamageResult {
  damage: number;
  isCritical: boolean;
  knockbackX: number;
  knockbackY: number;
}
```

### SaveData Interface
```typescript
interface SaveData {
  version: number;
  progression: GameProgression;
  player: PlayerData;
  inventory: InventoryData;
  timestamp: number;
}
```

### GameProgression Interface
```typescript
interface GameProgression {
  worldProgress: Record<SinWorld, WorldProgress>;
  activeRun: ActiveRun | null;
  hubUnlocks: string[];
  totalDeaths: number;
  totalEnemiesKilled: number;
  totalGoldEarned: number;
}
```

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
