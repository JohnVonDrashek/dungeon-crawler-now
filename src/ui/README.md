# UI System

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Phaser](https://img.shields.io/badge/Phaser_3-4B0082?style=flat-square&logo=phaser&logoColor=white)
![Components](https://img.shields.io/badge/Components-9-green?style=flat-square)

This directory contains all UI components for the dungeon crawler game, built on Phaser 3's game object system.

## Architecture Overview

The UI system follows a **component-based architecture** where each UI element is a self-contained class responsible for:

- Creating and managing its own Phaser game objects
- Handling user input (keyboard and mouse)
- Managing visibility state and animations
- Cleaning up resources on destruction

### Key Design Patterns

1. **Container-Based Layout**: All UIs use `Phaser.GameObjects.Container` as their root element, allowing grouped positioning and depth management.

2. **Fixed UI (Scroll Factor 0)**: Most UI elements use `setScrollFactor(0)` to remain fixed relative to the camera viewport rather than world coordinates.

3. **Depth Layering**: Consistent depth values ensure proper z-ordering:
   - **100**: HUD elements (GameHUD, MinimapUI, prompts)
   - **199**: Overlay backgrounds (modal dimming)
   - **200**: Modal panels (Inventory, Shop, Settings, LevelUp)
   - **250-251**: Level up UI and tooltips
   - **300**: Lore modals and dev messages
   - **400**: Dialogue UI
   - **500**: Debug menu (highest priority)

4. **Event-Driven Updates**: Components subscribe to game events (`equipmentChanged`, `itemPickup`) to refresh their displays.

5. **Graceful Cleanup**: All components implement `destroy()` methods that remove event listeners and destroy game objects.

---

## UI Components

### DebugMenuUI

**File**: `DebugMenuUI.ts`
**Purpose**: Developer tools menu accessible via F1 key during gameplay.

#### Features

- God mode toggle (invulnerability)
- Instant level up (x1 and x5)
- Gold and loot spawning (Epic/Rare items)
- Kill all enemies on floor
- Floor skipping and boss jumping
- World completion cheats
- Return to hub shortcut

#### API

```typescript
class DebugMenuUI {
  constructor(scene, player, lootSystem, lootDropManager, callbacks);

  setFloorInfo(floor: number, currentWorld: SinWorld | null): void;
  getIsDevMode(): boolean;      // Check if god mode is active
  getIsVisible(): boolean;
  setupControls(): void;        // Bind F1 key
  toggle(): void;
  close(): void;
}
```

#### Callbacks Interface

```typescript
interface DebugMenuCallbacks {
  getEnemies: () => Phaser.Physics.Arcade.Group;
  handleExitCollision: () => void;
  closeAndReturnToHub: () => void;
}
```

---

### DialogueUI

**File**: `DialogueUI.ts`
**Purpose**: NPC conversation display with typewriter text effect.

#### Features

- Multi-line dialogue support with speaker names
- Typewriter text animation (22ms per character)
- Speaker color customization
- Corner accent decorations
- Animated continue prompt
- Skip typing with Space/Enter/E

#### API

```typescript
class DialogueUI {
  constructor(scene: Phaser.Scene);

  show(dialogue: DialogueData): void;
  hide(): void;
  getIsVisible(): boolean;
}

interface DialogueData {
  lines: DialogueLine[];
  onComplete?: () => void;
}

interface DialogueLine {
  speaker: string;
  text: string;
  speakerColor?: string;
}
```

---

### GameHUD

**File**: `GameHUD.ts`
**Purpose**: Persistent heads-up display showing player stats during gameplay.

#### Features

- HP bar with color-coded health status (green/yellow/red)
- XP bar with level indicator
- Attack and defense stats
- Gold counter with diamond icon
- Floor/world indicator with boss marker
- Enemy count display
- Stat points notification
- Equipped weapon display (bottom-right)

#### API

```typescript
class GameHUD {
  constructor(scene: Phaser.Scene, player: Player);

  create(): void;
  update(floor: number, currentWorld: SinWorld | null, isBossFloor: boolean, enemyCount: number): void;
  destroy(): void;
}
```

#### Visual Layout

```
+------------------+
| WORLD Floor #    |      (top-left corner)
|------------------|
| HP [========]    |
| LVL # [====]     |
| ATK ## . DEF ##  |
| Enemies: ##      |
| > # stat pts [L] |
+------------------+

                    +------------+
                    | Weapon     |  (bottom-right corner)
                    | [ICON] Nm  |
                    +------------+
```

---

### InventoryUI

**File**: `InventoryUI.ts`
**Purpose**: Player inventory management with equipment slots and item grid.

#### Features

- 7-column item grid (max slots from player inventory)
- 3 equipment slots (Weapon, Armor, Accessory)
- Rarity-colored slot borders
- Upgrade/downgrade comparison indicators (arrows)
- Rich tooltips with stat breakdowns
- Shift+Click to equip/use items
- Animated slide-in/fade overlay

#### API

```typescript
class InventoryUI {
  constructor(scene: Phaser.Scene, player: Player);

  show(): void;
  hide(): void;
  toggle(): void;
  refresh(): void;
  getIsVisible(): boolean;
  destroy(): void;
}
```

#### Slot Size Constants

```typescript
SLOT_SIZE = 40px
SLOTS_PER_ROW = 7
SLOT_GAP = 5px
```

---

### LevelUpUI

**File**: `LevelUpUI.ts`
**Purpose**: Stat point allocation screen when player has unspent points.

#### Features

- Current stats display (HP, ATK, DEF, SPD)
- XP progress bar
- Stat allocation buttons with descriptions:
  - HP: +10 Max HP
  - ATK: +2 Attack
  - DEF: +1 Defense
  - SPD: +10 Speed
- Real-time stat updates with highlight flash
- Purple accent when stat points available
- Animated slide-in panel

#### API

```typescript
class LevelUpUI {
  constructor(scene: Phaser.Scene, player: Player);

  show(): void;
  hide(): void;
  getIsVisible(): boolean;
}
```

---

### LoreUIManager

**File**: `LoreUIManager.ts`
**Purpose**: Manages lore discovery system including tablets, wall scratches, and whispers.

#### Features

- Three lore types with unique visuals:
  - **Tablets**: Glowing cyan light, opens modal dialog
  - **Scratches**: Faint static text, floating display
  - **Whispers**: Floating ethereal text with audio
- Physics-enabled lore objects for collision detection
- [Q] proximity prompt
- Floor-based lore discovery
- Light2D pipeline integration

#### API

```typescript
class LoreUIManager {
  constructor(scene, player, loreSystem, audioSystem, floor);

  create(): void;
  getLoreObjects(): Phaser.Physics.Arcade.Group;
  getLorePrompt(): Phaser.GameObjects.Text;
  hasActiveModal(): boolean;
  closeModal(): void;
  tryAddLoreObject(room: Room): void;
  addLoreObject(room: Room, forcedType?: 'tablet' | 'scratch' | 'whisper'): void;
  tryInteractWithLore(): void;
  updateLorePrompt(): void;
  destroy(): void;
}
```

---

### MinimapUI

**File**: `MinimapUI.ts`
**Purpose**: Real-time dungeon minimap in the top-right corner.

#### Features

- Fog of war (tiles revealed as visited)
- Room type color coding:
  - Normal/Spawn: Gray (`#374151`)
  - Exit: Green (`#10b981`)
  - Treasure: Gold (`#6b5b1f`)
  - Trap: Red (`#6b2020`)
  - Shrine: Blue (`#1e4a6b`)
  - Challenge: Purple (`#4a1e6b`)
- Special room icons (chest, shrine, skull, stairs)
- Opened chest/used shrine tracking (grayed out)
- Centered player tracking (purple dot)
- Throttled rendering (every 3 frames)
- Tile-to-room cache for performance

#### API

```typescript
class MinimapUI {
  constructor(scene: Phaser.Scene, dungeonData: DungeonData);

  markChestOpened(roomId: number): void;
  markShrineUsed(roomId: number): void;
  update(playerX: number, playerY: number): void;
  destroy(): void;
}
```

#### Constants

```typescript
viewportSize = 100px
scale = 1
padding = 10px
UPDATE_INTERVAL = 3 frames
```

---

### SettingsUI

**File**: `SettingsUI.ts`
**Purpose**: Audio and control settings menu.

#### Features

- Volume sliders with drag support:
  - Master Volume
  - Music Volume
  - SFX Volume (plays pickup sound on change)
- Controls reference table
- Reset to defaults button
- Integration with `SettingsManager` for persistence
- Animated slide-in panel

#### API

```typescript
class SettingsUI {
  constructor(scene: Phaser.Scene, audioSystem?: AudioSystem);

  setAudioSystem(audioSystem: AudioSystem): void;
  show(): void;
  hide(): void;
  toggle(): void;
  getIsVisible(): boolean;
  destroy(): void;
}
```

#### Controls Listed

| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| Left Click | Attack |
| Space | Dodge |
| E | Inventory |
| L | Level Up |
| ESC | Settings |

---

### ShopUI

**File**: `ShopUI.ts`
**Purpose**: In-game shop interface for purchasing items.

#### Features

- Procedurally generated shop inventory:
  - Weapons (30% chance)
  - Health potions (20% chance)
  - Armor/Accessories (50% chance)
- Dynamic pricing based on rarity and floor
- Gold display with real-time updates
- Item tooltips with purchase affordability
- Heal to full option (cost based on missing HP)
- Shop reroll (50g, increases by 1.5x each time)
- Sold item overlay
- `onClose` callback support

#### API

```typescript
class ShopUI {
  constructor(scene: Phaser.Scene, player: Player, floor: number);

  show(onClose?: () => void): void;
  close(): void;
  getIsVisible(): boolean;
  rerollInventory(): void;
  destroy(): void;
}
```

#### Pricing Formula

```typescript
basePrice = typeBase[item.type] * rarityMultiplier[item.rarity]
finalPrice = basePrice * (1 + floor * 0.1)
```

---

## Common Patterns

### Creating a Modal UI

All modal UIs follow this pattern:

```typescript
show(): void {
  // 1. Clean up existing panel if any
  if (this.panel) {
    this.panel.destroy();
    this.panel = null;
  }

  // 2. Create darkened overlay
  this.overlay = this.scene.add.rectangle(...);
  this.overlay.setDepth(199);

  // 3. Create panel container off-screen
  this.panel = this.scene.add.container(centerX, centerY + cam.height);
  this.panel.setDepth(200);
  this.panel.setAlpha(0);

  // 4. Build panel contents
  this.createPanel();

  // 5. Animate in
  this.scene.tweens.add({
    targets: this.overlay,
    fillAlpha: 0.75,
    duration: 150,
  });
  this.scene.tweens.add({
    targets: this.panel,
    y: centerY,
    alpha: 1,
    duration: 200,
    ease: 'Back.easeOut',
  });
}
```

### Corner Accent Pattern

Most panels feature orange corner accents for visual consistency:

```typescript
private drawCornerAccents(halfW: number, halfH: number): void {
  const corners = this.scene.add.graphics();
  corners.lineStyle(2, 0xff6600, 0.9);
  const size = 14;

  // Top-left L-shape
  corners.beginPath();
  corners.moveTo(-halfW, -halfH + size);
  corners.lineTo(-halfW, -halfH);
  corners.lineTo(-halfW + size, -halfH);
  corners.strokePath();
  // ... repeat for other corners
}
```

### Tooltip Pattern

Tooltips are created in a separate container at high depth:

```typescript
private showTooltip(item: Item, x: number, y: number): void {
  if (!this.tooltipContainer) return;
  this.tooltipContainer.removeAll(true);

  // Create background with rarity-colored border
  const bg = this.scene.add.graphics();
  bg.fillStyle(0x0a0a0a, 0.95);
  bg.fillRoundedRect(0, 0, width, height, 6);
  bg.lineStyle(1, RARITY_COLORS[item.rarity], 0.6);
  bg.strokeRoundedRect(0, 0, width, height, 6);

  // Position and show
  this.tooltipContainer.setPosition(adjustedX, adjustedY);
  this.tooltipContainer.setVisible(true);
}
```

### Event Cleanup Pattern

All components that subscribe to events store handler references for cleanup:

```typescript
// In constructor or create()
this.equipmentChangedHandler = () => this.refresh();
this.scene.events.on('equipmentChanged', this.equipmentChangedHandler);

// In destroy()
if (this.equipmentChangedHandler) {
  this.scene.events.off('equipmentChanged', this.equipmentChangedHandler);
  this.equipmentChangedHandler = null;
}
```

---

## Event Integration

UI components integrate with the game through Phaser's event system:

| Event | Emitter | Consumers |
|-------|---------|-----------|
| `equipmentChanged` | Player/Inventory | GameHUD, InventoryUI |
| `itemPickup` | Player | InventoryUI |

---

## Styling Constants

### Colors

| Element | Hex | Usage |
|---------|-----|-------|
| Accent Orange | `#ff6600` / `0xff6600` | Corners, highlights, buttons |
| Accent Purple | `#8b5cf6` / `0x8b5cf6` | Level up, minimap player |
| Background Dark | `#0a0a0a` / `0x0a0a0a` | Panel backgrounds |
| Border Gray | `#444444` / `0x444444` | Panel borders |
| Text Primary | `#ffffff` | Headers, important text |
| Text Secondary | `#aaaaaa` - `#888888` | Descriptions, labels |
| Text Muted | `#666666` - `#555555` | Hints, disabled text |
| Gold | `#ffd700` / `0xffd700` | Gold amounts, prices |
| Success Green | `#44ff44` / `#22cc22` | Positive indicators |
| Error Red | `#ff4444` | Errors, unaffordable |

### Rarity Colors

```typescript
RARITY_COLORS = {
  COMMON: 0xcccccc,
  UNCOMMON: 0x22cc22,
  RARE: 0x2288ff,
  EPIC: 0xaa44ff,
  LEGENDARY: 0xffaa00,
}
```

### Fonts

- **Headers**: `Cinzel, Georgia, serif`
- **Body/Code**: `Roboto Mono, Courier New, monospace`

---

## Usage Examples

### Opening the Inventory

```typescript
// In GameScene
this.inventoryUI = new InventoryUI(this, this.player);

// Toggle on E key
this.input.keyboard.on('keydown-E', () => {
  if (!this.isAnyModalOpen()) {
    this.inventoryUI.toggle();
  }
});
```

### Showing a Shop

```typescript
const shop = new ShopUI(this, this.player, this.floor);
shop.show(() => {
  // Called when shop closes
  this.resumeGameplay();
});
```

### Updating the HUD

```typescript
// In update loop
this.gameHUD.update(
  this.floor,
  this.currentWorld,
  this.isBossFloor(),
  this.enemies.countActive()
);
```

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
