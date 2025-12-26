/**
 * LightingSystem - Centralized lighting management for the dungeon
 *
 * Uses Phaser's Light2D pipeline with normal maps for dynamic lighting.
 * Manages player torch, wall candles, and ambient darkness.
 */

import Phaser from 'phaser';

export interface LightConfig {
  color: number;
  radius: number;
  intensity: number;
  flicker?: boolean;
  flickerSpeed?: number;
  flickerAmount?: number;
}

export interface TorchLight {
  light: Phaser.GameObjects.Light;
  baseIntensity: number;
  flickerOffset: number;
  roomId?: number;
  isLit: boolean;
}

// World-specific lighting palettes (derived from WorldConfig colors)
export const WORLD_LIGHTING = {
  pride: {
    ambient: 0x0f0d08,      // Dark gold-brown
    torchColors: [0xffd700, 0xf5c400, 0xffdb4d, 0xe6b800], // Gold variations
    rimColor: 0x4a4520,     // Matches floor color
  },
  greed: {
    ambient: 0x080f08,      // Dark green
    torchColors: [0x22c55e, 0x16a34a, 0x4ade80, 0x15803d], // Green variations
    rimColor: 0x1a3d1a,     // Matches floor color
  },
  wrath: {
    ambient: 0x0f0808,      // Dark red
    torchColors: [0xdc2626, 0xef4444, 0xf97316, 0xb91c1c], // Red/orange variations
    rimColor: 0x3d1515,     // Matches floor color
  },
  sloth: {
    ambient: 0x0a0a0c,      // Dark gray-blue
    torchColors: [0x9ca3af, 0x6b7280, 0x60a5fa, 0x4b5563], // Gray/blue variations
    rimColor: 0x2a2d33,     // Matches floor color
  },
  envy: {
    ambient: 0x060d06,      // Very dark green
    torchColors: [0x16a34a, 0x22c55e, 0x15803d, 0x166534], // Dark green variations
    rimColor: 0x1a2d1a,     // Matches floor color
  },
  gluttony: {
    ambient: 0x0d0a06,      // Dark amber
    torchColors: [0xfbbf24, 0xf59e0b, 0xfcd34d, 0xd97706], // Amber variations
    rimColor: 0x3d3015,     // Matches floor color
  },
  lust: {
    ambient: 0x0d060a,      // Dark magenta
    torchColors: [0xec4899, 0xf472b6, 0xdb2777, 0xbe185d], // Pink variations
    rimColor: 0x3d1530,     // Matches floor color
  },
  hub: {
    ambient: 0x0c0a08,      // Warm brown (safer feeling)
    torchColors: [0xffa066, 0xff8844, 0xffbb88, 0xff9955], // Warm firelight
    rimColor: 0x2a2520,     // Warm brown
  },
} as Record<string, { ambient: number; torchColors: number[]; rimColor: number }>;

// Default lighting configurations
export const LIGHT_CONFIG = {
  // Default ambient light (used when no world is set)
  ambient: {
    color: 0x0a0812, // Cool purple-brown, hints at texture in darkness
    intensity: 0.12,
  },

  // Player's torch - smaller, sharper, grounded feel
  // Stays neutral warm so player stands out in any world
  playerTorch: {
    color: 0xffe8b8, // Neutral/slightly warm (less saturated than world torches)
    radius: 150, // Reduced from 200 for tighter pool
    intensity: 1.4, // Slightly higher intensity for sharper falloff feel
    yOffset: 6, // Offset downward - torches light below eye level
  },

  // Wall candles/torches - base config (colors overridden by world)
  wallTorch: {
    color: 0xff9933, // Default warm orange (overridden by world)
    radius: 100, // Smaller radius for more defined pools
    intensity: 0.7,
    flicker: true,
    flickerSpeed: 4, // Slightly faster
    flickerAmount: 0.25, // More noticeable flicker
  },

  // Default torch color variations (overridden by world)
  torchColorVariations: [
    0xff9933, // Orange
    0xffaa44, // Yellow-orange
    0xff8822, // Deep orange
    0xffbb55, // Pale orange
  ],

  // Wall rim lighting - base config (color overridden by world)
  wallRim: {
    color: 0x666677, // Default cool gray (overridden by world)
    radius: 40, // Small radius for tight edge effect
    intensity: 0.15, // Very subtle - just hints at geometry
    spacing: 2, // Place lights every N tiles along edges
  },

  // Boss glow colors by sin type
  bossGlow: {
    pride: { color: 0xffd700, radius: 150, intensity: 0.6 },
    greed: { color: 0x22c55e, radius: 140, intensity: 0.5 },
    wrath: { color: 0xdc2626, radius: 160, intensity: 0.7 },
    sloth: { color: 0x6b7280, radius: 130, intensity: 0.4 },
    envy: { color: 0x16a34a, radius: 140, intensity: 0.5 },
    gluttony: { color: 0xfbbf24, radius: 150, intensity: 0.6 },
    lust: { color: 0xec4899, radius: 145, intensity: 0.55 },
  } as Record<string, LightConfig>,
};

export class LightingSystem {
  private scene: Phaser.Scene;
  private torchLights: TorchLight[] = [];
  private playerLight: Phaser.GameObjects.Light | null = null;
  private enabled: boolean = false;
  private time: number = 0;
  private currentWorld: string | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  /**
   * Set the current world to use world-specific lighting colors
   * Call this before creating torches/rim lights
   */
  setWorld(world: string | null): void {
    this.currentWorld = world;

    // Update ambient light if enabled
    if (this.enabled && world && WORLD_LIGHTING[world]) {
      this.scene.lights.setAmbientColor(WORLD_LIGHTING[world].ambient);
    }
  }

  /**
   * Get torch colors for the current world
   */
  private getTorchColors(): number[] {
    if (this.currentWorld && WORLD_LIGHTING[this.currentWorld]) {
      return WORLD_LIGHTING[this.currentWorld].torchColors;
    }
    return LIGHT_CONFIG.torchColorVariations;
  }

  /**
   * Get rim light color for the current world
   */
  private getRimColor(): number {
    if (this.currentWorld && WORLD_LIGHTING[this.currentWorld]) {
      return WORLD_LIGHTING[this.currentWorld].rimColor;
    }
    return LIGHT_CONFIG.wallRim.color;
  }

  /**
   * Enable the lighting system for the scene
   */
  enable(): void {
    if (this.enabled) return;

    // Enable lights on the scene
    this.scene.lights.enable();

    // Set ambient light (dark dungeon atmosphere)
    this.scene.lights.setAmbientColor(LIGHT_CONFIG.ambient.color);

    this.enabled = true;
    console.log('LightingSystem enabled');
  }

  /**
   * Disable the lighting system
   */
  disable(): void {
    if (!this.enabled) return;

    // Remove all lights
    this.torchLights.forEach(torch => torch.light.setVisible(false));
    this.torchLights = [];

    if (this.playerLight) {
      this.playerLight.setVisible(false);
      this.playerLight = null;
    }

    this.enabled = false;
  }

  /**
   * Create the player's torch light
   */
  createPlayerTorch(x: number, y: number): Phaser.GameObjects.Light {
    const config = LIGHT_CONFIG.playerTorch;
    this.playerLight = this.scene.lights.addLight(
      x,
      y,
      config.radius,
      config.color,
      config.intensity
    );
    return this.playerLight;
  }

  /**
   * Update player torch position (call in update loop)
   * Applies y offset to ground the light below eye level
   */
  updatePlayerTorch(x: number, y: number): void {
    if (this.playerLight) {
      const yOffset = LIGHT_CONFIG.playerTorch.yOffset || 0;
      this.playerLight.setPosition(x, y + yOffset);
    }
  }

  /**
   * Create a wall torch/candle light with optional flickering
   * @param roomId - Optional room ID to associate this torch with
   * @param startLit - Whether the torch starts lit (default true for backwards compatibility)
   */
  createTorchLight(
    x: number,
    y: number,
    customConfig?: Partial<LightConfig>,
    roomId?: number,
    startLit: boolean = true
  ): Phaser.GameObjects.Light {
    const config = { ...LIGHT_CONFIG.wallTorch, ...customConfig };

    // Pick a random color variation for visual rhythm (world-specific if set)
    const colorVariations = this.getTorchColors();
    const torchColor = customConfig?.color ||
      colorVariations[Math.floor(Math.random() * colorVariations.length)];

    // Slight radius variation per torch (95-105% of base)
    const radiusVariation = 0.95 + Math.random() * 0.1;
    const torchRadius = Math.floor((config.radius || 100) * radiusVariation);

    const light = this.scene.lights.addLight(
      x,
      y,
      torchRadius,
      torchColor,
      startLit ? config.intensity : 0 // Start with 0 intensity if not lit
    );

    if (config.flicker) {
      this.torchLights.push({
        light,
        baseIntensity: config.intensity,
        flickerOffset: Math.random() * Math.PI * 2, // Random phase offset
        roomId,
        isLit: startLit,
      });
    }

    return light;
  }

  /**
   * Light up all torches in a specific room
   */
  lightRoom(roomId: number): void {
    for (const torch of this.torchLights) {
      if (torch.roomId === roomId && !torch.isLit) {
        torch.isLit = true;
        // Animate the light turning on
        this.scene.tweens.add({
          targets: torch.light,
          intensity: torch.baseIntensity,
          duration: 300,
          ease: 'Quad.easeOut',
        });
      }
    }
  }

  /**
   * Check if a room's torches are lit
   */
  isRoomLit(roomId: number): boolean {
    const roomTorches = this.torchLights.filter(t => t.roomId === roomId);
    return roomTorches.length === 0 || roomTorches.some(t => t.isLit);
  }

  /**
   * Create a boss glow light
   */
  createBossGlow(x: number, y: number, sinType: string): Phaser.GameObjects.Light | null {
    const config = LIGHT_CONFIG.bossGlow[sinType];
    if (!config) {
      console.warn(`No boss glow config for sin type: ${sinType}`);
      return null;
    }

    return this.scene.lights.addLight(
      x,
      y,
      config.radius,
      config.color,
      config.intensity
    );
  }

  /**
   * Create subtle rim lights along wall edges to separate walls from floor
   * This is a classic AAA trick - makes room geometry read instantly
   * @param tiles - 2D array where 1 = wall, 0 = floor
   * @param tileSize - Size of each tile in pixels
   */
  createWallRimLights(tiles: number[][], tileSize: number): void {
    const config = LIGHT_CONFIG.wallRim;
    const height = tiles.length;
    const width = tiles[0]?.length || 0;

    // Scan for wall-floor boundaries and place subtle lights on the floor side
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Only process floor tiles (0)
        if (tiles[y][x] !== 0) continue;

        // Check each direction for adjacent walls
        const hasWallAbove = y > 0 && tiles[y - 1][x] === 1;
        const hasWallBelow = y < height - 1 && tiles[y + 1][x] === 1;
        const hasWallLeft = x > 0 && tiles[y][x - 1] === 1;
        const hasWallRight = x < width - 1 && tiles[y][x + 1] === 1;

        // Count adjacent walls - corners and edges get different treatment
        const adjacentWalls = [hasWallAbove, hasWallBelow, hasWallLeft, hasWallRight].filter(Boolean).length;

        // Skip if no adjacent walls or if this is a corridor (surrounded by walls)
        if (adjacentWalls === 0) continue;

        // Use spacing to reduce light count (performance + visual)
        if ((x + y) % config.spacing !== 0) continue;

        // Calculate position - center of the floor tile
        const worldX = x * tileSize + tileSize / 2;
        const worldY = y * tileSize + tileSize / 2;

        // Offset slightly toward the wall for better rim effect
        let offsetX = 0;
        let offsetY = 0;
        if (hasWallAbove) offsetY -= tileSize * 0.3;
        if (hasWallBelow) offsetY += tileSize * 0.3;
        if (hasWallLeft) offsetX -= tileSize * 0.3;
        if (hasWallRight) offsetX += tileSize * 0.3;

        // Corner tiles (2+ walls) get slightly brighter light
        const intensity = adjacentWalls >= 2 ? config.intensity * 1.3 : config.intensity;

        // Use world-specific rim color if set
        const rimColor = this.getRimColor();

        this.scene.lights.addLight(
          worldX + offsetX,
          worldY + offsetY,
          config.radius,
          rimColor,
          intensity
        );
      }
    }
  }

  /**
   * Update lighting effects (flickering, etc.)
   * Call this in the scene's update method
   */
  update(delta: number): void {
    if (!this.enabled) return;

    this.time += delta / 1000; // Convert to seconds

    // Update flickering torches (only ones that are lit)
    const flickerSpeed = LIGHT_CONFIG.wallTorch.flickerSpeed || 4;
    const flickerAmount = LIGHT_CONFIG.wallTorch.flickerAmount || 0.25;

    for (const torch of this.torchLights) {
      if (!torch.isLit) continue; // Skip unlit torches

      // Multi-frequency flicker for more organic feel
      const primaryFlicker = Math.sin(this.time * flickerSpeed + torch.flickerOffset) * flickerAmount;
      const secondaryFlicker = Math.sin(this.time * flickerSpeed * 2.3 + torch.flickerOffset * 1.7) * (flickerAmount * 0.3);
      const noise = (Math.random() - 0.5) * 0.08; // Random noise for that "alive" feel

      torch.light.setIntensity(torch.baseIntensity + primaryFlicker + secondaryFlicker + noise);
    }

    // Update shadow overlay drift if it exists
    if (this.shadowOverlay) {
      this.updateShadowOverlay();
    }
  }

  private shadowOverlay: Phaser.GameObjects.Graphics | null = null;
  private shadowOverlayTime: number = 0;

  /**
   * Create a slowly drifting shadow overlay for ambient darkness variation
   * This adds "alive" darkness that isn't uniform
   */
  createShadowOverlay(width: number, height: number): void {
    if (this.shadowOverlay) {
      this.shadowOverlay.destroy();
    }

    this.shadowOverlay = this.scene.add.graphics();
    this.shadowOverlay.setDepth(44); // Below UI, above most game elements
    this.shadowOverlay.setBlendMode(Phaser.BlendModes.MULTIPLY);

    this.drawShadowOverlay(width, height);
  }

  private drawShadowOverlay(width: number, height: number): void {
    if (!this.shadowOverlay) return;

    this.shadowOverlay.clear();

    // Create organic shadow patches that drift
    const patchCount = 8;
    const time = this.shadowOverlayTime;

    for (let i = 0; i < patchCount; i++) {
      const baseX = (i % 4) * (width / 3) - width / 6;
      const baseY = Math.floor(i / 4) * (height / 2);

      // Drift slowly
      const driftX = Math.sin(time * 0.1 + i * 0.7) * 50;
      const driftY = Math.cos(time * 0.08 + i * 0.5) * 30;

      const x = baseX + driftX;
      const y = baseY + driftY;
      const radius = 200 + Math.sin(time * 0.15 + i) * 50;

      // Very subtle darkening - you should barely notice it
      this.shadowOverlay.fillStyle(0x000000, 0.03 + Math.sin(time * 0.2 + i) * 0.01);
      this.shadowOverlay.fillCircle(x, y, radius);
    }
  }

  private updateShadowOverlay(): void {
    this.shadowOverlayTime += 0.016; // Approximate delta

    // Only redraw occasionally for performance
    if (Math.floor(this.shadowOverlayTime * 10) % 3 === 0) {
      const cam = this.scene.cameras.main;
      this.drawShadowOverlay(cam.width * 2, cam.height * 2);

      // Position relative to camera
      if (this.shadowOverlay) {
        this.shadowOverlay.setPosition(
          cam.scrollX - cam.width / 2,
          cam.scrollY - cam.height / 2
        );
      }
    }
  }

  /**
   * Destroy shadow overlay
   */
  destroyShadowOverlay(): void {
    if (this.shadowOverlay) {
      this.shadowOverlay.destroy();
      this.shadowOverlay = null;
    }
  }

  /**
   * Remove a specific torch light
   */
  removeTorchLight(light: Phaser.GameObjects.Light): void {
    const index = this.torchLights.findIndex(t => t.light === light);
    if (index !== -1) {
      this.torchLights.splice(index, 1);
    }
    light.setVisible(false);
  }

  /**
   * Clear all torch lights (for scene transitions)
   */
  clearTorchLights(): void {
    for (const torch of this.torchLights) {
      torch.light.setVisible(false);
    }
    this.torchLights = [];
  }

  /**
   * Get the player light reference
   */
  getPlayerLight(): Phaser.GameObjects.Light | null {
    return this.playerLight;
  }

  /**
   * Check if lighting is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Set custom ambient light color and intensity
   */
  setAmbientLight(color: number): void {
    if (this.enabled) {
      this.scene.lights.setAmbientColor(color);
    }
  }

  /**
   * Destroy the lighting system
   */
  destroy(): void {
    this.disable();
    this.destroyShadowOverlay();
  }
}
