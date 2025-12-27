# Tile-Based Lighting System Design

## Overview

Replace Phaser's Light2D system with Terraria-style tile-based lighting using flood-fill propagation. Walls absorb light, creating soft shadows without hard polygon edges.

## Goals

- Smooth, natural-looking shadows that match pixel art aesthetic
- Walls block/absorb light realistically
- Colored lighting (RGB) for atmosphere
- Performant updates (only recalculate when needed)

## Data Structures

### Lightmap

```typescript
interface TileLightmap {
  width: number;      // 100 (DUNGEON_WIDTH)
  height: number;     // 100 (DUNGEON_HEIGHT)
  data: Uint8Array;   // width × height × 3 (RGB)
}
```

Three lightmap layers:
1. **staticLightmap** - Baked once at level start (wall torches, shrines, etc.)
2. **dynamicLightmap** - Player torch only, updated on tile change
3. **finalLightmap** - Combined at render time (max of static + dynamic)

### Light Source

```typescript
interface LightSource {
  tileX: number;
  tileY: number;
  intensity: number;  // How many tiles light reaches in open air
  color: { r: number; g: number; b: number };  // Normalized 0-1
}
```

### Absorption Values

| Tile Type | Light Cost |
|-----------|------------|
| Empty/Floor | -1 per tile |
| Wall | -4 per tile |

**Ambient light:** RGB(15, 15, 15) - very dim baseline visibility

## Flood Fill Algorithm

```
For each light source:
  1. Initialize BFS queue with light's tile at full intensity
  2. For each tile in queue:
     a. Calculate: light_value = intensity - path_cost
     b. If light_value > current tile value:
        - Update tile
        - Add unvisited neighbors to queue
     c. path_cost increases based on tile type (1 for floor, 4 for wall)
  3. Stop when light_value reaches 0
```

### Color Handling

Each RGB channel propagates independently:
- Orange torch (r:1.0, g:0.5, b:0.1) with intensity 12
- R channel reaches 12 tiles
- G channel reaches 6 tiles
- B channel reaches ~1 tile
- Result: warm orange core fading to red at edges

### Combining Lights

When lights overlap, take MAX per channel (not additive) to prevent over-bright spots.

## Update Strategy

### Static Lights (level load)

1. Initialize staticLightmap with ambient (15, 15, 15)
2. Collect all static light sources
3. Run flood fill for each
4. Never recalculate unless level changes

### Dynamic Lights (player torch)

1. Track player's current tile position
2. On tile change only:
   - Clear dynamicLightmap
   - Run flood fill from player's new tile
   - Mark finalLightmap dirty
3. Same tile = no update

### Final Composition

```
For each tile:
  final.r = max(static.r, dynamic.r)
  final.g = max(static.g, dynamic.g)
  final.b = max(static.b, dynamic.b)
```

## Rendering

1. Create 100×100 RGB texture from finalLightmap
2. Scale up 32× to cover 3200×3200 world
3. Enable bilinear filtering for smooth gradients
4. Draw as MULTIPLY blend overlay
5. Depth: above floor/walls, below UI and particles

## Integration

### Remove

- LIGHT_2D pipeline from config
- LightingSystem class
- LightShadowSystem (raycaster-based)
- All sprite.setPipeline('Light2D') calls

### New TileLightingSystem API

```typescript
class TileLightingSystem {
  initialize(dungeonTiles: number[][]): void;
  addStaticLight(tileX: number, tileY: number, intensity: number, color: RGB): void;
  clearStaticLights(): void;
  setPlayerLight(tileX: number, tileY: number, intensity: number, color: RGB): void;
  render(): void;
  destroy(): void;
}
```

### Light Migration

| Object | Intensity | Color |
|--------|-----------|-------|
| Player torch | 12 | { r: 1, g: 0.9, b: 0.7 } |
| Wall torches | 10 | { r: 1, g: 0.6, b: 0.2 } |
| Shrines | 8 | { r: 0.5, g: 0.5, b: 1 } |
| Chests | 6 | { r: 1, g: 0.8, b: 0.3 } |

World-specific color palettes apply to these base colors.

## Performance

- 100×100 = 10,000 tiles total
- Player light radius ~15 = ~700 tiles per update
- Static lights: one-time cost at load
- Target: <1ms per player tile change
