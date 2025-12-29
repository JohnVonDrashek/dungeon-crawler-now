# Network API Reference

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Phaser 3](https://img.shields.io/badge/Phaser_3-00BFFF?style=flat&logo=phaser&logoColor=white)
![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=flat&logo=webrtc&logoColor=white)

Complete API reference for the multiplayer networking system used in Infernal Ascent.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [NetworkManager](#networkmanager)
  - [Connection States](#connection-states)
  - [Properties](#properties)
  - [Methods](#methods)
  - [Event Handlers](#event-handlers)
- [Message Types](#message-types)
  - [MessageType Enum](#messagetype-enum)
  - [Message Schemas](#message-schemas)
- [PlayerSync](#playersync)
- [HostController](#hostcontroller)
- [GuestController](#guestcontroller)
- [RemotePlayer](#remoteplayer)
- [Message Validation](#message-validation)
- [Usage Examples](#usage-examples)

---

## Architecture Overview

The multiplayer system uses a **host-authoritative** architecture built on [Trystero](https://github.com/dmotz/trystero) for WebRTC peer-to-peer connections.

```
┌─────────────────┐                    ┌─────────────────┐
│      HOST       │                    │      GUEST      │
│                 │                    │                 │
│ ┌─────────────┐ │  WebRTC (P2P)      │ ┌─────────────┐ │
│ │HostController│◄─────────────────────►│GuestController│
│ └─────────────┘ │                    │ └─────────────┘ │
│        │        │                    │        │        │
│        ▼        │                    │        ▼        │
│ ┌─────────────┐ │                    │ ┌─────────────┐ │
│ │ PlayerSync  │ │                    │ │ PlayerSync  │ │
│ └─────────────┘ │                    │ └─────────────┘ │
│        │        │                    │        │        │
│        ▼        │                    │        ▼        │
│ ┌─────────────┐ │                    │ ┌─────────────┐ │
│ │NetworkManager│◄────────────────────►│NetworkManager │
│ └─────────────┘ │                    │ └─────────────┘ │
└─────────────────┘                    └─────────────────┘
```

**Key Concepts:**

- **Host**: Creates the game session and has authority over game state (enemies, loot, room progression)
- **Guest**: Joins an existing session and receives state updates from the host
- **Room Code**: 6-character alphanumeric code used to connect peers
- **Singleton Pattern**: `NetworkManager` uses a singleton pattern for global access

---

## NetworkManager

The core networking class that manages WebRTC connections via Trystero.

**File:** `src/multiplayer/NetworkManager.ts`

### Connection States

```typescript
type ConnectionState =
  | 'disconnected'   // No active connection
  | 'connecting'     // Attempting to connect
  | 'waiting'        // Host waiting for guest to join
  | 'connected'      // Active connection established
  | 'reconnecting';  // Attempting to reconnect after disconnect
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `isHost` | `boolean` | `true` if this instance is hosting the game |
| `isGuest` | `boolean` | `true` if connected as a guest (not host) |
| `isConnected` | `boolean` | `true` if a peer connection is active |
| `isMultiplayer` | `boolean` | `true` if a room has been joined (host or guest) |
| `connectionState` | `ConnectionState` | Current connection state |
| `peerId` | `string \| null` | This client's unique peer ID |
| `roomCode` | `string \| null` | Current room code (if hosting or joined) |

### Methods

#### `getInstance(): NetworkManager`

Returns the singleton instance of NetworkManager.

```typescript
import { networkManager } from './multiplayer';
// or
const nm = NetworkManager.getInstance();
```

#### `generateRoomCode(): string`

Generates a random 6-character room code using uppercase letters and digits (excluding ambiguous characters like O, 0, I, 1).

**Returns:** A 6-character string (e.g., `"A3B7CK"`)

```typescript
const code = networkManager.generateRoomCode();
console.log(code); // "X7K9MP"
```

#### `hostGame(): Promise<string>`

Creates a new game session and waits for a guest to join.

**Returns:** `Promise<string>` - The room code to share with the guest

**Throws:** Error if connection fails

```typescript
try {
  const roomCode = await networkManager.hostGame();
  console.log(`Share this code: ${roomCode}`);
} catch (error) {
  console.error('Failed to host game:', error);
}
```

**State Transitions:**
1. `disconnected` -> `connecting`
2. `connecting` -> `waiting` (room created, waiting for peer)
3. `waiting` -> `connected` (peer joined)

#### `joinGame(roomCode: string): Promise<void>`

Joins an existing game session using a room code.

**Parameters:**
- `roomCode: string` - The 6-character room code (case-insensitive)

**Throws:**
- Error if connection times out (15 seconds)
- Error if connection fails

```typescript
try {
  await networkManager.joinGame('X7K9MP');
  console.log('Connected to host!');
} catch (error) {
  console.error('Failed to join:', error);
}
```

**State Transitions:**
1. `disconnected` -> `connecting`
2. `connecting` -> `connected` (when host found)

#### `send(message: SyncMessage, targetPeerId?: string): void`

Sends a message to a specific peer or broadcasts to all peers.

**Parameters:**
- `message: SyncMessage` - The message to send
- `targetPeerId?: string` - Optional specific peer to send to (omit for broadcast)

```typescript
networkManager.send({
  type: MessageType.PLAYER_POS,
  x: player.x,
  y: player.y,
  facing: 'south',
  animState: 'walk',
  isMoving: true
});

// Send to specific peer
networkManager.send(message, 'peer_abc123');
```

#### `broadcast(message: SyncMessage): void`

Broadcasts a message to all connected peers.

```typescript
networkManager.broadcast({
  type: MessageType.ENEMY_DEATH,
  id: 'enemy_42',
  killerPlayerId: 'host'
});
```

#### `disconnect(): void`

Disconnects from the current session and resets all state.

```typescript
networkManager.disconnect();
```

**Effects:**
- Leaves the Trystero room
- Clears all message listeners
- Resets connection state to `disconnected`
- Cancels any pending reconnection attempts

#### `static reset(): void`

Destroys the singleton instance and creates a fresh one. Useful for complete cleanup.

```typescript
NetworkManager.reset();
```

### Event Handlers

#### `onPeerJoin(callback: (peerId: string) => void): void`

Registers a callback for when a peer connects.

```typescript
networkManager.onPeerJoin((peerId) => {
  console.log(`Peer joined: ${peerId}`);
  // Initialize remote player, sync game state, etc.
});
```

#### `clearOnPeerJoin(): void`

Removes the peer join callback.

#### `onPeerLeave(callback: (peerId: string) => void): void`

Registers a callback for when a peer disconnects.

```typescript
networkManager.onPeerLeave((peerId) => {
  console.log(`Peer left: ${peerId}`);
  // Clean up remote player, show reconnecting UI, etc.
});
```

#### `onMessage(callback: (message: SyncMessage, peerId: string) => void): string`

Registers a message handler for incoming messages.

**Returns:** `string` - Listener ID for later removal

```typescript
const listenerId = networkManager.onMessage((message, peerId) => {
  switch (message.type) {
    case MessageType.PLAYER_POS:
      updateRemotePlayer(message, peerId);
      break;
    case MessageType.ENEMY_UPDATE:
      syncEnemies(message.enemies);
      break;
  }
});
```

#### `offMessage(listenerId: string): void`

Removes a message handler by its ID.

```typescript
networkManager.offMessage(listenerId);
```

#### `clearMessageListeners(): void`

Removes all message handlers.

#### `onConnectionStateChange(callback: (state: ConnectionState) => void): void`

Registers a callback for connection state changes.

```typescript
networkManager.onConnectionStateChange((state) => {
  switch (state) {
    case 'reconnecting':
      showReconnectingOverlay();
      break;
    case 'connected':
      hideReconnectingOverlay();
      break;
    case 'disconnected':
      returnToMainMenu();
      break;
  }
});
```

#### `offConnectionStateChange(): void`

Removes the connection state change callback.

---

## Message Types

**File:** `src/multiplayer/SyncMessages.ts`

### MessageType Enum

```typescript
enum MessageType {
  // Host -> Guest only
  ROOM_DATA = 'ROOM_DATA',           // Initial dungeon state
  ENEMY_SPAWN = 'ENEMY_SPAWN',       // New enemy spawned
  ENEMY_UPDATE = 'ENEMY_UPDATE',     // Periodic enemy state sync
  ENEMY_DEATH = 'ENEMY_DEATH',       // Enemy killed
  LOOT_SPAWN = 'LOOT_SPAWN',         // Loot dropped
  LOOT_TAKEN = 'LOOT_TAKEN',         // Loot picked up
  ROOM_CLEAR = 'ROOM_CLEAR',         // Room enemies defeated
  ROOM_ACTIVATED = 'ROOM_ACTIVATED', // Host entered new room
  PLAYER_DIED = 'PLAYER_DIED',       // Player death notification
  PLAYER_REVIVE = 'PLAYER_REVIVE',   // Player revived
  INVENTORY_UPDATE = 'INVENTORY_UPDATE', // Inventory sync
  SCENE_CHANGE = 'SCENE_CHANGE',     // Scene transition
  HOST_STATE = 'HOST_STATE',         // Host HP/level/gold

  // Bidirectional
  PLAYER_POS = 'PLAYER_POS',         // Position update
  PLAYER_ATTACK = 'PLAYER_ATTACK',   // Attack action
  PLAYER_HIT = 'PLAYER_HIT',         // Damage dealt to enemy
  PICKUP = 'PICKUP',                 // Request to pick up loot
  EQUIP_ITEM = 'EQUIP_ITEM',         // Equip item
  USE_ITEM = 'USE_ITEM',             // Use consumable
}
```

### Message Schemas

#### PlayerPosMessage

Position and animation state update.

```typescript
interface PlayerPosMessage {
  type: MessageType.PLAYER_POS;
  x: number;           // X world coordinate
  y: number;           // Y world coordinate
  facing: string;      // 'north' | 'south' | 'east' | 'west'
  animState: string;   // 'idle' | 'walk'
  isMoving: boolean;   // Whether player is actively moving
}
```

#### PlayerAttackMessage

Player attack action.

```typescript
interface PlayerAttackMessage {
  type: MessageType.PLAYER_ATTACK;
  attackType: string;  // Attack type identifier
  direction: string;   // Attack direction
  x: number;           // Attack origin X
  y: number;           // Attack origin Y
  angle?: number;      // Projectile angle in radians
}
```

#### PlayerHitMessage

Damage dealt to an enemy (guest -> host).

```typescript
interface PlayerHitMessage {
  type: MessageType.PLAYER_HIT;
  enemyId: string;     // Network ID of enemy hit
  damage: number;      // Damage amount
}
```

#### EnemySpawnMessage

New enemy spawned (host -> guest).

```typescript
interface EnemySpawnMessage {
  type: MessageType.ENEMY_SPAWN;
  id: string;          // Network ID
  enemyType: string;   // Enemy class/type
  x: number;           // Spawn X
  y: number;           // Spawn Y
  hp: number;          // Current HP
  maxHp: number;       // Maximum HP
}
```

#### EnemyUpdateMessage

Periodic enemy state synchronization (host -> guest, ~20 updates/sec).

```typescript
interface EnemyUpdateMessage {
  type: MessageType.ENEMY_UPDATE;
  enemies: Array<{
    id: string;        // Network ID
    x: number;         // Current X
    y: number;         // Current Y
    hp: number;        // Current HP
    maxHp: number;     // Maximum HP
    texture: string;   // Sprite texture key
    state: string;     // AI state
    facing: string;    // Facing direction
  }>;
}
```

#### EnemyDeathMessage

Enemy killed (host -> guest).

```typescript
interface EnemyDeathMessage {
  type: MessageType.ENEMY_DEATH;
  id: string;              // Network ID of dead enemy
  killerPlayerId: string;  // 'host' or peer ID
}
```

#### LootSpawnMessage

Loot dropped (host -> guest).

```typescript
interface LootSpawnMessage {
  type: MessageType.LOOT_SPAWN;
  id: string;          // Loot instance ID
  itemData: string;    // JSON serialized item data
  x: number;           // Drop X
  y: number;           // Drop Y
}
```

#### LootTakenMessage

Loot picked up (host -> guest).

```typescript
interface LootTakenMessage {
  type: MessageType.LOOT_TAKEN;
  id: string;          // Loot instance ID
  playerId: string;    // 'host' | 'guest' | peer ID
}
```

#### RoomDataMessage

Initial dungeon state on join (host -> guest).

```typescript
interface RoomDataMessage {
  type: MessageType.ROOM_DATA;
  dungeonData: string;      // JSON serialized dungeon
  currentRoomIndex: number; // Active room index
  hostX: number;            // Host position X
  hostY: number;            // Host position Y
}
```

#### RoomClearMessage

Room enemies defeated (host -> guest).

```typescript
interface RoomClearMessage {
  type: MessageType.ROOM_CLEAR;
  roomIndex: number;   // Cleared room index
}
```

#### RoomActivatedMessage

Host entered a new room (host -> guest).

```typescript
interface RoomActivatedMessage {
  type: MessageType.ROOM_ACTIVATED;
  roomId: number;      // Room ID entered
  hostX: number;       // Host position X (for guest teleport)
  hostY: number;       // Host position Y
}
```

#### PlayerDiedMessage

Player death notification.

```typescript
interface PlayerDiedMessage {
  type: MessageType.PLAYER_DIED;
  playerId: string;    // Peer ID of dead player
}
```

#### PlayerReviveMessage

Player revived.

```typescript
interface PlayerReviveMessage {
  type: MessageType.PLAYER_REVIVE;
  playerId: string;    // Peer ID of revived player
  x: number;           // Revive X
  y: number;           // Revive Y
}
```

#### InventoryUpdateMessage

Inventory sync (host -> guest).

```typescript
interface InventoryUpdateMessage {
  type: MessageType.INVENTORY_UPDATE;
  inventorySerialized: string;  // JSON serialized inventory
  gold: number;                 // Current gold
}
```

#### SceneChangeMessage

Scene transition (host -> guest).

```typescript
interface SceneChangeMessage {
  type: MessageType.SCENE_CHANGE;
  sceneName: string;              // Target scene key
  data?: Record<string, unknown>; // Scene init data
}
```

#### HostStateMessage

Host player stats (host -> guest, ~1 update/sec).

```typescript
interface HostStateMessage {
  type: MessageType.HOST_STATE;
  hp: number;      // Host current HP
  maxHp: number;   // Host max HP
  level: number;   // Host level
  gold: number;    // Host gold
}
```

#### PickupMessage

Request to pick up loot (guest -> host).

```typescript
interface PickupMessage {
  type: MessageType.PICKUP;
  lootId: string;  // Loot instance ID to pick up
}
```

#### EquipItemMessage

Equip item notification.

```typescript
interface EquipItemMessage {
  type: MessageType.EQUIP_ITEM;
  itemId: string;  // Item ID to equip
  slot: string;    // Equipment slot
}
```

#### UseItemMessage

Use consumable notification.

```typescript
interface UseItemMessage {
  type: MessageType.USE_ITEM;
  itemId: string;  // Consumable item ID
}
```

---

## PlayerSync

Handles local player position and action broadcasting.

**File:** `src/multiplayer/PlayerSync.ts`

### Constructor

```typescript
constructor(player: Player)
```

### Methods

#### `update(): void`

Called each frame to broadcast position updates. Uses delta compression:
- Only sends if position changed > 2 pixels or facing direction changed
- Rate limited to 20 updates/second (50ms interval)

```typescript
// In your game loop
playerSync.update();
```

#### `sendAttack(attackType: string, direction: string): void`

Broadcasts an attack action.

```typescript
playerSync.sendAttack('projectile', 'east');
```

#### `sendHit(enemyId: string, damage: number): void`

Notifies host of damage dealt to an enemy.

```typescript
playerSync.sendHit('enemy_42', 25);
```

---

## HostController

Manages the host side of multiplayer: receives guest input, broadcasts game state.

**File:** `src/multiplayer/HostController.ts`

### Constructor

```typescript
constructor(
  scene: Phaser.Scene,
  player: Player,
  enemies: Phaser.GameObjects.Group
)
```

### Key Methods

#### `update(delta: number): void`

Called each frame. Handles:
- Remote player interpolation
- Enemy state broadcasting (20 updates/sec)
- Host state broadcasting (1 update/sec)
- Secondary target assignment for enemy AI

#### `registerEnemy(enemy: Enemy): string`

Registers an enemy for network synchronization.

**Returns:** Network ID (e.g., `"enemy_42"`)

```typescript
const enemyId = hostController.registerEnemy(newEnemy);
```

#### `getEnemyId(enemy: Enemy): string | undefined`

Gets the network ID for a registered enemy.

#### `sendHostState(): void`

Broadcasts current host HP, level, and gold.

#### `sendInventoryUpdate(): void`

Broadcasts current inventory state.

#### `sendRoomData(dungeonData: string, currentRoomIndex: number): void`

Sends dungeon layout to guest.

#### `broadcastRoomActivated(roomId: number): void`

Notifies guest that host entered a new room (triggers guest teleport).

#### `getRemotePlayer(): RemotePlayer | null`

Returns the guest's remote player representation.

#### `destroy(): void`

Cleans up resources. **Must be called** when leaving the scene.

---

## GuestController

Manages the guest side of multiplayer: receives host state, renders remote entities.

**File:** `src/multiplayer/GuestController.ts`

### Constructor

```typescript
constructor(scene: Phaser.Scene, player: Player)
```

### Key Methods

#### `setRoomManager(roomManager: RoomManager): void`

Sets the room manager for room-based tethering (prevents guest from entering unvisited rooms).

#### `update(): void`

Called each frame. Handles:
- Host player interpolation
- Room-based movement restrictions
- Last safe position tracking

#### `getGuestEnemy(id: string): GuestEnemy | undefined`

Gets a guest-side enemy representation by network ID.

#### `getHostPlayer(): RemotePlayer | null`

Returns the host's remote player representation.

#### `cleanup(): void`

Cleans up visual elements without destroying the controller.

#### `destroy(): void`

Cleans up all resources. **Must be called** when leaving the scene.

---

## RemotePlayer

Visual representation of a remote player (host or guest).

**File:** `src/multiplayer/RemotePlayer.ts`

### Constructor

```typescript
constructor(
  scene: Phaser.Scene,
  x: number,
  y: number,
  isHelper: boolean = true  // true = guest/helper (blue tint), false = host
)
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `hp` | `number` | Current health (75% of host for helpers) |
| `maxHp` | `number` | Maximum health |

### Methods

#### `update(): void`

Called each frame for position interpolation (30% lerp speed).

#### `applyPositionUpdate(message: PlayerPosMessage): void`

Applies a position update from the network.

#### `applyAttack(message: PlayerAttackMessage): void`

Visual feedback for attack action.

#### `setHelperStats(hostMaxHp: number, hostHp: number): void`

Sets helper stats at 75% of host values.

#### `takeDamage(amount: number): void`

Applies damage with visual feedback.

#### `die(): void`

Marks player as dead with visual changes.

#### `revive(x: number, y: number): void`

Revives player at specified position.

#### `destroy(fromScene?: boolean): void`

Cleans up sprite, name tag, and torch light.

---

## Message Validation

Anti-cheat validation for incoming messages.

**File:** `src/multiplayer/MessageValidator.ts`

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_DAMAGE_PER_HIT` | 1000 | Maximum allowed damage per hit |
| `MAX_POSITION_DELTA` | 100 | Maximum allowed position change per update |

### Functions

#### `validateRoomCode(code: string): ValidationResult`

Validates room code format (4-8 uppercase alphanumeric characters).

```typescript
const result = validateRoomCode('ABC123');
// { valid: true }

const result = validateRoomCode('abc!');
// { valid: false, reason: 'Invalid room code format' }
```

#### `validateDamage(damage: number): ValidationResult`

Validates damage value is within acceptable range.

```typescript
const result = validateDamage(50);
// { valid: true }

const result = validateDamage(9999);
// { valid: false, reason: 'Damage exceeds max of 1000' }
```

#### `validatePositionDelta(oldX, oldY, newX, newY): ValidationResult`

Validates position change is not suspiciously large.

#### `validateEnemyId(enemyId: string, validEnemyIds: Set<string>): ValidationResult`

Validates enemy ID exists in the current session.

#### `validateSyncMessage(message: SyncMessage): ValidationResult`

Validates basic message structure.

### ValidationResult Interface

```typescript
interface ValidationResult {
  valid: boolean;
  reason?: string;  // Present when valid is false
}
```

---

## Usage Examples

### Hosting a Game

```typescript
import { networkManager, HostController, PlayerSync } from './multiplayer';

class GameScene extends Phaser.Scene {
  private hostController?: HostController;
  private playerSync?: PlayerSync;

  async create() {
    // Set up connection state listener
    networkManager.onConnectionStateChange((state) => {
      this.updateConnectionUI(state);
    });

    // Host the game
    try {
      const roomCode = await networkManager.hostGame();
      this.showRoomCode(roomCode);
    } catch (error) {
      this.showError('Failed to create game');
      return;
    }

    // Initialize controllers
    this.hostController = new HostController(
      this,
      this.player,
      this.enemies
    );
    this.playerSync = new PlayerSync(this.player);
  }

  update(time: number, delta: number) {
    this.playerSync?.update();
    this.hostController?.update(delta);
  }

  shutdown() {
    this.hostController?.destroy();
    networkManager.disconnect();
  }
}
```

### Joining a Game

```typescript
import { networkManager, GuestController, PlayerSync } from './multiplayer';

class GameScene extends Phaser.Scene {
  private guestController?: GuestController;
  private playerSync?: PlayerSync;

  async create(data: { roomCode: string }) {
    // Join the game
    try {
      await networkManager.joinGame(data.roomCode);
    } catch (error) {
      this.showError('Failed to join game');
      this.scene.start('MenuScene');
      return;
    }

    // Initialize controllers
    this.guestController = new GuestController(this, this.player);
    this.guestController.setRoomManager(this.roomManager);
    this.playerSync = new PlayerSync(this.player);
  }

  update() {
    this.playerSync?.update();
    this.guestController?.update();
  }

  shutdown() {
    this.guestController?.destroy();
    networkManager.disconnect();
  }
}
```

### Handling Multiplayer Combat

```typescript
// Guest attacking an enemy
hitEnemy(enemy: Phaser.Physics.Arcade.Sprite, damage: number) {
  const enemyId = enemy.getData('enemyId') as string;

  if (networkManager.isGuest && enemyId) {
    // Send hit to host for validation
    this.playerSync.sendHit(enemyId, damage);
  } else if (networkManager.isHost) {
    // Host applies damage directly
    enemy.takeDamage(damage);
  }
}
```

### Broadcasting Game Events

```typescript
// Host: Notify guest of room activation
enterRoom(roomId: number) {
  if (networkManager.isHost && networkManager.isConnected) {
    this.hostController.broadcastRoomActivated(roomId);
  }
}

// Host: Sync loot drop
spawnLoot(loot: LootDrop) {
  if (networkManager.isHost) {
    networkManager.broadcast({
      type: MessageType.LOOT_SPAWN,
      id: loot.id,
      itemData: JSON.stringify(loot.item),
      x: loot.x,
      y: loot.y
    });
  }
}
```

---

## Reconnection Behavior

The system includes automatic reconnection handling:

**Guest Disconnection:**
1. Guest detects disconnect
2. State changes to `reconnecting`
3. Up to 5 reconnection attempts with 2-second delays
4. On success: state changes to `connected`
5. On failure: state changes to `disconnected`, returns to menu

**Host Behavior on Guest Disconnect:**
1. Host sees guest leave
2. State changes to `waiting`
3. Host continues playing solo
4. If guest reconnects, remote player is recreated

---

## Update Rates

| Data Type | Rate | Direction |
|-----------|------|-----------|
| Player Position | 20/sec (50ms) | Bidirectional |
| Enemy State | 20/sec (50ms) | Host -> Guest |
| Host Stats | 1/sec (1000ms) | Host -> Guest |
| Actions (attack, pickup) | Immediate | Bidirectional |

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
