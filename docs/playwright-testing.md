# Playwright MCP Testing Guide for Phaser Games

## Key Learnings

### 1. Canvas Games Need Special Handling

Phaser renders to a `<canvas>` element, so the accessibility tree (`browser_snapshot`) returns empty. Use screenshots instead:

```javascript
// Get visual state - accessibility tree won't help
await mcp__playwright__browser_take_screenshot({ filename: "state.png" });
```

### 2. Click Events Don't Work - Use Pointer Events

Standard clicks via `browser_click` or JavaScript `MouseEvent` don't register with Phaser. Use the **pointer down/up pattern**:

```javascript
// This DOES NOT work:
await page.mouse.click(x, y);

// This WORKS:
await page.mouse.move(x, y);
await page.mouse.down();
await page.waitForTimeout(50);
await page.mouse.up();
```

### 3. Calculate Canvas Coordinates Correctly

The canvas may be offset from the viewport:

```javascript
const canvas = await page.$('canvas');
const box = await canvas.boundingBox();

// Button at 80% down the canvas height, centered:
const x = box.x + box.width / 2;
const y = box.y + box.height * 0.80;
```

### 4. Keyboard Input: Use `press()` Not `type()`

`keyboard.type()` can double letters in Phaser games. Use individual key presses:

```javascript
// This DOES NOT work reliably:
await page.keyboard.type('VF22H3');  // May produce "VVFVFV"

// This WORKS:
const code = 'VF22H3';
for (const char of code) {
  await page.keyboard.press(char);
  await page.waitForTimeout(200);
}
```

### 5. Movement with WASD

Hold keys for continuous movement:

```javascript
await page.keyboard.down('d');  // Start moving right
await page.waitForTimeout(1000);  // Move for 1 second
await page.keyboard.up('d');  // Stop
```

### 6. Use Console Messages for State Verification

Phaser games often log state changes. Check console for verification:

```javascript
// Console shows multiplayer state:
// [HOST] Connection: waiting -> connected
// [GUEST] MSG-OUT -> PLAYER_POS
```

### 7. Wait for Dev Server

Always verify the dev server is ready:

```bash
npm run dev &
sleep 5
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

## Test API (Built-in)

The game exposes `window.testAPI` in development mode for Playwright testing.

### Available Methods

```typescript
interface TestAPIInterface {
  // Teleport player to coordinates
  moveTo(x: number, y: number): void;

  // Get current player position
  getPlayerPos(): { x: number; y: number } | null;

  // Get current scene name
  getCurrentScene(): string;

  // Start a different scene
  startScene(key: string, data?: object): void;

  // Get full game state
  getState(): {
    scene: string;
    player: { x, y, health, maxHealth } | null;
    multiplayer: { isConnected, isHost, roomCode, peerCount } | null;
  };

  // Multiplayer shortcuts
  hostGame(): void;
  joinGame(code: string): void;
  getMultiplayerState(): MultiplayerState | null;

  // Wait for scene to load
  waitForScene(sceneKey: string, timeout?: number): Promise<boolean>;

  // Get base64 screenshot
  screenshot(): string;
}
```

### Usage in Playwright

```javascript
// Teleport player instead of walking
await page.evaluate(() => window.testAPI.moveTo(500, 300));

// Get player position
const pos = await page.evaluate(() => window.testAPI.getPlayerPos());

// Check current scene
const scene = await page.evaluate(() => window.testAPI.getCurrentScene());

// Start multiplayer directly
await page.evaluate(() => window.testAPI.hostGame());
const state = await page.evaluate(() => window.testAPI.getMultiplayerState());
console.log('Room code:', state.roomCode);

// Wait for scene transition
await page.evaluate(() => window.testAPI.waitForScene('HubScene', 5000));

// Get full state
const gameState = await page.evaluate(() => window.testAPI.getState());
```

## Example Test Flow

```javascript
// 1. Navigate and wait for load
await page.goto('http://localhost:3000');
await page.waitForTimeout(2000);

// 2. Click HOST CO-OP button (80% down canvas)
const canvas = await page.$('canvas');
const box = await canvas.boundingBox();
await page.mouse.move(box.x + box.width/2, box.y + box.height * 0.80);
await page.mouse.down();
await page.mouse.up();

// 3. Verify via console
// Look for: [HOST] Room code set to XXXXXX

// 4. Take screenshot to verify visual state
await page.screenshot({ path: 'host-waiting.png' });
```

## Common Issues

| Issue | Solution |
|-------|----------|
| Clicks don't register | Use mouse.down()/up() pattern |
| Letters doubled when typing | Use keyboard.press() per character |
| Can't find UI elements | Use screenshots, not accessibility tree |
| Button coordinates wrong | Get canvas bounding box, calculate relative position |
| Movement too fast/slow | Adjust waitForTimeout duration |
| Multiple scenes active | TestAPI's `getGameScene()` finds the one with player |
| Page hot-reloads | Re-run setup (host/join, startScene) |

## Quick Start Test Flow

```javascript
// 1. Navigate to game
await page.goto('http://localhost:3000');
await page.waitForTimeout(2000);

// 2. Host a game via TestAPI (no clicking needed!)
await page.evaluate(() => window.testAPI.hostGame());
const hostState = await page.evaluate(() => window.testAPI.getMultiplayerState());
console.log('Room code:', hostState.roomCode);

// 3. In second tab - join and start
await page.evaluate(() => window.testAPI.joinGame('ROOMCODE'));
await page.evaluate(() => window.testAPI.startScene('HubScene'));
await page.waitForTimeout(1000);

// 4. Verify player exists
const pos = await page.evaluate(() => window.testAPI.getPlayerPos());
console.log('Player at:', pos);

// 5. Teleport player
await page.evaluate(() => window.testAPI.moveTo(300, 200));

// 6. Get full state
const state = await page.evaluate(() => window.testAPI.getState());
console.log(state);
```

## Files

- `src/testing/TestAPI.ts` - The test API implementation
- `src/vite-env.d.ts` - Vite type definitions for import.meta.env
- `src/main.ts` - Initializes TestAPI on game start
