# UI API Reference

![UI Components](https://img.shields.io/badge/Components-9-blue)
![Phaser 3](https://img.shields.io/badge/Phaser-3.x-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

Complete API reference for the dungeon crawler UI system. All UI components are built on Phaser 3 and follow consistent patterns for visibility management, event handling, and resource cleanup.

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [GameHUD](#gamehud)
- [InventoryUI](#inventoryui)
- [ShopUI](#shopui)
- [DialogueUI](#dialogueui)
- [LevelUpUI](#levelupui)
- [SettingsUI](#settingsui)
- [MinimapUI](#minimapui)
- [DebugMenuUI](#debugmenuui)
- [LoreUIManager](#loreuimanager)
- [Common Patterns](#common-patterns)
- [Event Handling](#event-handling)
- [Usage Examples](#usage-examples)

---

## Architecture Overview

### Design Principles

1. **Container-Based Layout**: All modal UIs use `Phaser.GameObjects.Container` for grouping elements
2. **Scroll Factor Zero**: HUD elements use `setScrollFactor(0)` to stay fixed on screen
3. **Depth Layering**: Consistent depth values (100 for HUD, 200+ for modals, 300+ for tooltips)
4. **Event Cleanup**: All components properly remove event listeners on destroy
5. **Animation**: Smooth fade-in/slide-in animations for modal panels

### Common UI Dependencies

```typescript
import Phaser from 'phaser';
import { Player } from '../entities/Player';
```

### Visual Styling Constants

Most UI components share these styling patterns:

```typescript
// Colors
const BACKGROUND_COLOR = 0x0a0a0a;      // Dark panel backgrounds
const BORDER_COLOR = 0x444444;           // Subtle borders
const ACCENT_COLOR = 0xff6600;           // Orange corner accents
const HIGHLIGHT_COLOR = 0x8b5cf6;        // Purple for level-up/special

// Typography
const TITLE_FONT = 'Cinzel, Georgia, serif';
const BODY_FONT = 'Roboto Mono, Courier New, monospace';
```

---

## GameHUD

**File:** `/src/ui/GameHUD.ts`

Manages the in-game heads-up display showing player stats, floor info, and equipped weapon.

### Constructor

```typescript
constructor(scene: Phaser.Scene, player: Player)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `scene` | `Phaser.Scene` | The Phaser scene to render HUD in |
| `player` | `Player` | Player entity to display stats for |

### Public Methods

#### `create(): void`

Initializes and renders all HUD elements. Must be called after construction.

```typescript
const hud = new GameHUD(this, player);
hud.create();
```

**Creates:**
- Main stats panel (top-left)
- Weapon display panel (bottom-right)
- Event listener for `equipmentChanged`

#### `update(floor, currentWorld, isBossFloor, enemyCount): void`

Updates all HUD displays with current game state.

```typescript
update(
  floor: number,
  currentWorld: SinWorld | null,
  isBossFloor: boolean,
  enemyCount: number
): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `floor` | `number` | Current floor number |
| `currentWorld` | `SinWorld \| null` | Current sin world (or null for hub) |
| `isBossFloor` | `boolean` | Whether current floor is a boss floor |
| `enemyCount` | `number` | Number of remaining enemies |

**Updates:**
- Floor/world text with boss indicator
- HP bar (color changes: green > yellow > red)
- XP bar and level display
- Attack/Defense stats
- Enemy count
- Stat points indicator (if available)
- Gold counter

#### `destroy(): void`

Cleans up HUD resources and event listeners.

```typescript
hud.destroy();
```

### HUD Elements

| Element | Position | Description |
|---------|----------|-------------|
| Floor Text | Top-left panel, centered | Shows world name and floor number |
| HP Bar | Below floor text | Health bar with color gradient |
| XP Bar | Below HP bar | Experience progress bar |
| Stats Text | Below XP bar | ATK/DEF display |
| Enemy Count | Below stats | Remaining enemies |
| Stat Points | Bottom of panel | Shows available points (if any) |
| Gold Display | Top-right of panel | Gold icon and amount |
| Weapon HUD | Bottom-right corner | Equipped weapon icon and name |

### Example Usage

```typescript
class GameScene extends Phaser.Scene {
  private hud!: GameHUD;

  create() {
    this.hud = new GameHUD(this, this.player);
    this.hud.create();
  }

  update() {
    this.hud.update(
      this.floor,
      this.currentWorld,
      this.isBossFloor,
      this.enemies.countActive()
    );
  }

  shutdown() {
    this.hud.destroy();
  }
}
```

---

## InventoryUI

**File:** `/src/ui/InventoryUI.ts`

Modal inventory interface for viewing and managing player items and equipment.

### Constructor

```typescript
constructor(scene: Phaser.Scene, player: Player)
```

### Public Methods

#### `show(): void`

Opens the inventory panel with slide-in animation.

```typescript
inventoryUI.show();
```

**Features:**
- Background overlay (fades in)
- Panel slides up from bottom
- Equipment slots (left side)
- Item grid (right side)
- Tooltip on hover
- Shift+Click to equip/use

#### `hide(): void`

Closes the inventory panel and cleans up resources.

```typescript
inventoryUI.hide();
```

#### `toggle(): void`

Toggles inventory visibility.

```typescript
inventoryUI.toggle();
```

#### `refresh(): void`

Updates inventory display with current items. Called automatically on `itemPickup` and `equipmentChanged` events.

```typescript
inventoryUI.refresh();
```

#### `getIsVisible(): boolean`

Returns current visibility state.

```typescript
if (inventoryUI.getIsVisible()) {
  // Inventory is open
}
```

#### `destroy(): void`

Full cleanup including event listener removal.

```typescript
inventoryUI.destroy();
```

### Layout Constants

```typescript
private readonly SLOT_SIZE = 40;
private readonly SLOTS_PER_ROW = 7;
private readonly SLOT_GAP = 5;
```

### Item Slot Interaction

| Action | Behavior |
|--------|----------|
| Hover | Shows tooltip with item stats |
| Shift+Click (Equipment) | Equips the item |
| Shift+Click (Consumable) | Uses the item |
| Shift+Click (Equipped) | Unequips the item |

### Tooltip Information

Tooltips display:
- Item name (colored by rarity)
- Item type
- Stats (Attack, Defense, Max HP, Speed)
- Heal amount (for consumables)
- Description
- Usage instruction

### Example Usage

```typescript
class GameScene extends Phaser.Scene {
  private inventoryUI!: InventoryUI;

  create() {
    this.inventoryUI = new InventoryUI(this, this.player);

    // Toggle with 'E' key
    this.input.keyboard?.on('keydown-E', () => {
      if (!this.isOtherUIOpen()) {
        this.inventoryUI.toggle();
      }
    });
  }

  destroy() {
    this.inventoryUI.destroy();
  }
}
```

---

## ShopUI

**File:** `/src/ui/ShopUI.ts`

Modal shop interface for purchasing items, healing, and rerolling inventory.

### Interfaces

```typescript
interface ShopItem {
  item: Item;
  price: number;
  sold: boolean;
}
```

### Constructor

```typescript
constructor(scene: Phaser.Scene, player: Player, floor: number)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `scene` | `Phaser.Scene` | The Phaser scene |
| `player` | `Player` | Player entity for purchases |
| `floor` | `number` | Current floor (affects item scaling) |

### Public Methods

#### `show(onClose?: () => void): void`

Opens the shop panel.

```typescript
shopUI.show(() => {
  console.log('Shop closed');
  this.resumeGameplay();
});
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `onClose` | `() => void` | Optional callback when shop closes |

#### `close(): void`

Closes the shop panel and triggers the onClose callback.

```typescript
shopUI.close();
```

#### `getIsVisible(): boolean`

Returns current visibility state.

#### `rerollInventory(): void`

Regenerates shop items (called internally on reroll button).

#### `destroy(): void`

Full cleanup.

### Layout Constants

```typescript
private readonly PANEL_WIDTH = 520;
private readonly PANEL_HEIGHT = 400;
private readonly SLOT_SIZE = 70;
private readonly SLOT_GAP = 10;
private readonly SLOTS_PER_ROW = 5;
```

### Shop Features

| Feature | Description |
|---------|-------------|
| Item Grid | 4-7 randomly generated items |
| Heal Button | Restores player to full HP (cost scales with missing HP) |
| Reroll Button | Regenerates shop items (cost increases each use) |
| Price Display | Shows gold/red based on affordability |
| Sold Overlay | Grays out purchased items |

### Price Calculation

```typescript
// Base prices by item type
const typeBase = {
  WEAPON: 40,
  ARMOR: 30,
  ACCESSORY: 25,
  CONSUMABLE: 15
};

// Rarity multipliers
const rarityMultiplier = {
  COMMON: 1,
  UNCOMMON: 2,
  RARE: 4,
  EPIC: 8,
  LEGENDARY: 16
};

// Final price includes floor scaling
const price = Math.floor(basePrice * (1 + floor * 0.1));
```

### Example Usage

```typescript
// In room transition or shrine interaction
openShop() {
  this.shopUI = new ShopUI(this, this.player, this.floor);
  this.shopUI.show(() => {
    this.shopUI = null;
    this.enablePlayerControls();
  });
  this.disablePlayerControls();
}
```

---

## DialogueUI

**File:** `/src/ui/DialogueUI.ts`

Modal dialogue panel for NPC conversations with typewriter effect.

### Interfaces

```typescript
interface DialogueLine {
  speaker: string;
  text: string;
  speakerColor?: string;
}

interface DialogueData {
  lines: DialogueLine[];
  onComplete?: () => void;
}
```

### Constructor

```typescript
constructor(scene: Phaser.Scene)
```

### Public Methods

#### `show(dialogue: DialogueData): void`

Displays dialogue with the given data.

```typescript
dialogueUI.show({
  lines: [
    { speaker: 'Old Sage', text: 'Welcome, traveler...', speakerColor: '#22d3ee' },
    { speaker: 'Old Sage', text: 'The dungeon awaits below.' }
  ],
  onComplete: () => {
    this.givePlayerQuest();
  }
});
```

#### `hide(): void`

Closes the dialogue panel (triggers onComplete if not already called).

#### `getIsVisible(): boolean`

Returns current visibility state.

### Typewriter Effect

- Characters appear one at a time (22ms delay)
- Press Space/Enter/E to complete current line instantly
- Press again to advance to next line
- ESC closes dialogue immediately

### Panel Layout

| Element | Position | Description |
|---------|----------|-------------|
| Speaker Name | Top-left with accent | Uppercase speaker name |
| Dialogue Text | Center area | Word-wrapped dialogue content |
| Continue Hint | Bottom-right | Animated "SPACE" indicator |

### Example Usage

```typescript
class NPC extends Phaser.GameObjects.Sprite {
  interact(dialogueUI: DialogueUI) {
    dialogueUI.show({
      lines: this.getDialogueLines(),
      onComplete: () => this.onDialogueComplete()
    });
  }

  private getDialogueLines(): DialogueLine[] {
    return [
      { speaker: this.name, text: 'Greetings!', speakerColor: '#fbbf24' },
      { speaker: this.name, text: 'Be careful in the depths...' }
    ];
  }
}
```

---

## LevelUpUI

**File:** `/src/ui/LevelUpUI.ts`

Modal interface for viewing character stats and allocating stat points.

### Constructor

```typescript
constructor(scene: Phaser.Scene, player: Player)
```

### Public Methods

#### `show(): void`

Opens the level-up panel.

```typescript
levelUpUI.show();
```

**Display modes:**
- **With stat points**: Purple border, "LEVEL UP!" title, clickable stat buttons
- **Without stat points**: Orange border, "CHARACTER" title, view-only mode

#### `hide(): void`

Closes the panel with scale-out animation.

#### `getIsVisible(): boolean`

Returns current visibility state.

### Layout Constants

```typescript
private readonly PANEL_WIDTH = 340;
private readonly PANEL_HEIGHT = 400;
```

### Stat Allocation

| Stat | Button Label | Effect |
|------|--------------|--------|
| HP | HP | +10 Max HP |
| Attack | ATK | +2 Attack |
| Defense | DEF | +1 Defense |
| Speed | SPD | +10 Speed |

### Visual Feedback

- Stat buttons highlight on hover (purple border)
- Changed stats flash green briefly
- Buttons disable when no points remain
- Points counter updates in real-time

### Example Usage

```typescript
// In GameScene
setupControls() {
  this.input.keyboard?.on('keydown-L', () => {
    if (!this.isModalOpen()) {
      this.levelUpUI.show();
    }
  });
}

// Auto-open on level up
onPlayerLevelUp() {
  if (this.player.statPoints > 0) {
    this.levelUpUI.show();
  }
}
```

---

## SettingsUI

**File:** `/src/ui/SettingsUI.ts`

Modal settings panel for audio controls and keybind reference.

### Constructor

```typescript
constructor(scene: Phaser.Scene, audioSystem?: AudioSystem)
```

### Public Methods

#### `setAudioSystem(audioSystem: AudioSystem): void`

Sets or updates the audio system reference.

```typescript
settingsUI.setAudioSystem(this.audioSystem);
```

#### `show(): void`

Opens the settings panel.

#### `hide(): void`

Closes the settings panel.

#### `toggle(): void`

Toggles settings visibility.

#### `getIsVisible(): boolean`

Returns current visibility state.

#### `destroy(): void`

Full cleanup.

### Layout Constants

```typescript
private readonly PANEL_WIDTH = 380;
private readonly PANEL_HEIGHT = 400;
private readonly SLIDER_WIDTH = 120;
```

### Volume Sliders

| Slider | Description |
|--------|-------------|
| Master | Overall game volume |
| Music | Background music volume |
| SFX | Sound effects volume |

**Slider Interaction:**
- Click anywhere on track to set value
- Drag thumb for fine control
- Value displays as percentage

### Controls Reference

The settings panel displays these keybinds:

| Key | Action |
|-----|--------|
| WASD / Arrows | Move |
| Left Click | Attack |
| Space | Dodge |
| E | Inventory |
| L | Level Up |
| ESC | Settings |

### Example Usage

```typescript
class GameScene extends Phaser.Scene {
  private settingsUI!: SettingsUI;

  create() {
    this.settingsUI = new SettingsUI(this);
    this.settingsUI.setAudioSystem(this.audioSystem);

    this.input.keyboard?.on('keydown-ESC', () => {
      this.settingsUI.toggle();
    });
  }
}
```

---

## MinimapUI

**File:** `/src/ui/MinimapUI.ts`

Real-time minimap showing explored dungeon areas and special room icons.

### Constructor

```typescript
constructor(scene: Phaser.Scene, dungeonData: DungeonData)
```

### Public Methods

#### `update(playerX: number, playerY: number): void`

Updates the minimap based on player position.

```typescript
// In scene update loop
this.minimap.update(this.player.x, this.player.y);
```

**Features:**
- Reveals tiles visible on player's screen
- Centers minimap on player position
- Throttled rendering (every 3 frames)

#### `markChestOpened(roomId: number): void`

Marks a chest room as opened (icon turns gray).

```typescript
minimap.markChestOpened(room.id);
```

#### `markShrineUsed(roomId: number): void`

Marks a shrine room as used (icon turns gray).

```typescript
minimap.markShrineUsed(room.id);
```

#### `destroy(): void`

Cleans up graphics object.

### Room Colors

```typescript
const ROOM_COLORS = {
  NORMAL: 0x374151,   // Gray
  SPAWN: 0x374151,    // Gray
  EXIT: 0x10b981,     // Green
  TREASURE: 0x6b5b1f, // Gold
  TRAP: 0x6b2020,     // Red
  SHRINE: 0x1e4a6b,   // Blue
  CHALLENGE: 0x4a1e6b // Purple
};
```

### Room Icons

| Room Type | Icon | Color |
|-----------|------|-------|
| Treasure | Box shape | Gold (gray when opened) |
| Shrine | Diamond shape | Cyan (gray when used) |
| Challenge | Circle | Purple |
| Trap | Triangle | Red |
| Exit | Arrow down | Green |

### Performance Optimization

- Tile-to-room mapping cached at construction
- Only visible tiles are drawn each frame
- Update interval: every 3 frames

### Example Usage

```typescript
class GameScene extends Phaser.Scene {
  private minimap!: MinimapUI;

  create() {
    this.minimap = new MinimapUI(this, this.dungeonData);
  }

  update() {
    this.minimap.update(this.player.x, this.player.y);
  }

  onChestOpen(room: Room) {
    this.minimap.markChestOpened(room.id);
  }
}
```

---

## DebugMenuUI

**File:** `/src/ui/DebugMenuUI.ts`

Developer debug menu for testing and cheats (F1 toggle).

### Interfaces

```typescript
interface DebugMenuCallbacks {
  getEnemies: () => Phaser.Physics.Arcade.Group;
  handleExitCollision: () => void;
  closeAndReturnToHub: () => void;
}
```

### Constructor

```typescript
constructor(
  scene: Phaser.Scene,
  player: Player,
  lootSystem: LootSystem,
  lootDropManager: LootDropManager,
  callbacks: DebugMenuCallbacks
)
```

### Public Methods

#### `setupControls(): void`

Sets up F1 key binding for menu toggle.

```typescript
debugMenu.setupControls();
```

#### `toggle(): void`

Toggles debug menu open/closed.

#### `close(): void`

Closes the debug menu.

#### `setFloorInfo(floor: number, currentWorld: SinWorld | null): void`

Updates floor/world info for debug options.

```typescript
debugMenu.setFloorInfo(this.floor, this.currentWorld);
```

#### `getIsDevMode(): boolean`

Returns whether god mode is enabled.

```typescript
if (debugMenu.getIsDevMode()) {
  // Skip damage application
}
```

#### `getIsVisible(): boolean`

Returns menu visibility state.

### Debug Options

| Key | Label | Action |
|-----|-------|--------|
| 1 | God Mode | Toggle invulnerability |
| 2 | Full Heal | Restore HP to max |
| 3 | Level Up x1 | Gain one level |
| 4 | Level Up x5 | Gain five levels |
| 5 | Add 500 Gold | Add gold to player |
| 6 | Spawn Epic Loot | Drop epic item near player |
| 7 | Spawn Rare Loot | Drop rare item near player |
| 8 | Kill All Enemies | Defeat all active enemies |
| 9 | Skip to Next Floor | Trigger exit |
| 0 | Jump to Boss Floor | Skip to boss encounter |
| C | Complete Current World | Mark world as beaten |
| A | Complete All Worlds | Unlock all worlds |
| H | Return to Hub | Exit to hub scene |

### Example Usage

```typescript
class GameScene extends Phaser.Scene {
  private debugMenu!: DebugMenuUI;

  create() {
    this.debugMenu = new DebugMenuUI(
      this,
      this.player,
      this.lootSystem,
      this.lootDropManager,
      {
        getEnemies: () => this.enemies,
        handleExitCollision: () => this.goToNextFloor(),
        closeAndReturnToHub: () => this.returnToHub()
      }
    );
    this.debugMenu.setupControls();
  }

  update() {
    this.debugMenu.setFloorInfo(this.floor, this.currentWorld);
  }
}
```

---

## LoreUIManager

**File:** `/src/ui/LoreUIManager.ts`

Manages lore discovery system including tablets, scratches, and whispers.

### Constructor

```typescript
constructor(
  scene: Phaser.Scene,
  player: Player,
  loreSystem: LoreSystem,
  audioSystem: AudioSystem,
  floor: number
)
```

### Public Methods

#### `create(): void`

Initializes the lore system and creates the interaction prompt.

```typescript
loreManager.create();
```

#### `getLoreObjects(): Phaser.Physics.Arcade.Group`

Returns the physics group containing all lore objects.

```typescript
const loreGroup = loreManager.getLoreObjects();
```

#### `getLorePrompt(): Phaser.GameObjects.Text`

Returns the "[Q] Read" prompt text object.

#### `hasActiveModal(): boolean`

Returns whether a lore modal is currently open.

#### `closeModal(): void`

Closes any open lore modal.

#### `tryAddLoreObject(room: Room): void`

Attempts to add a lore object to a room (20% chance).

```typescript
rooms.forEach(room => loreManager.tryAddLoreObject(room));
```

#### `addLoreObject(room: Room, forcedType?: 'tablet' | 'scratch' | 'whisper'): void`

Forcibly adds a lore object to a room.

```typescript
loreManager.addLoreObject(shrineRoom, 'tablet');
```

#### `tryInteractWithLore(): void`

Attempts to interact with nearby lore object.

```typescript
// On 'Q' key press
loreManager.tryInteractWithLore();
```

#### `updateLorePrompt(): void`

Updates visibility and text of the interaction prompt.

```typescript
// In update loop
loreManager.updateLorePrompt();
```

#### `destroy(): void`

Full cleanup.

### Lore Types

| Type | Texture | Visual Effect | Interaction |
|------|---------|---------------|-------------|
| Tablet | `lore_tablet` | Glowing light, pulsing | Opens modal dialog |
| Scratch | `lore_scratch` | Faint, static | Floating text |
| Whisper | `lore_whisper` | Floating, fading | Floating italic text |

### Example Usage

```typescript
class GameScene extends Phaser.Scene {
  private loreManager!: LoreUIManager;

  create() {
    this.loreManager = new LoreUIManager(
      this,
      this.player,
      this.loreSystem,
      this.audioSystem,
      this.floor
    );
    this.loreManager.create();

    // Add lore to dungeon rooms
    this.dungeonData.rooms.forEach(room => {
      this.loreManager.tryAddLoreObject(room);
    });

    // Setup Q key for interaction
    this.input.keyboard?.on('keydown-Q', () => {
      this.loreManager.tryInteractWithLore();
    });
  }

  update() {
    this.loreManager.updateLorePrompt();
  }
}
```

---

## Common Patterns

### Modal Panel Creation

All modal UIs follow this pattern:

```typescript
show(): void {
  // 1. Clean up existing panel
  if (this.panel) {
    this.panel.destroy();
    this.panel = null;
  }

  this.isVisible = true;

  const cam = this.scene.cameras.main;
  const centerX = cam.scrollX + cam.width / 2;
  const centerY = cam.scrollY + cam.height / 2;

  // 2. Create overlay (starts transparent)
  this.overlay = this.scene.add.rectangle(
    centerX, centerY,
    cam.width * 2, cam.height * 2,
    0x000000, 0
  );
  this.overlay.setDepth(199);

  // 3. Create panel (starts off-screen)
  this.panel = this.scene.add.container(centerX, centerY + cam.height);
  this.panel.setDepth(200);
  this.panel.setAlpha(0);

  // 4. Add panel contents
  this.createPanel();

  // 5. Animate in
  this.scene.tweens.add({
    targets: this.overlay,
    fillAlpha: 0.75,
    duration: 150,
    ease: 'Sine.easeOut'
  });

  this.scene.tweens.add({
    targets: this.panel,
    y: centerY,
    alpha: 1,
    duration: 200,
    ease: 'Back.easeOut'
  });
}
```

### Corner Accents

```typescript
private drawCornerAccents(halfW: number, halfH: number, color: number = 0xff6600): void {
  const corners = this.scene.add.graphics();
  corners.lineStyle(2, color, 0.9);
  const size = 14;

  // Top-left
  corners.beginPath();
  corners.moveTo(-halfW, -halfH + size);
  corners.lineTo(-halfW, -halfH);
  corners.lineTo(-halfW + size, -halfH);
  corners.strokePath();

  // Top-right
  corners.beginPath();
  corners.moveTo(halfW - size, -halfH);
  corners.lineTo(halfW, -halfH);
  corners.lineTo(halfW, -halfH + size);
  corners.strokePath();

  // ... bottom corners similarly

  this.panel.add(corners);
}
```

### Visibility Toggle Pattern

```typescript
toggle(): void {
  if (this.isVisible) {
    this.hide();
  } else {
    this.show();
  }
}

getIsVisible(): boolean {
  return this.isVisible;
}
```

---

## Event Handling

### Scene Events Used

| Event | Emitter | Listeners |
|-------|---------|-----------|
| `itemPickup` | GameScene | InventoryUI |
| `equipmentChanged` | Player/Inventory | InventoryUI, GameHUD |
| `keydown` | Input.Keyboard | All modal UIs (ESC to close) |

### Event Cleanup Pattern

```typescript
class ExampleUI {
  private eventHandler: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    // Store handler reference
    this.eventHandler = () => this.refresh();
    scene.events.on('someEvent', this.eventHandler);
  }

  destroy(): void {
    // Remove handler using stored reference
    if (this.eventHandler) {
      this.scene.events.off('someEvent', this.eventHandler);
      this.eventHandler = null;
    }
  }
}
```

### Keyboard Input Setup

```typescript
private setupInput(): void {
  this.keyListener = (event: KeyboardEvent) => {
    if (!this.isVisible) return;

    if (event.code === 'Escape') {
      event.preventDefault();
      this.hide();
    }
  };

  this.scene.input.keyboard?.on('keydown', this.keyListener);
}

hide(): void {
  if (this.keyListener) {
    this.scene.input.keyboard?.off('keydown', this.keyListener);
    this.keyListener = null;
  }
  // ... rest of cleanup
}
```

---

## Usage Examples

### Complete UI Manager Setup

```typescript
class GameScene extends Phaser.Scene {
  // UI Components
  private hud!: GameHUD;
  private inventoryUI!: InventoryUI;
  private shopUI: ShopUI | null = null;
  private dialogueUI!: DialogueUI;
  private levelUpUI!: LevelUpUI;
  private settingsUI!: SettingsUI;
  private minimap!: MinimapUI;
  private debugMenu!: DebugMenuUI;
  private loreManager!: LoreUIManager;

  create() {
    // Initialize all UI components
    this.hud = new GameHUD(this, this.player);
    this.hud.create();

    this.inventoryUI = new InventoryUI(this, this.player);
    this.dialogueUI = new DialogueUI(this);
    this.levelUpUI = new LevelUpUI(this, this.player);
    this.settingsUI = new SettingsUI(this, this.audioSystem);
    this.minimap = new MinimapUI(this, this.dungeonData);

    this.debugMenu = new DebugMenuUI(
      this, this.player, this.lootSystem, this.lootDropManager,
      { getEnemies: () => this.enemies, /* ... */ }
    );
    this.debugMenu.setupControls();

    this.loreManager = new LoreUIManager(
      this, this.player, this.loreSystem, this.audioSystem, this.floor
    );
    this.loreManager.create();

    this.setupUIControls();
  }

  private setupUIControls(): void {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;

    keyboard.on('keydown-E', () => {
      if (!this.isModalOpen()) this.inventoryUI.toggle();
    });

    keyboard.on('keydown-L', () => {
      if (!this.isModalOpen()) this.levelUpUI.show();
    });

    keyboard.on('keydown-ESC', () => {
      if (this.isModalOpen()) {
        this.closeAllModals();
      } else {
        this.settingsUI.toggle();
      }
    });

    keyboard.on('keydown-Q', () => {
      if (!this.isModalOpen()) {
        this.loreManager.tryInteractWithLore();
      }
    });
  }

  private isModalOpen(): boolean {
    return this.inventoryUI.getIsVisible() ||
           this.levelUpUI.getIsVisible() ||
           this.settingsUI.getIsVisible() ||
           this.dialogueUI.getIsVisible() ||
           this.loreManager.hasActiveModal() ||
           this.shopUI?.getIsVisible() ||
           this.debugMenu.getIsVisible();
  }

  private closeAllModals(): void {
    this.inventoryUI.hide();
    this.levelUpUI.hide();
    this.settingsUI.hide();
    this.dialogueUI.hide();
    this.loreManager.closeModal();
    this.shopUI?.close();
    this.debugMenu.close();
  }

  update() {
    this.hud.update(this.floor, this.currentWorld, this.isBossFloor, this.enemyCount);
    this.minimap.update(this.player.x, this.player.y);
    this.loreManager.updateLorePrompt();
    this.debugMenu.setFloorInfo(this.floor, this.currentWorld);
  }

  shutdown() {
    this.hud.destroy();
    this.inventoryUI.destroy();
    this.settingsUI.destroy();
    this.minimap.destroy();
    this.loreManager.destroy();
  }
}
```

### Creating a Custom UI Component

```typescript
export class CustomUI {
  private scene: Phaser.Scene;
  private panel: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isVisible: boolean = false;
  private keyListener: ((event: KeyboardEvent) => void) | null = null;

  private readonly PANEL_WIDTH = 400;
  private readonly PANEL_HEIGHT = 300;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(): void {
    if (this.panel) this.hide();
    this.isVisible = true;

    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    // Create overlay
    this.overlay = this.scene.add.rectangle(
      centerX, centerY,
      cam.width * 2, cam.height * 2,
      0x000000, 0
    );
    this.overlay.setDepth(199);

    // Create panel
    this.panel = this.scene.add.container(centerX, centerY + cam.height);
    this.panel.setDepth(200);
    this.panel.setAlpha(0);

    this.createPanel();
    this.setupInput();

    // Animate in
    this.scene.tweens.add({
      targets: this.overlay,
      fillAlpha: 0.75,
      duration: 150
    });

    this.scene.tweens.add({
      targets: this.panel,
      y: centerY,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
  }

  private createPanel(): void {
    if (!this.panel) return;

    const halfW = this.PANEL_WIDTH / 2;
    const halfH = this.PANEL_HEIGHT / 2;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a0a, 0.95);
    bg.fillRoundedRect(-halfW, -halfH, this.PANEL_WIDTH, this.PANEL_HEIGHT, 8);
    bg.lineStyle(1, 0x444444, 0.8);
    bg.strokeRoundedRect(-halfW, -halfH, this.PANEL_WIDTH, this.PANEL_HEIGHT, 8);
    this.panel.add(bg);

    // Add your content here
  }

  private setupInput(): void {
    this.keyListener = (event: KeyboardEvent) => {
      if (!this.isVisible) return;
      if (event.code === 'Escape') {
        event.preventDefault();
        this.hide();
      }
    };
    this.scene.input.keyboard?.on('keydown', this.keyListener);
  }

  hide(): void {
    if (this.keyListener) {
      this.scene.input.keyboard?.off('keydown', this.keyListener);
      this.keyListener = null;
    }

    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }

    this.isVisible = false;
  }

  toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }

  destroy(): void {
    this.hide();
  }
}
```

---

## Depth Layer Reference

| Depth | Usage |
|-------|-------|
| 3 | Lore objects (world space) |
| 100 | HUD, Minimap |
| 199 | Modal overlays |
| 200 | Modal panels |
| 249 | Level-up overlay |
| 250 | Level-up panel |
| 251 | Tooltips |
| 300 | Lore modals, dev messages |
| 400 | Dialogue UI |
| 500 | Debug menu |

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/dungeon-crawler-ui.svg "Repobeats analytics image")
