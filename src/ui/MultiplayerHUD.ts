import Phaser from 'phaser';
import { networkManager } from '../multiplayer/NetworkManager';
import { RemotePlayer } from '../multiplayer/RemotePlayer';

/**
 * MultiplayerHUD displays co-op specific UI elements:
 * - Room code (for sharing with friends)
 * - Partner health bar
 * - Connection status indicator
 * - Off-screen partner indicator arrow
 */
export class MultiplayerHUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;

  // Room code display
  private roomCodeBg!: Phaser.GameObjects.Graphics;
  private roomCodeText!: Phaser.GameObjects.Text;

  // Partner health
  private partnerContainer!: Phaser.GameObjects.Container;
  private partnerLabel!: Phaser.GameObjects.Text;
  private partnerHealthBarBg!: Phaser.GameObjects.Graphics;
  private partnerHealthBarFill!: Phaser.GameObjects.Graphics;
  private partnerHealthText!: Phaser.GameObjects.Text;

  // Connection status
  private connectionIndicator!: Phaser.GameObjects.Graphics;
  private connectionText!: Phaser.GameObjects.Text;

  // Off-screen indicator
  private partnerArrow!: Phaser.GameObjects.Container;
  private arrowGraphic!: Phaser.GameObjects.Graphics;

  private readonly PADDING = 12;
  private readonly BAR_WIDTH = 100;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const cam = scene.cameras.main;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(100);

    this.createRoomCodeDisplay(cam);
    this.createPartnerHealthDisplay(cam);
    this.createConnectionIndicator(cam);
    this.createPartnerArrow(cam);
  }

  private createRoomCodeDisplay(cam: Phaser.Cameras.Scene2D.Camera): void {
    const x = cam.width - this.PADDING;
    const y = 140; // Below kill feed

    // Only show room code for host (guests already know it)
    if (!networkManager.isHost) return;

    // Background
    this.roomCodeBg = this.scene.add.graphics();
    this.roomCodeBg.fillStyle(0x000000, 0.7);
    this.roomCodeBg.fillRoundedRect(-130, 0, 130, 45, 4);
    this.roomCodeBg.lineStyle(1, 0x88aaff, 0.5);
    this.roomCodeBg.strokeRoundedRect(-130, 0, 130, 45, 4);

    const roomLabel = this.scene.add.text(-65, 8, 'ROOM CODE', {
      fontSize: '8px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#888888',
    });
    roomLabel.setOrigin(0.5, 0);

    this.roomCodeText = this.scene.add.text(-65, 24, networkManager.roomCode || '------', {
      fontSize: '16px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#88aaff',
      fontStyle: 'bold',
    });
    this.roomCodeText.setOrigin(0.5, 0);

    const codeContainer = this.scene.add.container(x, y);
    codeContainer.add([this.roomCodeBg, roomLabel, this.roomCodeText]);
    this.container.add(codeContainer);
  }

  private createPartnerHealthDisplay(cam: Phaser.Cameras.Scene2D.Camera): void {
    const x = cam.width - this.PADDING;
    const y = networkManager.isHost ? 195 : 140;

    this.partnerContainer = this.scene.add.container(x, y);

    // Background
    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.7);
    bg.fillRoundedRect(-130, 0, 130, 50, 4);
    bg.lineStyle(1, 0x88ff88, 0.3);
    bg.strokeRoundedRect(-130, 0, 130, 50, 4);
    this.partnerContainer.add(bg);

    // Label
    const partnerType = networkManager.isHost ? 'Helper' : 'Host';
    this.partnerLabel = this.scene.add.text(-65, 8, partnerType.toUpperCase(), {
      fontSize: '9px',
      fontFamily: 'Roboto Mono, monospace',
      color: networkManager.isHost ? '#88aaff' : '#88ff88',
    });
    this.partnerLabel.setOrigin(0.5, 0);
    this.partnerContainer.add(this.partnerLabel);

    // Health bar background
    this.partnerHealthBarBg = this.scene.add.graphics();
    this.partnerHealthBarBg.fillStyle(0x1a1a1a, 1);
    this.partnerHealthBarBg.fillRoundedRect(-115, 24, this.BAR_WIDTH, 10, 2);
    this.partnerHealthBarBg.lineStyle(1, 0x333333, 1);
    this.partnerHealthBarBg.strokeRoundedRect(-115, 24, this.BAR_WIDTH, 10, 2);
    this.partnerContainer.add(this.partnerHealthBarBg);

    // Health bar fill
    this.partnerHealthBarFill = this.scene.add.graphics();
    this.partnerContainer.add(this.partnerHealthBarFill);

    // Health text
    this.partnerHealthText = this.scene.add.text(-65, 29, '0/0', {
      fontSize: '8px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#ffffff',
    });
    this.partnerHealthText.setOrigin(0.5, 0.5);
    this.partnerContainer.add(this.partnerHealthText);

    this.container.add(this.partnerContainer);
  }

  private createConnectionIndicator(cam: Phaser.Cameras.Scene2D.Camera): void {
    const x = cam.width - this.PADDING - 115;
    const y = networkManager.isHost ? 252 : 197;

    const statusContainer = this.scene.add.container(x, y);

    this.connectionIndicator = this.scene.add.graphics();
    statusContainer.add(this.connectionIndicator);

    this.connectionText = this.scene.add.text(12, 0, 'Connected', {
      fontSize: '8px',
      fontFamily: 'Roboto Mono, monospace',
      color: '#888888',
    });
    this.connectionText.setOrigin(0, 0.5);
    statusContainer.add(this.connectionText);

    this.container.add(statusContainer);
    this.updateConnectionStatus();
  }

  private createPartnerArrow(cam: Phaser.Cameras.Scene2D.Camera): void {
    this.partnerArrow = this.scene.add.container(cam.width / 2, cam.height / 2);
    this.partnerArrow.setScrollFactor(0);
    this.partnerArrow.setDepth(99);
    this.partnerArrow.setVisible(false);

    this.arrowGraphic = this.scene.add.graphics();
    this.arrowGraphic.fillStyle(networkManager.isHost ? 0x88aaff : 0x88ff88, 0.9);
    this.arrowGraphic.beginPath();
    this.arrowGraphic.moveTo(0, -15);
    this.arrowGraphic.lineTo(10, 5);
    this.arrowGraphic.lineTo(3, 5);
    this.arrowGraphic.lineTo(3, 15);
    this.arrowGraphic.lineTo(-3, 15);
    this.arrowGraphic.lineTo(-3, 5);
    this.arrowGraphic.lineTo(-10, 5);
    this.arrowGraphic.closePath();
    this.arrowGraphic.fillPath();

    this.partnerArrow.add(this.arrowGraphic);
    // Don't add to container since it needs world positioning
  }

  private updateConnectionStatus(): void {
    this.connectionIndicator.clear();

    const isConnected = networkManager.isConnected;
    const color = isConnected ? 0x22cc22 : 0xcc2222;

    this.connectionIndicator.fillStyle(color, 1);
    this.connectionIndicator.fillCircle(4, 0, 4);

    this.connectionText.setText(isConnected ? 'Connected' : 'Disconnected');
    this.connectionText.setColor(isConnected ? '#22cc22' : '#cc2222');
  }

  update(remotePlayer: RemotePlayer | null): void {
    this.updateConnectionStatus();

    if (remotePlayer) {
      // Update health display
      const hp = remotePlayer.getHp();
      const maxHp = remotePlayer.getMaxHp();
      const percent = maxHp > 0 ? hp / maxHp : 0;

      this.partnerHealthBarFill.clear();
      if (percent > 0) {
        let hpColor = 0x22cc44;
        if (percent < 0.3) hpColor = 0xcc2222;
        else if (percent < 0.6) hpColor = 0xccaa22;

        this.partnerHealthBarFill.fillStyle(hpColor, 1);
        this.partnerHealthBarFill.fillRoundedRect(
          -115, 24,
          Math.max(4, this.BAR_WIDTH * percent), 10,
          2
        );
      }

      this.partnerHealthText.setText(`${hp}/${maxHp}`);

      // Update off-screen indicator
      this.updatePartnerArrow(remotePlayer);
    }
  }

  private updatePartnerArrow(remotePlayer: RemotePlayer): void {
    const cam = this.scene.cameras.main;
    const margin = 50;

    // Check if remote player is visible on screen
    const screenX = remotePlayer.x - cam.scrollX;
    const screenY = remotePlayer.y - cam.scrollY;

    const isOnScreen =
      screenX >= -margin &&
      screenX <= cam.width + margin &&
      screenY >= -margin &&
      screenY <= cam.height + margin;

    if (isOnScreen) {
      this.partnerArrow.setVisible(false);
      return;
    }

    this.partnerArrow.setVisible(true);

    // Calculate angle from center to partner
    const angle = Phaser.Math.Angle.Between(
      cam.width / 2,
      cam.height / 2,
      screenX,
      screenY
    );

    // Position arrow at edge of screen
    const edgeMargin = 40;
    const arrowX = cam.width / 2 + Math.cos(angle) * (cam.width / 2 - edgeMargin);
    const arrowY = cam.height / 2 + Math.sin(angle) * (cam.height / 2 - edgeMargin);

    // Clamp to screen bounds
    this.partnerArrow.setPosition(
      Phaser.Math.Clamp(arrowX, edgeMargin, cam.width - edgeMargin),
      Phaser.Math.Clamp(arrowY, edgeMargin, cam.height - edgeMargin)
    );

    // Rotate arrow to point at partner
    this.partnerArrow.setRotation(angle + Math.PI / 2);
  }

  destroy(): void {
    this.container.destroy();
    this.partnerArrow.destroy();
  }
}
