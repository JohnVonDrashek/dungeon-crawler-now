# Scenes Architecture

[![Phaser](https://img.shields.io/badge/Phaser-3.x-blue)](https://phaser.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

This directory contains all Phaser scene classes for the dungeon crawler game. Scenes manage discrete game states and handle transitions between them.

## Table of Contents

- [Scene Architecture](#scene-architecture)
- [Scene Lifecycle](#scene-lifecycle)
- [Scene Descriptions](#scene-descriptions)
- [Scene Flow Diagram](#scene-flow-diagram)
- [Data Passing via Registry](#data-passing-via-registry)
- [Game Subdirectory Modules](#game-subdirectory-modules)
- [Event Cleanup Requirements](#event-cleanup-requirements)

---

## Scene Architecture

### BaseScene

All gameplay scenes extend `BaseScene`, which provides common functionality:

```
src/scenes/BaseScene.ts
```

**Responsibilities:**
- Abstract base class extending `Phaser.Scene`
- Provides optional systems: `AudioSystem`, `LightingSystem`, `Player`
- Provides common UI: `InventoryUI`, `SettingsUI`, `DialogueUI`
- Implements `create()` which calls child's `createScene()`

**Key Methods:**

| Method | Description |
|--------|-------------|
| `initAudio(musicKey?)` | Initialize audio system with optional background music |
| `initLighting(world?)` | Initialize lighting system with world-specific colors |
| `initLightingEffects(tiles, tileSize)` | Add wall rim lights and shadow overlay |
| `initPlayer(x, y, restoreFrom?)` | Create player and optionally restore from save |
| `centerCamera(roomWidth, roomHeight)` | Center camera on fixed-size rooms |
| `initCommonUI()` | Initialize inventory, settings, and dialogue UI |
| `initCommonKeys()` | Set up E (inventory) and ESC (close/settings) keys |
| `canToggleUI()` | Override to block UI during cutscenes/shops |
| `isUIBlocking()` | Check if any modal UI is blocking gameplay |

**Pattern:**
```typescript
export class MyScene extends BaseScene {
  createScene(): void {
    this.initAudio('exploration');
    this.initLighting('pride');
    // ... scene-specific setup
  }
}
```

---

## Scene Lifecycle

Phaser scenes follow a specific lifecycle. Here's how each phase is used:

### Standard Lifecycle Methods

| Phase | Method | Usage |
|-------|--------|-------|
| **Boot** | `init(data)` | Receive data from previous scene |
| **Load** | `preload()` | Load assets (only in BootScene) |
| **Create** | `create()` | Set up scene objects, UI, collisions |
| **Update** | `update(time, delta)` | Frame-by-frame game logic |
| **Shutdown** | `shutdown()` | **CRITICAL:** Clean up listeners and resources |

### BaseScene Pattern

BaseScene overrides `create()` to call child's `createScene()`:

```typescript
// BaseScene.ts
create(): void {
  this.createScene();
}

// Child scene implements:
abstract createScene(): void;
```

---

## Scene Descriptions

### BootScene

```
src/scenes/BootScene.ts
```

**Purpose:** Initial asset loading and game bootstrap

**Responsibilities:**
- Display loading progress bar
- Load all spritesheets (tilesets, characters, enemies, bosses)
- Load map objects (chest, shrine, portal, torch, etc.)
- Load normal maps for lighting system
- Generate placeholder assets via `AssetGenerator`
- Generate sounds via `AudioSystem.generateSounds()`
- Extract individual tiles from Wang tilesets
- Create player and enemy animations

**Flow:** BootScene -> MenuScene

---

### MenuScene

```
src/scenes/MenuScene.ts
```

**Purpose:** Main menu and game entry point

**Responsibilities:**
- Display animated title with gradient background
- Show floating ember particles and soul wisps
- Display seven sin symbols in decorative arc
- Provide New Game / Continue / Settings buttons
- Host/Join Co-op multiplayer options
- Load and display save info if available
- Handle network room creation and joining

**Flow:**
- New Game -> HubScene (deletes existing save)
- Continue -> HubScene or GameScene (based on active run)
- Host/Join Co-op -> HubScene (after connection)

**Cleanup:** Kills all tweens, removes keyboard listeners, clears network callbacks

---

### HubScene

```
src/scenes/HubScene.ts
```

**Purpose:** Central hub world with portals to all 7 sin worlds

**Responsibilities:**
- Render hub room with Wang tiles (25x20 tiles)
- Create 7 world portals with visual effects and labels
- Show completion checkmarks on conquered worlds
- Provide healing fountain (free full heal)
- Include shop NPC for between-run purchases
- Spawn Hub NPCs (Chronicler, Mysterious Figure)
- Show victory portal when all 7 worlds complete
- Handle multiplayer synchronization

**Interactables:**
- **Portals:** Enter sin worlds (Pride, Greed, Wrath, Sloth, Envy, Gluttony, Lust)
- **Fountain:** Heal to full HP
- **Shop NPC:** Open shop UI
- **Chronicler/Mysterious Figure:** Dialogue interactions
- **Victory Portal:** Appears when all worlds complete

**Debug Menu (F1):** Full heal, add gold, level up, complete worlds, reset progress

**Flow:**
- Portal -> GameScene (with world/floor data)
- Victory Portal -> VictoryScene
- ESC -> Save and return to MenuScene

---

### GameScene

```
src/scenes/GameScene.ts
```

**Purpose:** Core dungeon crawling gameplay

**Responsibilities:**
- Generate procedural dungeon using `DungeonGenerator`
- Create dungeon tiles with Wang tile system
- Spawn and manage enemies via `EnemySpawnManager`
- Handle player combat, projectiles, and collisions
- Manage room activation (doors, enemy spawns, hazards)
- Track floor progression and boss floors
- Handle multiplayer sync (host/guest controllers)
- Coordinate all game systems

**Key Systems:**
| System | Purpose |
|--------|---------|
| `CombatSystem` | Damage calculation and application |
| `RoomManager` | Door mechanics and room state |
| `EnemySpawnManager` | Enemy creation and health bars |
| `HazardSystem` | Traps, spike pits, lava |
| `LootDropManager` | Item/gold/weapon drops |
| `PlayerAttackManager` | Projectiles and melee attacks |
| `RoomDecorationManager` | Chests, shrines, decorations |
| `LoreUIManager` | Lore tablets and whispers |
| `DungeonNPCManager` | In-dungeon NPC interactions |

**Boss Logic:**
- World mode: Floor 3 is boss floor
- Legacy mode: Every 5th floor is boss, floor 20 is final boss
- Boss must be defeated before exit unlocks

**Flow:**
- Exit (non-boss or boss defeated) -> ShopScene
- World complete (floor 3 boss) -> HubScene
- Final boss defeated -> VictoryScene
- Player death -> GameOverScene

---

### ShopScene

```
src/scenes/ShopScene.ts
```

**Purpose:** Between-floor rest stop with shop and healing

**Responsibilities:**
- Render small shrine room (15x12 tiles)
- Provide Guardian Angel (shop) NPC
- Offer Holy Water fountain (paid healing: 2g per HP)
- Provide Prayer crystal (reroll shop inventory, increasing cost)
- Show exit portal to continue to next floor

**Interactables:**
| Interactable | Action | Cost |
|--------------|--------|------|
| Guardian | Open shop UI | Free |
| Holy Water | Heal to full | 2g per missing HP |
| Prayer Crystal | Reroll shop | 50g + 25g per reroll |
| Exit Portal | Continue to next floor | Free |

**Flow:** ShopScene -> GameScene (next floor)

---

### GameOverScene

```
src/scenes/GameOverScene.ts
```

**Purpose:** Display death screen with run statistics

**Responsibilities:**
- Show "GAME OVER" title
- Display death message (world-specific if in world mode)
- Show run statistics (stage, level, enemies killed, items)
- Provide navigation options

**Options:**
- World mode: "Return to Hub" / "Main Menu"
- Legacy mode: "Try Again" / "Main Menu"

**Flow:**
- Return to Hub -> HubScene
- Try Again -> GameScene (floor 1)
- Main Menu -> MenuScene

---

### VictoryScene

```
src/scenes/VictoryScene.ts
```

**Purpose:** Celebrate game completion

**Responsibilities:**
- Show "VICTORY!" or "ASCENSION!" title
- Display celebration particles (golden for world victory)
- List conquered sins for full completion
- Show run statistics
- Delete save file (game complete)

**Options:**
- "New Journey" -> HubScene (fresh start)
- "Main Menu" -> MenuScene

---

## Scene Flow Diagram

```
                    +-------------+
                    |  BootScene  |
                    +------+------+
                           |
                           v
                    +-------------+
                    |  MenuScene  |<-----------------+
                    +------+------+                  |
                           |                         |
              +------------+------------+            |
              |                         |            |
              v                         v            |
        +-----------+             +-----------+      |
        |  HubScene |<----------->| Co-op UI  |      |
        +-----+-----+             +-----------+      |
              |                                      |
              | (select world)                       |
              v                                      |
        +-----------+                                |
    +-->| GameScene |                                |
    |   +-----+-----+                                |
    |         |                                      |
    |  +------+------+------+------+                 |
    |  |      |      |      |      |                 |
    |  v      v      v      v      v                 |
    | Exit  Death  Boss   Boss   World               |
    |  |      |    (win)  (win)  Complete            |
    |  |      |      |    Final    |                 |
    |  |      v      |      |      |                 |
    |  |  +-------+  |      |      |                 |
    |  |  |GameOver|-+------+------+---------------->+
    |  |  +-------+  |      |      |
    |  |             |      v      v
    |  v             | +--------+ +---------+
    | +----------+   | |Victory | | HubScene|
    | | ShopScene|   | +---+----+ +---------+
    | +----+-----+   |     |
    |      |         |     v
    +------+         +-> MenuScene
```

---

## Data Passing via Registry

Scenes communicate via `this.registry`, a persistent key-value store:

### Common Registry Keys

| Key | Type | Set By | Used By |
|-----|------|--------|---------|
| `floor` | `number` | GameScene, ShopScene | GameScene |
| `currentWorld` | `SinWorld \| null` | HubScene, GameScene | GameScene, ShopScene |
| `shopData` | `ShopData` | GameScene | ShopScene, GameScene |
| `enemiesKilled` | `number` | GameScene | GameOverScene, VictoryScene |
| `itemsCollected` | `number` | GameScene | GameOverScene, VictoryScene |

### ShopData Structure

```typescript
interface ShopData {
  floor: number;
  currentWorld?: SinWorld | null;
  playerStats: ReturnType<Player['getSaveData']>;
  inventorySerialized: string;
}
```

### Scene Data via `init()`

Some scenes receive data directly:

```typescript
// GameOverScene
init(data: GameStats): void {
  this.stats = data; // { floor, level, enemiesKilled, itemsCollected, currentWorld }
}

// VictoryScene
init(data: GameStats): void {
  this.stats = data; // { floor, level, enemiesKilled, itemsCollected, allWorldsComplete }
}
```

---

## Game Subdirectory Modules

The `game/` subdirectory contains extracted modules that decompose `GameScene` complexity:

```
src/scenes/game/
  GameSceneInit.ts       - System initialization
  GameSceneInput.ts      - Keyboard handling
  GameSceneCollisions.ts - Physics collision setup
  GameSceneEvents.ts     - Scene event registration
```

### GameSceneInit.ts

**Purpose:** Initialize all game systems during scene creation

**Key Exports:**
- `initializeSystems(params)` - Create all game systems
- `createDungeonTiles(scene, dungeon, world)` - Create floor/wall tiles with Wang tile support

**GameSceneSystems Interface:** Returns all initialized systems including player, dungeon, managers, UI components, and multiplayer controllers.

### GameSceneInput.ts

**Purpose:** Handle keyboard input and shortcuts

**Key Exports:**
- `setupInput(scene)` - Create cursor keys and WASD input
- `processMovement(player, inputState, speed)` - Apply movement with diagonal normalization
- `registerKeyboardHandlers(scene, refs)` - Register E/ESC/L/Q/R key handlers
- `cleanupInput(scene)` - Remove keyboard listeners

**Key Bindings:**
| Key | Action |
|-----|--------|
| E | Toggle inventory |
| ESC | Close menus or open settings |
| L | Open level-up/stat allocation |
| Q | Interact with lore objects |
| R | Talk to nearby NPCs |

### GameSceneCollisions.ts

**Purpose:** Set up all physics collisions

**Key Exports:**
- `setupCollisions(scene, groups, systems, callbacks)` - Register all collision handlers

**Collision Groups:**
- Player vs walls, enemies, enemy projectiles
- Player projectiles vs enemies, walls
- Player vs exit, chests, shrines, loot
- Doors blocking player and enemies
- Hazard arrows vs walls

### GameSceneEvents.ts

**Purpose:** Register and manage scene events

**Key Exports:**
- `registerEventHandlers(scene, systems, state, callbacks)` - Register all event listeners
- `cleanupEventHandlers(scene, handlers)` - Remove registered listeners

**Events Handled:**
| Event | Description |
|-------|-------------|
| `showDamageNumber` | Display floating damage text |
| `shakeCamera` | Apply camera shake effect |
| `playerDeath` | Trigger death handling |
| `enemyDeath` | Handle loot drops, XP, room clearing |
| `enemyAttack` | Apply enemy damage to player |
| `hazardDamage` | Apply trap/hazard damage |
| `itemCollected` | Track item statistics |
| `playerLevelUp` | Show level-up UI |
| `playerSlowed` | Sloth boss effect |
| `playerPulled` | Lust boss effect |
| `damageReflected` | Pride boss effect |
| `goldStolen` | Greed boss effect |

---

## Event Cleanup Requirements

**CRITICAL:** All scenes must properly clean up in `shutdown()` to prevent memory leaks and stale listeners.

### Required Cleanup Checklist

```typescript
shutdown(): void {
  // 1. Stop audio
  this.audioSystem?.stopMusic();

  // 2. Remove keyboard listeners
  this.input.keyboard?.off('keydown-E');
  this.input.keyboard?.off('keydown-ESC');
  // ... all registered keys

  // 3. Clean up lighting system
  this.lightingSystem?.destroy();

  // 4. Kill all tweens (stops infinite animations)
  this.tweens.killAll();

  // 5. Clean up scene events
  if (this.eventHandlers) {
    cleanupEventHandlers(this, this.eventHandlers);
  }

  // 6. Clean up multiplayer
  this.hostController?.destroy();
  this.guestController?.destroy();
  this.remotePlayer?.destroy();

  // 7. Remove network message listeners
  if (this.networkMessageListenerId) {
    networkManager.offMessage(this.networkMessageListenerId);
  }

  // 8. Destroy UI managers
  this.gameHUD?.destroy();
  this.loreUIManager?.destroy();
  this.debugMenuUI?.close();
}
```

### Scene-Specific Cleanup

| Scene | Special Cleanup |
|-------|-----------------|
| MenuScene | `networkManager.clearOnPeerJoin()`, kill particle tweens |
| HubScene | Remove F1/keydown handlers, destroy remote player |
| GameScene | Use `cleanupEventHandlers()` and `cleanupInput()` |
| ShopScene | Remove E/ESC handlers, destroy shop UI |

### Common Mistakes to Avoid

1. **Not removing keyboard listeners** - Causes duplicate handlers on scene restart
2. **Not killing infinite tweens** - Memory leak and continued execution
3. **Not cleaning up event handlers** - Stale references to destroyed objects
4. **Not stopping music** - Audio continues in next scene
5. **Not cleaning network listeners** - Duplicate message handling

---

## File Summary

| File | Lines | Purpose |
|------|-------|---------|
| `BaseScene.ts` | ~130 | Abstract base with common functionality |
| `BootScene.ts` | ~295 | Asset loading and animations |
| `MenuScene.ts` | ~895 | Main menu with multiplayer |
| `HubScene.ts` | ~1200 | Central hub with portals |
| `GameScene.ts` | ~775 | Core gameplay |
| `ShopScene.ts` | ~665 | Between-floor shop |
| `GameOverScene.ts` | ~135 | Death screen |
| `VictoryScene.ts` | ~205 | Victory celebration |
| `game/GameSceneInit.ts` | ~385 | System initialization |
| `game/GameSceneInput.ts` | ~190 | Keyboard handling |
| `game/GameSceneCollisions.ts` | ~215 | Collision setup |
| `game/GameSceneEvents.ts` | ~260 | Event registration |

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
