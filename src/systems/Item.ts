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
}

export interface ItemStats {
  attack?: number;
  defense?: number;
  maxHp?: number;
  speed?: number;
}

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  stats: ItemStats;
  description: string;
  healAmount?: number; // For consumables
}

// Color mapping for rarity
export const RARITY_COLORS: Record<ItemRarity, number> = {
  [ItemRarity.COMMON]: 0xaaaaaa,
  [ItemRarity.UNCOMMON]: 0x22cc22,
  [ItemRarity.RARE]: 0x3399ff,
  [ItemRarity.EPIC]: 0xaa44ff,
};

// Item templates
export const ITEM_TEMPLATES: Record<string, Omit<Item, 'id'>> = {
  // Weapons
  rusty_sword: {
    name: 'Rusty Sword',
    type: ItemType.WEAPON,
    rarity: ItemRarity.COMMON,
    stats: { attack: 3 },
    description: 'A worn blade, but still sharp.',
  },
  iron_sword: {
    name: 'Iron Sword',
    type: ItemType.WEAPON,
    rarity: ItemRarity.UNCOMMON,
    stats: { attack: 6 },
    description: 'A reliable iron blade.',
  },
  flame_blade: {
    name: 'Flame Blade',
    type: ItemType.WEAPON,
    rarity: ItemRarity.RARE,
    stats: { attack: 10 },
    description: 'Burns with eternal fire.',
  },
  doom_cleaver: {
    name: 'Doom Cleaver',
    type: ItemType.WEAPON,
    rarity: ItemRarity.EPIC,
    stats: { attack: 15, speed: 10 },
    description: 'Forged in the abyss.',
  },

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
