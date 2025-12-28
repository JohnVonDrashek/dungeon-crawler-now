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
    const isMoving =
      this.player.body?.velocity.x !== 0 || this.player.body?.velocity.y !== 0;

    // Only send if position changed meaningfully
    const dx = Math.abs(x - this.lastSentX);
    const dy = Math.abs(y - this.lastSentY);
    const facingChanged = facing !== this.lastSentFacing;

    if (
      dx > this.POSITION_THRESHOLD ||
      dy > this.POSITION_THRESHOLD ||
      facingChanged
    ) {
      const message: PlayerPosMessage = {
        type: MessageType.PLAYER_POS,
        x,
        y,
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

  sendAttack(attackType: string, direction: string): void {
    if (!networkManager.isMultiplayer) return;

    const message: PlayerAttackMessage = {
      type: MessageType.PLAYER_ATTACK,
      attackType,
      direction,
      x: this.player.x,
      y: this.player.y,
    };

    networkManager.broadcast(message);
  }

  sendHit(enemyId: string, damage: number): void {
    if (!networkManager.isMultiplayer) return;

    const message: PlayerHitMessage = {
      type: MessageType.PLAYER_HIT,
      enemyId,
      damage,
    };

    networkManager.broadcast(message);
  }
}
