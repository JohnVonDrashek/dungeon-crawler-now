import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { BossEnemy } from '../entities/enemies/EnemyTypes';
import { TILE_SIZE, DUNGEON_WIDTH, DUNGEON_HEIGHT } from '../utils/constants';
import { DungeonGenerator, DungeonData, Room, RoomType } from '../systems/DungeonGenerator';
import { CombatSystem } from '../systems/CombatSystem';
import { LootSystem } from '../systems/LootSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { ItemRarity } from '../systems/Item';
import { InventoryUI } from '../ui/InventoryUI';
import { MinimapUI } from '../ui/MinimapUI';
import { LevelUpUI } from '../ui/LevelUpUI';
import { SettingsUI } from '../ui/SettingsUI';
import { RoomManager } from '../systems/RoomManager';
import { HazardSystem } from '../systems/HazardSystem';
import { Weapon } from '../systems/Weapon';
import { LoreSystem, LoreEntry } from '../systems/LoreSystem';
import { LootDropManager } from '../systems/LootDropManager';
import { PlayerAttackManager } from '../systems/PlayerAttackManager';
import { EnemySpawnManager } from '../systems/EnemySpawnManager';

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private dungeon!: DungeonData;
  private dungeonGenerator!: DungeonGenerator;
  private wallLayer!: Phaser.GameObjects.Group;
  private floorLayer!: Phaser.GameObjects.Group;
  private enemySpawnManager!: EnemySpawnManager;
  private playerAttackManager!: PlayerAttackManager;
  private enemyProjectiles!: Phaser.Physics.Arcade.Group;
  private lootDropManager!: LootDropManager;

  // Convenience getter for enemies group
  private get enemies(): Phaser.Physics.Arcade.Group {
    return this.enemySpawnManager.getEnemiesGroup();
  }
  private combatSystem!: CombatSystem;
  private lootSystem!: LootSystem;
  private audioSystem!: AudioSystem;
  private inventoryUI!: InventoryUI;
  private minimapUI!: MinimapUI;
  private levelUpUI!: LevelUpUI;
  private settingsUI!: SettingsUI;
  private roomManager!: RoomManager;
  private hazardSystem!: HazardSystem;
  private loreSystem!: LoreSystem;
  private loreObjects!: Phaser.Physics.Arcade.Group;
  private activeLoreModal: Phaser.GameObjects.Container | null = null;
  private lorePrompt!: Phaser.GameObjects.Text;
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

    // Persist stats across floor transitions
    this.enemiesKilled = this.registry.get('enemiesKilled') || 0;
    this.itemsCollected = this.registry.get('itemsCollected') || 0;

    this.combatSystem = new CombatSystem(this);
    this.lootSystem = new LootSystem(0.5);
    this.audioSystem = new AudioSystem(this);

    // Start exploration music
    this.audioSystem.startMusic('exploration');

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
    this.loreSystem = new LoreSystem();
    this.loreObjects = this.physics.add.group();

    // Add room decorations (chests, shrines, lore) after player exists for physics overlaps
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
    this.playerAttackManager = new PlayerAttackManager(this, this.player, this.audioSystem);
    this.playerAttackManager.create();
    this.enemyProjectiles = this.physics.add.group({ runChildUpdate: true });

    // Create loot drop manager
    this.lootDropManager = new LootDropManager(this, this.player, this.audioSystem);
    this.lootDropManager.create();

    // Create room manager for door/room mechanics
    this.roomManager = new RoomManager(this, this.dungeon);

    // Create enemy spawn manager (needs roomManager)
    this.enemySpawnManager = new EnemySpawnManager(
      this, this.player, this.roomManager, this.audioSystem, this.enemyProjectiles, this.floor
    );
    this.enemySpawnManager.create();

    // Create hazard system
    this.hazardSystem = new HazardSystem(this, this.player, this.floor);
    this.hazardSystem.setRoomManager(this.roomManager);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, DUNGEON_WIDTH * TILE_SIZE, DUNGEON_HEIGHT * TILE_SIZE);

    this.createExit();
    this.setupCollisions();
    this.setupEventHandlers();
    this.setupKeyboardControls();

    // Load saved player data if on floor 1 and save exists
    this.loadSavedGame();

    this.inventoryUI = new InventoryUI(this, this.player);
    this.minimapUI = new MinimapUI(this, this.dungeon);
    this.levelUpUI = new LevelUpUI(this, this.player);
    this.settingsUI = new SettingsUI(this, this.audioSystem);
    this.createHUD();
    this.createLorePrompt();

    // Setup player attack after UI is created (needs UI visibility check)
    this.playerAttackManager.setupPlayerAttack(this.inventoryUI, this.levelUpUI);

    // Boss floor announcement
    if (this.isBossFloor) {
      this.showBossAnnouncement();
    }
  }

  update(time: number, delta: number): void {
    if (this.inventoryUI.getIsVisible() || this.levelUpUI.getIsVisible() || this.settingsUI.getIsVisible()) return;

    // Reset speed modifier each frame (will be reapplied by SlothEnemy if in range)
    this.player.resetSpeedModifier();

    this.player.update(time, delta);

    // Check for room entry (returns room if entering a new unvisited room)
    const enteredRoom = this.roomManager.update(this.player.x, this.player.y);
    if (enteredRoom) {
      const exitRoom = this.dungeon.rooms[this.dungeon.rooms.length - 1];
      this.enemySpawnManager.spawnEnemiesInRoom(enteredRoom, this.isBossFloor, exitRoom);
      this.hazardSystem.spawnHazardsInRoom(enteredRoom, this.dungeon);
    }

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as unknown as Enemy;
      if (enemy.active) {
        enemy.update(time, delta);
        this.enemySpawnManager.updateHealthBar(enemy);
      }
    });

    // Update hazards
    this.hazardSystem.update(delta);

    this.minimapUI.update(this.player.x, this.player.y);
    this.updateHUD();
    this.updateLorePrompt();
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

      // Add lore objects to some rooms
      this.tryAddLoreObject(room);

      switch (room.type) {
        case RoomType.TREASURE:
          // Add chest in center
          this.addTreasureChest(room);
          break;
        case RoomType.SHRINE:
          // Add healing shrine
          this.addHealingShrine(room);
          // Shrines always have a tablet nearby
          this.addLoreObject(room, 'tablet');
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

  // === LORE SYSTEM ===

  private tryAddLoreObject(room: Room): void {
    // Skip spawn room, exit room, and rooms that already have special objects
    if (room.type === RoomType.SPAWN || room.type === RoomType.EXIT) return;
    if (room.type === RoomType.SHRINE) return; // Shrines get their own tablet

    // 20% chance to add lore to normal rooms
    if (Math.random() > 0.2) return;

    const loreType = this.loreSystem.getRandomLoreType(this.floor);
    this.addLoreObject(room, loreType);
  }

  private addLoreObject(room: Room, forcedType?: 'tablet' | 'scratch' | 'whisper'): void {
    const loreType = forcedType || this.loreSystem.getRandomLoreType(this.floor);
    const lore = this.loreSystem.getRandomLore(this.floor, loreType);

    if (!lore) return; // No lore available for this floor/type

    // Position: offset from center to avoid overlapping other objects
    const offsetX = (Math.random() - 0.5) * (room.width - 4) * TILE_SIZE;
    const offsetY = (Math.random() - 0.5) * (room.height - 4) * TILE_SIZE;
    const loreX = room.centerX * TILE_SIZE + TILE_SIZE / 2 + offsetX;
    const loreY = room.centerY * TILE_SIZE + TILE_SIZE / 2 + offsetY;

    // Get texture based on type
    let texture: string;
    switch (lore.type) {
      case 'tablet':
        texture = 'lore_tablet';
        break;
      case 'scratch':
        texture = 'lore_scratch';
        break;
      case 'whisper':
        texture = 'lore_whisper';
        break;
    }

    const loreSprite = this.loreObjects.create(loreX, loreY, texture) as Phaser.Physics.Arcade.Sprite;
    loreSprite.setDepth(3);
    loreSprite.setImmovable(true);
    loreSprite.setData('loreEntry', lore);
    loreSprite.setData('discovered', false);

    // Visual effects based on type
    if (lore.type === 'tablet') {
      // Tablets have a subtle glow
      const glow = this.add.sprite(loreX, loreY, 'lore_tablet');
      glow.setDepth(2);
      glow.setTint(0x22d3ee);
      glow.setAlpha(0.3);
      glow.setScale(1.3);
      loreSprite.setData('glow', glow);

      this.tweens.add({
        targets: glow,
        alpha: 0.5,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (lore.type === 'whisper') {
      // Whispers float and fade
      loreSprite.setAlpha(0.6);
      this.tweens.add({
        targets: loreSprite,
        y: loreY - 5,
        alpha: 0.8,
        duration: 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (lore.type === 'scratch') {
      // Scratches are faint and static
      loreSprite.setAlpha(0.4);
    }
  }

  private tryInteractWithLore(): void {
    const INTERACT_RANGE = TILE_SIZE * 2;
    let closestLore: Phaser.Physics.Arcade.Sprite | null = null;
    let closestDist = INTERACT_RANGE;

    // Find closest lore object within range
    this.loreObjects.getChildren().forEach((child) => {
      const loreSprite = child as Phaser.Physics.Arcade.Sprite;
      if (!loreSprite.active) return;

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        loreSprite.x, loreSprite.y
      );

      if (dist < closestDist) {
        closestDist = dist;
        closestLore = loreSprite;
      }
    });

    if (closestLore) {
      this.interactWithLore(closestLore);
    }
  }

  private interactWithLore(loreSprite: Phaser.Physics.Arcade.Sprite): void {
    const loreEntry = loreSprite.getData('loreEntry') as LoreEntry;
    if (!loreEntry) return;

    const wasDiscovered = loreSprite.getData('discovered') as boolean;

    // Mark as discovered on first read
    if (!wasDiscovered) {
      loreSprite.setData('discovered', true);
      this.loreSystem.markDiscovered(loreEntry.id);
    }

    // Handle based on type
    switch (loreEntry.type) {
      case 'tablet':
        this.audioSystem.play('sfx_tablet', 0.4);
        this.showLoreModal(loreEntry);
        // Fade out glow on first discovery
        if (!wasDiscovered) {
          const glow = loreSprite.getData('glow') as Phaser.GameObjects.Sprite;
          if (glow) {
            this.tweens.add({
              targets: glow,
              alpha: 0,
              duration: 500,
              onComplete: () => glow.destroy(),
            });
          }
        }
        break;

      case 'scratch':
        this.showLoreFloatingText(loreSprite.x, loreSprite.y, loreEntry.text, '#9ca3af');
        break;

      case 'whisper':
        this.audioSystem.play('sfx_whisper', 0.3);
        this.showLoreFloatingText(loreSprite.x, loreSprite.y, loreEntry.text, '#e5e7eb', true);
        break;
    }
  }

  private showLoreModal(lore: LoreEntry): void {
    // Close any existing modal
    if (this.activeLoreModal) {
      this.activeLoreModal.destroy();
    }

    const camera = this.cameras.main;
    const container = this.add.container(
      camera.scrollX + camera.width / 2,
      camera.scrollY + camera.height / 2
    );
    container.setDepth(300);
    this.activeLoreModal = container;

    // Dark overlay
    const overlay = this.add.rectangle(0, 0, camera.width * 2, camera.height * 2, 0x000000, 0.8);
    overlay.setInteractive();
    container.add(overlay);

    // Parchment-style panel
    const panelWidth = 380;
    const panelHeight = 280;
    const panel = this.add.rectangle(0, 0, panelWidth, panelHeight, 0x2a2420);
    panel.setStrokeStyle(3, 0x8b5cf6);
    container.add(panel);

    // Inner border
    const innerBorder = this.add.rectangle(0, 0, panelWidth - 10, panelHeight - 10);
    innerBorder.setStrokeStyle(1, 0x4a4035);
    innerBorder.setFillStyle();
    container.add(innerBorder);

    // Title
    const title = this.add.text(0, -panelHeight / 2 + 30, lore.title || 'Ancient Writing', {
      fontSize: '18px',
      color: '#fbbf24',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    container.add(title);

    // Decorative line under title
    const line = this.add.rectangle(0, -panelHeight / 2 + 50, 200, 2, 0x8b5cf6);
    container.add(line);

    // Body text with word wrap
    const bodyText = this.add.text(0, 0, lore.text, {
      fontSize: '14px',
      color: '#e5e7eb',
      wordWrap: { width: panelWidth - 50 },
      align: 'center',
      lineSpacing: 6,
    });
    bodyText.setOrigin(0.5);
    container.add(bodyText);

    // Continue prompt
    const continueText = this.add.text(0, panelHeight / 2 - 35, '[ Click to continue ]', {
      fontSize: '12px',
      color: '#9ca3af',
      fontStyle: 'italic',
    });
    continueText.setOrigin(0.5);
    container.add(continueText);

    // Pulse the continue text
    this.tweens.add({
      targets: continueText,
      alpha: 0.5,
      duration: 800,
      yoyo: true,
      repeat: -1,
    });

    // Click to close
    overlay.on('pointerdown', () => {
      container.destroy();
      this.activeLoreModal = null;
    });
  }

  private showLoreFloatingText(x: number, y: number, text: string, color: string, italic: boolean = false): void {
    const floatText = this.add.text(x, y - 20, text, {
      fontSize: '12px',
      color: color,
      fontStyle: italic ? 'italic' : 'normal',
      stroke: '#000000',
      strokeThickness: 2,
      wordWrap: { width: 150 },
      align: 'center',
    });
    floatText.setOrigin(0.5);
    floatText.setDepth(200);

    this.tweens.add({
      targets: floatText,
      y: y - 60,
      alpha: 0,
      duration: 3000,
      ease: 'Power2',
      onComplete: () => floatText.destroy(),
    });
  }

  private createLorePrompt(): void {
    this.lorePrompt = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height - 40,
      '[Q] Read',
      {
        fontSize: '14px',
        color: '#ffffff',
        backgroundColor: '#1f2937',
        padding: { x: 12, y: 6 },
      }
    );
    this.lorePrompt.setOrigin(0.5);
    this.lorePrompt.setScrollFactor(0);
    this.lorePrompt.setDepth(100);
    this.lorePrompt.setVisible(false);
  }

  private updateLorePrompt(): void {
    if (this.activeLoreModal) {
      this.lorePrompt.setVisible(false);
      return;
    }

    const INTERACT_RANGE = TILE_SIZE * 2;
    let nearLore = false;
    let loreType = '';

    this.loreObjects.getChildren().forEach((child) => {
      const loreSprite = child as Phaser.Physics.Arcade.Sprite;
      if (!loreSprite.active) return;

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        loreSprite.x, loreSprite.y
      );

      if (dist < INTERACT_RANGE) {
        nearLore = true;
        const entry = loreSprite.getData('loreEntry') as LoreEntry;
        if (entry) {
          loreType = entry.type;
        }
      }
    });

    if (nearLore) {
      let label = 'Read';
      if (loreType === 'tablet') label = 'Read Tablet';
      else if (loreType === 'scratch') label = 'Read Scratch';
      else if (loreType === 'whisper') label = 'Listen';

      this.lorePrompt.setText(`[Q] ${label}`);
      this.lorePrompt.setVisible(true);
    } else {
      this.lorePrompt.setVisible(false);
    }
  }

  private addWallCandles(room: Room): void {
    // Add candles along walls for atmosphere
    // Place candles at intervals along each wall, offset from corners
    // Only place candles where there's actually a wall tile

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

    // Player projectile collisions
    const projectileGroup = this.playerAttackManager.getProjectileGroup();
    this.physics.add.overlap(
      projectileGroup, this.enemies,
      this.playerAttackManager.handleProjectileEnemyCollision.bind(this.playerAttackManager) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    this.physics.add.collider(
      projectileGroup, this.wallLayer,
      this.playerAttackManager.handleProjectileWallCollision.bind(this.playerAttackManager) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
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

    // Lore objects - handled via Q key interaction, not automatic overlap

    // Loot pickups
    const lootGroups = this.lootDropManager.getGroups();
    this.physics.add.overlap(
      this.player, lootGroups.items,
      this.lootDropManager.handleItemPickup.bind(this.lootDropManager) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    this.physics.add.overlap(
      this.player, lootGroups.weapons,
      this.lootDropManager.handleWeaponPickup.bind(this.lootDropManager) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );

    this.physics.add.overlap(
      this.player, lootGroups.gold,
      this.lootDropManager.handleGoldPickup.bind(this.lootDropManager) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
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
    // Events from PlayerAttackManager
    this.events.on('showDamageNumber', (x: number, y: number, damage: number, isPlayer: boolean) => {
      this.showDamageNumber(x, y, damage, isPlayer);
    });

    this.events.on('shakeCamera', (intensity: number, duration: number) => {
      this.shakeCamera(intensity, duration);
    });

    this.events.on('requestEnemiesGroup', (callback: (enemies: Phaser.Physics.Arcade.Group) => void) => {
      callback(this.enemies);
    });

    this.events.on('playerDeath', () => {
      this.handlePlayerDeath();
    });

    this.events.on('enemyDeath', (enemy: Enemy) => {
      this.player.gainXP(enemy.xpValue);
      this.audioSystem.play('sfx_enemy_death', 0.4);
      this.enemySpawnManager.removeHealthBar(enemy);
      this.spawnDeathParticles(enemy.x, enemy.y);
      this.enemiesKilled++;
      this.registry.set('enemiesKilled', this.enemiesKilled);

      // Notify room manager (opens doors when room is cleared)
      // Count remaining active enemies, excluding the one that just died
      const remainingEnemies = this.enemies.getChildren().filter((e) =>
        e.active && e !== (enemy as unknown as Phaser.GameObjects.GameObject)
      ).length;
      this.roomManager.onEnemyKilled(remainingEnemies);

      // Switch back to exploration music when room is cleared
      if (remainingEnemies === 0) {
        this.audioSystem.setMusicStyle('exploration');
      }

      // Boss drops guaranteed rare+ loot and a weapon
      if (enemy instanceof BossEnemy) {
        const loot = this.lootSystem.generateGuaranteedLoot(ItemRarity.RARE);
        this.lootDropManager.spawnItemDrop(enemy.x, enemy.y, loot);

        // Guaranteed weapon from bosses with higher rarity
        const weapon = Weapon.createRandom(this.floor + 5);
        this.lootDropManager.spawnWeaponDrop(enemy.x + 24, enemy.y, weapon);

        // Bosses drop lots of gold
        const bossGold = 50 + this.floor * 20;
        this.lootDropManager.spawnGoldDrop(enemy.x - 24, enemy.y, bossGold);

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
          this.lootDropManager.spawnItemDrop(enemy.x, enemy.y, loot);
        }

        // Weapon drop chance
        if (Math.random() < weaponChance) {
          const weapon = Weapon.createRandom(this.floor + (isChallengeEnemy ? 2 : 0));
          this.lootDropManager.spawnWeaponDrop(enemy.x, enemy.y, weapon);
        }

        // Gold drops - all enemies drop some gold
        const baseGold = 5 + this.floor * 2;
        const goldAmount = baseGold + Math.floor(Math.random() * baseGold);
        const goldMultiplier = isChallengeEnemy ? 2 : 1;
        this.lootDropManager.spawnGoldDrop(enemy.x, enemy.y, goldAmount * goldMultiplier);
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

    // Loot collection events from LootDropManager
    this.events.on('itemCollected', () => {
      this.itemsCollected++;
      this.registry.set('itemsCollected', this.itemsCollected);
    });

    this.events.on('goldCollected', () => {
      this.updateHUD();
    });

    this.events.on('inventoryFull', () => {
      this.showGameMessage('Inventory full!');
    });

    // Listen for level up
    this.events.on('playerLevelUp', () => {
      this.audioSystem.play('sfx_levelup', 0.5);
      this.showLevelUpNotification();
    });

    // === SIN ENEMY EVENTS ===

    // Sloth's slowing aura - temporarily reduce player speed
    this.events.on('playerSlowed', (slowFactor: number) => {
      this.player.setSpeedModifier(slowFactor);
    });

    // Lust's magnetic pull - apply velocity toward enemy
    this.events.on('playerPulled', (pullVector: { x: number; y: number }) => {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      if (body) {
        body.velocity.x += pullVector.x;
        body.velocity.y += pullVector.y;
      }
    });

    // Pride's damage reflection - damage player when attacking Pride
    this.events.on('damageReflected', (damage: number) => {
      this.player.takeDamage(damage);
      this.showDamageNumber(this.player.x, this.player.y, damage, true);
      this.showFloatingText(this.player.x, this.player.y - 30, 'REFLECTED!', '#ffd700');
    });

    // Greed's gold stealing - show notification
    this.events.on('goldStolen', (amount: number) => {
      this.showFloatingText(this.player.x, this.player.y - 30, `-${amount} gold!`, '#ffd700');
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
      if (this.settingsUI.getIsVisible()) {
        this.settingsUI.hide();
      } else if (this.levelUpUI.getIsVisible()) {
        this.levelUpUI.hide();
      } else if (this.inventoryUI.getIsVisible()) {
        this.inventoryUI.toggle();
      } else {
        // Open settings if nothing else is open
        this.player.setVelocity(0, 0);
        this.settingsUI.show();
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

    // Q: Interact with nearby lore objects
    this.input.keyboard.on('keydown-Q', () => {
      if (this.inventoryUI.getIsVisible() || this.levelUpUI.getIsVisible()) return;
      if (this.activeLoreModal) {
        // Close modal if open
        this.activeLoreModal.destroy();
        this.activeLoreModal = null;
        return;
      }
      this.tryInteractWithLore();
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
      this.lootDropManager.spawnItemDrop(this.player.x + 30, this.player.y, loot);
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

  private showFloatingText(x: number, y: number, message: string, color: string): void {
    const text = this.add.text(x, y, message, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);
    text.setDepth(150);

    this.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1000,
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
