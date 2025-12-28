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

    // Update name tag position
    this.nameTag.setPosition(this.x, this.y - 30);

    // Update torch light position
    if (this.torchLight) {
      this.torchLight.setPosition(this.x, this.y);
    }

    // Update animation
    const animKey = this.isMoving
      ? `player_walk_${this.currentFacing}`
      : `player_idle_${this.currentFacing}`;

    if (this.anims.currentAnim?.key !== animKey) {
      this.play(animKey, true);
    }
  }

  applyPositionUpdate(message: PlayerPosMessage): void {
    this.targetX = message.x;
    this.targetY = message.y;
    this.currentFacing = message.facing;
    this.isMoving = message.isMoving;
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
    const ratio = 0.75;
    this.maxHp = Math.floor(hostMaxHp * ratio);
    this.hp = Math.floor(hostHp * ratio);
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);

    // Visual feedback
    this.setTint(0xff0000);
    if (this.scene) {
      this.scene.time.delayedCall(200, () => {
        if (!this.isDead) {
          this.setTint(0x88aaff);
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
    this.nameTag.setText('(Dead)');
    this.nameTag.setColor('#ff4444');
  }

  revive(x: number, y: number): void {
    this.isDead = false;
    this.hp = this.maxHp;
    this.setAlpha(1);
    this.setTint(0x88aaff);
    this.targetX = x;
    this.targetY = y;
    this.x = x;
    this.y = y;
    this.nameTag.setText('Helper');
    this.nameTag.setColor('#88aaff');
  }

  destroy(fromScene?: boolean): void {
    this.nameTag.destroy();
    if (this.torchLight) {
      this.scene.lights.removeLight(this.torchLight);
      this.torchLight = null;
    }
    super.destroy(fromScene);
  }
}
