// src/multiplayer/HostController.ts

import Phaser from 'phaser';
import { networkManager } from './NetworkManager';
import {
  MessageType,
  SyncMessage,
  EnemyUpdateMessage,
  HostStateMessage,
  InventoryUpdateMessage,
  RoomDataMessage,
  LootTakenMessage,
  PlayerPosMessage,
  PlayerHitMessage,
  PickupMessage,
  PlayerAttackMessage,
  RoomActivatedMessage,
} from './SyncMessages';
import { RemotePlayer } from './RemotePlayer';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import {
  validateSyncMessage,
  validateDamage,
  validateEnemyId,
  validatePositionDelta,
  validatePosition,
  MessageRateLimiter,
} from './MessageValidator';

export class HostController {
  private scene: Phaser.Scene;
  private player: Player;
  private enemies: Phaser.GameObjects.Group;
  private remotePlayer: RemotePlayer | null = null;

  // Map local enemy references to network IDs
  private enemyIdMap: Map<Enemy, string> = new Map();
  private nextEnemyId: number = 1;

  // Track last known guest position for validation
  private lastGuestPosition: { x: number; y: number } | null = null;

  // Network listener ID for cleanup
  private messageListenerId: string | null = null;

  // Rate limiter to prevent message flooding
  private rateLimiter: MessageRateLimiter = new MessageRateLimiter();

  // Timers for periodic updates
  private enemyUpdateTimer: number = 0;
  private hostStateTimer: number = 0;
  private readonly ENEMY_UPDATE_INTERVAL_MS = 50; // 20 updates/sec
  private readonly HOST_STATE_INTERVAL_MS = 1000; // 1 update/sec

  constructor(
    scene: Phaser.Scene,
    player: Player,
    enemies: Phaser.GameObjects.Group
  ) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;

    this.setupMessageHandlers();
    this.setupPeerHandlers();

    // If guest is already connected (from MenuScene), create remote player now
    if (networkManager.isConnected) {
      this.createRemotePlayer();
      this.sendInitialState();
    }
  }

  private setupMessageHandlers(): void {
    this.messageListenerId = networkManager.onMessage((message: SyncMessage, peerId: string) => {
      // Rate limiting check
      if (!this.rateLimiter.checkAllowed()) {
        console.warn(`[HostController] Rate limited message from ${peerId}`);
        return;
      }

      // Validate message structure first
      const msgValidation = validateSyncMessage(message);
      if (!msgValidation.valid) {
        console.warn(`[HostController] Invalid message from ${peerId}: ${msgValidation.reason}`);
        return;
      }

      switch (message.type) {
        case MessageType.PLAYER_POS:
          this.handleGuestPosition(message as PlayerPosMessage);
          break;

        case MessageType.PLAYER_HIT:
          this.handleGuestHit(message as PlayerHitMessage, peerId);
          break;

        case MessageType.PICKUP:
          this.handleGuestPickup(message as PickupMessage, peerId);
          break;

        case MessageType.PLAYER_ATTACK:
          this.handleGuestAttack(message as PlayerAttackMessage);
          break;

        default:
          // Log unknown message types for debugging
          console.debug('[HostController] Unknown message type:', message.type);
      }
    });
  }

  private waitingOverlay: Phaser.GameObjects.Container | null = null;

  private setupPeerHandlers(): void {
    networkManager.onPeerJoin((peerId: string) => {
      console.log(`[HostController] Guest joined: ${peerId}`);
      this.hideWaitingUI();
      this.createRemotePlayer();
      this.sendInitialState();
    });

    networkManager.onPeerLeave((peerId: string) => {
      console.log(`[HostController] Guest left: ${peerId}`);
      this.removeRemotePlayer();
      this.showWaitingUI();
    });
  }

  private showWaitingUI(): void {
    if (this.waitingOverlay) return;

    const width = this.scene.cameras.main.width;

    this.waitingOverlay = this.scene.add.container(width / 2, 60);
    this.waitingOverlay.setDepth(100);
    this.waitingOverlay.setScrollFactor(0);

    const bg = this.scene.add.rectangle(0, 0, 320, 50, 0x000000, 0.7);
    bg.setStrokeStyle(2, 0xffaa00);

    const text = this.scene.add.text(0, 0, 'Waiting for guest to reconnect...', {
      fontSize: '14px',
      fontFamily: 'Roboto Mono',
      color: '#ffaa00',
    });
    text.setOrigin(0.5);

    this.waitingOverlay.add([bg, text]);
  }

  private hideWaitingUI(): void {
    if (this.waitingOverlay) {
      this.waitingOverlay.destroy();
      this.waitingOverlay = null;
    }
  }

  private createRemotePlayer(): void {
    if (this.remotePlayer) {
      this.remotePlayer.destroy();
    }

    // Spawn near host
    const spawnX = this.player.x + 32;
    const spawnY = this.player.y;

    this.remotePlayer = new RemotePlayer(this.scene, spawnX, spawnY, true);
    this.remotePlayer.setHelperStats(this.player.maxHp, this.player.hp);
  }

  private removeRemotePlayer(): void {
    if (this.remotePlayer) {
      this.remotePlayer.destroy();
      this.remotePlayer = null;
    }
  }

  private sendInitialState(): void {
    // Send host state first
    this.sendHostState();

    // Send inventory
    this.sendInventoryUpdate();

    // Register all current enemies
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Enemy;
      this.registerEnemy(enemy);
    });

    // Send current room data
    this.sendRoomData('{}', 0); // Placeholder - actual dungeon data would come from scene
  }

  private handleGuestPosition(message: PlayerPosMessage): void {
    if (!this.remotePlayer) return;

    // Validate position bounds
    const boundsValidation = validatePosition(message.x, message.y);
    if (!boundsValidation.valid) {
      console.warn(`[HostController] Position bounds invalid: ${boundsValidation.reason}`);
      return;
    }

    // Validate position delta if we have a previous position
    if (this.lastGuestPosition) {
      const posValidation = validatePositionDelta(
        this.lastGuestPosition.x,
        this.lastGuestPosition.y,
        message.x,
        message.y
      );
      if (!posValidation.valid) {
        console.warn(`[HostController] Position delta warning: ${posValidation.reason}`);
        // Don't reject completely - could be legitimate room transition
        // Just log the warning for now
      }
    }

    // Update last known position
    this.lastGuestPosition = { x: message.x, y: message.y };
    this.remotePlayer.applyPositionUpdate(message);
  }

  private handleGuestHit(message: PlayerHitMessage, peerId: string): void {
    // Validate damage value
    const damageValidation = validateDamage(message.damage);
    if (!damageValidation.valid) {
      console.warn(`[HostController] Damage validation failed from ${peerId}: ${damageValidation.reason}`);
      return;
    }

    // Build set of valid enemy IDs
    const validEnemyIds = new Set<string>(this.enemyIdMap.values());

    // Validate enemy ID
    const enemyValidation = validateEnemyId(message.enemyId, validEnemyIds);
    if (!enemyValidation.valid) {
      console.warn(`[HostController] Enemy validation failed from ${peerId}: ${enemyValidation.reason}`);
      return;
    }

    // Find the enemy by network ID and apply damage
    for (const [enemy, id] of this.enemyIdMap) {
      if (id === message.enemyId && enemy.active) {
        enemy.takeDamage(message.damage);
        break;
      }
    }
  }

  private handleGuestAttack(message: PlayerAttackMessage): void {
    // Render visual projectile for guest's attack
    if (!this.remotePlayer) return;

    // Validate angle is a number
    const angle = typeof message.angle === 'number' ? message.angle : 0;
    const projectile = this.scene.add.sprite(message.x, message.y, 'projectile_wand');
    projectile.setDepth(8);
    projectile.setRotation(angle);
    projectile.setTint(0x88aaff); // Blue tint for helper attacks

    // Animate projectile moving in direction
    const speed = 300;
    const duration = 500;
    this.scene.tweens.add({
      targets: projectile,
      x: message.x + Math.cos(angle) * speed,
      y: message.y + Math.sin(angle) * speed,
      alpha: 0,
      duration: duration,
      onComplete: () => {
        // Safe destroy - check if sprite still exists
        if (projectile && projectile.active) {
          projectile.destroy();
        }
      },
    });

    // Visual feedback on remote player
    this.remotePlayer.applyAttack(message);
  }

  private handleGuestPickup(message: PickupMessage, _peerId: string): void {
    // Broadcast to all that this loot was taken by guest
    const takenMessage: LootTakenMessage = {
      type: MessageType.LOOT_TAKEN,
      id: message.lootId,
      playerId: 'guest',
    };

    networkManager.broadcast(takenMessage);

    // Emit event for scene to handle actual pickup
    this.scene.events.emit('remoteLootPickup', message.lootId);
  }

  update(delta: number): void {
    // Update remote player interpolation
    if (this.remotePlayer) {
      this.remotePlayer.update();

      // Set secondary target on all enemies so they can chase the guest too
      const guestPos = { x: this.remotePlayer.x, y: this.remotePlayer.y };
      this.enemies.getChildren().forEach((child) => {
        const enemy = child as Enemy;
        if (enemy.active) {
          enemy.setSecondaryTarget(guestPos);
        }
      });
    }

    // Periodic enemy updates
    this.enemyUpdateTimer += delta;
    if (this.enemyUpdateTimer >= this.ENEMY_UPDATE_INTERVAL_MS) {
      this.broadcastEnemyUpdate();
      this.enemyUpdateTimer = 0;
    }

    // Periodic host state updates
    this.hostStateTimer += delta;
    if (this.hostStateTimer >= this.HOST_STATE_INTERVAL_MS) {
      this.sendHostState();
      this.hostStateTimer = 0;
    }
  }

  registerEnemy(enemy: Enemy): string {
    if (this.enemyIdMap.has(enemy)) {
      return this.enemyIdMap.get(enemy)!;
    }

    const id = `enemy_${this.nextEnemyId++}`;
    this.enemyIdMap.set(enemy, id);

    // Listen for enemy death to clean up
    enemy.once('destroy', () => {
      this.enemyIdMap.delete(enemy);
    });

    return id;
  }

  getEnemyId(enemy: Enemy): string | undefined {
    return this.enemyIdMap.get(enemy);
  }

  private broadcastEnemyUpdate(): void {
    const enemyData: EnemyUpdateMessage['enemies'] = [];

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Enemy;
      if (!enemy.active) return;

      // Register enemy if not already registered (handles enemies spawned after connection)
      let id = this.enemyIdMap.get(enemy);
      if (!id) {
        id = this.registerEnemy(enemy);
        console.log('[HostController] Registered new enemy:', id);
      }

      enemyData.push({
        id,
        x: enemy.x,
        y: enemy.y,
        hp: enemy.hp,
        maxHp: enemy.maxHp,
        texture: enemy.texture.key,
        state: enemy.getAiState(),
        facing: 'south', // Would need to expose facing from Enemy class
      });
    });

    if (enemyData.length > 0) {
      const message: EnemyUpdateMessage = {
        type: MessageType.ENEMY_UPDATE,
        enemies: enemyData,
      };

      networkManager.broadcast(message);
    }
  }

  sendHostState(): void {
    // Validate player properties before sending
    const hp = typeof this.player.hp === 'number' && !isNaN(this.player.hp) ? this.player.hp : 0;
    const maxHp = typeof this.player.maxHp === 'number' && !isNaN(this.player.maxHp) ? this.player.maxHp : 100;
    const level = typeof this.player.level === 'number' && !isNaN(this.player.level) ? this.player.level : 1;
    const gold = typeof this.player.gold === 'number' && !isNaN(this.player.gold) ? this.player.gold : 0;

    const message: HostStateMessage = {
      type: MessageType.HOST_STATE,
      hp,
      maxHp,
      level,
      gold,
    };

    networkManager.broadcast(message);
  }

  sendInventoryUpdate(): void {
    const message: InventoryUpdateMessage = {
      type: MessageType.INVENTORY_UPDATE,
      inventorySerialized: JSON.stringify(this.player.inventory.getItems()),
      gold: this.player.gold,
    };

    networkManager.broadcast(message);
  }

  sendRoomData(dungeonData: string, currentRoomIndex: number): void {
    const message: RoomDataMessage = {
      type: MessageType.ROOM_DATA,
      dungeonData,
      currentRoomIndex,
      hostX: this.player.x,
      hostY: this.player.y,
    };

    networkManager.broadcast(message);
  }

  getRemotePlayer(): RemotePlayer | null {
    return this.remotePlayer;
  }

  // Broadcast room activation to guest - teleports them to host
  broadcastRoomActivated(roomId: number): void {
    const message: RoomActivatedMessage = {
      type: MessageType.ROOM_ACTIVATED,
      roomId,
      hostX: this.player.x,
      hostY: this.player.y,
    };
    networkManager.broadcast(message);
  }

  destroy(): void {
    // Clean up message listener to prevent memory leaks
    if (this.messageListenerId) {
      networkManager.offMessage(this.messageListenerId);
      this.messageListenerId = null;
    }

    // Clear peer callbacks to prevent ghost callbacks
    networkManager.clearOnPeerJoin();
    networkManager.clearOnPeerLeave();

    this.removeRemotePlayer();
    this.hideWaitingUI();
    this.enemyIdMap.clear();

    // Reset rate limiter
    this.rateLimiter.reset();
  }
}
