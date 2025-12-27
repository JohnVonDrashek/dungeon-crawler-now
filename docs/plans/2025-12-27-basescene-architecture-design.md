# BaseScene Architecture Design

## Problem

Scene files contain significant boilerplate duplication:
- GameScene.ts is 77KB with ~150 lines of repeated setup
- HubScene, ShopScene, and others repeat the same patterns
- Adding new scenes requires copy-pasting initialization code

## Solution

Create an abstract `BaseScene` class that provides opt-in helper methods for common setup patterns.

## Design

### Core Structure

```ts
// src/scenes/BaseScene.ts
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { AudioSystem } from '../systems/AudioSystem';
import { LightingSystem } from '../systems/LightingSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { InventoryUI } from '../ui/InventoryUI';
import { SettingsUI } from '../ui/SettingsUI';
import { DialogueUI } from '../ui/DialogueUI';
import { SinWorld } from '../config/WorldConfig';

export interface SaveData {
  player: ReturnType<Player['getSaveData']>;
  inventory: string;
  progression?: Record<string, boolean>;
}

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

  // Base create() orchestrates setup, then calls createScene()
  create(): void {
    this.createScene();
  }
}
```

### Helper Methods

```ts
export abstract class BaseScene extends Phaser.Scene {
  // ... core structure ...

  /** Initialize audio and optionally start background music */
  protected initAudio(musicKey?: 'exploration' | 'combat' | 'shrine' | 'boss'): void {
    this.audioSystem = new AudioSystem(this);
    if (musicKey) {
      this.audioSystem.startMusic(musicKey);
    }
  }

  /** Initialize lighting with world-specific colors */
  protected initLighting(world?: SinWorld | 'hub' | null): void {
    this.lightingSystem = new LightingSystem(this);
    this.lightingSystem.enable();
    if (world) {
      this.lightingSystem.setWorld(world);
    }
  }

  /** Add wall rim lights and shadow overlay for a tile-based room */
  protected initLightingEffects(tiles: number[][], tileSize: number): void {
    if (!this.lightingSystem) return;
    this.lightingSystem.createWallRimLights(tiles, tileSize);
    const width = tiles[0].length * tileSize;
    const height = tiles.length * tileSize;
    this.lightingSystem.createShadowOverlay(width, height);
  }

  /** Create player and optionally restore from save data */
  protected initPlayer(x: number, y: number, restoreFrom?: SaveData): Player {
    this.player = new Player(this, x, y);
    if (restoreFrom) {
      this.player.restoreFromSave(restoreFrom.player);
      SaveSystem.restoreInventory(this.player.inventory, restoreFrom.inventory);
      this.player.recalculateStats();
    }
    return this.player;
  }

  /** Center camera on a fixed-size room */
  protected centerCamera(roomWidth: number, roomHeight: number): void {
    const offsetX = (this.scale.width - roomWidth) / 2;
    const offsetY = (this.scale.height - roomHeight) / 2;
    this.cameras.main.setScroll(-offsetX, -offsetY);
  }
}
```

### UI and Input Handling

```ts
export abstract class BaseScene extends Phaser.Scene {
  // ... previous sections ...

  /** Initialize common UI components */
  protected initCommonUI(): void {
    if (!this.player) {
      console.warn('initCommonUI called before player exists');
      return;
    }
    this.inventoryUI = new InventoryUI(this, this.player);
    this.settingsUI = new SettingsUI(this);
    this.dialogueUI = new DialogueUI(this);
  }

  /** Set up standard keyboard shortcuts (E=inventory, ESC=close, etc.) */
  protected initCommonKeys(): void {
    if (!this.input.keyboard) return;

    // E - Toggle inventory
    this.input.keyboard.on('keydown-E', () => {
      if (this.canToggleUI()) {
        this.inventoryUI?.toggle();
        if (this.inventoryUI?.getIsVisible()) {
          this.player?.setVelocity(0, 0);
        }
      }
    });

    // ESC - Close any open UI, or open settings if nothing open
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.inventoryUI?.getIsVisible()) {
        this.inventoryUI.hide();
      } else if (this.dialogueUI?.isOpen()) {
        // Don't interrupt dialogue with ESC
      } else {
        this.settingsUI?.toggle();
      }
    });
  }

  /** Override in child scenes to block UI during cutscenes, shops, etc. */
  protected canToggleUI(): boolean {
    return true;
  }

  /** Check if any modal UI is currently blocking gameplay */
  protected isUIBlocking(): boolean {
    return (
      this.inventoryUI?.getIsVisible() ||
      this.settingsUI?.getIsVisible() ||
      this.dialogueUI?.isOpen() ||
      false
    );
  }
}
```

## Migration Example

### Before (HubScene ~150 lines of setup)

```ts
export class HubScene extends Phaser.Scene {
  create(): void {
    this.audioSystem = new AudioSystem(this);
    this.audioSystem.startMusic('shrine');

    const savedData = SaveSystem.load();
    if (savedData) {
      progressionManager.setProgression(savedData.progression);
    }

    this.lightingSystem = new LightingSystem(this);
    this.lightingSystem.enable();
    this.lightingSystem.setWorld('hub');

    this.createRoom();

    const hubTiles = this.buildHubTiles();
    this.lightingSystem.createWallRimLights(hubTiles, TILE_SIZE);
    this.lightingSystem.createShadowOverlay(
      this.HUB_WIDTH * TILE_SIZE,
      this.HUB_HEIGHT * TILE_SIZE
    );

    this.player = new Player(this, spawnX, spawnY);
    this.lightingSystem.createPlayerTorch(spawnX, spawnY);

    if (savedData) {
      this.player.restoreFromSave(savedData.player);
      SaveSystem.restoreInventory(this.player.inventory, savedData.inventory);
      this.player.recalculateStats();
    }

    // ... camera, UI, keyboard setup continues ...
  }
}
```

### After (~40 lines of setup)

```ts
export class HubScene extends BaseScene {
  createScene(): void {
    const savedData = SaveSystem.load();
    if (savedData) {
      progressionManager.setProgression(savedData.progression);
    }

    this.initAudio('shrine');
    this.initLighting('hub');

    this.createRoom();
    this.initLightingEffects(this.buildHubTiles(), TILE_SIZE);

    const spawnX = (this.HUB_WIDTH / 2) * TILE_SIZE;
    const spawnY = (this.HUB_HEIGHT / 2 + 2) * TILE_SIZE;
    this.initPlayer(spawnX, spawnY, savedData);
    this.lightingSystem?.createPlayerTorch(spawnX, spawnY);

    this.centerCamera(this.HUB_WIDTH * TILE_SIZE, this.HUB_HEIGHT * TILE_SIZE);
    this.initCommonUI();
    this.initCommonKeys();

    // Hub-specific setup continues...
    this.createPortals();
    this.createFountain();
    this.createHubNPCs();
  }
}
```

## Implementation Plan

1. Create `src/scenes/BaseScene.ts` with core structure and helpers
2. Migrate `HubScene` first (simplest, good test case)
3. Migrate `ShopScene`
4. Migrate `GameScene` (largest, most complex)
5. Update `MenuScene`, `GameOverScene`, `VictoryScene` if applicable

## Design Principles

- **Opt-in, not forced**: Systems are optional. Scenes use only what they need.
- **`createScene()` pattern**: Prevents "forgot to call super" bugs.
- **Protected access**: Child scenes can access systems for scene-specific logic.
- **Hooks for customization**: `canToggleUI()` lets scenes block UI when needed.

## Expected Results

- ~70% reduction in scene setup boilerplate
- Consistent behavior across all scenes
- Easier to add new scenes
- Scenes clearly show *what they do* rather than *how Phaser works*
