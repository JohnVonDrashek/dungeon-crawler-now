# Debugging Guide

[![Debug Tools](https://img.shields.io/badge/Debug-F1_Menu-yellow)](.)
[![Multiplayer](https://img.shields.io/badge/Multiplayer-WebRTC-blue)](.)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](.)

A comprehensive guide to debugging Infernal Ascent, covering developer tools, common issues, and diagnostic techniques.

---

## Table of Contents

1. [Debug Menu (F1)](#debug-menu-f1)
2. [Cheat Commands](#cheat-commands)
3. [Common Bugs and Symptoms](#common-bugs-and-symptoms)
4. [Debugging Multiplayer Issues](#debugging-multiplayer-issues)
5. [Performance Profiling](#performance-profiling)
6. [Console Logging Patterns](#console-logging-patterns)
7. [State Inspection Techniques](#state-inspection-techniques)
8. [Troubleshooting Checklist](#troubleshooting-checklist)

---

## Debug Menu (F1)

The debug menu provides developer tools for testing and debugging gameplay mechanics.

### Accessing the Debug Menu

- **Keyboard**: Press `F1` to toggle the debug menu
- **Close**: Press `F1`, `ESC`, or click outside the menu

### Menu Location

The debug menu is implemented in `/src/ui/DebugMenuUI.ts` and is instantiated in `GameScene`.

### Features Overview

| Shortcut | Feature | Description |
|----------|---------|-------------|
| `1` | God Mode | Toggle invulnerability (player takes no damage) |
| `2` | Full Heal | Restore player HP to maximum |
| `3` | Level Up x1 | Grant enough XP to level up once |
| `4` | Level Up x5 | Grant enough XP to level up five times |
| `5` | Add 500 Gold | Add 500 gold to player inventory |
| `6` | Spawn Epic Loot | Create an Epic rarity item near player |
| `7` | Spawn Rare Loot | Create a Rare rarity item near player |
| `8` | Kill All Enemies | Deal 9999 damage to all active enemies |
| `9` | Skip to Next Floor | Trigger exit collision, advance floor |
| `0` | Jump to Boss Floor | Set floor to boss floor and trigger transition |
| `C` | Complete Current World | Mark the current Sin world as completed |
| `A` | Complete All Worlds | Mark all 7 Sin worlds as completed |
| `H` | Return to Hub | Exit dungeon and return to hub scene |

### God Mode Details

When God Mode is enabled:
- Player is marked as invulnerable via `debugMenuUI.getIsDevMode()`
- Player HP is immediately restored to max
- The toggle state persists until disabled or scene restart
- Visual indicator shows `[1] God Mode: ON/OFF` in menu

### Debug Messages

Debug actions display floating messages in the top-left corner:
```
[DEV] God Mode: ON
[DEV] Level Up!
[DEV] Spawned Epic Loot
```

These messages fade out after 1.5 seconds.

---

## Cheat Commands

### In-Game Cheats (via Debug Menu)

All cheats are accessible through the F1 debug menu. They can be triggered by:
1. Clicking the option text
2. Pressing the corresponding number/letter key

### Floor/World Manipulation

```typescript
// Skip to next floor
this.callbacks.handleExitCollision();

// Jump to boss floor (world mode: floor 3, legacy: floor 20)
if (this.currentWorld) {
  this.floor = 2;
  this.scene.registry.set('floor', 2);
} else {
  this.floor = this.FINAL_FLOOR - 1;
  this.scene.registry.set('floor', this.floor);
}

// Complete a specific world
progressionManager.completeWorld(SinWorld.PRIDE);

// Complete all worlds
const allWorlds = [
  SinWorld.PRIDE, SinWorld.GREED, SinWorld.WRATH,
  SinWorld.SLOTH, SinWorld.ENVY, SinWorld.GLUTTONY, SinWorld.LUST
];
allWorlds.forEach(w => progressionManager.completeWorld(w));
```

### Console Commands (Browser DevTools)

Access via browser's Developer Tools (F12 > Console):

```javascript
// Access game scene
const game = window.game; // If exposed globally
const scene = game.scene.getScene('GameScene');

// Access player
const player = scene.player;
player.hp = player.maxHp; // Full heal
player.gold += 1000; // Add gold
player.level = 10; // Set level

// Access progression
const progression = scene.registry.get('progression');
```

---

## Common Bugs and Symptoms

### 1. Player Cannot Move

**Symptoms:**
- WASD/Arrow keys unresponsive
- Player sprite visible but frozen

**Likely Causes:**
- UI overlay is open (Inventory, Level-Up, Settings, Debug Menu)
- Game is paused
- Player is dead
- Input keyboard not initialized

**Diagnosis:**
```typescript
// Check in GameScene.update()
if (this.inventoryUI.getIsVisible()) return;
if (this.levelUpUI.getIsVisible()) return;
if (this.settingsUI.getIsVisible()) return;
if (this.debugMenuUI.getIsVisible()) return;
```

**Solution:**
- Press `ESC` to close any open menus
- Check `player.active` state
- Verify `scene.input.keyboard` is not null

---

### 2. Enemies Not Spawning

**Symptoms:**
- Rooms appear empty
- No enemy health bars visible
- Combat music doesn't trigger

**Likely Causes:**
- Room not activated (player hasn't entered)
- Enemy spawn manager not initialized
- In multiplayer: guest is trying to spawn enemies (only host spawns)

**Diagnosis:**
```typescript
// In GameScene.update()
console.log('[GameScene] Room entry detected:', {
  roomId: enteredRoom.id,
  canActivateRooms,
  isMultiplayer: networkManager.isMultiplayer,
  isHost: networkManager.isHost,
});
```

**Key Check:**
```typescript
const canActivateRooms = !networkManager.isMultiplayer || networkManager.isHost;
if (enteredRoom && canActivateRooms) {
  this.enemySpawnManager.spawnEnemiesInRoom(enteredRoom, this.isBossFloor, exitRoom);
}
```

---

### 3. Save Data Corruption

**Symptoms:**
- Game fails to load saved progress
- Error in console: `Failed to load game`
- Player starts with wrong stats

**Likely Causes:**
- Version mismatch (save format changed)
- localStorage quota exceeded
- Invalid JSON in save data

**Diagnosis:**
```javascript
// In browser console
const saved = localStorage.getItem('dungeon_crawler_save');
console.log(JSON.parse(saved));
```

**Solution:**
```typescript
// SaveSystem.ts handles migration from v1 to v2
if (rawData.version === 1) {
  console.log('Migrating save from v1 to v2...');
  // Migration logic...
}
```

To clear corrupted save:
```javascript
localStorage.removeItem('dungeon_crawler_save');
```

---

### 4. Lighting Not Working

**Symptoms:**
- Dungeon appears completely dark or too bright
- Torches not flickering
- Player torch not visible

**Likely Causes:**
- Light2D pipeline not enabled
- Sprites missing `setPipeline('Light2D')` call
- LightingSystem not initialized

**Diagnosis:**
```typescript
// Check if lighting is enabled
console.log('LightingSystem enabled:', this.lightingSystem.isEnabled());

// Verify sprite has pipeline
sprite.setPipeline('Light2D');
```

**Solution:**
```typescript
// In scene initialization
this.initLighting(this.currentWorld);
this.initLightingEffects(this.dungeon.tiles, TILE_SIZE);
```

---

### 5. Audio Not Playing

**Symptoms:**
- No sound effects
- Music not starting
- Audio works inconsistently

**Likely Causes:**
- Browser autoplay policy blocking audio
- AudioContext suspended
- Volume set to 0

**Diagnosis:**
```javascript
// Check AudioContext state
console.log(audioSystem.audioContext?.state);
```

**Solution:**
```typescript
// AudioSystem handles this automatically
const unlock = () => {
  if (this.audioContext && this.audioContext.state === 'suspended') {
    this.audioContext.resume();
  }
};
document.addEventListener('click', unlock);
document.addEventListener('keydown', unlock);
```

---

### 6. Memory Leaks

**Symptoms:**
- FPS degradation over time
- Browser tab using excessive memory
- Game becomes sluggish after scene transitions

**Likely Causes:**
- Event listeners not cleaned up
- Game objects not destroyed
- Tweens/timers not stopped

**Key Cleanup Points:**
```typescript
// GameScene.shutdown()
shutdown(): void {
  // Clean up UI managers
  this.gameHUD?.destroy();
  this.loreUIManager?.destroy();
  this.debugMenuUI?.close();

  // Clean up multiplayer
  this.hostController?.destroy();
  this.guestController?.destroy();

  // Stop audio
  this.audioSystem?.stopMusic();

  // Clean up event listeners
  cleanupEventHandlers(this, this.eventHandlers);
  cleanupInput(this);

  // Clean up lighting
  this.lightingSystem?.destroy();
}
```

---

## Debugging Multiplayer Issues

### Connection States

The `NetworkManager` tracks connection states:

| State | Description |
|-------|-------------|
| `disconnected` | Not connected to any room |
| `connecting` | Attempting to connect |
| `waiting` | Host waiting for guest to join |
| `connected` | Successfully connected |
| `reconnecting` | Attempting to reconnect after disconnect |

### Console Logging for Multiplayer

Key log prefixes to watch:
```
[NetworkManager] ...     - Core networking events
[GameScene] ...          - Scene-level multiplayer state
[HostController] ...     - Host-side operations
[GuestController] ...    - Guest-side operations
```

### Host-Specific Issues

**Symptom: Guest not receiving enemy updates**

Check:
```typescript
// HostController broadcasts every 50ms
console.log('[HostController] Registered new enemy:', id);

// Verify enemy map is populated
console.log('Enemy ID Map size:', this.enemyIdMap.size);
```

**Symptom: Guest position validation fails**

```typescript
// Position validation logs
console.warn(`[HostController] Position validation failed: ${posValidation.reason}`);
```

Possible reasons:
- Guest moved too fast (teleport detected)
- Network latency causing position jumps

### Guest-Specific Issues

**Symptom: Not seeing host's enemies**

```typescript
// First enemy update log
console.log('[GuestController] First enemy update received:', message.enemies.length, 'enemies');
```

**Symptom: Disconnected from host**

Guest attempts automatic reconnection:
```typescript
console.log(`[NetworkManager] Reconnect attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
```

### Room Synchronization

Rooms are activated only by the host:
```typescript
const canActivateRooms = !networkManager.isMultiplayer || networkManager.isHost;
```

Guest receives room activation via `ROOM_ACTIVATED` message:
```typescript
private handleRoomActivated(message: RoomActivatedMessage): void {
  this.visitedRoomIds.add(message.roomId);
  this.player.setPosition(message.hostX + 20, message.hostY);
}
```

### Message Validation

Invalid messages are logged with reasons:
```typescript
console.warn(`[HostController] Invalid message from ${peerId}: ${msgValidation.reason}`);
console.warn(`[HostController] Damage validation failed from ${peerId}: ${damageValidation.reason}`);
console.warn(`[HostController] Enemy validation failed from ${peerId}: ${enemyValidation.reason}`);
```

---

## Performance Profiling

### Browser DevTools Performance Tab

1. Open DevTools (F12)
2. Go to "Performance" tab
3. Click "Record" button
4. Play the game for 10-30 seconds
5. Click "Stop" and analyze

### Key Metrics to Watch

| Metric | Healthy Range | Issue Indicator |
|--------|---------------|-----------------|
| FPS | 55-60 | < 50 consistently |
| JS Heap | < 100MB | Growing unbounded |
| Paint Time | < 16ms | > 20ms |
| Event Listeners | Stable | Growing over time |

### Phaser-Specific Profiling

```javascript
// In browser console
const scene = game.scene.getScene('GameScene');
console.log('Active tweens:', scene.tweens.getTweens().length);
console.log('Active timers:', scene.time.getEvents().length);
console.log('Enemy count:', scene.enemies.getChildren().length);
```

### Common Performance Issues

**Too Many Lights**
```typescript
// Rim lights are spaced to reduce count
if ((x + y) % config.spacing !== 0) continue;
```

**Excessive Enemy Updates (Multiplayer)**
```typescript
// Host sends updates every 50ms (20 updates/sec)
private readonly ENEMY_UPDATE_INTERVAL_MS = 50;
```

**Unoptimized Particle Effects**
- Check particle emitter limits
- Ensure particles are destroyed after lifetime

---

## Console Logging Patterns

### Log Prefixes by System

| Prefix | Source File | Purpose |
|--------|-------------|---------|
| `[GameScene]` | GameScene.ts | Core game state |
| `[NetworkManager]` | NetworkManager.ts | Connection events |
| `[HostController]` | HostController.ts | Host multiplayer logic |
| `[GuestController]` | GuestController.ts | Guest multiplayer logic |
| `[DEV]` | DebugMenuUI.ts | Debug actions |

### Adding Debug Logs

For temporary debugging:
```typescript
console.log('[DEBUG] Variable state:', { x, y, hp });
console.warn('[DEBUG] Unexpected condition:', condition);
console.error('[DEBUG] Critical failure:', error);
```

For production debugging:
```typescript
// Use conditional logging based on debug flag
if (process.env.NODE_ENV === 'development') {
  console.log('[Debug] ...');
}
```

### Structured Logging Example

```typescript
console.log('[GameScene] Room entry detected:', {
  roomId: enteredRoom.id,
  canActivateRooms,
  isMultiplayer: networkManager.isMultiplayer,
  isHost: networkManager.isHost,
});
```

---

## State Inspection Techniques

### Registry Values

The Phaser registry stores global game state:

```typescript
// Get values
const floor = this.registry.get('floor');
const currentWorld = this.registry.get('currentWorld');
const enemiesKilled = this.registry.get('enemiesKilled');
const itemsCollected = this.registry.get('itemsCollected');

// Set values
this.registry.set('floor', 5);
```

### Player State

```typescript
const player = scene.player;
console.log({
  position: { x: player.x, y: player.y },
  health: { current: player.hp, max: player.maxHp },
  stats: {
    level: player.level,
    xp: player.xp,
    gold: player.gold,
  },
  inventory: player.inventory.getItems(),
  equipment: player.inventory.getEquipment(),
});
```

### Dungeon State

```typescript
const dungeon = scene.dungeon;
console.log({
  dimensions: { width: dungeon.width, height: dungeon.height },
  rooms: dungeon.rooms.length,
  spawnPoint: dungeon.spawnPoint,
  exitPoint: dungeon.exitPoint,
});
```

### Multiplayer State

```typescript
console.log({
  isMultiplayer: networkManager.isMultiplayer,
  isHost: networkManager.isHost,
  isGuest: networkManager.isGuest,
  isConnected: networkManager.isConnected,
  connectionState: networkManager.connectionState,
  roomCode: networkManager.roomCode,
  peerId: networkManager.peerId,
});
```

### Save Data Inspection

```javascript
// In browser console
const saveData = JSON.parse(localStorage.getItem('dungeon_crawler_save'));
console.log('Save version:', saveData.version);
console.log('Player level:', saveData.player.level);
console.log('Worlds completed:', Object.entries(saveData.progression.worldProgress)
  .filter(([_, wp]) => wp.completed)
  .map(([world]) => world)
);
```

---

## Troubleshooting Checklist

### Game Won't Start

- [ ] Check browser console for JavaScript errors
- [ ] Verify all assets loaded in BootScene
- [ ] Check for missing dependencies in package.json
- [ ] Try clearing browser cache and localStorage
- [ ] Verify `npm run dev` is running

### Black Screen

- [ ] Check if scene was started correctly
- [ ] Verify camera bounds are set
- [ ] Check lighting system initialization
- [ ] Look for uncaught exceptions in console

### Controls Not Responding

- [ ] Check if any UI is open (Inventory/Settings/Debug)
- [ ] Verify `scene.input.keyboard` is not null
- [ ] Check if player is active: `player.active`
- [ ] Verify no overlay is blocking input

### Multiplayer Connection Failed

- [ ] Check if host is running and waiting
- [ ] Verify room code is entered correctly (case-insensitive)
- [ ] Check browser WebRTC support
- [ ] Look for CORS or network issues
- [ ] Check console for `[NetworkManager]` errors

### Performance Issues

- [ ] Check enemy count: should be < 50 active
- [ ] Verify tweens are being destroyed
- [ ] Check for memory growth in DevTools
- [ ] Look for excessive event listeners
- [ ] Check particle emitter counts

### Save/Load Issues

- [ ] Check localStorage for `dungeon_crawler_save` key
- [ ] Verify save version matches current version
- [ ] Check for corrupted JSON
- [ ] Try clearing save with `SaveSystem.deleteSave()`

### Audio Issues

- [ ] Click anywhere to unlock AudioContext
- [ ] Check volume settings (Master/Music/SFX)
- [ ] Verify browser supports Web Audio API
- [ ] Check for suspended AudioContext

### Visual Glitches

- [ ] Check sprite depth ordering
- [ ] Verify Light2D pipeline on sprites
- [ ] Check camera follow settings
- [ ] Look for z-fighting between layers

---

## Quick Reference

### Key Files for Debugging

| Issue Type | Primary File | Secondary Files |
|------------|--------------|-----------------|
| Debug Menu | `src/ui/DebugMenuUI.ts` | - |
| Game State | `src/scenes/GameScene.ts` | `src/scenes/BaseScene.ts` |
| Multiplayer | `src/multiplayer/NetworkManager.ts` | `HostController.ts`, `GuestController.ts` |
| Save/Load | `src/systems/SaveSystem.ts` | `ProgressionSystem.ts` |
| Combat | `src/systems/CombatSystem.ts` | `Player.ts`, `Enemy.ts` |
| Lighting | `src/systems/LightingSystem.ts` | - |
| Audio | `src/systems/AudioSystem.ts` | `SettingsManager.ts` |

### Emergency Recovery Commands

```javascript
// In browser console

// Clear all saved data
localStorage.clear();

// Force disconnect multiplayer
networkManager.disconnect();

// Restart current scene
game.scene.getScene('GameScene').scene.restart();

// Go to menu
game.scene.stop('GameScene');
game.scene.start('MenuScene');
```

---

![Repobeats analytics](https://repobeats.axiom.co/api/embed/placeholder.svg "Repobeats analytics image")
