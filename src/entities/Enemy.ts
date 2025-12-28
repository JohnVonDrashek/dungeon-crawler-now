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
  protected secondaryTarget: { x: number; y: number } | null = null;
  private attackCooldown: number = 0;
  private readonly ATTACK_COOLDOWN_MS = 1000;
  private readonly CHASE_RANGE = TILE_SIZE * 8;
  private readonly ATTACK_RANGE = TILE_SIZE * 1.5;
  private readonly RETREAT_HP_PERCENT = 0.2;

  // Animation tracking
  protected spriteKey: string = ''; // e.g., 'imp', 'demon_brute', 'pride'
  protected facingDirection: string = 'south';
  protected isMoving: boolean = false;
  protected hasWalkAnim: boolean = false;

  // Enemy light for visibility in dark dungeons
  private enemyLight: Phaser.GameObjects.Light | null = null;

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

    // Enable Light2D pipeline for dynamic lighting
    this.setPipeline('Light2D');

    // Create a small dim light so enemies are visible in dark areas
    // Uses a reddish glow to make them feel threatening
    this.enemyLight = scene.lights.addLight(x, y, 80, 0xff6644, 0.4);
  }

  // Set up sprite-based animations for this enemy
  protected setupSpriteAnimations(spriteKey: string, hasWalk: boolean = true): void {
    this.spriteKey = spriteKey;
    this.hasWalkAnim = hasWalk;
    // Start with idle south animation
    this.playDirectionalAnim('idle', 'south');
  }

  protected playDirectionalAnim(type: 'idle' | 'walk', direction: string): void {
    if (!this.spriteKey) return;

    const animKey = `${this.spriteKey}_${type}_${direction}`;
    if (this.anims.currentAnim?.key !== animKey) {
      // Check if animation exists before playing
      if (this.scene.anims.exists(animKey)) {
        this.play(animKey, true);
      }
    }
  }

  protected updateAnimation(): void {
    if (!this.spriteKey) return;

    const vx = this.body?.velocity.x ?? 0;
    const vy = this.body?.velocity.y ?? 0;
    this.isMoving = Math.abs(vx) > 5 || Math.abs(vy) > 5;

    if (this.isMoving) {
      this.facingDirection = this.getDirectionFromVelocity(vx, vy);
    }

    const animType = this.isMoving && this.hasWalkAnim ? 'walk' : 'idle';
    this.playDirectionalAnim(animType, this.facingDirection);
  }

  protected getDirectionFromVelocity(vx: number, vy: number): string {
    // Normalize to get direction
    const absX = Math.abs(vx);
    const absY = Math.abs(vy);

    // Threshold for diagonal detection
    const threshold = 0.4;
    const ratio = absX / (absY + 0.001);

    if (ratio < threshold) {
      // Mostly vertical
      return vy > 0 ? 'south' : 'north';
    } else if (ratio > 1 / threshold) {
      // Mostly horizontal
      return vx > 0 ? 'east' : 'west';
    } else {
      // Diagonal
      if (vx > 0 && vy > 0) return 'south_east';
      if (vx < 0 && vy > 0) return 'south_west';
      if (vx > 0 && vy < 0) return 'north_east';
      if (vx < 0 && vy < 0) return 'north_west';
    }

    return this.facingDirection;
  }

  setTarget(player: Player): void {
    this.target = player;
  }

  setSecondaryTarget(target: { x: number; y: number } | null): void {
    this.secondaryTarget = target;
  }

  // Get the closest target position (primary or secondary)
  protected getClosestTargetPos(): { x: number; y: number } | null {
    if (!this.target && !this.secondaryTarget) return null;
    if (!this.target) return this.secondaryTarget;
    if (!this.secondaryTarget) return { x: this.target.x, y: this.target.y };

    const distToPrimary = Phaser.Math.Distance.Between(
      this.x, this.y, this.target.x, this.target.y
    );
    const distToSecondary = Phaser.Math.Distance.Between(
      this.x, this.y, this.secondaryTarget.x, this.secondaryTarget.y
    );

    return distToPrimary <= distToSecondary
      ? { x: this.target.x, y: this.target.y }
      : this.secondaryTarget;
  }

  update(_time: number, delta: number): void {
    if (!this.active || !this.target) return;

    this.updateCooldowns(delta);
    this.updateState();
    this.executeState();
    this.updateAnimation();

    // Update enemy light position
    if (this.enemyLight) {
      this.enemyLight.setPosition(this.x, this.y);
    }
  }

  private updateCooldowns(delta: number): void {
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
  }

  private updateState(): void {
    const targetPos = this.getClosestTargetPos();
    if (!targetPos) return;

    const distanceToTarget = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      targetPos.x,
      targetPos.y
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
    const targetPos = this.getClosestTargetPos();
    if (!targetPos) return;

    const angle = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      targetPos.x,
      targetPos.y
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
    const targetPos = this.getClosestTargetPos();
    if (!targetPos) return;

    const angle = Phaser.Math.Angle.Between(
      targetPos.x,
      targetPos.y,
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

    // Remove enemy light
    if (this.enemyLight) {
      this.enemyLight.setVisible(false);
      this.enemyLight = null;
    }

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
