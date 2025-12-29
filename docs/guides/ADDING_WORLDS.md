# Adding New Sin Worlds

A step-by-step guide for adding new worlds to the dungeon crawler.

---

## Table of Contents

1. [Overview of the World System](#overview-of-the-world-system)
2. [WorldConfig Structure](#worldconfig-structure)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Creating Matching Enemies](#creating-matching-enemies)
5. [Creating the World Boss](#creating-the-world-boss)
6. [Color Palette Selection](#color-palette-selection)
7. [Hazard Configuration](#hazard-configuration)
8. [Complete Code Example](#complete-code-example)
9. [Testing Checklist](#testing-checklist)

---

## Overview of the World System

The game features themed worlds based on the Seven Deadly Sins. Each world has:

- **3 floors** of dungeon exploration
- A **primary sin enemy** that dominates spawns (60% spawn rate)
- A **sin boss** that appears on the final floor
- A **unique color palette** for visual theming
- A **portal in the hub** for entry

### Architecture

```
src/
  config/
    WorldConfig.ts       # World definitions and colors
  entities/
    enemies/
      EnemyTypes.ts      # Sin enemy classes
      SinBosses.ts       # Sin boss classes
  systems/
    EnemySpawnManager.ts # Enemy spawning logic
  scenes/
    HubScene.ts          # Hub with world portals
```

### Spawn Distribution

When in a sin world:
- **60%** - Primary sin enemy (e.g., WrathEnemy in Wrath world)
- **25%** - Mixed from world's enemy pool
- **15%** - Standard enemies (Tank, Ranged, Fast)

---

## WorldConfig Structure

Each world is defined in `/src/config/WorldConfig.ts`:

```typescript
export interface WorldConfig {
  id: SinWorld;           // Enum identifier
  name: string;           // Display name (e.g., "Inferno of Wrath")
  subtitle: string;       // Short tagline
  description: string;    // Lore text
  floorCount: number;     // Always 3 for sin worlds
  enemyTypes: string[];   // Pool of enemy types for this world
  primaryEnemy: string;   // Dominant enemy (60% spawn rate)
  bossType: string;       // Sin boss class name
  colors: WorldColors;    // Color palette
  portalPosition: {       // Hub portal location (tile coords)
    x: number;
    y: number;
  };
}

export interface WorldColors {
  primary: number;    // Main accent color (hex)
  secondary: number;  // Secondary accent (hex)
  floor: number;      // Floor tile tint (hex)
  wall: number;       // Wall tile tint (hex)
  portal: number;     // Portal glow color (hex)
}
```

---

## Step-by-Step Guide

### Step 1: Add the SinWorld Enum Value

In `/src/config/WorldConfig.ts`, add your new sin to the enum:

```typescript
export enum SinWorld {
  PRIDE = 'pride',
  GREED = 'greed',
  WRATH = 'wrath',
  SLOTH = 'sloth',
  ENVY = 'envy',
  GLUTTONY = 'gluttony',
  LUST = 'lust',
  DESPAIR = 'despair',  // <-- New sin
}
```

### Step 2: Add the World Configuration

Add your world config to `WORLD_CONFIGS`:

```typescript
[SinWorld.DESPAIR]: {
  id: SinWorld.DESPAIR,
  name: 'Abyss of Despair',
  subtitle: 'Hope abandoned',
  description: 'An endless void where souls surrender to hopelessness.',
  floorCount: 3,
  enemyTypes: ['DespairEnemy', 'SlothEnemy', 'TankEnemy'],
  primaryEnemy: 'DespairEnemy',
  bossType: 'DespairBoss',
  colors: {
    primary: 0x1e3a5f,    // Deep blue
    secondary: 0x0d1b2a,  // Near black
    floor: 0x0a1929,      // Very dark blue floor
    wall: 0x061018,       // Near-black wall
    portal: 0x2563eb,     // Blue glow
  },
  portalPosition: { x: 12, y: 10 },  // Choose unused hub position
},
```

### Step 3: Update getAllWorlds()

Add the new world to the display order:

```typescript
export function getAllWorlds(): SinWorld[] {
  return [
    SinWorld.PRIDE,
    SinWorld.GREED,
    SinWorld.WRATH,
    SinWorld.SLOTH,
    SinWorld.ENVY,
    SinWorld.GLUTTONY,
    SinWorld.LUST,
    SinWorld.DESPAIR,  // <-- Add here
  ];
}
```

---

## Creating Matching Enemies

### Step 4: Create the Sin Enemy Class

Add to `/src/entities/enemies/EnemyTypes.ts`:

```typescript
// Despair - Drains player resources, causes despair debuffs
export class DespairEnemy extends Enemy {
  private readonly DESPAIR_RADIUS = TILE_SIZE * 4;
  private despairAura: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'despair_idle', {
      hp: 40 + floor * 8,
      attack: 6 + floor * 2,
      defense: 2 + floor,
      speed: 45 + floor * 3,
      xpValue: 45 + floor * 10,
    });
    this.setupSpriteAnimations('despair', false);
    this.createDespairAura();
  }

  private createDespairAura(): void {
    this.despairAura = this.scene.add.graphics();
    this.despairAura.setDepth(1);
    this.despairAura.fillStyle(0x1e3a5f, 0.12);
    this.despairAura.fillCircle(0, 0, this.DESPAIR_RADIUS);
    this.despairAura.lineStyle(1, 0x2563eb, 0.25);
    this.despairAura.strokeCircle(0, 0, this.DESPAIR_RADIUS);
    this.despairAura.setPosition(this.x, this.y);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active) return;

    // Update aura position
    if (this.despairAura) {
      this.despairAura.setPosition(this.x, this.y);
    }

    // Apply despair effect to player if in range
    if (this.target) {
      const dist = Phaser.Math.Distance.Between(
        this.x, this.y,
        this.target.x, this.target.y
      );
      if (dist < this.DESPAIR_RADIUS) {
        // Emit custom event for despair effect
        this.scene.events.emit('playerDespaired', 0.85); // 15% stat reduction
      }
    }
  }

  // Called when this enemy hits the player
  onSuccessfulAttack(damageDealt: number): void {
    if (!this.target) return;
    const player = this.target as Player;

    // Drain a small amount of XP on hit
    const xpDrain = Math.floor(player.xp * 0.05); // 5% XP drain
    if (xpDrain > 0) {
      player.xp = Math.max(0, player.xp - xpDrain);
      this.scene.events.emit('xpDrained', xpDrain);

      // Visual feedback - dark blue flash
      this.setTint(0x1e3a5f);
      this.scene.time.delayedCall(300, () => {
        if (this.active) {
          this.clearTint();
        }
      });
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.despairAura) {
      this.despairAura.destroy();
    }
    super.destroy(fromScene);
  }
}
```

### Step 5: Register Enemy in EnemySpawnManager

In `/src/systems/EnemySpawnManager.ts`:

1. Add the import:

```typescript
import {
  FastEnemy, TankEnemy, RangedEnemy, BossEnemy,
  SlothEnemy, GluttonyEnemy, GreedEnemy, EnvyEnemy,
  WrathEnemy, LustEnemy, PrideEnemy, DespairEnemy  // <-- Add
} from '../entities/enemies/EnemyTypes';
```

2. Add case in `createSinEnemy()`:

```typescript
private createSinEnemy(enemyType: string, x: number, y: number): Enemy {
  switch (enemyType) {
    // ... existing cases ...
    case 'DespairEnemy':
      return new DespairEnemy(this.scene, x, y, this.floor);
    // ...
  }
}
```

---

## Creating the World Boss

### Step 6: Create the Sin Boss Class

Add to `/src/entities/enemies/SinBosses.ts`:

```typescript
// ==================== DESPAIR BOSS ====================
// Massive despair aura, drains player stats, hopelessness waves
export class DespairBoss extends SinBoss {
  private despairAura: Phaser.GameObjects.Graphics | null = null;
  private readonly DESPAIR_RADIUS = TILE_SIZE * 8;
  private attackPattern: number = 0;
  private readonly baseSpeed: number;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'despair_idle', floor, {
      hp: 480 + floor * 48,
      attack: 20 + floor * 4,
      defense: 6 + floor * 2,
      speed: 40,
    });
    this.setupSpriteAnimations('despair', false);
    this.baseSpeed = this.speed;
    this.createDespairAura();
  }

  private createDespairAura(): void {
    this.despairAura = this.scene.add.graphics();
    this.despairAura.setDepth(1);
    this.despairAura.fillStyle(0x1e3a5f, 0.2);
    this.despairAura.fillCircle(0, 0, this.DESPAIR_RADIUS);
    this.despairAura.lineStyle(2, 0x2563eb, 0.4);
    this.despairAura.strokeCircle(0, 0, this.DESPAIR_RADIUS);
    this.despairAura.setPosition(this.x, this.y);
  }

  protected onPhaseChange(newPhase: number): void {
    if (newPhase === 2) {
      this.setTint(0x1e3a5f);
      this.speed = Math.floor(this.baseSpeed * 0.8); // Gets slower, more oppressive
    } else if (newPhase === 3) {
      this.setTint(0x0d1b2a);
      // Final phase: despair intensifies
      this.scene.events.emit('bossEnraged', 'despair');
    }
  }

  protected executePattern(): void {
    if (!this.target) return;

    this.attackPattern = (this.attackPattern + 1) % 3;

    switch (this.attackPattern) {
      case 0:
        this.voidWave();
        break;
      case 1:
        this.hopelessnessField();
        break;
      case 2:
        this.abyssalPull();
        break;
    }
  }

  private voidWave(): void {
    // Expanding ring of void projectiles
    const count = this.phase === 3 ? 16 : 10;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      this.spawnProjectile(angle, 100, 0x1e3a5f, 1.8);
    }
  }

  private hopelessnessField(): void {
    if (!this.target) return;
    const baseAngle = Phaser.Math.Angle.Between(
      this.x, this.y,
      this.target.x, this.target.y
    );
    const count = this.phase === 3 ? 9 : 6;
    const spread = Math.PI / 2;

    for (let i = 0; i < count; i++) {
      const angle = baseAngle - spread / 2 + (i / (count - 1)) * spread;
      this.spawnProjectile(angle, 140, 0x2563eb, 1.5);
    }
  }

  private abyssalPull(): void {
    if (!this.target) return;
    // Pull player toward boss momentarily
    const pullStrength = this.phase === 3 ? 80 : 50;
    const angle = Phaser.Math.Angle.Between(
      this.target.x, this.target.y,
      this.x, this.y
    );
    this.scene.events.emit('playerPulled', {
      x: Math.cos(angle) * pullStrength,
      y: Math.sin(angle) * pullStrength,
    });

    // Fire projectiles during pull
    for (let i = 0; i < 6; i++) {
      const projAngle = (i / 6) * Math.PI * 2;
      this.spawnProjectile(projAngle, 160, 0x0d1b2a, 1.3);
    }
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active) return;

    if (this.despairAura) {
      this.despairAura.setPosition(this.x, this.y);
    }

    // Despair aura reduces player stats when in range
    if (this.target) {
      const dist = Phaser.Math.Distance.Between(
        this.x, this.y,
        this.target.x, this.target.y
      );
      if (dist < this.DESPAIR_RADIUS) {
        const despairStrength = this.phase === 3 ? 0.6 : 0.75;
        this.scene.events.emit('playerDespaired', despairStrength);
      }
    }
  }

  destroy(fromScene?: boolean): void {
    if (this.despairAura) this.despairAura.destroy();
    super.destroy(fromScene);
  }
}
```

### Step 7: Register Boss in EnemySpawnManager

1. Add the import:

```typescript
import {
  PrideBoss, GreedBoss, WrathBoss, SlothBoss,
  EnvyBoss, GluttonyBoss, LustBoss, DespairBoss  // <-- Add
} from '../entities/enemies/SinBosses';
```

2. Add case in `createSinBoss()`:

```typescript
private createSinBoss(x: number, y: number): Enemy {
  let boss: Enemy;

  switch (this.currentWorld) {
    // ... existing cases ...
    case SinWorld.DESPAIR:
      boss = new DespairBoss(this.scene, x, y, this.floor);
      break;
    default:
      boss = new BossEnemy(this.scene, x, y, this.floor);
  }

  // Set projectile group for bosses that use it
  if ('setProjectileGroup' in boss) {
    (boss as BossEnemy).setProjectileGroup(this.enemyProjectiles);
  }

  return boss;
}
```

---

## Color Palette Selection

### Design Principles

Each sin world uses a consistent color palette:

| Color Property | Usage | Brightness |
|----------------|-------|------------|
| `primary` | Main accent, UI highlights, portal particles | Bright (visible) |
| `secondary` | Supporting accent, gradients | Medium |
| `floor` | Floor tile tint | Dark (low saturation) |
| `wall` | Wall tile tint | Darkest |
| `portal` | Portal glow effect | Bright (matches primary) |

### Existing Palettes Reference

| Sin | Primary | Secondary | Floor | Wall |
|-----|---------|-----------|-------|------|
| Pride | Gold `0xffd700` | Beige `0xf5f5dc` | `0x4a4520` | `0x3d3818` |
| Greed | Green `0x22c55e` | Gold `0xffd700` | `0x1a3d1a` | `0x152d15` |
| Wrath | Red `0xdc2626` | Orange `0xf97316` | `0x3d1515` | `0x2d1010` |
| Sloth | Gray `0x6b7280` | Blue `0x60a5fa` | `0x2a2d33` | `0x1f2227` |
| Envy | Dark Green `0x16a34a` | Shadow `0x1f2937` | `0x1a2d1a` | `0x0f1f0f` |
| Gluttony | Amber `0xfbbf24` | Dark Amber `0xf59e0b` | `0x3d3015` | `0x2d2410` |
| Lust | Pink `0xec4899` | Light Pink `0xfce7f3` | `0x3d1530` | `0x2d1025` |

### Choosing Colors for New Sins

1. **Pick a thematic hue** (e.g., deep blue for Despair)
2. **Primary**: Saturated, visible version (`0x2563eb`)
3. **Secondary**: Darker or lighter variant (`0x0d1b2a`)
4. **Floor**: Very dark, low saturation (`0x0a1929`)
5. **Wall**: Near-black with hint of hue (`0x061018`)
6. **Portal**: Same as primary for consistency

---

## Hazard Configuration

The current hazard system (`/src/systems/HazardSystem.ts`) spawns hazards based on floor level, not world type. However, you can extend it for world-specific hazards.

### Current Hazard Types

- **Spike Traps**: Toggle on/off, deal damage when active
- **Lava Pits**: Continuous damage while player stands on them
- **Arrow Shooters**: Wall-mounted, fire projectiles periodically

### Adding World-Specific Hazards (Optional)

To add unique hazards for your world, modify `HazardSystem.ts`:

```typescript
// Add world parameter to constructor
constructor(
  scene: Phaser.Scene,
  player: Player,
  floor: number,
  currentWorld?: SinWorld  // <-- Add
) {
  // ...
  this.currentWorld = currentWorld;
}

// Add world-specific hazard spawning
spawnHazardsInRoom(room: Room, dungeonData: DungeonData): void {
  // ... existing logic ...

  // World-specific hazards
  if (this.currentWorld === SinWorld.DESPAIR) {
    this.spawnDespairVoids(room);  // Custom hazard
  }
}

private spawnDespairVoids(room: Room): void {
  // Implement void zones that drain player stats
  // ...
}
```

---

## Complete Code Example

Here's the complete code for adding an 8th sin world (Despair):

### 1. WorldConfig.ts Changes

```typescript
// Add to enum
export enum SinWorld {
  // ... existing ...
  DESPAIR = 'despair',
}

// Add to WORLD_CONFIGS
[SinWorld.DESPAIR]: {
  id: SinWorld.DESPAIR,
  name: 'Abyss of Despair',
  subtitle: 'Hope abandoned',
  description: 'An endless void where souls surrender to hopelessness.',
  floorCount: 3,
  enemyTypes: ['DespairEnemy', 'SlothEnemy', 'TankEnemy'],
  primaryEnemy: 'DespairEnemy',
  bossType: 'DespairBoss',
  colors: {
    primary: 0x2563eb,
    secondary: 0x0d1b2a,
    floor: 0x0a1929,
    wall: 0x061018,
    portal: 0x2563eb,
  },
  portalPosition: { x: 12, y: 10 },
},

// Update getAllWorlds()
export function getAllWorlds(): SinWorld[] {
  return [
    SinWorld.PRIDE,
    SinWorld.GREED,
    SinWorld.WRATH,
    SinWorld.SLOTH,
    SinWorld.ENVY,
    SinWorld.GLUTTONY,
    SinWorld.LUST,
    SinWorld.DESPAIR,
  ];
}
```

### 2. Required Sprite Assets

Create or add these sprite assets to your asset loader:

- `despair_idle` - Enemy/boss idle sprite
- `despair_walk` - Walk animation (optional)
- `despair_attack` - Attack animation (optional)

If sprites don't exist, the enemy will use the specified texture key and fall back gracefully.

---

## Testing Checklist

Before considering your new world complete, verify:

### Configuration
- [ ] `SinWorld` enum includes new value
- [ ] `WORLD_CONFIGS` has complete config entry
- [ ] `getAllWorlds()` returns new world
- [ ] Portal position doesn't overlap existing portals

### Enemies
- [ ] Sin enemy class created in `EnemyTypes.ts`
- [ ] Sin enemy imported in `EnemySpawnManager.ts`
- [ ] Sin enemy case added to `createSinEnemy()`
- [ ] Sin enemy spawns in the world (60% rate)

### Boss
- [ ] Sin boss class created in `SinBosses.ts`
- [ ] Sin boss imported in `EnemySpawnManager.ts`
- [ ] Sin boss case added to `createSinBoss()`
- [ ] Boss spawns on floor 3 of the world
- [ ] Boss has 3 attack patterns
- [ ] Boss has 3 phases (100%, 60%, 30% HP)

### Hub Integration
- [ ] Portal appears in hub at configured position
- [ ] Portal has correct color theme
- [ ] Portal label shows world name
- [ ] Entering portal starts world at floor 1

### Progression
- [ ] World can be completed (boss defeated on floor 3)
- [ ] Checkmark appears on portal after completion
- [ ] Progress persists through save/load

### Visual Polish
- [ ] Colors are visible and thematic
- [ ] Enemy/boss auras render correctly
- [ ] No console errors during gameplay
- [ ] Performance is acceptable (no lag from auras)

### Gameplay Balance
- [ ] Enemy stats scale appropriately with floor
- [ ] Boss difficulty is challenging but fair
- [ ] Special mechanics (auras, drains, etc.) work correctly
- [ ] XP/gold rewards are appropriate

---

## Quick Reference: File Locations

| File | Purpose |
|------|---------|
| `/src/config/WorldConfig.ts` | World definitions, colors, portal positions |
| `/src/entities/enemies/EnemyTypes.ts` | Sin enemy classes |
| `/src/entities/enemies/SinBosses.ts` | Sin boss classes |
| `/src/systems/EnemySpawnManager.ts` | Enemy/boss spawning logic |
| `/src/scenes/HubScene.ts` | Hub portal creation and interaction |
| `/src/systems/ProgressionSystem.ts` | World completion tracking |

---

## Troubleshooting

### "Enemy not spawning"
1. Check that enemy class is exported from `EnemyTypes.ts`
2. Verify import in `EnemySpawnManager.ts`
3. Ensure case exists in `createSinEnemy()` switch

### "Boss not appearing"
1. Verify boss is imported in `EnemySpawnManager.ts`
2. Check case in `createSinBoss()` switch
3. Ensure you're on floor 3 of the world

### "Portal missing from hub"
1. Check `portalPosition` coordinates are within hub bounds (0-24 x, 0-19 y)
2. Verify world is in `getAllWorlds()` array
3. Check for TypeScript errors in WorldConfig

### "Colors look wrong"
1. Ensure hex values are correct format (`0xRRGGBB`)
2. Check that floor/wall colors are darker than primary
3. Verify portal color matches primary for consistency
