// src/systems/VisualEffectsManager.ts
import Phaser from 'phaser';

export class VisualEffectsManager {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  shakeCamera(intensity: number, duration: number): void {
    this.scene.cameras.main.shake(duration, intensity / 1000);
  }

  showDamageNumber(x: number, y: number, damage: number, isPlayer: boolean): void {
    const color = isPlayer ? '#ff4444' : '#ffffff';
    const text = this.scene.add.text(x, y - 20, `-${damage}`, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);
    text.setDepth(150);

    this.scene.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  showFloatingText(x: number, y: number, message: string, color: string): void {
    const text = this.scene.add.text(x, y, message, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: color,
      stroke: '#000000',
      strokeThickness: 3,
    });
    text.setOrigin(0.5);
    text.setDepth(150);

    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  spawnDeathParticles(x: number, y: number): void {
    const colors = [0xff4444, 0xff6666, 0xcc3333, 0xffaaaa];
    const particleCount = 8;

    for (let i = 0; i < particleCount; i++) {
      const color = Phaser.Math.RND.pick(colors);
      const particle = this.scene.add.circle(x, y, Phaser.Math.Between(2, 5), color);
      particle.setDepth(100);

      const angle = (i / particleCount) * Math.PI * 2;
      const speed = Phaser.Math.Between(50, 120);
      const targetX = x + Math.cos(angle) * speed;
      const targetY = y + Math.sin(angle) * speed;

      this.scene.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(300, 500),
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  showGameMessage(msg: string): void {
    const text = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height * 0.3,
      msg,
      {
        fontSize: '24px',
        color: '#ff4444',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(200);

    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 30,
      duration: 1500,
      delay: 500,
      onComplete: () => text.destroy(),
    });
  }

  showLevelUpNotification(): void {
    const text = this.scene.add.text(
      this.scene.cameras.main.width / 2,
      this.scene.cameras.main.height * 0.3,
      `LEVEL UP!\nPress L to allocate stats`,
      {
        fontSize: '24px',
        color: '#fbbf24',
        fontStyle: 'bold',
        align: 'center',
        stroke: '#000000',
        strokeThickness: 3,
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(200);

    this.scene.tweens.add({
      targets: text,
      alpha: 0,
      y: text.y - 40,
      duration: 2500,
      delay: 1000,
      onComplete: () => text.destroy(),
    });
  }
}
