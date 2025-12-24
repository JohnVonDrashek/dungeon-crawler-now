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

interface SlotData {
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  index: number;
}

export class ShopUI {
  private scene: Phaser.Scene;
  private player: Player;
  private panel: Phaser.GameObjects.Container | null = null;
  private overlay: Phaser.GameObjects.Rectangle | null = null;
  private isVisible: boolean = false;
  private floor: number;

  private shopItems: ShopItem[] = [];
  private healCost: number = 0;
  private rerollCost: number = 50;
  private itemSlots: SlotData[] = [];

  private goldText: Phaser.GameObjects.Text | null = null;
  private healButton: Phaser.GameObjects.Container | null = null;
  private healButtonText: Phaser.GameObjects.Text | null = null;
  private tooltipContainer: Phaser.GameObjects.Container | null = null;
  private keyListener: ((event: KeyboardEvent) => void) | null = null;

  private onCloseCallback?: () => void;

  // Styling constants
  private readonly PANEL_WIDTH = 520;
  private readonly PANEL_HEIGHT = 400;
  private readonly SLOT_SIZE = 70;
  private readonly SLOT_GAP = 10;
  private readonly SLOTS_PER_ROW = 5;

  constructor(scene: Phaser.Scene, player: Player, floor: number) {
    this.scene = scene;
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

    // Background overlay - start transparent for fade-in
    this.overlay = this.scene.add.rectangle(centerX, centerY, cam.width * 2, cam.height * 2, 0x000000, 0);
    this.overlay.setDepth(199);

    // Create main panel off-screen for slide-in animation
    this.panel = this.scene.add.container(centerX, centerY + cam.height);
    this.panel.setDepth(200);
    this.panel.setAlpha(0);

    this.createPanel();
    this.createTooltipContainer();
    this.setupInput();
    this.updateGoldDisplay();

    // Animate overlay fade and panel slide-in
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
    if (!this.panel) return;

    const halfW = this.PANEL_WIDTH / 2;
    const halfH = this.PANEL_HEIGHT / 2;

    // Main background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a0a, 0.95);
    bg.fillRoundedRect(-halfW, -halfH, this.PANEL_WIDTH, this.PANEL_HEIGHT, 8);
    bg.lineStyle(1, 0x444444, 0.8);
    bg.strokeRoundedRect(-halfW, -halfH, this.PANEL_WIDTH, this.PANEL_HEIGHT, 8);
    this.panel.add(bg);

    // Corner accents
    this.drawCornerAccents(halfW, halfH);

    // Header section
    this.createHeader(halfW, halfH);

    // Gold display
    this.createGoldDisplay(halfW, halfH);

    // Item grid
    this.createItemGrid(halfH);

    // Action buttons
    this.createActionButtons(halfH);
  }

  private drawCornerAccents(halfW: number, halfH: number): void {
    if (!this.panel) return;

    const corners = this.scene.add.graphics();
    corners.lineStyle(2, 0xff6600, 0.9);
    const cornerSize = 16;

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

    this.panel.add(corners);
  }

  private createHeader(halfW: number, halfH: number): void {
    if (!this.panel) return;

    // Header background
    const headerBg = this.scene.add.graphics();
    headerBg.fillStyle(0x1a1a1a, 0.8);
    headerBg.fillRect(-halfW + 15, -halfH + 15, this.PANEL_WIDTH - 30, 40);
    this.panel.add(headerBg);

    // Shop title with accent
    const shopAccent = this.scene.add.text(-halfW + 25, -halfH + 35, '◆', {
      fontSize: '14px',
      color: '#ff6600',
    });
    shopAccent.setOrigin(0, 0.5);
    this.panel.add(shopAccent);

    const title = this.scene.add.text(-halfW + 45, -halfH + 35, 'SHOP', {
      fontSize: '20px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ffffff',
    });
    title.setOrigin(0, 0.5);
    this.panel.add(title);

    // Close button
    const closeBtn = this.scene.add.text(halfW - 35, -halfH + 35, '✕', {
      fontSize: '18px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#666666',
    });
    closeBtn.setOrigin(0.5, 0.5);
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerover', () => closeBtn.setColor('#ff4444'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#666666'));
    closeBtn.on('pointerdown', () => this.close());
    this.panel.add(closeBtn);
  }

  private createGoldDisplay(halfW: number, halfH: number): void {
    if (!this.panel) return;

    // Gold container
    const goldContainer = this.scene.add.container(halfW - 30, -halfH + 35);

    const goldIcon = this.scene.add.text(-50, 0, '◆', {
      fontSize: '14px',
      color: '#ffd700',
    });
    goldIcon.setOrigin(0.5, 0.5);
    goldContainer.add(goldIcon);

    this.goldText = this.scene.add.text(-35, 0, `${this.player.gold}`, {
      fontSize: '14px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#ffd700',
    });
    this.goldText.setOrigin(0, 0.5);
    goldContainer.add(this.goldText);

    this.panel.add(goldContainer);
  }

  private createItemGrid(halfH: number): void {
    if (!this.panel) return;

    const gridStartY = -halfH + 95;
    const gridCenterX = 0;
    const gridWidth = this.SLOTS_PER_ROW * (this.SLOT_SIZE + this.SLOT_GAP) - this.SLOT_GAP;
    const startX = gridCenterX - gridWidth / 2 + this.SLOT_SIZE / 2;

    for (let i = 0; i < this.shopItems.length; i++) {
      const col = i % this.SLOTS_PER_ROW;
      const row = Math.floor(i / this.SLOTS_PER_ROW);
      const x = startX + col * (this.SLOT_SIZE + this.SLOT_GAP);
      const y = gridStartY + row * (this.SLOT_SIZE + 25 + this.SLOT_GAP);

      this.createItemSlot(i, x, y);
    }
  }

  private createItemSlot(index: number, x: number, y: number): void {
    if (!this.panel) return;

    const shopItem = this.shopItems[index];
    const item = shopItem.item;

    const slotContainer = this.scene.add.container(x, y);

    // Slot background
    const slotBg = this.scene.add.graphics();
    slotBg.fillStyle(0x1a1a1a, 0.9);
    slotBg.fillRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE + 20, 4);
    slotBg.lineStyle(1, RARITY_COLORS[item.rarity], 0.8);
    slotBg.strokeRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE + 20, 4);
    slotContainer.add(slotBg);

    // Item icon
    const iconTexture = this.getItemTexture(item);
    const icon = this.scene.add.sprite(0, -8, iconTexture);
    icon.setTint(RARITY_COLORS[item.rarity]);
    slotContainer.add(icon);

    // Item name (truncated)
    const name = item.name.length > 8 ? item.name.substring(0, 7) + '..' : item.name;
    const nameText = this.scene.add.text(0, this.SLOT_SIZE / 2 - 12, name, {
      fontSize: '9px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#aaaaaa',
    });
    nameText.setOrigin(0.5, 0.5);
    slotContainer.add(nameText);

    // Price
    const canAfford = this.player.canAfford(shopItem.price);
    const priceText = this.scene.add.text(0, this.SLOT_SIZE / 2 + 4, `${shopItem.price}g`, {
      fontSize: '11px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: canAfford ? '#ffd700' : '#ff4444',
    });
    priceText.setOrigin(0.5, 0.5);
    priceText.setData('slotIndex', index);
    slotContainer.add(priceText);

    // Sold overlay (initially hidden)
    const soldOverlay = this.scene.add.graphics();
    soldOverlay.fillStyle(0x000000, 0.75);
    soldOverlay.fillRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE + 20, 4);
    soldOverlay.setVisible(shopItem.sold);
    slotContainer.add(soldOverlay);

    const soldText = this.scene.add.text(0, 0, 'SOLD', {
      fontSize: '12px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: '#ff4444',
    });
    soldText.setOrigin(0.5, 0.5);
    soldText.setVisible(shopItem.sold);
    slotContainer.add(soldText);

    // Store references
    slotContainer.setData('index', index);
    slotContainer.setData('soldOverlay', soldOverlay);
    slotContainer.setData('soldText', soldText);
    slotContainer.setData('priceText', priceText);

    // Interactive hit area
    const hitArea = this.scene.add.rectangle(0, 5, this.SLOT_SIZE, this.SLOT_SIZE + 20, 0xffffff, 0);
    hitArea.setInteractive({ useHandCursor: true });
    hitArea.on('pointerover', () => {
      if (!shopItem.sold) {
        slotBg.clear();
        slotBg.fillStyle(0x2a2a2a, 0.9);
        slotBg.fillRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE + 20, 4);
        slotBg.lineStyle(2, 0xff6600, 1);
        slotBg.strokeRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE + 20, 4);
        this.showTooltip(item, shopItem.price, x, y - this.SLOT_SIZE);
      }
    });
    hitArea.on('pointerout', () => {
      slotBg.clear();
      slotBg.fillStyle(0x1a1a1a, 0.9);
      slotBg.fillRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE + 20, 4);
      slotBg.lineStyle(1, RARITY_COLORS[item.rarity], 0.8);
      slotBg.strokeRoundedRect(-this.SLOT_SIZE / 2, -this.SLOT_SIZE / 2, this.SLOT_SIZE, this.SLOT_SIZE + 20, 4);
      this.hideTooltip();
    });
    hitArea.on('pointerdown', () => {
      if (!shopItem.sold) {
        this.buyItem(index, slotContainer);
      }
    });
    slotContainer.add(hitArea);

    this.panel.add(slotContainer);
    this.itemSlots.push({ container: slotContainer, bg: slotBg, index });
  }

  private createActionButtons(halfH: number): void {
    if (!this.panel) return;

    const buttonY = halfH - 50;
    const buttonWidth = 150;
    const buttonHeight = 38;

    // Heal button
    this.healButton = this.createButton(
      -90,
      buttonY,
      buttonWidth,
      buttonHeight,
      this.getHealButtonText(),
      this.player.hp < this.player.maxHp ? 0x8b0000 : 0x333333,
      () => this.buyHeal()
    );
    this.healButtonText = this.healButton.getData('text') as Phaser.GameObjects.Text;
    this.panel.add(this.healButton);

    // Reroll button
    const rerollBtn = this.createButton(
      90,
      buttonY,
      buttonWidth,
      buttonHeight,
      `Reroll (${this.rerollCost}g)`,
      0x4a1a7a,
      () => this.rerollShop()
    );
    this.panel.add(rerollBtn);
  }

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

    const bg = this.scene.add.graphics();
    bg.fillStyle(color, 0.9);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 4);
    bg.lineStyle(1, 0x666666, 0.5);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 4);
    container.add(bg);

    // Button corner accents (small)
    const corners = this.scene.add.graphics();
    corners.lineStyle(1, 0xff6600, 0.7);
    const cs = 6;
    const hw = width / 2;
    const hh = height / 2;
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
      fontSize: '12px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#ffffff',
    });
    text.setOrigin(0.5, 0.5);
    container.add(text);

    container.setData('text', text);
    container.setData('bg', bg);
    container.setData('color', color);

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

  private getHealButtonText(): string {
    const missingHp = this.player.maxHp - this.player.hp;
    return missingHp > 0 ? `Heal Full (${this.healCost}g)` : 'Full HP';
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

  private createTooltipContainer(): void {
    this.tooltipContainer = this.scene.add.container(0, 0);
    this.tooltipContainer.setDepth(251);
    this.tooltipContainer.setVisible(false);
  }

  private showTooltip(item: Item, price: number, slotX: number, slotY: number): void {
    this.hideTooltip();
    if (!this.tooltipContainer || !this.panel) return;

    const cam = this.scene.cameras.main;
    const panelX = cam.scrollX + cam.width / 2;
    const panelY = cam.scrollY + cam.height / 2;

    const tooltipWidth = 180;
    const tooltipHeight = 100;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a0a, 0.95);
    bg.fillRoundedRect(-tooltipWidth / 2, -tooltipHeight / 2, tooltipWidth, tooltipHeight, 6);
    bg.lineStyle(1, RARITY_COLORS[item.rarity], 0.8);
    bg.strokeRoundedRect(-tooltipWidth / 2, -tooltipHeight / 2, tooltipWidth, tooltipHeight, 6);

    // Corner accents
    const corners = this.scene.add.graphics();
    corners.lineStyle(1, 0xff6600, 0.6);
    const cs = 8;
    const hw = tooltipWidth / 2;
    const hh = tooltipHeight / 2;
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

    const nameText = this.scene.add.text(0, -tooltipHeight / 2 + 15, item.name, {
      fontSize: '11px',
      fontFamily: 'Cinzel, Georgia, serif',
      color: `#${RARITY_COLORS[item.rarity].toString(16).padStart(6, '0')}`,
    });
    nameText.setOrigin(0.5, 0);

    const descText = this.scene.add.text(0, -5, item.description, {
      fontSize: '9px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: '#aaaaaa',
      wordWrap: { width: tooltipWidth - 20 },
      align: 'center',
    });
    descText.setOrigin(0.5, 0.5);

    const canAfford = this.player.canAfford(price);
    const actionText = this.scene.add.text(0, tooltipHeight / 2 - 18, canAfford ? 'Click to buy' : 'Not enough gold', {
      fontSize: '9px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: canAfford ? '#44ff44' : '#ff4444',
    });
    actionText.setOrigin(0.5, 0.5);

    this.tooltipContainer.add([bg, corners, nameText, descText, actionText]);
    this.tooltipContainer.setPosition(panelX + slotX, panelY + slotY - 60);
    this.tooltipContainer.setVisible(true);
  }

  private hideTooltip(): void {
    if (this.tooltipContainer) {
      this.tooltipContainer.removeAll(true);
      this.tooltipContainer.setVisible(false);
    }
  }

  private setupInput(): void {
    this.keyListener = (event: KeyboardEvent) => {
      if (!this.isVisible) return;

      if (event.code === 'Escape') {
        event.preventDefault();
        this.close();
      }
    };

    this.scene.input.keyboard?.on('keydown', this.keyListener);
  }

  private buyItem(index: number, slotContainer: Phaser.GameObjects.Container): void {
    const shopItem = this.shopItems[index];
    if (shopItem.sold) return;

    if (!this.player.spendGold(shopItem.price)) {
      this.showMessage('Not enough gold!', '#ff4444');
      return;
    }

    if (!this.player.pickupItem(shopItem.item)) {
      this.player.addGold(shopItem.price);
      this.showMessage('Inventory full!', '#ff4444');
      return;
    }

    shopItem.sold = true;

    const soldOverlay = slotContainer.getData('soldOverlay') as Phaser.GameObjects.Graphics;
    const soldText = slotContainer.getData('soldText') as Phaser.GameObjects.Text;
    soldOverlay.setVisible(true);
    soldText.setVisible(true);

    this.updateGoldDisplay();
    this.showMessage(`Bought ${shopItem.item.name}!`, '#44ff44');
    this.hideTooltip();
  }

  private buyHeal(): void {
    if (this.player.hp >= this.player.maxHp) {
      this.showMessage('Already at full HP!', '#ff4444');
      return;
    }

    if (!this.player.spendGold(this.healCost)) {
      this.showMessage('Not enough gold!', '#ff4444');
      return;
    }

    this.player.hp = this.player.maxHp;
    this.updateGoldDisplay();

    // Update heal button
    if (this.healButton && this.healButtonText) {
      this.healButtonText.setText('Full HP');
      const bg = this.healButton.getData('bg') as Phaser.GameObjects.Graphics;
      bg.clear();
      bg.fillStyle(0x333333, 0.9);
      bg.fillRoundedRect(-75, -19, 150, 38, 4);
      bg.lineStyle(1, 0x666666, 0.5);
      bg.strokeRoundedRect(-75, -19, 150, 38, 4);
    }

    this.showMessage('Healed to full!', '#44ff44');
  }

  private rerollShop(): void {
    if (!this.player.spendGold(this.rerollCost)) {
      this.showMessage('Not enough gold!', '#ff4444');
      return;
    }

    this.rerollCost = Math.floor(this.rerollCost * 1.5);

    // Regenerate and rebuild
    this.generateShopInventory();

    // Close and reopen to rebuild
    const callback = this.onCloseCallback;
    this.close();
    this.show(callback);

    this.showMessage('Shop rerolled!', '#aa44ff');
  }

  private updateGoldDisplay(): void {
    if (this.goldText) {
      this.goldText.setText(`${this.player.gold}`);
    }

    // Update price colors for all items
    if (this.panel) {
      this.itemSlots.forEach((slot) => {
        const priceText = slot.container.getData('priceText') as Phaser.GameObjects.Text;
        const shopItem = this.shopItems[slot.index];
        if (priceText && !shopItem.sold) {
          priceText.setColor(this.player.canAfford(shopItem.price) ? '#ffd700' : '#ff4444');
        }
      });
    }
  }

  private showMessage(text: string, color: string): void {
    const cam = this.scene.cameras.main;
    const centerX = cam.scrollX + cam.width / 2;
    const centerY = cam.scrollY + cam.height / 2;

    const message = this.scene.add.text(centerX, centerY + 130, text, {
      fontSize: '14px',
      fontFamily: 'Roboto Mono, Courier New, monospace',
      color: color,
    });
    message.setOrigin(0.5);
    message.setDepth(260);

    this.scene.tweens.add({
      targets: message,
      alpha: 0,
      y: centerY + 110,
      duration: 1000,
      delay: 500,
      onComplete: () => message.destroy(),
    });
  }

  close(): void {
    this.isVisible = false;
    this.hideTooltip();

    if (this.keyListener) {
      this.scene.input.keyboard?.off('keydown', this.keyListener);
      this.keyListener = null;
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
    this.goldText = null;
    this.healButton = null;
    this.healButtonText = null;

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
