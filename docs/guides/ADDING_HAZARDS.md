# Adding Environmental Hazards

This guide covers the hazard system architecture and provides step-by-step instructions for adding new environmental dangers to the dungeon.

## Table of Contents

1. [Hazard System Overview](#hazard-system-overview)
2. [Types of Hazards](#types-of-hazards)
3. [Step-by-Step Guide](#step-by-step-guide)
4. [Physics and Collision Setup](#physics-and-collision-setup)
5. [Damage Application](#damage-application)
6. [Visual Effects](#visual-effects)
7. [Complete Code Example](#complete-code-example)
8. [Testing Checklist](#testing-checklist)

---

## Hazard System Overview

The hazard system is managed by `HazardSystem` (`src/systems/HazardSystem.ts`), which handles spawning, updating, and damage application for all environmental hazards.

### Architecture

```
GameScene
    |
    +-- HazardSystem
    |       |
    |       +-- spikeTraps[]      (floor hazards, timed activation)
    |       +-- lavaPits[]        (floor hazards, continuous damage)
    |       +-- arrowShooters[]   (wall hazards, projectile spawners)
    |       +-- arrowGroup        (physics group for projectiles)
    |
    +-- RoomManager (controls room state for hazard behavior)
```

### Lifecycle

1. **Initialization**: `HazardSystem` is created in `GameScene.createManagers()`
2. **Room Manager Link**: `setRoomManager()` connects hazards to room state
3. **Spawning**: `spawnHazardsInRoom()` is called when a room is activated
4. **Update Loop**: `update(delta)` handles timing, state changes, and collisions
5. **Cleanup**: `destroy()` removes all hazard sprites and physics objects

### Key Files

| File | Purpose |
|------|---------|
| `src/systems/HazardSystem.ts` | Main hazard logic and management |
| `src/systems/AssetGenerator.ts` | Hazard texture generation |
| `src/scenes/BootScene.ts` | Asset loading (for external textures) |
| `src/scenes/game/GameSceneCollisions.ts` | Hazard collision setup |

---

## Types of Hazards

### 1. Damage Zones (Floor Hazards)

Static or timed hazards that damage the player when standing on them.

**Examples:**
- **Spike Traps**: Toggle between active/inactive states on a timer
- **Lava Pits**: Continuous damage while the player stands on them

**Characteristics:**
- Placed on floor tiles inside rooms
- Use proximity-based collision (not physics overlap)
- Damage is applied per-tick with cooldowns

### 2. Traps (Timed Hazards)

Hazards that cycle between safe and dangerous states.

**Spike Trap Behavior:**
```
INACTIVE (1.5-2.5s) --> ACTIVE (0.8-1.2s) --> INACTIVE
     [safe]                [damages player]
```

### 3. Projectile Spawners (Wall Hazards)

Wall-mounted devices that fire projectiles into the room.

**Arrow Shooter Behavior:**
- Mounted on walls, facing into the room
- Fire projectiles every 2-3 seconds
- Only active when the room is in `ACTIVE` state (enemies alive)
- Projectiles use physics for movement and collision

---

## Step-by-Step Guide

### Step 1: Define the Hazard Type

Add a new entry to the `HazardType` enum:

```typescript
// src/systems/HazardSystem.ts
export enum HazardType {
  SPIKE_TRAP = 'spike_trap',
  LAVA_PIT = 'lava_pit',
  ARROW_SHOOTER = 'arrow_shooter',
  POISON_GAS = 'poison_gas',  // NEW HAZARD
}
```

### Step 2: Create the Hazard Interface

Define the data structure for your hazard:

```typescript
// src/systems/HazardSystem.ts
interface PoisonGasCloud {
  sprite: Phaser.GameObjects.Sprite;
  centerX: number;
  centerY: number;
  radius: number;
  damageTimer: number;
  pulseTimer: number;
}
```

### Step 3: Add Storage Array

Add a private array to store hazard instances:

```typescript
// In HazardSystem class
private poisonGasClouds: PoisonGasCloud[] = [];
```

### Step 4: Set Damage Values

Define the damage constant:

```typescript
// In HazardSystem class
private readonly POISON_DAMAGE_PER_TICK = 3;
```

### Step 5: Create the Asset

Add asset generation in `AssetGenerator`:

```typescript
// src/systems/AssetGenerator.ts - in createHazardAssets()
private createHazardAssets(): void {
  // ... existing hazards ...

  // Poison gas cloud (green swirling mist)
  const poisonGraphics = this.scene.make.graphics({ x: 0, y: 0 });
  poisonGraphics.fillStyle(0x22c55e, 0.4);
  poisonGraphics.fillCircle(TILE_SIZE / 2, TILE_SIZE / 2, TILE_SIZE / 2);
  poisonGraphics.fillStyle(0x16a34a, 0.6);
  poisonGraphics.fillCircle(TILE_SIZE / 2 - 4, TILE_SIZE / 2 - 2, 6);
  poisonGraphics.fillCircle(TILE_SIZE / 2 + 4, TILE_SIZE / 2 + 2, 5);
  poisonGraphics.generateTexture('poison_gas', TILE_SIZE, TILE_SIZE);
  poisonGraphics.destroy();
}
```

### Step 6: Implement the Spawn Function

```typescript
// In HazardSystem class
private spawnPoisonGas(room: Room, count: number): void {
  for (let i = 0; i < count; i++) {
    // Random position inside room (not on edges)
    const x = room.x + 2 + Math.floor(Math.random() * (room.width - 4));
    const y = room.y + 2 + Math.floor(Math.random() * (room.height - 4));

    const worldX = x * TILE_SIZE + TILE_SIZE / 2;
    const worldY = y * TILE_SIZE + TILE_SIZE / 2;

    const sprite = this.scene.add.sprite(worldX, worldY, 'poison_gas');
    sprite.setDepth(2);
    sprite.setPipeline('Light2D');
    sprite.setAlpha(0.7);

    // Add pulsing animation
    this.scene.tweens.add({
      targets: sprite,
      alpha: { from: 0.5, to: 0.8 },
      scale: { from: 0.9, to: 1.1 },
      duration: 1000 + Math.random() * 500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.poisonGasClouds.push({
      sprite,
      centerX: worldX,
      centerY: worldY,
      radius: TILE_SIZE * 0.8,
      damageTimer: 0,
      pulseTimer: 0,
    });
  }
}
```

### Step 7: Add Spawn Logic

Integrate into `spawnHazardsInRoom()`:

```typescript
spawnHazardsInRoom(room: Room, dungeonData: DungeonData): void {
  if (room.id === 0) return;

  const isTrapRoom = room.type === RoomType.TRAP;
  const hazardChance = Math.min(0.4 + this.floor * 0.02, 0.7);

  // ... existing hazard spawns ...

  // Poison gas clouds (floor 4+)
  if (isTrapRoom || (Math.random() < hazardChance * 0.4 && this.floor >= 4)) {
    const gasCount = isTrapRoom ? 3 : 1;
    this.spawnPoisonGas(room, gasCount);
  }
}
```

### Step 8: Implement Update Logic

```typescript
private updatePoisonGas(delta: number): void {
  for (const gas of this.poisonGasClouds) {
    gas.damageTimer += delta;

    // Check if player is within the gas cloud
    const dist = Phaser.Math.Distance.Between(
      gas.centerX, gas.centerY,
      this.player.x, this.player.y
    );

    if (dist < gas.radius) {
      // Apply damage every 400ms
      if (gas.damageTimer >= 400) {
        this.damagePlayer(
          this.POISON_DAMAGE_PER_TICK + Math.floor(this.floor / 3),
          'poison'
        );
        gas.damageTimer = 0;
      }
    }
  }
}
```

### Step 9: Wire Up the Update Loop

```typescript
update(delta: number): void {
  this.updateSpikeTraps(delta);
  this.updateLavaPits(delta);
  this.updateArrowShooters(delta);
  this.updateArrows();
  this.updatePoisonGas(delta);  // Add this line
}
```

### Step 10: Clean Up on Destroy

```typescript
destroy(): void {
  for (const trap of this.spikeTraps) {
    trap.sprite.destroy();
  }
  for (const lava of this.lavaPits) {
    lava.sprite.destroy();
  }
  for (const shooter of this.arrowShooters) {
    shooter.sprite.destroy();
  }
  // Add cleanup for new hazard
  for (const gas of this.poisonGasClouds) {
    gas.sprite.destroy();
  }
  this.arrowGroup.clear(true, true);
}
```

---

## Physics and Collision Setup

### Proximity-Based Collision (Floor Hazards)

Most floor hazards use distance-based collision rather than Phaser physics:

```typescript
private isPlayerOnTile(tileX: number, tileY: number): boolean {
  const dist = Phaser.Math.Distance.Between(
    tileX, tileY,
    this.player.x, this.player.y
  );
  return dist < TILE_SIZE * 0.6;  // ~60% of tile size
}
```

**Advantages:**
- Simpler than physics overlap
- No need for physics bodies on static hazards
- Easy to adjust collision radius

### Physics-Based Collision (Projectiles)

Projectiles use Phaser's physics system:

```typescript
// Create projectile group in constructor
this.arrowGroup = scene.physics.add.group();

// Create projectile
const arrow = this.arrowGroup.create(x, y, 'arrow') as Phaser.Physics.Arcade.Sprite;
arrow.setVelocity(dirX * speed, dirY * speed);

// Check collision in update
const dist = Phaser.Math.Distance.Between(
  arrow.x, arrow.y,
  this.player.x, this.player.y
);
if (dist < TILE_SIZE * 0.6) {
  this.damagePlayer(damage, 'arrow');
  arrow.destroy();
}
```

### Wall Collision for Projectiles

If your projectile should stop at walls, add collision in `GameSceneCollisions.ts`:

```typescript
// src/scenes/game/GameSceneCollisions.ts
scene.physics.add.collider(
  hazardSystem.getArrowGroup(),
  entities.wallLayer,
  (arrow) => {
    (arrow as Phaser.Physics.Arcade.Sprite).destroy();
  }
);
```

---

## Damage Application

### Damage Cooldown System

The `HazardSystem` prevents damage spam with a cooldown:

```typescript
private lastDamageTime: number = 0;

private damagePlayer(damage: number, source: string): void {
  // Check player invulnerability (from dodge or damage immunity)
  if (this.player.getIsInvulnerable()) return;

  // Prevent damage spam (100ms cooldown)
  const now = this.scene.time.now;
  if (now - this.lastDamageTime < 100) return;
  this.lastDamageTime = now;

  // Apply damage
  this.player.takeDamage(damage);

  // Emit event for effects/audio
  this.scene.events.emit('hazardDamage', damage, source);
}
```

### Damage Scaling

All hazards scale damage with floor level:

```typescript
// Base damage + floor bonus
const spikeDamage = this.SPIKE_DAMAGE + this.floor;           // +1 per floor
const lavaDamage = this.LAVA_DAMAGE_PER_TICK + Math.floor(this.floor / 2);  // +1 per 2 floors
const arrowDamage = this.ARROW_DAMAGE + this.floor;           // +1 per floor
```

### Per-Hazard Damage Timers

Each hazard instance tracks its own damage cooldown:

```typescript
interface LavaPit {
  sprite: Phaser.GameObjects.Sprite;
  damageTimer: number;  // Per-instance timer
}

// In update:
lava.damageTimer += delta;
if (lava.damageTimer >= 500) {  // 500ms between ticks
  this.damagePlayer(damage, 'lava');
  lava.damageTimer = 0;
}
```

---

## Visual Effects

### Sprite Effects

```typescript
// Enable lighting pipeline
sprite.setPipeline('Light2D');

// Set transparency
sprite.setAlpha(0.7);

// Set depth (layering)
sprite.setDepth(1);  // 1 = floor level, 8 = projectiles
```

### Tween Animations

**Pulsing Effect (Lava):**
```typescript
this.scene.tweens.add({
  targets: sprite,
  scaleX: 1.05,
  scaleY: 0.95,
  duration: 500 + Math.random() * 300,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut',
});
```

**Rotation Effect:**
```typescript
this.scene.tweens.add({
  targets: sprite,
  angle: 360,
  duration: 3000,
  repeat: -1,
  ease: 'Linear',
});
```

### State-Based Texture Swapping

```typescript
// Spike trap toggle
if (trap.isActive) {
  trap.sprite.setTexture('spike_trap_active');
} else {
  trap.sprite.setTexture('spike_trap');
}
```

### Rotation for Directional Hazards

```typescript
// Arrow shooter facing direction
if (direction.x === 1) sprite.setAngle(0);      // Right
else if (direction.x === -1) sprite.setAngle(180);  // Left
else if (direction.y === 1) sprite.setAngle(90);    // Down
else if (direction.y === -1) sprite.setAngle(-90);  // Up
```

### Event-Based Audio/Effects

```typescript
// Emit event for other systems to respond
this.scene.events.emit('hazardActivate', trap.sprite.x, trap.sprite.y);
this.scene.events.emit('hazardDamage', damage, source);
```

---

## Complete Code Example

Here's a complete implementation of a new hazard type: **Freezing Vent** (slows player movement when standing on it).

### 1. Add to HazardType Enum

```typescript
// src/systems/HazardSystem.ts
export enum HazardType {
  SPIKE_TRAP = 'spike_trap',
  LAVA_PIT = 'lava_pit',
  ARROW_SHOOTER = 'arrow_shooter',
  FREEZING_VENT = 'freezing_vent',  // NEW
}
```

### 2. Define Interface

```typescript
interface FreezingVent {
  sprite: Phaser.GameObjects.Sprite;
  isActive: boolean;
  timer: number;
  activeDuration: number;
  inactiveDuration: number;
}
```

### 3. Add to HazardSystem Class

```typescript
export class HazardSystem {
  // ... existing properties ...
  private freezingVents: FreezingVent[] = [];
  private readonly FREEZE_SLOW_MULTIPLIER = 0.4;  // 40% speed

  // In spawnHazardsInRoom():
  spawnHazardsInRoom(room: Room, dungeonData: DungeonData): void {
    // ... existing spawns ...

    // Freezing vents (Sloth world specialty, or floor 5+)
    const isSlothWorld = false; // Set based on world context if needed
    if (isSlothWorld || (Math.random() < hazardChance * 0.3 && this.floor >= 5)) {
      const ventCount = isTrapRoom ? 3 : 1;
      this.spawnFreezingVents(room, ventCount);
    }
  }

  private spawnFreezingVents(room: Room, count: number): void {
    for (let i = 0; i < count; i++) {
      const x = room.x + 2 + Math.floor(Math.random() * (room.width - 4));
      const y = room.y + 2 + Math.floor(Math.random() * (room.height - 4));

      const worldX = x * TILE_SIZE + TILE_SIZE / 2;
      const worldY = y * TILE_SIZE + TILE_SIZE / 2;

      const sprite = this.scene.add.sprite(worldX, worldY, 'freezing_vent');
      sprite.setDepth(1);
      sprite.setPipeline('Light2D');

      // Ice particle effect
      this.scene.tweens.add({
        targets: sprite,
        alpha: { from: 0.6, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });

      this.freezingVents.push({
        sprite,
        isActive: true,
        timer: 0,
        activeDuration: 3000,
        inactiveDuration: 2000,
      });
    }
  }

  private updateFreezingVents(delta: number): void {
    for (const vent of this.freezingVents) {
      vent.timer += delta;

      if (vent.isActive) {
        // Check if player is on the vent
        if (this.isPlayerOnTile(vent.sprite.x, vent.sprite.y)) {
          // Apply slow effect through player's speed modifier
          this.player.applySpeedModifier(this.FREEZE_SLOW_MULTIPLIER);

          // Visual feedback
          this.player.setTint(0x60a5fa);  // Blue tint
        }

        // Toggle to inactive
        if (vent.timer >= vent.activeDuration) {
          vent.isActive = false;
          vent.timer = 0;
          vent.sprite.setAlpha(0.3);
        }
      } else {
        // Toggle to active
        if (vent.timer >= vent.inactiveDuration) {
          vent.isActive = true;
          vent.timer = 0;
          vent.sprite.setAlpha(1);
        }
      }
    }
  }

  update(delta: number): void {
    this.updateSpikeTraps(delta);
    this.updateLavaPits(delta);
    this.updateArrowShooters(delta);
    this.updateArrows();
    this.updateFreezingVents(delta);  // Add this
  }

  destroy(): void {
    // ... existing cleanup ...
    for (const vent of this.freezingVents) {
      vent.sprite.destroy();
    }
  }
}
```

### 4. Create the Asset

```typescript
// src/systems/AssetGenerator.ts - in createHazardAssets()

// Freezing vent (blue/white ice grate)
const freezeGraphics = this.scene.make.graphics({ x: 0, y: 0 });
freezeGraphics.fillStyle(0x1e3a5f);
freezeGraphics.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
// Ice crystals
freezeGraphics.fillStyle(0x60a5fa);
freezeGraphics.fillTriangle(4, 8, 8, 2, 12, 8);
freezeGraphics.fillTriangle(8, 14, 12, 8, 4, 8);
freezeGraphics.fillStyle(0x93c5fd);
freezeGraphics.fillCircle(8, 8, 3);
// Frost border
freezeGraphics.lineStyle(1, 0xbfdbfe);
freezeGraphics.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);
freezeGraphics.generateTexture('freezing_vent', TILE_SIZE, TILE_SIZE);
freezeGraphics.destroy();
```

### 5. Player Speed Modifier Support

Ensure the Player class supports speed modifiers:

```typescript
// src/entities/Player.ts
private speedModifier: number = 1;

applySpeedModifier(modifier: number): void {
  this.speedModifier = Math.min(this.speedModifier, modifier);
}

resetSpeedModifier(): void {
  this.speedModifier = 1;
  this.clearTint();
}

// In movement calculation:
const speed = this.baseSpeed * this.speedModifier;
```

---

## Testing Checklist

Use this checklist when adding a new hazard:

### Asset Verification
- [ ] Texture generates correctly in `AssetGenerator`
- [ ] Texture appears with correct colors and size (TILE_SIZE x TILE_SIZE)
- [ ] Light2D pipeline is applied (`sprite.setPipeline('Light2D')`)

### Spawn Logic
- [ ] Hazard spawns in correct room types
- [ ] Hazard respects floor level requirements
- [ ] Spawn position is inside room bounds (not on walls)
- [ ] Multiple hazards don't overlap excessively
- [ ] Spawn room (room.id === 0) is excluded

### Collision/Detection
- [ ] Player collision is detected correctly
- [ ] Collision radius feels fair (not too large/small)
- [ ] Projectiles (if any) have proper physics

### Damage System
- [ ] Damage values are balanced for floor level
- [ ] Damage cooldown prevents spam
- [ ] Player invulnerability is respected
- [ ] `hazardDamage` event is emitted

### State Management (if timed)
- [ ] Timer increments correctly with delta
- [ ] State transitions work (active/inactive)
- [ ] Visual feedback matches state
- [ ] Initial state is randomized for variety

### Room Integration
- [ ] Hazard respects room state (if applicable)
- [ ] Hazard stops functioning when room is cleared (if applicable)
- [ ] Works correctly with door lock/unlock system

### Visual Effects
- [ ] Animations play smoothly
- [ ] Depth is appropriate (floor hazards at 1, projectiles at 8)
- [ ] Transparency is correct

### Cleanup
- [ ] Sprites are destroyed in `destroy()` method
- [ ] No memory leaks (check browser dev tools)
- [ ] Physics groups are cleared

### Integration Testing
- [ ] Works with all world themes
- [ ] Works on boss floors
- [ ] Works in trap rooms (extra hazards spawn)
- [ ] No console errors during gameplay
- [ ] Performance is acceptable with many hazards

### Edge Cases
- [ ] Player standing on hazard when room activates
- [ ] Hazard spawning at exact room boundaries
- [ ] Multiple hazards affecting player simultaneously
- [ ] Rapid room transitions

---

## Related Documentation

- [Game Design Document](../GAME_DESIGN.md) - Overall game mechanics
- [Scene Lifecycle](../SCENES_LIFECYCLE.md) - How GameScene manages systems
- [Audio/Visual Systems](../AUDIO_VISUAL.md) - Sound effects and visual feedback

## File References

| File | Lines | Purpose |
|------|-------|---------|
| `/src/systems/HazardSystem.ts` | Full file | Main hazard implementation |
| `/src/systems/AssetGenerator.ts` | 531-600 | Hazard texture generation |
| `/src/scenes/GameScene.ts` | 226-228 | HazardSystem creation |
| `/src/scenes/GameScene.ts` | 422 | Hazard spawning on room entry |
| `/src/scenes/GameScene.ts` | 437 | Hazard update in game loop |
