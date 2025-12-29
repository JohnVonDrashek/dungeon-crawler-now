import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { AudioSystem } from './AudioSystem';
import { Weapon, WeaponType } from './Weapon';
import { TILE_SIZE } from '../utils/constants';
import { networkManager } from '../multiplayer/NetworkManager';
import { MessageType, PlayerHitMessage, PlayerAttackMessage, DamageNumberMessage } from '../multiplayer/SyncMessages';

export class PlayerAttackManager {
  private scene: Phaser.Scene;
  private player: Player;
  private audioSystem: AudioSystem;

  private projectiles!: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, player: Player, audioSystem: AudioSystem) {
    this.scene = scene;
    this.player = player;
    this.audioSystem = audioSystem;
  }

  create(): void {
    this.projectiles = this.scene.physics.add.group({ runChildUpdate: true });
  }

  getProjectileGroup(): Phaser.Physics.Arcade.Group {
    return this.projectiles;
  }

  setupPlayerAttack(inventoryUI: { getIsVisible: () => boolean }, levelUpUI: { getIsVisible: () => boolean }): void {
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (inventoryUI.getIsVisible() || levelUpUI.getIsVisible()) return;

      if (pointer.leftButtonDown()) {
        this.playerAttack(pointer);
      }
    });
  }

  private playerAttack(pointer: Phaser.Input.Pointer): void {
    if (!this.player.canAttack()) return;

    const weapon = this.player.getWeapon();
    const worldPoint = this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const angle = Phaser.Math.Angle.Between(
      this.player.x, this.player.y,
      worldPoint.x, worldPoint.y
    );

    this.player.startAttackCooldown();

    // Broadcast attack to other player
    if (networkManager.isMultiplayer) {
      const attackMsg: PlayerAttackMessage = {
        type: MessageType.PLAYER_ATTACK,
        attackType: weapon.stats.type,
        direction: this.player.getFacingDirection(),
        x: this.player.x,
        y: this.player.y,
        angle: angle,
      };
      networkManager.broadcast(attackMsg);
    }

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

    this.scene.time.delayedCall(2000 * weapon.stats.range, () => {
      if (projectile.active) projectile.destroy();
    });
  }

  private performSwordAttack(angle: number, weapon: Weapon, enemies: Phaser.Physics.Arcade.Group): void {
    // Create slash effect
    const slash = this.scene.add.sprite(
      this.player.x + Math.cos(angle) * 20,
      this.player.y + Math.sin(angle) * 20,
      weapon.stats.projectileTexture
    );
    slash.setDepth(15);
    slash.setRotation(angle);
    slash.setScale(weapon.stats.range);

    // Fade out the slash
    this.scene.tweens.add({
      targets: slash,
      alpha: 0,
      scale: weapon.stats.range * 1.3,
      duration: 150,
      onComplete: () => slash.destroy(),
    });

    // Check for enemies in the arc
    const slashRange = TILE_SIZE * 2 * weapon.stats.range;
    const slashArc = Phaser.Math.DegToRad(weapon.stats.spread);

    enemies.getChildren().forEach((child) => {
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
          this.scene.events.emit('showDamageNumber', enemy.x, enemy.y, damage, false);
          this.broadcastHit(enemy, damage);

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
    // Get enemies from the scene - emit event to get the group
    this.scene.events.emit('requestEnemiesGroup', (enemies: Phaser.Physics.Arcade.Group) => {
      this.performSwordAttack(angle, weapon, enemies);
    });
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

    this.scene.time.delayedCall(2500 * weapon.stats.range, () => {
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
    projectile.setData('weapon', weapon);
    projectile.setRotation(angle);
    projectile.setVelocity(
      Math.cos(angle) * weapon.stats.projectileSpeed,
      Math.sin(angle) * weapon.stats.projectileSpeed
    );

    // Add a slight bobbing animation
    this.scene.tweens.add({
      targets: projectile,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 200,
      yoyo: true,
      repeat: -1,
    });

    this.scene.time.delayedCall(2000 * weapon.stats.range, () => {
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

      this.scene.time.delayedCall(1500 * weapon.stats.range, () => {
        if (projectile.active) projectile.destroy();
      });
    }
  }

  createExplosion(x: number, y: number, weapon: Weapon): void {
    // Visual explosion
    const explosion = this.scene.add.sprite(x, y, 'explosion_effect');
    explosion.setDepth(15);
    explosion.setScale(0.5);

    this.scene.tweens.add({
      targets: explosion,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // Damage enemies in radius
    const radius = weapon.stats.aoeRadius;
    this.scene.events.emit('requestEnemiesGroup', (enemies: Phaser.Physics.Arcade.Group) => {
      enemies.getChildren().forEach((child) => {
        const enemy = child as unknown as Enemy;
        if (!enemy.active) return;

        const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
        if (dist <= radius) {
          const damage = this.player.getAttackDamage();
          enemy.takeDamage(damage);
          this.scene.events.emit('showDamageNumber', enemy.x, enemy.y, damage, false);
          this.broadcastHit(enemy, damage);
        }
      });
    });

    this.scene.events.emit('shakeCamera', 4, 100);
  }

  createExplosionFromProjectile(
    x: number,
    y: number,
    projectile: Phaser.Physics.Arcade.Sprite
  ): void {
    // Visual explosion
    const explosion = this.scene.add.sprite(x, y, 'explosion_effect');
    explosion.setDepth(15);
    explosion.setScale(0.5);

    this.scene.tweens.add({
      targets: explosion,
      scale: 2,
      alpha: 0,
      duration: 300,
      onComplete: () => explosion.destroy(),
    });

    // Damage enemies in radius
    const radius = projectile.getData('aoeRadius') || 64;
    const damage = projectile.getData('damage') || this.player.getAttackDamage();

    this.scene.events.emit('requestEnemiesGroup', (enemies: Phaser.Physics.Arcade.Group) => {
      enemies.getChildren().forEach((child) => {
        const enemy = child as unknown as Enemy;
        if (!enemy.active) return;

        const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
        if (dist <= radius) {
          enemy.takeDamage(damage);
          this.scene.events.emit('showDamageNumber', enemy.x, enemy.y, damage, false);
          this.broadcastHit(enemy, damage);
        }
      });
    });

    this.scene.events.emit('shakeCamera', 4, 100);
  }

  // Handle projectile hitting enemy - called from GameScene collision handler
  handleProjectileEnemyCollision(
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
    this.scene.events.emit('showDamageNumber', enemy.x, enemy.y, damage, false);
    this.broadcastHit(enemy, damage);

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

  // Handle projectile hitting wall - called from GameScene collision handler
  handleProjectileWallCollision(
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

  // Broadcast hit to network for multiplayer sync
  private broadcastHit(enemy: Enemy, damage: number): void {
    if (networkManager.isMultiplayer) {
      const hitMessage: PlayerHitMessage = {
        type: MessageType.PLAYER_HIT,
        enemyId: (enemy as Enemy & { networkId?: string }).networkId || 'unknown',
        damage: damage,
      };
      networkManager.broadcast(hitMessage);

      // Also broadcast damage number for visual sync
      const damageNumMessage: DamageNumberMessage = {
        type: MessageType.DAMAGE_NUMBER,
        x: enemy.x,
        y: enemy.y,
        damage: damage,
        isPlayerDamage: false,
      };
      networkManager.broadcast(damageNumMessage);
    }
  }
}
