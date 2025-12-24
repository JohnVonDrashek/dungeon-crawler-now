import Phaser from 'phaser';

interface GameStats {
  floor: number;
  level: number;
  enemiesKilled: number;
  itemsCollected: number;
}

export class GameOverScene extends Phaser.Scene {
  private stats: GameStats = {
    floor: 1,
    level: 1,
    enemiesKilled: 0,
    itemsCollected: 0,
  };

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: GameStats): void {
    this.stats = data || this.stats;
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Dark overlay
    this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);

    // Game Over title
    const title = this.add.text(width / 2, height * 0.2, 'GAME OVER', {
      fontSize: '64px',
      fontFamily: 'monospace',
      color: '#ef4444',
      stroke: '#000000',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);

    // Death message
    const deathMsg = this.add.text(width / 2, height * 0.32, 'You have fallen in the dungeon...', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#9ca3af',
    });
    deathMsg.setOrigin(0.5);

    // Stats box
    const statsBox = this.add.rectangle(width / 2, height * 0.52, 300, 180, 0x1f2937);
    statsBox.setStrokeStyle(2, 0x374151);

    const statsTitle = this.add.text(width / 2, height * 0.42, '- Final Stats -', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#8b5cf6',
    });
    statsTitle.setOrigin(0.5);

    const statsText = this.add.text(width / 2, height * 0.52, [
      `Floor Reached: ${this.stats.floor}`,
      `Level: ${this.stats.level}`,
      `Enemies Slain: ${this.stats.enemiesKilled}`,
      `Items Found: ${this.stats.itemsCollected}`,
    ].join('\n'), {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#e5e7eb',
      align: 'center',
      lineSpacing: 8,
    });
    statsText.setOrigin(0.5);

    // Buttons
    this.createButton(width / 2, height * 0.75, 'Try Again', () => {
      this.registry.set('floor', 1);
      this.scene.start('GameScene');
    });

    this.createButton(width / 2, height * 0.85, 'Main Menu', () => {
      this.scene.start('MenuScene');
    });

    // Fade in
    this.cameras.main.fadeIn(500);
  }

  private createButton(x: number, y: number, text: string, callback: () => void): void {
    const bg = this.add.rectangle(x, y, 180, 45, 0x374151);
    bg.setStrokeStyle(2, 0x6b7280);

    const label = this.add.text(x, y, text, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      bg.setFillStyle(0x4b5563);
      bg.setStrokeStyle(2, 0x8b5cf6);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x374151);
      bg.setStrokeStyle(2, 0x6b7280);
    });

    bg.on('pointerdown', callback);
  }
}
