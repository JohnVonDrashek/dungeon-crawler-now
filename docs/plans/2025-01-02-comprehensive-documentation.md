# Comprehensive Documentation Plan

> **For Claude:** Use superpowers:subagent-driven-development to execute this plan.

**Goal:** Create documentation so comprehensive that anyone can understand the entire game without reading a single line of code.

**Principle:** "Open any folder, read the doc, know what everything does."

---

## Phase 1: Folder-Level README Files (10 READMEs)

Every src/ directory gets a README.md explaining:
- Purpose of the folder
- Every file with description
- How files interact
- Key patterns used
- Example usage

### Task 1.1: src/README.md (Root source overview)
### Task 1.2: src/config/README.md (World configuration)
### Task 1.3: src/entities/README.md (Game entities)
### Task 1.4: src/entities/enemies/README.md (Enemy types)
### Task 1.5: src/multiplayer/README.md (Networking)
### Task 1.6: src/scenes/README.md (Game scenes)
### Task 1.7: src/scenes/game/README.md (GameScene modules)
### Task 1.8: src/systems/README.md (Core systems)
### Task 1.9: src/ui/README.md (UI components)
### Task 1.10: src/utils/README.md (Utilities)

---

## Phase 2: Game Design Documentation

### Task 2.1: docs/GAME_DESIGN.md
Complete game design document:
- Game overview and objectives
- The 7 sin worlds (theme, enemies, boss, hazards)
- Progression system (floors, worlds, completion)
- Victory/defeat conditions

### Task 2.2: docs/COMBAT.md
Combat system deep-dive:
- Damage formula with examples
- Critical hit mechanics
- Defense calculation
- Knockback physics
- Enemy AI patterns
- Boss special abilities

### Task 2.3: docs/ITEMS_AND_LOOT.md
Item system documentation:
- Item types (weapon, armor, accessory, consumable)
- Rarity tiers and colors
- Stat bonuses by rarity
- Procedural generation algorithm
- Drop rates by floor
- Equipment slots

### Task 2.4: docs/PROGRESSION.md
Progression system:
- XP and leveling formula
- Stat gains per level
- World unlock progression
- Hub feature unlocks
- Save/load system
- Death and restart mechanics

---

## Phase 3: Technical Deep-Dives

### Task 3.1: docs/DUNGEON_GENERATION.md
Procedural generation:
- Room placement algorithm
- Corridor generation
- Special room types (treasure, trap, shrine, challenge)
- Wang tile system for textures
- Seed-based generation for multiplayer

### Task 3.2: docs/MULTIPLAYER_PROTOCOL.md
Networking deep-dive:
- Trystero/WebRTC architecture
- Host vs Guest responsibilities
- Message types and formats
- State synchronization
- Anti-cheat validation
- Connection/disconnection handling

### Task 3.3: docs/SCENES_LIFECYCLE.md
Scene management:
- Scene flow diagram
- BaseScene contract
- Data passing between scenes
- Event cleanup requirements
- Camera and input setup

### Task 3.4: docs/AUDIO_VISUAL.md
Audio and visual systems:
- Music states (exploration, combat, boss)
- SFX catalog
- Visual effects (damage numbers, screen shake, particles)
- Lighting system with Light2D

---

## Phase 4: Complete API Reference

### Task 4.1: docs/api/COMBAT_API.md
### Task 4.2: docs/api/INVENTORY_API.md
### Task 4.3: docs/api/SAVE_API.md
### Task 4.4: docs/api/PROGRESSION_API.md
### Task 4.5: docs/api/NETWORK_API.md
### Task 4.6: docs/api/DUNGEON_API.md
### Task 4.7: docs/api/ENEMY_API.md
### Task 4.8: docs/api/WEAPON_API.md
### Task 4.9: docs/api/UI_API.md
### Task 4.10: docs/api/LIGHTING_API.md

---

## Phase 5: Developer Guides

### Task 5.1: docs/guides/ADDING_ENEMIES.md
Step-by-step guide with code examples

### Task 5.2: docs/guides/ADDING_WORLDS.md
How to add a new sin world

### Task 5.3: docs/guides/ADDING_ITEMS.md
Creating new item types

### Task 5.4: docs/guides/ADDING_WEAPONS.md
Weapon types and attack patterns

### Task 5.5: docs/guides/ADDING_BOSSES.md
Boss design and implementation

### Task 5.6: docs/guides/ADDING_UI.md
UI component creation

### Task 5.7: docs/guides/ADDING_HAZARDS.md
Environmental hazards

### Task 5.8: docs/guides/DEBUGGING.md
Debug tools and troubleshooting

---

## Phase 6: Reference Tables

### Task 6.1: docs/reference/ENEMIES.md
Complete enemy catalog with stats

### Task 6.2: docs/reference/BOSSES.md
All 7 sin bosses with abilities

### Task 6.3: docs/reference/ITEMS.md
All items with stats

### Task 6.4: docs/reference/WEAPONS.md
Weapon types and stats

### Task 6.5: docs/reference/WORLDS.md
World themes, colors, enemy lists

### Task 6.6: docs/reference/CONSTANTS.md
All game constants

### Task 6.7: docs/reference/KEYBINDINGS.md
Complete control reference

---

## Execution Order

1. Phase 1 first (folder READMEs) - gives context for everything
2. Phase 2 (game design) - explains the "what"
3. Phase 3 (technical) - explains the "how"
4. Phase 4 (API) - explains the "interface"
5. Phase 5 (guides) - explains "how to extend"
6. Phase 6 (reference) - quick lookup tables

**Total: 45 documentation tasks**
