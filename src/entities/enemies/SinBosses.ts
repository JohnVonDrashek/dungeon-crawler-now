/**
 * Sin Bosses - 7 unique boss variants for each deadly sin world
 * Each boss has enhanced sin mechanics and multiple attack phases
 */

import Phaser from 'phaser';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import { TILE_SIZE } from '../../utils/constants';

// Base class for all sin bosses with common functionality
abstract class SinBoss extends Enemy {
  protected phase: number = 1;
  protected patternCooldown: number = 0;
  protected projectileGroup: Phaser.Physics.Arcade.Group | null = null;
  protected readonly baseCooldown: number = 2500;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    floor: number,
    stats: { hp: number; attack: number; defense: number; speed: number }
  ) {
    super(scene, x, y, texture, {
      hp: stats.hp,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
      xpValue: 300 + floor * 50,
    });
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
    if (hpPercent <= 0.3 && this.phase !== 3) {
      this.phase = 3;
      this.onPhaseChange(3);
    } else if (hpPercent <= 0.6 && this.phase === 1) {
      this.phase = 2;
      this.onPhaseChange(2);
    }

    this.patternCooldown -= delta;
    if (this.patternCooldown <= 0 && this.projectileGroup) {
      this.executePattern();
      this.patternCooldown = this.phase === 3 ? this.baseCooldown * 0.6 : this.baseCooldown;
    }
  }

  protected abstract executePattern(): void;
  protected abstract onPhaseChange(newPhase: number): void;

  protected spawnProjectile(angle: number, speed: number, color: number = 0xff00ff, scale: number = 1.5): Phaser.Physics.Arcade.Sprite | null {
    if (!this.projectileGroup) return null;

    const projectile = this.projectileGroup.create(
      this.x,
      this.y,
      'enemy_projectile'
    ) as Phaser.Physics.Arcade.Sprite;

    if (!projectile) return null;

    projectile.setTint(color);
    projectile.setData('damage', Math.floor(this.attack * 0.7));
    projectile.setDepth(8);
    projectile.setScale(scale);
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.scene.time.delayedCall(4000, () => {
      if (projectile.active) projectile.destroy();
    });

    return projectile;
  }
}

// ==================== PRIDE BOSS ====================
// 50% damage reflection, creates mirror images, golden projectiles
export class PrideBoss extends SinBoss {
  private readonly REFLECT_PERCENT = 0.5;
  private mirrors: Phaser.GameObjects.Sprite[] = [];
  private attackPattern: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_pride', floor, {
      hp: 400 + floor * 40,
      attack: 20 + floor * 4,
      defense: 8 + floor * 2,
      speed: 55,
    });
    this.setTint(0xffd700);
  }

  protected onPhaseChange(newPhase: number): void {
    if (newPhase === 2) {
      this.setTint(0xf5f5dc);
      this.createMirrorImages(2);
    } else if (newPhase === 3) {
      this.setTint(0xffffff);
      this.createMirrorImages(4);
    }
  }

  private createMirrorImages(count: number): void {
    // Clear existing mirrors
    this.mirrors.forEach(m => m.destroy());
    this.mirrors = [];

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const distance = TILE_SIZE * 2;
      const mirror = this.scene.add.sprite(
        this.x + Math.cos(angle) * distance,
        this.y + Math.sin(angle) * distance,
        'enemy_pride'
      );
      mirror.setScale(1.5);
      mirror.setAlpha(0.5);
      mirror.setTint(0xffd700);
      mirror.setDepth(this.depth - 1);
      this.mirrors.push(mirror);
    }
  }

  protected executePattern(): void {
    if (!this.target) return;

    this.attackPattern = (this.attackPattern + 1) % 3;

    switch (this.attackPattern) {
      case 0:
        this.goldenRing();
        break;
      case 1:
        this.mirrorBeams();
        break;
      case 2:
        this.pridefulCharge();
        break;
    }
  }

  private goldenRing(): void {
    const numProjectiles = this.phase === 3 ? 16 : 10;
    for (let i = 0; i < numProjectiles; i++) {
      const angle = (i / numProjectiles) * Math.PI * 2;
      this.spawnProjectile(angle, 140, 0xffd700);
    }
  }

  private mirrorBeams(): void {
    if (!this.target) return;
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);

    // Fire from self and all mirrors
    this.spawnProjectile(baseAngle, 200, 0xffd700, 2);
    this.mirrors.forEach(mirror => {
      const angle = Phaser.Math.Angle.Between(mirror.x, mirror.y, this.target!.x, this.target!.y);
      const proj = this.projectileGroup?.create(mirror.x, mirror.y, 'enemy_projectile') as Phaser.Physics.Arcade.Sprite;
      if (proj) {
        proj.setTint(0xffd700);
        proj.setData('damage', Math.floor(this.attack * 0.5));
        proj.setDepth(8);
        proj.setVelocity(Math.cos(angle) * 180, Math.sin(angle) * 180);
        this.scene.time.delayedCall(3000, () => proj.active && proj.destroy());
      }
    });
  }

  private pridefulCharge(): void {
    if (!this.target) return;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    this.setVelocity(Math.cos(angle) * 280, Math.sin(angle) * 280);
    this.scene.time.delayedCall(600, () => this.active && this.setVelocity(0, 0));
  }

  takeDamage(amount: number): void {
    const reflectDamage = Math.floor(amount * this.REFLECT_PERCENT);
    if (reflectDamage > 0 && this.target) {
      this.scene.events.emit('damageReflected', reflectDamage);
      this.setTint(0xffffff);
      this.scene.time.delayedCall(200, () => this.active && this.setTint(this.phase === 3 ? 0xffffff : 0xffd700));
    }
    super.takeDamage(amount);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    // Update mirror positions
    this.mirrors.forEach((mirror, i) => {
      const angle = (i / this.mirrors.length) * Math.PI * 2 + time * 0.001;
      const distance = TILE_SIZE * 2;
      mirror.setPosition(
        this.x + Math.cos(angle) * distance,
        this.y + Math.sin(angle) * distance
      );
    });
  }

  destroy(fromScene?: boolean): void {
    this.mirrors.forEach(m => m.destroy());
    super.destroy(fromScene);
  }
}

// ==================== GREED BOSS ====================
// Steals massive gold, spawns gold pile traps, throws coins
export class GreedBoss extends SinBoss {
  private attackPattern: number = 0;
  private goldPiles: Phaser.GameObjects.Sprite[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_greed', floor, {
      hp: 350 + floor * 35,
      attack: 18 + floor * 3,
      defense: 4 + floor,
      speed: 75,
    });
    this.setTint(0x22c55e);
  }

  protected onPhaseChange(newPhase: number): void {
    if (newPhase === 2) {
      this.setTint(0xffd700);
    } else if (newPhase === 3) {
      this.setTint(0x15803d);
      this.speed *= 1.3;
    }
  }

  protected executePattern(): void {
    if (!this.target) return;

    this.attackPattern = (this.attackPattern + 1) % 3;

    switch (this.attackPattern) {
      case 0:
        this.coinBarrage();
        break;
      case 1:
        this.goldPileTrap();
        break;
      case 2:
        this.greedyGrab();
        break;
    }
  }

  private coinBarrage(): void {
    if (!this.target) return;
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const count = this.phase === 3 ? 9 : 5;
    const spread = Math.PI / 3;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle - spread / 2 + (i / (count - 1)) * spread;
      this.spawnProjectile(angle, 220, 0xffd700, 1.2);
    }
  }

  private goldPileTrap(): void {
    // Spawn exploding gold piles around the arena
    const count = this.phase === 3 ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = TILE_SIZE * (3 + Math.random() * 4);
      const pile = this.scene.add.sprite(
        this.x + Math.cos(angle) * dist,
        this.y + Math.sin(angle) * dist,
        'coin'
      );
      pile.setScale(2);
      pile.setTint(0xffd700);
      pile.setDepth(5);
      this.goldPiles.push(pile);

      // Explode after delay
      this.scene.time.delayedCall(1500, () => {
        if (pile.active) {
          // Spawn projectiles in all directions
          for (let j = 0; j < 8; j++) {
            const projAngle = (j / 8) * Math.PI * 2;
            const proj = this.projectileGroup?.create(pile.x, pile.y, 'enemy_projectile') as Phaser.Physics.Arcade.Sprite;
            if (proj) {
              proj.setTint(0xffd700);
              proj.setData('damage', Math.floor(this.attack * 0.5));
              proj.setVelocity(Math.cos(projAngle) * 150, Math.sin(projAngle) * 150);
              this.scene.time.delayedCall(2000, () => proj.active && proj.destroy());
            }
          }
          pile.destroy();
        }
      });
    }
  }

  private greedyGrab(): void {
    if (!this.target) return;
    // Dash toward player and steal gold
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    this.setVelocity(Math.cos(angle) * 350, Math.sin(angle) * 350);
    this.scene.time.delayedCall(400, () => this.active && this.setVelocity(0, 0));
  }

  onSuccessfulAttack(_damageDealt: number): void {
    if (!this.target) return;
    const player = this.target as Player;
    const stealAmount = Math.min(player.gold, 15 + Math.floor(Math.random() * 20));
    if (stealAmount > 0) {
      player.spendGold(stealAmount);
      this.scene.events.emit('goldStolen', stealAmount);
    }
  }

  destroy(fromScene?: boolean): void {
    this.goldPiles.forEach(p => p.destroy());
    super.destroy(fromScene);
  }
}

// ==================== WRATH BOSS ====================
// Permanent rage mode, fire projectiles, berserker charges
export class WrathBoss extends SinBoss {
  private attackPattern: number = 0;
  private readonly baseAttack: number;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_wrath', floor, {
      hp: 450 + floor * 45,
      attack: 25 + floor * 5,
      defense: 3 + floor,
      speed: 70,
    });
    this.baseAttack = this.attack;
    this.setTint(0xdc2626);
  }

  protected onPhaseChange(newPhase: number): void {
    if (newPhase === 2) {
      this.attack = Math.floor(this.baseAttack * 1.3);
      this.speed *= 1.15;
      this.setTint(0xf97316);
    } else if (newPhase === 3) {
      this.attack = Math.floor(this.baseAttack * 1.7);
      this.speed *= 1.3;
      this.setTint(0xfbbf24);
      // Rage aura
      this.scene.tweens.add({
        targets: this,
        scaleX: 2.3,
        scaleY: 2.3,
        duration: 300,
        yoyo: true,
        repeat: 2,
      });
    }
  }

  protected executePattern(): void {
    if (!this.target) return;

    this.attackPattern = (this.attackPattern + 1) % 3;

    switch (this.attackPattern) {
      case 0:
        this.fireWave();
        break;
      case 1:
        this.berserkerCharge();
        break;
      case 2:
        this.rageBurst();
        break;
    }
  }

  private fireWave(): void {
    if (!this.target) return;
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);

    // Fire waves of projectiles
    for (let wave = 0; wave < (this.phase === 3 ? 3 : 2); wave++) {
      this.scene.time.delayedCall(wave * 200, () => {
        if (!this.active) return;
        for (let i = -2; i <= 2; i++) {
          const angle = baseAngle + i * 0.15;
          this.spawnProjectile(angle, 200, 0xf97316, 1.3);
        }
      });
    }
  }

  private berserkerCharge(): void {
    if (!this.target) return;
    // Multiple rapid charges
    const charges = this.phase === 3 ? 3 : 2;
    for (let i = 0; i < charges; i++) {
      this.scene.time.delayedCall(i * 500, () => {
        if (!this.active || !this.target) return;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        this.setVelocity(Math.cos(angle) * 400, Math.sin(angle) * 400);
        this.scene.time.delayedCall(300, () => this.active && this.setVelocity(0, 0));
      });
    }
  }

  private rageBurst(): void {
    // Explosive ring of fire
    const count = this.phase === 3 ? 20 : 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.spawnProjectile(angle, 180, 0xdc2626, 1.5);
    }
  }

  takeDamage(amount: number): void {
    super.takeDamage(amount);
    // Flash with rage when hit
    if (this.active) {
      this.setTint(0xffffff);
      this.scene.time.delayedCall(100, () => {
        if (this.active) this.setTint(this.phase === 3 ? 0xfbbf24 : this.phase === 2 ? 0xf97316 : 0xdc2626);
      });
    }
  }
}

// ==================== SLOTH BOSS ====================
// Massive slow aura, time manipulation, sleeping phases
export class SlothBoss extends SinBoss {
  private slowAura: Phaser.GameObjects.Graphics | null = null;
  private readonly SLOW_RADIUS = TILE_SIZE * 6;
  private attackPattern: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_sloth', floor, {
      hp: 500 + floor * 50,
      attack: 15 + floor * 3,
      defense: 10 + floor * 2,
      speed: 30,
    });
    this.setTint(0x6b7280);
    this.createSlowAura();
  }

  private createSlowAura(): void {
    this.slowAura = this.scene.add.graphics();
    this.slowAura.setDepth(1);
    this.slowAura.fillStyle(0x6b7280, 0.2);
    this.slowAura.fillCircle(0, 0, this.SLOW_RADIUS);
    this.slowAura.lineStyle(2, 0x9ca3af, 0.4);
    this.slowAura.strokeCircle(0, 0, this.SLOW_RADIUS);
    this.slowAura.setPosition(this.x, this.y);
  }

  protected onPhaseChange(newPhase: number): void {
    if (newPhase === 2) {
      this.setTint(0x4b5563);
    } else if (newPhase === 3) {
      this.setTint(0x60a5fa);
      // Paradoxically gets faster in final phase
      this.speed = 60;
    }
  }

  protected executePattern(): void {
    if (!this.target) return;

    this.attackPattern = (this.attackPattern + 1) % 3;

    switch (this.attackPattern) {
      case 0:
        this.timeSlowField();
        break;
      case 1:
        this.lethargyWave();
        break;
      case 2:
        this.drowsyBurst();
        break;
    }
  }

  private timeSlowField(): void {
    // Expand the slow aura temporarily
    if (this.slowAura) {
      this.scene.tweens.add({
        targets: this.slowAura,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 500,
        yoyo: true,
        hold: 1000,
      });
    }
  }

  private lethargyWave(): void {
    // Slow-moving projectiles in all directions
    const count = this.phase === 3 ? 16 : 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.spawnProjectile(angle, 80, 0x9ca3af, 2); // Slow but big
    }
  }

  private drowsyBurst(): void {
    if (!this.target) return;
    // Targeted slow projectiles
    for (let i = 0; i < 3; i++) {
      this.scene.time.delayedCall(i * 400, () => {
        if (!this.active || !this.target) return;
        const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
        for (let j = -1; j <= 1; j++) {
          this.spawnProjectile(angle + j * 0.2, 120, 0x60a5fa, 1.8);
        }
      });
    }
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active) return;

    if (this.slowAura) {
      this.slowAura.setPosition(this.x, this.y);
    }

    // Apply massive slow to player in range
    if (this.target) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
      if (dist < this.SLOW_RADIUS) {
        const slowAmount = this.phase === 3 ? 0.3 : 0.4;
        this.scene.events.emit('playerSlowed', slowAmount);
      }
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.slowAura) this.slowAura.destroy();
    super.destroy(fromScene);
  }
}

// ==================== ENVY BOSS ====================
// Copies all player stats, spawns shadow clones
export class EnvyBoss extends SinBoss {
  private hasCopied: boolean = false;
  private shadowClones: Enemy[] = [];
  private attackPattern: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_envy', floor, {
      hp: 400 + floor * 40,
      attack: 16 + floor * 3,
      defense: 5 + floor,
      speed: 65,
    });
    this.setTint(0x16a34a);
  }

  protected onPhaseChange(newPhase: number): void {
    if (newPhase === 2) {
      this.spawnShadowClone();
      this.setTint(0x15803d);
    } else if (newPhase === 3) {
      this.spawnShadowClone();
      this.spawnShadowClone();
      this.setTint(0x0f172a);
    }
  }

  private spawnShadowClone(): void {
    const angle = Math.random() * Math.PI * 2;
    const dist = TILE_SIZE * 3;
    const clone = new Enemy(this.scene, this.x + Math.cos(angle) * dist, this.y + Math.sin(angle) * dist, 'enemy_envy', {
      hp: Math.floor(this.maxHp * 0.2),
      attack: Math.floor(this.attack * 0.5),
      defense: 0,
      speed: this.speed,
      xpValue: 20,
    });
    clone.setScale(1.5);
    clone.setAlpha(0.6);
    clone.setTint(0x1f2937);
    clone.setTarget(this.target!);
    this.shadowClones.push(clone);
    this.scene.events.emit('enemySpawned', clone);
  }

  protected executePattern(): void {
    if (!this.target) return;

    // Copy player stats on first sight
    if (!this.hasCopied) {
      const player = this.target as Player;
      this.attack = Math.max(this.attack, player.attack);
      this.defense = Math.max(this.defense, player.defense);
      this.hasCopied = true;
      this.setTint(0x22c55e);
      this.scene.time.delayedCall(500, () => this.active && this.setTint(0x16a34a));
    }

    this.attackPattern = (this.attackPattern + 1) % 3;

    switch (this.attackPattern) {
      case 0:
        this.shadowBolt();
        break;
      case 1:
        this.envyMirror();
        break;
      case 2:
        this.darkSwarm();
        break;
    }
  }

  private shadowBolt(): void {
    if (!this.target) return;
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const count = this.phase === 3 ? 7 : 5;
    for (let i = 0; i < count; i++) {
      const angle = baseAngle + (i - Math.floor(count / 2)) * 0.12;
      this.spawnProjectile(angle, 190, 0x22c55e, 1.4);
    }
  }

  private envyMirror(): void {
    // Fire projectiles that mirror player's last movement direction
    if (!this.target) return;
    const player = this.target as Player;
    const playerVelX = player.body?.velocity.x || 0;
    const playerVelY = player.body?.velocity.y || 0;
    const angle = Math.atan2(playerVelY, playerVelX);

    for (let i = 0; i < 5; i++) {
      this.scene.time.delayedCall(i * 100, () => {
        if (this.active) this.spawnProjectile(angle, 200, 0x16a34a, 1.2);
      });
    }
  }

  private darkSwarm(): void {
    // Ring of shadow projectiles
    const count = this.phase === 3 ? 14 : 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.spawnProjectile(angle, 130, 0x1f2937, 1.6);
    }
  }
}

// ==================== GLUTTONY BOSS ====================
// Heavy lifesteal, grows larger, devour attack
export class GluttonyBoss extends SinBoss {
  private currentScale: number = 2;
  private attackPattern: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_gluttony', floor, {
      hp: 550 + floor * 55,
      attack: 22 + floor * 4,
      defense: 6 + floor,
      speed: 45,
    });
    this.setTint(0xfbbf24);
  }

  protected onPhaseChange(newPhase: number): void {
    if (newPhase === 2) {
      this.currentScale = 2.3;
      this.setScale(this.currentScale);
      this.setTint(0xf59e0b);
    } else if (newPhase === 3) {
      this.currentScale = 2.6;
      this.setScale(this.currentScale);
      this.setTint(0xd97706);
      this.speed *= 1.2;
    }
  }

  protected executePattern(): void {
    if (!this.target) return;

    this.attackPattern = (this.attackPattern + 1) % 3;

    switch (this.attackPattern) {
      case 0:
        this.devourCharge();
        break;
      case 1:
        this.hungerWave();
        break;
      case 2:
        this.consumeBurst();
        break;
    }
  }

  private devourCharge(): void {
    if (!this.target) return;
    // Slower but wider charge
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    this.setVelocity(Math.cos(angle) * 250, Math.sin(angle) * 250);
    this.scene.time.delayedCall(800, () => this.active && this.setVelocity(0, 0));
  }

  private hungerWave(): void {
    if (!this.target) return;
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const count = this.phase === 3 ? 9 : 6;
    const spread = Math.PI / 2;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle - spread / 2 + (i / (count - 1)) * spread;
      this.spawnProjectile(angle, 160, 0xfbbf24, 1.8);
    }
  }

  private consumeBurst(): void {
    // Large slow projectiles in all directions
    const count = this.phase === 3 ? 12 : 8;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.spawnProjectile(angle, 100, 0xd97706, 2.5);
    }
  }

  onSuccessfulAttack(damageDealt: number): void {
    // Heavy lifesteal - 40%
    const healAmount = Math.floor(damageDealt * 0.4);
    this.hp = Math.min(this.maxHp, this.hp + healAmount);

    // Visual feedback
    this.setTint(0x22c55e);
    this.scene.time.delayedCall(300, () => {
      if (this.active) {
        this.setTint(this.phase === 3 ? 0xd97706 : this.phase === 2 ? 0xf59e0b : 0xfbbf24);
      }
    });

    // Grow slightly when healing
    if (this.currentScale < 3) {
      this.currentScale += 0.05;
      this.setScale(this.currentScale);
    }
  }
}

// ==================== LUST BOSS ====================
// Strong pull, charm mechanics, seductive projectiles
export class LustBoss extends SinBoss {
  private pullAura: Phaser.GameObjects.Graphics | null = null;
  private readonly PULL_RADIUS = TILE_SIZE * 7;
  private readonly PULL_STRENGTH = 50;
  private attackPattern: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'enemy_lust', floor, {
      hp: 380 + floor * 38,
      attack: 18 + floor * 3,
      defense: 4 + floor,
      speed: 70,
    });
    this.setTint(0xec4899);
    this.createPullAura();
  }

  private createPullAura(): void {
    this.pullAura = this.scene.add.graphics();
    this.pullAura.setDepth(1);
    this.pullAura.fillStyle(0xec4899, 0.15);
    this.pullAura.fillCircle(0, 0, this.PULL_RADIUS);
    this.pullAura.fillStyle(0xfce7f3, 0.25);
    this.pullAura.fillCircle(0, 0, TILE_SIZE * 2);
    this.pullAura.setPosition(this.x, this.y);
  }

  protected onPhaseChange(newPhase: number): void {
    if (newPhase === 2) {
      this.setTint(0xf472b6);
    } else if (newPhase === 3) {
      this.setTint(0xfce7f3);
      this.speed *= 1.3;
    }
  }

  protected executePattern(): void {
    if (!this.target) return;

    this.attackPattern = (this.attackPattern + 1) % 3;

    switch (this.attackPattern) {
      case 0:
        this.seductiveSpiral();
        break;
      case 1:
        this.heartBurst();
        break;
      case 2:
        this.charmDash();
        break;
    }
  }

  private seductiveSpiral(): void {
    // Spiral pattern of projectiles
    const count = this.phase === 3 ? 16 : 10;
    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * 100, () => {
        if (!this.active) return;
        const angle = (i / count) * Math.PI * 4; // Two full rotations
        this.spawnProjectile(angle, 150, 0xec4899, 1.3);
      });
    }
  }

  private heartBurst(): void {
    if (!this.target) return;
    const baseAngle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    const count = this.phase === 3 ? 7 : 5;
    const spread = Math.PI / 3;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle - spread / 2 + (i / (count - 1)) * spread;
      this.spawnProjectile(angle, 200, 0xfce7f3, 1.5);
    }
  }

  private charmDash(): void {
    if (!this.target) return;
    // Quick dash toward player
    const angle = Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y);
    this.setVelocity(Math.cos(angle) * 350, Math.sin(angle) * 350);
    this.scene.time.delayedCall(400, () => this.active && this.setVelocity(0, 0));
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active) return;

    if (this.pullAura) {
      this.pullAura.setPosition(this.x, this.y);
    }

    // Strong pull effect
    if (this.target) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
      if (dist < this.PULL_RADIUS && dist > TILE_SIZE) {
        const angle = Phaser.Math.Angle.Between(this.target.x, this.target.y, this.x, this.y);
        const pullForce = (1 - dist / this.PULL_RADIUS) * this.PULL_STRENGTH * (this.phase === 3 ? 1.5 : 1);
        this.scene.events.emit('playerPulled', {
          x: Math.cos(angle) * pullForce,
          y: Math.sin(angle) * pullForce,
        });
      }
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.pullAura) this.pullAura.destroy();
    super.destroy(fromScene);
  }
}
