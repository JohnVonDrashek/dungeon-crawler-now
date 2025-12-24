import { InventorySystem, Equipment } from './InventorySystem';
import { Item } from './Item';
import { GameProgression, createDefaultProgression } from './ProgressionSystem';
import { SinWorld } from '../config/WorldConfig';

interface SaveData {
  version: number;
  progression: GameProgression;
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

// Legacy save format for migration
interface LegacySaveData {
  version: number;
  floor: number;
  player: SaveData['player'];
  inventory: SaveData['inventory'];
  timestamp: number;
}

const SAVE_KEY = 'dungeon_crawler_save';
const SAVE_VERSION = 2;

export class SaveSystem {
  static save(
    progression: GameProgression,
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
        progression,
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

      const rawData = JSON.parse(saved);

      // Migrate from version 1 (linear floor) to version 2 (progression)
      if (rawData.version === 1) {
        console.log('Migrating save from v1 to v2...');
        const legacyData = rawData as LegacySaveData;

        // Create fresh progression (old linear progress doesn't map to new system)
        const progression = createDefaultProgression();

        const migratedData: SaveData = {
          version: SAVE_VERSION,
          progression,
          player: legacyData.player,
          inventory: legacyData.inventory,
          timestamp: legacyData.timestamp,
        };

        // Save the migrated data
        localStorage.setItem(SAVE_KEY, JSON.stringify(migratedData));
        return migratedData;
      }

      return rawData as SaveData;
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

  static getSaveInfo(): {
    level: number;
    timestamp: number;
    worldsCompleted: number;
    activeWorld: SinWorld | null;
    activeFloor: number | null;
  } | null {
    const data = this.load();
    if (!data) return null;

    const completedCount = Object.values(data.progression.worldProgress)
      .filter(wp => wp.completed).length;

    return {
      level: data.player.level,
      timestamp: data.timestamp,
      worldsCompleted: completedCount,
      activeWorld: data.progression.activeRun?.world ?? null,
      activeFloor: data.progression.activeRun?.floor ?? null,
    };
  }

  static restoreInventory(inventory: InventorySystem, data: SaveData['inventory']): void {
    // Use the built-in serialize/deserialize methods
    inventory.deserialize(JSON.stringify(data));
  }
}
