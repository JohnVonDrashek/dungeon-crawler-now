# Multiplayer Co-op Design

## Overview

Browser-to-browser co-op dungeon crawling using WebRTC peer-to-peer connections. One player hosts locally from their browser, another joins via room code. No server hosting costs.

## Key Decisions

| Aspect | Decision |
|--------|----------|
| Networking | Trystero (P2P via distributed relays - BitTorrent, Nostr, MQTT) |
| Authority | Host owns dungeon/enemies/loot spawns |
| Combat | Each player owns their attacks (no input lag) |
| Movement | Tethered - helper teleports on room change |
| Loot | Shared pool - either player can grab |
| Inventory | Shared - both access host's inventory |
| Stats | Helper = 75% of host's stats |
| Progression | Host's world only - guest progress doesn't persist |
| Death | Spectate until room clear, then respawn |

## Connection Flow

1. Host clicks "Host Co-op" from menu, generating a 6-character room code (e.g., `GREED7`)
2. Behind the scenes: `joinRoom({appId: 'infernal-ascent'}, 'GREED7')` via Trystero
3. Host sees "Waiting for player..." with code displayed
4. Guest clicks "Join Co-op", enters code, joins the same Trystero room
5. Once connected, host's `onPeerJoin` fires, both transition to gameplay

### Initial Sync (on connect)

- Host sends current dungeon layout (room positions, doors, tile data)
- Host sends current room state (enemy positions, loot on ground)
- Host sends player spawn position for guest
- Host sends current inventory and stats for helper scaling

### Disconnect Handling

- Guest disconnects mid-dungeon: Host continues solo
- Host disconnects: Guest gets "Host disconnected" and returns to menu
- Reconnection not supported in v1

## State Synchronization

### Host Owns (Source of Truth)

- Dungeon layout and room progression
- Enemy spawning, AI decisions, and health
- Loot drops (what spawns, where)
- Door unlocks and room transitions
- Game timer / run state
- Inventory contents

### Each Player Owns

- Their own position and movement
- Their own attacks (damage applied locally, broadcast to other player)
- Their own pickup actions (grab loot, broadcast "I took item X")

### Message Types

**Host → Guest:**
```
ROOM_DATA     - Full room layout when entering new room
ENEMY_SPAWN   - New enemy: {id, type, position}
ENEMY_UPDATE  - Enemy state: {id, position, hp, state}
ENEMY_DEATH   - Enemy died: {id, killer, drops}
LOOT_SPAWN    - Loot dropped: {id, type, position}
LOOT_TAKEN    - Someone grabbed loot: {id, playerId}
ROOM_CLEAR    - Room cleared, doors open
PLAYER_DIED   - A player died: {playerId}
PLAYER_REVIVE - Player respawned: {playerId}
INVENTORY_UPDATE - Inventory changed: {items, equipment}
SCENE_CHANGE  - Transition to scene: {sceneName, data}
```

**Both Directions:**
```
PLAYER_POS    - Position update: {x, y, facing, animState}
PLAYER_ATTACK - Attack fired: {type, direction, damage}
PLAYER_HIT    - I hit enemy: {enemyId, damage}
PICKUP        - I grabbed loot: {lootId}
EQUIP_ITEM    - I equipped item: {itemId, slot}
USE_ITEM      - I used consumable: {itemId}
```

### Tick Rates

- Position updates: 15-20/sec (every 50-66ms)
- Enemy batch updates: 15-20/sec
- Attacks/events: Sent immediately
- Hub/non-combat: 5-10/sec

## Code Architecture

### New Files

```
src/
  multiplayer/
    NetworkManager.ts    - Trystero wrapper, connection lifecycle
    SyncMessages.ts      - Message type definitions
    HostController.ts    - Host-specific logic (enemy sync, loot spawns)
    GuestController.ts   - Guest-specific logic (receive state, apply updates)
    PlayerSync.ts        - Position/action broadcasting for both roles
```

### Integration Points

| Existing File | Changes |
|---------------|---------|
| `MenuScene.ts` | Add "Host Co-op" and "Join Co-op" buttons |
| `GameScene.ts` | Check `isHost` flag, run HostController or GuestController |
| `Player.ts` | Broadcast position/attacks via PlayerSync |
| `Enemy.ts` | If guest, don't run AI - just apply received state |
| `LootDropManager.ts` | If host, broadcast drops. If guest, spawn from messages |
| `RoomManager.ts` | If host, broadcast room transitions. If guest, receive and load |
| `InventorySystem.ts` | Sync changes to other player |
| `HubScene.ts` | Position sync, follow host through portals |

### Key Pattern

```typescript
// In Enemy.update()
if (NetworkManager.isHost) {
  this.runAI();           // Host calculates
  this.broadcastState();  // Host sends
} else {
  this.applyNetworkState(); // Guest receives
}
```

### Unchanged Files

- `DungeonGenerator.ts` - Host generates, sends result
- `CombatSystem.ts` - Each player runs their own combat locally
- `SaveSystem.ts` - Only host saves, guest doesn't touch it

## Guest Player Experience

### The Helper Character

- Spawns as a helper tied to host's progression
- Stats are 75% of host's stats (configurable ratio)
- Shares host's inventory - can equip gear, use consumables
- Visual distinction (tint or "P2" indicator)

### Stat Scaling

```typescript
const HELPER_STAT_RATIO = 0.75;

helperStats = {
  maxHp: Math.floor(host.maxHp * HELPER_STAT_RATIO),
  attack: Math.floor(host.attack * HELPER_STAT_RATIO),
  defense: Math.floor(host.defense * HELPER_STAT_RATIO),
  speed: Math.floor(host.speed * HELPER_STAT_RATIO),
}
```

### Shared Inventory

- One inventory, both can access
- Guest can open inventory, equip items, use potions
- If guest uses a potion, it's gone from shared pool
- If guest equips a sword, host can't equip that same sword
- Creates cooperation: "You take the fire staff, I'll use the axe"

### Guest Capabilities

**Can do:**
- Move freely within current room
- Attack enemies (damage applied immediately)
- Pick up loot/gold (goes to shared inventory)
- Open and use shared inventory
- Use consumables from shared pool
- Dodge and use combat mechanics
- Die and spectate

**Cannot do:**
- Trigger room transitions (host controls pacing)
- Save anything (host's world)
- Level up independently (XP goes to host)
- Advance dialogue independently

### Spectate Mode (on death)

- Camera follows host player
- "Waiting for room clear..." overlay
- Auto-respawn at host's position when room clears

## Hub and Shop Behavior

### Hub Scene

- Both players spawn together
- Helper can walk around, interact with NPCs
- Helper sees dialogue but host controls choices
- Host enters dungeon portal, helper teleports along

### Shop Scene

- Both players see shop UI
- Shared gold pool (host's gold)
- Either player can browse and buy
- Purchases from shared gold, items to shared inventory

### Scene Transitions

- Host controls all scene transitions
- Guest receives `SCENE_CHANGE` message, loads matching scene
- Brief "Waiting for host..." if guest loads faster

## Error Handling

### Connection Failures

- Room join timeout (10 sec) → "Could not find room"
- Network interruption mid-game → "Connection lost", return to menu after 5 sec

### Desync Prevention

- Host is authoritative for enemies, loot, rooms
- Periodic full state sync every 30 seconds
- Consistent enemy IDs (host assigns, guest uses same)

### Inventory Conflicts

- Both try to equip same item → First message wins, host priority on race
- UI shows "Already equipped by other player" feedback

### Death Edge Cases

- Both die simultaneously → Both spectate, room resets
- Host dies, guest clears room → Host respawns, room cleared
- Guest dies at room transition → Respawns in new room with host

### Performance

- Cap position updates at 20/sec regardless of frame rate
- Batch enemy updates (one message for all enemies)
- Skip position updates if player hasn't moved

## Not in v1 (Future)

- Reconnection support
- More than 2 players
- Voice chat integration
- Public room browser/matchmaking
- Spectator mode for third parties

## Dependencies

```bash
npm install trystero
```

Trystero: https://github.com/dmotz/trystero
