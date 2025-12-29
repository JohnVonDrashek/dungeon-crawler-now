# Adding New Items Guide

[![Dungeon Crawler](https://img.shields.io/badge/game-dungeon%20crawler-8B4513)](https://github.com/JohnVonDrashek/dungeon-crawler-now)
[![TypeScript](https://img.shields.io/badge/typescript-5.0-blue)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/phaser-3.x-orange)](https://phaser.io/)

A step-by-step guide for adding new items to the dungeon crawler game.

---

## Table of Contents

- [Item System Overview](#item-system-overview)
- [Item Types and Their Purposes](#item-types-and-their-purposes)
- [Adding a New Item Template](#adding-a-new-item-template)
- [Creating Procedural Item Generation Rules](#creating-procedural-item-generation-rules)
- [Stat Balancing by Rarity](#stat-balancing-by-rarity)
- [Adding Consumable Effects](#adding-consumable-effects)
- [Complete Code Examples](#complete-code-examples)
- [Testing Checklist](#testing-checklist)

---

## Item System Overview

The item system consists of three core components that work together:

```
┌─────────────────────────────────────────────────────────────────┐
│                        ITEM FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐ │
│   │  Item.ts     │───>│ LootSystem.ts│───>│ InventorySystem  │ │
│   │              │    │              │    │       .ts        │ │
│   │ - Templates  │    │ - Drop logic │    │ - Equipment      │ │
│   │ - Generation │    │ - Rarity     │    │ - Slot mgmt      │ │
│   │ - Stats      │    │ - Floor scal │    │ - Stat calc      │ │
│   └──────────────┘    └──────────────┘    └──────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `/src/systems/Item.ts` | Item definitions, templates, procedural generation |
| `/src/systems/Weapon.ts` | Weapon types and combat properties |
| `/src/systems/LootSystem.ts` | Drop rates and rarity calculations |
| `/src/systems/InventorySystem.ts` | Equipment slots and stat aggregation |

### Core Interfaces

```typescript
// The main Item interface - all items must implement this
interface Item {
  id: string;           // Unique identifier (auto-generated)
  name: string;         // Display name
  type: ItemType;       // WEAPON, ARMOR, ACCESSORY, or CONSUMABLE
  rarity: ItemRarity;   // COMMON through LEGENDARY
  stats: ItemStats;     // Stat bonuses
  description: string;  // Flavor text
  healAmount?: number;  // For consumables only
  weaponData?: WeaponData; // For weapons only
}

// Stats that items can modify
interface ItemStats {
  attack?: number;    // Increases damage dealt
  defense?: number;   // Reduces damage taken
  maxHp?: number;     // Increases maximum health
  speed?: number;     // Modifies movement speed (can be negative)
}
```

---

## Item Types and Their Purposes

### ItemType Enum

```typescript
enum ItemType {
  WEAPON = 'weapon',       // Equipped in weapon slot, determines attack pattern
  ARMOR = 'armor',         // Equipped in armor slot, primarily defense
  ACCESSORY = 'accessory', // Equipped in accessory slot, varied stats
  CONSUMABLE = 'consumable', // Used from inventory, not equipped
}
```

### When to Use Each Type

| Type | Primary Purpose | Equipment Slot | Key Stats |
|------|-----------------|----------------|-----------|
| **WEAPON** | Combat abilities and attack patterns | `weapon` | `attack`, `weaponData` |
| **ARMOR** | Damage reduction and survivability | `armor` | `defense`, `maxHp`, `speed` (often negative) |
| **ACCESSORY** | Utility and stat variety | `accessory` | Any stat combination |
| **CONSUMABLE** | Immediate effects (healing) | N/A (used directly) | `healAmount` |

### Choosing the Right Type

Use this decision tree:

```
Is it used once and disappears?
├── YES → CONSUMABLE
└── NO → Is it the main attack method?
         ├── YES → WEAPON
         └── NO → Does it primarily provide defense?
                  ├── YES → ARMOR
                  └── NO → ACCESSORY
```

---

## Adding a New Item Template

Templates are pre-defined items with fixed stats. Use templates for:
- Quest rewards
- Shop items
- Special drops from specific enemies
- Items that need consistent stats across playthroughs

### Step 1: Define the Template

Open `/src/systems/Item.ts` and add to the `ITEM_TEMPLATES` object:

```typescript
export const ITEM_TEMPLATES: Record<string, Omit<Item, 'id'>> = {
  // ... existing templates ...

  // Your new template
  fire_cloak: {
    name: 'Cloak of Flames',
    type: ItemType.ARMOR,
    rarity: ItemRarity.RARE,
    stats: {
      defense: 6,
      attack: 3,  // Unusual for armor - makes it special
      speed: 5
    },
    description: 'Wreathed in ethereal flames.',
  },
};
```

### Step 2: Use the Template

```typescript
import { createItem } from './Item';

// Create an instance of your template
const fireCloak = createItem('fire_cloak');

if (fireCloak) {
  // Item was created successfully
  player.inventory.addItem(fireCloak);
}
```

### Template Naming Convention

Use `snake_case` for template IDs:

| Good | Bad |
|------|-----|
| `fire_cloak` | `FireCloak`, `fireCloak` |
| `health_potion` | `healthPotion`, `Health_Potion` |
| `dragon_scale_armor` | `dragonScaleArmor` |

---

## Creating Procedural Item Generation Rules

For randomly generated items, modify the procedural generation functions.

### Step 1: Add Name Components

Add prefixes and types for name generation:

```typescript
// In Item.ts

// For a new armor style
const ARMOR_PREFIXES = ['Tattered', 'Leather', 'Chain', 'Plate', 'Mystic', 'Dragon', 'Shadow',
  'Frost',      // Add new prefix
  'Volcanic',   // Add new prefix
];

const ARMOR_TYPES = ['Armor', 'Mail', 'Vest', 'Cuirass', 'Guard', 'Plate',
  'Mantle',     // Add new type
  'Robes',      // Add new type
];
```

### Step 2: Modify Stat Generation (Optional)

To add special stat rules for certain name combinations:

```typescript
export function generateProceduralItemOfType(floor: number, rarity: ItemRarity, type: ItemType): Item {
  const multiplier = RARITY_MULTIPLIERS[rarity];
  const bonusStats = RARITY_BONUS_STATS[rarity];
  const floorBonus = Math.floor(floor / 3);

  let name: string;
  const stats: ItemStats = {};
  let description: string;

  switch (type) {
    case ItemType.ARMOR: {
      const prefix = randomPick(ARMOR_PREFIXES);
      const armorType = randomPick(ARMOR_TYPES);
      name = `${prefix} ${armorType}`;

      // Primary stat: defense
      const baseDefense = randomRange(1, 4) + floorBonus;
      stats.defense = Math.floor(baseDefense * multiplier);

      // NEW: Special rules for certain prefixes
      if (prefix === 'Frost') {
        // Frost armor gives speed bonus (lighter)
        stats.speed = randomRange(5, 15);
      } else if (prefix === 'Volcanic') {
        // Volcanic armor gives attack but reduces speed
        stats.attack = randomRange(2, 5);
        stats.speed = -randomRange(5, 10);
      }

      // Existing bonus stat logic...
      if (bonusStats >= 1 && Math.random() > 0.5) {
        stats.maxHp = randomRange(10, 25);
      }

      description = `A ${rarity} armor. DEF +${stats.defense}`;
      break;
    }
    // ... rest of switch
  }

  return {
    id: `item_${itemIdCounter++}`,
    name,
    type,
    rarity,
    stats,
    description,
  };
}
```

### Step 3: Add a New Item Category (Advanced)

To add an entirely new procedural category (e.g., shields):

```typescript
// 1. Add name arrays
const SHIELD_PREFIXES = ['Wooden', 'Iron', 'Steel', 'Mithril', 'Arcane'];
const SHIELD_TYPES = ['Buckler', 'Kite Shield', 'Tower Shield', 'Aegis'];

// 2. Add to the generation function
export function generateProceduralItemOfType(floor: number, rarity: ItemRarity, type: ItemType): Item {
  // ... existing code ...

  switch (type) {
    // ... existing cases ...

    case ItemType.ACCESSORY: {
      // Check if we should generate a shield (30% chance for accessories)
      const isShield = Math.random() < 0.3;

      if (isShield) {
        const prefix = randomPick(SHIELD_PREFIXES);
        const shieldType = randomPick(SHIELD_TYPES);
        name = `${prefix} ${shieldType}`;

        // Shields focus on defense
        stats.defense = Math.floor(randomRange(3, 7) * multiplier);
        if (shieldType === 'Tower Shield') {
          stats.speed = -randomRange(10, 20); // Heavy
          stats.defense += 3;
        }

        description = `A ${rarity} shield. DEF +${stats.defense}`;
      } else {
        // Existing accessory logic...
      }
      break;
    }
  }
}
```

---

## Stat Balancing by Rarity

### Rarity Multipliers

The system uses two scaling mechanisms:

```typescript
// Base stat multiplier - scales primary stats
const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 1,
  [ItemRarity.UNCOMMON]: 1.5,
  [ItemRarity.RARE]: 2.2,
  [ItemRarity.EPIC]: 3,
  [ItemRarity.LEGENDARY]: 4,
};

// Bonus stat count - adds secondary stats
const RARITY_BONUS_STATS: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 0,     // Primary stat only
  [ItemRarity.UNCOMMON]: 1,   // +1 potential bonus
  [ItemRarity.RARE]: 2,       // +2 potential bonuses
  [ItemRarity.EPIC]: 3,       // +3 potential bonuses
  [ItemRarity.LEGENDARY]: 4,  // All stats possible
};
```

### Balancing Guidelines

#### Power Budget by Rarity

| Rarity | Total Stat Points | Example Distribution |
|--------|-------------------|---------------------|
| Common | 2-5 | DEF 3 |
| Uncommon | 6-12 | DEF 5, HP 10 |
| Rare | 13-25 | DEF 9, HP 15, SPD 5 |
| Epic | 26-45 | DEF 12, HP 20, ATK 5, SPD 10 |
| Legendary | 46-80 | DEF 16, HP 30, ATK 10, SPD 15 |

#### Stat Value Ranges

| Stat | Common | Uncommon | Rare | Epic | Legendary |
|------|--------|----------|------|------|-----------|
| Attack | 1-3 | 2-5 | 4-8 | 7-12 | 10-20 |
| Defense | 1-4 | 3-6 | 5-10 | 8-15 | 12-24 |
| Max HP | 5-15 | 10-25 | 20-40 | 35-60 | 50-100 |
| Speed | 5-10 | 10-20 | 15-35 | 25-50 | 40-80 |

#### Negative Stats for Balance

Some powerful items should have drawbacks:

```typescript
// Heavy armor: high defense, speed penalty
plate_of_titans: {
  name: 'Plate of Titans',
  type: ItemType.ARMOR,
  rarity: ItemRarity.LEGENDARY,
  stats: {
    defense: 20,     // Very high
    maxHp: 50,       // Very high
    speed: -30       // Significant penalty
  },
  description: 'Worn by giants. Incredibly heavy.',
},

// Glass cannon accessory
berserker_charm: {
  name: 'Berserker Charm',
  type: ItemType.ACCESSORY,
  rarity: ItemRarity.EPIC,
  stats: {
    attack: 15,      // Very high
    defense: -5      // Penalty
  },
  description: 'Power at a cost.',
},
```

---

## Adding Consumable Effects

### Step 1: Basic Healing Consumable

```typescript
// In ITEM_TEMPLATES
mega_health_potion: {
  name: 'Mega Health Potion',
  type: ItemType.CONSUMABLE,
  rarity: ItemRarity.RARE,
  stats: {},           // Consumables typically have empty stats
  healAmount: 100,     // Healing effect
  description: 'Restores 100 HP.',
},
```

### Step 2: Adding New Effect Types

To add effects beyond healing, extend the Item interface:

```typescript
// In Item.ts

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  stats: ItemStats;
  description: string;
  healAmount?: number;
  weaponData?: WeaponData;

  // NEW: Additional consumable effects
  manaAmount?: number;        // Restore mana (if you have mana)
  tempAttackBoost?: number;   // Temporary attack increase
  tempDefenseBoost?: number;  // Temporary defense increase
  tempSpeedBoost?: number;    // Temporary speed increase
  boostDuration?: number;     // Duration in milliseconds
}
```

### Step 3: Create Buff Consumables

```typescript
// In ITEM_TEMPLATES
strength_elixir: {
  name: 'Strength Elixir',
  type: ItemType.CONSUMABLE,
  rarity: ItemRarity.UNCOMMON,
  stats: {},
  tempAttackBoost: 10,
  boostDuration: 30000,  // 30 seconds
  description: 'Temporarily increases attack by 10.',
},

swiftness_potion: {
  name: 'Swiftness Potion',
  type: ItemType.CONSUMABLE,
  rarity: ItemRarity.UNCOMMON,
  stats: {},
  tempSpeedBoost: 50,
  boostDuration: 20000,  // 20 seconds
  description: 'Greatly increases movement speed.',
},
```

### Step 4: Implement the Effect Handler

In your Player entity or a dedicated buff system:

```typescript
// In Player.ts or a new BuffSystem.ts

interface ActiveBuff {
  stat: 'attack' | 'defense' | 'speed';
  amount: number;
  expiresAt: number;
}

class BuffManager {
  private buffs: ActiveBuff[] = [];

  applyBuff(stat: 'attack' | 'defense' | 'speed', amount: number, duration: number): void {
    this.buffs.push({
      stat,
      amount,
      expiresAt: Date.now() + duration,
    });
  }

  getBuffBonus(stat: 'attack' | 'defense' | 'speed'): number {
    const now = Date.now();
    // Remove expired buffs
    this.buffs = this.buffs.filter(b => b.expiresAt > now);
    // Sum active buffs for this stat
    return this.buffs
      .filter(b => b.stat === stat)
      .reduce((sum, b) => sum + b.amount, 0);
  }
}

// When using a consumable
function useConsumable(item: Item, player: Player): void {
  if (item.healAmount) {
    player.heal(item.healAmount);
  }

  if (item.tempAttackBoost && item.boostDuration) {
    player.buffManager.applyBuff('attack', item.tempAttackBoost, item.boostDuration);
  }

  if (item.tempDefenseBoost && item.boostDuration) {
    player.buffManager.applyBuff('defense', item.tempDefenseBoost, item.boostDuration);
  }

  if (item.tempSpeedBoost && item.boostDuration) {
    player.buffManager.applyBuff('speed', item.tempSpeedBoost, item.boostDuration);
  }
}
```

---

## Complete Code Examples

### Example 1: Adding a Complete Armor Set

```typescript
// In Item.ts - ITEM_TEMPLATES

// Frost Warrior Set
frost_helm: {
  name: 'Frost Warrior Helm',
  type: ItemType.ACCESSORY,  // Helms as accessories
  rarity: ItemRarity.RARE,
  stats: { defense: 4, maxHp: 15 },
  description: 'Helm of the frozen north.',
},

frost_armor: {
  name: 'Frost Warrior Armor',
  type: ItemType.ARMOR,
  rarity: ItemRarity.RARE,
  stats: { defense: 8, speed: 5 },
  description: 'Light as snow, hard as ice.',
},

frost_ring: {
  name: 'Frost Warrior Ring',
  type: ItemType.ACCESSORY,
  rarity: ItemRarity.RARE,
  stats: { attack: 4, speed: 10 },
  description: 'Grants the speed of a blizzard.',
},
```

### Example 2: Adding a New Weapon Type

```typescript
// In Weapon.ts

// 1. Add to WeaponType enum
export enum WeaponType {
  WAND = 'wand',
  SWORD = 'sword',
  BOW = 'bow',
  STAFF = 'staff',
  DAGGERS = 'daggers',
  SPEAR = 'spear',      // NEW
}

// 2. Add weapon definition
export const WEAPON_DEFINITIONS: Record<WeaponType, WeaponStats> = {
  // ... existing weapons ...

  [WeaponType.SPEAR]: {
    type: WeaponType.SPEAR,
    name: 'Spear',
    damage: 1.7,            // Good damage
    attackSpeed: 500,       // Medium speed
    range: 1.8,             // Long range for melee
    projectileSpeed: 0,     // Melee weapon
    projectileCount: 1,
    spread: 45,             // Narrower arc than sword
    piercing: true,         // Hits multiple enemies in line
    aoe: false,
    aoeRadius: 0,
    chargeTime: 200,        // Quick charge for thrust
    texture: 'weapon_spear',
    projectileTexture: 'thrust_effect',
  },
};

// 3. Update getWeaponDescription in Item.ts
function getWeaponDescription(type: WeaponType): string {
  switch (type) {
    // ... existing cases ...
    case WeaponType.SPEAR:
      return 'Long-reaching thrust attack';
    default:
      return 'A mysterious weapon';
  }
}
```

### Example 3: Floor-Specific Drop Table

```typescript
// Create a custom loot generator for a specific floor/area

class IceCavernLootSystem extends LootSystem {
  // Override to use ice-themed items
  generateLoot(floor: number = 1): Item | null {
    if (!this.shouldDrop()) {
      return null;
    }

    // 20% chance for frost set piece
    if (Math.random() < 0.2) {
      const frostItems = ['frost_helm', 'frost_armor', 'frost_ring'];
      const templateId = frostItems[Math.floor(Math.random() * frostItems.length)];
      return createItem(templateId);
    }

    // 30% chance for frost potion
    if (Math.random() < 0.3) {
      return createItem('swiftness_potion');
    }

    // Otherwise, normal procedural generation with ice theme
    const rarity = this.rollRarity(floor);
    return this.generateFrostItem(floor, rarity);
  }

  private generateFrostItem(floor: number, rarity: ItemRarity): Item {
    const item = generateProceduralItem(floor, rarity);
    // Add "Frost" prefix if not already there
    if (!item.name.includes('Frost')) {
      item.name = `Frost ${item.name}`;
      // Bonus speed for frost items
      item.stats.speed = (item.stats.speed || 0) + 5;
    }
    return item;
  }
}
```

### Example 4: Complete Consumable with Visual Effect

```typescript
// 1. Add template in Item.ts
invisibility_potion: {
  name: 'Invisibility Potion',
  type: ItemType.CONSUMABLE,
  rarity: ItemRarity.EPIC,
  stats: {},
  effectType: 'invisibility',  // Custom effect identifier
  boostDuration: 10000,        // 10 seconds
  description: 'Become invisible for 10 seconds.',
},

// 2. Handle in Player.ts
useConsumable(item: Item): void {
  // Remove from inventory
  const used = this.inventory.useConsumable(item.id);
  if (!used) return;

  // Apply effect based on type
  if (item.healAmount) {
    this.heal(item.healAmount);
  }

  if (item.effectType === 'invisibility' && item.boostDuration) {
    this.applyInvisibility(item.boostDuration);
  }
}

applyInvisibility(duration: number): void {
  this.isInvisible = true;
  this.sprite.setAlpha(0.3);  // Visual feedback

  // Enemies won't target invisible player
  this.scene.time.delayedCall(duration, () => {
    this.isInvisible = false;
    this.sprite.setAlpha(1);
  });
}
```

---

## Testing Checklist

Use this checklist when adding new items:

### Basic Functionality

- [ ] **Template Creation**: `createItem('your_template_id')` returns a valid Item
- [ ] **ID Uniqueness**: Each created item has a unique `id`
- [ ] **Type Correctness**: `item.type` matches the intended ItemType enum
- [ ] **Rarity Display**: Item appears with correct color in inventory UI

### Inventory Integration

- [ ] **Add to Inventory**: `inventory.addItem(item)` returns `true`
- [ ] **Inventory Full**: Returns `false` when inventory is at max capacity (20)
- [ ] **Remove Item**: `inventory.removeItem(item.id)` returns the item
- [ ] **Item Display**: Item appears correctly in inventory UI

### Equipment System (Non-Consumables)

- [ ] **Equip Item**: `inventory.equipItem(item.id)` moves item to correct slot
- [ ] **Slot Assignment**: Weapons go to weapon slot, armor to armor, accessories to accessory
- [ ] **Swap Behavior**: Equipping when slot is full returns previous item to inventory
- [ ] **Unequip**: `inventory.unequipSlot('armor')` returns item to inventory
- [ ] **Stat Calculation**: `inventory.getEquipmentStats()` includes new item's stats

### Consumable System

- [ ] **Use Consumable**: `inventory.useConsumable(item.id)` removes and returns item
- [ ] **Cannot Equip**: `inventory.equipItem(consumableId)` returns `null`
- [ ] **Effect Applied**: Heal amount or buff effect works correctly
- [ ] **Effect Duration**: Timed effects expire correctly

### Procedural Generation (if applicable)

- [ ] **Name Generation**: Generated names use correct prefix/type arrays
- [ ] **Stat Ranges**: Stats fall within expected ranges for rarity
- [ ] **Rarity Distribution**: Higher floors produce more rare items
- [ ] **Floor Scaling**: `floorBonus` correctly affects base stats

### Loot System Integration

- [ ] **Drop Rate**: Item appears in loot drops at expected frequency
- [ ] **Rarity Weights**: Item rarity follows weighted probability
- [ ] **Guaranteed Loot**: Works with `generateGuaranteedLoot(minRarity)`

### Save/Load

- [ ] **Serialize**: `inventory.serialize()` includes new item correctly
- [ ] **Deserialize**: `inventory.deserialize(data)` restores item properly
- [ ] **Weapon Data**: If weapon, `weaponData` serializes correctly

### Visual/UI

- [ ] **Rarity Color**: Correct color from `RARITY_COLORS` mapping
- [ ] **Description**: Description displays properly in UI
- [ ] **Icon/Sprite**: If custom texture, displays correctly

### Balance Testing

- [ ] **Power Level**: Item power appropriate for rarity tier
- [ ] **Build Viability**: Item creates interesting build options
- [ ] **Not Overpowered**: Item doesn't trivialize content
- [ ] **Not Useless**: Item provides meaningful benefit

### Quick Test Commands

```typescript
// Test in browser console or a test file

// 1. Create and verify template item
const item = createItem('your_template_id');
console.assert(item !== null, 'Template should exist');
console.assert(item.rarity === ItemRarity.RARE, 'Rarity should match');

// 2. Test procedural generation
for (let i = 0; i < 100; i++) {
  const procItem = generateProceduralItem(10, ItemRarity.LEGENDARY);
  console.assert(procItem.stats.defense !== undefined || procItem.stats.attack !== undefined,
    'Legendary items should have stats');
}

// 3. Test inventory integration
const inv = new InventorySystem();
const added = inv.addItem(item);
console.assert(added === true, 'Should add to inventory');
console.assert(inv.getItemCount() === 1, 'Count should be 1');

// 4. Test equip flow
const prevEquipped = inv.equipItem(item.id);
console.assert(inv.getEquipment().armor === item, 'Should be equipped');
console.assert(inv.getItemCount() === 0, 'Should be removed from inventory');
```

---

## Quick Reference

### File Locations

| Task | File |
|------|------|
| Add item template | `/src/systems/Item.ts` -> `ITEM_TEMPLATES` |
| Add weapon type | `/src/systems/Weapon.ts` -> `WeaponType`, `WEAPON_DEFINITIONS` |
| Modify drop rates | `/src/systems/LootSystem.ts` -> `RARITY_WEIGHTS` |
| Add name prefixes | `/src/systems/Item.ts` -> `ARMOR_PREFIXES`, etc. |
| Modify stat calculation | `/src/systems/InventorySystem.ts` -> `getEquipmentStats()` |

### Rarity Quick Reference

| Rarity | Multiplier | Color | Hex |
|--------|------------|-------|-----|
| Common | 1.0x | Gray | `0xaaaaaa` |
| Uncommon | 1.5x | Green | `0x22cc22` |
| Rare | 2.2x | Blue | `0x3399ff` |
| Epic | 3.0x | Purple | `0xaa44ff` |
| Legendary | 4.0x | Gold | `0xffd700` |

### Common Patterns

```typescript
// Create template item
const item = createItem('template_id');

// Generate random item for floor 5
const item = generateProceduralItem(5, ItemRarity.RARE);

// Generate specific type
const armor = generateProceduralItemOfType(5, ItemRarity.EPIC, ItemType.ARMOR);

// Create weapon item
const weapon = Weapon.createRandom(10);
const weaponItem = createItemFromWeapon(weapon);
```

---

## Related Documentation

- [Items and Loot System](/docs/ITEMS_AND_LOOT.md) - Complete system reference
- [Combat System](/docs/COMBAT.md) - How items affect combat
- [Progression System](/docs/PROGRESSION.md) - Floor scaling and difficulty

---

![Repobeats](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
