# Game Constants Reference

Complete reference for all game constants organized by category.

---

## Core Constants

Constants from `src/utils/constants.ts`:

| Constant | Value | Description |
|----------|-------|-------------|
| `TILE_SIZE` | `32` | Size of each tile in pixels |
| `GAME_WIDTH` | `800` | Game viewport width in pixels |
| `GAME_HEIGHT` | `600` | Game viewport height in pixels |
| `PLAYER_SPEED` | `150` | Base player movement speed (pixels/second) |
| `PLAYER_MAX_HP` | `100` | Base player maximum health |
| `PLAYER_BASE_ATTACK` | `10` | Base player attack damage |
| `PLAYER_BASE_DEFENSE` | `5` | Base player defense value |
| `DUNGEON_WIDTH` | `100` | Dungeon width in tiles |
| `DUNGEON_HEIGHT` | `100` | Dungeon height in tiles |
| `MIN_ROOM_SIZE` | `16` | Minimum room dimension in tiles |
| `MAX_ROOM_SIZE` | `32` | Maximum room dimension in tiles |

---

## Player Stats

### Base Stats

| Stat | Base Value | Level Up Bonus | Stat Point Allocation |
|------|------------|----------------|----------------------|
| Max HP | `100` | `+5` automatic | `+10` per point |
| Attack | `10` | None | `+2` per point |
| Defense | `5` | None | `+1` per point |
| Speed | `150` | None | `+10` per point |

### Combat Modifiers

| Constant | Value | Description |
|----------|-------|-------------|
| `DODGE_COOLDOWN_MS` | `1000` | Cooldown between dodges |
| `DODGE_DURATION_MS` | `200` | Duration of dodge invulnerability |
| `DODGE_SPEED_MULTIPLIER` | `3` | Speed multiplier during dodge |
| Invulnerability Frame | `500ms` | I-frames after taking damage |
| Minimum Speed | `50` | Speed cannot drop below this value |
| Speed Modifier Range | `0.1 - 1.0` | Slowing effects clamp to this range |

### Leveling

| Constant | Value | Description |
|----------|-------|-------------|
| Starting Level | `1` | Initial player level |
| Starting XP | `0` | Initial experience points |
| Base XP to Level | `100` | XP required for level 2 |
| XP Scaling | `1.5x` | Multiplier for each subsequent level |
| Stat Points per Level | `3` | Points awarded on level up |

---

## Combat Values

### Enemy AI Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `CHASE_RANGE` | `TILE_SIZE * 8` (256px) | Distance at which enemies start chasing |
| `ATTACK_RANGE` | `TILE_SIZE * 1.5` (48px) | Distance for melee attacks |
| `RETREAT_HP_PERCENT` | `0.2` (20%) | HP threshold for retreat behavior |
| `ATTACK_COOLDOWN_MS` | `1000` | Time between enemy attacks |

### Ranged Enemy Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `SHOOT_COOLDOWN_MS` | `2000` | Time between ranged attacks |
| `PREFERRED_RANGE` | `TILE_SIZE * 5` (160px) | Ideal distance from player |
| Projectile Speed | `200` | Speed of enemy projectiles |
| Projectile Lifetime | `3000ms` | Duration before projectile despawns |

### Boss Constants

| Constant | Value | Description |
|----------|-------|-------------|
| Base Pattern Cooldown | `2500ms` | Time between attack patterns |
| Phase 3 Pattern Cooldown | `1500ms` | Faster attacks in final phase |
| Phase 2 Threshold | `60%` HP | Triggers phase 2 |
| Phase 3 Threshold | `30%` HP | Triggers final rage phase |

---

## Weapon Stats

### Base Weapon Definitions

| Weapon | Damage | Attack Speed | Projectile Speed | Special |
|--------|--------|--------------|------------------|---------|
| Wand | `1.0x` | `300ms` | `400` | Single shot |
| Sword | `2.0x` | `400ms` | Melee | 90-degree arc, piercing |
| Bow | `1.8x` | `600ms` | `500` | Piercing, 300ms charge |
| Staff | `1.5x` | `800ms` | `250` | AOE explosion (64px radius) |
| Daggers | `0.5x` | `150ms` | `450` | Triple shot, 15-degree spread |

### Rarity Modifiers

| Rarity | Damage Bonus | Drop Weight |
|--------|--------------|-------------|
| Common (0) | `+0%` | Base chance |
| Uncommon (1) | `+15%` | `rarityRoll > 0.40` |
| Rare (2) | `+30%` | `rarityRoll > 0.65` |
| Epic (3) | `+45%` | `rarityRoll > 0.85` |
| Legendary (4) | `+60%` | `rarityRoll > 0.95` |

**Rarity Roll Formula:** `Math.random() + (floor * 0.02)`

---

## Enemy Stats by Type

### Basic Enemies

| Enemy Type | Base HP | Attack | Defense | Speed | XP |
|------------|---------|--------|---------|-------|-----|
| Fast (Imp) | `15 + floor*3` | `4 + floor` | `0` | `120 + floor*8` | `15 + floor*3` |
| Tank (Demon Brute) | `50 + floor*10` | `8 + floor*2` | `3 + floor` | `40 + floor*2` | `35 + floor*8` |
| Ranged (Cultist) | `20 + floor*4` | `6 + floor*2` | `1` | `50 + floor*3` | `30 + floor*6` |
| Boss | `200 + floor*30` | `15 + floor*3` | `5 + floor` | `60 + floor*2` | `200 + floor*50` |

### Seven Deadly Sins Enemies

| Sin Enemy | Base HP | Attack | Defense | Speed | XP | Special |
|-----------|---------|--------|---------|-------|-----|---------|
| Sloth | `80 + floor*15` | `4 + floor` | `4 + floor` | `25 + floor*2` | `40 + floor*8` | 3-tile slow aura (50%) |
| Gluttony | `70 + floor*12` | `8 + floor*2` | `2 + floor` | `35 + floor*2` | `45 + floor*10` | Heals 20% on hit |
| Greed | `25 + floor*5` | `3 + floor` | `0` | `100 + floor*8` | `35 + floor*6` | Steals 5-10 gold |
| Envy | `35 + floor*6` | `5 + floor` | `1 + floor` | `70 + floor*4` | `40 + floor*8` | Copies player attack |
| Wrath | `45 + floor*8` | `10 + floor*2` | `2 + floor` | `80 + floor*4` | `50 + floor*10` | +50% attack/+20% speed at 50% HP |
| Lust | `25 + floor*4` | `4 + floor` | `0` | `60 + floor*3` | `35 + floor*6` | 5-tile pull aura (force: 30) |
| Pride | `60 + floor*10` | `8 + floor*2` | `5 + floor*2` | `50 + floor*3` | `60 + floor*12` | Reflects 25% damage |

### Sin Bosses

| Sin Boss | Base HP | Attack | Defense | Speed | XP |
|----------|---------|--------|---------|-------|-----|
| All Sin Bosses | `300 + floor*50` | `12 + floor*3` | `3 + floor` | `50 + floor*3` | `300 + floor*50` |

---

## Dungeon Generation

### Room Generation

| Constant | Value | Description |
|----------|-------|-------------|
| Room Count | `6-10` | Rooms per dungeon |
| Room Padding | `2` tiles | Minimum space between rooms |
| Corridor Width | `2` tiles | Width of connecting corridors |

### Room Type Distribution

| Room Type | Assignment Chance | Notes |
|-----------|-------------------|-------|
| Spawn | Guaranteed | First room |
| Exit | Guaranteed | Last room |
| Treasure | `60%` if available | One per dungeon |
| Shrine | `60%` if available | One per dungeon |
| Trap | `60%` if available | One per dungeon |
| Challenge | `60%` if available | One per dungeon |
| Normal | Remaining rooms | Default type |

### Enemy Spawning

| Room Type | Enemy Count Formula |
|-----------|---------------------|
| Normal | `min(baseCount + floor/3, 6)` where `baseCount = max(1, roomArea/150)` |
| Challenge | `min(baseCount + floor/2, 8)` where `baseCount = max(2, roomArea/100)` |
| Boss | `1` (single boss) |

---

## UI Constants

### Depth Layers (Z-Order)

| Layer | Depth | Elements |
|-------|-------|----------|
| Floor/Tiles | `0` | Ground tiles, Wang tiles |
| Auras | `1` | Enemy auras, portal glows |
| Decorations | `2-3` | Fountains, markers, chests |
| Doors | `5` | Room door sprites |
| NPCs/Enemies | `5` | NPC sprites, enemy sprites |
| NPC Indicators | `6` | Exclamation marks above NPCs |
| Projectiles | `8` | All projectile sprites |
| Player | `10` | Player sprite |
| Remote Player Name | `11` | Multiplayer name tags |
| Shadow Overlay | `44` | Lighting shadow effect |
| Darkness Overlay | `45` | Room darkness |
| Spawn Indicators | `50` | Enemy spawn warnings |
| Minimap | `100` | Minimap UI |
| Floating Text | `100-150` | Damage numbers, messages |
| Inventory Overlay | `199` | Inventory background |
| UI Panels | `200` | Shop, inventory, level-up panels |
| Tooltips | `251` | Item tooltips |
| Debug Text | `300` | Debug information |
| Debug Menu | `500` | Debug menu UI |
| Reconnect Overlay | `1000` | Multiplayer reconnection |

---

## Multiplayer Constants

### Network Settings

| Constant | Value | Description |
|----------|-------|-------------|
| `APP_ID` | `'infernal-ascent-coop'` | Trystero room identifier |
| Room Code Length | `6` characters | Alphanumeric (no ambiguous chars) |
| Connection Timeout | `15000ms` | Initial connection timeout |
| Reconnect Timeout | `10000ms` | Per-attempt reconnect timeout |
| Max Reconnect Attempts | `5` | Before giving up |
| Reconnect Delay | `2000ms` | Delay between attempts |

### Update Intervals

| Update Type | Interval | Rate |
|-------------|----------|------|
| Enemy Updates | `50ms` | 20/second |
| Host State | `1000ms` | 1/second |

### Validation Limits

| Constant | Value | Description |
|----------|-------|-------------|
| Max Damage | `9999` | Maximum single damage value |
| Position Delta | `1000` | Maximum position change per update |
| Room Code Pattern | `^[A-Z0-9]{4,8}$` | Valid room code regex |

---

## Audio/Visual Constants

### Audio Defaults

| Setting | Default Value | Range |
|---------|---------------|-------|
| Master Volume | `0.7` | `0.0 - 1.0` |
| Music Volume | `0.5` | `0.0 - 1.0` |
| SFX Volume | `0.6` | `0.0 - 1.0` |
| Storage Key | `'dungeon_crawler_settings'` | LocalStorage key |

### Lighting Configuration

| Light Type | Radius | Intensity | Notes |
|------------|--------|-----------|-------|
| Player Torch | `150` | `1.4` | Neutral warm color |
| Wall Torch | `100` | `0.7` | World-specific colors |
| Wall Rim | `40` | `0.15` | Subtle edge highlighting |
| Enemy Glow | `80` | `0.4` | Reddish visibility light |
| NPC Glow | `70` | `0.4` | Type-specific color |

### Torch Flicker

| Constant | Value | Description |
|----------|-------|-------------|
| Flicker Speed | `4` | Animation speed multiplier |
| Flicker Amount | `0.25` | Intensity variation range |
| Light-up Duration | `300ms` | Room torch activation animation |

### World Lighting Palettes

| World | Ambient Color | Torch Colors | Floor Match |
|-------|---------------|--------------|-------------|
| Pride | `0x0f0d08` | Gold variations | `0x4a4520` |
| Greed | `0x080f08` | Green variations | `0x1a3d1a` |
| Wrath | `0x0f0808` | Red/orange variations | `0x3d1515` |
| Sloth | `0x0a0a0c` | Gray/blue variations | `0x2a2d33` |
| Envy | `0x060d06` | Dark green variations | `0x1a2d1a` |
| Gluttony | `0x0d0a06` | Amber variations | `0x3d3015` |
| Lust | `0x0d060a` | Pink variations | `0x3d1530` |
| Hub | `0x0c0a08` | Warm firelight | `0x2a2520` |

---

## Item Rarity Colors

| Rarity | Color Code | Hex Color |
|--------|------------|-----------|
| Common | `0xaaaaaa` | Gray |
| Uncommon | `0x22cc22` | Green |
| Rare | `0x3399ff` | Blue |
| Epic | `0xaa44ff` | Purple |
| Legendary | `0xffd700` | Gold |

### Rarity Stat Multipliers

| Rarity | Damage Multiplier | Bonus Stats |
|--------|-------------------|-------------|
| Common | `1.0x` | `0` extra stats |
| Uncommon | `1.5x` | `1` extra stat |
| Rare | `2.2x` | `2` extra stats |
| Epic | `3.0x` | `3` extra stats |
| Legendary | `4.0x` | `4` extra stats |

---

## World Configuration

### Floors Per World

| Configuration | Value |
|---------------|-------|
| Floors per Sin World | `3` |
| Total Worlds | `7` (7 Deadly Sins) |
| Total Floors | `21` |

### Hub Unlock Progression

| Worlds Completed | Unlock |
|------------------|--------|
| 1 | Shop Tier 2 |
| 3 | Shop Tier 3 |
| 5 | Fountain Upgrade |
| 7 | Victory Portal |

---

## Consumable Items

| Item | Heal Amount | Rarity |
|------|-------------|--------|
| Health Potion | `30` HP | Common |
| Large Health Potion | `60` HP | Uncommon |

---

## Shop Scene Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `ROOM_WIDTH` | `15` tiles | Shop room width |
| `ROOM_HEIGHT` | `12` tiles | Shop room height |

---

## NPC Constants

| Constant | Value | Description |
|----------|-------|-------------|
| Float Animation | `3px` amplitude | Vertical bob height |
| Float Duration | `1500ms` | One cycle duration |
| Indicator Bounce | `y - TILE_SIZE*1.2` to `*1.4` | Exclamation mark range |
| Indicator Pulse Scale | `1.0` to `1.2` | Scale animation range |

---

## Phaser Configuration

From `src/config.ts`:

| Setting | Value | Description |
|---------|-------|-------------|
| Renderer | `Phaser.WEBGL` | Required for lighting |
| Max Lights | `100` | Increased for torch lighting |
| Physics | Arcade | No gravity |
| Pixel Art | `true` | Disable antialiasing |
| Scale Mode | `Phaser.Scale.FIT` | Responsive scaling |
| Background | `#1a1a2e` | Dark purple-blue |

---

## Related Documentation

- [Weapons Reference](./WEAPONS.md) - Detailed weapon mechanics
- [Items Reference](./ITEMS.md) - Item templates and stats
- [Combat System](../COMBAT.md) - Combat mechanics
- [Game Design](../GAME_DESIGN.md) - Design philosophy

---

*Last updated: December 2024*
