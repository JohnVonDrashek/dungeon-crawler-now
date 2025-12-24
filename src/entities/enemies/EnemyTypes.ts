import Phaser from 'phaser';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import { TILE_SIZE } from '../../utils/constants';

// Fast enemy - low HP, high speed, charges at player
export class FastEnemy extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_fast', {
      hp: 15 + floor * 3,
      attack: 4 + floor,
      defense: 0,
      speed: 120 + floor * 8,
      xpValue: 15 + floor * 3,
    });
    this.setTint(0x00ff00); // Green tint
    this.setScale(0.8);
  }
}

// Tank enemy - high HP, slow, high damage
export class TankEnemy extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_tank', {
      hp: 50 + floor * 10,
      attack: 8 + floor * 2,
      defense: 3 + floor,
      speed: 40 + floor * 2,
      xpValue: 35 + floor * 8,
    });
    this.setTint(0x8844ff); // Purple tint
    this.setScale(1.3);
  }
}

// Ranged enemy - shoots projectiles, keeps distance
export class RangedEnemy extends Enemy {
  private shootCooldown: number = 0;
  private readonly SHOOT_COOLDOWN_MS = 2000;
  private readonly PREFERRED_RANGE = TILE_SIZE * 5;
  private projectileGroup: Phaser.Physics.Arcade.Group | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_ranged', {
      hp: 20 + floor * 4,
      attack: 6 + floor * 2,
      defense: 1,
      speed: 50 + floor * 3,
      xpValue: 30 + floor * 6,
    });
    this.setTint(0xffaa00); // Orange tint
  }

  setProjectileGroup(group: Phaser.Physics.Arcade.Group): void {
    this.projectileGroup = group;
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active) return;

    this.shootCooldown -= delta;

    // Custom behavior: try to keep distance and shoot
    const target = this.getTarget();
    if (target && this.projectileGroup) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

      // If too close, move away
      if (dist < this.PREFERRED_RANGE * 0.7) {
        const angle = Phaser.Math.Angle.Between(target.x, target.y, this.x, this.y);
        this.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
      }

      // Shoot if in range and cooldown ready
      if (dist < TILE_SIZE * 8 && this.shootCooldown <= 0) {
        this.shoot(target);
        this.shootCooldown = this.SHOOT_COOLDOWN_MS;
      }
    }
  }

  private getTarget(): Player | null {
    return this.target;
  }

  private shoot(target: Player): void {
    if (!this.projectileGroup) return;

    const projectile = this.projectileGroup.create(
      this.x,
      this.y,
      'enemy_projectile'
    ) as Phaser.Physics.Arcade.Sprite;

    if (!projectile) return;

    projectile.setTint(0xff4444);
    projectile.setData('damage', this.attack);
    projectile.setDepth(8);

    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const speed = 200;
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    // Destroy after 3 seconds
    this.scene.time.delayedCall(3000, () => {
      if (projectile.active) {
        projectile.destroy();
      }
    });
  }
}

// Boss enemy - large, multiple attack patterns, high stats
export class BossEnemy extends Enemy {
  private phase: number = 1;
  private attackPattern: number = 0;
  private patternCooldown: number = 0;
  private projectileGroup: Phaser.Physics.Arcade.Group | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_boss', {
      hp: 200 + floor * 30,
      attack: 15 + floor * 3,
      defense: 5 + floor,
      speed: 60 + floor * 2,
      xpValue: 200 + floor * 50,
    });
    this.setTint(0xff0000);
    this.setScale(2);
  }

  setProjectileGroup(group: Phaser.Physics.Arcade.Group): void {
    this.projectileGroup = group;
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active) return;

    // Update phase based on HP
    const hpPercent = this.hp / this.maxHp;
    if (hpPercent <= 0.3) {
      this.phase = 3;
      this.setTint(0xff00ff); // Rage mode - magenta
    } else if (hpPercent <= 0.6) {
      this.phase = 2;
      this.setTint(0xff4400); // Damaged - dark orange
    }

    this.patternCooldown -= delta;

    if (this.patternCooldown <= 0 && this.projectileGroup) {
      this.executePattern();
      this.patternCooldown = this.phase === 3 ? 1500 : 2500;
    }
  }

  private executePattern(): void {
    if (!this.target || !this.projectileGroup) return;
    const target = this.target;

    this.attackPattern = (this.attackPattern + 1) % 3;

    switch (this.attackPattern) {
      case 0:
        this.circleAttack();
        break;
      case 1:
        this.spreadAttack(target);
        break;
      case 2:
        this.chargeAttack(target);
        break;
    }
  }

  private circleAttack(): void {
    const numProjectiles = this.phase === 3 ? 12 : 8;
    for (let i = 0; i < numProjectiles; i++) {
      const angle = (i / numProjectiles) * Math.PI * 2;
      this.spawnProjectile(angle, 150);
    }
  }

  private spreadAttack(target: Player): void {
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    const numProjectiles = this.phase === 3 ? 7 : 5;
    const spread = Math.PI / 4;

    for (let i = 0; i < numProjectiles; i++) {
      const angle = baseAngle - spread / 2 + (i / (numProjectiles - 1)) * spread;
      this.spawnProjectile(angle, 200);
    }
  }

  private chargeAttack(target: Player): void {
    // Lunge toward player
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.setVelocity(Math.cos(angle) * 300, Math.sin(angle) * 300);

    this.scene.time.delayedCall(500, () => {
      if (this.active) {
        this.setVelocity(0, 0);
      }
    });
  }

  private spawnProjectile(angle: number, speed: number): void {
    if (!this.projectileGroup) return;

    const projectile = this.projectileGroup.create(
      this.x,
      this.y,
      'enemy_projectile'
    ) as Phaser.Physics.Arcade.Sprite;

    if (!projectile) return;

    projectile.setTint(0xff00ff);
    projectile.setData('damage', Math.floor(this.attack * 0.7));
    projectile.setDepth(8);
    projectile.setScale(1.5);

    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.scene.time.delayedCall(4000, () => {
      if (projectile.active) {
        projectile.destroy();
      }
    });
  }
}
