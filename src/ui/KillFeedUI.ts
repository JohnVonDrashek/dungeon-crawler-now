import Phaser from 'phaser';
import { KillFeedEntry } from '../multiplayer/SyncMessages';
import { networkManager } from '../multiplayer/NetworkManager';

interface KillFeedDisplay {
  container: Phaser.GameObjects.Container;
  entry: KillFeedEntry;
}

/**
 * KillFeedUI displays recent kills in multiplayer games.
 * Shows who killed which enemy with color-coded player names.
 */
export class KillFeedUI {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private displays: KillFeedDisplay[] = [];

  private readonly MAX_ENTRIES = 5;
  private readonly ENTRY_HEIGHT = 22;
  private readonly DISPLAY_DURATION_MS = 4000;
  private readonly FADE_DURATION_MS = 500;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Position in top-right corner
    const cam = scene.cameras.main;
    this.container = scene.add.container(cam.width - 12, 12);
    this.container.setScrollFactor(0);
    this.container.setDepth(100);
  }

  addEntry(killerPlayerId: string, enemyType: string): void {
    // Create entry container
    const entryContainer = this.scene.add.container(0, 0);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(-180, 0, 180, 20, 3);
    entryContainer.add(bg);

    // Determine player color and name
    const isHost = killerPlayerId === 'host';
    const isLocalPlayer = networkManager.isHost ? isHost : !isHost;
    const playerColor = isLocalPlayer ? '#88ff88' : '#88aaff';
    const playerName = isLocalPlayer ? 'You' : (isHost ? 'Host' : 'Helper');

    // Format enemy type for display
    const enemyName = this.formatEnemyName(enemyType);

    // Kill icon (skull)
    const killIcon = this.scene.add.text(-170, 10, '\u2620', {
      fontSize: '12px',
      color: '#ff6644',
    });
    killIcon.setOrigin(0, 0.5);
    entryContainer.add(killIcon);

    // Player name
    const playerText = this.scene.add.text(-155, 10, playerName, {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: playerColor,
    });
    playerText.setOrigin(0, 0.5);
    entryContainer.add(playerText);

    // "killed" text
    const killedText = this.scene.add.text(-155 + playerText.width + 4, 10, 'killed', {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#888888',
    });
    killedText.setOrigin(0, 0.5);
    entryContainer.add(killedText);

    // Enemy name
    const enemyText = this.scene.add.text(-155 + playerText.width + killedText.width + 8, 10, enemyName, {
      fontSize: '10px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#ffaa44',
    });
    enemyText.setOrigin(0, 0.5);
    entryContainer.add(enemyText);

    // Create entry record
    const entry: KillFeedEntry = {
      killerPlayerId,
      enemyType,
      timestamp: Date.now(),
    };

    const display: KillFeedDisplay = {
      container: entryContainer,
      entry,
    };

    // Add to displays
    this.displays.unshift(display);
    this.container.add(entryContainer);

    // Trim old entries
    while (this.displays.length > this.MAX_ENTRIES) {
      const old = this.displays.pop();
      if (old) {
        old.container.destroy();
      }
    }

    // Reposition all entries
    this.repositionEntries();

    // Slide in animation
    entryContainer.setAlpha(0);
    entryContainer.x = 50;
    this.scene.tweens.add({
      targets: entryContainer,
      alpha: 1,
      x: 0,
      duration: 200,
      ease: 'Cubic.easeOut',
    });

    // Schedule removal
    this.scene.time.delayedCall(this.DISPLAY_DURATION_MS, () => {
      this.removeEntry(display);
    });
  }

  private removeEntry(display: KillFeedDisplay): void {
    const index = this.displays.indexOf(display);
    if (index === -1) return;

    // Fade out animation
    this.scene.tweens.add({
      targets: display.container,
      alpha: 0,
      x: 50,
      duration: this.FADE_DURATION_MS,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        const currentIndex = this.displays.indexOf(display);
        if (currentIndex !== -1) {
          this.displays.splice(currentIndex, 1);
          display.container.destroy();
          this.repositionEntries();
        }
      },
    });
  }

  private repositionEntries(): void {
    this.displays.forEach((display, index) => {
      const targetY = index * this.ENTRY_HEIGHT;
      this.scene.tweens.add({
        targets: display.container,
        y: targetY,
        duration: 150,
        ease: 'Cubic.easeOut',
      });
    });
  }

  private formatEnemyName(textureKey: string): string {
    // Convert texture keys like "demon_brute" to "Demon Brute"
    return textureKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .slice(0, 15); // Limit length
  }

  destroy(): void {
    this.displays.forEach((display) => display.container.destroy());
    this.displays = [];
    this.container.destroy();
  }
}
