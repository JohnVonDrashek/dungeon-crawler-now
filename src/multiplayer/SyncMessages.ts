// src/multiplayer/SyncMessages.ts

export enum MessageType {
  // Host -> Guest
  ROOM_DATA = 'ROOM_DATA',
  ENEMY_SPAWN = 'ENEMY_SPAWN',
  ENEMY_UPDATE = 'ENEMY_UPDATE',
  ENEMY_DEATH = 'ENEMY_DEATH',
  LOOT_SPAWN = 'LOOT_SPAWN',
  LOOT_TAKEN = 'LOOT_TAKEN',
  ROOM_CLEAR = 'ROOM_CLEAR',
  PLAYER_DIED = 'PLAYER_DIED',
  PLAYER_REVIVE = 'PLAYER_REVIVE',
  INVENTORY_UPDATE = 'INVENTORY_UPDATE',
  SCENE_CHANGE = 'SCENE_CHANGE',
  HOST_STATE = 'HOST_STATE',

  // Both directions
  PLAYER_POS = 'PLAYER_POS',
  PLAYER_ATTACK = 'PLAYER_ATTACK',
  PLAYER_HIT = 'PLAYER_HIT',
  PICKUP = 'PICKUP',
  EQUIP_ITEM = 'EQUIP_ITEM',
  USE_ITEM = 'USE_ITEM',
}

export interface PlayerPosMessage {
  type: MessageType.PLAYER_POS;
  x: number;
  y: number;
  facing: string;
  animState: string;
  isMoving: boolean;
}

export interface PlayerAttackMessage {
  type: MessageType.PLAYER_ATTACK;
  attackType: string;
  direction: string;
  x: number;
  y: number;
  angle?: number;
}

export interface PlayerHitMessage {
  type: MessageType.PLAYER_HIT;
  enemyId: string;
  damage: number;
}

export interface EnemySpawnMessage {
  type: MessageType.ENEMY_SPAWN;
  id: string;
  enemyType: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
}

export interface EnemyUpdateMessage {
  type: MessageType.ENEMY_UPDATE;
  enemies: Array<{
    id: string;
    x: number;
    y: number;
    hp: number;
    state: string;
    facing: string;
  }>;
}

export interface EnemyDeathMessage {
  type: MessageType.ENEMY_DEATH;
  id: string;
  killerPlayerId: string;
}

export interface LootSpawnMessage {
  type: MessageType.LOOT_SPAWN;
  id: string;
  itemData: string; // Serialized item
  x: number;
  y: number;
}

export interface LootTakenMessage {
  type: MessageType.LOOT_TAKEN;
  id: string;
  playerId: string;
}

export interface RoomDataMessage {
  type: MessageType.ROOM_DATA;
  dungeonData: string; // Serialized dungeon
  currentRoomIndex: number;
  hostX: number;
  hostY: number;
}

export interface RoomClearMessage {
  type: MessageType.ROOM_CLEAR;
  roomIndex: number;
}

export interface PlayerDiedMessage {
  type: MessageType.PLAYER_DIED;
  playerId: string;
}

export interface PlayerReviveMessage {
  type: MessageType.PLAYER_REVIVE;
  playerId: string;
  x: number;
  y: number;
}

export interface InventoryUpdateMessage {
  type: MessageType.INVENTORY_UPDATE;
  inventorySerialized: string;
  gold: number;
}

export interface SceneChangeMessage {
  type: MessageType.SCENE_CHANGE;
  sceneName: string;
  data?: Record<string, unknown>;
}

export interface HostStateMessage {
  type: MessageType.HOST_STATE;
  hp: number;
  maxHp: number;
  level: number;
  gold: number;
}

export interface PickupMessage {
  type: MessageType.PICKUP;
  lootId: string;
}

export interface EquipItemMessage {
  type: MessageType.EQUIP_ITEM;
  itemId: string;
  slot: string;
}

export interface UseItemMessage {
  type: MessageType.USE_ITEM;
  itemId: string;
}

export type SyncMessage =
  | PlayerPosMessage
  | PlayerAttackMessage
  | PlayerHitMessage
  | EnemySpawnMessage
  | EnemyUpdateMessage
  | EnemyDeathMessage
  | LootSpawnMessage
  | LootTakenMessage
  | RoomDataMessage
  | RoomClearMessage
  | PlayerDiedMessage
  | PlayerReviveMessage
  | InventoryUpdateMessage
  | SceneChangeMessage
  | HostStateMessage
  | PickupMessage
  | EquipItemMessage
  | UseItemMessage;
