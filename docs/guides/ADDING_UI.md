# Adding UI Components

A comprehensive guide for implementing new UI components in the dungeon crawler game.

## Table of Contents

1. [UI System Overview](#ui-system-overview)
2. [Common Patterns and Styling](#common-patterns-and-styling)
3. [Creating Modal Dialogs](#creating-modal-dialogs)
4. [Creating HUD Elements](#creating-hud-elements)
5. [Input Handling and Focus](#input-handling-and-focus)
6. [Cleanup and Event Management](#cleanup-and-event-management)
7. [Complete Code Example](#complete-code-example)
8. [Testing Checklist](#testing-checklist)

---

## UI System Overview

### Architecture

The UI system is built on Phaser 3's game object hierarchy. There are two primary UI categories:

| Type | Purpose | Example | Scroll Behavior |
|------|---------|---------|-----------------|
| **Modal Dialogs** | Full-screen overlays that pause gameplay | `InventoryUI`, `ShopUI`, `SettingsUI` | Fixed to camera (world-space positioning) |
| **HUD Elements** | Always-visible interface elements | `GameHUD`, `MinimapUI` | `setScrollFactor(0)` |

### Key Concepts

- **Containers**: All UI elements are organized in `Phaser.GameObjects.Container` for easy positioning and cleanup
- **Depth Layering**: UI uses depth values 100+ (HUD) to 400+ (dialogs) to stay above game elements
- **Camera-Relative Positioning**: Modal dialogs position relative to camera scroll for world-space rendering
- **Event-Driven Updates**: UI components listen for scene events to refresh their state

### Depth Conventions

```typescript
// Depth layering conventions
const DEPTH = {
  HUD: 100,           // GameHUD, MinimapUI
  OVERLAY: 199,       // Modal background overlays
  MODAL_PANEL: 200,   // Modal dialog panels
  TOOLTIP: 251,       // Tooltips (above modals)
  DIALOGUE: 400,      // Dialogue UI (highest priority)
};
```

---

## Common Patterns and Styling

### Design System

The game uses a consistent dark theme with orange accent colors:

```typescript
// Color palette
const COLORS = {
  // Backgrounds
  BG_DARK: 0x0a0a0a,       // Main panel backgrounds
  BG_MEDIUM: 0x1a1a1a,     // Secondary backgrounds, headers
  BG_LIGHT: 0x2a2a2a,      // Hover states

  // Borders and accents
  BORDER_DARK: 0x333333,   // Default borders
  BORDER_MEDIUM: 0x444444, // Panel outlines
  BORDER_LIGHT: 0x666666,  // Hover borders
  ACCENT_ORANGE: 0xff6600, // Primary accent (corners, highlights)
  ACCENT_PURPLE: 0x8b5cf6, // Level-up accent

  // Text colors (hex strings)
  TEXT_WHITE: '#ffffff',
  TEXT_GRAY: '#aaaaaa',
  TEXT_MUTED: '#888888',
  TEXT_DARK: '#666666',
  TEXT_ACCENT: '#ff6600',

  // Status colors
  SUCCESS: 0x44ff44,
  ERROR: 0xff4444,
  GOLD: 0xffd700,
};
```

### Typography

```typescript
// Font families
const FONTS = {
  HEADING: 'Cinzel, Georgia, serif',     // Titles, headers
  BODY: 'Roboto Mono, Courier New, monospace', // General text
};

// Common text styles
const textStyles = {
  title: { fontSize: '18px', fontFamily: FONTS.HEADING, color: '#ffffff' },
  label: { fontSize: '12px', fontFamily: FONTS.BODY, color: '#888888' },
  body: { fontSize: '11px', fontFamily: FONTS.BODY, color: '#cccccc' },
  hint: { fontSize: '9px', fontFamily: FONTS.BODY, color: '#666666' },
};
```

### Panel Background

All modal panels follow this pattern:

```typescript
private createPanelBackground(width: number, height: number): Phaser.GameObjects.Graphics {
  const bg = this.scene.add.graphics();

  // Fill with dark background
  bg.fillStyle(0x0a0a0a, 0.95);
  bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);

  // Border
  bg.lineStyle(1, 0x444444, 0.8);
  bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);

  return bg;
}
```

### Corner Accents

A signature visual element - orange L-shaped corners:

```typescript
private drawCornerAccents(halfW: number, halfH: number, color: number = 0xff6600): void {
  const corners = this.scene.add.graphics();
  corners.lineStyle(2, color, 0.9);
  const cornerSize = 14;

  // Top-left
  corners.beginPath();
  corners.moveTo(-halfW, -halfH + cornerSize);
  corners.lineTo(-halfW, -halfH);
  corners.lineTo(-halfW + cornerSize, -halfH);
  corners.strokePath();

  // Top-right
  corners.beginPath();
  corners.moveTo(halfW - cornerSize, -halfH);
  corners.lineTo(halfW, -halfH);
  corners.lineTo(halfW, -halfH + cornerSize);
  corners.strokePath();

  // Bottom-left
  corners.beginPath();
  corners.moveTo(-halfW, halfH - cornerSize);
  corners.lineTo(-halfW, halfH);
  corners.lineTo(-halfW + cornerSize, halfH);
  corners.strokePath();

  // Bottom-right
  corners.beginPath();
  corners.moveTo(halfW - cornerSize, halfH);
  corners.lineTo(halfW, halfH);
  corners.lineTo(halfW, halfH - cornerSize);
  corners.strokePath();

  this.container!.add(corners);
}
```

### Header with Close Button

Standard modal header pattern:

```typescript
private createHeader(halfW: number, halfH: number, title: string): void {
  // Header background strip
  const headerBg = this.scene.add.graphics();
  headerBg.fillStyle(0x1a1a1a, 0.8);
  headerBg.fillRect(-halfW + 15, -halfH + 15, this.PANEL_WIDTH - 30, 40);
  this.container!.add(headerBg);

  // Diamond accent
  const accent = this.scene.add.text(-halfW + 25, -halfH + 35, '\u25C6', {
    fontSize: '14px',
    color: '#ff6600',
  });
  accent.setOrigin(0, 0.5);
  this.container!.add(accent);

  // Title
  const titleText = this.scene.add.text(-halfW + 45, -halfH + 35, title, {
    fontSize: '18px',
    fontFamily: 'Cinzel, Georgia, serif',
    color: '#ffffff',
  });
  titleText.setOrigin(0, 0.5);
  this.container!.add(titleText);

  // Close button
  const closeBtn = this.scene.add.text(halfW - 35, -halfH + 35, '\u2715', {
    fontSize: '16px',
    fontFamily: 'Roboto Mono, Courier New, monospace',
    color: '#666666',
  });
  closeBtn.setOrigin(0.5, 0.5);
  closeBtn.setInteractive({ useHandCursor: true });
  closeBtn.on('pointerover', () => closeBtn.setColor('#ff4444'));
  closeBtn.on('pointerout', () => closeBtn.setColor('#666666'));
  closeBtn.on('pointerdown', () => this.hide());
  this.container!.add(closeBtn);
}
```

### Interactive Buttons

Reusable button creation pattern:

```typescript
private createButton(
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  color: number,
  onClick: () => void
): Phaser.GameObjects.Container {
  const container = this.scene.add.container(x, y);

  // Background
  const bg = this.scene.add.graphics();
  bg.fillStyle(color, 0.9);
  bg.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
  bg.lineStyle(1, 0x666666, 0.5);
  bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);
  container.add(bg);

  // Small corner accents
  const corners = this.scene.add.graphics();
  corners.lineStyle(1, 0xff6600, 0.7);
  const cs = 6;
  const hw = width / 2, hh = height / 2;

  corners.beginPath();
  corners.moveTo(-hw, -hh + cs);
  corners.lineTo(-hw, -hh);
  corners.lineTo(-hw + cs, -hh);
  corners.strokePath();

  corners.beginPath();
  corners.moveTo(hw - cs, -hh);
  corners.lineTo(hw, -hh);
  corners.lineTo(hw, -hh + cs);
  corners.strokePath();
  container.add(corners);

  // Label
  const text = this.scene.add.text(0, 0, label, {
    fontSize: '12px',
    fontFamily: 'Roboto Mono, Courier New, monospace',
    color: '#ffffff',
  });
  text.setOrigin(0.5, 0.5);
  container.add(text);

  // Hit area with hover effects
  const hitArea = this.scene.add.rectangle(0, 0, width, height, 0xffffff, 0);
  hitArea.setInteractive({ useHandCursor: true });

  hitArea.on('pointerover', () => {
    bg.clear();
    bg.fillStyle(this.lightenColor(color), 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
    bg.lineStyle(1, 0xff6600, 0.8);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);
  });

  hitArea.on('pointerout', () => {
    bg.clear();
    bg.fillStyle(color, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
    bg.lineStyle(1, 0x666666, 0.5);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);
  });

  hitArea.on('pointerdown', onClick);
  container.add(hitArea);

  return container;
}

private lightenColor(color: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + 40);
  const g = Math.min(255, ((color >> 8) & 0xff) + 40);
  const b = Math.min(255, (color & 0xff) + 40);
  return (r << 16) | (g << 8) | b;
}
```

---

## Creating Modal Dialogs

Modal dialogs are full-screen overlays that capture input and pause normal gameplay interaction.

### Essential Structure

```typescript
import Phaser from 'phaser';

export class ExampleModalUI {
  private scene: Phaser.Scene;
  private panel: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isVisible: boolean = false;
  private keyListener: ((event: KeyboardEvent) => void) | null = null;

  // Panel dimensions
  private readonly PANEL_WIDTH = 400;
  private readonly PANEL_HEIGHT = 300;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(): void {
    // Clean up any existing panel first
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }

    this.isVisible = true;

    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    // Background overlay - start transparent for animation
    this.overlay = this.scene.add.rectangle(
      centerX, centerY,
      cam.width * 2, cam.height * 2,
      0x000000, 0
    );
    this.overlay.setDepth(199);

    // Create panel off-screen for slide animation
    this.panel = this.scene.add.container(centerX, centerY + cam.height);
    this.panel.setDepth(200);
    this.panel.setAlpha(0);

    this.createPanel();
    this.setupInput();

    // Animate in
    this.scene.tweens.add({
      targets: this.overlay,
      fillAlpha: 0.8,
      duration: 150,
      ease: 'Sine.easeOut',
    });
    this.scene.tweens.add({
      targets: this.panel,
      y: centerY,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
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

    // Add corner accents, header, content...
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
    this.isVisible = false;

    // Clean up keyboard listener
    if (this.keyListener) {
      this.scene.input.keyboard?.off('keydown', this.keyListener);
      this.keyListener = null;
    }

    // Destroy UI elements
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
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

### With Animated Close

For smoother UX, animate the panel out:

```typescript
hide(): void {
  if (!this.isVisible) return;
  this.isVisible = false;

  if (this.keyListener) {
    this.scene.input.keyboard?.off('keydown', this.keyListener);
    this.keyListener = null;
  }

  // Animate out, then destroy
  if (this.panel) {
    this.scene.tweens.add({
      targets: this.panel,
      scale: 0.8,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        this.panel?.destroy();
        this.panel = null;
        this.overlay?.destroy();
        this.overlay = null;
      },
    });
  }
}
```

---

## Creating HUD Elements

HUD elements stay fixed on screen and update in real-time.

### Key Differences from Modals

1. Use `setScrollFactor(0)` to lock to screen position
2. Position relative to screen coordinates, not world coordinates
3. Provide an `update()` method for the game loop
4. Lower depth values (100 range)

### Basic HUD Pattern

```typescript
export class ExampleHUD {
  private scene: Phaser.Scene;
  private container!: Phaser.GameObjects.Container;
  private valueText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  create(): void {
    // Position in screen space (top-right corner)
    const cam = this.scene.cameras.main;

    this.container = this.scene.add.container(cam.width - 100, 20);
    this.container.setScrollFactor(0);  // CRITICAL: Locks to screen
    this.container.setDepth(100);

    // Background panel
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(0, 0, 90, 40, 4);
    bg.lineStyle(1, 0x444444, 0.6);
    bg.strokeRoundedRect(0, 0, 90, 40, 4);
    this.container.add(bg);

    // Corner accent
    const corner = this.scene.add.graphics();
    corner.lineStyle(2, 0xff6600, 0.7);
    corner.beginPath();
    corner.moveTo(90, 30);
    corner.lineTo(90, 40);
    corner.lineTo(80, 40);
    corner.strokePath();
    this.container.add(corner);

    // Value display
    this.valueText = this.scene.add.text(45, 20, '0', {
      fontSize: '14px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#ffffff',
    });
    this.valueText.setOrigin(0.5, 0.5);
    this.container.add(this.valueText);
  }

  update(value: number): void {
    this.valueText.setText(`${value}`);
  }

  destroy(): void {
    this.container.destroy();
  }
}
```

### Progress Bars

Common pattern for HP/XP bars:

```typescript
private createProgressBar(
  x: number,
  y: number,
  width: number,
  height: number
): { bg: Phaser.GameObjects.Graphics; fill: Phaser.GameObjects.Graphics } {
  // Background track
  const bg = this.scene.add.graphics();
  bg.fillStyle(0x1a1a1a, 1);
  bg.fillRoundedRect(x, y, width, height, 2);
  bg.lineStyle(1, 0x333333, 1);
  bg.strokeRoundedRect(x, y, width, height, 2);
  this.container.add(bg);

  // Fill (updates dynamically)
  const fill = this.scene.add.graphics();
  this.container.add(fill);

  return { bg, fill };
}

private updateProgressBar(
  fill: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  percent: number,
  color: number
): void {
  fill.clear();
  if (percent > 0) {
    fill.fillStyle(color, 1);
    fill.fillRoundedRect(x, y, Math.max(2, width * percent), height, 2);
  }
}
```

---

## Input Handling and Focus

### Keyboard Event Management

**Important**: Always store listener references for cleanup.

```typescript
// Store reference to listener
private keyListener: ((event: KeyboardEvent) => void) | null = null;

private setupInput(): void {
  this.keyListener = (event: KeyboardEvent) => {
    if (!this.isVisible) return;

    switch (event.code) {
      case 'Escape':
        event.preventDefault();
        this.hide();
        break;
      case 'Enter':
      case 'Space':
        event.preventDefault();
        this.confirm();
        break;
    }
  };

  this.scene.input.keyboard?.on('keydown', this.keyListener);
}

// In hide() or destroy():
if (this.keyListener) {
  this.scene.input.keyboard?.off('keydown', this.keyListener);
  this.keyListener = null;
}
```

### Interactive Hit Areas

Use invisible rectangles for consistent click detection:

```typescript
private createInteractiveSlot(x: number, y: number, size: number): void {
  const slotContainer = this.scene.add.container(x, y);

  // Visual elements (graphics, sprites, text)
  const bg = this.scene.add.graphics();
  bg.fillStyle(0x1a1a1a, 1);
  bg.fillRoundedRect(-size/2, -size/2, size, size, 4);
  slotContainer.add(bg);

  // Invisible hit area on top
  const hitArea = this.scene.add.rectangle(0, 0, size, size, 0x000000, 0);
  hitArea.setInteractive({ useHandCursor: true });

  hitArea.on('pointerover', () => {
    bg.clear();
    bg.fillStyle(0x2a2a2a, 1);
    bg.fillRoundedRect(-size/2, -size/2, size, size, 4);
    bg.lineStyle(2, 0xff6600, 0.8);
    bg.strokeRoundedRect(-size/2, -size/2, size, size, 4);
  });

  hitArea.on('pointerout', () => {
    bg.clear();
    bg.fillStyle(0x1a1a1a, 1);
    bg.fillRoundedRect(-size/2, -size/2, size, size, 4);
  });

  hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    // Handle click, check modifiers
    if (pointer.event.shiftKey) {
      this.handleShiftClick();
    } else {
      this.handleClick();
    }
  });

  slotContainer.add(hitArea);
  this.container!.add(slotContainer);
}
```

### Drag Support

For sliders and draggable elements:

```typescript
const hitArea = this.scene.add.rectangle(x, y, width, height, 0xffffff, 0);
hitArea.setInteractive({ useHandCursor: true, draggable: true });

hitArea.on('drag', (pointer: Phaser.Input.Pointer) => {
  const localX = pointer.x - this.panel!.x;
  const value = Phaser.Math.Clamp(localX / this.SLIDER_WIDTH, 0, 1);
  this.updateSliderValue(value);
});
```

---

## Cleanup and Event Management

Proper cleanup prevents memory leaks and ghost event handlers.

### Event Handler Pattern

```typescript
export class ExampleUI {
  private scene: Phaser.Scene;

  // Store ALL handler references
  private keyListener: ((event: KeyboardEvent) => void) | null = null;
  private itemPickupHandler: (() => void) | null = null;
  private equipmentChangedHandler: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Register scene event handlers
    this.itemPickupHandler = () => this.refresh();
    this.equipmentChangedHandler = () => this.refresh();

    scene.events.on('itemPickup', this.itemPickupHandler);
    scene.events.on('equipmentChanged', this.equipmentChangedHandler);
  }

  // ... show(), hide() methods ...

  destroy(): void {
    this.hide();  // Clean up UI elements

    // Clean up scene event listeners
    if (this.itemPickupHandler) {
      this.scene.events.off('itemPickup', this.itemPickupHandler);
      this.itemPickupHandler = null;
    }
    if (this.equipmentChangedHandler) {
      this.scene.events.off('equipmentChanged', this.equipmentChangedHandler);
      this.equipmentChangedHandler = null;
    }
  }
}
```

### Cleanup Checklist

```typescript
destroy(): void {
  // 1. Remove keyboard listeners
  if (this.keyListener) {
    this.scene.input.keyboard?.off('keydown', this.keyListener);
    this.keyListener = null;
  }

  // 2. Remove scene event listeners
  if (this.someEventHandler) {
    this.scene.events.off('eventName', this.someEventHandler);
    this.someEventHandler = null;
  }

  // 3. Stop any running tweens (optional - container.destroy() handles children)
  // this.scene.tweens.killTweensOf(this.container);

  // 4. Stop any timers
  if (this.someTimer) {
    this.someTimer.destroy();
    this.someTimer = null;
  }

  // 5. Destroy containers (this destroys all children)
  if (this.container) {
    this.container.destroy();
    this.container = null;
  }
  if (this.overlay) {
    this.overlay.destroy();
    this.overlay = null;
  }
  if (this.tooltipContainer) {
    this.tooltipContainer.destroy();
    this.tooltipContainer = null;
  }

  // 6. Clear any arrays/maps storing references
  this.itemSlots = [];
  this.equipmentSlots.clear();

  // 7. Null out text/graphics references
  this.someText = null;

  // 8. Reset state
  this.isVisible = false;
}
```

---

## Complete Code Example

Here is a complete, production-ready example of a confirmation dialog:

```typescript
import Phaser from 'phaser';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

export class ConfirmDialogUI {
  private scene: Phaser.Scene;
  private panel: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isVisible: boolean = false;
  private keyListener: ((event: KeyboardEvent) => void) | null = null;
  private options: ConfirmDialogOptions | null = null;

  private readonly PANEL_WIDTH = 360;
  private readonly PANEL_HEIGHT = 180;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  show(options: ConfirmDialogOptions): void {
    // Clean up any existing dialog
    if (this.panel) {
      this.hide();
    }

    this.options = options;
    this.isVisible = true;

    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    // Semi-transparent overlay
    this.overlay = this.scene.add.rectangle(
      centerX, centerY,
      cam.width * 2, cam.height * 2,
      0x000000, 0
    );
    this.overlay.setDepth(299);
    this.overlay.setInteractive(); // Block clicks through overlay

    // Main panel - start off-screen
    this.panel = this.scene.add.container(centerX, centerY + cam.height);
    this.panel.setDepth(300);
    this.panel.setAlpha(0);

    this.createPanel();
    this.setupInput();

    // Animate in
    this.scene.tweens.add({
      targets: this.overlay,
      fillAlpha: 0.85,
      duration: 150,
      ease: 'Sine.easeOut',
    });
    this.scene.tweens.add({
      targets: this.panel,
      y: centerY,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private createPanel(): void {
    if (!this.panel || !this.options) return;

    const halfW = this.PANEL_WIDTH / 2;
    const halfH = this.PANEL_HEIGHT / 2;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a0a, 0.95);
    bg.fillRoundedRect(-halfW, -halfH, this.PANEL_WIDTH, this.PANEL_HEIGHT, 8);
    bg.lineStyle(1, 0x444444, 0.8);
    bg.strokeRoundedRect(-halfW, -halfH, this.PANEL_WIDTH, this.PANEL_HEIGHT, 8);
    this.panel.add(bg);

    // Corner accents
    this.drawCornerAccents(halfW, halfH);

    // Header strip
    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(0x1a1a1a, 0.8);
    headerBg.fillRect(-halfW + 15, -halfH + 15, this.PANEL_WIDTH - 30, 36);
    this.panel.add(headerBg);

    // Title with accent
    const accent = this.scene.add.text(-halfW + 25, -halfH + 33, '\u25C6', {
      fontSize: '12px',
      color: '#ff6600',
    });
    accent.setOrigin(0, 0.5);
    this.panel.add(accent);

    const title = this.scene.add.text(-halfW + 42, -halfH + 33, this.options.title.toUpperCase(), {
      fontSize: '14px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ffffff',
    });
    title.setOrigin(0, 0.5);
    this.panel.add(title);

    // Message
    const message = this.scene.add.text(0, -10, this.options.message, {
      fontSize: '12px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#cccccc',
      align: 'center',
      wordWrap: { width: this.PANEL_WIDTH - 60 },
    });
    message.setOrigin(0.5, 0.5);
    this.panel.add(message);

    // Buttons
    const buttonY = halfH - 35;
    const buttonWidth = 100;
    const buttonHeight = 32;
    const buttonGap = 20;

    // Cancel button
    this.createButton(
      -buttonWidth / 2 - buttonGap / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      this.options.cancelText || 'Cancel',
      0x4a1a1a,
      () => this.handleCancel()
    );

    // Confirm button
    this.createButton(
      buttonWidth / 2 + buttonGap / 2,
      buttonY,
      buttonWidth,
      buttonHeight,
      this.options.confirmText || 'Confirm',
      0x1a4a1a,
      () => this.handleConfirm()
    );
  }

  private drawCornerAccents(halfW: number, halfH: number): void {
    if (!this.panel) return;

    const corners = this.scene.add.graphics();
    corners.lineStyle(2, 0xff6600, 0.9);
    const size = 12;

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

    // Bottom-left
    corners.beginPath();
    corners.moveTo(-halfW, halfH - size);
    corners.lineTo(-halfW, halfH);
    corners.lineTo(-halfW + size, halfH);
    corners.strokePath();

    // Bottom-right
    corners.beginPath();
    corners.moveTo(halfW - size, halfH);
    corners.lineTo(halfW, halfH);
    corners.lineTo(halfW, halfH - size);
    corners.strokePath();

    this.panel.add(corners);
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    color: number,
    onClick: () => void
  ): void {
    if (!this.panel) return;

    const container = this.scene.add.container(x, y);

    const bg = this.scene.add.graphics();
    bg.fillStyle(color, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
    bg.lineStyle(1, 0x666666, 0.5);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);
    container.add(bg);

    // Corner accents
    const corners = this.scene.add.graphics();
    corners.lineStyle(1, 0xff6600, 0.7);
    const cs = 5;
    const hw = width / 2, hh = height / 2;
    corners.beginPath();
    corners.moveTo(-hw, -hh + cs);
    corners.lineTo(-hw, -hh);
    corners.lineTo(-hw + cs, -hh);
    corners.strokePath();
    corners.beginPath();
    corners.moveTo(hw - cs, -hh);
    corners.lineTo(hw, -hh);
    corners.lineTo(hw, -hh + cs);
    corners.strokePath();
    container.add(corners);

    const text = this.scene.add.text(0, 0, label, {
      fontSize: '11px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#ffffff',
    });
    text.setOrigin(0.5, 0.5);
    container.add(text);

    const hitArea = this.scene.add.rectangle(0, 0, width, height, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });

    hitArea.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(this.lightenColor(color), 0.9);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
      bg.lineStyle(1, 0xff6600, 0.8);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);
    });

    hitArea.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(color, 0.9);
      bg.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
      bg.lineStyle(1, 0x666666, 0.5);
      bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);
    });

    hitArea.on('pointerdown', onClick);
    container.add(hitArea);

    this.panel.add(container);
  }

  private lightenColor(color: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) + 40);
    const g = Math.min(255, ((color >> 8) & 0xff) + 40);
    const b = Math.min(255, (color & 0xff) + 40);
    return (r << 16) | (g << 8) | b;
  }

  private setupInput(): void {
    this.keyListener = (event: KeyboardEvent) => {
      if (!this.isVisible) return;

      switch (event.code) {
        case 'Escape':
          event.preventDefault();
          this.handleCancel();
          break;
        case 'Enter':
          event.preventDefault();
          this.handleConfirm();
          break;
      }
    };

    this.scene.input.keyboard?.on('keydown', this.keyListener);
  }

  private handleConfirm(): void {
    const callback = this.options?.onConfirm;
    this.hide();
    callback?.();
  }

  private handleCancel(): void {
    const callback = this.options?.onCancel;
    this.hide();
    callback?.();
  }

  hide(): void {
    this.isVisible = false;

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

    this.options = null;
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }

  destroy(): void {
    this.hide();
  }
}
```

### Usage Example

```typescript
// In your scene or game logic:
const confirmDialog = new ConfirmDialogUI(this.scene);

confirmDialog.show({
  title: 'Quit Game',
  message: 'Are you sure you want to quit?\nAll unsaved progress will be lost.',
  confirmText: 'Quit',
  cancelText: 'Stay',
  onConfirm: () => {
    this.scene.scene.start('MainMenuScene');
  },
  onCancel: () => {
    console.log('User cancelled');
  },
});
```

---

## Testing Checklist

Use this checklist when implementing new UI components:

### Visual Tests

- [ ] Panel appears centered on screen
- [ ] Corner accents display correctly at all four corners
- [ ] Text is readable and properly styled
- [ ] Colors match the design system
- [ ] Hover effects work on all interactive elements
- [ ] Animations are smooth (fade in, slide in)
- [ ] UI looks correct at different screen sizes

### Interaction Tests

- [ ] Clicking buttons triggers correct actions
- [ ] ESC key closes the modal
- [ ] Other keyboard shortcuts work as documented
- [ ] Clicking outside modal (on overlay) does not accidentally trigger actions
- [ ] Modifier keys (Shift, Ctrl) work for special interactions
- [ ] Cursor changes to hand pointer on interactive elements

### State Management Tests

- [ ] `show()` can be called multiple times without issues
- [ ] `hide()` properly cleans up all elements
- [ ] `getIsVisible()` returns correct state
- [ ] State updates (e.g., `refresh()`) display correctly

### Cleanup Tests

- [ ] No console errors when opening/closing rapidly
- [ ] Scene change does not leave orphan listeners
- [ ] `destroy()` properly removes all event handlers
- [ ] No memory leaks (check with Phaser debug tools)

### Edge Cases

- [ ] Empty data states display appropriately
- [ ] Very long text wraps or truncates correctly
- [ ] Extreme values (0, max) display correctly
- [ ] Works when called before scene is fully ready
- [ ] Multiple modals don't conflict (if applicable)

### Integration Tests

- [ ] Game pauses appropriately when modal is open
- [ ] Player input is blocked when modal is open
- [ ] Events properly propagate to parent systems
- [ ] Audio/music continues or pauses as expected

---

## Quick Reference

### File Location

New UI components should be placed in:
```
src/ui/YourComponentUI.ts
```

### Required Imports

```typescript
import Phaser from 'phaser';
// Import any needed game types
import { Player } from '../entities/Player';
```

### Essential Methods

| Method | Purpose |
|--------|---------|
| `constructor(scene, ...)` | Store references, set up persistent listeners |
| `show()` | Create UI elements, set up input |
| `hide()` | Remove UI elements, clean up input |
| `getIsVisible()` | Return current visibility state |
| `destroy()` | Full cleanup, remove all listeners |

### Common Gotchas

1. **Forgetting `setScrollFactor(0)`** for HUD elements
2. **Not storing event handler references** - causes memory leaks
3. **Forgetting to call `event.preventDefault()`** - can cause unwanted browser behavior
4. **Using screen coordinates instead of camera-relative** for modals
5. **Not checking `if (!this.panel) return`** in create methods
6. **Creating interactive areas before visual elements** - they'll be hidden
