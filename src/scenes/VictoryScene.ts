import Phaser from 'phaser';
import { SaveSystem } from '../systems/SaveSystem';

interface GameStats {
  floor: number;
  level: number;
  enemiesKilled: number;
  itemsCollected: number;
  allWorldsComplete?: boolean;
}

export class VictoryScene extends Phaser.Scene {
  private stats: GameStats = {
    floor: 20,
    level: 1,
    enemiesKilled: 0,
    itemsCollected: 0,
    allWorldsComplete: false,
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
    const isWorldVictory = this.stats.allWorldsComplete;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Particles for celebration
    this.createParticles(isWorldVictory);

    // Victory title
    const titleText = isWorldVictory ? 'ASCENSION!' : 'VICTORY!';
    const titleColor = isWorldVictory ? '#ffd700' : '#fbbf24';
    const title = this.add.text(width / 2, height * 0.15, titleText, {
      fontSize: '72px',
      fontFamily: 'monospace',
      color: titleColor,
      stroke: '#000000',
      strokeThickness: 6,
    });
    title.setOrigin(0.5);

    // Animate title for world victory
    if (isWorldVictory) {
      this.tweens.add({
        targets: title,
        scale: { from: 1, to: 1.05 },
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    // Victory message
    let messageText: string;
    if (isWorldVictory) {
      messageText = 'You have conquered all Seven Deadly Sins\nand purified your soul!';
    } else {
      messageText = 'You have completed the purification\nand overcome the final trial!';
    }
    const message = this.add.text(width / 2, height * 0.30, messageText, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#e5e7eb',
      align: 'center',
    });
    message.setOrigin(0.5);

    // List of conquered sins for world victory
    if (isWorldVictory) {
      const sins = [
        'Pride', 'Greed', 'Wrath', 'Sloth', 'Envy', 'Gluttony', 'Lust'
      ];
      const sinsText = this.add.text(width / 2, height * 0.42, sins.join('  ·  '), {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#fbbf24',
        align: 'center',
      });
      sinsText.setOrigin(0.5);
    }

    // Stats box
    const statsBoxY = isWorldVictory ? height * 0.58 : height * 0.54;
    const statsBox = this.add.rectangle(width / 2, statsBoxY, 320, 200, 0x1f2937);
    statsBox.setStrokeStyle(3, isWorldVictory ? 0xffd700 : 0xfbbf24);

    const statsTitleText = isWorldVictory ? "- Redeemed Soul -" : "- Soul's Journey -";
    const statsTitle = this.add.text(width / 2, statsBoxY - 55, statsTitleText, {
      fontSize: '22px',
      fontFamily: 'monospace',
      color: isWorldVictory ? '#ffd700' : '#fbbf24',
    });
    statsTitle.setOrigin(0.5);

    const stageLabel = isWorldVictory ? 'Floors Conquered' : 'Stages Cleared';
    const statsText = this.add.text(width / 2, statsBoxY + 5, [
      `${stageLabel}: ${this.stats.floor}`,
      `Final Level: ${this.stats.level}`,
      `Sins Vanquished: ${this.stats.enemiesKilled}`,
      `Treasures Found: ${this.stats.itemsCollected}`,
    ].join('\n'), {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#e5e7eb',
      align: 'center',
      lineSpacing: 10,
    });
    statsText.setOrigin(0.5);

    // Buttons
    const buttonY1 = isWorldVictory ? height * 0.82 : height * 0.78;
    const buttonY2 = isWorldVictory ? height * 0.92 : height * 0.88;

    this.createButton(width / 2, buttonY1, 'New Journey', () => {
      SaveSystem.deleteSave();
      this.registry.set('floor', 1);
      this.registry.remove('currentWorld');
      this.scene.start('HubScene');
    });

    this.createButton(width / 2, buttonY2, 'Main Menu', () => {
      this.scene.start('MenuScene');
    });

    // Fade in
    this.cameras.main.fadeIn(1000);

    // Delete save since game is complete
    SaveSystem.deleteSave();
  }

  private createParticles(isWorldVictory?: boolean): void {
    const width = this.cameras.main.width;

    // Different colors for world victory (more golden/white) vs regular (amber)
    const colors = isWorldVictory
      ? [0xffd700, 0xffffff, 0xfef3c7, 0xfbbf24, 0xf0e68c]
      : [0xfbbf24, 0xf59e0b, 0xfcd34d, 0xfef3c7];

    const particleCount = isWorldVictory ? 50 : 30;

    // Create simple particle effect using graphics
    for (let i = 0; i < particleCount; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(-50, -10);
      const size = Phaser.Math.Between(2, isWorldVictory ? 8 : 6);
      const color = Phaser.Math.RND.pick(colors);

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
