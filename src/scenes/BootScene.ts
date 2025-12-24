import Phaser from 'phaser';
import { TILE_SIZE } from '../utils/constants';
import { AudioSystem } from '../systems/AudioSystem';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Create loading bar
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x222222, 0.8);
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50);

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      fontSize: '20px',
      color: '#ffffff',
    });
    loadingText.setOrigin(0.5, 0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x8b5cf6, 1);
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // Generate placeholder assets
    this.createPlaceholderAssets();

    // Generate sounds
    AudioSystem.generateSounds(this);
  }

  create(): void {
    this.scene.start('MenuScene');
  }

  private createPlaceholderAssets(): void {
    // Player sprite (16x16 purple square)
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    playerGraphics.fillStyle(0x8b5cf6);
    playerGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    playerGraphics.generateTexture('player', TILE_SIZE, TILE_SIZE);
    playerGraphics.destroy();

    // Floor tile
    const floorGraphics = this.make.graphics({ x: 0, y: 0 });
    floorGraphics.fillStyle(0x374151);
    floorGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    floorGraphics.lineStyle(1, 0x4b5563);
    floorGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    floorGraphics.generateTexture('floor', TILE_SIZE, TILE_SIZE);
    floorGraphics.destroy();

    // Wall tile
    const wallGraphics = this.make.graphics({ x: 0, y: 0 });
    wallGraphics.fillStyle(0x1f2937);
    wallGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    wallGraphics.lineStyle(1, 0x374151);
    wallGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    wallGraphics.generateTexture('wall', TILE_SIZE, TILE_SIZE);
    wallGraphics.destroy();

    // Basic enemy sprite (red square)
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyGraphics.fillStyle(0xef4444);
    enemyGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    enemyGraphics.generateTexture('enemy', TILE_SIZE, TILE_SIZE);
    enemyGraphics.destroy();

    // Fast enemy (smaller, green-ish)
    const fastEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    fastEnemyGraphics.fillStyle(0x22c55e);
    fastEnemyGraphics.fillRect(2, 2, TILE_SIZE - 4, TILE_SIZE - 4);
    fastEnemyGraphics.generateTexture('enemy_fast', TILE_SIZE, TILE_SIZE);
    fastEnemyGraphics.destroy();

    // Tank enemy (larger, purple)
    const tankEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    tankEnemyGraphics.fillStyle(0x8b5cf6);
    tankEnemyGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    tankEnemyGraphics.lineStyle(2, 0x6d28d9);
    tankEnemyGraphics.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    tankEnemyGraphics.generateTexture('enemy_tank', TILE_SIZE, TILE_SIZE);
    tankEnemyGraphics.destroy();

    // Ranged enemy (orange, diamond shape)
    const rangedEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    rangedEnemyGraphics.fillStyle(0xf97316);
    rangedEnemyGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    rangedEnemyGraphics.generateTexture('enemy_ranged', TILE_SIZE, TILE_SIZE);
    rangedEnemyGraphics.destroy();

    // Boss enemy (large, red with border)
    const bossEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    bossEnemyGraphics.fillStyle(0xdc2626);
    bossEnemyGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    bossEnemyGraphics.lineStyle(2, 0xfbbf24);
    bossEnemyGraphics.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    bossEnemyGraphics.generateTexture('enemy_boss', TILE_SIZE, TILE_SIZE);
    bossEnemyGraphics.destroy();

    // Enemy projectile (red circle)
    const enemyProjGraphics = this.make.graphics({ x: 0, y: 0 });
    enemyProjGraphics.fillStyle(0xff4444);
    enemyProjGraphics.fillCircle(4, 4, 4);
    enemyProjGraphics.generateTexture('enemy_projectile', 8, 8);
    enemyProjGraphics.destroy();

    // Player projectile (small yellow circle)
    const projectileGraphics = this.make.graphics({ x: 0, y: 0 });
    projectileGraphics.fillStyle(0xfbbf24);
    projectileGraphics.fillCircle(4, 4, 4);
    projectileGraphics.generateTexture('projectile', 8, 8);
    projectileGraphics.destroy();

    // Exit/stairs tile (green)
    const exitGraphics = this.make.graphics({ x: 0, y: 0 });
    exitGraphics.fillStyle(0x10b981);
    exitGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    exitGraphics.generateTexture('exit', TILE_SIZE, TILE_SIZE);
    exitGraphics.destroy();

    // Item drop (glowing orb)
    const itemGraphics = this.make.graphics({ x: 0, y: 0 });
    itemGraphics.fillStyle(0xffd700);
    itemGraphics.fillCircle(6, 6, 6);
    itemGraphics.fillStyle(0xffee88);
    itemGraphics.fillCircle(5, 5, 3);
    itemGraphics.generateTexture('item_drop', 12, 12);
    itemGraphics.destroy();

    // Door (brown/red bar)
    const doorGraphics = this.make.graphics({ x: 0, y: 0 });
    doorGraphics.fillStyle(0x8b4513);
    doorGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    doorGraphics.lineStyle(2, 0x5c3317);
    doorGraphics.strokeRect(1, 1, TILE_SIZE - 2, TILE_SIZE - 2);
    doorGraphics.fillStyle(0xffd700);
    doorGraphics.fillCircle(TILE_SIZE - 4, TILE_SIZE / 2, 2);
    doorGraphics.generateTexture('door', TILE_SIZE, TILE_SIZE);
    doorGraphics.destroy();
  }
}
