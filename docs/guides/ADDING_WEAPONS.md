# Adding New Weapon Types

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.x-orange.svg)](https://phaser.io/)
[![Difficulty](https://img.shields.io/badge/Difficulty-Intermediate-yellow.svg)](#)

A step-by-step guide for adding new weapon types to the dungeon crawler game. This guide walks through creating a 6th weapon type from scratch.

---

## Table of Contents

1. [Weapon System Overview](#1-weapon-system-overview)
2. [WeaponStats Interface Explained](#2-weaponstats-interface-explained)
3. [Step-by-Step: Adding a New Weapon Type](#3-step-by-step-adding-a-new-weapon-type)
4. [Creating Attack Patterns](#4-creating-attack-patterns)
5. [Projectile Configuration](#5-projectile-configuration)
6. [Melee vs Ranged Implementation](#6-melee-vs-ranged-implementation)
7. [Complete Code Example: Adding a Scythe](#7-complete-code-example-adding-a-scythe)
8. [Balancing Guidelines](#8-balancing-guidelines)
9. [Testing Checklist](#9-testing-checklist)

---

## 1. Weapon System Overview

The weapon system consists of three main components:

### Architecture

```
src/systems/
├── Weapon.ts              # Weapon definitions, stats, and class
├── PlayerAttackManager.ts # Attack logic, projectiles, collisions
└── AssetGenerator.ts      # Procedural texture generation
```

### Core Components

| Component | Responsibility |
|-----------|---------------|
| `WeaponType` enum | Unique identifier for each weapon |
| `WeaponStats` interface | Statistical properties defining weapon behavior |
| `WEAPON_DEFINITIONS` | Record mapping WeaponType to WeaponStats |
| `Weapon` class | Instance wrapper with rarity and damage calculation |
| `PlayerAttackManager` | Handles attack execution based on weapon type |
| `AssetGenerator` | Creates weapon and projectile textures |

### Attack Flow

```
1. Player clicks → PlayerAttackManager.playerAttack()
2. Get weapon type → switch statement routes to attack method
3. Execute attack → Create projectile/effect based on weapon stats
4. Handle collision → Damage enemies, handle piercing/AoE
```

### Current Weapons

| Weapon | Type | Attack Style |
|--------|------|--------------|
| Wand | Ranged | Single projectile |
| Sword | Melee | Arc slash |
| Bow | Ranged | Piercing arrow |
| Staff | Ranged | AoE explosion |
| Daggers | Ranged | Multi-projectile spread |

---

## 2. WeaponStats Interface Explained

Every weapon is defined by a `WeaponStats` object:

```typescript
interface WeaponStats {
  type: WeaponType;          // Weapon identifier
  name: string;              // Display name
  damage: number;            // Base damage multiplier (1.0 = 100%)
  attackSpeed: number;       // Cooldown in milliseconds
  range: number;             // Lifetime multiplier (ranged) or arc scale (melee)
  projectileSpeed: number;   // Pixels/second (0 for melee)
  projectileCount: number;   // Number of projectiles per attack
  spread: number;            // Angle spread in degrees
  piercing: boolean;         // Pass through enemies?
  aoe: boolean;              // Explode on impact?
  aoeRadius: number;         // Explosion radius in pixels
  chargeTime: number;        // Charge time in ms (0 for instant)
  texture: string;           // Weapon icon texture key
  projectileTexture: string; // Projectile/effect texture key
}
```

### Property Deep Dive

#### `damage: number`
Base damage multiplier applied to player's attack damage.
- `1.0` = 100% of base damage
- `2.0` = 200% of base damage (e.g., Sword)
- `0.5` = 50% of base damage (e.g., Daggers - but fires 3)

#### `attackSpeed: number`
Cooldown between attacks in milliseconds.
- Lower = faster attacks
- Current range: 150ms (Daggers) to 800ms (Staff)

#### `range: number`
Dual purpose based on weapon type:
- **Ranged weapons:** Projectile lifetime = `baseTime * range`
  - Wand: 2000ms base, so range 1.0 = 2000ms lifetime
  - Bow: 2500ms base, so range 1.5 = 3750ms lifetime
- **Melee weapons:** Arc scale multiplier for slash effect

#### `projectileSpeed: number`
Speed in pixels per second.
- Set to `0` for melee weapons
- Current range: 250 (Staff) to 500 (Bow)

#### `projectileCount: number`
Number of projectiles fired per attack.
- Most weapons: 1
- Daggers: 3

#### `spread: number`
Angular spread in degrees.
- **Multi-projectile:** Total spread angle (e.g., Daggers at 15 degrees)
- **Melee:** Arc angle (e.g., Sword at 90 degrees)

#### `piercing: boolean`
If `true`, projectile continues through enemies.
- Sword: Hits all enemies in arc
- Bow: Arrow passes through enemies

#### `aoe: boolean` and `aoeRadius: number`
If `aoe` is `true`, creates explosion on impact.
- Staff: 64px radius explosion (TILE_SIZE * 2)

#### `chargeTime: number`
Time required to charge before firing.
- Currently only used by Bow (300ms)
- Set to `0` for instant attacks

---

## 3. Step-by-Step: Adding a New Weapon Type

### Step 1: Add to WeaponType Enum

**File:** `src/systems/Weapon.ts`

```typescript
export enum WeaponType {
  WAND = 'wand',
  SWORD = 'sword',
  BOW = 'bow',
  STAFF = 'staff',
  DAGGERS = 'daggers',
  SCYTHE = 'scythe',  // Add your new weapon
}
```

### Step 2: Define WeaponStats

**File:** `src/systems/Weapon.ts`

Add your weapon's stats to `WEAPON_DEFINITIONS`:

```typescript
export const WEAPON_DEFINITIONS: Record<WeaponType, WeaponStats> = {
  // ... existing weapons ...

  [WeaponType.SCYTHE]: {
    type: WeaponType.SCYTHE,
    name: 'Scythe',
    damage: 1.8,
    attackSpeed: 500,
    range: 1.5,
    projectileSpeed: 0,      // Melee weapon
    projectileCount: 1,
    spread: 180,             // Wide sweeping arc
    piercing: true,          // Hits multiple enemies
    aoe: false,
    aoeRadius: 0,
    chargeTime: 0,
    texture: 'weapon_scythe',
    projectileTexture: 'scythe_slash',
  },
};
```

### Step 3: Create Attack Method

**File:** `src/systems/PlayerAttackManager.ts`

Add a new private method for your weapon's attack:

```typescript
private performScytheAttack(angle: number, weapon: Weapon): void {
  // Implementation here - see Section 4
}
```

### Step 4: Add to Attack Switch

**File:** `src/systems/PlayerAttackManager.ts`

In the `playerAttack` method, add your case:

```typescript
switch (weapon.stats.type) {
  case WeaponType.SWORD:
    this.performMeleeAttack(angle, weapon);
    break;
  case WeaponType.BOW:
    this.performBowAttack(angle, weapon);
    break;
  case WeaponType.STAFF:
    this.performStaffAttack(angle, weapon);
    break;
  case WeaponType.DAGGERS:
    this.performDaggerAttack(angle, weapon);
    break;
  case WeaponType.SCYTHE:  // Add your weapon
    this.performScytheAttack(angle, weapon);
    break;
  case WeaponType.WAND:
  default:
    this.performWandAttack(angle, weapon);
    break;
}
```

### Step 5: Create Textures

**File:** `src/systems/AssetGenerator.ts`

Add weapon icon in `createWeaponAssets()`:

```typescript
// Scythe (curved blade on long handle)
const scytheGraphics = this.scene.make.graphics({ x: 0, y: 0 });
// Handle
scytheGraphics.fillStyle(0x5c3d2e);
scytheGraphics.fillRect(7, 4, 2, 12);
// Blade (curved)
scytheGraphics.fillStyle(0x9ca3af);
scytheGraphics.beginPath();
scytheGraphics.arc(10, 6, 6, Math.PI * 0.5, Math.PI * 1.5, false);
scytheGraphics.fillPath();
scytheGraphics.generateTexture('weapon_scythe', TILE_SIZE, TILE_SIZE);
scytheGraphics.destroy();
```

Add projectile/effect texture in `createWeaponProjectileAssets()`:

```typescript
// Scythe slash effect (wide arc)
const scytheSlashGraphics = this.scene.make.graphics({ x: 0, y: 0 });
scytheSlashGraphics.lineStyle(3, 0x9ca3af, 0.9);
scytheSlashGraphics.beginPath();
scytheSlashGraphics.arc(16, 16, 14, -Math.PI * 0.5, Math.PI * 0.5, false);
scytheSlashGraphics.strokePath();
scytheSlashGraphics.lineStyle(2, 0xd1d5db, 0.6);
scytheSlashGraphics.beginPath();
scytheSlashGraphics.arc(16, 16, 10, -Math.PI * 0.4, Math.PI * 0.4, false);
scytheSlashGraphics.strokePath();
scytheSlashGraphics.generateTexture('scythe_slash', 32, 32);
scytheSlashGraphics.destroy();
```

---

## 4. Creating Attack Patterns

### Pattern Types

#### Single Projectile (Wand-style)

```typescript
private performMyProjectileAttack(angle: number, weapon: Weapon): void {
  const projectile = this.projectiles.create(
    this.player.x, this.player.y, weapon.stats.projectileTexture
  ) as Phaser.Physics.Arcade.Sprite;

  projectile.setDepth(8);
  projectile.setData('damage', this.player.getAttackDamage());
  projectile.setData('piercing', weapon.stats.piercing);
  projectile.setRotation(angle);
  projectile.setVelocity(
    Math.cos(angle) * weapon.stats.projectileSpeed,
    Math.sin(angle) * weapon.stats.projectileSpeed
  );

  // Destroy after lifetime
  this.scene.time.delayedCall(2000 * weapon.stats.range, () => {
    if (projectile.active) projectile.destroy();
  });
}
```

#### Multi-Projectile Spread (Daggers-style)

```typescript
private performSpreadAttack(angle: number, weapon: Weapon): void {
  const spreadRad = Phaser.Math.DegToRad(weapon.stats.spread);

  for (let i = 0; i < weapon.stats.projectileCount; i++) {
    const offset = (i - (weapon.stats.projectileCount - 1) / 2) * spreadRad;
    const projectileAngle = angle + offset;

    const projectile = this.projectiles.create(
      this.player.x, this.player.y, weapon.stats.projectileTexture
    ) as Phaser.Physics.Arcade.Sprite;

    projectile.setDepth(8);
    projectile.setData('damage', this.player.getAttackDamage());
    projectile.setData('piercing', false);
    projectile.setRotation(projectileAngle);
    projectile.setVelocity(
      Math.cos(projectileAngle) * weapon.stats.projectileSpeed,
      Math.sin(projectileAngle) * weapon.stats.projectileSpeed
    );

    this.scene.time.delayedCall(1500 * weapon.stats.range, () => {
      if (projectile.active) projectile.destroy();
    });
  }
}
```

#### Arc Melee (Sword-style)

```typescript
private performArcMeleeAttack(angle: number, weapon: Weapon): void {
  // Visual effect
  const slash = this.scene.add.sprite(
    this.player.x + Math.cos(angle) * 20,
    this.player.y + Math.sin(angle) * 20,
    weapon.stats.projectileTexture
  );
  slash.setDepth(15);
  slash.setRotation(angle);
  slash.setScale(weapon.stats.range);

  // Fade out
  this.scene.tweens.add({
    targets: slash,
    alpha: 0,
    scale: weapon.stats.range * 1.3,
    duration: 150,
    onComplete: () => slash.destroy(),
  });

  // Calculate hit area
  const slashRange = TILE_SIZE * 2 * weapon.stats.range;
  const slashArc = Phaser.Math.DegToRad(weapon.stats.spread);

  // Get enemies and check hits
  this.scene.events.emit('requestEnemiesGroup', (enemies: Phaser.Physics.Arcade.Group) => {
    enemies.getChildren().forEach((child) => {
      const enemy = child as unknown as Enemy;
      if (!enemy.active) return;

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );

      if (dist <= slashRange) {
        const enemyAngle = Phaser.Math.Angle.Between(
          this.player.x, this.player.y,
          enemy.x, enemy.y
        );

        let angleDiff = Math.abs(angle - enemyAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff <= slashArc / 2) {
          const damage = this.player.getAttackDamage();
          enemy.takeDamage(damage);
          this.scene.events.emit('showDamageNumber', enemy.x, enemy.y, damage, false);
          this.broadcastHit(enemy, damage);
        }
      }
    });
  });
}
```

#### AoE Explosion (Staff-style)

```typescript
private performAoEAttack(angle: number, weapon: Weapon): void {
  const projectile = this.projectiles.create(
    this.player.x, this.player.y, weapon.stats.projectileTexture
  ) as Phaser.Physics.Arcade.Sprite;

  projectile.setDepth(8);
  projectile.setData('damage', this.player.getAttackDamage());
  projectile.setData('aoe', true);
  projectile.setData('aoeRadius', weapon.stats.aoeRadius);
  projectile.setData('weapon', weapon);
  projectile.setRotation(angle);
  projectile.setVelocity(
    Math.cos(angle) * weapon.stats.projectileSpeed,
    Math.sin(angle) * weapon.stats.projectileSpeed
  );

  // Explode after lifetime
  this.scene.time.delayedCall(2000 * weapon.stats.range, () => {
    if (projectile.active) {
      this.createExplosion(projectile.x, projectile.y, weapon);
      projectile.destroy();
    }
  });
}
```

---

## 5. Projectile Configuration

### Essential Data Properties

When creating a projectile, set these data properties:

```typescript
projectile.setData('damage', this.player.getAttackDamage());
projectile.setData('piercing', weapon.stats.piercing);
projectile.setData('aoe', weapon.stats.aoe);
projectile.setData('aoeRadius', weapon.stats.aoeRadius);
projectile.setData('hitEnemies', new Set<Enemy>());  // For piercing
```

### Visual Effects

#### Rotation
```typescript
projectile.setRotation(angle);  // Face direction of travel
```

#### Animation
```typescript
// Bobbing effect (Staff orb)
this.scene.tweens.add({
  targets: projectile,
  scaleX: 1.2,
  scaleY: 1.2,
  duration: 200,
  yoyo: true,
  repeat: -1,
});

// Spinning effect
this.scene.tweens.add({
  targets: projectile,
  rotation: angle + Math.PI * 2,
  duration: 500,
  repeat: -1,
});
```

### Lifetime Management

```typescript
// Standard lifetime
this.scene.time.delayedCall(2000 * weapon.stats.range, () => {
  if (projectile.active) projectile.destroy();
});

// With explosion on timeout
this.scene.time.delayedCall(2000 * weapon.stats.range, () => {
  if (projectile.active) {
    this.createExplosion(projectile.x, projectile.y, weapon);
    projectile.destroy();
  }
});
```

---

## 6. Melee vs Ranged Implementation

### Identifying Weapon Type

```typescript
const isMelee = weapon.stats.projectileSpeed === 0;
```

### Melee Weapons

**Characteristics:**
- `projectileSpeed: 0`
- Instant hit detection in area
- No projectile physics needed
- Uses `spread` for arc angle

**Hit Detection:**
1. Calculate hit range: `TILE_SIZE * 2 * weapon.stats.range`
2. Calculate arc angle: `Phaser.Math.DegToRad(weapon.stats.spread)`
3. Check each enemy:
   - Distance <= range?
   - Angle within arc?

**Example (Sword):**
```typescript
const slashRange = TILE_SIZE * 2 * weapon.stats.range;  // 76.8px for sword
const slashArc = Phaser.Math.DegToRad(weapon.stats.spread);  // 90 degrees

// Check if enemy is in arc
const enemyAngle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
let angleDiff = Math.abs(attackAngle - enemyAngle);
if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
const inArc = angleDiff <= slashArc / 2;
```

### Ranged Weapons

**Characteristics:**
- `projectileSpeed > 0`
- Uses physics group for projectiles
- Collision-based hit detection
- Can be piercing or non-piercing

**Projectile Creation:**
```typescript
const projectile = this.projectiles.create(
  this.player.x, this.player.y, weapon.stats.projectileTexture
) as Phaser.Physics.Arcade.Sprite;

projectile.setVelocity(
  Math.cos(angle) * weapon.stats.projectileSpeed,
  Math.sin(angle) * weapon.stats.projectileSpeed
);
```

**Collision Handling:**
Collisions are handled by `handleProjectileEnemyCollision` and `handleProjectileWallCollision` in PlayerAttackManager.

---

## 7. Complete Code Example: Adding a Scythe

This example adds a Scythe weapon - a wide-arc melee weapon that hits all enemies in a 180-degree arc with a spinning visual effect.

### Step 1: Weapon.ts Modifications

```typescript
// Add to WeaponType enum
export enum WeaponType {
  WAND = 'wand',
  SWORD = 'sword',
  BOW = 'bow',
  STAFF = 'staff',
  DAGGERS = 'daggers',
  SCYTHE = 'scythe',
}

// Add to WEAPON_DEFINITIONS
[WeaponType.SCYTHE]: {
  type: WeaponType.SCYTHE,
  name: 'Scythe',
  damage: 1.8,              // High damage per hit
  attackSpeed: 550,         // Medium-slow attack speed
  range: 1.4,               // Wide reach
  projectileSpeed: 0,       // Melee weapon
  projectileCount: 1,
  spread: 180,              // Half-circle arc
  piercing: true,           // Hits all enemies in arc
  aoe: false,
  aoeRadius: 0,
  chargeTime: 0,
  texture: 'weapon_scythe',
  projectileTexture: 'scythe_slash',
},
```

### Step 2: PlayerAttackManager.ts Modifications

```typescript
// Add import at top if not present
import { TILE_SIZE } from '../utils/constants';

// Add to playerAttack switch statement
case WeaponType.SCYTHE:
  this.performScytheAttack(angle, weapon);
  break;

// Add new attack method
private performScytheAttack(angle: number, weapon: Weapon): void {
  // Create spinning slash visual effect
  const slash = this.scene.add.sprite(
    this.player.x,
    this.player.y,
    weapon.stats.projectileTexture
  );
  slash.setDepth(15);
  slash.setScale(weapon.stats.range);
  slash.setOrigin(0.5, 0.5);

  // Spinning animation
  this.scene.tweens.add({
    targets: slash,
    rotation: angle + Math.PI,
    alpha: 0,
    scale: weapon.stats.range * 1.5,
    duration: 250,
    ease: 'Power2',
    onComplete: () => slash.destroy(),
  });

  // Calculate hit area (wider than sword)
  const slashRange = TILE_SIZE * 2.5 * weapon.stats.range;
  const slashArc = Phaser.Math.DegToRad(weapon.stats.spread);

  // Hit detection
  this.scene.events.emit('requestEnemiesGroup', (enemies: Phaser.Physics.Arcade.Group) => {
    let hitCount = 0;

    enemies.getChildren().forEach((child) => {
      const enemy = child as unknown as Enemy;
      if (!enemy.active) return;

      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.x, enemy.y
      );

      if (dist <= slashRange) {
        const enemyAngle = Phaser.Math.Angle.Between(
          this.player.x, this.player.y,
          enemy.x, enemy.y
        );

        let angleDiff = Math.abs(angle - enemyAngle);
        if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

        if (angleDiff <= slashArc / 2) {
          const damage = this.player.getAttackDamage();
          enemy.takeDamage(damage);
          this.scene.events.emit('showDamageNumber', enemy.x, enemy.y, damage, false);
          this.broadcastHit(enemy, damage);
          hitCount++;

          // Heavy knockback
          const knockbackForce = 200;
          enemy.setVelocity(
            Math.cos(enemyAngle) * knockbackForce,
            Math.sin(enemyAngle) * knockbackForce
          );
        }
      }
    });

    // Screen shake on multi-hit
    if (hitCount >= 2) {
      this.scene.events.emit('shakeCamera', 3, 80);
    }
  });
}
```

### Step 3: AssetGenerator.ts Modifications

```typescript
// Add to createWeaponAssets() method
// Scythe (curved blade with long handle)
const scytheGraphics = this.scene.make.graphics({ x: 0, y: 0 });
// Long handle
scytheGraphics.fillStyle(0x4a3728);
scytheGraphics.fillRect(7, 2, 2, 14);
// Handle wrap
scytheGraphics.fillStyle(0x8b5a2b);
scytheGraphics.fillRect(7, 10, 2, 2);
scytheGraphics.fillRect(7, 6, 2, 2);
// Blade base
scytheGraphics.fillStyle(0x6b7280);
scytheGraphics.fillRect(4, 1, 4, 3);
// Curved blade
scytheGraphics.fillStyle(0x9ca3af);
scytheGraphics.lineStyle(2, 0x9ca3af);
scytheGraphics.beginPath();
scytheGraphics.arc(4, 4, 5, -Math.PI * 0.8, Math.PI * 0.2, false);
scytheGraphics.strokePath();
// Blade edge highlight
scytheGraphics.lineStyle(1, 0xd1d5db);
scytheGraphics.beginPath();
scytheGraphics.arc(4, 4, 6, -Math.PI * 0.7, Math.PI * 0.1, false);
scytheGraphics.strokePath();
scytheGraphics.generateTexture('weapon_scythe', TILE_SIZE, TILE_SIZE);
scytheGraphics.destroy();

// Add to createWeaponProjectileAssets() method
// Scythe slash effect (wide sweeping arc)
const scytheSlashGraphics = this.scene.make.graphics({ x: 0, y: 0 });
// Outer arc
scytheSlashGraphics.lineStyle(4, 0x9ca3af, 0.8);
scytheSlashGraphics.beginPath();
scytheSlashGraphics.arc(16, 16, 14, -Math.PI * 0.5, Math.PI * 0.5, false);
scytheSlashGraphics.strokePath();
// Middle arc
scytheSlashGraphics.lineStyle(3, 0xc4c4c4, 0.6);
scytheSlashGraphics.beginPath();
scytheSlashGraphics.arc(16, 16, 10, -Math.PI * 0.4, Math.PI * 0.4, false);
scytheSlashGraphics.strokePath();
// Inner arc (bright edge)
scytheSlashGraphics.lineStyle(2, 0xffffff, 0.9);
scytheSlashGraphics.beginPath();
scytheSlashGraphics.arc(16, 16, 6, -Math.PI * 0.3, Math.PI * 0.3, false);
scytheSlashGraphics.strokePath();
scytheSlashGraphics.generateTexture('scythe_slash', 32, 32);
scytheSlashGraphics.destroy();
```

---

## 8. Balancing Guidelines

### DPS Calculation

```
Base DPS = (damage / attackSpeed) * 1000

Effective DPS = Base DPS * hitChance * averageTargets
```

### Current Weapon Balance

| Weapon | Damage | Speed (ms) | Base DPS | Notes |
|--------|--------|------------|----------|-------|
| Wand | 1.0 | 300 | 3.33 | Baseline |
| Sword | 2.0 | 400 | 5.00 | Multi-hit potential |
| Bow | 1.8 | 600 | 3.00 | Piercing, long range |
| Staff | 1.5 | 800 | 1.88 | AoE, crowd control |
| Daggers | 0.5x3 | 150 | 10.0* | *If all hit |
| Scythe | 1.8 | 550 | 3.27 | Wide arc, knockback |

### Balance Principles

1. **Trade-offs:** High damage = slow speed OR short range
2. **Niche:** Each weapon should excel at something unique
3. **Skill ceiling:** Complex weapons can have higher potential DPS
4. **Accessibility:** At least one weapon should be beginner-friendly

### Balancing New Weapons

#### Starting Point Formula

```typescript
// For ranged single-projectile:
damage = 3.33 * (attackSpeed / 1000)

// For melee:
damage = (3.33 * (attackSpeed / 1000)) * 0.8  // Risk factor

// For multi-projectile:
damagePerProjectile = (3.33 * (attackSpeed / 1000)) / projectileCount
```

#### Adjustment Factors

| Feature | Damage Modifier |
|---------|-----------------|
| Piercing | -10% to -15% |
| AoE | -20% to -30% |
| Melee range | +15% to +25% |
| Charge time | +10% per 200ms |
| Multi-projectile | Divide by count |

### Rarity Impact

Rarity adds bonus damage:
- Common: +0%
- Uncommon: +15%
- Rare: +30%
- Epic: +45%
- Legendary: +60%

Ensure base weapon feels fair at Common, not overpowered at Legendary.

---

## 9. Testing Checklist

### Functional Tests

- [ ] **Weapon appears in loot table**
  - Drop from enemies
  - Appear in chests
  - Available from `Weapon.createRandom()`

- [ ] **Attack executes correctly**
  - Click triggers attack
  - Correct animation plays
  - Sound effect triggers
  - Cooldown is enforced

- [ ] **Damage applies correctly**
  - Base damage is accurate
  - Rarity bonus applies
  - Player stats affect damage
  - Damage numbers display

- [ ] **Special effects work**
  - Piercing passes through enemies
  - AoE explosion triggers
  - Multi-projectile spreads correctly
  - Melee arc detects properly

### Visual Tests

- [ ] **Weapon icon displays**
  - Inventory shows correct icon
  - HUD weapon display works
  - Drop pickup visible on ground

- [ ] **Projectile/effect renders**
  - Correct texture displayed
  - Proper rotation/orientation
  - Animation plays smoothly
  - Cleanup happens (no orphans)

### Balance Tests

- [ ] **DPS feels appropriate**
  - Not too weak at Common
  - Not too strong at Legendary
  - Competitive with other weapons

- [ ] **Gameplay role is clear**
  - Weapon has distinct use case
  - Not strictly better than others
  - Fun to use

### Edge Cases

- [ ] **Multiplayer sync**
  - Attack broadcasts to other player
  - Remote attacks display correctly

- [ ] **Wall collision**
  - Projectiles stop at walls
  - AoE triggers on wall hit
  - Melee doesn't hit through walls

- [ ] **Performance**
  - No memory leaks (projectiles cleaned up)
  - Reasonable CPU usage with many projectiles

### Manual Test Procedure

1. **Start new game** with the new weapon
2. **Clear room** testing basic attack
3. **Test in crowd** to verify AoE/pierce
4. **Pick up different rarities** to verify bonus
5. **Use in boss fight** for sustained combat test
6. **Play multiplayer** to verify network sync
7. **Play for 10 minutes** checking for memory issues

---

## Quick Reference

### Files to Modify

| File | Changes |
|------|---------|
| `src/systems/Weapon.ts` | Enum + Stats definition |
| `src/systems/PlayerAttackManager.ts` | Attack method + switch case |
| `src/systems/AssetGenerator.ts` | Weapon + projectile textures |

### Common Mistakes

1. **Forgetting to add switch case** - Weapon defaults to Wand
2. **Wrong texture key** - Ensure texture name matches
3. **Missing projectile cleanup** - Always destroy on timeout
4. **Not setting projectile data** - Collision handler needs it
5. **Incorrect angle math** - Remember radians vs degrees

### Useful Constants

```typescript
import { TILE_SIZE } from '../utils/constants';  // 32 pixels
```

---

## Related Documentation

- [Weapon API Reference](/docs/api/WEAPON_API.md)
- [Combat System](/docs/COMBAT.md)
- [Asset Generator](/src/systems/AssetGenerator.ts)

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/dungeon-crawler-now.svg "Repobeats analytics image")
