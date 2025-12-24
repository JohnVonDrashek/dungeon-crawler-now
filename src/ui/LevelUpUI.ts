import Phaser from 'phaser';
import { Player } from '../entities/Player';

interface StatButtonData {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  stat: 'hp' | 'attack' | 'defense' | 'speed';
}

export class LevelUpUI {
  private scene: Phaser.Scene;
  private player: Player;
  private panel: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isVisible: boolean = false;

  private pointsLabel: Phaser.GameObjects.Text | null = null;
  private statLabels: Record<string, Phaser.GameObjects.Text> = {};
  private statButtons: StatButtonData[] = [];
  private keyListener: ((event: KeyboardEvent) => void) | null = null;

  // Styling constants
  private readonly PANEL_WIDTH = 340;
  private readonly PANEL_HEIGHT = 400;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
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
    this.statButtons = [];
    this.statLabels = {};

    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    // Background overlay - start transparent for fade-in
    this.overlay = this.scene.add.rectangle(centerX, centerY, cam.width * 2, cam.height * 2, 0x000000, 0);
    this.overlay.setDepth(249);

    // Create main panel off-screen for slide-in animation
    this.panel = this.scene.add.container(centerX, centerY + cam.height);
    this.panel.setDepth(250);
    this.panel.setAlpha(0);

    this.createPanel();
    this.setupInput();

    // Animate overlay fade and panel slide-in
    this.scene.tweens.add({
      targets: this.overlay,
      fillAlpha: 0.8,
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
  }

  private createPanel(): void {
    if (!this.panel) return;

    const halfW = this.PANEL_WIDTH / 2;
    const halfH = this.PANEL_HEIGHT / 2;
    const hasPoints = this.player.statPoints > 0;

    // Main background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a0a, 0.95);
    bg.fillRoundedRect(-halfW, -halfH, this.PANEL_WIDTH, this.PANEL_HEIGHT, 8);
    bg.lineStyle(hasPoints ? 2 : 1, hasPoints ? 0x8b5cf6 : 0x444444, 0.9);
    bg.strokeRoundedRect(-halfW, -halfH, this.PANEL_WIDTH, this.PANEL_HEIGHT, 8);
    this.panel.add(bg);

    // Corner accents (purple for level up, orange otherwise)
    this.drawCornerAccents(halfW, halfH, hasPoints ? 0x8b5cf6 : 0xff6600);

    // Header
    this.createHeader(halfW, halfH, hasPoints);

    // Level display
    this.createLevelDisplay(halfH);

    // Stats display
    this.createStatsDisplay(halfH);

    // Points remaining
    this.createPointsDisplay(halfH, hasPoints);

    // Stat allocation buttons
    this.createStatButtons(halfH, hasPoints);

    // Done button
    this.createDoneButton(halfH);
  }

  private drawCornerAccents(halfW: number, halfH: number, color: number): void {
    if (!this.panel) return;

    const corners = this.scene.add.graphics();
    corners.lineStyle(2, color, 0.9);
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

  private createHeader(halfW: number, halfH: number, hasPoints: boolean): void {
    if (!this.panel) return;

    // Header background
    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(0x1a1a1a, 0.8);
    headerBg.fillRect(-halfW + 15, -halfH + 15, this.PANEL_WIDTH - 30, 40);
    this.panel.add(headerBg);

    // Title accent
    const accent = this.scene.add.text(-halfW + 25, -halfH + 35, hasPoints ? '★' : '◆', {
      fontSize: '14px',
      color: hasPoints ? '#fbbf24' : '#ff6600',
    });
    accent.setOrigin(0, 0.5);
    this.panel.add(accent);

    // Title
    const title = this.scene.add.text(-halfW + 45, -halfH + 35, hasPoints ? 'LEVEL UP!' : 'CHARACTER', {
      fontSize: '18px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: hasPoints ? '#fbbf24' : '#ffffff',
    });
    title.setOrigin(0, 0.5);
    this.panel.add(title);

    // Close button
    const closeBtn = this.scene.add.text(halfW - 35, -halfH + 35, '✕', {
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

  private createLevelDisplay(halfH: number): void {
    if (!this.panel) return;

    const levelText = this.scene.add.text(0, -halfH + 75, `Level ${this.player.level}`, {
      fontSize: '22px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ffffff',
    });
    levelText.setOrigin(0.5, 0.5);
    this.panel.add(levelText);

    // XP bar background
    const barWidth = 200;
    const barHeight = 8;
    const barY = -halfH + 98;

    const xpBarBg = this.scene.add.graphics();
    xpBarBg.fillStyle(0x1a1a1a, 1);
    xpBarBg.fillRoundedRect(-barWidth / 2, barY - barHeight / 2, barWidth, barHeight, 2);
    xpBarBg.lineStyle(1, 0x333333, 1);
    xpBarBg.strokeRoundedRect(-barWidth / 2, barY - barHeight / 2, barWidth, barHeight, 2);
    this.panel.add(xpBarBg);

    // XP bar fill
    const xpPercent = this.player.xpToNextLevel > 0 ? this.player.xp / this.player.xpToNextLevel : 0;
    const fillWidth = Math.max(2, barWidth * xpPercent);

    const xpBarFill = this.scene.add.graphics();
    xpBarFill.fillStyle(0x8b5cf6, 1);
    xpBarFill.fillRoundedRect(-barWidth / 2, barY - barHeight / 2, fillWidth, barHeight, 2);
    this.panel.add(xpBarFill);

    // XP text
    const xpText = this.scene.add.text(0, barY + 14, `${this.player.xp} / ${this.player.xpToNextLevel} XP`, {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#888888',
    });
    xpText.setOrigin(0.5, 0.5);
    this.panel.add(xpText);
  }

  private createStatsDisplay(halfH: number): void {
    if (!this.panel) return;

    const startY = -halfH + 140;
    const statStyle = {
      fontSize: '12px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#aaaaaa',
    };

    // HP
    const hpLabel = this.scene.add.text(0, startY, `HP: ${this.player.hp}/${this.player.maxHp}`, statStyle);
    hpLabel.setOrigin(0.5, 0.5);
    this.panel.add(hpLabel);
    this.statLabels['hp'] = hpLabel;

    // ATK / DEF / SPD in a row
    const statsY = startY + 22;
    const spacing = 70;

    const atkLabel = this.scene.add.text(-spacing, statsY, `ATK: ${this.player.attack}`, statStyle);
    atkLabel.setOrigin(0.5, 0.5);
    this.panel.add(atkLabel);
    this.statLabels['attack'] = atkLabel;

    const defLabel = this.scene.add.text(0, statsY, `DEF: ${this.player.defense}`, statStyle);
    defLabel.setOrigin(0.5, 0.5);
    this.panel.add(defLabel);
    this.statLabels['defense'] = defLabel;

    const spdLabel = this.scene.add.text(spacing, statsY, `SPD: ${Math.floor(this.player.speed)}`, statStyle);
    spdLabel.setOrigin(0.5, 0.5);
    this.panel.add(spdLabel);
    this.statLabels['speed'] = spdLabel;
  }

  private createPointsDisplay(halfH: number, hasPoints: boolean): void {
    if (!this.panel) return;

    this.pointsLabel = this.scene.add.text(0, -halfH + 195, `Stat Points: ${this.player.statPoints}`, {
      fontSize: '14px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: hasPoints ? '#8b5cf6' : '#666666',
    });
    this.pointsLabel.setOrigin(0.5, 0.5);
    this.panel.add(this.pointsLabel);
  }

  private createStatButtons(halfH: number, hasPoints: boolean): void {
    if (!this.panel) return;

    const stats: { key: 'hp' | 'attack' | 'defense' | 'speed'; label: string; desc: string }[] = [
      { key: 'hp', label: 'HP', desc: '+10 Max HP' },
      { key: 'attack', label: 'ATK', desc: '+2 Attack' },
      { key: 'defense', label: 'DEF', desc: '+1 Defense' },
      { key: 'speed', label: 'SPD', desc: '+10 Speed' },
    ];

    const startY = -halfH + 220;
    const rowHeight = 32;

    for (let i = 0; i < stats.length; i++) {
      const stat = stats[i];
      const y = startY + i * rowHeight;
      this.createStatButton(stat.key, stat.label, stat.desc, y, hasPoints);
    }
  }

  private createStatButton(
    stat: 'hp' | 'attack' | 'defense' | 'speed',
    label: string,
    desc: string,
    y: number,
    hasPoints: boolean
  ): void {
    if (!this.panel) return;

    const container = this.scene.add.container(0, y);

    const btnWidth = 55;
    const btnHeight = 28;

    // Button background
    const bg = this.scene.add.graphics();
    bg.fillStyle(hasPoints ? 0x2a2a2a : 0x1a1a1a, 0.9);
    bg.fillRoundedRect(-120, -btnHeight / 2, btnWidth, btnHeight, 4);
    bg.lineStyle(1, hasPoints ? 0x666666 : 0x333333, 0.8);
    bg.strokeRoundedRect(-120, -btnHeight / 2, btnWidth, btnHeight, 4);
    container.add(bg);

    // Button label
    const btnLabel = this.scene.add.text(-120 + btnWidth / 2, 0, label, {
      fontSize: '12px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: hasPoints ? '#ffffff' : '#666666',
    });
    btnLabel.setOrigin(0.5, 0.5);
    container.add(btnLabel);

    // Description text
    const descText = this.scene.add.text(-50, 0, desc, {
      fontSize: '11px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#888888',
    });
    descText.setOrigin(0, 0.5);
    container.add(descText);

    // Plus indicator
    const plusText = this.scene.add.text(110, 0, hasPoints ? '+' : '', {
      fontSize: '16px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#8b5cf6',
    });
    plusText.setOrigin(0.5, 0.5);
    container.add(plusText);

    // Store button data
    const buttonData: StatButtonData = { container, bg, label: btnLabel, stat };
    this.statButtons.push(buttonData);

    // Interactive hit area
    if (hasPoints) {
      const hitArea = this.scene.add.rectangle(-120 + btnWidth / 2, 0, btnWidth, btnHeight, 0xffffff, 0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerover', () => {
        if (this.player.statPoints > 0) {
          bg.clear();
          bg.fillStyle(0x3a3a3a, 0.9);
          bg.fillRoundedRect(-120, -btnHeight / 2, btnWidth, btnHeight, 4);
          bg.lineStyle(2, 0x8b5cf6, 1);
          bg.strokeRoundedRect(-120, -btnHeight / 2, btnWidth, btnHeight, 4);
        }
      });
      hitArea.on('pointerout', () => {
        const hasP = this.player.statPoints > 0;
        bg.clear();
        bg.fillStyle(hasP ? 0x2a2a2a : 0x1a1a1a, 0.9);
        bg.fillRoundedRect(-120, -btnHeight / 2, btnWidth, btnHeight, 4);
        bg.lineStyle(1, hasP ? 0x666666 : 0x333333, 0.8);
        bg.strokeRoundedRect(-120, -btnHeight / 2, btnWidth, btnHeight, 4);
      });
      hitArea.on('pointerdown', () => {
        if (this.player.allocateStat(stat)) {
          this.updateDisplay(stat);
        }
      });
      container.add(hitArea);
    }

    this.panel.add(container);
  }

  private createDoneButton(halfH: number): void {
    if (!this.panel) return;

    const btnWidth = 120;
    const btnHeight = 32;
    const y = halfH - 30;

    const container = this.scene.add.container(0, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a4a1a, 0.9);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
    bg.lineStyle(1, 0x44aa44, 0.6);
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

    const text = this.scene.add.text(0, 0, 'DONE', {
      fontSize: '13px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#ffffff',
    });
    text.setOrigin(0.5, 0.5);
    container.add(text);

    const hitArea = this.scene.add.rectangle(0, 0, btnWidth, btnHeight, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x2a5a2a, 0.9);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
      bg.lineStyle(1, 0x66cc66, 0.8);
      bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
    });
    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x1a4a1a, 0.9);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
      bg.lineStyle(1, 0x44aa44, 0.6);
      bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, 4);
    });
    hitArea.on('pointerdown', () => this.hide());
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

  private updateDisplay(changedStat: string): void {
    // Update points text
    if (this.pointsLabel) {
      this.pointsLabel.setText(`Stat Points: ${this.player.statPoints}`);
      if (this.player.statPoints <= 0) {
        this.pointsLabel.setColor('#666666');
      }
    }

    // Update all stat displays
    if (this.statLabels['hp']) {
      this.statLabels['hp'].setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
    }
    if (this.statLabels['attack']) {
      this.statLabels['attack'].setText(`ATK: ${this.player.attack}`);
    }
    if (this.statLabels['defense']) {
      this.statLabels['defense'].setText(`DEF: ${this.player.defense}`);
    }
    if (this.statLabels['speed']) {
      this.statLabels['speed'].setText(`SPD: ${Math.floor(this.player.speed)}`);
    }

    // Highlight the changed stat
    const targetText = this.statLabels[changedStat];
    if (targetText) {
      targetText.setColor('#44ff44');
      this.scene.time.delayedCall(400, () => {
        targetText.setColor('#aaaaaa');
      });
    }

    // Disable all buttons if no more points
    if (this.player.statPoints <= 0) {
      this.disableAllButtons();
    }
  }

  private disableAllButtons(): void {
    for (const { bg, label } of this.statButtons) {
      bg.clear();
      bg.fillStyle(0x1a1a1a, 0.9);
      bg.fillRoundedRect(-120, -14, 55, 28, 4);
      bg.lineStyle(1, 0x333333, 0.8);
      bg.strokeRoundedRect(-120, -14, 55, 28, 4);
      label.setColor('#666666');
    }
  }

  hide(): void {
    if (!this.panel) return;

    if (this.keyListener) {
      this.scene.input.keyboard?.off('keydown', this.keyListener);
      this.keyListener = null;
    }

    this.scene.tweens.add({
      targets: this.panel,
      scale: 0.8,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        if (this.panel) {
          this.panel.destroy();
          this.panel = null;
        }
        if (this.overlay) {
          this.overlay.destroy();
          this.overlay = null;
        }
        this.isVisible = false;
        this.statButtons = [];
        this.statLabels = {};
        this.pointsLabel = null;
      },
    });
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }
}
