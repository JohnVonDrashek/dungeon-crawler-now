// src/multiplayer/PlayerSync.ts

import { networkManager } from './NetworkManager';
import {
  MessageType,
  PlayerPosMessage,
  PlayerAttackMessage,
  PlayerHitMessage,
} from './SyncMessages';
import { Player } from '../entities/Player';

export class PlayerSync {
  private player: Player;
  private lastSentX: number = 0;
  private lastSentY: number = 0;
  private lastSentFacing: string = '';
  private lastSendTime: number = 0;
  private readonly SEND_INTERVAL_MS = 50; // 20 updates/sec
  private readonly POSITION_THRESHOLD = 2; // pixels

  constructor(player: Player) {
    this.player = player;
  }

  update(): void {
    if (!networkManager.isMultiplayer) return;

    const now = Date.now();
    if (now - this.lastSendTime < this.SEND_INTERVAL_MS) return;

    const x = this.player.x;
    const y = this.player.y;
    const facing = this.player.getFacingDirection();

    // Safe velocity check with proper null handling
    const body = this.player.body as Phaser.Physics.Arcade.Body | null;
    const isMoving = body
      ? body.velocity.x !== 0 || body.velocity.y !== 0
      : false;

    // Only send if position changed meaningfully
    const dx = Math.abs(x - this.lastSentX);
    const dy = Math.abs(y - this.lastSentY);
    const facingChanged = facing !== this.lastSentFacing;

    // Validate position is within reasonable bounds (prevent sending garbage data)
    const MAX_WORLD_SIZE = 10000;
    if (x < 0 || x > MAX_WORLD_SIZE || y < 0 || y > MAX_WORLD_SIZE) {
      console.warn('[PlayerSync] Position out of bounds, skipping sync');
      return;
    }

    if (
      dx > this.POSITION_THRESHOLD ||
      dy > this.POSITION_THRESHOLD ||
      facingChanged
    ) {
      const message: PlayerPosMessage = {
        type: MessageType.PLAYER_POS,
        x: Math.round(x), // Round to reduce bandwidth
        y: Math.round(y),
        facing,
        animState: isMoving ? 'walk' : 'idle',
        isMoving,
      };

      networkManager.broadcast(message);

      this.lastSentX = x;
      this.lastSentY = y;
      this.lastSentFacing = facing;
      this.lastSendTime = now;
    }
  }

  sendAttack(attackType: string, direction: string, angle?: number): void {
    if (!networkManager.isMultiplayer) return;

    const message: PlayerAttackMessage = {
      type: MessageType.PLAYER_ATTACK,
      attackType,
      direction,
      x: Math.round(this.player.x),
      y: Math.round(this.player.y),
      angle: typeof angle === 'number' && !isNaN(angle) ? angle : undefined,
    };

    networkManager.broadcast(message);
  }

  sendHit(enemyId: string, damage: number): void {
    if (!networkManager.isMultiplayer) return;

    // Validate inputs
    if (!enemyId || typeof damage !== 'number' || damage < 0) {
      console.warn('[PlayerSync] Invalid hit data:', { enemyId, damage });
      return;
    }

    const message: PlayerHitMessage = {
      type: MessageType.PLAYER_HIT,
      enemyId,
      damage: Math.floor(damage), // Ensure integer damage
    };

    networkManager.broadcast(message);
  }
}
