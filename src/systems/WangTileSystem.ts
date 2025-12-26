/**
 * Wang Tile System for connected textures
 * Maps corner configurations to tile frame indices
 */

export interface WangTileMapping {
  // Frame index for each corner configuration
  // Corners encoded as: NW + NE*2 + SW*4 + SE*8 (0=floor, 1=wall)
  frameMap: Map<number, number>;
  // Pure floor and wall frame indices
  pureFloorFrame: number;
  pureWallFrame: number;
}

/**
 * Create Wang mapping from PixelLab tileset metadata
 * All PixelLab Wang tilesets use the same format:
 * - corners: NW, NE, SW, SE as "upper" (wall) or "lower" (floor)
 * - bounding_box: x, y position in 128x128 spritesheet (32x32 tiles in 4x4 grid)
 */
function createWangMappingFromMetadata(tiles: Array<{
  corners: { NW: string; NE: string; SW: string; SE: string };
  bounding_box: { x: number; y: number };
}>): WangTileMapping {
  const frameMap = new Map<number, number>();
  let pureFloorFrame = 0;
  let pureWallFrame = 0;

  for (const tile of tiles) {
    // Calculate corner code: NW + NE*2 + SW*4 + SE*8
    const nw = tile.corners.NW === 'upper' ? 1 : 0;
    const ne = tile.corners.NE === 'upper' ? 1 : 0;
    const sw = tile.corners.SW === 'upper' ? 1 : 0;
    const se = tile.corners.SE === 'upper' ? 1 : 0;
    const cornerCode = nw + ne * 2 + sw * 4 + se * 8;

    // Calculate frame index from bounding box position (4 tiles per row, 32px per tile)
    const frameIndex = (tile.bounding_box.x / 32) + (tile.bounding_box.y / 32) * 4;

    frameMap.set(cornerCode, frameIndex);

    // Track pure floor (0) and pure wall (15)
    if (cornerCode === 0) pureFloorFrame = frameIndex;
    if (cornerCode === 15) pureWallFrame = frameIndex;
  }

  return { frameMap, pureFloorFrame, pureWallFrame };
}

// Standard PixelLab Wang tile mapping
// All PixelLab tilesets use the same corner-to-frame layout (32x32 tiles in 4x4 grid)
const STANDARD_WANG_MAPPING: WangTileMapping = createWangMappingFromMetadata([
  { corners: { NW: 'upper', NE: 'upper', SW: 'lower', SE: 'upper' }, bounding_box: { x: 0, y: 0 } },
  { corners: { NW: 'upper', NE: 'lower', SW: 'upper', SE: 'lower' }, bounding_box: { x: 32, y: 0 } },
  { corners: { NW: 'lower', NE: 'upper', SW: 'lower', SE: 'lower' }, bounding_box: { x: 64, y: 0 } },
  { corners: { NW: 'upper', NE: 'upper', SW: 'lower', SE: 'lower' }, bounding_box: { x: 96, y: 0 } },
  { corners: { NW: 'lower', NE: 'upper', SW: 'upper', SE: 'lower' }, bounding_box: { x: 0, y: 32 } },
  { corners: { NW: 'upper', NE: 'lower', SW: 'lower', SE: 'lower' }, bounding_box: { x: 32, y: 32 } },
  { corners: { NW: 'lower', NE: 'lower', SW: 'lower', SE: 'lower' }, bounding_box: { x: 64, y: 32 } },
  { corners: { NW: 'lower', NE: 'lower', SW: 'lower', SE: 'upper' }, bounding_box: { x: 96, y: 32 } },
  { corners: { NW: 'upper', NE: 'lower', SW: 'upper', SE: 'upper' }, bounding_box: { x: 0, y: 64 } },
  { corners: { NW: 'lower', NE: 'lower', SW: 'upper', SE: 'upper' }, bounding_box: { x: 32, y: 64 } },
  { corners: { NW: 'lower', NE: 'lower', SW: 'upper', SE: 'lower' }, bounding_box: { x: 64, y: 64 } },
  { corners: { NW: 'lower', NE: 'upper', SW: 'lower', SE: 'upper' }, bounding_box: { x: 96, y: 64 } },
  { corners: { NW: 'upper', NE: 'upper', SW: 'upper', SE: 'upper' }, bounding_box: { x: 0, y: 96 } },
  { corners: { NW: 'upper', NE: 'upper', SW: 'upper', SE: 'lower' }, bounding_box: { x: 32, y: 96 } },
  { corners: { NW: 'upper', NE: 'lower', SW: 'lower', SE: 'upper' }, bounding_box: { x: 64, y: 96 } },
  { corners: { NW: 'lower', NE: 'upper', SW: 'upper', SE: 'upper' }, bounding_box: { x: 96, y: 96 } },
]);

/**
 * Get the Wang tile frame index based on corner terrain values
 * @param nw - Northwest corner is wall (true) or floor (false)
 * @param ne - Northeast corner is wall
 * @param sw - Southwest corner is wall
 * @param se - Southeast corner is wall
 * @param mapping - The Wang tile mapping to use
 */
export function getWangTileFrame(
  nw: boolean,
  ne: boolean,
  sw: boolean,
  se: boolean,
  mapping: WangTileMapping
): number {
  const code = (nw ? 1 : 0) + (ne ? 2 : 0) + (sw ? 4 : 0) + (se ? 8 : 0);
  return mapping.frameMap.get(code) ?? mapping.pureFloorFrame;
}

/**
 * Determine corner terrain values for a tile position in a dungeon grid
 * A corner is considered "wall" if any of the tiles touching that corner is a wall
 * @param tiles - 2D array where 1=wall, 0=floor
 * @param x - Tile X position
 * @param y - Tile Y position
 * @param width - Dungeon width
 * @param height - Dungeon height
 */
export function getCornerValues(
  tiles: number[][],
  x: number,
  y: number,
  width: number,
  height: number
): { nw: boolean; ne: boolean; sw: boolean; se: boolean } {
  // Helper to safely get tile value (treat out of bounds as wall)
  const getTile = (tx: number, ty: number): number => {
    if (tx < 0 || tx >= width || ty < 0 || ty >= height) return 1;
    return tiles[ty][tx];
  };

  // Current tile
  const current = getTile(x, y);

  // For a floor tile, check if adjacent walls should affect corners
  // NW corner: affected by tiles at (x-1,y-1), (x,y-1), (x-1,y), (x,y)
  // NE corner: affected by tiles at (x,y-1), (x+1,y-1), (x,y), (x+1,y)
  // SW corner: affected by tiles at (x-1,y), (x,y), (x-1,y+1), (x,y+1)
  // SE corner: affected by tiles at (x,y), (x+1,y), (x,y+1), (x+1,y+1)

  const nw = getTile(x - 1, y - 1) === 1 || getTile(x, y - 1) === 1 ||
             getTile(x - 1, y) === 1 || current === 1;
  const ne = getTile(x, y - 1) === 1 || getTile(x + 1, y - 1) === 1 ||
             current === 1 || getTile(x + 1, y) === 1;
  const sw = getTile(x - 1, y) === 1 || current === 1 ||
             getTile(x - 1, y + 1) === 1 || getTile(x, y + 1) === 1;
  const se = current === 1 || getTile(x + 1, y) === 1 ||
             getTile(x, y + 1) === 1 || getTile(x + 1, y + 1) === 1;

  return { nw, ne, sw, se };
}

/**
 * Corner detection for Wang tiles
 * A corner shows "wall" terrain if ANY wall touches that corner
 * This creates smooth transitions between floor and wall areas
 *
 * For proper inner corners, we must check BOTH orthogonal AND diagonal neighbors.
 * Inner corners occur when a wall is diagonally adjacent but not orthogonally adjacent.
 */
export function getSimpleCornerValues(
  tiles: number[][],
  x: number,
  y: number,
  width: number,
  height: number
): { nw: boolean; ne: boolean; sw: boolean; se: boolean } {
  const getTile = (tx: number, ty: number): number => {
    if (tx < 0 || tx >= width || ty < 0 || ty >= height) return 1;
    return tiles[ty][tx];
  };

  const current = getTile(x, y);

  // If current tile is a wall, all corners are wall
  if (current === 1) {
    return { nw: true, ne: true, sw: true, se: true };
  }

  // For floor tiles, check which corners touch walls
  // Orthogonal neighbors
  const north = getTile(x, y - 1) === 1;
  const south = getTile(x, y + 1) === 1;
  const west = getTile(x - 1, y) === 1;
  const east = getTile(x + 1, y) === 1;

  // Diagonal neighbors (for inner corners)
  const northWest = getTile(x - 1, y - 1) === 1;
  const northEast = getTile(x + 1, y - 1) === 1;
  const southWest = getTile(x - 1, y + 1) === 1;
  const southEast = getTile(x + 1, y + 1) === 1;

  // A corner shows wall if ANY wall touches that corner:
  // - orthogonal neighbors (outer corners/edges)
  // - diagonal neighbor (inner corners)
  const nw = north || west || northWest;
  const ne = north || east || northEast;
  const sw = south || west || southWest;
  const se = south || east || southEast;

  return { nw, ne, sw, se };
}

// Available Wang tilesets (world -> mapping)
// All PixelLab-generated tilesets use the same standard mapping
export const WANG_TILESETS: Record<string, WangTileMapping> = {
  'pride': STANDARD_WANG_MAPPING,
  'greed': STANDARD_WANG_MAPPING,
  'wrath': STANDARD_WANG_MAPPING,
  'sloth': STANDARD_WANG_MAPPING,
  'envy': STANDARD_WANG_MAPPING,
  'gluttony': STANDARD_WANG_MAPPING,
  'lust': STANDARD_WANG_MAPPING,
  'hub': STANDARD_WANG_MAPPING,
};

export function hasWangTileset(world: string): boolean {
  return world in WANG_TILESETS;
}

export function getWangMapping(world: string): WangTileMapping | null {
  return WANG_TILESETS[world] ?? null;
}
