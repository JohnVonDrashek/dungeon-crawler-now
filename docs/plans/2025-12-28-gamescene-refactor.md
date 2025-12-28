# GameScene Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Break the monolithic GameScene.ts (~2,500 lines) into focused, single-responsibility modules.

**Architecture:** Extract 6 manager/UI classes following the existing `*Manager`/`*System` pattern. Each module owns its data and methods. GameScene becomes an orchestrator that delegates to these modules.

**Tech Stack:** Phaser 3, TypeScript

---

## Summary of Extractions

| Module | Lines | Methods |
|--------|-------|---------|
| `VisualEffectsManager` | ~150 | showDamageNumber, showFloatingText, spawnDeathParticles, showGameMessage, showLevelUpNotification, shakeCamera |
| `GameHUD` | ~250 | createHUD, updateHUD, createWeaponHUD, updateWeaponHUD |
| `DebugMenuUI` | ~230 | toggleDebugMenu, openDebugMenu, closeDebugMenu, getDebugOptions, etc. |
| `RoomDecorationManager` | ~200 | addRoomDecorations, addTreasureChest, addHealingShrine, etc. |
| `LoreUIManager` | ~180 | showLoreModal, interactWithLore, updateLorePrompt, etc. |
| `DungeonNPCManager` | ~80 | spawnDungeonNPCs, checkNPCProximity, talkToNPC, etc. |

---

## Task 1: Create VisualEffectsManager

**Files:**
- Create: `src/systems/VisualEffectsManager.ts`
- Modify: `src/scenes/GameScene.ts`

**Step 1: Create VisualEffectsManager class**

```typescript
// src/systems/VisualEffectsManager.ts
import Phaser from 'phaser';

export class VisualEffectsManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  shakeCamera(intensity: number, duration: number): void {
    this.scene.cameras.main.shake(duration, intensity / 1000);
  }

  showDamageNumber(x: number, y: number, damage: number, isPlayer: boolean): void {
    const color = isPlayer ? '#ff4444' : '#ffffff';
    const text = this.scene.add.text(x, y - 20, `-${damage}`, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);
    text.setDepth(150);

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  showFloatingText(x: number, y: number, message: string, color: string): void {
    const text = this.scene.add.text(x, y, message, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);
    text.setDepth(150);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  spawnDeathParticles(x: number, y: number): void {
    const colors = [0xff4444, 0xff6666, 0xcc3333, 0xffaaaa];
    const particleCount = 8;

    for (let i = 0; i < particleCount; i++) {
      const color = Phaser.Math.RND.pick(colors);
      const particle = this.scene.add.circle(x, y, Phaser.Math.Between(2, 5), color);
      particle.setDepth(100);

      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Phaser.Math.Between(50, 120);
      const targetX = x + Math.cos(angle) * speed;
      const targetY = y + Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(300, 500),
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  showGameMessage(msg: string): void {
    const text = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height * 0.3,
      msg,
      {
        fontSize: '24px',
        color: '#ff4444',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(200);

    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 30,
      duration: 1500,
      delay: 500,
      onComplete: () => text.destroy(),
    });
  }

  showLevelUpNotification(): void {
    const text = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height * 0.3,
      `LEVEL UP!\nPress L to allocate stats`,
      {
        fontSize: '24px',
        color: '#fbbf24',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(200);

    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 40,
      duration: 2500,
      delay: 1000,
      onComplete: () => text.destroy(),
    });
  }
}
```

**Step 2: Integrate into GameScene**

In GameScene.ts:
1. Add import: `import { VisualEffectsManager } from '../systems/VisualEffectsManager';`
2. Add property: `private visualEffects!: VisualEffectsManager;`
3. In `createScene()`, add: `this.visualEffects = new VisualEffectsManager(this);`
4. Replace all calls:
   - `this.shakeCamera(...)` → `this.visualEffects.shakeCamera(...)`
   - `this.showDamageNumber(...)` → `this.visualEffects.showDamageNumber(...)`
   - `this.showFloatingText(...)` → `this.visualEffects.showFloatingText(...)`
   - `this.spawnDeathParticles(...)` → `this.visualEffects.spawnDeathParticles(...)`
   - `this.showGameMessage(...)` → `this.visualEffects.showGameMessage(...)`
   - `this.showLevelUpNotification()` → `this.visualEffects.showLevelUpNotification()`
5. Delete the old private methods from GameScene

**Step 3: Verify**

Run: `npm run build`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/systems/VisualEffectsManager.ts src/scenes/GameScene.ts
git commit -m "refactor: extract VisualEffectsManager from GameScene"
```

---

## Task 2: Create GameHUD

**Files:**
- Create: `src/ui/GameHUD.ts`
- Modify: `src/scenes/GameScene.ts`

**Step 1: Create GameHUD class**

```typescript
// src/ui/GameHUD.ts
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SinWorld, getWorldConfig } from '../config/WorldConfig';

export class GameHUD {
  private scene: Phaser.Scene;
  private player: Player;

  // HUD Elements
  private hudContainer!: Phaser.GameObjects.Container;
  private floorText!: Phaser.GameObjects.Text;
  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private xpBarBg!: Phaser.GameObjects.Graphics;
  private xpBarFill!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private statPointsText!: Phaser.GameObjects.Text;
  private weaponHUD!: Phaser.GameObjects.Container;
  private weaponIcon!: Phaser.GameObjects.Sprite;
  private weaponText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
  }

  create(): void {
    this.createMainHUD();
    this.createWeaponHUD();

    // Listen for equipment changes
    this.scene.events.on('equipmentChanged', () => {
      this.updateWeaponHUD();
    });
  }

  private createMainHUD(): void {
    const panelX = 12;
    const panelY = 12;
    const panelWidth = 200;

    this.hudContainer = this.scene.add.container(panelX, panelY);
    this.hudContainer.setScrollFactor(0);
    this.hudContainer.setDepth(100);

    // Panel background
    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x000000, 0.7);
    panelBg.fillRoundedRect(0, 0, panelWidth, 130, 4);
    panelBg.lineStyle(1, 0x444444, 0.6);
    panelBg.strokeRoundedRect(0, 0, panelWidth, 130, 4);
    this.hudContainer.add(panelBg);

    // Corner accents
    const corners = this.scene.add.graphics();
    corners.lineStyle(2, 0xff6600, 0.7);
    corners.beginPath();
    corners.moveTo(0, 10);
    corners.lineTo(0, 0);
    corners.lineTo(10, 0);
    corners.strokePath();
    corners.beginPath();
    corners.moveTo(panelWidth - 10, 0);
    corners.lineTo(panelWidth, 0);
    corners.lineTo(panelWidth, 10);
    corners.strokePath();
    this.hudContainer.add(corners);

    // Floor/World text
    this.floorText = this.scene.add.text(panelWidth / 2, 12, '', {
      fontSize: '11px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ffffff',
    });
    this.floorText.setOrigin(0.5, 0);
    this.hudContainer.add(this.floorText);

    // Divider line
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x444444, 0.5);
    divider.lineBetween(10, 28, panelWidth - 10, 28);
    this.hudContainer.add(divider);

    // HP Label
    const hpLabel = this.scene.add.text(10, 34, 'HP', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#888888',
    });
    this.hudContainer.add(hpLabel);

    // HP Bar background
    this.hpBarBg = this.scene.add.graphics();
    this.hpBarBg.fillStyle(0x1a1a1a, 1);
    this.hpBarBg.fillRoundedRect(10, 46, panelWidth - 20, 12, 2);
    this.hpBarBg.lineStyle(1, 0x333333, 1);
    this.hpBarBg.strokeRoundedRect(10, 46, panelWidth - 20, 12, 2);
    this.hudContainer.add(this.hpBarBg);

    // HP Bar fill
    this.hpBarFill = this.scene.add.graphics();
    this.hudContainer.add(this.hpBarFill);

    // HP Text overlay
    this.hpText = this.scene.add.text(panelWidth / 2, 52, '', {
      fontSize: '9px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#ffffff',
    });
    this.hpText.setOrigin(0.5);
    this.hudContainer.add(this.hpText);

    // Level & XP
    this.levelText = this.scene.add.text(10, 62, '', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#888888',
    });
    this.hudContainer.add(this.levelText);

    // XP Bar background
    this.xpBarBg = this.scene.add.graphics();
    this.xpBarBg.fillStyle(0x1a1a1a, 1);
    this.xpBarBg.fillRoundedRect(10, 74, panelWidth - 20, 8, 2);
    this.xpBarBg.lineStyle(1, 0x333333, 1);
    this.xpBarBg.strokeRoundedRect(10, 74, panelWidth - 20, 8, 2);
    this.hudContainer.add(this.xpBarBg);

    // XP Bar fill
    this.xpBarFill = this.scene.add.graphics();
    this.hudContainer.add(this.xpBarFill);

    // Stats text
    this.statsText = this.scene.add.text(10, 88, '', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#aaaaaa',
    });
    this.hudContainer.add(this.statsText);

    // Enemy count
    this.enemyText = this.scene.add.text(10, 102, '', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#666666',
    });
    this.hudContainer.add(this.enemyText);

    // Stat points notification
    this.statPointsText = this.scene.add.text(10, 116, '', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#ff6600',
    });
    this.hudContainer.add(this.statPointsText);

    // Gold display
    const goldIcon = this.scene.add.text(panelWidth - 10, 34, '◆', {
      fontSize: '10px',
      color: '#ffd700',
    });
    goldIcon.setOrigin(1, 0);
    this.hudContainer.add(goldIcon);

    this.goldText = this.scene.add.text(panelWidth - 22, 34, '0', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#ffd700',
    });
    this.goldText.setOrigin(1, 0);
    this.hudContainer.add(this.goldText);
  }

  private createWeaponHUD(): void {
    const cam = this.scene.cameras.main;
    this.weaponHUD = this.scene.add.container(cam.width - 12, cam.height - 12);
    this.weaponHUD.setScrollFactor(0);
    this.weaponHUD.setDepth(100);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(-130, -55, 130, 55, 4);
    bg.lineStyle(1, 0x444444, 0.6);
    bg.strokeRoundedRect(-130, -55, 130, 55, 4);
    this.weaponHUD.add(bg);

    const corner = this.scene.add.graphics();
    corner.lineStyle(2, 0xff6600, 0.7);
    corner.beginPath();
    corner.moveTo(0, -10);
    corner.lineTo(0, 0);
    corner.lineTo(-10, 0);
    corner.strokePath();
    this.weaponHUD.add(corner);

    const weapon = this.player.getWeapon();
    this.weaponIcon = this.scene.add.sprite(-105, -28, weapon.stats.texture);
    this.weaponIcon.setScale(1.8);
    const rarityColors = [0xcccccc, 0x22cc22, 0x2288ff, 0xaa44ff, 0xffaa00];
    this.weaponIcon.setTint(rarityColors[weapon.rarity]);
    this.weaponHUD.add(this.weaponIcon);

    this.weaponText = this.scene.add.text(-80, -40, weapon.getDisplayName(), {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#ffffff',
      wordWrap: { width: 70 },
    });
    this.weaponHUD.add(this.weaponText);

    const weaponLabel = this.scene.add.text(-80, -10, 'WEAPON', {
      fontSize: '8px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#666666',
    });
    this.weaponHUD.add(weaponLabel);
  }

  update(
    floor: number,
    currentWorld: SinWorld | null,
    isBossFloor: boolean,
    enemyCount: number
  ): void {
    const panelWidth = 200;
    const barWidth = panelWidth - 20;

    // Floor/World text
    let floorStr: string;
    if (currentWorld) {
      const worldConfig = getWorldConfig(currentWorld);
      const bossLabel = isBossFloor ? ' ⚔' : '';
      floorStr = `${worldConfig.name} ${floor}${bossLabel}`;
    } else {
      floorStr = isBossFloor ? `Stage ${floor} ⚔` : `Stage ${floor}`;
    }
    this.floorText.setText(floorStr);

    // HP Bar
    const hpPercent = Math.max(0, this.player.hp / this.player.maxHp);
    this.hpBarFill.clear();
    if (hpPercent > 0) {
      let hpColor = 0x22cc44;
      if (hpPercent < 0.3) hpColor = 0xcc2222;
      else if (hpPercent < 0.6) hpColor = 0xccaa22;

      this.hpBarFill.fillStyle(hpColor, 1);
      this.hpBarFill.fillRoundedRect(10, 46, Math.max(4, barWidth * hpPercent), 12, 2);
    }
    this.hpText.setText(`${this.player.hp} / ${this.player.maxHp}`);

    // Level & XP
    this.levelText.setText(`LVL ${this.player.level}`);

    const xpPercent = this.player.xp / this.player.xpToNextLevel;
    this.xpBarFill.clear();
    if (xpPercent > 0) {
      this.xpBarFill.fillStyle(0x8844cc, 1);
      this.xpBarFill.fillRoundedRect(10, 74, Math.max(2, barWidth * xpPercent), 8, 2);
    }

    // Stats
    this.statsText.setText(`ATK ${this.player.attack}  ·  DEF ${this.player.defense}`);

    // Enemies
    this.enemyText.setText(`Enemies: ${enemyCount}`);

    // Stat points
    if (this.player.statPoints > 0) {
      this.statPointsText.setText(`▶ ${this.player.statPoints} stat points [L]`);
      this.statPointsText.setVisible(true);
    } else {
      this.statPointsText.setVisible(false);
    }

    // Gold
    this.goldText.setText(`${this.player.gold}`);
  }

  private updateWeaponHUD(): void {
    const weapon = this.player.getWeapon();
    const rarityColors = [0xcccccc, 0x22cc22, 0x2288ff, 0xaa44ff, 0xffaa00];

    this.weaponIcon.setTexture(weapon.stats.texture);
    this.weaponIcon.setTint(rarityColors[weapon.rarity]);
    this.weaponText.setText(weapon.getDisplayName());
  }
}
```

**Step 2: Integrate into GameScene**

1. Add import: `import { GameHUD } from '../ui/GameHUD';`
2. Add property: `private gameHUD!: GameHUD;`
3. In `createScene()`, replace `this.createHUD();` with:
   ```typescript
   this.gameHUD = new GameHUD(this, this.player);
   this.gameHUD.create();
   ```
4. Replace `this.updateHUD();` calls with:
   ```typescript
   const enemyCount = this.enemies.getChildren().filter((e) => e.active).length;
   this.gameHUD.update(this.floor, this.currentWorld, this.isBossFloor, enemyCount);
   ```
5. Delete old HUD properties and methods from GameScene

**Step 3: Verify**

Run: `npm run build`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/ui/GameHUD.ts src/scenes/GameScene.ts
git commit -m "refactor: extract GameHUD from GameScene"
```

---

## Task 3: Create DebugMenuUI

**Files:**
- Create: `src/ui/DebugMenuUI.ts`
- Modify: `src/scenes/GameScene.ts`

**Step 1: Create DebugMenuUI class**

```typescript
// src/ui/DebugMenuUI.ts
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { LootSystem } from '../systems/LootSystem';
import { LootDropManager } from '../systems/LootDropManager';
import { ItemRarity } from '../systems/Item';
import { SinWorld, getWorldConfig } from '../config/WorldConfig';
import { progressionManager } from '../systems/ProgressionSystem';
import { Enemy } from '../entities/Enemy';

export interface DebugMenuCallbacks {
  getEnemies: () => Phaser.Physics.Arcade.Group;
  handleExitCollision: () => void;
  closeAndReturnToHub: () => void;
}

export class DebugMenuUI {
  private scene: Phaser.Scene;
  private player: Player;
  private lootSystem: LootSystem;
  private lootDropManager: LootDropManager;
  private callbacks: DebugMenuCallbacks;

  private devMode: boolean = false;
  private debugMenu: Phaser.GameObjects.Container | null = null;
  private debugMenuVisible: boolean = false;

  private floor: number = 1;
  private currentWorld: SinWorld | null = null;
  private readonly FINAL_FLOOR = 20;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    lootSystem: LootSystem,
    lootDropManager: LootDropManager,
    callbacks: DebugMenuCallbacks
  ) {
    this.scene = scene;
    this.player = player;
    this.lootSystem = lootSystem;
    this.lootDropManager = lootDropManager;
    this.callbacks = callbacks;
  }

  setFloorInfo(floor: number, currentWorld: SinWorld | null): void {
    this.floor = floor;
    this.currentWorld = currentWorld;
  }

  getIsDevMode(): boolean {
    return this.devMode;
  }

  getIsVisible(): boolean {
    return this.debugMenuVisible;
  }

  setupControls(): void {
    if (!this.scene.input.keyboard) return;

    this.scene.input.keyboard.on('keydown-F1', () => {
      this.toggle();
    });
  }

  toggle(): void {
    if (this.debugMenuVisible) {
      this.close();
    } else {
      this.open();
    }
  }

  private getDebugOptions(): { label: string; action: () => void }[] {
    return [
      {
        label: `[1] God Mode: ${this.devMode ? 'ON' : 'OFF'}`,
        action: () => {
          this.devMode = !this.devMode;
          if (this.devMode) this.player.hp = this.player.maxHp;
          this.showDevMessage(`God Mode: ${this.devMode ? 'ON' : 'OFF'}`);
          this.refresh();
        },
      },
      {
        label: '[2] Full Heal',
        action: () => {
          this.player.hp = this.player.maxHp;
          this.showDevMessage('Fully healed!');
        },
      },
      {
        label: '[3] Level Up x1',
        action: () => {
          this.player.gainXP(this.player.xpToNextLevel);
          this.showDevMessage('Level Up!');
        },
      },
      {
        label: '[4] Level Up x5',
        action: () => {
          for (let i = 0; i < 5; i++) this.player.gainXP(this.player.xpToNextLevel);
          this.showDevMessage('Level Up x5!');
        },
      },
      {
        label: '[5] Add 500 Gold',
        action: () => {
          this.player.gold += 500;
          this.showDevMessage('+500 Gold');
        },
      },
      {
        label: '[6] Spawn Epic Loot',
        action: () => {
          const loot = this.lootSystem.generateGuaranteedLoot(ItemRarity.EPIC);
          this.lootDropManager.spawnItemDrop(this.player.x + 30, this.player.y, loot);
          this.showDevMessage('Spawned Epic Loot');
        },
      },
      {
        label: '[7] Spawn Rare Loot',
        action: () => {
          const loot = this.lootSystem.generateGuaranteedLoot(ItemRarity.RARE);
          this.lootDropManager.spawnItemDrop(this.player.x + 30, this.player.y, loot);
          this.showDevMessage('Spawned Rare Loot');
        },
      },
      {
        label: '[8] Kill All Enemies',
        action: () => {
          let count = 0;
          this.callbacks.getEnemies().getChildren().forEach((child) => {
            const enemy = child as unknown as Enemy;
            if (enemy.active) {
              enemy.takeDamage(9999);
              count++;
            }
          });
          this.showDevMessage(`Killed ${count} enemies`);
        },
      },
      {
        label: '[9] Skip to Next Floor',
        action: () => {
          this.showDevMessage(`Skipping to floor ${this.floor + 1}`);
          this.close();
          this.callbacks.handleExitCollision();
        },
      },
      {
        label: '[0] Jump to Boss Floor',
        action: () => {
          if (this.currentWorld) {
            this.floor = 2;
            this.scene.registry.set('floor', 2);
            const worldConfig = getWorldConfig(this.currentWorld);
            this.showDevMessage(`Jumping to ${worldConfig.name} BOSS`);
          } else {
            this.floor = this.FINAL_FLOOR - 1;
            this.scene.registry.set('floor', this.floor);
            this.showDevMessage('Jumping to FINAL BOSS');
          }
          this.close();
          this.callbacks.handleExitCollision();
        },
      },
      {
        label: '[C] Complete Current World',
        action: () => {
          if (this.currentWorld) {
            progressionManager.completeWorld(this.currentWorld);
            this.showDevMessage(`Completed ${getWorldConfig(this.currentWorld).name}`);
          } else {
            this.showDevMessage('Not in world mode');
          }
        },
      },
      {
        label: '[A] Complete All Worlds',
        action: () => {
          const allWorlds = [
            SinWorld.PRIDE, SinWorld.GREED, SinWorld.WRATH,
            SinWorld.SLOTH, SinWorld.ENVY, SinWorld.GLUTTONY, SinWorld.LUST
          ];
          allWorlds.forEach(w => progressionManager.completeWorld(w));
          this.showDevMessage('All 7 worlds completed!');
        },
      },
      {
        label: '[H] Return to Hub',
        action: () => {
          this.close();
          this.callbacks.closeAndReturnToHub();
        },
      },
    ];
  }

  private open(): void {
    if (this.debugMenu) this.debugMenu.destroy();

    this.debugMenuVisible = true;
    this.debugMenu = this.scene.add.container(0, 0);
    this.debugMenu.setScrollFactor(0);
    this.debugMenu.setDepth(500);

    const bg = this.scene.add.rectangle(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2,
      320, 400, 0x000000, 0.9
    );
    bg.setStrokeStyle(2, 0xfbbf24);
    this.debugMenu.add(bg);

    const title = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 - 175,
      '== DEBUG MENU ==',
      { fontSize: '18px', fontFamily: 'monospace', color: '#fbbf24' }
    );
    title.setOrigin(0.5);
    this.debugMenu.add(title);

    const hint = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height / 2 + 185,
      'Press key or click | F1/ESC to close',
      { fontSize: '10px', fontFamily: 'monospace', color: '#6b7280' }
    );
    hint.setOrigin(0.5);
    this.debugMenu.add(hint);

    const options = this.getDebugOptions();
    const startY = this.scene.cameras.main.height / 2 - 140;

    options.forEach((opt, i) => {
      const y = startY + i * 24;
      const text = this.scene.add.text(
        this.scene.cameras.main.width / 2 - 140,
        y,
        opt.label,
        { fontSize: '13px', fontFamily: 'monospace', color: '#e5e7eb' }
      );
      text.setInteractive({ useHandCursor: true });
      text.on('pointerover', () => text.setColor('#fbbf24'));
      text.on('pointerout', () => text.setColor('#e5e7eb'));
      text.on('pointerdown', () => opt.action());
      this.debugMenu!.add(text);
    });

    this.setupDebugMenuKeys();
  }

  private setupDebugMenuKeys(): void {
    if (!this.scene.input.keyboard) return;

    const keyHandler = (event: KeyboardEvent) => {
      if (!this.debugMenuVisible) return;

      const options = this.getDebugOptions();
      const key = event.key.toUpperCase();

      if (key >= '1' && key <= '9') {
        const idx = parseInt(key) - 1;
        if (idx < options.length) options[idx].action();
      } else if (key === '0') {
        if (options.length > 9) options[9].action();
      } else if (key === 'C') {
        options.find(o => o.label.includes('[C]'))?.action();
      } else if (key === 'A') {
        options.find(o => o.label.includes('[A]'))?.action();
      } else if (key === 'H') {
        options.find(o => o.label.includes('[H]'))?.action();
      } else if (key === 'ESCAPE') {
        this.close();
      }
    };

    this.scene.input.keyboard.on('keydown', keyHandler);
    this.debugMenu?.once('destroy', () => {
      this.scene.input.keyboard?.off('keydown', keyHandler);
    });
  }

  private refresh(): void {
    if (this.debugMenuVisible) {
      this.open();
    }
  }

  close(): void {
    this.debugMenuVisible = false;
    if (this.debugMenu) {
      this.debugMenu.destroy();
      this.debugMenu = null;
    }
  }

  private showDevMessage(msg: string): void {
    const text = this.scene.add.text(10, 10, `[DEV] ${msg}`, {
      fontSize: '14px',
      color: '#fbbf24',
      backgroundColor: '#000000',
      padding: { x: 5, y: 3 },
    });
    text.setScrollFactor(0);
    text.setDepth(300);

    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      y: -20,
      duration: 1500,
      delay: 500,
      onComplete: () => text.destroy(),
    });
  }
}
```

**Step 2: Integrate into GameScene**

1. Add import: `import { DebugMenuUI } from '../ui/DebugMenuUI';`
2. Add property: `private debugMenuUI!: DebugMenuUI;`
3. In `createScene()`, after creating lootDropManager:
   ```typescript
   this.debugMenuUI = new DebugMenuUI(
     this, this.player, this.lootSystem, this.lootDropManager,
     {
       getEnemies: () => this.enemies,
       handleExitCollision: () => this.handleExitCollision(),
       closeAndReturnToHub: () => {
         this.registry.remove('currentWorld');
         this.scene.start('HubScene');
       },
     }
   );
   this.debugMenuUI.setFloorInfo(this.floor, this.currentWorld);
   ```
4. In `setupKeyboardControls()`, replace `this.setupDevControls();` with `this.debugMenuUI.setupControls();`
5. Replace `this.devMode` checks with `this.debugMenuUI.getIsDevMode()`
6. Replace `this.debugMenuVisible` checks with `this.debugMenuUI.getIsVisible()`
7. Delete old debug menu properties and methods from GameScene

**Step 3: Verify**

Run: `npm run build`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/ui/DebugMenuUI.ts src/scenes/GameScene.ts
git commit -m "refactor: extract DebugMenuUI from GameScene"
```

---

## Task 4: Create RoomDecorationManager

**Files:**
- Create: `src/systems/RoomDecorationManager.ts`
- Modify: `src/scenes/GameScene.ts`

**Step 1: Create RoomDecorationManager class**

```typescript
// src/systems/RoomDecorationManager.ts
import Phaser from 'phaser';
import { Room, RoomType, DungeonData } from './DungeonGenerator';
import { TILE_SIZE } from '../utils/constants';
import { LootSystem } from './LootSystem';
import { LootDropManager } from './LootDropManager';
import { ItemRarity } from './Item';
import { Weapon } from './Weapon';
import { LightingSystem } from './LightingSystem';
import { AudioSystem } from './AudioSystem';
import { MinimapUI } from '../ui/MinimapUI';
import { Player } from '../entities/Player';
import { VisualEffectsManager } from './VisualEffectsManager';

export class RoomDecorationManager {
  private scene: Phaser.Scene;
  private player: Player;
  private dungeon: DungeonData;
  private lightingSystem: LightingSystem;
  private audioSystem: AudioSystem;
  private lootSystem: LootSystem;
  private lootDropManager: LootDropManager;
  private minimapUI!: MinimapUI;
  private visualEffects: VisualEffectsManager;
  private floor: number;

  private chests!: Phaser.Physics.Arcade.Group;
  private shrines!: Phaser.Physics.Arcade.Group;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    dungeon: DungeonData,
    lightingSystem: LightingSystem,
    audioSystem: AudioSystem,
    lootSystem: LootSystem,
    lootDropManager: LootDropManager,
    visualEffects: VisualEffectsManager,
    floor: number
  ) {
    this.scene = scene;
    this.player = player;
    this.dungeon = dungeon;
    this.lightingSystem = lightingSystem;
    this.audioSystem = audioSystem;
    this.lootSystem = lootSystem;
    this.lootDropManager = lootDropManager;
    this.visualEffects = visualEffects;
    this.floor = floor;
  }

  setMinimapUI(minimapUI: MinimapUI): void {
    this.minimapUI = minimapUI;
  }

  create(): void {
    this.chests = this.scene.physics.add.group();
    this.shrines = this.scene.physics.add.group();
  }

  getChests(): Phaser.Physics.Arcade.Group {
    return this.chests;
  }

  getShrines(): Phaser.Physics.Arcade.Group {
    return this.shrines;
  }

  addRoomDecorations(onLoreCallback: (room: Room) => void): void {
    for (const room of this.dungeon.rooms) {
      const startLit = room.id === 0;
      this.addWallCandles(room, startLit);

      onLoreCallback(room);

      switch (room.type) {
        case RoomType.TREASURE:
          this.addTreasureChest(room);
          break;
        case RoomType.SHRINE:
          this.addHealingShrine(room);
          break;
        case RoomType.CHALLENGE:
          this.addChallengeMarkers(room);
          break;
      }
    }
  }

  private addTreasureChest(room: Room): void {
    const chestX = room.centerX * TILE_SIZE + TILE_SIZE / 2;
    const chestY = room.centerY * TILE_SIZE + TILE_SIZE / 2;

    const chest = this.chests.create(chestX, chestY, 'chest_closed') as Phaser.Physics.Arcade.Sprite;
    chest.setDepth(3);
    chest.setImmovable(true);
    chest.setData('opened', false);
    chest.setData('room', room);
    chest.setPipeline('Light2D');

    const light = this.scene.lights.addLight(chestX, chestY, 100, 0xffd700, 0.7);
    chest.setData('light', light);

    this.scene.tweens.add({
      targets: light,
      intensity: 1.0,
      radius: 120,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  handleChestOpen(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    chestObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const chest = chestObj as Phaser.Physics.Arcade.Sprite;
    if (chest.getData('opened')) return;

    chest.setData('opened', true);
    chest.setTexture('chest_open');

    const room = chest.getData('room') as Room;
    if (room && this.minimapUI) {
      this.minimapUI.markChestOpened(room.id);
    }

    const light = chest.getData('light') as Phaser.GameObjects.Light;
    if (light) {
      this.scene.tweens.killTweensOf(light);
      this.scene.lights.removeLight(light);
    }

    const lootX = chest.x;
    const lootY = chest.y - 20;

    this.audioSystem.play('sfx_pickup', 0.6);
    this.visualEffects.showGameMessage('Treasure found!');

    const treasureLoot = this.lootSystem.generateGuaranteedLoot(ItemRarity.RARE);
    this.lootDropManager.spawnItemDrop(lootX - 15, lootY, treasureLoot);

    if (Math.random() < 0.5) {
      const bonusLoot = this.lootSystem.generateGuaranteedLoot(ItemRarity.UNCOMMON);
      this.lootDropManager.spawnItemDrop(lootX + 15, lootY, bonusLoot);
    }

    const weapon = Weapon.createRandom(this.floor + 3);
    this.lootDropManager.spawnWeaponDrop(lootX, lootY - 20, weapon);
  }

  private addHealingShrine(room: Room): void {
    const shrineX = room.centerX * TILE_SIZE + TILE_SIZE / 2;
    const shrineY = room.centerY * TILE_SIZE + TILE_SIZE / 2;

    const shrine = this.shrines.create(shrineX, shrineY, 'shrine') as Phaser.Physics.Arcade.Sprite;
    shrine.setDepth(3);
    shrine.setImmovable(true);
    shrine.setData('used', false);
    shrine.setData('room', room);
    shrine.setPipeline('Light2D');

    const light = this.scene.lights.addLight(shrineX, shrineY, 120, 0x22d3ee, 0.8);
    shrine.setData('light', light);

    this.scene.tweens.add({
      targets: light,
      intensity: 1.1,
      radius: 150,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.scene.tweens.add({
      targets: shrine,
      y: shrineY - 3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  handleShrineUse(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    shrineObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const shrine = shrineObj as Phaser.Physics.Arcade.Sprite;
    if (shrine.getData('used')) return;

    shrine.setData('used', true);

    const room = shrine.getData('room') as Room;
    if (room && this.minimapUI) {
      this.minimapUI.markShrineUsed(room.id);
    }

    const healAmount = this.player.maxHp - this.player.hp;
    this.player.hp = this.player.maxHp;

    const light = shrine.getData('light') as Phaser.GameObjects.Light;
    if (light) {
      this.scene.tweens.killTweensOf(light);
      this.scene.tweens.add({
        targets: light,
        intensity: 0,
        duration: 500,
        onComplete: () => this.scene.lights.removeLight(light),
      });
    }

    this.scene.tweens.killTweensOf(shrine);
    shrine.setTint(0x666666);
    shrine.setAlpha(0.6);

    this.audioSystem.play('sfx_levelup', 0.4);
    this.visualEffects.showGameMessage(`Healed ${healAmount} HP!`);

    for (let i = 0; i < 10; i++) {
      const particle = this.scene.add.circle(
        shrine.x + Phaser.Math.Between(-20, 20),
        shrine.y + Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(2, 4),
        0x22d3ee
      );
      particle.setDepth(100);
      particle.setAlpha(0.8);

      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 40,
        alpha: 0,
        duration: Phaser.Math.Between(500, 800),
        onComplete: () => particle.destroy(),
      });
    }
  }

  private addChallengeMarkers(room: Room): void {
    const corners = [
      { x: room.x + 1, y: room.y + 1 },
      { x: room.x + room.width - 2, y: room.y + 1 },
      { x: room.x + 1, y: room.y + room.height - 2 },
      { x: room.x + room.width - 2, y: room.y + room.height - 2 },
    ];

    for (const corner of corners) {
      const marker = this.scene.add.sprite(
        corner.x * TILE_SIZE + TILE_SIZE / 2,
        corner.y * TILE_SIZE + TILE_SIZE / 2,
        'skull_marker'
      );
      marker.setDepth(2);
      marker.setAlpha(0.7);
      marker.setPipeline('Light2D');

      this.scene.tweens.add({
        targets: marker,
        alpha: 0.9,
        scale: 1.1,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private addWallCandles(room: Room, startLit: boolean = true): void {
    const tiles = this.dungeon.tiles;
    const candlePositions: { x: number; y: number }[] = [];

    const isWall = (x: number, y: number): boolean => {
      if (y < 0 || y >= tiles.length || x < 0 || x >= tiles[0].length) return false;
      return tiles[y][x] === 1;
    };

    const topY = room.y;
    for (let x = room.x + 2; x < room.x + room.width - 2; x += 4) {
      if (isWall(x, topY - 1)) candlePositions.push({ x, y: topY });
    }

    const bottomY = room.y + room.height - 1;
    for (let x = room.x + 2; x < room.x + room.width - 2; x += 4) {
      if (isWall(x, bottomY + 1)) candlePositions.push({ x, y: bottomY });
    }

    const leftX = room.x;
    for (let y = room.y + 2; y < room.y + room.height - 2; y += 4) {
      if (isWall(leftX - 1, y)) candlePositions.push({ x: leftX, y });
    }

    const rightX = room.x + room.width - 1;
    for (let y = room.y + 2; y < room.y + room.height - 2; y += 4) {
      if (isWall(rightX + 1, y)) candlePositions.push({ x: rightX, y });
    }

    candlePositions.forEach((pos) => {
      const candleX = pos.x * TILE_SIZE + TILE_SIZE / 2;
      const candleY = pos.y * TILE_SIZE + TILE_SIZE / 2;

      const candle = this.scene.add.sprite(candleX, candleY, 'candle');
      candle.setDepth(5);
      candle.setPipeline('Light2D');

      if (this.lightingSystem) {
        this.lightingSystem.createTorchLight(candleX, candleY, undefined, room.id, startLit);
      }

      this.scene.tweens.add({
        targets: candle,
        alpha: { from: 0.85, to: 1 },
        scaleX: { from: 0.95, to: 1.05 },
        duration: Phaser.Math.Between(150, 300),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 500),
      });
    });
  }
}
```

**Step 2: Integrate into GameScene**

1. Add import: `import { RoomDecorationManager } from '../systems/RoomDecorationManager';`
2. Add property: `private roomDecorationManager!: RoomDecorationManager;`
3. In `createScene()`, after creating visualEffects:
   ```typescript
   this.roomDecorationManager = new RoomDecorationManager(
     this, this.player, this.dungeon, this.lightingSystem, this.audioSystem,
     this.lootSystem, this.lootDropManager, this.visualEffects, this.floor
   );
   this.roomDecorationManager.create();

   // Get references
   this.chests = this.roomDecorationManager.getChests();
   this.shrines = this.roomDecorationManager.getShrines();
   ```
4. Replace `this.addRoomDecorations();` with:
   ```typescript
   this.roomDecorationManager.addRoomDecorations((room) => {
     this.tryAddLoreObject(room);
     if (room.type === RoomType.SHRINE) {
       this.addLoreObject(room, 'tablet');
     }
   });
   ```
5. Set minimap after creating it: `this.roomDecorationManager.setMinimapUI(this.minimapUI);`
6. Update collision handlers to use roomDecorationManager methods
7. Delete old decoration methods from GameScene

**Step 3: Verify**

Run: `npm run build`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/systems/RoomDecorationManager.ts src/scenes/GameScene.ts
git commit -m "refactor: extract RoomDecorationManager from GameScene"
```

---

## Task 5: Create LoreUIManager

**Files:**
- Create: `src/ui/LoreUIManager.ts`
- Modify: `src/scenes/GameScene.ts`

**Step 1: Create LoreUIManager class**

```typescript
// src/ui/LoreUIManager.ts
import Phaser from 'phaser';
import { Room, RoomType } from '../systems/DungeonGenerator';
import { LoreSystem, LoreEntry } from '../systems/LoreSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { TILE_SIZE } from '../utils/constants';
import { Player } from '../entities/Player';

export class LoreUIManager {
  private scene: Phaser.Scene;
  private player: Player;
  private loreSystem: LoreSystem;
  private audioSystem: AudioSystem;
  private floor: number;

  private loreObjects!: Phaser.Physics.Arcade.Group;
  private activeLoreModal: Phaser.GameObjects.Container | null = null;
  private lorePrompt!: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    loreSystem: LoreSystem,
    audioSystem: AudioSystem,
    floor: number
  ) {
    this.scene = scene;
    this.player = player;
    this.loreSystem = loreSystem;
    this.audioSystem = audioSystem;
    this.floor = floor;
  }

  create(): void {
    this.loreObjects = this.scene.physics.add.group();
    this.createLorePrompt();
  }

  getLoreObjects(): Phaser.Physics.Arcade.Group {
    return this.loreObjects;
  }

  hasActiveModal(): boolean {
    return this.activeLoreModal !== null;
  }

  closeModal(): void {
    if (this.activeLoreModal) {
      this.activeLoreModal.destroy();
      this.activeLoreModal = null;
    }
  }

  tryAddLoreObject(room: Room): void {
    if (room.type === RoomType.SPAWN || room.type === RoomType.EXIT) return;
    if (room.type === RoomType.SHRINE) return;

    if (Math.random() > 0.2) return;

    const loreType = this.loreSystem.getRandomLoreType(this.floor);
    this.addLoreObject(room, loreType);
  }

  addLoreObject(room: Room, forcedType?: 'tablet' | 'scratch' | 'whisper'): void {
    const loreType = forcedType || this.loreSystem.getRandomLoreType(this.floor);
    const lore = this.loreSystem.getRandomLore(this.floor, loreType);

    if (!lore) return;

    const offsetX = (Math.random() - 0.5) * (room.width - 4) * TILE_SIZE;
    const offsetY = (Math.random() - 0.5) * (room.height - 4) * TILE_SIZE;
    const loreX = room.centerX * TILE_SIZE + TILE_SIZE / 2 + offsetX;
    const loreY = room.centerY * TILE_SIZE + TILE_SIZE / 2 + offsetY;

    let texture: string;
    switch (lore.type) {
      case 'tablet': texture = 'lore_tablet'; break;
      case 'scratch': texture = 'lore_scratch'; break;
      case 'whisper': texture = 'lore_whisper'; break;
    }

    const loreSprite = this.loreObjects.create(loreX, loreY, texture) as Phaser.Physics.Arcade.Sprite;
    loreSprite.setDepth(3);
    loreSprite.setImmovable(true);
    loreSprite.setData('loreEntry', lore);
    loreSprite.setData('discovered', false);
    loreSprite.setPipeline('Light2D');

    if (lore.type === 'tablet') {
      const light = this.scene.lights.addLight(loreX, loreY, 60, 0x22d3ee, 0.4);
      loreSprite.setData('light', light);

      this.scene.tweens.add({
        targets: light,
        intensity: 0.6,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (lore.type === 'whisper') {
      loreSprite.setAlpha(0.6);
      this.scene.tweens.add({
        targets: loreSprite,
        y: loreY - 5,
        alpha: 0.8,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (lore.type === 'scratch') {
      loreSprite.setAlpha(0.4);
    }
  }

  tryInteractWithLore(): void {
    const INTERACT_RANGE = TILE_SIZE * 2;
    let closestLore: Phaser.Physics.Arcade.Sprite | null = null;
    let closestDist = INTERACT_RANGE;

    this.loreObjects.getChildren().forEach((child) => {
      const loreSprite = child as Phaser.Physics.Arcade.Sprite;
      if (!loreSprite.active) return;

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        loreSprite.x, loreSprite.y
      );

      if (dist < closestDist) {
        closestDist = dist;
        closestLore = loreSprite;
      }
    });

    if (closestLore) {
      this.interactWithLore(closestLore);
    }
  }

  private interactWithLore(loreSprite: Phaser.Physics.Arcade.Sprite): void {
    const loreEntry = loreSprite.getData('loreEntry') as LoreEntry;
    if (!loreEntry) return;

    const wasDiscovered = loreSprite.getData('discovered') as boolean;

    if (!wasDiscovered) {
      loreSprite.setData('discovered', true);
      this.loreSystem.markDiscovered(loreEntry.id);
    }

    switch (loreEntry.type) {
      case 'tablet':
        this.audioSystem.play('sfx_tablet', 0.4);
        this.showLoreModal(loreEntry);
        if (!wasDiscovered) {
          const light = loreSprite.getData('light') as Phaser.GameObjects.Light;
          if (light) {
            this.scene.tweens.add({
              targets: light,
              intensity: 0,
              duration: 500,
              onComplete: () => this.scene.lights.removeLight(light),
            });
          }
        }
        break;

      case 'scratch':
        this.showLoreFloatingText(loreSprite.x, loreSprite.y, loreEntry.text, '#9ca3af');
        break;

      case 'whisper':
        this.audioSystem.play('sfx_whisper', 0.3);
        this.showLoreFloatingText(loreSprite.x, loreSprite.y, loreEntry.text, '#e5e7eb', true);
        break;
    }
  }

  private showLoreModal(lore: LoreEntry): void {
    if (this.activeLoreModal) {
      this.activeLoreModal.destroy();
    }

    const camera = this.scene.cameras.main;
    const container = this.scene.add.container(
      camera.scrollX + camera.width / 2,
      camera.scrollY + camera.height / 2
    );
    container.setDepth(300);
    this.activeLoreModal = container;

    const overlay = this.scene.add.rectangle(0, 0, camera.width * 2, camera.height * 2, 0x000000, 0.8);
    overlay.setInteractive();
    container.add(overlay);

    const panelWidth = 380;
    const panelHeight = 280;
    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x2a2420);
    panel.setStrokeStyle(3, 0x8b5cf6);
    container.add(panel);

    const innerBorder = this.scene.add.rectangle(0, 0, panelWidth - 10, panelHeight - 10);
    innerBorder.setStrokeStyle(1, 0x4a4035);
    innerBorder.setFillStyle();
    container.add(innerBorder);

    const title = this.scene.add.text(0, -panelHeight / 2 + 30, lore.title || 'Ancient Writing', {
      fontSize: '18px',
      color: '#fbbf24',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    container.add(title);

    const line = this.scene.add.rectangle(0, -panelHeight / 2 + 50, 200, 2, 0x8b5cf6);
    container.add(line);

    const bodyText = this.scene.add.text(0, 0, lore.text, {
      fontSize: '14px',
      color: '#e5e7eb',
      wordWrap: { width: panelWidth - 50 },
      align: 'center',
      lineSpacing: 6,
    });
    bodyText.setOrigin(0.5);
    container.add(bodyText);

    const continueText = this.scene.add.text(0, panelHeight / 2 - 35, '[ Click to continue ]', {
      fontSize: '12px',
      color: '#9ca3af',
      fontStyle: 'italic',
    });
    continueText.setOrigin(0.5);
    container.add(continueText);

    this.scene.tweens.add({
      targets: continueText,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    overlay.on('pointerdown', () => {
      container.destroy();
      this.activeLoreModal = null;
    });
  }

  private showLoreFloatingText(x: number, y: number, text: string, color: string, italic: boolean = false): void {
    const floatText = this.scene.add.text(x, y - 20, text, {
      fontSize: '12px',
      color: color,
      fontStyle: italic ? 'italic' : 'normal',
      stroke: '#000000',
      strokeThickness: 2,
      wordWrap: { width: 150 },
      align: 'center',
    });
    floatText.setOrigin(0.5);
    floatText.setDepth(200);

    this.scene.tweens.add({
      targets: floatText,
      y: y - 60,
      alpha: 0,
      duration: 3000,
      ease: 'Power2',
      onComplete: () => floatText.destroy(),
    });
  }

  private createLorePrompt(): void {
    this.lorePrompt = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height - 40,
      '[Q] Read',
      {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#1f2937',
        padding: { x: 12, y: 6 },
      }
    );
    this.lorePrompt.setOrigin(0.5);
    this.lorePrompt.setScrollFactor(0);
    this.lorePrompt.setDepth(100);
    this.lorePrompt.setVisible(false);
  }

  updateLorePrompt(): void {
    if (this.activeLoreModal) {
      this.lorePrompt.setVisible(false);
      return;
    }

    const INTERACT_RANGE = TILE_SIZE * 2;
    let nearLore = false;
    let loreType = '';

    this.loreObjects.getChildren().forEach((child) => {
      const loreSprite = child as Phaser.Physics.Arcade.Sprite;
      if (!loreSprite.active) return;

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        loreSprite.x, loreSprite.y
      );

      if (dist < INTERACT_RANGE) {
        nearLore = true;
        const entry = loreSprite.getData('loreEntry') as LoreEntry;
        if (entry) loreType = entry.type;
      }
    });

    if (nearLore) {
      let label = 'Read';
      if (loreType === 'tablet') label = 'Read Tablet';
      else if (loreType === 'scratch') label = 'Read Scratch';
      else if (loreType === 'whisper') label = 'Listen';

      this.lorePrompt.setText(`[Q] ${label}`);
      this.lorePrompt.setVisible(true);
    } else {
      this.lorePrompt.setVisible(false);
    }
  }

  getLorePrompt(): Phaser.GameObjects.Text {
    return this.lorePrompt;
  }
}
```

**Step 2: Integrate into GameScene**

1. Add import: `import { LoreUIManager } from '../ui/LoreUIManager';`
2. Add property: `private loreUIManager!: LoreUIManager;`
3. In `createScene()`:
   ```typescript
   this.loreUIManager = new LoreUIManager(
     this, this.player, this.loreSystem, this.audioSystem, this.floor
   );
   this.loreUIManager.create();
   this.loreObjects = this.loreUIManager.getLoreObjects();
   ```
4. Replace `this.addRoomDecorations()` lore callback to use loreUIManager
5. Replace `this.updateLorePrompt()` with `this.loreUIManager.updateLorePrompt()`
6. Replace `this.tryInteractWithLore()` with `this.loreUIManager.tryInteractWithLore()`
7. Replace `this.activeLoreModal` checks with `this.loreUIManager.hasActiveModal()`
8. Delete old lore methods from GameScene

**Step 3: Verify**

Run: `npm run build`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/ui/LoreUIManager.ts src/scenes/GameScene.ts
git commit -m "refactor: extract LoreUIManager from GameScene"
```

---

## Task 6: Create DungeonNPCManager

**Files:**
- Create: `src/systems/DungeonNPCManager.ts`
- Modify: `src/scenes/GameScene.ts`

**Step 1: Create DungeonNPCManager class**

```typescript
// src/systems/DungeonNPCManager.ts
import Phaser from 'phaser';
import { DungeonData, RoomType } from './DungeonGenerator';
import { NPC, createLostSoulData, createWarningSpirit } from '../entities/NPC';
import { SinWorld } from '../config/WorldConfig';
import { TILE_SIZE } from '../utils/constants';
import { Player } from '../entities/Player';
import { DialogueUI } from '../ui/DialogueUI';

export class DungeonNPCManager {
  private scene: Phaser.Scene;
  private player: Player;
  private dungeon: DungeonData;
  private dialogueUI: DialogueUI;
  private currentWorld: SinWorld | null;
  private floor: number;

  private dungeonNPCs: NPC[] = [];
  private nearbyNPC: NPC | null = null;
  private lorePrompt: Phaser.GameObjects.Text | null = null;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    dungeon: DungeonData,
    dialogueUI: DialogueUI,
    currentWorld: SinWorld | null,
    floor: number
  ) {
    this.scene = scene;
    this.player = player;
    this.dungeon = dungeon;
    this.dialogueUI = dialogueUI;
    this.currentWorld = currentWorld;
    this.floor = floor;
  }

  setLorePrompt(lorePrompt: Phaser.GameObjects.Text): void {
    this.lorePrompt = lorePrompt;
  }

  spawnDungeonNPCs(): void {
    this.dungeonNPCs = [];

    if (!this.currentWorld) return;

    const shrineRooms = this.dungeon.rooms.filter(r => r.type === RoomType.SHRINE);

    for (const room of shrineRooms) {
      const npcX = room.centerX * TILE_SIZE + TILE_SIZE * 2;
      const npcY = room.centerY * TILE_SIZE + TILE_SIZE / 2;

      const npcData = createLostSoulData(this.currentWorld);
      const npc = new NPC(this.scene, npcX, npcY, npcData);
      this.dungeonNPCs.push(npc);
    }

    if (this.floor === 2) {
      const exitRoom = this.dungeon.rooms.find(r => r.type === RoomType.EXIT);
      if (exitRoom) {
        const warningX = exitRoom.centerX * TILE_SIZE - TILE_SIZE * 2;
        const warningY = exitRoom.centerY * TILE_SIZE + TILE_SIZE / 2;

        const warningData = createWarningSpirit(this.currentWorld);
        const warningNPC = new NPC(this.scene, warningX, warningY, warningData);
        this.dungeonNPCs.push(warningNPC);
      }
    }
  }

  checkNPCProximity(): void {
    if (!this.player || this.dungeonNPCs.length === 0) {
      this.nearbyNPC = null;
      return;
    }

    const interactDistance = TILE_SIZE * 1.5;

    for (const npc of this.dungeonNPCs) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        npc.x, npc.y
      );

      if (dist < interactDistance) {
        this.nearbyNPC = npc;
        return;
      }
    }

    this.nearbyNPC = null;
  }

  getNearbyNPC(): NPC | null {
    return this.nearbyNPC;
  }

  showNPCPrompt(): void {
    if (this.nearbyNPC && !this.dialogueUI.getIsVisible() && this.lorePrompt) {
      const npcData = this.nearbyNPC.getData();
      this.lorePrompt.setText(`[R] Talk to ${npcData.name}`);
      this.lorePrompt.setPosition(this.scene.cameras.main.width / 2, this.scene.cameras.main.height - 40);
      this.lorePrompt.setOrigin(0.5);
      this.lorePrompt.setVisible(true);
    }
  }

  talkToNPC(): void {
    if (!this.nearbyNPC || this.dialogueUI.getIsVisible()) return;

    if (this.lorePrompt) {
      this.lorePrompt.setVisible(false);
    }
    this.nearbyNPC.hideIndicator();

    const npcRef = this.nearbyNPC;
    this.dialogueUI.show({
      lines: this.nearbyNPC.getDialogue(),
      onComplete: () => {
        npcRef.showIndicator();
      },
    });
  }
}
```

**Step 2: Integrate into GameScene**

1. Add import: `import { DungeonNPCManager } from '../systems/DungeonNPCManager';`
2. Add property: `private dungeonNPCManager!: DungeonNPCManager;`
3. In `createScene()`, after creating dialogueUI:
   ```typescript
   this.dungeonNPCManager = new DungeonNPCManager(
     this, this.player, this.dungeon, this.dialogueUI, this.currentWorld, this.floor
   );
   this.dungeonNPCManager.setLorePrompt(this.loreUIManager.getLorePrompt());
   this.dungeonNPCManager.spawnDungeonNPCs();
   ```
4. In `update()`:
   - Replace `this.checkNPCProximity()` with `this.dungeonNPCManager.checkNPCProximity()`
   - Replace `if (this.nearbyNPC)` with `if (this.dungeonNPCManager.getNearbyNPC())`
   - Replace `this.showNPCPrompt()` with `this.dungeonNPCManager.showNPCPrompt()`
5. In keyboard controls, replace `this.talkToNPC()` with `this.dungeonNPCManager.talkToNPC()`
6. Replace `this.nearbyNPC` checks with `this.dungeonNPCManager.getNearbyNPC()`
7. Delete old NPC methods from GameScene

**Step 3: Verify**

Run: `npm run build`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/systems/DungeonNPCManager.ts src/scenes/GameScene.ts
git commit -m "refactor: extract DungeonNPCManager from GameScene"
```

---

## Task 7: Final Cleanup and Verification

**Step 1: Verify all imports are used**

Run: `npx eslint src/scenes/GameScene.ts --rule '@typescript-eslint/no-unused-vars: error'`

Remove any unused imports.

**Step 2: Verify build passes**

Run: `npm run build`
Expected: No type errors, no warnings

**Step 3: Test the game**

Run: `npm run dev`

Manual test:
- Start a new game
- Verify HUD displays correctly
- Verify damage numbers appear
- Verify chest/shrine interactions work
- Verify lore objects work
- Verify NPCs work
- Verify debug menu (F1) works
- Complete a room and verify doors open

**Step 4: Final commit**

```bash
git add -A
git commit -m "refactor: complete GameScene modularization

Extracted 6 focused modules from GameScene (~2500 lines → ~1200 lines):
- VisualEffectsManager: damage numbers, particles, messages
- GameHUD: health bar, XP bar, stats display
- DebugMenuUI: F1 debug menu
- RoomDecorationManager: chests, shrines, candles
- LoreUIManager: tablets, scratches, whispers
- DungeonNPCManager: lost souls, NPCs"
```

---

## Summary

After completing all tasks, GameScene.ts should be reduced from ~2,500 lines to ~1,200 lines. The scene now orchestrates focused modules:

```
src/
├── scenes/
│   └── GameScene.ts (~1,200 lines - orchestrator)
├── systems/
│   ├── VisualEffectsManager.ts (NEW)
│   ├── RoomDecorationManager.ts (NEW)
│   └── DungeonNPCManager.ts (NEW)
└── ui/
    ├── GameHUD.ts (NEW)
    ├── DebugMenuUI.ts (NEW)
    └── LoreUIManager.ts (NEW)
```
