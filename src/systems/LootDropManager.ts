import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { AudioSystem } from './AudioSystem';
import { Item, ItemType, RARITY_COLORS, createItemFromWeapon } from './Item';
import { Weapon } from './Weapon';

export class LootDropManager {
  private scene: Phaser.Scene;
  private player: Player;
  private audioSystem: AudioSystem;

  private itemDrops!: Phaser.Physics.Arcade.Group;
  private weaponDrops!: Phaser.Physics.Arcade.Group;
  private goldDrops!: Phaser.Physics.Arcade.Group;

  constructor(scene: Phaser.Scene, player: Player, audioSystem: AudioSystem) {
    this.scene = scene;
    this.player = player;
    this.audioSystem = audioSystem;
  }

  create(): void {
    this.itemDrops = this.scene.physics.add.group();
    this.weaponDrops = this.scene.physics.add.group();
    this.goldDrops = this.scene.physics.add.group();
  }

  getGroups(): {
    items: Phaser.Physics.Arcade.Group;
    weapons: Phaser.Physics.Arcade.Group;
    gold: Phaser.Physics.Arcade.Group;
  } {
    return {
      items: this.itemDrops,
      weapons: this.weaponDrops,
      gold: this.goldDrops,
    };
  }

  // === SPAWN METHODS ===

  spawnItemDrop(x: number, y: number, item: Item): void {
    const texture = this.getItemDropTexture(item);
    const drop = this.itemDrops.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
    drop.setData('item', item);
    drop.setDepth(5);
    drop.setTint(RARITY_COLORS[item.rarity]);

    // Add glow effect behind the item
    const glow = this.scene.add.sprite(x, y, 'weapon_drop_glow');
    glow.setDepth(4);
    glow.setTint(RARITY_COLORS[item.rarity]);
    glow.setAlpha(0.4);
    drop.setData('glow', glow);

    // Floating animation
    this.scene.tweens.add({
      targets: [drop, glow],
      y: y - 5,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Glow pulse
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.7,
      scale: 1.3,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pop-in animation
    drop.setScale(0);
    glow.setScale(0);
    this.scene.tweens.add({
      targets: [drop, glow],
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
  }

  spawnWeaponDrop(x: number, y: number, weapon: Weapon): void {
    const drop = this.weaponDrops.create(x, y, weapon.stats.texture) as Phaser.Physics.Arcade.Sprite;
    drop.setData('weapon', weapon);
    drop.setDepth(5);

    // Rarity-based tint
    const rarityColors = [0xffffff, 0x00ff00, 0x0088ff, 0xaa00ff, 0xffaa00];
    drop.setTint(rarityColors[weapon.rarity]);

    // Add glow effect
    const glow = this.scene.add.sprite(x, y, 'weapon_drop_glow');
    glow.setDepth(4);
    glow.setTint(rarityColors[weapon.rarity]);
    glow.setAlpha(0.5);
    drop.setData('glow', glow);

    // Floating animation
    this.scene.tweens.add({
      targets: [drop, glow],
      y: y - 6,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Glow pulse
    this.scene.tweens.add({
      targets: glow,
      alpha: 0.8,
      scale: 1.2,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pop-in animation
    drop.setScale(0);
    glow.setScale(0);
    this.scene.tweens.add({
      targets: [drop, glow],
      scale: 1,
      duration: 250,
      ease: 'Back.easeOut',
    });
  }

  spawnGoldDrop(x: number, y: number, amount: number): void {
    // Spawn multiple coins for larger amounts
    const coinCount = Math.min(Math.ceil(amount / 10), 5);
    const totalAmount = amount;

    for (let i = 0; i < coinCount; i++) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      const coinX = x + offsetX;
      const coinY = y + offsetY;

      const coin = this.goldDrops.create(coinX, coinY, 'gold_coin') as Phaser.Physics.Arcade.Sprite;
      coin.setData('amount', Math.ceil(totalAmount / coinCount));
      coin.setDepth(5);

      // Pop-out animation
      coin.setScale(0);
      const delay = i * 50;
      this.scene.time.delayedCall(delay, () => {
        this.scene.tweens.add({
          targets: coin,
          scale: 1,
          y: coinY - 10,
          duration: 200,
          ease: 'Back.easeOut',
        });

        // Floating animation after pop
        this.scene.time.delayedCall(200, () => {
          this.scene.tweens.add({
            targets: coin,
            y: coinY - 14,
            duration: 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
        });
      });
    }
  }

  // === PICKUP HANDLERS ===

  handleItemPickup(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    itemObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const itemSprite = itemObj as Phaser.Physics.Arcade.Sprite;
    const item = itemSprite.getData('item') as Item;
    const glow = itemSprite.getData('glow') as Phaser.GameObjects.Sprite;

    if (item && this.player.pickupItem(item)) {
      this.showPickupText(itemSprite.x, itemSprite.y, item);
      this.audioSystem.play('sfx_pickup', 0.4);
      this.scene.events.emit('itemCollected');
      if (glow) glow.destroy();
      itemSprite.destroy();
    }
  }

  handleWeaponPickup(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    weaponObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const weaponSprite = weaponObj as Phaser.Physics.Arcade.Sprite;
    const weapon = weaponSprite.getData('weapon') as Weapon;
    const glow = weaponSprite.getData('glow') as Phaser.GameObjects.Sprite;

    if (weapon) {
      // Convert weapon to item and add to inventory
      const weaponItem = createItemFromWeapon(weapon);
      if (this.player.pickupItem(weaponItem)) {
        this.showWeaponPickupText(weaponSprite.x, weaponSprite.y, weapon);
        this.audioSystem.play('sfx_pickup', 0.5);
        this.scene.events.emit('itemCollected');

        if (glow) glow.destroy();
        weaponSprite.destroy();
      } else {
        // Inventory full - emit event for GameScene to show message
        this.scene.events.emit('inventoryFull');
      }
    }
  }

  handleGoldPickup(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    goldObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const coin = goldObj as Phaser.Physics.Arcade.Sprite;

    // Immediately disable physics to prevent re-triggering
    if (coin.body) {
      coin.body.enable = false;
    }
    this.goldDrops.remove(coin, false, false);

    const amount = coin.getData('amount') as number;

    this.player.addGold(amount);
    this.audioSystem.play('sfx_pickup', 0.3);

    // Collect animation - fly to HUD
    this.scene.tweens.killTweensOf(coin);
    this.scene.tweens.add({
      targets: coin,
      x: this.scene.cameras.main.scrollX + 10,
      y: this.scene.cameras.main.scrollY + 80,
      alpha: 0,
      scale: 0.5,
      duration: 300,
      ease: 'Quad.easeIn',
      onComplete: () => coin.destroy(),
    });

    this.scene.events.emit('goldCollected');
  }

  // === HELPER METHODS ===

  private getItemDropTexture(item: Item): string {
    switch (item.type) {
      case ItemType.ARMOR:
        return 'item_armor';
      case ItemType.ACCESSORY:
        return 'item_accessory';
      case ItemType.CONSUMABLE:
        return 'item_consumable';
      case ItemType.WEAPON:
        if (item.weaponData) {
          const weaponTextures: Record<string, string> = {
            wand: 'weapon_wand',
            sword: 'weapon_sword',
            bow: 'weapon_bow',
            staff: 'weapon_staff',
            daggers: 'weapon_daggers',
          };
          return weaponTextures[item.weaponData.weaponType] || 'weapon_wand';
        }
        return 'weapon_sword';
      default:
        return 'item_drop';
    }
  }

  private showPickupText(x: number, y: number, item: Item): void {
    const color = '#' + RARITY_COLORS[item.rarity].toString(16).padStart(6, '0');
    const text = this.scene.add.text(x, y - 10, `+ ${item.name}`, {
      fontSize: '10px',
      color: color,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    text.setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 1000,
      onComplete: () => text.destroy(),
    });
  }

  private showWeaponPickupText(x: number, y: number, weapon: Weapon): void {
    const rarityColors = ['#ffffff', '#00ff00', '#0088ff', '#aa00ff', '#ffaa00'];
    const color = rarityColors[weapon.rarity];

    const text = this.scene.add.text(x, y - 10, `Equipped: ${weapon.getDisplayName()}`, {
      fontSize: '11px',
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5, 1);
    text.setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1500,
      onComplete: () => text.destroy(),
    });
  }
}
