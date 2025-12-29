# Weapons Reference

![Weapons](https://img.shields.io/badge/Weapon%20Types-5-blue)
![Rarities](https://img.shields.io/badge/Rarity%20Tiers-5-purple)

Complete reference for all weapon types in the dungeon crawler.

---

## Table of Contents

- [Weapon Types Overview](#weapon-types-overview)
- [Detailed Weapon Stats](#detailed-weapon-stats)
  - [Wand](#wand)
  - [Sword](#sword)
  - [Bow](#bow)
  - [Staff](#staff)
  - [Daggers](#daggers)
- [Rarity System](#rarity-system)
- [Stat Glossary](#stat-glossary)

---

## Weapon Types Overview

| Weapon | Damage | Cooldown | Range | Speed | Projectiles | Special |
|--------|--------|----------|-------|-------|-------------|---------|
| Wand | 1.0x | 300ms | 1.0 | 400 | 1 | - |
| Sword | 2.0x | 400ms | 1.2 | Melee | 1 | Piercing, 90° Arc |
| Bow | 1.8x | 600ms | 1.5 | 500 | 1 | Piercing, Charge |
| Staff | 1.5x | 800ms | 0.8 | 250 | 1 | AOE (64px radius) |
| Daggers | 0.5x | 150ms | 0.7 | 450 | 3 | 15° Spread |

---

## Detailed Weapon Stats

### Wand

```
+------------------------------------------+
|                   WAND                   |
+------------------------------------------+
| Type:           Ranged Projectile        |
| Texture:        weapon_wand              |
| Projectile:     projectile_wand          |
+------------------------------------------+
```

| Stat | Value | Description |
|------|-------|-------------|
| **Damage Multiplier** | 1.0x | Standard baseline damage |
| **Attack Speed** | 300ms | Fast firing rate |
| **Range** | 1.0 | Standard projectile lifetime |
| **Projectile Speed** | 400 | Moderate projectile velocity |
| **Projectile Count** | 1 | Single projectile per attack |
| **Spread** | 0° | No spread, straight shot |
| **Piercing** | No | Projectile stops on hit |
| **AOE** | No | Single target |
| **Charge Time** | 0ms | Instant fire |

**Attack Pattern:**
The wand fires a single magic projectile in a straight line toward the cursor. It has the fastest base attack speed of all ranged weapons, making it ideal for consistent DPS at medium range. The projectile travels at moderate speed and stops upon hitting an enemy.

**Playstyle:** Balanced ranged combat. Good for beginners and sustained damage output.

---

### Sword

```
+------------------------------------------+
|                  SWORD                   |
+------------------------------------------+
| Type:           Melee Sweep              |
| Texture:        weapon_sword             |
| Effect:         slash_effect             |
+------------------------------------------+
```

| Stat | Value | Description |
|------|-------|-------------|
| **Damage Multiplier** | 2.0x | Highest single-hit damage |
| **Attack Speed** | 400ms | Moderate cooldown |
| **Range** | 1.2 | Extended melee arc size |
| **Projectile Speed** | 0 (Melee) | No projectile |
| **Projectile Count** | 1 | Single sweep |
| **Spread (Arc)** | 90° | Wide sweeping arc |
| **Piercing** | Yes | Hits all enemies in arc |
| **AOE** | No | Arc-based, not explosion |
| **Charge Time** | 0ms | Instant swing |

**Attack Pattern:**
The sword performs a wide 90-degree sweeping arc in the direction of attack. As a melee weapon, it has no projectile speed but compensates with the highest damage multiplier (2.0x) and piercing capability. The extended range (1.2) provides a larger arc than standard melee weapons.

**Playstyle:** High-risk, high-reward melee combat. Excellent for crowd control when enemies cluster together. Requires closing distance to be effective.

---

### Bow

```
+------------------------------------------+
|                   BOW                    |
+------------------------------------------+
| Type:           Charged Ranged           |
| Texture:        weapon_bow               |
| Projectile:     projectile_arrow         |
+------------------------------------------+
```

| Stat | Value | Description |
|------|-------|-------------|
| **Damage Multiplier** | 1.8x | High damage per shot |
| **Attack Speed** | 600ms | Slower cooldown |
| **Range** | 1.5 | Extended projectile lifetime |
| **Projectile Speed** | 500 | Fastest projectile |
| **Projectile Count** | 1 | Single arrow |
| **Spread** | 0° | Precise shot |
| **Piercing** | Yes | Arrow passes through enemies |
| **AOE** | No | Single line of fire |
| **Charge Time** | 300ms | Must charge for full damage |

**Attack Pattern:**
The bow fires a fast arrow that pierces through all enemies in its path. It has the longest range (1.5) and fastest projectile speed (500), but requires a 300ms charge time for optimal damage. The piercing capability makes it devastating against lined-up enemies.

**Playstyle:** Precision sniping. Best for picking off enemies at range and dealing with linear enemy formations. The charge mechanic rewards patient, aimed shots over spam.

---

### Staff

```
+------------------------------------------+
|                  STAFF                   |
+------------------------------------------+
| Type:           AOE Caster               |
| Texture:        weapon_staff             |
| Projectile:     projectile_orb           |
+------------------------------------------+
```

| Stat | Value | Description |
|------|-------|-------------|
| **Damage Multiplier** | 1.5x | Good base damage |
| **Attack Speed** | 800ms | Slowest cooldown |
| **Range** | 0.8 | Reduced projectile lifetime |
| **Projectile Speed** | 250 | Slow orb travel |
| **Projectile Count** | 1 | Single orb |
| **Spread** | 0° | Direct aim |
| **Piercing** | No | Explodes on contact |
| **AOE** | Yes | Explosion on impact |
| **AOE Radius** | 64px (2 tiles) | Large explosion area |

**Attack Pattern:**
The staff launches a slow-moving magical orb that explodes on impact, dealing damage in a 64-pixel (2 tile) radius. While it has the slowest attack speed (800ms) and projectile speed (250), the AOE explosion makes it extremely effective against groups. The reduced range (0.8) means the orb has less travel time before dissipating.

**Playstyle:** Area control and crowd damage. Ideal for defensive play and room clearing. The slow projectile requires leading targets but rewards with massive multi-target damage.

---

### Daggers

```
+------------------------------------------+
|                 DAGGERS                  |
+------------------------------------------+
| Type:           Rapid Multi-Projectile   |
| Texture:        weapon_daggers           |
| Projectile:     projectile_dagger        |
+------------------------------------------+
```

| Stat | Value | Description |
|------|-------|-------------|
| **Damage Multiplier** | 0.5x | Low per-hit damage |
| **Attack Speed** | 150ms | Fastest attack speed |
| **Range** | 0.7 | Short projectile lifetime |
| **Projectile Speed** | 450 | Fast throw |
| **Projectile Count** | 3 | Triple dagger throw |
| **Spread** | 15° | Moderate cone spread |
| **Piercing** | No | Daggers stop on hit |
| **AOE** | No | Individual hits |
| **Charge Time** | 0ms | Instant throw |

**Attack Pattern:**
The daggers throw 3 projectiles simultaneously in a 15-degree spread pattern. Despite the low damage multiplier (0.5x per dagger), the extremely fast attack speed (150ms) and triple projectiles result in potentially the highest DPS at close range. The spread pattern naturally covers more area but reduces precision at distance.

**Playstyle:** Aggressive close-range burst. Excels at point-blank combat where all three daggers connect. The 150ms cooldown allows for near-continuous attacks. Effective DPS potential: 0.5 x 3 = 1.5x per attack at 150ms intervals.

---

## Rarity System

Weapons drop in 5 rarity tiers, each providing a cumulative damage bonus.

| Rarity | Tier | Damage Bonus | Display Name Format |
|--------|------|--------------|---------------------|
| **Common** | 0 | +0% | `{Weapon}` |
| **Uncommon** | 1 | +15% | `Uncommon {Weapon}` |
| **Rare** | 2 | +30% | `Rare {Weapon}` |
| **Epic** | 3 | +45% | `Epic {Weapon}` |
| **Legendary** | 4 | +60% | `Legendary {Weapon}` |

### Rarity Drop Chances

Drop chances are affected by dungeon floor depth. The base formula:

```
rarityRoll = random(0-1) + (floor * 0.02)
```

| Rarity | Base Threshold | Effect of Floor |
|--------|----------------|-----------------|
| Common | roll < 0.40 | Base ~40% chance |
| Uncommon | roll >= 0.40 | Starts at ~25% |
| Rare | roll >= 0.65 | Starts at ~20% |
| Epic | roll >= 0.85 | Starts at ~10% |
| Legendary | roll >= 0.95 | Starts at ~5% |

**Example at Floor 10:**
- Roll modifier: +0.20
- Legendary chance increases from 5% to 25%
- Common drops become less likely

### Effective Damage by Rarity

| Weapon | Common | Uncommon | Rare | Epic | Legendary |
|--------|--------|----------|------|------|-----------|
| Wand | 1.00x | 1.15x | 1.30x | 1.45x | 1.60x |
| Sword | 2.00x | 2.30x | 2.60x | 2.90x | 3.20x |
| Bow | 1.80x | 2.07x | 2.34x | 2.61x | 2.88x |
| Staff | 1.50x | 1.73x | 1.95x | 2.18x | 2.40x |
| Daggers | 0.50x | 0.58x | 0.65x | 0.73x | 0.80x |

---

## Stat Glossary

| Stat | Description |
|------|-------------|
| **Damage Multiplier** | Base damage modifier applied to player's attack stat |
| **Attack Speed (Cooldown)** | Time in milliseconds between attacks |
| **Range** | For projectiles: lifetime multiplier (how far they travel). For melee: arc size multiplier |
| **Projectile Speed** | Velocity of fired projectile in pixels per second. 0 = melee weapon |
| **Projectile Count** | Number of projectiles fired per attack |
| **Spread** | Angle in degrees between multiple projectiles (or arc angle for melee) |
| **Piercing** | Whether projectile/attack continues through enemies |
| **AOE** | Whether the attack explodes on impact |
| **AOE Radius** | Explosion radius in pixels (TILE_SIZE = 32px) |
| **Charge Time** | Required hold time for full damage (0 = instant) |

---

## Technical Notes

- **TILE_SIZE**: 32 pixels
- **Staff AOE Radius**: `TILE_SIZE * 2` = 64 pixels
- **Damage Formula**: `baseDamage * weaponMultiplier * (1 + rarityBonus)`
- **Rarity Bonus Formula**: `rarity * 0.15` (where rarity is 0-4)

---

*Source: `/src/systems/Weapon.ts`*
