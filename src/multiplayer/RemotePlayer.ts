// src/multiplayer/RemotePlayer.ts

import Phaser from 'phaser';
import { PlayerPosMessage, PlayerAttackMessage } from './SyncMessages';

export class RemotePlayer extends Phaser.Physics.Arcade.Sprite {
  private targetX: number = 0;
  private targetY: number = 0;
  private currentFacing: string = 'south';
  private isMoving: boolean = false;
  private readonly LERP_SPEED = 0.3;

  // Helper stats (75% of host)
  public hp: number = 75;
  public maxHp: number = 75;

  private nameTag: Phaser.GameObjects.Text;
  private isDead: boolean = false;
  private torchLight: Phaser.GameObjects.Light | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, isHelper: boolean = true) {
    super(scene, x, y, 'franciscan_idle', 0);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.isHelper = isHelper;
    this.setDepth(10);
    this.setTint(isHelper ? 0x88aaff : 0xffffff); // Blue tint for helper

    // Enable Light2D pipeline
    this.setPipeline('Light2D');

    this.targetX = x;
    this.targetY = y;

    // Add torch light for remote player
    this.torchLight = scene.lights.addLight(x, y, 150, 0xffaa44, 0.8);

    // Add name tag
    this.nameTag = scene.add.text(x, y - 30, isHelper ? 'Helper' : 'Host', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono',
      color: '#88aaff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.nameTag.setOrigin(0.5);
    this.nameTag.setDepth(11);
  }

  update(): void {
    if (this.isDead) return;

    // Smooth interpolation to target position
    this.x = Phaser.Math.Linear(this.x, this.targetX, this.LERP_SPEED);
    this.y = Phaser.Math.Linear(this.y, this.targetY, this.LERP_SPEED);

    // Update name tag position (with null check)
    if (this.nameTag && this.nameTag.active) {
      this.nameTag.setPosition(this.x, this.y - 30);
    }

    // Update torch light position
    if (this.torchLight) {
      this.torchLight.setPosition(this.x, this.y);
    }

    // Update animation (with validation)
    if (!this.scene || !this.anims || !this.scene.anims) return;

    const animKey = this.isMoving
      ? `player_walk_${this.currentFacing}`
      : `player_idle_${this.currentFacing}`;

    // Only play if animation exists
    if (this.anims.currentAnim?.key !== animKey && this.scene.anims.exists(animKey)) {
      this.play(animKey, true);
    }
  }

  applyPositionUpdate(message: PlayerPosMessage): void {
    // Validate position values before applying
    if (typeof message.x === 'number' && !isNaN(message.x)) {
      this.targetX = message.x;
    }
    if (typeof message.y === 'number' && !isNaN(message.y)) {
      this.targetY = message.y;
    }
    if (typeof message.facing === 'string') {
      this.currentFacing = message.facing;
    }
    if (typeof message.isMoving === 'boolean') {
      this.isMoving = message.isMoving;
    }
  }

  applyAttack(_message: PlayerAttackMessage): void {
    // Visual feedback for remote player attacking
    if (!this.scene) return;
    this.scene.tweens.add({
      targets: this,
      alpha: 0.7,
      duration: 100,
      yoyo: true,
    });
  }

  setHelperStats(hostMaxHp: number, hostHp: number): void {
    // Validate inputs
    const validMaxHp = typeof hostMaxHp === 'number' && hostMaxHp > 0 ? hostMaxHp : 100;
    const validHp = typeof hostHp === 'number' && hostHp >= 0 ? hostHp : validMaxHp;

    const ratio = 0.75;
    this.maxHp = Math.floor(validMaxHp * ratio);
    this.hp = Math.floor(validHp * ratio);
  }

  private isHelper: boolean = true;

  takeDamage(amount: number): void {
    // Validate damage amount
    const validAmount = typeof amount === 'number' && amount > 0 ? amount : 0;
    this.hp = Math.max(0, this.hp - validAmount);

    // Visual feedback
    const originalTint = this.isHelper ? 0x88aaff : 0xffffff;
    this.setTint(0xff0000);
    if (this.scene) {
      this.scene.time.delayedCall(200, () => {
        if (!this.isDead) {
          this.setTint(originalTint);
        }
      });
    }

    if (this.hp <= 0) {
      this.die();
    }
  }

  die(): void {
    this.isDead = true;
    this.setAlpha(0.3);
    if (this.nameTag && this.nameTag.active) {
      this.nameTag.setText('(Dead)');
      this.nameTag.setColor('#ff4444');
    }
  }

  revive(x: number, y: number): void {
    this.isDead = false;
    this.hp = this.maxHp;
    this.setAlpha(1);
    this.setTint(this.isHelper ? 0x88aaff : 0xffffff);
    this.targetX = x;
    this.targetY = y;
    this.x = x;
    this.y = y;
    if (this.nameTag && this.nameTag.active) {
      this.nameTag.setText(this.isHelper ? 'Helper' : 'Host');
      this.nameTag.setColor(this.isHelper ? '#88aaff' : '#ffffff');
    }
  }

  destroy(fromScene?: boolean): void {
    // Safe cleanup - check if scene and its lights still exist
    if (this.nameTag) {
      this.nameTag.destroy();
    }
    if (this.torchLight && this.scene && this.scene.lights) {
      try {
        this.scene.lights.removeLight(this.torchLight);
      } catch (e) {
        // Ignore errors if scene is already destroyed
      }
      this.torchLight = null;
    }
    super.destroy(fromScene);
  }
}
