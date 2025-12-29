import { Player } from '../../entities/Player';
import { DungeonGenerator, DungeonData, Room, RoomType } from '../../systems/DungeonGenerator';
import { CombatSystem } from '../../systems/CombatSystem';
import { LootSystem } from '../../systems/LootSystem';
import { RoomManager } from '../../systems/RoomManager';
import { HazardSystem } from '../../systems/HazardSystem';
import { LoreSystem } from '../../systems/LoreSystem';
import { LoreUIManager } from '../../ui/LoreUIManager';
import { LootDropManager } from '../../systems/LootDropManager';
import { PlayerAttackManager } from '../../systems/PlayerAttackManager';
import { EnemySpawnManager } from '../../systems/EnemySpawnManager';
import { VisualEffectsManager } from '../../systems/VisualEffectsManager';
import { RoomDecorationManager } from '../../systems/RoomDecorationManager';
import { MinimapUI } from '../../ui/MinimapUI';
import { LevelUpUI } from '../../ui/LevelUpUI';
import { DebugMenuUI } from '../../ui/DebugMenuUI';
import { InventoryUI } from '../../ui/InventoryUI';
import { SettingsUI } from '../../ui/SettingsUI';
import { DialogueUI } from '../../ui/DialogueUI';
import { GameHUD } from '../../ui/GameHUD';
import { DungeonNPCManager } from '../../systems/DungeonNPCManager';
import { AudioSystem } from '../../systems/AudioSystem';
import { LightingSystem } from '../../systems/LightingSystem';
import { SinWorld } from '../../config/WorldConfig';
import { TILE_SIZE, DUNGEON_WIDTH, DUNGEON_HEIGHT } from '../../utils/constants';
import { hasWangTileset, getWangMapping, getWangTileFrame, getSimpleCornerValues } from '../../systems/WangTileSystem';
import { networkManager } from '../../multiplayer/NetworkManager';
import { HostController } from '../../multiplayer/HostController';
import { GuestController } from '../../multiplayer/GuestController';
import { PlayerSync } from '../../multiplayer/PlayerSync';

/**
 * All the game systems created during scene initialization
 */
export interface GameSceneSystems {
  player: Player;
  dungeon: DungeonData;
  dungeonGenerator: DungeonGenerator;
  wallLayer: Phaser.GameObjects.Group;
  floorLayer: Phaser.GameObjects.Group;
  combatSystem: CombatSystem;
  visualEffects: VisualEffectsManager;
  lootSystem: LootSystem;
  lootDropManager: LootDropManager;
  playerAttackManager: PlayerAttackManager;
  enemySpawnManager: EnemySpawnManager;
  enemyProjectiles: Phaser.Physics.Arcade.Group;
  roomManager: RoomManager;
  hazardSystem: HazardSystem;
  loreSystem: LoreSystem;
  loreUIManager: LoreUIManager;
  roomDecorationManager: RoomDecorationManager;
  chests: Phaser.Physics.Arcade.Group;
  shrines: Phaser.Physics.Arcade.Group;
  lorePrompt: Phaser.GameObjects.Text;
  minimapUI: MinimapUI;
  levelUpUI: LevelUpUI;
  inventoryUI: InventoryUI;
  settingsUI: SettingsUI;
  dialogueUI: DialogueUI;
  gameHUD: GameHUD;
  debugMenuUI: DebugMenuUI;
  dungeonNPCManager: DungeonNPCManager;
  exit: Phaser.Physics.Arcade.Sprite;
  hostController: HostController | null;
  guestController: GuestController | null;
  playerSync: PlayerSync | null;
}

/**
 * Parameters needed for system initialization
 */
export interface InitParams {
  scene: Phaser.Scene;
  floor: number;
  currentWorld: SinWorld | null;
  audioSystem: AudioSystem;
  lightingSystem: LightingSystem;
}

/**
 * Initialize all game systems for the GameScene
 */
export function initializeSystems(params: InitParams): GameSceneSystems {
  const { scene, floor, currentWorld, audioSystem, lightingSystem } = params;

  // Core combat and visual systems
  const combatSystem = new CombatSystem(scene);
  const visualEffects = new VisualEffectsManager(scene);
  const lootSystem = new LootSystem(0.5);

  // Use room code as seed for multiplayer (both clients get same dungeon)
  const dungeonSeed = networkManager.isMultiplayer ? networkManager.roomCode : undefined;
  const dungeonGenerator = new DungeonGenerator(DUNGEON_WIDTH, DUNGEON_HEIGHT, dungeonSeed ?? undefined);
  const dungeon = dungeonGenerator.generate();

  scene.physics.world.setBounds(0, 0, DUNGEON_WIDTH * TILE_SIZE, DUNGEON_HEIGHT * TILE_SIZE);

  // Create dungeon tiles
  const { wallLayer, floorLayer } = createDungeonTiles(scene, dungeon, currentWorld);

  // Create player at spawn point
  const spawnX = dungeon.spawnPoint.x * TILE_SIZE + TILE_SIZE / 2;
  const spawnY = dungeon.spawnPoint.y * TILE_SIZE + TILE_SIZE / 2;
  const player = new Player(scene, spawnX, spawnY);

  // Create player torch light
  lightingSystem.createPlayerTorch(spawnX, spawnY);

  // Create projectile groups
  const playerAttackManager = new PlayerAttackManager(scene, player, audioSystem);
  playerAttackManager.create();
  const enemyProjectiles = scene.physics.add.group({ runChildUpdate: true });

  // Create loot drop manager (must be before roomDecorationManager)
  const lootDropManager = new LootDropManager(scene, player, audioSystem);
  lootDropManager.create();

  // Create room decoration manager
  const roomDecorationManager = new RoomDecorationManager(
    scene, player, dungeon, lightingSystem, audioSystem,
    lootSystem, lootDropManager, visualEffects, floor
  );
  roomDecorationManager.create();
  const chests = roomDecorationManager.getChests();
  const shrines = roomDecorationManager.getShrines();

  // Create lore system and UI manager
  const loreSystem = new LoreSystem();
  const loreUIManager = new LoreUIManager(
    scene, player, loreSystem, audioSystem, floor
  );
  loreUIManager.create();
  const lorePrompt = loreUIManager.getLorePrompt();

  // Add room decorations (chests, shrines, candles) with callback for lore placement
  roomDecorationManager.addRoomDecorations((room) => {
    loreUIManager.tryAddLoreObject(room);
    if (room.type === RoomType.SHRINE) {
      loreUIManager.addLoreObject(room, 'tablet');
    }
  });

  // Create room manager for door/room mechanics
  const roomManager = new RoomManager(scene, dungeon);

  // Create enemy spawn manager (needs roomManager)
  const enemySpawnManager = new EnemySpawnManager(
    scene, player, roomManager, audioSystem, enemyProjectiles, floor, currentWorld
  );
  enemySpawnManager.create();

  // Initialize multiplayer if connected
  console.log('[GameScene] Multiplayer state:', {
    isMultiplayer: networkManager.isMultiplayer,
    isHost: networkManager.isHost,
    isGuest: networkManager.isGuest,
    roomCode: networkManager.roomCode,
  });

  let hostController: HostController | null = null;
  let guestController: GuestController | null = null;
  let playerSync: PlayerSync | null = null;

  if (networkManager.isMultiplayer) {
    playerSync = new PlayerSync(player);

    if (networkManager.isHost) {
      console.log('[GameScene] Creating HostController');
      hostController = new HostController(
        scene,
        player,
        enemySpawnManager.getEnemiesGroup()
      );
    } else {
      console.log('[GameScene] Creating GuestController');
      guestController = new GuestController(scene, player);
      guestController.setRoomManager(roomManager);
    }
  }

  // Create hazard system
  const hazardSystem = new HazardSystem(scene, player, floor);
  hazardSystem.setRoomManager(roomManager);

  // Create exit
  const exit = createExit(scene, dungeon);

  // Create UI components
  const inventoryUI = new InventoryUI(scene, player);
  const minimapUI = new MinimapUI(scene, dungeon);
  roomDecorationManager.setMinimapUI(minimapUI);
  const levelUpUI = new LevelUpUI(scene, player);
  const settingsUI = new SettingsUI(scene, audioSystem);
  const dialogueUI = new DialogueUI(scene);
  const gameHUD = new GameHUD(scene, player);
  gameHUD.create();

  // Create debug menu UI
  const debugMenuUI = new DebugMenuUI(
    scene, player, lootSystem, lootDropManager,
    {
      getEnemies: () => enemySpawnManager.getEnemiesGroup(),
      handleExitCollision: () => {
        scene.events.emit('handleExitCollision');
      },
      closeAndReturnToHub: () => {
        scene.registry.remove('currentWorld');
        scene.scene.start('HubScene');
      },
    }
  );
  debugMenuUI.setFloorInfo(floor, currentWorld);

  // Create and initialize DungeonNPCManager
  const dungeonNPCManager = new DungeonNPCManager(
    scene, player, dungeon, dialogueUI, currentWorld, floor
  );
  dungeonNPCManager.setLorePrompt(lorePrompt);
  dungeonNPCManager.spawnDungeonNPCs();

  // Setup player attack after UI is created (needs UI visibility check)
  playerAttackManager.setupPlayerAttack(inventoryUI, levelUpUI);

  return {
    player,
    dungeon,
    dungeonGenerator,
    wallLayer,
    floorLayer,
    combatSystem,
    visualEffects,
    lootSystem,
    lootDropManager,
    playerAttackManager,
    enemySpawnManager,
    enemyProjectiles,
    roomManager,
    hazardSystem,
    loreSystem,
    loreUIManager,
    roomDecorationManager,
    chests,
    shrines,
    lorePrompt,
    minimapUI,
    levelUpUI,
    inventoryUI,
    settingsUI,
    dialogueUI,
    gameHUD,
    debugMenuUI,
    dungeonNPCManager,
    exit,
    hostController,
    guestController,
    playerSync,
  };
}

/**
 * Create dungeon floor and wall tiles
 */
export function createDungeonTiles(
  scene: Phaser.Scene,
  dungeon: DungeonData,
  currentWorld: SinWorld | null
): { wallLayer: Phaser.GameObjects.Group; floorLayer: Phaser.GameObjects.Group } {
  const floorLayer = scene.add.group();
  const wallLayer = scene.physics.add.staticGroup();

  // Check if we have a Wang tileset for this world
  const useWangTiles = currentWorld && hasWangTileset(currentWorld);
  const wangMapping = useWangTiles ? getWangMapping(currentWorld!) : null;
  const tilesetKey = useWangTiles ? `tileset_${currentWorld}` : null;

  // Fallback textures for non-Wang rendering
  const wallTexture = currentWorld ? `wall_${currentWorld}` : 'wall';

  for (let y = 0; y < DUNGEON_HEIGHT; y++) {
    for (let x = 0; x < DUNGEON_WIDTH; x++) {
      const tileX = x * TILE_SIZE;
      const tileY = y * TILE_SIZE;

      if (useWangTiles && wangMapping && tilesetKey && scene.textures.exists(tilesetKey)) {
        // Use Wang tileset for connected textures
        const corners = getSimpleCornerValues(
          dungeon.tiles, x, y, DUNGEON_WIDTH, DUNGEON_HEIGHT
        );
        const frameIndex = getWangTileFrame(
          corners.nw, corners.ne, corners.sw, corners.se, wangMapping
        );

        if (dungeon.tiles[y][x] === 1) {
          // Wall tile with Wang texture
          const wall = wallLayer.create(tileX, tileY, tilesetKey, frameIndex) as Phaser.Physics.Arcade.Sprite;
          wall.setOrigin(0, 0);
          wall.setImmovable(true);
          wall.refreshBody();
          // Apply Light2D pipeline for dynamic lighting
          wall.setPipeline('Light2D');
        } else {
          // Floor tile with Wang texture
          const floor = scene.add.sprite(tileX, tileY, tilesetKey, frameIndex).setOrigin(0, 0);
          floor.setDepth(0);
          // Apply Light2D pipeline for dynamic lighting
          floor.setPipeline('Light2D');
          floorLayer.add(floor);
        }
      } else {
        // Fallback to simple textures
        if (dungeon.tiles[y][x] === 1) {
          const wall = wallLayer.create(tileX, tileY, wallTexture) as Phaser.Physics.Arcade.Sprite;
          wall.setOrigin(0, 0);
          wall.setImmovable(true);
          wall.refreshBody();
          // Apply Light2D pipeline for dynamic lighting
          wall.setPipeline('Light2D');
        } else if (dungeon.tiles[y][x] === 0) {
          const room = getRoomAtTile(dungeon, x, y);
          const floorTexture = getFloorTextureForRoom(room, currentWorld);
          const floor = scene.add.sprite(tileX, tileY, floorTexture).setOrigin(0, 0);
          floor.setDepth(0);
          // Apply Light2D pipeline for dynamic lighting
          floor.setPipeline('Light2D');
          floorLayer.add(floor);
        }
      }
    }
  }

  return { wallLayer, floorLayer };
}

/**
 * Get the room at a specific tile coordinate
 */
function getRoomAtTile(dungeon: DungeonData, x: number, y: number): Room | null {
  for (const room of dungeon.rooms) {
    if (x >= room.x && x < room.x + room.width &&
        y >= room.y && y < room.y + room.height) {
      return room;
    }
  }
  return null;
}

/**
 * Get the floor texture for a room based on its type
 */
function getFloorTextureForRoom(room: Room | null, currentWorld: SinWorld | null): string {
  // Default floor texture based on current world
  const defaultFloor = currentWorld ? `floor_${currentWorld}` : 'floor';

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

/**
 * Create the exit sprite
 */
function createExit(scene: Phaser.Scene, dungeon: DungeonData): Phaser.Physics.Arcade.Sprite {
  const exitX = dungeon.exitPoint.x * TILE_SIZE + TILE_SIZE / 2;
  const exitY = dungeon.exitPoint.y * TILE_SIZE + TILE_SIZE / 2;
  const exit = scene.physics.add.sprite(exitX, exitY, 'exit');
  exit.setDepth(1);
  exit.setImmovable(true);
  exit.setPipeline('Light2D');
  if (exit.body) {
    exit.body.setSize(TILE_SIZE * 1.5, TILE_SIZE * 1.5);
  }
  return exit;
}
