import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Item, ItemType, ItemRarity, RARITY_COLORS } from '../systems/Item';

export class InventoryUI {
  private scene: Phaser.Scene;
  private player: Player;
  private container: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isVisible: boolean = false;
  private tooltipContainer: Phaser.GameObjects.Container | null = null;

  private itemSlots: {
    bg: Phaser.GameObjects.Graphics;
    icon: Phaser.GameObjects.Sprite;
    compareIndicator: Phaser.GameObjects.Text;
    index: number;
  }[] = [];

  private equipmentSlots: Map<string, {
    bg: Phaser.GameObjects.Graphics;
    icon: Phaser.GameObjects.Sprite | null;
  }> = new Map();

  private readonly SLOT_SIZE = 40;
  private readonly SLOTS_PER_ROW = 7;
  private readonly SLOT_GAP = 5;

  // Event handler references for cleanup
  private itemPickupHandler: (() => void) | null = null;
  private equipmentChangedHandler: (() => void) | null = null;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    // Store handler references for cleanup
    this.itemPickupHandler = () => this.refresh();
    this.equipmentChangedHandler = () => this.refresh();
    scene.events.on('itemPickup', this.itemPickupHandler);
    scene.events.on('equipmentChanged', this.equipmentChangedHandler);
  }

  show(): void {
    if (this.container) {
      this.hide();
    }

    this.isVisible = true;
    this.itemSlots = [];
    this.equipmentSlots.clear();

    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    // Background overlay - start transparent for fade-in
    this.overlay = this.scene.add.rectangle(centerX, centerY, cam.width * 2, cam.height * 2, 0x000000, 0);
    this.overlay.setDepth(199);

    // Main container off-screen for slide-in animation
    const panelWidth = 480;
    const panelHeight = 340;
    this.container = this.scene.add.container(centerX, centerY + cam.height);
    this.container.setDepth(200);
    this.container.setAlpha(0);

    // Panel background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a0a, 0.95);
    bg.fillRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 8);
    bg.lineStyle(1, 0x444444, 0.8);
    bg.strokeRoundedRect(-panelWidth / 2, -panelHeight / 2, panelWidth, panelHeight, 8);
    this.container.add(bg);

    // Corner accents
    this.addCornerAccents(panelWidth, panelHeight);

    // Header
    this.createHeader(panelWidth, panelHeight);

    // Equipment section (left side)
    this.createEquipmentPanel(-panelWidth / 2 + 25, -panelHeight / 2 + 60);

    // Inventory grid (right side)
    this.createInventoryGrid(-panelWidth / 2 + 140, -panelHeight / 2 + 60);

    // Instructions
    const instructions = this.scene.add.text(0, panelHeight / 2 - 25, 'Shift+Click: Equip/Use  ·  E or ESC: Close', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#555555',
    });
    instructions.setOrigin(0.5);
    this.container.add(instructions);

    // Tooltip container - positioned in world space
    this.tooltipContainer = this.scene.add.container(0, 0);
    this.tooltipContainer.setDepth(251);
    this.tooltipContainer.setVisible(false);

    this.refresh();

    // Animate overlay fade and panel slide-in
    this.scene.tweens.add({
      targets: this.overlay,
      fillAlpha: 0.7,
      duration: 150,
      ease: 'Sine.easeOut',
    });
    this.scene.tweens.add({
      targets: this.container,
      y: centerY,
      alpha: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  private addCornerAccents(width: number, height: number): void {
    const corners = this.scene.add.graphics();
    corners.lineStyle(2, 0xff6600, 0.8);
    const size = 15;
    const halfW = width / 2;
    const halfH = height / 2;

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

    this.container!.add(corners);
  }

  private createHeader(panelWidth: number, panelHeight: number): void {
    // Title
    const title = this.scene.add.text(-panelWidth / 2 + 25, -panelHeight / 2 + 18, 'INVENTORY', {
      fontSize: '16px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ffffff',
    });
    this.container!.add(title);

    // Divider
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, 0x333333, 0.8);
    divider.lineBetween(-panelWidth / 2 + 20, -panelHeight / 2 + 45, panelWidth / 2 - 20, -panelHeight / 2 + 45);
    this.container!.add(divider);

    // Close button
    const closeBtn = this.scene.add.text(panelWidth / 2 - 35, -panelHeight / 2 + 18, '✕', {
      fontSize: '16px',
      color: '#666666',
    });
    closeBtn.setOrigin(0.5, 0);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ff6600'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#666666'));
    closeBtn.on('pointerdown', () => this.hide());
    this.container!.add(closeBtn);
  }

  private createEquipmentPanel(startX: number, startY: number): void {
    // Section label
    const label = this.scene.add.text(startX, startY, 'EQUIPPED', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#666666',
    });
    this.container!.add(label);

    const slots = [
      { key: 'weapon', label: 'WPN', y: 0 },
      { key: 'armor', label: 'ARM', y: 1 },
      { key: 'accessory', label: 'ACC', y: 2 },
    ];

    const halfSlot = this.SLOT_SIZE / 2;

    slots.forEach((slot) => {
      const x = startX + halfSlot;
      const y = startY + 20 + slot.y * (this.SLOT_SIZE + 8) + halfSlot;

      // Create container for this equipment slot
      const slotContainer = this.scene.add.container(x, y);

      // Slot background - draw centered
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x1a1a1a, 1);
      bg.fillRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);
      bg.lineStyle(1, 0x444444, 0.8);
      bg.strokeRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);
      slotContainer.add(bg);

      // Slot label
      const slotLabel = this.scene.add.text(halfSlot + 8, 0, slot.label, {
        fontSize: '9px',
        fontFamily: 'Roboto Mono, monospace',
        color: '#555555',
      });
      slotLabel.setOrigin(0, 0.5);
      slotContainer.add(slotLabel);

      // Icon at center
      const icon = this.scene.add.sprite(0, 0, 'item_drop');
      icon.setScale(1.2);
      icon.setVisible(false);
      slotContainer.add(icon);

      this.equipmentSlots.set(slot.key, { bg, icon });

      // Interactive zone - centered
      const hitArea = this.scene.add.rectangle(0, 0, this.SLOT_SIZE, this.SLOT_SIZE, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x1a1a1a, 1);
        bg.fillRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);
        bg.lineStyle(2, 0xff6600, 0.8);
        bg.strokeRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);
        const equipment = this.player.inventory.getEquipment();
        const item = equipment[slot.key as keyof typeof equipment];
        if (item) {
          this.showTooltip(item, x + halfSlot + 10, y - halfSlot);
        }
      });
      hitArea.on('pointerout', () => {
        bg.clear();
        bg.fillStyle(0x1a1a1a, 1);
        bg.fillRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);
        bg.lineStyle(1, 0x444444, 0.8);
        bg.strokeRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);
        this.hideTooltip();
      });
      hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        if (pointer.event.shiftKey) {
          this.player.inventory.unequipSlot(slot.key as 'weapon' | 'armor' | 'accessory');
          this.player.recalculateStats();
          this.refresh();
        }
      });
      slotContainer.add(hitArea);

      this.container!.add(slotContainer);
    });
  }

  private createInventoryGrid(startX: number, startY: number): void {
    // Section label
    const label = this.scene.add.text(startX, startY, 'ITEMS', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#666666',
    });
    this.container!.add(label);

    const maxSlots = this.player.inventory.getMaxSlots();
    const halfSlot = this.SLOT_SIZE / 2;

    for (let i = 0; i < maxSlots; i++) {
      const col = i % this.SLOTS_PER_ROW;
      const row = Math.floor(i / this.SLOTS_PER_ROW);

      const x = startX + col * (this.SLOT_SIZE + this.SLOT_GAP) + halfSlot;
      const y = startY + 20 + row * (this.SLOT_SIZE + this.SLOT_GAP) + halfSlot;

      // Create a container for this slot (like ShopUI does)
      const slotContainer = this.scene.add.container(x, y);

      // Slot background - draw centered at (0,0)
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x1a1a1a, 1);
      bg.fillRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);
      bg.lineStyle(1, 0x333333, 0.8);
      bg.strokeRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);
      slotContainer.add(bg);

      // Icon at center
      const icon = this.scene.add.sprite(0, 0, 'item_drop');
      icon.setScale(1.1);
      icon.setVisible(false);
      slotContainer.add(icon);

      // Compare indicator
      const compareIndicator = this.scene.add.text(halfSlot - 4, -halfSlot + 4, '', {
        fontSize: '10px',
        fontFamily: 'Roboto Mono, monospace',
        fontStyle: 'bold',
      });
      compareIndicator.setOrigin(1, 0);
      compareIndicator.setVisible(false);
      slotContainer.add(compareIndicator);

      this.itemSlots.push({ bg, icon, compareIndicator, index: i });

      // Interactive zone - centered at (0,0)
      const hitArea = this.scene.add.rectangle(0, 0, this.SLOT_SIZE, this.SLOT_SIZE, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.on('pointerover', () => {
        bg.clear();
        bg.fillStyle(0x1a1a1a, 1);
        bg.fillRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);
        bg.lineStyle(2, 0xff6600, 0.8);
        bg.strokeRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);
        this.onSlotHover(i, x + halfSlot + 10, y - halfSlot);
      });
      hitArea.on('pointerout', () => {
        this.redrawSlotBg(bg, i);
        this.hideTooltip();
      });
      hitArea.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.onSlotClick(i, pointer.event.shiftKey);
      });
      slotContainer.add(hitArea);

      this.container!.add(slotContainer);
    }
  }

  private redrawSlotBg(bg: Phaser.GameObjects.Graphics, index: number): void {
    const items = this.player.inventory.getItems();
    const halfSlot = this.SLOT_SIZE / 2;

    bg.clear();
    bg.fillStyle(0x1a1a1a, 1);
    bg.fillRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);

    if (index < items.length) {
      const item = items[index];
      bg.lineStyle(2, RARITY_COLORS[item.rarity], 0.6);
    } else {
      bg.lineStyle(1, 0x333333, 0.8);
    }
    bg.strokeRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);
  }

  private onSlotHover(index: number, x: number, y: number): void {
    const items = this.player.inventory.getItems();
    if (index < items.length) {
      this.showTooltip(items[index], x, y);
    }
  }

  private onSlotClick(index: number, shiftKey: boolean): void {
    const items = this.player.inventory.getItems();
    if (index >= items.length) return;

    const item = items[index];

    if (shiftKey) {
      if (item.type === ItemType.CONSUMABLE) {
        this.player.useItem(item.id);
      } else {
        this.player.equipItem(item.id);
      }
      this.refresh();
    }
  }

  private showTooltip(item: Item, relX: number, relY: number): void {
    if (!this.tooltipContainer) return;
    this.tooltipContainer.removeAll(true);

    const padding = 12;
    const width = 200;
    const cam = this.scene.cameras.main;

    const lines: { text: string; color: string; bold?: boolean }[] = [];
    lines.push({ text: item.name, color: this.getRarityColorHex(item.rarity), bold: true });
    lines.push({ text: this.getItemTypeLabel(item.type), color: '#666666' });
    lines.push({ text: '', color: '#ffffff' });

    if (item.stats.attack) lines.push({ text: `+${item.stats.attack} Attack`, color: '#ff6666' });
    if (item.stats.defense) lines.push({ text: `+${item.stats.defense} Defense`, color: '#6699ff' });
    if (item.stats.maxHp) lines.push({ text: `+${item.stats.maxHp} Max HP`, color: '#66cc66' });
    if (item.stats.speed) {
      const sign = item.stats.speed > 0 ? '+' : '';
      lines.push({ text: `${sign}${item.stats.speed} Speed`, color: '#cccc66' });
    }
    if (item.healAmount) lines.push({ text: `Heals ${item.healAmount} HP`, color: '#66cc66' });

    if (item.stats.attack || item.stats.defense || item.stats.maxHp || item.stats.speed || item.healAmount) {
      lines.push({ text: '', color: '#ffffff' });
    }

    lines.push({ text: item.description, color: '#888888' });
    lines.push({ text: '', color: '#ffffff' });

    if (item.type === ItemType.CONSUMABLE) {
      lines.push({ text: 'Shift+Click to use', color: '#555555' });
    } else {
      lines.push({ text: 'Shift+Click to equip', color: '#555555' });
    }

    const lineHeight = 16;
    const height = lines.filter(l => l.text !== '').length * lineHeight + padding * 2 + 10;

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a0a, 0.95);
    bg.fillRoundedRect(0, 0, width, height, 6);
    bg.lineStyle(1, RARITY_COLORS[item.rarity], 0.6);
    bg.strokeRoundedRect(0, 0, width, height, 6);
    this.tooltipContainer.add(bg);

    // Corner accent
    const corner = this.scene.add.graphics();
    corner.lineStyle(2, RARITY_COLORS[item.rarity], 0.8);
    corner.beginPath();
    corner.moveTo(0, 10);
    corner.lineTo(0, 0);
    corner.lineTo(10, 0);
    corner.strokePath();
    this.tooltipContainer.add(corner);

    let yOffset = padding;
    lines.forEach((line) => {
      if (line.text) {
        const text = this.scene.add.text(padding, yOffset, line.text, {
          fontSize: '11px',
          fontFamily: line.bold ? 'Cinzel, Georgia, serif' : 'Roboto Mono, monospace',
          color: line.color,
          wordWrap: { width: width - padding * 2 },
        });
        this.tooltipContainer!.add(text);
        yOffset += lineHeight;
      }
    });

    // Position in world space (relative to panel center + offset)
    const panelCenterX = cam.scrollX + cam.width / 2;
    const panelCenterY = cam.scrollY + cam.height / 2;
    const worldX = panelCenterX + relX;
    const worldY = panelCenterY + relY - 120;

    // Keep on screen (in world coords)
    const adjustedX = Math.min(worldX, cam.scrollX + cam.width - width - 10);
    const adjustedY = Math.max(worldY, cam.scrollY + 10);

    this.tooltipContainer.setPosition(adjustedX, adjustedY);
    this.tooltipContainer.setVisible(true);
  }

  private hideTooltip(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.setVisible(false);
    }
  }

  private getRarityColorHex(rarity: ItemRarity): string {
    const colors: Record<ItemRarity, string> = {
      [ItemRarity.COMMON]: '#aaaaaa',
      [ItemRarity.UNCOMMON]: '#22cc22',
      [ItemRarity.RARE]: '#3399ff',
      [ItemRarity.EPIC]: '#aa44ff',
    };
    return colors[rarity];
  }

  private getItemTypeLabel(type: ItemType): string {
    const labels: Record<ItemType, string> = {
      [ItemType.WEAPON]: 'Weapon',
      [ItemType.ARMOR]: 'Armor',
      [ItemType.ACCESSORY]: 'Accessory',
      [ItemType.CONSUMABLE]: 'Consumable',
    };
    return labels[type];
  }

  private compareToEquipped(item: Item): number {
    if (item.type === ItemType.CONSUMABLE) return 0;

    const equipment = this.player.inventory.getEquipment();
    let equippedItem: Item | null = null;

    switch (item.type) {
      case ItemType.WEAPON:
        equippedItem = equipment.weapon;
        break;
      case ItemType.ARMOR:
        equippedItem = equipment.armor;
        break;
      case ItemType.ACCESSORY:
        equippedItem = equipment.accessory;
        break;
    }

    if (!equippedItem) return 1;

    const itemValue = this.getItemStatValue(item);
    const equippedValue = this.getItemStatValue(equippedItem);

    if (itemValue > equippedValue) return 1;
    if (itemValue < equippedValue) return -1;
    return 0;
  }

  private getItemStatValue(item: Item): number {
    let value = 0;
    if (item.stats.attack) value += item.stats.attack * 2;
    if (item.stats.defense) value += item.stats.defense * 2;
    if (item.stats.maxHp) value += item.stats.maxHp * 0.5;
    if (item.stats.speed) value += item.stats.speed * 0.3;
    return value;
  }

  private getItemTexture(item: Item): string {
    if (item.type === ItemType.WEAPON && item.weaponData) {
      const weaponTextures: Record<string, string> = {
        wand: 'weapon_wand',
        sword: 'weapon_sword',
        bow: 'weapon_bow',
        staff: 'weapon_staff',
        daggers: 'weapon_daggers',
      };
      return weaponTextures[item.weaponData.weaponType] || 'weapon_wand';
    }

    const typeTextures: Record<ItemType, string> = {
      [ItemType.WEAPON]: 'weapon_sword',
      [ItemType.ARMOR]: 'item_armor',
      [ItemType.ACCESSORY]: 'item_accessory',
      [ItemType.CONSUMABLE]: 'item_consumable',
    };
    return typeTextures[item.type];
  }

  refresh(): void {
    if (!this.container || !this.isVisible) return;

    const items = this.player.inventory.getItems();
    const equipment = this.player.inventory.getEquipment();

    // Update inventory slots
    this.itemSlots.forEach((slot) => {
      const index = slot.index;
      if (index < items.length) {
        const item = items[index];
        slot.icon.setTexture(this.getItemTexture(item));
        slot.icon.setTint(RARITY_COLORS[item.rarity]);
        slot.icon.setVisible(true);

        // Update border color
        this.redrawSlotBg(slot.bg, index);

        const comparison = this.compareToEquipped(item);
        if (comparison > 0) {
          slot.compareIndicator.setText('▲');
          slot.compareIndicator.setColor('#22cc22');
          slot.compareIndicator.setVisible(true);
        } else if (comparison < 0) {
          slot.compareIndicator.setText('▼');
          slot.compareIndicator.setColor('#ff4444');
          slot.compareIndicator.setVisible(true);
        } else {
          slot.compareIndicator.setVisible(false);
        }
      } else {
        slot.icon.setVisible(false);
        slot.compareIndicator.setVisible(false);
        this.redrawSlotBg(slot.bg, index);
      }
    });

    // Update equipment slots
    const equipmentTypes = ['weapon', 'armor', 'accessory'] as const;
    const halfSlot = this.SLOT_SIZE / 2;

    equipmentTypes.forEach((type) => {
      const slot = this.equipmentSlots.get(type);
      if (!slot) return;

      const item = equipment[type];

      slot.bg.clear();
      slot.bg.fillStyle(0x1a1a1a, 1);
      slot.bg.fillRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);

      if (item) {
        slot.bg.lineStyle(2, RARITY_COLORS[item.rarity], 0.8);
        if (slot.icon) {
          slot.icon.setTexture(this.getItemTexture(item));
          slot.icon.setTint(RARITY_COLORS[item.rarity]);
          slot.icon.setVisible(true);
        }
      } else {
        slot.bg.lineStyle(1, 0x444444, 0.8);
        if (slot.icon) slot.icon.setVisible(false);
      }
      slot.bg.strokeRoundedRect(-halfSlot, -halfSlot, this.SLOT_SIZE, this.SLOT_SIZE, 4);
    });
  }

  hide(): void {
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
    this.itemSlots = [];
    this.equipmentSlots.clear();
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
    // Clean up event listeners
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
