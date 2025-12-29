# Items and Loot System

[![Dungeon Crawler](https://img.shields.io/badge/game-dungeon%20crawler-8B4513)](https://github.com/JohnVonDrashek/dungeon-crawler-now)
[![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/phaser-3.x-orange)](https://phaser.io/)

Complete documentation of the item, equipment, and loot systems in the dungeon crawler.

---

## Table of Contents

- [Item Types](#item-types)
- [Rarity System](#rarity-system)
- [Procedural Item Generation](#procedural-item-generation)
- [Weapon System](#weapon-system)
- [Drop Rates](#drop-rates)
- [Equipment Slots](#equipment-slots)
- [Consumables](#consumables)
- [Gold System](#gold-system)

---

## Item Types

The game features four distinct item types, each serving a specific purpose:

| Type | Enum Value | Purpose | Equippable |
|------|------------|---------|------------|
| **Weapon** | `weapon` | Attack damage and patterns | Yes (weapon slot) |
| **Armor** | `armor` | Defense and HP bonuses | Yes (armor slot) |
| **Accessory** | `accessory` | Varied stat bonuses | Yes (accessory slot) |
| **Consumable** | `consumable` | Healing items | No (use from inventory) |

### Item Stats Interface

```typescript
interface ItemStats {
  attack?: number;    // Increases attack damage
  defense?: number;   // Reduces incoming damage
  maxHp?: number;     // Increases maximum health
  speed?: number;     // Modifies movement speed
}
```

---

## Rarity System

### Rarity Tiers

| Rarity | Enum Value | Color (Hex) | Display Color |
|--------|------------|-------------|---------------|
| Common | `common` | `0xaaaaaa` | Gray |
| Uncommon | `uncommon` | `0x22cc22` | Green |
| Rare | `rare` | `0x3399ff` | Blue |
| Epic | `epic` | `0xaa44ff` | Purple |
| Legendary | `legendary` | `0xffd700` | Gold |

### Stat Multipliers by Rarity

Base stats are multiplied according to rarity:

| Rarity | Multiplier | Example (Base 10) |
|--------|------------|-------------------|
| Common | 1.0x | 10 |
| Uncommon | 1.5x | 15 |
| Rare | 2.2x | 22 |
| Epic | 3.0x | 30 |
| Legendary | 4.0x | 40 |

### Bonus Stats by Rarity

Higher rarity items gain additional random stat bonuses:

| Rarity | Bonus Stat Chances |
|--------|-------------------|
| Common | 0 bonus stats |
| Uncommon | 1 potential bonus stat |
| Rare | 2 potential bonus stats |
| Epic | 3 potential bonus stats |
| Legendary | 4 potential bonus stats |

---

## Procedural Item Generation

### Name Generation

Items are named using prefix + type combinations:

**Armor Prefixes:**
`Tattered`, `Leather`, `Chain`, `Plate`, `Mystic`, `Dragon`, `Shadow`

**Armor Types:**
`Armor`, `Mail`, `Vest`, `Cuirass`, `Guard`, `Plate`

**Accessory Prefixes:**
`Wooden`, `Silver`, `Golden`, `Crystal`, `Arcane`, `Blessed`

**Accessory Types:**
`Ring`, `Amulet`, `Pendant`, `Charm`, `Talisman`, `Boots`

### Stat Rolling Algorithm

#### Armor Generation

```
Base Defense = random(1-4) + floor(currentFloor / 3)
Final Defense = floor(baseDefense * rarityMultiplier)

Bonus Stats (based on rarity bonus count):
- >= 1 bonus: 50% chance for maxHp (10-25)
- >= 2 bonuses: 50% chance for speed
  - 70% positive: +5 to +10
  - 30% negative (heavy armor): -5 to -15
```

#### Accessory Generation

Accessories roll one primary stat type (33% each):

| Roll | Primary Stat | Base Range | With Multiplier |
|------|--------------|------------|-----------------|
| 0-33% | Max HP | 10-20 | 10-80 (at Legendary) |
| 33-66% | Speed | 10-25 | 10-100 (at Legendary) |
| 66-100% | Attack | 2-5 | 2-20 (at Legendary) |

**Bonus Stats for Accessories:**
- >= 1 bonus: 50% chance for defense (1-5) if none
- >= 2 bonuses: 50% chance for attack (2-5) if none
- >= 3 bonuses (Epic+): All missing stats get values
  - Missing maxHp: 10-20
  - Missing speed: 10-20

---

## Weapon System

### Weapon Types

| Type | Enum Value | Base Damage | Attack Speed | Description |
|------|------------|-------------|--------------|-------------|
| **Wand** | `wand` | 1.0x | 300ms | Fires magic projectiles |
| **Sword** | `sword` | 2.0x | 400ms | Powerful melee arc attack |
| **Bow** | `bow` | 1.8x | 600ms | Piercing long-range shots |
| **Staff** | `staff` | 1.5x | 800ms | Explosive magic orbs |
| **Daggers** | `daggers` | 0.5x | 150ms | Rapid triple-shot attack |

### Weapon Stats Detail

| Type | Speed | Range | Proj. Speed | Count | Spread | Piercing | AoE |
|------|-------|-------|-------------|-------|--------|----------|-----|
| Wand | 300ms | 1.0 | 400 | 1 | 0 | No | No |
| Sword | 400ms | 1.2 | 0 (melee) | 1 | 90deg | Yes | No |
| Bow | 600ms | 1.5 | 500 | 1 | 0 | Yes | No |
| Staff | 800ms | 0.8 | 250 | 1 | 0 | No | Yes (64px) |
| Daggers | 150ms | 0.7 | 450 | 3 | 15deg | No | No |

### Special Weapon Properties

- **Sword**: 300ms charge time required for full damage
- **Staff**: AoE radius of `TILE_SIZE * 2` (64 pixels)
- **Daggers**: Fires 3 projectiles with 15-degree spread

### Rarity Scaling for Weapons

Weapon damage scales with rarity via bonus damage:

| Rarity | Index | Bonus Damage | Total Multiplier |
|--------|-------|--------------|------------------|
| Common | 0 | +0% | 1.0x base |
| Uncommon | 1 | +15% | 1.15x base |
| Rare | 2 | +30% | 1.30x base |
| Epic | 3 | +45% | 1.45x base |
| Legendary | 4 | +60% | 1.60x base |

**Formula:**
```
finalDamage = baseDamage * (1 + rarity * 0.15)
```

### Weapon Rarity Roll (Floor-Based)

```
rarityRoll = random(0-1) + (floor * 0.02)

if rarityRoll > 0.95: Legendary
else if rarityRoll > 0.85: Epic
else if rarityRoll > 0.65: Rare
else if rarityRoll > 0.40: Uncommon
else: Common
```

---

## Drop Rates

### Base Drop Chance

**Default drop chance:** 40% (`0.4`)

When an enemy dies, there's a 40% base chance to drop something.

### Item Type Distribution

When a drop occurs:

| Roll | Drop Type | Details |
|------|-----------|---------|
| 0-30% | Potion | 70% Health Potion, 30% Large Health Potion |
| 30-100% | Equipment | Procedurally generated armor or accessory |

### Rarity Weights by Floor

**Base Weights (Floor 1):**

| Rarity | Base Weight | Percentage |
|--------|-------------|------------|
| Common | 60 | ~59.5% |
| Uncommon | 25 | ~24.8% |
| Rare | 12 | ~11.9% |
| Epic | 3 | ~3.0% |
| Legendary | 0.5 | ~0.5% |

**Floor Bonus Calculation:**
```
floorBonus = min(floor * 2, 30)  // Max bonus at floor 15

Common: max(20, 60 - floorBonus)
Uncommon: 25 + floor(floorBonus * 0.35)
Rare: 12 + floor(floorBonus * 0.35)
Epic: 3 + floor(floorBonus * 0.2)
Legendary: 0.5 + floor(floorBonus * 0.1)
```

**Example at Floor 15:**

| Rarity | Weight | Percentage |
|--------|--------|------------|
| Common | 30 | ~32.6% |
| Uncommon | 35.5 | ~38.6% |
| Rare | 22.5 | ~24.5% |
| Epic | 9 | ~9.8% |
| Legendary | 3.5 | ~3.8% |

### Guaranteed Drops

For chests and bosses, `generateGuaranteedLoot()` is used:

**Weight Formula:** `weight = max(1, 10 - index * 3)`

| Rarity | Index | Weight |
|--------|-------|--------|
| Minimum Rarity | 0 | 10 |
| Next Tier | 1 | 7 |
| Next Tier | 2 | 4 |
| Next Tier | 3 | 1 |
| Highest | 4 | 1 |

Guaranteed loot uses Floor 10 stats for consistent quality.

---

## Equipment Slots

### Available Slots

| Slot | Type | Stats Provided |
|------|------|----------------|
| **Weapon** | `weapon` | Attack, weapon abilities |
| **Armor** | `armor` | Defense, maxHp, speed |
| **Accessory** | `accessory` | Varies (attack, defense, maxHp, speed) |

### Stat Stacking

All equipped item stats stack additively:

```typescript
totalAttack = baseAttack + weapon.attack + armor.attack + accessory.attack
totalDefense = baseDefense + weapon.defense + armor.defense + accessory.defense
totalMaxHp = baseMaxHp + weapon.maxHp + armor.maxHp + accessory.maxHp
totalSpeed = max(50, baseSpeed + weapon.speed + armor.speed + accessory.speed)
```

**Note:** Speed has a minimum floor of 50 to prevent immobility.

### Inventory System

- **Max Slots:** 20 items
- **Equip Action:** Moves item from inventory to equipment slot
- **Unequip Action:** Returns equipped item to inventory (requires free slot)

---

## Consumables

### Health Potions

| Potion | Rarity | Heal Amount | Description |
|--------|--------|-------------|-------------|
| Health Potion | Common | 30 HP | Standard healing |
| Large Health Potion | Uncommon | 60 HP | Enhanced healing |

### Usage

Consumables cannot be equipped. Use directly from inventory to apply effect:

```typescript
// Player heal formula
this.hp = Math.min(this.maxHp, this.hp + item.healAmount);
```

### Shop Availability

- **Floor 1-4:** Health Potions (30 HP)
- **Floor 5+:** Large Health Potions (60 HP)

---

## Gold System

### Gold Drop Amounts

Gold drops spawn as coins with visual stacking:

```
coinCount = min(ceil(amount / 10), 5)  // Max 5 coins per drop
```

Each coin contains: `ceil(totalAmount / coinCount)` gold

### Shop Pricing

#### Base Prices by Item Type

| Item Type | Base Price |
|-----------|------------|
| Weapon | 40g |
| Armor | 30g |
| Accessory | 25g |
| Consumable | 15g |

#### Rarity Price Multipliers

| Rarity | Multiplier |
|--------|------------|
| Common | 1x |
| Uncommon | 2x |
| Rare | 4x |
| Epic | 8x |
| Legendary | 16x |

#### Floor Scaling

```
finalPrice = floor(basePrice * rarityMultiplier * (1 + floor * 0.1))
```

**Example Prices (Floor 5):**

| Item | Base | Rarity | Floor Mult | Final Price |
|------|------|--------|------------|-------------|
| Common Weapon | 40 | 1x | 1.5x | 60g |
| Rare Armor | 30 | 4x | 1.5x | 180g |
| Epic Accessory | 25 | 8x | 1.5x | 300g |
| Large Potion | 15 | 2x | 1.5x | 45g |

### Shop Services

#### Full Heal

```
healCost = max(10, floor(missingHp * 0.5))
```

Restores player to full HP.

#### Reroll Shop

- **Initial Cost:** 50g
- **Cost Increase:** 50% per reroll
- **Formula:** `newCost = floor(currentCost * 1.5)`

**Reroll Cost Progression:** 50g -> 75g -> 112g -> 168g -> 252g...

---

## Item Templates

Pre-defined items available via `createItem(templateId)`:

### Armor Templates

| Template ID | Name | Rarity | Defense | Other Stats |
|-------------|------|--------|---------|-------------|
| `leather_armor` | Leather Armor | Common | +2 | - |
| `chainmail` | Chainmail | Uncommon | +5 | - |
| `plate_armor` | Plate Armor | Rare | +8 | Speed -10 |
| `dragon_scale` | Dragon Scale Armor | Epic | +12 | maxHp +20 |

### Accessory Templates

| Template ID | Name | Rarity | Stats |
|-------------|------|--------|-------|
| `wooden_ring` | Wooden Ring | Common | maxHp +10 |
| `speed_boots` | Speed Boots | Uncommon | Speed +25 |
| `power_amulet` | Power Amulet | Rare | Attack +5, maxHp +15 |
| `ring_of_legends` | Ring of Legends | Epic | Attack +8, Defense +5, maxHp +25, Speed +15 |

### Consumable Templates

| Template ID | Name | Rarity | Heal Amount |
|-------------|------|--------|-------------|
| `health_potion` | Health Potion | Common | 30 HP |
| `large_health_potion` | Large Health Potion | Uncommon | 60 HP |

---

## Player Base Stats Reference

| Stat | Starting Value | Source |
|------|----------------|--------|
| Max HP | 100 | `PLAYER_MAX_HP` |
| Attack | 10 | `PLAYER_BASE_ATTACK` |
| Defense | 5 | `PLAYER_BASE_DEFENSE` |
| Speed | 150 | `PLAYER_SPEED` |
| Gold | 0 | Starting value |

### Damage Formula

```
incomingDamage = enemyAttack
actualDamage = max(1, incomingDamage - playerDefense)
```

---

## Related Files

| File | Purpose |
|------|---------|
| `/src/systems/Item.ts` | Item types, templates, procedural generation |
| `/src/systems/Weapon.ts` | Weapon definitions and stats |
| `/src/systems/LootSystem.ts` | Drop rates and rarity rolling |
| `/src/systems/InventorySystem.ts` | Equipment management |
| `/src/systems/LootDropManager.ts` | Visual drop spawning |
| `/src/ui/ShopUI.ts` | Shop interface and pricing |
| `/src/entities/Player.ts` | Player stats and inventory |
| `/src/utils/constants.ts` | Base stat constants |

---

![Repobeats](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
