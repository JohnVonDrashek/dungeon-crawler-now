import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

export interface DamageResult {
  damage: number;
  isCritical: boolean;
  knockbackX: number;
  knockbackY: number;
}

export class CombatSystem {
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  calculateDamage(
    attacker: Player | Enemy,
    defender: Player | Enemy
  ): DamageResult {
    const attack = attacker.attack;
    const defense = defender.defense;

    // Base damage
    let damage = Math.max(1, attack - defense);

    // Critical hit check (10% chance, 2x damage)
    const isCritical = Math.random() < 0.1;
    if (isCritical) {
      damage *= 2;
    }

    // Calculate knockback direction
    const dx = defender.x - attacker.x;
    const dy = defender.y - attacker.y;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const knockbackForce = 200;

    return {
      damage,
      isCritical,
      knockbackX: (dx / distance) * knockbackForce,
      knockbackY: (dy / distance) * knockbackForce,
    };
  }

  applyDamage(target: Player | Enemy, result: DamageResult): void {
    target.takeDamage(result.damage);

    // Apply knockback
    if (target.body) {
      target.setVelocity(result.knockbackX, result.knockbackY);

      // Reset velocity after knockback
      this.scene.time.delayedCall(150, () => {
        if (target.active) {
          target.setVelocity(0, 0);
        }
      });
    }

    // Visual feedback for critical
    if (result.isCritical) {
      this.showCriticalText(target.x, target.y - 20);
    }

    // Show damage number
    this.showDamageNumber(target.x, target.y - 10, result.damage, result.isCritical);
  }

  private showDamageNumber(
    x: number,
    y: number,
    damage: number,
    isCritical: boolean
  ): void {
    const color = isCritical ? '#ffff00' : '#ffffff';
    const fontSize = isCritical ? '16px' : '12px';

    const text = this.scene.add.text(x, y, damage.toString(), {
      fontSize,
      color,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    text.setDepth(100);

    // Float up and fade out
    this.scene.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  private showCriticalText(x: number, y: number): void {
    const text = this.scene.add.text(x, y, 'CRIT!', {
      fontSize: '10px',
      color: '#ff6600',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    text.setDepth(100);

    this.scene.tweens.add({
      targets: text,
      y: y - 20,
      alpha: 0,
      duration: 600,
      onComplete: () => text.destroy(),
    });
  }
}
