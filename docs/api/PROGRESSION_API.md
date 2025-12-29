# Progression System API Reference

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.70+-purple.svg)](https://phaser.io/)

Complete API documentation for the dungeon crawler progression system, including the ProgressionManager, Player leveling mechanics, and world unlock logic.

---

## Table of Contents

1. [ProgressionManager](#progressionmanager)
2. [Player Leveling API](#player-leveling-api)
3. [XP and Leveling Formulas](#xp-and-leveling-formulas)
4. [Stat Growth Calculations](#stat-growth-calculations)
5. [World Unlock Logic](#world-unlock-logic)
6. [Type Definitions](#type-definitions)
7. [Usage Examples](#usage-examples)

---

## ProgressionManager

**Location:** `/src/systems/ProgressionSystem.ts`

Singleton class managing game-wide progression state including world completion, active runs, and global statistics.

### Getting the Instance

```typescript
import { ProgressionManager, progressionManager } from '../systems/ProgressionSystem';

// Using the singleton instance (recommended)
const pm = progressionManager;

// Or via static method
const pm = ProgressionManager.getInstance();
```

### Core Methods

#### `getProgression(): GameProgression`

Returns the complete progression state object.

```typescript
const state = progressionManager.getProgression();
console.log(state.totalDeaths);        // number
console.log(state.totalEnemiesKilled); // number
console.log(state.activeRun);          // ActiveRun | null
```

#### `setProgression(progression: GameProgression): void`

Replaces the entire progression state. Used when loading saves.

```typescript
const savedProgression = loadFromLocalStorage();
progressionManager.setProgression(savedProgression);
```

#### `reset(): void`

Resets progression to fresh defaults. All worlds become unstarted, all statistics reset to zero.

```typescript
progressionManager.reset();
```

---

### World Progress Methods

#### `getWorldProgress(world: SinWorld): WorldProgress`

Returns the progress data for a specific world.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| `world` | `SinWorld` | The sin world enum value |

**Returns:** `WorldProgress` object

```typescript
import { SinWorld } from '../config/WorldConfig';

const prideProgress = progressionManager.getWorldProgress(SinWorld.PRIDE);
console.log(prideProgress.started);      // boolean
console.log(prideProgress.currentFloor); // 0-3
console.log(prideProgress.completed);    // boolean
console.log(prideProgress.deathCount);   // number
```

#### `isWorldCompleted(world: SinWorld): boolean`

Checks if a world's sin boss has been defeated.

```typescript
if (progressionManager.isWorldCompleted(SinWorld.WRATH)) {
  console.log('Wrath boss has been defeated!');
}
```

#### `isWorldStarted(world: SinWorld): boolean`

Checks if the player has ever entered a world.

```typescript
if (!progressionManager.isWorldStarted(SinWorld.SLOTH)) {
  console.log('Player has not visited Sloth yet');
}
```

#### `getCompletedWorlds(): SinWorld[]`

Returns an array of all completed world IDs.

```typescript
const completed = progressionManager.getCompletedWorlds();
// ['pride', 'wrath'] if Pride and Wrath bosses defeated
```

#### `getCompletedWorldCount(): number`

Returns the count of completed worlds (0-7).

```typescript
const count = progressionManager.getCompletedWorldCount();
// 0-7
```

#### `areAllWorldsCompleted(): boolean`

Returns true if all 7 sin bosses have been defeated.

```typescript
if (progressionManager.areAllWorldsCompleted()) {
  showVictoryPortal();
}
```

---

### Active Run Methods

#### `hasActiveRun(): boolean`

Checks if the player is currently in a world run.

```typescript
if (progressionManager.hasActiveRun()) {
  // Player is in a dungeon
}
```

#### `getActiveRun(): ActiveRun | null`

Returns the current run data or null if in hub.

```typescript
const run = progressionManager.getActiveRun();
if (run) {
  console.log(run.world); // SinWorld enum value
  console.log(run.floor); // 1, 2, or 3
}
```

#### `startWorld(world: SinWorld, floor?: number): void`

Begins a new world run. Marks the world as started and sets active run.

**Parameters:**
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `world` | `SinWorld` | - | Target world |
| `floor` | `number` | `1` | Starting floor (1-3) |

```typescript
progressionManager.startWorld(SinWorld.GREED);
// or
progressionManager.startWorld(SinWorld.GREED, 2); // Resume from floor 2
```

#### `advanceFloor(): void`

Moves to the next floor. If on floor 3, completes the world.

```typescript
progressionManager.advanceFloor();
// If on floor 2, moves to floor 3
// If on floor 3, calls completeWorld() automatically
```

#### `completeWorld(world: SinWorld): void`

Marks a world as completed and clears the active run.

```typescript
progressionManager.completeWorld(SinWorld.LUST);
```

#### `handleDeath(): void`

Processes player death. Increments death counters and clears active run.

```typescript
progressionManager.handleDeath();
// Increments worldProgress[currentWorld].deathCount
// Increments totalDeaths
// Sets activeRun to null
```

#### `returnToHub(): void`

Clears active run without counting as death (voluntary exit).

```typescript
progressionManager.returnToHub();
```

---

### Statistics Methods

#### `addEnemiesKilled(count: number): void`

Increments the total enemies killed counter.

```typescript
progressionManager.addEnemiesKilled(1);
```

#### `addGoldEarned(amount: number): void`

Increments the total gold earned counter.

```typescript
progressionManager.addGoldEarned(50);
```

---

### Hub Unlock Methods

#### `unlockHubFeature(feature: string): void`

Manually unlocks a hub feature by name.

```typescript
progressionManager.unlockHubFeature('shop_tier_2');
```

#### `isHubFeatureUnlocked(feature: string): boolean`

Checks if a specific feature is unlocked.

```typescript
if (progressionManager.isHubFeatureUnlocked('fountain_upgrade')) {
  enableFountainUpgrade();
}
```

#### `getAutoUnlocks(): string[]`

Returns features that should be unlocked based on world completion count.

**Unlock Thresholds:**
| Worlds Completed | Feature Unlocked |
|------------------|------------------|
| 1+ | `shop_tier_2` |
| 3+ | `shop_tier_3` |
| 5+ | `fountain_upgrade` |
| 7 | `victory_portal` |

```typescript
const unlocks = progressionManager.getAutoUnlocks();
// With 3 worlds completed: ['shop_tier_2', 'shop_tier_3']
```

---

## Player Leveling API

**Location:** `/src/entities/Player.ts`

The Player class handles XP, leveling, and stat allocation.

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `level` | `number` | `1` | Current player level |
| `xp` | `number` | `0` | Current XP toward next level |
| `xpToNextLevel` | `number` | `100` | XP required for next level |
| `statPoints` | `number` | `0` | Unallocated stat points |
| `hp` | `number` | `100` | Current health |
| `maxHp` | `number` | `100` | Maximum health (base + equipment) |
| `attack` | `number` | `10` | Attack power (base + equipment) |
| `defense` | `number` | `5` | Defense rating (base + equipment) |
| `speed` | `number` | `150` | Movement speed (base + equipment, min 50) |
| `gold` | `number` | `0` | Current gold |

### Methods

#### `gainXP(amount: number): void`

Adds XP and triggers level-ups as needed.

```typescript
player.gainXP(100);
// If this exceeds xpToNextLevel, levelUp() is called
// Multiple levels can be gained from a single call
```

#### `allocateStat(stat: 'hp' | 'attack' | 'defense' | 'speed'): boolean`

Spends one stat point on the chosen stat. Returns false if no points available.

**Stat Gains Per Point:**
| Stat | Gain |
|------|------|
| `hp` | +10 Max HP (also heals 10 HP) |
| `attack` | +2 Attack |
| `defense` | +1 Defense |
| `speed` | +10 Speed |

```typescript
if (player.statPoints > 0) {
  player.allocateStat('attack'); // Adds 2 attack
}
```

#### `recalculateStats(): void`

Recalculates derived stats from base stats + equipment bonuses.

```typescript
player.recalculateStats();
// Updates maxHp, attack, defense, speed from base + equipment
```

#### `getSaveData(): PlayerSaveData`

Returns serializable player state for saving.

```typescript
const saveData = player.getSaveData();
// {
//   level: 5,
//   xp: 234,
//   xpToNext: 505,
//   hp: 85,
//   baseMaxHp: 140,
//   baseAttack: 18,
//   baseDefense: 8,
//   baseSpeed: 170,
//   statPoints: 2,
//   gold: 350
// }
```

#### `restoreFromSave(data: PlayerSaveData): void`

Restores player state from save data.

```typescript
player.restoreFromSave(savedPlayerData);
```

---

## XP and Leveling Formulas

### XP Required Per Level

**Formula:**
```
Level 1 -> 2: 100 XP
Level N -> N+1: floor(previousXP * 1.5)
```

**Implementation:**
```typescript
// In Player.levelUp()
this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);
```

**Progression Table:**

| Level | XP Required | Cumulative XP | Stat Points Earned |
|-------|-------------|---------------|-------------------|
| 1 -> 2 | 100 | 100 | 3 |
| 2 -> 3 | 150 | 250 | 6 |
| 3 -> 4 | 225 | 475 | 9 |
| 4 -> 5 | 337 | 812 | 12 |
| 5 -> 6 | 505 | 1,317 | 15 |
| 6 -> 7 | 757 | 2,074 | 18 |
| 7 -> 8 | 1,135 | 3,209 | 21 |
| 8 -> 9 | 1,702 | 4,911 | 24 |
| 9 -> 10 | 2,553 | 7,464 | 27 |
| 10 -> 11 | 3,829 | 11,293 | 30 |

### Level Up Rewards

On each level up, the player receives:

```typescript
// In Player.levelUp()
this.xp -= this.xpToNextLevel;        // Carry over excess XP
this.level++;                          // Increment level
this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);

this.statPoints += 3;                  // Award 3 stat points
this.baseMaxHp += 5;                   // Automatic +5 HP
this.recalculateStats();               // Update derived stats
this.hp = this.maxHp;                  // Full heal

this.scene.events.emit('playerLevelUp', this);  // Notify UI
```

---

## Stat Growth Calculations

### Base Stats (Level 1)

| Stat | Initial Value | Constant Name |
|------|---------------|---------------|
| Max HP | 100 | `PLAYER_MAX_HP` |
| Attack | 10 | `PLAYER_BASE_ATTACK` |
| Defense | 5 | `PLAYER_BASE_DEFENSE` |
| Speed | 150 | `PLAYER_SPEED` |

**Source:** `/src/utils/constants.ts`

### Stat Allocation Values

```typescript
// In Player.allocateStat()
switch (stat) {
  case 'hp':
    this.baseMaxHp += 10;
    this.hp = Math.min(this.hp + 10, this.maxHp); // Also heals
    break;
  case 'attack':
    this.baseAttack += 2;
    break;
  case 'defense':
    this.baseDefense += 1;
    break;
  case 'speed':
    this.baseSpeed += 10;
    break;
}
```

### Derived Stat Calculation

```typescript
// In Player.recalculateStats()
const equipStats = this.inventory.getEquipmentStats();

this.maxHp = this.baseMaxHp + equipStats.maxHp;
this.attack = this.baseAttack + equipStats.attack;
this.defense = this.baseDefense + equipStats.defense;
this.speed = Math.max(50, this.baseSpeed + equipStats.speed); // Minimum 50

// Clamp current HP to new max
if (this.hp > this.maxHp) {
  this.hp = this.maxHp;
}
```

### Damage Formula

```typescript
// In Player.takeDamage()
const actualDamage = Math.max(1, amount - this.defense);
this.hp -= actualDamage;
```

---

## World Unlock Logic

### World Structure

All 7 worlds are available from the start. Each world contains 3 floors with the sin boss on floor 3.

**World Configuration:** `/src/config/WorldConfig.ts`

```typescript
export enum SinWorld {
  PRIDE = 'pride',
  GREED = 'greed',
  WRATH = 'wrath',
  SLOTH = 'sloth',
  ENVY = 'envy',
  GLUTTONY = 'gluttony',
  LUST = 'lust',
}
```

### Floor Progression Logic

```typescript
// In ProgressionManager.advanceFloor()
advanceFloor(): void {
  if (!this.progression.activeRun) return;

  const { world, floor } = this.progression.activeRun;
  const maxFloors = WORLD_CONFIGS[world].floorCount; // Always 3
  const newFloor = floor + 1;

  if (newFloor > maxFloors) {
    // Floor 3 completed = world complete
    this.completeWorld(world);
  } else {
    // Move to next floor
    this.progression.activeRun.floor = newFloor;
    this.progression.worldProgress[world].currentFloor = newFloor;
  }
}
```

### Hub Feature Auto-Unlock Logic

```typescript
// In ProgressionManager.getAutoUnlocks()
getAutoUnlocks(): string[] {
  const unlocks: string[] = [];
  const completed = this.getCompletedWorldCount();

  if (completed >= 1) unlocks.push('shop_tier_2');
  if (completed >= 3) unlocks.push('shop_tier_3');
  if (completed >= 5) unlocks.push('fountain_upgrade');
  if (completed >= 7) unlocks.push('victory_portal');

  return unlocks;
}
```

### Victory Condition Check

```typescript
// Victory portal appears when:
if (progressionManager.areAllWorldsCompleted()) {
  // All 7 sin bosses defeated
  // getCompletedWorldCount() === 7
}
```

---

## Type Definitions

### WorldProgress

```typescript
export interface WorldProgress {
  started: boolean;      // Has player entered this world
  currentFloor: number;  // 0 = not started, 1-3 = in progress
  completed: boolean;    // Has sin boss been defeated
  deathCount: number;    // Deaths in this world
}
```

### ActiveRun

```typescript
export interface ActiveRun {
  world: SinWorld;  // Which sin world
  floor: number;    // Current floor (1-3)
}
```

### GameProgression

```typescript
export interface GameProgression {
  worldProgress: Record<SinWorld, WorldProgress>;
  activeRun: ActiveRun | null;
  hubUnlocks: string[];
  totalDeaths: number;
  totalEnemiesKilled: number;
  totalGoldEarned: number;
}
```

### PlayerSaveData

```typescript
interface PlayerSaveData {
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
}
```

---

## Usage Examples

### Starting a New World Run

```typescript
import { progressionManager } from '../systems/ProgressionSystem';
import { SinWorld } from '../config/WorldConfig';

// Check if already in a run
if (progressionManager.hasActiveRun()) {
  console.log('Already in a world run!');
  return;
}

// Start the Pride world
progressionManager.startWorld(SinWorld.PRIDE);

// Get current run info
const run = progressionManager.getActiveRun();
console.log(`Started ${run.world} on floor ${run.floor}`);
```

### Handling Level Up UI

```typescript
// In GameScene or similar
this.player.scene.events.on('playerLevelUp', (player: Player) => {
  // Show level up UI
  this.levelUpUI.show();

  // Player now has stat points to allocate
  console.log(`Level ${player.level}! ${player.statPoints} points to spend`);
});

// In LevelUpUI button handler
onStatButtonClick(stat: 'hp' | 'attack' | 'defense' | 'speed') {
  if (this.player.allocateStat(stat)) {
    this.updateDisplay();

    if (this.player.statPoints === 0) {
      this.disableAllButtons();
    }
  }
}
```

### Checking World Completion for UI

```typescript
import { progressionManager } from '../systems/ProgressionSystem';
import { getAllWorlds, SinWorld } from '../config/WorldConfig';

function renderWorldPortals() {
  for (const world of getAllWorlds()) {
    const progress = progressionManager.getWorldProgress(world);

    if (progress.completed) {
      drawCompletedPortal(world);  // Golden glow + checkmark
    } else if (progress.started) {
      drawInProgressPortal(world, progress.currentFloor);
    } else {
      drawDefaultPortal(world);
    }
  }
}
```

### Processing Boss Defeat

```typescript
// When sin boss dies
onBossDefeated(bossWorld: SinWorld) {
  // Complete the world
  progressionManager.completeWorld(bossWorld);

  // Check for new unlocks
  const unlocks = progressionManager.getAutoUnlocks();
  for (const feature of unlocks) {
    if (!progressionManager.isHubFeatureUnlocked(feature)) {
      progressionManager.unlockHubFeature(feature);
      showUnlockNotification(feature);
    }
  }

  // Check for victory
  if (progressionManager.areAllWorldsCompleted()) {
    showVictoryPortal();
  }
}
```

### Saving and Loading Progression

```typescript
import { progressionManager } from '../systems/ProgressionSystem';

// Save
function saveGame() {
  const saveData = {
    progression: progressionManager.getProgression(),
    player: player.getSaveData(),
    // ... other data
  };
  localStorage.setItem('dungeon_crawler_save', JSON.stringify(saveData));
}

// Load
function loadGame() {
  const raw = localStorage.getItem('dungeon_crawler_save');
  if (raw) {
    const saveData = JSON.parse(raw);
    progressionManager.setProgression(saveData.progression);
    player.restoreFromSave(saveData.player);
  }
}
```

---

## Related Files

| Component | Path |
|-----------|------|
| ProgressionManager | `/src/systems/ProgressionSystem.ts` |
| Player Class | `/src/entities/Player.ts` |
| Level Up UI | `/src/ui/LevelUpUI.ts` |
| World Configuration | `/src/config/WorldConfig.ts` |
| Game Constants | `/src/utils/constants.ts` |

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
