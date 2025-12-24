import Phaser from 'phaser';
import {
  PLAYER_SPEED,
  PLAYER_MAX_HP,
  PLAYER_BASE_ATTACK,
  PLAYER_BASE_DEFENSE,
} from '../utils/constants';
import { InventorySystem } from '../systems/InventorySystem';
import { Item, ItemType } from '../systems/Item';
import { Weapon, WeaponType } from '../systems/Weapon';

export class Player extends Phaser.Physics.Arcade.Sprite {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  // Base stats (from leveling)
  private baseMaxHp: number = PLAYER_MAX_HP;
  private baseAttack: number = PLAYER_BASE_ATTACK;
  private baseDefense: number = PLAYER_BASE_DEFENSE;
  private baseSpeed: number = PLAYER_SPEED;

  // Weapon system
  private defaultWeapon: Weapon = new Weapon(WeaponType.WAND);
  private attackCooldown: number = 0;

  // Computed stats (base + equipment)
  public hp: number = PLAYER_MAX_HP;
  public maxHp: number = PLAYER_MAX_HP;
  public attack: number = PLAYER_BASE_ATTACK;
  public defense: number = PLAYER_BASE_DEFENSE;
  public speed: number = PLAYER_SPEED;

  public level: number = 1;
  public xp: number = 0;
  public xpToNextLevel: number = 100;
  public gold: number = 0;

  public inventory: InventorySystem;

  private isInvulnerable: boolean = false;
  private isDodging: boolean = false;
  private dodgeCooldown: number = 0;
  private readonly DODGE_COOLDOWN_MS = 1000;
  private readonly DODGE_DURATION_MS = 200;
  private readonly DODGE_SPEED_MULTIPLIER = 3;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'player');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.inventory = new InventorySystem(20);

    this.setCollideWorldBounds(true);
    this.setDepth(10);

    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
      this.wasd = {
        W: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };

      // Dodge on Space
      scene.input.keyboard.on('keydown-SPACE', () => {
        this.dodge();
      });
    }

    this.recalculateStats();
  }

  update(_time: number, delta: number): void {
    if (this.isDodging) return;

    this.handleMovement();
    this.updateCooldowns(delta);
  }

  private handleMovement(): void {
    let velocityX = 0;
    let velocityY = 0;

    // Horizontal
    if (this.cursors?.left.isDown || this.wasd?.A.isDown) {
      velocityX = -1;
    } else if (this.cursors?.right.isDown || this.wasd?.D.isDown) {
      velocityX = 1;
    }

    // Vertical
    if (this.cursors?.up.isDown || this.wasd?.W.isDown) {
      velocityY = -1;
    } else if (this.cursors?.down.isDown || this.wasd?.S.isDown) {
      velocityY = 1;
    }

    // Normalize diagonal movement
    if (velocityX !== 0 && velocityY !== 0) {
      const normalizer = Math.SQRT1_2;
      velocityX *= normalizer;
      velocityY *= normalizer;
    }

    this.setVelocity(velocityX * this.speed, velocityY * this.speed);
  }

  private updateCooldowns(delta: number): void {
    if (this.dodgeCooldown > 0) {
      this.dodgeCooldown -= delta;
    }
    if (this.attackCooldown > 0) {
      this.attackCooldown -= delta;
    }
  }

  // Weapon methods
  getWeapon(): Weapon {
    const equippedItem = this.inventory.getEquipment().weapon;
    if (equippedItem?.weaponData) {
      return new Weapon(equippedItem.weaponData.weaponType, equippedItem.weaponData.rarity);
    }
    return this.defaultWeapon;
  }

  canAttack(): boolean {
    return this.attackCooldown <= 0 && !this.isDodging;
  }

  startAttackCooldown(): void {
    this.attackCooldown = this.getWeapon().stats.attackSpeed;
  }

  getAttackDamage(): number {
    return Math.floor(this.attack * this.getWeapon().getDamageMultiplier());
  }

  private dodge(): void {
    if (this.dodgeCooldown > 0 || this.isDodging) return;

    this.isDodging = true;
    this.isInvulnerable = true;
    this.dodgeCooldown = this.DODGE_COOLDOWN_MS;

    // Get current movement direction or face direction
    const vx = this.body?.velocity.x ?? 0;
    const vy = this.body?.velocity.y ?? 0;

    if (vx !== 0 || vy !== 0) {
      this.setVelocity(
        vx * this.DODGE_SPEED_MULTIPLIER,
        vy * this.DODGE_SPEED_MULTIPLIER
      );
    }

    // Visual feedback - flash white
    this.setTint(0xffffff);
    this.setAlpha(0.7);

    this.scene.time.delayedCall(this.DODGE_DURATION_MS, () => {
      this.isDodging = false;
      this.isInvulnerable = false;
      this.clearTint();
      this.setAlpha(1);
      this.setVelocity(0, 0);
    });
  }

  takeDamage(amount: number): void {
    if (this.isInvulnerable) return;

    const actualDamage = Math.max(1, amount - this.defense);
    this.hp -= actualDamage;

    // I-frames after damage
    this.isInvulnerable = true;
    this.setTint(0xff0000);

    this.scene.time.delayedCall(500, () => {
      this.isInvulnerable = false;
      this.clearTint();
    });

    if (this.hp <= 0) {
      this.die();
    }
  }

  heal(amount: number): void {
    this.hp = Math.min(this.maxHp, this.hp + amount);
  }

  addGold(amount: number): void {
    this.gold += amount;
    this.scene.events.emit('goldChanged', this.gold);
  }

  spendGold(amount: number): boolean {
    if (this.gold >= amount) {
      this.gold -= amount;
      this.scene.events.emit('goldChanged', this.gold);
      return true;
    }
    return false;
  }

  canAfford(amount: number): boolean {
    return this.gold >= amount;
  }

  gainXP(amount: number): void {
    this.xp += amount;

    while (this.xp >= this.xpToNextLevel) {
      this.levelUp();
    }
  }

  public statPoints: number = 0;

  private levelUp(): void {
    this.xp -= this.xpToNextLevel;
    this.level++;
    this.xpToNextLevel = Math.floor(this.xpToNextLevel * 1.5);

    // Give stat points instead of auto-applying
    this.statPoints += 3;

    // Small base HP increase
    this.baseMaxHp += 5;
    this.recalculateStats();
    this.hp = this.maxHp; // Full heal on level up

    // Emit event for stat allocation UI
    this.scene.events.emit('playerLevelUp', this);
  }

  allocateStat(stat: 'hp' | 'attack' | 'defense' | 'speed'): boolean {
    if (this.statPoints <= 0) return false;

    this.statPoints--;

    switch (stat) {
      case 'hp':
        this.baseMaxHp += 10;
        break;
      case 'attack':
        this.baseAttack += 2;
        break;
      case 'defense':
        this.baseDefense += 1;
        break;
      case 'speed':
        this.baseSpeed += 10;
        break;
    }

    this.recalculateStats();
    return true;
  }

  recalculateStats(): void {
    const equipStats = this.inventory.getEquipmentStats();

    this.maxHp = this.baseMaxHp + equipStats.maxHp;
    this.attack = this.baseAttack + equipStats.attack;
    this.defense = this.baseDefense + equipStats.defense;
    this.speed = Math.max(50, this.baseSpeed + equipStats.speed); // Min speed of 50

    // Clamp HP to new max
    if (this.hp > this.maxHp) {
      this.hp = this.maxHp;
    }
  }

  pickupItem(item: Item): boolean {
    const added = this.inventory.addItem(item);
    if (added) {
      this.scene.events.emit('itemPickup', item);
    }
    return added;
  }

  equipItem(itemId: string): void {
    this.inventory.equipItem(itemId);
    this.recalculateStats();
    this.scene.events.emit('equipmentChanged');
  }

  useItem(itemId: string): boolean {
    const item = this.inventory.useConsumable(itemId);
    if (item && item.type === ItemType.CONSUMABLE && item.healAmount) {
      this.heal(item.healAmount);
      this.scene.events.emit('itemUsed', item);
      return true;
    }
    return false;
  }

  private die(): void {
    this.hp = 0;
    this.setActive(false);
    this.setVisible(false);

    // Emit death event for GameScene to handle
    this.scene.events.emit('playerDeath');
  }

  getIsInvulnerable(): boolean {
    return this.isInvulnerable;
  }

  getSaveData(): {
    level: number;
    xp: number;
    xpToNext: number;
    hp: number;
    maxHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpeed: number;
    statPoints: number;
    gold: number;
  } {
    return {
      level: this.level,
      xp: this.xp,
      xpToNext: this.xpToNextLevel,
      hp: this.hp,
      maxHp: this.maxHp,
      baseAttack: this.baseAttack,
      baseDefense: this.baseDefense,
      baseSpeed: this.baseSpeed,
      statPoints: this.statPoints,
      gold: this.gold,
    };
  }

  restoreFromSave(data: {
    level: number;
    xp: number;
    xpToNext: number;
    hp: number;
    maxHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpeed: number;
    statPoints: number;
    gold?: number;
  }): void {
    this.level = data.level;
    this.xp = data.xp;
    this.xpToNextLevel = data.xpToNext;
    this.baseMaxHp = data.maxHp;
    this.baseAttack = data.baseAttack;
    this.baseDefense = data.baseDefense;
    this.baseSpeed = data.baseSpeed;
    this.statPoints = data.statPoints || 0;
    this.gold = data.gold || 0;
    this.recalculateStats();
    this.hp = data.hp;
  }
}
