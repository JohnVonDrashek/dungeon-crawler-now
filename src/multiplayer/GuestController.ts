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
  EnemyDeathMessage,
  LootSpawnMessage,
  LootTakenMessage,
  DamageNumberMessage,
  ComboUpdateMessage,
  KillFeedEntry,
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
  // For smoother interpolation
  targetX: number;
  targetY: number;
  lastUpdateTime: number;
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

  // Kill feed for co-op UI
  private killFeed: KillFeedEntry[] = [];
  private readonly KILL_FEED_MAX_ENTRIES = 5;
  private readonly KILL_FEED_DURATION_MS = 5000;

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
      case MessageType.ENEMY_DEATH:
        this.handleEnemyDeath(message as EnemyDeathMessage);
        break;
      case MessageType.LOOT_SPAWN:
        this.handleLootSpawn(message as LootSpawnMessage);
        break;
      case MessageType.DAMAGE_NUMBER:
        this.handleDamageNumber(message as DamageNumberMessage);
        break;
      case MessageType.LOOT_TAKEN:
        this.handleLootTaken(message as LootTakenMessage);
        break;
      case MessageType.COMBO_UPDATE:
        this.handleComboUpdate(message as ComboUpdateMessage);
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
    if (!this.hostPlayer || !this.scene) return;

    // Validate position values
    const x = typeof message.x === 'number' && !isNaN(message.x) ? message.x : this.hostPlayer.x;
    const y = typeof message.y === 'number' && !isNaN(message.y) ? message.y : this.hostPlayer.y;

    // Validate angle is a number
    const angle = typeof message.angle === 'number' && !isNaN(message.angle) ? message.angle : 0;
    const projectile = this.scene.add.sprite(x, y, 'projectile_wand');
    projectile.setDepth(8);
    projectile.setRotation(angle);

    // Animate projectile moving in direction
    const speed = 300;
    const duration = 500;
    this.scene.tweens.add({
      targets: projectile,
      x: x + Math.cos(angle) * speed,
      y: y + Math.sin(angle) * speed,
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
    // Scene safety check - required for sprite creation
    if (!this.scene || !this.scene.physics || !this.scene.textures) return;

    // Debug: log when receiving enemy updates
    if (message.enemies.length > 0 && this.guestEnemies.size === 0) {
      console.log('[GuestController] First enemy update received:', message.enemies.length, 'enemies');
    }

    const seenIds = new Set<string>();

    for (const enemyData of message.enemies) {
      // Validate enemy data
      if (!enemyData.id || typeof enemyData.id !== 'string') continue;
      const x = typeof enemyData.x === 'number' && !isNaN(enemyData.x) ? enemyData.x : 0;
      const y = typeof enemyData.y === 'number' && !isNaN(enemyData.y) ? enemyData.y : 0;
      const hp = typeof enemyData.hp === 'number' && !isNaN(enemyData.hp) ? Math.max(0, enemyData.hp) : 0;
      const maxHp = typeof enemyData.maxHp === 'number' && enemyData.maxHp > 0 ? enemyData.maxHp : 100;

      seenIds.add(enemyData.id);

      let guestEnemy = this.guestEnemies.get(enemyData.id);

      if (!guestEnemy) {
        // Validate texture exists before creating sprite
        const textureKey = this.scene.textures.exists(enemyData.texture)
          ? enemyData.texture
          : 'enemy'; // Fallback to default enemy texture

        // Create new enemy sprite with correct texture
        const sprite = this.scene.physics.add.sprite(
          x,
          y,
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
        sprite.setData('hp', hp);
        sprite.setData('maxHp', maxHp);

        // Create health bar
        const healthBar = this.createHealthBar(x, y);

        guestEnemy = {
          sprite,
          healthBar,
          id: enemyData.id,
          hp,
          maxHp,
          targetX: x,
          targetY: y,
          lastUpdateTime: Date.now(),
        };
        this.guestEnemies.set(enemyData.id, guestEnemy);
      }

      // Store target position for smooth interpolation in update()
      guestEnemy.targetX = x;
      guestEnemy.targetY = y;
      guestEnemy.lastUpdateTime = Date.now();
      guestEnemy.hp = hp;
      guestEnemy.maxHp = maxHp;

      // Update sprite data for collision handling
      guestEnemy.sprite.setData('hp', hp);
      guestEnemy.sprite.setData('maxHp', maxHp);

      // Update health bar position and width
      this.updateHealthBar(guestEnemy);

      // Visual feedback for dead enemies
      if (hp <= 0) {
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
    // Validate incoming values
    const maxHp = typeof message.maxHp === 'number' && message.maxHp > 0 ? message.maxHp : 100;
    const level = typeof message.level === 'number' && message.level > 0 ? message.level : 1;
    const gold = typeof message.gold === 'number' && message.gold >= 0 ? message.gold : 0;

    // Update helper stats based on host
    const ratio = 0.75;
    this.player.maxHp = Math.floor(maxHp * ratio);
    this.player.hp = Math.min(this.player.hp, this.player.maxHp);
    this.player.level = level;
    this.player.gold = gold;
  }

  private handleInventoryUpdate(message: InventoryUpdateMessage): void {
    try {
      this.player.inventory.deserialize(message.inventorySerialized);
      // Validate gold value
      const gold = typeof message.gold === 'number' && message.gold >= 0 ? message.gold : 0;
      this.player.gold = gold;
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

    // Show notification for guest
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

  private handlePlayerDied(message: PlayerDiedMessage): void {
    // If it's us, enter spectate mode
    if (message.playerId === networkManager.peerId) {
      this.enterSpectateMode();
    }
  }

  private handlePlayerRevive(message: PlayerReviveMessage): void {
    if (message.playerId === networkManager.peerId) {
      // Validate position values
      const x = typeof message.x === 'number' && !isNaN(message.x) ? message.x : this.player.x;
      const y = typeof message.y === 'number' && !isNaN(message.y) ? message.y : this.player.y;

      this.exitSpectateMode();
      this.player.setPosition(x, y);
      this.player.hp = this.player.maxHp;
    }
  }

  // Valid scene names that can be transitioned to
  private static readonly VALID_SCENES = new Set([
    'GameScene',
    'HubScene',
    'MenuScene',
    'ShopScene',
    'VictoryScene',
    'GameOverScene',
  ]);

  private handleSceneChange(message: SceneChangeMessage): void {
    // Validate scene name to prevent arbitrary scene transitions
    if (!message.sceneName || !GuestController.VALID_SCENES.has(message.sceneName)) {
      console.warn('[GuestController] Invalid scene name:', message.sceneName);
      return;
    }

    this.cleanup();
    if (this.scene && this.scene.scene) {
      this.scene.scene.start(message.sceneName, message.data);
    }
  }

  private handleRoomActivated(message: RoomActivatedMessage): void {
    // Validate position values
    const hostX = typeof message.hostX === 'number' && !isNaN(message.hostX) ? message.hostX : this.player.x;
    const hostY = typeof message.hostY === 'number' && !isNaN(message.hostY) ? message.hostY : this.player.y;
    const roomId = typeof message.roomId === 'number' ? message.roomId : 0;

    // Mark the room as visited by host
    this.visitedRoomIds.add(roomId);
    this.lastSafeX = hostX;
    this.lastSafeY = hostY;

    // Teleport guest player to host position when room is activated
    this.player.setPosition(hostX + 20, hostY);
    this.player.setVelocity(0, 0);

    // Visual feedback for teleport - with safe cleanup
    if (!this.scene || !this.scene.add || !this.scene.tweens) return;
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

  private handleEnemyDeath(message: EnemyDeathMessage): void {
    if (!this.scene || !this.scene.add || !this.scene.tweens) return;

    // Remove enemy from our tracking
    const guestEnemy = this.guestEnemies.get(message.id);
    if (guestEnemy) {
      // Death animation matching host's visual effects
      this.scene.tweens.add({
        targets: guestEnemy.sprite,
        alpha: 0,
        scale: 0.5,
        duration: 200,
        onComplete: () => {
          if (guestEnemy.sprite && guestEnemy.sprite.active) {
            guestEnemy.sprite.destroy();
          }
          if (guestEnemy.healthBar && guestEnemy.healthBar.active) {
            guestEnemy.healthBar.destroy();
          }
        },
      });

      this.guestEnemies.delete(message.id);
    }

    // Spawn death particles at the location
    this.spawnDeathParticles(message.x, message.y);

    // Add to kill feed
    this.addKillFeedEntry(message.killerPlayerId, message.enemyType);

    // Emit event for local UI
    this.scene.events.emit('killFeedEntry', message.killerPlayerId, message.enemyType);
  }

  private spawnDeathParticles(x: number, y: number): void {
    if (!this.scene || !this.scene.add) return;

    // Create simple death effect with sprites
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const particle = this.scene.add.circle(x, y, 3, 0xff4444, 0.8);
      particle.setDepth(50);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * 30,
        y: y + Math.sin(angle) * 30,
        alpha: 0,
        scale: 0.3,
        duration: 300,
        onComplete: () => {
          if (particle && particle.active) {
            particle.destroy();
          }
        },
      });
    }
  }

  private handleLootSpawn(message: LootSpawnMessage): void {
    if (!this.scene || !this.scene.add) return;

    // Parse loot data
    let lootInfo: { type: string; data: string };
    try {
      lootInfo = JSON.parse(message.itemData);
    } catch {
      console.warn('[GuestController] Failed to parse loot data');
      return;
    }

    // Create visual loot indicator for guest (simplified visual)
    const lootGlow = this.scene.add.circle(message.x, message.y, 10, 0xffdd44, 0.6);
    lootGlow.setDepth(4);

    // Floating animation
    this.scene.tweens.add({
      targets: lootGlow,
      y: message.y - 5,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pulse animation
    this.scene.tweens.add({
      targets: lootGlow,
      alpha: 0.9,
      scale: 1.2,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Store loot reference with ID for potential sync
    lootGlow.setData('lootId', message.id);
    lootGlow.setData('lootType', lootInfo.type);
  }

  private addKillFeedEntry(killerPlayerId: string, enemyType: string): void {
    const entry: KillFeedEntry = {
      killerPlayerId,
      enemyType,
      timestamp: Date.now(),
    };

    this.killFeed.unshift(entry);

    // Limit entries
    if (this.killFeed.length > this.KILL_FEED_MAX_ENTRIES) {
      this.killFeed.pop();
    }

    // Auto-remove old entries
    setTimeout(() => {
      const index = this.killFeed.indexOf(entry);
      if (index !== -1) {
        this.killFeed.splice(index, 1);
      }
    }, this.KILL_FEED_DURATION_MS);
  }

  getKillFeed(): KillFeedEntry[] {
    return this.killFeed;
  }

  private handleLootTaken(message: LootTakenMessage): void {
    if (!this.scene || !this.scene.add) return;

    // Find and remove the loot glow indicator
    // Note: In a full implementation, we'd track loot sprites by ID
    // For now, just show a notification

    const isHost = message.playerId === 'host';
    const playerName = isHost ? 'Host' : 'You';
    const color = isHost ? '#88ff88' : '#88aaff';

    // Show pickup notification at top of screen
    const cam = this.scene.cameras.main;
    const text = this.scene.add.text(cam.width / 2, 100, `${playerName} picked up loot!`, {
      fontSize: '12px',
      fontFamily: 'Roboto Mono, monospace',
      color: color,
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(100);
    text.setAlpha(0);

    // Animate
    this.scene.tweens.add({
      targets: text,
      alpha: 1,
      y: 90,
      duration: 200,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        this.scene.time.delayedCall(1500, () => {
          this.scene.tweens.add({
            targets: text,
            alpha: 0,
            y: 80,
            duration: 300,
            onComplete: () => {
              if (text && text.active) text.destroy();
            },
          });
        });
      },
    });
  }

  private handleDamageNumber(message: DamageNumberMessage): void {
    if (!this.scene || !this.scene.add) return;

    // Validate position
    const x = typeof message.x === 'number' && !isNaN(message.x) ? message.x : 0;
    const y = typeof message.y === 'number' && !isNaN(message.y) ? message.y : 0;
    const damage = typeof message.damage === 'number' && !isNaN(message.damage) ? Math.floor(message.damage) : 0;

    // Create damage number text
    const color = message.isPlayerDamage ? '#ff4444' : '#ffff44';
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

  private handleComboUpdate(message: ComboUpdateMessage): void {
    if (!this.scene || !this.scene.add) return;

    // Validate message data
    const count = typeof message.count === 'number' && message.count >= 2 ? message.count : 2;
    const killer = typeof message.lastKiller === 'string' ? message.lastKiller : 'host';
    const x = typeof message.x === 'number' && !isNaN(message.x) ? message.x : 0;
    const y = typeof message.y === 'number' && !isNaN(message.y) ? message.y : 0;

    // Color based on who got the kill - for guest, swap colors
    // Guest sees their own kills as gold, host kills as green
    const color = killer === 'guest' ? '#ffdd44' : '#88ff88';
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
    if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) return;

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
    if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) return;

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

    // Capture scene reference for delayed callback
    const sceneRef = this.scene;
    this.scene.time.delayedCall(2000, () => {
      networkManager.disconnect();
      if (sceneRef && sceneRef.scene) {
        sceneRef.scene.start('MenuScene');
      }
    });
  }

  private enterSpectateMode(): void {
    this.isSpectating = true;
    this.player.setAlpha(0.3);
    this.player.setActive(false);

    if (!this.scene || !this.scene.cameras || !this.scene.cameras.main) return;
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
    if (this.scene && this.scene.cameras && this.scene.cameras.main) {
      this.scene.cameras.main.startFollow(this.player);
    }
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

    // Smooth interpolation for all guest enemies
    this.updateEnemyInterpolation();
  }

  private updateEnemyInterpolation(): void {
    const now = Date.now();
    const expectedUpdateInterval = 50; // Host sends updates every 50ms

    for (const guestEnemy of this.guestEnemies.values()) {
      if (!guestEnemy.sprite || !guestEnemy.sprite.active) continue;

      // Calculate time-based interpolation factor
      const timeSinceUpdate = now - guestEnemy.lastUpdateTime;
      // Use aggressive lerp to catch up, but cap it to prevent overshooting
      const lerpFactor = Math.min(timeSinceUpdate / expectedUpdateInterval * 0.15, 0.4);

      // Smooth interpolation toward target
      guestEnemy.sprite.x = Phaser.Math.Linear(
        guestEnemy.sprite.x,
        guestEnemy.targetX,
        lerpFactor
      );
      guestEnemy.sprite.y = Phaser.Math.Linear(
        guestEnemy.sprite.y,
        guestEnemy.targetY,
        lerpFactor
      );

      // Update health bar position
      this.updateHealthBar(guestEnemy);
    }
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
