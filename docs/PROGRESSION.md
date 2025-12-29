# Progression System

This document details the complete progression mechanics for the dungeon crawler, including experience, leveling, world progression, hub features, save system, death mechanics, and victory conditions.

---

## Table of Contents

1. [Experience and Leveling](#experience-and-leveling)
2. [World Progression](#world-progression)
3. [Hub Progression](#hub-progression)
4. [Save System](#save-system)
5. [Death Mechanics](#death-mechanics)
6. [Statistics Tracked](#statistics-tracked)
7. [Victory Condition](#victory-condition)

---

## Experience and Leveling

### XP Gain from Enemies

XP is awarded upon enemy death. Each enemy type has a base XP value that scales with floor number.

#### Standard Enemies

| Enemy Type | XP Formula | Floor 1 | Floor 2 | Floor 3 |
|------------|------------|---------|---------|---------|
| Basic Enemy (default) | 25 (flat) | 25 | 25 | 25 |
| Fast Enemy | 15 + floor * 3 | 18 | 21 | 24 |
| Tank Enemy | 35 + floor * 8 | 43 | 51 | 59 |
| Ranged Enemy | 30 + floor * 6 | 36 | 42 | 48 |

#### Sin Enemies (World-Specific)

| Enemy Type | XP Formula | Floor 1 | Floor 2 | Floor 3 |
|------------|------------|---------|---------|---------|
| Sloth Enemy | 40 + floor * 8 | 48 | 56 | 64 |
| Gluttony Enemy | 45 + floor * 10 | 55 | 65 | 75 |
| Greed Enemy | 35 + floor * 6 | 41 | 47 | 53 |
| Envy Enemy | 40 + floor * 8 | 48 | 56 | 64 |
| Wrath Enemy | 50 + floor * 10 | 60 | 70 | 80 |
| Lust Enemy | 35 + floor * 6 | 41 | 47 | 53 |
| Pride Enemy | 60 + floor * 12 | 72 | 84 | 96 |

#### Bosses

| Boss Type | XP Formula | Floor 1 | Floor 2 | Floor 3 |
|-----------|------------|---------|---------|---------|
| Generic Boss | 200 + floor * 50 | 250 | 300 | 350 |
| Sin Boss (all types) | 300 + floor * 50 | 350 | 400 | 450 |

### XP Required Per Level

The XP required to level up follows an exponential formula:

```
Level 1 -> 2: 100 XP
Level N -> N+1: Previous requirement * 1.5 (floored)
```

**Progression Table:**

| Level | XP Required | Cumulative XP |
|-------|-------------|---------------|
| 1 -> 2 | 100 | 100 |
| 2 -> 3 | 150 | 250 |
| 3 -> 4 | 225 | 475 |
| 4 -> 5 | 337 | 812 |
| 5 -> 6 | 505 | 1,317 |
| 6 -> 7 | 757 | 2,074 |
| 7 -> 8 | 1,135 | 3,209 |
| 8 -> 9 | 1,702 | 4,911 |
| 9 -> 10 | 2,553 | 7,464 |
| 10 -> 11 | 3,829 | 11,293 |

### Stat Points Per Level

Upon leveling up, the player receives:

- **+3 Stat Points** for manual allocation
- **+5 Base Max HP** (automatic)
- **Full HP Heal** (restored to new max)

### Stat Allocation Options

Players can allocate stat points to any of these four stats:

| Stat | Bonus Per Point | Effect |
|------|-----------------|--------|
| HP | +10 Max HP | Also heals 10 HP when allocated |
| Attack | +2 Attack | Increases damage dealt |
| Defense | +1 Defense | Reduces incoming damage |
| Speed | +10 Speed | Movement speed (min 50) |

**Base Stats (Level 1):**
- Max HP: 100
- Attack: 10
- Defense: 5
- Speed: 150

---

## World Progression

### Structure

The game features **7 worlds** themed around the Seven Deadly Sins, each containing **3 floors**:

| World | Name | Subtitle | Primary Color |
|-------|------|----------|---------------|
| Pride | Tower of Pride | Where the vain ascend | Gold (#FFD700) |
| Greed | Vaults of Greed | Never enough | Green (#22C55E) |
| Wrath | Inferno of Wrath | Burn with fury | Red (#DC2626) |
| Sloth | Mire of Sloth | Time stands still | Gray (#6B7280) |
| Envy | Shadows of Envy | What others have | Dark Green (#16A34A) |
| Gluttony | Pits of Gluttony | Consume everything | Amber (#FBBF24) |
| Lust | Gardens of Lust | Desire without end | Pink (#EC4899) |

### World Unlock Order

All 7 worlds are **unlocked from the start**. Players can tackle them in any order.

### Floor Structure

Each world follows this structure:
- **Floor 1**: Regular enemies + shop after completion
- **Floor 2**: Regular enemies + shop after completion
- **Floor 3**: Sin Boss floor - completing this completes the world

### Boss Completion Tracking

World completion is tracked per-world with the following data:

```typescript
interface WorldProgress {
  started: boolean;      // Has player entered this world
  currentFloor: number;  // 0 = not started, 1-3 = in progress
  completed: boolean;    // Has sin boss been defeated
  deathCount: number;    // Deaths in this world
}
```

### Active Run Tracking

Only one world run can be active at a time:

```typescript
interface ActiveRun {
  world: SinWorld;  // Which sin world
  floor: number;    // Current floor (1-3)
}
```

---

## Hub Progression

### Hub Features

The central hub contains these interactive elements:

| Feature | Location | Function |
|---------|----------|----------|
| Healing Fountain | Center | Full HP restoration (free) |
| Shop NPC | Top-center | Buy items and equipment |
| 7 World Portals | Arranged around hub | Enter sin worlds |
| The Chronicler | Left side | Lore NPC with dialogue |
| Mysterious Figure | Right side | Secret NPC |
| Victory Portal | Center-bottom | Appears when all 7 worlds complete |

### Hub Feature Unlocks

Features unlock based on world completion count:

| Worlds Completed | Unlock |
|------------------|--------|
| 1 | Shop Tier 2 |
| 3 | Shop Tier 3 |
| 5 | Fountain Upgrade |
| 7 | Victory Portal |

### Portal System

Each world has a dedicated portal in the hub:

| World | Portal Position (Tiles) |
|-------|------------------------|
| Pride | (8, 3) |
| Greed | (16, 3) |
| Wrath | (20, 8) |
| Sloth | (4, 14) |
| Envy | (20, 14) |
| Gluttony | (12, 17) |
| Lust | (4, 8) |

**Portal Visual States:**
- **Default**: World-colored glow with orbiting particles
- **Completed**: Golden glow + checkmark indicator

### Shop Availability

The shop is always available in the hub. Between floors (after completing floors 1 and 2), a temporary shop scene appears allowing purchases before the next floor.

---

## Save System

### Save Format Version

Current save version: **2**

Previous version 1 used linear floor progression and is auto-migrated.

### What Gets Saved

```typescript
interface SaveData {
  version: number;           // Save format version
  progression: {
    worldProgress: {         // Per-world completion data
      [world]: WorldProgress
    };
    activeRun: ActiveRun | null;
    hubUnlocks: string[];
    totalDeaths: number;
    totalEnemiesKilled: number;
    totalGoldEarned: number;
  };
  player: {
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
  };
  inventory: {
    items: Item[];
    equipment: Equipment;
  };
  timestamp: number;         // Unix timestamp
}
```

### When Saves Happen

Saves are triggered:

1. **World Entry**: When entering a world portal from the hub
2. **World Completion**: When defeating a sin boss
3. **Death in World Mode**: Before transitioning to game over
4. **Shop Return**: After purchasing from floor shop
5. **Victory Entry**: Before entering the victory portal
6. **Hub Exit**: When pressing ESC to return to menu

### Save Storage

- **Storage Method**: Browser localStorage
- **Storage Key**: `dungeon_crawler_save`
- **Data Format**: JSON string

### Save Migration

When loading a version 1 save:
1. Player stats are preserved
2. Inventory is preserved
3. World progression is reset (new system incompatible)
4. Save is re-written as version 2

---

## Death Mechanics

### What's Lost on Death

**In World Mode (Sin Worlds):**
- Active run progress (floor resets)
- Current floor enemies/room state
- Unsaved floor loot (not yet in permanent inventory)

**Legacy Mode (if applicable):**
- Entire save is deleted
- All progress lost

### What's Preserved on Death

**In World Mode:**
- Player level and XP
- All base stats (HP, Attack, Defense, Speed)
- Unallocated stat points
- Gold
- Inventory and equipment
- World completion status (completed worlds stay complete)
- Total statistics (deaths, kills, gold earned)

### Death Counter

Deaths are tracked at two levels:
- **Per-World**: `worldProgress[world].deathCount`
- **Total**: `progression.totalDeaths`

### Restart Flow

1. Player dies -> `playerDeath` event emitted
2. `progressionManager.handleDeath()` called
3. Save updated with death count
4. Active run cleared
5. Camera fade to black (1 second)
6. Transition to GameOverScene
7. Display run statistics
8. Options: "Return to Hub" or "Main Menu"

---

## Statistics Tracked

### Global Statistics

Tracked in `GameProgression`:

| Statistic | Description | When Updated |
|-----------|-------------|--------------|
| `totalDeaths` | All-time death count | On each death |
| `totalEnemiesKilled` | All-time enemy kills | On enemy death |
| `totalGoldEarned` | All-time gold acquired | On gold pickup |

### Per-Run Statistics

Tracked during gameplay:

| Statistic | Description | Displayed |
|-----------|-------------|-----------|
| `enemiesKilled` | Enemies killed this run | Game Over/Victory |
| `itemsCollected` | Items picked up this run | Game Over/Victory |
| `floor` | Current/final floor | Game Over/Victory |
| `level` | Player level | Game Over/Victory |

### Per-World Statistics

Tracked in `WorldProgress`:

| Statistic | Description |
|-----------|-------------|
| `started` | Whether world has been entered |
| `currentFloor` | Progress within world |
| `completed` | Whether sin boss defeated |
| `deathCount` | Deaths in this specific world |

---

## Victory Condition

### Primary Victory

Complete all 7 sin worlds by defeating each sin boss:

1. Pride Boss
2. Greed Boss
3. Wrath Boss
4. Sloth Boss
5. Envy Boss
6. Gluttony Boss
7. Lust Boss

### Victory Portal

When `progressionManager.areAllWorldsCompleted()` returns true:
- Golden "ASCENSION" portal appears in hub center
- Bright golden glow with pulsing animation
- Labeled with "ASCENSION" text

### Victory Flow

1. Player approaches victory portal
2. Press R to "Ascend to Victory"
3. Save game
4. Screen flash effect (gold)
5. "ASCENDING..." message
6. 2-second delay
7. Transition to VictoryScene

### Victory Scene

Displays:
- "ASCENSION!" title with golden text
- Victory message: "You have conquered all Seven Deadly Sins and purified your soul!"
- List of all 7 sins conquered
- Final statistics box:
  - Floors Conquered (21 total)
  - Final Level
  - Sins Vanquished (enemies killed)
  - Treasures Found (items collected)

### Post-Victory

- Save is **deleted** (game complete)
- Options:
  - "New Journey" - Delete save, return to Hub
  - "Main Menu" - Return to title screen

---

## Formula Reference

### XP to Next Level
```javascript
xpToNextLevel = Math.floor(previousXpToNext * 1.5)
// Starting: 100 XP for level 2
```

### Damage Calculation
```javascript
actualDamage = Math.max(1, attackerDamage - defenderDefense)
```

### Enemy XP (General Pattern)
```javascript
xpValue = baseXP + floor * scalingFactor
```

### Boss Phases
```javascript
if (hp <= maxHp * 0.3) phase = 3;      // Rage mode
else if (hp <= maxHp * 0.6) phase = 2;  // Damaged
else phase = 1;                          // Normal
```

---

## File References

| System | File Location |
|--------|---------------|
| Progression Manager | `/src/systems/ProgressionSystem.ts` |
| Save System | `/src/systems/SaveSystem.ts` |
| Player Stats | `/src/entities/Player.ts` |
| World Config | `/src/config/WorldConfig.ts` |
| Enemy Types | `/src/entities/enemies/EnemyTypes.ts` |
| Sin Bosses | `/src/entities/enemies/SinBosses.ts` |
| Hub Scene | `/src/scenes/HubScene.ts` |
| Game Over Scene | `/src/scenes/GameOverScene.ts` |
| Victory Scene | `/src/scenes/VictoryScene.ts` |
