import Phaser from 'phaser';
import { DungeonData, Room, RoomType } from '../systems/DungeonGenerator';
import { TILE_SIZE } from '../utils/constants';

// Colors for different room types on minimap
const ROOM_COLORS: Record<RoomType, number> = {
  [RoomType.NORMAL]: 0x374151,
  [RoomType.SPAWN]: 0x374151,
  [RoomType.EXIT]: 0x10b981,
  [RoomType.TREASURE]: 0x6b5b1f,
  [RoomType.TRAP]: 0x6b2020,
  [RoomType.SHRINE]: 0x1e4a6b,
  [RoomType.CHALLENGE]: 0x4a1e6b,
};

export class MinimapUI {
  private graphics: Phaser.GameObjects.Graphics;
  private dungeonData: DungeonData;
  private scale: number = 1;
  private padding: number = 10;
  private viewportSize: number = 100;
  private visitedTiles: Set<string> = new Set();
  private visitedRooms: Set<number> = new Set();
  private x: number;
  private y: number;
  private cameraWidth: number;
  private cameraHeight: number;

  // Track special object states
  private openedChests: Set<number> = new Set(); // Room IDs with opened chests
  private usedShrines: Set<number> = new Set(); // Room IDs with used shrines

  constructor(scene: Phaser.Scene, dungeonData: DungeonData) {
    this.dungeonData = dungeonData;

    // Store camera dimensions for calculating visible area
    this.cameraWidth = scene.cameras.main.width;
    this.cameraHeight = scene.cameras.main.height;

    // Position in top-right corner
    this.x = this.cameraWidth - this.viewportSize - this.padding;
    this.y = this.padding;

    this.graphics = scene.add.graphics();
    this.graphics.setScrollFactor(0);
    this.graphics.setDepth(100);

    // Mark spawn room as visited (reveal based on camera view)
    this.revealVisibleArea(dungeonData.spawnPoint.x, dungeonData.spawnPoint.y);
    this.visitedRooms.add(0); // Spawn room is room 0
  }

  // Called when a chest is opened
  markChestOpened(roomId: number): void {
    this.openedChests.add(roomId);
  }

  // Called when a shrine is used
  markShrineUsed(roomId: number): void {
    this.usedShrines.add(roomId);
  }

  update(playerX: number, playerY: number): void {
    // Convert world position to tile position
    const tileX = Math.floor(playerX / TILE_SIZE);
    const tileY = Math.floor(playerY / TILE_SIZE);

    // Reveal tiles based on camera viewport
    this.revealVisibleArea(tileX, tileY);

    // Track visited rooms
    const currentRoom = this.getRoomAtTile(tileX, tileY);
    if (currentRoom) {
      this.visitedRooms.add(currentRoom.id);
    }

    // Redraw the minimap
    this.draw(tileX, tileY);
  }

  // Reveal tiles that would be visible on the player's screen
  private revealVisibleArea(centerTileX: number, centerTileY: number): void {
    // Calculate how many tiles are visible on screen (half in each direction from center)
    const tilesVisibleX = Math.ceil(this.cameraWidth / TILE_SIZE / 2) + 1;
    const tilesVisibleY = Math.ceil(this.cameraHeight / TILE_SIZE / 2) + 1;

    for (let dy = -tilesVisibleY; dy <= tilesVisibleY; dy++) {
      for (let dx = -tilesVisibleX; dx <= tilesVisibleX; dx++) {
        const x = centerTileX + dx;
        const y = centerTileY + dy;
        const key = `${x},${y}`;
        this.visitedTiles.add(key);
      }
    }
  }

  private getRoomAtTile(tileX: number, tileY: number): Room | null {
    for (const room of this.dungeonData.rooms) {
      if (tileX >= room.x && tileX < room.x + room.width &&
          tileY >= room.y && tileY < room.y + room.height) {
        return room;
      }
    }
    return null;
  }

  private draw(playerTileX: number, playerTileY: number): void {
    this.graphics.clear();

    // Background
    this.graphics.fillStyle(0x000000, 0.7);
    this.graphics.fillRect(this.x - 2, this.y - 2, this.viewportSize + 4, this.viewportSize + 4);
    this.graphics.lineStyle(1, 0x8b5cf6);
    this.graphics.strokeRect(this.x - 2, this.y - 2, this.viewportSize + 4, this.viewportSize + 4);

    // Calculate offset to center player in viewport
    const centerOffset = this.viewportSize / 2;
    const offsetX = this.x + centerOffset - playerTileX * this.scale;
    const offsetY = this.y + centerOffset - playerTileY * this.scale;

    // Draw visited tiles with room-type colors
    for (const key of this.visitedTiles) {
      const [tx, ty] = key.split(',').map(Number);

      // Check if this tile is a floor
      if (this.dungeonData.tiles[ty] && this.dungeonData.tiles[ty][tx] === 0) {
        const drawX = offsetX + tx * this.scale;
        const drawY = offsetY + ty * this.scale;

        // Only draw if within viewport
        if (
          drawX >= this.x &&
          drawX < this.x + this.viewportSize &&
          drawY >= this.y &&
          drawY < this.y + this.viewportSize
        ) {
          // Get room color based on room type
          const room = this.getRoomAtTile(tx, ty);
          const color = room ? ROOM_COLORS[room.type] : 0x374151;
          this.graphics.fillStyle(color);
          this.graphics.fillRect(drawX, drawY, this.scale, this.scale);
        }
      }
    }

    // Draw special room icons for visited rooms
    for (const room of this.dungeonData.rooms) {
      if (!this.visitedRooms.has(room.id)) continue;

      const iconX = offsetX + room.centerX * this.scale;
      const iconY = offsetY + room.centerY * this.scale;

      // Only draw if within viewport
      if (iconX < this.x || iconX >= this.x + this.viewportSize ||
          iconY < this.y || iconY >= this.y + this.viewportSize) {
        continue;
      }

      switch (room.type) {
        case RoomType.TREASURE:
          // Chest icon - gold box, gray if opened
          const chestColor = this.openedChests.has(room.id) ? 0x666666 : 0xffd700;
          this.graphics.fillStyle(chestColor);
          this.graphics.fillRect(iconX - 2, iconY - 1, 4, 3);
          this.graphics.fillStyle(0x8b4513);
          this.graphics.fillRect(iconX - 2, iconY - 2, 4, 1);
          break;

        case RoomType.SHRINE:
          // Shrine icon - cyan diamond, gray if used
          const shrineColor = this.usedShrines.has(room.id) ? 0x666666 : 0x22d3ee;
          this.graphics.fillStyle(shrineColor);
          this.graphics.fillTriangle(
            iconX, iconY - 3,
            iconX - 2, iconY,
            iconX + 2, iconY
          );
          this.graphics.fillTriangle(
            iconX, iconY + 3,
            iconX - 2, iconY,
            iconX + 2, iconY
          );
          break;

        case RoomType.CHALLENGE:
          // Skull icon - purple circle
          this.graphics.fillStyle(0xaa00ff);
          this.graphics.fillCircle(iconX, iconY, 3);
          break;

        case RoomType.TRAP:
          // Danger icon - red triangle
          this.graphics.fillStyle(0xff4444);
          this.graphics.fillTriangle(
            iconX, iconY - 3,
            iconX - 3, iconY + 2,
            iconX + 3, iconY + 2
          );
          break;

        case RoomType.EXIT:
          // Stairs icon - green arrow down
          this.graphics.fillStyle(0x10b981);
          this.graphics.fillTriangle(
            iconX, iconY + 3,
            iconX - 3, iconY - 1,
            iconX + 3, iconY - 1
          );
          this.graphics.fillRect(iconX - 1, iconY - 3, 2, 2);
          break;
      }
    }

    // Draw player dot (always centered)
    this.graphics.fillStyle(0x8b5cf6);
    this.graphics.fillCircle(
      this.x + centerOffset,
      this.y + centerOffset,
      3
    );
    // White outline for visibility
    this.graphics.lineStyle(1, 0xffffff);
    this.graphics.strokeCircle(
      this.x + centerOffset,
      this.y + centerOffset,
      3
    );
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
