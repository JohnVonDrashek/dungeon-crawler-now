import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { BossEnemy } from '../entities/enemies/EnemyTypes';
import { TILE_SIZE, DUNGEON_WIDTH, DUNGEON_HEIGHT } from '../utils/constants';
import { DungeonGenerator, DungeonData, RoomType } from '../systems/DungeonGenerator';
import { CombatSystem } from '../systems/CombatSystem';
import { LootSystem } from '../systems/LootSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { MinimapUI } from '../ui/MinimapUI';
import { LevelUpUI } from '../ui/LevelUpUI';
import { DebugMenuUI } from '../ui/DebugMenuUI';
import { RoomManager } from '../systems/RoomManager';
import { HazardSystem } from '../systems/HazardSystem';
import { LoreSystem } from '../systems/LoreSystem';
import { LoreUIManager } from '../ui/LoreUIManager';
import { LootDropManager } from '../systems/LootDropManager';
import { PlayerAttackManager } from '../systems/PlayerAttackManager';
import { EnemySpawnManager } from '../systems/EnemySpawnManager';
import { VisualEffectsManager } from '../systems/VisualEffectsManager';
import { RoomDecorationManager } from '../systems/RoomDecorationManager';
import { progressionManager } from '../systems/ProgressionSystem';
import { SinWorld, getWorldConfig } from '../config/WorldConfig';
import { DungeonNPCManager } from '../systems/DungeonNPCManager';
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

// Import extracted modules
import { createDungeonTiles } from './game/GameSceneInit';
import { registerKeyboardHandlers, cleanupInput } from './game/GameSceneInput';
import { setupCollisions } from './game/GameSceneCollisions';
import { registerEventHandlers, cleanupEventHandlers, EventHandlers } from './game/GameSceneEvents';

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
  private roomDecorationManager!: RoomDecorationManager;
  private lootSystem!: LootSystem;
  private minimapUI!: MinimapUI;
  private levelUpUI!: LevelUpUI;
  private gameHUD!: GameHUD;
  private roomManager!: RoomManager;
  private hazardSystem!: HazardSystem;
  private loreSystem!: LoreSystem;
  private loreUIManager!: LoreUIManager;
  private chests!: Phaser.Physics.Arcade.Group;
  private shrines!: Phaser.Physics.Arcade.Group;
  private lorePrompt!: Phaser.GameObjects.Text;
  private dungeonNPCManager!: DungeonNPCManager;
  private debugMenuUI!: DebugMenuUI;
  private floor: number = 1;
  private currentWorld: SinWorld | null = null;
  private canExit: boolean = true;
  private isBossFloor: boolean = false;
  private isFinalBoss: boolean = false;
  private enemiesKilled: number = 0;
  private itemsCollected: number = 0;
  private readonly FINAL_FLOOR = 20;
  private exit!: Phaser.Physics.Arcade.Sprite;
  private eventHandlers!: EventHandlers;

  // Multiplayer
  private hostController: HostController | null = null;
  private guestController: GuestController | null = null;
  private playerSync: PlayerSync | null = null;

  constructor() {
    super({ key: 'GameScene' });
  }

  createScene(): void {
    this.initializeSceneState();
    this.initializeSystems();
    this.createPlayer();
    this.restoreShopData();
    this.createManagers();
    this.setupMultiplayer();
    this.setupCamera();
    this.createExit();
    this.loadSavedGame();
    this.createUI();
    this.setupCollisionsAndEvents();
    this.setupKeyboardControls();
    this.showBossAnnouncementIfNeeded();
  }

  private initializeSceneState(): void {
    this.floor = this.registry.get('floor') || 1;
    this.currentWorld = this.registry.get('currentWorld') || null;
    this.canExit = true;

    // In world mode, floor 3 is the boss floor
    // In legacy mode (no world), every 5th floor is boss
    if (this.currentWorld) {
      this.isBossFloor = this.floor === 3;
      this.isFinalBoss = false;
    } else {
      this.isBossFloor = this.floor % 5 === 0;
      this.isFinalBoss = this.floor === this.FINAL_FLOOR;
    }

    // Persist stats across floor transitions
    this.enemiesKilled = this.registry.get('enemiesKilled') || 0;
    this.itemsCollected = this.registry.get('itemsCollected') || 0;
  }

  private initializeSystems(): void {
    this.combatSystem = new CombatSystem(this);
    this.visualEffects = new VisualEffectsManager(this);
    this.lootSystem = new LootSystem(0.5);
    this.initAudio('exploration');

    // Use room code as seed for multiplayer (both clients get same dungeon)
    const dungeonSeed = networkManager.isMultiplayer ? networkManager.roomCode : undefined;
    this.dungeonGenerator = new DungeonGenerator(DUNGEON_WIDTH, DUNGEON_HEIGHT, dungeonSeed ?? undefined);
    this.dungeon = this.dungeonGenerator.generate();

    this.physics.world.setBounds(0, 0, DUNGEON_WIDTH * TILE_SIZE, DUNGEON_HEIGHT * TILE_SIZE);

    // Use extracted module for dungeon tile creation
    const tiles = createDungeonTiles(this, this.dungeon, this.currentWorld);
    this.wallLayer = tiles.wallLayer;
    // floorLayer is created but only used for visual rendering, not referenced later

    // Initialize lighting system with world-specific colors and effects
    this.initLighting(this.currentWorld);
    this.initLightingEffects(this.dungeon.tiles, TILE_SIZE);
  }

  private createPlayer(): void {
    const spawnX = this.dungeon.spawnPoint.x * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = this.dungeon.spawnPoint.y * TILE_SIZE + TILE_SIZE / 2;
    this.player = new Player(this, spawnX, spawnY);
    this.lightingSystem.createPlayerTorch(spawnX, spawnY);
  }

  private restoreShopData(): void {
    const shopData = this.registry.get('shopData') as {
      floor: number;
      playerStats: ReturnType<Player['getSaveData']>;
      inventorySerialized: string;
    } | undefined;

    if (shopData) {
      this.player.restoreFromSave(shopData.playerStats);
      this.player.inventory.deserialize(shopData.inventorySerialized);
      this.player.recalculateStats();
      this.registry.remove('shopData');
      this.saveGame();
    }
  }

  private createManagers(): void {
    // Create projectile groups
    this.playerAttackManager = new PlayerAttackManager(this, this.player, this.audioSystem);
    this.playerAttackManager.create();
    this.enemyProjectiles = this.physics.add.group({ runChildUpdate: true });

    // Create loot drop manager (must be before roomDecorationManager)
    this.lootDropManager = new LootDropManager(this, this.player, this.audioSystem);
    this.lootDropManager.create();

    // Create room decoration manager
    this.roomDecorationManager = new RoomDecorationManager(
      this, this.player, this.dungeon, this.lightingSystem, this.audioSystem,
      this.lootSystem, this.lootDropManager, this.visualEffects, this.floor
    );
    this.roomDecorationManager.create();
    this.chests = this.roomDecorationManager.getChests();
    this.shrines = this.roomDecorationManager.getShrines();

    // Create lore system and UI manager
    this.loreSystem = new LoreSystem();
    this.loreUIManager = new LoreUIManager(
      this, this.player, this.loreSystem, this.audioSystem, this.floor
    );
    this.loreUIManager.create();
    this.lorePrompt = this.loreUIManager.getLorePrompt();

    // Add room decorations with lore callback
    this.roomDecorationManager.addRoomDecorations((room) => {
      this.loreUIManager.tryAddLoreObject(room);
      if (room.type === RoomType.SHRINE) {
        this.loreUIManager.addLoreObject(room, 'tablet');
      }
    });

    // Create room manager for door/room mechanics
    this.roomManager = new RoomManager(this, this.dungeon);

    // Create enemy spawn manager (needs roomManager)
    this.enemySpawnManager = new EnemySpawnManager(
      this, this.player, this.roomManager, this.audioSystem, this.enemyProjectiles, this.floor, this.currentWorld
    );
    this.enemySpawnManager.create();

    // Create hazard system
    this.hazardSystem = new HazardSystem(this, this.player, this.floor);
    this.hazardSystem.setRoomManager(this.roomManager);
  }

  private setupMultiplayer(): void {
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
        this.hostController = new HostController(this, this.player, this.enemies);
      } else {
        console.log('[GameScene] Creating GuestController');
        this.guestController = new GuestController(this, this.player);
        this.guestController.setRoomManager(this.roomManager);
      }
    }
  }

  private setupCamera(): void {
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setBounds(0, 0, DUNGEON_WIDTH * TILE_SIZE, DUNGEON_HEIGHT * TILE_SIZE);
  }

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

  private setupCollisionsAndEvents(): void {
    // Use extracted collision module
    setupCollisions(
      this,
      {
        player: this.player,
        wallLayer: this.wallLayer,
        enemies: this.enemies,
        enemyProjectiles: this.enemyProjectiles,
        exit: this.exit,
        chests: this.chests,
        shrines: this.shrines,
      },
      {
        combatSystem: this.combatSystem,
        visualEffects: this.visualEffects,
        audioSystem: this.audioSystem,
        playerAttackManager: this.playerAttackManager,
        lootDropManager: this.lootDropManager,
        roomManager: this.roomManager,
        roomDecorationManager: this.roomDecorationManager,
        hazardSystem: this.hazardSystem,
        debugMenuUI: this.debugMenuUI,
      },
      { onExitCollision: () => this.handleExitCollision() }
    );

    // Use extracted event module
    this.eventHandlers = registerEventHandlers(
      this,
      {
        player: this.player,
        combatSystem: this.combatSystem,
        visualEffects: this.visualEffects,
        audioSystem: this.audioSystem,
        lootSystem: this.lootSystem,
        lootDropManager: this.lootDropManager,
        enemySpawnManager: this.enemySpawnManager,
        roomManager: this.roomManager,
        levelUpUI: this.levelUpUI,
        debugMenuUI: this.debugMenuUI,
      },
      {
        floor: this.floor,
        currentWorld: this.currentWorld,
        isFinalBoss: this.isFinalBoss,
        getEnemiesKilled: () => this.enemiesKilled,
        setEnemiesKilled: (count) => { this.enemiesKilled = count; },
        getItemsCollected: () => this.itemsCollected,
        setItemsCollected: (count) => { this.itemsCollected = count; },
      },
      {
        onPlayerDeath: () => this.handlePlayerDeath(),
        onVictory: () => this.handleVictory(),
        onWorldComplete: () => this.handleWorldComplete(),
      }
    );
  }

  private createUI(): void {
    this.inventoryUI = new InventoryUI(this, this.player);
    this.minimapUI = new MinimapUI(this, this.dungeon);
    this.roomDecorationManager.setMinimapUI(this.minimapUI);
    this.levelUpUI = new LevelUpUI(this, this.player);
    this.settingsUI = new SettingsUI(this, this.audioSystem);
    this.dialogueUI = new DialogueUI(this);
    this.gameHUD = new GameHUD(this, this.player);
    this.gameHUD.create();

    // Create debug menu UI
    this.debugMenuUI = new DebugMenuUI(
      this, this.player, this.lootSystem, this.lootDropManager,
      {
        getEnemies: () => this.enemies,
        handleExitCollision: () => this.handleExitCollision(),
        closeAndReturnToHub: () => {
          this.registry.remove('currentWorld');
          this.scene.start('HubScene');
        },
      }
    );
    this.debugMenuUI.setFloorInfo(this.floor, this.currentWorld);

    // Create and initialize DungeonNPCManager
    this.dungeonNPCManager = new DungeonNPCManager(
      this, this.player, this.dungeon, this.dialogueUI, this.currentWorld, this.floor
    );
    this.dungeonNPCManager.setLorePrompt(this.lorePrompt);
    this.dungeonNPCManager.spawnDungeonNPCs();

    // Setup player attack after UI is created
    this.playerAttackManager.setupPlayerAttack(this.inventoryUI, this.levelUpUI);
  }

  private setupKeyboardControls(): void {
    // Use extracted keyboard handler module
    registerKeyboardHandlers(this, {
      player: this.player,
      inventoryUI: this.inventoryUI,
      levelUpUI: this.levelUpUI,
      settingsUI: this.settingsUI,
      debugMenuUI: this.debugMenuUI,
      loreUIManager: this.loreUIManager,
      dialogueUI: this.dialogueUI,
      dungeonNPCManager: this.dungeonNPCManager,
    });
  }

  private showBossAnnouncementIfNeeded(): void {
    if (this.isBossFloor) {
      this.showBossAnnouncement();
    }
  }

  update(time: number, delta: number): void {
    if (this.inventoryUI.getIsVisible() || this.levelUpUI.getIsVisible() || this.settingsUI.getIsVisible()) return;
    if (this.debugMenuUI.getIsVisible()) return;

    // Multiplayer sync
    this.playerSync?.update();
    this.hostController?.update(delta);
    this.guestController?.update();

    // Reset speed modifier each frame
    this.player.resetSpeedModifier();
    this.player.update(time, delta);

    // Update lighting system
    this.lightingSystem.update(delta);
    this.lightingSystem.updatePlayerTorch(this.player.x, this.player.y);

    // Check for room entry
    const canActivateRooms = !networkManager.isMultiplayer || networkManager.isHost;
    const enteredRoom = this.roomManager.update(this.player.x, this.player.y);

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

      if (this.lightingSystem) {
        this.lightingSystem.lightRoom(enteredRoom.id);
      }

      const exitRoom = this.dungeon.rooms[this.dungeon.rooms.length - 1];
      this.enemySpawnManager.spawnEnemiesInRoom(enteredRoom, this.isBossFloor, exitRoom);
      this.hazardSystem.spawnHazardsInRoom(enteredRoom, this.dungeon);

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

    this.hazardSystem.update(delta);

    // Check NPC proximity
    this.dungeonNPCManager.checkNPCProximity();
    if (this.dungeonNPCManager.getNearbyNPC()) {
      this.dungeonNPCManager.showNPCPrompt();
    }

    this.minimapUI.update(this.player.x, this.player.y);
    const enemyCount = this.enemies.getChildren().filter((e) => e.active).length;
    this.gameHUD.update(this.floor, this.currentWorld, this.isBossFloor, enemyCount);
    this.loreUIManager.updateLorePrompt();
  }

  private handleExitCollision(): void {
    if (!this.canExit) return;

    if (this.isBossFloor && this.hasBossAlive()) {
      this.visualEffects.showGameMessage('Defeat the boss first!');
      return;
    }

    this.canExit = false;

    if (this.currentWorld) {
      this.handleWorldExit();
      return;
    }

    if (this.isFinalBoss) {
      this.handleVictory();
      return;
    }

    this.audioSystem.play('sfx_stairs', 0.5);
    this.showShop();
  }

  private handleWorldExit(): void {
    this.audioSystem.play('sfx_stairs', 0.5);

    if (this.floor === 3) {
      this.completeWorldAndReturnToHub();
      return;
    }

    this.showShop();
  }

  private completeWorldAndReturnToHub(): void {
    progressionManager.completeWorld(this.currentWorld!);
    this.saveGame();

    const worldConfig = getWorldConfig(this.currentWorld!);
    this.showWorldCompleteMessage(worldConfig.name);

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

    this.cameras.main.flash(500, 50, 200, 50);
  }

  private showShop(): void {
    this.registry.set('shopData', {
      floor: this.floor,
      currentWorld: this.currentWorld,
      playerStats: this.player.getSaveData(),
      inventorySerialized: this.player.inventory.serialize(),
    });

    this.registry.set('enemiesKilled', this.enemiesKilled);
    this.registry.set('itemsCollected', this.itemsCollected);

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
      const worldConfig = getWorldConfig(this.currentWorld);
      message = `${worldConfig.name.toUpperCase()}`;
      subtitle = 'THE SIN AWAITS';
      color = `#${worldConfig.colors.primary.toString(16).padStart(6, '0')}`;
      fontSize = '36px';
      showSubtitle = true;
    } else {
      const isFinal = this.floor === this.FINAL_FLOOR;
      message = isFinal ? 'FLOOR 20\nFINAL BOSS' : `FLOOR ${this.floor}\nBOSS BATTLE`;
      color = isFinal ? '#fbbf24' : '#ff4444';
      fontSize = isFinal ? '40px' : '32px';
    }

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

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

    text.setScale(0.5);
    this.tweens.add({
      targets: text,
      scale: 1,
      duration: 400,
      ease: 'Back.easeOut',
    });

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

  private hasBossAlive(): boolean {
    return this.enemies.getChildren().some((child) => {
      const enemy = child as unknown as Enemy;
      return enemy.active && (enemy instanceof BossEnemy || enemy.scale >= 2);
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
      progressionManager.handleDeath();
      this.saveGame();
      this.registry.remove('currentWorld');
    } else {
      SaveSystem.deleteSave();
    }

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

    this.registry.set('floor', 1);
    this.registry.set('enemiesKilled', 0);
    this.registry.set('itemsCollected', 0);

    this.cameras.main.flash(2000, 255, 215, 0);
    this.time.delayedCall(2000, () => {
      this.scene.start('VictoryScene', stats);
    });
  }

  private handleWorldComplete(): void {
    this.cameras.main.flash(2000, 255, 215, 0);
    this.visualEffects.showGameMessage(`${this.currentWorld} World Complete!`);

    this.registry.set('floor', 1);
    this.registry.set('currentWorld', null);
    this.registry.set('enemiesKilled', 0);
    this.registry.set('itemsCollected', 0);

    this.time.delayedCall(2000, () => {
      this.scene.start('HubScene');
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

    progressionManager.setProgression(savedData.progression);

    const activeRun = savedData.progression.activeRun;
    if (activeRun) {
      this.floor = activeRun.floor;
      this.registry.set('floor', this.floor);
      this.isBossFloor = this.floor === 3;
    }

    this.player.restoreFromSave(savedData.player);
    SaveSystem.restoreInventory(this.player.inventory, savedData.inventory);
  }

  shutdown(): void {
    // Clean up UI managers
    this.gameHUD?.destroy();
    this.loreUIManager?.destroy();
    this.debugMenuUI?.close();

    // Clean up multiplayer
    this.hostController?.destroy();
    this.guestController?.destroy();
    this.hostController = null;
    this.guestController = null;
    this.playerSync = null;

    // Stop audio
    this.audioSystem?.stopMusic();

    // Clean up event listeners using extracted module
    if (this.eventHandlers) {
      cleanupEventHandlers(this, this.eventHandlers);
    }

    // Clean up keyboard listeners using extracted module
    cleanupInput(this);

    // Clean up lighting
    this.lightingSystem?.destroy();
  }
}
