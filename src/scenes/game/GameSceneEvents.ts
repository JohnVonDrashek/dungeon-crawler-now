import { Player } from '../../entities/Player';
import { Enemy } from '../../entities/Enemy';
import { BossEnemy } from '../../entities/enemies/EnemyTypes';
import { CombatSystem } from '../../systems/CombatSystem';
import { VisualEffectsManager } from '../../systems/VisualEffectsManager';
import { AudioSystem } from '../../systems/AudioSystem';
import { LootSystem } from '../../systems/LootSystem';
import { LootDropManager } from '../../systems/LootDropManager';
import { EnemySpawnManager } from '../../systems/EnemySpawnManager';
import { RoomManager } from '../../systems/RoomManager';
import { ItemRarity } from '../../systems/Item';
import { Weapon } from '../../systems/Weapon';
import { LevelUpUI } from '../../ui/LevelUpUI';
import { DebugMenuUI } from '../../ui/DebugMenuUI';
import { SinWorld } from '../../config/WorldConfig';

/**
 * Event handler references and state
 */
export interface EventHandlers {
  eventNames: string[];
}

/**
 * Systems needed for event handling
 */
export interface EventSystems {
  player: Player;
  combatSystem: CombatSystem;
  visualEffects: VisualEffectsManager;
  audioSystem: AudioSystem;
  lootSystem: LootSystem;
  lootDropManager: LootDropManager;
  enemySpawnManager: EnemySpawnManager;
  roomManager: RoomManager;
  levelUpUI: LevelUpUI;
  debugMenuUI: DebugMenuUI;
}

/**
 * Scene state needed for event handling
 */
export interface EventState {
  floor: number;
  currentWorld: SinWorld | null;
  isFinalBoss: boolean;
  getEnemiesKilled: () => number;
  setEnemiesKilled: (count: number) => void;
  getItemsCollected: () => number;
  setItemsCollected: (count: number) => void;
}

/**
 * Callbacks for events that need scene-level handling
 */
export interface EventCallbacks {
  onPlayerDeath: () => void;
  onVictory: () => void;
  onWorldComplete: () => void;
}

/**
 * Register all scene event handlers
 */
export function registerEventHandlers(
  scene: Phaser.Scene,
  systems: EventSystems,
  state: EventState,
  callbacks: EventCallbacks
): EventHandlers {
  const {
    player, combatSystem, visualEffects, audioSystem,
    lootSystem, lootDropManager, enemySpawnManager, roomManager,
    levelUpUI, debugMenuUI
  } = systems;
  const { floor, currentWorld, isFinalBoss } = state;

  const eventNames: string[] = [];

  // Events from PlayerAttackManager
  scene.events.on('showDamageNumber', (x: number, y: number, damage: number, isPlayer: boolean) => {
    visualEffects.showDamageNumber(x, y, damage, isPlayer);
  });
  eventNames.push('showDamageNumber');

  scene.events.on('shakeCamera', (intensity: number, duration: number) => {
    visualEffects.shakeCamera(intensity, duration);
  });
  eventNames.push('shakeCamera');

  scene.events.on('requestEnemiesGroup', (callback: (enemies: Phaser.Physics.Arcade.Group) => void) => {
    callback(enemySpawnManager.getEnemiesGroup());
  });
  eventNames.push('requestEnemiesGroup');

  scene.events.on('playerDeath', () => {
    callbacks.onPlayerDeath();
  });
  eventNames.push('playerDeath');

  scene.events.on('enemyDeath', (enemy: Enemy) => {
    player.gainXP(enemy.xpValue);
    audioSystem.play('sfx_enemy_death', 0.4);
    enemySpawnManager.removeHealthBar(enemy);
    visualEffects.spawnDeathParticles(enemy.x, enemy.y);

    const enemiesKilled = state.getEnemiesKilled() + 1;
    state.setEnemiesKilled(enemiesKilled);
    scene.registry.set('enemiesKilled', enemiesKilled);

    // Notify room manager (opens doors when room is cleared)
    const enemies = enemySpawnManager.getEnemiesGroup();
    const remainingEnemies = enemies.getChildren().filter((e) =>
      e.active && e !== (enemy as unknown as Phaser.GameObjects.GameObject)
    ).length;
    roomManager.onEnemyKilled(remainingEnemies);

    // Switch back to exploration music when room is cleared
    if (remainingEnemies === 0) {
      audioSystem.setMusicStyle('exploration');
    }

    // Boss drops guaranteed rare+ loot and a weapon
    // Sin bosses have scale >= 2, regular bosses extend BossEnemy
    const isBoss = enemy instanceof BossEnemy || enemy.scale >= 2;
    if (isBoss) {
      const loot = lootSystem.generateGuaranteedLoot(ItemRarity.RARE);
      lootDropManager.spawnItemDrop(enemy.x, enemy.y, loot);

      // Guaranteed weapon from bosses with higher rarity
      const weapon = Weapon.createRandom(floor + 5);
      lootDropManager.spawnWeaponDrop(enemy.x + 24, enemy.y, weapon);

      // Bosses drop lots of gold
      const bossGold = 50 + floor * 20;
      lootDropManager.spawnGoldDrop(enemy.x - 24, enemy.y, bossGold);

      // Handle boss victory
      if (currentWorld) {
        // World mode: defeating boss on floor 3 completes the world
        scene.time.delayedCall(1500, () => {
          callbacks.onWorldComplete();
        });
      } else if (isFinalBoss) {
        // Legacy mode: final boss triggers victory
        scene.time.delayedCall(1500, () => {
          callbacks.onVictory();
        });
      }
    } else {
      // Check if this is a challenge room enemy for better drops
      const isChallengeEnemy = enemy.getData('challengeEnemy');
      const dropChance = isChallengeEnemy ? 0.7 : 0.4; // 70% vs 40% item drop
      const weaponChance = isChallengeEnemy ? 0.3 : 0.15; // 30% vs 15% weapon drop

      // Regular enemies: chance for item
      const loot = lootSystem.generateLoot(floor + (isChallengeEnemy ? 2 : 0));
      if (loot && Math.random() < dropChance / 0.4) { // Adjust for loot system's internal chance
        lootDropManager.spawnItemDrop(enemy.x, enemy.y, loot);
      }

      // Weapon drop chance
      if (Math.random() < weaponChance) {
        const weapon = Weapon.createRandom(floor + (isChallengeEnemy ? 2 : 0));
        lootDropManager.spawnWeaponDrop(enemy.x, enemy.y, weapon);
      }

      // Gold drops - all enemies drop some gold
      const baseGold = 5 + floor * 2;
      const goldAmount = baseGold + Math.floor(Math.random() * baseGold);
      const goldMultiplier = isChallengeEnemy ? 2 : 1;
      lootDropManager.spawnGoldDrop(enemy.x, enemy.y, goldAmount * goldMultiplier);
    }
  });
  eventNames.push('enemyDeath');

  scene.events.on('enemyAttack', (enemy: Enemy, target: Player) => {
    if (!target.getIsInvulnerable() && !debugMenuUI.getIsDevMode()) {
      const result = combatSystem.calculateDamage(enemy, target);
      combatSystem.applyDamage(target, result);
      audioSystem.play('sfx_hurt', 0.4);
      visualEffects.shakeCamera(5, 100);
      visualEffects.showDamageNumber(target.x, target.y, result.damage, true);
    }
  });
  eventNames.push('enemyAttack');

  // Hazard damage event
  scene.events.on('hazardDamage', (damage: number, _source: string) => {
    if (!debugMenuUI.getIsDevMode()) {
      audioSystem.play('sfx_hurt', 0.3);
      visualEffects.shakeCamera(3, 80);
      visualEffects.showDamageNumber(player.x, player.y, damage, true);
    }
  });
  eventNames.push('hazardDamage');

  // Loot collection events from LootDropManager
  scene.events.on('itemCollected', () => {
    const itemsCollected = state.getItemsCollected() + 1;
    state.setItemsCollected(itemsCollected);
    scene.registry.set('itemsCollected', itemsCollected);
  });
  eventNames.push('itemCollected');

  scene.events.on('inventoryFull', () => {
    visualEffects.showGameMessage('Inventory full!');
  });
  eventNames.push('inventoryFull');

  // Listen for level up
  scene.events.on('playerLevelUp', () => {
    audioSystem.play('sfx_levelup', 0.5);
    visualEffects.showLevelUpNotification();
    levelUpUI.show();
  });
  eventNames.push('playerLevelUp');

  // === SIN ENEMY EVENTS ===

  // Sloth's slowing aura - temporarily reduce player speed
  scene.events.on('playerSlowed', (slowFactor: number) => {
    player.setSpeedModifier(slowFactor);
  });
  eventNames.push('playerSlowed');

  // Lust's magnetic pull - apply velocity toward enemy
  scene.events.on('playerPulled', (pullVector: { x: number; y: number }) => {
    const body = player.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.velocity.x += pullVector.x;
      body.velocity.y += pullVector.y;
    }
  });
  eventNames.push('playerPulled');

  // Pride's damage reflection - damage player when attacking Pride
  scene.events.on('damageReflected', (damage: number) => {
    player.takeDamage(damage);
    visualEffects.showDamageNumber(player.x, player.y, damage, true);
    visualEffects.showFloatingText(player.x, player.y - 30, 'REFLECTED!', '#ffd700');
  });
  eventNames.push('damageReflected');

  // Greed's gold stealing - show notification
  scene.events.on('goldStolen', (amount: number) => {
    visualEffects.showFloatingText(player.x, player.y - 30, `-${amount} gold!`, '#ffd700');
  });
  eventNames.push('goldStolen');

  return { eventNames };
}

/**
 * Clean up all registered event handlers
 */
export function cleanupEventHandlers(scene: Phaser.Scene, handlers: EventHandlers): void {
  for (const eventName of handlers.eventNames) {
    scene.events.off(eventName);
  }
}
