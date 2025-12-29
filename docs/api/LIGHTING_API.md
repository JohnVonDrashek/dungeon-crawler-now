# Lighting System API Reference

Complete API documentation for the dungeon crawler lighting system.

---

## Table of Contents

- [Overview](#overview)
- [LightingSystem Class](#lightingsystem-class)
- [Interfaces](#interfaces)
- [Configuration Constants](#configuration-constants)
- [World Lighting Palettes](#world-lighting-palettes)
- [Boss Glow Configuration](#boss-glow-configuration)
- [Light2D Pipeline Integration](#light2d-pipeline-integration)
- [Usage Examples](#usage-examples)

---

## Overview

**File:** `/src/systems/LightingSystem.ts`

The `LightingSystem` provides centralized dynamic lighting management for the dungeon crawler. It uses Phaser's Light2D pipeline with normal maps for realistic lighting effects including:

- Player torch light that follows the player
- Flickering wall candles/torches with world-specific colors
- Boss glow effects per sin type
- Wall rim lighting for geometry definition
- Drifting shadow overlay for ambient darkness variation
- Room-based torch activation (torches light up when entering rooms)

---

## LightingSystem Class

### Constructor

```typescript
constructor(scene: Phaser.Scene)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `scene` | `Phaser.Scene` | The Phaser scene context for light management |

### Methods

#### enable

Enables the lighting system for the scene.

```typescript
enable(): void
```

**Behavior:**
- Activates Phaser's light system via `scene.lights.enable()`
- Sets ambient light to `0x0a0812` (cool purple-brown)
- Sets internal `enabled` flag to `true`

**Example:**
```typescript
const lightingSystem = new LightingSystem(this);
lightingSystem.enable();
```

---

#### disable

Disables the lighting system and removes all lights.

```typescript
disable(): void
```

**Behavior:**
- Hides and clears all torch lights
- Removes player light reference
- Sets internal `enabled` flag to `false`

---

#### setWorld

Sets the current world to use world-specific lighting colors.

```typescript
setWorld(world: string | null): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `world` | `string \| null` | World key (e.g., `'pride'`, `'greed'`, `'hub'`) or `null` |

**Behavior:**
- Updates internal `currentWorld` reference
- If lighting is enabled and world has custom palette, updates ambient color immediately

**Example:**
```typescript
lightingSystem.setWorld('wrath');
// Ambient light changes to 0x0f0808 (dark red)
```

---

#### createPlayerTorch

Creates the player's torch light at the specified position.

```typescript
createPlayerTorch(x: number, y: number): Phaser.GameObjects.Light
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | X position in world coordinates |
| `y` | `number` | Y position in world coordinates |

**Returns:** `Phaser.GameObjects.Light` - The created player light

**Light Properties:**
| Property | Value |
|----------|-------|
| Color | `0xffe8b8` (neutral warm) |
| Radius | `150` pixels |
| Intensity | `1.4` |

**Example:**
```typescript
const spawnX = 400;
const spawnY = 300;
const playerLight = lightingSystem.createPlayerTorch(spawnX, spawnY);
```

---

#### updatePlayerTorch

Updates the player torch position. Call this in the scene's update loop.

```typescript
updatePlayerTorch(x: number, y: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | Player X position |
| `y` | `number` | Player Y position |

**Behavior:**
- Applies a Y offset of `6` pixels (torches light below eye level)
- Only updates if player light exists

**Example:**
```typescript
// In scene update():
this.lightingSystem.updatePlayerTorch(this.player.x, this.player.y);
```

---

#### createTorchLight

Creates a wall torch/candle light with optional flickering.

```typescript
createTorchLight(
  x: number,
  y: number,
  customConfig?: Partial<LightConfig>,
  roomId?: number,
  startLit: boolean = true
): Phaser.GameObjects.Light
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `x` | `number` | - | X position in world coordinates |
| `y` | `number` | - | Y position in world coordinates |
| `customConfig` | `Partial<LightConfig>` | `undefined` | Override default torch config |
| `roomId` | `number` | `undefined` | Room ID for room-based activation |
| `startLit` | `boolean` | `true` | Whether torch starts lit |

**Returns:** `Phaser.GameObjects.Light` - The created torch light

**Default Torch Properties:**
| Property | Value |
|----------|-------|
| Color | World-specific or random from `torchColorVariations` |
| Radius | `100` pixels (95-105% variation applied) |
| Intensity | `0.7` (or `0` if `startLit` is false) |
| Flicker | `true` |
| Flicker Speed | `4` |
| Flicker Amount | `0.25` |

**Example:**
```typescript
// Create a torch that starts unlit until room is activated
const torch = lightingSystem.createTorchLight(
  candleX, candleY,
  undefined,  // use default config
  room.id,    // associate with room
  false       // start unlit
);
```

---

#### lightRoom

Lights up all torches in a specific room with a fade-in animation.

```typescript
lightRoom(roomId: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | `number` | The room ID to light |

**Behavior:**
- Finds all torches associated with the room ID
- Animates intensity from 0 to base intensity over 300ms
- Uses `Quad.easeOut` easing

**Example:**
```typescript
// When player enters a new room
lightingSystem.lightRoom(room.id);
```

---

#### isRoomLit

Checks if a room's torches are lit.

```typescript
isRoomLit(roomId: number): boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | `number` | The room ID to check |

**Returns:** `boolean` - `true` if room has no torches or any torch is lit

---

#### createBossGlow

Creates a glow light for a boss based on sin type.

```typescript
createBossGlow(x: number, y: number, sinType: string): Phaser.GameObjects.Light | null
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | Boss X position |
| `y` | `number` | Boss Y position |
| `sinType` | `string` | Sin type key (e.g., `'pride'`, `'wrath'`) |

**Returns:** `Phaser.GameObjects.Light | null` - The boss glow light, or `null` if sin type not found

**Boss Glow Properties by Sin:**

| Sin Type | Color | Radius | Intensity |
|----------|-------|--------|-----------|
| `pride` | `0xffd700` (gold) | 150 | 0.6 |
| `greed` | `0x22c55e` (green) | 140 | 0.5 |
| `wrath` | `0xdc2626` (red) | 160 | 0.7 |
| `sloth` | `0x6b7280` (gray) | 130 | 0.4 |
| `envy` | `0x16a34a` (dark green) | 140 | 0.5 |
| `gluttony` | `0xfbbf24` (amber) | 150 | 0.6 |
| `lust` | `0xec4899` (pink) | 145 | 0.55 |

**Example:**
```typescript
const bossGlow = lightingSystem.createBossGlow(boss.x, boss.y, 'wrath');
// Creates a red glow with radius 160 and intensity 0.7
```

---

#### createWallRimLights

Creates subtle rim lights along wall edges to separate walls from floor. This is a classic AAA technique for making room geometry instantly readable.

```typescript
createWallRimLights(tiles: number[][], tileSize: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `tiles` | `number[][]` | 2D array where `1` = wall, `0` = floor |
| `tileSize` | `number` | Size of each tile in pixels |

**Rim Light Properties:**
| Property | Value |
|----------|-------|
| Color | World-specific or `0x666677` (cool gray) |
| Radius | `40` pixels |
| Base Intensity | `0.15` |
| Corner Intensity | `0.195` (1.3x base) |
| Spacing | Every 2 tiles |

**Behavior:**
- Scans for wall-floor boundaries
- Places lights on floor tiles adjacent to walls
- Offsets lights 30% toward the wall for better rim effect
- Corner tiles (2+ adjacent walls) get 30% brighter lights
- Uses spacing to reduce light count for performance

**Example:**
```typescript
lightingSystem.createWallRimLights(dungeon.tiles, TILE_SIZE);
```

---

#### createShadowOverlay

Creates a slowly drifting shadow overlay for ambient darkness variation.

```typescript
createShadowOverlay(width: number, height: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `width` | `number` | Overlay width in pixels |
| `height` | `number` | Overlay height in pixels |

**Behavior:**
- Creates 8 shadow patches that drift slowly
- Uses MULTIPLY blend mode for darkening
- Positioned at depth 44 (below UI, above game elements)
- Updates position relative to camera during `update()`

---

#### destroyShadowOverlay

Destroys the shadow overlay graphic.

```typescript
destroyShadowOverlay(): void
```

---

#### update

Updates lighting effects (flickering, shadow drift). Call in scene's update method.

```typescript
update(delta: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `delta` | `number` | Time since last frame in milliseconds |

**Flicker Algorithm:**
```typescript
// Multi-frequency flicker for organic feel
primaryFlicker = sin(time * 4 + offset) * 0.25
secondaryFlicker = sin(time * 9.2 + offset * 1.7) * 0.075
noise = random(-0.04, 0.04)
finalIntensity = baseIntensity + primaryFlicker + secondaryFlicker + noise
```

**Example:**
```typescript
// In scene update():
update(time: number, delta: number) {
  this.lightingSystem.update(delta);
}
```

---

#### removeTorchLight

Removes a specific torch light from the system.

```typescript
removeTorchLight(light: Phaser.GameObjects.Light): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `light` | `Phaser.GameObjects.Light` | The light to remove |

---

#### clearTorchLights

Clears all torch lights. Use for scene transitions.

```typescript
clearTorchLights(): void
```

---

#### getPlayerLight

Gets the player light reference.

```typescript
getPlayerLight(): Phaser.GameObjects.Light | null
```

**Returns:** `Phaser.GameObjects.Light | null` - The player light or `null` if not created

---

#### isEnabled

Checks if lighting is enabled.

```typescript
isEnabled(): boolean
```

**Returns:** `boolean` - `true` if lighting system is active

---

#### setAmbientLight

Sets custom ambient light color.

```typescript
setAmbientLight(color: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `color` | `number` | Hex color value (e.g., `0x0a0812`) |

**Note:** Only applies if lighting is enabled.

---

#### destroy

Destroys the lighting system and all associated resources.

```typescript
destroy(): void
```

**Behavior:**
- Calls `disable()` to remove all lights
- Calls `destroyShadowOverlay()` to clean up graphics

---

## Interfaces

### LightConfig

Configuration for creating lights.

```typescript
interface LightConfig {
  color: number;           // Hex color (e.g., 0xff9933)
  radius: number;          // Light radius in pixels
  intensity: number;       // Light intensity (0.0 - 1.0+)
  flicker?: boolean;       // Enable flickering
  flickerSpeed?: number;   // Flicker animation speed
  flickerAmount?: number;  // Flicker intensity variation
}
```

### TorchLight

Internal torch tracking structure.

```typescript
interface TorchLight {
  light: Phaser.GameObjects.Light;  // The Phaser light object
  baseIntensity: number;            // Base intensity for flicker calculations
  flickerOffset: number;            // Random phase offset (0 to 2*PI)
  roomId?: number;                  // Associated room ID
  isLit: boolean;                   // Current lit state
}
```

---

## Configuration Constants

### LIGHT_CONFIG

Default lighting configurations exported from `LightingSystem.ts`.

```typescript
export const LIGHT_CONFIG = {
  // Default ambient light
  ambient: {
    color: 0x0a0812,      // Cool purple-brown
    intensity: 0.12,
  },

  // Player's torch
  playerTorch: {
    color: 0xffe8b8,      // Neutral/slightly warm
    radius: 150,          // Tight pool around player
    intensity: 1.4,       // Sharp falloff feel
    yOffset: 6,           // Offset below eye level
  },

  // Wall torches (base config)
  wallTorch: {
    color: 0xff9933,      // Default warm orange
    radius: 100,          // Small defined pools
    intensity: 0.7,
    flicker: true,
    flickerSpeed: 4,
    flickerAmount: 0.25,
  },

  // Default torch color variations
  torchColorVariations: [
    0xff9933,  // Orange
    0xffaa44,  // Yellow-orange
    0xff8822,  // Deep orange
    0xffbb55,  // Pale orange
  ],

  // Wall rim lighting
  wallRim: {
    color: 0x666677,      // Cool gray
    radius: 40,           // Tight edge effect
    intensity: 0.15,      // Very subtle
    spacing: 2,           // Every N tiles
  },
}
```

---

## World Lighting Palettes

### WORLD_LIGHTING

World-specific lighting colors exported from `LightingSystem.ts`.

```typescript
export const WORLD_LIGHTING = {
  pride: {
    ambient: 0x0f0d08,      // Dark gold-brown
    torchColors: [0xffd700, 0xf5c400, 0xffdb4d, 0xe6b800],
    rimColor: 0x4a4520,
  },
  greed: {
    ambient: 0x080f08,      // Dark green
    torchColors: [0x22c55e, 0x16a34a, 0x4ade80, 0x15803d],
    rimColor: 0x1a3d1a,
  },
  wrath: {
    ambient: 0x0f0808,      // Dark red
    torchColors: [0xdc2626, 0xef4444, 0xf97316, 0xb91c1c],
    rimColor: 0x3d1515,
  },
  sloth: {
    ambient: 0x0a0a0c,      // Dark gray-blue
    torchColors: [0x9ca3af, 0x6b7280, 0x60a5fa, 0x4b5563],
    rimColor: 0x2a2d33,
  },
  envy: {
    ambient: 0x060d06,      // Very dark green
    torchColors: [0x16a34a, 0x22c55e, 0x15803d, 0x166534],
    rimColor: 0x1a2d1a,
  },
  gluttony: {
    ambient: 0x0d0a06,      // Dark amber
    torchColors: [0xfbbf24, 0xf59e0b, 0xfcd34d, 0xd97706],
    rimColor: 0x3d3015,
  },
  lust: {
    ambient: 0x0d060a,      // Dark magenta
    torchColors: [0xec4899, 0xf472b6, 0xdb2777, 0xbe185d],
    rimColor: 0x3d1530,
  },
  hub: {
    ambient: 0x0c0a08,      // Warm brown (safer feeling)
    torchColors: [0xffa066, 0xff8844, 0xffbb88, 0xff9955],
    rimColor: 0x2a2520,
  },
}
```

---

## Boss Glow Configuration

Complete boss glow settings from `LIGHT_CONFIG.bossGlow`:

| Sin Type | Color | Color Name | Radius | Intensity |
|----------|-------|------------|--------|-----------|
| `pride` | `0xffd700` | Gold | 150 | 0.6 |
| `greed` | `0x22c55e` | Emerald Green | 140 | 0.5 |
| `wrath` | `0xdc2626` | Crimson Red | 160 | 0.7 |
| `sloth` | `0x6b7280` | Slate Gray | 130 | 0.4 |
| `envy` | `0x16a34a` | Forest Green | 140 | 0.5 |
| `gluttony` | `0xfbbf24` | Amber | 150 | 0.6 |
| `lust` | `0xec4899` | Hot Pink | 145 | 0.55 |

---

## Light2D Pipeline Integration

### Enabling Light2D on Game Objects

All game objects that should respond to dynamic lighting must have the Light2D pipeline enabled:

```typescript
sprite.setPipeline('Light2D');
```

### Objects Using Light2D

The following object types use the Light2D pipeline:

| Object Type | File Location |
|-------------|---------------|
| Player | `/src/entities/Player.ts` |
| Enemy | `/src/entities/Enemy.ts` |
| NPC | `/src/entities/NPC.ts` |
| RemotePlayer | `/src/multiplayer/RemotePlayer.ts` |
| Wall tiles | `/src/scenes/game/GameSceneInit.ts` |
| Floor tiles | `/src/scenes/game/GameSceneInit.ts` |
| Chests | `/src/systems/RoomDecorationManager.ts` |
| Shrines | `/src/systems/RoomDecorationManager.ts` |
| Candles | `/src/systems/RoomDecorationManager.ts` |
| Loot drops | `/src/systems/LootDropManager.ts` |
| Hazards | `/src/systems/HazardSystem.ts` |
| Exit portal | `/src/scenes/game/GameSceneInit.ts` |
| Lore objects | `/src/ui/LoreUIManager.ts` |

### WebGL Requirement

Light2D requires WebGL rendering. The game config must use:

```typescript
{
  type: Phaser.WEBGL,
  // ... other config
}
```

---

## Usage Examples

### Basic Scene Setup

Using `BaseScene` helper methods (recommended):

```typescript
import { BaseScene } from './BaseScene';
import { TILE_SIZE } from '../utils/constants';

class MyScene extends BaseScene {
  createScene(): void {
    // Initialize lighting with world-specific colors
    this.initLighting('pride');

    // Create room tiles
    const tiles = this.buildTiles();

    // Add wall rim lights and shadow overlay
    this.initLightingEffects(tiles, TILE_SIZE);

    // Create player with torch
    this.player = new Player(this, spawnX, spawnY);
    this.lightingSystem.createPlayerTorch(spawnX, spawnY);
  }

  update(time: number, delta: number): void {
    // Update player torch position
    this.lightingSystem?.updatePlayerTorch(this.player.x, this.player.y);

    // Update flicker effects
    this.lightingSystem?.update(delta);
  }
}
```

### Manual Setup

Direct `LightingSystem` usage without `BaseScene`:

```typescript
import { LightingSystem, WORLD_LIGHTING } from '../systems/LightingSystem';

class GameScene extends Phaser.Scene {
  private lightingSystem: LightingSystem;

  create(): void {
    // Create and enable lighting
    this.lightingSystem = new LightingSystem(this);
    this.lightingSystem.enable();

    // Set world-specific colors
    this.lightingSystem.setWorld('wrath');

    // Create player torch
    this.lightingSystem.createPlayerTorch(player.x, player.y);

    // Add wall torches
    for (const room of dungeon.rooms) {
      this.addRoomTorches(room);
    }

    // Add rim lights
    this.lightingSystem.createWallRimLights(dungeon.tiles, TILE_SIZE);

    // Add shadow overlay
    this.lightingSystem.createShadowOverlay(
      dungeon.width * TILE_SIZE,
      dungeon.height * TILE_SIZE
    );
  }

  private addRoomTorches(room: Room): void {
    const startLit = room.id === 0; // Only spawn room starts lit

    // Add torches at positions
    this.lightingSystem.createTorchLight(
      x, y,
      undefined,
      room.id,
      startLit
    );
  }

  onRoomEnter(room: Room): void {
    // Light up torches when entering room
    this.lightingSystem.lightRoom(room.id);
  }

  update(time: number, delta: number): void {
    this.lightingSystem.updatePlayerTorch(this.player.x, this.player.y);
    this.lightingSystem.update(delta);
  }

  shutdown(): void {
    this.lightingSystem.destroy();
  }
}
```

### Adding Custom Lights

Creating lights directly on objects:

```typescript
// Treasure chest glow
const chestLight = this.lights.addLight(
  chestX, chestY,
  100,        // radius
  0xffd700,   // gold color
  0.7         // intensity
);

// Pulse animation
this.tweens.add({
  targets: chestLight,
  intensity: 1.0,
  radius: 120,
  duration: 800,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut',
});

// Shrine glow
const shrineLight = this.lights.addLight(
  shrineX, shrineY,
  120,        // radius
  0x22d3ee,   // cyan color
  0.8         // intensity
);
```

### Creating Boss with Glow

```typescript
class Boss extends Enemy {
  private glowLight: Phaser.GameObjects.Light | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, sinType: string) {
    super(scene, x, y, 'boss');

    // Get lighting system from scene
    const lightingSystem = (scene as GameScene).lightingSystem;
    this.glowLight = lightingSystem.createBossGlow(x, y, sinType);
  }

  update(): void {
    // Update glow position to follow boss
    if (this.glowLight) {
      this.glowLight.setPosition(this.x, this.y);
    }
  }

  destroy(): void {
    if (this.glowLight) {
      this.scene.lights.removeLight(this.glowLight);
    }
    super.destroy();
  }
}
```

---

## Related Documentation

- [Audio Visual Guide](/docs/AUDIO_VISUAL.md) - Complete visual effects documentation
- [Game Design Document](/docs/GAME_DESIGN.md) - Overall game design
- [Scenes Lifecycle](/docs/SCENES_LIFECYCLE.md) - Scene initialization patterns
