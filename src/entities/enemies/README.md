# Enemy System Reference

![Enemy Types](https://img.shields.io/badge/Enemy%20Types-4-blue)
![Sin Enemies](https://img.shields.io/badge/Sin%20Enemies-7-purple)
![Sin Bosses](https://img.shields.io/badge/Sin%20Bosses-7-red)
![Phaser 3](https://img.shields.io/badge/Phaser-3-green)

Complete reference documentation for all enemy types in the dungeon crawler game. This document covers standard enemies, sin-themed enemies, and the seven deadly sin bosses.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Base Enemy Class](#base-enemy-class)
- [Standard Enemy Types](#standard-enemy-types)
  - [FastEnemy (Imp)](#fastenemy-imp)
  - [TankEnemy (Demon Brute)](#tankenemy-demon-brute)
  - [RangedEnemy (Cultist)](#rangedenemy-cultist)
  - [BossEnemy (Generic Boss)](#bossenemy-generic-boss)
- [Sin Enemies](#sin-enemies)
  - [SlothEnemy](#slothenemy)
  - [GluttonyEnemy](#gluttonyenemy)
  - [GreedEnemy](#greedenemy)
  - [EnvyEnemy](#envyenemy)
  - [WrathEnemy](#wrathenemy)
  - [LustEnemy](#lustenemy)
  - [PrideEnemy](#prideenemy)
- [Sin Bosses](#sin-bosses)
  - [PrideBoss](#prideboss)
  - [GreedBoss](#greedboss)
  - [WrathBoss](#wrathboss)
  - [SlothBoss](#slothboss)
  - [EnvyBoss](#envyboss)
  - [GluttonyBoss](#gluttonyboss)
  - [LustBoss](#lustboss)
- [Boss Phase Mechanics](#boss-phase-mechanics)
- [Adding New Enemy Types](#adding-new-enemy-types)
- [Events Reference](#events-reference)

---

## Architecture Overview

```
Enemy (Base Class)
├── EnemyTypes.ts
│   ├── FastEnemy
│   ├── TankEnemy
│   ├── RangedEnemy
│   ├── BossEnemy
│   └── Sin Enemies (7 types)
└── SinBosses.ts
    └── SinBoss (Abstract Base)
        ├── PrideBoss
        ├── GreedBoss
        ├── WrathBoss
        ├── SlothBoss
        ├── EnvyBoss
        ├── GluttonyBoss
        └── LustBoss
```

All enemies extend from `Phaser.Physics.Arcade.Sprite` and inherit the base `Enemy` class AI system.

---

## Base Enemy Class

Located in `/src/entities/Enemy.ts`, the base class provides:

### AI States

| State | Behavior |
|-------|----------|
| `IDLE` | Stationary, no target in range |
| `CHASE` | Moves toward player (range: 8 tiles) |
| `ATTACK` | In melee range (1.5 tiles), attacks with cooldown |
| `RETREAT` | Flees when HP <= 20% |

### Base Stats

| Stat | Default Value |
|------|---------------|
| HP | 30 |
| Attack | 8 |
| Defense | 2 |
| Speed | 80 |
| XP Value | 25 |

### Constants

| Constant | Value |
|----------|-------|
| Attack Cooldown | 1000ms |
| Chase Range | 8 tiles |
| Attack Range | 1.5 tiles |
| Retreat HP Threshold | 20% |

---

## Standard Enemy Types

### FastEnemy (Imp)

Fast, fragile enemies that swarm the player.

**Sprite**: `imp_idle` / `imp_walk`

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 15 + floor * 3 | 18 | 30 | 45 |
| Attack | 4 + floor | 5 | 9 | 14 |
| Defense | 0 | 0 | 0 | 0 |
| Speed | 120 + floor * 8 | 128 | 160 | 200 |
| XP Value | 15 + floor * 3 | 18 | 30 | 45 |

**Behavior**: Standard chase AI with high movement speed. No special abilities.

---

### TankEnemy (Demon Brute)

Slow, durable enemies with high damage output.

**Sprite**: `demon_brute_idle` / `demon_brute_walk`

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 50 + floor * 10 | 60 | 100 | 150 |
| Attack | 8 + floor * 2 | 10 | 18 | 28 |
| Defense | 3 + floor | 4 | 8 | 13 |
| Speed | 40 + floor * 2 | 42 | 50 | 60 |
| XP Value | 35 + floor * 8 | 43 | 75 | 115 |

**Behavior**: Standard chase AI. High defense reduces incoming damage.

---

### RangedEnemy (Cultist)

Ranged attackers that maintain distance and fire projectiles.

**Sprite**: `cultist_idle` / `cultist_walk`

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 20 + floor * 4 | 24 | 40 | 60 |
| Attack | 6 + floor * 2 | 8 | 16 | 26 |
| Defense | 1 | 1 | 1 | 1 |
| Speed | 50 + floor * 3 | 53 | 65 | 80 |
| XP Value | 30 + floor * 6 | 36 | 60 | 90 |

**Behavior**:
- Preferred Range: 5 tiles
- Shoot Cooldown: 2000ms
- Retreats when player is within 70% of preferred range
- Projectile Speed: 200
- Projectile Duration: 3 seconds

---

### BossEnemy (Generic Boss)

Multi-phase boss with varied attack patterns.

**Sprite**: `enemy_boss` (tinted red, 2x scale)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 200 + floor * 30 | 230 | 350 | 500 |
| Attack | 15 + floor * 3 | 18 | 30 | 45 |
| Defense | 5 + floor | 6 | 10 | 15 |
| Speed | 60 + floor * 2 | 62 | 70 | 80 |
| XP Value | 200 + floor * 50 | 250 | 450 | 700 |

**Phase System**:
| Phase | HP Threshold | Visual | Pattern Cooldown |
|-------|--------------|--------|------------------|
| 1 | > 60% | Red tint | 2500ms |
| 2 | 30-60% | Dark orange | 2500ms |
| 3 | <= 30% | Magenta (rage) | 1500ms |

**Attack Patterns** (cycles through all three):

1. **Circle Attack**: Fires 8 projectiles (12 in phase 3) in a ring at 150 speed
2. **Spread Attack**: Fires 5 projectiles (7 in phase 3) in a 45-degree arc toward player at 200 speed
3. **Charge Attack**: Lunges toward player at 300 speed for 500ms

---

## Sin Enemies

Regular enemies themed around the seven deadly sins with unique mechanics.

### SlothEnemy

Creates a slowing aura that debuffs the player.

**Sprite**: `sloth_idle`

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 80 + floor * 15 | 95 | 155 | 230 |
| Attack | 4 + floor | 5 | 9 | 14 |
| Defense | 4 + floor | 5 | 9 | 14 |
| Speed | 25 + floor * 2 | 27 | 35 | 45 |
| XP Value | 40 + floor * 8 | 48 | 80 | 120 |

**Special Ability**:
- Slow Aura Radius: 3 tiles
- Slow Effect: 50% movement speed reduction
- Emits `playerSlowed` event

---

### GluttonyEnemy

Heals itself when successfully damaging the player.

**Sprite**: `gluttony_idle`

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 70 + floor * 12 | 82 | 130 | 190 |
| Attack | 8 + floor * 2 | 10 | 18 | 28 |
| Defense | 2 + floor | 3 | 7 | 12 |
| Speed | 35 + floor * 2 | 37 | 45 | 55 |
| XP Value | 45 + floor * 10 | 55 | 95 | 145 |

**Special Ability**:
- Lifesteal: 20% of damage dealt
- Visual: Green flash on heal

---

### GreedEnemy

Steals gold from the player on hit; flees when player has no gold.

**Sprite**: `greed_idle`

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 25 + floor * 5 | 30 | 50 | 75 |
| Attack | 3 + floor | 4 | 8 | 13 |
| Defense | 0 | 0 | 0 | 0 |
| Speed | 100 + floor * 8 | 108 | 140 | 180 |
| XP Value | 35 + floor * 6 | 41 | 65 | 95 |

**Special Ability**:
- Gold Steal: 5-10 gold per hit
- Flee Behavior: Runs away at 80% speed when player has 0 gold
- Visual: Gold flash on successful steal
- Emits `goldStolen` event

---

### EnvyEnemy

Copies the player's attack stat when first spotted.

**Sprite**: `envy_idle`

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 35 + floor * 6 | 41 | 65 | 95 |
| Attack | 5 + floor (copies player) | Varies | Varies | Varies |
| Defense | 1 + floor | 2 | 6 | 11 |
| Speed | 70 + floor * 4 | 74 | 90 | 110 |
| XP Value | 40 + floor * 8 | 48 | 80 | 120 |

**Special Ability**:
- Stat Copy: Copies player attack when within 8 tiles
- One-time copy (won't update if player's stats change)
- Visual: Green flash, then persistent green tint

---

### WrathEnemy

Enrages at 50% HP, gaining increased attack and speed.

**Sprite**: `wrath_idle`

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 45 + floor * 8 | 53 | 85 | 125 |
| Attack | 10 + floor * 2 | 12 | 20 | 30 |
| Defense | 2 + floor | 3 | 7 | 12 |
| Speed | 80 + floor * 4 | 84 | 100 | 120 |
| XP Value | 50 + floor * 10 | 60 | 100 | 150 |

**Special Ability**:
- Enrage Threshold: 50% HP
- Enraged Attack: 150% of base attack
- Enraged Speed: 120% of base speed
- Visual: Bright red tint + scale pulse animation
- Orange flash when taking damage (wrath building)

---

### LustEnemy

Pulls the player toward itself with a magnetic effect.

**Sprite**: `lust_idle`

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 25 + floor * 4 | 29 | 45 | 65 |
| Attack | 4 + floor | 5 | 9 | 14 |
| Defense | 0 | 0 | 0 | 0 |
| Speed | 60 + floor * 3 | 63 | 75 | 90 |
| XP Value | 35 + floor * 6 | 41 | 65 | 95 |

**Special Ability**:
- Pull Radius: 5 tiles
- Pull Strength: 30 (force applied per frame)
- Pull formula: `(1 - distance/radius) * strength`
- Visual: Pink/white glow aura
- Emits `playerPulled` event with x/y force values

---

### PrideEnemy

Reflects damage back to the attacker.

**Sprite**: `pride_idle` / `pride_walk`

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 60 + floor * 10 | 70 | 110 | 160 |
| Attack | 8 + floor * 2 | 10 | 18 | 28 |
| Defense | 5 + floor * 2 | 7 | 15 | 25 |
| Speed | 50 + floor * 3 | 53 | 65 | 80 |
| XP Value | 60 + floor * 12 | 72 | 120 | 180 |

**Special Ability**:
- Damage Reflection: 25%
- Visual: Golden flash on reflect
- Emits `damageReflected` event

---

## Sin Bosses

All sin bosses share common characteristics:
- Base XP Value: 300 + floor * 50
- Base Scale: 2x
- 3-phase system based on HP
- Pattern-based attacks

### Boss Phase System

| Phase | HP Threshold | Cooldown Multiplier |
|-------|--------------|---------------------|
| 1 | > 60% | 1.0x (base: 2500ms) |
| 2 | 30-60% | 1.0x |
| 3 | <= 30% | 0.6x (1500ms) |

---

### PrideBoss

The boss of Pride. Reflects 50% damage and creates mirror images.

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 400 + floor * 40 | 440 | 600 | 800 |
| Attack | 20 + floor * 4 | 24 | 40 | 60 |
| Defense | 8 + floor * 2 | 10 | 18 | 28 |
| Speed | 55 | 55 | 55 | 55 |

**Phase Changes**:
- Phase 2: Beige tint, spawns 2 mirror images
- Phase 3: White tint, spawns 4 mirror images

**Attack Patterns**:

1. **Golden Ring**: 10 projectiles (16 in phase 3) in circular pattern at 140 speed
2. **Mirror Beams**: Fires from self + all mirror images toward player at 180-200 speed
3. **Prideful Charge**: Lunges at 280 speed for 600ms

**Mirror Images**:
- Orbit around boss at 2 tile distance
- Rotate over time
- 50% opacity with gold tint
- Fire during Mirror Beams attack (50% damage)

---

### GreedBoss

The boss of Greed. Steals massive gold and creates exploding gold piles.

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 350 + floor * 35 | 385 | 525 | 700 |
| Attack | 18 + floor * 3 | 21 | 33 | 48 |
| Defense | 4 + floor | 5 | 9 | 14 |
| Speed | 75 | 75 | 75 | 75 |

**Phase Changes**:
- Phase 2: Gold tint
- Phase 3: Dark green tint, 130% speed

**Attack Patterns**:

1. **Coin Barrage**: 5 projectiles (9 in phase 3) in 60-degree spread at 220 speed
2. **Gold Pile Trap**: Spawns 3 (5 in phase 3) gold piles that explode after 1.5s into 8 projectiles each
3. **Greedy Grab**: Dash at 350 speed for 400ms

**Gold Steal**: 15-35 gold per successful hit

---

### WrathBoss

The boss of Wrath. Permanent rage mode with escalating fury.

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 450 + floor * 45 | 495 | 675 | 900 |
| Attack | 25 + floor * 5 | 30 | 50 | 75 |
| Defense | 3 + floor | 4 | 8 | 13 |
| Speed | 70 | 70 | 70 | 70 |

**Phase Changes**:
- Phase 2: Orange tint, 130% attack, 115% speed
- Phase 3: Yellow tint, 170% attack, 150% speed + rage aura animation

**Attack Patterns**:

1. **Fire Wave**: 2 waves (3 in phase 3) of 5 projectiles, 200ms apart at 200 speed
2. **Berserker Charge**: 2 charges (3 in phase 3) at 400 speed, 500ms apart, 300ms duration each
3. **Rage Burst**: 12 projectiles (20 in phase 3) in circular pattern at 180 speed

**On Damage**: White flash, then returns to phase-appropriate color

---

### SlothBoss

The boss of Sloth. Massive slow aura with time manipulation.

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 500 + floor * 50 | 550 | 750 | 1000 |
| Attack | 15 + floor * 3 | 18 | 30 | 45 |
| Defense | 10 + floor * 2 | 12 | 20 | 30 |
| Speed | 30 | 30 | 30 | 30 |

**Phase Changes**:
- Phase 2: Dark gray tint
- Phase 3: Blue tint, speed increases to 60 (paradoxical awakening)

**Attack Patterns**:

1. **Time Slow Field**: Expands slow aura to 150% for 1.5 seconds
2. **Lethargy Wave**: 10 projectiles (16 in phase 3) at 80 speed, scale 2x
3. **Drowsy Burst**: 3 waves of 3 targeted projectiles, 400ms apart at 120 speed

**Slow Aura**:
- Radius: 6 tiles
- Phase 1-2: 40% slow
- Phase 3: 30% slow (paradoxically less oppressive)

---

### EnvyBoss

The boss of Envy. Copies player stats and spawns shadow clones.

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 400 + floor * 40 | 440 | 600 | 800 |
| Attack | 16 + floor * 3 | 19 | 31 | 46 |
| Defense | 5 + floor | 6 | 10 | 15 |
| Speed | 65 | 65 | 65 | 65 |

**Phase Changes**:
- Phase 2: Dark green tint, spawns 1 shadow clone
- Phase 3: Very dark tint, spawns 2 additional shadow clones

**Attack Patterns**:

1. **Shadow Bolt**: 5 projectiles (7 in phase 3) in narrow spread at 190 speed
2. **Envy Mirror**: 5 projectiles fired in player's movement direction, 100ms apart at 200 speed
3. **Dark Swarm**: 10 projectiles (14 in phase 3) in circular pattern at 130 speed

**Stat Copy**: Copies player's attack and defense (takes maximum of own or player's stats)

**Shadow Clones**:
- 20% of boss HP
- 50% of boss attack
- 0 defense
- Same speed as boss
- 60% opacity with dark tint
- Added to enemy pool via `enemySpawned` event

---

### GluttonyBoss

The boss of Gluttony. Heavy lifesteal and grows larger over time.

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 550 + floor * 55 | 605 | 825 | 1100 |
| Attack | 22 + floor * 4 | 26 | 42 | 62 |
| Defense | 6 + floor | 7 | 11 | 16 |
| Speed | 45 | 45 | 45 | 45 |

**Phase Changes**:
- Phase 2: Orange tint, scale 2.3x
- Phase 3: Dark orange tint, scale 2.6x, 120% speed

**Attack Patterns**:

1. **Devour Charge**: Slower, wider charge at 250 speed for 800ms
2. **Hunger Wave**: 6 projectiles (9 in phase 3) in 90-degree spread at 160 speed
3. **Consume Burst**: 8 projectiles (12 in phase 3) at 100 speed, scale 2.5x

**Lifesteal**: 40% of damage dealt (heals self)

**Growth**: Grows by 0.05 scale on each heal (caps at 3.0x)

---

### LustBoss

The boss of Lust. Strong pull effect and seductive attack patterns.

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | 380 + floor * 38 | 418 | 570 | 760 |
| Attack | 18 + floor * 3 | 21 | 33 | 48 |
| Defense | 4 + floor | 5 | 9 | 14 |
| Speed | 70 | 70 | 70 | 70 |

**Phase Changes**:
- Phase 2: Pink tint
- Phase 3: Light pink tint, 130% speed

**Attack Patterns**:

1. **Seductive Spiral**: 10 projectiles (16 in phase 3) in spiral pattern (2 rotations), 100ms apart at 150 speed
2. **Heart Burst**: 5 projectiles (7 in phase 3) in 60-degree spread at 200 speed
3. **Charm Dash**: Quick dash at 350 speed for 400ms

**Pull Aura**:
- Radius: 7 tiles
- Base Strength: 50
- Phase 3 multiplier: 1.5x (75 strength)
- Inner glow at 2 tiles

---

## Adding New Enemy Types

### Step 1: Create the Enemy Class

```typescript
// In EnemyTypes.ts or a new file
import { Enemy } from '../Enemy';

export class MyNewEnemy extends Enemy {
  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'my_sprite_idle', {
      hp: 30 + floor * 5,
      attack: 6 + floor,
      defense: 2,
      speed: 60 + floor * 3,
      xpValue: 20 + floor * 4,
    });

    // Set up sprite animations (key, hasWalkAnimation)
    this.setupSpriteAnimations('my_sprite', true);
  }

  // Override update for custom behavior
  update(time: number, delta: number): void {
    super.update(time, delta);
    // Custom logic here
  }

  // Override for on-hit effects
  onSuccessfulAttack(damageDealt: number): void {
    // Called when this enemy damages the player
  }

  // Override for damage-taken effects
  takeDamage(amount: number): void {
    // Custom logic before taking damage
    super.takeDamage(amount);
    // Custom logic after taking damage
  }
}
```

### Step 2: Create a Boss (Optional)

```typescript
// In SinBosses.ts or a new file
import { SinBoss } from './SinBosses';

export class MyBoss extends SinBoss {
  private attackPattern: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'my_boss_idle', floor, {
      hp: 400 + floor * 40,
      attack: 20 + floor * 4,
      defense: 6 + floor,
      speed: 60,
    });
    this.setupSpriteAnimations('my_boss', false);
  }

  protected onPhaseChange(newPhase: number): void {
    // Handle visual/stat changes on phase transition
    if (newPhase === 2) {
      this.setTint(0xffaa00);
    } else if (newPhase === 3) {
      this.setTint(0xff0000);
      this.speed *= 1.3;
    }
  }

  protected executePattern(): void {
    if (!this.target) return;

    this.attackPattern = (this.attackPattern + 1) % 3;

    switch (this.attackPattern) {
      case 0: this.pattern1(); break;
      case 1: this.pattern2(); break;
      case 2: this.pattern3(); break;
    }
  }

  private pattern1(): void {
    // Your attack pattern
  }
}
```

### Step 3: Register in EnemyManager

Add your enemy to the spawn logic in your game's enemy manager or spawning system.

---

## Events Reference

| Event | Payload | Description |
|-------|---------|-------------|
| `playerSlowed` | `number` (0-1) | Slow multiplier to apply to player speed |
| `playerPulled` | `{ x: number, y: number }` | Force vector to apply to player |
| `goldStolen` | `number` | Amount of gold stolen from player |
| `damageReflected` | `number` | Damage to apply back to player |
| `enemyAttack` | `Enemy, Player` | Enemy initiated melee attack |
| `enemyDeath` | `Enemy` | Enemy was killed |
| `enemySpawned` | `Enemy` | New enemy added (e.g., shadow clones) |

---

## Stat Scaling Summary

### Standard Enemies by Danger Level

| Type | Danger | HP Tier | Damage Tier | Speed Tier |
|------|--------|---------|-------------|------------|
| FastEnemy | Low | Low | Low | Very High |
| RangedEnemy | Medium | Low | Medium | Medium |
| TankEnemy | Medium | Very High | High | Very Low |
| SlothEnemy | Medium | High | Low | Very Low |
| GluttonyEnemy | Medium | High | High | Low |
| GreedEnemy | Medium | Low | Low | Very High |
| EnvyEnemy | Variable | Medium | Variable | Medium |
| WrathEnemy | High | Medium | Very High | High |
| LustEnemy | Medium | Low | Low | Medium |
| PrideEnemy | High | High | High | Medium |
| BossEnemy | Very High | Very High | Very High | Medium |

### Boss Comparison (Floor 1 Base Stats)

| Boss | HP | Attack | Defense | Speed | Threat |
|------|-----|--------|---------|-------|--------|
| Sloth | 550 | 18 | 12 | 30 | Area Control |
| Gluttony | 605 | 26 | 7 | 45 | Sustain |
| Pride | 440 | 24 | 10 | 55 | Reflection |
| Greed | 385 | 21 | 5 | 75 | Resource Drain |
| Lust | 418 | 21 | 5 | 70 | Positioning |
| Envy | 440 | 19 | 6 | 65 | Adds |
| Wrath | 495 | 30 | 4 | 70 | Raw Damage |

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/3c1d8a9a0e3c8f5a0b2c1d4e5f6a7b8c9d0e1f2a.svg "Repobeats analytics image")
