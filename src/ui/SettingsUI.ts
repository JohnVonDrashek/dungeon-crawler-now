import Phaser from 'phaser';
import { AudioSystem } from '../systems/AudioSystem';
import { SettingsManager } from '../systems/SettingsManager';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

// Extend Scene type to include rexUI
interface RexUIScene extends Phaser.Scene {
  rexUI: UIPlugin;
}

export class SettingsUI {
  private scene: RexUIScene;
  private audioSystem: AudioSystem | null = null;
  private panel: any; // rexUI Sizer
  private isVisible: boolean = false;
  private overlay: Phaser.GameObjects.Rectangle | null = null;

  private sliders: {
    master: any;
    music: any;
    sfx: any;
  } | null = null;

  constructor(scene: Phaser.Scene, audioSystem?: AudioSystem) {
    this.scene = scene as RexUIScene;
    this.audioSystem = audioSystem || null;
    this.createPanel();
  }

  setAudioSystem(audioSystem: AudioSystem): void {
    this.audioSystem = audioSystem;
    this.updateSliderValues();
  }

  private updateSliderValues(): void {
    if (!this.sliders) return;
    // Use AudioSystem if available, otherwise fall back to SettingsManager
    const masterVal = this.audioSystem?.getMasterVolume() ?? SettingsManager.getMasterVolume();
    const musicVal = this.audioSystem?.getMusicVolume() ?? SettingsManager.getMusicVolume();
    const sfxVal = this.audioSystem?.getSFXVolume() ?? SettingsManager.getSFXVolume();
    this.sliders.master.setValue(masterVal);
    this.sliders.music.setValue(musicVal);
    this.sliders.sfx.setValue(sfxVal);
  }

  private createPanel(): void {
    const { width, height } = this.scene.cameras.main;

    // Create dark overlay (larger to cover scrolled areas)
    this.overlay = this.scene.add.rectangle(width / 2, height / 2, width * 3, height * 3, 0x000000, 0.6);
    this.overlay.setInteractive();
    this.overlay.setDepth(199);
    // Don't use scrollFactor(0) - position in world space for correct input
    this.overlay.setVisible(false);

    // Create main panel using rexUI Sizer
    this.panel = this.scene.rexUI.add.sizer({
      x: width / 2,
      y: height / 2,
      orientation: 'y',
      space: { left: 20, right: 20, top: 15, bottom: 20, item: 12 },
    })
      .addBackground(
        this.scene.rexUI.add.roundRectangle(0, 0, 0, 0, 8, 0x1f2937)
          .setStrokeStyle(2, 0x8b5cf6)
      )
      // Header row
      .add(this.createHeader(), { expand: true })
      // Volume section
      .add(this.createSectionLabel('Volume'), { align: 'left', expand: true })
      .add(this.createSlider('Master',
        () => this.audioSystem?.getMasterVolume() ?? SettingsManager.getMasterVolume(),
        (value: number) => this.audioSystem?.setMasterVolume(value)
      ), { expand: true })
      .add(this.createSlider('Music',
        () => this.audioSystem?.getMusicVolume() ?? SettingsManager.getMusicVolume(),
        (value: number) => this.audioSystem?.setMusicVolume(value)
      ), { expand: true })
      .add(this.createSlider('SFX',
        () => this.audioSystem?.getSFXVolume() ?? SettingsManager.getSFXVolume(),
        (value: number) => {
          this.audioSystem?.setSFXVolume(value);
          this.audioSystem?.play('sfx_pickup', 0.5);
        }
      ), { expand: true })
      // Controls section
      .add(this.createSectionLabel('Controls'), { align: 'left', expand: true })
      .add(this.createControlsList(), { expand: true })
      .layout();

    // Store slider references
    const children = this.panel.getElement('items');
    this.sliders = {
      master: children[2].getElement('slider'),
      music: children[3].getElement('slider'),
      sfx: children[4].getElement('slider'),
    };

    this.panel.setDepth(200);
    // Don't use scrollFactor(0) - position in world space instead for correct input handling
    this.panel.setVisible(false);
  }

  private createHeader(): any {
    return this.scene.rexUI.add.sizer({
      orientation: 'x',
      space: { item: 10 },
    })
      .add(
        this.scene.add.text(0, 0, 'Settings', {
          fontSize: '22px',
          fontFamily: 'monospace',
          color: '#ffffff',
        }),
        { expand: false, align: 'left' }
      )
      .addSpace()
      .add(
        this.createTextButton('Reset', () => this.resetDefaults()),
        { expand: false, align: 'right' }
      )
      .add(
        this.createTextButton('X', () => this.hide()),
        { expand: false, align: 'right' }
      );
  }

  private createTextButton(text: string, callback: () => void): any {
    const btn = this.scene.add.text(0, 0, text, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#9ca3af',
    });
    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout', () => btn.setColor('#9ca3af'));
    btn.on('pointerdown', callback);
    return btn;
  }

  private createSectionLabel(text: string): any {
    return this.scene.add.text(0, 0, text, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#9ca3af',
    });
  }

  private createSlider(label: string, getValue: () => number, setValue: (value: number) => void): any {
    const initialValue = getValue();

    const valueText = this.scene.add.text(0, 0, `${Math.round(initialValue * 100)}%`, {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#d1d5db',
    });

    const slider = this.scene.rexUI.add.slider({
      width: 150,
      height: 20,
      orientation: 'x',
      value: initialValue,
      track: this.scene.rexUI.add.roundRectangle(0, 0, 0, 0, 4, 0x374151),
      indicator: this.scene.rexUI.add.roundRectangle(0, 0, 0, 0, 4, 0x8b5cf6),
      thumb: this.scene.rexUI.add.roundRectangle(0, 0, 0, 20, 10, 0xffffff)
        .setStrokeStyle(2, 0x8b5cf6),
      input: 'click',
      valuechangeCallback: (value: number) => {
        valueText.setText(`${Math.round(value * 100)}%`);
        setValue(value);
      },
    });

    return this.scene.rexUI.add.sizer({
      orientation: 'x',
      space: { item: 15 },
    })
      .add(
        this.scene.add.text(0, 0, label, {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#d1d5db',
        }),
        { proportion: 0, expand: false, minWidth: 55 }
      )
      .addSpace() // Push slider and value to the right
      .add(slider, { proportion: 0, expand: false, key: 'slider' })
      .add(valueText, { proportion: 0, expand: false, minWidth: 45, align: 'right' });
  }

  private createControlsList(): any {
    const controls = [
      ['WASD / Arrows', 'Move'],
      ['Left Click', 'Attack'],
      ['Space', 'Dodge'],
      ['E', 'Inventory'],
      ['L', 'Level Up'],
      ['ESC', 'Settings'],
    ];

    const sizer = this.scene.rexUI.add.sizer({
      orientation: 'y',
      space: { item: 6 },
    });

    for (const [key, action] of controls) {
      sizer.add(
        this.scene.rexUI.add.sizer({
          orientation: 'x',
          space: { item: 10 },
        })
          .add(
            this.scene.add.text(0, 0, key, {
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#d1d5db',
            }),
            { proportion: 0, minWidth: 110 }
          )
          .add(
            this.scene.add.text(0, 0, action, {
              fontSize: '12px',
              fontFamily: 'monospace',
              color: '#9ca3af',
            }),
            { proportion: 0 }
          ),
        { expand: true, align: 'left' }
      );
    }

    return sizer;
  }

  private resetDefaults(): void {
    SettingsManager.resetToDefaults();
    const defaults = SettingsManager.get();

    if (this.audioSystem) {
      this.audioSystem.setMasterVolume(defaults.masterVolume);
      this.audioSystem.setMusicVolume(defaults.musicVolume);
      this.audioSystem.setSFXVolume(defaults.sfxVolume);
    }

    this.updateSliderValues();
  }

  show(): void {
    this.isVisible = true;

    // Position at camera center in world coordinates
    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    if (this.overlay) {
      this.overlay.setPosition(centerX, centerY);
      this.overlay.setVisible(true);
    }

    this.panel.setPosition(centerX, centerY);
    this.panel.layout(); // Re-layout after repositioning
    this.panel.setVisible(true);

    this.updateSliderValues();
  }

  hide(): void {
    this.isVisible = false;
    if (this.overlay) {
      this.overlay.setVisible(false);
    }
    this.panel.setVisible(false);
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
    if (this.overlay) {
      this.overlay.destroy();
    }
    this.panel.destroy();
  }
}
