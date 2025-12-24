import Phaser from 'phaser';
import { Player } from './Player';
import { TILE_SIZE } from '../utils/constants';

export enum EnemyState {
  IDLE = 'idle',
  CHASE = 'chase',
  ATTACK = 'attack',
  RETREAT = 'retreat',
}

export class Enemy extends Phaser.Physics.Arcade.Sprite {
  public hp: number;
  public maxHp: number;
  public attack: number;
  public defense: number;
  public speed: number;
  public xpValue: number;

  private aiState: EnemyState = EnemyState.IDLE;
  protected target: Player | null = null;
  private attackCooldown: number = 0;
  private readonly ATTACK_COOLDOWN_MS = 1000;
  private readonly CHASE_RANGE = TILE_SIZE * 8;
  private readonly ATTACK_RANGE = TILE_SIZE * 1.5;
  private readonly RETREAT_HP_PERCENT = 0.2;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string = 'enemy',
    stats?: {
      hp?: number;
      attack?: number;
      defense?: number;
      speed?: number;
      xpValue?: number;
    }
  ) {
    super(scene, x, y, texture);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Default stats, can be overridden
    this.maxHp = stats?.hp ?? 30;
    this.hp = this.maxHp;
    this.attack = stats?.attack ?? 8;
    this.defense = stats?.defense ?? 2;
    this.speed = stats?.speed ?? 80;
    this.xpValue = stats?.xpValue ?? 25;

    this.setCollideWorldBounds(true);
    this.setDepth(5);
  }

  setTarget(player: Player): void {
    this.target = player;
  }

  update(_time: number, delta: number): void {
    if (!this.active || !this.target) return;

    this.updateCooldowns(delta);
    this.updateState();
    this.executeState();
  }

  private updateCooldowns(delta: number): void {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
  }

  private updateState(): void {
    if (!this.target) return;

    const distanceToTarget = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y
    );

    // Check if should retreat (low HP)
    if (this.hp / this.maxHp <= this.RETREAT_HP_PERCENT) {
      this.aiState = EnemyState.RETREAT;
      return;
    }

    // Check attack range
    if (distanceToTarget <= this.ATTACK_RANGE) {
      this.aiState = EnemyState.ATTACK;
      return;
    }

    // Check chase range
    if (distanceToTarget <= this.CHASE_RANGE) {
      this.aiState = EnemyState.CHASE;
      return;
    }

    this.aiState = EnemyState.IDLE;
  }

  private executeState(): void {
    switch (this.aiState) {
      case EnemyState.IDLE:
        this.setVelocity(0, 0);
        break;

      case EnemyState.CHASE:
        this.chaseTarget();
        break;

      case EnemyState.ATTACK:
        this.attackTarget();
        break;

      case EnemyState.RETREAT:
        this.retreatFromTarget();
        break;
    }
  }

  private chaseTarget(): void {
    if (!this.target) return;

    const angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      this.target.x,
      this.target.y
    );

    this.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );
  }

  private attackTarget(): void {
    this.setVelocity(0, 0);

    if (this.attackCooldown <= 0 && this.target) {
      // Emit attack event for GameScene to handle collision
      this.scene.events.emit('enemyAttack', this, this.target);
      this.attackCooldown = this.ATTACK_COOLDOWN_MS;

      // Visual feedback - lunge toward player
      const angle = Phaser.Math.Angle.Between(
        this.x,
        this.y,
        this.target.x,
        this.target.y
      );
      const lungeX = Math.cos(angle) * 10;
      const lungeY = Math.sin(angle) * 10;

      this.scene.tweens.add({
        targets: this,
        x: this.x + lungeX,
        y: this.y + lungeY,
        duration: 100,
        yoyo: true,
      });
    }
  }

  private retreatFromTarget(): void {
    if (!this.target) return;

    const angle = Phaser.Math.Angle.Between(
      this.target.x,
      this.target.y,
      this.x,
      this.y
    );

    this.setVelocity(
      Math.cos(angle) * this.speed * 0.7,
      Math.sin(angle) * this.speed * 0.7
    );
  }

  takeDamage(amount: number): void {
    this.hp -= amount;

    // Flash red
    this.setTint(0xff0000);
    this.scene.time.delayedCall(100, () => {
      if (this.active) {
        this.clearTint();
      }
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  private die(): void {
    // Emit death event for XP, loot, etc.
    this.scene.events.emit('enemyDeath', this);

    // Death animation
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      scale: 0.5,
      duration: 200,
      onComplete: () => {
        this.destroy();
      },
    });
  }

  getAiState(): EnemyState {
    return this.aiState;
  }
}
