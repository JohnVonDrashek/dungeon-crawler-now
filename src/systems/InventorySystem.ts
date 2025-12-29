import { Item, ItemType } from './Item';

export interface Equipment {
  weapon: Item | null;
  armor: Item | null;
  accessory: Item | null;
}

export interface InventoryStats {
  attack: number;
  defense: number;
  maxHp: number;
  speed: number;
}

export class InventorySystem {
  private items: Item[] = [];
  private equipment: Equipment = {
    weapon: null,
    armor: null,
    accessory: null,
  };
  private maxSlots: number;

  constructor(maxSlots: number = 20) {
    this.maxSlots = maxSlots;
  }

  addItem(item: Item): boolean {
    if (this.items.length >= this.maxSlots) {
      return false;
    }
    this.items.push(item);
    return true;
  }

  removeItem(itemId: string): Item | null {
    const index = this.items.findIndex((item) => item.id === itemId);
    if (index === -1) return null;
    return this.items.splice(index, 1)[0];
  }

  getItems(): Item[] {
    return [...this.items];
  }

  getEquipment(): Equipment {
    return { ...this.equipment };
  }

  equipItem(itemId: string): Item | null {
    const item = this.removeItem(itemId);
    if (!item) return null;

    let previousItem: Item | null = null;

    switch (item.type) {
      case ItemType.WEAPON:
        previousItem = this.equipment.weapon;
        this.equipment.weapon = item;
        break;
      case ItemType.ARMOR:
        previousItem = this.equipment.armor;
        this.equipment.armor = item;
        break;
      case ItemType.ACCESSORY:
        previousItem = this.equipment.accessory;
        this.equipment.accessory = item;
        break;
      case ItemType.CONSUMABLE:
        // Can't equip consumables, put it back
        this.items.push(item);
        return null;
    }

    // Put previously equipped item back in inventory
    if (previousItem) {
      this.items.push(previousItem);
    }

    return previousItem;
  }

  unequipSlot(slot: keyof Equipment): boolean {
    const item = this.equipment[slot];
    if (!item) return false;

    if (this.items.length >= this.maxSlots) {
      return false; // Inventory full
    }

    this.equipment[slot] = null;
    this.items.push(item);
    return true;
  }

  useConsumable(itemId: string): Item | null {
    const item = this.items.find((i) => i.id === itemId);
    if (!item || item.type !== ItemType.CONSUMABLE) {
      return null;
    }

    return this.removeItem(itemId);
  }

  getEquipmentStats(): InventoryStats {
    const stats: InventoryStats = {
      attack: 0,
      defense: 0,
      maxHp: 0,
      speed: 0,
    };

    const equipped = [
      this.equipment.weapon,
      this.equipment.armor,
      this.equipment.accessory,
    ];

    for (const item of equipped) {
      if (item) {
        stats.attack += item.stats.attack ?? 0;
        stats.defense += item.stats.defense ?? 0;
        stats.maxHp += item.stats.maxHp ?? 0;
        stats.speed += item.stats.speed ?? 0;
      }
    }

    return stats;
  }

  getItemCount(): number {
    return this.items.length;
  }

  getMaxSlots(): number {
    return this.maxSlots;
  }

  // Serialize for save/load
  serialize(): string {
    return JSON.stringify({
      items: this.items,
      equipment: this.equipment,
    });
  }

  deserialize(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.items = Array.isArray(parsed.items) ? parsed.items : [];
      this.equipment = parsed.equipment && typeof parsed.equipment === 'object'
        ? {
            weapon: parsed.equipment.weapon || null,
            armor: parsed.equipment.armor || null,
            accessory: parsed.equipment.accessory || null,
          }
        : {
            weapon: null,
            armor: null,
            accessory: null,
          };
    } catch (error) {
      console.error('[InventorySystem] Failed to deserialize inventory:', error);
      // Keep current state on error
    }
  }
}
