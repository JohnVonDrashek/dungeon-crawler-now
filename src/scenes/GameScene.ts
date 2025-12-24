import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { FastEnemy, TankEnemy, RangedEnemy, BossEnemy } from '../entities/enemies/EnemyTypes';
import { TILE_SIZE, DUNGEON_WIDTH, DUNGEON_HEIGHT } from '../utils/constants';
import { DungeonGenerator, DungeonData, Room } from '../systems/DungeonGenerator';
import { CombatSystem } from '../systems/CombatSystem';
import { LootSystem } from '../systems/LootSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { Item, RARITY_COLORS, ItemRarity } from '../systems/Item';
import { InventoryUI } from '../ui/InventoryUI';
import { MinimapUI } from '../ui/MinimapUI';
import { LevelUpUI } from '../ui/LevelUpUI';
import { RoomManager } from '../systems/RoomManager';

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
  private healthBars: Map<Enemy, Phaser.GameObjects.Container> = new Map();
  private combatSystem!: CombatSystem;
  private lootSystem!: LootSystem;
  private audioSystem!: AudioSystem;
  private inventoryUI!: InventoryUI;
  private minimapUI!: MinimapUI;
  private levelUpUI!: LevelUpUI;
  private roomManager!: RoomManager;
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

    // Create projectile groups
    this.projectiles = this.physics.add.group({ runChildUpdate: true });
    this.enemyProjectiles = this.physics.add.group({ runChildUpdate: true });
    this.itemDrops = this.physics.add.group();

    // Create enemies group (enemies spawn on room entry)
    this.enemies = this.physics.add.group({ runChildUpdate: false });

    // Create room manager for door/room mechanics
    this.roomManager = new RoomManager(this, this.dungeon);

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
    }

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as unknown as Enemy;
      if (enemy.active) {
        enemy.update(time, delta);
        this.updateHealthBar(enemy);
      }
    });

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
          const floor = this.add.sprite(tileX, tileY, 'floor').setOrigin(0, 0);
          floor.setDepth(0);
          this.floorLayer.add(floor);
        }
      }
    }
  }

  private spawnBoss(): void {
    const exitRoom = this.dungeon.rooms[this.dungeon.rooms.length - 1];
    const boss = new BossEnemy(
      this,
      exitRoom.centerX * TILE_SIZE + TILE_SIZE / 2,
      exitRoom.centerY * TILE_SIZE + TILE_SIZE / 2,
      this.floor
    );
    boss.setTarget(this.player);
    boss.setProjectileGroup(this.enemyProjectiles);
    this.enemies.add(boss as unknown as Phaser.GameObjects.GameObject);
    this.createHealthBar(boss);
  }

  private spawnEnemiesInRoom(room: Room): void {
    const exitRoom = this.dungeon.rooms[this.dungeon.rooms.length - 1];
    const isBossRoom = this.isBossFloor && room.id === exitRoom.id;

    // Calculate enemy count based on floor and room size (or 1 for boss)
    let enemyCount: number;
    if (isBossRoom) {
      enemyCount = 1;
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
    const indicatorSize = isBossRoom ? TILE_SIZE * 1.5 : TILE_SIZE * 0.8;
    const indicatorColor = isBossRoom ? 0xfbbf24 : 0xff4444;

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
          enemy = new BossEnemy(this, pos.x, pos.y, this.floor);
          enemy.setProjectileGroup(this.enemyProjectiles);
        } else {
          enemy = this.createEnemy(pos.x, pos.y);
        }
        enemy.setTarget(this.player);
        this.enemies.add(enemy as unknown as Phaser.GameObjects.GameObject);
        this.createHealthBar(enemy);

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

    // Door collision
    this.physics.add.collider(this.player, this.roomManager.getDoorGroup());
    this.physics.add.collider(this.enemies, this.roomManager.getDoorGroup());
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

    const result = this.combatSystem.calculateDamage(this.player, enemy);
    this.combatSystem.applyDamage(enemy, result);
    this.audioSystem.play('sfx_hit', 0.3);
    this.showDamageNumber(enemy.x, enemy.y, result.damage, false);

    projectile.destroy();
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

    // Block exit on final floor until boss is defeated
    if (this.isFinalBoss && this.hasBossAlive()) {
      this.showGameMessage('Defeat the boss first!');
      return;
    }

    this.canExit = false;

    // If final boss is dead, trigger victory instead of next floor
    if (this.isFinalBoss) {
      this.handleVictory();
      return;
    }

    this.floor++;
    this.registry.set('floor', this.floor);
    this.audioSystem.play('sfx_stairs', 0.5);

    // Auto-save progress
    this.saveGame();

    this.cameras.main.flash(300, 100, 255, 100);

    this.time.delayedCall(300, () => {
      this.cameras.main.fade(500, 0, 0, 0, false, (_camera: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress === 1) {
          this.scene.restart();
        }
      });
    });
  }

  private handleItemPickup(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    itemObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const itemSprite = itemObj as Phaser.Physics.Arcade.Sprite;
    const item = itemSprite.getData('item') as Item;

    if (item && this.player.pickupItem(item)) {
      this.showPickupText(itemSprite.x, itemSprite.y, item);
      this.audioSystem.play('sfx_pickup', 0.4);
      this.itemsCollected++;
      this.registry.set('itemsCollected', this.itemsCollected);
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

  private spawnItemDrop(x: number, y: number, item: Item): void {
    const drop = this.itemDrops.create(x, y, 'item_drop') as Phaser.Physics.Arcade.Sprite;
    drop.setData('item', item);
    drop.setDepth(5);
    drop.setTint(RARITY_COLORS[item.rarity]);

    this.tweens.add({
      targets: drop,
      y: y - 4,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    drop.setScale(0);
    this.tweens.add({
      targets: drop,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
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

      // Boss drops guaranteed rare+ loot
      if (enemy instanceof BossEnemy) {
        const loot = this.lootSystem.generateGuaranteedLoot(ItemRarity.RARE);
        this.spawnItemDrop(enemy.x, enemy.y, loot);

        // Check for victory on final boss
        if (this.isFinalBoss) {
          this.time.delayedCall(1500, () => {
            this.handleVictory();
          });
        }
      } else {
        const loot = this.lootSystem.generateLoot(this.floor);
        if (loot) {
          this.spawnItemDrop(enemy.x, enemy.y, loot);
        }
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
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      worldPoint.x, worldPoint.y
    );

    const projectile = this.projectiles.create(
      this.player.x, this.player.y, 'projectile'
    ) as Phaser.Physics.Arcade.Sprite;

    projectile.setDepth(8);
    const speed = 400;
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.audioSystem.play('sfx_attack', 0.3);

    this.time.delayedCall(2000, () => {
      if (projectile.active) projectile.destroy();
    });
  }

  private hudText!: Phaser.GameObjects.Text;

  private createHUD(): void {
    this.hudText = this.add.text(10, 10, '', {
      fontSize: '14px',
      color: '#ffffff',
      backgroundColor: '#00000080',
      padding: { x: 8, y: 4 },
    });
    this.hudText.setScrollFactor(0);
    this.hudText.setDepth(100);

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
    const floorText = this.isBossFloor ? `Floor: ${this.floor} (BOSS)` : `Floor: ${this.floor}`;

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
