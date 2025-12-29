# Sin Boss Reference

[![Boss Count](https://img.shields.io/badge/bosses-7-red)](.)
[![Phase System](https://img.shields.io/badge/phases-3-purple)](.)

Complete reference for all seven Sin Bosses. Each boss represents a deadly sin with unique mechanics, attack patterns, and phase transitions.

---

## Table of Contents

- [Common Mechanics](#common-mechanics)
- [Pride Boss](#pride-boss)
- [Greed Boss](#greed-boss)
- [Wrath Boss](#wrath-boss)
- [Sloth Boss](#sloth-boss)
- [Envy Boss](#envy-boss)
- [Gluttony Boss](#gluttony-boss)
- [Lust Boss](#lust-boss)

---

## Common Mechanics

All Sin Bosses share the following base systems:

### Phase System

| Phase | HP Threshold | Cooldown Modifier |
|-------|--------------|-------------------|
| Phase 1 | 100% - 61% | 1.0x (2500ms base) |
| Phase 2 | 60% - 31% | 1.0x (2500ms base) |
| Phase 3 | 30% - 0% | 0.6x (1500ms base) |

### Base Properties

- **Scale**: 2.0x sprite size
- **XP Value**: `300 + (floor * 50)`
- **Projectile Damage**: `attack * 0.7` (70% of attack stat)
- **Projectile Lifespan**: 4000ms

---

## Pride Boss

> *"50% damage reflection, creates mirror images, golden projectiles"*

### Base Stats

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `400 + floor * 40` | 440 | 600 | 800 |
| Attack | `20 + floor * 4` | 24 | 40 | 60 |
| Defense | `8 + floor * 2` | 10 | 18 | 28 |
| Speed | `55` (fixed) | 55 | 55 | 55 |

### Special Mechanics

#### Damage Reflection
- **Reflect Percentage**: 50%
- **Trigger**: Any damage taken
- **Effect**: Emits `damageReflected` event with reflected damage amount
- **Visual**: Flash white for 200ms on reflection

#### Mirror Images
| Phase | Mirror Count | Properties |
|-------|--------------|------------|
| Phase 1 | 0 | - |
| Phase 2 | 2 | 0.5 alpha, gold tint (0xffd700), 1.5x scale |
| Phase 3 | 4 | Same properties, orbiting boss |

- **Orbit Distance**: 2 tiles (TILE_SIZE * 2)
- **Orbit Speed**: Rotates with `time * 0.001` angular velocity

### Phase Transitions

| Phase | Tint Color | Additional Effects |
|-------|------------|-------------------|
| Phase 1 | Default | - |
| Phase 2 | Beige (0xf5f5dc) | Spawns 2 mirror images |
| Phase 3 | White (0xffffff) | Spawns 4 mirror images |

### Attack Patterns

Cycles through 3 patterns in order:

#### Pattern 0: Golden Ring
- **Type**: Radial projectile burst
- **Projectile Count**: 10 (Phase 1-2), 16 (Phase 3)
- **Projectile Speed**: 140
- **Projectile Color**: Gold (0xffd700)
- **Projectile Scale**: 1.5x

#### Pattern 1: Mirror Beams
- **Type**: Targeted beam from boss and all mirrors
- **Main Beam Speed**: 200
- **Main Beam Scale**: 2.0x
- **Mirror Beam Speed**: 180
- **Mirror Beam Damage**: `attack * 0.5`
- **Mirror Beam Lifespan**: 3000ms
- **Color**: Gold (0xffd700)

#### Pattern 2: Prideful Charge
- **Type**: Dash attack
- **Charge Speed**: 280
- **Charge Duration**: 600ms
- **Targeting**: Direct line to player

---

## Greed Boss

> *"Steals massive gold, spawns gold pile traps, throws coins"*

### Base Stats

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `350 + floor * 35` | 385 | 525 | 700 |
| Attack | `18 + floor * 3` | 21 | 33 | 48 |
| Defense | `4 + floor` | 5 | 9 | 14 |
| Speed | `75` (base) | 75 | 75 | 75 |

### Special Mechanics

#### Gold Theft
- **Trigger**: Successful attack on player
- **Steal Amount**: `15 + random(0-19)` gold (min of player's gold)
- **Event**: Emits `goldStolen` event

### Phase Transitions

| Phase | Tint Color | Speed Modifier |
|-------|------------|----------------|
| Phase 1 | Default | 1.0x |
| Phase 2 | Gold (0xffd700) | 1.0x |
| Phase 3 | Green (0x15803d) | 1.3x |

### Attack Patterns

Cycles through 3 patterns in order:

#### Pattern 0: Coin Barrage
- **Type**: Spread shot toward player
- **Projectile Count**: 5 (Phase 1-2), 9 (Phase 3)
- **Spread Angle**: 60 degrees (PI/3)
- **Projectile Speed**: 220
- **Projectile Color**: Gold (0xffd700)
- **Projectile Scale**: 1.2x

#### Pattern 1: Gold Pile Trap
- **Type**: Delayed exploding traps
- **Trap Count**: 3 (Phase 1-2), 5 (Phase 3)
- **Spawn Distance**: 3-7 tiles from boss
- **Detonation Delay**: 1500ms
- **Explosion Projectiles**: 8 per trap (radial)
- **Explosion Speed**: 150
- **Explosion Damage**: `attack * 0.5`
- **Explosion Lifespan**: 2000ms
- **Trap Appearance**: Coin sprite, 2x scale, gold tint

#### Pattern 2: Greedy Grab
- **Type**: High-speed dash
- **Dash Speed**: 350
- **Dash Duration**: 400ms
- **Targeting**: Direct line to player

---

## Wrath Boss

> *"Permanent rage mode, fire projectiles, berserker charges"*

### Base Stats

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `450 + floor * 45` | 495 | 675 | 900 |
| Attack | `25 + floor * 5` | 30 | 50 | 75 |
| Defense | `3 + floor` | 4 | 8 | 13 |
| Speed | `70` (base) | 70 | 70 | 70 |

### Special Mechanics

#### Rage Mode
- **Trigger**: Taking damage
- **Visual**: Flash white for 100ms, then return to phase tint
- **Effect**: Attack and speed scale dramatically with phase

### Phase Transitions

| Phase | Tint Color | Attack Modifier | Speed Modifier | Special |
|-------|------------|-----------------|----------------|---------|
| Phase 1 | Red (0xdc2626) | 1.0x | 1.0x | - |
| Phase 2 | Orange (0xf97316) | 1.3x | 1.15x | - |
| Phase 3 | Yellow (0xfbbf24) | 1.7x | 1.5x | Rage aura animation (scale pulse 2.3x, 3 repeats) |

### Attack Patterns

Cycles through 3 patterns in order:

#### Pattern 0: Fire Wave
- **Type**: Multi-wave spread attack
- **Wave Count**: 2 (Phase 1-2), 3 (Phase 3)
- **Wave Delay**: 200ms between waves
- **Projectiles Per Wave**: 5 (spread of -2 to +2, 0.15 rad spacing)
- **Projectile Speed**: 200
- **Projectile Color**: Orange (0xf97316)
- **Projectile Scale**: 1.3x

#### Pattern 1: Berserker Charge
- **Type**: Multiple rapid dashes
- **Charge Count**: 2 (Phase 1-2), 3 (Phase 3)
- **Charge Interval**: 500ms
- **Charge Speed**: 400
- **Charge Duration**: 300ms per charge
- **Targeting**: Re-targets player before each charge

#### Pattern 2: Rage Burst
- **Type**: Radial projectile explosion
- **Projectile Count**: 12 (Phase 1-2), 20 (Phase 3)
- **Projectile Speed**: 180
- **Projectile Color**: Red (0xdc2626)
- **Projectile Scale**: 1.5x

---

## Sloth Boss

> *"Massive slow aura, time manipulation, sleeping phases"*

### Base Stats

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `500 + floor * 50` | 550 | 750 | 1000 |
| Attack | `15 + floor * 3` | 18 | 30 | 45 |
| Defense | `10 + floor * 2` | 12 | 20 | 30 |
| Speed | `30` (base) | 30 | 30 | 30 |

### Special Mechanics

#### Slow Aura
- **Radius**: 6 tiles (TILE_SIZE * 6)
- **Visual**: Gray circle (0x6b7280) at 0.2 alpha with stroke
- **Player Slow Amount**: 40% speed in Phase 1-2, 30% speed in Phase 3
- **Effect**: Emits `playerSlowed` event when player is in range

### Phase Transitions

| Phase | Tint Color | Speed | Slow Amount |
|-------|------------|-------|-------------|
| Phase 1 | Default | 30 | 0.4 (40%) |
| Phase 2 | Dark Gray (0x4b5563) | 30 | 0.4 (40%) |
| Phase 3 | Blue (0x60a5fa) | 60 | 0.3 (30%) |

*Note: Paradoxically, Sloth becomes faster in Phase 3*

### Attack Patterns

Cycles through 3 patterns in order:

#### Pattern 0: Time Slow Field
- **Type**: Aura expansion
- **Effect**: Slow aura scales to 1.5x for 1000ms, then returns
- **Animation Duration**: 500ms scale up, 1000ms hold, 500ms scale down

#### Pattern 1: Lethargy Wave
- **Type**: Slow radial projectile burst
- **Projectile Count**: 10 (Phase 1-2), 16 (Phase 3)
- **Projectile Speed**: 80 (very slow)
- **Projectile Color**: Gray (0x9ca3af)
- **Projectile Scale**: 2.0x (large)

#### Pattern 2: Drowsy Burst
- **Type**: Delayed targeted spread
- **Burst Count**: 3 (with 400ms delays)
- **Projectiles Per Burst**: 3 (spread of -0.2 to +0.2 radians)
- **Projectile Speed**: 120
- **Projectile Color**: Blue (0x60a5fa)
- **Projectile Scale**: 1.8x

---

## Envy Boss

> *"Copies all player stats, spawns shadow clones"*

### Base Stats

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `400 + floor * 40` | 440 | 600 | 800 |
| Attack | `16 + floor * 3` | 19 | 31 | 46 |
| Defense | `5 + floor` | 6 | 10 | 15 |
| Speed | `65` (fixed) | 65 | 65 | 65 |

### Special Mechanics

#### Stat Copying
- **Trigger**: First attack pattern execution
- **Effect**: Copies player's attack and defense (takes max of own vs player's)
- **Visual**: Flash green (0x22c55e) for 500ms
- **One-time**: Only happens once per fight

#### Shadow Clones
| Property | Value |
|----------|-------|
| HP | 20% of boss max HP |
| Attack | 50% of boss attack |
| Defense | 0 |
| Speed | Same as boss |
| XP Value | 20 |
| Scale | 1.5x |
| Alpha | 0.6 |
| Tint | Dark (0x1f2937) |
| Spawn Distance | 3 tiles from boss |

### Phase Transitions

| Phase | Tint Color | Shadow Clones Spawned |
|-------|------------|----------------------|
| Phase 1 | Green (0x16a34a) after copy | 0 |
| Phase 2 | Green (0x15803d) | 1 |
| Phase 3 | Near Black (0x0f172a) | 2 (total 3 in fight) |

### Attack Patterns

Cycles through 3 patterns in order:

#### Pattern 0: Shadow Bolt
- **Type**: Spread shot toward player
- **Projectile Count**: 5 (Phase 1-2), 7 (Phase 3)
- **Spread**: 0.12 radians between projectiles
- **Projectile Speed**: 190
- **Projectile Color**: Green (0x22c55e)
- **Projectile Scale**: 1.4x

#### Pattern 1: Envy Mirror
- **Type**: Projectiles following player's movement direction
- **Projectile Count**: 5 (with 100ms delays)
- **Targeting**: Based on player's velocity vector
- **Projectile Speed**: 200
- **Projectile Color**: Green (0x16a34a)
- **Projectile Scale**: 1.2x

#### Pattern 2: Dark Swarm
- **Type**: Radial projectile burst
- **Projectile Count**: 10 (Phase 1-2), 14 (Phase 3)
- **Projectile Speed**: 130
- **Projectile Color**: Dark (0x1f2937)
- **Projectile Scale**: 1.6x

---

## Gluttony Boss

> *"Heavy lifesteal, grows larger, devour attack"*

### Base Stats

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `550 + floor * 55` | 605 | 825 | 1100 |
| Attack | `22 + floor * 4` | 26 | 42 | 62 |
| Defense | `6 + floor` | 7 | 11 | 16 |
| Speed | `45` (base) | 45 | 45 | 45 |

### Special Mechanics

#### Lifesteal
- **Percentage**: 40% of damage dealt
- **Trigger**: Successful attack on player
- **Cap**: Cannot exceed max HP
- **Visual**: Flash green (0x22c55e) for 300ms on heal

#### Growth
- **Trigger**: On successful lifesteal
- **Growth Amount**: +0.05 scale per heal
- **Maximum Scale**: 3.0x

### Phase Transitions

| Phase | Tint Color | Scale | Speed Modifier |
|-------|------------|-------|----------------|
| Phase 1 | Yellow (0xfbbf24) | 2.0x | 1.0x |
| Phase 2 | Amber (0xf59e0b) | 2.3x | 1.0x |
| Phase 3 | Dark Amber (0xd97706) | 2.6x | 1.2x |

### Attack Patterns

Cycles through 3 patterns in order:

#### Pattern 0: Devour Charge
- **Type**: Slow, wide dash
- **Charge Speed**: 250
- **Charge Duration**: 800ms (longer than other bosses)
- **Targeting**: Direct line to player

#### Pattern 1: Hunger Wave
- **Type**: Wide spread shot toward player
- **Projectile Count**: 6 (Phase 1-2), 9 (Phase 3)
- **Spread Angle**: 90 degrees (PI/2)
- **Projectile Speed**: 160
- **Projectile Color**: Amber (0xfbbf24)
- **Projectile Scale**: 1.8x

#### Pattern 2: Consume Burst
- **Type**: Radial slow projectile burst
- **Projectile Count**: 8 (Phase 1-2), 12 (Phase 3)
- **Projectile Speed**: 100 (slow)
- **Projectile Color**: Dark Amber (0xd97706)
- **Projectile Scale**: 2.5x (very large)

---

## Lust Boss

> *"Strong pull, charm mechanics, seductive projectiles"*

### Base Stats

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `380 + floor * 38` | 418 | 570 | 760 |
| Attack | `18 + floor * 3` | 21 | 33 | 48 |
| Defense | `4 + floor` | 5 | 9 | 14 |
| Speed | `70` (base) | 70 | 70 | 70 |

### Special Mechanics

#### Pull Aura
- **Outer Radius**: 7 tiles (TILE_SIZE * 7)
- **Inner Safe Zone**: 1 tile (TILE_SIZE)
- **Base Pull Strength**: 50
- **Phase 3 Pull Strength**: 75 (1.5x)
- **Effect**: Emits `playerPulled` event with x/y force vectors
- **Formula**: `(1 - distance/radius) * pullStrength * phaseMultiplier`

#### Aura Visual
- **Outer Circle**: Pink (0xec4899) at 0.15 alpha
- **Inner Circle**: Light Pink (0xfce7f3) at 0.25 alpha, 2 tiles radius

### Phase Transitions

| Phase | Tint Color | Speed | Pull Multiplier |
|-------|------------|-------|-----------------|
| Phase 1 | Default | 70 | 1.0x |
| Phase 2 | Pink (0xf472b6) | 70 | 1.0x |
| Phase 3 | Light Pink (0xfce7f3) | 91 (1.3x) | 1.5x |

### Attack Patterns

Cycles through 3 patterns in order:

#### Pattern 0: Seductive Spiral
- **Type**: Delayed spiral pattern
- **Projectile Count**: 10 (Phase 1-2), 16 (Phase 3)
- **Delay Per Projectile**: 100ms
- **Spiral Rotation**: 2 full rotations (4*PI)
- **Projectile Speed**: 150
- **Projectile Color**: Pink (0xec4899)
- **Projectile Scale**: 1.3x

#### Pattern 1: Heart Burst
- **Type**: Spread shot toward player
- **Projectile Count**: 5 (Phase 1-2), 7 (Phase 3)
- **Spread Angle**: 60 degrees (PI/3)
- **Projectile Speed**: 200
- **Projectile Color**: Light Pink (0xfce7f3)
- **Projectile Scale**: 1.5x

#### Pattern 2: Charm Dash
- **Type**: Quick dash attack
- **Dash Speed**: 350
- **Dash Duration**: 400ms
- **Targeting**: Direct line to player

---

## Boss Comparison Summary

### Stat Rankings (Floor 1)

| Rank | HP | Attack | Defense | Speed |
|------|-----|--------|---------|-------|
| 1st | Gluttony (605) | Wrath (30) | Sloth (12) | Greed (75) |
| 2nd | Sloth (550) | Gluttony (26) | Pride (10) | Wrath/Lust (70) |
| 3rd | Wrath (495) | Pride (24) | Gluttony (7) | Envy (65) |
| 4th | Pride/Envy (440) | Greed/Lust (21) | Envy (6) | Pride (55) |
| 5th | Lust (418) | Envy (19) | Greed/Lust (5) | Gluttony (45) |
| 6th | Greed (385) | Sloth (18) | Wrath (4) | Sloth (30) |

### Unique Mechanics Overview

| Boss | Primary Mechanic | Secondary Mechanic |
|------|------------------|-------------------|
| Pride | 50% Damage Reflection | Mirror Images (2-4) |
| Greed | Gold Theft (15-34 per hit) | Exploding Gold Piles |
| Wrath | Scaling Rage (+70% ATK/+50% SPD) | Multi-charge Dashes |
| Sloth | Slow Aura (40%/30% slow) | Paradoxical Phase 3 Speed |
| Envy | Stat Copy (ATK/DEF) | Shadow Clones (up to 3) |
| Gluttony | 40% Lifesteal + Growth | Large Slow Projectiles |
| Lust | Constant Pull Effect | Spiral Attack Patterns |

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/dungeon-crawler-now.svg "Repobeats analytics image")
