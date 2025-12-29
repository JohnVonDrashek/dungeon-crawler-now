# Adding New Enemies

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.70-purple)](https://phaser.io/)

A complete guide to implementing new enemy types in the dungeon crawler.

---

## Table of Contents

1. [Enemy System Overview](#enemy-system-overview)
2. [Step-by-Step Guide](#step-by-step-guide)
3. [Required Properties and Methods](#required-properties-and-methods)
4. [AI Behavior Customization](#ai-behavior-customization)
5. [Stat Balancing Guidelines](#stat-balancing-guidelines)
6. [Registration in EnemyTypes](#registration-in-enemytypes)
7. [Complete Code Example](#complete-code-example)
8. [Testing Checklist](#testing-checklist)

---

## Enemy System Overview

### Architecture

The enemy system uses a class hierarchy:

```
Enemy (base class)
├── FastEnemy
├── TankEnemy
├── RangedEnemy
├── BossEnemy
└── Sin Enemies (themed variants)
    ├── SlothEnemy
    ├── GluttonyEnemy
    ├── GreedEnemy
    ├── EnvyEnemy
    ├── WrathEnemy
    ├── LustEnemy
    └── PrideEnemy
```

**Key Files:**
- `/src/entities/Enemy.ts` - Base enemy class with AI state machine
- `/src/entities/enemies/EnemyTypes.ts` - Standard enemy variants
- `/src/entities/enemies/SinBosses.ts` - Boss variants for each sin
- `/src/systems/EnemySpawnManager.ts` - Spawning logic and enemy registration
- `/src/config/WorldConfig.ts` - World-enemy associations

### Core Concepts

**AI States:**
```typescript
enum EnemyState {
  IDLE = 'idle',      // Standing still, player not in range
  CHASE = 'chase',    // Moving toward player
  ATTACK = 'attack',  // In attack range, dealing damage
  RETREAT = 'retreat' // Low HP, fleeing from player
}
```

**Game Loop:**
The base `Enemy` class handles:
1. Target tracking (player reference)
2. State transitions based on distance/HP
3. Directional animation updates
4. Light2D pipeline for visibility in dark dungeons

---

## Step-by-Step Guide

### Step 1: Design Your Enemy

Before coding, define your enemy's:
- **Theme/Identity**: What makes this enemy unique?
- **Primary behavior**: Aggressive? Defensive? Ranged?
- **Special mechanic**: What sets it apart from others?
- **Sprite requirements**: Size (32x32 or 48x48), animation count

### Step 2: Prepare Sprite Assets

Place your sprites in `/assets/characters/`:

**Required files:**
```
assets/characters/
  └── your_enemy_idle.png    # 8 columns (directions: S, SW, W, NW, N, NE, E, SE)
  └── your_enemy_walk.png    # 8 columns x 4 rows (optional, for movement anims)
```

**Standard sizes:**
- Regular enemies: 32x32 pixels per frame
- Boss enemies: 48x48 pixels per frame

### Step 3: Register Sprite Loading

Edit `/src/scenes/BootScene.ts`:

```typescript
// In preload() - Add to basicEnemies array or load separately:
const basicEnemies = ['imp', 'demon_brute', 'cultist', 'your_enemy'];

// OR for bosses (48x48):
const sinBosses = ['pride', 'greed', /* ... */ 'your_boss'];
```

### Step 4: Create Animation Definitions

In `BootScene.ts` `createEnemyAnimations()`:

```typescript
// Animations are auto-created for enemies in basicEnemies array
// For custom frame counts or behavior, add manually:
directions.forEach((dir, index) => {
  this.anims.create({
    key: `your_enemy_idle_${dir}`,
    frames: [{ key: 'your_enemy_idle', frame: index }],
    frameRate: 1,
  });
});
```

### Step 5: Implement the Enemy Class

Create or add to `/src/entities/enemies/EnemyTypes.ts`:

```typescript
export class YourEnemy extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'your_enemy_idle', {
      hp: 30 + floor * 5,
      attack: 6 + floor,
      defense: 2,
      speed: 70 + floor * 3,
      xpValue: 25 + floor * 5,
    });
    this.setupSpriteAnimations('your_enemy', true); // true = has walk anims
  }
}
```

### Step 6: Register in EnemySpawnManager

Edit `/src/systems/EnemySpawnManager.ts`:

**Add import:**
```typescript
import { YourEnemy } from '../entities/enemies/EnemyTypes';
```

**Add to `createSinEnemy()` switch:**
```typescript
case 'YourEnemy':
  return new YourEnemy(this.scene, x, y, this.floor);
```

**Add to spawn logic in `createLegacyEnemy()` or `createWorldEnemy()`:**
```typescript
if (roll < 0.15) {
  return new YourEnemy(this.scene, x, y, this.floor);
}
```

### Step 7: Associate with World (Optional)

Edit `/src/config/WorldConfig.ts`:

```typescript
[SinWorld.YOUR_WORLD]: {
  // ...
  enemyTypes: ['YourEnemy', 'FastEnemy', 'BasicEnemy'],
  primaryEnemy: 'YourEnemy',  // 60% spawn rate in this world
  // ...
}
```

---

## Required Properties and Methods

### Base Enemy Properties

| Property | Type | Description |
|----------|------|-------------|
| `hp` | `number` | Current health points |
| `maxHp` | `number` | Maximum health points |
| `attack` | `number` | Damage dealt per hit |
| `defense` | `number` | Damage reduction |
| `speed` | `number` | Movement speed (pixels/sec) |
| `xpValue` | `number` | XP awarded on death |

### Protected Properties (for subclasses)

| Property | Type | Description |
|----------|------|-------------|
| `target` | `Player \| null` | Reference to player |
| `spriteKey` | `string` | Base sprite name for animations |
| `facingDirection` | `string` | Current facing (e.g., 'south') |
| `hasWalkAnim` | `boolean` | Whether walk animations exist |

### Key Methods to Override

```typescript
// Called every frame - add custom behavior here
update(time: number, delta: number): void {
  super.update(time, delta);  // MUST call super
  // Your custom logic
}

// Called when this enemy damages the player
onSuccessfulAttack(damageDealt: number): void {
  // Healing, stealing, special effects
}

// Called when this enemy takes damage
takeDamage(amount: number): void {
  // Damage reflection, enrage mechanics
  super.takeDamage(amount);  // MUST call super
}

// Called on death - cleanup custom graphics
destroy(fromScene?: boolean): void {
  // Clean up custom graphics, effects
  super.destroy(fromScene);  // MUST call super
}
```

---

## AI Behavior Customization

### Override Movement in Update

```typescript
update(time: number, delta: number): void {
  super.update(time, delta);

  if (!this.active || !this.target) return;

  const dist = Phaser.Math.Distance.Between(
    this.x, this.y, this.target.x, this.target.y
  );

  // Example: Keep distance (ranged behavior)
  if (dist < this.PREFERRED_RANGE * 0.7) {
    const angle = Phaser.Math.Angle.Between(
      this.target.x, this.target.y, this.x, this.y
    );
    this.setVelocity(
      Math.cos(angle) * this.speed,
      Math.sin(angle) * this.speed
    );
  }
}
```

### Common AI Patterns

**Charger (aggressive):**
```typescript
// Increase speed when health is low
if (this.hp < this.maxHp * 0.5 && !this.isEnraged) {
  this.speed *= 1.5;
  this.isEnraged = true;
}
```

**Kiter (keeps distance):**
```typescript
const PREFERRED_RANGE = TILE_SIZE * 5;
if (dist < PREFERRED_RANGE * 0.7) {
  // Move away from player
}
```

**Ambusher (waits then strikes):**
```typescript
if (dist < TRIGGER_RANGE && !this.hasTriggered) {
  this.hasTriggered = true;
  this.speed *= 2;  // Burst of speed
}
```

### Adding Special Attacks

```typescript
private shootCooldown: number = 0;
private readonly SHOOT_COOLDOWN_MS = 2000;

update(time: number, delta: number): void {
  super.update(time, delta);

  this.shootCooldown -= delta;

  if (this.shootCooldown <= 0 && this.projectileGroup) {
    this.shoot();
    this.shootCooldown = this.SHOOT_COOLDOWN_MS;
  }
}

private shoot(): void {
  if (!this.target || !this.projectileGroup) return;

  const projectile = this.projectileGroup.create(
    this.x, this.y, 'enemy_projectile'
  ) as Phaser.Physics.Arcade.Sprite;

  projectile.setData('damage', this.attack);
  projectile.setDepth(8);

  const angle = Phaser.Math.Angle.Between(
    this.x, this.y, this.target.x, this.target.y
  );
  projectile.setVelocity(
    Math.cos(angle) * 200,
    Math.sin(angle) * 200
  );

  // Auto-destroy after 3 seconds
  this.scene.time.delayedCall(3000, () => {
    if (projectile.active) projectile.destroy();
  });
}
```

### Emitting Game Events

The enemy system communicates via Phaser events:

```typescript
// Slow the player
this.scene.events.emit('playerSlowed', 0.5);  // 50% speed

// Pull the player toward this enemy
this.scene.events.emit('playerPulled', { x: forceX, y: forceY });

// Reflect damage back to player
this.scene.events.emit('damageReflected', damageAmount);

// Notify gold was stolen
this.scene.events.emit('goldStolen', amount);

// Spawn additional enemies
this.scene.events.emit('enemySpawned', newEnemy);
```

---

## Stat Balancing Guidelines

### Floor Scaling Formula

Stats should scale with floor number for progression:

```typescript
// Recommended scaling patterns
hp: BASE_HP + floor * HP_PER_FLOOR,
attack: BASE_ATK + floor * ATK_PER_FLOOR,
defense: BASE_DEF + Math.floor(floor / 2),
speed: BASE_SPEED + floor * SPEED_PER_FLOOR,
xpValue: BASE_XP + floor * XP_PER_FLOOR,
```

### Reference Stats by Enemy Type

| Type | Base HP | HP/Floor | Base ATK | ATK/Floor | Speed | XP |
|------|---------|----------|----------|-----------|-------|-----|
| **Fast** | 15 | +3 | 4 | +1 | 120+ | 15 |
| **Basic** | 20-30 | +5 | 5-8 | +2 | 60-80 | 20-25 |
| **Tank** | 50 | +10 | 8 | +2 | 40 | 35 |
| **Ranged** | 20 | +4 | 6 | +2 | 50 | 30 |
| **Sin (weak)** | 25-35 | +4-6 | 3-5 | +1 | 60-100 | 35-40 |
| **Sin (strong)** | 45-80 | +8-15 | 8-10 | +2 | 25-80 | 50-60 |
| **Boss** | 200+ | +30 | 15 | +3 | 60 | 200 |
| **Sin Boss** | 350-550 | +35-55 | 15-25 | +3-5 | 30-75 | 300 |

### Balancing Tips

1. **High HP + Low Speed** = Tank (punishing if you get hit)
2. **Low HP + High Speed** = Glass cannon (easy to kill, hard to catch)
3. **Special mechanics** should offset weaker base stats
4. **Defense above 5** makes enemies feel tanky
5. **Speed above 100** makes enemies hard to escape
6. **Test on floor 1 AND floor 10** to ensure scaling feels right

---

## Registration in EnemyTypes

### Adding to Spawn Pools

**Legacy Mode (no world):**
Edit `createLegacyEnemy()` in `EnemySpawnManager.ts`:

```typescript
private createLegacyEnemy(x: number, y: number): Enemy {
  const roll = Math.random();

  // Your enemy: 10% chance on floor 5+
  if (this.floor >= 5 && roll < 0.10) {
    return new YourEnemy(this.scene, x, y, this.floor);
  }

  // ... rest of spawn logic
}
```

**World Mode:**
1. Add enemy type string to `WorldConfig.enemyTypes`
2. Add case to `createSinEnemy()` switch statement

### Floor Requirements

Control when enemies start appearing:

```typescript
// Only spawn on floor 5+
if (this.floor >= 5 && roll < 0.10) {
  return new YourEnemy(this.scene, x, y, this.floor);
}
```

### Spawn Probability

Adjust the probability ranges:

```typescript
// Common: 15-25%
if (roll < 0.25) return new CommonEnemy(...);

// Uncommon: 8-12%
if (roll < 0.12) return new UncommonEnemy(...);

// Rare: 3-5%
if (roll < 0.05) return new RareEnemy(...);
```

---

## Complete Code Example

Here's a complete implementation of a new "Phantom" enemy that phases through walls and teleports:

### `/src/entities/enemies/EnemyTypes.ts`

```typescript
// Phantom - Ethereal enemy that teleports when damaged
export class PhantomEnemy extends Enemy {
  private teleportCooldown: number = 0;
  private readonly TELEPORT_COOLDOWN_MS = 3000;
  private readonly TELEPORT_RANGE = TILE_SIZE * 4;
  private phaseEffect: Phaser.GameObjects.Graphics | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'phantom_idle', {
      hp: 25 + floor * 4,      // Low HP - offset by teleporting
      attack: 7 + floor * 2,    // Moderate damage
      defense: 0,               // No defense - ethereal
      speed: 90 + floor * 3,    // Fast
      xpValue: 40 + floor * 8,  // Good XP reward
    });
    this.setupSpriteAnimations('phantom', true);
    this.setAlpha(0.7);  // Ghostly appearance
    this.createPhaseEffect();
  }

  private createPhaseEffect(): void {
    this.phaseEffect = this.scene.add.graphics();
    this.phaseEffect.setDepth(this.depth - 1);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active) return;

    // Update cooldown
    this.teleportCooldown = Math.max(0, this.teleportCooldown - delta);

    // Update phase effect position
    if (this.phaseEffect) {
      this.phaseEffect.clear();
      this.phaseEffect.fillStyle(0x9966ff, 0.2);
      this.phaseEffect.fillCircle(this.x, this.y, 20);
    }

    // Pulse alpha for ghostly effect
    const pulse = 0.5 + Math.sin(time * 0.005) * 0.2;
    this.setAlpha(pulse);
  }

  takeDamage(amount: number): void {
    super.takeDamage(amount);

    // Teleport away when damaged (if cooldown ready)
    if (this.active && this.teleportCooldown <= 0) {
      this.teleport();
      this.teleportCooldown = this.TELEPORT_COOLDOWN_MS;
    }
  }

  private teleport(): void {
    // Flash effect at old position
    const oldX = this.x;
    const oldY = this.y;

    // Calculate new position (random direction)
    const angle = Math.random() * Math.PI * 2;
    const newX = this.x + Math.cos(angle) * this.TELEPORT_RANGE;
    const newY = this.y + Math.sin(angle) * this.TELEPORT_RANGE;

    // Teleport
    this.setPosition(newX, newY);

    // Visual feedback - flash at both positions
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 50,
      yoyo: true,
      onComplete: () => {
        if (this.active) this.setAlpha(0.7);
      }
    });

    // Particles at old location
    const particles = this.scene.add.graphics();
    particles.fillStyle(0x9966ff, 0.6);
    particles.fillCircle(oldX, oldY, 15);
    this.scene.time.delayedCall(200, () => particles.destroy());
  }

  destroy(fromScene?: boolean): void {
    if (this.phaseEffect) {
      this.phaseEffect.destroy();
    }
    super.destroy(fromScene);
  }
}
```

### Registration in `EnemySpawnManager.ts`

```typescript
// Add import
import { PhantomEnemy } from '../entities/enemies/EnemyTypes';

// Add to createSinEnemy switch:
case 'PhantomEnemy':
  return new PhantomEnemy(this.scene, x, y, this.floor);

// Add to createLegacyEnemy:
// Phantom: Floor 6+, 6% chance
if (this.floor >= 6 && sinRoll >= 0.53 && sinRoll < 0.59) {
  return new PhantomEnemy(this.scene, x, y, this.floor);
}
```

### Registration in `BootScene.ts`

```typescript
// Add to basicEnemies or load separately:
this.load.spritesheet('phantom_idle', 'assets/characters/phantom_idle.png', {
  frameWidth: 32,
  frameHeight: 32,
});
this.load.spritesheet('phantom_walk', 'assets/characters/phantom_walk.png', {
  frameWidth: 32,
  frameHeight: 32,
});
```

---

## Testing Checklist

Use this checklist before merging your new enemy:

### Sprite & Animation
- [ ] Idle sprite loads without errors
- [ ] Walk animation plays smoothly (if applicable)
- [ ] All 8 directions display correctly
- [ ] Sprite size matches other enemies of same tier

### Combat Mechanics
- [ ] Enemy takes damage and shows red flash
- [ ] Death animation plays correctly
- [ ] XP is awarded to player on kill
- [ ] Health bar displays and updates

### AI Behavior
- [ ] Enemy transitions between IDLE, CHASE, ATTACK, RETREAT
- [ ] Movement speed feels appropriate
- [ ] Attack range is reasonable
- [ ] Special abilities trigger correctly
- [ ] No stuck/frozen states

### Special Mechanics
- [ ] Unique ability works as intended
- [ ] Visual feedback is clear to player
- [ ] Sound effects play (if applicable)
- [ ] No memory leaks (graphics/timers cleaned up)

### Balance Testing
- [ ] Test on Floor 1: Enemy is challenging but fair
- [ ] Test on Floor 5: Scaling feels appropriate
- [ ] Test on Floor 10: Enemy isn't too easy or too hard
- [ ] Compare to similar enemy types

### Integration
- [ ] Spawns in correct world/floor conditions
- [ ] Spawn probability is appropriate (not too common/rare)
- [ ] Works with room activation system
- [ ] Works with challenge room scaling

### Edge Cases
- [ ] Enemy doesn't get stuck on walls
- [ ] Multiple instances don't conflict
- [ ] Clean destroy without errors
- [ ] Works with save/load (if applicable)

### Performance
- [ ] No frame drops with 5+ enemies
- [ ] Graphics/effects properly cleaned up
- [ ] No console errors or warnings

---

## Quick Reference

### File Locations
```
src/entities/Enemy.ts          # Base class
src/entities/enemies/          # Enemy implementations
  ├── EnemyTypes.ts           # Standard enemies
  └── SinBosses.ts            # Boss enemies
src/systems/EnemySpawnManager.ts  # Spawn logic
src/config/WorldConfig.ts      # World associations
src/scenes/BootScene.ts        # Asset loading
assets/characters/             # Sprite files
```

### Key Constants
```typescript
import { TILE_SIZE } from '../utils/constants';  // 32 pixels
```

### Common Imports
```typescript
import Phaser from 'phaser';
import { Enemy, EnemyState } from '../Enemy';
import { Player } from '../Player';
import { TILE_SIZE } from '../../utils/constants';
```

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
