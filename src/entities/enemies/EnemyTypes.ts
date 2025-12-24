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

// ==================== SEVEN CAPITAL SINS ====================

// Sloth - Very slow, high HP, creates slowing aura around it
export class SlothEnemy extends Enemy {
  private slowingAura: Phaser.GameObjects.Graphics | null = null;
  private readonly SLOW_RADIUS = TILE_SIZE * 3;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_sloth', {
      hp: 80 + floor * 15,
      attack: 4 + floor,
      defense: 4 + floor,
      speed: 25 + floor * 2,
      xpValue: 40 + floor * 8,
    });
    this.setScale(1.2);
    this.createSlowingAura();
  }

  private createSlowingAura(): void {
    this.slowingAura = this.scene.add.graphics();
    this.slowingAura.setDepth(1);
    // Draw at origin - we'll move the graphics object with setPosition
    this.slowingAura.fillStyle(0x6b7280, 0.15);
    this.slowingAura.fillCircle(0, 0, this.SLOW_RADIUS);
    this.slowingAura.lineStyle(1, 0x9ca3af, 0.3);
    this.slowingAura.strokeCircle(0, 0, this.SLOW_RADIUS);
    this.slowingAura.setPosition(this.x, this.y);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active) return;

    // Update aura position (just move it, don't redraw)
    if (this.slowingAura) {
      this.slowingAura.setPosition(this.x, this.y);
    }

    // Apply slowing effect to player if in range
    if (this.target) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
      if (dist < this.SLOW_RADIUS) {
        // Apply 50% slow (handled via event)
        this.scene.events.emit('playerSlowed', 0.5);
      }
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.slowingAura) {
      this.slowingAura.destroy();
    }
    super.destroy(fromScene);
  }
}

// Gluttony - Large, slow, heals when it successfully hits the player
export class GluttonyEnemy extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_gluttony', {
      hp: 70 + floor * 12,
      attack: 8 + floor * 2,
      defense: 2 + floor,
      speed: 35 + floor * 2,
      xpValue: 45 + floor * 10,
    });
    this.setScale(1.4);
  }

  // Override to add heal on attack
  onSuccessfulAttack(damageDealt: number): void {
    // Heal 20% of damage dealt
    const healAmount = Math.floor(damageDealt * 0.2);
    this.hp = Math.min(this.maxHp, this.hp + healAmount);

    // Visual feedback - green flash
    this.setTint(0x22c55e);
    this.scene.time.delayedCall(200, () => {
      if (this.active) {
        this.clearTint();
      }
    });
  }
}

// Greed - Fast, steals gold on hit, flees when player has no gold
export class GreedEnemy extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_greed', {
      hp: 25 + floor * 5,
      attack: 3 + floor,
      defense: 0,
      speed: 100 + floor * 8,
      xpValue: 35 + floor * 6,
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active || !this.target) return;

    // If player has no gold, flee instead of chase
    const player = this.target as Player;
    if (player.gold <= 0 && this.state === 'chase') {
      // Override chase to flee
      const angle = Phaser.Math.Angle.Between(player.x, player.y, this.x, this.y);
      this.setVelocity(Math.cos(angle) * this.speed * 0.8, Math.sin(angle) * this.speed * 0.8);
    }
  }

  // Called when this enemy hits the player
  onSuccessfulAttack(_damageDealt: number): void {
    if (!this.target) return;
    const player = this.target as Player;

    // Steal 5-10 gold
    const stealAmount = Math.min(player.gold, 5 + Math.floor(Math.random() * 6));
    if (stealAmount > 0) {
      player.spendGold(stealAmount);
      this.scene.events.emit('goldStolen', stealAmount);

      // Visual feedback - gold flash
      this.setTint(0xffd700);
      this.scene.time.delayedCall(300, () => {
        if (this.active) {
          this.clearTint();
        }
      });
    }
  }
}

// Envy - Copies the player's attack stat, shadowy appearance
export class EnvyEnemy extends Enemy {
  private hasCopied: boolean = false;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_envy', {
      hp: 35 + floor * 6,
      attack: 5 + floor, // Base attack, will be overwritten
      defense: 1 + floor,
      speed: 70 + floor * 4,
      xpValue: 40 + floor * 8,
    });
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active || !this.target || this.hasCopied) return;

    // Copy player's attack when first seeing them
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (dist < TILE_SIZE * 8) {
      const player = this.target as Player;
      this.attack = player.attack;
      this.hasCopied = true;

      // Visual feedback - green flash when copying
      this.setTint(0x22c55e);
      this.scene.time.delayedCall(500, () => {
        if (this.active) {
          this.setTint(0x16a34a); // Stay slightly green
        }
      });
    }
  }
}

// Wrath - Gets stronger when damaged, aggressive
export class WrathEnemy extends Enemy {
  private isEnraged: boolean = false;
  private baseAttack: number;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_wrath', {
      hp: 45 + floor * 8,
      attack: 10 + floor * 2,
      defense: 2 + floor,
      speed: 80 + floor * 4,
      xpValue: 50 + floor * 10,
    });
    this.baseAttack = this.attack;
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active) return;

    // Check for enrage at 50% HP
    if (!this.isEnraged && this.hp <= this.maxHp * 0.5) {
      this.isEnraged = true;
      this.attack = Math.floor(this.baseAttack * 1.5);
      this.speed *= 1.2;

      // Visual feedback - brighter red, pulsing
      this.setTint(0xff4444);
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.15,
        scaleY: 1.15,
        duration: 200,
        yoyo: true,
        repeat: 2,
      });
    }
  }

  takeDamage(amount: number): void {
    super.takeDamage(amount);

    // Flash orange when taking damage (wrath building)
    if (this.active && !this.isEnraged) {
      this.setTint(0xf97316);
      this.scene.time.delayedCall(100, () => {
        if (this.active && !this.isEnraged) {
          this.clearTint();
        }
      });
    }
  }
}

// Lust - Pulls the player toward it with magnetic effect
export class LustEnemy extends Enemy {
  private readonly PULL_RADIUS = TILE_SIZE * 5;
  private readonly PULL_STRENGTH = 30;
  private glowEffect: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_lust', {
      hp: 25 + floor * 4,
      attack: 4 + floor,
      defense: 0,
      speed: 60 + floor * 3,
      xpValue: 35 + floor * 6,
    });
    this.createGlow();
  }

  private createGlow(): void {
    this.glowEffect = this.scene.add.graphics();
    this.glowEffect.setDepth(1);
    // Draw at origin - we'll move the graphics object with setPosition
    this.glowEffect.fillStyle(0xec4899, 0.1);
    this.glowEffect.fillCircle(0, 0, this.PULL_RADIUS);
    this.glowEffect.fillStyle(0xfce7f3, 0.2);
    this.glowEffect.fillCircle(0, 0, TILE_SIZE);
    this.glowEffect.setPosition(this.x, this.y);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active) return;

    // Update glow position (just move it, don't redraw)
    if (this.glowEffect) {
      this.glowEffect.setPosition(this.x, this.y);
    }

    // Pull player toward this enemy
    if (this.target) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
      if (dist < this.PULL_RADIUS && dist > TILE_SIZE) {
        const angle = Phaser.Math.Angle.Between(this.target.x, this.target.y, this.x, this.y);
        const pullForce = (1 - dist / this.PULL_RADIUS) * this.PULL_STRENGTH;
        this.scene.events.emit('playerPulled', {
          x: Math.cos(angle) * pullForce,
          y: Math.sin(angle) * pullForce,
        });
      }
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.glowEffect) {
      this.glowEffect.destroy();
    }
    super.destroy(fromScene);
  }
}

// Pride - High defense, reflects damage back to attacker
export class PrideEnemy extends Enemy {
  private readonly REFLECT_PERCENT = 0.25;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_pride', {
      hp: 60 + floor * 10,
      attack: 8 + floor * 2,
      defense: 5 + floor * 2,
      speed: 50 + floor * 3,
      xpValue: 60 + floor * 12,
    });
    this.setScale(1.1);
  }

  takeDamage(amount: number): void {
    // Reflect damage before taking it
    const reflectDamage = Math.floor(amount * this.REFLECT_PERCENT);
    if (reflectDamage > 0 && this.target) {
      this.scene.events.emit('damageReflected', reflectDamage);

      // Visual feedback - golden flash
      this.setTint(0xffd700);
      this.scene.time.delayedCall(150, () => {
        if (this.active) {
          this.clearTint();
        }
      });
    }

    super.takeDamage(amount);
  }
}
