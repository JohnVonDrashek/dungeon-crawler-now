import Phaser from 'phaser';
import { TILE_SIZE } from '../utils/constants';
import { AudioSystem } from '../systems/AudioSystem';
import { getAllWorlds, getWorldConfig } from '../config/WorldConfig';

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

    // Load external tilesets (PixelLab generated Wang tilesets for all worlds)
    const worlds = ['pride', 'greed', 'wrath', 'sloth', 'envy', 'gluttony', 'lust', 'hub'];
    for (const world of worlds) {
      this.load.spritesheet(`tileset_${world}`, `assets/tilesets/tileset_${world}.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
    }

    // Load PixelLab generated map objects (32x32 with transparent backgrounds)
    // These will be used instead of the generated placeholders
    this.load.image('pixellab_chest_closed', 'assets/objects/chest_closed.png');
    this.load.image('pixellab_chest_open', 'assets/objects/chest_open.png');
    this.load.image('pixellab_shrine', 'assets/objects/shrine.png');
    this.load.image('pixellab_exit_portal', 'assets/objects/exit_portal.png');
    this.load.image('pixellab_torch', 'assets/objects/torch.png');
    this.load.image('pixellab_skull_marker', 'assets/objects/skull_marker.png');
    this.load.image('pixellab_spike_trap', 'assets/objects/spike_trap.png');
    this.load.image('pixellab_lava_pit', 'assets/objects/lava_pit.png');
    this.load.image('pixellab_door', 'assets/objects/door.png');
    this.load.image('pixellab_lore_tablet', 'assets/objects/lore_tablet.png');
    this.load.image('pixellab_lore_whisper', 'assets/objects/lore_whisper.png');

    // Load character spritesheets (32x32 frames)
    // Idle: 8 columns (directions: S, SW, W, NW, N, NE, E, SE)
    this.load.spritesheet('franciscan_idle', 'assets/characters/franciscan_idle.png', {
      frameWidth: 32,
      frameHeight: 32,
    });
    // Walk: 8 columns x 4 rows (directions x frames)
    this.load.spritesheet('franciscan_walk', 'assets/characters/franciscan_walk.png', {
      frameWidth: 32,
      frameHeight: 32,
    });

    // Load enemy spritesheets (32x32 basic enemies)
    const basicEnemies = ['imp', 'demon_brute', 'cultist'];
    for (const enemy of basicEnemies) {
      this.load.spritesheet(`${enemy}_idle`, `assets/characters/${enemy}_idle.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
      this.load.spritesheet(`${enemy}_walk`, `assets/characters/${enemy}_walk.png`, {
        frameWidth: 32,
        frameHeight: 32,
      });
    }

    // Load Sin boss spritesheets (48x48)
    const sinBosses = ['pride', 'greed', 'wrath', 'sloth', 'envy', 'gluttony', 'lust'];
    for (const boss of sinBosses) {
      this.load.spritesheet(`${boss}_idle`, `assets/characters/${boss}_idle.png`, {
        frameWidth: 48,
        frameHeight: 48,
      });
    }
    // Pride has walk animation
    this.load.spritesheet('pride_walk', 'assets/characters/pride_walk.png', {
      frameWidth: 48,
      frameHeight: 48,
    });

    // Load normal maps for lighting system
    this.loadNormalMaps(worlds, basicEnemies, sinBosses);

    // Generate placeholder assets
    this.createPlaceholderAssets();

    // Generate sounds
    AudioSystem.generateSounds(this);
  }

  create(): void {
    // Extract individual tiles from PixelLab tilesets
    this.extractTilesetTextures();

    // Create player animations
    this.createPlayerAnimations();

    // Create enemy animations
    this.createEnemyAnimations();

    this.scene.start('MenuScene');
  }

  private createPlayerAnimations(): void {
    // Direction indices in spritesheet (S, SW, W, NW, N, NE, E, SE)
    const directions = ['south', 'south_west', 'west', 'north_west', 'north', 'north_east', 'east', 'south_east'];

    // Create idle animations (one frame per direction from idle spritesheet)
    directions.forEach((dir, index) => {
      this.anims.create({
        key: `player_idle_${dir}`,
        frames: [{ key: 'franciscan_idle', frame: index }],
        frameRate: 1,
      });
    });

    // Create walk animations (4 frames per direction from walk spritesheet)
    // Walk spritesheet: 8 columns (directions) x 4 rows (frames)
    // Frame index = row * 8 + column
    directions.forEach((dir, dirIndex) => {
      const frames = [0, 1, 2, 3].map(row => ({
        key: 'franciscan_walk',
        frame: row * 8 + dirIndex,
      }));

      this.anims.create({
        key: `player_walk_${dir}`,
        frames: frames,
        frameRate: 8,
        repeat: -1,
      });
    });
  }

  private createEnemyAnimations(): void {
    const directions = ['south', 'south_west', 'west', 'north_west', 'north', 'north_east', 'east', 'south_east'];

    // Basic enemies (32x32) with walk animations
    const basicEnemies = ['imp', 'demon_brute', 'cultist'];
    for (const enemy of basicEnemies) {
      // Idle animations
      directions.forEach((dir, index) => {
        this.anims.create({
          key: `${enemy}_idle_${dir}`,
          frames: [{ key: `${enemy}_idle`, frame: index }],
          frameRate: 1,
        });
      });

      // Walk animations (4 frames per direction)
      directions.forEach((dir, dirIndex) => {
        const frames = [0, 1, 2, 3].map(row => ({
          key: `${enemy}_walk`,
          frame: row * 8 + dirIndex,
        }));

        this.anims.create({
          key: `${enemy}_walk_${dir}`,
          frames: frames,
          frameRate: 8,
          repeat: -1,
        });
      });
    }

    // Sin bosses (48x48) - mostly idle only
    const sinBosses = ['pride', 'greed', 'wrath', 'sloth', 'envy', 'gluttony', 'lust'];
    for (const boss of sinBosses) {
      // Idle animations
      directions.forEach((dir, index) => {
        this.anims.create({
          key: `${boss}_idle_${dir}`,
          frames: [{ key: `${boss}_idle`, frame: index }],
          frameRate: 1,
        });
      });
    }

    // Pride has walk animation
    directions.forEach((dir, dirIndex) => {
      const frames = [0, 1, 2, 3].map(row => ({
        key: 'pride_walk',
        frame: row * 8 + dirIndex,
      }));

      this.anims.create({
        key: `pride_walk_${dir}`,
        frames: frames,
        frameRate: 6, // Slower for boss
        repeat: -1,
      });
    });
  }

  private extractTilesetTextures(): void {
    // Wang tilesets are used directly as spritesheets
    // The GameScene uses the WangTileSystem to select the correct frame
    // No extraction needed - just verify tilesets loaded correctly

    const worlds = ['pride', 'greed', 'wrath', 'sloth', 'envy', 'gluttony', 'lust', 'hub'];
    for (const world of worlds) {
      if (this.textures.exists(`tileset_${world}`)) {
        console.log(`PixelLab tileset loaded: tileset_${world}`);
      }
    }

    // Replace placeholder textures with PixelLab generated map objects
    const mapObjects = [
      'chest_closed', 'chest_open', 'shrine', 'exit_portal', 'torch', 'skull_marker',
      'spike_trap', 'lava_pit', 'door', 'lore_tablet', 'lore_whisper'
    ];
    for (const obj of mapObjects) {
      const pixellabKey = `pixellab_${obj}`;
      if (this.textures.exists(pixellabKey)) {
        // Remove the placeholder texture
        if (this.textures.exists(obj)) {
          this.textures.remove(obj);
        }
        // Rename pixellab texture to standard name
        this.textures.renameTexture(pixellabKey, obj);
        console.log(`PixelLab map object loaded: ${obj}`);
      }
    }

    // Also use the torch texture for candles (wall decorations)
    if (this.textures.exists('torch')) {
      if (this.textures.exists('candle')) {
        this.textures.remove('candle');
      }
      // Copy torch texture to candle
      const torchTexture = this.textures.get('torch');
      this.textures.addImage('candle', torchTexture.getSourceImage() as HTMLImageElement);
      console.log('PixelLab torch used for candles');
    }
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

    // === WORLD-SPECIFIC FLOOR/WALL TEXTURES ===
    // Generate themed textures for each sin world
    for (const worldId of getAllWorlds()) {
      const config = getWorldConfig(worldId);
      const colors = config.colors;

      // World-specific floor tile
      const worldFloor = this.make.graphics({ x: 0, y: 0 });
      worldFloor.fillStyle(colors.floor);
      worldFloor.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      // Add subtle grid lines using a lighter shade
      worldFloor.lineStyle(1, this.lightenColor(colors.floor, 0.15));
      worldFloor.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
      // Add some texture detail - corner accents
      worldFloor.fillStyle(this.lightenColor(colors.floor, 0.08));
      worldFloor.fillRect(0, 0, 3, 3);
      worldFloor.fillRect(TILE_SIZE - 3, TILE_SIZE - 3, 3, 3);
      worldFloor.generateTexture(`floor_${worldId}`, TILE_SIZE, TILE_SIZE);
      worldFloor.destroy();

      // World-specific wall tile
      const worldWall = this.make.graphics({ x: 0, y: 0 });
      worldWall.fillStyle(colors.wall);
      worldWall.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      // Add brick-like pattern
      worldWall.lineStyle(1, this.lightenColor(colors.wall, 0.12));
      worldWall.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
      // Horizontal mortar lines
      worldWall.lineStyle(1, this.darkenColor(colors.wall, 0.15));
      worldWall.lineBetween(0, TILE_SIZE / 3, TILE_SIZE, TILE_SIZE / 3);
      worldWall.lineBetween(0, (TILE_SIZE * 2) / 3, TILE_SIZE, (TILE_SIZE * 2) / 3);
      // Vertical mortar lines (offset for brick pattern)
      worldWall.lineBetween(TILE_SIZE / 2, 0, TILE_SIZE / 2, TILE_SIZE / 3);
      worldWall.lineBetween(0, TILE_SIZE / 3, 0, (TILE_SIZE * 2) / 3);
      worldWall.lineBetween(TILE_SIZE / 2, (TILE_SIZE * 2) / 3, TILE_SIZE / 2, TILE_SIZE);
      worldWall.generateTexture(`wall_${worldId}`, TILE_SIZE, TILE_SIZE);
      worldWall.destroy();
    }

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

    // === SEVEN CAPITAL SINS ENEMIES ===

    // Pride enemy (tall golden figure with crown)
    const prideEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    // Tall body
    prideEnemyGraphics.fillStyle(0xffd700);
    prideEnemyGraphics.fillRect(5, 4, 6, 12);
    // Head held high
    prideEnemyGraphics.fillStyle(0xfbbf24);
    prideEnemyGraphics.fillCircle(8, 3, 3);
    // Crown
    prideEnemyGraphics.fillStyle(0xffd700);
    prideEnemyGraphics.fillRect(4, 0, 8, 2);
    prideEnemyGraphics.fillTriangle(5, 0, 6, -2, 7, 0);
    prideEnemyGraphics.fillTriangle(9, 0, 10, -2, 11, 0);
    // Stern eyes looking down
    prideEnemyGraphics.fillStyle(0x000000);
    prideEnemyGraphics.fillRect(6, 3, 1, 1);
    prideEnemyGraphics.fillRect(9, 3, 1, 1);
    // Cape/robe
    prideEnemyGraphics.fillStyle(0xb8860b);
    prideEnemyGraphics.fillTriangle(5, 6, 3, 15, 5, 15);
    prideEnemyGraphics.fillTriangle(11, 6, 13, 15, 11, 15);
    prideEnemyGraphics.generateTexture('enemy_pride', TILE_SIZE, TILE_SIZE);
    prideEnemyGraphics.destroy();

    // Greed enemy (hunched figure clutching coins)
    const greedEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    // Hunched body
    greedEnemyGraphics.fillStyle(0x166534);
    greedEnemyGraphics.fillRoundedRect(3, 6, 10, 10, 3);
    // Head (bowed, looking at coins)
    greedEnemyGraphics.fillStyle(0x15803d);
    greedEnemyGraphics.fillCircle(7, 5, 3);
    // Greedy eyes
    greedEnemyGraphics.fillStyle(0xfbbf24);
    greedEnemyGraphics.fillCircle(6, 4, 1);
    greedEnemyGraphics.fillCircle(8, 5, 1);
    // Clutching hands
    greedEnemyGraphics.fillStyle(0x166534);
    greedEnemyGraphics.fillCircle(4, 10, 2);
    greedEnemyGraphics.fillCircle(12, 10, 2);
    // Gold coins being held
    greedEnemyGraphics.fillStyle(0xffd700);
    greedEnemyGraphics.fillCircle(8, 11, 2);
    greedEnemyGraphics.fillCircle(6, 13, 1);
    greedEnemyGraphics.fillCircle(10, 13, 1);
    greedEnemyGraphics.generateTexture('enemy_greed', TILE_SIZE, TILE_SIZE);
    greedEnemyGraphics.destroy();

    // Wrath enemy (horned demon with flames)
    const wrathEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    // Muscular body
    wrathEnemyGraphics.fillStyle(0xdc2626);
    wrathEnemyGraphics.fillRect(3, 5, 10, 11);
    // Head
    wrathEnemyGraphics.fillStyle(0xef4444);
    wrathEnemyGraphics.fillCircle(8, 5, 4);
    // Horns
    wrathEnemyGraphics.fillStyle(0x1c1917);
    wrathEnemyGraphics.fillTriangle(3, 4, 5, 0, 6, 5);
    wrathEnemyGraphics.fillTriangle(13, 4, 11, 0, 10, 5);
    // Angry eyes
    wrathEnemyGraphics.fillStyle(0xfbbf24);
    wrathEnemyGraphics.fillRect(5, 4, 2, 2);
    wrathEnemyGraphics.fillRect(9, 4, 2, 2);
    // Snarling mouth
    wrathEnemyGraphics.fillStyle(0x000000);
    wrathEnemyGraphics.fillRect(6, 7, 4, 1);
    // Flame wisps
    wrathEnemyGraphics.fillStyle(0xf97316);
    wrathEnemyGraphics.fillTriangle(1, 8, 3, 5, 3, 10);
    wrathEnemyGraphics.fillTriangle(15, 8, 13, 5, 13, 10);
    wrathEnemyGraphics.generateTexture('enemy_wrath', TILE_SIZE, TILE_SIZE);
    wrathEnemyGraphics.destroy();

    // Sloth enemy (slouching blob creature)
    const slothEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    // Wide blob body
    slothEnemyGraphics.fillStyle(0x6b7280);
    slothEnemyGraphics.fillRoundedRect(1, 7, 14, 9, 5);
    // Droopy head
    slothEnemyGraphics.fillStyle(0x9ca3af);
    slothEnemyGraphics.fillCircle(8, 7, 4);
    // Half-closed sleepy eyes
    slothEnemyGraphics.fillStyle(0x000000);
    slothEnemyGraphics.fillRect(5, 6, 2, 1);
    slothEnemyGraphics.fillRect(9, 6, 2, 1);
    // Yawning mouth
    slothEnemyGraphics.fillStyle(0x4b5563);
    slothEnemyGraphics.fillCircle(8, 9, 2);
    slothEnemyGraphics.fillStyle(0x374151);
    slothEnemyGraphics.fillCircle(8, 9, 1);
    // Zzz indication
    slothEnemyGraphics.fillStyle(0x60a5fa);
    slothEnemyGraphics.fillRect(12, 2, 2, 1);
    slothEnemyGraphics.fillRect(13, 4, 2, 1);
    slothEnemyGraphics.generateTexture('enemy_sloth', TILE_SIZE, TILE_SIZE);
    slothEnemyGraphics.destroy();

    // Envy enemy (shadowy mimic)
    const envyEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    // Shadowy body
    envyEnemyGraphics.fillStyle(0x1f2937);
    envyEnemyGraphics.fillRoundedRect(3, 4, 10, 12, 3);
    // Shadowy head
    envyEnemyGraphics.fillStyle(0x374151);
    envyEnemyGraphics.fillCircle(8, 5, 4);
    // Watching envious eyes (green)
    envyEnemyGraphics.fillStyle(0x22c55e);
    envyEnemyGraphics.fillCircle(6, 4, 2);
    envyEnemyGraphics.fillCircle(10, 4, 2);
    envyEnemyGraphics.fillStyle(0x000000);
    envyEnemyGraphics.fillCircle(6, 4, 1);
    envyEnemyGraphics.fillCircle(10, 4, 1);
    // Reaching arms
    envyEnemyGraphics.fillStyle(0x1f2937);
    envyEnemyGraphics.fillRect(0, 8, 3, 2);
    envyEnemyGraphics.fillRect(13, 8, 3, 2);
    envyEnemyGraphics.generateTexture('enemy_envy', TILE_SIZE, TILE_SIZE);
    envyEnemyGraphics.destroy();

    // Gluttony enemy (large round creature with gaping mouth)
    const gluttonyEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    // Large round body
    gluttonyEnemyGraphics.fillStyle(0xfbbf24);
    gluttonyEnemyGraphics.fillCircle(8, 9, 7);
    // Belly shade
    gluttonyEnemyGraphics.fillStyle(0xf59e0b);
    gluttonyEnemyGraphics.fillCircle(8, 11, 4);
    // Small eyes
    gluttonyEnemyGraphics.fillStyle(0x000000);
    gluttonyEnemyGraphics.fillCircle(5, 6, 1);
    gluttonyEnemyGraphics.fillCircle(11, 6, 1);
    // Gaping mouth
    gluttonyEnemyGraphics.fillStyle(0x7f1d1d);
    gluttonyEnemyGraphics.fillCircle(8, 10, 3);
    // Drool
    gluttonyEnemyGraphics.fillStyle(0x60a5fa);
    gluttonyEnemyGraphics.fillRect(9, 12, 1, 3);
    gluttonyEnemyGraphics.generateTexture('enemy_gluttony', TILE_SIZE, TILE_SIZE);
    gluttonyEnemyGraphics.destroy();

    // Lust enemy (alluring glowing figure)
    const lustEnemyGraphics = this.make.graphics({ x: 0, y: 0 });
    // Glowing aura
    lustEnemyGraphics.fillStyle(0xfce7f3);
    lustEnemyGraphics.fillCircle(8, 8, 7);
    // Curved body
    lustEnemyGraphics.fillStyle(0xec4899);
    lustEnemyGraphics.fillRoundedRect(4, 4, 8, 11, 4);
    // Head
    lustEnemyGraphics.fillStyle(0xf472b6);
    lustEnemyGraphics.fillCircle(8, 4, 3);
    // Alluring eyes
    lustEnemyGraphics.fillStyle(0xffffff);
    lustEnemyGraphics.fillCircle(6, 3, 1);
    lustEnemyGraphics.fillCircle(10, 3, 1);
    lustEnemyGraphics.fillStyle(0x000000);
    lustEnemyGraphics.fillRect(6, 3, 1, 1);
    lustEnemyGraphics.fillRect(10, 3, 1, 1);
    // Heart symbol
    lustEnemyGraphics.fillStyle(0xbe185d);
    lustEnemyGraphics.fillCircle(7, 8, 2);
    lustEnemyGraphics.fillCircle(9, 8, 2);
    lustEnemyGraphics.fillTriangle(5, 9, 11, 9, 8, 13);
    lustEnemyGraphics.generateTexture('enemy_lust', TILE_SIZE, TILE_SIZE);
    lustEnemyGraphics.destroy();

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

    // === LORE OBJECTS ===

    // Stone Tablet (carved stone slab with runes)
    const tabletGraphics = this.make.graphics({ x: 0, y: 0 });
    // Stone base
    tabletGraphics.fillStyle(0x6b7280);
    tabletGraphics.fillRect(3, 2, 10, 12);
    // Darker edges
    tabletGraphics.fillStyle(0x4b5563);
    tabletGraphics.fillRect(3, 2, 1, 12);
    tabletGraphics.fillRect(12, 2, 1, 12);
    tabletGraphics.fillRect(3, 13, 10, 1);
    // Top rounded corner effect
    tabletGraphics.fillStyle(0x6b7280);
    tabletGraphics.fillRect(4, 1, 8, 1);
    // Carved rune lines (cyan glow)
    tabletGraphics.fillStyle(0x22d3ee);
    tabletGraphics.fillRect(5, 4, 6, 1);
    tabletGraphics.fillRect(5, 6, 4, 1);
    tabletGraphics.fillRect(5, 8, 5, 1);
    tabletGraphics.fillRect(5, 10, 3, 1);
    tabletGraphics.generateTexture('lore_tablet', TILE_SIZE, TILE_SIZE);
    tabletGraphics.destroy();

    // Wall Scratch (faint marks scratched into surface)
    const scratchGraphics = this.make.graphics({ x: 0, y: 0 });
    // Faint scratch marks
    scratchGraphics.fillStyle(0x9ca3af, 0.6);
    // Horizontal scratches
    scratchGraphics.fillRect(2, 3, 8, 1);
    scratchGraphics.fillRect(3, 5, 6, 1);
    scratchGraphics.fillRect(1, 7, 9, 1);
    scratchGraphics.fillRect(4, 9, 5, 1);
    // Some diagonal marks
    scratchGraphics.fillRect(10, 2, 1, 1);
    scratchGraphics.fillRect(11, 3, 1, 1);
    scratchGraphics.fillRect(10, 6, 1, 1);
    scratchGraphics.fillRect(11, 7, 1, 1);
    scratchGraphics.generateTexture('lore_scratch', TILE_SIZE, TILE_SIZE);
    scratchGraphics.destroy();

    // Ghostly Whisper (translucent spirit face)
    const whisperGraphics = this.make.graphics({ x: 0, y: 0 });
    // Ethereal glow (outer)
    whisperGraphics.fillStyle(0xffffff, 0.2);
    whisperGraphics.fillCircle(8, 8, 7);
    // Spirit face (inner)
    whisperGraphics.fillStyle(0xffffff, 0.4);
    whisperGraphics.fillCircle(8, 7, 5);
    // Flowing lower part
    whisperGraphics.fillStyle(0xffffff, 0.3);
    whisperGraphics.fillTriangle(4, 10, 12, 10, 8, 15);
    // Eyes (hollow)
    whisperGraphics.fillStyle(0x1f2937, 0.8);
    whisperGraphics.fillCircle(6, 6, 1.5);
    whisperGraphics.fillCircle(10, 6, 1.5);
    // Mouth (open, wailing)
    whisperGraphics.fillCircle(8, 9, 1.5);
    whisperGraphics.generateTexture('lore_whisper', TILE_SIZE, TILE_SIZE);
    whisperGraphics.destroy();

    // === GOLD COIN ===
    const goldCoinGraphics = this.make.graphics({ x: 0, y: 0 });
    // Coin body
    goldCoinGraphics.fillStyle(0xffd700);
    goldCoinGraphics.fillCircle(6, 6, 5);
    // Highlight
    goldCoinGraphics.fillStyle(0xffec8b);
    goldCoinGraphics.fillCircle(4, 4, 2);
    // Shadow/depth
    goldCoinGraphics.fillStyle(0xdaa520);
    goldCoinGraphics.fillCircle(7, 7, 2);
    goldCoinGraphics.generateTexture('gold_coin', 12, 12);
    goldCoinGraphics.destroy();

    // === TAVERN / SHOP ROOM ===

    // Shrine floor (sacred stone tiles)
    const tavernFloorGraphics = this.make.graphics({ x: 0, y: 0 });
    tavernFloorGraphics.fillStyle(0x4a5568);
    tavernFloorGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Stone tile pattern
    tavernFloorGraphics.fillStyle(0x3d4451);
    tavernFloorGraphics.fillRect(0, 0, TILE_SIZE, 1);
    tavernFloorGraphics.fillRect(0, 0, 1, TILE_SIZE);
    tavernFloorGraphics.fillRect(7, 0, 1, TILE_SIZE);
    tavernFloorGraphics.fillRect(0, 7, TILE_SIZE, 1);
    // Subtle golden cross inlay hint
    tavernFloorGraphics.fillStyle(0x6b6b4a);
    tavernFloorGraphics.fillRect(7, 3, 2, 10);
    tavernFloorGraphics.fillRect(4, 6, 8, 2);
    tavernFloorGraphics.generateTexture('floor_tavern', TILE_SIZE, TILE_SIZE);
    tavernFloorGraphics.destroy();

    // Shrine wall (sacred stone with golden trim)
    const tavernWallGraphics = this.make.graphics({ x: 0, y: 0 });
    tavernWallGraphics.fillStyle(0x374151);
    tavernWallGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    // Stone texture
    tavernWallGraphics.fillStyle(0x2d3748);
    tavernWallGraphics.fillRect(0, 0, TILE_SIZE, 2);
    tavernWallGraphics.fillRect(0, 7, TILE_SIZE, 1);
    tavernWallGraphics.fillRect(0, 14, TILE_SIZE, 2);
    // Golden trim at bottom
    tavernWallGraphics.fillStyle(0xb8860b);
    tavernWallGraphics.fillRect(0, 14, TILE_SIZE, 2);
    tavernWallGraphics.generateTexture('wall_tavern', TILE_SIZE, TILE_SIZE);
    tavernWallGraphics.destroy();

    // === WORLD-SPECIFIC TEXTURES (7 Sin Worlds) ===
    this.createWorldTextures();

    // Guardian Angel (shopkeeper)
    const shopkeeperGraphics = this.make.graphics({ x: 0, y: 0 });
    // Wings (behind body)
    shopkeeperGraphics.fillStyle(0xe5e7eb);
    shopkeeperGraphics.fillTriangle(0, 8, 5, 4, 5, 12); // Left wing
    shopkeeperGraphics.fillTriangle(16, 8, 11, 4, 11, 12); // Right wing
    shopkeeperGraphics.fillStyle(0xf3f4f6);
    shopkeeperGraphics.fillTriangle(1, 8, 5, 5, 5, 11);
    shopkeeperGraphics.fillTriangle(15, 8, 11, 5, 11, 11);
    // White robe body
    shopkeeperGraphics.fillStyle(0xf9fafb);
    shopkeeperGraphics.fillTriangle(8, 5, 3, 15, 13, 15);
    // Robe shading
    shopkeeperGraphics.fillStyle(0xe5e7eb);
    shopkeeperGraphics.fillTriangle(8, 7, 4, 15, 8, 15);
    // Head
    shopkeeperGraphics.fillStyle(0xfcd9b6);
    shopkeeperGraphics.fillCircle(8, 4, 3);
    // Halo (golden ring)
    shopkeeperGraphics.fillStyle(0xfbbf24);
    shopkeeperGraphics.fillCircle(8, 0, 3);
    shopkeeperGraphics.fillStyle(0x1a1a2e);
    shopkeeperGraphics.fillCircle(8, 0, 2);
    shopkeeperGraphics.fillStyle(0xfbbf24);
    shopkeeperGraphics.fillCircle(8, 0, 1);
    // Serene eyes
    shopkeeperGraphics.fillStyle(0x60a5fa);
    shopkeeperGraphics.fillRect(6, 3, 1, 1);
    shopkeeperGraphics.fillRect(9, 3, 1, 1);
    // Golden trim on robe
    shopkeeperGraphics.fillStyle(0xfbbf24);
    shopkeeperGraphics.fillRect(3, 14, 10, 1);
    shopkeeperGraphics.generateTexture('shopkeeper', TILE_SIZE, TILE_SIZE);
    shopkeeperGraphics.destroy();

    // Heal fountain (stone fountain with blue water)
    const fountainGraphics = this.make.graphics({ x: 0, y: 0 });
    // Base
    fountainGraphics.fillStyle(0x6b7280);
    fountainGraphics.fillRect(2, 12, 12, 4);
    // Basin
    fountainGraphics.fillStyle(0x4b5563);
    fountainGraphics.fillRect(1, 8, 14, 5);
    // Water
    fountainGraphics.fillStyle(0x3b82f6);
    fountainGraphics.fillRect(2, 9, 12, 3);
    fountainGraphics.fillStyle(0x60a5fa);
    fountainGraphics.fillRect(3, 10, 4, 1);
    // Center pillar
    fountainGraphics.fillStyle(0x6b7280);
    fountainGraphics.fillRect(6, 4, 4, 6);
    // Water spout
    fountainGraphics.fillStyle(0x93c5fd);
    fountainGraphics.fillRect(7, 2, 2, 3);
    fountainGraphics.generateTexture('fountain', TILE_SIZE, TILE_SIZE);
    fountainGraphics.destroy();

    // Reroll crystal (purple floating crystal)
    const rerollCrystalGraphics = this.make.graphics({ x: 0, y: 0 });
    // Crystal body (diamond shape)
    rerollCrystalGraphics.fillStyle(0x8b5cf6);
    rerollCrystalGraphics.fillTriangle(8, 1, 3, 8, 13, 8); // Top
    rerollCrystalGraphics.fillTriangle(8, 15, 3, 8, 13, 8); // Bottom
    // Inner shine
    rerollCrystalGraphics.fillStyle(0xc4b5fd);
    rerollCrystalGraphics.fillTriangle(8, 3, 5, 8, 11, 8);
    // Highlight
    rerollCrystalGraphics.fillStyle(0xede9fe);
    rerollCrystalGraphics.fillRect(6, 5, 2, 2);
    // Floating particles
    rerollCrystalGraphics.fillStyle(0xa78bfa, 0.7);
    rerollCrystalGraphics.fillCircle(2, 4, 1);
    rerollCrystalGraphics.fillCircle(14, 6, 1);
    rerollCrystalGraphics.fillCircle(3, 12, 1);
    rerollCrystalGraphics.generateTexture('reroll_crystal', TILE_SIZE, TILE_SIZE);
    rerollCrystalGraphics.destroy();

    // Exit portal (green swirling vortex)
    const exitPortalGraphics = this.make.graphics({ x: 0, y: 0 });
    // Outer glow
    exitPortalGraphics.fillStyle(0x10b981, 0.3);
    exitPortalGraphics.fillCircle(8, 8, 8);
    // Swirl rings
    exitPortalGraphics.lineStyle(2, 0x34d399);
    exitPortalGraphics.strokeCircle(8, 8, 6);
    exitPortalGraphics.lineStyle(2, 0x6ee7b7);
    exitPortalGraphics.strokeCircle(8, 8, 4);
    // Center
    exitPortalGraphics.fillStyle(0xa7f3d0);
    exitPortalGraphics.fillCircle(8, 8, 2);
    // Swirl marks
    exitPortalGraphics.fillStyle(0x34d399);
    exitPortalGraphics.fillRect(7, 2, 2, 2);
    exitPortalGraphics.fillRect(12, 7, 2, 2);
    exitPortalGraphics.fillRect(7, 12, 2, 2);
    exitPortalGraphics.fillRect(2, 7, 2, 2);
    exitPortalGraphics.generateTexture('exit_portal', TILE_SIZE, TILE_SIZE);
    exitPortalGraphics.destroy();

    // Wall torch (decorative)
    const torchGraphics = this.make.graphics({ x: 0, y: 0 });
    // Bracket
    torchGraphics.fillStyle(0x78350f);
    torchGraphics.fillRect(6, 8, 4, 8);
    // Torch head
    torchGraphics.fillStyle(0x92400e);
    torchGraphics.fillRect(5, 6, 6, 4);
    // Flame
    torchGraphics.fillStyle(0xf97316);
    torchGraphics.fillTriangle(8, 0, 4, 7, 12, 7);
    torchGraphics.fillStyle(0xfbbf24);
    torchGraphics.fillTriangle(8, 2, 6, 6, 10, 6);
    torchGraphics.fillStyle(0xfef3c7);
    torchGraphics.fillCircle(8, 4, 1);
    torchGraphics.generateTexture('torch', TILE_SIZE, TILE_SIZE);
    torchGraphics.destroy();

    // Wall candle/sconce (for dungeon atmosphere)
    const candleGraphics = this.make.graphics({ x: 0, y: 0 });
    // Metal sconce bracket
    candleGraphics.fillStyle(0x4a4a4a);
    candleGraphics.fillRect(6, 10, 4, 2);
    candleGraphics.fillRect(7, 8, 2, 4);
    // Candle body (cream/white)
    candleGraphics.fillStyle(0xfff8dc);
    candleGraphics.fillRect(6, 3, 4, 6);
    // Candle top
    candleGraphics.fillStyle(0xfffaf0);
    candleGraphics.fillRect(7, 2, 2, 2);
    // Wick
    candleGraphics.fillStyle(0x1f1f1f);
    candleGraphics.fillRect(7, 1, 2, 2);
    // Flame (warm glow)
    candleGraphics.fillStyle(0xf97316);
    candleGraphics.fillTriangle(8, -2, 5, 3, 11, 3);
    candleGraphics.fillStyle(0xfbbf24);
    candleGraphics.fillTriangle(8, -1, 6, 2, 10, 2);
    candleGraphics.fillStyle(0xfef3c7);
    candleGraphics.fillCircle(8, 1, 1);
    candleGraphics.generateTexture('candle', TILE_SIZE, TILE_SIZE);
    candleGraphics.destroy();
  }

  /**
   * Create floor and wall textures for each of the 7 sin worlds
   */
  private createWorldTextures(): void {
    for (const world of getAllWorlds()) {
      const config = getWorldConfig(world);
      const { floor: floorColor, wall: wallColor, primary: accentColor } = config.colors;

      // Floor texture for this world
      const floorGraphics = this.make.graphics({ x: 0, y: 0 });
      floorGraphics.fillStyle(floorColor);
      floorGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      // Add subtle grid lines
      floorGraphics.lineStyle(1, this.lightenColor(floorColor, 0.15));
      floorGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
      // Add subtle accent pattern
      floorGraphics.fillStyle(accentColor, 0.1);
      floorGraphics.fillRect(6, 6, 4, 4);
      floorGraphics.generateTexture(`floor_${world}`, TILE_SIZE, TILE_SIZE);
      floorGraphics.destroy();

      // Wall texture for this world
      const wallGraphics = this.make.graphics({ x: 0, y: 0 });
      wallGraphics.fillStyle(wallColor);
      wallGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      // Add brick-like pattern
      wallGraphics.lineStyle(1, this.darkenColor(wallColor, 0.2));
      wallGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
      wallGraphics.moveTo(0, TILE_SIZE / 2);
      wallGraphics.lineTo(TILE_SIZE, TILE_SIZE / 2);
      wallGraphics.stroke();
      wallGraphics.moveTo(TILE_SIZE / 2, 0);
      wallGraphics.lineTo(TILE_SIZE / 2, TILE_SIZE / 2);
      wallGraphics.stroke();
      // Add accent trim at top
      wallGraphics.fillStyle(accentColor, 0.3);
      wallGraphics.fillRect(0, 0, TILE_SIZE, 2);
      wallGraphics.generateTexture(`wall_${world}`, TILE_SIZE, TILE_SIZE);
      wallGraphics.destroy();
    }
  }

  /**
   * Lighten a color by a percentage
   */
  private lightenColor(color: number, percent: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) + 255 * percent);
    const g = Math.min(255, ((color >> 8) & 0xff) + 255 * percent);
    const b = Math.min(255, (color & 0xff) + 255 * percent);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  /**
   * Darken a color by a percentage
   */
  private darkenColor(color: number, percent: number): number {
    const r = ((color >> 16) & 0xff) * (1 - percent);
    const g = ((color >> 8) & 0xff) * (1 - percent);
    const b = (color & 0xff) * (1 - percent);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  /**
   * Load normal maps for the lighting system
   */
  private loadNormalMaps(worlds: string[], basicEnemies: string[], sinBosses: string[]): void {
    // Load tileset normal maps
    for (const world of worlds) {
      this.load.image(`tileset_${world}_n`, `assets/tilesets/normals/tileset_${world}_n.png`);
    }

    // Load player normal maps
    this.load.image('franciscan_idle_n', 'assets/characters/normals/franciscan_idle_n.png');
    this.load.image('franciscan_walk_n', 'assets/characters/normals/franciscan_walk_n.png');

    // Load basic enemy normal maps
    for (const enemy of basicEnemies) {
      this.load.image(`${enemy}_idle_n`, `assets/characters/normals/${enemy}_idle_n.png`);
      this.load.image(`${enemy}_walk_n`, `assets/characters/normals/${enemy}_walk_n.png`);
    }

    // Load sin boss normal maps
    for (const boss of sinBosses) {
      this.load.image(`${boss}_idle_n`, `assets/characters/normals/${boss}_idle_n.png`);
    }
    // Pride has walk animation
    this.load.image('pride_walk_n', 'assets/characters/normals/pride_walk_n.png');

    // Load map object normal maps
    const mapObjects = [
      'chest_closed', 'chest_open', 'shrine', 'exit_portal', 'torch',
      'skull_marker', 'spike_trap', 'lava_pit', 'door', 'lore_tablet', 'lore_whisper'
    ];
    for (const obj of mapObjects) {
      this.load.image(`${obj}_n`, `assets/objects/normals/${obj}_n.png`);
    }

    console.log('Normal maps queued for loading');
  }
}
