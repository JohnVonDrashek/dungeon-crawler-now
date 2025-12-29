# Infernal Ascent - Architecture Overview

## Project Structure

```
src/
├── scenes/           # Phaser scenes (game states)
│   ├── BootScene.ts      # Asset loading and placeholder generation
│   ├── MenuScene.ts      # Main menu with animations
│   ├── GameScene.ts      # Core dungeon gameplay
│   ├── HubScene.ts       # Central hub with world portals
│   ├── ShopScene.ts      # Between-floor shop
│   ├── GameOverScene.ts  # Death screen
│   └── VictoryScene.ts   # Win screen
│
├── entities/         # Game objects with behavior
│   ├── Player.ts         # Player character with stats, inventory
│   ├── Enemy.ts          # Base enemy class
│   ├── NPC.ts            # Non-player characters
│   └── enemies/          # Enemy type implementations
│       ├── EnemyTypes.ts     # Standard enemies (Fast, Tank, Ranged, etc.)
│       └── SinBosses.ts      # 7 unique sin bosses
│
├── systems/          # Core game logic (decoupled from scenes)
│   ├── CombatSystem.ts       # Damage calculation, crits, defense
│   ├── LootSystem.ts         # Item drop generation
│   ├── SaveSystem.ts         # LocalStorage persistence
│   ├── ProgressionSystem.ts  # World completion tracking
│   ├── InventorySystem.ts    # Item management, equipment
│   ├── DungeonGenerator.ts   # Procedural room generation
│   ├── RoomManager.ts        # Room state and activation
│   ├── LightingSystem.ts     # Dynamic lighting with Light2D
│   ├── AudioSystem.ts        # Music and SFX management
│   ├── HazardSystem.ts       # Traps and environmental damage
│   └── EnemySpawnManager.ts  # Enemy wave spawning
│
├── ui/               # User interface components
│   ├── GameHUD.ts        # In-game health, XP, stats display
│   ├── InventoryUI.ts    # Inventory grid and tooltips
│   ├── ShopUI.ts         # Shop item display and purchase
│   ├── DialogueUI.ts     # NPC conversation display
│   ├── LevelUpUI.ts      # Stat allocation on level up
│   ├── SettingsUI.ts     # Audio, controls settings
│   └── LoreUIManager.ts  # Lore item display modals
│
├── multiplayer/      # P2P networking
│   ├── NetworkManager.ts     # Connection management, room codes
│   ├── HostController.ts     # Server-side game state sync
│   └── GuestController.ts    # Client-side state reception
│
├── config/           # Game configuration
│   └── WorldConfig.ts    # 7 sin worlds with themes, enemies, bosses
│
└── utils/            # Shared utilities
    └── constants.ts      # TILE_SIZE, colors, etc.
```

## Key Patterns

### 1. Scene Management
All scenes extend Phaser.Scene. Scenes manage their own lifecycle:
- `preload()` - Load assets (usually delegated to BootScene)
- `create()` - Initialize game objects
- `update()` - Frame-by-frame logic
- `shutdown()` - Cleanup event listeners, destroy objects

### 2. Manager Pattern
Complex functionality extracted into manager classes:
- `EnemySpawnManager` - Handles enemy creation and health bars
- `RoomDecorationManager` - Places props and decorations
- `LootDropManager` - Spawns and manages item drops
- `VisualEffectsManager` - Camera shake, damage numbers

### 3. Event-Driven Communication
Scenes and systems communicate via Phaser events:
```typescript
// Emit
this.scene.events.emit('playerLevelUp', player);

// Listen
this.scene.events.on('playerLevelUp', (player) => { ... });

// Cleanup in shutdown()
this.scene.events.off('playerLevelUp');
```

### 4. Singleton Systems
Global systems use singleton pattern:
```typescript
// NetworkManager
export const networkManager = NetworkManager.getInstance();

// ProgressionManager
export const progressionManager = ProgressionManager.getInstance();
```

## Data Flow

### Save/Load Flow
```
Player Action → SaveSystem.save() → localStorage
Game Start → SaveSystem.load() → Player.restoreFromSave()
```

### Multiplayer Flow
```
Host: Player Input → Game State Change → HostController.broadcast()
        ↓
Network: Trystero WebRTC P2P
        ↓
Guest: NetworkManager.onMessage() → GuestController.handle() → Update Visuals
```

### Combat Flow
```
Player Attack → CombatSystem.calculateDamage(attacker, target)
             → Apply buffs, equipment bonuses
             → Roll crit chance
             → Apply defense reduction
             → Return { damage, isCrit, blocked }
             → target.takeDamage(damage)
             → Emit 'enemyKilled' if HP <= 0
```

## World Configuration

Each sin world defines:
- `name`: Display name (e.g., "Pride")
- `color`: Theme color (0xffd700 for gold)
- `floorCount`: Number of floors (3)
- `enemies`: Array of enemy types for that world
- `bossClass`: The sin boss constructor
- `hazards`: Environmental hazards
- `music`: Background music key

## Adding New Features

### Adding a New Enemy Type
1. Create class in `src/entities/enemies/EnemyTypes.ts`
2. Extend `Enemy` base class
3. Override `update()` for custom AI
4. Add to `ENEMY_TYPES` in `WorldConfig.ts`
5. Create placeholder sprite in `BootScene.ts`

### Adding a New World
1. Add entry to `WORLD_CONFIGS` in `WorldConfig.ts`
2. Create boss class in `SinBosses.ts`
3. Add floor/wall textures in `BootScene.ts`
4. Portal automatically appears in HubScene

### Adding a New Item
1. Add template to `ITEM_TEMPLATES` in `Item.ts`
2. Or use `generateProceduralItem()` for random generation
