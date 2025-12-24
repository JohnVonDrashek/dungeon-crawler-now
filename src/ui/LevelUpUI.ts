import Phaser from 'phaser';
import { Player } from '../entities/Player';

export class LevelUpUI {
  private scene: Phaser.Scene;
  private player: Player;
  private container: Phaser.GameObjects.Container | null = null;
  private isVisible: boolean = false;
  private statButtons: { btn: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text }[] = [];

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
  }

  show(): void {
    if (this.container) {
      this.container.destroy();
    }

    this.isVisible = true;
    this.statButtons = [];

    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    this.container = this.scene.add.container(centerX, centerY);
    this.container.setDepth(250);

    // Background overlay
    const overlay = this.scene.add.rectangle(0, 0, cam.width * 2, cam.height * 2, 0x000000, 0.7);
    this.container.add(overlay);

    // Panel - taller to fit stats
    const panel = this.scene.add.rectangle(0, 0, 340, 360, 0x1f2937);
    panel.setStrokeStyle(3, 0x8b5cf6);
    this.container.add(panel);

    // Close button
    const closeBtn = this.scene.add.text(150, -160, 'X', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#9ca3af',
      fontStyle: 'bold',
    });
    closeBtn.setOrigin(0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#9ca3af'));
    closeBtn.on('pointerdown', () => this.hide());
    this.container.add(closeBtn);

    // Title
    const hasPoints = this.player.statPoints > 0;
    const title = this.scene.add.text(0, -140, hasPoints ? 'LEVEL UP!' : 'CHARACTER', {
      fontSize: '28px',
      fontFamily: 'monospace',
      color: hasPoints ? '#fbbf24' : '#8b5cf6',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    this.container.add(title);

    // Level info
    const levelText = this.scene.add.text(0, -105, `Level ${this.player.level}`, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#e5e7eb',
    });
    levelText.setOrigin(0.5);
    this.container.add(levelText);

    // Current stats display - individual elements for highlighting
    const statsY = -75;
    const statStyle = { fontSize: '14px', fontFamily: 'monospace', color: '#9ca3af' };

    const hpStat = this.scene.add.text(0, statsY, `HP: ${this.player.hp}/${this.player.maxHp}`, statStyle);
    hpStat.setOrigin(0.5);

    const row2Y = statsY + 18;
    const atkStat = this.scene.add.text(-80, row2Y, `ATK: ${this.player.attack}`, statStyle);
    atkStat.setOrigin(0.5);

    const defStat = this.scene.add.text(0, row2Y, `DEF: ${this.player.defense}`, statStyle);
    defStat.setOrigin(0.5);

    const spdStat = this.scene.add.text(80, row2Y, `SPD: ${Math.floor(this.player.speed)}`, statStyle);
    spdStat.setOrigin(0.5);

    const statTextMap = {
      hp: hpStat,
      attack: atkStat,
      defense: defStat,
      speed: spdStat,
    };

    this.container.add([hpStat, atkStat, defStat, spdStat]);

    // Points remaining
    const pointsText = this.scene.add.text(0, -25,
      hasPoints ? `Stat Points: ${this.player.statPoints}` : 'No stat points available', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: hasPoints ? '#8b5cf6' : '#6b7280',
    });
    pointsText.setOrigin(0.5);
    this.container.add(pointsText);

    // Stat buttons
    const stats: { key: 'hp' | 'attack' | 'defense' | 'speed'; label: string; desc: string }[] = [
      { key: 'hp', label: 'HP', desc: '+10 Max HP' },
      { key: 'attack', label: 'ATK', desc: '+2 Attack' },
      { key: 'defense', label: 'DEF', desc: '+1 Defense' },
      { key: 'speed', label: 'SPD', desc: '+10 Speed' },
    ];

    stats.forEach((stat, index) => {
      const y = 15 + index * 42;
      this.createStatButton(-100, y, stat.key, stat.label, stat.desc, pointsText, statTextMap);
    });

    // Animate in
    this.container.setScale(0.8);
    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private createStatButton(
    x: number,
    y: number,
    stat: 'hp' | 'attack' | 'defense' | 'speed',
    label: string,
    desc: string,
    pointsText: Phaser.GameObjects.Text,
    statTextMap: Record<'hp' | 'attack' | 'defense' | 'speed', Phaser.GameObjects.Text>
  ): void {
    if (!this.container) return;

    const hasPoints = this.player.statPoints > 0;
    const btnColor = hasPoints ? 0x374151 : 0x1f2937;
    const borderColor = hasPoints ? 0x6b7280 : 0x374151;

    const btn = this.scene.add.rectangle(x, y, 60, 32, btnColor);
    btn.setStrokeStyle(2, borderColor);

    const btnLabel = this.scene.add.text(x, y, label, {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: hasPoints ? '#ffffff' : '#6b7280',
      fontStyle: 'bold',
    });
    btnLabel.setOrigin(0.5);

    const descText = this.scene.add.text(x + 90, y, desc, {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: '#9ca3af',
    });
    descText.setOrigin(0, 0.5);

    this.container.add([btn, btnLabel, descText]);
    this.statButtons.push({ btn, label: btnLabel });

    if (hasPoints) {
      btn.setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => {
        if (this.player.statPoints > 0) {
          btn.setFillStyle(0x4b5563);
          btn.setStrokeStyle(2, 0x8b5cf6);
        }
      });

      btn.on('pointerout', () => {
        if (this.player.statPoints > 0) {
          btn.setFillStyle(0x374151);
          btn.setStrokeStyle(2, 0x6b7280);
        }
      });

      btn.on('pointerdown', () => {
        if (this.player.allocateStat(stat)) {
          // Update points text
          if (this.player.statPoints > 0) {
            pointsText.setText(`Stat Points: ${this.player.statPoints}`);
          } else {
            pointsText.setText('No stat points available');
            pointsText.setColor('#6b7280');
          }

          // Update all stat displays
          statTextMap.hp.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
          statTextMap.attack.setText(`ATK: ${this.player.attack}`);
          statTextMap.defense.setText(`DEF: ${this.player.defense}`);
          statTextMap.speed.setText(`SPD: ${Math.floor(this.player.speed)}`);

          // Highlight only the stat that changed
          const targetText = statTextMap[stat];
          targetText.setColor('#22cc22');
          this.scene.time.delayedCall(400, () => {
            targetText.setColor('#9ca3af');
          });

          // Disable ALL buttons if no more points
          if (this.player.statPoints <= 0) {
            this.disableAllButtons();
          }
        }
      });
    }
  }

  private disableAllButtons(): void {
    for (const { btn, label } of this.statButtons) {
      btn.disableInteractive();
      btn.setFillStyle(0x1f2937);
      btn.setStrokeStyle(2, 0x374151);
      label.setColor('#6b7280');
    }
  }

  hide(): void {
    if (!this.container) return;

    this.scene.tweens.add({
      targets: this.container,
      scale: 0.8,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        if (this.container) {
          this.container.destroy();
          this.container = null;
        }
        this.isVisible = false;
      },
    });
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }
}
