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

  // Unique ID counter for loot sync
  private nextLootId: number = 1;

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
    const lootId = `loot_${this.nextLootId++}`;
    const texture = this.getItemDropTexture(item);
    const drop = this.itemDrops.create(x, y, texture) as Phaser.Physics.Arcade.Sprite;
    drop.setData('item', item);
    drop.setData('lootId', lootId);
    drop.setDepth(5);
    drop.setTint(RARITY_COLORS[item.rarity]);
    drop.setPipeline('Light2D');

    // Emit for multiplayer sync (simplified - guest just sees visual indicator)
    this.scene.events.emit('lootSpawned', lootId, 'item', x, y, item.name);

    // Add real point light for glow effect
    const light = this.scene.lights.addLight(x, y, 80, RARITY_COLORS[item.rarity], 0.6);
    drop.setData('light', light);

    // Floating animation
    this.scene.tweens.add({
      targets: drop,
      y: y - 5,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        // Keep light following the drop
        light.setPosition(drop.x, drop.y);
      },
    });

    // Light pulse effect
    this.scene.tweens.add({
      targets: light,
      intensity: 0.9,
      radius: 100,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pop-in animation
    drop.setScale(0);
    light.setIntensity(0);
    this.scene.tweens.add({
      targets: drop,
      scale: 1,
      duration: 200,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: light,
      intensity: 0.6,
      duration: 200,
      ease: 'Quad.easeOut',
    });
  }

  spawnWeaponDrop(x: number, y: number, weapon: Weapon): void {
    const lootId = `loot_${this.nextLootId++}`;
    const drop = this.weaponDrops.create(x, y, weapon.stats.texture) as Phaser.Physics.Arcade.Sprite;
    drop.setData('weapon', weapon);
    drop.setData('lootId', lootId);
    drop.setDepth(5);
    drop.setPipeline('Light2D');

    // Rarity-based colors
    const rarityColors = [0xffffff, 0x00ff00, 0x0088ff, 0xaa00ff, 0xffaa00];
    drop.setTint(rarityColors[weapon.rarity]);

    // Emit for multiplayer sync (simplified - guest just sees visual indicator)
    this.scene.events.emit('lootSpawned', lootId, 'weapon', x, y, weapon.stats.texture);

    // Add real point light for glow effect
    const light = this.scene.lights.addLight(x, y, 100, rarityColors[weapon.rarity], 0.7);
    drop.setData('light', light);

    // Floating animation
    this.scene.tweens.add({
      targets: drop,
      y: y - 6,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      onUpdate: () => {
        // Keep light following the drop
        light.setPosition(drop.x, drop.y);
      },
    });

    // Light pulse effect
    this.scene.tweens.add({
      targets: light,
      intensity: 1.0,
      radius: 120,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Pop-in animation
    drop.setScale(0);
    light.setIntensity(0);
    this.scene.tweens.add({
      targets: drop,
      scale: 1,
      duration: 250,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: light,
      intensity: 0.7,
      duration: 250,
      ease: 'Quad.easeOut',
    });
  }

  spawnGoldDrop(x: number, y: number, amount: number): void {
    const lootId = `gold_${this.nextLootId++}`;
    // Spawn multiple coins for larger amounts
    const coinCount = Math.min(Math.ceil(amount / 10), 5);
    const totalAmount = amount;

    // Add a single shared light for the gold pile
    const light = this.scene.lights.addLight(x, y, 60, 0xffdd44, 0.4);

    // Emit for multiplayer sync
    this.scene.events.emit('lootSpawned', lootId, 'gold', x, y, String(amount));

    for (let i = 0; i < coinCount; i++) {
      const offsetX = (Math.random() - 0.5) * 20;
      const offsetY = (Math.random() - 0.5) * 20;
      const coinX = x + offsetX;
      const coinY = y + offsetY;

      const coin = this.goldDrops.create(coinX, coinY, 'gold_coin') as Phaser.Physics.Arcade.Sprite;
      coin.setData('amount', Math.ceil(totalAmount / coinCount));
      coin.setData('light', i === 0 ? light : null); // Only first coin owns the light
      coin.setDepth(5);
      coin.setPipeline('Light2D');

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

    // Subtle light shimmer
    this.scene.tweens.add({
      targets: light,
      intensity: 0.6,
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // === PICKUP HANDLERS ===

  handleItemPickup(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    itemObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const itemSprite = itemObj as Phaser.Physics.Arcade.Sprite;
    const item = itemSprite.getData('item') as Item;
    const light = itemSprite.getData('light') as Phaser.GameObjects.Light;

    if (item && this.player.pickupItem(item)) {
      this.showPickupText(itemSprite.x, itemSprite.y, item);
      this.audioSystem.play('sfx_pickup', 0.4);
      this.scene.events.emit('itemCollected');
      if (light) this.scene.lights.removeLight(light);
      itemSprite.destroy();
    }
  }

  handleWeaponPickup(
    _playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    weaponObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void {
    const weaponSprite = weaponObj as Phaser.Physics.Arcade.Sprite;
    const weapon = weaponSprite.getData('weapon') as Weapon;
    const light = weaponSprite.getData('light') as Phaser.GameObjects.Light;

    if (weapon) {
      // Convert weapon to item and add to inventory
      const weaponItem = createItemFromWeapon(weapon);
      if (this.player.pickupItem(weaponItem)) {
        this.showWeaponPickupText(weaponSprite.x, weaponSprite.y, weapon);
        this.audioSystem.play('sfx_pickup', 0.5);
        this.scene.events.emit('itemCollected');

        if (light) this.scene.lights.removeLight(light);
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
    const light = coin.getData('light') as Phaser.GameObjects.Light;

    this.player.addGold(amount);
    this.audioSystem.play('sfx_pickup', 0.3);

    // Remove the light if this coin owns it
    if (light) {
      this.scene.lights.removeLight(light);
    }

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
