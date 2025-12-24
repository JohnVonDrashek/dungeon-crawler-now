import Phaser from 'phaser';
import { Room, DungeonData } from './DungeonGenerator';
import { TILE_SIZE } from '../utils/constants';

export enum RoomState {
  UNVISITED = 'unvisited',
  ACTIVE = 'active',
  CLEARED = 'cleared',
}

interface RoomData {
  room: Room;
  state: RoomState;
  doors: Phaser.Physics.Arcade.Sprite[];
  enemyCount: number;
}

export class RoomManager {
  private scene: Phaser.Scene;
  private dungeonData: DungeonData;
  private roomDataMap: Map<number, RoomData> = new Map();
  private currentRoomId: number = -1;
  private doorGroup: Phaser.Physics.Arcade.StaticGroup;
  private darknessOverlay: Phaser.GameObjects.Graphics | null = null;
  private fogOfWar: Phaser.GameObjects.Graphics | null = null;
  private revealedTiles: Set<string> = new Set();

  constructor(scene: Phaser.Scene, dungeonData: DungeonData) {
    this.scene = scene;
    this.dungeonData = dungeonData;
    this.doorGroup = scene.physics.add.staticGroup();

    this.initializeRooms();
    this.createDarknessOverlay();
    this.createFogOfWar();

    // Reveal spawn room (room 0) and its connecting corridors
    this.revealRoom(this.dungeonData.rooms[0]);
  }

  private createDarknessOverlay(): void {
    // Create a large dark overlay that covers the whole dungeon (used when locked in a room)
    this.darknessOverlay = this.scene.add.graphics();
    this.darknessOverlay.setDepth(45); // Below UI, above most game elements
    this.darknessOverlay.setVisible(false);
  }

  private createFogOfWar(): void {
    // Fog of war covers unvisited rooms
    this.fogOfWar = this.scene.add.graphics();
    this.fogOfWar.setDepth(44); // Just below the active room darkness
    this.updateFogOfWar();
  }

  private updateFogOfWar(): void {
    if (!this.fogOfWar) return;

    this.fogOfWar.clear();
    this.fogOfWar.fillStyle(0x000000, 0.5);

    // Draw darkness over all unrevealed floor tiles
    const tiles = this.dungeonData.tiles;
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        // Skip walls
        if (tiles[y][x] === 1) continue;

        // Skip revealed tiles
        const key = `${x},${y}`;
        if (this.revealedTiles.has(key)) continue;

        // Fog this floor tile
        this.fogOfWar.fillRect(
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    }
  }

  private revealRoom(room: Room): void {
    // Reveal all tiles in the room
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        this.revealedTiles.add(`${x},${y}`);
      }
    }

    // Flood-fill to reveal connected corridors
    this.revealConnectedCorridors(room);
    this.updateFogOfWar();
  }

  private revealConnectedCorridors(room: Room): void {
    const tiles = this.dungeonData.tiles;
    const toCheck: { x: number; y: number }[] = [];

    // Start from room edges
    for (let x = room.x; x < room.x + room.width; x++) {
      toCheck.push({ x, y: room.y - 1 }); // Above
      toCheck.push({ x, y: room.y + room.height }); // Below
    }
    for (let y = room.y; y < room.y + room.height; y++) {
      toCheck.push({ x: room.x - 1, y }); // Left
      toCheck.push({ x: room.x + room.width, y }); // Right
    }

    // Flood-fill through corridors (stop at other rooms)
    while (toCheck.length > 0) {
      const pos = toCheck.pop()!;
      const key = `${pos.x},${pos.y}`;

      // Skip if out of bounds, already revealed, or is a wall
      if (pos.y < 0 || pos.y >= tiles.length || pos.x < 0 || pos.x >= tiles[0].length) continue;
      if (this.revealedTiles.has(key)) continue;
      if (tiles[pos.y][pos.x] === 1) continue;

      // Check if this tile is inside an unvisited room - if so, stop
      const inUnvisitedRoom = this.isInUnvisitedRoom(pos.x, pos.y);
      if (inUnvisitedRoom) continue;

      // Reveal this corridor tile
      this.revealedTiles.add(key);

      // Add neighbors to check
      toCheck.push({ x: pos.x - 1, y: pos.y });
      toCheck.push({ x: pos.x + 1, y: pos.y });
      toCheck.push({ x: pos.x, y: pos.y - 1 });
      toCheck.push({ x: pos.x, y: pos.y + 1 });
    }
  }

  private isInUnvisitedRoom(x: number, y: number): boolean {
    for (const roomData of this.roomDataMap.values()) {
      if (roomData.state === RoomState.UNVISITED) {
        const room = roomData.room;
        if (x >= room.x && x < room.x + room.width &&
            y >= room.y && y < room.y + room.height) {
          return true;
        }
      }
    }
    return false;
  }

  private initializeRooms(): void {
    for (const room of this.dungeonData.rooms) {
      const doors: Phaser.Physics.Arcade.Sprite[] = [];

      // Create door sprites for each door position
      for (const doorPos of room.doors) {
        const door = this.doorGroup.create(
          doorPos.x * TILE_SIZE + TILE_SIZE / 2,
          doorPos.y * TILE_SIZE + TILE_SIZE / 2,
          'door'
        ) as Phaser.Physics.Arcade.Sprite;
        door.setDepth(5);
        door.setVisible(false); // Doors start invisible (open)
        door.setActive(false);
        // Disable physics body for open doors
        if (door.body) {
          door.body.enable = false;
        }
        doors.push(door);
      }

      this.roomDataMap.set(room.id, {
        room,
        state: room.id === 0 ? RoomState.CLEARED : RoomState.UNVISITED, // Spawn room starts cleared
        doors,
        enemyCount: 0,
      });
    }
  }

  getDoorGroup(): Phaser.Physics.Arcade.StaticGroup {
    return this.doorGroup;
  }

  // Check which room the player is in
  getRoomAtPosition(x: number, y: number): Room | null {
    const tileX = Math.floor(x / TILE_SIZE);
    const tileY = Math.floor(y / TILE_SIZE);

    for (const room of this.dungeonData.rooms) {
      if (
        tileX >= room.x &&
        tileX < room.x + room.width &&
        tileY >= room.y &&
        tileY < room.y + room.height
      ) {
        return room;
      }
    }
    return null;
  }

  // Check if player is deep enough inside a room to trigger activation
  // Requires player to be at least 1 tile inside from any edge
  private isPlayerDeepInRoom(playerX: number, playerY: number, room: Room): boolean {
    const tileX = Math.floor(playerX / TILE_SIZE);
    const tileY = Math.floor(playerY / TILE_SIZE);
    const margin = 1; // Must be this many tiles inside the room

    return (
      tileX >= room.x + margin &&
      tileX < room.x + room.width - margin &&
      tileY >= room.y + margin &&
      tileY < room.y + room.height - margin
    );
  }

  // Call this each frame with player position
  update(playerX: number, playerY: number): Room | null {
    const room = this.getRoomAtPosition(playerX, playerY);

    if (room && room.id !== this.currentRoomId) {
      const roomData = this.roomDataMap.get(room.id);

      if (roomData && roomData.state === RoomState.UNVISITED) {
        // Only activate if player is deep enough inside the room
        // This prevents the softlock from stepping back immediately
        if (this.isPlayerDeepInRoom(playerX, playerY, room)) {
          this.currentRoomId = room.id;
          return room; // Return room to trigger enemy spawn
        }
        // Player is in room but not deep enough - don't activate yet
        return null;
      }

      this.currentRoomId = room.id;
    }

    return null;
  }

  // Called when enemies are spawned in a room
  activateRoom(roomId: number, enemyCount: number): void {
    const roomData = this.roomDataMap.get(roomId);
    if (!roomData) return;

    roomData.state = RoomState.ACTIVE;
    roomData.enemyCount = enemyCount;

    // Reveal this room and connected corridors
    this.revealRoom(roomData.room);

    // Close all doors
    for (const door of roomData.doors) {
      door.setVisible(true);
      door.setActive(true);
      if (door.body) {
        door.body.enable = true;
      }
    }

    // Show darkness overlay with room cutout
    this.showDarkness(roomData.room);

    // Play door close sound
    this.scene.events.emit('doorsClosed');
  }

  private showDarkness(room: Room): void {
    if (!this.darknessOverlay) return;

    this.darknessOverlay.clear();
    this.darknessOverlay.setVisible(true);
    this.darknessOverlay.fillStyle(0x000000, 0.4);

    // Darken only floor tiles outside the current room
    const tiles = this.dungeonData.tiles;
    for (let y = 0; y < tiles.length; y++) {
      for (let x = 0; x < tiles[y].length; x++) {
        // Skip wall tiles (they're already dark)
        if (tiles[y][x] === 1) continue;

        // Skip tiles inside the current room
        if (x >= room.x && x < room.x + room.width &&
            y >= room.y && y < room.y + room.height) {
          continue;
        }

        // Darken this floor tile
        this.darknessOverlay.fillRect(
          x * TILE_SIZE,
          y * TILE_SIZE,
          TILE_SIZE,
          TILE_SIZE
        );
      }
    }
  }

  private hideDarkness(): void {
    if (this.darknessOverlay) {
      this.darknessOverlay.setVisible(false);
      this.darknessOverlay.clear();
    }
  }

  // Called when an enemy dies - pass actual active enemy count from scene
  onEnemyKilled(activeEnemyCount: number): void {
    const roomData = this.roomDataMap.get(this.currentRoomId);
    if (!roomData || roomData.state !== RoomState.ACTIVE) return;

    // Use actual count from scene, not internal counter
    if (activeEnemyCount <= 0) {
      this.clearRoom(this.currentRoomId);
    }
  }

  private clearRoom(roomId: number): void {
    const roomData = this.roomDataMap.get(roomId);
    if (!roomData) return;

    roomData.state = RoomState.CLEARED;

    // Open all doors
    for (const door of roomData.doors) {
      door.setVisible(false);
      door.setActive(false);
      if (door.body) {
        door.body.enable = false;
      }
    }

    // Hide darkness overlay
    this.hideDarkness();

    // Play door open sound and emit event
    this.scene.events.emit('roomCleared', roomId);
  }

  getRoomState(roomId: number): RoomState | undefined {
    return this.roomDataMap.get(roomId)?.state;
  }

  isRoomActive(): boolean {
    const roomData = this.roomDataMap.get(this.currentRoomId);
    return roomData?.state === RoomState.ACTIVE;
  }
}
