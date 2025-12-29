# Combat System

This document provides a comprehensive reference for the combat mechanics in the dungeon crawler game.

## Table of Contents

1. [Damage Formula](#damage-formula)
2. [Critical Hits](#critical-hits)
3. [Knockback System](#knockback-system)
4. [Weapon Types](#weapon-types)
5. [Enemy AI](#enemy-ai)
6. [Boss Combat](#boss-combat)
7. [Status Effects](#status-effects)

---

## Damage Formula

### Base Damage Calculation

The damage calculation follows this formula:

```
Base Damage = max(1, Attacker.Attack - Defender.Defense)
```

**Key Points:**
- Minimum damage is always 1 (attacks cannot be completely blocked)
- Defense directly reduces incoming damage
- Both players and enemies use the same formula

### Player Attack Damage

Player attack damage incorporates weapon multipliers:

```
Final Damage = floor(Player.Attack * Weapon.DamageMultiplier)
```

Where `DamageMultiplier` is calculated as:

```
DamageMultiplier = Weapon.BaseDamage * (1 + Rarity * 0.15)
```

### Default Player Stats

| Stat | Base Value |
|------|------------|
| HP | 100 |
| Attack | 10 |
| Defense | 5 |
| Speed | 150 |

### Damage Examples

| Scenario | Attack | Defense | Base Damage | Notes |
|----------|--------|---------|-------------|-------|
| Player (10 ATK) vs Imp (0 DEF) | 10 | 0 | 10 | Full damage |
| Player (10 ATK) vs Tank (3 DEF) | 10 | 3 | 7 | Reduced by defense |
| Imp (4 ATK) vs Player (5 DEF) | 4 | 5 | 1 | Minimum damage |

---

## Critical Hits

### Crit Chance

- **Base Crit Chance:** 10% (0.1)
- Calculated on every attack via `Math.random() < 0.1`

### Crit Damage Multiplier

- **Multiplier:** 2x
- Applied after base damage calculation: `damage *= 2`

### Visual Effects

Critical hits trigger two visual feedbacks:

1. **"CRIT!" Text**
   - Color: Orange (`#ff6600`)
   - Font size: 10px
   - Floats upward 20px over 600ms
   - Fades out during animation

2. **Damage Number Enhancement**
   - Color: Yellow (`#ffff00`) instead of white
   - Font size: 16px instead of 12px

---

## Knockback System

### Knockback Force Calculation

Knockback is applied as a velocity impulse in the direction away from the attacker:

```
dx = Defender.x - Attacker.x
dy = Defender.y - Attacker.y
distance = sqrt(dx^2 + dy^2) || 1

knockbackX = (dx / distance) * knockbackForce
knockbackY = (dy / distance) * knockbackForce
```

### Knockback Values

| Source | Force (pixels) | Duration (ms) |
|--------|----------------|---------------|
| CombatSystem (default) | 200 | 150 |
| Sword melee attack | 150 | N/A |

### Implementation Notes

- Knockback resets after 150ms via a delayed callback
- Only active entities receive knockback reset
- Velocity is set directly, not added to existing velocity

---

## Weapon Types

The game features 5 distinct weapon types, each with unique attack patterns.

### Weapon Overview

| Weapon | Damage Mult | Attack Speed | Projectile Speed | Special |
|--------|-------------|--------------|------------------|---------|
| Wand | 1.0x | 300ms | 400 | Basic ranged |
| Sword | 2.0x | 400ms | Melee | 90-degree arc, piercing |
| Bow | 1.8x | 600ms | 500 | Piercing, charge (300ms) |
| Staff | 1.5x | 800ms | 250 | AoE explosion (64px radius) |
| Daggers | 0.5x | 150ms | 450 | 3 projectiles, 15-degree spread |

### Rarity Bonus Damage

| Rarity | Name | Bonus Damage |
|--------|------|--------------|
| 0 | Common | 0% |
| 1 | Uncommon | 15% |
| 2 | Rare | 30% |
| 3 | Epic | 45% |
| 4 | Legendary | 60% |

### Weapon Details

#### Wand
- **Type:** Ranged projectile
- **Base Damage:** 1.0x
- **Attack Speed:** 300ms cooldown
- **Projectile Speed:** 400 pixels/second
- **Range:** 2000ms lifetime (base)
- **Properties:** Single target, no piercing

#### Sword
- **Type:** Melee arc
- **Base Damage:** 2.0x
- **Attack Speed:** 400ms cooldown
- **Arc Angle:** 90 degrees
- **Range:** 64px (TILE_SIZE * 2 * range modifier)
- **Properties:** Piercing (hits all enemies in arc), knockback 150

#### Bow
- **Type:** Ranged projectile
- **Base Damage:** 1.8x
- **Attack Speed:** 600ms cooldown
- **Projectile Speed:** 500 pixels/second
- **Charge Time:** 300ms (for full damage)
- **Range:** 3750ms lifetime (2500 * 1.5)
- **Properties:** Piercing (passes through enemies)

#### Staff
- **Type:** Ranged AoE
- **Base Damage:** 1.5x
- **Attack Speed:** 800ms cooldown
- **Projectile Speed:** 250 pixels/second
- **Range:** 1600ms lifetime (2000 * 0.8)
- **AoE Radius:** 64px (TILE_SIZE * 2)
- **Properties:** Explodes on impact or timeout, camera shake

#### Daggers
- **Type:** Multi-projectile ranged
- **Base Damage:** 0.5x per dagger
- **Attack Speed:** 150ms cooldown
- **Projectile Speed:** 450 pixels/second
- **Projectile Count:** 3
- **Spread Angle:** 15 degrees total
- **Range:** 1050ms lifetime (1500 * 0.7)
- **Properties:** Fast fire rate, no piercing

---

## Enemy AI

### State Machine

Enemies operate on a 4-state AI system:

```
enum EnemyState {
  IDLE = 'idle',
  CHASE = 'chase',
  ATTACK = 'attack',
  RETREAT = 'retreat'
}
```

### State Transitions

| Current State | Condition | New State |
|---------------|-----------|-----------|
| Any | HP <= 20% max | RETREAT |
| Any | Distance <= Attack Range | ATTACK |
| Any | Distance <= Chase Range | CHASE |
| Any | Distance > Chase Range | IDLE |

### Range Constants

| Range Type | Distance |
|------------|----------|
| Chase Range | 256px (TILE_SIZE * 8) |
| Attack Range | 48px (TILE_SIZE * 1.5) |
| Retreat HP Threshold | 20% |

### State Behaviors

#### IDLE
- Velocity set to 0
- Waits for player to enter chase range

#### CHASE
- Moves directly toward closest target (player or secondary target)
- Speed determined by enemy type
- Uses angle-based movement: `velocity = (cos(angle), sin(angle)) * speed`

#### ATTACK
- Stops movement
- Emits `'enemyAttack'` event when cooldown expires
- Attack cooldown: 1000ms
- Visual "lunge" animation (10px toward player, 100ms duration)

#### RETREAT
- Moves away from target at 70% normal speed
- Triggered when HP <= 20% max

### Enemy Types

| Type | HP | Attack | Defense | Speed | Special |
|------|-----|--------|---------|-------|---------|
| Fast (Imp) | 15 + floor*3 | 4 + floor | 0 | 120 + floor*8 | High mobility |
| Tank (Demon Brute) | 50 + floor*10 | 8 + floor*2 | 3 + floor | 40 + floor*2 | High defense |
| Ranged (Cultist) | 20 + floor*4 | 6 + floor*2 | 1 | 50 + floor*3 | Projectiles, maintains distance |

---

## Boss Combat

### Phase System

All Sin Bosses use a 3-phase system based on HP thresholds:

| Phase | HP Threshold | Pattern Cooldown |
|-------|--------------|------------------|
| 1 | 100% - 61% | 2500ms (base) |
| 2 | 60% - 31% | 2500ms |
| 3 | 30% - 0% | 1500ms (60% of base) |

### Generic Boss Stats (BossEnemy)

| Floor | HP | Attack | Defense | Speed | XP |
|-------|-----|--------|---------|-------|-----|
| 1 | 230 | 18 | 6 | 62 | 250 |
| 5 | 350 | 30 | 10 | 70 | 450 |
| 10 | 500 | 45 | 15 | 80 | 700 |

### Attack Patterns (Generic Boss)

| Pattern | Phase 1-2 | Phase 3 |
|---------|-----------|---------|
| Circle Attack | 8 projectiles | 12 projectiles |
| Spread Attack | 5 projectiles, 45-degree spread | 7 projectiles |
| Charge Attack | 300 speed, 500ms duration | Same |

---

## Sin Bosses

Each of the 7 deadly sins has a unique boss with special mechanics.

### Pride Boss

**Base Stats (Floor 1):** HP 440, ATK 24, DEF 10, SPD 55

| Mechanic | Description |
|----------|-------------|
| Damage Reflection | 50% of damage dealt is reflected back to player |
| Mirror Images | Phase 2: 2 mirrors, Phase 3: 4 mirrors |

**Attack Patterns:**
- **Golden Ring:** 10 projectiles (16 in Phase 3) in circle, speed 140
- **Mirror Beams:** Boss + all mirrors fire at player, speed 180-200
- **Prideful Charge:** Dash at player, speed 280, 600ms

### Greed Boss

**Base Stats (Floor 1):** HP 385, ATK 21, DEF 5, SPD 75

| Mechanic | Description |
|----------|-------------|
| Gold Steal | Steals 15-35 gold on successful attack |
| Speed Boost | Phase 3: 130% speed |

**Attack Patterns:**
- **Coin Barrage:** 5 projectiles (9 in Phase 3), 60-degree spread, speed 220
- **Gold Pile Trap:** 3 piles (5 in Phase 3) that explode into 8 projectiles
- **Greedy Grab:** Dash at player, speed 350, 400ms

### Wrath Boss

**Base Stats (Floor 1):** HP 495, ATK 30, DEF 4, SPD 70

| Mechanic | Description |
|----------|-------------|
| Rage Scaling | Phase 2: 130% ATK, 115% SPD |
| | Phase 3: 170% ATK, 150% SPD |

**Attack Patterns:**
- **Fire Wave:** 2 waves (3 in Phase 3) of 5 projectiles, 200ms delay
- **Berserker Charge:** 2 charges (3 in Phase 3), speed 400, 500ms apart
- **Rage Burst:** 12 projectiles (20 in Phase 3) in circle, speed 180

### Sloth Boss

**Base Stats (Floor 1):** HP 550, ATK 18, DEF 12, SPD 30

| Mechanic | Description |
|----------|-------------|
| Slow Aura | 192px radius (TILE_SIZE * 6), 50% slow (70% in Phase 3) |
| Paradox | Phase 3: Speed increases to 60 |

**Attack Patterns:**
- **Time Slow Field:** Aura expands to 150% for 1500ms
- **Lethargy Wave:** 10 projectiles (16 in Phase 3), slow speed 80, large (2x scale)
- **Drowsy Burst:** 3 waves of 3 projectiles, 400ms delay, speed 120

### Envy Boss

**Base Stats (Floor 1):** HP 440, ATK 19, DEF 6, SPD 65

| Mechanic | Description |
|----------|-------------|
| Stat Copying | Copies player's Attack stat on first sight |
| Shadow Clones | Phase 2: 1 clone, Phase 3: 2 clones |

Clone Stats: 20% HP, 50% ATK, 0 DEF, same speed

**Attack Patterns:**
- **Shadow Bolt:** 5 projectiles (7 in Phase 3), tight spread, speed 190
- **Envy Mirror:** 5 projectiles in player's movement direction, 100ms apart
- **Dark Swarm:** 10 projectiles (14 in Phase 3) in circle, speed 130

### Gluttony Boss

**Base Stats (Floor 1):** HP 605, ATK 26, DEF 7, SPD 45

| Mechanic | Description |
|----------|-------------|
| Lifesteal | 40% of damage dealt heals boss |
| Growth | Scale increases: 2.0 -> 2.3 (Phase 2) -> 2.6 (Phase 3) |
| Speed Boost | Phase 3: 120% speed |

**Attack Patterns:**
- **Devour Charge:** Dash at player, speed 250, 800ms duration
- **Hunger Wave:** 6 projectiles (9 in Phase 3), 90-degree spread, speed 160
- **Consume Burst:** 8 projectiles (12 in Phase 3), large (2.5x scale), slow speed 100

### Lust Boss

**Base Stats (Floor 1):** HP 418, ATK 21, DEF 5, SPD 70

| Mechanic | Description |
|----------|-------------|
| Pull Aura | 224px radius (TILE_SIZE * 7), 50 force (75 in Phase 3) |
| Speed Boost | Phase 3: 130% speed |

**Attack Patterns:**
- **Seductive Spiral:** 10 projectiles (16 in Phase 3), spiral pattern, speed 150
- **Heart Burst:** 5 projectiles (7 in Phase 3), 60-degree spread, speed 200
- **Charm Dash:** Dash at player, speed 350, 400ms

---

## Status Effects

### Slow (Sloth Enemies)

**Source:** SlothEnemy, SlothBoss

| Enemy Type | Radius | Slow Amount |
|------------|--------|-------------|
| SlothEnemy | 96px (TILE_SIZE * 3) | 50% |
| SlothBoss | 192px (TILE_SIZE * 6) | 60% (Phase 1-2), 70% (Phase 3) |

**Implementation:**
- Emits `'playerSlowed'` event with modifier value (0.5 = 50% speed)
- Applied via `Player.setSpeedModifier()`
- Clamps between 10% and 100% speed
- Resets when leaving aura

### Pull (Lust Enemies)

**Source:** LustEnemy, LustBoss

| Enemy Type | Radius | Pull Strength |
|------------|--------|---------------|
| LustEnemy | 160px (TILE_SIZE * 5) | 30 |
| LustBoss | 224px (TILE_SIZE * 7) | 50 (75 in Phase 3) |

**Implementation:**
```
pullForce = (1 - distance / PULL_RADIUS) * PULL_STRENGTH * phaseMultiplier
```

- Emits `'playerPulled'` event with velocity vector
- Pull is stronger closer to enemy
- Does not apply within 1 TILE_SIZE (32px) of enemy

### Reflect (Pride Enemies)

**Source:** PrideEnemy, PrideBoss

| Enemy Type | Reflect Amount |
|------------|----------------|
| PrideEnemy | 25% |
| PrideBoss | 50% |

**Implementation:**
- Emits `'damageReflected'` event with reflected damage amount
- Triggers golden visual flash (0xffd700)
- Reflected damage is floored: `floor(damage * REFLECT_PERCENT)`

### Gold Steal (Greed Enemies)

**Source:** GreedEnemy, GreedBoss

| Enemy Type | Steal Amount |
|------------|--------------|
| GreedEnemy | 5-10 gold |
| GreedBoss | 15-35 gold |

**Implementation:**
- Triggers on `onSuccessfulAttack()`
- Capped by player's current gold
- Emits `'goldStolen'` event
- GreedEnemy flees if player has no gold

---

## Additional Combat Mechanics

### Invulnerability Frames

After taking damage, players receive i-frames:
- Duration: 500ms
- Visual: Red tint (0xff0000)
- Cannot take additional damage during this time

### Dodge Roll

- Cooldown: 1000ms
- Duration: 200ms
- Speed Multiplier: 3x current velocity
- Grants full invulnerability during dodge
- Triggered by Space key

### Enemy Death

On death, enemies:
1. Emit `'enemyDeath'` event (for XP/loot)
2. Remove their light source
3. Play death animation (fade out + shrink over 200ms)
4. Call `destroy()`

### Projectile Behavior

| Property | Description |
|----------|-------------|
| Piercing | Passes through enemies, tracks hit list |
| AoE | Explodes on impact, damages all in radius |
| Damage | Stored in projectile data, not recalculated |

---

## Source Files

- `/src/systems/CombatSystem.ts` - Core damage and knockback calculations
- `/src/systems/Weapon.ts` - Weapon definitions and damage multipliers
- `/src/systems/PlayerAttackManager.ts` - Attack execution and projectile handling
- `/src/entities/Enemy.ts` - Base enemy AI and state machine
- `/src/entities/enemies/EnemyTypes.ts` - Standard and sin enemy variants
- `/src/entities/enemies/SinBosses.ts` - Sin boss implementations
- `/src/entities/Player.ts` - Player stats and damage taking
- `/src/utils/constants.ts` - Base stat values
