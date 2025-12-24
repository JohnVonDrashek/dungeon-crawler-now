import { TILE_SIZE } from '../utils/constants';

export enum WeaponType {
  WAND = 'wand',
  SWORD = 'sword',
  BOW = 'bow',
  STAFF = 'staff',
  DAGGERS = 'daggers',
}

export interface WeaponStats {
  type: WeaponType;
  name: string;
  damage: number;           // Base damage multiplier
  attackSpeed: number;      // Cooldown in ms
  range: number;            // For projectiles: lifetime multiplier, for melee: arc size
  projectileSpeed: number;  // Speed of projectile (0 for melee)
  projectileCount: number;  // Number of projectiles
  spread: number;           // Angle spread for multiple projectiles
  piercing: boolean;        // Goes through enemies
  aoe: boolean;             // Explodes on impact
  aoeRadius: number;        // Explosion radius
  chargeTime: number;       // Time to charge (0 for instant)
  texture: string;          // Weapon icon texture
  projectileTexture: string; // Projectile texture
}

export const WEAPON_DEFINITIONS: Record<WeaponType, WeaponStats> = {
  [WeaponType.WAND]: {
    type: WeaponType.WAND,
    name: 'Wand',
    damage: 1.0,
    attackSpeed: 300,
    range: 1.0,
    projectileSpeed: 400,
    projectileCount: 1,
    spread: 0,
    piercing: false,
    aoe: false,
    aoeRadius: 0,
    chargeTime: 0,
    texture: 'weapon_wand',
    projectileTexture: 'projectile_wand',
  },
  [WeaponType.SWORD]: {
    type: WeaponType.SWORD,
    name: 'Sword',
    damage: 2.0,
    attackSpeed: 400,
    range: 1.2,
    projectileSpeed: 0, // Melee
    projectileCount: 1,
    spread: 90, // Arc angle
    piercing: true,
    aoe: false,
    aoeRadius: 0,
    chargeTime: 0,
    texture: 'weapon_sword',
    projectileTexture: 'slash_effect',
  },
  [WeaponType.BOW]: {
    type: WeaponType.BOW,
    name: 'Bow',
    damage: 1.8,
    attackSpeed: 600,
    range: 1.5,
    projectileSpeed: 500,
    projectileCount: 1,
    spread: 0,
    piercing: true,
    aoe: false,
    aoeRadius: 0,
    chargeTime: 300, // Must charge for full damage
    texture: 'weapon_bow',
    projectileTexture: 'projectile_arrow',
  },
  [WeaponType.STAFF]: {
    type: WeaponType.STAFF,
    name: 'Staff',
    damage: 1.5,
    attackSpeed: 800,
    range: 0.8,
    projectileSpeed: 250,
    projectileCount: 1,
    spread: 0,
    piercing: false,
    aoe: true,
    aoeRadius: TILE_SIZE * 2,
    chargeTime: 0,
    texture: 'weapon_staff',
    projectileTexture: 'projectile_orb',
  },
  [WeaponType.DAGGERS]: {
    type: WeaponType.DAGGERS,
    name: 'Daggers',
    damage: 0.5,
    attackSpeed: 150,
    range: 0.7,
    projectileSpeed: 450,
    projectileCount: 3,
    spread: 15,
    piercing: false,
    aoe: false,
    aoeRadius: 0,
    chargeTime: 0,
    texture: 'weapon_daggers',
    projectileTexture: 'projectile_dagger',
  },
};

export class Weapon {
  public stats: WeaponStats;
  public rarity: number; // 0-4 for common to legendary
  public bonusDamage: number;

  constructor(type: WeaponType, rarity: number = 0) {
    this.stats = { ...WEAPON_DEFINITIONS[type] };
    this.rarity = rarity;
    // Bonus damage scales with rarity
    this.bonusDamage = rarity * 0.15; // 0%, 15%, 30%, 45%, 60% bonus
  }

  getDamageMultiplier(): number {
    return this.stats.damage * (1 + this.bonusDamage);
  }

  getDisplayName(): string {
    const rarityNames = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
    if (this.rarity === 0) return this.stats.name;
    return `${rarityNames[this.rarity]} ${this.stats.name}`;
  }

  static getRandomType(): WeaponType {
    const types = Object.values(WeaponType);
    return types[Math.floor(Math.random() * types.length)];
  }

  static createRandom(floor: number): Weapon {
    const type = Weapon.getRandomType();
    // Higher floors = higher chance of better rarity
    const rarityRoll = Math.random() + (floor * 0.02);
    let rarity = 0;
    if (rarityRoll > 0.95) rarity = 4; // Legendary
    else if (rarityRoll > 0.85) rarity = 3; // Epic
    else if (rarityRoll > 0.65) rarity = 2; // Rare
    else if (rarityRoll > 0.40) rarity = 1; // Uncommon
    return new Weapon(type, rarity);
  }
}
