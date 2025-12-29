# API Reference

## CombatSystem

### `calculateDamage(attacker, target): DamageResult`
Calculate damage from one entity to another.

**Parameters:**
- `attacker: Entity` - Entity dealing damage
- `target: Entity` - Entity receiving damage

**Returns:** `{ damage: number, isCritical: boolean, knockbackX: number, knockbackY: number }`

---

## SaveSystem

### `save(progression, playerData, inventory): boolean`
Save game state to localStorage.

### `load(): SaveData | null`
Load saved game or return null if none exists.

### `hasSave(): boolean`
Check if a save exists.

### `deleteSave(): void`
Remove saved game.

---

## ProgressionSystem

### `progressionManager.startWorld(world, floor?): void`
Begin a run in the specified sin world.

### `progressionManager.advanceFloor(): void`
Move to next floor. Completes world if on final floor.

### `progressionManager.completeWorld(world): void`
Mark world as completed.

### `progressionManager.handleDeath(): void`
Record death, clear active run.

---

## NetworkManager

### `networkManager.hostGame(): Promise<string>`
Create a new multiplayer room. Returns room code.

### `networkManager.joinGame(roomCode): Promise<void>`
Join existing room by code.

### `networkManager.disconnect(): void`
Leave current room.

### `networkManager.send(message): void`
Send message to all peers.

### `networkManager.onMessage(callback): void`
Register message handler.

---

## LootSystem

### `generateLoot(floor): Item | null`
Generate random loot based on floor level and drop chance.

### `generateGuaranteedLoot(minRarity): Item`
Generate loot with guaranteed drop and minimum rarity.

---

## InventorySystem

### `addItem(item): boolean`
Add item to inventory. Returns false if full.

### `removeItem(itemId): Item | null`
Remove and return item by ID.

### `equipItem(itemId): Item | null`
Equip item by ID, return previously equipped item.

### `getEquipmentStats(): ItemStats`
Get combined stats from all equipped items.
