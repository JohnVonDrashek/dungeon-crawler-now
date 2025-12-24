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
  private floor: number = 1;
  private canExit: boolean = true;
  private isBossFloor: boolean = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.floor = this.registry.get('floor') || 1;
    this.canExit = true;
    this.isBossFloor = this.floor % 5 === 0;
    this.healthBars = new Map();

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

    // Create enemies
    this.enemies = this.physics.add.group({ runChildUpdate: false });
    this.createEnemies();

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
    this.createHUD();

    // Boss floor announcement
    if (this.isBossFloor) {
      this.showBossAnnouncement();
    }
  }

  update(time: number, delta: number): void {
    if (this.inventoryUI.getIsVisible()) return;

    this.player.update(time, delta);

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as unknown as Enemy;
      if (enemy.active) {
        enemy.update(time, delta);
        this.updateHealthBar(enemy);
      }
    });

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

  private createEnemies(): void {
    const spawnRoom = this.dungeon.rooms[0];
    const exitRoom = this.dungeon.rooms[this.dungeon.rooms.length - 1];

    if (this.isBossFloor) {
      // Boss floor - spawn boss in exit room
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

      // Add some regular enemies too
      const enemyCount = Math.floor(this.floor / 2);
      this.spawnMixedEnemies(enemyCount, spawnRoom);
    } else {
      // Regular floor - mixed enemies
      const enemyCount = 3 + this.floor * 2;
      this.spawnMixedEnemies(enemyCount, spawnRoom);
    }
  }

  private spawnMixedEnemies(count: number, excludeRoom: Room): void {
    const positions = this.dungeonGenerator.getEnemySpawnPositions(count, excludeRoom);

    positions.forEach((pos) => {
      const x = pos.x * TILE_SIZE + TILE_SIZE / 2;
      const y = pos.y * TILE_SIZE + TILE_SIZE / 2;

      let enemy: Enemy;

      // Mix of enemy types based on floor and randomness
      const roll = Math.random();
      const hasRanged = this.floor >= 2;
      const hasTank = this.floor >= 3;

      if (hasTank && roll < 0.15) {
        enemy = new TankEnemy(this, x, y, this.floor);
      } else if (hasRanged && roll < 0.35) {
        const ranged = new RangedEnemy(this, x, y, this.floor);
        ranged.setProjectileGroup(this.enemyProjectiles);
        enemy = ranged;
      } else if (roll < 0.55) {
        enemy = new FastEnemy(this, x, y, this.floor);
      } else {
        enemy = new Enemy(this, x, y, 'enemy', {
          hp: 20 + this.floor * 5,
          attack: 5 + this.floor * 2,
          defense: 1 + Math.floor(this.floor / 2),
          speed: 60 + this.floor * 5,
          xpValue: 20 + this.floor * 5,
        });
      }

      enemy.setTarget(this.player);
      this.enemies.add(enemy as unknown as Phaser.GameObjects.GameObject);
      this.createHealthBar(enemy);
    });
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
  }

  private handlePlayerEnemyCollision(
    playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    enemyObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const player = playerObj as unknown as Player;
    const enemy = enemyObj as unknown as Enemy;

    if (player.getIsInvulnerable()) return;

    const result = this.combatSystem.calculateDamage(enemy, player);
    this.combatSystem.applyDamage(player, result);
    this.audioSystem.play('sfx_hurt', 0.4);
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

    projectile.destroy();
  }

  private handleEnemyProjectilePlayerCollision(
    playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    projectileObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const player = playerObj as unknown as Player;
    const projectile = projectileObj as Phaser.Physics.Arcade.Sprite;

    if (player.getIsInvulnerable()) {
      projectile.destroy();
      return;
    }

    const damage = projectile.getData('damage') || 5;
    player.takeDamage(damage);
    this.audioSystem.play('sfx_hurt', 0.4);
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
    this.canExit = false;

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
    const text = this.add.text(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      `FLOOR ${this.floor}\nBOSS BATTLE`,
      {
        fontSize: '32px',
        color: '#ff4444',
        fontStyle: 'bold',
        align: 'center',
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

      // Boss drops guaranteed rare+ loot
      if (enemy instanceof BossEnemy) {
        const loot = this.lootSystem.generateGuaranteedLoot(ItemRarity.RARE);
        this.spawnItemDrop(enemy.x, enemy.y, loot);
      } else {
        const loot = this.lootSystem.generateLoot(this.floor);
        if (loot) {
          this.spawnItemDrop(enemy.x, enemy.y, loot);
        }
      }
    });

    this.events.on('enemyAttack', (enemy: Enemy, target: Player) => {
      if (!target.getIsInvulnerable()) {
        const result = this.combatSystem.calculateDamage(enemy, target);
        this.combatSystem.applyDamage(target, result);
        this.audioSystem.play('sfx_hurt', 0.4);
      }
    });

    this.events.on('itemPickup', () => {
      // Already handled in handleItemPickup
    });

    // Listen for level up
    this.player.on('levelUp', () => {
      this.audioSystem.play('sfx_levelup', 0.5);
    });
  }

  private setupPlayerAttack(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.inventoryUI.getIsVisible()) return;

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
      if (this.inventoryUI.getIsVisible()) {
        this.inventoryUI.toggle();
      }
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

    this.hudText.setText([
      floorText,
      `HP: ${this.player.hp}/${this.player.maxHp}`,
      `Level: ${this.player.level}`,
      `XP: ${this.player.xp}/${this.player.xpToNextLevel}`,
      `ATK: ${this.player.attack} | DEF: ${this.player.defense}`,
      `Enemies: ${enemyCount} | Items: ${itemCount}`,
    ].join('\n'));
  }

  private handlePlayerDeath(): void {
    // Delete save on death (roguelike mechanic)
    SaveSystem.deleteSave();
    this.registry.set('floor', 1);
    this.cameras.main.fade(1000, 0, 0, 0);
    this.time.delayedCall(1000, () => {
      this.scene.restart();
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
