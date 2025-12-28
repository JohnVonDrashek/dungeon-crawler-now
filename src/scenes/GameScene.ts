import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { BossEnemy } from '../entities/enemies/EnemyTypes';
import { TILE_SIZE, DUNGEON_WIDTH, DUNGEON_HEIGHT } from '../utils/constants';
import { DungeonGenerator, DungeonData, Room, RoomType } from '../systems/DungeonGenerator';
import { CombatSystem } from '../systems/CombatSystem';
import { LootSystem } from '../systems/LootSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { ItemRarity } from '../systems/Item';
import { MinimapUI } from '../ui/MinimapUI';
import { LevelUpUI } from '../ui/LevelUpUI';
import { RoomManager } from '../systems/RoomManager';
import { HazardSystem } from '../systems/HazardSystem';
import { Weapon } from '../systems/Weapon';
import { LoreSystem, LoreEntry } from '../systems/LoreSystem';
import { LootDropManager } from '../systems/LootDropManager';
import { PlayerAttackManager } from '../systems/PlayerAttackManager';
import { EnemySpawnManager } from '../systems/EnemySpawnManager';
import { VisualEffectsManager } from '../systems/VisualEffectsManager';
import { progressionManager } from '../systems/ProgressionSystem';
import { SinWorld, getWorldConfig } from '../config/WorldConfig';
import { NPC, createLostSoulData, createWarningSpirit } from '../entities/NPC';
import { hasWangTileset, getWangMapping, getWangTileFrame, getSimpleCornerValues } from '../systems/WangTileSystem';
import { BaseScene } from './BaseScene';
import { AudioSystem } from '../systems/AudioSystem';
import { LightingSystem } from '../systems/LightingSystem';
import { InventoryUI } from '../ui/InventoryUI';
import { SettingsUI } from '../ui/SettingsUI';
import { DialogueUI } from '../ui/DialogueUI';
import { GameHUD } from '../ui/GameHUD';
import { networkManager } from '../multiplayer/NetworkManager';
import { HostController } from '../multiplayer/HostController';
import { GuestController } from '../multiplayer/GuestController';
import { PlayerSync } from '../multiplayer/PlayerSync';

export class GameScene extends BaseScene {
  // Type narrowing for inherited properties (guaranteed non-null in this scene)
  declare protected player: Player;
  declare protected audioSystem: AudioSystem;
  declare protected lightingSystem: LightingSystem;
  declare protected inventoryUI: InventoryUI;
  declare protected settingsUI: SettingsUI;
  declare protected dialogueUI: DialogueUI;

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
  private visualEffects!: VisualEffectsManager;
  private lootSystem!: LootSystem;
  private minimapUI!: MinimapUI;
  private levelUpUI!: LevelUpUI;
  private gameHUD!: GameHUD;
  private roomManager!: RoomManager;
  private hazardSystem!: HazardSystem;
  private loreSystem!: LoreSystem;
  private loreObjects!: Phaser.Physics.Arcade.Group;
  private activeLoreModal: Phaser.GameObjects.Container | null = null;
  private lorePrompt!: Phaser.GameObjects.Text;
  private dungeonNPCs: NPC[] = [];
  private nearbyNPC: NPC | null = null;
  private floor: number = 1;
  private currentWorld: SinWorld | null = null;
  private canExit: boolean = true;
  private isBossFloor: boolean = false;
  private isFinalBoss: boolean = false;
  private enemiesKilled: number = 0;
  private itemsCollected: number = 0;
  private readonly FINAL_FLOOR = 20;

  // Multiplayer
  private hostController: HostController | null = null;
  private guestController: GuestController | null = null;
  private playerSync: PlayerSync | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  createScene(): void {
    this.floor = this.registry.get('floor') || 1;
    this.currentWorld = this.registry.get('currentWorld') || null;
    this.canExit = true;

    // In world mode, floor 3 is the boss floor
    // In legacy mode (no world), every 5th floor is boss
    if (this.currentWorld) {
      this.isBossFloor = this.floor === 3;
      this.isFinalBoss = false; // Final boss is per-world now
    } else {
      this.isBossFloor = this.floor % 5 === 0;
      this.isFinalBoss = this.floor === this.FINAL_FLOOR;
    }

    // Persist stats across floor transitions
    this.enemiesKilled = this.registry.get('enemiesKilled') || 0;
    this.itemsCollected = this.registry.get('itemsCollected') || 0;

    this.combatSystem = new CombatSystem(this);
    this.visualEffects = new VisualEffectsManager(this);
    this.lootSystem = new LootSystem(0.5);
    this.initAudio('exploration');

    // Use room code as seed for multiplayer (both clients get same dungeon)
    const dungeonSeed = networkManager.isMultiplayer ? networkManager.roomCode : undefined;
    this.dungeonGenerator = new DungeonGenerator(DUNGEON_WIDTH, DUNGEON_HEIGHT, dungeonSeed ?? undefined);
    this.dungeon = this.dungeonGenerator.generate();

    this.physics.world.setBounds(0, 0, DUNGEON_WIDTH * TILE_SIZE, DUNGEON_HEIGHT * TILE_SIZE);

    this.createDungeonTiles();

    // Initialize lighting system with world-specific colors and effects
    this.initLighting(this.currentWorld);
    this.initLightingEffects(this.dungeon.tiles, TILE_SIZE);

    const spawnX = this.dungeon.spawnPoint.x * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = this.dungeon.spawnPoint.y * TILE_SIZE + TILE_SIZE / 2;
    this.player = new Player(this, spawnX, spawnY);

    // Create player torch light
    this.lightingSystem.createPlayerTorch(spawnX, spawnY);

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
      this, this.player, this.roomManager, this.audioSystem, this.enemyProjectiles, this.floor, this.currentWorld
    );
    this.enemySpawnManager.create();

    // Initialize multiplayer if connected (after enemySpawnManager exists)
    console.log('[GameScene] Multiplayer state:', {
      isMultiplayer: networkManager.isMultiplayer,
      isHost: networkManager.isHost,
      isGuest: networkManager.isGuest,
      roomCode: networkManager.roomCode,
    });

    if (networkManager.isMultiplayer) {
      this.playerSync = new PlayerSync(this.player);

      if (networkManager.isHost) {
        console.log('[GameScene] Creating HostController');
        this.hostController = new HostController(
          this,
          this.player,
          this.enemies
        );
      } else {
        console.log('[GameScene] Creating GuestController');
        this.guestController = new GuestController(this, this.player);
        this.guestController.setRoomManager(this.roomManager);
      }
    }

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
    this.dialogueUI = new DialogueUI(this);
    this.gameHUD = new GameHUD(this, this.player);
    this.gameHUD.create();
    this.createLorePrompt();

    // Add NPCs to dungeon
    this.spawnDungeonNPCs();

    // Setup player attack after UI is created (needs UI visibility check)
    this.playerAttackManager.setupPlayerAttack(this.inventoryUI, this.levelUpUI);

    // Boss floor announcement
    if (this.isBossFloor) {
      this.showBossAnnouncement();
    }
  }

  update(time: number, delta: number): void {
    if (this.inventoryUI.getIsVisible() || this.levelUpUI.getIsVisible() || this.settingsUI.getIsVisible()) return;
    if (this.debugMenuVisible) return;

    // Multiplayer sync
    this.playerSync?.update();
    this.hostController?.update(delta);
    this.guestController?.update();

    // Reset speed modifier each frame (will be reapplied by SlothEnemy if in range)
    this.player.resetSpeedModifier();

    // Allow movement even during dialogue
    this.player.update(time, delta);

    // Update lighting system
    this.lightingSystem.update(delta);
    this.lightingSystem.updatePlayerTorch(this.player.x, this.player.y);

    // Check for room entry (returns room if entering a new unvisited room)
    // In multiplayer, only host triggers room activation
    const canActivateRooms = !networkManager.isMultiplayer || networkManager.isHost;
    const enteredRoom = this.roomManager.update(this.player.x, this.player.y);

    // Debug logging for multiplayer room issues
    if (enteredRoom) {
      console.log('[GameScene] Room entry detected:', {
        roomId: enteredRoom.id,
        canActivateRooms,
        isMultiplayer: networkManager.isMultiplayer,
        isHost: networkManager.isHost,
      });
    }

    if (enteredRoom && canActivateRooms) {
      console.log('[GameScene] Room activated:', enteredRoom.id, 'isHost:', networkManager.isHost);

      // Light up the torches in this room when it's sealed
      if (this.lightingSystem) {
        this.lightingSystem.lightRoom(enteredRoom.id);
      }

      const exitRoom = this.dungeon.rooms[this.dungeon.rooms.length - 1];
      this.enemySpawnManager.spawnEnemiesInRoom(enteredRoom, this.isBossFloor, exitRoom);
      this.hazardSystem.spawnHazardsInRoom(enteredRoom, this.dungeon);

      // In multiplayer, tell guest to teleport to host
      if (this.hostController) {
        this.hostController.broadcastRoomActivated(enteredRoom.id);
      }
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

    // Check NPC proximity
    this.checkNPCProximity();
    if (this.nearbyNPC) {
      this.showNPCPrompt();
    }

    this.minimapUI.update(this.player.x, this.player.y);
    const enemyCount = this.enemies.getChildren().filter((e) => e.active).length;
    this.gameHUD.update(this.floor, this.currentWorld, this.isBossFloor, enemyCount);
    this.updateLorePrompt();
  }

  private createDungeonTiles(): void {
    this.floorLayer = this.add.group();
    this.wallLayer = this.physics.add.staticGroup();

    // Check if we have a Wang tileset for this world
    const useWangTiles = this.currentWorld && hasWangTileset(this.currentWorld);
    const wangMapping = useWangTiles ? getWangMapping(this.currentWorld!) : null;
    const tilesetKey = useWangTiles ? `tileset_${this.currentWorld}` : null;

    // Fallback textures for non-Wang rendering
    const wallTexture = this.currentWorld ? `wall_${this.currentWorld}` : 'wall';

    for (let y = 0; y < DUNGEON_HEIGHT; y++) {
      for (let x = 0; x < DUNGEON_WIDTH; x++) {
        const tileX = x * TILE_SIZE;
        const tileY = y * TILE_SIZE;

        if (useWangTiles && wangMapping && tilesetKey && this.textures.exists(tilesetKey)) {
          // Use Wang tileset for connected textures
          const corners = getSimpleCornerValues(
            this.dungeon.tiles, x, y, DUNGEON_WIDTH, DUNGEON_HEIGHT
          );
          const frameIndex = getWangTileFrame(
            corners.nw, corners.ne, corners.sw, corners.se, wangMapping
          );

          if (this.dungeon.tiles[y][x] === 1) {
            // Wall tile with Wang texture
            const wall = this.wallLayer.create(tileX, tileY, tilesetKey, frameIndex) as Phaser.Physics.Arcade.Sprite;
            wall.setOrigin(0, 0);
            wall.setImmovable(true);
            wall.refreshBody();
            // Apply Light2D pipeline for dynamic lighting
            wall.setPipeline('Light2D');
          } else {
            // Floor tile with Wang texture
            const floor = this.add.sprite(tileX, tileY, tilesetKey, frameIndex).setOrigin(0, 0);
            floor.setDepth(0);
            // Apply Light2D pipeline for dynamic lighting
            floor.setPipeline('Light2D');
            this.floorLayer.add(floor);
          }
        } else {
          // Fallback to simple textures
          if (this.dungeon.tiles[y][x] === 1) {
            const wall = this.wallLayer.create(tileX, tileY, wallTexture) as Phaser.Physics.Arcade.Sprite;
            wall.setOrigin(0, 0);
            wall.setImmovable(true);
            wall.refreshBody();
            // Apply Light2D pipeline for dynamic lighting
            wall.setPipeline('Light2D');
          } else if (this.dungeon.tiles[y][x] === 0) {
            const room = this.getRoomAtTile(x, y);
            const floorTexture = this.getFloorTextureForRoom(room);
            const floor = this.add.sprite(tileX, tileY, floorTexture).setOrigin(0, 0);
            floor.setDepth(0);
            // Apply Light2D pipeline for dynamic lighting
            floor.setPipeline('Light2D');
            this.floorLayer.add(floor);
          }
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
    // Default floor texture based on current world
    const defaultFloor = this.currentWorld ? `floor_${this.currentWorld}` : 'floor';

    if (!room) return defaultFloor; // Corridors use world floor

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
        return defaultFloor;
    }
  }

  private addRoomDecorations(): void {
    for (const room of this.dungeon.rooms) {
      // Add candles to all rooms for atmosphere
      // Spawn room (id 0) starts lit, other rooms start dark until activated
      const startLit = room.id === 0;
      this.addWallCandles(room, startLit);

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
    chest.setPipeline('Light2D');

    // Add real point light for glow
    const light = this.lights.addLight(chestX, chestY, 100, 0xffd700, 0.7);
    chest.setData('light', light);

    // Pulse animation
    this.tweens.add({
      targets: light,
      intensity: 1.0,
      radius: 120,
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

    // Remove light
    const light = chest.getData('light') as Phaser.GameObjects.Light;
    if (light) {
      this.tweens.killTweensOf(light);
      this.lights.removeLight(light);
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
    const light = this.lights.addLight(shrineX, shrineY, 120, 0x22d3ee, 0.8);
    shrine.setData('light', light);

    // Pulse animation
    this.tweens.add({
      targets: light,
      intensity: 1.1,
      radius: 150,
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

    // Remove light and fade shrine
    const light = shrine.getData('light') as Phaser.GameObjects.Light;
    if (light) {
      this.tweens.killTweensOf(light);
      this.tweens.add({
        targets: light,
        intensity: 0,
        duration: 500,
        onComplete: () => this.lights.removeLight(light),
      });
    }

    // Fade shrine to indicate used
    this.tweens.killTweensOf(shrine);
    shrine.setTint(0x666666);
    shrine.setAlpha(0.6);

    // Show healing effect
    this.audioSystem.play('sfx_levelup', 0.4);
    this.visualEffects.showGameMessage(`Healed ${healAmount} HP!`);

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
      marker.setPipeline('Light2D');

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

  // === NPC SYSTEM ===

  private spawnDungeonNPCs(): void {
    this.dungeonNPCs = [];

    // Only spawn Lost Souls in world mode with world-specific lore
    if (!this.currentWorld) return;

    // Find shrine rooms to place Lost Souls
    const shrineRooms = this.dungeon.rooms.filter(r => r.type === RoomType.SHRINE);

    for (const room of shrineRooms) {
      // Offset from center so NPC doesn't overlap shrine
      const npcX = room.centerX * TILE_SIZE + TILE_SIZE * 2;
      const npcY = room.centerY * TILE_SIZE + TILE_SIZE / 2;

      const npcData = createLostSoulData(this.currentWorld);
      const npc = new NPC(this, npcX, npcY, npcData);
      this.dungeonNPCs.push(npc);
    }

    // On floor 2, add a warning spirit near the exit
    if (this.floor === 2) {
      const exitRoom = this.dungeon.rooms.find(r => r.type === RoomType.EXIT);
      if (exitRoom) {
        const warningX = exitRoom.centerX * TILE_SIZE - TILE_SIZE * 2;
        const warningY = exitRoom.centerY * TILE_SIZE + TILE_SIZE / 2;

        const warningData = createWarningSpirit(this.currentWorld);
        const warningNPC = new NPC(this, warningX, warningY, warningData);
        this.dungeonNPCs.push(warningNPC);
      }
    }
  }

  private checkNPCProximity(): void {
    if (!this.player || this.dungeonNPCs.length === 0) {
      this.nearbyNPC = null;
      return;
    }

    const interactDistance = TILE_SIZE * 1.5;

    for (const npc of this.dungeonNPCs) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        npc.x, npc.y
      );

      if (dist < interactDistance) {
        this.nearbyNPC = npc;
        return;
      }
    }

    this.nearbyNPC = null;
  }

  private showNPCPrompt(): void {
    if (this.nearbyNPC && !this.dialogueUI.getIsVisible()) {
      // Show interact hint at bottom of screen (like Hub)
      const npcData = this.nearbyNPC.getData();
      this.lorePrompt.setText(`[R] Talk to ${npcData.name}`);
      this.lorePrompt.setPosition(this.cameras.main.width / 2, this.cameras.main.height - 40);
      this.lorePrompt.setOrigin(0.5);
      this.lorePrompt.setVisible(true);
    }
  }

  private talkToNPC(): void {
    if (!this.nearbyNPC || this.dialogueUI.getIsVisible()) return;

    this.lorePrompt.setVisible(false);
    // Hide the NPC's indicator while talking
    this.nearbyNPC.hideIndicator();

    const npcRef = this.nearbyNPC;
    this.dialogueUI.show({
      lines: this.nearbyNPC.getDialogue(),
      onComplete: () => {
        // Show the indicator again when dialogue is done
        npcRef.showIndicator();
      },
    });
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
    loreSprite.setPipeline('Light2D');

    // Visual effects based on type
    if (lore.type === 'tablet') {
      // Tablets have a subtle point light
      const light = this.lights.addLight(loreX, loreY, 60, 0x22d3ee, 0.4);
      loreSprite.setData('light', light);

      this.tweens.add({
        targets: light,
        intensity: 0.6,
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
        // Fade out light on first discovery
        if (!wasDiscovered) {
          const light = loreSprite.getData('light') as Phaser.GameObjects.Light;
          if (light) {
            this.tweens.add({
              targets: light,
              intensity: 0,
              duration: 500,
              onComplete: () => this.lights.removeLight(light),
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

      const candle = this.add.sprite(candleX, candleY, 'candle');
      candle.setDepth(5);
      // Apply Light2D pipeline so candle sprite is lit properly
      candle.setPipeline('Light2D');

      // Create actual point light at candle position
      // Pass room ID so we can light up torches when room is activated
      if (this.lightingSystem) {
        this.lightingSystem.createTorchLight(candleX, candleY, undefined, room.id, startLit);
      }

      // Subtle flicker animation for the sprite
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
    this.exit.setPipeline('Light2D');
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
    this.visualEffects.shakeCamera(5, 100);
    this.visualEffects.showDamageNumber(player.x, player.y, result.damage, true);
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
    this.visualEffects.shakeCamera(5, 100);
    this.visualEffects.showDamageNumber(player.x, player.y, damage, true);
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

    // Block exit on boss floor until boss is defeated
    if (this.isBossFloor && this.hasBossAlive()) {
      this.visualEffects.showGameMessage('Defeat the boss first!');
      return;
    }

    this.canExit = false;

    // World mode: different flow
    if (this.currentWorld) {
      this.handleWorldExit();
      return;
    }

    // Legacy mode: original flow
    if (this.isFinalBoss) {
      this.handleVictory();
      return;
    }

    this.audioSystem.play('sfx_stairs', 0.5);
    this.showShop();
  }

  private handleWorldExit(): void {
    this.audioSystem.play('sfx_stairs', 0.5);

    // Floor 3 (boss floor) - complete world and return to hub
    if (this.floor === 3) {
      this.completeWorldAndReturnToHub();
      return;
    }

    // Floor 1-2 - go to shop, then next floor
    this.showShop();
  }

  private completeWorldAndReturnToHub(): void {
    // Mark the world as complete
    progressionManager.completeWorld(this.currentWorld!);

    // Save progress
    this.saveGame();

    // Show completion message
    const worldConfig = getWorldConfig(this.currentWorld!);
    this.showWorldCompleteMessage(worldConfig.name);

    // Transition to hub after delay
    this.time.delayedCall(2500, () => {
      this.cameras.main.fade(500, 0, 0, 0, false, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress === 1) {
          this.registry.remove('currentWorld');
          this.scene.start('HubScene');
        }
      });
    });
  }

  private showWorldCompleteMessage(worldName: string): void {
    const completedCount = progressionManager.getCompletedWorldCount();
    const isAllComplete = progressionManager.areAllWorldsCompleted();

    const titleText = isAllComplete ? 'ALL WORLDS COMPLETE!' : `${worldName} Complete!`;
    const subText = isAllComplete ? 'Return to the Hub for your reward!' : `${completedCount}/7 Worlds Conquered`;

    const title = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 30,
      titleText,
      {
        fontSize: '32px',
        color: isAllComplete ? '#ffd700' : '#22c55e',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      }
    );
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(200);

    const subtitle = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 20,
      subText,
      {
        fontSize: '18px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 2,
      }
    );
    subtitle.setOrigin(0.5);
    subtitle.setScrollFactor(0);
    subtitle.setDepth(200);

    // Celebration effect
    this.cameras.main.flash(500, 50, 200, 50);
  }

  private showShop(): void {
    // Save player state to registry for ShopScene
    this.registry.set('shopData', {
      floor: this.floor,
      currentWorld: this.currentWorld,
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
    let message: string;
    let color: string;
    let fontSize: string;
    let showSubtitle = false;
    let subtitle = '';

    if (this.currentWorld) {
      // World mode - show sin boss announcement
      const worldConfig = getWorldConfig(this.currentWorld);
      message = `⚔ ${worldConfig.name.toUpperCase()} ⚔`;
      subtitle = 'THE SIN AWAITS';
      color = `#${worldConfig.colors.primary.toString(16).padStart(6, '0')}`;
      fontSize = '36px';
      showSubtitle = true;
    } else {
      // Legacy mode
      const isFinal = this.floor === this.FINAL_FLOOR;
      message = isFinal ? 'FLOOR 20\nFINAL BOSS' : `FLOOR ${this.floor}\nBOSS BATTLE`;
      color = isFinal ? '#fbbf24' : '#ff4444';
      fontSize = isFinal ? '40px' : '32px';
    }

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    // Screen flash for dramatic effect in world mode
    if (this.currentWorld) {
      const worldConfig = getWorldConfig(this.currentWorld);
      const flashColor = worldConfig.colors.primary;
      const r = (flashColor >> 16) & 0xff;
      const g = (flashColor >> 8) & 0xff;
      const b = flashColor & 0xff;
      this.cameras.main.flash(300, r, g, b, false);
    }

    const text = this.add.text(centerX, centerY, message, {
      fontSize: fontSize,
      color: color,
      fontStyle: 'bold',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 4,
    });
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(200);

    // Scale in animation
    text.setScale(0.5);
    this.tweens.add({
      targets: text,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

    // Subtitle for world mode
    let subtitleText: Phaser.GameObjects.Text | null = null;
    if (showSubtitle) {
      subtitleText = this.add.text(centerX, centerY + 45, subtitle, {
        fontSize: '18px',
        color: '#9ca3af',
        fontStyle: 'italic',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 2,
      });
      subtitleText.setOrigin(0.5);
      subtitleText.setScrollFactor(0);
      subtitleText.setDepth(200);
      subtitleText.setAlpha(0);

      this.tweens.add({
        targets: subtitleText,
        alpha: 1,
        duration: 500,
        delay: 300,
      });
    }

    // Fade out
    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 1500,
      delay: 1500,
      onComplete: () => text.destroy(),
    });

    if (subtitleText) {
      this.tweens.add({
        targets: subtitleText,
        alpha: 0,
        duration: 1500,
        delay: 1500,
        onComplete: () => subtitleText?.destroy(),
      });
    }
  }

  private setupEventHandlers(): void {
    // Events from PlayerAttackManager
    this.events.on('showDamageNumber', (x: number, y: number, damage: number, isPlayer: boolean) => {
      this.visualEffects.showDamageNumber(x, y, damage, isPlayer);
    });

    this.events.on('shakeCamera', (intensity: number, duration: number) => {
      this.visualEffects.shakeCamera(intensity, duration);
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
      this.visualEffects.spawnDeathParticles(enemy.x, enemy.y);
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
        this.visualEffects.shakeCamera(5, 100);
        this.visualEffects.showDamageNumber(target.x, target.y, result.damage, true);
      }
    });

    // Hazard damage event
    this.events.on('hazardDamage', (damage: number, _source: string) => {
      if (!this.devMode) {
        this.audioSystem.play('sfx_hurt', 0.3);
        this.visualEffects.shakeCamera(3, 80);
        this.visualEffects.showDamageNumber(this.player.x, this.player.y, damage, true);
      }
    });

    // Loot collection events from LootDropManager
    this.events.on('itemCollected', () => {
      this.itemsCollected++;
      this.registry.set('itemsCollected', this.itemsCollected);
    });

    this.events.on('inventoryFull', () => {
      this.visualEffects.showGameMessage('Inventory full!');
    });

    // Listen for level up
    this.events.on('playerLevelUp', () => {
      this.audioSystem.play('sfx_levelup', 0.5);
      this.visualEffects.showLevelUpNotification();
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
      this.visualEffects.showDamageNumber(this.player.x, this.player.y, damage, true);
      this.visualEffects.showFloatingText(this.player.x, this.player.y - 30, 'REFLECTED!', '#ffd700');
    });

    // Greed's gold stealing - show notification
    this.events.on('goldStolen', (amount: number) => {
      this.visualEffects.showFloatingText(this.player.x, this.player.y - 30, `-${amount} gold!`, '#ffd700');
    });
  }

  private setupKeyboardControls(): void {
    if (!this.input.keyboard) return;

    this.input.keyboard.on('keydown-E', () => {
      // Don't open inventory if another menu is open
      if (this.settingsUI.getIsVisible() || this.levelUpUI.getIsVisible()) {
        return;
      }
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
      // Don't open levelup if another menu is open
      if (this.inventoryUI.getIsVisible() || this.settingsUI.getIsVisible()) {
        return;
      }

      if (this.levelUpUI.getIsVisible()) {
        this.levelUpUI.hide();
      } else {
        this.player.setVelocity(0, 0);
        this.levelUpUI.show();
      }
    });

    // Q: Interact with nearby lore objects
    this.input.keyboard.on('keydown-Q', () => {
      if (this.inventoryUI.getIsVisible() || this.levelUpUI.getIsVisible() || this.settingsUI.getIsVisible()) return;
      if (this.activeLoreModal) {
        // Close modal if open
        this.activeLoreModal.destroy();
        this.activeLoreModal = null;
        return;
      }
      this.tryInteractWithLore();
    });

    // R: Talk to nearby NPCs
    this.input.keyboard.on('keydown-R', () => {
      if (this.inventoryUI.getIsVisible() || this.levelUpUI.getIsVisible() || this.settingsUI.getIsVisible()) return;
      if (this.dialogueUI.getIsVisible()) return;
      if (this.nearbyNPC) {
        this.talkToNPC();
      }
    });

    // Dev/Debug controls
    this.setupDevControls();
  }

  private devMode: boolean = false;
  private debugMenu: Phaser.GameObjects.Container | null = null;
  private debugMenuVisible: boolean = false;

  private setupDevControls(): void {
    if (!this.input.keyboard) return;

    // F1: Toggle debug menu
    this.input.keyboard.on('keydown-F1', () => {
      this.toggleDebugMenu();
    });
  }

  private getDebugOptions(): { label: string; action: () => void }[] {
    return [
      {
        label: `[1] God Mode: ${this.devMode ? 'ON' : 'OFF'}`,
        action: () => {
          this.devMode = !this.devMode;
          if (this.devMode) this.player.hp = this.player.maxHp;
          this.showDevMessage(`God Mode: ${this.devMode ? 'ON' : 'OFF'}`);
          this.refreshDebugMenu();
        },
      },
      {
        label: '[2] Full Heal',
        action: () => {
          this.player.hp = this.player.maxHp;
          this.showDevMessage('Fully healed!');
        },
      },
      {
        label: '[3] Level Up x1',
        action: () => {
          this.player.gainXP(this.player.xpToNextLevel);
          this.showDevMessage('Level Up!');
        },
      },
      {
        label: '[4] Level Up x5',
        action: () => {
          for (let i = 0; i < 5; i++) this.player.gainXP(this.player.xpToNextLevel);
          this.showDevMessage('Level Up x5!');
        },
      },
      {
        label: '[5] Add 500 Gold',
        action: () => {
          this.player.gold += 500;
          this.showDevMessage('+500 Gold');
        },
      },
      {
        label: '[6] Spawn Epic Loot',
        action: () => {
          const loot = this.lootSystem.generateGuaranteedLoot(ItemRarity.EPIC);
          this.lootDropManager.spawnItemDrop(this.player.x + 30, this.player.y, loot);
          this.showDevMessage('Spawned Epic Loot');
        },
      },
      {
        label: '[7] Spawn Rare Loot',
        action: () => {
          const loot = this.lootSystem.generateGuaranteedLoot(ItemRarity.RARE);
          this.lootDropManager.spawnItemDrop(this.player.x + 30, this.player.y, loot);
          this.showDevMessage('Spawned Rare Loot');
        },
      },
      {
        label: '[8] Kill All Enemies',
        action: () => {
          let count = 0;
          this.enemies.getChildren().forEach((child) => {
            const enemy = child as unknown as Enemy;
            if (enemy.active) {
              enemy.takeDamage(9999);
              count++;
            }
          });
          this.showDevMessage(`Killed ${count} enemies`);
        },
      },
      {
        label: '[9] Skip to Next Floor',
        action: () => {
          this.showDevMessage(`Skipping to floor ${this.floor + 1}`);
          this.closeDebugMenu();
          this.handleExitCollision();
        },
      },
      {
        label: '[0] Jump to Boss Floor',
        action: () => {
          if (this.currentWorld) {
            this.floor = 2;
            this.registry.set('floor', 2);
            const worldConfig = getWorldConfig(this.currentWorld);
            this.showDevMessage(`Jumping to ${worldConfig.name} BOSS`);
          } else {
            this.floor = this.FINAL_FLOOR - 1;
            this.registry.set('floor', this.floor);
            this.showDevMessage('Jumping to FINAL BOSS');
          }
          this.closeDebugMenu();
          this.handleExitCollision();
        },
      },
      {
        label: '[C] Complete Current World',
        action: () => {
          if (this.currentWorld) {
            progressionManager.completeWorld(this.currentWorld);
            this.showDevMessage(`Completed ${getWorldConfig(this.currentWorld).name}`);
          } else {
            this.showDevMessage('Not in world mode');
          }
        },
      },
      {
        label: '[A] Complete All Worlds',
        action: () => {
          const allWorlds = [
            SinWorld.PRIDE, SinWorld.GREED, SinWorld.WRATH,
            SinWorld.SLOTH, SinWorld.ENVY, SinWorld.GLUTTONY, SinWorld.LUST
          ];
          allWorlds.forEach(w => progressionManager.completeWorld(w));
          this.showDevMessage('All 7 worlds completed!');
        },
      },
      {
        label: '[H] Return to Hub',
        action: () => {
          this.closeDebugMenu();
          this.registry.remove('currentWorld');
          this.scene.start('HubScene');
        },
      },
    ];
  }

  private toggleDebugMenu(): void {
    if (this.debugMenuVisible) {
      this.closeDebugMenu();
    } else {
      this.openDebugMenu();
    }
  }

  private openDebugMenu(): void {
    if (this.debugMenu) this.debugMenu.destroy();

    this.debugMenuVisible = true;
    this.debugMenu = this.add.container(0, 0);
    this.debugMenu.setScrollFactor(0);
    this.debugMenu.setDepth(500);

    // Background
    const bg = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      320, 400, 0x000000, 0.9
    );
    bg.setStrokeStyle(2, 0xfbbf24);
    this.debugMenu.add(bg);

    // Title
    const title = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 - 175,
      '== DEBUG MENU ==',
      { fontSize: '18px', fontFamily: 'monospace', color: '#fbbf24' }
    );
    title.setOrigin(0.5);
    this.debugMenu.add(title);

    // Hint
    const hint = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2 + 185,
      'Press key or click | F1/ESC to close',
      { fontSize: '10px', fontFamily: 'monospace', color: '#6b7280' }
    );
    hint.setOrigin(0.5);
    this.debugMenu.add(hint);

    // Options
    const options = this.getDebugOptions();
    const startY = this.cameras.main.height / 2 - 140;

    options.forEach((opt, i) => {
      const y = startY + i * 24;
      const text = this.add.text(
        this.cameras.main.width / 2 - 140,
        y,
        opt.label,
        { fontSize: '13px', fontFamily: 'monospace', color: '#e5e7eb' }
      );
      text.setInteractive({ useHandCursor: true });
      text.on('pointerover', () => text.setColor('#fbbf24'));
      text.on('pointerout', () => text.setColor('#e5e7eb'));
      text.on('pointerdown', () => {
        opt.action();
      });
      this.debugMenu!.add(text);
    });

    // Setup keyboard shortcuts for debug menu
    this.setupDebugMenuKeys();
  }

  private setupDebugMenuKeys(): void {
    if (!this.input.keyboard) return;

    const keyHandler = (event: KeyboardEvent) => {
      if (!this.debugMenuVisible) return;

      const options = this.getDebugOptions();
      const key = event.key.toUpperCase();

      // Number keys 1-9, 0
      if (key >= '1' && key <= '9') {
        const idx = parseInt(key) - 1;
        if (idx < options.length) options[idx].action();
      } else if (key === '0') {
        if (options.length > 9) options[9].action();
      } else if (key === 'C') {
        options.find(o => o.label.includes('[C]'))?.action();
      } else if (key === 'A') {
        options.find(o => o.label.includes('[A]'))?.action();
      } else if (key === 'H') {
        options.find(o => o.label.includes('[H]'))?.action();
      } else if (key === 'ESCAPE') {
        this.closeDebugMenu();
      }
    };

    this.input.keyboard.on('keydown', keyHandler);
    this.debugMenu?.once('destroy', () => {
      this.input.keyboard?.off('keydown', keyHandler);
    });
  }

  private refreshDebugMenu(): void {
    if (this.debugMenuVisible) {
      this.openDebugMenu();
    }
  }

  private closeDebugMenu(): void {
    this.debugMenuVisible = false;
    if (this.debugMenu) {
      this.debugMenu.destroy();
      this.debugMenu = null;
    }
  }

  private hasBossAlive(): boolean {
    return this.enemies.getChildren().some((child) => {
      const enemy = child as unknown as Enemy;
      // Check for BossEnemy or sin bosses (all bosses have scale >= 2)
      return enemy.active && (enemy instanceof BossEnemy || enemy.scale >= 2);
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

  private handlePlayerDeath(): void {
    const stats = {
      floor: this.floor,
      level: this.player.level,
      enemiesKilled: this.enemiesKilled,
      itemsCollected: this.itemsCollected,
      currentWorld: this.currentWorld,
    };

    if (this.currentWorld) {
      // World mode: record death but keep progression
      progressionManager.handleDeath();
      // Save progression (active run is now cleared)
      this.saveGame();

      // Clear world from registry
      this.registry.remove('currentWorld');
    } else {
      // Legacy mode: delete save on death (roguelike mechanic)
      SaveSystem.deleteSave();
    }

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
      progressionManager.getProgression(),
      this.player.getSaveData(),
      this.player.inventory
    );
  }

  private loadSavedGame(): void {
    const savedData = SaveSystem.load();
    if (!savedData) return;

    // Restore progression state
    progressionManager.setProgression(savedData.progression);

    // Restore player data if we have an active run
    const activeRun = savedData.progression.activeRun;
    if (activeRun) {
      this.floor = activeRun.floor;
      this.registry.set('floor', this.floor);
      // Boss floor is floor 3 of each world (last floor)
      this.isBossFloor = this.floor === 3;
    }

    this.player.restoreFromSave(savedData.player);
    SaveSystem.restoreInventory(this.player.inventory, savedData.inventory);
  }

  shutdown(): void {
    this.gameHUD?.destroy();
    this.hostController?.destroy();
    this.guestController?.destroy();
    this.hostController = null;
    this.guestController = null;
    this.playerSync = null;
  }
}
