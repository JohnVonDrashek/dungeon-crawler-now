# Combat System API Reference

Complete API documentation for the dungeon crawler combat system.

---

## Table of Contents

- [CombatSystem](#combatsystem)
- [Player Combat Methods](#player-combat-methods)
- [Enemy Combat Methods](#enemy-combat-methods)
- [PlayerAttackManager](#playerattackmanager)
- [Weapon System](#weapon-system)
- [Damage Calculation](#damage-calculation)
- [Events](#events)
- [Constants](#constants)

---

## CombatSystem

**File:** `/src/systems/CombatSystem.ts`

The central combat calculation and damage application system.

### Constructor

```typescript
constructor(scene: Phaser.Scene)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `scene` | `Phaser.Scene` | The Phaser scene context |

### Interfaces

#### DamageResult

```typescript
interface DamageResult {
  damage: number;      // Final calculated damage
  isCritical: boolean; // Whether this was a critical hit
  knockbackX: number;  // Horizontal knockback velocity
  knockbackY: number;  // Vertical knockback velocity
}
```

### Methods

#### calculateDamage

Calculates damage between an attacker and defender.

```typescript
calculateDamage(attacker: Player | Enemy, defender: Player | Enemy): DamageResult
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `attacker` | `Player \| Enemy` | The entity dealing damage |
| `defender` | `Player \| Enemy` | The entity receiving damage |

**Returns:** `DamageResult`

**Damage Formula:**
```
baseDamage = max(1, attacker.attack - defender.defense)
finalDamage = isCritical ? baseDamage * 2 : baseDamage
```

**Critical Hit:**
- Chance: 10% (`Math.random() < 0.1`)
- Multiplier: 2x damage

**Knockback Calculation:**
```
knockbackForce = 200
direction = normalize(defender.position - attacker.position)
knockbackX = direction.x * knockbackForce
knockbackY = direction.y * knockbackForce
```

**Example:**
```typescript
const combatSystem = new CombatSystem(this);
const result = combatSystem.calculateDamage(player, enemy);
console.log(`Dealt ${result.damage} damage${result.isCritical ? ' (CRIT!)' : ''}`);
```

---

#### applyDamage

Applies calculated damage to a target with knockback and visual effects.

```typescript
applyDamage(target: Player | Enemy, result: DamageResult): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `target` | `Player \| Enemy` | The entity receiving damage |
| `result` | `DamageResult` | The damage calculation result |

**Behavior:**
1. Calls `target.takeDamage(result.damage)`
2. Applies knockback velocity to target
3. Resets velocity after 150ms
4. Shows "CRIT!" text if critical (orange, 10px font)
5. Shows floating damage number (yellow for crit, white for normal)

**Visual Effects:**
- Critical text: `#ff6600` (orange), floats up and fades
- Normal damage: `#ffffff` (white), 12px font
- Critical damage: `#ffff00` (yellow), 16px font

**Example:**
```typescript
const result = combatSystem.calculateDamage(player, enemy);
combatSystem.applyDamage(enemy, result);
```

---

## Player Combat Methods

**File:** `/src/entities/Player.ts`

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `hp` | `number` | `100` | Current health points |
| `maxHp` | `number` | `100` | Maximum health points |
| `attack` | `number` | `10` | Attack power (base + equipment) |
| `defense` | `number` | `5` | Defense power (base + equipment) |
| `speed` | `number` | `150` | Movement speed |
| `level` | `number` | `1` | Current level |
| `xp` | `number` | `0` | Current experience points |
| `xpToNextLevel` | `number` | `100` | XP needed for next level |
| `statPoints` | `number` | `0` | Unspent stat points |

### Methods

#### canAttack

Check if the player can perform an attack.

```typescript
canAttack(): boolean
```

**Returns:** `true` if attack cooldown is complete and player is not dodging.

---

#### startAttackCooldown

Starts the attack cooldown timer based on current weapon.

```typescript
startAttackCooldown(): void
```

**Cooldown Duration:** Determined by `weapon.stats.attackSpeed` (in milliseconds)

| Weapon | Attack Speed |
|--------|-------------|
| Wand | 300ms |
| Daggers | 150ms |
| Sword | 400ms |
| Bow | 600ms |
| Staff | 800ms |

---

#### getAttackDamage

Calculate the player's attack damage including weapon multiplier.

```typescript
getAttackDamage(): number
```

**Formula:**
```
damage = floor(player.attack * weapon.getDamageMultiplier())
```

**Returns:** Final damage value as integer.

---

#### getWeapon

Get the player's current equipped weapon.

```typescript
getWeapon(): Weapon
```

**Returns:** Equipped weapon, or default Wand if none equipped.

---

#### takeDamage

Apply damage to the player with invulnerability frames.

```typescript
takeDamage(amount: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `amount` | `number` | Raw damage amount |

**Behavior:**
1. Ignores damage if player is invulnerable
2. Reduces damage by defense: `actualDamage = max(1, amount - defense)`
3. Applies 500ms invulnerability frames
4. Flashes player red during i-frames
5. Emits `playerDeath` event if HP reaches 0

---

#### heal

Restore health points, capped at maxHp.

```typescript
heal(amount: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `amount` | `number` | HP to restore |

**Example:**
```typescript
player.heal(30); // Restore 30 HP
```

---

#### getIsInvulnerable

Check if the player is currently invulnerable.

```typescript
getIsInvulnerable(): boolean
```

**Returns:** `true` during dodge or damage i-frames.

---

#### setSpeedModifier

Apply a speed modifier (used by slowing effects).

```typescript
setSpeedModifier(modifier: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `modifier` | `number` | Speed multiplier (0.1 to 1.0) |

---

#### resetSpeedModifier

Reset speed modifier to normal (1.0).

```typescript
resetSpeedModifier(): void
```

---

#### gainXP

Add experience points and handle level ups.

```typescript
gainXP(amount: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `amount` | `number` | XP to add |

**Level Up:**
- Awards 3 stat points
- Increases base HP by 5
- Full HP restore
- XP requirement scales: `xpToNextLevel = floor(xpToNextLevel * 1.5)`

---

#### allocateStat

Spend a stat point to improve a stat.

```typescript
allocateStat(stat: 'hp' | 'attack' | 'defense' | 'speed'): boolean
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `stat` | `string` | Stat to increase |

**Stat Increases:**
| Stat | Increase |
|------|----------|
| hp | +10 max HP |
| attack | +2 attack |
| defense | +1 defense |
| speed | +10 speed |

**Returns:** `true` if stat was allocated, `false` if no points available.

---

## Enemy Combat Methods

**File:** `/src/entities/Enemy.ts`

### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `hp` | `number` | `30` | Current health |
| `maxHp` | `number` | `30` | Maximum health |
| `attack` | `number` | `8` | Attack power |
| `defense` | `number` | `2` | Defense power |
| `speed` | `number` | `80` | Movement speed |
| `xpValue` | `number` | `25` | XP awarded on death |

### AI Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `ATTACK_COOLDOWN_MS` | `1000` | Time between attacks |
| `CHASE_RANGE` | `256px` (8 tiles) | Distance to start chasing |
| `ATTACK_RANGE` | `48px` (1.5 tiles) | Distance to attack |
| `RETREAT_HP_PERCENT` | `0.2` (20%) | HP threshold to retreat |

### Methods

#### takeDamage

Apply damage to the enemy.

```typescript
takeDamage(amount: number): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `amount` | `number` | Damage to apply |

**Behavior:**
1. Reduces HP by amount
2. Flashes enemy red for 100ms
3. Triggers death if HP <= 0

---

#### setTarget

Set the player as the enemy's target.

```typescript
setTarget(player: Player): void
```

---

#### getAiState

Get the current AI state.

```typescript
getAiState(): EnemyState
```

**Returns:** One of `IDLE`, `CHASE`, `ATTACK`, or `RETREAT`.

---

## PlayerAttackManager

**File:** `/src/systems/PlayerAttackManager.ts`

Manages player attack input and projectile handling.

### Constructor

```typescript
constructor(scene: Phaser.Scene, player: Player, audioSystem: AudioSystem)
```

### Methods

#### create

Initialize the projectile physics group.

```typescript
create(): void
```

---

#### getProjectileGroup

Get the projectile physics group for collision setup.

```typescript
getProjectileGroup(): Phaser.Physics.Arcade.Group
```

---

#### setupPlayerAttack

Set up mouse click handling for attacks.

```typescript
setupPlayerAttack(
  inventoryUI: { getIsVisible: () => boolean },
  levelUpUI: { getIsVisible: () => boolean }
): void
```

---

#### handleProjectileEnemyCollision

Handle projectile hitting an enemy.

```typescript
handleProjectileEnemyCollision(
  projectileObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
  enemyObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
): void
```

**Behavior:**
1. Tracks already-hit enemies (for piercing)
2. Applies damage to enemy
3. Creates explosion if AoE projectile
4. Destroys projectile if not piercing

---

#### handleProjectileWallCollision

Handle projectile hitting a wall.

```typescript
handleProjectileWallCollision(
  projectileObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
): void
```

**Behavior:**
1. Creates explosion if AoE projectile
2. Destroys the projectile

---

#### createExplosion

Create an AoE explosion at a location.

```typescript
createExplosion(x: number, y: number, weapon: Weapon): void
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `x` | `number` | Explosion X position |
| `y` | `number` | Explosion Y position |
| `weapon` | `Weapon` | Weapon for AoE radius |

**Behavior:**
1. Creates visual explosion effect
2. Damages all enemies within `weapon.stats.aoeRadius`
3. Shakes camera

---

## Weapon System

**File:** `/src/systems/Weapon.ts`

### WeaponType Enum

```typescript
enum WeaponType {
  WAND = 'wand',
  SWORD = 'sword',
  BOW = 'bow',
  STAFF = 'staff',
  DAGGERS = 'daggers'
}
```

### WeaponStats Interface

```typescript
interface WeaponStats {
  type: WeaponType;
  name: string;
  damage: number;           // Base damage multiplier
  attackSpeed: number;      // Cooldown in ms
  range: number;            // Lifetime/arc size multiplier
  projectileSpeed: number;  // Speed (0 for melee)
  projectileCount: number;  // Number of projectiles
  spread: number;           // Angle spread (degrees)
  piercing: boolean;        // Goes through enemies
  aoe: boolean;             // Explodes on impact
  aoeRadius: number;        // Explosion radius
  chargeTime: number;       // Charge time (0 for instant)
  texture: string;          // Weapon icon
  projectileTexture: string; // Projectile sprite
}
```

### Weapon Definitions

| Weapon | Damage | Attack Speed | Range | Speed | Projectiles | Piercing | AoE | Special |
|--------|--------|--------------|-------|-------|-------------|----------|-----|---------|
| Wand | 1.0x | 300ms | 1.0 | 400 | 1 | No | No | Basic ranged |
| Sword | 2.0x | 400ms | 1.2 | 0 (melee) | 1 | Yes | No | 90 degree arc |
| Bow | 1.8x | 600ms | 1.5 | 500 | 1 | Yes | No | 300ms charge |
| Staff | 1.5x | 800ms | 0.8 | 250 | 1 | No | Yes | 64px explosion |
| Daggers | 0.5x | 150ms | 0.7 | 450 | 3 | No | No | 15 degree spread |

### Rarity System

| Rarity | Level | Bonus Damage |
|--------|-------|--------------|
| Common | 0 | +0% |
| Uncommon | 1 | +15% |
| Rare | 2 | +30% |
| Epic | 3 | +45% |
| Legendary | 4 | +60% |

### Methods

#### getDamageMultiplier

Get the total damage multiplier including rarity bonus.

```typescript
getDamageMultiplier(): number
```

**Formula:**
```
multiplier = stats.damage * (1 + bonusDamage)
bonusDamage = rarity * 0.15
```

---

#### getDisplayName

Get the formatted weapon name with rarity.

```typescript
getDisplayName(): string
```

**Example:** `"Epic Sword"`, `"Legendary Staff"`

---

#### static createRandom

Generate a random weapon with floor-based rarity.

```typescript
static createRandom(floor: number): Weapon
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `floor` | `number` | Current dungeon floor |

**Rarity Calculation:**
```
roll = random() + (floor * 0.02)
Legendary: roll > 0.95
Epic: roll > 0.85
Rare: roll > 0.65
Uncommon: roll > 0.40
Common: otherwise
```

---

## Damage Calculation

### Player -> Enemy Damage

```typescript
// Step 1: Get base damage from player stats
baseDamage = player.attack

// Step 2: Apply weapon multiplier
weaponMultiplier = weapon.stats.damage * (1 + weapon.rarity * 0.15)
damage = floor(baseDamage * weaponMultiplier)

// Step 3: CombatSystem modifiers (if using calculateDamage)
finalDamage = max(1, damage - enemy.defense)
if (random() < 0.1) finalDamage *= 2  // Critical hit
```

### Enemy -> Player Damage

```typescript
// Step 1: Calculate base damage
baseDamage = max(1, enemy.attack - player.defense)

// Step 2: Critical hit check
if (random() < 0.1) baseDamage *= 2

// Step 3: Player takeDamage applies additional defense
actualDamage = max(1, baseDamage - player.defense)
```

### Knockback Calculation

```typescript
knockbackForce = 200
dx = defender.x - attacker.x
dy = defender.y - attacker.y
distance = sqrt(dx*dx + dy*dy) || 1
knockbackX = (dx / distance) * knockbackForce
knockbackY = (dy / distance) * knockbackForce
```

---

## Events

Combat-related events emitted through `scene.events`.

### Damage Events

| Event | Payload | Description |
|-------|---------|-------------|
| `showDamageNumber` | `(x, y, damage, isPlayer)` | Display floating damage |
| `shakeCamera` | `(intensity, duration)` | Screen shake effect |

### Combat State Events

| Event | Payload | Description |
|-------|---------|-------------|
| `enemyAttack` | `(enemy, target)` | Enemy attacks player |
| `enemyDeath` | `(enemy)` | Enemy was killed |
| `playerDeath` | none | Player HP reached 0 |
| `playerLevelUp` | `(player)` | Player gained a level |

### Status Effect Events

| Event | Payload | Description |
|-------|---------|-------------|
| `playerSlowed` | `(slowFactor)` | Speed modifier applied |
| `playerPulled` | `({ x, y })` | Pull velocity applied |
| `damageReflected` | `(damage)` | Damage reflected to player |
| `goldStolen` | `(amount)` | Gold stolen from player |
| `hazardDamage` | `(damage, source)` | Environmental damage |

### Loot Events

| Event | Payload | Description |
|-------|---------|-------------|
| `itemCollected` | none | Item picked up |
| `inventoryFull` | none | Failed to pick up item |
| `goldChanged` | `(newAmount)` | Gold amount changed |
| `equipmentChanged` | none | Equipment slot changed |

### Event Handler Example

```typescript
// Register for enemy death
scene.events.on('enemyDeath', (enemy: Enemy) => {
  player.gainXP(enemy.xpValue);
  spawnLoot(enemy.x, enemy.y);
});

// Register for damage display
scene.events.on('showDamageNumber', (x, y, damage, isPlayer) => {
  const color = isPlayer ? '#ff0000' : '#ffffff';
  showFloatingText(x, y, damage.toString(), color);
});

// Clean up on scene shutdown
scene.events.on('shutdown', () => {
  scene.events.off('enemyDeath');
  scene.events.off('showDamageNumber');
});
```

---

## Constants

**File:** `/src/utils/constants.ts`

### Player Defaults

| Constant | Value | Description |
|----------|-------|-------------|
| `PLAYER_SPEED` | `150` | Base movement speed |
| `PLAYER_MAX_HP` | `100` | Base maximum HP |
| `PLAYER_BASE_ATTACK` | `10` | Base attack power |
| `PLAYER_BASE_DEFENSE` | `5` | Base defense power |

### Tile Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `TILE_SIZE` | `32` | Pixels per tile |

### Timing Constants

| Constant | Value | Location | Description |
|----------|-------|----------|-------------|
| `DODGE_COOLDOWN_MS` | `1000` | Player | Dodge cooldown |
| `DODGE_DURATION_MS` | `200` | Player | Dodge duration |
| `DODGE_SPEED_MULTIPLIER` | `3` | Player | Dodge speed boost |
| `ATTACK_COOLDOWN_MS` | `1000` | Enemy | Enemy attack cooldown |
| `I_FRAMES_MS` | `500` | Player | Damage invulnerability |

---

## Usage Examples

### Basic Combat Setup

```typescript
import { CombatSystem } from '../systems/CombatSystem';
import { PlayerAttackManager } from '../systems/PlayerAttackManager';

class GameScene extends Phaser.Scene {
  private combatSystem!: CombatSystem;
  private playerAttackManager!: PlayerAttackManager;

  create() {
    this.combatSystem = new CombatSystem(this);
    this.playerAttackManager = new PlayerAttackManager(
      this, this.player, this.audioSystem
    );
    this.playerAttackManager.create();

    // Set up projectile-enemy collision
    this.physics.add.overlap(
      this.playerAttackManager.getProjectileGroup(),
      this.enemies,
      (proj, enemy) => {
        this.playerAttackManager.handleProjectileEnemyCollision(proj, enemy);
      }
    );
  }
}
```

### Custom Damage Application

```typescript
// Direct damage without CombatSystem
enemy.takeDamage(50);

// With combat calculations
const result = combatSystem.calculateDamage(player, enemy);
combatSystem.applyDamage(enemy, result);

// Custom damage with effects
const damage = player.getAttackDamage();
enemy.takeDamage(damage);
scene.events.emit('showDamageNumber', enemy.x, enemy.y, damage, false);
scene.events.emit('shakeCamera', 3, 100);
```

### Weapon-Based Attack

```typescript
const weapon = player.getWeapon();
const damage = player.getAttackDamage();

switch (weapon.stats.type) {
  case WeaponType.SWORD:
    // Melee arc attack
    performMeleeAttack(angle, weapon, enemies);
    break;
  case WeaponType.STAFF:
    // AoE projectile
    fireProjectile(angle, weapon, { aoe: true });
    break;
  default:
    // Standard projectile
    fireProjectile(angle, weapon);
}
```

---

## Related Documentation

- [Combat Design](/docs/COMBAT.md) - Game design concepts
- [Items and Loot](/docs/ITEMS_AND_LOOT.md) - Weapon drops and equipment
- [Game Design](/docs/GAME_DESIGN.md) - Overall game mechanics
