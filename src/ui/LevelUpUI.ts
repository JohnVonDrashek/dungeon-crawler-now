import Phaser from 'phaser';
import { Player } from '../entities/Player';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

interface RexUIScene extends Phaser.Scene {
  rexUI: UIPlugin;
}

export class LevelUpUI {
  private scene: RexUIScene;
  private player: Player;
  private panel: any | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isVisible: boolean = false;

  // References for dynamic updates
  private pointsLabel: Phaser.GameObjects.Text | null = null;
  private statLabels: Record<string, Phaser.GameObjects.Text> = {};
  private statButtons: { sizer: any; btn: any; label: Phaser.GameObjects.Text }[] = [];

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene as RexUIScene;
    this.player = player;
  }

  show(): void {
    // Destroy existing panel if any
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

    // Background overlay
    this.overlay = this.scene.add.rectangle(centerX, centerY, cam.width * 2, cam.height * 2, 0x000000, 0.7);
    this.overlay.setDepth(249);

    const hasPoints = this.player.statPoints > 0;

    // Build panel using rexUI
    this.panel = this.scene.rexUI.add.sizer({
      x: centerX,
      y: centerY,
      orientation: 'y',
      space: { left: 25, right: 25, top: 20, bottom: 25, item: 12 },
    })
      .addBackground(
        this.scene.rexUI.add.roundRectangle(0, 0, 0, 0, 8, 0x1f2937)
          .setStrokeStyle(3, 0x8b5cf6)
      )
      // Header with title and close button
      .add(this.createHeader(hasPoints), { expand: true })
      // Level info
      .add(this.createLevelInfo(), { align: 'center' })
      // Current stats
      .add(this.createStatsDisplay(), { align: 'center' })
      // Points remaining
      .add(this.createPointsLabel(hasPoints), { align: 'center' })
      // Stat allocation buttons
      .add(this.createStatButtons(), { expand: true })
      .layout();

    this.panel.setDepth(250);

    // Animate in
    this.panel.setScale(0.8);
    this.panel.setAlpha(0);
    this.scene.tweens.add({
      targets: this.panel,
      scale: 1,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private createHeader(hasPoints: boolean): any {
    const title = this.scene.add.text(0, 0, hasPoints ? 'LEVEL UP!' : 'CHARACTER', {
      fontSize: '26px',
      fontFamily: 'monospace',
      color: hasPoints ? '#fbbf24' : '#8b5cf6',
      fontStyle: 'bold',
    });

    const closeBtn = this.scene.add.text(0, 0, 'X', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#9ca3af',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#9ca3af'));
    closeBtn.on('pointerdown', () => this.hide());

    return this.scene.rexUI.add.sizer({ orientation: 'x' })
      .add(title, { align: 'left' })
      .addSpace()
      .add(closeBtn, { align: 'right' });
  }

  private createLevelInfo(): Phaser.GameObjects.Text {
    return this.scene.add.text(0, 0, `Level ${this.player.level}`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#e5e7eb',
    });
  }

  private createStatsDisplay(): any {
    const statStyle = { fontSize: '13px', fontFamily: 'monospace', color: '#9ca3af' };

    const hpLabel = this.scene.add.text(0, 0, `HP: ${this.player.hp}/${this.player.maxHp}`, statStyle);
    const atkLabel = this.scene.add.text(0, 0, `ATK: ${this.player.attack}`, statStyle);
    const defLabel = this.scene.add.text(0, 0, `DEF: ${this.player.defense}`, statStyle);
    const spdLabel = this.scene.add.text(0, 0, `SPD: ${Math.floor(this.player.speed)}`, statStyle);

    this.statLabels = { hp: hpLabel, attack: atkLabel, defense: defLabel, speed: spdLabel };

    return this.scene.rexUI.add.sizer({
      orientation: 'y',
      space: { item: 4 },
    })
      .add(hpLabel, { align: 'center' })
      .add(
        this.scene.rexUI.add.sizer({ orientation: 'x', space: { item: 20 } })
          .add(atkLabel)
          .add(defLabel)
          .add(spdLabel),
        { align: 'center' }
      );
  }

  private createPointsLabel(hasPoints: boolean): Phaser.GameObjects.Text {
    this.pointsLabel = this.scene.add.text(0, 0,
      hasPoints ? `Stat Points: ${this.player.statPoints}` : 'Stat Points: 0', {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: hasPoints ? '#8b5cf6' : '#6b7280',
      });
    return this.pointsLabel;
  }

  private createStatButtons(): any {
    const stats: { key: 'hp' | 'attack' | 'defense' | 'speed'; label: string; desc: string }[] = [
      { key: 'hp', label: 'HP', desc: '+10 Max HP' },
      { key: 'attack', label: 'ATK', desc: '+2 Attack' },
      { key: 'defense', label: 'DEF', desc: '+1 Defense' },
      { key: 'speed', label: 'SPD', desc: '+10 Speed' },
    ];

    const sizer = this.scene.rexUI.add.sizer({
      orientation: 'y',
      space: { item: 8 },
    });

    for (const stat of stats) {
      sizer.add(this.createStatButton(stat.key, stat.label, stat.desc), { expand: true });
    }

    return sizer;
  }

  private createStatButton(
    stat: 'hp' | 'attack' | 'defense' | 'speed',
    label: string,
    desc: string
  ): any {
    const hasPoints = this.player.statPoints > 0;
    const btnColor = hasPoints ? 0x374151 : 0x1f2937;
    const borderColor = hasPoints ? 0x6b7280 : 0x374151;

    const btnBg = this.scene.rexUI.add.roundRectangle(0, 0, 55, 28, 4, btnColor)
      .setStrokeStyle(2, borderColor);

    const btnLabel = this.scene.add.text(0, 0, label, {
      fontSize: '13px',
      fontFamily: 'monospace',
      color: hasPoints ? '#ffffff' : '#6b7280',
      fontStyle: 'bold',
    });

    const btn = this.scene.rexUI.add.label({
      background: btnBg,
      text: btnLabel,
      align: 'center',
      space: { left: 10, right: 10, top: 5, bottom: 5 },
    });

    const descText = this.scene.add.text(0, 0, desc, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#9ca3af',
    });

    const rowSizer = this.scene.rexUI.add.sizer({
      orientation: 'x',
      space: { item: 15 },
    })
      .add(btn, { align: 'left' })
      .addSpace()
      .add(descText, { align: 'right' });

    this.statButtons.push({ sizer: rowSizer, btn, label: btnLabel });

    if (hasPoints) {
      btn.setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => {
        if (this.player.statPoints > 0) {
          btnBg.setFillStyle(0x4b5563);
          btnBg.setStrokeStyle(2, 0x8b5cf6);
        }
      });

      btn.on('pointerout', () => {
        if (this.player.statPoints > 0) {
          btnBg.setFillStyle(0x374151);
          btnBg.setStrokeStyle(2, 0x6b7280);
        }
      });

      btn.on('pointerdown', () => {
        if (this.player.allocateStat(stat)) {
          this.updateDisplay(stat);
        }
      });
    }

    return rowSizer;
  }

  private updateDisplay(changedStat: string): void {
    // Update points text
    if (this.pointsLabel) {
      this.pointsLabel.setText(`Stat Points: ${this.player.statPoints}`);
      if (this.player.statPoints <= 0) {
        this.pointsLabel.setColor('#6b7280');
      }
    }

    // Update all stat displays
    if (this.statLabels.hp) {
      this.statLabels.hp.setText(`HP: ${this.player.hp}/${this.player.maxHp}`);
    }
    if (this.statLabels.attack) {
      this.statLabels.attack.setText(`ATK: ${this.player.attack}`);
    }
    if (this.statLabels.defense) {
      this.statLabels.defense.setText(`DEF: ${this.player.defense}`);
    }
    if (this.statLabels.speed) {
      this.statLabels.speed.setText(`SPD: ${Math.floor(this.player.speed)}`);
    }

    // Highlight the changed stat
    const targetText = this.statLabels[changedStat];
    if (targetText) {
      targetText.setColor('#22cc22');
      this.scene.time.delayedCall(400, () => {
        targetText.setColor('#9ca3af');
      });
    }

    // Disable all buttons if no more points
    if (this.player.statPoints <= 0) {
      this.disableAllButtons();
    }
  }

  private disableAllButtons(): void {
    for (const { btn, label } of this.statButtons) {
      btn.disableInteractive();
      const bg = btn.getElement('background');
      if (bg) {
        bg.setFillStyle(0x1f2937);
        bg.setStrokeStyle(2, 0x374151);
      }
      label.setColor('#6b7280');
    }
  }

  hide(): void {
    if (!this.panel) return;

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
      },
    });
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }
}
