# Infernal Ascent - Project Context

## Overview
A Phaser 3 dungeon crawler game with WebRTC-based multiplayer co-op. Players explore seven sin-themed worlds (Pride, Greed, Wrath, Sloth, Envy, Gluttony, Lust).

## Tech Stack
- **Engine**: Phaser 3.90.0
- **Build**: Vite
- **Language**: TypeScript
- **Multiplayer**: Trystero (WebRTC P2P)
- **UI**: phaser3-rex-plugins

## Key Directories
- `src/scenes/` - Game scenes (MenuScene, HubScene, GameScene, etc.)
- `src/entities/` - Player, Enemy, NPC classes
- `src/multiplayer/` - NetworkManager, HostController, GuestController, PlayerSync
- `src/systems/` - Combat, Loot, Lighting, Dungeon generation
- `src/testing/` - TestAPI for Playwright automation
- `public/assets/` - Sprites, tilesets, audio

## Multiplayer Architecture
- **Host**: Authoritative for game state, enemies, loot
- **Guest**: Sends inputs, receives state updates
- **Sync Messages**: PlayerPos, EnemyState, Attack, Damage, etc.
- **Room Codes**: 6-character codes via Trystero P2P

## Testing with Playwright

See `docs/playwright-testing.md` for full guide.

### Quick Reference
```javascript
// TestAPI is available on window in dev mode
window.testAPI.hostGame()              // Host multiplayer
window.testAPI.joinGame('CODE')        // Join via room code
window.testAPI.getMultiplayerState()   // { isConnected, isHost, roomCode }
window.testAPI.startScene('HubScene')  // Direct scene transition
window.testAPI.moveTo(x, y)            // Teleport player
window.testAPI.getPlayerPos()          // Get player coordinates
window.testAPI.getState()              // Full game state
```

### Phaser Canvas Gotchas
- Use `mouse.down()`/`mouse.up()` pattern, not `click()`
- Use `keyboard.press()` per character, not `type()`
- Multiple scenes can be active; TestAPI finds the one with player
- Canvas games need screenshots, not accessibility tree

## Running
```bash
npm run dev     # Start dev server on localhost:3000
npm run build   # Production build
npm test        # Run tests
```

## Debug Logging
- Press `Ctrl+Shift+L` to download multiplayer logs
- Logs show `[HOST]` or `[GUEST]` prefix with timestamps
- Connection states: disconnected -> connecting -> waiting -> connected
