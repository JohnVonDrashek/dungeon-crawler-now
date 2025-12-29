import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';
import { SettingsUI } from '../ui/SettingsUI';
import { getWorldConfig, SinWorld } from '../config/WorldConfig';
import { networkManager } from '../multiplayer/NetworkManager';

export class MenuScene extends Phaser.Scene {
  private settingsUI!: SettingsUI;
  private sinIcons: Phaser.GameObjects.Text[] = [];
  private buttonIndex: number = 0;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.buttonIndex = 0;
    this.settingsUI = new SettingsUI(this);
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create layered background
    this.createBackground(width, height);

    // Create floating embers/particles
    this.createParticles(width, height);

    // Create sin symbols around edges
    this.createSinSymbols(width, height);

    // Create the main title
    this.createTitle(width, height);

    // Create menu buttons
    this.createMenu(width, height);

    // Controls info at bottom - styled with decorative elements
    const controlsY = height - 35;

    const controls = this.add.text(width / 2, controlsY,
      'WASD Move  ·  Click Attack  ·  Space Dodge  ·  E Inventory', {
        fontSize: '11px',
        fontFamily: 'Roboto Mono, Courier New, monospace',
        color: '#444444',
      });
    controls.setOrigin(0.5);

    // Decorative lines on either side - positioned based on text width
    const textHalfWidth = controls.width / 2 + 20;
    const lineWidth = 60;

    const controlsLineLeft = this.add.graphics();
    controlsLineLeft.lineStyle(1, 0x333333, 0.5);
    controlsLineLeft.lineBetween(width/2 - textHalfWidth - lineWidth, controlsY, width/2 - textHalfWidth, controlsY);

    const controlsLineRight = this.add.graphics();
    controlsLineRight.lineStyle(1, 0x333333, 0.5);
    controlsLineRight.lineBetween(width/2 + textHalfWidth, controlsY, width/2 + textHalfWidth + lineWidth, controlsY);

    // Version - more subtle
    const version = this.add.text(width - 15, height - 15, 'v1.0', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#333333',
    });
    version.setOrigin(1, 1);
  }

  private createBackground(width: number, height: number): void {
    // Deep gradient background
    const bg = this.add.graphics();

    // Create gradient from dark red/purple at bottom to near-black at top
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const ratio = i / steps;
      const y = ratio * height;
      const h = height / steps + 1;

      // Interpolate from dark purple-black to deep crimson
      const r = Math.floor(10 + ratio * 25);
      const g = Math.floor(5 + ratio * 5);
      const b = Math.floor(15 + ratio * 10);
      const color = (r << 16) | (g << 8) | b;

      bg.fillStyle(color, 1);
      bg.fillRect(0, y, width, h);
    }

    // Add subtle vignette overlay
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0);
    vignette.fillRect(0, 0, width, height);

    // Dark corners
    const vignetteRadius = Math.max(width, height) * 0.8;
    for (let i = 0; i < 10; i++) {
      const alpha = 0.03 * (10 - i);
      vignette.fillStyle(0x000000, alpha);
      vignette.fillCircle(width / 2, height / 2, vignetteRadius - i * 30);
    }

    // Add some atmospheric fog/mist at bottom
    for (let i = 0; i < 5; i++) {
      const fogY = height - 50 + i * 15;
      const fog = this.add.rectangle(width / 2, fogY, width, 30, 0x1a0a0a, 0.3 - i * 0.05);
      fog.setBlendMode(Phaser.BlendModes.ADD);
    }
  }

  private createParticles(width: number, height: number): void {
    // Create ember particle texture if not exists
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(4, 4, 4);
    graphics.generateTexture('ember_particle', 8, 8);
    graphics.destroy();

    // Rising embers - slow and atmospheric
    const emberColors = [0xff4400, 0xff6600, 0xff8800, 0xffaa00, 0xff2200];

    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(height * 0.3, height);
      const ember = this.add.circle(x, y, Phaser.Math.Between(1, 3), Phaser.Math.RND.pick(emberColors));
      ember.setAlpha(Phaser.Math.FloatBetween(0.3, 0.7));
      ember.setBlendMode(Phaser.BlendModes.ADD);

      // Float upward with slight horizontal drift
      this.tweens.add({
        targets: ember,
        y: -20,
        x: x + Phaser.Math.Between(-50, 50),
        alpha: 0,
        duration: Phaser.Math.Between(4000, 8000),
        ease: 'Sine.easeIn',
        onComplete: () => {
          ember.setPosition(Phaser.Math.Between(0, width), height + 20);
          ember.setAlpha(Phaser.Math.FloatBetween(0.3, 0.7));
          this.tweens.add({
            targets: ember,
            y: -20,
            x: ember.x + Phaser.Math.Between(-50, 50),
            alpha: 0,
            duration: Phaser.Math.Between(4000, 8000),
            ease: 'Sine.easeIn',
            repeat: -1,
          });
        },
      });
    }

    // Floating soul wisps - slower, more ethereal
    for (let i = 0; i < 8; i++) {
      const x = Phaser.Math.Between(50, width - 50);
      const y = Phaser.Math.Between(100, height - 100);
      const wisp = this.add.circle(x, y, Phaser.Math.Between(2, 5), 0x8b5cf6);
      wisp.setAlpha(0.2);
      wisp.setBlendMode(Phaser.BlendModes.ADD);

      // Gentle floating motion
      this.tweens.add({
        targets: wisp,
        x: x + Phaser.Math.Between(-100, 100),
        y: y + Phaser.Math.Between(-80, 80),
        alpha: { from: 0.1, to: 0.4 },
        scale: { from: 0.8, to: 1.2 },
        duration: Phaser.Math.Between(3000, 6000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createSinSymbols(width: number, height: number): void {
    // Sin symbols arranged in a wide, subtle arc above the title
    const sins: { world: SinWorld; symbol: string; name: string }[] = [
      { world: SinWorld.PRIDE, symbol: '♔', name: 'PRIDE' },
      { world: SinWorld.GREED, symbol: '◆', name: 'GREED' },
      { world: SinWorld.WRATH, symbol: '⚔', name: 'WRATH' },
      { world: SinWorld.SLOTH, symbol: '◐', name: 'SLOTH' },
      { world: SinWorld.ENVY, symbol: '◈', name: 'ENVY' },
      { world: SinWorld.GLUTTONY, symbol: '⬢', name: 'GLUTTONY' },
      { world: SinWorld.LUST, symbol: '♥', name: 'LUST' },
    ];

    const centerX = width / 2;
    const arcCenterY = height * 0.48; // Just below the divider
    const arcWidth = width * 0.85; // Wide arc spanning most of screen
    const arcHeight = 25; // Subtle arc height (not too pronounced)

    sins.forEach((sin, index) => {
      const config = getWorldConfig(sin.world);
      const colorHex = `#${config.colors.primary.toString(16).padStart(6, '0')}`;

      // Spread evenly across the arc width
      const t = index / (sins.length - 1); // 0 to 1
      const x = centerX - arcWidth / 2 + t * arcWidth;
      // Gentle arc: highest at edges, lowest in middle
      const y = arcCenterY + Math.sin(t * Math.PI) * arcHeight;

      // Outer ring
      const ring = this.add.circle(x, y, 18, 0x000000, 0);
      ring.setStrokeStyle(1, config.colors.primary, 0.3);

      // Inner glow
      const glow = this.add.circle(x, y, 14, config.colors.primary, 0.1);

      this.tweens.add({
        targets: [glow, ring],
        scale: { from: 0.9, to: 1.1 },
        alpha: { from: 0.1, to: 0.3 },
        duration: 2500 + index * 150,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Symbol
      const symbol = this.add.text(x, y, sin.symbol, {
        fontSize: '20px',
        color: colorHex,
      });
      symbol.setOrigin(0.5);
      symbol.setAlpha(0.8);

      this.sinIcons.push(symbol);

      // Sin name label
      const label = this.add.text(x, y + 28, sin.name, {
        fontSize: '8px',
        fontFamily: 'Roboto Mono, Courier New, monospace',
        color: colorHex,
      });
      label.setOrigin(0.5);
      label.setAlpha(0);

      // Staggered fade in for labels
      this.tweens.add({
        targets: label,
        alpha: 0.4,
        duration: 500,
        delay: 2000 + index * 100,
      });

      // Subtle float animation
      this.tweens.add({
        targets: [symbol, ring, glow],
        y: y - 4,
        duration: 1800 + index * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });

      // Label floats with symbol
      this.tweens.add({
        targets: label,
        y: y + 24,
        duration: 1800 + index * 120,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private createTitle(width: number, height: number): void {
    // Main title glow layer (behind)
    const titleGlow = this.add.text(width / 2, height * 0.28, 'INFERNAL\nASCENT', {
      fontSize: '64px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ff4400',
      align: 'center',
      stroke: '#ff2200',
      strokeThickness: 8,
    });
    titleGlow.setOrigin(0.5);
    titleGlow.setAlpha(0.3);
    titleGlow.setBlendMode(Phaser.BlendModes.ADD);

    // Animate glow
    this.tweens.add({
      targets: titleGlow,
      alpha: { from: 0.2, to: 0.5 },
      scale: { from: 1, to: 1.02 },
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Main title
    const title = this.add.text(width / 2, height * 0.28, 'INFERNAL\nASCENT', {
      fontSize: '64px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ffffff',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 6,
    });
    title.setOrigin(0.5);

    // Subtle breathing animation
    this.tweens.add({
      targets: title,
      scale: { from: 1, to: 1.01 },
      duration: 3000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Subtitle with typewriter effect
    const subtitleText = 'Conquer the Seven Sins';
    const subtitle = this.add.text(width / 2, height * 0.44, '', {
      fontSize: '14px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#777777',
    });
    subtitle.setOrigin(0.5);

    // Typewriter effect
    let charIndex = 0;
    this.time.addEvent({
      delay: 60,
      callback: () => {
        subtitle.setText(subtitleText.substring(0, charIndex + 1));
        charIndex++;
      },
      repeat: subtitleText.length - 1,
    });

    // Decorative divider under subtitle
    const lineY = height * 0.48;
    const lineWidth = 300;

    // Animate divider drawing
    this.time.delayedCall(subtitleText.length * 60 + 400, () => {
      const divider = this.add.container(width / 2, lineY);
      divider.setAlpha(0);

      // Center diamond
      const centerDiamond = this.add.text(0, 0, '◆', {
        fontSize: '10px',
        color: '#ff6600',
      });
      centerDiamond.setOrigin(0.5);

      // Left line
      const leftLine = this.add.graphics();
      leftLine.lineStyle(1, 0x444444, 0.6);
      leftLine.lineBetween(-lineWidth/2, 0, -15, 0);

      // Right line
      const rightLine = this.add.graphics();
      rightLine.lineStyle(1, 0x444444, 0.6);
      rightLine.lineBetween(15, 0, lineWidth/2, 0);

      // Small end caps
      const leftCap = this.add.text(-lineWidth/2, 0, '─', {
        fontSize: '10px',
        color: '#ff6600',
      });
      leftCap.setOrigin(0.5);
      leftCap.setAlpha(0.5);

      const rightCap = this.add.text(lineWidth/2, 0, '─', {
        fontSize: '10px',
        color: '#ff6600',
      });
      rightCap.setOrigin(0.5);
      rightCap.setAlpha(0.5);

      divider.add([leftLine, rightLine, centerDiamond, leftCap, rightCap]);

      // Fade in divider
      this.tweens.add({
        targets: divider,
        alpha: 1,
        duration: 600,
        ease: 'Power2',
      });

      // Gentle pulse on center diamond
      this.tweens.add({
        targets: centerDiamond,
        scale: { from: 1, to: 1.2 },
        alpha: { from: 0.8, to: 1 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private createMenu(width: number, height: number): void {
    const buttonY = height * 0.62;
    const buttonSpacing = 55;

    // New Game button
    this.createButton(width / 2, buttonY, 'New Game', () => {
      this.transitionToGame(false);
    });

    // Continue button (only if save exists)
    const saveInfo = SaveSystem.getSaveInfo();
    let nextButtonY = buttonY + buttonSpacing;

    if (saveInfo) {
      this.createButton(width / 2, nextButtonY, 'Continue', () => {
        this.transitionToGame(true, saveInfo);
      });
      nextButtonY += buttonSpacing;

      // Show save info
      let saveText: string;
      if (saveInfo.activeWorld && saveInfo.activeFloor) {
        const worldConfig = getWorldConfig(saveInfo.activeWorld);
        saveText = `${worldConfig.name} Floor ${saveInfo.activeFloor} | Level ${saveInfo.level}`;
      } else {
        saveText = `${saveInfo.worldsCompleted}/7 Worlds Complete | Level ${saveInfo.level}`;
      }
      // Save info with decorative styling
      const saveContainer = this.add.container(width / 2, nextButtonY - 18);

      // Small decorative diamond
      const diamond = this.add.text(-saveText.length * 3.5 - 15, 0, '◆', {
        fontSize: '8px',
        color: '#ff6600',
      });
      diamond.setOrigin(0.5);
      diamond.setAlpha(0.6);

      const diamond2 = this.add.text(saveText.length * 3.5 + 15, 0, '◆', {
        fontSize: '8px',
        color: '#ff6600',
      });
      diamond2.setOrigin(0.5);
      diamond2.setAlpha(0.6);

      const saveTextObj = this.add.text(0, 0, saveText, {
        fontSize: '11px',
        fontFamily: 'Roboto Mono, Courier New, monospace',
        color: '#888888',
      });
      saveTextObj.setOrigin(0.5);

      saveContainer.add([diamond, diamond2, saveTextObj]);
      nextButtonY += 25;
    }

    // Settings button
    this.createButton(width / 2, nextButtonY, 'Settings', () => {
      this.settingsUI.show();
    });

    nextButtonY += buttonSpacing;

    // Host Co-op button
    this.createButton(width / 2, nextButtonY, 'Host Co-op', () => {
      this.showHostingUI();
    });

    nextButtonY += buttonSpacing;

    // Join Co-op button
    this.createButton(width / 2, nextButtonY, 'Join Co-op', () => {
      this.showJoinUI();
    });
  }

  private createButton(x: number, y: number, text: string, callback: () => void): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);
    container.setAlpha(0);

    const buttonWidth = 260;
    const buttonHeight = 44;

    // Outer glow (fire effect)
    const outerGlow = this.add.graphics();
    outerGlow.fillStyle(0xff4400, 0.15);
    outerGlow.fillRoundedRect(-buttonWidth/2 - 4, -buttonHeight/2 - 4, buttonWidth + 8, buttonHeight + 8, 4);
    outerGlow.setAlpha(0);

    // Main button background - dark with subtle gradient feel
    const bg = this.add.graphics();
    bg.fillStyle(0x0d0d0d, 0.9);
    bg.fillRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 3);

    // Border - thin elegant line
    const border = this.add.graphics();
    border.lineStyle(1, 0x666666, 0.6);
    border.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 3);

    // Decorative corner accents
    const accentColor = 0xff6600;
    const cornerSize = 8;
    const corners = this.add.graphics();
    corners.lineStyle(2, accentColor, 0.7);

    // Top-left corner
    corners.beginPath();
    corners.moveTo(-buttonWidth/2, -buttonHeight/2 + cornerSize);
    corners.lineTo(-buttonWidth/2, -buttonHeight/2);
    corners.lineTo(-buttonWidth/2 + cornerSize, -buttonHeight/2);
    corners.strokePath();

    // Top-right corner
    corners.beginPath();
    corners.moveTo(buttonWidth/2 - cornerSize, -buttonHeight/2);
    corners.lineTo(buttonWidth/2, -buttonHeight/2);
    corners.lineTo(buttonWidth/2, -buttonHeight/2 + cornerSize);
    corners.strokePath();

    // Bottom-left corner
    corners.beginPath();
    corners.moveTo(-buttonWidth/2, buttonHeight/2 - cornerSize);
    corners.lineTo(-buttonWidth/2, buttonHeight/2);
    corners.lineTo(-buttonWidth/2 + cornerSize, buttonHeight/2);
    corners.strokePath();

    // Bottom-right corner
    corners.beginPath();
    corners.moveTo(buttonWidth/2 - cornerSize, buttonHeight/2);
    corners.lineTo(buttonWidth/2, buttonHeight/2);
    corners.lineTo(buttonWidth/2, buttonHeight/2 - cornerSize);
    corners.strokePath();

    // Button text - use Cinzel to match title
    const label = this.add.text(0, 0, text.toUpperCase(), {
      fontSize: '18px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#cccccc',
      letterSpacing: 3,
    });
    label.setOrigin(0.5);

    // Invisible hitbox
    const hitbox = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x000000, 0);
    hitbox.setInteractive({ useHandCursor: true });

    container.add([outerGlow, bg, border, corners, label, hitbox]);

    // Fade in animation - starts after divider appears, spaced out stagger
    // Divider appears at ~2300ms (subtitle typewriter + divider fade)
    const btnDelay = 2400 + this.buttonIndex * 150;
    this.buttonIndex++;

    this.tweens.add({
      targets: container,
      alpha: 1,
      y: y,
      duration: 400,
      delay: btnDelay,
      ease: 'Power2',
    });

    hitbox.on('pointerover', () => {
      // Glow appears
      this.tweens.add({
        targets: outerGlow,
        alpha: 1,
        duration: 200,
      });
      // Text brightens and changes color
      this.tweens.add({
        targets: label,
        scale: 1.05,
        duration: 200,
      });
      label.setColor('#ff8844');
      // Corner accents brighten
      corners.clear();
      corners.lineStyle(2, 0xff8844, 1);
      this.drawCorners(corners, buttonWidth, buttonHeight, cornerSize);
      // Border brightens
      border.clear();
      border.lineStyle(1, 0xff6600, 0.8);
      border.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 3);
    });

    hitbox.on('pointerout', () => {
      this.tweens.add({
        targets: outerGlow,
        alpha: 0,
        duration: 200,
      });
      this.tweens.add({
        targets: label,
        scale: 1,
        duration: 200,
      });
      label.setColor('#cccccc');
      // Reset corners
      corners.clear();
      corners.lineStyle(2, accentColor, 0.7);
      this.drawCorners(corners, buttonWidth, buttonHeight, cornerSize);
      // Reset border
      border.clear();
      border.lineStyle(1, 0x666666, 0.6);
      border.strokeRoundedRect(-buttonWidth/2, -buttonHeight/2, buttonWidth, buttonHeight, 3);
    });

    hitbox.on('pointerdown', () => {
      callback();
    });

    return container;
  }

  private drawCorners(graphics: Phaser.GameObjects.Graphics, width: number, height: number, size: number): void {
    // Top-left
    graphics.beginPath();
    graphics.moveTo(-width/2, -height/2 + size);
    graphics.lineTo(-width/2, -height/2);
    graphics.lineTo(-width/2 + size, -height/2);
    graphics.strokePath();
    // Top-right
    graphics.beginPath();
    graphics.moveTo(width/2 - size, -height/2);
    graphics.lineTo(width/2, -height/2);
    graphics.lineTo(width/2, -height/2 + size);
    graphics.strokePath();
    // Bottom-left
    graphics.beginPath();
    graphics.moveTo(-width/2, height/2 - size);
    graphics.lineTo(-width/2, height/2);
    graphics.lineTo(-width/2 + size, height/2);
    graphics.strokePath();
    // Bottom-right
    graphics.beginPath();
    graphics.moveTo(width/2 - size, height/2);
    graphics.lineTo(width/2, height/2);
    graphics.lineTo(width/2, height/2 - size);
    graphics.strokePath();
  }

  private showHostingUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Overlay background
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setDepth(100);
    overlay.setInteractive();

    // Container for UI elements
    const container = this.add.container(width / 2, height / 2);
    container.setDepth(101);

    // Title
    const title = this.add.text(0, -80, 'HOST CO-OP', {
      fontSize: '24px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ff6600',
    });
    title.setOrigin(0.5);

    // Status text
    const status = this.add.text(0, -30, 'Creating room...', {
      fontSize: '14px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#888888',
    });
    status.setOrigin(0.5);

    // Room code display (initially empty)
    const codeDisplay = this.add.text(0, 20, '', {
      fontSize: '36px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#ffffff',
      letterSpacing: 8,
    });
    codeDisplay.setOrigin(0.5);

    // Cancel button
    const cancelBtn = this.add.text(0, 90, '[ CANCEL ]', {
      fontSize: '14px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#666666',
    });
    cancelBtn.setOrigin(0.5);
    cancelBtn.setInteractive({ useHandCursor: true });

    cancelBtn.on('pointerover', () => cancelBtn.setColor('#ff4444'));
    cancelBtn.on('pointerout', () => cancelBtn.setColor('#666666'));
    cancelBtn.on('pointerdown', () => {
      networkManager.onPeerJoin(() => {}); // Clear callback
      networkManager.disconnect();
      container.destroy();
      overlay.destroy();
    });

    container.add([title, status, codeDisplay, cancelBtn]);

    // Host the game
    networkManager.hostGame().then((code) => {
      // Check if scene/status still exists (scene may have been destroyed)
      if (!status.scene) return;
      status.setText('Waiting for player...');
      codeDisplay.setText(code);

      // Listen for peer join
      networkManager.onPeerJoin(() => {
        // Check if scene/status still exists
        if (!status.scene) return;
        status.setText('Player connected!');
        networkManager.onPeerJoin(() => {}); // Clear callback after use
        this.time.delayedCall(500, () => {
          if (!container.scene) return;
          container.destroy();
          overlay.destroy();
          this.cameras.main.fade(800, 0, 0, 0, false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
            if (progress === 1) {
              this.scene.start('HubScene');
            }
          });
        });
      });
    }).catch(() => {
      // Check if scene/status still exists
      if (!status.scene) return;
      status.setText('Failed to create room');
      status.setColor('#ff4444');
    });
  }

  private showJoinUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Overlay background
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setDepth(100);
    overlay.setInteractive();

    // Container for UI elements
    const container = this.add.container(width / 2, height / 2);
    container.setDepth(101);

    // Title
    const title = this.add.text(0, -80, 'JOIN CO-OP', {
      fontSize: '24px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ff6600',
    });
    title.setOrigin(0.5);

    // Instructions
    const instructions = this.add.text(0, -30, 'Enter room code:', {
      fontSize: '14px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#888888',
    });
    instructions.setOrigin(0.5);

    // Code input display
    let enteredCode = '';
    const codeInput = this.add.text(0, 20, '______', {
      fontSize: '36px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#ffffff',
      letterSpacing: 8,
    });
    codeInput.setOrigin(0.5);

    // Status text (for errors/connecting)
    const status = this.add.text(0, 60, '', {
      fontSize: '12px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#888888',
    });
    status.setOrigin(0.5);

    // Cancel button
    const cancelBtn = this.add.text(0, 100, '[ CANCEL ]', {
      fontSize: '14px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#666666',
    });
    cancelBtn.setOrigin(0.5);
    cancelBtn.setInteractive({ useHandCursor: true });

    container.add([title, instructions, codeInput, status, cancelBtn]);

    // Update display helper
    const updateDisplay = () => {
      const display = enteredCode.padEnd(6, '_');
      codeInput.setText(display);
    };

    // Keyboard handler
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        networkManager.disconnect();
        this.input.keyboard?.off('keydown', handleKeydown);
        container.destroy();
        overlay.destroy();
        return;
      }

      if (event.key === 'Backspace') {
        enteredCode = enteredCode.slice(0, -1);
        updateDisplay();
        return;
      }

      // Only accept A-Z and 0-9
      const key = event.key.toUpperCase();
      if (/^[A-Z0-9]$/.test(key) && enteredCode.length < 6) {
        enteredCode += key;
        updateDisplay();

        // Auto-join when 6 characters entered
        if (enteredCode.length === 6) {
          status.setText('Connecting...');
          status.setColor('#888888');
          this.input.keyboard?.off('keydown', handleKeydown);

          networkManager.joinGame(enteredCode).then(() => {
            // Check if scene/status still exists (scene may have been destroyed)
            if (!status.scene) return;
            status.setText('Connected!');
            status.setColor('#44ff44');
            this.time.delayedCall(500, () => {
              if (!container.scene) return;
              container.destroy();
              overlay.destroy();
              this.cameras.main.fade(800, 0, 0, 0, false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
                if (progress === 1) {
                  this.scene.start('HubScene');
                }
              });
            });
          }).catch((error: Error) => {
            // Check if scene/status still exists (scene may have been destroyed)
            if (!status.scene) return;
            status.setText(error.message === 'Connection timeout' ? 'Connection timeout' : 'Failed to connect');
            status.setColor('#ff4444');
            enteredCode = '';
            updateDisplay();
            // Re-enable keyboard
            this.input.keyboard?.on('keydown', handleKeydown);
          });
        }
      }
    };

    this.input.keyboard?.on('keydown', handleKeydown);

    // Set up cancel button handlers (after handleKeydown is defined)
    cancelBtn.on('pointerover', () => cancelBtn.setColor('#ff4444'));
    cancelBtn.on('pointerout', () => cancelBtn.setColor('#666666'));
    cancelBtn.on('pointerdown', () => {
      networkManager.disconnect();
      this.input.keyboard?.off('keydown', handleKeydown);
      container.destroy();
      overlay.destroy();
    });
  }

  private transitionToGame(isContinue: boolean, saveInfo?: ReturnType<typeof SaveSystem.getSaveInfo>): void {
    // Screen fade with ember burst
    this.cameras.main.fade(800, 0, 0, 0, false, (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1) {
        if (isContinue && saveInfo) {
          if (saveInfo.activeWorld && saveInfo.activeFloor) {
            this.registry.set('currentWorld', saveInfo.activeWorld);
            this.registry.set('floor', saveInfo.activeFloor);
            this.scene.start('GameScene');
          } else {
            this.scene.start('HubScene');
          }
        } else {
          SaveSystem.deleteSave();
          this.scene.start('HubScene');
        }
      }
    });
  }

  shutdown(): void {
    // Clean up all infinite tweens (ember particles, wisps, etc.)
    this.tweens.killAll();

    // Clean up keyboard listeners if any were added
    this.input.keyboard?.removeAllListeners();
  }
}
