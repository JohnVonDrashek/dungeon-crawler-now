import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SinWorld, getWorldConfig } from '../config/WorldConfig';

/**
 * GameHUD manages the in-game heads-up display including:
 * - HP bar and text
 * - XP bar and level
 * - Stats display (attack, defense)
 * - Gold counter
 * - Floor/world indicator
 * - Enemy count
 * - Stat points indicator
 * - Weapon display
 */
export class GameHUD {
  private scene: Phaser.Scene;
  private player: Player;

  // Main HUD elements
  private hudContainer!: Phaser.GameObjects.Container;
  private floorText!: Phaser.GameObjects.Text;
  private hpBarBg!: Phaser.GameObjects.Graphics;
  private hpBarFill!: Phaser.GameObjects.Graphics;
  private hpText!: Phaser.GameObjects.Text;
  private xpBarBg!: Phaser.GameObjects.Graphics;
  private xpBarFill!: Phaser.GameObjects.Graphics;
  private levelText!: Phaser.GameObjects.Text;
  private statsText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private enemyText!: Phaser.GameObjects.Text;
  private statPointsText!: Phaser.GameObjects.Text;

  // Weapon HUD elements
  private weaponHUD!: Phaser.GameObjects.Container;
  private weaponIcon!: Phaser.GameObjects.Sprite;
  private weaponText!: Phaser.GameObjects.Text;

  // Event handler reference for cleanup
  private equipmentChangedHandler: (() => void) | null = null;

  // Panel dimensions
  private readonly panelWidth = 200;
  private readonly barWidth = 180; // panelWidth - 20

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
  }

  create(): void {
    this.createMainHUD();
    this.createWeaponHUD();

    // Listen for equipment changes (store reference for cleanup)
    this.equipmentChangedHandler = () => {
      this.updateWeaponHUD();
    };
    this.scene.events.on('equipmentChanged', this.equipmentChangedHandler);
  }

  private createMainHUD(): void {
    const panelX = 12;
    const panelY = 12;

    // Main HUD container
    this.hudContainer = this.scene.add.container(panelX, panelY);
    this.hudContainer.setScrollFactor(0);
    this.hudContainer.setDepth(100);

    // Panel background
    const panelBg = this.scene.add.graphics();
    panelBg.fillStyle(0x000000, 0.7);
    panelBg.fillRoundedRect(0, 0, this.panelWidth, 130, 4);
    panelBg.lineStyle(1, 0x444444, 0.6);
    panelBg.strokeRoundedRect(0, 0, this.panelWidth, 130, 4);
    this.hudContainer.add(panelBg);

    // Corner accents
    const corners = this.scene.add.graphics();
    corners.lineStyle(2, 0xff6600, 0.7);
    // Top-left
    corners.beginPath();
    corners.moveTo(0, 10);
    corners.lineTo(0, 0);
    corners.lineTo(10, 0);
    corners.strokePath();
    // Top-right
    corners.beginPath();
    corners.moveTo(this.panelWidth - 10, 0);
    corners.lineTo(this.panelWidth, 0);
    corners.lineTo(this.panelWidth, 10);
    corners.strokePath();
    this.hudContainer.add(corners);

    // Floor/World text
    this.floorText = this.scene.add.text(this.panelWidth / 2, 12, '', {
      fontSize: '11px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ffffff',
    });
    this.floorText.setOrigin(0.5, 0);
    this.hudContainer.add(this.floorText);

    // Divider line under floor text
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x444444, 0.5);
    divider.lineBetween(10, 28, this.panelWidth - 10, 28);
    this.hudContainer.add(divider);

    // HP Label
    const hpLabel = this.scene.add.text(10, 34, 'HP', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#888888',
    });
    this.hudContainer.add(hpLabel);

    // HP Bar background
    this.hpBarBg = this.scene.add.graphics();
    this.hpBarBg.fillStyle(0x1a1a1a, 1);
    this.hpBarBg.fillRoundedRect(10, 46, this.barWidth, 12, 2);
    this.hpBarBg.lineStyle(1, 0x333333, 1);
    this.hpBarBg.strokeRoundedRect(10, 46, this.barWidth, 12, 2);
    this.hudContainer.add(this.hpBarBg);

    // HP Bar fill
    this.hpBarFill = this.scene.add.graphics();
    this.hudContainer.add(this.hpBarFill);

    // HP Text overlay
    this.hpText = this.scene.add.text(this.panelWidth / 2, 52, '', {
      fontSize: '9px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#ffffff',
    });
    this.hpText.setOrigin(0.5);
    this.hudContainer.add(this.hpText);

    // Level & XP
    this.levelText = this.scene.add.text(10, 62, '', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#888888',
    });
    this.hudContainer.add(this.levelText);

    // XP Bar background
    this.xpBarBg = this.scene.add.graphics();
    this.xpBarBg.fillStyle(0x1a1a1a, 1);
    this.xpBarBg.fillRoundedRect(10, 74, this.barWidth, 8, 2);
    this.xpBarBg.lineStyle(1, 0x333333, 1);
    this.xpBarBg.strokeRoundedRect(10, 74, this.barWidth, 8, 2);
    this.hudContainer.add(this.xpBarBg);

    // XP Bar fill
    this.xpBarFill = this.scene.add.graphics();
    this.hudContainer.add(this.xpBarFill);

    // Stats text
    this.statsText = this.scene.add.text(10, 88, '', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#aaaaaa',
    });
    this.hudContainer.add(this.statsText);

    // Enemy count
    this.enemyText = this.scene.add.text(10, 102, '', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#666666',
    });
    this.hudContainer.add(this.enemyText);

    // Stat points notification (hidden by default)
    this.statPointsText = this.scene.add.text(10, 116, '', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#ff6600',
    });
    this.hudContainer.add(this.statPointsText);

    // Gold display - integrated into main panel
    const goldIcon = this.scene.add.text(this.panelWidth - 10, 34, '\u25C6', {
      fontSize: '10px',
      color: '#ffd700',
    });
    goldIcon.setOrigin(1, 0);
    this.hudContainer.add(goldIcon);

    this.goldText = this.scene.add.text(this.panelWidth - 22, 34, '0', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#ffd700',
    });
    this.goldText.setOrigin(1, 0);
    this.hudContainer.add(this.goldText);
  }

  private createWeaponHUD(): void {
    const cam = this.scene.cameras.main;
    this.weaponHUD = this.scene.add.container(cam.width - 12, cam.height - 12);
    this.weaponHUD.setScrollFactor(0);
    this.weaponHUD.setDepth(100);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(-130, -55, 130, 55, 4);
    bg.lineStyle(1, 0x444444, 0.6);
    bg.strokeRoundedRect(-130, -55, 130, 55, 4);
    this.weaponHUD.add(bg);

    // Corner accent
    const corner = this.scene.add.graphics();
    corner.lineStyle(2, 0xff6600, 0.7);
    corner.beginPath();
    corner.moveTo(0, -10);
    corner.lineTo(0, 0);
    corner.lineTo(-10, 0);
    corner.strokePath();
    this.weaponHUD.add(corner);

    // Weapon icon
    const weapon = this.player.getWeapon();
    this.weaponIcon = this.scene.add.sprite(-105, -28, weapon.stats.texture);
    this.weaponIcon.setScale(1.8);
    const rarityColors = [0xcccccc, 0x22cc22, 0x2288ff, 0xaa44ff, 0xffaa00];
    this.weaponIcon.setTint(rarityColors[weapon.rarity]);
    this.weaponHUD.add(this.weaponIcon);

    // Weapon name
    this.weaponText = this.scene.add.text(-80, -40, weapon.getDisplayName(), {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#ffffff',
      wordWrap: { width: 70 },
    });
    this.weaponHUD.add(this.weaponText);

    // Weapon label
    const weaponLabel = this.scene.add.text(-80, -10, 'WEAPON', {
      fontSize: '8px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#666666',
    });
    this.weaponHUD.add(weaponLabel);
  }

  update(floor: number, currentWorld: SinWorld | null, isBossFloor: boolean, enemyCount: number): void {
    // Floor/World text
    let floorStr: string;
    if (currentWorld) {
      const worldConfig = getWorldConfig(currentWorld);
      const bossLabel = isBossFloor ? ' \u2694' : '';
      floorStr = `${worldConfig.name} ${floor}${bossLabel}`;
    } else {
      floorStr = isBossFloor ? `Stage ${floor} \u2694` : `Stage ${floor}`;
    }
    this.floorText.setText(floorStr);

    // HP Bar
    const hpPercent = Math.max(0, this.player.hp / this.player.maxHp);
    this.hpBarFill.clear();
    if (hpPercent > 0) {
      // Color based on HP percentage
      let hpColor = 0x22cc44; // Green
      if (hpPercent < 0.3) hpColor = 0xcc2222; // Red
      else if (hpPercent < 0.6) hpColor = 0xccaa22; // Yellow

      this.hpBarFill.fillStyle(hpColor, 1);
      this.hpBarFill.fillRoundedRect(10, 46, Math.max(4, this.barWidth * hpPercent), 12, 2);
    }
    this.hpText.setText(`${this.player.hp} / ${this.player.maxHp}`);

    // Level & XP
    this.levelText.setText(`LVL ${this.player.level}`);

    const xpPercent = this.player.xp / this.player.xpToNextLevel;
    this.xpBarFill.clear();
    if (xpPercent > 0) {
      this.xpBarFill.fillStyle(0x8844cc, 1);
      this.xpBarFill.fillRoundedRect(10, 74, Math.max(2, this.barWidth * xpPercent), 8, 2);
    }

    // Stats
    this.statsText.setText(`ATK ${this.player.attack}  \u00B7  DEF ${this.player.defense}`);

    // Enemies
    this.enemyText.setText(`Enemies: ${enemyCount}`);

    // Stat points
    if (this.player.statPoints > 0) {
      this.statPointsText.setText(`\u25B6 ${this.player.statPoints} stat points [L]`);
      this.statPointsText.setVisible(true);
    } else {
      this.statPointsText.setVisible(false);
    }

    // Gold
    this.goldText.setText(`${this.player.gold}`);
  }

  private updateWeaponHUD(): void {
    const weapon = this.player.getWeapon();
    const rarityColors = [0xcccccc, 0x22cc22, 0x2288ff, 0xaa44ff, 0xffaa00];

    this.weaponIcon.setTexture(weapon.stats.texture);
    this.weaponIcon.setTint(rarityColors[weapon.rarity]);
    this.weaponText.setText(weapon.getDisplayName());
  }

  destroy(): void {
    // Clean up event listener properly
    if (this.equipmentChangedHandler) {
      this.scene.events.off('equipmentChanged', this.equipmentChangedHandler);
      this.equipmentChangedHandler = null;
    }
    this.hudContainer.destroy();
    this.weaponHUD.destroy();
  }
}
