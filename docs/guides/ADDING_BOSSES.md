# Adding New Bosses

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Phaser 3](https://img.shields.io/badge/Phaser-3.70-blue?logo=phaser)](https://phaser.io/)

A complete guide for creating compelling boss encounters in the dungeon crawler. This tutorial covers everything from the boss system architecture to implementation patterns and balancing strategies.

---

## Table of Contents

1. [Boss System Overview](#1-boss-system-overview)
2. [SinBoss Base Class Explanation](#2-sinboss-base-class-explanation)
3. [Phase System Implementation](#3-phase-system-implementation)
4. [Creating Unique Abilities](#4-creating-unique-abilities)
5. [Projectile Patterns for Bosses](#5-projectile-patterns-for-bosses)
6. [Visual Effects and Telegraphing](#6-visual-effects-and-telegraphing)
7. [Complete Code Example](#7-complete-code-example)
8. [Balancing Guidelines](#8-balancing-guidelines)
9. [Testing Checklist](#9-testing-checklist)

---

## 1. Boss System Overview

### Architecture

The boss system is built on a class hierarchy that promotes code reuse while allowing for unique boss behaviors:

```
Phaser.Physics.Arcade.Sprite
         |
       Enemy              (Base enemy with AI, stats, animations)
         |
      SinBoss             (Abstract base for bosses with phases and patterns)
         |
  +-----------+----------+----------+----------+----------+----------+
  |           |          |          |          |          |          |
PrideBoss  GreedBoss  WrathBoss  SlothBoss  EnvyBoss  GluttonyBoss  LustBoss
```

### Key Files

| File | Purpose |
|------|---------|
| `src/entities/Enemy.ts` | Base class with AI states, movement, damage handling |
| `src/entities/enemies/SinBosses.ts` | SinBoss base and all sin boss implementations |
| `src/entities/enemies/EnemyTypes.ts` | Regular enemy variants (for reference) |

### What Makes a Boss Different from Regular Enemies

| Feature | Regular Enemy | Boss |
|---------|---------------|------|
| HP | 15-80 | 350-550+ |
| Scale | 1x | 2x |
| Attack Patterns | Single basic attack | Multiple rotating patterns |
| Phases | None | 3 phases based on HP |
| Projectiles | Optional, simple | Complex patterns |
| Special Mechanics | Optional | Required (themed abilities) |
| Visual Feedback | Basic hit flash | Phase transitions, auras, effects |

---

## 2. SinBoss Base Class Explanation

The `SinBoss` abstract class provides the foundation for all boss encounters. Understanding it is essential for creating new bosses.

### Class Definition

```typescript
abstract class SinBoss extends Enemy {
  protected phase: number = 1;
  protected patternCooldown: number = 0;
  protected projectileGroup: Phaser.Physics.Arcade.Group | null = null;
  protected readonly baseCooldown: number = 2500;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    texture: string,
    floor: number,
    stats: { hp: number; attack: number; defense: number; speed: number }
  ) {
    super(scene, x, y, texture, {
      hp: stats.hp,
      attack: stats.attack,
      defense: stats.defense,
      speed: stats.speed,
      xpValue: 300 + floor * 50,
    });
    this.setScale(2);
  }

  // Abstract methods you MUST implement
  protected abstract executePattern(): void;
  protected abstract onPhaseChange(newPhase: number): void;
}
```

### Key Properties

| Property | Type | Purpose |
|----------|------|---------|
| `phase` | `number` | Current phase (1, 2, or 3) |
| `patternCooldown` | `number` | Time until next attack pattern |
| `projectileGroup` | `Phaser.Physics.Arcade.Group` | Pool for spawning projectiles |
| `baseCooldown` | `number` | Base time between patterns (2500ms) |

### Inherited from Enemy

Your boss automatically gets:

- **AI State Machine**: IDLE, CHASE, ATTACK, RETREAT states
- **Directional Animations**: 8-direction sprite animations
- **Target Tracking**: Follows the player
- **Damage Handling**: HP reduction, death events
- **Dynamic Lighting**: Small light source for visibility

### Abstract Methods to Implement

Every boss must implement these two methods:

```typescript
// Called when pattern cooldown expires - define your attack rotation here
protected abstract executePattern(): void;

// Called when boss transitions to a new phase - update visuals and behavior
protected abstract onPhaseChange(newPhase: number): void;
```

---

## 3. Phase System Implementation

The phase system creates escalating difficulty as the boss takes damage. Phases are determined by HP percentage.

### Default Phase Thresholds

| Phase | HP Range | Pattern Cooldown |
|-------|----------|------------------|
| 1 | 100% - 61% | 2500ms (baseCooldown) |
| 2 | 60% - 31% | 2500ms (baseCooldown) |
| 3 | 30% - 0% | 1500ms (baseCooldown * 0.6) |

### Phase Detection (Built-in)

The `SinBoss.update()` method automatically detects phase changes:

```typescript
update(time: number, delta: number): void {
  super.update(time, delta);
  if (!this.active) return;

  const hpPercent = this.hp / this.maxHp;
  if (hpPercent <= 0.3 && this.phase !== 3) {
    this.phase = 3;
    this.onPhaseChange(3);
  } else if (hpPercent <= 0.6 && this.phase === 1) {
    this.phase = 2;
    this.onPhaseChange(2);
  }

  // ... pattern execution ...
}
```

### Implementing onPhaseChange

Each phase should feel distinctly different. Common phase change effects:

```typescript
protected onPhaseChange(newPhase: number): void {
  if (newPhase === 2) {
    // Phase 2: Getting serious
    this.setTint(0xf97316);  // Visual change
    this.speed *= 1.15;      // Slight speed boost
  } else if (newPhase === 3) {
    // Phase 3: Rage mode
    this.setTint(0xfbbf24);  // Brighter/angrier color
    this.attack *= 1.5;      // Damage boost
    this.speed *= 1.3;       // Major speed boost

    // Dramatic visual effect
    this.scene.tweens.add({
      targets: this,
      scaleX: 2.3,
      scaleY: 2.3,
      duration: 300,
      yoyo: true,
      repeat: 2,
    });
  }
}
```

### Phase Design Principles

1. **Phase 1**: Teach the player the boss's mechanics
2. **Phase 2**: Increase intensity, add new patterns or modifiers
3. **Phase 3**: Full desperation mode - faster, stronger, more aggressive

---

## 4. Creating Unique Abilities

Each boss needs a thematic identity. Design abilities around your boss's concept.

### Ability Categories

| Category | Description | Example |
|----------|-------------|---------|
| **Aura Effects** | Persistent area effects | Sloth's slowing aura, Lust's pull field |
| **Projectile Attacks** | Ranged damage patterns | Spiral, ring, spread, wave |
| **Movement Attacks** | Physical charges/dashes | Prideful charge, berserker dash |
| **Summons** | Spawning minions | Envy's shadow clones |
| **On-Hit Effects** | Triggered when dealing damage | Gluttony lifesteal, Greed gold theft |
| **On-Damage Effects** | Triggered when taking damage | Pride damage reflection |

### Aura Effect Pattern

For persistent area effects:

```typescript
private auraGraphics: Phaser.GameObjects.Graphics | null = null;
private readonly AURA_RADIUS = TILE_SIZE * 6;

private createAura(): void {
  this.auraGraphics = this.scene.add.graphics();
  this.auraGraphics.setDepth(1);  // Below boss
  this.auraGraphics.fillStyle(0xec4899, 0.15);  // Color, opacity
  this.auraGraphics.fillCircle(0, 0, this.AURA_RADIUS);
  this.auraGraphics.setPosition(this.x, this.y);
}

update(time: number, delta: number): void {
  super.update(time, delta);

  // Update aura position
  if (this.auraGraphics) {
    this.auraGraphics.setPosition(this.x, this.y);
  }

  // Apply effect to player in range
  if (this.target) {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
    if (dist < this.AURA_RADIUS) {
      this.scene.events.emit('playerSlowed', 0.5);
    }
  }
}

destroy(fromScene?: boolean): void {
  if (this.auraGraphics) this.auraGraphics.destroy();
  super.destroy(fromScene);
}
```

### Summon Pattern

For spawning minions:

```typescript
private minions: Enemy[] = [];

private spawnMinion(): void {
  const angle = Math.random() * Math.PI * 2;
  const dist = TILE_SIZE * 3;

  const minion = new Enemy(
    this.scene,
    this.x + Math.cos(angle) * dist,
    this.y + Math.sin(angle) * dist,
    'minion_sprite',
    {
      hp: Math.floor(this.maxHp * 0.15),
      attack: Math.floor(this.attack * 0.4),
      defense: 0,
      speed: this.speed,
      xpValue: 15,
    }
  );

  minion.setScale(1.2);
  minion.setAlpha(0.7);
  minion.setTarget(this.target!);

  this.minions.push(minion);
  this.scene.events.emit('enemySpawned', minion);
}

destroy(fromScene?: boolean): void {
  this.minions.forEach(m => m.active && m.destroy());
  this.minions = [];
  super.destroy(fromScene);
}
```

### On-Hit Effects

Override `onSuccessfulAttack` for effects when the boss damages the player:

```typescript
onSuccessfulAttack(damageDealt: number): void {
  // Lifesteal example
  const healAmount = Math.floor(damageDealt * 0.3);
  this.hp = Math.min(this.maxHp, this.hp + healAmount);

  // Visual feedback
  this.setTint(0x22c55e);
  this.scene.time.delayedCall(300, () => {
    if (this.active) this.clearTint();
  });
}
```

### Damage Reflection

Override `takeDamage` for effects when the boss is damaged:

```typescript
takeDamage(amount: number): void {
  // Reflect 30% damage
  const reflectedDamage = Math.floor(amount * 0.3);
  if (reflectedDamage > 0 && this.target) {
    this.scene.events.emit('damageReflected', reflectedDamage);

    this.setTint(0xffd700);
    this.scene.time.delayedCall(150, () => {
      if (this.active) this.clearTint();
    });
  }

  super.takeDamage(amount);
}
```

---

## 5. Projectile Patterns for Bosses

Projectiles are the primary ranged threat for bosses. The `SinBoss` base class provides a helper method.

### Using spawnProjectile

```typescript
protected spawnProjectile(
  angle: number,           // Direction in radians
  speed: number,           // Pixels per second
  color: number = 0xff00ff, // Tint color
  scale: number = 1.5      // Size multiplier
): Phaser.Physics.Arcade.Sprite | null
```

**Important**: Projectiles are automatically destroyed after 4 seconds.

### Common Projectile Patterns

#### Circle/Ring Pattern

Fires projectiles evenly in all directions:

```typescript
private circlePattern(): void {
  const numProjectiles = this.phase === 3 ? 16 : 10;

  for (let i = 0; i < numProjectiles; i++) {
    const angle = (i / numProjectiles) * Math.PI * 2;
    this.spawnProjectile(angle, 150, 0xff4444);
  }
}
```

#### Spread Pattern

Fires a cone of projectiles toward the player:

```typescript
private spreadPattern(): void {
  if (!this.target) return;

  const baseAngle = Phaser.Math.Angle.Between(
    this.x, this.y,
    this.target.x, this.target.y
  );

  const numProjectiles = this.phase === 3 ? 9 : 5;
  const spreadAngle = Math.PI / 3;  // 60 degrees total

  for (let i = 0; i < numProjectiles; i++) {
    const angle = baseAngle - spreadAngle / 2 + (i / (numProjectiles - 1)) * spreadAngle;
    this.spawnProjectile(angle, 200, 0xff8800);
  }
}
```

#### Wave Pattern

Fires multiple sequential volleys:

```typescript
private wavePattern(): void {
  if (!this.target) return;

  const baseAngle = Phaser.Math.Angle.Between(
    this.x, this.y,
    this.target.x, this.target.y
  );

  const waves = this.phase === 3 ? 4 : 2;

  for (let wave = 0; wave < waves; wave++) {
    this.scene.time.delayedCall(wave * 250, () => {
      if (!this.active) return;

      for (let i = -2; i <= 2; i++) {
        const angle = baseAngle + i * 0.15;
        this.spawnProjectile(angle, 180, 0x44ff44);
      }
    });
  }
}
```

#### Spiral Pattern

Creates a rotating spiral effect:

```typescript
private spiralPattern(): void {
  const numProjectiles = this.phase === 3 ? 20 : 12;

  for (let i = 0; i < numProjectiles; i++) {
    this.scene.time.delayedCall(i * 100, () => {
      if (!this.active) return;

      // 2 full rotations over the duration
      const angle = (i / numProjectiles) * Math.PI * 4;
      this.spawnProjectile(angle, 140, 0x8844ff);
    });
  }
}
```

#### Exploding Objects

Create objects that explode into projectiles:

```typescript
private placeBombs(): void {
  const count = this.phase === 3 ? 4 : 2;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = TILE_SIZE * (2 + Math.random() * 3);

    const bomb = this.scene.add.sprite(
      this.x + Math.cos(angle) * dist,
      this.y + Math.sin(angle) * dist,
      'bomb_sprite'
    );
    bomb.setScale(1.5);
    bomb.setTint(0xff0000);
    bomb.setDepth(5);

    // Explode after delay
    this.scene.time.delayedCall(2000, () => {
      if (bomb.active) {
        // Spawn 8 projectiles in all directions
        for (let j = 0; j < 8; j++) {
          const projAngle = (j / 8) * Math.PI * 2;
          const proj = this.projectileGroup?.create(
            bomb.x, bomb.y, 'enemy_projectile'
          ) as Phaser.Physics.Arcade.Sprite;

          if (proj) {
            proj.setTint(0xff4400);
            proj.setData('damage', Math.floor(this.attack * 0.4));
            proj.setVelocity(
              Math.cos(projAngle) * 120,
              Math.sin(projAngle) * 120
            );
            this.scene.time.delayedCall(3000, () => proj.active && proj.destroy());
          }
        }
        bomb.destroy();
      }
    });
  }
}
```

### Charge/Dash Attack

Movement-based attacks:

```typescript
private chargeAttack(): void {
  if (!this.target) return;

  const angle = Phaser.Math.Angle.Between(
    this.x, this.y,
    this.target.x, this.target.y
  );

  const chargeSpeed = this.phase === 3 ? 400 : 300;
  const chargeDuration = 500;  // ms

  this.setVelocity(
    Math.cos(angle) * chargeSpeed,
    Math.sin(angle) * chargeSpeed
  );

  // Stop after duration
  this.scene.time.delayedCall(chargeDuration, () => {
    if (this.active) {
      this.setVelocity(0, 0);
    }
  });
}
```

---

## 6. Visual Effects and Telegraphing

Good boss fights give players fair warning before dangerous attacks. This is called "telegraphing."

### Principles of Telegraphing

1. **Wind-up before powerful attacks**: Pause or animate before striking
2. **Visual indicators**: Color changes, particles, ground markers
3. **Audio cues**: Sound effects before attacks (when audio is implemented)
4. **Consistent timing**: Players should learn the rhythm

### Color Tinting for States

```typescript
// Danger colors (high to low threat)
const COLORS = {
  rage: 0xff0000,       // Pure red - imminent danger
  warning: 0xff4400,    // Orange-red - building up
  charged: 0xffd700,    // Gold - special ability
  healing: 0x22c55e,    // Green - boss healing
  weakened: 0x60a5fa,   // Blue - vulnerable state
};
```

### Pre-Attack Telegraph

```typescript
private telegraphedAttack(): void {
  // Visual warning
  this.setTint(0xff0000);

  // Freeze movement during telegraph
  this.setVelocity(0, 0);

  // Warning delay, then execute
  this.scene.time.delayedCall(800, () => {
    if (!this.active) return;

    this.clearTint();
    this.executeDangerousAttack();
  });
}
```

### Ground Warning Markers

```typescript
private showAreaWarning(x: number, y: number, radius: number): void {
  const warning = this.scene.add.graphics();
  warning.setDepth(2);
  warning.fillStyle(0xff0000, 0.3);
  warning.fillCircle(x, y, radius);

  // Pulse effect
  this.scene.tweens.add({
    targets: warning,
    alpha: 0.1,
    duration: 200,
    yoyo: true,
    repeat: 3,
    onComplete: () => warning.destroy(),
  });

  // Actual attack after warning
  this.scene.time.delayedCall(1200, () => {
    // Execute attack at x, y
  });
}
```

### Phase Transition Effects

Make phase changes dramatic and noticeable:

```typescript
protected onPhaseChange(newPhase: number): void {
  if (newPhase === 3) {
    // Screen shake
    this.scene.cameras.main.shake(300, 0.01);

    // Dramatic scale pulse
    this.scene.tweens.add({
      targets: this,
      scaleX: 2.5,
      scaleY: 2.5,
      duration: 300,
      yoyo: true,
      repeat: 2,
    });

    // Color transition
    this.setTint(0xff0000);

    // Brief invulnerability during transition
    this.scene.time.delayedCall(1000, () => {
      this.setTint(0xfbbf24);
    });
  }
}
```

### Visual Auras

Create dynamic visual effects around the boss:

```typescript
private createDynamicAura(): void {
  const aura = this.scene.add.graphics();
  aura.setDepth(this.depth - 1);

  // Animated pulsing aura
  this.scene.tweens.add({
    targets: { radius: TILE_SIZE * 2 },
    radius: TILE_SIZE * 3,
    duration: 1000,
    yoyo: true,
    repeat: -1,
    onUpdate: (tween) => {
      const r = tween.getValue();
      aura.clear();
      aura.fillStyle(0xff00ff, 0.1);
      aura.fillCircle(this.x, this.y, r);
    },
  });
}
```

---

## 7. Complete Code Example

Here is a complete implementation of a new boss: the **FearBoss** (representing the sin of Fear/Cowardice).

### FearBoss.ts

```typescript
/**
 * Fear Boss - Cowardly boss that uses terror tactics
 * - Creates fear zones that damage players who stand in them
 * - Teleports away when player gets too close
 * - Summons shadow minions to fight for it
 * - Phases increase paranoia with more effects
 */

import Phaser from 'phaser';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import { TILE_SIZE } from '../../utils/constants';

// Import the SinBoss base (this would be in the same file in practice)
// For this example, we'll extend Enemy directly and implement phase logic

export class FearBoss extends Enemy {
  // Phase tracking
  private phase: number = 1;
  private patternCooldown: number = 0;
  private readonly baseCooldown: number = 3000;

  // Projectile group (set externally)
  private projectileGroup: Phaser.Physics.Arcade.Group | null = null;

  // Attack pattern rotation
  private attackPattern: number = 0;

  // Fear zones on the ground
  private fearZones: Phaser.GameObjects.Graphics[] = [];

  // Shadow minions
  private shadows: Enemy[] = [];

  // Teleport cooldown
  private teleportCooldown: number = 0;
  private readonly TELEPORT_COOLDOWN = 5000;
  private readonly FLEE_DISTANCE = TILE_SIZE * 3;

  // Base stats for scaling
  private readonly baseAttack: number;
  private readonly baseSpeed: number;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'fear_idle', {
      hp: 420 + floor * 42,
      attack: 16 + floor * 3,
      defense: 5 + floor,
      speed: 65,
      xpValue: 300 + floor * 50,
    });

    this.baseAttack = this.attack;
    this.baseSpeed = this.speed;

    this.setScale(2);
    this.setupSpriteAnimations('fear', false);

    // Initial ethereal appearance
    this.setAlpha(0.9);
  }

  // Required: Set projectile group for ranged attacks
  setProjectileGroup(group: Phaser.Physics.Arcade.Group): void {
    this.projectileGroup = group;
  }

  update(time: number, delta: number): void {
    super.update(time, delta);
    if (!this.active) return;

    // Phase detection
    const hpPercent = this.hp / this.maxHp;
    if (hpPercent <= 0.3 && this.phase !== 3) {
      this.phase = 3;
      this.onPhaseChange(3);
    } else if (hpPercent <= 0.6 && this.phase === 1) {
      this.phase = 2;
      this.onPhaseChange(2);
    }

    // Pattern cooldown
    this.patternCooldown -= delta;
    if (this.patternCooldown <= 0 && this.projectileGroup) {
      this.executePattern();
      this.patternCooldown = this.phase === 3 ? this.baseCooldown * 0.5 : this.baseCooldown;
    }

    // Teleport cooldown
    this.teleportCooldown -= delta;

    // Fear-based flee behavior: teleport if player gets too close
    if (this.target && this.teleportCooldown <= 0) {
      const dist = Phaser.Math.Distance.Between(
        this.x, this.y,
        this.target.x, this.target.y
      );

      if (dist < this.FLEE_DISTANCE) {
        this.fearTeleport();
        this.teleportCooldown = this.TELEPORT_COOLDOWN;
      }
    }

    // Clean up destroyed zones and shadows
    this.fearZones = this.fearZones.filter(zone => zone.active);
    this.shadows = this.shadows.filter(shadow => shadow.active);

    // Apply fear zone damage
    this.checkFearZoneDamage();
  }

  private onPhaseChange(newPhase: number): void {
    if (newPhase === 2) {
      // Phase 2: Growing paranoia
      this.setTint(0x6b21a8);  // Purple
      this.setAlpha(0.85);

      // Spawn initial shadows
      this.spawnShadow();

      // Warning effect
      this.scene.cameras.main.shake(200, 0.005);
    } else if (newPhase === 3) {
      // Phase 3: Terror unleashed
      this.setTint(0x1f2937);  // Dark gray
      this.setAlpha(0.75);
      this.speed = Math.floor(this.baseSpeed * 1.4);

      // Spawn more shadows
      this.spawnShadow();
      this.spawnShadow();

      // Dramatic effect
      this.scene.cameras.main.shake(400, 0.01);
      this.scene.tweens.add({
        targets: this,
        scaleX: 2.4,
        scaleY: 2.4,
        duration: 400,
        yoyo: true,
        repeat: 2,
      });
    }
  }

  private executePattern(): void {
    if (!this.target) return;

    this.attackPattern = (this.attackPattern + 1) % 4;

    switch (this.attackPattern) {
      case 0:
        this.terrorWave();
        break;
      case 1:
        this.fearZonePlacement();
        break;
      case 2:
        this.shadowBolt();
        break;
      case 3:
        this.panicSpiral();
        break;
    }
  }

  // Attack 1: Wave of terror projectiles
  private terrorWave(): void {
    if (!this.target) return;

    const baseAngle = Phaser.Math.Angle.Between(
      this.x, this.y,
      this.target.x, this.target.y
    );

    const count = this.phase === 3 ? 9 : this.phase === 2 ? 7 : 5;
    const spread = Math.PI / 2.5;

    // Telegraph
    this.setTint(0x9333ea);
    this.scene.time.delayedCall(300, () => {
      if (!this.active) return;
      this.setTint(this.phase === 3 ? 0x1f2937 : this.phase === 2 ? 0x6b21a8 : 0xffffff);

      for (let i = 0; i < count; i++) {
        const angle = baseAngle - spread / 2 + (i / (count - 1)) * spread;
        this.spawnProjectile(angle, 170, 0x7c3aed);
      }
    });
  }

  // Attack 2: Place damaging fear zones on the ground
  private fearZonePlacement(): void {
    const count = this.phase === 3 ? 4 : this.phase === 2 ? 3 : 2;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const dist = TILE_SIZE * (3 + Math.random() * 4);

      const zoneX = this.x + Math.cos(angle) * dist;
      const zoneY = this.y + Math.sin(angle) * dist;

      // Create zone graphic
      const zone = this.scene.add.graphics();
      zone.setDepth(2);
      zone.fillStyle(0x4c1d95, 0.4);
      zone.fillCircle(0, 0, TILE_SIZE * 1.5);
      zone.setPosition(zoneX, zoneY);
      zone.setData('x', zoneX);
      zone.setData('y', zoneY);
      zone.setData('radius', TILE_SIZE * 1.5);

      this.fearZones.push(zone);

      // Zone expires after 8 seconds
      this.scene.time.delayedCall(8000, () => {
        if (zone.active) {
          this.scene.tweens.add({
            targets: zone,
            alpha: 0,
            duration: 500,
            onComplete: () => zone.destroy(),
          });
        }
      });
    }
  }

  // Attack 3: Targeted shadow bolt
  private shadowBolt(): void {
    if (!this.target) return;

    const baseAngle = Phaser.Math.Angle.Between(
      this.x, this.y,
      this.target.x, this.target.y
    );

    // Fire in bursts
    const bursts = this.phase === 3 ? 4 : 2;

    for (let burst = 0; burst < bursts; burst++) {
      this.scene.time.delayedCall(burst * 200, () => {
        if (!this.active || !this.target) return;

        // Recalculate angle for tracking
        const angle = Phaser.Math.Angle.Between(
          this.x, this.y,
          this.target.x, this.target.y
        );

        this.spawnProjectile(angle, 220, 0x1f2937, 1.8);
      });
    }
  }

  // Attack 4: Spiral pattern creating a wall of projectiles
  private panicSpiral(): void {
    const count = this.phase === 3 ? 24 : this.phase === 2 ? 16 : 10;

    for (let i = 0; i < count; i++) {
      this.scene.time.delayedCall(i * 80, () => {
        if (!this.active) return;

        const angle = (i / count) * Math.PI * 3;  // 1.5 rotations
        this.spawnProjectile(angle, 130, 0x7c3aed, 1.2);
      });
    }
  }

  // Defensive teleport when player gets too close
  private fearTeleport(): void {
    if (!this.target) return;

    // Visual effect at current position
    const vanishEffect = this.scene.add.graphics();
    vanishEffect.fillStyle(0x4c1d95, 0.5);
    vanishEffect.fillCircle(this.x, this.y, TILE_SIZE);
    this.scene.tweens.add({
      targets: vanishEffect,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => vanishEffect.destroy(),
    });

    // Calculate teleport destination (away from player)
    const angle = Phaser.Math.Angle.Between(
      this.target.x, this.target.y,
      this.x, this.y
    );

    const teleportDist = TILE_SIZE * 6;
    const newX = this.x + Math.cos(angle) * teleportDist;
    const newY = this.y + Math.sin(angle) * teleportDist;

    // Brief invisibility
    this.setAlpha(0);

    this.scene.time.delayedCall(200, () => {
      if (!this.active) return;

      this.setPosition(newX, newY);

      // Appear effect
      this.setAlpha(this.phase === 3 ? 0.75 : this.phase === 2 ? 0.85 : 0.9);

      const appearEffect = this.scene.add.graphics();
      appearEffect.fillStyle(0x7c3aed, 0.5);
      appearEffect.fillCircle(this.x, this.y, TILE_SIZE * 0.5);
      this.scene.tweens.add({
        targets: appearEffect,
        alpha: 0,
        scale: 3,
        duration: 400,
        onComplete: () => appearEffect.destroy(),
      });

      // Counter-attack after teleport in later phases
      if (this.phase >= 2 && this.target) {
        const counterAngle = Phaser.Math.Angle.Between(
          this.x, this.y,
          this.target.x, this.target.y
        );
        this.spawnProjectile(counterAngle, 200, 0x9333ea, 2);
      }
    });
  }

  // Summon shadow minion
  private spawnShadow(): void {
    if (!this.target) return;

    const angle = Math.random() * Math.PI * 2;
    const dist = TILE_SIZE * 2;

    const shadow = new Enemy(
      this.scene,
      this.x + Math.cos(angle) * dist,
      this.y + Math.sin(angle) * dist,
      'fear_idle',
      {
        hp: Math.floor(this.maxHp * 0.12),
        attack: Math.floor(this.attack * 0.35),
        defense: 0,
        speed: this.speed * 1.2,
        xpValue: 15,
      }
    );

    shadow.setScale(1.3);
    shadow.setAlpha(0.5);
    shadow.setTint(0x1f2937);
    shadow.setTarget(this.target as Player);

    this.shadows.push(shadow);
    this.scene.events.emit('enemySpawned', shadow);
  }

  // Check if player is standing in fear zones
  private checkFearZoneDamage(): void {
    if (!this.target) return;

    for (const zone of this.fearZones) {
      if (!zone.active) continue;

      const zoneX = zone.getData('x');
      const zoneY = zone.getData('y');
      const radius = zone.getData('radius');

      const dist = Phaser.Math.Distance.Between(
        this.target.x, this.target.y,
        zoneX, zoneY
      );

      if (dist < radius) {
        // Apply periodic damage (handled via event to prevent stacking)
        this.scene.events.emit('fearZoneDamage', Math.floor(this.attack * 0.15));
      }
    }
  }

  // Helper to spawn projectiles
  private spawnProjectile(
    angle: number,
    speed: number,
    color: number = 0x7c3aed,
    scale: number = 1.5
  ): Phaser.Physics.Arcade.Sprite | null {
    if (!this.projectileGroup) return null;

    const projectile = this.projectileGroup.create(
      this.x,
      this.y,
      'enemy_projectile'
    ) as Phaser.Physics.Arcade.Sprite;

    if (!projectile) return null;

    projectile.setTint(color);
    projectile.setData('damage', Math.floor(this.attack * 0.6));
    projectile.setDepth(8);
    projectile.setScale(scale);
    projectile.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.scene.time.delayedCall(4000, () => {
      if (projectile.active) projectile.destroy();
    });

    return projectile;
  }

  // Clean up on destroy
  destroy(fromScene?: boolean): void {
    // Destroy all fear zones
    this.fearZones.forEach(zone => zone.active && zone.destroy());
    this.fearZones = [];

    // Destroy all shadows
    this.shadows.forEach(shadow => shadow.active && shadow.destroy());
    this.shadows = [];

    super.destroy(fromScene);
  }
}
```

### Registering the Boss

To use the boss, add it to your game:

```typescript
// In GameScene or BossSpawner
import { FearBoss } from '../entities/enemies/FearBoss';

// Spawn the boss
const boss = new FearBoss(this, roomCenterX, roomCenterY, currentFloor);
boss.setTarget(this.player);
boss.setProjectileGroup(this.enemyProjectiles);
this.enemies.add(boss);

// Handle fear zone damage event
this.events.on('fearZoneDamage', (damage: number) => {
  // Apply damage once per second max
  if (!this.fearZoneCooldown) {
    this.player.takeDamage(damage);
    this.fearZoneCooldown = true;
    this.time.delayedCall(1000, () => { this.fearZoneCooldown = false; });
  }
});
```

---

## 8. Balancing Guidelines

Creating a fair but challenging boss requires careful stat tuning.

### Stat Scaling by Floor

Use formulas that scale appropriately:

| Stat | Recommended Formula | Notes |
|------|---------------------|-------|
| HP | `400 + floor * 40` | Start high, scale moderately |
| Attack | `18 + floor * 3` | Gradual increase |
| Defense | `5 + floor` | Low scaling to keep fights dynamic |
| Speed | Fixed (50-75) | Phase bonuses, not floor scaling |
| XP Value | `300 + floor * 50` | Reward for difficulty |

### Fight Duration Targets

| Difficulty Level | Target Duration | HP Range |
|------------------|-----------------|----------|
| Easy (Floor 1-3) | 45-60 seconds | 400-520 |
| Medium (Floor 4-6) | 60-90 seconds | 560-680 |
| Hard (Floor 7+) | 90-120 seconds | 720+ |

### Damage Balance

```
Player DPS * Target Duration = Boss HP + Healing
```

Example for Floor 5:
- Player DPS: ~15 damage/second
- Target Duration: 75 seconds
- Boss HP: 600 (with no healing)
- With 20% lifesteal: 750 effective HP

### Phase Transition Impact

| Phase | Damage Multiplier | Speed Multiplier | Pattern Cooldown |
|-------|-------------------|------------------|------------------|
| 1 | 1.0x | 1.0x | 100% |
| 2 | 1.2-1.3x | 1.1-1.2x | 100% |
| 3 | 1.5-1.7x | 1.3-1.5x | 50-70% |

### Projectile Tuning

| Metric | Recommended Range | Notes |
|--------|-------------------|-------|
| Damage | 40-70% of attack | Lower than melee |
| Speed | 100-250 px/s | Slow = avoidable, fast = threatening |
| Count | 5-12 base, +50% phase 3 | More isn't always better |
| Lifetime | 3-5 seconds | Long enough to threaten |

### Cooldown Guidelines

| Attack Type | Recommended Cooldown |
|-------------|---------------------|
| Light attacks (spreads) | 2-3 seconds |
| Heavy attacks (rings) | 3-4 seconds |
| Special abilities | 5-8 seconds |
| Charge/dash | 4-6 seconds |
| Summons | 8-12 seconds |

### Health Pool Distribution

For a boss with 600 HP:
- Phase 1: 600 - 360 HP (40% of fight)
- Phase 2: 360 - 180 HP (30% of fight)
- Phase 3: 180 - 0 HP (30% of fight)

---

## 9. Testing Checklist

Use this checklist when implementing and testing a new boss.

### Core Functionality

- [ ] Boss spawns correctly at designated location
- [ ] Boss has correct sprite and animations
- [ ] Boss follows player (chase behavior works)
- [ ] Boss attacks trigger when in range
- [ ] All attack patterns execute correctly
- [ ] Projectiles spawn with correct damage values
- [ ] Projectiles are destroyed after timeout
- [ ] Boss takes damage and HP updates
- [ ] Boss dies when HP reaches 0
- [ ] Death grants correct XP value

### Phase System

- [ ] Phase 2 triggers at 60% HP
- [ ] Phase 3 triggers at 30% HP
- [ ] Visual changes occur on phase transitions
- [ ] Stat changes apply correctly per phase
- [ ] Pattern cooldown reduction works in Phase 3
- [ ] Each phase feels distinctly different

### Unique Mechanics

- [ ] Signature ability functions correctly
- [ ] Aura effects apply/expire properly
- [ ] Summons spawn and target player
- [ ] Summons are cleaned up on boss death
- [ ] On-hit effects trigger correctly
- [ ] On-damage effects trigger correctly
- [ ] Visual effects render and clean up

### Visual Polish

- [ ] Tint changes are visible
- [ ] Telegraphs appear before dangerous attacks
- [ ] Phase transition effects play
- [ ] No visual artifacts remain after death
- [ ] Auras/effects follow boss movement

### Performance

- [ ] No memory leaks (check destroyed objects)
- [ ] Reasonable frame rate during fight
- [ ] Projectiles don't accumulate indefinitely
- [ ] Summons are limited in number
- [ ] Graphics objects are properly destroyed

### Balance Testing

- [ ] Fight duration feels appropriate for floor
- [ ] Player can avoid attacks with skill
- [ ] Phase 3 is challenging but fair
- [ ] Healing/lifesteal doesn't make boss unkillable
- [ ] XP reward feels appropriate

### Edge Cases

- [ ] Boss behaves correctly if player dies
- [ ] Boss handles no target gracefully
- [ ] Boss cleanup works when leaving room
- [ ] Boss doesn't break if damaged rapidly
- [ ] Multiple bosses don't cause issues (if applicable)

### Integration

- [ ] Boss works with collision system
- [ ] Boss works with save/load (if applicable)
- [ ] Boss triggers appropriate events
- [ ] UI updates correctly (health bars, etc.)

---

## Quick Reference

### Minimal Boss Template

```typescript
import { SinBoss } from './SinBosses';  // Or extend Enemy directly

export class NewBoss extends SinBoss {
  private attackPattern: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'new_boss_idle', floor, {
      hp: 400 + floor * 40,
      attack: 18 + floor * 3,
      defense: 5 + floor,
      speed: 60,
    });
    this.setupSpriteAnimations('new_boss', false);
  }

  protected onPhaseChange(newPhase: number): void {
    if (newPhase === 2) {
      this.setTint(0xff8800);
    } else if (newPhase === 3) {
      this.setTint(0xff0000);
      this.speed *= 1.3;
    }
  }

  protected executePattern(): void {
    if (!this.target) return;
    this.attackPattern = (this.attackPattern + 1) % 3;

    switch (this.attackPattern) {
      case 0: this.attack1(); break;
      case 1: this.attack2(); break;
      case 2: this.attack3(); break;
    }
  }

  private attack1(): void { /* Ring attack */ }
  private attack2(): void { /* Spread attack */ }
  private attack3(): void { /* Charge attack */ }
}
```

### Common Imports

```typescript
import Phaser from 'phaser';
import { Enemy } from '../Enemy';
import { Player } from '../Player';
import { TILE_SIZE } from '../../utils/constants';
```

### Event Emission Reference

```typescript
// Damage reflection
this.scene.events.emit('damageReflected', amount);

// Player slow effect
this.scene.events.emit('playerSlowed', 0.5);  // 50% slow

// Player pull effect
this.scene.events.emit('playerPulled', { x: forceX, y: forceY });

// Gold theft
this.scene.events.emit('goldStolen', amount);

// Enemy spawned (for summons)
this.scene.events.emit('enemySpawned', minionEnemy);

// Custom events
this.scene.events.emit('bossPhaseChange', this.phase);
```

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
