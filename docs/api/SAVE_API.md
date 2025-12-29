# Save System API Reference

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![localStorage](https://img.shields.io/badge/Storage-localStorage-orange)
![Version](https://img.shields.io/badge/Save%20Version-2-blue)

The `SaveSystem` class provides static methods for persisting and restoring game state using browser localStorage.

## Table of Contents

- [Overview](#overview)
- [Storage Configuration](#storage-configuration)
- [Data Schema](#data-schema)
- [Public Methods](#public-methods)
  - [save()](#save)
  - [load()](#load)
  - [hasSave()](#hassave)
  - [deleteSave()](#deletesave)
  - [getSaveInfo()](#getsaveinfo)
  - [restoreInventory()](#restoreinventory)
- [Migration Handling](#migration-handling)
- [Usage Examples](#usage-examples)
- [Type Definitions](#type-definitions)

---

## Overview

The SaveSystem is a static utility class that handles all game persistence. It serializes game state to JSON and stores it in the browser's localStorage. The system includes automatic migration support for upgrading save data from older versions.

**Location:** `src/systems/SaveSystem.ts`

**Import:**
```typescript
import { SaveSystem } from './systems/SaveSystem';
```

---

## Storage Configuration

| Constant | Value | Description |
|----------|-------|-------------|
| `SAVE_KEY` | `'dungeon_crawler_save'` | localStorage key for save data |
| `SAVE_VERSION` | `2` | Current save data schema version |

---

## Data Schema

### SaveData (v2 - Current)

```typescript
interface SaveData {
  version: number;              // Schema version (currently 2)
  progression: GameProgression; // World progress and run state
  player: {
    level: number;              // Player character level
    xp: number;                 // Current experience points
    xpToNext: number;           // XP required for next level
    hp: number;                 // Current health points
    baseMaxHp: number;          // Base maximum HP (before equipment)
    baseAttack: number;         // Base attack stat
    baseDefense: number;        // Base defense stat
    baseSpeed: number;          // Base speed stat
    statPoints: number;         // Unspent stat points
    gold: number;               // Currency
  };
  inventory: {
    items: Item[];              // Array of inventory items
    equipment: Equipment;       // Currently equipped items
  };
  timestamp: number;            // Unix timestamp (ms) of save
}
```

### GameProgression

```typescript
interface GameProgression {
  worldProgress: Record<SinWorld, WorldProgress>;  // Progress per world
  activeRun: ActiveRun | null;                     // Current dungeon run
  hubUnlocks: string[];                            // Unlocked hub features
  totalDeaths: number;                             // Lifetime death count
  totalEnemiesKilled: number;                      // Lifetime kills
  totalGoldEarned: number;                         // Lifetime gold earned
}

interface WorldProgress {
  started: boolean;      // Has player entered this world
  currentFloor: number;  // 0 = not started, 1-3 = in progress
  completed: boolean;    // World boss defeated
  deathCount: number;    // Deaths in this world
}

interface ActiveRun {
  world: SinWorld;  // Current world being explored
  floor: number;    // Current floor (1-3)
}
```

### Equipment

```typescript
interface Equipment {
  weapon: Item | null;
  armor: Item | null;
  accessory: Item | null;
}
```

### SinWorld Enum

```typescript
enum SinWorld {
  PRIDE = 'pride',
  GREED = 'greed',
  WRATH = 'wrath',
  SLOTH = 'sloth',
  ENVY = 'envy',
  GLUTTONY = 'gluttony',
  LUST = 'lust',
}
```

---

## Public Methods

### save()

Persists the current game state to localStorage.

**Signature:**
```typescript
static save(
  progression: GameProgression,
  playerData: {
    level: number;
    xp: number;
    xpToNext: number;
    hp: number;
    baseMaxHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpeed: number;
    statPoints: number;
    gold: number;
  },
  inventory: InventorySystem
): boolean
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `progression` | `GameProgression` | Current world/run progression state |
| `playerData` | `object` | Player stats and attributes |
| `inventory` | `InventorySystem` | Player inventory instance |

**Returns:** `boolean` - `true` if save succeeded, `false` if an error occurred.

**Example:**
```typescript
const success = SaveSystem.save(
  progressionManager.getProgression(),
  {
    level: player.level,
    xp: player.xp,
    xpToNext: player.xpToNext,
    hp: player.hp,
    baseMaxHp: player.baseMaxHp,
    baseAttack: player.baseAttack,
    baseDefense: player.baseDefense,
    baseSpeed: player.baseSpeed,
    statPoints: player.statPoints,
    gold: player.gold,
  },
  player.inventory
);

if (success) {
  console.log('Game saved successfully!');
}
```

---

### load()

Retrieves and parses save data from localStorage. Automatically migrates older save versions.

**Signature:**
```typescript
static load(): SaveData | null
```

**Parameters:** None

**Returns:** `SaveData | null` - Parsed save data, or `null` if no save exists or parsing fails.

**Example:**
```typescript
const saveData = SaveSystem.load();

if (saveData) {
  // Restore player stats
  player.level = saveData.player.level;
  player.xp = saveData.player.xp;
  player.hp = saveData.player.hp;
  player.gold = saveData.player.gold;

  // Restore progression
  progressionManager.setProgression(saveData.progression);

  // Restore inventory
  SaveSystem.restoreInventory(player.inventory, saveData.inventory);
}
```

---

### hasSave()

Checks if a save file exists without loading the full data.

**Signature:**
```typescript
static hasSave(): boolean
```

**Parameters:** None

**Returns:** `boolean` - `true` if save data exists in localStorage.

**Example:**
```typescript
if (SaveSystem.hasSave()) {
  showContinueButton();
} else {
  showNewGameOnly();
}
```

---

### deleteSave()

Permanently removes save data from localStorage.

**Signature:**
```typescript
static deleteSave(): void
```

**Parameters:** None

**Returns:** `void`

**Example:**
```typescript
// Confirm before deleting
if (confirm('Delete all save data?')) {
  SaveSystem.deleteSave();
  console.log('Save data deleted');
}
```

---

### getSaveInfo()

Retrieves summary information about the saved game without returning full data. Useful for displaying save slot previews.

**Signature:**
```typescript
static getSaveInfo(): {
  level: number;
  timestamp: number;
  worldsCompleted: number;
  activeWorld: SinWorld | null;
  activeFloor: number | null;
} | null
```

**Parameters:** None

**Returns:** Save summary object or `null` if no save exists.

| Property | Type | Description |
|----------|------|-------------|
| `level` | `number` | Player's character level |
| `timestamp` | `number` | Unix timestamp of last save |
| `worldsCompleted` | `number` | Count of defeated world bosses (0-7) |
| `activeWorld` | `SinWorld \| null` | Current world if mid-run |
| `activeFloor` | `number \| null` | Current floor if mid-run |

**Example:**
```typescript
const info = SaveSystem.getSaveInfo();

if (info) {
  const date = new Date(info.timestamp).toLocaleDateString();
  console.log(`Level ${info.level} - ${info.worldsCompleted}/7 worlds - ${date}`);

  if (info.activeWorld) {
    console.log(`Currently in: ${info.activeWorld} Floor ${info.activeFloor}`);
  }
}
```

---

### restoreInventory()

Deserializes saved inventory data into an InventorySystem instance.

**Signature:**
```typescript
static restoreInventory(
  inventory: InventorySystem,
  data: SaveData['inventory']
): void
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `inventory` | `InventorySystem` | Target inventory to populate |
| `data` | `SaveData['inventory']` | Saved inventory data (items + equipment) |

**Returns:** `void`

**Example:**
```typescript
const saveData = SaveSystem.load();
if (saveData) {
  const inventory = new InventorySystem(20);
  SaveSystem.restoreInventory(inventory, saveData.inventory);

  console.log(`Restored ${inventory.getItemCount()} items`);
}
```

---

## Migration Handling

The SaveSystem automatically handles save data migrations when loading older versions.

### Version 1 to Version 2

**Changes:**
- Replaced linear `floor` number with full `GameProgression` object
- Added world-based progress tracking

**Migration Behavior:**
- Player stats and inventory are preserved
- A fresh `GameProgression` is created (old linear progress does not map to new world system)
- Migrated data is immediately saved back to localStorage

```typescript
// Migration is automatic during load()
const data = SaveSystem.load();
// If v1 data existed, it's now v2 and re-saved
```

### Legacy SaveData (v1)

```typescript
interface LegacySaveData {
  version: 1;
  floor: number;           // Linear floor number (removed in v2)
  player: SaveData['player'];
  inventory: SaveData['inventory'];
  timestamp: number;
}
```

---

## Usage Examples

### Complete Save Flow

```typescript
import { SaveSystem } from './systems/SaveSystem';
import { progressionManager } from './systems/ProgressionSystem';
import { Player } from './entities/Player';

class GameScene {
  private player: Player;

  saveGame(): void {
    const success = SaveSystem.save(
      progressionManager.getProgression(),
      {
        level: this.player.level,
        xp: this.player.xp,
        xpToNext: this.player.xpToNext,
        hp: this.player.hp,
        baseMaxHp: this.player.baseMaxHp,
        baseAttack: this.player.baseAttack,
        baseDefense: this.player.baseDefense,
        baseSpeed: this.player.baseSpeed,
        statPoints: this.player.statPoints,
        gold: this.player.gold,
      },
      this.player.inventory
    );

    if (success) {
      this.showNotification('Game Saved');
    } else {
      this.showNotification('Save Failed', 'error');
    }
  }
}
```

### Complete Load Flow

```typescript
import { SaveSystem } from './systems/SaveSystem';
import { progressionManager } from './systems/ProgressionSystem';
import { Player } from './entities/Player';

class MainMenuScene {
  startContinueGame(): void {
    const saveData = SaveSystem.load();

    if (!saveData) {
      console.error('No save data found');
      return;
    }

    // Create player with saved stats
    const player = new Player(this.scene, 0, 0);

    // Restore player attributes
    player.level = saveData.player.level;
    player.xp = saveData.player.xp;
    player.xpToNext = saveData.player.xpToNext;
    player.hp = saveData.player.hp;
    player.baseMaxHp = saveData.player.baseMaxHp;
    player.baseAttack = saveData.player.baseAttack;
    player.baseDefense = saveData.player.baseDefense;
    player.baseSpeed = saveData.player.baseSpeed;
    player.statPoints = saveData.player.statPoints;
    player.gold = saveData.player.gold;

    // Restore inventory
    SaveSystem.restoreInventory(player.inventory, saveData.inventory);

    // Restore world progression
    progressionManager.setProgression(saveData.progression);

    // Navigate based on active run
    if (saveData.progression.activeRun) {
      this.scene.start('GameScene', {
        world: saveData.progression.activeRun.world,
        floor: saveData.progression.activeRun.floor,
      });
    } else {
      this.scene.start('HubScene');
    }
  }
}
```

### Main Menu Save Preview

```typescript
class MainMenuScene {
  showSaveSlot(): void {
    const info = SaveSystem.getSaveInfo();

    if (info) {
      const date = new Date(info.timestamp);
      const timeAgo = this.formatTimeAgo(date);

      this.continueButton.setText([
        'Continue',
        `Lv.${info.level} | ${info.worldsCompleted}/7 Worlds`,
        `Last played: ${timeAgo}`,
      ].join('\n'));

      this.continueButton.setVisible(true);
    } else {
      this.continueButton.setVisible(false);
    }
  }

  private formatTimeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }
}
```

---

## Type Definitions

For complete type definitions, see the following source files:

| Type | Location |
|------|----------|
| `SaveData`, `LegacySaveData` | `src/systems/SaveSystem.ts` |
| `GameProgression`, `WorldProgress`, `ActiveRun` | `src/systems/ProgressionSystem.ts` |
| `InventorySystem`, `Equipment`, `InventoryStats` | `src/systems/InventorySystem.ts` |
| `Item`, `ItemType`, `ItemRarity`, `ItemStats` | `src/systems/Item.ts` |
| `SinWorld`, `WorldConfig` | `src/config/WorldConfig.ts` |

---

## Error Handling

All methods use try-catch internally and fail gracefully:

- `save()` returns `false` on error and logs to console
- `load()` returns `null` on error and logs to console
- `hasSave()` returns `false` if localStorage access fails
- `getSaveInfo()` returns `null` on error

```typescript
// Safe usage pattern
const data = SaveSystem.load();
if (data === null) {
  // Handle missing/corrupted save
  startNewGame();
  return;
}
// Proceed with valid data
```

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
