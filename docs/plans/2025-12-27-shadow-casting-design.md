# Shadow Casting Lighting System

## Overview

Implement raycasted shadows so walls block light and create proper visibility occlusion. Players can only see areas their torch illuminates directly, with explored areas remembered as dimmed.

## Architecture

### New Component: `ShadowCastingSystem`

Located at `src/systems/ShadowCastingSystem.ts`

```typescript
class ShadowCastingSystem {
  // Core visibility computation using recursive shadowcasting
  computeVisibility(playerTileX, playerTileY, radius, tiles): boolean[][]

  // Merge visible tiles into explored memory
  updateExplored(visible: boolean[][]): void

  // Create the RenderTexture overlay
  createShadowOverlay(scene, width, height): void

  // Update the overlay based on visibility state
  renderShadows(visible, explored): void

  // Cleanup
  destroy(): void
}
```

### Integration Points

- **GameScene.ts**: Instantiate system, call on player tile change
- **LightingSystem.ts**: Remove drifting shadow overlay (replaced by this system)
- Light2D effects continue unchanged - shadows mask visibility, not lighting

## Algorithm: Recursive Shadowcasting

Divides view into 8 octants, scans each independently:

1. Start at player, scan outward row by row
2. Track "slope range" representing visible angles
3. Walls narrow the slope range
4. When slope range closes, that direction is blocked

**Properties:**
- O(n) where n = tiles in view radius
- Symmetric visibility (if A sees B, B sees A)
- Clean shadow edges along walls

**View radius:** 12-15 tiles (384-480px) - beyond torch light for atmosphere

## Rendering

### RenderTexture Overlay

Single texture covering the dungeon, updated when visibility changes:

- Fill black
- Punch transparent holes for visible tiles
- Punch semi-transparent (alpha 0.5) for explored-but-not-visible tiles

### Depth Layering

```
Depth 0:   Floor tiles (Light2D)
Depth 1:   Wall tiles (Light2D)
Depth 2:   Entities, items, effects (Light2D)
Depth 3:   Shadow overlay (NEW)
Depth 45+: UI elements
```

### Performance

- Shadowcasting: <1ms for 15-tile radius (~900 tiles)
- Only recalculate when player moves to new tile
- RenderTexture updates are efficient

## Visibility States

| State | Appearance |
|-------|------------|
| Never seen | Fully black (alpha 1.0) |
| Explored, not visible | Dimmed (alpha 0.5-0.7) |
| Currently visible | Transparent (full Light2D) |

### Element Visibility in Memory

| Element | Shown in Memory |
|---------|-----------------|
| Floor/walls | Yes (dimmed) |
| Static objects | Yes (dimmed) |
| Enemies | No (could have moved) |
| Items | Yes (dimmed) |
| Torch lights | No (only when visible) |

## Data Structures

```typescript
// Recalculated each frame/move
visible: boolean[][]

// Persists for dungeon session, resets on floor change
explored: boolean[][]
```

## Implementation Steps

1. Implement shadowcasting algorithm (pure logic)
2. Create RenderTexture overlay with black/transparent
3. Hook into GameScene update loop
4. Add explored memory with dim rendering
5. Tune view radius and visual polish

## Files Changed

- **New:** `src/systems/ShadowCastingSystem.ts` (~200-300 lines)
- **Modified:** `src/scenes/GameScene.ts` (~20 lines)
- **Modified:** `src/systems/LightingSystem.ts` (remove drifting shadow overlay)
