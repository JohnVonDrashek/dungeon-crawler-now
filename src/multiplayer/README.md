# Multiplayer System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Trystero](https://img.shields.io/badge/P2P-Trystero-purple)](https://github.com/dmotz/trystero)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-green)](https://webrtc.org/)

Peer-to-peer co-op multiplayer system for Infernal Ascent using Trystero/WebRTC. One player hosts, another joins as a "helper" with 75% of the host's stats.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        NETWORK LAYER                                │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   NetworkManager (Singleton)                 │   │
│  │  - Room creation/joining via Trystero                       │   │
│  │  - WebRTC peer connections                                  │   │
│  │  - Message routing & reconnection handling                  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    ▼                           ▼
┌─────────────────────────────┐   ┌─────────────────────────────┐
│      HOST MACHINE           │   │      GUEST MACHINE          │
│  ┌───────────────────────┐  │   │  ┌───────────────────────┐  │
│  │   HostController      │  │   │  │   GuestController     │  │
│  │  - Authoritative      │  │   │  │  - Receives state     │  │
│  │  - Enemy simulation   │  │   │  │  - Renders enemies    │  │
│  │  - State broadcasting │  │   │  │  - Room tethering     │  │
│  └───────────────────────┘  │   │  └───────────────────────┘  │
│            │                │   │            │                │
│  ┌─────────┴─────────┐      │   │  ┌─────────┴─────────┐      │
│  │   PlayerSync      │      │   │  │   PlayerSync      │      │
│  │  (Local player)   │      │   │  │  (Local player)   │      │
│  └───────────────────┘      │   │  └───────────────────┘      │
│            │                │   │            │                │
│  ┌─────────┴─────────┐      │   │  ┌─────────┴─────────┐      │
│  │  RemotePlayer     │      │   │  │  RemotePlayer     │      │
│  │  (Guest avatar)   │      │   │  │  (Host avatar)    │      │
│  └───────────────────┘      │   │  └───────────────────┘      │
└─────────────────────────────┘   └─────────────────────────────┘
```

## File Structure

| File | Purpose |
|------|---------|
| `NetworkManager.ts` | Singleton managing WebRTC connections via Trystero |
| `HostController.ts` | Host-side game state authority and broadcasting |
| `GuestController.ts` | Guest-side state reception and rendering |
| `PlayerSync.ts` | Local player position/action synchronization |
| `RemotePlayer.ts` | Visual representation of remote players |
| `SyncMessages.ts` | Message type definitions and interfaces |
| `MessageValidator.ts` | Anti-cheat validation rules |
| `index.ts` | Module exports |

---

## NetworkManager

**Location:** `/src/multiplayer/NetworkManager.ts`

Singleton class managing all WebRTC peer connections using the Trystero library.

### Connection States

```typescript
type ConnectionState = 'disconnected' | 'connecting' | 'waiting' | 'connected' | 'reconnecting';
```

| State | Description |
|-------|-------------|
| `disconnected` | No active connection |
| `connecting` | Attempting to join/create room |
| `waiting` | Host waiting for guest to join |
| `connected` | Peer connected, active session |
| `reconnecting` | Guest attempting to reconnect after disconnect |

### Room Codes

6-character alphanumeric codes (excluding ambiguous characters like `0/O`, `1/I/L`):

```typescript
generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  // Returns e.g., "X7KM3N"
}
```

### Key Methods

```typescript
// Host a new game - returns room code for sharing
async hostGame(): Promise<string>

// Join existing game by room code
async joinGame(roomCode: string): Promise<void>

// Send message to specific peer or broadcast to all
send(message: SyncMessage, targetPeerId?: string): void
broadcast(message: SyncMessage): void

// Event handlers
onPeerJoin(callback: (peerId: string) => void): void
onPeerLeave(callback: (peerId: string) => void): void
onMessage(callback: (message: SyncMessage, peerId: string) => void): string  // Returns listener ID
offMessage(listenerId: string): void

// Clean disconnect
disconnect(): void
```

### Reconnection Logic

- **Guest disconnects:** Auto-attempts reconnection up to 5 times with 2-second delays
- **Host waits:** Shows "Waiting for guest to reconnect..." overlay
- **Timeout:** 10 seconds per reconnect attempt, 15 seconds for initial connection

### Usage Example

```typescript
import { networkManager } from './multiplayer';

// Host side
const roomCode = await networkManager.hostGame();
console.log(`Share this code: ${roomCode}`);

// Guest side
await networkManager.joinGame('X7KM3N');

// Both sides - listen for messages
const listenerId = networkManager.onMessage((message, peerId) => {
  console.log(`Received ${message.type} from ${peerId}`);
});

// Cleanup
networkManager.offMessage(listenerId);
networkManager.disconnect();
```

---

## HostController

**Location:** `/src/multiplayer/HostController.ts`

Manages host-side responsibilities: enemy simulation, state broadcasting, and guest action validation.

### Responsibilities

1. **Enemy Authority** - Simulates all enemies, assigns network IDs, broadcasts positions
2. **State Broadcasting** - Sends host HP/level/gold and inventory updates
3. **Guest Validation** - Validates incoming guest actions (damage, position, pickups)
4. **Remote Player** - Manages visual representation of guest player

### Enemy ID System

Enemies are assigned sequential network IDs for cross-client reference:

```typescript
private enemyIdMap: Map<Enemy, string> = new Map();
private nextEnemyId: number = 1;

registerEnemy(enemy: Enemy): string {
  const id = `enemy_${this.nextEnemyId++}`;  // e.g., "enemy_1", "enemy_2"
  this.enemyIdMap.set(enemy, id);
  return id;
}
```

### Update Intervals

| Update Type | Interval | Rate |
|-------------|----------|------|
| Enemy positions/states | 50ms | 20/sec |
| Host state (HP, gold, level) | 1000ms | 1/sec |

### Message Handlers

| Message Type | Handler | Description |
|--------------|---------|-------------|
| `PLAYER_POS` | `handleGuestPosition()` | Updates RemotePlayer, validates position delta |
| `PLAYER_HIT` | `handleGuestHit()` | Validates damage/enemy ID, applies damage |
| `PICKUP` | `handleGuestPickup()` | Broadcasts loot taken, emits scene event |
| `PLAYER_ATTACK` | `handleGuestAttack()` | Renders visual projectile for guest attack |

### Broadcasts Sent

| Message Type | When Sent | Data |
|--------------|-----------|------|
| `ENEMY_UPDATE` | Every 50ms | All enemy positions, HP, textures, AI states |
| `HOST_STATE` | Every 1000ms | Host HP, maxHP, level, gold |
| `INVENTORY_UPDATE` | On change | Serialized inventory, gold |
| `ROOM_DATA` | On guest join | Dungeon data, current room, host position |
| `LOOT_TAKEN` | Guest pickup | Loot ID, player ID |
| `ROOM_ACTIVATED` | Room entered | Room ID, host position |

### Usage

```typescript
// In GameScene.create()
if (networkManager.isHost) {
  this.hostController = new HostController(this, this.player, this.enemies);
}

// In GameScene.update()
this.hostController?.update(delta);

// When spawning enemies
const enemy = new Enemy(...);
this.hostController?.registerEnemy(enemy);

// Cleanup
this.hostController?.destroy();
```

---

## GuestController

**Location:** `/src/multiplayer/GuestController.ts`

Manages guest-side responsibilities: receiving state, rendering enemies, and room tethering.

### Responsibilities

1. **State Reception** - Processes all host broadcasts
2. **Enemy Rendering** - Creates/updates visual-only enemy sprites
3. **Room Tethering** - Prevents guest from entering unvisited rooms
4. **Spectate Mode** - Handles guest death and revival

### Guest Enemy System

Enemies on guest side are visual representations only (no AI):

```typescript
interface GuestEnemy {
  sprite: Phaser.Physics.Arcade.Sprite;  // Visual only
  healthBar: Phaser.GameObjects.Container;
  id: string;      // Network ID from host
  hp: number;
  maxHp: number;
}
```

### Room Tethering

Guest can only enter rooms the host has visited:

```typescript
private visitedRoomIds: Set<number> = new Set([0]);  // Spawn room always safe

// In update():
if (!this.visitedRoomIds.has(guestRoom.id)) {
  // Teleport back to last safe position
  this.player.setPosition(this.lastSafeX + 20, this.lastSafeY);
}
```

### Spectate Mode

When guest dies:
- Player becomes semi-transparent (alpha 0.3)
- Camera follows host player
- "Waiting for room clear..." overlay shown
- Exits automatically when `ROOM_CLEAR` received

### Message Handlers

| Message Type | Handler | Description |
|--------------|---------|-------------|
| `PLAYER_POS` | `handleHostPosition()` | Updates host RemotePlayer |
| `ENEMY_UPDATE` | `handleEnemyUpdate()` | Creates/updates/removes enemy sprites |
| `HOST_STATE` | `handleHostState()` | Updates guest stats (75% ratio) |
| `INVENTORY_UPDATE` | `handleInventoryUpdate()` | Syncs inventory and gold |
| `ROOM_CLEAR` | `handleRoomClear()` | Exits spectate mode |
| `ROOM_ACTIVATED` | `handleRoomActivated()` | Teleports guest to host, marks room safe |
| `PLAYER_DIED` | `handlePlayerDied()` | Enters spectate mode if guest |
| `PLAYER_REVIVE` | `handlePlayerRevive()` | Exits spectate, restores HP |
| `SCENE_CHANGE` | `handleSceneChange()` | Transitions to new scene |
| `PLAYER_ATTACK` | `handleHostAttack()` | Renders host attack visual |

### Helper Stats

Guest player has 75% of host's stats:

```typescript
private handleHostState(message: HostStateMessage): void {
  const ratio = 0.75;
  this.player.maxHp = Math.floor(message.maxHp * ratio);
  this.player.hp = Math.min(this.player.hp, this.player.maxHp);
}
```

### Usage

```typescript
// In GameScene.create()
if (networkManager.isGuest) {
  this.guestController = new GuestController(this, this.player);
  this.guestController.setRoomManager(this.roomManager);
}

// In GameScene.update()
this.guestController?.update();

// Cleanup
this.guestController?.destroy();
```

---

## PlayerSync

**Location:** `/src/multiplayer/PlayerSync.ts`

Handles local player position and action synchronization to network.

### Sync Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `SEND_INTERVAL_MS` | 50ms | Rate limit (20 updates/sec) |
| `POSITION_THRESHOLD` | 2 pixels | Delta threshold to trigger send |

### Position Sync Logic

Only sends updates when:
- Position changed by more than 2 pixels, OR
- Facing direction changed
- AND at least 50ms since last send

```typescript
update(): void {
  if (now - this.lastSendTime < this.SEND_INTERVAL_MS) return;

  const dx = Math.abs(x - this.lastSentX);
  const dy = Math.abs(y - this.lastSentY);

  if (dx > POSITION_THRESHOLD || dy > POSITION_THRESHOLD || facingChanged) {
    networkManager.broadcast({ type: MessageType.PLAYER_POS, x, y, facing, ... });
  }
}
```

### Methods

```typescript
// Called every frame in player update
update(): void

// Called when player attacks
sendAttack(attackType: string, direction: string): void

// Called when player hits an enemy (guest only)
sendHit(enemyId: string, damage: number): void
```

### Usage

```typescript
// In Player constructor or scene
this.playerSync = new PlayerSync(this);

// In Player.update()
this.playerSync.update();

// When attacking
this.playerSync.sendAttack('wand', 'east');

// When hitting enemy (guest reporting to host)
this.playerSync.sendHit('enemy_5', 25);
```

---

## RemotePlayer

**Location:** `/src/multiplayer/RemotePlayer.ts`

Phaser sprite representing a remote player with interpolation and visual feedback.

### Features

- **Position Interpolation** - Smooth movement via linear interpolation (30% per frame)
- **Animation Sync** - Plays walk/idle animations based on received state
- **Name Tag** - "Helper" (blue) or "Host" (white) label above head
- **Torch Light** - Light2D point light follows player
- **Damage Feedback** - Red tint on hit, fades back

### Properties

```typescript
hp: number = 75;        // Current health
maxHp: number = 75;     // Max health (75% of host for helper)
```

### Methods

```typescript
// Apply network position update
applyPositionUpdate(message: PlayerPosMessage): void

// Visual feedback for attack
applyAttack(message: PlayerAttackMessage): void

// Set stats based on host (helper is 75%)
setHelperStats(hostMaxHp: number, hostHp: number): void

// Take damage with visual feedback
takeDamage(amount: number): void

// Death state
die(): void
revive(x: number, y: number): void
```

### Interpolation

```typescript
private readonly LERP_SPEED = 0.3;

update(): void {
  this.x = Phaser.Math.Linear(this.x, this.targetX, this.LERP_SPEED);
  this.y = Phaser.Math.Linear(this.y, this.targetY, this.LERP_SPEED);
}
```

### Usage

```typescript
// Create remote player
const remotePlayer = new RemotePlayer(scene, x, y, isHelper);

// Apply updates from network
remotePlayer.applyPositionUpdate(posMessage);
remotePlayer.applyAttack(attackMessage);

// Update interpolation every frame
remotePlayer.update();

// Cleanup
remotePlayer.destroy();
```

---

## SyncMessages

**Location:** `/src/multiplayer/SyncMessages.ts`

Type definitions for all network messages.

### Message Types Enum

```typescript
enum MessageType {
  // Host -> Guest only
  ROOM_DATA           // Dungeon data, current room index
  ENEMY_SPAWN         // New enemy appeared
  ENEMY_UPDATE        // Enemy positions/states batch
  ENEMY_DEATH         // Enemy killed
  LOOT_SPAWN          // Loot dropped
  LOOT_TAKEN          // Loot picked up
  ROOM_CLEAR          // Room cleared of enemies
  ROOM_ACTIVATED      // Host entered new room
  PLAYER_DIED         // Player death notification
  PLAYER_REVIVE       // Player revival
  INVENTORY_UPDATE    // Full inventory sync
  SCENE_CHANGE        // Transition to new scene
  HOST_STATE          // Host HP/level/gold

  // Bidirectional
  PLAYER_POS          // Position update
  PLAYER_ATTACK       // Attack action
  PLAYER_HIT          // Damage dealt to enemy
  PICKUP              // Loot pickup request
  EQUIP_ITEM          // Item equipped
  USE_ITEM            // Item used
}
```

### Message Interfaces

#### Player Messages

```typescript
interface PlayerPosMessage {
  type: MessageType.PLAYER_POS;
  x: number;
  y: number;
  facing: string;      // 'north' | 'south' | 'east' | 'west'
  animState: string;   // 'walk' | 'idle'
  isMoving: boolean;
}

interface PlayerAttackMessage {
  type: MessageType.PLAYER_ATTACK;
  attackType: string;  // 'wand', 'sword', etc.
  direction: string;
  x: number;
  y: number;
  angle?: number;      // Projectile angle in radians
}

interface PlayerHitMessage {
  type: MessageType.PLAYER_HIT;
  enemyId: string;     // Network enemy ID
  damage: number;
}
```

#### Enemy Messages

```typescript
interface EnemyUpdateMessage {
  type: MessageType.ENEMY_UPDATE;
  enemies: Array<{
    id: string;        // Network ID
    x: number;
    y: number;
    hp: number;
    maxHp: number;
    texture: string;   // Sprite texture key
    state: string;     // AI state
    facing: string;
  }>;
}

interface EnemySpawnMessage {
  type: MessageType.ENEMY_SPAWN;
  id: string;
  enemyType: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

interface EnemyDeathMessage {
  type: MessageType.ENEMY_DEATH;
  id: string;
  killerPlayerId: string;
}
```

#### Room/World Messages

```typescript
interface RoomDataMessage {
  type: MessageType.ROOM_DATA;
  dungeonData: string;     // JSON serialized dungeon
  currentRoomIndex: number;
  hostX: number;
  hostY: number;
}

interface RoomActivatedMessage {
  type: MessageType.ROOM_ACTIVATED;
  roomId: number;
  hostX: number;
  hostY: number;
}

interface RoomClearMessage {
  type: MessageType.ROOM_CLEAR;
  roomIndex: number;
}

interface SceneChangeMessage {
  type: MessageType.SCENE_CHANGE;
  sceneName: string;
  data?: Record<string, unknown>;
}
```

#### State Messages

```typescript
interface HostStateMessage {
  type: MessageType.HOST_STATE;
  hp: number;
  maxHp: number;
  level: number;
  gold: number;
}

interface InventoryUpdateMessage {
  type: MessageType.INVENTORY_UPDATE;
  inventorySerialized: string;  // JSON
  gold: number;
}

interface PlayerDiedMessage {
  type: MessageType.PLAYER_DIED;
  playerId: string;
}

interface PlayerReviveMessage {
  type: MessageType.PLAYER_REVIVE;
  playerId: string;
  x: number;
  y: number;
}
```

#### Loot Messages

```typescript
interface LootSpawnMessage {
  type: MessageType.LOOT_SPAWN;
  id: string;
  itemData: string;  // JSON serialized item
  x: number;
  y: number;
}

interface LootTakenMessage {
  type: MessageType.LOOT_TAKEN;
  id: string;
  playerId: string;
}

interface PickupMessage {
  type: MessageType.PICKUP;
  lootId: string;
}
```

---

## MessageValidator

**Location:** `/src/multiplayer/MessageValidator.ts`

Anti-cheat validation functions for incoming messages.

### Validation Constants

```typescript
const MAX_DAMAGE_PER_HIT = 1000;      // Max damage per attack
const MAX_POSITION_DELTA = 100;       // Max pixels per update
const VALID_ROOM_CODE_REGEX = /^[A-Z0-9]{4,8}$/;
```

### Validation Functions

```typescript
interface ValidationResult {
  valid: boolean;
  reason?: string;
}

// Validate room code format
validateRoomCode(code: string): ValidationResult

// Validate damage is within acceptable range
validateDamage(damage: number): ValidationResult

// Validate position change isn't too large (teleport detection)
validatePositionDelta(oldX, oldY, newX, newY): ValidationResult

// Validate enemy ID exists in current game
validateEnemyId(enemyId: string, validEnemyIds: Set<string>): ValidationResult

// Validate basic message structure
validateSyncMessage(message: SyncMessage): ValidationResult
```

### Usage in HostController

```typescript
private handleGuestHit(message: PlayerHitMessage, peerId: string): void {
  // Validate damage
  const damageValidation = validateDamage(message.damage);
  if (!damageValidation.valid) {
    console.warn(`Damage validation failed: ${damageValidation.reason}`);
    return;
  }

  // Validate enemy ID
  const enemyValidation = validateEnemyId(message.enemyId, this.validEnemyIds);
  if (!enemyValidation.valid) {
    console.warn(`Enemy validation failed: ${enemyValidation.reason}`);
    return;
  }

  // Apply damage if valid
  enemy.takeDamage(message.damage);
}
```

---

## Host vs Guest Responsibilities

| Responsibility | Host | Guest |
|----------------|------|-------|
| **Enemy AI** | Simulates all enemies | Receives visual updates only |
| **Damage Calculation** | Validates and applies all damage | Sends hit requests to host |
| **Loot Drops** | Spawns and manages loot | Receives loot spawn messages |
| **Room Progression** | Activates rooms, triggers events | Tethered to visited rooms only |
| **Game State** | Authoritative (HP, gold, level, inventory) | Mirrors host state (75% HP) |
| **Scene Transitions** | Initiates transitions | Follows host transitions |
| **Reconnection** | Waits for guest | Attempts reconnection |

### Data Flow

```
Guest Action → Host Validation → Game State Change → Broadcast to Guest
     │                                                       │
     └───────────────────────────────────────────────────────┘
                        (Visual confirmation)
```

---

## Connection Flow Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        HOST CREATES GAME                             │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
              ┌───────────────────────────────────┐
              │  networkManager.hostGame()        │
              │  → Creates room with Trystero     │
              │  → Returns 6-char room code       │
              │  → State: 'waiting'               │
              └───────────────────────────────────┘
                                  │
            Room Code: "X7KM3N"   │
                                  │
┌──────────────────────────────────────────────────────────────────────┐
│                        GUEST JOINS GAME                              │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
              ┌───────────────────────────────────┐
              │  networkManager.joinGame("X7KM3N")│
              │  → Joins room via Trystero        │
              │  → State: 'connecting'            │
              │  → Waits for peer (15s timeout)   │
              └───────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    WEBRTC HANDSHAKE (Trystero)                       │
│   ┌─────────────┐                              ┌─────────────┐       │
│   │    HOST     │ ◄──── SDP Offer/Answer ────► │    GUEST    │       │
│   │             │ ◄──── ICE Candidates ──────► │             │       │
│   └─────────────┘                              └─────────────┘       │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
              ┌───────────────────────────────────┐
              │  onPeerJoin() fires on both      │
              │  → State: 'connected'             │
              │  → Host creates RemotePlayer      │
              │  → Host sends initial state       │
              └───────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      ACTIVE GAME SESSION                             │
│                                                                      │
│  HOST                                    GUEST                       │
│  ─────                                   ─────                       │
│  • Runs enemy AI                         • Renders enemy sprites     │
│  • Broadcasts enemy updates (20/sec)     • Interpolates positions    │
│  • Broadcasts host state (1/sec)         • Updates local stats       │
│  • Validates guest actions               • Sends actions to host     │
│  • Controls room progression             • Tethered to safe rooms    │
│                                                                      │
│  ◄──────────────── PLAYER_POS, PLAYER_ATTACK, PLAYER_HIT ──────────► │
│  ──────────────── ENEMY_UPDATE, HOST_STATE, ROOM_DATA ─────────────► │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ (Network interruption)
                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      RECONNECTION FLOW                               │
│                                                                      │
│  HOST                                    GUEST                       │
│  ─────                                   ─────                       │
│  • onPeerLeave() fires                   • onPeerLeave() fires       │
│  • State: 'waiting'                      • State: 'reconnecting'     │
│  • Shows "Waiting for reconnect..."      • Attempts reconnect x5     │
│  • Waits for guest                       • 2s delay between tries    │
│                                                                      │
│                     (Guest rejoins room)                             │
│                                                                      │
│  • onPeerJoin() fires                    • onPeerJoin() fires        │
│  • State: 'connected'                    • State: 'connected'        │
│  • Sends current state                   • Resumes gameplay          │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
                                  │
                                  │ (Intentional disconnect)
                                  ▼
              ┌───────────────────────────────────┐
              │  networkManager.disconnect()      │
              │  → Leaves Trystero room           │
              │  → Cleans up listeners            │
              │  → State: 'disconnected'          │
              └───────────────────────────────────┘
```

---

## Error Handling

### Connection Errors

| Error | Cause | Handling |
|-------|-------|----------|
| Connection timeout | No peer found in 15s | Guest returns to menu |
| Reconnect timeout | Host unreachable for 10s | Retry up to 5 times |
| Max reconnects | 5 failed attempts | Guest returns to menu |

### Validation Errors

| Validation | Action |
|------------|--------|
| Invalid message format | Log warning, ignore message |
| Damage exceeds max | Log warning, reject damage |
| Invalid enemy ID | Log warning, reject hit |
| Position delta too large | Log warning, allow (may be room transition) |

---

## Performance Considerations

- **Position updates:** 20/sec with 2-pixel dead zone to reduce bandwidth
- **Enemy updates:** 20/sec batch updates (not individual)
- **Host state:** 1/sec for non-critical data
- **Interpolation:** 30% lerp per frame for smooth remote player movement

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
