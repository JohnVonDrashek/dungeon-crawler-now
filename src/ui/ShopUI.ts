import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Item, ItemType, ItemRarity, generateProceduralItemOfType, RARITY_COLORS } from '../systems/Item';
import { Weapon } from '../systems/Weapon';
import { createItemFromWeapon } from '../systems/Item';

interface ShopItem {
  item: Item;
  price: number;
  sold: boolean;
}

export class ShopUI {
  private scene: Phaser.Scene;
  private player: Player;
  private container: Phaser.GameObjects.Container;
  private isVisible: boolean = false;
  private floor: number;

  private shopItems: ShopItem[] = [];
  private healCost: number = 0;
  private rerollCost: number = 50;
  private itemSlots: Phaser.GameObjects.Container[] = [];

  private onCloseCallback?: () => void;

  constructor(scene: Phaser.Scene, player: Player, floor: number) {
    this.scene = scene;
    this.player = player;
    this.floor = floor;

    // Create container at 0,0 - we'll reposition it when shown
    this.container = scene.add.container(0, 0);
    this.container.setDepth(200);
    this.container.setVisible(false);

    this.generateShopInventory();
    this.createUI();
  }

  private updatePosition(): void {
    // Position the container at the screen center
    // Use scale dimensions for reliable screen size, camera scroll for offset
    const camera = this.scene.cameras.main;
    const screenWidth = this.scene.scale.width;
    const screenHeight = this.scene.scale.height;
    this.container.setPosition(
      camera.scrollX + screenWidth / 2,
      camera.scrollY + screenHeight / 2
    );
  }

  private generateShopInventory(): void {
    this.shopItems = [];

    // Generate 4-6 items for sale
    const itemCount = 4 + Math.floor(Math.random() * 3);

    for (let i = 0; i < itemCount; i++) {
      const roll = Math.random();
      let item: Item;

      if (roll < 0.3) {
        // 30% chance for weapon
        const weapon = Weapon.createRandom(this.floor);
        item = createItemFromWeapon(weapon);
      } else if (roll < 0.5) {
        // 20% chance for consumable (health potion)
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
        // 50% chance for armor/accessory
        const type = Math.random() < 0.5 ? ItemType.ARMOR : ItemType.ACCESSORY;
        const rarityRoll = Math.random();
        let rarity: ItemRarity;
        if (rarityRoll < 0.5) rarity = ItemRarity.COMMON;
        else if (rarityRoll < 0.8) rarity = ItemRarity.UNCOMMON;
        else if (rarityRoll < 0.95) rarity = ItemRarity.RARE;
        else rarity = ItemRarity.EPIC;

        item = generateProceduralItemOfType(this.floor, rarity, type);
      }

      // Calculate price based on rarity and floor
      const basePrice = this.getBasePrice(item);
      const price = Math.floor(basePrice * (1 + this.floor * 0.1));

      this.shopItems.push({ item, price, sold: false });
    }

    // Calculate heal cost based on missing HP
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

  private createUI(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    // Dark overlay (positioned at 0,0 relative to container which is at screen center)
    const overlay = this.scene.add.rectangle(
      0, 0,
      width * 2, height * 2,
      0x000000, 0.8
    );
    this.container.add(overlay);

    // Shop panel - centered at container origin (0,0)
    const panelWidth = 500;
    const panelHeight = 400;

    const panel = this.scene.add.rectangle(
      0, 0,
      panelWidth, panelHeight,
      0x1f2937, 1
    );
    panel.setStrokeStyle(2, 0xfbbf24);
    this.container.add(panel);

    // Title
    const title = this.scene.add.text(0, -170, 'SHOP', {
      fontSize: '24px',
      color: '#fbbf24',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    this.container.add(title);

    // Player gold display
    const goldDisplay = this.scene.add.text(0, -140, `Your Gold: ${this.player.gold}`, {
      fontSize: '16px',
      color: '#ffd700',
    });
    goldDisplay.setOrigin(0.5);
    goldDisplay.setName('goldDisplay');
    this.container.add(goldDisplay);

    // Create item slots (centered at 0,0)
    this.createItemSlots(0, 0);

    // Heal button
    this.createHealButton(-100, 130);

    // Reroll button
    this.createRerollButton(100, 130);

    // Continue button
    const continueBtn = this.scene.add.rectangle(
      0, 170,
      120, 35,
      0x22c55e
    );
    continueBtn.setInteractive({ useHandCursor: true });
    continueBtn.on('pointerover', () => continueBtn.setFillStyle(0x16a34a));
    continueBtn.on('pointerout', () => continueBtn.setFillStyle(0x22c55e));
    continueBtn.on('pointerdown', () => this.close());

    const continueText = this.scene.add.text(0, 170, 'Continue →', {
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    continueText.setOrigin(0.5);

    this.container.add([continueBtn, continueText]);
  }

  private createItemSlots(centerX: number, centerY: number): void {
    const startX = centerX - 200;
    const startY = centerY - 100;
    const slotWidth = 80;
    const slotHeight = 100;
    const cols = 5;

    this.itemSlots = [];

    for (let i = 0; i < this.shopItems.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (slotWidth + 10) + slotWidth / 2;
      const y = startY + row * (slotHeight + 10) + slotHeight / 2;

      const slot = this.createItemSlot(x, y, i);
      this.itemSlots.push(slot);
      this.container.add(slot);
    }
  }

  private createItemSlot(x: number, y: number, index: number): Phaser.GameObjects.Container {
    const shopItem = this.shopItems[index];
    const item = shopItem.item;
    const container = this.scene.add.container(x, y);

    // Background
    const bg = this.scene.add.rectangle(0, 0, 75, 95, 0x374151);
    bg.setStrokeStyle(1, RARITY_COLORS[item.rarity]);
    container.add(bg);

    // Item icon
    const iconTexture = this.getItemTexture(item);
    const icon = this.scene.add.sprite(0, -20, iconTexture);
    icon.setTint(RARITY_COLORS[item.rarity]);
    container.add(icon);

    // Item name (truncated)
    const name = item.name.length > 10 ? item.name.substring(0, 9) + '...' : item.name;
    const nameText = this.scene.add.text(0, 10, name, {
      fontSize: '9px',
      color: '#ffffff',
    });
    nameText.setOrigin(0.5);
    container.add(nameText);

    // Price
    const priceText = this.scene.add.text(0, 30, `${shopItem.price}g`, {
      fontSize: '11px',
      color: this.player.canAfford(shopItem.price) ? '#ffd700' : '#ff6666',
    });
    priceText.setOrigin(0.5);
    priceText.setName('price');
    container.add(priceText);

    // Sold overlay
    const soldOverlay = this.scene.add.rectangle(0, 0, 75, 95, 0x000000, 0.7);
    soldOverlay.setVisible(shopItem.sold);
    soldOverlay.setName('soldOverlay');
    container.add(soldOverlay);

    const soldText = this.scene.add.text(0, 0, 'SOLD', {
      fontSize: '12px',
      color: '#ff6666',
      fontStyle: 'bold',
    });
    soldText.setOrigin(0.5);
    soldText.setVisible(shopItem.sold);
    soldText.setName('soldText');
    container.add(soldText);

    // Make interactive
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerover', () => {
      if (!shopItem.sold) {
        bg.setFillStyle(0x4b5563);
        this.showTooltip(x, y - 60, item, shopItem.price);
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

    return container;
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

  private tooltip: Phaser.GameObjects.Container | null = null;

  private showTooltip(x: number, y: number, item: Item, price: number): void {
    this.hideTooltip();

    const tooltip = this.scene.add.container(x, y);
    tooltip.setDepth(250);

    const bg = this.scene.add.rectangle(0, 0, 150, 80, 0x1f2937, 0.95);
    bg.setStrokeStyle(1, RARITY_COLORS[item.rarity]);

    const nameText = this.scene.add.text(0, -25, item.name, {
      fontSize: '11px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    nameText.setOrigin(0.5);

    const descText = this.scene.add.text(0, 0, item.description, {
      fontSize: '9px',
      color: '#aaaaaa',
      wordWrap: { width: 140 },
      align: 'center',
    });
    descText.setOrigin(0.5);

    const canAfford = this.player.canAfford(price);
    const priceInfo = this.scene.add.text(0, 25, canAfford ? 'Click to buy' : 'Not enough gold', {
      fontSize: '9px',
      color: canAfford ? '#22c55e' : '#ff6666',
    });
    priceInfo.setOrigin(0.5);

    tooltip.add([bg, nameText, descText, priceInfo]);
    this.container.add(tooltip);
    this.tooltip = tooltip;
  }

  private hideTooltip(): void {
    if (this.tooltip) {
      this.tooltip.destroy();
      this.tooltip = null;
    }
  }

  private buyItem(index: number): void {
    const shopItem = this.shopItems[index];
    if (shopItem.sold) return;

    if (!this.player.spendGold(shopItem.price)) {
      // Show "not enough gold" feedback
      this.showMessage('Not enough gold!', '#ff6666');
      return;
    }

    // Add item to player inventory
    if (!this.player.pickupItem(shopItem.item)) {
      // Inventory full - refund
      this.player.addGold(shopItem.price);
      this.showMessage('Inventory full!', '#ff6666');
      return;
    }

    // Mark as sold
    shopItem.sold = true;

    // Update UI
    const slot = this.itemSlots[index];
    const soldOverlay = slot.getByName('soldOverlay') as Phaser.GameObjects.Rectangle;
    const soldText = slot.getByName('soldText') as Phaser.GameObjects.Text;
    soldOverlay.setVisible(true);
    soldText.setVisible(true);

    this.updateGoldDisplay();
    this.showMessage(`Bought ${shopItem.item.name}!`, '#22c55e');
    this.hideTooltip();
  }

  private createHealButton(x: number, y: number): void {
    const missingHp = this.player.maxHp - this.player.hp;

    const btn = this.scene.add.rectangle(x, y, 140, 35, 0xef4444);
    btn.setInteractive({ useHandCursor: true });
    btn.setName('healBtn');

    const text = this.scene.add.text(x, y, `Heal Full (${this.healCost}g)`, {
      fontSize: '12px',
      color: '#ffffff',
    });
    text.setOrigin(0.5);
    text.setName('healText');

    if (missingHp <= 0) {
      btn.setFillStyle(0x666666);
      text.setText('Full HP');
    }

    btn.on('pointerover', () => {
      if (missingHp > 0) btn.setFillStyle(0xdc2626);
    });
    btn.on('pointerout', () => {
      if (missingHp > 0) btn.setFillStyle(0xef4444);
    });
    btn.on('pointerdown', () => {
      if (missingHp > 0) {
        this.buyHeal();
      }
    });

    this.container.add([btn, text]);
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
    const healBtn = this.container.getByName('healBtn') as Phaser.GameObjects.Rectangle;
    const healText = this.container.getByName('healText') as Phaser.GameObjects.Text;
    healBtn.setFillStyle(0x666666);
    healText.setText('Full HP');

    this.showMessage('Healed to full!', '#22c55e');
  }

  private createRerollButton(x: number, y: number): void {
    const btn = this.scene.add.rectangle(x, y, 140, 35, 0x8b5cf6);
    btn.setInteractive({ useHandCursor: true });

    const text = this.scene.add.text(x, y, `Reroll (${this.rerollCost}g)`, {
      fontSize: '12px',
      color: '#ffffff',
    });
    text.setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x7c3aed));
    btn.on('pointerout', () => btn.setFillStyle(0x8b5cf6));
    btn.on('pointerdown', () => this.rerollShop());

    this.container.add([btn, text]);
  }

  private rerollShop(): void {
    if (!this.player.spendGold(this.rerollCost)) {
      this.showMessage('Not enough gold!', '#ff6666');
      return;
    }

    // Increase reroll cost
    this.rerollCost = Math.floor(this.rerollCost * 1.5);

    // Destroy old slots
    for (const slot of this.itemSlots) {
      slot.destroy();
    }
    this.itemSlots = [];

    // Generate new inventory
    this.generateShopInventory();

    // Recreate slots (centered at 0,0)
    this.createItemSlots(0, 0);

    this.updateGoldDisplay();
    this.showMessage('Shop rerolled!', '#8b5cf6');
  }

  private updateGoldDisplay(): void {
    const goldDisplay = this.container.getByName('goldDisplay') as Phaser.GameObjects.Text;
    if (goldDisplay) {
      goldDisplay.setText(`Your Gold: ${this.player.gold}`);
    }

    // Update price colors
    for (let i = 0; i < this.itemSlots.length; i++) {
      const slot = this.itemSlots[i];
      const shopItem = this.shopItems[i];
      const priceText = slot.getByName('price') as Phaser.GameObjects.Text;
      if (priceText && !shopItem.sold) {
        priceText.setColor(this.player.canAfford(shopItem.price) ? '#ffd700' : '#ff6666');
      }
    }
  }

  private message: Phaser.GameObjects.Text | null = null;

  private showMessage(text: string, color: string): void {
    if (this.message) {
      this.message.destroy();
    }

    // Position relative to container (which is at screen center)
    this.message = this.scene.add.text(0, 80, text, {
      fontSize: '16px',
      color: color,
      fontStyle: 'bold',
    });
    this.message.setOrigin(0.5);
    this.message.setDepth(260);
    this.container.add(this.message);

    this.scene.tweens.add({
      targets: this.message,
      alpha: 0,
      y: 60,
      duration: 1000,
      delay: 500,
      onComplete: () => {
        if (this.message) {
          this.message.destroy();
          this.message = null;
        }
      },
    });
  }

  show(onClose?: () => void): void {
    this.onCloseCallback = onClose;
    this.isVisible = true;
    this.updatePosition();
    this.container.setVisible(true);
    this.updateGoldDisplay();
  }

  close(): void {
    this.isVisible = false;
    this.container.setVisible(false);
    this.hideTooltip();
    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  getIsVisible(): boolean {
    return this.isVisible;
  }

  // Called externally (e.g., from reroll crystal in ShopScene)
  rerollInventory(): void {
    // Destroy old slots
    for (const slot of this.itemSlots) {
      slot.destroy();
    }
    this.itemSlots = [];

    // Generate new inventory
    this.generateShopInventory();

    // Recreate slots if visible (centered at 0,0)
    if (this.isVisible) {
      this.createItemSlots(0, 0);
      this.updateGoldDisplay();
    }
  }

  destroy(): void {
    this.hideTooltip();
    if (this.message) {
      this.message.destroy();
    }
    this.container.destroy();
  }
}
