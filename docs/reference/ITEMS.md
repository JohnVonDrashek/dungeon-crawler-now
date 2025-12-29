# Item Catalog

[![Game System](https://img.shields.io/badge/system-items-blue)](../../src/systems/Item.ts)
[![TypeScript](https://img.shields.io/badge/typescript-strict-blue)](https://www.typescriptlang.org/)

Complete reference for all items in the dungeon crawler, including templates, procedural generation, and stat calculations.

---

## Table of Contents

- [Item Types](#item-types)
- [Rarity System](#rarity-system)
- [Template Items](#template-items)
  - [Armor](#armor)
  - [Accessories](#accessories)
  - [Consumables](#consumables)
- [Procedural Generation](#procedural-generation)
  - [Name Components](#name-components)
  - [Stat Ranges](#stat-ranges)
  - [Bonus Stat Mechanics](#bonus-stat-mechanics)
- [Weapons](#weapons)

---

## Item Types

| Type | Enum Value | Description |
|------|------------|-------------|
| Weapon | `weapon` | Attack items with damage patterns |
| Armor | `armor` | Defensive equipment, primarily boosts defense |
| Accessory | `accessory` | Utility items with varied stat bonuses |
| Consumable | `consumable` | Single-use items (potions, etc.) |

---

## Rarity System

### Rarity Tiers

| Rarity | Color | Hex Code | Multiplier | Bonus Stats |
|--------|-------|----------|------------|-------------|
| Common | Gray | `#AAAAAA` | 1.0x | 0 |
| Uncommon | Green | `#22CC22` | 1.5x | 1 |
| Rare | Blue | `#3399FF` | 2.2x | 2 |
| Epic | Purple | `#AA44FF` | 3.0x | 3 |
| Legendary | Gold | `#FFD700` | 4.0x | 4 |

### Rarity Mechanics

- **Multiplier**: Applied to base stat values during procedural generation
- **Bonus Stats**: Number of additional stat rolls an item can receive

---

## Template Items

Pre-defined items with fixed stats that can be spawned directly.

### Armor

| Template ID | Name | Rarity | Defense | Speed | Max HP | Description |
|-------------|------|--------|---------|-------|--------|-------------|
| `leather_armor` | Leather Armor | Common | +2 | - | - | Basic protection. |
| `chainmail` | Chainmail | Uncommon | +5 | - | - | Linked metal rings. |
| `plate_armor` | Plate Armor | Rare | +8 | -10 | - | Heavy but protective. |
| `dragon_scale` | Dragon Scale Armor | Epic | +12 | - | +20 | Scales of an ancient dragon. |

### Accessories

| Template ID | Name | Rarity | Attack | Defense | Speed | Max HP | Description |
|-------------|------|--------|--------|---------|-------|--------|-------------|
| `wooden_ring` | Wooden Ring | Common | - | - | - | +10 | A simple carved ring. |
| `speed_boots` | Speed Boots | Uncommon | - | - | +25 | - | Light as a feather. |
| `power_amulet` | Power Amulet | Rare | +5 | - | - | +15 | Pulses with energy. |
| `ring_of_legends` | Ring of Legends | Epic | +8 | +5 | +15 | +25 | Worn by heroes of old. |

### Consumables

| Template ID | Name | Rarity | Heal Amount | Description |
|-------------|------|--------|-------------|-------------|
| `health_potion` | Health Potion | Common | 30 HP | Restores 30 HP. |
| `large_health_potion` | Large Health Potion | Uncommon | 60 HP | Restores 60 HP. |

---

## Procedural Generation

Items can be generated procedurally based on floor level and rarity, creating unique combinations of prefixes, types, and stats.

### Name Components

#### Armor Prefixes

| Prefix |
|--------|
| Tattered |
| Leather |
| Chain |
| Plate |
| Mystic |
| Dragon |
| Shadow |

#### Armor Types

| Type |
|------|
| Armor |
| Mail |
| Vest |
| Cuirass |
| Guard |
| Plate |

#### Accessory Prefixes

| Prefix |
|--------|
| Wooden |
| Silver |
| Golden |
| Crystal |
| Arcane |
| Blessed |

#### Accessory Types

| Type |
|------|
| Ring |
| Amulet |
| Pendant |
| Charm |
| Talisman |
| Boots |

### Stat Ranges

Stats are calculated using: `base_value * rarity_multiplier + floor_bonus`

Where `floor_bonus = floor(current_floor / 3)`

#### Armor Base Stats

| Stat | Base Range | Formula |
|------|------------|---------|
| Defense (primary) | 1-4 | `floor((1-4 + floor_bonus) * multiplier)` |
| Max HP (bonus) | 10-25 | Flat value, requires Uncommon+ and 50% chance |
| Speed (bonus) | -15 to +10 | 30% chance negative (-5 to -15), 70% chance positive (+5 to +10). Requires Rare+ |

#### Accessory Base Stats

Accessories roll one primary stat (33% each):

| Primary Stat | Base Range | Formula |
|--------------|------------|---------|
| Max HP | 10-20 | `floor((10-20) * multiplier)` |
| Speed | 10-25 | `floor((10-25) * multiplier)` |
| Attack | 2-5 | `floor((2-5) * multiplier)` |

### Bonus Stat Mechanics

Higher rarity items can gain additional stats beyond their primary:

| Rarity | Bonus Stats | Possible Additions |
|--------|-------------|-------------------|
| Common | 0 | None |
| Uncommon | 1 | 50% chance: Defense +1-5 |
| Rare | 2 | 50% chance: Defense +1-5, 50% chance: Attack +2-5 |
| Epic | 3 | All missing stats added (HP +10-20, Speed +10-20) |
| Legendary | 4 | All missing stats added (HP +10-20, Speed +10-20) |

### Calculated Stat Examples

#### Common Armor (Floor 1)

- Defense: `floor((1-4 + 0) * 1.0)` = 1-4
- No bonus stats

#### Legendary Accessory (Floor 9)

- Floor bonus: `floor(9/3)` = 3
- Primary stat multiplier: 4.0x
- Max HP example: `floor(15 * 4.0)` = 60
- Speed example: `floor(17 * 4.0)` = 68
- Attack example: `floor(3 * 4.0)` = 12
- Plus all bonus stats (Defense, Attack if not primary, HP, Speed)

---

## Weapons

Weapons are generated through a separate `Weapon` system but are converted to items for inventory management.

### Weapon Types

| Type | Description |
|------|-------------|
| Wand | Fires magic projectiles |
| Sword | Powerful melee arc attack |
| Bow | Piercing long-range shots |
| Staff | Explosive magic orbs |
| Daggers | Rapid triple-shot attack |

### Weapon to Item Conversion

When a weapon is converted to an inventory item:

- **Attack stat**: `floor(weapon.getDamageMultiplier() * 5)`
- **Rarity mapping**: Weapon rarity (0-4) maps to item rarity (Common-Legendary)
- **Weapon data**: Original weapon type and rarity stored for re-equipping

---

## Source Files

- Item System: [`src/systems/Item.ts`](../../src/systems/Item.ts)
- Weapon System: [`src/systems/Weapon.ts`](../../src/systems/Weapon.ts)

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/dungeon-crawler-now.svg "Repobeats analytics image")
