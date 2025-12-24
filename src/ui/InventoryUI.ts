import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Item, ItemType, ItemRarity, RARITY_COLORS } from '../systems/Item';

export class InventoryUI {
  private scene: Phaser.Scene;
  private player: Player;
  private container: Phaser.GameObjects.Container;
  private isVisible: boolean = false;

  private background!: Phaser.GameObjects.Rectangle;
  private titleText!: Phaser.GameObjects.Text;
  private itemSlots: Phaser.GameObjects.Container[] = [];
  private equipmentSlots: Map<string, Phaser.GameObjects.Container> = new Map();
  private tooltipContainer!: Phaser.GameObjects.Container;

  private readonly PANEL_WIDTH = 600;
  private readonly PANEL_HEIGHT = 400;
  private readonly SLOT_SIZE = 40;
  private readonly SLOTS_PER_ROW = 10;

  constructor(scene: Phaser.Scene, player: Player) {
    this.scene = scene;
    this.player = player;

    // Create container at 0,0 - we'll reposition it each time it opens
    this.container = scene.add.container(0, 0);
    this.container.setDepth(200);
    this.container.setVisible(false);

    this.createPanel();
    this.createEquipmentSlots();
    this.createInventoryGrid();
    this.createTooltip();

    // Listen for inventory changes
    scene.events.on('itemPickup', () => this.refresh());
    scene.events.on('equipmentChanged', () => this.refresh());
  }

  private updatePosition(): void {
    // Position the container at the camera's center in world coordinates
    const camera = this.scene.cameras.main;
    this.container.setPosition(
      camera.scrollX + camera.width / 2,
      camera.scrollY + camera.height / 2
    );
  }

  private createPanel(): void {
    // Dark semi-transparent background
    this.background = this.scene.add.rectangle(
      0,
      0,
      this.PANEL_WIDTH,
      this.PANEL_HEIGHT,
      0x1a1a2e,
      0.95
    );
    this.background.setStrokeStyle(2, 0x8b5cf6);
    this.container.add(this.background);

    // Title
    this.titleText = this.scene.add.text(0, -this.PANEL_HEIGHT / 2 + 20, 'INVENTORY', {
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    this.titleText.setOrigin(0.5);
    this.container.add(this.titleText);

    // Close button (X)
    const closeBtn = this.scene.add.container(this.PANEL_WIDTH / 2 - 20, -this.PANEL_HEIGHT / 2 + 20);
    const closeBg = this.scene.add.rectangle(0, 0, 24, 24, 0x4b5563);
    closeBg.setStrokeStyle(1, 0x6b7280);
    closeBtn.add(closeBg);
    const closeX = this.scene.add.text(0, 0, 'X', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    closeX.setOrigin(0.5);
    closeBtn.add(closeX);
    this.container.add(closeBtn);

    closeBg.setInteractive({ useHandCursor: true });
    closeBg.on('pointerover', () => closeBg.setFillStyle(0xef4444));
    closeBg.on('pointerout', () => closeBg.setFillStyle(0x4b5563));
    closeBg.on('pointerdown', () => this.toggle());

    // Instructions
    const instructions = this.scene.add.text(
      0,
      this.PANEL_HEIGHT / 2 - 25,
      'Shift+Click: Equip/Use item | E or X: Close',
      {
        fontSize: '11px',
        color: '#888888',
      }
    );
    instructions.setOrigin(0.5);
    this.container.add(instructions);
  }

  private createEquipmentSlots(): void {
    const startX = -this.PANEL_WIDTH / 2 + 60;
    const startY = -this.PANEL_HEIGHT / 2 + 70;

    const slots = [
      { key: 'weapon', label: 'Weapon', y: 0 },
      { key: 'armor', label: 'Armor', y: 50 },
      { key: 'accessory', label: 'Accessory', y: 100 },
    ];

    slots.forEach((slot) => {
      const slotContainer = this.scene.add.container(startX, startY + slot.y);

      // Slot background
      const bg = this.scene.add.rectangle(0, 0, this.SLOT_SIZE, this.SLOT_SIZE, 0x374151);
      bg.setStrokeStyle(1, 0x6b7280);
      slotContainer.add(bg);

      // Label
      const label = this.scene.add.text(this.SLOT_SIZE / 2 + 10, 0, slot.label, {
        fontSize: '12px',
        color: '#aaaaaa',
      });
      label.setOrigin(0, 0.5);
      slotContainer.add(label);

      // Item indicator (will be updated)
      const itemIndicator = this.scene.add.rectangle(0, 0, this.SLOT_SIZE - 8, this.SLOT_SIZE - 8, 0x000000, 0);
      itemIndicator.setName('indicator');
      slotContainer.add(itemIndicator);

      // Item name text
      const itemText = this.scene.add.text(0, 0, '', {
        fontSize: '10px',
        color: '#ffffff',
      });
      itemText.setOrigin(0.5);
      itemText.setName('itemText');
      slotContainer.add(itemText);

      this.equipmentSlots.set(slot.key, slotContainer);
      this.container.add(slotContainer);

      // Make interactive
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerover', () => {
        const equipment = this.player.inventory.getEquipment();
        const item = equipment[slot.key as keyof typeof equipment];
        if (item) {
          this.showTooltip(item, startX + this.SLOT_SIZE, startY + slot.y);
        }
        bg.setStrokeStyle(2, 0x8b5cf6);
      });
      bg.on('pointerout', () => {
        this.hideTooltip();
        bg.setStrokeStyle(1, 0x6b7280);
      });
      bg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        // Shift+click to unequip
        if (pointer.event.shiftKey) {
          this.player.inventory.unequipSlot(slot.key as 'weapon' | 'armor' | 'accessory');
          this.player.recalculateStats();
          this.refresh();
        }
      });
    });
  }

  private createInventoryGrid(): void {
    const startX = -this.PANEL_WIDTH / 2 + 180;
    const startY = -this.PANEL_HEIGHT / 2 + 70;
    const maxSlots = this.player.inventory.getMaxSlots();

    for (let i = 0; i < maxSlots; i++) {
      const row = Math.floor(i / this.SLOTS_PER_ROW);
      const col = i % this.SLOTS_PER_ROW;
      const x = startX + col * (this.SLOT_SIZE + 4);
      const y = startY + row * (this.SLOT_SIZE + 4);

      const slotContainer = this.scene.add.container(x, y);

      // Slot background
      const bg = this.scene.add.rectangle(0, 0, this.SLOT_SIZE, this.SLOT_SIZE, 0x374151);
      bg.setStrokeStyle(1, 0x6b7280);
      slotContainer.add(bg);

      // Item indicator (rarity border)
      const indicator = this.scene.add.rectangle(0, 0, this.SLOT_SIZE - 4, this.SLOT_SIZE - 4, 0x000000, 0);
      indicator.setName('indicator');
      slotContainer.add(indicator);

      // Item icon sprite (hidden by default)
      const icon = this.scene.add.sprite(0, 0, 'item_drop');
      icon.setName('icon');
      icon.setVisible(false);
      icon.setScale(0.9);
      slotContainer.add(icon);

      // Comparison indicator (up/down arrow)
      const compareIndicator = this.scene.add.text(
        this.SLOT_SIZE / 2 - 2,
        -this.SLOT_SIZE / 2 + 2,
        '',
        { fontSize: '12px', fontStyle: 'bold' }
      );
      compareIndicator.setName('compareIndicator');
      compareIndicator.setOrigin(1, 0);
      slotContainer.add(compareIndicator);

      slotContainer.setData('index', i);
      this.itemSlots.push(slotContainer);
      this.container.add(slotContainer);

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
  }

  private createTooltip(): void {
    this.tooltipContainer = this.scene.add.container(0, 0);
    this.tooltipContainer.setVisible(false);
    this.container.add(this.tooltipContainer);
  }

  private onSlotHover(index: number): void {
    const items = this.player.inventory.getItems();
    if (index < items.length) {
      const item = items[index];
      const slot = this.itemSlots[index];
      this.showTooltip(item, slot.x + this.SLOT_SIZE, slot.y);
    }
  }

  private onSlotClick(index: number, shiftKey: boolean): void {
    const items = this.player.inventory.getItems();
    if (index >= items.length) return;

    const item = items[index];

    if (shiftKey) {
      // Shift+click: equip or use
      if (item.type === ItemType.CONSUMABLE) {
        // Use consumable
        this.player.useItem(item.id);
      } else {
        // Equip item
        this.player.equipItem(item.id);
      }
      this.refresh();
    }
  }

  private showTooltip(item: Item, x: number, y: number): void {
    this.tooltipContainer.removeAll(true);

    const padding = 10;
    const width = 180;

    // Build tooltip content
    const lines: { text: string; color: string }[] = [];
    lines.push({ text: item.name, color: this.getRarityColorHex(item.rarity) });
    lines.push({ text: this.getItemTypeLabel(item.type), color: '#888888' });
    lines.push({ text: '', color: '#ffffff' }); // Spacer

    if (item.stats.attack) lines.push({ text: `+${item.stats.attack} Attack`, color: '#ff6666' });
    if (item.stats.defense) lines.push({ text: `+${item.stats.defense} Defense`, color: '#6666ff' });
    if (item.stats.maxHp) lines.push({ text: `+${item.stats.maxHp} Max HP`, color: '#66ff66' });
    if (item.stats.speed) {
      const sign = item.stats.speed > 0 ? '+' : '';
      lines.push({ text: `${sign}${item.stats.speed} Speed`, color: '#ffff66' });
    }
    if (item.healAmount) lines.push({ text: `Heals ${item.healAmount} HP`, color: '#66ff66' });

    lines.push({ text: '', color: '#ffffff' }); // Spacer
    lines.push({ text: item.description, color: '#aaaaaa' });

    // Add shift+click hint
    lines.push({ text: '', color: '#ffffff' });
    if (item.type === ItemType.CONSUMABLE) {
      lines.push({ text: 'Shift+Click to use', color: '#666666' });
    } else {
      lines.push({ text: 'Shift+Click to equip', color: '#666666' });
    }

    const height = lines.length * 16 + padding * 2;

    // Background
    const bg = this.scene.add.rectangle(0, 0, width, height, 0x1f2937, 0.95);
    bg.setStrokeStyle(1, RARITY_COLORS[item.rarity]);
    bg.setOrigin(0, 0);
    this.tooltipContainer.add(bg);

    // Text lines
    let yOffset = padding;
    lines.forEach((line) => {
      if (line.text) {
        const text = this.scene.add.text(padding, yOffset, line.text, {
          fontSize: '11px',
          color: line.color,
          wordWrap: { width: width - padding * 2 },
        });
        this.tooltipContainer.add(text);
      }
      yOffset += 16;
    });

    // Position tooltip, keeping it on screen
    let tooltipX = x + 10;
    let tooltipY = y - height / 2;

    // Clamp to panel bounds
    const maxX = this.PANEL_WIDTH / 2 - width - 10;
    const minY = -this.PANEL_HEIGHT / 2 + 10;
    const maxY = this.PANEL_HEIGHT / 2 - height - 10;

    if (tooltipX > maxX) tooltipX = x - width - 20;
    if (tooltipY < minY) tooltipY = minY;
    if (tooltipY > maxY) tooltipY = maxY;

    this.tooltipContainer.setPosition(tooltipX, tooltipY);
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

  // Compare item to currently equipped item of same type
  // Returns: 1 = better, -1 = worse, 0 = same/not comparable
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

    // If nothing equipped, this item is better
    if (!equippedItem) return 1;

    // Calculate total stat value for comparison
    const itemValue = this.getItemStatValue(item);
    const equippedValue = this.getItemStatValue(equippedItem);

    if (itemValue > equippedValue) return 1;
    if (itemValue < equippedValue) return -1;
    return 0;
  }

  private getItemStatValue(item: Item): number {
    let value = 0;
    // Weight stats by importance
    if (item.stats.attack) value += item.stats.attack * 2;
    if (item.stats.defense) value += item.stats.defense * 2;
    if (item.stats.maxHp) value += item.stats.maxHp * 0.5;
    if (item.stats.speed) value += item.stats.speed * 0.3;
    return value;
  }

  private getItemTexture(item: Item): string {
    // Weapons with weaponData use their specific weapon texture
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

    // Other items use generic type icons
    const typeTextures: Record<ItemType, string> = {
      [ItemType.WEAPON]: 'weapon_sword',
      [ItemType.ARMOR]: 'item_armor',
      [ItemType.ACCESSORY]: 'item_accessory',
      [ItemType.CONSUMABLE]: 'item_consumable',
    };
    return typeTextures[item.type];
  }

  refresh(): void {
    // Guard against refreshing after scene restart
    if (!this.container || !this.container.scene) return;

    const items = this.player.inventory.getItems();
    const equipment = this.player.inventory.getEquipment();

    // Update inventory slots
    this.itemSlots.forEach((slot, index) => {
      const indicator = slot.getByName('indicator') as Phaser.GameObjects.Rectangle;
      const icon = slot.getByName('icon') as Phaser.GameObjects.Sprite;
      const compareIndicator = slot.getByName('compareIndicator') as Phaser.GameObjects.Text;
      if (!indicator || !icon) return;

      if (index < items.length) {
        const item = items[index];
        // Show rarity-colored border
        indicator.setStrokeStyle(2, RARITY_COLORS[item.rarity]);
        indicator.setFillStyle(0x000000, 0.3);
        // Show item icon
        icon.setTexture(this.getItemTexture(item));
        icon.setTint(RARITY_COLORS[item.rarity]);
        icon.setVisible(true);

        // Show comparison indicator for equippable items
        if (compareIndicator) {
          const comparison = this.compareToEquipped(item);
          if (comparison > 0) {
            compareIndicator.setText('▲');
            compareIndicator.setColor('#22cc22');
            compareIndicator.setVisible(true);
          } else if (comparison < 0) {
            compareIndicator.setText('▼');
            compareIndicator.setColor('#ff4444');
            compareIndicator.setVisible(true);
          } else {
            compareIndicator.setVisible(false);
          }
        }
      } else {
        indicator.setStrokeStyle(0);
        indicator.setFillStyle(0x000000, 0);
        icon.setVisible(false);
        if (compareIndicator) compareIndicator.setVisible(false);
      }
    });

    // Update equipment slots
    const equipmentTypes = ['weapon', 'armor', 'accessory'] as const;
    equipmentTypes.forEach((type) => {
      const slotContainer = this.equipmentSlots.get(type);
      if (!slotContainer) return;

      const indicator = slotContainer.getByName('indicator') as Phaser.GameObjects.Rectangle;
      const itemText = slotContainer.getByName('itemText') as Phaser.GameObjects.Text;
      let icon = slotContainer.getByName('equipIcon') as Phaser.GameObjects.Sprite;
      if (!indicator || !itemText) return;

      const item = equipment[type];

      if (item) {
        indicator.setStrokeStyle(2, RARITY_COLORS[item.rarity]);
        indicator.setFillStyle(0x000000, 0.3);
        itemText.setText('');

        // Create or update equipment icon
        if (!icon) {
          icon = this.scene.add.sprite(0, 0, this.getItemTexture(item));
          icon.setName('equipIcon');
          icon.setScale(0.9);
          slotContainer.add(icon);
        }
        icon.setTexture(this.getItemTexture(item));
        icon.setTint(RARITY_COLORS[item.rarity]);
        icon.setVisible(true);
      } else {
        indicator.setStrokeStyle(0);
        indicator.setFillStyle(0x000000, 0);
        itemText.setText('');
        if (icon) icon.setVisible(false);
      }
    });
  }

  toggle(): void {
    this.isVisible = !this.isVisible;

    if (this.isVisible) {
      this.updatePosition();
      this.refresh();
    }

    this.container.setVisible(this.isVisible);
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }
}
