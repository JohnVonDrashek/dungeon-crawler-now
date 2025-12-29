# Source Code Documentation

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.80-blueviolet?style=flat-square)](https://phaser.io/)
[![Architecture](https://img.shields.io/badge/Pattern-ECS--like-green?style=flat-square)](https://en.wikipedia.org/wiki/Entity_component_system)

This directory contains the complete source code for **Infernal Ascent** (Dungeon Crawler Now), a roguelike action RPG built with Phaser 3 and TypeScript. The game features 7 themed worlds based on the Seven Deadly Sins, procedural dungeon generation, real-time combat, and co-op multiplayer.

---

## Table of Contents

- [Overview](#overview)
- [Directory Structure](#directory-structure)
- [Root Files](#root-files)
- [Subdirectory Details](#subdirectory-details)
  - [config/](#config)
  - [entities/](#entities)
  - [multiplayer/](#multiplayer)
  - [scenes/](#scenes)
  - [systems/](#systems)
  - [ui/](#ui)
  - [utils/](#utils)
- [Architecture and Data Flow](#architecture-and-data-flow)
- [Initialization Flow](#initialization-flow)

---

## Overview

The codebase follows an **Entity-Component-System-like architecture** adapted for Phaser 3:

- **Entities** (`entities/`) - Game objects with behavior (Player, Enemy, NPC)
- **Systems** (`systems/`) - Reusable logic modules (combat, loot, dungeons, audio)
- **Scenes** (`scenes/`) - Phaser scene lifecycle management (boot, menu, game, hub)
- **UI** (`ui/`) - User interface components (HUD, inventory, dialogs)

The game is built on **Phaser 3**'s scene-based architecture with arcade physics, WebGL rendering, and the Light2D pipeline for dynamic lighting.

---

## Directory Structure

```
src/
├── main.ts                 # Application entry point
├── config.ts               # Phaser game configuration
├── config/                 # Game configuration data
│   └── WorldConfig.ts      # Seven Sins world definitions
├── entities/               # Game entities (sprites with behavior)
│   ├── Player.ts           # Player character
│   ├── Enemy.ts            # Base enemy class
│   ├── NPC.ts              # Non-player characters and dialogue
│   └── enemies/            # Specialized enemy types
│       ├── EnemyTypes.ts   # Fast, Tank, Ranged enemies
│       └── SinBosses.ts    # Seven Sin boss variants
├── multiplayer/            # Co-op multiplayer networking
│   ├── NetworkManager.ts   # WebRTC connection management
│   ├── HostController.ts   # Host game logic synchronization
│   ├── GuestController.ts  # Guest state reception
│   ├── PlayerSync.ts       # Player position broadcasting
│   ├── RemotePlayer.ts     # Remote player representation
│   ├── SyncMessages.ts     # Network message type definitions
│   ├── MessageValidator.ts # Message validation utilities
│   └── index.ts            # Module exports
├── scenes/                 # Phaser scenes (game states)
│   ├── BaseScene.ts        # Abstract base with common utilities
│   ├── BootScene.ts        # Asset loading and initialization
│   ├── MenuScene.ts        # Main menu with animations
│   ├── HubScene.ts         # Central hub with world portals
│   ├── GameScene.ts        # Main dungeon gameplay
│   ├── ShopScene.ts        # Between-floor shop
│   ├── GameOverScene.ts    # Death screen
│   ├── VictoryScene.ts     # Win screen
│   └── game/               # GameScene helper modules
│       ├── GameSceneInit.ts       # Dungeon tile creation
│       ├── GameSceneInput.ts      # Keyboard handling
│       ├── GameSceneCollisions.ts # Physics collision setup
│       └── GameSceneEvents.ts     # Event handler registration
├── systems/                # Game logic systems
│   ├── DungeonGenerator.ts      # BSP-based procedural dungeons
│   ├── RoomManager.ts           # Room activation and doors
│   ├── CombatSystem.ts          # Damage calculation and knockback
│   ├── LootSystem.ts            # Item drop generation
│   ├── LootDropManager.ts       # World loot drop handling
│   ├── InventorySystem.ts       # Player inventory management
│   ├── Item.ts                  # Item definitions and creation
│   ├── Weapon.ts                # Weapon types and stats
│   ├── SaveSystem.ts            # LocalStorage persistence
│   ├── ProgressionSystem.ts     # World completion tracking
│   ├── AudioSystem.ts           # Sound effects and music
│   ├── LightingSystem.ts        # Dynamic Light2D management
│   ├── WangTileSystem.ts        # Terrain autotiling
│   ├── HazardSystem.ts          # Environmental hazards
│   ├── LoreSystem.ts            # Discoverable lore content
│   ├── EnemySpawnManager.ts     # Enemy instantiation
│   ├── PlayerAttackManager.ts   # Player attack handling
│   ├── VisualEffectsManager.ts  # Tweens and particles
│   ├── RoomDecorationManager.ts # Chests, shrines, decorations
│   ├── DungeonNPCManager.ts     # NPC spawning in dungeons
│   ├── AssetGenerator.ts        # Procedural placeholder textures
│   └── SettingsManager.ts       # Audio/display settings
├── ui/                     # User interface components
│   ├── GameHUD.ts          # In-game heads-up display
│   ├── InventoryUI.ts      # Inventory and equipment
│   ├── MinimapUI.ts        # Dungeon minimap
│   ├── LevelUpUI.ts        # Stat allocation on level up
│   ├── DialogueUI.ts       # NPC dialogue display
│   ├── SettingsUI.ts       # Settings menu
│   ├── ShopUI.ts           # Shop interface
│   ├── LoreUIManager.ts    # Lore tablet interactions
│   └── DebugMenuUI.ts      # Developer debug tools
└── utils/                  # Shared utilities
    └── constants.ts        # Game constants and dimensions
```

---

## Root Files

### `main.ts`

**Purpose:** Application entry point that bootstraps the Phaser game.

```typescript
import Phaser from 'phaser';
import { gameConfig } from './config';

new Phaser.Game(gameConfig);
```

This file is intentionally minimal - it simply imports the game configuration and instantiates the Phaser game engine. All initialization logic happens in the scenes.

### `config.ts`

**Purpose:** Phaser game configuration object defining renderer settings, physics, scenes, and plugins.

**Key Configuration:**

| Property | Value | Description |
|----------|-------|-------------|
| `type` | `Phaser.WEBGL` | WebGL renderer for Light2D support |
| `width` | 800 | Game canvas width |
| `height` | 600 | Game canvas height |
| `pixelArt` | `true` | Disables anti-aliasing for crisp pixels |
| `physics` | Arcade (no gravity) | Top-down 2D physics |
| `maxLights` | 100 | Increased for torch lighting |

**Scene Order:**
1. `BootScene` - Asset loading
2. `MenuScene` - Main menu
3. `HubScene` - Central hub
4. `GameScene` - Dungeon gameplay
5. `ShopScene` - Between-floor shop
6. `GameOverScene` - Death screen
7. `VictoryScene` - Win screen

**Plugins:** Uses `phaser3-rex-plugins` for enhanced UI components.

---

## Subdirectory Details

### `config/`

Contains game data configuration separate from code logic.

#### `WorldConfig.ts`

Defines the **Seven Deadly Sins** worlds with their properties:

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

Each world has:
- **Name and descriptions** - "Tower of Pride", "Vaults of Greed", etc.
- **Color palette** - Primary, secondary, floor, wall, and portal colors
- **Enemy types** - Which enemies spawn (60% primary sin enemy)
- **Boss type** - The sin boss class to spawn on floor 3
- **Portal position** - Location in the hub scene

---

### `entities/`

Game objects that exist in the world with physics bodies and behavior.

#### `Player.ts`

The player-controlled Franciscan friar character.

**Key Features:**
- 8-directional movement with WASD/arrow keys
- Dodge roll with invincibility frames
- Equipment-based stat calculation
- Level up and stat point allocation
- Weapon switching via inventory
- Save/restore serialization

**Stats System:**
- Base stats increase through leveling
- Equipment bonuses add to base stats
- Speed modifier for sin effects (e.g., Sloth's slowing aura)

#### `Enemy.ts`

Base class for all enemies with finite state machine AI.

**AI States:**
- `IDLE` - No target in range
- `CHASE` - Moving toward player
- `ATTACK` - Within attack range
- `RETREAT` - HP below 20%, fleeing

**Features:**
- 8-directional sprite animations
- Individual enemy lights for visibility
- Damage flashing and death animations

#### `NPC.ts`

Non-player characters for dialogue and lore.

**Types:**
- `CHRONICLER` - Hub NPC providing game guidance
- `LOST_SOUL` - Dungeon spirits with sin-specific lore
- `WARNING_SPIRIT` - Boss floor warnings
- `MYSTERIOUS_FIGURE` - Unlockable hub NPC

Contains extensive lore dialogue for each sin world.

#### `enemies/EnemyTypes.ts`

Specialized enemy variants:

| Type | Sprite | Characteristics |
|------|--------|-----------------|
| `FastEnemy` | Imp | Low HP, high speed, charges player |
| `TankEnemy` | Demon Brute | High HP, slow, high damage |
| `RangedEnemy` | Cultist | Keeps distance, shoots projectiles |
| `BasicEnemy` | (varies) | Standard balanced enemy |

#### `enemies/SinBosses.ts`

Seven unique boss classes, one per sin world:

- **Abstract `SinBoss` base class** with phase system (3 phases based on HP %)
- Each boss has unique attack patterns and projectile types
- Bosses scale in size (2x) and give significant XP
- Phase transitions trigger enhanced mechanics

---

### `multiplayer/`

WebRTC-based peer-to-peer co-op multiplayer system.

#### `NetworkManager.ts`

Singleton managing network state and connections.

**Features:**
- Room code generation (6 characters)
- Host/guest role management
- Connection state machine with reconnection
- Message routing to registered listeners

Uses **Trystero** library for WebRTC peer discovery.

#### `HostController.ts`

Host-authoritative game state synchronization.

**Responsibilities:**
- Broadcast room activations
- Sync enemy spawns and deaths
- Maintain authoritative game state

#### `GuestController.ts`

Guest-side state reception and application.

**Responsibilities:**
- Receive and apply room activations
- Handle remote enemy updates
- Spawn remote player representation

#### `PlayerSync.ts`

Player position broadcasting for both host and guest.

#### `RemotePlayer.ts`

Visual representation of the other player (simplified sprite).

#### `SyncMessages.ts`

Type definitions for all network messages:
- `PLAYER_POS` - Position updates
- `ROOM_ACTIVATED` - Room entry
- `ENEMY_SPAWN`, `ENEMY_DAMAGE`, `ENEMY_DEATH`
- `SCENE_CHANGE` - Scene transitions

---

### `scenes/`

Phaser scenes representing distinct game states.

#### `BaseScene.ts`

Abstract base class providing common functionality:

**Shared Systems:**
- Audio initialization (`initAudio()`)
- Lighting initialization (`initLighting()`)
- Player creation (`initPlayer()`)
- Common UI setup (`initCommonUI()`)
- Standard keybindings (`initCommonKeys()`)

Scenes extend this and implement `createScene()` instead of `create()`.

#### `BootScene.ts`

First scene - handles all asset loading.

**Loads:**
- Wang tilesets for each world (32x32 spritesheets)
- Character spritesheets (idle and walk animations)
- Sin boss spritesheets (48x48)
- Map objects (chests, shrines, portals)
- Normal maps for lighting system
- Procedural placeholder textures via `AssetGenerator`
- Sound effects via `AudioSystem.generateSounds()`

**Creates:**
- Player animations (8 directions, idle and walk)
- Enemy animations for each type
- Boss animations

#### `MenuScene.ts`

Animated main menu with:
- Gradient background with floating embers
- Sin symbol arc display
- New Game / Continue / Settings / Co-op options
- Host/Join multiplayer UI modals
- Save file detection and display

#### `HubScene.ts`

Central hub world (25x20 tiles):
- 7 sin world portals arranged spatially
- Central fountain for healing
- Shop NPC
- Chronicler NPC for guidance
- Victory portal (unlocked after all worlds complete)
- Multiplayer support with remote player display

#### `GameScene.ts`

Main dungeon gameplay scene (largest and most complex).

**Initialization Order:**
1. State initialization (floor, world, boss flags)
2. Systems creation (combat, visual effects, loot)
3. Dungeon generation with DungeonGenerator
4. Player creation and camera setup
5. Manager creation (enemies, hazards, lore, NPCs)
6. Multiplayer setup (host/guest controllers)
7. UI creation (HUD, minimap, level up, debug)
8. Collision and event registration
9. Keyboard control binding

**Update Loop:**
- Player movement and cooldowns
- Lighting system updates
- Room entry detection and activation
- Enemy AI updates
- Hazard damage ticks
- NPC proximity checks
- UI updates

**Helper Modules** (`game/` subdirectory):
- `GameSceneInit.ts` - Dungeon tile layer creation
- `GameSceneInput.ts` - Keyboard handler registration
- `GameSceneCollisions.ts` - Physics overlap setup
- `GameSceneEvents.ts` - Event listener management

#### `ShopScene.ts`

Between-floor shop for purchasing items and upgrades.

#### `GameOverScene.ts` / `VictoryScene.ts`

End-state scenes displaying run statistics.

---

### `systems/`

Reusable game logic modules that can be composed into scenes.

#### `DungeonGenerator.ts`

Procedural dungeon generation using **Binary Space Partitioning (BSP)**.

**Output (`DungeonData`):**
- 2D tile array (0 = floor, 1 = wall)
- Room list with positions, sizes, and types
- Spawn and exit points
- Door positions

**Room Types:**
- `NORMAL` - Standard combat room
- `SPAWN` - Starting room
- `EXIT` - Exit portal room
- `TREASURE` - Guaranteed chest
- `TRAP` - Environmental hazards
- `SHRINE` - Healing and lore
- `CHALLENGE` - Bonus difficulty

Supports **seeded generation** for multiplayer synchronization.

#### `RoomManager.ts`

Handles room state and door mechanics.

- Tracks which rooms have been entered
- Seals doors when combat begins
- Opens doors when room is cleared
- Provides fog-of-war support

#### `CombatSystem.ts`

Damage calculation and application.

**Damage Formula:**
```
damage = max(1, attack - defense)
if critical (10% chance): damage *= 2
```

Applies knockback force based on attacker/defender positions.

#### `LootSystem.ts`

Item generation with rarity weights.

**Rarity Tiers:**
- Common (60%)
- Uncommon (25%)
- Rare (12%)
- Epic (3%)
- Legendary (0.5%)

Floor level increases rare drop rates.

#### `InventorySystem.ts`

Player inventory with equipment slots.

**Equipment Slots:**
- Weapon
- Armor
- Accessory

Tracks stat bonuses from equipped items and supports serialization.

#### `Item.ts`

Item data definitions and procedural generation.

**Item Types:**
- `WEAPON` - Increases attack
- `ARMOR` - Increases defense
- `ACCESSORY` - Various bonuses
- `CONSUMABLE` - Health potions

#### `Weapon.ts`

Weapon type definitions with attack patterns.

**Weapon Types:**
- Wand (default)
- Sword
- Staff
- Bow

Each has different damage multipliers and attack speeds.

#### `SaveSystem.ts`

LocalStorage-based save/load with versioning.

**Saves:**
- Progression state (completed worlds, stats)
- Player data (level, XP, stats, gold)
- Inventory (items and equipment)

Supports migration from legacy save format.

#### `ProgressionSystem.ts`

Singleton tracking game-wide progress.

**Tracks:**
- Per-world progress (started, floor, completed, deaths)
- Active run state
- Hub unlocks
- Aggregate statistics

#### `AudioSystem.ts`

Sound effects and music management.

- Procedurally generates placeholder sounds
- Background music for exploration, combat, shrine
- Volume controls via SettingsManager

#### `LightingSystem.ts`

Dynamic lighting using Phaser's Light2D pipeline.

**Features:**
- World-specific ambient lighting colors
- Player torch with flicker effect
- Wall torch placement
- Room lighting on entry
- Shadow overlay

#### `WangTileSystem.ts`

Wang tile autotiling for seamless terrain.

Converts corner values to tileset frame indices for proper tile transitions.

#### `EnemySpawnManager.ts`

Enemy instantiation and management.

- Spawns enemies when room is entered
- Handles sin-specific enemy type ratios (60% primary)
- Creates health bars
- Boss spawning on floor 3

#### `PlayerAttackManager.ts`

Player attack handling.

- Projectile creation
- Collision detection with enemies
- Attack cooldown management

#### `VisualEffectsManager.ts`

Visual feedback and polish.

- Damage numbers
- Screen shake
- Flash effects
- Game messages

---

### `ui/`

User interface components, all using Phaser GameObjects.

#### `GameHUD.ts`

In-game heads-up display showing:
- HP bar with text
- XP bar and level
- Attack/defense stats
- Gold counter
- Floor/world indicator
- Enemy count
- Stat points available
- Current weapon

#### `InventoryUI.ts`

Inventory and equipment panel.

- Grid display of items
- Equipment slots
- Item tooltips
- Equip/use actions

#### `MinimapUI.ts`

Top-right dungeon minimap.

- Shows explored rooms
- Player position marker
- Room type indicators

#### `LevelUpUI.ts`

Stat allocation interface on level up.

- Shows available stat points
- HP / Attack / Defense / Speed buttons
- Preview of stat increases

#### `DialogueUI.ts`

NPC dialogue display.

- Speaker name and portrait
- Text with typewriter effect
- Multi-line conversations

#### `SettingsUI.ts`

Settings menu.

- Volume sliders (master, music, SFX)
- Display options
- Save/load buttons

#### `DebugMenuUI.ts`

Developer debug tools (press backtick to open).

- God mode toggle
- Skip to next floor
- Spawn items
- Kill all enemies
- Teleport to worlds

---

### `utils/`

#### `constants.ts`

Shared game constants:

```typescript
export const TILE_SIZE = 32;
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;

export const PLAYER_SPEED = 150;
export const PLAYER_MAX_HP = 100;
export const PLAYER_BASE_ATTACK = 10;
export const PLAYER_BASE_DEFENSE = 5;

export const DUNGEON_WIDTH = 100;
export const DUNGEON_HEIGHT = 100;
export const MIN_ROOM_SIZE = 16;
export const MAX_ROOM_SIZE = 32;
```

---

## Architecture and Data Flow

### Scene Lifecycle

```
BootScene (load assets)
    ↓
MenuScene (main menu)
    ↓
HubScene ←──────────────┐
    ↓                   │
GameScene (floor 1-3)   │
    ↓                   │
ShopScene               │
    ↓                   │
GameScene (next floor)  │
    ↓                   │
[World Complete] ───────┘
    or
[Death] → GameOverScene → MenuScene
    or
[All Worlds] → VictoryScene → MenuScene
```

### Data Dependencies

```
config.ts
    ↓
BootScene (loads assets)
    ↓
GameScene
    ├── DungeonGenerator (creates dungeon)
    ├── Player (creates player)
    ├── EnemySpawnManager (spawns enemies)
    ├── CombatSystem (handles damage)
    ├── LootSystem (generates drops)
    ├── RoomManager (tracks rooms)
    ├── LightingSystem (manages lights)
    ├── ProgressionSystem (tracks progress)
    └── SaveSystem (persists state)
```

### Event-Driven Communication

GameScene coordinates systems through Phaser events:

| Event | Source | Handlers |
|-------|--------|----------|
| `playerDeath` | Player | GameScene (game over) |
| `enemyDeath` | Enemy | GameScene (XP, loot) |
| `playerLevelUp` | Player | LevelUpUI (show allocation) |
| `itemPickup` | Player | InventoryUI (update display) |
| `equipmentChanged` | Player | GameHUD (update weapon) |
| `goldChanged` | Player | GameHUD (update counter) |
| `roomCleared` | RoomManager | EnemySpawnManager (open doors) |

---

## Initialization Flow

### Application Startup

1. **`main.ts`** creates `new Phaser.Game(gameConfig)`
2. **Phaser** initializes WebGL renderer, physics, and plugin
3. **`BootScene.preload()`** queues all asset loads
4. **`BootScene.create()`** extracts textures, creates animations
5. **`scene.start('MenuScene')`** transitions to menu

### Entering a World

1. **HubScene** player overlaps world portal
2. **Registry** stores `currentWorld` and `floor = 1`
3. **`scene.start('GameScene')`** transitions
4. **GameScene.createScene()** runs initialization:
   - `initializeSceneState()` - reads registry
   - `initializeSystems()` - creates managers
   - `createPlayer()` - spawns player at dungeon spawn
   - `createManagers()` - sets up gameplay systems
   - `createUI()` - builds HUD elements
   - `setupCollisionsAndEvents()` - registers handlers

### Game Loop (per frame)

1. **`GameScene.update(time, delta)`** called by Phaser
2. Check if UI is blocking (inventory, settings, level up)
3. Update player movement and cooldowns
4. Update lighting (player torch position)
5. Check room entry and activate if new
6. Update all active enemies (AI state machine)
7. Update hazards (damage ticks)
8. Check NPC proximity
9. Update UI (HUD, minimap)

---

*This documentation reflects the codebase as of the latest refactoring efforts to extract managers from GameScene and improve modularity.*
