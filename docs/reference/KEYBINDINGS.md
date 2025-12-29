# Keybindings Reference

Complete control reference for Infernal Ascent.

---

## Movement Controls

| Key | Action | Context |
|-----|--------|---------|
| `W` | Move Up | Gameplay (not in menus) |
| `A` | Move Left | Gameplay (not in menus) |
| `S` | Move Down | Gameplay (not in menus) |
| `D` | Move Right | Gameplay (not in menus) |
| `Arrow Up` | Move Up | Gameplay (not in menus) |
| `Arrow Left` | Move Left | Gameplay (not in menus) |
| `Arrow Down` | Move Down | Gameplay (not in menus) |
| `Arrow Right` | Move Right | Gameplay (not in menus) |

**Notes:**
- Diagonal movement is supported (press two directions simultaneously)
- Movement speed is normalized when moving diagonally
- Movement is disabled while dodging or when a menu is open

---

## Combat Controls

| Key/Action | Action | Context |
|------------|--------|---------|
| `Left Click` | Attack | Gameplay - targets mouse cursor direction |
| `Space` | Dodge | Gameplay - grants invulnerability frames |

**Dodge Details:**
- Dodge duration: 200ms
- Dodge cooldown: 1000ms (1 second)
- Speed multiplier: 3x current movement speed
- Grants full invulnerability during dodge

**Attack Details:**
- Attack direction follows mouse cursor
- Attack speed depends on equipped weapon
- Damage is calculated from player attack stat + weapon multiplier

---

## UI Controls

### Inventory and Character

| Key | Action | Context |
|-----|--------|---------|
| `E` | Toggle Inventory | Gameplay - opens/closes inventory panel |
| `L` | Toggle Character Stats | Gameplay - opens level up / stat allocation menu |
| `Shift+Click` | Equip/Use Item | Inventory UI - equips equipment or uses consumables |

**Inventory UI:**
- Shows equipped items (Weapon, Armor, Accessory)
- Displays item comparison indicators (up/down arrows)
- Hover over items for detailed tooltips

### Settings and Menus

| Key | Action | Context |
|-----|--------|---------|
| `ESC` | Open Settings / Close Menu | Gameplay / Any open menu |
| `ESC` | Return to Main Menu | Hub Scene (when no menus open) |

**ESC Key Behavior (Priority Order):**
1. If Settings UI is open -> Close Settings
2. If Level Up UI is open -> Close Level Up
3. If Inventory UI is open -> Close Inventory
4. If Debug Menu is open -> Close Debug Menu
5. If no menu is open -> Open Settings UI

---

## Interaction Controls

### Dungeon Interactions

| Key | Action | Context |
|-----|--------|---------|
| `Q` | Interact with Lore | Near lore objects (books, tablets, murals) |
| `Q` | Close Lore Modal | When lore modal is open |
| `R` | Talk to NPC | Near an NPC with indicator |

### Hub Scene Interactions

| Key | Action | Context |
|-----|--------|---------|
| `R` | Interact | Near interactable objects (portals, fountain, shop, NPCs) |
| `E` | Toggle Inventory | Opens inventory panel |
| `Q` | Toggle Settings | Opens settings panel |

**Hub Interactables:**
- **Sin Portals** - Enter world dungeons
- **Healing Fountain** - Restore HP to full
- **Shop NPC** - Open shop interface
- **The Chronicler** - Lore NPC
- **Mysterious Figure** - Story NPC
- **Victory Portal** - Appears when all 7 worlds complete

---

## Dialogue Controls

| Key | Action | Context |
|-----|--------|---------|
| `Space` | Advance / Complete Text | Dialogue box visible |
| `Enter` | Advance / Complete Text | Dialogue box visible |
| `E` | Advance / Complete Text | Dialogue box visible |
| `ESC` | Close Dialogue | Dialogue box visible |

**Notes:**
- If text is still typing, first press completes the text
- If text is complete, press advances to next line
- On final line, advances and triggers dialogue completion

---

## Debug Controls

| Key | Action | Context |
|-----|--------|---------|
| `F1` | Toggle Debug Menu | Any gameplay scene |

### Debug Menu Options

| Key | Action |
|-----|--------|
| `1` | Toggle God Mode (invulnerability) |
| `2` | Full Heal |
| `3` | Level Up x1 |
| `4` | Level Up x5 |
| `5` | Add 500 Gold |
| `6` | Spawn Epic Loot |
| `7` | Spawn Rare Loot |
| `8` | Kill All Enemies |
| `9` | Skip to Next Floor |
| `0` | Jump to Boss Floor |
| `C` | Complete Current World |
| `A` | Complete All 7 Worlds |
| `H` | Return to Hub |
| `ESC` | Close Debug Menu |

**Hub Scene Debug Menu:**
| Key | Action |
|-----|--------|
| `1` | Full Heal |
| `2` | Add 500 Gold |
| `3` | Level Up x5 |
| `4` | Complete Pride World |
| `5` | Complete Greed World |
| `6` | Complete 6 Worlds |
| `7` | Complete All 7 Worlds |
| `8` | Reset All Progress |
| `9` | Save Game |

---

## Menu Navigation

### Main Menu

| Input | Action |
|-------|--------|
| `Mouse Click` | Select menu option |
| `Keyboard` | Enter room code (Join Co-op only) |
| `Backspace` | Delete character in room code input |
| `ESC` | Cancel co-op connection dialog |

### Shop UI

| Key | Action | Context |
|-----|--------|---------|
| `ESC` | Close Shop | Shop panel open |
| `Click` | Purchase Item | On item slot |
| `Hover` | Show Tooltip | On item slot |

### Level Up UI

| Key | Action | Context |
|-----|--------|---------|
| `ESC` | Close Panel | Level up panel open |
| `L` | Toggle Panel | From gameplay |
| `Click` | Allocate Stat Point | On stat button (when points available) |

### Settings UI

| Key | Action | Context |
|-----|--------|---------|
| `ESC` | Close Settings | Settings panel open |
| `Click + Drag` | Adjust Volume Slider | On slider track |

---

## Multiplayer-Specific Controls

### Host-Specific

| Action | Description |
|--------|-------------|
| Enter Portal | Host can enter world portals; guests follow automatically |
| Room Activation | Host triggers enemy spawns when entering new rooms |

### Guest-Specific

| Restriction | Description |
|-------------|-------------|
| Portal Entry | Guests cannot independently enter portals |
| Scene Changes | Guests receive scene change broadcasts from host |

### Co-op Setup (Main Menu)

**Host Co-op:**
1. Click "Host Co-op" button
2. Wait for room code to generate
3. Share 6-character code with partner
4. Wait for "Player connected!" message

**Join Co-op:**
1. Click "Join Co-op" button
2. Enter 6-character room code using keyboard (A-Z, 0-9)
3. Code auto-submits when 6 characters entered
4. Press `Backspace` to correct mistakes
5. Press `ESC` to cancel

---

## Context Summary

| Scene | Primary Controls |
|-------|------------------|
| **Menu Scene** | Mouse click, Keyboard (co-op codes) |
| **Hub Scene** | WASD/Arrows, R (interact), E (inventory), Q (settings), ESC |
| **Game Scene** | WASD/Arrows, Left Click (attack), Space (dodge), E/L/Q/R, ESC |
| **Shop Scene** | Mouse click, ESC |
| **Dialogue** | Space/Enter/E (advance), ESC (close) |
| **Any Debug** | F1 (toggle), 1-9/0/A/C/H (options), ESC (close) |

---

## Quick Reference Card

```
MOVEMENT          COMBAT            UI
---------         ------            --
WASD / Arrows     Left Click: Atk   E: Inventory
                  Space: Dodge      L: Level Up
                                    ESC: Settings/Close

INTERACTION       DEBUG             DIALOGUE
-----------       -----             --------
Q: Lore           F1: Debug Menu    Space/Enter: Next
R: Talk to NPC    1-9: Options      ESC: Close
```
