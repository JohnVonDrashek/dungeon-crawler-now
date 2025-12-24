import { MIN_ROOM_SIZE, MAX_ROOM_SIZE } from '../utils/constants';

export interface Room {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

export interface DungeonData {
  tiles: number[][]; // 0 = floor, 1 = wall
  rooms: Room[];
  spawnPoint: { x: number; y: number };
  exitPoint: { x: number; y: number };
}

export class DungeonGenerator {
  private width: number;
  private height: number;
  private tiles: number[][] = [];
  private rooms: Room[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  generate(): DungeonData {
    // Initialize all tiles as walls
    this.tiles = Array(this.height)
      .fill(null)
      .map(() => Array(this.width).fill(1));

    // Generate rooms using BSP
    this.generateRooms();

    // Connect rooms with corridors
    this.connectRooms();

    // Select spawn and exit points
    const spawnRoom = this.rooms[0];
    const exitRoom = this.rooms[this.rooms.length - 1];

    return {
      tiles: this.tiles,
      rooms: this.rooms,
      spawnPoint: { x: spawnRoom.centerX, y: spawnRoom.centerY },
      exitPoint: { x: exitRoom.centerX, y: exitRoom.centerY },
    };
  }

  private generateRooms(): void {
    const numRooms = Math.floor(Math.random() * 5) + 6; // 6-10 rooms

    for (let i = 0; i < numRooms * 50; i++) {
      if (this.rooms.length >= numRooms) break;

      const roomWidth =
        Math.floor(Math.random() * (MAX_ROOM_SIZE - MIN_ROOM_SIZE + 1)) +
        MIN_ROOM_SIZE;
      const roomHeight =
        Math.floor(Math.random() * (MAX_ROOM_SIZE - MIN_ROOM_SIZE + 1)) +
        MIN_ROOM_SIZE;

      const x = Math.floor(Math.random() * (this.width - roomWidth - 2)) + 1;
      const y = Math.floor(Math.random() * (this.height - roomHeight - 2)) + 1;

      const newRoom: Room = {
        x,
        y,
        width: roomWidth,
        height: roomHeight,
        centerX: Math.floor(x + roomWidth / 2),
        centerY: Math.floor(y + roomHeight / 2),
      };

      // Check for overlap with existing rooms
      let overlaps = false;
      for (const room of this.rooms) {
        if (this.roomsOverlap(newRoom, room)) {
          overlaps = true;
          break;
        }
      }

      if (!overlaps) {
        this.carveRoom(newRoom);
        this.rooms.push(newRoom);
      }
    }
  }

  private roomsOverlap(a: Room, b: Room): boolean {
    const padding = 2; // Minimum space between rooms
    return (
      a.x - padding < b.x + b.width &&
      a.x + a.width + padding > b.x &&
      a.y - padding < b.y + b.height &&
      a.y + a.height + padding > b.y
    );
  }

  private carveRoom(room: Room): void {
    for (let y = room.y; y < room.y + room.height; y++) {
      for (let x = room.x; x < room.x + room.width; x++) {
        if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
          this.tiles[y][x] = 0;
        }
      }
    }
  }

  private connectRooms(): void {
    // Connect each room to the next using L-shaped corridors
    for (let i = 1; i < this.rooms.length; i++) {
      const roomA = this.rooms[i - 1];
      const roomB = this.rooms[i];

      // Randomly choose horizontal-first or vertical-first
      if (Math.random() < 0.5) {
        this.carveHorizontalCorridor(roomA.centerX, roomB.centerX, roomA.centerY);
        this.carveVerticalCorridor(roomA.centerY, roomB.centerY, roomB.centerX);
      } else {
        this.carveVerticalCorridor(roomA.centerY, roomB.centerY, roomA.centerX);
        this.carveHorizontalCorridor(roomA.centerX, roomB.centerX, roomB.centerY);
      }
    }
  }

  private carveHorizontalCorridor(x1: number, x2: number, y: number): void {
    const start = Math.min(x1, x2);
    const end = Math.max(x1, x2);

    for (let x = start; x <= end; x++) {
      if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
        this.tiles[y][x] = 0;
        // Make corridor 2 tiles wide for better navigation
        if (y + 1 < this.height) {
          this.tiles[y + 1][x] = 0;
        }
      }
    }
  }

  private carveVerticalCorridor(y1: number, y2: number, x: number): void {
    const start = Math.min(y1, y2);
    const end = Math.max(y1, y2);

    for (let y = start; y <= end; y++) {
      if (y >= 0 && y < this.height && x >= 0 && x < this.width) {
        this.tiles[y][x] = 0;
        // Make corridor 2 tiles wide for better navigation
        if (x + 1 < this.width) {
          this.tiles[y][x + 1] = 0;
        }
      }
    }
  }

  // Get valid spawn positions for enemies
  getEnemySpawnPositions(count: number, excludeRoom?: Room): { x: number; y: number }[] {
    const positions: { x: number; y: number }[] = [];
    const validRooms = excludeRoom
      ? this.rooms.filter((r) =>
          r.x !== excludeRoom.x ||
          r.y !== excludeRoom.y ||
          r.width !== excludeRoom.width ||
          r.height !== excludeRoom.height
        )
      : this.rooms;

    for (const room of validRooms) {
      const numInRoom = Math.ceil(count / validRooms.length);

      for (let i = 0; i < numInRoom && positions.length < count; i++) {
        const x = room.x + Math.floor(Math.random() * room.width);
        const y = room.y + Math.floor(Math.random() * room.height);
        positions.push({ x, y });
      }
    }

    return positions;
  }
}
