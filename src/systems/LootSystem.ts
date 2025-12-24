import { Item, ItemRarity, createItem, ITEM_TEMPLATES } from './Item';

interface LootTableEntry {
  templateId: string;
  weight: number;
}

const LOOT_TABLE: LootTableEntry[] = [
  // Common items (high weight)
  { templateId: 'health_potion', weight: 30 },
  { templateId: 'rusty_sword', weight: 15 },
  { templateId: 'leather_armor', weight: 15 },
  { templateId: 'wooden_ring', weight: 15 },

  // Uncommon items (medium weight)
  { templateId: 'large_health_potion', weight: 10 },
  { templateId: 'iron_sword', weight: 8 },
  { templateId: 'chainmail', weight: 8 },
  { templateId: 'speed_boots', weight: 8 },

  // Rare items (low weight)
  { templateId: 'flame_blade', weight: 4 },
  { templateId: 'plate_armor', weight: 4 },
  { templateId: 'power_amulet', weight: 4 },

  // Epic items (very low weight)
  { templateId: 'doom_cleaver', weight: 1 },
  { templateId: 'dragon_scale', weight: 1 },
  { templateId: 'ring_of_legends', weight: 1 },
];

export class LootSystem {
  private dropChance: number;

  constructor(dropChance: number = 0.4) {
    this.dropChance = dropChance;
  }

  shouldDrop(): boolean {
    return Math.random() < this.dropChance;
  }

  generateLoot(floorBonus: number = 0): Item | null {
    if (!this.shouldDrop()) {
      return null;
    }

    // Calculate total weight
    const totalWeight = LOOT_TABLE.reduce((sum, entry) => sum + entry.weight, 0);

    // Higher floors slightly increase rare drop chances
    const roll = Math.random() * totalWeight * Math.max(0.5, 1 - floorBonus * 0.02);

    let cumulative = 0;
    for (const entry of LOOT_TABLE) {
      cumulative += entry.weight;
      if (roll < cumulative) {
        return createItem(entry.templateId);
      }
    }

    // Fallback to health potion
    return createItem('health_potion');
  }

  // Generate guaranteed loot (for chests, bosses, etc.)
  generateGuaranteedLoot(minRarity: ItemRarity = ItemRarity.COMMON): Item {
    const validItems = LOOT_TABLE.filter((entry) => {
      const template = ITEM_TEMPLATES[entry.templateId];
      return this.rarityValue(template.rarity) >= this.rarityValue(minRarity);
    });

    if (validItems.length === 0) {
      return createItem('health_potion')!;
    }

    const totalWeight = validItems.reduce((sum, entry) => sum + entry.weight, 0);
    const roll = Math.random() * totalWeight;

    let cumulative = 0;
    for (const entry of validItems) {
      cumulative += entry.weight;
      if (roll < cumulative) {
        return createItem(entry.templateId)!;
      }
    }

    return createItem(validItems[0].templateId)!;
  }

  private rarityValue(rarity: ItemRarity): number {
    switch (rarity) {
      case ItemRarity.COMMON:
        return 0;
      case ItemRarity.UNCOMMON:
        return 1;
      case ItemRarity.RARE:
        return 2;
      case ItemRarity.EPIC:
        return 3;
    }
  }
}
