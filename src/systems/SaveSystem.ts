import { InventorySystem, Equipment } from './InventorySystem';
import { Item } from './Item';

interface SaveData {
  version: number;
  floor: number;
  player: {
    level: number;
    xp: number;
    xpToNext: number;
    hp: number;
    maxHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpeed: number;
    statPoints: number;
  };
  inventory: {
    items: Item[];
    equipment: Equipment;
  };
  timestamp: number;
}

const SAVE_KEY = 'dungeon_crawler_save';
const SAVE_VERSION = 1;

export class SaveSystem {
  static save(
    floor: number,
    playerData: {
      level: number;
      xp: number;
      xpToNext: number;
      hp: number;
      maxHp: number;
      baseAttack: number;
      baseDefense: number;
      baseSpeed: number;
      statPoints: number;
    },
    inventory: InventorySystem
  ): boolean {
    try {
      const saveData: SaveData = {
        version: SAVE_VERSION,
        floor,
        player: playerData,
        inventory: {
          items: inventory.getItems(),
          equipment: inventory.getEquipment(),
        },
        timestamp: Date.now(),
      };

      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      return true;
    } catch (error) {
      console.error('Failed to save game:', error);
      return false;
    }
  }

  static load(): SaveData | null {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) return null;

      const data = JSON.parse(saved) as SaveData;

      // Version check for future compatibility
      if (data.version !== SAVE_VERSION) {
        console.warn('Save version mismatch, may need migration');
      }

      return data;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }

  static hasSave(): boolean {
    return localStorage.getItem(SAVE_KEY) !== null;
  }

  static deleteSave(): void {
    localStorage.removeItem(SAVE_KEY);
  }

  static getSaveInfo(): { floor: number; level: number; timestamp: number } | null {
    const data = this.load();
    if (!data) return null;

    return {
      floor: data.floor,
      level: data.player.level,
      timestamp: data.timestamp,
    };
  }

  static restoreInventory(inventory: InventorySystem, data: SaveData['inventory']): void {
    // Use the built-in serialize/deserialize methods
    inventory.deserialize(JSON.stringify(data));
  }
}
