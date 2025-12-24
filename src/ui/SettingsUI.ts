import Phaser from 'phaser';
import { AudioSystem } from '../systems/AudioSystem';
import { SettingsManager } from '../systems/SettingsManager';

interface VolumeSlider {
  track: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  handle: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
  valueText: Phaser.GameObjects.Text;
  getValue: () => number;
  setValue: (value: number) => void;
}

export class SettingsUI {
  private scene: Phaser.Scene;
  private audioSystem: AudioSystem | null = null;
  private container: Phaser.GameObjects.Container;
  private isVisible: boolean = false;
  private sliders: VolumeSlider[] = [];

  private readonly PANEL_WIDTH = 400;
  private readonly PANEL_HEIGHT = 400;

  constructor(scene: Phaser.Scene, audioSystem?: AudioSystem) {
    this.scene = scene;
    this.audioSystem = audioSystem || null;

    // Create container at origin - we'll position it when shown
    this.container = scene.add.container(0, 0);
    this.container.setDepth(200);
    this.container.setVisible(false);

    this.createPanel();
  }

  setAudioSystem(audioSystem: AudioSystem): void {
    this.audioSystem = audioSystem;
    // Update sliders to reflect current audio values
    if (this.sliders.length >= 3) {
      this.sliders[0].setValue(audioSystem.getMasterVolume());
      this.sliders[1].setValue(audioSystem.getMusicVolume());
      this.sliders[2].setValue(audioSystem.getSFXVolume());
    }
  }

  private createPanel(): void {
    // Dark overlay
    const overlay = this.scene.add.rectangle(0, 0,
      this.scene.cameras.main.width * 2,
      this.scene.cameras.main.height * 2,
      0x000000, 0.6
    );
    overlay.setInteractive();
    this.container.add(overlay);

    // Panel background
    const panel = this.scene.add.rectangle(0, 0, this.PANEL_WIDTH, this.PANEL_HEIGHT, 0x1f2937);
    panel.setStrokeStyle(2, 0x8b5cf6);
    this.container.add(panel);

    // Title (left side)
    const title = this.scene.add.text(-this.PANEL_WIDTH / 2 + 25, -this.PANEL_HEIGHT / 2 + 28, 'Settings', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    title.setOrigin(0, 0.5);
    this.container.add(title);

    // Reset Defaults button (right side, next to title)
    const resetBtn = this.scene.add.text(this.PANEL_WIDTH / 2 - 60, -this.PANEL_HEIGHT / 2 + 28, 'Reset', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#9ca3af',
    });
    resetBtn.setOrigin(0.5);
    resetBtn.setInteractive({ useHandCursor: true });
    resetBtn.on('pointerover', () => resetBtn.setColor('#ffffff'));
    resetBtn.on('pointerout', () => resetBtn.setColor('#9ca3af'));
    resetBtn.on('pointerdown', () => this.resetDefaults());
    this.container.add(resetBtn);

    // Close button
    const closeBtn = this.scene.add.text(this.PANEL_WIDTH / 2 - 20, -this.PANEL_HEIGHT / 2 + 28, 'X', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#9ca3af',
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#9ca3af'));
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);

    // Volume sliders section
    const volumeTitle = this.scene.add.text(-this.PANEL_WIDTH / 2 + 30, -135, 'Volume', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#9ca3af',
    });
    this.container.add(volumeTitle);

    // Create sliders
    const masterSlider = this.createSlider(-100, 'Master',
      () => this.audioSystem?.getMasterVolume() ?? SettingsManager.getMasterVolume(),
      (v) => this.audioSystem?.setMasterVolume(v)
    );
    const musicSlider = this.createSlider(-60, 'Music',
      () => this.audioSystem?.getMusicVolume() ?? SettingsManager.getMusicVolume(),
      (v) => this.audioSystem?.setMusicVolume(v)
    );
    const sfxSlider = this.createSlider(-20, 'SFX',
      () => this.audioSystem?.getSFXVolume() ?? SettingsManager.getSFXVolume(),
      (v) => {
        this.audioSystem?.setSFXVolume(v);
        // Play test sound
        this.audioSystem?.play('sfx_pickup', 0.5);
      }
    );

    this.sliders = [masterSlider, musicSlider, sfxSlider];

    // Controls section
    const controlsTitle = this.scene.add.text(-this.PANEL_WIDTH / 2 + 30, 25, 'Controls', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#9ca3af',
    });
    this.container.add(controlsTitle);

    const controls = [
      ['WASD / Arrows', 'Move'],
      ['Left Click', 'Attack'],
      ['Space', 'Dodge'],
      ['E', 'Inventory'],
      ['L', 'Level Up'],
      ['ESC', 'Settings'],
    ];

    controls.forEach((control, index) => {
      const y = 50 + index * 22;

      const keyText = this.scene.add.text(-this.PANEL_WIDTH / 2 + 40, y, control[0], {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#d1d5db',
      });
      this.container.add(keyText);

      const dots = this.scene.add.text(60, y, '...', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#4b5563',
      });
      this.container.add(dots);

      const actionText = this.scene.add.text(100, y, control[1], {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#9ca3af',
      });
      this.container.add(actionText);
    });
  }

  private createSlider(
    y: number,
    label: string,
    getValue: () => number,
    setValue: (value: number) => void
  ): VolumeSlider {
    const trackWidth = 150;
    const trackHeight = 8;
    const handleRadius = 10;

    // Label
    const labelText = this.scene.add.text(-this.PANEL_WIDTH / 2 + 30, y, label, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#d1d5db',
    });
    labelText.setOrigin(0, 0.5);
    this.container.add(labelText);

    // Track background
    const trackX = -10;
    const track = this.scene.add.rectangle(trackX, y, trackWidth, trackHeight, 0x374151);
    track.setOrigin(0, 0.5);
    this.container.add(track);

    // Track fill
    const initialValue = getValue();
    const fill = this.scene.add.rectangle(trackX, y, trackWidth * initialValue, trackHeight, 0x8b5cf6);
    fill.setOrigin(0, 0.5);
    this.container.add(fill);

    // Handle
    const handleX = trackX + trackWidth * initialValue;
    const handle = this.scene.add.circle(handleX, y, handleRadius, 0xffffff);
    handle.setStrokeStyle(2, 0x8b5cf6);
    handle.setInteractive({ useHandCursor: true, draggable: true });
    this.container.add(handle);

    // Value text
    const valueText = this.scene.add.text(trackX + trackWidth + 15, y, `${Math.round(initialValue * 100)}%`, {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#9ca3af',
    });
    valueText.setOrigin(0, 0.5);
    this.container.add(valueText);

    // Drag handling - container is in world space, so use worldX directly
    handle.on('drag', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.worldX - this.container.x;

      // Clamp to track bounds
      const minX = trackX;
      const maxX = trackX + trackWidth;
      const clampedX = Phaser.Math.Clamp(localX, minX, maxX);

      handle.x = clampedX;

      // Calculate value (0-1)
      const value = (clampedX - trackX) / trackWidth;

      // Update fill
      fill.width = trackWidth * value;

      // Update value text
      valueText.setText(`${Math.round(value * 100)}%`);

      // Apply value
      setValue(value);
    });

    // Click on track to set value
    track.setInteractive({ useHandCursor: true });
    track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.worldX - this.container.x - trackX;
      const value = Phaser.Math.Clamp(localX / trackWidth, 0, 1);

      handle.x = trackX + trackWidth * value;
      fill.width = trackWidth * value;
      valueText.setText(`${Math.round(value * 100)}%`);
      setValue(value);
    });

    return {
      track,
      fill,
      handle,
      label: labelText,
      valueText,
      getValue,
      setValue: (value: number) => {
        const clampedValue = Phaser.Math.Clamp(value, 0, 1);
        handle.x = trackX + trackWidth * clampedValue;
        fill.width = trackWidth * clampedValue;
        valueText.setText(`${Math.round(clampedValue * 100)}%`);
      },
    };
  }

  private resetDefaults(): void {
    SettingsManager.resetToDefaults();
    const defaults = SettingsManager.get();

    if (this.audioSystem) {
      this.audioSystem.setMasterVolume(defaults.masterVolume);
      this.audioSystem.setMusicVolume(defaults.musicVolume);
      this.audioSystem.setSFXVolume(defaults.sfxVolume);
    }

    // Update sliders
    this.sliders[0].setValue(defaults.masterVolume);
    this.sliders[1].setValue(defaults.musicVolume);
    this.sliders[2].setValue(defaults.sfxVolume);
  }

  show(): void {
    this.isVisible = true;

    // Position container at camera center (in world coordinates)
    const cam = this.scene.cameras.main;
    this.container.setPosition(
      cam.scrollX + cam.width / 2,
      cam.scrollY + cam.height / 2
    );

    this.container.setVisible(true);

    // Update slider values from current audio state
    if (this.audioSystem) {
      this.sliders[0].setValue(this.audioSystem.getMasterVolume());
      this.sliders[1].setValue(this.audioSystem.getMusicVolume());
      this.sliders[2].setValue(this.audioSystem.getSFXVolume());
    }
  }

  hide(): void {
    this.isVisible = false;
    this.container.setVisible(false);
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }

  destroy(): void {
    this.container.destroy();
  }
}
