/**
 * TestAPI - Exposes game internals for Playwright automated testing
 * Only active in development mode
 */

import Phaser from 'phaser';
import { networkManager } from '../multiplayer/NetworkManager';

export interface TestAPIInterface {
  // Player movement
  moveTo(x: number, y: number): void;
  getPlayerPos(): { x: number; y: number } | null;

  // Scene control
  getCurrentScene(): string;
  startScene(key: string, data?: object): void;

  // Game state
  getState(): GameState;

  // UI interactions (simulates button clicks by name)
  clickButton(buttonName: string): boolean;

  // Multiplayer
  hostGame(): void;
  joinGame(code: string): void;
  getMultiplayerState(): MultiplayerState | null;

  // Utility
  waitForScene(sceneKey: string, timeout?: number): Promise<boolean>;
  screenshot(): string; // Returns base64 canvas data
}

interface GameState {
  scene: string;
  player: {
    x: number;
    y: number;
    health: number;
    maxHealth: number;
  } | null;
  multiplayer: MultiplayerState | null;
}

interface MultiplayerState {
  isConnected: boolean;
  isHost: boolean;
  roomCode: string | null;
  peerCount: number;
}

declare global {
  interface Window {
    testAPI: TestAPIInterface;
    game: Phaser.Game;
  }
}

export function initTestAPI(game: Phaser.Game): void {
  // Only in development
  if (import.meta.env.PROD) return;

  // Helper to find the scene with a player (game scenes, not UI scenes)
  const getGameScene = () => {
    const scenes = game.scene.getScenes(true) as (Phaser.Scene & { player?: { x: number; y: number; setPosition: (x: number, y: number) => void } })[];
    // Find scene with player (HubScene, GameScene, etc.)
    return scenes.find(s => 'player' in s && s.player) ?? scenes[scenes.length - 1];
  };

  const api: TestAPIInterface = {
    moveTo(x: number, y: number): void {
      const scene = getGameScene();
      if (scene?.player) {
        scene.player.setPosition(x, y);
      }
    },

    getPlayerPos(): { x: number; y: number } | null {
      const scene = getGameScene();
      if (scene?.player) {
        return { x: scene.player.x, y: scene.player.y };
      }
      return null;
    },

    getCurrentScene(): string {
      const scene = getGameScene();
      return scene?.scene.key ?? 'unknown';
    },

    startScene(key: string, data?: object): void {
      game.scene.start(key, data);
    },

    getState(): GameState {
      const scene = getGameScene() as Phaser.Scene & {
        player?: { x: number; y: number; health: number; maxHealth: number }
      };

      // Get multiplayer state from networkManager
      let mpState: MultiplayerState | null = null;
      if (networkManager) {
        mpState = {
          isConnected: networkManager.isConnected,
          isHost: networkManager.isHost,
          roomCode: networkManager.roomCode,
          peerCount: 0, // Not exposed by NetworkManager
        };
      }

      return {
        scene: scene?.scene.key ?? 'unknown',
        player: scene?.player ? {
          x: scene.player.x,
          y: scene.player.y,
          health: scene.player.health,
          maxHealth: scene.player.maxHealth,
        } : null,
        multiplayer: mpState,
      };
    },

    clickButton(buttonName: string): boolean {
      // Find and click menu buttons by their text content
      const scene = game.scene.getScene('MenuScene') as Phaser.Scene & {
        menuButtons?: Map<string, { emit: (event: string) => void }>;
      };

      if (scene?.menuButtons?.has(buttonName)) {
        scene.menuButtons.get(buttonName)?.emit('pointerdown');
        scene.menuButtons.get(buttonName)?.emit('pointerup');
        return true;
      }
      return false;
    },

    hostGame(): void {
      networkManager.hostGame();
    },

    joinGame(code: string): void {
      networkManager.joinGame(code);
    },

    getMultiplayerState(): MultiplayerState | null {
      if (networkManager) {
        return {
          isConnected: networkManager.isConnected,
          isHost: networkManager.isHost,
          roomCode: networkManager.roomCode,
          peerCount: 0, // Not exposed by NetworkManager
        };
      }
      return null;
    },

    async waitForScene(sceneKey: string, timeout = 5000): Promise<boolean> {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (api.getCurrentScene() === sceneKey) {
          return true;
        }
        await new Promise(r => setTimeout(r, 100));
      }
      return false;
    },

    screenshot(): string {
      const canvas = game.canvas;
      return canvas.toDataURL('image/png');
    },
  };

  window.testAPI = api;
  window.game = game;

  console.log('[TestAPI] Initialized. Access via window.testAPI');
}
