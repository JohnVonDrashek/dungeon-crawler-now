import Phaser from 'phaser';
import { BaseScene } from './BaseScene';
import { TILE_SIZE } from '../utils/constants';
import { Player } from '../entities/Player';
import { ShopUI } from '../ui/ShopUI';
import { InventoryUI } from '../ui/InventoryUI';
import { SinWorld } from '../config/WorldConfig';
import { progressionManager } from '../systems/ProgressionSystem';

interface ShopData {
  floor: number;
  currentWorld?: SinWorld | null;
  playerStats: ReturnType<Player['getSaveData']>;
  inventorySerialized: string;
}

export class ShopScene extends BaseScene {
  protected declare player: Player;
  private floor: number = 1;
  private currentWorld: SinWorld | null = null;
  private shopUI!: ShopUI;
  protected declare inventoryUI: InventoryUI;

  // Room dimensions
  private readonly ROOM_WIDTH = 15;
  private readonly ROOM_HEIGHT = 12;

  // Interactables
  private shopkeeper!: Phaser.Physics.Arcade.Sprite;
  private fountain!: Phaser.Physics.Arcade.Sprite;
  private rerollCrystal!: Phaser.Physics.Arcade.Sprite;
  private exitPortal!: Phaser.Physics.Arcade.Sprite;

  // State
  private shopOpen: boolean = false;
  private healCost: number = 0;
  private rerollCost: number = 50;
  private rerollCount: number = 0;
  private nearInteractable: 'shopkeeper' | 'fountain' | 'crystal' | 'portal' | null = null;

  // UI
  private goldText!: Phaser.GameObjects.Text;
  private hpText!: Phaser.GameObjects.Text;
  private tooltipText!: Phaser.GameObjects.Text;
  private interactKey!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: 'ShopScene' });
  }

  createScene(): void {
    // Get data from registry
    const shopData = this.registry.get('shopData') as ShopData | undefined;
    if (shopData) {
      this.floor = shopData.floor;
      this.currentWorld = shopData.currentWorld || null;
    } else {
      this.floor = this.registry.get('floor') || 1;
      this.currentWorld = this.registry.get('currentWorld') || null;
    }

    // Initialize audio and start peaceful shrine music
    this.initAudio('shrine');

    // Create the room
    this.createRoom();

    // Enable lighting system
    this.lights.enable();
    this.lights.setAmbientColor(0x444444);

    // Create player at spawn position
    const spawnX = (this.ROOM_WIDTH / 2) * TILE_SIZE;
    const spawnY = (this.ROOM_HEIGHT - 3) * TILE_SIZE;
    this.player = new Player(this, spawnX, spawnY);

    // Restore player state
    if (shopData) {
      this.player.restoreFromSave(shopData.playerStats);
      this.player.inventory.deserialize(shopData.inventorySerialized);
      this.player.recalculateStats();
    }

    // Set up camera - center the small room on screen (no scrolling needed)
    this.centerCamera(this.ROOM_WIDTH * TILE_SIZE, this.ROOM_HEIGHT * TILE_SIZE);

    // Create interactables
    this.createInteractables();

    // Create UI
    this.createUI();

    // Create shop UI (hidden initially)
    this.shopUI = new ShopUI(this, this.player, this.floor);

    // Create inventory UI
    this.inventoryUI = new InventoryUI(this, this.player);

    // Calculate heal cost
    this.updateHealCost();

    // Set up interact key (R) and inventory key (E)
    if (this.input.keyboard) {
      this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
      this.interactKey.on('down', () => this.handleInteract());

      // Inventory key (E) - same as GameScene
      this.input.keyboard.on('keydown-E', () => {
        if (!this.shopOpen) {
          this.inventoryUI.toggle();
          if (this.inventoryUI.getIsVisible()) {
            this.player.setVelocity(0, 0);
          }
        }
      });

      // ESC to close inventory
      this.input.keyboard.on('keydown-ESC', () => {
        if (this.inventoryUI.getIsVisible()) {
          this.inventoryUI.toggle();
        }
      });
    }

    // Fade in
    this.cameras.main.fadeIn(300);
  }

  private handleInteract(): void {
    if (this.shopOpen) return;

    switch (this.nearInteractable) {
      case 'shopkeeper':
        this.openShop();
        break;
      case 'crystal':
        this.useRerollCrystal();
        break;
      case 'fountain':
        this.useFountain();
        break;
      case 'portal':
        this.usePortal();
        break;
    }
  }

  update(time: number, delta: number): void {
    if (!this.shopOpen && !this.inventoryUI.getIsVisible()) {
      this.player.update(time, delta);
    }

    // Update HUD
    this.updateHUD();
  }

  private createRoom(): void {
    // Create tilemap-like floor and walls
    for (let y = 0; y < this.ROOM_HEIGHT; y++) {
      for (let x = 0; x < this.ROOM_WIDTH; x++) {
        const worldX = x * TILE_SIZE;
        const worldY = y * TILE_SIZE;

        // Walls on edges
        if (x === 0 || x === this.ROOM_WIDTH - 1 || y === 0 || y === this.ROOM_HEIGHT - 1) {
          const wall = this.add.image(worldX, worldY, 'wall_tavern').setOrigin(0, 0).setDepth(0);
          wall.setPipeline('Light2D');
        } else {
          // Floor
          const floor = this.add.image(worldX, worldY, 'floor_tavern').setOrigin(0, 0).setDepth(0);
          floor.setPipeline('Light2D');
        }
      }
    }

    // Add wall collisions
    const walls = this.physics.add.staticGroup();

    // Top wall
    const topWall = this.add.rectangle(
      (this.ROOM_WIDTH * TILE_SIZE) / 2,
      TILE_SIZE / 2,
      this.ROOM_WIDTH * TILE_SIZE,
      TILE_SIZE
    );
    this.physics.add.existing(topWall, true);
    walls.add(topWall);

    // Bottom wall
    const bottomWall = this.add.rectangle(
      (this.ROOM_WIDTH * TILE_SIZE) / 2,
      (this.ROOM_HEIGHT - 0.5) * TILE_SIZE,
      this.ROOM_WIDTH * TILE_SIZE,
      TILE_SIZE
    );
    this.physics.add.existing(bottomWall, true);
    walls.add(bottomWall);

    // Left wall
    const leftWall = this.add.rectangle(
      TILE_SIZE / 2,
      (this.ROOM_HEIGHT * TILE_SIZE) / 2,
      TILE_SIZE,
      this.ROOM_HEIGHT * TILE_SIZE
    );
    this.physics.add.existing(leftWall, true);
    walls.add(leftWall);

    // Right wall
    const rightWall = this.add.rectangle(
      (this.ROOM_WIDTH - 0.5) * TILE_SIZE,
      (this.ROOM_HEIGHT * TILE_SIZE) / 2,
      TILE_SIZE,
      this.ROOM_HEIGHT * TILE_SIZE
    );
    this.physics.add.existing(rightWall, true);
    walls.add(rightWall);

    // Wall collision
    this.time.delayedCall(100, () => {
      this.physics.add.collider(this.player, walls);
    });

    // Add decorative candles along walls
    const candlePositions = [
      { x: 2, y: 1 },
      { x: this.ROOM_WIDTH - 3, y: 1 },
      { x: 2, y: this.ROOM_HEIGHT - 2 },
      { x: this.ROOM_WIDTH - 3, y: this.ROOM_HEIGHT - 2 },
      { x: Math.floor(this.ROOM_WIDTH / 2), y: 1 },
      { x: 1, y: Math.floor(this.ROOM_HEIGHT / 2) },
      { x: this.ROOM_WIDTH - 2, y: Math.floor(this.ROOM_HEIGHT / 2) },
    ];

    candlePositions.forEach((pos) => {
      const candleX = pos.x * TILE_SIZE + TILE_SIZE / 2;
      const candleY = pos.y * TILE_SIZE + TILE_SIZE / 2;
      const candle = this.add.sprite(candleX, candleY, 'candle');
      candle.setDepth(5);
      candle.setPipeline('Light2D');

      // Real point light for candle
      const candleLight = this.lights.addLight(candleX, candleY, 80, 0xffaa44, 0.5);

      // Flickering light effect
      this.tweens.add({
        targets: candleLight,
        intensity: { from: 0.4, to: 0.6 },
        duration: Phaser.Math.Between(150, 300),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 500),
      });
    });

    // Title text
    const titleText = this.add.text(
      (this.ROOM_WIDTH / 2) * TILE_SIZE,
      1.5 * TILE_SIZE,
      'Wayside Shrine',
      {
        fontSize: '14px',
        color: '#fbbf24',
        fontStyle: 'bold',
      }
    );
    titleText.setOrigin(0.5, 0.5);
    titleText.setDepth(10);
  }

  private createInteractables(): void {
    // Guardian Angel (top left area)
    const shopkeeperX = 4 * TILE_SIZE;
    const shopkeeperY = 3 * TILE_SIZE;
    this.shopkeeper = this.physics.add.sprite(shopkeeperX, shopkeeperY, 'shopkeeper');
    this.shopkeeper.setImmovable(true);
    this.shopkeeper.setDepth(5);
    this.shopkeeper.setPipeline('Light2D');

    // Angel glow (holy light) - real point light
    const shopkeeperLight = this.lights.addLight(shopkeeperX, shopkeeperY, 100, 0xffffee, 0.6);
    this.tweens.add({
      targets: shopkeeperLight,
      intensity: 0.9,
      radius: 120,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Guardian label
    this.add.text(shopkeeperX, shopkeeperY - 20, 'Guardian', {
      fontSize: '10px',
      color: '#fbbf24',
    }).setOrigin(0.5, 0.5).setDepth(10);

    // Fountain (top right area)
    const fountainX = (this.ROOM_WIDTH - 4) * TILE_SIZE;
    const fountainY = 3 * TILE_SIZE;
    this.fountain = this.physics.add.sprite(fountainX, fountainY, 'fountain');
    this.fountain.setImmovable(true);
    this.fountain.setDepth(5);
    this.fountain.setPipeline('Light2D');

    // Fountain glow - real point light
    const fountainLight = this.lights.addLight(fountainX, fountainY, 100, 0x3b82f6, 0.6);
    this.tweens.add({
      targets: fountainLight,
      intensity: 0.9,
      radius: 120,
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });

    // Fountain label
    this.add.text(fountainX, fountainY - 20, 'Holy Water', {
      fontSize: '10px',
      color: '#3b82f6',
    }).setOrigin(0.5, 0.5).setDepth(10);

    // Reroll crystal (middle left)
    const crystalX = 3 * TILE_SIZE;
    const crystalY = 6 * TILE_SIZE;
    this.rerollCrystal = this.physics.add.sprite(crystalX, crystalY, 'reroll_crystal');
    this.rerollCrystal.setImmovable(true);
    this.rerollCrystal.setDepth(5);
    this.rerollCrystal.setPipeline('Light2D');

    // Crystal glow - real point light
    const crystalLight = this.lights.addLight(crystalX, crystalY, 80, 0x8b5cf6, 0.6);
    this.tweens.add({
      targets: crystalLight,
      intensity: 0.9,
      radius: 100,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Crystal floating animation
    this.tweens.add({
      targets: this.rerollCrystal,
      y: crystalY - 4,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Crystal label
    this.add.text(crystalX, crystalY - 20, 'Prayer', {
      fontSize: '10px',
      color: '#8b5cf6',
    }).setOrigin(0.5, 0.5).setDepth(10);

    // Exit portal (bottom center)
    const portalX = (this.ROOM_WIDTH / 2) * TILE_SIZE;
    const portalY = (this.ROOM_HEIGHT - 2) * TILE_SIZE;
    this.exitPortal = this.physics.add.sprite(portalX, portalY, 'exit_portal');
    this.exitPortal.setImmovable(true);
    this.exitPortal.setDepth(5);
    this.exitPortal.setPipeline('Light2D');

    // Portal glow - real point light
    const portalLight = this.lights.addLight(portalX, portalY, 100, 0x10b981, 0.7);
    this.tweens.add({
      targets: portalLight,
      intensity: 1.0,
      radius: 130,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    // Portal rotation
    this.tweens.add({
      targets: this.exitPortal,
      angle: 360,
      duration: 4000,
      repeat: -1,
    });

    // Portal label
    this.add.text(portalX, portalY - 20, 'Ascend', {
      fontSize: '10px',
      color: '#10b981',
    }).setOrigin(0.5, 0.5).setDepth(10);

    // No auto-trigger overlaps - all interactions require R key
  }

  private createUI(): void {
    // Gold display
    this.goldText = this.add.text(10, 10, `Gold: ${this.player.gold}`, {
      fontSize: '14px',
      color: '#ffd700',
    });
    this.goldText.setScrollFactor(0);
    this.goldText.setDepth(100);

    // HP display
    this.hpText = this.add.text(10, 28, `HP: ${this.player.hp}/${this.player.maxHp}`, {
      fontSize: '14px',
      color: '#ef4444',
    });
    this.hpText.setScrollFactor(0);
    this.hpText.setDepth(100);

    // Floor display
    const floorText = this.add.text(10, 46, `Stage ${this.floor} Complete`, {
      fontSize: '12px',
      color: '#9ca3af',
    });
    floorText.setScrollFactor(0);
    floorText.setDepth(100);

    // Tooltip (shows when near interactables)
    this.tooltipText = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height - 30,
      '',
      {
        fontSize: '12px',
        color: '#ffffff',
        backgroundColor: '#1f2937',
        padding: { x: 8, y: 4 },
      }
    );
    this.tooltipText.setOrigin(0.5, 0.5);
    this.tooltipText.setScrollFactor(0);
    this.tooltipText.setDepth(100);
    this.tooltipText.setVisible(false);
  }

  private updateHUD(): void {
    this.goldText.setText(`Gold: ${this.player.gold}`);
    this.hpText.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
    this.updateHealCost();

    // Update tooltip and nearInteractable based on proximity
    const playerPos = { x: this.player.x, y: this.player.y };
    const threshold = TILE_SIZE * 1.5;

    // Reset nearInteractable
    this.nearInteractable = null;

    if (this.distance(playerPos, this.shopkeeper) < threshold) {
      this.nearInteractable = 'shopkeeper';
      this.showTooltip('[R] Open Shop');
    } else if (this.distance(playerPos, this.fountain) < threshold) {
      this.nearInteractable = 'fountain';
      if (this.player.hp >= this.player.maxHp) {
        this.showTooltip('HP is full');
      } else if (this.player.gold < this.healCost) {
        this.showTooltip(`[R] Heal: ${this.healCost}g (not enough gold)`);
      } else {
        this.showTooltip(`[R] Heal (${this.healCost}g)`);
      }
    } else if (this.distance(playerPos, this.rerollCrystal) < threshold) {
      this.nearInteractable = 'crystal';
      if (this.player.gold < this.rerollCost) {
        this.showTooltip(`[R] Reroll Shop: ${this.rerollCost}g (not enough gold)`);
      } else {
        this.showTooltip(`[R] Reroll Shop (${this.rerollCost}g)`);
      }
    } else if (this.distance(playerPos, this.exitPortal) < threshold) {
      this.nearInteractable = 'portal';
      this.showTooltip('[R] Continue to next stage');
    } else {
      this.hideTooltip();
    }
  }

  private distance(
    a: { x: number; y: number },
    b: { x: number; y: number }
  ): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  }

  private showTooltip(text: string): void {
    this.tooltipText.setText(text);
    this.tooltipText.setVisible(true);
  }

  private hideTooltip(): void {
    this.tooltipText.setVisible(false);
  }

  private updateHealCost(): void {
    const missingHp = this.player.maxHp - this.player.hp;
    this.healCost = missingHp * 2;
  }

  private openShop(): void {
    if (this.shopOpen) return;

    this.shopOpen = true;
    this.player.setVelocity(0, 0);
    this.audioSystem?.play('sfx_pickup', 0.3);

    this.shopUI.show(() => {
      this.shopOpen = false;
    });
  }

  private useFountain(): void {
    if (this.shopOpen) return;
    if (this.player.hp >= this.player.maxHp) {
      this.showFloatingText(this.fountain.x, this.fountain.y - 20, 'Already full HP!');
      return;
    }
    if (this.player.gold < this.healCost) {
      this.showFloatingText(this.fountain.x, this.fountain.y - 20, 'Not enough gold!');
      return;
    }

    // Heal the player
    this.player.spendGold(this.healCost);
    const healed = this.player.maxHp - this.player.hp;
    this.player.hp = this.player.maxHp;

    this.audioSystem?.play('sfx_levelup', 0.4);

    // Particles
    for (let i = 0; i < 8; i++) {
      const particle = this.add.circle(
        this.fountain.x + Phaser.Math.Between(-15, 15),
        this.fountain.y + Phaser.Math.Between(-15, 15),
        Phaser.Math.Between(2, 4),
        0x3b82f6
      );
      particle.setDepth(100);

      this.tweens.add({
        targets: particle,
        y: particle.y - 30,
        alpha: 0,
        duration: 600,
        onComplete: () => particle.destroy(),
      });
    }

    // Message
    this.showFloatingText(this.fountain.x, this.fountain.y - 20, `+${healed} HP`);
  }

  private useRerollCrystal(): void {
    if (this.shopOpen) return;
    if (this.player.gold < this.rerollCost) {
      this.showFloatingText(this.rerollCrystal.x, this.rerollCrystal.y - 20, 'Not enough gold!');
      return;
    }

    // Spend gold and reroll
    this.player.spendGold(this.rerollCost);
    this.rerollCount++;
    this.rerollCost = 50 + this.rerollCount * 25;

    this.audioSystem?.play('sfx_pickup', 0.5);

    // Regenerate shop inventory
    this.shopUI.rerollInventory();

    // Particles
    for (let i = 0; i < 10; i++) {
      const particle = this.add.circle(
        this.rerollCrystal.x + Phaser.Math.Between(-20, 20),
        this.rerollCrystal.y + Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(2, 4),
        0x8b5cf6
      );
      particle.setDepth(100);

      this.tweens.add({
        targets: particle,
        y: particle.y - 40,
        alpha: 0,
        scale: 0,
        duration: 500,
        onComplete: () => particle.destroy(),
      });
    }

    // Message
    this.showFloatingText(this.rerollCrystal.x, this.rerollCrystal.y - 20, 'Shop Rerolled!');
  }

  private usePortal(): void {
    if (this.shopOpen) return;

    // Save player state and proceed to next floor
    this.proceedToNextFloor();
  }

  private showFloatingText(x: number, y: number, text: string): void {
    const floatingText = this.add.text(x, y, text, {
      fontSize: '12px',
      color: '#ffffff',
    });
    floatingText.setOrigin(0.5, 0.5);
    floatingText.setDepth(150);

    this.tweens.add({
      targets: floatingText,
      y: y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => floatingText.destroy(),
    });
  }

  private proceedToNextFloor(): void {
    // Increment floor
    const nextFloor = this.floor + 1;
    this.registry.set('floor', nextFloor);

    // Pass current world to next floor
    if (this.currentWorld) {
      this.registry.set('currentWorld', this.currentWorld);
      // Update progression system
      progressionManager.advanceFloor();
    }

    // Save player state for GameScene
    this.registry.set('shopData', {
      floor: nextFloor,
      currentWorld: this.currentWorld,
      playerStats: this.player.getSaveData(),
      inventorySerialized: this.player.inventory.serialize(),
    });

    this.audioSystem?.play('sfx_stairs', 0.5);

    // Transition effect
    this.cameras.main.flash(300, 100, 255, 100);
    this.time.delayedCall(300, () => {
      this.cameras.main.fade(500, 0, 0, 0, false, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress === 1) {
          this.shopUI.destroy();
          this.scene.start('GameScene');
        }
      });
    });
  }
}
