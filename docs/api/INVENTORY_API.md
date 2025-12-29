# Inventory System API Reference

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Phaser 3](https://img.shields.io/badge/Phaser_3-4DC0B5?style=flat&logo=phaser&logoColor=white)

Complete API reference for the inventory, item, and loot systems in the dungeon crawler game.

---

## Table of Contents

- [Item System](#item-system)
  - [ItemType Enum](#itemtype-enum)
  - [ItemRarity Enum](#itemrarity-enum)
  - [Item Interface](#item-interface)
  - [ItemStats Interface](#itemstats-interface)
  - [WeaponData Interface](#weapondata-interface)
  - [Item Factory Functions](#item-factory-functions)
- [InventorySystem Class](#inventorysystem-class)
  - [Constructor](#constructor)
  - [Item Management Methods](#item-management-methods)
  - [Equipment Methods](#equipment-methods)
  - [Stat Calculation Methods](#stat-calculation-methods)
  - [Serialization Methods](#serialization-methods)
- [LootSystem Class](#lootsystem-class)
  - [Loot Generation Methods](#loot-generation-methods)
  - [Rarity Weights](#rarity-weights)
- [Events](#events)
- [Usage Examples](#usage-examples)

---

## Item System

**File:** `src/systems/Item.ts`

### ItemType Enum

Defines the category of an item, determining how it can be used or equipped.

```typescript
enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  ACCESSORY = 'accessory',
  CONSUMABLE = 'consumable',
}
```

| Value | Description |
|-------|-------------|
| `WEAPON` | Equippable in the weapon slot. Provides attack bonuses and determines attack pattern. |
| `ARMOR` | Equippable in the armor slot. Primarily provides defense bonuses. |
| `ACCESSORY` | Equippable in the accessory slot. Provides varied stat bonuses. |
| `CONSUMABLE` | Single-use items (e.g., potions). Cannot be equipped. |

---

### ItemRarity Enum

Defines the rarity tier of an item, affecting its stats and visual appearance.

```typescript
enum ItemRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}
```

| Rarity | Color Code | Stat Multiplier | Bonus Stats |
|--------|------------|-----------------|-------------|
| `COMMON` | `0xaaaaaa` (gray) | 1.0x | 0 |
| `UNCOMMON` | `0x22cc22` (green) | 1.5x | 1 |
| `RARE` | `0x3399ff` (blue) | 2.2x | 2 |
| `EPIC` | `0xaa44ff` (purple) | 3.0x | 3 |
| `LEGENDARY` | `0xffd700` (gold) | 4.0x | 4 |

---

### Item Interface

The core data structure representing any item in the game.

```typescript
interface Item {
  id: string;
  name: string;
  type: ItemType;
  rarity: ItemRarity;
  stats: ItemStats;
  description: string;
  healAmount?: number;
  weaponData?: WeaponData;
}
```

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `string` | Yes | Unique identifier (e.g., `"item_42"`) |
| `name` | `string` | Yes | Display name shown in UI |
| `type` | `ItemType` | Yes | Category determining equip slot or usage |
| `rarity` | `ItemRarity` | Yes | Rarity tier affecting stats and visuals |
| `stats` | `ItemStats` | Yes | Stat bonuses provided when equipped |
| `description` | `string` | Yes | Flavor text shown in tooltips |
| `healAmount` | `number` | No | HP restored when used (consumables only) |
| `weaponData` | `WeaponData` | No | Weapon attack pattern data (weapons only) |

---

### ItemStats Interface

Stat bonuses that an item provides when equipped.

```typescript
interface ItemStats {
  attack?: number;
  defense?: number;
  maxHp?: number;
  speed?: number;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `attack` | `number` | Bonus to base attack damage |
| `defense` | `number` | Damage reduction from incoming attacks |
| `maxHp` | `number` | Increase to maximum health pool |
| `speed` | `number` | Movement speed modifier (can be negative) |

---

### WeaponData Interface

Extended data for weapon items that determines attack behavior.

```typescript
interface WeaponData {
  weaponType: WeaponType;
  rarity: number;
}
```

| Property | Type | Description |
|----------|------|-------------|
| `weaponType` | `WeaponType` | Attack pattern type (`wand`, `sword`, `bow`, `staff`, `daggers`) |
| `rarity` | `number` | Numeric rarity (0-4) for damage calculations |

---

### Item Factory Functions

#### `createItem(templateId: string): Item | null`

Creates an item from a predefined template.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `templateId` | `string` | Key from `ITEM_TEMPLATES` (e.g., `"health_potion"`, `"leather_armor"`) |

**Returns:** `Item | null` - The created item, or `null` if template not found.

**Available Templates:**

| Template ID | Type | Rarity | Description |
|-------------|------|--------|-------------|
| `leather_armor` | ARMOR | COMMON | +2 Defense |
| `chainmail` | ARMOR | UNCOMMON | +5 Defense |
| `plate_armor` | ARMOR | RARE | +8 Defense, -10 Speed |
| `dragon_scale` | ARMOR | EPIC | +12 Defense, +20 Max HP |
| `wooden_ring` | ACCESSORY | COMMON | +10 Max HP |
| `speed_boots` | ACCESSORY | UNCOMMON | +25 Speed |
| `power_amulet` | ACCESSORY | RARE | +5 Attack, +15 Max HP |
| `ring_of_legends` | ACCESSORY | EPIC | +8 ATK, +5 DEF, +25 HP, +15 SPD |
| `health_potion` | CONSUMABLE | COMMON | Heals 30 HP |
| `large_health_potion` | CONSUMABLE | UNCOMMON | Heals 60 HP |

**Example:**

```typescript
import { createItem } from './systems/Item';

const potion = createItem('health_potion');
if (potion) {
  player.inventory.addItem(potion);
}
```

---

#### `generateProceduralItem(floor: number, rarity: ItemRarity): Item`

Generates a random armor or accessory with procedurally determined stats.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `floor` | `number` | Current dungeon floor (affects base stats) |
| `rarity` | `ItemRarity` | Desired rarity tier |

**Returns:** `Item` - A procedurally generated item.

**Example:**

```typescript
import { generateProceduralItem, ItemRarity } from './systems/Item';

const epicItem = generateProceduralItem(5, ItemRarity.EPIC);
// Might generate: "Mystic Cuirass" with DEF +9, Max HP +22
```

---

#### `generateProceduralItemOfType(floor: number, rarity: ItemRarity, type: ItemType): Item`

Generates a procedural item of a specific type.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `floor` | `number` | Current dungeon floor |
| `rarity` | `ItemRarity` | Desired rarity tier |
| `type` | `ItemType` | Specific item type to generate |

**Returns:** `Item` - A procedurally generated item of the specified type.

---

#### `createItemFromWeapon(weapon: Weapon): Item`

Converts a Weapon object into an inventory Item.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `weapon` | `Weapon` | The weapon to convert |

**Returns:** `Item` - An item representation of the weapon.

**Example:**

```typescript
import { Weapon, WeaponType } from './systems/Weapon';
import { createItemFromWeapon } from './systems/Item';

const weapon = new Weapon(WeaponType.SWORD, 2); // Rare sword
const weaponItem = createItemFromWeapon(weapon);
player.inventory.addItem(weaponItem);
```

---

## InventorySystem Class

**File:** `src/systems/InventorySystem.ts`

Manages player inventory storage, equipment slots, and stat calculations.

### Constructor

```typescript
constructor(maxSlots: number = 20)
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `maxSlots` | `number` | `20` | Maximum number of inventory slots |

**Example:**

```typescript
import { InventorySystem } from './systems/InventorySystem';

const inventory = new InventorySystem(30); // 30 slot inventory
```

---

### Item Management Methods

#### `addItem(item: Item): boolean`

Adds an item to the inventory.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `item` | `Item` | The item to add |

**Returns:** `boolean` - `true` if added successfully, `false` if inventory is full.

**Example:**

```typescript
const potion = createItem('health_potion');
if (inventory.addItem(potion)) {
  console.log('Item added!');
} else {
  console.log('Inventory full!');
}
```

---

#### `removeItem(itemId: string): Item | null`

Removes an item from the inventory by ID.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `itemId` | `string` | The unique ID of the item to remove |

**Returns:** `Item | null` - The removed item, or `null` if not found.

**Example:**

```typescript
const removedItem = inventory.removeItem('item_15');
if (removedItem) {
  console.log(`Removed: ${removedItem.name}`);
}
```

---

#### `getItems(): Item[]`

Returns a copy of all items currently in the inventory.

**Returns:** `Item[]` - Array of inventory items (not equipped items).

**Example:**

```typescript
const items = inventory.getItems();
items.forEach(item => console.log(item.name));
```

---

#### `getItemCount(): number`

Returns the current number of items in the inventory.

**Returns:** `number` - Count of items (excluding equipped items).

---

#### `getMaxSlots(): number`

Returns the maximum inventory capacity.

**Returns:** `number` - Maximum number of inventory slots.

---

#### `useConsumable(itemId: string): Item | null`

Removes a consumable item for use. Does not apply effects.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `itemId` | `string` | The ID of the consumable to use |

**Returns:** `Item | null` - The consumed item, or `null` if not found or not consumable.

**Example:**

```typescript
const consumedItem = inventory.useConsumable('item_7');
if (consumedItem && consumedItem.healAmount) {
  player.heal(consumedItem.healAmount);
}
```

---

### Equipment Methods

#### `equipItem(itemId: string): Item | null`

Equips an item from inventory to the appropriate slot.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `itemId` | `string` | The ID of the item to equip |

**Returns:** `Item | null` - Previously equipped item (now in inventory), or `null` if nothing was previously equipped.

**Behavior:**
- Removes item from inventory
- Places in appropriate slot based on `ItemType`
- Returns previously equipped item to inventory
- Consumables cannot be equipped and are returned to inventory

**Example:**

```typescript
const oldWeapon = inventory.equipItem('item_12');
if (oldWeapon) {
  console.log(`Replaced: ${oldWeapon.name}`);
}
player.recalculateStats();
```

---

#### `unequipSlot(slot: 'weapon' | 'armor' | 'accessory'): boolean`

Removes an item from an equipment slot and returns it to inventory.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `slot` | `'weapon' \| 'armor' \| 'accessory'` | The equipment slot to unequip |

**Returns:** `boolean` - `true` if unequipped successfully, `false` if slot was empty or inventory is full.

**Example:**

```typescript
if (inventory.unequipSlot('weapon')) {
  console.log('Weapon unequipped');
  player.recalculateStats();
}
```

---

#### `getEquipment(): Equipment`

Returns a copy of all currently equipped items.

**Returns:**

```typescript
interface Equipment {
  weapon: Item | null;
  armor: Item | null;
  accessory: Item | null;
}
```

**Example:**

```typescript
const equipment = inventory.getEquipment();
if (equipment.weapon) {
  console.log(`Wielding: ${equipment.weapon.name}`);
}
```

---

### Stat Calculation Methods

#### `getEquipmentStats(): InventoryStats`

Calculates total stat bonuses from all equipped items.

**Returns:**

```typescript
interface InventoryStats {
  attack: number;
  defense: number;
  maxHp: number;
  speed: number;
}
```

**Example:**

```typescript
const bonuses = inventory.getEquipmentStats();
console.log(`Total bonus: +${bonuses.attack} ATK, +${bonuses.defense} DEF`);

// Apply to player
player.maxHp = player.baseMaxHp + bonuses.maxHp;
player.attack = player.baseAttack + bonuses.attack;
```

---

### Serialization Methods

#### `serialize(): string`

Serializes the inventory state to a JSON string for saving.

**Returns:** `string` - JSON representation of inventory and equipment.

**Example:**

```typescript
const saveData = inventory.serialize();
localStorage.setItem('inventory', saveData);
```

---

#### `deserialize(data: string): void`

Restores inventory state from a serialized JSON string.

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `data` | `string` | JSON string from `serialize()` |

**Example:**

```typescript
const saveData = localStorage.getItem('inventory');
if (saveData) {
  inventory.deserialize(saveData);
  player.recalculateStats();
}
```

---

## LootSystem Class

**File:** `src/systems/LootSystem.ts`

Handles loot drop generation with floor-based rarity scaling.

### Constructor

```typescript
constructor(dropChance: number = 0.4)
```

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `dropChance` | `number` | `0.4` | Base probability (0-1) that an enemy drops loot |

---

### Loot Generation Methods

#### `shouldDrop(): boolean`

Determines if loot should drop based on drop chance.

**Returns:** `boolean` - `true` if loot should drop.

---

#### `generateLoot(floor: number = 1): Item | null`

Generates a random loot drop with floor-scaled rarity.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `floor` | `number` | `1` | Current dungeon floor |

**Returns:** `Item | null` - Generated item, or `null` if drop check failed.

**Behavior:**
- 40% base chance to drop (modified by constructor)
- 30% chance for potion (70% health, 30% large health)
- 70% chance for procedural equipment

**Example:**

```typescript
const lootSystem = new LootSystem(0.5); // 50% drop rate

const loot = lootSystem.generateLoot(5);
if (loot) {
  lootDropManager.spawnItemDrop(enemy.x, enemy.y, loot);
}
```

---

#### `generateGuaranteedLoot(minRarity: ItemRarity = ItemRarity.COMMON): Item`

Generates a guaranteed item drop with minimum rarity. Used for chests and bosses.

**Parameters:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `minRarity` | `ItemRarity` | `COMMON` | Minimum rarity tier |

**Returns:** `Item` - Always returns a valid item.

**Example:**

```typescript
// Boss drops at least rare loot
const bossLoot = lootSystem.generateGuaranteedLoot(ItemRarity.RARE);
```

---

### Rarity Weights

Base rarity weights (modified by floor):

| Rarity | Base Weight | Per-Floor Bonus |
|--------|-------------|-----------------|
| COMMON | 60% | -2% (min 20%) |
| UNCOMMON | 25% | +0.7% |
| RARE | 12% | +0.7% |
| EPIC | 3% | +0.4% |
| LEGENDARY | 0.5% | +0.2% |

**Floor bonus cap:** 30 (reached at floor 15)

---

## Events

The inventory system emits Phaser events for UI synchronization.

### Emitted by Player

| Event Name | Payload | Description |
|------------|---------|-------------|
| `itemPickup` | `Item` | Fired when player picks up an item |
| `equipmentChanged` | None | Fired when equipment changes |
| `itemUsed` | `Item` | Fired when a consumable is used |

### Emitted by LootDropManager

| Event Name | Payload | Description |
|------------|---------|-------------|
| `itemCollected` | None | Fired when any item is collected |
| `inventoryFull` | None | Fired when pickup fails due to full inventory |
| `goldCollected` | None | Fired when gold is collected |

**Example - Listening to Events:**

```typescript
scene.events.on('itemPickup', (item: Item) => {
  console.log(`Picked up: ${item.name}`);
});

scene.events.on('equipmentChanged', () => {
  player.recalculateStats();
  updateUI();
});

scene.events.on('inventoryFull', () => {
  showMessage('Inventory is full!');
});
```

---

## Usage Examples

### Complete Item Pickup Flow

```typescript
import { Player } from './entities/Player';
import { LootSystem } from './systems/LootSystem';
import { ItemRarity } from './systems/Item';

// In GameScene
const lootSystem = new LootSystem(0.4);

function onEnemyDeath(enemy: Enemy) {
  const loot = lootSystem.generateLoot(this.currentFloor);

  if (loot) {
    lootDropManager.spawnItemDrop(enemy.x, enemy.y, loot);
  }
}

// Collision handler
this.physics.add.overlap(
  player,
  lootDropManager.getGroups().items,
  (_, itemObj) => lootDropManager.handleItemPickup(player, itemObj)
);
```

### Equipping Items with Stat Recalculation

```typescript
// In InventoryUI or similar
function onEquipButtonClick(itemId: string) {
  const previousItem = player.inventory.equipItem(itemId);

  // Recalculate player stats with new equipment
  player.recalculateStats();

  // Emit event for UI updates
  scene.events.emit('equipmentChanged');

  if (previousItem) {
    showMessage(`Replaced ${previousItem.name}`);
  }
}
```

### Using Consumables

```typescript
function onUseButtonClick(itemId: string) {
  const item = player.inventory.getItems().find(i => i.id === itemId);

  if (item?.type !== ItemType.CONSUMABLE) {
    return;
  }

  const consumed = player.inventory.useConsumable(itemId);

  if (consumed?.healAmount) {
    player.heal(consumed.healAmount);
    scene.events.emit('itemUsed', consumed);
    showMessage(`Restored ${consumed.healAmount} HP`);
  }
}
```

### Save/Load Integration

```typescript
// Saving
function saveGame() {
  const saveData = {
    player: player.getSaveData(),
    inventory: player.inventory.serialize(),
    floor: currentFloor,
  };

  localStorage.setItem('save', JSON.stringify(saveData));
}

// Loading
function loadGame() {
  const raw = localStorage.getItem('save');
  if (!raw) return;

  const saveData = JSON.parse(raw);

  player.inventory.deserialize(saveData.inventory);
  player.restoreFromSave(saveData.player);
  player.recalculateStats();
}
```

### Procedural Loot Generation for Boss

```typescript
function onBossDefeated(boss: SinBoss) {
  // Guaranteed epic+ drop
  const guaranteedDrop = lootSystem.generateGuaranteedLoot(ItemRarity.EPIC);
  lootDropManager.spawnItemDrop(boss.x, boss.y, guaranteedDrop);

  // Chance for additional legendary
  if (Math.random() < 0.2) {
    const bonusDrop = lootSystem.generateGuaranteedLoot(ItemRarity.LEGENDARY);
    lootDropManager.spawnItemDrop(boss.x + 20, boss.y, bonusDrop);
  }

  // Gold reward
  lootDropManager.spawnGoldDrop(boss.x, boss.y + 20, 500);
}
```

---

## Related Documentation

- [Combat System](../COMBAT.md) - Attack patterns and damage calculations
- [Items and Loot Design](../ITEMS_AND_LOOT.md) - Game design documentation
- [Progression System](../PROGRESSION.md) - Leveling and stat allocation
