# Enemy System API Reference

Complete API reference for the enemy system including the base `Enemy` class, all enemy types, AI behavior, and boss mechanics.

---

## Table of Contents

- [EnemyState Enum](#enemystate-enum)
- [Enemy Base Class](#enemy-base-class)
  - [Properties](#properties)
  - [Constructor](#constructor)
  - [Public Methods](#public-methods)
  - [Protected Methods](#protected-methods)
  - [AI Behavior](#ai-behavior)
- [Standard Enemy Types](#standard-enemy-types)
  - [FastEnemy](#fastenemy)
  - [TankEnemy](#tankenemy)
  - [RangedEnemy](#rangedenemy)
  - [BossEnemy](#bossenemy)
- [Seven Capital Sins Enemies](#seven-capital-sins-enemies)
  - [SlothEnemy](#slothenemy)
  - [GluttonyEnemy](#gluttonyenemy)
  - [GreedEnemy](#greedenemy)
  - [EnvyEnemy](#envyenemy)
  - [WrathEnemy](#wrathenemy)
  - [LustEnemy](#lustenemy)
  - [PrideEnemy](#prideenemy)
- [Sin Boss Classes](#sin-boss-classes)
  - [SinBoss Base Class](#sinboss-base-class)
  - [PrideBoss](#prideboss)
  - [GreedBoss](#greedboss)
  - [WrathBoss](#wrathboss)
  - [SlothBoss](#slothboss)
  - [EnvyBoss](#envyboss)
  - [GluttonyBoss](#gluttonyboss)
  - [LustBoss](#lustboss)
- [Events](#events)
- [Usage Examples](#usage-examples)

---

## EnemyState Enum

```typescript
enum EnemyState {
  IDLE = 'idle',
  CHASE = 'chase',
  ATTACK = 'attack',
  RETREAT = 'retreat',
}
```

**Location:** `src/entities/Enemy.ts`

| State | Description |
|-------|-------------|
| `IDLE` | Enemy is stationary, no target in range |
| `CHASE` | Enemy is pursuing a target within chase range |
| `ATTACK` | Enemy is within attack range and attacking |
| `RETREAT` | Enemy HP is below retreat threshold (20%), fleeing |

---

## Enemy Base Class

```typescript
class Enemy extends Phaser.Physics.Arcade.Sprite
```

**Location:** `src/entities/Enemy.ts`

The base class for all enemies in the game. Extends Phaser's `Arcade.Sprite` with combat stats, AI behavior, and animation support.

### Properties

#### Public Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `hp` | `number` | `30` | Current health points |
| `maxHp` | `number` | `30` | Maximum health points |
| `attack` | `number` | `8` | Attack damage value |
| `defense` | `number` | `2` | Damage reduction value |
| `speed` | `number` | `80` | Movement speed in pixels/second |
| `xpValue` | `number` | `25` | Experience points awarded on death |

#### Protected Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `target` | `Player \| null` | `null` | Primary target reference |
| `secondaryTarget` | `{ x: number; y: number } \| null` | `null` | Secondary position target |
| `spriteKey` | `string` | `''` | Animation sprite key (e.g., 'imp', 'demon_brute') |
| `facingDirection` | `string` | `'south'` | Current facing direction for animations |
| `isMoving` | `boolean` | `false` | Whether the enemy is currently moving |
| `hasWalkAnim` | `boolean` | `false` | Whether walk animations are available |

#### Private Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `ATTACK_COOLDOWN_MS` | `1000` | Milliseconds between attacks |
| `CHASE_RANGE` | `TILE_SIZE * 8` | Distance to start chasing (256px at 32px tiles) |
| `ATTACK_RANGE` | `TILE_SIZE * 1.5` | Distance to start attacking (48px at 32px tiles) |
| `RETREAT_HP_PERCENT` | `0.2` | HP threshold to trigger retreat (20%) |

### Constructor

```typescript
constructor(
  scene: Phaser.Scene,
  x: number,
  y: number,
  texture: string = 'enemy',
  stats?: {
    hp?: number;
    attack?: number;
    defense?: number;
    speed?: number;
    xpValue?: number;
  }
)
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `scene` | `Phaser.Scene` | The Phaser scene to add the enemy to |
| `x` | `number` | Initial X position in world coordinates |
| `y` | `number` | Initial Y position in world coordinates |
| `texture` | `string` | Sprite texture key (default: 'enemy') |
| `stats` | `object` | Optional stat overrides |

**Behavior:**
- Adds sprite to scene and enables physics
- Sets world bounds collision
- Sets depth to 5
- Enables Light2D pipeline
- Creates a dim reddish light (radius: 80, color: 0xff6644, intensity: 0.4)

### Public Methods

#### setTarget

```typescript
setTarget(player: Player): void
```

Sets the primary target for the enemy to track and attack.

#### setSecondaryTarget

```typescript
setSecondaryTarget(target: { x: number; y: number } | null): void
```

Sets a secondary position target. The enemy will pursue whichever target is closer.

#### update

```typescript
update(_time: number, delta: number): void
```

Main update loop called every frame. Handles:
- Cooldown updates
- AI state transitions
- State execution
- Animation updates
- Light position updates

#### takeDamage

```typescript
takeDamage(amount: number): void
```

Applies damage to the enemy.

**Behavior:**
- Reduces HP by the specified amount
- Flashes enemy red (0xff0000) for 100ms
- Triggers death if HP falls to 0 or below

#### getAiState

```typescript
getAiState(): EnemyState
```

Returns the current AI state of the enemy.

### Protected Methods

#### setupSpriteAnimations

```typescript
protected setupSpriteAnimations(spriteKey: string, hasWalk: boolean = true): void
```

Initializes sprite-based animations for the enemy.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `spriteKey` | `string` | Base key for animations (e.g., 'imp', 'demon_brute') |
| `hasWalk` | `boolean` | Whether walk animations exist (default: true) |

#### playDirectionalAnim

```typescript
protected playDirectionalAnim(type: 'idle' | 'walk', direction: string): void
```

Plays a directional animation based on type and direction.

**Animation Key Format:** `{spriteKey}_{type}_{direction}`

**Directions:** `'south'`, `'north'`, `'east'`, `'west'`, `'south_east'`, `'south_west'`, `'north_east'`, `'north_west'`

#### updateAnimation

```typescript
protected updateAnimation(): void
```

Updates the current animation based on velocity. Automatically determines facing direction and whether to play idle or walk animation.

#### getDirectionFromVelocity

```typescript
protected getDirectionFromVelocity(vx: number, vy: number): string
```

Calculates the facing direction from velocity components. Returns one of 8 directions based on movement angle.

#### getClosestTargetPos

```typescript
protected getClosestTargetPos(): { x: number; y: number } | null
```

Returns the position of the closest target (primary or secondary).

### AI Behavior

The enemy AI operates as a state machine with four states:

#### State Transitions

```
IDLE <---> CHASE <---> ATTACK
  |                      |
  v                      v
RETREAT <---------------+
```

**Transition Rules:**

1. **To RETREAT:** HP falls below 20% of max HP
2. **To ATTACK:** Within attack range (1.5 tiles)
3. **To CHASE:** Within chase range (8 tiles) but outside attack range
4. **To IDLE:** Outside chase range

#### State Behaviors

**IDLE:**
- Velocity set to (0, 0)
- No movement

**CHASE:**
- Moves toward the closest target at full speed
- Uses angle calculation for smooth movement

**ATTACK:**
- Stops movement
- Executes attack every 1000ms (after cooldown)
- Performs visual lunge toward player (10px, 100ms, yoyo)
- Emits `'enemyAttack'` event

**RETREAT:**
- Moves away from the closest target
- Speed reduced to 70% of normal

---

## Standard Enemy Types

**Location:** `src/entities/enemies/EnemyTypes.ts`

### FastEnemy

```typescript
class FastEnemy extends Enemy
```

Fast-moving enemy with low HP. Uses the Imp sprite.

#### Stats Formula (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `15 + floor * 3` | 18 | 30 | 45 |
| Attack | `4 + floor` | 5 | 9 | 14 |
| Defense | `0` | 0 | 0 | 0 |
| Speed | `120 + floor * 8` | 128 | 160 | 200 |
| XP Value | `15 + floor * 3` | 18 | 30 | 45 |

**Sprite:** `'imp_idle'`
**Animations:** `'imp'` (walk enabled)

---

### TankEnemy

```typescript
class TankEnemy extends Enemy
```

High HP, slow-moving enemy with high damage. Uses the Demon Brute sprite.

#### Stats Formula (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `50 + floor * 10` | 60 | 100 | 150 |
| Attack | `8 + floor * 2` | 10 | 18 | 28 |
| Defense | `3 + floor` | 4 | 8 | 13 |
| Speed | `40 + floor * 2` | 42 | 50 | 60 |
| XP Value | `35 + floor * 8` | 43 | 75 | 115 |

**Sprite:** `'demon_brute_idle'`
**Animations:** `'demon_brute'` (walk enabled)

---

### RangedEnemy

```typescript
class RangedEnemy extends Enemy
```

Shoots projectiles and maintains distance. Uses the Cultist sprite.

#### Stats Formula (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `20 + floor * 4` | 24 | 40 | 60 |
| Attack | `6 + floor * 2` | 8 | 16 | 26 |
| Defense | `1` | 1 | 1 | 1 |
| Speed | `50 + floor * 3` | 53 | 65 | 80 |
| XP Value | `30 + floor * 6` | 36 | 60 | 90 |

**Sprite:** `'cultist_idle'`
**Animations:** `'cultist'` (walk enabled)

#### Special Properties

| Property | Value | Description |
|----------|-------|-------------|
| `SHOOT_COOLDOWN_MS` | `2000` | Time between shots |
| `PREFERRED_RANGE` | `TILE_SIZE * 5` | Ideal distance from target (160px) |
| Projectile Speed | `200` | Pixels per second |
| Projectile Lifetime | `3000` | Milliseconds before auto-destroy |

#### Additional Methods

```typescript
setProjectileGroup(group: Phaser.Physics.Arcade.Group): void
```

Sets the projectile group for fired projectiles.

#### Behavior
- Maintains distance from target (flees if closer than 70% of preferred range)
- Shoots when within 8 tiles and cooldown is ready
- Projectiles deal damage equal to enemy's attack stat

---

### BossEnemy

```typescript
class BossEnemy extends Enemy
```

Large boss enemy with multiple attack patterns and phases.

#### Stats Formula (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `200 + floor * 30` | 230 | 350 | 500 |
| Attack | `15 + floor * 3` | 18 | 30 | 45 |
| Defense | `5 + floor` | 6 | 10 | 15 |
| Speed | `60 + floor * 2` | 62 | 70 | 80 |
| XP Value | `200 + floor * 50` | 250 | 450 | 700 |

**Sprite:** `'enemy_boss'`
**Scale:** 2x
**Initial Tint:** 0xff0000 (red)

#### Phase System

| Phase | HP Threshold | Tint | Cooldown |
|-------|--------------|------|----------|
| 1 | 100% - 61% | 0xff0000 (red) | 2500ms |
| 2 | 60% - 31% | 0xff4400 (dark orange) | 2500ms |
| 3 | 30% - 0% | 0xff00ff (magenta) | 1500ms |

#### Attack Patterns

Cycles through 3 patterns:

1. **Circle Attack:** Fires projectiles in all directions
   - Phase 1-2: 8 projectiles
   - Phase 3: 12 projectiles
   - Speed: 150px/s

2. **Spread Attack:** Fires a cone of projectiles toward the player
   - Phase 1-2: 5 projectiles
   - Phase 3: 7 projectiles
   - Speed: 200px/s
   - Spread: 45 degrees

3. **Charge Attack:** Lunges toward the player
   - Speed: 300px/s
   - Duration: 500ms

#### Projectile Properties

| Property | Value |
|----------|-------|
| Tint | 0xff00ff (magenta) |
| Damage | 70% of attack stat |
| Scale | 1.5x |
| Lifetime | 4000ms |

---

## Seven Capital Sins Enemies

**Location:** `src/entities/enemies/EnemyTypes.ts`

Thematic enemy variants representing the seven deadly sins.

### SlothEnemy

```typescript
class SlothEnemy extends Enemy
```

Creates a slowing aura around itself.

#### Stats Formula (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `80 + floor * 15` | 95 | 155 | 230 |
| Attack | `4 + floor` | 5 | 9 | 14 |
| Defense | `4 + floor` | 5 | 9 | 14 |
| Speed | `25 + floor * 2` | 27 | 35 | 45 |
| XP Value | `40 + floor * 8` | 48 | 80 | 120 |

**Sprite:** `'sloth_idle'`
**Animations:** `'sloth'` (walk disabled)

#### Slowing Aura

| Property | Value |
|----------|-------|
| Radius | `TILE_SIZE * 3` (96px) |
| Slow Amount | 50% |
| Visual | Gray circle (0x6b7280, 15% opacity) |

**Event Emitted:** `'playerSlowed'` with value `0.5`

---

### GluttonyEnemy

```typescript
class GluttonyEnemy extends Enemy
```

Heals itself when dealing damage.

#### Stats Formula (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `70 + floor * 12` | 82 | 130 | 190 |
| Attack | `8 + floor * 2` | 10 | 18 | 28 |
| Defense | `2 + floor` | 3 | 7 | 12 |
| Speed | `35 + floor * 2` | 37 | 45 | 55 |
| XP Value | `45 + floor * 10` | 55 | 95 | 145 |

**Sprite:** `'gluttony_idle'`
**Animations:** `'gluttony'` (walk disabled)

#### Lifesteal Mechanic

```typescript
onSuccessfulAttack(damageDealt: number): void
```

- Heals 20% of damage dealt
- Visual feedback: Green flash (0x22c55e) for 200ms

---

### GreedEnemy

```typescript
class GreedEnemy extends Enemy
```

Steals gold from the player and flees when the player has no gold.

#### Stats Formula (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `25 + floor * 5` | 30 | 50 | 75 |
| Attack | `3 + floor` | 4 | 8 | 13 |
| Defense | `0` | 0 | 0 | 0 |
| Speed | `100 + floor * 8` | 108 | 140 | 180 |
| XP Value | `35 + floor * 6` | 41 | 65 | 95 |

**Sprite:** `'greed_idle'`
**Animations:** `'greed'` (walk disabled)

#### Gold Stealing

```typescript
onSuccessfulAttack(_damageDealt: number): void
```

- Steals 5-10 gold on hit
- Visual feedback: Gold flash (0xffd700) for 300ms
- **Event Emitted:** `'goldStolen'` with amount stolen

#### Flee Behavior

When player has 0 gold and enemy is in CHASE state, it flees at 80% speed instead.

---

### EnvyEnemy

```typescript
class EnvyEnemy extends Enemy
```

Copies the player's attack stat when first encountering them.

#### Stats Formula (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `35 + floor * 6` | 41 | 65 | 95 |
| Attack | `5 + floor` (base) | 6 | 10 | 15 |
| Defense | `1 + floor` | 2 | 6 | 11 |
| Speed | `70 + floor * 4` | 74 | 90 | 110 |
| XP Value | `40 + floor * 8` | 48 | 80 | 120 |

**Sprite:** `'envy_idle'`
**Animations:** `'envy'` (walk disabled)

#### Stat Copying

- Triggers when player is within 8 tiles
- Copies player's attack stat (once only)
- Visual feedback: Green flash (0x22c55e) then permanent green tint (0x16a34a)

---

### WrathEnemy

```typescript
class WrathEnemy extends Enemy
```

Becomes enraged when damaged, gaining attack and speed.

#### Stats Formula (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `45 + floor * 8` | 53 | 85 | 125 |
| Attack | `10 + floor * 2` (base) | 12 | 20 | 30 |
| Defense | `2 + floor` | 3 | 7 | 12 |
| Speed | `80 + floor * 4` (base) | 84 | 100 | 120 |
| XP Value | `50 + floor * 10` | 60 | 100 | 150 |

**Sprite:** `'wrath_idle'`
**Animations:** `'wrath'` (walk disabled)

#### Enrage Mechanic

**Trigger:** HP falls below 50%

**Effects:**
- Attack increased by 50%
- Speed increased by 20%
- Visual: Red tint (0xff4444) + scale pulse animation (1.15x, 3 times)

**Pre-Enrage Damage Feedback:**
- Orange flash (0xf97316) for 100ms when taking damage

---

### LustEnemy

```typescript
class LustEnemy extends Enemy
```

Creates a magnetic pull effect on the player.

#### Stats Formula (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `25 + floor * 4` | 29 | 45 | 65 |
| Attack | `4 + floor` | 5 | 9 | 14 |
| Defense | `0` | 0 | 0 | 0 |
| Speed | `60 + floor * 3` | 63 | 75 | 90 |
| XP Value | `35 + floor * 6` | 41 | 65 | 95 |

**Sprite:** `'lust_idle'`
**Animations:** `'lust'` (walk disabled)

#### Pull Effect

| Property | Value |
|----------|-------|
| Pull Radius | `TILE_SIZE * 5` (160px) |
| Pull Strength | `30` |
| Visual | Pink circle (0xec4899, 10% opacity) |

**Event Emitted:** `'playerPulled'` with `{ x: number, y: number }` force vector

Pull force scales inversely with distance (stronger when closer).

---

### PrideEnemy

```typescript
class PrideEnemy extends Enemy
```

High defense enemy that reflects damage back to the attacker.

#### Stats Formula (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `60 + floor * 10` | 70 | 110 | 160 |
| Attack | `8 + floor * 2` | 10 | 18 | 28 |
| Defense | `5 + floor * 2` | 7 | 15 | 25 |
| Speed | `50 + floor * 3` | 53 | 65 | 80 |
| XP Value | `60 + floor * 12` | 72 | 120 | 180 |

**Sprite:** `'pride_idle'`
**Animations:** `'pride'` (walk enabled)

#### Damage Reflection

- Reflects 25% of incoming damage back to attacker
- Visual feedback: Gold flash (0xffd700) for 150ms
- **Event Emitted:** `'damageReflected'` with reflected damage amount

---

## Sin Boss Classes

**Location:** `src/entities/enemies/SinBosses.ts`

Enhanced boss variants of each sin with multiple phases and attack patterns.

### SinBoss Base Class

```typescript
abstract class SinBoss extends Enemy
```

Base class providing common functionality for all sin bosses.

#### Properties

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `phase` | `number` | `1` | Current phase (1-3) |
| `patternCooldown` | `number` | `0` | Time until next pattern |
| `projectileGroup` | `Phaser.Physics.Arcade.Group \| null` | `null` | Projectile pool |
| `baseCooldown` | `number` | `2500` | Base cooldown between patterns |

#### XP Value

All sin bosses: `300 + floor * 50`

| Floor | XP Value |
|-------|----------|
| 1 | 350 |
| 5 | 550 |
| 10 | 800 |

#### Phase System

| Phase | HP Threshold | Pattern Cooldown |
|-------|--------------|------------------|
| 1 | 100% - 61% | Base (2500ms) |
| 2 | 60% - 31% | Base (2500ms) |
| 3 | 30% - 0% | Base * 0.6 (1500ms) |

#### Abstract Methods

```typescript
protected abstract executePattern(): void;
protected abstract onPhaseChange(newPhase: number): void;
```

#### Shared Methods

```typescript
setProjectileGroup(group: Phaser.Physics.Arcade.Group): void
```

```typescript
protected spawnProjectile(
  angle: number,
  speed: number,
  color: number = 0xff00ff,
  scale: number = 1.5
): Phaser.Physics.Arcade.Sprite | null
```

---

### PrideBoss

```typescript
class PrideBoss extends SinBoss
```

50% damage reflection, creates mirror images, fires golden projectiles.

#### Stats (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `400 + floor * 40` | 440 | 600 | 800 |
| Attack | `20 + floor * 4` | 24 | 40 | 60 |
| Defense | `8 + floor * 2` | 10 | 18 | 28 |
| Speed | `55` (fixed) | 55 | 55 | 55 |

**Scale:** 2x

#### Phase Changes

| Phase | Tint | Mirror Count |
|-------|------|--------------|
| 1 | Default | 0 |
| 2 | 0xf5f5dc (beige) | 2 |
| 3 | 0xffffff (white) | 4 |

#### Attack Patterns

1. **Golden Ring:** Circle of golden projectiles
   - Phase 1-2: 10 projectiles
   - Phase 3: 16 projectiles
   - Speed: 140px/s

2. **Mirror Beams:** Boss and all mirrors fire at player
   - Main beam damage: 70% attack, speed 200px/s
   - Mirror beam damage: 50% attack, speed 180px/s

3. **Prideful Charge:** Dash toward player
   - Speed: 280px/s
   - Duration: 600ms

#### Damage Reflection

- Reflects 50% of incoming damage
- Event: `'damageReflected'`

---

### GreedBoss

```typescript
class GreedBoss extends SinBoss
```

Steals massive gold, spawns exploding gold pile traps.

#### Stats (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `350 + floor * 35` | 385 | 525 | 700 |
| Attack | `18 + floor * 3` | 21 | 33 | 48 |
| Defense | `4 + floor` | 5 | 9 | 14 |
| Speed | `75` (base) | 75 | 75 | 75 |

**Scale:** 2x

#### Phase Changes

| Phase | Tint | Speed Modifier |
|-------|------|----------------|
| 1 | Default | 1.0x |
| 2 | 0xffd700 (gold) | 1.0x |
| 3 | 0x15803d (green) | 1.3x |

#### Attack Patterns

1. **Coin Barrage:** Spread of gold projectiles toward player
   - Phase 1-2: 5 projectiles
   - Phase 3: 9 projectiles
   - Speed: 220px/s, spread: 60 degrees

2. **Gold Pile Trap:** Spawns exploding gold piles
   - Phase 1-2: 3 piles
   - Phase 3: 5 piles
   - Explodes after 1500ms into 8 projectiles each

3. **Greedy Grab:** Fast dash toward player
   - Speed: 350px/s
   - Duration: 400ms

#### Gold Stealing

- Steals 15-35 gold on successful attack
- Event: `'goldStolen'`

---

### WrathBoss

```typescript
class WrathBoss extends SinBoss
```

Permanent rage mode with escalating attack and speed bonuses.

#### Stats (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `450 + floor * 45` | 495 | 675 | 900 |
| Attack | `25 + floor * 5` (base) | 30 | 50 | 75 |
| Defense | `3 + floor` | 4 | 8 | 13 |
| Speed | `70` (base) | 70 | 70 | 70 |

**Scale:** 2x

#### Phase Changes

| Phase | Tint | Attack Modifier | Speed Modifier |
|-------|------|-----------------|----------------|
| 1 | Default | 1.0x | 1.0x |
| 2 | 0xf97316 (orange) | 1.3x | 1.15x |
| 3 | 0xfbbf24 (amber) | 1.7x | 1.5x |

**Phase 3 Visual:** Scale pulse animation (2.3x, 3 times)

#### Attack Patterns

1. **Fire Wave:** Multiple waves of fire projectiles
   - Phase 1-2: 2 waves, 5 projectiles each
   - Phase 3: 3 waves, 5 projectiles each
   - Speed: 200px/s, wave delay: 200ms

2. **Berserker Charge:** Multiple rapid charges
   - Phase 1-2: 2 charges
   - Phase 3: 3 charges
   - Speed: 400px/s, duration: 300ms, delay: 500ms between charges

3. **Rage Burst:** Explosive ring of fire projectiles
   - Phase 1-2: 12 projectiles
   - Phase 3: 20 projectiles
   - Speed: 180px/s

---

### SlothBoss

```typescript
class SlothBoss extends SinBoss
```

Massive slow aura, time manipulation abilities.

#### Stats (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `500 + floor * 50` | 550 | 750 | 1000 |
| Attack | `15 + floor * 3` | 18 | 30 | 45 |
| Defense | `10 + floor * 2` | 12 | 20 | 30 |
| Speed | `30` (phases 1-2) | 30 | 30 | 30 |

**Scale:** 2x

#### Phase Changes

| Phase | Tint | Speed | Slow Amount |
|-------|------|-------|-------------|
| 1 | Default | 30 | 40% |
| 2 | 0x4b5563 (gray) | 30 | 40% |
| 3 | 0x60a5fa (blue) | 60 | 30% |

#### Slowing Aura

| Property | Value |
|----------|-------|
| Radius | `TILE_SIZE * 6` (192px) |
| Visual | Gray circle (0x6b7280, 20% opacity) |

**Event:** `'playerSlowed'`

#### Attack Patterns

1. **Time Slow Field:** Temporarily expands slow aura
   - Scale: 1.5x for 1500ms (500ms expand, 1000ms hold, 500ms contract)

2. **Lethargy Wave:** Slow, large projectiles in all directions
   - Phase 1-2: 10 projectiles
   - Phase 3: 16 projectiles
   - Speed: 80px/s, scale: 2x

3. **Drowsy Burst:** Targeted slow projectiles in waves
   - 3 waves, 400ms apart
   - 3 projectiles per wave, speed: 120px/s

---

### EnvyBoss

```typescript
class EnvyBoss extends SinBoss
```

Copies player stats, spawns shadow clones.

#### Stats (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `400 + floor * 40` | 440 | 600 | 800 |
| Attack | `16 + floor * 3` (base) | 19 | 31 | 46 |
| Defense | `5 + floor` (base) | 6 | 10 | 15 |
| Speed | `65` (fixed) | 65 | 65 | 65 |

**Scale:** 2x

#### Phase Changes

| Phase | Tint | Shadow Clones Spawned |
|-------|------|-----------------------|
| 1 | Default | 0 |
| 2 | 0x15803d (green) | 1 |
| 3 | 0x0f172a (dark) | 2 |

#### Shadow Clones

Created via `spawnShadowClone()`:

| Property | Value |
|----------|-------|
| HP | 20% of boss HP |
| Attack | 50% of boss attack |
| Defense | 0 |
| Speed | Same as boss |
| XP Value | 20 |
| Scale | 1.5x |
| Alpha | 0.6 |
| Tint | 0x1f2937 (dark gray) |

**Event:** `'enemySpawned'` with clone reference

#### Stat Copying

On first pattern execution:
- Copies higher of boss attack or player attack
- Copies higher of boss defense or player defense

#### Attack Patterns

1. **Shadow Bolt:** Spread of green projectiles
   - Phase 1-2: 5 projectiles
   - Phase 3: 7 projectiles
   - Speed: 190px/s

2. **Envy Mirror:** Fires projectiles in player's movement direction
   - 5 projectiles, 100ms apart
   - Speed: 200px/s

3. **Dark Swarm:** Ring of dark projectiles
   - Phase 1-2: 10 projectiles
   - Phase 3: 14 projectiles
   - Speed: 130px/s

---

### GluttonyBoss

```typescript
class GluttonyBoss extends SinBoss
```

Heavy lifesteal, grows larger when healing.

#### Stats (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `550 + floor * 55` | 605 | 825 | 1100 |
| Attack | `22 + floor * 4` | 26 | 42 | 62 |
| Defense | `6 + floor` | 7 | 11 | 16 |
| Speed | `45` (base) | 45 | 45 | 45 |

**Scale:** 2x (initial)

#### Phase Changes

| Phase | Tint | Scale | Speed Modifier |
|-------|------|-------|----------------|
| 1 | Default | 2.0x | 1.0x |
| 2 | 0xf59e0b (amber) | 2.3x | 1.0x |
| 3 | 0xd97706 (orange) | 2.6x | 1.2x |

#### Lifesteal

- Heals 40% of damage dealt on successful attack
- Visual: Green flash (0x22c55e)
- Grows by 0.05 scale per heal (max 3.0x)

#### Attack Patterns

1. **Devour Charge:** Slower, wider charge
   - Speed: 250px/s
   - Duration: 800ms

2. **Hunger Wave:** Wide spread of projectiles
   - Phase 1-2: 6 projectiles
   - Phase 3: 9 projectiles
   - Speed: 160px/s, spread: 90 degrees

3. **Consume Burst:** Large slow projectiles in all directions
   - Phase 1-2: 8 projectiles
   - Phase 3: 12 projectiles
   - Speed: 100px/s, scale: 2.5x

---

### LustBoss

```typescript
class LustBoss extends SinBoss
```

Strong pull effect, seductive spiral projectile patterns.

#### Stats (by floor)

| Stat | Formula | Floor 1 | Floor 5 | Floor 10 |
|------|---------|---------|---------|----------|
| HP | `380 + floor * 38` | 418 | 570 | 760 |
| Attack | `18 + floor * 3` | 21 | 33 | 48 |
| Defense | `4 + floor` | 5 | 9 | 14 |
| Speed | `70` (base) | 70 | 70 | 70 |

**Scale:** 2x

#### Phase Changes

| Phase | Tint | Speed Modifier | Pull Modifier |
|-------|------|----------------|---------------|
| 1 | Default | 1.0x | 1.0x |
| 2 | 0xf472b6 (pink) | 1.0x | 1.0x |
| 3 | 0xfce7f3 (light pink) | 1.3x | 1.5x |

#### Pull Effect

| Property | Value |
|----------|-------|
| Pull Radius | `TILE_SIZE * 7` (224px) |
| Pull Strength | `50` (base) |
| Phase 3 Pull | 75 (1.5x) |
| Visual | Pink circle (0xec4899, 15% opacity) |

**Event:** `'playerPulled'`

#### Attack Patterns

1. **Seductive Spiral:** Spiral pattern of projectiles
   - Phase 1-2: 10 projectiles
   - Phase 3: 16 projectiles
   - Speed: 150px/s, delay: 100ms between shots

2. **Heart Burst:** Spread toward player
   - Phase 1-2: 5 projectiles
   - Phase 3: 7 projectiles
   - Speed: 200px/s, spread: 60 degrees

3. **Charm Dash:** Quick dash toward player
   - Speed: 350px/s
   - Duration: 400ms

---

## Events

The enemy system emits and listens to various events:

### Emitted Events

| Event | Payload | Description |
|-------|---------|-------------|
| `'enemyAttack'` | `(enemy: Enemy, target: Player)` | Enemy performs an attack |
| `'enemyDeath'` | `(enemy: Enemy)` | Enemy dies |
| `'playerSlowed'` | `number` (0.0-1.0) | Player should be slowed by percentage |
| `'playerPulled'` | `{ x: number, y: number }` | Force vector to apply to player |
| `'goldStolen'` | `number` | Amount of gold stolen from player |
| `'damageReflected'` | `number` | Damage to apply back to player |
| `'enemySpawned'` | `Enemy` | New enemy created (e.g., shadow clone) |

---

## Usage Examples

### Spawning a Basic Enemy

```typescript
import { Enemy } from '../entities/Enemy';

// In GameScene
const enemy = new Enemy(this, 400, 300, 'enemy', {
  hp: 50,
  attack: 10,
  defense: 3,
  speed: 100,
  xpValue: 30
});

enemy.setTarget(this.player);
this.enemies.add(enemy);
```

### Spawning a FastEnemy

```typescript
import { FastEnemy } from '../entities/enemies/EnemyTypes';

const currentFloor = 5;
const imp = new FastEnemy(this, x, y, currentFloor);
imp.setTarget(this.player);
this.enemies.add(imp);
```

### Spawning a RangedEnemy with Projectiles

```typescript
import { RangedEnemy } from '../entities/enemies/EnemyTypes';

// Create projectile group first
this.enemyProjectiles = this.physics.add.group({
  classType: Phaser.Physics.Arcade.Sprite
});

const cultist = new RangedEnemy(this, x, y, currentFloor);
cultist.setTarget(this.player);
cultist.setProjectileGroup(this.enemyProjectiles);
this.enemies.add(cultist);

// Set up projectile collision
this.physics.add.overlap(
  this.player,
  this.enemyProjectiles,
  this.handleProjectileHit,
  undefined,
  this
);
```

### Spawning a Sin Boss

```typescript
import { WrathBoss } from '../entities/enemies/SinBosses';

const boss = new WrathBoss(this, roomCenterX, roomCenterY, currentFloor);
boss.setTarget(this.player);
boss.setProjectileGroup(this.enemyProjectiles);
this.enemies.add(boss);

// Listen for phase changes
this.events.on('bossPhaseChange', (phase: number) => {
  console.log(`Boss entered phase ${phase}!`);
});
```

### Handling Sin-Specific Events

```typescript
// Handle player slowing (Sloth enemies)
this.events.on('playerSlowed', (slowAmount: number) => {
  this.player.applySpeedModifier(slowAmount);
});

// Handle player being pulled (Lust enemies)
this.events.on('playerPulled', (force: { x: number, y: number }) => {
  this.player.body.velocity.x += force.x;
  this.player.body.velocity.y += force.y;
});

// Handle gold theft (Greed enemies)
this.events.on('goldStolen', (amount: number) => {
  this.showFloatingText(`-${amount} gold!`, 0xffd700);
});

// Handle damage reflection (Pride enemies)
this.events.on('damageReflected', (damage: number) => {
  this.player.takeDamage(damage);
});

// Handle dynamically spawned enemies (Envy boss clones)
this.events.on('enemySpawned', (enemy: Enemy) => {
  this.enemies.add(enemy);
});
```

### Custom Enemy Subclass

```typescript
import { Enemy } from '../entities/Enemy';
import { Player } from '../entities/Player';

export class CustomEnemy extends Enemy {
  private specialCooldown: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, floor: number) {
    super(scene, x, y, 'custom_sprite', {
      hp: 40 + floor * 5,
      attack: 6 + floor,
      defense: 2,
      speed: 75,
      xpValue: 25 + floor * 5,
    });
    this.setupSpriteAnimations('custom', true);
  }

  update(time: number, delta: number): void {
    super.update(time, delta);

    if (!this.active) return;

    this.specialCooldown -= delta;
    if (this.specialCooldown <= 0) {
      this.performSpecialAbility();
      this.specialCooldown = 3000;
    }
  }

  private performSpecialAbility(): void {
    // Custom ability logic
  }

  // Optional: override for special behavior on successful hit
  onSuccessfulAttack(damageDealt: number): void {
    // Custom on-hit effects
  }

  // Optional: override for special behavior when taking damage
  takeDamage(amount: number): void {
    // Custom damage handling
    super.takeDamage(amount);
  }
}
```

---

## File Locations

| File | Description |
|------|-------------|
| `src/entities/Enemy.ts` | Base Enemy class and EnemyState enum |
| `src/entities/enemies/EnemyTypes.ts` | Standard enemies and Sin enemies |
| `src/entities/enemies/SinBosses.ts` | Sin boss variants |
