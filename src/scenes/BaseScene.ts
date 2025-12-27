import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { AudioSystem } from '../systems/AudioSystem';
import { LightingSystem } from '../systems/LightingSystem';
import { InventoryUI } from '../ui/InventoryUI';
import { SettingsUI } from '../ui/SettingsUI';
import { DialogueUI } from '../ui/DialogueUI';
import { SinWorld } from '../config/WorldConfig';

export interface BaseSceneSaveData {
  player: ReturnType<Player['getSaveData']>;
  inventory: string;
}

export abstract class BaseScene extends Phaser.Scene {
  // Optional systems - only initialized if scene requests them
  protected audioSystem?: AudioSystem;
  protected lightingSystem?: LightingSystem;
  protected player?: Player;

  // Common UI - scenes opt-in via initCommonUI()
  protected inventoryUI?: InventoryUI;
  protected settingsUI?: SettingsUI;
  protected dialogueUI?: DialogueUI;

  // Child scenes implement this instead of create()
  abstract createScene(): void;

  // Base create() calls child's createScene()
  create(): void {
    this.createScene();
  }

  /** Initialize audio and optionally start background music */
  protected initAudio(musicKey?: 'exploration' | 'combat' | 'shrine'): void {
    this.audioSystem = new AudioSystem(this);
    if (musicKey) {
      this.audioSystem.startMusic(musicKey);
    }
  }

  /** Initialize lighting with world-specific colors */
  protected initLighting(world?: SinWorld | 'hub' | null): void {
    this.lightingSystem = new LightingSystem(this);
    this.lightingSystem.enable();
    if (world) {
      this.lightingSystem.setWorld(world);
    }
  }

  /** Add wall rim lights and shadow overlay for a tile-based room */
  protected initLightingEffects(tiles: number[][], tileSize: number): void {
    if (!this.lightingSystem) return;
    if (!tiles.length || !tiles[0]?.length) return;
    this.lightingSystem.createWallRimLights(tiles, tileSize);
    const width = tiles[0].length * tileSize;
    const height = tiles.length * tileSize;
    this.lightingSystem.createShadowOverlay(width, height);
  }
}
