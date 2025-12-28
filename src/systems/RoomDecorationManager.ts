import Phaser from 'phaser';
import { Room, RoomType, DungeonData } from './DungeonGenerator';
import { TILE_SIZE } from '../utils/constants';
import { LootSystem } from './LootSystem';
import { LootDropManager } from './LootDropManager';
import { ItemRarity } from './Item';
import { Weapon } from './Weapon';
import { LightingSystem } from './LightingSystem';
import { AudioSystem } from './AudioSystem';
import { MinimapUI } from '../ui/MinimapUI';
import { Player } from '../entities/Player';
import { VisualEffectsManager } from './VisualEffectsManager';

export class RoomDecorationManager {
  private scene: Phaser.Scene;
  private player: Player;
  private dungeon: DungeonData;
  private lightingSystem: LightingSystem;
  private audioSystem: AudioSystem;
  private lootSystem: LootSystem;
  private lootDropManager: LootDropManager;
  private visualEffects: VisualEffectsManager;
  private floor: number;

  private chests!: Phaser.Physics.Arcade.Group;
  private shrines!: Phaser.Physics.Arcade.Group;
  private minimapUI: MinimapUI | null = null;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    dungeon: DungeonData,
    lightingSystem: LightingSystem,
    audioSystem: AudioSystem,
    lootSystem: LootSystem,
    lootDropManager: LootDropManager,
    visualEffects: VisualEffectsManager,
    floor: number
  ) {
    this.scene = scene;
    this.player = player;
    this.dungeon = dungeon;
    this.lightingSystem = lightingSystem;
    this.audioSystem = audioSystem;
    this.lootSystem = lootSystem;
    this.lootDropManager = lootDropManager;
    this.visualEffects = visualEffects;
    this.floor = floor;
  }

  create(): void {
    this.chests = this.scene.physics.add.group();
    this.shrines = this.scene.physics.add.group();
  }

  getChests(): Phaser.Physics.Arcade.Group {
    return this.chests;
  }

  getShrines(): Phaser.Physics.Arcade.Group {
    return this.shrines;
  }

  setMinimapUI(minimapUI: MinimapUI): void {
    this.minimapUI = minimapUI;
  }

  addRoomDecorations(onLoreCallback?: (room: Room) => void): void {
    for (const room of this.dungeon.rooms) {
      // Add candles to all rooms for atmosphere
      // Spawn room (id 0) starts lit, other rooms start dark until activated
      const startLit = room.id === 0;
      this.addWallCandles(room, startLit);

      // Call the lore callback for lore object placement
      if (onLoreCallback) {
        onLoreCallback(room);
      }

      switch (room.type) {
        case RoomType.TREASURE:
          // Add chest in center
          this.addTreasureChest(room);
          break;
        case RoomType.SHRINE:
          // Add healing shrine
          this.addHealingShrine(room);
          break;
        case RoomType.CHALLENGE:
          // Add skull markers in corners
          this.addChallengeMarkers(room);
          break;
        case RoomType.TRAP:
          // Trap room decorations handled by hazard system
          break;
      }
    }
  }

  private addTreasureChest(room: Room): void {
    const chestX = room.centerX * TILE_SIZE + TILE_SIZE / 2;
    const chestY = room.centerY * TILE_SIZE + TILE_SIZE / 2;

    const chest = this.chests.create(chestX, chestY, 'chest_closed') as Phaser.Physics.Arcade.Sprite;
    chest.setDepth(3);
    chest.setImmovable(true);
    chest.setData('opened', false);
    chest.setData('room', room);
    chest.setPipeline('Light2D');

    // Add real point light for glow
    const light = this.scene.lights.addLight(chestX, chestY, 100, 0xffd700, 0.7);
    chest.setData('light', light);

    // Pulse animation
    this.scene.tweens.add({
      targets: light,
      intensity: 1.0,
      radius: 120,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  handleChestOpen(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    chestObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const chest = chestObj as Phaser.Physics.Arcade.Sprite;
    if (chest.getData('opened')) return;

    chest.setData('opened', true);
    chest.setTexture('chest_open');

    // Notify minimap
    const room = chest.getData('room') as Room;
    if (room && this.minimapUI) {
      this.minimapUI.markChestOpened(room.id);
    }

    // Remove light
    const light = chest.getData('light') as Phaser.GameObjects.Light;
    if (light) {
      this.scene.tweens.killTweensOf(light);
      this.scene.lights.removeLight(light);
    }

    // Spawn loot - guaranteed rare+ item and weapon
    const lootX = chest.x;
    const lootY = chest.y - 20;

    this.audioSystem.play('sfx_pickup', 0.6);
    this.visualEffects.showGameMessage('Treasure found!');

    // Spawn multiple items with offset
    const treasureLoot = this.lootSystem.generateGuaranteedLoot(ItemRarity.RARE);
    this.lootDropManager.spawnItemDrop(lootX - 15, lootY, treasureLoot);

    // Chance for second item
    if (Math.random() < 0.5) {
      const bonusLoot = this.lootSystem.generateGuaranteedLoot(ItemRarity.UNCOMMON);
      this.lootDropManager.spawnItemDrop(lootX + 15, lootY, bonusLoot);
    }

    // Guaranteed weapon from treasure chests
    const weapon = Weapon.createRandom(this.floor + 3);
    this.lootDropManager.spawnWeaponDrop(lootX, lootY - 20, weapon);
  }

  private addHealingShrine(room: Room): void {
    const shrineX = room.centerX * TILE_SIZE + TILE_SIZE / 2;
    const shrineY = room.centerY * TILE_SIZE + TILE_SIZE / 2;

    const shrine = this.shrines.create(shrineX, shrineY, 'shrine') as Phaser.Physics.Arcade.Sprite;
    shrine.setDepth(3);
    shrine.setImmovable(true);
    shrine.setData('used', false);
    shrine.setData('room', room);
    shrine.setPipeline('Light2D');

    // Add real point light for glow
    const light = this.scene.lights.addLight(shrineX, shrineY, 120, 0x22d3ee, 0.8);
    shrine.setData('light', light);

    // Pulse animation
    this.scene.tweens.add({
      targets: light,
      intensity: 1.1,
      radius: 150,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Floating animation for shrine
    this.scene.tweens.add({
      targets: shrine,
      y: shrineY - 3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  handleShrineUse(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    shrineObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const shrine = shrineObj as Phaser.Physics.Arcade.Sprite;
    if (shrine.getData('used')) return;

    shrine.setData('used', true);

    // Notify minimap
    const room = shrine.getData('room') as Room;
    if (room && this.minimapUI) {
      this.minimapUI.markShrineUsed(room.id);
    }

    // Heal player to full
    const healAmount = this.player.maxHp - this.player.hp;
    this.player.hp = this.player.maxHp;

    // Remove light and fade shrine
    const light = shrine.getData('light') as Phaser.GameObjects.Light;
    if (light) {
      this.scene.tweens.killTweensOf(light);
      this.scene.tweens.add({
        targets: light,
        intensity: 0,
        duration: 500,
        onComplete: () => this.scene.lights.removeLight(light),
      });
    }

    // Fade shrine to indicate used
    this.scene.tweens.killTweensOf(shrine);
    shrine.setTint(0x666666);
    shrine.setAlpha(0.6);

    // Show healing effect
    this.audioSystem.play('sfx_levelup', 0.4);
    this.visualEffects.showGameMessage(`Healed ${healAmount} HP!`);

    // Healing particles
    for (let i = 0; i < 10; i++) {
      const particle = this.scene.add.circle(
        shrine.x + Phaser.Math.Between(-20, 20),
        shrine.y + Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(2, 4),
        0x22d3ee
      );
      particle.setDepth(100);
      particle.setAlpha(0.8);

      this.scene.tweens.add({
        targets: particle,
        y: particle.y - 40,
        alpha: 0,
        duration: Phaser.Math.Between(500, 800),
        onComplete: () => particle.destroy(),
      });
    }
  }

  private addChallengeMarkers(room: Room): void {
    // Add skull markers in corners
    const corners = [
      { x: room.x + 1, y: room.y + 1 },
      { x: room.x + room.width - 2, y: room.y + 1 },
      { x: room.x + 1, y: room.y + room.height - 2 },
      { x: room.x + room.width - 2, y: room.y + room.height - 2 },
    ];

    for (const corner of corners) {
      const marker = this.scene.add.sprite(
        corner.x * TILE_SIZE + TILE_SIZE / 2,
        corner.y * TILE_SIZE + TILE_SIZE / 2,
        'skull_marker'
      );
      marker.setDepth(2);
      marker.setAlpha(0.7);
      marker.setPipeline('Light2D');

      // Subtle pulse
      this.scene.tweens.add({
        targets: marker,
        alpha: 0.9,
        scale: 1.1,
        duration: 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private addWallCandles(room: Room, startLit: boolean = true): void {
    // Add candles along walls for atmosphere
    // Place candles at intervals along each wall, offset from corners
    // Only place candles where there's actually a wall tile
    // Torches start unlit in unvisited rooms, light up when room is sealed

    const tiles = this.dungeon.tiles;
    const candlePositions: { x: number; y: number }[] = [];

    // Helper to check if a tile is a wall
    const isWall = (x: number, y: number): boolean => {
      if (y < 0 || y >= tiles.length || x < 0 || x >= tiles[0].length) return false;
      return tiles[y][x] === 1;
    };

    // Top wall - only place if the tile above is a wall
    const topY = room.y;
    for (let x = room.x + 2; x < room.x + room.width - 2; x += 4) {
      if (isWall(x, topY - 1)) {
        candlePositions.push({ x, y: topY });
      }
    }

    // Bottom wall - only place if the tile below is a wall
    const bottomY = room.y + room.height - 1;
    for (let x = room.x + 2; x < room.x + room.width - 2; x += 4) {
      if (isWall(x, bottomY + 1)) {
        candlePositions.push({ x, y: bottomY });
      }
    }

    // Left wall - only place if the tile to the left is a wall
    const leftX = room.x;
    for (let y = room.y + 2; y < room.y + room.height - 2; y += 4) {
      if (isWall(leftX - 1, y)) {
        candlePositions.push({ x: leftX, y });
      }
    }

    // Right wall - only place if the tile to the right is a wall
    const rightX = room.x + room.width - 1;
    for (let y = room.y + 2; y < room.y + room.height - 2; y += 4) {
      if (isWall(rightX + 1, y)) {
        candlePositions.push({ x: rightX, y });
      }
    }

    // Create candle sprites with flickering animation and actual lights
    candlePositions.forEach((pos) => {
      const candleX = pos.x * TILE_SIZE + TILE_SIZE / 2;
      const candleY = pos.y * TILE_SIZE + TILE_SIZE / 2;

      const candle = this.scene.add.sprite(candleX, candleY, 'candle');
      candle.setDepth(5);
      // Apply Light2D pipeline so candle sprite is lit properly
      candle.setPipeline('Light2D');

      // Create actual point light at candle position
      // Pass room ID so we can light up torches when room is activated
      if (this.lightingSystem) {
        this.lightingSystem.createTorchLight(candleX, candleY, undefined, room.id, startLit);
      }

      // Subtle flicker animation for the sprite
      this.scene.tweens.add({
        targets: candle,
        alpha: { from: 0.85, to: 1 },
        scaleX: { from: 0.95, to: 1.05 },
        duration: Phaser.Math.Between(150, 300),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 500),
      });
    });
  }
}
