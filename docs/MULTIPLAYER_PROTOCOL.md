# Multiplayer Protocol

> Comprehensive technical documentation for the Infernal Ascent cooperative multiplayer system.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Connection Flow](#connection-flow)
3. [Message Types Reference](#message-types-reference)
4. [State Synchronization](#state-synchronization)
5. [Host Responsibilities](#host-responsibilities)
6. [Guest Responsibilities](#guest-responsibilities)
7. [Anti-Cheat Validation](#anti-cheat-validation)
8. [Sequence Diagrams](#sequence-diagrams)

---

## Architecture Overview

### Trystero/WebRTC P2P

The multiplayer system uses **Trystero** as the networking layer, which provides WebRTC-based peer-to-peer communication. This enables direct player-to-player connections without routing traffic through game servers.

```
┌─────────────────┐                    ┌─────────────────┐
│                 │    WebRTC P2P      │                 │
│   Host Client   │◄──────────────────►│   Guest Client  │
│   (Authority)   │   Direct Connect   │    (Helper)     │
│                 │                    │                 │
└─────────────────┘                    └─────────────────┘
```

**Key Technologies:**
- **Trystero**: WebRTC signaling and connection management
- **WebRTC DataChannels**: Low-latency message passing
- **Application ID**: `infernal-ascent-coop`

### No Central Server

Unlike traditional client-server architectures:

- **No dedicated game server** - Reduces infrastructure costs and latency
- **No relay servers for gameplay** - All game traffic is peer-to-peer
- **Signaling only** - Trystero handles initial WebRTC handshake via public signaling servers
- **Self-contained sessions** - Each game session is independent

### Host Authority Model

The game uses a **host-authoritative** model where one player (the host) is the source of truth for game state:

| Aspect | Host | Guest |
|--------|------|-------|
| Game State | Authoritative | Receives updates |
| Enemy AI | Executes | Renders only |
| Damage Calculation | Validates & applies | Sends requests |
| Room Progression | Controls | Follows |
| Loot Drops | Spawns | Sees & picks up |

---

## Connection Flow

### Room Creation with Code

```
┌──────────────────────────────────────────────────────────────────┐
│                      ROOM CREATION FLOW                          │
└──────────────────────────────────────────────────────────────────┘

Host Client                              Trystero Signaling
    │                                           │
    │  1. hostGame()                            │
    │  ─────────────────────────────────────►   │
    │     (appId: infernal-ascent-coop,         │
    │      roomCode: generated)                 │
    │                                           │
    │  2. Room Created                          │
    │  ◄─────────────────────────────────────   │
    │                                           │
    │  3. State: 'waiting'                      │
    │     Display room code to player           │
    │                                           │
```

**Room Code Generation:**
- 6 characters from charset: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
- Excludes ambiguous characters (0, O, I, 1, L)
- Example: `X7K3NP`

### Join Process

```
┌──────────────────────────────────────────────────────────────────┐
│                        JOIN FLOW                                 │
└──────────────────────────────────────────────────────────────────┘

Guest Client                             Trystero Signaling
    │                                           │
    │  1. joinGame(roomCode)                    │
    │  ─────────────────────────────────────►   │
    │     State: 'connecting'                   │
    │                                           │
    │  2. Room Lookup                           │
    │  ◄─────────────────────────────────────   │
    │                                           │
    │  3. WebRTC Handshake begins               │
    │     (see next section)                    │
    │                                           │
```

### WebRTC Handshake

The WebRTC connection is established through Trystero's signaling:

```
┌──────────────────────────────────────────────────────────────────┐
│                    WEBRTC HANDSHAKE                              │
└──────────────────────────────────────────────────────────────────┘

   Host                    Signaling                    Guest
    │                         │                           │
    │                         │  1. Guest joins room      │
    │                         │◄──────────────────────────│
    │                         │                           │
    │  2. SDP Offer           │                           │
    │◄────────────────────────│                           │
    │                         │                           │
    │  3. SDP Answer          │                           │
    │────────────────────────►│                           │
    │                         │────────────────────────►  │
    │                         │                           │
    │  4. ICE Candidates exchanged                        │
    │◄───────────────────────────────────────────────────►│
    │                         │                           │
    │  5. P2P Connection Established                      │
    │◄═══════════════════════════════════════════════════►│
    │         (Direct DataChannel)                        │
    │                         │                           │
    │  6. onPeerJoin triggered                            │
    │         State: 'connected'                          │
    │                         │                           │
```

**Connection Timeout:** 15 seconds for guest join attempt

### Reconnection Handling

The system includes automatic reconnection for dropped connections:

```
┌──────────────────────────────────────────────────────────────────┐
│                    RECONNECTION FLOW                             │
└──────────────────────────────────────────────────────────────────┘

   Host                                             Guest
    │                                                  │
    │  1. Connection Lost                              │
    │     onPeerLeave() triggered                      │
    │                                                  │
    │  2. State: 'waiting'                             │
    │     (Shows "Waiting for                          │
    │      guest to reconnect")                        │
    │                                                  │
    │                               3. State: 'reconnecting'
    │                                  attemptReconnect()
    │                                                  │
    │                               4. Leave old room  │
    │                                  Join same code  │
    │                                                  │
    │  5. onPeerJoin()                                 │
    │◄════════════════════════════════════════════════►│
    │  6. State: 'connected'                           │
    │     sendInitialState()                           │
    │                                                  │
```

**Reconnection Parameters:**
- `MAX_RECONNECT_ATTEMPTS`: 5
- `RECONNECT_DELAY_MS`: 2000ms (2 seconds between attempts)
- Reconnect timeout per attempt: 10 seconds

---

## Message Types Reference

All messages are defined in `SyncMessages.ts` and transmitted via the Trystero `sync` action.

### Host to Guest Messages

#### `HOST_STATE`
Periodic host player status update.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.HOST_STATE` | Message identifier |
| `hp` | `number` | Current health points |
| `maxHp` | `number` | Maximum health points |
| `level` | `number` | Player level |
| `gold` | `number` | Gold amount |

**Sent:** Every 1000ms (1 update/sec)
**Purpose:** Keep guest informed of host's stats for UI display and helper scaling

---

#### `ENEMY_SPAWN`
Notification of new enemy creation.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.ENEMY_SPAWN` | Message identifier |
| `id` | `string` | Unique enemy identifier (e.g., `enemy_1`) |
| `enemyType` | `string` | Enemy class type |
| `x` | `number` | Spawn X position |
| `y` | `number` | Spawn Y position |
| `hp` | `number` | Current HP |
| `maxHp` | `number` | Maximum HP |

**Sent:** When a new enemy is spawned in the game world
**Purpose:** Guest creates visual representation of enemy

---

#### `ENEMY_UPDATE`
Batch update of all active enemy states.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.ENEMY_UPDATE` | Message identifier |
| `enemies` | `Array<EnemyState>` | Array of enemy states |

**EnemyState Object:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Enemy identifier |
| `x` | `number` | Current X position |
| `y` | `number` | Current Y position |
| `hp` | `number` | Current HP |
| `maxHp` | `number` | Maximum HP |
| `texture` | `string` | Sprite texture key |
| `state` | `string` | AI state (idle, chase, attack, etc.) |
| `facing` | `string` | Direction facing |

**Sent:** Every 50ms (20 updates/sec)
**Purpose:** Synchronize enemy positions and states for rendering

---

#### `ENEMY_DEATH`
Notification that an enemy has died.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.ENEMY_DEATH` | Message identifier |
| `id` | `string` | Dead enemy's identifier |
| `killerPlayerId` | `string` | ID of player who killed it |

**Sent:** When enemy HP reaches 0
**Purpose:** Guest removes enemy sprite and plays death effects

---

#### `LOOT_SPAWN`
New loot item appeared in the world.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.LOOT_SPAWN` | Message identifier |
| `id` | `string` | Unique loot identifier |
| `itemData` | `string` | Serialized item JSON |
| `x` | `number` | Spawn X position |
| `y` | `number` | Spawn Y position |

**Sent:** When enemy drops loot or chest is opened
**Purpose:** Guest displays loot item in world

---

#### `LOOT_TAKEN`
Loot item was picked up.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.LOOT_TAKEN` | Message identifier |
| `id` | `string` | Loot identifier |
| `playerId` | `string` | Player who picked it up |

**Sent:** When any player picks up loot
**Purpose:** Remove loot from world on all clients

---

#### `ROOM_DATA`
Initial dungeon state on connection.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.ROOM_DATA` | Message identifier |
| `dungeonData` | `string` | Serialized dungeon structure |
| `currentRoomIndex` | `number` | Active room index |
| `hostX` | `number` | Host X position |
| `hostY` | `number` | Host Y position |

**Sent:** When guest first connects
**Purpose:** Initialize guest's view of the dungeon

---

#### `ROOM_CLEAR`
Room enemies have been defeated.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.ROOM_CLEAR` | Message identifier |
| `roomIndex` | `number` | Index of cleared room |

**Sent:** When all enemies in a room are dead
**Purpose:** Guest exits spectate mode if dead, opens doors

---

#### `ROOM_ACTIVATED`
Host has entered a new room.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.ROOM_ACTIVATED` | Message identifier |
| `roomId` | `number` | Room identifier |
| `hostX` | `number` | Host X position |
| `hostY` | `number` | Host Y position |

**Sent:** When host steps into a new room and triggers it
**Purpose:** Teleport guest to host location, mark room as safe

---

#### `PLAYER_DIED`
Player has died.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.PLAYER_DIED` | Message identifier |
| `playerId` | `string` | Peer ID of dead player |

**Sent:** When any player's HP reaches 0
**Purpose:** Enter spectate mode, show death UI

---

#### `PLAYER_REVIVE`
Player has been revived.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.PLAYER_REVIVE` | Message identifier |
| `playerId` | `string` | Peer ID of revived player |
| `x` | `number` | Revive X position |
| `y` | `number` | Revive Y position |

**Sent:** After room clear if player was dead
**Purpose:** Exit spectate mode, restore HP

---

#### `INVENTORY_UPDATE`
Synchronize inventory state.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.INVENTORY_UPDATE` | Message identifier |
| `inventorySerialized` | `string` | JSON-serialized inventory |
| `gold` | `number` | Current gold amount |

**Sent:** On initial connection, after loot pickup
**Purpose:** Keep guest inventory in sync

---

#### `SCENE_CHANGE`
Game is transitioning to a new scene.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.SCENE_CHANGE` | Message identifier |
| `sceneName` | `string` | Target scene name |
| `data` | `Record<string, unknown>` | Optional scene data |

**Sent:** When host changes scenes (e.g., floor transition)
**Purpose:** Synchronize scene transitions

---

### Bidirectional Messages

#### `PLAYER_POS`
Player position and animation state.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.PLAYER_POS` | Message identifier |
| `x` | `number` | X position |
| `y` | `number` | Y position |
| `facing` | `string` | Direction (north, south, east, west) |
| `animState` | `string` | Animation state (walk, idle) |
| `isMoving` | `boolean` | Whether player is moving |

**Sent By:** Both host and guest
**Frequency:** 20 updates/sec (50ms interval) when position changes
**Threshold:** Only sent if position changed > 2 pixels or facing changed

---

#### `PLAYER_ATTACK`
Player initiated an attack.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.PLAYER_ATTACK` | Message identifier |
| `attackType` | `string` | Type of attack |
| `direction` | `string` | Attack direction |
| `x` | `number` | Attack origin X |
| `y` | `number` | Attack origin Y |
| `angle` | `number` | (Optional) Attack angle in radians |

**Sent By:** Both host and guest
**Purpose:** Display attack visual effects on remote client

---

#### `PLAYER_HIT`
Player hit an enemy.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.PLAYER_HIT` | Message identifier |
| `enemyId` | `string` | Target enemy identifier |
| `damage` | `number` | Damage amount |

**Sent By:** Both host and guest
**Note:** When sent by guest, host validates before applying damage

---

#### `PICKUP`
Player picked up loot.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.PICKUP` | Message identifier |
| `lootId` | `string` | Loot identifier |

**Sent By:** Guest when picking up loot
**Purpose:** Host validates and broadcasts `LOOT_TAKEN`

---

#### `EQUIP_ITEM`
Player equipped an item.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.EQUIP_ITEM` | Message identifier |
| `itemId` | `string` | Item identifier |
| `slot` | `string` | Equipment slot |

**Sent By:** Both directions
**Purpose:** Synchronize equipment changes

---

#### `USE_ITEM`
Player used a consumable item.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `MessageType.USE_ITEM` | Message identifier |
| `itemId` | `string` | Item identifier |

**Sent By:** Both directions
**Purpose:** Synchronize item usage (potions, etc.)

---

## State Synchronization

### What State is Synced

| State Category | Synced | Authority | Frequency |
|----------------|--------|-----------|-----------|
| Player Position | Yes | Each player | 20/sec |
| Player HP/Stats | Yes | Host | 1/sec |
| Player Animation | Yes | Each player | 20/sec |
| Enemy Position | Yes | Host | 20/sec |
| Enemy HP | Yes | Host | 20/sec |
| Enemy AI State | Yes | Host | 20/sec |
| Loot Items | Yes | Host | On event |
| Inventory | Yes | Host | On change |
| Room State | Yes | Host | On event |
| Dungeon Layout | Yes | Host | On connect |

### Sync Frequency

```
┌─────────────────────────────────────────────────────────────────┐
│                    UPDATE FREQUENCIES                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PLAYER_POS     ████████████████████████████████████  20/sec    │
│                 (50ms interval)                                 │
│                                                                 │
│  ENEMY_UPDATE   ████████████████████████████████████  20/sec    │
│                 (50ms interval)                                 │
│                                                                 │
│  HOST_STATE     ████                                  1/sec     │
│                 (1000ms interval)                               │
│                                                                 │
│  Events         (On occurrence - attacks, pickups, etc.)        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Interpolation on Guest

The guest uses **linear interpolation** to smooth position updates:

```typescript
// RemotePlayer.ts - LERP_SPEED = 0.3
this.x = Phaser.Math.Linear(this.x, this.targetX, this.LERP_SPEED);
this.y = Phaser.Math.Linear(this.y, this.targetY, this.LERP_SPEED);
```

**Benefits:**
- Smooth visual movement despite 50ms update intervals
- Hides network jitter
- Prevents teleport-like jumps

**Guest enemy interpolation:**
```typescript
// GuestController.ts - Enemy position smoothing
guestEnemy.sprite.x = Phaser.Math.Linear(guestEnemy.sprite.x, enemyData.x, 0.3);
guestEnemy.sprite.y = Phaser.Math.Linear(guestEnemy.sprite.y, enemyData.y, 0.3);
```

---

## Host Responsibilities

### Authoritative Game State

The host maintains the single source of truth for:

- **Dungeon generation** - Room layouts, connections, decorations
- **Enemy spawning** - When, where, and what type
- **Damage application** - Final say on HP changes
- **Loot drops** - Item generation and placement
- **Room progression** - Door states, room activation
- **Win/loss conditions** - Boss defeats, player deaths

### Enemy AI

All enemy AI runs exclusively on the host:

```
┌──────────────────────────────────────────────────────────────────┐
│                    ENEMY AI ON HOST                              │
└──────────────────────────────────────────────────────────────────┘

   Host                                             Guest
    │                                                  │
    │  Enemy AI Tick                                   │
    │  ├─ Calculate pathfinding                        │
    │  ├─ Check attack ranges                          │
    │  ├─ Update state machine                         │
    │  ├─ Apply movement                               │
    │  └─ Apply attacks                                │
    │                                                  │
    │  ENEMY_UPDATE (20/sec)                           │
    │ ────────────────────────────────────────────────►│
    │  {id, x, y, hp, state, facing}                   │
    │                                                  │
    │                                  Render sprites  │
    │                                  Update health   │
    │                                  Play animations │
    │                                                  │
```

**Secondary Target System:**
```typescript
// HostController.ts - Enemies can target guest player too
const guestPos = { x: this.remotePlayer.x, y: this.remotePlayer.y };
this.enemies.getChildren().forEach((child) => {
  const enemy = child as Enemy;
  if (enemy.active) {
    enemy.setSecondaryTarget(guestPos);
  }
});
```

### Damage Validation

When guest claims to hit an enemy, host validates:

1. **Message structure** - Required fields present
2. **Damage range** - Not negative, not exceeding max (1000)
3. **Enemy existence** - Enemy ID is in valid set
4. **Enemy active** - Enemy is not already dead

```typescript
// HostController.ts
private handleGuestHit(message: PlayerHitMessage, peerId: string): void {
  // 1. Validate damage value
  const damageValidation = validateDamage(message.damage);
  if (!damageValidation.valid) {
    console.warn(`Damage validation failed: ${damageValidation.reason}`);
    return;
  }

  // 2. Validate enemy ID exists
  const enemyValidation = validateEnemyId(message.enemyId, validEnemyIds);
  if (!enemyValidation.valid) {
    console.warn(`Enemy validation failed: ${enemyValidation.reason}`);
    return;
  }

  // 3. Apply damage only if enemy is active
  if (enemy.active) {
    enemy.takeDamage(message.damage);
  }
}
```

### Room Progression

Host controls all room-related logic:

1. **Room Activation** - Triggers when host enters
2. **Door Management** - Locks during combat, unlocks on clear
3. **Enemy Spawning** - Spawns enemies for the room
4. **Teleport Guest** - Brings guest to host on room activation

---

## Guest Responsibilities

### Input Sending

Guest sends input-related messages to host:

```
┌──────────────────────────────────────────────────────────────────┐
│                    GUEST INPUT FLOW                              │
└──────────────────────────────────────────────────────────────────┘

   Guest                                             Host
    │                                                  │
    │  Player presses attack                           │
    │  ├─ Local visual feedback                        │
    │  └─ Send PLAYER_ATTACK                           │
    │ ────────────────────────────────────────────────►│
    │                                                  │
    │  Attack hits enemy (local detection)             │
    │  └─ Send PLAYER_HIT                              │
    │ ────────────────────────────────────────────────►│
    │                                   Validate hit   │
    │                                   Apply damage   │
    │                                                  │
    │                          ENEMY_UPDATE            │
    │◄────────────────────────────────────────────────│
    │  (Reflects HP change)                            │
    │                                                  │
```

### Visual Rendering

Guest renders based on host data:

- **Host Player** - Rendered as `RemotePlayer` sprite
- **Enemies** - Created/updated from `ENEMY_UPDATE` messages
- **Loot** - Displayed from `LOOT_SPAWN` messages
- **Effects** - Attack projectiles from `PLAYER_ATTACK`

### State Reception

Guest receives and applies these state updates:

| Message | Guest Action |
|---------|--------------|
| `HOST_STATE` | Update helper stats (75% of host) |
| `ENEMY_UPDATE` | Create/update/destroy enemy sprites |
| `ROOM_ACTIVATED` | Teleport to host, mark room safe |
| `ROOM_CLEAR` | Exit spectate mode if dead |
| `SCENE_CHANGE` | Transition to new scene |
| `INVENTORY_UPDATE` | Sync inventory display |

---

## Anti-Cheat Validation

The host performs several validations to prevent cheating.

### Damage Limits

```typescript
// MessageValidator.ts
const MAX_DAMAGE_PER_HIT = 1000;

export function validateDamage(damage: number): ValidationResult {
  if (typeof damage !== 'number' || isNaN(damage)) {
    return { valid: false, reason: 'Damage must be a number' };
  }
  if (damage < 0) {
    return { valid: false, reason: 'Damage cannot be negative' };
  }
  if (damage > MAX_DAMAGE_PER_HIT) {
    return { valid: false, reason: `Damage exceeds max of ${MAX_DAMAGE_PER_HIT}` };
  }
  return { valid: true };
}
```

### Position Delta Checks

```typescript
// MessageValidator.ts
const MAX_POSITION_DELTA = 100; // pixels per update

export function validatePositionDelta(
  oldX: number, oldY: number,
  newX: number, newY: number
): ValidationResult {
  const deltaX = Math.abs(newX - oldX);
  const deltaY = Math.abs(newY - oldY);

  if (deltaX > MAX_POSITION_DELTA || deltaY > MAX_POSITION_DELTA) {
    return { valid: false, reason: 'Position change too large (possible teleport)' };
  }
  return { valid: true };
}
```

**Note:** Position validation logs warnings but doesn't reject, as legitimate room transitions can cause large position changes.

### Enemy ID Validation

```typescript
// MessageValidator.ts
export function validateEnemyId(
  enemyId: string,
  validEnemyIds: Set<string>
): ValidationResult {
  if (!validEnemyIds.has(enemyId)) {
    return { valid: false, reason: 'Invalid enemy ID' };
  }
  return { valid: true };
}
```

The host maintains a map of all valid enemy IDs:
```typescript
// HostController.ts
private enemyIdMap: Map<Enemy, string> = new Map();

// Build validation set
const validEnemyIds = new Set<string>(this.enemyIdMap.values());
```

### Message Structure Validation

```typescript
// MessageValidator.ts
export function validateSyncMessage(message: SyncMessage): ValidationResult {
  if (!message || typeof message !== 'object') {
    return { valid: false, reason: 'Message must be an object' };
  }
  if (!message.type || typeof message.type !== 'string') {
    return { valid: false, reason: 'Message must have a type' };
  }
  return { valid: true };
}
```

### Room Code Validation

```typescript
// MessageValidator.ts
const VALID_ROOM_CODE_REGEX = /^[A-Z0-9]{4,8}$/;

export function validateRoomCode(code: string): ValidationResult {
  if (!VALID_ROOM_CODE_REGEX.test(code)) {
    return { valid: false, reason: 'Invalid room code format' };
  }
  return { valid: true };
}
```

---

## Sequence Diagrams

### Full Connection Sequence

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE CONNECTION SEQUENCE                          │
└──────────────────────────────────────────────────────────────────────────┘

   Host                    Trystero                    Guest
    │                         │                           │
    │  hostGame()             │                           │
    │────────────────────────►│                           │
    │                         │                           │
    │  roomCode: "X7K3NP"     │                           │
    │◄────────────────────────│                           │
    │                         │                           │
    │  State: 'waiting'       │                           │
    │  Display code to user   │                           │
    │                         │                           │
    │                         │           joinGame("X7K3NP")
    │                         │◄──────────────────────────│
    │                         │                           │
    │       ═══════════════ WebRTC Handshake ═══════════════
    │                         │                           │
    │  onPeerJoin(guestId)    │      onPeerJoin(hostId)   │
    │◄────────────────────────┼──────────────────────────►│
    │                         │                           │
    │  State: 'connected'     │        State: 'connected' │
    │                         │                           │
    │  createRemotePlayer()   │                           │
    │  sendInitialState()     │                           │
    │                         │                           │
    │  ─────────── HOST_STATE ────────────────────────────►
    │  ─────────── INVENTORY_UPDATE ──────────────────────►
    │  ─────────── ROOM_DATA ─────────────────────────────►
    │                         │                           │
    │                         │     createHostPlayer()    │
    │                         │     Apply initial state   │
    │                         │                           │
    │  ════════════════ GAMEPLAY BEGINS ══════════════════
    │                         │                           │
```

### Combat Sequence

```
┌──────────────────────────────────────────────────────────────────────────┐
│                       COMBAT SEQUENCE                                    │
└──────────────────────────────────────────────────────────────────────────┘

   Host                                             Guest
    │                                                  │
    │  Enemy AI targets guest                          │
    │  Enemy moves toward guest                        │
    │                                                  │
    │  ─────────── ENEMY_UPDATE ──────────────────────►│
    │  {enemies: [{id: "enemy_1", x, y, hp, state}]}   │
    │                                                  │
    │                                  Render enemy    │
    │                                  movement        │
    │                                                  │
    │                                  Guest attacks   │
    │◄──────────── PLAYER_ATTACK ─────────────────────│
    │  {attackType, direction, x, y, angle}            │
    │                                                  │
    │  Render guest attack                             │
    │  visual effect                                   │
    │                                                  │
    │                                  Local hit       │
    │                                  detection       │
    │◄──────────── PLAYER_HIT ────────────────────────│
    │  {enemyId: "enemy_1", damage: 25}                │
    │                                                  │
    │  validateDamage(25) ✓                            │
    │  validateEnemyId("enemy_1") ✓                    │
    │  enemy.takeDamage(25)                            │
    │                                                  │
    │  ─────────── ENEMY_UPDATE ──────────────────────►│
    │  {enemies: [{id: "enemy_1", hp: 75, ...}]}       │
    │                                                  │
    │                                  Update enemy    │
    │                                  health bar      │
    │                                                  │
```

### Room Transition Sequence

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    ROOM TRANSITION SEQUENCE                              │
└──────────────────────────────────────────────────────────────────────────┘

   Host                                             Guest
    │                                                  │
    │  Host enters new room                            │
    │  Room activation triggers                        │
    │                                                  │
    │  broadcastRoomActivated(roomId)                  │
    │  ─────────── ROOM_ACTIVATED ────────────────────►│
    │  {roomId: 3, hostX: 500, hostY: 300}             │
    │                                                  │
    │                                  visitedRoomIds  │
    │                                    .add(3)       │
    │                                                  │
    │                                  Teleport to     │
    │                                  (520, 300)      │
    │                                                  │
    │                                  Visual flash    │
    │                                  effect          │
    │                                                  │
    │  Spawn room enemies                              │
    │  registerEnemy() for each                        │
    │                                                  │
    │  ─────────── ENEMY_UPDATE ──────────────────────►│
    │  {enemies: [new enemies...]}                     │
    │                                                  │
    │                                  Create enemy    │
    │                                  sprites         │
    │                                                  │
```

### Reconnection Sequence

```
┌──────────────────────────────────────────────────────────────────────────┐
│                    RECONNECTION SEQUENCE                                 │
└──────────────────────────────────────────────────────────────────────────┘

   Host                                             Guest
    │                                                  │
    │  ═══════════ CONNECTION LOST ═══════════════════
    │                                                  │
    │  onPeerLeave()                                   │
    │  State: 'waiting'                                │
    │  showWaitingUI()                                 │
    │                                                  │
    │                               onPeerLeave()      │
    │                               State: 'reconnecting'
    │                               showReconnectingUI()
    │                                                  │
    │                               Attempt 1/5        │
    │                               Wait 2000ms        │
    │                               rejoinRoom()       │
    │                                                  │
    │       ═══════════════ WebRTC Handshake ═══════════════
    │                                                  │
    │  onPeerJoin()                  onPeerJoin()      │
    │  State: 'connected'            State: 'connected'│
    │                                                  │
    │  hideWaitingUI()               hideReconnectUI() │
    │  sendInitialState()                              │
    │                                                  │
    │  ─────────── HOST_STATE ────────────────────────►│
    │  ─────────── ENEMY_UPDATE ──────────────────────►│
    │                                                  │
    │  ════════════════ GAMEPLAY RESUMES ═════════════
    │                                                  │
```

---

## File Reference

| File | Purpose |
|------|---------|
| `NetworkManager.ts` | Connection management, Trystero integration |
| `SyncMessages.ts` | Message type definitions and interfaces |
| `PlayerSync.ts` | Local player position broadcasting |
| `RemotePlayer.ts` | Remote player sprite with interpolation |
| `HostController.ts` | Host-side game state management |
| `GuestController.ts` | Guest-side state reception and rendering |
| `MessageValidator.ts` | Anti-cheat validation functions |
| `index.ts` | Module exports |

---

## Constants Reference

| Constant | Value | Location | Purpose |
|----------|-------|----------|---------|
| `APP_ID` | `infernal-ascent-coop` | NetworkManager | Trystero app identifier |
| `SEND_INTERVAL_MS` | 50 | PlayerSync | Position update rate |
| `POSITION_THRESHOLD` | 2 | PlayerSync | Min position delta to send |
| `LERP_SPEED` | 0.3 | RemotePlayer | Interpolation factor |
| `ENEMY_UPDATE_INTERVAL_MS` | 50 | HostController | Enemy sync rate |
| `HOST_STATE_INTERVAL_MS` | 1000 | HostController | Host stats sync rate |
| `MAX_RECONNECT_ATTEMPTS` | 5 | NetworkManager | Reconnection limit |
| `RECONNECT_DELAY_MS` | 2000 | NetworkManager | Delay between attempts |
| `MAX_DAMAGE_PER_HIT` | 1000 | MessageValidator | Anti-cheat limit |
| `MAX_POSITION_DELTA` | 100 | MessageValidator | Anti-cheat limit |
