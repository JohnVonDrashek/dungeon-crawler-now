# Infernal Ascent - Game Design Document

![Version](https://img.shields.io/badge/version-1.0-blue)
![Genre](https://img.shields.io/badge/genre-Roguelike%20Dungeon%20Crawler-red)
![Engine](https://img.shields.io/badge/engine-Phaser%203-blueviolet)
![Multiplayer](https://img.shields.io/badge/multiplayer-Co--op%20Supported-green)

> *"Conquer the Seven Sins"*

---

## Table of Contents

1. [Game Overview](#game-overview)
2. [The Seven Deadly Sins Narrative](#the-seven-deadly-sins-narrative)
3. [The 7 Sin Worlds](#the-7-sin-worlds)
4. [Progression System](#progression-system)
5. [Core Gameplay Loop](#core-gameplay-loop)
6. [Combat System](#combat-system)
7. [Enemy Types](#enemy-types)
8. [Items and Equipment](#items-and-equipment)
9. [Environmental Hazards](#environmental-hazards)
10. [NPCs and Lore](#npcs-and-lore)
11. [Game Modes](#game-modes)
12. [Hub World](#hub-world)

---

## Game Overview

### Genre
**Infernal Ascent** is a top-down roguelike dungeon crawler with action-RPG elements, featuring procedurally generated dungeons, permadeath mechanics, and a hub-based world selection system.

### Theme
The game is set in Purgatory - a realm of trials where souls must conquer the Seven Deadly Sins to achieve redemption and ascension. Each sin is represented as a distinct world with its own visual style, enemy types, and boss.

### Core Fantasy
Players take on the role of a pilgrim soul (represented as a Franciscan friar) seeking to purify themselves by defeating the manifestations of sin. The journey is one of perseverance, spiritual combat, and eventual redemption.

### Art Style
- **Pixel Art**: All sprites are pixel art with 8-directional character animations
- **Dynamic Lighting**: Full Light2D pipeline with torches, environmental lighting, and atmospheric effects
- **Wang Tile System**: Seamless procedural tileset transitions for dungeon floors

---

## The Seven Deadly Sins Narrative

### Core Story
The player is a soul trapped in Purgatory, a realm between worlds. Seven towers stand before them, each representing one of the cardinal sins that corrupt humanity. These sins have taken form as powerful guardians - beings who were once souls like the player but surrendered to their darkest impulses.

### The Path to Redemption
- Each sin overcome purifies a fragment of the player's soul
- The cruelty of the trials IS the cure - suffering leads to purification
- Defeating all seven sins unlocks the path to Ascension
- The final reward is release from Purgatory and spiritual transcendence

### Lore Delivery Methods

| Type | Description | Presentation |
|------|-------------|--------------|
| **Tablets** | Long-form lore inscriptions | Modal dialog boxes |
| **Scratches** | Short messages from previous souls | Floating text |
| **Whispers** | Ethereal brief messages | Fading overlay text |
| **NPCs** | Dialogue with lost souls and spirits | Interactive conversations |

---

## The 7 Sin Worlds

Each world consists of **3 floors**, with the final floor containing the Sin Boss.

---

### 1. Tower of Pride

> *"Where the vain ascend"*

**Description**: Golden spires reaching toward heaven, built by those who thought themselves gods.

#### Visual Design
| Element | Color |
|---------|-------|
| Primary Accent | Gold (#FFD700) |
| Secondary Accent | Beige (#F5F5DC) |
| Floor Tiles | Dark Gold (#4A4520) |
| Wall Tiles | Darker Gold (#3D3818) |
| Portal Glow | Gold (#FFD700) |

#### Enemy Type: Pride Enemy
- **Behavior**: High defense, reflects 25% of damage back to attacker
- **Stats**: High HP (60+), High Defense (5+), Moderate Speed
- **Visual**: Golden tint, crowned appearance
- **Special**: Damage reflection causes player to damage themselves when attacking carelessly

#### Boss: Lucifer, the Crowned One (PrideBoss)
- **HP**: 400+ (scales with floor)
- **Mechanics**:
  - **50% Damage Reflection**: Half of all damage dealt returns to the attacker
  - **Mirror Images**: Creates 2-4 illusory copies that orbit and fire projectiles
  - **Golden Ring**: Fires circular wave of golden projectiles
  - **Mirror Beams**: All mirrors and boss fire targeted beams simultaneously
  - **Prideful Charge**: Lunging attack toward player
- **Phase Transitions**:
  - Phase 2 (60% HP): Creates 2 mirror images, tint changes to beige
  - Phase 3 (30% HP): Creates 4 mirror images, becomes pure white

#### Environmental Hazards
- Spike Traps with golden glow
- Lava Pits (floor 3+)
- Arrow Shooters from walls

#### Lore Fragments
- *"I was a king once... ruler of a vast empire. I built monuments to my own glory."*
- *"I never lost a battle. Until I faced an enemy I could not defeat: myself."*

---

### 2. Vaults of Greed

> *"Never enough"*

**Description**: Endless treasuries where the avaricious hoard what they can never spend.

#### Visual Design
| Element | Color |
|---------|-------|
| Primary Accent | Green (#22C55E) |
| Secondary Accent | Gold (#FFD700) |
| Floor Tiles | Dark Green (#1A3D1A) |
| Wall Tiles | Darker Green (#152D15) |
| Portal Glow | Green (#22C55E) |

#### Enemy Type: Greed Enemy
- **Behavior**: Fast, steals gold on hit, flees when player has no gold
- **Stats**: Low HP (25), Low Defense, High Speed (100+)
- **Visual**: Green tint with gold accents
- **Special**: Steals 5-10 gold per successful attack

#### Boss: Mammon, the Hoarder (GreedBoss)
- **HP**: 350+ (scales with floor)
- **Mechanics**:
  - **Gold Theft**: Steals 15-35 gold on successful melee hit
  - **Coin Barrage**: Fires spread of golden projectiles at player
  - **Gold Pile Traps**: Spawns exploding gold piles that detonate after delay
  - **Greedy Grab**: Fast dash toward player to steal gold
- **Phase Transitions**:
  - Phase 2 (60% HP): Tint changes to gold
  - Phase 3 (30% HP): Tint changes to dark green, speed increases by 30%

#### Lore Fragments
- *"Gold... I can still smell it. I traded everything for more. My family, my soul..."*
- *"I counted coins for forty years. Never spent a single one."*

---

### 3. Inferno of Wrath

> *"Burn with fury"*

**Description**: Flames of rage consume all reason, leaving only destruction.

#### Visual Design
| Element | Color |
|---------|-------|
| Primary Accent | Red (#DC2626) |
| Secondary Accent | Orange (#F97316) |
| Floor Tiles | Dark Red (#3D1515) |
| Wall Tiles | Darker Red (#2D1010) |
| Portal Glow | Red (#DC2626) |

#### Enemy Type: Wrath Enemy
- **Behavior**: Aggressive, enrages at 50% HP gaining +50% attack and +20% speed
- **Stats**: High HP (45+), High Attack (10+), Moderate Speed (80)
- **Visual**: Red tint, pulsing when enraged
- **Special**: Enrage mechanic makes them increasingly dangerous as fight continues

#### Boss: Satan, the Burning Fury (WrathBoss)
- **HP**: 450+ (scales with floor)
- **Mechanics**:
  - **Permanent Rage**: Attack and speed increase with each phase
  - **Fire Wave**: Multiple waves of fire projectiles in player direction
  - **Berserker Charge**: 2-3 rapid consecutive charges toward player
  - **Rage Burst**: Explosive ring of fire projectiles in all directions
- **Phase Transitions**:
  - Phase 2 (60% HP): Attack +30%, Speed +15%, tint changes to orange
  - Phase 3 (30% HP): Attack +70%, Speed +50%, tint changes to bright amber, size pulse animation

#### Lore Fragments
- *"Anger was my shield and my sword. I burned villages. Razed kingdoms."*
- *"I killed my own brother in a fit of rage. The burning never stops."*

---

### 4. Mire of Sloth

> *"Time stands still"*

**Description**: A fog of lethargy where ambition goes to die.

#### Visual Design
| Element | Color |
|---------|-------|
| Primary Accent | Gray (#6B7280) |
| Secondary Accent | Pale Blue (#60A5FA) |
| Floor Tiles | Dark Gray (#2A2D33) |
| Wall Tiles | Darker Gray (#1F2227) |
| Portal Glow | Light Gray (#9CA3AF) |

#### Enemy Type: Sloth Enemy
- **Behavior**: Very slow but creates a slowing aura (3-tile radius) that affects player
- **Stats**: Very High HP (80+), High Defense (4+), Very Low Speed (25)
- **Visual**: Gray appearance with visible aura ring
- **Special**: 50% movement slow applied to player within aura

#### Boss: Belphegor, the Eternal Rest (SlothBoss)
- **HP**: 500+ (scales with floor)
- **Mechanics**:
  - **Massive Slow Aura**: 6-tile radius slow field (40-60% movement reduction)
  - **Time Slow Field**: Temporarily expands slow aura to 150% size
  - **Lethargy Wave**: Slow-moving but large projectiles in all directions
  - **Drowsy Burst**: Targeted slow projectiles in triple bursts
- **Phase Transitions**:
  - Phase 2 (60% HP): Tint changes to dark gray
  - Phase 3 (30% HP): Paradoxically becomes faster (speed 60), tint changes to pale blue

#### Lore Fragments
- *"I just... wanted to rest. Days became years. Years became... I do not know."*
- *"There was so much I meant to do... Tomorrow, I always said."*

---

### 5. Shadows of Envy

> *"What others have"*

**Description**: Darkness where souls covet what can never be theirs.

#### Visual Design
| Element | Color |
|---------|-------|
| Primary Accent | Dark Green (#16A34A) |
| Secondary Accent | Dark Shadow (#1F2937) |
| Floor Tiles | Very Dark Green (#1A2D1A) |
| Wall Tiles | Near-Black Green (#0F1F0F) |
| Portal Glow | Green (#22C55E) |

#### Enemy Type: Envy Enemy
- **Behavior**: Copies player's attack stat when first seeing them
- **Stats**: Moderate HP (35+), Variable Attack (copies player), Moderate Speed (70)
- **Visual**: Dark green/shadowy, flashes green when copying
- **Special**: Takes player's attack value, turning player strength against them

#### Boss: Leviathan, the Mirror (EnvyBoss)
- **HP**: 400+ (scales with floor)
- **Mechanics**:
  - **Stat Copy**: Copies player's attack AND defense values
  - **Shadow Clones**: Spawns 1-3 weaker shadow versions of itself
  - **Shadow Bolt**: Spread of dark green projectiles
  - **Envy Mirror**: Fires projectiles matching player's movement direction
  - **Dark Swarm**: Ring of shadow projectiles
- **Phase Transitions**:
  - Phase 2 (60% HP): Spawns 1 shadow clone, tint changes to dark green
  - Phase 3 (30% HP): Spawns 2 more shadow clones, tint becomes near-black

#### Lore Fragments
- *"I wanted what others had. I copied them perfectly. But it was never enough."*
- *"I wore so many masks, I forgot my own face."*

---

### 6. Pits of Gluttony

> *"Consume everything"*

**Description**: An endless feast for those who can never be satisfied.

#### Visual Design
| Element | Color |
|---------|-------|
| Primary Accent | Amber (#FBBF24) |
| Secondary Accent | Darker Amber (#F59E0B) |
| Floor Tiles | Dark Amber (#3D3015) |
| Wall Tiles | Darker Amber (#2D2410) |
| Portal Glow | Amber (#FBBF24) |

#### Enemy Type: Gluttony Enemy
- **Behavior**: Heals 20% of damage dealt to player
- **Stats**: High HP (70+), High Attack (8+), Low Speed (35)
- **Visual**: Large, amber-tinted, green flash on heal
- **Special**: Lifesteal makes prolonged fights difficult

#### Boss: Beelzebub, the Endless Hunger (GluttonyBoss)
- **HP**: 550+ (scales with floor)
- **Mechanics**:
  - **Heavy Lifesteal**: Heals 40% of all damage dealt
  - **Growing Size**: Grows larger when healing (up to 3x scale)
  - **Devour Charge**: Slow but wide charging attack
  - **Hunger Wave**: Wide spread of large projectiles
  - **Consume Burst**: Large slow projectiles in all directions
- **Phase Transitions**:
  - Phase 2 (60% HP): Grows to 2.3x scale, tint changes to orange
  - Phase 3 (30% HP): Grows to 2.6x scale, speed increases 20%, tint darkens

#### Lore Fragments
- *"I ate and ate but was never satisfied. The hunger only grew."*
- *"Feasts every night. Yet I wasted away, never tasting true fulfillment."*

---

### 7. Gardens of Lust

> *"Desire without end"*

**Description**: Seductive beauty masks the chains that bind the heart.

#### Visual Design
| Element | Color |
|---------|-------|
| Primary Accent | Pink (#EC4899) |
| Secondary Accent | Light Pink (#FCE7F3) |
| Floor Tiles | Dark Magenta (#3D1530) |
| Wall Tiles | Darker Magenta (#2D1025) |
| Portal Glow | Pink (#EC4899) |

#### Enemy Type: Lust Enemy
- **Behavior**: Creates magnetic pull effect drawing player toward it
- **Stats**: Low HP (25+), Low Attack (4+), Moderate Speed (60)
- **Visual**: Pink glow, visible pull aura
- **Special**: 5-tile pull radius, strength 30 - makes keeping distance difficult

#### Boss: Asmodeus, the Seducer (LustBoss)
- **HP**: 380+ (scales with floor)
- **Mechanics**:
  - **Strong Pull Effect**: 7-tile radius pull with strength 50+
  - **Seductive Spiral**: Spiral pattern of pink projectiles over time
  - **Heart Burst**: Spread of light pink projectiles at player
  - **Charm Dash**: Quick dash toward player
- **Phase Transitions**:
  - Phase 2 (60% HP): Tint changes to bright pink
  - Phase 3 (30% HP): Tint becomes light pink, speed +30%, pull strength +50%

#### Lore Fragments
- *"I loved too deeply. Too desperately. I destroyed everyone who tried to leave me."*
- *"I could not bear to be alone. I clung to love until it suffocated."*

---

## Progression System

### Floor Structure

```
Each Sin World:
  Floor 1 -> Shop -> Floor 2 -> Shop -> Floor 3 (Boss) -> World Complete
```

- **3 Floors per World**: Each world has exactly 3 floors
- **Boss Floor**: The 3rd floor of each world contains the Sin Boss
- **Shop Between Floors**: After completing a floor, player visits the Wayside Shrine (shop)

### World Unlock Progression

All 7 worlds are available from the start - players choose which sin to tackle first.

| Worlds Completed | Unlocks |
|-----------------|---------|
| 1 | Shop Tier 2 items |
| 3 | Shop Tier 3 items |
| 5 | Fountain Upgrade |
| 7 | Victory Portal (Ascension) |

### Victory Condition

Complete all 7 Sin Worlds (21 total floors) to unlock the **Ascension Portal** in the Hub. Entering the portal triggers the Victory sequence.

### Death Mechanics

- **Permadeath within world**: Death resets current world progress
- **Hub persistence**: Gold, level, and equipment are saved at Hub
- **World completion persists**: Completed worlds remain completed after death

---

## Core Gameplay Loop

### Primary Loop

```
1. Enter World from Hub
   |
   v
2. Enter Floor
   |
   v
3. Explore Dungeon
   - Navigate procedurally generated rooms
   - Reveal minimap
   - Collect loot and gold
   |
   v
4. Combat Encounters
   - Room locks when enemies spawn
   - Defeat all enemies to unlock doors
   - Gain XP from kills
   |
   v
5. Find Exit Portal
   |
   v
6. Shop (Wayside Shrine)
   - Purchase items
   - Heal at fountain
   - Reroll shop inventory
   |
   v
7. Next Floor or Boss
   |
   v
8. Defeat Boss -> Return to Hub
```

### Death Flow

```
Death in Dungeon
      |
      v
Game Over Screen
      |
      v
Hub (with progress saved)
```

### Between-Floor Shop Features

| Feature | Description | Cost |
|---------|-------------|------|
| Guardian (Shop) | Purchase weapons, armor, accessories | Gold varies |
| Holy Water (Fountain) | Heal to full HP | 2 gold per HP healed |
| Prayer (Reroll Crystal) | Regenerate shop inventory | 50g base, +25g each use |
| Ascend Portal | Proceed to next floor | Free |

---

## Combat System

### Player Stats

| Stat | Base Value | Description |
|------|------------|-------------|
| HP | 100 | Health points |
| Attack | 10 | Base damage dealt |
| Defense | 0 | Damage reduction |
| Speed | 150 | Movement speed |

### Controls

| Input | Action |
|-------|--------|
| WASD / Arrows | Move (8 directions) |
| Left Click | Attack |
| Space | Dodge Roll |
| E | Inventory |
| Q | Settings |
| R | Interact |

### Dodge Mechanic
- **Cooldown**: 1 second
- **Duration**: 200ms
- **Speed**: 3x normal movement
- **Invulnerability**: Full invincibility during dodge

### Weapon Types

| Type | Damage | Speed | Range | Pattern |
|------|--------|-------|-------|---------|
| Wand | 1.0x | Fast | Long | Single projectile |
| Sword | 1.5x | Medium | Short | Melee arc |
| Staff | 0.8x | Slow | Medium | Spread projectiles |
| Dagger | 0.7x | Very Fast | Very Short | Quick strikes |
| Bow | 1.2x | Medium | Very Long | Piercing arrows |

---

## Enemy Types

### Common Enemies

| Enemy | HP | Behavior | Special |
|-------|-----|----------|---------|
| Basic Enemy | Low | Standard chase | None |
| Fast Enemy (Imp) | Very Low | High speed charge | Speed |
| Tank Enemy (Demon Brute) | High | Slow but powerful | High defense |
| Ranged Enemy (Cultist) | Low | Keeps distance, shoots | Projectiles |

### Sin Enemies

See individual world sections above for detailed sin enemy descriptions.

### Boss Patterns

All bosses share:
- **3 Phase System**: Changes at 60% and 30% HP
- **Pattern Cooldowns**: Attacks on timer (faster in Phase 3)
- **Visual Indicators**: Tint changes per phase
- **Unique Mechanics**: Each sin has distinct abilities

---

## Items and Equipment

### Equipment Slots

1. Weapon
2. Armor
3. Accessory

### Item Rarities

| Rarity | Color | Stat Bonus |
|--------|-------|------------|
| Common | White | Base |
| Uncommon | Green | +25% |
| Rare | Blue | +50% |
| Epic | Purple | +100% |
| Legendary | Orange | +150% |

### Loot Sources

- Enemy drops
- Chests (room rewards)
- Shop purchases
- Shrine blessings

---

## Environmental Hazards

### Spike Traps
- **Damage**: 10 + floor level
- **Behavior**: Toggles between active/inactive states
- **Active Duration**: 800-1200ms
- **Inactive Duration**: 1500-2500ms

### Lava Pits
- **Damage**: 5 + (floor/2) per tick
- **Tick Rate**: Every 500ms while standing on
- **Visual**: Bubbling animation

### Arrow Shooters
- **Damage**: 8 + floor level
- **Fire Rate**: 2-3 seconds
- **Placement**: Wall-mounted, fires into room
- **Disables**: When room is cleared

### Trap Rooms
Rooms with `RoomType.TRAP` receive:
- 4x base spike traps
- 2x base lava pits
- 4x arrow shooters

---

## NPCs and Lore

### Hub NPCs

| NPC | Location | Role |
|-----|----------|------|
| The Chronicler | Left side of Hub | Explains the 7 sins, game mechanics |
| Mysterious Figure | Right side of Hub | Cryptic hints, foreshadowing |
| Shopkeeper | Top center | Shop access |

### Dungeon NPCs

| Type | Appearance | Purpose |
|------|------------|---------|
| Lost Soul | Gray tint | World-specific lore |
| Warning Spirit | Golden tint | Boss hints and warnings |

### Lore Categories

**Tablets** (Modal Display)
- Long-form inscriptions
- Story revelations
- Game mechanic hints

**Scratches** (Floating Text)
- Short messages from previous souls
- Floor-appropriate content
- Examples: *"Day 47... still descending"*, *"Trust not the golden light"*

**Whispers** (Ethereal)
- Brief ambient messages
- Increase frequency in deeper floors
- Examples: *"Turn back..."*, *"We are waiting..."*, *"Do you remember the sun?"*

---

## Game Modes

### Single Player

Standard experience:
- Solo progression through all 7 worlds
- Full save/load support
- All features available

### Co-op Multiplayer

Peer-to-peer multiplayer using WebRTC:

| Role | Capabilities |
|------|--------------|
| **Host** | Creates room, controls world selection, activates rooms |
| **Guest** | Joins via 6-character code, follows host's scene changes |

#### Multiplayer Features
- Shared dungeon generation (seeded by room code)
- Synced player positions
- Room activation broadcast
- Scene transition synchronization

#### How to Play Co-op
1. **Host**: Click "Host Co-op" from menu, share room code
2. **Guest**: Click "Join Co-op", enter 6-character code
3. Both players start in Hub together
4. Host selects world, both enter together

---

## Hub World

### Layout

25x20 tile central area with:
- 7 World Portals arranged around edges
- Central Healing Fountain
- Shop NPC at top center
- The Chronicler on left side
- Mysterious Figure on right side

### Portal Positions

| World | Position (tiles) |
|-------|-----------------|
| Pride | (8, 3) |
| Greed | (16, 3) |
| Wrath | (20, 8) |
| Sloth | (4, 14) |
| Envy | (20, 14) |
| Gluttony | (12, 17) |
| Lust | (4, 8) |

### Hub Interactions

| Element | Interaction | Effect |
|---------|-------------|--------|
| World Portal | R to enter | Start selected world |
| Healing Fountain | R to use | Full heal (free in Hub) |
| Shop NPC | R to open | Browse/buy items |
| Victory Portal | R to ascend | Victory scene (7/7 worlds) |
| NPCs | R to talk | Dialogue/lore |

### Visual Indicators

- **Completed Worlds**: Green checkmark, golden portal glow
- **Victory Portal**: Appears in center when all 7 complete, golden rotating spiral
- **Progress Counter**: "Worlds Completed: X/7" displayed on HUD

---

## Technical Notes

### Save System

Saves persist:
- Player stats (HP, level, XP, gold)
- Equipment and inventory
- World completion status
- Active run progress (world + floor)
- Hub unlocks

### Procedural Generation

- **Wang Tile System**: Seamless floor/wall transitions
- **Room-based dungeons**: Connected room graph
- **Room Types**: Normal, Treasure, Shrine, Trap

### Performance Considerations

- Lighting system with rim lights and dynamic torches
- Enemy health bars rendered per-enemy
- Minimap with fog of war
- Projectile pooling for boss fights

---

*This document describes the complete game design for Infernal Ascent v1.0*

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
