# Enemy Catalog

[![Game Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](../../package.json)
[![Enemy Types](https://img.shields.io/badge/enemies-18_types-red.svg)](#overview)

Complete reference for all enemy types, stats, abilities, and spawn mechanics.

## Overview

The game features **18 unique enemy types** across three categories:

| Category | Count | Description |
|----------|-------|-------------|
| Standard Enemies | 4 | Basic enemy types found throughout all worlds |
| Sin Enemies | 7 | Themed enemies tied to the Seven Deadly Sins |
| Sin Bosses | 7 | World bosses for each sin, with multi-phase combat |

---

## Standard Enemies

These enemies spawn in all worlds and dungeons.

### Fast Enemy (Imp)

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 15 | `15 + floor * 3` |
| Attack | 4 | `4 + floor` |
| Defense | 0 | `0` (no scaling) |
| Speed | 120 | `120 + floor * 8` |
| XP Value | 15 | `15 + floor * 3` |

**Sprite:** `imp_idle`, `imp_walk`

**Behavior:**
- Charges directly at the player at high speed
- Low HP makes them easy to kill but dangerous in groups
- No defensive capabilities

**Spawn Locations:**
- All worlds (15% base chance in legacy mode)
- Part of Wrath, Envy, and Lust world enemy pools

---

### Tank Enemy (Demon Brute)

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 50 | `50 + floor * 10` |
| Attack | 8 | `8 + floor * 2` |
| Defense | 3 | `3 + floor` |
| Speed | 40 | `40 + floor * 2` |
| XP Value | 35 | `35 + floor * 8` |

**Sprite:** `demon_brute_idle`, `demon_brute_walk`

**Behavior:**
- Slow movement but high HP and defense
- Deals heavy damage on contact
- Requires Floor 3+ to spawn in legacy mode

**Spawn Locations:**
- All worlds (Floor 3+, 15% chance in legacy mode)
- Part of Pride, Wrath, Sloth, and Gluttony world enemy pools

---

### Ranged Enemy (Cultist)

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 20 | `20 + floor * 4` |
| Attack | 6 | `6 + floor * 2` |
| Defense | 1 | `1` (no scaling) |
| Speed | 50 | `50 + floor * 3` |
| XP Value | 30 | `30 + floor * 6` |

**Sprite:** `cultist_idle`, `cultist_walk`

**Behavior:**
- Shoots projectiles at the player
- Maintains preferred distance of 5 tiles
- Retreats when player gets too close (within 70% of preferred range)
- Shoot cooldown: 2000ms
- Projectile speed: 200
- Projectiles auto-destroy after 3 seconds

**Spawn Locations:**
- All worlds (Floor 2+, 20% chance in legacy mode)
- Part of Pride, Envy, and Lust world enemy pools

---

### Boss Enemy

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 200 | `200 + floor * 30` |
| Attack | 15 | `15 + floor * 3` |
| Defense | 5 | `5 + floor` |
| Speed | 60 | `60 + floor * 2` |
| XP Value | 200 | `200 + floor * 50` |

**Visual:** Red tinted, 2x scale

**Attack Patterns:**
1. **Circle Attack** - 8 projectiles (12 in phase 3) in a ring
2. **Spread Attack** - 5 projectiles (7 in phase 3) in a 45-degree arc toward player
3. **Charge Attack** - Lunges at player at 300 speed for 500ms

**Phase Transitions:**
- Phase 2: HP <= 60% (tint changes to dark orange)
- Phase 3: HP <= 30% (tint changes to magenta, pattern cooldown reduced to 1500ms)

**Spawn Locations:**
- Legacy mode boss floors only
- Replaced by Sin Bosses in themed worlds

---

## Sin Enemies

Themed enemies that embody one of the Seven Deadly Sins.

### Sloth Enemy

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 80 | `80 + floor * 15` |
| Attack | 4 | `4 + floor` |
| Defense | 4 | `4 + floor` |
| Speed | 25 | `25 + floor * 2` |
| XP Value | 40 | `40 + floor * 8` |

**Sprite:** `sloth_idle` (no walk animation)

**Special Ability - Slowing Aura:**
- Creates a visual gray aura (radius: 3 tiles)
- Players within aura move at 50% speed
- Emits `playerSlowed` event with value `0.5`

**Spawn Locations:**
- **Mire of Sloth** (60% primary, part of enemy pool)
- Legacy mode: All floors (8% chance)

---

### Gluttony Enemy

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 70 | `70 + floor * 12` |
| Attack | 8 | `8 + floor * 2` |
| Defense | 2 | `2 + floor` |
| Speed | 35 | `35 + floor * 2` |
| XP Value | 45 | `45 + floor * 10` |

**Sprite:** `gluttony_idle` (no walk animation)

**Special Ability - Life Steal:**
- Heals 20% of damage dealt to player on successful attack
- Green flash visual feedback when healing

**Spawn Locations:**
- **Pits of Gluttony** (60% primary, part of enemy pool)
- Legacy mode: All floors (8% chance)

---

### Greed Enemy

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 25 | `25 + floor * 5` |
| Attack | 3 | `3 + floor` |
| Defense | 0 | `0` (no scaling) |
| Speed | 100 | `100 + floor * 8` |
| XP Value | 35 | `35 + floor * 6` |

**Sprite:** `greed_idle` (no walk animation)

**Special Ability - Gold Theft:**
- Steals 5-10 gold on successful attack
- Flees when player has no gold (moves away at 80% speed)
- Gold flash visual feedback when stealing
- Emits `goldStolen` event

**Spawn Locations:**
- **Vaults of Greed** (60% primary, part of enemy pool)
- Legacy mode: Floor 4+ (8% chance)

---

### Envy Enemy

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 35 | `35 + floor * 6` |
| Attack | 5 | `5 + floor` (copied from player) |
| Defense | 1 | `1 + floor` |
| Speed | 70 | `70 + floor * 4` |
| XP Value | 40 | `40 + floor * 8` |

**Sprite:** `envy_idle` (no walk animation)

**Special Ability - Stat Copy:**
- Copies player's attack stat when first entering range (8 tiles)
- Only copies once per enemy instance
- Green flash on copy, stays slightly green tinted

**Spawn Locations:**
- **Shadows of Envy** (60% primary, part of enemy pool)
- Legacy mode: Floor 4+ (8% chance)

---

### Wrath Enemy

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 45 | `45 + floor * 8` |
| Attack | 10 | `10 + floor * 2` (1.5x when enraged) |
| Defense | 2 | `2 + floor` |
| Speed | 80 | `80 + floor * 4` (1.2x when enraged) |
| XP Value | 50 | `50 + floor * 10` |

**Sprite:** `wrath_idle` (no walk animation)

**Special Ability - Enrage:**
- Triggers at 50% HP
- Attack increases to 150% of base
- Speed increases to 120%
- Visual: Bright red tint, pulsing scale animation

**Spawn Locations:**
- **Inferno of Wrath** (60% primary, part of enemy pool)
- Legacy mode: Floor 7+ (8% chance)

---

### Lust Enemy

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 25 | `25 + floor * 4` |
| Attack | 4 | `4 + floor` |
| Defense | 0 | `0` (no scaling) |
| Speed | 60 | `60 + floor * 3` |
| XP Value | 35 | `35 + floor * 6` |

**Sprite:** `lust_idle` (no walk animation)

**Special Ability - Magnetic Pull:**
- Pull radius: 5 tiles
- Pull strength: 30 (force applied per tick)
- Creates pink glow effect around enemy
- Emits `playerPulled` event with x/y force values

**Spawn Locations:**
- **Gardens of Lust** (60% primary, part of enemy pool)
- Legacy mode: Floor 7+ (8% chance)

---

### Pride Enemy

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 60 | `60 + floor * 10` |
| Attack | 8 | `8 + floor * 2` |
| Defense | 5 | `5 + floor * 2` |
| Speed | 50 | `50 + floor * 3` |
| XP Value | 60 | `60 + floor * 12` |

**Sprite:** `pride_idle`, `pride_walk`

**Special Ability - Damage Reflection:**
- Reflects 25% of incoming damage back to attacker
- Golden flash visual feedback
- Emits `damageReflected` event

**Spawn Locations:**
- **Tower of Pride** (60% primary, part of enemy pool)
- Legacy mode: Floor 10+ (5% chance - rare)

---

## Sin Bosses

World bosses with multi-phase combat, enhanced mechanics, and unique attack patterns.

### Pride Boss

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 400 | `400 + floor * 40` |
| Attack | 20 | `20 + floor * 4` |
| Defense | 8 | `8 + floor * 2` |
| Speed | 55 | `55` (no scaling) |
| XP Value | 300 | `300 + floor * 50` |

**Visual:** 2x scale, golden tint

**Special Ability - Enhanced Reflection:**
- Reflects **50%** of damage (vs 25% for regular Pride enemy)

**Phase Transitions:**
- Phase 2 (HP <= 60%): Beige tint, spawns 2 mirror images
- Phase 3 (HP <= 30%): White tint, spawns 4 mirror images

**Attack Patterns:**
1. **Golden Ring** - 10 projectiles (16 in phase 3) in a ring, speed 140
2. **Mirror Beams** - Fires from self and all mirrors toward player
3. **Prideful Charge** - Dashes at 280 speed for 600ms

**Mirror Images:**
- Semi-transparent golden sprites at 1.5x scale
- Orbit around the boss
- Fire projectiles during Mirror Beams attack (50% attack damage)

---

### Greed Boss

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 350 | `350 + floor * 35` |
| Attack | 18 | `18 + floor * 3` |
| Defense | 4 | `4 + floor` |
| Speed | 75 | `75` (1.3x in phase 3) |
| XP Value | 300 | `300 + floor * 50` |

**Visual:** 2x scale

**Special Ability - Heavy Gold Theft:**
- Steals 15-35 gold on successful attack

**Phase Transitions:**
- Phase 2 (HP <= 60%): Golden tint
- Phase 3 (HP <= 30%): Green tint, speed increases 30%

**Attack Patterns:**
1. **Coin Barrage** - 5 projectiles (9 in phase 3) in a spread, speed 220
2. **Gold Pile Trap** - Spawns 3 (5 in phase 3) exploding gold piles
   - Piles explode after 1500ms into 8 projectiles each
3. **Greedy Grab** - Dashes at 350 speed for 400ms

---

### Wrath Boss

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 450 | `450 + floor * 45` |
| Attack | 25 | `25 + floor * 5` (scales with phase) |
| Defense | 3 | `3 + floor` |
| Speed | 70 | `70` (scales with phase) |
| XP Value | 300 | `300 + floor * 50` |

**Visual:** 2x scale, red tint

**Phase Transitions:**
- Phase 2 (HP <= 60%): Orange tint, 130% attack, 115% speed
- Phase 3 (HP <= 30%): Yellow tint, 170% attack, 150% speed, rage aura animation

**Attack Patterns:**
1. **Fire Wave** - 5 projectiles in 2 waves (3 waves in phase 3), 200ms apart
2. **Berserker Charge** - 2 rapid charges (3 in phase 3) at 400 speed, 300ms each
3. **Rage Burst** - 12 projectiles (20 in phase 3) in a ring, speed 180

---

### Sloth Boss

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 500 | `500 + floor * 50` |
| Attack | 15 | `15 + floor * 3` |
| Defense | 10 | `10 + floor * 2` |
| Speed | 30 | `30` (increases to 60 in phase 3) |
| XP Value | 300 | `300 + floor * 50` |

**Visual:** 2x scale, creates massive slow aura (6 tile radius)

**Special Ability - Enhanced Slow Aura:**
- Radius: 6 tiles (vs 3 for regular Sloth)
- Slow amount: 60% in phases 1-2, 70% in phase 3

**Phase Transitions:**
- Phase 2 (HP <= 60%): Dark gray tint
- Phase 3 (HP <= 30%): Blue tint, paradoxically gains speed (60)

**Attack Patterns:**
1. **Time Slow Field** - Expands slow aura to 1.5x for 1.5 seconds
2. **Lethargy Wave** - 10 slow large projectiles (16 in phase 3), speed 80
3. **Drowsy Burst** - 3 targeted bursts of 3 projectiles each, 400ms apart

---

### Envy Boss

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 400 | `400 + floor * 40` |
| Attack | 16 | `16 + floor * 3` (copies player) |
| Defense | 5 | `5 + floor` (copies player) |
| Speed | 65 | `65` (no scaling) |
| XP Value | 300 | `300 + floor * 50` |

**Visual:** 2x scale

**Special Ability - Full Stat Copy:**
- Copies both player attack AND defense (takes maximum of own or player's)

**Phase Transitions:**
- Phase 2 (HP <= 60%): Green tint, spawns 1 shadow clone
- Phase 3 (HP <= 30%): Near-black tint, spawns 2 additional shadow clones

**Attack Patterns:**
1. **Shadow Bolt** - 5 projectiles (7 in phase 3) in a narrow spread
2. **Envy Mirror** - Fires 5 projectiles in player's movement direction
3. **Dark Swarm** - 10 projectiles (14 in phase 3) in a ring, speed 130

**Shadow Clones:**
- 20% of boss HP, 50% of boss attack, no defense
- Semi-transparent, dark-tinted
- Full speed, award 20 XP each

---

### Gluttony Boss

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 550 | `550 + floor * 55` |
| Attack | 22 | `22 + floor * 4` |
| Defense | 6 | `6 + floor` |
| Speed | 45 | `45` (1.2x in phase 3) |
| XP Value | 300 | `300 + floor * 50` |

**Visual:** 2x scale (grows with feeding)

**Special Ability - Heavy Life Steal:**
- Heals **40%** of damage dealt (vs 20% for regular Gluttony)
- Grows slightly larger each time it heals (up to 3x scale)

**Phase Transitions:**
- Phase 2 (HP <= 60%): Amber tint, grows to 2.3x scale
- Phase 3 (HP <= 30%): Dark amber tint, grows to 2.6x scale, speed +20%

**Attack Patterns:**
1. **Devour Charge** - Wide charge at 250 speed for 800ms
2. **Hunger Wave** - 6 projectiles (9 in phase 3) in 90-degree spread
3. **Consume Burst** - 8 large slow projectiles (12 in phase 3), speed 100

---

### Lust Boss

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 380 | `380 + floor * 38` |
| Attack | 18 | `18 + floor * 3` |
| Defense | 4 | `4 + floor` |
| Speed | 70 | `70` (1.3x in phase 3) |
| XP Value | 300 | `300 + floor * 50` |

**Visual:** 2x scale, pink pull aura (7 tile radius)

**Special Ability - Enhanced Pull:**
- Pull radius: 7 tiles (vs 5 for regular Lust)
- Pull strength: 50 (75 in phase 3)

**Phase Transitions:**
- Phase 2 (HP <= 60%): Pink tint
- Phase 3 (HP <= 30%): Light pink tint, speed +30%, pull strength +50%

**Attack Patterns:**
1. **Seductive Spiral** - 10 projectiles (16 in phase 3) in spiral pattern, 100ms apart
2. **Heart Burst** - 5 projectiles (7 in phase 3) in 60-degree spread toward player
3. **Charm Dash** - Quick dash at 350 speed for 400ms

---

## Floor Scaling Reference

Quick reference for how stats scale with floor level.

### Standard Enemies at Floor 10

| Enemy | HP | Attack | Defense | Speed | XP |
|-------|-----|--------|---------|-------|-----|
| Fast | 45 | 14 | 0 | 200 | 45 |
| Tank | 150 | 28 | 13 | 60 | 115 |
| Ranged | 60 | 26 | 1 | 80 | 90 |
| Boss | 500 | 45 | 15 | 80 | 700 |

### Sin Enemies at Floor 10

| Enemy | HP | Attack | Defense | Speed | XP |
|-------|-----|--------|---------|-------|-----|
| Sloth | 230 | 14 | 14 | 45 | 120 |
| Gluttony | 190 | 28 | 12 | 55 | 145 |
| Greed | 75 | 13 | 0 | 180 | 95 |
| Envy | 95 | 15* | 11 | 110 | 120 |
| Wrath | 125 | 30** | 12 | 120** | 150 |
| Lust | 65 | 14 | 0 | 90 | 95 |
| Pride | 160 | 28 | 25 | 80 | 180 |

\* Copies player attack if higher
\*\* Before enrage multipliers

### Sin Bosses at Floor 10

| Boss | HP | Attack | Defense | Speed | XP |
|------|-----|--------|---------|-------|-----|
| Pride | 800 | 60 | 28 | 55 | 800 |
| Greed | 700 | 48 | 14 | 75-98 | 800 |
| Wrath | 900 | 75* | 13 | 105* | 800 |
| Sloth | 1000 | 45 | 30 | 30-60 | 800 |
| Envy | 800 | 46** | 15** | 65 | 800 |
| Gluttony | 1100 | 62 | 16 | 45-54 | 800 |
| Lust | 760 | 48 | 14 | 70-91 | 800 |

\* Phase 3 values (170% attack, 150% speed)
\*\* Maximum of own stats or copied player stats

---

## Spawn Mechanics

### World-Based Spawning

When in a themed world (Sin World):

| Roll | Result |
|------|--------|
| 0-60% | World's primary sin enemy |
| 60-85% | Random from world's enemy pool |
| 85-100% | Standard enemy (Fast/Tank/Ranged) |

### Legacy Mode Spawning

When not in a themed world:

| Floor | Available Enemies | Notes |
|-------|-------------------|-------|
| 1+ | Basic, Fast, Sloth, Gluttony | Sin enemies at 8% each |
| 2+ | + Ranged | 20% chance |
| 3+ | + Tank | 15% chance |
| 4+ | + Greed, Envy | 8% each |
| 7+ | + Wrath, Lust | 8% each |
| 10+ | + Pride | 5% chance (rare) |

### Challenge Room Enemies

- Spawn as if 2 floors higher (effectiveFloor = floor + 2)
- 30% Tank, 25% Ranged, 20% Fast, 25% Elite Basic
- More enemies per room
- Marked with `challengeEnemy` data flag

### Basic Enemy (Legacy/Fallback)

| Stat | Base | Scaling Formula |
|------|------|-----------------|
| HP | 20 | `20 + floor * 5` |
| Attack | 5 | `5 + floor * 2` |
| Defense | 1 | `1 + floor / 2` |
| Speed | 60 | `60 + floor * 5` |
| XP Value | 20 | `20 + floor * 5` |

---

## AI Behavior Constants

All enemies share these base AI constants from `Enemy.ts`:

| Constant | Value | Description |
|----------|-------|-------------|
| ATTACK_COOLDOWN_MS | 1000 | Time between melee attacks |
| CHASE_RANGE | 8 tiles | Distance to start chasing player |
| ATTACK_RANGE | 1.5 tiles | Distance to start attacking |
| RETREAT_HP_PERCENT | 0.2 | HP threshold to retreat (20%) |

### AI States

1. **IDLE** - Not moving, player out of range
2. **CHASE** - Moving toward player (within 8 tiles)
3. **ATTACK** - Within attack range, dealing damage
4. **RETREAT** - Below 20% HP, moving away from player

---

## World Enemy Pools

Complete listing of which enemies spawn in each world.

| World | Primary (60%) | Pool (25%) | Standard (15%) |
|-------|---------------|------------|----------------|
| Pride | PrideEnemy | Pride, Tank, Ranged | Any |
| Greed | GreedEnemy | Greed, Fast, Basic | Any |
| Wrath | WrathEnemy | Wrath, Fast, Tank | Any |
| Sloth | SlothEnemy | Sloth, Tank, Basic | Any |
| Envy | EnvyEnemy | Envy, Fast, Ranged | Any |
| Gluttony | GluttonyEnemy | Gluttony, Tank, Basic | Any |
| Lust | LustEnemy | Lust, Fast, Ranged | Any |

---

*Last updated: December 2024*

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
