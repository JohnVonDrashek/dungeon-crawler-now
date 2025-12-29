# Dungeon Generation API Reference

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Phaser 3](https://img.shields.io/badge/Phaser%203-3.x-blue)](https://phaser.io/)

Complete API reference for the procedural dungeon generation system. This system generates tile-based dungeons with rooms, corridors, and special room types using a seeded random algorithm.

---

## Table of Contents

- [Overview](#overview)
- [Core Types](#core-types)
  - [RoomType Enum](#roomtype-enum)
  - [Room Interface](#room-interface)
  - [DungeonData Interface](#dungeondata-interface)
- [DungeonGenerator Class](#dungeongenerator-class)
  - [Constructor](#constructor)
  - [Public Methods](#public-methods)
- [RoomManager Class](#roommanager-class)
  - [Constructor](#constructor-1)
  - [Public Methods](#public-methods-1)
  - [Events](#events)
- [Generation Algorithm](#generation-algorithm)
- [Configuration Constants](#configuration-constants)
- [Usage Examples](#usage-examples)
- [Best Practices](#best-practices)

---

## Overview

The dungeon generation system creates procedural dungeons using a randomized room placement algorithm with L-shaped corridor connections. Key features include:

- **Seeded Generation**: Reproducible dungeons via string or numeric seeds
- **Room Types**: Seven distinct room types with unique gameplay purposes
- **Automatic Room Assignment**: Special rooms are assigned with controlled randomness
- **Corridor Generation**: L-shaped corridors connect adjacent rooms
- **Door Detection**: Automatic identification of doorway positions
- **Multiplayer Support**: Same seed produces identical dungeons across clients

---

## Core Types

### RoomType Enum

Defines the functional type of each room in the dungeon.

**Location**: `/src/systems/DungeonGenerator.ts`

```typescript
export enum RoomType {
  NORMAL = 'normal',
  SPAWN = 'spawn',
  EXIT = 'exit',
  TREASURE = 'treasure',
  TRAP = 'trap',
  SHRINE = 'shrine',
  CHALLENGE = 'challenge',
}
```

#### Room Type Details

| Type | Value | Description | Gameplay Effect |
|------|-------|-------------|-----------------|
| `NORMAL` | `'normal'` | Standard combat room | Contains regular enemies |
| `SPAWN` | `'spawn'` | Player starting room | First room, starts cleared, no enemies |
| `EXIT` | `'exit'` | Floor exit room | Contains exit portal to next floor |
| `TREASURE` | `'treasure'` | Loot room | Contains treasure chest with guaranteed rare+ items |
| `TRAP` | `'trap'` | Hazard room | Contains spike traps and environmental hazards |
| `SHRINE` | `'shrine'` | Healing room | Contains healing shrine for full HP restore |
| `CHALLENGE` | `'challenge'` | Elite encounter room | Contains stronger enemies, marked with skull corners |

---

### Room Interface

Represents a single room in the dungeon.

**Location**: `/src/systems/DungeonGenerator.ts`

```typescript
export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  id: number;
  doors: { x: number; y: number }[];
  type: RoomType;
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `x` | `number` | Left edge X coordinate in tile units |
| `y` | `number` | Top edge Y coordinate in tile units |
| `width` | `number` | Room width in tiles (16-32 tiles) |
| `height` | `number` | Room height in tiles (16-32 tiles) |
| `centerX` | `number` | Center X coordinate in tile units |
| `centerY` | `number` | Center Y coordinate in tile units |
| `id` | `number` | Unique room identifier (0-indexed) |
| `doors` | `{ x: number; y: number }[]` | Array of doorway positions in tile coordinates |
| `type` | `RoomType` | Functional type of the room |

#### Notes

- Room `id` corresponds to generation order; `id: 0` is always the spawn room
- The last room (`rooms[rooms.length - 1]`) is always the exit room
- `doors` array is populated after corridor generation
- Coordinates are in tile units, not pixels

---

### DungeonData Interface

Complete dungeon structure returned by the generator.

**Location**: `/src/systems/DungeonGenerator.ts`

```typescript
export interface DungeonData {
  tiles: number[][];
  rooms: Room[];
  spawnPoint: { x: number; y: number };
  exitPoint: { x: number; y: number };
}
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `tiles` | `number[][]` | 2D array representing the dungeon grid |
| `rooms` | `Room[]` | Array of all generated rooms |
| `spawnPoint` | `{ x: number; y: number }` | Player spawn location (center of spawn room) |
| `exitPoint` | `{ x: number; y: number }` | Exit location (center of exit room) |

#### Tile Values

| Value | Meaning |
|-------|---------|
| `0` | Floor (walkable) |
| `1` | Wall (solid, blocks movement) |

---

## DungeonGenerator Class

Main class for procedural dungeon generation.

**Location**: `/src/systems/DungeonGenerator.ts`

### Constructor

```typescript
constructor(width: number, height: number, seed?: string)
```

Creates a new dungeon generator instance.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `width` | `number` | Yes | - | Dungeon width in tiles |
| `height` | `number` | Yes | - | Dungeon height in tiles |
| `seed` | `string` | No | Random | Seed string for reproducible generation |

#### Seed Behavior

- If `seed` is provided, it's converted to a numeric hash using a 32-bit integer hash function
- If `seed` is omitted, a random seed is generated using `Math.random()`
- Same seed always produces identical dungeon layouts
- Useful for multiplayer synchronization (both clients use room code as seed)

#### Example

```typescript
// Random dungeon
const generator = new DungeonGenerator(100, 100);

// Seeded dungeon (reproducible)
const generator = new DungeonGenerator(100, 100, 'ABCD1234');

// Multiplayer dungeon (both clients generate same layout)
const seed = networkManager.roomCode;
const generator = new DungeonGenerator(DUNGEON_WIDTH, DUNGEON_HEIGHT, seed);
```

---

### Public Methods

#### generate()

```typescript
generate(): DungeonData
```

Generates the complete dungeon and returns the dungeon data structure.

**Returns**: `DungeonData` - Complete dungeon structure with tiles, rooms, and spawn/exit points.

**Process**:
1. Initializes all tiles as walls (value `1`)
2. Generates 6-10 rooms using random placement with overlap detection
3. Carves floor tiles for each room
4. Connects rooms with L-shaped corridors (2 tiles wide)
5. Identifies door positions for each room
6. Assigns room types (spawn, exit, special rooms)
7. Returns complete dungeon data

**Example**:

```typescript
const generator = new DungeonGenerator(100, 100, 'my-seed');
const dungeon = generator.generate();

console.log(`Generated ${dungeon.rooms.length} rooms`);
console.log(`Spawn: (${dungeon.spawnPoint.x}, ${dungeon.spawnPoint.y})`);
console.log(`Exit: (${dungeon.exitPoint.x}, ${dungeon.exitPoint.y})`);
```

---

#### getEnemySpawnPositions()

```typescript
getEnemySpawnPositions(count: number, excludeRoom?: Room): { x: number; y: number }[]
```

Returns valid spawn positions for enemies distributed across rooms.

**Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `count` | `number` | Yes | Number of spawn positions to generate |
| `excludeRoom` | `Room` | No | Room to exclude from spawning (typically spawn room) |

**Returns**: `{ x: number; y: number }[]` - Array of spawn positions in tile coordinates.

**Notes**:
- Positions are distributed evenly across valid rooms
- Uses seeded random for reproducible results
- Coordinates are in tile units (multiply by `TILE_SIZE` for pixels)

**Example**:

```typescript
const dungeon = generator.generate();
const spawnRoom = dungeon.rooms[0]; // Spawn room

// Get 10 enemy spawn positions, excluding spawn room
const positions = generator.getEnemySpawnPositions(10, spawnRoom);

positions.forEach(pos => {
  spawnEnemy(pos.x * TILE_SIZE, pos.y * TILE_SIZE);
});
```

---

## RoomManager Class

Manages room states, doors, and player room transitions during gameplay.

**Location**: `/src/systems/RoomManager.ts`

### RoomState Enum

```typescript
export enum RoomState {
  UNVISITED = 'unvisited',
  ACTIVE = 'active',
  CLEARED = 'cleared',
}
```

| State | Description |
|-------|-------------|
| `UNVISITED` | Room not yet entered by player |
| `ACTIVE` | Player is in room, doors locked, enemies spawned |
| `CLEARED` | All enemies defeated, doors unlocked |

---

### Constructor

```typescript
constructor(scene: Phaser.Scene, dungeonData: DungeonData)
```

Creates a room manager for the dungeon.

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `scene` | `Phaser.Scene` | The Phaser scene for creating game objects |
| `dungeonData` | `DungeonData` | The generated dungeon data |

---

### Public Methods

#### getDoorGroup()

```typescript
getDoorGroup(): Phaser.Physics.Arcade.StaticGroup
```

Returns the physics group containing all door sprites.

**Returns**: `Phaser.Physics.Arcade.StaticGroup` - Door collision group for physics setup.

**Usage**: Set up collisions between player and doors to prevent exit during combat.

---

#### getRoomAtPosition()

```typescript
getRoomAtPosition(x: number, y: number): Room | null
```

Finds which room contains a given world position.

**Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | X position in pixels |
| `y` | `number` | Y position in pixels |

**Returns**: `Room | null` - The room at the position, or `null` if in a corridor.

---

#### update()

```typescript
update(playerX: number, playerY: number): Room | null
```

Updates room state based on player position. Call every frame.

**Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `playerX` | `number` | Player X position in pixels |
| `playerY` | `number` | Player Y position in pixels |

**Returns**: `Room | null` - Returns the room if it needs activation (triggers enemy spawn), otherwise `null`.

**Behavior**:
- Tracks which room the player is currently in
- Only returns a room when player enters an UNVISITED room deeply enough (1 tile margin)
- Prevents accidental room activation when stepping back immediately

---

#### activateRoom()

```typescript
activateRoom(roomId: number, enemyCount: number): void
```

Locks a room for combat by closing doors and showing darkness overlay.

**Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | `number` | ID of the room to activate |
| `enemyCount` | `number` | Number of enemies spawned in the room |

**Effects**:
- Sets room state to `ACTIVE`
- Makes all door sprites visible and enables collision
- Shows darkness overlay outside the room
- Emits `'doorsClosed'` event

---

#### onEnemyKilled()

```typescript
onEnemyKilled(activeEnemyCount: number): void
```

Notifies the room manager when an enemy is killed.

**Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `activeEnemyCount` | `number` | Current number of remaining active enemies |

**Behavior**:
- When `activeEnemyCount` reaches 0, clears the current room
- Opens doors and hides darkness overlay
- Emits `'roomCleared'` event

---

#### getRoomState()

```typescript
getRoomState(roomId: number): RoomState | undefined
```

Gets the current state of a specific room.

**Parameters**:

| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | `number` | ID of the room to query |

**Returns**: `RoomState | undefined` - The room's current state.

---

#### isRoomActive()

```typescript
isRoomActive(): boolean
```

Checks if the current room is in combat (doors locked).

**Returns**: `boolean` - `true` if the player's current room is in `ACTIVE` state.

---

### Events

The RoomManager emits events on the scene's event emitter:

| Event | Payload | Description |
|-------|---------|-------------|
| `'doorsClosed'` | None | Emitted when a room is activated and doors close |
| `'roomCleared'` | `roomId: number` | Emitted when all enemies in a room are defeated |

**Example**:

```typescript
scene.events.on('doorsClosed', () => {
  audioSystem.play('sfx_door_close');
});

scene.events.on('roomCleared', (roomId: number) => {
  console.log(`Room ${roomId} cleared!`);
  audioSystem.play('sfx_door_open');
});
```

---

## Generation Algorithm

### Room Generation

1. **Target Room Count**: 6-10 rooms per dungeon (random within range)
2. **Room Sizing**: Each room is 16-32 tiles in both width and height
3. **Placement**: Random positions with minimum 2-tile padding from edges
4. **Overlap Detection**: New rooms must not overlap existing rooms (2-tile padding between rooms)
5. **Attempt Limit**: Up to 50 attempts per room to find valid placement

### Corridor Generation

1. **Connection Order**: Rooms are connected sequentially (room 0 to room 1, room 1 to room 2, etc.)
2. **L-Shaped Corridors**: Each connection uses an L-shaped corridor
3. **Direction Selection**: Random 50/50 choice between horizontal-first or vertical-first
4. **Corridor Width**: All corridors are 2 tiles wide for comfortable navigation

### Door Detection

Doors are identified as corridor tiles adjacent to room edges:

1. Scans all four edges of each room
2. Checks tiles just outside the room boundary
3. Valid doorways have walls on at least one perpendicular side
4. Door positions stored in tile coordinates

### Room Type Assignment

1. **Spawn Room**: First generated room (id: 0)
2. **Exit Room**: Last generated room (id: rooms.length - 1)
3. **Special Rooms**: Middle rooms assigned with 60% probability each:
   - Treasure Room
   - Shrine Room
   - Trap Room
   - Challenge Room
4. **Normal Rooms**: Any unassigned rooms remain as normal combat rooms

---

## Configuration Constants

**Location**: `/src/utils/constants.ts`

| Constant | Value | Description |
|----------|-------|-------------|
| `DUNGEON_WIDTH` | `100` | Default dungeon width in tiles |
| `DUNGEON_HEIGHT` | `100` | Default dungeon height in tiles |
| `MIN_ROOM_SIZE` | `16` | Minimum room dimension in tiles |
| `MAX_ROOM_SIZE` | `32` | Maximum room dimension in tiles |
| `TILE_SIZE` | `32` | Size of each tile in pixels |

### Derived Values

| Calculation | Value | Description |
|-------------|-------|-------------|
| Dungeon pixel width | `3200px` | `DUNGEON_WIDTH * TILE_SIZE` |
| Dungeon pixel height | `3200px` | `DUNGEON_HEIGHT * TILE_SIZE` |
| Min room pixels | `512px` | `MIN_ROOM_SIZE * TILE_SIZE` |
| Max room pixels | `1024px` | `MAX_ROOM_SIZE * TILE_SIZE` |

---

## Usage Examples

### Basic Dungeon Generation

```typescript
import { DungeonGenerator, DungeonData } from '../systems/DungeonGenerator';
import { DUNGEON_WIDTH, DUNGEON_HEIGHT, TILE_SIZE } from '../utils/constants';

// Create generator with optional seed
const generator = new DungeonGenerator(DUNGEON_WIDTH, DUNGEON_HEIGHT, 'my-seed');

// Generate the dungeon
const dungeon: DungeonData = generator.generate();

// Access dungeon data
console.log(`Rooms: ${dungeon.rooms.length}`);
console.log(`Tiles: ${dungeon.tiles.length}x${dungeon.tiles[0].length}`);
```

### Creating Player at Spawn Point

```typescript
// Convert tile coordinates to pixel coordinates
const spawnX = dungeon.spawnPoint.x * TILE_SIZE + TILE_SIZE / 2;
const spawnY = dungeon.spawnPoint.y * TILE_SIZE + TILE_SIZE / 2;

const player = new Player(scene, spawnX, spawnY);
```

### Rendering Dungeon Tiles

```typescript
for (let y = 0; y < DUNGEON_HEIGHT; y++) {
  for (let x = 0; x < DUNGEON_WIDTH; x++) {
    const tileX = x * TILE_SIZE;
    const tileY = y * TILE_SIZE;

    if (dungeon.tiles[y][x] === 1) {
      // Wall tile
      const wall = wallGroup.create(tileX, tileY, 'wall');
      wall.setOrigin(0, 0);
      wall.setImmovable(true);
    } else {
      // Floor tile
      const floor = scene.add.sprite(tileX, tileY, 'floor');
      floor.setOrigin(0, 0);
    }
  }
}
```

### Multiplayer Synchronization

```typescript
import { networkManager } from '../multiplayer/NetworkManager';

// Use room code as seed for identical dungeons
const seed = networkManager.isMultiplayer
  ? networkManager.roomCode
  : undefined;

const generator = new DungeonGenerator(DUNGEON_WIDTH, DUNGEON_HEIGHT, seed);
const dungeon = generator.generate();

// Both host and guest now have identical dungeon layouts
```

### Room-Based Enemy Spawning

```typescript
const roomManager = new RoomManager(scene, dungeon);

// In update loop
const activatedRoom = roomManager.update(player.x, player.y);

if (activatedRoom) {
  // Player entered a new room - spawn enemies
  const enemyCount = calculateEnemyCount(activatedRoom.type);
  spawnEnemiesInRoom(activatedRoom, enemyCount);
  roomManager.activateRoom(activatedRoom.id, enemyCount);
}
```

### Floor Texture by Room Type

```typescript
import { RoomType } from '../systems/DungeonGenerator';

function getFloorTexture(room: Room | null): string {
  if (!room) return 'floor_corridor';

  switch (room.type) {
    case RoomType.TREASURE:
      return 'floor_treasure';
    case RoomType.TRAP:
      return 'floor_trap';
    case RoomType.SHRINE:
      return 'floor_shrine';
    case RoomType.CHALLENGE:
      return 'floor_challenge';
    default:
      return 'floor_default';
  }
}
```

### Checking Room Containment

```typescript
// Find which room contains a position
const room = roomManager.getRoomAtPosition(enemy.x, enemy.y);

if (room) {
  console.log(`Enemy is in room ${room.id} (${room.type})`);
}

// Check if position is inside a specific room
function isInsideRoom(x: number, y: number, room: Room): boolean {
  const tileX = Math.floor(x / TILE_SIZE);
  const tileY = Math.floor(y / TILE_SIZE);

  return (
    tileX >= room.x &&
    tileX < room.x + room.width &&
    tileY >= room.y &&
    tileY < room.y + room.height
  );
}
```

---

## Best Practices

### Seed Management

- **Development**: Use fixed seeds for debugging and testing
- **Production**: Omit seed for random dungeons in single-player
- **Multiplayer**: Always use shared seed (room code) for synchronized dungeons

### Performance Considerations

- Generate dungeons during scene loading, not during gameplay
- Cache `DungeonData` reference rather than regenerating
- Use room bounds for spatial queries instead of iterating all tiles

### Room State Flow

```
UNVISITED -> ACTIVE -> CLEARED
     |          |         ^
     |          +---------+
     |        (all enemies killed)
     |
     +-- Player enters room deeply (1+ tiles inside)
```

### Coordinate Systems

- **Tile Coordinates**: Used in `Room` interface and `tiles` array
- **Pixel Coordinates**: Used in Phaser game objects and physics
- **Conversion**: `pixelX = tileX * TILE_SIZE + TILE_SIZE / 2` (for center)

---

## Related Documentation

- [DUNGEON_GENERATION.md](/docs/DUNGEON_GENERATION.md) - Detailed generation concepts
- [COMBAT_API.md](/docs/api/COMBAT_API.md) - Combat system integration
- [NETWORK_API.md](/docs/api/NETWORK_API.md) - Multiplayer synchronization

---

## File Locations

| File | Purpose |
|------|---------|
| `/src/systems/DungeonGenerator.ts` | Core generation logic |
| `/src/systems/RoomManager.ts` | Runtime room state management |
| `/src/systems/RoomDecorationManager.ts` | Room decoration and interactables |
| `/src/utils/constants.ts` | Configuration constants |
| `/src/scenes/game/GameSceneInit.ts` | Integration example |

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/dungeon-crawler-now.svg "Repobeats analytics image")
