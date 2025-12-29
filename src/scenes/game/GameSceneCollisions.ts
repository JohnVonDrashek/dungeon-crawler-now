import { Player } from '../../entities/Player';
import { Enemy } from '../../entities/Enemy';
import { CombatSystem } from '../../systems/CombatSystem';
import { VisualEffectsManager } from '../../systems/VisualEffectsManager';
import { AudioSystem } from '../../systems/AudioSystem';
import { PlayerAttackManager } from '../../systems/PlayerAttackManager';
import { LootDropManager } from '../../systems/LootDropManager';
import { RoomManager } from '../../systems/RoomManager';
import { RoomDecorationManager } from '../../systems/RoomDecorationManager';
import { HazardSystem } from '../../systems/HazardSystem';
import { DebugMenuUI } from '../../ui/DebugMenuUI';

/**
 * Groups used for physics collisions
 */
export interface CollisionGroups {
  player: Player;
  wallLayer: Phaser.GameObjects.Group;
  enemies: Phaser.Physics.Arcade.Group;
  enemyProjectiles: Phaser.Physics.Arcade.Group;
  exit: Phaser.Physics.Arcade.Sprite;
  chests: Phaser.Physics.Arcade.Group;
  shrines: Phaser.Physics.Arcade.Group;
}

/**
 * Systems needed for collision handling
 */
export interface CollisionSystems {
  combatSystem: CombatSystem;
  visualEffects: VisualEffectsManager;
  audioSystem: AudioSystem;
  playerAttackManager: PlayerAttackManager;
  lootDropManager: LootDropManager;
  roomManager: RoomManager;
  roomDecorationManager: RoomDecorationManager;
  hazardSystem: HazardSystem;
  debugMenuUI: DebugMenuUI;
}

/**
 * Callbacks for collision events
 */
export interface CollisionCallbacks {
  onExitCollision: () => void;
}

/**
 * Set up all physics collisions for the game scene
 */
export function setupCollisions(
  scene: Phaser.Scene,
  groups: CollisionGroups,
  systems: CollisionSystems,
  callbacks: CollisionCallbacks
): void {
  const { player, wallLayer, enemies, enemyProjectiles, exit, chests, shrines } = groups;
  const {
    combatSystem, visualEffects, audioSystem, playerAttackManager,
    lootDropManager, roomManager, roomDecorationManager, hazardSystem, debugMenuUI
  } = systems;

  // Basic colliders
  scene.physics.add.collider(player, wallLayer);
  scene.physics.add.collider(enemies, wallLayer);
  scene.physics.add.collider(enemies, enemies);

  // Player vs enemy contact damage
  scene.physics.add.overlap(
    player, enemies,
    createPlayerEnemyCollisionHandler(combatSystem, visualEffects, audioSystem, debugMenuUI) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    undefined, scene
  );

  // Player projectile collisions
  const projectileGroup = playerAttackManager.getProjectileGroup();
  scene.physics.add.overlap(
    projectileGroup, enemies,
    playerAttackManager.handleProjectileEnemyCollision.bind(playerAttackManager) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    undefined, scene
  );

  scene.physics.add.collider(
    projectileGroup, wallLayer,
    playerAttackManager.handleProjectileWallCollision.bind(playerAttackManager) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    undefined, scene
  );

  // Enemy projectiles vs player
  scene.physics.add.overlap(
    player, enemyProjectiles,
    createEnemyProjectilePlayerHandler(visualEffects, audioSystem, debugMenuUI) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    undefined, scene
  );

  scene.physics.add.collider(
    enemyProjectiles, wallLayer,
    handleProjectileWallCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    undefined, scene
  );

  // Exit collision
  scene.physics.add.overlap(
    player, exit,
    callbacks.onExitCollision as unknown as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    undefined, scene
  );

  // Room decoration collisions (chests, shrines)
  scene.physics.add.overlap(
    player, chests,
    roomDecorationManager.handleChestOpen.bind(roomDecorationManager) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    undefined, scene
  );
  scene.physics.add.overlap(
    player, shrines,
    roomDecorationManager.handleShrineUse.bind(roomDecorationManager) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    undefined, scene
  );

  // Loot pickups
  const lootGroups = lootDropManager.getGroups();
  scene.physics.add.overlap(
    player, lootGroups.items,
    lootDropManager.handleItemPickup.bind(lootDropManager) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    undefined, scene
  );

  scene.physics.add.overlap(
    player, lootGroups.weapons,
    lootDropManager.handleWeaponPickup.bind(lootDropManager) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    undefined, scene
  );

  scene.physics.add.overlap(
    player, lootGroups.gold,
    lootDropManager.handleGoldPickup.bind(lootDropManager) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    undefined, scene
  );

  // Door collision
  scene.physics.add.collider(player, roomManager.getDoorGroup());
  scene.physics.add.collider(enemies, roomManager.getDoorGroup());

  // Hazard arrow collision with walls
  scene.physics.add.collider(
    hazardSystem.getArrowGroup(), wallLayer,
    handleProjectileWallCollision as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    undefined, scene
  );
}

/**
 * Create handler for player-enemy contact damage
 */
function createPlayerEnemyCollisionHandler(
  combatSystem: CombatSystem,
  visualEffects: VisualEffectsManager,
  audioSystem: AudioSystem,
  debugMenuUI: DebugMenuUI
) {
  return (
    playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    enemyObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void => {
    const player = playerObj as unknown as Player;
    const enemy = enemyObj as unknown as Enemy;

    if (player.getIsInvulnerable() || debugMenuUI.getIsDevMode()) return;

    const result = combatSystem.calculateDamage(enemy, player);
    combatSystem.applyDamage(player, result);
    audioSystem.play('sfx_hurt', 0.4);
    visualEffects.shakeCamera(5, 100);
    visualEffects.showDamageNumber(player.x, player.y, result.damage, true);
  };
}

/**
 * Create handler for enemy projectile hitting player
 */
function createEnemyProjectilePlayerHandler(
  visualEffects: VisualEffectsManager,
  audioSystem: AudioSystem,
  debugMenuUI: DebugMenuUI
) {
  return (
    playerObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject,
    projectileObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
  ): void => {
    const player = playerObj as unknown as Player;
    const projectile = projectileObj as Phaser.Physics.Arcade.Sprite;

    if (player.getIsInvulnerable() || debugMenuUI.getIsDevMode()) {
      projectile.destroy();
      return;
    }

    const damage = projectile.getData('damage') || 5;
    player.takeDamage(damage);
    audioSystem.play('sfx_hurt', 0.4);
    visualEffects.shakeCamera(5, 100);
    visualEffects.showDamageNumber(player.x, player.y, damage, true);
    projectile.destroy();
  };
}

/**
 * Handle projectile hitting a wall
 */
function handleProjectileWallCollision(
  projectileObj: Phaser.Tilemaps.Tile | Phaser.GameObjects.GameObject
): void {
  const projectile = projectileObj as Phaser.Physics.Arcade.Sprite;
  projectile.destroy();
}
