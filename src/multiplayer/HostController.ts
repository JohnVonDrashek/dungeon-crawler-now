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
} from './SyncMessages';
import { RemotePlayer } from './RemotePlayer';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

export class HostController {
  private scene: Phaser.Scene;
  private player: Player;
  private enemies: Phaser.GameObjects.Group;
  private remotePlayer: RemotePlayer | null = null;

  // Map local enemy references to network IDs
  private enemyIdMap: Map<Enemy, string> = new Map();
  private nextEnemyId: number = 1;

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
    networkManager.onMessage((message: SyncMessage, peerId: string) => {
      switch (message.type) {
        case MessageType.PLAYER_POS:
          this.handleGuestPosition(message as PlayerPosMessage);
          break;

        case MessageType.PLAYER_HIT:
          this.handleGuestHit(message as PlayerHitMessage);
          break;

        case MessageType.PICKUP:
          this.handleGuestPickup(message as PickupMessage, peerId);
          break;
      }
    });
  }

  private setupPeerHandlers(): void {
    networkManager.onPeerJoin((peerId: string) => {
      console.log(`[HostController] Guest joined: ${peerId}`);
      this.createRemotePlayer();
      this.sendInitialState();
    });

    networkManager.onPeerLeave((peerId: string) => {
      console.log(`[HostController] Guest left: ${peerId}`);
      this.removeRemotePlayer();
    });
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
    if (this.remotePlayer) {
      this.remotePlayer.applyPositionUpdate(message);
    }
  }

  private handleGuestHit(message: PlayerHitMessage): void {
    // Find the enemy by network ID and apply damage
    for (const [enemy, id] of this.enemyIdMap) {
      if (id === message.enemyId && enemy.active) {
        enemy.takeDamage(message.damage);
        break;
      }
    }
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

      const id = this.enemyIdMap.get(enemy);
      if (!id) return;

      enemyData.push({
        id,
        x: enemy.x,
        y: enemy.y,
        hp: enemy.hp,
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
    const message: HostStateMessage = {
      type: MessageType.HOST_STATE,
      hp: this.player.hp,
      maxHp: this.player.maxHp,
      level: this.player.level,
      gold: this.player.gold,
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

  destroy(): void {
    this.removeRemotePlayer();
    this.enemyIdMap.clear();
  }
}
