# Multiplayer Co-op Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add browser-to-browser co-op multiplayer using Trystero P2P, where one player hosts and another joins as a helper.

**Architecture:** Host generates dungeon and runs enemy AI, broadcasting state to guest. Guest receives state and renders it. Each player owns their own movement and attacks. Shared inventory with helper stats scaled to 75% of host.

**Tech Stack:** Phaser 3, TypeScript, Trystero (WebRTC P2P)

---

## Task 1: Install Trystero Dependency

**Files:**
- Modify: `package.json`

**Step 1: Install trystero**

```bash
npm install trystero
```

**Step 2: Verify build still works**

```bash
npm run build
```

Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add trystero dependency for P2P multiplayer"
```

---

## Task 2: Create Message Type Definitions

**Files:**
- Create: `src/multiplayer/SyncMessages.ts`

**Step 1: Create the multiplayer directory**

```bash
mkdir -p src/multiplayer
```

**Step 2: Create SyncMessages.ts with all message types**

```typescript
// src/multiplayer/SyncMessages.ts

export enum MessageType {
  // Host -> Guest
  ROOM_DATA = 'ROOM_DATA',
  ENEMY_SPAWN = 'ENEMY_SPAWN',
  ENEMY_UPDATE = 'ENEMY_UPDATE',
  ENEMY_DEATH = 'ENEMY_DEATH',
  LOOT_SPAWN = 'LOOT_SPAWN',
  LOOT_TAKEN = 'LOOT_TAKEN',
  ROOM_CLEAR = 'ROOM_CLEAR',
  PLAYER_DIED = 'PLAYER_DIED',
  PLAYER_REVIVE = 'PLAYER_REVIVE',
  INVENTORY_UPDATE = 'INVENTORY_UPDATE',
  SCENE_CHANGE = 'SCENE_CHANGE',
  HOST_STATE = 'HOST_STATE',

  // Both directions
  PLAYER_POS = 'PLAYER_POS',
  PLAYER_ATTACK = 'PLAYER_ATTACK',
  PLAYER_HIT = 'PLAYER_HIT',
  PICKUP = 'PICKUP',
  EQUIP_ITEM = 'EQUIP_ITEM',
  USE_ITEM = 'USE_ITEM',
}

export interface PlayerPosMessage {
  type: MessageType.PLAYER_POS;
  x: number;
  y: number;
  facing: string;
  animState: string;
  isMoving: boolean;
}

export interface PlayerAttackMessage {
  type: MessageType.PLAYER_ATTACK;
  attackType: string;
  direction: string;
  x: number;
  y: number;
}

export interface PlayerHitMessage {
  type: MessageType.PLAYER_HIT;
  enemyId: string;
  damage: number;
}

export interface EnemySpawnMessage {
  type: MessageType.ENEMY_SPAWN;
  id: string;
  enemyType: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

export interface EnemyUpdateMessage {
  type: MessageType.ENEMY_UPDATE;
  enemies: Array<{
    id: string;
    x: number;
    y: number;
    hp: number;
    state: string;
    facing: string;
  }>;
}

export interface EnemyDeathMessage {
  type: MessageType.ENEMY_DEATH;
  id: string;
  killerPlayerId: string;
}

export interface LootSpawnMessage {
  type: MessageType.LOOT_SPAWN;
  id: string;
  itemData: string; // Serialized item
  x: number;
  y: number;
}

export interface LootTakenMessage {
  type: MessageType.LOOT_TAKEN;
  id: string;
  playerId: string;
}

export interface RoomDataMessage {
  type: MessageType.ROOM_DATA;
  dungeonData: string; // Serialized dungeon
  currentRoomIndex: number;
  hostX: number;
  hostY: number;
}

export interface RoomClearMessage {
  type: MessageType.ROOM_CLEAR;
  roomIndex: number;
}

export interface PlayerDiedMessage {
  type: MessageType.PLAYER_DIED;
  playerId: string;
}

export interface PlayerReviveMessage {
  type: MessageType.PLAYER_REVIVE;
  playerId: string;
  x: number;
  y: number;
}

export interface InventoryUpdateMessage {
  type: MessageType.INVENTORY_UPDATE;
  inventorySerialized: string;
  gold: number;
}

export interface SceneChangeMessage {
  type: MessageType.SCENE_CHANGE;
  sceneName: string;
  data?: Record<string, unknown>;
}

export interface HostStateMessage {
  type: MessageType.HOST_STATE;
  hp: number;
  maxHp: number;
  level: number;
  gold: number;
}

export interface PickupMessage {
  type: MessageType.PICKUP;
  lootId: string;
}

export interface EquipItemMessage {
  type: MessageType.EQUIP_ITEM;
  itemId: string;
  slot: string;
}

export interface UseItemMessage {
  type: MessageType.USE_ITEM;
  itemId: string;
}

export type SyncMessage =
  | PlayerPosMessage
  | PlayerAttackMessage
  | PlayerHitMessage
  | EnemySpawnMessage
  | EnemyUpdateMessage
  | EnemyDeathMessage
  | LootSpawnMessage
  | LootTakenMessage
  | RoomDataMessage
  | RoomClearMessage
  | PlayerDiedMessage
  | PlayerReviveMessage
  | InventoryUpdateMessage
  | SceneChangeMessage
  | HostStateMessage
  | PickupMessage
  | EquipItemMessage
  | UseItemMessage;
```

**Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/multiplayer/SyncMessages.ts
git commit -m "feat(multiplayer): add message type definitions"
```

---

## Task 3: Create NetworkManager Core

**Files:**
- Create: `src/multiplayer/NetworkManager.ts`

**Step 1: Create NetworkManager with Trystero integration**

```typescript
// src/multiplayer/NetworkManager.ts

import { joinRoom, Room, selfId } from 'trystero';
import { SyncMessage, MessageType } from './SyncMessages';

export type ConnectionState = 'disconnected' | 'connecting' | 'waiting' | 'connected';

export class NetworkManager {
  private static instance: NetworkManager | null = null;

  private room: Room | null = null;
  private sendMessage: ((data: SyncMessage, peerId?: string) => void) | null = null;
  private getMessage: ((callback: (data: SyncMessage, peerId: string) => void) => void) | null = null;

  private _isHost: boolean = false;
  private _isConnected: boolean = false;
  private _connectionState: ConnectionState = 'disconnected';
  private _peerId: string | null = null;
  private _roomCode: string | null = null;

  private onPeerJoinCallback: ((peerId: string) => void) | null = null;
  private onPeerLeaveCallback: ((peerId: string) => void) | null = null;
  private onMessageCallback: ((message: SyncMessage, peerId: string) => void) | null = null;
  private onConnectionStateChangeCallback: ((state: ConnectionState) => void) | null = null;

  private constructor() {}

  static getInstance(): NetworkManager {
    if (!NetworkManager.instance) {
      NetworkManager.instance = new NetworkManager();
    }
    return NetworkManager.instance;
  }

  get isHost(): boolean {
    return this._isHost;
  }

  get isGuest(): boolean {
    return !this._isHost && this._isConnected;
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  get isMultiplayer(): boolean {
    return this.room !== null;
  }

  get connectionState(): ConnectionState {
    return this._connectionState;
  }

  get peerId(): string | null {
    return this._peerId;
  }

  get roomCode(): string | null {
    return this._roomCode;
  }

  private setConnectionState(state: ConnectionState): void {
    this._connectionState = state;
    this.onConnectionStateChangeCallback?.(state);
  }

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0/O, 1/I)
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async hostGame(): Promise<string> {
    this._roomCode = this.generateRoomCode();
    this._isHost = true;
    this.setConnectionState('connecting');

    try {
      this.room = joinRoom({ appId: 'infernal-ascent-coop' }, this._roomCode);
      this._peerId = selfId;

      const [sendMessage, getMessage] = this.room.makeAction<SyncMessage>('sync');
      this.sendMessage = sendMessage;
      this.getMessage = getMessage;

      getMessage((data, peerId) => {
        this.onMessageCallback?.(data, peerId);
      });

      this.room.onPeerJoin((peerId) => {
        this._isConnected = true;
        this.setConnectionState('connected');
        this.onPeerJoinCallback?.(peerId);
      });

      this.room.onPeerLeave((peerId) => {
        this._isConnected = false;
        this.setConnectionState('waiting');
        this.onPeerLeaveCallback?.(peerId);
      });

      this.setConnectionState('waiting');
      return this._roomCode;
    } catch (error) {
      this.setConnectionState('disconnected');
      throw error;
    }
  }

  async joinGame(roomCode: string): Promise<void> {
    this._roomCode = roomCode.toUpperCase();
    this._isHost = false;
    this.setConnectionState('connecting');

    try {
      this.room = joinRoom({ appId: 'infernal-ascent-coop' }, this._roomCode);
      this._peerId = selfId;

      const [sendMessage, getMessage] = this.room.makeAction<SyncMessage>('sync');
      this.sendMessage = sendMessage;
      this.getMessage = getMessage;

      getMessage((data, peerId) => {
        this.onMessageCallback?.(data, peerId);
      });

      this.room.onPeerJoin((peerId) => {
        this._isConnected = true;
        this.setConnectionState('connected');
        this.onPeerJoinCallback?.(peerId);
      });

      this.room.onPeerLeave((peerId) => {
        this._isConnected = false;
        this.setConnectionState('disconnected');
        this.onPeerLeaveCallback?.(peerId);
      });

      // Wait for connection with timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, 15000);

        this.room!.onPeerJoin(() => {
          clearTimeout(timeout);
          resolve();
        });
      });
    } catch (error) {
      this.setConnectionState('disconnected');
      this.disconnect();
      throw error;
    }
  }

  send(message: SyncMessage, targetPeerId?: string): void {
    if (this.sendMessage && this.room) {
      this.sendMessage(message, targetPeerId);
    }
  }

  broadcast(message: SyncMessage): void {
    this.send(message);
  }

  onPeerJoin(callback: (peerId: string) => void): void {
    this.onPeerJoinCallback = callback;
  }

  onPeerLeave(callback: (peerId: string) => void): void {
    this.onPeerLeaveCallback = callback;
  }

  onMessage(callback: (message: SyncMessage, peerId: string) => void): void {
    this.onMessageCallback = callback;
  }

  onConnectionStateChange(callback: (state: ConnectionState) => void): void {
    this.onConnectionStateChangeCallback = callback;
  }

  disconnect(): void {
    if (this.room) {
      this.room.leave();
      this.room = null;
    }
    this.sendMessage = null;
    this.getMessage = null;
    this._isHost = false;
    this._isConnected = false;
    this._peerId = null;
    this._roomCode = null;
    this.setConnectionState('disconnected');
  }

  // Reset singleton for testing
  static reset(): void {
    if (NetworkManager.instance) {
      NetworkManager.instance.disconnect();
      NetworkManager.instance = null;
    }
  }
}

// Export singleton instance
export const networkManager = NetworkManager.getInstance();
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/multiplayer/NetworkManager.ts
git commit -m "feat(multiplayer): add NetworkManager with Trystero integration"
```

---

## Task 4: Create PlayerSync for Position Broadcasting

**Files:**
- Create: `src/multiplayer/PlayerSync.ts`

**Step 1: Create PlayerSync class**

```typescript
// src/multiplayer/PlayerSync.ts

import { networkManager } from './NetworkManager';
import { MessageType, PlayerPosMessage, PlayerAttackMessage, PlayerHitMessage } from './SyncMessages';
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
    const isMoving = this.player.body?.velocity.x !== 0 || this.player.body?.velocity.y !== 0;

    // Only send if position changed meaningfully
    const dx = Math.abs(x - this.lastSentX);
    const dy = Math.abs(y - this.lastSentY);
    const facingChanged = facing !== this.lastSentFacing;

    if (dx > this.POSITION_THRESHOLD || dy > this.POSITION_THRESHOLD || facingChanged) {
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
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/multiplayer/PlayerSync.ts
git commit -m "feat(multiplayer): add PlayerSync for position broadcasting"
```

---

## Task 5: Create RemotePlayer Entity

**Files:**
- Create: `src/multiplayer/RemotePlayer.ts`

**Step 1: Create RemotePlayer class for rendering the other player**

```typescript
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

  applyAttack(message: PlayerAttackMessage): void {
    // Visual feedback for remote player attacking
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
    this.scene.time.delayedCall(200, () => {
      if (!this.isDead) {
        this.setTint(0x88aaff);
      }
    });

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
    super.destroy(fromScene);
  }
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/multiplayer/RemotePlayer.ts
git commit -m "feat(multiplayer): add RemotePlayer entity for other player"
```

---

## Task 6: Add Co-op Buttons to MenuScene

**Files:**
- Modify: `src/scenes/MenuScene.ts`

**Step 1: Add import for NetworkManager**

At top of file, add:

```typescript
import { networkManager } from '../multiplayer/NetworkManager';
```

**Step 2: Add Host Co-op and Join Co-op buttons**

In `createMenu` method, after the Settings button creation, add:

```typescript
    nextButtonY += buttonSpacing;

    // Host Co-op button
    this.createButton(width / 2, nextButtonY, 'Host Co-op', () => {
      this.showHostingUI();
    });

    nextButtonY += buttonSpacing;

    // Join Co-op button
    this.createButton(width / 2, nextButtonY, 'Join Co-op', () => {
      this.showJoinUI();
    });
```

**Step 3: Add hosting UI method**

Add new method to MenuScene class:

```typescript
  private showHostingUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setDepth(100);

    const container = this.add.container(width / 2, height / 2);
    container.setDepth(101);

    const title = this.add.text(0, -80, 'HOSTING GAME', {
      fontSize: '24px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ff8844',
    });
    title.setOrigin(0.5);

    const statusText = this.add.text(0, -20, 'Creating room...', {
      fontSize: '16px',
      fontFamily: 'Roboto Mono',
      color: '#888888',
    });
    statusText.setOrigin(0.5);

    const codeText = this.add.text(0, 30, '', {
      fontSize: '32px',
      fontFamily: 'Roboto Mono',
      color: '#ffffff',
      letterSpacing: 8,
    });
    codeText.setOrigin(0.5);

    const cancelBtn = this.add.text(0, 100, '[ Cancel ]', {
      fontSize: '14px',
      fontFamily: 'Roboto Mono',
      color: '#666666',
    });
    cancelBtn.setOrigin(0.5);
    cancelBtn.setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerover', () => cancelBtn.setColor('#ff4444'));
    cancelBtn.on('pointerout', () => cancelBtn.setColor('#666666'));
    cancelBtn.on('pointerdown', () => {
      networkManager.disconnect();
      container.destroy();
      overlay.destroy();
    });

    container.add([title, statusText, codeText, cancelBtn]);

    // Start hosting
    networkManager.hostGame().then((code) => {
      codeText.setText(code);
      statusText.setText('Share this code with a friend:');

      networkManager.onPeerJoin(() => {
        statusText.setText('Player joined! Starting...');
        this.time.delayedCall(1000, () => {
          container.destroy();
          overlay.destroy();
          this.scene.start('HubScene');
        });
      });
    }).catch((error) => {
      statusText.setText('Failed to create room');
      console.error('Host error:', error);
    });
  }
```

**Step 4: Add join UI method**

Add new method to MenuScene class:

```typescript
  private showJoinUI(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // Create overlay
    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.8);
    overlay.setDepth(100);

    const container = this.add.container(width / 2, height / 2);
    container.setDepth(101);

    const title = this.add.text(0, -80, 'JOIN GAME', {
      fontSize: '24px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#88aaff',
    });
    title.setOrigin(0.5);

    const prompt = this.add.text(0, -30, 'Enter room code:', {
      fontSize: '14px',
      fontFamily: 'Roboto Mono',
      color: '#888888',
    });
    prompt.setOrigin(0.5);

    // Code input display
    let enteredCode = '';
    const codeDisplay = this.add.text(0, 20, '______', {
      fontSize: '32px',
      fontFamily: 'Roboto Mono',
      color: '#ffffff',
      letterSpacing: 8,
    });
    codeDisplay.setOrigin(0.5);

    const statusText = this.add.text(0, 70, '', {
      fontSize: '12px',
      fontFamily: 'Roboto Mono',
      color: '#ff4444',
    });
    statusText.setOrigin(0.5);

    const cancelBtn = this.add.text(0, 110, '[ Cancel ]', {
      fontSize: '14px',
      fontFamily: 'Roboto Mono',
      color: '#666666',
    });
    cancelBtn.setOrigin(0.5);
    cancelBtn.setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerover', () => cancelBtn.setColor('#ff4444'));
    cancelBtn.on('pointerout', () => cancelBtn.setColor('#666666'));
    cancelBtn.on('pointerdown', () => {
      this.input.keyboard?.off('keydown');
      container.destroy();
      overlay.destroy();
    });

    container.add([title, prompt, codeDisplay, statusText, cancelBtn]);

    // Keyboard input
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.input.keyboard?.off('keydown');
        container.destroy();
        overlay.destroy();
        return;
      }

      if (event.key === 'Backspace' && enteredCode.length > 0) {
        enteredCode = enteredCode.slice(0, -1);
      } else if (event.key.length === 1 && enteredCode.length < 6) {
        const char = event.key.toUpperCase();
        if (/[A-Z0-9]/.test(char)) {
          enteredCode += char;
        }
      }

      // Update display
      const displayCode = enteredCode.padEnd(6, '_');
      codeDisplay.setText(displayCode);

      // Auto-join when 6 characters entered
      if (enteredCode.length === 6) {
        this.input.keyboard?.off('keydown');
        statusText.setText('Connecting...');
        statusText.setColor('#888888');

        networkManager.joinGame(enteredCode).then(() => {
          statusText.setText('Connected! Joining...');
          statusText.setColor('#44ff44');
          this.time.delayedCall(500, () => {
            container.destroy();
            overlay.destroy();
            this.scene.start('HubScene');
          });
        }).catch((error) => {
          statusText.setText('Could not find room');
          statusText.setColor('#ff4444');
          enteredCode = '';
          codeDisplay.setText('______');
          console.error('Join error:', error);

          // Re-enable keyboard input
          this.time.delayedCall(1000, () => {
            this.input.keyboard?.on('keydown', arguments.callee);
          });
        });
      }
    });
  }
```

**Step 5: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 6: Test manually**

```bash
npm run dev
```

Open browser, verify:
- "Host Co-op" and "Join Co-op" buttons appear
- Clicking "Host Co-op" shows hosting UI with a room code
- Clicking "Join Co-op" shows code entry UI

**Step 7: Commit**

```bash
git add src/scenes/MenuScene.ts
git commit -m "feat(multiplayer): add Host/Join Co-op buttons to menu"
```

---

## Task 7: Create HostController

**Files:**
- Create: `src/multiplayer/HostController.ts`

**Step 1: Create HostController class**

```typescript
// src/multiplayer/HostController.ts

import Phaser from 'phaser';
import { networkManager } from './NetworkManager';
import {
  MessageType,
  SyncMessage,
  EnemyUpdateMessage,
  RoomDataMessage,
  InventoryUpdateMessage,
  HostStateMessage,
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
  private remotePlayer: RemotePlayer | null = null;
  private enemies: Phaser.Physics.Arcade.Group;
  private enemyIdMap: Map<Enemy, string> = new Map();
  private nextEnemyId: number = 0;

  private lastEnemyUpdateTime: number = 0;
  private readonly ENEMY_UPDATE_INTERVAL_MS = 50;

  constructor(
    scene: Phaser.Scene,
    player: Player,
    enemies: Phaser.Physics.Arcade.Group
  ) {
    this.scene = scene;
    this.player = player;
    this.enemies = enemies;

    this.setupMessageHandlers();
  }

  private setupMessageHandlers(): void {
    networkManager.onMessage((message, peerId) => {
      this.handleMessage(message, peerId);
    });

    networkManager.onPeerJoin((peerId) => {
      this.onGuestJoined(peerId);
    });

    networkManager.onPeerLeave((peerId) => {
      this.onGuestLeft(peerId);
    });
  }

  private handleMessage(message: SyncMessage, peerId: string): void {
    switch (message.type) {
      case MessageType.PLAYER_POS:
        this.handleGuestPosition(message as PlayerPosMessage);
        break;
      case MessageType.PLAYER_HIT:
        this.handleGuestHit(message as PlayerHitMessage);
        break;
      case MessageType.PICKUP:
        this.handleGuestPickup(message as PickupMessage);
        break;
    }
  }

  private onGuestJoined(peerId: string): void {
    // Create remote player for guest
    this.remotePlayer = new RemotePlayer(
      this.scene,
      this.player.x + 50,
      this.player.y,
      true // is helper
    );

    // Send initial state to guest
    this.sendHostState();
    this.sendInventoryUpdate();
  }

  private onGuestLeft(peerId: string): void {
    if (this.remotePlayer) {
      this.remotePlayer.destroy();
      this.remotePlayer = null;
    }
  }

  private handleGuestPosition(message: PlayerPosMessage): void {
    if (this.remotePlayer) {
      this.remotePlayer.applyPositionUpdate(message);
    }
  }

  private handleGuestHit(message: PlayerHitMessage): void {
    // Find enemy by ID and apply damage
    const enemy = this.findEnemyById(message.enemyId);
    if (enemy) {
      enemy.takeDamage(message.damage);
    }
  }

  private handleGuestPickup(message: PickupMessage): void {
    // Pickup is handled by LootDropManager - just acknowledge
    // The loot system will broadcast LOOT_TAKEN
  }

  update(): void {
    if (!networkManager.isConnected) return;

    this.remotePlayer?.update();

    // Broadcast enemy positions periodically
    const now = Date.now();
    if (now - this.lastEnemyUpdateTime > this.ENEMY_UPDATE_INTERVAL_MS) {
      this.broadcastEnemyUpdate();
      this.lastEnemyUpdateTime = now;
    }
  }

  private broadcastEnemyUpdate(): void {
    const enemyData: EnemyUpdateMessage['enemies'] = [];

    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Enemy;
      if (!enemy.active) return;

      let id = this.enemyIdMap.get(enemy);
      if (!id) {
        id = `enemy_${this.nextEnemyId++}`;
        this.enemyIdMap.set(enemy, id);
      }

      enemyData.push({
        id,
        x: enemy.x,
        y: enemy.y,
        hp: enemy.hp,
        state: 'active',
        facing: 'south',
      });
    });

    const message: EnemyUpdateMessage = {
      type: MessageType.ENEMY_UPDATE,
      enemies: enemyData,
    };

    networkManager.broadcast(message);
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

    // Update remote player stats
    if (this.remotePlayer) {
      this.remotePlayer.setHelperStats(this.player.maxHp, this.player.maxHp);
    }
  }

  sendInventoryUpdate(): void {
    const message: InventoryUpdateMessage = {
      type: MessageType.INVENTORY_UPDATE,
      inventorySerialized: this.player.inventory.serialize(),
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

    // Teleport remote player to host position
    if (this.remotePlayer) {
      this.remotePlayer.revive(this.player.x + 50, this.player.y);
    }
  }

  getEnemyId(enemy: Enemy): string | undefined {
    return this.enemyIdMap.get(enemy);
  }

  assignEnemyId(enemy: Enemy): string {
    const id = `enemy_${this.nextEnemyId++}`;
    this.enemyIdMap.set(enemy, id);
    return id;
  }

  private findEnemyById(id: string): Enemy | null {
    for (const [enemy, enemyId] of this.enemyIdMap.entries()) {
      if (enemyId === id && enemy.active) {
        return enemy;
      }
    }
    return null;
  }

  getRemotePlayer(): RemotePlayer | null {
    return this.remotePlayer;
  }

  destroy(): void {
    if (this.remotePlayer) {
      this.remotePlayer.destroy();
      this.remotePlayer = null;
    }
    this.enemyIdMap.clear();
  }
}
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/multiplayer/HostController.ts
git commit -m "feat(multiplayer): add HostController for managing guest connection"
```

---

## Task 8: Create GuestController

**Files:**
- Create: `src/multiplayer/GuestController.ts`

**Step 1: Create GuestController class**

```typescript
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

  private handleMessage(message: SyncMessage, peerId: string): void {
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

  private handleRoomClear(message: RoomClearMessage): void {
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
    const height = this.scene.cameras.main.height;

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
    for (const guestEnemy of this.guestEnemies.values()) {
      // Animation updates would go here
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
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/multiplayer/GuestController.ts
git commit -m "feat(multiplayer): add GuestController for receiving host state"
```

---

## Task 9: Integrate Multiplayer into GameScene

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Step 1: Add multiplayer imports**

At top of file, add:

```typescript
import { networkManager } from '../multiplayer/NetworkManager';
import { HostController } from '../multiplayer/HostController';
import { GuestController } from '../multiplayer/GuestController';
import { PlayerSync } from '../multiplayer/PlayerSync';
```

**Step 2: Add multiplayer properties to GameScene class**

After existing properties, add:

```typescript
  // Multiplayer
  private hostController: HostController | null = null;
  private guestController: GuestController | null = null;
  private playerSync: PlayerSync | null = null;
```

**Step 3: Initialize multiplayer in createScene**

After player creation (after `this.player = new Player(...)`), add:

```typescript
    // Initialize multiplayer if connected
    if (networkManager.isMultiplayer) {
      this.playerSync = new PlayerSync(this.player);

      if (networkManager.isHost) {
        this.hostController = new HostController(
          this,
          this.player,
          this.enemies
        );
      } else {
        this.guestController = new GuestController(this, this.player);
      }
    }
```

**Step 4: Update multiplayer in update loop**

In the `update` method, add before the existing update code:

```typescript
    // Multiplayer sync
    this.playerSync?.update();
    this.hostController?.update();
    this.guestController?.update();
```

**Step 5: Add cleanup on scene shutdown**

Add a shutdown method or modify existing cleanup:

```typescript
  shutdown(): void {
    this.hostController?.destroy();
    this.guestController?.destroy();
    this.hostController = null;
    this.guestController = null;
    this.playerSync = null;
  }
```

**Step 6: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 7: Commit**

```bash
git add src/scenes/GameScene.ts
git commit -m "feat(multiplayer): integrate multiplayer controllers into GameScene"
```

---

## Task 10: Add Multiplayer to Player Attack Broadcasting

**Files:**
- Modify: `src/systems/PlayerAttackManager.ts`

**Step 1: Add import for PlayerSync**

```typescript
import { networkManager } from '../multiplayer/NetworkManager';
import { MessageType, PlayerHitMessage } from '../multiplayer/SyncMessages';
```

**Step 2: Broadcast attacks when hitting enemies**

Find where damage is dealt to enemies and add broadcast. In the hit detection callback, add:

```typescript
    // Broadcast hit to network
    if (networkManager.isMultiplayer) {
      const hitMessage: PlayerHitMessage = {
        type: MessageType.PLAYER_HIT,
        enemyId: enemy.networkId || 'unknown',
        damage: actualDamage,
      };
      networkManager.broadcast(hitMessage);
    }
```

Note: You'll need to ensure enemies have a `networkId` property. This can be assigned by HostController.

**Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds (may have type errors to fix with networkId).

**Step 4: Commit**

```bash
git add src/systems/PlayerAttackManager.ts
git commit -m "feat(multiplayer): broadcast player attacks over network"
```

---

## Task 11: Export Multiplayer Module

**Files:**
- Create: `src/multiplayer/index.ts`

**Step 1: Create barrel export file**

```typescript
// src/multiplayer/index.ts

export * from './NetworkManager';
export * from './SyncMessages';
export * from './PlayerSync';
export * from './RemotePlayer';
export * from './HostController';
export * from './GuestController';
```

**Step 2: Verify build**

```bash
npm run build
```

Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/multiplayer/index.ts
git commit -m "feat(multiplayer): add barrel export for multiplayer module"
```

---

## Task 12: End-to-End Manual Testing

**Step 1: Start dev server**

```bash
npm run dev
```

**Step 2: Open two browser windows**

- Window 1: Go to http://localhost:5173
- Window 2: Go to http://localhost:5173 (or use incognito)

**Step 3: Test hosting**

In Window 1:
1. Click "Host Co-op"
2. Note the room code displayed
3. Wait on the hosting screen

**Step 4: Test joining**

In Window 2:
1. Click "Join Co-op"
2. Enter the room code from Window 1
3. Both should transition to HubScene

**Step 5: Test gameplay**

1. Both players should see each other
2. Movement should sync between windows
3. Entering dungeon should work for both

**Step 6: Document any bugs found**

Create issues or fix immediately.

**Step 7: Final commit**

```bash
git add -A
git commit -m "feat(multiplayer): complete initial multiplayer implementation"
```

---

## Summary Checklist

- [ ] Task 1: Install Trystero
- [ ] Task 2: Create message types
- [ ] Task 3: Create NetworkManager
- [ ] Task 4: Create PlayerSync
- [ ] Task 5: Create RemotePlayer
- [ ] Task 6: Add menu buttons
- [ ] Task 7: Create HostController
- [ ] Task 8: Create GuestController
- [ ] Task 9: Integrate into GameScene
- [ ] Task 10: Broadcast attacks
- [ ] Task 11: Export module
- [ ] Task 12: End-to-end testing

## Future Tasks (Not in v1)

- Sync room transitions with teleport
- Sync inventory changes real-time
- Add helper death/spectate mode
- Hub/Shop scene multiplayer
- Reconnection support
- More than 2 players
