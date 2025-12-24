import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Item, ItemType, ItemRarity, RARITY_COLORS } from '../systems/Item';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

interface RexUIScene extends Phaser.Scene {
  rexUI: UIPlugin;
}

export class InventoryUI {
  private scene: RexUIScene;
  private player: Player;
  private panel: any | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isVisible: boolean = false;

  private itemSlots: { container: any; bg: any; icon: Phaser.GameObjects.Sprite; indicator: any; compareIndicator: Phaser.GameObjects.Text }[] = [];
  private equipmentSlots: Map<string, { container: any; bg: any; icon: Phaser.GameObjects.Sprite | null; indicator: any }> = new Map();
  private tooltipContainer!: Phaser.GameObjects.Container;

  private readonly SLOT_SIZE = 40;
  private readonly SLOTS_PER_ROW = 10;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene as RexUIScene;
    this.player = player;

    this.createTooltip();

    // Listen for inventory changes
    scene.events.on('itemPickup', () => this.refresh());
    scene.events.on('equipmentChanged', () => this.refresh());
  }

  private createTooltip(): void {
    this.tooltipContainer = this.scene.add.container(0, 0);
    this.tooltipContainer.setDepth(251);
    this.tooltipContainer.setVisible(false);
  }

  show(): void {
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }

    this.isVisible = true;
    this.itemSlots = [];
    this.equipmentSlots.clear();

    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    // Background overlay
    this.overlay = this.scene.add.rectangle(centerX, centerY, cam.width * 2, cam.height * 2, 0x000000, 0.6);
    this.overlay.setDepth(199);

    // Build main panel
    this.panel = this.scene.rexUI.add.sizer({
      x: centerX,
      y: centerY,
      orientation: 'y',
      space: { left: 20, right: 20, top: 15, bottom: 15, item: 15 },
    })
      .addBackground(
        this.scene.rexUI.add.roundRectangle(0, 0, 0, 0, 8, 0x1a1a2e, 0.95)
          .setStrokeStyle(2, 0x8b5cf6)
      )
      .add(this.createHeader(), { expand: true })
      .add(this.createMainContent(), { expand: true })
      .add(this.createInstructions(), { align: 'center' })
      .layout();

    this.panel.setDepth(200);

    // Update tooltip container position base
    this.tooltipContainer.setPosition(centerX - 300, centerY - 200);

    this.refresh();
  }

  private createHeader(): any {
    const title = this.scene.add.text(0, 0, 'INVENTORY', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    });

    const closeBtn = this.scene.add.text(0, 0, 'X', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#9ca3af',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ef4444'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#9ca3af'));
    closeBtn.on('pointerdown', () => this.hide());

    return this.scene.rexUI.add.sizer({ orientation: 'x' })
      .add(title, { align: 'left' })
      .addSpace()
      .add(closeBtn, { align: 'right' });
  }

  private createMainContent(): any {
    return this.scene.rexUI.add.sizer({
      orientation: 'x',
      space: { item: 30 },
    })
      .add(this.createEquipmentPanel(), { align: 'top' })
      .add(this.createInventoryGrid(), { align: 'top' });
  }

  private createEquipmentPanel(): any {
    const sizer = this.scene.rexUI.add.sizer({
      orientation: 'y',
      space: { item: 10 },
    });

    const slots = [
      { key: 'weapon', label: 'Weapon' },
      { key: 'armor', label: 'Armor' },
      { key: 'accessory', label: 'Accessory' },
    ];

    for (const slot of slots) {
      sizer.add(this.createEquipmentSlot(slot.key, slot.label), { align: 'left' });
    }

    return sizer;
  }

  private createEquipmentSlot(key: string, label: string): any {
    const bg = this.scene.rexUI.add.roundRectangle(0, 0, this.SLOT_SIZE, this.SLOT_SIZE, 4, 0x374151)
      .setStrokeStyle(1, 0x6b7280);

    const indicator = this.scene.rexUI.add.roundRectangle(0, 0, this.SLOT_SIZE - 8, this.SLOT_SIZE - 8, 2, 0x000000, 0);

    const icon = this.scene.add.sprite(0, 0, 'item_drop');
    icon.setScale(0.9);
    icon.setVisible(false);

    const slotLabel = this.scene.rexUI.add.label({
      background: bg,
      icon: icon,
      align: 'center',
    });

    const labelText = this.scene.add.text(0, 0, label, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
    });

    const row = this.scene.rexUI.add.sizer({
      orientation: 'x',
      space: { item: 10 },
    })
      .add(slotLabel, { align: 'center' })
      .add(labelText, { align: 'center' });

    this.equipmentSlots.set(key, { container: slotLabel, bg, icon, indicator });

    // Make interactive
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      const equipment = this.player.inventory.getEquipment();
      const item = equipment[key as keyof typeof equipment];
      if (item) {
        this.showTooltip(item, 100, 0);
      }
      bg.setStrokeStyle(2, 0x8b5cf6);
    });
    bg.on('pointerout', () => {
      this.hideTooltip();
      bg.setStrokeStyle(1, 0x6b7280);
    });
    bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (pointer.event.shiftKey) {
        this.player.inventory.unequipSlot(key as 'weapon' | 'armor' | 'accessory');
        this.player.recalculateStats();
        this.refresh();
      }
    });

    return row;
  }

  private createInventoryGrid(): any {
    const maxSlots = this.player.inventory.getMaxSlots();
    const rows = Math.ceil(maxSlots / this.SLOTS_PER_ROW);

    const gridSizer = this.scene.rexUI.add.gridSizer({
      column: this.SLOTS_PER_ROW,
      row: rows,
      columnProportions: 0,
      rowProportions: 0,
      space: { column: 4, row: 4 },
    });

    for (let i = 0; i < maxSlots; i++) {
      const col = i % this.SLOTS_PER_ROW;
      const row = Math.floor(i / this.SLOTS_PER_ROW);

      const bg = this.scene.rexUI.add.roundRectangle(0, 0, this.SLOT_SIZE, this.SLOT_SIZE, 4, 0x374151)
        .setStrokeStyle(1, 0x6b7280);

      const indicator = this.scene.rexUI.add.roundRectangle(0, 0, this.SLOT_SIZE - 4, this.SLOT_SIZE - 4, 2, 0x000000, 0);

      const icon = this.scene.add.sprite(0, 0, 'item_drop');
      icon.setScale(0.9);
      icon.setVisible(false);

      const compareIndicator = this.scene.add.text(
        this.SLOT_SIZE / 2 - 4,
        -this.SLOT_SIZE / 2 + 4,
        '',
        { fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold' }
      );
      compareIndicator.setOrigin(1, 0);
      compareIndicator.setVisible(false);

      const slotContainer = this.scene.rexUI.add.overlapSizer({
        width: this.SLOT_SIZE,
        height: this.SLOT_SIZE,
      })
        .add(bg, { align: 'center', expand: false })
        .add(indicator, { align: 'center', expand: false })
        .add(icon, { align: 'center', expand: false })
        .add(compareIndicator, { align: 'right-top', expand: false });

      this.itemSlots.push({ container: slotContainer, bg, icon, indicator, compareIndicator });

      gridSizer.add(slotContainer, { column: col, row: row, align: 'center' });

      // Make interactive
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        this.onSlotHover(i);
        bg.setStrokeStyle(2, 0x8b5cf6);
      });
      bg.on('pointerout', () => {
        this.hideTooltip();
        bg.setStrokeStyle(1, 0x6b7280);
      });
      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.onSlotClick(i, pointer.event.shiftKey);
      });
    }

    return gridSizer;
  }

  private createInstructions(): Phaser.GameObjects.Text {
    return this.scene.add.text(0, 0, 'Shift+Click: Equip/Use | E or X: Close', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#666666',
    });
  }

  private onSlotHover(index: number): void {
    const items = this.player.inventory.getItems();
    if (index < items.length) {
      const item = items[index];
      const col = index % this.SLOTS_PER_ROW;
      const row = Math.floor(index / this.SLOTS_PER_ROW);
      this.showTooltip(item, 150 + col * (this.SLOT_SIZE + 4), row * (this.SLOT_SIZE + 4));
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

  private showTooltip(item: Item, x: number, y: number): void {
    this.tooltipContainer.removeAll(true);

    const padding = 10;
    const width = 180;

    const lines: { text: string; color: string }[] = [];
    lines.push({ text: item.name, color: this.getRarityColorHex(item.rarity) });
    lines.push({ text: this.getItemTypeLabel(item.type), color: '#888888' });
    lines.push({ text: '', color: '#ffffff' });

    if (item.stats.attack) lines.push({ text: `+${item.stats.attack} Attack`, color: '#ff6666' });
    if (item.stats.defense) lines.push({ text: `+${item.stats.defense} Defense`, color: '#6666ff' });
    if (item.stats.maxHp) lines.push({ text: `+${item.stats.maxHp} Max HP`, color: '#66ff66' });
    if (item.stats.speed) {
      const sign = item.stats.speed > 0 ? '+' : '';
      lines.push({ text: `${sign}${item.stats.speed} Speed`, color: '#ffff66' });
    }
    if (item.healAmount) lines.push({ text: `Heals ${item.healAmount} HP`, color: '#66ff66' });

    lines.push({ text: '', color: '#ffffff' });
    lines.push({ text: item.description, color: '#aaaaaa' });
    lines.push({ text: '', color: '#ffffff' });

    if (item.type === ItemType.CONSUMABLE) {
      lines.push({ text: 'Shift+Click to use', color: '#666666' });
    } else {
      lines.push({ text: 'Shift+Click to equip', color: '#666666' });
    }

    const height = lines.length * 16 + padding * 2;

    const bg = this.scene.add.rectangle(0, 0, width, height, 0x1f2937, 0.95);
    bg.setStrokeStyle(1, RARITY_COLORS[item.rarity]);
    bg.setOrigin(0, 0);
    this.tooltipContainer.add(bg);

    let yOffset = padding;
    lines.forEach((line) => {
      if (line.text) {
        const text = this.scene.add.text(padding, yOffset, line.text, {
          fontSize: '11px',
          fontFamily: 'monospace',
          color: line.color,
          wordWrap: { width: width - padding * 2 },
        });
        this.tooltipContainer.add(text);
      }
      yOffset += 16;
    });

    // Position tooltip relative to panel
    const cam = this.scene.cameras.main;
    const panelX = cam.scrollX + cam.width / 2;
    const panelY = cam.scrollY + cam.height / 2;

    this.tooltipContainer.setPosition(panelX - 280 + x, panelY - 180 + y);
    this.tooltipContainer.setVisible(true);
  }

  private hideTooltip(): void {
    this.tooltipContainer.setVisible(false);
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
    if (!this.panel || !this.isVisible) return;

    const items = this.player.inventory.getItems();
    const equipment = this.player.inventory.getEquipment();

    // Update inventory slots
    this.itemSlots.forEach((slot, index) => {
      if (index < items.length) {
        const item = items[index];
        slot.indicator.setStrokeStyle(2, RARITY_COLORS[item.rarity]);
        slot.indicator.setFillStyle(0x000000, 0.3);
        slot.icon.setTexture(this.getItemTexture(item));
        slot.icon.setTint(RARITY_COLORS[item.rarity]);
        slot.icon.setVisible(true);

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
        slot.indicator.setStrokeStyle(0);
        slot.indicator.setFillStyle(0x000000, 0);
        slot.icon.setVisible(false);
        slot.compareIndicator.setVisible(false);
      }
    });

    // Update equipment slots
    const equipmentTypes = ['weapon', 'armor', 'accessory'] as const;
    equipmentTypes.forEach((type) => {
      const slot = this.equipmentSlots.get(type);
      if (!slot) return;

      const item = equipment[type];

      if (item) {
        slot.indicator.setStrokeStyle(2, RARITY_COLORS[item.rarity]);
        slot.indicator.setFillStyle(0x000000, 0.3);
        if (slot.icon) {
          slot.icon.setTexture(this.getItemTexture(item));
          slot.icon.setTint(RARITY_COLORS[item.rarity]);
          slot.icon.setVisible(true);
        }
      } else {
        slot.indicator.setStrokeStyle(0);
        slot.indicator.setFillStyle(0x000000, 0);
        if (slot.icon) slot.icon.setVisible(false);
      }
    });
  }

  hide(): void {
    if (!this.panel) return;

    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }
    this.hideTooltip();
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
    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
    }
  }
}
