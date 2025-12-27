# BaseScene Architecture Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract common scene boilerplate into a reusable BaseScene class, reducing code duplication across GameScene, HubScene, and ShopScene.

**Architecture:** Abstract BaseScene class with opt-in helper methods. Child scenes implement `createScene()` instead of `create()`. Systems (audio, lighting, player) are initialized via protected helpers and accessed via protected properties.

**Tech Stack:** Phaser 3, TypeScript, Vite

**Verification:** Since this project has no unit tests, verify each step with:
1. `npm run build` - TypeScript compilation passes
2. `npm run dev` - Game loads and plays correctly

---

## Task 1: Create BaseScene Core Structure

**Files:**
- Create: `src/scenes/BaseScene.ts`

**Step 1: Create the BaseScene file with core structure**

Create `src/scenes/BaseScene.ts`:

```typescript
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { AudioSystem } from '../systems/AudioSystem';
import { LightingSystem } from '../systems/LightingSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { InventoryUI } from '../ui/InventoryUI';
import { SettingsUI } from '../ui/SettingsUI';
import { DialogueUI } from '../ui/DialogueUI';
import { SinWorld } from '../config/WorldConfig';

export interface BaseSceneSaveData {
  player: ReturnType<Player['getSaveData']>;
  inventory: string;
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

  // Base create() calls child's createScene()
  create(): void {
    this.createScene();
  }
}
```

**Step 2: Verify build passes**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 3: Commit**

```bash
git add src/scenes/BaseScene.ts
git commit -m "feat: add BaseScene core structure"
```

---

## Task 2: Add Audio and Lighting Helpers

**Files:**
- Modify: `src/scenes/BaseScene.ts`

**Step 1: Add initAudio helper**

Add after the `create()` method:

```typescript
  /** Initialize audio and optionally start background music */
  protected initAudio(musicKey?: 'exploration' | 'combat' | 'shrine' | 'boss'): void {
    this.audioSystem = new AudioSystem(this);
    if (musicKey) {
      this.audioSystem.startMusic(musicKey);
    }
  }
```

**Step 2: Add initLighting helper**

Add after `initAudio`:

```typescript
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
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/scenes/BaseScene.ts
git commit -m "feat: add audio and lighting helpers to BaseScene"
```

---

## Task 3: Add Player and Camera Helpers

**Files:**
- Modify: `src/scenes/BaseScene.ts`

**Step 1: Add initPlayer helper**

Add after lighting helpers:

```typescript
  /** Create player and optionally restore from save data */
  protected initPlayer(x: number, y: number, restoreFrom?: BaseSceneSaveData): Player {
    this.player = new Player(this, x, y);
    if (restoreFrom) {
      this.player.restoreFromSave(restoreFrom.player);
      this.player.inventory.deserialize(restoreFrom.inventory);
      this.player.recalculateStats();
    }
    return this.player;
  }
```

**Step 2: Add centerCamera helper**

Add after `initPlayer`:

```typescript
  /** Center camera on a fixed-size room (for rooms smaller than viewport) */
  protected centerCamera(roomWidth: number, roomHeight: number): void {
    const offsetX = (this.scale.width - roomWidth) / 2;
    const offsetY = (this.scale.height - roomHeight) / 2;
    this.cameras.main.setScroll(-offsetX, -offsetY);
  }
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/scenes/BaseScene.ts
git commit -m "feat: add player and camera helpers to BaseScene"
```

---

## Task 4: Add UI and Input Helpers

**Files:**
- Modify: `src/scenes/BaseScene.ts`

**Step 1: Add initCommonUI helper**

Add after camera helper:

```typescript
  /** Initialize common UI components (requires player to exist) */
  protected initCommonUI(): void {
    if (!this.player) {
      console.warn('BaseScene.initCommonUI: called before player exists');
      return;
    }
    this.inventoryUI = new InventoryUI(this, this.player);
    this.settingsUI = new SettingsUI(this);
    this.dialogueUI = new DialogueUI(this);
  }
```

**Step 2: Add initCommonKeys helper**

Add after `initCommonUI`:

```typescript
  /** Set up standard keyboard shortcuts (E=inventory, ESC=close/settings) */
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
      } else if (this.dialogueUI?.isOpen?.()) {
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
      (this.inventoryUI?.getIsVisible() ?? false) ||
      (this.settingsUI?.getIsVisible?.() ?? false) ||
      (this.dialogueUI?.isOpen?.() ?? false)
    );
  }
```

**Step 3: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add src/scenes/BaseScene.ts
git commit -m "feat: add UI and input helpers to BaseScene"
```

---

## Task 5: Migrate HubScene to BaseScene

**Files:**
- Modify: `src/scenes/HubScene.ts`

**Step 1: Change class declaration and imports**

Replace the import and class declaration at the top:

```typescript
// Change: import Phaser from 'phaser';
// To:
import { BaseScene, BaseSceneSaveData } from './BaseScene';
```

```typescript
// Change: export class HubScene extends Phaser.Scene {
// To:
export class HubScene extends BaseScene {
```

**Step 2: Rename create() to createScene()**

Find the `create(): void {` method and rename to `createScene(): void {`

**Step 3: Replace boilerplate with helpers**

In `createScene()`, replace the initialization code:

Replace this block (audio + lighting initialization):
```typescript
    this.audioSystem = new AudioSystem(this);
    this.audioSystem.startMusic('shrine');

    // ... savedData loading ...

    this.lightingSystem = new LightingSystem(this);
    this.lightingSystem.enable();
    this.lightingSystem.setWorld('hub');
```

With:
```typescript
    this.initAudio('shrine');
    this.initLighting('hub');
```

Replace the lighting effects block:
```typescript
    const hubTiles = this.buildHubTiles();
    this.lightingSystem.createWallRimLights(hubTiles, TILE_SIZE);
    this.lightingSystem.createShadowOverlay(
      this.HUB_WIDTH * TILE_SIZE,
      this.HUB_HEIGHT * TILE_SIZE
    );
```

With:
```typescript
    this.initLightingEffects(this.buildHubTiles(), TILE_SIZE);
```

Replace camera setup:
```typescript
    const roomWidth = this.HUB_WIDTH * TILE_SIZE;
    const roomHeight = this.HUB_HEIGHT * TILE_SIZE;
    const offsetX = (this.scale.width - roomWidth) / 2;
    const offsetY = (this.scale.height - roomHeight) / 2;
    this.cameras.main.setScroll(-offsetX, -offsetY);
```

With:
```typescript
    this.centerCamera(this.HUB_WIDTH * TILE_SIZE, this.HUB_HEIGHT * TILE_SIZE);
```

**Step 4: Remove duplicate private declarations**

Remove these private property declarations from HubScene (they now come from BaseScene):
- `private audioSystem!: AudioSystem;`
- `private lightingSystem!: LightingSystem;`
- `private inventoryUI!: InventoryUI;`
- `private settingsUI!: SettingsUI;`
- `private dialogueUI!: DialogueUI;`

Keep scene-specific properties like `player`, `portals`, `fountain`, etc.

**Step 5: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 6: Test the game**

Run: `npm run dev`
- Navigate to Hub World
- Verify: Lighting works, portals visible, can move player
- Verify: Press E for inventory, ESC for settings
- Verify: NPCs and shop work

**Step 7: Commit**

```bash
git add src/scenes/HubScene.ts
git commit -m "refactor: migrate HubScene to BaseScene"
```

---

## Task 6: Migrate ShopScene to BaseScene

**Files:**
- Modify: `src/scenes/ShopScene.ts`

**Step 1: Change class declaration and imports**

Replace import and class declaration:

```typescript
// Add import:
import { BaseScene } from './BaseScene';

// Change: export class ShopScene extends Phaser.Scene {
// To:
export class ShopScene extends BaseScene {
```

**Step 2: Rename create() to createScene()**

Find `create(): void {` and rename to `createScene(): void {`

**Step 3: Replace audio initialization**

Replace:
```typescript
    this.audioSystem = new AudioSystem(this);
    this.audioSystem.startMusic('shrine');
```

With:
```typescript
    this.initAudio('shrine');
```

**Step 4: Replace camera setup**

Replace:
```typescript
    const roomWidth = this.ROOM_WIDTH * TILE_SIZE;
    const roomHeight = this.ROOM_HEIGHT * TILE_SIZE;
    const offsetX = (this.scale.width - roomWidth) / 2;
    const offsetY = (this.scale.height - roomHeight) / 2;
    this.cameras.main.setScroll(-offsetX, -offsetY);
```

With:
```typescript
    this.centerCamera(this.ROOM_WIDTH * TILE_SIZE, this.ROOM_HEIGHT * TILE_SIZE);
```

**Step 5: Remove duplicate declarations**

Remove: `private audioSystem!: AudioSystem;`

Note: ShopScene has its own lighting setup (simpler, no LightingSystem), so we keep that as-is.

**Step 6: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Test the game**

Run: `npm run dev`
- Enter a dungeon, reach the shop (after floor 1)
- Verify: Shop room renders correctly
- Verify: Can interact with shopkeeper, fountain, crystal, portal

**Step 8: Commit**

```bash
git add src/scenes/ShopScene.ts
git commit -m "refactor: migrate ShopScene to BaseScene"
```

---

## Task 7: Migrate GameScene to BaseScene

**Files:**
- Modify: `src/scenes/GameScene.ts`

This is the largest scene. We'll migrate incrementally.

**Step 1: Change class declaration and imports**

Add import and change class:

```typescript
import { BaseScene, BaseSceneSaveData } from './BaseScene';

// Change: export class GameScene extends Phaser.Scene {
// To:
export class GameScene extends BaseScene {
```

**Step 2: Rename create() to createScene()**

Find `create(): void {` and rename to `createScene(): void {`

**Step 3: Replace audio initialization**

Replace:
```typescript
    this.combatSystem = new CombatSystem(this);
    this.lootSystem = new LootSystem(0.5);
    this.audioSystem = new AudioSystem(this);
    this.audioSystem.startMusic('exploration');
```

With:
```typescript
    this.combatSystem = new CombatSystem(this);
    this.lootSystem = new LootSystem(0.5);
    this.initAudio('exploration');
```

**Step 4: Replace lighting initialization**

Replace:
```typescript
    this.lightingSystem = new LightingSystem(this);
    this.lightingSystem.enable();
    this.lightingSystem.setWorld(this.currentWorld);
    this.lightingSystem.createWallRimLights(this.dungeon.tiles, TILE_SIZE);
    const dungeonWidth = this.dungeon.tiles[0].length * TILE_SIZE;
    const dungeonHeight = this.dungeon.tiles.length * TILE_SIZE;
    this.lightingSystem.createShadowOverlay(dungeonWidth, dungeonHeight);
```

With:
```typescript
    this.initLighting(this.currentWorld);
    this.initLightingEffects(this.dungeon.tiles, TILE_SIZE);
```

**Step 5: Remove duplicate declarations**

Remove these private declarations (now inherited from BaseScene):
- `private audioSystem!: AudioSystem;`
- `private lightingSystem!: LightingSystem;`
- `private inventoryUI!: InventoryUI;`
- `private settingsUI!: SettingsUI;`
- `private dialogueUI!: DialogueUI;`

**Step 6: Verify build passes**

Run: `npm run build`
Expected: Build succeeds

**Step 7: Test the game**

Run: `npm run dev`
- Start new game, enter a sin world
- Verify: Dungeon generates and renders
- Verify: Lighting and shadows work
- Verify: Combat, loot, enemies all function
- Verify: E for inventory, ESC for settings

**Step 8: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "refactor: migrate GameScene to BaseScene"
```

---

## Task 8: Final Cleanup and Verification

**Files:**
- All modified files

**Step 1: Full build verification**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 2: Full gameplay test**

Run: `npm run dev`

Test checklist:
- [ ] Menu loads
- [ ] Can start new game
- [ ] Hub World: portals, shop, NPCs work
- [ ] Dungeon: combat, loot, hazards work
- [ ] Shop Scene: buying, healing, rerolling work
- [ ] Save/load works
- [ ] All keyboard shortcuts work (E, ESC, WASD, Space)

**Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "refactor: complete BaseScene migration cleanup"
```

---

## Summary

After completing all tasks:
- **BaseScene.ts**: New file (~100 lines)
- **HubScene.ts**: Reduced by ~60 lines
- **ShopScene.ts**: Reduced by ~20 lines
- **GameScene.ts**: Reduced by ~40 lines
- **Total reduction**: ~120 lines of boilerplate removed
- **Benefit**: New scenes can be created with minimal boilerplate
