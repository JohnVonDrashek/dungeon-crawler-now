# Scene Lifecycle Documentation

This document describes the Phaser scene lifecycle, the BaseScene pattern, scene transitions, data passing, and cleanup requirements in Infernal Ascent.

---

## Table of Contents

1. [Phaser Scene Lifecycle](#phaser-scene-lifecycle)
2. [BaseScene Pattern](#basescene-pattern)
3. [Scene Transition Map](#scene-transition-map)
4. [Data Passing](#data-passing)
5. [Event Cleanup](#event-cleanup)
6. [Camera and Input Setup](#camera-and-input-setup)

---

## Phaser Scene Lifecycle

Phaser scenes follow a specific lifecycle with methods called in a defined order:

### Lifecycle Methods

| Method | When Called | Purpose |
|--------|-------------|---------|
| `constructor()` | Scene instantiation | Define scene key, set up initial properties |
| `init(data)` | Before preload, receives transition data | Initialize scene state from passed data |
| `preload()` | After init, before create | Load assets (textures, audio, spritesheets) |
| `create()` | After preload completes | Create game objects, set up physics, UI |
| `update(time, delta)` | Every frame (~60fps) | Game loop logic, input handling, AI |
| `shutdown()` | When scene is stopped/switched | Clean up resources, remove event listeners |

### Execution Order

```
constructor() -> init(data) -> preload() -> create() -> update() [loop] -> shutdown()
```

### Method Details

#### `init(data)`

Called before `preload()`. Receives data passed from the previous scene via `this.scene.start()` or `this.scene.launch()`.

```typescript
// GameOverScene.ts
init(data: GameStats): void {
  this.stats = data || this.stats;
}

// VictoryScene.ts
init(data: GameStats): void {
  this.stats = data || this.stats;
}
```

#### `preload()`

Used exclusively by `BootScene` to load all game assets before any gameplay begins.

```typescript
// BootScene.ts
preload(): void {
  // Load tilesets
  for (const world of worlds) {
    this.load.spritesheet(`tileset_${world}`, `assets/tilesets/tileset_${world}.png`, {...});
  }

  // Load character spritesheets
  this.load.spritesheet('franciscan_idle', 'assets/characters/franciscan_idle.png', {...});

  // Generate procedural assets
  const assetGenerator = new AssetGenerator(this);
  assetGenerator.generateAll();
}
```

#### `create()`

Where all game objects, physics, and UI are created. The `BaseScene` pattern wraps this in `createScene()`.

#### `update(time, delta)`

Called every frame. Parameters:
- `time`: Total elapsed time in milliseconds since game start
- `delta`: Time since last frame in milliseconds

```typescript
update(time: number, delta: number): void {
  // Skip if UI is blocking
  if (this.inventoryUI.getIsVisible()) return;

  this.player.update(time, delta);
  this.lightingSystem.update(delta);
}
```

#### `shutdown()`

**Critical for preventing memory leaks.** Called when:
- `this.scene.start('OtherScene')` is called
- `this.scene.stop()` is called
- Scene is removed from the scene manager

---

## BaseScene Pattern

The game uses an abstract `BaseScene` class to provide consistent behavior across gameplay scenes.

### Abstract Contract

```typescript
export abstract class BaseScene extends Phaser.Scene {
  // Optional systems - only initialized if scene requests them
  protected audioSystem?: AudioSystem;
  protected lightingSystem?: LightingSystem;
  protected player?: Player;

  // Common UI - scenes opt-in via initCommonUI()
  protected inventoryUI?: InventoryUI;
  protected settingsUI?: SettingsUI;
  protected dialogueUI?: DialogueUI;

  // Child scenes implement this instead of create()
  abstract createScene(): void;

  // Base create() calls child's createScene()
  create(): void {
    this.createScene();
  }
}
```

### Scenes Using BaseScene

| Scene | Extends BaseScene |
|-------|-------------------|
| `GameScene` | Yes |
| `HubScene` | Yes |
| `ShopScene` | Yes |
| `MenuScene` | No (extends Phaser.Scene) |
| `BootScene` | No (extends Phaser.Scene) |
| `GameOverScene` | No (extends Phaser.Scene) |
| `VictoryScene` | No (extends Phaser.Scene) |

### Helper Methods

`BaseScene` provides helper methods for common initialization:

```typescript
// Initialize audio with optional music
protected initAudio(musicKey?: 'exploration' | 'combat' | 'shrine'): void

// Initialize lighting with world-specific colors
protected initLighting(world?: SinWorld | 'hub' | null): void

// Add wall rim lights and shadow overlay
protected initLightingEffects(tiles: number[][], tileSize: number): void

// Create player and optionally restore from save
protected initPlayer(x: number, y: number, restoreFrom?: BaseSceneSaveData): Player

// Center camera on fixed-size room
protected centerCamera(roomWidth: number, roomHeight: number): void

// Initialize inventory, settings, and dialogue UI
protected initCommonUI(): void

// Set up standard keyboard shortcuts (E=inventory, ESC=close/settings)
protected initCommonKeys(): void
```

### Type Narrowing in Child Scenes

Child scenes that always have certain systems use `declare` to narrow optional types:

```typescript
export class GameScene extends BaseScene {
  // Guaranteed non-null in this scene
  declare protected player: Player;
  declare protected audioSystem: AudioSystem;
  declare protected lightingSystem: LightingSystem;
}
```

---

## Scene Transition Map

### Complete Scene Flow Diagram

```
                              +-----------+
                              | BootScene |
                              +-----+-----+
                                    |
                                    v
                              +-----------+
                              | MenuScene |
                              +-----+-----+
                                    |
          +-------------------------+-------------------------+
          |                         |                         |
          v                         v                         v
    [New Game]                [Continue]              [Host/Join Co-op]
          |                         |                         |
          |    +--------------------+                         |
          |    |                                              |
          v    v                                              |
      +--------+                                              |
      |HubScene|<---------------------------------------------+
      +---+----+
          |
          +------------------+
          |                  |
          v                  v
    [Enter World]      [All 7 Complete]
          |                  |
          v                  v
    +-----------+      +--------------+
    | GameScene |      | VictoryScene |
    +-----+-----+      +--------------+
          |
    +-----+-----+-----+-----+
    |           |           |
    v           v           v
[Death]   [Exit Floor]  [Boss Kill]
    |           |           |
    v           v           v
+-------+  +---------+  +--------+
|GameOver| |ShopScene|  |HubScene|
+---+---+  +----+----+  +--------+
    |           |
    v           v
[Retry]   [Next Floor]
    |           |
    v           v
+-------+  +-----------+
|HubScene| | GameScene |
+--------+ +-----------+
```

### Transition Triggers

| From | To | Trigger | Data Passed |
|------|-----|---------|-------------|
| `BootScene` | `MenuScene` | `create()` completes | None |
| `MenuScene` | `HubScene` | New Game / Continue / Co-op | Registry: `currentWorld`, `floor` |
| `MenuScene` | `GameScene` | Continue (in-dungeon save) | Registry: `currentWorld`, `floor` |
| `HubScene` | `GameScene` | Enter portal | Registry: `currentWorld`, `floor` |
| `HubScene` | `VictoryScene` | All 7 worlds complete | init data: `GameStats` |
| `HubScene` | `MenuScene` | ESC key (save & exit) | None |
| `GameScene` | `ShopScene` | Exit collision (floor 1-2) | Registry: `shopData` |
| `GameScene` | `HubScene` | Boss kill (floor 3) | Registry cleared |
| `GameScene` | `GameOverScene` | Player death | init data: `GameStats` |
| `GameScene` | `VictoryScene` | Final boss kill (legacy) | init data: `GameStats` |
| `ShopScene` | `GameScene` | Use exit portal | Registry: `shopData`, `floor` |
| `GameOverScene` | `HubScene` | Return to Hub | None |
| `GameOverScene` | `GameScene` | Try Again (legacy) | Registry: `floor=1` |
| `GameOverScene` | `MenuScene` | Main Menu | None |
| `VictoryScene` | `HubScene` | New Journey | Registry cleared, save deleted |
| `VictoryScene` | `MenuScene` | Main Menu | None |

---

## Data Passing

Data is passed between scenes using two mechanisms:

### 1. Registry Pattern

The Phaser Registry is a global key-value store accessible from any scene:

```typescript
// Set values
this.registry.set('currentWorld', SinWorld.PRIDE);
this.registry.set('floor', 1);
this.registry.set('shopData', { floor, playerStats, inventorySerialized });

// Get values
const floor = this.registry.get('floor') || 1;
const currentWorld = this.registry.get('currentWorld') || null;

// Remove values
this.registry.remove('currentWorld');
```

#### Registry Keys Used

| Key | Type | Purpose | Set By | Read By |
|-----|------|---------|--------|---------|
| `currentWorld` | `SinWorld \| null` | Active sin world | MenuScene, HubScene | GameScene, ShopScene |
| `floor` | `number` | Current dungeon floor (1-3) | MenuScene, ShopScene | GameScene |
| `shopData` | `ShopData` | Player state for shop transition | GameScene | ShopScene, GameScene |
| `enemiesKilled` | `number` | Run statistics | GameScene | GameOverScene, VictoryScene |
| `itemsCollected` | `number` | Run statistics | GameScene | GameOverScene, VictoryScene |

#### ShopData Interface

```typescript
interface ShopData {
  floor: number;
  currentWorld?: SinWorld | null;
  playerStats: ReturnType<Player['getSaveData']>;
  inventorySerialized: string;
}
```

### 2. init() Data Parameter

For direct scene transitions, data can be passed to the `init()` method:

```typescript
// Sender
this.scene.start('GameOverScene', {
  floor: this.floor,
  level: this.player.level,
  enemiesKilled: this.enemiesKilled,
  itemsCollected: this.itemsCollected,
  currentWorld: this.currentWorld,
});

// Receiver
init(data: GameStats): void {
  this.stats = data || this.stats;
}
```

### Scene Transition with Camera Fade

Most transitions use camera fade effects for polish:

```typescript
this.cameras.main.fade(500, 0, 0, 0, false, (_camera, progress) => {
  if (progress === 1) {
    this.scene.start('GameScene');
  }
});
```

---

## Event Cleanup

### Why Cleanup Matters

Memory leaks occur when:
1. Event listeners remain attached after scene stops
2. Tweens continue running on destroyed objects
3. Network callbacks reference destroyed objects
4. Lighting systems hold references to removed sprites

**Symptoms of memory leaks:**
- Game slows down over time
- Duplicate event handlers fire
- Errors referencing destroyed objects
- Increasing memory usage

### What Must Be Cleaned Up

#### 1. Keyboard Event Listeners

```typescript
// GameScene shutdown
shutdown(): void {
  cleanupInput(this);
}

// cleanupInput implementation
export function cleanupInput(scene: Phaser.Scene): void {
  const keyboard = scene.input.keyboard;
  if (!keyboard) return;

  keyboard.off('keydown-E');
  keyboard.off('keydown-ESC');
  keyboard.off('keydown-L');
  keyboard.off('keydown-Q');
  keyboard.off('keydown-R');
}
```

#### 2. Scene Event Listeners

```typescript
// Register events and track them
const eventNames: string[] = [];
scene.events.on('enemyDeath', handler);
eventNames.push('enemyDeath');

// Cleanup all registered events
export function cleanupEventHandlers(scene: Phaser.Scene, handlers: EventHandlers): void {
  for (const eventName of handlers.eventNames) {
    scene.events.off(eventName);
  }
}
```

#### 3. Tweens

```typescript
// Kill all tweens in the scene
shutdown(): void {
  this.tweens.killAll();
}
```

#### 4. Audio

```typescript
shutdown(): void {
  this.audioSystem?.stopMusic();
}
```

#### 5. Lighting System

```typescript
shutdown(): void {
  this.lightingSystem?.destroy();
}
```

#### 6. Multiplayer Controllers

```typescript
shutdown(): void {
  this.hostController?.destroy();
  this.guestController?.destroy();
  this.remotePlayer?.destroy();

  if (this.networkMessageListenerId) {
    networkManager.offMessage(this.networkMessageListenerId);
    this.networkMessageListenerId = null;
  }
}
```

#### 7. UI Managers

```typescript
shutdown(): void {
  this.gameHUD?.destroy();
  this.loreUIManager?.destroy();
  this.debugMenuUI?.close();
}
```

### Cleanup Checklist

Use this checklist when implementing `shutdown()`:

- [ ] Stop background music (`audioSystem.stopMusic()`)
- [ ] Remove keyboard event listeners (`keyboard.off('keydown-X')`)
- [ ] Remove scene event listeners (`scene.events.off('eventName')`)
- [ ] Kill all tweens (`this.tweens.killAll()`)
- [ ] Destroy lighting system (`lightingSystem.destroy()`)
- [ ] Destroy multiplayer controllers
- [ ] Remove network message listeners
- [ ] Destroy UI managers that have cleanup needs
- [ ] Clear any stored references to destroyed objects

### Scene-Specific Cleanup

#### MenuScene
```typescript
shutdown(): void {
  this.tweens.killAll();
  this.input.keyboard?.removeAllListeners();
  networkManager.clearOnPeerJoin();
}
```

#### HubScene
```typescript
shutdown(): void {
  this.audioSystem?.stopMusic();
  this.input.keyboard?.off('keydown-R');
  this.input.keyboard?.off('keydown-E');
  this.input.keyboard?.off('keydown-Q');
  this.input.keyboard?.off('keydown-ESC');
  this.input.keyboard?.off('keydown-F1');
  this.input.keyboard?.off('keydown');
  this.lightingSystem?.destroy();
  this.remotePlayer?.destroy();
  if (this.networkMessageListenerId) {
    networkManager.offMessage(this.networkMessageListenerId);
  }
}
```

#### GameScene
```typescript
shutdown(): void {
  this.gameHUD?.destroy();
  this.loreUIManager?.destroy();
  this.debugMenuUI?.close();
  this.hostController?.destroy();
  this.guestController?.destroy();
  this.audioSystem?.stopMusic();
  cleanupEventHandlers(this, this.eventHandlers);
  cleanupInput(this);
  this.lightingSystem?.destroy();
}
```

#### ShopScene
```typescript
shutdown(): void {
  this.audioSystem?.stopMusic();
  this.input.keyboard?.off('keydown-E');
  this.input.keyboard?.off('keydown-ESC');
  this.lightingSystem?.destroy();
  this.tweens.killAll();
}
```

---

## Camera and Input Setup

### Camera Configuration

#### Following Camera (GameScene)

```typescript
private setupCamera(): void {
  // Smooth follow with lerp
  this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

  // Set world bounds to prevent camera from showing outside dungeon
  this.cameras.main.setBounds(0, 0, DUNGEON_WIDTH * TILE_SIZE, DUNGEON_HEIGHT * TILE_SIZE);
}
```

#### Centered Static Camera (HubScene, ShopScene)

For rooms smaller than the viewport:

```typescript
protected centerCamera(roomWidth: number, roomHeight: number): void {
  const offsetX = (this.scale.width - roomWidth) / 2;
  const offsetY = (this.scale.height - roomHeight) / 2;
  this.cameras.main.setScroll(-offsetX, -offsetY);
}
```

### Keyboard Handler Registration

Keyboard handlers are registered in `create()` or `createScene()`:

```typescript
// Method 1: Using keyboard.on()
this.input.keyboard!.on('keydown-R', () => {
  this.handleInteraction();
});

// Method 2: Using addKey() for polling
this.interactKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.R);
this.interactKey.on('down', () => this.handleInteract());

// Method 3: Using extracted module
registerKeyboardHandlers(this, {
  player: this.player,
  inventoryUI: this.inventoryUI,
  levelUpUI: this.levelUpUI,
  settingsUI: this.settingsUI,
  debugMenuUI: this.debugMenuUI,
  loreUIManager: this.loreUIManager,
  dialogueUI: this.dialogueUI,
  dungeonNPCManager: this.dungeonNPCManager,
});
```

### Standard Key Bindings

| Key | Action | Scenes |
|-----|--------|--------|
| WASD | Movement | GameScene, HubScene, ShopScene |
| E | Toggle Inventory | All gameplay scenes |
| ESC | Close UI / Open Settings | All gameplay scenes |
| L | Level Up / Stats menu | GameScene |
| Q | Interact with lore / Close modal | GameScene |
| R | Interact / Talk to NPC | GameScene, HubScene, ShopScene |
| F1 | Debug menu | GameScene, HubScene |
| Space | Dodge roll | GameScene |
| Click | Attack | GameScene |

### Pointer Event Setup

Attack handling uses pointer events:

```typescript
// In PlayerAttackManager
setupPlayerAttack(inventoryUI: InventoryUI, levelUpUI: LevelUpUI): void {
  this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    // Skip if UI is blocking
    if (inventoryUI.getIsVisible() || levelUpUI.getIsVisible()) return;

    // Skip if not left click
    if (pointer.button !== 0) return;

    this.attack(pointer.worldX, pointer.worldY);
  });
}
```

### Input Blocking for UI

When modal UIs are open, input should be blocked:

```typescript
update(time: number, delta: number): void {
  // Block update when UI is open
  if (this.inventoryUI.getIsVisible() || this.levelUpUI.getIsVisible() || this.settingsUI.getIsVisible()) {
    return;
  }

  if (this.debugMenuUI.getIsVisible()) {
    return;
  }

  // Normal update logic...
}
```

---

## Summary

The scene system in Infernal Ascent follows these principles:

1. **BaseScene Pattern**: Gameplay scenes extend `BaseScene` and implement `createScene()` instead of `create()`

2. **Registry for State**: Use `this.registry.set/get` for data that persists across scene transitions

3. **init() for Direct Data**: Use the `init(data)` parameter for one-time transition data

4. **Always Clean Up**: Every scene with event listeners, tweens, or systems must implement `shutdown()` to prevent memory leaks

5. **Camera Setup**: Use `startFollow()` for dynamic scenes, `centerCamera()` for fixed rooms

6. **Input Organization**: Use extracted modules for keyboard handlers to keep scenes clean and ensure proper cleanup
