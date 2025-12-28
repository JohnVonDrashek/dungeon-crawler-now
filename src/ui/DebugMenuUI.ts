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

/**
 * DebugMenuUI manages the F1 debug/developer menu including:
 * - God mode toggle
 * - Level up shortcuts
 * - Gold/loot spawning
 * - Enemy killing
 * - Floor skipping
 * - World completion cheats
 */
export class DebugMenuUI {
  private scene: Phaser.Scene;
  private player: Player;
  private lootSystem: LootSystem;
  private lootDropManager: LootDropManager;
  private callbacks: DebugMenuCallbacks;

  // State
  private devMode: boolean = false;
  private debugMenu: Phaser.GameObjects.Container | null = null;
  private debugMenuVisible: boolean = false;

  // Floor/world info (updated via setFloorInfo)
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

  /**
   * Update floor and world info for debug options
   */
  setFloorInfo(floor: number, currentWorld: SinWorld | null): void {
    this.floor = floor;
    this.currentWorld = currentWorld;
  }

  /**
   * Check if god mode (invulnerability) is enabled
   */
  getIsDevMode(): boolean {
    return this.devMode;
  }

  /**
   * Check if the debug menu is currently visible
   */
  getIsVisible(): boolean {
    return this.debugMenuVisible;
  }

  /**
   * Setup F1 key to toggle debug menu
   */
  setupControls(): void {
    if (!this.scene.input.keyboard) return;

    this.scene.input.keyboard.on('keydown-F1', () => {
      this.toggle();
    });
  }

  /**
   * Toggle the debug menu open/closed
   */
  toggle(): void {
    if (this.debugMenuVisible) {
      this.close();
    } else {
      this.open();
    }
  }

  /**
   * Close the debug menu
   */
  close(): void {
    this.debugMenuVisible = false;
    if (this.debugMenu) {
      this.debugMenu.destroy();
      this.debugMenu = null;
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
          const enemies = this.callbacks.getEnemies();
          enemies.getChildren().forEach((child) => {
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

    const cam = this.scene.cameras.main;

    // Background
    const bg = this.scene.add.rectangle(
      cam.width / 2,
      cam.height / 2,
      320, 400, 0x000000, 0.9
    );
    bg.setStrokeStyle(2, 0xfbbf24);
    this.debugMenu.add(bg);

    // Title
    const title = this.scene.add.text(
      cam.width / 2,
      cam.height / 2 - 175,
      '== DEBUG MENU ==',
      { fontSize: '18px', fontFamily: 'monospace', color: '#fbbf24' }
    );
    title.setOrigin(0.5);
    this.debugMenu.add(title);

    // Hint
    const hint = this.scene.add.text(
      cam.width / 2,
      cam.height / 2 + 185,
      'Press key or click | F1/ESC to close',
      { fontSize: '10px', fontFamily: 'monospace', color: '#6b7280' }
    );
    hint.setOrigin(0.5);
    this.debugMenu.add(hint);

    // Options
    const options = this.getDebugOptions();
    const startY = cam.height / 2 - 140;

    options.forEach((opt, i) => {
      const y = startY + i * 24;
      const text = this.scene.add.text(
        cam.width / 2 - 140,
        y,
        opt.label,
        { fontSize: '13px', fontFamily: 'monospace', color: '#e5e7eb' }
      );
      text.setInteractive({ useHandCursor: true });
      text.on('pointerover', () => text.setColor('#fbbf24'));
      text.on('pointerout', () => text.setColor('#e5e7eb'));
      text.on('pointerdown', () => {
        opt.action();
      });
      this.debugMenu!.add(text);
    });

    // Setup keyboard shortcuts for debug menu
    this.setupDebugMenuKeys();
  }

  private setupDebugMenuKeys(): void {
    if (!this.scene.input.keyboard) return;

    const keyHandler = (event: KeyboardEvent) => {
      if (!this.debugMenuVisible) return;

      const options = this.getDebugOptions();
      const key = event.key.toUpperCase();

      // Number keys 1-9, 0
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
