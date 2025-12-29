# Entities

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Phaser](https://img.shields.io/badge/Phaser-3.x-blue)](https://phaser.io/)
[![Game Entities](https://img.shields.io/badge/Entities-Player%20%7C%20Enemy%20%7C%20NPC-green)]()

This directory contains all game entity classes that represent interactive objects in the dungeon crawler. Entities extend Phaser's physics sprites and implement game-specific logic for combat, AI, dialogue, and player progression.

## Directory Structure

```
entities/
├── Player.ts          # Player character class
├── Enemy.ts           # Base enemy class with AI state machine
├── NPC.ts             # Non-player characters with dialogue
├── enemies/
│   ├── EnemyTypes.ts  # Standard enemy variants + sin enemies
│   └── SinBosses.ts   # Seven deadly sin boss encounters
└── README.md
```

---

## Player Class

**File:** `/Users/gfelter/code/dungeon-crawler-now/src/entities/Player.ts`

The Player class represents the controllable character, extending `Phaser.Physics.Arcade.Sprite`.

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `hp` / `maxHp` | `number` | Current and maximum health points |
| `attack` | `number` | Attack damage (base + equipment) |
| `defense` | `number` | Damage reduction value |
| `speed` | `number` | Movement speed (minimum 50) |
| `level` | `number` | Current player level |
| `xp` / `xpToNextLevel` | `number` | Experience points and threshold |
| `gold` | `number` | Currency for purchases |
| `statPoints` | `number` | Unallocated stat points from leveling |
| `inventory` | `InventorySystem` | 20-slot inventory system |

### Base Stats (from constants)

- `PLAYER_MAX_HP`: Starting max health
- `PLAYER_BASE_ATTACK`: Starting attack power
- `PLAYER_BASE_DEFENSE`: Starting defense
- `PLAYER_SPEED`: Base movement speed

### Core Methods

#### Movement and Animation

```typescript
update(_time: number, delta: number): void
```
Main update loop handling movement input (WASD/Arrow keys) and cooldowns.

```typescript
getFacingDirection(): string
```
Returns current facing direction for 8-directional movement: `'north'`, `'south'`, `'east'`, `'west'`, `'north_east'`, `'north_west'`, `'south_east'`, `'south_west'`.

#### Combat

```typescript
takeDamage(amount: number): void
```
Applies damage reduced by defense. Triggers invulnerability frames (500ms) and red flash visual feedback.

```typescript
getAttackDamage(): number
```
Returns attack * weapon damage multiplier.

```typescript
canAttack(): boolean
```
Checks if attack cooldown has elapsed and player is not dodging.

```typescript
dodge(): void
```
Spacebar dodge: 200ms invulnerability with 3x speed burst. 1 second cooldown.

#### Progression

```typescript
gainXP(amount: number): void
```
Adds XP and triggers level-up when threshold is reached.

```typescript
allocateStat(stat: 'hp' | 'attack' | 'defense' | 'speed'): boolean
```
Spends one stat point to increase chosen attribute. Returns false if no points available.

```typescript
recalculateStats(): void
```
Recalculates all stats from base values + equipment bonuses.

#### Inventory and Items

```typescript
pickupItem(item: Item): boolean
equipItem(itemId: string): void
useItem(itemId: string): boolean
```

#### Economy

```typescript
addGold(amount: number): void
spendGold(amount: number): boolean
canAfford(amount: number): boolean
```

#### Save/Load

```typescript
getSaveData(): PlayerSaveData
restoreFromSave(data: PlayerSaveData): void
```

#### Special Modifiers

```typescript
setSpeedModifier(modifier: number): void  // For Sloth enemy slow effect
resetSpeedModifier(): void
```

---

## Enemy Class

**File:** `/Users/gfelter/code/dungeon-crawler-now/src/entities/Enemy.ts`

Base class for all enemies with a finite state machine AI system.

### AI States

```typescript
enum EnemyState {
  IDLE = 'idle',      // Standing still, no target in range
  CHASE = 'chase',    // Moving toward target (within 8 tiles)
  ATTACK = 'attack',  // Within 1.5 tiles, executing attack
  RETREAT = 'retreat' // HP below 20%, fleeing from target
}
```

### Key Properties

| Property | Type | Description |
|----------|------|-------------|
| `hp` / `maxHp` | `number` | Health points |
| `attack` | `number` | Damage dealt to player |
| `defense` | `number` | Damage reduction |
| `speed` | `number` | Movement speed |
| `xpValue` | `number` | XP awarded on death |
| `spriteKey` | `string` | Animation sprite identifier |
| `facingDirection` | `string` | Current facing direction |

### AI Configuration

| Constant | Value | Description |
|----------|-------|-------------|
| `ATTACK_COOLDOWN_MS` | 1000 | Time between attacks |
| `CHASE_RANGE` | 8 tiles | Detection/pursuit distance |
| `ATTACK_RANGE` | 1.5 tiles | Melee attack distance |
| `RETREAT_HP_PERCENT` | 0.2 | HP threshold to flee |

### Core Methods

```typescript
setTarget(player: Player): void
```
Sets the primary target for AI behavior.

```typescript
setSecondaryTarget(target: { x: number; y: number } | null): void
```
Sets an alternate target position (e.g., structures to attack).

```typescript
update(_time: number, delta: number): void
```
Runs AI state machine: updateState() -> executeState() -> updateAnimation().

```typescript
takeDamage(amount: number): void
```
Applies damage with red flash feedback. Triggers death at 0 HP.

### Animation System

```typescript
protected setupSpriteAnimations(spriteKey: string, hasWalk: boolean): void
protected playDirectionalAnim(type: 'idle' | 'walk', direction: string): void
protected updateAnimation(): void
```

### Events Emitted

- `enemyAttack` - When attacking player
- `enemyDeath` - When HP reaches 0 (for XP/loot handling)

---

## NPC Class

**File:** `/Users/gfelter/code/dungeon-crawler-now/src/entities/NPC.ts`

Non-player characters that provide dialogue, lore, and world-building.

### NPC Types

```typescript
enum NPCType {
  CHRONICLER = 'chronicler',         // Main hub NPC
  LOST_SOUL = 'lost_soul',           // Dungeon lore NPCs
  WARNING_SPIRIT = 'warning_spirit', // Pre-boss floor warnings
  MYSTERIOUS_FIGURE = 'mysterious_figure'
}
```

### NPCData Interface

```typescript
interface NPCData {
  type: NPCType;
  name: string;
  dialogue: DialogueLine[];
  texture: string;
  tint?: number;
  scale?: number;
}
```

### Visual Features

- **Floating animation**: Gentle vertical bob (1500ms cycle)
- **Interaction indicator**: Bouncing "!" symbol above NPC
- **Point light**: Colored glow matching NPC tint (pulsing intensity)
- **Light2D pipeline**: Integration with dynamic lighting system

### Core Methods

```typescript
getData(): NPCData
getDialogue(): DialogueLine[]
hideIndicator(): void
showIndicator(): void
```

### World Lore System

The file contains extensive lore organized by the seven sin worlds:

```typescript
const WORLD_LORE: Record<SinWorld, DialogueLine[][]>
```

Each world (Pride, Greed, Wrath, Sloth, Envy, Gluttony, Lust) has 3 unique dialogue sets featuring:
- Lost souls describing their sins
- Warnings about the world's boss
- Atmospheric world-building

### Helper Functions

```typescript
getRandomWorldLore(world: SinWorld): DialogueLine[]
createLostSoulData(world: SinWorld): NPCData
createWarningSpirit(world: SinWorld): NPCData
```

### Hub NPCs

Pre-defined NPCs for the central hub area:
- **The Chronicler**: Explains the seven towers and sins
- **Mysterious Figure**: Cryptic warnings about failure

### Boss Warnings

```typescript
const BOSS_WARNINGS: Record<SinWorld, DialogueLine[]>
```

Specific tactical hints before each boss encounter.

---

## enemies/ Subdirectory

### EnemyTypes.ts

**File:** `/Users/gfelter/code/dungeon-crawler-now/src/entities/enemies/EnemyTypes.ts`

Contains standard enemy variants and sin-themed enemies.

#### Standard Enemies

| Class | Sprite | HP | Speed | Special |
|-------|--------|-----|-------|---------|
| `FastEnemy` | Imp | Low (15+) | High (120+) | Charges at player |
| `TankEnemy` | Demon Brute | High (50+) | Low (40+) | High defense |
| `RangedEnemy` | Cultist | Medium (20+) | Medium (50+) | Shoots projectiles, maintains distance |
| `BossEnemy` | Boss | Very High (200+) | Medium (60+) | Multiple attack phases, projectile patterns |

#### Sin Enemies

Themed enemies with unique mechanics matching the seven deadly sins:

| Class | Sin | Mechanic |
|-------|-----|----------|
| `SlothEnemy` | Sloth | Creates slowing aura (50% slow within 3 tiles) |
| `GluttonyEnemy` | Gluttony | Heals 20% of damage dealt on successful attacks |
| `GreedEnemy` | Greed | Steals 5-10 gold on hit, flees if player has no gold |
| `EnvyEnemy` | Envy | Copies player's attack stat when first seen |
| `WrathEnemy` | Wrath | Enrages at 50% HP (1.5x attack, 1.2x speed) |
| `LustEnemy` | Lust | Pulls player toward it (magnetic effect within 5 tiles) |
| `PrideEnemy` | Pride | Reflects 25% of damage back to attacker |

### SinBosses.ts

**File:** `/Users/gfelter/code/dungeon-crawler-now/src/entities/enemies/SinBosses.ts`

Seven unique boss encounters, one for each deadly sin world.

#### SinBoss Base Class

Abstract class providing common boss functionality:
- Three-phase system (100%->60%->30% HP thresholds)
- Projectile spawning utilities
- Pattern cooldown management (faster in phase 3)

#### Boss Encounters

| Boss | HP | Special Mechanics |
|------|-----|-------------------|
| `PrideBoss` | 400+ | 50% damage reflection, mirror images, golden projectiles |
| `GreedBoss` | 350+ | Massive gold theft, exploding gold pile traps |
| `WrathBoss` | 450+ | Permanent rage scaling (+70% attack in phase 3), fire projectiles |
| `SlothBoss` | 500+ | Huge slow aura (6 tiles), time dilation, paradoxically faster in phase 3 |
| `EnvyBoss` | 400+ | Copies all player stats, spawns shadow clones |
| `GluttonyBoss` | 550+ | 40% lifesteal, grows larger when healing (up to 3x scale) |
| `LustBoss` | 380+ | Strong pull effect (7 tiles), spiral projectile patterns |

Each boss features:
- Three unique attack patterns
- Phase-specific visual changes (tint, scale)
- Themed projectile colors
- Environmental hazards (auras, clones, traps)

---

## Scene and System Integration

### Event Communication

Entities communicate with GameScene through Phaser's event system:

**Player Events:**
- `goldChanged` - Gold amount updated
- `itemPickup` - Item added to inventory
- `equipmentChanged` - Equipment slot changed
- `playerLevelUp` - Level increased (opens stat allocation UI)
- `playerDeath` - HP reached 0

**Enemy Events:**
- `enemyAttack` - Enemy attacking player
- `enemyDeath` - Enemy destroyed (triggers XP/loot)
- `enemySpawned` - New enemy added (from Envy clones)
- `playerSlowed` - Sloth aura effect
- `playerPulled` - Lust pull effect
- `damageReflected` - Pride reflection
- `goldStolen` - Greed theft

### Physics Integration

All entities use `Phaser.Physics.Arcade.Sprite`:
- Collision detection with walls and other entities
- Velocity-based movement
- World bounds collision

### Lighting System

Entities integrate with Phaser's Light2D pipeline:
- `setPipeline('Light2D')` - Responds to dynamic lighting
- Enemy lights (dim red glow, 80px radius)
- NPC lights (colored glow matching tint)

### Animation System

8-directional sprite animations:
- Idle animations for each direction
- Walk animations (when `hasWalkAnim` is true)
- Direction determined from velocity vector

---

## Usage Example

```typescript
// Creating a player
const player = new Player(scene, x, y);

// Creating an enemy
const enemy = new FastEnemy(scene, x, y, floorLevel);
enemy.setTarget(player);
enemy.setProjectileGroup(projectileGroup); // For ranged enemies

// Creating an NPC
const loreData = createLostSoulData(SinWorld.PRIDE);
const npc = new NPC(scene, x, y, loreData);

// Creating a boss
const boss = new PrideBoss(scene, x, y, floorLevel);
boss.setTarget(player);
boss.setProjectileGroup(projectileGroup);
```

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
