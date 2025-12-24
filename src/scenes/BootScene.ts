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
    // Player sprite (adventurer character)
    const playerGraphics = this.make.graphics({ x: 0, y: 0 });
    // Body (blue tunic)
    playerGraphics.fillStyle(0x3b82f6);
    playerGraphics.fillRect(4, 6, 8, 7);
    // Head (skin tone)
    playerGraphics.fillStyle(0xfcd9b6);
    playerGraphics.fillCircle(8, 4, 3);
    // Hair (brown)
    playerGraphics.fillStyle(0x92400e);
    playerGraphics.fillRect(5, 1, 6, 3);
    // Eyes
    playerGraphics.fillStyle(0x1e3a5f);
    playerGraphics.fillRect(6, 3, 1, 1);
    playerGraphics.fillRect(9, 3, 1, 1);
    // Legs
    playerGraphics.fillStyle(0x78350f);
    playerGraphics.fillRect(5, 13, 2, 3);
    playerGraphics.fillRect(9, 13, 2, 3);
    // Arms
    playerGraphics.fillStyle(0xfcd9b6);
    playerGraphics.fillRect(2, 7, 2, 4);
    playerGraphics.fillRect(12, 7, 2, 4);
    // Sword in hand
    playerGraphics.fillStyle(0x9ca3af);
    playerGraphics.fillRect(13, 4, 2, 6);
    playerGraphics.fillStyle(0x78350f);
    playerGraphics.fillRect(13, 9, 2, 2);
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

    // Basic enemy sprite (slime creature)
    const enemyGraphics = this.make.graphics({ x: 0, y: 0 });
    // Slime body
    enemyGraphics.fillStyle(0x22c55e);
    enemyGraphics.fillRoundedRect(2, 6, 12, 10, 4);
    // Slime highlight
    enemyGraphics.fillStyle(0x4ade80);
    enemyGraphics.fillCircle(5, 9, 2);
    // Eyes
    enemyGraphics.fillStyle(0x000000);
    enemyGraphics.fillCircle(6, 10, 2);
    enemyGraphics.fillCircle(10, 10, 2);
    enemyGraphics.fillStyle(0xffffff);
    enemyGraphics.fillCircle(6, 9, 1);
    enemyGraphics.fillCircle(10, 9, 1);
    enemyGraphics.generateTexture('enemy', TILE_SIZE, TILE_SIZE);
    enemyGraphics.destroy();

    // Fast enemy (bat creature)
    const fastEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    // Wings
    fastEnemyGraphics.fillStyle(0x6b21a8);
    fastEnemyGraphics.fillTriangle(0, 6, 6, 8, 4, 12);
    fastEnemyGraphics.fillTriangle(16, 6, 10, 8, 12, 12);
    // Body
    fastEnemyGraphics.fillStyle(0x581c87);
    fastEnemyGraphics.fillCircle(8, 10, 4);
    // Ears
    fastEnemyGraphics.fillTriangle(5, 6, 6, 10, 7, 6);
    fastEnemyGraphics.fillTriangle(11, 6, 10, 10, 9, 6);
    // Eyes (red glowing)
    fastEnemyGraphics.fillStyle(0xef4444);
    fastEnemyGraphics.fillCircle(6, 9, 1);
    fastEnemyGraphics.fillCircle(10, 9, 1);
    fastEnemyGraphics.generateTexture('enemy_fast', TILE_SIZE, TILE_SIZE);
    fastEnemyGraphics.destroy();

    // Tank enemy (armored orc/golem)
    const tankEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    // Body (stone/armor)
    tankEnemyGraphics.fillStyle(0x6b7280);
    tankEnemyGraphics.fillRect(2, 4, 12, 12);
    // Head
    tankEnemyGraphics.fillStyle(0x4b5563);
    tankEnemyGraphics.fillRect(4, 1, 8, 6);
    // Helmet
    tankEnemyGraphics.fillStyle(0x78350f);
    tankEnemyGraphics.fillRect(3, 0, 10, 3);
    // Eyes (glowing)
    tankEnemyGraphics.fillStyle(0xfbbf24);
    tankEnemyGraphics.fillRect(5, 3, 2, 2);
    tankEnemyGraphics.fillRect(9, 3, 2, 2);
    // Shoulder pads
    tankEnemyGraphics.fillStyle(0x78350f);
    tankEnemyGraphics.fillRect(0, 4, 3, 4);
    tankEnemyGraphics.fillRect(13, 4, 3, 4);
    tankEnemyGraphics.generateTexture('enemy_tank', TILE_SIZE, TILE_SIZE);
    tankEnemyGraphics.destroy();

    // Ranged enemy (skeleton mage)
    const rangedEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    // Robe
    rangedEnemyGraphics.fillStyle(0x1e3a5f);
    rangedEnemyGraphics.fillTriangle(8, 5, 2, 15, 14, 15);
    // Skull head
    rangedEnemyGraphics.fillStyle(0xe5e5e5);
    rangedEnemyGraphics.fillCircle(8, 4, 4);
    // Eye sockets
    rangedEnemyGraphics.fillStyle(0x000000);
    rangedEnemyGraphics.fillCircle(6, 4, 1);
    rangedEnemyGraphics.fillCircle(10, 4, 1);
    // Glowing eyes
    rangedEnemyGraphics.fillStyle(0xf97316);
    rangedEnemyGraphics.fillRect(6, 4, 1, 1);
    rangedEnemyGraphics.fillRect(10, 4, 1, 1);
    // Staff
    rangedEnemyGraphics.fillStyle(0x78350f);
    rangedEnemyGraphics.fillRect(13, 2, 2, 12);
    rangedEnemyGraphics.fillStyle(0xf97316);
    rangedEnemyGraphics.fillCircle(14, 2, 2);
    rangedEnemyGraphics.generateTexture('enemy_ranged', TILE_SIZE, TILE_SIZE);
    rangedEnemyGraphics.destroy();

    // Boss enemy (demon lord)
    const bossEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    // Body
    bossEnemyGraphics.fillStyle(0x7f1d1d);
    bossEnemyGraphics.fillRect(2, 5, 12, 11);
    // Head
    bossEnemyGraphics.fillStyle(0x991b1b);
    bossEnemyGraphics.fillCircle(8, 5, 5);
    // Horns
    bossEnemyGraphics.fillStyle(0x1c1917);
    bossEnemyGraphics.fillTriangle(2, 5, 4, 0, 5, 5);
    bossEnemyGraphics.fillTriangle(14, 5, 12, 0, 11, 5);
    // Glowing eyes
    bossEnemyGraphics.fillStyle(0xfbbf24);
    bossEnemyGraphics.fillRect(5, 4, 2, 2);
    bossEnemyGraphics.fillRect(9, 4, 2, 2);
    // Mouth/fangs
    bossEnemyGraphics.fillStyle(0x000000);
    bossEnemyGraphics.fillRect(6, 7, 4, 2);
    bossEnemyGraphics.fillStyle(0xffffff);
    bossEnemyGraphics.fillTriangle(6, 7, 7, 9, 7, 7);
    bossEnemyGraphics.fillTriangle(10, 7, 9, 9, 9, 7);
    // Wings hint
    bossEnemyGraphics.fillStyle(0x450a0a);
    bossEnemyGraphics.fillTriangle(0, 8, 3, 5, 3, 12);
    bossEnemyGraphics.fillTriangle(16, 8, 13, 5, 13, 12);
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

    // Exit/stairs tile (descending staircase)
    const exitGraphics = this.make.graphics({ x: 0, y: 0 });
    // Dark background (hole going down)
    exitGraphics.fillStyle(0x1c1917);
    exitGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Stairs going down (3D effect)
    exitGraphics.fillStyle(0x57534e);
    exitGraphics.fillRect(0, 0, 16, 4);   // Top step
    exitGraphics.fillStyle(0x44403c);
    exitGraphics.fillRect(0, 4, 14, 4);   // Second step
    exitGraphics.fillStyle(0x292524);
    exitGraphics.fillRect(0, 8, 12, 4);   // Third step
    exitGraphics.fillStyle(0x1c1917);
    exitGraphics.fillRect(0, 12, 10, 4);  // Bottom/darkness
    // Step edges (highlights)
    exitGraphics.fillStyle(0x78716c);
    exitGraphics.fillRect(0, 0, 16, 1);
    exitGraphics.fillRect(0, 4, 14, 1);
    exitGraphics.fillRect(0, 8, 12, 1);
    // Glow effect around stairs
    exitGraphics.lineStyle(1, 0x10b981);
    exitGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
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

    // === ITEM ICONS ===

    // Armor icon (chestplate shape)
    const armorIconGraphics = this.make.graphics({ x: 0, y: 0 });
    armorIconGraphics.fillStyle(0x6b7280);
    // Body of armor
    armorIconGraphics.fillRect(4, 6, 8, 8);
    // Shoulders
    armorIconGraphics.fillRect(2, 4, 4, 4);
    armorIconGraphics.fillRect(10, 4, 4, 4);
    // Neck hole
    armorIconGraphics.fillStyle(0x1f2937);
    armorIconGraphics.fillRect(6, 4, 4, 3);
    // Highlight
    armorIconGraphics.fillStyle(0x9ca3af);
    armorIconGraphics.fillRect(5, 7, 2, 5);
    armorIconGraphics.generateTexture('item_armor', TILE_SIZE, TILE_SIZE);
    armorIconGraphics.destroy();

    // Accessory icon (ring shape)
    const accessoryIconGraphics = this.make.graphics({ x: 0, y: 0 });
    accessoryIconGraphics.lineStyle(3, 0xfbbf24);
    accessoryIconGraphics.strokeCircle(8, 8, 5);
    accessoryIconGraphics.fillStyle(0x8b5cf6);
    accessoryIconGraphics.fillCircle(8, 4, 3); // Gem on top
    accessoryIconGraphics.fillStyle(0xc4b5fd);
    accessoryIconGraphics.fillCircle(7, 3, 1); // Gem highlight
    accessoryIconGraphics.generateTexture('item_accessory', TILE_SIZE, TILE_SIZE);
    accessoryIconGraphics.destroy();

    // Health potion icon (bottle shape)
    const potionIconGraphics = this.make.graphics({ x: 0, y: 0 });
    // Bottle body
    potionIconGraphics.fillStyle(0xdc2626);
    potionIconGraphics.fillRoundedRect(4, 6, 8, 8, 2);
    // Bottle neck
    potionIconGraphics.fillStyle(0x854d0e);
    potionIconGraphics.fillRect(6, 2, 4, 5);
    // Cork
    potionIconGraphics.fillStyle(0xd97706);
    potionIconGraphics.fillRect(6, 1, 4, 2);
    // Liquid highlight
    potionIconGraphics.fillStyle(0xf87171);
    potionIconGraphics.fillRect(5, 8, 2, 4);
    potionIconGraphics.generateTexture('item_consumable', TILE_SIZE, TILE_SIZE);
    potionIconGraphics.destroy();

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

    // === HAZARDS ===

    // Spike trap (gray base with spikes)
    const spikeGraphics = this.make.graphics({ x: 0, y: 0 });
    spikeGraphics.fillStyle(0x4b5563);
    spikeGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    spikeGraphics.fillStyle(0x9ca3af);
    // Draw spike triangles
    const spikeSize = 4;
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const sx = 2 + i * 5;
        const sy = 2 + j * 5;
        spikeGraphics.fillTriangle(sx, sy + spikeSize, sx + spikeSize / 2, sy, sx + spikeSize, sy + spikeSize);
      }
    }
    spikeGraphics.generateTexture('spike_trap', TILE_SIZE, TILE_SIZE);
    spikeGraphics.destroy();

    // Spike trap (active/extended state)
    const spikeActiveGraphics = this.make.graphics({ x: 0, y: 0 });
    spikeActiveGraphics.fillStyle(0x4b5563);
    spikeActiveGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    spikeActiveGraphics.fillStyle(0xd1d5db);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const sx = 1 + i * 5;
        const sy = 1 + j * 5;
        spikeActiveGraphics.fillTriangle(sx, sy + 5, sx + 2.5, sy - 1, sx + 5, sy + 5);
      }
    }
    spikeActiveGraphics.lineStyle(1, 0xef4444);
    spikeActiveGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    spikeActiveGraphics.generateTexture('spike_trap_active', TILE_SIZE, TILE_SIZE);
    spikeActiveGraphics.destroy();

    // Lava pit (orange/red bubbling)
    const lavaGraphics = this.make.graphics({ x: 0, y: 0 });
    lavaGraphics.fillStyle(0xdc2626);
    lavaGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    lavaGraphics.fillStyle(0xf97316);
    lavaGraphics.fillCircle(4, 4, 3);
    lavaGraphics.fillCircle(12, 8, 2);
    lavaGraphics.fillCircle(6, 12, 2);
    lavaGraphics.fillCircle(14, 14, 3);
    lavaGraphics.fillStyle(0xfbbf24);
    lavaGraphics.fillCircle(4, 4, 1);
    lavaGraphics.fillCircle(14, 14, 1);
    lavaGraphics.generateTexture('lava_pit', TILE_SIZE, TILE_SIZE);
    lavaGraphics.destroy();

    // Arrow shooter (wall-mounted, facing right by default)
    const arrowShooterGraphics = this.make.graphics({ x: 0, y: 0 });
    arrowShooterGraphics.fillStyle(0x6b7280);
    arrowShooterGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    arrowShooterGraphics.fillStyle(0x1f2937);
    arrowShooterGraphics.fillRect(TILE_SIZE - 6, TILE_SIZE / 2 - 3, 6, 6);
    arrowShooterGraphics.fillStyle(0xef4444);
    arrowShooterGraphics.fillCircle(4, TILE_SIZE / 2, 3);
    arrowShooterGraphics.generateTexture('arrow_shooter', TILE_SIZE, TILE_SIZE);
    arrowShooterGraphics.destroy();

    // Arrow projectile
    const arrowGraphics = this.make.graphics({ x: 0, y: 0 });
    arrowGraphics.fillStyle(0x78350f);
    arrowGraphics.fillRect(0, 2, 8, 2);
    arrowGraphics.fillStyle(0x9ca3af);
    arrowGraphics.fillTriangle(8, 0, 12, 3, 8, 6);
    arrowGraphics.generateTexture('arrow', 12, 6);
    arrowGraphics.destroy();

    // === WEAPONS ===

    // Wand (purple crystal on stick)
    const wandGraphics = this.make.graphics({ x: 0, y: 0 });
    wandGraphics.fillStyle(0x8b4513);
    wandGraphics.fillRect(6, 8, 4, 10); // Handle
    wandGraphics.fillStyle(0x8b5cf6);
    wandGraphics.fillCircle(8, 5, 5); // Crystal
    wandGraphics.fillStyle(0xc4b5fd);
    wandGraphics.fillCircle(7, 4, 2); // Highlight
    wandGraphics.generateTexture('weapon_wand', TILE_SIZE, TILE_SIZE);
    wandGraphics.destroy();

    // Sword (silver blade)
    const swordGraphics = this.make.graphics({ x: 0, y: 0 });
    swordGraphics.fillStyle(0x8b4513);
    swordGraphics.fillRect(6, 12, 4, 5); // Handle
    swordGraphics.fillStyle(0x9ca3af);
    swordGraphics.fillRect(7, 2, 2, 11); // Blade
    swordGraphics.fillStyle(0xd1d5db);
    swordGraphics.fillTriangle(7, 2, 8, 0, 9, 2); // Tip
    swordGraphics.fillStyle(0xfbbf24);
    swordGraphics.fillRect(5, 11, 6, 2); // Guard
    swordGraphics.generateTexture('weapon_sword', TILE_SIZE, TILE_SIZE);
    swordGraphics.destroy();

    // Bow (curved wood with string)
    const bowGraphics = this.make.graphics({ x: 0, y: 0 });
    bowGraphics.lineStyle(3, 0x8b4513);
    bowGraphics.beginPath();
    bowGraphics.arc(8, 8, 6, -Math.PI * 0.7, Math.PI * 0.7, false);
    bowGraphics.strokePath();
    bowGraphics.lineStyle(1, 0xd1d5db);
    bowGraphics.lineBetween(3, 3, 3, 13); // String
    bowGraphics.generateTexture('weapon_bow', TILE_SIZE, TILE_SIZE);
    bowGraphics.destroy();

    // Staff (long rod with orb)
    const staffGraphics = this.make.graphics({ x: 0, y: 0 });
    staffGraphics.fillStyle(0x5c3d2e);
    staffGraphics.fillRect(7, 4, 2, 13); // Rod
    staffGraphics.fillStyle(0x22d3ee);
    staffGraphics.fillCircle(8, 3, 4); // Orb
    staffGraphics.fillStyle(0x67e8f9);
    staffGraphics.fillCircle(7, 2, 1.5); // Highlight
    staffGraphics.generateTexture('weapon_staff', TILE_SIZE, TILE_SIZE);
    staffGraphics.destroy();

    // Daggers (two crossed blades)
    const daggersGraphics = this.make.graphics({ x: 0, y: 0 });
    daggersGraphics.fillStyle(0x9ca3af);
    daggersGraphics.fillRect(3, 4, 2, 8); // Left blade
    daggersGraphics.fillRect(11, 4, 2, 8); // Right blade
    daggersGraphics.fillStyle(0xd1d5db);
    daggersGraphics.fillTriangle(3, 4, 4, 1, 5, 4); // Left tip
    daggersGraphics.fillTriangle(11, 4, 12, 1, 13, 4); // Right tip
    daggersGraphics.fillStyle(0x8b4513);
    daggersGraphics.fillRect(3, 12, 2, 3); // Left handle
    daggersGraphics.fillRect(11, 12, 2, 3); // Right handle
    daggersGraphics.generateTexture('weapon_daggers', TILE_SIZE, TILE_SIZE);
    daggersGraphics.destroy();

    // === WEAPON PROJECTILES ===

    // Wand projectile (yellow magic bolt) - reusing existing 'projectile'
    const wandProjGraphics = this.make.graphics({ x: 0, y: 0 });
    wandProjGraphics.fillStyle(0xfbbf24);
    wandProjGraphics.fillCircle(4, 4, 4);
    wandProjGraphics.fillStyle(0xfef3c7);
    wandProjGraphics.fillCircle(3, 3, 2);
    wandProjGraphics.generateTexture('projectile_wand', 8, 8);
    wandProjGraphics.destroy();

    // Sword slash effect (arc)
    const slashGraphics = this.make.graphics({ x: 0, y: 0 });
    slashGraphics.lineStyle(4, 0xffffff, 0.8);
    slashGraphics.beginPath();
    slashGraphics.arc(16, 16, 14, -Math.PI * 0.4, Math.PI * 0.4, false);
    slashGraphics.strokePath();
    slashGraphics.lineStyle(2, 0xd1d5db, 0.5);
    slashGraphics.beginPath();
    slashGraphics.arc(16, 16, 10, -Math.PI * 0.3, Math.PI * 0.3, false);
    slashGraphics.strokePath();
    slashGraphics.generateTexture('slash_effect', 32, 32);
    slashGraphics.destroy();

    // Bow arrow projectile
    const bowArrowGraphics = this.make.graphics({ x: 0, y: 0 });
    bowArrowGraphics.fillStyle(0x8b4513);
    bowArrowGraphics.fillRect(0, 3, 10, 2); // Shaft
    bowArrowGraphics.fillStyle(0x9ca3af);
    bowArrowGraphics.fillTriangle(10, 0, 14, 4, 10, 8); // Tip
    bowArrowGraphics.fillStyle(0xef4444);
    bowArrowGraphics.fillRect(0, 2, 3, 1); // Fletching
    bowArrowGraphics.fillRect(0, 5, 3, 1);
    bowArrowGraphics.generateTexture('projectile_arrow', 14, 8);
    bowArrowGraphics.destroy();

    // Staff orb projectile
    const orbGraphics = this.make.graphics({ x: 0, y: 0 });
    orbGraphics.fillStyle(0x22d3ee);
    orbGraphics.fillCircle(6, 6, 6);
    orbGraphics.fillStyle(0x67e8f9);
    orbGraphics.fillCircle(4, 4, 2);
    orbGraphics.lineStyle(1, 0x0891b2);
    orbGraphics.strokeCircle(6, 6, 6);
    orbGraphics.generateTexture('projectile_orb', 12, 12);
    orbGraphics.destroy();

    // Dagger projectile
    const daggerProjGraphics = this.make.graphics({ x: 0, y: 0 });
    daggerProjGraphics.fillStyle(0x9ca3af);
    daggerProjGraphics.fillRect(0, 2, 6, 2); // Blade
    daggerProjGraphics.fillStyle(0xd1d5db);
    daggerProjGraphics.fillTriangle(6, 0, 10, 3, 6, 6); // Tip
    daggerProjGraphics.generateTexture('projectile_dagger', 10, 6);
    daggerProjGraphics.destroy();

    // Staff explosion effect
    const explosionGraphics = this.make.graphics({ x: 0, y: 0 });
    explosionGraphics.fillStyle(0x22d3ee, 0.3);
    explosionGraphics.fillCircle(16, 16, 16);
    explosionGraphics.fillStyle(0x67e8f9, 0.5);
    explosionGraphics.fillCircle(16, 16, 10);
    explosionGraphics.fillStyle(0xffffff, 0.7);
    explosionGraphics.fillCircle(16, 16, 4);
    explosionGraphics.generateTexture('explosion_effect', 32, 32);
    explosionGraphics.destroy();

    // Weapon drop glow (to show it's a weapon pickup)
    const weaponDropGraphics = this.make.graphics({ x: 0, y: 0 });
    weaponDropGraphics.fillStyle(0xfbbf24, 0.3);
    weaponDropGraphics.fillCircle(10, 10, 10);
    weaponDropGraphics.fillStyle(0xfbbf24, 0.6);
    weaponDropGraphics.fillCircle(10, 10, 6);
    weaponDropGraphics.generateTexture('weapon_drop_glow', 20, 20);
    weaponDropGraphics.destroy();

    // === SPECIAL ROOM FLOORS ===

    // Treasure room floor (golden/yellow tint)
    const treasureFloorGraphics = this.make.graphics({ x: 0, y: 0 });
    treasureFloorGraphics.fillStyle(0x4a4520);
    treasureFloorGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    treasureFloorGraphics.fillStyle(0x5c5729);
    treasureFloorGraphics.fillRect(1, 1, 6, 6);
    treasureFloorGraphics.fillRect(9, 9, 6, 6);
    treasureFloorGraphics.lineStyle(1, 0x6b6330);
    treasureFloorGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    treasureFloorGraphics.generateTexture('floor_treasure', TILE_SIZE, TILE_SIZE);
    treasureFloorGraphics.destroy();

    // Trap room floor (dark red/danger tint)
    const trapFloorGraphics = this.make.graphics({ x: 0, y: 0 });
    trapFloorGraphics.fillStyle(0x4a2020);
    trapFloorGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    trapFloorGraphics.fillStyle(0x5c2929);
    trapFloorGraphics.fillRect(2, 2, 5, 5);
    trapFloorGraphics.fillRect(9, 9, 5, 5);
    trapFloorGraphics.lineStyle(1, 0x6b3030);
    trapFloorGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    trapFloorGraphics.generateTexture('floor_trap', TILE_SIZE, TILE_SIZE);
    trapFloorGraphics.destroy();

    // Shrine room floor (blue/holy tint)
    const shrineFloorGraphics = this.make.graphics({ x: 0, y: 0 });
    shrineFloorGraphics.fillStyle(0x203a4a);
    shrineFloorGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    shrineFloorGraphics.fillStyle(0x29455c);
    shrineFloorGraphics.fillRect(1, 1, 6, 6);
    shrineFloorGraphics.fillRect(9, 9, 6, 6);
    shrineFloorGraphics.lineStyle(1, 0x304d6b);
    shrineFloorGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    shrineFloorGraphics.generateTexture('floor_shrine', TILE_SIZE, TILE_SIZE);
    shrineFloorGraphics.destroy();

    // Challenge room floor (purple/arena tint)
    const challengeFloorGraphics = this.make.graphics({ x: 0, y: 0 });
    challengeFloorGraphics.fillStyle(0x3a204a);
    challengeFloorGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    challengeFloorGraphics.fillStyle(0x45295c);
    challengeFloorGraphics.fillRect(2, 2, 5, 5);
    challengeFloorGraphics.fillRect(9, 9, 5, 5);
    challengeFloorGraphics.lineStyle(1, 0x4d306b);
    challengeFloorGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
    challengeFloorGraphics.generateTexture('floor_challenge', TILE_SIZE, TILE_SIZE);
    challengeFloorGraphics.destroy();

    // === SPECIAL ROOM OBJECTS ===

    // Treasure chest (closed)
    const chestGraphics = this.make.graphics({ x: 0, y: 0 });
    // Chest body
    chestGraphics.fillStyle(0x8b4513);
    chestGraphics.fillRect(2, 6, 12, 8);
    // Chest lid
    chestGraphics.fillStyle(0xa0522d);
    chestGraphics.fillRoundedRect(1, 3, 14, 5, 2);
    // Metal bands
    chestGraphics.fillStyle(0xfbbf24);
    chestGraphics.fillRect(1, 4, 14, 1);
    chestGraphics.fillRect(1, 10, 14, 1);
    // Lock
    chestGraphics.fillStyle(0xfbbf24);
    chestGraphics.fillRect(6, 6, 4, 4);
    chestGraphics.fillStyle(0x1f2937);
    chestGraphics.fillRect(7, 7, 2, 2);
    chestGraphics.generateTexture('chest_closed', TILE_SIZE, TILE_SIZE);
    chestGraphics.destroy();

    // Treasure chest (open)
    const chestOpenGraphics = this.make.graphics({ x: 0, y: 0 });
    // Chest body
    chestOpenGraphics.fillStyle(0x8b4513);
    chestOpenGraphics.fillRect(2, 8, 12, 6);
    // Open lid (tilted back)
    chestOpenGraphics.fillStyle(0xa0522d);
    chestOpenGraphics.fillRect(2, 2, 12, 4);
    // Metal bands
    chestOpenGraphics.fillStyle(0xfbbf24);
    chestOpenGraphics.fillRect(1, 3, 14, 1);
    chestOpenGraphics.fillRect(2, 10, 12, 1);
    // Gold inside!
    chestOpenGraphics.fillStyle(0xffd700);
    chestOpenGraphics.fillCircle(5, 10, 2);
    chestOpenGraphics.fillCircle(8, 9, 2);
    chestOpenGraphics.fillCircle(11, 10, 2);
    chestOpenGraphics.generateTexture('chest_open', TILE_SIZE, TILE_SIZE);
    chestOpenGraphics.destroy();

    // Healing shrine/fountain
    const shrineGraphics = this.make.graphics({ x: 0, y: 0 });
    // Pedestal
    shrineGraphics.fillStyle(0x6b7280);
    shrineGraphics.fillRect(4, 10, 8, 6);
    shrineGraphics.fillRect(2, 14, 12, 2);
    // Crystal/orb
    shrineGraphics.fillStyle(0x22d3ee);
    shrineGraphics.fillCircle(8, 6, 5);
    shrineGraphics.fillStyle(0x67e8f9);
    shrineGraphics.fillCircle(6, 4, 2);
    // Glow effect
    shrineGraphics.fillStyle(0x22d3ee, 0.3);
    shrineGraphics.fillCircle(8, 6, 7);
    shrineGraphics.generateTexture('shrine', TILE_SIZE, TILE_SIZE);
    shrineGraphics.destroy();

    // Challenge arena skull marker
    const skullMarkerGraphics = this.make.graphics({ x: 0, y: 0 });
    // Skull
    skullMarkerGraphics.fillStyle(0xe5e5e5);
    skullMarkerGraphics.fillCircle(8, 7, 6);
    skullMarkerGraphics.fillRect(5, 11, 6, 3);
    // Eye sockets
    skullMarkerGraphics.fillStyle(0x1f2937);
    skullMarkerGraphics.fillCircle(5, 6, 2);
    skullMarkerGraphics.fillCircle(11, 6, 2);
    // Nose hole
    skullMarkerGraphics.fillTriangle(8, 8, 6, 10, 10, 10);
    // Teeth
    skullMarkerGraphics.fillStyle(0xe5e5e5);
    skullMarkerGraphics.fillRect(5, 11, 1, 2);
    skullMarkerGraphics.fillRect(7, 11, 1, 2);
    skullMarkerGraphics.fillRect(9, 11, 1, 2);
    skullMarkerGraphics.generateTexture('skull_marker', TILE_SIZE, TILE_SIZE);
    skullMarkerGraphics.destroy();
  }
}
