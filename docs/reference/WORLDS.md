# World Reference: The Seven Deadly Sins

Complete reference for all seven sin worlds in the dungeon crawler. Each world has 3 floors, themed enemies, a unique boss, and distinct color palettes.

---

## Table of Contents

1. [Pride - Tower of Pride](#pride---tower-of-pride)
2. [Greed - Vaults of Greed](#greed---vaults-of-greed)
3. [Wrath - Inferno of Wrath](#wrath---inferno-of-wrath)
4. [Sloth - Mire of Sloth](#sloth---mire-of-sloth)
5. [Envy - Shadows of Envy](#envy---shadows-of-envy)
6. [Gluttony - Pits of Gluttony](#gluttony---pits-of-gluttony)
7. [Lust - Gardens of Lust](#lust---gardens-of-lust)
8. [Hazard Types](#hazard-types)
9. [Color Palette Summary](#color-palette-summary)

---

## Pride - Tower of Pride

> *"Where the vain ascend"*

**Description:** Golden spires reaching toward heaven, built by those who thought themselves gods.

### Color Palette

| Element   | Hex Code   | RGB             | Preview |
|-----------|------------|-----------------|---------|
| Primary   | `#FFD700`  | 255, 215, 0     | Gold |
| Secondary | `#F5F5DC`  | 245, 245, 220   | Beige |
| Floor     | `#4A4520`  | 74, 69, 32      | Dark Gold |
| Wall      | `#3D3818`  | 61, 56, 24      | Darker Gold |
| Portal    | `#FFD700`  | 255, 215, 0     | Gold |

### Enemy Roster

| Enemy Type | Role | Spawn Rate |
|------------|------|------------|
| **PrideEnemy** | Primary Sin Enemy | 60% |
| TankEnemy | Heavy Support | 20% |
| RangedEnemy | Ranged Support | 20% |

### Pride Enemy Details

- **HP:** 60 + (floor * 10)
- **Attack:** 8 + (floor * 2)
- **Defense:** 5 + (floor * 2)
- **Speed:** 50 + (floor * 3)
- **XP Value:** 60 + (floor * 12)
- **Special Ability:** Reflects 25% of damage back to attacker
- **Visual:** Golden flash on damage reflection

### Boss: Pride Boss

**Base Stats (Floor 1):**
- HP: 400 + (floor * 40)
- Attack: 20 + (floor * 4)
- Defense: 8 + (floor * 2)
- Speed: 55
- XP Value: 300 + (floor * 50)
- Scale: 2x normal size

**Special Mechanics:**
- **Damage Reflection:** Reflects 50% of incoming damage
- **Mirror Images:** Spawns illusory copies that orbit the boss
  - Phase 2 (60% HP): 2 mirrors
  - Phase 3 (30% HP): 4 mirrors

**Attack Patterns:**
1. **Golden Ring:** Circular projectile burst (10-16 projectiles)
2. **Mirror Beams:** Fires from boss and all mirrors toward player
3. **Prideful Charge:** Lunges at player (280 speed)

**Phase Transitions:**
- Phase 2: Tint changes to Beige (`#F5F5DC`)
- Phase 3: Tint changes to White (`#FFFFFF`)

---

## Greed - Vaults of Greed

> *"Never enough"*

**Description:** Endless treasuries where the avaricious hoard what they can never spend.

### Color Palette

| Element   | Hex Code   | RGB             | Preview |
|-----------|------------|-----------------|---------|
| Primary   | `#22C55E`  | 34, 197, 94     | Green |
| Secondary | `#FFD700`  | 255, 215, 0     | Gold Accents |
| Floor     | `#1A3D1A`  | 26, 61, 26      | Dark Green |
| Wall      | `#152D15`  | 21, 45, 21      | Darker Green |
| Portal    | `#22C55E`  | 34, 197, 94     | Green |

### Enemy Roster

| Enemy Type | Role | Spawn Rate |
|------------|------|------------|
| **GreedEnemy** | Primary Sin Enemy | 60% |
| FastEnemy | Fast Support | 20% |
| BasicEnemy | Fodder | 20% |

### Greed Enemy Details

- **HP:** 25 + (floor * 5)
- **Attack:** 3 + floor
- **Defense:** 0
- **Speed:** 100 + (floor * 8)
- **XP Value:** 35 + (floor * 6)
- **Special Ability:** Steals 5-10 gold on hit; flees when player has no gold
- **Visual:** Gold flash (`#FFD700`) when stealing

### Boss: Greed Boss

**Base Stats (Floor 1):**
- HP: 350 + (floor * 35)
- Attack: 18 + (floor * 3)
- Defense: 4 + floor
- Speed: 75
- XP Value: 300 + (floor * 50)

**Special Mechanics:**
- **Gold Theft:** Steals 15-35 gold on successful attack
- **Speed Increase:** Phase 3 grants 30% speed boost

**Attack Patterns:**
1. **Coin Barrage:** Spread shot toward player (5-9 projectiles)
2. **Gold Pile Trap:** Spawns exploding gold piles (3-5 piles, explode after 1.5s into 8 projectiles each)
3. **Greedy Grab:** Dash toward player at 350 speed

**Phase Transitions:**
- Phase 2: Tint changes to Gold (`#FFD700`)
- Phase 3: Tint changes to Dark Green (`#15803D`), speed +30%

---

## Wrath - Inferno of Wrath

> *"Burn with fury"*

**Description:** Flames of rage consume all reason, leaving only destruction.

### Color Palette

| Element   | Hex Code   | RGB             | Preview |
|-----------|------------|-----------------|---------|
| Primary   | `#DC2626`  | 220, 38, 38     | Red |
| Secondary | `#F97316`  | 249, 115, 22    | Orange |
| Floor     | `#3D1515`  | 61, 21, 21      | Dark Red |
| Wall      | `#2D1010`  | 45, 16, 16      | Darker Red |
| Portal    | `#DC2626`  | 220, 38, 38     | Red |

### Enemy Roster

| Enemy Type | Role | Spawn Rate |
|------------|------|------------|
| **WrathEnemy** | Primary Sin Enemy | 60% |
| FastEnemy | Aggressive Support | 20% |
| TankEnemy | Heavy Support | 20% |

### Wrath Enemy Details

- **HP:** 45 + (floor * 8)
- **Attack:** 10 + (floor * 2)
- **Defense:** 2 + floor
- **Speed:** 80 + (floor * 4)
- **XP Value:** 50 + (floor * 10)
- **Special Ability:** Enrages at 50% HP (attack +50%, speed +20%)
- **Visual:** Orange flash on damage, bright red (`#FF4444`) when enraged with scale pulse

### Boss: Wrath Boss

**Base Stats (Floor 1):**
- HP: 450 + (floor * 45)
- Attack: 25 + (floor * 5)
- Defense: 3 + floor
- Speed: 70
- XP Value: 300 + (floor * 50)

**Special Mechanics:**
- **Permanent Rage:** Attack and speed scale dramatically with phases
  - Phase 2: Attack +30%, Speed +15%
  - Phase 3: Attack +70%, Speed +50%

**Attack Patterns:**
1. **Fire Wave:** Multiple waves of spread projectiles (2-3 waves, 5 projectiles each)
2. **Berserker Charge:** Rapid successive charges (2-3 charges at 400 speed)
3. **Rage Burst:** Explosive ring of fire (12-20 projectiles)

**Phase Transitions:**
- Phase 2: Tint changes to Orange (`#F97316`)
- Phase 3: Tint changes to Amber (`#FBBF24`), rage aura animation

---

## Sloth - Mire of Sloth

> *"Time stands still"*

**Description:** A fog of lethargy where ambition goes to die.

### Color Palette

| Element   | Hex Code   | RGB             | Preview |
|-----------|------------|-----------------|---------|
| Primary   | `#6B7280`  | 107, 114, 128   | Gray |
| Secondary | `#60A5FA`  | 96, 165, 250    | Pale Blue |
| Floor     | `#2A2D33`  | 42, 45, 51      | Dark Gray |
| Wall      | `#1F2227`  | 31, 34, 39      | Darker Gray |
| Portal    | `#9CA3AF`  | 156, 163, 175   | Light Gray |

### Enemy Roster

| Enemy Type | Role | Spawn Rate |
|------------|------|------------|
| **SlothEnemy** | Primary Sin Enemy | 60% |
| TankEnemy | Heavy Support | 20% |
| BasicEnemy | Fodder | 20% |

### Sloth Enemy Details

- **HP:** 80 + (floor * 15)
- **Attack:** 4 + floor
- **Defense:** 4 + floor
- **Speed:** 25 + (floor * 2)
- **XP Value:** 40 + (floor * 8)
- **Special Ability:** Creates slowing aura (3 tile radius, 50% slow)
- **Visual:** Gray aura (`#6B7280` fill, `#9CA3AF` stroke)

### Boss: Sloth Boss

**Base Stats (Floor 1):**
- HP: 500 + (floor * 50)
- Attack: 15 + (floor * 3)
- Defense: 10 + (floor * 2)
- Speed: 30
- XP Value: 300 + (floor * 50)

**Special Mechanics:**
- **Massive Slow Aura:** 6 tile radius, 60-70% slow
- **Paradox Speed:** Phase 3 paradoxically increases speed to 60

**Attack Patterns:**
1. **Time Slow Field:** Expands slow aura to 150% size temporarily
2. **Lethargy Wave:** Slow-moving large projectiles in all directions (10-16 projectiles)
3. **Drowsy Burst:** Targeted slow projectiles in waves (3 waves, 3 projectiles each)

**Phase Transitions:**
- Phase 2: Tint changes to Dark Gray (`#4B5563`)
- Phase 3: Tint changes to Pale Blue (`#60A5FA`), speed increases to 60

---

## Envy - Shadows of Envy

> *"What others have"*

**Description:** Darkness where souls covet what can never be theirs.

### Color Palette

| Element   | Hex Code   | RGB             | Preview |
|-----------|------------|-----------------|---------|
| Primary   | `#16A34A`  | 22, 163, 74     | Dark Green |
| Secondary | `#1F2937`  | 31, 41, 55      | Dark Shadow |
| Floor     | `#1A2D1A`  | 26, 45, 26      | Very Dark Green |
| Wall      | `#0F1F0F`  | 15, 31, 15      | Near-Black Green |
| Portal    | `#22C55E`  | 34, 197, 94     | Bright Green |

### Enemy Roster

| Enemy Type | Role | Spawn Rate |
|------------|------|------------|
| **EnvyEnemy** | Primary Sin Enemy | 60% |
| FastEnemy | Fast Support | 20% |
| RangedEnemy | Ranged Support | 20% |

### Envy Enemy Details

- **HP:** 35 + (floor * 6)
- **Attack:** 5 + floor (copies player attack when first seeing them)
- **Defense:** 1 + floor
- **Speed:** 70 + (floor * 4)
- **XP Value:** 40 + (floor * 8)
- **Special Ability:** Copies player's attack stat on first sight
- **Visual:** Green flash on copy (`#22C55E`), then stays tinted (`#16A34A`)

### Boss: Envy Boss

**Base Stats (Floor 1):**
- HP: 400 + (floor * 40)
- Attack: 16 + (floor * 3)
- Defense: 5 + floor
- Speed: 65
- XP Value: 300 + (floor * 50)

**Special Mechanics:**
- **Stat Copy:** Copies player's attack and defense (takes higher of base or copied)
- **Shadow Clones:** Spawns weaker copies of itself
  - Phase 2: 1 clone
  - Phase 3: 2 additional clones

**Attack Patterns:**
1. **Shadow Bolt:** Spread shot toward player (5-7 projectiles)
2. **Envy Mirror:** Fires projectiles matching player's movement direction
3. **Dark Swarm:** Ring of shadow projectiles (10-14 projectiles)

**Phase Transitions:**
- Phase 2: Tint changes to Dark Green (`#15803D`), spawns 1 shadow clone
- Phase 3: Tint changes to Near-Black (`#0F172A`), spawns 2 more clones

---

## Gluttony - Pits of Gluttony

> *"Consume everything"*

**Description:** An endless feast for those who can never be satisfied.

### Color Palette

| Element   | Hex Code   | RGB             | Preview |
|-----------|------------|-----------------|---------|
| Primary   | `#FBBF24`  | 251, 191, 36    | Amber/Orange |
| Secondary | `#F59E0B`  | 245, 158, 11    | Darker Amber |
| Floor     | `#3D3015`  | 61, 48, 21      | Dark Amber |
| Wall      | `#2D2410`  | 45, 36, 16      | Darker Amber |
| Portal    | `#FBBF24`  | 251, 191, 36    | Amber |

### Enemy Roster

| Enemy Type | Role | Spawn Rate |
|------------|------|------------|
| **GluttonyEnemy** | Primary Sin Enemy | 60% |
| TankEnemy | Heavy Support | 20% |
| BasicEnemy | Fodder | 20% |

### Gluttony Enemy Details

- **HP:** 70 + (floor * 12)
- **Attack:** 8 + (floor * 2)
- **Defense:** 2 + floor
- **Speed:** 35 + (floor * 2)
- **XP Value:** 45 + (floor * 10)
- **Special Ability:** Heals 20% of damage dealt on successful attack
- **Visual:** Green flash (`#22C55E`) when healing

### Boss: Gluttony Boss

**Base Stats (Floor 1):**
- HP: 550 + (floor * 55)
- Attack: 22 + (floor * 4)
- Defense: 6 + floor
- Speed: 45
- XP Value: 300 + (floor * 50)

**Special Mechanics:**
- **Heavy Lifesteal:** Heals 40% of damage dealt
- **Growth:** Grows larger when healing (up to 3x scale)
- **Speed Increase:** Phase 3 grants 20% speed boost

**Attack Patterns:**
1. **Devour Charge:** Wide lunging attack (250 speed, 800ms duration)
2. **Hunger Wave:** Wide spread shot toward player (6-9 projectiles)
3. **Consume Burst:** Large slow projectiles in all directions (8-12 projectiles)

**Phase Transitions:**
- Phase 2: Scale increases to 2.3x, tint changes to Amber (`#F59E0B`)
- Phase 3: Scale increases to 2.6x, tint changes to Dark Amber (`#D97706`), speed +20%

---

## Lust - Gardens of Lust

> *"Desire without end"*

**Description:** Seductive beauty masks the chains that bind the heart.

### Color Palette

| Element   | Hex Code   | RGB             | Preview |
|-----------|------------|-----------------|---------|
| Primary   | `#EC4899`  | 236, 72, 153    | Pink |
| Secondary | `#FCE7F3`  | 252, 231, 243   | Light Pink |
| Floor     | `#3D1530`  | 61, 21, 48      | Dark Magenta |
| Wall      | `#2D1025`  | 45, 16, 37      | Darker Magenta |
| Portal    | `#EC4899`  | 236, 72, 153    | Pink |

### Enemy Roster

| Enemy Type | Role | Spawn Rate |
|------------|------|------------|
| **LustEnemy** | Primary Sin Enemy | 60% |
| FastEnemy | Fast Support | 20% |
| RangedEnemy | Ranged Support | 20% |

### Lust Enemy Details

- **HP:** 25 + (floor * 4)
- **Attack:** 4 + floor
- **Defense:** 0
- **Speed:** 60 + (floor * 3)
- **XP Value:** 35 + (floor * 6)
- **Special Ability:** Pulls player toward itself (5 tile radius, 30 pull strength)
- **Visual:** Pink glow effect (`#EC4899` outer, `#FCE7F3` inner)

### Boss: Lust Boss

**Base Stats (Floor 1):**
- HP: 380 + (floor * 38)
- Attack: 18 + (floor * 3)
- Defense: 4 + floor
- Speed: 70
- XP Value: 300 + (floor * 50)

**Special Mechanics:**
- **Strong Pull Aura:** 7 tile radius, 50 pull strength (75 in Phase 3)
- **Speed Increase:** Phase 3 grants 30% speed boost

**Attack Patterns:**
1. **Seductive Spiral:** Spiral pattern of projectiles (10-16 projectiles over time)
2. **Heart Burst:** Spread shot toward player (5-7 projectiles)
3. **Charm Dash:** Quick dash toward player at 350 speed

**Phase Transitions:**
- Phase 2: Tint changes to Light Pink (`#F472B6`)
- Phase 3: Tint changes to Very Light Pink (`#FCE7F3`), speed +30%, pull strength +50%

---

## Hazard Types

Hazards appear in dungeon rooms based on floor level and room type. Trap rooms have guaranteed hazards with higher quantities.

### Spike Trap

- **Damage:** 10 + floor
- **Behavior:** Cycles between active (spikes up) and inactive (spikes down)
- **Active Duration:** 800-1200ms
- **Inactive Duration:** 1500-2500ms
- **Spawn Conditions:** Any floor, increases with floor level

### Lava Pit

- **Damage:** 5 + (floor / 2) per tick
- **Tick Rate:** Every 500ms while player is in contact
- **Visual:** Bubbling animation
- **Spawn Conditions:** Floor 3+, more common in trap rooms

### Arrow Shooter

- **Damage:** 8 + floor
- **Fire Rate:** 2000-3000ms between shots
- **Projectile Speed:** 200
- **Projectile Lifetime:** 3 seconds
- **Location:** Mounted on walls, fires into room
- **Behavior:** Only fires while room is active (stops when cleared)
- **Spawn Conditions:** Floor 2+

---

## Color Palette Summary

| World | Primary | Secondary | Floor | Wall | Portal |
|-------|---------|-----------|-------|------|--------|
| Pride | `#FFD700` | `#F5F5DC` | `#4A4520` | `#3D3818` | `#FFD700` |
| Greed | `#22C55E` | `#FFD700` | `#1A3D1A` | `#152D15` | `#22C55E` |
| Wrath | `#DC2626` | `#F97316` | `#3D1515` | `#2D1010` | `#DC2626` |
| Sloth | `#6B7280` | `#60A5FA` | `#2A2D33` | `#1F2227` | `#9CA3AF` |
| Envy | `#16A34A` | `#1F2937` | `#1A2D1A` | `#0F1F0F` | `#22C55E` |
| Gluttony | `#FBBF24` | `#F59E0B` | `#3D3015` | `#2D2410` | `#FBBF24` |
| Lust | `#EC4899` | `#FCE7F3` | `#3D1530` | `#2D1025` | `#EC4899` |

---

## Support Enemy Types

These enemies appear across multiple worlds as supporting enemies.

### Fast Enemy (Imp)

- **HP:** 15 + (floor * 3)
- **Attack:** 4 + floor
- **Defense:** 0
- **Speed:** 120 + (floor * 8)
- **XP Value:** 15 + (floor * 3)
- **Behavior:** Charges at player
- **Appears In:** Greed, Wrath, Envy, Lust

### Tank Enemy (Demon Brute)

- **HP:** 50 + (floor * 10)
- **Attack:** 8 + (floor * 2)
- **Defense:** 3 + floor
- **Speed:** 40 + (floor * 2)
- **XP Value:** 35 + (floor * 8)
- **Behavior:** Slow, high damage, high durability
- **Appears In:** Pride, Wrath, Sloth, Gluttony

### Ranged Enemy (Cultist)

- **HP:** 20 + (floor * 4)
- **Attack:** 6 + (floor * 2)
- **Defense:** 1
- **Speed:** 50 + (floor * 3)
- **XP Value:** 30 + (floor * 6)
- **Behavior:** Maintains distance, shoots projectiles (2s cooldown)
- **Preferred Range:** 5 tiles
- **Appears In:** Pride, Envy, Lust

### Basic Enemy

- **Appears In:** Greed, Sloth, Gluttony
- **Behavior:** Standard melee enemy

---

## Hub Portal Positions

Portal locations in the hub world (tile coordinates):

| World | X | Y |
|-------|---|---|
| Pride | 8 | 3 |
| Greed | 16 | 3 |
| Wrath | 20 | 8 |
| Sloth | 4 | 14 |
| Envy | 20 | 14 |
| Gluttony | 12 | 17 |
| Lust | 4 | 8 |
