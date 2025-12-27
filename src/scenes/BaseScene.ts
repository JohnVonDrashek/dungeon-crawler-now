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

  /** Create player and optionally restore from save data */
  protected initPlayer(x: number, y: number, restoreFrom?: BaseSceneSaveData): Player {
    this.player = new Player(this, x, y);
    if (restoreFrom) {
      this.player.restoreFromSave(restoreFrom.player);
      this.player.inventory.deserialize(restoreFrom.inventory);
      this.player.recalculateStats();
    }
    return this.player;
  }

  /** Center camera on a fixed-size room (for rooms smaller than viewport) */
  protected centerCamera(roomWidth: number, roomHeight: number): void {
    const offsetX = (this.scale.width - roomWidth) / 2;
    const offsetY = (this.scale.height - roomHeight) / 2;
    this.cameras.main.setScroll(-offsetX, -offsetY);
  }

  /** Initialize common UI components (requires player to exist) */
  protected initCommonUI(): void {
    if (!this.player) {
      console.warn('BaseScene.initCommonUI: called before player exists');
      return;
    }
    this.inventoryUI = new InventoryUI(this, this.player);
    this.settingsUI = new SettingsUI(this);
    this.dialogueUI = new DialogueUI(this);
  }

  /** Set up standard keyboard shortcuts (E=inventory, ESC=close/settings) */
  protected initCommonKeys(): void {
    if (!this.input.keyboard) return;

    // E - Toggle inventory
    this.input.keyboard.on('keydown-E', () => {
      if (this.canToggleUI()) {
        this.inventoryUI?.toggle();
        if (this.inventoryUI?.getIsVisible()) {
          this.player?.setVelocity(0, 0);
        }
      }
    });

    // ESC - Close any open UI, or open settings if nothing open
    this.input.keyboard.on('keydown-ESC', () => {
      if (this.inventoryUI?.getIsVisible()) {
        this.inventoryUI.hide();
      } else if (this.dialogueUI?.getIsVisible?.()) {
        // Don't interrupt dialogue with ESC
      } else {
        this.settingsUI?.toggle();
      }
    });
  }

  /** Override in child scenes to block UI during cutscenes, shops, etc. */
  protected canToggleUI(): boolean {
    return true;
  }

  /** Check if any modal UI is currently blocking gameplay */
  protected isUIBlocking(): boolean {
    return (
      (this.inventoryUI?.getIsVisible() ?? false) ||
      (this.settingsUI?.getIsVisible?.() ?? false) ||
      (this.dialogueUI?.getIsVisible?.() ?? false)
    );
  }
}
