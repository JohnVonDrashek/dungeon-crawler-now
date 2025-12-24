import Phaser from 'phaser';
import { DungeonData } from '../systems/DungeonGenerator';
import { TILE_SIZE } from '../utils/constants';

export class MinimapUI {
  private graphics: Phaser.GameObjects.Graphics;
  private dungeonData: DungeonData;
  private scale: number = 1;
  private padding: number = 10;
  private viewportSize: number = 100;
  private visitedTiles: Set<string> = new Set();
  private x: number;
  private y: number;

  constructor(scene: Phaser.Scene, dungeonData: DungeonData) {
    this.dungeonData = dungeonData;

    // Position in top-right corner
    this.x = scene.cameras.main.width - this.viewportSize - this.padding;
    this.y = this.padding;

    this.graphics = scene.add.graphics();
    this.graphics.setScrollFactor(0);
    this.graphics.setDepth(100);

    // Mark spawn room as visited
    this.revealArea(dungeonData.spawnPoint.x, dungeonData.spawnPoint.y, 5);
  }

  update(playerX: number, playerY: number): void {
    // Convert world position to tile position
    const tileX = Math.floor(playerX / TILE_SIZE);
    const tileY = Math.floor(playerY / TILE_SIZE);

    // Reveal nearby tiles
    this.revealArea(tileX, tileY, 5);

    // Redraw the minimap
    this.draw(tileX, tileY);
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

    // Draw visited tiles
    this.graphics.fillStyle(0x374151);
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
          this.graphics.fillRect(drawX, drawY, this.scale, this.scale);
        }
      }
    }

    // Draw player dot (always centered)
    this.graphics.fillStyle(0x8b5cf6);
    this.graphics.fillCircle(
      this.x + centerOffset,
      this.y + centerOffset,
      3
    );
  }

  private revealArea(centerX: number, centerY: number, radius: number): void {
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = centerX + dx;
        const y = centerY + dy;
        const key = `${x},${y}`;
        this.visitedTiles.add(key);
      }
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
