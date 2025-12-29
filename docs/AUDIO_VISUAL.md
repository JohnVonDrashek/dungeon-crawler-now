# Audio & Visual Systems

This document covers the procedural audio generation, dynamic lighting, visual effects, and asset generation systems used in the dungeon crawler.

---

## Table of Contents

1. [Audio System](#audio-system)
2. [Lighting System](#lighting-system)
3. [Visual Effects](#visual-effects)
4. [Asset Generation](#asset-generation)
5. [World Color Palettes](#world-color-palettes)

---

## Audio System

**Location:** `/src/systems/AudioSystem.ts`

The audio system uses the Web Audio API to generate all sounds procedurally at runtime. No external audio files are required.

### Volume Controls

| Control | Default | Range | Description |
|---------|---------|-------|-------------|
| Master Volume | From Settings | 0-1 | Global volume multiplier |
| Music Volume | From Settings | 0-1 | Background music level |
| SFX Volume | From Settings | 0-1 | Sound effects level |

### Procedural Music Generation

The music system generates ambient background music using the **Dorian mode** scale, creating a medieval/dungeon atmosphere.

#### Dorian Scale (A root at 220 Hz)

| Note | Frequency (Hz) | Interval |
|------|----------------|----------|
| A | 220 | Root |
| B | 247.5 | Major 2nd |
| C | 264 | Minor 3rd |
| D | 293.3 | Perfect 4th |
| E | 330 | Perfect 5th |
| F# | 367.5 | Major 6th |
| G | 396 | Minor 7th |
| A | 440 | Octave |

#### Music States

| State | Note Delay | Drone Volume | Melody Volume | Character |
|-------|------------|--------------|---------------|-----------|
| `exploration` | 2000-4000ms | 0.08 | 0.12 | Calm, sparse |
| `combat` | 1000-2000ms | 0.08 | 0.15 | Tense, active |
| `shrine` | 3000-5000ms | 0.06 | 0.10 | Peaceful, reverent |

#### Music Architecture

1. **Drone Layer**
   - Continuous sine wave at 110 Hz (low A)
   - Subtle LFO wobble at 0.1 Hz for organic feel
   - Fade in over 2 seconds when starting

2. **Melody Layer**
   - Single notes played with attack/release envelope
   - Note selection algorithm:
     - 20% chance: Stay on same note
     - 70% chance: Step up or down one scale degree
     - 10% chance: Leap up or down two scale degrees
   - Combat mode: 30% chance to favor minor 3rd or minor 7th for tension

3. **Note Envelope**
   - Attack: 0.3 seconds ramp to full volume
   - Sustain decay: Fade to 70% over 1.2 seconds
   - Release: Fade to 0 over 1 second

### Sound Effects Catalog

All SFX are procedurally generated using waveform synthesis:

| Key | Duration | Description | Generation Formula |
|-----|----------|-------------|---------------------|
| `sfx_attack` | 0.1s | Short zap/swing | 880 Hz sine with fast decay (exp -30t) |
| `sfx_hit` | 0.15s | Impact thump | 150 Hz sine with decay (exp -20t) |
| `sfx_pickup` | 0.2s | Rising chime | 600-1000 Hz sweep with decay (exp -8t) |
| `sfx_levelup` | 0.5s | Triumphant chord | A4-C#5-E5 sequence (440-554-659 Hz) |
| `sfx_enemy_death` | 0.2s | Descending tone | 200 Hz with pitch drop, decay (exp -10t) |
| `sfx_hurt` | 0.15s | White noise burst | Random noise with fast decay (exp -15t) |
| `sfx_stairs` | 0.4s | Transition whoosh | 300-500 Hz sweep with slow decay (exp -3t) |
| `sfx_potion` | 0.3s | Bubbling drink | 500 Hz with FM modulation (8 Hz), decay (exp -5t) |
| `sfx_whisper` | 0.6s | Ghostly voice | Noise + 180/220 Hz tones, sine envelope |
| `sfx_tablet` | 0.25s | Stone scrape | Noise + 120 Hz tone, decay (exp -8t) |

### Audio Context Handling

- AudioContext created on instantiation
- Handles browser autoplay policy by resuming on first user interaction
- Volume changes update drone in real-time
- Music stops with 1-second fade out for drone, 0.5s for melody

---

## Lighting System

**Location:** `/src/systems/LightingSystem.ts`

Uses Phaser's Light2D pipeline for dynamic lighting with normal map support.

### Default Configuration

#### Ambient Light
```
Color: 0x0a0812 (Cool purple-brown)
Intensity: 0.12
```

#### Player Torch
```
Color: 0xffe8b8 (Neutral warm)
Radius: 150 pixels
Intensity: 1.4
Y-Offset: 6 pixels (grounds light below eye level)
```

#### Wall Torches
```
Default Color: 0xff9933 (Warm orange)
Radius: 100 pixels (with 95-105% random variation)
Intensity: 0.7
Flicker Speed: 4 Hz
Flicker Amount: 25%
```

#### Wall Rim Lights
```
Default Color: 0x666677 (Cool gray)
Radius: 40 pixels
Intensity: 0.15 (0.195 at corners)
Spacing: Every 2 tiles
```

### Torch Flicker Algorithm

Multi-frequency flicker for organic feel:
```
intensity = baseIntensity
          + sin(time * 4 + offset) * 0.25           // Primary flicker
          + sin(time * 9.2 + offset * 1.7) * 0.075  // Secondary flicker
          + random(-0.04, 0.04)                      // Random noise
```

### Room Lighting

- Torches can be associated with specific rooms via `roomId`
- `lightRoom(roomId)` animates torches on over 300ms
- Unlit rooms start with intensity 0

### Boss Glow Colors

| Sin Type | Color | Radius | Intensity |
|----------|-------|--------|-----------|
| Pride | `0xffd700` (Gold) | 150 | 0.6 |
| Greed | `0x22c55e` (Green) | 140 | 0.5 |
| Wrath | `0xdc2626` (Red) | 160 | 0.7 |
| Sloth | `0x6b7280` (Gray) | 130 | 0.4 |
| Envy | `0x16a34a` (Dark Green) | 140 | 0.5 |
| Gluttony | `0xfbbf24` (Amber) | 150 | 0.6 |
| Lust | `0xec4899` (Pink) | 145 | 0.55 |

### Shadow Overlay

Optional drifting shadow overlay for ambient darkness variation:
- 8 organic shadow patches
- Slow drift: `sin(time * 0.1)` horizontal, `cos(time * 0.08)` vertical
- Very subtle alpha: 0.03 with +/- 0.01 variation
- Blend mode: MULTIPLY
- Depth: 44 (below UI, above game elements)

---

## Visual Effects

**Location:** `/src/systems/VisualEffectsManager.ts`

### Damage Numbers

| Type | Color | Font Size | Duration | Movement |
|------|-------|-----------|----------|----------|
| Player Damage | `#ff4444` (Red) | 16px bold | 800ms | Float up 30px |
| Enemy Damage | `#ffffff` (White) | 16px bold | 800ms | Float up 30px |

All damage numbers have:
- Black stroke (3px thickness)
- Centered origin
- Depth: 150
- Power2 ease-out animation

### Floating Text

Generic floating text for status messages:
- Font: 14px bold
- Black stroke (3px)
- Duration: 1000ms
- Movement: Float up 40px
- Depth: 150

### Screen Shake

```typescript
shakeCamera(intensity: number, duration: number)
// intensity is divided by 1000 for Phaser's shake API
```

### Death Particles

When enemies die, 8 particles spawn in a radial pattern:
- Colors: `0xff4444`, `0xff6666`, `0xcc3333`, `0xffaaaa`
- Size: 2-5 pixel radius circles
- Speed: 50-120 pixels radial burst
- Duration: 300-500ms
- Animation: Scale to 30%, fade to 0

### Game Messages

Large centered messages (e.g., "LEVEL UP!"):
- Position: Center X, 30% from top
- Font: 24px bold
- Color: `#ff4444` (Red)
- Black stroke (3px)
- Depth: 200 (above everything)
- Scroll factor: 0 (fixed to screen)
- Animation: Fade out + float up 30px over 1.5s after 0.5s delay

### Level Up Notification

Special notification with two lines:
- Text: "LEVEL UP!\nPress L to allocate stats"
- Color: `#fbbf24` (Amber/gold)
- Font: 24px bold, center aligned
- Duration: 2.5s fade after 1s delay
- Movement: Float up 40px

---

## Asset Generation

**Location:** `/src/systems/AssetGenerator.ts`

All game assets are procedurally generated at boot time using Phaser graphics primitives.

### Asset Categories

| Category | Textures Generated |
|----------|-------------------|
| Player | `player` |
| Floor/Wall | `floor`, `wall`, `floor_[world]`, `wall_[world]` |
| Enemies | `enemy`, `enemy_fast`, `enemy_tank`, `enemy_ranged`, `enemy_boss` |
| Sin Enemies | `enemy_pride`, `enemy_greed`, `enemy_wrath`, `enemy_sloth`, `enemy_envy`, `enemy_gluttony`, `enemy_lust` |
| Projectiles | `enemy_projectile`, `projectile`, `projectile_wand`, `projectile_arrow`, `projectile_orb`, `projectile_dagger` |
| Weapons | `weapon_wand`, `weapon_sword`, `weapon_bow`, `weapon_staff`, `weapon_daggers` |
| Effects | `slash_effect`, `explosion_effect`, `weapon_drop_glow` |
| Items | `item_drop`, `item_armor`, `item_accessory`, `item_consumable`, `gold_coin` |
| Special Floors | `floor_treasure`, `floor_trap`, `floor_shrine`, `floor_challenge`, `floor_tavern` |
| Objects | `chest_closed`, `chest_open`, `shrine`, `skull_marker`, `door` |
| Lore | `lore_tablet`, `lore_scratch`, `lore_whisper` |
| Environment | `exit`, `exit_portal`, `torch`, `candle`, `fountain`, `reroll_crystal` |
| Hazards | `spike_trap`, `spike_trap_active`, `lava_pit`, `arrow_shooter`, `arrow` |
| NPCs | `shopkeeper` |

### Tile Size

Default tile size is defined in `/src/utils/constants.ts` as `TILE_SIZE` (typically 16 pixels).

### Color Manipulation Utilities

```typescript
// Lighten a color by percentage (0-1)
lightenColor(color: number, percent: number): number

// Darken a color by percentage (0-1)
darkenColor(color: number, percent: number): number
```

These extract RGB components, apply the percentage adjustment, and recombine.

### World-Specific Texture Generation

For each of the 7 sin worlds, floor and wall textures are generated with:
- Base fill from world's floor/wall color
- Grid lines at 15% lighter than base
- Corner accents at 8% lighter (floors)
- Brick pattern with 12% lighter edges, 15% darker mortar (walls)
- Accent color overlay at 10% opacity

---

## World Color Palettes

**Location:** `/src/config/WorldConfig.ts` and `/src/systems/LightingSystem.ts`

### Pride (Tower of Pride)

| Element | Hex | RGB | Description |
|---------|-----|-----|-------------|
| Primary | `0xffd700` | (255, 215, 0) | Gold |
| Secondary | `0xf5f5dc` | (245, 245, 220) | Beige |
| Floor | `0x4a4520` | (74, 69, 32) | Dark gold |
| Wall | `0x3d3818` | (61, 56, 24) | Darker gold |
| Portal | `0xffd700` | (255, 215, 0) | Gold |
| Ambient Light | `0x0f0d08` | (15, 13, 8) | Dark gold-brown |
| Torch Colors | `0xffd700`, `0xf5c400`, `0xffdb4d`, `0xe6b800` | Gold variations |
| Rim Light | `0x4a4520` | (74, 69, 32) | Matches floor |

### Greed (Vaults of Greed)

| Element | Hex | RGB | Description |
|---------|-----|-----|-------------|
| Primary | `0x22c55e` | (34, 197, 94) | Green |
| Secondary | `0xffd700` | (255, 215, 0) | Gold accents |
| Floor | `0x1a3d1a` | (26, 61, 26) | Dark green |
| Wall | `0x152d15` | (21, 45, 21) | Darker green |
| Portal | `0x22c55e` | (34, 197, 94) | Green |
| Ambient Light | `0x080f08` | (8, 15, 8) | Dark green |
| Torch Colors | `0x22c55e`, `0x16a34a`, `0x4ade80`, `0x15803d` | Green variations |
| Rim Light | `0x1a3d1a` | (26, 61, 26) | Matches floor |

### Wrath (Inferno of Wrath)

| Element | Hex | RGB | Description |
|---------|-----|-----|-------------|
| Primary | `0xdc2626` | (220, 38, 38) | Red |
| Secondary | `0xf97316` | (249, 115, 22) | Orange |
| Floor | `0x3d1515` | (61, 21, 21) | Dark red |
| Wall | `0x2d1010` | (45, 16, 16) | Darker red |
| Portal | `0xdc2626` | (220, 38, 38) | Red |
| Ambient Light | `0x0f0808` | (15, 8, 8) | Dark red |
| Torch Colors | `0xdc2626`, `0xef4444`, `0xf97316`, `0xb91c1c` | Red/orange variations |
| Rim Light | `0x3d1515` | (61, 21, 21) | Matches floor |

### Sloth (Mire of Sloth)

| Element | Hex | RGB | Description |
|---------|-----|-----|-------------|
| Primary | `0x6b7280` | (107, 114, 128) | Gray |
| Secondary | `0x60a5fa` | (96, 165, 250) | Pale blue |
| Floor | `0x2a2d33` | (42, 45, 51) | Dark gray |
| Wall | `0x1f2227` | (31, 34, 39) | Darker gray |
| Portal | `0x9ca3af` | (156, 163, 175) | Light gray |
| Ambient Light | `0x0a0a0c` | (10, 10, 12) | Dark gray-blue |
| Torch Colors | `0x9ca3af`, `0x6b7280`, `0x60a5fa`, `0x4b5563` | Gray/blue variations |
| Rim Light | `0x2a2d33` | (42, 45, 51) | Matches floor |

### Envy (Shadows of Envy)

| Element | Hex | RGB | Description |
|---------|-----|-----|-------------|
| Primary | `0x16a34a` | (22, 163, 74) | Dark green |
| Secondary | `0x1f2937` | (31, 41, 55) | Dark shadow |
| Floor | `0x1a2d1a` | (26, 45, 26) | Very dark green |
| Wall | `0x0f1f0f` | (15, 31, 15) | Near-black green |
| Portal | `0x22c55e` | (34, 197, 94) | Green |
| Ambient Light | `0x060d06` | (6, 13, 6) | Very dark green |
| Torch Colors | `0x16a34a`, `0x22c55e`, `0x15803d`, `0x166534` | Dark green variations |
| Rim Light | `0x1a2d1a` | (26, 45, 26) | Matches floor |

### Gluttony (Pits of Gluttony)

| Element | Hex | RGB | Description |
|---------|-----|-----|-------------|
| Primary | `0xfbbf24` | (251, 191, 36) | Amber |
| Secondary | `0xf59e0b` | (245, 158, 11) | Darker amber |
| Floor | `0x3d3015` | (61, 48, 21) | Dark amber |
| Wall | `0x2d2410` | (45, 36, 16) | Darker amber |
| Portal | `0xfbbf24` | (251, 191, 36) | Amber |
| Ambient Light | `0x0d0a06` | (13, 10, 6) | Dark amber |
| Torch Colors | `0xfbbf24`, `0xf59e0b`, `0xfcd34d`, `0xd97706` | Amber variations |
| Rim Light | `0x3d3015` | (61, 48, 21) | Matches floor |

### Lust (Gardens of Lust)

| Element | Hex | RGB | Description |
|---------|-----|-----|-------------|
| Primary | `0xec4899` | (236, 72, 153) | Pink |
| Secondary | `0xfce7f3` | (252, 231, 243) | Light pink |
| Floor | `0x3d1530` | (61, 21, 48) | Dark magenta |
| Wall | `0x2d1025` | (45, 16, 37) | Darker magenta |
| Portal | `0xec4899` | (236, 72, 153) | Pink |
| Ambient Light | `0x0d060a` | (13, 6, 10) | Dark magenta |
| Torch Colors | `0xec4899`, `0xf472b6`, `0xdb2777`, `0xbe185d` | Pink variations |
| Rim Light | `0x3d1530` | (61, 21, 48) | Matches floor |

### Hub (Safe Zone)

| Element | Hex | RGB | Description |
|---------|-----|-----|-------------|
| Ambient Light | `0x0c0a08` | (12, 10, 8) | Warm brown |
| Torch Colors | `0xffa066`, `0xff8844`, `0xffbb88`, `0xff9955` | Warm firelight |
| Rim Light | `0x2a2520` | (42, 37, 32) | Warm brown |

---

## Integration Notes

### Enabling Lighting

```typescript
// In your scene
this.lightingSystem.enable();
this.lightingSystem.setWorld('pride'); // Sets world-specific colors
this.lightingSystem.createPlayerTorch(player.x, player.y);
```

### Playing Audio

```typescript
// Start music
this.audioSystem.startMusic('exploration');

// Change music state
this.audioSystem.setMusicStyle('combat');

// Play SFX
this.audioSystem.play('sfx_attack', 0.5);
```

### Visual Effects

```typescript
// Damage numbers
this.vfx.showDamageNumber(x, y, 25, false); // Enemy takes 25 damage

// Screen shake
this.vfx.shakeCamera(5, 100); // Intensity 5, 100ms

// Death particles
this.vfx.spawnDeathParticles(enemy.x, enemy.y);
```

---

## File References

- **AudioSystem:** `/src/systems/AudioSystem.ts`
- **LightingSystem:** `/src/systems/LightingSystem.ts`
- **VisualEffectsManager:** `/src/systems/VisualEffectsManager.ts`
- **AssetGenerator:** `/src/systems/AssetGenerator.ts`
- **WorldConfig:** `/src/config/WorldConfig.ts`
- **Constants:** `/src/utils/constants.ts`
