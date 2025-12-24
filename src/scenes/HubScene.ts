/**
 * HubScene - Central hub world with portals to all 7 sin worlds
 */

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { TILE_SIZE } from '../utils/constants';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { SinWorld, getAllWorlds, getWorldConfig } from '../config/WorldConfig';
import { progressionManager } from '../systems/ProgressionSystem';
import { InventoryUI } from '../ui/InventoryUI';
import { ShopUI } from '../ui/ShopUI';
import { SettingsUI } from '../ui/SettingsUI';

interface PortalData {
  world: SinWorld;
  sprite: Phaser.GameObjects.Sprite;
  glow: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  checkmark?: Phaser.GameObjects.Text;
}

export class HubScene extends Phaser.Scene {
  private player!: Player;
  private audioSystem!: AudioSystem;
  private inventoryUI!: InventoryUI;
  private shopUI!: ShopUI;
  private settingsUI!: SettingsUI;
  private portals: PortalData[] = [];
  private fountain!: Phaser.GameObjects.Sprite;
  private shopNPC!: Phaser.GameObjects.Sprite;
  private interactPrompt!: Phaser.GameObjects.Container;
  private nearbyInteractable: 'fountain' | 'shop' | 'victory' | SinWorld | null = null;
  private victoryPortal: { sprite: Phaser.GameObjects.Sprite; glow: Phaser.GameObjects.Arc } | null = null;

  // Hub dimensions (in tiles)
  private readonly HUB_WIDTH = 25;
  private readonly HUB_HEIGHT = 20;

  constructor() {
    super({ key: 'HubScene' });
  }

  create(): void {
    this.audioSystem = new AudioSystem(this);
    this.audioSystem.startMusic('shrine');

    // Load saved progression
    const savedData = SaveSystem.load();
    if (savedData) {
      progressionManager.setProgression(savedData.progression);
    }

    // Create the hub room
    this.createRoom();

    // Create portals for each world
    this.createPortals();

    // Create fountain in center
    this.createFountain();

    // Create shop NPC
    this.createShopNPC();

    // Create player at center
    const spawnX = (this.HUB_WIDTH / 2) * TILE_SIZE;
    const spawnY = (this.HUB_HEIGHT / 2 + 2) * TILE_SIZE;
    this.player = new Player(this, spawnX, spawnY);

    // Restore player state from save
    if (savedData) {
      this.player.restoreFromSave(savedData.player);
      SaveSystem.restoreInventory(this.player.inventory, savedData.inventory);
      this.player.recalculateStats();
    }

    // Set up camera
    const roomWidth = this.HUB_WIDTH * TILE_SIZE;
    const roomHeight = this.HUB_HEIGHT * TILE_SIZE;
    const offsetX = (this.scale.width - roomWidth) / 2;
    const offsetY = (this.scale.height - roomHeight) / 2;
    this.cameras.main.setScroll(-offsetX, -offsetY);

    // Create UI elements
    this.createUI();
    this.createInteractPrompt();

    // Create inventory and shop UI
    this.inventoryUI = new InventoryUI(this, this.player);
    this.shopUI = new ShopUI(this, this.player, 1);
    this.settingsUI = new SettingsUI(this);

    // Set up keyboard input
    this.setupKeyboardInput();

    // Check proximity to interactables each frame
    this.events.on('update', this.checkProximity, this);

    // Check if all worlds complete
    if (progressionManager.areAllWorldsCompleted()) {
      this.showVictoryPortal();
    }
  }

  private createRoom(): void {
    // Create floor and walls
    for (let y = 0; y < this.HUB_HEIGHT; y++) {
      for (let x = 0; x < this.HUB_WIDTH; x++) {
        const worldX = x * TILE_SIZE;
        const worldY = y * TILE_SIZE;

        // Walls on edges
        if (x === 0 || x === this.HUB_WIDTH - 1 || y === 0 || y === this.HUB_HEIGHT - 1) {
          this.add.image(worldX, worldY, 'wall_tavern').setOrigin(0, 0).setDepth(0);
        } else {
          // Floor with slight variation
          this.add.image(worldX, worldY, 'floor_tavern').setOrigin(0, 0).setDepth(0);
        }
      }
    }

    // Add wall collisions
    const walls = this.physics.add.staticGroup();

    // Top wall
    const topWall = this.add.rectangle(
      (this.HUB_WIDTH * TILE_SIZE) / 2,
      TILE_SIZE / 2,
      this.HUB_WIDTH * TILE_SIZE,
      TILE_SIZE
    );
    this.physics.add.existing(topWall, true);
    walls.add(topWall);

    // Bottom wall
    const bottomWall = this.add.rectangle(
      (this.HUB_WIDTH * TILE_SIZE) / 2,
      (this.HUB_HEIGHT - 0.5) * TILE_SIZE,
      this.HUB_WIDTH * TILE_SIZE,
      TILE_SIZE
    );
    this.physics.add.existing(bottomWall, true);
    walls.add(bottomWall);

    // Left wall
    const leftWall = this.add.rectangle(
      TILE_SIZE / 2,
      (this.HUB_HEIGHT * TILE_SIZE) / 2,
      TILE_SIZE,
      this.HUB_HEIGHT * TILE_SIZE
    );
    this.physics.add.existing(leftWall, true);
    walls.add(leftWall);

    // Right wall
    const rightWall = this.add.rectangle(
      (this.HUB_WIDTH - 0.5) * TILE_SIZE,
      (this.HUB_HEIGHT * TILE_SIZE) / 2,
      TILE_SIZE,
      this.HUB_HEIGHT * TILE_SIZE
    );
    this.physics.add.existing(rightWall, true);
    walls.add(rightWall);

    // Add collision after a short delay (for player to be created)
    this.time.delayedCall(100, () => {
      this.physics.add.collider(this.player, walls);
    });
  }

  private createPortals(): void {
    getAllWorlds().forEach((world) => {
      const config = getWorldConfig(world);
      const x = config.portalPosition.x * TILE_SIZE;
      const y = config.portalPosition.y * TILE_SIZE;
      const isCompleted = progressionManager.isWorldCompleted(world);

      // Outer glow ring
      const outerGlow = this.add.circle(x, y, TILE_SIZE * 1.0, config.colors.portal, 0.15);
      outerGlow.setDepth(1);

      this.tweens.add({
        targets: outerGlow,
        scale: { from: 0.8, to: 1.2 },
        alpha: { from: 0.1, to: 0.25 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Inner glow (main portal glow)
      const glow = this.add.circle(x, y, TILE_SIZE * 0.7, config.colors.portal, 0.4);
      glow.setDepth(1);

      this.tweens.add({
        targets: glow,
        alpha: { from: 0.3, to: 0.6 },
        scale: { from: 0.9, to: 1.05 },
        duration: 1200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Create orbiting particles (small circles)
      const particleCount = 3;
      for (let i = 0; i < particleCount; i++) {
        const particle = this.add.circle(x, y, 3, config.colors.primary, 0.7);
        particle.setDepth(3);

        const startAngle = (i / particleCount) * Math.PI * 2;
        const radius = TILE_SIZE * 0.6;

        this.tweens.add({
          targets: particle,
          angle: 360,
          duration: 3000 + i * 500,
          repeat: -1,
          ease: 'Linear',
          onUpdate: () => {
            const time = this.time.now / 1000;
            const angle = startAngle + time * (1.5 + i * 0.2);
            particle.x = x + Math.cos(angle) * radius;
            particle.y = y + Math.sin(angle) * radius;
          },
        });
      }

      // Create portal sprite
      const sprite = this.add.sprite(x, y, 'exit_portal');
      sprite.setTint(config.colors.primary);
      sprite.setDepth(2);

      // Subtle rotation for portal sprite
      this.tweens.add({
        targets: sprite,
        angle: { from: -5, to: 5 },
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Create world name label
      const label = this.add.text(x, y + TILE_SIZE * 1.2, config.name, {
        fontSize: '10px',
        fontFamily: 'monospace',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      });
      label.setOrigin(0.5);
      label.setDepth(3);

      const portalData: PortalData = { world, sprite, glow, label };

      // Show checkmark and golden glow if world is completed
      if (isCompleted) {
        const checkmark = this.add.text(x + TILE_SIZE * 0.5, y - TILE_SIZE * 0.5, '✓', {
          fontSize: '16px',
          fontFamily: 'monospace',
          color: '#22c55e',
          stroke: '#000000',
          strokeThickness: 2,
        });
        checkmark.setOrigin(0.5);
        checkmark.setDepth(4);
        portalData.checkmark = checkmark;

        // Golden glow for completed worlds
        glow.setFillStyle(0xffd700, 0.5);
        outerGlow.setFillStyle(0xffd700, 0.2);
      }

      this.portals.push(portalData);
    });
  }

  private createFountain(): void {
    const x = (this.HUB_WIDTH / 2) * TILE_SIZE;
    const y = (this.HUB_HEIGHT / 2 - 1) * TILE_SIZE;

    // Outer healing aura (large, subtle)
    const outerAura = this.add.circle(x, y, TILE_SIZE * 1.3, 0x60a5fa, 0.1);
    outerAura.setDepth(1);

    this.tweens.add({
      targets: outerAura,
      scale: { from: 0.9, to: 1.3 },
      alpha: { from: 0.05, to: 0.15 },
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Inner healing aura
    const aura = this.add.circle(x, y, TILE_SIZE * 0.8, 0x60a5fa, 0.25);
    aura.setDepth(1);

    this.tweens.add({
      targets: aura,
      alpha: { from: 0.15, to: 0.35 },
      scale: { from: 0.85, to: 1.1 },
      duration: 1800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Rising water particles effect
    for (let i = 0; i < 5; i++) {
      const droplet = this.add.circle(x, y, 2, 0x93c5fd, 0.6);
      droplet.setDepth(3);

      const offsetX = (Math.random() - 0.5) * TILE_SIZE * 0.6;
      const delay = i * 400;

      this.tweens.add({
        targets: droplet,
        y: { from: y, to: y - TILE_SIZE * 0.8 },
        alpha: { from: 0.7, to: 0 },
        scale: { from: 1, to: 0.3 },
        duration: 1500,
        delay: delay,
        repeat: -1,
        repeatDelay: 500,
        ease: 'Quad.easeOut',
        onUpdate: () => {
          droplet.x = x + offsetX + Math.sin(this.time.now / 300) * 2;
        },
      });
    }

    // Fountain center
    this.fountain = this.add.sprite(x, y, 'fountain');
    this.fountain.setDepth(2);

    // Pulse effect on fountain
    this.tweens.add({
      targets: this.fountain,
      scale: { from: 1.2, to: 1.4 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Label with subtle glow effect
    const label = this.add.text(x, y + TILE_SIZE * 1.3, 'Healing Fountain', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#93c5fd',
      stroke: '#000000',
      strokeThickness: 2,
    });
    label.setOrigin(0.5);
    label.setDepth(3);
  }

  private createShopNPC(): void {
    const x = (this.HUB_WIDTH / 2) * TILE_SIZE;
    const y = 4 * TILE_SIZE;

    // Shop NPC
    this.shopNPC = this.add.sprite(x, y, 'shopkeeper');
    this.shopNPC.setDepth(2);

    // Label
    const label = this.add.text(x, y + TILE_SIZE * 1.2, 'Shop', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 2,
    });
    label.setOrigin(0.5);
    label.setDepth(3);
  }

  private createUI(): void {
    const screenWidth = this.scale.width;

    // Title
    const title = this.add.text(screenWidth / 2, 20, 'The Hub', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#8b5cf6',
      stroke: '#000000',
      strokeThickness: 3,
    });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(100);

    // Progress display
    const completed = progressionManager.getCompletedWorldCount();
    const progress = this.add.text(screenWidth / 2, 45, `Worlds Completed: ${completed}/7`, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: completed === 7 ? '#22c55e' : '#9ca3af',
      stroke: '#000000',
      strokeThickness: 2,
    });
    progress.setOrigin(0.5);
    progress.setScrollFactor(0);
    progress.setDepth(100);

    // Controls hint
    const controls = this.add.text(screenWidth / 2, this.scale.height - 20,
      'WASD: Move | R: Interact | E: Inventory | Q: Settings', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#6b7280',
      stroke: '#000000',
      strokeThickness: 2,
    });
    controls.setOrigin(0.5);
    controls.setScrollFactor(0);
    controls.setDepth(100);
  }

  private createInteractPrompt(): void {
    const screenWidth = this.scale.width;
    const screenHeight = this.scale.height;

    this.interactPrompt = this.add.container(screenWidth / 2, screenHeight - 60);
    this.interactPrompt.setScrollFactor(0);
    this.interactPrompt.setDepth(100);
    this.interactPrompt.setVisible(false);

    const bg = this.add.rectangle(0, 0, 200, 30, 0x000000, 0.7);
    bg.setStrokeStyle(1, 0x8b5cf6);

    const text = this.add.text(0, 0, '[R] to interact', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    text.setOrigin(0.5);

    this.interactPrompt.add([bg, text]);
  }

  private setupKeyboardInput(): void {
    // Interact key (R)
    this.input.keyboard!.on('keydown-R', () => {
      if (this.inventoryUI.getIsVisible() || this.shopUI.getIsVisible() || this.settingsUI.getIsVisible()) {
        return;
      }
      this.handleInteraction();
    });

    // Inventory key (E)
    this.input.keyboard!.on('keydown-E', () => {
      if (this.shopUI.getIsVisible() || this.settingsUI.getIsVisible()) {
        return;
      }
      this.inventoryUI.toggle();
    });

    // Settings key (Q)
    this.input.keyboard!.on('keydown-Q', () => {
      if (this.inventoryUI.getIsVisible() || this.shopUI.getIsVisible()) {
        return;
      }
      this.settingsUI.toggle();
    });

    // ESC key to close menus or return to main menu
    this.input.keyboard!.on('keydown-ESC', () => {
      if (this.debugMenuVisible) {
        this.closeDebugMenu();
      } else if (this.inventoryUI.getIsVisible()) {
        this.inventoryUI.hide();
      } else if (this.shopUI.getIsVisible()) {
        this.shopUI.close();
      } else if (this.settingsUI.getIsVisible()) {
        this.settingsUI.hide();
      } else {
        // Save and return to menu
        this.saveAndExit();
      }
    });

    // F1: Toggle debug menu
    this.input.keyboard!.on('keydown-F1', () => {
      this.toggleDebugMenu();
    });
  }

  // Debug menu properties
  private debugMenu: Phaser.GameObjects.Container | null = null;
  private debugMenuVisible: boolean = false;

  private toggleDebugMenu(): void {
    if (this.debugMenuVisible) {
      this.closeDebugMenu();
    } else {
      this.openDebugMenu();
    }
  }

  private getDebugOptions(): { label: string; action: () => void }[] {
    return [
      {
        label: '[1] Full Heal',
        action: () => {
          this.player.hp = this.player.maxHp;
          this.showMessage('Fully healed!');
        },
      },
      {
        label: '[2] Add 500 Gold',
        action: () => {
          this.player.gold += 500;
          this.showMessage('+500 Gold');
        },
      },
      {
        label: '[3] Level Up x5',
        action: () => {
          for (let i = 0; i < 5; i++) this.player.gainXP(this.player.xpToNextLevel);
          this.showMessage('Level Up x5!');
        },
      },
      {
        label: '[4] Complete Pride',
        action: () => {
          progressionManager.completeWorld(SinWorld.PRIDE);
          this.showMessage('Pride completed!');
          this.refreshHub();
        },
      },
      {
        label: '[5] Complete Greed',
        action: () => {
          progressionManager.completeWorld(SinWorld.GREED);
          this.showMessage('Greed completed!');
          this.refreshHub();
        },
      },
      {
        label: '[6] Complete 6 Worlds',
        action: () => {
          [SinWorld.PRIDE, SinWorld.GREED, SinWorld.WRATH,
           SinWorld.SLOTH, SinWorld.ENVY, SinWorld.GLUTTONY].forEach(w =>
            progressionManager.completeWorld(w));
          this.showMessage('6 worlds completed!');
          this.refreshHub();
        },
      },
      {
        label: '[7] Complete All 7 Worlds',
        action: () => {
          [SinWorld.PRIDE, SinWorld.GREED, SinWorld.WRATH,
           SinWorld.SLOTH, SinWorld.ENVY, SinWorld.GLUTTONY, SinWorld.LUST].forEach(w =>
            progressionManager.completeWorld(w));
          this.showMessage('All 7 worlds completed!');
          this.refreshHub();
        },
      },
      {
        label: '[8] Reset All Progress',
        action: () => {
          progressionManager.reset();
          this.showMessage('Progress reset!');
          this.refreshHub();
        },
      },
      {
        label: '[9] Save Game',
        action: () => {
          this.saveGame();
          this.showMessage('Game saved!');
        },
      },
    ];
  }

  private openDebugMenu(): void {
    if (this.debugMenu) this.debugMenu.destroy();

    this.debugMenuVisible = true;
    this.debugMenu = this.add.container(0, 0);
    this.debugMenu.setScrollFactor(0);
    this.debugMenu.setDepth(500);

    const bg = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      300, 320, 0x000000, 0.9
    );
    bg.setStrokeStyle(2, 0xfbbf24);
    this.debugMenu.add(bg);

    const title = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 - 140,
      '== DEBUG MENU ==',
      { fontSize: '18px', fontFamily: 'monospace', color: '#fbbf24' }
    );
    title.setOrigin(0.5);
    this.debugMenu.add(title);

    const hint = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2 + 145,
      'Press key or click | F1/ESC to close',
      { fontSize: '10px', fontFamily: 'monospace', color: '#6b7280' }
    );
    hint.setOrigin(0.5);
    this.debugMenu.add(hint);

    const options = this.getDebugOptions();
    const startY = this.scale.height / 2 - 105;

    options.forEach((opt, i) => {
      const y = startY + i * 26;
      const text = this.add.text(
        this.scale.width / 2 - 120,
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
    const keyHandler = (event: KeyboardEvent) => {
      if (!this.debugMenuVisible) return;

      const options = this.getDebugOptions();
      const key = event.key;

      if (key >= '1' && key <= '9') {
        const idx = parseInt(key) - 1;
        if (idx < options.length) options[idx].action();
      }
    };

    this.input.keyboard!.on('keydown', keyHandler);
    this.debugMenu?.once('destroy', () => {
      this.input.keyboard?.off('keydown', keyHandler);
    });
  }

  private closeDebugMenu(): void {
    this.debugMenuVisible = false;
    if (this.debugMenu) {
      this.debugMenu.destroy();
      this.debugMenu = null;
    }
  }

  private refreshHub(): void {
    // Refresh the scene to show updated portal states
    this.closeDebugMenu();
    this.scene.restart();
  }

  private checkProximity(): void {
    if (!this.player) return;

    const playerX = this.player.x;
    const playerY = this.player.y;
    const interactDistance = TILE_SIZE * 1.5;

    // Check fountain
    const fountainDist = Phaser.Math.Distance.Between(
      playerX, playerY,
      this.fountain.x, this.fountain.y
    );
    if (fountainDist < interactDistance) {
      this.nearbyInteractable = 'fountain';
      this.showInteractPrompt('Heal at Fountain');
      return;
    }

    // Check shop
    const shopDist = Phaser.Math.Distance.Between(
      playerX, playerY,
      this.shopNPC.x, this.shopNPC.y
    );
    if (shopDist < interactDistance) {
      this.nearbyInteractable = 'shop';
      this.showInteractPrompt('Open Shop');
      return;
    }

    // Check portals
    for (const portal of this.portals) {
      const dist = Phaser.Math.Distance.Between(
        playerX, playerY,
        portal.sprite.x, portal.sprite.y
      );
      if (dist < interactDistance) {
        const config = getWorldConfig(portal.world);
        const isCompleted = progressionManager.isWorldCompleted(portal.world);
        const status = isCompleted ? ' (Completed)' : '';
        this.nearbyInteractable = portal.world;
        this.showInteractPrompt(`Enter ${config.name}${status}`);
        return;
      }
    }

    // Check victory portal
    if (this.victoryPortal) {
      const victoryDist = Phaser.Math.Distance.Between(
        playerX, playerY,
        this.victoryPortal.sprite.x, this.victoryPortal.sprite.y
      );
      if (victoryDist < interactDistance * 1.5) {
        this.nearbyInteractable = 'victory';
        this.showInteractPrompt('Ascend to Victory');
        return;
      }
    }

    // Nothing nearby
    this.nearbyInteractable = null;
    this.hideInteractPrompt();
  }

  private showInteractPrompt(text: string): void {
    const textObj = this.interactPrompt.getAt(1) as Phaser.GameObjects.Text;
    textObj.setText(`[R] ${text}`);

    const bg = this.interactPrompt.getAt(0) as Phaser.GameObjects.Rectangle;
    bg.setSize(textObj.width + 20, 30);

    this.interactPrompt.setVisible(true);
  }

  private hideInteractPrompt(): void {
    this.interactPrompt.setVisible(false);
  }

  private handleInteraction(): void {
    if (this.nearbyInteractable === null) return;

    if (this.nearbyInteractable === 'fountain') {
      this.healAtFountain();
    } else if (this.nearbyInteractable === 'shop') {
      this.openShop();
    } else if (this.nearbyInteractable === 'victory') {
      this.enterVictory();
    } else {
      // It's a portal
      this.enterWorld(this.nearbyInteractable);
    }
  }

  private enterVictory(): void {
    // Save final state
    this.saveGame();

    // Play triumphant sound
    this.audioSystem.play('sfx_pickup');

    // Screen flash effect
    this.cameras.main.flash(1000, 255, 215, 0, false);

    // Show ascension message
    const message = this.add.text(this.scale.width / 2, this.scale.height / 2, 'ASCENDING...', {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 4,
    });
    message.setOrigin(0.5);
    message.setScrollFactor(0);
    message.setDepth(300);

    this.tweens.add({
      targets: message,
      scale: { from: 1, to: 1.5 },
      alpha: { from: 1, to: 0 },
      duration: 2000,
      ease: 'Power2',
    });

    // Transition to victory scene
    this.time.delayedCall(2000, () => {
      this.audioSystem.stopMusic();
      this.scene.start('VictoryScene', {
        floor: 21, // 7 worlds * 3 floors
        level: this.player.level,
        enemiesKilled: this.registry.get('enemiesKilled') || 0,
        itemsCollected: this.registry.get('itemsCollected') || 0,
        allWorldsComplete: true,
      });
    });
  }

  private healAtFountain(): void {
    const player = this.player;
    const currentHp = player.hp;
    const maxHp = player.maxHp;

    if (currentHp >= maxHp) {
      // Already at full health
      this.showMessage('Already at full health!');
      return;
    }

    // Heal to full
    player.heal(maxHp - currentHp);
    this.audioSystem.play('sfx_pickup');
    this.showMessage('Fully healed!');

    // Visual effect
    this.cameras.main.flash(500, 100, 200, 255, false);
  }

  private openShop(): void {
    this.shopUI.show();
  }

  private enterWorld(world: SinWorld): void {
    // Save current state
    this.saveGame();

    // Start the world run
    progressionManager.startWorld(world, 1);

    // Set registry values for GameScene
    this.registry.set('currentWorld', world);
    this.registry.set('floor', 1);

    // Transition to GameScene
    this.audioSystem.stopMusic();
    this.scene.start('GameScene');
  }

  private showVictoryPortal(): void {
    // Show a special portal in the center when all worlds are complete
    const x = (this.HUB_WIDTH / 2) * TILE_SIZE;
    const y = (this.HUB_HEIGHT / 2 + 4) * TILE_SIZE;

    // Outer golden glow
    const glow = this.add.circle(x, y, TILE_SIZE * 1.2, 0xffd700, 0.5);
    glow.setDepth(5);

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.3, to: 0.7 },
      scale: { from: 0.8, to: 1.3 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Inner white glow for extra radiance
    const innerGlow = this.add.circle(x, y, TILE_SIZE * 0.6, 0xffffff, 0.3);
    innerGlow.setDepth(5);

    this.tweens.add({
      targets: innerGlow,
      alpha: { from: 0.2, to: 0.5 },
      scale: { from: 1.0, to: 1.2 },
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const label = this.add.text(x, y + TILE_SIZE * 1.5, '✦ ASCENSION ✦', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 3,
    });
    label.setOrigin(0.5);
    label.setDepth(6);

    // Animate label
    this.tweens.add({
      targets: label,
      alpha: { from: 0.7, to: 1 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Victory portal sprite
    const victorySprite = this.add.sprite(x, y, 'exit_portal');
    victorySprite.setTint(0xffd700);
    victorySprite.setScale(1.5);
    victorySprite.setDepth(5);

    // Rotate the portal slightly for effect
    this.tweens.add({
      targets: victorySprite,
      angle: 360,
      duration: 8000,
      repeat: -1,
      ease: 'Linear',
    });

    // Store reference for proximity check
    this.victoryPortal = { sprite: victorySprite, glow };
  }

  private showMessage(text: string): void {
    const message = this.add.text(this.scale.width / 2, this.scale.height / 2 - 50, text, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    message.setOrigin(0.5);
    message.setScrollFactor(0);
    message.setDepth(200);

    this.tweens.add({
      targets: message,
      alpha: 0,
      y: message.y - 30,
      duration: 1500,
      ease: 'Power2',
      onComplete: () => message.destroy(),
    });
  }

  private saveGame(): void {
    SaveSystem.save(
      progressionManager.getProgression(),
      this.player.getSaveData(),
      this.player.inventory
    );
  }

  private saveAndExit(): void {
    this.saveGame();
    this.audioSystem.stopMusic();
    this.scene.start('MenuScene');
  }

  update(time: number, delta: number): void {
    if (this.player) {
      this.player.update(time, delta);
    }
  }
}
