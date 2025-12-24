import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { FastEnemy, TankEnemy, RangedEnemy, BossEnemy } from '../entities/enemies/EnemyTypes';
import { TILE_SIZE, DUNGEON_WIDTH, DUNGEON_HEIGHT } from '../utils/constants';
import { DungeonGenerator, DungeonData, Room, RoomType } from '../systems/DungeonGenerator';
import { CombatSystem } from '../systems/CombatSystem';
import { LootSystem } from '../systems/LootSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { Item, ItemType, RARITY_COLORS, ItemRarity, createItemFromWeapon } from '../systems/Item';
import { InventoryUI } from '../ui/InventoryUI';
import { MinimapUI } from '../ui/MinimapUI';
import { LevelUpUI } from '../ui/LevelUpUI';
import { RoomManager } from '../systems/RoomManager';
import { HazardSystem } from '../systems/HazardSystem';
import { Weapon, WeaponType } from '../systems/Weapon';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private dungeon!: DungeonData;
  private dungeonGenerator!: DungeonGenerator;
  private wallLayer!: Phaser.GameObjects.Group;
  private floorLayer!: Phaser.GameObjects.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private projectiles!: Phaser.Physics.Arcade.Group;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private itemDrops!: Phaser.Physics.Arcade.Group;
  private weaponDrops!: Phaser.Physics.Arcade.Group;
  private goldDrops!: Phaser.Physics.Arcade.Group;
  private healthBars: Map<Enemy, Phaser.GameObjects.Container> = new Map();
  private combatSystem!: CombatSystem;
  private lootSystem!: LootSystem;
  private audioSystem!: AudioSystem;
  private inventoryUI!: InventoryUI;
  private minimapUI!: MinimapUI;
  private levelUpUI!: LevelUpUI;
  private roomManager!: RoomManager;
  private hazardSystem!: HazardSystem;
  private floor: number = 1;
  private canExit: boolean = true;
  private isBossFloor: boolean = false;
  private isFinalBoss: boolean = false;
  private enemiesKilled: number = 0;
  private itemsCollected: number = 0;
  private readonly FINAL_FLOOR = 20;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.floor = this.registry.get('floor') || 1;
    this.canExit = true;
    this.isBossFloor = this.floor % 5 === 0;
    this.isFinalBoss = this.floor === this.FINAL_FLOOR;
    this.healthBars = new Map();

    // Persist stats across floor transitions
    this.enemiesKilled = this.registry.get('enemiesKilled') || 0;
    this.itemsCollected = this.registry.get('itemsCollected') || 0;

    this.combatSystem = new CombatSystem(this);
    this.lootSystem = new LootSystem(0.5);
    this.audioSystem = new AudioSystem(this);

    this.dungeonGenerator = new DungeonGenerator(DUNGEON_WIDTH, DUNGEON_HEIGHT);
    this.dungeon = this.dungeonGenerator.generate();

    this.physics.world.setBounds(0, 0, DUNGEON_WIDTH * TILE_SIZE, DUNGEON_HEIGHT * TILE_SIZE);

    this.createDungeonTiles();

    const spawnX = this.dungeon.spawnPoint.x * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = this.dungeon.spawnPoint.y * TILE_SIZE + TILE_SIZE / 2;
    this.player = new Player(this, spawnX, spawnY);

    // Restore player from ShopScene if coming from there
    const shopData = this.registry.get('shopData') as {
      floor: number;
      playerStats: ReturnType<Player['getSaveData']>;
      inventorySerialized: string;
    } | undefined;

    if (shopData) {
      this.player.restoreFromSave(shopData.playerStats);
      this.player.inventory.deserialize(shopData.inventorySerialized);
      this.player.recalculateStats();
      // Clear shopData so it doesn't persist across sessions
      this.registry.remove('shopData');
      // Save progress after shop
      this.saveGame();
    }

    // Create special room object groups (must be before addRoomDecorations)
    this.chests = this.physics.add.group();
    this.shrines = this.physics.add.group();

    // Add room decorations (chests, shrines) after player exists for physics overlaps
    this.addRoomDecorations();

    // Setup special room collisions
    this.physics.add.overlap(
      this.player, this.chests,
      this.handleChestOpen as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );
    this.physics.add.overlap(
      this.player, this.shrines,
      this.handleShrineUse as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    // Create projectile groups
    this.projectiles = this.physics.add.group({ runChildUpdate: true });
    this.enemyProjectiles = this.physics.add.group({ runChildUpdate: true });
    this.itemDrops = this.physics.add.group();
    this.weaponDrops = this.physics.add.group();
    this.goldDrops = this.physics.add.group();

    // Create enemies group (enemies spawn on room entry)
    this.enemies = this.physics.add.group({ runChildUpdate: false });

    // Create room manager for door/room mechanics
    this.roomManager = new RoomManager(this, this.dungeon);

    // Create hazard system
    this.hazardSystem = new HazardSystem(this, this.player, this.floor);
    this.hazardSystem.setRoomManager(this.roomManager);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, DUNGEON_WIDTH * TILE_SIZE, DUNGEON_HEIGHT * TILE_SIZE);

    this.createExit();
    this.setupCollisions();
    this.setupEventHandlers();
    this.setupPlayerAttack();
    this.setupKeyboardControls();

    // Load saved player data if on floor 1 and save exists
    this.loadSavedGame();

    this.inventoryUI = new InventoryUI(this, this.player);
    this.minimapUI = new MinimapUI(this, this.dungeon);
    this.levelUpUI = new LevelUpUI(this, this.player);
    this.createHUD();

    // Boss floor announcement
    if (this.isBossFloor) {
      this.showBossAnnouncement();
    }
  }

  update(time: number, delta: number): void {
    if (this.inventoryUI.getIsVisible() || this.levelUpUI.getIsVisible()) return;

    this.player.update(time, delta);

    // Check for room entry (returns room if entering a new unvisited room)
    const enteredRoom = this.roomManager.update(this.player.x, this.player.y);
    if (enteredRoom) {
      this.spawnEnemiesInRoom(enteredRoom);
      this.hazardSystem.spawnHazardsInRoom(enteredRoom, this.dungeon);
    }

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as unknown as Enemy;
      if (enemy.active) {
        enemy.update(time, delta);
        this.updateHealthBar(enemy);
      }
    });

    // Update hazards
    this.hazardSystem.update(delta);

    this.minimapUI.update(this.player.x, this.player.y);
    this.updateHUD();
  }

  private createDungeonTiles(): void {
    this.floorLayer = this.add.group();
    this.wallLayer = this.physics.add.staticGroup();

    for (let y = 0; y < DUNGEON_HEIGHT; y++) {
      for (let x = 0; x < DUNGEON_WIDTH; x++) {
        const tileX = x * TILE_SIZE;
        const tileY = y * TILE_SIZE;

        if (this.dungeon.tiles[y][x] === 1) {
          const wall = this.wallLayer.create(tileX, tileY, 'wall') as Phaser.Physics.Arcade.Sprite;
          wall.setOrigin(0, 0);
          wall.setImmovable(true);
          wall.refreshBody();
        } else if (this.dungeon.tiles[y][x] === 0) {
          // Determine floor texture based on room type
          const room = this.getRoomAtTile(x, y);
          const floorTexture = this.getFloorTextureForRoom(room);
          const floor = this.add.sprite(tileX, tileY, floorTexture).setOrigin(0, 0);
          floor.setDepth(0);
          this.floorLayer.add(floor);
        }
      }
    }
  }

  private getRoomAtTile(x: number, y: number): Room | null {
    for (const room of this.dungeon.rooms) {
      if (x >= room.x && x < room.x + room.width &&
          y >= room.y && y < room.y + room.height) {
        return room;
      }
    }
    return null;
  }

  private getFloorTextureForRoom(room: Room | null): string {
    if (!room) return 'floor'; // Corridors use normal floor

    switch (room.type) {
      case RoomType.TREASURE:
        return 'floor_treasure';
      case RoomType.TRAP:
        return 'floor_trap';
      case RoomType.SHRINE:
        return 'floor_shrine';
      case RoomType.CHALLENGE:
        return 'floor_challenge';
      default:
        return 'floor';
    }
  }

  private addRoomDecorations(): void {
    for (const room of this.dungeon.rooms) {
      // Add candles to all rooms for atmosphere
      this.addWallCandles(room);

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

  private chests!: Phaser.Physics.Arcade.Group;
  private shrines!: Phaser.Physics.Arcade.Group;

  private addTreasureChest(room: Room): void {
    const chestX = room.centerX * TILE_SIZE + TILE_SIZE / 2;
    const chestY = room.centerY * TILE_SIZE + TILE_SIZE / 2;

    const chest = this.chests.create(chestX, chestY, 'chest_closed') as Phaser.Physics.Arcade.Sprite;
    chest.setDepth(3);
    chest.setImmovable(true);
    chest.setData('opened', false);
    chest.setData('room', room);

    // Add glow effect
    const glow = this.add.sprite(chestX, chestY, 'weapon_drop_glow');
    glow.setDepth(2);
    glow.setTint(0xffd700);
    glow.setAlpha(0.4);
    glow.setScale(1.5);
    chest.setData('glow', glow);

    // Pulse animation
    this.tweens.add({
      targets: glow,
      alpha: 0.7,
      scale: 1.8,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private handleChestOpen(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    chestObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const chest = chestObj as Phaser.Physics.Arcade.Sprite;
    if (chest.getData('opened')) return;

    chest.setData('opened', true);
    chest.setTexture('chest_open');

    // Notify minimap
    const room = chest.getData('room') as Room;
    if (room) {
      this.minimapUI.markChestOpened(room.id);
    }

    // Remove glow
    const glow = chest.getData('glow') as Phaser.GameObjects.Sprite;
    if (glow) {
      this.tweens.killTweensOf(glow);
      glow.destroy();
    }

    // Spawn loot - guaranteed rare+ item and weapon
    const lootX = chest.x;
    const lootY = chest.y - 20;

    this.audioSystem.play('sfx_pickup', 0.6);
    this.showGameMessage('Treasure found!');

    // Spawn multiple items with offset
    const treasureLoot = this.lootSystem.generateGuaranteedLoot(ItemRarity.RARE);
    this.spawnItemDrop(lootX - 15, lootY, treasureLoot);

    // Chance for second item
    if (Math.random() < 0.5) {
      const bonusLoot = this.lootSystem.generateGuaranteedLoot(ItemRarity.UNCOMMON);
      this.spawnItemDrop(lootX + 15, lootY, bonusLoot);
    }

    // Guaranteed weapon from treasure chests
    const weapon = Weapon.createRandom(this.floor + 3);
    this.spawnWeaponDrop(lootX, lootY - 20, weapon);
  }

  private addHealingShrine(room: Room): void {
    const shrineX = room.centerX * TILE_SIZE + TILE_SIZE / 2;
    const shrineY = room.centerY * TILE_SIZE + TILE_SIZE / 2;

    const shrine = this.shrines.create(shrineX, shrineY, 'shrine') as Phaser.Physics.Arcade.Sprite;
    shrine.setDepth(3);
    shrine.setImmovable(true);
    shrine.setData('used', false);
    shrine.setData('room', room);

    // Add ambient glow
    const glow = this.add.sprite(shrineX, shrineY, 'weapon_drop_glow');
    glow.setDepth(2);
    glow.setTint(0x22d3ee);
    glow.setAlpha(0.5);
    glow.setScale(2);
    shrine.setData('glow', glow);

    // Pulse animation
    this.tweens.add({
      targets: glow,
      alpha: 0.8,
      scale: 2.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Floating animation for shrine
    this.tweens.add({
      targets: shrine,
      y: shrineY - 3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private handleShrineUse(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    shrineObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const shrine = shrineObj as Phaser.Physics.Arcade.Sprite;
    if (shrine.getData('used')) return;

    shrine.setData('used', true);

    // Notify minimap
    const room = shrine.getData('room') as Room;
    if (room) {
      this.minimapUI.markShrineUsed(room.id);
    }

    // Heal player to full
    const healAmount = this.player.maxHp - this.player.hp;
    this.player.hp = this.player.maxHp;

    // Remove glow and fade shrine
    const glow = shrine.getData('glow') as Phaser.GameObjects.Sprite;
    if (glow) {
      this.tweens.killTweensOf(glow);
      this.tweens.add({
        targets: glow,
        alpha: 0,
        duration: 500,
        onComplete: () => glow.destroy(),
      });
    }

    // Fade shrine to indicate used
    this.tweens.killTweensOf(shrine);
    shrine.setTint(0x666666);
    shrine.setAlpha(0.6);

    // Show healing effect
    this.audioSystem.play('sfx_levelup', 0.4);
    this.showGameMessage(`Healed ${healAmount} HP!`);

    // Healing particles
    for (let i = 0; i < 10; i++) {
      const particle = this.add.circle(
        shrine.x + Phaser.Math.Between(-20, 20),
        shrine.y + Phaser.Math.Between(-20, 20),
        Phaser.Math.Between(2, 4),
        0x22d3ee
      );
      particle.setDepth(100);
      particle.setAlpha(0.8);

      this.tweens.add({
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
      const marker = this.add.sprite(
        corner.x * TILE_SIZE + TILE_SIZE / 2,
        corner.y * TILE_SIZE + TILE_SIZE / 2,
        'skull_marker'
      );
      marker.setDepth(2);
      marker.setAlpha(0.7);

      // Subtle pulse
      this.tweens.add({
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

  private addWallCandles(room: Room): void {
    // Add candles along walls for atmosphere
    // Place candles at intervals along each wall, offset from corners

    const candlePositions: { x: number; y: number }[] = [];

    // Top wall (inside room, on wall)
    const topY = room.y;
    for (let x = room.x + 2; x < room.x + room.width - 2; x += 4) {
      candlePositions.push({ x, y: topY });
    }

    // Bottom wall
    const bottomY = room.y + room.height - 1;
    for (let x = room.x + 2; x < room.x + room.width - 2; x += 4) {
      candlePositions.push({ x, y: bottomY });
    }

    // Left wall
    const leftX = room.x;
    for (let y = room.y + 2; y < room.y + room.height - 2; y += 4) {
      candlePositions.push({ x: leftX, y });
    }

    // Right wall
    const rightX = room.x + room.width - 1;
    for (let y = room.y + 2; y < room.y + room.height - 2; y += 4) {
      candlePositions.push({ x: rightX, y });
    }

    // Create candle sprites with flickering animation
    candlePositions.forEach((pos) => {
      const candle = this.add.sprite(
        pos.x * TILE_SIZE + TILE_SIZE / 2,
        pos.y * TILE_SIZE + TILE_SIZE / 2,
        'candle'
      );
      candle.setDepth(5);

      // Subtle flicker animation
      this.tweens.add({
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

  private spawnEnemiesInRoom(room: Room): void {
    const exitRoom = this.dungeon.rooms[this.dungeon.rooms.length - 1];
    const isBossRoom = this.isBossFloor && room.id === exitRoom.id;
    const isChallengeRoom = room.type === RoomType.CHALLENGE;

    // Calculate enemy count based on floor and room size (or 1 for boss)
    let enemyCount: number;
    if (isBossRoom) {
      enemyCount = 1;
    } else if (isChallengeRoom) {
      // Challenge rooms have more enemies
      const roomArea = room.width * room.height;
      const baseCount = Math.max(2, Math.floor(roomArea / 100));
      enemyCount = Math.min(baseCount + Math.floor(this.floor / 2), 8);
    } else {
      const roomArea = room.width * room.height;
      const baseCount = Math.max(1, Math.floor(roomArea / 150));
      enemyCount = Math.min(baseCount + Math.floor(this.floor / 3), 6);
    }

    // Generate spawn positions
    const spawnPositions: { x: number; y: number }[] = [];
    for (let i = 0; i < enemyCount; i++) {
      const x = (room.x + 2 + Math.floor(Math.random() * (room.width - 4))) * TILE_SIZE + TILE_SIZE / 2;
      const y = (room.y + 2 + Math.floor(Math.random() * (room.height - 4))) * TILE_SIZE + TILE_SIZE / 2;
      spawnPositions.push({ x, y });
    }

    // Activate the room immediately (closes doors)
    this.roomManager.activateRoom(room.id, enemyCount);
    this.audioSystem.play('sfx_hit', 0.3); // Door slam sound
    this.shakeCamera(isBossRoom ? 8 : 3, isBossRoom ? 300 : 150);

    // Show spawn indicators
    const indicators: Phaser.GameObjects.Graphics[] = [];
    const indicatorSize = isBossRoom ? TILE_SIZE * 1.5 : isChallengeRoom ? TILE_SIZE * 1.0 : TILE_SIZE * 0.8;
    const indicatorColor = isBossRoom ? 0xfbbf24 : isChallengeRoom ? 0xaa00ff : 0xff4444;

    for (const pos of spawnPositions) {
      const indicator = this.add.graphics();
      indicator.setDepth(10);
      indicators.push(indicator);

      // Pulsing warning circle
      let pulseProgress = 0;
      const pulseTimer = this.time.addEvent({
        delay: 50,
        callback: () => {
          pulseProgress += 0.1;
          indicator.clear();

          // Outer warning ring
          const alpha = 0.3 + Math.sin(pulseProgress * 8) * 0.2;
          indicator.lineStyle(isBossRoom ? 3 : 2, indicatorColor, alpha);
          indicator.strokeCircle(pos.x, pos.y, indicatorSize);

          // Inner fill
          indicator.fillStyle(indicatorColor, 0.15 + Math.sin(pulseProgress * 8) * 0.1);
          indicator.fillCircle(pos.x, pos.y, indicatorSize * 0.75);
        },
        repeat: -1,
      });

      // Store timer for cleanup
      indicator.setData('pulseTimer', pulseTimer);
    }

    // Spawn enemies after delay (longer for boss)
    const spawnDelay = isBossRoom ? 2000 : 1200;
    this.time.delayedCall(spawnDelay, () => {
      // Clean up indicators
      for (const indicator of indicators) {
        const timer = indicator.getData('pulseTimer') as Phaser.Time.TimerEvent;
        if (timer) timer.destroy();
        indicator.destroy();
      }

      // Spawn enemies at the positions
      for (const pos of spawnPositions) {
        let enemy: Enemy;
        if (isBossRoom) {
          const boss = new BossEnemy(this, pos.x, pos.y, this.floor);
          boss.setProjectileGroup(this.enemyProjectiles);
          enemy = boss;
        } else if (isChallengeRoom) {
          // Challenge rooms spawn tougher enemy variants
          enemy = this.createChallengeEnemy(pos.x, pos.y);
        } else {
          enemy = this.createEnemy(pos.x, pos.y);
        }
        enemy.setTarget(this.player);
        this.enemies.add(enemy as unknown as Phaser.GameObjects.GameObject);
        this.createHealthBar(enemy);

        // Mark challenge room enemies for better rewards
        if (isChallengeRoom) {
          enemy.setData('challengeEnemy', true);
        }

        // Spawn pop effect
        enemy.setScale(0);
        this.tweens.add({
          targets: enemy,
          scale: 1,
          duration: isBossRoom ? 400 : 200,
          ease: 'Back.easeOut',
        });
      }

      this.audioSystem.play('sfx_enemy_death', 0.3); // Spawn sound

      if (isBossRoom) {
        this.shakeCamera(10, 200);
      }
    });
  }

  private createEnemy(x: number, y: number): Enemy {
    const roll = Math.random();
    const hasRanged = this.floor >= 2;
    const hasTank = this.floor >= 3;

    if (hasTank && roll < 0.15) {
      return new TankEnemy(this, x, y, this.floor);
    } else if (hasRanged && roll < 0.35) {
      const ranged = new RangedEnemy(this, x, y, this.floor);
      ranged.setProjectileGroup(this.enemyProjectiles);
      return ranged;
    } else if (roll < 0.55) {
      return new FastEnemy(this, x, y, this.floor);
    } else {
      return new Enemy(this, x, y, 'enemy', {
        hp: 20 + this.floor * 5,
        attack: 5 + this.floor * 2,
        defense: 1 + Math.floor(this.floor / 2),
        speed: 60 + this.floor * 5,
        xpValue: 20 + this.floor * 5,
      });
    }
  }

  private createChallengeEnemy(x: number, y: number): Enemy {
    // Challenge rooms spawn tougher enemy variants with higher chance of elites
    const roll = Math.random();
    const effectiveFloor = this.floor + 2; // Enemies are tougher as if from later floor

    if (roll < 0.3) {
      // 30% chance for tank in challenge rooms
      return new TankEnemy(this, x, y, effectiveFloor);
    } else if (roll < 0.55) {
      // 25% chance for ranged
      const ranged = new RangedEnemy(this, x, y, effectiveFloor);
      ranged.setProjectileGroup(this.enemyProjectiles);
      return ranged;
    } else if (roll < 0.75) {
      // 20% chance for fast
      return new FastEnemy(this, x, y, effectiveFloor);
    } else {
      // 25% chance for elite basic enemy (buffed stats)
      return new Enemy(this, x, y, 'enemy', {
        hp: 30 + effectiveFloor * 6,
        attack: 7 + effectiveFloor * 2,
        defense: 2 + Math.floor(effectiveFloor / 2),
        speed: 70 + effectiveFloor * 5,
        xpValue: 35 + effectiveFloor * 5, // More XP for challenge enemies
      });
    }
  }

  private createHealthBar(enemy: Enemy): void {
    const container = this.add.container(enemy.x, enemy.y - 15);
    container.setDepth(50);

    const bgWidth = enemy instanceof BossEnemy ? 40 : 20;
    const bg = this.add.rectangle(0, 0, bgWidth, 4, 0x333333);
    const bar = this.add.rectangle(-bgWidth / 2, 0, bgWidth, 4, 0x22cc22);
    bar.setOrigin(0, 0.5);
    bar.setName('bar');

    container.add([bg, bar]);
    this.healthBars.set(enemy, container);
  }

  private updateHealthBar(enemy: Enemy): void {
    const container = this.healthBars.get(enemy);
    if (!container) return;

    container.setPosition(enemy.x, enemy.y - 15);

    const bar = container.getByName('bar') as Phaser.GameObjects.Rectangle;
    if (bar) {
      const percent = enemy.hp / enemy.maxHp;
      const maxWidth = enemy instanceof BossEnemy ? 40 : 20;
      bar.width = maxWidth * Math.max(0, percent);

      // Color based on health
      if (percent > 0.5) bar.setFillStyle(0x22cc22);
      else if (percent > 0.25) bar.setFillStyle(0xcccc22);
      else bar.setFillStyle(0xcc2222);
    }
  }

  private removeHealthBar(enemy: Enemy): void {
    const container = this.healthBars.get(enemy);
    if (container) {
      container.destroy();
      this.healthBars.delete(enemy);
    }
  }

  private exit!: Phaser.Physics.Arcade.Sprite;

  private createExit(): void {
    const exitX = this.dungeon.exitPoint.x * TILE_SIZE + TILE_SIZE / 2;
    const exitY = this.dungeon.exitPoint.y * TILE_SIZE + TILE_SIZE / 2;
    this.exit = this.physics.add.sprite(exitX, exitY, 'exit');
    this.exit.setDepth(1);
    this.exit.setImmovable(true);
    if (this.exit.body) {
      this.exit.body.setSize(TILE_SIZE * 1.5, TILE_SIZE * 1.5);
    }
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.player, this.wallLayer);
    this.physics.add.collider(this.enemies, this.wallLayer);
    this.physics.add.collider(this.enemies, this.enemies);

    this.physics.add.overlap(
      this.player, this.enemies,
      this.handlePlayerEnemyCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    this.physics.add.overlap(
      this.projectiles, this.enemies,
      this.handleProjectileEnemyCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    this.physics.add.collider(
      this.projectiles, this.wallLayer,
      this.handleProjectileWallCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    // Enemy projectiles vs player
    this.physics.add.overlap(
      this.player, this.enemyProjectiles,
      this.handleEnemyProjectilePlayerCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    this.physics.add.collider(
      this.enemyProjectiles, this.wallLayer,
      this.handleProjectileWallCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    this.physics.add.overlap(
      this.player, this.exit,
      this.handleExitCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    this.physics.add.overlap(
      this.player, this.itemDrops,
      this.handleItemPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    this.physics.add.overlap(
      this.player, this.weaponDrops,
      this.handleWeaponPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    this.physics.add.overlap(
      this.player, this.goldDrops,
      this.handleGoldPickup as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    // Door collision
    this.physics.add.collider(this.player, this.roomManager.getDoorGroup());
    this.physics.add.collider(this.enemies, this.roomManager.getDoorGroup());

    // Hazard arrow collision with walls
    this.physics.add.collider(
      this.hazardSystem.getArrowGroup(), this.wallLayer,
      this.handleProjectileWallCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );
  }

  private handlePlayerEnemyCollision(
    playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    enemyObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const player = playerObj as unknown as Player;
    const enemy = enemyObj as unknown as Enemy;

    if (player.getIsInvulnerable() || this.devMode) return;

    const result = this.combatSystem.calculateDamage(enemy, player);
    this.combatSystem.applyDamage(player, result);
    this.audioSystem.play('sfx_hurt', 0.4);
    this.shakeCamera(5, 100);
    this.showDamageNumber(player.x, player.y, result.damage, true);
  }

  private handleProjectileEnemyCollision(
    projectileObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    enemyObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const projectile = projectileObj as Phaser.Physics.Arcade.Sprite;
    const enemy = enemyObj as unknown as Enemy;

    // Check if this projectile already hit this enemy (for piercing)
    const hitEnemies: Set<Enemy> = projectile.getData('hitEnemies') || new Set();
    if (hitEnemies.has(enemy)) return;
    hitEnemies.add(enemy);
    projectile.setData('hitEnemies', hitEnemies);

    // Use projectile's stored damage
    const damage = projectile.getData('damage') || this.player.getAttackDamage();
    enemy.takeDamage(damage);
    this.audioSystem.play('sfx_hit', 0.3);
    this.showDamageNumber(enemy.x, enemy.y, damage, false);

    // Handle AoE explosion
    const isAoe = projectile.getData('aoe');
    if (isAoe) {
      this.createExplosionFromProjectile(projectile.x, projectile.y, projectile);
    }

    // Handle piercing - don't destroy if piercing
    const isPiercing = projectile.getData('piercing');
    if (!isPiercing) {
      projectile.destroy();
    }
  }

  private handleEnemyProjectilePlayerCollision(
    playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    projectileObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const player = playerObj as unknown as Player;
    const projectile = projectileObj as Phaser.Physics.Arcade.Sprite;

    if (player.getIsInvulnerable() || this.devMode) {
      projectile.destroy();
      return;
    }

    const damage = projectile.getData('damage') || 5;
    player.takeDamage(damage);
    this.audioSystem.play('sfx_hurt', 0.4);
    this.shakeCamera(5, 100);
    this.showDamageNumber(player.x, player.y, damage, true);
    projectile.destroy();
  }

  private handleProjectileWallCollision(
    projectileObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const projectile = projectileObj as Phaser.Physics.Arcade.Sprite;

    // Handle AoE explosion on wall hit
    const isAoe = projectile.getData('aoe');
    if (isAoe) {
      this.createExplosionFromProjectile(projectile.x, projectile.y, projectile);
    }

    projectile.destroy();
  }

  private handleExitCollision(): void {
    if (!this.canExit) return;

    // Block exit on final floor until boss is overcome
    if (this.isFinalBoss && this.hasBossAlive()) {
      this.showGameMessage('Overcome the final trial first!');
      return;
    }

    this.canExit = false;

    // If final boss is dead, trigger victory instead of next floor
    if (this.isFinalBoss) {
      this.handleVictory();
      return;
    }

    this.audioSystem.play('sfx_stairs', 0.5);

    // Show shop before transitioning to next floor
    this.showShop();
  }

  private showShop(): void {
    // Save player state to registry for ShopScene
    this.registry.set('shopData', {
      floor: this.floor,
      playerStats: this.player.getSaveData(),
      inventorySerialized: this.player.inventory.serialize(),
    });

    // Also save stats to registry
    this.registry.set('enemiesKilled', this.enemiesKilled);
    this.registry.set('itemsCollected', this.itemsCollected);

    // Transition to shop scene
    this.cameras.main.fade(300, 0, 0, 0, false, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
      if (progress === 1) {
        this.scene.start('ShopScene');
      }
    });
  }

  private handleItemPickup(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    itemObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const itemSprite = itemObj as Phaser.Physics.Arcade.Sprite;
    const item = itemSprite.getData('item') as Item;
    const glow = itemSprite.getData('glow') as Phaser.GameObjects.Sprite;

    if (item && this.player.pickupItem(item)) {
      this.showPickupText(itemSprite.x, itemSprite.y, item);
      this.audioSystem.play('sfx_pickup', 0.4);
      this.itemsCollected++;
      this.registry.set('itemsCollected', this.itemsCollected);
      if (glow) glow.destroy();
      itemSprite.destroy();
    }
  }

  private showPickupText(x: number, y: number, item: Item): void {
    const color = '#' + RARITY_COLORS[item.rarity].toString(16).padStart(6, '0');
    const text = this.add.text(x, y - 10, `+ ${item.name}`, {
      fontSize: '10px',
      color: color,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    text.setDepth(100);

    this.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }

  private getItemDropTexture(item: Item): string {
    // Use specific texture based on item type
    switch (item.type) {
      case ItemType.ARMOR:
        return 'item_armor';
      case ItemType.ACCESSORY:
        return 'item_accessory';
      case ItemType.CONSUMABLE:
        return 'item_consumable';
      case ItemType.WEAPON:
        // Weapons with weaponData use their weapon texture
        if (item.weaponData) {
          const weaponTextures: Record<string, string> = {
            wand: 'weapon_wand',
            sword: 'weapon_sword',
            bow: 'weapon_bow',
            staff: 'weapon_staff',
            daggers: 'weapon_daggers',
          };
          return weaponTextures[item.weaponData.weaponType] || 'weapon_wand';
        }
        return 'weapon_sword';
      default:
        return 'item_drop';
    }
  }

  private spawnItemDrop(x: number, y: number, item: Item): void {
    const texture = this.getItemDropTexture(item);
    const drop = this.itemDrops.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
    drop.setData('item', item);
    drop.setDepth(5);
    drop.setTint(RARITY_COLORS[item.rarity]);

    // Add glow effect behind the item
    const glow = this.add.sprite(x, y, 'weapon_drop_glow');
    glow.setDepth(4);
    glow.setTint(RARITY_COLORS[item.rarity]);
    glow.setAlpha(0.4);
    drop.setData('glow', glow);

    // Floating animation
    this.tweens.add({
      targets: [drop, glow],
      y: y - 5,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Glow pulse
    this.tweens.add({
      targets: glow,
      alpha: 0.7,
      scale: 1.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pop-in animation
    drop.setScale(0);
    glow.setScale(0);
    this.tweens.add({
      targets: [drop, glow],
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private spawnWeaponDrop(x: number, y: number, weapon: Weapon): void {
    const drop = this.weaponDrops.create(x, y, weapon.stats.texture) as Phaser.Physics.Arcade.Sprite;
    drop.setData('weapon', weapon);
    drop.setDepth(5);

    // Rarity-based tint
    const rarityColors = [0xffffff, 0x00ff00, 0x0088ff, 0xaa00ff, 0xffaa00];
    drop.setTint(rarityColors[weapon.rarity]);

    // Add glow effect
    const glow = this.add.sprite(x, y, 'weapon_drop_glow');
    glow.setDepth(4);
    glow.setTint(rarityColors[weapon.rarity]);
    glow.setAlpha(0.5);
    drop.setData('glow', glow);

    // Floating animation
    this.tweens.add({
      targets: [drop, glow],
      y: y - 6,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Glow pulse
    this.tweens.add({
      targets: glow,
      alpha: 0.8,
      scale: 1.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pop-in animation
    drop.setScale(0);
    glow.setScale(0);
    this.tweens.add({
      targets: [drop, glow],
      scale: 1,
      duration: 250,
      ease: 'Back.easeOut',
    });
  }

  private spawnGoldDrop(x: number, y: number, amount: number): void {
    // Spawn multiple coins for larger amounts
    const coinCount = Math.min(Math.ceil(amount / 10), 5);
    const totalAmount = amount;

    for (let i = 0; i < coinCount; i++) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      const coinX = x + offsetX;
      const coinY = y + offsetY;

      const coin = this.goldDrops.create(coinX, coinY, 'gold_coin') as Phaser.Physics.Arcade.Sprite;
      coin.setData('amount', Math.ceil(totalAmount / coinCount));
      coin.setDepth(5);

      // Pop-out animation
      coin.setScale(0);
      const delay = i * 50;
      this.time.delayedCall(delay, () => {
        this.tweens.add({
          targets: coin,
          scale: 1,
          y: coinY - 10,
          duration: 200,
          ease: 'Back.easeOut',
        });

        // Floating animation after pop
        this.time.delayedCall(200, () => {
          this.tweens.add({
            targets: coin,
            y: coinY - 14,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        });
      });
    }
  }

  private handleGoldPickup(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    goldObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const coin = goldObj as Phaser.Physics.Arcade.Sprite;

    // Immediately disable physics to prevent re-triggering
    if (coin.body) {
      coin.body.enable = false;
    }
    this.goldDrops.remove(coin, false, false);

    const amount = coin.getData('amount') as number;

    this.player.addGold(amount);
    this.audioSystem.play('sfx_pickup', 0.3);

    // Collect animation - fly to HUD
    this.tweens.killTweensOf(coin);
    this.tweens.add({
      targets: coin,
      x: this.cameras.main.scrollX + 10,
      y: this.cameras.main.scrollY + 80,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => coin.destroy(),
    });

    this.updateHUD();
  }

  private handleWeaponPickup(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    weaponObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const weaponSprite = weaponObj as Phaser.Physics.Arcade.Sprite;
    const weapon = weaponSprite.getData('weapon') as Weapon;
    const glow = weaponSprite.getData('glow') as Phaser.GameObjects.Sprite;

    if (weapon) {
      // Convert weapon to item and add to inventory
      const weaponItem = createItemFromWeapon(weapon);
      if (this.player.pickupItem(weaponItem)) {
        this.showWeaponPickupText(weaponSprite.x, weaponSprite.y, weapon);
        this.audioSystem.play('sfx_pickup', 0.5);
        this.itemsCollected++;
        this.registry.set('itemsCollected', this.itemsCollected);

        if (glow) glow.destroy();
        weaponSprite.destroy();
      } else {
        // Inventory full - show message
        this.showGameMessage('Inventory full!');
      }
    }
  }

  private showWeaponPickupText(x: number, y: number, weapon: Weapon): void {
    const rarityColors = ['#ffffff', '#00ff00', '#0088ff', '#aa00ff', '#ffaa00'];
    const color = rarityColors[weapon.rarity];

    const text = this.add.text(x, y - 10, `Equipped: ${weapon.getDisplayName()}`, {
      fontSize: '11px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5, 1);
    text.setDepth(100);

    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1500,
      ease: 'Cubic.easeOut',
      onComplete: () => text.destroy(),
    });
  }

  private showBossAnnouncement(): void {
    const isFinal = this.floor === this.FINAL_FLOOR;
    const message = isFinal ? 'FLOOR 20\nFINAL BOSS' : `FLOOR ${this.floor}\nBOSS BATTLE`;
    const color = isFinal ? '#fbbf24' : '#ff4444';

    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      message,
      {
        fontSize: isFinal ? '40px' : '32px',
        color: color,
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000000',
        strokeThickness: isFinal ? 4 : 0,
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(200);

    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      onComplete: () => text.destroy(),
    });
  }

  private setupEventHandlers(): void {
    this.events.on('playerDeath', () => {
      this.handlePlayerDeath();
    });

    this.events.on('enemyDeath', (enemy: Enemy) => {
      this.player.gainXP(enemy.xpValue);
      this.audioSystem.play('sfx_enemy_death', 0.4);
      this.removeHealthBar(enemy);
      this.spawnDeathParticles(enemy.x, enemy.y);
      this.enemiesKilled++;
      this.registry.set('enemiesKilled', this.enemiesKilled);

      // Notify room manager (opens doors when room is cleared)
      // Count remaining active enemies, excluding the one that just died
      const remainingEnemies = this.enemies.getChildren().filter((e) =>
        e.active && e !== (enemy as unknown as Phaser.GameObjects.GameObject)
      ).length;
      this.roomManager.onEnemyKilled(remainingEnemies);

      // Boss drops guaranteed rare+ loot and a weapon
      if (enemy instanceof BossEnemy) {
        const loot = this.lootSystem.generateGuaranteedLoot(ItemRarity.RARE);
        this.spawnItemDrop(enemy.x, enemy.y, loot);

        // Guaranteed weapon from bosses with higher rarity
        const weapon = Weapon.createRandom(this.floor + 5);
        this.spawnWeaponDrop(enemy.x + 24, enemy.y, weapon);

        // Bosses drop lots of gold
        const bossGold = 50 + this.floor * 20;
        this.spawnGoldDrop(enemy.x - 24, enemy.y, bossGold);

        // Check for victory on final boss
        if (this.isFinalBoss) {
          this.time.delayedCall(1500, () => {
            this.handleVictory();
          });
        }
      } else {
        // Check if this is a challenge room enemy for better drops
        const isChallengeEnemy = enemy.getData('challengeEnemy');
        const dropChance = isChallengeEnemy ? 0.7 : 0.4; // 70% vs 40% item drop
        const weaponChance = isChallengeEnemy ? 0.3 : 0.15; // 30% vs 15% weapon drop

        // Regular enemies: chance for item
        const loot = this.lootSystem.generateLoot(this.floor + (isChallengeEnemy ? 2 : 0));
        if (loot && Math.random() < dropChance / 0.4) { // Adjust for loot system's internal chance
          this.spawnItemDrop(enemy.x, enemy.y, loot);
        }

        // Weapon drop chance
        if (Math.random() < weaponChance) {
          const weapon = Weapon.createRandom(this.floor + (isChallengeEnemy ? 2 : 0));
          this.spawnWeaponDrop(enemy.x, enemy.y, weapon);
        }

        // Gold drops - all enemies drop some gold
        const baseGold = 5 + this.floor * 2;
        const goldAmount = baseGold + Math.floor(Math.random() * baseGold);
        const goldMultiplier = isChallengeEnemy ? 2 : 1;
        this.spawnGoldDrop(enemy.x, enemy.y, goldAmount * goldMultiplier);
      }
    });

    this.events.on('enemyAttack', (enemy: Enemy, target: Player) => {
      if (!target.getIsInvulnerable() && !this.devMode) {
        const result = this.combatSystem.calculateDamage(enemy, target);
        this.combatSystem.applyDamage(target, result);
        this.audioSystem.play('sfx_hurt', 0.4);
        this.shakeCamera(5, 100);
        this.showDamageNumber(target.x, target.y, result.damage, true);
      }
    });

    // Hazard damage event
    this.events.on('hazardDamage', (damage: number, _source: string) => {
      if (!this.devMode) {
        this.audioSystem.play('sfx_hurt', 0.3);
        this.shakeCamera(3, 80);
        this.showDamageNumber(this.player.x, this.player.y, damage, true);
      }
    });

    this.events.on('itemPickup', () => {
      // Already handled in handleItemPickup
    });

    // Listen for level up
    this.events.on('playerLevelUp', () => {
      this.audioSystem.play('sfx_levelup', 0.5);
      this.showLevelUpNotification();
    });
  }

  private setupPlayerAttack(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.inventoryUI.getIsVisible() || this.levelUpUI.getIsVisible()) return;

      if (pointer.leftButtonDown()) {
        this.playerAttack(pointer);
      }
    });
  }

  private setupKeyboardControls(): void {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown-E', () => {
      this.inventoryUI.toggle();
      if (this.inventoryUI.getIsVisible()) {
        this.player.setVelocity(0, 0);
      }
    });

    this.input.keyboard.on('keydown-ESC', () => {
      if (this.levelUpUI.getIsVisible()) {
        this.levelUpUI.hide();
      } else if (this.inventoryUI.getIsVisible()) {
        this.inventoryUI.toggle();
      }
    });

    // L: Open character / stat allocation menu
    this.input.keyboard.on('keydown-L', () => {
      if (this.inventoryUI.getIsVisible()) return;

      if (this.levelUpUI.getIsVisible()) {
        this.levelUpUI.hide();
      } else {
        this.player.setVelocity(0, 0);
        this.levelUpUI.show();
      }
    });

    // Dev/Debug controls
    this.setupDevControls();
  }

  private devMode: boolean = false;

  private setupDevControls(): void {
    if (!this.input.keyboard) return;

    // F1: Toggle god mode (invincibility)
    this.input.keyboard.on('keydown-F1', () => {
      this.devMode = !this.devMode;
      this.showDevMessage(`God Mode: ${this.devMode ? 'ON' : 'OFF'}`);
      if (this.devMode) {
        this.player.hp = this.player.maxHp;
      }
    });

    // F2: Skip to next floor
    this.input.keyboard.on('keydown-F2', () => {
      this.showDevMessage(`Skipping to floor ${this.floor + 1}`);
      this.handleExitCollision();
    });

    // F3: Jump to final boss (floor 20)
    this.input.keyboard.on('keydown-F3', () => {
      this.floor = this.FINAL_FLOOR - 1;
      this.registry.set('floor', this.floor);
      this.showDevMessage('Jumping to FINAL BOSS');
      this.handleExitCollision();
    });

    // F4: Level up
    this.input.keyboard.on('keydown-F4', () => {
      this.player.gainXP(this.player.xpToNextLevel);
      this.showDevMessage('Level Up!');
    });

    // F5: Spawn epic loot
    this.input.keyboard.on('keydown-F5', () => {
      const loot = this.lootSystem.generateGuaranteedLoot(ItemRarity.EPIC);
      this.spawnItemDrop(this.player.x + 30, this.player.y, loot);
      this.showDevMessage('Spawned Epic Loot');
    });

    // F6: Kill all enemies
    this.input.keyboard.on('keydown-F6', () => {
      let count = 0;
      this.enemies.getChildren().forEach((child) => {
        const enemy = child as unknown as Enemy;
        if (enemy.active) {
          enemy.takeDamage(9999);
          count++;
        }
      });
      this.showDevMessage(`Killed ${count} enemies`);
    });
  }

  private hasBossAlive(): boolean {
    return this.enemies.getChildren().some((child) => {
      const enemy = child as unknown as Enemy;
      return enemy.active && enemy instanceof BossEnemy;
    });
  }

  private showGameMessage(msg: string): void {
    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height * 0.3,
      msg,
      {
        fontSize: '24px',
        color: '#ff4444',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(200);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 30,
      duration: 1500,
      delay: 500,
      onComplete: () => text.destroy(),
    });
  }

  private shakeCamera(intensity: number, duration: number): void {
    this.cameras.main.shake(duration, intensity / 1000);
  }

  private showDamageNumber(x: number, y: number, damage: number, isPlayer: boolean): void {
    const color = isPlayer ? '#ff4444' : '#ffffff';
    const text = this.add.text(x, y - 20, `-${damage}`, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);
    text.setDepth(150);

    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  private spawnDeathParticles(x: number, y: number): void {
    const colors = [0xff4444, 0xff6666, 0xcc3333, 0xffaaaa];
    const particleCount = 8;

    for (let i = 0; i < particleCount; i++) {
      const color = Phaser.Math.RND.pick(colors);
      const particle = this.add.circle(x, y, Phaser.Math.Between(2, 5), color);
      particle.setDepth(100);

      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Phaser.Math.Between(50, 120);
      const targetX = x + Math.cos(angle) * speed;
      const targetY = y + Math.sin(angle) * speed;

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(300, 500),
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private showLevelUpNotification(): void {
    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height * 0.3,
      `LEVEL UP!\nPress L to allocate stats`,
      {
        fontSize: '24px',
        color: '#fbbf24',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(200);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 40,
      duration: 2500,
      delay: 1000,
      onComplete: () => text.destroy(),
    });
  }

  private showDevMessage(msg: string): void {
    const text = this.add.text(10, 10, `[DEV] ${msg}`, {
      fontSize: '14px',
      color: '#fbbf24',
      backgroundColor: '#000000',
      padding: { x: 5, y: 3 },
    });
    text.setScrollFactor(0);
    text.setDepth(300);

    this.tweens.add({
      targets: text,
      alpha: 0,
      y: -20,
      duration: 1500,
      delay: 500,
      onComplete: () => text.destroy(),
    });
  }

  private playerAttack(pointer: Phaser.Input.Pointer): void {
    if (!this.player.canAttack()) return;

    const weapon = this.player.getWeapon();
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      worldPoint.x, worldPoint.y
    );

    this.player.startAttackCooldown();

    switch (weapon.stats.type) {
      case WeaponType.SWORD:
        this.performMeleeAttack(angle, weapon);
        break;
      case WeaponType.BOW:
        this.performBowAttack(angle, weapon);
        break;
      case WeaponType.STAFF:
        this.performStaffAttack(angle, weapon);
        break;
      case WeaponType.DAGGERS:
        this.performDaggerAttack(angle, weapon);
        break;
      case WeaponType.WAND:
      default:
        this.performWandAttack(angle, weapon);
        break;
    }

    this.audioSystem.play('sfx_attack', 0.3);
  }

  private performWandAttack(angle: number, weapon: Weapon): void {
    const projectile = this.projectiles.create(
      this.player.x, this.player.y, weapon.stats.projectileTexture
    ) as Phaser.Physics.Arcade.Sprite;

    projectile.setDepth(8);
    projectile.setData('damage', this.player.getAttackDamage());
    projectile.setData('piercing', weapon.stats.piercing);
    projectile.setRotation(angle);
    projectile.setVelocity(
      Math.cos(angle) * weapon.stats.projectileSpeed,
      Math.sin(angle) * weapon.stats.projectileSpeed
    );

    this.time.delayedCall(2000 * weapon.stats.range, () => {
      if (projectile.active) projectile.destroy();
    });
  }

  private performSwordAttack(angle: number, weapon: Weapon): void {
    // Create slash effect
    const slash = this.add.sprite(
      this.player.x + Math.cos(angle) * 20,
      this.player.y + Math.sin(angle) * 20,
      weapon.stats.projectileTexture
    );
    slash.setDepth(15);
    slash.setRotation(angle);
    slash.setScale(weapon.stats.range);

    // Fade out the slash
    this.tweens.add({
      targets: slash,
      alpha: 0,
      scale: weapon.stats.range * 1.3,
      duration: 150,
      onComplete: () => slash.destroy(),
    });

    // Check for enemies in the arc
    const slashRange = TILE_SIZE * 2 * weapon.stats.range;
    const slashArc = Phaser.Math.DegToRad(weapon.stats.spread);

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as unknown as Enemy;
      if (!enemy.active) return;

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );

      if (dist <= slashRange) {
        const enemyAngle = Phaser.Math.Angle.Between(
          this.player.x, this.player.y,
          enemy.x, enemy.y
        );

        let angleDiff = Math.abs(angle - enemyAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff <= slashArc / 2) {
          // Hit the enemy
          const damage = this.player.getAttackDamage();
          enemy.takeDamage(damage);
          this.showDamageNumber(enemy.x, enemy.y, damage, false);

          // Knockback
          const knockbackForce = 150;
          enemy.setVelocity(
            Math.cos(enemyAngle) * knockbackForce,
            Math.sin(enemyAngle) * knockbackForce
          );
        }
      }
    });
  }

  private performMeleeAttack(angle: number, weapon: Weapon): void {
    this.performSwordAttack(angle, weapon);
  }

  private performBowAttack(angle: number, weapon: Weapon): void {
    const projectile = this.projectiles.create(
      this.player.x, this.player.y, weapon.stats.projectileTexture
    ) as Phaser.Physics.Arcade.Sprite;

    projectile.setDepth(8);
    projectile.setData('damage', this.player.getAttackDamage());
    projectile.setData('piercing', true);
    projectile.setRotation(angle);
    projectile.setVelocity(
      Math.cos(angle) * weapon.stats.projectileSpeed,
      Math.sin(angle) * weapon.stats.projectileSpeed
    );

    this.time.delayedCall(2500 * weapon.stats.range, () => {
      if (projectile.active) projectile.destroy();
    });
  }

  private performStaffAttack(angle: number, weapon: Weapon): void {
    const projectile = this.projectiles.create(
      this.player.x, this.player.y, weapon.stats.projectileTexture
    ) as Phaser.Physics.Arcade.Sprite;

    projectile.setDepth(8);
    projectile.setData('damage', this.player.getAttackDamage());
    projectile.setData('aoe', true);
    projectile.setData('aoeRadius', weapon.stats.aoeRadius);
    projectile.setRotation(angle);
    projectile.setVelocity(
      Math.cos(angle) * weapon.stats.projectileSpeed,
      Math.sin(angle) * weapon.stats.projectileSpeed
    );

    // Add a slight bobbing animation
    this.tweens.add({
      targets: projectile,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      repeat: -1,
    });

    this.time.delayedCall(2000 * weapon.stats.range, () => {
      if (projectile.active) {
        this.createExplosion(projectile.x, projectile.y, weapon);
        projectile.destroy();
      }
    });
  }

  private performDaggerAttack(angle: number, weapon: Weapon): void {
    const spreadRad = Phaser.Math.DegToRad(weapon.stats.spread);

    for (let i = 0; i < weapon.stats.projectileCount; i++) {
      const offset = (i - (weapon.stats.projectileCount - 1) / 2) * spreadRad;
      const projectileAngle = angle + offset;

      const projectile = this.projectiles.create(
        this.player.x, this.player.y, weapon.stats.projectileTexture
      ) as Phaser.Physics.Arcade.Sprite;

      projectile.setDepth(8);
      projectile.setData('damage', this.player.getAttackDamage());
      projectile.setData('piercing', false);
      projectile.setRotation(projectileAngle);
      projectile.setVelocity(
        Math.cos(projectileAngle) * weapon.stats.projectileSpeed,
        Math.sin(projectileAngle) * weapon.stats.projectileSpeed
      );

      this.time.delayedCall(1500 * weapon.stats.range, () => {
        if (projectile.active) projectile.destroy();
      });
    }
  }

  private createExplosion(x: number, y: number, weapon: Weapon): void {
    // Visual explosion
    const explosion = this.add.sprite(x, y, 'explosion_effect');
    explosion.setDepth(15);
    explosion.setScale(0.5);

    this.tweens.add({
      targets: explosion,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // Damage enemies in radius
    const radius = weapon.stats.aoeRadius;
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as unknown as Enemy;
      if (!enemy.active) return;

      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist <= radius) {
        const damage = this.player.getAttackDamage();
        enemy.takeDamage(damage);
        this.showDamageNumber(enemy.x, enemy.y, damage, false);
      }
    });

    this.shakeCamera(4, 100);
  }

  private createExplosionFromProjectile(
    x: number,
    y: number,
    projectile: Phaser.Physics.Arcade.Sprite
  ): void {
    // Visual explosion
    const explosion = this.add.sprite(x, y, 'explosion_effect');
    explosion.setDepth(15);
    explosion.setScale(0.5);

    this.tweens.add({
      targets: explosion,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // Damage enemies in radius
    const radius = projectile.getData('aoeRadius') || 64;
    const damage = projectile.getData('damage') || this.player.getAttackDamage();

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as unknown as Enemy;
      if (!enemy.active) return;

      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist <= radius) {
        enemy.takeDamage(damage);
        this.showDamageNumber(enemy.x, enemy.y, damage, false);
      }
    });

    this.shakeCamera(4, 100);
  }

  private hudText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private weaponHUD!: Phaser.GameObjects.Container;
  private weaponIcon!: Phaser.GameObjects.Sprite;
  private weaponText!: Phaser.GameObjects.Text;

  private createHUD(): void {
    this.hudText = this.add.text(10, 10, '', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 4 },
    });
    this.hudText.setScrollFactor(0);
    this.hudText.setDepth(100);

    // Gold display
    this.goldText = this.add.text(10, 70, '', {
      fontSize: '14px',
      color: '#ffd700',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 4 },
    });
    this.goldText.setScrollFactor(0);
    this.goldText.setDepth(100);

    // Weapon HUD in bottom-right
    this.weaponHUD = this.add.container(
      this.cameras.main.width - 10,
      this.cameras.main.height - 60
    );
    this.weaponHUD.setScrollFactor(0);
    this.weaponHUD.setDepth(100);

    // Background for weapon display
    const weaponBg = this.add.rectangle(0, 0, 120, 50, 0x000000, 0.5);
    weaponBg.setOrigin(1, 1);

    // Weapon icon
    const weapon = this.player.getWeapon();
    this.weaponIcon = this.add.sprite(-100, -25, weapon.stats.texture);
    this.weaponIcon.setScale(1.5);
    const rarityColors = [0xffffff, 0x00ff00, 0x0088ff, 0xaa00ff, 0xffaa00];
    this.weaponIcon.setTint(rarityColors[weapon.rarity]);

    // Weapon text
    this.weaponText = this.add.text(-80, -38, weapon.getDisplayName(), {
      fontSize: '10px',
      color: '#ffffff',
      wordWrap: { width: 75 },
    });

    this.weaponHUD.add([weaponBg, this.weaponIcon, this.weaponText]);

    // Listen for equipment changes to update weapon display
    this.events.on('equipmentChanged', () => {
      this.updateWeaponHUD();
    });

    const instructions = this.add.text(
      10,
      this.cameras.main.height - 40,
      'WASD: Move | SPACE: Dodge | CLICK: Attack | E: Inventory',
      {
        fontSize: '12px',
        color: '#aaaaaa',
        backgroundColor: '#00000080',
        padding: { x: 8, y: 4 },
      }
    );
    instructions.setScrollFactor(0);
    instructions.setDepth(100);
  }

  private updateHUD(): void {
    const enemyCount = this.enemies.getChildren().filter((e) => e.active).length;
    const itemCount = this.player.inventory.getItemCount();
    const floorText = this.isBossFloor ? `Stage: ${this.floor} (BOSS)` : `Stage: ${this.floor}`;

    const lines = [
      floorText,
      `HP: ${this.player.hp}/${this.player.maxHp}`,
      `Level: ${this.player.level}`,
      `XP: ${this.player.xp}/${this.player.xpToNextLevel}`,
      `ATK: ${this.player.attack} | DEF: ${this.player.defense}`,
      `Enemies: ${enemyCount} | Items: ${itemCount}`,
    ];

    if (this.player.statPoints > 0) {
      lines.push(`[L] ${this.player.statPoints} stat points!`);
    }

    this.hudText.setText(lines.join('\n'));

    // Update gold display
    this.goldText.setText(`💰 ${this.player.gold}`);
  }

  private updateWeaponHUD(): void {
    const weapon = this.player.getWeapon();
    const rarityColors = [0xffffff, 0x00ff00, 0x0088ff, 0xaa00ff, 0xffaa00];

    this.weaponIcon.setTexture(weapon.stats.texture);
    this.weaponIcon.setTint(rarityColors[weapon.rarity]);
    this.weaponText.setText(weapon.getDisplayName());
  }

  private handlePlayerDeath(): void {
    // Delete save on death (roguelike mechanic)
    SaveSystem.deleteSave();

    const stats = {
      floor: this.floor,
      level: this.player.level,
      enemiesKilled: this.enemiesKilled,
      itemsCollected: this.itemsCollected,
    };

    // Clear stats from registry
    this.registry.set('floor', 1);
    this.registry.set('enemiesKilled', 0);
    this.registry.set('itemsCollected', 0);

    this.cameras.main.fade(1000, 0, 0, 0);
    this.time.delayedCall(1000, () => {
      this.scene.start('GameOverScene', stats);
    });
  }

  private handleVictory(): void {
    const stats = {
      floor: this.floor,
      level: this.player.level,
      enemiesKilled: this.enemiesKilled,
      itemsCollected: this.itemsCollected,
    };

    // Clear stats from registry
    this.registry.set('floor', 1);
    this.registry.set('enemiesKilled', 0);
    this.registry.set('itemsCollected', 0);

    this.cameras.main.flash(2000, 255, 215, 0);
    this.time.delayedCall(2000, () => {
      this.scene.start('VictoryScene', stats);
    });
  }

  private saveGame(): void {
    SaveSystem.save(
      this.floor,
      this.player.getSaveData(),
      this.player.inventory
    );
  }

  private loadSavedGame(): void {
    const savedData = SaveSystem.load();
    if (!savedData) return;

    // Only auto-load if this is the first floor of a new session
    // (the registry would be empty on first load)
    if (!this.registry.has('floor') || this.registry.get('floor') === savedData.floor) {
      this.floor = savedData.floor;
      this.registry.set('floor', this.floor);
      this.isBossFloor = this.floor % 5 === 0;

      this.player.restoreFromSave(savedData.player);
      SaveSystem.restoreInventory(this.player.inventory, savedData.inventory);
    }
  }
}
