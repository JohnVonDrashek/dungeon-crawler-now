# GameScene Modules

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Phaser](https://img.shields.io/badge/Phaser-3.x-blue)
![Architecture](https://img.shields.io/badge/Pattern-Modular-green)

This directory contains extracted modules from the main `GameScene` class, implementing a modular architecture pattern to improve maintainability and reduce file complexity.

## Purpose

The `game/` subdirectory exists to decompose the monolithic `GameScene` into focused, single-responsibility modules. This refactoring:

- **Reduces cognitive load** - Each module handles one aspect of scene behavior
- **Improves testability** - Individual functions can be unit tested in isolation
- **Enables code reuse** - Modules can be shared across different scenes if needed
- **Simplifies debugging** - Issues are isolated to specific functional areas
- **Keeps files under ~400 lines** - Following best practices for file size

## Module Overview

| Module | Purpose | Lines |
|--------|---------|-------|
| `GameSceneInit.ts` | System initialization, dungeon tile creation | ~386 |
| `GameSceneInput.ts` | Keyboard handling, movement processing | ~189 |
| `GameSceneCollisions.ts` | Physics setup, collision handlers | ~217 |
| `GameSceneEvents.ts` | Event registration, cleanup | ~262 |

---

## GameSceneInit

**File:** `GameSceneInit.ts`

Handles the creation and initialization of all game systems required for a dungeon floor.

### Exported Interfaces

#### `GameSceneSystems`

The complete set of systems created during scene initialization:

```typescript
interface GameSceneSystems {
  // Core entities
  player: Player;
  dungeon: DungeonData;
  dungeonGenerator: DungeonGenerator;

  // Tile layers
  wallLayer: Phaser.GameObjects.Group;
  floorLayer: Phaser.GameObjects.Group;

  // Combat & Effects
  combatSystem: CombatSystem;
  visualEffects: VisualEffectsManager;
  lootSystem: LootSystem;
  lootDropManager: LootDropManager;
  playerAttackManager: PlayerAttackManager;
  enemySpawnManager: EnemySpawnManager;
  enemyProjectiles: Phaser.Physics.Arcade.Group;

  // Room management
  roomManager: RoomManager;
  hazardSystem: HazardSystem;
  roomDecorationManager: RoomDecorationManager;
  chests: Phaser.Physics.Arcade.Group;
  shrines: Phaser.Physics.Arcade.Group;

  // Lore & NPCs
  loreSystem: LoreSystem;
  loreUIManager: LoreUIManager;
  lorePrompt: Phaser.GameObjects.Text;
  dungeonNPCManager: DungeonNPCManager;

  // UI components
  minimapUI: MinimapUI;
  levelUpUI: LevelUpUI;
  inventoryUI: InventoryUI;
  settingsUI: SettingsUI;
  dialogueUI: DialogueUI;
  gameHUD: GameHUD;
  debugMenuUI: DebugMenuUI;

  // Level exit
  exit: Phaser.Physics.Arcade.Sprite;

  // Multiplayer (nullable)
  hostController: HostController | null;
  guestController: GuestController | null;
  playerSync: PlayerSync | null;
}
```

#### `InitParams`

Parameters required to initialize the scene:

```typescript
interface InitParams {
  scene: Phaser.Scene;
  floor: number;
  currentWorld: SinWorld | null;
  audioSystem: AudioSystem;
  lightingSystem: LightingSystem;
}
```

### Exported Functions

| Function | Description |
|----------|-------------|
| `initializeSystems(params: InitParams): GameSceneSystems` | Creates all game systems and returns them as a single object |
| `createDungeonTiles(scene, dungeon, currentWorld)` | Generates wall and floor tile sprites with Wang tileset support |

### Dungeon Creation

The module handles:

1. **Procedural dungeon generation** using seeded randomness (same seed for multiplayer sync)
2. **Wang tileset rendering** for connected floor/wall textures when available
3. **World-specific textures** based on the current Sin world
4. **Light2D pipeline** application for dynamic lighting effects
5. **Room-type specific floor textures** (treasure, trap, shrine, challenge)

---

## GameSceneInput

**File:** `GameSceneInput.ts`

Manages all keyboard input handling including movement, menu toggling, and interaction keys.

### Exported Interfaces

#### `InputState`

Tracks the current input configuration:

```typescript
interface InputState {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys | null;
  wasd: {
    W: Phaser.Input.Keyboard.Key | null;
    A: Phaser.Input.Keyboard.Key | null;
    S: Phaser.Input.Keyboard.Key | null;
    D: Phaser.Input.Keyboard.Key | null;
  };
}
```

#### `KeyboardHandlerRefs`

References needed for keyboard event handlers:

```typescript
interface KeyboardHandlerRefs {
  player: Player;
  inventoryUI: InventoryUI;
  levelUpUI: LevelUpUI;
  settingsUI: SettingsUI;
  debugMenuUI: DebugMenuUI;
  loreUIManager: LoreUIManager;
  dialogueUI: DialogueUI;
  dungeonNPCManager: DungeonNPCManager;
}
```

### Exported Functions

| Function | Description |
|----------|-------------|
| `setupInput(scene): InputState` | Creates cursor keys and WASD bindings |
| `processMovement(player, inputState, speed)` | Processes movement input with diagonal normalization |
| `registerKeyboardHandlers(scene, refs)` | Registers all interaction key handlers |
| `cleanupInput(scene)` | Removes keyboard event listeners |

### Key Bindings

| Key | Action |
|-----|--------|
| `WASD` / Arrow Keys | Player movement |
| `E` | Toggle inventory |
| `ESC` | Close menus / Open settings |
| `L` | Open character/stat allocation |
| `Q` | Interact with lore objects |
| `R` | Talk to nearby NPCs |

---

## GameSceneCollisions

**File:** `GameSceneCollisions.ts`

Sets up all physics collisions and overlap handlers between game objects.

### Exported Interfaces

#### `CollisionGroups`

Physics groups involved in collisions:

```typescript
interface CollisionGroups {
  player: Player;
  wallLayer: Phaser.GameObjects.Group;
  enemies: Phaser.Physics.Arcade.Group;
  enemyProjectiles: Phaser.Physics.Arcade.Group;
  exit: Phaser.Physics.Arcade.Sprite;
  chests: Phaser.Physics.Arcade.Group;
  shrines: Phaser.Physics.Arcade.Group;
}
```

#### `CollisionSystems`

Systems required for handling collision logic:

```typescript
interface CollisionSystems {
  combatSystem: CombatSystem;
  visualEffects: VisualEffectsManager;
  audioSystem: AudioSystem;
  playerAttackManager: PlayerAttackManager;
  lootDropManager: LootDropManager;
  roomManager: RoomManager;
  roomDecorationManager: RoomDecorationManager;
  hazardSystem: HazardSystem;
  debugMenuUI: DebugMenuUI;
}
```

#### `CollisionCallbacks`

Callbacks for collision events requiring scene-level handling:

```typescript
interface CollisionCallbacks {
  onExitCollision: () => void;
}
```

### Exported Functions

| Function | Description |
|----------|-------------|
| `setupCollisions(scene, groups, systems, callbacks)` | Registers all physics colliders and overlap handlers |

### Collision Types

The module handles:

- **Wall collisions** - Player and enemies vs walls
- **Enemy collisions** - Enemy-to-enemy separation
- **Contact damage** - Player vs enemy overlap
- **Projectile hits** - Player projectiles vs enemies, enemy projectiles vs player
- **Pickup collection** - Items, weapons, gold
- **Interactive objects** - Chests, shrines
- **Door blocking** - Player and enemies vs room doors
- **Hazard arrows** - Arrow traps vs walls
- **Level exit** - Player vs exit trigger

---

## GameSceneEvents

**File:** `GameSceneEvents.ts`

Manages Phaser event registration and cleanup for inter-system communication.

### Exported Interfaces

#### `EventHandlers`

Tracks registered events for cleanup:

```typescript
interface EventHandlers {
  eventNames: string[];
}
```

#### `EventSystems`

Systems that emit or respond to events:

```typescript
interface EventSystems {
  player: Player;
  combatSystem: CombatSystem;
  visualEffects: VisualEffectsManager;
  audioSystem: AudioSystem;
  lootSystem: LootSystem;
  lootDropManager: LootDropManager;
  enemySpawnManager: EnemySpawnManager;
  roomManager: RoomManager;
  levelUpUI: LevelUpUI;
  debugMenuUI: DebugMenuUI;
}
```

#### `EventState`

Scene state accessed by event handlers:

```typescript
interface EventState {
  floor: number;
  currentWorld: SinWorld | null;
  isFinalBoss: boolean;
  getEnemiesKilled: () => number;
  setEnemiesKilled: (count: number) => void;
  getItemsCollected: () => number;
  setItemsCollected: (count: number) => void;
}
```

#### `EventCallbacks`

Callbacks for events requiring scene-level action:

```typescript
interface EventCallbacks {
  onPlayerDeath: () => void;
  onVictory: () => void;
  onWorldComplete: () => void;
}
```

### Exported Functions

| Function | Description |
|----------|-------------|
| `registerEventHandlers(scene, systems, state, callbacks): EventHandlers` | Registers all scene events and returns handler references |
| `cleanupEventHandlers(scene, handlers)` | Removes all registered event listeners |

### Registered Events

| Event | Purpose |
|-------|---------|
| `showDamageNumber` | Display floating damage text |
| `shakeCamera` | Apply screen shake effect |
| `requestEnemiesGroup` | Provide enemies group to requestor |
| `playerDeath` | Handle player death transition |
| `enemyDeath` | Process enemy death (XP, loot, room clearing) |
| `enemyAttack` | Apply enemy attack damage to player |
| `hazardDamage` | Process environmental damage |
| `itemCollected` | Track item collection stats |
| `inventoryFull` | Display inventory full message |
| `playerLevelUp` | Show level up UI and effects |
| `playerSlowed` | Sloth sin effect - reduce player speed |
| `playerPulled` | Lust sin effect - magnetic pull |
| `damageReflected` | Pride sin effect - damage reflection |
| `goldStolen` | Greed sin effect - gold theft notification |

---

## Integration with GameScene

The main `GameScene` class imports and uses these modules:

```typescript
// Import extracted modules
import { createDungeonTiles } from './game/GameSceneInit';
import { registerKeyboardHandlers, cleanupInput } from './game/GameSceneInput';
import { setupCollisions } from './game/GameSceneCollisions';
import { registerEventHandlers, cleanupEventHandlers, EventHandlers } from './game/GameSceneEvents';
```

### Lifecycle Integration

| Scene Method | Module Usage |
|--------------|--------------|
| `createScene()` | `createDungeonTiles()`, `setupCollisions()`, `registerEventHandlers()`, `registerKeyboardHandlers()` |
| `update()` | Movement handled internally; events fired through registered handlers |
| `shutdown()` | `cleanupEventHandlers()`, `cleanupInput()` |

### Data Flow

```
GameScene.createScene()
    |
    +-- createDungeonTiles() --> wallLayer, floorLayer
    |
    +-- setupCollisions() --> Physics colliders registered
    |
    +-- registerEventHandlers() --> EventHandlers object stored
    |
    +-- registerKeyboardHandlers() --> Keyboard listeners active

GameScene.shutdown()
    |
    +-- cleanupEventHandlers() --> All scene.events.off()
    |
    +-- cleanupInput() --> All keyboard.off()
```

---

## Refactoring Rationale

The original `GameScene.ts` exceeded 1000 lines with mixed concerns. This refactoring:

1. **Separates initialization from runtime** - Init module runs once, others are ongoing
2. **Groups related functionality** - Input handling together, collision setup together
3. **Enables proper cleanup** - Event handlers tracked for guaranteed removal (prevents memory leaks)
4. **Follows single-responsibility** - Each module does one thing well
5. **Improves discoverability** - Developers know where to look for specific functionality

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
