import Phaser from 'phaser';
import { AudioSystem } from '../systems/AudioSystem';
import { AssetGenerator } from '../systems/AssetGenerator';

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
    const assetGenerator = new AssetGenerator(this);
    assetGenerator.generateAll();

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
