# Major Codebase Refactoring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the codebase from "coded by a 2 year old" to professional, maintainable code with proper documentation, smaller files, and robust multiplayer.

**Architecture:** Extract God classes into focused modules, add comprehensive JSDoc documentation, fix multiplayer memory leaks and validation issues, and establish testing infrastructure.

**Tech Stack:** TypeScript, Phaser 3, Trystero (WebRTC), Vite

---

## Phase 1: Documentation (Days 1-2)

### Task 1.1: Create Architecture Documentation

**Files:**
- Create: `docs/ARCHITECTURE.md`

**Step 1: Write architecture overview**

```markdown
# Infernal Ascent - Architecture Overview

## Project Structure

```
src/
├── scenes/           # Phaser scenes (game states)
│   ├── BootScene.ts      # Asset loading and placeholder generation
│   ├── MenuScene.ts      # Main menu with animations
│   ├── GameScene.ts      # Core dungeon gameplay
│   ├── HubScene.ts       # Central hub with world portals
│   ├── ShopScene.ts      # Between-floor shop
│   ├── GameOverScene.ts  # Death screen
│   └── VictoryScene.ts   # Win screen
│
├── entities/         # Game objects with behavior
│   ├── Player.ts         # Player character with stats, inventory
│   ├── Enemy.ts          # Base enemy class
│   ├── NPC.ts            # Non-player characters
│   └── enemies/          # Enemy type implementations
│       ├── EnemyTypes.ts     # Standard enemies (Fast, Tank, Ranged, etc.)
│       └── SinBosses.ts      # 7 unique sin bosses
│
├── systems/          # Core game logic (decoupled from scenes)
│   ├── CombatSystem.ts       # Damage calculation, crits, defense
│   ├── LootSystem.ts         # Item drop generation
│   ├── SaveSystem.ts         # LocalStorage persistence
│   ├── ProgressionSystem.ts  # World completion tracking
│   ├── InventorySystem.ts    # Item management, equipment
│   ├── DungeonGenerator.ts   # Procedural room generation
│   ├── RoomManager.ts        # Room state and activation
│   ├── LightingSystem.ts     # Dynamic lighting with Light2D
│   ├── AudioSystem.ts        # Music and SFX management
│   ├── HazardSystem.ts       # Traps and environmental damage
│   └── EnemySpawnManager.ts  # Enemy wave spawning
│
├── ui/               # User interface components
│   ├── GameHUD.ts        # In-game health, XP, stats display
│   ├── InventoryUI.ts    # Inventory grid and tooltips
│   ├── ShopUI.ts         # Shop item display and purchase
│   ├── DialogueUI.ts     # NPC conversation display
│   ├── LevelUpUI.ts      # Stat allocation on level up
│   ├── SettingsUI.ts     # Audio, controls settings
│   └── LoreUIManager.ts  # Lore item display modals
│
├── multiplayer/      # P2P networking
│   ├── NetworkManager.ts     # Connection management, room codes
│   ├── HostController.ts     # Server-side game state sync
│   └── GuestController.ts    # Client-side state reception
│
├── config/           # Game configuration
│   └── WorldConfig.ts    # 7 sin worlds with themes, enemies, bosses
│
└── utils/            # Shared utilities
    └── constants.ts      # TILE_SIZE, colors, etc.
```

## Key Patterns

### 1. Scene Management
All scenes extend Phaser.Scene. Scenes manage their own lifecycle:
- `preload()` - Load assets (usually delegated to BootScene)
- `create()` - Initialize game objects
- `update()` - Frame-by-frame logic
- `shutdown()` - Cleanup event listeners, destroy objects

### 2. Manager Pattern
Complex functionality extracted into manager classes:
- `EnemySpawnManager` - Handles enemy creation and health bars
- `RoomDecorationManager` - Places props and decorations
- `LootDropManager` - Spawns and manages item drops
- `VisualEffectsManager` - Camera shake, damage numbers

### 3. Event-Driven Communication
Scenes and systems communicate via Phaser events:
```typescript
// Emit
this.scene.events.emit('playerLevelUp', player);

// Listen
this.scene.events.on('playerLevelUp', (player) => { ... });

// Cleanup in shutdown()
this.scene.events.off('playerLevelUp');
```

### 4. Singleton Systems
Global systems use singleton pattern:
```typescript
// NetworkManager
export const networkManager = NetworkManager.getInstance();

// ProgressionManager
export const progressionManager = ProgressionManager.getInstance();
```

## Data Flow

### Save/Load Flow
```
Player Action → SaveSystem.save() → localStorage
Game Start → SaveSystem.load() → Player.restoreFromSave()
```

### Multiplayer Flow
```
Host: Player Input → Game State Change → HostController.broadcast()
        ↓
Network: Trystero WebRTC P2P
        ↓
Guest: NetworkManager.onMessage() → GuestController.handle() → Update Visuals
```

### Combat Flow
```
Player Attack → CombatSystem.calculateDamage(attacker, target)
             → Apply buffs, equipment bonuses
             → Roll crit chance
             → Apply defense reduction
             → Return { damage, isCrit, blocked }
             → target.takeDamage(damage)
             → Emit 'enemyKilled' if HP <= 0
```

## World Configuration

Each sin world defines:
- `name`: Display name (e.g., "Pride")
- `color`: Theme color (0xffd700 for gold)
- `floorCount`: Number of floors (3)
- `enemies`: Array of enemy types for that world
- `bossClass`: The sin boss constructor
- `hazards`: Environmental hazards
- `music`: Background music key

## Adding New Features

### Adding a New Enemy Type
1. Create class in `src/entities/enemies/EnemyTypes.ts`
2. Extend `Enemy` base class
3. Override `update()` for custom AI
4. Add to `ENEMY_TYPES` in `WorldConfig.ts`
5. Create placeholder sprite in `BootScene.ts`

### Adding a New World
1. Add entry to `WORLD_CONFIGS` in `WorldConfig.ts`
2. Create boss class in `SinBosses.ts`
3. Add floor/wall textures in `BootScene.ts`
4. Portal automatically appears in HubScene

### Adding a New Item
1. Add template to `ITEM_TEMPLATES` in `Item.ts`
2. Or use `generateProceduralItem()` for random generation
```

**Step 2: Commit documentation**

```bash
git add docs/ARCHITECTURE.md
git commit -m "docs: add comprehensive architecture documentation"
```

---

### Task 1.2: Create Contributing Guide

**Files:**
- Create: `docs/CONTRIBUTING.md`

**Step 1: Write contributing guide**

```markdown
# Contributing to Infernal Ascent

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit
```

## Code Style

### File Organization
- Keep files under 500 lines
- One class per file (except related small classes)
- Group imports: Phaser, then local modules

### Naming Conventions
- Classes: PascalCase (`EnemySpawnManager`)
- Methods/variables: camelCase (`spawnEnemy`)
- Constants: UPPER_SNAKE_CASE (`TILE_SIZE`)
- Files: PascalCase for classes, camelCase for utilities

### TypeScript
- Always add type annotations to function parameters
- Use `interface` for object shapes, `type` for unions
- Avoid `any` - use `unknown` and type guards instead

### Documentation
- Add JSDoc to all public methods
- Include `@param` and `@returns` tags
- Add `@example` for complex usage

```typescript
/**
 * Calculates damage dealt from attacker to target.
 * Applies equipment bonuses, critical hits, and defense.
 *
 * @param attacker - The entity dealing damage
 * @param target - The entity receiving damage
 * @returns Damage result with amount, crit status, and blocked status
 *
 * @example
 * const result = combatSystem.calculateDamage(player, enemy);
 * if (result.isCrit) showCritEffect();
 * target.takeDamage(result.damage);
 */
calculateDamage(attacker: Entity, target: Entity): DamageResult {
  // ...
}
```

## Testing

Run tests with:
```bash
npm test
```

Write tests for:
- Pure functions (damage calculations, loot generation)
- State transitions (save/load, progression)
- Edge cases (empty inventory, max stats)

## Commit Messages

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `refactor:` Code change that neither fixes nor adds
- `test:` Adding or updating tests
- `chore:` Build process, dependencies

## Pull Request Process

1. Create feature branch from `main`
2. Make changes with atomic commits
3. Ensure `npm run build` passes
4. Update documentation if needed
5. Request review
```

**Step 2: Commit**

```bash
git add docs/CONTRIBUTING.md
git commit -m "docs: add contributing guide with code style and conventions"
```

---

### Task 1.3: Create API Reference for Core Systems

**Files:**
- Create: `docs/API.md`

**Step 1: Write API reference**

```markdown
# API Reference

## CombatSystem

### `calculateDamage(attacker, target): DamageResult`
Calculate damage from one entity to another.

**Parameters:**
- `attacker: Entity` - Entity dealing damage
- `target: Entity` - Entity receiving damage

**Returns:** `{ damage: number, isCrit: boolean, blocked: boolean }`

---

## SaveSystem

### `save(progression, playerData, inventory): boolean`
Save game state to localStorage.

### `load(): SaveData | null`
Load saved game or return null if none exists.

### `hasSave(): boolean`
Check if a save exists.

### `deleteSave(): void`
Remove saved game.

---

## ProgressionSystem

### `progressionManager.startWorld(world, floor?): void`
Begin a run in the specified sin world.

### `progressionManager.advanceFloor(): void`
Move to next floor. Completes world if on final floor.

### `progressionManager.completeWorld(world): void`
Mark world as completed.

### `progressionManager.handleDeath(): void`
Record death, clear active run.

---

## NetworkManager

### `networkManager.hostGame(): Promise<string>`
Create a new multiplayer room. Returns room code.

### `networkManager.joinGame(roomCode): Promise<void>`
Join existing room by code.

### `networkManager.disconnect(): void`
Leave current room.

### `networkManager.send(message): void`
Send message to all peers.

### `networkManager.onMessage(callback): void`
Register message handler.

---

## LootSystem

### `generateLoot(floor): Item | null`
Generate random loot based on floor level and drop chance.

### `generateGuaranteedLoot(minRarity): Item`
Generate loot with guaranteed drop and minimum rarity.

---

## InventorySystem

### `addItem(item): boolean`
Add item to inventory. Returns false if full.

### `removeItem(itemId): Item | null`
Remove and return item by ID.

### `equipItem(item): Item | null`
Equip item, return previously equipped item.

### `getEquipmentStats(): ItemStats`
Get combined stats from all equipped items.
```

**Step 2: Commit**

```bash
git add docs/API.md
git commit -m "docs: add API reference for core systems"
```

---

## Phase 2: Split Large Files (Days 3-7)

### Task 2.1: Extract BootScene Asset Generation

**Files:**
- Create: `src/systems/AssetGenerator.ts`
- Modify: `src/scenes/BootScene.ts`

**Step 1: Create AssetGenerator class**

Create `src/systems/AssetGenerator.ts`:

```typescript
/**
 * Generates placeholder pixel art assets for the game.
 * Used when actual sprite assets aren't available.
 */
import Phaser from 'phaser';
import { RARITY_COLORS, ItemRarity } from './Item';
import { WORLD_CONFIGS, SinWorld } from '../config/WorldConfig';

export class AssetGenerator {
  private scene: Phaser.Scene;
  private readonly TILE_SIZE = 16;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Generate all placeholder assets for the game.
   * Call this in BootScene.create() after preload.
   */
  generateAll(): void {
    this.generatePlayerAssets();
    this.generateEnemyAssets();
    this.generateItemAssets();
    this.generateWeaponAssets();
    this.generateHazardAssets();
    this.generateUIAssets();
    this.generateWorldAssets();
  }

  /**
   * Generate player character sprites.
   */
  private generatePlayerAssets(): void {
    // Player idle sprite
    const playerGraphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Body
    playerGraphics.fillStyle(0x4a90d9);
    playerGraphics.fillRect(4, 4, 8, 10);

    // Head
    playerGraphics.fillStyle(0xffdbac);
    playerGraphics.fillRect(5, 1, 6, 5);

    // Eyes
    playerGraphics.fillStyle(0x000000);
    playerGraphics.fillRect(6, 2, 1, 1);
    playerGraphics.fillRect(9, 2, 1, 1);

    // Feet
    playerGraphics.fillStyle(0x8b4513);
    playerGraphics.fillRect(4, 14, 3, 2);
    playerGraphics.fillRect(9, 14, 3, 2);

    playerGraphics.generateTexture('player_idle', this.TILE_SIZE, this.TILE_SIZE);
    playerGraphics.destroy();

    // Player torch light
    this.generateTorchAsset();
  }

  /**
   * Generate torch/light source asset.
   */
  private generateTorchAsset(): void {
    const torchGraphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Torch handle
    torchGraphics.fillStyle(0x8b4513);
    torchGraphics.fillRect(6, 8, 4, 8);

    // Flame
    torchGraphics.fillStyle(0xff6600);
    torchGraphics.fillTriangle(8, 0, 4, 8, 12, 8);
    torchGraphics.fillStyle(0xffff00);
    torchGraphics.fillTriangle(8, 2, 5, 7, 11, 7);

    torchGraphics.generateTexture('torch', this.TILE_SIZE, this.TILE_SIZE);
    torchGraphics.destroy();
  }

  /**
   * Generate enemy sprites for all enemy types.
   */
  private generateEnemyAssets(): void {
    // Standard enemy
    this.generateEnemySprite('enemy', 0xcc3333, 0x991111);

    // Fast enemy (imp)
    this.generateEnemySprite('imp_idle', 0xff6644, 0xcc4422);

    // Tank enemy
    this.generateEnemySprite('tank_idle', 0x666666, 0x444444, 1.3);

    // Ranged enemy
    this.generateEnemySprite('ranged_idle', 0x9933cc, 0x662299);

    // Boss enemy
    this.generateEnemySprite('boss', 0xff0000, 0xaa0000, 1.5);

    // Sin enemy variants
    const sins = ['pride', 'greed', 'wrath', 'sloth', 'envy', 'gluttony', 'lust'];
    const sinColors = [0xffd700, 0x22c55e, 0xef4444, 0x6b7280, 0x10b981, 0xf59e0b, 0xec4899];

    sins.forEach((sin, i) => {
      this.generateEnemySprite(`${sin}_idle`, sinColors[i], sinColors[i] - 0x222222);
    });

    // Enemy projectile
    this.generateProjectileAsset();
  }

  /**
   * Generate a single enemy sprite.
   */
  private generateEnemySprite(key: string, bodyColor: number, shadowColor: number, scale: number = 1): void {
    const size = Math.floor(this.TILE_SIZE * scale);
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Shadow
    graphics.fillStyle(shadowColor);
    graphics.fillEllipse(size / 2, size - 2, size * 0.8, 4);

    // Body
    graphics.fillStyle(bodyColor);
    graphics.fillCircle(size / 2, size / 2, size * 0.35);

    // Eyes
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(size * 0.35, size * 0.4, 2);
    graphics.fillCircle(size * 0.65, size * 0.4, 2);

    graphics.fillStyle(0x000000);
    graphics.fillCircle(size * 0.35, size * 0.4, 1);
    graphics.fillCircle(size * 0.65, size * 0.4, 1);

    graphics.generateTexture(key, size, size);
    graphics.destroy();
  }

  /**
   * Generate projectile asset for enemies.
   */
  private generateProjectileAsset(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0xff00ff);
    graphics.fillCircle(4, 4, 3);
    graphics.fillStyle(0xffffff);
    graphics.fillCircle(3, 3, 1);

    graphics.generateTexture('enemy_projectile', 8, 8);
    graphics.destroy();
  }

  /**
   * Generate item sprites for all rarities.
   */
  private generateItemAssets(): void {
    // Generate for each rarity
    const rarities: ItemRarity[] = [
      ItemRarity.COMMON,
      ItemRarity.UNCOMMON,
      ItemRarity.RARE,
      ItemRarity.EPIC,
      ItemRarity.LEGENDARY
    ];

    rarities.forEach(rarity => {
      const color = RARITY_COLORS[rarity];
      this.generateItemSprite(`armor_${rarity}`, color, 'armor');
      this.generateItemSprite(`accessory_${rarity}`, color, 'ring');
    });

    // Potions
    this.generatePotionSprite('health_potion', 0xff4444);
    this.generatePotionSprite('large_health_potion', 0xff0000);

    // Coin
    this.generateCoinSprite();

    // Chest
    this.generateChestSprite();
  }

  /**
   * Generate item sprite by type.
   */
  private generateItemSprite(key: string, color: number, type: 'armor' | 'ring'): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    if (type === 'armor') {
      // Armor shape
      graphics.fillStyle(color);
      graphics.fillRect(4, 2, 8, 10);
      graphics.fillRect(2, 4, 4, 6);
      graphics.fillRect(10, 4, 4, 6);

      // Highlight
      graphics.fillStyle(0xffffff, 0.3);
      graphics.fillRect(5, 3, 2, 4);
    } else {
      // Ring shape
      graphics.lineStyle(2, color);
      graphics.strokeCircle(8, 8, 5);

      // Gem
      graphics.fillStyle(0xffffff);
      graphics.fillCircle(8, 4, 2);
    }

    graphics.generateTexture(key, this.TILE_SIZE, this.TILE_SIZE);
    graphics.destroy();
  }

  /**
   * Generate potion sprite.
   */
  private generatePotionSprite(key: string, color: number): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Bottle
    graphics.fillStyle(0x88ccff, 0.5);
    graphics.fillRect(5, 4, 6, 10);

    // Liquid
    graphics.fillStyle(color);
    graphics.fillRect(6, 7, 4, 6);

    // Cork
    graphics.fillStyle(0x8b4513);
    graphics.fillRect(6, 2, 4, 3);

    graphics.generateTexture(key, this.TILE_SIZE, this.TILE_SIZE);
    graphics.destroy();
  }

  /**
   * Generate coin sprite for gold drops.
   */
  private generateCoinSprite(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    graphics.fillStyle(0xffd700);
    graphics.fillCircle(8, 8, 6);

    graphics.fillStyle(0xffec8b);
    graphics.fillCircle(7, 7, 4);

    graphics.fillStyle(0xffd700);
    graphics.fillRect(6, 5, 4, 6);

    graphics.generateTexture('coin', this.TILE_SIZE, this.TILE_SIZE);
    graphics.destroy();
  }

  /**
   * Generate treasure chest sprite.
   */
  private generateChestSprite(): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Chest body
    graphics.fillStyle(0x8b4513);
    graphics.fillRect(2, 6, 12, 8);

    // Lid
    graphics.fillStyle(0xa0522d);
    graphics.fillRect(2, 4, 12, 4);

    // Lock
    graphics.fillStyle(0xffd700);
    graphics.fillRect(7, 7, 2, 3);

    graphics.generateTexture('chest', this.TILE_SIZE, this.TILE_SIZE);
    graphics.destroy();
  }

  /**
   * Generate weapon sprites.
   */
  private generateWeaponAssets(): void {
    // Sword
    this.generateWeaponSprite('sword', (g) => {
      g.fillStyle(0xcccccc);
      g.fillRect(7, 2, 2, 10);
      g.fillStyle(0x8b4513);
      g.fillRect(5, 11, 6, 2);
      g.fillRect(7, 13, 2, 2);
    });

    // Axe
    this.generateWeaponSprite('axe', (g) => {
      g.fillStyle(0x8b4513);
      g.fillRect(7, 6, 2, 10);
      g.fillStyle(0xcccccc);
      g.fillRect(3, 2, 6, 6);
    });

    // Spear
    this.generateWeaponSprite('spear', (g) => {
      g.fillStyle(0x8b4513);
      g.fillRect(7, 4, 2, 12);
      g.fillStyle(0xcccccc);
      g.fillTriangle(8, 0, 5, 5, 11, 5);
    });

    // Staff
    this.generateWeaponSprite('staff', (g) => {
      g.fillStyle(0x8b4513);
      g.fillRect(7, 3, 2, 13);
      g.fillStyle(0x9933ff);
      g.fillCircle(8, 3, 3);
    });

    // Dagger
    this.generateWeaponSprite('dagger', (g) => {
      g.fillStyle(0xcccccc);
      g.fillRect(7, 4, 2, 6);
      g.fillStyle(0x8b4513);
      g.fillRect(6, 10, 4, 2);
    });
  }

  /**
   * Generate a weapon sprite with custom drawing callback.
   */
  private generateWeaponSprite(key: string, draw: (g: Phaser.GameObjects.Graphics) => void): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });
    draw(graphics);
    graphics.generateTexture(key, this.TILE_SIZE, this.TILE_SIZE);
    graphics.destroy();
  }

  /**
   * Generate hazard sprites (spikes, lava, arrows).
   */
  private generateHazardAssets(): void {
    // Spike trap
    const spikeGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    spikeGraphics.fillStyle(0x666666);
    for (let i = 0; i < 4; i++) {
      spikeGraphics.fillTriangle(
        2 + i * 4, 16,
        4 + i * 4, 8,
        6 + i * 4, 16
      );
    }
    spikeGraphics.generateTexture('spike_trap', this.TILE_SIZE, this.TILE_SIZE);
    spikeGraphics.destroy();

    // Lava
    const lavaGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    lavaGraphics.fillStyle(0xff4400);
    lavaGraphics.fillRect(0, 0, 16, 16);
    lavaGraphics.fillStyle(0xff6600);
    lavaGraphics.fillRect(2, 2, 4, 4);
    lavaGraphics.fillRect(10, 8, 4, 4);
    lavaGraphics.generateTexture('lava', this.TILE_SIZE, this.TILE_SIZE);
    lavaGraphics.destroy();

    // Arrow
    const arrowGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    arrowGraphics.fillStyle(0x8b4513);
    arrowGraphics.fillRect(2, 7, 10, 2);
    arrowGraphics.fillStyle(0xcccccc);
    arrowGraphics.fillTriangle(12, 8, 16, 6, 16, 10);
    arrowGraphics.generateTexture('arrow', this.TILE_SIZE, this.TILE_SIZE);
    arrowGraphics.destroy();
  }

  /**
   * Generate UI element sprites.
   */
  private generateUIAssets(): void {
    // Minimap room indicator
    const minimapGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    minimapGraphics.fillStyle(0x444444);
    minimapGraphics.fillRect(0, 0, 8, 8);
    minimapGraphics.lineStyle(1, 0x666666);
    minimapGraphics.strokeRect(0, 0, 8, 8);
    minimapGraphics.generateTexture('minimap_room', 8, 8);
    minimapGraphics.destroy();

    // Interaction indicator
    const indicatorGraphics = this.scene.make.graphics({ x: 0, y: 0 });
    indicatorGraphics.fillStyle(0xffff00);
    indicatorGraphics.fillTriangle(8, 0, 0, 16, 16, 16);
    indicatorGraphics.generateTexture('interact_indicator', 16, 16);
    indicatorGraphics.destroy();
  }

  /**
   * Generate floor and wall textures for each sin world.
   */
  private generateWorldAssets(): void {
    for (const [worldKey, config] of Object.entries(WORLD_CONFIGS)) {
      const world = worldKey as SinWorld;
      this.generateFloorTexture(world, config.color);
      this.generateWallTexture(world, config.color);
    }

    // Default/hub textures
    this.generateFloorTexture('default' as SinWorld, 0x4a4a4a);
    this.generateWallTexture('default' as SinWorld, 0x2a2a2a);
  }

  /**
   * Generate floor tile for a world.
   */
  private generateFloorTexture(world: SinWorld | 'default', baseColor: number): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Base floor
    graphics.fillStyle(baseColor);
    graphics.fillRect(0, 0, 16, 16);

    // Slight variation for texture
    graphics.fillStyle(baseColor + 0x111111, 0.5);
    graphics.fillRect(0, 0, 8, 8);
    graphics.fillRect(8, 8, 8, 8);

    // Grid lines
    graphics.lineStyle(1, 0x000000, 0.2);
    graphics.strokeRect(0, 0, 16, 16);

    graphics.generateTexture(`${world}_floor`, 16, 16);
    graphics.destroy();
  }

  /**
   * Generate wall tile for a world.
   */
  private generateWallTexture(world: SinWorld | 'default', baseColor: number): void {
    const graphics = this.scene.make.graphics({ x: 0, y: 0 });

    // Darker wall color
    const wallColor = baseColor - 0x222222;
    graphics.fillStyle(wallColor);
    graphics.fillRect(0, 0, 16, 16);

    // Brick pattern
    graphics.lineStyle(1, 0x000000, 0.3);
    graphics.strokeRect(0, 0, 16, 8);
    graphics.strokeRect(0, 8, 16, 8);
    graphics.beginPath();
    graphics.moveTo(8, 0);
    graphics.lineTo(8, 8);
    graphics.moveTo(0, 8);
    graphics.lineTo(0, 16);
    graphics.moveTo(16, 8);
    graphics.lineTo(16, 16);
    graphics.strokePath();

    graphics.generateTexture(`${world}_wall`, 16, 16);
    graphics.destroy();
  }
}
```

**Step 2: Update BootScene to use AssetGenerator**

Modify `src/scenes/BootScene.ts` - replace the massive `createPlaceholderAssets()` method:

```typescript
// At top of file, add import
import { AssetGenerator } from '../systems/AssetGenerator';

// In create() method, replace createPlaceholderAssets() call with:
const assetGenerator = new AssetGenerator(this);
assetGenerator.generateAll();
```

**Step 3: Remove old code from BootScene**

Delete the following methods from BootScene.ts (approximately lines 257-1324):
- `createPlaceholderAssets()`
- All the individual asset creation code

**Step 4: Verify build passes**

```bash
npm run build
```

**Step 5: Commit**

```bash
git add src/systems/AssetGenerator.ts src/scenes/BootScene.ts
git commit -m "refactor: extract AssetGenerator from BootScene (saves ~1000 lines)"
```

---

### Task 2.2: Split GameScene into Modules

**Files:**
- Create: `src/scenes/game/GameSceneInit.ts`
- Create: `src/scenes/game/GameSceneInput.ts`
- Create: `src/scenes/game/GameSceneCollisions.ts`
- Create: `src/scenes/game/GameSceneEvents.ts`
- Modify: `src/scenes/GameScene.ts`

**Step 1: Create GameSceneInit module**

Create `src/scenes/game/GameSceneInit.ts`:

```typescript
/**
 * Initialization logic for GameScene.
 * Handles dungeon generation, player creation, and system setup.
 */
import Phaser from 'phaser';
import { Player } from '../../entities/Player';
import { DungeonGenerator, DungeonData } from '../../systems/DungeonGenerator';
import { RoomManager } from '../../systems/RoomManager';
import { EnemySpawnManager } from '../../systems/EnemySpawnManager';
import { LootDropManager } from '../../systems/LootDropManager';
import { HazardSystem } from '../../systems/HazardSystem';
import { LightingSystem } from '../../systems/LightingSystem';
import { CombatSystem } from '../../systems/CombatSystem';
import { LootSystem } from '../../systems/LootSystem';
import { networkManager } from '../../multiplayer/NetworkManager';
import { DUNGEON_WIDTH, DUNGEON_HEIGHT, TILE_SIZE } from '../../utils/constants';
import { SinWorld } from '../../config/WorldConfig';

export interface GameSceneSystems {
  player: Player;
  dungeon: DungeonData;
  dungeonGenerator: DungeonGenerator;
  roomManager: RoomManager;
  enemySpawnManager: EnemySpawnManager;
  lootDropManager: LootDropManager;
  hazardSystem: HazardSystem;
  lightingSystem: LightingSystem;
  combatSystem: CombatSystem;
  lootSystem: LootSystem;
}

/**
 * Initialize all game systems for GameScene.
 *
 * @param scene - The GameScene instance
 * @param floor - Current floor number
 * @param currentWorld - Current sin world or null for legacy mode
 * @returns Initialized systems object
 */
export function initializeSystems(
  scene: Phaser.Scene,
  floor: number,
  currentWorld: SinWorld | null
): GameSceneSystems {
  // Combat and loot systems
  const combatSystem = new CombatSystem(scene);
  const lootSystem = new LootSystem(0.5);

  // Generate dungeon with optional multiplayer seed
  const dungeonSeed = networkManager.isMultiplayer ? networkManager.roomCode : undefined;
  const dungeonGenerator = new DungeonGenerator(DUNGEON_WIDTH, DUNGEON_HEIGHT, dungeonSeed);
  const dungeon = dungeonGenerator.generate();

  // Set world bounds
  scene.physics.world.setBounds(0, 0, DUNGEON_WIDTH * TILE_SIZE, DUNGEON_HEIGHT * TILE_SIZE);

  // Find spawn room for player placement
  const spawnRoom = dungeon.rooms.find(r => r.type === 'start') || dungeon.rooms[0];
  const spawnX = (spawnRoom.x + spawnRoom.width / 2) * TILE_SIZE;
  const spawnY = (spawnRoom.y + spawnRoom.height / 2) * TILE_SIZE;

  // Create player
  const player = new Player(scene, spawnX, spawnY);
  scene.physics.add.existing(player);

  // Create room manager
  const roomManager = new RoomManager(scene, dungeon, player);

  // Create enemy spawn manager
  const enemySpawnManager = new EnemySpawnManager(
    scene,
    dungeon,
    player,
    floor,
    currentWorld,
    roomManager
  );

  // Create loot drop manager
  const lootDropManager = new LootDropManager(scene, player, lootSystem);

  // Create hazard system
  const hazardSystem = new HazardSystem(scene, player, floor);
  hazardSystem.setRoomManager(roomManager);

  // Create lighting system
  const lightingSystem = new LightingSystem(scene, dungeon, currentWorld);

  return {
    player,
    dungeon,
    dungeonGenerator,
    roomManager,
    enemySpawnManager,
    lootDropManager,
    hazardSystem,
    lightingSystem,
    combatSystem,
    lootSystem,
  };
}

/**
 * Create dungeon tiles from generated dungeon data.
 */
export function createDungeonTiles(
  scene: Phaser.Scene,
  dungeon: DungeonData,
  currentWorld: SinWorld | null
): { walls: Phaser.Physics.Arcade.StaticGroup; floors: Phaser.GameObjects.Group } {
  const walls = scene.physics.add.staticGroup();
  const floors = scene.add.group();

  const floorKey = currentWorld ? `${currentWorld}_floor` : 'default_floor';
  const wallKey = currentWorld ? `${currentWorld}_wall` : 'default_wall';

  for (let y = 0; y < dungeon.height; y++) {
    for (let x = 0; x < dungeon.width; x++) {
      const tile = dungeon.tiles[y][x];
      const worldX = x * TILE_SIZE + TILE_SIZE / 2;
      const worldY = y * TILE_SIZE + TILE_SIZE / 2;

      if (tile === 1) {
        // Wall
        const wall = walls.create(worldX, worldY, wallKey);
        wall.setImmovable(true);
        wall.body.setSize(TILE_SIZE, TILE_SIZE);
      } else if (tile === 0) {
        // Floor
        const floor = scene.add.image(worldX, worldY, floorKey);
        floor.setDepth(-1);
        floors.add(floor);
      }
    }
  }

  return { walls, floors };
}
```

**Step 2: Create GameSceneInput module**

Create `src/scenes/game/GameSceneInput.ts`:

```typescript
/**
 * Input handling for GameScene.
 * Manages keyboard controls and interaction keys.
 */
import Phaser from 'phaser';
import { Player } from '../../entities/Player';

export interface InputState {
  cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  wasd: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  interact: Phaser.Input.Keyboard.Key;
  inventory: Phaser.Input.Keyboard.Key;
  attack: Phaser.Input.Keyboard.Key;
}

/**
 * Set up keyboard input handlers.
 */
export function setupInput(scene: Phaser.Scene): InputState {
  const keyboard = scene.input.keyboard!;

  return {
    cursors: keyboard.createCursorKeys(),
    wasd: {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    },
    interact: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    inventory: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.I),
    attack: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
  };
}

/**
 * Process player movement from input state.
 */
export function processMovement(
  player: Player,
  input: InputState,
  isMovementEnabled: boolean
): void {
  if (!isMovementEnabled) {
    player.setVelocity(0, 0);
    return;
  }

  let velocityX = 0;
  let velocityY = 0;

  // Horizontal movement
  if (input.cursors.left.isDown || input.wasd.A.isDown) {
    velocityX = -1;
  } else if (input.cursors.right.isDown || input.wasd.D.isDown) {
    velocityX = 1;
  }

  // Vertical movement
  if (input.cursors.up.isDown || input.wasd.W.isDown) {
    velocityY = -1;
  } else if (input.cursors.down.isDown || input.wasd.S.isDown) {
    velocityY = 1;
  }

  // Normalize diagonal movement
  if (velocityX !== 0 && velocityY !== 0) {
    const normalizer = 1 / Math.sqrt(2);
    velocityX *= normalizer;
    velocityY *= normalizer;
  }

  // Apply velocity
  player.setVelocity(velocityX * player.speed, velocityY * player.speed);

  // Update animation
  player.updateAnimation(velocityX, velocityY);
}

/**
 * Register keyboard event handlers.
 */
export function registerKeyboardHandlers(
  scene: Phaser.Scene,
  handlers: {
    onInteract?: () => void;
    onInventory?: () => void;
    onEscape?: () => void;
    onDebug?: () => void;
  }
): void {
  const keyboard = scene.input.keyboard!;

  if (handlers.onInteract) {
    keyboard.on('keydown-E', handlers.onInteract);
  }
  if (handlers.onInventory) {
    keyboard.on('keydown-I', handlers.onInventory);
  }
  if (handlers.onEscape) {
    keyboard.on('keydown-ESC', handlers.onEscape);
  }
  if (handlers.onDebug) {
    keyboard.on('keydown-F1', handlers.onDebug);
  }
}

/**
 * Clean up keyboard handlers on scene shutdown.
 */
export function cleanupInput(scene: Phaser.Scene): void {
  const keyboard = scene.input.keyboard;
  if (keyboard) {
    keyboard.off('keydown-E');
    keyboard.off('keydown-I');
    keyboard.off('keydown-ESC');
    keyboard.off('keydown-F1');
  }
}
```

**Step 3: Create GameSceneCollisions module**

Create `src/scenes/game/GameSceneCollisions.ts`:

```typescript
/**
 * Physics collision setup for GameScene.
 * Configures all collision and overlap handlers.
 */
import Phaser from 'phaser';
import { Player } from '../../entities/Player';
import { Enemy } from '../../entities/Enemy';
import { CombatSystem } from '../../systems/CombatSystem';

export interface CollisionGroups {
  walls: Phaser.Physics.Arcade.StaticGroup;
  enemies: Phaser.Physics.Arcade.Group;
  playerProjectiles: Phaser.Physics.Arcade.Group;
  enemyProjectiles: Phaser.Physics.Arcade.Group;
  loot: Phaser.Physics.Arcade.Group;
  hazards: Phaser.Physics.Arcade.Group;
}

/**
 * Set up all physics collisions and overlaps.
 */
export function setupCollisions(
  scene: Phaser.Scene,
  player: Player,
  groups: CollisionGroups,
  combatSystem: CombatSystem
): void {
  // Player collides with walls
  scene.physics.add.collider(player, groups.walls);

  // Enemies collide with walls
  scene.physics.add.collider(groups.enemies, groups.walls);

  // Enemies don't overlap each other (optional separation)
  scene.physics.add.collider(groups.enemies, groups.enemies);

  // Player attacks hit enemies
  scene.physics.add.overlap(
    groups.playerProjectiles,
    groups.enemies,
    (projectile, enemy) => handlePlayerHitEnemy(
      scene,
      projectile as Phaser.Physics.Arcade.Sprite,
      enemy as unknown as Enemy,
      combatSystem,
      player
    )
  );

  // Enemy projectiles hit player
  scene.physics.add.overlap(
    groups.enemyProjectiles,
    player,
    (projectile) => handleEnemyHitPlayer(
      scene,
      projectile as Phaser.Physics.Arcade.Sprite,
      player
    )
  );

  // Player overlaps with loot
  scene.physics.add.overlap(
    player,
    groups.loot,
    (_, loot) => handleLootPickup(
      scene,
      loot as Phaser.Physics.Arcade.Sprite
    )
  );

  // Player overlaps with hazards
  scene.physics.add.overlap(
    player,
    groups.hazards,
    (_, hazard) => handleHazardDamage(
      scene,
      hazard as Phaser.Physics.Arcade.Sprite,
      player
    )
  );

  // Enemy melee contact with player
  scene.physics.add.overlap(
    player,
    groups.enemies,
    (_, enemy) => handleEnemyContact(
      scene,
      enemy as unknown as Enemy,
      player
    )
  );
}

/**
 * Handle player projectile hitting enemy.
 */
function handlePlayerHitEnemy(
  scene: Phaser.Scene,
  projectile: Phaser.Physics.Arcade.Sprite,
  enemy: Enemy,
  combatSystem: CombatSystem,
  player: Player
): void {
  if (!enemy.active) return;

  const damage = projectile.getData('damage') || player.attack;
  const result = combatSystem.calculateDamage(player, enemy, damage);

  combatSystem.applyDamage(enemy, result);

  scene.events.emit('showDamageNumber', enemy.x, enemy.y, result.damage, result.isCrit);

  projectile.destroy();
}

/**
 * Handle enemy projectile hitting player.
 */
function handleEnemyHitPlayer(
  scene: Phaser.Scene,
  projectile: Phaser.Physics.Arcade.Sprite,
  player: Player
): void {
  if (player.getIsInvulnerable()) return;

  const damage = projectile.getData('damage') || 10;
  player.takeDamage(damage);

  scene.events.emit('shakeCamera', 5, 100);
  scene.events.emit('showDamageNumber', player.x, player.y, damage, false, true);

  projectile.destroy();
}

/**
 * Handle player picking up loot.
 */
function handleLootPickup(
  scene: Phaser.Scene,
  loot: Phaser.Physics.Arcade.Sprite
): void {
  const itemData = loot.getData('item');
  if (itemData) {
    scene.events.emit('itemPickup', itemData, loot);
  }
}

/**
 * Handle player touching hazard.
 */
function handleHazardDamage(
  scene: Phaser.Scene,
  hazard: Phaser.Physics.Arcade.Sprite,
  player: Player
): void {
  if (player.getIsInvulnerable()) return;

  const damage = hazard.getData('damage') || 5;
  const source = hazard.getData('source') || 'hazard';

  scene.events.emit('hazardDamage', damage, source);
}

/**
 * Handle enemy making contact with player.
 */
function handleEnemyContact(
  scene: Phaser.Scene,
  enemy: Enemy,
  player: Player
): void {
  if (!enemy.active || player.getIsInvulnerable()) return;

  scene.events.emit('enemyAttack', enemy, player);
}
```

**Step 4: Create GameSceneEvents module**

Create `src/scenes/game/GameSceneEvents.ts`:

```typescript
/**
 * Event handling for GameScene.
 * Registers and manages scene event listeners.
 */
import Phaser from 'phaser';
import { Player } from '../../entities/Player';
import { Enemy } from '../../entities/Enemy';
import { VisualEffectsManager } from '../../systems/VisualEffectsManager';
import { AudioSystem } from '../../systems/AudioSystem';
import { LootDropManager } from '../../systems/LootDropManager';
import { CombatSystem } from '../../systems/CombatSystem';

export interface EventHandlers {
  visualEffects: VisualEffectsManager;
  audioSystem: AudioSystem;
  lootDropManager: LootDropManager;
  combatSystem: CombatSystem;
  player: Player;
  onPlayerDeath: () => void;
  onLevelUp: () => void;
}

/**
 * Register all scene event handlers.
 */
export function registerEventHandlers(
  scene: Phaser.Scene,
  handlers: EventHandlers
): void {
  const { visualEffects, audioSystem, lootDropManager, combatSystem, player } = handlers;

  // Damage number display
  scene.events.on('showDamageNumber', (x: number, y: number, damage: number, isCrit: boolean, isPlayer?: boolean) => {
    visualEffects.showDamageNumber(x, y, damage, isPlayer || false);
    if (isCrit) {
      visualEffects.showCritEffect(x, y);
    }
  });

  // Camera shake
  scene.events.on('shakeCamera', (intensity: number, duration: number) => {
    visualEffects.shakeCamera(intensity, duration);
  });

  // Enemy killed
  scene.events.on('enemyKilled', (enemy: Enemy) => {
    audioSystem.play('sfx_hit', 0.3);
    visualEffects.showDeathEffect(enemy.x, enemy.y);

    // Drop loot
    const xpValue = enemy.getData('xpValue') || 10;
    player.addXP(xpValue);

    // Gold drop
    const goldValue = enemy.getData('goldValue') || 5;
    lootDropManager.spawnGoldDrop(enemy.x, enemy.y, goldValue);
  });

  // Enemy attack
  scene.events.on('enemyAttack', (enemy: Enemy, target: Player) => {
    if (target.getIsInvulnerable()) return;

    const result = combatSystem.calculateDamage(enemy, target);
    combatSystem.applyDamage(target, result);

    audioSystem.play('sfx_hurt', 0.4);
    visualEffects.shakeCamera(5, 100);
    visualEffects.showDamageNumber(target.x, target.y, result.damage, true);
  });

  // Player death
  scene.events.on('playerDeath', () => {
    handlers.onPlayerDeath();
  });

  // Player level up
  scene.events.on('playerLevelUp', () => {
    audioSystem.play('sfx_levelup', 0.5);
    visualEffects.showLevelUpNotification();
    handlers.onLevelUp();
  });

  // Hazard damage
  scene.events.on('hazardDamage', (damage: number, _source: string) => {
    audioSystem.play('sfx_hurt', 0.3);
    visualEffects.shakeCamera(3, 80);
    visualEffects.showDamageNumber(player.x, player.y, damage, true);
  });

  // Item collection
  scene.events.on('itemCollected', () => {
    audioSystem.play('sfx_pickup', 0.3);
  });

  // Gold collection
  scene.events.on('goldCollected', (amount: number) => {
    audioSystem.play('sfx_coin', 0.2);
    visualEffects.showGoldNotification(amount);
  });

  // Inventory full
  scene.events.on('inventoryFull', () => {
    visualEffects.showGameMessage('Inventory full!');
  });
}

/**
 * Clean up all event handlers on scene shutdown.
 */
export function cleanupEventHandlers(scene: Phaser.Scene): void {
  const events = [
    'showDamageNumber',
    'shakeCamera',
    'enemyKilled',
    'enemyAttack',
    'playerDeath',
    'playerLevelUp',
    'hazardDamage',
    'itemCollected',
    'goldCollected',
    'inventoryFull',
  ];

  events.forEach(event => {
    scene.events.off(event);
  });
}
```

**Step 5: Commit module extractions**

```bash
mkdir -p src/scenes/game
git add src/scenes/game/
git commit -m "refactor: extract GameScene modules (Init, Input, Collisions, Events)"
```

---

### Task 2.3: Refactor GameScene to Use Modules

**Files:**
- Modify: `src/scenes/GameScene.ts`

**Step 1: Update GameScene imports and structure**

The refactored GameScene should be approximately 400 lines, delegating to the modules:

```typescript
/**
 * Main dungeon gameplay scene.
 * Orchestrates game systems and handles the core gameplay loop.
 */
import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { SinWorld } from '../config/WorldConfig';
import { networkManager } from '../multiplayer/NetworkManager';
import { HostController } from '../multiplayer/HostController';
import { GuestController } from '../multiplayer/GuestController';
import { progressionManager } from '../systems/ProgressionSystem';
import { SaveSystem } from '../systems/SaveSystem';
import { AudioSystem } from '../systems/AudioSystem';
import { VisualEffectsManager } from '../systems/VisualEffectsManager';
import { GameHUD } from '../ui/GameHUD';
import { InventoryUI } from '../ui/InventoryUI';
import { LevelUpUI } from '../ui/LevelUpUI';
import { DebugMenuUI } from '../ui/DebugMenuUI';
import { MinimapUI } from '../ui/MinimapUI';

// Import extracted modules
import {
  initializeSystems,
  createDungeonTiles,
  GameSceneSystems
} from './game/GameSceneInit';
import {
  setupInput,
  processMovement,
  registerKeyboardHandlers,
  cleanupInput,
  InputState
} from './game/GameSceneInput';
import { setupCollisions, CollisionGroups } from './game/GameSceneCollisions';
import { registerEventHandlers, cleanupEventHandlers } from './game/GameSceneEvents';

export class GameScene extends Phaser.Scene {
  // Core state
  private floor: number = 1;
  private currentWorld: SinWorld | null = null;
  private isBossFloor: boolean = false;

  // Systems (initialized in create)
  private systems!: GameSceneSystems;
  private input!: InputState;
  private collisionGroups!: CollisionGroups;

  // UI
  private gameHUD!: GameHUD;
  private inventoryUI!: InventoryUI;
  private levelUpUI!: LevelUpUI;
  private debugMenuUI!: DebugMenuUI;
  private minimapUI!: MinimapUI;

  // Audio/Visual
  private audioSystem!: AudioSystem;
  private visualEffects!: VisualEffectsManager;

  // Multiplayer
  private hostController: HostController | null = null;
  private guestController: GuestController | null = null;

  // Gameplay state
  private isMovementEnabled: boolean = true;
  private enemiesKilled: number = 0;
  private itemsCollected: number = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.initializeState();
    this.initializeSystems();
    this.initializeUI();
    this.initializeInput();
    this.initializeCollisions();
    this.initializeEvents();
    this.initializeMultiplayer();
    this.initializeCamera();

    // Start gameplay
    this.audioSystem.setMusicStyle('exploration');
    this.loadSavedGame();
  }

  private initializeState(): void {
    this.floor = this.registry.get('floor') || 1;
    this.currentWorld = this.registry.get('currentWorld') || null;
    this.enemiesKilled = this.registry.get('enemiesKilled') || 0;
    this.itemsCollected = this.registry.get('itemsCollected') || 0;

    // Determine if boss floor
    if (this.currentWorld) {
      this.isBossFloor = this.floor === 3;
    } else {
      this.isBossFloor = this.floor % 5 === 0;
    }
  }

  private initializeSystems(): void {
    this.systems = initializeSystems(this, this.floor, this.currentWorld);
    this.audioSystem = new AudioSystem(this, 'exploration');
    this.visualEffects = new VisualEffectsManager(this);

    // Create dungeon tiles
    const { walls } = createDungeonTiles(this, this.systems.dungeon, this.currentWorld);

    // Store collision groups
    this.collisionGroups = {
      walls,
      enemies: this.systems.enemySpawnManager.getEnemyGroup(),
      playerProjectiles: this.physics.add.group(),
      enemyProjectiles: this.physics.add.group(),
      loot: this.systems.lootDropManager.getLootGroup(),
      hazards: this.systems.hazardSystem.getHazardGroup(),
    };
  }

  private initializeUI(): void {
    this.gameHUD = new GameHUD(this, this.systems.player);
    this.inventoryUI = new InventoryUI(this, this.systems.player);
    this.levelUpUI = new LevelUpUI(this, this.systems.player);
    this.debugMenuUI = new DebugMenuUI(this);
    this.minimapUI = new MinimapUI(this, this.systems.dungeon);
  }

  private initializeInput(): void {
    this.input = setupInput(this);

    registerKeyboardHandlers(this, {
      onInteract: () => this.handleInteraction(),
      onInventory: () => this.inventoryUI.toggle(),
      onEscape: () => this.handleEscape(),
      onDebug: () => this.debugMenuUI.toggle(),
    });
  }

  private initializeCollisions(): void {
    setupCollisions(
      this,
      this.systems.player,
      this.collisionGroups,
      this.systems.combatSystem
    );
  }

  private initializeEvents(): void {
    registerEventHandlers(this, {
      visualEffects: this.visualEffects,
      audioSystem: this.audioSystem,
      lootDropManager: this.systems.lootDropManager,
      combatSystem: this.systems.combatSystem,
      player: this.systems.player,
      onPlayerDeath: () => this.handlePlayerDeath(),
      onLevelUp: () => this.levelUpUI.show(),
    });
  }

  private initializeMultiplayer(): void {
    if (!networkManager.isMultiplayer) return;

    if (networkManager.isHost) {
      this.hostController = new HostController(
        this,
        this.systems.player,
        this.systems.enemySpawnManager,
        this.systems.roomManager
      );
    } else {
      this.guestController = new GuestController(
        this,
        this.systems.player,
        this.systems.roomManager
      );
    }
  }

  private initializeCamera(): void {
    this.cameras.main.startFollow(this.systems.player, true, 0.1, 0.1);
    this.cameras.main.setZoom(2);
  }

  update(time: number, delta: number): void {
    if (!this.systems.player.active) return;

    // Process input
    processMovement(this.systems.player, this.input, this.isMovementEnabled);

    // Update systems
    this.systems.player.update(time, delta);
    this.systems.roomManager.update();
    this.systems.enemySpawnManager.update(time, delta);
    this.systems.hazardSystem.update(time, delta);
    this.systems.lightingSystem.update(this.systems.player);

    // Update UI
    this.gameHUD.update(this.systems.enemySpawnManager.getActiveEnemyCount());
    this.minimapUI.update(this.systems.player);

    // Multiplayer sync
    if (this.hostController) {
      this.hostController.update(time);
    }
    if (this.guestController) {
      this.guestController.update(time, delta);
    }
  }

  private handleInteraction(): void {
    // Check for nearby interactables (NPCs, chests, exits)
    this.systems.roomManager.checkInteraction(this.systems.player);
  }

  private handleEscape(): void {
    if (this.inventoryUI.isVisible()) {
      this.inventoryUI.hide();
    } else if (this.levelUpUI.isVisible()) {
      this.levelUpUI.hide();
    } else {
      // Show pause menu
      this.scene.pause();
      this.scene.launch('PauseScene');
    }
  }

  private handlePlayerDeath(): void {
    this.isMovementEnabled = false;
    this.audioSystem.stopMusic();

    progressionManager.handleDeath();

    this.time.delayedCall(1500, () => {
      this.scene.start('GameOverScene', {
        floor: this.floor,
        enemiesKilled: this.enemiesKilled,
      });
    });
  }

  private loadSavedGame(): void {
    const savedData = SaveSystem.load();
    if (!savedData) return;

    progressionManager.setProgression(savedData.progression);

    const activeRun = savedData.progression.activeRun;
    if (activeRun) {
      this.floor = activeRun.floor;
      this.registry.set('floor', this.floor);
      this.isBossFloor = this.floor === 3;
    }

    this.systems.player.restoreFromSave(savedData.player);
    SaveSystem.restoreInventory(this.systems.player.inventory, savedData.inventory);
  }

  private saveGame(): void {
    SaveSystem.save(
      progressionManager.getProgression(),
      this.systems.player.getSaveData(),
      this.systems.player.inventory
    );
  }

  shutdown(): void {
    // Cleanup UI
    this.gameHUD?.destroy();
    this.inventoryUI?.destroy();
    this.levelUpUI?.destroy();
    this.debugMenuUI?.close();
    this.minimapUI?.destroy();

    // Cleanup input
    cleanupInput(this);

    // Cleanup events
    cleanupEventHandlers(this);

    // Cleanup multiplayer
    this.hostController?.destroy();
    this.guestController?.destroy();

    // Cleanup systems
    this.audioSystem?.stopMusic();
    this.systems.lightingSystem?.destroy();

    // Save game state
    this.saveGame();
  }
}
```

**Step 2: Verify build passes**

```bash
npm run build
```

**Step 3: Commit refactored GameScene**

```bash
git add src/scenes/GameScene.ts
git commit -m "refactor: simplify GameScene using extracted modules (1192 → ~350 lines)"
```

---

## Phase 3: Fix Multiplayer Bugs (Days 8-10)

### Task 3.1: Fix NetworkManager Message Listener Leak

**Files:**
- Modify: `src/multiplayer/NetworkManager.ts`

**Step 1: Add message listener cleanup**

Find the `messageListeners` array and add proper cleanup:

```typescript
// Change from array to Map for proper cleanup
private messageListeners: Map<string, (message: SyncMessage, peerId: string) => void> = new Map();
private listenerIdCounter: number = 0;

/**
 * Register a message handler.
 * @returns Listener ID for removal
 */
onMessage(callback: (message: SyncMessage, peerId: string) => void): string {
  const id = `listener_${++this.listenerIdCounter}`;
  this.messageListeners.set(id, callback);
  return id;
}

/**
 * Remove a message handler by ID.
 */
offMessage(listenerId: string): void {
  this.messageListeners.delete(listenerId);
}

/**
 * Clear all message handlers.
 */
clearMessageListeners(): void {
  this.messageListeners.clear();
}

// Update the message dispatch to use Map
private dispatchMessage(message: SyncMessage, peerId: string): void {
  this.messageListeners.forEach(callback => {
    try {
      callback(message, peerId);
    } catch (error) {
      console.error('Message handler error:', error);
    }
  });
}
```

**Step 2: Update HostController and GuestController to use new API**

In both controllers, store the listener ID and clean up in destroy():

```typescript
// In constructor
private messageListenerId: string;

constructor(...) {
  // ...
  this.messageListenerId = networkManager.onMessage(this.handleMessage.bind(this));
}

destroy(): void {
  networkManager.offMessage(this.messageListenerId);
  // ... rest of cleanup
}
```

**Step 3: Commit fix**

```bash
git add src/multiplayer/NetworkManager.ts src/multiplayer/HostController.ts src/multiplayer/GuestController.ts
git commit -m "fix: prevent NetworkManager message listener memory leak"
```

---

### Task 3.2: Fix Guest Enemy Physics

**Files:**
- Modify: `src/multiplayer/GuestController.ts`

**Step 1: Add physics body to guest enemy sprites**

Find the enemy sprite creation code and add physics:

```typescript
private createEnemySprite(data: EnemyData): Phaser.Physics.Arcade.Sprite {
  // Create as physics sprite instead of regular sprite
  const sprite = this.scene.physics.add.sprite(
    data.x,
    data.y,
    data.texture || 'enemy'
  );

  sprite.setScale(data.scale || 1);
  sprite.setAlpha(data.alpha || 1);

  // Enable physics body
  sprite.body.setSize(16, 16);
  sprite.body.setImmovable(false);

  // Add to collision group
  this.enemyGroup.add(sprite);

  // Store enemy data
  sprite.setData('enemyId', data.id);
  sprite.setData('hp', data.hp);
  sprite.setData('maxHp', data.maxHp);

  return sprite;
}
```

**Step 2: Commit fix**

```bash
git add src/multiplayer/GuestController.ts
git commit -m "fix: add physics bodies to guest enemy sprites"
```

---

### Task 3.3: Add Input Validation for Multiplayer Messages

**Files:**
- Create: `src/multiplayer/MessageValidator.ts`
- Modify: `src/multiplayer/HostController.ts`

**Step 1: Create MessageValidator**

Create `src/multiplayer/MessageValidator.ts`:

```typescript
/**
 * Validates incoming multiplayer messages to prevent cheating.
 */
import { SyncMessage } from './NetworkManager';

const MAX_DAMAGE_PER_HIT = 1000;
const MAX_POSITION_DELTA = 100; // Max units moved per sync
const VALID_ROOM_CODE_REGEX = /^[A-Z0-9]{4,8}$/;

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Validate a room code format.
 */
export function validateRoomCode(code: string): ValidationResult {
  if (!VALID_ROOM_CODE_REGEX.test(code)) {
    return { valid: false, reason: 'Invalid room code format' };
  }
  return { valid: true };
}

/**
 * Validate damage value is within acceptable range.
 */
export function validateDamage(damage: number): ValidationResult {
  if (typeof damage !== 'number' || isNaN(damage)) {
    return { valid: false, reason: 'Damage must be a number' };
  }
  if (damage < 0) {
    return { valid: false, reason: 'Damage cannot be negative' };
  }
  if (damage > MAX_DAMAGE_PER_HIT) {
    return { valid: false, reason: `Damage exceeds max of ${MAX_DAMAGE_PER_HIT}` };
  }
  return { valid: true };
}

/**
 * Validate position update is reasonable.
 */
export function validatePositionDelta(
  oldX: number,
  oldY: number,
  newX: number,
  newY: number
): ValidationResult {
  const deltaX = Math.abs(newX - oldX);
  const deltaY = Math.abs(newY - oldY);

  if (deltaX > MAX_POSITION_DELTA || deltaY > MAX_POSITION_DELTA) {
    return { valid: false, reason: 'Position change too large (possible teleport)' };
  }
  return { valid: true };
}

/**
 * Validate an enemy ID exists in the game.
 */
export function validateEnemyId(
  enemyId: string,
  validEnemyIds: Set<string>
): ValidationResult {
  if (!validEnemyIds.has(enemyId)) {
    return { valid: false, reason: 'Invalid enemy ID' };
  }
  return { valid: true };
}

/**
 * Validate a sync message structure.
 */
export function validateSyncMessage(message: SyncMessage): ValidationResult {
  if (!message || typeof message !== 'object') {
    return { valid: false, reason: 'Message must be an object' };
  }
  if (!message.type || typeof message.type !== 'string') {
    return { valid: false, reason: 'Message must have a type' };
  }
  return { valid: true };
}
```

**Step 2: Update HostController to validate messages**

Add validation to HostController's message handlers:

```typescript
import { validateDamage, validateEnemyId, validateSyncMessage } from './MessageValidator';

// In handleGuestHit method:
handleGuestHit(message: PlayerHitMessage): void {
  // Validate message
  const msgValidation = validateSyncMessage(message);
  if (!msgValidation.valid) {
    console.warn('Invalid message:', msgValidation.reason);
    return;
  }

  // Validate damage
  const damageValidation = validateDamage(message.damage);
  if (!damageValidation.valid) {
    console.warn('Invalid damage:', damageValidation.reason);
    return;
  }

  // Validate enemy exists
  const validIds = new Set(this.enemyIdMap.values());
  const enemyValidation = validateEnemyId(message.enemyId, validIds);
  if (!enemyValidation.valid) {
    console.warn('Invalid enemy:', enemyValidation.reason);
    return;
  }

  // Process validated hit
  for (const [enemy, id] of this.enemyIdMap) {
    if (id === message.enemyId && enemy.active) {
      enemy.takeDamage(message.damage);
      break;
    }
  }
}
```

**Step 3: Commit validation**

```bash
git add src/multiplayer/MessageValidator.ts src/multiplayer/HostController.ts
git commit -m "feat: add multiplayer message validation to prevent exploits"
```

---

## Phase 4: Add JSDoc Documentation (Days 11-14)

### Task 4.1: Document Core Systems

**Files:**
- Modify: `src/systems/CombatSystem.ts`
- Modify: `src/systems/SaveSystem.ts`
- Modify: `src/systems/ProgressionSystem.ts`
- Modify: `src/systems/LootSystem.ts`
- Modify: `src/systems/InventorySystem.ts`

Add comprehensive JSDoc to all public methods. Example for CombatSystem:

```typescript
/**
 * Combat calculation system.
 * Handles damage calculation, critical hits, and defense reduction.
 */
export class CombatSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Calculate damage from attacker to target.
   *
   * Formula: baseDamage * (1 + critBonus) * (1 - defenseReduction)
   *
   * @param attacker - Entity dealing damage
   * @param target - Entity receiving damage
   * @param baseDamage - Optional override for base damage (defaults to attacker.attack)
   * @returns Damage result with final amount, crit status, and block status
   *
   * @example
   * const result = combatSystem.calculateDamage(player, enemy);
   * console.log(`Dealt ${result.damage} damage${result.isCrit ? ' (CRIT!)' : ''}`);
   */
  calculateDamage(
    attacker: Entity,
    target: Entity,
    baseDamage?: number
  ): DamageResult {
    // ...
  }

  /**
   * Apply calculated damage to a target.
   * Triggers death events if HP reaches zero.
   *
   * @param target - Entity to damage
   * @param result - Damage calculation result
   */
  applyDamage(target: Entity, result: DamageResult): void {
    // ...
  }
}
```

**Step: Commit documentation**

```bash
git add src/systems/
git commit -m "docs: add JSDoc documentation to core systems"
```

---

### Task 4.2: Document Entity Classes

**Files:**
- Modify: `src/entities/Player.ts`
- Modify: `src/entities/Enemy.ts`
- Modify: `src/entities/NPC.ts`

Add JSDoc to all public methods and properties.

**Step: Commit documentation**

```bash
git add src/entities/
git commit -m "docs: add JSDoc documentation to entity classes"
```

---

### Task 4.3: Document UI Components

**Files:**
- Modify: `src/ui/GameHUD.ts`
- Modify: `src/ui/InventoryUI.ts`
- Modify: `src/ui/ShopUI.ts`
- Modify: `src/ui/DialogueUI.ts`

Add JSDoc to all public methods.

**Step: Commit documentation**

```bash
git add src/ui/
git commit -m "docs: add JSDoc documentation to UI components"
```

---

## Phase 5: Code Quality Improvements (Days 15-18)

### Task 5.1: Extract Configuration Constants

**Files:**
- Create: `src/config/GameConfig.ts`
- Modify files that use magic numbers

**Step 1: Create GameConfig**

```typescript
/**
 * Central game configuration constants.
 * All magic numbers and tuning values should live here.
 */

// === PLAYER ===
export const PLAYER_CONFIG = {
  BASE_HP: 100,
  BASE_ATTACK: 10,
  BASE_DEFENSE: 5,
  BASE_SPEED: 100,
  INVULNERABILITY_DURATION: 1000, // ms
  CRIT_CHANCE: 0.1,
  CRIT_MULTIPLIER: 2.0,
} as const;

// === COMBAT ===
export const COMBAT_CONFIG = {
  DEFENSE_REDUCTION_CAP: 0.75, // Max 75% damage reduction
  KNOCKBACK_FORCE: 200,
  DAMAGE_FLASH_DURATION: 100, // ms
} as const;

// === ECONOMY ===
export const ECONOMY_CONFIG = {
  REROLL_BASE_COST: 50,
  HEALING_COST_RATIO: 0.5, // Cost = missingHp * ratio
  SELL_VALUE_RATIO: 0.5, // Sell for 50% of buy price
} as const;

// === UI ===
export const UI_CONFIG = {
  NPC_INTERACT_DISTANCE: 48, // pixels
  TOOLTIP_DELAY: 200, // ms
  FADE_DURATION: 300, // ms
} as const;

// === MULTIPLAYER ===
export const MULTIPLAYER_CONFIG = {
  SYNC_INTERVAL_ENEMIES: 50, // ms
  SYNC_INTERVAL_HOST_STATE: 1000, // ms
  RECONNECT_TIMEOUT: 30000, // ms
  MAX_RECONNECT_ATTEMPTS: 5,
} as const;

// === DUNGEON ===
export const DUNGEON_CONFIG = {
  WIDTH: 50, // tiles
  HEIGHT: 50, // tiles
  MIN_ROOM_SIZE: 5,
  MAX_ROOM_SIZE: 12,
  ROOM_COUNT: 8,
} as const;
```

**Step 2: Update files to use config**

Replace magic numbers with config references throughout the codebase.

**Step 3: Commit**

```bash
git add src/config/GameConfig.ts
git commit -m "refactor: extract magic numbers to GameConfig"
```

---

### Task 5.2: Split SinBosses.ts into Individual Files

**Files:**
- Create: `src/entities/enemies/bosses/SinBoss.ts` (base class)
- Create: `src/entities/enemies/bosses/PrideBoss.ts`
- Create: `src/entities/enemies/bosses/GreedBoss.ts`
- Create: `src/entities/enemies/bosses/WrathBoss.ts`
- Create: `src/entities/enemies/bosses/SlothBoss.ts`
- Create: `src/entities/enemies/bosses/EnvyBoss.ts`
- Create: `src/entities/enemies/bosses/GluttonyBoss.ts`
- Create: `src/entities/enemies/bosses/LustBoss.ts`
- Create: `src/entities/enemies/bosses/index.ts` (exports all)
- Delete: `src/entities/enemies/SinBosses.ts`

Each boss in its own file with full JSDoc.

**Step: Commit**

```bash
mkdir -p src/entities/enemies/bosses
git add src/entities/enemies/bosses/
git rm src/entities/enemies/SinBosses.ts
git commit -m "refactor: split SinBosses into individual files (911 lines → 7 focused files)"
```

---

### Task 5.3: Split HubScene

**Files:**
- Create: `src/scenes/hub/HubScenePortals.ts`
- Create: `src/scenes/hub/HubSceneNPCs.ts`
- Create: `src/scenes/hub/HubSceneDebug.ts`
- Modify: `src/scenes/HubScene.ts`

Extract portal creation, NPC management, and debug menu into modules.

**Step: Commit**

```bash
mkdir -p src/scenes/hub
git add src/scenes/hub/
git commit -m "refactor: extract HubScene modules (1189 → ~400 lines)"
```

---

## Phase 6: Testing Infrastructure (Days 19-21)

### Task 6.1: Set Up Testing Framework

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `src/__tests__/setup.ts`

**Step 1: Install Jest**

```bash
npm install --save-dev jest @types/jest ts-jest
```

**Step 2: Configure Jest**

Create `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleNameMapper: {
    '^phaser$': '<rootDir>/src/__tests__/mocks/phaser.ts',
  },
};
```

**Step 3: Create Phaser mock**

Create `src/__tests__/mocks/phaser.ts` with minimal mock.

**Step 4: Add test script**

In `package.json`:
```json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch"
}
```

**Step 5: Commit**

```bash
git add package.json jest.config.js src/__tests__/
git commit -m "chore: set up Jest testing infrastructure"
```

---

### Task 6.2: Write Tests for Core Systems

**Files:**
- Create: `src/__tests__/systems/CombatSystem.test.ts`
- Create: `src/__tests__/systems/SaveSystem.test.ts`
- Create: `src/__tests__/systems/LootSystem.test.ts`

Example test:

```typescript
import { CombatSystem } from '../../systems/CombatSystem';

describe('CombatSystem', () => {
  describe('calculateDamage', () => {
    it('should calculate base damage correctly', () => {
      // ...
    });

    it('should apply critical hit multiplier', () => {
      // ...
    });

    it('should respect defense reduction cap', () => {
      // ...
    });
  });
});
```

**Step: Commit**

```bash
git add src/__tests__/
git commit -m "test: add unit tests for core systems"
```

---

## Summary

This plan transforms the codebase through 6 phases:

1. **Documentation** (Days 1-2): Architecture docs, contributing guide, API reference
2. **Split Large Files** (Days 3-7): Extract AssetGenerator, GameScene modules
3. **Fix Multiplayer** (Days 8-10): Memory leaks, physics, validation
4. **JSDoc Documentation** (Days 11-14): Document all public APIs
5. **Code Quality** (Days 15-18): Config extraction, file splitting
6. **Testing** (Days 19-21): Jest setup, core system tests

**Total estimated time**: 3 weeks

**Key metrics improvement:**
- Documentation: 20% → 80%
- Largest file: 1425 lines → ~400 lines
- Test coverage: 0% → 50%
- Memory leaks: Fixed
- Multiplayer exploits: Prevented
