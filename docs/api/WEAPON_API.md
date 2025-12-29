# Weapon System API Reference

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.x-orange.svg)](https://phaser.io/)

Complete API reference for the weapon system in the dungeon crawler game.

---

## Table of Contents

- [WeaponType Enum](#weapontype-enum)
- [WeaponStats Interface](#weaponstats-interface)
- [WEAPON_DEFINITIONS](#weapon_definitions)
- [Weapon Class](#weapon-class)
- [Rarity System](#rarity-system)
- [PlayerAttackManager Class](#playerattackmanager-class)
- [Attack Patterns](#attack-patterns)
- [Usage Examples](#usage-examples)

---

## WeaponType Enum

```typescript
enum WeaponType {
  WAND = 'wand',
  SWORD = 'sword',
  BOW = 'bow',
  STAFF = 'staff',
  DAGGERS = 'daggers',
}
```

| Value | Description |
|-------|-------------|
| `WAND` | Basic ranged weapon with single projectile |
| `SWORD` | Melee weapon with arc-based slash attack |
| `BOW` | Charged ranged weapon with piercing arrows |
| `STAFF` | Slow ranged weapon with AoE explosion on impact |
| `DAGGERS` | Fast weapon firing multiple projectiles in a spread |

---

## WeaponStats Interface

```typescript
interface WeaponStats {
  type: WeaponType;          // Weapon type identifier
  name: string;              // Display name
  damage: number;            // Base damage multiplier
  attackSpeed: number;       // Cooldown in milliseconds
  range: number;             // Projectile lifetime multiplier or melee arc size
  projectileSpeed: number;   // Speed of projectile (0 for melee)
  projectileCount: number;   // Number of projectiles per attack
  spread: number;            // Angle spread for multiple projectiles (degrees)
  piercing: boolean;         // Whether projectile passes through enemies
  aoe: boolean;              // Whether projectile explodes on impact
  aoeRadius: number;         // Explosion radius in pixels
  chargeTime: number;        // Time to charge in ms (0 for instant)
  texture: string;           // Weapon icon texture key
  projectileTexture: string; // Projectile/effect texture key
}
```

### Property Details

| Property | Type | Description |
|----------|------|-------------|
| `type` | `WeaponType` | The weapon's type classification |
| `name` | `string` | Human-readable weapon name |
| `damage` | `number` | Base damage multiplier (1.0 = 100% base damage) |
| `attackSpeed` | `number` | Cooldown between attacks in milliseconds |
| `range` | `number` | For projectiles: lifetime = 2000ms * range. For melee: arc scale |
| `projectileSpeed` | `number` | Pixels per second (0 for melee weapons) |
| `projectileCount` | `number` | Number of projectiles fired per attack |
| `spread` | `number` | Angular spread in degrees (for multi-projectile or melee arc) |
| `piercing` | `boolean` | If true, projectile continues through enemies |
| `aoe` | `boolean` | If true, creates explosion on impact |
| `aoeRadius` | `number` | Radius of explosion in pixels |
| `chargeTime` | `number` | Required charge time for full damage |
| `texture` | `string` | Phaser texture key for weapon sprite |
| `projectileTexture` | `string` | Phaser texture key for projectile/effect |

---

## WEAPON_DEFINITIONS

Pre-defined weapon statistics for all weapon types.

```typescript
const WEAPON_DEFINITIONS: Record<WeaponType, WeaponStats>
```

### Wand

```typescript
{
  type: WeaponType.WAND,
  name: 'Wand',
  damage: 1.0,
  attackSpeed: 300,          // 300ms cooldown
  range: 1.0,                // 2000ms lifetime
  projectileSpeed: 400,      // 400 px/s
  projectileCount: 1,
  spread: 0,
  piercing: false,
  aoe: false,
  aoeRadius: 0,
  chargeTime: 0,
  texture: 'weapon_wand',
  projectileTexture: 'projectile_wand',
}
```

**Characteristics:** Balanced starter weapon with moderate fire rate and damage.

### Sword

```typescript
{
  type: WeaponType.SWORD,
  name: 'Sword',
  damage: 2.0,               // 200% damage multiplier
  attackSpeed: 400,          // 400ms cooldown
  range: 1.2,                // Arc scale multiplier
  projectileSpeed: 0,        // Melee weapon
  projectileCount: 1,
  spread: 90,                // 90-degree arc
  piercing: true,            // Hits all enemies in arc
  aoe: false,
  aoeRadius: 0,
  chargeTime: 0,
  texture: 'weapon_sword',
  projectileTexture: 'slash_effect',
}
```

**Characteristics:** High damage melee weapon. Hits all enemies within a 90-degree arc. Range = `TILE_SIZE * 2 * 1.2` = **76.8 pixels**.

### Bow

```typescript
{
  type: WeaponType.BOW,
  name: 'Bow',
  damage: 1.8,               // 180% damage multiplier
  attackSpeed: 600,          // 600ms cooldown
  range: 1.5,                // 3750ms lifetime (2500 * 1.5)
  projectileSpeed: 500,      // 500 px/s
  projectileCount: 1,
  spread: 0,
  piercing: true,            // Arrows pass through enemies
  aoe: false,
  aoeRadius: 0,
  chargeTime: 300,           // 300ms charge time
  texture: 'weapon_bow',
  projectileTexture: 'projectile_arrow',
}
```

**Characteristics:** Long-range piercing weapon with high damage but slow attack speed.

### Staff

```typescript
{
  type: WeaponType.STAFF,
  name: 'Staff',
  damage: 1.5,               // 150% damage multiplier
  attackSpeed: 800,          // 800ms cooldown
  range: 0.8,                // 1600ms lifetime
  projectileSpeed: 250,      // 250 px/s (slow)
  projectileCount: 1,
  spread: 0,
  piercing: false,
  aoe: true,                 // Explodes on impact
  aoeRadius: 64,             // TILE_SIZE * 2 = 64 pixels
  chargeTime: 0,
  texture: 'weapon_staff',
  projectileTexture: 'projectile_orb',
}
```

**Characteristics:** Slow but powerful AoE weapon. Projectile explodes on enemy hit, wall hit, or after lifetime expires.

### Daggers

```typescript
{
  type: WeaponType.DAGGERS,
  name: 'Daggers',
  damage: 0.5,               // 50% damage multiplier per dagger
  attackSpeed: 150,          // 150ms cooldown (fastest)
  range: 0.7,                // 1050ms lifetime
  projectileSpeed: 450,      // 450 px/s
  projectileCount: 3,        // Fires 3 daggers
  spread: 15,                // 15-degree spread
  piercing: false,
  aoe: false,
  aoeRadius: 0,
  chargeTime: 0,
  texture: 'weapon_daggers',
  projectileTexture: 'projectile_dagger',
}
```

**Characteristics:** Rapid-fire weapon shooting 3 daggers in a spread pattern. Low individual damage but high DPS potential.

### Weapon Comparison Table

| Weapon | Damage | Attack Speed | DPS Multiplier* | Range | Special |
|--------|--------|--------------|-----------------|-------|---------|
| Wand | 1.0x | 300ms | 3.33 | Medium | None |
| Sword | 2.0x | 400ms | 5.00 | Short | 90-degree arc, piercing |
| Bow | 1.8x | 600ms | 3.00 | Long | Piercing |
| Staff | 1.5x | 800ms | 1.88 | Short | AoE explosion |
| Daggers | 0.5x | 150ms | 10.00** | Short | 3 projectiles |

*DPS = (damage / attackSpeed) * 1000
**Daggers theoretical max DPS if all 3 hit

---

## Weapon Class

### Constructor

```typescript
constructor(type: WeaponType, rarity: number = 0)
```

Creates a new weapon instance.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | `WeaponType` | required | The weapon type |
| `rarity` | `number` | `0` | Rarity tier (0-4) |

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `stats` | `WeaponStats` | Weapon statistics (copied from definitions) |
| `rarity` | `number` | Rarity tier (0-4) |
| `bonusDamage` | `number` | Bonus damage multiplier from rarity |

### Methods

#### getDamageMultiplier()

```typescript
getDamageMultiplier(): number
```

Returns the total damage multiplier including rarity bonus.

**Formula:** `stats.damage * (1 + bonusDamage)`

**Returns:** `number` - Total damage multiplier

**Example:**
```typescript
const sword = new Weapon(WeaponType.SWORD, 2); // Rare sword
sword.getDamageMultiplier(); // 2.0 * (1 + 0.30) = 2.6
```

#### getDisplayName()

```typescript
getDisplayName(): string
```

Returns the weapon's display name with rarity prefix.

**Returns:** `string` - Formatted weapon name

**Example:**
```typescript
const bow = new Weapon(WeaponType.BOW, 3); // Epic bow
bow.getDisplayName(); // "Epic Bow"

const wand = new Weapon(WeaponType.WAND, 0); // Common wand
wand.getDisplayName(); // "Wand"
```

### Static Methods

#### getRandomType()

```typescript
static getRandomType(): WeaponType
```

Returns a random weapon type.

**Returns:** `WeaponType` - A randomly selected weapon type

#### createRandom()

```typescript
static createRandom(floor: number): Weapon
```

Creates a random weapon with rarity based on floor level.

| Parameter | Type | Description |
|-----------|------|-------------|
| `floor` | `number` | Current dungeon floor (affects rarity chances) |

**Returns:** `Weapon` - A new random weapon instance

**Rarity Roll Formula:** `Math.random() + (floor * 0.02)`

**Rarity Thresholds:**
| Roll Result | Rarity |
|-------------|--------|
| > 0.95 | Legendary (4) |
| > 0.85 | Epic (3) |
| > 0.65 | Rare (2) |
| > 0.40 | Uncommon (1) |
| <= 0.40 | Common (0) |

---

## Rarity System

### Rarity Tiers

| Tier | Value | Name | Bonus Damage | Total at Tier |
|------|-------|------|--------------|---------------|
| 0 | 0 | Common | +0% | Base |
| 1 | 1 | Uncommon | +15% | 1.15x |
| 2 | 2 | Rare | +30% | 1.30x |
| 3 | 3 | Epic | +45% | 1.45x |
| 4 | 4 | Legendary | +60% | 1.60x |

### Bonus Damage Formula

```typescript
bonusDamage = rarity * 0.15
```

### Effective Damage Examples

| Weapon | Base | Common | Uncommon | Rare | Epic | Legendary |
|--------|------|--------|----------|------|------|-----------|
| Wand | 1.0 | 1.0 | 1.15 | 1.30 | 1.45 | 1.60 |
| Sword | 2.0 | 2.0 | 2.30 | 2.60 | 2.90 | 3.20 |
| Bow | 1.8 | 1.8 | 2.07 | 2.34 | 2.61 | 2.88 |
| Staff | 1.5 | 1.5 | 1.73 | 1.95 | 2.18 | 2.40 |
| Daggers | 0.5 | 0.5 | 0.58 | 0.65 | 0.73 | 0.80 |

### Floor-Based Rarity Chances

| Floor | Common | Uncommon | Rare | Epic | Legendary |
|-------|--------|----------|------|------|-----------|
| 1 | 40% | 25% | 20% | 10% | 5% |
| 5 | 30% | 25% | 20% | 15% | 10% |
| 10 | 20% | 25% | 20% | 20% | 15% |
| 20 | 0% | 20% | 20% | 30% | 30% |
| 25+ | 0% | 5% | 20% | 35% | 40% |

*Note: Floor 25+ guarantees at minimum Uncommon rarity*

---

## PlayerAttackManager Class

Manages all player attack logic, projectile creation, and collision handling.

### Constructor

```typescript
constructor(scene: Phaser.Scene, player: Player, audioSystem: AudioSystem)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `scene` | `Phaser.Scene` | The Phaser scene context |
| `player` | `Player` | The player entity |
| `audioSystem` | `AudioSystem` | Audio system for sound effects |

### Public Methods

#### create()

```typescript
create(): void
```

Initializes the projectile physics group. Must be called during scene creation.

#### getProjectileGroup()

```typescript
getProjectileGroup(): Phaser.Physics.Arcade.Group
```

Returns the projectile group for collision detection setup.

**Returns:** `Phaser.Physics.Arcade.Group` - The projectiles physics group

#### setupPlayerAttack()

```typescript
setupPlayerAttack(
  inventoryUI: { getIsVisible: () => boolean },
  levelUpUI: { getIsVisible: () => boolean }
): void
```

Sets up the pointer input handler for player attacks.

| Parameter | Type | Description |
|-----------|------|-------------|
| `inventoryUI` | `{ getIsVisible: () => boolean }` | Inventory UI reference |
| `levelUpUI` | `{ getIsVisible: () => boolean }` | Level up UI reference |

#### handleProjectileEnemyCollision()

```typescript
handleProjectileEnemyCollision(
  projectileObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
  enemyObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
): void
```

Handles collision between projectile and enemy. Call from scene collision handler.

**Behavior:**
- Tracks hit enemies to prevent duplicate damage (for piercing)
- Applies damage and plays hit sound
- Creates AoE explosion if projectile has `aoe` data
- Destroys non-piercing projectiles

#### handleProjectileWallCollision()

```typescript
handleProjectileWallCollision(
  projectileObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
): void
```

Handles collision between projectile and wall.

**Behavior:**
- Creates AoE explosion if projectile has `aoe` data
- Always destroys projectile

#### createExplosion()

```typescript
createExplosion(x: number, y: number, weapon: Weapon): void
```

Creates an AoE explosion effect and damages enemies in radius.

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | Explosion center X coordinate |
| `y` | `number` | Explosion center Y coordinate |
| `weapon` | `Weapon` | Weapon reference for AoE radius |

#### createExplosionFromProjectile()

```typescript
createExplosionFromProjectile(
  x: number,
  y: number,
  projectile: Phaser.Physics.Arcade.Sprite
): void
```

Creates explosion using projectile's stored data.

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | Explosion center X coordinate |
| `y` | `number` | Explosion center Y coordinate |
| `projectile` | `Phaser.Physics.Arcade.Sprite` | The projectile sprite |

---

## Attack Patterns

### Wand Attack

**Pattern:** Single straight-line projectile

```
Player -----> [Projectile] -----> Target
```

**Implementation:**
- Creates single projectile at player position
- Sets velocity based on angle to cursor
- Lifetime: 2000ms * range (2000ms)
- Destroys on enemy hit (non-piercing)

### Sword Attack (Melee)

**Pattern:** Arc-based melee slash

```
         Enemy1
           /
Player ---+--- Enemy2 (within 90-degree arc)
           \
         Enemy3
```

**Implementation:**
- Creates visual slash effect sprite
- Calculates enemies within range: `TILE_SIZE * 2 * range` (76.8px)
- Checks if enemy angle is within `spread / 2` (45 degrees) of attack angle
- Damages all enemies in arc (piercing behavior)
- Applies knockback (150 force)

### Bow Attack

**Pattern:** Single piercing projectile

```
Player -----> [Arrow] ---> Enemy1 ---> Enemy2 ---> ...
```

**Implementation:**
- Creates single projectile with `piercing: true`
- Continues through enemies without being destroyed
- Tracks hit enemies to prevent duplicate damage
- Lifetime: 2500ms * range (3750ms)

### Staff Attack (AoE)

**Pattern:** Projectile with explosion on impact

```
Player -----> [Orb] -----> Impact Point
                              |
                        [EXPLOSION]
                         /   |   \
                     Enemy1 Enemy2 Enemy3
```

**Implementation:**
- Creates slow-moving projectile with bobbing animation
- On hit (enemy, wall, or lifetime): creates explosion
- Explosion radius: `aoeRadius` (64px)
- Damages all enemies within explosion radius
- Triggers camera shake (4 intensity, 100ms)

### Dagger Attack (Spread)

**Pattern:** Multiple projectiles in spread pattern

```
                  [Dagger1]
                 /
Player --------[Dagger2]--------> Target Area
                 \
                  [Dagger3]
```

**Implementation:**
- Creates `projectileCount` (3) projectiles
- Calculates angle offset for each: `(i - (count - 1) / 2) * spreadRad`
- Spread: 15 degrees total (-7.5 to +7.5 degrees)
- Each dagger is independent (non-piercing)
- Lifetime: 1500ms * range (1050ms)

---

## Usage Examples

### Creating Weapons

```typescript
import { Weapon, WeaponType } from './systems/Weapon';

// Create a common wand
const wand = new Weapon(WeaponType.WAND);

// Create a rare sword
const rareSword = new Weapon(WeaponType.SWORD, 2);

// Create a legendary staff
const legendaryStaff = new Weapon(WeaponType.STAFF, 4);

// Create random weapon based on floor
const floorWeapon = Weapon.createRandom(10); // Floor 10
```

### Checking Weapon Stats

```typescript
const bow = new Weapon(WeaponType.BOW, 3); // Epic bow

console.log(bow.getDisplayName());        // "Epic Bow"
console.log(bow.getDamageMultiplier());   // 2.61 (1.8 * 1.45)
console.log(bow.stats.attackSpeed);       // 600
console.log(bow.stats.piercing);          // true
```

### Setting Up Attack Manager

```typescript
// In GameScene
class GameScene extends Phaser.Scene {
  private attackManager: PlayerAttackManager;

  create() {
    this.attackManager = new PlayerAttackManager(this, this.player, this.audioSystem);
    this.attackManager.create();

    // Setup collision detection
    this.physics.add.overlap(
      this.attackManager.getProjectileGroup(),
      this.enemies,
      (proj, enemy) => this.attackManager.handleProjectileEnemyCollision(proj, enemy)
    );

    this.physics.add.collider(
      this.attackManager.getProjectileGroup(),
      this.wallsLayer,
      (proj) => this.attackManager.handleProjectileWallCollision(proj)
    );

    // Setup input
    this.attackManager.setupPlayerAttack(this.inventoryUI, this.levelUpUI);
  }
}
```

### Custom Weapon Modification

```typescript
// Create weapon and modify stats
const customDaggers = new Weapon(WeaponType.DAGGERS, 4);
customDaggers.stats.projectileCount = 5;  // Fire 5 daggers instead of 3
customDaggers.stats.spread = 30;          // Wider spread

// Note: This modifies the instance only, not the definition
```

### Handling Projectile Data

```typescript
// Projectiles store data for collision handling
projectile.setData('damage', player.getAttackDamage());
projectile.setData('piercing', weapon.stats.piercing);
projectile.setData('aoe', weapon.stats.aoe);
projectile.setData('aoeRadius', weapon.stats.aoeRadius);
projectile.setData('hitEnemies', new Set<Enemy>());
```

---

## Events

The PlayerAttackManager emits and listens to the following scene events:

### Emitted Events

| Event | Payload | Description |
|-------|---------|-------------|
| `showDamageNumber` | `(x, y, damage, isCritical)` | Display damage number at position |
| `shakeCamera` | `(intensity, duration)` | Trigger camera shake |

### Listened Events

| Event | Callback | Description |
|-------|----------|-------------|
| `requestEnemiesGroup` | `(callback: (enemies) => void)` | Request enemies group for melee/AoE |

---

## Multiplayer Support

The attack system broadcasts the following network messages:

### PlayerAttackMessage

```typescript
{
  type: MessageType.PLAYER_ATTACK,
  attackType: WeaponType,
  direction: string,
  x: number,
  y: number,
  angle: number,
}
```

### PlayerHitMessage

```typescript
{
  type: MessageType.PLAYER_HIT,
  enemyId: string,
  damage: number,
}
```

---

## Source Files

- **Weapon System:** [`src/systems/Weapon.ts`](/src/systems/Weapon.ts)
- **Attack Manager:** [`src/systems/PlayerAttackManager.ts`](/src/systems/PlayerAttackManager.ts)
- **Constants:** [`src/utils/constants.ts`](/src/utils/constants.ts)

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/dungeon-crawler-now.svg "Repobeats analytics image")
