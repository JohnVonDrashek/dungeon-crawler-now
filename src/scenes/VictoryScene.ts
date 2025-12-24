import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';

interface GameStats {
  floor: number;
  level: number;
  enemiesKilled: number;
  itemsCollected: number;
}

export class VictoryScene extends Phaser.Scene {
  private stats: GameStats = {
    floor: 20,
    level: 1,
    enemiesKilled: 0,
    itemsCollected: 0,
  };

  constructor() {
    super({ key: 'VictoryScene' });
  }

  init(data: GameStats): void {
    this.stats = data || this.stats;
  }

  create(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Golden background gradient effect
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Particles for celebration
    this.createParticles();

    // Victory title
    const title = this.add.text(width / 2, height * 0.18, 'VICTORY!', {
      fontSize: '72px',
      fontFamily: 'monospace',
      color: '#fbbf24',
      stroke: '#000000',
      strokeThickness: 6,
    });
    title.setOrigin(0.5);

    // Victory message
    const message = this.add.text(width / 2, height * 0.32,
      'You have completed the purification\nand overcome the final trial!', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#e5e7eb',
      align: 'center',
    });
    message.setOrigin(0.5);

    // Stats box
    const statsBox = this.add.rectangle(width / 2, height * 0.54, 320, 200, 0x1f2937);
    statsBox.setStrokeStyle(3, 0xfbbf24);

    const statsTitle = this.add.text(width / 2, height * 0.43, "- Soul's Journey -", {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: '#fbbf24',
    });
    statsTitle.setOrigin(0.5);

    const statsText = this.add.text(width / 2, height * 0.55, [
      `Stages Cleared: ${this.stats.floor}`,
      `Final Level: ${this.stats.level}`,
      `Trials Overcome: ${this.stats.enemiesKilled}`,
      `Treasures Found: ${this.stats.itemsCollected}`,
    ].join('\n'), {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#e5e7eb',
      align: 'center',
      lineSpacing: 10,
    });
    statsText.setOrigin(0.5);

    // Play again button
    this.createButton(width / 2, height * 0.78, 'Play Again', () => {
      SaveSystem.deleteSave();
      this.registry.set('floor', 1);
      this.scene.start('GameScene');
    });

    this.createButton(width / 2, height * 0.88, 'Main Menu', () => {
      this.scene.start('MenuScene');
    });

    // Fade in
    this.cameras.main.fadeIn(1000);

    // Delete save since game is complete
    SaveSystem.deleteSave();
  }

  private createParticles(): void {
    const width = this.cameras.main.width;

    // Create simple particle effect using graphics
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(-50, -10);
      const size = Phaser.Math.Between(2, 6);
      const color = Phaser.Math.RND.pick([0xfbbf24, 0xf59e0b, 0xfcd34d, 0xfef3c7]);

      const particle = this.add.circle(x, y, size, color);

      this.tweens.add({
        targets: particle,
        y: this.cameras.main.height + 50,
        x: x + Phaser.Math.Between(-100, 100),
        alpha: 0,
        duration: Phaser.Math.Between(3000, 6000),
        delay: Phaser.Math.Between(0, 2000),
        repeat: -1,
        onRepeat: () => {
          particle.x = Phaser.Math.Between(0, width);
          particle.y = -10;
          particle.alpha = 1;
        },
      });
    }
  }

  private createButton(x: number, y: number, text: string, callback: () => void): void {
    const bg = this.add.rectangle(x, y, 180, 45, 0x374151);
    bg.setStrokeStyle(2, 0xfbbf24);

    const label = this.add.text(x, y, text, {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    label.setOrigin(0.5);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      bg.setFillStyle(0x4b5563);
      bg.setStrokeStyle(2, 0xfcd34d);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0x374151);
      bg.setStrokeStyle(2, 0xfbbf24);
    });

    bg.on('pointerdown', callback);
  }
}
