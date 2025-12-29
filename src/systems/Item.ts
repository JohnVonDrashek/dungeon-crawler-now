export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  ACCESSORY = 'accessory',
  CONSUMABLE = 'consumable',
}

export enum ItemRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export interface ItemStats {
  attack?: number;
  defense?: number;
  maxHp?: number;
  speed?: number;
}

import { Weapon, WeaponType } from './Weapon';

export interface WeaponData {
  weaponType: WeaponType;
  rarity: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  stats: ItemStats;
  description: string;
  healAmount?: number; // For consumables
  weaponData?: WeaponData; // For weapon items with attack patterns
}

// Color mapping for rarity
export const RARITY_COLORS: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 0xaaaaaa,
  [ItemRarity.UNCOMMON]: 0x22cc22,
  [ItemRarity.RARE]: 0x3399ff,
  [ItemRarity.EPIC]: 0xaa44ff,
  [ItemRarity.LEGENDARY]: 0xffd700,
};

// Item templates
export const ITEM_TEMPLATES: Record<string, Omit<Item, 'id'>> = {
  // Armor
  leather_armor: {
    name: 'Leather Armor',
    type: ItemType.ARMOR,
    rarity: ItemRarity.COMMON,
    stats: { defense: 2 },
    description: 'Basic protection.',
  },
  chainmail: {
    name: 'Chainmail',
    type: ItemType.ARMOR,
    rarity: ItemRarity.UNCOMMON,
    stats: { defense: 5 },
    description: 'Linked metal rings.',
  },
  plate_armor: {
    name: 'Plate Armor',
    type: ItemType.ARMOR,
    rarity: ItemRarity.RARE,
    stats: { defense: 8, speed: -10 },
    description: 'Heavy but protective.',
  },
  dragon_scale: {
    name: 'Dragon Scale Armor',
    type: ItemType.ARMOR,
    rarity: ItemRarity.EPIC,
    stats: { defense: 12, maxHp: 20 },
    description: 'Scales of an ancient dragon.',
  },

  // Accessories
  wooden_ring: {
    name: 'Wooden Ring',
    type: ItemType.ACCESSORY,
    rarity: ItemRarity.COMMON,
    stats: { maxHp: 10 },
    description: 'A simple carved ring.',
  },
  speed_boots: {
    name: 'Speed Boots',
    type: ItemType.ACCESSORY,
    rarity: ItemRarity.UNCOMMON,
    stats: { speed: 25 },
    description: 'Light as a feather.',
  },
  power_amulet: {
    name: 'Power Amulet',
    type: ItemType.ACCESSORY,
    rarity: ItemRarity.RARE,
    stats: { attack: 5, maxHp: 15 },
    description: 'Pulses with energy.',
  },
  ring_of_legends: {
    name: 'Ring of Legends',
    type: ItemType.ACCESSORY,
    rarity: ItemRarity.EPIC,
    stats: { attack: 8, defense: 5, maxHp: 25, speed: 15 },
    description: 'Worn by heroes of old.',
  },

  // Consumables
  health_potion: {
    name: 'Health Potion',
    type: ItemType.CONSUMABLE,
    rarity: ItemRarity.COMMON,
    stats: {},
    healAmount: 30,
    description: 'Restores 30 HP.',
  },
  large_health_potion: {
    name: 'Large Health Potion',
    type: ItemType.CONSUMABLE,
    rarity: ItemRarity.UNCOMMON,
    stats: {},
    healAmount: 60,
    description: 'Restores 60 HP.',
  },
};

let itemIdCounter = 0;

export function createItem(templateId: string): Item | null {
  const template = ITEM_TEMPLATES[templateId];
  if (!template) return null;

  return {
    id: `item_${itemIdCounter++}`,
    ...template,
  };
}

// Procedural item generation (weapons are generated separately via Weapon system)
const ARMOR_PREFIXES = ['Tattered', 'Leather', 'Chain', 'Plate', 'Mystic', 'Dragon', 'Shadow'];
const ARMOR_TYPES = ['Armor', 'Mail', 'Vest', 'Cuirass', 'Guard', 'Plate'];
const ACCESSORY_PREFIXES = ['Wooden', 'Silver', 'Golden', 'Crystal', 'Arcane', 'Blessed'];
const ACCESSORY_TYPES = ['Ring', 'Amulet', 'Pendant', 'Charm', 'Talisman', 'Boots'];

const RARITY_MULTIPLIERS: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 1,
  [ItemRarity.UNCOMMON]: 1.5,
  [ItemRarity.RARE]: 2.2,
  [ItemRarity.EPIC]: 3,
  [ItemRarity.LEGENDARY]: 4,
};

const RARITY_BONUS_STATS: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 0,
  [ItemRarity.UNCOMMON]: 1,
  [ItemRarity.RARE]: 2,
  [ItemRarity.EPIC]: 3,
  [ItemRarity.LEGENDARY]: 4,
};

function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateProceduralItem(floor: number, rarity: ItemRarity): Item {
  // Weapons are generated separately via the Weapon system
  const types = [ItemType.ARMOR, ItemType.ACCESSORY];
  const type = randomPick(types);

  return generateProceduralItemOfType(floor, rarity, type);
}

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

      // Bonus stats based on rarity
      if (bonusStats >= 1 && Math.random() > 0.5) {
        stats.maxHp = randomRange(10, 25);
      }
      if (bonusStats >= 2 && Math.random() > 0.5) {
        // Heavy armor might reduce speed
        if (Math.random() > 0.7) {
          stats.speed = -randomRange(5, 15);
        } else {
          stats.speed = randomRange(5, 10);
        }
      }

      description = `A ${rarity} armor. DEF +${stats.defense}`;
      break;
    }

    case ItemType.ACCESSORY: {
      const prefix = randomPick(ACCESSORY_PREFIXES);
      const accessoryType = randomPick(ACCESSORY_TYPES);
      name = `${prefix} ${accessoryType}`;

      // Accessories have varied stats
      const statRoll = Math.random();
      if (statRoll < 0.33) {
        stats.maxHp = Math.floor(randomRange(10, 20) * multiplier);
        description = `A ${rarity} accessory. HP +${stats.maxHp}`;
      } else if (statRoll < 0.66) {
        stats.speed = Math.floor(randomRange(10, 25) * multiplier);
        description = `A ${rarity} accessory. SPD +${stats.speed}`;
      } else {
        stats.attack = Math.floor(randomRange(2, 5) * multiplier);
        description = `A ${rarity} accessory. ATK +${stats.attack}`;
      }

      // Bonus stats
      if (bonusStats >= 1 && Math.random() > 0.5) {
        if (!stats.defense) stats.defense = randomRange(1, 5);
      }
      if (bonusStats >= 2 && Math.random() > 0.5) {
        if (!stats.attack) stats.attack = randomRange(2, 5);
      }
      if (bonusStats >= 3) {
        // Epic accessories get all stats
        if (!stats.maxHp) stats.maxHp = randomRange(10, 20);
        if (!stats.speed) stats.speed = randomRange(10, 20);
      }

      break;
    }

    default:
      name = 'Mystery Item';
      description = 'Unknown origin.';
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

// Convert a Weapon to an Item for inventory
export function createItemFromWeapon(weapon: Weapon): Item {
  const rarityMap: ItemRarity[] = [
    ItemRarity.COMMON,
    ItemRarity.UNCOMMON,
    ItemRarity.RARE,
    ItemRarity.EPIC,
    ItemRarity.LEGENDARY,
  ];

  const rarity = rarityMap[weapon.rarity] || ItemRarity.COMMON;
  const damageBonus = Math.floor(weapon.getDamageMultiplier() * 5);

  return {
    id: `item_${itemIdCounter++}`,
    name: weapon.getDisplayName(),
    type: ItemType.WEAPON,
    rarity,
    stats: {
      attack: damageBonus,
    },
    description: `${weapon.stats.name} - ${getWeaponDescription(weapon.stats.type)}`,
    weaponData: {
      weaponType: weapon.stats.type,
      rarity: weapon.rarity,
    },
  };
}

function getWeaponDescription(type: WeaponType): string {
  switch (type) {
    case WeaponType.WAND:
      return 'Fires magic projectiles';
    case WeaponType.SWORD:
      return 'Powerful melee arc attack';
    case WeaponType.BOW:
      return 'Piercing long-range shots';
    case WeaponType.STAFF:
      return 'Explosive magic orbs';
    case WeaponType.DAGGERS:
      return 'Rapid triple-shot attack';
    default:
      return 'A mysterious weapon';
  }
}
