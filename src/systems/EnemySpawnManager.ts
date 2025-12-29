import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import {
  FastEnemy, TankEnemy, RangedEnemy, BossEnemy,
  SlothEnemy, GluttonyEnemy, GreedEnemy, EnvyEnemy,
  WrathEnemy, LustEnemy, PrideEnemy
} from '../entities/enemies/EnemyTypes';
import {
  PrideBoss, GreedBoss, WrathBoss, SlothBoss,
  EnvyBoss, GluttonyBoss, LustBoss
} from '../entities/enemies/SinBosses';
import { Room, RoomType } from './DungeonGenerator';
import { RoomManager } from './RoomManager';
import { AudioSystem } from './AudioSystem';
import { TILE_SIZE } from '../utils/constants';
import { SinWorld, getWorldConfig } from '../config/WorldConfig';

export class EnemySpawnManager {
  private scene: Phaser.Scene;
  private player: Player;
  private roomManager: RoomManager;
  private audioSystem: AudioSystem;
  private enemyProjectiles: Phaser.Physics.Arcade.Group;

  private enemies!: Phaser.Physics.Arcade.Group;
  private healthBars: Map<Enemy, Phaser.GameObjects.Container> = new Map();
  private floor: number;
  private currentWorld: SinWorld | null;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    roomManager: RoomManager,
    audioSystem: AudioSystem,
    enemyProjectiles: Phaser.Physics.Arcade.Group,
    floor: number,
    currentWorld: SinWorld | null = null
  ) {
    this.scene = scene;
    this.player = player;
    this.roomManager = roomManager;
    this.audioSystem = audioSystem;
    this.enemyProjectiles = enemyProjectiles;
    this.floor = floor;
    this.currentWorld = currentWorld;
  }

  create(): void {
    this.enemies = this.scene.physics.add.group({ runChildUpdate: false });
  }

  getEnemiesGroup(): Phaser.Physics.Arcade.Group {
    return this.enemies;
  }

  spawnEnemiesInRoom(room: Room, isBossFloor: boolean, exitRoom: Room): void {
    const isBossRoom = isBossFloor && room.id === exitRoom.id;
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
    this.audioSystem.setMusicStyle('combat'); // Switch to combat music
    this.scene.events.emit('shakeCamera', isBossRoom ? 8 : 3, isBossRoom ? 300 : 150);

    // Show spawn indicators
    const indicators: Phaser.GameObjects.Graphics[] = [];
    const indicatorSize = isBossRoom ? TILE_SIZE * 1.5 : isChallengeRoom ? TILE_SIZE * 1.0 : TILE_SIZE * 0.8;
    const indicatorColor = isBossRoom ? 0xfbbf24 : isChallengeRoom ? 0xaa00ff : 0xff4444;

    for (const pos of spawnPositions) {
      const indicator = this.scene.add.graphics();
      indicator.setDepth(10);
      indicators.push(indicator);

      // Pulsing warning circle
      let pulseProgress = 0;
      const pulseTimer = this.scene.time.addEvent({
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
    this.scene.time.delayedCall(spawnDelay, () => {
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
          enemy = this.createBoss(pos.x, pos.y);
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
        this.scene.tweens.add({
          targets: enemy,
          scale: 1,
          duration: isBossRoom ? 400 : 200,
          ease: 'Back.easeOut',
        });
      }

      this.audioSystem.play('sfx_enemy_death', 0.3); // Spawn sound

      if (isBossRoom) {
        this.scene.events.emit('shakeCamera', 10, 200);
      }
    });
  }

  private createEnemy(x: number, y: number): Enemy {
    // If in a world, bias toward that world's primary enemy (60% chance)
    if (this.currentWorld) {
      return this.createWorldEnemy(x, y);
    }

    // Legacy mode: original spawn logic
    return this.createLegacyEnemy(x, y);
  }

  private createBoss(x: number, y: number): Enemy {
    // If in a world, spawn the world-specific sin boss
    if (this.currentWorld) {
      return this.createSinBoss(x, y);
    }

    // Legacy mode: standard boss
    const boss = new BossEnemy(this.scene, x, y, this.floor);
    boss.setProjectileGroup(this.enemyProjectiles);
    return boss;
  }

  private createSinBoss(x: number, y: number): Enemy {
    let boss: Enemy;

    switch (this.currentWorld) {
      case SinWorld.PRIDE:
        boss = new PrideBoss(this.scene, x, y, this.floor);
        break;
      case SinWorld.GREED:
        boss = new GreedBoss(this.scene, x, y, this.floor);
        break;
      case SinWorld.WRATH:
        boss = new WrathBoss(this.scene, x, y, this.floor);
        break;
      case SinWorld.SLOTH:
        boss = new SlothBoss(this.scene, x, y, this.floor);
        break;
      case SinWorld.ENVY:
        boss = new EnvyBoss(this.scene, x, y, this.floor);
        break;
      case SinWorld.GLUTTONY:
        boss = new GluttonyBoss(this.scene, x, y, this.floor);
        break;
      case SinWorld.LUST:
        boss = new LustBoss(this.scene, x, y, this.floor);
        break;
      default:
        boss = new BossEnemy(this.scene, x, y, this.floor);
    }

    // Set projectile group for bosses that use it
    if ('setProjectileGroup' in boss) {
      (boss as BossEnemy).setProjectileGroup(this.enemyProjectiles);
    }

    return boss;
  }

  private createWorldEnemy(x: number, y: number): Enemy {
    const worldConfig = getWorldConfig(this.currentWorld!);
    const roll = Math.random();

    // 60% chance to spawn the world's primary sin enemy
    if (roll < 0.6) {
      return this.createSinEnemy(worldConfig.primaryEnemy, x, y);
    }

    // 25% chance to spawn from the world's enemy pool
    if (roll < 0.85) {
      const poolIndex = Math.floor(Math.random() * worldConfig.enemyTypes.length);
      return this.createSinEnemy(worldConfig.enemyTypes[poolIndex], x, y);
    }

    // 15% chance for standard enemies
    const standardRoll = Math.random();
    if (standardRoll < 0.33) {
      return new TankEnemy(this.scene, x, y, this.floor);
    } else if (standardRoll < 0.66) {
      const ranged = new RangedEnemy(this.scene, x, y, this.floor);
      ranged.setProjectileGroup(this.enemyProjectiles);
      return ranged;
    } else {
      return new FastEnemy(this.scene, x, y, this.floor);
    }
  }

  private createSinEnemy(enemyType: string, x: number, y: number): Enemy {
    switch (enemyType) {
      case 'PrideEnemy':
        return new PrideEnemy(this.scene, x, y, this.floor);
      case 'GreedEnemy':
        return new GreedEnemy(this.scene, x, y, this.floor);
      case 'WrathEnemy':
        return new WrathEnemy(this.scene, x, y, this.floor);
      case 'SlothEnemy':
        return new SlothEnemy(this.scene, x, y, this.floor);
      case 'EnvyEnemy':
        return new EnvyEnemy(this.scene, x, y, this.floor);
      case 'GluttonyEnemy':
        return new GluttonyEnemy(this.scene, x, y, this.floor);
      case 'LustEnemy':
        return new LustEnemy(this.scene, x, y, this.floor);
      case 'TankEnemy':
        return new TankEnemy(this.scene, x, y, this.floor);
      case 'RangedEnemy':
        const ranged = new RangedEnemy(this.scene, x, y, this.floor);
        ranged.setProjectileGroup(this.enemyProjectiles);
        return ranged;
      case 'FastEnemy':
        return new FastEnemy(this.scene, x, y, this.floor);
      case 'BasicEnemy':
      default:
        return new Enemy(this.scene, x, y, 'enemy', {
          hp: 20 + this.floor * 5,
          attack: 5 + this.floor * 2,
          defense: 1 + Math.floor(this.floor / 2),
          speed: 60 + this.floor * 5,
          xpValue: 20 + this.floor * 5,
        });
    }
  }

  private createLegacyEnemy(x: number, y: number): Enemy {
    const roll = Math.random();
    const sinRoll = Math.random();

    // Sin enemies based on floor progression
    // Each sin has its own probability window
    // Pride: Floor 10+ (5% chance - rare and powerful)
    if (this.floor >= 10 && sinRoll < 0.05) {
      return new PrideEnemy(this.scene, x, y, this.floor);
    }
    // Wrath: Floor 7+ (8% chance)
    if (this.floor >= 7 && sinRoll >= 0.05 && sinRoll < 0.13) {
      return new WrathEnemy(this.scene, x, y, this.floor);
    }
    // Lust: Floor 7+ (8% chance)
    if (this.floor >= 7 && sinRoll >= 0.13 && sinRoll < 0.21) {
      return new LustEnemy(this.scene, x, y, this.floor);
    }
    // Greed: Floor 4+ (8% chance)
    if (this.floor >= 4 && sinRoll >= 0.21 && sinRoll < 0.29) {
      return new GreedEnemy(this.scene, x, y, this.floor);
    }
    // Envy: Floor 4+ (8% chance)
    if (this.floor >= 4 && sinRoll >= 0.29 && sinRoll < 0.37) {
      return new EnvyEnemy(this.scene, x, y, this.floor);
    }
    // Sloth: Floor 1+ (8% chance - intro sin)
    if (sinRoll >= 0.37 && sinRoll < 0.45) {
      return new SlothEnemy(this.scene, x, y, this.floor);
    }
    // Gluttony: Floor 1+ (8% chance - intro sin)
    if (sinRoll >= 0.45 && sinRoll < 0.53) {
      return new GluttonyEnemy(this.scene, x, y, this.floor);
    }

    // Standard enemies
    const hasRanged = this.floor >= 2;
    const hasTank = this.floor >= 3;

    if (hasTank && roll < 0.15) {
      return new TankEnemy(this.scene, x, y, this.floor);
    } else if (hasRanged && roll < 0.35) {
      const ranged = new RangedEnemy(this.scene, x, y, this.floor);
      ranged.setProjectileGroup(this.enemyProjectiles);
      return ranged;
    } else if (roll < 0.55) {
      return new FastEnemy(this.scene, x, y, this.floor);
    } else {
      return new Enemy(this.scene, x, y, 'enemy', {
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
      return new TankEnemy(this.scene, x, y, effectiveFloor);
    } else if (roll < 0.55) {
      // 25% chance for ranged
      const ranged = new RangedEnemy(this.scene, x, y, effectiveFloor);
      ranged.setProjectileGroup(this.enemyProjectiles);
      return ranged;
    } else if (roll < 0.75) {
      // 20% chance for fast
      return new FastEnemy(this.scene, x, y, effectiveFloor);
    } else {
      // 25% chance for elite basic enemy (buffed stats)
      return new Enemy(this.scene, x, y, 'enemy', {
        hp: 30 + effectiveFloor * 6,
        attack: 7 + effectiveFloor * 2,
        defense: 2 + Math.floor(effectiveFloor / 2),
        speed: 70 + effectiveFloor * 5,
        xpValue: 35 + effectiveFloor * 5, // More XP for challenge enemies
      });
    }
  }

  createHealthBar(enemy: Enemy): void {
    // Sin bosses have scale >= 2, regular bosses extend BossEnemy
    const isBoss = enemy instanceof BossEnemy || enemy.scale >= 2;
    const yOffset = isBoss ? -30 : -15; // Position higher for larger bosses
    const container = this.scene.add.container(enemy.x, enemy.y + yOffset);
    container.setDepth(50);

    const bgWidth = isBoss ? 50 : 20;
    const barHeight = isBoss ? 6 : 4;
    const bg = this.scene.add.rectangle(0, 0, bgWidth, barHeight, 0x333333);
    const bar = this.scene.add.rectangle(-bgWidth / 2, 0, bgWidth, barHeight, isBoss ? 0xcc2222 : 0x22cc22);
    bar.setOrigin(0, 0.5);
    bar.setName('bar');
    bar.setData('isBoss', isBoss);

    container.add([bg, bar]);
    this.healthBars.set(enemy, container);
  }

  updateHealthBar(enemy: Enemy): void {
    const container = this.healthBars.get(enemy);
    if (!container) return;

    const bar = container.getByName('bar') as Phaser.GameObjects.Rectangle;
    if (!bar) return;

    const isBoss = bar.getData('isBoss') as boolean;
    const yOffset = isBoss ? -30 : -15;
    container.setPosition(enemy.x, enemy.y + yOffset);

    const percent = enemy.hp / enemy.maxHp;
    const maxWidth = isBoss ? 50 : 20;
    bar.width = maxWidth * Math.max(0, percent);

    // Color based on health (bosses stay red)
    if (isBoss) {
      bar.setFillStyle(0xcc2222);
    } else if (percent > 0.5) {
      bar.setFillStyle(0x22cc22);
    } else if (percent > 0.25) {
      bar.setFillStyle(0xcccc22);
    } else {
      bar.setFillStyle(0xcc2222);
    }
  }

  removeHealthBar(enemy: Enemy): void {
    const container = this.healthBars.get(enemy);
    if (container) {
      container.destroy();
      this.healthBars.delete(enemy);
    }
  }

  // Update all health bars - called from update()
  updateAllHealthBars(): void {
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as unknown as Enemy;
      if (enemy.active) {
        this.updateHealthBar(enemy);
      }
    });
  }
}
