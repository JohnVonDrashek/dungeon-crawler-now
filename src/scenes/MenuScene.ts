import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { SettingsUI } from '../ui/SettingsUI';
import { getWorldConfig } from '../config/WorldConfig';

export class MenuScene extends Phaser.Scene {
  private settingsUI!: SettingsUI;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    // Create settings UI first (so it's available for the button)
    this.settingsUI = new SettingsUI(this);
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Title
    const title = this.add.text(width / 2, height * 0.25, 'DUNGEON\nCRAWLER', {
      fontSize: '64px',
      fontFamily: 'monospace',
      color: '#8b5cf6',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);

    // Subtitle
    const subtitle = this.add.text(width / 2, height * 0.45, 'Descend into the depths...', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#9ca3af',
    });
    subtitle.setOrigin(0.5);

    // Settings button
    this.createButton(width / 2, height * 0.55, 'Settings', () => {
      this.settingsUI.show();
    });

    // New Game button
    this.createButton(width / 2, height * 0.65, 'New Game', () => {
      SaveSystem.deleteSave();
      this.scene.start('HubScene');
    });

    // Continue button (only if save exists)
    const saveInfo = SaveSystem.getSaveInfo();
    if (saveInfo) {
      this.createButton(width / 2, height * 0.75, 'Continue', () => {
        // If there's an active run, resume it; otherwise go to hub
        if (saveInfo.activeWorld && saveInfo.activeFloor) {
          this.registry.set('currentWorld', saveInfo.activeWorld);
          this.registry.set('floor', saveInfo.activeFloor);
          this.scene.start('GameScene');
        } else {
          this.scene.start('HubScene');
        }
      });

      // Show save info
      let saveText: string;
      if (saveInfo.activeWorld && saveInfo.activeFloor) {
        const worldConfig = getWorldConfig(saveInfo.activeWorld);
        saveText = `${worldConfig.name} Floor ${saveInfo.activeFloor} | Level ${saveInfo.level}`;
      } else {
        saveText = `${saveInfo.worldsCompleted}/7 Worlds | Level ${saveInfo.level}`;
      }
      const saveTextObj = this.add.text(width / 2, height * 0.81, saveText, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#6b7280',
      });
      saveTextObj.setOrigin(0.5);
    }

    // Controls info
    const controls = this.add.text(width / 2, height * 0.88,
      'WASD: Move | Click: Attack | Space: Dodge | E: Inventory', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#4b5563',
    });
    controls.setOrigin(0.5);

    // Version
    const version = this.add.text(width - 10, height - 10, 'v1.0', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#374151',
    });
    version.setOrigin(1, 1);
  }

  private createButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 200, 50, 0x374151);
    bg.setStrokeStyle(2, 0x8b5cf6);

    const label = this.add.text(0, 0, text, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    container.add([bg, label]);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      bg.setFillStyle(0x4b5563);
      bg.setStrokeStyle(2, 0xa78bfa);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x374151);
      bg.setStrokeStyle(2, 0x8b5cf6);
    });

    bg.on('pointerdown', callback);

    return container;
  }
}
