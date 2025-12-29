import Phaser from 'phaser';
import { Room, RoomType } from '../systems/DungeonGenerator';
import { LoreSystem, LoreEntry } from '../systems/LoreSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { TILE_SIZE } from '../utils/constants';
import { Player } from '../entities/Player';

/**
 * LoreUIManager handles the lore discovery system - tablets (with modals),
 * wall scratches, and whispers. Also manages the lore prompt UI.
 */
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

  getLorePrompt(): Phaser.GameObjects.Text {
    return this.lorePrompt;
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
    // Skip spawn room, exit room, and rooms that already have special objects
    if (room.type === RoomType.SPAWN || room.type === RoomType.EXIT) return;
    if (room.type === RoomType.SHRINE) return; // Shrines get their own tablet

    // 20% chance to add lore to normal rooms
    if (Math.random() > 0.2) return;

    const loreType = this.loreSystem.getRandomLoreType(this.floor);
    this.addLoreObject(room, loreType);
  }

  addLoreObject(room: Room, forcedType?: 'tablet' | 'scratch' | 'whisper'): void {
    const loreType = forcedType || this.loreSystem.getRandomLoreType(this.floor);
    const lore = this.loreSystem.getRandomLore(this.floor, loreType);

    if (!lore) return; // No lore available for this floor/type

    // Position: offset from center to avoid overlapping other objects
    const offsetX = (Math.random() - 0.5) * (room.width - 4) * TILE_SIZE;
    const offsetY = (Math.random() - 0.5) * (room.height - 4) * TILE_SIZE;
    const loreX = room.centerX * TILE_SIZE + TILE_SIZE / 2 + offsetX;
    const loreY = room.centerY * TILE_SIZE + TILE_SIZE / 2 + offsetY;

    // Get texture based on type
    let texture: string;
    switch (lore.type) {
      case 'tablet':
        texture = 'lore_tablet';
        break;
      case 'scratch':
        texture = 'lore_scratch';
        break;
      case 'whisper':
        texture = 'lore_whisper';
        break;
    }

    const loreSprite = this.loreObjects.create(loreX, loreY, texture) as Phaser.Physics.Arcade.Sprite;
    loreSprite.setDepth(3);
    loreSprite.setImmovable(true);
    loreSprite.setData('loreEntry', lore);
    loreSprite.setData('discovered', false);
    loreSprite.setPipeline('Light2D');

    // Visual effects based on type
    if (lore.type === 'tablet') {
      // Tablets have a subtle point light
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
      // Whispers float and fade
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
      // Scratches are faint and static
      loreSprite.setAlpha(0.4);
    }
  }

  tryInteractWithLore(): void {
    const INTERACT_RANGE = TILE_SIZE * 2;
    let closestLore: Phaser.Physics.Arcade.Sprite | null = null;
    let closestDist = INTERACT_RANGE;

    // Find closest lore object within range
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
        if (entry) {
          loreType = entry.type;
        }
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

  private interactWithLore(loreSprite: Phaser.Physics.Arcade.Sprite): void {
    const loreEntry = loreSprite.getData('loreEntry') as LoreEntry;
    if (!loreEntry) return;

    const wasDiscovered = loreSprite.getData('discovered') as boolean;

    // Mark as discovered on first read
    if (!wasDiscovered) {
      loreSprite.setData('discovered', true);
      this.loreSystem.markDiscovered(loreEntry.id);
    }

    // Handle based on type
    switch (loreEntry.type) {
      case 'tablet':
        this.audioSystem.play('sfx_tablet', 0.4);
        this.showLoreModal(loreEntry);
        // Fade out light on first discovery
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
    // Close any existing modal
    if (this.activeLoreModal) {
      this.activeLoreModal.destroy();
    }

    const camera = this.scene.cameras.main;
    const container = this.scene.add.container(
      camera.width / 2,
      camera.height / 2
    );
    container.setDepth(300);
    container.setScrollFactor(0); // Fix to camera viewport
    this.activeLoreModal = container;

    // Dark overlay
    const overlay = this.scene.add.rectangle(0, 0, camera.width * 2, camera.height * 2, 0x000000, 0.8);
    overlay.setInteractive();
    container.add(overlay);

    // Parchment-style panel
    const panelWidth = 380;
    const panelHeight = 280;
    const panel = this.scene.add.rectangle(0, 0, panelWidth, panelHeight, 0x2a2420);
    panel.setStrokeStyle(3, 0x8b5cf6);
    container.add(panel);

    // Inner border
    const innerBorder = this.scene.add.rectangle(0, 0, panelWidth - 10, panelHeight - 10);
    innerBorder.setStrokeStyle(1, 0x4a4035);
    innerBorder.setFillStyle();
    container.add(innerBorder);

    // Title
    const title = this.scene.add.text(0, -panelHeight / 2 + 30, lore.title || 'Ancient Writing', {
      fontSize: '18px',
      color: '#fbbf24',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    container.add(title);

    // Decorative line under title
    const line = this.scene.add.rectangle(0, -panelHeight / 2 + 50, 200, 2, 0x8b5cf6);
    container.add(line);

    // Body text with word wrap
    const bodyText = this.scene.add.text(0, 0, lore.text, {
      fontSize: '14px',
      color: '#e5e7eb',
      wordWrap: { width: panelWidth - 50 },
      align: 'center',
      lineSpacing: 6,
    });
    bodyText.setOrigin(0.5);
    container.add(bodyText);

    // Continue prompt
    const continueText = this.scene.add.text(0, panelHeight / 2 - 35, '[ Click to continue ]', {
      fontSize: '12px',
      color: '#9ca3af',
      fontStyle: 'italic',
    });
    continueText.setOrigin(0.5);
    container.add(continueText);

    // Pulse the continue text
    this.scene.tweens.add({
      targets: continueText,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Click to close
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

  destroy(): void {
    this.closeModal();
    this.lorePrompt?.destroy();
    this.loreObjects?.destroy(true);
  }
}
