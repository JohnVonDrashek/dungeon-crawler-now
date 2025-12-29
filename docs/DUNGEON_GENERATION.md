# Dungeon Generation

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.80-orange.svg)](https://phaser.io/)

This document describes the procedural dungeon generation system used in the game, including room placement, corridor generation, Wang tile rendering, and the room state machine.

---

## Table of Contents

1. [Generation Algorithm](#generation-algorithm)
   - [BSP Approach](#bsp-approach)
   - [Room Placement Rules](#room-placement-rules)
   - [Corridor Generation](#corridor-generation)
   - [Seed-Based Determinism](#seed-based-determinism)
2. [Room Types](#room-types)
   - [Spawn Room](#spawn-room)
   - [Normal Rooms](#normal-rooms)
   - [Treasure Rooms](#treasure-rooms)
   - [Trap Rooms](#trap-rooms)
   - [Shrine Rooms](#shrine-rooms)
   - [Challenge Rooms](#challenge-rooms)
   - [Exit Room](#exit-room)
3. [Dungeon Dimensions](#dungeon-dimensions)
   - [Grid Size](#grid-size)
   - [Room Size Constraints](#room-size-constraints)
   - [Corridor Width](#corridor-width)
4. [Wang Tile System](#wang-tile-system)
   - [What Are Wang Tiles](#what-are-wang-tiles)
   - [Corner-Based Autotiling](#corner-based-autotiling)
   - [16-Tile Complete Set](#16-tile-complete-set)
   - [Texture Selection](#texture-selection)
5. [Room State Machine](#room-state-machine)
   - [State Definitions](#state-definitions)
   - [State Transitions](#state-transitions)
   - [Door Activation](#door-activation)
   - [Enemy Spawning Triggers](#enemy-spawning-triggers)

---

## Generation Algorithm

The dungeon generator creates procedural levels using a modified BSP (Binary Space Partitioning) approach combined with random room placement.

**Source:** `/src/systems/DungeonGenerator.ts`

### BSP Approach

While traditional BSP recursively divides space into binary partitions, this implementation uses a **rejection sampling** variant:

1. Initialize the entire grid as walls (value `1`)
2. Attempt to place rooms randomly within the grid
3. Reject rooms that overlap with existing rooms (with padding)
4. Continue until the target room count is reached or max attempts exceeded

```
┌─────────────────────────────────────────────────────────────┐
│                         WALLS (1)                           │
│    ┌──────────┐                        ┌──────────┐         │
│    │ FLOOR(0) │                        │ FLOOR(0) │         │
│    │  Room 0  │       ═══════          │  Room 2  │         │
│    │  (Spawn) │           ║            │          │         │
│    └──────────┘           ║            └──────────┘         │
│         ║                 ║                  ║               │
│         ╚═════════════════╝                  ║               │
│                   ┌──────────────────┐       ║               │
│                   │     FLOOR(0)     │═══════╝               │
│                   │      Room 1      │                       │
│                   │                  │                       │
│                   └──────────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### Room Placement Rules

Rooms are placed following these constraints:

| Rule | Value | Description |
|------|-------|-------------|
| Target Count | 6-10 rooms | `Math.floor(random() * 5) + 6` |
| Max Attempts | `numRooms * 50` | Prevents infinite loops |
| Edge Padding | 1 tile | Rooms cannot touch dungeon boundaries |
| Room Padding | 2 tiles | Minimum gap between rooms |

**Overlap Detection:**

```typescript
private roomsOverlap(a: Room, b: Room): boolean {
  const padding = 2; // Minimum space between rooms
  return (
    a.x - padding < b.x + b.width &&
    a.x + a.width + padding > b.x &&
    a.y - padding < b.y + b.height &&
    a.y + a.height + padding > b.y
  );
}
```

### Corridor Generation

Corridors connect adjacent rooms in sequence using **L-shaped paths**:

```
Room A ────────┐
               │
               └──────── Room B
```

**Algorithm:**
1. For each pair of adjacent rooms (i-1, i), connect their centers
2. Randomly choose horizontal-first or vertical-first routing (50/50)
3. Carve a 2-tile wide corridor for better navigation

```typescript
if (random() < 0.5) {
  carveHorizontalCorridor(roomA.centerX, roomB.centerX, roomA.centerY);
  carveVerticalCorridor(roomA.centerY, roomB.centerY, roomB.centerX);
} else {
  carveVerticalCorridor(roomA.centerY, roomB.centerY, roomA.centerX);
  carveHorizontalCorridor(roomA.centerX, roomB.centerX, roomB.centerY);
}
```

**Corridor Width:** 2 tiles (64 pixels) - provides comfortable player movement

### Seed-Based Determinism

The generator uses a **Mulberry32** PRNG (Pseudo-Random Number Generator) for deterministic dungeon generation:

```typescript
private random(): number {
  this.randomState += 0x6D2B79F5;
  let t = this.randomState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
```

**Seed Handling:**
- String seeds are hashed using `djb2` variant: `hash = ((hash << 5) - hash) + charCode`
- If no seed provided, uses `Math.random() * 2147483647`
- Same seed = identical dungeon layout (critical for multiplayer sync)

---

## Room Types

Each room has a `type` property from the `RoomType` enum:

**Source:** `/src/systems/DungeonGenerator.ts`

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

### Spawn Room

| Property | Value |
|----------|-------|
| Type | `RoomType.SPAWN` |
| Room ID | Always `0` (first room) |
| Initial State | `CLEARED` (no enemies) |
| Player Spawn | Room center point |

The spawn room is always the first generated room and starts in the cleared state.

### Normal Rooms

| Property | Value |
|----------|-------|
| Type | `RoomType.NORMAL` |
| Enemy Count | `max(1, roomArea / 150) + floor / 3` (max 6) |
| State | Starts `UNVISITED` |

Default room type containing standard enemy encounters.

### Treasure Rooms

| Property | Value |
|----------|-------|
| Type | `RoomType.TREASURE` |
| Assignment Chance | 60% per available slot |
| Contents | Enhanced loot drops |

### Trap Rooms

| Property | Value |
|----------|-------|
| Type | `RoomType.TRAP` |
| Assignment Chance | 60% per available slot |
| Hazards | Environmental dangers |

### Shrine Rooms

| Property | Value |
|----------|-------|
| Type | `RoomType.SHRINE` |
| Assignment Chance | 60% per available slot |
| Feature | Buff/blessing stations |

### Challenge Rooms

| Property | Value |
|----------|-------|
| Type | `RoomType.CHALLENGE` |
| Assignment Chance | 60% per available slot |
| Enemy Count | `max(2, roomArea / 100) + floor / 2` (max 8) |
| Enemy Scaling | `effectiveFloor = floor + 2` |
| Rewards | Better XP and loot |

Challenge rooms spawn more enemies with higher stats.

### Exit Room

| Property | Value |
|----------|-------|
| Type | `RoomType.EXIT` |
| Room ID | Always `rooms.length - 1` (last room) |
| Boss Floor | Contains Sin Boss on every 5th floor |
| Exit Point | Room center coordinates |

**Room Type Assignment Algorithm:**

```
1. rooms[0].type = SPAWN (guaranteed)
2. rooms[last].type = EXIT (guaranteed)
3. Shuffle middle rooms randomly
4. For each middle room:
   - 60% chance to assign next special type in sequence
   - Sequence: [TREASURE, SHRINE, TRAP, CHALLENGE]
   - Remaining rooms stay NORMAL
```

---

## Dungeon Dimensions

All dimension constants are defined in `/src/utils/constants.ts`.

### Grid Size

| Constant | Value | Description |
|----------|-------|-------------|
| `DUNGEON_WIDTH` | 100 tiles | Horizontal grid size |
| `DUNGEON_HEIGHT` | 100 tiles | Vertical grid size |
| `TILE_SIZE` | 32 pixels | Size per tile |

**Total Playable Area:** 3,200 x 3,200 pixels (100 x 32)

```
┌──────────────────────────────────────────────────────────────┐
│                     100 tiles (3200px)                       │
├──────────────────────────────────────────────────────────────┤
│                                                          100 │
│                                                        tiles │
│                     DUNGEON GRID                       (3200 │
│                                                         px)  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Room Size Constraints

| Constant | Value | Pixels |
|----------|-------|--------|
| `MIN_ROOM_SIZE` | 16 tiles | 512 pixels |
| `MAX_ROOM_SIZE` | 32 tiles | 1,024 pixels |

Room dimensions are calculated:

```typescript
const roomWidth = Math.floor(random() * (MAX_ROOM_SIZE - MIN_ROOM_SIZE + 1)) + MIN_ROOM_SIZE;
const roomHeight = Math.floor(random() * (MAX_ROOM_SIZE - MIN_ROOM_SIZE + 1)) + MIN_ROOM_SIZE;
```

**Room Area Range:**
- Minimum: 16 x 16 = 256 tiles (262,144 sq pixels)
- Maximum: 32 x 32 = 1,024 tiles (1,048,576 sq pixels)

### Corridor Width

| Direction | Width | Notes |
|-----------|-------|-------|
| Horizontal | 2 tiles (64px) | `tiles[y][x]` and `tiles[y+1][x]` |
| Vertical | 2 tiles (64px) | `tiles[y][x]` and `tiles[y][x+1]` |

Two-tile width ensures comfortable player navigation and prevents pathfinding issues.

---

## Wang Tile System

The Wang tile system provides seamless terrain transitions between floor and wall areas.

**Source:** `/src/systems/WangTileSystem.ts`

### What Are Wang Tiles

Wang tiles are square tiles with **colored edges** (or in this case, **corner terrain values**) that are arranged to match adjacent tiles' edges. This creates seamless transitions without visible seams.

```
Traditional Wang Tiles (edge-based):

    A          B          Placed
  ┌───┐      ┌───┐      ┌───┬───┐
  │ 1 │      │ 1 │      │ 1 │ 1 │  ← Top edges match
2 │   │ 1  2 │   │ 2  2 │   │   │ 2
  │ 2 │      │ 2 │      │ 2 │ 2 │  ← Bottom edges match
  └───┘      └───┘      └───┴───┘
                              ↑
                        Right of A matches Left of B
```

### Corner-Based Autotiling

This implementation uses **corner-based** Wang tiles rather than edge-based. Each tile's appearance is determined by the terrain type at its four corners:

```
  NW ────── NE
   │        │
   │  TILE  │
   │        │
  SW ────── SE

Corner Values:
  0 = floor (lower terrain)
  1 = wall (upper terrain)
```

**Corner Code Calculation:**

```typescript
const code = (nw ? 1 : 0) + (ne ? 2 : 0) + (sw ? 4 : 0) + (se ? 8 : 0);
// Results in values 0-15 (2^4 combinations)
```

| NW | NE | SW | SE | Code | Visual |
|----|----|----|----|----|--------|
| 0 | 0 | 0 | 0 | 0 | Pure floor |
| 1 | 0 | 0 | 0 | 1 | NW corner wall |
| 0 | 1 | 0 | 0 | 2 | NE corner wall |
| 1 | 1 | 0 | 0 | 3 | North edge wall |
| 0 | 0 | 1 | 0 | 4 | SW corner wall |
| ... | ... | ... | ... | ... | ... |
| 1 | 1 | 1 | 1 | 15 | Pure wall |

### 16-Tile Complete Set

The complete Wang tileset contains exactly 16 tiles covering all possible corner combinations:

```
┌────────────────────────────────────────────────────┐
│  Frame Layout (4x4 grid, 32x32 pixels each)        │
├────────────────────────────────────────────────────┤
│                                                    │
│   [0,0]    [32,0]   [64,0]   [96,0]               │
│   Code 11  Code 5   Code 2   Code 3               │
│                                                    │
│   [0,32]   [32,32]  [64,32]  [96,32]              │
│   Code 10  Code 1   Code 0   Code 8               │
│                                                    │
│   [0,64]   [32,64]  [64,64]  [96,64]              │
│   Code 13  Code 12  Code 4   Code 6               │
│                                                    │
│   [0,96]   [32,96]  [64,96]  [96,96]              │
│   Code 15  Code 7   Code 9   Code 14              │
│                                                    │
└────────────────────────────────────────────────────┘

Legend:
  Code 0  = Pure floor (all corners floor)
  Code 15 = Pure wall (all corners wall)
  Code 1-14 = Transition tiles
```

**Available Tilesets:**

All seven deadly sin worlds plus the hub use the standard Wang mapping:

```typescript
export const WANG_TILESETS: Record<string, WangTileMapping> = {
  'pride': STANDARD_WANG_MAPPING,
  'greed': STANDARD_WANG_MAPPING,
  'wrath': STANDARD_WANG_MAPPING,
  'sloth': STANDARD_WANG_MAPPING,
  'envy': STANDARD_WANG_MAPPING,
  'gluttony': STANDARD_WANG_MAPPING,
  'lust': STANDARD_WANG_MAPPING,
  'hub': STANDARD_WANG_MAPPING,
};
```

### Texture Selection

The system determines which tile frame to use based on neighboring cells:

**Simple Corner Detection (recommended):**

```typescript
export function getSimpleCornerValues(tiles, x, y, width, height) {
  // If current tile is wall, all corners are wall
  if (current === 1) {
    return { nw: true, ne: true, sw: true, se: true };
  }

  // For floor tiles, check orthogonal AND diagonal neighbors
  const north = getTile(x, y - 1) === 1;
  const south = getTile(x, y + 1) === 1;
  const west = getTile(x - 1, y) === 1;
  const east = getTile(x + 1, y) === 1;

  const northWest = getTile(x - 1, y - 1) === 1;
  const northEast = getTile(x + 1, y - 1) === 1;
  const southWest = getTile(x - 1, y + 1) === 1;
  const southEast = getTile(x + 1, y + 1) === 1;

  // Corner shows wall if ANY wall touches it
  const nw = north || west || northWest;
  const ne = north || east || northEast;
  const sw = south || west || southWest;
  const se = south || east || southEast;

  return { nw, ne, sw, se };
}
```

**Visual Example:**

```
Dungeon Grid:           Corner Codes:         Rendered Result:
1 1 1 1 1              15 15 15 15 15         ████████████████
1 0 0 0 1              11  3  3  7 15         ██┌────────┐████
1 0 0 0 1              10  0  0  5 15         ██│ FLOOR  │████
1 0 0 0 1              14 12 12 13 15         ██└────────┘████
1 1 1 1 1              15 15 15 15 15         ████████████████

0 = floor, 1 = wall
Transition tiles create smooth rounded corners
```

---

## Room State Machine

The room manager tracks player location and manages room activation states.

**Source:** `/src/systems/RoomManager.ts`

### State Definitions

```typescript
export enum RoomState {
  UNVISITED = 'unvisited',  // Player hasn't entered deeply enough
  ACTIVE = 'active',         // Combat in progress, doors locked
  CLEARED = 'cleared',       // All enemies defeated, doors open
}
```

### State Transitions

```
                          ┌─────────────────────────────────────────────────┐
                          │                                                 │
                          ▼                                                 │
                    ┌───────────┐                                           │
           ┌───────►│ UNVISITED │◄──────────────────────────────────┐       │
           │        └─────┬─────┘                                   │       │
           │              │                                         │       │
           │              │ Player enters deep enough               │       │
           │              │ (1+ tiles from edge)                    │       │
           │              ▼                                         │       │
           │        ┌───────────┐                                   │       │
           │        │  ACTIVE   │──────────────────────────────────►│       │
           │        └─────┬─────┘                                   │       │
           │              │                                         │       │
           │              │ All enemies killed                      │       │
           │              │ (enemyCount == 0)                       │       │
           │              ▼                                         │       │
           │        ┌───────────┐                                   │       │
           │        │  CLEARED  │                                   │       │
           └────────┴───────────┴───────────────────────────────────┘       │
                          │                                                 │
                          │ (State persists for session)                    │
                          │                                                 │
                          └─────────────────────────────────────────────────┘

Note: Spawn room (ID 0) starts CLEARED, skipping UNVISITED state
```

### Door Activation

Doors are physics-enabled sprites that block player movement during combat:

**Door Closed (ACTIVE state):**
```typescript
door.setVisible(true);
door.setActive(true);
door.body.enable = true;  // Collision enabled
```

**Door Open (CLEARED/UNVISITED state):**
```typescript
door.setVisible(false);
door.setActive(false);
door.body.enable = false;  // No collision
```

**Door Detection:**

Doors are placed in corridors just outside room boundaries:

```typescript
private findDoors(): void {
  // Check each edge of the room
  // Top edge: y = room.y - 1 (corridor position)
  // Bottom edge: y = room.y + room.height
  // Left edge: x = room.x - 1
  // Right edge: x = room.x + room.width

  // Valid doorway requires walls on perpendicular sides
  const isValid = hasLeftWall || hasRightWall; // for horizontal
  const isValid = hasTopWall || hasBottomWall; // for vertical
}
```

### Enemy Spawning Triggers

**Source:** `/src/systems/EnemySpawnManager.ts`

**Activation Condition:**

```typescript
// Player must be 1+ tiles inside the room edge
private isPlayerDeepInRoom(playerX, playerY, room): boolean {
  const margin = 1;
  return (
    tileX >= room.x + margin &&
    tileX < room.x + room.width - margin &&
    tileY >= room.y + margin &&
    tileY < room.y + room.height - margin
  );
}
```

**Spawn Sequence:**

```
1. Player enters room deeply
   └── RoomManager.update() returns room

2. Room activation begins
   ├── Close doors (collision enabled)
   ├── Show darkness overlay (outside room)
   ├── Play door slam sound
   ├── Switch to combat music
   └── Camera shake (3 intensity, 150ms)

3. Spawn indicators appear
   ├── Pulsing warning circles at spawn positions
   ├── Color: red (normal), gold (boss), purple (challenge)
   └── Duration: 1.2s (normal), 2s (boss)

4. Enemies spawn with pop effect
   ├── Scale 0 → 1 (200ms, Back.easeOut)
   ├── Health bars created
   └── Enemies target player

5. Combat until all enemies killed
   └── onEnemyKilled() checks remaining count

6. Room cleared
   ├── Open doors (collision disabled)
   ├── Hide darkness overlay
   ├── Switch to exploration music
   └── Emit 'roomCleared' event
```

**Enemy Count Formulas:**

| Room Type | Formula | Max |
|-----------|---------|-----|
| Normal | `max(1, roomArea / 150) + floor / 3` | 6 |
| Challenge | `max(2, roomArea / 100) + floor / 2` | 8 |
| Boss | Fixed | 1 |

---

## Related Files

| File | Description |
|------|-------------|
| `/src/systems/DungeonGenerator.ts` | Core generation algorithm |
| `/src/systems/RoomManager.ts` | Room state machine |
| `/src/systems/WangTileSystem.ts` | Autotile rendering |
| `/src/systems/EnemySpawnManager.ts` | Enemy spawn logic |
| `/src/utils/constants.ts` | Dimension constants |

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
