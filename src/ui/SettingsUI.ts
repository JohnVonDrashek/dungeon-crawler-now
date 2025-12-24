import Phaser from 'phaser';
import { AudioSystem } from '../systems/AudioSystem';
import { SettingsManager } from '../systems/SettingsManager';

interface SliderData {
  container: Phaser.GameObjects.Container;
  track: Phaser.GameObjects.Graphics;
  fill: Phaser.GameObjects.Graphics;
  thumb: Phaser.GameObjects.Ellipse;
  valueText: Phaser.GameObjects.Text;
  getValue: () => number;
  setValue: (value: number) => void;
  value: number;
}

export class SettingsUI {
  private scene: Phaser.Scene;
  private audioSystem: AudioSystem | null = null;
  private panel: Phaser.GameObjects.Container | null = null;
  private isVisible: boolean = false;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private keyListener: ((event: KeyboardEvent) => void) | null = null;

  private sliders: {
    master: SliderData | null;
    music: SliderData | null;
    sfx: SliderData | null;
  } = { master: null, music: null, sfx: null };

  private readonly PANEL_WIDTH = 380;
  private readonly PANEL_HEIGHT = 400;
  private readonly SLIDER_WIDTH = 120;
  private readonly TRACK_X = 0;

  constructor(scene: Phaser.Scene, audioSystem?: AudioSystem) {
    this.scene = scene;
    this.audioSystem = audioSystem || null;
  }

  setAudioSystem(audioSystem: AudioSystem): void {
    this.audioSystem = audioSystem;
    this.updateSliderValues();
  }

  private updateSliderValues(): void {
    if (!this.sliders.master) return;

    const masterVal = this.audioSystem?.getMasterVolume() ?? SettingsManager.getMasterVolume();
    const musicVal = this.audioSystem?.getMusicVolume() ?? SettingsManager.getMusicVolume();
    const sfxVal = this.audioSystem?.getSFXVolume() ?? SettingsManager.getSFXVolume();

    this.updateSlider(this.sliders.master, masterVal);
    this.updateSlider(this.sliders.music!, musicVal);
    this.updateSlider(this.sliders.sfx!, sfxVal);
  }

  private updateSlider(slider: SliderData, value: number): void {
    slider.value = value;
    slider.valueText.setText(`${Math.round(value * 100)}%`);

    // Update fill and thumb position
    const fillWidth = Math.max(2, this.SLIDER_WIDTH * value);
    slider.fill.clear();
    slider.fill.fillStyle(0xff6600, 1);
    slider.fill.fillRoundedRect(this.TRACK_X, -4, fillWidth, 8, 2);

    slider.thumb.setPosition(this.TRACK_X + this.SLIDER_WIDTH * value, 0);
    slider.thumb.setFillStyle(0xff6600);
    slider.thumb.setStrokeStyle(2, 0xffffff);
  }

  show(): void {
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }

    this.isVisible = true;

    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    // Background overlay - start invisible and fade in
    this.overlay = this.scene.add.rectangle(centerX, centerY, cam.width * 3, cam.height * 3, 0x000000, 0);
    this.overlay.setDepth(199);
    this.overlay.setInteractive();

    // Create main panel off-screen to avoid any flash
    this.panel = this.scene.add.container(centerX, centerY + cam.height);
    this.panel.setDepth(200);
    this.panel.setAlpha(0);

    this.createPanel();
    this.updateSliderValues();

    // Animate overlay fade and panel slide-in
    this.scene.tweens.add({
      targets: this.overlay,
      fillAlpha: 0.75,
      duration: 150,
      ease: 'Sine.easeOut',
    });
    this.scene.tweens.add({
      targets: this.panel,
      y: centerY,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });

    // Delay input setup to avoid catching the same ESC keypress that opened the menu
    this.scene.time.delayedCall(50, () => {
      if (this.isVisible) {
        this.setupInput();
      }
    });
  }

  private createPanel(): void {
    if (!this.panel) return;

    const halfW = this.PANEL_WIDTH / 2;
    const halfH = this.PANEL_HEIGHT / 2;

    // Main background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a0a, 0.95);
    bg.fillRoundedRect(-halfW, -halfH, this.PANEL_WIDTH, this.PANEL_HEIGHT, 8);
    bg.lineStyle(1, 0x444444, 0.8);
    bg.strokeRoundedRect(-halfW, -halfH, this.PANEL_WIDTH, this.PANEL_HEIGHT, 8);
    this.panel.add(bg);

    // Corner accents
    this.drawCornerAccents(halfW, halfH);

    // Header
    this.createHeader(halfW, halfH);

    // Volume section
    this.createVolumeSection(halfW, halfH);

    // Controls section
    this.createControlsSection(halfW, halfH);

    // Reset button
    this.createResetButton(halfH);
  }

  private drawCornerAccents(halfW: number, halfH: number): void {
    if (!this.panel) return;

    const corners = this.scene.add.graphics();
    corners.lineStyle(2, 0xff6600, 0.9);
    const cornerSize = 14;

    // Top-left
    corners.beginPath();
    corners.moveTo(-halfW, -halfH + cornerSize);
    corners.lineTo(-halfW, -halfH);
    corners.lineTo(-halfW + cornerSize, -halfH);
    corners.strokePath();

    // Top-right
    corners.beginPath();
    corners.moveTo(halfW - cornerSize, -halfH);
    corners.lineTo(halfW, -halfH);
    corners.lineTo(halfW, -halfH + cornerSize);
    corners.strokePath();

    // Bottom-left
    corners.beginPath();
    corners.moveTo(-halfW, halfH - cornerSize);
    corners.lineTo(-halfW, halfH);
    corners.lineTo(-halfW + cornerSize, halfH);
    corners.strokePath();

    // Bottom-right
    corners.beginPath();
    corners.moveTo(halfW - cornerSize, halfH);
    corners.lineTo(halfW, halfH);
    corners.lineTo(halfW, halfH - cornerSize);
    corners.strokePath();

    this.panel.add(corners);
  }

  private createHeader(halfW: number, halfH: number): void {
    if (!this.panel) return;

    // Header background
    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(0x1a1a1a, 0.8);
    headerBg.fillRect(-halfW + 15, -halfH + 15, this.PANEL_WIDTH - 30, 40);
    this.panel.add(headerBg);

    // Title accent
    const accent = this.scene.add.text(-halfW + 25, -halfH + 35, '◆', {
      fontSize: '14px',
      color: '#ff6600',
    });
    accent.setOrigin(0, 0.5);
    this.panel.add(accent);

    // Title
    const title = this.scene.add.text(-halfW + 45, -halfH + 35, 'SETTINGS', {
      fontSize: '18px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ffffff',
    });
    title.setOrigin(0, 0.5);
    this.panel.add(title);

    // Close button
    const closeBtn = this.scene.add.text(halfW - 25, -halfH + 35, '✕', {
      fontSize: '16px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#666666',
    });
    closeBtn.setOrigin(0.5, 0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ff4444'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#666666'));
    closeBtn.on('pointerdown', () => this.hide());
    this.panel.add(closeBtn);
  }

  private createVolumeSection(halfW: number, halfH: number): void {
    if (!this.panel) return;

    const sectionY = -halfH + 75;

    // Section label
    const label = this.scene.add.text(-halfW + 25, sectionY, 'VOLUME', {
      fontSize: '12px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#888888',
    });
    label.setOrigin(0, 0.5);
    this.panel.add(label);

    // Divider line
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x333333, 0.8);
    divider.lineBetween(-halfW + 80, sectionY, halfW - 25, sectionY);
    this.panel.add(divider);

    // Sliders
    this.sliders.master = this.createSlider(
      'Master',
      sectionY + 35,
      halfW,
      () => this.audioSystem?.getMasterVolume() ?? SettingsManager.getMasterVolume(),
      (value: number) => this.audioSystem?.setMasterVolume(value)
    );

    this.sliders.music = this.createSlider(
      'Music',
      sectionY + 70,
      halfW,
      () => this.audioSystem?.getMusicVolume() ?? SettingsManager.getMusicVolume(),
      (value: number) => this.audioSystem?.setMusicVolume(value)
    );

    this.sliders.sfx = this.createSlider(
      'SFX',
      sectionY + 105,
      halfW,
      () => this.audioSystem?.getSFXVolume() ?? SettingsManager.getSFXVolume(),
      (value: number) => {
        this.audioSystem?.setSFXVolume(value);
        this.audioSystem?.play('sfx_pickup', 0.5);
      }
    );
  }

  private createSlider(
    label: string,
    y: number,
    halfW: number,
    getValue: () => number,
    setValue: (value: number) => void
  ): SliderData {
    if (!this.panel) throw new Error('Panel not initialized');

    const container = this.scene.add.container(0, y);
    const initialValue = getValue();

    // Label
    const labelText = this.scene.add.text(-halfW + 25, 0, label, {
      fontSize: '13px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#cccccc',
    });
    labelText.setOrigin(0, 0.5);
    container.add(labelText);

    // Slider track
    const track = this.scene.add.graphics();
    track.fillStyle(0x1a1a1a, 1);
    track.fillRoundedRect(this.TRACK_X, -4, this.SLIDER_WIDTH, 8, 2);
    track.lineStyle(1, 0x333333, 1);
    track.strokeRoundedRect(this.TRACK_X, -4, this.SLIDER_WIDTH, 8, 2);
    container.add(track);

    // Slider fill
    const fillWidth = Math.max(2, this.SLIDER_WIDTH * initialValue);
    const fill = this.scene.add.graphics();
    fill.fillStyle(0xff6600, 1);
    fill.fillRoundedRect(this.TRACK_X, -4, fillWidth, 8, 2);
    container.add(fill);

    // Slider thumb - orange fill with white border
    const thumb = this.scene.add.ellipse(this.TRACK_X + this.SLIDER_WIDTH * initialValue, 0, 14, 14, 0xff6600);
    thumb.setStrokeStyle(2, 0xffffff);
    container.add(thumb);

    // Value text (right-aligned like controls section)
    const valueText = this.scene.add.text(halfW - 30, 0, `${Math.round(initialValue * 100)}%`, {
      fontSize: '11px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#888888',
    });
    valueText.setOrigin(1, 0.5);
    container.add(valueText);

    // Interactive hit area for the slider
    const hitArea = this.scene.add.rectangle(this.TRACK_X + this.SLIDER_WIDTH / 2, 0, this.SLIDER_WIDTH + 20, 24, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true, draggable: true });
    container.add(hitArea);

    const sliderData: SliderData = {
      container,
      track,
      fill,
      thumb,
      valueText,
      getValue,
      setValue,
      value: initialValue,
    };

    // Handle click on track
    hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - (this.panel!.x + this.TRACK_X);
      const newValue = Phaser.Math.Clamp(localX / this.SLIDER_WIDTH, 0, 1);
      this.updateSlider(sliderData, newValue);
      setValue(newValue);
    });

    // Handle drag
    hitArea.on('drag', (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - (this.panel!.x + this.TRACK_X);
      const newValue = Phaser.Math.Clamp(localX / this.SLIDER_WIDTH, 0, 1);
      this.updateSlider(sliderData, newValue);
      setValue(newValue);
    });

    this.panel.add(container);
    return sliderData;
  }

  private createControlsSection(halfW: number, halfH: number): void {
    if (!this.panel) return;

    const sectionY = -halfH + 210;

    // Section label
    const label = this.scene.add.text(-halfW + 25, sectionY, 'CONTROLS', {
      fontSize: '12px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#888888',
    });
    label.setOrigin(0, 0.5);
    this.panel.add(label);

    // Divider line
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x333333, 0.8);
    divider.lineBetween(-halfW + 100, sectionY, halfW - 25, sectionY);
    this.panel.add(divider);

    // Controls list
    const controls = [
      ['WASD / Arrows', 'Move'],
      ['Left Click', 'Attack'],
      ['Space', 'Dodge'],
      ['E', 'Inventory'],
      ['L', 'Level Up'],
      ['ESC', 'Settings'],
    ];

    const startY = sectionY + 25;
    const rowHeight = 22;

    for (let i = 0; i < controls.length; i++) {
      const [key, action] = controls[i];
      const y = startY + i * rowHeight;

      // Key
      const keyText = this.scene.add.text(-halfW + 30, y, key, {
        fontSize: '11px',
        fontFamily: 'Roboto Mono, Courier New, monospace',
        color: '#cccccc',
      });
      keyText.setOrigin(0, 0.5);
      this.panel.add(keyText);

      // Action
      const actionText = this.scene.add.text(halfW - 30, y, action, {
        fontSize: '11px',
        fontFamily: 'Roboto Mono, Courier New, monospace',
        color: '#888888',
      });
      actionText.setOrigin(1, 0.5);
      this.panel.add(actionText);
    }
  }

  private createResetButton(halfH: number): void {
    if (!this.panel) return;

    const btnWidth = 120;
    const btnHeight = 32;
    const y = halfH - 30;

    const container = this.scene.add.container(0, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x4a1a1a, 0.9);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
    bg.lineStyle(1, 0x884444, 0.6);
    bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
    container.add(bg);

    // Corner accents
    const corners = this.scene.add.graphics();
    corners.lineStyle(1, 0xff6600, 0.7);
    const cs = 6;
    const hw = btnWidth / 2;
    const hh = btnHeight / 2;
    corners.beginPath();
    corners.moveTo(-hw, -hh + cs);
    corners.lineTo(-hw, -hh);
    corners.lineTo(-hw + cs, -hh);
    corners.strokePath();
    corners.beginPath();
    corners.moveTo(hw - cs, -hh);
    corners.lineTo(hw, -hh);
    corners.lineTo(hw, -hh + cs);
    corners.strokePath();
    container.add(corners);

    const text = this.scene.add.text(0, 0, 'RESET', {
      fontSize: '12px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#ffffff',
    });
    text.setOrigin(0.5, 0.5);
    container.add(text);

    const hitArea = this.scene.add.rectangle(0, 0, btnWidth, btnHeight, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x5a2a2a, 0.9);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
      bg.lineStyle(1, 0xaa6666, 0.8);
      bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
    });
    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x4a1a1a, 0.9);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
      bg.lineStyle(1, 0x884444, 0.6);
      bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
    });
    hitArea.on('pointerdown', () => this.resetDefaults());
    container.add(hitArea);

    this.panel.add(container);
  }

  private setupInput(): void {
    this.keyListener = (event: KeyboardEvent) => {
      if (!this.isVisible) return;

      if (event.code === 'Escape') {
        event.preventDefault();
        this.hide();
      }
    };

    this.scene.input.keyboard?.on('keydown', this.keyListener);
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

  hide(): void {
    this.isVisible = false;

    if (this.keyListener) {
      this.scene.input.keyboard?.off('keydown', this.keyListener);
      this.keyListener = null;
    }

    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }

    this.sliders = { master: null, music: null, sfx: null };
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
    this.hide();
  }
}
