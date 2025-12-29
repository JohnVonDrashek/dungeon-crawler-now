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
  EnemyDeathMessage,
  LootSpawnMessage,
  DamageNumberMessage,
  RoomClearMessage,
  ComboUpdateMessage,
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

  // Track last hitter for kill attribution
  private lastHitterMap: Map<string, 'host' | 'guest'> = new Map();

  // Co-op combo tracking
  private comboCount: number = 0;
  private comboTimer: number = 0;
  private readonly COMBO_TIMEOUT_MS = 2500; // 2.5 seconds to maintain combo

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
    this.setupSceneEventHandlers();

    // If guest is already connected (from MenuScene), create remote player now
    if (networkManager.isConnected) {
      this.createRemotePlayer();
      this.sendInitialState();
    }
  }

  private setupSceneEventHandlers(): void {
    // Listen for enemy deaths to broadcast to guest
    this.scene.events.on('enemyDeath', (enemy: Enemy) => {
      this.handleEnemyDeath(enemy);
    });

    // Listen for loot drops to sync with guest
    this.scene.events.on('lootSpawned', (lootId: string, type: string, x: number, y: number, data: string) => {
      this.broadcastLootSpawn(lootId, type, x, y, data);
    });

    // Listen for room cleared events
    this.scene.events.on('roomCleared', (roomId: number) => {
      this.broadcastRoomCleared(roomId);
    });
  }

  private broadcastRoomCleared(roomId: number): void {
    const message: RoomClearMessage = {
      type: MessageType.ROOM_CLEAR,
      roomIndex: roomId,
    };
    networkManager.broadcast(message);

    // Show notification for host
    this.showRoomClearedNotification();
  }

  private showRoomClearedNotification(): void {
    if (!this.scene || !this.scene.add || !this.scene.cameras) return;

    const cam = this.scene.cameras.main;
    const text = this.scene.add.text(cam.width / 2, cam.height / 2 - 50, 'ROOM CLEARED!', {
      fontSize: '24px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#44ff44',
      stroke: '#000000',
      strokeThickness: 4,
    });
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(200);
    text.setAlpha(0);

    // Animate in
    this.scene.tweens.add({
      targets: text,
      alpha: 1,
      y: cam.height / 2 - 60,
      duration: 300,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        // Hold then fade out
        this.scene.time.delayedCall(1000, () => {
          this.scene.tweens.add({
            targets: text,
            alpha: 0,
            y: cam.height / 2 - 80,
            duration: 500,
            ease: 'Cubic.easeIn',
            onComplete: () => {
              if (text && text.active) text.destroy();
            },
          });
        });
      },
    });
  }

  private handleEnemyDeath(enemy: Enemy): void {
    const enemyId = this.enemyIdMap.get(enemy);
    if (!enemyId) return;

    // Get killer from last hitter map
    const killer = this.lastHitterMap.get(enemyId) || 'host';

    // Broadcast death to guest
    const deathMessage: EnemyDeathMessage = {
      type: MessageType.ENEMY_DEATH,
      id: enemyId,
      killerPlayerId: killer,
      enemyType: enemy.texture.key,
      x: enemy.x,
      y: enemy.y,
    };
    networkManager.broadcast(deathMessage);

    // Emit kill feed event for local UI
    this.scene.events.emit('killFeedEntry', killer, enemy.texture.key);

    // Update combo tracking
    this.updateCombo(killer, enemy.x, enemy.y);

    // Cleanup
    this.lastHitterMap.delete(enemyId);
  }

  private updateCombo(killer: string, x: number, y: number): void {
    // Increment combo
    this.comboCount++;
    this.comboTimer = this.COMBO_TIMEOUT_MS;

    // Only show combo notification for 2+ kills
    if (this.comboCount >= 2) {
      // Broadcast combo update to guest
      const comboMessage: ComboUpdateMessage = {
        type: MessageType.COMBO_UPDATE,
        count: this.comboCount,
        lastKiller: killer,
        x,
        y,
      };
      networkManager.broadcast(comboMessage);

      // Show combo notification locally
      this.showComboNotification(this.comboCount, killer, x, y);
    }
  }

  private showComboNotification(count: number, killer: string, x: number, y: number): void {
    if (!this.scene || !this.scene.add) return;

    // Color based on who got the kill
    const color = killer === 'host' ? '#ffdd44' : '#88aaff';
    const comboText = count >= 5 ? `${count}x MEGA COMBO!` : `${count}x COMBO!`;

    const text = this.scene.add.text(x, y - 40, comboText, {
      fontSize: count >= 5 ? '20px' : '16px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);
    text.setDepth(150);

    // Animate: scale up, hold, fade out
    text.setScale(0.5);
    this.scene.tweens.add({
      targets: text,
      scale: 1.2,
      duration: 150,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: text,
          scale: 1,
          duration: 100,
          onComplete: () => {
            this.scene.time.delayedCall(500, () => {
              this.scene.tweens.add({
                targets: text,
                y: y - 60,
                alpha: 0,
                duration: 400,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                  if (text && text.active) text.destroy();
                },
              });
            });
          },
        });
      },
    });
  }

  private resetCombo(): void {
    this.comboCount = 0;
    this.comboTimer = 0;
  }

  // Called when host damages an enemy
  trackHostHit(enemy: Enemy): void {
    const enemyId = this.enemyIdMap.get(enemy);
    if (enemyId) {
      this.lastHitterMap.set(enemyId, 'host');
    }
  }

  private broadcastLootSpawn(lootId: string, type: string, x: number, y: number, data: string): void {
    const message: LootSpawnMessage = {
      type: MessageType.LOOT_SPAWN,
      id: lootId,
      itemData: JSON.stringify({ type, data }),
      x,
      y,
    };
    networkManager.broadcast(message);
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

        case MessageType.DAMAGE_NUMBER:
          this.handleGuestDamageNumber(message as DamageNumberMessage);
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
    if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) return;

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

    // Track that guest was the last hitter for kill attribution
    this.lastHitterMap.set(message.enemyId, 'guest');

    // Find the enemy by network ID and apply damage
    for (const [enemy, id] of this.enemyIdMap) {
      if (id === message.enemyId && enemy.active) {
        enemy.takeDamage(message.damage);

        // Show damage number for guest's hit
        this.scene.events.emit('showDamageNumber', enemy.x, enemy.y, message.damage, false);
        break;
      }
    }
  }

  private handleGuestAttack(message: PlayerAttackMessage): void {
    // Render visual projectile for guest's attack
    if (!this.remotePlayer || !this.scene) return;

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
    // Validate loot ID
    if (!message.lootId || typeof message.lootId !== 'string') return;

    // Broadcast to all that this loot was taken by guest
    const takenMessage: LootTakenMessage = {
      type: MessageType.LOOT_TAKEN,
      id: message.lootId,
      playerId: 'guest',
    };

    networkManager.broadcast(takenMessage);

    // Emit event for scene to handle actual pickup
    if (this.scene && this.scene.events) {
      this.scene.events.emit('remoteLootPickup', message.lootId);
    }
  }

  private handleGuestDamageNumber(message: DamageNumberMessage): void {
    if (!this.scene || !this.scene.add) return;

    // Validate position
    const x = typeof message.x === 'number' && !isNaN(message.x) ? message.x : 0;
    const y = typeof message.y === 'number' && !isNaN(message.y) ? message.y : 0;
    const damage = typeof message.damage === 'number' && !isNaN(message.damage) ? Math.floor(message.damage) : 0;

    // Create damage number text with helper's tint color
    const color = message.isPlayerDamage ? '#ff4444' : '#88aaff'; // Blue for helper's damage
    const text = this.scene.add.text(x, y - 10, `${damage}`, {
      fontSize: '14px',
      fontFamily: 'Roboto Mono, monospace',
      color: color,
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setDepth(100);

    // Float up and fade out animation
    this.scene.tweens.add({
      targets: text,
      y: y - 35,
      alpha: 0,
      duration: 800,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        if (text && text.active) {
          text.destroy();
        }
      },
    });
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

    // Combo timeout tracking
    if (this.comboTimer > 0) {
      this.comboTimer -= delta;
      if (this.comboTimer <= 0) {
        this.resetCombo();
      }
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

    // Store networkId on enemy for PlayerAttackManager to use when broadcasting hits
    (enemy as Enemy & { networkId: string }).networkId = id;

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

    // Remove scene event listeners
    this.scene.events.off('enemyDeath');
    this.scene.events.off('lootSpawned');
    this.scene.events.off('roomCleared');

    this.removeRemotePlayer();
    this.hideWaitingUI();
    this.enemyIdMap.clear();
    this.lastHitterMap.clear();

    // Reset rate limiter
    this.rateLimiter.reset();
  }
}
