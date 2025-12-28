// src/multiplayer/GuestController.ts

import Phaser from 'phaser';
import { networkManager } from './NetworkManager';
import {
  MessageType,
  SyncMessage,
  PlayerPosMessage,
  EnemyUpdateMessage,
  HostStateMessage,
  InventoryUpdateMessage,
  RoomClearMessage,
  PlayerDiedMessage,
  PlayerReviveMessage,
  SceneChangeMessage,
} from './SyncMessages';
import { RemotePlayer } from './RemotePlayer';
import { Player } from '../entities/Player';

interface GuestEnemy {
  sprite: Phaser.Physics.Arcade.Sprite;
  id: string;
  hp: number;
}

export class GuestController {
  private scene: Phaser.Scene;
  private player: Player;
  private hostPlayer: RemotePlayer | null = null;
  private guestEnemies: Map<string, GuestEnemy> = new Map();

  private isSpectating: boolean = false;
  private spectateOverlay: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    this.setupMessageHandlers();
    this.createHostPlayer();
  }

  private setupMessageHandlers(): void {
    networkManager.onMessage((message, peerId) => {
      this.handleMessage(message, peerId);
    });

    networkManager.onPeerLeave(() => {
      this.onHostDisconnected();
    });
  }

  private createHostPlayer(): void {
    this.hostPlayer = new RemotePlayer(
      this.scene,
      this.player.x - 50,
      this.player.y,
      false // not helper, this is the host
    );
  }

  private handleMessage(message: SyncMessage, _peerId: string): void {
    switch (message.type) {
      case MessageType.PLAYER_POS:
        this.handleHostPosition(message as PlayerPosMessage);
        break;
      case MessageType.ENEMY_UPDATE:
        this.handleEnemyUpdate(message as EnemyUpdateMessage);
        break;
      case MessageType.HOST_STATE:
        this.handleHostState(message as HostStateMessage);
        break;
      case MessageType.INVENTORY_UPDATE:
        this.handleInventoryUpdate(message as InventoryUpdateMessage);
        break;
      case MessageType.ROOM_CLEAR:
        this.handleRoomClear(message as RoomClearMessage);
        break;
      case MessageType.PLAYER_DIED:
        this.handlePlayerDied(message as PlayerDiedMessage);
        break;
      case MessageType.PLAYER_REVIVE:
        this.handlePlayerRevive(message as PlayerReviveMessage);
        break;
      case MessageType.SCENE_CHANGE:
        this.handleSceneChange(message as SceneChangeMessage);
        break;
    }
  }

  private handleHostPosition(message: PlayerPosMessage): void {
    if (this.hostPlayer) {
      this.hostPlayer.applyPositionUpdate(message);
    }
  }

  private handleEnemyUpdate(message: EnemyUpdateMessage): void {
    const seenIds = new Set<string>();

    for (const enemyData of message.enemies) {
      seenIds.add(enemyData.id);

      let guestEnemy = this.guestEnemies.get(enemyData.id);

      if (!guestEnemy) {
        // Create new enemy sprite
        const sprite = this.scene.physics.add.sprite(
          enemyData.x,
          enemyData.y,
          'enemy_basic'
        );
        sprite.setDepth(5);
        sprite.setPipeline('Light2D');

        guestEnemy = {
          sprite,
          id: enemyData.id,
          hp: enemyData.hp,
        };
        this.guestEnemies.set(enemyData.id, guestEnemy);
      }

      // Update position with interpolation
      guestEnemy.sprite.x = Phaser.Math.Linear(
        guestEnemy.sprite.x,
        enemyData.x,
        0.3
      );
      guestEnemy.sprite.y = Phaser.Math.Linear(
        guestEnemy.sprite.y,
        enemyData.y,
        0.3
      );
      guestEnemy.hp = enemyData.hp;

      // Visual feedback for low HP
      if (enemyData.hp <= 0) {
        guestEnemy.sprite.setAlpha(0);
      }
    }

    // Remove enemies that weren't in the update
    for (const [id, guestEnemy] of this.guestEnemies.entries()) {
      if (!seenIds.has(id)) {
        guestEnemy.sprite.destroy();
        this.guestEnemies.delete(id);
      }
    }
  }

  private handleHostState(message: HostStateMessage): void {
    // Update helper stats based on host
    const ratio = 0.75;
    this.player.maxHp = Math.floor(message.maxHp * ratio);
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    this.player.level = message.level;
    this.player.gold = message.gold;
  }

  private handleInventoryUpdate(message: InventoryUpdateMessage): void {
    this.player.inventory.deserialize(message.inventorySerialized);
    this.player.gold = message.gold;
    this.player.recalculateStats();
  }

  private handleRoomClear(_message: RoomClearMessage): void {
    // Exit spectate mode if we were dead
    if (this.isSpectating) {
      this.exitSpectateMode();
    }
  }

  private handlePlayerDied(message: PlayerDiedMessage): void {
    // If it's us, enter spectate mode
    if (message.playerId === networkManager.peerId) {
      this.enterSpectateMode();
    }
  }

  private handlePlayerRevive(message: PlayerReviveMessage): void {
    if (message.playerId === networkManager.peerId) {
      this.exitSpectateMode();
      this.player.setPosition(message.x, message.y);
      this.player.hp = this.player.maxHp;
    }
  }

  private handleSceneChange(message: SceneChangeMessage): void {
    this.cleanup();
    this.scene.scene.start(message.sceneName, message.data);
  }

  private onHostDisconnected(): void {
    // Show disconnect message and return to menu
    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    const overlay = this.scene.add.rectangle(
      width / 2, height / 2, width, height, 0x000000, 0.9
    );
    overlay.setDepth(1000);
    overlay.setScrollFactor(0);

    const text = this.scene.add.text(width / 2, height / 2, 'Host disconnected', {
      fontSize: '24px',
      fontFamily: 'Cinzel',
      color: '#ff4444',
    });
    text.setOrigin(0.5);
    text.setDepth(1001);
    text.setScrollFactor(0);

    this.scene.time.delayedCall(2000, () => {
      networkManager.disconnect();
      this.scene.scene.start('MenuScene');
    });
  }

  private enterSpectateMode(): void {
    this.isSpectating = true;
    this.player.setAlpha(0.3);
    this.player.setActive(false);

    const width = this.scene.cameras.main.width;

    this.spectateOverlay = this.scene.add.container(width / 2, 50);
    this.spectateOverlay.setScrollFactor(0);
    this.spectateOverlay.setDepth(100);

    const bg = this.scene.add.rectangle(0, 0, 300, 40, 0x000000, 0.7);
    const text = this.scene.add.text(0, 0, 'Waiting for room clear...', {
      fontSize: '14px',
      fontFamily: 'Roboto Mono',
      color: '#ff8888',
    });
    text.setOrigin(0.5);

    this.spectateOverlay.add([bg, text]);

    // Follow host
    if (this.hostPlayer) {
      this.scene.cameras.main.startFollow(this.hostPlayer);
    }
  }

  private exitSpectateMode(): void {
    this.isSpectating = false;
    this.player.setAlpha(1);
    this.player.setActive(true);
    this.player.hp = this.player.maxHp;

    if (this.spectateOverlay) {
      this.spectateOverlay.destroy();
      this.spectateOverlay = null;
    }

    // Return camera to player
    this.scene.cameras.main.startFollow(this.player);
  }

  update(): void {
    if (!networkManager.isConnected) return;

    this.hostPlayer?.update();

    // Interpolate guest enemy positions
    // Animation updates handled in handleEnemyUpdate
  }

  getGuestEnemy(id: string): GuestEnemy | undefined {
    return this.guestEnemies.get(id);
  }

  getHostPlayer(): RemotePlayer | null {
    return this.hostPlayer;
  }

  cleanup(): void {
    if (this.hostPlayer) {
      this.hostPlayer.destroy();
      this.hostPlayer = null;
    }

    for (const guestEnemy of this.guestEnemies.values()) {
      guestEnemy.sprite.destroy();
    }
    this.guestEnemies.clear();

    if (this.spectateOverlay) {
      this.spectateOverlay.destroy();
      this.spectateOverlay = null;
    }
  }

  destroy(): void {
    this.cleanup();
  }
}
