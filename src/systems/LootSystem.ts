import { Item, ItemRarity, createItem, generateProceduralItem } from './Item';

// Rarity weights based on floor
const RARITY_WEIGHTS = {
  base: {
    [ItemRarity.COMMON]: 60,
    [ItemRarity.UNCOMMON]: 25,
    [ItemRarity.RARE]: 12,
    [ItemRarity.EPIC]: 3,
    [ItemRarity.LEGENDARY]: 0.5,
  },
};

export class LootSystem {
  private dropChance: number;

  constructor(dropChance: number = 0.4) {
    this.dropChance = dropChance;
  }

  shouldDrop(): boolean {
    return Math.random() < this.dropChance;
  }

  generateLoot(floor: number = 1): Item | null {
    if (!this.shouldDrop()) {
      return null;
    }

    // 30% chance for potion, 70% for procedural equipment
    if (Math.random() < 0.3) {
      return Math.random() < 0.7
        ? createItem('health_potion')
        : createItem('large_health_potion');
    }

    const rarity = this.rollRarity(floor);
    return generateProceduralItem(floor, rarity);
  }

  // Generate guaranteed loot (for chests, bosses, etc.)
  generateGuaranteedLoot(minRarity: ItemRarity = ItemRarity.COMMON): Item {
    // Roll for rarity at or above minimum
    const rarities = [ItemRarity.COMMON, ItemRarity.UNCOMMON, ItemRarity.RARE, ItemRarity.EPIC, ItemRarity.LEGENDARY];
    const minIndex = rarities.indexOf(minRarity);
    const validRarities = rarities.slice(minIndex);

    // Weight higher rarities less
    const weights = validRarities.map((_, i) => Math.max(1, 10 - i * 3));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    const roll = Math.random() * totalWeight;

    let cumulative = 0;
    let chosenRarity = minRarity;
    for (let i = 0; i < validRarities.length; i++) {
      cumulative += weights[i];
      if (roll < cumulative) {
        chosenRarity = validRarities[i];
        break;
      }
    }

    return generateProceduralItem(10, chosenRarity); // Use floor 10 for good stats
  }

  private rollRarity(floor: number): ItemRarity {
    const weights = { ...RARITY_WEIGHTS.base };

    // Higher floors increase rare/epic/legendary chances
    const floorBonus = Math.min(floor * 2, 30);
    weights[ItemRarity.COMMON] = Math.max(20, weights[ItemRarity.COMMON] - floorBonus);
    weights[ItemRarity.UNCOMMON] += Math.floor(floorBonus * 0.35);
    weights[ItemRarity.RARE] += Math.floor(floorBonus * 0.35);
    weights[ItemRarity.EPIC] += Math.floor(floorBonus * 0.2);
    weights[ItemRarity.LEGENDARY] += Math.floor(floorBonus * 0.1);

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const roll = Math.random() * totalWeight;

    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(weights)) {
      cumulative += weight;
      if (roll < cumulative) {
        return rarity as ItemRarity;
      }
    }

    return ItemRarity.COMMON;
  }
}
