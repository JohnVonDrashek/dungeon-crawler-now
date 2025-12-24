import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Item, ItemType, ItemRarity, generateProceduralItemOfType, RARITY_COLORS } from '../systems/Item';
import { Weapon } from '../systems/Weapon';
import { createItemFromWeapon } from '../systems/Item';
import UIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

interface RexUIScene extends Phaser.Scene {
  rexUI: UIPlugin;
}

interface ShopItem {
  item: Item;
  price: number;
  sold: boolean;
}

export class ShopUI {
  private scene: RexUIScene;
  private player: Player;
  private panel: any | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isVisible: boolean = false;
  private floor: number;

  private shopItems: ShopItem[] = [];
  private healCost: number = 0;
  private rerollCost: number = 50;
  private itemSlots: { container: any; bg: any; soldOverlay: any; soldText: Phaser.GameObjects.Text; priceText: Phaser.GameObjects.Text }[] = [];

  private goldDisplay: Phaser.GameObjects.Text | null = null;
  private healBtn: any | null = null;
  private healText: Phaser.GameObjects.Text | null = null;
  private rerollText: Phaser.GameObjects.Text | null = null;
  private tooltipContainer: Phaser.GameObjects.Container | null = null;
  private escKey: Phaser.Input.Keyboard.Key | null = null;

  private onCloseCallback?: () => void;

  constructor(scene: Phaser.Scene, player: Player, floor: number) {
    this.scene = scene as RexUIScene;
    this.player = player;
    this.floor = floor;

    this.generateShopInventory();
  }

  private generateShopInventory(): void {
    this.shopItems = [];

    const itemCount = 4 + Math.floor(Math.random() * 3);

    for (let i = 0; i < itemCount; i++) {
      const roll = Math.random();
      let item: Item;

      if (roll < 0.3) {
        const weapon = Weapon.createRandom(this.floor);
        item = createItemFromWeapon(weapon);
      } else if (roll < 0.5) {
        item = {
          id: `shop_potion_${i}`,
          name: this.floor >= 5 ? 'Large Health Potion' : 'Health Potion',
          type: ItemType.CONSUMABLE,
          rarity: this.floor >= 5 ? ItemRarity.UNCOMMON : ItemRarity.COMMON,
          stats: {},
          healAmount: this.floor >= 5 ? 60 : 30,
          description: this.floor >= 5 ? 'Restores 60 HP.' : 'Restores 30 HP.',
        };
      } else {
        const type = Math.random() < 0.5 ? ItemType.ARMOR : ItemType.ACCESSORY;
        const rarityRoll = Math.random();
        let rarity: ItemRarity;
        if (rarityRoll < 0.5) rarity = ItemRarity.COMMON;
        else if (rarityRoll < 0.8) rarity = ItemRarity.UNCOMMON;
        else if (rarityRoll < 0.95) rarity = ItemRarity.RARE;
        else rarity = ItemRarity.EPIC;

        item = generateProceduralItemOfType(this.floor, rarity, type);
      }

      const basePrice = this.getBasePrice(item);
      const price = Math.floor(basePrice * (1 + this.floor * 0.1));

      this.shopItems.push({ item, price, sold: false });
    }

    const missingHp = this.player.maxHp - this.player.hp;
    this.healCost = Math.max(10, Math.floor(missingHp * 0.5));
  }

  private getBasePrice(item: Item): number {
    const rarityMultiplier: Record<ItemRarity, number> = {
      [ItemRarity.COMMON]: 1,
      [ItemRarity.UNCOMMON]: 2,
      [ItemRarity.RARE]: 4,
      [ItemRarity.EPIC]: 8,
    };

    const typeBase: Record<ItemType, number> = {
      [ItemType.WEAPON]: 40,
      [ItemType.ARMOR]: 30,
      [ItemType.ACCESSORY]: 25,
      [ItemType.CONSUMABLE]: 15,
    };

    return typeBase[item.type] * rarityMultiplier[item.rarity];
  }

  show(onClose?: () => void): void {
    this.onCloseCallback = onClose;

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

    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    // Background overlay
    this.overlay = this.scene.add.rectangle(centerX, centerY, cam.width * 2, cam.height * 2, 0x000000, 0.8);
    this.overlay.setDepth(199);

    // Build panel
    this.panel = this.scene.rexUI.add.sizer({
      x: centerX,
      y: centerY,
      orientation: 'y',
      space: { left: 25, right: 25, top: 20, bottom: 20, item: 15 },
    })
      .addBackground(
        this.scene.rexUI.add.roundRectangle(0, 0, 0, 0, 8, 0x1f2937)
          .setStrokeStyle(2, 0xfbbf24)
      )
      .add(this.createHeader(), { expand: true })
      .add(this.createGoldDisplay(), { align: 'center' })
      .add(this.createItemGrid(), { align: 'center' })
      .add(this.createActionButtons(), { align: 'center' })
      .layout();

    this.panel.setDepth(200);

    // Create tooltip container
    this.tooltipContainer = this.scene.add.container(0, 0);
    this.tooltipContainer.setDepth(251);
    this.tooltipContainer.setVisible(false);

    // Setup ESC key to close
    if (this.scene.input.keyboard) {
      this.escKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
      this.escKey.on('down', this.handleEscKey, this);
    }

    this.updateGoldDisplay();
  }

  private handleEscKey(): void {
    if (this.isVisible) {
      this.close();
    }
  }

  private createHeader(): any {
    const title = this.scene.add.text(0, 0, 'SHOP', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: '#fbbf24',
      fontStyle: 'bold',
    });

    const closeBtn = this.scene.add.text(0, 0, 'X', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#9ca3af',
      fontStyle: 'bold',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ef4444'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#9ca3af'));
    closeBtn.on('pointerdown', () => this.close());

    return this.scene.rexUI.add.sizer({ orientation: 'x', space: { item: 20 } })
      .add(title, { align: 'left' })
      .addSpace()
      .add(closeBtn, { align: 'right' });
  }

  private createGoldDisplay(): Phaser.GameObjects.Text {
    this.goldDisplay = this.scene.add.text(0, 0, `Your Gold: ${this.player.gold}`, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffd700',
    });
    return this.goldDisplay;
  }

  private createItemGrid(): any {
    const cols = 5;
    const rows = Math.ceil(this.shopItems.length / cols);

    const gridSizer = this.scene.rexUI.add.gridSizer({
      column: cols,
      row: rows,
      columnProportions: 0,
      rowProportions: 0,
      space: { column: 10, row: 10 },
    });

    for (let i = 0; i < this.shopItems.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const slot = this.createItemSlot(i);
      gridSizer.add(slot.container, { column: col, row: row, align: 'center' });
    }

    return gridSizer;
  }

  private createItemSlot(index: number): { container: any; bg: any; soldOverlay: any; soldText: Phaser.GameObjects.Text; priceText: Phaser.GameObjects.Text } {
    const shopItem = this.shopItems[index];
    const item = shopItem.item;

    const bg = this.scene.rexUI.add.roundRectangle(0, 0, 75, 95, 4, 0x374151)
      .setStrokeStyle(1, RARITY_COLORS[item.rarity]);

    const iconTexture = this.getItemTexture(item);
    const icon = this.scene.add.sprite(0, 0, iconTexture);
    icon.setTint(RARITY_COLORS[item.rarity]);

    const name = item.name.length > 10 ? item.name.substring(0, 9) + '...' : item.name;
    const nameText = this.scene.add.text(0, 0, name, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });

    const priceText = this.scene.add.text(0, 0, `${shopItem.price}g`, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: this.player.canAfford(shopItem.price) ? '#ffd700' : '#ff6666',
    });

    const soldOverlay = this.scene.rexUI.add.roundRectangle(0, 0, 75, 95, 4, 0x000000, 0.7);
    soldOverlay.setVisible(shopItem.sold);

    const soldText = this.scene.add.text(0, 0, 'SOLD', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ff6666',
      fontStyle: 'bold',
    });
    soldText.setVisible(shopItem.sold);

    const container = this.scene.rexUI.add.overlapSizer({
      width: 75,
      height: 95,
    })
      .add(bg, { align: 'center', expand: false })
      .add(
        this.scene.rexUI.add.sizer({ orientation: 'y', space: { item: 5 } })
          .add(icon, { align: 'center' })
          .add(nameText, { align: 'center' })
          .add(priceText, { align: 'center' }),
        { align: 'center', expand: false }
      )
      .add(soldOverlay, { align: 'center', expand: false })
      .add(soldText, { align: 'center', expand: false });

    const slotData = { container, bg, soldOverlay, soldText, priceText };
    this.itemSlots.push(slotData);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      if (!shopItem.sold) {
        bg.setFillStyle(0x4b5563);
        this.showTooltip(item, shopItem.price);
      }
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x374151);
      this.hideTooltip();
    });
    bg.on('pointerdown', () => {
      if (!shopItem.sold) {
        this.buyItem(index);
      }
    });

    return slotData;
  }

  private createActionButtons(): any {
    const missingHp = this.player.maxHp - this.player.hp;

    // Heal button
    const healBg = this.scene.rexUI.add.roundRectangle(0, 0, 140, 35, 4, missingHp > 0 ? 0xef4444 : 0x666666);
    this.healText = this.scene.add.text(0, 0, missingHp > 0 ? `Heal Full (${this.healCost}g)` : 'Full HP', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    this.healBtn = this.scene.rexUI.add.label({
      background: healBg,
      text: this.healText,
      align: 'center',
      space: { left: 10, right: 10, top: 8, bottom: 8 },
    });

    if (missingHp > 0) {
      this.healBtn.setInteractive({ useHandCursor: true });
      this.healBtn.on('pointerover', () => healBg.setFillStyle(0xdc2626));
      this.healBtn.on('pointerout', () => healBg.setFillStyle(0xef4444));
      this.healBtn.on('pointerdown', () => this.buyHeal());
    }

    // Reroll button
    const rerollBg = this.scene.rexUI.add.roundRectangle(0, 0, 140, 35, 4, 0x8b5cf6);
    this.rerollText = this.scene.add.text(0, 0, `Reroll (${this.rerollCost}g)`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    const rerollBtn = this.scene.rexUI.add.label({
      background: rerollBg,
      text: this.rerollText,
      align: 'center',
      space: { left: 10, right: 10, top: 8, bottom: 8 },
    });

    rerollBtn.setInteractive({ useHandCursor: true });
    rerollBtn.on('pointerover', () => rerollBg.setFillStyle(0x7c3aed));
    rerollBtn.on('pointerout', () => rerollBg.setFillStyle(0x8b5cf6));
    rerollBtn.on('pointerdown', () => this.rerollShop());

    return this.scene.rexUI.add.sizer({
      orientation: 'x',
      space: { item: 20 },
    })
      .add(this.healBtn, { align: 'center' })
      .add(rerollBtn, { align: 'center' });
  }

  private getItemTexture(item: Item): string {
    switch (item.type) {
      case ItemType.WEAPON:
        if (item.weaponData) {
          const weapon = new Weapon(item.weaponData.weaponType, item.weaponData.rarity);
          return weapon.stats.texture;
        }
        return 'item_weapon';
      case ItemType.ARMOR:
        return 'item_armor';
      case ItemType.ACCESSORY:
        return 'item_accessory';
      case ItemType.CONSUMABLE:
        return 'item_consumable';
      default:
        return 'item_consumable';
    }
  }

  private showTooltip(item: Item, price: number): void {
    this.hideTooltip();
    if (!this.tooltipContainer) return;

    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    const bg = this.scene.add.rectangle(0, 0, 160, 90, 0x1f2937, 0.95);
    bg.setStrokeStyle(1, RARITY_COLORS[item.rarity]);

    const nameText = this.scene.add.text(0, -30, item.name, {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5);

    const descText = this.scene.add.text(0, 0, item.description, {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#aaaaaa',
      wordWrap: { width: 150 },
      align: 'center',
    });
    descText.setOrigin(0.5);

    const canAfford = this.player.canAfford(price);
    const priceInfo = this.scene.add.text(0, 30, canAfford ? 'Click to buy' : 'Not enough gold', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: canAfford ? '#22c55e' : '#ff6666',
    });
    priceInfo.setOrigin(0.5);

    this.tooltipContainer.add([bg, nameText, descText, priceInfo]);
    this.tooltipContainer.setPosition(centerX, centerY - 120);
    this.tooltipContainer.setVisible(true);
  }

  private hideTooltip(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.removeAll(true);
      this.tooltipContainer.setVisible(false);
    }
  }

  private buyItem(index: number): void {
    const shopItem = this.shopItems[index];
    if (shopItem.sold) return;

    if (!this.player.spendGold(shopItem.price)) {
      this.showMessage('Not enough gold!', '#ff6666');
      return;
    }

    if (!this.player.pickupItem(shopItem.item)) {
      this.player.addGold(shopItem.price);
      this.showMessage('Inventory full!', '#ff6666');
      return;
    }

    shopItem.sold = true;

    const slot = this.itemSlots[index];
    slot.soldOverlay.setVisible(true);
    slot.soldText.setVisible(true);

    this.updateGoldDisplay();
    this.showMessage(`Bought ${shopItem.item.name}!`, '#22c55e');
    this.hideTooltip();
  }

  private buyHeal(): void {
    if (this.player.hp >= this.player.maxHp) {
      this.showMessage('Already at full HP!', '#ff6666');
      return;
    }

    if (!this.player.spendGold(this.healCost)) {
      this.showMessage('Not enough gold!', '#ff6666');
      return;
    }

    this.player.hp = this.player.maxHp;
    this.updateGoldDisplay();

    // Update heal button
    if (this.healBtn && this.healText) {
      const bg = this.healBtn.getElement('background');
      if (bg) bg.setFillStyle(0x666666);
      this.healText.setText('Full HP');
      this.healBtn.disableInteractive();
    }

    this.showMessage('Healed to full!', '#22c55e');
  }

  private rerollShop(): void {
    if (!this.player.spendGold(this.rerollCost)) {
      this.showMessage('Not enough gold!', '#ff6666');
      return;
    }

    this.rerollCost = Math.floor(this.rerollCost * 1.5);

    // Update reroll button text
    if (this.rerollText) {
      this.rerollText.setText(`Reroll (${this.rerollCost}g)`);
    }

    // Regenerate and rebuild
    this.generateShopInventory();

    // Close and reopen to rebuild
    const callback = this.onCloseCallback;
    this.close();
    this.show(callback);

    this.showMessage('Shop rerolled!', '#8b5cf6');
  }

  private updateGoldDisplay(): void {
    if (this.goldDisplay) {
      this.goldDisplay.setText(`Your Gold: ${this.player.gold}`);
    }

    // Update price colors
    for (let i = 0; i < this.itemSlots.length; i++) {
      const slot = this.itemSlots[i];
      const shopItem = this.shopItems[i];
      if (slot.priceText && !shopItem.sold) {
        slot.priceText.setColor(this.player.canAfford(shopItem.price) ? '#ffd700' : '#ff6666');
      }
    }
  }

  private showMessage(text: string, color: string): void {
    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    const message = this.scene.add.text(centerX, centerY + 100, text, {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: color,
      fontStyle: 'bold',
    });
    message.setOrigin(0.5);
    message.setDepth(260);

    this.scene.tweens.add({
      targets: message,
      alpha: 0,
      y: centerY + 80,
      duration: 1000,
      delay: 500,
      onComplete: () => message.destroy(),
    });
  }

  close(): void {
    this.isVisible = false;
    this.hideTooltip();

    // Remove ESC key listener
    if (this.escKey) {
      this.escKey.off('down', this.handleEscKey, this);
      this.escKey = null;
    }

    if (this.tooltipContainer) {
      this.tooltipContainer.destroy();
      this.tooltipContainer = null;
    }
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
    }
    if (this.overlay) {
      this.overlay.destroy();
      this.overlay = null;
    }

    this.itemSlots = [];
    this.goldDisplay = null;
    this.healBtn = null;
    this.healText = null;
    this.rerollText = null;

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }

  rerollInventory(): void {
    this.generateShopInventory();

    if (this.isVisible) {
      const callback = this.onCloseCallback;
      this.close();
      this.show(callback);
    }
  }

  destroy(): void {
    this.close();
  }
}
