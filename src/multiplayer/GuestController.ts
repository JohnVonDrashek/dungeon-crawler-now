// src/multiplayer/GuestController.ts

import Phaser from 'phaser';
import { networkManager } from './NetworkManager';
import {
  MessageType,
  SyncMessage,
  PlayerPosMessage,
  PlayerAttackMessage,
  EnemyUpdateMessage,
  HostStateMessage,
  InventoryUpdateMessage,
  RoomClearMessage,
  RoomActivatedMessage,
  PlayerDiedMessage,
  PlayerReviveMessage,
  SceneChangeMessage,
} from './SyncMessages';
import { RemotePlayer } from './RemotePlayer';
import { Player } from '../entities/Player';
import { RoomManager } from '../systems/RoomManager';

interface GuestEnemy {
  sprite: Phaser.Physics.Arcade.Sprite;
  healthBar: Phaser.GameObjects.Container;
  id: string;
  hp: number;
  maxHp: number;
}

export class GuestController {
  private scene: Phaser.Scene;
  private player: Player;
  private hostPlayer: RemotePlayer | null = null;
  private guestEnemies: Map<string, GuestEnemy> = new Map();
  private roomManager: RoomManager | null = null;

  private isSpectating: boolean = false;
  private spectateOverlay: Phaser.GameObjects.Container | null = null;

  // Track last safe position (where host is or was)
  private lastSafeX: number = 0;
  private lastSafeY: number = 0;
  private visitedRoomIds: Set<number> = new Set([0]); // Spawn room is always safe

  // Network listener ID for cleanup
  private messageListenerId: string | null = null;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;
    this.lastSafeX = player.x;
    this.lastSafeY = player.y;

    this.setupMessageHandlers();
    this.createHostPlayer();
  }

  setRoomManager(roomManager: RoomManager): void {
    this.roomManager = roomManager;
  }

  private setupMessageHandlers(): void {
    this.messageListenerId = networkManager.onMessage((message, peerId) => {
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
      case MessageType.PLAYER_ATTACK:
        this.handleHostAttack(message as PlayerAttackMessage);
        break;
      case MessageType.ROOM_ACTIVATED:
        this.handleRoomActivated(message as RoomActivatedMessage);
        break;
      default:
        // Log unknown message types for debugging
        console.debug('[GuestController] Unknown message type:', (message as SyncMessage).type);
    }
  }

  private handleHostPosition(message: PlayerPosMessage): void {
    if (this.hostPlayer) {
      this.hostPlayer.applyPositionUpdate(message);
    }
  }

  private handleHostAttack(message: PlayerAttackMessage): void {
    // Render visual projectile for host's attack
    if (!this.hostPlayer) return;

    // Validate angle is a number
    const angle = typeof message.angle === 'number' ? message.angle : 0;
    const projectile = this.scene.add.sprite(message.x, message.y, 'projectile_wand');
    projectile.setDepth(8);
    projectile.setRotation(angle);

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

    // Visual feedback on host player
    this.hostPlayer.applyAttack(message);
  }

  private handleEnemyUpdate(message: EnemyUpdateMessage): void {
    // Debug: log when receiving enemy updates
    if (message.enemies.length > 0 && this.guestEnemies.size === 0) {
      console.log('[GuestController] First enemy update received:', message.enemies.length, 'enemies');
    }

    const seenIds = new Set<string>();

    for (const enemyData of message.enemies) {
      seenIds.add(enemyData.id);

      let guestEnemy = this.guestEnemies.get(enemyData.id);

      if (!guestEnemy) {
        // Validate texture exists before creating sprite
        const textureKey = this.scene.textures.exists(enemyData.texture)
          ? enemyData.texture
          : 'enemy'; // Fallback to default enemy texture

        // Create new enemy sprite with correct texture
        const sprite = this.scene.physics.add.sprite(
          enemyData.x,
          enemyData.y,
          textureKey
        );
        sprite.setDepth(5);
        sprite.setPipeline('Light2D');

        // Enable physics body with proper size for collisions
        if (sprite.body) {
          const body = sprite.body as Phaser.Physics.Arcade.Body;
          body.setSize(16, 16);
          body.setOffset(
            (sprite.width - 16) / 2,
            (sprite.height - 16) / 2
          );
          body.setImmovable(false);
        }

        // Store enemy data on the sprite for collision handling
        sprite.setData('enemyId', enemyData.id);
        sprite.setData('hp', enemyData.hp);
        sprite.setData('maxHp', enemyData.maxHp);

        // Create health bar
        const healthBar = this.createHealthBar(enemyData.x, enemyData.y);

        guestEnemy = {
          sprite,
          healthBar,
          id: enemyData.id,
          hp: enemyData.hp,
          maxHp: enemyData.maxHp,
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
      guestEnemy.maxHp = enemyData.maxHp;

      // Update sprite data for collision handling
      guestEnemy.sprite.setData('hp', enemyData.hp);
      guestEnemy.sprite.setData('maxHp', enemyData.maxHp);

      // Update health bar position and width
      this.updateHealthBar(guestEnemy);

      // Visual feedback for dead enemies
      if (enemyData.hp <= 0) {
        guestEnemy.sprite.setAlpha(0);
        guestEnemy.healthBar.setVisible(false);
      }
    }

    // Remove enemies that weren't in the update
    for (const [id, guestEnemy] of this.guestEnemies.entries()) {
      if (!seenIds.has(id)) {
        guestEnemy.sprite.destroy();
        guestEnemy.healthBar.destroy();
        this.guestEnemies.delete(id);
      }
    }
  }

  private createHealthBar(x: number, y: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y - 15);
    container.setDepth(50);

    const bg = this.scene.add.rectangle(0, 0, 20, 4, 0x333333);
    const bar = this.scene.add.rectangle(-10, 0, 20, 4, 0x22cc22);
    bar.setOrigin(0, 0.5);
    bar.setName('bar');

    container.add([bg, bar]);
    return container;
  }

  private updateHealthBar(guestEnemy: GuestEnemy): void {
    guestEnemy.healthBar.setPosition(guestEnemy.sprite.x, guestEnemy.sprite.y - 15);

    const bar = guestEnemy.healthBar.getByName('bar') as Phaser.GameObjects.Rectangle;
    if (bar) {
      // Prevent division by zero
      const percent = guestEnemy.maxHp > 0 ? guestEnemy.hp / guestEnemy.maxHp : 0;
      bar.width = 20 * Math.max(0, percent);

      // Color based on health
      if (percent > 0.5) bar.setFillStyle(0x22cc22);
      else if (percent > 0.25) bar.setFillStyle(0xcccc22);
      else bar.setFillStyle(0xcc2222);
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
    try {
      this.player.inventory.deserialize(message.inventorySerialized);
      this.player.gold = message.gold;
      this.player.recalculateStats();
    } catch (error) {
      console.error('[GuestController] Failed to deserialize inventory:', error);
    }
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

  private handleRoomActivated(message: RoomActivatedMessage): void {
    // Mark the room as visited by host
    this.visitedRoomIds.add(message.roomId);
    this.lastSafeX = message.hostX;
    this.lastSafeY = message.hostY;

    // Teleport guest player to host position when room is activated
    this.player.setPosition(message.hostX + 20, message.hostY);
    this.player.setVelocity(0, 0);

    // Visual feedback for teleport - with safe cleanup
    const flash = this.scene.add.circle(this.player.x, this.player.y, 30, 0x88aaff, 0.6);
    flash.setDepth(50);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => {
        if (flash && flash.active) {
          flash.destroy();
        }
      },
    });
  }

  private reconnectOverlay: Phaser.GameObjects.Container | null = null;
  private reconnectDotTimer: Phaser.Time.TimerEvent | null = null;

  private onHostDisconnected(): void {
    // Check if we're reconnecting or truly disconnected
    const state = networkManager.connectionState;

    if (state === 'reconnecting') {
      this.showReconnectingUI();
      return;
    }

    // If state is 'disconnected', show final disconnect message
    this.showDisconnectedUI();
  }

  private showReconnectingUI(): void {
    if (this.reconnectOverlay) return; // Already showing

    const width = this.scene.cameras.main.width;
    const height = this.scene.cameras.main.height;

    this.reconnectOverlay = this.scene.add.container(width / 2, height / 2);
    this.reconnectOverlay.setDepth(1000);
    this.reconnectOverlay.setScrollFactor(0);

    const bg = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.7);

    const text = this.scene.add.text(0, -20, 'Connection lost...', {
      fontSize: '24px',
      fontFamily: 'Cinzel',
      color: '#ffaa00',
    });
    text.setOrigin(0.5);

    const subtext = this.scene.add.text(0, 20, 'Attempting to reconnect', {
      fontSize: '14px',
      fontFamily: 'Roboto Mono',
      color: '#888888',
    });
    subtext.setOrigin(0.5);

    this.reconnectOverlay.add([bg, text, subtext]);

    // Animate dots - store timer reference for cleanup
    let dots = 0;
    this.reconnectDotTimer = this.scene.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        dots = (dots + 1) % 4;
        if (subtext && subtext.active) {
          subtext.setText('Attempting to reconnect' + '.'.repeat(dots));
        }
      },
    });

    // Listen for connection state changes
    networkManager.onConnectionStateChange((state) => {
      if (state === 'connected') {
        this.cleanupReconnectTimer();
        this.hideReconnectUI();
      } else if (state === 'disconnected') {
        this.cleanupReconnectTimer();
        this.hideReconnectUI();
        this.showDisconnectedUI();
      }
    });
  }

  private cleanupReconnectTimer(): void {
    if (this.reconnectDotTimer) {
      this.reconnectDotTimer.destroy();
      this.reconnectDotTimer = null;
    }
  }

  private hideReconnectUI(): void {
    if (this.reconnectOverlay) {
      this.reconnectOverlay.destroy();
      this.reconnectOverlay = null;
    }
  }

  private showDisconnectedUI(): void {
    this.hideReconnectUI();

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

    // Follow host - use smooth follow for better camera movement
    if (this.hostPlayer) {
      this.scene.cameras.main.startFollow(this.hostPlayer, true, 0.1, 0.1);
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

    // Update last safe position when host moves
    if (this.hostPlayer) {
      this.lastSafeX = this.hostPlayer.x;
      this.lastSafeY = this.hostPlayer.y;
    }

    // Room-based tethering: prevent guest from entering rooms host hasn't visited yet
    if (this.roomManager && !this.isSpectating) {
      const guestRoom = this.roomManager.getRoomAtPosition(this.player.x, this.player.y);

      if (guestRoom) {
        // Guest can only be in rooms that the host has visited
        const isRoomSafe = this.visitedRoomIds.has(guestRoom.id);

        if (!isRoomSafe) {
          // Teleport back to last safe position (near host)
          this.player.setPosition(this.lastSafeX + 20, this.lastSafeY);
          this.player.setVelocity(0, 0);
        }
      }
    }

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
      guestEnemy.healthBar.destroy();
    }
    this.guestEnemies.clear();

    if (this.spectateOverlay) {
      this.spectateOverlay.destroy();
      this.spectateOverlay = null;
    }

    if (this.reconnectOverlay) {
      this.reconnectOverlay.destroy();
      this.reconnectOverlay = null;
    }
  }

  destroy(): void {
    // Clean up message listener to prevent memory leaks
    if (this.messageListenerId) {
      networkManager.offMessage(this.messageListenerId);
      this.messageListenerId = null;
    }

    // Clean up connection state callback to prevent ghost callbacks
    networkManager.offConnectionStateChange();

    // Clean up peer leave callback
    networkManager.clearOnPeerLeave();

    // Clean up reconnect timer
    this.cleanupReconnectTimer();

    this.cleanup();
  }
}
